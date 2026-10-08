---
name: La lisière rallumée
description: Papier de lanterne posé sur l'Orée. Une feuille chaude, sauge pour agir, qui laisse le monde visible dessous.
colors:
  ink: "#273026"
  ink-soft: "#4f5848"
  ink-muted: "#5c6452"
  paper: "#fff8e8"
  paper-raised: "#fffdf6"
  sunken: "#f6edd6"
  cream: "#f5e6c0"
  cream-face: "#dcc58e"
  line: "#e6dbbf"
  line-strong: "#cdbb8d"
  sage: "#718c5d"
  sage-deep: "#3f6047"
  sage-hover: "#47694f"
  sage-face: "#2c4733"
  sage-wash: "#e4edda"
  glass: "#58a9a4"
  glass-deep: "#2d7473"
  glass-ink: "#245f5e"
  glass-wash: "#dcefeb"
  soil: "#aa6c43"
  soil-deep: "#75472f"
  soil-wash: "#f3e2cf"
  lantern: "#f3c879"
  lantern-glow: "#ffd98c"
  lantern-ink: "#7a5200"
  lantern-wash: "#fbe8b4"
  ash: "#a39b8d"
  ash-ink: "#625c52"
  ash-wash: "#ebe6dc"
  frost: "#9cc0cc"
  frost-ink: "#3d6577"
  frost-wash: "#e2edf1"
  airelle-ink: "#6f3f62"
  airelle-wash: "#f5e6ee"
  ember: "#bf5a38"
  ember-ink: "#a3462a"
  ember-face: "#7c3320"
  ember-wash: "#f8e1d6"
  focus: "#1d3b3a"
  sky-top: "#8ccbe0"
  sky-horizon: "#eef0d2"
  lake: "#7bbabb"
  lake-deep: "#5b9ca3"
typography:
  display:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, \"Segoe UI\", Roboto, \"Noto Sans\", Ubuntu, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, \"Segoe UI\", Roboto, \"Noto Sans\", Ubuntu, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  title:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, \"Segoe UI\", Roboto, \"Noto Sans\", Ubuntu, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  body:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Noto Sans\", Ubuntu, Cantarell, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Noto Sans\", Ubuntu, Cantarell, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Noto Sans\", Ubuntu, Cantarell, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
  numeral:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, \"Segoe UI\", Roboto, \"Noto Sans\", Ubuntu, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\""
rounded:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "20px"
  sp-6: "24px"
  sp-8: "32px"
  sp-10: "40px"
  sp-12: "48px"
  gutter: "16px"
  target: "44px"
  target-lg: "48px"
components:
  button-primary:
    backgroundColor: "{colors.sage-deep}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.sage-hover}"
  button-secondary:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.sage-deep}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.ember-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-small:
    padding: "0 12px"
    height: "44px"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
  resource-tile:
    backgroundColor: "rgb(255 249 235 / 0.94)"
    textColor: "{colors.ink}"
    typography: "{typography.numeral}"
    rounded: "{rounded.lg}"
    height: "52px"
  cote-plate:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.sm}"
    size: "48px"
  tag:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "24px"
  chip:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px 0 12px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.sage-deep}"
    textColor: "{colors.paper}"
  input:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "48px"
  card-reco:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px 16px"
  card-reco-first:
    backgroundColor: "{colors.sage-wash}"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  quest-row:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "64px"
  confirm:
    backgroundColor: "{colors.ember-wash}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.lg}"
    padding: "16px"
  sync-offline:
    backgroundColor: "{colors.frost-wash}"
    textColor: "{colors.frost-ink}"
    rounded: "{rounded.md}"
  sync-error:
    backgroundColor: "{colors.ember-wash}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
  bandeau-alerte:
    backgroundColor: "{colors.frost-wash}"
    textColor: "{colors.frost-ink}"
    height: "54px"
---

# Design System: La lisière rallumée

Source de vérité : `app/css/tokens.css`, `app/css/base.css`, `app/css/components.css`, démontrés par `app/design/reference.html`. Ce fichier décrit ce qui est construit. Les jetons du YAML ci-dessus sont normatifs ; le texte les situe. Le sidecar `app/.impeccable/design.json` porte ce que le YAML ne peut pas tenir (rampes, ombres, mouvement, points de rupture, extraits de composants).

## Overview

**Creative North Star: "Le papier de lanterne"**

L'interface est un papier de lanterne posé sur l'Orée. Le monde (ciel, lac, île) reste dessous et visible ; la feuille est chaude, opaque sous le texte, et ne l'écrase jamais. Alex consulte surtout au téléphone, en visites de quelques secondes : en deux secondes il lit la quête n° 1, sa durée et sa Cote, et touche « Fait ». Tout le reste se déplie à la demande.

Le monde d'origine (006, « La lisière réparée ») est étendu, pas remplacé : papier récolte et crème, sauge, verre solaire, terre, lanterne, cendre. S'y ajoute une matière propre à cette construction, le socle plein : ce qui s'enfonce a une face latérale pleine, comme les strates de l'île ; ce qui flotte a une ombre douce et chaude. La palette est claire et chaude, sans fond sombre ni cyan néon.

**Key Characteristics:**
- Monde dominant : 70 % de la hauteur à 390×844, 74 % à 834×1112, 67 % de la largeur à 1280×900.
- Une seule action principale par vue, en sauge profonde, avec socle.
- Chaque ressource est une matière du monde, toujours doublée d'un picto et d'un mot.
- Aucune couleur seule ne porte un sens : texte, picto ou motif l'accompagne.
- Braise réservée aux menaces et à la casse ; un retard est une caisse de terre, jamais du rouge.
- Cibles de 44 px au minimum, texte à 4,5:1 au minimum, mouvement réductible à presque rien.

### Principes

**La thèse.** L'interface est le papier de lanterne posé sur l'Orée. Elle refuse le tableau de bord de tâches plein écran et la liste qui écrase la carte.

**The Socle Rule.** Ce qui s'enfonce (boutons, plaque de Cote) a une face latérale pleine de 3 px (`--face-h`), verticale seulement, de la même famille de couleur en plus sombre. Ce qui flotte au-dessus du monde (HUD, panneau, feuilles, annonce) a une ombre douce et chaude. On ne mélange pas : un élément a un socle ou une ombre, jamais les deux.

**The Embers Rule.** La braise (`--c-ember`, `--c-ember-ink`) est réservée aux menaces et à la casse. Dans la construction actuelle : l'action destructrice, la confirmation d'une action risquée et l'erreur de synchronisation. Jamais décorative, jamais pour une échéance.

**The Late Crate Rule.** Un retard est une caisse de terre (`--c-soil-deep` sur `--c-soil-wash`, picto de caisse, texte « Attend depuis 3 j »). Aucun rouge, aucune alarme : la tâche attend, elle n'a pas échoué. Même logique pour l'erreur d'un champ : terre, pas braise.

**The Doubled Color Rule.** Toute couleur est doublée : un mot, un picto ou un motif (case pleine avec coche, puce active avec coche dessinée, bord en tirets pour le désactivé, cadenas, « · plein »).

**The World First Rule.** Le panneau replié ne prend que 30 % de l'écran compact. Rien de nouveau n'est ajouté au panneau replié sans retirer autre chose : la quête n° 1, sa Cote, sa raison et deux boutons.

## Colors

Palette de terre chaude : papier crème, encres vertes très sombres, sauge pour agir, verre pour informer, terre pour les Matériaux et les attentes. Chaque puce de la barre a sa matière : verre pour l'Énergie, terre pour les Matériaux, sauge pour la Nourriture, lanterne pour les Habitants, airelle pour le Permis (`--res-*`, `css/tokens.css`). Valeurs dans le YAML ; contrastes calculés par la formule WCAG 2.x sur les jetons (`contrastes.txt`).

### Primary
- **Sauge d'autonomie** (`sage-deep`) : action principale (fond du bouton, de la puce active, de la case faite), Nourriture, texte d'accent. Papier dessus : 6,7:1.
- **Sauge de survol** (`sage-hover`) : survol et appui du bouton principal. Papier dessus : 5,8:1.
- **Socle sauge** (`sage-face`) : face latérale du bouton principal.
- **Lavis sauge** (`sage-wash`) : fond « faite », quartier choisi.

### Secondary
- **Verre profond** (`glass-deep`) : liens, information, Énergie. **Encre de verre** (`glass-ink`) : texte sur lavis de verre (étiquette « estimée »). **Lavis de verre** (`glass-wash`).
- **Terre profonde** (`soil-deep`) : Matériaux, caisses d'échéance, erreur de champ. **Lavis de terre** (`soil-wash`).
- **Encre de lanterne** (`lantern-ink`) : Habitants, « Prioritaire ». **Lavis de lanterne** (`lantern-wash`). **Éclat de lanterne** (`lantern-glow`) : sélection de texte, cœur de la lanterne de Fanal et anneau du cristal sur la carte.

### Tertiary
- **Encre de cendre** (`ash-ink`) sur **lavis de cendre** (`ash-wash`) : quête archivée, fond des squelettes de chargement.
- **Encre de givre** (`frost-ink`) sur **lavis de givre** (`frost-wash`) : hors ligne et tempête de neige annoncée (rangée d'alerte du bandeau, lot H), rien d'autre ; le front de givre du monde, réveillé pendant l'annonce, en emprunte aussi les teintes (`world.css`). Le Permis n'en emprunte pas : il a sa propre famille, l'airelle.
- **Encre d'airelle** (`airelle-ink`, `#6f3f62`) sur **lavis d'airelle** (`airelle-wash`, `#f5e6ee`) : réservée au Permis, comme le papier timbré de la Mairie. Elle teinte le compteur de la barre, la feuille d'aide du Permis et le « +1 » de l'annonce, jamais autre chose. Papier dessus : 7,7:1 ; lavis dessus : 6,8:1 (chiffres du commentaire de `tokens.css`, non recalculés ici).
- **Braise** : `ember-ink` (texte et fond du bouton danger), `ember-face` (socle), `ember-wash` (fond de confirmation et d'erreur de synchronisation). `ember` seul n'est utilisé qu'en pictos et filets (`rgb(191 90 56 / .4–.45)`).

### Neutral
- **Encre végétale** (`ink`), **mousse** (`ink-soft`), **lichen** (`ink-muted`) : texte principal, secondaire, tertiaire (espaces réservés, plafonds, picto discret).
- **Papier récolte** (`paper`) : panneau, feuilles. **Papier neuf** (`paper-raised`) : cartes, champs. **Papier creusé** (`sunken`) : champs de recherche, contrôle segmenté, étiquettes neutres. **Crème** (`cream`) et son socle (`cream-face`) : bouton secondaire.
- **Filets** : `line` entre les lignes, `line-strong` aux bords de champs et plaques.
- **Anneau de focus** (`focus`) : 3 px, décalé de 2 px (3 px sur les boutons).
- **Monde** : `sky-top`, `sky-horizon`, `lake`, `lake-deep` (fond de la coquille). Les bruts `glass`, `soil`, `lantern`, `ash`, `frost`, `sage` : d'après une recherche de `var(--c-…)` dans `app/css/` (hors `tokens.css`), `sage` (`components.css`, `app.css`), `lantern` (`app.css`, `world.css`), `ash` (`app.css`) et `frost` (`world.css`) sont lus tels quels ; `glass` et `soil` ne le sont pas.

### Contrastes mesurés

| Jeton | Valeur | Rôle | Contraste | Fond de référence |
|---|---|---|---|---|
| `ink` | `#273026` | texte principal | 12,9:1 | `paper` |
| `ink` | `#273026` | texte sur bouton crème | 11,0:1 | `cream` |
| `ink` | `#273026` | texte dans un champ de recherche | 11,7:1 | `sunken` |
| `ink-soft` | `#4f5848` | texte secondaire | 7,0:1 | `paper` |
| `ink-soft` | `#4f5848` | texte secondaire creusé | 6,4:1 | `sunken` |
| `ink-soft` | `#4f5848` | texte dans une erreur ou confirmation | 5,9:1 | `ember-wash` |
| `ink-muted` | `#5c6452` | texte tertiaire, espace réservé | 5,8:1 | `paper` |
| `ink-muted` | `#5c6452` | idem, sur crème | 5,0:1 | `cream` |
| `paper` | `#fff8e8` | texte du bouton principal | 6,7:1 | `sage-deep` |
| `paper` | `#fff8e8` | texte du bouton principal, survol | 5,8:1 | `sage-hover` |
| `paper` | `#fff8e8` | texte du bouton danger | 5,7:1 | `ember-ink` |
| `sage-deep` | `#3f6047` | action, Nourriture | 6,7:1 | `paper` |
| `sage-deep` | `#3f6047` | « faite » | 5,9:1 | `sage-wash` |
| `glass-deep` | `#2d7473` | liens, Énergie | 5,1:1 | `paper` |
| `glass-ink` | `#245f5e` | étiquette de verre | 6,1:1 | `glass-wash` |
| `soil-deep` | `#75472f` | Matériaux, caisses, erreur de champ | 7,4:1 | `paper` |
| `soil-deep` | `#75472f` | étiquette « en retard » | 6,2:1 | `soil-wash` |
| `lantern-ink` | `#7a5200` | Habitants, « Prioritaire » | 6,5:1 | `paper` |
| `lantern-ink` | `#7a5200` | texte sur lavis de lanterne | 5,7:1 | `lantern-wash` |
| `ash-ink` | `#625c52` | archivé | 5,3:1 | `ash-wash` |
| `frost-ink` | `#3d6577` | hors ligne | 5,3:1 | `frost-wash` |
| `airelle-ink` | `#6f3f62` | Permis | 7,7:1 | `paper` |
| `airelle-ink` | `#6f3f62` | Permis, sur son lavis | 6,8:1 | `airelle-wash` |
| `ember-ink` | `#a3462a` | texte et picto de braise | 5,7:1 | `paper` |
| `ember-ink` | `#a3462a` | idem, sur lavis | 4,8:1 | `ember-wash` |
| `ember` | `#bf5a38` | picto ou fond seulement | 4,2:1 | `paper` |
| `focus` | `#1d3b3a` | anneau de focus | 11,4:1 | `paper` |
| `focus` | `#1d3b3a` | anneau de focus (élément non textuel, seuil 3:1) | 3,9:1 | `lake-deep` |

Réserves de lecture. `ember` à 4,2:1 est sous 4,5:1 : il ne sert jamais au texte ; le texte de braise passe par `ember-ink`. L'anneau de focus sur le lac est un élément non textuel (seuil 3:1) ; le 3,9:1 est calculé contre `lake-deep` (`#5b9ca3`), pas contre `lake`. Sur un bouton sauge, l'anneau (1,7:1 contre `sage-deep`) tombe sur le papier grâce à son décalage de 3 px, pas sur la sauge. Les 5,3:1 de `ash-ink` et de `frost-ink` sur lavis sont calculés ; leurs chiffres sur papier (6,3:1 et 6,0:1) viennent des commentaires de `tokens.css`, non recalculés ici.

Mesure sur la page (Chromium, 390×844, 834×1112, 1280×900 et 844×390, mouvement normal et réduit) : 0 texte sous 4,5:1 sur 536 à 605 éléments texte, fond composé à partir des ancêtres, dégradés pris au pire cas.

### Named Rules

**The Ember Is Not Ink Rule.** `ember` (4,2:1) ne porte jamais de texte. Pictos, filets et fonds seulement.

**The Ink-Not-Hue Rule.** Un texte coloré utilise la variante `-ink` ou `-deep` de sa famille, jamais la couleur de décor (`sage`, `glass`, `soil`, `lantern`, `ash`, `frost`).

## Typography

**Display Font:** pile arrondie du système, graisse 800 (`--font-display`, qui reprend `--font-num` : `ui-rounded`, `"SF Pro Rounded"`, puis `system-ui`…). Titres, Cote, chiffres du HUD.
**Body Font:** pile système (`--font-ui` : `system-ui`, `-apple-system`, `"Segoe UI"`, `Roboto`, `"Noto Sans"`…). Aucune police distante, aucun fichier de police.
**Label/Mono Font:** pas de police d'étiquette distincte ; `code` et `kbd` en monospace système.

**Character:** deux rôles, une seule famille de départ. Les chiffres et titres sont plus ronds et plus lourds (800) que le texte courant. Les chiffres sont tabulaires (`.num`, `tabular-nums`) pour que le HUD ne tremble pas.

Provisoire. La pile système est le choix de la semaine 1 (pas de fichier de police libre disponible ni d'outil de sous-ensemble sur le poste, dépôt public). C'est un compromis que la construction porte, pas une identité : ne pas en faire la voix de la marque pour les prochaines surfaces. Voir « Ce qui reste ouvert ».

### Hierarchy
- **Display** (800, 1.5rem / 24 px, 1.25) : titre de la quête n° 1 à partir de 700 px en portrait ; total du « Pourquoi? ».
- **Headline** (800, 1.25rem / 20 px, 1.25) : titre de la quête n° 1 (compact et colonne large), titre de feuille, valeur de Cote.
- **Title** (800, 1.125rem / 18 px, 1.25) : titre de carte, de section, chiffres du HUD (`.res-value`), valeur du pas à pas, ligne du « Pourquoi? ».
- **Body** (400, 1rem / 16 px, 1.45) : corps, champs, titre de ligne de quête (600).
- **Meta** (400, 0.875rem / 14 px, 1.4) : métadonnées, aide de champ, raison d'un bouton désactivé.
- **Label** (700, 0.75rem / 12 px, 1.2) : étiquettes, libellés du HUD (600), libellé de Cote (600), plafonds. Pas de capitales, pas d'espacement ajouté.

Autres tailles en usage : 15 px (boutons compacts, puces, annonce), 0.9em en monospace. Titre de page de la référence : 28 px.

Graisses : 400 courant, 500 sous-titres de panneau, 600 titres de ligne et puces, 700 boutons et étiquettes, 800 rôle d'affichage. Les titres `h1`–`h4` ont `letter-spacing: -0.012em` et `text-wrap: balance`; les paragraphes ont `text-wrap: pretty`. Les titres de quête sont limités à 2 lignes (`line-clamp: 2`, `overflow-wrap: anywhere`).

### Named Rules

**The Number Is Round Rule.** Les chiffres qui bougent (HUD, Cote, pas à pas, annonce) sont toujours tabulaires et dans la pile arrondie.

**The Two Lines Rule.** Un titre de quête ne dépasse pas 2 lignes ; au-delà, il est coupé, et le titre complet vit dans la fiche.

## Layout

Un seul modèle spatial : le monde occupe tout l'écran, le panneau le recouvre. En compact, le panneau est une feuille du bas ; en large, une colonne à droite. Le HUD et la voie d'annonce sont posés sur le monde.

### Échelle d'espacement

Base 4 : `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 20, `--sp-6` 24, `--sp-8` 32, `--sp-10` 40, `--sp-12` 48. Les valeurs de 6 px (écarts de HUD, de métadonnées) et 10 px (rangées de formulaire) existent aussi dans le CSS, hors échelle. Cibles : `--target` 44 px (minimum tactile), `--target-lg` 48 px (boutons d'action, champs).

Gouttières (`--gutter`) : 16 px par défaut ; 20 px à partir de 700 px ; 24 px en large. Le panneau garde `--sp-8` plus la zone sûre en bas pour le défilement.

### Mise en page aux trois largeurs

Points de rupture réels (recopiés dans chaque `@media`, les variables CSS n'y fonctionnent pas) :
- **Moyen** : `(min-width: 700px)`.
- **Large** : `(min-width: 1000px), (min-width: 700px) and (orientation: landscape)`.
- **Très étroit** : `(max-width: 339px)` cache visuellement les libellés du HUD (ils restent lus par les lecteurs d'écran).
- **HUD étroit** : la barre compte cinq puces (Énergie, Matériaux, Nourriture, Habitants, Permis). Sous `(max-width: 479px)`, l'écart passe à 4 px ; dans le conteneur `hud`, sous 480 px de large, les puces se serrent (chiffre à 16 px, icône de 17 px) et le chiffre de gain (`.res-delta`) quitte le haut de la puce pour se poser sur la ligne du libellé, avec le fond de la barre, au lieu de recouvrir la valeur ; sous 350 px, le chiffre passe à 15 px et le texte se serre encore. La puce du Permis garde 44 px au moins, même sans libellé (sous 340 px).
- **Annonce serrée** : `(max-width: 379px)`. Une annonce de 4 gains ou plus (classe `.is-dense`) perd ses points médians, passe à 14 px et se resserre, pour tenir à 320 px sans rien rogner ; le picto se colle à son nombre et l'écart entre deux gains reste plus grand que celui d'un gain, pour que le regroupement se lise sans les points. Au-delà de 379 px, la place suffit : points médians comme d'habitude.
- **Fiche de quartier** : `(min-width: 700px)`. La feuille est centrée, donc une feuille qui grandit après un achat faisait descendre son bouton ; elle a une hauteur fixe (`min(620px, 100dvh − 48px)`), le corps défile et le pied ne bouge plus. Sur téléphone, la feuille est posée en bas : elle monte en grandissant et le pied reste en place.
- **Requêtes de conteneur** : HUD à 560 px (tuile teintée de 34 px et plafond visibles ; sous 560 px, « Plein » remplace « Matériaux · plein ») ; liste de quêtes à 420 px (le bouton secondaire passe sous le titre) ; trois cartes à 620 px (grille `1.25fr 1fr 1fr`).

| Taille | Disposition | Mesure Playwright |
|---|---|---|
| 390×844 | feuille du bas repliée (`--panel-peek: clamp(248px, 30dvh, 300px)`) ; ressources en haut sur le ciel | haut du panneau replié à 591 px ; monde = 70 % de la hauteur |
| 834×1112 | HUD, voie d'annonce et panneau alignés sur une colonne centrée de 720 px au plus ; `--panel-peek: clamp(272px, 26dvh, 340px)` ; titre de la quête n° 1 à 24 px | haut du panneau replié à 823 px ; monde = 74 % |
| 1280×900 | colonne à droite de `--column-w: clamp(340px, 34vw, 420px)` ; HUD à gauche, au plus 680 px ; bouton « Tout voir » et poignée masqués | colonne de 420 px ; monde = 67 % de la largeur |
| 844×390 (paysage téléphone) | même disposition que 1280×900 | colonne de 340 px |

Sur toutes les tailles et dans les deux modes de mouvement : défilement horizontal nul (`scrollWidth` = `clientWidth`) ; 0 élément interactif sous 44×44 px (143 à 175 mesurés selon la taille et l'état du panneau) ; l'annonce de gain ne recoupe aucun élément interactif.

La coquille a `min-height: 460px` et `height: 100dvh`. Le panneau ouvert s'arrête sous la voie d'annonce (`--panel-open-top`), pour que ressources et annonce restent visibles. Le monde garde un haut réservé, `--world-safe-top` (HUD plus voie), et un bas ou un côté réservé, `--world-cover-bottom` ou `--world-cover-right`.

Couches : monde 0, HUD 20, voie d'annonce 25, panneau 30 (`--z-sticky: 5` prévu dans le panneau, pas encore utilisé).

### Named Rules

**The Reserved Lane Rule.** L'annonce de gain vit dans une voie réservée de 40 px sous le HUD, où rien d'autre n'est posé : elle ne peut recouvrir aucun bouton.

**The Narrow Column Rule.** En large, tout le contenu du panneau reste lisible dans 340 px.

## Elevation & Depth

Hybride à deux matières : socle plein pour ce qui s'enfonce, ombre douce et chaude pour ce qui flotte. Aucune ombre dure décalée sur les côtés, aucun flou froid.

### Shadow Vocabulary
- **Socle** (`box-shadow: 0 3px 0 var(--btn-face)`, `--face-h: 3px`) : boutons. À l'appui, le bouton descend de 3 px et le socle disparaît. La plaque de Cote a son propre socle de 2 px (`0 2px 0 var(--c-line-strong)`).
- **HUD** (`--shadow-hud` : `0 1px 1px rgb(66 43 25 / .08), 0 6px 16px rgb(66 43 25 / .16)`) : tuiles de ressources, annonce.
- **Flottant** (`--shadow-float` : `0 1px 2px rgb(66 43 25 / .10), 0 12px 28px rgb(66 43 25 / .20)`) : feuilles centrées (≥ 700 px) et feuilles posées dans la page.
- **Feuille** (`--shadow-sheet` : `0 -2px 6px rgb(40 30 15 / .08), 0 -12px 32px rgb(40 30 15 / .20)`) : panneau et feuille du bas.
- **Colonne** (`--shadow-column` : `-1px 0 0 rgb(58 65 48 / .12), -14px 0 32px rgb(40 30 15 / .14)`) : panneau en colonne latérale.
- **Carte** (`--shadow-card` : `0 1px 2px rgb(66 43 25 / .08)`) : cartes.
- **Fond de feuille** (`--backdrop` : `rgb(39 48 38 / .40)`).

Le panneau est opaque sous le texte : le monde ne transparaît pas. Les ombres sont teintées brun chaud, jamais noires.

### Mouvement

Jetons : `--t-press` 90 ms (appui), `--t-micro` 150 ms, `--t-short` 220 ms, `--t-medium` 320 ms (panneau, feuille), `--t-long` 480 ms, `--t-camera` 600 ms, `--t-celebrate` 1200 ms, `--t-day` 1600 ms, `--t-announce-hold` 3600 ms. Courbes : `--ease-out` (par défaut), `--ease-in`, `--ease-inout`, `--ease-back` (rebond du chiffre de ressource), `--ease-bounce`. Distances : `--lift-1` 2 px, `--lift-2` 6 px, `--drop` 28 px, `--stagger` 40 ms. En usage actuel dans `components.css` : `--t-press`, `--t-micro`, `--t-short`, `--t-medium`, `--t-announce-hold`, `--ease-out`, `--ease-in`, `--ease-back`. `app.css` et `world.css` lisent aussi `--t-celebrate` (reflet du bandeau d'objectifs), `--t-long` et `--t-day`. Aucune feuille de `app/css/` n'emploie encore `--t-camera`, `--ease-inout`, `--ease-bounce`, `--lift-1`, `--lift-2`, `--drop` ni `--stagger` (recherche de `var(--…)`).

Ce qui bouge : le panneau monte et descend (`translateY`, 320 ms) ; la quête se déplie (grille `0fr` vers `1fr`, 220 ms) ; le bouton s'enfonce de 3 px ; la valeur de ressource gonfle de 12 % et la variation (+3) monte en 1100 ms ; l'annonce reste 4 s (3600 ms plus 400 ms de fondu) ; la feuille entre de 48 px.

**Mouvement réduit.** `--motion` vaut 1 (complet) ou 0 (réduit). Les distances sont multipliées par `--motion` (appui, annonce, entrée de feuille, variation, rebond) : à 0 elles tombent à zéro et il reste des fondus. En réduit : `--ambient: paused` (squelettes et rotation figés), `--t-short/medium/long/celebrate` à 150 ms, `--t-day` à 300 ms, `--t-camera` à 0 ms ; le panneau et le dépliage de quête ne transitionnent plus que `opacity` et `visibility`.
- Automatique : `@media (prefers-reduced-motion: reduce)` sur `:root:not([data-motion="full"])`.
- Réglage de l'app : `<html data-motion="reduce">` force le réduit ; `<html data-motion="full">` force le complet malgré la préférence du système.
- Mesuré : en réduit, `--motion` vaut 0 et le panneau ne fait que des fondus.

### Named Rules

**The One Matter Rule.** Un élément a un socle ou une ombre douce, jamais les deux, jamais une ombre dure décalée sur le côté.

**The Motion Is Distance Rule.** Toute translation ou mise à l'échelle se multiplie par `var(--motion)`. Un nouvel effet qui ne le fait pas casse le mouvement réduit.

## Shapes

Formes douces, blocs arrondis, lisibles au pouce. Rayons : `--r-xs` 6 px (squelettes), `--r-sm` 10 px (plaque de Cote, tuile de ressource teintée), `--r-md` 12 px (boutons, champs, lignes), `--r-lg` 16 px (cartes, tuiles de ressource, confirmation), `--r-xl` 24 px (panneau, feuilles), `--r-pill` 999 px (puces, étiquettes, annonce, poignée). Les cases de quête, pastilles de coche et pastilles de sélection sont des disques.

Bords : filets de 1 px (`line` entre lignes, `line-strong` autour des champs et plaques). La carte n° 1 a un filet sauge de 1,5 px (`rgb(63 96 71 / .45)`). Le désactivé a un bord en tirets de 1,5 px. Les listes sont séparées par des filets, jamais par des cartes imbriquées. Pictos : sprite maison, grille de 24, trait de 1,9 arrondi, `currentColor` ; 16, 20 ou 24 px selon le contexte.

## Components

Tout vit dans `app/css/components.css`, 16 sections numérotées. Chaque composant est en français, avec classes en anglais court ou en français selon le code existant.

### Coquille (1) et monde (2)
`.app[data-panel="peek|open|cache"]` contient `.world-slot` (monde plein écran), `.hud`, `.announce-lane`, `#live` et `.panel`. Le monde se compose d'un fond (`.world-backdrop` : dégradé ciel, horizon, lac) et de `.world-stage` ; l'île isométrique vient de `world/` (voir `app/ARCHITECTURE.md`). La légende `.world-caption` n'est posée par aucune page : sa règle reste dans `components.css`. Le panneau a une poignée (`.panel-grip`), une tête (`.panel-head` : titre, ajout, bascule ; en compact, elle se touche et se glisse), un défilement (`.panel-scroll`) et un corps caché quand replié (`.panel-rest`). `cache` : le panneau sort du champ (vers le bas en compact, vers la droite en large), devient `inert`, et la carte prend tout l'écran.

Commandes de la carte (`.ow-zoom`, dans `world.css`) : une colonne de boutons `.ow-zbtn` de 44 px, « Construire », « Quêtes », « Vue », posée 12 px au-dessus du haut réel du panneau (`--world-ctl-bottom`). « Vue » (`aria-expanded`, enfoncé et lavé de sauge quand ouvert) déplie vers la gauche la rangée `.ow-zrow` : Rapprocher, Éloigner, Toute l'île, Carte en liste. « Quêtes » prend le même aspect enfoncé quand le panneau est caché (la carte seule est alors le mode en cours). Aux limites du zoom, `aria-disabled` (tirets, comme le désactivé lisible). Le catalogue « Construire » (`#dlg-construire`, `.cat-*` dans `app.css`) reprend les lignes de la carte en liste (`.ow-plan-bat`) avec le dessin du bâtiment, son coût, « Disponible » (coche, sauge) ou la raison du cœur (cadenas), et un bouton secondaire.

Permis et quartiers. Les permis en main s'affichent dans la barre des ressources, en cinquième puce (voir « Ressources, HUD ») ; « Construire » n'a plus de pastille ni de chiffre dans son nom (la pastille faisait croire à un nombre de constructions possibles). Les plaques de quartier (`.ow-plaque`) lisent « Champs · niv. 2 » : picto, nom, point médian gris, niveau acheté en chiffres tabulaires, sans barre de progression ; le lecteur d'écran lit « Champs : niveau 2. ». Toucher une plaque ouvre la fiche du quartier (`#dlg-quartier`, `.qrt-*` dans `app.css`), même gabarit que la fiche d'un bâtiment : picto du quartier sur lavis sauge, nom, ligne « Quartier · quêtes Terrain · niveau n », puis les lignes « Ce qu'il fait », « Niveau n+1 », « Prix » (avec les permis en texte doux), un bouton principal « Monter au niveau n+1 » ou, s'il manque quelque chose, le même bouton à plat avec cadenas et la raison du cœur ; au niveau le plus haut, une phrase à la place du bouton. Dès 700 px, la feuille a une hauteur fixe (voir « Mise en page aux trois largeurs »). Le catalogue « Construire » ouvre sur la ligne des permis et finit par une section « Quartiers » : une ligne-bouton par quartier (picto, niveau, effet suivant, prix, chevron), qui pose la fiche par-dessus le catalogue.

Marchand du quai (lot V). Quand il est là, un chaland solaire est amarré au quai (`chaland()` dans `world/models.js`, groupe `.ow-barge`) : coque de bois foncé, cabine sous un toit de panneaux (verre solaire), caisses, paniers de foin et courges, mât et fanion or ; le quai prend la variante `marchand` et une hauteur de touche plus grande (`QUAI_MARCHAND_H`), et l'étiquette du quai dit qu'il est là. Le chaland tangue d'un pixel et demi, seulement avec le mouvement d'ambiance (il reste immobile en mouvement réduit). Sa fiche est celle du quai, avec en plus le comptoir (`.comptoir`, `.offre-*` dans `app.css`) : titre avec la barque (`i-barque`), une phrase d'intro, puis une ligne par offre séparée par des filets, comme la carte en liste : le troc à gauche (picto teinté de la ressource, nombre en chiffres tabulaires, mot ; `i-fleche` gris entre les deux ; « contre » lu au lecteur d'écran), l'action à droite en bouton secondaire petit (« Échanger » et le picto `i-echange` ; aucune action principale ici), ou « ✓ Fait » en sauge foncée avec « cette semaine » en petit dessous. Une offre impossible garde son bouton, verrouillé (`aria-disabled`, tirets) et sa raison en toutes lettres sous la ligne. À 390 px, le troc passe sur deux lignes et l'action reste à droite. Dans le bandeau, la case « Cette semaine » montre la commande du visiteur (lot C, plus bas) avec la barque (`.bandeau-visiteur`) ; toute la case se touche (zone étendue par `::after`, contour de focus sur cette zone) et le texte tient sur deux lignes au plus. Le compte des quêtes de la semaine reste dessous, en petit et en gris doux (deux lignes au plus, jamais coupé) : dans la carte dépliée en compact, sur la rangée à partir de 700 px, où le bandeau gagne alors une ligne (77 px au lieu de 60 à 834 px).

Visiteurs à commande (lot C). Chaque semaine, un bateau s'amarre au bout du quai, côté lac, dans le prolongement du chaland (`convoi()`, `famille()`, `scientifique()` dans `world/models.js`, groupe `.ow-bateau`) ; le quai prend la variante `marchand+<visiteur>` (`+livree` une fois la commande livrée) et une zone de touche plus large (`QUAI_BATEAU_W`). Le convoi est un remorqueur vert, timonerie crème à la poupe, deux piles de bois d'œuvre sanglées sur le pont ; la famille du Sud, un voilier crème, voile ferlée sur la bôme, des malles, une valise et une plante en pot ; la scientifique, une vedette blanche, cabine vitrée coiffée d'un panneau solaire, mât d'instruments (anémomètre, girouette) et, à la poupe, un portique d'où pend une sonde jaune. Une fois la commande livrée, le convoi et la scientifique emportent des paniers de Nourriture, et le pont de la famille est vide. Le bateau tangue comme le chaland, décalé, seulement avec le mouvement d'ambiance (immobile en mouvement réduit). Dans la fiche du quai, la commande passe au-dessus du comptoir, sous le même filet (`.commande*` dans `app.css`) : titre en police d'affichage 18 px, gras, picto `i-note` en sauge foncée, les jours restants à droite en petit ; qui est le visiteur, en texte doux ; deux lignes « Demande » et « Laisse » en grille (le terme à gauche sur 5,25 rem, les puces du comptoir à droite, 44 px de haut au moins, filets entre les lignes) ; un second élément de la demande passe à la ligne avec son « + » gris (« et » au lecteur d'écran) ; pour la famille, « 1 habitant de plus » et, dessous en texte doux, « Sans payer la Nourriture d'accueil. ». Les pictos Habitants et Permis prennent les teintes de leur puce (lanterne ; airelle, réservée au Permis). Quand la taille n'est pas « régulier », une phrase en texte doux le dit, sans reproche. Puis « Livrer » en bouton principal pleine largeur (picto `i-fleche`), seule action principale de la fiche ; impossible, le même bouton à plat avec cadenas et la raison du cœur dessous ; livrée, « ✓ Commande livrée » en sauge foncée, une ligne propre au visiteur dessous, et la demande passe en texte doux. La règle (« Une commande par semaine, jamais obligatoire… ») ferme le bloc en 12 px. Dans le bandeau : « Commande au quai, encore N jours » avec la barque ; livrée, « Commande livrée au convoi » (à la famille du Sud, à la scientifique) avec une coche. Le nom du visiteur n'y figure pas : mesurées dans la case, les phrases qui le portaient dépassaient deux lignes à 834 et 1280 px.

Imprévus (lot I). Les bons se voient sur l'île le jour où ils arrivent, en décor sans toucher (`IMPREVU_SPOTS` dans `world/layout.js`, sur des cases que le décor laisse libres et qu'aucune plaque ne couvre) : l'**aurore** passe au-dessus du fond de l'île, trois rideaux effilés (chaque bord du bas, le plus clair, rejoint son bord du haut aux deux bouts, sans flanc vertical), dégradé de pousse vers verre solaire, un ourlet clair et des rais découpés à la forme du grand rideau ; elle est sous les objets (`z-index: 2`) et ondule de 8 px seulement avec le mouvement d'ambiance (immobile en mouvement réduit). L'**orignal** traverse la route des Champs devant le chalet du fond (corps brun, panache clair en larges palettes) ; la **caisse de poissons** attend au bout de la route du quai ; la **pile de bois** (six bûches et une hache) est rangée près du grenier. Un mauvais imprévu change le dessin de sa cible et y pose une **marque braise** : disque braise sur une pointe, filet papier, picto papier dessus (clé pour la panne, patte pour l'ours, flocon à six branches pour le gel ; `marque()` dans `world/models.js`, `.ow-mark-*` dans `world.css`) ; le nom de l'objet sur la carte dit le dégât en toutes lettres, la couleur n'est jamais seule. Éolienne en panne : rotor arrêté (plus de rotation, même éveillée), une pale cassée net et son bout tombé au pied, trappe ouverte. Parcelle : traces de pattes dans la terre, et une partie des plants revenus en pousses quand l'ours est passé sur une culture mûre ; voile de givre et points de glace sur les plants quand elle a gelé. Dans la fiche, le dégât s'ajoute à « Maintenant » (`.degat` dans `app.css`) : lavis braise et filet de braise (comme la confirmation d'une action risquée), titre en gras avec le picto du dégât en braise foncée (`i-cle`, `i-patte`, `i-flocon`, 22 px), ce que ça change en texte doux, puis le geste en bouton secondaire petit (« Réparer », « Chasser l'ours », « Couvrir la culture », le prix après un point médian, chiffres tabulaires) ; verrouillé, cadenas et raison du cœur dessous. Les deux autres voies suivent en petit, chacune avec son picto : le quartier de la quête qui règle ça, l'horloge pour « ça se règle tout seul ». Réglé aujourd'hui, le bloc devient une seule ligne cochée en sauge foncée sur lavis sauge, sans braise, à la même place.

Hiver (lot H). Du 15 novembre au 30 avril, l'île est sous la neige, et rien ne bouge : c'est un jeu de couleurs (`data-neige` sur la racine du monde ; `NEIGE_SOL`, `NEIGE_DESSUS` et `NEIGE_NU` dans `world/palette.js`, les bords du lac dans `world.css`). Le sol passe au blanc à peine bleuté sur ses trois tons ; le dessus des toits, des feuillages et de la toile des serres prend la neige (`snow`, `#f2f4ee`) et leurs faces gardent leur couleur, comme une neige posée ; les érables nus passent au gris bleuté du givre (bruns, ils se lisaient comme des rochers) ; le bord du lac est pris par la glace, et les fleurs du terrain sont enfouies. Les chemins restent dégagés (Fanal déneige). Pendant l'annonce d'une tempête, le front de givre approche du bord de l'Atelier, au pied des serres, un peu plus chaque jour. Un bâtiment enseveli porte une congère (pentes continues, un seul polygone par face : en éclats, elle se lisait comme du papier plié) et la marque braise avec une pelle penchée (même disque que les dégâts du lot I ; `i-pelle` dans les pictos) ; l'éolienne a un chapeau de neige sur la nacelle et son rotor arrêté, la serre une épaisse couche sur ses panneaux et ses pots cachés.

Dans le bandeau, une tempête annoncée ajoute une rangée pleine largeur sous les objectifs, à toutes les largeurs (`.bandeau-alerte`, 54 px au moins, `--bandeau-alerte-h`) : lavis de givre et filet de givre en haut ; le flocon dans un disque papier cerclé de givre ; le titre en encre (« Tempête dans 3 jours ») ; la barre de trois crans (14 × 8 px ; vide, un filet de givre ; plein, encre de givre), doublée du texte « 1 sur 3 » en encre de givre ; à droite, « Rentrer du bois » en bouton secondaire petit, le prix dessous en petit (chiffres tabulaires). Barre pleine : « Le village est prêt », sans bouton. Le jour même, les crans s'effacent : coche sur disque sauge pour une tempête tenue, ou pour un bâtiment déneigé (« Bâtiment déneigé ») ; pelle sur disque braise et texte en braise foncée pour un bâtiment sous la neige, avec « Déneiger », qui ouvre sa fiche. Déplié en compact, la rangée ajoute une phrase d'aide en gris doux. Le haut de l'île et celui du panneau ouvert descendent de la hauteur de la rangée. Mesuré le 7 octobre pendant une alerte : bandeau de 102 px à 390 px de large, de 114 px à partir de 700 px. Contrastes sur le lavis de givre : encre de givre 5,3:1, braise foncée 5,1:1. La fiche d'un bâtiment enseveli reprend le bloc `.degat` du lot I (« Sous la neige », pelle, « Déneiger · 2 Énergie », une quête Terrain, la fonte). Dans « Cette saison », l'objectif d'hiver s'écrit « Serre : 3 récoltes sur 10 », ou « Bâtir une petite serre » quand le village n'en a pas.

### Boutons (3)
Forme : 12 px, hauteur 48 px (`.btn--small` 44 px, `.btn--icon` 44 px carré), picto de 20 px, socle de 3 px.
- **Principal** `.btn--primary` : sauge profonde, papier dessus. Un seul par vue.
- **Secondaire** `.btn--secondary` : crème, encre. Valeur par défaut de `.btn`.
- **Discret** `.btn--quiet` : sans socle, texte sauge ; actions fréquentes de second rang.
- **Danger** `.btn--danger` (et `.btn--quiet.btn--danger`) : braise.
- Survol (si `hover: hover`), appui (`:active` ou `.is-pressed`), focus (anneau 3 px, décalage 3 px).
- **Désactivé lisible** : `:disabled` ou `[aria-disabled="true"]` à plat, sans socle, bord en tirets, texte `ink-muted` (5,8:1), cadenas, raison sous le bouton dans `.btn-reason` liée par `aria-describedby`. Préférer `aria-disabled` pour garder le focus.
- **Occupé** : `[aria-busy="true"]`, picto `.spin` qui tourne, libellé qui dit ce qui se passe.
- **Bouton texte** `.link-btn` (« Pourquoi? ») : allure de lien, cible de 44 px.

### Ressources, HUD (4)
`.res[data-res="energie|materiaux|nourriture|habitants|permis"]` : tuile de 52 px, picto, valeur (`.res-value`, sans plafond), libellé. Cinq puces : les quatre ressources de même largeur, puis le Permis, qui prend la place de son contenu (44 px au moins, `grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(44px, auto)`). Chaque puce est un bouton qui ouvre sa feuille d'aide. Variation `.res-delta` (+ `.res-delta--spend` pour une dépense), coup `.res.is-hit`. Énergie, Matériaux et Nourriture s'affichent en nombres entiers (décision d'Alex du 6 octobre 2026 ; le calcul garde ses dixièmes, `js/ui/format.js`) : ce que le joueur possède est arrondi vers le bas (59,6 s'affiche 59 : la barre ne promet pas un prix de 60), ce qui manque vers le haut, un gain au plus proche. À partir de 1 000, la valeur passe en forme courte (« 1,2 k ») ; la valeur entière reste dans le nom lu. Matières : Énergie en verre, Matériaux en terre, Nourriture en sauge, Habitants en lanterne, Permis en **airelle** (`--res-permis` : `#6f3f62` sur `#f5e6ee`), une famille réservée au Permis. Le pictogramme du Permis (`i-permis`) est une feuille au coin plié avec une coche ; le chiffre et le mot « Permis » le doublent. Largeurs étroites : voir « Mise en page aux trois largeurs ».

### Annonce de gain (5)
`.announce` dans `.announce-lane` : pastille de coche, gains avec picto, en nombres entiers arrondis au plus proche (un gain qui s'arrondit à 0 n'affiche pas de chiffre, l'annonce reste) (le Permis : « +1 » et son pictogramme en airelle ; le mot n'est lu qu'aux lecteurs d'écran), puis « → Champs » ou, le jour où la semaine est tenue, « Semaine tenue » (en terre, comme les Matériaux ; le mot remplace le quartier et ne se coupe jamais). Serrée sous 380 px de large quand elle porte 4 gains ou plus (voir « Mise en page »). Visible avec `.is-shown` pendant 4 s ; `.announce--static` pour la référence. Décorative : le texte complet part dans `#live`.

### Cote, étiquettes, métadonnées (6)
`.cote` : plaque de 48 px avec valeur et mot « Cote » ; `.cote--sm` (42×40) à l'intérieur d'une ligne cliquable (la cible de 44 px est celle de la ligne). `button.cote` ouvre le « Pourquoi? ». `.tag` (`--done`, `--prio`, `--late`, `--archived`, `--guess`) : pastille de 24 px avec picto. `.meta` : ligne de métadonnées avec pictos ; `.meta-item--late` (terre).

### Fil du jour et alternatives (7)
`.fil-quest[data-state]` : titre sur 2 lignes et Cote, méta, raison, un bouton (« Fait »). `.alts` / `.alt` / `.alt-row[aria-expanded]` : alternatives repliées, dépliage sans saut dans `.alt-panel`.

### Trois cartes (8) : retirées
`.reco-wrap` > `.reco-list` > `.reco` (À faire d'abord, Victoire rapide, Grand chantier) était la version dépliée du Fil. Rien ne les emploie plus (ni `app/index.html`, ni `app/js/`, ni `app/world/`, ni la page de référence) : les alternatives repliées (`.alts`, section 7) les remplacent. Leurs règles restent dans `components.css` (code mort, à retirer sur ordre).

### Barre d'outils (9)
`.search` (champ de 48 px, picto, bouton d'effacement de 44 px), `.seg` (statut, boutons radio), `.sort` + `.select` (liste native), `.chips` / `.chip[aria-pressed]` (la puce active se remplit de sauge et ajoute une coche dessinée `.chip-check`), `.chips--scroll` (défilement horizontal interne avec fondu aux bords).

### Liste de quêtes (10)
`.quest[data-state="todo|done|archived"]` : case de 44 px (`.quest-check`, anneau de 26 px), zone principale de 64 px (`.quest-main`), action à droite (`.quest-aside`). Faite : case pleine avec coche, titre en encre mousse. Archivée : picto de boîte d'archives, encre de cendre.

### Feuilles et champs (11)
`dialog.sheet` : feuille du bas en compact, fenêtre centrée de 560 px à partir de 700 px (`.sheet--small` 440 px). `.sheet--inline` la pose dans la page. Parties : `.sheet-head`, `.sheet-body`, `.sheet-foot`. Champs : `.field`, `.input` (48 px), `.input--lg` (56 px), `.textarea`, `.field-hint`, `.field-error`. Autres : `.sector-picker` (radios), `.stepper` (pas à pas de 1 à 10, boutons de 44 px), `.check-row`, `.disclosure`, `.fiche-summary`.
- **Réglages** (`#dlg-settings`) : le prénom, puis la section « Quête par défaut » (`.set-quete`), un `fieldset` détaché du prénom par un filet (`--c-line`) et un espace de 16 px. Sa `legend` est un titre de section à 18 px, un cran au-dessus de ses trois rangées (priorité, durée, effort : les `.stepper-row` du formulaire d'ajout, à 16 px, boutons de 44 px). Les trois rangées sont fermées tant que la partie n'est pas lue, avec une phrase qui le dit ; un refus d'enregistrer s'écrit dans la feuille (`.field-error`, `role="alert"`), car la page derrière est inerte. À l'ouverture, le focus va sur « Fermer » plutôt que sur le prénom, pour que le clavier virtuel ne cache pas les trois rangées (il va sur le prénom quand on vient l'écrire depuis la lettre).
- **Ligne de la semaine tenue** (`.review-tenue`) : au bilan, picto des Matériaux et texte « Semaine tenue : +12 Matériaux » en terre profonde, graisse 600 ; rien pour une semaine non tenue.
- **Ligne d'allure** (`.review-allure`, lot A) : au bilan courant, une marque de trois barres qui montent (`.allure-crans` : 5 px de large, 7, 11 et 15 px de haut, 2 px d'écart), pleines jusqu'à l'allure (une au ralenti, deux régulier, trois plein régime) et creuses au-delà, comme les pastilles des jours (vide, un filet de cendre de 1,5 px ; pleine, sauge profonde). Elle est cachée au lecteur d'écran : le texte la double. À côté, « Allure : au ralenti » en graisse 600 et sa raison « (3 quêtes en 14 jours) » en encre mousse ; dessous, ce que l'allure change, à 14 px en encre mousse. Aux semaines passées, la marque et « Allure : régulier » en court, après les jours travaillés ; rien pour un bilan figé avant le lot. Le rayon de 2 px des barres, hors de l'échelle, est celui des marques de quelques pixels (crans de tempête, lot H), et d'elles seules.
- Focus d'un champ : bord sauge profonde en plus de l'anneau.
- Erreur : `[aria-invalid="true"]`, bord et filet intérieur terre, `.field-error` avec picto.

### Étapes (12)
`.steps` / `.step` : case de 22 px dans une ligne de 48 px, texte barré en encre mousse quand coché, bouton de retrait de 44 px, `.step-add`.

### Pourquoi (13)
`.why` : relevé en `dl`, lignes pointillées (`.why-line`, `--zero` en lichen), total `.why-total` sous un filet de 2 px, valeurs en sauge.

### Confirmation (14)
`.confirm` : fond `ember-wash`, filet braise, picto, deux actions.

### États (15)

- **Vide** `.empty` : pastille de lanterne, titre, texte (36 ch), bouton. `.empty--inline` pour un filtre sans résultat, sans illustration.
- **Chargement** `.skeleton` / `.skel` : reflets de cendre qui glissent ; figés en mouvement réduit. Avec `aria-busy="true"` et `aria-label`.
- **Hors ligne** `.sync[data-sync="offline"]` : givre.
- **Erreur de synchronisation** `.sync[data-sync="error"]` : fond braise clair, filet braise, picto braise, texte `ink-soft` ; `role="alert"`.
- **Enregistrement** `[data-sync="saving"]` et **enregistré** `[data-sync="saved"]` : fond creusé, `role="status"`.
- **Désactivé lisible** : voir Boutons. Pas à pas : le bouton en butée prend `:disabled` avec la couleur du filet.
- **Erreur de champ en terre** : voir Feuilles et champs.
- **En retard** : caisse de terre, `.meta-item--late` ou `.tag--late`, jamais de rouge.

### Mouvement réduit (16)
`.panel` et `.alt-panel` ne transitionnent que `opacity` et `visibility`.

## Do's and Don'ts

### Do:
- **Do** doubler chaque couleur d'un mot, d'un picto ou d'un motif.
- **Do** garder une cible de 44×44 px au minimum sur tout élément interactif, 48 px pour les actions.
- **Do** utiliser `ink`, `ink-soft`, `ink-muted` pour le texte sur papier ; `-ink` ou `-deep` pour le texte coloré.
- **Do** placer l'annonce de gain dans la voie réservée et la dire aussi dans `#live`.
- **Do** donner au bouton désactivé une raison écrite et un cadenas.
- **Do** multiplier toute distance animée par `var(--motion)`.
- **Do** utiliser `aria-pressed` pour une bascule et `aria-expanded` pour un dépliage.
- **Do** laisser le monde dominer : panneau replié à 30 % au plus en compact.

### Don't:
- **Don't** mettre de la braise sur une échéance dépassée ; c'est une caisse de terre.
- **Don't** utiliser `ember` (4,2:1) pour du texte.
- **Don't** couvrir un bouton avec une annonce ou une notification.
- **Don't** mettre l'airelle ailleurs que sur le Permis, ni le givre ailleurs que sur le hors ligne et la tempête annoncée.
- **Don't** utiliser un fond sombre, un cyan néon ou du noir pur pour une ombre.
- **Don't** ajouter une étiquette au-dessus d'un titre pour catégoriser ; la catégorie va dans la ligne de méta.
- **Don't** montrer l'état seulement par la couleur.
- **Don't** charger une police ou une bibliothèque depuis Internet.

Non canonisé : voir la note à la fin de la section « Ce qui reste ouvert ».

## Contrat d'intégration pour la logique

Pour l'équipe qui branche les données. Le comportement de référence est dans `app/design/reference.js` ; ne rien y copier qui touche au réseau.

### Structure de la coquille

```html
<div class="app" id="app" data-panel="peek">      <!-- peek | open -->
  <div class="world-slot">…</div>
  <header class="hud" aria-label="Ressources">…</header>
  <div class="announce-lane" aria-hidden="true"><p class="announce" id="announce">…</p></div>
  <p class="sr-only" role="status" aria-live="polite" id="live"></p>
  <section class="panel" id="panel" aria-labelledby="panel-title">
    <span class="panel-grip" aria-hidden="true"></span>
    <header class="panel-head">…</header>
    <div class="panel-scroll" id="panel-scroll">
      <article class="fil-quest" …>…</article>
      <div class="panel-rest" id="panel-rest">…</div>
    </div>
  </section>
</div>
```

La voie d'annonce est cachée aux lecteurs d'écran (`aria-hidden="true"`) ; la région `#live` est séparée et c'est elle qu'il faut remplir.

### Attributs et classes à basculer

| Quoi | Où | Valeurs |
|---|---|---|
| `data-panel` | `.app` | `peek`, `open` ou `cache` (avec `inert` sur `.panel`) |
| `aria-expanded` | `.panel-toggle` (et `.panel-toggle-label` : « Tout voir » ou « Replier ») | `true` ou `false` |
| `data-state` | `.fil-quest`, `li.quest` | `todo`, `done`, `archived` |
| `data-late="true"` | `li.quest` | crochet de données seulement ; la présentation passe par `.meta-item--late` ou `.tag--late` (aucune règle CSS ne lit `data-late`) |
| `data-res` | `.res` | `energie`, `materiaux`, `nourriture`, `habitants`, `permis` |
| `.is-shown` | `.res-delta`, `.announce` | relancer l'animation : retirer la classe, lire `offsetWidth`, la remettre |
| `.is-hit` | `.res` | même méthode |
| `aria-expanded` | `.alt-row` | avec `.is-open` sur `.alt` |
| `aria-pressed` | `.chip` | `true` ou `false` |
| `aria-disabled="true"` | `.btn` | avec `.btn-reason` et `aria-describedby` |
| `aria-busy="true"` | `.btn`, `.skeleton` | picto `.spin` dans le bouton |
| `aria-invalid="true"` | `.input`, `.textarea` | avec `.field-error` lié |
| `data-sync` | `.sync` | `offline`, `error`, `saving`, `saved` |
| `data-motion` | `<html>` | `reduce` ou `full` |

### Actions de la démo (`data-action`)

`complete`, `why`, `add`, `open`, `toggle-panel`, `split`, `search-clear`, `sort`, `replay-announce`. Dans la démo, `split` et `sort` ne font rien : à brancher. Le pas à pas utilise `data-step="-1|1"`.

### Feuilles

`data-open="<id>"` sur un bouton ouvre le `dialog.sheet` correspondant ; `data-close` à l'intérieur le ferme. La démo ferme avec une classe `.is-closing` (animation de sortie), attend `animationend` (repli à 400 ms), puis `close()`. `.sheet--inline` pose la feuille dans la page (catalogue) ; la retirer pour une vraie fenêtre modale.

### Pictos

```html
<svg class="icon" aria-hidden="true"><use href="icons.svg#i-check"/></svg>
```

Le chemin `icons.svg#…` est relatif à `app/design/` : à reloger si les pages ne sont plus dans ce dossier. Pictos disponibles : `i-energie`, `i-materiaux`, `i-nourriture`, `i-habitants`, `i-permis`, `i-check`, `i-plus`, `i-minus`, `i-x`, `i-edit`, `i-archive`, `i-unarchive`, `i-trash`, `i-undo`, `i-split`, `i-search`, `i-sort`, `i-chevron-down`, `i-chevron-up`, `i-why`, `i-lock`, `i-sliders`, `i-refresh`, `i-clock`, `i-calendar`, `i-crate`, `i-steps`, `i-repeat`, `i-note`, `i-pin`, `i-flag`, `i-target`, `i-quick`, `i-chantier`, `i-offline`, `i-cloud-alert`, `i-cloud-ok`, `i-spinner`, `i-champs`, `i-atelier`, `i-mairie`, `i-ecole`, `i-garage`, `i-place`, `i-barque`, `i-echange`, `i-fleche`. Le sprite garde aussi des restes de la v1, que l'app d'aujourd'hui n'emploie plus : `i-start`, `i-pause`, `i-pin`, `i-confiance`, `i-lueur`, `i-archives`, `i-maison-commune`, `i-relais`, `i-bastion` (aucun n'est appelé par `app/index.html`, `app/js/` ni `app/design/reference.html`).

### Ce que la logique doit faire elle-même

- Remettre `scrollTop` de `.panel-scroll` à 0 quand on replie le panneau.
- Garder les entités du monde sous `--world-safe-top` (HUD et voie d'annonce sont posés sur le monde).
- Remplir `#live` : vider, puis écrire le texte après une courte pause, pour que le lecteur d'écran le relise.
- Remonter la page en haut avant l'annonce (la démo le fait si `scrollY > 0`) et changer les chiffres à « l'impact », 320 ms après l'apparition de l'annonce (0 en mouvement réduit).
- Mettre à jour `aria-label` des `.res` (« Énergie : 30 », « Permis : 2 » : aucune ressource n'a de plafond).
- Fermer le panneau ouvert avec Échap et rendre le focus à la bascule, sauf si une feuille modale est ouverte.

## Ce qui reste ouvert

- **Police embarquée.** Choisir et embarquer un fichier de police libre pour le rôle d'affichage (il se glisse en tête de `--font-display`). Aujourd'hui : pile système.
- **Exclure `app/.impeccable/` du déploiement.** Le dossier contient le contrat de direction et ce sidecar ; il n'est pas du code applicatif.
- **Jetons posés mais non consommés** (caméra, célébration, jour, levée, chute, décalage, `--z-sticky`, `--lh-tight`, `--sp-10`, `--sp-12`, `--c-soil`, `--c-lantern`, `--c-ash`, `--c-frost`, `--c-glass`) : à utiliser avec le monde, ou à retirer.

Non canonisé, par choix : la pile de polices système comme rôle d'affichage (compromis de la semaine 1, voir Typographie) ; les valeurs en dur dans `components.css` hors jetons (`#f8ecce`, `#8f3c23`, `#fff`, `#f5f1e9`, les copies `rgb()` de `sage-deep` et `ember`, les remplissages du polygone d'horizon) ; l'abréviation « PE » de l'annonce de la démo, absente du glossaire du jeu.
