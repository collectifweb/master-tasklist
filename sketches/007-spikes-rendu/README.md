# Spikes de rendu — octobre 2026

Trois prototypes techniques jetables de la même scène, pour choisir comment dessiner le monde du jeu : île isométrique de 12 × 12 avec socle continu, cultures à trois stades, serre, silo, Tour-relais, muret du Bastion, deux villageois, cycle jour/nuit et trois moments animés (quête terminée, construction, récolte). Mesures et verdicts : `docs/revue-2026-10/SPIKES.md`.

| Dossier | Technique | Dépendances |
|---|---|---|
| `dom-svg/` | DOM incrémental + SVG isométrique, Web Animations API | aucune (rendu recommandé) |
| `canvas-pixi/` | Canvas WebGL avec PixiJS | `vendor/pixi.min.mjs` (PixiJS 8.22.0, licence MIT) |
| `three-voxel/` | Voxels 3D, caméra orthographique | `vendor/three.*.min.js` (three.js 0.185.1, licence MIT) |

Les bibliothèques sont copiées dans `vendor/` parce que l’hébergement est statique et sans étape de build.

```bash
python3 -m http.server 8080
# puis http://127.0.0.1:8080/sketches/007-spikes-rendu/dom-svg/ (ou canvas-pixi/, three-voxel/)
```

Ce sont des démos de rendu, pas des applications : aucune tâche réelle, aucune persistance.
