#!/usr/bin/env bash
# Lance tous les scénarios de l'interface (3 largeurs chacun). Les n° 5 et 7 sont lents (quelques minutes).
# Variables : PW_CORE (dossier playwright-core), PW_CHROME (exécutable Chromium), SHOTS (dossier des captures),
#             ONLY_WIDTH=390|834|1280 pour limiter à une largeur. Utilise php -S sur une copie temporaire (tasks.example.json).
set -u
cd "$(dirname "$0")"
: "${PW_CORE:?définir PW_CORE}" "${PW_CHROME:?définir PW_CHROME}"
export PW_CORE PW_CHROME
fail=0
for f in ui-*.cjs; do
  echo "##### $f"
  timeout 600 node "$f" || fail=1
done
[ "$fail" = 0 ] && echo "TOUT REUSSI" || { echo "AU MOINS UN ECHEC"; exit 1; }
