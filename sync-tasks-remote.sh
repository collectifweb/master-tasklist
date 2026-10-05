#!/usr/bin/env bash
# Synchronisation bidirectionnelle de tasks.json avec l'hébergement.
# Aucune valeur d'infrastructure n'est versionnée : tout vient de l'environnement
# ou d'un fichier de configuration local (voir sync.env.example).
#
# Recommandé : déclarer l'hôte dans ~/.ssh/config (Host, HostName, Port, User,
# IdentityFile) et ne mettre ici que l'alias, ex. TASKS_REMOTE=oree-prod.
set -euo pipefail

CONFIG="${TASKS_SYNC_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/oree/sync.env}"
# shellcheck source=/dev/null
[[ -f "$CONFIG" ]] && source "$CONFIG"

: "${TASKS_DIR:?TASKS_DIR non défini (dossier local contenant tasks.json)}"
: "${TASKS_REMOTE:?TASKS_REMOTE non défini (alias SSH ou utilisateur@hôte)}"
: "${TASKS_REMOTE_FILE:?TASKS_REMOTE_FILE non défini (chemin distant de tasks.json)}"

LOCAL="$TASKS_DIR/tasks.json"
STATE="$TASKS_DIR/.remote-sync-hash"
LOCK="$TASKS_DIR/.remote-sync.lock"
REMOTE_FILE="$TASKS_REMOTE_FILE"

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)
[[ -n "${TASKS_SSH_PORT:-}" ]] && SSH_PORT_OPT=(-p "$TASKS_SSH_PORT") || SSH_PORT_OPT=()
[[ -n "${TASKS_SSH_PORT:-}" ]] && SCP_PORT_OPT=(-P "$TASKS_SSH_PORT") || SCP_PORT_OPT=()
[[ -n "${TASKS_SSH_KEY:-}" ]] && KEY_OPT=(-i "$TASKS_SSH_KEY") || KEY_OPT=()
SSH=(ssh "${SSH_PORT_OPT[@]}" "${KEY_OPT[@]}" "${SSH_OPTS[@]}" "$TASKS_REMOTE")
SCP=(scp "${SCP_PORT_OPT[@]}" "${KEY_OPT[@]}" "${SSH_OPTS[@]}")

mode="${1:-sync}"
exec 9>"$LOCK"
flock -n 9 || exit 0

local_hash() { sha256sum "$LOCAL" | cut -d' ' -f1; }
remote_hash() { "${SSH[@]}" "sha256sum '$REMOTE_FILE' | cut -d' ' -f1"; }
validate_json() { python3 -m json.tool "$1" >/dev/null; }

# La nouvelle app écrit aussi tasks.json, sous le verrou voisin « tasks.json.lock » (app/api/api.php).
# Le script prend le même verrou pour remplacer le fichier distant, et ne retient comme référence
# que l'empreinte du contenu réellement transféré (jamais une empreinte relue après coup).
REMOTE_LOCK="${REMOTE_FILE}.lock"

# $1 (facultatif) : empreinte locale attendue ; si le fichier local a changé entre-temps, on ne l'écrase pas.
pull_remote() {
  local tmp="${LOCAL}.remote-tmp" expected="${1:-}"
  "${SCP[@]}" "$TASKS_REMOTE:$REMOTE_FILE" "$tmp"
  validate_json "$tmp"
  if [[ -n "$expected" && "$(local_hash)" != "$expected" ]]; then
    rm -f "$tmp"
    printf 'local tasks.json changed during pull; will retry\n' >&2
    exit 5
  fi
  sha256sum "$tmp" | cut -d' ' -f1 > "$STATE"
  mv "$tmp" "$LOCAL"
  printf 'pulled remote tasks.json\n'
}

# $1 (facultatif) : empreinte distante attendue ; si le fichier distant a changé entre-temps
# (écriture de l'app), on renonce sans rien écraser et la prochaine synchro tranchera.
push_local() {
  local expected="${1:-}" snap="${LOCAL}.push-snapshot"
  cp "$LOCAL" "$snap"
  validate_json "$snap"
  local sent; sent="$(sha256sum "$snap" | cut -d' ' -f1)"
  local remote_tmp="${REMOTE_FILE}.upload-tmp"
  "${SCP[@]}" "$snap" "$TASKS_REMOTE:$remote_tmp"
  rm -f "$snap"
  if ! "${SSH[@]}" "flock -w 10 '$REMOTE_LOCK' sh -c '
      if [ -n \"$expected\" ] && [ \"\$(sha256sum \"$REMOTE_FILE\" | cut -d\" \" -f1)\" != \"$expected\" ]; then rm -f \"$remote_tmp\"; exit 7; fi
      chmod 644 \"$remote_tmp\" && mv \"$remote_tmp\" \"$REMOTE_FILE\"'"; then
    printf 'remote tasks.json changed or is locked; push skipped, will retry\n' >&2
    exit 6
  fi
  printf '%s\n' "$sent" > "$STATE"
  printf 'pushed local tasks.json\n'
}

case "$mode" in
  pull) pull_remote; exit 0 ;;
  push) push_local; exit 0 ;;
  sync) ;;
  *) printf 'Usage: %s [sync|pull|push]\n' "$0" >&2; exit 2 ;;
esac

lh="$(local_hash)"
rh="$(remote_hash)"
if [[ -f "$STATE" ]]; then
  base="$(<"$STATE")"
else
  base=""
fi

if [[ "$lh" == "$rh" ]]; then
  printf '%s\n' "$lh" > "$STATE"
  printf 'already synchronized\n'
elif [[ -n "$base" && "$lh" == "$base" ]]; then
  pull_remote "$lh"
elif [[ -n "$base" && "$rh" == "$base" ]]; then
  push_local "$rh"
elif [[ -z "$base" ]]; then
  printf 'No sync baseline and files differ; refusing to overwrite either side.\n' >&2
  exit 3
else
  stamp="$(date +%Y%m%d-%H%M%S)"
  cp "$LOCAL" "${LOCAL}.conflict-$stamp"
  printf 'Sync conflict: both local and remote changed. Local backup: %s\n' "${LOCAL}.conflict-$stamp" >&2
  exit 4
fi
