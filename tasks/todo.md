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

Référence : `docs/BIBLE-JEU.md` (v2 validée le 5 octobre 2026), §14, ligne « 1 et 2 ». **Statut : validé par Alex le 5 octobre 2026** (réponses aux questions 1 et 2 ; la 3 est en discussion). Plan préparé par un agent qui a lu le code, puis relu et simplifié.

**Règles du plan**
- La production reste en v1 jusqu'au dernier lot. L'état actuel reçoit l'étiquette Git `v1` (le dossier `app/` n'a pas changé depuis le dernier déploiement, 3ccd92f). La v2 se construit sur une branche neuve, `feat/village-v2`.
- Les scripts de déploiement (hors dépôt, dans `.claude/outils/`, ignoré par Git) prennent la version à envoyer : production = `v1`, essai = tête de la branche v2.
- Chaque règle nouvelle a son test, écrit d'abord et vu en échec. `tasks.json` n'est jamais écrit par la migration ni par les premiers pas : un test le vérifie.
- Tout élément visible nouveau passe par /impeccable, avant de le coder puis sur captures aux trois largeurs (marqué [impeccable]).
- On garde : côte à côte et relevé du temps, recyclage, lettre du matin (textes réécrits), bilan, hors ligne, blocage des mauvais codes.

### Lot 1 — Le cœur v2 (logique seule, vérifiée par `node --test`)
Pour le joueur : rien de visible, rien n'est déployé.
- [ ] Six quartiers : Champs, Atelier, Mairie, École, Garage, Place du village. Les anciens secteurs y sont reliés.
- [ ] Partie en version 2 : Énergie, Matériaux, Nourriture, Habitants, tâches par quartier, bâtiments, parcelles, premiers pas, bilans. Départ : 10 Énergie, 20 Matériaux, 5 Nourriture.
- [ ] Gains : mêmes formules par tâche ; le registre note le quartier au lieu de la Lueur et du Fil libre.
- [ ] Rang selon les habitants, niveaux de quartier (5, 15, 30, 60, 100 tâches), avec « encore N » pour l'affichage.
- [ ] Migration de la partie : Énergie et Matériaux repartent du stock de départ ; quartiers et bilans recomptés depuis le registre ; relevé du temps gardé.
- [ ] Retrait de Lueur, Fil libre, Souffler, Confiance, Avis et chapitres. Le passage du temps quitte le module des Avis.
- [ ] Tests : environ 80 des 241 tests du cœur changent (estimation de l'agent) ; nouveaux tests du village et de la migration (recompte, une seule fois, aucune tâche touchée).

### Lot 2 — L'interface au nouveau vocabulaire
Pour le joueur : la barre montre Énergie, Matériaux, Nourriture, Habitants ; les quartiers portent leurs nouveaux noms ; « jeton d'accès » devient « code d'accès », « Plan accessible » devient « Carte en liste », « L'Orée veille » devient « Tout est enregistré, à demain », « Finir la visite » disparaît.
- [ ] Interface, île et textes nettoyés de la v1 (braseros, voiles, cendre, chapitres). Le front de givre reste en sommeil pour les alertes météo des semaines 3-4.
- [ ] [impeccable] icônes Nourriture, Habitants et des six quartiers, aide des ressources.
- [ ] Scénarios navigateur : 11 sur 23 à adapter, 1 à supprimer, 3 mis de côté jusqu'aux lots 4 et 5 (relevé de l'agent).

### Lot 3 — Migration sûre
Pour le joueur : à la première ouverture, sa partie passe en v2 sans rien perdre, avec une lettre de Fanal qui explique ce qui change.
- [ ] Chaque envoi de la v2 porte sa version. Le serveur refuse l'ancienne app avec « L'app a été mise à jour : recharge la page. » (sinon un onglet v1 resté ouvert réécrirait la partie v2 avec ses valeurs v1).
- [ ] Au passage en v2, le serveur garde une copie de la partie v1, jamais effacée. Registre et opérations jamais réécrits ; une quête payée en v1 ne repaie pas.
- [ ] File d'attente hors ligne convertie une fois : les gestes sur les quêtes sont recalculés, les gestes de jeu v1 écartés avec un message ; code d'accès et prénom gardés.
- [ ] Tests : refus de l'ancienne app, copie v1 unique, `tasks.json` identique à l'octet ; scénario de migration complet.
- [ ] Premier déploiement sur l'essai : sa partie v1 sert de répétition.

### Lot 4 — Bâtiments, habitants, fiches à trois lignes
Pour le joueur : il rebâtit des chalets, sème, récolte, accueille des familles et voit son rang monter. Chaque bâtiment dit ce qu'il est, ce qu'il fait, ce qu'on peut faire maintenant, ou ce qui manque (« Il faut d'abord un quai. »).
- [ ] Bâtiments du campement et du hameau : coûts, rang, prérequis, emplacements sur l'île.
- [ ] Potager de mai à octobre (au 1er novembre, ce qui est en terre mûrit d'un coup) ; serre toute l'année ; Nourriture plafonnée par le stockage.
- [ ] Accueillir une famille : un logement libre et de la Nourriture dépensée donnent un habitant. Personne ne part.
- [ ] Éolienne : Énergie en plus le premier jour travaillé, inscrite au registre.
- [ ] [impeccable] chalet, serre, éolienne, grenier, quai ; fiche à trois lignes et état verrouillé.
- [ ] Tests écrits d'abord : chaque refus avec sa raison ; simulation sur 21 jours et sur un hiver complet (aucune impasse, voir question 3).

### Lot 5 — Premiers pas, bandeau d'objectifs, accueil
Pour le joueur : trois écrans d'accueil, cinq premiers pas guidés, et un bandeau toujours visible : aujourd'hui, cette semaine, cette saison, prochain rang.
- [ ] Les cinq quêtes d'initiation (bible §11), atteintes une seule fois, jamais écrites dans `tasks.json`.
- [ ] Saison du vrai calendrier ; objectif d'automne « Remplir le grenier », sans perte s'il est manqué.
- [ ] Bandeau d'objectifs (remplace le carnet) ; « cette semaine » affiche les premiers pas en attendant les visiteurs.
- [ ] [impeccable] bandeau aux trois largeurs, écrans d'accueil.
- [ ] Tests écrits d'abord ; scénarios de l'accueil et des premiers pas réécrits ; nouveau scénario « bandeau ».

### Lot 6 — Bilans passés et « Jour suivant »
Pour le joueur : le bilan garde l'historique des semaines. Dans la version d'essai seulement, un bouton fait passer au jour suivant.
- [ ] Le bilan de chaque semaine finie est figé et gardé (deux ans au plus). La migration recompte les semaines passées.
- [ ] Réglage « bac à sable » écrit par le seul script de l'essai dans sa configuration serveur. La production refuse une partie qui porte un décalage de date.
- [ ] Toutes les lectures de la date du jeu passent par une seule horloge : date réelle, plus le décalage en version d'essai.
- [ ] [impeccable] historique dans la feuille du bilan ; bouton « Jour suivant ».
- [ ] Tests : bouton absent par défaut, présent en essai ; la date avance d'un jour et les cultures poussent ; décalage refusé en production.

### Lot 7 — Rappel du matin (ntfy)
Pour le joueur : chaque jour à 8 h, une notification au texte général ; la toucher ouvre l'Orée.
- [ ] Petit script PHP lancé par une tâche planifiée de l'hébergement à 8 h (le serveur est à l'heure de Toronto, la même que Montréal : vérifié le 5 octobre). Refusé s'il est appelé depuis le web. Un envoi par jour au plus.
- [ ] Nom du canal et adresse de l'app dans la configuration serveur, jamais dans le dépôt. Textes sans titre ni nombre de tâches.
- [ ] Tests avec un faux serveur ntfy : un seul envoi, aucun titre de tâche, refus depuis le web.
- [ ] Alex : installer ntfy (F-Droid) et s'abonner au canal ; tâche planifiée (question 2).

### Lot 8 — Documentation, essai complet, bascule
- [ ] Service worker : nouvelle version, liste des fichiers à jour.
- [ ] Docs : `app/ARCHITECTURE.md`, `PRODUCT.md`, `CLAUDE.md`, `app/content/README.md`, `TASKS_WORKFLOW.md` (rien ne doit changer pour Hermes : à vérifier).
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
3. Impasse d'hiver : la v2 arrive vers la fin octobre. Au campement, la seule Nourriture vient du potager, qui dort de novembre à avril, et la serre n'arrive qu'au hameau, qui demande 3 habitants nourris. Sans changement, le village reste bloqué tout l'hiver, et le premier pas « Semer » est impossible. Recommandation : une petite serre dès le campement ; l'objectif d'hiver « garder la serre allumée » devient jouable dès le premier hiver.
