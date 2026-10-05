# Revue narrative et éditoriale : Orée vivante (006)

**Alerte confidentialité (hors du périmètre demandé).** Des titres de vraies tâches restaient versionnés dans les sketches 001 à 004 et dans un identifiant de 005/006. Corrigé par la réécriture d'historique du 5 oct. 2026.

## 1. Incohérences relevées

Les chemins sont relatifs à `sketches/006-oree-vivante/`. PRODUCT, README et TASKS_WORKFLOW sont à la racine du dépôt.

| Emplacement | Problème | Correctif |
|---|---|---|
| `index.html:8, 35, 37` ; `README.md:1` ; `PRODUCT.md:53` | Le produit porte quatre noms : Quêtes du foyer, Orée vivante, Colonie Orée et Master Tasklist. « Colonie Orée » est l'aria-label du logo, différent du texte visible. | Le produit s'appelle Quêtes du foyer, le monde s'appelle l'Orée, et « L'Orée vivante » devient le titre du chapitre final. L'aria-label reprend le texte visible. |
| `data.js:295` vs 004 | « Bastion des lisières » vs « Bastion des Cendres ». | Garder « lisières ». Reprendre les Veilleurs de 004 comme bâtisseurs disparus. |
| `PRODUCT.md:61, 64` ; `005/RULES.md:15` | Le mot « Réputation » subsiste. | Confiance partout. |
| `ui.js:99, 176` | Le score est libellé « priorité » (on lit « 66 priorité »), juste à côté de la vraie priorité « Priorité 8/10 » (`:103`). | Renommer le score « Indice ». |
| `index.html:136–137` vs `PRODUCT.md:36` | Durée/Effort d'un côté, Longueur/Difficulté de l'autre. | Durée/Effort partout. |
| `app.js:404` ; 005 | « Complétion impossible » est un anglicisme. 005 parle de « Mission ». | « Impossible de terminer ». Une quête est une tâche réelle ; un objectif est une étape de jeu. |
| `index.html:7, 131` ; `app.js:131, 455` ; `ui.js:177` | « Sandbox local », « Registre local », « Réinitialiser le sandbox », alors que `index.html:154` dit « Réinitialiser l'Orée ? ». | « Registre des quêtes ». « Recommencer l'Orée », rangé dans les Réglages. |
| `index.html:147` ; `app.js:381` | « Touche seulement la copie locale » deviendra faux en production. | « Retirer la quête de ta liste. L'Orée n'est pas affectée. » |
| `app.js:557` ; `ui.js:134` ; `data.js:283` | « Fantôme aimanté », « six cases », « Stockage blocky ». | « Aperçu placé », « six emplacements ». |
| `index.html:84` ; `ui.js:147` | « Jour +1 » et « Jour suivant » : deux libellés pour une mécanique nue. | En production, le jour est la date civile. Dans le prototype : « Passer la nuit (test) », dans un menu Outils. |
| `index.html:115` vs `:107` ; `ui.js:116` | Trois registres se mélangent : « Touchez… glissez » (vous), « Choisis » (tu), « Cliquer ou glisser » (infinitif). « Cliquer » ne convient pas à un écran tactile. | Tu partout. Seul ÉCHO-7 vouvoie. |
| `ui.js:18–20` vs `data.js:278`, `STORY.md:48, 51`, `005/data.js:80` | Les Archives s'ouvrent tantôt à 8 Confiance, tantôt à 3. Le palier 3 donne tantôt « les codes », tantôt « Naïma et les Archives ». | Un seul barème (voir §4). |
| `ui.js:19` | Un « permis de serre » est promis à 5 Confiance, mais la serre se répare sans permis (`ui.js:148`). | Réserver ce permis à la Serre longue. |
| `data.js:326` vs `STORY.md:40–42` ; `app.js:92, 427` | ÉCHO-7 et les « 184 cycles » ne s'affichent jamais. « Les Archives ont répondu » promet une suite qui ne vient pas. | Clore le chapitre 1 sur la première ligne d'ÉCHO-7. |
| `index.html:73–74` ; `app.js:86–92` | La bulle est toujours signée Solène, même pour une réplique de Milo ou pour la règle de Confiance. Milo n'est qu'un bouton (`ui.js:151`). Naïma n'apparaît pas. | Un champ `speaker` et un portrait par réplique. Les règles vont dans les puces. |
| `STORY.md:10` vs `app.js:247` | La phrase qui justifiait le lien avec le réel (« Ce que tu accomplis hors d'ici devient notre capacité d'agir ici ») a été remplacée par « Le réel alimente la ferme ». | Rendre l'étape 2 à Solène. |
| `ui.js:69, 188` ; `app.js:63` | L'incident du jour 4, « Tour instable », porte le nom de l'état initial de la Tour. Il survient même après stabilisation, et l'en-tête affiche alors « tour stable ». | Le renommer « Rafale sur le relais » et ne le déclencher que si la Tour est stable. |
| `ui.js:186` | Le choix « Récolter tôt » ne récolte rien. L'incident survient même sans culture. | « Laisser faire ». Rétablir les Larves cendrées de 005. |
| `data.js:301` ; `model.js:174` | La Confiance commence à 1 sans raison. Elle dépend du jour simulé, que « Jour +1 » fait avancer à volonté. | Départ à 0, et jour civil. |
| `ui.js:102` | « Courte, prioritaire et réaliste » est un texte fixe, donc faux pour une quête de 1–2 h. | Afficher une raison calculée. |
| `app.js:402, 315, 239, 83` ; `index.html:146` ; `ui.js:13` ; `model.js:287` | Coquilles et petites incohérences : voir le détail sous le tableau. | Voir le détail sous le tableau. |
| `TASKS_WORKFLOW.md` vs `data.js`, `tasks.example.json` | Les domaines ne concordent pas : voir le détail sous le tableau. | Une liste fermée de sept domaines : Maison, Terrain, Animaux, Enfants, Véhicule, Administratif, Professionnel. |

**Détail des coquilles :**
- « +1 Matériaux » au lieu de « +1 Matériau » ; corriger l'accord.
- Des coûts affichés sans signe ; écrire « −8 Matériaux ».
- Un double espace dans « 1. Choisis  2. Place ».
- « 1 sur 6 » d'un côté, « 1 / 3 » de l'autre.
- Une espace avant « ? » dans « quête ? », mais aucune espace dans « À 3: » ; adopter la typographie OQLF partout.
- « jalon » au milieu de durées chiffrées ; le remplacer par « grand chantier ».
- « Parcelle 1 » qui suit les parcelles A à C ; la nommer « Parcelle D ».

**Détail des domaines :**
- **Le canon.** `TASKS_WORKFLOW.md` en compte cinq. 006 ajoute Professionnel, Jardin et Ferme, mais n'a pas Enfants.
- **Valeurs par défaut.** Le formulaire propose « Maison » (`index.html:134`), le modèle « Personnel » (`model.js`).
- **Domaines mal attribués dans `data.js` :**
  - lignes 29, 39, 149 et 159 : Professionnel ;
  - lignes 69 et 229 : les pneus et les affaires scolaires sont en Maison ;
  - lignes 79 et 259 : Véhicule ;
  - lignes 89, 119, 129, 139 et 189 : Jardin ;
  - ligne 99 : les fenêtres sont en Ferme.
- **Dans `tasks.example.json`** : lignes 38, 49, 71, 93 et 104 (par exemple, le réfrigérateur est classé Véhicule).
- **Collision de noms.** Le domaine réel « Ferme » porte le même nom que l'onglet « Ferme » du jeu.

**Québec.** Le texte est en français international neutre, sans aucun marqueur québécois. C'est défendable, à condition d'en faire un choix assumé (§6).

## 2. Diagnostic narratif

- **Qui suis-je ?** Un « intendant » sans origine. On ne sait pas si Alex vit dans l'Orée ou ailleurs.
- **Pourquoi suis-je ici ?** La tempête et l'isolement : cette partie est claire.
- **Quel est l'enjeu ?** On lit « Le Bastion s'éteint », mais rien ne s'éteint à l'écran. L'intégrité du Bastion (72/100 dans 005) et ses secteurs ont disparu. L'enjeu est annoncé, jamais montré.
- **Quel est l'objectif à long terme ?** Une seule ligne, « Plus tard », dans un panneau secondaire (`ui.js:170`).
- **Pourquoi les tâches réelles donnent-elles du pouvoir ?** Rien ne l'explique dans le monde. « Le réel alimente la ferme » énonce une règle, pas une raison. La Confiance vient d'habitants qu'on ne voit jamais, et le « +1 par jour » n'a aucun sens dans la fiction.
- **Le ton.** Il est adulte. Il n'est chaleureux qu'à moitié : la palette l'est, pas le texte, qui reste télégraphique et sans rien de sensoriel. Les meilleures lignes des prototypes précédents se sont perdues : « Le score ne mesure pas ta valeur » (002) et « Quelqu'un cultivait déjà la cendre avant nous » (005).
- **Les personnages.** Il n'y a qu'une voix, réduite à une bulle d'aide. Le chapitre 1 se termine sur une promesse vide.

**Verdict :** la structure tient. Il manque le pont entre la fiction et la vie réelle.

## 3. Bible narrative

**Titres.** *Quêtes du foyer* désigne le produit et *l'Orée* le monde. *L'Orée vivante* devient le titre du chapitre 8 : le nom du jeu devient son objectif.

**Prémisse.** L'Orée est une colonie agricole au bord d'une vallée. Les tempêtes de cendre ont rendu ses terres stériles en surface et fertiles en profondeur (la cendre de bois est un vrai engrais). Ses bâtisseurs, les Veilleurs, ont disparu. Ils ont laissé le Bastion des lisières, une Tour de veille et des Archives scellées. La route est coupée, et l'Orée tient avec trois parcelles.

Le Bastion n'est pas une forteresse : c'est un relais. Les Veilleurs l'ont conçu pour qu'un intendant vivant ailleurs, dans son propre foyer, puisse soutenir l'Orée. Chaque geste de soin accompli chez lui traverse la lisière sous forme d'élan. La Tour capte cet élan et les ateliers le transforment en Énergie et en Matériaux. Les jours où la lisière s'allume, les habitants la voient : c'est la Confiance. Elle ne monte qu'une fois par jour, parce qu'elle mesure la présence et non le volume.

Alex est le septième intendant de continuité. L'Orée n'exige rien : elle répond. Quand Alex s'absente, elle attend. Les pertes viennent de la météo, jamais de l'absence, et se réparent toujours.

**Correspondances entre le réel et le jeu :**

| Dans la vie réelle | Dans l'Orée |
|---|---|
| Une quête terminée | Un élan traverse la lisière |
| La première quête du jour | La lisière s'allume, +1 Confiance |
| Ajouter ou planifier une quête | Un relevé est transmis (bonus plafonné) |
| Une échéance | Un convoi |
| Le bilan de la semaine | Le relevé d'ÉCHO-7 |
| Le domaine de la quête | Le personnage qui réagit |

**Personnages :**

| Personnage | Système de jeu | Domaines réels | Voix |
|---|---|---|---|
| Solène Ardent, agronome | Ferme, saisons, incidents | Terrain, Animaux | « Les choux ont tenu la nuit. On ne fera pas de miracle, mais on va manger. » |
| Milo Kern, technicien | Construction, Tour, défense | Maison, Véhicule | « Six d'énergie, douze de matériaux, et ta tour tient debout. Pour la peinture, on verra. » |
| Naïma Sorel, coordinatrice | Confiance, habitants, permis | Administratif, Professionnel | « Les gens ne comptent pas tes victoires. Ils remarquent que tu reviens. » |
| Lou, 11 ans, apprentie | Décor, carnet, exploration | Enfants | « Naïma dit que tu as une famille de l'autre côté. Est-ce qu'ils savent que tu nous aides ? » |
| Ambroise Lavallée, convoyeur (arrive au chapitre 4) | Comptoir, commandes | Quêtes avec échéance | « Le convoi descend vendredi. Après, il y en aura un autre. Il y en a toujours un autre. » |
| ÉCHO-7, mémoire des Archives | Mystère, relevés | Aucun ; vouvoie Alex | « Relève détectée. Fonction reconnue : intendant de continuité. Dernière relève : il y a 184 cycles. » |

Il faut abandonner « Vous êtes en retard de 184 cycles » : dans une application de tâches, la phrase vise Alex.

**Secteurs à débloquer :**

| Chapitre | Secteur |
|---|---|
| 1 | Le Clos |
| 1 à 3 | Le Bastion : Porte agricole, Tour et Archives |
| 2 | Le Coteau |
| 3 | La Prise d'eau |
| 4 | La Route et le Relais |
| 5 | La Serre longue |
| 6 | La Maison commune |
| 8 | Le Nord |
| Saison 2 | L'Érablière |

**Le mystère d'ÉCHO-7, en six révélations :**
1. « Relève détectée. »
2. « Sous la troisième assise… quelqu'un cultivait déjà la cendre avant nous. »
3. Une lettre adressée « À l'intendant qui viendra ».
4. Le registre de six intendants, dont la septième ligne est vide.
5. La cendre luit en direction du nord.
6. « Il n'y a jamais eu de machine au cœur du Bastion. Il y avait des gens qui revenaient. » Le Nord abrite une autre Orée, ce qui ouvre la saison 2.

## 4. Arc en chapitres

Chaque chapitre s'ouvre à un seuil de Confiance. Le rythme visé est de 4 ou 5 points de Confiance par semaine. La saison suit le vrai calendrier du Québec. Les dates supposent un départ le 5 octobre.

| # | Titre · seuil · période | Accroche | Déblocage | Événement | Fin |
|---|---|---|---|---|---|
| 1 | Le premier sillon · 3 · début octobre | La route est coupée | Semis, serre, Tour ; Naïma arrive à 3 | Gel au sol | ÉCHO-7 s'éveille |
| 2 | Sous la troisième assise · 7 · mi-octobre | Les Archives s'entrouvrent | Archives, Coteau | Feuilles d'érable dans la prise d'eau | « …cultivait déjà la cendre » |
| 3 | Avant les neiges · 12 · novembre | Préparer l'hiver | Silo, dormance, intégrité du Bastion ; arrivée de Lou | Larves cendrées | « Le mur est chaud. De l'intérieur. » |
| 4 | La route de la vallée · 18 · mi-novembre | Une fenêtre avant la neige | Relais, commandes avec échéance ; arrivée d'Ambroise | Le dernier convoi | La lettre |
| 5 | La longue nuit · 24 · décembre | Le solstice | Serre longue, lanternes | La première tempête | La ligne vide du registre |
| 6 | La veillée · 30 · temps des Fêtes | Une pause voulue : aucun incident | Maison commune | La veillée | Les Veilleurs avaient des foyers |
| 7 | Poudrerie · 36 · janvier | L'hiver assiège l'Orée | Défenses, sentier du Nord | Plusieurs jours de poudrerie | La cendre luit |
| 8 | L'Orée vivante · 42 · février | Tout s'allume | Le Nord, carte du réseau | La relève complète | Révélation finale ; annonce du « Temps des sucres » |

## 5. Systèmes narratifs dynamiques

- **Journal du matin.** Deux phrases à la première ouverture de la journée : la météo de saison et l'effet de la veille. Le texte s'adapte au moment (avant-midi, soirée…).
- **Réactions par domaine.** Une réaction par personnage et par jour. Elle évoque le domaine de la quête, jamais son titre.
- **Retours sans série.** Aucun compteur d'absence. Au retour, on montre ce que le monde a accompli de bon entre-temps.
- **Échéances.** Une quête faite à temps donne un bonus. Sinon, « le convoi reviendra ».
- **Incidents.** Quatre à six variantes par type et par saison. Aucune ne revient avant 14 jours, et l'absence n'en déclenche jamais.
- **Célébration proportionnelle.** La réaction grandit avec la taille de la quête : un toast pour une micro-quête, puis une réplique, une animation, une scène, et une entrée de journal pour un jalon.

**Tu ou vous ?** Le tutoiement est la norme au Québec entre proches, et l'application n'a qu'un utilisateur. Le vouvoiement d'ÉCHO-7 en fait une voix étrangère.

**Exemples de répliques :**
1. Journal : « Gel blanc sur les planches ce matin. Solène a couvert les semis avec les nappes de la cantine. Rien de perdu. »
2. Première quête du jour : « La lisière s'allume. Au village, quelqu'un l'a vue et l'a dit aux autres. »
3. Solène, après une quête Terrain : « Tu as travaillé dehors, ça se sent jusqu'ici. La parcelle B est plus meuble ce matin. »
4. Milo, après une quête Maison : « Une réparation chez toi, un gond de moins qui grince ici. Je n'explique pas, je constate. »
5. Naïma, après une quête Administratif : « Ce genre de travail, personne ne le remarque quand il est fait. Moi, si. »
6. Lou, après une quête Enfants : « J'ai gardé une place près de la balise, pour quand tu me raconteras. »
7. Au retour : « L'Orée a tenu. Solène a récolté la parcelle A ; les caisses t'attendent à l'entrepôt. »
8. Naïma, au retour : « Pas besoin de rattraper quoi que ce soit. On reprend où on en était. »
9. Quand l'énergie est basse : « Pas la journée pour un grand chantier ? Une quête de dix minutes allume la lisière autant qu'une autre. »
10. Pour une quête qui traîne : « Celle-ci attend depuis un moment. La reformuler, la reporter ou la retirer : les trois sont de bonnes réponses. »
11. Incident d'automne : « Les feuilles d'érable ont bouché la prise d'eau. C'est joli, mais ça n'arrose rien. »
12. Célébrations, de la plus petite à la plus grande :
    - « Fait. »
    - « Petit geste, bonne journée. »
    - « Grand chantier terminé. Milo a sorti la bonne cafetière. »
    - « Toute la colonie est sortie voir la lisière. »

## 6. Règles d'écriture

1. Le titre d'une quête s'affiche tel quel. La fiction le commente sans l'habiller.
2. Tutoiement partout ; seul ÉCHO-7 vouvoie. Les boutons sont à l'infinitif, et on n'écrit jamais « Cliquer ».
3. Zéro culpabilité : ni « en retard », ni « manqué », ni « série ». Toute perte est réparable, et le texte dit comment la réparer.
4. Un glossaire fermé, sans synonymes : quête, objectif, Énergie, Matériaux, Confiance, Indice, l'Orée, intendant.
5. Les chiffres sont signés et accordés (« +1 Matériau »). Une icône est toujours accompagnée d'un mot.
6. La mécanique va dans les puces, l'humain dans les répliques. Chaque réplique a un locuteur identifié.
7. La longueur suit l'effort : 60 caractères au plus pour un toast, 110 pour une réplique.
8. Aucun jargon de prototype ni anglicisme visible.
9. Français québécois standard : typographie OQLF, apostrophe courbe, couleur locale sans caricature.
10. Chaque texte récurrent puise dans au moins quatre variantes, et chaque message se termine sur une action à faire ou une parole rassurante.