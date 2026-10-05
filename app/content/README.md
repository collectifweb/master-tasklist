# Textes du jeu (`app/content/`)

Tout le texte visible de « La lisière rallumée » vit ici, en JSON UTF-8, avec un dossier par langue (`fr-CA/`). Le code n'écrit aucune phrase lui-même : il choisit un texte, remplit ses gabarits et l'affiche.

| Fichier | Contenu |
|---|---|
| `fr-CA/repliques.json` | Les voix des personnages et leurs répliques, classées par situation |
| `fr-CA/lettres.json` | Les lettres de Fanal : matin, matin sans quête, retour |
| `fr-CA/chapitres.json` | L'introduction, les chapitres 1 et 2 et l'Avis « Premier gel » |
| `fr-CA/interface.json` | Les petits textes d'interface (boutons, tris, états, confirmations…) |
| `fr-CA/batiments.json` | Les bâtiments du village : noms, fiches à trois lignes (ce que c'est, ce que ça fait, maintenant), états et annonces. Lus sous `bat.<groupe>.<clé>` ; les raisons de refus viennent de `core/batiments.js` |
| `fr-CA/ancres.json` | Les objets-ancres et mots-clés qui servent à deviner le domaine. Tenu à part, voir le fichier lui-même |

Vérifier un fichier après modification : `python3 -m json.tool app/content/fr-CA/repliques.json > /dev/null`.

## Conventions communes

- Typographie OQLF : apostrophe courbe (’). Espace insécable (U+00A0) avant le deux-points et à l'intérieur des guillemets « ». Pas d'espace avant `?`, `!` et `;`. Points de suspension en un seul caractère (…). Aucun tiret cadratin.
- Les `id` de variantes, de lettres et d'objectifs, comme les clés d'interface, ne changent jamais. On ne renumérote pas : une variante retirée laisse son numéro libre, une nouvelle prend le suivant.
- Les secteurs reprennent les identifiants de `ancres.json` : `place` (Place du Bastion), `champs`, `atelier`, `archives`, `maison-commune`, `relais` (Relais du convoi).
- Voix : `fanal`, `solene`, `milo`, `naima`, `echo7`, `lou`, `ambroise`, plus deux voix réservées aux scènes : `narration` (texte hors champ) et `inscription` (texte gravé, affiché comme une plaque). Les noms affichés sont dans `repliques.json > voix`.

## Gabarits

Un gabarit s'écrit `{nom}`. Le code le remplace avant l'affichage.

| Gabarit | Valeur |
|---|---|
| `{prenom}` | Prénom du joueur, tiré des réglages (facultatif ; sans prénom, une réplique qui l'emploie est écartée, et dans une scène ou une lettre « , {prenom} » et « {prenom}, » disparaissent) |
| `{quete}` | Titre de la quête, tel quel, jamais habillé |
| `{secteur}` | Nom du secteur avec son article, `sector.<id>.the` (« les Champs », « l’Atelier ») |
| `{Secteur}` | La même chose avec une majuscule initiale (« Les Champs ») |
| `{du_secteur}` | `sector.<id>.of` (« des Champs », « de l’Atelier ») |
| `{au_secteur}` | Forme de lieu, `sector.<id>.in` (« aux Champs », « sur la Place du Bastion ») |
| `{echeance}` | Échéance relative en minuscules, `deadline.phrase.*` (« demain », « dans 3 jours ») |
| `{jour}` | Jour où frappe un Avis, en minuscules (« samedi », « le 19 octobre ») |
| `{cout}` | Coût lisible, tiré des données de jeu (« 20 Matériaux et 6 Énergie ») |
| `{n}`, `{p}`, `{l}`, `{d}`, `{points}`, `{cote}`, `{duree}`, `{pourcent}`… | Nombres et valeurs de l'interface, nommés dans chaque clé |

Trois règles :

1. Un texte dont un gabarit ne peut pas être rempli est écarté du tirage. Exemple : une lettre de retour qui contient `{quete}` quand aucune quête n'est ouverte. Une accolade ne s'affiche jamais.
2. Pas d'accord avec `{secteur}` : le genre et le nombre changent d'un secteur à l'autre (« les Archives », « l’Atelier »). Les textes passent donc par `{au_secteur}`, `{du_secteur}` ou une apposition, jamais par « {Secteur} est réparé ».
3. Pluriels : les clés qui varient se dédoublent en `.one` et `.other`. Le code choisit avec `new Intl.PluralRules('fr-CA').select(n)` : `one` vaut pour 0 et 1, et `many` se ramène à `other`.

## `repliques.json`

```json
{
  "version": 1,
  "voix": {
    "fanal": { "nom": "Fanal", "role": "…", "arrivee": 1, "registre": "tu", "motsMax": 20 }
  },
  "situations": {
    "quest.done.short": {
      "quand": "Déclencheur, en clair",
      "frequence": 3,
      "variantes": [
        { "id": "quest.done.short.01", "voix": "fanal", "texte": "Fait." },
        { "id": "quest.done.short.08", "voix": "solene", "secteur": "champs", "texte": "…" }
      ]
    }
  }
}
```

- `arrivee` : chapitre à partir duquel la voix parle dans les répliques (Milo 2, Naïma et ÉCHO-7 3, Lou 4, Ambroise 5). Les scènes de `chapitres.json` ne filtrent pas les voix : Milo et Naïma peuvent y parler par radio avant leur arrivée.
- `registre` : `vous` pour ÉCHO-7. Il tutoie seulement au chapitre 8 ; ses répliques au « tu » s'écriront avec ce chapitre.
- `frequence` : `1`, la situation parle chaque fois. `3`, elle parle à sa première occurrence du jour, puis une fois sur trois (1re, 4e, 7e…).
- Filtres facultatifs d'une variante : `secteur` (le secteur de la quête ou celui qui franchit un palier), `longueurMin` (Durée de la quête au moins égale), `moment` (`matin` de 4 h à 11 h 59, `soir` de 18 h à 3 h 59, heure de Montréal). Une variante sans filtre convient partout.
- Les répliques commentent le domaine, jamais le titre de la quête. La mécanique (chiffres, coûts) va dans les puces de l'interface, pas dans la bouche des personnages.

| Situation | Déclencheur |
|---|---|
| `day.first_quest` | Première quête du jour de jeu : la lisière s'allume |
| `quest.done.short` / `.medium` / `.big` | Quête terminée, Durée 1 à 3 / 4 et 5 / 6 et plus (grand chantier) |
| `quest.already_done` | Quête ajoutée déjà faite |
| `step.done` | Étape cochée |
| `quest.start` | « Je m'y mets ». Fanal fait la corvée miroir du secteur |
| `quest.undo` | « Remballer » dans les 24 h |
| `deadline.soon` | Une fois par quête, quand l'échéance passe à 7 jours ou moins |
| `deadline.passed` | Une fois par quête, à la première visite après la date |
| `sector.repair` / `.thrive` / `.autonomous` | Un secteur franchit Réparer (150 Lueur), Prospérer (400) ou Autonome (750) |
| `fil_libre.directed` | Lueur du Fil libre envoyée vers un secteur |
| `return.after_absence` | Première ouverture après 3 jours ou plus sans visite |
| `visit.end` | Écran « L'Orée veille » |
| `list.empty` | Aucune quête à faire ni en cours |
| `list.all_done` | Plus aucune quête ouverte, au moins une terminée |

**Une seule réplique par action.** Quand plusieurs situations s'appliquent au même geste, la première de cette liste l'emporte : `sector.autonomous`, `sector.thrive`, `sector.repair`, `day.first_quest`, `quest.done.big`, `quest.already_done`, puis `quest.done.medium` ou `quest.done.short`. Si le geste remplit aussi un objectif de chapitre, la réplique `atteint` de l'objectif passe avant tout le reste.

## Tirage sans répétition sur 7 jours

La même règle vaut pour chaque situation de `repliques.json` et pour chaque groupe de `lettres.json`.

1. Candidates : les variantes dont la voix est arrivée, dont les filtres correspondent, dont les gabarits peuvent être remplis et, pour une lettre, dont la période correspond.
2. Retirer celles tirées pendant les 7 derniers jours de jeu, jour courant compris (du jour J − 6 au jour J). Le jour de jeu va de 4 h à 3 h 59, heure de Montréal (`core/time.js`).
3. Si rien ne reste, reprendre parmi les candidates celle dont le dernier tirage est le plus ancien.
4. Choisir par un tirage déterministe : `hash(situation + jourDeJeu + rang du tirage dans la journée) % nombre de candidates`. Les tests restent reproductibles et un rechargement de page ne change pas la réplique.
5. Noter `id → jourDeJeu` dans l'état du jeu, sur le serveur. La dernière date par `id` suffit.

Chaque situation compte au moins 6 variantes sans filtre utilisables dès le chapitre 1. Le repli de l'étape 3 ne sert donc que les jours très chargés.

## `lettres.json`

```json
{
  "version": 1,
  "signature": "fanal",
  "matin": [ { "id": "matin.01", "texte": ["Bon matin.", "… « {quete} »."], "periode": "automne" } ],
  "matinSansQuete": [ { "id": "matin_sans_quete.01", "texte": ["…"] } ],
  "retour": [ { "id": "retour.01", "texte": ["…"] } ]
}
```

- `texte` : un paragraphe par élément. Le premier est la salutation. La lettre est signée par la voix de `signature`.
- `matin` : à la première ouverture du jour de jeu. Contient toujours `{quete}`, la quête n° 1 du Fil du jour. Sans quête ouverte, on tire dans `matinSansQuete`.
- `retour` : à la première ouverture après 3 jours ou plus sans visite, à la place de la lettre du matin. Elle suit le rythme de son bonus (+10 Énergie, une fois par 14 jours au plus). Entre deux, la lettre du matin reprend, mais la réplique `return.after_absence` joue à chaque retour.
- `periode` (facultatif) : `automne` jusqu'au 14 novembre, `neige` à partir du 15 novembre. Sans `periode`, la lettre convient toute la saison.
- La lettre du matin est un rituel : elle ne compte pas dans les 3 moments d'histoire du jour.

## `chapitres.json`

```json
{
  "version": 1,
  "introduction": { "id": "introduction", "declencheur": { "type": "premier_lancement" }, "passable": true, "suite": "…", "lignes": [] },
  "chapitres": [
    {
      "numero": 1, "id": "premier-sillon", "titre": "Le premier sillon",
      "voix": "solene", "secteur": "champs", "confianceMin": 0, "dureeMinJours": 3,
      "ouvreSecteur": "atelier",
      "ouverture": { "declencheur": {}, "note": "…", "lignes": [] },
      "objectifs": [ { "id": "ch1.semis", "texte": "…", "detail": "…", "condition": {}, "annonce": [], "atteint": [] } ],
      "avis": { "id": "premier_gel", "nom": "…", "tutoriel": true, "annonce": [], "tenu": [], "voile": [], "absent": [] },
      "beats": [ { "id": "ch1.beat.jour2", "declencheur": { "type": "jour_du_chapitre", "jour": 2 }, "lignes": [] } ],
      "fin": { "declencheur": { "type": "objectifs_tous_atteints" }, "lignes": [] },
      "recompense": { "confiance": 2 },
      "suivant": { "numero": 3, "titre": "…", "confianceMin": 9 }
    }
  ]
}
```

Une **ligne** de scène vaut `{ "voix", "texte", "si"? }`. Avec `si`, elle ne s'affiche que si la condition est vraie. Deux lignes aux conditions opposées forment une alternative. Champs facultatifs : `ouvreSecteur`, `avis`, `beats`, `suivant`, et `annonce` ou `atteint` d'un objectif.

**Rythme**

- Le jour du chapitre vaut 1 le jour de l'ouverture, puis augmente de 1 à chaque jour de jeu.
- La fin se joue quand tous les objectifs sont atteints **et** que le jour du chapitre est au moins égal à `dureeMinJours`. Le chapitre 1 ne finit pas avant son 3e jour, le chapitre 2 pas avant son 12e.
- Le chapitre suivant s'ouvre quand le précédent est fini et que la Confiance atteint son `confianceMin`.
- Les objectifs s'affichent dans l'ordre ; le premier non atteint porte l'étiquette « Maintenant ». Ils peuvent se remplir dans n'importe quel ordre.
- `annonce` joue quand l'objectif devient « Maintenant », et se saute s'il est déjà atteint. `atteint` joue au moment où la condition devient vraie.
- **Au plus 3 moments d'histoire par jour.** Tous comptent : l'introduction, les ouvertures, les beats, les fins, les scènes d'Avis, et aussi les `annonce` et `atteint` des objectifs ; un moment en trop attend le lendemain.
- Chaque scène se lit en 60 s au plus et se passe d'un toucher.
- L'Avis : `annonce` quand il est annoncé (5 à 9 jours d'avance), puis une seule des trois scènes le matin suivant : `tenu`, `voile`, ou `absent` (aucun voile ne tombe pendant une absence de 48 h ou plus).

**Déclencheurs** : `premier_lancement`, `objectif_atteint` (`objectif`), `chapitre_termine` (`chapitre`), `objectifs_tous_atteints`, `jour_du_chapitre` (`jour`).

**Conditions**

| `type` | Champs | Vraie quand |
|---|---|---|
| `confiance` | `min` | La Confiance totale atteint `min` |
| `lisiere` | `min` | La lisière s'est allumée au moins `min` jours depuis l'ouverture du chapitre |
| `quetes` | `min`, `secteur`? | Quêtes terminées depuis l'ouverture, déjà faites comprises, dans ce secteur si précisé |
| `etape` | `min`, `longueurMin`? | Étapes cochées depuis l'ouverture, sur une quête de Durée au moins `longueurMin` |
| `semis` | `culture`, `min` ou `max` | Semis faits depuis l'ouverture |
| `recolte` | `culture`, `min` | Récoltes faites depuis l'ouverture |
| `batiment` | `id`, `etat` (`repare` ou `construit`) | Le bâtiment est dans cet état |
| `decor` | `id`, `min` | Nombre de ces décors posés |
| `reserve` | `min` | Courges dans la Réserve d'hiver |
| `secteur_palier` | `secteur`, `palier` (`reparer`, `prosperer`, `autonome`) | Le secteur a franchi ce palier |
| `avis` | `id` | L'Avis a eu lieu : tenu, voilé ou passé pendant une absence |
| `lueur_en_reserve` | `secteur`, `min` ou `max` | Lueur gardée sous la cendre du secteur au moment où il s'ouvre |
| `un_parmi` | `conditions` | Au moins une des conditions est vraie |

Les bornes `min` et `max` sont incluses. Les conditions d'état (`confiance`, `batiment`, `decor`, `reserve`, `secteur_palier`) sont vraies dès que l'état les remplit, même si c'est arrivé avant le chapitre. Les compteurs (`lisiere`, `quetes`, `etape`, `semis`, `recolte`) partent de l'ouverture du chapitre.

Identifiants de jeu à reprendre tels quels dans les données : bâtiments `tour`, `etabli`, `tunnel` ; décor `erable` ; culture `courge` ; Avis `premier_gel`.

## `interface.json`

Un objet plat `clé → texte`. Les clés sont stables, en anglais minuscule avec des points, et regroupées par préfixe. Seule exception : le segment d'identifiant de secteur reprend celui d'`ancres.json` (`sector.maison-commune.name`).

| Préfixe | Usage |
|---|---|
| `app`, `nav` | Nom du produit, onglets |
| `today`, `card` | Fil du jour et ses trois cartes |
| `quest`, `step`, `field`, `recurrence`, `status` | Boutons, formulaire et statuts d'une quête |
| `sort`, `filter`, `search` | Les 7 tris (Cote, Priorité, Durée, Effort, Échéance, Ancienneté, Domaine) et les filtres |
| `why` | Gabarits du « Pourquoi? », une ligne par composante de la Cote |
| `duration`, `deadline` | Durée estimée ; échéance en pastille (`deadline.label.*`, majuscule) ou dans une phrase (`deadline.phrase.*`) |
| `resource`, `gain` | Noms et aides des ressources, gains affichés |
| `sr`, `a11y` | Annonces pour lecteurs d'écran (région `aria-live`) et libellés d'accessibilité |
| `state` | Chargement, vide, hors ligne, synchronisation, conflit, erreurs |
| `confirm` | Confirmations (suppression, remballage) |
| `visit`, `letter`, `plan`, `chapter`, `scene`, `intro`, `avis`, `voile` | Écrans de jeu |
| `sector` | Formes de chaque nom de secteur (`name`, `the`, `of`, `in`), domaine regroupé, paliers |

Durée correspond au champ `length` d'une tâche, Effort au champ `difficulty`.

## Règles d'écriture

- Français québécois standard et tutoiement. Seul ÉCHO-7 vouvoie, jusqu'au chapitre 8.
- Jamais « tu n'as pas », « manqué », « négligé », ni rien qui culpabilise. Une échéance passée n'est ni rouge ni un échec. « En retard » n'apparaît qu'une fois, dans la bouche d'ÉCHO-7 à la fin du chapitre 1, et Solène le recadre aussitôt.
- Glossaire fermé : Quête, Cote, Énergie, Matériaux, Confiance, Lueur, Fil libre, Secteur, Étape, Lot, Avis, Préparation, Voile, Lisière, Relais. Jamais « Réputation ».
- Fanal parle en 20 mots au plus par réplique (par phrase dans ses lettres) et n'est jamais triste. Une réplique tient en 110 caractères.
- La célébration suit la taille de la quête : un mot pour une petite, une phrase pour une moyenne, une scène et une plaque pour un grand chantier.
- Aucune donnée réelle : ni vraie tâche, ni prénom de proche, ni lieu identifiable.
- Le thème est « Ne porte pas tout » : le jeu aide à démarrer et célèbre sans en faire trop.
