# Prototypes de rendu (spikes)

Même scène construite avec trois techniques, mesurée sur mobile simulé (CPU ×4). Démos dans `sketches/007-spikes-rendu/`.

## dom-svg

Notes (sur 10) : visuel 7 · juice 7 · perf 6.5 · accessibilité 8 · coût de dev 7

### Qualité visuelle

Jugement fait sur les captures. Le rendu est nettement au-dessus du prototype 006 et corrige ses défauts structurels.

Ce qui fonctionne :
- **Socle continu** : tranche de terre en 5 strates ondulées (liseré d'herbe qui « coule », terre, ocre, argile, roche avec cailloux et racines), ligne d'eau, reflet et ombre portée sur le lac.
- **Dessus d'un seul tenant** : un seul SVG projeté par matrice affine, sans aucune tuile visible.
- **Parcelles à plat** : sillons isométriquement justes, plus du tout en forme de cageots.
- **Lumière unique cohérente partout** : dessus clair, face gauche en mi-ombre, face droite à l'ombre, ombres portées vers la droite. Cela vaut pour bâtiments, arbres facettés, sapins en cônes partagés et haies.
- **Détails qui font « lieu habité »** : porte de grange en X, panneaux solaires sur le toit, échelle et ponton, barque, chute d'eau, nénuphars, épouvantail, lanternes.
- **Lisière boréale en fond** : québécoise, crédible.
- **Palette respectée** : ocre, sauge, bois blond, verre turquoise, crème ; aucune braise.
- **Jour, soir, nuit convaincants**. La nuit est le plus bel état : fenêtres chaudes, cristal du relais en halo, runes turquoise du muret, lanternes.
- **Desktop 1280×900 réellement attrayant.**

Ce qui fait encore amateur ou reste faible :
1. **Sur mobile (échelle 0,64), tout est petit** :
   - une case fait environ 41×20 px ;
   - les villageois font environ 18×27 px et ne sont qu'un buste avec un balancement, sans cycle de marche ;
   - par défaut, les coins de la couronne et le bout du muret sont rognés.
2. **Composition mobile** : le lac occupe beaucoup de place sous l'île, et l'horizon reste une superposition de bandes un peu « clipart vectoriel ».
3. **Le soir** :
   - le lac vire au gris-mauve un peu terne ;
   - l'ombre de nuage qui passe peut se lire comme une tache de saleté.
4. **Le relais** reste un pylône assez générique.
5. **Les bâtiments sont propres mais sans texture ni usure.** C'est un style « flat low-poly » soigné, pas encore une identité forte.

### Game feel

Les trois moments sont tous réalisés en Web Animations API, sur des éléments persistants.

**(1) Quête terminée — le plus réussi.**
- Le relais fait un squash, son cristal s'illumine et un anneau d'onde turquoise part au sol.
- 10 jetons (5 Énergie, 4 Matériaux, 1 Confiance) jaillissent en éventail, marquent une courte pause, puis volent en arc de Bézier vers leur pastille du HUD, avec rotation et réduction.
- Chaque arrivée incrémente le compteur en décompte (environ 280 ms) avec un rebond du chiffre et de l'icône. Un « +12 / +8 / +1 » apparaît sous la pastille.
- Le compteur ne saute plus avant l'arrivée des particules : le défaut du prototype est corrigé.
- Si un bâtiment est sélectionné, les jetons partent de lui.

**(2) Construire — bon, avec deux faiblesses.**
- Une empreinte fantôme turquoise apparaît, puis l'atelier tombe de 340 px avec une accélération de gravité.
- À l'impact : squash 1,3/0,68, puis stretch, puis rebond. En même temps, l'ombre grandit, 20 bouffées de poussière et 10 éclats de bois partent, l'anneau s'élargit et la caméra tremble 300 ms. `vibrate` est appelé, sans effet sur iOS.
- La poussière reste discrète à l'échelle mobile.
- Ensuite, la cheminée fume.

**(3) Récolter — correct.**
- Les 20 épis gonflent puis s'envolent en vague de l'arrière vers l'avant.
- 26 brins de paille et feuilles partent en parabole, avec rotation.
- Un « +3 ⚡ » flotte et le compteur Énergie rebondit.
- 2,6 s plus tard, les semis repoussent en « pop » échelonné, grâce au hook de transition d'état du rendu incrémental.
- Les brins restent petits sur mobile.

**Ambiance et sélection.**
- Deux villageois parcourent le chemin aller-retour, avec pause, retournement et z-index recalculé tous les 140 ms. S'y ajoutent les nuages qui dérivent, la chute d'eau qui ruisselle, les reflets du lac et le cristal qui flotte.
- La sélection affiche un contour crème de 2 px (5 drop-shadows), un losange pointillé pulsant au sol et une étiquette contre-mise à l'échelle.

**Manques** : pas de son, pas d'easing de caméra vers la cible, villageois rudimentaires.

### Performance

Conditions : Chromium headless sous Linux (raster logiciel), 390×844, DPR 2 (DPR 1 entre parenthèses), `Emulation.setCPUThrottlingRate` ×4. FPS mesurés par rAF ; charge du thread principal mesurée par trace. Ce n'est pas un vrai téléphone, et iOS Safari n'a pas été testé.

**Poids et démarrage**
- Poids total : 109,7 Ko transférés non compressés en 10 requêtes (HTML, CSS, 8 modules ES), soit environ 36,5 Ko en gzip. Aucune dépendance, aucune image, aucune police.
- First Contentful Paint : 128 ms (152 ms).
- Scène prête : environ 590 ms (650 ms). Ce délai sert à générer en JS environ 2 900 nœuds SVG.
- DOM : 3 151 nœuds, 39 entités, 28 couches composées au repos et 40 pendant la quête.

**FPS par situation**

| Situation | FPS moyen | Pire fenêtre de 500 ms | Min. instantané | p95 / thread principal |
|---|---|---|---|---|
| Repos jour | 60,0 (60,0) | 60 | 59,5 | p95 16,8 ms |
| Repos nuit | 60,0 | 60 | 59,5 | — |
| Quête terminée | 50,5 (49,5) | 38 (35) | 12 (15) | 1 image de 67 à 83 ms au clic |
| Construire | 51,7 (47,8) | 42 (30) | 15 (6,7) | 1 image de 150 ms à l'impact sur une passe |
| Récolter | 51,9 (53,1) | 44 (48) | 30 (15) | — |
| Sélection | 58 à 59 | — | — | — |
| Panoramique (transform caméra à chaque image) | 51,5 à 54,5 | — | — | p95 33 ms ; le thread principal passe environ 50 % de son temps en Layerize |
| Balayage du curseur d'heure | environ 8 | — | — | 120 à 150 ms par changement : 60 % de recalcul de style, 15 % de peinture |

- **Moments** : la charge du thread principal monte à 64–85 %, dont 13–24 % en Layerize et 11–15 % en recalcul de style.
- **Curseur d'heure** : chaque changement recolore environ 130 variables CSS sur toute la scène. En usage réel, l'heure change une fois par minute, donc le coût est négligeable. En revanche, l'aperçu pendant qu'on fait glisser le curseur saccade.

**Optimisations appliquées**
- Plus d'animation sur les nœuds SVG des étoiles.
- `will-change` sur la caméra seulement pendant un geste.
- Réserve de jetons pré-créés.
- Curseur coalescé par rAF.

### Accessibilité

**Ce qui est en place**
- Chaque entité interactive (bâtiments, parcelles, muret, villageois, atelier construit) est un vrai `<button>` avec :
  - un `aria-label` qui donne le nom et l'état (« Parcelle de blé — Mûre · prête à récolter »), mis à jour par le rendu incrémental ;
  - un `aria-pressed`.
- Le décor (arbres, haies, lanternes) est en `aria-hidden`.
- Clavier :
  - Tab atteint les entités, avec un focus-visible au même contour que la sélection ;
  - Entrée sélectionne, ce qui a été vérifié ;
  - Échap désélectionne.
- Une région `aria-live` annonce la sélection et les gains (« Quête terminée : +12 Énergie… »). L'information n'est jamais portée par la seule couleur : étiquettes texte et icônes de forme distincte.
- `prefers-reduced-motion`, vérifié avec Playwright `reducedMotion: 'reduce'` :
  - 0 animation active au repos : nuages, villageois, eau et cristal sont figés ;
  - aucun jeton ne vole ; le HUD se met à jour directement avec un surlignage ;
  - le bâtiment apparaît en fondu, et le +3 apparaît en fondu sans mouvement.
- Un bouton bascule manuel « Animations réduites » existe en plus.
- Panneau : cibles de 44 px minimum. HUD : pastilles de 48 px.
- Aucun son automatique.

**Limites**
- Sur la carte mobile à l'échelle par défaut, plusieurs cibles font moins de 44 px : villageois environ 18×27 px, petits bâtiments environ 41 px de large. Il faut zoomer ou passer par une liste.
- L'ordre de tabulation passe par la carte avant le panneau de quête. Il faudrait l'inverser.
- Le glisser pour déplacer la carte n'a pas d'équivalent bouton dans ce spike.

### Coût de développement

**Volume et structure**
- Environ 1 800 lignes au total : `art.js` 471, `fx.js` 281, `scene.js` 247, `main.js` 184, `terrain.js` 159, `css` 160, `palette.js` 134, `iso.js` 56, `layout.js` 56.
- Modules ES natifs, sans build, sans npm, sans bibliothèque. Ce sont des fichiers statiques servis tels quels : compatibilité LiteSpeed/PHP statique immédiate.
- Débogage excellent dans DevTools : chaque entité est un élément inspectable.

**Courbe d'apprentissage** : modérée. Il faut maîtriser :
- la projection 2:1 ;
- l'astuce de la matrice SVG pour le sol ;
- les teintes -t, -l, -r ;
- les règles de profondeur (z-index par case avant ; le muret a une profondeur manuelle).

**Passer au vrai jeu** : il faudrait environ 3 à 5 semaines à temps partiel.
- Ce qui se fait facilement :
  - brancher la scène sur l'interface de tâches existante : même DOM, mêmes boutons, même accessibilité ;
  - un mode construction : placement, fantôme, validité.
- Ce qui demande plus de travail :
  - des trajets de villageois ;
  - des états de bâtiment (dégâts, niveaux).
- **Le vrai coût, c'est l'art** : chaque nouveau bâtiment demande 30 à 80 lignes de géométrie écrite à la main, soit 1 à 3 h. On peut aussi importer des SVG dessinés dans Figma ou Inkscape, mais ils doivent respecter les classes de teintes.

**Maintenabilité** : bonne, car l'état est un simple objet et le rendu est réconcilié par clés.

**Risques**
- Au-delà d'environ 100 entités animées, le coût de Layerize et de recalcul de style grimpe.
- Recolorer toute la scène coûte cher.
- Le panoramique par transform charge le thread principal. Le défilement natif serait préférable.

### Verdict

DOM/CSS + SVG est une option viable et peut-être la plus pragmatique pour CETTE échelle : une île de 12×12, une quarantaine d'entités, et des moments spectaculaires mais ponctuels.

**Arguments pour**
- Environ 36 Ko gzip et zéro dépendance.
- Déploiement statique trivial.
- Meilleure accessibilité native : vrais boutons, `aria-live`, clavier.
- Intégration directe avec l'interface de tâches.
- Le rendu incrémental par clés rend les transitions d'état naturelles (pousse, récolte, construction, retrait).
- Le résultat visuel est cohérent et chaleureux, nettement plus beau que le prototype.
- Rendu jour/nuit élégant grâce aux variables CSS.

**Arguments contre (honnêtement)**
- Sous ×4 CPU, le repos tient 60 FPS, mais les moments retombent à environ 50 FPS de moyenne, avec des pics de 67 à 150 ms au déclenchement.
- Le panoramique plafonne vers 52 FPS.
- Une recoloration globale en direct coûte environ 8 FPS.
- L'architecture n'a pas de marge pour la météo plein écran, l'éclairage dynamique, des dizaines de villageois ou des centaines de particules.
- Chaque asset coûte du code dessiné à la main.
- Sur mobile, la scène reste petite : il faut zoomer pour viser les villageois.

**Recommandation** : retenir DOM/SVG si l'ambition reste un diorama vivant au service de la liste de tâches, avec ces mesures :
- défilement natif pour le panoramique ;
- réserves de particules pré-créées ;
- couleurs d'heure mises à jour à la minute ;
- environ 100 entités maximum.

Si le jeu doit devenir plus riche en simulation et en effets, préférer Canvas 2D ou PixiJS, en gardant le DOM pour l'interface.

Scripts de mesure et résultats : `shoot.cjs`, `perf.cjs`, `perf-dpr1.json` et `perf-dpr2.json`, dans le même dossier. Le serveur a été arrêté.

## canvas-pixi

Notes (sur 10) : visuel 7 · juice 8 · perf 6 · accessibilité 7 · coût de dev 6

### Qualité visuelle

Jugement après lecture de toutes les captures (deux itérations de correction).

CE QUI MARCHE
- Le socle est continu : une seule surface d'herbe marbrée, sans aucune ligne de grille. Les deux faces de falaise ont trois strates ocre, des cailloux, des racines et une lèvre d'herbe avec coulures, plus un liseré lumineux sur l'arête. Le reflet et l'ombre portée tombent sur un lac turquoise.
- L'île ne flotte plus dans le vide : lac avec écume animée, rochers, nénuphars, un huard qui glisse avec son sillage. En fond, une rive de conifères en deux plans évoque littéralement « l'Orée ».
- Les 4 parcelles sont vraiment à plat, avec des sillons projetés en iso. On lit bien les trois stades : semis sur terre humide, pousses, blé et courges mûrs. Une parcelle récoltée retombe en sillons nus, ce qui reste lisible.
- Chemin continu en traits arrondis projetés, avec gravier et placette. Ombres portées cuites dans le sol. Ruisseau qui part d'une source et finit en petite cascade sur la falaise. Ponton, escalier et barque au bout du chemin.
- Le style flat-shaded est cohérent partout : une seule direction de lumière, arêtes fines, même palette que 006 (ocre, sauge, bois blond, verre turquoise, crème). La braise n'est jamais utilisée.
- Lisibilité des bâtiments :
  - la serre se lit comme du verre, plantes visibles et reflets ;
  - le silo a un dégradé cylindrique ;
  - la tour-relais est un vrai treillis avec un cristal turquoise ;
  - le muret du Bastion a des créneaux, de la mousse, des glyphes et une porte scellée.
- La nuit est la plus belle capture : lanternes chaudes, cristal et sceaux turquoise, serre éclairée de l'intérieur, fenêtre allumée, lucioles. À 1280×900, le rendu tient d'une vraie illustration de jeu cosy.

CE QUI FAIT ENCORE AMATEUR OU POSE PROBLÈME
1. Sur mobile, l'île fait environ 390×290 px CSS. Une case fait environ 36 px et un villageois environ 20 px de haut. Les lanternes ressemblent à de petits drapeaux et les particules de récolte sont minuscules.
2. En portrait, l'île (rapport 2:1) laisse beaucoup d'eau vide sous elle. Le lac décoré atténue l'effet sans le supprimer.
3. Le soir, le filtre global fait virer l'eau turquoise au vert et sature la falaise.
4. Le contour de sélection remplit les vides du treillis de la tour, qui paraît blanchie.
5. L'anneau de sélection d'une parcelle est fin et en partie caché par les cultures.
6. L'art procédural plafonne au niveau « bonne illustration vectorielle » : arbres en cercles, personnages sans visage, porte du Bastion peu lisible. On est loin d'un art peint à la Township.
7. Les textures sont cuites en résolution 3. Elles deviennent molles au zoom maximum (×2,8) sur un écran DPR 3.

Bilan : nettement plus beau et cohérent que 006, et aucun des défauts listés dans le brief n'est reproduit. Mais ce n'est pas encore un rendu commercial, et sur téléphone la scène reste petite tant qu'on ne zoome pas.

### Game feel

(1) « Quête terminée »
- La tour fait un squash rapide, puis une onde et un flash turquoise additifs et 10 étincelles partent du cristal.
- 9 icônes de ressources jaillissent en éventail avec gravité pendant environ 360 ms.
- Elles volent ensuite en courbe de Bézier vers leur pastille du HUD, avec arrivées étalées et traînée d'étincelles.
- Chaque arrivée ajoute exactement +1 : le compteur défile en 320 ms et la pastille rebondit (CSS). Le compteur ne saute donc jamais avant l'arrivée, ce qui corrige le bogue de 006.
- Limite : le HUD étant en DOM au-dessus du canvas, les icônes passent sous la pastille. L'absorption est suggérée, pas montrée.

(2) « Construire »
- Fantôme pulsé sur la case (380 ms), puis chute de 440 ms avec étirement vertical et ombre au sol qui grandit.
- À l'impact : squash à 0,7 suivi d'un rebond en ressort amorti sur 620 ms, onde au sol, 24 bouffées de poussière, 8 éclats et secousse de caméra de 260 ms.
- Très lisible sur gazon dégagé. Le libellé est annoncé à l'impact, pas avant.

(3) « Récolter »
- Les cultures sautent puis éclatent l'une après l'autre (décalage de 18 ms), chacune lâchant 4 particules (grains et étincelles additives).
- Un « +3 » et l'icône Énergie apparaissent (Pixi Text, rebond outBack), montent et s'effacent. Le compteur est synchronisé.
- La parcelle reste labourée. Si plus rien n'est mûr, une repousse animée permet de rejouer.

Ambiance continue :
- 2 villageois (Solène, Milo) marchent en boucle sur le chemin avec 2 images de pas et un balancement, avec des pauses.
- Cascade en TilingSprite, écume qui respire, nuages et leurs ombres qui dérivent, huard, pulsation du relais, lucioles la nuit.

Mouvement réduit (prefers-reduced-motion, suivi en direct) :
- Les trois moments deviennent instantanés ou en fondu de 200 ms : pas de vol, de chute ni de secousse ; le compteur flashe au lieu de rebondir.
- Villageois garés, nuages, eau et huard figés.

Faiblesses : particules de récolte trop petites au zoom mobile par défaut ; ni son ni haptique.

### Performance

POIDS
- Total chargé : 967 Ko bruts (python http.server ne compresse pas).
  - pixi.min.mjs : 841 319 o, soit 85 % du total
  - main.js : 46 Ko ; art.js : 43 Ko ; fx.js : 3 Ko
  - styles.css : 10 Ko ; police Nunito woff2 : 38 Ko
- En gzip : environ 310 Ko, dont Pixi 237 Ko.
- Aucune image : tout est procédural, y compris les icônes SVG rastérisées au chargement.
- Mémoire JS : 14,5 Mo.

DÉMARRAGE (localhost, sans latence réseau)
- Cuisson des textures : 175 ms sans ralenti, environ 840 ms avec CPU x4.
- Premier rendu (390×844, DPR 2) : 1,29 s sans ralenti, 2,16 s avec CPU x4.
- Premier rendu 1280×900 avec CPU x4 : 2,82 s.

FPS MESURÉS (moyenne / minimum sur fenêtre glissante de 250 ms)
Conditions : Chromium headless, GPU émulé en logiciel (SwiftShader). Le conteneur n'a pas de GPU.
- 390×844, DPR 2, CPU x4 :
  - repos jour 3,4 / 3,0 ; repos nuit (filtre actif) 6,6 / 6,0
  - quête 3,2 / 2,7 ; construire 2,6 / 2,1 ; récolter 2,7 / 2,2 ; quête de nuit 5,3 / 3,7
- 390×844, DPR 2, sans ralenti : jour 3,9 / 2,9 ; nuit 8,5 / 7,1 ; quête 3,6 / 2,5 ; construire 3,6 / 2,7 ; récolter 4,1 / 2,9.
- 390×844, DPR 1, CPU x4 : jour 9,0 / 6,3 ; nuit 8,9 / 7,5 ; quête 8,7 / 6,3 ; construire 9,3 / 8,0 ; récolter 9,1 / 7,5.
- 1280×900, DPR 1, CPU x4 : 2,6 à 2,9 / 2,1 à 2,5 partout.

INTERPRÉTATION
- Ces FPS ne sont pas représentatifs d'un téléphone. Ils sont plafonnés par la rastérisation logicielle :
  - le ralenti x4 ne change presque rien, alors que passer de DPR 1 à DPR 2 divise les FPS par environ 2,5 ;
  - forcer un filtre identité le jour double les FPS (6,7 contre 3,0), ce qui signe un chemin lent propre à SwiftShader.
- Coût main thread par image avec CPU x4 (JS + préparation du rendu Pixi) :
  - moyenne 4,9 ms au repos, 5,3 ms quête, 6,6 ms construire, 8,0 ms récolter ;
  - p95 de 10 à 23 ms, pire image 23 ms.
  - Le budget JS de 60 i/s est donc tenu, sauf quelques pics.
- Appels de dessin : 3,6 par image le jour, 6 la nuit (excellent batching).
- Remplissage GPU estimé : environ 5 couches plein écran × 1,3 Mpx (résolution plafonnée à 2). Ce devrait être léger pour un vrai GPU mobile, mais ce n'est PAS mesuré : un test sur Android d'entrée de gamme est obligatoire.
- Optimisations évidentes : fusionner les 4 couches de fond plein écran (dégradé, 2 vaguelettes, rive) ; désactiver le filtre le jour (déjà fait).

### Accessibilité

CE QUI EST EN PLACE
- Le canvas est aria-hidden. Au-dessus, un calque DOM de 14 boutons transparents (.hotspot), un par entité sélectionnable.
  - Chaque bouton est repositionné à chaque mouvement de caméra (transform), et en continu pour les villageois.
  - Ils sont en pointer-events:none, donc les gestes (glisser, pincer, molette) atteignent le canvas, mais ils restent focusables.
- Tabindex « roving » : un seul arrêt Tab pour toute la carte. Les flèches, Début et Fin passent d'un élément à l'autre.
  - Le focus sélectionne l'entité dans le canvas (contour et bulle), ramène la caméra si elle est hors champ et affiche un anneau pointillé bien visible (capture m16).
- Chaque bouton a un aria-label « nom + état » et l'élément sélectionné porte aria-current.
- Une région aria-live polie annonce les gains, les constructions et les récoltes ; un toast visible double l'annonce.
- Vue liste alternative « Éléments de la ferme » : même contenu, boutons « Situer » et « Récolter » contextuel, cibles de 44 px ou plus.
- Les nombres du HUD sont du vrai texte DOM. Une ressource n'est jamais signalée par la couleur seule (icône + libellé + nombre).
- Toutes les commandes de carte ont un bouton : zoom +, zoom −, recentrer, liste. Au clavier : flèches pour déplacer, +/− pour zoomer, 0 pour recentrer, Échap pour désélectionner.
- prefers-reduced-motion est respecté en direct, y compris l'ambiance. Aucun son.

LIMITES CONSTATÉES
1. Recouvrement des cibles tactiles : un toucher visant la porte du Bastion a sélectionné l'entrepôt, placé devant. En iso, un petit objet derrière un grand est difficile à toucher. Il faudrait permettre de faire défiler les entités superposées au toucher, ou affiner les zones de toucher.
2. Non vérifié sur un vrai lecteur d'écran. En particulier, l'activation VoiceOver d'un bouton en pointer-events:none est à confirmer.
3. La bulle de sélection est aria-hidden ; l'information passe par la région live.
4. Avec la liste ouverte, les captures headless montrent le canvas transparent au-dessus du panneau. Le résultat dépend de la taille de la zone capturée (bleu correct si la capture exclut le panneau). C'est très probablement un artefact de capture SwiftShader, à vérifier sur appareil.
5. Le calque d'accessibilité est un second système parallèle à maintenir à la main pour chaque nouvelle entité.

### Coût de développement

LA DÉMO
- Environ 2 050 lignes au total (art procédural 600, scène et caméra 860, fx 80, CSS et HTML).
- Pour un développeur à l'aise, c'est 1 à 2 jours.

PASSER À UN VRAI JEU : environ 3 à 5 semaines pour une base solide
- carte pilotée par des données (JSON) ;
- mode construction avec validation de grille et glisser-déposer ;
- sauvegarde de l'état de jeu ;
- inertie de caméra ;
- touchers plus fiables ;
- gestion de la perte de contexte WebGL (Safari mobile en arrière-plan, non gérée ici) ;
- calque d'accessibilité généralisé ;
- tests.

LE VRAI GOULOT : L'ART
- Chaque nouveau bâtiment demande 50 à 120 lignes de dessin en code. Un graphiste ne peut pas itérer seul.
- Alternative : dessiner en SVG ou PNG puis charger (Pixi le gère), au prix d'un pipeline d'assets.

COURBE D'APPRENTISSAGE : moyenne
- L'API v8 diffère beaucoup des tutoriels v6/v7.
- Pièges rencontrés :
  - generateTexture tronque le cadre, il faut calculer l'ancre soi-même ;
  - setFromMatrix pour projeter le sol ;
  - ordre des déclarations en module (erreur TDZ).
- Les maths iso et le tri en profondeur restent à notre charge.

SANS BUILD
- Tout fonctionne en modules ES natifs avec import direct de pixi.min.mjs.
- Mais sans tree-shaking, on livre toujours 841 Ko bruts (237 Ko gzip), quoi qu'on utilise. Une mise à jour de Pixi revient à remplacer un fichier.

LITESPEED STATIQUE : compatible, avec 4 précautions
1. Servir .mjs en type MIME JavaScript (AddType text/javascript .mjs dans .htaccess) ou renommer en .js. Sinon le module est refusé à cause du contrôle strict du type MIME.
2. Activer gzip ou brotli pour .mjs.
3. Copier pixi.min.mjs et la police dans /vendor (ne pas déployer node_modules).
4. Mettre un cache long.

L'interface utilitaire (liste de tâches, formulaires) doit rester en DOM et ne coûte rien de plus.

### Verdict

PixiJS v8 donne le meilleur rendu de type « jeu » de cette famille d'options :
- vraies particules, lumières additives, filtre jour/nuit global en une ligne ;
- 3 à 6 appels de dessin par image ;
- coût JS d'environ 5 ms par image même avec le CPU ralenti x4.

Les trois moments sont convaincants et synchronisés, et la nuit est franchement belle.

Mais la qualité visuelle vient du travail d'art, pas de Pixi. Dessiné en code, on plafonne à une illustration vectorielle propre. Sur un téléphone de 390 px, l'île 12×12 reste petite et les détails (villageois, particules) se perdent sans zoom.

Les coûts réels :
- 237 Ko gzip de bibliothèque, contre 0 pour du DOM ou du SVG ;
- un calque d'accessibilité à reconstruire et maintenir à la main (fait ici, et il fonctionne) ;
- une gestion de la perte de contexte WebGL à ajouter ;
- un risque non levé : les FPS sur un vrai appareil, que je n'ai pas pu mesurer sans GPU.

Recommandation : bon choix si Alex veut du « jus » de jeu vidéo, à condition de cantonner Pixi à la carte et de garder toute la boucle utilitaire en HTML (ajouter, classer, voir la meilleure prochaine tâche). Il faut valider le framerate sur un Android d'entrée de gamme avant de s'engager. Si la priorité est la légèreté et l'accessibilité native, une carte SVG ou DOM bien animée offrira 80 % de l'effet pour une fraction du coût.

## three-voxel

Notes (sur 10) : visuel 8 · juice 7 · perf 5 · accessibilité 6 · coût de dev 4

### Qualité visuelle

Jugement fait sur les captures. C'est nettement plus beau et plus cohérent que le prototype 006, et c'est la principale force de l'option.

Ce qui fonctionne :
- L'île 16×16 (ferme 12×12 plus une couronne de 2 cases) repose sur un vrai socle continu. On voit une tranche de terre en strates (herbe, ocre, terre profonde, roche), avec de la mousse qui coule, des pierres incrustées, des racines et un dessous effilé en escalier. Plus de tuiles disjointes ni de cageots.
- Les parcelles sont à plat, en sillons, et les 4 stades se lisent : ail sous paille, épinards, blé doré, courges.
- La lumière est réelle : soleil avec ombres douces PCF, lumière hémisphérique, biseau lumineux sur les arêtes et occlusion de contact calculés dans le shader. Cela donne un aspect « jouet précieux » cohérent sur 1 700 voxels.
- Le jour/soir/nuit change vraiment l'ambiance : flaques chaudes des lanternes, serre qui luit turquoise, fenêtres allumées, lune et étoiles, ciel CSS et collines piloté par la même source.
- La palette DESIGN.md est tenue (sauge, ocre, bois blond, verre solaire ; braise inutilisée). Les toits de tôle verte font Québec rural.
- Ruisseau, pont, cascade sur la tranche, haie, érables dorés et conifères complètent le décor.

Ce qui fait encore amateur ou fragile :
1. À 390 px, une case fait environ 23 px. Villageois (environ 27 px même agrandis ×1,22), cultures et particules restent petits ; la récolte d'une parcelle 2×2 est un moment minuscule à l'écran.
2. La tour-relais se lit comme un échafaudage fin.
3. La cascade est une pile de boîtes qui finit dans un halo de brume.
4. Les nuages voxel restent des blocs (bien mieux maintenant qu'ils vivent derrière l'île dans le repère caméra).
5. Les collines SVG 2D sont légèrement hors style par rapport au voxel.
6. Le muret du Bastion est en partie masqué par le silo dans la vue par défaut.
7. La police est système (Trebuchet ou DejaVu selon la plateforme).
8. La nuit, la carte reste lisible mais sombre.
9. Le libellé de sélection d'un villageois couvre un quart de l'île.

Deux itérations ont été faites :
- Itération 1 : nuages posés visuellement sur l'île, collines cachées par le panneau, libellé qui sortait de l'écran, nuit illisible, cascade sans fin.
- Itération 2 : particules invisibles, icônes hors écran, nuages nocturnes bleu plastique, ombre de chute pâle.

### Game feel

Les trois moments fonctionnent et ont été vérifiés image par image grâce à une horloge virtuelle (`?manual=1`, `__api.advance(ms)`).

1. « Quête terminée » : la Tour-relais se tasse puis rebondit (squash), une onde turquoise additive s'étend au sol, 14 étincelles 3D partent du cristal et son halo pulse. Ensuite 9 icônes DOM (5 Énergie, 3 Matériaux, 1 Confiance) jaillissent en éventail, contraintes à l'écran, puis filent en arc de Bézier accéléré vers leur pastille du HUD. À chaque arrivée, le compteur défile (128→143) et la pastille rebondit (1 → 1,13 → 0,97 → 1). C'est le moment le plus satisfaisant ; le lien diégétique (la tour relaie l'élan) est lisible.

2. « Construire » : l'atelier tombe de 13 unités en accélérant, étiré verticalement, avec une ombre ronde qui se densifie au sol. L'ombre portée réelle est recalculée à chaque image. À l'impact : secousse caméra de 0,18 unité, 30 bouffées de poussière crème en anneau, 12 éclats de terre et d'herbe qui rebondissent au sol, puis un squash & stretch amorti à volume conservé (`exp·cos`). Les piquets du terrain disparaissent. C'est bon, mais la poussière en cubes reste discrète à cette échelle.

3. « Récolter » : vague diagonale de 16 plants qui sautent, gonflent puis rapetissent, 5 particules dorées par plant (80 au total) et un éclat doré additif au sol. Ensuite « +3 Énergie » monte et s'efface, et le compteur rebondit. Après la correction des tailles c'est lisible, mais petit sur mobile.

Autres retours :
- Sélection au toucher : raycasting sur InstancedMesh, contour à double coque inversée (crème intérieur, encre extérieur, en unités monde), petit saut, libellé contraint à l'écran avec une flèche qui suit.
- Rotation : vraie rotation 90° animée, au bouton, au balayage ou avec Q/E. Ombres, soleil CSS et nuages restent cohérents ; c'est un net avantage sur le DOM/CSS.

Manques : pas de son ni d'haptique, pas de météo, villageois sans interaction.

prefers-reduced-motion :
- pas de vie ambiante (0 rendu au repos) ;
- rotation instantanée ;
- quête sans vol d'icônes : liseré sur la pastille et annonce `aria-live` ;
- bâtiment qui apparaît sélectionné, sans chute, poussière ni secousse ;
- récolte sans vague : le « +3 » reste immobile puis s'efface.

### Performance

Mise en garde majeure : le conteneur n'a pas de GPU. Chromium rend WebGL2 avec SwiftShader, un rastériseur logiciel sur CPU, et le ralentissement CDP ×4 ne touche que le thread principal. Les FPS ci-dessous mesurent donc le CPU du conteneur, pas un téléphone. Le FPS réel sur GPU mobile n'est pas mesuré ici et reste à vérifier sur un appareil.

Poids (three 0.185.1 : la 0.186 ne publie plus de .min) :
- 844 Ko bruts : three.core.min 385 Ko, three.module.min 366 Ko, main.js 81 Ko, index 12 Ko.
- ≈ 218 Ko en gzip -9 (101 + 87 + 26 + 4).
- Aucune ressource externe.

Scène :
- 60 appels de dessin, 51 500 triangles, 9 programmes de shader, tas JS 9,5 Mo.
- Carte d'ombres 2048² ; MSAA actif ; DPR plafonné à 2 ; `powerPreference: low-power`.

Démarrage à 390×844 en localhost :
- CPU ×4, DPR 2 : premier rendu WebGL 1,03 à 1,09 s, FCP 0,42 à 0,50 s, DOMContentLoaded 0,72 s.
- CPU ×1, DPR 1 : premier rendu 0,65 s.
- Sur réseau mobile, ajouter le transfert d'environ 218 Ko.

Au repos :
- 0 rendu/s mesuré : le rendu à la demande fonctionne, y compris en mouvement réduit.
- Le rendu s'arrête quand l'onglet est caché.
- Avec la vie ambiante (cible 30 i/s, pilotée par setTimeout, pas une boucle rAF continue) : 2,1 i/s à DPR 2 et 7,5 i/s à DPR 1 (min 2,1) sous SwiftShader.

| Configuration (CPU ×4, chaque mesure après 3 s de repos) | Quête | Construire | Récolte | Rotation | Curseur d'heure |
|---|---|---|---|---|---|
| DPR 2, canvas 780×1688 : moyen actif (min) | 17,3 (1,5) | 1,1 (1,1) | 4,5 (1,6) | 2,2 | 2,7 (1,0) |
| DPR 1 : moyen actif (min) | 10,4 (1,5) | 3,3 (2,4) | 3,5 (2,6) | 6,8 (3,2) | 5,4 (2,1) |

Diagnostic à DPR 1, ×4, sans MSAA : les 24 premières images de la quête passent entre 16 et 40 ms (≈ 25 à 60 i/s) avant que le rastériseur logiciel ne sature.

Ce qui se transpose sur un vrai téléphone :
- Coût CPU par image (JS et soumission WebGL) à ×4 : 2 à 12 ms en moyenne, pic à 35 ms.
- Un à-coup de compilation des shaders au premier usage (≈ 200 ms par rendu pendant la première quête) a été trouvé et corrigé : maillages d'effets réutilisés et `renderer.compileAsync` après le premier rendu.
- Le chemin le plus coûteux est la carte d'ombres 2048² recalculée à chaque image pendant la chute du bâtiment et le déplacement du curseur d'heure. Ailleurs, l'ombre n'est mise à jour que quand le monde change.
- Leviers batterie : vie ambiante à 15 i/s ou coupée après inactivité, DPR 1,5, ombres 1024.

### Accessibilité

Le canvas est opaque pour les technologies d'assistance. Tout l'essentiel est donc doublé en DOM :
- HUD en vrais éléments, chacun avec un `aria-label` ;
- panneau de commandes en boutons natifs, curseur d'heure avec `aria-valuetext` (« 14 h 00, jour ») ;
- liste « Lieux de la ferme » (sr-only) dont chaque bouton sélectionne l'entité en 3D au focus : vérifié au Tab, les 12 entités défilent avec contour et libellé ;
- annonces `aria-live` pour la sélection et les gains (« Quête terminée : plus 15 Énergie… ») ;
- touches Q/E pour la rotation et Échap pour désélectionner ; le balayage a des boutons équivalents ;
- aucune cible sous 44 px (vérifié par script) ;
- contrastes : encre sur papier, libellés secondaires ≈ 7:1 ;
- aucun son.

prefers-reduced-motion est respecté, testé avec l'émulation Playwright et via `?rm=1` :
- vie ambiante coupée et bouton désactivé (0 rendu au repos) ;
- rotation instantanée ;
- pas de vol d'icônes, de chute, de secousse ni de vague ;
- liseré statique sur la pastille ;
- « +3 » immobile.

Limites :
- le focus de la liste sr-only n'est pas visible en soi (seul le contour 3D l'est) ;
- l'état du monde n'est décrit qu'à travers les noms et descriptions ;
- le contraste des objets 3D dépend de l'heure, et la nuit reste sombre ;
- une vraie app devra garder la liste de tâches entièrement en DOM, la 3D servant de décor et de retour visuel.

### Coût de développement

Le spike tient en 1 374 lignes de main.js et 166 lignes d'index.html, écrites dans cette session.

Ce qui est simple :
- Sans build : une importmap locale et three vendorisé (deux fichiers).
- Compatible LiteSpeed statique : il suffit des bons types MIME et d'activer gzip ou brotli.
- La boucle tâches resterait en DOM au-dessus du canvas, ce qui sépare proprement utilitaire et monde.

Ce qui coûte cher pour passer de la démo au vrai jeu :
1. Modéliser chaque bâtiment en code, boîte par boîte, prend 30 à 60 lignes de coordonnées par objet. Pour une ferme évolutive (niveaux, dégâts, saisons), il faudrait passer à MagicaVoxel (.vox) avec le VOXLoader de three/examples, ce qui ajoute un pipeline d'assets.
2. Il faut des compétences 3D réelles : bases et projections, instanciation, ombres (biais, PCF), raycasting, et des shaders injectés par `onBeforeCompile`, fragiles d'une version de three à l'autre.
3. three bouge vite : PCFSoftShadowMap est déprécié, les unités de lumière ont changé en r155, et les .min ne sont plus publiés en 0.186. Il faut épingler la version et vendoriser.
4. Placer des bâtiments, faire glisser une caméra et zoomer au pincement restent à écrire.
5. Les tests visuels exigent un vrai téléphone : SwiftShader ne dit rien du GPU. Pour la CI, il faut une horloge manuelle (déjà prévue ici).

La maintenabilité est bonne si l'architecture reste découpée : monde (voxels), effets, caméra et HUD DOM.

Estimation : 2 à 4 semaines de plus que l'option DOM/Canvas 2D pour un monde de qualité équivalente, dont l'essentiel en contenu 3D.

### Verdict

C'est l'option la plus belle et la plus « vrai jeu » des trois pistes.

Ce qu'elle apporte :
- un socle continu crédible ;
- la vraie lumière, les ombres et le jour/nuit presque gratuits une fois le modèle d'éclairage posé ;
- une vraie rotation 90° ;
- des moments juteux, la quête en tête.

Le rendu à la demande tient sa promesse batterie au repos : 0 rendu par seconde. Le coût est concentré dans la vie ambiante et les recalculs d'ombre.

Ce qu'elle coûte :
- environ 218 Ko gzip, nettement plus lourd que Kaplay ou Pixi ;
- une complexité de développement élevée : modélisation, shaders, compétences 3D ;
- une échelle mobile serrée (environ 23 px par case), qui rend les villageois et les récoltes petits ;
- une accessibilité qui oblige à une couche DOM parallèle ;
- surtout, des performances GPU non vérifiées : le conteneur n'a que SwiftShader.

Je la recommande si Alex veut un monde de jeu incarné, à condition de :
1. garder les tâches en DOM ;
2. vendoriser three 0.185.x ;
3. couper la vie ambiante après inactivité (ou la passer à 15 i/s) ;
4. plafonner le DPR à 1,5–2 et limiter les ombres au besoin ;
5. modéliser avec MagicaVoxel ;
6. valider d'abord sur un iPhone et un Android milieu de gamme.

Si ce test sur appareil déçoit, ou si le budget de développement est serré, une option 2D (Canvas ou Pixi) avec de faux reliefs sera plus sûre.
