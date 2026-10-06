#!/usr/bin/env bash
# Lance tous les scénarios de l'interface (3 largeurs chacun). Les n° 5 et 7 sont lents (quelques minutes).
# Variables : PW_CORE (dossier playwright-core), PW_CHROME (exécutable Chromium), SHOTS (dossier des captures),
#             ONLY_WIDTH=390|834|1280 pour limiter à une largeur. Utilise php -S sur une copie temporaire (tasks.example.json).
# Un scénario en échec est relancé seul, trois essais au plus ; chaque reprise est notée dans le journal
# (« relancé »), pour qu'une instabilité se voie au lieu de passer inaperçue.
set -u
cd "$(dirname "$0")"
: "${PW_CORE:?définir PW_CORE}" "${PW_CHROME:?définir PW_CHROME}"
export PW_CORE PW_CHROME
ESSAIS=3
fail=0
for f in ui-*.cjs; do
  echo "##### $f"
  for essai in $(seq 1 "$ESSAIS"); do
    timeout 600 node "$f" && break
    if [ "$essai" -lt "$ESSAIS" ]; then echo "##### $f : échec à l'essai $essai, relancé"; else fail=1; fi
  done
done
[ "$fail" = 0 ] && echo "TOUT REUSSI" || { echo "AU MOINS UN ECHEC"; exit 1; }
