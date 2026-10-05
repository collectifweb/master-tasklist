# Playtest « Orée vivante » (006)

J'ai joué tout le parcours dans Chromium/Playwright à 390×844 (tactile), 834×1112 et 1280×900 : onboarding, quête conseillée, ajout/modification/suppression de quêtes, entités de la carte, plantation, réparation de la serre, déblayage, construction (silo, balise, parcelle), jours 2 à 4 avec incidents payants et gratuits, récolte et chapitre 1 terminé. Aucune erreur console, aucune requête en échec, pas de débordement horizontal. Le dépôt n'a pas été modifié. Le serveur sur le port 8080 est arrêté.

## Première impression (10 s)
- **Ce qui marche :** l'onboarding est court (3 cartes) et lisible, la palette chaude se tient. On comprend vite le principe « quête réelle → ressources ».
- **Ce qui ne marche pas :** sur mobile (m04), environ la moitié de l'écran est de l'interface. On empile le bandeau « Maintenant », la bulle de Solène, 4 boutons de carte, la carte conseillée, la bande chapitre et la navigation. La ferme elle-même ne fait qu'environ 200×150 px. Le même objectif (« Remettre l'Orée en mouvement ») est écrit **deux fois** à l'écran, et une troisième fois en paraphrase dans la bulle de Solène.
- L'illustration de l'onboarding (m01) est faite d'aplats plats (parallélogramme brun, blocs beiges) sans lien avec le monde isométrique : effet maquette.
- « J1 » dans le HUD mobile est cryptique.
- **Bug visible dès l'arrivée :** la pastille de score de la carte conseillée n'affiche que « PRIORITÉ », le chiffre a disparu (m06). La règle `.task-summary span` donne au texte `color:var(--sage-dark)` sur un fond `--sage-dark`, donc « 80 » est invisible.

## Qualité visuelle
**Cohérent :** palette sauge/ocre/crème, ombres douces, icônes SVG au trait homogènes. La serre (dôme fissuré puis réparé avec lampes et souffle) est l'objet le plus réussi (m24/m25).

**Amateur :**
- **Terrain.** Chaque tuile est un carré tourné avec un espace (`inset:11px`) et une ombre dure `8px 11px 0` (`.tile:before`). Le sol se lit comme des cartes à jouer en escalier, pas comme une terre continue (m32, t02). Le chemin ocre n'est qu'une suite de losanges disjoints. Le plateau flotte sur une plaine verte infinie : pas de bord ni d'épaisseur, aucun arbre, ruisseau ou clôture. Sur tablette et bureau, 30 à 40 % de l'écran est du vert vide (t02, d02).
- **Parcelles.** Ce sont des caisses dressées à rayures verticales, on les lit comme des cageots ou des palissades, pas comme des champs. Les stades de croissance sont subtils (points → tiges → disques jaunes).
- **Bastion.** Une boîte beige et deux plots : il ne ressemble ni à une enceinte ni à un fort, et sur mobile il est coupé au bord droit (« Bastion des… », m30).
- **Autres objets.** La Tour ressemble à un lampadaire champignon et la balise à un bâton orange.
- **Cases bloquées.** Ce sont des tuiles sombres avec des ellipses brunes (bûches ? feuilles ?). Il en reste 4 après le déblayage, sans aucune explication (m27).
- **Rotation 90°.** C'est une rotation CSS 2D de toute la projection : la perspective se casse, la grille passe en « / », le ciel ne tourne pas et les tuiles recouvrent les montagnes (m33).
- **Silo tourné.** Après rotation, le silo se couche sur le flanc comme une gélule (m42), parce que `--entity-rotation` fait tourner `.object` en 2D.
- **Ciel.** Le dégradé, le soleil, les deux crêtes et l'oiseau sont agréables, mais les nuages sont statiques et le raccord entre les crêtes et la plaine est une ligne dure.
- **Typographie.** « Oree Display » n'est jamais chargée : on tombe sur Trebuchet, absent sur Android et Linux, avec un `letter-spacing:-.035em` qui serre les titres.
- **Bug de typo :** l'accent de « Énergie » est rogné (`.resource span{overflow:hidden;line-height:1}`, voir t-zoom-energy.png).
- **Bug criant :** le bouton « Réinitialiser le sandbox » affiche un **énorme SVG noir rempli** (m19). Le SVG n'a ni taille ni `fill:none` dans `.sheet-actions .button`.
- **Ton d'ensemble.** L'interface ressemble à une app (cartes crème, pilules de formulaire pour les ressources), pas à un jeu. Les icônes de ressources sont fines et petites, on attendrait des pictos pleins et charnus.

## Game feel / juice
- **Fin de quête** (m09–m11) :
  - Les particules sont des cercles de 30 px au contour fin.
  - Elles partent du bouton vers le HUD, et à 120 ms elles sont déjà au niveau de la bulle de Solène.
  - L'opacité tombe à 0,08, donc presque rien n'est visible.
  - Les compteurs sautent **avant** l'arrivée des particules (pas de décompte animé, pas de « +3 » flottant).
  - Les ressources ne « rejoignent pas le monde » comme le promet DESIGN.md : elles vont au HUD.
- **+1 Confiance, la récompense rare du jour :** même toast que les autres, aucun moment spécial.
- **Plantation, construction, réparation :** l'objet change d'état instantanément. Pas de rebond, pas de poussière, pas d'échafaudage.
- **Récolte :** une seule particule, la parcelle redevient vide d'un coup (m62).
- **Changement de jour :** un toast et c'est tout. Ciel identique, pas de jour/nuit, pas de météo, pas d'écran « Jour 3 ».
- **Incidents :** un marqueur pulse, mais rien d'autre ne bouge dans le monde (pas d'eau, d'essaim, d'étincelles).
- **Fin du chapitre 1** (m67–m70) : un toast « Signal transmis », un petit rectangle jaune sur la Tour, puis « Explorer l'Orée » sans rien à explorer. ÉCHO-7, Naïma et le fragment « 184 cycles » de STORY.md n'apparaissent **nulle part** dans l'interface. Les paliers de Confiance 5 et 8 ne déclenchent rien.
- **Vie ambiante :** un oiseau, le balancement des cultures mûres, des insectes en points, la serre et la Tour animées. Ni habitants, ni fumée, ni eau.
- Pas de son, pas de vibration (pas de `navigator.vibrate`).

## Frictions UX et bugs
1. **Toasts.** Ils restent 3,8 s, sur mobile à `bottom:90px`, et masquent :
   - la bande chapitre et le bouton « Jour +1 » après chaque action ;
   - **l'option gratuite de chaque incident** (m46, m50, m59) ;
   - le résumé de Confiance de la Tour (m29).

   Sur tablette et bureau, ils couvrent le dock de navigation (t06, d06).
2. **Erreurs dans les dialogues invisibles.** Avec un titre fait d'espaces, le toast d'erreur passe sous le fond du `<dialog>` (m20) : le joueur ne voit rien.
3. **« Confirmer » désactivé** (ressources insuffisantes) a l'air actif (m43). `.placement-actions .place-button` n'a pas de style `:disabled`, et `.button.primary:disabled` (#526f59) est presque identique à #3f6047. Aucun message ne dit ce qui manque, et le catalogue ne grise pas les objets trop chers.
4. **Marqueur d'insectes au-dessus de la Parcelle A.** Il est placé en `INCIDENT_META` 4:2 avec un décalage de +25/−50 px, donc toucher la culture ouvre l'incident (m54). Impossible de récolter avant d'avoir réglé l'incident.
5. **Libellés qui se chevauchent.** Deux incidents se recouvrent (m71). « Irrigation bouchée » est rogné par la serre (d06). Les libellés sont coupés au bord de l'écran (« Tour instable »). Un libellé au survol est masqué par l'objet voisin, seule la sélection monte à 3000.
6. **La caméra ne cadre jamais l'entité sélectionnée.** Le Bastion et la Tour restent tronqués sur mobile et quand l'inspecteur tablette est ouvert (t04).
7. **La carte conseillée dépliée sur mobile** (245 px) recouvre la ferme (m07).
8. **La poignée de la feuille mobile est décorative** : aucun glissement possible, et pas de 3 positions malgré BRIEF.md.
9. **Le glisser-déposer HTML5 du catalogue ne marche pas au toucher sur Android**, alors que l'indication dit « glissez la miniature ».
10. **La bulle de Solène, une fois fermée, ne revient jamais**, même quand elle a une nouvelle réplique (elle réapparaît seulement au rechargement).
11. **Libellés incohérents :**
    - « Priorité 8/10 » (détails), « Priorité 76 » (registre) et une pastille « PRIORITÉ » vide désignent trois choses différentes.
    - « Récolter tôt · gratuit » (insectes) n'a rien à voir avec l'effet réel, qui est d'abîmer la récolte.
    - « Courte, prioritaire et réaliste maintenant » s'affiche même pour une tâche de 1–2 h.
12. **Registre des quêtes.** 19 lignes d'environ 120 px, chacune avec 3 boutons, soit environ 2 800 px à faire défiler, sans filtre ni regroupement. La réinitialisation destructive est en bas de cette même liste.
13. **Nombre de touchers.** La boucle cœur est correcte (3 touchers : déplier, Commencer, Terminer), mais « Commencer » n'a aucun effet : pas de minuteur, pas de villageois en mouvement.
14. **Divers :**
    - Le mode construction place d'abord le fantôme en 0:0, sur les montagnes.
    - Toucher un bâtiment occupé ne donne aucun retour.
    - Sur bureau, la sélection précédente reste affichée en mode construction (d05).
    - README cite `review/` qui n'existe pas.

**« Jour +1 » casse la fiction et ouvre un exploit.** Je l'ai mesuré (m71) : **5,3 s réelles pour 4 jours, Confiance 1→5, Énergie 24, Matériaux 32**. Les cultures mûrissent à la demande, le chapitre se termine en moins de 3 minutes, et la règle « première quête du jour » ne veut plus rien dire. Les incidents ignorés s'empilent sans jamais s'aggraver. Le bouton est en plus placé juste à côté de la progression, comme un bouton de triche.

## Ruptures d'immersion
- Une quête réelle (« Laver les fenêtres ») ne produit **aucun effet dans le monde** : seuls des chiffres montent. Le domaine de la tâche (Maison, Jardin, Véhicule) n'est relié à aucun bâtiment.
- Les personnages se résument à un « S » dans un rond. Milo n'existe que dans des textes de bouton, Naïma et ÉCHO-7 sont absents. Aucun habitant visible.
- Les fiches se ressemblent toutes : titre, une phrase, un bouton. L'inspecteur tablette est vide à 85 % (t04). Pas d'illustration, pas d'historique, pas d'amélioration possible.
- Le temps et la météo ne changent jamais, et le monde n'a pas de bords.
- L'interface couvre la scène en permanence : on a l'impression d'**une todo list devant un diorama**, pas d'une colonie qui vit.

## Top 15 améliorations (impact / effort)
1. **Correctifs express (≈1 h, impact fort)** dans `styles.css` :
   - `.task-summary .task-score b{color:#fff}` (le chiffre réapparaît) ;
   - `.sheet-actions .button svg{width:18px;height:18px;fill:none;stroke:currentColor}` ;
   - `.resource span{line-height:1.3}` pour l'accent de « Énergie » ;
   - un style `:disabled` réellement atténué pour `.place-button` et `.button.primary`, avec la raison (« Manque 3 M ») ;
   - une classe `.catalog-item.is-unaffordable`.
2. **Toasts.** En faire une pastille en haut, sous le HUD, de 2,2 s, qui n'empiète jamais sur `.sheet-panel` ni `.lower-deck`. Afficher les erreurs de formulaire dans `#task-form` (`.form-error`). Ne pas lancer de toast quand une feuille s'ouvre en même temps.
3. **Lier le jour à la date réelle.** Remplacer `data-advance-day` par un rituel « Clore la journée » une fois par date locale, et indexer `confidenceDays` sur la date réelle. Garder « Jour +1 » dans un « Mode démo » explicite. Ajouter une transition coucher → nuit → aube (variables CSS sur `.world-sky`) et un carton « Jour 3 · brume ».
4. **Retour de complétion.** Des icônes pleines de 36 px, 6 à 10 par ressource, qui partent de la carte, passent par le bâtiment lié (entrepôt ou serre) et arrivent au HUD, en arc. Décompte animé des valeurs (`#energy-value`), « +3 » flottant, bannière dédiée pour « +1 Confiance du jour ». Son en WebAudio activable, plus `vibrate(15)`.
5. **Terrain d'île.** Supprimer l'ombre et l'espace propres à chaque tuile (`.tile:before`) et dessiner un socle continu avec une tranche de terre. Ajouter une couronne de décor non constructible (arbres, haies, ruisseau) et un chemin continu.
6. **Parcelles plates.** Remplacer les caisses par un losange labouré avec des sillons, puis des sprites distincts pour semis, pousses et récolte mûre. Montrer les insectes comme des sprites animés.
7. **Caméra intelligente.** Calculer le cadrage d'ouverture à partir de la zone libre (`getBoundingClientRect`), recentrer sur l'entité à chaque `selectEntity`, et toujours garder le Bastion dans le champ.
8. **Désencombrer le mobile.** Fusionner le bandeau d'objectif et la bulle de Solène en une seule carte repliable. Réduire `.chapter-strip` à une fine barre de progression. Regrouper les boutons de carte derrière un bouton unique. On gagne environ 120 px de carte.
9. **Rotation.** Soit vraie rotation (remapper (r,c) → (c, 7−r) et refaire le rendu), soit retirer le bouton. Le silo ne doit plus basculer : utiliser `scaleX(-1)` aux angles 90° et 270°.
10. **Libellés.** Un seul libellé visible à la fois. Marqueurs d'incident réduits à l'icône, libellé au toucher. Libellés maintenus dans l'écran. Ancrer chaque incident sur l'entité touchée plutôt que sur des coordonnées fixes (corrige le point 4 des frictions).
11. **Moment de fin de chapitre.** Une carte plein écran avec ÉCHO-7 et le fragment « 184 cycles », un faisceau de la Tour qui balaie le ciel, une récompense (bâtiment débloqué) et un aperçu du chapitre 2. Une scène d'arrivée de Naïma à Confiance 3.
12. **Personnages visibles.** Bustes SVG pour Solène, Milo et Naïma. Deux ou trois villageois qui marchent sur `.tile.path` (via `offset-path`).
13. **Relier quête et monde.** Associer chaque domaine à un bâtiment (Jardin → serre, Véhicule → atelier). « Commencer » envoie un villageois au bâtiment, qui s'illumine. À la fin, les ressources sortent de ce bâtiment.
14. **Construction plus vivante.** Animation `.entity.just-built` (chute, rebond, poussière, échafaudage de 0,6 s). Glisser au doigt avec des événements pointer plutôt que le drag HTML5. Fantôme posé sur une case libre près de la ferme, pas en 0:0.
15. **Fiches et registre.** En-tête illustré (objet agrandi), frise d'état (« Pousses · récolte demain »), poignée réellement glissable. Registre compact : une ligne par quête, menu « … » pour Modifier/Supprimer, regroupement par domaine. Déplacer la réinitialisation dans un menu Réglages.

## Captures
Toutes dans `/tmp/claude-0/-home-user-master-tasklist/42a9ea1a-9618-5a6f-b0bd-aa8c4184861b/scratchpad/playtest/`.

| Thème | Fichiers |
|---|---|
| Mobile, onboarding et premier écran | m01–m06 |
| Mobile, boucle de quête et récompense | m07–m11, m36 |
| Mobile, registre des quêtes | m12–m20, m12b |
| Mobile, carte et entités | m21–m35 |
| Mobile, construction | m37–m45 |
| Mobile, jours 2–4, incidents, récolte | m46–m54, m57–m64 |
| Mobile, Tour et fin de chapitre | m65–m70 |
| Mobile, exploit « Jour +1 » | m71, m72 |
| Tablette | t01–t08, t-zoom-energy |
| Bureau | d01–d08 |
| Gros plan accent « Énergie » | m-zoom-energy |

Les scripts (`lib.js`, `p1_first.js` … `p10_zoom.js`, `p_probe.js`) et `late-state.json` sont dans le même dossier.

Les plus parlantes : **m04** (premier écran), **m09** (récompense), **m19** (SVG noir), **m33** (rotation), **m42** (silo couché), **m46** (toast sur l'incident), **m71** (exploit), **t02 / d02** (diorama dans le vide).