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

Tests : `node --test "app/tests/core/*.test.mjs" "app/tests/api/*.test.mjs"` (Node 24 ne parcourt pas un dossier passé en argument).

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

- `GET api.php` → `{ revision, tasks, game, gameRevision, ledger, ledgerKeys }`. `revision` = empreinte SHA-1 du contenu de `tasks.json` (il peut changer hors de l'API). `ledger` = les entrées des 60 derniers jours (selon `at`) ; `ledgerKeys` = toutes les clés jamais écrites. Le client reconstitue un registre complet en ajoutant une entrée minimale `{ key }` pour chaque clé plus ancienne (assez pour savoir qu'un gain a déjà été versé).
- `POST api.php` (`Content-Type: application/json` obligatoire, sinon 415) avec `{ opId, ops: [...] }` → applique **toutes** les opérations ou **aucune**, sous verrou (`flock` non bloquant réessayé 5 s au plus sur `api/data/.lock`, sinon 503 `busy`), puis renvoie le même format que `GET` plus `{ ok: true, applied: opId }`.
  - `opId` : identifiant unique choisi par le client (aléatoire, pas fondé sur l'heure). Rejouer un `opId` déjà appliqué avec le même corps ne refait rien et renvoie `{ ok: true, replay: true, ... }` ; le même `opId` avec un autre corps → 409 `op_id_reused`. Les 500 derniers sont retenus dans `api/data/ops.json` avec l'empreinte du corps.
  - Opérations :
    - `{ type: 'task.upsert', task }` : ajoute la tâche, ou fusionne champ par champ dans la tâche de même `id` (identifiants comparés comme texte, type d'origine conservé). **Le client n'envoie que `id` et les champs qu'il a réellement modifiés** (plus `updatedAt`) : un champ absent est conservé tel quel sur le serveur, ce qui évite d'écraser une modification faite entre-temps par l'agent familial ou un autre appareil. Un champ à effacer est envoyé à `null`.
    - `{ type: 'task.delete', id }`.
    - `{ type: 'ledger.append', entries: [...] }` : 50 entrées au plus par requête, 2 Kio au plus chacune ; refuse le lot entier (409, `code: 'duplicate_key'`) si une clé existe déjà.
    - `{ type: 'game.set', game, baseGameRevision }` : refuse (409, `code: 'game_conflict'`, avec l'état courant) si `baseGameRevision` ne correspond pas.
- Nombres non finis (`1e400`…) refusés en 400 ; tout encodage JSON se fait avec `JSON_THROW_ON_ERROR` et rien n'est écrit si l'encodage échoue.
- `tasks.json` absent → 503 `tasks_missing`, sans rien créer (création permise seulement par le réglage explicite `ALLOW_CREATE_TASKS`, pour les tests). Illisible → réessais puis 503 `tasks_unreadable`.
- Écriture de `tasks.json` : sous un second verrou `tasks.json.lock` à côté du fichier (que le script de synchronisation pourra prendre aussi) ; juste avant le `rename`, l'empreinte du fichier est recalculée et, si elle a changé depuis la lecture, le fichier est relu et les opérations sur les tâches réappliquées (3 fois au plus, sinon 503). Chemin résolu par `realpath`, fichier temporaire dans le même dossier, `fsync` avant `rename`, `tasks.json` en `JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE` comme aujourd'hui.
- Ordre d'écriture : `tasks.json`, puis `game-state.json`, puis le registre, puis `ops.json`. Si une écriture échoue, les fichiers déjà remplacés sont restaurés depuis leur contenu gardé en mémoire. Chaque 500 est journalisé (`error_log`).
- Sauvegardes dans `api/data/backups/` : copie avant ET après chaque écriture de `tasks.json` et `game-state.json`, 14 plus récentes gardées, plus une copie par jour gardée 30 jours ; le registre (ajout seul) est copié une fois par jour. Si une sauvegarde échoue, l'écriture est refusée.
- Erreurs : 400 (corps invalide), 401, 405, 409 (conflit, avec `code`), 413 (corps > 512 Kio), 415, 500, 503. Messages en français, sans chemin de fichier.
- Protection, **fermée par défaut** : si `TOKEN_HASH` est réglé (empreinte SHA-256 en hexadécimal d'un jeton aléatoire long, comparée par `hash_equals`), toute requête doit porter `Authorization: Bearer <jeton>`. Sans `TOKEN_HASH`, l'API refuse tout (503 `auth_not_configured`), sauf sous le serveur de développement de PHP (`php -S`) ou si `ALLOW_OPEN` est réglé explicitement. La décision pour la production revient à Alex.
- `api/data/.htaccess` (`Require all denied`) est créé s'il manque ; s'il ne peut pas l'être, l'API répond 500 sans rien écrire. Après chaque déploiement, vérifier qu'une requête web sur `api/data/ledger.jsonl` répond 403.

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

## `core/` — semaine 3, le jeu

Même forme que `quests.js` pour tout ce qui modifie l'état : `fn(tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }` (classe `Ctx` partagée, `params.gameRevision` exigé dès qu'un `game.set` est produit, `Error` en français pour le joueur). Le contenu (`chapitres.json`, `lettres.json`) est passé en paramètre : `core/` ne lit aucun fichier. `params.chapitres` est à injecter au moment de l'appel (et du rejeu de la file), pas à stocker dans la file d'attente.

| Module | Rôle |
|---|---|
| `build.js` | Catalogue `BUILDABLES` des chapitres 1 et 2 (Tour 20 ▣ + 6 ⚡, tunnel 15 ▣, établi 25 ▣ + 6 ⚡, parcelle 10 ▣, érable 5 ▣ ×3, clôture 3 ▣, lanterne 8 ▣), `build`, potager (`sow`, `harvest`, `storeReserve`, `shareHarvest`), `souffler` (8 ⚡ → +5 Fil libre), `payCost`, `isBuilt`. Emplacements bornés par `BUILD_SLOT_COUNT` et `MAX_PLOTS`, qui suivent `world/layout.js` (vérifié par un test). |
| `avis.js` | Avis (`AVIS`), activité et Force, Préparation détaillée (`avisPreparation`, `avisStatus` pour la jauge), `lightBrasero`, `liftVeil`, et **`advanceTime`** : lève les voiles expirés, résout l'Avis du jour, annonce le suivant, retient les objectifs et termine le chapitre (`syncChapter`), note `lastSeenDay`. Idempotente : rejouée avec le même instant, elle ne fait rien. |
| `chapters.js` | `evalCondition` (types de `chapitres.json`), `chapterProgress`, `syncChapter` (s'appuie sur `chapterStatus`/`advanceChapter` d'`economy.js`), `storyMoments` (3 moments d'histoire par jour au plus, lignes filtrées par leur `si`), `markStorySeen`. |
| `letters.js` | `morningLetter` (matin, sans quête, retour ; `{quete}` = quête n° 1 ; sans prénom, « , {prenom} » et « {prenom}, » disparaissent ; pas de répétition sur 7 jours), `markLetterShown`, `fillText`. |
| `recycling.js` | `weeklyReview` : bilan de la semaine (heures estimées par domaine, quêtes, jours de lisière, `ratioJeuQuetes: null` tant que le temps de jeu n'est pas mesuré) et quêtes ouvertes depuis plus de 60 jours (archivage par `archiveQuest`). |

**Ordre d'appel côté interface.** À l'ouverture : `openApp`, puis `advanceTime` (avec `chapitres`). Au changement de jour de jeu, et après une action qui peut atteindre un objectif (quête terminée, construction, récolte, réserve, Fil libre dirigé) : `advanceTime`. Histoire : `storyMoments` → affichage → `markStorySeen({ ids })`. Lettre : `morningLetter` → affichage → `markLetterShown({ id })`. `advanceChapter` ne s'appelle plus directement : il est obsolète, ignore les objectifs et ne sert qu'à `world/demo.js`.

**Nouvelles clés de `game`** (complétées par `migrateState` sur un état plus ancien) :

| Clé | Forme |
|---|---|
| `plots` | `[{ id, slot, crop: 'courge' \| 'patate' \| 'ble' \| null, stage }]` ; la parcelle `parcelle-1` existe dès le départ, `crop: null` = vide ; `stage` peut valoir x,5 sous un voile |
| `placements` | `[{ id, model, sector, state? }]` ; repères fixes : `{ id: 'tour', state: 'reparee' }`, `{ id: 'etabli', state: 'construit' }` ; sinon `id` = `{model}-{n}` |
| `garden` | `{ pantry: { courge, patate, ble }, reserve, sown: {…}, harvested: {…}, reserved, wateredDay }` (garde-manger 12 au plus, réserve 6 au plus, compteurs cumulés pour les objectifs ; `wateredDay` : dernier jour de jeu arrosé) |
| `avis` | `{ current: { id, sector, day, announcedOn, base, force, activity, braseros } \| null, history: [{ id, day, resolvedOn, result, force, preparation }], veils: [{ avis, sector, cells, since, until }] }` |
| `chapter.objectives` | `{ idObjectif: jour atteint }` (un objectif atteint le reste) |
| `story` | `{ seen: [ids], day, count }` |
| `letters` | `{ idLettre: dernier jour montré }` |
| `lastSeenDay` | dernier jour de jeu où `advanceTime` a tourné ; ne recule jamais |

**Registre** : `avis:{id}` (Avis tenu, `type: 'avis'`, 15 ▣). Dépenses, semis, récoltes, réserve et Souffler n'écrivent rien au registre : ils ne font que dépenser ou convertir ce qui a déjà été gagné.

**Règles retenues** (là où la recommandation laissait le choix) :
- Activité d'un Avis = part des jours allumés sur les 28 jours avant l'annonce (depuis le début si la partie est plus jeune), rapportée à 4 jours sur 7. Force fixée à l'annonce : la jauge ne bouge que du côté Préparation.
- Premier gel : annoncé au 5e jour du chapitre 2 (au plus tôt), 7 jours d'avance, Champs visés, base 24. Défenses : Tour +4 (tous les Avis), tunnel +6 (Avis des Champs), d'après la simulation.
- Quêtes de la fenêtre : finies entre le jour de l'annonce et la veille de l'Avis, remballées exclues.
- Absent = jamais vu, ou plus de 2 jours de jeu entre la dernière visite et la résolution (un retour après 10 ou 30 jours ne fait donc jamais tomber de voile). Préparation ≥ Force → Tenu même absent ; sinon « absent », sans voile.
- Pas d'annonce d'Avis un jour de trêve des Fêtes, ni pour un Avis qui tomberait un jour de trêve.
- Tenu consomme la Réserve d'hiver ; Voilé et absent la gardent. Les braseros valent pour un seul Avis.
- Voile : 3 jours à partir de la résolution. « Production réduite de 50 % » = les cultures des Champs poussent d'un demi-stade par jour allumé (seule production d'un secteur pour l'instant).
- Garde-manger plein (12) : `shareHarvest({ crop, n = 1 })` (« Partager au village ») retire n récoltes sans aucun gain (ni ressource, ni Réserve) ; événement `{ type: 'partage', crop, n, pantry }`. C'est la seule sortie des patates et du blé.
- Arrosage une seule fois par jour de jeu (`garden.wateredDay`) : remballer puis refaire une quête le même jour ne fait pas repousser les cultures deux fois. Le voile levé par une quête ensuite remballée ne revient pas : voulu, aucune perte pour le joueur.
- Avis résolu = figé : remballer une quête après la résolution ne reprend pas les 15 ▣ de l'Avis tenu ni ne pose de voile : voulu.
- Fin de chapitre : `syncChapter` refait la passe des objectifs après `advanceChapter` (ceux du nouveau chapitre déjà atteints sont retenus tout de suite), donc un 2e `advanceTime` au même instant ne fait rien. `storyMoments` propose le moment « atteint » des objectifs d'un chapitre fini avant sa `fin`, dans la limite des 3 moments par jour.
- État abîmé : `migrateState` reprend la valeur par défaut quand le type brut ne correspond pas (tableau attendu, objet attendu).
- Les recherches dans un catalogue (`SEED_COST`, `BUILDABLES`, `CROP_STAGES`…) passent par `Object.hasOwn` : `constructor` & cie sont refusés.
- Lettre de retour : le jour où `openApp` a donné le bonus de retour.

## Interface — `js/`, `world/`, application installable

- **`js/main.js`** : contrôleur. Un seul gestionnaire de clics délégué lit les attributs `data-*`, appelle une action du magasin, puis redessine. Branche le monde (`world-bridge.js`) et ouvre les feuilles (`ui/sheets.js`, `ui/game.js`), le carnet (`ui/carnet.js`) et les moments d'histoire (`ui/story.js`).
- **`js/store.js`** : état affiché = réponse du serveur + file d'actions en attente rejouée par-dessus. Chaque action de `ACTIONS` appelle une fonction de `core/` et produit des opérations envoyées à l'API.
  - Le contenu `chapitres` est gardé en mémoire et réinjecté dans `advanceTime` à l'appel comme au rejeu ; il n'est jamais stocké dans la file.
  - Les actions de tenue (`openApp`, `advanceTime`, `markStorySeen`, `markLetterShown`) partent dans la file mais ne comptent pas dans « N changements en attente ».
  - Ordre : `openApp` puis `advanceTime` à l'ouverture ; `advanceTime` au changement de jour de jeu, au retour au premier plan et après chaque geste qui peut faire avancer un objectif.
- **`js/content.js`** : textes de `content/fr-CA/interface.json` (aucun libellé en dur) et variables des répliques.
- **`world/`** : île isométrique DOM/SVG. L'interface publique de `createWorld` (options, rappels `onSelect`, `onHarvest`, `onImpact`, événements acceptés par `play()`) est décrite en tête de `world/world.js`. Le monde n'applique jamais rien lui-même : il signale un geste, l'interface appelle le cœur puis lui rejoue les événements.

**Stockage de l'appareil** (`localStorage`, jamais envoyé au serveur sauf la file) :

| Clé | Contenu |
|---|---|
| `oree.queue.v1` | actions en attente d'envoi (hors ligne, conflit) |
| `oree.cache.v1` | dernière réponse du serveur, pour démarrer sans réseau |
| `oree.tick.v1` | dernier passage du minuteur de jour |
| `oree.token` | jeton d'accès à l'API, quand la protection sera en place |
| `oree.prenom.v1` | prénom facultatif saisi par le joueur (lettre du matin) |
| `oree.recycle.v1` | quêtes « gardées » au Jour du recyclage (masquées 4 semaines sur cet appareil) |
| `oree.replies.v1` | répliques déjà dites (anti-répétition) |

**Application installable** :
- `manifest.webmanifest` et `sw.js` utilisent des chemins relatifs : l'app peut vivre dans un sous-dossier.
- `sw.js` : réseau d'abord, cache en repli hors ligne. Ne touche jamais `…/api/…`, ni une autre origine, ni une requête autre que GET.
- **À chaque déploiement qui modifie la coquille, changer `VERSION` dans `sw.js`** (l'ancien cache est effacé à l'activation), et ajouter à `SHELL` tout nouveau fichier chargé par la page.
- Ne pas déployer `app/.impeccable/`, `app/tests/` ni la page de référence `app/design/reference.*`. `app/design/icons.svg` est utilisé par l'app : il doit être déployé.

**Vérifications navigateur** (Playwright est une bibliothèque, pas une commande ; voir l'en-tête de chaque script) :
- `tests/e2e/run-ui.sh` : 21 scénarios de l'app, 3 largeurs chacun (390×844, 834×1112, 1280×900), sur une copie temporaire servie par `php -S`. Variables `PW_CORE`, `PW_CHROME`, `SHOTS`. Plus de 10 minutes.
- `tests/e2e/world-s3.cjs` et `world-perf.cjs` : la démo du monde (`world/demo.html`), servie par `python3 -m http.server`, variable `BASE`.
