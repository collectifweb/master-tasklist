---
name: Orée vivante
description: Jeu de ferme blocky, chaleureux et agro-futuriste avec quêtes CRUD, construction directe et incidents physiques.
colors:
  ink: "#273026"
  ink-soft: "#4f5848"
  paper: "#fff8e8"
  cream: "#f7e7bd"
  sunlight: "#f3c879"
  soil: "#aa6c43"
  soil-deep: "#75472f"
  sage: "#718c5d"
  sage-deep: "#3f6047"
  solar-glass: "#58a9a4"
  solar-glass-deep: "#2d7473"
  ember: "#bf5a38"
typography:
  display:
    fontFamily: "Oree Display, Trebuchet MS, sans-serif"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 900
    letterSpacing: "0.08em"
rounded:
  control: "12px"
  panel: "17px"
  sheet: "24px"
  round: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.sage-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
    height: "44px"
  panel-warm:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "12px"
---

# Design System: Orée vivante

## Overview

**Creative North Star: "La lisière réparée"**

Orée vivante transforme une interface de tâches en lieu habité : un matin clair après la tempête, où bois blond, terre ocre, sauge et verre solaire réparent ensemble une colonie agricole. La carte reste l’objet principal; les panneaux standards servent à agir vite sans déguiser les contrôles en instruments fictifs.

La passe corrective rend cette promesse opératoire : la profondeur suit `row + col`, la sélection et son libellé dominent toujours la scène, la tablette réserve un vrai panneau latéral, et le mobile compacte ses deux docks sans réduire la carte. Le registre de quêtes est un CRUD local complet; la construction accepte toucher, clavier et glisser-déposer.

L’expression vient du volume blocky, de la lumière chaude, des silhouettes agricoles et d’un seul geste signature : les ressources gagnées quittent la tâche et rejoignent physiquement le monde. L’orange braise reste réservé aux dommages et menaces.

**Key Characteristics:**
- Carte isométrique continue avant toute vue de registre.
- Palette claire, agricole et patinée plutôt que sci-fi sombre.
- Contrôles tactiles explicites, feuilles mobiles et inspecteur latéral tablette.
- Profondeur compacte par blocs, ombres dirigées et plans superposés.
- Incidents déterministes matérialisés sur la carte et conséquences toujours récupérables.

## Colors

La palette est complète et fonctionnelle : la terre et la sauge portent le monde, le turquoise signale la technologie intégrée, la crème garde les outils lisibles.

### Primary
- **Sauge d’autonomie** : sélection, actions primaires, végétation et progression.
- **Verre solaire** : technologie, informations du Bastion, liens et états techniques.

### Secondary
- **Terre de l’Orée** : parcelles, bâtiments en bois et profondeur de la grille.
- **Lumière de matin** : ciel, réserves, accents de chaleur et signal réussi.

### Tertiary
- **Braise de menace** : casse, danger et alertes uniquement.

### Neutral
- **Papier récolte** : panneaux, feuilles et contrôles.
- **Encre végétale** : texte principal.
- **Encre mousse** : texte secondaire.

### Named Rules

**The Ember Reserve Rule.** La braise n’est jamais décorative; elle indique une menace, une casse ou une action risquée.

**The Living Ground Rule.** Une grande région de l’écran doit toujours appartenir au monde — ciel, culture, terre ou muraille — et non à une surface neutre.

## Typography

**Display Font:** Oree Display, résolu localement vers Trebuchet MS.
**Body Font:** Aptos avec Segoe UI et system-ui en repli.

**Character:** titres trapus et courts pour les objectifs; corps utilitaire, généreux et stable pour la gestion fréquente.

### Hierarchy
- **Display** (900, 1.55–1.75rem, 1) : titres de feuille et onboarding.
- **Title** (850–900, 0.84–1rem, 1.15) : objectifs, ressources et actions.
- **Body** (400, 16px, 1.45) : explications et narration.
- **Label** (900, 0.7rem, 0.08em, capitales) : catégories et états courts.

### Named Rules

**The Working Label Rule.** Les capitales compactes nomment une fonction ou un état; elles ne précèdent jamais un titre comme ornement vide.

## Layout

Mobile d’abord. À 390 × 844, la barre de ressources précède une carte de 58dvh; objectif, personnage, contrôles et tâche recommandée flottent aux quatre bords sans remplacer la carte. La navigation et le chapitre suivent dans une zone basse stable.

À partir de 700 px, l’inspecteur réserve 42 % de la largeur (390 px maximum) au lieu de recouvrir la carte. La navigation et le chapitre restent dans la zone de jeu; la tâche conseillée remonte au-dessus d’eux. Les cibles interactives restent à 44 px minimum. Les espacements suivent principalement 6, 8, 12, 18 et 24 px.

## Elevation & Depth

La profondeur est structurelle : les objets blocky ont des ombres courtes et directionnelles; les panneaux ont une élévation ambiante limitée. Le monde ne dépend ni d’un halo néon ni de verre décoratif. Le flou n’apparaît que lorsque le contenu doit rester lisible au-dessus de la carte.

### Shadow Vocabulary
- **Objet de carte** (`drop-shadow(8px 12px 5px rgba(66,43,25,.25))`) : bâtiments et obstacles.
- **Panneau élevé** (`0 16px 30px rgba(78,53,31,.22)`) : feuilles, onboarding et dialogues.
- **HUD léger** (`0 8px 24px rgba(81,59,31,.12)`) : barre de ressources.

## Shapes

Les contrôles utilisent des angles adoucis de 12 à 17 px; les feuilles mobiles montent à 24 px. Les bâtiments combinent prismes rectangulaires, toits francs et quelques courbes agricoles comme la serre et le silo. Les tuiles de terrain restent des losanges réguliers; les états de placement ajoutent motifs et texte, jamais la couleur seule.

## Components

### Buttons
- **Shape:** rectangle tactile arrondi (12 px), 44 px minimum.
- **Primary:** sauge profonde sur texte clair, poids 850.
- **Hover / Focus:** légère hausse de luminosité; focus sombre de 3 px, décalé de 3 px.
- **Secondary:** papier récolte avec bord discret.

### Cards / Containers
- **Corner Style:** 15 à 17 px, 24 px pour une feuille mobile.
- **Background:** crème ou papier presque opaque au-dessus de la carte.
- **Shadow Strategy:** élévation courte et chaude, jamais halo coloré.
- **Internal Padding:** 10 à 18 px selon la densité.

### Navigation
- Quatre actions constantes avec SVG au trait et libellé.
- Sur mobile, bande basse pleine largeur; sur tablette, module compact dans le coin inférieur droit.
- L’état actif utilise un aplat sauge et un texte clair.

### Carte isométrique
- Grille de losanges sans ligne globale visible.
- Chaque entité est un bouton sémantique superposé à sa case.
- Profondeur de base : `100 + row + col`; sélection et fantôme : `3000`.
- Le libellé sélectionné reste visible au-dessus de l’objet et contre-roté avec la caméra.
- Zoom, rotation et recentrage existent toujours comme boutons, même si le déplacement direct est disponible.
- Le mode construction révèle validité, invalidité et fantôme de placement par motif, contour et libellé.

### Registre de quêtes
- Ajout et édition dans un dialogue standard avec titre, domaine, priorité, durée et effort.
- Actions Modifier et Supprimer toujours explicites; suppression confirmée.
- Recommandation recalculée à chaque mutation locale.
- Titre conseillé en casse normale, limité visuellement à deux lignes.

### Confiance
- Libellé public : **Confiance**, jamais Réputation dans l’interface.
- Règle unique : `+1` à la première quête terminée du jour.
- Toujours montrer la valeur actuelle, le prochain seuil et le bénéfice concret.

### Construction
- Guide visible : Choisir → Placer → Confirmer.
- Miniatures construites avec les mêmes volumes isométriques que la carte.
- Toucher séquentiel, drag/drop avec fantôme aimanté, rotation et confirmation.
- Une seule case tabulable en mode; aucune tuile dans la tabulation hors mode.

### Incidents
- Jour 2 : irrigation bouchée; jour 3 : insectes; jour 4 : Tour instable.
- Chaque incident conserve un marqueur physique tant qu’il est actif ou contenu.
- Option payante sans conséquence et option gratuite avec conséquence récupérable.

## Do's and Don'ts

### Do:
- **Do** laisser la carte dominer le premier viewport mobile.
- **Do** associer chaque dépense à un résultat visible dans le monde.
- **Do** garder Ferme, Bastion et Confiance expliqués en langage direct.
- **Do** réserver les animations fortes à la complétion, la construction et le signal météo.

### Don't:
- **Don't** revenir à un fond charbon, un faux terminal ou du cyan néon omniprésent.
- **Don't** transformer la carte en illustration passive derrière des cartes de tableau de bord.
- **Don't** utiliser la braise comme simple accent décoratif.
- **Don't** cacher une action essentielle derrière un geste sans bouton équivalent.
