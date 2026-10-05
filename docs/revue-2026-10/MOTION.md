# Audit motion et game feel : Orée vivante 006

Le prototype a très peu d'animation, et une partie de celle qui existe ne se joue jamais. La cause principale : la carte est entièrement reconstruite à presque chaque action. Les animations en boucle repartent alors de zéro, et les transitions CSS n'ont pas d'élément à animer.

Tests faits dans Chromium 1194 sans affichage (headless), toujours en partant d'un navigateur vierge. Aucune erreur console. Les numéros de ligne CSS renvoient à une copie formatée de la feuille de styles : `motion/styles.fmt.css`.

## 1. Inventaire de l'existant

| Animation | Déclencheur | Durée / easing | Reduced-motion | Verdict |
|---|---|---|---|---|
| `resource-pop` (l.255) : translateY -4px, scale 1.04, fond et bordure | `pulseResources` (quête, récolte) | 0,7 s, expo-out | neutralisée | se joue à t=0, avant l'arrivée des particules |
| `weather-signal` (l.739) : halo box-shadow | Tour `.is-stable` | 1,8 s en boucle | oui | repeint à chaque frame |
| `crop-sway` (l.2131) : rotate 2deg sur tout le `:before` | parcelle mûre | 2,8 s en boucle | oui | toute la parcelle bascule d'un bloc, rigide |
| `pest-hop`, `greenhouse-pulse`, `greenhouse-air` | insectes, serre `online` | 1,3 / 2,4 / 2,8 s | oui | correctes mais minuscules |
| `bird-cross` (l.2152) | permanent | 12 s, linéaire | oui | 90 px en 12 s, puis retour d'un coup |
| `incident-pulse` (l.2205) : halo box-shadow | marqueur (actif **et** contenu) | 1,8 s | oui | repeint ; même rythme pour deux états différents |
| `.map-stage` transform (l.419) | zoom, rotation, recentrage | 0,38 s, cubic-bezier(.16,1,.3,1) | oui | bon pour le zoom, casse la rotation |
| `.tile:before` (l.460) | case candidate | 0,18 s | oui | **jamais jouée** (cases recréées) |
| `.entity` transform 0,3 s, filter 0,18 s (l.513) | contre-rotation, survol | | oui | transform **jamais jouée** |
| `.tag` opacity 0,15 s (l.541) | survol, focus | | non | à la sélection, le libellé apparaît d'un coup |
| `.chapter-track span` scaleX (l.1107) | `renderChapter` | 0,5 s, expo-out | oui | seule progression animée ; scaleX écrase l'arrondi |
| `.sheet-scrim`, `.sheet-panel` (l.1163/1180) | feuille | 0,25 / 0,32 s | oui | entrée seulement |
| `.toast` (l.1624) | `showToast` | 0,32 s, affiché 3,8 s | oui | le 2e toast remplace juste le texte |
| `.reward-particle` (l.1675) | `pulseResources` | 0,85 s ; opacity 0,7 s | `display:none` | ligne droite, sans décalage entre particules |

**Côté JS :**
- Fonctions concernées : `applyCamera`/`setCamera` (app.js 37/45), `pulseResources` (168, la seule qui teste `reducedMotion`), `showToast` (159), `openSheet`/`closeSheet`.
- Aucun WAAPI, canvas, boucle rAF ni `will-change`.
- Tout le reste (onboarding, dock, popover, bulle, détails de quête, `<dialog>`) bascule via `hidden`, donc sans transition.
- Reduced-motion : vérifié, plus aucune animation (repos, rotation, feuille). Mais plus aucun retour visuel non plus, pas même un flash de couleur.

## 2. Glitches de mouvement (reproduits depuis un navigateur vierge)

« Passer » = bouton Passer de l'onboarding. « État riche » = état injecté dans localStorage (jour 4, serre `online`, Tour stable, incidents actifs) ; voir `richPatch` dans `motion/s1-inventory.cjs`.

1. **Les boucles redémarrent à chaque `renderMap`.** À 390×844 avec l'état riche, attendre 3 s puis cliquer Zoomer : le `currentTime` de 8 animations retombe de 2750 à 0.
   - Même chose en rotation, sélection, redimensionnement et à chaque case parcourue par le curseur de construction.
   - Cause : `renderMap()` (app.js 67) réécrit l'`innerHTML` des deux calques.
   - De plus, toutes les boucles battent en phase, comme un métronome.
   - Correctif rapide : un `animation-delay` négatif calculé depuis `performance.now()`, plus un décalage par id.
2. **Rotation : les objets sont couchés au départ.** À 1280×900, Passer puis Tourner la carte.
   - Dès la frame 0, les nouveaux nœuds reçoivent `--counter-rotation:-90deg` alors que la scène est encore à 0°.
   - Tours et libellés sont à la verticale, puis se redressent en 0,38 s (`s3-sheet-rotate-1280.png`).
   - Cause : `setCamera` déclenche `renderMap`.
3. **La 4e rotation tourne de 270° dans le mauvais sens**, libellés tête en bas (`s3-sheet-rotate-wrap-1280.png`). Cause : l'angle est ramené modulo 360 (app.js 50).
4. **La rotation est une rotation 2D d'une vue isométrique.** À 90° et 270°, la grille n'est plus isométrique, et la ferme sort du cadre parce que le pivot est mal placé.
5. **Tourner le fantôme couche l'objet.** À 390×844 : Construire → Silo compact → case 6:4 → Tourner → Confirmer.
   - Le silo pivote à plat d'un coup et reste couché une fois posé (`s4-sheet-build-390.png`).
   - Cause : `.entity .object { rotate(var(--entity-rotation)) }`.
6. **Complétion : l'effet arrive avant la cause.** À 390×844 : Passer → quête conseillée → Commencer → Terminer, filmé au ralenti ×5 (`s2-sheet-complete-390.png`).
   - À 13 ms, le HUD est déjà à jour et le pop déjà joué.
   - Les particules arrivent à 8 % d'opacité, sans rien déclencher.
   - Cause : `renderAll()` passe avant `pulseResources`.
7. **Les particules n'ont pas de point de départ visible.** La carte est déjà repliée sur la quête suivante. Les 3 pastilles naissent empilées au-dessus du mot « Conseillée » (`s2-crop-before-after.png`) et suivent la même trajectoire droite, en même temps.
8. **Les particules de récolte partent du coin haut-gauche** (`left:-15px; top:-15px`).
   - Repro : Passer, Jour +1 deux fois (fermer les feuilles d'incident), Parcelle A → Récolter.
   - Cause : `harvest.getBoundingClientRect()` est lu après `renderAll()`, qui a déjà retiré le bouton du DOM (app.js 412).
9. **Les dépenses sont muettes** (Planter, Réparer, Déblayer, Construire, choix payant) : pas de pulse, pas de « −3 ».
10. **La feuille se ferme sans animation.** À 16 ms, `.sheet` est déjà en `visibility:hidden` alors que le panneau est encore à translateY(0). Correctif : reprendre le motif de `.toast` (`visibility 0s .32s`).
11. **À partir de 700 px de large, le panneau latéral apparaît d'un coup et la carte saute.** À 834×1112, Passer puis toucher la Serre (`s8-sheet-open-16ms-834.png`).
    - À 16 ms, la colonne crème est déjà pleine et seul le contenu glisse.
    - Dans la même frame, la serre saute de 175 px et le bloc chapitre/nav de 350 px (215/430 px à 1280).
    - Cause : le fond est posé sur `.sheet`, la règle `body.has-sheet .lower-deck` déplace le bloc, et la caméra ne compense pas.
12. **La hauteur de la feuille saute** quand son contenu change (Récolter → Planter, incident → conséquence).
13. **Le toast cache des actions.**
    - « Jour 2 » recouvre « Dévier à la main · gratuit » pendant 3,8 s (`s4-sheet-day-incident-390.png`).
    - « Construction terminée » chevauche le catalogue : toast entre 706 et 766 px, dock entre 606 et 838 px.
    - Après chaque quête, le toast couvre « Jour +1 ».
14. **Les toasts successifs ne se ré-animent pas** : le second message passe inaperçu.
15. **Changements sans transition :**
    - les détails de quête passent de 78 à 245 px d'une frame à l'autre ;
    - l'onboarding (entrée, étapes, sortie) n'a aucune transition, et son illustration est figée ;
    - le dock de construction grandit de 40 px d'un coup quand Tourner/Confirmer/Changer s'affichent.
16. **La pose n'a ni chute ni poussière.** Le style `.tile.candidate` (scale 1.08) ne transitionne jamais.
17. **Le fantôme se téléporte** de case en case (toucher, flèches, glisser).
18. **Ciel presque figé.** L'oiseau avance à 7,5 px/s puis saute de 90 px toutes les 12 s. Nuages, soleil et crêtes sont statiques. Ni eau, ni vent, ni habitants.
19. **La bulle de Solène ne revient jamais** une fois fermée, même quand sa réplique change.
20. **Jour +1 n'a aucune transition.** Les cultures changent de phase d'un coup, et le marqueur d'incident apparaît pendant que la feuille s'ouvre par-dessus.
21. **Le marqueur d'un incident résolu disparaît d'un coup.**
22. **La fin de chapitre se résume à un toast.** Si on fait les étapes dans le désordre, la barre ne bouge pas (signal émis, barre restée à 0,08).
23. **Le déplacement de la carte au doigt n'a pas d'inertie.** Autre risque, non reproduit en headless : `movePan` → `applyCamera(true)` retire `.no-transition` dans un rAF. Sur un vrai navigateur, où les événements tactiles sont synchronisés sur le rAF, la transition de 0,38 s s'appliquerait pendant le glisser.
24. **Aucun retour visuel à la pression** : pas de `:active`, et le survol ne joue que sous `(hover:hover)`.
25. **La sélection n'a ni rebond ni recadrage de la caméra** : l'objet peut finir caché sous la feuille sur mobile.
26. **Une fois réparée, la serre s'appelle toujours « Serre endommagée »**, et ses lampes s'allument sans transition.
27. **Coût de rendu :**
    - halos en box-shadow dans 8 objets qui ont un `filter: drop-shadow`, sous 4 couches `backdrop-filter` ;
    - 120 recalculs de style pour 120 frames au repos ;
    - un zoom coûte 20 ms de calcul bloquant (CPU ralenti ×4).

## 3. Système de motion

**Jetons :**
- Durées : `--t-press 90ms`, `--t-micro 150ms`, `--t-short 220ms`, `--t-medium 320ms`, `--t-long 480ms`, `--t-camera 600ms`, `--t-celebrate 1200ms`, `--t-day 1600ms`.
- Easings :
  - `--ease-out cubic-bezier(.16,1,.3,1)` pour les entrées ;
  - `--ease-in cubic-bezier(.55,0,.75,.2)` pour les sorties ;
  - `--ease-inout cubic-bezier(.65,0,.35,1)` pour la caméra ;
  - `--ease-back cubic-bezier(.34,1.56,.64,1)` ;
  - `--ease-bounce linear(0,.36 12%,.9 25%,1.08 35%,1 46%,.97 58%,1)`.
- Distances : `--lift-1 2px`, `--lift-2 6px`, `--drop 28px`, squash `scale(1.12,.88)`, stretch `scale(.92,1.1)`, stagger de 40 ms (6 éléments au plus).

**Principes :**
- anticipation de 2 à 4 frames ;
- squash & stretch sur les objets de la carte seulement ;
- dépassement (overshoot) à l'entrée ;
- mouvement de suite (poussière, libellé) ;
- décalage (stagger) pour toute série d'éléments ;
- l'effet se produit sur la cible au moment de l'impact ;
- les sorties durent 70 % des entrées.

**Hiérarchie :**
- micro, 150 ms au plus : pression, survol, compteur ;
- moyen, 220 à 480 ms : feuilles, docks, sélection, pose, caméra ;
- célébration, 1,4 s au plus, une seule à la fois, un toucher l'accélère : quête, signal, chapitre.

**Reduced-motion :** ni translation, ni échelle, ni boucle. À la place : fondus de 150 ms au plus, flash de couleur sur le HUD, « +3 » fixe, caméra instantanée, jour/nuit en simple teinte. Écouter l'événement `change` de la media query.

**Budget mobile :**
- transform et opacity seulement (halos faits avec un pseudo-élément) ;
- `will-change` posé au début d'une animation, retiré à la fin ;
- 16 particules au plus (24 en célébration), dans un seul canvas ;
- boucles en pause si `document.hidden`, pendant le déplacement de la carte ou sous une feuille ;
- ombre en ellipse plutôt que `drop-shadow` ;
- une seule `backdrop-filter` au-dessus de la carte.

**Vibrations, sur activation volontaire :**
- interrupteur « Vibrations » désactivé par défaut, préférence en `localStorage` ;
- ignoré si `navigator.vibrate` n'existe pas (c'est le cas sur iOS Safari) ;
- motifs : pression 8 ms, pose 15 ms, gain `[12,40,18]`, incident `[30,60,30]`, chapitre `[20,50,20,50,40]`.

## 4. Catalogue priorisé

Notation : impact de 1 à 5 · effort S/M/L. Sauf mention contraire, en reduced-motion chaque entrée devient un fondu de 150 ms.

1. **Quête accomplie (5·M).** Durée 1,2 s, WAAPI + canvas ; toucher `complete`, créer `fx.reward()`, adapter `recommendedTaskMarkup`.
   - 0 ms : Terminer se tasse (scale .94).
   - 90 ms : un tampon ✓ apparaît en ease-back.
   - 250 ms : les chips +É/+M/+★ partent en arc vers leur compteur (décalage de 70 ms) ; le compteur défile et pulse à l'impact.
   - 900 ms : la carte se replie et la quête suivante monte.
2. **Le monde absorbe la récompense (5·M).** Une pastille repart du HUD vers la Tour, qui s'illumine pendant 300 ms (c'est le geste signature décrit dans DESIGN.md). WAAPI, 600 ms.
3. **Compteurs du HUD (5·S).**
   - Le chiffre défile en rAF pendant 300 à 500 ms, avec un pop 1.12→1 en ease-back et un « +3 » qui monte de 12 px.
   - Pour une dépense : couleur braise et « −3 » qui tombe.
   - Toucher `renderResources(prev)`. RM : flash de 150 ms.
4. **Boucles continues (5·S).** Délai négatif calé sur l'horloge, plus un décalage par id. ui.js `entityMarkup`.
5. **Rotation isométrique (5·L).**
   - Recalculer la position (row, col) à chaque quart de tour au lieu de tourner l'image.
   - Animer les objets vers leur nouvelle place en 480 ms ease-inout (technique FLIP), avec un décalage de 15 ms selon la profondeur et un saut de 6 px à mi-course.
   - Garder un angle cumulé pour ne jamais tourner à l'envers.
   - Toucher `setCamera` et `isoPosition(row,col,rot)`.
6. **Feuilles (4·S).** Toucher `.sheet` et `renderSheet`.
   - Sortie en 220 ms ease-in, avec visibilité retardée.
   - Fondu enchaîné de 150 ms et hauteur animée (FLIP) quand le contenu change.
   - Sur tablette, fond posé sur le panneau.
   - Même dépliage (`grid-template-rows: 0fr→1fr`, 220 ms) pour les détails de quête et les actions de placement.
7. **Panneau latéral sans saut (4·M).** La caméra se décale de la moitié de la largeur du panneau, avec la même courbe ; le bloc du bas glisse (FLIP). Toucher `openSheet`.
8. **Plantation (4·S).** Trois graines tombent (250 ms ease-in, décalage de 60 ms), petite poussière, les sillons foncent, puis les pousses sortent en scaleY 0→1.15→1 (ease-bounce). Classe `just-planted`.
9. **Croissance au Jour +1 (4·M).** Étirement 1→1.1→1 et feuilles qui s'ouvrent, décalées selon la profondeur.
10. **Récolte (4·S).** La culture s'étire et vole vers l'Entrepôt, qui rebondit ; le « +3 » part de la parcelle (corrige le glitch 8).
11. **Pose d'une construction (4·M).** Toucher `confirmPlacement`, ajouter la classe `just-placed`.
    - le fantôme monte de 8 px en 90 ms ;
    - chute de 28 px en 220 ms ease-in ;
    - écrasement à l'impact, puis rebond en ease-back ;
    - 6 grains de poussière et vibration de 15 ms.
12. **Fantôme qui glisse (3·S).** 120 ms entre deux cases, dépassement de 4 px. Nécessite des éléments DOM persistants (§5).
13. **Orientation des objets (3·S).** Miroir scaleX(−1) au lieu d'une rotation, avec un saut de 6 px.
14. **Réparation de la serre (4·M).** Étincelles, vitres qui se remplissent l'une après l'autre, lampes qui clignotent deux fois, nom mis à jour.
15. **Déblayage (4·M).** Tremblement, 8 fragments, puis les 6 cases se révèlent en vague diagonale (décalage de 50 ms, scale .6→1).
16. **Apparition d'incident (4·S).** Le marqueur tombe avec un rebond, une onde braise part, l'objet touché tremble 300 ms ; la feuille ne s'ouvre que 600 ms après.
17. **Résolution d'incident (3·S).** Choix payant : le marqueur devient un ✓ sauge et s'envole. Choix gratuit : il passe au jaune soleil avec un demi-tour.
18. **Stabilisation de la Tour (4·M).** Oscillation qui s'amortit sur 600 ms, puis antenne allumée et anneaux.
19. **Signal et fin de chapitre (5·L).** Faisceau, 3 ondes, lumière d'aube sur la carte, bandeau « Chapitre 1 terminé » qui dépasse légèrement en entrant, 24 feuilles-confettis au plus, récapitulatif.
20. **Étape de chapitre (4·S).** La barre se remplit puis flashe, la pastille « 2/6 » saute, l'objectif défile verticalement.
21. **Transition de jour (4·M).** 1,6 s de crépuscule (teinte et soleil qui descend), lucioles, aube, titre « Jour 2 ». RM : changement de teinte en 300 ms.
22. **Sélection (3·S).** Squash 1.06/.94 en 180 ms, anneau qui se dessine au sol, caméra qui recadre l'objet au-dessus de la feuille.
23. **Pression (3·S).** `:active` à scale .96 en 90 ms, relâchement en ease-back.
24. **Toasts (3·S).** File d'attente, ré-animation à chaque message, position haute quand une feuille ou un dock est ouvert, barre de durée.
25. **Onboarding (3·S).** Entrée par le bas, fondu enchaîné entre les étapes avec un glissement de 24 px, arcs du signal qui pulsent, sortie en zoom vers la carte.
26. **Vie ambiante (4·L).** Nuages qui dérivent (60 à 90 s), oiseaux qui sortent du champ au lieu de se téléporter, vent par rangées de cultures, fumée, eau, 2 villageois sur les chemins ; tout se met en pause hors écran.
27. **Solène (3·S).** La bulle revient à chaque nouvelle réplique, avec un pop et un effet machine à écrire qu'on peut passer.
28. **Déplacement avec inertie (3·S).** Friction de 0,92 par frame et bord élastique (`endPan`).

Ordre conseillé : 4, 6, 3, 1, 23, 24, 11, 8, 10, 16, 5, 21, 19.

## 5. Problème structurel

`renderAll()` suit presque chaque action, et `renderMap()` recrée les 64 cases et tous les objets. Résultat : les boucles repartent de zéro, les transitions CSS ne se jouent jamais, et le code ne sait pas *ce qui a changé*.

| Option | Avantages | Inconvénients |
|---|---|---|
| A. Mise à jour par identifiant : `Map<id, élément>`, cases créées une seule fois, on modifie seulement classes et styles, classe `is-entering` à l'entrée, retrait après l'animation de sortie, comparaison des états (`planted→growing`) | vanilla, sans build ; garde les vrais `<button>` ; les transitions CSS refonctionnent ; 150 à 250 lignes | logique de comparaison à maintenir |
| B. Le modèle émet des événements (`taskCompleted`, `placed`, `incidentSpawned`, `dayAdvanced`) vers un module `fx.js` qui orchestre WAAPI et canvas | la cause précède l'effet ; permet les célébrations | à combiner avec A |
| C. lit-html avec `repeat` par identifiant, chargé depuis un CDN | mise à jour fiable ; ui.js produit déjà des gabarits texte | dépendance externe |
| D. Canvas ou PixiJS pour le monde, plus un DOM invisible pour l'accessibilité | particules, jour/nuit, vraie rotation isométrique, performances | réécriture de tout le dessin CSS, deux arbres à maintenir, poids |

Recommandation : A et B tout de suite, plus un unique `<canvas>` d'effets au-dessus de la carte. On réévalue D au-delà d'une trentaine d'éléments animés.

## Fichiers produits

Dossier : (captures de la session cloud, non versionnées)

- **Vidéos :**
  - `s4-flows-390.webm` et `s4-flows-1280.webm` (parcours complet)
  - `s2-complete-slowmo-390.webm`
- **Images :**
  - planches : `s*-sheet-*.png`, `s2-crop-before-after.png`, `s5-*.png`, `s8-*.png`
  - frames : `s2-f390-*`, `s3-rot-*`, `s4-*`, `s7-*`
- **Données et scripts :** `s*-out.json`, `styles.fmt.css`, `lib.cjs`, `s1-*.cjs` à `s8-*.cjs`

Le dépôt n'a pas été modifié (`git status` vide) et le serveur du port 8105 est arrêté.