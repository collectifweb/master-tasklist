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
- Prévoir une narration (rangs du village, saisons réelles, visiteurs, chroniques hebdomadaires d’Hermes) et de vrais enjeux virtuels récupérables, sans toucher aux tâches ni données réelles en cas d’échec dans le jeu.
- Adapter le jeu au rythme d’usage : lever le pied après une absence ou à rythme lent, offrir plus de débouchés et de défis à rythme soutenu, sans jamais changer le prix de l’existant ni ce que rapporte une tâche.
- Autoriser de petits bonus plafonnés pour certaines actions utiles autres que terminer une tâche, notamment l’ajout d’une vraie tâche, la planification et le retour quotidien. La « semaine tenue » (dès le 5e jour travaillé d’une semaine, 12 Matériaux, une fois par semaine) en est un : un bonus plafonné de retour régulier, sans série ni compteur de jours de suite.
- Prévoir l’évolution du modèle de données au-delà de `tasks.json`, sans perdre les tâches actuelles.
- Rester sans courriel.
- Les notifications sont facultatives, discrètes et configurables. Le rappel quotidien passe par l’app gratuite ntfy (téléphone sans services Google), avec un texte général sans titre de tâche.
- L’interface doit être ergonomique, lisible et attrayante sur mobile et tablette.
- L’hébergement actuel est un environnement web LiteSpeed/PHP avec fichiers statiques et endpoint d’écriture PHP. Une évolution technique doit préserver un déploiement fiable sur cet environnement ou fournir une migration explicitement vérifiée.
- Le produit n’est pas multiutilisateur à ce stade.

## Brand Commitments

- Nom de travail existant: « Quêtes du foyer ».
- Le langage produit peut assumer pleinement les métaphores de jeu vidéo, tant que les actions principales restent évidentes.
- L’expérience doit rester adulte, crédible et agréable à utiliser souvent, sans ressembler à une interface infantile ou à une couche de points décorative.
- La direction visuelle Vecteur est la préférence actuelle d’Alex parmi les prototypes: interface animée, précise, énergique et lisible.
- Le Potager est la boucle de gestion la plus prometteuse: ferme réellement développable, objectifs, animations, événements et aléas à contrer.
- Monde principal confirmé le 5 octobre 2026 : un village du Nord québécois au bord d’un lac, relancé avec des outils d’aujourd’hui, qui grandit sans fin (bible : `docs/BIBLE-JEU.md`). Le Bastion et son mystère sont abandonnés.
- Les aléas ont des conséquences virtuelles réelles mais récupérables: récoltes perdues, bâtiments endommagés ou délais supplémentaires. Ils ne suppriment jamais une tâche, une donnée réelle ou une progression permanente.
- Économie confirmée à quatre ressources : Énergie et Matériaux gagnés par les tâches, Nourriture tirée des récoltes, Habitants qui font monter le rang du village. Les permis (voir plus bas) ne sont pas une ressource : un compteur « Permis » à part, dans la barre des ressources, remplace la pastille qui était sur « Construire ».
- Les quartiers montent par permis, au choix du joueur (décision du 5 octobre 2026). La Mairie délivre un permis tous les 4 jours travaillés, un à chaque nouveau rang et un pour l’objectif de saison réussi. Chaque niveau change un seul réglage du jeu et ne change jamais ce que rapporte une tâche. Le domaine d’une tâche ne compte plus pour les niveaux. Prix d’un niveau n (décision du 6 octobre 2026) : n permis, n × 80 Énergie et n × 60 Matériaux.
- L’effort paie : une quête longue et difficile rapporte beaucoup plus que plusieurs courtes et faciles. Le plafond quotidien et les bonus plafonnés ne changent pas.
- La semaine tenue (6 octobre 2026) : au 5e jour travaillé d’une semaine (lundi au dimanche), le village reçoit 12 Matériaux, une seule fois par semaine. C’est un bonus plafonné de retour régulier, qui ne s’obtient pas en gonflant des quêtes : un jour travaillé est un jour avec au moins une quête payée, et rien de plus ne rapporte après le 5e. Aucune série, aucun compteur de jours de suite ; une semaine manquée ne coûte rien. Le montant est une valeur de départ à ajuster.
- Une deuxième petite serre est permise, au rang Hameau (6 octobre 2026) : plus de Nourriture l’hiver, et un usage pour l’Énergie.
- Réglages : « Quête par défaut » (priorité, longueur, difficulté de départ d’une nouvelle quête), gardée avec la partie, donc la même sur tous les appareils. Le prénom, lui, reste sur l’appareil. L’agent familial (Hermes) n’est pas touché : il évalue ses quêtes lui-même.
- « Je m’y mets » est retiré : ni bouton, ni épingle, ni relevé du temps. Les valeurs d’une quête (priorité, longueur, difficulté) se figent à la première étape cochée ou 24 h après sa création.
- Sur la carte, trois boutons : « Construire » (catalogue des bâtiments, prix et manques), « Quêtes » (montre ou cache le panneau) et « Vue » (Rapprocher, Éloigner, Toute l’île, Carte en liste). Toucher un quartier ouvre sa fiche.
- Point ouvert (6 octobre 2026) : avec la formule « l’effort paie », gonfler la longueur et la difficulté d’une quête créée puis terminée aussitôt rapporte davantage qu’avant ; le gel des valeurs ne joue qu’après la première étape cochée ou 24 h. À trancher par Alex.
- Le jeu doit convenir aux visites de quelques secondes comme aux sessions stratégiques plus longues, sans obliger Alex à consacrer une durée quotidienne fixe.
- Le futurisme doit être réconcilié avec la ferme par un monde agro-futuriste cohérent, plus chaleureux et incarné. Éviter qu’une interface sci-fi sombre paraisse simplement posée par-dessus un jeu agricole.
- Le récit doit expliquer dès les premières minutes ce que le joueur gère, pourquoi le village est à relancer, quels sont les objectifs immédiats et à long terme, et comment les Habitants font progresser le village.
- La ferme doit devenir un véritable espace de jeu manipulable, inspiré de Township et Blocky Farm: carte visible, éléments cliquables, placement de bâtiments et décorations, parcelles développées progressivement et obstacles à contrer avec les ressources gagnées.
- L’application en ligne est protégée par un code d’accès unique, avec blocage temporaire après plusieurs mauvais codes (en production depuis le 5 octobre 2026).

## Evidence on Hand

- Application actuelle : `app/` (« La lisière rallumée »). L’application historique `index.html` n’est plus servie en ligne.
- Données réelles: `tasks.json`.
- Workflow et architecture de synchronisation: `TASKS_WORKFLOW.md` et `sync-tasks-remote.sh`.
- Endpoint d’écriture de l’application historique : `tasks-api.php` dans l’artefact de déploiement local. L’app actuelle écrit `tasks.json` par `app/api/api.php`.
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
