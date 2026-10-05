# Plan — « La lisière rallumée », première tranche jouable

Référence : `docs/revue-2026-10/RECOMMANDATION.md` (sections 3 à 8). Statut : **validé par Alex le 5 octobre 2026**.

## Décisions prises le 5 octobre 2026

- Monde : la colonie de l'Orée.
- Domaines regroupés : Jardin et Ferme → Terrain ; Professionnel → Administratif.
- Avis de saison actifs, sans perte définitive.
- Calendrier réel : heure de Montréal, journée de 4 h à 3 h 59, neige le 15 novembre, trêve du 21 décembre au 4 janvier.
- Progression du jeu sauvegardée sur le serveur, pas dans le navigateur.
- Site laissé ouvert pour l'instant. La protection se décide avant la mise en ligne de la nouvelle app.
- À trancher en semaine 3 : côte à côte avec Fanal (écran allumé ou simple relevé du temps), rappel quotidien.

## Principes

- La nouvelle app vit dans `app/`. L'app actuelle (`index.html`) reste en production jusqu'à la bascule.
- 006 et les prototypes de 007 servent de référence ; on ne les modifie pas.
- Aucune donnée réelle dans le dépôt. Les essais sur les vraies tâches se font sur une copie hors dépôt.
- Toute la logique de jeu est testée par `node --test`, et l'API en local avec `php -S`.
- Tout élément visible passe par /impeccable.
- Un commit par étape qui tient debout.

## Étape 0 — Préparer

- [ ] Ouvrir la demande de fusion de `ccr-06402b21-chsulu` vers `main` ; Alex la relit et la fusionne. Le travail continue sur une branche partie de `main`.
- [ ] Lire, sans rien modifier, la configuration du serveur par SSH : `tasks-api.php`, emplacement de `tasks.json`, sauvegardes existantes, version de PHP, façon dont Hermes écrit.
- [ ] Poser les fondations visuelles de `app/` avec /impeccable, en partant de la palette de 006.
- [x] Inscrire les décisions ci-dessus dans `RECOMMANDATION.md` (section 10) et `SUITE.md`.

## Semaine 1 — L'utile, sans le monde

- [ ] `app/core/`, testé :
  - migration sans perte de champ (échéance, notes, statut archivé conservés) ;
  - Cote, Points d'effort, plafonds quotidiens ;
  - registre des gains en ajout seul : terminer, rouvrir puis terminer de nouveau rapporte 0 ;
  - temps réel (journée de Montréal) ;
  - domaines regroupés → secteurs.
- [ ] `api.php` :
  - chaque opération porte un identifiant, la rejouer ne double rien ;
  - verrou de fichier, numéro de révision, écriture atomique, 14 sauvegardes ;
  - `tasks.json` reste la référence ; `game-state.json` et `ledger.jsonl` à côté.
- [ ] Registre des quêtes au moins aussi complet que l'app actuelle : tris, filtres, recherche, création, modification, suppression, notes, étapes, récurrence, archiver, remballer.
- [ ] Ajout rapide avec domaine deviné, Fil du jour, « Pourquoi ? ».
- [ ] Jalon : utilisable au quotidien sur une copie locale des vraies tâches.

## Semaine 2 — Le monde

- [ ] Île de 12×12 en DOM/SVG, reprise du prototype `dom-svg`, mise à jour élément par élément (plus de régénération complète).
- [ ] Place, Champs et Atelier ouverts, deux secteurs sous la cendre, Fil libre.
- [ ] Fanal et deux personnages ; animations 1 à 5, 11 et 12, avec leur version en mouvement réduit.
- [ ] Essai sur le vrai téléphone d'Alex : on garde le SVG, ou on passe à PixiJS si l'animation tombe sous 45 images par seconde.

## Semaine 3 — Le jeu

- [ ] Introduction, chapitre 1, chapitre 2 jusqu'au premier Avis (Premier gel).
- [ ] Potager, lettre du matin, côte à côte (selon la décision d'Alex).
- [ ] Jour du recyclage, première version ; installation sur l'écran d'accueil du téléphone.

## Mise en ligne

- [ ] Choisir la protection : connexion par code ou mot de passe du serveur.
- [ ] Décider comment Hermes écrit : par la nouvelle API, ou par SSH avec le même verrou.
- [ ] Sauvegarder ce qui est en ligne, déployer dans un sous-dossier, tester sur téléphone, puis basculer l'accueil.

## Critères de réussite

- Tous les tests `node --test` passent, dont : rouvrir puis terminer rapporte 0, le chapitre 1 ne finit pas avant le jour 3, aucune case perdue.
- Aucun champ perdu sur la copie des vraies tâches.
- Quête n° 1 lisible en moins de 2 s ; ajout en 3 gestes au plus ; terminer en 2 touchers.
- Une tâche ajoutée par Hermes apparaît en 30 s au plus.
