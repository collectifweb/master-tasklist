#!/usr/bin/env bash
# Banc d'essai de sync-tasks-remote.sh : faux ssh/scp sur un dossier temporaire, courses provoquées exprès.
# Ne touche à aucun serveur. Usage : bash tests/sync-tasks-remote.test.sh sync-tasks-remote.sh
set -u
SCRIPT="$1"
B="$(cd "$(dirname "$0")" && pwd)"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
mkdir -p "$W/bin" "$W/local" "$W/remote"
# faux ssh : ignore les options, exécute la commande dans le dossier « distant » ; crochet HOOK_SSH avant une commande avec flock
cat > "$W/bin/ssh" <<'SH'
#!/usr/bin/env bash
while [[ $# -gt 0 && "$1" == -* ]]; do case "$1" in -o|-p|-i) shift 2 ;; *) shift ;; esac; done
shift # hôte
cmd="$*"
cd "$REMOTE_ROOT"
if [[ "$cmd" == *flock* && -n "${HOOK_SSH:-}" ]]; then bash -c "$HOOK_SSH"; fi
exec bash -c "$cmd"
SH
# faux scp : copie en retirant « hôte: » ; crochet HOOK_SCP après une copie depuis le distant
cat > "$W/bin/scp" <<'SH'
#!/usr/bin/env bash
args=(); while [[ $# -gt 0 ]]; do case "$1" in -o|-P|-i) shift 2 ;; *) args+=("$1"); shift ;; esac; done
src="${args[0]}"; dst="${args[1]}"
fromremote=0
[[ "$src" == *:* ]] && { src="$REMOTE_ROOT/${src#*:}"; fromremote=1; }
[[ "$dst" == *:* ]] && dst="$REMOTE_ROOT/${dst#*:}"
cp "$src" "$dst"
if [[ $fromremote == 1 && -n "${HOOK_SCP:-}" ]]; then bash -c "$HOOK_SCP"; fi
SH
chmod +x "$W/bin/ssh" "$W/bin/scp"
export PATH="$W/bin:$PATH" REMOTE_ROOT="$W/remote" TASKS_SYNC_CONFIG=/dev/null
export TASKS_DIR="$W/local" TASKS_REMOTE=faux TASKS_REMOTE_FILE=tasks.json
L="$W/local/tasks.json"; R="$W/remote/tasks.json"
ok=0; ko=0
check() { if eval "$2"; then echo "OK  $1"; ok=$((ok+1)); else echo "KO  $1"; ko=$((ko+1)); fi; }
run() { bash "$SCRIPT" "$@" >"$W/out" 2>&1; echo $? ; }

echo '[{"id":"a","task":"Sortir le bac"}]' > "$L"; cp "$L" "$R"
check "1. identiques : déjà synchronisés" '[ "$(run)" = 0 ] && grep -q "already" "$W/out"'

echo '[{"id":"a","task":"Sortir le bac"},{"id":"b","task":"Changer l’ampoule du couloir"}]' > "$L"
check "2. local modifié : envoyé" '[ "$(run)" = 0 ] && cmp -s "$L" "$R"'

echo '[{"id":"a","task":"Sortir le bac","status":"done"}]' > "$R"
check "3. distant modifié : reçu" '[ "$(run)" = 0 ] && cmp -s "$L" "$R"'

# 4. course à l'envoi : l'app écrit le distant entre la lecture de son empreinte et le remplacement
echo '[{"id":"a","task":"Sortir le bac","status":"done"},{"id":"c","task":"Arroser les plantes"}]' > "$L"
APP='[{"id":"a","task":"Sortir le bac","status":"done"},{"id":"z","task":"écrit par l’app"}]'
rc=$(HOOK_SSH="printf '%s\n' '$APP' > tasks.json" run)
check "4. course à l'envoi : renonce (code 6)" '[ "$rc" = 6 ]'
check "4. course à l'envoi : l'écriture de l'app est gardée" 'grep -q "écrit par l’app" "$R"'
check "4. course à l'envoi : aucun fichier temporaire laissé" '[ ! -e "$W/remote/tasks.json.upload-tmp" ]'
# la synchro suivante voit les deux côtés modifiés : conflit déclaré, rien d'écrasé
rc=$(run)
check "4. ensuite : conflit déclaré sans rien écraser (code 4)" '[ "$rc" = 4 ] && grep -q "écrit par l’app" "$R" && grep -q "Arroser" "$L"'
rc=$(run); rc=$(run)
check "4. conflit qui dure : une seule copie locale" '[ "$rc" = 4 ] && [ "$(ls "$W/local"/tasks.json.conflict-* | wc -l)" = 1 ]'

# 5. course à la réception : l'app écrit le distant juste après la copie
cp "$R" "$L"; bash "$SCRIPT" >/dev/null 2>&1  # base = état commun
echo '[{"id":"a","task":"Sortir le bac","status":"done"},{"id":"y","task":"première écriture app"}]' > "$R"
APP2='[{"id":"a","task":"Sortir le bac","status":"done"},{"id":"y","task":"première écriture app"},{"id":"x","task":"seconde écriture app"}]'
rc=$(HOOK_SCP="printf '%s\n' '$APP2' > '$R'" run)
check "5. course à la réception : reçu la première écriture" '[ "$rc" = 0 ] && grep -q "première" "$L"'
rc=$(run)
check "5. ensuite : la seconde écriture de l'app est reçue, pas écrasée" '[ "$rc" = 0 ] && grep -q "seconde" "$L" && grep -q "seconde" "$R"'

# 6. verrou tenu par l'app : l'envoi attend puis renonce sans écrire
echo '[{"id":"a","task":"Sortir le bac","status":"done"},{"id":"w","task":"local pendant verrou"}]' > "$L"
cp "$R" "$W/avant"
( cd "$W/remote" && flock tasks.json.lock sleep 13 ) & sleep 0.5
rc=$(run); wait
check "6. verrou tenu 13 s : renonce (code 6) sans écrire" '[ "$rc" = 6 ] && cmp -s "$R" "$W/avant"'
rc=$(run)
check "6. verrou libéré : envoi réussi" '[ "$rc" = 0 ] && cmp -s "$L" "$R"'

echo "RÉSULTAT : $ok réussis, $ko échoués"
[ $ko = 0 ]
