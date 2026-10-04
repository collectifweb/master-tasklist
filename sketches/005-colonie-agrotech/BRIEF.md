# Prototype 005 — Colonie Orée

## Direction contract

THESIS: une vraie tranche de jeu de gestion agro-tech, pas une todo list décorée. L’interface Vecteur sert les tâches réelles; la ferme transforme les gains en développement; le Bastion produit les menaces, les défenses et le mystère.

OWN-WORLD: charbon et basalte, texte ivoire, cyan structurel, jaune acide pour l’action, vert minéral pour la production, orange braise uniquement pour les menaces. Grille vectorielle fonctionnelle, vue de ferme 2D oblique, carte topographique du Bastion, contrôles web standards et icônes SVG cohérentes.

STORY: après des tempêtes de cendre, Alex devient l’intendant de la Colonie Orée. Les tâches réellement accomplies génèrent Énergie, Matériaux et Réputation. La ferme nourrit la colonie. Le Bastion protège les récoltes et cache une archive ancienne. Les choix peuvent coûter des récoltes ou endommager temporairement des installations, mais toute conséquence reste récupérable et aucune donnée réelle n’est touchée.

FIRST VIEWPORT: mobile 390 × 844. En-tête compact avec Colonie Orée, date et trois ressources. Un événement apparaît seulement lorsqu’une décision est nécessaire. La meilleure tâche réelle occupe la zone principale avec score explicable et action Commencer/Terminer. Les raccourcis 10 min et Énergie faible restent accessibles. L’amorce animée de la colonie est visible avant la navigation basse Aujourd’hui, Quêtes, Colonie, Bastion.

FORM: application mobile de gestion avec navigation standard, cartes de tâches compactes, panorama de colonie interactif et carte topographique. Visites de quelques secondes et sessions stratégiques longues sont également valides. Le score de recommandation ne contrôle jamais les récompenses.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Interactions indispensables

- Trier par recommandation, priorité, longueur et difficulté.
- Ajouter et modifier une tâche sandbox.
- Lancer puis terminer une tâche réelle de démonstration.
- Expliquer séparément le score et les récompenses.
- Créditer Énergie, Matériaux et Réputation avec une animation vectorielle.
- Planter une culture, avancer le temps, récolter et construire ou réparer.
- Déclencher au moins un événement récupérable avec plusieurs réponses chiffrées.
- Afficher le Bastion, ses secteurs, son intégrité et un fragment narratif.
- Permettre une remise à zéro du monde de démonstration.
- Ne jamais appeler l’API de production ni écrire dans `tasks.json`.

## Accessibilité et adaptation

- Texte principal de 16 px minimum et cibles tactiles de 44 px.
- Contraste AA, information jamais portée seulement par la couleur.
- Clavier, focus visible, annonces `aria-live` et actions alternatives aux gestes.
- `prefers-reduced-motion` conserve les confirmations sans déplacement spatial.
- Téléphone: colonne unique et navigation basse.
- Tablette: rail gauche et panneau contextuel maître-détail.
