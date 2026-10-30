# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet en bref

Liste de tâches familiales réelles (une seule personne, Alex, surtout sur mobile/tablette) transformée en jeu de gestion de ferme agro-futuriste. Les tâches terminées produisent des ressources qui servent à développer la ferme. Toute la documentation, le code UI et les messages sont en français. Lire `PRODUCT.md` avant toute décision de produit ou de game design : c’est le cahier des charges (aléas récupérables, bonus plafonnés, contraintes d’hébergement). Le récit, l’économie à quatre ressources (plus les permis, un compteur à part) et le plan de la v2 sont dans `docs/BIBLE-JEU.md`, validée par Alex le 5 octobre 2026.

Ce que contient le dépôt :

- **`app/` — la nouvelle app « La lisière rallumée »**, en production depuis le 5 octobre 2026. Sa version 2, le village du Nord (branche `feat/village-v2`), y a remplacé la v1 le 6 octobre 2026 (étiquettes Git `v1` puis `v2` ; le marchand du quai, lot V, est en ligne depuis le 6 octobre au soir, étiquette `v2.1` ; les imprévus, lot I, depuis le 7 octobre, étiquette `v2.2` ; l’hiver, lot H, depuis le 7 octobre en fin d’après-midi, étiquette `v2.3` ; les premiers pas cochés même avant leur tour, depuis le 7 octobre au soir, étiquette `v2.3.1` ; l’allure du village, lot A, depuis le 7 octobre vers 23 h 20, étiquette `v2.4` ; les visiteurs à commande, lot C, depuis le 8 octobre vers 1 h 40, étiquette `v2.5` ; l’île vivante, lot E, depuis le 8 octobre vers 13 h 20, étiquette `v2.6` ; les quêtes notées après coup, lot P, depuis le 8 octobre vers 15 h 17, étiquette `v2.7`, retour par `deploy-prod.sh v2.6` ; l’échange du jour au quai, lot T, depuis le 8 octobre vers 21 h 22, étiquette `v2.8`, retour par `deploy-prod.sh v2.7` ; la bande du Hameau gagnée sur la forêt, lot F, depuis le 9 octobre vers 0 h 37, étiquette `v2.9`, retour par `deploy-prod.sh v2.8` ; les bâtiments du rang Village, lot B, depuis le 9 octobre vers 7 h 45, étiquette `v2.10`, retour par `deploy-prod.sh v2.9` ; la tour de guet à 6 jours d'annonce, depuis le 9 octobre au matin, étiquette `v2.10.1`, retour par `deploy-prod.sh v2.10` ; ce que la Nourriture achète (repas de la semaine, partie de sucre, sirop), lot N, depuis le 9 octobre à midi, étiquette `v2.11`, retour par `deploy-prod.sh v2.10.1` ; la Mairie qui garde 4 permis au plus, lot M, depuis le 10 octobre au soir, étiquette `v2.12`, retour par `deploy-prod.sh v2.11` ; la visite du jour (les cultures poussent et les bâtiments produisent dès la première ouverture du jour, sans série), lot J, depuis le 11 octobre vers 2 h 30, étiquette `v2.13`, retour par `deploy-prod.sh v2.12` ; la vraie météo (avec une ville choisie dans les Réglages, les tempêtes de neige suivent la neige prévue chez Open-Meteo ; sans ville, le tirage d'après la date), lot Q, depuis le 11 octobre vers 20 h 13, étiquette `v2.14`, retour par `deploy-prod.sh v2.13` ; le correctif Safari des fiches écrasées sur iPhone, depuis le 12 octobre vers 12 h 11, étiquette `v2.14.1`, retour par `deploy-prod.sh v2.14` ; la mise à jour depuis GitHub, un bouton des Réglages pour les installations chez quelqu’un d’autre, coupé sur la production d’Alex par `MISE_A_JOUR` dans son `config.php`, lot U, depuis le 12 octobre vers 13 h 13, étiquette `v2.15`, retour par `deploy-prod.sh v2.14.1` ; le texte du total de la Cote sans double espace, avec la vidéo dans le README et la feuille de route, depuis le 12 octobre vers 16 h 12, étiquette `v2.15.1`, retour par `deploy-prod.sh v2.15` ; des fiches qu’on lit d’un coup d’œil (l’avant et l’après d’un niveau, la carte de récompense, l’état des bâtiments en crans, la fiche Permis en cases, le catalogue en deux onglets, les bulles de la carte), lot L, depuis le 15 octobre vers 23 h 09, étiquette `v2.16`, retour par `deploy-prod.sh v2.15.1` ; 99 textes que plus aucun code ne lisait retirés, le poulailler et la cabane qui produisent « à ton prochain passage au village », la ligne de la cabane raccourcie, depuis le 15 octobre vers 23 h 26, étiquette `v2.16.1`, retour par `deploy-prod.sh v2.16` ; le picto des bulles de la carte en papier et le chiffre de la flèche au bord en chiffres arrondis, depuis le 23 octobre vers 21 h 26, étiquette `v2.16.2`, retour par `deploy-prod.sh v2.16.1` ; les plaques de quartier en rond à toutes les largeurs et l’éolienne au coin du fond, côté École, lot G, depuis le 23 octobre vers 22 h 44, étiquette `v2.17`, retour par `deploy-prod.sh v2.16.2` ; l’étal du marchand au quai (les offres en tuiles, « Échanger » dans une barre en bas, la commande du visiteur en pastilles à jauge) et le Fil du jour caché au lancement (« Quêtes » l’ouvre en entier), lots G3 et G5, depuis le 24 octobre vers 7 h 40, étiquette `v2.18`, retour par `deploy-prod.sh v2.17` ; le fil de lumière visible après « Fait » sur téléphone et tablette en hauteur (le « Fait » du Fil du jour y cache le panneau, les coches de la liste le laissent ouvert), depuis le 24 octobre vers 9 h 14, étiquette `v2.18.1`, retour par `deploy-prod.sh v2.18`) ; l’essai (`/essai/`) est fermé depuis, ses données gardées. Envoi : `.claude/outils/deploy-prod.sh <étiquette>` ; retour à la v1 : `.claude/outils/retour-v2.sh <horodatage de la photo>` (outils locaux, hors dépôt). Lots dans `tasks/todo.md`, niveaux de quartier dans `docs/conception-niveaux-quartiers.md`. Modules ES sans outil de construction : `core/` (logique pure testée), `js/` (interface), `world/` (île isométrique DOM/SVG), `content/fr-CA/` (tous les textes), `api/api.php` (opérations avec verrou, révisions et sauvegardes), `api/maj.php` (mise à jour depuis GitHub). Contrat technique : `app/ARCHITECTURE.md` ; design : `app/DESIGN.md` ; plan et bilan : `tasks/todo.md` ; leçons : `tasks/lessons.md`.

- **La synchronisation d’Hermes**, l’agent familial — `sync-tasks-remote.sh`, son banc d’essai `tests/sync-tasks-remote.test.sh` et `sync.env.example`, décrits dans `TASKS_WORKFLOW.md` : Hermes écrit `tasks.json`, synchronisé par SSH avec l’hébergement. Hermes ne les tire pas de GitHub : il travaille sur ses propres copies, hors Git (sa réponse du 9 octobre 2026). Une modification de `sync-tasks-remote.sh` dans le dépôt doit donc lui être transmise à la main (le 9 octobre 2026, sa copie avait la même empreinte SHA-256 que celle du dépôt). Son seul rôle est d’ajouter les tâches d’Alex ; il n’écrit rien pour le jeu (bible, décision 44).

`docs/revue-2026-10/` contient la revue complète d’octobre 2026 (diagnostic, glitches, directions de jeu, recommandation). La direction recommandée y est « La lisière rallumée » avec un rendu DOM/SVG.

`docs/FEUILLE-DE-ROUTE.md` dit, en clair et pour le public, ce qui est fait, ce qui est en cours et ce qui vient. Elle se met à jour à chaque envoi en production, avec la doc du lot : la ligne de la nouvelle version, « Où en est le jeu », la date en tête. Une idée tranchée dans la bible rejoint « À venir » ; un élément construit quitte « À venir ».

L’app historique (`index.html` à la racine), le prototype 006 « Orée vivante » et les autres maquettes (`sketches/001` à `007`) ont été retirés du dépôt le 9 octobre 2026 ; ils restent dans l’étiquette `v2.10.1` et les précédentes.

Le dépôt est public, sous licence PolyForm Noncommercial 1.0.0 (`LICENSE.md`, au nom d’Alexandre Alves) : `README.md` le présente, `docs/INSTALLATION.md` guide une installation chez un hébergeur PHP pour quelqu’un d’autre qu’Alex. La branche `main` de GitHub est ce qu’on clone par défaut : elle suit la version en production. `deploy-prod.sh` l’y avance tout seul à la fin d’un envoi (avance rapide seulement : après un retour arrière, elle reste en place). La v2.10.2 (9 octobre 2026) a le même dossier `app/` que la v2.10.1 : c’est la première version publiée sur GitHub (README, guide d’installation, licence), rien à envoyer.

## Commandes

Aucun build, aucun gestionnaire de paquets ni linter.

```bash
# Données de développement (tasks.json est ignoré par Git)
cp tasks.example.json tasks.json

# Lancer l'app en local (PHP 8.3) → http://127.0.0.1:8090/app/
php -S 127.0.0.1:8090 -t .

# Nouvelle app : tests de la logique et de l'API (Node 24 : motifs entre guillemets, pas un dossier)
node --test "app/tests/core/*.test.mjs" "app/tests/api/*.test.mjs"
# Nouvelle app : 48 scénarios navigateur aux 3 largeurs (environ 54 minutes, mesuré le 30 octobre 2026 ; Playwright est une bibliothèque).
# Ne pas la lancer pendant qu’un autre agent fait tourner ses essais : sous charge, des mesures de position échouent.
# Un seul essai par scénario ; ESSAIS=3 seulement pour diagnostiquer une instabilité.
PW_CORE=~/.npm/_npx/<hash>/node_modules/playwright-core PW_CHROME=~/.cache/ms-playwright/chromium-<version>/chrome-linux64/chrome SHOTS=<dossier> bash app/tests/e2e/run-ui.sh
# Un changement qui ne touche pas le jeu lui-même (texte non affiché, version du cache) : seulement les scénarios concernés,
# trouvés par grep dans app/tests/e2e/, lancés un par un depuis ce dossier avec les mêmes variables (le n° 21 : 11 s).
cd app/tests/e2e && PW_CORE=… PW_CHROME=… SHOTS=<dossier> node ui-21-pwa.cjs

# Vérifier l'exemple de tâches
python3 -m json.tool tasks.example.json > /dev/null
```

L'app doit être servie par PHP (pas en `file://`). La vérification manuelle se fait dans Chromium aux largeurs **390×844, 834×1112 et 1280×900**, sans défilement horizontal, en testant l’ajout/la modification d’une tâche et le placement d’une construction.

Ne pas exécuter `sync-tasks-remote.sh` : il agit sur les données de production. Sa configuration réelle (hôte, port, clé, chemins) est lue dans `~/.config/oree/sync.env`, hors du dépôt ; `sync.env.example` ne contient que des valeurs fictives. `TASKS_WORKFLOW.md` décrit ce flux (un agent écrit `tasks.json`, synchronisé chaque minute par SSH avec l’hébergement).

## Modèle de tâche et score

Schéma `tasks.json` (tableau) : `{ id, task, domain, difficulty 1-10, length 1-10, priority 1-10, status: 'todo'|'done'|'archived', created, deadline?, notes? }`. Les domaines prévus par le workflow sont Maison, Terrain, Enfants, Véhicule et Administratif. Les données d’exemple en contiennent d’autres et des associations incohérentes.

## Règles du dépôt

- **Confidentialité** : le dépôt est public et son historique a été réécrit le 5 octobre 2026 pour retirer des données réelles. Ne jamais committer `tasks.json`, `PUBLIC_URL.txt`, un fichier `.env`, les fichiers d’état de synchronisation ni des captures (les dossiers `review/` sont ignorés). Aucune donnée réelle dans le code, les exemples, les tests ou les captures : ni titre de tâche, ni prénom de proche, ni fournisseur, ni domaine, IP, compte ou chemin `/home` de production. Utiliser uniquement `tasks.example.json` et des titres fictifs génériques. Ne jamais réécrire l’historique ni forcer un push sans demande explicite.
- **Design** : `app/DESIGN.md` (et `app/.impeccable/design.json`) est le contrat visuel. Palette chaude terre/sauge/verre solaire, sans fond sombre ni cyan néon. L’orange braise (`#bf5a38`) est réservé aux menaces. La carte doit dominer l’écran mobile. Les ressources de `app/` v2 sont l’Énergie, les Matériaux, la Nourriture et les Habitants, plus les permis, un compteur à part ; la Confiance de la v1 et du prototype 006 n’existe plus.
- **Accessibilité (exigée par PRODUCT.md)** : cibles d’au moins 44 px ; toute couleur doublée par du texte, une icône ou un motif ; chaque geste a un bouton équivalent ; respect de `prefers-reduced-motion` ; aucun son automatique. En mode construction, une seule tuile est tabulable (`tabindex="0"`) ; hors construction, toutes les tuiles sont à `-1`.
- **Aléas de jeu** : leurs conséquences restent virtuelles et réparables. Ils ne modifient jamais une tâche réelle.
- `.hermes/skills/impeccable/` est un outil de design hérité de l’ancien agent (référencé par les fichiers `.impeccable/`). Ce n’est pas du code applicatif.
- Commits : messages courts de style conventionnel (`feat:`, `fix:`, `docs:`, `chore:`, `security:`).
