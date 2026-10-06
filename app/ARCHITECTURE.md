# Architecture de `app/` — « La lisière rallumée »

Contrat technique de la nouvelle app. Le *quoi* (règles de jeu, chiffres, textes) est dans `docs/revue-2026-10/RECOMMANDATION.md` ; ce fichier fixe le *comment*, pour que toutes les parties s'emboîtent. Plan : `tasks/todo.md`.

## Principes

- Aucun outil de construction : HTML, CSS et modules ES natifs. Aucune dépendance externe chargée depuis un CDN.
- **Aucune donnée réelle dans le dépôt** : ni titre de tâche, ni prénom, ni domaine, ni adresse de serveur. Les essais utilisent `tasks.example.json` ou des titres fictifs génériques.
- `core/` est de la logique pure (aucun DOM, aucun `fetch`, aucune date implicite : l'instant courant est toujours passé en paramètre). Testée par `node --test`.
- L'interface ne calcule rien elle-même : elle appelle `core/` puis envoie des opérations à l'API.
- Français du Québec dans tout ce qui est visible. Mots du jeu : Quête, Cote, Étape, Énergie, Matériaux, Nourriture, Habitants, quartier (Champs, Atelier, Mairie, École, Garage, Place du village), rang, bâtiment. Confiance, Lueur, Fil libre, Secteur, Lot, Avis, Préparation, Voile, Lisière et Relais sont des mots de la v1 : les textes du jeu ne les emploient plus, sauf la lettre de passage et les noms des anciens gestes écartés de la file (`migration.geste.*`).

## Arborescence

```
app/
  index.html            point d'entrée (charge js/main.js en module)
  css/                  tokens.css (variables), base.css, composants
  js/                   interface : main.js, store.js (état client + synchro), api-client.js, horloge.js (date du jeu), ui/*.js
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

Le test `app/tests/core/typographie.test.mjs` fait respecter la typographie (espace insécable devant les deux-points et à l'intérieur des guillemets, aucune espace devant `;`, `?` et `!`) dans les chaînes de `app/core/`, de `app/js/` et dans tous les fichiers de `app/content/fr-CA/`. Il ne balaie pas `app/world/`.

## Données

### `tasks.json` — la référence partagée

Reste **à sa place actuelle et dans son format actuel** : un tableau JSON de tâches. L'app historique et l'agent familial (synchronisation par SSH chaque minute) le lisent et l'écrivent aussi. L'API le trouve à `../../tasks.json` relativement à `api/api.php` (même disposition en local et sur le serveur), chemin modifiable dans `api/config.php`.

Champs existants (tous conservés tels quels) : `id` (texte), `task`, `domain`, `difficulty` 1-10, `length` 1-10, `priority` 1-10, `status` (`todo` | `done` | `archived`), `created` (`AAAA-MM-JJ`), `deadline?` (`AAAA-MM-JJ`), `notes?`.

Champs ajoutés par la nouvelle app, tous facultatifs (l'app historique les ignore) :

| Champ | Forme | Sens |
|---|---|---|
| `updatedAt` | ISO 8601 | dernière modification |
| `startedAt` | ISO 8601 | ancien « Je m'y mets » (retiré au lot R1) : l'app ne l'écrit plus, une valeur déjà présente est conservée, puis remise à `null` à l'archivage et au passage à l'occurrence suivante d'une récurrence |
| `doneAt` | ISO 8601 | terminée |
| `frozen` | `{ priority, length, difficulty, at }` | valeurs figées pour la récompense |
| `deadlineSetAt` | ISO 8601 | quand l'échéance a été posée (bonus ×1,2) |
| `steps` | `[{ id, label, done, doneAt? }]`, 12 au plus | étapes |
| `recurrence` | `{ every: 'day' \| 'week' \| 'month', interval: n }` | récurrence |
| `occurrence` | entier ≥ 1 | numéro de l'occurrence active |
| `alreadyDone` | booléen | ajoutée déjà faite |

**Règle de migration absolue** : tout champ inconnu est recopié tel quel. Une tâche relue puis réécrite par la nouvelle app ne perd jamais rien.

### `api/data/game-state.json` — l'état du jeu

Un objet versionné (`version: 2`), propriété de `core/state.js` qui fournit `createInitialState(now)` et `migrateState(raw, now, { tasks, ledger })`. Contient : `resources` (`energy`, `materials`, `food`), `habitants`, `quartiers` (tâches terminées et payées, par quartier), `batiments` et `parcelles` (voir `core/batiments.js`), `premiersPas` (`{ idPas: jour atteint }`, les cinq quêtes d'initiation de `core/objectifs.js`), `accueil` (jour où les écrans d'accueil ont été vus, `null` tant qu'ils ne l'ont pas été), `bilans` (bilans figés des semaines finies, 104 au plus), `letters` (`{ idLettre: dernier jour montré }`), `lastOpenDay`, `lastReturnDay`, `lastSeenDay` (dernier jour de jeu où `advanceTime` a tourné ; ne recule jamais), `startDay` et `createdAt`. Clés facultatives : `migratedAt` (instant où une partie v1 a été convertie ; la lettre de passage ne vient qu'aux parties qui la portent) et `horloge` (`{ decalage }`, en jours ; version d'essai seulement, voir plus bas). Une partie sans `version` est une partie v1 : `migrateState` la convertit (stock de départ, quartiers et bilans recomptés depuis le registre, clés inconnues gardées) et l'API en garde d'abord une copie (voir API). `game.coteACote` n'existe plus dans le code : une partie ancienne peut encore le porter, ainsi que les minutes relevées (`minutesReleve`) de ses bilans figés ; rien ne les lit ni ne les écrit, et `migrateState` les laisse en place.

### `api/data/ledger.jsonl` — le registre des gains

Une entrée JSON par ligne, **en ajout seul** : l'API n'offre aucun moyen de supprimer ou modifier une ligne. Chaque entrée a une clé unique `key` ; l'API refuse une clé déjà présente.

| Clé | Écrite quand |
|---|---|
| `reward:{taskId}:{occurrence}` | quête terminée |
| `step:{taskId}:{occurrence}:{stepId}` | étape cochée |
| `reverse:{taskId}:{occurrence}` | « Remballer » dans les 24 h (annule le gain) |
| `bonus:{type}:{jourDeJeu}[:{n}]` | bonus hors tâches |
| `pas:{id}` | un des cinq premiers pas est atteint (un coup de pouce, versé une seule fois) |
| `saison:{saison-année}` | l'objectif de la saison est atteint (par exemple `saison:automne-2026`) |
| `prod:eolienne:{jour}[:{n}]` | première quête payée du jour avec une éolienne : son Énergie |
| `reprise:eolienne:{jour}:{n}` | « Remballer » laisse le jour sans quête payée : l'Énergie de l'éolienne de ce jour est reprise |

Forme : `{ key, at, day, type, taskId?, occurrence?, quartier?, pe, energy, materials, food? }`. Un `reverse` et une reprise d'éolienne portent les montants négatifs. Les entrées écrites en v1 portent `lueur: { sector, amount }` et `filLibre` au lieu de `quartier` (le registre n'est jamais réécrit). Terminer de nouveau une occurrence déjà récompensée rapporte 0, même après un `reverse`.

## API — `api/api.php`

Un seul fichier, PHP 8.3, sans dépendance. Toutes les réponses en JSON UTF-8, `Cache-Control: no-store`.

- `GET api.php` → `{ revision, tasks, game, gameRevision, ledger, ledgerKeys }` (plus `sandbox: true` en version d'essai). `revision` = empreinte SHA-1 du contenu de `tasks.json` (il peut changer hors de l'API). `ledger` = les entrées des 60 derniers jours (selon `at`) ; `ledgerKeys` = toutes les clés jamais écrites. Le client reconstitue un registre complet en ajoutant une entrée minimale `{ key }` pour chaque clé plus ancienne (assez pour savoir qu'un gain a déjà été versé).
- `POST api.php` (`Content-Type: application/json` obligatoire, sinon 415) avec `{ client, opId, ops: [...] }` → applique **toutes** les opérations ou **aucune**, sous verrou (`flock` non bloquant réessayé 5 s au plus sur `api/data/.lock`, sinon 503 `busy`), puis renvoie le même format que `GET` plus `{ ok: true, applied: opId }`.
  - `opId` : identifiant unique choisi par le client (aléatoire, pas fondé sur l'heure). Rejouer un `opId` déjà appliqué avec le même corps ne refait rien et renvoie `{ ok: true, replay: true, ... }` ; le même `opId` avec un autre corps → 409 `op_id_reused`. Les 500 derniers sont retenus dans `api/data/ops.json` avec l'empreinte du corps.
  - Opérations :
    - `{ type: 'task.upsert', task }` : ajoute la tâche, ou fusionne champ par champ dans la tâche de même `id` (identifiants comparés comme texte, type d'origine conservé). **Le client n'envoie que `id` et les champs qu'il a réellement modifiés** (plus `updatedAt`) : un champ absent est conservé tel quel sur le serveur, ce qui évite d'écraser une modification faite entre-temps par l'agent familial ou un autre appareil. Un champ à effacer est envoyé à `null`.
    - `{ type: 'task.delete', id }`.
    - `{ type: 'ledger.append', entries: [...] }` : 50 entrées au plus par requête, 2 Kio au plus chacune ; refuse le lot entier (409, `code: 'duplicate_key'`) si une clé existe déjà.
    - `{ type: 'game.set', game, baseGameRevision }` : refuse (409, `code: 'game_conflict'`, avec l'état courant) si `baseGameRevision` ne correspond pas.
- `client` : numéro de version de l'app (l'interface envoie `CLIENT_VERSION = 2`, `js/api-client.js`). Un `client` absent ou inférieur à `MIN_CLIENT` (2) est refusé en 409, code `client_outdated`, message « L'app a été mise à jour : recharge la page. », avant tout verrou et toute écriture : un onglet de la v1 resté ouvert ne réécrit pas la partie v2.
- Passage de la v1 à la v2 : quand un `game.set` fait passer la partie de la version 1 (sans `version`) à la version 2 ou plus, l'API copie d'abord la partie v1 telle quelle dans `api/data/backups/game-state.v1.json`. Cette copie est faite une seule fois, jamais remplacée, ni élaguée par les sauvegardes tournantes (leurs noms finissent par `.bak`) ; si elle échoue, l'écriture est refusée.
- Version d'essai : le réglage `SANDBOX` de `config.php` (ou la variable d'environnement `OREE_SANDBOX=1`, utilisée par le serveur des scénarios navigateur) est réservé à l'essai, jamais à la production. Avec lui, les réponses portent `sandbox: true`, l'app montre le bouton « Jour suivant » et l'API accepte `game.horloge`. Sans lui, un `game.set` dont la partie porte `horloge` est refusé en 409, code `sandbox_only`, et rien n'est écrit.
- Nombres non finis (`1e400`…) refusés en 400 ; tout encodage JSON se fait avec `JSON_THROW_ON_ERROR` et rien n'est écrit si l'encodage échoue.
- `tasks.json` absent → 503 `tasks_missing`, sans rien créer (création permise seulement par le réglage explicite `ALLOW_CREATE_TASKS`, pour les tests). Illisible → réessais puis 503 `tasks_unreadable`.
- Écriture de `tasks.json` : sous un second verrou `tasks.json.lock` à côté du fichier (que le script de synchronisation pourra prendre aussi) ; juste avant le `rename`, l'empreinte du fichier est recalculée et, si elle a changé depuis la lecture, le fichier est relu et les opérations sur les tâches réappliquées (3 fois au plus, sinon 503). Chemin résolu par `realpath`, fichier temporaire dans le même dossier, `fsync` avant `rename`, `tasks.json` en `JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE` comme aujourd'hui.
- Ordre d'écriture : `tasks.json`, puis `game-state.json`, puis le registre, puis `ops.json`. Si une écriture échoue, les fichiers déjà remplacés sont restaurés depuis leur contenu gardé en mémoire. Chaque 500 est journalisé (`error_log`).
- Sauvegardes dans `api/data/backups/` : copie avant ET après chaque écriture de `tasks.json` et `game-state.json`, 14 plus récentes gardées, plus une copie par jour gardée 30 jours ; le registre (ajout seul) est copié une fois par jour. Si une sauvegarde échoue, l'écriture est refusée.
- Erreurs : 400 (corps invalide), 401, 405, 429 (blocage, voir plus bas), 409 (conflit, avec `code`), 413 (corps > 512 Kio), 415, 500, 503. Messages en français, sans chemin de fichier.
- Protection, **fermée par défaut** : si `TOKEN_HASH` est réglé (empreinte SHA-256 en hexadécimal d'un jeton aléatoire long, comparée par `hash_equals`), toute requête doit porter `Authorization: Bearer <jeton>`. Sans `TOKEN_HASH`, l'API refuse tout (503 `auth_not_configured`), sauf sous le serveur de développement de PHP (`php -S`) ou si `ALLOW_OPEN` est réglé explicitement. La décision pour la production revient à Alex.
- Blocage après jetons faux : une requête qui porte un jeton faux est comptée (une requête sans jeton ne l'est pas : le premier chargement de l'app n'en a pas) et ralentie de 250 ms. À 5 jetons faux en 15 minutes, la clé est bloquée 15 minutes : toute requête reçoit 429 avec `Retry-After` (secondes) et `retryAfter` dans le JSON, même avec le bon jeton. Un bon jeton hors blocage remet le compteur à zéro. Pour une requête qui porte un jeton, le contrôle du blocage et le comptage se font sous un même verrou : des requêtes simultanées ne font jamais juger plus de 5 jetons. La clé est le SHA-256 de `REMOTE_ADDR` (jamais `X-Forwarded-For`), réduite au préfixe /64 en IPv6 (une même machine en contrôle des milliards d'adresses) : l'adresse n'est pas gardée. Les compteurs vivent dans `data/lockout.json`, réécrit seulement s'il change, de façon atomique sous un verrou propre (`.lockout.lock`). On n'en retire que les entrées sans information (ni blocage en cours, ni échec dans les 15 dernières minutes) : jamais un compteur vivant, sinon des adresses en rotation feraient effacer le leur. Un budget commun (entrée `*`) borne les jetons faux à 20 en 15 minutes toutes adresses confondues : au-delà, plus aucun jeton n'est jugé pendant 15 minutes. Il borne aussi la taille du fichier ; absent ou abîmé, il repart vide (jamais de blocage général). Constantes `LOCKOUT_*` en tête de `api.php`. Risque accepté : quelqu'un qui partage l'adresse d'Alex (même Wi-Fi, même réseau mobile), ou qui épuise le budget commun, peut le bloquer 15 minutes ; la vraie défense contre des essais venus de nombreuses adresses reste un code long. Côté interface, un 429 rouvre la feuille du jeton avec « Trop d'essais. Réessaie dans N minutes. », sans passer hors ligne, et le magasin n'appelle plus l'API (relecture, envoi) avant la fin du délai.
- `api/data/.htaccess` (`Require all denied`) est créé s'il manque ; s'il ne peut pas l'être, l'API répond 500 sans rien écrire. Après chaque déploiement, vérifier qu'une requête web sur `api/data/ledger.jsonl` répond 403.

## `core/` — modules

| Module | Rôle |
|---|---|
| `time.js` | Jour de jeu : fuseau America/Montreal, journée de 4 h 00 à 3 h 59. `gameDay(now)`, `daysBetween`, semaine (lundi), dates de saison (neige 15 nov., trêve 21 déc. → 4 janv.). |
| `domains.js` | Domaines regroupés (Jardin, Ferme → Terrain ; Professionnel → Administratif), domaine → secteur, personnage, chapitre d'ouverture. Domaine inconnu ou vide → Place du Bastion. Le domaine d'origine n'est jamais réécrit dans la tâche : le regroupement est une lecture. |
| `migrate.js` | `normalizeTask(raw, now)` sans perte (champs inconnus conservés, `archived` conservé, valeurs bornées 1-10), `normalizeTasks`. |
| `cote.js` | `cote(task, now)` = `min(100, 4,5·P + 2·(11−L) + (11−D) + U + A)` ; U et A selon RECOMMANDATION §4 ; tris (7), filtres (« 15 min » = L ≤ 2, « Peu d'énergie » = D ≤ 3, « Cette semaine », quartier, recherche) ; trois cartes (À faire d'abord, Victoire rapide L ≤ 3 et D ≤ 4, Grand chantier L ≥ 6) ; une quête de priorité ≥ 8 toujours dans les 3 premières. `estimatedMinutes(L)` : L1 5, L2 15, L3 30, L4 45, L5 60, L6 120, L7 180, L8+ 240. `why(task, now)` : la raison chiffrée du « Pourquoi ? ». |
| `reward.js` | Points d'effort (PE) d'une quête : `round(4·L × (0,6 + 0,08·D) × (0,8 + 0,04·P))`, proportionnels à la durée, multipliés par la difficulté, avec une petite prime de priorité (P9 L2 D2 = 7 ; P5 L5 D5 = 20 ; P9 L9 D9 = 55 ; P10 L10 D10 = 67). Gel de P/L/D au premier de : première étape cochée, 24 h après la création, fin de la quête. Bonus plafonnés à +40 %, plafond quotidien dégressif (45 / 90), ⚡ = 0,3·PE, ▣ = 0,5·PE, partage étapes 40 % / complétion 60 %, « Déjà faite » (3 par jour à plein tarif puis 50 %). |
| `ledger.js` | Clés, `hasKey`, construction des entrées `reward`/`step`/`reverse`/`bonus`, totaux du jour à partir du registre. |
| `economy.js` | Applique une entrée du registre à l'état : plafonds (⚡ 40 → 60 → 90, ▣ 150 → 250), surplus vers le Fil libre à 2 pour 1, Confiance (+1 par jour avec une quête, +1 par semaine tenue à 4 jours sur 7, +2 par chapitre), seuils de secteur (Réparer 150, Prospérer 400, Autonome 750). |
| `quests.js` | Opérations métier pures qui renvoient `{ tasks, game, ops, entries }` à envoyer : créer, modifier, cocher une étape, terminer, remballer (24 h), archiver, supprimer, récurrence (une seule occurrence active). Terminer une quête payée fait tourner l'éolienne (`produireEolienne`) ; Remballer en reprend l'Énergie du jour si ce jour n'a plus de quête payée (`reprendreEolienne`), toutes deux dans `batiments.js`. |
| `infer.js` | Domaine deviné à l'ajout à partir de `content/fr-CA/ancres.json` (mots-clés génériques → domaine et objet-reflet). |
| `state.js` | `createInitialState`, `migrateState`. |
| `objectifs.js` | Premiers pas, objectif de la saison, bandeau. `PREMIERS_PAS` : les cinq quêtes d'initiation (`chalet`, `tache`, `terminer`, `semer`, `famille`), dans l'ordre ; chacune se constate sur l'état (bâtiments, liste, registre), verse une seule fois un coup de pouce au registre (`pas:{id}`) et n'écrit jamais dans `tasks.json`. `OBJECTIFS_SAISON` : seul l'automne a un objectif, « grenier » (Nourriture au plafond du stockage ; `saison:{saison-année}`). `saisonDe(jour)` suit le vrai calendrier. Lectures pures : `etatPremiersPas`, `prochainGeste`, `objectifSaison` et `bandeau` (Aujourd'hui, Cette semaine, Cette saison, Prochain rang). `suivreObjectifs(ctx)` termine les gestes de `quests.js` (`createQuest`, `completeQuest`, `advanceTime`) et de `batiments.js`. `voirAccueil` note `game.accueil`. |

Chaque fonction exportée a au moins un test, et les critères de RECOMMANDATION §8 sont des tests nommés (« terminer, rouvrir puis terminer de nouveau rapporte 0 », etc.).

## `core/` — semaine 3, le jeu

Même forme que `quests.js` pour tout ce qui modifie l'état : `fn(tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }` (classe `Ctx` partagée, `params.gameRevision` exigé dès qu'un `game.set` est produit, `Error` en français pour le joueur). Le contenu (`chapitres.json`, `lettres.json`) est passé en paramètre : `core/` ne lit aucun fichier. `params.chapitres` est à injecter au moment de l'appel (et du rejeu de la file), pas à stocker dans la file d'attente.

| Module | Rôle |
|---|---|
| `build.js` | Catalogue `BUILDABLES` des chapitres 1 et 2 (Tour 20 ▣ + 6 ⚡, tunnel 15 ▣, établi 25 ▣ + 6 ⚡, parcelle 10 ▣, érable 5 ▣ ×3, clôture 3 ▣, lanterne 8 ▣), `build`, potager (`sow`, `harvest`, `storeReserve`, `shareHarvest`), `souffler` (8 ⚡ → +5 Fil libre), `payCost`, `isBuilt`. Emplacements bornés par `BUILD_SLOT_COUNT` et `MAX_PLOTS`, qui suivent `world/layout.js` (vérifié par un test). |
| `avis.js` | Avis (`AVIS`), activité et Force, Préparation détaillée (`avisPreparation`, `avisStatus` pour la jauge), `lightBrasero`, `liftVeil`, et **`advanceTime`** : lève les voiles expirés, résout l'Avis du jour, annonce le suivant, retient les objectifs et termine le chapitre (`syncChapter`), note `lastSeenDay`. Idempotente : rejouée avec le même instant, elle ne fait rien. |
| `chapters.js` | `evalCondition` (types de `chapitres.json`), `chapterProgress`, `syncChapter` (s'appuie sur `chapterStatus`/`advanceChapter` d'`economy.js`), `storyMoments` (3 moments d'histoire par jour au plus, lignes filtrées par leur `si`), `markStorySeen`. |
| `letters.js` | `morningLetter` (matin, sans quête, retour ; `{quete}` = quête n° 1 ; sans prénom, « , {prenom} » et « {prenom}, » disparaissent ; pas de répétition sur 7 jours), `markLetterShown`, `fillText`, `passageLetter` (lettre de passage à la v2 : une seule fois, aux parties converties de la v1, c'est-à-dire qui portent `game.migratedAt`). |
| `recycling.js` | `weeklyReview` : bilan de la semaine (quêtes payées, heures estimées par domaine, jours travaillés, `ratioJeuQuetes: null` tant que le temps de jeu n'est pas mesuré) et quêtes ouvertes depuis plus de 60 jours (archivage par `archiveQuest`). `bilansPasses` et `figerBilans` : le bilan de chaque semaine finie est figé dans `game.bilans` (104 au plus, deux ans) au premier `advanceTime` d'une nouvelle semaine, et recompté par `migrateState` pour une partie v1 ; un bilan déjà figé ne change plus et n'est jamais doublé. |

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

- **`js/main.js`** : contrôleur. Un seul gestionnaire de clics délégué lit les attributs `data-*`, appelle une action du magasin, puis redessine. Branche le monde (`world-bridge.js`) et ouvre les feuilles (`ui/sheets.js`), la fiche d'un bâtiment (`ui/batiment.js`), le catalogue « Construire » (`ui/catalogue.js`), le bandeau d'objectifs (`ui/bandeau.js`) et les rendez-vous (`ui/story.js`).
  - **Panneau des quêtes** : trois états, posés dans `data-panel` de `#app` : `open` (ouvert), `peek` (replié : le Fil du jour reste visible) et `cache` (caché par le bouton « Quêtes » de la carte : la carte prend tout l'écran et le panneau est `inert`). La table des passages est en commentaire au-dessus de `setPanel` dans `main.js`. En bref : « Tout voir » et « Replier » alternent replié et ouvert ; « Quêtes » cache le panneau, ou le remet replié s'il est caché ; Échap referme un panneau ouvert ; un filtre par quartier l'ouvre ; un message court ou une erreur d'enregistrement ramène un panneau caché, replié, avant que le texte s'écrive.
  - **En-tête du rabat** (disposition compacte seulement) : un toucher hors des boutons ouvre ou replie le panneau ; un glissement de plus de 8 px vers le haut l'ouvre, vers le bas le replie. En colonne large (à partir de 1000 px, ou de 700 px en paysage), il ne bascule rien.
  - **Contre le tirer-pour-rafraîchir** : `overscroll-behavior-y: contain` sur `html` et `body` (`css/base.css`). Le scénario 29 contrôle la valeur calculée ; le geste lui-même ne se reproduit pas dans Chromium de bureau, il s'essaie sur un téléphone.
  - **Catalogue « Construire »** (`#dlg-construire`, `ui/catalogue.js`) : une ligne par type de bâtiment (`BATIMENT_IDS`), avec son dessin (`thumbType` du monde), son coût, et « Disponible » ou la raison écrite par `refusConstruire`. Le bouton envoie l'action `construire` avec `{ type, id }`, où `id` est le premier emplacement libre du type dans l'ordre de `world.batiments()` ; fixé dans `data-id`, il évite qu'un double toucher bâtisse deux fois, et `main.js` ignore de plus tout second toucher dans les 800 ms. Une ligne verrouillée (`aria-disabled`) redit sa raison et ne bâtit rien. Après un succès, la feuille se ferme et la carte cadre le nouveau bâtiment (`focusEntity`). La feuille est construite une fois, puis mise à jour sur place à chaque rendu (`refreshCatalogue`) : le focus ne saute pas pendant une synchronisation.
  - **Bandeau d'objectifs** (`#bandeau`, `ui/bandeau.js`) : il remplace le carnet. Il écrit ce que le cœur lui donne (`bandeau()` de `core/objectifs.js`) : Aujourd'hui, Cette semaine, Cette saison, Prochain rang. En compact, la rangée montre Aujourd'hui et le prochain rang ; « Voir tous les objectifs » la déplie en carte, que l'ouverture du panneau referme. À partir de 700 px, les quatre sont sur la rangée. Toucher « Aujourd'hui » ouvre la fiche du bâtiment où se fait le geste proposé, ou pointe le « Fait » de la quête du Fil du jour, ou ouvre l'ajout d'une quête (`goToday`).
  - **Écrans d'accueil** (`#dlg-accueil`, `ui/story.js`) : trois écrans, passables à tout moment, montrés une seule fois : à leur fermeture (vus, passés ou fermés), l'action `voirAccueil` note le jour dans `game.accueil`. Le 3e écran allume le bandeau. Pendant cette visite, rien d'autre ne s'ouvre. Ordre de `welcome()` : écrans d'accueil ; lettre de passage à la v2 (une fois, partie convertie) ; lettre du matin (pas le premier jour de la partie) ; bilan du dimanche (une fois par appareil, `oree.recycle.v1`).
- **`js/store.js`** : état affiché = réponse du serveur + file d'actions en attente rejouée par-dessus. Chaque action de `ACTIONS` appelle une fonction de `core/` et produit des opérations envoyées à l'API.
  - Les actions de tenue (`openApp`, `advanceTime`, `markLetterShown`, `migrateGame`, `voirAccueil`) partent dans la file mais ne comptent pas dans « N changements en attente ».
  - Ordre : `openApp` puis `advanceTime` à l'ouverture ; `advanceTime` au changement de jour de jeu, au retour au premier plan et après chaque geste qui peut faire avancer un objectif.
  - Démarrage : si l'API est injoignable **ou répond 500 ou plus** (ex. 503, 508 « Resource Limit Is Reached » en hébergement mutualisé), l'app repart de la copie locale `oree.cache.v1` et l'indicateur le dit.
  - Si la file ne peut pas être enregistrée dans `localStorage` (stockage plein), l'action est refusée avec un message : rien ne doit paraître fait sans être gardé.
  - La file hors ligne vit sous `oree.queue.v2`. Au démarrage, l'ancienne file de la v1 (`oree.queue.v1`) est convertie une seule fois (`convertQueueV1`) : les gestes sur les quêtes sont gardés (le cœur recalcule leur effet à l'envoi, avec leur `opId` d'origine, marqué `v1`), les gestes de jeu de la v1 sont écartés avec un message (`migration.queue.dropped.*`), puis l'ancienne clé est retirée.
  - Gestes retirés : `startQuest` et `pauseQuest` (« Je m'y mets », retirés au lot R1) ne sont plus des actions. Ceux qui dorment encore dans la file d'un appareil sont écartés sans message à chaque lecture de la file (`withoutRetiredGestures`, `core/state.js`).
  - Partie v1 lue sur le serveur : `fromResponse` la convertit pour l'affichage (`migrateState`) et le magasin met `migrateGame` en tête de file ; cette action l'enregistre convertie, une seule fois (l'API garde alors la copie v1). Chaque envoi porte `client: 2`.
- **Voix** (`ui/announce.js`) : deux voix, celle de l'interface (`#live`) et celle du monde (`#live-world`). Une feuille modale rend le reste de la page inerte : chaque feuille porte donc ses propres régions `role="status"`, et une annonce va dans la feuille du dessus (après la fin de sa fermeture animée). **Une seule voix par événement** : l'interface dit les gestes du joueur ; le monde se tait pour ceux de la liste `SAID_BY_UI` (`world/moments.js`) et ne dit que ses moments propres.
- **`js/content.js`** : textes de `content/fr-CA/interface.json` (aucun libellé en dur) et variables des répliques.
- **`js/horloge.js`** : la seule horloge de l'interface pour la date du jeu. `maintenant()` rend l'instant réel, plus `game.horloge.decalage` jours quand le serveur a dit être la version d'essai (`sandbox: true`, lu dans chaque réponse) ; partout ailleurs le décalage est ignoré. Les minuteries (annonces, blocage, relances) restent en temps réel. Le magasin la branche sur son état (`brancherHorloge`). En version d'essai seulement, la zone `#essai` du panneau montre le décalage et le bouton « Jour suivant » : il lance l'action `jourSuivant` (`core/quests.js`, décalage + 1), puis le nouveau jour se joue comme un vrai (`openApp`, `advanceTime`, accueil).
- **`world/`** : île isométrique DOM/SVG. `createWorld(conteneur, options)` prend `texts`, `anchors`, `announce`, `onImpact`, `onSelect`, `threadFrom`, `now`, `controls` et `panelId` (aussi `insets` et `activeSector`) ; la forme des informations de `onSelect` et la liste des événements que `play()` sait jouer sont en tête de `world/world.js`. Le monde n'applique jamais rien lui-même : il signale un geste, l'interface appelle le cœur puis lui rejoue les événements. Fonctions publiques (rendues par `js/world-bridge.js`) : `render(game, tasks, ledger)`, `play(events, { from })`, `setReducedMotion`, `focusSector(id)` (cadre un quartier), `focusEntity(id)` (cadre un bâtiment ou un emplacement, le sélectionne et le nomme ; mouvement réduit respecté), `setQuestsShown(bool)` (état du bouton « Quêtes »), `clearSelection`, `thumb(id)` (dessin d'un objet de la carte, pour sa fiche), `thumbType(type)` (dessin d'un type de bâtiment debout, pour le catalogue), `skip`, `on`, `destroy`. Le pont ajoute `batiments(game, ledger)` (les emplacements de l'île dans l'ordre du cœur, `world/view.js`), `refletEvents` et `plan(conteneur, …)` (la carte en liste).
- **Colonne de la carte** : `world/world.js` pose en bas à droite de la carte une colonne de trois boutons de 44 px, **Construire**, **Quêtes** et **Vue**. « Construire » et « Carte en liste » appellent les rappels de `options.controls` (`build`, `plan`) ; « Quêtes » appelle `controls.quests` et porte `aria-expanded` et `aria-controls` vers l'élément de `options.panelId` ; « Vue » déplie vers la gauche une rangée de quatre boutons : Rapprocher, Éloigner, Toute l'île et Carte en liste. La colonne se pose au-dessus de `--world-ctl-bottom`, que `css/components.css` règle sur le vrai haut du panneau (replié, caché ou colonne large).

**Stockage de l'appareil** (`localStorage`, jamais envoyé au serveur sauf la file) :

| Clé | Contenu |
|---|---|
| `oree.queue.v2` | actions en attente d'envoi (hors ligne, conflit) |
| `oree.queue.v1` | ancienne file de la v1 : convertie une seule fois au démarrage, puis retirée |
| `oree.cache.v1` | dernière réponse du serveur, pour démarrer sans réseau |
| `oree.tick.v1` | dernier passage du minuteur de jour |
| `oree.token` | jeton d'accès à l'API, quand la protection sera en place |
| `oree.prenom.v1` | prénom facultatif saisi par le joueur (lettre du matin) |
| `oree.recycle.v1` | quêtes « gardées » au Jour du recyclage (masquées 4 semaines sur cet appareil) |
| `oree.replies.v1` | répliques déjà dites (anti-répétition) |

**Application installable** :
- `manifest.webmanifest` et `sw.js` utilisent des chemins relatifs : l'app peut vivre dans un sous-dossier.
- `sw.js` : réseau d'abord ; en repli, la copie en cache du même fichier si le réseau est coupé **ou si le serveur répond une erreur**. Une adresse inconnue garde sa vraie 404. Ne touche jamais `…/api/…`, ni une autre origine, ni ce qui est hors de sa portée (`../tasks.json`), ni une adresse avec chaîne de requête, ni une requête autre que GET.
- **À chaque déploiement qui modifie la coquille, changer `VERSION` dans `sw.js`** (l'ancien cache est effacé à l'activation), et ajouter à `SHELL` tout nouveau fichier chargé par la page.
- Ne pas déployer `app/.impeccable/`, `app/tests/` ni la page de référence `app/design/reference.*`. `app/design/icons.svg` est utilisé par l'app : il doit être déployé.

**Vérifications navigateur** (Playwright est une bibliothèque, pas une commande ; voir l'en-tête de chaque script) :
- `tests/e2e/run-ui.sh` : les scénarios `ui-*.cjs` (29 fichiers au 6 octobre 2026), 3 largeurs chacun (390×844, 834×1112, 1280×900), sur une copie temporaire servie par `php -S`. Variables `PW_CORE`, `PW_CHROME`, `SHOTS`, `ONLY_WIDTH` et `ESSAIS`. Un seul essai par scénario : un échec compte ; `ESSAIS=3` relance un scénario en échec, pour diagnostiquer une instabilité seulement (chaque reprise est notée « relancé » dans le journal). Plus de 10 minutes.
- `tests/e2e/lib.cjs` : outils communs. `runScenario(nom, fn, options)` lance `fn` aux 3 largeurs, avec un serveur neuf (option `sandbox` : version d'essai, `startServer` passe alors `OREE_SANDBOX=1` au serveur de test). `FIL_CHECK` est un contrôle exécuté dans la page après chaque geste d'un scénario : le Fil du jour est cohérent (titre et « Fait » visibles et visant une quête qui existe, état vide sinon, ni la coquille ni le panneau replié ne défilent), et un panneau caché est `inert`. `openPanel(page)` ouvre le panneau en compact (caché par « Quêtes », il revient d'abord). `openPlan(page)` ouvre la carte en liste par la colonne de la carte (« Vue », puis « Carte en liste » ; en compact, le panneau ouvert se replie d'abord).
- Scénarios du rabat et de la colonne : le 29 (anti-rechargement, toucher et glisser sur l'en-tête, trois états, messages qui ramènent le panneau) et le 30 (colonne de la carte : cibles de 44 px, jamais sous « Passer l'animation » ni sous une plaque ; rangée « Vue » au clavier ; catalogue « Construire » : raison d'un geste verrouillé, double toucher qui ne bâtit qu'une fois).
- `tests/e2e/world-s3.cjs` et `world-perf.cjs` : la démo du monde (`world/demo.html`), servie par `python3 -m http.server`, variable `BASE`.
