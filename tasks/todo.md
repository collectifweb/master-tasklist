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
- [ ] Jalon : utilisable au quotidien sur une copie locale des vraies tâches. *Vérifié sur un fichier fictif de même forme (scénario `ui-13`, aucun champ perdu). L'essai sur la vraie copie attend l'accord d'Alex.*

## Semaine 2 — Le monde

- [x] Île de 12×12 en DOM/SVG, reprise du prototype `dom-svg`, mise à jour élément par élément (plus de régénération complète).
- [x] Place, Champs et Atelier ouverts, deux secteurs sous la cendre, Fil libre.
- [x] Fanal et deux personnages ; animations 1 à 5, 11 et 12, avec leur version en mouvement réduit.
- [x] Brancher le monde dans l'app : fil de lumière parti du bouton touché, compteurs à l'impact, secteur touché = filtre, plan accessible, écran « L'Orée veille » ; 14 scénarios Playwright aux 3 largeurs.
- [ ] Essai sur le vrai téléphone d'Alex : on garde le SVG, ou on passe à PixiJS si l'animation tombe sous 45 images par seconde.

## Semaine 3 — Le jeu

- [x] Introduction, chapitre 1, chapitre 2 jusqu'au premier Avis (Premier gel). Chapitres pilotés par `chapitres.json`, Avis annoncé 7 jours d'avance avec sa jauge, résultat tenu, voilé ou absent sans perte (scénarios 16, 17, 18).
- [x] Potager (semer, récolter au glissé ou au bouton, garde-manger, partager, réserve) et lettre du matin (scénarios 15, 19).
- [ ] Côte à côte : simple relevé du temps passé, sans garder l'écran allumé (décidé le 5 octobre).
- [x] Jour du recyclage, première version ; installation sur l'écran d'accueil du téléphone, lancement hors ligne (scénarios 20, 21).

## Mise en ligne

- [x] Choisir la protection : connexion par code d'accès (Alex, 5 octobre). Prête et vérifiée sur la version d'essai.
- [x] Décider comment Hermes écrit : par SSH, avec le même verrou que l'API (Alex, 5 octobre).
- [x] Correctif du script de synchro d'Hermes : verrou partagé et empreinte du contenu envoyé. Banc d'essai sans serveur : 11 sur 11 avec le script corrigé, 5 échecs avec l'ancien.
- [ ] Installer le script corrigé sur la machine d'Hermes (Alex).
- [x] Essai sur une copie des vraies tâches, faite sur le serveur dans un second dossier d'essai protégé par un code. L'API relit chaque tâche à l'identique, aucun champ perdu ; vérifié sur le serveur, sans rapatrier de données.
- [ ] Alex utilise cette copie sur son téléphone : jalon « utilisable au quotidien ».
- [x] Sauvegarder ce qui est en ligne : copie datée de la liste, de la page, de l'ancienne API et du `.htaccess` dans un dossier du site interdit au web (5 octobre 2026).
- [x] Version d'essai dans un sous-dossier, avec une liste fictive et un code d'accès. Parcours réel vérifié en HTTPS : code demandé, quête enregistrée sur le serveur, relance hors ligne, dossier de données interdit au web.
- [ ] Tester sur le téléphone d'Alex, puis déployer avec les vraies tâches et basculer l'accueil.

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
