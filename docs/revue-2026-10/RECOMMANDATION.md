# Recommandation finale — Quêtes du foyer

## 1. Direction recommandée : « La lisière rallumée »

**Pitch.** Chaque vraie tâche terminée part en fil de lumière vers un secteur de l'Orée, une colonie agro-futuriste éteinte par la cendre. Elle y ravive une case et un objet précis. Au rythme du vrai automne québécois, des Avis de saison annoncés des jours d'avance donnent aux dépenses un « pourquoi maintenant ». Fanal, l'automate-lanterne du Relais, travaille à côté de toi quand tu t'y mets. But de la saison : rendre l'Orée capable de tenir sans toi, parce que l'intendante d'avant s'est épuisée à tout porter seule.

**Pourquoi A sert de base.** C'est la seule direction qui joint une forte utilité au respect complet de PRODUCT.md. Côté utilité : Fil du jour lisible en 2 s, « Pourquoi? » chiffré, parité de tri exigée pour livrer. Côté produit : colonie, Potager, Bastion, trois ressources, placement. E et C sont plus sains au quotidien, mais E rompt cinq engagements qu'Alex a confirmés et C supprime la ferme. On garde donc A, **élagué de moitié**, avec ces greffes :

| Greffe | Origine | Ce qu'elle corrige |
|---|---|---|
| Avis annoncés et jauge Préparation/Force où les vraies quêtes comptent | D | A manque d'enjeu rythmé |
| Pas de défaite : un voile levé par la prochaine quête | Front de A, à la place du Plié de D | Le profil léger de D plie 59 % au boss |
| Force ancrée sur l'activité des 28 derniers jours (±25 %) | jury game design | Le profil intense de D n'est jamais défié |
| Côte à côte, lettre du matin, thème « Ne porte pas tout » | C | Rien n'aide à démarrer une tâche |
| Ajout avec inférence, DOM d'abord, secteur = filtre, objets-reflets, Jour du recyclage, « Un mot pour l'Almanach? », Remballer en 24 h | E | Ajout lent ; un secteur restauré ne réagit plus |
| **Fil libre** : 25 % de la Lueur va où tu veux | nouveau | Domaines déséquilibrés (Maison 11/27, Enfants 0) |
| Pierre angulaire, Souhait du réel à 21 jours, écran de fin de visite, ratio jeu/quêtes et Mode sobre, compteur d'habitants | B | Garde-fous contre le piège Focus Plant |
| Simulateur relancé à chaque réglage, `advance()` déterministe, trêve des Fêtes, « Dévier le front » | D | A n'avait aucune simulation |

## 2. Ce qu'on abandonne

- **A** : les cultures en heures réelles comme raison de revenir, les cendrillons (récompense aléatoire), la Vitalité qui baisse et les incidents pondérés par la négligence. Aussi la carte de 18 à 24 cases de côté, le moteur voxel Canvas maison jamais testé et le MVP surchargé.
- **B** : les chaînes de production façon Hay Day et les 5 Matériaux liés aux domaines. Le profil léger finit le jour 21 avec 0 Ferrure, ce qui pousse à inventer des tâches.
- **D** : le Plié, le Moral perdu, les 5 étiquettes de menace, la Beauté et three.js (coût de dev noté 4/10, GPU non mesuré).
- **C** : la Galerie volante, la récompense reportée à la nuit, la scène sans ferme, le bac à sable localStorage, les Tournées payées ×0,8 et les altises.
- **E** : la maquette de sa propre maison et les Bûches, qui rompent le produit. E reste le plan B si Alex renonce à la colonie.

## 3. Boucles de jeu

- **10 s.** Le Fil du jour (120 px) montre la quête n° 1 : durée estimée, Cote, raison, et deux boutons, **Fait ✓** et **Je m'y mets**. Ensuite viennent le fil de lumière, une case qui germe, un objet-reflet qui change, et les compteurs qui montent au moment de l'impact. Un personnage parle une fois sur trois.
- **2 min.** Ajouter une quête (3 interactions) ou en découper une. Dans le monde : semer, construire, poser une défense ou un décor, diriger le Fil libre. La visite se termine sur l'écran « L'Orée veille », avec la prochaine quête en grand.
- **Jour** (4 h à 3 h 59, heure de Montréal). Le matin, une lettre de Fanal et un plan facultatif « Quand…, alors… ». La première quête du jour allume la lisière (+1 Confiance) et arrose les cultures. Au plus 3 moments d'histoire par jour, puis une fin explicite.
- **Semaine.**
  - Lundi : Naïma propose un Lot et jusqu'à 3 plans.
  - Environ toutes les 2 semaines : un Avis.
  - Dimanche, **Jour du recyclage** : bilan informatif (heures par domaine, ratio jeu/quêtes) et tri des quêtes ouvertes depuis plus de 60 jours.
  - « Semaine tenue » à 4 jours sur 7 : compteur cumulatif, jamais de série.
- **Saison** (octobre à mars). 8 chapitres et 6 secteurs, chacun passant par Réparer, Prospérer puis Autonome. 8 Avis et une trêve du 21 décembre au 4 janvier. Trophées : « Orée · 4 → 24 habitants » et l'Almanach des plaques datées.

## 4. Modèle tâche → jeu

**Rang : la Cote.** Le jeu ne l'influence jamais.
`Cote = min(100, 4,5·P + 2·(11−L) + (11−D) + U + A)`
- U (urgence) = round(20·(14−j)/14) si l'échéance tombe dans 14 jours ou moins, 25 si elle est passée, 0 sinon.
- A (ancienneté) = min(5, âge/14 jours). La quête en cours est épinglée.
- Exemples : « Sortir le bac » ce soir, P7 L1 D1 → 82. Pneus dans 8 jours, P9 L1 D2 → 79.
- Trois cartes : À faire d'abord, Victoire rapide (L ≤ 3, D ≤ 4), Grand chantier (L ≥ 6). Une quête de priorité 8 ou plus est toujours dans les 3 premières.
- 7 tris, des filtres « 15 min », « Peu d'énergie », « Cette semaine » et par secteur, plus une recherche.

**Récompense : les Points d'effort (PE).** P, L et D sont figés au premier de ces trois moments : « Je m'y mets », première étape cochée, ou 24 h après la création.
`PE = round((6·√L + 2·[D≥7]) × (0,8 + 0,04·P))`
- Exemples : P6 L1 D1 = 6 ; P7 L7 D5 = 17 ; P10 L10 D10 = 25. Sur les vraies tâches, la moyenne est de 12,6.
- Bonus plafonnés ensemble à +40 % :
  - ×1,2 si la quête est finie avant une échéance posée au moins 48 h plus tôt ;
  - +2 PE par tranche de 14 jours d'ancienneté.
- Plafond quotidien dégressif sur ⚡ et ▣ : jusqu'à 45 PE à 100 %, de 45 à 90 à 50 %, au-delà à 20 %.
- **⚡ = 0,3·PE et ▣ = 0,5·PE.**
- La **Lueur** vaut 100 % des PE, sans plafond : 75 % au secteur du domaine, 25 % au Fil libre.

| Domaine | Secteur | Voix | Ouvre |
|---|---|---|---|
| Terrain, Jardin, Ferme | Champs | Solène | ch. 1 |
| Maison | Atelier | Milo | ch. 2 |
| Administratif, Professionnel | Archives | Naïma, ÉCHO-7 | ch. 3 |
| Enfants | Maison commune | Lou | ch. 4 |
| Véhicule | Relais du convoi | Ambroise | ch. 5 |
| Autre ou vide | Place du Bastion | Fanal | ch. 1 |

- La Lueur d'un secteur fermé n'est jamais perdue : elle reste sous la cendre et perce d'un coup à l'ouverture.
- Seuils par secteur : Réparer à 150 Lueur (12 cases), Prospérer à 400, Autonome à 750 (+6 de Préparation permanente).
- **Objets-reflets** (environ 40 objets ancres, 150 mots-clés) : même restauré, un secteur continue de réagir. Le mot « frigo » fait reluire la glacière de l'Atelier pendant 14 jours. Après 8 soins, l'objet garde une patine permanente. Le même dictionnaire propose le domaine à l'ajout.

**Échéances.** À 7 jours ou moins, la quête devient une caisse sur la route. Une échéance dépassée ne fait rien perdre : la Cote prend +25. Ambroise : « Elle attend au bord du chemin. Quand tu pourras. »

**Étapes.**
- Jusqu'à 12 par quête. Les étapes se partagent 40 % des PE et la complétion en paie 60 % : le total reste identique.
- L'étape 0 est déjà cochée.
- Pour L ≥ 6, un échafaudage monte, puis une plaque datée apparaît.
- Le découpage est proposé si la quête dure plus de 2 fois son estimation.

**Récurrences.** Une seule occurrence active à la fois, payée plein tarif, avec la clé `reward:{id}:{occurrence}`. Rien ne s'empile.

**Bonus hors tâches**, 5 ⚡ par jour au plus :
- ouverture : +1 ;
- plan : +2 ;
- plan honoré : +2 ;
- ajout complet : +1, deux fois par jour, repris si la quête est supprimée dans les 24 h.

Hors plafond :
- Retour après 3 jours ou plus : une lettre et +10 ⚡, une fois par 14 jours.
- « Bon fil » : +2 ⚡ pour une quête de priorité 8 ou plus parmi les 3 premières, une fois par jour.

**Anti-farming**
- Registre en ajout seul ; le serveur refuse toute suppression.
- Remballer dans les 24 h annule le gain par une écriture inverse. Terminer à nouveau ensuite rapporte 0.
- « Déjà faite » : plein tarif pour 3 quêtes par jour, 50 % ensuite.
- Le temps suit la date réelle ; `?debug=1` est refusé en production.
- Le mode Côte à côte ne rapporte rien.

## 5. Économie

| | Départ | Plafond | Sources | Puits |
|---|---|---|---|---|
| ⚡ Énergie | 10 | 40 → 60 → 90 | 0,3·PE, bonus | semis (3-4), braseros (8 ⚡ → +5 Préparation, 3 au plus), Souffler (8 ⚡ → +5 Lueur), constructions |
| ▣ Matériaux | 15 | 150 → 250 | 0,5·PE, Avis tenu (15), Lots | bâtiments (≈ 1 100 par saison), défenses (≈ 300), 40 décors (3-25), parcelles (10) |
| Confiance | 0 | — | +1 par jour avec une quête, +1 par semaine tenue, +2 par chapitre | jamais dépensée ; ouvre les chapitres 2 à 8 aux paliers 3, 9, 16, 24, 33, 43 et 54, avec au moins 12 jours par chapitre |

- Au plafond, le surplus de ⚡ et de ▣ passe au Fil libre, à raison de 2 pour 1.
- **Les cultures poussent avec ta présence** : un stade par jour où la lisière s'allume. Il faut 2 stades pour une courge, 3 pour une patate, 4 pour le blé. Elles ne pourrissent jamais.
- Le garde-manger contient 12 récoltes. Il sert aux Lots et à la Réserve d'hiver (+1 Préparation par courge, 6 au plus).
- **Avis** : annoncé 5 à 9 jours d'avance, un seul à la fois.
  - `Force = base × clamp(0,75 ; activité / cible ; 1,25)`.
  - `Préparation = Garde 8 + défenses + quêtes de la fenêtre (+1 chacune, 8 au plus ; domaine visé +3, 9 au plus) + réserve + braseros + 6 par secteur autonome`.
  - Tenu : 15 ▣, un sceau, une famille revient.
  - Sinon, **Voilé** : 2 cases voilées et production réduite de 50 %. Le voile se lève avec la prochaine quête du secteur, avec 1 ⚡ par case, ou seul en 3 jours.
  - Aucun voile ne tombe pendant une absence de 48 h ou plus.

**Simulation sur 3 semaines** (`simulations/recommandation-3-semaines.mjs`). Elle utilise les vraies tâches de 006, 2 à 4 quêtes par jour, et une absence du jour 9 au jour 12.

| Sem. | Quêtes | PE | ⚡ gagné (tâches + bonus) | ⚡ dépensé | ▣ gagné | ▣ dépensé | Fin ⚡/▣ | Confiance |
|---|---|---|---|---|---|---|---|---|
| 1 | 21 | 245 | 74 + 26 | 80 | 123 | 60 | 30 / 78 | 8 |
| 2 | 9 | 84 | 27 + 9 + 10 (retour) | 33 | 57 | 65 | 40 / 70 | 11 |
| 3 | 21 | 243 | 73 + 26 | 102 | 136 | 150 | 30 / 56 | 19 |

- **Construit** :
  - Tour (J2), tunnel (J4), établi (J6) ;
  - petite Scierie (J8), qui produit environ 10 % des ▣ ;
  - érables (J13), Lot (J15), Remise (J17), Salle des registres (J19) ;
  - 4 décors.
- **Avis Premier gel (J14)** : Préparation 32 contre Force 24, donc Tenu, malgré 4 jours d'absence dans la fenêtre.
- **Lueur au J21** : Atelier 198 (réparé), Champs 122, Archives 83, Relais 33, Fil libre 203.
- **Chapitres** : ch. 2 au J3, ch. 3 au J15.
- Aucun stock ne reste bloqué au plafond, et l'absence ne coûte rien.
- **À ajouter** : les profils Léger et Marathon sur 140 jours, avec ces assertions :
  - le profil Léger tient au moins 60 % des Avis ;
  - le Marathon est au plafond moins de 20 % des jours ;
  - pas de finale avant le jour 87 ;
  - aucune case perdue.

## 6. Narration

**Prémisse.** Les Veilleurs ont fait du Bastion un relais : chaque geste de soin dans ton vrai foyer traverse la lisière sous forme de lumière. Il y a 184 cycles, Geneviève, la 6e intendante, a voulu porter seule toute l'Orée. Elle s'est éteinte, et la lisière avec elle. La cendre, c'est ce qui retombe quand une seule personne s'épuise. Alex est le 7e intendant. Gravé sur le Relais : **« Ce que tu accomplis hors d'ici devient notre capacité d'agir ici. »**

**Personnages**
- **Fanal**, le compagnon : il dort sur la quête conseillée et fait la corvée miroir. Phrases de 20 mots au plus, jamais triste.
- **Solène** (Champs), **Milo** (Atelier, pince-sans-rire), **Naïma** (Archives, plans, bilans), **Lou**, 11 ans (Maison commune), **Ambroise** (échéances).
- **ÉCHO-7** : la mémoire des six intendants. Il vouvoie et lit le carnet de Geneviève par fragments.

**Ch. 1, « Le premier sillon »** (Solène, 3 jours au moins)
- Objectifs : allumer la lisière, semer une courge, récolter le lendemain, réparer la Tour (20 ▣ + 6 ⚡), atteindre Confiance 3.
- Fin : la Tour grésille.
  - ÉCHO-7 : « Fonction reconnue : intendant de continuité. Vous êtes en retard de 184 cycles. »
  - Solène : « En retard? On t'attendait même plus. T'es là, c'est ça qui compte. »

**Ch. 2, « Le rouge des érables »** (Milo, 12 jours au moins)
- Objectifs : réparer l'Atelier, construire l'établi (qui débloque les décors), découper un premier chantier.
- Premier Avis, **Premier gel**, joué en tutoriel : tunnel, réserve, jauge.
- On plante 3 érables : l'Atelier devient rouge dans un monde gris.
- Fin : une plaque « ARCHIVES · 3e ASSISE » et la voix de Naïma à la radio.

**Ch. 3, « Sous la troisième assise »** (Naïma)
- La Lueur Administratif accumulée depuis le jour 1 perce d'un coup.
- Objectifs : écrire et honorer un plan, finir une quête avant l'échéance, restaurer la Salle des registres, remettre ÉCHO-7 sous tension.
- Fragment : « Six registres incomplets. Note jointe : “Ne porte pas tout.” »
- Avis Grands vents.
- Fin : « Y a quelqu'un? Il fait froid en bas. »

**Arc long**
- Ch. 4, Première neige : arrivée de Lou.
- Ch. 5, Le chemin d'Ambroise : caisses d'échéance, pneus avant le 1er décembre.
- Ch. 6, La veillée : trêve des Fêtes.
- Ch. 7, Poudrerie : un Avis plus fort, qui pose au pire un seul voile. Les secteurs autonomes tiennent seuls.
- Ch. 8, L'Orée vivante : 4 secteurs autonomes sur 6 suffisent. ÉCHO-7 tutoie enfin : « Tu peux te reposer, Alex. On continue. »

**Règles d'écriture**
- Tutoiement en français québécois standard ; seul ÉCHO-7 vouvoie.
- Expressions bannies : « tu n'as pas », « manqué », « négligé ».
- Célébrations proportionnées à la longueur.
- Au moins 6 variantes par situation, sans répétition sur 7 jours.
- Glossaire fermé : Quête, Cote, Énergie, Matériaux, Confiance, Lueur, Fil libre, Secteur, Étape, Lot, Avis, Préparation, Voile, Lisière, Relais.

## 7. Direction visuelle et technique

**Rendu retenu : DOM/CSS + SVG isométrique** (spike dom-svg). PixiJS v8, copié dans le dépôt, sert de plan B derrière `world/renderer.js`.
- Le spike pèse 36,5 Ko compressé, sans dépendance, tient 60 i/s au repos avec le processeur ralenti ×4, et a la meilleure note d'accessibilité (8/10).
- L'île de 12×12 (secteurs autour du Bastion, couronne de brume) reste sous la limite d'environ 100 éléments animés.
- Le passage du gris à la couleur se fait **secteur par secteur** (`data-etat` et variables CSS), comme un événement ponctuel. Recolorer toute la scène coûtait 120 à 150 ms.
- three.js est plus beau, mais ne laisse que 23 px par case sur mobile et coûte cher en développement (4/10).
- **On passe à Pixi** si, sur un vrai Pixel 6a et un vrai iPhone, les animations tombent sous 45 i/s ou si recolorer un secteur dépasse 50 ms.

**Captures à montrer** (une sélection est dans `img/` ; les démos sont dans `sketches/007-spikes-rendu/`) :
- `dom-svg/shots/` : `v3-m-jour.png`, `v3-m-soir.png`, `v3-m-nuit.png`, `v3-m-quete-a.png`, `v3-m-quete-b.png`, `v3-m-build-b.png`, `v3-m-harvest-a.png`, `v3-m-reduit.png`, `v3-d-jour.png` ;
- pour comparer : `canvas-pixi/shots/m03-nuit.png`, `canvas-pixi/shots/m07-quete-vol.png`, `three-voxel/shots/final/m-jour.png`.

**Style**
- Low-poly en aplats à 3 tons, socle continu en strates, lisière de forêt boréale.
- Palette de 006. La cendre est en gris chauds mouchetés, la braise réservée aux menaces, le givre aux Avis.
- À 390×844, le monde occupe 70 % de la hauteur, avec un zoom sur le secteur actif et des cibles de 44 px.

**Architecture**
- **Chargement** (repris de E) : l'interface et la liste, moins de 60 Ko, sont utilisables en moins d'une seconde. Viennent ensuite une image de la scène, puis le monde.
- **`core/`** : logique pure testée par `node --test` (`migrate`, `cote`, `reward`, `ledger`, `time`, `economy`, `avis`, `anchors`, `chapters`, `sim`).
- **`world/`** : rendu incrémental, bus d'événements, une seule boucle d'animation, particules préparées d'avance, défilement natif. Aucun rendu au repos.
- **`content/fr-CA/`** : tous les textes en JSON.
- **`api.php`** :
  - chaque opération porte un identifiant (`opId`) : la rejouer ne double rien ;
  - verrou de fichier (`flock`), numéro de révision et ETag, écriture atomique ;
  - 14 sauvegardes.
- **Données** : `tasks.json` reste la référence ; `game-state.json` et `ledger.jsonl` sont séparés. L'agent familial passe par la même API.
- **PWA** avec file d'attente hors ligne. Connexion par code avant la mise en production.

**12 animations signature.** Toutes peuvent être sautées (150 ms) et ont un équivalent en mouvement réduit, annoncé aux lecteurs d'écran.
1. Fil de lumière, compteurs mis à jour à l'impact.
2. Germination à 34, 67 puis 100 %, puis vague de couleur.
3. La lisière s'allume.
4. L'objet-reflet reluit.
5. Construction : chute, écrasement, poussière.
6. Récolte au glissé.
7. Chantier dévoilé et plaque datée.
8. Côte à côte avec Fanal.
9. Le Front avance et la jauge se remplit.
10. Le matin de l'Avis, rejoué en 8 s.
11. La Lueur en réserve perce la cendre.
12. « L'Orée veille » : les lanternes s'allument.

## 8. MVP (3 semaines)

- **Semaine 1 : l'utile, sans le monde.**
  - `core/` complet, migration vérifiée champ par champ, `api.php`.
  - Quêtes au niveau de l'app actuelle : tris, filtres, recherche, création-modification-suppression, notes, étapes, récurrence, archiver, remballer.
  - Ajout avec inférence, Fil du jour, « Pourquoi? ».
  - **Utilisé sur les vraies tâches dès le jour 5.**
- **Semaine 2 : le monde.**
  - Île de 12×12 : Place, Champs et Atelier ouverts, 2 secteurs encore sous la cendre. Fil libre.
  - 14 modèles, Fanal et 2 personnages.
  - Animations 1 à 5, 11 et 12. Plan accessible.
  - Décision go ou no-go sur les vrais appareils.
- **Semaine 3 : le jeu.**
  - Intro de 60 s, chapitre 1, chapitre 2 jusqu'au Premier gel (animations 9 et 10).
  - Potager (animation 6), lettre du matin, Côte à côte (écran maintenu allumé désactivé par défaut).
  - Première version du Jour du recyclage, PWA de base.

**Critères de réussite**
- Les tests `node --test` passent :
  - terminer, réactiver puis terminer de nouveau rapporte 0 ;
  - le chapitre 1 ne se termine pas avant le jour 3 ;
  - aucune case n'est perdue ;
  - le profil Léger tient au moins 60 % des Avis.
- Aucun champ perdu sur la vraie copie des tâches.
- Quête n° 1 lisible en moins de 2 s ; ajout en 3 interactions au plus ; terminer en 2 touchers.
- Avec 40 quêtes dont 10 en retard, l'Orée reste accueillante, sans aucun rouge.
- Au moins 50 i/s sur Pixel 6a pendant le fil de lumière ; aucun rendu au repos.
- Une tâche ajoutée par l'agent apparaît en 30 s au plus.
- Sur 14 jours réels : ouvertures au moins 5 jours sur 7, ratio jeu/quêtes sous 10 %, et un Avis tenu jugé « mérité » par Alex.

## 9. Feuille de route

| Phase | Contenu | Taille |
|---|---|---|
| 1. Tranche jouable | MVP, simulateur à 3 profils, 2 semaines d'usage réel, réglages | M |
| 2. Hiver complet, par tranches de 2 semaines livrées avant les dates réelles | Ch. 3 à 5, Lou avant le 15 novembre, caisses avant le 1er décembre, 5 Avis, neige, Lots, Souhait du réel, plaques, Almanach, connexion par code | L |
| 3. Finale | Ch. 6 à 8, compteur d'habitants, son et notification facultatifs, Temps des sucres | M |

## 10. Questions ouvertes pour Alex

1. **La colonie de l'Orée, ou ta propre maison en maquette** (direction E) ? C'est la seule décision qui change tout ; je recommande la colonie.
2. **Avis de saison** : une menace qui avance chaque jour, ou un mode « Saison douce » activé par défaut ?
3. **Côte à côte** : l'écran reste allumé pendant que Fanal travaille avec toi, ou seulement un relevé du temps passé ?
4. **Domaines** : on regroupe Jardin et Ferme dans Terrain, et Professionnel dans Administratif ? Le domaine Enfants servira-t-il, alors qu'il est absent des données actuelles ?
5. **Notification** : un seul rappel quotidien facultatif ? À quelle heure ?
6. **Calendrier réel** : neige le 15 novembre, trêve des Fêtes. Ça te convient, sachant que le premier Avis tombera vers la mi-novembre ?

**Réponses d'Alex, 5 octobre 2026**
1. La colonie de l'Orée.
2. Avis actifs (pas de « Saison douce » par défaut).
3. À trancher en semaine 3.
4. Domaines regroupés : Jardin et Ferme dans Terrain, Professionnel dans Administratif.
5. À trancher en semaine 3.
6. Calendrier réel.

Aussi décidé : la progression du jeu est sauvegardée sur le serveur ; le site reste ouvert pour l'instant, la protection se choisit avant la mise en ligne ; on construit cette direction avant tout déploiement. Plan : `tasks/todo.md`.

---
Simulation : `simulations/recommandation-3-semaines.mjs` (données : `simulations/taches-006.json`).