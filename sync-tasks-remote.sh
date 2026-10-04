#!/usr/bin/env bash
set -euo pipefail

LOCAL="/home/user/todo-app/tasks.json"
STATE="/home/user/todo-app/.remote-sync-hash"
LOCK="/home/user/todo-app/.remote-sync.lock"
REMOTE_USER="deploy"
REMOTE_HOST="203.0.113.10"
REMOTE_PORT="22"
REMOTE_FILE="/home/deploy/todo/tasks.json"
KEY="/home/user/.ssh/id_ed25519_todo_app"
SSH=(ssh -p "$REMOTE_PORT" -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE_USER@$REMOTE_HOST")
SCP=(scp -P "$REMOTE_PORT" -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15)

mode="${1:-sync}"
exec 9>"$LOCK"
flock -n 9 || exit 0

local_hash() { sha256sum "$LOCAL" | cut -d' ' -f1; }
remote_hash() { "${SSH[@]}" "sha256sum '$REMOTE_FILE' | cut -d' ' -f1"; }
validate_json() { python3 -m json.tool "$1" >/dev/null; }

pull_remote() {
  local tmp="${LOCAL}.remote-tmp"
  "${SCP[@]}" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_FILE" "$tmp"
  validate_json "$tmp"
  mv "$tmp" "$LOCAL"
  remote_hash > "$STATE"
  printf 'pulled remote tasks.json\n'
}

push_local() {
  validate_json "$LOCAL"
  local remote_tmp="${REMOTE_FILE}.upload-tmp"
  "${SCP[@]}" "$LOCAL" "$REMOTE_USER@$REMOTE_HOST:$remote_tmp"
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
