# Cinq directions de jeu

Chaque direction a été conçue indépendamment, puis notée par trois jurés (usage réel, game design, faisabilité). Voir RECOMMANDATION.md pour la synthèse.

| Direction | Usage réel | Game design | Faisabilité | Moyenne |
|---|---|---|---|---|
| A-restauration · Restauration de l'Orée — « La lisière rallumée » | 81 | 74 | 48 | 68 |
| B-village-commandes · Le Comptoir de l'Orée — un village à rebâtir, commande par commande | 70 | 69 | 58 | 66 |
| C-compagnon-expeditions · Fanal et la Galerie des lisières | 77 | 73 | 71 | 74 |
| D-bastion-saisons · Bastion des saisons : tenir jusqu'aux sucres | 76 | 79 | 50 | 68 |
| E-foyer-miroir · Le foyer miroir : la maquette qui se souvient | 80 | 77 | 55 | 71 |

## A-restauration · Restauration de l'Orée — « La lisière rallumée »

### Pitch

Chaque vraie tâche terminée chez toi traverse la lisière en fil de lumière et rend sa couleur à un coin de l'Orée, une vallée agro-futuriste en voxels éteinte par la cendre : la maison ravive l'Atelier, l'administratif rallume les Archives, les enfants réchauffent la Maison commune. Secteur par secteur, tu répares, fais prospérer puis rends autonome une colonie habitée, au rythme du vrai calendrier québécois, d'octobre au temps des sucres. Le Fil du jour te montre en deux secondes quoi faire maintenant, et l'Orée te montre ce que ça a changé.

### Fantaisie

Tu es Alex, 7e intendant de continuité de l'Orée. C'est une vallée agro-futuriste en voxels qu'une pluie de cendre a figée en gris il y a 184 cycles. Les Veilleurs, bâtisseurs disparus, ont fait du Bastion des lisières un RELAIS : chaque geste de soin accompli dans ton vrai foyer traverse la lisière sous forme de fil de lumière et ravive un coin du monde. Tu ne « gagnes » pas des points, tu vois ce que ton geste a changé. Laver le frigo réveille l'Atelier de Milo. Renouveler l'immatriculation dégage la route d'Ambroise. Signer l'agenda d'école réchauffe la Maison commune où Lou fait ses devoirs.

CE QUE LE JOUEUR RESSENT, DANS L'ORDRE
1. Soulagement concret. La cendre recule sous tes yeux, case par case. La causalité est immédiate et géographique : ta tâche Maison ravive l'Atelier, pas « un compteur ».
2. Compétence calme. La meilleure prochaine action est toujours là, en 2 secondes, avec son « pourquoi » chiffré.
3. Appartenance. Solène, Milo, Naïma, Lou et Ambroise remarquent ta PRÉSENCE, jamais ton volume. La Confiance compte les jours où tu es venu, pas la quantité.
4. Fierté durable. Chaque grand chantier réel (longueur ≥ 6) devient un bâtiment permanent avec une plaque datée, par exemple « Fenêtres du sous-sol calfeutrées — 21 nov. 2026 ». En fin de saison, l'Orée est une carte de ce que tu as vraiment accompli.
5. Curiosité. ÉCHO-7, la mémoire des Archives, te vouvoie et reste la dernière chose grise du monde. Il distille 6 révélations sur les six intendants d'avant.
6. Sérénité. Chaque journée a une fin explicite : « L'Orée veille. Va te reposer. » L'Orée n'exige rien, elle répond.

TRIADE TERRA NIL APPLIQUÉE À CHAQUE SECTEUR
- RÉPARER : le gris devient couleur, de façon permanente et jamais perdue.
- FAIRE PROSPÉRER : bâtiments, cultures en temps réel, production.
- RENDRE AUTONOME : le secteur se défend seul et n'a plus besoin de toi. C'est la vraie victoire d'un intendant, et la finale de la saison.

MIROIR SANS JUGEMENT
Un coup d'œil à la carte montre l'équilibre de ta vie. Le Relais du convoi encore gris veut dire que l'auto attend, sans un seul mot de reproche. Toucher un secteur gris ouvre la liste des vraies quêtes qui le raviveraient.

### Boucles

10 SECONDES — « Le geste »
- À l'ouverture, le Fil du jour est une carte en bas, de 88 px quand elle est repliée. Elle montre la quête n° 1 avec :
  - le titre sur 2 lignes ;
  - la durée estimée, déduite de la Longueur : L1 ≈ 5 min, L2 ≈ 15 min, L3 ≈ 30 min, L4 ≈ 45 min, L5 ≈ 1 h, L6-7 ≈ 2-3 h, L8+ ≈ une demi-journée ou plus ;
  - le domaine (icône du secteur), l'échéance et la Cote ;
  - deux boutons de 44 px, « Fait ✓ » et « J'y vais ».
- Sur « Fait ✓ » :
  - un fil de lumière part de la carte vers le secteur (900 ms) ;
  - à l'impact, la prochaine case germe ou bascule en couleur ;
  - les compteurs montent à l'ARRIVÉE des particules ;
  - le personnage du domaine dit une ligne.
- Toucher l'écran saute l'animation, qui se réduit alors à 150 ms.
- Micro-gestes facultatifs :
  - glisser le doigt sur les parcelles mûres pour récolter (3 s) ;
  - toucher 1 à 5 « cendrillons » sur les chemins. Ce sont de petits amas de cendre apparus pendant l'absence, purement cosmétiques, avec parfois une trouvaille (décor, page de registre).

2 MINUTES — « L'intendance »
- Onglet Quêtes :
  - ajouter une quête (un champ et 5 rangées de puces) ;
  - trier et filtrer (« 15 min », « Peu d'énergie », « Cette semaine », domaine) ;
  - découper un grand chantier en étapes.
- Dans l'Orée, dépenser l'Énergie et les Matériaux :
  - réparer ou améliorer un bâtiment (20 à 160 ▣) ;
  - semer (2 à 4 ⚡) ;
  - répondre à un incident (4 options) ;
  - poser des décorations (3 à 25 ▣) ;
  - remplir une case du Lot de la semaine.
- Lire la lettre du jour (120 mots maximum).

1 JOURNÉE — « Lever, lisière, veille » (le jour de l'Orée va de 4 h à 3 h 59, heure de Montréal)
- Matin : le Journal du matin, une seule carte. Elle montre la météo de l'Orée calée sur la vraie date, la récolte prête, l'incident éventuel et 3 recommandations.
- Première quête du jour : la lisière s'allume. +1 Confiance, au maximum 1 par jour.
- Histoire : 1 à 3 « beats » au maximum par jour (dialogue, lettre, révélation).
- Cultures en heures réelles : courges 6 h, patates 12 h, blé d'hiver 24 h. Elles donnent une raison douce de revenir le midi ou le soir. Elles ne pourrissent jamais : elles attendent.
- Fin explicite : quand les beats sont épuisés et après 19 h, les lanternes s'allument et la carte « L'Orée veille » ferme la journée. Les quêtes restent faisables et rapportent toujours. Seule l'histoire attend le lendemain.

1 SEMAINE — « Nouveau départ du lundi »
- Lundi : Naïma propose le Plan de la semaine.
  - Jusqu'à 3 engagements « Quand…, alors… » liés à de vraies quêtes.
  - Le Lot du Bastion : 3 cases mixtes, par exemple 3 courges + 20 ▣ + 1 vraie quête Terrain. Il donne une décoration unique et une lettre, et reste ouvert 14 jours.
- Vendredi, dès le chapitre 5 : le convoi d'Ambroise arrive au Relais avec lettres, colis décoratif et nouvelles commandes.
- Dimanche soir : le Bilan de Naïma, avec les quêtes par domaine, les cases ravivées et les chantiers avancés.
- « Semaine tenue » si au moins 4 jours sur 7 ont eu une quête : +1 Confiance.
  - Le compteur est CUMULATIF sur la saison (« 9 semaines tenues »). Il n'y a jamais de série consécutive.
  - « Mode relâche » : jusqu'à 14 jours par saison déclarés en congé. Ces jours sont neutres et les incidents restent gelés.

1 SAISON — « La lisière rallumée » (octobre → février, environ 16 semaines)
- 8 chapitres et 6 secteurs. Chaque secteur passe par Réparer → Prospérer → Autonome.
  - Chapitres 1 à 5 : un nouveau secteur s'ouvre à chaque chapitre.
  - Chapitre 6 : relier les secteurs et prospérer (la veillée).
  - Chapitre 7 : défendre (la Poudrerie, 7 vrais jours).
  - Chapitre 8 : autonomie et finale.
- Une couche calendrier tourne indépendamment des chapitres :
  - gel d'octobre, érables rouges, Halloween ;
  - première neige le 15 novembre ;
  - Fêtes du 20 décembre au 6 janvier ;
  - grands froids, semaine de relâche.
- Fin de saison : l'Almanach rassemble les quêtes par domaine, les plaques de chantiers, les visiteurs et les lettres. Ensuite vient la Saison 2, « Le temps des sucres » (mars-avril), avec l'Érablière.

### Tâches → jeu

PRINCIPE : le RANG et la RÉCOMPENSE sont séparés. Le rang dit quoi faire maintenant. La récompense est proportionnelle à l'effort. Les deux sont affichés côte à côte, sans jamais les confondre.

1) RANG = « COTE », de 0 à 100. Ce mot remplace « score » pour ne pas confondre avec la Priorité.
Formule :
Cote = 4,5·P + 2·(11−L) + 1·(11−D) + U + A, bornée à 100.
- U (urgence d'échéance) :
  - 0 s'il n'y a pas d'échéance ou si elle tombe dans plus de 14 jours ;
  - sinon round(20·(14 − joursRestants)/14) ;
  - 25 si l'échéance est dépassée.
- A (ancienneté) = min(5, floor(âgeEnJours/14)).
- La quête « en cours » (après « J'y vais ») est épinglée au-dessus du classement.
Exemples :
- « Sortir le bac de recyclage », dû ce soir (P7 L1 D1) : 82.
- « Rendez-vous pneus d'hiver », échéance dans 8 jours (P9 L1 D2) : 79.
- « Signer l'agenda d'école » (P6 L1 D1) : 57.
- « Calfeutrer les fenêtres du sous-sol », ouverte depuis 21 jours (P7 L7 D5) : 47.
Bouton « Pourquoi? » : « Priorité 9 (+41) · courte (+20) · facile (+9) · échéance dans 8 jours (+9) ».

Le Fil du jour donne 3 recommandations :
- À FAIRE D'ABORD : la meilleure Cote.
- VICTOIRE RAPIDE : la meilleure Cote parmi L ≤ 3 et D ≤ 4, en excluant la première.
- GRAND CHANTIER : la plus haute Priorité parmi L ≥ 6, avec un bouton « Découper ».
Garde-fou contre les victoires faciles : si aucune quête de Priorité ≥ 8 n'est dans le top 3 alors qu'il en existe une, la meilleure prend la 3e place avec l'étiquette « Prioritaire ».
L'onglet Quêtes garde la parité avec l'app historique :
- tris par Cote, Priorité, Longueur, Difficulté, Échéance, Ancienneté et Domaine ;
- filtres statut, domaine, « 15 min » (L ≤ 2), « Peu d'énergie » (D ≤ 3), « Cette semaine » ;
- recherche texte.

2) RÉCOMPENSE = Points d'effort (PE). Unité interne, jamais affichée seule.
PE = (6·√L + 2 si D ≥ 7) × (0,8 + 0,04·P), arrondi.
- ×1,2 si la quête est finie avant l'échéance, à condition que l'échéance ait été posée au moins 48 h avant la complétion (on ne peut pas s'offrir le bonus en mettant l'échéance à aujourd'hui).
- +2 PE par tranche de 14 jours d'ancienneté, au maximum +6.
Exemples :
- P6 L1 D1 = 6 PE.
- P9 L1 D2 avant échéance = 8 PE.
- P7 L7 D5 = 17 PE.
- P2 L10 D2 = 17 PE.
- P10 L10 D10 = 25 PE.
La racine carrée rend la récompense concave : passer de L1 à L4 double le gain, mais l'heure de travail paie beaucoup moins sur les longues tâches. Gonfler la longueur rapporte peu.
Conversion :
- Énergie = round(0,6·PE) et Matériaux = round(0,4·PE).
- Lueur = 100 % des PE, envoyés au secteur du domaine.
Prévisualisation sur la carte : « → Atelier · +5 ⚡ +4 ▣ · la case 7 sera à 13/16 ».
Bonus « Bon fil » : terminer une quête du top 3 de Priorité ≥ 8 donne +2 ⚡, au maximum 1 fois par jour. Il aligne gentiment l'incitation sur le rang.

3) DOMAINE → SECTEUR (table modifiable dans Réglages > Secteurs)
| Domaine réel | Secteur | Personnage | Ouverture |
|---|---|---|---|
| Terrain, Jardin, Ferme | Champs | Solène | ch. 1 |
| Maison | Atelier | Milo | ch. 2 |
| Administratif, Professionnel | Archives | Naïma, ÉCHO-7 | ch. 3 |
| Enfants | Maison commune | Lou | ch. 4 |
| Véhicule | Relais du convoi | Milo, Ambroise | ch. 5 |
| Domaine inconnu ou vide | Place du Bastion | Solène | ch. 1 |
La Lueur d'un secteur pas encore ouvert n'est jamais perdue : elle s'accumule « sous la cendre », visible comme une fissure dorée. À l'ouverture, elle perce d'un coup. Exemple : « Les Archives gardaient 38 lueurs : 3 cases se rallument. »
Toucher un secteur ouvre l'inspecteur : restauration 7/12, prochaine case 11/16, Vitalité, bâtiments, et « 3 quêtes Maison ouvertes → Voir ».

4) ÉCHÉANCES
- Aux chapitres 1 à 4, Naïma s'en occupe. À partir du chapitre 5, Ambroise reprend le rôle.
- Une quête avec une échéance à 7 jours ou moins devient une caisse sur la route du Relais. L'onglet Journal montre un « Tableau des livraisons » sur 7 jours.
- Finie avant la date : ×1,2 et un tampon doré dans le registre.
- Dépassée :
  - la récompense n'est PAS réduite ;
  - la Cote reçoit +25 ;
  - la caisse se couvre d'une bâche grise ;
  - le poids d'incident du secteur reçoit +2 ;
  - Ambroise dit : « La caisse attend au bord du chemin. Quand tu pourras. »

5) SOUS-TÂCHES = « ÉTAPES » → CHANTIER
- Jusqu'à 12 étapes par quête.
- Partage de la récompense :
  - les étapes se partagent 40 % des PE de la quête, soit 40 %/n chacune, au minimum 1 ;
  - la complétion donne les 60 % restants.
  - Le total est identique à la quête non découpée : découper ne permet pas de farmer.
- Progrès doté : « Découper » ajoute une étape 0, « Plan du chantier », déjà cochée (0 PE).
- Pour L ≥ 6, un échafaudage voxel apparaît dans le secteur dès la 1re étape. Il monte par paliers de 25, 50, 75 et 100 %.
- À la complétion, l'échafaudage tombe et révèle un bâtiment-souvenir avec une plaque datée.

6) RÉCURRENCES
- Règles possibles :
  - quotidienne ;
  - hebdomadaire (jours choisis) ;
  - mensuelle (jour n) ;
  - « N jours après la dernière fois ».
- UNE seule occurrence vivante à la fois. Une occurrence manquée garde son échéance (U = 25) et ne s'empile jamais. « Passer cette fois » est sans pénalité.
- Terminer une occurrence génère la suivante selon la règle.
- La récompense suit la formule normale, avec une clé de registre par occurrence.

7) BONUS PLAFONNÉS HORS TÂCHES (plafond global : 8 ⚡ par jour)
- Ajouter une vraie quête complète (titre, domaine, P, L et D) : +1 ⚡, au maximum 2 par jour. Repris si la quête est supprimée dans les 24 h.
- Écrire un plan « Quand…, alors… » : +2 ⚡, au maximum 1 par jour.
- Plan honoré (la quête liée est faite le jour prévu) : +3 ⚡, au maximum 1 par jour.
- Panier du matin, à la première ouverture du jour de l'Orée : +2 ⚡.
- Retour après au moins 3 jours d'absence : une lettre et +10 ⚡, au maximum une fois par 14 jours. Ce bonus n'entre pas dans le plafond.

8) INTÉGRITÉ
- Évaluation figée : les P, L et D qui comptent pour la récompense sont figés au premier de ces trois moments :
  - « J'y vais » ;
  - la première étape cochée ;
  - 24 h après la création.
  Les éditions ultérieures changent la Cote, pas la récompense. Le message affiché : « La récompense reste celle du départ : 10 ⚡ 7 ▣ ».
- Quête créée et terminée en moins de 10 minutes (inscrite après coup) : 50 % des PE, et la lisière s'allume quand même.
- Réactiver une quête ne crée jamais de second gain. Message : « La lisière se souvient déjà de celle-là. »

### Économie

TROIS RESSOURCES (PRODUCT.md), PLUS DES ÉTATS DE SECTEUR QUI NE SONT PAS DES MONNAIES

- ÉNERGIE (⚡, ambre) : actions immédiates (semer, répondre, souffler).
  - Départ 10. Plafond 60, puis 100 (Réservoir niv. 2, 40 ▣), puis 150 (niv. 3, 90 ▣).
- MATÉRIAUX (▣, ocre) : construire, réparer, améliorer, décorer.
  - Départ 15. Plafond 150, puis 250 (Entrepôt niv. 2, 50 ▣), puis 400 (niv. 3, 110 ▣).
- CONFIANCE (lanterne) : ne se dépense jamais et ne se perd jamais. Départ 0, ce qui corrige le « 1 sans raison » du prototype 006.
  - +1 à la première quête de chaque jour de l'Orée.
  - +1 par Semaine tenue.
  - +2 par chapitre terminé.
  - C'est le verrou d'ouverture des chapitres : ch. 2 à 3, ch. 3 à 9, ch. 4 à 16, ch. 5 à 24, ch. 6 à 33, ch. 7 à 43, ch. 8 à 54.
  - Une durée minimale s'ajoute : 3 jours pour le ch. 1, puis 12 jours par chapitre. La finale ne peut pas arriver avant le jour 87. Le rythme typique est de 15 à 17 semaines.
- DÉBORDEMENT : au plafond, le surplus de ⚡ ou de ▣ devient de la Lueur pour la Place du Bastion, à raison de 2 pour 1. Rien ne se perd, rien ne s'empile à l'infini.
- RÉCOLTES (objets, garde-manger de 12, ou 24 avec le Cellier à 45 ▣). Elles servent uniquement aux Commandes, aux Lots et aux repas de veillée.

ÉTATS DE SECTEUR
- LUEUR / RESTAURATION, permanente : chaque PE d'une quête va en Lueur à son secteur.
  - Coût par case : 10 Lueur pour les cases 1 à 4, 16 pour les cases 5 à 8, 22 pour les cases 9 à 12, 28 pour les cases 13 à 16.
  - Taille des secteurs et coût total :

    | Secteur | Cases | Lueur totale |
    |---|---|---|
    | Champs | 16 | 304 |
    | Atelier | 12 | 192 |
    | Maison commune | 12 | 192 |
    | Relais du convoi | 12 | 192 |
    | Archives | 10 | 148 |
    | Place du Bastion | 12, dont 9 offertes à l'intro | 66 |

  - Total : environ 1 100 Lueur, pour environ 2 600 PE gagnés sur une saison typique. La restauration se termine vers les semaines 10 à 12, ce qui laisse la fin de saison à la prospérité, à la défense et à l'autonomie.
  - Chaque quête produit un changement visible. La prochaine case germe à 34 % (taches de couleur), puis à 67 % (touffes), puis bascule à 100 %.
  - Un secteur à 100 % verse sa Lueur dans un « éclat » cosmétique à 3 paliers (100, 250, 500) : fleurs, guirlandes, lumières.
  - « Souffler la cendre » : 8 ⚡ donnent +5 Lueur dans un secteur ouvert au choix, au maximum 3 fois par jour. C'est la voie de secours pour un domaine sans tâches.
- VITALITÉ, de 0 à 5, glissante :
  - +1 par quête du domaine, au maximum +2 par jour et par secteur ;
  - −1 tous les 3 jours sans quête dans le domaine ;
  - libellés : Assoupi, Calme, Éveillé, Actif, Animé, Florissant ;
  - effets : la production est multipliée par (0,5 + 0,15·V) ; habitants visibles à partir de V2, fumée à partir de V1, guirlandes à V5 ;
  - ne regrise JAMAIS.

SOURCES
- Tâches, pour environ 80 % des ressources.
  - Profil typique (3 quêtes par jour, 5 jours sur 7, 11 PE en moyenne) : 165 PE par semaine, soit environ 99 ⚡ et 66 ▣.
- Plafond quotidien dégressif sur ⚡ et ▣ (pas sur la Lueur ni sur la Confiance) : les 45 premiers PE du jour comptent à 100 %, de 46 à 90 PE à 50 %, au-delà à 20 %.
- Bonus plafonnés : 8 ⚡ par jour au maximum.
- Production passive : seule la Scierie solaire produit sans intervention, au plus environ 20 % des ▣.
  - Niveau 1 : 35 ▣ à construire, 2 ▣ par jour × facteur de Vitalité.
  - Niveau 2 : 70 ▣, 4 ▣ par jour.
  - Elle s'accumule par tranches de 6 h et ne fait jamais de stock au-delà d'une journée.
- La ferme convertit l'Énergie en récoltes. Elle ne crée pas de ressources à partir de rien.
  - Courges : 2 ⚡, 6 h, 2 courges.
  - Patates : 3 ⚡, 12 h, 3 patates.
  - Blé d'hiver : 4 ⚡, 24 h, 4 blé. La Serre est requise.
  - Parcelles : 3 au départ, jusqu'à 8, à 10 ▣ chacune.
- Commandes d'Ambroise, à partir du ch. 5 : 1 par jour (2 à partir du ch. 6). Exemple : 4 courges + 2 patates donnent 14 ▣. C'est l'usage principal de l'Énergie excédentaire.

PUITS (saison 1)
- Construction obligatoire des chapitres : environ 1 300 ▣.
  - Ch. 1 : Tour météo, 20 ▣ + 6 ⚡.
  - Ch. 2 : Établi 25 ▣ + 6 ⚡ ; Scierie 35 ▣ ; 3 érables à 5 ▣.
  - Ch. 3 : Salle des registres, 45 ▣ + 10 ⚡.
  - Ch. 4 : Poêle 30 ▣ + 10 ⚡ ; Dortoir 50 ▣ ; 2 segments de remparts à 18 ▣ + 4 ⚡.
  - Ch. 5 : Route, 3 tronçons à 20 ▣ ; Garage 50 ▣ ; Tableau de commandes 30 ▣.
  - Ch. 6 : Cuisine commune 55 ▣ ; 4 sentiers à 15 ▣.
  - Ch. 7 : remparts niv. 1 restants (6 × 18 ▣) et niv. 2 (4 × 35 ▣).
  - Ch. 8 : Relais niv. 3 (160 ▣ + 40 ⚡) et 8 bâtiments-clés niv. 2 (environ 45 ▣ chacun).
- Revenu typique de la saison : environ 1 750 ▣ (tâches, Scierie, commandes). Il reste donc environ 450 ▣ de choix libres : décor (40 objets de 3 à 25 ▣), parcelles, Entrepôt, Cellier, Lots.
- Énergie, environ 2 000 ⚡ par saison : semis (environ 20 par semaine), incidents (2 à 3 par semaine, 4 à 12 ⚡ chacun), parts ⚡ des bâtiments, Souffler, commandes.

INCIDENTS (au plus 2 actifs, 1 nouveau au plus toutes les 48 h, aucun avant le jour 4)
- Tirage pondéré par secteur :
  - poids de base 1 ;
  - +1 tous les 4 jours sans quête du domaine, jusqu'à +3 ;
  - +2 si une quête du domaine est en retard ;
  - poids 0 si le secteur est restauré à moins de 20 %.
- Expiration en 72 h.
- Si l'app n'a pas été ouverte depuis plus de 48 h, tout est gelé. Message : « La cendre attend aussi. »
- Quatre réponses, toujours :
  - PAYER (prévenir) ;
  - INVESTIR (immunité permanente) ;
  - LAISSER (perte virtuelle, récupérable) ;
  - QUÊTE : n'importe quelle vraie quête du domaine règle l'incident gratuitement et ajoute un petit bonus.
- Règle anti-« ignorer » : la perte quand on laisse faire est toujours supérieure au prix de la prévention.
- Exemples :
  - GIVRE PRÉCOCE (Champs) : 2 parcelles gèlent dans 48 h. Bâcher 6 ⚡ ; Serre réparée 30 ▣ (protège 4 parcelles pour de bon) ; laisser geler (récolte perdue, il faut ressemer) ; quête Terrain (+1 courge offerte).
  - COURROIE USÉE (Atelier) : la Scierie s'arrête. Graisser 5 ⚡ (tient 3 jours) ; remplacer 14 ▣ ; laisser (Scierie à l'arrêt jusqu'aux 14 ▣) ; quête Maison.
  - DOSSIERS EMMÊLÉS (Archives) : ÉCHO-7 se tait. Trier 10 ⚡ ; étagère neuve 25 ▣ ; quête Administratif.
  - POÊLE QUI BOUCANE (Maison commune) : −1 Vitalité temporaire. Ramoner 8 ⚡ ; tuyau neuf 30 ▣ ; quête Enfants.
  - ROUTE ENSEVELIE (Relais) : convoi retardé d'un jour. Pelleter 8 ⚡ ; chasse-neige 60 ▣ ; quête Véhicule.
- FRONT DE CENDRE (à partir du ch. 4, tous les 9 à 12 jours) :
  - il est annoncé 72 h d'avance par un mur gris à l'horizon ;
  - par segment de rempart non défendu, 2 cases reçoivent un « voile » temporaire et la production du secteur baisse de 50 % ;
  - le voile s'enlève à 1 ⚡ par case, ou la prochaine quête du secteur lève tous les voiles ;
  - la restauration sous le voile reste intacte.

ANTI-FARMING
Ces règles corrigent les 6 bugs de l'économie du prototype 006 :
- Registre append-only (ledger.jsonl), avec la clé reward:{taskId}:{occurrence}. Terminer, réactiver puis re-terminer rapporte 0.
- « Jour +1 » supprimé : le temps est la vraie date. Le mode debug n'est accessible que par ?debug=1, et le PHP le refuse en production.
- Le chapitre 1 exige 3 jours distincts et une vraie attente de 6 h.
- Plafonds de stock et débordement vers la Lueur.
- La ferme convertit réellement l'Énergie.
- Laisser faire un incident coûte plus cher que le prévenir.

SIMULATION OBLIGATOIRE (node --test core/sim.test.js, 140 jours, 3 profils)
- Profils :
  - Léger : 1 quête par jour, 4 jours sur 7.
  - Typique : 3 quêtes par jour, 5 jours sur 7.
  - Marathon : 8 quêtes par jour, 7 jours sur 7.
- Assertions :
  - aucun profil n'ouvre le ch. 8 avant le jour 75 ;
  - le profil Typique termine la saison entre les jours 100 et 125 ;
  - le profil Léger atteint le ch. 5 avant le jour 70 ;
  - le Marathon est au plafond moins de 20 % des jours ;
  - la production passive reste sous 20 % des ▣ ;
  - aucune case restaurée n'est jamais perdue.

### Narration

PRÉMISSE (bible conservée et rendue jouable)
- Le produit s'appelle Quêtes du foyer, le monde l'Orée. « L'Orée vivante » est le titre du chapitre final.
- Les Veilleurs, bâtisseurs disparus, ont fait du Bastion des lisières un relais. Chaque geste de soin accompli dans le foyer réel traverse la lisière sous forme d'élan, qu'on voit à l'écran comme un fil de lumière.
- Il y a 184 cycles, le 6e intendant est parti. La lisière s'est éteinte et la cendre est tombée.
- Alex est le 7e intendant de continuité.
- La première quête du jour allume la lisière et les habitants la voient : c'est la Confiance, qui mesure la présence.
- Phrase-pivot, dite par Solène dès la 1re minute et gravée sur le Relais : « Ce que tu accomplis hors d'ici devient notre capacité d'agir ici. »
- L'Orée n'exige rien, elle répond.

PERSONNAGES (figurines voxel, grises tant que leur secteur n'est pas ravivé)
- SOLÈNE ARDENT, agronome. Domaine Terrain, et voix par défaut. Pragmatique, chaleureuse.
  « Ça sent la terre mouillée, ici. Ça faisait des cycles. »
- MILO KERN, technicien. Domaines Maison et Véhicule. Pince-sans-rire.
  « Si ça a des vis, c'est à moi. »
- NAÏMA SOREL, coordinatrice. Domaine Administratif, plans et bilans. Précise, protectrice.
  « Une chose à la fois. »
- LOU, apprentie de 11 ans. Domaine Enfants. Curieuse, jamais mièvre. Elle dessine l'Orée.
- AMBROISE, convoyeur. Échéances et Véhicule, à partir du ch. 5. Lent, fiable.
  « Une échéance, c'est juste une date où quelqu'un t'attend. »
- ÉCHO-7, mémoire des Archives. Il VOUVOIE, parle en texte ambré sur fond d'encre, et reste gris jusqu'à la finale.

CHAPITRE 1 — « Le premier sillon » (Solène · Champs · au moins 3 jours · gel d'octobre)
Objectifs, affichés dans l'ordre :
1. Allumer la lisière : terminer 1 vraie quête. La Place du Bastion (3×3 cases) se ravive gratuitement.
2. Semer malgré la cendre : semer 1 parcelle de courges (2 ⚡). Solène offre 12 Lueur aux Champs pour que la 1re parcelle existe, quel que soit le domaine de la 1re quête.
3. La première récolte : récolter, ce qui demande une vraie attente de 6 h.
4. La Tour qui grésille : réparer la Tour météo (20 ▣ + 6 ⚡).
5. Trois matins : atteindre Confiance 3, donc 3 jours distincts avec au moins une quête.
6. Le signal sous l'assise : une scène de 20 s, passable.
Beats :
- Jour 2, Journal du matin : « Bon matin, Alex. Il a gelé cette nuit dans l'Orée, mais tes courges ont tenu. La Tour grésille encore; Milo dit qu'il faudrait une vingtaine de matériaux. »
- Jour 3 : « Troisième matin. Les gens sortent quand la lisière s'allume. Ici, ça veut dire quelque chose. »
- Tour réparée. La Tour : « … signal… sous… assise… » Milo, par radio : « C'est pas la météo, ça. Ça vient d'en dessous du Bastion. »
- Fragment ÉCHO-7 n° 1 : « Identification impossible. Fonction reconnue : intendant de continuité. Vous êtes en retard de 184 cycles. »
- Solène : « En retard? On t'attendait même plus. T'es là, c'est ça qui compte. »
Récompense : +2 Confiance, ouverture de l'Atelier, lettre de Solène.

CHAPITRE 2 — « Le rouge des érables » (Milo · Atelier/Maison · ouverture à Confiance 3 · au moins 12 jours)
Intro de Milo : « Milo Kern, technicien. L'Atelier dort sous la cendre depuis avant ma naissance. Chaque fois que tu répares quelque chose chez vous, il devrait se réveiller un peu. »
Objectifs :
1. Rallumer l'Atelier : 6 cases ravivées (72 Lueur), par des quêtes Maison ou avec « Souffler ».
2. Réparer l'établi (25 ▣ + 6 ⚡). Débloque les décorations.
3. Construire la Scierie solaire (35 ▣). Elle produit 2 ▣ par jour.
4. Premier chantier : découper une vraie quête de L ≥ 6 en au moins 2 étapes et en cocher une. L'échafaudage apparaît. Alternative s'il n'y a pas de quête longue : terminer 2 quêtes Maison.
5. Première panne : incident scripté « Courroie usée » au jour 2 du chapitre, pour apprendre les 4 réponses.
6. Trois érables : en planter 3 (5 ▣ chacun). L'Atelier vire au rouge érable dans un monde encore gris : c'est le moment signature du chapitre.
7. Atteindre Confiance 9.
Fin : Milo dégage une plaque sous l'établi, « ARCHIVES · ACCÈS INTENDANT · 3e ASSISE ». Voix radio : « Ici Naïma Sorel, poste de coordination. Si l'Atelier tourne, c'est que quelqu'un est revenu. J'arrive. »

CHAPITRE 3 — « Sous la troisième assise » (Naïma · Archives/Administratif · ouverture à Confiance 9)
Ouverture : la Lueur Administratif accumulée depuis le jour 1 perce d'un coup.
Intro de Naïma : « Naïma. Je coordonne. Ce qui est gris ici, c'est pas de la poussière : c'est 184 cycles de choses que personne a classées. Une chose à la fois. »
Objectifs :
1. Ouvrir les Archives : 4 cases ravivées.
2. Le calendrier de Naïma : finir 1 quête avant son échéance, ou terminer 3 quêtes Administratif.
3. Le premier plan : écrire un plan « Quand…, alors… » et l'honorer.
   Exemple : « Quand je dîne au bureau, alors j'appelle le garage. »
   Naïma : « Les plans qui marchent ont tous la même forme : quand ceci, alors cela. »
4. Restaurer la Salle des registres (45 ▣ + 10 ⚡).
5. Remettre ÉCHO-7 sous tension (12 ⚡).
6. Atteindre Confiance 16.
Révélation n° 2 : « Six intendants vous ont précédé. Chacun a laissé un registre. Aucun registre n'est complet. Ce n'était pas le but. »
Naïma : « Pas complet… Tant mieux. Le mien non plus. »
Ouverture de l'Almanach des intendants : 6 étagères à 12 ▣, chacune donnant une lettre. Exemple, Rose-Aimée, 3e intendante : « Les jours où je n'ai fait qu'une chose, je l'ai écrite quand même. Une chose, c'est une chose. »
Fin : on frappe à la porte de la Maison commune. Une petite voix : « Y a quelqu'un? Il fait froid en bas. »

ARC LONG
- Ch. 4, « Première neige » (Lou · Maison commune/Enfants · vers le 15 novembre) :
  - Poêle et Dortoir ; les habitants descendent dans l'Orée.
  - Premier Front de cendre, annoncé 72 h d'avance : tutoriel des remparts.
  - Lou : « Ma mère disait que la neige, c'est de la cendre qui a décidé d'être belle. »
  - Révélation n° 3 : « La cendre n'est pas un ennemi. C'est ce qui retombe quand personne ne regarde. Elle ne détruit rien. Elle recouvre. »
- Ch. 5, « Le chemin d'Ambroise » (Relais du convoi/Véhicule et échéances) :
  - la route se rouvre en 3 tronçons ;
  - convoi chaque vendredi, tableau de commandes, échéances vues comme des livraisons ;
  - temps fort : les pneus d'hiver avant le 1er décembre.
- Ch. 6, « La veillée » (tous les secteurs · Prospérer) :
  - sentiers entre les secteurs, Cuisine commune, repas faits des récoltes ;
  - pendant la veillée, chaque personnage raconte son passé ;
  - si le chapitre tombe entre le 20 décembre et le 6 janvier : variantes des Fêtes (réveillon, tourtière, guirlandes) ;
  - révélation n° 4 : « Je ne suis pas une machine qui se souvient. Je suis le souvenir de six personnes. C'est pourquoi je vous vouvoie : nous sommes plusieurs à vous parler. »
- Ch. 7, « Poudrerie » (Défendre · janvier) :
  - 7 vrais jours de tempête, avec une rafale par jour à 17 h sur 1 ou 2 côtés ;
  - chaque vraie quête du jour allume une lanterne qui tient 1 segment de rempart ;
  - les secteurs autonomes se défendent seuls ;
  - révélation n° 5 : « Le Bastion ne garde rien dehors. Il garde la lisière ouverte, de notre côté. Sans intendant, elle se referme lentement, comme une porte qu'on oublie. »
- Ch. 8, « L'Orée vivante » (Autonomie · février) :
  - conditions : 4 secteurs autonomes sur 6 (une tolérance pour un domaine creux) et le Relais au niveau 3 ;
  - cérémonie : tous les habitants se rassemblent, ÉCHO-7 se colore (« le dernier gris ») et TUTOIE pour la première fois ;
  - révélation n° 6 : « Un intendant réussit quand l'Orée peut l'attendre sans s'éteindre. C'est le cas. … Tu peux revenir quand tu veux, Alex. On va être là. »
- Teaser de la Saison 2, « Le temps des sucres » : derrière le rempart nord, une érablière grise. Dès que la météo réelle est activée, la sève coule les jours de gel la nuit et de dégel le jour.
- Saisons suivantes : un secteur au-delà de la lisière et un fil de mystère par saison (qui étaient les Veilleurs? d'autres Orées, d'autres foyers?).

ÉCRITURE
- Tutoiement partout, en français québécois standard (dîner, souper, bac, pelleter, relâche). Rares marques orales en dialogue seulement.
- Seul ÉCHO-7 vouvoie, jusqu'à la finale.
- ZÉRO culpabilité :
  - jamais « tu n'as pas » ;
  - jamais de série rompue ;
  - « en retard » n'existe que dans la bouche d'ÉCHO-7, et Solène le recadre.
- Célébrations proportionnelles à la longueur : L1-3, une ligne ; L4-6, une ligne et un panoramique ; L7-10, un portrait et une plaque.
- Au moins 6 variantes par réaction, sans répétition sur 7 jours. Au plus 3 beats par jour.
- Réactions par domaine :
  - Milo : « L'établi ronronne. Pas pire pantoute. »
  - Naïma : « Un dossier de moins. Les Archives respirent mieux, et moi aussi. »
  - Lou : « Le poêle chauffe! Tout le monde descend à la Maison commune. »
  - Ambroise : « Livré avant la date. Je mets un tampon doré dans ton registre. »
- Retour après absence : « Te revoilà. Pendant ton absence, un renard s'est installé près de la serre. Rien n'a gelé : les courges t'ont attendu. »
- Fin de journée : « Les lanternes sont allumées. Va te reposer, on s'occupe du reste. »
- Glossaire fermé : Quête, Fil du jour, Cote, Énergie, Matériaux, Confiance, Lueur, Vitalité, Secteur, Étape, Chantier, Lot, Commande, Incident, Front de cendre, Lisière, Relais, Intendant, Veilleurs.

### Direction visuelle

« VOXEL DE LISIÈRE » : des voxels doux, à la Townscaper, en isométrie 2:1 propre et dans un monde continu.
- Une case fait 8×8 voxels de 8 px, soit un losange de 64 px à zoom 1.
- Les bâtiments mesurent de 8 à 24 voxels de haut.
- Chaque face est ombrée en 3 tons, avec un liseré clair sur l'arête supérieure et une occlusion ambiante par voxel, calculée au moment de la cuisson.
- Fini le diorama flottant :
  - au-delà des remparts, le terrain continue dans une brume de cendre ;
  - 2 plans de collines grises en parallaxe ;
  - les « Terres grises » sont réservées aux saisons suivantes.
- Rotation sur 4 orientations par sprites recuits, jamais par rotation CSS (bug du prototype 006).

PALETTES
- État CENDRE : gris chauds où la luminance est conservée et la saturation tombe à 0,08.
  - cendre claire #CFC9BE, cendre #A8A297, ombre #7D786F, nuit #5A5852 ;
  - flocons #E6E1D6, 6 à 10 à l'écran, qui tombent lentement ;
  - une texture de mouchetis distingue les cases grises sans recourir à la couleur.
- État RAVIVÉ, palette héritée de 006 :
  - encre #273026, papier #FFF8E8, crème #F7E7BD, lumière #F3C879 ;
  - terre #AA6C43 / #75472F, sauge #718C5D / #3F6047, verre solaire #58A9A4 / #2D7473.
- BRAISE #BF5A38 réservée aux menaces (règle Ember Reserve) et toujours doublée d'un motif hachuré et d'un pictogramme.
- Accents saisonniers :
  - érable #A8323E, toujours en forme de feuille, jamais en aplat ;
  - givre #D4E6EC ;
  - neige #F4F1EA, avec les ombres bleues de neige #9DB3C9 de Clarence Gagnon ;
  - lanterne #FFC86B ;
  - nuit #1F2A44, avec des fenêtres chaudes, sans rien de sci-fi sombre.
- Fil de lumière : or #FFD27A à cœur blanc.

LUMIÈRE ET TEMPS RÉELS
- Le dégradé du ciel suit l'heure locale : aube pêche-lilas (6 h-8 h), jour, heure dorée, puis nuit avec des flaques de lumière de lanternes.
- Les transitions durent plusieurs minutes.
- Givre scintillant les matins d'octobre ; calottes de neige sur toutes les faces supérieures à partir du 15 novembre (variante cuite) ; Fêtes avec guirlandes.

PERSONNAGES
- Figurines de 6×6×12 voxels, avec un balancement au repos.
- Portraits de dialogue en 3/4, cuits en grand, avec 2 expressions.
- Ils sont gris jusqu'à ce que leur secteur soit ravivé.

INTERFACE
- Panneaux papier crème (006), avec des coins de 12 à 24 px.
- Police d'affichage Bricolage Grotesque 800, auto-hébergée en woff2 avec sous-ensemble latin et préchargée. Cela corrige la police jamais chargée du prototype 006.
- Corps en system-ui 16 px, chiffres en tabular-nums.
- Disposition à 390×844 :
  - en haut : HUD de 48 px (3 puces de ressources et un menu) ;
  - en bas : Fil du jour de 88 px replié et barre d'onglets de 56 px (Orée · Quêtes · ＋ · Journal · Plus) ;
  - le monde occupe environ 77 % de la hauteur.
- Sur tablette : vue partagée, avec un inspecteur de 42 % de large (390 px au maximum, héritage du prototype 006).

RÉFÉRENCES
- Townscaper : voxel tendre et pop.
- Terra Nil : vagues de restauration.
- Cozy Grove : la couleur revient par personnage.
- Dorfromantik : palette douce, satisfaction des tuiles.
- Animal Crossing : lettres, horloge.
- Kingdom Two Crowns : menace à l'horizon.
- Hay Day : récolte au glissé.
- Clarence Gagnon, illustrations de Maria Chapdelaine : maisons colorées dans la neige, ombres bleues.

MOMENTS SIGNATURE
1. Le fil de lumière qui quitte la carte de la tâche.
2. La lisière qui s'allume le matin.
3. Un secteur qui s'ouvre et dont la Lueur en réserve perce la cendre.
4. Les érables rouges dans un monde gris.
5. Le chantier dévoilé, avec sa plaque datée.
6. Le mur de cendre à l'horizon.
7. La première neige réelle.
8. « Le dernier gris » : ÉCHO-7 se colore.

### Animations signature

1. FIL DE LUMIÈRE (chaque complétion)
- La carte DOM se contracte en perle (150 ms).
- La perle suit un arc de Bézier de 900 ms vers la position du secteur sur le canvas, avec une traînée de 12 particules.
- La caméra glisse vers le secteur en parallèle (600 ms, ease-in-out). Pas de glissement si le secteur est déjà visible.
- Les compteurs ⚡ ▣ ne défilent qu'à l'IMPACT. La puce « avale » le gain (scale 1 → 1,15 → 1 en 180 ms). Cela corrige le compteur qui sautait avant les particules.

2. VAGUE DE COULEUR (restauration)
- Les cases basculent par ordre de distance, avec 60 ms de décalage entre elles.
- Chaque case :
  - fond du gris à la couleur en 240 ms ;
  - fait un pop voxel (y −4 px → 0, ease-out-back) ;
  - fait pousser des touffes (scale-y 0 → 1, 300 ms) ;
  - relâche des flocons qui remontent et s'éteignent.
- La germination partielle (34 % et 67 %) fait apparaître des taches de couleur en 400 ms.

3. ALLUMAGE DE LA LISIÈRE (1re quête du jour)
- Le halo de la lanterne du Relais passe de 0 à 160 px en 600 ms.
- Un anneau de choc parcourt la place.
- La Confiance prend +1 avec un vignettage chaud de 800 ms.
- Les habitants sortent et lèvent la tête.

4. CONSTRUCTION ET RÉPARATION
- Construction : les voxels s'empilent couche par couche (70 ms par couche), puis bouffée de poussière et tassement final (scaleY 0,92 → 1).
- Réparation : les voxels cassés reviennent en place en explosion inversée (800 ms).
- Chantier dévoilé (L ≥ 6) : l'échafaudage tombe planche par planche, puis la plaque datée s'affiche en surimpression (2,5 s).

5. RÉCOLTE
- Le doigt glissé sur les parcelles sert de faucille.
- 3 légumes par parcelle sautent de 12 px en décalé, puis volent en arc vers le garde-manger.
- Un bouton « Tout récolter » est prévu en repli.

6. VIE DES HABITANTS ET DU MONDE
- Les habitants marchent sur les sentiers avec un balancement de 2 phases et saluent quand on les touche.
- Fumée de cheminée, moulin, scintillement des lanternes.
- La densité et la vitesse de ces animations suivent la Vitalité (0 à 5).

7. JOUR, NUIT ET MÉTÉO
- L'étalonnage suit l'horloge réelle par composition multiply/screen sur une carte de lumières.
- Givre le matin, flocons, neige qui s'accumule sur les faces supérieures, guirlandes des Fêtes.

8. FRONT DE CENDRE ET DÉFENSE
- Un mur gris avance à l'horizon pendant 3 jours, plus proche chaque matin.
- À l'impact :
  - les rafales poussent les particules contre les remparts ;
  - un segment défendu s'illumine et la cendre s'y dissipe en paillettes ;
  - sinon, un voile gris semi-transparent se pose sur 2 cases.
- Le voile se lève d'un seul geste à la prochaine quête du secteur.

RÈGLES COMMUNES
- Toucher n'importe où saute l'animation, réduite alors à 150 ms.
- Les complétions en lot (plusieurs « Fait » d'un coup) se fusionnent en un seul fil multicolore.
- En prefers-reduced-motion :
  - aucun vol, aucun panoramique, aucune particule ;
  - fondu de 200 ms sur les cases ;
  - les compteurs changent en fondu ;
  - une annonce aria-live équivalente : « Atelier : une case ravivée, 7 sur 12 ».
- Finale de chapitre : cinématique de 10 à 15 s, passable.

### Technique

CHOIX : un monde en Canvas 2D maison avec des sprites voxel « cuits » au chargement, et toute l'interface en DOM/CSS. Pas de framework, pas de build : modules ES natifs.

POURQUOI CE RENDU
- DOM/CSS plafonne autour de 100 tuiles animées. Le prototype 006 cassait déjà à 8×8 avec innerHTML, et il faut ici 18×18 à 24×24 cases, des particules et des fondus par case.
- three.js donnerait de vrais voxels, mais coûte environ 600 Ko, de la batterie et de la chauffe. La sélection et l'accessibilité y sont plus complexes.
- PixiJS (150-200 Ko) reste l'option de repli. Le moteur est isolé derrière world/renderer.js avec drawWorld(state, fx), pour pouvoir changer si le profilage dépasse 8 ms par image.

LE STYLE VIENT DE LA CUISSON
- Les modèles voxel sont décrits en JSON, par exemple {size:[8,8,12], palette, boxes:[…]}. L'IA les écrit facilement et ils pèsent environ 30 Ko pour une soixantaine de modèles.
- world/voxel.js les rend en ImageBitmap :
  - ombrage 3 faces, occlusion ambiante, liseré ;
  - au chargement : 2 états (cendre par permutation de palette, et couleur) pour 1 orientation ;
  - les 3 autres orientations et la variante neige sont cuites à la demande ;
  - cache IndexedDB par empreinte de modèle.
- Budget de cuisson : 250 ms au plus sur un téléphone moyen. Mémoire des bitmaps : 60 Mo au plus.

PERFORMANCE MOBILE
- Le sol de chaque secteur est pré-rendu dans un canvas hors écran, re-rendu seulement s'il change.
- Par image : environ 12 blits de morceaux de sol, environ 80 objets triés par row+col puis hauteur, 120 particules au plus.
- Rendu à la demande :
  - 60 i/s pendant les effets ;
  - 24 i/s pour l'ambiance ;
  - 0 i/s si rien ne bouge ou si une feuille couvre la carte ;
  - pause sur visibilitychange.
- DPR plafonné à 2.
- Budget d'image : 8 ms au plus sur Pixel 6a et iPhone 12.
- Premier chargement : 300 Ko au plus (JS maison d'environ 150 Ko non minifié, compressé par LiteSpeed ; police 35 Ko ; aucune image raster).

STRUCTURE DU CODE
- core/ : logique pure, testable par node --test.
  - task.js : schéma v2 et migration non destructive.
  - cote.js, reward.js.
  - ledger.js : registre append-only et idempotence.
  - time.js : jour de l'Orée qui commence à 4 h, fuseau America/Montreal.
  - economy.js, chapters.js, incidents.js.
  - sim.test.js.
- world/ : iso.js, voxel.js, renderer.js, fx.js, camera.js, hit.js.
- ui/ : feuilles, cartes, formulaires, plan accessible.
- content/fr-CA/ : textes, pools de variantes, chapitres et modèles en JSON.

DONNÉES ET HÉBERGEMENT (LiteSpeed/PHP)
- tasks.json reste la source des tâches. Champs v2 additifs :
  - steps[], notes, recurrence, deadlineSetAt, frozen{P,L,D,at}, startedAt, completedAt ;
  - archived et created réels conservés.
- game-state.json et ledger.jsonl sont séparés.
- api.php :
  - opérations add, edit, complete, reopen, step, spend, plan, chacune avec un opId UUID idempotent ;
  - flock(LOCK_EX) et numéro de révision (409, puis rechargement et rejeu) ;
  - sauvegarde quotidienne tournante sur 14 copies.
- L'agent familial (TASKS_WORKFLOW) passe par la même API.
- PWA :
  - manifest ;
  - service worker cache-first pour les ressources et network-first pour les données ;
  - file d'opérations hors ligne dans IndexedDB.
- Connexion par code (session PHP, code haché dans config.php) avant la mise en production.

ACCESSIBILITÉ
- Le canvas est aria-hidden. Le « Plan de l'Orée » en DOM liste secteurs puis bâtiments en vrais boutons, utilisables au clavier et au lecteur d'écran.
- Chaque action du monde a son équivalent en feuille DOM.
- aria-live polite pour chaque changement.
- Clavier sur la carte, comme dans le prototype 006 : flèches, +/−, 0, R, Entrée, Échap. Une seule case tabulable en mode construction.
- Cibles de 44 px. Contraste AA sur le HUD.
- Cendre et couleur se distinguent aussi par la texture et le libellé.
- reduced-motion respecté.
- Son facultatif en WebAudio sans bibliothèque (carillon de lisière, vent saisonnier), désactivé par défaut.
- navigator.vibrate(10) en option sur Android.

PLUS TARD
- Météo réelle via Open-Meteo, sans clé et compatible CORS, pour la sève de la Saison 2.
- Notifications Web Push VAPID côté PHP pour le rappel quotidien facultatif.

### Les 60 premières secondes

Hypothèse : premier lancement, les vraies tâches sont déjà migrées depuis tasks.json.

- 0,0 s — Pas d'écran-titre, l'app s'ouvre sur l'Orée. Une vallée voxel en gris chaud, à l'aube. 8 flocons de cendre descendent lentement. Seule touche chaude : la lanterne du Relais au centre, qui pulse faiblement une fois toutes les 2,4 s. Aucun HUD. En haut, en petit : « Quêtes du foyer ».
- 0,8 s — Une vingtaine de minuscules points ambrés apparaissent sous la cendre, un par quête déjà terminée dans tasks.json et au plus un par case.
- 1,5 s — Une carte papier monte du bas (300 ms) : « Ici, c'est l'Orée. La cendre est tombée il y a longtemps, et plus personne n'a rallumé la lisière. » Bouton « Continuer », et un lien discret « Passer l'intro ».
- ~6 s — Toucher. La caméra glisse vers le Relais (600 ms). Solène en sort, figurine grise, lanterne éteinte. Son portrait gris accompagne la réplique : « Alex? C'est toi, l'intendant? On attendait plus de signal. Écoute : ce que tu fais chez vous (une vaisselle, un appel, une poignée revissée), ça traverse la lisière. Ici, ça devient de la lumière. »
- ~12 s — Toucher. Solène montre les points ambrés : « Ces petites lueurs-là, c'est tout ce que t'as déjà fait. C'était là, sous la cendre. » Les points pulsent une fois.
- ~16 s — Le Fil du jour monte avec la vraie quête n° 1, par exemple « Changer l'ampoule du couloir » · Maison · ≈ 15 min · Cote 58. Deux alternatives sont repliées dessous. Solène : « Choisis une vraie tâche. Fais-la quand tu peux, ou coche-la si c'est déjà fait aujourd'hui. » Boutons : « Fait ✓ », « J'y vais », « Plus tard ».
  - Avec « Plus tard », le HUD apparaît, l'onglet Quêtes est entièrement utilisable et la lanterne continue de pulser. L'intro reprendra à la première complétion. Rien n'est jamais bloqué.
- ~22 s — Alex touche « Fait ✓ » sur une petite quête faite ce matin. La carte se replie en perle (150 ms) et part en arc de 900 ms, avec sa traînée, vers le Relais.
- ~23 s — Impact.
  - La lanterne s'embrase (halo de 160 px) et un anneau de choc parcourt la place.
  - Les 9 cases de la place basculent en couleur en vague, avec 60 ms de décalage et un pop de 4 px chacune.
  - L'herbe pousse et les flocons remontent.
  - Solène se colore des pieds à la tête (400 ms).
- ~25 s — Les lueurs dormantes s'éveillent et montent comme des lucioles vers la lisière. C'est un pur effet, sans gain.
- ~26 s — Le HUD apparaît en fondu.
  - ⚡ passe de 10 à 15 et ▣ de 15 à 19, les chiffres défilant à l'arrivée des particules (P7 L2 D3 = 9 PE).
  - La Confiance passe de 0 à 1, avec cette bulle : « La lisière est allumée. Les gens de l'Orée l'ont vue. Chaque jour où tu reviens faire une quête, la Confiance grandit. »
  - Petite mention : « L'Atelier garde 9 lueurs sous la cendre. »
- ~30 s — Solène : « Tu vois? Ç'a marché. Ça faisait longtemps que j'avais pas vu du vert. » Elle lance une graine de lumière vers les Champs, et la première parcelle se ravive (cadeau de 12 Lueur).
- ~36 s — En haut à gauche, une puce d'objectif : « Maintenant · Semer une parcelle · 2 ⚡ ». La parcelle a un contour pointillé animé et une étiquette.
- ~40 s — Toucher la parcelle ouvre une feuille courte : « Courges · 2 ⚡ · prêtes dans 6 h », avec le bouton « Semer ».
- ~42 s — 3 graines-voxels tombent, une pousse sort (300 ms) et « 6 h » s'affiche sous la parcelle. ⚡ passe de 15 à 13.
- ~45 s — Solène : « Reviens ce soir, elles vont être prêtes. Ta liste reste ici, en bas. » L'onglet Quêtes s'illumine une seule fois.
- ~50 s — L'intro est finie et le monde devient libre. Le Fil du jour est replié sur la quête suivante. Objectif : « Chapitre 1 · Le premier sillon · 2/6 ».
- 60 s — Alex peut fermer l'app. Bilan :
  - 1 vraie quête faite ;
  - le lien tâche → monde est compris ;
  - une raison douce de revenir ce soir ;
  - 3 touchers narratifs en tout, aucun formulaire.

### Une journée type

Jeudi 19 novembre 2026, chapitre 4 « Première neige ». Confiance 22. La neige réelle est tombée dans l'Orée depuis le 15.

DÉJEUNER, 6 h 50 (café, cuisine, téléphone, environ 40 s)
- Journal du matin : l'aube rose sur la neige, ombres bleues. « Bon matin, Alex. Le poêle de la Maison commune a tenu toute la nuit. Les patates sont prêtes. Ambroise dit qu'il reste 8 jours pour les pneus d'hiver. » Il touche « Panier du matin » : +2 ⚡.
- Fil du jour :
  - À FAIRE D'ABORD : « Sortir le bac de recyclage » (récurrente, ce soir), Cote 82.
  - VICTOIRE RAPIDE : « Rendez-vous pneus d'hiver » (P9 L1 D2), Cote 79.
  - GRAND CHANTIER : « Calfeutrer les fenêtres du sous-sol », étape 1/4, Cote 47.
- L'agenda d'école traîne sur le comptoir. Alex le signe pour vrai, puis passe par Quêtes : « Signer l'agenda d'école » (P6 L1 D1), « Fait ✓ ».
  - Le fil part vers la Maison commune : +4 ⚡ +2 ▣, et 6 Lueur font germer la case 9 à 67 %.
  - C'est la 1re quête du jour : la lisière s'allume (Confiance 23).
  - Lou : « Merci! Mon agenda est signé, je vais pouvoir aller à la sortie. »
- Il glisse le doigt sur 3 parcelles et récolte 9 patates. Il balaie 2 cendrillons, dont une trouvaille : une page du registre de Rose-Aimée.
- Plan avec Naïma : « Quand je dîne, alors j'appelle le garage pour les pneus. » +2 ⚡.

DÎNER, 12 h 10 (au bureau, environ 15 s)
- Il appelle le garage pour de vrai, puis touche « Fait ✓ » sur la carte.
  - 8 PE, avec le ×1,2 d'échéance : +5 ⚡ +3 ▣.
  - « Plan honoré » : +3 ⚡.
  - « Bon fil » : +2 ⚡.
- La Lueur part vers le Relais du convoi, encore fermé : « La route garde maintenant 42 lueurs sous la neige. »
- Milo : « Pneus d'hiver avant le 1er décembre? T'es plus organisé que moi. »
- Rien d'autre à faire. Il ferme.

SOUPER ET SOIRÉE, 19 h 40 (enfants couchés, 6 min, session stratégique)
- Il a sorti le bac : « Fait ✓ », +4 ⚡ +2 ▣, Lueur pour l'Atelier. L'occurrence de jeudi prochain est créée, sans empilement.
- Il coche l'étape 2/4 du chantier, « Acheter le calfeutrant » : +1 ⚡ +1 ▣. L'échafaudage de l'Atelier monte d'un palier.
- Alerte au nord-est : « Un front de cendre approche par le nord-est. Il touche la lisière samedi vers 18 h. Remparts nord-est : 0 sur 2 debout. »
  - Stock avant de dépenser : 47 ⚡, 71 ▣.
  - Il construit 2 segments de rempart : −36 ▣, −8 ⚡. Les voxels s'empilent couche par couche.
  - Il sème du blé d'hiver dans la serre : −4 ⚡, prêt dans 24 h.
  - Il remplit la case « 3 patates » du Lot de la semaine.
- Fin de journée : les lanternes s'allument une à une. « Les lanternes sont allumées. Va te reposer, on s'occupe du reste. »
- Bilan du jour :
  - 4 actions réelles (3 quêtes et 1 étape), environ 21 PE ;
  - Confiance +1 ;
  - 0 culpabilité : la quête « Tailler la haie » n'a jamais été mentionnée.

LA SUITE
- Samedi : il finit le calfeutrage (L7, 17 PE, plus 2 d'ancienneté). L'échafaudage tombe et révèle la plaque « Fenêtres du sous-sol calfeutrées — 21 nov. 2026 ». Milo : « Ça, c'est de l'ouvrage. L'hiver va passer à côté de chez vous. »
- Samedi, 18 h : le front frappe. Alex est au souper de famille. Au retour, une rediffusion de 6 s : « Les remparts nord-est ont tenu : aucune case voilée. »
- Dimanche soir : Bilan de Naïma. « Cette semaine : 13 quêtes, 5 jours sur 7. La Maison commune a gagné 3 cases. Semaine tenue : +1 Confiance. »

### Ce qu’on garde de 006

À GARDER
- La palette et ses règles :
  - encre, papier, crème, lumière, terre, sauge, verre solaire ;
  - la braise réservée aux menaces (Ember Reserve Rule) ;
  - la Living Ground Rule (une grande région de l'écran appartient toujours au monde).
- La thèse « la carte est l'accueil », avec un monde visible sur au moins 55 % de la hauteur. On vise maintenant environ 75 %.
- Mise en page :
  - sur tablette, l'inspecteur non modal à 42 % de large (390 px au maximum) ;
  - sur mobile, feuilles inférieures à 3 positions et piège de focus ;
  - cibles de 44 px ;
  - restauration du focus.
- La profondeur isométrique par row+col, avec la sélection et son libellé au premier plan.
- Construction :
  - catalogue de miniatures, fantôme aimanté, cases valides et invalides doublées d'un motif ;
  - glisser-déposer et toucher, avec confirmation ;
  - au clavier, une seule case tabulable (flèches, R, Entrée, Échap).
- Les marqueurs d'incident qui restent physiquement sur la carte jusqu'à résolution.
- Les conséquences virtuelles toujours récupérables.
- La règle « première quête du jour = +1 Confiance ».
- La hiérarchie d'objectifs Maintenant / Chapitre / Long terme.
- Le CRUD complet des quêtes : ajouter, éditer, supprimer avec confirmation, réactiver.
- Les personnages Solène, Milo, Naïma et ÉCHO-7, le Bastion des lisières, la Tour météo, la serre endommagée, l'éboulis de cendre, les parcelles et l'entrepôt.
- Le fragment « 184 cycles », qui devient enfin visible à l'écran.
- La phrase « Ce que tu accomplis hors d'ici devient notre capacité d'agir ici ».
- Aucun appel réseau tiers.
- La parité reduced-motion.

À JETER
- La copie figée des tâches en localStorage : on passe à la vraie API.
- Le renderAll() en innerHTML, qui empêchait toute animation.
- La rotation CSS 2D.
- Le bouton public « Jour +1 ».
- La table de récompense par paliers de longueur.
- Les incidents fixes aux jours 2 à 4, où laisser faire ne coûtait rien.
- La Confiance qui démarrait à 1.
- Le libellé « priorité » donné au score.
- Le jargon de prototype visible (sandbox, Registre local, fantôme aimanté).
- Les toasts qui couvraient les choix.
- La police d'affichage jamais chargée.

### Risques

1. LE JEU DEVIENT PLUS PRENANT QUE LES TÂCHES (piège Focus Plant)
- La restauration et la Confiance viennent UNIQUEMENT des vraies quêtes.
- « Souffler » est limité à 3 fois par jour.
- La production passive reste sous 20 %.
- Au plus 3 beats d'histoire par jour, et une fin de journée explicite.
- Aucune action dans le monde ne fait monter la Confiance.

2. GONFLEMENT DES TÂCHES (longueur exagérée, tâches triviales)
- Récompense concave en racine de L.
- Plafond quotidien dégressif.
- Évaluation figée.
- Quêtes inscrites après coup à 50 %.
- Bonus d'ajout limité à 2 par jour et repris si la quête est supprimée dans les 24 h.
- L'agent familial classe les tâches, ce qui limite l'auto-complaisance.

3. SPIRALE DE CULPABILITÉ (piège Habitica et Streaks)
- Aucune perte permanente : la restauration ne regrise jamais.
- Une Vitalité basse s'affiche « assoupi », jamais « mort ».
- Incidents gelés après 48 h sans ouverture.
- Cadeau et lettre au retour.
- Séries cumulatives seulement, mode relâche.
- Une grille de relecture « zéro culpabilité » s'applique à chaque texte.

4. DOMAINE CREUX (par exemple Véhicule rare, d'où un secteur toujours gris)
- La Lueur en réserve n'est jamais perdue.
- Voie « Souffler ».
- La finale n'exige que 4 secteurs autonomes sur 6.
- La table domaine → secteur est modifiable.

5. CALENDRIER ET CHAPITRES DÉSYNCHRONISÉS (un Alex lent arrive aux Fêtes en février)
- La couche saisonnière (météo, neige, Fêtes) dépend de la vraie date, indépendamment des chapitres.
- Le ch. 6 s'appelle « La veillée » et ne prend les variantes des Fêtes que dans la bonne fenêtre.

6. PORTÉE TROP GRANDE POUR UN DÉVELOPPEUR SEUL
- MVP strict de 3 semaines.
- Contenu en JSON, modèles voxel générés.
- Les chapitres 3 à 8 sont livrés en incréments de 2 à 3 semaines, derrière des drapeaux.
- Le renderer reste remplaçable.

7. QUALITÉ VISUELLE SANS ARTISTE
- Le voxel procédural est un style tolérant et cohérent.
- La palette est limitée.
- Une page debug « planche de modèles » permet de relire les 60 modèles sous 4 orientations et 3 états.
- Captures de référence à 390, 834 et 1280 px à chaque livraison.

8. PERFORMANCE ET BATTERIE SUR MOBILE
- Rendu à la demande, morceaux de sol en cache, DPR plafonné à 2.
- Budget de 8 ms par image mesuré sur un vrai Android de milieu de gamme et sur Safari iOS. Le prototype 006 n'avait été validé que dans Chromium émulé.
- Option « Économie de batterie » : ambiance figée.

9. PERTE OU CONFLIT DE DONNÉES
- tasks.json reste canonique.
- Migration additive avec sauvegarde datée.
- flock, révisions et opId idempotents.
- File hors ligne.
- Export JSON en un toucher.

10. SURJUSTIFICATION
- Le retour est d'abord informatif (« ta quête a ravivé 1 case de l'Atelier »), les chiffres viennent en second.
- Aucune fonction utilitaire n'est verrouillée derrière le jeu.
- Les plaques de chantiers servent de mémoire, pas de salaire.

11. RÉGRESSION UTILITAIRE
- La parité tri, filtres et CRUD avec l'app historique bloque la livraison du MVP.
- L'onglet Quêtes est toujours à un toucher, et l'intro peut être passée.

12. TEXTES RÉPÉTITIFS
- Au moins 6 variantes par réaction, sans répétition sur 7 jours.
- Les lettres sont écrites à la main par chapitre.
- Un test vérifie qu'aucun texte n'a de clé manquante.

### Tranche jouable

TRANCHE JOUABLE EN 3 SEMAINES : chapitres 1 et 2, 3 secteurs (Place du Bastion, Champs, Atelier), avec les vraies données.

SEMAINE 1 — CŒUR UTILITAIRE ET ÉCONOMIE SAINE (sans nouveau visuel)
- core/ en modules purs :
  - task.js : schéma v2 et migration additive de tasks.json, qui conserve deadline, notes, étapes, archived et created réels, avec sauvegarde datée ;
  - cote.js : formule, 3 recommandations, garde-fou P ≥ 8 ;
  - reward.js : PE, plafond dégressif, gel de l'évaluation ;
  - ledger.js : registre append-only et idempotence ;
  - time.js : jour de l'Orée qui commence à 4 h, fuseau America/Montreal ;
  - economy.js ;
  - sim.test.js : 3 profils.
- api.php :
  - opérations add, edit, complete, reopen, step, spend, plan ;
  - flock et révisions ;
  - game-state.json et ledger.jsonl ;
  - le mode debug est refusé en production.
- Onglet Quêtes complet :
  - liste avec 6 tris et 5 filtres ;
  - ajout rapide par puces (P, L, D, domaine, échéance avec raccourcis « Aujourd'hui / Demain / Vendredi / Dans 1 sem. ») ;
  - édition, notes, étapes, récurrence hebdomadaire, réactiver, archiver ;
  - bouton « Pourquoi? » de la Cote.

SEMAINE 2 — LE MONDE QUI SE RAVIVE
- world/ :
  - projection iso 2:1 ;
  - voxel.js cuit 16 modèles : sol, herbe, chemin, cendre, Relais, Tour météo, parcelle (3 états), serre, établi, scierie, érable, rempart, échafaudage (4 stades), Solène, Milo ;
  - carte de 18×18 avec 3 secteurs et un anneau de brume ;
  - caméra (glisser, pincer, boutons zoom et recentrer) ;
  - hit-test et Plan de l'Orée accessible.
- Restauration : Lueur par secteur, germination en 3 stades, bascule de case, Lueur en réserve pour un secteur fermé.
- Effets : fil de lumière, vague de couleur, allumage de la lisière, construction par couches, saut d'animation, équivalents reduced-motion avec aria-live.

SEMAINE 3 — LA TRANCHE DE JEU
- L'onboarding de 60 s.
- Chapitres 1 et 2 en JSON (objectifs, beats, textes et au moins 6 variantes par réaction de Solène et de Milo).
- Journal du matin et carte « L'Orée veille ».
- 2 incidents avec leurs 4 réponses : Givre précoce, Courroie usée.
- Cultures en temps réel (courges, patates) et Scierie.
- Construction : parcelle, serre, établi, scierie, érable, rempart.
- Chantier visible.
- Teinte jour/nuit.
- PWA : manifest, service worker et file hors ligne.

CRITÈRES D'ACCEPTATION
- node --test est vert :
  - Terminer, réactiver puis re-terminer rapporte 0 ;
  - le profil Typique n'ouvre pas le ch. 2 avant le jour 3 ;
  - le plafond quotidien est respecté ;
  - aucune case n'est perdue.
- Toutes les tâches existantes sont présentes et intactes après migration (comparaison champ par champ).
- À 390×844 : le monde occupe au moins 70 % de la hauteur sur l'onglet Orée, aucune cible ne fait moins de 44 px, aucun défilement horizontal.
- 60 i/s pendant le fil de lumière sur un Android de milieu de gamme, et 0 rendu quand rien ne bouge.
- Une tâche ajoutée par l'agent apparaît dans le Fil en 30 s au plus.

HORS MVP, PAR INCRÉMENTS ENSUITE
- Archives et ÉCHO-7 au-delà du fragment 1 (ch. 3).
- Maison commune, Front de cendre et remparts actifs (ch. 4).
- Relais du convoi et commandes (ch. 5).
- Lots, visiteurs, ch. 6 à 8.
- Son, notifications, météo réelle.
- Connexion par code, obligatoire avant la mise en production.

EFFORT
XL pour la saison 1 complète : environ 12 à 14 semaines pour un développeur seul assisté par IA.
- MVP : 3 semaines.
- Chapitres 3 à 5 et leurs secteurs : 4 semaines.
- Veillée, défense et finale : 3 semaines.
- Polissage, son et notifications : 2 à 3 semaines.

### Effort

XL

## B-village-commandes · Le Comptoir de l'Orée — un village à rebâtir, commande par commande

### Pitch

Un vrai jeu de gestion de village à la Hay Day / Stardew où l'Énergie ne vient que de tes vraies quêtes : chaque tâche terminée fait tourner le moulin, alimente le tableau de commandes et restaure, lot par lot, les bâtiments qui ramènent des familles dans l'Orée avant l'hiver. Tes domaines de vie deviennent cinq Matériaux (Planches, Terreau, Fil, Ferrures, Sceaux), que des chaînes courtes transforment en commandes et en chantiers : le village passe de 4 à 24 habitants entre octobre et février. Il est conçu pour se contenter de 90 secondes par quête, puis te renvoyer à la suivante.

### Fantaisie

Tu es le septième intendant de continuité de l'Orée. C'est un village agricole au bord de la vallée, vidé par les tempêtes de cendre, que tu remets sur pied à distance, depuis ton propre foyer. Tu ne « joues pas à la ferme » : tu tiens le Comptoir du village, le grand tableau de la place où chacun affiche ce dont il a besoin. Tu décides quoi semer, quoi moudre, quelle commande honorer et quel bâtiment restaurer d'abord, donc quelle famille reviendra avant la neige.

Ce que tu ressens :
- La preuve physique de ta journée. La porte du garage réparée chez toi, ce sont 2 Planches qui arrivent à l'Atelier de Milo et la roue du moulin qui recommence à tourner. Le réel ne débloque pas des points abstraits : il fait bouger des choses que tu vois.
- Le plaisir du gestionnaire. Une chaîne s'emboîte : Blé → Farine → Pain → commande de Jeanne → lot du Four → retour de la famille Tremblay. Les arbitrages sont simples mais réels : je livre la commande de Milo, ou je garde ma Farine pour le lot ?
- Être attendu sans être réclamé. Les villageois remarquent le domaine que tu as touché la veille, t'écrivent des lettres et ont des souhaits. Ils ne te reprochent jamais une absence.
- Le calme d'un village qui travaille sans toi. Après deux minutes, le moulin tourne, le four chauffe, et l'écran le dit clairement : « Le village s'occupe du reste. »

Le trophée durable, c'est le panneau à l'entrée du village : « L'Orée · 4 habitants » en octobre, « 24 habitants » en février. Solène dit la phrase-clé dès la première minute : « Ce que tu accomplis chez toi devient notre capacité d'agir ici. »

### Boucles

10 SECONDES — Coup d'œil
- L'accueil est la carte du village (62 % de la hauteur sur mobile). En bas, la carte « Prochaine quête » est ancrée. Elle montre :
  - le vrai titre, tel quel ;
  - l'Indice (ex. 73) ;
  - une raison calculée (« priorité 8 · ~10 min · facile · échéance jeudi ») ;
  - les gains annoncés (« +3 Énergie · +1 Ferrure ») ;
  - deux boutons : Terminer (primaire) et Autre, qui fait défiler À faire d'abord / Victoire rapide / Grand chantier.
- Sur la carte, des pastilles signalent ce qui attend : « 3 Blé » au-dessus d'une parcelle, une coche sur le Tableau quand une commande est livrable.
- Deux gestes gratuits, à un toucher :
  - Terminer (élan de 0,9 s) ;
  - Tout ramasser (les récoltes et les productions finies volent vers le Grenier).
- Aucune série ni compteur d'absence : une visite de 10 s ne « coûte » rien.

2 MINUTES — Tour de comptoir (après une quête)
- L'élan arrive :
  - l'Énergie entre dans l'Accumulateur de la Tour ;
  - 1 à 4 Matériaux du domaine arrivent au bâtiment référent ;
  - le villageois concerné dit une réplique (110 caractères au plus).
- Tu dépenses ton Énergie :
  - semer : 1 par parcelle ;
  - lancer le Moulin : 1 ;
  - lancer le Four, l'Atelier, la Cuisine ou le Métier : 2 ;
  - livrer une commande et déposer dans un lot sont gratuits.
- En pratique : 4 à 6 gestes, 60 à 90 s.
- Dès qu'aucun geste utile n'est possible (créneaux pleins ou Énergie insuffisante), l'écran « Le village travaille » s'affiche. Il montre les minuteries (« Moulin 0:30 · Blé 1:40 ») et la prochaine quête en grand. C'est la fin de session explicite.

1 JOURNÉE — Le rythme du foyer
- Matin :
  - Journal du matin : 2 phrases, +1 Énergie ;
  - Réserve de la Tour : +5 si de l'élan a été gardé ;
  - Tout ramasser ce qui a poussé la nuit ;
  - Plan du jour, facultatif : 1 à 3 quêtes et un « Quand… alors… », +2 Énergie.
- Première quête terminée du jour civil : la lisière s'allume (1,8 s) et la Confiance prend +1.
- Dans la journée, 2 à 4 visites courtes. Les durées collent à la vie :
  - 30 min pour le Moulin (une pause café) ;
  - 2 h pour le Blé (entre deux visites) ;
  - 6 h pour le Chou (du matin au souper) ;
  - 12 h pour la Courge (la nuit).
- Soir : livraisons et dépôts dans le lot. À 23 h, le comptoir ferme (réglable) : Naïma éteint les lanternes, les productions continuent.
- Budget simulé sur la distribution réelle :
  - profil moyen (3 quêtes en semaine, 5 la fin de semaine) : environ 24 Énergie/jour, soit 10 à 15 gestes et 3 à 5 min de jeu cumulées ;
  - profil léger (1 ou 2 quêtes) : environ 11 Énergie/jour.

1 SEMAINE — Nouveau départ et chantier
- Lundi :
  - les villageois affichent de nouveaux souhaits ;
  - une nouvelle Corvée de la semaine commence (la corvée, c'est l'entraide villageoise) : « Allumer la lisière 4 jours sur 7 », 2 jokers inclus. Récompense : 1 Plan de décor et +3 Liens pour chaque villageois.
- Une restauration (lot mixte) par semaine environ, en profil moyen.
- Dès le chapitre 4, vendredi 18 h : le Convoi d'Ambroise, une grosse commande facultative de 5 à 8 articles.
- Dimanche soir : Relevé d'ÉCHO-7. C'est un bilan purement informatif : quêtes accomplies, domaines touchés, temps réel estimé, temps passé dans l'Orée.

1 SAISON — La lisière (octobre à février)
- 8 chapitres calés sur le calendrier québécois. Chacun s'ouvre par un seuil de Confiance et une date plancher.
- 7 bâtiments à restaurer, une population qui passe de 4 à 24, une Réserve d'hiver à constituer, et le mystère du Bastion en 6 révélations.
- Almanach : chaque quête réelle terminée y est consignée (titre, domaine, date). C'est la mémoire durable de la saison.
- En mars, la saison 2 « Le temps des sucres » ouvre l'Érablière : eau d'érable → sirop → tire sur la neige.

### Tâches → jeu

BOUCLE UTILITAIRE (jamais cachée derrière le jeu)
- Onglet Quêtes :
  - tri par Indice, Priorité, Durée, Effort, Échéance ou Ancienneté ;
  - filtres « 15 min » (Durée ≤ 3), « Peu d'énergie » (Effort ≤ 3), domaine, « Échéance ≤ 7 j » et statut ;
  - le tri historique est conservé.
- Ajout rapide (+) : titre, puces de domaine, curseurs de 1 à 10 avec aide (« Durée 3 ≈ 30 min »), échéance et note. Une case « Déjà faite » permet de noter une tâche accomplie.
- Fiche : notes, sous-tâches, récurrence, Réactiver, Archiver, Supprimer (avec confirmation).
- Libellés fixes partout : Priorité, Durée, Effort, Indice.

A. RANG (quoi faire maintenant) : l'Indice v2 sur 100. Il ne tient jamais compte de la récompense.
- Formule : Indice = 45·P/10 + 25·(11−Durée)/10 + 15·(11−Effort)/10 + Urgence + Ancienneté + Utile au village.
  - Urgence : échéance aujourd'hui ou passée, +15 ; dans 2 jours ou moins, +10 ; dans 7 jours ou moins, +5.
  - Ancienneté : +1 par semaine ouverte, au plus +5.
  - Utile au village : +3, toujours affiché en clair (« +3 : peut poser la Pierre angulaire du Four »).
- Garantie : la meilleure quête de priorité ≥ 8 figure toujours dans les 3 premières.
- Exemples :
  - P10, Durée 1, Effort 1 = 85 ;
  - P8, Durée 3, Effort 3, échéance jeudi = 68 + 5 = 73 ;
  - P5, Durée 9, Effort 9 = 31.
- Trois recommandations :
  - À faire d'abord : l'Indice le plus haut ;
  - Victoire rapide : Durée ≤ 3 et Effort ≤ 4 ;
  - Grand chantier : Durée ≥ 6, priorité la plus haute.

B. RÉCOMPENSE (ce que ça rapporte) : proportionnelle à l'effort.
- Formules :
  - Énergie = arrondi((1 + Durée) × (0,8 + 0,04 × P)), +2 si Effort ≥ 7 ;
  - Matériaux du domaine = 1 (Durée 1 à 3), 2 (4 à 6) ou 3 (7 à 10), +1 si Effort ≥ 7.
- La Durée suit une échelle quasi logarithmique : 1 ≈ 5 min, 3 ≈ 30 min, 5 ≈ 1 h, 7 ≈ une demi-journée, 9 ≈ plusieurs jours.
- Une récompense linéaire en Durée est donc fortement dégressive à la minute :
  - 2 Énergie pour 5 min (24 par heure) ;
  - 4 pour 30 min (8 par heure) ;
  - 9 pour une journée (environ 1 par heure).
- Conséquence : à la minute, la tâche la plus rentable est celle que l'Indice recommande. L'incitation contradictoire de 006 disparaît.
- Gonfler une Durée de 3 à 6 rapporte +3 Énergie mais coûte 7 points d'Indice : la quête descend dans la file.
- Exemples tirés des données du prototype :
  - « Réparer une poignée » (P4, Durée 2, Effort 2) → 3 Énergie + 1 Planche ;
  - « Nettoyer la terrasse » (P8, 6, 7) → 10 Énergie + 3 Planches ;
  - « Planifier le budget mensuel » (P7, 5, 7) → 8 Énergie + 3 Sceaux.
- Évaluation figée : la récompense utilise les valeurs en vigueur 12 h avant la fin, ou celles de la création si elle est plus récente. Une modification faite dans les 12 dernières heures compte pour la plus basse des deux valeurs.
- Grand chantier (Durée ≥ 7) : célébration de niveau 3 (scène et entrée de journal) et 1 Plan de décor. La fierté est cosmétique, pas économique.

C. DOMAINES → MONDE (liste fermée de 7)
- Maison → Planches → Atelier → Milo.
- Terrain → Terreau → Clos (les parcelles) → Solène.
- Animaux → Fil (la laine) → Bergerie (ch. 5) → Solène.
- Enfants → Fil → Maison commune → Lou. Lou le dit : « ce que tu tisses avec tes enfants devient le fil de mon métier ». Avant son arrivée au ch. 3, les Liens gagnés par tes quêtes Enfants l'attendent : on les lui raconte.
- Véhicule → Ferrures → Relais → Milo, puis Ambroise à partir du ch. 4.
- Administratif et Professionnel → Sceaux → Archives et Comptoir → Naïma.
- Chaque bâtiment porte un fanion (« 3 quêtes Maison »). Le toucher ouvre l'inspecteur : la production du bâtiment ET les 3 meilleures quêtes de ce domaine. Le monde redevient une porte d'entrée vers la liste.
- Migration sans perte :
  - Jardin → Terrain, Ferme → Animaux, Personnel → Maison ;
  - pour un domaine inconnu, la feuille « Ranger les domaines » s'affiche une seule fois, avec une suggestion ;
  - rien n'est modifié sans confirmation.

D. ÉCHÉANCES : le bordereau d'Ambroise
- Quête finie à temps : +25 % d'Énergie (arrondi au-dessus) et +1 Sceau. « Ambroise tamponne ton bordereau. »
- Échéance dépassée : aucune perte. La carte affiche « Échéance passée. Reporter ? » avec trois raccourcis : +1 jour, Lundi, Choisir.

E. SOUS-TÂCHES (progrès doté)
- Découper une quête en au moins 2 sous-tâches donne +1 Énergie (2 fois par jour au plus).
- La récompense de la quête mère est répartie entre les sous-tâches, jamais augmentée. Exemple : Durée 6 → 7 Énergie, versées en 2 + 2 + 3.
- Chaque sous-tâche terminée déclenche un mini-élan de 0,5 s.

F. RÉCURRENCES
- Une seule occurrence ouverte à la fois. La terminer crée la suivante à partir de la date prévue.
- Une occurrence non faite reste ouverte : rien ne s'empile, aucun reproche.
- Chaque occurrence rapporte la récompense normale, mais aucun bonus d'ajout.

G. BONUS PLAFONNÉS HORS QUÊTES (6 Énergie par jour au total)
- Première ouverture du jour : +1.
- Plan du jour : +2, une fois par jour. Il se compose en touchant des puces : « Quand je dépose les enfants / Après le souper / À la pause du dîner, alors… [quête] ». Chaque quête planifiée terminée rapporte ensuite +1 (2 au plus).
- Ajouter une vraie quête : +1, 3 par jour au plus. Une quête supprimée dans les 24 h annule son bonus.
- Découper une quête : +1, 2 par jour au plus.

H. ANTI-FARMING
- Registre de gains en ajout seul : une occurrence ne paie qu'une fois. Terminer, réactiver puis terminer de nouveau dans les 7 jours affiche « Déjà comptée » et ne rapporte rien.
- Fait au passage (quête créée et terminée en moins de 10 min) : plafonnée à 3 Énergie + 1 Matériau, 3 fois par jour, puis 1 Énergie.
- Dégressif quotidien : au-delà de 30 Énergie de quêtes dans la journée, le surplus va à la Réserve de la Tour, qui le rend à raison de 5 par matin. Rien n'est perdu, mais aucune session-fleuve n'est possible.
- Confiance : +1 seulement à la première quête du jour civil.

I. PONTS DU RÉEL VERS LE JEU
- Pierre angulaire de chaque lot : une quête de priorité ≥ 7, ou de Durée ≥ 7, terminée après l'ouverture du lot. Elle pousse vers l'important sans imposer de domaine.
- Avis (aléas) : l'option Réel consiste à terminer une quête du domaine concerné avant l'échéance de l'avis.
- Souhait du réel (un seul actif à la fois) : « Celle-ci attend depuis 21 jours. La reformuler, la reporter ou la retirer : les trois sont de bonnes réponses. » N'importe laquelle des trois actions exauce le souhait.

### Économie

RÈGLE D'OR : rien dans le village ne produit d'Énergie. Toute action de jeu remonte à un effort réel.

1. ÉNERGIE : la seule ressource d'action
- Sources : les quêtes (formule de task_mapping), les bonus plafonnés (6 par jour au plus) et la Réserve de la Tour (5 par matin).
- Accumulateur : 40, puis 60 après la recharge de la Tour au ch. 2. Le surplus va à la Réserve, plafonnée à 60.
- Quand la Réserve est pleine, le Condenseur convertit automatiquement 6 Énergie en 1 Matériau au choix, 2 fois par jour au plus. Rien n'est jamais perdu.
- Coût des gestes :
  - Semer : 1 ;
  - Moulin : 1 ;
  - Four, Atelier, Cuisine, Métier : 2 ;
  - Déblayer un rocher : 4 (parcelle D), 6 + 1 Sceau (parcelle E), 8 + 1 Sceau (parcelle F) ;
  - Lire un signal de la Tour : 2.
- Aucune accélération payante.
- Simulation sur 21 jours, à partir de la distribution des tâches du prototype :
  - profil léger (1 ou 2 quêtes par jour) : environ 11 Énergie par jour ;
  - profil moyen (3 quêtes, 5 la fin de semaine) : environ 24 ;
  - profil intense (6 à 8) : 35 bruts, ramenés à 30 (le reste va à la Réserve).

2. MATÉRIAUX : 5 types liés aux domaines (Planches, Terreau, Fil, Ferrures, Sceaux)
- Sources :
  - les quêtes : 1 à 4 ;
  - le bonus d'échéance : +1 Sceau ;
  - les commandes : 1 à 3, au choix entre 2 types proposés, pondérés vers le type dont tu as le moins ;
  - le Condenseur.
- Puits : recettes, lots, agrandissements (Grenier, parcelles), décor, avis.
- Troc au Comptoir (Naïma, dès la fin du ch. 1) : 3 Matériaux quelconques contre 2 du type voulu, 2 fois par jour.
- Pourquoi ce filet : en 14 jours, le profil moyen simulé accumule environ 48 Planches, mais seulement 0 ou 1 Ferrure et 8 Fil. Les commandes pondérées et le troc garantissent qu'aucun lot ne reste bloqué faute d'un domaine.
- Départ, « ce qui restait dans la remise » : 2 Planches, 1 Ferrure, 1 Sceau et 6 Énergie.

3. CONFIANCE : jamais dépensée
- +1 à la première quête terminée du jour civil.
- Seuils de chapitre : 3 · 7 · 12 · 18 · 25 · 32 · 40 · 50.
- Dates planchers : ch. 5 au plus tôt le 14 déc. ; ch. 6 du 21 déc. au 2 janv. ; ch. 7 au plus tôt le 8 janv. ; ch. 8 au plus tôt le 1er févr.
- Si tu es en avance sur le calendrier, des chantiers libres et des souhaits occupent l'attente, sans pression.

4. LIENS : un compteur par villageois, de 0 à 5 cœurs
- 10 points par cœur ; les Liens ne baissent jamais.
- Gains :
  - +2 par quête réelle du domaine du villageois (au plus +4 par jour et par villageois) ;
  - +2 ou +3 par commande livrée ;
  - +6 par souhait exaucé.
- Paliers :
  - ♥1 : réplique et recette ;
  - ♥2 : décor et 3e créneau d'atelier ;
  - ♥3 : scène de souvenir ;
  - ♥4 : automatisation. Solène récolte seule, Milo relance la dernière recette si l'Accumulateur dépasse 10, Naïma livre les commandes complètes ;
  - ♥5 : révélation.
- Plus le village t'aime, moins il a besoin de tes doigts.

5. BIENS : l'inventaire, pas une monnaie
- Cultures :
  - Blé : 2 h → 3 ;
  - Chou : 6 h → 2 (ch. 2) ;
  - Courge : 12 h → 2 (ch. 2).
- Semer avec 1 Terreau double la récolte : ton travail dehors engraisse les champs du village.
- Recettes (2 créneaux par atelier) :
  - Farine : Moulin, 3 Blé → 2, 30 min, 1 Énergie ;
  - Pain : Four à pain, 2 Farine + 1 Planche → 3, 1 h 30, 2 Énergie ;
  - Caisse : Atelier, 2 Planches + 1 Ferrure → 1, 1 h, 2 Énergie ;
  - Lanterne : Atelier, 1 Courge + 1 Ferrure → 1, 2 h, 2 Énergie ;
  - Soupe : Cuisine commune, 2 Chou + 1 Courge → 2, 2 h, 2 Énergie ;
  - Couverture : Métier de Lou, 3 Fil → 1, 3 h, 2 Énergie.
- Valeur de référence en Énergie (1 Matériau ≈ 3) : Blé 0,3 · Farine 1 · Soupe 1,8 · Pain 2,3 · Lanterne 5,5 · Caisse 11 · Couverture 11.
- Grenier : 50 articles, +20 par agrandissement (3 Planches + 1 Ferrure + 1 Sceau). Grenier plein : les récoltes attendent au champ. Rien ne pourrit jamais.

6. COMMANDES : le Tableau du comptoir
- À l'écran : un panneau de liège avec 3 cartes épinglées. Chaque carte montre :
  - le portrait du villageois ;
  - les articles (icône, nombre, « 2/3 en stock ») ;
  - la récompense ;
  - un bouton Livrer, actif seulement si tout est en stock. Sinon, elle indique « Manque : 1 Farine (Moulin, 30 min) ».
- Emplacements : 3 (ch. 1), 4 (ch. 2), 6 (ch. 4). Chaque commande compte 1 à 3 lignes et vaut de 4 à 12 Énergie-équivalent.
- Récompense : environ 80 % de cette valeur en Matériaux, +2 ou +3 Liens, et un Plan de décor une fois sur cinq (selon un calendrier fixe, sans hasard). La première commande du jour donne +1 Matériau. Au ch. 1, les commandes sont généreuses (jusqu'à 150 %) pour amorcer.
- Exemples :
  - Solène : 6 Blé → 1 Terreau + 2 Liens ;
  - Milo : 1 Caisse → 3 Ferrures + 3 Liens ;
  - Jeanne : 6 Pains → 2 Planches + 2 Sceaux + 2 Liens.
- Aucune expiration :
  - écarter une commande est gratuit, une autre arrive 60 min plus tard ;
  - après une livraison, la suivante arrive en 20 min.
- Générateur à graine (date + emplacement) : pas de tirage de type machine à sous, et tout reste testable.
- Convoi du vendredi (ch. 4 et suivants) : 5 à 8 articles, départ à 18 h. Récompense : 6 Matériaux, 1 Plan rare et +2 Liens pour chacun. Raté : « Le convoi reviendra vendredi prochain », et le chargement est conservé.

7. RESTAURATIONS : les lots mixtes (un parchemin à cases)
- Composition : 4 à 6 cases, avec au moins 2 types de Matériaux (donc 2 domaines différents), au moins 1 bien produit et 1 Pierre angulaire.
- Les dépôts partiels sont conservés.
- Une case de Matériau restée incomplète 7 jours accepte 2 Matériaux au choix pour 1 manquant. « Ambroise a trouvé un fournisseur. »
- Chantier en temps réel, avec échafaudages animés : 4 h (Moulin), 8 h (Four), 12 h (Maison commune).
- Lots :
  - ch. 1, Moulin : 4 Planches · 1 Ferrure · 6 Blé · Pierre angulaire ;
  - ch. 2, Four à pain : 3 Planches · 1 Ferrure · 1 Sceau · 6 Farine · Pierre angulaire ;
  - ch. 2, recharge de la Tour : 2 Ferrures · 2 Sceaux · 1 Caisse ;
  - ch. 3, Maison commune : 4 Planches · 3 Fil · 2 Terreau · 4 Pains · 2 Caisses · Pierre angulaire.
- Les bâtiments ont des emplacements fixes (on restaure, on ne place pas). Le mode construction sert au décor (Plans) et aux nouvelles parcelles.

8. AVIS : les aléas annoncés
- Au plus 1 avis actif aux ch. 1 à 3, puis 2.
- Chaque avis est annoncé 12 à 24 h à l'avance. Il est tiré selon le calendrier et la saison, jamais à cause de l'absence ou d'une négligence.
- Trois réponses chiffrées. Exemple, le Gel :
  - Payer : couvrir toutes les parcelles pour 1 Planche ;
  - Réel : terminer 1 quête Terrain avant 21 h (+2 Liens avec Solène) ;
  - Laisser faire : les cultures semées sont perdues et les parcelles restent givrées 12 h.
- Laisser faire n'est donc jamais la meilleure option, mais reste acceptable.
- Un avis ne touche que les biens et les minuteries, jamais l'Énergie ni les Matériaux, qui viennent du réel.
- Si tu es absent, Laisser faire s'applique, réduit de moitié, avec une réplique apaisante.

9. GARDE-FOUS DE TEMPS DE JEU (le jeu ne vole pas le temps des tâches)
- Cible de conception : au plus 90 s de jeu par quête terminée et 6 min par jour.
- Leviers :
  - l'Énergie ne vient que du réel ;
  - chaque geste coûte de l'Énergie ;
  - 2 créneaux par atelier ;
  - des minuteries réelles, sans accélération ;
  - un écran de fin de visite ;
  - l'automatisation par les Liens.
- Rappel doux après 5 min de jeu continu sans quête, par Naïma, une fois par jour, réglable (5 min, 10 min ou jamais) : « Le village va tenir sans toi un bout. Ta prochaine quête t'attend : “Appeler l'assureur”, ~10 min. »
- Comptoir fermé de 23 h à 6 h (réglable).
- Notifications facultatives et désactivées par défaut :
  - 1 rappel quotidien à l'heure choisie : « Une quête de 10 minutes suffit pour allumer la lisière. » ;
  - la veille du Convoi.
  Aucune notification de production.
- Le Relevé d'ÉCHO-7 affiche le ratio temps de jeu / temps de quêtes estimé (cible : moins de 10 %). Au-delà de 15 % deux semaines de suite, le jeu propose le Mode sobre, qui ramasse et relance automatiquement.

### Narration

PRÉMISSE (la bible, recentrée sur le village)
- L'Orée est un village agricole au bord d'une vallée. Avant les tempêtes de cendre, il comptait 24 habitants. Les familles sont descendues à la vallée et la route s'est effondrée derrière elles.
- Les Veilleurs, des bâtisseurs disparus, ont laissé le Bastion des lisières. Ce n'est pas une forteresse mais un relais : chaque geste de soin accompli dans le foyer de l'intendant traverse la lisière sous forme d'élan. La Tour le capte, et le village en fait de l'Énergie et des Matériaux.
- Alex est le 7e intendant de continuité. Les familles reviendront si l'Orée peut les loger, les nourrir et les chauffer avant l'hiver.
- Son outil, c'est le Comptoir : le grand tableau de la place où chacun affiche ce qui lui manque. Naïma : « Le comptoir, c'est la mémoire des besoins de tout le monde. »
- L'Orée n'exige rien, elle répond. Ses pertes viennent de la météo, jamais de ton absence, et se réparent toujours.

PERSONNAGES (et le domaine réel auquel chacun réagit)
- Solène Ardent, agronome. Le Clos, les cultures, les avis météo (Terrain, Animaux). Voix concrète : « Les choux ont tenu la nuit. On ne fera pas de miracle, mais on va manger. »
- Milo Kern, technicien. L'Atelier, le Moulin, la Tour (Maison, Véhicule). Pince-sans-rire : « Une réparation chez toi, un gond de moins qui grince ici. Je n'explique pas, je constate. »
- Naïma Sorel, coordinatrice. Le Comptoir, le troc, la Confiance, les Archives (Administratif, Professionnel). Elle arrive à 3 de Confiance : « Les gens ne comptent pas tes victoires. Ils remarquent que tu reviens. »
- Jeanne Tremblay, boulangère. Le Four à pain ; elle arrive au ch. 2 avec son conjoint et leur fils. « Un four, ça se rallume pas à moitié. Donne-moi six farines et une pierre solide, je m'occupe du reste. »
- Lou, 11 ans, apprentie. Elle arrive au ch. 3 avec sa tante Rosalie : Maison commune, Métier, décor, carnet (Enfants). « J'ai gardé une place près de la balise, pour quand tu me raconteras. »
- Ambroise Lavallée, convoyeur. Il arrive au ch. 4 : Relais, Convoi, échéances (Véhicule). « Le convoi descend vendredi. Après, il y en aura un autre. Il y en a toujours un autre. »
- ÉCHO-7, mémoire des Archives. Seul à vouvoyer Alex ; il signe le Relevé hebdomadaire et porte les 6 révélations.

CHAPITRE 1 · Le premier sillon (seuil de 3 ; environ du 5 au 9 octobre)
- Accroche : la route est coupée, il reste quatre habitants et trois parcelles. La roue du Moulin est brisée : sans farine, pas de pain cet hiver.
- Objectifs affichés :
  1) Allumer la lisière : terminer 1 quête réelle.
  2) Semer 2 parcelles de Blé.
  3) Livrer 2 commandes au Tableau du comptoir.
  4) Restaurer le Moulin. Lot : 4 Planches · 1 Ferrure · 6 Blé · Pierre angulaire ; chantier de 4 h.
  5) Atteindre 3 de Confiance : Naïma descend du Bastion avec les codes de la Tour.
  6) Lire le signal de la Tour (2 Énergie).
- Avis du jour 2 ou 3, le Gel au sol. Solène : « Gel annoncé cette nuit. Je peux couvrir les semis avec une Planche, ou on récolte tout de suite, à moitié. »
- Fin :
  - la roue tourne (4 s, farine en poussière dorée) et la Tour grésille ;
  - ÉCHO-7 : « Relève détectée. Fonction reconnue : intendant de continuité. Dernière relève : il y a 184 cycles. » ;
  - le panneau passe à 5 habitants.
- Débloque : la Farine, le Troc et le Journal du matin tenu par Naïma.
- Rythme : au moins 3 jours (seuil de Confiance) et 8 à 12 quêtes réelles en profil moyen. Dans 006, 2 tâches et le stock de départ suffisaient.

CHAPITRE 2 · Sous la troisième assise (seuil de 7 ; de la mi-octobre à la fin octobre)
- Accroche : Naïma lit une lettre de la vallée. « Les Tremblay remonteraient si le four chauffe avant la Toussaint. » En dégageant la Tour, Milo trouve une trappe sous la troisième assise du mur.
- Objectifs :
  1) Restaurer le Four à pain. Lot : 3 Planches · 1 Ferrure · 1 Sceau · 6 Farine · Pierre angulaire ; chantier de 8 h. Les Tremblay arrivent en charrette : 5 → 8 habitants.
  2) Semer la première Courge (12 h).
  3) Avis : des feuilles d'érable bouchent la prise d'eau. Le Moulin s'arrête 12 h, sauf si tu paies 2 Énergie pour dégager ou termines 1 quête Terrain. Solène : « C'est joli, mais ça n'arrose rien. »
  4) Recharger la Tour (2 Ferrures · 2 Sceaux · 1 Caisse) : l'Accumulateur passe à 60.
  5) Ouvrir la première salle des Archives (2 Sceaux + 4 Énergie).
- Souhait facultatif d'Halloween : le fils de Jeanne veut 3 Lanternes de citrouille sur la galerie du Four le 31 octobre. Récompense : le décor permanent « Galerie illuminée » et +6 Liens.
- Fin, révélation 2 d'ÉCHO-7 : « Sous la troisième assise, j'ai retrouvé des semences datées. Quelqu'un cultivait déjà la cendre avant vous. »

CHAPITRE 3 · Avant les neiges (seuil de 12 ; novembre)
- Accroche : Solène sent venir la première neige vers le 20 novembre. Les familles qui reviennent auront besoin d'un toit commun, et la Maison commune a perdu la moitié de sa toiture.
- Objectifs :
  1) Restaurer la Maison commune. Lot : 4 Planches · 3 Fil · 2 Terreau · 4 Pains · 2 Caisses · Pierre angulaire ; chantier de 12 h. Lou et sa tante Rosalie arrivent : 8 → 11 habitants.
  2) Ouvrir la Cuisine commune (Soupe) et le Métier de Lou (Couverture).
  3) Constituer la Réserve d'hiver : 40 points avant la première neige (Pain 1, Soupe 2, Caisse de bois 4, Couverture 6). Si elle est incomplète : « On mangera plus de soupe que prévu. » Aucun malus, seulement un objectif bonus en décembre.
  4) Avis : des larves cendrées dans les Choux. Payer 1 Terreau, faire 1 quête Animaux ou Terrain, ou perdre la récolte de 2 parcelles.
- Fin : Milo pose la main sur le mur du Bastion. « Le mur est chaud. De l'intérieur. » Le soir, Lou demande : « Naïma dit que tu as une famille de l'autre côté. Est-ce qu'ils savent que tu nous aides ? »

ARC LONG
- Ch. 4, La route de la vallée (seuil de 18, mi-novembre) : le Relais est restauré et Ambroise arrive avec le Convoi du vendredi. Révélation 3 : une lettre adressée « À l'intendant qui viendra ».
- Ch. 5, La longue nuit (seuil de 25, à partir du 14 décembre) : Serre longue, Bergerie, lanternes et première tempête. Révélation 4 : le registre des six intendants, dont la septième ligne est vide.
- Ch. 6, La veillée (du 21 décembre au 2 janvier) : avis suspendus, productions deux fois plus rapides « parce que c'est les Fêtes », grande table à la Maison commune. On découvre que les Veilleurs avaient des foyers.
- Ch. 7, Poudrerie (à partir du 8 janvier) : la défense du village. Il faut déblayer les chemins, maintenir l'intégrité du Bastion et puiser dans la Réserve d'hiver. Révélation 5 : la cendre luit vers le nord.
- Ch. 8, L'Orée vivante (à partir du 1er février) : 24 habitants, et toute la lisière s'allume. Révélation 6 : « Il n'y a jamais eu de machine au cœur du Bastion. Il y avait des gens qui revenaient. »
- Saison 2, Le temps des sucres (mars-avril) : l'Érablière ouvre, et une autre Orée attend au nord.

### Direction visuelle

DIRECTION ARTISTIQUE : « Diorama d'automne habité »
- Un village québécois de lisière, vu en isométrique.
- Peinture en aplats à 3 tons par face (dessus clair, gauche moyen, droite sombre), avec une occlusion douce au sol.
- Terrain continu : une seule nappe de terre et d'herbe sur deux niveaux, un ruisseau, des chemins de terre battue. La forêt (érables, bouleaux, épinettes) borde les 4 côtés et s'estompe dans la brume. On en finit avec les tuiles « cartes à jouer » et le diorama flottant de 006.
- Références :
  - Township pour la lisibilité : bâtiments de 2×2 à 3×3 cases, silhouettes reconnaissables à 40 px ;
  - Stardew pour la chaleur ;
  - Dorfromantik pour le terrain continu et la palette douce ;
  - Townscaper pour la construction tendre ;
  - Cozy Grove pour le gris qui reprend couleur.
- Architecture locale, sans caricature : toits à deux versants en tôle « à la canadienne », galeries, lucarnes, clôtures de perches, moulin à eau, four à pain extérieur en dôme (héritage de la Nouvelle-France), caveau à légumes.
- Le Bastion des lisières : un mur de pierre des champs, avec du verre solaire turquoise serti dans la maçonnerie et des tuyaux de cuivre patiné. C'est un agro-futurisme réparé et intégré, jamais un terminal sombre.

PALETTE (celle de 006, étendue aux saisons)
- Monde :
  - terre ocre #aa6c43 / #75472f ;
  - sauge #718c5d / #3f6047 ;
  - bois blond #d9b47c ;
  - pierre chaude #b9ab95 ;
  - tôle #9aa3a6 ;
  - verre solaire #58a9a4, réservé à la technologie et à la lisière.
- Le feuillage d'octobre est rendu en rouille et en or désaturés (#a65a35, #d49a3a). La braise #bf5a38 reste réservée aux badges de menace de l'interface, toujours accompagnée d'une icône et d'un motif hachuré.
- Interface : papier #fff8e8, crème #f7e7bd, encre #273026. Chiffres tabulaires et filets de 1 px : la précision de Vecteur, que préfère Alex.
- Polices réellement chargées via Google Fonts :
  - Fraunces pour les titres (700 à 900) ;
  - Atkinson Hyperlegible pour le texte (16 px minimum).

COULEUR = PROGRÈS (la signature)
- Un bâtiment en ruine est désaturé à 75 % (ColorMatrixFilter).
- Pendant le chantier, la couleur remonte de 0 à 100 % au fil de la minuterie.
- Restauré, il est en pleine couleur et ses fenêtres s'allument le soir.
- Sans aucun HUD, la carte entière raconte où en est le village.

TEMPS RÉEL
- Lumière en 4 étalonnages selon l'heure locale : aube, jour, fin d'après-midi dorée, nuit bleue aux fenêtres chaudes.
- Saisons selon la date :
  - octobre : feuillage, citrouilles ;
  - novembre : arbres nus, givre ;
  - décembre : neige, lanternes ;
  - janvier : poudrerie ;
  - février : ciel froid et clair.

MOMENTS SIGNATURE
- La lisière qui s'allume.
- La roue du Moulin qui repart.
- L'arrivée en charrette d'une famille, puis le panneau d'habitants qui défile.
- La première neige sur un village éclairé.
- La galerie aux lanternes de citrouille du 31 octobre.
- La grande table de la Veillée.

MISE EN PAGE
- Mobile (390 × 844), de haut en bas :
  - HUD de 52 px : Énergie 14/40 · Matériaux 9 (un toucher détaille les 5 types) · Confiance 2/3 ;
  - carte de 520 px ;
  - carte Prochaine quête, repliée à 88 px ;
  - navigation de 64 px : Village, Quêtes, Comptoir, Journal ;
  - un bouton + flottant.
- Tablette (834 × 1112) : inspecteur persistant à droite, sur 40 % de la largeur (390 px au plus).

### Animations signature

1. L'ÉLAN (0,9 s, après Terminer)
- La puce de domaine quitte la carte de quête, monte en arc jusqu'à la Tour (ease-out cubique), puis se divise vers le bâtiment du domaine.
- 6 à 12 particules. Les compteurs ne bougent qu'à l'arrivée de chaque particule, ce qui corrige le bogue de 006. Chaque compteur fait un écrasement à 1,15 et revient en 120 ms.
- Sans animation : changement instantané, avec l'annonce aria-live « +4 Énergie, +1 Planche, à l'Atelier ».

2. LA LISIÈRE S'ALLUME (1,8 s, une fois par jour)
- Une ligne turquoise court le long du mur du Bastion, de gauche à droite.
- Les villageois tournent la tête (2 images), trois cheminées se mettent à fumer, et un halo pulse une seule fois sur la Tour.
- Un macaron « +1 Confiance » vient se poser dans le HUD.

3. SEMER, POUSSER, RÉCOLTER
- Les graines sautent dans les sillons : 3 sauts décalés de 80 ms.
- La pousse franchit 3 stades, interpolés selon la minuterie réelle. Mûre, elle oscille (période de 2,4 s).
- À la récolte, les épis jaillissent en arc vers l'icône du Grenier : étirement à l'envol, écrasement à l'atterrissage.

4. ATELIERS VIVANTS
- Chaque atelier a sa boucle d'activité : la roue du Moulin tourne, le Four fume et rougeoie, le marteau de l'Atelier frappe toutes les 0,6 s.
- Un anneau de progression entoure l'emplacement. Quand c'est prêt, une bulle d'objet rebondit.
- Les boucles ne tournent que pendant une production : au repos, le village est calme.

5. LIVRER UNE COMMANDE (1,4 s)
- Les articles volent du Grenier dans une caisse posée devant le Tableau.
- Un tampon « Livré » s'abat, avec une secousse de 2 px.
- Le villageois vient chercher la caisse et salue. Son cœur de Liens se remplit d'un trait lumineux.

6. DÉPOSER DANS UN LOT (0,6 s par case)
- Les articles glissent dans les cases du parchemin de restauration. Chaque case complète se coche dans un nuage de poussière.
- La Pierre angulaire tombe lourdement (poussière, secousse de 3 px) au moment où la quête prioritaire est terminée.

7. CHANTIER, PUIS RÉOUVERTURE (2,5 s)
- Pendant le chantier, les échafaudages montent planche par planche et la couleur revient au rythme de la minuterie.
- À la fin, les échafaudages tombent, un fanion se déroule, et une charrette arrive par la route avec la famille.
- Le panneau « L'Orée · 8 habitants » défile comme un compteur mécanique.

8. FIN DE VISITE (1,2 s)
- La caméra recule de 8 %, la lumière s'adoucit, les villageois reprennent leurs trajets.
- La carte Prochaine quête revient au premier plan avec « Le village s'occupe du reste. »

MOUVEMENT RÉDUIT ET SON
- Avec prefers-reduced-motion : fondus de 150 ms, sans caméra, sans particules ni secousses. Chaque gain est annoncé en texte.
- Aucun son automatique. Le son s'active par choix explicite (Howler) : cloche du comptoir, grincement de la roue, crépitement du four.

### Technique

RENDU RECOMMANDÉ
- Le monde : PixiJS v8 dans un seul canevas WebGL. Pixi est chargé comme module ES depuis cdn.jsdelivr.net, en version figée, avec une carte d'import. Aucun build.
- Toute l'interface reste en DOM natif : HUD, feuilles, liste de quêtes, formulaires. Elle reste ainsi accessible, rapide et testable.

POURQUOI PIXI
- La gestion de village demande 100 à 200 objets vivants (10 villageois qui marchent, cultures en 3 stades, fumées, particules) et des filtres de couleur. La désaturation par bâtiment est la mécanique signature.
- Le DOM a montré ses limites dans 006 : régénération en innerHTML, rotation CSS cassée.
- three.js serait trop coûteux sur une tablette moyenne, pour un gain nul en 2D isométrique.
- Pixi apporte le rendu groupé de sprites (batching), ColorMatrixFilter, ParticleContainer et un ticker contrôlable, pour environ 150 à 200 Ko.

ART SANS GRAPHISTE : UN KIT ISOMÉTRIQUE PROCÉDURAL
- Des générateurs paramétriques dessinent en Graphics Pixi, à 3 tons par face : prisme, toit à deux versants, cylindre (silo, roue), dôme (four), cône d'épinette, grappe d'érable, clôture.
- Les dessins sont figés en textures (renderer.generateTexture), dans un atlas de 2048² au plus.
- Un bâtiment est une recette JSON : empreinte, hauteur, toit, couleurs, détails. L'IA peut en écrire une trentaine qui restent cohérentes entre elles.
- Les villageois sont des sprites de 24 px faits de formes simples, avec une marche en 4 images.
- Les portraits de dialogue sont 7 bustes SVG illustrés.

ARCHITECTURE (sans build, hébergement LiteSpeed/PHP)
- core/ : code pur, testé avec node --test.
  - Modules : indice.js, rewards.js, ledger.js, economy.js, recipes.js, orders.js (générateur à graine), lots.js, events.js, calendar.js, story.js.
  - Tests clés : boucle Terminer/Réactiver bloquée, plafonds quotidiens, aucun lot bloqué faute de Ferrures, rythme des chapitres pour les profils léger, moyen et intense (le chapitre 1 ne peut jamais finir avant 3 jours).
- render/ :
  - world.js : scène, caméra, profondeur = rangée + colonne ;
  - isokit.js : le kit procédural ;
  - fx.js : les effets.
- ui/ : HUD, feuilles, quêtes, comptoir, journal.
- data/ : recipes.json, chapters.json et lignes.fr-CA.json (au moins 4 variantes par texte récurrent).

DONNÉES ET SERVEUR
- tasks.json reste la source de vérité des tâches. Le schéma s'étend sans rien perdre : notes, deadline, subtasks[], recurrence, completedAt, archived. Les champs inconnus sont conservés et les identifiants ne changent jamais.
- game-state.json est un fichier séparé. Il contient l'inventaire, les bâtiments, les minuteries (horodatages ISO absolus), le registre de gains en ajout seul, les Liens et le chapitre.
- Plus de « Jour +1 » : le voyage dans le temps n'existe qu'avec ?debug=1. Si l'horloge recule de plus de 10 min, les minuteries gèlent au lieu d'accélérer.
- api.php reçoit des opérations idempotentes, identifiées par un op id. Il gère le verrouillage (flock), la révision optimiste et 30 sauvegardes quotidiennes. Il remplace tasks-api.php tout en restant compatible en lecture.
- PWA :
  - manifeste ;
  - service worker qui met en cache la coquille, Pixi et l'atlas ;
  - file d'opérations hors ligne dans IndexedDB.
- Une connexion par code unique sera ajoutée avant la mise en production.

PERFORMANCE MOBILE
- Rendu à la demande :
  - 60 i/s pendant une interaction ou un effet, 30 i/s pour l'ambiance ;
  - ticker arrêté sur visibilitychange et après 20 s d'inactivité.
- DPR plafonné à 2, carte de 16×16 cases, 80 particules au plus, rien n'est dessiné hors caméra.
- Budget : moins de 350 Ko gzip, Pixi compris. Premier affichage en moins de 2 s en 4G avec le cache.
- Appareils cibles : iPad 9e génération et Pixel 6a.
- Replis : rendu Canvas de Pixi si WebGL manque, sinon la Vue liste seule.

ACCESSIBILITÉ
- Une surcouche DOM place un bouton transparent sur chaque entité (aria-label « Moulin, restauré, 2 Farine prêtes »), dans un ordre de tabulation logique.
- La Vue liste du village (bâtiments, créneaux, minuteries, commandes) donne accès à tout le jeu sans le canevas.
- Cibles de 44 px, texte de 16 px. L'information n'est jamais portée par la couleur seule : toujours une icône, un mot et un motif.
- Les gains sont annoncés par aria-live.
- Zoom et recentrage ont leurs boutons : aucun geste caché.
- Son en option (Howler, 7 Ko), désactivé par défaut. Vibration seulement si navigator.vibrate existe (Android).

CALIBRATION DES CHIFFRES
- Deux scripts ont servi à vérifier les nombres de cette direction :
  - simulations/village-calibrage.mjs : Indice et récompense sur les 27 tâches du prototype ;
  - simulations/village-rythme.mjs : revenus sur 21 jours pour 3 profils.

### Les 60 premières secondes

0 À 2 s
- Écran titre « Quêtes du foyer », sur une aube brumeuse, pendant que le service worker sert Pixi et l'atlas. Aucun son.

2 À 6 s
- Fondu vers le village, plein cadre, tout en gris-cendre (désaturé à 75 %) : toits crevés, roue du Moulin immobile, Tour éteinte au sommet du mur du Bastion.
- Une seule cheminée fume, celle de l'Atelier. Quelques feuilles d'érable tombent.
- Panneau à l'entrée : « L'Orée · 4 habitants ».

6 À 14 s
- Solène arrive par le chemin (marche de 1,5 s). Sa bulle s'ouvre avec son portrait : « Alex ? Enfin. Je suis Solène. Depuis la tempête, la route de la vallée est coupée. On est quatre, avec trois parcelles et un moulin arrêté. »
- Bouton : Continuer.

14 À 22 s
- La caméra glisse vers la Tour (0,8 s).
- Milo : « Le Bastion, c'est pas un fort, c'est un relais. Ce que tu accomplis chez toi traverse la lisière. Ici, ça devient de l'Énergie. »
- Sous la bulle, une puce explique la règle : « Énergie : vient seulement de tes quêtes réelles. Sert à semer et à faire tourner les ateliers. »

22 À 30 s
- Une feuille monte : « Une chose déjà faite aujourd'hui ? »
- Quatre puces adaptées à l'heure (à 7 h : Préparer les lunchs, Vaisselle, Lessive, Autre…) et un bouton « Pas encore ».
- Alex touche « Préparer les lunchs » (domaine Enfants proposé, Durée 2), puis Terminer.

30 À 37 s
- L'élan : la puce s'envole en arc vers la Tour, la lisière s'allume en turquoise le long du mur, et la couleur revient autour de la Tour.
- Les compteurs bougent à l'arrivée des particules : Énergie 6 → 9, +1 Fil, Confiance 0 → 1.
- Message : « La lisière s'allume. Au village, quelqu'un l'a vue et l'a dit aux autres. »
- Avec « Pas encore », on passe directement à la prochaine quête réelle. La séquence de l'élan se jouera à la première quête terminée.

37 À 46 s
- Solène : « Bon. Avec ça, on sème. »
- La parcelle A pulse, avec un contour et le libellé « Semer · 1 Énergie ».
- Un toucher sur Blé (2 h) : les graines sautent dans les sillons et trois pousses sortent. Minuterie de 2 h ; Énergie 9 → 8.

46 À 54 s
- Le Tableau du comptoir s'éclaire sur une première commande : « Solène · 6 Blé → 1 Terreau + 2 Liens ».
- L'objectif du chapitre s'affiche en haut : « Le premier sillon · Restaurer le Moulin · 0/4 cases ».

54 À 60 s
- Fin de visite : la lumière s'adoucit. « Le blé pousse (2 h). Ta prochaine quête : “Réparer la porte du garage” · ~20 min · +3 Énergie, +1 Planche. »
- Boutons : Voir mes quêtes, Fermer.
- Toutes les vraies tâches importées sont là, intactes et triées par Indice.

### Une journée type

UN MARDI D'OCTOBRE, AU CHAPITRE 2, EN PROFIL MOYEN

MATIN
- 6 h 40, avec le café (75 s) :
  - Journal du matin, signé Solène : « Gel blanc sur les planches ce matin. J'ai couvert les semis avec les nappes de la cantine. Rien de perdu. » (+1 Énergie) ;
  - la Tour rend 5 Énergie gardées depuis samedi ;
  - Tout ramasser : 6 Blé et 2 Courges ont poussé pendant la nuit ;
  - 2 tournées de Moulin (2 Énergie) ;
  - Plan du jour (+2 Énergie) : « Quand je dépose les enfants, alors j'appelle le garage pour les pneus d'hiver. »
- 7 h 55, dans le stationnement de l'école (15 s) :
  - l'appel est fait (Véhicule, P8, Durée 1, échéance le 15 novembre) ;
  - Terminer rapporte +3 Énergie (dont 25 % pour une quête finie à temps), +1 Ferrure et +1 Sceau ;
  - c'est la première quête du jour : la lisière s'allume et la Confiance passe de 9 à 10 ;
  - Milo : « Des pneus d'hiver chez vous, une roue de moins qui patine ici. Je n'explique pas, je constate. » ;
  - la quête était de priorité ≥ 7 : la Pierre angulaire du Four tombe en place.

MIDI
- 12 h 10, au bureau (30 s) :
  - « Payer la facture d'Hydro » (Administratif, Durée 1) : +2 Énergie, +1 Sceau ;
  - Naïma : « Ce genre de travail, personne ne le remarque quand il est fait. Moi, si. » ;
  - au Tableau, la commande de Milo (1 Caisse, fabriquée la veille) est livrable. Livrer rapporte +3 Ferrures et +3 Liens. Fermer.

SOIR
- 17 h 45, retour de l'école (10 s) :
  - « Préparer le sac de hockey » (Enfants, Durée 2) : +3 Énergie, +1 Fil ;
  - rien d'autre à faire. L'écran affiche « Le village travaille · Moulin prêt · Four : lot 3/6 ».
- 20 h 40, enfants couchés (2 min) :
  - « Réparer la poignée de la porte-patio » (Maison, P6, Durée 5, Effort 4) : +6 Énergie, +2 Planches ;
  - dans l'Orée, 2 Planches, 1 Sceau et 6 Farine complètent le lot du Four (chantier de 8 h) ;
  - une Caisse est lancée à l'Atelier (2 Énergie) et 3 Courges sont semées pour la nuit (3 Énergie) ;
  - écran de fin : « Le four sera prêt demain matin. Les Tremblay arrivent avec la première fournée. » ;
  - Naïma : « Va te reposer. On s'occupe du reste. »
- 23 h : le comptoir ferme et les lanternes s'éteignent.

BILAN DE LA JOURNÉE
- 4 quêtes réelles, soit environ 1 h 20 de vrai travail, et +1 Confiance.
- Environ 4 min dans l'Orée, en 5 visites dont 3 de moins de 30 s.
- Le lendemain matin, une famille arrive en charrette.

### Ce qu’on garde de 006

À GARDER
- La palette agricole claire (ocre, sauge, bois blond, crème, verre solaire turquoise) et la règle de la braise, réservée aux menaces.
- La thèse « la carte est l'accueil » : le monde occupe la majorité du premier écran mobile.
- Le geste signature de l'élan (les gains quittent la quête pour rejoindre le monde), cette fois synchronisé avec les compteurs.
- La règle de Confiance : +1 à la première quête du jour, jamais dépensée, avec ses seuils et leur bénéfice affichés.
- Le casting et le lore, enfin rendus visibles : Solène, Milo, Naïma, ÉCHO-7, le Bastion des lisières comme relais, la Tour, les Archives, les « 184 cycles ».
- Le CRUD complet des quêtes, la recommandation recalculée à chaque modification, le titre en casse normale sur deux lignes.
- Le mode construction (choisir → placer → confirmer ; cases valides ou invalides signalées par motif et libellé ; clavier et glisser), recentré sur le décor et les nouvelles parcelles.
- La surcouche de boutons sémantiques par entité et la profondeur rangée + colonne.
- Les feuilles mobiles à 3 positions et l'inspecteur persistant sur tablette.
- Les marqueurs physiques d'incident, visibles tant que l'avis est actif, et les conséquences récupérables.
- prefers-reduced-motion et les cibles de 44 px.

À ABANDONNER
- Le bouton « Jour +1 », sauf en mode débogage.
- renderAll() en innerHTML.
- La rotation CSS 2D, les tuiles disjointes et le diorama flottant.
- La copie figée des tâches en localStorage.
- Le barème de récompense par paliers de Durée.
- Le jargon de prototype : sandbox, Registre local, fantôme aimanté.

### Risques

1) LE JEU VOLE LE TEMPS DES TÂCHES (le piège de Focus Plant)
- Parade :
  - l'Énergie ne vient que du réel et chaque geste en consomme ;
  - créneaux et minuteries limitent le jeu possible ;
  - la fin de visite est explicite ;
  - un rappel doux arrive après 5 min et le comptoir ferme la nuit ;
  - l'automatisation par les Liens réduit le temps de jeu au fil de la saison.
- Indicateur suivi : le ratio jeu/quêtes du Relevé d'ÉCHO-7. Cible : moins de 10 %. Au-delà de 15 %, le Mode sobre est proposé.

2) INFLATION DE TÂCHES TRIVIALES POUR GAGNER UN MATÉRIAU RARE (ajouter « vérifier les pneus » pour une Ferrure)
- Parade :
  - récompense dégressive à la minute et plafond « Fait au passage » ;
  - bonus d'ajout limité à 3 par jour et dégressif quotidien ;
  - Indice indépendant de la récompense ;
  - Ferrures aussi disponibles par les commandes et le troc.
- Tricher ne rapporte donc rien.

3) UN DOMAINE ABSENT BLOQUE LES LOTS (0 Ferrure en 14 jours dans la simulation)
- Parade : commandes pondérées vers le type le plus rare, troc 3 → 2, substitution après 7 jours, Condenseur.
- Les tests automatiques vérifient qu'aucun chapitre ne bloque avec un domaine à zéro.

4) UNE COMPLEXITÉ À LA HAY DAY TROP LOURDE POUR DES VISITES DE 10 s
- Parade :
  - 6 recettes en saison 1, au plus 2 étapes par chaîne ;
  - une recette débloquée par chapitre ;
  - Tout ramasser en un toucher et l'indice « Manque : … » sur chaque commande ;
  - la Vue liste.

5) SPIRALE PUNITIVE OU ANXIÉTÉ (expiration, perte, série)
- Parade :
  - aucune expiration, sauf le Convoi facultatif ;
  - avis jamais causés par l'absence ;
  - Énergie et Matériaux intouchables ;
  - retour bienveillant, sans compteur ;
  - jokers hebdomadaires.

6) SURJUSTIFICATION : des récompenses tangibles qui sapent la motivation intrinsèque
- Parade :
  - la base économique est fixe et prévisible, sans aucun tirage ;
  - la part variable est cosmétique (Plans de décor, scènes) ;
  - le Relevé d'ÉCHO-7 informe au lieu de payer : « 9 h 40 consacrées à votre foyer cette semaine ».

7) ÉCONOMIE EXPLOITABLE (Terminer/Réactiver, réévaluation, horloge)
- Parade : registre en ajout seul, évaluation figée 12 h avant la fin, minuteries gelées si l'horloge recule, tests node.

8) PRODUCTION D'ART HORS DE PORTÉE D'UN DÉVELOPPEUR SEUL
- Parade : kit isométrique procédural, une trentaine de recettes de bâtiments, villageois de 24 px. Le MVP se contente de 12 types de sprites.

9) PERFORMANCE ET BATTERIE SUR TABLETTE
- Parade : rendu à la demande, ticker en pause, DPR plafonné à 2, atlas unique, repli en Vue liste.

10) PERTE DE DONNÉES RÉELLES PENDANT LA MIGRATION
- Parade :
  - le jeu ne touche pas tasks.json (l'état de jeu est séparé) et les champs inconnus sont conservés ;
  - sauvegarde avant migration, registre d'opérations et 30 sauvegardes quotidiennes ;
  - tout changement de domaine demande une confirmation.

11) USURE DE LA NOUVEAUTÉ APRÈS LA SAISON 1
- Parade :
  - un calendrier réel : Halloween, première neige, Fêtes, poudrerie ;
  - des souhaits renouvelés chaque semaine et les révélations d'ÉCHO-7 ;
  - la saison 2, Le temps des sucres.

### Tranche jouable

TRANCHE JOUABLE : LE CHAPITRE 1 COMPLET, SUR LES VRAIES TÂCHES, EN 3 SEMAINES

SEMAINE 1 : le noyau et la boucle utilitaire, sans jeu visible
- core/ : indice.js, rewards.js, ledger.js, economy.js, recipes.js (Blé, Farine, Caisse), orders.js, lots.js, calendar.js.
  - Plus de 40 tests node --test : boucle Terminer/Réactiver, plafonds, évaluation figée, rythme des 3 profils, domaine à zéro.
- Adaptateur tasks.json : lecture et écriture par l'endpoint existant, champs inconnus préservés, migration des domaines avec feuille de confirmation.
- Onglet Quêtes : liste, tri et filtres historiques, ajout rapide, fiche (notes, échéance, sous-tâches), Réactiver, Archiver.
- Carte Prochaine quête : 3 recommandations, raison calculée, gains annoncés.
- État de jeu en localStorage, plus game-state.php (flock, sauvegardes).

SEMAINE 2 : le village jouable
- Pixi v8 et kit procédural, sur une carte de 14×14 cases :
  - terrain continu et ruisseau ;
  - 3 parcelles et 2 rochers ;
  - Atelier, Moulin (en ruine, puis restauré), Tableau du comptoir, Grenier ;
  - mur du Bastion avec la Tour.
- 3 villageois qui marchent : Solène, Milo, Naïma.
- Gestes : semer, récolter, moudre, fabriquer une Caisse, livrer, déposer dans le lot, Tout ramasser.
- Systèmes : 3 emplacements de commande avec générateur à graine, lot du Moulin, troc.
- HUD, surcouche d'accessibilité, Vue liste du village.
- Animations : élan, lisière, cultures, livraison, fin de visite, et désaturation des ruines.

SEMAINE 3 : le chapitre 1 et la finition
- Accueil en 3 moments, avec « Déjà faite ».
- Les 6 objectifs du chapitre, l'avis du Gel avec ses 3 réponses, l'arrivée de Naïma à 3 de Confiance.
- Chantier de 4 h, puis réouverture et première ligne d'ÉCHO-7.
- Journal du matin (8 variantes), bonus plafonnés, rappel doux, fermeture du comptoir.
- Lumière en 4 étalonnages selon l'heure.
- prefers-reduced-motion, manifeste et service worker de base.
- Essais en 390 × 844 et en 834 × 1112.

CRITÈRES D'ACCEPTATION
- La prochaine quête se lit en moins de 3 s et se termine en 2 touchers.
- Une visite après une quête dure en moyenne 90 s ou moins.
- Le chapitre 1 est impossible à finir en moins de 3 jours civils ; il demande 8 à 12 quêtes en profil moyen.
- Aucune ressource n'est infinie.
- Les tâches réelles sont intactes après 50 opérations.
- 60 i/s sur iPad 9e génération pendant l'élan.

HORS MVP (la saison 1 complète demande environ 8 à 10 semaines de plus)
- Four et Pain, Courge et Lanternes, Cuisine et Métier.
- Liens au-delà de ♥1, automatisations, souhaits.
- Chapitres 2 à 8, Convoi, Réserve d'hiver.
- Relevé d'ÉCHO-7, son, notifications, connexion par code.

### Effort

XL

## C-compagnon-expeditions · Fanal et la Galerie des lisières

### Pitch

Fanal, un petit automate-lanterne des Veilleurs, vit avec toi au pied du Bastion. Il travaille à tes côtés pendant que tu fais tes vraies tâches. Chaque quête terminée gonfle la voile de la Galerie, un rabaska-serre volant qu'il pilote la nuit pour reconnecter les hameaux coupés par la Grande Cendre. Au matin, il revient avec un récit, des graines, des matériaux et, de temps en temps, un fragment du mystère des six intendants qui t'ont précédé.

### Fantaisie

CE QU'ALEX INCARNE
Le 7e intendant de continuité de l'Orée : celui qui tient le fort.
- Le jeu ne lui demande pas de partir à l'aventure à la place de sa vie. Il épouse sa réalité de parent.
- Alex reste au Relais, l'atelier-serre et le quai au pied du Bastion, et prend soin du foyer. C'est ce soin qui fait voler la Galerie et voyager Fanal.

LA FANTAISIE CENTRALE : RENDRE VISIBLE LE TRAVAIL INVISIBLE
- Une brassée de lavage devient une caisse sur le pont.
- Une soirée de paperasse devient un raccourci sur la carte.
- Un rendez-vous chez le dentiste pour les enfants devient le récit d'un hameau rallumé.
La charge mentale devient une traversée. C'est un thème adulte, qui parle à un parent.

CE QU'ALEX RESSENT AU FIL DE LA JOURNÉE
- Le matin, la curiosité : la Galerie est rentrée, qu'est-ce qu'ils ont trouvé?
- Pendant l'effort, la présence : quelqu'un travaille à côté de moi, sans compte à rebours.
- Le soir, une satisfaction tranquille : larguer les amarres avec ce que la journée a donné.
- La nuit, la paix : le travail continue sans moi.

FANAL NE JUGE JAMAIS
- Il n'a pas faim. Il ne dépérit pas. Il n'est jamais triste d'avoir été oublié.
- Il est content quand Alex revient, point. C'est l'anti-Tamagotchi.

LE CONTRAT ÉMOTIONNEL
C'est la phrase clé de 006, rendue à un personnage. Fanal le dit au réveil : « Ce que tu accomplis ici devient notre capacité d'aller loin là-bas. »

L'ARC LONG
La vallée devient autonome. La fin de saison dit à Alex qu'il n'a pas à tout porter : la culpabilité zéro est inscrite dans l'intrigue elle-même, pas seulement dans le ton.

RÉFÉRENCES DE SENSATION
| Jeu | Ce qu'on en retient |
|---|---|
| Finch | Le compagnon part à l'aventure quand tu avances. |
| Spiritfarer | Le bateau-maison, l'équipage, les récits. |
| Neko Atsume | Ce qui arrive pendant ton absence. |
| Focus Friend | La présence pendant l'effort. |
| Cozy Grove | Le gris qui reprend couleur. |
| Animal Crossing | L'horloge réelle et les lettres. |

### Boucles

10 SECONDES : LA BOUCLE UTILITAIRE, INTACTE
1. Alex ouvre l'app. La carte « Ton cap du moment » est déjà sous le pouce, avec :
   - le Cap sur 100 ;
   - la durée estimée (« ≈ 10 min ») ;
   - le pourquoi en une ligne (« Prioritaire, courte, échéance jeudi »).
2. Il touche « Terminé ».
3. Le monde réagit :
   - un ruban d'élan part vers la voile ;
   - une caisse de la couleur du domaine tombe sur le pont ;
   - sur la mini-carte, la ligne de portée de ce soir s'allonge (« Ce soir : jusqu'à Pointe-aux-Herbes · 4 lieues ») ;
   - Fanal dit une phrase, une complétion sur trois seulement pour ne pas lasser.
4. La carte suivante monte.
Aucune décision de jeu n'est exigée.

2 MINUTES : DEUX RITUELS PAR JOUR, CHACUN DE 90 S AU PLUS, TOUS DEUX SAUTABLES
- Retour du matin (dès 6 h, réglable) :
  - la Galerie se pose ;
  - les caisses se déchargent une à une en butin : Matériaux, graine, Souvenir, Relevé ;
  - Fanal tend le récit de la nuit, une lettre de 80 à 150 mots ;
  - Alex plante une graine dans un pot du Relais (un toucher) ;
  - il peut lancer une amélioration de la Galerie ou livrer une commande de hameau.
- Départ du soir (fenêtre de 19 h à 2 h) :
  - l'écran « Larguer les amarres » montre 2 ou 3 destinations à portée, chacune avec son manifeste chiffré, par exemple « Moulin-Rompu · 3 lieues · ≈ 16 Mat · affinité Maison ×2 · récit du meunier » ;
  - la suggestion de Fanal est présélectionnée, avec la prévision de la vigie ;
  - un toucher lance l'animation de départ, puis « Bonne nuit, Alex. À demain. » ;
  - si Alex n'ouvre pas le soir, la Galerie part seule vers la suggestion à 22 h 30 (réglable).
- Plan de bord, en option le matin : 1 à 3 quêtes et une phrase « Quand…, alors… ».

1 JOURNÉE
- Le matin, le retour et le récit.
- Le jour, les quêtes, qui remplissent la voile et le pont, et le mode Côte à côte.
- Le soir, le départ.
- La nuit, la traversée, calculée à l'ouverture suivante.
Après le départ, l'écran annonce une fin de session explicite (« C'est assez pour aujourd'hui. ») sans rien bloquer.

1 SEMAINE
- Lundi, effet nouveau départ : « Nouvelle semaine de quart ». Rien ne rappelle la semaine d'avant.
- Semaine de quart : 4 jours actifs sur 7, n'importe lesquels, donnent le « Paquet de la semaine » (15 Mat, 1 Souvenir, +1 Confiance). Aucune série quotidienne n'est affichée.
- Dimanche soir, la Veillée : l'équipage se réunit autour du poêle pour un beat d'histoire d'environ 1 minute (arc d'un membre d'équipage). Suit un bilan informatif, par exemple : « 18 quêtes · ≈ 7 h d'ouvrage · Maison 7 · Terrain 5 · Enfants 3 · Véhicule 2 · Administratif 1 ». Il ajoute au plus une suggestion douce si un domaine dort, avec le bouton « Ajouter au plan de lundi ».
- Environ 1 commande de hameau sur 3 se termine chaque semaine.

1 SAISON (≈ 10 À 11 SEMAINES ; LA SAISON 1 VA D'OCTOBRE À MARS EN 8 CHAPITRES)
- Les chapitres durent de 1 à 3 semaines. Ils avancent par la Confiance (la présence) et par des objectifs, jamais par le volume brut.
- La carte s'étend par régions.
- Les hameaux gris reprennent couleur sur la carte et sont visibles à l'horizon du Relais.
- De 4 à 5 membres d'équipage sont recrutés, chacun avec un arc.
- ÉCHO-7 livre 6 révélations.
- Des événements datés suivent le calendrier québécois :
  - l'Action de grâce ;
  - la nuit des citrouilles ;
  - la première neige ;
  - le Réveillon de la Galerie le 31 décembre ;
  - la poudrerie ;
  - le Temps des sucres en saison 2.
- Ces événements arrivent à leur date, peu importe l'avancement. On ne les rate jamais : on les vit avec l'équipage présent.
- Les sessions longues de fin de semaine (10 à 15 min) servent à planifier les améliorations, choisir les commandes, relire le Carnet et explorer la carte.

### Tâches → jeu

PRINCIPE : séparer le RANG de la RÉCOMPENSE
Le rang dit quoi faire maintenant. La récompense paie l'effort. Une tâche bien classée ne rapporte pas plus qu'une autre.

1. RANG = LE « CAP » (0-100), AFFICHÉ « CAP 86 »
Le mot « priorité » reste réservé au vrai champ P.

Calcul :
- Base : 45·P/10 + 20·(11−L)/10 + 15·(11−D)/10, soit 80 au maximum.
- Échéance : +20 si elle est dépassée ou aujourd'hui ; +14 si elle tombe dans 2 jours ou moins ; +8 dans 7 jours ou moins.
- Ancienneté : +1 par 7 jours, au maximum +6.
- Mission en cours (Commencer) : +10.
- Plafond : 100.

Toucher le Cap l'explique ligne par ligne, par exemple : « Priorité 8 : +36 · Longueur 2 : +18 · Difficulté 3 : +12 · Échéance jeudi : +14 · Cap 80 ».

Trois recommandations sur l'accueil :
- Ton cap du moment : le meilleur Cap.
- Victoire rapide : le meilleur Cap avec L ≤ 3 et D ≤ 4, autre que la première.
- Grand chantier : la plus haute P avec L ≥ 6, avec un bouton « Découper ».
Garantie : si une tâche de P ≥ 8 existe, l'une d'elles occupe toujours un des trois emplacements. Sinon, elle remplace Grand chantier. C'est un garde-fou contre la dérive vers les victoires faciles.

Durée estimée dérivée de L :
| L | Durée affichée |
|---|---|
| 1 | ≈ 5 min |
| 2 | ≈ 10 min |
| 3 | ≈ 20 min |
| 4 | ≈ 30 min |
| 5 | ≈ 45 min |
| 6 | ≈ 1 h |
| 7 | ≈ 2 h |
| 8 | demi-journée |
| 9 | journée |
| 10 | plusieurs jours |

Filtres (puces de 44 px) : « 15 min » (L ≤ 3), « Peu d'énergie » (D ≤ 3), domaines, « Échéance cette semaine ».
Tris : Cap, Priorité, Longueur, Difficulté, Échéance. On retrouve ainsi toute la puissance de l'app historique.

2. RÉCOMPENSE = ÉLAN, FIGÉ
L'Élan est figé à Commencer. Sans démarrage, il est figé sur les valeurs 1 h après la création.

Formule : Élan = arrondi((6·√L + 2 si D ≥ 7) × (0,8 + 0,04·P)).

| Exemple | P | L | D | Élan |
|---|---|---|---|---|
| Payer une facture | 9 | 1 | 1 | 7 |
| Appeler l'assureur | 8 | 2 | 3 | 10 |
| Ramasser les feuilles | 6 | 6 | 4 | 15 |
| Poser les pneus d'hiver | 8 | 7 | 7 | 20 |
| Repeindre une chambre | 4 | 9 | 6 | 17 |

La racine carrée neutralise le gonflement : passer de L4 à L9 ne rapporte que 50 % de plus.

Bonus cumulables, plafonnés à +35 % :
- +20 % si la tâche est terminée avant l'échéance ;
- +10 % si elle est ouverte depuis 21 jours ou plus ;
- +15 % si elle était dans le plan de bord du jour.

3. CAISSES : LE PONT DIÉGÉTIQUE ENTRE LES DOMAINES ET LE MONDE
Chaque quête dépose 1 caisse de son domaine, plus 1 si L ≥ 5 et encore 1 si L ≥ 8. Elle porte l'icône et la couleur du domaine.

Conversion déterministe au retour :
| Domaine | Lieu à bord | Personnage | Une caisse donne |
|---|---|---|---|
| Maison | Atelier | Milo | 3 Mat |
| Véhicule | Hélices | Milo | 3 Mat |
| Terrain | Serre | Solène | 1 graine (2 Mat si la grainothèque est pleine) |
| Enfants | Vigie | Lou | 1 Souvenir |
| Administratif | Table à cartes | Naïma | 1 Relevé |
| Travail / autre | — | — | 2 Mat |

Trois Relevés ouvrent automatiquement un raccourci (−1 ou −2 lieues) ou un lieu caché.

Chaque destination affiche une affinité qui double un domaine. C'est la seule vraie décision quotidienne : « vu ma journée, où aller? ».

Migration des domaines : Jardin et Ferme deviennent Terrain, Professionnel devient Travail. L'original est conservé dans domainOriginal.

4. ÉCHÉANCES = « CORRESPONDANCES »
Les tâches à échéance dans 7 jours ou moins apparaissent sur la mini-carte comme un petit traversier qui affiche J−n.
- Terminée à temps : +20 % d'Élan et un timbre de correspondance au Carnet (retour informatif).
- En retard : aucune pénalité, rang +20. Fanal : « Elle est passée date. C'est correct : je l'ai mise en haut de la pile. »

5. SOUS-TÂCHES = « ÉTAPES », AVEC PROGRÈS DOTÉ
Découper est proposé dès L ≥ 5, ou quand une tâche prend plus de 2 fois sa durée estimée.
- Découper crée l'étape 0 « Décider de s'y mettre », déjà cochée.
- Chaque étape terminée verse 15 % de l'Élan figé, pour 3 étapes payées au maximum.
- La dernière étape verse le reste, plus 10 % de bonus « chantier mené à terme ».
- Le total est fixe : découper ne rapporte pas plus, seulement plus tôt.
- La tâche devient une petite route pointillée avec des balises.

6. RÉCURRENCES = « TOURNÉES » (↻)
- Une seule instance est active à la fois. Une instance manquée est remplacée, jamais empilée (« La tournée revient mardi, pas de rattrapage. »).
- Chaque instance a un id distinct (id#date), donc un seul crédit au registre.
- Élan ×0,8, une instance par tournée et par jour au maximum.
- Si une tournée prend régulièrement plus de 2 fois sa durée, Fanal propose d'ajuster sa longueur.

7. BONUS PLAFONNÉS HORS COMPLÉTION
| Action | Bonus | Plafond et condition |
|---|---|---|
| Ajouter une vraie quête (y compris par l'agent familial, annoncée comme « Courrier du quai ») | +2 Élan | 3 par jour ; versé quand la quête existe depuis 24 h ou est terminée, ce qui rend inutile d'ajouter puis supprimer |
| Plan de bord | +5 Élan | 1 par jour |
| Premier passage du jour, « le café de Fanal » | +3 Élan | 1 par jour |

Au maximum, ces bonus donnent 14 Élan par jour, moins que deux quêtes moyennes.
Règle d'or : la Galerie ne part que si au moins une vraie quête a été terminée depuis le dernier départ.

8. COMMENCER = « CÔTE À CÔTE »
Fanal fait la corvée miroir du domaine pendant qu'Alex fait la vraie :
- Maison : il balaie le pont ;
- Terrain : il rempote ;
- Véhicule : il graisse l'hélice ;
- Administratif : il trie des cartes ;
- Enfants : il plie des cerfs-volants avec Lou.
Commencer fige la récompense et ajoute +10 au Cap. Il n'y a volontairement aucune récompense matérielle, pour éviter la surjustification : le mode offre de la présence, du temps écoulé et un relevé informatif au Carnet (« 2 h 40 côte à côte cette semaine »).

### Économie

TROIS RESSOURCES, LE CONTRAT DE PRODUCT.MD RENOMMÉ DANS LE MONDE
- Élan (l'énergie)
  - Sources : les tâches réelles et les bonus plafonnés.
  - Puits : la distance des traversées, à raison de 10 Élan par lieue.
- Matériaux (Mat)
  - Sources : les traversées (récupération sur place et caisses converties) et le paquet de la semaine.
  - Puits : les modules de la Galerie, les commandes de hameaux et les réparations.
- Confiance (la réputation, jamais dépensée)
  - +1 à la première quête terminée dans la journée (journée de 4 h à 4 h) ;
  - +1 par semaine de quart ;
  - +2 par hameau reconnecté.
  - Elle ouvre les chapitres et l'équipage. Elle mesure la présence, pas le volume.

Les objets ne sont pas des monnaies à gérer :
- graines, puis récoltes (pots en heures réelles : Haricot 8 h, Tomate Savignac 24 h, Courge 36 h, Melon de Montréal 48 h) ;
- Souvenirs (étagère et commandes) ;
- Relevés (appliqués automatiquement) ;
- Récits et Fragments (le Carnet).

ÉTAT DE DÉPART
- Élan 0, Mat 0, Confiance 0 (elle n'est plus offerte d'emblée).
- Voile Nv1 : 6 lieues par nuit.
- Accumulateurs Nv1 : 20 Élan reportés.
- Cale Nv1 : 120 Mat.
- Pont : 10 caisses.
- Relais : 3 pots.

CARTE DE LA RÉGION 1, LA BASSE-LISIÈRE
| Destination | Distance | Récupération (1re visite / revisite) | Particularités |
|---|---|---|---|
| L'Anse-aux-Brumes | 2 lieues | 8 / 4 Mat | Haricot Thibodeau, affinité Terrain |
| Le Moulin-Rompu | 3 lieues | 12 / 6 Mat | affinité Maison |
| Pointe-aux-Herbes | 4 lieues | 6 / 3 Mat | Tomate Savignac, affinité Enfants |
| Sainte-Brume (hameau) | 6 lieues | 10 / 5 Mat | Milo, affinité Véhicule |
| Serre des Veilleurs | 7 lieues | — | Melon de Montréal ; exige la Voile Nv2 |
L'escale double (2 destinations dans la même nuit) s'ouvre au chapitre 2.

REVENU TYPE
- Une journée de 4 quêtes donne environ 50 Élan (5 lieues) et 6 caisses.
- Le retour rapporte environ 15 Mat, 1 graine et 1 Souvenir.
- Sur 5 nuits par semaine : environ 75 Mat, plus 15 du paquet, soit environ 90 Mat par semaine.
- Sur une saison : environ 1 000 Mat.

PUITS DE LA SAISON 1 (≈ 2 100 MAT, VOLONTAIREMENT AU-DELÀ DU REVENU POUR QU'IL FAILLE CHOISIR)
| Module | Coût | Effet |
|---|---|---|
| Voile | Nv2 60, Nv3 140, Nv4 260 | 8, 10, 12 lieues |
| Accumulateurs | Nv2 40, Nv3 100 | 40, 60 Élan reportés |
| Cale | Nv2 50, Nv3 120 | 200, 300 Mat |
| Serre de coque | 30, puis 70, puis 150 | 4, 5, puis 6 pots |
| Cabines | 25, 45, 70, 100 | une par membre d'équipage |
| Poêle à bois | 70 | nuits de gel dès le chapitre 3 |
| Longue-vue | 60 | prévision à 2 jours et lieux cachés |
| Lanterne de proue | 90 | ignore la brume |

Autres puits :
- commandes de hameaux : 3 par hameau, environ 60 Mat et des objets mixtes chacun, sur 8 hameaux ;
- réparations : 10 à 15 Mat.

Règle d'équilibrage : ce qui est indispensable à l'histoire coûte au plus environ 60 % du revenu attendu. Repères : 40 Mat au chapitre 1, 155 au chapitre 2, 190 au chapitre 3. À demi-régime (2 quêtes par jour), Alex finit donc l'histoire. Le reste est du confort et de l'optimisation.

PLAFONDS : RIEN NE S'ACCUMULE SANS DÉBOUCHÉ
- Élan au-delà de la portée de la nuit et de la réserve : il devient de la « Lumière ».
  - Elle n'a aucune valeur d'échange : le fanal brille plus fort et le Carnet note « Journée lumineuse ».
  - La grosse journée est reconnue de façon informative, sans gonfler l'économie.
- Mat au-delà de la Cale : le surplus est livré automatiquement à la commande de hameau active (« Surplus livré à Sainte-Brume : 6 Mat »).
- Plus de 10 caisses : elles attendent sur le quai la nuit suivante, sans perte.
- Récoltes : elles ne pourrissent jamais.

ANTI-FARMING : LES BOGUES DE 006 NEUTRALISÉS
1. Registre en ajout seul : un crédit par id de tâche, à vie. Terminer, réactiver puis terminer de nouveau affiche « Déjà inscrite au Carnet » et donne 0 Élan.
2. Évaluation figée. Gonfler L après coup ne change rien.
3. Le jour est la date locale réelle. Le bouton « Jour +1 » n'existe qu'avec ?debug=1, sur un état de jeu séparé.
4. Les traversées se font en temps réel, une par nuit. Le rattrapage couvre au plus les 2 dernières nuits ; au-delà, l'Élan va à la réserve, qui reste plafonnée.
5. Bonus hors tâche : 14 par jour au maximum, et aucun départ sans vraie quête.
6. Les tirages (aléas, variantes de récits) utilisent la graine hash(date + destination). Rouvrir l'app ne relance rien.

ALÉAS : RÉCUPÉRABLES, ANNONCÉS, 2 ACTIFS AU MAXIMUM
Fréquence :
- 15 % par nuit, plus 10 % par domaine négligé, avec un plafond de 40 %.
- Un domaine est négligé quand aucune quête n'y a été terminée depuis 10 jours alors qu'une tâche de P ≥ 6 y attend.
- Jamais deux nuits de suite, jamais avant le jour 8.

La vigie les annonce la veille, avec 3 réponses : payer (10 à 15 Mat), contourner (+1 ou +2 lieues) ou accepter une perte virtuelle (−30 % de la cargaison de la nuit).

Avaries :
- Avec une avarie, la portée baisse de 2 lieues jusqu'à la réparation. L'ignorer n'est donc jamais optimal.
- Chacune se répare avec des Mat ou en terminant n'importe quelle vraie quête du domaine lié :
  - voile éraflée : Maison ;
  - hélice grippée : Véhicule ;
  - cartes détrempées : Administratif ;
  - semis renversés : Terrain ;
  - cerf-volant coincé dans le gréement : Enfants.

Il existe aussi des aléas positifs, comme le Vent arrière (+2 lieues gratuites).
Au jardin : une récolte mûre laissée plus de 48 h attire les altises (−1 récolte), ce qui se règle avec 3 Mat ou une quête Terrain.
Le Bastion défend : chaque Fragment ajoute une lentille au phare. Au niveau 2 (après le Fragment 3), il dissipe un aléa annoncé par semaine (« Le phare a dissipé le front de cendre. »).

### Narration

PRÉMISSE (bible conservée)
Le produit s'appelle Quêtes du foyer ; le monde, c'est l'Orée.
- La Grande Cendre a coupé les hameaux de l'Orée les uns des autres.
- Sur la falaise de la lisière se dresse le Bastion, l'enceinte des Veilleurs. Son phare est un relais : chaque geste de soin accompli dans le foyer réel traverse la lisière sous forme d'élan.
- Au pied du Bastion, le Relais (atelier-serre et quai) abrite deux choses endormies depuis 184 cycles : Fanal et la Galerie.
- Alex est le 7e intendant de continuité. L'Orée n'exige rien, elle répond.
- La Galerie est un rabaska volant, un hommage discret à la chasse-galerie, sans pacte ni diable.
- Fanal, sur le clin d'œil : « La vieille histoire dit qu'il faut jamais sacrer à bord. Je sais pas ce que ça veut dire. Je fais attention pareil. »

PERSONNAGES
- Fanal, automate-lanterne et pilote.
  - Il a la hauteur d'une chaise. Sa tête de verre abrite la « mèche verte », une pousse lumineuse à la place d'une flamme.
  - Il tutoie, fait des phrases courtes, a un humour littéral et ne fait jamais de reproches.
  - Arc : il a oublié ses intendants précédents « exprès, pour avoir moins de peine ».
- Solène Ardent, agronome de l'Anse-aux-Brumes (Terrain). Les bacs et les graines.
- Milo Kern, mécanicien de Sainte-Brume (Maison, Véhicule). Les modules et les réparations.
- Naïma Sorel, cartographe des Hauts-Fonds (Administratif). Les Relevés et les raccourcis.
- Lou, 11 ans, passagère clandestine (Enfants). La vigie et les Souvenirs.
- Ambroise Lévesque, vieux convoyeur du traversier (Échéances, les Correspondances). Il a connu la 6e intendante.
- ÉCHO-7, mémoire des Archives sous le Bastion. Elle vouvoie Alex et révèle le mystère en 6 temps.

CHAPITRE 1 : « LE FANAL SE RALLUME » (≈ 5 au 14 octobre, gel matinal ; au moins 5 jours actifs)
1. Rallumer Fanal : terminer une vraie quête. Fanal : « Ah ben. T'es là. Moi, c'est Fanal. Ça faisait 184 cycles que personne avait rallumé la lisière. »
2. Gonfler la voile : atteindre 20 Élan, soit environ 2 quêtes. La bâche tombe.
3. Premier départ vers l'Anse-aux-Brumes (2 lieues). Cette nuit-là est garantie sans aléa.
4. Premier retour : le récit « Les quais de l'Anse » et la plantation du premier Haricot Thibodeau, prêt en 8 h.
5. Réparer la cabine avant : 25 Mat, environ 2 retours.
6. La commande de Solène : Confiance 3, 4 haricots et 15 Mat.
   - Solène : « Je monte. Mais c'est moi qui m'occupe des bacs. Ton automate arrose comme un orage. »
   - Fanal : « C'est vrai. »
7. Finale à Confiance 5. Le phare du Bastion clignote pour la première fois. ÉCHO-7, en texte qui se résout caractère par caractère : « Signal reçu. Identification impossible. Fonction reconnue : intendant de continuité. Vous êtes en retard de 184 cycles. »
   - Fanal : « Moi aussi, j'étais en retard. On va se rattraper ensemble. »
   - Carte de fin : « Chapitre 1 · 8 jours · 21 quêtes · ≈ 9 h d'ouvrage · Une route rouverte. »
   - Le 12 octobre, jour de l'Action de grâce, Fanal fait un premier « souper de récolte » avec les haricots.

CHAPITRE 2 : « ROUGEOIEMENT » (≈ 14 octobre au 2 novembre, érables cuivrés)
- Milo arrive à Confiance 8 : « Ta voile est cousue avec du fil à pêche. Je dis ça, je dis rien. » Il débloque la Voile Nv2 (60 Mat) et la cabine 2 (45 Mat).
- Sainte-Brume a 3 commandes :
  - Toits : 40 Mat ;
  - Potager communal : 4 haricots et 2 tomates Savignac ;
  - Lanternes : 2 Souvenirs et 10 Mat.
  Une fois reconnecté, le hameau reprend couleur, son clocher sonne et Alex gagne +2 Confiance.
- Premier aléa annoncé : « Vigie : front de cendre demain soir sur la route de Sainte-Brume. »
- L'escale double se débloque.
- Événement daté du 31 octobre, « La nuit des citrouilles » :
  - si une courge a été récoltée, Fanal sculpte une lanterne ;
  - sinon, il sculpte un navet : « C'est une tradition plus vieille. Je pense. »
- Finale à Confiance 14 et Sainte-Brume reconnecté. Fragment 2, trouvé dans le grenier de la chapelle : un registre de six intendants aux noms effacés.
  - ÉCHO-7 : « Six entrées, six relais éteints. Septième entrée : active. Note jointe, auteur inconnu : “Ne porte pas tout.” »
  - Fanal : « Je les ai peut-être connus. C'est bizarre, oublier quelqu'un qui t'a appris à voler. »

CHAPITRE 3 : « PREMIÈRE NEIGE » (novembre)
- Naïma arrive à Confiance 18 : « Une carte, c'est une promesse qu'on peut revenir. Donne-moi trois relevés, je te donne un raccourci. »
- Le gel s'installe : sans poêle à bois (70 Mat), la portée tombe à 4 lieues les nuits de gel annoncées. Il n'y a pas de blocage.
- Une caisse Enfants éternue.
  - Fanal : « Alex… y'a une caisse qui éternue. »
  - C'est Lou : « J'ai rien volé. J'ai juste voyagé sans payer. »
  - Elle dort dans le hamac, sans cabine requise. Elle révèle des lieux secrets sur la carte.
- Objectif : atteindre le Phare des Hauts-Fonds, à 8 lieues. Il faut la Voile Nv2 et un raccourci, ou une escale double.
- Finale à Confiance 24, phare atteint et poêle posé. Fragment 3 : dans le phare, une lanterne identique à Fanal, éteinte, sa pousse séchée. Fanal reste immobile 3 secondes.
  - ÉCHO-7 : « Unité FANAL-6 : hors service. Unité FANAL-7 : vous l'avez rallumée. »
  - Fanal : « Donc moi aussi, je suis le septième. On fait une belle paire. »

ARC LONG DE LA SAISON 1
| Chapitre | Titre | Période | Contenu |
|---|---|---|---|
| 4 | La Galerie du Réveillon | décembre | Ambroise et les Correspondances. Le 31 décembre, grand vol pour ramener tout le monde au Bastion (hommage à la chasse-galerie). Révélation 4 : l'inscription de proue « On rentre toujours » est de la main de la 6e intendante, Geneviève, qu'Ambroise a connue. |
| 5 | Poudrerie | janvier | Nouvelle carte du 1er janvier (effet nouveau départ) ; région des Hauts du Nord. |
| 6 | Le grand froid | fin janvier et février | Révélation 5 : Geneviève a voulu porter seule toute la vallée, chaque nuit, sans relâche ; la Grande Cendre est ce qui reste quand une seule personne s'épuise ; les hameaux avaient cessé d'aider. Mission : chaque hameau bâtit son propre petit relais. |
| 7 | Redoux | février | Clin d'œil au Carnaval. Les arcs d'équipage se concluent. |
| 8 | L'Orée vivante | mars | Révélation 6 : la vallée nourrit sa propre lisière. ÉCHO-7 passe enfin au tutoiement : « Tu peux te reposer, Alex. On continue. » |
La saison 2, « Le Temps des sucres », passe de « réparer » à « prospérer ».

RÈGLES D'ÉCRITURE
Glossaire fermé :
- Quête, Cap, Élan, Matériaux, Confiance ;
- Lieue, Caisse, Traversée, Relais, Galerie ;
- Hameau, Commande, Récit, Fragment ;
- Tournée, Correspondance, Étape.
Règles de ton :
- Tutoiement partout, sauf ÉCHO-7.
- Répliques de Fanal de 20 mots au plus.
- Zéro « tu aurais dû ».
- Pools de 6 à 10 variantes par situation.
- 40 récits uniques et 60 variantes gabarits pour la saison.

Exemples de répliques par domaine :
- Maison : « Une maison qui tient, c'est une Galerie qui vole. »
- Enfants : « Lou dit que ça compte double. J'ai dit non. Elle a dit oui. »
- Administratif : « Un papier de moins dans le monde. Naïma l'aurait encadré. »
- Véhicule : « Un pneu de serré, une hélice de moins à surveiller. »

Retour après une absence : « Te v'là! J'ai verni le plat-bord. Pas de presse : on repart quand tu veux. »
Soir sans quête : « Pas de traversée cette nuit. J'ai rempoté les semis et regardé passer les outardes. C'était bien aussi. »

### Direction visuelle

« CLARENCE GAGNON RENCONTRE SPIRITFARER »
- Les aplats chauds et les formes douces des illustrations de Maria Chapdelaine par Clarence Gagnon : villages, neige bleutée, maisons colorées.
- Le canot volant de la Chasse-galerie d'Henri Julien, en clin d'œil.
- La chaleur du bateau-maison de Spiritfarer.
- Un agro-futurisme réparé : bois blond, laiton patiné, écorce de bouleau stylisée, côtes de verre solaire turquoise. Jamais de néon ni de faux terminal.

L'ÉCRAN PRINCIPAL N'EST PLUS UNE CARTE ISOMÉTRIQUE
C'est une scène de profil en 2D, avec 4 plans de parallaxe :
- à gauche, l'atelier-serre de Fanal : établi, 3 pots, poêle, étagère à Souvenirs, carte épinglée ;
- à droite, le quai et la Galerie amarrée au bord de la falaise ;
- en contrebas, la vallée dans la brume, où les hameaux reconnectés s'allument au loin : la progression se voit depuis la maison ;
- en haut à gauche, la tour du Bastion et son phare.

Mise en page :
- Mobile (390×844) :
  - la scène occupe de 0 à environ 400 px (≈ 47 % de l'écran) ;
  - un HUD mince est superposé : Voile, Mat, Confiance, heure ;
  - la feuille de quêtes a trois positions (aperçu de 150 px avec « Ton cap du moment », mi-hauteur, plein écran) ;
  - les onglets sont Relais, Quêtes, Carte et Carnet.
- Tablette en paysage : la scène prend 60 % à gauche, les quêtes 40 % à droite.

PERSONNAGES
- Fanal :
  - corps-tonneau de frêne cerclé de laiton, bras fins, pieds à trois orteils ;
  - tête-lanterne hexagonale où brille la mèche verte ;
  - ses yeux sont deux reflets sur le verre, avec 6 formes (points, arcs, traits, étoiles) : très expressif avec presque rien ;
  - une tuque rayée en hiver.
- La Galerie :
  - un rabaska de 11 m en écorce, membrure de frêne, verrière turquoise sur toute la longueur ;
  - des bacs de culture le long du plat-bord ;
  - une voile en toile cirée crème, cousue de cuivre ;
  - deux hélices de bois et une lanterne de proue ;
  - l'inscription de proue « On rentre toujours ».
- L'équipage est dessiné en silhouettes plates à la Gagnon, avec des postures lisibles.

PALETTE (les jetons de 006 sont conservés)
| Usage | Couleurs |
|---|---|
| Interface | papier #fff8e8, crème #f7e7bd, encre #273026, sauge profonde #3f6047 pour les actions, verre solaire #58a9a4 / #2d7473 |
| Monde de jour | lumière #f3c879, sauge #718c5d, terre #aa6c43 / #75472f |
| Automne | cuivre d'érable #c9792f, grenat #7d2f3a, ocre #d9a441 |
| Hiver | neige #f4f1ea, ombre bleue #9fb3c8 |
| Nuit (scène seulement, jamais l'interface) | bleu de lisière #24324a, indigo #1b2238, lueur de fanal #ffd27a |
| Menaces seulement | braise #bf5a38, toujours avec hachures et pictogramme |

Les domaines ont toujours une icône en plus de la couleur :
- Maison : bois blond #c79a5b ;
- Terrain : sauge ;
- Enfants : ocre-soleil #e0a63a ;
- Véhicule : #2d7473 ;
- Administratif : encre bleue #3d5a80 ;
- Travail : pierre #8a8577.

Typographie et texture :
- Fraunces pour les titres, Atkinson Hyperlegible pour le texte (16 px, coûts en 14 px au minimum).
- Grain papier à 6 % et ombres au pied des objets.

LUMIÈRE RÉELLE
- L'heure locale pilote le ciel (aube, jour, crépuscule, nuit) à partir d'une table de lever et de coucher du soleil par mois pour le Québec.
- La saison pilote le feuillage et la neige.

MOMENTS SIGNATURE
- Le premier rallumage : la couleur revient dans tout le décor.
- Le départ sous la lune.
- La lettre de l'aube qui se déplie.
- Le hameau gris qui reprend couleur.
- ÉCHO-7 sur fond papier, sans écran noir.
- Le vol du Réveillon du 31 décembre : en plein écran, la Galerie survole un village enneigé à la Gagnon, avec tout l'équipage à bord.

### Animations signature

LES 8 ANIMATIONS
| # | Animation | Durée |
|---|---|---|
| 1 | Le ruban d'élan | ≤ 1,6 s, non bloquant |
| 2 | La lanterne qui respire | cycle de 10 s |
| 3 | Larguer les amarres | ≤ 4 s, sautable |
| 4 | Le retour à l'aube | ≤ 6 s, sautable |
| 5 | Le hameau reprend couleur | 1,5 s |
| 6 | Côte à côte | continu pendant l'effort |
| 7 | Le rattrapage du temps | 1,5 s |
| 8 | La révélation d'ÉCHO-7 | 3 s au maximum |

1. LE RUBAN D'ÉLAN (au toucher de « Terminé »)
- La carte se tamponne « Fait » : 180 ms, échelle 1 → 0,97 → 1.
- Un ruban lumineux, animé en stroke-dashoffset sur une courbe de Bézier, file vers le mât en 700 ms (ease-out).
- À l'arrivée seulement, la voile se gonfle d'un cran (morph entre 5 courbures, ressort de 400 ms) et le compteur défile en 300 ms. Cela corrige le bogue des compteurs qui sautaient avant l'arrivée des particules.
- Une caisse du domaine tombe sur le pont (250 ms), puis s'écrase légèrement (90 ms).
- Fanal tourne la tête vers elle.
- La ligne de portée de la mini-carte s'allonge (400 ms).

2. LA LANTERNE QUI RESPIRE
- Le halo de Fanal pulse en cycles de 10 s, soit 6 respirations par minute, avec une amplitude de 6 %.
- Il s'intensifie avec la Lumière du jour.
- En mode Côte à côte, ce rythme sert d'ancre de respiration discrète.

3. LARGUER LES AMARRES
- La bâche glisse.
- Trois amarres se décrochent en cascade, à 120 ms d'écart.
- La voile se déploie en 600 ms.
- La Galerie s'élève de 40 px avec un léger tangage, traverse le disque de la lune, puis devient un point lumineux qui file sur la mini-carte.

4. LE RETOUR À L'AUBE
- La Galerie descend en parallaxe.
- Les caisses sont déchargées une à une et s'ouvrent en icônes de butin qui volent vers le HUD. Le compteur monte à l'impact.
- Fanal tend une lettre qui se déplie en trois plis.

5. LE HAMEAU REPREND COULEUR
- Un masque circulaire révèle la version saturée du hameau à partir du clocher.
- La fumée sort des cheminées et les fenêtres s'allument en séquence.
- À l'ouverture suivante, un écho discret apparaît à l'horizon du Relais.

6. CÔTE À CÔTE (au toucher de « Commencer »)
- Léger travelling vers Fanal : échelle 1 → 1,15 en 800 ms.
- Fanal joue une boucle de corvée propre au domaine : 8 poses à 12 images par seconde.
- Toutes les 10 minutes environ, il change de micro-geste : il s'essuie le front, il te regarde.
- Il n'y a jamais de compte à rebours.

7. LE RATTRAPAGE DU TEMPS (première ouverture du jour)
- Le ciel passe de l'état vu la dernière fois à l'heure réelle.
- Les pousses grandissent jusqu'à leur vrai stade.
- Alex voit ce qui a changé au lieu de le lire.

8. LA RÉVÉLATION D'ÉCHO-7
- Le phare clignote.
- Le texte apparaît en glyphes brouillés qui se résolvent à 40 ms par caractère.
- La lanterne de Fanal vacille en réponse.

COMPORTEMENT COMMUN
- Avec prefers-reduced-motion, chaque animation devient un fondu de 150 ms ou un état instantané, annoncé dans la région aria-live.

### Technique

RENDU RECOMMANDÉ : SVG POUR LE MONDE, DOM/CSS POUR L'INTERFACE, CANVAS 2D OPTIONNEL POUR LES PARTICULES. AUCUN MOTEUR DE JEU.

POURQUOI CE CHOIX
- L'art en aplats est vectoriel par nature : net à toute densité d'écran, léger (scène de 150 Ko au plus), recolorable par variables CSS sur les stop-color. Jour, nuit et saisons ne dupliquent pas l'art.
- Il n'y a que 3 vues (Relais, Carte, Côte à côte) et un seul personnage articulé. PixiJS (150-200 Ko, accessibilité à refaire) ou three.js (voxels inutiles, coûteux sur mobile) ne se justifient pas.
- Les éléments interactifs (pots, Galerie, nœuds de carte) sont de vrais boutons superposés ou des groupes SVG role=button tabindex=0. Clavier et lecteurs d'écran fonctionnent sans travail supplémentaire.

ANIMATION
- Web Animations API, sur transform et opacity uniquement.
- La voile est un morph entre 5 chemins précalculés ayant le même nombre de points.
- Le ruban utilise stroke-dashoffset.
- Le retour de la couleur passe par un masque SVG.
- choreo.js, environ 80 lignes, enchaîne les séquences et garantit que les compteurs ne montent qu'à l'impact.

INTERFACE
- renderAll() en innerHTML est remplacé par un rendu à clés.
- Je recommande Preact et htm, vendorisés dans /vendor (≈ 5 Ko gzippés, sans build, en imports ES), pour les feuilles, la liste et les formulaires.
- La scène reste impérative : un objet Scene expose setSail(), dropCrate(), setTimeOfDay() et playDeparture().

ARCHITECTURE
- core/ pur, testé avec node --test :
  - rank.js : le Cap ;
  - reward.js : Élan et caisses ;
  - ledger.js : registre en ajout seul et idempotence ;
  - clock.js : journée de 4 h à 4 h, fenêtres de départ et de retour, heure d'été ;
  - voyage.js : résolution paresseuse et déterministe ;
  - migrate.js : passe-plat de tout champ inconnu (deadline, notes, subtasks, recurrence ; archived reste archived).
- content/ contient les chapitres, récits et répliques comme données pures.
- tasks.json reste la vérité des tâches. Il est étendu de façon rétrocompatible avec l'app historique.
- game-state.json est séparé.
- Phase 2 :
  - api.php d'opérations (op=complete|add|edit|depart) avec révision attendue, flock et journal ;
  - PWA : manifeste, service worker, file d'opérations hors ligne ;
  - connexion par code.
- Aucun cron n'est nécessaire. La nuit se résout à l'ouverture, comme une fonction pure de (instantané de départ, destination, graine). Si Alex n'a pas ouvert l'app le soir, le départ automatique est reconstruit à partir des entrées du registre antérieures à 22 h 30.
- Les notifications sont hors du MVP : il n'existe pas de minuterie locale fiable sans push. Plus tard, Web Push via PHP, en option.

PERFORMANCE MOBILE (cible : 60 images/s sur un iPhone 11 ou un Pixel 6a)
- Moins de 400 nœuds SVG, aucun filtre animé. Le grain est une tuile PNG de 64 px.
- L'idle de Fanal tourne à 12 images/s en échangeant des <use>.
- Une seule boucle requestAnimationFrame, suspendue si document.hidden, si la feuille est en plein écran ou si la scène sort de l'écran (IntersectionObserver).
- 60 particules au maximum, désactivées sous 4 cœurs ou en mouvement réduit.
- Premier chargement sous 400 Ko : JS de l'app de 120 Ko gzippés au plus, polices locales en sous-ensemble latin de 80 Ko au plus. Cela corrige la police jamais chargée de 006.
- content-visibility sur la liste des quêtes.

ACCESSIBILITÉ
- La scène a un jumeau texte en aria-live polite : « Fanal rempote. Voile : 44 Élan, 4 lieues ce soir. 3 caisses sur le pont. »
- Tout geste a un bouton, et toute séquence a un bouton « Passer ».
- Cibles de 44 px, contrastes AA, couleur toujours doublée par une icône ou des hachures.
- Aucun son automatique. L'ambiance (poêle, vent, cordages) s'active sur demande, par un simple élément audio ou Howler (7 Ko).
- navigator.vibrate(12) sur Android seulement (rien sur iOS).
- Wake Lock facultatif en mode Côte à côte.

### Les 60 premières secondes

Première ouverture, lundi 5 octobre, 19 h 12.

| Temps | Ce qui se passe |
|---|---|
| 0:00 | Écran crème pendant 300 ms, puis le Relais au crépuscule réel, presque désaturé (15 %). La Galerie dort sous une bâche, Fanal est assis, lanterne éteinte. En haut, « L'Orée · lundi 5 octobre ». Pas de HUD. |
| 0:02 | Encadré papier : « La Grande Cendre a coupé les hameaux de l'Orée les uns des autres. Au pied du Bastion, un fanal attend qu'on le rallume. » Boutons [Continuer] [Passer]. |
| 0:07 | « Ici, rien ne bouge tout seul. Chaque geste que tu poses chez toi, un appel, une brassée, un pneu, traverse la lisière et devient de l'élan. » Un ruban témoin traverse l'écran vers la lanterne et s'éteint avant de l'atteindre. |
| 0:12 | La feuille monte à 50 %. Carte « Ton cap du moment » : une vraie tâche d'Alex, par exemple « Sortir le bac de récupération · ≈ 5 min · Facile · Priorité 8 · Maison · Cap 84 », avec le pourquoi « Prioritaire, courte et facile ». En dessous, deux mini-cartes (Victoire rapide, Grand chantier) et « + Ajouter une quête ». Bulle : « Pour rallumer le fanal, termine une vraie quête. Celle-ci, ou une autre. » |
| 0:18 | Alex l'a déjà faite ce matin et touche « Terminé ». S'il avait touché « Commencer », la lanterne aurait lâché une étincelle, Fanal aurait dit « …Mm? Y'a quelqu'un? » et la carte serait passée en mode mission. |
| 0:19 | Tampon « Fait », ruban de 700 ms jusqu'à la lanterne qui s'allume. La couleur revient en 1,2 s, en vague radiale partie du fanal : érables cuivrés, quai, vallée. Fanal se lève et s'étire pendant 1 s. |
| 0:24 | Fanal : « Ah ben. T'es là. Moi, c'est Fanal. Ça faisait 184 cycles que personne avait rallumé la lisière. » [Enchanté] |
| 0:30 | La bâche glisse. Fanal : « Ça, c'est la Galerie. Elle vole à l'élan. Ce que tu accomplis ici devient notre capacité d'aller loin là-bas. » Une caisse Maison tombe sur le pont. La jauge de voile apparaît : « 9 / 20 Élan pour se rendre à l'Anse-aux-Brumes cette nuit ». Cela fait 7 pour la quête et 2 pour le café de Fanal. |
| 0:40 | Le HUD s'affiche avec ses étiquettes : « Élan 9 · Mat 0 · Confiance 1 ». Toucher Confiance affiche : « +1 la première fois que tu termines une quête dans une journée. Ça mesure ta présence, pas ton volume. » |
| 0:47 | Bande d'objectifs : « Maintenant : encore ≈ 1 ou 2 quêtes · Ce soir : premier départ · Chapitre 1 : Le fanal se rallume ». |
| 0:52 | Fanal : « Pas de presse. Je vais dépoussiérer le pont. Fais-moi signe quand t'as fait une autre affaire. » Il part balayer. La feuille montre la quête suivante. |
| 0:60 | Rien d'autre n'est imposé. Alex peut fermer l'app. S'il revient avant 2 h avec la voile à 20, il verra le premier départ. Sinon, la voile attend demain, sans perte. |

### Une journée type

Une journée type d'Alex, au chapitre 2 : environ 4 minutes dans l'app, réparties sur 6 visites.

| Heure | Durée | Moment |
|---|---|---|
| 6 h 48 | 40 s | Retour du matin |
| 7 h 10 | 25 s | Plan de bord |
| 9 h 05 | 8 s | Quête terminée |
| 12 h 20 | 6 s | Victoire rapide du dîner |
| 17 h 30 et 18 h 35 | 20 s | Côte à côte |
| 20 h 40 | 70 s | Départ du soir |

Exemple : mardi 20 octobre.

6 H 48 : LE RETOUR DU MATIN, AU CAFÉ
- En 1,5 s, le ciel passe de la nuit à l'aube et la Galerie se pose.
- Les caisses de la veille se déchargent :
  - Moulin-Rompu, récupération sur place : +12 Mat ;
  - 2 caisses Maison, doublées par l'affinité : +12 Mat ;
  - 1 caisse Terrain : graine de courge ;
  - 1 caisse Administratif : Relevé 2/3.
- Total : +24 Mat, pour un stock de 71/120.
- Fanal tend « Le meunier qui comptait les étoiles » : « Il en manque trois, d'après lui. Je l'ai pas contredit. »
- Le café de Fanal donne +3 Élan.
- Alex plante la courge dans un pot : « Prête jeudi, 18 h ».

7 H 10 : LE PLAN DE BORD
- Alex choisit 3 quêtes et écrit : « Quand je reviens de la garderie, alors j'appelle l'assureur. »
- Le plan donne +5 Élan.
- Fanal : « Noté. Garderie, puis assureur. Je garde le crayon. »

9 H 05 : UNE QUÊTE PLANIFIÉE
- Alex termine l'appel à l'assureur (P8, L2, D3) : 10 Élan, +15 % parce qu'il était au plan, soit 12.
- La caisse Administratif complète le Relevé 3/3. Message : « Raccourci par le Ruisseau-Noir : Sainte-Brume passe de 6 à 5 lieues. »

12 H 20 : LA VICTOIRE RAPIDE DU DÎNER
- Filtre « 15 min ».
- « Payer la facture d'Hydro » : 7 Élan.
- Fanal se tait : il ne parle qu'une fois sur trois.

17 H 30 : CÔTE À CÔTE
- Alex touche « Commencer » sur « Ramasser les feuilles » (≈ 1 h).
- Fanal rempote dans la serre : « Je m'occupe des pots pendant que tu fais le terrain. On se rejoint sur le pont. »
- Alex laisse le téléphone.
- À 18 h 35, il touche « Terminé » : 15 Élan, +15 % du plan, soit 17, et 2 caisses Terrain.
- Fanal : « Ça sent la terre jusqu'ici. »

20 H 40 : LE DÉPART DU SOIR
- La voile affiche 44 Élan, plus 6 en réserve, soit 50 Élan ou 5 lieues.
- Fanal propose :
  - Sainte-Brume, à 5 lieues : environ 14 Mat, et la commande « Toits » passe de 28 à 40/40 ;
  - ou l'Anse puis la Pointe en escale double, à 4 lieues.
- Alex suit la suggestion et dépense 40 Mat pour les Accumulateurs Nv2.
- Il touche « Larguer ». Le départ dure 4 s.
- Fanal : « Bonne nuit, Alex. Demain matin, Sainte-Brume devrait avoir un toit. »
- Puis le message de fin de session : « C'est assez pour aujourd'hui. »

### Ce qu’on garde de 006

À GARDER DE 006

Le contrat économique de PRODUCT.md :
- trois ressources : l'Énergie devient l'Élan ; Matériaux et Confiance gardent leur nom ;
- la règle « +1 Confiance à la première quête du jour », qui part désormais de 0.

La trame narrative :
- la tempête, devenue la Grande Cendre ;
- l'Orée, le Bastion ;
- ÉCHO-7 et le fragment « 184 cycles », enfin montrés à l'écran ;
- Solène, Milo et Naïma ;
- la phrase clé de STORY, rendue à Fanal.

Le visuel et l'interface :
- le geste signature « les ressources rejoignent physiquement le monde », qui devient le ruban vers la voile et les caisses sur le pont ;
- les jetons de palette (papier, crème, sauge, verre solaire, terre ; braise réservée aux menaces) et la règle « pas de fond sombre dominant », la nuit restant cantonnée à la scène ;
- la carte de tâche recommandée avec son score expliqué et les boutons Commencer et Terminer ;
- la bande d'objectifs Maintenant / Chapitre / Long terme.

L'architecture :
- le découpage en couches data → model → ui → app ;
- escapeHtml et la délégation par attributs data-* ;
- des erreurs en français destinées au joueur ;
- un stockage injecté, testable sous Node.

Les règles d'accessibilité : 44 px, un bouton pour chaque geste, états annoncés en mouvement réduit, aria-live, une seule tuile tabulable.

La réinitialisation du bac à sable, qui devient le panneau debug.

À ABANDONNER
- la carte isométrique 8×8 et le mode construction (catalogue, fantôme, rotation) ;
- le bouton « Jour +1 » ;
- les incidents datés en dur ;
- la récompense en paliers de longueur ;
- normalizeTask avec perte de champs ;
- renderAll() en innerHTML.

### Risques

1. LE RETOUR DIFFÉRÉ À LA NUIT PEUT SEMBLER LENT
Parade : chaque quête a un effet immédiat : ruban, voile, caisse, portée qui s'allonge sur la carte. Le matin devient le grand moment de la journée. La Lumière reconnaît les journées pleines.

2. UN COMPAGNON CULPABILISANT, À LA FINCH OU TAMAGOTCHI
Parade : pas de faim, pas de tristesse, aucun compteur de série. Après une absence, Fanal laisse une lettre sur ce qu'il a fait, ce qui reprend la logique de Neko Atsume. La fin de saison inscrit dans l'intrigue l'idée de ne pas tout porter.

3. UN JEU PLUS PRENANT QUE LES TÂCHES
Parade : environ 3 décisions par jour, aucune ressource sans quête réelle, une traversée par nuit, une fin de session explicite.

4. LE VOLUME D'ÉCRITURE
Parade : pools de variantes, 40 récits uniques et 60 gabarits par saison, rédaction assistée par IA encadrée par un guide de style et un glossaire fermé. Seuls les 6 beats d'ÉCHO-7 et les finales de chapitre sont écrits entièrement à la main.

5. LE COÛT ARTISTIQUE
Parade : une seule scène, une seule carte, un seul personnage articulé. Les saisons et l'heure passent par des variables de couleur ; il n'y a pas d'art par bâtiment.

6. LES PIÈGES D'HORLOGE (fuseau, heure d'été, rattrapage)
Parade : clock.js et voyage.js sont purs et couverts par environ 40 tests node --test, les graines sont déterministes, le rattrapage est plafonné à 2 nuits.

7. ALEX TENAIT AU POTAGER ET AU STYLE TOWNSHIP
Parade : un jardin léger subsiste (pots, bacs, récoltes, altises), les commandes de hameaux jouent le rôle des commandes de Hay Day, et le placement de modules et de décorations se fait sur le pont. Livrer ce prototype en 007 à côté de 006 pour les comparer ; le noyau core/ est commun.

8. LES CONNOTATIONS DE LA CHASSE-GALERIE (pacte, jurons)
Parade : hommage limité au nom et au vol du Réveillon, sans diable, avec un seul clin d'œil humoristique.

9. LES ALÉAS LIÉS À LA NÉGLIGENCE D'UN DOMAINE PEUVENT SONNER COMME UN REPROCHE
Parade : les textes ne nomment jamais la tâche réelle délaissée. La quête du domaine reste une option parmi trois, et la mention « Rien ne presse » est systématique.

10. LES LIMITES DES PWA SUR IOS (stockage effacé, pas de vibration, notifications)
Parade : l'état fait foi côté serveur dès la phase 2, avec des retours visuels seulement. Les notifications sont absentes du MVP.

11. LOU, UNE ENFANT DANS UN JEU ADULTE
Parade : elle n'est jamais en danger, elle a un humour de nièce et un rôle utile (la vigie).

### Tranche jouable

TRANCHE JOUABLE DE 3 SEMAINES : sketches/007-galerie-des-lisieres/, à côté de 006

SEMAINE 1 : NOYAU ET DONNÉES
- Modules core/ : rank, reward, ledger, clock, voyage, migrate.
- Environ 40 tests node --test, notamment :
  - idempotence du registre ;
  - évaluation figée ;
  - garantie qu'une tâche de P ≥ 8 reste dans le top 3 ;
  - journée de 4 h à 4 h ;
  - départ automatique reconstruit ;
  - passe-plat de deadline, notes et archived.
- Import en lecture du vrai tasks.json, avec écriture en sandbox localStorage et export JSON.
- Quêtes complètes :
  - ajout rapide et formulaire complet (P, L, D avec durée, domaine, échéance, notes, étapes) ;
  - tris et filtres « 15 min » et « Peu d'énergie » ;
  - trois recommandations ;
  - explication du Cap ;
  - terminer, réactiver sans nouveau gain, archiver.

SEMAINE 2 : SCÈNE ET PRÉSENCE
- Relais en SVG : 4 plans, ciel sur l'heure réelle, automne.
- Galerie : bâche, voile en 5 états, 10 emplacements de caisses.
- Fanal articulé avec 8 poses.
- Animations 1, 2, 3, 4, 6 et 7.
- Mode Côte à côte avec Wake Lock facultatif.
- Version en mouvement réduit et jumeau texte aria-live.
- Polices locales.

SEMAINE 3 : CARTE, CHAPITRE 1, FINITION
- Carte SVG de la Basse-Lisière avec 4 destinations (Anse-aux-Brumes, Moulin-Rompu, Pointe-aux-Herbes, Sainte-Brume), manifestes, suggestion de Fanal et affinités.
- Départ et retour avec résolution paresseuse.
- Jardin : 3 pots et 3 graines.
- Commande de Solène.
- 2 modules : Cabine et Accumulateurs.
- Chapitre 1 complet (7 objectifs) :
  - 12 récits et 60 répliques ;
  - finale ÉCHO-7 (animation 8).
- Panneau ?debug=1 : « Aller à 21 h », « Aller à 6 h », réinitialiser.
- QA à 390×844, 834×1112 et 1280×900.

DÉFINITION DE « FINI »
Sans le bouton debug, Alex vit au moins 5 vraies journées avant la finale du chapitre 1, et aucune boucle Terminer/Réactiver ne rapporte quoi que ce soit.

HORS MVP
- aléas : seul un Vent arrière scripté est inclus ;
- Milo, Naïma et Lou ;
- coloration des hameaux et animation 5 ;
- api.php, PWA, notifications et son.

EFFORT
Le MVP est de taille M. La saison complète est de taille L.

### Effort

L

## D-bastion-saisons · Bastion des saisons : tenir jusqu'aux sucres

### Pitch

Chaque vraie tâche faite chez toi traverse la lisière et nourrit le Foyer du Bastion. Ce feu fait vivre une petite colonie de l'Orée face aux menaces de l'hiver québécois, annoncées des jours d'avance : premier gel, nordet, verglas, poudrerie, tempête des corneilles, crue. Le jour, tu bâtis, tu stockes et tu choisis tes chartes sur un diorama en hexagones. Au matin de l'Avis, tu regardes le Bastion tenir, ou plier puis se relever, sans que rien de réel soit jamais perdu ; le but de la saison est de garder le feu jusqu'au Temps des sucres.

### Fantaisie

Tu es la 7e intendance de continuité du Bastion des lisières, la personne qui voit venir l'hiver et qui s'organise. Le fantasme n'est pas de vaincre, c'est d'ÊTRE PRÊT. On veut :
- le soulagement de Kingdom Two Crowns quand le mur tient sous la lune rouge ;
- la chaleur de Frostpunk serrée autour du générateur, sans sa cruauté ;
- le calme de Dorfromantik quand la vallée se remplit, case par case.

Pont diégétique, qui manquait à 006 : le double sens de « foyer ». Le produit s'appelle Quêtes du foyer. Au cœur du Bastion brûle le Foyer, un grand poêle de pierre des Veilleurs. Chaque geste de soin fait dans ton foyer réel arrive ici sous forme d'élan et fait monter sa flamme. Phrase clé, rétablie et affichée dès la 10e seconde : « Ce que tu fais chez vous devient notre capacité d'agir ici. »

Effet miroir assumé : en octobre-novembre, la vraie vie d'un parent québécois est déjà une préparation à l'hiver (pneus avant le 1er décembre, abri d'auto, feuilles, calfeutrage, bottes et mitaines des enfants). Le jeu raconte la même histoire en petit. Poser tes pneus d'hiver pour vrai, c'est aussi garder la route du Convoi ouverte pendant la poudrerie.

Émotions visées, par ordre d'importance :
1. Anticipation sereine : « Poudrerie mardi, préparation 77 sur 88, j'ai le temps. »
2. Fierté du matin d'après : « Tout a tenu. »
3. Chaleur : fenêtres orange dans la neige bleue au crépuscule réel de 16 h 15.
4. Appartenance : Solène, Milo, Naïma, Lou et Ambroise réagissent à ce que tu as fait, pas à ce que tu n'as pas fait.

L'Orée n'exige rien, elle répond. L'hiver, ou le Long Blanc, ne te veut pas de mal : il recouvre, c'est tout. Toi, tu entretiens. C'est le thème (le soin quotidien contre l'usure), et c'est exactement ce que sont les tâches domestiques.

### Boucles

BOUCLE 10 SECONDES (ouvrir, agir, refermer)
- L'app s'ouvre sur le diorama à l'heure réelle.
- En bas, le Carnet replié montre une ligne :
  - « À faire d'abord : Payer Hydro (P8 · ≈5 min · échéance demain) » ;
  - un bouton « C'est fait » de 48 px.
- En haut, la puce d'Avis : « Poudrerie · mar. 12 · 61 / 88±5 ».
- Tu touches « C'est fait ». Une étincelle orange part du bouton et file en arc jusqu'au Foyer en 700 ms. Les compteurs montent quand elle arrive (+9 Élan, +6 Matériaux).
- Un bloc s'emboîte dans la jauge d'Avis (+1), avec un clic sonore si le son est activé.
- Une ligne de réaction du personnage du domaine : Naïma pour l'administratif.
- Tu peux refermer. C'est complet.

BOUCLE 2 MINUTES (dépenser avec intention)
- Après une tâche, l'onglet Bastion propose 1 à 3 actions chiffrées, rangées par effet sur l'Avis en cours :
  - « Souffleuse Nv2 · 60 Mat + 20 Élan · +10 préparation · prête demain 6 h » ;
  - « Fendre du bois · 5 Élan = 1 bûche » ;
  - « Planter la serre · 5 Élan, 8 Mat dans 24 h ».
- Tu touches, l'échafaudage monte en trois temps, la jauge bouge.
- Fin de session explicite : « Le Foyer est bien nourri pour ce soir. À demain. »

BOUCLE JOURNÉE (Cozy Grove : 1 à 3 temps forts par jour, puis « à demain »)
- Matin, à la première ouverture :
  - Chronique de la nuit : chantiers finis, récoltes, visite d'un colon ;
  - « La relève » : +2 Élan, une fois par jour ;
  - Ordre de marche facultatif : choisir 1 à 3 quêtes et écrire « Quand…, alors… ». Rapporte +3 Élan et +2 de préparation, une fois par jour.
- Journée : les tâches réelles.
- Première tâche du jour = Première lumière :
  - les fenêtres s'allument anneau par anneau ;
  - +1 Confiance (présence, pas volume) ;
  - +1 Moral.
- Soir : session stratégique facultative de 3 à 8 minutes (construire, engager des bûches, sceller une charte, décorer).
- Le dernier temps fort du jour se clôt par une réplique de fin et un assombrissement doux.

BOUCLE SEMAINE (effet nouveau départ du lundi)
- Lundi, Naïma affiche l'Ordre de la semaine : 3 lots mixtes à la Stardew, par exemple « 2 quêtes Maison · 1 Véhicule · 1 Administratif ». Récompense : 20 Matériaux et 1 décoration exclusive.
- « Feu de semaine » : des quêtes faites 4 jours sur 7 donnent +5 bûches et une page d'Almanach.
- Jokers :
  - 1 joker gagné toutes les 4 semaines tenues, 2 au maximum ;
  - on n'affiche jamais de compteur de jours consécutifs ;
  - une semaine manquée affiche : « On rallume une veillée. Ça compte pareil. »
- Rythme des Avis : en moyenne 1 tous les 14 jours, toujours annoncé 5 à 9 jours d'avance. Une semaine sur deux contient donc une montée en tension, l'autre de la construction.

BOUCLE SAISON (Saison 1 « L'Hiver qui vient », 5 octobre au 15 avril, calée sur le vrai calendrier)
- Contenu :
  - 8 chapitres ;
  - 11 Avis, dont 2 « boss » : la Tempête de verglas du 12 février et la Tempête des corneilles du 12 mars ;
  - 5 chartes ;
  - une trêve des Fêtes sans menace, du 21 décembre au 4 janvier.
- Finale au Temps des sucres : la neige fond hexagone par hexagone à partir du Foyer. ÉCHO-7 livre sa 6e révélation.
- Sceau d'Almanach selon les nuits tenues, purement cosmétique, sans aucun contenu verrouillé :
  - « Hiver traversé », toujours accordé ;
  - « Hiver tenu », à 6 Avis tenus ou plus ;
  - « Hiver dompté », à 9 ou plus.
- Saison 2 « La saison verte » (mai à septembre) : chartes remises à zéro (nouveau départ), carte conservée, nouvelles menaces (vers blancs, mouches noires, canicule, orages).

DÉVOILEMENT PROGRESSIF (pour ne pas noyer une app de tâches)
- Jour 1 : Élan, Matériaux, Avis.
- Confiance 3 : Moral et Naïma.
- Fin du chapitre 1 : bûches.
- Chapitre 2 : chartes.
- Confiance 12 : convois d'échéance.

### Tâches → jeu

PRINCIPE : le RANG (quoi faire maintenant) ne dépend jamais du jeu. La RÉCOMPENSE (ce que ça rapporte) est proportionnelle à l'effort, sans pousser à gonfler les cotes.

1. RANG : Score v2 sur 100, affiché « Note de quête », jamais « priorité »
   S = 45·P/10 + 20·U + 15·(11−L)/10 + 10·(11−D)/10 + 10·min(1, âge/30 j)
   - U (urgence) vaut :
     - 1,0 si l'échéance est dépassée ou à 1 jour ou moins ;
     - 0,7 à 3 jours ou moins ;
     - 0,4 à 7 jours ou moins ;
     - 0,15 à 14 jours ou moins ;
     - 0 sinon.
   - Exemples :
     - P10/L1/D1 sans échéance : 70 ;
     - « Payer Hydro » P8/L1/D1, échéance demain : 81 ;
     - P3/L8/D5, vieille de 60 jours : 34.
   - Trois cartes en tête du Carnet :
     - « À faire d'abord » : S maximal ;
     - « Victoire rapide » : meilleur S parmi L≤3 et D≤4 ;
     - « Grand chantier » : meilleur P×(1+U) parmi L≥6.
   - Garantie : si aucune tâche P≥8 n'est dans les 3 cartes alors qu'il en existe, elle remplace la 3e.
   - Filtres en puces :
     - « ≈15 min » (L≤2) ;
     - « Peu d'énergie » (D≤3) ;
     - domaine ;
     - échéance cette semaine ;
     - « Aide l'Avis ».
   - Tri par P, L, D, échéance, Note, domaine et statut (régression de 006 corrigée).
   - Longueur traduite en temps à l'écran : L1 ≈5 min, L2 ≈15 min, L3 ≈30 min, L4 ≈1 h, L5 ≈2 h, L6 demi-journée, L7+ journée ou projet.

2. RÉCOMPENSE, figée et journalisée
   Élan = arrondi[(6·√L + 2 si D≥7) × (0,8 + 0,04·P) × bonus]
   Matériaux = arrondi(0,6 × la même valeur avant arrondi)
   - Exemples :
     - P10/L1/D1 : 7 Élan, 4 Mat ;
     - P6/L3/D3 : 11 et 6 ;
     - « Pneus d'hiver » P9/L5/D5 : 16 et 9, ou 19 et 11 si finie avant l'échéance ;
     - P3/L8/D7 : 17 et 10 ;
     - « Repas de la semaine » P8/L9/D9 : 22 et 13.
   - Une tâche 9 fois plus longue rapporte environ 3 fois plus ; par minute, la victoire rapide gagne toujours.
   - Bonus multiplicatifs, plafonnés à +40 % au total :
     - +20 % si finie avant ou le jour de l'échéance ;
     - +15 % si créée il y a plus de 21 jours (« vieille quête dénichée ») ;
     - +20 % si elle figure dans l'Ordre de marche du jour (3 tâches au maximum).
   - Plafond quotidien dégressif sur l'Élan du jour : 0 à 60 payé à 100 %, 60 à 120 à 50 %, au-delà de 120 à 25 %.
   - Cotes figées au démarrage ou 1 h après la création. Une édition ultérieure de L, P ou D ne peut que baisser la récompense : le registre retient le minimum.
   - Registre en ajout seul, clé id + completionId. Terminer, réactiver puis terminer de nouveau rapporte 0, avec le message « Déjà comptée au registre. Le Foyer s'en souvient. »

3. DOMAINES ET SECTEURS DU MONDE (les domaines réels Jardin, Ferme et Professionnel sont absorbés)
   | Domaine réel | Secteur | Position | Personnage |
   |---|---|---|---|
   | Maison | Atelier | est | Milo |
   | Terrain, Jardin, Ferme | Champs et serres | sud, ensoleillé | Solène |
   | Enfants | Maison commune | ouest | Lou |
   | Véhicule | Garage du Convoi et route | nord-est, face au nordet | Milo et Ambroise |
   | Administratif, Professionnel | Archives, sous le Bastion | centre | Naïma, ÉCHO-7 |
   | Autre ou vide | Place commune | — | — |
   - Vitalité sur 14 jours, purement informative et sans aucun dégât :
     - 0 tâche : « en veille », lumières éteintes ;
     - 1 ou 2 : actif ;
     - 3 à 5 : animé (fumée, colons dehors) ;
     - 6 et plus : florissant (fanion).
   - Chaque Avis vise un secteur. Pendant sa fenêtre :
     - toute tâche réelle vaut +1 de préparation, 8 au maximum ;
     - une tâche du domaine visé vaut +3, 5 au maximum (+15) ;
     - ces tâches portent une petite pastille givre « Aide l'Avis ».
   - Le domaine ne change NI le rang NI la monnaie. Une option « Laisser l'Avis influencer l'ordre » existe, désactivée par défaut, avec un effet maximal de +5 points.

4. ÉCHÉANCES : les convois d'Ambroise (à partir de Confiance 12)
   - Chaque tâche à échéance dans les 14 jours apparaît comme une charrette sur la route du nord-est, à une distance proportionnelle aux jours restants. La toucher ouvre la tâche.
   - Finie à temps : la charrette repart chargée, avec le bonus de +20 %.
   - En retard : elle attend au portail, lanterne allumée. « Ambroise attend. Pas de presse, mais c'est rendu là. »
   - Aucune pénalité ; seule l'urgence du rang augmente.

5. SOUS-TÂCHES (progrès doté)
   - Découper une tâche L≥5 en 2 sous-tâches ou plus coche aussitôt l'étape « Découper » et verse 10 % de la récompense, une seule fois.
   - Chaque sous-tâche verse 90 %/n ; le total reste égal à la récompense de la tâche mère, donc découper ne crée pas d'inflation.
   - À l'écran, un échafaudage à n paliers monte sur le bâtiment du secteur.

6. RÉCURRENCES (« chaque mardi : recyclage »)
   - Une seule instance active. La suivante remplace l'ancienne sans empilement, avec la mention « passée » sans reproche.
   - Récompense normale. Compte comme « Ronde de garde » dans le plafond +1 de préparation.

7. BONUS PLAFONNÉS hors complétion, 8 Élan par jour au maximum
   - Ajouter une vraie tâche : +1 Élan, 3 par jour au maximum, repris si la tâche est supprimée dans les 24 h.
   - Planifier (Ordre de marche) : +3 Élan et +2 de préparation, une fois par jour.
   - Revenir (« La relève ») : +2 Élan.
   - Une journée sans tâche ne donne donc ni Matériaux ni Confiance.

### Économie

RESSOURCES (les 3 de PRODUCT.md, avec leurs noms diégétiques)
- Élan (énergie) : action immédiate.
  - Sources : tâches, bonus plafonnés.
  - Puits : chantiers, déblayer la brume, braseros, planter, fendre du bois, décorations.
  - Stock maximal 100. Le surplus se convertit automatiquement en bûches, à 6 Élan pour 1 bûche (« le surplus nourrit la remise »).
- Matériaux : construire, améliorer, réparer.
  - Sources : tâches (0,6 × l'Élan), récoltes, butin d'Avis.
  - Entrepôt 300 (Nv2 : 600). Le surplus va aux « dons au rang » : +1 Moral par tranche de 20, 3 par jour au maximum.
- Confiance (la réputation de PRODUCT) : jamais dépensée.
  - Gains : +1 par jour avec au moins 1 tâche, +1 par Avis tenu.
  - Seuils uniques (corrige l'incohérence 3 contre 8) :
    - 1 : Première lumière ;
    - 3 : arrivée de Naïma, Archives ouvrables ;
    - 7 : arrivée de Lou ;
    - 12 : arrivée d'Ambroise et des convois ;
    - 20 : 2e emplacement de charte ;
    - 30 : voix complète d'ÉCHO-7 ;
    - 45, 60, 80, 100, 120 : titres et pages d'Almanach.
- Stocks dérivés :
  - Bûches : remise de 40, 80 puis 120. Chacune vaut +2 contre les menaces FROID uniquement. On en engage au plus 30 % de la Force.
  - Moral : de 30 à 100, départ à 60.

DÉPART : 10 Élan, 20 Matériaux, 0 bûche, Moral 60, Confiance 0.
- Bâtiments : Foyer Nv1 ; Tour météo endommagée (préavis 2 jours, Force en fourchette ±20) ; 3 champs dont 2 mûrs ; Archives scellées.
- Carte : 7 hexagones révélés, l'anneau 2 visible sous la brume.

PRODUCTION (la ferme produit enfin ; plafond de 2 jours de stock, rien ne pourrit)
- Champ (automne) : 4 Élan donnent 7 Mat après 20 h.
- Serre chauffée (hiver, dans le rayon de chaleur ; 40 Mat + 10 Élan) : 5 Élan donnent 8 Mat après 24 h.
- Bûcherie (25 Mat, adjacente à une forêt) : fendre 5 Élan donne 1 bûche, sans limite.
- Garage (35 Mat) : 10 Élan donnent 4 Mat, une fois par jour.
- Champ supplémentaire : 12 Mat.
- Déblayer la brume, par hexagone : 10 Élan (anneau 2), 16 (anneau 3), 24 (anneau 4). Certaines cases contiennent des trouvailles fixes posées à la création de la carte, sans tirage : ruine des Veilleurs avec une ligne de lore, coffre de 10 Mat, forêt, rivière.

DÉFENSES PERMANENTES (étiquettes de menace : FROID, VENT, NEIGE, GLACE, EAU ; chaque bâtiment compte une fois, à sa meilleure valeur)
| Défense | Coûts par niveau | Apport |
|---|---|---|
| Foyer, Nv2 à Nv4 | 40 Mat + 20 Élan (12 h) ; 90 + 40 ; 160 + 60 (24 h) | FROID 8/16/24/32 ; rayon de chaleur de 1 à 4 anneaux |
| Tour Météo-Bastion, réparation | 15 Mat + 10 Élan | toutes menaces +3 ; préavis 2 → 5 j ; Force ±10 |
| Tour Nv2 | 50 Mat | +6 ; 7 j ; ±5 |
| Tour Nv3 | 100 Mat | +9 ; 9 j ; Force exacte et secteur visé |
| Haie brise-vent (cèdres) | 20 / 40 / 70 Mat | VENT 8/16/24, NEIGE 4/8/12 |
| Tunnels de culture | 10 / 20 / 30 Mat | FROID 4/8/12 ; protègent les récoltes du gel |
| Calfeutrage | 12 / 24 / 36 Mat | FROID 4/8/12, VENT 2/4/6 |
| Souffleuse du Convoi | 30 / 60 / 100 Mat (+ 10/20/30 Élan) | NEIGE 10/20/30 |
| Grange à abrasifs | 25 / 50 / 90 Mat | GLACE 10/20/30 |
| Ligne de secours enfouie | 60 Mat + 20 Élan | GLACE 15 |
| Digue de fascines | 40 / 80 / 120 / 160 Mat | EAU 12/24/36/48 |
- Catalogue de défense : environ 1 530 Mat au total.
- Confort et production : environ 1 100 Mat au total.
  - Maison commune : 30 / 70 / 120 (Moral visé +5 par niveau, +1 chantier en parallèle) ;
  - Atelier : 25 / 60 / 110 (réparations −20 % par niveau) ;
  - Archives : 20 / 60 / 120 ;
  - Patinoire : 60 ;
  - Cabane à sucre : 80 ;
  - Remise : 30 / 60.
- Puits infini : décorations (lanternes 15 Élan, bancs 10 Mat, sculptures de glace 20 Élan). +1 Beauté chacune dans le rayon de chaleur ; 5 Beauté donnent +1 Moral visé, +10 au maximum.
- Chantiers : 20 Mat ou moins = instantané ; 21 à 60 Mat = 2 h réelles ; plus de 60 = 8 h. 2 chantiers en parallèle au départ. Pas d'accélération payante.

PRÉPARATION D'UN AVIS
Préparation = Garde 10 + défenses + tâches de la fenêtre + bûches (FROID) + braseros + Ordre de marche, × 1,10 si le Moral est à 75 ou plus.
- Tâches de la fenêtre : +1 chacune (8 au maximum), +3 pour le domaine visé (+15 au maximum).
- Bûches : au plus 30 % de la Force.
- Braseros : dans les 24 dernières heures, 8 Élan pour +5, 4 fois au maximum.
- Ordre de marche : +2 par jour, +6 au maximum.
- Ratio R = Préparation / Force réelle. La Force est fixée à l'annonce (graine) et affichée en fourchette qui se resserre avec la Tour et à l'approche de la date (±3 la veille).

CALENDRIER DE LA SAISON 1
| Date | Avis | Force | Étiquettes | Secteur visé |
|---|---|---|---|---|
| 14 oct. | Premier gel | 20 | FROID | Champs |
| 3 nov. | Grands vents | 40 | VENT | Atelier |
| 17 nov. | Pluie verglaçante | 50 | GLACE | Route |
| 2 déc. | Première bordée | 60 | NEIGE | Route |
| 15 déc. | Froid sec | 75 | FROID | Atelier |
| 21 déc. au 4 janv. | trêve des Fêtes | — | — | — |
| 12 janv. | Poudrerie | 90 | NEIGE + VENT | Route |
| 26 janv. | Grand froid | 115 | FROID | Maison commune |
| 12 févr. | Tempête de verglas | 130 | GLACE + VENT | Atelier |
| 25 févr. | Redoux trompeur | 60 | EAU | Archives |
| 12 mars | Tempête des corneilles | 170 | NEIGE + VENT + FROID | Route |
| 8 avril | Crue printanière | 100 | EAU | Champs |
Résolution à 6 h, heure locale.

ISSUES
- Tenu (R ≥ 1) : +1 Confiance, +10 Moral, butin de 15 Mat, sceau d'Almanach.
- Tenu de justesse (0,6 à 0,99) : +3 Moral et 1 dégât léger.
- Plié (< 0,6) : −8 Moral (plancher 30) et 2 dégâts au maximum.
- Ce qu'est un dégât :
  - un bâtiment de production ou de confort « givré », hors service jusqu'à réparation (25 % de son coût, entre 4 et 15 Mat) ou jusqu'à la fonte gratuite après 5 jours réels ;
  - ou un champ non protégé dont la récolte est perdue.
- Ce qu'un dégât ne touche jamais :
  - une défense ;
  - le Foyer ;
  - la Confiance ;
  - un chapitre ;
  - une donnée réelle.
- Le dégât ne fragilise donc jamais l'Avis suivant. Ignorer un Avis reste nettement moins bon que s'y préparer (pas de Confiance, pas de butin, réparations), mais jamais catastrophique : le bug « ignorer est optimal » de 006 n'est pas reproduit.

ABSENCE
- À la réouverture, advance(now) rejoue les jours manqués.
- Production : plafonnée à 2 jours.
- Avis pendant l'absence : résolus avec la Garde, les défenses et les bûches que les colons engagent d'eux-mêmes (option activée par défaut).
- Dégâts : non cumulatifs. Un bâtiment ne peut pas être givré deux fois ; réparations en attente plafonnées à 30 Mat.
- Retour après 4 jours ou plus : réparations à moitié prix pendant 3 jours et +5 Moral.
- Valve « Dévier le front » : une fois par chapitre, repousse un Avis de 3 jours. Demande au moins 24 h d'avance.

CALIBRAGE (simulation, 200 graines par profil ; script simulations/bastion-saisons.py)
| Profil | Rythme | Tenu | Justesse | Plié |
|---|---|---|---|---|
| Léger | ≈4-5 tâches/sem | 33 % | 56 % | 10 % |
| Normal | ≈12 tâches/sem | 83 % | 17 % | 0 % |
| Intense | ≈24 tâches/sem | 100 % | — | — |
- Absence de 14 jours en janvier (profil normal) : la Poudrerie passe de Tenu à Justesse, jamais à Plié.
- Gains sur la saison : normal environ 3 400 Élan et 2 000 Mat, intense environ 6 800 Élan et 4 100 Mat.
- Le profil normal ne peut pas tout bâtir (catalogue de 2 600 Mat ou plus), ce qui force des choix. L'intense bascule vers les décorations, l'expansion et l'Almanach.

### Narration

PRÉMISSE (bible respectée : produit « Quêtes du foyer », monde « l'Orée »)
- Les Veilleurs ont bâti le Bastion des lisières comme un RELAIS. Au centre brûle le Foyer, qui transforme en élan les gestes de soin accomplis de l'autre côté, dans ton vrai foyer.
- Il y a 184 cycles, la 6e intendance s'est arrêtée. Personne n'a pris la relève, et le Long Blanc a tout recouvert.
- Une petite colonie (Solène, Milo et quatre colons en tuques de couleur) est revenue dans la vallée avec des semences. Le Foyer vacille, et le premier vrai hiver depuis le retour arrive.
- Alex est la 7e intendance de continuité. Objectif annoncé dès la première minute : « Garder le feu jusqu'aux sucres. À la première coulée, l'Orée redevient vivante. »
- L'ANTAGONISTE, l'Hiver ou « le Long Blanc », ne parle jamais. On le voit comme un Front bleu-violet à l'horizon, du givre qui gagne le bord de l'écran quand un Avis approche, et à travers les fragments d'ÉCHO-7 : « Il ne vous en veut pas. Il recouvre. C'est tout ce qu'il sait faire. »

PERSONNAGES (tutoiement partout ; seul ÉCHO-7 vouvoie)
| Personnage | Rôle et domaine | Exemple de réplique |
|---|---|---|
| Solène Ardent | agronome, Terrain : champs, serres, gel ; pragmatique, pince-sans-rire | « Deux champs sont mûrs. Si le gel passe avant, on les perd. Rien de grave. Juste dommage. » |
| Milo Kern | technicien, Maison et Véhicule : défenses, Foyer ; parle en chiffres | « Souffleuse niveau 2 : +10 de préparation. 60 Matériaux et 20 Élan. Prête demain 6 h. » |
| Naïma Sorel | coordinatrice, Administratif : Avis, chartes, Moral ; arrive à Confiance 3 | « Je ne te demande pas d'en faire plus. Je te demande ce qui compte en premier. » |
| Lou | apprentie de 11 ans, Enfants : Maison commune, fêtes, dessins de l'Almanach ; arrive à 7 | « J'ai fait un fort. Il est pas fini, mais il a déjà un drapeau. » |
| Ambroise | convoyeur, échéances : charrettes, dictons météo ; arrive à 12 | « Les pneus d'hiver, c'est le 1er décembre. Moi, je dis ça de même. » |
| ÉCHO-7 | mémoire des Archives, 6 révélations | voir plus bas |

CHAPITRE 1 « Le premier gel » (de l'installation au 25 octobre ; prologue adaptatif condensé sur 7 jours si l'installation est tardive)
- J1 : Première lumière. Solène : « Alex? Enfin. Le Foyer baisse depuis trois jours. Ce que tu fais chez vous devient notre capacité d'agir ici. Une seule vraie chose, et il repart. »
- J1, suite : corne de la Tour, premier Avis en signal faible (« Premier gel · dans 2 à 5 jours »). Milo : « La Tour a 184 cycles de poussière dans les engrenages. 15 Matériaux et je te la remets debout. »
- J2-J4 :
  - récolter et poser un tunnel ;
  - Confiance 3 : Naïma arrive par la route et présente Moral et Confiance ;
  - les Archives s'ouvrent si la Tour est réparée.
- 14 octobre, nuit rejouée : Tenu prévu, givre décoratif sur les champs. Solène : « Pas une feuille de perdue. Tu vois? On peut le voir venir. »
- Archives, ÉCHO-7, fragment 1 : « Identification impossible. Fonction reconnue : intendant de continuité. Vous êtes en retard de 184 cycles. »
- Objectifs : tenir le premier gel, réparer la Tour, atteindre Confiance 3, ouvrir les Archives, bâtir la Bûcherie.
- Fin : Naïma : « L'hiver ne frappe pas une fois. Il revient. Il va nous falloir un plan. »

CHAPITRE 2 « Le nordet » (26 octobre au 22 novembre)
- Première charte, « La veillée ». Naïma : « Le Foyer peut chauffer tout le monde un peu, ou le cœur du Bastion beaucoup. Choisis. »
- Milo fait planter la haie de cèdres face au nord-est.
- Avis « Grands vents » (3 novembre, Atelier) : écho réel au rangement des meubles de jardin et des objets qui s'envolent.
- Lou arrive (Confiance 7) avec la Maison commune ; les tâches Enfants ont désormais une voix.
- Ambroise et le Convoi (Confiance 12) : les échéances deviennent des charrettes. Il propose, sans obliger : « Ajouter Pneus d'hiver à tes quêtes, échéance 1er décembre? »
- Avis « Pluie verglaçante » (17 novembre, Route).
- ÉCHO-7, fragment 2 : « Le Bastion n'est pas un mur. C'est un relais. Ce que vous faites de l'autre côté arrive ici sous forme d'élan. »
- Fin : premiers flocons sur le diorama.

CHAPITRE 3 « La première bordée » (23 novembre au 20 décembre)
- Avis « Première bordée » (2 décembre). Le matin d'après, toute la carte est blanche : moment signature, la neige reste jusqu'en mars. Il faut la Souffleuse.
- Lou bâtit un fort (+Moral). Charte 2, « Le déneigement ».
- Avis « Froid sec » (15 décembre) : bûches et calfeutrage. Ambroise : « Quand la neige crie sous la botte, c'est qu'il fait frette pour vrai. »
- ÉCHO-7, fragment 3 : « Il y a eu six intendants avant vous. Le sixième a tenu jusqu'à la poudrerie. »
- Fin : Naïma annonce la trêve. « Du 21 décembre au 4 janvier, la Météo-Bastion ne sonne pas. Même l'hiver fait relâche. Profite des tiens. »

ARC LONG
- Ch4 « Les Fêtes au Bastion » : aucune menace. Réveillon, lanternes de Lou, bilan doux de l'année : tâches faites, nuits tenues, jamais de manque.
- Ch5 « La poudrerie » (janvier) : Poudrerie (12 janvier), Grand froid (26 janvier), charte 3. ÉCHO-7, fragment 4 : « Le sixième n'a pas échoué. Il s'est arrêté. Personne n'a pris la relève. »
- Ch6 « Le cœur de l'hiver » (février) : Tempête de verglas annoncée 8 jours d'avance, avec un vieux colon qui se souvient « de 98 » sobrement. Puis Redoux trompeur. Charte 4. ÉCHO-7, fragment 5 : « Je suis ce qui reste de sa voix. Il m'a laissée ici pour dire au suivant : le froid ne se combat pas, il se traverse. »
- Ch7 « La tempête des corneilles » (1er au 19 mars) : dernier assaut, charte 5.
- Ch8 « L'Orée vivante » (Temps des sucres) :
  - la neige fond depuis le Foyer ;
  - Cabane à sucre ;
  - « Les coulées » : production ×1,5 pendant 14 jours ;
  - tire sur la neige ;
  - dernier test, la Crue printanière (8 avril).
  - ÉCHO-7, fragment 6 : « 184 cycles. Ce n'était pas un retard. C'était le temps qu'il fallait pour que quelqu'un revienne. »
- Saison 2 « La saison verte » : vers blancs, mouches noires, canicule, orages. Nouvel antagoniste : la Prolifération.
- Année 2 : l'hiver revient, plus fort, avec un nouveau mystère sous l'anneau 5.

RÈGLES D'ÉCRITURE
- Glossaire fermé : Élan, Matériaux, Confiance, Moral, Avis, Préparation, Force, Tenu, Tenu de justesse, Plié, Givré.
- Pools de 4 à 6 variantes par réaction et par domaine.
- Célébrations proportionnées à L.
- Zéro culpabilité. Le retour est toujours fêté (Lou : « Te revoilà! On a gardé le feu. On a même fait un fort. »). Jamais de « tu as manqué ».

### Direction visuelle

THÈSE : « Clarence Gagnon rencontre Dorfromantik ». Un diorama d'hexagones low-poly en bois peint, des maisons rouges, ocre et vert sapin, une neige aux ombres bleues, le tout sous une lumière qui suit l'heure réelle. Règle chromatique absolue : L'ORANGE EST À TOI (chaleur, élan, Foyer, fenêtres) ; LE BLEU-VIOLET EST À L'HIVER (Front, givre, menace). Jamais de rouge d'alarme.

PALETTE (tokens)
- Interface reprise de 006 : papier #fff8e8, encre #273026, encre douce #4f5848, sauge #718c5d, sauge profonde #3f6047, sol #aa6c43, verre solaire #58a9a4.
- Automne : érable #c8502e, or #e0a43a.
- Hiver : neige #f3f5f7, ombre de neige #a9bdd6, crépuscule #6d6a8f, nuit #232a45.
- Chaleur : braise #e8783a, lueur #ffc46b.
- Menace : givre #7c93b8, acier #4a5878, plus un léger filtre de désaturation sur le secteur visé.
- Chaque couleur est doublée d'une icône et d'un libellé : l'icône flocon-hexagone pour l'Avis, la flamme pour l'Élan.

RÉFÉRENCES
- Clarence Gagnon (illustrations de Maria Chapdelaine) : maisons colorées dans la neige bleue.
- Marc-Aurèle Fortin : les érables.
- Dorfromantik et Townscaper : hexagones, matière douce.
- Frostpunk : la lueur du générateur contre le blizzard.
- Kingdom Two Crowns : la menace visible à l'horizon.
- Cozy Grove : le monde qui reprend ses couleurs.

LUMIÈRE ET TEMPS RÉELS
- Ciel calculé sur les heures de soleil approximatives à Québec selon le mois. En décembre, crépuscule à 16 h 15 et fenêtres allumées.
- Saisons visibles : érables rouges en octobre ; givre scintillant au premier gel ; calotte de neige à 3 épaisseurs de décembre à mars ; fonte, ruissellement et bourgeons au printemps.

PERSONNAGES
- Portraits illustrés en SVG à aplats peints : fini le rond avec une lettre.
- Sur la carte, des figurines low-poly (capsule et tête) identifiables à leur tuque : jaune pour Solène, verte pour Milo, prune pour Naïma, rouge à pompon pour Lou, brune pour Ambroise.

MISE EN PAGE MOBILE (390 × 844)
- HUD de 56 px : Élan, Matériaux, Bûches, puce d'Avis.
- Monde : 58 % de la hauteur.
- Carnet en feuille inférieure à 3 positions :
  - aperçu : prochaine quête et bouton « C'est fait » ;
  - mi-hauteur : 3 cartes et filtres ;
  - plein écran : liste complète triable.
- Sur tablette, inspecteur persistant à droite.
- Titres en Fraunces (Google Fonts, chargée pour vrai : bug de 006 corrigé), texte en system-ui 16 px, coûts en 14 px au minimum.

MOMENTS SIGNATURE
1. L'Avis : corne lointaine. Le Front s'élève à l'horizon du côté de la menace et avance chaque jour réel.
2. Première lumière : les fenêtres s'allument du centre vers l'extérieur.
3. La nuit rejouée : la tempête passe sur la carte et chaque défense s'illumine quand elle encaisse.
4. La première bordée : la carte entière devient blanche.
5. Le sceau de charte à la cire.
6. La débâcle du Temps des sucres : la neige fond hexagone par hexagone depuis le Foyer, la vapeur monte de la cabane.

### Animations signature

1. ÉTINCELLE D'ÉLAN (à chaque tâche)
   - Une particule orange avec traînée de 6 sous-particules part du bouton « C'est fait » et file en courbe de Bézier vers le Foyer (700 ms, ease-in-out).
   - À l'arrivée, le Foyer grossit (×1,15 puis retour en 250 ms, rebond).
   - Les compteurs défilent chiffre par chiffre À L'ARRIVÉE, pas avant, ce qui corrige le bug de 006.
   - L'intensité suit la longueur : L1 donne 1 étincelle ; L7 et plus, 3 étincelles et un flash de lumière ponctuelle.

2. PREMIÈRE LUMIÈRE (première tâche du jour)
   - Les fenêtres s'allument anneau par anneau (40 ms d'écart par bâtiment, 1,2 s au total).
   - Les fumées de cheminée démarrent, la lumière ponctuelle du Foyer passe de 0,4 à 1.
   - Bandeau « Première lumière · Confiance 14 ».

3. APPROCHE DU FRONT (à l'ouverture pendant un Avis)
   - Le mur de nuages bleu-violet glisse de sa position d'hier à celle d'aujourd'hui (1,2 s), selon la formule distance = jours restants / préavis.
   - La veille, des flocons isolés commencent à tomber.

4. REMPART DE PRÉPARATION
   - La jauge horizontale « Préparation contre Force » se remplit par blocs colorés par source (Garde, Foyer, Souffleuse, Tes quêtes, Bûches, Braseros).
   - Chaque contribution tombe de 12 px et s'emboîte (squash 1,1 / 0,9, 180 ms), avec une vibration de 10 ms sur Android.
   - La zone d'incertitude de la Force est hachurée et se resserre.

5. NUIT DE L'AVIS (rejouée au matin, 12 s, passable après 1 s)
   - Le ciel s'assombrit, le Front roule sur la carte.
   - Neige : 600 particules en chute ; en mode poudrerie, des traînées horizontales.
   - Chaque défense pulse quand elle « encaisse » pendant que son bloc s'allume dans la jauge.
   - Suspense final sur les derniers points, puis tampon « TENU » en encre sauge, ou cristaux de givre qui poussent sur les bâtiments touchés (800 ms).

6. CHANTIER EN 3 TEMPS
   - Échafaudage (palier 1, puis 2), colons qui martèlent (rebond de 2 px à 4 Hz).
   - Retrait de l'échafaudage, pop final ×1,08 puis ×1 avec bouffée de poussière.
   - Une amélioration fait monter le bâtiment d'un cran, sans le remplacer.

7. NEIGE QUI S'ACCUMULE OU FOND
   - Les calottes de neige de chaque hexagone grandissent en vague depuis la direction de la menace (30 ms par hexagone).
   - Au printemps, elles rétrécissent du Foyer vers l'extérieur ; des gouttes et des taches d'herbe réapparaissent.

8. SCEAU DE CHARTE
   - Appui long de 600 ms : un anneau se remplit autour du pouce.
   - La cire tombe et s'écrase (secousse de 3 px, désactivée en mouvement réduit), le parchemin s'enroule et vole vers les Archives.

En mouvement réduit (prefers-reduced-motion) :
- pas de caméra ni de particules ;
- étincelle remplacée par un fondu des compteurs avec annonce ARIA ;
- nuit rejouée réduite à 3 images fixes légendées ;
- neige en texture statique.

### Technique

RECOMMANDATION : couche monde en three.js (r17x, ESM vendorisé dans /vendor, importmap, environ 170 Ko gzip, sans build) avec caméra orthographique. Toute l'interface reste en DOM/CSS.

POURQUOI three.js plutôt que DOM iso, Canvas 2D ou PixiJS
- La vraie projection supprime d'un coup les glitches de 006 : rotation CSS qui couche le silo, cartes disjointes, z-index manuels.
- Lumière ponctuelle du Foyer, cycle jour/nuit et calottes de neige s'obtiennent par géométrie, sans aucun actif graphique.
- Hexagones low-poly = CylinderGeometry à 6 côtés. Bâtiments composés de boîtes et de cônes (héritage blocky), en ombrage plat.
- Code très connu des IA, donc réaliste pour un développeur seul assisté.
- PixiJS demanderait des sprites dessinés ; Canvas 2D obligerait à recoder la projection et la lumière.

BUDGET MOBILE
- Rendu :
  - InstancedMesh par type de terrain, d'arbre et de calotte ;
  - moins de 40 appels de dessin et moins de 50 000 triangles ;
  - MeshLambertMaterial, HemisphereLight + DirectionalLight + 1 PointLight pour le Foyer ;
  - ombres en pastilles (sprites), carte d'ombres seulement sur le palier haut.
- Boucle de rendu :
  - rendu à la demande : la boucle ne tourne que pendant une interpolation ou des particules ;
  - neige d'ambiance à 30 i/s ;
  - pause sur visibilitychange.
- Écran et paliers :
  - DPR plafonné à 2, ou 1,5 sur palier bas (palier détecté par un test de 20 images au démarrage) ;
  - particules : Points, 600 au maximum.
- Démarrage : l'interface s'affiche avant la scène 3D, chargée en asynchrone. Cible : interactif en moins de 2 s sur un Android moyen.
- Taille de la carte : rayon 4 (61 hexagones) en saison 1, rayon 5 (91) en saison 2.
- Rotation par pas de 60° et zoom à 3 niveaux, avec des boutons.

INTERFACE
- DOM avec un petit store réactif et des mises à jour par clé : plus jamais de renderAll en innerHTML.
- Web Animations API pour les feuilles et les compteurs, petit tween maison (environ 60 lignes) pour la scène.
- Sélection 3D par raycast. Les hexagones font au moins 52 px au zoom par défaut, au-dessus des 44 px requis.

ACCESSIBILITÉ
- Canvas en aria-hidden, doublé d'une vue « Registre du Bastion » : liste de boutons reprenant chaque élément de la carte (état, coût, action). Tout ce qui se fait sur la carte se fait aussi par liste et clavier.
- Région live : « Préparation 63 sur 90 ».
- Information jamais portée par la couleur seule.
- Aucun son automatique. Howler.js (7 Ko) en option : crépitement du Foyer, vent, corne.
- Vibration détectée par fonctionnalité (absente sur iOS).
- Repli sans WebGL : registre et mini-carte SVG statique.

DONNÉES ET ARCHITECTURE
- tasks.json reste la source des tâches, avec des champs optionnels ajoutés : notes, subtasks[], recurrence, startedAt, completedAt, frozen{P,L,D}. Deadline, notes et archived sont préservés, et la migration est testée sur la vraie copie.
- game-state.json séparé, ainsi que le registre des gains en ajout seul.
- Modules purs (core/), testés avec node --test :
  - rank.js, reward.js, ledger.js ;
  - season.js (calendrier, Avis, Force à graine) ;
  - resolve.js ;
  - advance.js (rattrapage déterministe : seuls les 2 derniers Avis manqués sont joués en scène) ;
  - migrate.js.
- Le simulateur d'économie est porté en tools/sim.mjs et rejoué à chaque réglage.
- API PHP d'opérations (completeTask, build, engage, sealCharter) avec flock, numéro de révision et idempotence par opId.
- PWA : manifest + service worker (met three.js en cache) + file d'opérations hors ligne.
- Notifications navigateur : optionnelles, une par jour au maximum, heure réglable, contenu factuel (« Poudrerie mardi. Préparation 61 sur 88. »). Sur iOS, il faut installer la PWA à l'écran d'accueil.
- Mode debug (?debug=1) : machine à remonter le temps, états jamais synchronisés en production.

### Les 60 premières secondes

0-2 s : pas d'écran-titre. Le diorama s'ouvre à l'heure réelle, par exemple un crépuscule d'octobre. La caméra descend doucement vers le Bastion (désactivé en mouvement réduit). Érables rouges, Foyer à peine rougeoyant, fenêtres éteintes, 3 champs dont 2 aux épis dorés qui ondulent. En bas, le Carnet replié affiche déjà une vraie tâche migrée.

2-8 s : portrait de Solène et bulle : « Alex? Enfin. Le Foyer baisse depuis trois jours. Ici, rien ne bouge sans élan, et l'élan vient de chez vous : ce que tu fais chez vous devient notre capacité d'agir ici. » Boutons : « Montre-moi » et « Passer ».

8-16 s : « T'as sûrement déjà fait quelque chose aujourd'hui. Écris-le : ça compte. »
- Champ de saisie avec 3 suggestions : « Préparé les lunchs », « Sorti le recyclage », « Fait le lavage ».
- Alex touche « Fait le lavage ». Le domaine Maison est déduit et modifiable, la longueur proposée est 2.
- Il touche « C'est fait ». Ce bonus de départ n'est accordé qu'une fois et passe au registre.

16-23 s :
- L'étincelle orange part du bouton et file jusqu'au Foyer. Les flammes montent, les 6 fenêtres de l'anneau 1 s'allument une à une, la fumée sort des cheminées.
- Les compteurs défilent à l'arrivée : +9 Élan, +5 Matériaux.
- Bandeau « Première lumière · Confiance 1 ».
- Solène : « Tu vois? Ça, c'est toi. »

23-32 s :
- Une corne lointaine sonne. La Tour météo, penchée, crachote. Au nord, un mur bleu-gris s'élève à l'horizon.
- Carte d'Avis : « Avis de la Météo-Bastion (signal faible) · Premier gel · dans 2 à 5 jours · Force 15 à 35 ».
- Jauge : Préparation 18 (Garde 10, Foyer 8) contre une zone hachurée.
- Solène : « Le premier gel. Deux champs sont mûrs : si on ne récolte pas avant, on les perd. Rien de grave. Juste dommage. »

32-41 s :
- Une flèche douce pointe le premier champ. Alex le touche : la gerbe saute, +7 Matériaux volent vers le HUD.
- Deuxième champ : +7. Total : 33 Matériaux, 19 Élan.

41-52 s :
- Milo apparaît : « La Tour a 184 cycles de poussière dans les engrenages. 15 Matériaux et 10 d'élan, je te la remets debout. »
- Bouton « Réparer », instantané (20 Mat ou moins). Échafaudage en 3 temps, la Tour se redresse, l'antenne tourne.
- L'Avis se précise : « Premier gel · mercredi 14 octobre · Force 20 ± 10 ». Jauge à 21 : « Tenu probable ».

52-60 s :
- Objectif posé sur la carte (drapeau sur le champ vide) : « Pour être sûr : un tunnel de culture (10 Mat) avant mercredi. »
- Le Carnet passe à mi-hauteur sur la tâche « À faire d'abord : Appeler le garage pour les pneus (P8 · ≈15 min) ».
- Solène : « Le reste peut attendre ta prochaine vraie quête. »
- Alex sait ce qu'il gère, pourquoi, ce qui arrive et quoi faire maintenant.

### Une journée type

Jeudi 7 janvier 2027, chapitre 5. Avis « Poudrerie · mardi 12 janvier · Force 88 ± 5 · Route du Convoi ».

MATIN, 6 h 50, café (≈45 s)
- Chronique de la nuit, en une carte : « Nuit calme. La serre a donné 8 Matériaux. Lou a fini son fort de neige (+2 Moral). »
- « La relève » : +2 Élan.
- Puce d'Avis : 61 sur 88 ; à l'horizon nord-est, le Front a avancé d'un cran.
- Ordre de marche : Alex coche « Changer les essuie-glaces d'hiver » (Véhicule, pastille « Aide l'Avis ») et « Payer Hydro » (échéance vendredi). Il écrit : « Quand je dépose les enfants, alors je passe au garage. »
- Gain : +3 Élan, +2 de préparation (jauge à 63). Il referme.

MIDI, 12 h 15 (≈90 s)
- Il paie Hydro en ligne : P8/L1/D1, avant échéance et planifiée, donc bonus de +40 %. Gain : 9 Élan et 6 Matériaux.
- La charrette d'Ambroise repart chargée. Naïma : « Une de moins. Les Archives respirent. »
- Préparation +1 (64). Il fend du bois à la Bûcherie : 10 Élan donnent 2 bûches. Les bûches sont mises en réserve ; elles ne comptent pas contre la poudrerie (NEIGE/VENT) mais serviront au Grand froid.

SOIR, 19 h 40 (≈7 min)
- Essuie-glaces faits : P7/L3/D3, +20 % grâce à l'Ordre de marche, soit 13 Élan et 8 Matériaux.
- Domaine visé par l'Avis : +3 de préparation (67). Milo : « La route te dit merci. »
- Session stratégique :
  - Le Bastion suggère « Souffleuse Nv2 · 60 Mat + 20 Élan · +10 ». Alex lance le chantier (8 h, prête vendredi 6 h). Jauge projetée à 77.
  - Naïma propose la charte « Les nuits longues » : « Lanternes de rang : chaque lanterne compte +1 de préparation, 10 au maximum » ou « Couvre-feu : si on plie, 1 seul dégât au lieu de 2 ».
  - Il scelle « Lanternes » d'un appui long et place 1 lanterne (15 Élan) sur la route (78).
- La jauge indique « Il manque environ 10 : 2 braseros lundi soir, ou 3 quêtes d'ici mardi. »
- Lou : « Bonne nuit, Alex. On garde le feu. » L'écran s'assombrit sur la vraie nuit.

MARDI 12 JANVIER, 7 h
- La nuit est rejouée en 12 s : la poudrerie balaie la route, la Souffleuse et la haie pulsent.
- Le bloc « Tes quêtes » fait passer la jauge à 91 contre une Force réelle de 87 : tampon « TENU ».
- Gains : +1 Confiance, +10 Moral, butin de 15 Matériaux, sceau « Poudrerie » dans l'Almanach.
- Ambroise : « Pas une charrette de prise. Belle job. »

TOTAL : environ 9 minutes de jeu et 3 vraies tâches. La partie stratégique est facultative ; avec seulement les deux premières sessions, la journée est complète.

### Ce qu’on garde de 006

À GARDER
- Univers : la colonie agro-tech chaleureuse de l'Orée et la palette papier, encre, sauge, sol et verre solaire (le braise passe au joueur, la menace devient bleu-violet).
- Personnages : Solène, Milo, Naïma et ÉCHO-7, avec le fragment « Vous êtes en retard de 184 cycles », enfin mis en scène et recontextualisé à la 6e révélation.
- Règles :
  - la Confiance (+1 à la première quête du jour, jamais dépensée), en unifiant ses seuils ;
  - la hiérarchie d'objectifs Maintenant / Chapitre / Long terme.
- La Tour météo instable, qui devient la Météo-Bastion. Sa réparation est le premier geste du chapitre 1, et ses niveaux allongent le préavis (2, 5, 7 puis 9 jours).
- Interface :
  - la carte « tâche conseillée » repliable avec score expliqué, étendue à 3 cartes ;
  - le mode construction (catalogue, fantôme de placement vert ou rouge, confirmer ou annuler) et le déblayage avec coût, qui devient « déblayer la brume » ;
  - les feuilles inférieures à 3 positions sur mobile et l'inspecteur persistant sur tablette.
- Accessibilité : contrôles de carte doublés par des boutons, cibles de 44 px, une seule case tabulable en mode construction, reduced-motion, couleur toujours doublée.
- Le découpage en modules vanilla (data / model / ui / app), qui devient core/ pur et testé plus ui/ et world/.
- La finition : revue finale, DESIGN.md, provenance des visuels.

À JETER
- Le bac à sable localStorage déconnecté de tasks.json.
- renderAll en innerHTML.
- La carte iso en CSS 8×8 et sa rotation 2D.
- Le bouton « Jour +1 » (relégué au mode debug).
- La récompense par paliers de longueur.
- Les incidents qu'il vaut mieux ignorer.
- Le jargon de prototype : sandbox, « Registre local », « fantôme aimanté ».

### Risques

1. Anxiété de la date fixe (la lune rouge de Kingdom)
   Parades :
   - préavis de 5 à 9 jours dès le chapitre 1 ;
   - pire issue bornée : 2 dégâts, 30 Mat de réparations en attente, fonte seule en 5 jours, aucune défense ni donnée touchée ;
   - « Dévier le front » une fois par chapitre ;
   - trêve des Fêtes ;
   - ton « rien de grave » ;
   - notifications désactivées par défaut.
   Le joueur léger simulé ne plie que 10 % des Avis.

2. Hiver vécu comme déprimant en plein hiver réel
   Parades :
   - palette « dedans chaleureux » ;
   - Lou et l'humour d'Ambroise ;
   - Fêtes et patinoire ;
   - l'orange domine toujours au centre de l'écran ;
   - un printemps garanti au calendrier, quel que soit le score.

3. Le jeu dicte le choix des tâches (faire du Véhicule pour l'Avis plutôt que l'urgent)
   Parades :
   - rang indépendant du jeu ;
   - garantie P≥8 dans le top 3 ;
   - bonus de domaine plafonné à 15 points, soit environ 15 % d'une Force moyenne ;
   - simple pastille informative.

4. Gonflement et inflation de tâches triviales
   Parades :
   - √L ;
   - plafond quotidien dégressif ;
   - cotes figées (le minimum est retenu) ;
   - registre en ajout seul ;
   - bonus d'ajout plafonné à 3 par jour et repris en cas de suppression ;
   - découpage à somme constante.

5. Jeu plus prenant que les tâches (piège de Focus Plant)
   Parades :
   - toute monnaie vient du réel, la production passive reste sous environ 15 % des gains ;
   - chantiers en heures réelles, sans accélération ;
   - fin de session explicite ;
   - session stratégique facultative et courte.

6. Couplage au vrai calendrier : installation tardive, absences, fuseau, tests
   Parades :
   - prologue adaptatif ;
   - advance() déterministe et plafonné ;
   - Force à graine fixée à l'annonce ;
   - machine à remonter le temps en debug ;
   - simulateur de profils dans la CI locale.

7. Périmètre trop gros pour un développeur seul (3D, systèmes, 8 chapitres)
   Parades :
   - interface WorldView qui permet de remplacer three.js par Canvas 2D au besoin ;
   - art 100 % procédural ;
   - textes en JSON avec pools ;
   - MVP limité au chapitre 1 ;
   - le contenu des chapitres 2 à 8 est surtout des données (dates, Forces, répliques).

8. Performance et batterie mobile
   Parades :
   - rendu à la demande ;
   - paliers de qualité ;
   - pause en arrière-plan ;
   - repli SVG.

9. Complexité perçue (5 étiquettes, bûches, Moral, chartes)
   Parades :
   - dévoilement progressif sur 3 semaines ;
   - jauge unique décomposable au toucher ;
   - toujours une action suggérée et chiffrée.

10. Sensibilité culturelle (verglas de 98)
    Parade : évocation sobre par un personnage, jamais en ressort comique.

### Tranche jouable

TRANCHE JOUABLE EN 3 SEMAINES, branchée sur les VRAIES tâches

SEMAINE 1 : cœur et utilitaire
- Modules core/ purs et testés : rank.js, reward.js, ledger.js, season.js, resolve.js, advance.js, migrate.js.
- Migration de tasks.json, testée sur une copie réelle : deadline, notes, archived et sous-tâches conservés.
- Carnet complet :
  - liste triable et filtrable (P, L, D, domaine, échéance, Note, puces ≈15 min et Peu d'énergie) ;
  - ajouter, éditer, annoter, sous-tâches, terminer, réactiver ;
  - les 3 cartes de recommandation.
- Registre anti-farming, plafond quotidien, bonus plafonnés.
- Simulateur porté en tools/sim.mjs.

SEMAINE 2 : monde
- Scène three.js, rayon 3 (37 hexagones) :
  - Foyer, 3 champs, Tour météo, Bûcherie, Atelier, Haie, Tunnels, Maison commune Nv1 ;
  - déblayer la brume ;
  - placement avec fantôme ;
  - jour et nuit réels, saison automne et givre.
- HUD et puce d'Avis.
- Animations 1, 2, 4 et 6 (étincelle, Première lumière, rempart, chantier).
- Vue Registre accessible, reduced-motion.

SEMAINE 3 : boucle de menace et récit
- Système d'Avis complet avec 2 menaces : Premier gel (FROID) et Grands vents (VENT).
  - Force à graine, fourchette, jauge décomposable ;
  - tâches de la fenêtre, braseros, bûches ;
  - résolution à 6 h, issues Tenu / Justesse / Plié, givre et fonte en 5 jours.
- Animations 3 et 5 (Front, nuit rejouée en version 8 s).
- Chapitre 1 entier :
  - Solène, Milo, Naïma, fragment 1 d'ÉCHO-7 ;
  - premières 60 secondes ;
  - 1 charte (« La veillée ») ;
  - Moral simple.
- Persistance de game-state.json par l'endpoint PHP (flock et révision), mode debug temporel.

HORS MVP
- Neige accumulée à 3 couches.
- Chapitres 2 à 8 et Avis multi-étiquettes.
- Convois d'Ambroise, Lou.
- PWA hors ligne, sons, notifications.
- Almanach.

CRITÈRES DE SUCCÈS (2 semaines de jeu réel par Alex)
- Prochaine tâche choisie en 5 s ou moins à l'ouverture.
- Ouvertures spontanées au moins 5 jours sur 7.
- Aucune tâche réelle perdue ni altérée.
- Le premier gel tenu comme « mérité » en entrevue.
- Le simulateur confirme léger ≤ 15 % de Plié et normal ≥ 75 % de Tenu.

SAISON 1 COMPLÈTE APRÈS LE MVP : environ 7 à 9 semaines de plus.

### Effort

XL

## E-foyer-miroir · Le foyer miroir : la maquette qui se souvient

### Pitch

Ta maison devient une maquette de bois posée sur la table. Chaque vraie tâche y est une boîte, et quand tu la termines, la boîte se déballe et son contenu s'installe dans le diorama : l'auto reluit, le sac d'école pend à la patère, la clôture se redresse. Au fil des vraies saisons québécoises, tu prépares la maquette à l'hiver et tu l'aménages ; elle devient l'album de l'année de ta famille, en écho au carnet de Pierrette, qui l'a remplie de l'automne 1974 à l'été 1975, et le travail domestique, invisible par nature, devient enfin visible.

### Fantaisie

Tu n'incarnes personne d'autre : tu es Alex, chez toi. Le fantasme n'est pas la puissance (bâtir une colonie), c'est la reconnaissance. Une maison propre ne montre jamais qu'on l'a nettoyée, des papiers classés ne se voient pas, un pneu bien gonflé non plus. La maquette rend ce soin visible, cumulatif et racontable.

Sensations visées :
1. Le petit bonheur d'Unpacking : ouvrir une boîte et voir un lieu devenir un chez-soi.
2. L'ordre satisfaisant d'A Little to the Left.
3. Le jeu de construction sans échec de Tiny Glade et Townscaper, le dimanche soir.
4. Un sentiment très québécois : être prêt pour l'hiver, avec la corde de bois pleine et l'abri d'auto monté avant la première bordée.
5. La tendresse du soir : la maquette éclairée de l'intérieur, comme quand on rentre chez soi et qu'on voit ses fenêtres allumées.

LA FERME EST-ELLE NÉCESSAIRE ? Non. Ce qui comptait dans la ferme survit intégralement : un lieu qui change, des saisons, des menaces annoncées et des projets à financer.

Ce qu'on gagne en la quittant :
- Le pont diégétique devient gratuit. La bible actuelle a besoin des Veilleurs, d'un relais et d'un « élan » pour expliquer pourquoi vider le frigo fait avancer une colonie. Ici, tu nettoies le frigo, et le frigo de la maquette reluit. Aucune explication à donner.
- Les domaines deviennent des lieux : Maison = cuisine et salon, Terrain = cour, Enfants = chambre, Véhicule = garage, Administratif = bureau. C'est la fin du constat « domaines reliés à rien ».
- La récompense première devient informative (voir ce que tu as fait) plutôt que tangible. C'est exactement ce que recommande la recherche sur la surjustification.
- L'hiver québécois devient un antagoniste réel, partagé et annoncé : un Kingdom Two Crowns sans science-fiction. Le jeu peut aussi proposer de vraies tâches de saison utiles, comme les pneus d'hiver (obligatoires le 1er décembre) ou les détecteurs de fumée au changement d'heure du 1er novembre.
- La valeur à long terme devient sentimentale (l'album de ta famille), pas compulsive.

Ce qu'on perd :
- L'échelle et la fantaisie de puissance d'une colonie qui grandit. Compensation : 4 saisons d'aménagement, des chefs-d'œuvre (véranda, cabane dans l'érable) et un socle qui s'agrandit en saison 2.
- Les chaînes de production façon Township. Elles sont remplacées par de la planification : préparatifs, protections durables, choix de la zone à financer. C'est plus de l'aménagement que de l'usine.
- Le mystère d'ampleur (Bastion, ÉCHO-7). Il est remplacé par un mystère intime, à hauteur humaine.
- Les engagements écrits de PRODUCT.md (colonie agro-tech, Potager, Bastion, trois ressources). La direction les traduit : le potager devient celui de la cour, le Bastion devient la maison face à l'hiver, Énergie et Matériaux fusionnent en Bûches, la Réputation devient la Chaleur. Mais Alex doit valider la rupture explicitement.
- Le danger du miroir accusateur, c'est-à-dire voir sa propre maison en désordre. Règle absolue : la maquette ne montre jamais de saleté, de bris ni de tristesse, seulement ce que tu as fait et la saison qui passe. « La saison ne juge pas, elle passe. »

### Boucles

10 SECONDES
- À l'ouverture, la carte du bas montre déjà la boîte sur laquelle dort Biscotte (« À faire d'abord »), plus 2 alternatives en puces.
- Une seule action suffit :
  - « C'est fait » : déballage de 1 à 2,4 s, +7 à +21 bûches.
  - « Je m'y mets » : la boîte s'entrouvre et la figurine va dans la pièce ; l'évaluation est figée.
  - « + Ajouter » : tu tapes le titre ; domaine, ancre et P/L/D sont proposés par mots-clés ; « Ajouter la tâche » fait tomber la boîte sur le perron (+1 bûche, max 3/jour).
- Aucun écran intermédiaire obligatoire ; le courrier attend.

2 MINUTES
- Relever le courrier : le drapeau de la boîte aux lettres est levé, 1 à 3 billets au plus, +2 bûches au premier relevé du jour.
- Déballer 1 ou 2 boîtes.
- Dépenser : une étape de projet (15 à 60 bûches) ou un préparatif météo (20 à 30).
- Placer une décoration.
- Lire la page de carnet débloquée.
- Fin explicite, à la Cozy Grove : « La maquette est à jour. Rien ne presse. À demain, Alex. »

1 JOURNÉE (jour réel de 4 h à 4 h, heure locale)
- Matin : plan « Quand… alors… » épinglé sur le frigo de la maquette (+3, une fois par jour), puis +2 par tâche planifiée terminée (max 2).
- Journée : la première tâche terminée allume le poêle (+1 Chaleur) et la cheminée fume pour le reste de la journée. Sans tâche, la maison va bien quand même, la cheminée ne fume pas, c'est tout.
- Soir : lumière réelle du crépuscule, fenêtres ambrées, aménagement, une page de carnet au plus.
- Visites pendant l'absence (Neko Atsume) : les zones avec au moins 2 lampes attirent des visiteurs (geais bleus à la mangeoire, Réal sur le perron, enfants du voisinage dans le tas de feuilles). Ils laissent une photo-Souvenir dans la boîte aux lettres : purement cosmétique, max 1 par jour.

1 SEMAINE
- Défi « Semaine au chaud » : foyer allumé 4 jours sur 7. Les 3 jokers sont intégrés et il n'y a aucune série quotidienne. Récompense : un Souvenir et une bûche gravée sur la corde.
- « Jour du recyclage », le jour choisi (dimanche par défaut) :
  - le bac bleu va au chemin ;
  - bilan de 2 minutes ;
  - triage des boîtes oubliées de plus de 60 jours : garder, réévaluer, découper ou ranger au grenier ;
  - +6 bûches, +1 Chaleur, et la page de la semaine s'ajoute à l'album.
- Lundi = nouveau départ : « Nouvelle semaine. Les boîtes ont pas bougé, mais toi, oui. »
- Un événement Météo du foyer toutes les 1 à 2 semaines, annoncé 5 jours avant.

1 SAISON (8 à 13 semaines, calée sur le vrai calendrier)
- Calendrier :
  - Automne : 5 oct. au 6 déc. ;
  - Hiver : 7 déc. au 7 mars ;
  - Temps des sucres : 8 mars au 2 mai ;
  - Été : 3 mai au 1er juillet.
- Contenu d'une saison : 2 ou 3 chapitres, 10 à 14 projets, 4 à 6 événements, une palette et une lumière qui changent.
- Bilan de saison dans l'album, par exemple : « Automne 2026 au 184 : 58 boîtes déballées, 4 zones allumées. La plus lourde : Nettoyer la terrasse. »
- Nouveau départ à chaque changement de saison.
- La boucle annuelle complète = un carnet complet (Pierrette 1974-75 en miroir d'Alex 2026-27).

### Tâches → jeu

PRINCIPE : le jeu ne touche jamais au rang. Le rang (quoi faire maintenant) et la récompense (combien ça vaut) sont deux calculs séparés.

RANG : la Note (0-100)
- Affichée « Note 74 », jamais appelée « priorité ».
- Formule : Note = 50·P/10 + 20·(11−L)/10 + 15·(11−D)/10 + urgence + ancienneté.
  - Urgence d'échéance : dépassée +15 ; dans 1 jour ou moins +12 ; 3 jours ou moins +8 ; 7 jours ou moins +4.
  - Ancienneté : +1 par semaine depuis la création, max +6.
- Calcul sur les vraies données du prototype (16 tâches ouvertes au 5 oct.) :
  - Faire l'inventaire des outils : 74 (P8/L3/D3, créée en juillet) ;
  - Nettoyer le véhicule : 70 ;
  - Réparer une clôture : 70 ;
  - Trier les photos : 66 ;
  - Nettoyer la terrasse : 56.

Trois recommandations, toujours visibles en bas d'écran :
- À faire d'abord = meilleure Note. Garde-fou : si aucune tâche P8 ou plus n'est dans le top 3, la meilleure d'entre elles prend la 3e place. Biscotte dort sur cette boîte : la recommandation est montrée dans le monde, en plus de la carte.
- Victoire rapide = meilleure Note parmi L3 ou moins et D4 ou moins (ex. : Nettoyer le véhicule, ~5 min).
- Grand chantier = meilleure Note parmi L6 ou plus (ex. : Nettoyer la terrasse, ~2 h).

Filtres et tri :
- Filtres en un tap : « 15 min » (L2 ou moins), « Peu d'énergie » (D3 ou moins), « Échéances 7 j », par zone.
- Toucher une pièce de la maquette = filtrer par domaine (filtre diégétique).
- Tri par Note, P, L, D, échéance ou ancienneté. Le registre (liste pure) est toujours à un tap.

Correspondances affichées :
- Longueur : L1 ~5 min, L2 ~15 min, L3 ~30 min, L4 ~45 min, L5 ~1 h, L6 ~2 h, L7 ~3 h, L8 ~½ journée, L9 ~1 journée, L10 plusieurs jours.
- Difficulté : D1-3 facile, D4-6 moyen, D7-10 exigeant.

LA BOÎTE : encodage physique des trois axes, toujours doublé d'un texte en DOM
- Longueur = taille : boîte à chaussures (L1-3), carton (L4-6), caisse de bois (L7-10).
- Difficulté = poids : autocollant plume « Léger » (D1-3), rien (D4-6), autocollant « Lourd » avec un diable sous la caisse (D7-10).
- Priorité = ruban : brique avec tampon « PRIORITAIRE ! » (P8-10), kraft (P5-7), bleu « Quand tu peux » (P1-4).
- Échéance = étiquette d'expédition « Avant le 1er déc. ». À 3 jours ou moins, l'étiquette bat au vent. Une fois la date passée, elle devient ambre « Date passée — toujours bonne à faire » ; jamais de rouge alarmant.
- Plus de 60 jours : étiquette vintage « Boîte oubliée » (+20 % de bûches, « Enfin! »).
- Visibilité : la maquette montre les 3 recommandations et au plus 2 boîtes par zone (12 au maximum). Les autres sont rangées dans la remise du fond de cour, avec un compteur « +7 » sur la porte. La maison n'a jamais l'air encombrée.

DOMAINES → ZONES
- Maison → rez-de-chaussée (cuisine, salon avec poêle, vestibule).
- Terrain → cour avant et arrière (érable, plates-bandes, potager, clôture, remise).
- Enfants → chambre à l'étage (plus balançoire et fort de neige).
- Véhicule → garage et entrée d'auto.
- Administratif → bureau à l'étage (classeur, babillard, boîte aux lettres).
- Domaines hérités des vraies données :
  - Jardin → cour ;
  - Ferme → potager de la cour ;
  - Professionnel → bureau, sur un pupitre « Travail » distinct du classeur « Paperasse » ;
  - domaine inconnu → vestibule, avec une proposition de rangement.

ANCRES : la tâche reliée à un objet précis
- Un dictionnaire d'environ 40 ancres et 150 mots-clés. Exemples :
  - frigo, réfrigérateur → frigo ;
  - pneu, auto, véhicule, huile → l'auto ;
  - clôture → clôture ;
  - fenêtre, vitre → fenêtres ;
  - recyclage, poubelle, vidanges → bacs ;
  - document, classer, impôt, assurance, budget → classeur ;
  - rendez-vous, appeler → téléphone mural ;
  - école, scolaire, sac → patère ;
  - outils, inventaire → établi ;
  - photos → album du salon ;
  - détecteur → plafond ;
  - vélo → support à vélo.
- Sans correspondance, la tâche va sur l'objet générique de la zone (un coffre). L'agent familial peut écrire un champ optionnel « anchor ».
- Bonus utile : l'ancre détecte les domaines incohérents. Avec les données actuelles, il y a 7 suggestions au premier lancement, par exemple : « Faire l'inventaire des outils est classée Administratif, mais ça ressemble à l'établi du garage. Je la déplace? » [Oui] [Laisse-la]. Les corrections sont mémorisées.
- On peut aussi glisser une boîte d'une pièce à l'autre pour changer son domaine (au clavier : par le formulaire).

OBJET-REFLET
- Un objet passe de neutre à « soigné » pendant 14 jours après une tâche : l'auto reluit avec ses pneus d'hiver, le frigo a ses aimants et des fruits. Il revient ensuite à neutre, jamais à « sale ».
- 5 soins sur la même ancre donnent une maîtrise permanente (par exemple, l'établi reçoit un panneau perforé avec ses outils).
- Lampes de zone, de 0 à 3, selon les tâches du domaine sur 14 jours : 1 tâche = 1 lampe, 2 à 3 = 2 lampes, 4 et plus = 3 lampes. À 0, la pièce somnole sous une lumière tamisée, sans rien de cassé.

STATUTS
- « Je m'y mets » : en cours, évaluation figée, Biscotte vient s'asseoir près de la figurine (présence pendant l'effort).
- « C'est fait » : terminée. Ensuite : « Un mot pour l'album? » (facultatif). Ce mot va dans les notes de la tâche et sert de légende dans l'album, ce qui répond au « l'accomplit, l'annote » de PRODUCT.md.
- « Remballer » : réactiver.
- « Ranger au grenier » : archiver ; la tâche est conservée.
- Les verbes clairs restent sur les boutons ; la métaphore vit dans l'animation.

SOUS-TÂCHES = boîte à compartiments
- Chaque sous-tâche est un rabat.
- Découper une tâche coche d'office le premier compartiment, « Choisir la première étape » (progrès doté).
- Les sous-tâches ne paient aucune bûche (anti-découpage). La boîte parente paie à la fin, avec +10 %.

RÉCURRENCES = rituels
- Chaque récurrence a un objet dédié : bac bleu au chemin le mercredi, arrosoir, calendrier du frigo.
- Une seule occurrence est vivante à la fois : la suivante remplace l'ancienne sans s'empiler et sans message.
- 8 occurrences terminées donnent une patine permanente à l'objet.

ÉCHÉANCES
- Elles jouent sur l'urgence dans la Note.
- +25 % de bûches si la tâche est terminée avant l'échéance, à condition que l'échéance ait été fixée au moins 24 h avant.
- Une fois l'échéance passée, aucune pénalité.

COLIS DE L'AGENT FAMILIAL
- Une tâche dictée à l'agent (texte ou vocal) arrive dans tasks.json.
- À l'ouverture suivante, la fourgonnette de Monique passe : « 3 colis pendant ton absence. »

BONUS PLAFONNÉS (sans lien avec une fin de tâche)
- Ajouter une vraie tâche : +1, max 3 par jour.
- Relever le courrier : +2, une fois par jour.
- Plan « Quand… alors… » : +3 une fois par jour, puis +2 par tâche planifiée terminée (max 2).
- Jour du recyclage : +6 par semaine.
- Retour après au moins 3 jours d'absence : +5 forfaitaire.
- Plafond : 12 par jour (17 le jour d'un retour), plus 6 par semaine.

### Économie

TROIS RESSOURCES, UN RÔLE CHACUNE
La paire Énergie/Matériaux de 006 fusionne. L'audit a montré qu'elle créait de la confusion (3 Énergie donnaient 3 Matériaux) sans créer de vrai choix.
- BÛCHES : dépensables, proportionnelles à l'effort. « Chaque vraie tâche fend un peu de bois pour la maquette. » Elles se voient : la corde de bois près du garage gagne une bûche visible par tranche de 10 (pleine à 300). Départ : 30.
- CHALEUR : jamais dépensée ni retirée ; elle mesure la présence, pas le volume. +1 à la première tâche du jour (le foyer s'allume), +1 au Jour du recyclage. Elle débloque les chapitres, les pages du carnet et les projets. Départ : 0.
- SOUVENIRS : collection non monétaire. Une photo d'album par grand chantier, événement, visite ou Semaine au chaud. C'est un retour purement informatif.
- En plus, les TAMPONS de zone : un compteur, pas une monnaie. Il compte les vraies tâches d'un domaine terminées depuis le début d'un projet de cette zone. Comme à Stardew, les gros projets demandent du vrai travail varié.

RÉCOMPENSE PAR TÂCHE (évaluation figée)
- Formule : Bûches = arrondi[(2 + 4·√L + 0,6·D) × (0,9 + 0,02·P)].
- Exemples :
  - P10/L1/D1 = 7 ;
  - Nettoyer le véhicule (P6/L1/D2) = 7 ;
  - Trier les photos (P6/L2/D3) = 10 ;
  - Faire l'inventaire des outils (P8/L3/D3) = 11 ;
  - P7/L5/D5 = 15 ;
  - Nettoyer la terrasse (P8/L6/D7) = 17 ;
  - Préparer les repas de la semaine (P8/L9/D9) = 21.
- Le rapport long/court est d'environ 3 pour 1 :
  - la grosse tâche vaut plus au total, donc l'effort n'est pas puni ;
  - la courte rapporte plus par minute, donc gonfler L ne sert à rien ;
  - P ne pèse que ±10 %, pour ne pas inciter à gonfler la priorité.
- Le rang pousse vers le court ; la récompense valorise le long. C'est la séparation rang/récompense voulue.
- Modificateurs :
  - avant l'échéance : +25 % ;
  - boîte oubliée (plus de 60 jours) : +20 % ;
  - parent dont toutes les sous-tâches sont terminées : +10 % ;
  - tâche créée moins de 15 min avant d'être terminée (« je l'ai déjà fait ») : ×0,5. Elle compte quand même pour la Chaleur et l'album.
- Plafond quotidien dégressif sur les bûches de tâches : 100 % de 0 à 70, 50 % de 70 à 140, 20 % au-delà. Exemple : une grosse journée de chantier (8 tâches, environ 115 bûches brutes) donne environ 92.

PUITS DE LA SAISON AUTOMNE (5 oct. au 6 déc.) : environ 2 480 bûches au total
- 12 projets d'aménagement, environ 830 bûches. Chiffres = coût de chaque étape.
  - Chapitre 1 :
    - Lampe du perron 15/25/40 ;
    - Coin lecture 20/30 ;
    - Mur de dessins 15/25.
  - Chapitre 2 :
    - Plates-bandes d'automne 20/35/55, plus 2 tampons Terrain (protection contre le gel) ;
    - Établi 20/35/55 (ouvre clôtures et chemins) ;
    - Classeur ordonné 20/35, plus 1 tampon Administratif ;
    - Citrouilles 30.
  - Chapitre 3 :
    - Abri d'auto 25/40/60, plus 2 tampons Véhicule (protège de toutes les bordées de l'hiver) ;
    - Calfeutrage 25/40, plus 1 tampon Maison (protège du grand froid) ;
    - Corde de bois 30/45 ;
    - Mangeoire 20/30 (visiteurs) ;
    - Radio du coin 40 (annonces à 7 jours au lieu de 5).
- Préparatifs météo : environ 150 (4 menaces à 20-30 chacune). Ils sont gratuits si tu termines une vraie tâche du domaine.
- 30 décorations à placer librement, de 10 à 60 bûches (environ 900) : guirlandes, jardinières, chaise Adirondack, bonhomme de neige…
- 2 chefs-d'œuvre optionnels à 300 : Véranda, Cabane dans l'érable.
- « Réal connaît un gars » : un tampon manquant peut être remplacé par 15 bûches.

SIMULATION
Paramètres : 400 tirages sur 63 jours. Tâches tirées selon une loi normale : L moyenne 4 (écart-type 2,2), P moyenne 6,3 (écart-type 1,4), D moyenne 4,3 (écart-type 1,8). Script : simulations/foyer-miroir.py.

| Profil | Rythme | Bûches (p10–p90) | Chaleur | Résultat |
|---|---|---|---|---|
| Alex léger | actif 1 jour sur 2, 1,5 tâche/jour | 750 (620–880) | 40 | les projets clés des 3 chapitres (~300) et la moitié du reste |
| Alex régulier (cible) | actif 4 jours sur 5, 3 tâches/jour | 2 030 (1 830–2 220) | 60 | tous les projets, les préparatifs et ~60 % des options |
| Alex intense | 5,5 tâches/jour | 4 320 | — | tout ; ~1 800 reportés vers le catalogue d'hiver, plus large |
| Absence de 3 semaines au milieu | — | 1 370 | — | aucune perte ; seuil de Chaleur 22 atteint au jour 42 au lieu de 22 |

- Les tâches font 72 à 83 % des gains ; les bonus plafonnés, 17 à 28 %.
- Rythme de Chaleur des chapitres (seuils 4, 12, 22) :
  - Alex régulier : jours 4, 12 et 22 ;
  - Alex léger : jours 6, 19 et 34.
- Les verrous de calendrier (19 oct., 9 nov.) dominent pour l'Alex régulier ; la Chaleur ralentit seulement l'Alex léger. C'est le comportement voulu.

ANTI-FARMING (corrige les bogues de 006)
- Registre de gains en ajout seul dans game-state.json, de la forme {id, taskId, occurrence, montant, raison, horodatage}. Une tâche, ou une occurrence de récurrence, ne paie qu'une seule fois.
- Remballer dans les 24 h annule le gain par une écriture inverse, et la boîte se referme à l'écran. Après 24 h, le gain reste acquis, mais une nouvelle fin ne repaie pas. Terminer → Remballer → Terminer = +0.
- Évaluation figée : la récompense utilise le plus petit entre (L et D au démarrage, ou 24 h avant la fin) et les valeurs actuelles. Hausser L la veille ne paie pas.
- Les sous-tâches ne paient pas ; les tâches éclair paient ×0,5.
- Temps réel seulement : le jour est la date locale (de 4 h à 4 h, date du serveur quand on est en ligne). « Jour +1 » n'existe qu'avec ?debug=1, sur un état bac à sable séparé.
- Chapitres doublement verrouillés, par la Chaleur et par le calendrier. Le chapitre 1 exige au moins 4 jours distincts.
- Les événements viennent du calendrier, jamais de la négligence.

ÉVÉNEMENTS : une règle unique
- Annonce 5 jours avant (7 avec la Radio du coin). Au plus 2 menaces actives en même temps.
- PRÉPARER, au choix :
  - payer 20 à 30 bûches ;
  - ou terminer une vraie tâche du domaine pendant la fenêtre (pas une tâche éclair) ;
  - ou posséder la protection durable.
  Résultat : Souvenir doré, aucune pause.
- NE RIEN FAIRE : la zone touchée passe en pause (projets gelés sous le givre ou la neige, rien de cassé). Elle en sort de l'une de ces façons :
  - payer 1,5 fois le coût ;
  - ou terminer une vraie tâche du domaine ;
  - ou attendre 7 jours de dégel naturel.
  Attendre ne compte pas pour l'objectif de chapitre. Le Souvenir est différent mais tout aussi chaleureux (« On a pelleté ensemble »).
- Préparer domine donc ignorer dès que la zone t'intéresse. Ignorer reste un choix légitime, jamais une punition.
- Absence de plus de 5 jours : les événements de la période se résolvent seuls (« Réal a pelleté ton entrée. Il t'a laissé un mot. »).

### Narration

PRÉMISSE
- Un colis sans adresse de retour arrive. Il contient une maquette de maison en bois brut, des boîtes miniatures et un carnet de maison tenu par une certaine Pierrette, de l'automne 1974 à l'été 1975.
- Le socle porte un numéro gravé : 184 (clin d'œil au fragment « 184 cycles » de 006).
- Première page du carnet : « Cette maquette se souvient de ce qu'on fait pour une maison. » Quand Alex termine une vraie tâche, la boîte miniature correspondante s'ouvre.
- C'est du réalisme magique léger, jamais expliqué techniquement.
- Phrase-clé (remplace « Ce que tu accomplis hors d'ici… ») : « Une maison propre, ça montre rien. La maquette, oui. »
- Noms : le produit s'appelle Quêtes du foyer, le monde est la maquette du 184, et « Le foyer miroir » est le titre de la saison 1.
- Dès les 3 premières minutes, le joueur sait :
  - ce qu'il gère : sa maison en maquette ;
  - pourquoi : la maquette se souvient du soin ;
  - son objectif immédiat : déballer une boîte ;
  - l'objectif du chapitre : la lampe du perron ;
  - le long terme : passer l'hiver en étant prêt, remplir le carnet d'une année, découvrir qui a envoyé la maquette.

PERSONNAGES
Trois voix et une chatte, tous non joueurs. La vraie famille n'est jamais fictionnalisée.
- Monique Lavoie, 51 ans, factrice.
  - Elle livre le courrier du matin (1 à 3 billets), les colis (les nouvelles tâches) et la Météo du foyer. Drôle, directe, chaleureuse.
  - Secret : elle est la fille de Pierrette, le « bébé de la poudrerie » de février 1975.
  - « Salut Alex! Deux colis pour toi, pis la radio annonce du gel jeudi. Tes plates-bandes vont faire la baboune. »
- Pierrette Lavoie, voix du carnet 1974-75.
  - 32 ans à l'époque, mère de Denis (9 ans), Sylvie (6 ans) et Luc (3 ans), enceinte du quatrième. Pratique, pince-sans-rire, un brin mélancolique.
  - Ses pages sont manuscrites, avec une version lisible.
  - « 12 novembre 1974. Rosaire a posé les châssis doubles tout seul, en sacrant juste un peu. Les enfants ont dessiné des bonhommes dans la buée. Je les ai pas effacés. »
- Réal Tremblay, voisin retraité, patenteux.
  - Il arrive à la fin du chapitre 1, ouvre l'Atelier, commente les projets et « connaît un gars ».
  - « Pas pire pantoute, ton abri. Y va tenir jusqu'au printemps, c'est garanti. »
- Biscotte, la chatte tigrée de la maquette (un réglage permet de choisir un chien ou aucun animal).
  - Muette. Elle dort sur la boîte conseillée, saute dans le tas de feuilles et s'assoit près de la figurine pendant « Je m'y mets ».
- La famille d'Alex, facultative.
  - Figurines personnalisables (nombre, silhouettes, prénoms facultatifs), sans dialogue, qui n'expriment jamais de tristesse.
  - Elles utilisent ce qui a été déballé : par exemple, une figurine part le matin avec le sac d'école préparé.

RÈGLES D'ÉCRITURE
- Interface en français standard québécois, tutoiement partout. La couleur locale reste mesurée et réservée aux répliques des personnages.
- Mots bannis : « en retard », « échec », « tu as manqué », « négligé ».
- Célébrations en 3 paliers, proportionnées à L :
  - petit : « Une de moins. » / « Réglé. » ;
  - moyen : « Propre, propre, propre. » ;
  - grand chantier : « Nettoyer la terrasse : c'est fait, pis bien fait. La maquette va s'en souvenir longtemps. »
- Au moins 8 variantes par situation fréquente.
- Glossaire fermé : boîte, colis, c'est fait, remballer, bûches, Chaleur, Souvenir, zone, projet, préparatif, Météo du foyer, carnet, album, remise.
- Les pages se débloquent à Chaleur 2, 3 et 4, puis tous les 2 points de Chaleur, plus une page de fin de chapitre. Au plus une page par jour, jamais au-delà du chapitre courant. Cela fait environ 50 pages par an.

CHAPITRE 1 — « Le colis » (du 5 au ~18 oct. ; Chaleur 0 → 4 ; au plus tôt au jour 4)
Temps forts :
- Jour 1 : le colis, la maquette qui se déplie, puis la page 1 : « Moi, je l'ai remplie de l'automne 74 à l'été 75. À ton tour. Commence petit : une boîte, c'est une boîte. — P. » Premier déballage, premier foyer.
- Jour 2, Monique : « Ça fait des années que je fais cette tournée-là. J'avais jamais vu un colis sans adresse de retour. »
- Chaleur 2 : Pierrette présente sa maison et les siens.
- Lundi 12 oct. (Action de grâce) : opportunité « Souper de famille » (table dressée, 15 bûches), qui donne un Souvenir.
- Chaleur 3 : la thèse du jeu. « Rosaire dit que la maquette, c'est pour que je voie ce que je fais. Parce qu'une maison propre, ça montre rien. »
Objectifs :
1. Déballer 3 boîtes dans au moins 2 zones.
2. Terminer la Lampe du perron (80 bûches en 3 étapes).
3. Atteindre 4 de Chaleur.
4. Facultatif : « Ranger les boîtes », c'est-à-dire corriger les domaines suggérés (+5 une fois).
Fin : Réal se présente devant le perron fraîchement éclairé. « Salut, voisin! Belle lampe. T'aurais besoin d'un établi, toi. » L'Atelier (placement libre) s'ouvre, avec 4 nouveaux projets.

CHAPITRE 2 — « Le temps des feuilles » (à partir du 19 oct. ; Chaleur 4 → 12)
Monde : érables rouges, feuilles qui tombent dans la cour (cosmétique), un tas de feuilles où Biscotte saute à chaque tâche Terrain.
Événements :
- Grand ratissage (~22 oct.) : opportunité, avec la suggestion réelle « Ramasser les feuilles ».
- Premier gel (~29 oct.) : menace sur la cour.
- Halloween (samedi 31 oct.) : si une citrouille est posée et la lampe du perron allumée, trois figurines costumées sonnent à la porte entre 17 h et 20 h réelles. Souvenir « Halloween au 184 ».
- Changement d'heure (dimanche 1er nov.) : suggestion réelle « Tester les détecteurs de fumée et changer les piles ».
Récit (pages 5 à 9) :
- Les feuilles ramassées avec les enfants en 1974.
- Rosaire fabrique la maquette « le soir, au sous-sol, quand il pense que je dors ».
- « Le quatrième s'en vient pour février. Rosaire veut un garçon, moi je veux juste que ce soit pas en pleine tempête. »
- Page 7 : « la boîte bleue de Rosaire, que j'ouvrirai pas avant le printemps ». Une petite boîte bleue verrouillée apparaît au grenier de la maquette ; elle restera un mystère jusqu'au chapitre 7.
- Page 8 : « Rosaire a fini la petite remise de la maquette. Il dit qu'une maison, c'est jamais fini. Je lui ai dit : nous autres non plus. »
Objectifs :
1. Plates-bandes d'automne (110 bûches et 2 tampons Terrain).
2. Affronter le Premier gel : il faut l'avoir préparé ou résolu, pas seulement attendu.
3. Déballer un grand chantier (L6 ou plus).
4. Atteindre 12 de Chaleur.
Récompense : la Radio du coin devient disponible, et la palette d'automne s'approfondit.

CHAPITRE 3 — « Avant la première neige » (à partir du 9 nov. ; Chaleur 12 → 22)
Suggestions réelles : pneus d'hiver (obligatoires au Québec du 1er déc. au 15 mars, proposés dès le 1er nov. avec échéance), monter l'abri d'auto, calfeutrer, contrat de déneigement.
Événements :
- Grands vents (~17 nov.) : les décorations de la cour s'envolent.
- Première bordée (entre le 25 nov. et le 3 déc.) : le moment signature.
Récit (pages 10 à 15) :
- Les châssis doubles, la fournaise capricieuse.
- La page du 2 décembre est arrachée : deuxième mystère.
- À la première bordée, Monique : « Mon père disait que la neige, ça efface rien. Ça recouvre. » C'est le premier indice qu'elle connaît le carnet.
- Page 15 : « 30 novembre 1974. Première neige. Les enfants ont collé leur nez sur la vitre. Moi aussi. »
Objectifs :
1. Construire l'Abri d'auto (125 bûches et 2 tampons Véhicule), ou affronter la bordée.
2. Terminer une vraie tâche Véhicule, idéalement les pneus.
3. Atteindre 22 de Chaleur.
4. Réussir une Semaine au chaud.
Récompense : bascule en Hiver (neige, vêtements d'hiver des figurines) et chapitre « Automne 2026 » de l'album, avec son bilan.

ARC LONG (un an = un carnet)
- Chapitre 4, « Les Fêtes » (7 déc. au 3 janv.) : lumières, sapin, réveillon. Monique livre une enveloppe contenant une photo du 184 en 1974.
- Chapitre 5, « Le grand froid » (janvier) : la fournaise de Pierrette lâche le 3 janvier 1975. Dans la maquette, le Calfeutrage protège la maison.
- Chapitre 6, « La poudrerie » (février) : le quatrième naît pendant la tempête. « On l'a appelée Monique. » Révélation : « Oui. C'est moi, le bébé de la poudrerie. »
- Chapitre 7, « Le temps des sucres » (mars-avril) :
  - la boîte bleue s'ouvre ; elle contient les plans de la maquette et un mot de Rosaire : « Pour que tu voies ce que tu fais. Pis ceux qui viendront après. » ;
  - Monique raconte que Pierrette, 85 ans, vit en résidence et lui a demandé de confier la maquette « à une maison qui a des boîtes sur son perron ».
- Chapitre 8, « Le 1er juillet » (mai-juin) :
  - on apprend pourquoi les Lavoie ont quitté le 184 le 1er juillet 1975 (un emploi à Sept-Îles) ;
  - la page arrachée revient ;
  - Monique montre l'album d'Alex à sa mère. Dernière page, d'une écriture tremblée datée de 2027 : « Tu l'as bien remplie. Continue. — P. »
- Saison 2 : l'album d'Alex devient le nouveau carnet, et le socle s'agrandit (potager d'été, piscine hors terre ou ruelle selon le type d'habitation).

### Direction visuelle

« Une maquette de bois peint, éclairée par la vraie lumière du jour. »

OBJET
- Une maison en coupe, comme une maison de poupée, sur un socle de noyer, lui-même posé sur une table de cuisine floue. Jamais de plaine verte vide (corrige 006).
- Le mur côté caméra disparaît automatiquement, comme une coupe à la Unpacking ou Fallout Shelter.
- Pièces :
  - rez-de-chaussée : cuisine, salon avec poêle à bois, vestibule ;
  - étage : chambre des enfants et bureau ;
  - garage attenant et entrée d'auto ;
  - cour avant : perron, boîte aux lettres rurale, érable ;
  - cour arrière : plates-bandes, potager, remise, corde de bois, clôture.
- Trois gabarits :
  - maison (canadienne à lucarnes ou bungalow) ;
  - jumelé ;
  - logement, en plex avec escalier extérieur ; le garage devient alors une place de stationnement dans la ruelle.
- Échelle : architecture sur une grille de 25 cm, accessoires en mini-voxels de 12,5 cm (un frigo fait 5×12×5). Le socle compte environ 48×40 cellules.
- Caméra : orthographique isométrique, 4 angles par pas de 90°, pincer pour zoomer. Toucher une pièce lance un travelling avant de 0,6 s.

PALETTE (jetons sur :root ; le thème sombre correspond à la nuit de la maquette)
- Bois : érable #E9D3AE, merisier #C99A63, noyer du socle #8A5A3B.
- Boîtes :
  - kraft #C9A06B, ruban crème #E8D9B5 ;
  - ruban prioritaire brique #B4472F, toujours avec tampon et icône, jamais la couleur seule ;
  - ruban « Quand tu peux » #6F8FA8.
- Interface reprise de 006 : papier #FFF8E8, crème #F7E7BD, encre #273026, encre mousse #4F5848, sauge #718C5D.
- Automne : érable rouge #C8553D, ocre #D9A441, mousse #6D7F4E, ciel #F2D6A8 → #9EC3D9.
- Hiver : neige #F4F6F8, ombre bleue #8FA7C4, nuit #23304A, fenêtre #FFCF7A.
- Fêtes : sapin #2F5D4A, lumières #FFD36B.
- Temps des sucres : bourgeon #B5C99A, sirop #A0522D.
- Règle sémantique (remplace la règle Braise de 006) : le chaud, c'est toi (foyer, Chaleur, fenêtres, bûches) ; le froid, c'est la saison (givre #5F8FB3 avec une icône de flocon pour les menaces). Rien d'alarmant en rouge.

TYPOGRAPHIE
- Polices réellement chargées : préchargement et font-display: swap (corrige 006).
- Fraunces pour les titres et le carnet ; Atkinson Hyperlegible pour l'interface et les chiffres.
- Caveat seulement pour quelques mots manuscrits de Pierrette, toujours doublés d'une version lisible.

MATIÈRE
- Voxels lisses à couleur par sommet, avec l'occlusion ambiante cuite dans les sommets.
- Ombres de contact douces sous chaque objet, légère vignette, aucun contour noir.
- Tout le texte est en DOM, jamais dans la 3D.

RÉFÉRENCES
- Unpacking : les objets racontent une vie.
- A Little to the Left : l'ordre satisfaisant.
- Townscaper : pastels, clôtures et chemins qui se raccordent tout seuls.
- Tiny Glade : construire est un jeu, lumière dorée.
- Animal Crossing et Cozy Grove : vraie horloge, couleurs qui reviennent.
- Monument Valley et les décors en coupe de Wes Anderson : le diorama.
- Le Québec réel : abri d'auto en toile blanche, bacs bleu/vert/brun, escalier extérieur en colimaçon, boîte aux lettres rurale.

MOMENTS SIGNATURE
- La maquette qui se déplie à l'accueil.
- Le foyer qui s'allume, chaque jour.
- La première neige.
- La nuit d'hiver : fenêtres ambrées sur neige bleue, Biscotte sur le rebord.
- Halloween à l'heure réelle, avec les figurines costumées.
- Le grand chantier, quand la caméra plonge dans la pièce.
- La page de la semaine qui se tourne.

MISE EN PAGE
- Mobile (390×844) :
  - en haut, un HUD d'une ligne : saison et date, Chaleur, bûches, menu ;
  - la maquette occupe environ 56 % de la hauteur, soit à peu près 390×470 px (contre 200×150 px dans 006) ;
  - une carte « À faire d'abord » repliable d'environ 180 px, avec 2 alternatives en puces ;
  - un dock : Maquette · Tâches · + Ajouter · Carnet · Album.
- Tablette (834) : maquette à gauche sur 60 % de la largeur, registre permanent à droite.

### Animations signature

1. LE DÉBALLAGE (terminer une tâche)
En 3 paliers selon L. Un tap l'interrompt après 0,4 s.
- Petit (L1-3, 1,0 s) :
  - la boîte s'écrase (0-120 ms, échelle Y 0,85) ;
  - le ruban se déchire (120-380 ms) ;
  - les rabats s'ouvrent (380-600 ms, −110°, easeOutBack) ;
  - l'objet-reflet monte (600-900 ms, échelle 0,6 → 1,08 → 1) ;
  - 6 cubes de poussière dorée ;
  - la boîte s'aplatit et glisse vers le bac bleu.
- Moyen (L4-6, 1,6 s) : en plus, un travelling de 6 % vers la pièce et 12 cubes.
- Grand chantier (L7-10, 2,4 s) :
  - travelling avant dans la pièce (0,5 s) ;
  - la lumière de la pièce se réchauffe de 15 % et une lampe de zone s'allume ;
  - 20 cubes et un anneau de poussière ;
  - une réplique de personnage.
- Dans tous les cas, les bûches volent en arc vers le compteur : une icône par tranche de 3, 7 au maximum, avec 60 ms de décalage. Le compteur n'avance qu'à l'arrivée de chacune (corrige 006).

2. LA LIVRAISON (ajouter une tâche)
- La boîte tombe de 2 unités sur le perron (350 ms).
- Elle s'écrase en touchant le sol (0,8 → 1,05 → 1 en 180 ms), avec un anneau de poussière.
- Elle rejoint sa pièce en 2 ou 3 sauts de 220 ms.
- Pour les colis de l'agent familial : la fourgonnette de Monique traverse d'abord la rue (1,2 s), puis les chutes se succèdent avec 120 ms de décalage et une puce « 3 colis ».

3. LE FOYER S'ALLUME (une fois par jour, 2,0 s)
- Pause de 0,3 s.
- La caméra glisse vers le salon (0,6 s).
- Une étincelle d'allumette (2 images), puis la flamme grandit en 0,5 s avec un scintillement par bruit.
- Les fenêtres passent à l'émissif ambré (0,6 s).
- La fumée sort de la cheminée en ondulant et reste toute la journée.
- Une flamme vole jusqu'au compteur de Chaleur.

4. BISCOTTE CHANGE DE BOÎTE (la recommandation change)
- Ses oreilles frémissent (100 ms), elle se lève (200 ms).
- Elle marche sur un graphe de points de passage entre les pièces (0,6 à 1,2 s).
- Elle bondit sur la nouvelle boîte (arc de 250 ms), tourne et se roule en boule (300 ms).
- Au repos : respiration (échelle 1 → 1,02 à 0,25 Hz) et un coup de queue toutes les 6 à 10 s.

5. L'EMPILEMENT (construire ou placer)
- Le fantôme, à 0,5 d'opacité, s'aimante à la grille avec un ressort doux (raideur 300, amortissement 20).
- La validité est signalée par une icône ✓ ou ✕, en plus de la couleur.
- À la confirmation, les bûches partent du compteur vers l'objet : dépenser aussi est tangible.
- Les voxels s'empilent couche par couche (40 ms par couche, 0,5 à 0,8 s), puis un « pouf » de poussière.
- Les clôtures et les chemins se raccordent tout seuls (masque de 4 voisins).

6. LA PREMIÈRE NEIGE (une fois par saison, 4 s)
- Des flocons instanciés tombent.
- Une calotte de neige pousse sur toutes les faces supérieures, de 0 à 1 voxel en 3 s.
- La palette glisse de l'automne à l'hiver en 2 s, et les fenêtres se réchauffent.
- Si l'abri d'auto existe, la neige glisse sur la toile en 0,5 s et l'auto reste dégagée : badge « Prêt ✓ ».
- Les autres menaces suivent la même grammaire : le givre cristallise depuis les coins, les rafales font tanguer les décorations.

7. LA LUMIÈRE VRAIE (continue)
- 6 états interpolés selon l'heure locale et le vrai lever et coucher du soleil à la latitude de Québec (46,8°) : coucher vers 18 h 15 en octobre, vers 16 h 15 en décembre.
- Après le coucher du soleil, les fenêtres s'allument.
- La nuit, le ruban des boîtes luit faiblement et la boîte conseillée porte une petite lanterne.
- Mise à jour toutes les 5 minutes, sans boucle continue.

8. LE JOUR DU RECYCLAGE (bilan hebdomadaire, 3 s)
- Toute la semaine, chaque boîte aplatie ajoute une tranche dans le bac bleu : la pile sert de compteur.
- Le jour venu, le bac roule au chemin (0,8 s), puis la fourgonnette le vide (1 s).
- La page tourne (courbure CSS 3D, 0,7 s) et s'ouvre sur la double page de l'album, dont les chiffres défilent en 0,6 s.

RÉDUCTION DE MOUVEMENT
Toutes ces animations deviennent des fondus de 150 ms. Les compteurs se mettent à jour immédiatement, sans particules ni chute de neige, et Biscotte apparaît au lieu de marcher.

### Technique

RECOMMANDATION
three.js en caméra orthographique, chargé en modules ES natifs par import map, sans build. Liste DOM d'abord, 3D ensuite.

POURQUOI CE CHOIX
- Pas DOM/CSS (006) :
  - la rotation CSS 2D a cassé la projection ;
  - innerHTML empêche les animations d'état ;
  - une maison en coupe avec de la lumière, de la neige et des fenêtres qui s'allument est hors de portée du CSS.
- Pas Canvas 2D ni PixiJS avec sprites pré-rendus : il faudrait dessiner chaque objet × 4 angles × ses états × les saisons × la lumière. C'est un volume d'art intenable seul. Avec de vrais voxels, la saison et l'heure deviennent des paramètres, pas des dessins.
- Pas Phaser ni Kaplay : ils sont en 2D.
- three.js : environ 170 Ko gzip, et il fournit OrthographicCamera, InstancedMesh, VOXLoader et BufferGeometryUtils.

PIPELINE D'ART (développeur seul assisté par IA)
- Les objets sont décrits en « recettes » JS : des listes de pavés colorés, faciles à générer et à modifier par IA.
- Au chargement, maillage glouton et occlusion ambiante par sommet, en arrière-plan (requestIdleCallback), avec cache dans IndexedDB.
- MagicaVoxel (.vox, lu par VOXLoader) sert pour les pièces organiques (Biscotte, l'érable).
- Un objet = un maillage fusionné. Deux matériaux en tout : Lambert à couleurs par sommet, et un émissif pour les fenêtres, la flamme et les rubans la nuit.

BUDGETS MOBILES
- Au plus 60 appels de dessin et 80 000 triangles.
- Une lumière directionnelle et une lumière hémisphérique.
- Ombres de contact en quads. Les vraies ombres (PCF 1024) seulement en « Qualité élevée ».
- Densité de pixels de 2 au maximum, abaissée à 1,5 puis 1,25 si la médiane d'image dépasse 20 ms.
- Instanciation :
  - boîtes : 3 gabarits, 24 instances au plus ;
  - particules : 64 cubes ;
  - flocons : 200, ou 120 sur appareil modeste.
- Rendu à la demande :
  - 0 image par seconde au repos ;
  - l'ambiance (fumée, respiration, flamme) est plafonnée à 24 images par seconde et coupée après 20 s d'inactivité ou quand l'onglet est caché.
- Lever et coucher du soleil calculés localement, sans réseau.
- Cibles : 60 images par seconde pendant un déballage sur iPhone 12, au moins 30 sur Android milieu de gamme.

ORDRE DE CHARGEMENT
1. HTML, CSS, core et registre (moins de 60 Ko gzip), interactifs en moins d'une seconde sur 4G.
2. Image instantanée de la dernière maquette (WebP en Cache Storage), affichée immédiatement.
3. three.js et la scène, en import dynamique, puis un fondu enchaîné.
L'utilitaire n'attend jamais la 3D.

ACCESSIBILITÉ
- Aucun texte dans le canvas.
- Chaque boîte et chaque zone est un vrai <button> en surimpression, positionné par projection et recalculé seulement quand la caméra bouge.
- Cibles de 44 px minimum, avec un aria-label complet. Exemple : « Boîte : Faire l'inventaire des outils. Prioritaire, environ 30 minutes, facile. À faire d'abord. »
- Un seul arrêt de tabulation dans la maquette ; les flèches servent à se déplacer (motif repris de 006).
- Réduction de mouvement : fondus de 150 ms et coupes de caméra.
- Repli sans WebGL ou en « Mode léger » : un plan SVG 2D de la maison.
- Le registre reste à un tap partout.

ARCHITECTURE
- core/, pur et testé avec node --test :
  - score.js, reward.js, ledger.js, caps.js ;
  - calendar.js : jour de 4 h à 4 h, saisons, événements tirés avec une graine ;
  - anchors.js, migrate.js, chapters.js.
- store/ : client API, file d'opérations hors ligne en IndexedDB, révisions.
- scene/ : diorama, voxels, boîtes, chatte, lumière, effets, caméra.
- ui/ : registre, feuilles, HUD, carnet, album, formulaires.
- app.js : un bus d'événements (task:completed, task:added, reco:changed, chaleur:gained, weather:announced…) auquel la scène et l'interface s'abonnent. Chaque changement d'état produit une animation ciblée ; fini le renderAll() en innerHTML.

SERVEUR LITESPEED/PHP
- api.php reçoit des opérations : add, update, start, complete, reopen, archive, spend, place.
- Verrou flock, révision et ETag contre les conflits, écriture atomique (fichier temporaire puis rename), 30 sauvegardes quotidiennes.
- tasks.json reste la source de vérité, compatible avec l'agent familial et sync-tasks-remote.sh.
  - Tous les champs existants sont conservés tels quels : deadline, notes, sous-tâches, archived, created.
  - Ajouts optionnels : anchor, subtasks, recurrence, startedAt, evalSnapshot.
- game-state.json est séparé. Le serveur y refuse toute suppression d'entrée du registre de gains.
- Un test de migration aller-retour vérifie, champ par champ, une copie du vrai tasks.json.

DIVERS
- PWA : manifeste et service worker, cache d'abord pour vendor et voxels, réseau d'abord pour l'API.
- three.js et les polices sont copiés dans /vendor : aucune dépendance à un CDN en production.
- Son facultatif, coupé par défaut, avec Howler (7 Ko) : carton, ruban, crépitement, sonnette du vélo de Monique.
- Vibration de 8 ms au déballage, facultative, sur Android seulement (navigator.vibrate ne marche pas sur iOS).
- Notifications en phase 2, parce qu'iOS exige que la PWA soit installée.
- Connexion par code unique avant la mise en production.
- L'import map demande Safari 16.4 ou plus récent.

### Les 60 premières secondes

0:00 — Un lundi d'octobre, 19 h 40, lumière réelle du crépuscule. Au centre de l'écran, un colis kraft ficelé sur une table de bois. Bulle de Monique : « Colis pour toi, Alex. Pas d'adresse de retour. Bizarre, hein? » Bouton [Ouvrir le colis]. Le lien « Voir mes tâches » reste visible en bas : l'utilitaire n'est jamais bloqué.

0:04 — Au tap, la ficelle glisse et la maquette se déplie comme un livre animé : les murs se relèvent en 0,6 s, le toit se pose, le garage coulisse, le terrain se déroule. Tout est en bois brut, et le socle porte le numéro gravé « 184 ».

0:10 — Une page de carnet glisse hors du colis, en écriture manuscrite avec sa version lisible : « Cette maquette se souvient de ce qu'on fait pour une maison. Moi, je l'ai remplie de l'automne 74 à l'été 75. À ton tour. Commence petit : une boîte, c'est une boîte. — P. » [Continuer]

0:16 — « À quoi ressemble chez vous? » Trois cartes : Maison · Jumelé · Logement. Au tap sur Maison, la maquette se transforme en 0,4 s. Cinq pastilles de revêtement suivent ; au tap, la peinture coule du toit vers le bas. Le bouton [Passer] est visible tout le temps.

0:24 — « Tu as 16 tâches en cours. On les emballe. » Les boîtes tombent une à une sur le perron (80 ms d'écart), puis sautillent vers la cuisine, le bureau, le garage et la cour. Neuf restent visibles ; sept partent dans la remise, avec « +7 » sur la porte.

0:31 — Un bandeau discret apparaît, sans bloquer : « 7 boîtes semblent mal rangées (ex. : Nettoyer le véhicule est classée Professionnel). » [Plus tard] [Voir]

0:35 — Biscotte, une chatte tigrée en voxels, entre par la porte de la cour, monte l'escalier et se roule en boule sur une boîte du bureau. La carte du bas glisse :
- « À faire d'abord · Faire l'inventaire des outils · Prioritaire · ~30 min · facile · Note 74 » ;
- en puces : « Victoire rapide · Nettoyer le véhicule · ~5 min » et « Grand chantier · Nettoyer la terrasse · ~2 h ».

0:42 — Une infobulle pointe le bouton : « Fais la vraie tâche, puis touche C'est fait. Si c'est déjà fait, touche-le maintenant. »

0:48 — Alex touche la puce « Nettoyer le véhicule », qu'il a faite cet après-midi, puis « C'est fait ». La boîte sautille, le ruban se déchire, les rabats s'ouvrent et l'auto de la maquette se met à reluire. Sept petites bûches volent jusqu'au compteur, qui passe de 30 à 37 au rythme de leur arrivée.

0:53 — C'est la première tâche du jour : la caméra glisse au salon, une allumette craque, le poêle s'allume, les fenêtres deviennent ambrées et la cheminée fume. « Le foyer est allumé. +1 Chaleur. »

0:58 — Une page de carnet : « C'est un début. La maquette s'en souviendra. » [Continuer] [À demain]. Si Alex n'a rien terminé, la carte reste en place avec le texte : « Rien ne presse. La maquette t'attend. »

### Une journée type

Mardi 27 octobre 2026. Chapitre 2, Chaleur 11, 41 bûches. Le Premier gel est annoncé pour jeudi.

6 h 50, cuisine, café, 25 secondes
- La maquette baigne dans l'aube bleutée et le drapeau de la boîte aux lettres est levé.
- Courrier (+2) : « Salut Alex! La radio annonce du gel jeudi matin. Tes plates-bandes vont faire la baboune. »
- La fiche Météo du foyer propose deux options : couvrir les plates-bandes pour 25 bûches, ou terminer une vraie tâche Terrain d'ici jeudi.
- Alex choisit la seconde. Il épingle sur le frigo de la maquette : « Quand je reviens de l'école avec les enfants, alors je rentre le boyau d'arrosage » (+3).
- Fin : « Bonne journée. La maquette garde la maison. » Solde : 46 bûches.

12 h 15, au bureau, 10 secondes
- Ouverture de l'app, « + Ajouter », il tape « Prendre rendez-vous pour les pneus d'hiver ».
- L'app propose le domaine Véhicule, l'ancre « auto », P8, L1, D1. Il fixe l'échéance au 15 nov., puis « Ajouter la tâche ».
- La boîte tombe sur le perron et sautille jusqu'au garage (+1). Solde : 47.
- Variante : il le dicte à l'agent familial, et le soir la fourgonnette de Monique dépose le colis.

16 h 20, dans l'entrée, 40 secondes
- Boyau rentré. Il touche « C'est fait » : P7/L2/D2 rapporte 9 bûches, plus 2 parce que la tâche était planifiée.
- Le boyau enroulé apparaît accroché au mur de la cour.
- Première tâche du jour : le poêle s'allume (+1 Chaleur, total 12).
- Le nuage de givre au-dessus de la cour devient « Prêt ✓ ».
- « Un mot pour l'album? » Il tape : « Les enfants ont arrosé le garage au passage. » Solde : 58.

20 h 40, après le coucher des enfants, 6 minutes
- Fenêtres ambrées, lumière réelle de soirée.
- Deux victoires rapides :
  - Préparer les affaires scolaires (+7) : le sac apparaît sur la patère de la chambre ;
  - Trier les photos (+10) : un cadre neuf au salon.
- La page 8 du carnet est débloquée : « 27 octobre 1974. Rosaire a fini la petite remise de la maquette. Il dit qu'une maison, c'est jamais fini. Je lui ai dit : nous autres non plus. »
- Dépenses : 35 bûches pour l'étape 2 des Plates-bandes (les voxels s'empilent) et 15 pour une citrouille sur le perron, en vue d'Halloween samedi.
- Biscotte saute dans le tas de feuilles.
- Fin : « C'est assez pour aujourd'hui. La maison dort, le foyer aussi. À demain, Alex. » Solde : 25.

Jeudi matin
- Le givre tombe sur la maquette ; les plates-bandes, protégées, brillent.
- Souvenir doré : « Rien n'a gelé. »

Dimanche 19 h, 2 minutes : Jour du recyclage
- Le bac bleu, avec 9 cartons aplatis, roule jusqu'au chemin.
- Bilan : 9 boîtes, 4 zones allumées, foyer 5 jours sur 7 → Semaine au chaud ✓.
- Deux boîtes oubliées depuis plus de 60 jours : Réparer une poignée et Classer les documents. Il garde la première et découpe la seconde en deux sous-tâches ; le premier compartiment est déjà coché.
- +6 bûches, +1 Chaleur, et la page de la semaine se tourne dans l'album.

### Ce qu’on garde de 006

À GARDER, EN LE TRANSPOSANT
- Le CRUD complet des quêtes et la recommandation recalculée à chaque changement, mais avec la Note v2 et trois recommandations.
- La règle « +1 à la première quête terminée du jour ». Elle devient « le foyer s'allume » : +1 Chaleur, jamais retiré, avec la cheminée qui fume.
- Le geste signature « les ressources quittent la tâche et rejoignent physiquement le monde », en corrigeant le compteur qui sautait avant l'arrivée des particules. On l'étend aussi à la dépense : les bûches partent du compteur vers l'objet construit.
- Le modèle d'incident :
  - un marqueur physique sur la carte ;
  - un choix payant ;
  - un choix gratuit avec une conséquence récupérable ;
  - fermer la fiche ne retire pas le marqueur.
  On l'enrichit d'une annonce 5 jours avant et d'une 4e réponse : terminer une vraie tâche du domaine.
- La construction au toucher, au clavier et par glisser : fantôme aimanté, rotation avec R, une seule case tabulable, Échap pour revenir.
- La palette chaude et claire de DESIGN.md (papier #FFF8E8, crème, lumière, terre, sauge, encre #273026) et la règle « Living Ground » : une grande partie de l'écran appartient au monde.
- Le responsive vérifié en 390, 834 et 1280, avec un vrai panneau latéral sur tablette.
- Le découpage data/model/ui/app, qui devient un core/ pur et testable.
- prefers-reduced-motion, les cibles de 44 px et l'échappement systématique du HTML.
- L'idée domaine → secteur avec une vitalité sur 14 jours. Elle devient les zones et leurs lampes.
- Le nom « Quêtes du foyer », qui prend enfin tout son sens (foyer = maison et âtre), et le clin d'œil « 184 » gravé sur le socle.
- Le principe d'un mentor et d'un mystère révélé par étapes. ÉCHO-7 devient le carnet de Pierrette.

À ABANDONNER
- La ferme agro-futuriste et la colonie.
- Solène, Milo, Naïma et ÉCHO-7.
- La paire Énergie/Matériaux.
- La carte isométrique DOM 8×8 régénérée en innerHTML.
- Le bouton « Jour +1 » en jeu.
- Les incidents scriptés aux jours 2, 3 et 4.
- Le bac à sable en localStorage, coupé du vrai tasks.json.

Le potager et le Bastion survivent sous une autre forme : le potager de la cour, et la maison face à l'hiver.

### Risques

1. LE MIROIR ACCUSATEUR : voir sa propre maison « en retard ».
- Jamais de saleté, de bris ni de tristesse ; les boîtes sont neutres et rangées.
- Au plus 12 boîtes visibles, le reste dans la remise.
- Une zone en veille est simplement tamisée.
- L'étiquette dit « Toujours bonne à faire ».
- Les événements viennent du calendrier, jamais de la négligence.
- Critère d'acceptation : ouvrir avec 40 tâches, dont 10 échues, doit montrer une maison accueillante.

2. LA RUPTURE AVEC PRODUCT.MD (colonie agro-tech, Potager, Bastion, Vecteur, trois ressources)
- Une table de traduction explicite :
  - potager → potager de la cour ;
  - Bastion → la maison face à l'hiver ;
  - Énergie et Matériaux → Bûches ;
  - Réputation → Chaleur ;
  - la précision et l'énergie de Vecteur → l'interface et les animations.
- Un MVP utilisé une semaine sur les vraies tâches, puis une décision explicite d'Alex.
- Plan B hybride : garder la maquette pour la maison et agrandir le terrain en ferme en saison 2.

3. LE MIROIR NE SAIT PAS CE QUI EST VRAIMENT FAIT
- C'est voulu : la maquette reflète la liste, pas la maison.
- Aucune preuve n'est demandée ; c'est un outil pour un adulte seul.

4. DES ANCRES FAUSSES (« Réparer une poignée » : laquelle?)
- Repli sur l'objet générique de la zone.
- Correction en un tap, mémorisée.
- Champ « anchor » renseigné par l'agent familial.

5. LA PERFORMANCE ET LA BATTERIE DE THREE.JS SUR MOBILE
- Budgets chiffrés, rendu à la demande, densité de pixels adaptative, repli SVG.
- La liste ne dépend jamais de la 3D.
- Mesures sur un vrai iPhone et un vrai Android dès la semaine 2. Le prototype 006 n'a été vu qu'en Chromium émulé.

6. LE VOLUME D'ART (environ 60 objets en saison 1, puis 4 saisons)
- Recettes procédurales générables par IA.
- Les saisons sont des paramètres : la neige est une calotte générée, pas des modèles d'hiver.
- 25 objets pour le MVP, dans un style à gros grain qui tolère l'imperfection.

7. LE VOLUME ET LA QUALITÉ DE L'ÉCRITURE (environ 50 pages et 120 billets par an)
- Bible et glossaire fermés.
- Brouillons par IA, relecture par Alex.
- Réserves de variantes.
- Registre standard dans l'interface ; la couleur locale reste dans les répliques.

8. L'INTIMITÉ (figurines de la vraie famille, album)
- Tout est facultatif, aucun prénom n'est requis.
- Les données restent sur le serveur d'Alex, sans partage.
- Aucune fiction ne parle des vrais enfants.

9. LE JEU PLUS PRENANT QUE LES TÂCHES (piège de Focus Plant)
- Les dépenses sont bornées par les bûches.
- Aucune activité virtuelle sans tâche : pas de récolte à cliquer, pas de minuteur à surveiller.
- Une fin de session explicite.

10. LA MÉTÉO FICTIVE (« première bordée » sans neige dehors)
- Elle s'appelle « Météo du foyer » : c'est celle de la maquette, jamais présentée comme une prévision.
- Dates calées sur les moyennes québécoises, avec une graine de ±2 jours.
- Phase 2 possible : un flux d'Environnement Canada passé par PHP.

11. LE DÉCOUPAGE POUR « FARMER »
- Les sous-tâches ne paient pas.
- Plafond quotidien dégressif.
- ×0,5 pour les tâches éclair.
- Récompense en √L.

12. LES LONGUES ABSENCES
- Aucune perte ; les chapitres attendent.
- Au-delà de 5 jours, les événements se résolvent seuls (« Réal a pelleté ton entrée. »).
- +5 forfaitaire au retour, et un billet chaleureux.

13. LA RECOMMANDATION NOYÉE DANS LA 3D
- Elle est toujours doublée par la carte DOM en bas d'écran.
- Biscotte n'est qu'un renfort.

### Tranche jouable

Tranche jouable de 3 semaines, livrable vers le 26 octobre 2026. Le Premier gel (~29 oct.) et l'Halloween (31 oct.) serviront de premier test grandeur nature.

SEMAINE 1 — LE CŒUR UTILE, SANS 3D (utilisable dès le jour 5)
- core/ :
  - Note v2, trois recommandations et garde-fou P8 ;
  - filtres 15 min, peu d'énergie, échéances et zone ; tri par P, L, D et Note ;
  - récompense, registre de gains, plafonds et bonus ;
  - 40 ancres et environ 150 mots-clés, plus la correspondance des domaines hérités.
- Migration sans perte, avec un test aller-retour sur une copie du vrai tasks.json.
- api.php : opérations, verrou flock, révision, écriture atomique, sauvegardes.
- Registre DOM mobile : ajouter en 3 interactions au plus, éditer, annoter, terminer, remballer, ranger au grenier.
- Tests node --test des exploits :
  - terminer/remballer/terminer = +0 ;
  - L gonflé la veille = ignoré ;
  - tâche éclair = ×0,5.

SEMAINE 2 — LA MAQUETTE
- Scène three.js orthographique avec un seul gabarit (maison à étage et garage) et 5 zones.
- 25 objets voxels, dont 12 ancres à deux états (neutre, soigné).
- Boîtes instanciées : 3 tailles, poids, ruban et étiquette.
- Biscotte : repos et changement de boîte.
- Boutons accessibles en surimpression ; toucher une pièce applique le filtre de zone.
- Lumière réelle à 6 états.
- Animations 1 à 4 : déballage, livraison, foyer, Biscotte.
- Image instantanée en cache, réduction de mouvement, repli SVG minimal.
- Mesures sur un vrai iPhone et un vrai Android.

SEMAINE 3 — LE JEU
- Bûches, Chaleur et corde de bois visible.
- Courrier du matin et plan « Quand… alors… » sur le frigo.
- Atelier minimal :
  - 5 projets : Lampe du perron, Coin lecture, Mur de dessins, Plates-bandes d'automne, Établi ;
  - 10 décorations à placer, avec rotation et glisser ;
  - animation 5 (empilement).
- Météo du foyer : Premier gel avec ses 4 réponses, et Halloween.
- Chapitre 1 complet et ouverture du chapitre 2 : 8 pages de carnet, 30 billets de Monique, 10 répliques de Réal.
- L'accueil de 60 secondes.
- Jour du recyclage v0 : bilan et triage des boîtes oubliées.
- Manifeste PWA et service worker.

HORS MVP
- Album complet.
- Neige et hiver : cible avant le 20 novembre, pour la première bordée.
- Figurines de la famille, sons, notifications.
- Interface des sous-tâches et des récurrences (les données sont déjà préservées).
- Autres gabarits de maison.
- Connexion par code.

CRITÈRES D'ACCEPTATION
- La tâche conseillée est lisible en moins de 2 s après l'ouverture, avant la 3D.
- Ajouter une tâche prend 3 interactions au plus.
- Aucun champ perdu au test aller-retour.
- Terminer/remballer/terminer rapporte +0 bûche.
- Impossible de finir le chapitre 1 avant le jour 4.
- Au moins 30 images par seconde pendant un déballage sur Android milieu de gamme, et 0 au repos après 20 s.
- 40 tâches, dont 10 échues, donnent une maison accueillante : 12 boîtes au plus, aucune alarme rouge.
- Alex s'en sert 7 jours sur ses vraies tâches avant toute décision sur la suite.

### Effort

L

## Avis des jurés

### Regard produit et usage réel (avocat d'Alex). Pondération utilisée pour obtenir le total sur 100 : utilite_taches ×2,5 ;

Classement : A-restauration, E-foyer-miroir, C-compagnon-expeditions, D-bastion-saisons, B-village-commandes

Rendu conseillé : Pour A, je choisis l'hybride : DOM/CSS pour toute la boucle utilitaire (Fil du jour, onglet Quêtes, feuilles, HUD), chargée et interactive avant le monde, comme le propose E. Le monde de l'Orée passe en PixiJS v8, vendorisé dans /vendor (pas de CDN), derrière l'interface world/renderer.js prévue par A. On garde l'idée d'A de « cuire » des modèles voxel JSON en textures (generateTexture, ou un mini-rastériseur Canvas au chargement, mis en cache dans IndexedDB), mais on renonce au moteur Canvas 2D maison, qu'aucun spike n'a éprouvé.

Ce que disent les spikes :
- Pixi a le meilleur jus (8/10), environ 3,6 appels de dessin par image et environ 5 ms de JS par image même à CPU ×4. Son calque de hotspots DOM avec tabindex itinérant est déjà prouvé.
- Surtout, ColorMatrixFilter réalise en une ligne, secteur par secteur, la mécanique signature d'A (le passage du gris à la couleur), et ParticleContainer porte le fil de lumière.
- DOM/SVG est excellent en accessibilité et en poids (36 Ko), mais plafonne vers 100 entités et 40 couches ; la recoloration globale fait tomber le curseur d'heure à environ 8 FPS. Or A exige 18×18 cases ou plus, avec des fondus par case.
- three-voxel est le plus beau, mais dev_cost 4, perf 5 : shaders fragiles, environ 23 px par case sur mobile, GPU jamais mesuré.

Conditions :
- mesurer sur un vrai Android de milieu de gamme et sur Safari iOS avant d'engager le moteur, puisque tous les spikes tournaient sous SwiftShader ;
- gérer la perte de contexte WebGL ;
- zoom par défaut sur le secteur actif (les spikes montrent 23 à 41 px par case à 390 px de large) ;
- rendu à la demande, 0 image par seconde au repos, DPR plafonné à 2 ;
- servir les .mjs en text/javascript avec compression sur LiteSpeed ;
- repli « Plan de l'Orée » en DOM si WebGL est absent.

- **A-restauration (81/100)** — Forces : Le Fil du jour montre la quête n° 1 en 2 s, avec sa Cote et un « Pourquoi? » chiffré. Les 3 recommandations ont un garde-fou P ≥ 8, et « J'y vais » épingle la quête en cours. La parité tri/filtres/CRUD avec l'app historique est une condition de livraison du MVP, ce qui est la meilleure garantie utilitaire des cinq. Le rang et la récompense sont bien séparés : récompense concave en √L, évaluation figée, échéance posée au moins 48 h avant pour toucher le bonus, registre en ajout seul, réactivation sans second gain. La causalité est géographique et lisible : ta tâche Maison ravive l'Atelier. La Lueur d'un secteur fermé n'est jamais perdue (« sous la cendre »). Les plaques datées des grands chantiers servent de mémoire, pas de salaire, ce qui limite la surjustification. La Confiance mesure la présence ; les semaines tenues sont cumulatives, le mode relâche existe, la journée a une fin explicite. Les 60 premières secondes sont exemplaires : les tâches déjà faites deviennent des lueurs, une vraie quête est faite avant tout formulaire, et « Plus tard » ne bloque rien. C'est la meilleure adéquation à PRODUCT.md : colonie agro-tech, Potager, Bastion qui défend, 3 ressources, placement, aléas récupérables, chapitres sur le calendrier québécois. — Faiblesses : 1) Trop de micro-boucles qui donnent rendez-vous, malgré le plafond d'Énergie : cultures en 6/12/24 h présentées comme une « raison douce de revenir le midi ou le soir », cendrillons à trouvailles occasionnelles (récompense variable, même cosmétique), commandes, Lots, et un Front de cendre tous les 9 à 12 jours qui exige des remparts. C'est le piège Focus Plant/Hay Day. Les dépenses sont bornées par l'Énergie, mais le temps d'écran et la charge mentale ne le sont pas.
2) Un miroir de la négligence : la Vitalité perd 1 tous les 3 jours, les incidents sont pondérés par l'absence de quêtes du domaine et par les retards. Un domaine rare (Véhicule) reste gris des semaines. « Sans jugement » dans le texte ne suffit pas si l'image grisonne.
3) Une quête inscrite après coup ne vaut que 50 % : cela pénalise un usage parental légitime et très fréquent.
4) L'ajout se fait par « un champ + 5 rangées de puces », sans inférence : ce n'est pas un ajout en 5 s.
5) La carte repliée de 88 px doit contenir un titre sur 2 lignes, 4 métadonnées et 2 boutons de 44 px : c'est trop pour la place.
6) Glossaire de 19 termes, 6 secteurs × 3 phases, 4 réponses par incident : la courbe d'apprentissage est lourde pour un seul utilisateur fatigué.
7) Promesses irréalistes : le MVP de 3 semaines (moteur voxel Canvas 2D maison qu'aucun spike n'a éprouvé, plus api.php, parité complète, PWA et 2 chapitres) représente plutôt 6 à 8 semaines, et la saison XL de 12 à 14 semaines est optimiste. — À greffer : Noyau à conserver tel quel : la séparation Cote/PE avec « Pourquoi? », le garde-fou P ≥ 8, la parité bloquante, la Lueur jamais perdue, les plaques datées, la Confiance-présence, la fin de journée explicite et l'intro de 60 s. Corrections obligatoires :
- supprimer les minuteurs de culture comme motif de retour (la récolte se fait à la prochaine visite, ou est déclenchée par une quête) et retirer l'aléa des cendrillons ;
- découpler les incidents et la Vitalité de la négligence (calendrier seulement) ;
- remplacer les 50 % de l'inscription après coup par un plafond quotidien à plein tarif (modèle B) ;
- réduire le MVP aux chapitres 1 et 2 sans Front de cendre ni Lots.
- **B-village-commandes (70/100)** — Forces : - Idée économique élégante : la récompense est linéaire sur une échelle de Durée quasi logarithmique, donc par minute, la tâche la plus rentable est celle que l'Indice recommande.
- La Pierre angulaire exige une quête de P ≥ 7 ou de Durée ≥ 7 pour chaque lot. Elle pousse vers l'important sans imposer de domaine.
- Le « Souhait du réel » est excellent pour l'hygiène du backlog : face à une quête ouverte depuis 21 jours, reformuler, reporter ou retirer sont trois bonnes réponses.
- Écran explicite « Le village travaille », comptoir fermé la nuit, rappel doux après 5 min.
- Le bilan suit le ratio temps de jeu / temps de tâches et propose un Mode sobre. Avec l'automatisation par les Liens, le nombre de gestes baisse au fil de la saison.
- Le panneau « 4 → 24 habitants » est un trophée tangible et chaleureux.
- Calibration faite sur de vraies distributions (calib.mjs, pacing.mjs). — Faiblesses : - Le cœur du jeu est une chaîne de production Hay Day avec des minuteurs pensés pour faire revenir (Moulin 30 min « une pause café », Blé 2 h). L'objectif de 10 à 15 gestes par jour et la nécessité d'un ratio de surveillance et d'un Mode sobre avouent le risque. C'est la direction la plus exposée au jeu qui vole le temps des tâches.
- La séparation rang/jeu est rompue : l'Indice inclut « +3 Utile au village », et les gains en Matériau du domaine affichés sur la carte orientent le choix (« il me manque des Ferrures, je fais une tâche Véhicule »).
- Complexité élevée pour des visites de 90 s : 5 types de Matériaux, 6 recettes, troc, Condenseur, Réserve, Accumulateur, Liens, lots, commandes, Avis, Convoi.
- Les bâtiments ont des emplacements fixes, alors que PRODUCT veut du placement. Le Bastion défensif reste faible jusqu'au ch. 7.
- Pixi par CDN et Google Fonts ajoutent des appels tiers, contre la règle de 006.
- L'absence applique « Laisser faire » réduit de moitié.
- Les promesses de 90 s par quête et de 6 min par jour reposent sur la discipline, pas sur la structure. — À greffer : - La Pierre angulaire, adaptée : un Lot ou un chantier majeur exige une vraie quête P ≥ 7.
- Le Souhait du réel sur les quêtes ouvertes depuis 21 jours ou plus (reformuler, reporter, retirer = 3 réponses valides).
- Un écran de fin de visite qui montre la prochaine quête en grand.
- Le ratio temps de jeu / temps de tâches estimé dans le bilan de Naïma, avec proposition d'un Mode sobre au-delà de 15 %.
- Le compteur d'habitants revenus comme trophée visible.
- Des indices du type « Manque : … ».
- Une case « Déjà faite » dans l'ajout rapide.
- Une automatisation qui réduit les gestes à mesure que la Confiance monte.
- **C-compagnon-expeditions (77/100)** — Forces : - C'est la seule direction qui aide PENDANT la tâche : « Commencer » lance le mode Côte à côte, où Fanal fait la corvée miroir du domaine. C'est du « body doubling », la meilleure arme contre la procrastination au démarrage. Aucune récompense matérielle n'y est attachée, donc pas de surjustification, et le relevé d'heures reste informatif.
- Le temps de jeu est structurellement minimal : environ 3 décisions par jour, 1 traversée par nuit, départ automatique, et aucun départ sans au moins une vraie quête depuis le précédent.
- Le retour du matin avec sa lettre crée une curiosité saine, sans rendez-vous imposé.
- Le thème adulte le plus fort des cinq : la 6e intendante s'est épuisée à tout porter seule, et la fin dit « ne porte pas tout ». C'est la charge mentale parentale mise en récit, et la culpabilité zéro est inscrite dans l'intrigue.
- Fanal ne parle qu'une complétion sur trois.
- Le bilan hebdomadaire est en heures d'ouvrage par domaine, informatif.
- C'est l'effort le plus réaliste (MVP M, saison L), et la scène SVG s'appuie sur le spike le plus léger et le plus accessible. — Faiblesses : - Rupture avec PRODUCT.md : la carte isométrique, le mode construction et le placement disparaissent, le Potager se réduit à 3 pots, et le Bastion n'est plus qu'un phare. La « ferme réellement développable façon Township » n'existe plus.
- Le MVP lit tasks.json mais écrit dans un bac à sable localStorage avec export, ce qui reproduit le défaut n° 1 de 006. L'API n'arrive qu'en phase 2.
- Les Tournées rapportent ×0,8 : les corvées récurrentes, qui sont l'essentiel du travail parental, valent moins. Mauvais message.
- Des pertes liées à l'absence ou à la négligence : altises après 48 h sans récolte, aléas +10 % par domaine négligé, avarie qui réduit la portée.
- La récompense différée à la nuit peut affaiblir l'envie d'une quête de plus le soir.
- Les sessions longues de fin de semaine sont minces.
- Un automate aux yeux expressifs et à la tuque rayée frôle le mignon. — À greffer : - Le mode Côte à côte sur « J'y vais » : un personnage du secteur fait la corvée miroir, Wake Lock facultatif, aucune récompense matérielle, temps « côte à côte » consigné au bilan.
- La règle « l'Orée n'avance que s'il y a eu au moins une vraie quête depuis la dernière visite ».
- La lettre du matin racontant ce que l'Orée a fait pendant la nuit.
- L'arc « ne porte pas tout » comme sens de la finale d'autonomie d'A et des révélations d'ÉCHO-7.
- Les personnages qui ne parlent qu'une complétion sur trois.
- La proposition de découper quand une tâche dépasse 2× sa durée estimée.
- Le « Courrier du quai » pour les tâches ajoutées par l'agent familial.
- Un objectif du jour visible, sans pression.
- **D-bastion-saisons (76/100)** — Forces : - C'est le moteur « faire la tâche cette semaine » le plus direct. Un Avis est annoncé 5 à 9 jours d'avance, et dans la jauge Préparation contre Force, les vraies quêtes de la fenêtre comptent (+1, +3 pour le domaine visé), avec un message actionnable : « il manque environ 10 : 3 quêtes d'ici mardi ».
- La fiction épouse la vraie préparation à l'hiver d'un parent québécois (pneus avant le 1er décembre, calfeutrage, abri d'auto).
- Le rang est indépendant du jeu ; l'influence de l'Avis est une option désactivée par défaut, plafonnée à +5.
- Trêve des Fêtes, « Dévier le front » une fois par chapitre, prologue adaptatif si l'installation est tardive.
- Les dégâts ne touchent jamais une défense, le Foyer, la Confiance ni une donnée.
- Simulation honnête sur 200 graines.
- Le Bastion défensif voulu par PRODUCT est enfin un vrai système. — Faiblesses : - C'est la seule direction avec un état d'échec gradué sur le volume : « Plié », −8 Moral, 2 dégâts.
- Selon sa propre simulation, le profil léger plie 10 % des Avis et passe de justesse 56 % du temps (1 dégât). Le parent fatigué reçoit donc le pire retour précisément pendant ses mauvaises semaines : c'est une spirale de type Habitica en sourdine.
- La motivation repose largement sur l'aversion à la perte et sur une date imposée (la lune rouge de Kingdom). Un antagoniste hivernal en plein hiver réel peut amplifier un stress déjà présent.
- La ferme devient secondaire, alors que PRODUCT désigne le Potager comme boucle principale.
- Complexité : 5 étiquettes de menace, Force, Garde, Moral, bûches, chartes, braseros, Beauté.
- Le rendu three.js correspond au spike le plus coûteux (dev_cost 4, perf 5, GPU non mesuré).
- L'ajout rapide n'est guère détaillé hors de l'onboarding. — À greffer : - Fusionner l'Avis daté de D avec le Front de cendre d'A : annonce de plusieurs jours, mur visible à l'horizon, jauge de préparation décomposable où les vraies quêtes de la fenêtre comptent, message actionnable.
- L'issue « défaite » doit être remplacée par le voile cosmétique d'A, levé par la prochaine quête, sans Moral perdu.
- Des suggestions de vraies tâches de saison par Ambroise, sans obligation (pneus, détecteurs de fumée au changement d'heure, abri d'auto).
- La pastille informative « Aide l'Avis ».
- La trêve des Fêtes.
- « Dévier le front ».
- Le prologue adaptatif.
- L'Ordre de marche « Quand…, alors… ».
- **E-foyer-miroir (80/100)** — Forces : Meilleure utilité réelle :
- ajout en 3 interactions avec inférence par mots-clés du domaine, de l'ancre et de P/L/D ;
- liste DOM interactive en moins d'1 s, avant tout moteur 3D (image instantanée du monde en cache) ;
- toucher une pièce filtre la liste (filtre diégétique) ;
- correction des domaines incohérents proposée au premier lancement ;
- « Jour du recyclage » hebdomadaire qui trie les quêtes oubliées depuis plus de 60 jours ;
- « Un mot pour l'album? » répond littéralement au « l'annote » de PRODUCT.
Le retour est le plus informatif des cinq : l'objet réel soigné reluit dans la maquette, ce qui est l'antidote à la surjustification. Aucun minuteur, aucune récolte à cliquer : rien ne vole le temps des tâches. P ne pèse que ±10 % dans la récompense, ce qui décourage de gonfler la priorité. Une règle absolue interdit toute saleté ou tout bris à l'écran, et le critère d'acceptation exige que 40 tâches dont 10 échues donnent une maison accueillante. Le récit de Pierrette (1974-75) est le plus adulte, intime et québécois. L'album offre une valeur sentimentale à long terme. — Faiblesses : - Rupture assumée avec au moins 5 engagements de PRODUCT.md : colonie agro-tech, Solène/Milo/Naïma/ÉCHO-7, Bastion, Énergie et Matériaux fusionnés en Bûches, ferme façon Township. La direction exige elle-même une validation explicite d'Alex.
- La profondeur de « vrai jeu de gestion » est mince : les sessions longues se résument à de la décoration et à de petits projets (Lampe du perron, 80 bûches). Le risque d'usure une fois la nouveauté passée est réel.
- Une maquette de SA maison où chaque tâche est une boîte reste un backlog visible, même plafonné à 12 avec « +7 » sur la remise.
- La Météo du foyer fictive peut contredire le ciel réel.
- Les ancres par mots-clés se tromperont souvent.
- Le rendu three.js correspond au spike le plus cher. 25 objets voxel en semaine 2, c'est optimiste.
- L'interface des sous-tâches et des récurrences est hors MVP.
- Environ 50 pages de carnet par an : grosse charge d'écriture. — À greffer : - L'ajout rapide en 3 interactions avec inférence (domaine, P/L/D, échéance proposés, modifiables d'un toucher).
- Le chargement DOM d'abord, avec l'image instantanée du monde en cache.
- Toucher un secteur filtre la liste.
- Les suggestions de correction des domaines hérités (Jardin, Ferme, Professionnel).
- Le triage hebdomadaire des quêtes oubliées (garder, réévaluer, découper, archiver).
- « Un mot pour l'album? » après complétion, versé dans les notes et dans l'Almanach.
- L'objet-reflet : chaque quête ravive un objet précis du secteur (frigo → établi de l'Atelier), pas seulement une case.
- La règle « jamais de saleté, de bris ni de tristesse visibles ».
- Le plafond d'éléments-tâches visibles dans le monde.
- « Remballer » dans les 24 h annule le gain par une écriture inverse.
- Le poids de P limité dans la récompense.
- Le critère d'acceptation « 40 tâches dont 10 échues = monde accueillant ».

### Game design et immersion. Critères : boucles, rétention à 30/90/180 jours, narration, monde vivant, robustesse de l'écon

Classement : D-bastion-saisons, E-foyer-miroir, A-restauration, C-compagnon-expeditions, B-village-commandes

Rendu conseillé : Pour D, je retiens un hybride : DOM/CSS pour toute la boucle utilitaire (Carnet, recommandations, formulaires, HUD), et un monde three.js en caméra orthographique, low-poly à ombrage plat, sur des hexagones instanciés.

**Pourquoi three.js**
- Les moments signature de D sont de la lumière et de la géométrie : point de lumière du Foyer, crépuscule réel à 16 h 15, neige qui s'accumule sur toutes les faces supérieures puis fond hexagone par hexagone, Front qui roule, nuit rejouée avec 600 flocons.
- En 2D, chaque bâtiment multiplié par ses états, la neige et l'heure devient de l'art à dessiner.
- Le spike DOM-SVG l'écarte lui-même : pas de marge pour la météo plein écran, l'éclairage dynamique ni les centaines de particules.
- Le spike three-voxel donne le meilleur visuel (8) et tient la promesse batterie : 0 rendu par seconde au repos grâce au rendu à la demande. Il pèse environ 218 Ko gzip, 60 appels de dessin et 51 500 triangles, pour un coût CPU de 2 à 12 ms par image en ralenti ×4.

**Les réserves**
- Le GPU n'a pas été mesuré : le spike tournait sur SwiftShader, sans vrai GPU.
- Le coût de développement est le plus haut (note 4).

**Conditions**
- Test go/no-go en semaine 1 sur Pixel 6a, iPhone 12 et iPad 9 : au moins 50 i/s pendant l'étincelle et la nuit rejouée.
- Ombres en pastilles par défaut. La carte d'ombres 2048 seulement en qualité élevée, et jamais recalculée en continu.
- DPR plafonné à 1,5 sur palier bas.
- Vie ambiante à 24 i/s au plus, coupée après 20 s d'inactivité.
- three 0.185.x vendorisé et compileAsync.
- Ordre de chargement repris de E : DOM de moins de 60 Ko, puis instantané WebP, puis la 3D.
- Interface WorldView pour pouvoir changer de moteur.

**Plan B** : PixiJS v8 (spike : juice 8, 3 à 6 appels de dessin, environ 5 ms de JS par image), en vue fixe sans rotation, avec la neige et le Front en calques. Pas DOM-SVG.

- **D-bastion-saisons (79/100)** — Forces : - **Structure de jeu la plus nette des cinq.** Un but de saison lisible (« garder le feu jusqu'aux sucres »). Un Avis tous les 14 jours environ, annoncé 5 à 9 jours d'avance, qui alterne une semaine de tension et une semaine de construction. Une seule jauge Préparation contre Force, décomposable au toucher.
- **Chaque dépense a un « pourquoi maintenant ».** Les actions sont rangées par effet sur l'Avis en cours. C'est le meilleur débouché de ressources du lot.
- **Effet miroir crédible et original.** La vraie préparation à l'hiver d'un parent québécois (pneus avant le 1er décembre, calfeutrage) répond à celle du Bastion. Kingdom Two Crowns et Frostpunk, mais sans cruauté.
- **Monde le plus vivant dans le temps.** Le Front avance chaque jour réel. La première bordée reste jusqu'en mars. La neige fond hexagone par hexagone depuis le Foyer au Temps des sucres. Crépuscule réel à 16 h 15, fenêtres allumées à la Première lumière.
- **Rétention à 180 jours couverte d'office.** La saison va du 5 octobre au 15 avril, avec 11 Avis dont 2 boss, 5 chartes, une trêve des Fêtes, puis une saison verte aux nouvelles menaces et une année 2.
- **Économie simulée, et je l'ai vérifiée.** J'ai relancé sim3.py avec les Forces publiées : léger 33/56/10, normal 83/17/0, intense 100 % (Tenu/Justesse/Plié). Les dégâts sont bornés et ne touchent jamais une défense, le Foyer, la Confiance ni une donnée réelle. Les surplus se convertissent (bûches, Moral). La Force est fixée par graine à l'annonce, sans relance possible. Le domaine ne change ni le rang ni la monnaie : c'est la direction la moins sensible au déséquilibre réel des domaines.
- **Narration sobre et juste.** Le Long Blanc « recouvre », il ne veut aucun mal. « Le froid ne se combat pas, il se traverse. » Les 184 cycles sont relus comme « le temps qu'il fallait pour que quelqu'un revienne ». — Faiblesses : - **La difficulté punit le joueur débordé, c'est-à-dire le vrai Alex dans une semaine chargée.** La simulation relancée montre qu'en profil léger, la Tempête de verglas (boss) plie 59 % du temps et la Crue (épreuve finale) 49 %. De la Poudrerie à la fin, le léger ne tient proprement presque jamais (Grand froid 35 %, sinon 0 à 8,5 %). Le « 10 % de Plié » global masque que l'apogée de la saison est un échec pour lui : une spirale à la Habitica déguisée. Le Moral baisse (−8), et la Justesse produit un bâtiment givré.
- **À l'inverse, le joueur intense tient 100 % des Avis** : aucune tension, et environ 1 080 Matériaux non dépensés qui partent en décor (inflation).
- **La jauge pousse vers la pression.** « Il manque environ 10 : 3 quêtes d'ici mardi » ajoute une échéance de jeu par-dessus les vraies échéances. La pastille « Aide l'Avis » oriente le choix du domaine, avec un effet borné à 15 points.
- **La boucle de 10 secondes change peu le monde.** Une étincelle et un bloc de jauge ; seuls les bâtiments achetés modifient la carte. C'est plus faible que A et E.
- **Le rang néglige « court et facile ».** Il ne pèse la Longueur qu'à 15 et la Difficulté qu'à 10, alors que PRODUCT.md demande de favoriser les tâches prioritaires, courtes et faciles.
- **Charge de systèmes lourde**, même dévoilée progressivement : 5 étiquettes de menace, bûches, Moral, Beauté, chartes, braseros.
- **Calendrier figé.** Le Premier gel du 14 octobre tombe avant la livraison du MVP (vers le 26 octobre, à 3 semaines d'aujourd'hui). Le prologue adaptatif est indispensable, et le contenu doit toujours garder une longueur d'avance sur le joueur.
- **Rendu three.js** : performance GPU non mesurée. — À greffer : C'est la base retenue. Corrections internes obligatoires :
1. **Force ajustée à l'activité.** La Force reste fixée à l'annonce, mais elle s'ancre à ±25 % sur l'activité des 28 derniers jours. Objectif : le profil léger tient au moins 60 % des Avis et le profil intense reste défié.
2. **Les boss et l'Avis final ne peuvent jamais plier.** Leur plancher est la Justesse, sans dégât si Alex était absent.
3. **Plus de perte de Moral.** Supprimer le −8 ; ne garder que des bonus de Moral non obtenus.
4. **3 étiquettes de menace au MVP** (FROID, VENT, NEIGE) au lieu de 5, et retrait de la Beauté.
5. **Chaque quête change visiblement son secteur** (greffes de A et E).
6. **Rang remplacé par la Cote de A.**
7. **Ajouter aux tests de simulation** : léger avec au moins 60 % d'Avis tenus, et aucun Plié sur les boss.
- **E-foyer-miroir (77/100)** — Forces : - **Le meilleur pont diégétique, et il est gratuit.** Laver le frigo fait reluire le frigo de la maquette ; aucune mythologie n'est nécessaire.
- **Les axes de la tâche deviennent physiques** (doublés en texte DOM) : la taille de la boîte encode la Longueur, le poids la Difficulté, le ruban la Priorité, l'étiquette l'échéance.
- **La recommandation existe dans le monde** : Biscotte dort sur la boîte conseillée.
- **Retour informatif plutôt que salaire**, exactement ce que recommande la recherche sur la surjustification.
- **Le meilleur crochet narratif à 180 jours.** Le carnet de Pierrette (1974-75), Monique qui est le « bébé de la poudrerie », la boîte bleue et la page arrachée forment un mystère à hauteur humaine sur un an, à une page par jour au plus.
- **Jour du recyclage** : un rituel hebdomadaire qui fusionne utilité et jeu (bilan et triage des boîtes de plus de 60 jours).
- **Les ancres détectent les domaines mal classés**, une vraie valeur utilitaire.
- **Économie la plus simple, et je l'ai vérifiée.** sim2.py relancé : régulier 2 027 bûches, léger 749, Chaleur 4/12/22 atteinte aux jours 4/12/22. Récompense en √L, Priorité à ±10 % seulement. Événements issus du calendrier, jamais de la négligence. Ignorer met la zone en pause, avec dégel en 7 jours. Remballer dans les 24 h annule le gain.
- **La plus originale des cinq.** — Faiblesses : - **Profondeur de gestion et enjeux les plus faibles.** Une seule monnaie, des projets et du décor ; les événements ne font que mettre une zone en pause. On est loin du « vrai jeu de gestion avec obstacles » de PRODUCT.md.
- **Rupture explicite avec ce qu'Alex a dit aimer** : colonie agro-tech, Potager à la Township, Bastion, trois ressources. La deuxième place dépend de son accord.
- **Le fantasme, ce sont ses propres corvées.** Peu d'évasion, et un risque d'usure de la nouveauté une fois la maison meublée (vers le jour 60), portée ensuite par le seul récit.
- **Les sous-tâches ne paient rien**, donc les étapes des grands chantiers ne sont pas renforcées.
- **Inflation chez le joueur intense** : 4 318 bûches pour environ 2 480 de puits, soit environ 1 800 reportées.
- **Les lampes de zone tamisées servent de miroir d'un domaine absent.** Avec 0 tâche Enfants dans les données actuelles, la chambre reste toujours tamisée.
- **Registre mélancolique** risqué sur tout un hiver.
- **Volume d'écriture élevé** : environ 50 pages et 120 billets par an.
- **Maison en coupe éclairée en three.js** : chantier technique lourd. — À greffer : - **Objet-reflet par ancre** (dictionnaire d'environ 40 ancres et 150 mots-clés). Chaque quête modifie un objet précis de son secteur : pneus → chaînes sur la charrette du Convoi ; calfeutrer → fenêtres de l'Atelier. Le même dictionnaire propose de reclasser les domaines incohérents.
- **Encodage physique Priorité/Longueur/Difficulté** des caisses et charrettes.
- **Jour du recyclage hebdomadaire** : bilan, triage des quêtes de plus de 60 jours, bonus « quête oubliée » de +20 %.
- **« Un mot pour l'Almanach ? »** à la complétion, qui sert d'annotation au sens de PRODUCT.md.
- **Un animal du Bastion** qui dort sur la quête conseillée.
- **Le carnet manuscrit d'un intendant précédent** comme support des révélations d'ÉCHO-7.
- **Visiteurs pendant l'absence**, qui laissent des souvenirs cosmétiques.
- **Ordre de chargement** : DOM de moins de 60 Ko, puis instantané WebP de la scène, puis la 3D.
- **Remballer dans les 24 h annule le gain.**
- **Suggestions de vraies tâches saisonnières** : pneus, détecteurs de fumée au changement d'heure.
- **A-restauration (74/100)** — Forces : - **Retour par quête le plus causal du lot côté colonie.** Le fil de lumière part vers le secteur du domaine, et la case suivante germe à 34 %, 67 % puis 100 %.
- **La Lueur d'un secteur fermé n'est jamais perdue** : elle perce la cendre à l'ouverture.
- **L'anti-farming le plus complet.**
  - Évaluation figée au premier de trois moments.
  - 50 % pour une quête inscrite après coup.
  - Registre en ajout seul, plafond quotidien dégressif.
  - Plafonds de stock avec débordement en Lueur.
  - Laisser faire un incident coûte toujours plus que le prévenir.
  - Assertions de simulation prévues.
- **Formules justes**, que j'ai recalculées : les exemples de Cote (82, 79, 57, 47) et de Points d'effort (6, 8, 17, 17, 25) se vérifient.
- **Bouton « Pourquoi ? »** qui détaille la Cote.
- **Plaques datées des chantiers** : de la mémoire, pas du salaire.
- **Fin de journée explicite** (« L'Orée veille »).
- **Durées minimales de chapitre** : la finale n'arrive pas avant le jour 87.
- **Couche calendrier indépendante des chapitres**, et Mode relâche de 14 jours par saison.
- **Bible la plus fidèle**, avec ÉCHO-7 qui passe du vouvoiement au tutoiement à la finale. — Faiblesses : - **Trop de systèmes.** Environ 15 sous-systèmes : 3 cultures, incidents à 4 réponses, Fronts, remparts, Lots, Commandes, Souffler, cendrillons, éclat, Réservoir/Entrepôt/Cellier, Scierie, Vitalité, Plans. En session de 2 minutes, les appels à l'action se concurrencent.
- **La restauration est un arc fini, et il s'épuise vite pour le domaine dominant.** Dans les données réelles du prototype (Maison 11 tâches sur 27, Enfants 0, Véhicule 2), l'Atelier (192 Lueur) se remplit en environ 3 semaines de jeu typique. Ensuite, les quêtes Maison (environ 40 % de l'activité) n'alimentent plus que 3 paliers cosmétiques d'« éclat ». Le retour signature disparaît pour l'essentiel des quêtes après un mois environ.
- **La Maison commune resterait grise sans Souffler** : la carte « miroir » montre un secteur gris pour un domaine simplement non saisi.
- **Cultures de 6, 12 et 24 h** : des raisons de revenir sans lien avec une tâche.
- **Punition douce de la négligence** : déclin de la Vitalité et incidents pondérés par la négligence.
- **Chapitre 7** : 7 jours de rafales quotidiennes à 17 h, vécus comme une obligation.
- **Rien n'est encore simulé.**
- **Gris vers couleur à la Cozy Grove ou Terra Nil** : un trope connu.
- **La Saison 2 n'ajoute qu'un seul secteur**, c'est mince à 180 jours.
- **Petite incohérence** : Ambroise parle au chapitre 4 alors qu'il arrive au chapitre 5.
- **Portée XL** alors que la saison commence aujourd'hui. — À greffer : - **Fil de lumière vers le secteur du domaine**, avec germination à 34, 67 puis 100 % : c'est la boucle de 10 secondes qui manque à D.
- **Lueur en réserve jamais perdue.**
- **Plaques datées des chantiers** de Longueur 6 ou plus.
- **Cote avec bouton « Pourquoi ? »** (pondération 4,5·P, 2·(11−L), 1·(11−D)).
- **Évaluation figée** au premier de ces moments : « J'y vais », première étape, 24 h.
- **Quête inscrite après coup** payée 50 %.
- **Assertions de simulation** : finale jamais avant le jour 75, Marathon au plafond moins de 20 % des jours, aucune case jamais perdue.
- **Mode relâche** de 14 jours par saison, qui gèle les Avis.
- **Semaines tenues cumulatives.**
- **Carte de fin de journée**, avec un maximum de 3 beats par jour.
- **ÉCHO-7 qui tutoie** à la finale.
- **Couche saisonnière** indépendante de la progression.
- **C-compagnon-expeditions (73/100)** — Forces : - **Les boucles les plus claires.** La quête donne un effet immédiat (voile, caisse, portée). Le soir, une seule décision (où aller). Le matin, un retour avec une lettre. Fin de session explicite et jeu quotidien d'environ 4 minutes : la direction qui vole le moins de temps.
- **La narration la plus forte, thématiquement.**
  - Geneviève, la 6e intendante, a voulu porter seule la vallée ; la Grande Cendre est son épuisement. La leçon « Ne porte pas tout » est inscrite dans l'intrigue, pas seulement dans le ton.
  - Révélation FANAL-6.
  - Chasse-galerie du Réveillon.
  - Fanal est un anti-Tamagotchi : répliques de 20 mots au plus, une complétion sur trois.
- **Mode Côte à côte** (présence pendant l'effort) sans récompense matérielle.
- **Économie simple et étanche.**
  - Le surplus devient de la « Lumière » sans valeur d'échange.
  - Une traversée par nuit, rattrapage limité à 2 nuits.
  - Aucun départ sans vraie quête.
  - Plafond de 14 Élan par jour pour les bonus. — Faiblesses : - **Profondeur de gestion mince.** Une seule vraie décision par jour, 3 pots, des modules. Rien de la ferme manipulable à la Township ni de la défense du Bastion confirmées dans PRODUCT.md.
- **Le monde est surtout un décor et une carte**, avec peu de vie systémique.
- **Le même rituel départ/retour chaque jour** s'use vers le jour 60. Avec 40 récits uniques et 60 gabarits par saison, les lettres finiront par se répéter.
- **Aléas pondérés par la négligence** d'un domaine (+10 %).
- **Les altises** (récolte mûre laissée plus de 48 h) contredisent « rien ne pourrit ».
- **Le retour différé à la nuit** peut sembler lent.
- **Aucune simulation.** — À greffer : - **Mode Côte à côte** à « Commencer ». Le gardien du Foyer fait la corvée miroir, avec Wake Lock et une respiration de 6 par minute ; aucune récompense matérielle, seulement un relevé informatif.
- **Lettre ou récit du matin** comme forme de la Chronique de la nuit.
- **Thème « Ne porte pas tout »** pour le 6e intendant, avec une finale d'autonomie de la colonie.
- **« Lumière » sans valeur** pour le surplus d'Élan.
- **Tâches de l'agent familial** livrées comme « courrier ».
- **Rattrapage visuel du ciel** depuis le dernier état vu.
- **Vol du Réveillon (chasse-galerie)** comme cinématique de la trêve des Fêtes.
- **Répliques de 20 mots au plus**, une complétion sur trois.
- **B-village-commandes (69/100)** — Forces : - **Règle d'or : rien dans le village ne produit d'Énergie**, et chaque geste en coûte. Le temps de jeu est donc borné par le vrai travail.
- **Écran de fin explicite** (« Le village travaille »).
- **Télémétrie du ratio jeu/quêtes** : cible sous 10 %, Mode sobre proposé au-delà de 15 %.
- **Rappel doux** après 5 minutes de jeu continu, et comptoir fermé la nuit.
- **Les Liens réduisent le jeu au fil de la saison** : au 4e cœur, les villageois automatisent (« plus le village t'aime, moins il a besoin de tes doigts »).
- **Trophée durable lisible** : la population passe de 4 à 24, avec des familles qui arrivent en charrette.
- **La Pierre angulaire** (Priorité ou Durée 7 ou plus) tire vers l'important.
- **Commandes sans expiration**, générées à graine, avec l'indice « Manque : … ».
- **Souhait du réel** : reformuler, reporter ou retirer une tâche vieille de 21 jours sont trois bonnes réponses. — Faiblesses : - **Récompense LINÉAIRE en Durée.** Passer la Durée de 3 à 6 double presque l'Énergie (à P8 : 4 → 8). La pénalité de −7 sur l'Indice ne retient pas un joueur motivé par le jeu.
- **Le jeu entre dans le rang** (« Utile au village +3 »).
- **Évaluation figée seulement 12 h avant la fin.**
- **Pénurie structurelle de matériaux, colmatée par des rustines en série.** Les 5 matériaux liés aux domaines créent un manque que j'ai vérifié en relançant pacing.mjs : 0 Ferrure en 21 jours en profil léger, 0 ou 1 au jour 14 en profil moyen. Troc, pondération, substitution et Condenseur se rajoutent l'un à l'autre, et cela incite à inventer des tâches Véhicule.
- **Minuteries à la Hay Day** (30 min, 2 h) : appels à revenir. 9 biens et 6 recettes, c'est trop pour des visites de 10 secondes.
- **L'absence coûte quand même** : « Laisser faire » s'applique à moitié pendant l'absence.
- **Les productions ×2 des Fêtes** incitent à jouer davantage.
- **La moins originale** (un habillage de Township), avec un récit plus diffus. — À greffer : - **Règle « rien dans le monde ne produit d'Élan ».**
- **Ratio jeu/quêtes** dans le bilan hebdomadaire, avec Mode sobre.
- **Rappel doux** une fois par jour, et fermeture nocturne réglable.
- **Automatisation par les Liens** : les colons engagent seuls bûches et braseros.
- **Compteur d'habitants comme trophée** : des colons reviennent après chaque Avis tenu ou chapitre (« Bastion · 6 → 24 habitants »).
- **Pierre angulaire** (Priorité ou Longueur 7 ou plus) dans le lot hebdomadaire.
- **Indice « Manque : … »** et commandes sans expiration, générées à graine.
- **Souhait du réel** à 21 jours.

### Faisabilité technique et production : un développeur seul assisté par IA, sans build, hébergement statique LiteSpeed/PHP

Classement : C-compagnon-expeditions, B-village-commandes, E-foyer-miroir, D-bastion-saisons, A-restauration

Rendu conseillé : Pour C, je retiens le rendu dom-svg : scène SVG en modules ES natifs, animations en Web Animations API sur transform et opacity, interface en DOM. Un petit canvas 2D superposé est facultatif, pour les particules seulement. C'est le choix de la direction, et le spike le confirme : 36,5 Ko gzip, zéro dépendance, déploiement statique LiteSpeed immédiat. Au repos, 60 FPS sous CPU ×4 avec 3 151 nœuds ; pendant les moments, environ 50 FPS de moyenne. C vise moins de 400 nœuds, donc environ 8 fois moins, et les pics de Layerize (67 à 150 ms au déclenchement) et le recalcul de style devraient tomber sous le budget d'image. L'accessibilité native (vrais boutons, aria-live, clavier, mouvement réduit vérifié à 0 animation au repos) obtient 8/10, le meilleur score des spikes. Pixi (237 Ko gzip, calque d'accessibilité parallèle, perte de contexte WebGL) et three.js (218 Ko, coût de développement 4/10, GPU jamais mesuré) n'apportent rien à une scène de profil avec un seul personnage. Garde-fous tirés des mesures : pools de jetons et de particules pré-créés ; will-change seulement pendant un geste ; recoloration jour/nuit par variables CSS au plus une fois par minute, jamais animée en continu (le curseur saccade à environ 8 FPS dans le spike) ; aucun filtre SVG animé ; masque de recoloration des hameaux limité à une petite zone ; une seule boucle rAF, coupée par document.hidden et IntersectionObserver. Si une ferme ou un village iso est greffé plus tard, il reste dans ce moteur, au modèle du spike dom-svg (île 12×12, environ 100 entités animées au plus, défilement natif pour le panoramique). On n'ajoute pas de second moteur.

- **A-restauration (48/100)** — Forces : La mécanique cendre → couleur par permutation de palette est le levier visuel le moins cher des cinq : chaque modèle donne deux états sans dessin supplémentaire, et la progression se voit sans HUD. C'est la direction qui réutilise le plus de 006 : palette, carte comme accueil, profondeur row+col, mode construction, feuilles à 3 positions, carte au clavier, marqueurs d'incident, personnages. Les règles d'intégrité sont les plus rigoureuses : évaluation figée au premier de trois moments, quête inscrite après coup payée à 50 %, échéance posée au moins 48 h avant pour le bonus, registre avec clé par occurrence, découpage à somme constante. Autres atouts : saut d'animation au toucher (150 ms), complétions en lot fusionnées, renderer isolé derrière drawWorld(), Plan de l'Orée accessible. — Faiblesses : Le périmètre est le plus lourd. Le MVP de 3 semaines regroupe ce qui en demande au moins 6 : cœur, api.php, onglet Quêtes complet, cuiseur voxel maison avec AO, 16 modèles, caméra, hit-test, restauration, 6 effets, onboarding, 2 chapitres, cultures, Scierie, incidents, jour/nuit, PWA hors ligne. Le rendu choisi, un Canvas 2D maison avec ImageBitmap voxel cuits et cache IndexedDB, n'a été testé par AUCUN spike : le spike canvas-pixi utilise Pixi, pas un rastériseur maison. Prévoir 60 Mo de bitmaps sur iOS Safari et 250 ms de cuisson est optimiste. Une carte de 18 à 24 cases de côté, en losanges de 64 px, impose de panoramiquer sans arrêt sur 390 px ; les spikes montrent que même 12×12 devient minuscule sur mobile. L'économie empile 8 grandeurs qui interagissent (Énergie, Matériaux, Confiance, Lueur, Vitalité, Récoltes, éclat, PE, avec plafonds dégressifs et débordement 2:1). La simulation dite « obligatoire » n'existe pas encore. Le contenu est énorme : 8 chapitres, 6 secteurs × 3 phases, environ 60 modèles × 4 orientations × 3 états, au moins 6 variantes par réaction pour 6 personnages, 40 décorations, Front de cendre, Poudrerie avec une rafale quotidienne à 17 h. Les cultures en heures réelles (« revenir le midi ou le soir ») et les incidents pondérés par la négligence créent une légère pression d'engagement et de punition. — À greffer : Sur la gagnante : 1) la Lueur en réserve, jamais perdue, qui perce d'un coup à l'ouverture (pour C : les caisses d'un domaine sans hameau ouvert s'accumulent et se déversent à la reconnexion) ; 2) le retour de couleur par permutation de palette, en variables CSS, sur les hameaux et le Relais ; 3) les règles d'intégrité, soit trois déclencheurs de gel de l'évaluation, l'inscription après coup payée à 50 % et l'échéance posée au moins 48 h avant ; 4) le saut d'animation au toucher en 150 ms et la fusion des complétions en lot en un seul ruban ; 5) une batterie de tests node --test sur 140 jours avec 3 profils et des assertions de rythme, à rendre réellement bloquante ; 6) les plaques datées des chantiers de L ≥ 6, une mémoire durable très peu coûteuse ; 7) api.php avec opId idempotent, flock, révisions et 14 sauvegardes tournantes.
- **B-village-commandes (58/100)** — Forces : Le spike canvas-pixi correspond presque exactement à la scène visée : île, serre, silo, tour-relais, muret du Bastion, villageois qui marchent, moments quête, construction et récolte synchronisés avec les compteurs, calque d'accessibilité à tabindex itinérant, vue liste. La moitié de la semaine 2 est donc déjà prototypée. Le spike mesure environ 5 ms de JS par image sous CPU ×4 et 3 à 6 appels de dessin. La désaturation par ColorMatrixFilter donne une signature de restauration bon marché, car une seule texture suffit par bâtiment. Les garde-fous de temps de jeu sont les mieux instrumentés : ratio jeu/quêtes dans le Relevé, Mode sobre, écran de fin de visite, automatisation par les Liens. Le générateur de commandes à graine est déterministe et testable, et les minuteries gèlent si l'horloge recule. — Faiblesses : Le couplage de 5 Matériaux aux domaines est structurellement déséquilibré. J'ai lancé village/pacing.mjs : le profil léger a 0 Ferrure au jour 21, le profil moyen 62 Planches contre 8 Fil. Les correctifs (troc 3→2, Condenseur, commandes pondérées, substitution à 7 jours) ne sont PAS simulés, car le script ne modélise que les revenus, sans puits ni recettes. Les rustines s'empilent : c'est un signe de fragilité et un coût d'équilibrage élevé. Les systèmes à construire sont nombreux : 6 recettes, ateliers à 2 créneaux, commandes, lots, troc, Liens avec 5 cœurs et automatisation, Avis, Convoi, Réserve d'hiver, population. Les minuteries de 30 min et 2 h sont des crochets de retour à la Hay Day ; malgré les parades, c'est le piège Focus Plant. Pixi pèse 237 Ko gzip. Le plan le charge depuis jsdelivr, alors qu'il faudrait le vendoriser. Restent à faire : gérer la perte de contexte WebGL et valider les FPS sur GPU réel (SwiftShader ne mesure rien). Il y a aussi le chevauchement des cibles tactiles en iso, observé dans le spike, et 7 portraits illustrés en SVG qui demandent un vrai talent d'illustration. — À greffer : Sur la gagnante : 1) dans le Relevé hebdomadaire, le ratio entre temps de jeu et temps de quêtes estimé, avec le Mode sobre au-delà de 15 % ; 2) l'écran explicite « Le village travaille », avec les minuteries et la prochaine quête en grand ; 3) les puces « Une chose déjà faite? » adaptées à l'heure dans l'onboarding ; 4) le gel des minuteries si l'horloge recule de plus de 10 min ; 5) la migration des domaines par une feuille de confirmation unique, sans rien modifier en silence ; 6) une Vue liste complète du monde, tout le jeu jouable sans la scène ; 7) Atkinson Hyperlegible pour le texte ; 8) l'idée que plus le monde t'aime, moins il a besoin de tes doigts (automatisation progressive des gestes).
- **C-compagnon-expeditions (71/100)** — Forces : C'est le rendu le plus simple à produire et à faire tourner : une scène de profil SVG, une carte, un seul personnage articulé. Il n'y a ni projection iso, ni tri en profondeur, ni hit-test 3D. Le spike dom-svg valide la pile : 36,5 Ko gzip, zéro dépendance, 60 FPS au repos sous CPU ×4 avec 3 151 nœuds, environ 50 FPS pendant les moments. C vise moins de 400 nœuds, donc une marge d'un ordre de grandeur. L'accessibilité est la meilleure des cinq : vrais boutons SVG/DOM, jumeau texte aria-live, chaque séquence passable ; le spike dom-svg obtient 8/10, le meilleur score. Les variables CSS couvrent les saisons et l'heure sans dupliquer l'art. L'économie est la moins couplée : Élan → lieues, caisses à conversion déterministe, un seul vrai choix par jour. Elle est donc peu coûteuse à équilibrer et le jeu prend peu de temps (environ 3 décisions par jour, une traversée par nuit). La résolution de la nuit est paresseuse et déterministe à l'ouverture, en fonction pure, sans cron ni serveur. Elle s'adapte idéalement à l'hébergement statique et aux tests node. Le MVP, de taille M, est le plus crédible en 3 semaines. — Faiblesses : 1) Défaut majeur du MVP : les écritures vont dans un bac à sable localStorage avec export JSON, et api.php est reporté en phase 2. Cela répète le défaut n° 1 de l'audit de 006 : l'agent familial et les vraies tâches ne sont pas branchés. Il faut ramener api.php en semaine 1 (+2 à 3 jours). 2) La direction abandonne la carte iso et le placement de bâtiments, alors que PRODUCT.md s'y engage (« ferme manipulable inspirée de Township », Potager comme boucle principale). 3 pots ne remplacent pas ça : c'est un risque produit, pas technique. 3) Le vrai goulot d'art est Fanal : 8 poses, plus 5 boucles de corvée à 12 i/s, 6 formes d'yeux, une tuque d'hiver. Il faut le rigger par groupes et transforms plutôt que par échange de poses. L'ambition « Clarence Gagnon » en SVG écrit à la main est un vœu : le spike plafonne à un flat low-poly soigné (visuel 7/10). 4) Le mode Côte à côte avec Wake Lock garde l'écran allumé pendant une corvée d'une heure : c'est un coût de batterie, et ça ramène l'attention au téléphone (piège Focus Plant). Il doit être désactivé par défaut, avec la scène assombrie. 5) La récompense principale est différée à la nuit et au matin. 6) Les aléas sont pondérés par un « domaine négligé » (+10 % par domaine), avec des avaries à −2 lieues et −30 % de cargaison : c'est une pente punitive, contraire au principe de ne jamais punir. 7) Il n'y a encore aucune simulation économique. Il faudra écrire 40 récits uniques par saison. Reconstruire le départ automatique depuis le registre autour de 22 h 30 et de l'heure d'été est délicat (testable, mais délicat). 8) La scène n'occupe que 47 % de la hauteur, sous les 55 % de la règle Living Ground de 006. — À greffer : À conserver tel quel : la résolution paresseuse et déterministe, le jumeau texte aria-live et choreo.js (compteurs qui montent à l'impact). Corrections obligatoires : api.php (opId, flock, révisions) dans le MVP ; aléas tirés du calendrier, jamais de la négligence ; Côte à côte sans Wake Lock par défaut ; scène portée à au moins 55 % de la hauteur sur mobile ; Fanal riggé par groupes. Si le jury produit exige une vraie ferme ou un village manipulable, l'ajouter en saison 2 comme un hameau-jardin iso dans le MÊME moteur SVG, selon le modèle du spike dom-svg (12×12, environ 40 entités au plus), jamais avec un second moteur.
- **D-bastion-saisons (50/100)** — Forces : La calibration est la plus mûre : 3 itérations de simulation (sim3.py, 200 graines, scénario d'absence de 14 jours). Je l'ai relancée, elle tourne : profil normal à 82 % Tenu et 0 % Plié, absence de 14 jours qui donne Justesse et jamais Plié. L'art 3D est le moins cher possible : hexagones CylinderGeometry, boîtes et cônes en ombrage plat, InstancedMesh. Lumière, jour/nuit et calottes de neige viennent de la géométrie, sans aucun actif. Bonnes idées d'ingénierie : advance(now) déterministe et plafonné, Force fixée par graine à l'annonce, interface WorldView pour remplacer three.js par Canvas 2D, interface affichée avant la scène, paliers de qualité au démarrage, repli SVG. La jauge unique et décomposable de Préparation contre Force est un excellent objet lisible. — Faiblesses : Le spike three-voxel reste le plus coûteux à développer (4/10) et le moins sûr en performance (5/10, aucun GPU réel mesuré, à-coups de compilation de shaders, churn des versions de three). Le nombre de systèmes est élevé : 11 Avis à dates fixes, 5 étiquettes de menace, environ 20 bâtiments à 3 ou 4 niveaux visuellement distincts, Bûches, Moral, Beauté, chartes, braseros, Ordre de marche, nuit rejouée avec 600 particules, neige en 3 couches. Le couplage au calendrier réel joue contre le MVP : livré vers le 26 octobre, il aura raté le Premier gel du 14 octobre, d'où un prologue adaptatif qui ajoute du code. Les chiffres publiés ne correspondent pas à la simulation : la direction cite des Forces de 115, 170 et 100 et un profil léger à 33/56/10, alors que sim3.py utilise 110, 150 et 110 et sort 41/48/11. La calibration annoncée n'est donc pas celle qui a été simulée. La neige d'ambiance à 30 i/s pendant les fenêtres d'Avis (environ la moitié de la saison) pèse sur la batterie. « Plié » (−8 Moral, 2 dégâts) et la date fixe restent une punition douce et une source d'anxiété. — À greffer : Sur la gagnante : 1) un simulateur porté en tools/sim.mjs, rejoué à chaque réglage, avec 200 graines et un scénario d'absence ; c'est la meilleure pratique de calibration des cinq ; 2) advance(now) déterministe avec rattrapage plafonné ; 3) les aléas annoncés de 5 à 9 jours d'avance (la vigie « la veille » de C est trop courte) ; 4) une valve unique « Dévier le front » par chapitre et une trêve des Fêtes ; 5) le dévoilement progressif des systèmes sur 3 semaines ; 6) l'interface WorldView qui rend le moteur remplaçable ; 7) une jauge unique décomposable au toucher, à appliquer à la Voile et à la Portée de C.
- **E-foyer-miroir (55/100)** — Forces : C'est la meilleure stratégie de chargement des cinq. HTML, CSS, cœur et registre pèsent moins de 60 Ko gzip et sont interactifs en moins d'une seconde. Une image WebP de la dernière maquette s'affiche ensuite, puis three.js arrive en import dynamique : la boucle utilitaire n'attend jamais le monde. La semaine 1 est utilisable dès le jour 5, sans rendu. L'économie est la plus simple à équilibrer (une seule monnaie, les Bûches), et sa simulation existe et tourne (sim2.py : régulier à 2 030 bûches, absence de 3 semaines sans perte). Le pont diégétique ne demande aucun lore pour la boucle centrale, ce qui réduit l'écriture du cœur. Le dictionnaire de 40 ancres et environ 150 mots-clés est une vraie fonction utilitaire : proposition du domaine et de P/L/D à l'ajout, détection des 7 domaines incohérents des vraies données. Côté robustesse : écriture atomique (fichier temporaire puis rename), ETag, refus côté serveur de supprimer une entrée du registre, « Remballer » dans les 24 h annulé par écriture inverse. Les axes P/L/D sont encodés dans la boîte et toujours doublés en DOM. — Faiblesses : Rupture avec les engagements de PRODUCT.md (colonie agro-tech, Bastion, trois ressources, personnages) : la réutilisation de 006 est la plus faible, et il faut une décision explicite d'Alex. La technique la plus risquée hors spike est une coupe intérieure en three.js : murs masqués selon l'angle, accessoires en voxels de 12,5 cm sur un socle de 48×40, émissifs de nuit, chatte qui marche sur un graphe de points de passage entre les étages, rabats de boîte articulés, boutons DOM repositionnés par projection. Les combinaisons d'art explosent : 3 gabarits de maison, peinture personnalisable, 12 ancres à deux états, environ 60 objets par saison, plus des maîtrises permanentes. L'écriture demande une qualité littéraire et intime (carnet de Pierrette d'environ 50 pages par an, 120 billets, mystère familial) qui peut sonner faux. three.js : performances GPU non mesurées, import map exigeant Safari 16.4 ou plus. Le risque du miroir accusateur reste à prouver par le critère « 40 tâches, dont 10 échues, donnent une maison accueillante ». — À greffer : Sur la gagnante : 1) l'ordre de chargement, avec l'utilitaire en DOM de moins de 60 Ko interactif en moins de 1 s, puis l'image de la dernière scène, puis la scène, de sorte que la liste n'attende jamais ; 2) une semaine 1 livrable et utilisable sur les vraies tâches avant tout rendu ; 3) le dictionnaire d'ancres et de mots-clés pour l'ajout rapide (domaine et P/L/D proposés) et la détection des domaines incohérents ; 4) l'écriture atomique (temporaire puis rename), l'ETag, et le refus serveur de toute suppression dans le registre ; 5) « Remballer » dans les 24 h annulé par écriture inverse ; 6) « Un mot pour l'album? » après la fin d'une tâche, versé dans les notes, ce qui répond au « l'annote » de PRODUCT.md ; 7) le critère d'acceptation « 40 tâches, dont 10 échues, donnent un écran accueillant ».
