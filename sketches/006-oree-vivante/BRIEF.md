# Prototype 006 — Orée vivante

## Direction contract

THESIS: la ferme est le jeu et la carte est l’accueil. Les tâches réelles alimentent une colonie visible, manipulable et racontée. La précision de Vecteur subsiste dans les contrôles, mais l’univers devient chaleureux, blocky et agro-futuriste.

OWN-WORLD: terre ocre, végétation sauge, bois blond, pierre chaude, verre solaire turquoise, métal patiné crème et lumière de matin. L’orange braise est réservé aux menaces. Les technologies semblent réparées, cultivées et intégrées au paysage. Aucun fond charbon dominant, faux terminal ou cyan néon omniprésent.

STORY: après les tempêtes de cendre, la Colonie Orée est isolée. Alex en devient l’intendant. La ferme assure l’autonomie; le Bastion protège les terres et cache une archive ancienne; la Réputation est la confiance des habitants et ouvre personnages, permis, secteurs et chapitres.

FIRST VIEWPORT: mobile 390 × 844. Une carte isométrique blocky occupe au moins 55 % de la hauteur. On voit trois parcelles, une serre endommagée, des rochers bloquant une extension et le Bastion à l’horizon. La barre supérieure affiche les trois ressources et explique leur rôle au toucher. Un objectif clair et une carte de prochaine tâche repliable restent visibles sans masquer la ferme.

FORM: jeu de ferme mobile inspiré de Township et Blocky Farm, avec carte continue, sélection tactile, feuilles inférieures, catalogue de construction et placement sur grille invisible. Les vues de tâches et objectifs restent des outils standards, rapides et lisibles.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Tranche verticale obligatoire

- Onboarding passable en trois moments maximum.
- Carte isométrique navigable avec zoom/recentrage accessibles par boutons.
- Parcelles, serre endommagée, entrepôt, rochers, chemin et Bastion cliquables.
- Mode construction avec catalogue, fantôme de placement, cases valides/invalides, rotation, placer et annuler.
- Au moins trois objets plaçables: nouvelle parcelle, silo compact, décoration ou balise.
- Déblayage d’un obstacle avec coût et cases révélées.
- Tâche recommandée repliable, score expliqué, Commencer et Terminer.
- Complétion qui envoie Énergie, Matériaux et Réputation vers la carte.
- Objectifs Maintenant / Chapitre / Long terme.
- Réputation avec prochain seuil et bénéfice explicite.
- Bastion expliqué et intégré physiquement à la carte.
- Premier chapitre jouable jusqu’au signal de la Tour météo.
- Sandbox local, aucun appel à la production, réinitialisation disponible.

## Accessibilité et adaptation

- Carte utilisable sans geste caché: sélectionner, déplacer, zoomer, recentrer et tourner disposent de boutons.
- Cibles de 44 px minimum, texte principal de 16 px, coûts de 14 px minimum.
- Toute couleur est doublée par un texte, une icône ou un motif.
- Panneaux inférieurs à trois positions sur mobile; inspecteur persistant sur tablette.
- `prefers-reduced-motion` remplace caméra, particules et constructions en cascade par des états instantanés annoncés.
