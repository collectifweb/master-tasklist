# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet en bref

Liste de tâches familiales réelles (une seule personne, Alex, surtout sur mobile/tablette) transformée en jeu de gestion de ferme agro-futuriste. Les tâches terminées produisent des ressources qui servent à développer la ferme. Toute la documentation, le code UI et les messages sont en français. Lire `PRODUCT.md` avant toute décision de produit ou de game design : c’est le cahier des charges (économie à trois ressources, aléas récupérables, bonus plafonnés, contraintes d’hébergement).

Trois applications cohabitent :

- **`app/` — la nouvelle app « La lisière rallumée »**, en cours de développement sur la branche `feat/lisiere-rallumee`. C'est elle qui doit remplacer l'app historique. Modules ES sans outil de construction : `core/` (logique pure testée), `js/` (interface), `world/` (île isométrique DOM/SVG), `content/fr-CA/` (tous les textes), `api/api.php` (opérations avec verrou, révisions et sauvegardes). Contrat technique : `app/ARCHITECTURE.md` ; design : `app/DESIGN.md` ; plan et bilan : `tasks/todo.md` ; leçons : `tasks/lessons.md`.

- **`index.html` (racine)** — application historique en production. Un seul fichier HTML/JS inline, sans module. Elle lit `tasks.json` par `fetch`, écrit par `POST tasks.json` (corps = tableau complet de tâches), avec repli `localStorage['familytasks']`. En production, l’écriture passe par `tasks-api.php` sur l’hébergement LiteSpeed/PHP ; ce fichier n’est **pas** dans le dépôt.
- **`sketches/006-oree-vivante/`** — itération active du jeu (« Orée vivante »). Sandbox local : aucun appel réseau. Les tâches de départ sont une copie statique dans `js/data.js` (`SOURCE_TASKS`) et l’état vit seulement dans `localStorage`.

`sketches/007-spikes-rendu/` contient trois prototypes techniques jetables de la même scène (DOM/SVG sans dépendance, PixiJS et three.js copiés dans `vendor/`), et `docs/revue-2026-10/` la revue complète d’octobre 2026 (diagnostic, glitches, directions de jeu, recommandation). La direction recommandée y est « La lisière rallumée » avec un rendu DOM/SVG.

`sketches/001` à `005` sont des explorations de direction archivées (comparatif dans `sketches/README.md` et `sketches/index.html`). 006 reprend des idées de 002 (Potager), 003 (Vecteur), 004 (Bastion) et 005 (Colonie, voir `RULES.md`).

## Commandes

Aucun build, aucun gestionnaire de paquets, aucune suite de tests automatisés ni linter configuré.

```bash
# Données de développement (tasks.json est ignoré par Git)
cp tasks.example.json tasks.json

# Serveur statique (lecture seule) → http://127.0.0.1:8080/ et /sketches/006-oree-vivante/
python3 -m http.server 8080

# Serveur local (port 8767, écoute sur 127.0.0.1) : POST /tasks.json exige
# « Authorization: Bearer $TASKS_WRITE_TOKEN » ; sans jeton, il est en lecture seule.
# L’app historique n’envoie pas encore ce jeton : tester l’écriture avec curl.
TASKS_WRITE_TOKEN=dev python3 tasks-server.py

# Nouvelle app : tests de la logique et de l'API (Node 24 : motifs entre guillemets, pas un dossier)
node --test "app/tests/core/*.test.mjs" "app/tests/api/*.test.mjs"
# Nouvelle app : 23 scénarios navigateur aux 3 largeurs (plus de 10 minutes ; Playwright est une bibliothèque)
PW_CORE=~/.npm/_npx/<hash>/node_modules/playwright-core PW_CHROME=~/.cache/ms-playwright/chromium-<version>/chrome-linux64/chrome SHOTS=<dossier> bash app/tests/e2e/run-ui.sh

# Vérifications attendues avant commit (README / CONTRIBUTING)
for f in sketches/006-oree-vivante/js/*.js; do node --check "$f"; done
python3 -m json.tool tasks.example.json > /dev/null
```

Les modules ES de 006 doivent être servis en HTTP (pas en `file://`). La vérification manuelle se fait dans Chromium aux largeurs **390×844, 834×1112 et 1280×900**, sans défilement horizontal, en testant l’ajout/la modification d’une tâche et le placement d’une construction.

Ne pas exécuter `sync-tasks-remote.sh` ni `run-public-tunnel.sh` : ils agissent sur les données de production. Leur configuration réelle (hôte, port, clé, chemins) est lue dans `~/.config/oree/sync.env`, hors du dépôt ; `sync.env.example` ne contient que des valeurs fictives. `TASKS_WORKFLOW.md` décrit ce flux (un agent écrit `tasks.json`, synchronisé chaque minute par SSH avec l’hébergement).

## Architecture de 006 (Orée vivante)

Couches à sens unique : `data.js` → `model.js` → `ui.js` → `app.js`.

- **`js/data.js`** — définitions gelées : `SOURCE_TASKS`, `BUILDABLES` (coûts de construction), `BASE_ENTITIES` (carte de départ en coordonnées `row`/`col`), `INITIAL_STATE`, `CHAPTER_STEPS`, `RESOURCE_HELP`. Le contenu de jeu est ici, pas dans la logique.
- **`js/model.js`** — `OreeModel` détient tout l’état (`this.state`) et toutes les règles : score et récompense des tâches, CRUD, dépenses, cultures, placement, incidents, chapitre. Chaque méthode qui modifie l’état appelle `this.save()` elle-même et lance une `Error` avec un message français destiné au joueur. Le stockage est injecté par le constructeur (`localStorage` par défaut), ce qui permet de le tester sous Node avec un faux stockage.
- **`js/ui.js`** — fonctions pures qui renvoient des chaînes HTML (`*Markup`). Toute donnée dynamique passe par `escapeHtml`. Les actions sont déclarées par des attributs `data-*` (`data-start-task`, `data-plant`, `data-resolve-incident`…), jamais par des gestionnaires inline.
- **`js/app.js`** — contrôleur. Un objet `ui` contient l’état éphémère (sélection, panneau ouvert, mode construction, caméra en cours de glissement). Un seul `handleClick` délégué sur `document` lit les `data-*`, appelle le modèle puis `renderAll()`, qui régénère les couches par `innerHTML`. Gère aussi le clavier, le glisser-déposer HTML5, le panoramique au pointeur, les toasts et la région `aria-live`.

Points qui demandent de lire plusieurs fichiers :

- **Persistance et migration** : clé `oree-vivante-sandbox-v4`, avec lecture de repli de `-v3`. `normalize()` fusionne l’état sauvegardé avec `INITIAL_STATE`. Pour changer la forme de l’état : incrémenter `version` et `STORAGE_KEY`, et migrer depuis l’ancienne clé dans `normalize()`. `normalizeTask()` reconstruit chaque tâche champ par champ : tout champ qu’elle ne recopie pas (actuellement `deadline`, `notes`…) est **perdu**, et le statut `archived` redevient `todo`.
- **Grille isométrique** : 8×8, `isoPosition(row, col)` dans `ui.js`. Tuiles et entités sont des `<button>` positionnés en absolu. Le `z-index` vaut `100 + row + col`, et l’entité sélectionnée ou le fantôme de placement passe à `3000`. `model.canPlace()` contient les règles de cases interdites ou verrouillées (`isCellLocked` : la zone de l’éboulis jusqu’au déblayage).
- **Temps de jeu** : `state.day` n’avance que par le bouton « Jour +1 » (`advanceDay`). La croissance des cultures (`plotPhase`), l’activation des incidents (jours 2, 3 et 4 dans `INITIAL_STATE.incidents`) et le bonus quotidien de Confiance (`confidenceDays`) en dépendent.
- **Ajouter une construction** : une entrée dans `BUILDABLES` (`data.js`), une description et des actions dans `entityDescription`/`entitySheetMarkup` (`ui.js`), et le volume CSS `.object.<className>` dans `styles.css` (la miniature du catalogue réutilise ce volume via `.catalog-thumb .object`).
- **Ajouter un incident** : `INITIAL_STATE.incidents`, les tables de coûts de `resolveIncident`/`recoverIncident` (`model.js`), puis `INCIDENT_META` et `incidentSheetMarkup` (`ui.js`).

## Modèle de tâche et score

Schéma `tasks.json` (tableau) : `{ id, task, domain, difficulty 1-10, length 1-10, priority 1-10, status: 'todo'|'done'|'archived', created, deadline?, notes? }`. Les domaines prévus par le workflow sont Maison, Terrain, Enfants, Véhicule et Administratif. Les données d’exemple en contiennent d’autres et des associations incohérentes.

- 006 : `scoreTask = round(55·priority/10 + 25·(11−length)/10 + 20·(11−difficulty)/10)`. Le score favorise une tâche prioritaire, courte et facile. `taskReward` dépend seulement de `length`, avec un bonus de matériaux si `difficulty ≥ 7`. La Confiance augmente de +1 uniquement à la première tâche terminée de chaque jour de jeu.
- Application historique : XP = `difficulty·8 + length·4`, niveaux par paliers de `n·100` XP, filtres par plages de valeurs, urgence de l’échéance à ≤ 3 jours.

## Règles du dépôt

- **Confidentialité** : le dépôt est public et son historique a été réécrit le 5 octobre 2026 pour retirer des données réelles. Ne jamais committer `tasks.json`, `PUBLIC_URL.txt`, un fichier `.env`, les fichiers d’état de synchronisation ni des captures (les dossiers `review/` sont ignorés). Aucune donnée réelle dans le code, les exemples, les tests ou les captures : ni titre de tâche, ni prénom de proche, ni fournisseur, ni domaine, IP, compte ou chemin `/home` de production. Utiliser uniquement `tasks.example.json` et des titres fictifs génériques. Ne jamais réécrire l’historique ni forcer un push sans demande explicite.
- **Design** : `sketches/006-oree-vivante/DESIGN.md` (et `.impeccable/design.json`) est le contrat visuel. Palette chaude terre/sauge/verre solaire, sans fond sombre ni cyan néon. L’orange braise (`#bf5a38`) est réservé aux menaces. La carte doit dominer l’écran mobile. Dans l’interface, la ressource s’appelle « Confiance », jamais « Réputation ».
- **Accessibilité (exigée par PRODUCT.md)** : cibles d’au moins 44 px ; toute couleur doublée par du texte, une icône ou un motif ; chaque geste a un bouton équivalent ; respect de `prefers-reduced-motion` ; aucun son automatique. En mode construction, une seule tuile est tabulable (`tabindex="0"`) ; hors construction, toutes les tuiles sont à `-1`.
- **Aléas de jeu** : leurs conséquences restent virtuelles et réparables. Ils ne modifient jamais une tâche réelle.
- `.hermes/skills/impeccable/` est un outil de design hérité de l’ancien agent (référencé par les fichiers `.impeccable/`). Ce n’est pas du code applicatif.
- Commits : messages courts de style conventionnel (`feat:`, `fix:`, `docs:`, `chore:`, `security:`).
