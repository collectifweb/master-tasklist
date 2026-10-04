#!/usr/bin/env bash
set -o pipefail

URL_FILE="/home/user/todo-app/PUBLIC_URL.txt"

/usr/bin/ssh -T \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=accept-new \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -R 80:127.0.0.1:8767 \
  nokey@localhost.run 2>&1 |
while IFS= read -r line; do
  printf '%s\n' "$line"
  if [[ "$line" =~ (https://[a-z0-9]+\.lhr\.life) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}" > "${URL_FILE}.tmp"
    mv "${URL_FILE}.tmp" "$URL_FILE"
  fi
done
