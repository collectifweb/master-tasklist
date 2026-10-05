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

pull_remote() {
  local tmp="${LOCAL}.remote-tmp"
  "${SCP[@]}" "$TASKS_REMOTE:$REMOTE_FILE" "$tmp"
  validate_json "$tmp"
  mv "$tmp" "$LOCAL"
  remote_hash > "$STATE"
  printf 'pulled remote tasks.json\n'
}

push_local() {
  validate_json "$LOCAL"
  local remote_tmp="${REMOTE_FILE}.upload-tmp"
  "${SCP[@]}" "$LOCAL" "$TASKS_REMOTE:$remote_tmp"
  "${SSH[@]}" "chmod 644 '$remote_tmp' && mv '$remote_tmp' '$REMOTE_FILE'"
  local_hash > "$STATE"
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
  pull_remote
elif [[ -n "$base" && "$rh" == "$base" ]]; then
  push_local
elif [[ -z "$base" ]]; then
  printf 'No sync baseline and files differ; refusing to overwrite either side.\n' >&2
  exit 3
else
  stamp="$(date +%Y%m%d-%H%M%S)"
  cp "$LOCAL" "${LOCAL}.conflict-$stamp"
  printf 'Sync conflict: both local and remote changed. Local backup: %s\n' "${LOCAL}.conflict-$stamp" >&2
  exit 4
fi
