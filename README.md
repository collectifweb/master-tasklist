# L’Orée

Une liste de tâches qui rend le quotidien plus agréable à abattre, des petites corvées de cinq minutes aux gros chantiers. Chaque tâche terminée rapporte des ressources, d’autant plus qu’elle a demandé du temps et de l’effort. Ces ressources font tourner l’économie d’un village : un campement au départ, puis un hameau, un village, un bourg, une ville.

L’idée est de te motiver à avancer dans ta journée, et de te sentir récompensé de l’avoir fait. Pendant que tu règles tes vraies affaires, ton village grandit.

Le jeu s’utilise surtout sur téléphone ou tablette, et s’installe sur l’écran d’accueil comme une application. Son nom de code, dans le dépôt, est « La lisière rallumée ».

<p>
  <img src="docs/captures/jeu-telephone.png" alt="Le jeu sur téléphone : l’île du village en haut, la quête du jour et le bouton Fait en bas" width="260">
  <img src="docs/captures/jeu-ordinateur.png" alt="Le jeu sur ordinateur : l’île du village à gauche, la liste des quêtes à droite" width="560">
</p>

*Captures faites avec les quêtes d’exemple de `tasks.example.json`.*

## Une liste de tâches qui sait par où commencer

Une tâche, ici, s’appelle une quête. Contrairement à une liste ordinaire, chacune porte trois réglages de 1 à 10, en plus de son titre : sa priorité, sa durée (de 5 minutes à 4 heures) et l’effort qu’elle demande.

À partir de ces réglages, le jeu calcule une Cote sur 100 et range les quêtes dans cet ordre. La priorité pèse le plus, mais une quête courte, facile, dont l’échéance approche ou qui traîne depuis longtemps monte aussi. Dès qu’une quête de priorité 8 ou plus existe, au moins une reste parmi les trois premières, et un bouton « Pourquoi? » détaille le calcul.

Le fil du jour propose jusqu’à trois quêtes : celle à faire d’abord, une victoire rapide et un grand chantier. Pour choisir autrement, la liste complète se filtre (« 15 min », « Peu d’énergie », « Cette semaine », par quartier), se trie de sept façons et se fouille par mots.

Les quêtes couvrent toute la vie quotidienne, pas seulement la maison. Chaque catégorie a son quartier dans le village : l’Atelier pour la maison, les Champs pour le terrain, le Garage pour le véhicule, la Mairie pour les papiers et l’administratif, l’École pour les enfants, et la Place du village pour tout le reste. Le jeu devine le quartier d’après les mots du titre (« pneus » va au Garage, « impôts » à la Mairie) et on peut le corriger.

Une quête peut aussi avoir des étapes (12 au plus), une échéance, une récurrence (chaque jour, chaque semaine, chaque mois…) et des notes. Une tâche faite sans être passée par la liste s’ajoute comme « Déjà faite aujourd’hui ». Une quête cochée par erreur se « remballe » dans les 24 heures.

## Ce que rapporte une quête

Une quête terminée donne de l’Énergie et des Matériaux. Plus elle est longue et exigeante, plus elle rapporte, et sa priorité y ajoute une prime. La Cote, elle, décide de l’ordre de la liste et pas du gain, à un détail près : finir une quête prioritaire qui était parmi les trois premières donne 2 Énergie de plus, une fois par jour.

Le jeu ne pousse pas à gonfler ses tâches : passé un certain total d’effort dans la journée (à peu près deux quêtes moyennes), les gains baissent de moitié, puis davantage. Une échéance posée au moins 48 heures avant de finir la quête, et respectée, donne un petit bonus, et cocher les étapes d’une quête en paie une partie en chemin.

## Comment s’en servir

1. Ajoute une quête : son titre suffit, le jeu propose le quartier et des réglages par défaut que tu peux ajuster.
2. Ouvre le fil du jour, fais la quête proposée, touche « Fait ». Les ressources arrivent tout de suite.
3. Dépense-les sur l’île : rebâtir un chalet, semer le potager, construire une serre, accueillir une famille.
4. Reviens quand tu as fini autre chose. Pas de série à tenir : aucun compteur de jours de suite, et une absence ne fait rien perdre.

Cinq premiers pas guident le début de la partie, et trois écrans de bienvenue présentent le jeu au premier lancement.

## Le village et ses règles

L’Orée est un village du Nord, entre la forêt et un lac. Au départ, il ne reste que trois chalets vides et un potager ; la bible du jeu (`docs/BIBLE-JEU.md`) raconte que les gens sont partis vers le Sud après quelques hivers trop durs. Tu le relances avec des serres et des éoliennes, aidé de Fanal, un vieux robot de déneigement qui annonce les visiteurs et les tempêtes, et qui t’écrit une lettre à ta première visite de la journée.

Le village vit de quatre ressources, l’Énergie, les Matériaux, la Nourriture et les Habitants, plus des permis. Les quêtes donnent l’Énergie et les Matériaux. Les récoltes et certains bâtiments donnent la Nourriture. Elle sert d’abord à accueillir des familles. Elle paie aussi le repas de la semaine, servi sur la Place contre de l’Énergie, et la partie de sucre du printemps. Quand la réserve est pleine, ce que la cabane à sucre ne peut pas ranger part en sirop chez le marchand du quai. Les familles font monter le rang du village : Hameau à 3 habitants, Village à 6, Bourg à 11, Ville à 21. Le Hameau ouvre l’éolienne, le grenier, le quai et une deuxième serre ; le Village, la tour de guet, la scierie, le poulailler et la cabane à sucre. Les permis, gagnés entre autres tous les quatre jours travaillés, font monter les quartiers (il faut aussi de l’Énergie et des Matériaux). Cinq quartiers correspondent à une catégorie de tâches ; la Place du village prend le reste.

Les saisons suivent le vrai calendrier. L’objectif d’automne est de remplir le grenier, celui d’hiver de garder la serre allumée, celui du printemps de faire une partie de sucre, entre le 1er mars et le 30 avril. De la mi-novembre à la fin mars, sauf pendant la trêve des Fêtes, une tempête de neige arrive tous les 7 à 14 jours. Elle s’annonce 3 jours d’avance (6 avec une tour de guet), et chaque jour travaillé aide à s’y préparer.

Des imprévus arrivent d’eux-mêmes, jusqu’à deux par semaine (jusqu’à quatre quand le village tourne à plein régime). Certains sont bons (une aurore, une bonne pêche, une trouvaille en forêt), d’autres non (une panne d’éolienne, un ours au potager, un gel précoce). Un dégât se règle en payant un peu, en faisant une vraie quête de la bonne catégorie, ou en attendant un à trois jours. Il ne touche jamais une vraie tâche ni ce que tu as en réserve, mais il peut priver d’un gain : l’ours mange une partie de la prochaine récolte, une éolienne en panne ne produit plus.

Une fois le quai construit, un marchand y échange des ressources, et chaque semaine un visiteur arrive avec une commande : un convoi, une famille du Sud, une scientifique. Livrer n’est jamais obligatoire. Le jeu s’adapte aussi à ton rythme : si tu as fait peu de quêtes les deux semaines précédentes, il passe au ralenti, avec seulement de bons imprévus et des commandes plus petites. Après une absence de cinq jours ou plus, le village te laisse trois jours de répit.

## Ce qu’il faut pour l’héberger

- Un hébergement web avec PHP 8.3 (la version sur laquelle le jeu est testé) et Apache ou LiteSpeed, qui lisent les fichiers `.htaccess`.
- Aucune base de données : tout est gardé dans des fichiers JSON.
- HTTPS, pour installer le jeu sur l’écran d’accueil.

Le jeu enregistre tout par un petit serveur en PHP (`app/api/api.php`). Un hébergement qui ne sert que des fichiers, Cloudflare Pages par exemple, ne suffit donc pas.

**Pour installer le jeu chez toi, suis le guide : [docs/INSTALLATION.md](docs/INSTALLATION.md).**

## L’essayer sur ton ordinateur

Il faut PHP 8.3. Depuis la racine du dépôt :

```bash
cp tasks.example.json tasks.json
php -S 127.0.0.1:8090 -t .
```

Puis ouvrir <http://127.0.0.1:8090/app/>. Avec ce serveur de développement, aucun code d’accès n’est demandé. La partie est gardée dans `app/api/data/`, ignoré par Git.

## Tests

Avec Node 24 et PHP 8.3 :

```bash
node --test "app/tests/core/*.test.mjs" "app/tests/api/*.test.mjs"
```

Les scénarios navigateur (`app/tests/e2e/`, lancés par `run-ui.sh`) utilisent la bibliothèque Playwright et prennent environ 45 minutes.

## Les dossiers

| Où | Quoi |
|---|---|
| `app/` | Le jeu. HTML, CSS et modules JavaScript, sans outil de construction ni dépendance. |
| `app/core/` | Les règles du jeu, en logique pure, testée. |
| `app/js/`, `app/world/` | L’interface et l’île. |
| `app/content/fr-CA/` | Tous les textes du jeu. |
| `app/api/` | Le serveur PHP et son modèle de réglages, `config.example.php`. |
| `app/ARCHITECTURE.md`, `app/DESIGN.md` | Le fonctionnement technique et le design. |
| `PRODUCT.md`, `docs/BIBLE-JEU.md` | Le cahier des charges, le récit et l’économie du jeu. |
| `docs/revue-2026-10/` | La revue d’octobre 2026 d’où vient le jeu actuel. |
| `tasks/` | Le journal de développement : le plan, lot par lot, et les leçons. |
| `tasks.example.json` | Des tâches fictives pour essayer. |
| `sync-tasks-remote.sh`, `TASKS_WORKFLOW.md`, `.hermes/` | La synchronisation avec Hermes, l’agent familial de l’installation d’origine. Inutile pour une autre installation. |
| `CLAUDE.md` | Les consignes des agents de code qui travaillent sur le dépôt. |

L’ancienne application et les maquettes qui ont précédé le jeu ne sont plus dans la branche principale. On les retrouve dans l’étiquette `v2.10.1` : `git checkout v2.10.1`.

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE.md), Copyright 2026 Alexandre Alves.

Tu peux utiliser le jeu, le modifier et le partager pour tout usage non commercial. L’usage commercial n’est pas permis. Une copie doit garder le texte de la licence et sa ligne `Required Notice`. Le texte qui fait foi est celui de `LICENSE.md`, en anglais.
