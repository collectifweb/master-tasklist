# Textes du jeu (`app/content/`)

Tout le texte visible de « La lisière rallumée » vit ici, en JSON UTF-8, avec un dossier par langue (`fr-CA/`). Le code n'écrit aucune phrase lui-même : il choisit un texte, remplit ses gabarits et l'affiche.

| Fichier | Contenu |
|---|---|
| `fr-CA/repliques.json` | La voix de Fanal et ses répliques, classées par situation |
| `fr-CA/lettres.json` | Les lettres de Fanal : matin, matin sans quête, retour, passage à la v2, conversion des niveaux en permis |
| `fr-CA/interface.json` | Les petits textes d'interface (boutons, tris, états, confirmations…) |
| `fr-CA/batiments.json` | Les bâtiments du village : noms, fiches à trois lignes (ce que c'est, ce que ça fait, maintenant), états, annonces et textes du catalogue « Construire ». Lus sous `bat.<groupe>.<clé>` ; les raisons de refus viennent de `core/batiments.js` |
| `fr-CA/ancres.json` | Les objets-ancres et mots-clés qui servent à deviner le domaine. Tenu à part, voir le fichier lui-même |

Vérifier un fichier après modification : `python3 -m json.tool app/content/fr-CA/repliques.json > /dev/null`.

## Conventions communes

- Typographie OQLF : apostrophe courbe (’). Espace insécable (U+00A0) avant le deux-points et à l'intérieur des guillemets « ». Pas d'espace avant `?`, `!` et `;`. Points de suspension en un seul caractère (…). Aucun tiret cadratin. Le test `app/tests/core/typographie.test.mjs` vérifie ce qui se contrôle par machine dans les chaînes de `app/core/`, de `app/js/` et dans tous les fichiers de `fr-CA/` : une espace ordinaire avant le deux-points ou avant un guillemet fermant, une espace ordinaire après un guillemet ouvrant, et toute espace avant `;`, `?` et `!`. Il ne balaie ni `app/world/` ni les documents.
- Les `id` de variantes, de lettres et d'objectifs, comme les clés d'interface, ne changent jamais. On ne renumérote pas : une variante retirée laisse son numéro libre, une nouvelle prend le suivant.
- Les quartiers reprennent les identifiants de `ancres.json` : `place` (Place du village), `champs`, `atelier`, `mairie`, `ecole`, `garage`.
- Voix : `fanal`, la seule. Le code ne lit que son `nom` (dans `repliques.json > voix`) ; `role`, `registre` et `motsMax` sont des notes d'écriture.

## Gabarits

Un gabarit s'écrit `{nom}`. Le code le remplace avant l'affichage.

| Gabarit | Valeur |
|---|---|
| `{prenom}` | Prénom du joueur, tiré des réglages (facultatif ; sans prénom, une réplique qui l'emploie est écartée, et dans une lettre « , {prenom} » et « {prenom}, » disparaissent) |
| `{quete}` | Titre de la quête, tel quel, jamais habillé |
| `{quartier}` | Nom du quartier avec son article, `quartier.<id>.the` (« les Champs », « l’Atelier ») |
| `{Quartier}` | La même chose avec une majuscule initiale (« Les Champs ») |
| `{du_quartier}` | `quartier.<id>.of` (« des Champs », « de l’Atelier ») |
| `{au_quartier}` | Forme de lieu, `quartier.<id>.in` (« aux Champs », « sur la Place du village ») |
| `{cout}` | Coût lisible, tiré des données de jeu (« 20 Matériaux et 6 Énergie ») |
| `{rang}` | Nom du nouveau rang du village (« Hameau »), pour `permis.rang` seulement ; hors d'un changement de rang, il n'est pas rempli et la variante est écartée |
| `{n}`, `{p}`, `{l}`, `{d}`, `{points}`, `{cote}`, `{duree}`… | Nombres et valeurs de l'interface, nommés dans chaque clé |
| `{n}`, `{jours}` (`help.materiaux.source`), `{parPermis}` (`help.permis.source`) | Valeurs lues dans le code au moment d'afficher, jamais écrites dans le texte : `{n}` = les Matériaux de la semaine tenue (`SEMAINE_TENUE.materials`), `{jours}` = les jours travaillés qu'elle demande (`SEMAINE_TENUE.jours`), `{parPermis}` = les jours travaillés pour un permis (`JOURS_PAR_PERMIS`). Si le réglage change dans le code, le texte suit |

Dans les textes `monde.*` d'`interface.json`, `{secteur}`, `{du_secteur}` et `{au_secteur}` gardent leur ancien nom mais reçoivent les formes d'un quartier (`the`, `of`, `in`). Les textes des bâtiments (`bat.<groupe>.<clé>`) viennent de `batiments.json`, pas d'`interface.json`.

Trois règles :

1. Un texte dont un gabarit ne peut pas être rempli est écarté du tirage. Exemple : une lettre de retour qui contient `{quete}` quand aucune quête n'est ouverte. Une accolade ne s'affiche jamais.
2. Pas d'accord avec `{quartier}` : le genre et le nombre changent d'un quartier à l'autre (« la Mairie », « l’Atelier »). Les textes passent donc par `{au_quartier}`, `{du_quartier}` ou une apposition, jamais par « {Quartier} est réparé ».
3. Pluriels : les clés qui varient se dédoublent en `.one` et `.other`. Le code choisit avec `new Intl.PluralRules('fr-CA').select(n)` : `one` vaut pour 0 et 1, et `many` se ramène à `other`.

## `repliques.json`

```json
{
  "version": 1,
  "voix": {
    "fanal": { "nom": "Fanal", "role": "…", "registre": "tu", "motsMax": 20 }
  },
  "situations": {
    "quest.done.short": {
      "quand": "Déclencheur, en clair",
      "frequence": 3,
      "variantes": [
        { "id": "quest.done.short.01", "voix": "fanal", "texte": "Fait." },
        { "id": "quest.done.short.07", "voix": "fanal", "quartier": "champs", "texte": "…" }
      ]
    }
  }
}
```

- Les situations disent leur déclencheur dans `quand`. Les voix de la v1 (Solène, Milo, Naïma, ÉCHO-7, Lou, Ambroise) n'existent plus : Fanal parle seul.
- `frequence` : `1`, la situation parle chaque fois. `3`, elle parle à sa première occurrence du jour, puis une fois sur trois (1re, 4e, 7e…).
- Filtres facultatifs d'une variante : `quartier` (le quartier de la quête), `longueurMin` (Durée de la quête au moins égale), `moment` (`matin` de 4 h à 11 h 59, `soir` de 18 h à 3 h 59, heure de Montréal). Une variante sans filtre convient partout.
- Les répliques commentent le domaine, pas le titre de la quête (une seule variante, `quest.done.big.02`, le cite). La mécanique (chiffres, coûts) va dans les puces de l'interface, pas dans la bouche des personnages.

| Situation | Déclencheur |
|---|---|
| `quest.done.short` / `.medium` / `.big` | Quête terminée, Durée 1 à 3 / 4 et 5 / 6 et plus (grand chantier) |
| `quest.already_done` | Quête ajoutée déjà faite, ou terminée moins de 10 minutes après sa création |
| `step.done` | Étape cochée |
| `quest.undo` | « Remballer » dans les 24 h |
| `deadline.soon` | Une fois par quête, quand l'échéance passe à 7 jours ou moins |
| `deadline.passed` | Une fois par quête, à la première visite après la date |
| `permis.gagne` | Un permis tombe après quatre jours travaillés, avec la quête payée qui le donne (quête terminée ou ajoutée déjà faite) |
| `permis.rang` | Une famille fait passer le village à un nouveau rang, qui donne un permis (geste « Accueillir une famille ») |
| `semaine.tenue` | La semaine tenue est payée, avec la quête payée qui la déclenche (quête terminée ou ajoutée déjà faite). Ne dit jamais un nombre de jours et ne parle jamais de série |
| `quartier.monte` | Un quartier monte au niveau 1 (permis placés, travaux payés). Une variante par quartier ; rien aux niveaux 2 et 3 |
| `batiment.construit` | Un bâtiment vient d'être bâti, rebâti ou réparé |
| `marchand.arrive` | Le marchand est au quai : dit une fois par semaine et par appareil, à l'ouverture (après l'accueil, la lettre et le bilan, et après une réplique en cours), ou quand le quai vient d'être rebâti, à la place de `batiment.construit` (lot V) |
| `imprevu.aurore` / `.peche` / `.trouvaille` / `.orignal` | Un bon imprévu arrive (lot I) : dit une fois par appareil, à l'ouverture où il arrive (après l'accueil, la lettre, le bilan et le mot du marchand, et après une réplique en cours), ou quand il arrive au premier passage du temps après une quête |
| `imprevu.panne` / `.ours` / `.gel` | Un mauvais imprévu frappe (lot I), même moment. Rassure, ne chiffre rien : le prix et les jours sont dans la phrase lue et la fiche |
| `imprevu.regle` | Un dégât est réglé : en payant (geste « Réparer », « Chasser l'ours », « Couvrir la culture »), ou par la quête payée du bon domaine, après `semaine.tenue` |
| `famille.arrive` | Une famille s'installe dans un chalet (geste « Accueillir une famille ») |
| `return.after_absence` | Première ouverture après 3 jours ou plus sans visite, le jour où le bonus de retour est versé (au plus une fois par 14 jours) |
| `visit.end` | Écran « Tout est enregistré, à demain » |
| `list.empty` | Aucune quête dans la liste |
| `list.all_done` | Plus aucune quête ouverte, au moins une terminée |

Pas encore jouées par le code : `deadline.soon`, `deadline.passed`, `list.empty` et `list.all_done`. Leurs textes existent, aucun geste ne les déclenche pour l'instant.

**Un seul imprévu raconté par ouverture** : le dernier inscrit au registre ce jour-là (le mauvais, quand un bon manqué arrive le même jour). La clé de l'imprévu raconté est gardée sur l'appareil (`oree.imprevu.v1`) : un rechargement ne le répète pas, un autre appareil le raconte à son tour.

**Une seule réplique par action.** Quand plusieurs situations s'appliquent au même geste, la première de cette liste l'emporte : `permis.gagne`, `semaine.tenue`, `imprevu.regle`, `quest.done.big`, `quest.already_done`, puis `quest.done.medium` ou `quest.done.short`. La semaine tenue passe donc après le permis des jours : un seul mot de Fanal par geste, et le bonus reste annoncé à l'écran. À « Accueillir une famille », `permis.rang` prend la place de `famille.arrive` quand un nouveau rang donne un permis. Le permis de l'objectif de saison n'a pas de réplique. Une quête déjà récompensée ne joue aucune de ces situations.

## Tirage sans répétition sur 7 jours

La même règle vaut pour chaque situation de `repliques.json` et pour chaque groupe de `lettres.json`.

1. Candidates : les variantes dont les filtres correspondent, dont les gabarits peuvent être remplis et, pour une lettre, dont la période correspond.
2. Retirer celles tirées pendant les 7 derniers jours de jeu, jour courant compris (du jour J − 6 au jour J). Le jour de jeu va de 4 h à 3 h 59, heure de Montréal (`core/time.js`).
3. Si rien ne reste, reprendre parmi les candidates celle dont le dernier tirage est le plus ancien.
4. Choisir par un tirage déterministe : `hash(situation + jourDeJeu + rang du tirage dans la journée) % nombre de candidates`. Les tests restent reproductibles et un rechargement de page ne change pas la réplique. Pour une lettre, le tirage ne dépend que du jour de jeu.
5. Noter `id → jourDeJeu` : pour les répliques, dans le `localStorage` de l'appareil (`oree.replies.v1`, avec le rang du tirage de la journée) ; pour les lettres, dans l'état du jeu sur le serveur (`game.letters`). La dernière date par `id` suffit.

**Jamais deux fois de suite la même variante** (répliques seulement, lot R2). Avant le tirage de l'étape 4, si la dernière variante dite pour cette situation est encore parmi les candidates retenues et qu'il en reste au moins une autre, on la retire : même passé 7 jours, une situation qui revient chaque semaine (`semaine.tenue`) ne répète pas son dernier mot. L'identifiant de la dernière variante dite est gardé par situation, dans le même `oree.replies.v1`, sous la clé `>situation` (`js/content.js`). S'il n'y a qu'une seule variante candidate, elle joue : la règle ne bloque jamais une réplique.

Chaque situation compte au moins 4 variantes sans filtre, de 4 à 6 (comptées le 6 octobre 2026, après le lot R2) ; `batiment.construit`, `famille.arrive`, `list.empty` et `semaine.tenue` en ont 4, `permis.gagne` et `permis.rang` en ont 5 depuis le lot R2, `marchand.arrive` aussi (lot V), et les huit situations `imprevu.*` (lot I, relues le 7 octobre 2026 : au plus 17 mots et 86 caractères, aucun chiffre, aucun reproche). Seule exception : `quartier.monte` a six variantes, mais toutes filtrées par `quartier`, aucune sans filtre, et chacune ne joue qu'au niveau 1 de son quartier.

## `lettres.json`

```json
{
  "version": 1,
  "signature": "fanal",
  "matin": [ { "id": "matin.01", "texte": ["Bon matin.", "… « {quete} »."], "periode": "automne" } ],
  "matinSansQuete": [ { "id": "matin_sans_quete.01", "texte": ["…"] } ],
  "retour": [ { "id": "retour.01", "texte": ["…"] } ],
  "passage": [ { "id": "passage.v2", "texte": ["…"] } ],
  "conversion": [ { "id": "conversion.permis", "zero": ["…"], "one": ["…"], "other": ["… {n} …"] } ]
}
```

- `texte` : un paragraphe par élément. Le premier est la salutation. La lettre est signée par la voix de `signature`.
- `matin` : à la première ouverture du jour de jeu. Contient toujours `{quete}`, la quête n° 1 du Fil du jour. Sans quête ouverte, on tire dans `matinSansQuete`. Jamais le jour où la partie commence.
- `retour` : à la première ouverture après 3 jours ou plus sans visite, à la place de la lettre du matin, le jour où le bonus de retour est versé (+10 Énergie, au plus une fois par 14 jours). Une absence de 3 jours ou plus qui tombe moins de 14 jours après le dernier bonus n'a ni lettre de retour ni réplique `return.after_absence` : la lettre du matin continue.
- `periode` (facultatif) : `automne` de septembre au 14 novembre, `neige` du 15 novembre au 30 avril. Sans `periode`, la lettre convient toute l'année ; de mai à août, seules ces lettres jouent.
- `passage` : la lettre de passage à la v2 (`passage.v2`), montrée une seule fois à une partie convertie depuis la v1 (`game.migratedAt`), jamais à une partie neuve. Elle prend la place de la lettre du matin ce jour-là. Si les écrans d'accueil viennent d'être montrés, elle attend la visite suivante.
- `conversion` : la lettre de conversion des niveaux en permis (`conversion.permis`), montrée une seule fois à une partie v2 d'avant les permis, c'est-à-dire qui porte `game.permis.cadeau` (le nombre d'anciens niveaux devenus des permis). Le texte a trois formes selon ce nombre : `zero`, `one` ou `other` (`{n}` = le nombre). Elle prend la place de la lettre du matin ce jour-là et, comme la lettre de passage, attend la visite suivante si les écrans d'accueil viennent d'être montrés. Une partie convertie depuis la v1 n'en reçoit pas : la lettre de passage lui parle des permis.

## `interface.json`

Un objet plat `clé → texte`. Les clés sont stables, en anglais minuscule avec des points, et regroupées par préfixe. Seule exception : le segment d'identifiant de quartier reprend celui d'`ancres.json` (`quartier.mairie.name`).

| Préfixe | Usage |
|---|---|
| `app`, `nav` | Nom du produit, onglets |
| `today`, `fil`, `card` | Fil du jour, son état vide et ses trois cartes |
| `quest`, `step`, `field`, `recurrence`, `status` | Boutons, formulaire et statuts d'une quête |
| `sort`, `filter`, `search` | Les 7 tris (Cote, Priorité, Échéance, Courtes d'abord, Faciles d'abord, Plus anciennes, Plus récentes) et les filtres |
| `why` | Gabarits du « Pourquoi? », une ligne par composante de la Cote |
| `duration`, `deadline` | Durée estimée ; échéance en pastille (`deadline.label.*`, majuscule) ou dans une phrase (`deadline.phrase.*`) |
| `resource`, `gain` | Noms des ressources et du Permis (`resource.permis`, cinquième puce de la barre), gains affichés (dont `gain.permis`, « +1 permis », lu aux lecteurs d'écran ; à l'écran, l'annonce montre « +1 » et le pictogramme) |
| `sr`, `a11y` | Annonces pour lecteurs d'écran (région `aria-live`), dont `sr.semaine` (la semaine tenue : Matériaux de plus), et libellés d'accessibilité |
| `announce` | Fin de l'annonce de gain à l'écran : « Déjà comptée », « Remballée », « → Champs » (`announce.quartier_to`) et « Semaine tenue » (`announce.semaine`, qui remplace le quartier ce jour-là) |
| `state` | Chargement, vide, hors ligne, synchronisation, conflit, erreurs |
| `confirm` | Confirmations (suppression, remballage) |
| `visit`, `letter`, `plan`, `review` | Écrans de jeu : fin de visite, lettre du matin, plan de la journée et carte en liste, bilan de la semaine et semaines passées (dont `review.tenue`, la ligne « Semaine tenue : +{n} Matériaux », écrite seulement pour une semaine qui l'a payée) |
| `quartier` | Formes de chaque nom de quartier (`name`, `the`, `of`, `in`) et domaine regroupé (`domain`) ; la fiche d'un quartier : `fiche` (lignes, boutons, raisons), `effet` (une phrase par réglage que les niveaux changent), `cout`, `permis` et `prochain` (permis en main, jours travaillés qui manquent pour le prochain), `sr` (phrase lue après l'achat) ; `catalogue` (section « Quartiers » du catalogue « Construire ») |
| `accueil`, `pas`, `bandeau`, `saison` | Les trois écrans d'accueil, les cinq premiers pas (`pas.<id>.nom`, `pas.geste.*`), le bandeau d'objectifs, les saisons |
| `monde` | La carte : région, commandes (Construire, Quêtes, Vue, Rapprocher, Éloigner, Toute l'île, Carte en liste), plaques de quartier (`monde.niveau.court`, « niv. 2 »), noms des objets, carte en liste (quêtes à faire par quartier : `monde.quetes.*` ; bouton « Ouvrir la fiche » : `monde.plan.open*`) |
| `help`, `res` | Aide des cinq puces de la barre (Énergie, Matériaux, Nourriture, Habitants, Permis : `help.permis.*`) : ce que c'est, d'où ça vient, à quoi ça sert. La phrase « d'où ça vient » des Matériaux dit la semaine tenue, celle du Permis le nombre de jours par permis (gabarits, voir plus haut) |
| `essai` | Version d'essai : texte du décalage de date et bouton « Jour suivant » |
| `migration`, `token`, `settings` | Messages du passage à la v2 (gestes de la v1 écartés de la file), code d'accès, réglages (prénom ; « Quête par défaut » : `settings.quete`, `settings.quete.hint`, `settings.quete.attente` pour la feuille ouverte avant la lecture de la partie, `settings.saved.quete`) |

Durée correspond au champ `length` d'une tâche, Effort au champ `difficulty`.

## Règles d'écriture

- Français québécois standard et tutoiement.
- Jamais « tu n'as pas », « manqué », « négligé », ni rien qui culpabilise. Une échéance passée n'est ni rouge ni un échec. « En retard » n'apparaît dans aucun texte du jeu.
- Mots du jeu : Quête, Cote, Étape, Énergie, Matériaux, Nourriture, Habitants, permis, quartier, rang, bâtiment. Confiance, Lueur, Fil libre, Secteur, Lot, Avis, Préparation, Voile, Lisière et Relais sont des mots de la v1 : ils ne servent plus que dans la lettre de passage et dans les noms des anciens gestes écartés (`migration.geste.*`). Jamais « Réputation ».
- Dans un prix, un manque ou une raison de refus, les ressources se disent toujours dans le même ordre : permis, Énergie, Matériaux (comme la barre du haut). Le code l'applique (`manque`, `core/batiments.js` ; `prixText`, `js/ui/quartier.js`) ; les textes écrits à la main le suivent.
- La semaine tenue ne se dit jamais comme une série : pas de nombre de jours de suite, pas de « tu l'as manquée ». Une semaine non tenue n'a aucune ligne ni aucun mot.
- Fanal parle en 20 mots au plus par réplique (par phrase dans ses lettres) et n'est jamais triste. Une réplique tient en 110 caractères.
- La célébration suit la taille de la quête : une réplique brève, une fois sur trois, pour une petite ou une moyenne ; une réplique chaque fois pour un grand chantier.
- Aucune donnée réelle : ni vraie tâche, ni prénom de proche, ni lieu identifiable.
- Le thème est « Ne porte pas tout » : le jeu aide à démarrer et célèbre sans en faire trop.
