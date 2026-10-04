# Revue de finition corrective — Orée vivante

**Date : 4 octobre 2026**
**Disposition : ship**

## Corrections matérielles

| Zone | Verdict | Preuve vérifiée |
|---|---|---|
| Profondeur isométrique | Pass | Chaque entité reçoit un `z-index` fondé sur `100 + row + col`; la sélection monte à `3000` et son libellé à `20`. |
| Libellés | Pass | Les tags sont peints au-dessus de l’objet, restent contre-rotés et deviennent persistants sur la sélection. |
| Mobile | Pass | À 390 × 844, HUD sur une ligne, page exactement à la hauteur du viewport, dock inférieur compact et aucun débordement horizontal. |
| Tablette | Pass | À 834 × 1112, le contenu principal mesure 483,7 px et l’inspecteur 350,3 px; leurs bords se touchent sans superposition. |
| Tâche conseillée | Pass | Casse normale, deux lignes, priorité séparée; aucun titre long forcé en capitales. |
| Confiance | Pass | Remplace Réputation dans l’interface. Deux quêtes terminées au jour 1 n’accordent qu’un seul `+1`; le seuil suivant et son bénéfice sont visibles. |
| CRUD des quêtes | Pass | Ajout, modification, suppression confirmée, réactivation, persistance et recommandation recalculée ont été exercés dans Chromium. |
| Construction tactile | Pass | Guide 1–2–3, miniatures isométriques, case choisie, rotation, confirmation et sortie visibles. |
| Drag/drop | Pass | Cycle HTML5 `dragstart → dragover → drop` testé; le fantôme s’aimante à la case 2:2 puis attend confirmation. |
| Construction clavier | Pass | Une seule case tabulable en mode construction, zéro hors mode; flèches, rotation et confirmation fonctionnent. |
| Monde vivant | Pass | Serre active, semis/pousses/récoltes, insectes, oiseau et micro-animations; neutralisation sous reduced motion. |
| Incidents J2–J4 | Pass | Irrigation, insectes et Tour apparaissent aux jours attendus avec marqueurs, choix payants/gratuits et récupération. |
| Incident fermé | Pass | Fermer la fiche laisse le marqueur sur la carte; une conséquence contenue reste visible jusqu’à réparation. |

## Responsive

### 390 × 844

- `scrollWidth - clientWidth = 0`.
- En-tête : 66 px.
- Carte/monde : 645 px.
- Dock progression + navigation : 133 px.
- Titre conseillé lisible sur deux lignes.
- Ressources Énergie, Matériaux et Confiance visibles.

### 834 × 1112

- `scrollWidth - clientWidth = 0`.
- Carte : 483,7 px de large.
- Inspecteur : 350,3 px de large.
- `aria-modal="false"` pour le panneau latéral persistant.
- Tâche conseillée remontée au-dessus du dock de navigation.

### 1280 × 900

- Carte : 850 px avec inspecteur ouvert.
- Inspecteur : 430 px.
- En mode construction, le catalogue remplace temporairement la tâche conseillée et le dock inférieur, sans superposition.
- Catalogue, miniatures, fantôme, grille et actions de placement restent simultanément visibles.

## Accessibilité et Impeccable

- Aucune cible visible sous 44 px après remontée du bouton Jour +1 à 44 px.
- Aucun titre long entièrement en capitales.
- Focus visible et restauration du focus pour les feuilles mobiles.
- Feuille modale avec piège de focus sur mobile; inspecteur non modal en split-view.
- Les 64 tuiles sont `tabindex="-1"` hors construction.
- Une seule tuile est `tabindex="0"` après choix d’un objet.
- Couleur doublée par texte, icône, motif ou état.
- `prefers-reduced-motion: reduce` retourne `animation-name: none` pour les détails vivants audités.

## Réseau, syntaxe et persistance

- `node --check` réussi pour `data.js`, `model.js`, `ui.js` et `app.js`.
- Requêtes observées : `styles.css`, `app.js`, `data.js`, `model.js`, `ui.js`, toutes sur `127.0.0.1:8765`.
- Aucun domaine externe, `fetch`, XHR, WebSocket ou `sendBeacon`.
- Persistance locale sous `oree-vivante-sandbox-v4`, avec lecture migratoire de `v3`.
- `tasks.json` n’est ni lu par réseau ni écrit.

## Captures finales

- `review/mobile-390x844.png`
- `review/tablet-834x1112.png`
- `review/desktop-1280x900.png`

## Limites connues

Validation réalisée dans Chromium émulé. Aucun test sur Safari mobile ou appareil tactile physique n’était disponible dans ce banc.
