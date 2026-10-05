# Architecture de `app/` — « La lisière rallumée »

Contrat technique de la nouvelle app. Le *quoi* (règles de jeu, chiffres, textes) est dans `docs/revue-2026-10/RECOMMANDATION.md` ; ce fichier fixe le *comment*, pour que toutes les parties s'emboîtent. Plan : `tasks/todo.md`.

## Principes

- Aucun outil de construction : HTML, CSS et modules ES natifs. Aucune dépendance externe chargée depuis un CDN.
- **Aucune donnée réelle dans le dépôt** : ni titre de tâche, ni prénom, ni domaine, ni adresse de serveur. Les essais utilisent `tasks.example.json` ou des titres fictifs génériques.
- `core/` est de la logique pure (aucun DOM, aucun `fetch`, aucune date implicite : l'instant courant est toujours passé en paramètre). Testée par `node --test`.
- L'interface ne calcule rien elle-même : elle appelle `core/` puis envoie des opérations à l'API.
- Français du Québec dans tout ce qui est visible. Glossaire fermé : Quête, Cote, Énergie, Matériaux, Confiance, Lueur, Fil libre, Secteur, Étape, Lot, Avis, Préparation, Voile, Lisière, Relais.

## Arborescence

```
app/
  index.html            point d'entrée (charge js/main.js en module)
  css/                  tokens.css (variables), base.css, composants
  js/                   interface : main.js, store.js (état client + synchro), api-client.js, ui/*.js
  core/                 logique pure, un module par sujet (voir plus bas), index.js réexporte tout
  content/fr-CA/        textes et dictionnaires en JSON (ancres, mots-clés, répliques)
  api/api.php           API unique (voir plus bas)
  api/config.example.php
  api/data/             données du jeu (ignoré par Git, interdit au web)
  tests/core/*.test.mjs tests node --test de core/
  tests/api/*.test.mjs  tests node --test de l'API (lancent php -S sur un dossier temporaire)
  tests/e2e/            vérifications navigateur (Playwright, hors node --test)
```

Lancer en local : `cp tasks.example.json tasks.json` (à la racine du dépôt, ignoré par Git), puis `php -S 127.0.0.1:8090 -t .` depuis la racine et ouvrir `http://127.0.0.1:8090/app/`.

Tests : `node --test app/tests/core app/tests/api`.

## Données

### `tasks.json` — la référence partagée

Reste **à sa place actuelle et dans son format actuel** : un tableau JSON de tâches. L'app historique et l'agent familial (synchronisation par SSH chaque minute) le lisent et l'écrivent aussi. L'API le trouve à `../../tasks.json` relativement à `api/api.php` (même disposition en local et sur le serveur), chemin modifiable dans `api/config.php`.

Champs existants (tous conservés tels quels) : `id` (texte), `task`, `domain`, `difficulty` 1-10, `length` 1-10, `priority` 1-10, `status` (`todo` | `done` | `archived`), `created` (`AAAA-MM-JJ`), `deadline?` (`AAAA-MM-JJ`), `notes?`.

Champs ajoutés par la nouvelle app, tous facultatifs (l'app historique les ignore) :

| Champ | Forme | Sens |
|---|---|---|
| `updatedAt` | ISO 8601 | dernière modification |
| `startedAt` | ISO 8601 | « Je m'y mets » |
| `doneAt` | ISO 8601 | terminée |
| `frozen` | `{ priority, length, difficulty, at }` | valeurs figées pour la récompense |
| `deadlineSetAt` | ISO 8601 | quand l'échéance a été posée (bonus ×1,2) |
| `steps` | `[{ id, label, done, doneAt? }]`, 12 au plus | étapes |
| `recurrence` | `{ every: 'day' \| 'week' \| 'month', interval: n }` | récurrence |
| `occurrence` | entier ≥ 1 | numéro de l'occurrence active |
| `alreadyDone` | booléen | ajoutée déjà faite |

**Règle de migration absolue** : tout champ inconnu est recopié tel quel. Une tâche relue puis réécrite par la nouvelle app ne perd jamais rien.

### `api/data/game-state.json` — l'état du jeu

Un objet versionné (`version: 1`), propriété de `core/state.js` qui fournit `createInitialState(now)` et `migrateState(raw)`. Contient au minimum : ressources (`energy`, `materials`, `confidence`), Lueur par secteur, Fil libre, jours où la lisière s'est allumée, compteurs du jour (plafonds), chapitre en cours et objectifs, état des secteurs, placements et parcelles du monde (semaine 2), Avis (semaine 3).

### `api/data/ledger.jsonl` — le registre des gains

Une entrée JSON par ligne, **en ajout seul** : l'API n'offre aucun moyen de supprimer ou modifier une ligne. Chaque entrée a une clé unique `key` ; l'API refuse une clé déjà présente.

| Clé | Écrite quand |
|---|---|
| `reward:{taskId}:{occurrence}` | quête terminée |
| `step:{taskId}:{occurrence}:{stepId}` | étape cochée |
| `reverse:{taskId}:{occurrence}` | « Remballer » dans les 24 h (annule le gain) |
| `bonus:{type}:{jourDeJeu}[:{n}]` | bonus hors tâches |

Forme : `{ key, at, day, type, taskId?, occurrence?, pe, energy, materials, lueur: { sector, amount }, filLibre }`. Un `reverse` porte les montants négatifs. Terminer de nouveau une occurrence déjà récompensée rapporte 0, même après un `reverse`.

## API — `api/api.php`

Un seul fichier, PHP 8.3, sans dépendance. Toutes les réponses en JSON UTF-8, `Cache-Control: no-store`.

- `GET api.php` → `{ revision, tasks, game, gameRevision, ledger }`. `revision` = empreinte SHA-1 du contenu de `tasks.json` (il peut changer hors de l'API).
- `POST api.php` avec `{ opId, ops: [...] }` → applique **toutes** les opérations ou **aucune**, sous verrou (`flock` sur `api/data/.lock`), puis renvoie le même format que `GET` plus `{ ok: true, applied: opId }`.
  - `opId` : identifiant unique choisi par le client. Rejouer un `opId` déjà appliqué ne refait rien et renvoie `{ ok: true, replay: true, ... }` (les 500 derniers sont retenus dans `api/data/ops.json`).
  - Opérations :
    - `{ type: 'task.upsert', task }` : remplace la tâche de même `id` (ou l'ajoute) ; les champs absents de `task` mais présents sur le serveur sont **conservés** (fusion champ par champ, pas d'écrasement aveugle).
    - `{ type: 'task.delete', id }`.
    - `{ type: 'ledger.append', entries: [...] }` : refuse le lot entier (409, `code: 'duplicate_key'`) si une clé existe déjà.
    - `{ type: 'game.set', game, baseGameRevision }` : refuse (409, `code: 'game_conflict'`, avec l'état courant) si `baseGameRevision` ne correspond pas.
- Écritures atomiques (fichier temporaire + `rename`), `tasks.json` en `JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE` comme aujourd'hui.
- Avant chaque écriture d'un fichier : copie dans `api/data/backups/`, en gardant les 14 plus récentes par fichier.
- Erreurs : 400 (corps invalide), 405 (méthode), 409 (conflit, avec `code`), 413 (corps > 512 Kio), 500. Messages en français, sans chemin de fichier.
- Protection : si `api/config.php` définit `TOKEN_HASH` (empreinte `password_hash`), toute requête doit porter `Authorization: Bearer <jeton>`. Sans ce réglage, l'API est ouverte (développement local). La décision pour la production revient à Alex.
- `api/data/.htaccess` : `Require all denied`.

## `core/` — modules

| Module | Rôle |
|---|---|
| `time.js` | Jour de jeu : fuseau America/Montreal, journée de 4 h 00 à 3 h 59. `gameDay(now)`, `daysBetween`, semaine (lundi), dates de saison (neige 15 nov., trêve 21 déc. → 4 janv.). |
| `domains.js` | Domaines regroupés (Jardin, Ferme → Terrain ; Professionnel → Administratif), domaine → secteur, personnage, chapitre d'ouverture. Domaine inconnu ou vide → Place du Bastion. Le domaine d'origine n'est jamais réécrit dans la tâche : le regroupement est une lecture. |
| `migrate.js` | `normalizeTask(raw, now)` sans perte (champs inconnus conservés, `archived` conservé, valeurs bornées 1-10), `normalizeTasks`. |
| `cote.js` | `cote(task, now)` = `min(100, 4,5·P + 2·(11−L) + (11−D) + U + A)` ; U et A selon RECOMMANDATION §4 ; tris (7), filtres (« 15 min » = L ≤ 2, « Peu d'énergie » = D ≤ 3, « Cette semaine », secteur, recherche) ; trois cartes (À faire d'abord, Victoire rapide L ≤ 3 et D ≤ 4, Grand chantier L ≥ 6) ; une quête de priorité ≥ 8 toujours dans les 3 premières ; quête en cours épinglée. `estimatedMinutes(L)` : L1 5, L2 15, L3 30, L4 45, L5 60, L6 120, L7 180, L8+ 240. `why(task, now)` : la raison chiffrée du « Pourquoi ? ». |
| `reward.js` | Points d'effort (formule §4), gel de P/L/D, bonus plafonnés à +40 %, plafond quotidien dégressif (45 / 90), ⚡ = 0,3·PE, ▣ = 0,5·PE, Lueur 75 % secteur + 25 % Fil libre, partage étapes 40 % / complétion 60 %, « Déjà faite » (3 par jour à plein tarif puis 50 %). |
| `ledger.js` | Clés, `hasKey`, construction des entrées `reward`/`step`/`reverse`/`bonus`, totaux du jour à partir du registre. |
| `economy.js` | Applique une entrée du registre à l'état : plafonds (⚡ 40 → 60 → 90, ▣ 150 → 250), surplus vers le Fil libre à 2 pour 1, Confiance (+1 par jour avec une quête, +1 par semaine tenue à 4 jours sur 7, +2 par chapitre), seuils de secteur (Réparer 150, Prospérer 400, Autonome 750). |
| `quests.js` | Opérations métier pures qui renvoient `{ tasks, game, ops, entries }` à envoyer : créer, modifier, démarrer, cocher une étape, terminer, remballer (24 h), archiver, supprimer, récurrence (une seule occurrence active). |
| `infer.js` | Domaine deviné à l'ajout à partir de `content/fr-CA/ancres.json` (mots-clés génériques → domaine et objet-reflet). |
| `state.js` | `createInitialState`, `migrateState`. |

Chaque fonction exportée a au moins un test, et les critères de RECOMMANDATION §8 sont des tests nommés (« terminer, rouvrir puis terminer de nouveau rapporte 0 », etc.).
