# Revue d’Orée vivante — octobre 2026

Revue complète du prototype 006 et exploration des directions possibles pour transformer Quêtes du foyer en vrai jeu. Toutes les analyses ont été faites en lecture seule sur le prototype, avec des données fictives.

| Document | Contenu |
|---|---|
| [SUITE.md](SUITE.md) | Point de reprise : ce qui est fait, ce qui reste à faire, décisions ouvertes, prochaines étapes. |
| [RECOMMANDATION.md](RECOMMANDATION.md) | Direction recommandée « La lisière rallumée » : boucles, modèle tâche → jeu (Cote et Points d’effort), économie simulée, narration, rendu, tranche jouable de 3 semaines, feuille de route, décisions ouvertes. |
| [AUDIT-SYSTEMES.md](AUDIT-SYSTEMES.md) | Fonctionnement de 006 et de l’app historique, économie chiffrée, bugs et exploits, écarts avec PRODUCT.md, architecture cible. |
| [PLAYTEST.md](PLAYTEST.md) | Partie jouée de bout en bout sur mobile, tablette et bureau : première impression, visuel, game feel, frictions. |
| [GLITCHES.md](GLITCHES.md) | 89 glitches visuels et d’interaction, chacun reproduit par un vérificateur indépendant, avec cause probable et piste de correctif. |
| [MOTION.md](MOTION.md) | Inventaire des animations, système de mouvement (durées, courbes, mouvement réduit, budget mobile) et 28 animations à ajouter. |
| [REVUE-NARRATIVE.md](REVUE-NARRATIVE.md) | Incohérences de texte, diagnostic narratif, bible du monde, arc en 8 chapitres, règles d’écriture. |
| [RECHERCHE-JEUX.md](RECHERCHE-JEUX.md) | Applis de productivité ludiques, jeux de ferme et de colonie, narration quotidienne, psychologie comportementale, 20 mécaniques transférables. |
| [DIRECTIONS.md](DIRECTIONS.md) | Les cinq directions conçues indépendamment (Restauration, Village, Compagnon, Bastion des saisons, Foyer miroir) et l’avis détaillé des trois jurés. |
| [SPIKES.md](SPIKES.md) | Trois rendus de la même scène (DOM/SVG, PixiJS, three.js) avec mesures. Démos dans `sketches/007-spikes-rendu/`. |

Les simulations d’économie sont dans `simulations/` (`node` ou `python3`). Les captures de `img/` montrent le prototype 006 et les trois spikes, uniquement avec des données fictives.

Le prototype 006, les démos des spikes (`sketches/007-spikes-rendu/`) et l’app historique ont été retirés du dépôt le 9 octobre 2026. Ils restent dans l’étiquette `v2.10.1` (`git checkout v2.10.1`), d’où se lance aussi `simulations/village-calibrage.mjs`, qui lit les tâches de 006.
