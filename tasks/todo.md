# Plan — « La lisière rallumée », première tranche jouable

Référence : `docs/revue-2026-10/RECOMMANDATION.md` (sections 3 à 8). Statut : **validé par Alex le 5 octobre 2026**.

## Décisions prises le 5 octobre 2026

- Monde : la colonie de l'Orée.
- Domaines regroupés : Jardin et Ferme → Terrain ; Professionnel → Administratif.
- Avis de saison actifs, sans perte définitive.
- Calendrier réel : heure de Montréal, journée de 4 h à 3 h 59, neige le 15 novembre, trêve du 21 décembre au 4 janvier.
- Progression du jeu sauvegardée sur le serveur, pas dans le navigateur.
- Site laissé ouvert pour l'instant. La protection se décide avant la mise en ligne de la nouvelle app.
- Côte à côte : simple relevé du temps (décidé le 5 octobre au matin). Rappel quotidien : encore à trancher.
- Protection : code d'accès. Hermes : synchro SSH avec verrou partagé. Essai sur les vraies tâches : copie faite sur le serveur (décidé le 5 octobre au matin).

## Principes

- La nouvelle app vit dans `app/`. L'app actuelle (`index.html`) reste en production jusqu'à la bascule.
- 006 et les prototypes de 007 servent de référence ; on ne les modifie pas.
- Aucune donnée réelle dans le dépôt. Les essais sur les vraies tâches se font sur une copie hors dépôt.
- Toute la logique de jeu est testée par `node --test`, et l'API en local avec `php -S`.
- Tout élément visible passe par /impeccable.
- Un commit par étape qui tient debout.

## Étape 0 — Préparer

- [x] Ouvrir la demande de fusion de `ccr-06402b21-chsulu` vers `main` (n° 5) ; Alex la relit et la fusionne. Le travail continue sur `feat/lisiere-rallumee`, partie de cette branche.
- [x] Lire, sans rien modifier, la configuration du serveur par SSH : `tasks-api.php`, emplacement de `tasks.json`, sauvegardes existantes, version de PHP, façon dont Hermes écrit.
- [x] Poser les fondations visuelles de `app/` avec /impeccable, en partant de la palette de 006.
- [x] Inscrire les décisions ci-dessus dans `RECOMMANDATION.md` (section 10) et `SUITE.md`.

## Semaine 1 — L'utile, sans le monde

- [x] `app/core/`, testé :
  - migration sans perte de champ (échéance, notes, statut archivé conservés) ;
  - Cote, Points d'effort, plafonds quotidiens ;
  - registre des gains en ajout seul : terminer, rouvrir puis terminer de nouveau rapporte 0 ;
  - temps réel (journée de Montréal) ;
  - domaines regroupés → secteurs.
- [x] `api.php` :
  - chaque opération porte un identifiant, la rejouer ne double rien ;
  - verrou de fichier, numéro de révision, écriture atomique, 14 sauvegardes ;
  - `tasks.json` reste la référence ; `game-state.json` et `ledger.jsonl` à côté.
- [x] Registre des quêtes au moins aussi complet que l'app actuelle : tris, filtres, recherche, création, modification, suppression, notes, étapes, récurrence, archiver, remballer.
- [x] Ajout rapide avec domaine deviné, Fil du jour, « Pourquoi ? ».
- [x] Jalon : utilisable au quotidien sur une copie locale des vraies tâches. *Vérifié sur un fichier fictif de même forme (scénario `ui-13`, aucun champ perdu). L'essai sur la vraie copie attend l'accord d'Alex.* *Atteint par la bascule du 5 octobre : la nouvelle app sert la vraie liste.*

## Semaine 2 — Le monde

- [x] Île de 12×12 en DOM/SVG, reprise du prototype `dom-svg`, mise à jour élément par élément (plus de régénération complète).
- [x] Place, Champs et Atelier ouverts, deux secteurs sous la cendre, Fil libre.
- [x] Fanal et deux personnages ; animations 1 à 5, 11 et 12, avec leur version en mouvement réduit.
- [x] Brancher le monde dans l'app : fil de lumière parti du bouton touché, compteurs à l'impact, secteur touché = filtre, plan accessible, écran « L'Orée veille » ; 14 scénarios Playwright aux 3 largeurs.
- [x] Essai sur le vrai téléphone d'Alex : on garde le SVG, ou on passe à PixiJS si l'animation tombe sous 45 images par seconde. *Fluide sur le téléphone d'Alex (5 octobre) : on garde le SVG, PixiJS abandonné.*

## Semaine 3 — Le jeu

- [x] Introduction, chapitre 1, chapitre 2 jusqu'au premier Avis (Premier gel). Chapitres pilotés par `chapitres.json`, Avis annoncé 7 jours d'avance avec sa jauge, résultat tenu, voilé ou absent sans perte (scénarios 16, 17, 18).
- [x] Potager (semer, récolter au glissé ou au bouton, garde-manger, partager, réserve) et lettre du matin (scénarios 15, 19).
- [x] Côte à côte : simple relevé du temps passé, sans garder l'écran allumé (décidé le 5 octobre). « Je m'y mets » lance le relevé, Pause, Fait, Remballer, Archiver ou Supprimer l'arrêtent ; aucune ressource gagnée ; une séance oubliée compte 3 h au plus ; proposition de découper une quête qui prend plus du double de sa durée estimée ; temps relevé dans le bilan de la semaine. Fanal va se placer près du secteur de la quête, immobile (scénario 22).
- [x] Jour du recyclage, première version ; installation sur l'écran d'accueil du téléphone, lancement hors ligne (scénarios 20, 21).

## Mise en ligne

- [x] Choisir la protection : connexion par code d'accès (Alex, 5 octobre). Prête et vérifiée sur la version d'essai.
- [x] Décider comment Hermes écrit : par SSH, avec le même verrou que l'API (Alex, 5 octobre).
- [x] Correctif du script de synchro d'Hermes : verrou partagé et empreinte du contenu envoyé. Banc d'essai sans serveur (`tests/sync-tasks-remote.test.sh`) : 12 sur 12 avec le script corrigé, 6 échecs sur 12 avec l'ancien.
- [x] Installer le script corrigé sur la machine d'Hermes (Alex). *Fait le 5 octobre vers 12 h, d'après le rapport d'Hermes : empreinte conforme, ancien gardé à côté, synchro manuelle et automatique en code 0. Son minuteur tourne en fait toutes les deux minutes, pas chaque minute.* *Corrigé vers 12 h 23 (AccuracySec=1s), d'après le rapport d'Hermes : une synchro par minute, code 0, sur cinq minutes.*
- [x] Premier « Fait » réel par la vraie app (5 octobre, 12 h 59, depuis le téléphone). Vérifié sur le serveur : la liste passe de 11 à 12 tâches terminées sur 27, l'app enregistre son état, son registre et 12 sauvegardes, aucun mauvais code compté. *Le geste d'avant était parti dans la version d'essai : favori resté sur `/essai/`.*
- [x] Hermes rapatrie ce changement. *D'après son journal relayé par Alex : « pulled remote tasks.json » à 12 h 59 min 55 s, 28 s après l'écriture, puis plus aucun écart pendant 18 minutes ; 12 tâches terminées dans sa copie, comme sur le serveur (ce dernier compte vérifié de mon côté).*
- [ ] Sens inverse à constater à la prochaine tâche ajoutée par Hermes : elle doit apparaître dans l'app en 30 s au plus.
- [x] Essai sur une copie des vraies tâches, faite sur le serveur dans un second dossier d'essai protégé par un code. L'API relit chaque tâche à l'identique, aucun champ perdu ; vérifié sur le serveur, sans rapatrier de données.
- [x] Alex utilise cette copie sur son téléphone : jalon « utilisable au quotidien ». *Remplacé par la bascule : Alex utilise directement la production.*
- [x] Blocage des mauvais codes (5 octobre, demandé par Alex : code d'accès court) : 5 codes faux en 15 minutes bloquent l'adresse 15 minutes, même avec le bon code. Essayé pour de vrai sur le bac à sable : l'adresse comptée est bien celle du visiteur, une autre adresse passe. En production depuis le commit 2889c41. Relecture de sécurité automatique : le contrôle et le comptage étaient séparés (12 codes faux simultanés : 10 jugés au lieu de 5). Corrigé dans e975092 (un seul verrou, préfixe /64 en IPv6, fichier plafonné), vérifié sur le serveur : 12 simultanés → 5 jugés, 7 refusés. Deuxième relecture : le plafond de 500 entrées effaçait des compteurs vivants (adresses en rotation = essais illimités). Corrigé dans 3ccd92f : on ne retire que les entrées sans information, et un budget commun de 20 codes faux en 15 minutes, toutes adresses confondues, arrête de juger. En production, API identique au commit. Risque accepté : quelqu'un sur la même adresse qu'Alex, ou qui épuise le budget commun, peut le bloquer 15 minutes.
- [x] Copie d'essai des vraies tâches supprimée du serveur (5 octobre, accord d'Alex).
- [x] Sauvegarder ce qui est en ligne : copie datée de la liste, de la page, de l'ancienne API et du `.htaccess` dans un dossier du site interdit au web (5 octobre 2026).
- [x] Version d'essai dans un sous-dossier, avec une liste fictive et un code d'accès. Parcours réel vérifié en HTTPS : code demandé, quête enregistrée sur le serveur, relance hors ligne, dossier de données interdit au web.
- [x] Tester sur le téléphone d'Alex, puis déployer avec les vraies tâches et basculer l'accueil. *Fait le 5 octobre vers 11 h 15 (accord d'Alex) : sauvegarde datée, app dans `app/`, accueil renvoyé vers elle, accès web direct à la liste et à l'ancienne API bloqué (403). L'API sert les 27 tâches à l'identique, champ pour champ. Code d'accès choisi par Alex.*

## Critères de réussite

- Tous les tests `node --test` passent, dont : rouvrir puis terminer rapporte 0, le chapitre 1 ne finit pas avant le jour 3, aucune case perdue.
- Aucun champ perdu sur la copie des vraies tâches.
- Quête n° 1 lisible en moins de 2 s ; ajout en 3 gestes au plus ; terminer en 2 touchers.
- Une tâche ajoutée par Hermes apparaît en 30 s au plus.

## Bilan — nuit du 5 octobre 2026

- **Fait et vérifié** :
  - les trois semaines du plan, sauf le côte à côte (attend la décision d'Alex) ;
  - 259 tests `node --test` (logique et API) ;
  - 21 scénarios Playwright aux trois largeurs (1 331 vérifications) et le scénario du monde (86 vérifications).
- **Relectures indépendantes** de la logique de la semaine 3, puis de la sécurité et de l'accessibilité. Tout défaut démontré a été corrigé avec un test qui échouait avant.
- **Reste** :
  - l'essai sur un vrai téléphone : décision SVG ou PixiJS ;
  - l'essai sur les vraies tâches ;
  - la protection de la production ;
  - la façon dont Hermes écrit ;
  - le côte à côte et le rappel quotidien ;
  - la bascule de l'accueil.

## Bilan — matin du 5 octobre 2026

- **Fait et vérifié** :
  - le côte à côte (simple relevé du temps), commité et en ligne sur les deux essais ;
  - 269 tests `node --test` ; 22 scénarios Playwright aux trois largeurs (1 469 vérifications) ; scénario du monde (82 vérifications) ;
  - les deux essais en ligne, contrôlés de l'extérieur : code exigé, données interdites au web, modules chargés sans erreur ;
  - le script de synchro d'Hermes corrigé (12 sur 12 au banc d'essai).
- **Reste, côté Alex** :
  - l'essai sur son téléphone (SVG ou PixiJS) ;
  - installer le script de synchro corrigé chez Hermes ;
  - donner le feu vert à la bascule de l'accueil (script prêt, avec retour arrière) ;
  - trancher le rappel quotidien.

## v2 — semaines 1 et 2

Référence : `docs/BIBLE-JEU.md` (v2 validée le 5 octobre 2026), §14, ligne « 1 et 2 ». **Statut : validé par Alex le 5 octobre 2026** (réponses aux trois questions). Plan préparé par un agent qui a lu le code, puis relu et simplifié.

**Règles du plan**
- La production reste en v1 jusqu'au dernier lot. L'état actuel reçoit l'étiquette Git `v1` (le dossier `app/` n'a pas changé depuis le dernier déploiement, 3ccd92f). La v2 se construit sur une branche neuve, `feat/village-v2`.
- Les scripts de déploiement (hors dépôt, dans `.claude/outils/`, ignoré par Git) prennent la version à envoyer : production = `v1`, essai = tête de la branche v2.
- Chaque règle nouvelle a son test, écrit d'abord et vu en échec. `tasks.json` n'est jamais écrit par la migration ni par les premiers pas : un test le vérifie.
- Tout élément visible nouveau passe par /impeccable, avant de le coder puis sur captures aux trois largeurs (marqué [impeccable]).
- On garde : côte à côte et relevé du temps, recyclage, lettre du matin (textes réécrits), bilan, hors ligne, blocage des mauvais codes.

### Lot 1 — Le cœur v2 (logique seule, vérifiée par `node --test`)
Pour le joueur : rien de visible, rien n'est déployé.
- [x] Six quartiers : Champs, Atelier, Mairie, École, Garage, Place du village. Les anciens secteurs y sont reliés.
- [x] Partie en version 2 : Énergie, Matériaux, Nourriture, Habitants, tâches par quartier, bâtiments, parcelles, premiers pas, bilans. Départ : 10 Énergie, 20 Matériaux, 5 Nourriture.
- [x] Gains : mêmes formules par tâche ; le registre note le quartier au lieu de la Lueur et du Fil libre.
- [x] Rang selon les habitants, niveaux de quartier (5, 15, 30, 60, 100 tâches), avec « encore N » pour l'affichage.
- [x] Migration de la partie : Énergie et Matériaux repartent du stock de départ ; quartiers et bilans recomptés depuis le registre ; relevé du temps gardé.
- [x] Retrait de Lueur, Fil libre, Souffler, Confiance, Avis et chapitres. Le passage du temps quitte le module des Avis.
- [x] Tests : environ 80 des 241 tests du cœur changent (estimation de l'agent) ; nouveaux tests du village et de la migration (recompte, une seule fois, aucune tâche touchée).
- *Fait le 5 octobre (commits 4439d39, e2a4a65, 6f76623, puis les niveaux sans fin). 231 tests sur 231 : 192 du cœur, 39 de l'API inchangés ; relancés par moi après l'agent. `core/build.js` retiré aussi (il agissait sur des parties de l'état v1 qui n'existent plus) : le lot 4 réécrit les constructions. Le passage du temps vit maintenant dans `core/quests.js`. Un test vérifie que la migration lit la liste et le registre sans jamais les modifier.*
- *Niveaux de quartier sans fin : après 100 tâches, un niveau tous les 50 (choix fidèle au « jeu sans fin » demandé par Alex).*
- *Pour le lot 3 : remballer, dans les 24 h après la bascule, une quête payée en v1 retire la tâche du quartier, mais pas l'Énergie ni les Matériaux, qui n'ont jamais été versés au stock v2. Et `migrateState` doit recevoir la liste et le registre (`js/store.js:73`), sinon les quartiers repartent à zéro.*
- *L'app ne se charge plus tant que le lot 2 n'est pas fait : une dizaine de modules de l'interface importent des noms retirés. Relevé de l'agent, à reprendre au lot 2.*

### Lot 2 — L'interface au nouveau vocabulaire
Pour le joueur : la barre montre Énergie, Matériaux, Nourriture, Habitants ; les quartiers portent leurs nouveaux noms ; « jeton d'accès » devient « code d'accès », « Plan accessible » devient « Carte en liste », « L'Orée veille » devient « Tout est enregistré, à demain », « Finir la visite » disparaît.
- [x] Interface, île et textes nettoyés de la v1 (braseros, voiles, cendre, chapitres). Le front de givre reste en sommeil pour les alertes météo des semaines 3-4.
- [x] [impeccable] icônes Nourriture, Habitants et des six quartiers, aide des ressources.
- [x] Scénarios navigateur : 11 sur 23 à adapter, 1 à supprimer, 3 mis de côté jusqu'aux lots 4 et 5 (relevé de l'agent).
- *Fait le 5 octobre (commits 4ba658f, 1f285b5, puis un contrôle instable corrigé). Vérifié par moi : 231 tests `node --test` ; scénarios navigateur aux trois largeurs, 19 réussis (15, 17 et 18 mis de côté par la variable `EN_PAUSE` de `run-ui.sh`) ; captures à 390 et 1280 regardées. Le contrôle « bonus d'ouverture au registre » du scénario 1, hérité de la v1, lisait le registre avant la fin de l'écriture : il attend maintenant l'écriture (3 réussites sur 3 après correction).*
- */impeccable lancé avant les icônes (d'après l'agent), mais sans le guide de travail du skill, avec un seul contrôle visuel et sans relecture finale de design. À rattraper : relecture de design complète après le lot 5.*
- *Reportés au lot 4 : les plaques de la Place et du Garage cachent des caisses à 834 et 1280 ; l'aide des ressources cite la serre, le poulailler et l'accueil d'habitants, qui n'existent pas encore. Encore au vocabulaire v1 (documents) : `app/DESIGN.md`, `design/reference.html`, `app/content/README.md`, à reprendre au lot 8.*

### Lot 3 — Migration sûre
Pour le joueur : à la première ouverture, sa partie passe en v2 sans rien perdre, avec une lettre de Fanal qui explique ce qui change.
- [x] Chaque envoi de la v2 porte sa version. Le serveur refuse l'ancienne app avec « L'app a été mise à jour : recharge la page. » (sinon un onglet v1 resté ouvert réécrirait la partie v2 avec ses valeurs v1).
- [x] Au passage en v2, le serveur garde une copie de la partie v1, jamais effacée. Registre et opérations jamais réécrits ; une quête payée en v1 ne repaie pas.
- [x] File d'attente hors ligne convertie une fois : les gestes sur les quêtes sont recalculés, les gestes de jeu v1 écartés avec un message ; code d'accès et prénom gardés.
- [x] Tests : refus de l'ancienne app, copie v1 unique, `tasks.json` identique à l'octet ; scénario de migration complet.
- [x] Premier déploiement sur l'essai : sa partie v1 sert de répétition.
- *Fait le 5 octobre (commits b357112, b9e62bf, 14fd05f ; cache de l'app passé en v4). Vérifié par moi : 250 tests `node --test`. Scénario navigateur 25 réussi d'après le journal de l'agent (66 vérifications, relu, pas relancé). Refus de l'ancienne app : HTTP 409, code `client_outdated`, que la v1 écarte avec un message sans relance (test qui fait tourner le code de l'étiquette `v1`). Gain v1 reconnu au champ `filLibre` du registre.*
- *Essai en ligne, vérifié le 5 octobre vers 17 h : photo de la partie avant envoi (`backups/avant-v2-…`), envoi, ouverture dans un navigateur de téléphone simulé. Lettre de Fanal montrée une fois, pas au rechargement, 0 erreur console. Côté serveur : copie v1 identique à l'octet à la partie d'avant, partie en version 2 avec `migratedAt`, plus rien de la v1, quartiers recomptés, liste des tâches identique à l'octet, 19 lignes du registre intactes, anciens identifiants d'opérations gardés en tête et dans l'ordre. Une écriture sans version de client reçoit bien le refus.*
- *Accepté : pendant les 24 h qui suivent la bascule, remballer une quête payée en v1 affiche encore « Ses gains sont repris », alors que seul le quartier recule. `app/ARCHITECTURE.md` (champ `client`, `client_outdated`, copie v1, `oree.queue.v2`, `migratedAt`) sera mis à jour au lot 8, avant la bascule de la production.*

### Lot 4 — Bâtiments, habitants, fiches à trois lignes
Pour le joueur : il rebâtit des chalets, sème, récolte, accueille des familles et voit son rang monter. Chaque bâtiment dit ce qu'il est, ce qu'il fait, ce qu'on peut faire maintenant, ou ce qui manque (« Il faut d'abord un quai. »).
- [x] Bâtiments du campement et du hameau : coûts, rang, prérequis, emplacements sur l'île.
- [x] Potager de mai à octobre (au 1er novembre, ce qui est en terre mûrit d'un coup) ; serre toute l'année ; Nourriture plafonnée par le stockage.
- [x] Accueillir une famille : un logement libre et de la Nourriture dépensée donnent un habitant. Personne ne part.
- [x] Éolienne : Énergie en plus le premier jour travaillé, inscrite au registre.
- [x] [impeccable] chalet, serre, éolienne, grenier, quai ; fiche à trois lignes et état verrouillé.
- [x] Tests écrits d'abord : chaque refus avec sa raison ; simulation sur 21 jours et sur un hiver complet (aucune impasse, voir question 3).
- *Fait le 5 octobre (commits f62de9b, 5a45859, 857665b ; cache v6). Vérifié par moi : 306 tests `node --test` (dont `simulation.test.mjs` : Hameau en 21 jours environ ; départ le 25 octobre sans impasse d'hiver ; une année sans stock négatif). Scénarios navigateur aux trois largeurs, tous réussis (15 « potager » remis dans la série ; 17 et 18 encore de côté jusqu'au lot 5). Captures à 390 et 1280 regardées : fiche verrouillée lisible (« Hameau : encore 3 habitants. »), plus aucune plaque qui cache une caisse.*
- *Repères de la simulation (agent, relus) : chalet 15 Matériaux, quai 25 Matériaux + 4 Énergie ; une culture mûrit en 5 jours travaillés ; une famille coûte 18 Nourriture ; éolienne +3 Énergie par jour travaillé. Départ le 25 octobre : première famille vers le jour 8, Hameau vers les jours 39 à 44, village plein (6 habitants) fin novembre ou début décembre, puis les ressources s'accumulent. **Corrigé le 5 octobre au soir** : faux pour le village plein. Relancé par moi avec `simuler()` du dépôt (code après le lot 5, joueur simulé qui ne bâtit ni éolienne, ni grenier, ni quai) : départ le 6 octobre, plein le 12 novembre (2,5 quêtes par jour) ou le 20 novembre (une par jour) ; départ le 25 octobre, plein le 30 janvier ou le 2 février, l'hiver ne nourrissant que par la serre. Au jour 200, environ 2 200 Énergie et 3 400 Matériaux dorment (2,5 quêtes par jour).*
- *Essai en ligne, vérifié vers 19 h 20 : photo de la partie (`backups/avant-lot4-…`), envoi, ouverture dans un navigateur de téléphone simulé : cache v6, 0 erreur console, partie en version 2, liste des tâches identique à la photo.*
- *Décidé (contestable) : les cultures poussent aux jours travaillés, pas aux jours du calendrier (bible : « Le village travaille les jours où tu travailles »). Le village est plein vers la 6e semaine pour un départ début octobre, mais fin janvier pour un départ le 25 octobre (correction ci-dessus) : la bande de terre et les nouveaux emplacements de chalets doivent être prêts avant que le village soit plein, la date dépendant de la bascule.*
- *Pour le lot 5 : la première famille arrive lentement (jours 8 à 11) ; les récompenses des premiers pas donnent un coup de pouce en Nourriture, sans changer le coût d'une famille. L'Énergie de l'éolienne reste acquise si Remballer laisse le jour sans quête payée : à reprendre. Quelques raisons du cœur ont une espace ordinaire avant le deux-points (« Le potager dort de novembre à avril : … ») au lieu de l'espace insécable : à corriger.*

### Lot 5 — Premiers pas, bandeau d'objectifs, accueil
Pour le joueur : trois écrans d'accueil, cinq premiers pas guidés, et un bandeau toujours visible : aujourd'hui, cette semaine, cette saison, prochain rang.
- [x] Les cinq quêtes d'initiation (bible §11), atteintes une seule fois, jamais écrites dans `tasks.json`.
- [x] Saison du vrai calendrier ; objectif d'automne « Remplir le grenier », sans perte s'il est manqué.
- [x] Bandeau d'objectifs (remplace le carnet) ; « cette semaine » affiche les premiers pas en attendant les visiteurs.
- [x] [impeccable] bandeau aux trois largeurs, écrans d'accueil.
- [x] Tests écrits d'abord ; scénarios de l'accueil et des premiers pas réécrits ; nouveau scénario « bandeau ».
- *Fait le 5 octobre (commits b8276bb, 3d419fd, c4e2a25, c2dceb6, c58485a de l'agent ; puis par moi : typographie OQLF dans tous les textes du jeu avec un test (insécable devant « : » et dans les guillemets, aucune espace devant « ? ! ; » : corrigé en fin de soirée, la consigne du lot 5 était fausse), scénario 22 corrigé, lanceur ramené à un seul essai ; cache v7). Vérifié par moi : 339 tests `node --test` ; série navigateur complète « TOUT REUSSI », 26 scénarios aux trois largeurs, un seul essai chacun (17 : 81 vérifications, 18 : 69, 27 : 65). Une première série avait échoué au scénario 22 à 1280 : le bonus d'ouverture arrivait au registre après la photo du départ (même piège qu'au scénario 1, voir `tasks/lessons.md`).*
- *Choix de l'agent, relus : pas dans l'ordre, chacun constaté sur l'état (une partie migrée qui a déjà des tâches passe les pas 2 et 3 d'elle-même) ; coups de pouce : chalet +5 Matériaux, tâche +2 Énergie, terminer +5 Matériaux, semer +6 Nourriture (+9 quand le potager dort), famille +3 Énergie. Simulation de l'agent (relue, pas relancée) : première famille au jour 6 (départ le 25 octobre) et au jour 7 (départ le 15 décembre), au lieu des jours 8 et 24 ; Hameau au jour 18 au lieu de 21. Saisons découpées net (automne septembre-novembre, hiver décembre-février…) ; seul l'automne a un objectif : Nourriture au plafond du stockage une fois, +3 Énergie et +10 Matériaux. Accueil à la première visite, aussi pour une partie migrée ; pendant cette visite, rien d'autre ne s'ouvre (la lettre de passage attend la visite suivante).*
- *Essai en ligne, vérifié vers 21 h 35 : photo (`backups/avant-lot5-20261005-213319`), envoi, ouverture dans un navigateur sans affichage qui bloquait toute écriture (pour laisser à Alex ses premiers pas) : cache v7, accueil ouvert sur sa partie, bandeau présent, 0 erreur hors l'écriture bloquée ; partie, registre et liste identiques à la photo.*

### Lot 6 — Bilans passés et « Jour suivant »
Pour le joueur : le bilan garde l'historique des semaines. Dans la version d'essai seulement, un bouton fait passer au jour suivant.
- [x] Le bilan de chaque semaine finie est figé et gardé (deux ans au plus). La migration recompte les semaines passées.
- [x] Réglage « bac à sable » écrit par le seul script de l'essai dans sa configuration serveur. La production refuse une partie qui porte un décalage de date.
- [x] Toutes les lectures de la date du jeu passent par une seule horloge : date réelle, plus le décalage en version d'essai.
- [x] [impeccable] historique dans la feuille du bilan ; bouton « Jour suivant ».
- [x] Tests : bouton absent par défaut, présent en essai ; la date avance d'un jour et les cultures poussent ; décalage refusé en production.
- *Fait le 5 octobre (commits 30c2a11, bfeae52, 44c5784 ; cache v5). Vérifié par moi : 260 tests `node --test`. D'après le journal de l'agent (relu, pas relancé) : tous les scénarios navigateur réussis aux trois largeurs, dont le nouveau 28 « jour suivant » (69 vérifications). /impeccable : guides du skill chargés (routing, shape, operate, craft-floor), captures regardées ; pas de critique ni d'audit complet.*
- *Essai en ligne, vérifié vers 18 h 30 : le script de l'essai écrit `define('SANDBOX', true);` dans son `config.php` ; l'API de l'essai dit `sandbox: true`, celle de la production non ; bouton présent (44 px, 0 erreur console), pas touché pour ne pas déranger la partie d'Alex. Le script de production contrôle désormais que la production n'est jamais en bac à sable.*
- *Décidé : pas de bouton « Revenir à aujourd'hui » ; si la partie d'essai doit repartir de zéro, je la réinitialise côté serveur. Les dates décalées de l'essai restent dans sa propre liste fictive (dossier de données de l'essai), qu'Hermes ne synchronise pas. Le décalage vaut N × 24 h : autour d'un changement d'heure, un toucher pourrait sauter ou répéter un jour (déduit du code, accepté pour un outil d'essai). Les cultures n'existent pas encore : « les cultures poussent » sera vérifié au lot 4.*
- *Pour le lot 8 (`app/ARCHITECTURE.md`) : `SANDBOX`, code `sandbox_only`, `horloge`, `figerBilans`, `js/horloge.js`, option `sandbox` du serveur de test.*

### Lot 7 — Rappel du matin (ntfy)
Pour le joueur : chaque jour à 8 h, une notification au texte général ; la toucher ouvre l'Orée.
- [x] Petit script PHP lancé par une tâche planifiée de l'hébergement à 8 h (le serveur est à l'heure de Toronto, la même que Montréal : vérifié le 5 octobre). Refusé s'il est appelé depuis le web. Un envoi par jour au plus.
- [x] Nom du canal et adresse de l'app dans la configuration serveur, jamais dans le dépôt. Textes sans titre ni nombre de tâches.
- [x] Tests avec un faux serveur ntfy : un seul envoi, aucun titre de tâche, refus depuis le web.
- [x] Alex : installer ntfy (F-Droid) et s'abonner au canal ; tâche planifiée (question 2). *Fait le 5 octobre vers 18 h 30. Essai d'abord dans Brave avec la version web de ntfy : reçu onglet ouvert, rien onglet fermé. Puis l'app ntfy de F-Droid : l'envoi de 18 h 29 est arrivé sur le téléphone (constat d'Alex). Premier rappel automatique : le 6 octobre à 8 h.*
- *Fait le 5 octobre par moi (commit du rappel : `app/serveur/`, test `app/tests/api/rappel.test.mjs`). 6 tests ; chaque règle cassée volontairement fait échouer au moins un test (un envoi par jour, rien de la liste, pas depuis le web, échec non noté comme fait, réglages manquants). PHP du serveur réglé sur UTC : le script fixe lui-même l'heure de Montréal.*
- *Installé en production vers 17 h 45 (accord d'Alex) : script dans `app/serveur/` (interdit au web, 403 vérifié), canal aléatoire et adresse de l'app ajoutés au `config.php` de production (copie gardée dans `api/data/backups/`, API vérifiée ensuite : 200 avec code, 401 sans), tâche planifiée « 0 8 * * * ». Incident : la première écriture de la table planifiée a effacé les 10 lignes existantes ; restaurées à l'identique en moins d'une minute (voir `tasks/lessons.md`). Essai réel : le serveur a envoyé, ntfy a reçu le message avec le lien (gardé 12 h).*
- *Le script vit dans `app/serveur/` de la production avant la bascule : le déploiement de `v1` ne le retire pas (envoi sans suppression), la v2 le contient.*


### Lot 8 — Documentation, essai complet, bascule
- [ ] Service worker : nouvelle version, liste des fichiers à jour.
- [ ] Docs : `app/ARCHITECTURE.md`, `PRODUCT.md`, `CLAUDE.md`, `app/content/README.md`, `TASKS_WORKFLOW.md` (rien ne doit changer pour Hermes : à vérifier). Au lot 5 se sont ajoutés, pour `app/ARCHITECTURE.md`, `app/DESIGN.md` et `app/content/README.md` : `core/objectifs.js` (premiers pas `pas:{id}`, objectif de saison `saison:{clé}`, bandeau), `game.accueil`, `game.premiersPas`, les écrans d'accueil (`#dlg-accueil`), `js/ui/bandeau.js`, la reprise de l'éolienne `reprise:eolienne:{jour}`, la règle des espaces insécables (test `typographie.test.mjs`), `ESSAIS` dans `run-ui.sh`. `PRODUCT.md`, `CLAUDE.md` et `README.md` ont été remis à jour le 5 octobre au soir (app en production, décisions du soir).
- [ ] Tout relancer (tests, scénarios aux trois largeurs) ; relecture indépendante de la migration et du bac à sable.
- [ ] Alex joue quelques jours sur l'essai, avec « Jour suivant ».
- [ ] Bascule (accord d'Alex) : sauvegarde datée, déploiement, retrait à la main des fichiers v1 restés, contrôles en lecture seule (partie v2, copie v1, empreinte de `tasks.json` inchangée, synchro d'Hermes). Retour arrière : étiquette `v1` + copie v1.

### Risques
- Un onglet v1 resté ouvert à la bascule : son geste suivant est refusé avec un message, rien n'est écrit, il faut le refaire après rechargement.
- Entre les lots 1 et 2, les scénarios navigateur échouent : aucun déploiement entre les deux.
- Retour arrière après des gains v2 : possible, mais les gains faits en v2 ne reviennent pas en v1.
- ntfy : le texte et l'adresse de l'app passent par un serveur public ; seul un nom de canal long et aléatoire les protège.

### Questions pour Alex
1. Les tâches terminées avant l'app ne sont pas au registre. Les compter une fois pour les niveaux de quartier, sans Énergie ni Matériaux ? **Alex : oui.**
2. La tâche planifiée du rappel est hors du dossier de l'app sur le serveur. Recommandation : je l'ajoute moi-même, après une copie des tâches planifiées existantes, sans toucher aux autres. Autre choix : tu l'ajoutes dans cPanel. **Alex : accord pour que je l'ajoute moi-même** (au lot 7, quand le script existe).
3. Impasse d'hiver : la v2 arrive vers la fin octobre. Au campement, la seule Nourriture vient du potager, qui dort de novembre à avril, et la serre n'arrive qu'au hameau, qui demande 3 habitants nourris. Sans changement, le village reste bloqué tout l'hiver, et le premier pas « Semer » est impossible. Recommandation : une petite serre dès le campement ; l'objectif d'hiver « garder la serre allumée » devient jouable dès le premier hiver. **Alex : vrai calendrier et petite serre dès le campement (décision A).**

## Retours d'essai d'Alex — 5 octobre 2026, soir (à trancher en début de session suivante)

Alex a joué 17 faux jours sur l'essai (lot 4, avant l'accueil et le bandeau). « C'est un super jeu, j'adore. » Constats vérifiés par lecture du code (sous-agents, puis repris par moi), propositions à valider.

| # | Retour d'Alex | Constat dans le code | Proposition |
|---|---|---|---|
| 1 | Toucher un quartier ouvre la liste filtrée : on attend plutôt ce que le bâtiment fait | `app/js/main.js` `filterByQuartier` : filtre + ouvre le panneau | Toucher un quartier ouvre sa fiche (ce qu'il fait, ce que le prochain niveau débloque). Le filtre reste dans la liste (puces) |
| 2 | Niveaux par catégorie injustes : peu de tâches Garage, rien en Terrain l'hiver | Niveau = nombre de tâches du domaine (`economy.js`, `village.js`) | **A (recommandé)** : toutes les tâches remplissent le même stock ; on monte un quartier en y investissant des ressources ; chaque niveau a un effet concret. Ça donne aussi un usage aux ressources qui s'accumulent une fois le village plein (simulation du lot 4). **B** : garder le compte par domaine, sans rien de bloquant derrière |
| 3 | À quoi servent les niveaux ? | Rien de concret : affichage et annonce seulement. Les effets promis par la bible §4 (Atelier N2 répare moins cher, Champs N3 +1 parcelle) ne sont pas codés | Chaque niveau = un effet écrit sur la fiche du quartier |
| 4 | Mode construction pénible avec de gros doigts | Les emplacements sont fixes (`app/world/layout.js`, `EMPLACEMENTS`) | Bouton « Construire » : catalogue (dispo, coût, ce qui manque) ; le choix va sur le prochain emplacement libre, la caméra le montre. Plus besoin de viser |
| 5 | L'effort devrait payer : prioritaire, longue, difficile. Plein de courtes ne devraient pas tant payer | Gain = (6·√longueur + 2 si difficulté ≥ 7) × (0,8 + 0,04·priorité) (`reward.js`). Cinq tâches courtes et faciles (P9, L2, D2) : 5 × 10 = 50 points ; une longue et difficile (P9, L9, D9) : 23 points. Plafond quotidien : plein tarif jusqu'à 45 points, moitié jusqu'à 90, 20 % au-delà | Gain proportionnel à la longueur, multiplié par la difficulté, petite prime de priorité (ex. 2·L × (0,6 + 0,08·D) × (0,8 + 0,04·P) : A ≈ 3,5, B ≈ 27,6). La Cote (ordre des quêtes) ne change pas. Rééquilibrer par la simulation |
| 6 | Carte en liste : pertinence ? | Exigée par la règle « chaque geste a un bouton équivalent » (CLAUDE.md, PRODUCT.md) : c'est l'accès à la carte sans toucher l'île | La garder, mais rangée hors de la vue principale ; elle liste les fiches des quartiers et bâtiments |
| 7 | « Je m'y mets » : ça apporte quoi ? | Aucune ressource (voulu : impossible à exploiter). Note le temps passé, le montre au bilan, propose de découper une quête qui prend plus de 2 fois son estimation. Idée de la revue d'octobre ; Alex avait choisi « simple relevé du temps ». C'est aussi un des déclencheurs du gel de priorité/longueur/difficulté (`reward.js`) | Le retirer de la carte du Fil du jour (les autres déclencheurs du gel restent) |
| 8 | Voir les habitants bouger | Prévu aux semaines 3-4 (« île vivante », bible §14) | Inchangé |
| 9 | Rabat : il faut viser « Tout voir » ; un glissement recharge la page | Bouton seulement, aucun glissement ; la protection contre « tirer pour rafraîchir » est posée sur les zones qui défilent (`.panel-scroll`, `.sheet-body`, `.ow-scroller`), pas sur la page | Bloquer le rechargement par glissement sur la page ; poignée qui se glisse ; toucher n'importe où dans l'en-tête ouvre ou replie. **Défaut à corriger en premier** |
| 10 | Boutons de zoom inutiles (on pince) | Exigés par la même règle d'équivalence | Colonne remplacée par : « Construire », « Quêtes » (montre ou cache le panneau, carte plein écran), et un bouton « Vue » qui déplie zoom +, −, toute l'île |
| 11 | Récolte en 5 jours actifs : un peu long, mais juste | — | Inchangé |
| 12 | Aucun obstacle en 17 jours | Normal : imprévus et alertes n'existent pas encore (semaines 3-4) ; les Avis de la v1 ont été retirés au lot 1 | Inchangé |
| 13 | Filtre « Archivées » : jamais vu comment archiver | « Archiver » n'existe que dans la feuille d'édition d'une quête (`sheets.js`) | Cacher le filtre tant qu'aucune quête n'est archivée ; dire ce qu'archiver veut dire. À vérifier : Hermes utilise-t-il ce statut ? |

**Questions pour Alex**
1. Quartiers : A (stock commun, améliorations achetées) ou B ?
2. Gains : d'accord pour « l'effort paie » (longueur × difficulté, petite prime de priorité) ?
3. « Je m'y mets » : on le retire ?
4. Carte en liste : rangée dans un menu, d'accord ?
5. Ordre : ces changements avant la bascule (recommandé : sa vraie partie démarre alors sur les bonnes règles, sans seconde migration), ou après ?

**Réponses d'Alex (5 octobre, soir)**
1. Quartiers : ni A ni B tels quels. « Si on remplit le même stock, tous les bâtiments vont augmenter au même niveau » (lecture d'Alex ; dans A, c'était déjà lui qui choisissait où investir). Son idée : **une devise ou ressource à part sert à monter un bâtiment, au choix du joueur**. Mis à l'étude par un panel de conception (4 conceptions, 2 juges, une synthèse) : résultat dans `docs/conception-niveaux-quartiers.md` : **le permis, validé par Alex** (nom retenu ; essai : niveaux convertis en permis).
2. Gains : **oui**, l'effort paie.
3. « Je m'y mets » : **retiré**.
4. Carte en liste : **rangée dans un menu**.
5. Ces changements se font **avant la bascule**.

## Lot R — Retours d'essai, avant le lot 8 (nuit du 5 au 6 octobre 2026)

**Statut : en cours, en autonomie** (mandat d'Alex le 5 octobre à 22 h 30 : toute la nuit, auto-vérification, topo au réveil). Plan écrit après un relevé du code par neuf agents en lecture seule (chaque constat cité en fichier:ligne ; relevé gardé hors dépôt), puis soumis à une critique indépendante.

**Décisions d'Alex (5 octobre, 22 h 36)**
- « Je m'y mets » : tout retiré de l'écran (bouton, épingle en tête du Fil, relevé du temps, temps au bilan, proposition de découper).
- Carte en liste : rangée dans le bouton « Vue » de la carte.
- Cette nuit : jusqu'à l'essai, jamais la production. La partie d'essai passe aux permis (niveaux convertis).
- Bible (§4, §6, §7, §9, §13, §15) et `PRODUCT.md` mis à jour, chaque passage changé signalé dans le topo.

**Arbitrages pris par moi (à relire par Alex)**
1. **Gains.** PE = arrondi(4·L × (0,6 + 0,08·D) × (0,8 + 0,04·P)). C'est la formule proposée, multipliée par 2 (2·L devient 4·L) pour garder l'échelle actuelle : sans ce facteur, le gain moyen est divisé par deux (5,1 PE contre 10,1 sur `tasks.example.json`) et, pour un départ le 15 décembre, la première famille arrive au jour 9 au lieu du jour 7 (jour 14 au lieu de 10 à une quête par jour). Avec le facteur 4, toutes les cibles de la simulation tiennent comme aujourd'hui. Exemples : courte et facile (P9 L2 D2) 7 PE au lieu de 10 ; longue et difficile (P9 L9 D9) 55 au lieu de 23. Plafond quotidien inchangé cette nuit (45 puis 90), décision laissée à Alex : le joueur simulé (quêtes L2 à 4, D3 à 5) ne le dépasse que de 2 PE au plus, mais une seule quête P9 L9 D9 vaut 55 PE dont 50 comptés, et deux le même jour 110 dont 71,5 comptés (−35 %, calcul de la relecture). *Chiffres relancés par moi le 5 octobre à 23 h (simulation du dépôt copiée hors dépôt, formule seule changée).* La Cote ne change pas.
2. **Gel des valeurs.** « Je m'y mets » disparaît des déclencheurs ; restent la première étape cochée, 24 h après la création, et la fin. Risque connu, non traité cette nuit, décision laissée à Alex : gonfler la longueur et la difficulté d'une quête créée puis finie aussitôt rapportait 2,4 fois plus ; avec la nouvelle formule, 7,9 fois plus (calcul de la relecture, à refaire avant le topo). C'est en tension avec un principe de `PRODUCT.md` (vers la ligne 80), qui ne sera ni effacé ni adouci.
3. **Retrait de « Je m'y mets ».** Le module `core/cote-a-cote.js` et l'épingle (`isPinned`, `pinnedFirst`) partent avec le bouton ; sinon une quête déjà épinglée resterait en tête sans moyen de la libérer. Le bouton « Découper » des grands chantiers reste (il ne dépend pas de la séance). Les parties existantes gardent `game.coteACote` et les minutes des bilans figés, inertes, sans migration ; `startedAt` reste dans les données et n'est plus lu.
4. **Construire.** Le cœur choisit déjà le premier emplacement libre (`construire` avec `{ type }`) : le catalogue l'appelle, puis la caméra centre l'emplacement (nouvelle fonction du monde). Toucher l'île reste comme aujourd'hui.
5. **Quêtes.** Troisième état du panneau, « caché » : la carte prend tout l'écran aux trois largeurs, et la caméra se recadre.
6. **Vue.** Déplie vers la gauche une rangée : Rapprocher, Éloigner, Toute l'île, Carte en liste. Le bouton « Carte en liste » quitte le bas du panneau.
7. **Toucher un quartier.** Tout ce qui filtrait la liste (plaque, repère, Fanal sans quête) ouvre la fiche du quartier. Le filtre reste dans les puces de la liste et dans la fiche (« Voir les quêtes Terrain (14) »).
8. **Permis.** Comme la spécification, avec quatre écarts tirés du relevé : le niveau 3 du Garage (tournée d'hiver, seul mécanisme neuf, avec deux pièges relevés) est reporté, le Garage s'arrête donc au niveau 2 pour l'instant ; à la conversion, le compte des jours part de la veille, pour que le jour de la conversion compte ; la lettre de conversion a sa propre fonction (`passageLetter` ne sait pas remplir `{n}`) ; `ECHELLE` se règle par simulation après la nouvelle formule de gains. Version de l'app 3 (client et serveur), cache v8.

9. **Prix des niveaux (après R2a).** `ECHELLE` = 25 : niveau 1 = 1 permis, 75 Énergie, 100 Matériaux ; niveau 2 = 2, 150, 200 ; niveau 3 = 3, 225, 300. Réglage de l'agent R2a au milieu de la plage qui tient les cibles (21 à 35) ; à ce prix, l'Énergie et les Matériaux freinent plus que les permis : le joueur simulé régulier garde 16 permis en main à la semaine 16 (chiffres de l'agent). La pastille des permis reste donc sobre.
10. **Hameau avec niveaux.** Acheter un niveau des Champs avant le Hameau l'avance de deux jours (jour 16 au lieu de 18 au rythme régulier, pour toutes les valeurs d'`ECHELLE` essayées par l'agent) : accepté, c'est l'effet voulu d'un niveau. La cible de la simulation avec niveaux devient 15 à 25 jours ; sans niveaux, elle reste 17 à 25.

**Règles d'exécution (après la critique du plan par quatre relecteurs, 5 octobre vers 23 h 15)**
- `feat/village-v2` reste toujours un état qu'on peut envoyer : chaque sous-lot se code dans sa propre copie de travail et n'est fusionné que vert (`node --test`, série complète aux trois largeurs, `world-s3`).
- Fichiers de R2a : `app/core/**`, `app/tests/core/**`, `app/tests/api/**`, `app/api/api.php`, `app/js/api-client.js` (version seulement), `app/content/fr-CA/lettres.json`, et une ligne de `app/sw.js` (son module). Fichiers de R2b : `app/index.html`, `app/css/**`, `app/js/main.js`, `app/js/world-bridge.js`, `app/js/ui/**`, `app/world/**`, `interface.json`, `batiments.json`, `app/tests/e2e/**`, une ligne de `app/sw.js`. Personne en R2 : version du cache, `js/store.js`, `repliques.json`, documents. R2a garde l'événement `quartier-niveau` et les exports de `village.js` : R3 les retire avec ce qui les lit.
- Nouveau fichier : dans la liste `SHELL` de `sw.js` dans le même commit. La version du cache ne monte qu'une fois, en R6.
- Point de repli **P1** = R1 + gains (commit à part de R2a) + R2b. Le bloc permis (reste de R2a, version 3, conversion, R3) part en entier ou pas du tout : jamais de conversion en permis sans l'écran pour les dépenser. Si R3 n'est pas vert et fusionné à 5 h, on envoie P1. L'envoi commence au plus tard à 6 h.
- Ordre de coupe si ça déborde : rattrapage de la relecture de design du lot 2 ; répliques de Fanal par quartier et animation de montée ; poignée glissable (on garde la règle anti-rechargement et le toucher de l'en-tête) ; enfin tout le bloc permis.
- Le correctif du rechargement ne se vérifie pas dans Chromium de bureau : à essayer par Alex dans Brave sur Android.

**Sous-lots**

### R1 — Retrait de « Je m'y mets » et filtre « Archivées »
- [x] D'abord le contrôle commun des scénarios (`FIL_CHECK` de `tests/e2e/lib.cjs`) et `ui-01`, sinon toute la série échoue.
- [x] Écran : bouton (trois cartes), proposition de découper, état « en cours », temps au bilan, textes.
- [x] La carte « Grand chantier » reçoit le bouton « Fait » de la carte rapide (sans lui, elle n'aurait plus d'action principale) ; « Découper » reste en second. Un geste « Je m'y mets » resté en file hors ligne est écarté sans message.
- [x] Cœur : `startQuest`, `pauseQuest`, épingle, séance, gel par `startedAt`, relevé du recyclage ; `core/cote-a-cote.js` retiré de `sw.js`.
- [x] Tests : `cote-a-cote.test.mjs` et `ui-22` retirés, les autres adaptés.
- [x] Filtre « Archivées » caché tant qu'aucune quête n'est archivée ; retour à « À faire » si la dernière est désarchivée ; une phrase à côté du bouton « Archiver » de la fiche dit ce qu'archiver veut dire (rangée sans rien effacer, on peut la ressortir). Hermes : le flux décrit dans `TASKS_WORKFLOW.md` ne lit que `todo` et `done` (lu, non vérifié chez Hermes).
- *Fait le 5 octobre vers 23 h 35 (agent dans sa copie de travail, 5 commits, fusion 97948d7). Vérifié par moi après la fusion : 328 tests `node --test` sur 328. D'après le rapport de l'agent (relu, pas relancé) : série navigateur complète « TOUT REUSSI » (le scénario 22, côte à côte, est supprimé), `world-s3` 71 contrôles sans échec. Captures regardées par moi : carte « Grand chantier » (« Fait » et « Découper ») et phrase d'archivage dans la fiche, à 390. Aucun scénario de la série ne couvre la carte « Grand chantier » : les données d'exemple n'en produisent pas.*
- *Retiré aussi : la pose de Fanal qui suivait la séance (il reste à sa place d'origine), 22 clés de texte et la réplique « quest.start ». Gardé : `game.coteACote` des parties existantes et les minutes des bilans figés, inertes. Clés de texte déjà mortes avant le lot, laissées : `card.pinned`, `step.split.suggest`, `list.archived.one/other`, `quest.reward.frozen`.*

### R2 — En parallèle, chacun dans sa copie de travail
**R2a — Cœur : gains et permis** (logique et tests seulement)
- [x] Gains : tests écrits d'abord, puis la formule ; simulation recalée (cibles inchangées).
- [x] `core/quartiers.js` : effets des niveaux, prix, refus, `monterQuartier`, `suivrePermis` ; lectures branchées dans `batiments.js` (récolte par lieu, jours de pousse, places, stockage, prix d'une famille).
- [x] Permis des jours travaillés, des rangs et de l'objectif de saison ; événements dédiés.
- [x] Conversion des niveaux en permis (parties v1 et v2, sans toucher `STATE_VERSION`) ; lettre de conversion.
- [x] Version 3 du client et du serveur, les six envois `client: 2` des tests de l'API passés à 3 (dont `api.test.mjs:371`), cas « version 2 refusée » ; `ECHELLE` réglée par simulation, avec un profil de quêtes longues et difficiles en plus.
- [x] Gains dans un premier commit à part (point de repli P1).
- [x] Partie neuve : le compte des jours part aussi de la veille. Niveau maximum par quartier (Garage 2) : « Niveau {n} : le plus haut pour l'instant. » ; « Déjà fait. » seulement si le niveau visé est atteint, sinon « Il faut d'abord le niveau {n}. ».
- [x] Partie v1 (la vraie partie à la bascule) : pas de lettre de conversion ; la lettre de passage parle des permis.
- [x] Lectures pour R3 : `progressionPermis`, places par chalet exportées, événements `permis` et `quartier-monte` ; script de preuve de la conversion pour R6.
- *Fait le 6 octobre vers 0 h 45 (agent dans sa copie, commit des gains d6613d2 à part, commit des permis 2270f5e). Les gains seuls sont fusionnés dans `feat/village-v2` (6ae4264). Les permis sont sur la branche d’intégration `lot-r-permis` (fusion a899e26) et n’entreront dans `feat/village-v2` qu’avec R3, vert (bloc tout ou rien). Vérifié par moi sur cette branche : 363 tests `node --test` sur 363, après le recalage du test (a′) (arbitrage 10). D’après le rapport de l’agent (relu, pas relancé) : série navigateur « TOUT REUSSI » sur sa branche ; `ECHELLE` = 25 ; à ce prix, les permis s’accumulent dans la simulation (16 en main à la semaine 16).*

**R2b — Interface : rabat, colonne de la carte, catalogue** [impeccable]
- [x] Premier commit : `overscroll-behavior-y: contain` sur `html` et `body` (le défaut qu'Alex veut voir corrigé en premier).
- [x] En-tête qui se touche ou se glisse (sauf ses boutons), testé au doigt (toucher émulé), pas seulement à la souris ; rien en colonne latérale.
- [x] Table des passages entre ouvert, replié et caché (Tout voir, en-tête, Quêtes, Échap, filtre, Aujourd'hui, Voir sur la carte) ; panneau caché inerte ; un message ou une erreur d'enregistrement reste visible quand le panneau est caché.
- [x] Colonne : Construire, Quêtes (état « caché »), Vue (Rapprocher, Éloigner, Toute l'île, Carte en liste) ; caméra recadrée ; plaques jamais sous la colonne.
- [x] Catalogue « Construire » (bâtiments) : disponible, coût, ce qui manque. Il envoie `{ type, id }` (premier emplacement libre, calculé à l'affichage) pour qu'un double toucher ne bâtisse pas deux fois ; se ferme au succès ; la caméra montre l'emplacement (quai et parcelles compris).
- [x] Colonne ancrée au-dessus du vrai haut du panneau ; contrôles à la main à 360×640 et 390×667 ; la démo du monde reçoit les mêmes boutons, pour que `world-s3` les mesure.
- [x] Scénarios mis à jour ; `world-s3` et `world-perf` relancés à la main (hors `run-ui.sh`).
- *Fait le 6 octobre vers 0 h 55 (agent dans sa copie, 6 commits, fusion e35840e = point de repli P1 : R1, gains et R2b). Vérifié par moi après la fusion : 329 tests `node --test` sur 329. D’après le rapport de l’agent (relu, pas relancé) : série complète de 27 scénarios « TOUT REUSSI », `world-s3` 94 contrôles sans échec, `world-perf` inchangé. Non vérifiable ici : le vrai geste de tirer pour rafraîchir sur le téléphone d’Alex. Défauts antérieurs au lot, relevés par l’agent, pour R4 : à 360×640, la plaque de l’Atelier passe d’environ 14 px sous le haut du rabat replié ; à 844×390, le bandeau d’objectifs est tronqué ; le panneau d’erreur couvre environ 47 % de l’écran à 390.*
- *Point de repli P1 vérifié par moi le 6 octobre (dossier principal) : première série 25 scénarios sur 27, sous charge (R3 tournait) ; le scénario 1 mesurait « Fait » pendant un mouvement du panneau et le scénario 7 levait une erreur dans le second onglet (course de la semaine 1 : la file recalculée avant la lecture de la partie). Les deux passent seuls ; corrigés (test qui attend une page posée, écouteur gardé). Seconde série, avec le correctif : 27 sur 27, 1 705 vérifications, « TOUT REUSSI ». `world-s3` : 94 contrôles, 0 échec. `world-perf` pas relancé (machine chargée ; le code du monde est celui que R2b a mesuré).*

### R3 — Le permis à l'écran (après la fusion de R2a et R2b) [impeccable]
- [x] Fiche de quartier (feuille propre, ses propres identifiants) ; toucher une plaque ouvre la fiche.
- [x] Plaques « Champs · niv. 2 » sans barre. Le signal « niveau possible » sur la plaque est reporté : la pastille sur « Construire » mène à la section Quartiers, qui montre le prix et ce qui manque.
- [x] Carte en liste : chaque quartier ouvre sa fiche ; son texte vient du niveau acheté. Toucher Fanal ouvre la fiche de la Place.
- [x] `monterQuartier` dans les actions du magasin (`js/store.js`) ; places par chalet réelles dans `world/view.js` ; la fiche « Voir les quêtes » ferme toutes les feuilles ouvertes.
- [x] Section « Quartiers » du catalogue ; pastille des permis sur « Construire ».
- [x] Annonces et Fanal : permis gagné, quartier monté ; lettre de conversion ; fiches des bâtiments aux vraies valeurs.
- [x] Nouveau scénario navigateur aux trois largeurs (toucher, clavier, Carte en liste) ; `ui-12` et `world-s3` réécrits.
- *Fait le 6 octobre vers 1 h 55 (agent dans sa copie, partie de la branche d’intégration des permis ; commits 1c13a84 et e8cdef9 ; fusion c232ca3 dans `feat/village-v2`, sans conflit, avec R2a). Vérifié par moi après la fusion : 363 tests `node --test` sur 363. D’après le rapport de l’agent (relu, pas relancé) : série de 28 scénarios « TOUT REUSSI » (`ui-31` : 141 vérifications), `world-s3` 97 contrôles sans échec, `world-perf` sans erreur.*
- *Écarts décidés par l’agent : « Voir les quêtes » compte les quêtes à faire du quartier (ce que la liste montre ensuite) ; dans la Carte en liste, « Ouvrir la fiche » remplace « Ses quêtes » ; la lettre de conversion remplace la lettre du matin ce jour-là ; la réplique de rang est générale (« {rang}. Ça vaut un permis. Et un tampon. ») ; les répliques des permis n’ont qu’une variante. Toucher Fanal ou un repère ouvre la fiche : d’après l’agent, lu dans le code, et `world-s3` constate dans la démo du monde que Fanal renvoie la Place ; aucun scénario de l’app ne le teste.*
- *Vérifié par moi sur la fusion (c232ca3, plus les documents ad80b26), machine au calme : série complète 28 scénarios sur 28, 1 855 vérifications, « TOUT REUSSI » (environ 18 minutes) ; `world-s3` 97 contrôles, 0 échec ; `world-perf` lancé seul : 60 images par seconde en moyenne pendant une montée de niveau (la plus lente 16,8 ms), aucune animation au repos, aucune erreur, aucun défilement horizontal. `world-perf` liste la plaque de l’École à 390 comme cible trop petite : 43,99998 px, arrondi sous 44 (`world-s3` tolère 43,99).*

### R4 — Vérification et relecture
- [x] Tout relancer : `node --test`, série complète aux trois largeurs, `world-s3`, `world-perf`.
- [x] Relecture indépendante à plusieurs regards (cœur et conversion, interface et accessibilité, fidélité aux décisions, design avec /impeccable, rattrapage de la relecture de design promise au lot 2). Correctifs.
- *Relecture faite le 6 octobre de 2 h 19 à 3 h 27 : quatre regards indépendants (cœur et conversion, interface et accessibilité, fidélité, design avec /impeccable et rattrapage du lot 2), chacun contre-vérifié par un sceptique qui a tenté de réfuter chaque constat. 25 constats confirmés (23 distincts : deux défauts vus par deux regards), aucun bloquant.*
- *Corrigés cette nuit (agent dans sa copie, 4 commits, fusion 909faad) : un double toucher ne dépense plus qu’une fois (« Construire » qui bâtissait la ligne sous le doigt, ligne de quartier qui achetait un niveau, « Accueillir une famille » qui accueillait deux familles) ; chaque ligne de quartier du catalogue dit « Disponible » ou ce qui manque ; la fiche montre le niveau acheté ; « Voir les quêtes » montre exactement les quêtes comptées et y porte le focus clavier ; « Pourquoi? » et les deux-points de `index.html` (le test de typographie couvre maintenant ce fichier) ; message hors ligne sans redite. Nouveau scénario `ui-32` (double toucher).*
- *Vérifié par moi sur le commit envoyé (7afb898 : correctifs fusionnés et cache v8) : 364 tests `node --test` sur 364 ; série complète 29 scénarios sur 29, 1 910 vérifications, « TOUT REUSSI » (de 4 h 08 à 4 h 26). `world-s3` et `world-perf` ont été relancés sur la fusion des permis (c232ca3), pas après les correctifs, qui ne touchent pas `world/`.*
- *Laissés pour plus tard, au topo : plaque de l’Atelier sous le rabat replié à 360×640 (la hauteur du rabat est une décision de design) ; un jour travaillé perdu quand un second appareil rejoue une quête hors ligne plusieurs jours après ; le script de preuve de la conversion ne sait pas prouver une partie v1 (lot 8) ; la lettre de passage v1 parle de quêtes « comptées » ; panneau caché qui revient seul hors ligne ; commandes de la carte tabulables sous le panneau ouvert ; bulle de Fanal sur « Construire » à 360×640 ; plaques qui se chevauchent rangée « Vue » dépliée ; ordre des ressources différent entre prix et manque ; bandeau tronqué en paysage ; clés de texte mortes. Carte « Grand chantier » : aucun scénario ne touche son « Fait ».*

### R5 — Documents
- [x] Bible (§3, §4, §6, §7, §9, §12, §13, §15) et `PRODUCT.md` dès R2 (ils ne sont pas envoyés) ; puis `app/ARCHITECTURE.md` (dont les dettes des lots 3, 5 et 6, et la vraie raison de la version 3 : un ancien onglet n'appelle pas le compte des permis), `CLAUDE.md`, `app/content/README.md`, `app/DESIGN.md`.
- *Fait : bible et `PRODUCT.md` (30db522) ; `app/ARCHITECTURE.md` et `app/content/README.md` en deux passes (cd39c14 pour R1, gains et R2b ; ad80b26 pour les permis et la version 3) ; `app/DESIGN.md` (R2b, R3, ad80b26) ; annexe « Écarts de la mise en œuvre » à la fin de `docs/conception-niveaux-quartiers.md` (ad80b26) ; `CLAUDE.md` (07f5751) ; bible:61 (33543bf). Relu par moi : diffs d’`ARCHITECTURE.md` (première passe) et de l’annexe, en entier. Restent faux, relevés par les agents : la section « semaine 3 » d’`app/ARCHITECTURE.md` (modules de la v1), quelques lignes d’`app/DESIGN.md` (Confiance, Lueur, `quest-row-doing`) et `app/design/reference.html` (« Je m’y mets »), pour le lot 8.*

### R6 — Essai
- [x] Cache v8, commit. Photo de `api/data` de l'essai dans `backups/avant-lot-r-<date>/`.
- [x] Preuve hors ligne de la conversion : la photo passée dans `migrateState` du code envoyé, avec l'horloge de l'essai (somme des anciens niveaux = permis ; stock, quartiers et bilans inchangés ; second passage sans effet).
- [x] Après l'envoi : liste des tâches et registre identiques à la photo ; page chargée sans code, 0 erreur ; écriture en version 2 refusée ; lecture avec le code d'essai = 200. **Ne jamais ouvrir l'essai avec le code** (ça écrirait et convertirait la partie avant Alex). Fichiers restés sur le serveur et absents du dépôt : listés, rien d'effacé. La production n'est pas touchée.
- [x] Topo pour Alex (6 octobre, vers 4 h 30).
- *Envoyé sur l’essai le 6 octobre à 4 h 27 (commit c1b38f1, dont l’app est celle de 7afb898, cache v8). La production n’est pas touchée.*
- *Photo prise à 4 h 08 dans `backups/avant-lot-r-20261006-040858/`. Depuis la copie de 1 h 36, la partie avait reçu une seule ligne : le bonus d’ouverture du jour de jeu suivant, posé à 4 h 00, heure où la journée de jeu change. Hypothèse, non vérifiée : un onglet de l’essai resté ouvert avec le code.*
- *Preuve hors ligne sur cette photo, avec le cœur envoyé : 4 anciens niveaux (Champs, Atelier, École, Place) deviennent 4 permis ; ressources, quartiers et bilans inchangés ; un second passage ne change rien.*
- *Contrôles après l’envoi, 17 sur 17 : dix fichiers envoyés identiques au commit ; partie, registre et liste identiques à la photo ; réglage d’essai actif (réponse `sandbox: true`) ; lecture avec le code = 200 ; écriture en version 2 refusée (409, « L’app a été mise à jour : recharge la page. »). Page chargée dans un navigateur neuf, sans code : coquille v8, demande du code, seules erreurs les deux refus 401 attendus de l’API sans code, aucune écriture tentée. La partie n’est pas encore convertie : elle le sera à la première ouverture avec le code.*
- *Restés sur le serveur, absents du dépôt, rien d’effacé : `content/fr-CA/chapitres.json`, `core/avis.js`, `core/build.js`, `core/chapters.js`, `core/cote-a-cote.js`, `js/ui/carnet.js`, `js/ui/game.js`.*

### Après le lot R (noté pour plus tard)
- Niveaux 4 et suivants : à prévoir avant que les 17 niveaux soient achetés, soit environ 19 à 22 semaines au rythme régulier (calcul de la relecture).
- Reportés : niveau 3 du Garage (tournée d'hiver), signal « niveau possible » sur les plaques, fichiers retirés à effacer à la main sur l'essai et en production (lot 8), essai et production qui partagent probablement la même origine dans le navigateur (risque connu, non traité).

## Retours d'essai d'Alex — 6 octobre 2026, matin (à trancher)

Alex a joué sur l'essai après l'envoi du lot R, jusqu'au jour de jeu 42 (décalage de 40 jours). « Jeu splendissime ! Ça va dans le bon sens. » Chiffres mesurés sur une copie en lecture seule de la partie d'essai (6 octobre, 7 h 51), puis recalculés par un vérificateur indépendant.

**Ce que la partie montre** (depuis la conversion, jours de jeu du 23 octobre au 15 novembre)
- 25 quêtes payées : 17 jours à une quête, 4 jours à deux, 3 jours sans.
- 21 de ces 25 quêtes gardent les valeurs par défaut du formulaire (priorité 5, longueur 2, difficulté 3 ; `js/ui/sheets.js:14`) : 7 points, soit 3,5 Matériaux chacune.
- En main : 11 permis, 205,1 Énergie, 70,9 Matériaux, 12 Nourriture, 4 habitants. Aucun niveau acheté. Le niveau 1 coûte 1 permis, 75 Énergie et 100 Matériaux.
- Gagné : 122 Matériaux (112 par les quêtes, 10 par l'objectif de saison) et 154,2 Énergie, dont 87 hors quêtes (ouverture, ajout, bon fil, éolienne, objectif de saison). Les Matériaux n'ont aucune source régulière hors des quêtes.
- Dépensé : 85 Matériaux pour le quai, l'éolienne et le grenier (33,9 + 122 − 85 = 70,9, le compte tombe juste).
- Le plafond du jour n'a jamais mordu : au plus 37 points dans une journée (le plafond commence à 45).

| # | Retour d'Alex | Constat | Proposition |
|---|---|---|---|
| 1 | Les Matériaux sont plus durs à obtenir que l'Énergie ; jamais pu monter un quartier, même au jour 40 | Voir ci-dessus : l'Énergie s'accumule sans usage, les Matériaux manquent | Inverser le prix des niveaux (n × 100 Énergie, n × 75 Matériaux) ; plus tard, un marchand au quai qui échange Énergie contre Matériaux. Garder les permis tels quels |
| 2 | Le chiffre sur « Construire » fait croire à un nombre de constructions possibles | La pastille ne montre qu'un chiffre ; le mot « permis » n'est lu que par les lecteurs d'écran (`world/world.js:216-229`). Un permis ne sert qu'aux niveaux de quartier | Un compteur « Permis » dans la barre des ressources, à la place de la pastille (à valider à 360 px avec /impeccable) |
| 3 | La serre produit peu en hiver ; une deuxième serre ? | 4 Nourriture tous les 5 jours travaillés ; l'hiver, 5 Énergie par semis ; une famille coûte 18 Nourriture ; une seule serre permise (`core/batiments.js:29,43-46`) ; l'Atelier niveau 1 passe la récolte à 5 | Permettre une deuxième serre au Hameau : plus de Nourriture l'hiver, et un usage pour l'Énergie qui dort |
| 4 | Hâte que le quai amène des visiteurs : marchands (échange Énergie contre Matériaux ou Nourriture), dons, taxes | Le quai ne fait encore rien ; sa fiche le dit. Visiteurs, commandes et imprévus sont prévus aux semaines 3 et 4 (bible §7, §8, §14). Le Marché (rang Bourg) échange sans visiteur. Aucune taxe dans la bible : laisser passer une commande ne fait rien perdre, les mauvais imprévus se réparent | Ajouter le marchand au catalogue des visiteurs. Taxe : à trancher |
| 5 | Aucun imprévu en 40 jours : normal ? Côté Hermes ? | Normal : pas encore construits. C'est l'app qui les tire de son catalogue (semaines 3 et 4) ; Hermes ne fera qu'enrichir, aux semaines 7 et 8 (bible §11, §12) | Inchangé |
| 6 | Réglages : définir la quête par défaut | Réglages ne contient que le prénom ; valeurs par défaut fixes dans `sheets.js:14`. Hermes évalue ses quêtes lui-même (`TASKS_WORKFLOW.md`) : il n'est pas touché | « Quête par défaut » (priorité, longueur, difficulté) dans Réglages |

**Réponses d'Alex (6 octobre, matin)** : d'accord avec les onze recommandations.
1. Prix des niveaux inversé : n × 100 Énergie, n × 75 Matériaux ; les permis ne changent pas.
2. « Quête par défaut » dans Réglages, la même sur tous les appareils (gardée avec la partie).
3. Compteur « Permis » dans la barre des ressources ; plus de pastille sur « Construire » ; les icônes seules restent.
4. Deuxième serre, débloquée au rang Hameau.
5. Quatre ou cinq répliques de plus pour « permis gagné » et « nouveau rang ».
6. Fiche de quartier sur tablette : le bouton ne doit plus descendre après un achat.
7. Le marchand (échange Énergie contre Matériaux ou Nourriture, et l'inverse) devient le premier visiteur, aux semaines 3 et 4.
8. Pas de taxe pour l'instant.
9. Plafond du jour inchangé.
10. Rabat à 360×640 accepté.
11. Ordre : lot R2 ci-dessous, essai, puis lot 8 (bascule), puis visiteurs et imprévus.

Idée nouvelle d'Alex : un bonus quand la semaine présentée au bilan est complète (« 7 jours actifs donnent X ressources »). Ma recommandation, en attente de son accord : « Semaine tenue » à 5 jours travaillés sur 7, payée en Matériaux, sans compteur de jours consécutifs (revue d'octobre, `docs/revue-2026-10/RECOMMANDATION.md:37` : « compteur cumulatif, jamais de série »). Sur les 5 semaines finies de l'essai (6, 7, 7, 5 et 6 jours travaillés), une règle à 7 sur 7 aurait payé 2 semaines, une règle à 5 sur 7 les 5.

## Lot R2 — Équilibrage, réglages, semaine tenue (avant le lot 8)

À faire valider par Alex avant de commencer. Rien en production : tout part sur l'essai.

### R2a — Économie (logique seule)
- [ ] Prix des niveaux inversé dans `core/quartiers.js` (`coutNiveau`) ; tests de `quartiers.test.mjs` mis à jour.
- [ ] Deuxième serre : `max: 2` pour la serre, la seconde au rang Hameau (règle par exemplaire, raison écrite « Il faut d'abord le rang Hameau ») ; semis, récolte, chauffage et effet de l'Atelier valables pour `serre-2` ; un emplacement de plus sur l'île (`world/layout.js`, le test de correspondance des emplacements suit).
- [ ] Semaine tenue (si Alex est d'accord) : au 5e jour travaillé d'une semaine (lundi au dimanche), une entrée au registre `semaine:{lundi}` (unique, rejouable sans doublon), payée en Matériaux ; le bilan de la semaine l'affiche. Montant réglé par la simulation.
- [ ] `tests/core/simulation.test.mjs` relancée et recalée : premier niveau acheté, permis en main, usage de l'Énergie, au rythme d'Alex (1 à 2 quêtes par jour) et au rythme régulier. Chiffres refaits par moi avant d'être donnés à Alex.

### R2b — Interface
- [ ] Réglages : section « Quête par défaut » (priorité, longueur, difficulté), gardée dans la partie (`game.reglages`, par `game.set`) ; le formulaire d'ajout la lit à la place de `DEFAULTS` (`js/ui/sheets.js:14`). Hermes n'est pas touché.
- [ ] Compteur « Permis » dans la barre des ressources (/impeccable, tenue vérifiée à 360 px) ; pastille retirée de « Construire », nom du bouton remis à « Construire ».
- [ ] Fiche de quartier : le bouton d'achat reste à sa place après un achat (tablette).
- [ ] Répliques de Fanal : quatre ou cinq variantes pour « permis gagné » et « nouveau rang » (`content/fr-CA/repliques.json`, typographie de `app/content/README.md`).
- [ ] Scénarios navigateur : réglage de la quête par défaut (deux appareils voient la même), compteur des permis, deuxième serre, semaine tenue ; scénarios existants qui lisent la pastille mis à jour.

### R2c — Vérification, documents, essai
- [ ] `node --test`, série complète aux trois largeurs (machine au calme), `world-s3` et `world-perf` (l'île change) ; relecture indépendante.
- [ ] Documents : bible (§4 prix, §5 serre, §7 marchand, §15 décisions du 6 octobre), `PRODUCT.md` (semaine tenue = bonus plafonné), `docs/conception-niveaux-quartiers.md` (annexe des écarts), `app/ARCHITECTURE.md`, `app/content/README.md`, `app/DESIGN.md`.
- [ ] Essai : cache v9, photo de `api/data`, envoi, contrôles en lecture seule. La partie d'essai n'a pas besoin de conversion (`game.reglages` absent = valeurs actuelles).
- [ ] Topo pour Alex, avec les statuts Vérifié / Lu / Rapporté.

Non inclus (défauts connus du topo du lot R, laissés pour plus tard) : panneau caché qui revient hors ligne, bulle de Fanal sur « Construire » à 360×640, plaques qui se chevauchent rangée « Vue » dépliée, boutons de la carte tabulables sous le panneau, jour travaillé perdu par un second appareil hors ligne.
