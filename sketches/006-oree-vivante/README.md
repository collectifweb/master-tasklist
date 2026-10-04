# Orée vivante — itération 006 corrigée

Tranche verticale interactive de **Quêtes du foyer**. La carte isométrique reste l’accueil; les quêtes réelles alimentent une ferme agro-futuriste manipulable. Le prototype fonctionne sans compte, sans API et sans modifier `tasks.json`.

## Lancer

```bash
cd sketches/006-oree-vivante
python3 -m http.server 8765
```

Ouvrir `http://localhost:8765/`.

## Boucles jouables

### Quêtes réelles

- **Quêtes → Ajouter** ouvre un vrai formulaire local.
- Chaque quête peut être commencée, terminée, réactivée, modifiée et supprimée avec confirmation.
- La recommandation est recalculée après chaque ajout, modification, suppression ou changement de statut.
- La carte conseillée conserve la casse normale et affiche le titre sur deux lignes.
- Les gains ordinaires donnent Énergie et Matériaux.
- Règle de Confiance : **+1 seulement à la première quête réelle terminée chaque jour**.
- Le prochain seuil et son bénéfice sont visibles dans Objectifs et la Tour.

### Construction

1. Ouvrir **Construire**.
2. Choisir une miniature isométrique.
3. Toucher une case, ou glisser la miniature du catalogue vers la carte.
4. Tourner le fantôme aimanté puis confirmer.
5. Utiliser la fermeture visible pour quitter.

Au clavier, une seule case de construction est tabulable. Les flèches déplacent le curseur, `R` tourne, `Entrée` ou `Espace` confirme, `Échap` revient au choix de case. Hors construction, les 64 cases sortent de la tabulation.

### Ferme et incidents

- Les parcelles montrent semis, pousses, récoltes mûres et dégâts d’insectes.
- La serre réparée devient active avec lumière et ventilation animées.
- **Jour 2 :** irrigation bouchée.
- **Jour 3 :** insectes dans les cultures.
- **Jour 4 :** Tour instable.

Chaque incident possède un marqueur physique, un choix payant sans conséquence et une option gratuite avec conséquence récupérable. Fermer la fiche ne retire jamais le marqueur; il disparaît seulement après résolution complète.

## Contrôles de carte

- Glisser le fond pour déplacer la caméra.
- Boutons explicites pour zoomer, dézoomer, recentrer et tourner.
- Au clavier sur la carte : flèches, `+`, `−`, `0` et `R`.
- Les bâtiments, cultures, obstacles, incidents et secteurs du Bastion sont de vrais contrôles accessibles.

## Responsive

- **390 × 844 :** HUD de ressources sur une ligne, carte plein écran utile, tâche conseillée sur deux lignes et dock bas compact.
- **834 × 1112 :** vrai split-view; l’inspecteur réserve sa largeur et ne recouvre pas la carte.
- **1280 × 900 :** carte large, inspecteur ou dock de construction latéral, profondeur isométrique calculée par `row + col`.
- Une entité sélectionnée et son libellé passent au-dessus de tous les autres objets.

## Persistance et sûreté

- État stocké uniquement dans `localStorage` sous `oree-vivante-sandbox-v4`.
- Migration locale depuis la clé `oree-vivante-sandbox-v3`.
- Les tâches de `tasks.json` sont copiées dans `js/data.js`; le fichier source n’est jamais écrit.
- Aucun `fetch`, XHR, WebSocket, `sendBeacon`, formulaire réseau ou appel à la production.
- La réinitialisation supprime uniquement l’état local de cette itération.

## Architecture

- `index.html` — structure, HUD, carte, panneaux et formulaires CRUD.
- `styles.css` — monde blocky, responsive, split-view, profondeur, construction, incidents et réduction de mouvement.
- `js/data.js` — données sandbox, objets, chapitre et état initial.
- `js/model.js` — économie, CRUD, persistance, événements et placement.
- `js/ui.js` — rendu échappé des quêtes, objets, miniatures, incidents et objectifs.
- `js/app.js` — interactions, clavier, glisser-déposer, caméra, dialogues et annonces.
- `DESIGN.md` et `.impeccable/design.json` — système visuel mis à jour.
- `review/` — captures finales; elles ne sont pas chargées par l’application.

## Vérifications exécutées le 4 octobre 2026

- Chromium à **390 × 844**, **834 × 1112** et **1280 × 900**, sans débordement horizontal.
- CRUD complet avec persistance et recommandation recalculée.
- Règle `+1 Confiance` vérifiée sur deux complétions le même jour.
- Construction tactile, clavier, rotation, confirmation, sortie et cycle HTML5 drag/drop vérifiés.
- Jours 2, 3 et 4 vérifiés avec marqueurs, choix payants/gratuits, fermeture persistante et récupération.
- Une seule case tabulable en construction; zéro hors construction.
- `prefers-reduced-motion: reduce` neutralise les animations vivantes et transitions fortes.
- `node --check` sur les quatre modules JavaScript.
- Inspection réseau : seulement les cinq ressources locales HTML/CSS/JS, aucun domaine externe.
- Détecteur Impeccable : zéro titre long forcé en capitales, zéro débordement, cibles visibles à 44 px minimum après correction.

Les captures ont été produites avec Chromium émulé; aucun appareil iOS/Android physique ni Safari mobile n’était disponible.
