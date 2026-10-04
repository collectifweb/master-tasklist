# Le Potager des Quêtes

## Stance

Un gestionnaire de tâches adulte présenté comme un almanach de jardin contemporain : la métaphore agricole soutient la motivation, mais la prochaine action réelle reste toujours le premier élément à lire et à accomplir.

## Choix de conception

- **Mobile-first** : liste de vraies tâches immédiatement visible, navigation inférieure à quatre destinations et bouton d’ajout toujours accessible; rail latéral à partir de la tablette.
- **Direction visuelle** : crème, terre, sauge et bleu ciel; titres sérif éditoriaux, corps système très lisible; texture de papier, sillons et cultures dessinés uniquement en CSS/SVG.
- **Récolte du jour** : trois recommandations distinctes — « À faire d’abord », « Victoire rapide » et « Grand chantier » — issues de `tasks.json`.
- **Score explicable** : `priorité × 10 + brièveté × 4 + facilité × 3`, avec détail complet accessible depuis chaque carte. Le score est présenté comme un conseil de prochaine action, jamais comme une mesure de valeur personnelle.
- **Ferme secondaire** : la progression visuelle dépend des quêtes terminées. Elle approfondit l’univers sans concurrencer la liste principale.
- **Accessibilité** : cibles tactiles de 44 px ou plus, texte principal de 16 px, états clavier visibles, libellés accessibles, contraste non dépendant de la couleur et prise en charge de `prefers-reduced-motion`.
- **Autonomie** : un seul fichier HTML avec CSS, SVG, données et JavaScript inline; aucune police, image, bibliothèque ou écriture réseau.

## Interactions

- Trier les recommandations par score, priorité, longueur ou difficulté.
- Chercher, filtrer et trier toutes les quêtes.
- Ajouter, modifier ou supprimer une quête dans l’état temporaire du prototype.
- Mettre une quête en terre, faire pousser un semis dans la parcelle du jour et annuler l’action depuis le toast.
- Ouvrir le détail chiffré d’un score depuis chaque carte.
- Naviguer entre Aujourd’hui, Quêtes, Ferme et Journal.
- Sélectionner et arroser les planches de la ferme; une nouvelle planche s’ouvre avec la progression du jour.

## Forces

- L’utilité réelle précède nettement la gamification.
- La personnalité visuelle est distinctive sans devenir enfantine.
- Les données existantes donnent immédiatement une impression crédible du produit final.
- Le modèle de score est transparent et facile à discuter ou à ajuster.
- Les états mobile et tablette/ordinateur sont réellement composés, pas simplement agrandis.

## Faiblesses et limites

- L’état est volontairement en mémoire : tout ajout ou changement disparaît au rechargement.
- Les recommandations du jour sont éditorialisées pour le prototype; un produit réel devrait les calculer selon échéances, disponibilité et énergie.
- La ferme illustre une boucle de progression, mais son économie, ses niveaux et ses récompenses ne sont pas validés.
- Les dates du journal sont démonstratives, faute d’historique de complétion dans les données actuelles.
- Le prototype ne couvre pas la synchronisation, les erreurs réseau, les notifications ni la migration de données.
