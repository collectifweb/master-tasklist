# Le Bastion des Cendres

## Stance

Un gestionnaire de quêtes dark fantasy adulte, lisible avant d’être spectaculaire : la tâche réelle reste au premier plan, tandis que la progression du Bastion agit comme une trace secondaire et durable des actions accomplies.

## Choix de conception

- **Structure mobile-first** : recommandation immédiate, braise quotidienne compacte, dispositions rapides, liste de quêtes, puis navigation fixe Aujourd’hui / Quêtes / Bastion / Codex.
- **Direction visuelle** : surfaces ardoise, ivoire chaud, braise et cuivre; texture géométrique minimale plutôt que parchemin, noir intégral ou interface de cockpit.
- **Typographie** : police système pour toute l’interface; sérif expressive limitée aux titres courts et au nom du produit.
- **Gamification explicable** : l’indice montre ses composantes (priorité, brièveté, facilité), et le Codex explique les règles au lieu de cacher une mécanique opaque.
- **Progression secondaire** : le Bastion et la Rune du Foyer témoignent du progrès sans bloquer la gestion des tâches ni créer de faux travail.
- **Données réalistes** : quêtes tirées de `tasks.json`, dont l’inventaire des outils, la terrasse, les protections courantes, le budget mensuel, l’entretien du vélo et quelques démarches courantes.
- **Autonomie** : HTML, CSS, SVG et JavaScript sont intégrés dans un seul fichier; aucune requête ni écriture réseau.
- **Accessibilité** : cibles de 44 px minimum, texte principal à 16 px, contrastes élevés, navigation clavier, focus visible, libellés ARIA et respect de `prefers-reduced-motion`.

## Interactions incluses

- Afficher le détail du calcul de l’indice recommandé.
- Filtrer par **10 min**, **Énergie faible** ou **Prioritaire**.
- Rechercher et trier le registre complet des quêtes.
- Ajouter, modifier et retirer une quête dans l’état local du prototype.
- Sélectionner de une à trois quêtes et lancer une expédition.
- Accomplir la quête conseillée, envoyer visuellement une braise vers la progression et mettre à jour la Rune du Foyer.
- Annuler immédiatement une complétion depuis le message de confirmation.
- Explorer les quatre vues de navigation, dont le Bastion et le Codex.

## Forces

- La prochaine action utile est identifiable en quelques secondes.
- Le ton dark fantasy est distinctif sans réduire la lisibilité quotidienne.
- Le score et la progression ludique restent transparents et liés au travail réel.
- L’interface tient sur téléphone et s’étend en deux colonnes sur tablette / grand écran.
- Les états principaux sont réellement manipulables sans infrastructure.

## Faiblesses et limites

- L’état est volontairement en mémoire : un rechargement réinitialise le prototype.
- La complétion animée est démontrée sur la quête recommandée; les autres quêtes servent surtout à l’expédition et à l’édition.
- L’économie des braises, les rangs et les améliorations sont illustratifs, faute de règles produit validées.
- La forteresse est une silhouette CSS conceptuelle, pas un système graphique final ni un historique réel de progression.
