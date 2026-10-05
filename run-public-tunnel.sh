#!/usr/bin/env bash
# Expose temporairement le serveur local via un tunnel public.
# ATTENTION : n'exposer que si tasks-server.py exige TASKS_WRITE_TOKEN.
set -o pipefail

CONFIG="${TASKS_SYNC_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/oree/sync.env}"
# shellcheck source=/dev/null
[[ -f "$CONFIG" ]] && source "$CONFIG"

URL_FILE="${TASKS_PUBLIC_URL_FILE:?TASKS_PUBLIC_URL_FILE non défini}"
LOCAL_PORT="${TASKS_LOCAL_PORT:-8767}"
TUNNEL_HOST="${TASKS_TUNNEL_HOST:-nokey@localhost.run}"

if [[ -z "${TASKS_WRITE_TOKEN:-}" ]]; then
  printf 'Refus : TASKS_WRITE_TOKEN absent, le serveur serait inscriptible publiquement.\n' >&2
  exit 1
fi

ssh -T \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=accept-new \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -R "80:127.0.0.1:${LOCAL_PORT}" \
  "$TUNNEL_HOST" 2>&1 |
while IFS= read -r line; do
  printf '%s\n' "$line"
  if [[ "$line" =~ (https://[a-z0-9]+\.lhr\.life) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}" > "${URL_FILE}.tmp"
    mv "${URL_FILE}.tmp" "$URL_FILE"
  fi
done
