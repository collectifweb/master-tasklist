# Suite des travaux — passation au 5 octobre 2026

Point de reprise après la session cloud du 5 octobre 2026. À lire avec `CLAUDE.md` et `README.md` de ce dossier.

## Ce qui a été fait

- **`CLAUDE.md`** créé à la racine.
- **Revue complète du prototype 006** dans ce dossier : jeu en conditions réelles, audit des systèmes, 89 glitches vérifiés, audit des animations, revue narrative, recherche sur les jeux comparables.
- **Cinq directions de jeu** conçues indépendamment et notées par trois jurés, puis une recommandation : « La lisière rallumée », élaguée et enrichie des meilleures idées des autres.
- **Trois prototypes de rendu** de la même scène, dans `sketches/007-spikes-rendu/`. Le rendu recommandé est DOM/SVG ; PixiJS est le plan B.
- **Simulations d'économie** dans `simulations/`, exécutables avec `node` ou `python3`.
- **Confidentialité** :
  - L'historique Git complet a été réécrit : `tasks.json`, `PUBLIC_URL.txt`, les captures privées, les titres réels, les prénoms, les fournisseurs et les détails d'hébergement ont été retirés ou remplacés.
  - Les scripts de synchronisation lisent maintenant leur configuration dans `~/.config/oree/sync.env`, hors du dépôt.
  - `tasks-server.py` exige un jeton pour écrire.

## Ce qui reste à faire par Alex

1. **Pousser l'historique réécrit** des branches autres que `ccr-06402b21-chsulu`, depuis le bundle fourni, puis réactiver la règle « Protection rule ».
2. **Donner à Hermes ses nouvelles règles** : ne plus utiliser les anciens clones, garder les données hors de Git, installer un hook pre-commit, ne jamais pousser sur `main`.
3. **Protéger le site de production** par mot de passe ou jeton : il sert les vraies tâches.
4. **Modifier le texte de la release « Prototype v1 »**, qui cite l'URL de production.
5. **Option :** demander à GitHub Support de purger les références des pull requests et le réseau du fork.
6. **Fusionner `ccr-06402b21-chsulu` dans `main`** par une pull request, après relecture.

## Décisions ouvertes (voir RECOMMANDATION.md, section 10)

> **Mise à jour du 5 octobre 2026.** Les points 1, 2, 4 et 6 sont tranchés (réponses dans RECOMMANDATION.md, section 10) ; 3 et 5 attendent la semaine 3. L'historique réécrit est poussé, la règle de protection réactivée. Le travail suit maintenant `tasks/todo.md`, sur la branche `feat/lisiere-rallumee`.

1. La colonie de l'Orée (recommandée) ou une maquette de la vraie maison ?
2. Avis de saison actifs par défaut, ou un mode « saison douce » ?
3. Mode côte à côte avec Fanal : écran allumé, ou simple relevé du temps passé ?
4. Regrouper les domaines (Jardin et Ferme dans Terrain, Professionnel avec Administratif) ?
5. Un rappel quotidien facultatif, et à quelle heure ?
6. Calendrier réel : première neige le 15 novembre, trêve des Fêtes ?

## Prochaines étapes proposées, dans l'ordre

1. **Correctifs express sur 006** (environ 1 h, utiles quelle que soit la direction) :
   - score visible ;
   - icône noire du bouton de réinitialisation ;
   - accent de « Énergie » ;
   - boutons désactivés lisibles ;
   - toasts en haut ;
   - réactivation sans gain ;
   - « Jour +1 » en mode démo ;
   - migration qui conserve tous les champs.

   Détails dans `GLITCHES.md` et `AUDIT-SYSTEMES.md`.
2. **Logique pure testable** (`core/`, testée avec `node --test`) :
   - migration sans perte ;
   - Cote ;
   - Points d'effort ;
   - registre des gains en ajout seul ;
   - jour calendaire réel.
3. **Endpoint PHP d'opérations** avec verrou, révisions et sauvegardes. Le vrai `tasks.json` devient la référence partagée par l'app et Hermes.
4. **Registre des quêtes au niveau de l'app historique** : tris, filtres, notes, échéances, étapes, récurrences.
5. **Monde en DOM/SVG**, en partant de `sketches/007-spikes-rendu/dom-svg/`, avec un rendu par identifiant pour permettre les animations.
6. **Tranche jouable de 3 semaines**, décrite dans RECOMMANDATION.md, section 8.

## Pièges connus

- **Ne jamais copier de données réelles** dans le dépôt, même pour une capture ou un test.
- **Les anciens clones portent l'ancien historique.** Il faut repartir d'un clone neuf.
- **`sketches/006` stocke son état dans `localStorage`** sous la clé `oree-vivante-sandbox-v4`. Changer la forme de l'état impose une migration.
- **Les prototypes de rendu sont jetables.** Les reprendre comme base de code demande de les restructurer (modules `core/`, `world/`, `content/`).
