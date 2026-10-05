# Glitches confirmés — prototype 006

89 glitches trouvés par 4 chasseurs indépendants (mobile, tablette/caméra, construction/incidents, analyse statique), puis rejoués par un vérificateur sceptique depuis un navigateur vierge : 84 confirmés, 5 partiels.

## G01 · Le score de priorité de la carte « Conseillée » est invisible : chiffre vert foncé sur fond vert foncé

- **Gravité :** haute · **Zone :** carte conseillée / HUD · **Viewport :** Toutes tailles (320 à 1920 px ; vérifié en 390×844, 360×740, 430×932, 834×1112, 1112×834, 1280×900 et 1920×1080) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile (isMobile, hasTouch, DSF 2), ouvrir /sketches/006-oree-vivante/. 2. Toucher « Passer ». 3. Regarder la pastille verte à droite de la carte « Conseillée ».
- **Attendu :** La pastille affiche « 80 » en blanc au-dessus de « PRIORITÉ ».
- **Observé :** Seul « PRIORITÉ » est lisible. Le chiffre (`b`, « 80 ») est rendu en rgb(63,96,71), exactement la couleur du fond de la pastille (contraste 1:1, mesuré avec getComputedStyle).
- **Cause probable :** styles.css l.44 : `.task-summary span{color:var(--sage-dark)}` (spécificité 0,1,1) l'emporte sur `.task-score{color:#fff}` (0,1,0), car `.task-score` est un <span> enfant de `.task-summary` (ui.js recommendedTaskMarkup). Le <b> hérite de cette couleur.
- **Piste de correctif :** `.task-summary .task-score{color:#fff;letter-spacing:0}`, ou restreindre la règle à `.task-summary > span:first-child > span`.

## G02 · Les tuiles sont des rectangles inclinés à 45°, pas des losanges iso : chevrons et trous dans la grille

- **Gravité :** haute · **Zone :** carte · **Viewport :** Toutes tailles (le plus visible au zoom 1,5 avec DPR 2) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile (ou 1280×900), ouvrir l'URL, « Passer ». 2. Toucher 5 à 6 fois « + » (zoom 1,5). 3. Observer le sol, par exemple autour de la case 2:1.
- **Attendu :** Un damier de losanges isométriques jointifs (environ 86×44 px au pas de la grille), avec chaque bâtiment et parcelle posé au centre de son losange.
- **Observé :** Chaque tuile est une bande rectangulaire d'environ 54×29 px tournée à 45°. L'ensemble forme des chevrons, avec des carrés et triangles vert clair visibles entre les bandes. Le chemin sablé apparaît en morceaux. Les parcelles, dessinées de face, chevauchent deux tuiles, et l'Entrepôt (5,4) recouvre la moitié de la Parcelle C (4,3). La miniature `.thumb-tile` du catalogue a le même défaut.
- **Cause probable :** styles.css l.31 : `.tile:before{inset:11px;transform:rotate(45deg) scaleY(.54)}`. La fonction la plus à droite s'applique en premier : le carré est écrasé puis tourné (matrix(.707,.707,-.382,.382)), ce qui donne un rectangle tourné. Même ordre dans `.tile.candidate:before` et `.catalog-thumb .thumb-tile`. Un carré de 54 px n'a qu'une diagonale de 76 px pour un pas de 86 px.
- **Piste de correctif :** Inverser l'ordre : `transform: scaleY(.512) rotate(45deg)` (avec `... scale(1.08)` pour la candidate) et un inset d'environ 7,5 px (côté ≈ 61 px, diagonale 86). Autre option : `clip-path: polygon(50% 0,100% 50%,50% 100%,0 50%)` sur 86×44. Corriger aussi .thumb-tile. Donner aux objets une base losange ancrée au centre de la tuile.

## G03 · Impossible de déplacer la carte en glissant sur la ferme (tuiles et entités) : seuls le ciel et l'herbe hors grille répondent

- **Gravité :** haute · **Zone :** carte · **Viewport :** 390×844 (critique au toucher), 834×1112, 1280×900 (souris et tactile) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, ouvrir l'URL, « Passer », attendre 4 s. 2. Glisser au doigt (CDP Input.dispatchTouchEvent) de (200,520) à (120,440), en plein sur la grille, puis comparer `#map-stage.style.transform` avant et après. 3. Refaire le geste de (200,600) à (100,560), sur l'herbe sous la grille. En 1280×900 : glisser de 100 px depuis (600,470), puis depuis le ciel (640,250).
- **Attendu :** La caméra suit le doigt ou la souris partout dans la carte, comme l'annonce le README (« Glisser le fond »).
- **Observé :** Sur la grille, la transformation reste identique (translate(-10px,24px) ; camera.x reste à 0 en desktop). Le déplacement ne fonctionne que hors grille (x passe de -10 à -110, ou de 0 à 100 depuis le ciel). Un glisser qui part d'une entité ne déplace pas non plus la carte. elementFromPoint montre que 100 % du losange est fait de <button>, et le curseur y affiche « pointer » au lieu de « grab ». Sur mobile, la ferme couvre presque toute la vue et touch-action:none bloque aussi le défilement.
- **Cause probable :** app.js startPan : `if (event.target.closest('button') || ui.build.dragging) return;`. Les 64 tuiles (ui.js terrainMarkup) et toutes les entités sont des <button>, même hors mode construction.
- **Piste de correctif :** Démarrer le pan sur tout pointerdown dans #map-viewport (hors .map-controls et surcouches) et laisser `moved` / `suppressClick` (seuil de 5 px) annuler le clic. Hors mode construction, mettre `.tile{pointer-events:none}`.

## G05 · Mobile : le toast masque les choix des feuilles d'incident (option gratuite, « Réparer ») et le contenu des fiches

- **Gravité :** haute · **Zone :** incidents / feuille / toast · **Viewport :** 390×844 (tactile) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer », attendre 4 s. 2. Toucher « Jour +1 » : la feuille « Irrigation bouchée » s'ouvre. 3. Aussitôt (moins de 3,8 s), tester elementFromPoint au centre de la 2e carte de choix (≈195,708). 4. Choisir « Dévier à la main · gratuit » : la feuille passe en « Conséquence récupérable ». Regarder « Réparer la conduite · 2 Matériaux ». Même chose aux jours 3 (Insectes) et 4 (Tour), et sur la fiche Tour après « Inspecter avec Milo ».
- **Attendu :** Les deux choix et le bouton de réparation sont visibles et touchables dès l'ouverture.
- **Observé :** Le toast « Jour 2 · Irrigation bouchée » (y 694–754, z 110) couvre « Dévier à la main · gratuit » : elementFromPoint renvoie strong#toast-title, et Playwright signale que #toast intercepte les événements de pointeur. Après le choix, le toast « Incident contenu » cache entièrement « Réparer la conduite ». Le toast cache aussi le résumé « x / 3 Confiance » de la fiche Tour et la description des fiches d'entité (par exemple « Sol prêt… » sur la Parcelle B).
- **Cause probable :** app.js : la branche [data-advance-day] appelle showToast() puis openSheet('incident:…') en même temps. Le toast fixe à 90 px du bas (z 110) passe au-dessus de .sheet-panel (z 80, ancrée en bas) et intercepte les touchers.
- **Piste de correctif :** Ne pas afficher de toast quand une feuille d'incident s'ouvre : la feuille est déjà le message. Si une feuille est ouverte, afficher le toast en haut (top ≈ 76px) ou dans la feuille. Ajouter `pointer-events:none`.

## G06 · Mobile : le toast recouvre le catalogue de construction et avale le choix d'objet

- **Gravité :** haute · **Zone :** construction / toast · **Viewport :** 390×844 (tactile) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer », attendre 4 s. 2. Toucher « Construire ». 3. Dans les 3,8 s, tester elementFromPoint au centre de #build-catalog (≈195,747) ou toucher « Nouvelle parcelle ». 4. Variante : Silo, case 2:2, Confirmer, puis toucher tout de suite une miniature.
- **Attendu :** Le catalogue (l'étape 1 « Choisis un objet ») reste visible et utilisable. Le message s'affiche ailleurs.
- **Observé :** Le toast « Construction / 1. Choisis 2. Place 3. Confirme. » (y 694–754, z 110) se pose sur le dock (y 608–838, z 75) et masque les miniatures « Nouvelle parcelle » et « Silo compact ». elementFromPoint renvoie div#toast : le tap est avalé et aucun objet n'est sélectionné. Même chose avec « Construction terminée » après Confirmer.
- **Cause probable :** styles.css `.toast{position:fixed;bottom:calc(90px + var(--safe-bottom));z-index:110}` sans pointer-events:none, qui ne tient pas compte de .build-dock (fixed, bottom 6px, environ 230 px de haut). app.js toggleBuildMode() et confirmPlacement() appellent showToast().
- **Piste de correctif :** `.toast{pointer-events:none}`. Avec body.is-building, placer le toast au-dessus du dock (bottom = hauteur du dock + 12px) ou en haut de l'écran. Supprimer le toast d'ouverture, redondant avec le guide en 3 étapes.

## G07 · Mobile : le toast recouvre « Jour +1 » et la bande chapitre, et avale le second toucher

- **Gravité :** haute · **Zone :** toast / HUD · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer », attendre 4 s. 2. Toucher « Jour +1 » (jour 2, la fiche Irrigation s'ouvre), puis Échap ou ×. 3. Toucher à nouveau « Jour +1 » dans les 3 s, et tester elementFromPoint au centre du bouton (≈336,741). Variante : terminer une quête ou déblayer l'Éboulis, puis toucher tout de suite « Jour +1 ».
- **Attendu :** « Jour +1 » reste visible et touchable.
- **Observé :** Le toast (y 694–754, x 12–378) recouvre la moitié haute du bouton (y ≈725–769) : elementFromPoint renvoie span#toast-copy, le clic est avalé et le jour reste 2. Le toast couvre aussi le titre du chapitre, sa barre de progression et le bas de la carte « Conseillée ». Pendant l'apparition, « Chapitre 1 » se lit en transparence sous le toast.
- **Cause probable :** styles.css l.52 : `.toast{bottom:calc(90px + var(--safe-bottom));z-index:110}` sans pointer-events:none. Le toast tombe sur la bande chapitre (y 712–795), alors que le lower-deck mobile mesure 145 px.
- **Piste de correctif :** Placer le toast au-dessus du dock (bottom = hauteur réelle du lower-deck + 12 px, via une variable CSS) ou en haut sous le HUD. Ajouter `.toast{pointer-events:none}`.

## G11 · Icône géante noire dans le bouton « Réinitialiser le sandbox »

- **Gravité :** haute · **Zone :** feuille (Quêtes) · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Nav « Quêtes ». 3. Faire défiler la feuille tout en bas.
- **Attendu :** Une petite icône ↻ de 18 px, au trait, à côté du libellé.
- **Observé :** Un disque noir plein d'environ 100 px de haut occupe le bouton, au-dessus du libellé.
- **Cause probable :** ui.js questsMarkup insère icon('reset') dans `.sheet-actions .button`, mais aucune règle CSS ne dimensionne ni ne stylise ce svg. Il prend la taille par défaut (300×150) et un remplissage noir. Seuls `.quest-toolbar svg` et `.task-actions .button svg` sont stylés.
- **Piste de correctif :** Règle générique : `.button svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2}` et `.button{display:inline-flex;align-items:center;justify-content:center;gap:6px}`.

## G12 · La rotation à 90° et 270° casse la projection isométrique : la grille devient un losange vertical

- **Gravité :** haute · **Zone :** carte (rotation) · **Viewport :** Toutes tailles (390×844, 834×1112, 1112×834, 1280×900) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Toucher ou cliquer une fois « Tourner la carte » (↻), ou appuyer sur R avec le focus sur la carte. 3. Attendre 600 ms. 4. Recommencer pour 180° et 270°.
- **Attendu :** Un quart de tour isométrique : la grille garde son losange horizontal 2:1, et les bâtiments changent de place autour du centre (et montrent une autre face).
- **Observé :** Toute la scène subit une rotation 2D de 90°. La grille devient un losange haut et étroit (1:2, environ 384×678 px en 1280×900), chaque tuile est étirée verticalement, et les ombres de dalle partent vers la gauche. Les bâtiments, contre-tournés, restent de face sur un sol qui n'est plus isométrique. En 1280×900, la grille monte jusqu'à y≈100, dans le ciel près du soleil. En mobile, la Tour et le Bastion se retrouvent en bas, à moitié sous la carte « Conseillée ». La rotation est enregistrée et reste au rechargement.
- **Cause probable :** app.js applyCamera : `rotate(${rotation}deg)` appliqué à #map-stage après `scale()`. On fait tourner une projection 2D déjà iso. ui.js isoPosition(row,col) ne dépend pas de la rotation.
- **Piste de correctif :** Implémenter la rotation par quart de tour comme une permutation des coordonnées de grille ((r,c) → (c,7−r), etc.), appliquée dans isoPosition, terrainMarkup et entitiesMarkup, sans rotate() CSS sur la scène. Animer par un fondu ou en interpolant les positions des entités. Cette approche règle aussi la profondeur, l'ancrage, les marqueurs, l'éclairage et le clavier.

## G13 · Après rotation, l'ordre de profondeur est faux : des objets du fond passent devant ceux du premier plan

- **Gravité :** haute · **Zone :** carte (profondeur) / entités · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Toucher ↻ une fois (90°), puis deux fois (180°). 3. Pour chaque paire d'entités qui se chevauchent, comparer le bas à l'écran (getBoundingClientRect().bottom) et le z-index en ligne. Variante 1280×900 : Construire > Silo compact sur la case 2:7 puis sur la case 1:7, Confirmer, quitter, puis tourner à 180°.
- **Attendu :** L'objet le plus bas à l'écran (le plus proche) est dessiné devant.
- **Observé :** À 180°, 7 paires sont inversées : plot-a (bas 469, z 105) est derrière plot-b (453, z 106), greenhouse (453, z 106) derrière rocks (404, z 109), plot-c derrière warehouse, bastion derrière tower, et l'Entrepôt (5,4) passe devant la Parcelle C (4,3). À 90°, la Tour (z 107) est peinte devant le Bastion (z 106) alors qu'elle est derrière, et plot-a/plot-b sont inversées. Les silos posés en 2:7 et 1:7 restent par-dessus la Tour et le Bastion à 180°. Les marqueurs d'incident suivent la même logique.
- **Cause probable :** ui.js entityMarkup : `depth = 100 + entity.row + entity.col`, et entitiesMarkup trie le DOM par row+col. Tuiles (`z-index: row+col`) et marqueurs (`2100 + row + col`) aussi. Tout cela ignore camera.rotation.
- **Piste de correctif :** Calculer la profondeur selon la rotation (0° → row+col, 90° → col−row, 180° → −(row+col), 270° → row−col, plus une constante) ou à partir du y écran, et trier le DOM de la même façon. Le mieux reste de reprojeter la grille.

## G15 · Après rotation, les bâtiments et le fantôme se décrochent de leur case (jusqu'à 49 px sous la case à 180°)

- **Gravité :** haute · **Zone :** carte / entités / construction · **Viewport :** 1280×900 (toutes tailles, y compris 390×844) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », attendre 4 s. 2. Cliquer « Tourner la carte » une fois (90°), puis une seconde fois (180°). 3. Comparer le pied de chaque objet au centre de sa tuile. 4. Variante : à 90°, Construire → Silo compact → case 2:2, et comparer le pied du fantôme au centre de la case.
- **Attendu :** Le pied de chaque objet et du fantôme reste sur sa tuile, avec le même décalage qu'à 0°, quelle que soit la rotation.
- **Observé :** Base de l'objet moins centre de la tuile : 0° → (0, +11) ; 90° → (+19, +30) ; 180° → (0, +49), l'objet pend 38 px sous sa case, sur la rangée de devant ; 270° → (−19, +30). Le fantôme suit le même décalage, (+19, +30) à 90° et 49 px sous la case à 180°, soit sur la case voisine.
- **Cause probable :** styles.css `.entity{transform:rotate(var(--counter-rotation))}` utilise l'origine par défaut (50% 50% de la boîte 70×74, soit (35, 37)), alors que l'ancrage posé par `margin:-56px 0 0 -35px` est à (35px, 56px). La contre-rotation pivote 19 px au-dessus de la tuile.
- **Piste de correctif :** `.entity{transform-origin:35px 56px}` (44px 56px pour le Bastion). Plus robuste : abandonner la rotation CSS de la scène et reprojeter (row, col) dans isoPosition().

## G22 · « Tourner » en construction couche l'objet (silo sur le flanc, balise à l'envers), et il reste couché après Confirmer

- **Gravité :** haute · **Zone :** construction / fantôme · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », attendre 4 s. 2. Construire → « Silo compact ». 3. Toucher la case 2:2 (≈183,369 en mobile). 4. Toucher « Tourner » 1, 2 puis 3 fois (ou R avec le focus sur la case). 5. Confirmer, puis quitter la construction (×). Variante : « Balise florale » → case 1:2 → Tourner ×2 → Confirmer.
- **Attendu :** Le bâtiment reste debout sur sa case et montre une autre face (ou rien ne change pour un objet symétrique).
- **Observé :** À 90°, le silo est couché à l'horizontale comme une gélule, entouré d'un contour rectangulaire. À 180°, il est à l'envers, coupole en bas. Après Confirmer, « Silo 1 » reste couché sur la carte de façon permanente (placed[].rotation est persisté). La balise à 180° a l'arc vers le bas et flotte au-dessus de sa case. Une parcelle tournée de 90° devient une barre verticale hors de la grille iso.
- **Cause probable :** styles.css l.32 : `.entity .object{transform:translateX(-50%) rotate(var(--entity-rotation))}`, avec `--entity-rotation:${entity.rotation}deg` (ui.js entityMarkup, alimenté par ui.build.rotation et conservé par model.place()).
- **Piste de correctif :** Ne jamais faire de rotate() 2D sur un objet iso. Mapper la rotation sur des variantes (classes .facing-n/e/s/w, scaleX(-1) pour 90° et 270°, sprites dédiés) en gardant l'ancrage en bas. Désactiver « Tourner » pour les objets symétriques.

## G24 · Les zones de clic des cases ne correspondent pas au losange visible : la moitié basse sélectionne la case voisine

- **Gravité :** haute · **Zone :** construction / carte · **Viewport :** 390×844 (tactile), 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », « Construire », choisir « Silo compact » ou « Balise florale ». 2. Toucher la moitié basse du losange 2:2 (environ 12 px sous son centre), puis près de son coin droit et de son coin gauche. 3. Refaire sur 0:1 à environ 20 px du centre.
- **Attendu :** La case dessinée sous le doigt devient candidate.
- **Observé :** Moitié basse de 2:2 → la candidate devient 3:3 ; coin droit → 2:3 ; coin gauche → l'entité Parcelle A. Sur 544 points mesurés dans les losanges : 145 touchent la bonne case, 240 la case voisine de devant, 157 une entité. Seuls le centre et le haut du losange donnent la bonne case.
- **Cause probable :** styles.css `.tile{width:76px;height:76px}` est une boîte carrée, alors que le losange visible (::before rotate(45deg) scaleY(.54)) fait environ 76×41. Les boîtes voisines se chevauchent et le z-index row+col le plus élevé l'emporte.
- **Piste de correctif :** Ajouter à .tile un `clip-path: polygon(50% 21%,100% 50%,50% 79%,0 50%)` qui rogne aussi la zone de clic, ou trouver la case par projection iso inverse du point cliqué.

## G25 · Les boîtes transparentes des entités volent les clics : un clic sur un objet ouvre son voisin, et les cases derrière un bâtiment ne sont pas cliquables

- **Gravité :** haute · **Zone :** entités / construction · **Viewport :** 1280×900, 834×1112, 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », rotation 0°. 2. Cliquer au centre visuel de la Parcelle A (pousses vertes, en haut du trio, ≈525,420 en 1280×900) et lire le titre de l'inspecteur. 3. Fermer, puis cliquer au centre de la Parcelle C. 4. Avec 1 rotation, cliquer la Parcelle B ; avec 3 rotations, cliquer la Parcelle A. 5. Construire → Balise florale → cliquer le centre de la case 1:3 (derrière la serre), 0:5 (derrière la Tour), 2:1 ou 3:1 (derrière les parcelles A et B).
- **Attendu :** Le clic touche l'objet ou la case visible sous le pointeur. Une case occupée affiche « case occupée ».
- **Observé :** Clic sur Parcelle A → la fiche « Parcelle C » s'ouvre ; Parcelle C → « Entrepôt » ; à 90°, Parcelle B → « Parcelle C » ; à 270°, Parcelle A → « Parcelle B ». En construction, les clics sur 1:3, 0:5, 2:1 et 3:1 tombent sur la serre, la Tour ou une parcelle, et sont ignorés sans retour (la candidate ne change pas).
- **Cause probable :** Chaque entité est un <button> transparent de 70×74 px (88 pour le Bastion), avec margin-top -56px et z-index 100+row+col, bien plus grand que son sprite. Il recouvre les objets et les cases situés derrière. app.js handleClick ignore les entités en mode construction.
- **Piste de correctif :** `.entity{pointer-events:none}` et `.entity .object{pointer-events:auto}` (ou un clip-path qui suit l'objet). En mode construction, mettre `pointer-events:none` sur toutes les entités, ou rediriger le tap vers la case de l'entité avec un retour « occupée ».

## G36 · Libellés des marqueurs d'incident superposés (« …ouchée »), plantations et Tour masquées, Tour intouchable

- **Gravité :** haute · **Zone :** incidents / marqueurs / libellés · **Viewport :** 390×844, 834×1112, 1280×900 (toutes rotations) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. « Jour +1 », choisir « Dévier à la main · gratuit », fermer. 3. « Jour +1 », choisir « Récolter tôt · gratuit », fermer (jour 3, deux incidents) et regarder la zone des parcelles. 4. « Jour +1 », « Couper le relais · gratuit », fermer et regarder la Tour. 5. Toucher la Tour (≈343,403 en mobile).
- **Attendu :** Chaque étiquette est lisible et ne recouvre pas les autres. Le marqueur ne cache pas l'objet concerné, la Tour reste touchable, et les étiquettes restent dans l'écran.
- **Observé :** « Insectes dans les cultures » recouvre « Irrigation bouchée », qui se lit « …ouchée » : en 390, rectangles [68–209] et [151–254] à la même hauteur ; en 1280, [412–602] et [523–663] (y 421–446), soit 79 px de chevauchement. Le libellé Insectes mesure 190 px malgré max-width 150. Les deux pastilles et leurs étiquettes cachent les parcelles A, B et C. « Tour instable » couvre l'antenne et le corps de la Tour et du Bastion, et déborde à droite en 390 (right 399 > 390). Toucher la Tour ou le centre de la Parcelle B ouvre l'incident, car le <b> du marqueur intercepte le toucher.
- **Cause probable :** ui.js INCIDENT_META : insects (4,2) et irrigation (3,3) ont la même ordonnée iso (row+col=6), à 64–86 px d'écart, avec le même z (2106). incidentMarkersMarkup place les marqueurs en `left:x+25; top:y-50`, sans évitement de collision. styles.css `.incident-marker b{min-width:max-content;max-width:150px}` : min-width l'emporte, l'étiquette ne passe jamais à la ligne et reste toujours visible, sans pointer-events:none.
- **Piste de correctif :** N'afficher l'étiquette qu'au survol, au focus, à la sélection ou pour le dernier incident, ou la raccourcir (« Irrigation », « Insectes »). Sinon `min-width:0;white-space:normal`. Empiler ou décaler les marqueurs voisins, mettre pointer-events:none sur le <b>, borner l'étiquette au viewport, et placer le marqueur au-dessus du sommet de l'objet.

## G73 · Glisser-déposer depuis le catalogue : la miniature est détruite au dragstart, le drag s'interrompt, le halo « zone de dépôt » reste collé et le pan est bloqué

- **Gravité :** haute · **Zone :** construction / drag and drop · **Viewport :** 1280×900 (souris) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 1280×900, « Passer ». 2. Cliquer « Construire ». 3. Presser la souris sur la miniature « Silo compact », la déplacer vers la case 2:2 et relâcher (ou la relâcher hors de la carte, sur le dock). 4. Essayer ensuite de faire glisser la carte (zone vide en bas à gauche). 5. Fermer le mode construction (×) et regarder les bords de la carte.
- **Attendu :** Pendant le glisser, le fantôme suit les cases. Au relâchement, il s'aimante sur 2:2 et le toast « Fantôme aimanté » apparaît. Ensuite la carte se déplace normalement et le cadre de dépôt disparaît.
- **Observé :** Seul dragstart est émis : aucun dragover, drop ni dragend. Il n'y a ni fantôme ni case candidate, et la consigne reste « 2. Choisis une case ». Après dragstart, la miniature source n'est plus dans le DOM (isConnected = false). #map-viewport garde .is-drop-target (liseré crème de 5 px) même après la sortie du mode construction. En construction, le pan ne marche plus (caméra inchangée après un glisser de 80 px). Contrôle : avec une source draggable non re-rendue, dragover et drop fonctionnent.
- **Cause probable :** app.js handleDragStart() → chooseBuildType() → renderBuild() remplace `#build-catalog.innerHTML`. L'élément source est détaché pendant dragstart et Chromium abandonne le glisser. dragend, émis sur un nœud détaché, n'atteint jamais document : ui.build.dragging reste true (startPan sort aussitôt) et is-drop-target n'est jamais retirée. toggleBuildMode ne la retire pas non plus.
- **Piste de correctif :** Dans dragstart, ne pas re-rendre le catalogue : basculer seulement .is-selected et aria-pressed sur l'élément existant, ou différer le rendu par setTimeout(0). Écouter dragend et drop en capture sur window ou #build-catalog. Dans toggleBuildMode(false), handleMapDrop et au pointerdown, retirer .is-drop-target et remettre dragging à false. La consigne « glissez la miniature » s'affiche aussi sur mobile tactile, où le DnD HTML5 ne démarre pas.

## G04 · Mobile : le toast masque « Terminer » et « Arrêter » juste après « Commencer » (titre long : toast de 112 à 130 px)

- **Gravité :** moyenne · **Zone :** toast · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer », attendre 4 s. 2. Quêtes → Ajouter. Titre de 180 caractères avec espaces (« Appeler le service de l’assurance habitation pour contester la hausse de prime et demander une soumission comparative… »), Priorité 10, Durée 1, Effort 1 → Enregistrer. 3. Fermer la feuille. 4. Toucher la carte conseillée pour la déplier, puis « Commencer ». 5. Dans les 3,8 s, tester elementFromPoint au centre de « Terminer » (≈106,669).
- **Attendu :** « Terminer » et « Arrêter » restent visibles et touchables. Le toast ne cache aucune action.
- **Observé :** Le toast (y 642–754, 112 px, qui répète tout le titre) recouvre « Terminer » et « Arrêter » pendant 3,8 s : elementFromPoint renvoie strong#toast-title. Après l'ajout, le toast fait 130 px et masque aussi les boutons Commencer, Modifier et Supprimer de la nouvelle quête.
- **Cause probable :** styles.css l.52 : `.toast{position:fixed;bottom:calc(90px + safe);z-index:110}` sans pointer-events:none, avec une hauteur qui grandit avec le texte. app.js showToast(…, task.task) recopie le titre entier.
- **Piste de correctif :** Sur mobile, placer le toast en haut sous le HUD ou au-dessus de la carte conseillée, avec `pointer-events:none`. Limiter le texte à une ligne (ellipsis) et ne pas répéter le titre.

## G08 · Tablette et desktop : le toast masque pendant 3,8 s Terminer/Arrêter, la navigation, le catalogue de construction et l'inspecteur

- **Gravité :** moyenne · **Zone :** toast · **Viewport :** 834×1112, 1024×768, 1112×834, 1280×900 · **Vérification :** confirmed
- **Reproduire :** A) 834×1112 : contexte neuf, « Passer », attendre 4 s, déplier la tâche conseillée (bas gauche), puis « Commencer ». B) 1280×900 : contexte neuf, « Passer », cliquer « Jour +1 » (la feuille Irrigation s'ouvre à droite), ou 3 fois de suite. C) 834×1112 : cliquer « Construire ». D) 1024×768 : Construire → Balise → case 2:3 → Confirmer.
- **Attendu :** Le toast s'affiche dans une zone libre et ne cache aucun contrôle.
- **Observé :** A) Le toast « Quête lancée » (197–637 × 1027–1087) recouvre entièrement « Arrêter » et 35 px de « Terminer », ainsi que les onglets Ferme et Quêtes. B) Le toast (x 420–860, y 815–875) recouvre la rangée Ferme/Quêtes/Construire/Bastion du lower-deck, décalée en x 502–832 par body.has-sheet, et déborde de 9 px dans l'inspecteur. Même chose après chaque action faite depuis une feuille. C) Le toast « Construction » cache le bas du catalogue (Balise florale) et le texte d'aide. D) « Construction terminée » chevauche le bas de « Tourner ».
- **Cause probable :** styles.css (≥700 px) : `.toast{left:50%;bottom:25px;z-index:110}`. Le toast est centré sur la fenêtre, sans tenir compte de la tâche conseillée, du lower-deck (`body.has-sheet .lower-deck{right:448px}`), du dock de construction ni de l'inspecteur. Pas de pointer-events:none.
- **Piste de correctif :** Ancrer le toast en haut de la zone carte (sous le ruban) ou au-dessus du dock actif. Le centrer sur la zone carte (`left: calc((100% - var(--sheet-w, 0px)) / 2)`) et ajouter `pointer-events:none`.

## G10 · Téléphones : la page déborde et la nav collante recouvre la bande Chapitre (barre de progression, puis « Jour +1 »)

- **Gravité :** moyenne · **Zone :** chapitre / nav du bas · **Viewport :** 390×844, 375×667, 360×740, 320×640 (OK à 430×932) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer », attendre 4 s. 2. Mesurer document.documentElement.scrollHeight. 3. Regarder sous « 1 sur 6 · Remettre l’Orée en mouvement ». 4. Glisser verticalement sur la carte conseillée. 5. Refaire en 375×667 et 320×640.
- **Attendu :** L'app occupe exactement la hauteur de l'écran, et la bande Chapitre (texte, Jour +1, barre de progression) est visible au-dessus de la nav, sans défilement.
- **Observé :** 390×844 : scrollHeight = 856 (752 à 360×740). Le titre du chapitre passe sur 2 lignes, la bande fait 83 px au lieu de 71, et la `.game-nav` collante (y 783–844) cache entièrement `.chapter-track` (y 783–788). Un glisser sur la carte fait défiler toute l'app de 12 px. 375×667 : la nav (606–667) recouvre la moitié basse de « Jour +1 » (576–620) et coupe le titre. 320×640 : « Jour +1 » est entièrement caché. Après la 1re quête (titre plus court), la page repasse à 844 : la mise en page dépend de la longueur du texte.
- **Cause probable :** styles.css l.74 (≤699) : `.world{height:calc(100dvh - 66px - 133px);min-height:496px}` code en dur 133 px pour le pont inférieur, qui en mesure 145 avec un titre sur 2 lignes. min-height 496 force le débordement sur petit écran. `.game-nav{position:sticky;bottom:0}` (l.46) se colle alors par-dessus la bande. Sur iPhone, --safe-bottom agrandit encore la nav.
- **Piste de correctif :** Mise en page en colonne (`#main-layout{display:flex;flex-direction:column;height:calc(100dvh - 66px)}`, `.world{flex:1;min-height:0}`, ou grille 100dvh auto/1fr/auto), sans hauteur codée ni sticky sur mobile. Ou `.chapter-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`.

## G14 · Pendant l'animation de rotation, tous les bâtiments et libellés penchent (jusqu'à −90°) puis se redressent

- **Gravité :** moyenne · **Zone :** animation / carte · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Ralentir les animations (CDP Animation.setPlaybackRate 0.05) ou échantillonner par requestAnimationFrame. 3. Toucher « Tourner la carte ». 4. Capturer entre 40 et 150 ms après le clic.
- **Attendu :** Les objets restent droits pendant tout le tour de la carte.
- **Observé :** Rotation nette des entités (scène + contre-rotation) : −90° à t=3 ms, −50° à 40 ms (l'entrepôt est couché), −36° à 53–60 ms, −14° à 103 ms, −11° à 120 ms, puis 0° vers 290 ms. Serre, entrepôt, parcelles, Tour, Bastion et étiquettes sont couchés puis se redressent : un effet de toupie. La transition `.entity{transition:transform .3s}` ne joue jamais (0 transitionrun mesuré).
- **Cause probable :** app.js setCamera → renderMap() recrée #entity-layer par innerHTML avec `--counter-rotation` déjà à sa valeur finale, alors que #map-stage anime `transform .38s`. Les nœuds recréés n'ont pas d'état de départ pour une transition.
- **Piste de correctif :** Ne pas reconstruire le DOM lors d'un changement de caméra. Déclarer `@property --counter-rotation{syntax:'<angle>';inherits:true;initial-value:0deg}`, la poser sur #map-stage avec la même durée et la même courbe que la transformation. La reprojection iso supprime le problème.

## G17 · Les marqueurs d'incident tournent avec la carte : à 180°, ils passent sous leur case, et celui de la Tour se pose sur le Bastion

- **Gravité :** moyenne · **Zone :** incidents / rotation · **Viewport :** 1280×900, 834×1112 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Cliquer 3 fois « Jour +1 » (jour 4, 3 incidents actifs) en fermant chaque fiche d'incident. 3. Cliquer 1, 2 puis 3 fois « Tourner la carte ».
- **Attendu :** Chaque « ! » reste au-dessus de l'objet concerné, quelle que soit la rotation.
- **Observé :** Décalage entre le marqueur et le centre de sa tuile : 0° → (+25, −50) ; 90° → (+50, +25) ; 180° → (−25, +50) ; 270° → (−50, −25). À 180°, « Tour instable » recouvre la façade du Bastion, « Irrigation » et « Insectes » flottent sous les parcelles, et l'étiquette des insectes recouvre « Irrigatio… ».
- **Cause probable :** ui.js incidentMarkersMarkup : `left:${x + 25}px;top:${y - 50}px` dans le repère de la scène tournée. Le décalage subit la rotation, et seule l'icône est contre-tournée (`transform:rotate(var(--counter-rotation))`).
- **Piste de correctif :** Placer le marqueur au centre de la tuile et appliquer le décalage après la contre-rotation : `transform: rotate(var(--counter-rotation)) translate(25px, -50px)`. Ou calculer les positions écran en JS, ou reprojeter la grille.

## G19 · 4e quart de tour (270° → 0°), « Recentrer » ou touche 0 depuis 270° : la carte fait trois quarts de tour à l'envers

- **Gravité :** moyenne · **Zone :** animation / carte · **Viewport :** 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Cliquer 3 fois « Tourner la carte » (270°), en attendant 0,5 s entre chaque. 3. Cliquer une 4e fois (ou « Recentrer », ou 0 avec le focus sur la carte). Échantillonner l'angle de la scène toutes les 60 ms.
- **Attendu :** Un quart de tour supplémentaire dans le même sens (270° → 360°).
- **Observé :** Angle de la scène dans le temps : −90 → 109/149 → 32/12 → 9 → 0. La carte tourne de 270° en sens inverse, avec les bâtiments couchés pendant le mouvement.
- **Cause probable :** app.js setCamera : `next.rotation = ((next.rotation % 360) + 360) % 360;` ramène 360 à 0, et la transition CSS interpole de rotate(270deg) à rotate(0deg) par le chemin long. Même chose pour recenter (rotation:0).
- **Piste de correctif :** Garder un angle cumulé non borné pour le CSS (360, 450…) et ne normaliser modulo 360 que pour la logique. Pour Recentrer, prendre le chemin le plus court vers le multiple de 360 le plus proche.

## G20 · La ferme n'est pas centrée en ≥700 px et tourne autour d'un point décalé (saut d'environ 72 à 144 px à chaque quart de tour)

- **Gravité :** moyenne · **Zone :** carte / caméra · **Viewport :** 1280×900 (scène 820×570), 834×1112 et 1112×834 (scène 760×540), aussi 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 1280×900, « Passer ». 2. Cliquer « Recentrer » (icône maison). 3. Comparer le centre du losange de tuiles au centre de la carte. 4. Cliquer 1, 2 puis 3 fois « Tourner la carte » et noter la position du losange.
- **Attendu :** Recentrer place la ferme au centre de la carte, et la rotation pivote autour du centre de la ferme.
- **Observé :** Après Recentrer, le centre de la grille est à (562–568, 467–469) pour une carte centrée en (640, 486), soit environ 72–78 px trop à gauche et 19 px trop haut. Pendant les rotations, ce centre se déplace : (568,467) → (683,438) → (712,553) → (597,582), jusqu'à 144 px en x et 115 px en y. La ferme orbite autour du centre au lieu de tourner sur place.
- **Cause probable :** ui.js isoPosition : origine codée en dur (`x: 338 + …, y: 88 + …`) pour une scène de 680×470. styles.css porte `.map-stage` à 760×540 (≥700 px) et 820×570 (≥1050 px), avec transform-origin 50% 50%, ce qui décale le centre de rotation par rapport à la grille.
- **Piste de correctif :** Garder `.map-stage` à taille fixe (680×484) et laisser le zoom gérer l'échelle, ou calculer l'origine d'isoPosition à partir du centre de la scène (x = W/2, y = H/2 − 154). Mettre transform-origin au centre de la grille.

## G26 · Feuilles et inspecteur : ouverture qui fait sauter la carte, fond crème vide, fermeture instantanée sans animation

- **Gravité :** moyenne · **Zone :** feuille / animation · **Viewport :** 390×844 (bottom sheet), 834×1112, 1112×834, 1280×900 (split-view) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Cliquer « Quêtes » (ou une entité) en capturant à 60 ms et en échantillonnant par requestAnimationFrame la position de `.sheet-panel`, la visibility de #game-sheet, l'opacité du voile et la position de l'Entrepôt. 3. Fermer (× ou Échap, ou toucher le voile en mobile) et échantillonner de nouveau.
- **Attendu :** Le panneau glisse avec son fond. La carte se décale en douceur, ou ne bouge pas. À la fermeture, le panneau ressort en glissant (0,32 s) et le voile s'estompe.
- **Observé :** Mobile : à t=80 ms après la fermeture, panelTop vaut 423 mais visibility est déjà 'hidden', avec le voile encore à 0,94 d'opacité. Tout disparaît d'un coup et l'animation se joue invisible (l'ouverture, elle, glisse bien). Split-view : dès la 1re image, la carte passe de 834 à 484 px (tuile 0:0 de x=337 à 162) ou se décale de 215 px en 1280 (Entrepôt de x=490 à 275 en moins de 40 ms). Le dock bas et la tâche conseillée sautent aussi. Une colonne crème vide de 430 px apparaît avant que le contenu glisse dedans (« + Ajouter » coupé). À la fermeture, le panneau disparaît instantanément et la carte ressaute.
- **Cause probable :** styles.css l.47 : `.sheet{visibility:hidden}` et `.sheet.is-open{visibility:visible}` sans transition retardée. En ≥700 px, le fond et la bordure sont sur `.sheet` et non sur `.sheet-panel` (seul translaté). `body.has-sheet #main-layout{margin-right:430px}`, `.lower-deck{right:…}` et `.recommended-task{bottom:180px}` changent sans transition, et `.map-stage{left:50%}` se recentre aussitôt.
- **Piste de correctif :** `.sheet{transition:visibility 0s linear .32s}` et `.sheet.is-open{transition-delay:0s}` (comme `.toast`). Déplacer fond et bordure sur .sheet-panel. Animer margin-right, right et bottom (.32s), ou superposer la feuille sans redimensionner et compenser par camera.x.

## G27 · Dans la feuille Quêtes, l'en-tête et le bouton Fermer partent avec le défilement, et la poignée ne réagit pas au glisser

- **Gravité :** moyenne · **Zone :** feuille · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Nav « Quêtes ». 3. Faire défiler `.sheet-panel` à mi-hauteur. 4. Glisser au doigt vers le bas sur `.sheet-grabber`, sur 400 px.
- **Attendu :** L'en-tête (titre et ×) reste collé en haut de la feuille, et glisser la poignée vers le bas ferme la feuille.
- **Observé :** Après défilement, l'en-tête est à y=-1256 et le bouton × est hors écran : il faut remonter tout en haut ou viser le voile. Le glisser sur la poignée laisse la feuille ouverte. La liste est très longue (16 lignes de 120 px, 2 423 px de défilement).
- **Cause probable :** styles.css l.47 : `.sheet-header` est placé dans `.sheet-panel{overflow:auto}` sans `position:sticky`. Aucun gestionnaire de pointeur sur `.sheet-grabber`.
- **Piste de correctif :** `.sheet-header{position:sticky;top:-5px;z-index:2;background:#fff8e8}`. Ajouter un glisser-pour-fermer sur la poignée (pointer events, seuil d'environ 80 px). Compacter les lignes de quête (actions secondaires dans un menu).

## G28 · Popover des ressources : pleine largeur sans ancrage, couvre le ruban Objectifs et le zoom, ne se ferme ni au 2e toucher ni à l'extérieur, aria-expanded faux

- **Gravité :** moyenne · **Zone :** HUD · **Viewport :** 390×844, 360×740, 834×1112, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Toucher « Énergie », puis « Matériaux », puis « Confiance » (150 ms entre chaque) et lire aria-expanded. 3. Retoucher « Confiance ». 4. Tester elementFromPoint sur le bouton Objectifs (347,104). Variante 1280×900 : cliquer la Tour (l'inspecteur s'ouvre), puis « Confiance » deux fois.
- **Attendu :** Une petite bulle ancrée sous la ressource touchée (avec une flèche), qui se ferme au 2e toucher, au toucher extérieur et à Échap, avec aria-expanded=true sur la ressource active.
- **Observé :** Après « Matériaux » et « Confiance », aria-expanded vaut [false,false,false] alors que le popover est ouvert. Retoucher la même ressource ne ferme rien, et un toucher ailleurs non plus. Le popover reste jusqu'à 5,2 s. En mobile, il couvre x 12–378, y 70–152, sans flèche, et recouvre la bande « Maintenant », le bouton Objectifs, le nom « Solène » et le haut du bouton −, en bloquant les touchers. En 1280×900, il couvre x 12–1268 (y 76–139), masque le ruban et le bouton Dézoomer, et se fait couper par l'inspecteur. Il apparaît sans animation.
- **Cause probable :** app.js handleClick, branche resource : `aria-expanded = item === resource && popover.hidden` (faux dès que le popover est ouvert), et `hidden = false` est toujours réappliqué, sans bascule ni écoute du clic extérieur. styles.css l.25/62 : `.resource-popover{position:absolute;left:12px;right:12px}` par rapport à tout .resource-dock.
- **Piste de correctif :** Gérer une vraie bascule : fermer au 2e clic sur la même ressource, au pointerdown extérieur et à Échap. Mettre aria-expanded selon l'état réel. Ancrer la bulle sous le bouton (largeur max 280 px) avec une flèche. Ajouter un fondu et un léger glissement.

## G30 · Au toucher, les noms des éléments de la carte sont invisibles, et l'étiquette du Bastion sort de l'écran

- **Gravité :** moyenne · **Zone :** libellés · **Viewport :** 390×844, 360×740 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Observer la carte sans rien toucher. 3. Toucher le Bastion (≈381,388) et fermer la feuille.
- **Attendu :** Sur écran tactile, chaque bâtiment est identifiable (noms visibles, au moins à partir d'un certain zoom), et les étiquettes restent dans l'écran.
- **Observé :** Les 8 `.tag` sont à opacité 0 tant qu'aucun élément n'est sélectionné : on ne sait pas ce qu'est chaque objet. L'étiquette « Bastion des lisières » s'étend jusqu'à x=436 sur un écran de 390 et s'affiche tronquée en « Bastion des ».
- **Cause probable :** styles.css l.32 : `.entity .tag{opacity:0}`, visible seulement sur `:hover`, `:focus-visible` ou `.is-selected`, états qui n'existent pas au toucher. Aucun recalage en bord d'écran.
- **Piste de correctif :** Afficher les noms en permanence au zoom ≥ 0,9 ou via un bouton « Étiquettes ». Recaler l'étiquette dans le viewport (translateX calculé), ou la placer à gauche quand l'objet est au bord droit.

## G31 · Libellés de la carte illisibles sur mobile (environ 8,9 px, 7,8 px au zoom minimum)

- **Gravité :** moyenne · **Zone :** libellés / carte · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. « Jour +1 » → Échap. 3. Regarder l'étiquette « Irrigation bouchée ». 4. « Dézoomer » ×2 pour le pire cas.
- **Attendu :** Des libellés d'au moins 12 px à l'écran, quel que soit le zoom.
- **Observé :** Taille CSS de 12 px multipliée par le zoom 0,74, soit 8,9 px rendus (7,8 px à 0,65). Même chose pour les étiquettes d'entités et « Aperçu : … ».
- **Cause probable :** Les libellés sont dans #map-stage, mis à l'échelle par `scale(${zoom})` (app.js applyCamera), avec un zoom mobile par défaut de 0,74.
- **Piste de correctif :** Exposer `--zoom` sur la scène et contre-échelonner les libellés (`scale: calc(1 / var(--zoom))`), ou les placer dans une surcouche HTML en coordonnées écran.

## G32 · La sélection reste active après la fermeture de la fiche et s'affiche pendant d'autres panneaux

- **Gravité :** moyenne · **Zone :** carte / feuilles / état · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Toucher la Parcelle B (≈120,387 en mobile) ou l'Entrepôt. 3. Fermer la fiche avec × ou Échap. 4. Toucher « Jour +1 », ou ouvrir « Quêtes ». Variante : toucher la Tour, « Inspecter avec Milo », fermer, puis avancer de plusieurs jours.
- **Attendu :** Fermer la fiche désélectionne l'entité (halo et étiquette disparaissent). La fiche incident met en avant l'incident, pas l'objet précédent.
- **Observé :** Après ×, `.entity.is-selected` vaut ['plot-b'] (vérifié pour les 8 entités) : l'étiquette et le halo restent, et l'objet reste à z 3000 au-dessus de tout. Pendant la fiche « Irrigation bouchée » ou le panneau Quêtes, l'étiquette « Parcelle B » ou « Entrepôt » reste affichée. L'étiquette « Tour météo » reste visible plusieurs jours après.
- **Cause probable :** app.js : closeSheet() remet activePanel à null sans remettre `ui.selectedEntityId` à null ni relancer renderMap. openSheet('incident:…') ne désélectionne pas non plus.
- **Piste de correctif :** Dans closeSheet, et à l'ouverture de tout panneau autre que 'entity', faire `ui.selectedEntityId = null; renderMap()`.

## G33 · Une entité sélectionnée passe devant les objets du premier plan et devant les marqueurs d'incident, qu'elle rend intouchables

- **Gravité :** moyenne · **Zone :** entités / incidents / profondeur · **Viewport :** 1280×900, 390×844 · **Vérification :** confirmed
- **Reproduire :** A) 1280×900 : contexte neuf, « Passer », cliquer la Parcelle C (par son libellé ou juste au-dessus du toit de l'Entrepôt), puis observer le toit de l'Entrepôt. B) Contexte neuf, « Passer », toucher la Tour, « Inspecter avec Milo », fermer. Cliquer 3 fois « Jour +1 » (choix gratuits, fermer chaque feuille). Toucher la Parcelle A, fermer, puis toucher le marqueur « Insectes ».
- **Attendu :** Seuls le libellé et le halo passent au premier plan : l'objet garde sa profondeur, et les marqueurs restent au-dessus des objets et touchables.
- **Observé :** A) Tout le bouton passe à z-index 3000 : le sol de la Parcelle C et son libellé recouvrent le toit de l'Entrepôt, pourtant devant. B) La Tour sélectionnée (z 3000) passe devant le marqueur « Tour instable » (z 2107) et l'antenne coupe l'étiquette (« To|r instable »). La Parcelle A sélectionnée recouvre le marqueur Insectes : un tap sur ce marqueur ouvre la Parcelle A (Playwright : intercepté par .entity.plot.is-selected). L'étiquette « Parcelle A » s'empile sur les deux étiquettes d'incident.
- **Cause probable :** ui.js entityMarkup : `const depth = ghost || selected ? 3000 : 100 + row + col`, alors que les marqueurs sont à 2100+row+col.
- **Piste de correctif :** Garder la profondeur normale de l'objet et ne monter que le libellé, dans une couche de libellés séparée (en dessous de 2100 ou au-dessus des marqueurs selon le cas). Ajouter un contour de sélection au sol. Masquer l'étiquette de l'entité quand un marqueur est présent.

## G34 · Le libellé d'une entité survolée ou focalisée passe sous les entités de devant (« B▮stion », « arcelle A »)

- **Gravité :** moyenne · **Zone :** libellés / profondeur · **Viewport :** 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Survoler le Bastion (en haut à droite de la ferme). 3. « Zoomer » ×4 (facultatif), Tab jusqu'à la carte, puis Tab : le focus arrive sur la Parcelle A.
- **Attendu :** Le libellé survolé ou focalisé passe au-dessus de tout, comme celui de l'entité sélectionnée.
- **Observé :** Le fût de la Tour traverse « Bastion des lisières ». Le « P » (ou « Pa ») de « Parcelle A » est caché par les parcelles B et C. L'anneau de focus, un grand rectangle, est masqué sur deux côtés. Au survol, l'entité de devant capte en plus le pointeur.
- **Cause probable :** styles.css : `.tag` (z-index 12/20) est enfermée dans le contexte d'empilement de son bouton (`z-index` en ligne 100+row+col, plus filter et transform) et ne peut pas dépasser une entité voisine plus profonde. Seule la sélection monte à 3000.
- **Piste de correctif :** `.entity:hover, .entity:focus-visible{z-index:2999 !important}`, ou mieux, rendre les libellés dans une couche à part au-dessus de #entity-layer, positionnée sur la même ancre.

## G35 · Le focus est perdu (retour sur body) après la plupart des actions et re-rendus ; la liste des quêtes saute à la réactivation

- **Gravité :** moyenne · **Zone :** accessibilité / focus · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Toucher une entité (ou Tab jusqu'à l'Entrepôt + Entrée), puis × ou Échap, et lire document.activeElement. 3. Même lecture après « Commencer », « Terminer », × de la bulle, fin de l'onboarding, Supprimer → confirmer, Entrée sur la carte « Conseillée », fiche Bastion → « Voir la Tour » → Échap. 4. Desktop : Tab ×5 jusqu'à la carte, puis Tab (focus sur la Parcelle A), appuyer sur + ou R, puis Flèche gauche. 5. Quêtes → défiler en bas → « Réactiver » une quête terminée, en lisant scrollTop avant et après.
- **Attendu :** Le focus revient sur le déclencheur (entité, carte, case) ou sur l'élément logique suivant. Les flèches continuent de déplacer la caméra, et la liste ne saute pas.
- **Observé :** document.activeElement vaut BODY dans tous ces cas. Après +, Flèche gauche ne fait plus rien (caméra inchangée). À la réactivation, scrollTop passe de 2 423 à 2 072 (saut visuel) et le focus est perdu.
- **Cause probable :** app.js renderAll, renderMap et renderTask remplacent l'innerHTML (y compris à chaque setCamera et selectEntity→renderAll). ui.lastFocus pointe vers un nœud détaché, et closeSheet appelle `ui.lastFocus?.focus?.()` sans effet.
- **Piste de correctif :** Restaurer le focus par sélecteur stable après rendu (`[data-select-entity="${id}"]`, `[data-toggle-task]`, `[data-map-cell]`) dans un requestAnimationFrame. Mettre à jour le DOM en place, sans reconstruction pour un simple changement de caméra. Conserver et restaurer scrollTop, et animer la ligne qui change de section.

## G38 · Cadrage initial sur mobile : Bastion coupé au bord droit, Tour collée sous les contrôles (sous « + » à 360 px)

- **Gravité :** moyenne · **Zone :** carte / cadrage · **Viewport :** 390×844, 360×740 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 360×740 (ou 390×844) mobile, « Passer ». 2. Observer le bord droit de la carte et la colonne de contrôles.
- **Attendu :** Tous les bâtiments principaux, et la Tour en particulier, sont entièrement visibles au chargement, hors de la colonne des contrôles.
- **Observé :** À 360, le Bastion (x 334–399) sort de l'écran et la colonne de contrôles (x 306–350, y 134–328) recouvre la tête de la Tour (x 302–354, y 324–379). À 390, le Bastion (x 349–414) est à moitié coupé et la Tour est collée sous les contrôles (x 336–380).
- **Cause probable :** app.js : caméra initiale `{x:-10,y:24,zoom:.74}` codée en dur pour innerWidth<700. Avec une scène de 680 px, la grille fait 502 px de large au zoom 0,74, et la grille n'est pas centrée dans la scène (isoPosition). Les objets du nord-est (col 6) se retrouvent au bord.
- **Piste de correctif :** Calculer le zoom et le décalage à partir de la boîte englobante des entités et de la zone libre (sans la colonne de contrôles ni la carte conseillée). À défaut, recentrer la grille vers la gauche (x ≈ -40) avec un zoom de 0,62.

## G39 · À 360×740, la carte conseillée dépliée recouvre le bouton « + » et presque toute la ferme

- **Gravité :** moyenne · **Zone :** carte conseillée · **Viewport :** 360×740 (et 390×844 avec un titre long) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 360×740 mobile, « Passer ». 2. Toucher la carte « Conseillée » pour la déplier.
- **Attendu :** Le détail s'ouvre sans masquer les contrôles de carte et laisse la ferme visible, ou passe dans une feuille.
- **Observé :** La carte dépliée va de y 298 à 599 (301 px) et recouvre `.map-controls` (jusqu'à y 328) : le bouton « + » est caché et la ferme presque entièrement couverte. Avec un titre ou un domaine long, la carte atteint 278 px même à 390.
- **Cause probable :** styles.css l.44/62 : `.recommended-task{position:absolute;bottom:8px}` sans max-height, et son z-index 25 passe au-dessus des contrôles (21).
- **Piste de correctif :** `max-height: calc(100% - 340px); overflow:auto`, ou ouvrir le détail dans la feuille du bas. Compacter les puces en une seule rangée défilante.

## G41 · Un titre sans espace (URL de 180 caractères) fait défiler la feuille Quêtes horizontalement et déborde de la boîte de suppression

- **Gravité :** moyenne · **Zone :** feuille (Quêtes) / dialogues · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Quêtes → Ajouter (titre quelconque) → Enregistrer. 3. Modifier cette quête avec un titre de 180 caractères sans espace (par exemple « Supercalifragilisticexpialidocious-https://example.org/very/long/path/without/spaces/- » répété) → Enregistrer. 4. Mesurer scrollWidth et clientWidth de `.sheet-panel`. 5. Toucher Supprimer sur la ligne.
- **Attendu :** Le texte se coupe dans sa colonne, sans défilement horizontal.
- **Observé :** `.sheet-panel` a un scrollWidth de 439 pour un clientWidth de 390 : la feuille défile latéralement et la ligne fait 424 px. Dans le dialogue de suppression, #delete-copy déborde (375 pour 352) et l'URL est coupée au bord. Le titre de la carte conseillée est rogné sans ellipse (408 contre 262).
- **Cause probable :** Aucun `overflow-wrap:anywhere` sur `.quest-row h3`, `#delete-copy`, `.toast span` ni `.task-summary strong` (styles.css l.48, 51, 52, 62).
- **Piste de correctif :** Ajouter `overflow-wrap:anywhere;word-break:break-word` sur ces éléments, et `min-width:0` sur les enfants de grille ou de flex.

## G43 · Objectifs : « Maintenant » est coché ✓ alors que l'étape n'est pas faite, et des étapes se cochent dans le désordre

- **Gravité :** moyenne · **Zone :** objectifs · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** A) 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Déplier la carte conseillée → Commencer → Terminer. 3. Toucher le bouton Objectifs (cible) de la bande. B) Contexte neuf : Bastion → Voir la Tour → Inspecter avec Milo → ouvrir Objectifs.
- **Attendu :** « Maintenant » montre l'étape courante, non cochée, avec son numéro (2). La progression reste séquentielle.
- **Observé :** A) « Maintenant : Semer malgré la cendre » est affiché avec ✓ et la classe is-done, alors que la même étape reste « 2 » non cochée dans Chapitre. B) L'étape 3 « Le signal incomplet » est cochée alors que les étapes 1 et 2 ne le sont pas. Le bandeau et la barre restent à l'étape 1.
- **Cause probable :** ui.js objectivesMarkup : `goal-item ${index >= 1 ? 'is-done' : ''}` et `<i>${index >= 1 ? '✓' : '1'}` testent index>=1 au lieu de l'état de l'étape courante. model.chapterComplete évalue chaque clé sans tenir compte de l'ordre.
- **Piste de correctif :** Pour « Maintenant », utiliser `done = model.chapterComplete(CHAPTER_STEPS[safeIndex])` et afficher `safeIndex+1`. Verrouiller les étapes futures, ou marquer « anticipée » celles faites en avance.

## G44 · Animation de récompense désynchronisée : compteurs mis à jour avant l'arrivée des particules, carte remplacée sans transition, progression cachée, signal de la Tour en rectangle jaune

- **Gravité :** moyenne · **Zone :** animation / HUD / Tour · **Viewport :** 390×844, 360×740, 1280×900 · **Vérification :** partial
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer », attendre 4 s. 2. Déplier la carte → Commencer → attendre 4 s. 3. Échantillonner par requestAnimationFrame les positions de .reward-particle, les textes de .resource b et le transform de #chapter-progress, puis toucher « Terminer ». 4. Capturer à 0, 120, 150, 400, 800 et 1500 ms. 5. Plus tard, stabiliser la Tour et zoomer sur son antenne.
- **Attendu :** Une séquence lisible : la carte s'affiche « accomplie », les particules volent vers le HUD, chaque compteur s'incrémente à leur arrivée (count-up), puis la carte suivante entre en douceur et la barre de chapitre progresse de façon visible. Le signal météo ressemble à une lumière ou à des ondes.
- **Observé :** À t=0–82 ms, les compteurs affichent déjà 15/25/2 et le « pop » se déclenche alors que les particules ne font que partir (elles arrivent vers 600 ms). La carte se replie et affiche « Nettoyer le véhicule » dans la même image, donc les particules partent d'un bouton disparu. « Maintenant » change de texte sans transition. La barre de chapitre (0,08 → 0,167 en 500 ms) s'anime sous le toast et la nav, invisible. Rien ne se passe sur la carte ni sur la parcelle. L'antenne stabilisée porte un rectangle jaune plein qui pulse comme une étiquette, et rien ne change sur la carte après l'émission du signal.
- **Cause probable :** app.js, branche data-complete-task : model.completeTask → renderAll() (re-rendu complet immédiat) → pulseResources(). Les valeurs sont écrites avant l'animation, et ui.taskExpanded=false replie la carte aussitôt. styles.css `.entity.tower.is-stable .object.tower:after{box-shadow:0 -4px 0 2px #e7db71}` (élément de 3×16) et @keyframes weather-signal.
- **Piste de correctif :** Séquencer : 1) état « accomplie » sur la carte (coche animée, ~500 ms) ; 2) particules ; 3) au transitionend (~700 ms), count-up des compteurs et pulsation ; 4) sortie de la carte et entrée de la suivante ; 5) toast en haut. Prévoir une variante reduced-motion. Pour la Tour : point lumineux rond et ondes concentriques (border-radius 50%, scale), qui persistent après l'émission.

## G45 · Encoche et barre d'accueil (safe-area) : HUD sous l'encoche, page qui déborde de 46 px et « Jour +1 » caché par la nav

- **Gravité :** moyenne · **Zone :** HUD / nav du bas / safe-area · **Viewport :** 390×844 avec safe-area top 47 / bottom 34 (CDP Emulation.setSafeAreaInsetsOverride) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. CDP Emulation.setSafeAreaInsetsOverride({insets:{top:47,bottom:34,left:0,right:0,…}}) : env(safe-area-inset-top) vaut 47px. 3. Mesurer `.resources`, `.lower-deck`, `.game-nav` et scrollHeight.
- **Attendu :** Le HUD commence sous l'encoche, et la nav (avec son padding bas) tient dans 100dvh sans recouvrir la bande chapitre.
- **Observé :** `.resources` est à y=9, donc sous une encoche de 47 px. Le pont inférieur fait 179 px et la page 890 px pour un écran de 844. La nav collante (y 749–844) recouvre la bande chapitre (712–795) et cache la moitié de « Jour +1 » et le texte du chapitre.
- **Cause probable :** styles.css l.61 : `.resource-dock{padding:7px max(9px,env(safe-area-inset-left))}` sans safe-area-inset-top. La l.74 `.world{height:calc(100dvh - 66px - 133px)}` ignore --safe-bottom, alors que `.game-nav` l'ajoute à son padding.
- **Piste de correctif :** `padding-top:max(7px,env(safe-area-inset-top))` sur le dock. Mise en page en grille 100dvh au lieu de hauteurs codées. Gérer aussi safe-area-inset-right en paysage.

## G46 · Téléphone en paysage (≥700 px de large, ~360–390 px de haut) : la mise en page desktop cache les contrôles de carte et la carte conseillée

- **Gravité :** moyenne · **Zone :** mise en page / HUD · **Viewport :** 740×360, 844×390 (rotation depuis 390×844) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. setViewportSize(844×390), comme une rotation de l'appareil, ou contexte neuf en 740×360. 3. Attendre 4 s, observer et mesurer.
- **Attendu :** Une mise en page paysage compacte où carte, contrôles et actions tiennent dans 360–390 px de haut.
- **Observé :** Le document fait 712 px de haut : la page défile, alors que la carte (touch-action:none) empêche de défiler. Le lower-deck fixe (152 px, y 220–372) recouvre la moitié droite de la carte, dont les boutons ↻ et +. La carte conseillée est hors écran (y=609). Le toast recouvre « Ferme / Quêtes ».
- **Cause probable :** styles.css l.76–83 : `@media (min-width:700px)` sans condition de hauteur. `.map-viewport{min-height:640px}`, `.lower-deck{position:fixed}`.
- **Piste de correctif :** Réserver le split-view à `(min-width:700px) and (min-height:560px)` et prévoir une variante paysage basse. Remplacer min-height:640 par 1fr.

## G50 · Onboarding en paysage : bouton principal coupé, et impossible de défiler

- **Gravité :** moyenne · **Zone :** onboarding · **Viewport :** 740×360, 667×375, 844×390 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf (localStorage vide) en 740×360. 2. Ouvrir la page sans rien toucher.
- **Attendu :** Toute la carte d'onboarding, boutons compris, est visible ou accessible par défilement.
- **Observé :** La carte s'étend de y 16 à 406 pour une fenêtre de 360 : « Prendre l’intendance » (321–387) est coupé à mi-hauteur, et en 844×390 le bas de la carte sort de l'écran. L'overlay est fixed avec overflow visible : aucun défilement possible.
- **Cause probable :** styles.css `.onboarding{position:fixed;inset:0;display:grid;place-items:center}` sans overflow-y, et `.onboarding-art{height:150px}` fixe.
- **Piste de correctif :** `.onboarding{overflow-y:auto;place-items:start center}` et `@media (max-height:480px){.onboarding-art{height:clamp(70px,22vh,150px)} .onboarding h2{font-size:1.3rem}}`.

## G52 · Le bouton « Stabiliser » désactivé ressemble à un bouton actif et n'explique pas pourquoi il est bloqué

- **Gravité :** moyenne · **Zone :** feuille (Tour) / états · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Toucher la Tour (ou Nav Bastion → « Voir la Tour »), puis « Inspecter avec Milo », et attendre 4 s. 3. Comparer « Stabiliser · 6 É · 12 M » avec un bouton primaire actif.
- **Attendu :** Un état désactivé reconnaissable, avec la raison juste à côté (« Il faut 3 Confiance »).
- **Observé :** Le bouton est disabled mais garde un texte blanc sur fond #526f59, presque identique au #3f6047 de l'état actif (ratio 1,27) : il paraît cliquable, et rien ne dit pourquoi il ne réagit pas. Le résumé « 1 / 3 Confiance » au-dessus est en plus caché par le toast pendant 3,8 s.
- **Cause probable :** styles.css l.45 : `.button.primary:disabled{color:#fff;background:#526f59}`. ui.js entitySheetMarkup n'indique pas la condition manquante.
- **Piste de correctif :** Style désactivé nettement différent (fond crème ou hachuré, texte atténué, bordure en tirets, icône cadenas) et raison affichée dans le bouton ou juste dessous.

## G57 · Aucun anneau de focus visible sur la carte (#map-viewport) au clavier

- **Gravité :** moyenne · **Zone :** accessibilité / carte · **Viewport :** 390×844, 834×1112, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Appuyer 5 fois sur Tab (3 ressources, bouton Objectifs, puis la carte, aria-label « Carte de la ferme. Flèches pour déplacer… »).
- **Attendu :** Un contour net autour de la carte indique qu'elle a le focus et accepte flèches, +, −, 0 et R.
- **Observé :** Rien ne change à l'écran, alors que le focus est bien sur #map-viewport (les touches fonctionnent).
- **Cause probable :** styles.css `[tabindex]:focus-visible{outline:3px solid #153f3f;outline-offset:3px}` : le contour est dessiné à l'extérieur de la carte, et `.world{overflow:hidden}` (même taille) le rogne entièrement.
- **Piste de correctif :** `.map-viewport:focus-visible{outline-offset:-6px}`, ou `box-shadow: inset 0 0 0 3px #153f3f`.

## G58 · Tab vers une entité hors champ fait défiler la carte en cachette : déchirure verticale du voile et caméra désynchronisée

- **Gravité :** moyenne · **Zone :** carte · **Viewport :** 834×1112 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Cliquer dans le ciel de la carte pour lui donner le focus (ou Tab ×5). 3. Appuyer 6 fois sur +, puis 6 fois sur Maj+Flèche gauche : le Bastion sort à droite. 4. Appuyer 2 fois sur Tab (focus sur le Bastion).
- **Attendu :** La caméra se déplace (camera.x) pour montrer le Bastion, sans artefact.
- **Observé :** Le navigateur fait défiler le conteneur overflow:hidden (#map-viewport.scrollLeft = 403). Le voile `.map-wash` défile avec, ce qui crée une coupure verticale nette vers x≈430 : plus sombre à gauche, plus clair à droite, avec des crêtes décalées. Le modèle de caméra ignore ce décalage. Le libellé du Bastion est aussi barré par la Tour.
- **Cause probable :** styles.css `.map-viewport{overflow:hidden}` reste défilable par programme ou par le focus, et les entités (boutons focalisables) peuvent sortir du cadre.
- **Piste de correctif :** Utiliser `overflow: clip` sur .map-viewport et .world. Sur focusin dans la carte, recadrer la caméra sur l'entité focalisée.

## G59 · Tablette de 700 à ~815 px de large (iPad portrait) : le dock bas recouvre la carte « Conseillée » (badge « PRIORIT » coupé)

- **Gravité :** moyenne · **Zone :** HUD / responsive · **Viewport :** 768×1024 (700–815 px de large) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 768×1024, « Passer », attendre que le toast disparaisse. 2. Regarder le bas de l'écran. 3. Toucher la carte « Conseillée » pour la déplier.
- **Attendu :** La tâche conseillée et le dock chapitre/navigation sont côte à côte, sans chevauchement.
- **Observé :** La tâche conseillée (x 20–450) passe sous le lower-deck (x 420–750, z 45), sur 30×78 px : le badge devient « PRIORIT » coupé. Une fois la carte dépliée, le bouton « Toutes » est en partie masqué.
- **Cause probable :** styles.css (≥700 px) : `.recommended-task{width:min(430px, calc(100% - 40px));bottom:25px}` à gauche et `.lower-deck{position:fixed;right:18px;width:330px;bottom:18px}` à droite. Ça déborde tant que la largeur est inférieure à 20+430+18+330+18 = 816 px.
- **Piste de correctif :** `.recommended-task{width:min(430px, calc(100% - 330px - 76px))}`, ou sous 820 px, empiler la tâche au-dessus du dock (bottom = hauteur du dock + 12 px).

## G60 · Panneau ouvert en mode construction : l'inspecteur recouvre le dock de construction, et le dock bas et la tâche conseillée réapparaissent par-dessus

- **Gravité :** moyenne · **Zone :** construction / feuille / z-index · **Viewport :** 834×1112, 1112×834, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Navigation > « Construire ». 3. Choisir « Silo compact » et cliquer la case 2:2. 4. Cliquer le bouton cible « Voir les objectifs » du ruban « Maintenant ».
- **Attendu :** Les objectifs restent inaccessibles pendant la construction, ou la construction se ferme proprement, ou le dock de construction reste visible et utilisable à côté de l'inspecteur.
- **Observé :** L'inspecteur (z 80) recouvre de 331 à 390 px du dock de construction (z 75, right:18px) : Tourner, Confirmer, Changer et les miniatures sont cachés. Le lower-deck et la carte conseillée, masqués en construction, réapparaissent et chevauchent ce qui reste du dock (badge PRIORITÉ et bouton « Jour +1 » coupés). Le toast chevauche le lower-deck. Classes du body : « is-building has-sheet ».
- **Cause probable :** styles.css (≥700) : `body:has(.sheet.is-open) .lower-deck, body:has(.sheet.is-open) .recommended-task{display:block}` (spécificité 0,3,1) l'emporte sur `body.is-building .lower-deck{display:none}` (0,2,1). Le `.build-dock` est fixé à right:18px, exactement sous la feuille. app.js openSheet ne quitte pas le mode construction.
- **Piste de correctif :** Dans openSheet, quitter le mode construction ou interdire l'ouverture. Sinon `body.is-building:has(.sheet.is-open) .lower-deck, … .recommended-task{display:none}` (ou !important) et décaler `.build-dock` de la largeur de l'inspecteur (`right: calc(var(--sheet-w) + 18px)`).

## G61 · Dock de construction trop haut et posé sur la carte : il masque « Zoomer », le Bastion, la Tour et des cases constructibles, sans recadrer la caméra

- **Gravité :** moyenne · **Zone :** construction / contrôles de carte · **Viewport :** 1280×720, 1024×768, 1112×834 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 1280×720 (ou 1024×768, ou 1112×834), « Passer ». 2. Navigation > Construire > « Silo compact ». 3. Cliquer une case libre (2:2 ou 2:3).
- **Attendu :** Les quatre contrôles de carte restent accessibles, et les cases constructibles et bâtiments restent visibles à côté du dock.
- **Observé :** En 1280×720, le dock (top 261, 441 px de haut) recouvre le bouton « Zoomer » (242–286). En 1112×834, le dock (x 704–1094, y 375–816) recouvre le Bastion (seules ses tours dépassent) et les cases 0:7 et 1:7. En 1024×768, il cache le Bastion, la Tour et les cases débloquables à droite.
- **Cause probable :** styles.css (≥700) : `.build-dock{right:18px;width:390px}` posé sur la carte, sans max-height. `.build-catalog{display:grid;grid-template-columns:1fr}` empile trois cartes de 74 px. `.map-controls{top:20px;right:22px}` sont dans la même colonne. toggleBuildMode ne décale pas la caméra.
- **Piste de correctif :** `max-height: calc(100dvh - 112px); overflow:auto` sur le dock, catalogue horizontal quand la hauteur est faible, décaler .map-controls quand body.is-building. Décaler camera.x d'environ la moitié de la largeur du dock (ou réserver sa place comme pour l'inspecteur) et garder la case candidate visible.

## G62 · Split-view : l'objet sélectionné finit coupé derrière l'inspecteur (« Bastion des » tronqué)

- **Gravité :** moyenne · **Zone :** feuille · **Viewport :** 834×1112 (aussi à 180°) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Cliquer « Bastion » dans la navigation, ou cliquer le Bastion sur la carte.
- **Attendu :** La caméra se recadre pour garder l'objet sélectionné et son libellé visibles dans la carte réduite.
- **Observé :** La carte se réduit à 484 px : le Bastion sélectionné est coupé au bord de l'inspecteur, et son libellé devient « Bastion des ». Objet et libellé sont hors de la zone de carte (objInView=false à 0° et à 180°).
- **Cause probable :** app.js selectEntity et openSheet ne recadrent pas la caméra, alors que la carte change de largeur via margin-right.
- **Piste de correctif :** Après l'ouverture, calculer la position de l'entité dans la zone visible (sans les surcouches) et ajuster camera.x/y par setCamera, avec la même transition.

## G72 · Composition : le plateau chevauche la ligne d'horizon et flotte dans le ciel une fois tourné ou déplacé ; un nuage dépasse sous le ruban

- **Gravité :** moyenne · **Zone :** carte · **Viewport :** 1112×834, 1280×900, 1920×1080 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Observer l'arrière de la grille au niveau des crêtes. 3. Cliquer une fois « Tourner la carte ». 4. Regarder entre le ruban « Maintenant » et la bulle de Solène.
- **Attendu :** Le plateau est posé sur le sol, sous l'horizon, et rien ne dépasse entre les cartouches.
- **Observé :** Les tuiles du fond se superposent aux montagnes. À 90°, le losange monte jusqu'à y≈100, à côté du soleil. Le ciel et les crêtes sont fixes à 41 % de la hauteur, sans lien avec la caméra. Une pastille blanche (le nuage .cloud-a) dépasse entre le ruban et la bulle.
- **Cause probable :** styles.css `.world-sky{height:41%}` est hors de la scène, sans parallaxe. `.cloud-a{left:7%;top:16%}` se trouve juste sous `.objective-ribbon`.
- **Piste de correctif :** Ancrer l'horizon à la caméra (légère parallaxe sur camera.y), borner le pan vertical pour garder le plateau sous l'horizon, et déplacer cloud-a hors de la zone du ruban.

## G74 · Case invalide en construction : Confirmer désactivé reste vert comme actif, l'étape « 3 Confirmer » s'allume, et la case garde l'anneau « valide »

- **Gravité :** moyenne · **Zone :** construction / dock · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », « Construire », « Silo compact » ou « Balise florale ». 2. Toucher une case verrouillée (par exemple 4:6, devant l'éboulis) ou une case rouge de bordure (5:0, en bas à gauche).
- **Attendu :** Le guide reste à l'étape 2 avec « Choisis une autre case », Confirmer est clairement grisé, et la case candidate est marquée invalide.
- **Observé :** La consigne dit « 2. Choisis une autre case », mais la pastille « 3 Confirmer » est surlignée. Confirmer est disabled mais garde le même vert rgb(63,96,71) et le texte blanc qu'à l'état actif. La case reçoit la même bordure crème pleine qu'une case valide (le tiret rouge est écrasé), et l'étiquette « Aperçu » cache le fantôme au contour rouge.
- **Cause probable :** styles.css `.placement-actions .place-button{background:var(--sage-dark)}` sans règle :disabled (la classe .button est absente, donc `.button:disabled` ne s'applique pas). app.js renderBuild met `step = 3` dès que placing est vrai, même si canPlace est faux. `.tile.candidate:before`, déclarée plus loin, remplace la bordure de `.tile.invalid:before`.
- **Piste de correctif :** `.placement-actions button:disabled{background:#ded9c1;color:#6b6a5c;cursor:not-allowed}`. `step = canPlace ? 3 : 2`. `.tile.invalid.candidate:before{border:3px solid #8d382c;box-shadow:0 0 0 6px rgba(141,56,44,.35)}`.

## G75 · Ressources insuffisantes en construction : fantôme « valide », consigne « Tourne ou confirme », aucun retour au tap

- **Gravité :** moyenne · **Zone :** construction / économie · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844, « Passer », attendre 4 s, « Construire », attendre 4 s. 2. « Silo compact », toucher 0:1, Confirmer. 3. Toucher 0:3, Confirmer (il reste 8 É / 6 M). 4. Attendre 4 s, toucher la case 1:1. 5. Toucher Confirmer.
- **Attendu :** Le fantôme et la consigne signalent le manque (« Il manque 2 Matériaux »), les miniatures inabordables sont grisées, et toucher Confirmer explique le refus.
- **Observé :** La consigne affiche « 3. Tourne ou confirme » et le fantôme est dessiné comme valide (liseré crème). Confirmer est disabled mais toujours vert, et le tap ne produit ni toast ni changement. Les 3 miniatures paraissent toutes disponibles. Le message d'erreur du modèle n'apparaît qu'avec Entrée au clavier.
- **Cause probable :** ui.js entitiesMarkup ne passe à entityMarkup que canPlace() comme validité, sans canAfford. app.js renderBuild ne teste canAfford que pour disabled. catalogMarkup ignore les ressources.
- **Piste de correctif :** valid = canPlace && canAfford. Consigne dédiée avec le manque chiffré. Classe .is-unaffordable et aria-disabled sur les miniatures. Garder Confirmer cliquable et afficher un toast d'explication.

## G79 · Parcelle infestée : la feuille ignore les insectes, les points rouges sont peu lisibles, et « Récolter tôt » ne récolte rien

- **Gravité :** moyenne · **Zone :** feuille / parcelles / incidents · **Viewport :** 390×844, 1280×900 (DPR 2) · **Vérification :** confirmed
- **Reproduire :** 1. Même parcours que pour le marqueur « Insectes » : jusqu'au jour 3, avec le choix gratuit pour les insectes. 2. Toucher la Parcelle A (points rouges, phase pousses) et lire la feuille. 3. « Jour +1 », toucher la Parcelle A (mûre) et zoomer.
- **Attendu :** La feuille mentionne les insectes dès qu'ils sont visibles, l'infestation se distingue de la récolte, et « Récolter tôt » récolte vraiment ou porte un autre nom.
- **Observé :** Au jour 3, la Parcelle A affiche des points rouges, mais la feuille dit « Les pousses grandissent. Encore un jour. » sans parler des insectes. Une fois mûre, les 3 points rouges (« ••• ») se superposent aux épis jaunes et passent pour des baies. « Récolter tôt · gratuit » ne récolte rien : il pose seulement pestDamage. Les épis mûrs aux bords gauche et droit sont coupés en demi-cercles.
- **Cause probable :** ui.js entityDescription : copy.planted et copy.growing ignorent entity.pestDamage. incidentSheetMarkup.insects.free = 'Récolter tôt · gratuit'. styles.css `.object.plot.has-pests:after` (texte « ••• » couleur ember) et `.object.plot.phase-mature:before` (gradients radiaux à 12 % et 86 %, coupés par les bornes du pseudo-élément).
- **Piste de correctif :** Ajouter à toutes les phases une ligne « Insectes : prochaine récolte 1 Matériau (Soigner : 2 É) ». Renommer le choix en « Laisser faire · gratuit ». Dessiner les insectes avec une forme distincte (petites silhouettes ou nuée animée, bien contrastées) et élargir l'inset du :before mûr.

## G80 · Serre réparée : l'étiquette et le titre disent toujours « Serre endommagée », et le changement est brutal

- **Gravité :** moyenne · **Zone :** entités / feuille / animation · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Terminer la quête conseillée (Commencer puis Terminer). 3. Toucher la serre, puis « Réparer · 4 É · 8 M ». 4. Lire le titre de la feuille et l'étiquette sur la carte, et observer la transition.
- **Attendu :** Le nom devient « Serre » ou « Serre active », et la réparation s'anime (redressement, lumière qui s'allume).
- **Observé :** Le titre de la feuille reste « Serre endommagée » au-dessus du texte « Serre active… », et l'étiquette sur la carte aussi. L'objet passe d'un coup de −5° avec saturation réduite à droit, avec lampes et vapeur, sans transition. L'état actif animé (pulsation des lampes, arc de vapeur) fonctionne, mais reste discret.
- **Cause probable :** data.js BASE_ENTITIES greenhouse.name = 'Serre endommagée' (nom statique). app.js renderSheet et ui.js entityMarkup utilisent entity.name. renderMap recrée le nœud, donc la transition sur .object ne peut pas jouer.
- **Piste de correctif :** Calculer le nom selon l'état (displayName(entity)), ou mettre à jour name dans repairGreenhouse(). Garder les nœuds et ajouter une classe .is-repairing (keyframes de redressement et flash) pendant 600 ms.

## G81 · Feuille de la Tour figée : le texte ne suit ni l'inspection ni l'émission du signal

- **Gravité :** moyenne · **Zone :** feuille / Tour · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Toucher la Tour, puis « Inspecter avec Milo ». 3. Lire le texte. 4. Plus tard (3 Confiance, 6 É / 12 M), « Stabiliser » puis « Émettre le signal » (sans incident de Tour contenu), et relire.
- **Attendu :** Après inspection : « Diagnostic : 3 Confiance, 6 É, 12 M requis », avec l'état de chaque condition. Après émission : « Signal transmis ».
- **Observé :** Après inspection, le texte reste « Tour désalignée. Inspecte-la avec Milo. » au-dessus d'un « Stabiliser » désactivé sans raison visible. Après émission, il reste « Tour alignée. Prête à émettre. » à côté du bouton « Signal transmis ». Le diagnostic n'existe que dans un toast de 3,8 s.
- **Cause probable :** ui.js entityDescription : pour la Tour, seul chapter.towerStable est pris en compte, ni towerInspected ni weatherSignal.
- **Piste de correctif :** Prévoir des textes pour chaque état : non inspectée, inspectée (liste des conditions cochées ou non), stable, signal émis. Afficher la condition manquante sous le bouton désactivé.

## G82 · Relais coupé : « Émettre le signal » reste actif et l'en-tête affiche « tour stable » alors que la carte montre « Tour instable »

- **Gravité :** moyenne · **Zone :** incidents / Tour / HUD · **Viewport :** 1280×900, 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Atteindre le jour 4 (« Jour +1 » trois fois, en terminant une quête chaque jour pour avoir 3 Confiance). 2. Dans la feuille « Tour instable », choisir « Couper le relais · gratuit ». 3. Inspecter puis stabiliser la Tour. 4. Lire l'en-tête et la feuille, puis toucher « Émettre le signal ».
- **Attendu :** Le bouton est désactivé avec « Relais coupé : répare l'incident (4 M) », ou propose directement la réparation. L'en-tête signale l'incident.
- **Observé :** L'en-tête affiche « Jour 4 · tour stable » alors que le marqueur jaune « Tour instable » est sur la Tour. La feuille dit « Tour alignée. Prête à émettre. » avec un bouton primaire actif, et le tap donne seulement le toast « Signal impossible / Le relais est coupé ».
- **Cause probable :** ui.js entitySheetMarkup ne vérifie pas `incidents.towerShock.status === 'contained'` avant d'afficher data-weather-signal. app.js renderResources : le libellé météo fait passer towerStable avant le nombre d'incidents.
- **Piste de correctif :** Si towerShock est contenu, remplacer l'action par « Réparer le relais · 4 M » (data-recover-incident), ou la désactiver avec une raison. Dans renderResources, faire passer les incidents avant « tour stable ».

## G83 · Choix d'incident payant inabordable : ni désactivé ni signalé, et toujours mis en avant

- **Gravité :** moyenne · **Zone :** incidents / économie · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844, « Passer ». 2. Parcelle B : Planter. Serre : Réparer. Éboulis : Déblayer (il reste 1 É / 8 M). 3. Fermer, puis « Jour +1 ». 4. Regarder « Purger maintenant · 2 Énergie » et le toucher.
- **Attendu :** Le choix payant est grisé avec « Il manque 1 Énergie », et le choix gratuit devient l'option mise en avant.
- **Observé :** Le choix payant garde le fond vert de recommandation (rgb 237,242,220), sans disabled ni aria-disabled. Le tap donne seulement le toast « Décision impossible / Ressources insuffisantes ».
- **Cause probable :** ui.js incidentSheetMarkup ne consulte pas model.canAfford() pour .incident-choice.paid.
- **Piste de correctif :** Passer les coûts dans le meta, ajouter disabled et le texte du manque, et retirer la classe .paid (mise en avant) quand le choix est inabordable.

## G84 · Déblayage brutal de l'éboulis, et 4 cases restent « verrouillées » sans aucun moyen de les ouvrir

- **Gravité :** moyenne · **Zone :** carte / construction · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Terminer une quête. 3. Planter la Parcelle B, réparer la serre. 4. Toucher l'Éboulis, puis « Déblayer · 4 É · 6 M ». 5. Observer à 60 ms puis au repos, puis ouvrir Construire.
- **Attendu :** L'éboulis se dissipe (poussière, fondu) et les cases révélées apparaissent progressivement. Tout ce qui ressemble à de l'éboulis est déblayé, ou les cases restantes sont expliquées.
- **Observé :** Le rocher et 6 cases changent d'un coup, sans animation. Avant, 10 cases avaient l'aspect d'éboulis (rangées 3–7, colonnes 6–7). Après, 6:6, 6:7, 7:6 et 7:7 gardent cet aspect et la classe locked, sans explication ni moyen de les ouvrir, alors que la feuille annonçait « Bloque six cases ».
- **Cause probable :** model.js isCellLocked teste `col>=6 && row>=3` (10 cases), alors que clearRocks n'ouvre que les cases 3:6 à 5:7. app.js : la branche [data-clear-rocks] fait closeSheet puis renderAll (innerHTML).
- **Piste de correctif :** Aligner la zone verrouillée sur les 6 cases, ou ajouter un second éboulis pour les 4 autres. Animer avec une classe .is-revealing (fondu et scale des tuiles, décalés de 60 ms) et un fondu du rocher avant de le retirer.

## G85 · Aucune transition d'état sur la carte, et les animations en boucle redémarrent à chaque clic : tout le DOM est recréé à chaque rendu

- **Gravité :** moyenne · **Zone :** animation / carte · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Dans la console : `w = document.querySelector('[data-select-entity=warehouse]')`. 3. Cliquer « Zoomer », puis tester w.isConnected. 4. « Jour +1 » → Échap ×2, attendre 4 s, puis lire le currentTime des animations incident-pulse et crop-sway avant et après un clic sur « Zoomer ». 5. Observer plantation, changement de jour (semis, pousses, mûre), récolte, placement, apparition et disparition des marqueurs.
- **Attendu :** Les changements d'état s'animent (pousse qui grandit, objet posé avec un rebond, marqueur en fondu), les transitions CSS déclarées jouent, et les animations en boucle continuent sans à-coup.
- **Observé :** w.isConnected vaut false après un simple zoom : tuiles et entités sont détruites et recréées à chaque appel de renderMap (zoom, rotation, sélection, jour, construction, redimensionnement, y compris celui de la barre d'adresse mobile). Les transitions déclarées (.entity transform .3s, .tile:before .18s) ne jouent donc jamais. Le currentTime des animations repasse de 4650 ms à 0 : la pulsation et le balancement sautent visiblement. Semis, pousses, maturité, récolte, placement et résolution d'incident changent d'une image à l'autre.
- **Cause probable :** app.js renderMap() fait #terrain-layer.innerHTML = … et #entity-layer.innerHTML = …, et il est appelé par renderAll, setCamera et l'écouteur resize.
- **Piste de correctif :** Séparer le rendu de la caméra (transform seulement) de celui du contenu. Réconcilier par id : garder les nœuds et mettre à jour classes et styles. Ajouter des keyframes d'entrée (.is-new : pop, .phase-change : croissance) déclenchés seulement sur l'entité modifiée.

## G09 · Erreur du formulaire illisible : le toast passe sous le fond flouté du dialog

- **Gravité :** basse · **Zone :** dialogue / toast · **Viewport :** 390×844 (toutes tailles) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. « Quêtes » → « Ajouter ». 3. Taper 4 espaces dans Titre → « Enregistrer ».
- **Attendu :** Un message d'erreur lisible près du champ.
- **Observé :** Le dialog reste ouvert sans message visible. Le toast « Impossible d’enregistrer / Donne un titre à la quête. » est rendu sous le ::backdrop, flou et assombri : elementFromPoint au centre du toast renvoie le DIALOG.
- **Cause probable :** app.js submitTaskForm appelle showToast pendant que #task-dialog est ouvert en showModal (top layer). Le z-index 110 du toast ne peut pas passer au-dessus.
- **Piste de correctif :** Valider en ligne (titre trimé, setCustomValidity ou message aria-live dans le formulaire), ou afficher le message dans le dialog ou via l'API popover (top layer).

## G16 · Bastion décalé de 9 px par rapport à sa case

- **Gravité :** basse · **Zone :** entités / ancrage iso · **Viewport :** Toutes tailles · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Comparer le centre de l'objet Bastion avec le centre de la case 0:6.
- **Attendu :** Le sprite est centré sur sa case, comme les autres objets.
- **Observé :** Le centre de l'objet est décalé de +9 px en x à 0° (dx = −9 à 180°).
- **Cause probable :** styles.css `.entity.bastion{width:88px}`, mais la marge reste `margin-left:-35px`, prévue pour une largeur de 70 px.
- **Piste de correctif :** `.entity.bastion{margin-left:-44px;transform-origin:44px 56px}`.

## G18 · Clavier en mode construction : les flèches ignorent la rotation de la carte (inversées à 180°)

- **Gravité :** basse · **Zone :** construction / clavier · **Viewport :** 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Cliquer 2 fois « Tourner la carte » (180°), ou une fois (90°). 3. Navigation > Construire > « Silo compact » (ou Entrée sur Nouvelle parcelle) : le focus passe sur la case 0:0. 4. Appuyer sur Flèche droite, puis Flèche bas, puis Flèche haut.
- **Attendu :** Chaque flèche déplace le curseur dans la direction visuelle indiquée.
- **Observé :** À 180°, Flèche droite déplace la case vers la gauche et le haut (x 712→669, y 707→685), Flèche bas vers le haut (y 685→663), et Flèche haut ne bouge pas en (0:0). À 90°, Flèche haut déplace le fantôme vers le bas et la droite de l'écran (2:2 → 1:2).
- **Cause probable :** app.js handleMapKeyboard : `moves = { ArrowLeft:[0,-1], ArrowRight:[0,1], ArrowUp:[-1,0], ArrowDown:[1,0] }` en coordonnées de grille, sans tenir compte de camera.rotation.
- **Piste de correctif :** Faire tourner le vecteur (dr, dc) selon camera.rotation avant setBuildCell, ou partir des directions visuelles iso.

## G21 · Éclairage incohérent après rotation : l'épaisseur des tuiles passe en haut, les ombres des bâtiments restent en bas à droite

- **Gravité :** basse · **Zone :** carte · **Viewport :** 1280×900 (DPR 2 pour bien voir) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Observer le bord avant de la grille (cases 7:x) et l'ombre de dalle sous les tuiles. 3. Cliquer 2 fois « Tourner la carte » et observer le même bord, maintenant en haut.
- **Attendu :** La lumière et l'épaisseur du plateau restent cohérentes avec la vue : l'épaisseur en bas, les ombres dans la même direction.
- **Observé :** À 180°, l'ombre `box-shadow 8px 11px` des tuiles dépasse au-dessus du bord arrière, comme un plateau à l'envers. Les drop-shadow des bâtiments, contre-tournés, restent orientés vers le bas à droite.
- **Cause probable :** styles.css `.tile:before{box-shadow:8px 11px 0 …}` est exprimé dans le repère tourné de la scène, alors que `.entity{filter:drop-shadow(8px 12px …)}` est dans le repère écran.
- **Piste de correctif :** La reprojection iso fait disparaître le problème. Sinon, contre-tourner le décalage d'ombre via des variables CSS selon la rotation.

## G23 · La case 0:0, cellule par défaut du fantôme, ne réagit jamais au toucher ni au clic

- **Gravité :** basse · **Zone :** construction / carte · **Viewport :** 390×844, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », « Construire ». 2. Choisir « Balise florale » ou « Silo compact » : le fantôme apparaît en 0:0. 3. Toucher la case 2:2 (le fantôme s'y déplace). 4. Toucher le centre du losange 0:0 (≈183,304 en mobile) ou tester elementFromPoint.
- **Attendu :** Le toucher atteint la tuile 0:0, qui devient candidate.
- **Observé :** Rien ne se passe et la candidate reste 2:2. elementFromPoint au centre de 0:0 renvoie div#entity-layer. Le fantôme initial pointe donc une case que l'on ne peut pas choisir au doigt.
- **Cause probable :** styles.css l.30 : `.terrain-layer,.entity-layer{position:absolute;inset:0}` sans `pointer-events:none`. ui.js terrainMarkup donne `z-index:${row+col}`, soit 0 pour 0:0, au même niveau que #entity-layer, qui vient après dans le DOM et capte les événements.
- **Piste de correctif :** `.entity-layer{pointer-events:none}` avec `.entity,.incident-marker{pointer-events:auto}`, ou `z-index: 1 + row + col` pour les tuiles.

## G29 · La bulle de Solène fermée ne revient jamais dans la session, même quand son conseil change, mais revient après un rechargement

- **Gravité :** basse · **Zone :** bulle de personnage · **Viewport :** Toutes tailles (390×844) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Toucher × sur la bulle. 3. Déplier la carte conseillée, « Commencer », puis « Terminer » (le chapitre passe à l'étape 2). 4. Lire #character-bubble.hidden et #character-line. 5. Recharger la page.
- **Attendu :** La bulle réapparaît, avec une animation, quand Solène a un nouveau conseil, et l'état fermé reste cohérent après rechargement.
- **Observé :** Après l'étape 2, hidden reste true alors que la réplique a changé (« Une parcelle libre attend tes semences. ») : le nouveau conseil n'est jamais vu. Après rechargement, la bulle est de nouveau visible, la fermeture n'est donc pas mémorisée. Le focus tombe aussi sur body après le ×.
- **Cause probable :** app.js handleClick [data-dismiss-character] : `$('#character-bubble').hidden = true`, jamais annulé. renderChapter() met à jour #character-line dans un élément caché sans réafficher la bulle. Rien n'est persisté.
- **Piste de correctif :** Mémoriser l'index du message fermé, réafficher la bulle avec une entrée animée quand cet index change, et persister l'état dans le state.

## G37 · Cibles tactiles sous 44 px : « Jour +1 » (88×40 en ≥700 px) et marqueurs d'incident (42 px, 31 px rendus au zoom mobile)

- **Gravité :** basse · **Zone :** accessibilité / HUD / incidents · **Viewport :** 390×844, 768×1024, 834×1112, 1280×900 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Mesurer .day-button. 3. « Jour +1 » → Échap, puis mesurer .incident-marker à l'écran.
- **Attendu :** Des cibles d'au moins 44×44 px, comme l'annonce FINISH_REVIEW.md.
- **Observé :** « Jour +1 » mesure 88×40 px en ≥700 px : c'est le seul contrôle visible sous 44 px. Les marqueurs font 42×42 en CSS et seulement environ 31×31 rendus au zoom mobile de 0,74.
- **Cause probable :** styles.css `.day-button{min-height:40px}`, le passage à 44 px n'existant que dans `@media (max-width:699px)`. `.incident-marker{width:42px;height:42px}` est dans la scène mise à l'échelle par scale(.74).
- **Piste de correctif :** `.day-button{min-height:44px}` à toutes les tailles. Marqueurs de 44 px avec une zone de clic contre-échelonnée (`scale: calc(1/var(--zoom))` ou ::after de 44 px non mis à l'échelle).

## G40 · Bouton « Commencer » : icône ▶ noire sur fond vert, qui passe seule sur sa ligne à 360 px

- **Gravité :** basse · **Zone :** carte conseillée · **Viewport :** 390×844, 360×740 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Déplier la carte conseillée. 3. Regarder « Commencer ». 4. Refaire en 360×740.
- **Attendu :** Une icône blanche alignée sur le texte, sur une seule ligne.
- **Observé :** Le triangle est noir (remplissage SVG par défaut) sur le bouton vert foncé. À 360, l'icône est sur la ligne 1 et « Commencer » sur la ligne 2.
- **Cause probable :** styles.css l.62 : `.task-actions .button svg{width:17px;height:17px;display:inline-block}` sans `fill:currentColor`, et un bouton ni en flex ni en nowrap.
- **Piste de correctif :** `.task-actions .button{display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}` et `svg{fill:currentColor}`.

## G42 · La ligne méta de la carte conseillée (domaine · durée) est en MAJUSCULES espacées et passe sur 2 lignes si le domaine est long

- **Gravité :** basse · **Zone :** carte conseillée · **Viewport :** Toutes tailles (390×844) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », et lire la ligne sous le titre de la carte « Conseillée ». 2. Quêtes → Ajouter : domaine de 40 caractères « Administration municipale et scolaire Ad », Priorité 10, Durée 1, Effort 1 → Enregistrer. 3. Fermer la feuille et regarder la carte conseillée.
- **Attendu :** Le domaine en casse normale, comme le titre (la revue de finition l'annonce), sur une ligne avec ellipsis, comme dans le registre.
- **Observé :** Par défaut, « ADMINISTRATIF · 30-60 MIN » s'affiche en capitales, graisse 900, espacées de 0,08em : la ligne crie plus fort que le titre. Avec le domaine long, on obtient « ADMINISTRATION MUNICIPALE ET SCOLAIRE AD · 10 MIN » sur 2 lignes, et la carte grandit.
- **Cause probable :** styles.css l.44 : `.task-summary span{text-transform:uppercase;letter-spacing:.08em;font-weight:900}`, hérité par `small`. L'override de la l.62 ne cible que `>span:first-child>span`.
- **Piste de correctif :** `.task-summary small{text-transform:none;letter-spacing:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`.

## G47 · Le libellé du jour et le zoom ne suivent pas un redimensionnement ou une rotation d'appareil (« J1 » et zoom 0,74 sur tablette)

- **Gravité :** basse · **Zone :** HUD · **Viewport :** 390×844 ou 600×900, puis 1024×768 / 1112×834 / 844×390 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 390×844 (ou 600×900), « Passer ». 2. Redimensionner la fenêtre ou tourner l'appareil en 1112×834 (ou 1024×768). 3. Revenir en portrait.
- **Attendu :** Le libellé devient « Jour 1 · matin clair » et la caméra adopte le cadrage tablette.
- **Observé :** L'en-tête affiche « ORÉE VIVANTE / J1 » (format mobile) en paysage tablette jusqu'à la prochaine action, et le zoom reste à 0,74. Au retour en portrait, le libellé n'est pas recalculé non plus.
- **Cause probable :** app.js renderResources choisit le libellé selon innerWidth, mais le gestionnaire resize n'appelle que renderMap et renderSheet. Le zoom mobile est écrit dans l'état persistant au chargement.
- **Piste de correctif :** Appeler renderResources() au resize (avec un debounce), ou rendre les deux libellés et basculer en CSS par media query. Ne pas persister un zoom propre au format d'écran.

## G48 · Onboarding non modal et sans transition : le Tab atteint le jeu derrière, l'overlay disparaît d'un coup, l'illustration ne change pas

- **Gravité :** basse · **Zone :** onboarding / accessibilité · **Viewport :** Toutes tailles (390×844, 360×740) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf (localStorage vide), 390×844 mobile, ouvrir l'URL. 2. Lire document.activeElement, puis appuyer 6 fois sur Tab. 3. Toucher « Prendre l'intendance » puis « Voir la ferme », en capturant à chaque fois. 4. Dans un autre contexte neuf, toucher « Passer » en échantillonnant `#onboarding.hidden` par requestAnimationFrame.
- **Attendu :** Une boîte modale qui prend le focus sur le bouton principal et le garde, avec une transition entre les étapes, une illustration qui évolue et une sortie animée.
- **Observé :** Le focus reste sur body. Le 1er Tab va sur le bouton « Énergie » de l'en-tête, puis le Tab parcourt le bouton Objectifs, la carte et les entités derrière le voile flouté. Le texte change d'une étape à l'autre sans transition, avec la même illustration aux 3 étapes. « Passer » ou « Commencer » cache l'overlay en une image (hidden=true à 110 ms, opacité toujours à 1). « Passer » reste affiché à l'étape 3, où il fait la même chose que « Commencer ».
- **Cause probable :** index.html : `section.onboarding` sans role=dialog ni aria-modal, et sans inert sur `.game-shell`. app.js renderOnboarding ne fait que basculer `hidden`, sans focus initial ni piège de focus.
- **Piste de correctif :** Utiliser un <dialog> en showModal(), ou poser `inert` sur .game-shell et focus() sur [data-next-onboarding]. Ajouter un fondu ou un glissement entre les étapes et à la sortie, une illustration par étape, et masquer « Passer » à la dernière étape.

## G49 · Onboarding : le bouton principal passe sur deux lignes en desktop, et le mini-Bastion est mangé par le champ, avec son ombre qui dépasse

- **Gravité :** basse · **Zone :** onboarding · **Viewport :** 1280×900 (ombre visible aussi en 390×844) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf (localStorage vide) en 1280×900, ouvrir la page sans rien cliquer.
- **Attendu :** Des boutons de même hauteur, sur une ligne, et une illustration propre.
- **Observé :** « Prendre l'intendance » tient sur 2 lignes (66 px) à côté de « Passer », ce qui déséquilibre la rangée. Dans l'illustration, la bande de champ inclinée passe devant le bas du mini-Bastion, et un bout de son ombre sombre (petit rectangle gris foncé) dépasse à droite du champ.
- **Cause probable :** styles.css `.onboarding-actions{grid-template-columns:1fr 1.35fr}` dans une carte de 420 px. Dans index.html, `.mini-field` vient après `.mini-bastion` sans z-index, avec un skewY(-4deg) qui dépasse. `.mini-bastion{box-shadow:… 0 8px 0 #6c6252}` (styles.css l.50).
- **Piste de correctif :** Raccourcir le libellé, ou passer la grille à `auto 1fr` avec `white-space:nowrap`. Placer .mini-bastion au-dessus du champ (z-index:1, bottom ajusté) et contenir son ombre.

## G51 · Navigation : « Ferme » ne fait rien et reste active quand Quêtes ou Bastion est ouvert ; son survol efface l'état actif

- **Gravité :** basse · **Zone :** nav du bas · **Viewport :** Toutes tailles (390×844, 834×1112, 1280×900) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Toucher « Quêtes » et lire les classes .is-active. 3. Fermer, toucher « Bastion » et relire. 4. Avec une feuille ouverte, toucher « Ferme » (en desktop, laisser la souris dessus).
- **Attendu :** L'onglet actif suit le panneau ouvert. « Ferme » ferme la feuille et recentre la carte. L'onglet actif reste vert au survol.
- **Observé :** Les états actifs restent [Ferme*, Quêtes, Construire, Bastion] quand Quêtes ou Bastion est ouvert : Quêtes et Bastion ne deviennent jamais actifs. Toucher « Ferme » laisse la feuille ouverte. Au survol, le fond vert de « Ferme » devient beige (#eee2c4), et l'onglet semble désélectionné.
- **Cause probable :** index.html : `class="is-active"` codée en dur sur data-nav-action="farm". app.js n'a pas de branche data-nav-action, et seul [data-build-mode] bascule is-active. `.game-nav button:hover` (dans @media hover, plus loin dans le fichier) a la même spécificité que `.game-nav button.is-active` et l'emporte.
- **Piste de correctif :** Dériver is-active et aria-current de ui.activePanel et ui.build.active (dans renderSheet ou renderAll). Brancher « Ferme » sur closeSheet() et recentrer. Ajouter `.game-nav button.is-active:hover{background:var(--sage-dark);color:#fff}`.

## G53 · Quêtes terminées : ligne entière délavée (boutons qui semblent désactivés, contraste 2,97:1), seulement 4 terminées sur 11 réactivables ; « ! » des incidents à 4,44:1

- **Gravité :** basse · **Zone :** feuille (Quêtes) / incidents · **Viewport :** Toutes tailles (390×844) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Nav Quêtes → défiler jusqu'à « Terminées ». 3. Compter les lignes et comparer avec le state (11 tâches en statut done). 4. « Jour +1 » → Échap, puis mesurer le contraste du « ! » des marqueurs.
- **Attendu :** Des boutons Réactiver, Modifier et Supprimer pleinement lisibles, un accès à toutes les quêtes terminées (« Voir plus »), et un texte à au moins 4,5:1 de contraste.
- **Observé :** Toute la ligne, boutons compris, est à 62 % d'opacité : on croit les boutons désactivés, et les métadonnées tombent à environ 2,97:1. Seules 4 lignes s'affichent pour 11 quêtes terminées : les 7 autres ne peuvent pas être réactivées depuis l'interface. Le « ! » blanc sur #bf5a38 est à 4,44:1 (17,6 px gras, pas du « grand texte »).
- **Cause probable :** styles.css l.48 : `.quest-row.is-done{opacity:.62}`. ui.js questsMarkup : `.filter(done).slice(-4)`. `.incident-marker{color:#fff;background:var(--ember)}`.
- **Piste de correctif :** Atténuer seulement le titre et les métadonnées (couleur, icône ou texte barré), pas les actions. Ajouter « Afficher toutes les terminées ». Assombrir l'ember (#a94a2c, environ 5,6:1).

## G54 · La bande « Maintenant » touche la bulle de Solène (0 px d'écart), et la chevauche à 320 px avec les contrôles de carte

- **Gravité :** basse · **Zone :** HUD / bulle · **Viewport :** 390×844, 360×740, 430×932, 320×640 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Mesurer le bas de `.objective-ribbon` et le haut de `.character-bubble` et `.map-controls`. 3. Refaire en 320×640.
- **Attendu :** Un espacement régulier (6–8 px) entre bande, bulle et contrôles, sans chevauchement.
- **Observé :** En 390, le bas de la bande et le haut de la bulle sont tous deux à y=134 : les deux cartes se collent et leurs ombres fusionnent. Les contrôles commencent aussi à y=134. En 320, la bande passe sur deux lignes (y 74–142) et passe sous la bulle et le bouton Dézoomer (8 px de recouvrement).
- **Cause probable :** styles.css l.62 : `.objective-ribbon{top:8px;min-height:53px}` mesure en réalité 60 px ou plus (texte .87rem, bouton de 44 px, retour à la ligne), alors que `.character-bubble{top:68px}` et `.map-controls{top:68px}` sont codés en dur.
- **Piste de correctif :** Empiler bande, bulle et contrôles dans un conteneur flex en colonne (gap 6–8px), au lieu de `top` absolus codés.

## G55 · Formulaire de quête : la zone de texte de 3 lignes est trop courte pour 180 caractères, et « Effort » reste seul sur sa ligne

- **Gravité :** basse · **Zone :** dialogue (quête) · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844 mobile, « Passer ». 2. Quêtes → Ajouter. 3. Saisir 180 caractères dans Titre, enregistrer, puis Modifier la même quête.
- **Attendu :** Le titre complet est visible, ou la zone grandit, et les sélecteurs sont alignés.
- **Observé :** La zone de texte fait 88 px de haut pour 157 px de contenu : en modification, le début du titre est hors vue, il faut défiler dedans. « Effort » est seul sur la 2e ligne de la grille à 2 colonnes, avec un vide à droite.
- **Cause probable :** index.html : `textarea rows="3"`. styles.css l.73 : `.form-grid{grid-template-columns:repeat(2,1fr)}` pour 3 sélecteurs.
- **Piste de correctif :** `field-sizing:content` (avec un repli JS d'auto-taille) et une max-height. Grille de 3 colonnes compactes, ou segment 1–10.

## G56 · Pas de zoom à la molette ni au pincement, et les tuiles inertes affichent un curseur main et un survol

- **Gravité :** basse · **Zone :** carte · **Viewport :** 390×844 et 834×1112 (tactile), 1280×900 (souris) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Pincer à deux doigts sur la carte (CDP Input.dispatchTouchEvent avec 2 touchPoints qui s'écartent). 3. En desktop, molette au-dessus de la ferme. 4. Survoler une tuile hors mode construction et cliquer.
- **Attendu :** Le pincement et la molette zooment et dézooment la carte, comme dans tout jeu de carte. Les tuiles inertes gardent le curseur grab.
- **Observé :** Rien ne se passe au pincement ni à la molette. `touch-action:none` bloque aussi le zoom natif, et seuls les boutons ± fonctionnent. Au survol, le curseur passe à « pointer » et la tuile s'éclaircit, mais un clic ne fait rien.
- **Cause probable :** app.js ne suit qu'un seul pointeur (ui.pan.pointerId), sans gestion multi-pointeur ni écouteur wheel. styles.css l.30 : `.map-viewport{touch-action:none}`. `button{cursor:pointer}` et le filtre de survol s'appliquent aussi aux `.tile`.
- **Piste de correctif :** Suivre 2 pointeurs : la distance donne le zoom, le point médian le déplacement. Ajouter un zoom à la molette centré sur le pointeur. Mettre `.tile{cursor:inherit}` et désactiver le survol hors mode construction.

## G63 · Inspecteur ouvert et tâche dépliée en paysage : la carte devient presque inutilisable

- **Gravité :** basse · **Zone :** carte · **Viewport :** 1112×834 (aussi 834×1112) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 1112×834, « Passer ». 2. Cliquer « Bastion » dans la navigation. 3. Cliquer la carte « Conseillée » pour la déplier.
- **Attendu :** La ferme reste lisible : la tâche se replie, ou la carte se décale.
- **Observé :** La tâche dépliée (y 409–654) recouvre les parcelles, l'entrepôt et la serre, et le dock bas occupe y 664–816. Seuls le Bastion et quelques tuiles restent visibles entre le ruban et la tâche.
- **Cause probable :** styles.css `body.has-sheet .recommended-task{bottom:180px}` empile la tâche au-dessus du dock dans une carte réduite à 682 px, sans recadrage de la caméra.
- **Piste de correctif :** Replier la tâche à l'ouverture de l'inspecteur, ou décaler camera.y pour garder la ferme dans la zone libre. En split-view, envisager de déplacer la tâche dans l'inspecteur.

## G64 · La tâche conseillée remonte de 155 px à l'ouverture de l'inspecteur alors que rien ne la recouvre

- **Gravité :** basse · **Zone :** HUD · **Viewport :** 1280×900, 1920×1080 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Noter la position de la carte « Conseillée » (en bas à gauche, bas à 875 px en 1280×900). 3. Cliquer « Bastion » dans la navigation.
- **Attendu :** La tâche ne bouge que si le dock bas risque de la chevaucher.
- **Observé :** Le bas de la tâche passe de 875 à 720 px en 1280×900 (de 1055 à 900 en 1920×1080), alors que le dock bas se place à droite (x 502–832, ou 1142–1472) sans la toucher. La carte perd de la place sans raison et la tâche flotte au-dessus d'un vide.
- **Cause probable :** styles.css `body.has-sheet .recommended-task{bottom:180px}` s'applique à toutes les largeurs ≥ 700 px.
- **Piste de correctif :** Réserver cette règle aux largeurs où carte moins inspecteur fait moins d'environ 800 px, ou calculer le chevauchement réel. Animer `bottom`.

## G65 · Au survol, une entité perd son ombre portée, et l'entité sélectionnée perd son halo

- **Gravité :** basse · **Zone :** entités · **Viewport :** 1280×900 (souris) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Survoler le Bastion et comparer avec l'état sans survol. 3. Cliquer la Serre pour la sélectionner, puis la survoler.
- **Attendu :** Au survol, l'objet s'éclaircit légèrement et garde son ombre, et son halo s'il est sélectionné.
- **Observé :** Le filtre calculé passe de `drop-shadow(...)` à `brightness(1.04)` seul : l'ombre disparaît d'un coup sous le Bastion, et le halo clair de la Serre sélectionnée s'éteint au survol.
- **Cause probable :** styles.css `@media (hover:hover){button:not(:disabled):hover{filter:brightness(1.04)}}` (0,2,1) écrase `.entity:hover` (0,2,0) et `.entity.is-selected`.
- **Piste de correctif :** Exclure les entités (`button:not(:disabled):not(.entity):not(.tile):hover`) ou monter la spécificité : `.entity.entity:hover{filter:drop-shadow(...) brightness(1.08)}`.

## G66 · Bâtiments CSS mal joints et dessinés de face : tours du Bastion collées sur la façade, toit d'entrepôt sans contour, parcelles qui ressemblent à des caisses debout

- **Gravité :** basse · **Zone :** carte · **Viewport :** 1280×900 au zoom 1,5 avec DPR 2 (toutes tailles) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Cliquer 5 fois « Zoomer ». 3. Observer de près le Bastion, l'Entrepôt et les parcelles.
- **Attendu :** Des volumes cohérents : tours qui sortent du toit, toit avec arêtes, faces latérales iso, parcelles couchées au sol.
- **Observé :** Bastion : la tour droite, faite en box-shadow, descend de 19 px dans le mur, et sa bordure basse trace une ligne au milieu de la façade ; la tour gauche coupe le bord supérieur. Entrepôt : le toit est un triangle plat sans contour sur les pentes (le clip-path coupe la bordure), avec une petite encoche aux coins. Tous les objets, parcelles comprises (rectangles de 48×29), sont dessinés de face : ils débordent de leur losange et se lisent comme des caisses debout, pas comme des champs.
- **Cause probable :** styles.css `.object.bastion:before{bottom:34px; box-shadow:35px 8px 0 …}` ; `.object.warehouse:before{clip-path:polygon(...); border:2px}` ; `.object.plot` en rectangle vertical.
- **Piste de correctif :** Construire chaque bâtiment avec deux faces iso (gauche et droite, skewY ±26,57°) et un dessus en losange, ou passer à des sprites SVG iso. Dessiner le contour du toit en SVG ou en pseudo-élément plutôt qu'avec border + clip-path. Coucher les parcelles en losange, comme les tuiles corrigées.

## G67 · Libellé « Énergie » rogné : l'accent du É est coupé (on lit « Energie »)

- **Gravité :** basse · **Zone :** HUD · **Viewport :** Toutes tailles (834×1112, 1280×900, 1920×1080) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Regarder la 1re ressource dans l'en-tête.
- **Attendu :** « Énergie » avec son accent, sans rognage vertical.
- **Observé :** On lit « Energie » : l'accent est rogné. Les trois libellés ont un scrollHeight de 13 pour un clientHeight de 12.
- **Cause probable :** styles.css `.resource span{overflow:hidden;line-height:1;white-space:nowrap}`.
- **Piste de correctif :** Passer `line-height` à 1.25 avec un petit padding-top, ou `overflow:clip; overflow-clip-margin:2px`.

## G68 · Polices déclarées indisponibles (« Oree Display » en erreur, Aptos absente) : libellés de ressources tronqués à 320 px

- **Gravité :** basse · **Zone :** HUD / typographie · **Viewport :** 320×640 (Linux/Android, repli sur DejaVu Sans) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 320×640, « Passer ». 2. Regarder les trois ressources de l'en-tête. 3. Dans la console, exécuter `[...document.fonts].map(f => f.status)`.
- **Attendu :** La typographie prévue, avec « Matériaux » et « Confiance » lisibles en entier.
- **Observé :** document.fonts indique « Oree Display:error ». Le corps de texte retombe sur DejaVu Sans, plus large, et l'en-tête affiche « Matéri… » et « Confia… » (scrollWidth 60 pour un clientWidth de 52).
- **Cause probable :** styles.css `@font-face{font-family:"Oree Display";src:local("Aptos Display"),local("Trebuchet MS")}` n'a aucune source locale sous Linux, Android ou iOS. `--body: Aptos, "Segoe UI", system-ui` ne cite que des polices Windows. `.resource{grid-template-columns:16px minmax(0,1fr)}` dans des pastilles d'environ 77 px.
- **Piste de correctif :** Fournir une webfont woff2 (police locale ou Google Fonts) ou concevoir pour la pile system-ui. Sous 360 px, n'afficher que l'icône et le nombre, le libellé passant en aria-label.

## G69 · Zoom et bornes de pan fixes, sans rapport avec l'écran : ferme minuscule en 1920, carte poussée sous le dock, aucun retour visuel aux limites

- **Gravité :** basse · **Zone :** carte · **Viewport :** 1920×1080, 1280×900, 834×1112 · **Vérification :** partial
- **Reproduire :** 1. Contexte neuf en 1920×1080, « Passer ». 2. Cliquer 8 fois « Dézoomer ». 3. Avec le focus sur la carte, appuyer 8 fois sur Maj+Flèche gauche et 8 fois sur Maj+Flèche haut. 4. En 1280×900, glisser le ciel de (300,300) à (1200,880). 5. Cliquer 10 fois « Zoomer ».
- **Attendu :** Un zoom minimal qui garde la ferme lisible, des bornes de pan qui la gardent dans la zone libre, et des boutons +/− désactivés aux limites.
- **Observé :** En 1920×1080 au zoom minimal, la ferme occupe 441×250 px sur 1920×1008 (environ 6 % de l'écran) et peut être reléguée dans le coin inférieur droit. En 1280×900, aux bornes (x=250, y=190), le Bastion et les cases bloquées passent sous le dock chapitre/navigation. Au zoom 1,5, « + » ne fait plus rien, sans état désactivé ni aria-disabled. Le pas diffère entre boutons (0,14) et clavier (0,12), ce qui donne des valeurs comme 1.0699999.
- **Cause probable :** app.js setCamera : `clamp(zoom, .65, 1.5)`, `clamp(x, -250, 250)` et `clamp(y, -190, 190)` en dur, indépendants de la taille de la carte, du zoom et des surcouches.
- **Piste de correctif :** Calculer zoomMin et zoomMax à partir du rapport entre la grille et la zone libre. Borner le pan pour garder au moins 60 % de la grille dans la zone libre. Désactiver les boutons aux limites et unifier le pas.

## G70 · Choix d'incident en 2 colonnes dans un inspecteur de 350 px : coûts coupés au milieu (« Renforcer · 5 / Matériaux »)

- **Gravité :** basse · **Zone :** incidents · **Viewport :** 834×1112 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf en 834×1112, « Passer ». 2. Cliquer 3 fois « Jour +1 » : la fiche « Tour instable » s'ouvre.
- **Attendu :** Les options payante et gratuite se lisent d'un coup d'œil, avec le coût sur une seule ligne.
- **Observé :** Deux cartes d'environ 150 px affichent « Renforcer · 5 / Matériaux » et « Couper le / relais · / gratuit ». Les hauteurs diffèrent et le texte est haché.
- **Cause probable :** styles.css (≥700 px) `.incident-choices{grid-template-columns:1fr 1fr}`, alors que l'inspecteur ne mesure que 42vw, soit 350 px à 834.
- **Piste de correctif :** Passer à une colonne sous environ 400 px d'inspecteur (`@container` ou `repeat(auto-fit, minmax(180px, 1fr))`) et garder le coût sur sa ligne (`white-space:nowrap`).

## G71 · Monde peu vivant : l'oiseau saute de 90 px à chaque boucle de 12 s, nuages et soleil figés

- **Gravité :** basse · **Zone :** animation / décor · **Viewport :** Toutes tailles (plus visible en 1280×900 et 1920×1080) · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Observer l'oiseau près du soleil pendant plus de 12 s, puis les nuages.
- **Attendu :** Un mouvement d'ambiance continu, sans téléportation (sortie et entrée hors champ ou en fondu).
- **Observé :** L'oiseau glisse de −20 à +70 px, puis réapparaît d'un coup à −20 px en plein ciel toutes les 12 s. Sur une grande carte en 1920, il ne parcourt que 90 px. Nuages et soleil sont totalement statiques, et rien d'autre ne bouge dans le ciel.
- **Cause probable :** styles.css `@keyframes bird-cross{0%{translate:-20px 0}…100%{translate:70px 0}}` avec `.bird{animation:bird-cross 12s linear infinite}`, sans fondu aux extrémités. `.cloud` n'a aucune animation.
- **Piste de correctif :** Faire traverser tout le ciel à l'oiseau (de −10vw à 110vw) avec opacity 0 aux extrémités, ou une boucle aller-retour. Ajouter une dérive lente des nuages, désactivée sous prefers-reduced-motion.

## G76 · Le fantôme invalide se distingue trop peu du fantôme valide

- **Gravité :** basse · **Zone :** construction / fantôme · **Viewport :** 390×844 (zoom, DPR 2) · **Vérification :** partial
- **Reproduire :** 1. Contexte neuf, « Passer », « Construire », « Silo compact ». 2. Toucher 2:2 (valide) et faire une capture. 3. Toucher 4:6 (verrouillée) et comparer.
- **Attendu :** Un état invalide évident : teinte rouge, motif hachuré, icône ou libellé « Impossible ici ».
- **Observé :** Seule la couleur du contour change (de crème à brun-rouge #8d382c, plus grayscale .4) sur un fantôme semi-transparent. L'étiquette reste « Aperçu : Silo compact », et la case candidate invalide se confond avec les autres cases rouges.
- **Cause probable :** styles.css `.entity.ghost.invalid .object{outline-color:#8d382c;filter:grayscale(.4)}`. Dans ui.js, le libellé du fantôme ne dépend pas de valid.
- **Piste de correctif :** Teinte rouge (filter sepia et hue-rotate, ou fond rgba rouge), contour épais en tirets, et libellé « Impossible : case verrouillée / occupée ».

## G77 · « Changer » renvoie le fantôme en 0:0 au lieu de l'effacer ; focus perdu après Changer ou Confirmer ; flèches rapides perdues

- **Gravité :** basse · **Zone :** construction / focus · **Viewport :** 390×844, 1280×900 · **Vérification :** partial
- **Reproduire :** 1. Contexte neuf, « Passer », « Construire », « Balise florale ». 2. Toucher la case 2:3. 3. Toucher « Changer ». 4. Recommencer avec « Confirmer » en lisant document.activeElement. 5. Au clavier, appuyer 7 fois rapidement sur Flèche bas.
- **Attendu :** « Changer » retire le fantôme (ou ramène au choix d'objet) et garde le focus dans le dock. Après Confirmer, le focus va sur une cible logique (catalogue ou case suivante). Chaque flèche est prise en compte.
- **Observé :** Le fantôme saute en haut de la carte, sur 0:0 (que l'on ne peut pas toucher), et la consigne revient à « 2. Choisis une case ». Le bouton disparaît et le focus tombe sur BODY, aussi après Confirmer. Sur 7 Flèche bas rapides, seulement 3 déplacements sont pris en compte.
- **Cause probable :** app.js handleClick [data-clear-placement] fait `ui.build.cell = model.firstBuildableCell()`. Les boutons masqués via #placement-actions.hidden ne déplacent pas le focus. renderMap(focus) recrée les tuiles par innerHTML, et le focus n'est rétabli qu'au requestAnimationFrame suivant.
- **Piste de correctif :** Changer : `cell = null` (pas de fantôme) et focus sur la miniature sélectionnée. Après Confirmer, focus sur la miniature active. Pour le clavier, ne pas recréer les tuiles : basculer seulement les classes candidate, buildable et invalid.

## G78 · Le marqueur « Insectes » est posé sur la Parcelle B alors que les dégâts touchent la Parcelle A

- **Gravité :** basse · **Zone :** incidents / cohérence carte-feuille · **Viewport :** 390×844, 1280×900 · **Vérification :** partial
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. Toucher Parcelle B, « Planter ». 3. « Jour +1 » (Irrigation : n'importe quel choix), puis « Jour +1 » (Insectes) : choisir « Récolter tôt · gratuit ». 4. Fermer et comparer la position du marqueur avec la parcelle qui porte les points rouges.
- **Attendu :** Le marqueur pointe la parcelle infestée.
- **Observé :** Le marqueur reste fixé sur la case 4:2 (Parcelle B, mûre et saine), alors que pestDamage est appliqué à la Parcelle A (3:2, points rouges). Si aucune parcelle n'est plantée, le choix gratuit ne touche rien, mais le marqueur et la réparation payante (2 É) restent.
- **Cause probable :** ui.js INCIDENT_META.insects {row:4,col:2} est codé en dur. model.js resolveIncident('insects','free') prend la première parcelle plantée de allEntities (Parcelle A).
- **Piste de correctif :** Stocker incident.targetId dès l'activation et positionner le marqueur sur cette entité. S'il n'y a pas de cible, désactiver le choix gratuit ou changer son texte.

## G86 · Mobile : le 3e objet du catalogue est presque invisible, sans indice de défilement

- **Gravité :** basse · **Zone :** construction / catalogue · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, 390×844, « Passer », « Construire ». 2. Regarder la rangée de miniatures.
- **Attendu :** Les 3 objets sont visibles (grille compacte de 3 colonnes), ou un indice de défilement est présent.
- **Observé :** Seuls « Nouvelle parcelle » et « Silo compact » sont visibles. « Balise florale » se réduit à un liseré de 30 px à droite (scrollWidth 476 > clientWidth 354), sans ombre de bord ni flèche.
- **Cause probable :** styles.css `.catalog-item{min-width:154px}` dans `.build-catalog{display:flex;overflow-x:auto}` à 390 px.
- **Piste de correctif :** Sous 700 px, `grid-template-columns:repeat(3,1fr)` avec la miniature au-dessus du texte (min-width:0), ou un masque dégradé sur le bord droit.

## G87 · Miniatures du catalogue : objets décalés et mal posés sur leur losange

- **Gravité :** basse · **Zone :** construction / miniatures · **Viewport :** 1280×900 (DPR 3), 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer », « Construire ». 2. Zoomer sur les trois miniatures.
- **Attendu :** Chaque objet est centré et posé sur son losange, comme sur la carte.
- **Observé :** Le centre des objets est décalé à droite du centre du losange : +8 px pour la parcelle, +6 px pour le silo, +3 px pour la balise. La parcelle flotte sur la moitié haute du losange. Le silo et la balise dépassent du haut de la vignette (objTop 688 pour thumbTop 689, arc de la balise au bord). Le rendu reste correct dans l'ensemble.
- **Cause probable :** styles.css `.catalog-thumb .object{left:23px!important;bottom:9px!important;scale:.65;transform:translateX(-50%)!important}` : le scale s'ajoute au translate, calculé sur des largeurs non mises à l'échelle. `.catalog-item span{margin-top:3px}` touche aussi les spans internes de la vignette.
- **Piste de correctif :** `transform:translateX(-50%) scale(.65)` avec `transform-origin:50% 100%`, et un bottom calé sur le centre du losange (~21px). Exclure .catalog-thumb span de la règle margin-top.

## G88 · Réinitialisation sur mobile : la carte revient au zoom 1 au lieu de 0,74

- **Gravité :** basse · **Zone :** carte / caméra · **Viewport :** 390×844 · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf, « Passer ». 2. « Quêtes » → « Réinitialiser le sandbox » → « Réinitialiser ».
- **Attendu :** Le même cadrage qu'au premier chargement mobile (zoom 0,74).
- **Observé :** Le zoom passe de 0,74 à 1 avec une animation : la ferme déborde largement de l'écran derrière l'onboarding.
- **Cause probable :** app.js : la correction mobile `if (camera.zoom === 1 && innerWidth < 700) setCamera(...)` n'est faite qu'au démarrage, pas dans le gestionnaire #confirm-reset.
- **Piste de correctif :** Extraire une fonction initialCamera(), appelée au démarrage et après model.reset().

## G89 · La barre de progression du chapitre rétrécit à l'ouverture de la page

- **Gravité :** basse · **Zone :** HUD / animation · **Viewport :** Toutes tailles · **Vérification :** confirmed
- **Reproduire :** 1. Contexte neuf. 2. Charger la page et observer la barre sous « Chapitre 1 » pendant 0,5 s (un transitionrun est mesuré vers 130 ms).
- **Attendu :** La barre s'affiche directement à sa valeur, ou s'anime en montant.
- **Observé :** Elle part de scaleX(0.1666), la valeur CSS, et recule jusqu'à 0.08, la valeur JS, en 0,5 s : une régression visible à chaque chargement.
- **Cause probable :** styles.css `.chapter-track span{transform:scaleX(.1666);transition:transform .5s}`, alors que app.js renderChapter applique `scaleX(Math.max(.08, index/6))`.
- **Piste de correctif :** Aligner la valeur CSS initiale (scaleX(.08)), ou désactiver la transition au premier rendu.
