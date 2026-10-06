# Progression des quartiers : le permis (proposition)

**Statut : validée par Alex le 5 octobre 2026 au soir** (« Oui parfait le permis » ; essai : conversion des niveaux en permis). Issue d'un panel du 5 octobre 2026 au soir : quatre conceptions indépendantes (ressources existantes, devise dédiée, plans par jalons, remise en question), deux juges (regard du joueur, regard du concepteur et du développeur), puis une synthèse. Les deux juges ont retenu la conception « plans par jalons », la synthèse l'a simplifiée en « permis ». Les chiffres sont à régler par la simulation.

Vérifié ensuite par moi (session principale) : la simulation du dépôt relancée donne les mêmes dates de village plein que la synthèse (§0) ; les réglages actuels cités (culture mûre en 5 jours travaillés, récolte de 4, famille à 18 Nourriture, 3 chalets de 2 places) sont ceux de `app/core/batiments.js` ; le mot « plan » est déjà pris par « Un plan pour aujourd’hui ? » (`app/content/fr-CA/interface.json`). Le reste des citations fichier:ligne vient du panel et n'a pas été repris un par un.

Réponses d'Alex : le nom « permis » est retenu ; sur l'essai, les niveaux actuels sont convertis en permis à placer.

---

## Pour Alex

**Ce que je recommande : une monnaie à part, le « permis » (nom provisoire), délivré par la Mairie.**

- **D'où il vient.** Tous les 4 jours où tu as terminé au moins une quête, n'importe laquelle, tu reçois un permis. Il n'y a pas de date limite : un jour sans quête ne fait rien perdre, le compte attend. Chaque nouveau rang du village et l'objectif de saison réussi en donnent un aussi.
- **Comment tu choisis.** Tu touches un quartier. Sa fiche dit ce qu'il fait, ce que le prochain niveau change et ce qu'il coûte. Par exemple, le niveau 2 coûte 2 permis, plus des travaux payés en Énergie et en Matériaux (60 et 80, à régler). Tu appuies sur « Monter au niveau 2 » si tu le veux. Rien ne monte tout seul.
- **Ce qu'apporte un niveau.** C'est toujours un chiffre du jeu qui change, écrit sur la fiche. Garage niveau 1 : les cultures sont mûres en 4 jours au lieu de 5. Atelier niveau 1 : la petite serre donne 5 Nourriture au lieu de 4, même l'hiver. Mairie niveau 1 : accueillir une famille coûte 15 Nourriture au lieu de 18.
- **Tes reproches.** Le domaine d'une tâche ne compte plus pour les niveaux. Une vidange compte autant qu'un ménage. Le Garage peut monter avec tes tâches de maison, si tu le choisis. L'hiver, les permis continuent d'arriver. La fiche des Champs dit que leur effet attend le mois de mai, donc tu montes plutôt l'Atelier ou le Garage.
- **Ce n'est pas « le même stock ».** Le permis compte des jours, pas des tâches : une journée à 5 tâches vaut une journée à 1. Tu n'as donc aucune raison d'inventer des tâches. Les travaux, eux, donnent enfin un usage à l'Énergie et aux Matériaux qui s'accumulent une fois le village plein.

L'autre piste qui reste sérieuse : payer les niveaux seulement en Énergie et en Matériaux. C'est plus simple, mais c'est justement le stock commun que tu trouvais étrange.

**Deux questions à trancher :**
1. Le nom « permis » (comme un permis de bâtir, tamponné par la Mairie) te va-t-il ? « Plan » est déjà pris par le plan du jour.
2. Sur l'essai, on change tes niveaux actuels en permis à placer où tu veux (je le recommande), ou tout repart à zéro ?

## Spécification

Statuts utilisés : **lu** (code ou doc ouverts, avec fichier:ligne, chemins relatifs à `app/` sauf mention), **vérifié** (exécuté dans cette session), **rapporté** (chiffres des conceptions ou de `tasks/todo.md`, pas refaits ici), **proposé** (conception, chiffres à régler par la simulation).

### 0. Ce qui a été vérifié dans cette session
- **Quartier de chaque emplacement de bâtiment.** J'ai appliqué `sectorAt` (world/layout.js:17-22) à `EMPLACEMENTS` (layout.js:107-115), avec la même règle que world.js:87. Résultat : chalet-1, chalet-2 et le quai sont sur la Place, chalet-3 à l'École, les trois parcelles aux Champs, l'atelier et la serre à l'Atelier, l'éolienne et le grenier à la Mairie. Le Garage n'a aucun emplacement : il n'y a que la caisse du convoi (layout.js:98).
- **La fonction `simuler()` du dépôt, relancée.** Je l'ai copiée hors du dépôt (tests/core/simulation.test.mjs:35-85), avec la formule de gains actuelle. Le village est plein (6 habitants) :

  | Départ | Rythme | Village plein |
  |---|---|---|
  | 6 octobre | 2,5 quêtes par jour | jour 38 |
  | 6 octobre | 1 quête par jour | jour 46 |
  | 25 octobre | 2,5 quêtes par jour | 30 janvier, jour 98 |
  | 25 octobre | 1 quête par jour | jour 101 |
  | 1er juin | les deux rythmes | jour 36 |

  Au jour 200, à 2,5 quêtes par jour : environ 2 170 Énergie et 3 430 Matériaux dorment. Ce joueur simulé ne bâtit ni éolienne, ni grenier, ni quai. La note `tasks/todo.md:169` (« village plein fin novembre ou début décembre » pour un départ le 25 octobre) est donc **fausse** : il faut la corriger.

### 1. Ordre de travail (proposé)
1. Coder d'abord « l'effort paie » (gains). Le prix des travaux en dépend, pas le permis.
2. Coder le cœur des niveaux et des permis : tests écrits d'abord et vus en échec.
3. Passer par /impeccable pour la fiche du quartier, la plaque, la section « Quartiers » du catalogue « Construire » et la pastille. Ensuite seulement, coder l'interface.
4. Régler par simulation la constante `ECHELLE` et le seuil de 4 jours.
5. Tout ça se fait avant la bascule (décidé).

### 2. La monnaie : le permis (proposé)

**Ce que contient la partie :**
- `game.permis = { dispo, depuis }` : `dispo` = permis en main ; `depuis` = jour à partir duquel on compte les jours travaillés.
- `game.niveaux = { champs: 0, atelier: 0, mairie: 0, ecole: 0, garage: 0, place: 0 }`.

**Sources** (aucune ne regarde le domaine d'une tâche) :

1. **Les jours travaillés.** Un jour travaillé est un jour avec au moins une quête payée et non remballée. C'est la définition qui existe déjà (lu : `joursTravailles`, core/batiments.js:94-103).
   - Une quête « Déjà faite » compte : c'est une entrée de type `reward` (lu : ledger.js:110, 115).
   - Une étape cochée ne compte pas.
   - Après chaque quête payée, au même endroit que l'éolienne (lu : quests.js:238), on appelle `suivrePermis(ctx)`. Si `joursTravailles(registre, game.permis.depuis, aujourd'hui) >= 4` et que la clé `permis:{jour}` n'existe pas, on inscrit au registre `{ key: 'permis:{jour}', type: 'permis', pe: 0, energy: 0, materials: 0, permis: 1 }` et on pose `game.permis.depuis = jour`.
   - La clé unique donne au plus un permis par jour, et rejouer ne paie jamais deux fois (lu : `hasKey`, ledger.js:50).
2. **Chaque nouveau rang.** Dans `accueillir`, au changement de rang (lu : batiments.js:256-257), on inscrit `permis:rang:{palier}`. La clé porte le numéro du palier, pas l'identifiant : tous les rangs « Ville +n » ont l'identifiant `ville` (lu : village.js:23-27). Le rang ne redescend jamais (personne ne part).
3. **L'objectif de saison réussi.** On ajoute `permis: 1` à `OBJECTIFS_SAISON.automne.recompense` (lu : objectifs.js:34) et à l'entrée `saison:{clé}` (lu : objectifs.js:182). La bible promet déjà un « plan de bâtiment » à cette occasion (lu : docs/BIBLE-JEU.md:111).

**Ce que le permis n'est pas :**
- Il ne dépend ni du volume de tâches, ni des points d'effort, ni du domaine.
- Remballer ne reprend jamais un permis. Remballer n'écrit que l'inverse de la quête et la reprise de l'éolienne (lu : quests.js:441-443).
- On ne le recalcule jamais depuis tout le registre : celui-ci n'est complet que sur 60 jours (lu : api.php:13, ledger.js:29-42). Le permis est appliqué à l'état au moment où on l'inscrit. Dans `applyEntry`, on ajoute `entry.permis` à `game.permis.dispo`, comme la Nourriture (lu : economy.js:19).
- `ctx.append` ne produit pas d'événement de gain pour une entrée sans points ni ressources (lu : quests.js:76). Il faut donc pousser un événement `{ type: 'permis', source: 'jours' | 'rang' | 'saison', dispo }`.

**Rythme (calcul, pas simulé) :**
- 7 jours travaillés par semaine : 1,75 permis par semaine ;
- 6 jours : 1,5 ;
- une quête tous les deux jours : environ 0,9.

Un joueur à une quête par jour reçoit autant de permis qu'un joueur à trois. C'est voulu : on récompense la régularité, pas le volume.

### 3. Prix d'un niveau (proposé, même barème pour les six quartiers)

Niveau n = **n permis + n × ECHELLE × (3 Énergie + 4 Matériaux)**. On part de `ECHELLE = 10`, à régler par la simulation : c'est la seule constante à toucher.

| Niveau visé | Permis | Énergie | Matériaux |
|---|---|---|---|
| 1 | 1 | 30 | 40 |
| 2 | 2 | 60 | 80 |
| 3 | 3 | 90 | 120 |

Pour les 18 niveaux : 36 permis, 1 080 Énergie et 1 440 Matériaux.

- **Pourquoi n permis et pas 1, comme le proposaient les juges.** Avec un permis tous les 4 jours travaillés, 1 permis par niveau viderait les 18 niveaux en 12 semaines environ (calcul). Avec n permis, il en faut environ 21 à 24 à 6 ou 7 jours travaillés par semaine, moins les permis de migration, de rang et de saison. Et un quartier en retard est toujours le moins cher à monter.
- **Ordre de grandeur (calcul à partir des gains rapportés par la conception 1, formule d'exemple de todo.md:236).**
  - À 2,5 quêtes par jour : environ +72 Énergie et +73 Matériaux par semaine. Les travaux des 18 niveaux représentent 15 à 20 semaines de gains : permis et travaux freinent à peu près au même rythme.
  - À une quête par jour : +46 Énergie et +29 Matériaux par semaine. Ce sont les Matériaux qui limitent (environ 50 semaines), sans jamais bloquer le joueur.
- Pas de Nourriture dans le prix : elle ferait concurrence à l'accueil d'une famille.
- Un prix ne change jamais selon l'allure (bible §9, ligne 172).

### 4. Effets des niveaux 1 à 3 (proposé ; chaque réglage existe déjà dans le code, lu)

Règles :
- Un quartier agit sur un seul réglage.
- Aucun effet ne produit d'Énergie ni de Matériaux.
- Un niveau ne change jamais ce que rapporte une tâche.
- Aucun nouvel emplacement sur l'île (layout.js:107-115 ne change pas).

| Quartier (domaine) | Réglage, lu | N1 | N2 | N3 |
|---|---|---|---|---|
| Champs (Terrain) | Nourriture par récolte **du potager** : 4 (batiments.js:36, utilisé en :236 et :240). Le potager dort de novembre à avril (:80) | 5 « Compost » | 6 « Rangs serrés » | 7 « Terre noire » |
| Atelier (Maison) | Nourriture par récolte **de la petite serre** : 4 (même constante). La serre demande l'atelier (:25) et se trouve dans ce quartier (vérifié) | 5 « Tablettes de culture » | 6 « Double paroi » | 7 « Lampes de culture » |
| Garage (Véhicule) | Jours travaillés avant qu'une culture soit mûre, au potager comme à la serre : 5 (:36, :116-117) | 4 « Motoculteur » | 3 « Tracteur » | « Tournée d'hiver » : de novembre à avril, le premier gain de chaque jour travaillé rapporte +1 Nourriture, jamais au-delà du stockage |
| École (Enfants) | Places par chalet : 2 (:22, :70) | 3 (9 places) « Classe ouverte » | 4 (12) « Cantine » | 5 (15) « Terrain de jeu » |
| Mairie (Administratif) | Nourriture pour accueillir une famille : 18 (:44, :169, :252, :255) | 15 « Formulaire d'une page » | 12 « Comité d'accueil » | 9 « Annonce dans les journaux du Sud » |
| Place (sans domaine) | Nourriture gardée : 20, plus 40 par grenier (:41-42, :76) | +20 « Caveau » | +40 « Chambre froide » | +60 « Entrepôt communal » |

Précisions :
- **Garage N3.** On ne descend jamais à 2 jours : la production serait multipliée par 2,5 et il y aurait deux fois plus de semis et de récoltes à toucher. La tournée d'hiver est le **seul mécanisme neuf** du lot. Elle reprend le modèle de l'éolienne : clé `prod:garage:{jour}`, reprise au Remballer si le jour reste sans quête payée (lu : batiments.js:282-305, quests.js:238 et :443). Si on veut couper, c'est ce niveau qu'on reporte, et la fiche du Garage dit alors « Le plus haut pour l'instant. »
- **Équilibre (calcul).** L'hiver, avec la serre seule : Garage N1 donne 4 Nourriture en 4 jours, Atelier N1 donne 5 en 5 jours. Les deux font 1 Nourriture par jour travaillé. Aucun premier choix ne s'impose.
- **Effet qui dort.** On peut acheter un effet qui ne sert pas encore : Champs l'hiver, Atelier sans serre. La fiche le dit (voir §7).
- **Objectif d'automne.** `ATTEINT.grenier` compare la Nourriture au stockage total (lu : objectifs.js:54, et `max` en :118). Avec la Place, l'objectif deviendrait plus dur. Il faut le comparer au **stockage de base** (20 + 40 par grenier).

### 5. Au-delà du niveau 3 (proposé)
- Rien n'est vendu tant que l'effet n'est pas codé. La fiche affiche « Niveau 3 : le plus haut pour l'instant. »
- Pistes pour les niveaux suivants :
  - Champs et Atelier : +1 Nourriture par récolte ;
  - Place : +20 de stockage ;
  - Garage : le camion de ravitaillement, qui change des Matériaux et de l'Énergie en Nourriture ;
  - effets promis par la bible, quand leurs systèmes existeront : l'Atelier qui répare moins cher (§4, ligne 72), le chasse-neige du Garage (ligne 96), un visiteur de plus pour la Place (§7), une alerte annoncée plus tôt pour la Mairie.
- Plus tard viendront les grands chantiers (§9, ligne 169).
- Les niveaux 4 et suivants doivent être prêts avant que le premier quartier atteigne le niveau 3 partout, soit environ 20 semaines au rythme régulier (calcul).

### 6. Règles d'achat (proposé)

Ordre des refus, avec la phrase écrite par le cœur :
1. Quartier inconnu.
2. « Après tes premiers pas. » Tant que les cinq premiers pas ne sont pas faits (lu : `etatPremiersPas`, objectifs.js:69-73).
3. « Niveau 3 : le plus haut pour l'instant. »
4. « Déjà fait. » Le geste porte le niveau visé (`{ quartier, niveau }`) : un double toucher ou un geste rejoué hors ligne est refusé. Aujourd'hui, aucune protection n'existe : main.js:434-440 n'a pas de garde, et main.js:285 concerne le clavier.
5. Ce qui manque, en une phrase : « Il manque 1 permis et 12 Matériaux. » On élargit `manque()` (lu : batiments.js:122-129).

Geste `monterQuartier(tasks, game, ledger, { quartier, niveau }, now)`, sur le modèle de `construire` (lu : batiments.js:184-208) :
- il retire les permis et paie les travaux ;
- il fait `niveaux[q] += 1` ;
- il émet un événement `{ type: 'quartier-monte', quartier, niveau, cout }` ;
- il appelle `suivreObjectifs(ctx)` ;
- il n'écrit **rien au registre** ni dans les tâches.

### 7. Interface (proposé, à passer par /impeccable avant de coder)

**La fiche du quartier à 390 px.** C'est une feuille qui monte du bas, sur le gabarit de la fiche d'un bâtiment (lu : ui/batiment.js:91-124). De haut en bas :
1. Pictogramme et « Champs », puis la ligne « Quartier · quêtes Terrain · niveau 1 ».
2. « Ce qu'il fait » : « Chaque récolte du potager donne 5 Nourriture (4 au départ). » Au niveau 0 : « Rien encore. »
3. « Maintenant », seulement si c'est utile : « Le potager dort jusqu'en mai : l'effet attend le printemps. », ou « Pas encore de petite serre : ce niveau servira quand elle sera bâtie. »
4. « Niveau 2 » : l'effet en une phrase.
5. « Prix » : « 2 permis, 60 Énergie et 80 Matériaux. » Juste dessous : « Tu as 1 permis. Le prochain : encore 2 jours travaillés. » Pas de rappel, pas de compte à rebours.
6. Le refus, s'il y en a un : cadenas et phrase du cœur.
7. Un bouton pleine largeur d'au moins 44 px : « Monter au niveau 2 ». S'il est impossible, il reste visible mais à plat, avec un cadenas. Il est marqué inactif pour le lecteur d'écran, qui lit aussi la raison qui lui est reliée (même façon que batiment.js:97-104).
8. Un bouton discret « Voir les quêtes Terrain (14) » : c'est l'ancien filtre, et le compte vient de `game.quartiers`.

Au niveau le plus haut, on remplace le bouton par la phrase « Niveau 3 : le plus haut pour l'instant. »

**Les gestes :**
- Toucher la zone ou la plaque d'un quartier ouvre sa fiche. Aujourd'hui, ce toucher filtre la liste (lu : main.js:293-305, appel en :304). Le filtre reste dans les puces de la liste.
- La « Carte en liste », rangée dans un menu (décidé), ouvre la même fiche. Aujourd'hui, elle a les boutons « Voir » et « Quêtes » (lu : plan.js:53-75, main.js:562-566).
- Le catalogue « Construire » (décidé) a une section « Quartiers » : six lignes de 44 px avec le pictogramme, le nom, le niveau, l'effet suivant et le prix. Chaque ligne ouvre la fiche.

**Après l'achat :**
- la fiche se met à jour sur place et le clavier reste sur le bouton (comme `fill()`, batiment.js:126-139) ;
- le bouton ignore les touchers pendant environ 800 ms ;
- `batimentSay` (lu : main.js:175-186) dit « Champs : niveau 2. 6 Nourriture par récolte du potager. » ;
- Fanal dit une ligne (speech.js:12, à rebrancher) ;
- l'île rejoue la montée de niveau (lu : moments.js:106-110 et :216 ; ajouter le nouvel événement à la liste de moments.js:233).

**La plaque sur l'île :**
- Elle affiche « Champs · niv. 2 », **sans barre**. Aujourd'hui, la barre compte les tâches (lu : world.js:285-320, view.js:17-32). Une barre vers le prix ferait monter les six plaques ensemble.
- Quand un niveau peut s'acheter tout de suite, une flèche vers le haut apparaît, et le lecteur d'écran lit : « Champs : niveau 2. Niveau 3 possible. »
- Sur téléphone, la plaque d'un autre quartier se replie en pictogramme seul (lu : world.css:396-399, fichier `css/world.css`). Le signal est alors une pastille sur le pictogramme. La plaque fait au moins 44 px d'après le CSS (lu : world.css:335-336), mais je ne l'ai pas mesurée à l'écran.

**Ailleurs :**
- La barre du haut garde ses quatre compteurs.
- Les permis s'affichent par une pastille chiffrée sur « Construire », que le lecteur d'écran lit « Construire, 2 permis à placer », dans l'en-tête du catalogue et sur chaque fiche.
- Annonce d'une quête payée : la fin « → Champs » reste (lu : announce.js:73). On ajoute « +1 permis » quand il tombe.
- On retire le traitement de `quartier-niveau` dans announce.js:15, 27 et 72 : l'événement n'est plus émis.

**Lignes de Fanal (proposées) :**

| Moment | Réplique |
|---|---|
| Permis gagné | « Quatre jours de travail. La Mairie a tamponné un permis. » |
| Rang | « Hameau. Ça vaut un permis. Et un tampon. » |
| Champs N1 | « Du compost. Ça sent fort et ça pousse fort. » |
| Atelier N1 | « Des tablettes dans la serre. Les laitues ont pris de l'altitude. » |
| Garage N1 | « Le motoculteur repart. Les semis n'ont plus d'excuse. » |
| École N1 | « Une classe de plus. Les familles avec enfants lisent nos annonces. » |
| Mairie N1 | « Le formulaire d'accueil tient sur une page. Recto. » |
| Place N1 | « Un caveau sous la Place. Les patates approuvent. » |

### 8. Migration (proposé)

**Ce qui existe (lu) :**
- `game.quartiers` compte les tâches payées par quartier (state.js:26, economy.js:20-24).
- Une partie v1 est recomptée depuis le registre, avec les tâches terminées avant l'app (state.js:92, :97-115).

**Ce qu'on fait :**
1. `game.quartiers` reste tel quel et continue de compter. On retire seulement l'annonce de niveau (economy.js:25-26, et l'import en :6). Le compte sert à la mémoire de la fiche et au bouton « Voir les quêtes ».
2. **Branche v2** (state.js:80-86) : on teste `!isObj(raw.niveaux)` **avant** la fusion de la ligne 83, parce que la fusion ajouterait le champ. Si le champ manque : `niveaux` à zéro, et `permis = { dispo: Σ niveauQuartier(quartiers[q]).niveau, depuis: jour de conversion }`. `niveauQuartier` (village.js:47-55) ne sert plus qu'ici. On note `permis.cadeau` pour la lettre.
3. **Branche v1** (state.js:87-94) : même calcul, juste après le recompte de la ligne 92.
4. Les rangs déjà atteints ne donnent rien de plus : le permis de rang ne tombe qu'au passage d'un palier.
5. **Ne pas toucher `STATE_VERSION`** (lu : state.js:7). Une partie v2 ne passerait plus le test de la ligne 80, prendrait le chemin v1, et celui-ci efface `resources` (V1_KEYS en :63-64, puis :87-88) : elle perdrait son stock.
6. Monter la version d'app de 2 à 3 : `CLIENT_VERSION` (lu : js/api-client.js:52) et `MIN_CLIENT` (lu : api/api.php:26, contrôlé en :662). Sinon, un onglet resté ouvert sur l'ancienne règle pourrait réécrire une partie sans niveaux, qui serait reconvertie : permis offerts deux fois, niveaux perdus. Monter aussi la version du cache (lu : sw.js:5).
7. **Rien n'est écrit dans tasks.json, et le registre n'est jamais réécrit.** La conversion vit dans l'état du jeu. Côté serveur, il n'y a rien à changer : l'API ne contrôle que la clé et la taille des entrées (lu : api.php:517-525) et accepte l'état entier (:526-531).
8. Lettre de Fanal, montrée une fois (game.letters, state.js:34) : « Les quartiers ne montent plus tout seuls. Tes {n} niveaux sont devenus {n} permis. Place-les où tu veux. » Si n vaut 0 : « Les quartiers ne montent plus tout seuls. Tous les quatre jours de travail, la Mairie tamponne un permis. À toi de choisir où il va. »
9. **Production** : d'après le serveur au 5 octobre, 12 tâches étaient terminées (rapporté : todo.md:69). Avec l'ancienne règle, ça fait au plus 2 permis à cette date (calcul). Le vrai nombre dépendra du recompte le jour de la bascule. Je n'ai lu aucune donnée de production.
10. **Essai** : même règle. Autre choix, si Alex le préfère : remettre l'essai à zéro côté serveur (todo.md:194).

### 9. Fichiers à toucher (lu, lignes citées)

**Cœur**
- Nouveau `core/quartiers.js`, exporté par `core/index.js` : table des effets, `coutNiveau(n)`, `niveauDe`, `valeur(game, réglage)`, `refusMonter`, `monterQuartier`, `suivrePermis`, `progressionPermis`.
- `core/batiments.js` : brancher les lectures sur les niveaux.
  - Récolte selon le lieu : :236, :240.
  - Jours de pousse : :116-117.
  - Places par chalet : :70.
  - Stockage : :76.
  - Prix de l'accueil : :169, :252, :255.
  - `manque()` avec les permis : :122-129.
  - Permis de rang : :256-257.
  - Tournée d'hiver : à côté de `produireEolienne` et `reprendreEolienne`, :282-305.
- `core/economy.js:19` (ajouter les permis) et :25-26 (retirer l'annonce).
- `core/quests.js:238` (`suivrePermis` et la tournée) et :443 (reprise de la tournée).
- `core/objectifs.js:34` et :182 (permis de saison) ; :54 et :118 (stockage de base).
- `core/state.js:19-38` (nouveaux champs) et :79-95 (conversion).
- `core/village.js:15-17` et :41-55 : ne servent plus qu'à la migration.

**Interface et carte**
- `js/store.js:17` : l'action `monterQuartier`.
- `js/main.js` : :161 (`BAT_ACTIONS`), :175-186 (phrase de l'achat), :300-305 (toucher un quartier), :562-566 (Carte en liste).
- Nouveau `js/ui/quartier.js`, calqué sur `js/ui/batiment.js`, et sa feuille dans `index.html` (à côté de `#dlg-batiment`, :273).
- `js/ui/batiment.js` : :6, :26-29 (`occupantsDe`), :47-50, :70, :76. Ces lignes doivent afficher les vraies valeurs.
- `world/view.js:4` et :17-32 ; `world/world.js:285-320` ; `world/plan.js:43-51` ; `world/moments.js:216` et :233 ; `world/demo.js:7`, :50 et :128-131.
- `js/ui/announce.js:9-27` et :71-73 ; `js/ui/speech.js:12`.
- Textes : `content/fr-CA/interface.json:364-370` et :388 (textes de niveau au nombre de tâches), `batiments.json`, `repliques.json`. Il y aura environ 70 clés.

**Version et cache**
- `js/api-client.js:52`, `api/api.php:26`, `sw.js:5`.

**Taille estimée (proposé)** : environ 250 lignes dans le cœur, 250 dans l'interface, 80 de textes, 400 de tests.

### 10. Tests à écrire d'abord (et à voir échouer)

**Nouveau `tests/core/quartiers.test.mjs` :**

Permis :
- rien au 3e jour travaillé, 1 au 4e ;
- une journée à 5 quêtes compte comme une journée à 1 ;
- un jour entièrement remballé ne compte pas ;
- Remballer après un permis ne le reprend pas ;
- rejouer ne paie pas deux fois ;
- un permis par palier de rang, un seul ;
- +1 avec l'objectif de saison ;
- une étape cochée seule ne fait pas un jour travaillé.

Refus, chacun avec sa phrase : avant les premiers pas, au niveau le plus haut, niveau visé périmé, « Il manque 1 permis. », « Il manque 12 Matériaux. », et un manque combiné.

Achat :
- le prix exact est retiré ;
- le niveau monte de 1 et l'événement sort ;
- registre et tâches restent identiques ;
- une quête payée ne change jamais un niveau.

Un effet par niveau :
- Champs 1 donne 5 au potager mais 4 à la serre ;
- Atelier 1 donne 5 à la serre ;
- Garage 1 et 2 font mûrir en 4 puis 3 jours ;
- Garage 3 : +1 Nourriture de novembre à avril seulement, jamais au-delà du stockage, reprise au Remballer ;
- École : 3, 4 puis 5 places par chalet, et un chalet bâti après l'achat a déjà ses places ;
- Mairie : accueil à 15, 12 puis 9 ;
- Place : stockage à 40, 60 puis 80.

Objectif d'automne : il ne change pas quand la Place monte.

**Équité :**
- même nombre de jours et même effort, tout en Maison ou réparti sur cinq domaines : mêmes permis, mêmes ressources ;
- un hiver sans quête Terrain ne change rien aux permis.

**Migration (`ledger-economy-state.test.mjs` et scénario de passage v2) :**
- une partie v2 sans niveaux reçoit Σ anciens niveaux en permis, garde ses quartiers et **garde son stock** ;
- un 2e passage ne change rien ;
- même chose pour une partie v1 ;
- `tasks.json` identique à l'octet ;
- l'ancienne app (version 2) est refusée.

**À réécrire :**
- `tests/core/village.test.mjs:36-48` ;
- `tests/core/ledger-economy-state.test.mjs:197-216` ;
- `tests/core/quests.test.mjs:285-289` ;
- `tests/e2e/ui-12-monde.cjs:64` et :88 ;
- `tests/e2e/world-s3.cjs:138`, :177 et :184 ;
- `tests/core/simulation.test.mjs:38` et :115 (les places par chalet varient).

**Nouveau scénario navigateur aux trois largeurs** :
- toucher la plaque, lire la fiche, voir le refus avec cadenas, monter, voir l'annonce et la plaque mise à jour ;
- refaire le chemin au clavier par « Construire » et par la Carte en liste ;
- cibles d'au moins 44 px, pas de défilement horizontal à 390 px.

### 11. Simulation : points à vérifier (`simulation.test.mjs`)

Le joueur simulé fait d'abord ses premiers pas et ses bâtiments, puis il achète le niveau le moins cher qu'il peut payer.

- **Doivent rester vrais :** (a) le Hameau entre les jours 17 et 25 ; (b) aucune impasse d'hiver pour un départ le 25 octobre ; (c) jamais de stock négatif, jamais plus de Nourriture que le stockage ; (d) la première famille entre les jours 5 et 7.
- **Cibles proposées :**
  - permis : entre 1,4 et 1,8 par semaine à 6 ou 7 jours travaillés, et environ 0,9 à un jour sur deux ;
  - premier niveau acheté entre les jours 7 et 14 au rythme régulier, pour un départ le 1er juin comme le 25 octobre, et avant le jour 30 à une quête par jour ;
  - pas les 18 niveaux avant la semaine 16 au rythme régulier ;
  - à la semaine 16, le stock de Matériaux est nettement plus bas qu'une partie sans niveaux.
- **Départ le 25 octobre**, qui est le cas réel d'Alex. Le village est plein au jour 98 avec les règles actuelles (vérifié). Il faut vérifier que les choix tournés vers la Nourriture (Atelier, Garage) rapprochent cette date. La conception 3 rapporte le 11 décembre au lieu du 2 février sur son prototype.
- **Réglages :** `ECHELLE` et le seuil de 4 jours se règlent **après** avoir codé « l'effort paie ».

### 12. Bible et documents à réécrire (avec l'accord d'Alex)
- **§4 « Les deux progressions »** (BIBLE-JEU.md:44-72), lignes 61 et 72 : les quartiers montent par permis, au choix du joueur, avec la table des effets.
- **§6, ligne 111** : « un plan de bâtiment » devient « un permis ».
- **§7, lignes 117 et 121** : les visiteurs et la scientifique donnent des permis, au plus 1 par visiteur.
- **§9, ligne 170** : les « améliorations de bâtiments » du plein régime sont fondues dans les niveaux de quartier. Ligne 172 : ajouter « ni le prix d'un niveau ».
- **§12, ligne 221** : la vérification des chroniques d'Hermes limite les permis distribués.
- **§13, ligne 248** : « quartiers qui progressent au nombre de tâches » devient « au choix du joueur ».
- **§15** : ajouter la décision.
- Hors bible : `PRODUCT.md`, `app/ARCHITECTURE.md`, et `tasks/todo.md:169` à corriger (village plein le 30 janvier, pas fin novembre, vérifié).

### 13. Risques et points ouverts
1. **Le nom.** « Permis » est aussi le permis de conduire, déjà mot-clé de l'ancre « passeport » de la Mairie (lu : content/fr-CA/ancres.json:29). Il n'y a pas de conflit dans le code, seulement un double sens. C'est à Alex de trancher.
2. **Deux « Atelier »** : le quartier (lu : core/domains.js:27) et le bâtiment (batiments.js:24). Plus tard, il y aura aussi un bâtiment « école » au Bourg (bible, ligne 94). Les sous-titres « Quartier » et « Bâtiment » sur les fiches sont à faire valider par /impeccable.
3. **Le Bourg sans contenu.** École N2 donne 12 places, assez pour le Bourg (11 habitants, village.js:10), qui n'ouvre encore rien. Le Village non plus n'ouvre rien aujourd'hui : le catalogue s'arrête au hameau (lu : batiments.js:22-28). C'est accepté ; à caler avec les semaines 9 à 12 du plan (§14).
4. **Permis qui s'accumulent après les 18 niveaux** (environ 20 à 24 semaines au rythme régulier, calcul). Il faudra alors les niveaux 4 et suivants, puis les grands chantiers. La pastille « 2 permis à placer » ne doit jamais devenir un rappel.
5. **Petite fuite acceptée.** Remballer après un permis ou un achat laisse le permis et le niveau : la reprise ne fait jamais passer un stock sous zéro (lu : economy.js:17-18). C'est borné à un jour par permis, comme pour « Construire » aujourd'hui.
6. **Pause de plus de 60 jours.** Les jours travaillés d'avant la pause qui n'ont pas encore donné de permis peuvent se perdre, puisque le registre complet couvre 60 jours (lu : api.php:13). On parle de 3 jours au plus.
7. **Le compte des jours incite un peu à travailler chaque jour.** Cette incitation existe déjà pour l'éolienne et les cultures. Mais il n'y a ni échéance ni perte.
8. **Mes chiffres ne sont pas des mesures.** Les rythmes et les prix ci-dessus sont des calculs ou viennent des prototypes des conceptions (rapporté), avec des quêtes fictives. Les vraies tâches d'Alex donneront d'autres rythmes.
## Écarts de la mise en œuvre (lot R, 6 octobre 2026)

Ce que le code fait autrement que la spécification ci-dessus, lu dans `app/` à la fusion c232ca3. Les sections plus haut ne sont pas modifiées : elles restent la proposition validée.

- **Prix par niveau : 75 Énergie et 100 Matériaux, pas 30 et 40** (contredit :16, :83, :87-89). `ECHELLE` vaut 25 et non 10 : le niveau n coûte n permis, n × 75 Énergie et n × 100 Matériaux, soit 150 et 200 au niveau 2 (`core/quartiers.js`). La spec laissait la valeur à la simulation (:83), qui l'a réglée (`tests/core/simulation.test.mjs`).
- **Garage plafonné au niveau 2** (contredit :112, :118, :276, et le compte de 18 niveaux en :91, :93, :315, :334). `EFFETS_QUARTIERS.garage` n'a que deux valeurs (4 puis 3 jours de pousse) : la tournée d'hiver du niveau 3 est reportée, donc aucune clé `prod:garage:{jour}`. La fiche dit « Niveau 2 : le plus haut pour l'instant. » Il y a 17 niveaux à acheter, et non 18. La spec prévoyait elle-même cette coupe (:118).
- **« Ce qu'il fait » : une phrase d'effet courte, sans le mot « Chaque »** (contredit :153). La fiche écrit « 5 Nourriture par récolte du potager (4 au départ). » et non « Chaque récolte du potager donne 5 Nourriture (4 au départ). » Le même texte (`quartier.effet.*`) sert à la fiche, au catalogue et à la phrase lue après l'achat.
- **Prix de la fiche : les chiffres de l'échelle 25** (contredit :156, qui cite « 2 permis, 60 Énergie et 80 Matériaux »). Même cause que le premier point : la fiche écrit « 2 permis, 150 Énergie et 200 Matériaux. » La phrase sur les permis en main et le prochain permis est conforme.
- **« Voir les quêtes » compte les quêtes à faire du quartier, pas `game.quartiers`** (contredit :159 et :206). Le compte annonce ce que la liste filtrée va montrer (`quetesDe`, `js/ui/quartier.js`). `game.quartiers` continue d'être compté (`core/economy.js`) mais n'est plus lu que par la conversion des anciennes parties (`core/state.js`), et non pour la fiche.
- **Un toucher sur un repère de quartier ou sur Fanal ouvre aussi la fiche** (précise :164, qui ne parle que de la zone et de la plaque). Fanal ouvre la fiche de la Place (`onWorldSelect`, `js/main.js`). Le toucher sur une plaque ouvre bien la fiche et ne filtre plus la liste, comme le prévoyait :164 ; le filtre passe par « Voir les quêtes ».
- **Carte en liste : « Ouvrir la fiche » remplace « Ses quêtes »** (précise :165). Chaque quartier a « Ouvrir la fiche » et « Voir sur la carte » ; il n'y a plus de bouton qui filtre la liste directement, il faut passer par la fiche (un toucher de plus). La liste dit le niveau acheté et les quêtes à faire de chaque quartier.
- **Signal « niveau possible » sur la plaque : reporté** (contredit :177 et la pastille de plaque repliée en :178). La plaque lit « Champs : niveau 2. » sans flèche ni phrase de plus. Raison notée dans `tasks/todo.md:329` : la pastille des permis sur « Construire » mène à la section Quartiers, qui montre le prix et ce qui manque.
- **Lettre de conversion : elle remplace la lettre du matin ce jour-là** (ajoute à l'étape 8, :213). Même règle que la lettre de passage : la lettre de conversion en tient lieu le jour où elle est montrée (`welcome()`, `js/ui/story.js`). Le texte a de plus une forme pour exactement un permis (« Ton niveau est devenu un permis. »), que la spec ne prévoyait pas ; elle n'avait que n et zéro.
- **Une partie v1 n'a pas de lettre de conversion** (précise :208 et :213). La lettre ne vient qu'aux parties qui portent `permis.cadeau`, donc aux parties v2 d'avant les permis. Une partie v1 reçoit ses permis, mais elle n'a jamais vu de niveaux : sa lettre de passage parle des permis (`core/state.js`, `content/fr-CA/lettres.json`).
- **Un refus de plus à l'achat : « Il faut d'abord le niveau n. »** (ajoute à la liste de :135-140). Il vient entre « Déjà fait. » et ce qui manque, quand le niveau visé saute un niveau (`refusMonter`).
- **Simulation (a) : le Hameau entre les jours 15 et 25 avec les niveaux** (contredit :311). (a) se mesure sans niveaux, entre 17 et 25. Avec les niveaux, une récolte de 5 au lieu de 4 avance la troisième famille de 2 jours : le Hameau passe du jour 18 au jour 16, quelle que soit `ECHELLE` de 10 à 40. La cible (a′) a été élargie à 15-25 (commentaire de `tests/core/simulation.test.mjs`).
