# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Alex est l’unique utilisateur pour l’instant. Il utilise l’application surtout sur téléphone ou tablette pour consulter, choisir, ajouter, modifier et terminer des tâches familiales et personnelles.

## Product Purpose

Transformer une liste de tâches réelle en système de quêtes motivant. Le produit doit donner envie de revenir chaque jour, aider à choisir la meilleure prochaine action et rendre l’accomplissement plus satisfaisant qu’une simple case cochée.

Le succès signifie qu’Alex ouvre spontanément l’application, repère rapidement une tâche adaptée à son temps et à son énergie, l’accomplit, l’annote et ressent une progression durable.

## Positioning

Chaque tâche combine utilité réelle et progression ludique. L’application classe les quêtes selon priorité, longueur et difficulté, puis calcule un coefficient qui favorise les tâches très prioritaires, courtes et simples à exécuter.

Le produit doit être un véritable jeu de gestion avec narration, enjeux, obstacles, événements et décisions de dépense, et non une todo list décorée. Les tâches accomplies restent la source principale de progression. Des actions utiles comme planifier la journée, ajouter une tâche réelle ou revenir quotidiennement peuvent donner de petits bonus plafonnés, sans permettre de fabriquer artificiellement de la progression.

## Operating Context

- Consultation fréquente sur mobile et tablette.
- Ajout rapide de tâches depuis l’application ou par l’agent familial.
- Classement par priorité, longueur, difficulté, domaine, statut et coefficient calculé.
- Tâches existantes conservées pendant toute migration de données.
- Utilisation individuelle, sans collaboration ni comptes multiples à ce stade.
- Synchronisation actuelle entre une copie locale et l’hébergement de `todo.example.com`.

## Capabilities and Constraints

- Conserver le tri et le filtrage par priorité, longueur et difficulté.
- Calculer une note par tâche afin de favoriser les actions prioritaires, courtes et faciles.
- Ajouter, éditer, annoter, terminer, réactiver et classer une tâche facilement.
- Concevoir une gamification profonde et extensible: quêtes, progression, récompenses et futurs systèmes de jeu.
- Donner aux points une utilité concrète: construire, améliorer, défendre, débloquer ou résoudre des événements dans le monde du jeu.
- Inclure une boucle de gestion avec objectifs, ressources, aléas et obstacles. Exemples confirmés: ferme évolutive, récoltes menacées, insectes, réparations, dépenses de points et choix de développement.
- Prévoir une narration en chapitres et de vrais enjeux virtuels récupérables, sans toucher aux tâches ni données réelles en cas d’échec dans le jeu.
- Autoriser de petits bonus plafonnés pour certaines actions utiles autres que terminer une tâche, notamment l’ajout d’une vraie tâche, la planification et le retour quotidien.
- Prévoir l’évolution du modèle de données au-delà de `tasks.json`, sans perdre les tâches actuelles.
- Rester sans courriel.
- Les notifications navigateur sont facultatives, discrètes et configurables, notamment pour un rappel quotidien.
- L’interface doit être ergonomique, lisible et attrayante sur mobile et tablette.
- L’hébergement actuel est un environnement web LiteSpeed/PHP avec fichiers statiques et endpoint d’écriture PHP. Une évolution technique doit préserver un déploiement fiable sur cet environnement ou fournir une migration explicitement vérifiée.
- Le produit n’est pas multiutilisateur à ce stade.

## Brand Commitments

- Nom de travail existant: « Quêtes du foyer ».
- Le langage produit peut assumer pleinement les métaphores de jeu vidéo, tant que les actions principales restent évidentes.
- L’expérience doit rester adulte, crédible et agréable à utiliser souvent, sans ressembler à une interface infantile ou à une couche de points décorative.
- La direction visuelle Vecteur est la préférence actuelle d’Alex parmi les prototypes: interface animée, précise, énergique et lisible.
- Le Potager est la boucle de gestion la plus prometteuse: ferme réellement développable, objectifs, animations, événements et aléas à contrer.
- Le Bastion est une piste forte pour la narration, les mystères, les obstacles et la progression à long terme.
- Monde principal confirmé: une colonie agro-tech. L’interface reprend l’énergie visuelle de Vecteur; la ferme fournit la boucle de gestion; le Bastion devient le système de défense et le mystère narratif.
- Les aléas ont des conséquences virtuelles réelles mais récupérables: récoltes perdues, bâtiments endommagés ou délais supplémentaires. Ils ne suppriment jamais une tâche, une donnée réelle ou une progression permanente.
- Économie confirmée à trois ressources: énergie pour les actions immédiates, matériaux pour construire et réparer, réputation pour les déblocages, relations et chapitres narratifs.
- Le jeu doit convenir aux visites de quelques secondes comme aux sessions stratégiques plus longues, sans obliger Alex à consacrer une durée quotidienne fixe.

## Evidence on Hand

- Application actuelle: `index.html`.
- Données réelles: `tasks.json`.
- Workflow et architecture de synchronisation: `TASKS_WORKFLOW.md` et `sync-tasks-remote.sh`.
- Endpoint d’écriture hébergé existant: `tasks-api.php` dans l’artefact de déploiement local.
- Aucun actif graphique, univers visuel définitif, économie de récompenses validée ou donnée de progression historique n’est encore fourni. Ces éléments ne doivent pas être présentés comme existants.

## Product Principles

1. Le jeu récompense le progrès réel, il ne remplace jamais la clarté de la tâche.
2. La prochaine action utile doit être identifiable en quelques secondes.
3. La récompense doit être proportionnelle à l’effort, à l’urgence et à la constance, sans encourager à gonfler artificiellement les tâches.
4. Les interactions fréquentes doivent rester rapides; les moments spectaculaires sont réservés aux accomplissements qui les méritent.
5. Toute évolution doit préserver les données et permettre d’ajouter de nouveaux systèmes de jeu sans réécrire le cœur de gestion des tâches.

## Accessibility & Inclusion

- Typographie lisible et cibles tactiles adaptées au mobile.
- Contrastes suffisants et information jamais transmise uniquement par la couleur.
- Navigation clavier et technologies d’assistance pour les fonctions essentielles.
- Animations réduites lorsque `prefers-reduced-motion` est actif.
- Aucun son automatique; tout son futur doit être explicitement activé et désactivable.
