# Audit Quêtes du foyer / Orée vivante (lecture seule, 5 oct. 2026)

Le jeu 006 est un bac à sable en localStorage, sans lien avec `tasks.json`. Son économie se contourne en quelques clics : farming par réactivation, bouton « Jour +1 » libre, incidents qu'on peut ignorer. Sa migration perd des champs de tâche (échéance, notes…). J'ai vérifié les chiffres d'économie et les exploits en faisant tourner le vrai `model.js` sous Node.

## 0. L'application historique (`/home/user/master-tasklist/index.html`)

- **Chargement :** `GET tasks.json?t=` (l.726). Si la requête échoue ou renvoie un tableau vide, repli sur `localStorage.familytasks`, puis sur les 4 tâches de démo (l.494-499, 732-735).
- **Écriture :** `save()` (l.714-722) enregistre en localStorage puis POSTe tout le tableau sur `tasks.json`. Les erreurs sont avalées et `r.ok` n'est jamais vérifié. Ça marche avec `tasks-server.py`, mais **rien n'appelle `tasks-api.php`**. Sur LiteSpeed, l'écriture dépend donc d'une réécriture d'URL hors dépôt, à vérifier.
- **Filtres :** difficulté, longueur, priorité (1-3/4-6/7-10), domaine (6 domaines), statut (todo/done/all). Les tâches `archived` sont toujours masquées.
- **Tri :** tâches actives d'abord, puis priorité décroissante, puis longueur croissante.
- **Formule :** pas de coefficient, seulement une XP `D×8+L×4` (l.529) plafonnée au niveau 10. Cette XP est recalculée depuis les tâches terminées, donc impossible à gonfler.
- **Échéance :** badge J-n qui pulse à 3 jours ou moins, sans tri. La date est lue en UTC, donc J-0 s'affiche dès la veille au soir.
- **Ajout :** P/L/D à 5, domaine vide, **pas de date `created`**.
- **Édition :** le titre et P/L/D se modifient à la souris. Le domaine, l'échéance et les notes ne sont pas modifiables. Pas de suppression.
- **Risques :**
  - un onglet périmé, ou un chargement raté suivi d'un clic, écrase toute la vraie liste ;
  - `domain`, `deadline` et `id` sont injectés dans le HTML sans échappement (l.646-652) ;
  - le titre et les barres P/L/D sont inaccessibles au clavier, et les boutons ✓/↩ n'ont pas de libellé accessible.

## 0b. À récupérer des prototypes

- **001 :**
  - filtres de contexte « moins de 30 min / peu d'énergie / autour de la maison », avec une phrase qui justifie la recommandation ;
  - aperçu du score pendant la saisie ;
  - annulation depuis le toast ;
  - progression par domaine.
- **002 :**
  - trois recommandations (À faire d'abord, Victoire rapide, Grand chantier) ;
  - longueur affichée en durée réelle ;
  - une parcelle par domaine ;
  - parcelles débloquées par jours actifs.
- **003 :**
  - chronomètre de mission (`startedAt` est stocké mais jamais affiché) ;
  - complétion par glissement accessible ;
  - historique daté.
- **004 :**
  - expédition de 1 à 3 quêtes ;
  - dispositions 10 min / peu d'énergie / prioritaire ;
  - gain `max(4, score/10)` avec une braise quotidienne plafonnée ;
  - Codex des règles.
- **005 :**
  - bonus plafonnés (RULES.md) ;
  - Réputation gagnée selon l'effort ;
  - troisième choix d'événement « protéger durablement » ;
  - intégrité et secteurs du Bastion ;
  - recherche, tri et filtre de statut.

## 1. Fonctionnement actuel de la 006

```
todo -start→ mission -complete→ done (+E +M, +1 Confiance si le jour-jeu n'a pas encore été crédité)
done -reactivate→ todo (le gain n'est pas repris)
Ressources → planter 3E → 2 jours-jeu → +3M (1M avec insectes)
           → serre 4E/8M (aucun effet) | éboulis 4E/6M (+6 cases)
           → décor : parcelle 3E/4M, silo 2E/8M, balise 2E/3M
           → Tour : inspecter → Confiance ≥ 3 → 6E/12M → signal
« Jour +1 » libre → incidents fixés aux jours 2, 3 et 4 → payer | gratuit puis réparer
Chapitre : 6 drapeaux à lever, puis plus rien.
```

**Formules en place :**
- Stock de départ : 12E / 22M / 1C.
- Score : `round(5,5P + 2,5(11−L) + 2(11−D))`, de 10 à 100.
- Gains selon la longueur : L1 → 2E/1M ; L2-3 → 3/3 ; L4-6 → 5/5 ; L7-8 → 7/7 ; L9-10 → 10/9 ; +2M si D≥7. **La priorité n'entre pas dans le gain.**
- Incidents : payer 2E / 3E / 5M, ou choisir l'option gratuite puis réparer pour 2M / 2E / 4M.
- Tâche ouverte moyenne du jeu d'essai : 4,6E / 4,9M, score 66.

**Ce que ça donne :**
- **Le chapitre 1 se termine avec 2 tâches et 1 clic « Jour +1 »**, et il reste 8E/14M. Le stock de départ paie déjà la Tour : les gains des vraies tâches ne servent à rien dans ce chapitre.
- Tout le contenu restant coûte 22E/31M, soit environ 2 tâches de plus.
- **Au-delà de 4 à 5 tâches, les ressources s'accumulent sans débouché**, à raison d'environ +14E/+15M par jour à 3 tâches par jour.
- La ferme ne rapporte rien : 3E rendent 3M. Une parcelle achetée n'est jamais remboursée.
- Les dépenses portent surtout sur les Matériaux, donc l'Énergie s'empile.
- À la minute, une tâche L1-2 rapporte environ 0,3 contre 0,04 pour un jalon. Mais l'interface affiche le gain par tâche, où une tâche longue paie 3 à 6 fois plus. Ça pousse à gonfler L.

## 2. Bugs et risques (006)

**Données**
1. `normalizeTask` (model.js:31-42) ne garde que 8 champs : **deadline, notes, subtasks, updated et completedAt sont perdus**. En plus, une tâche `archived` redevient `todo` (l.39), une note absente vaut 1 (l.7) et un domaine absent devient « Personnel ».
2. La date `created` est codée en dur à `'2026-10-04'` (l.40, 125).
3. L'id de secours `task-local-${Date.now()}` (l.33) entre en collision quand plusieurs tâches sont créées dans la même milliseconde (reproduit).
4. Pas de lien avec `tasks.json` : la 006 travaille sur une copie figée (data.js:1-273), stockée seulement en localStorage, sans export. Safari peut l'effacer (ITP).
5. Les migrations sont fragiles : les incidents sont codés en dur (l.62-66), les anciennes `entities` sont reprises telles quelles, et `stabilizeTower` dépense avant de chercher la Tour (l.309-312).

**Économie**
6. **Terminer, réactiver, terminer** (l.189-195) : 10 boucles donnent +30E/+30M.
7. Créer une tâche L10/D10 puis la terminer rapporte 10E/11M, sans plafond.
8. `durationLabel` (ui.js:12) affiche « 30–60 min » pour L3 comme pour L4, mais L3 paie 3/3 et L4 paie 5/5.
9. **« Jour +1 » est libre** (index.html:84, app.js:414) : +1 Confiance par jour sauté, soit C=6 en 5 boucles. Les récoltes deviennent instantanées. La Confiance suit le jour du jeu (l.174) et non le calendrier.
10. **Ignorer un incident est le meilleur choix** : un incident actif n'expire jamais et n'a aucun effet. `emitWeatherSignal` ne bloque que les incidents contenus (l.318). Choisir « gratuit » puis réparer coûte moins que payer (insectes 2E < 3E, Tour 4M < 5M).
11. Les conséquences touchent la première parcelle semée (l.342, 347), alors que les marqueurs pointent les cases 4:2 et 3:3 (ui.js:66-70). La réparation peut accélérer une autre culture (l.365).
12. Il n'y a plus d'incident après le jour 4. Les paliers de Confiance 5 et 8 ne font rien (ui.js:19-20). La serre et le Bastion sont purement décoratifs.

**Interface**
13. La recommandation ignore l'échéance, l'ancienneté et la mission en cours. `selectedTaskId` n'est jamais lu.
14. Le score est présenté comme une « priorité » (ui.js:99, 176, « Priorité 80 »). La justification est figée (« Courte, prioritaire… », l.102).
15. Seules les 4 dernières tâches terminées sont listées (l.175), donc les anciennes ne peuvent plus être réactivées.
16. Le domaine se saisit en texte libre (index.html:134), d'où des valeurs Jardin / Ferme / Personnel.
17. Le bouton « Ferme » (index.html:88) n'a aucun gestionnaire. Échap ferme probablement aussi la feuille ouverte sous le dialogue (app.js:566).
18. **Confidentialité :** des titres de tâches réels restaient dans les sketches 001 à 004 et dans un identifiant de 005/006 (corrigé par la réécriture d'historique du 5 oct. 2026).
19. **Sécurité :** `tasks-server.py` accepte n'importe quel POST sans authentification, et `run-public-tunnel.sh` le rend public. `tasks.json` est lisible publiquement tant que la connexion par code n'existe pas.

**Accessibilité**
20. Le `role=dialog` n'a pas de nom accessible : `aria-labelledby` est sur le parent (index.html:97-99).
21. Chaque toast est annoncé deux fois (app.js:164).
22. Un `aria-label` est posé sur un `div` (l.35), et `aria-expanded` est faux sur le popover encore ouvert (app.js:330).
23. Le focus n'est piégé que sous 700 px, et la carte n'a pas d'équivalent textuel.

## 3. Écarts avec PRODUCT.md

| Capacité | État en 006 |
|---|---|
| Tri et filtres P/L/D/domaine/statut/coefficient | Manquant (régression) |
| Score calculé | Partiel (mal libellé) |
| Ajouter / éditer / terminer / réactiver | Atteint, en bac à sable |
| Annoter | Manquant |
| Échéances | Manquant |
| Bonus plafonnés | Manquant |
| Notifications | Manquant |
| Chapitres | Partiel (1 seul chapitre, réglé en 2 tâches) |
| Trois ressources | Partiel (pas de puits de dépense) |
| Aléas récupérables | Partiel (scriptés, ignorables) |
| Défense du Bastion | Manquant |
| Ferme manipulable | Atteint |
| Évolution des données sans perte | Manquant |
| Hébergement LiteSpeed/PHP | Partiel (statique seulement) |
| Connexion par code | Manquant |
| Mobile | Atteint (Chromium émulé) |
| Accessibilité | Partiel |

## 4. Propositions de systèmes

**(a) Score**
`100 × [0,40·P/10 + 0,20·U + 0,15·(11−L)/10 + 0,10·(11−D)/10 + 0,10·A + 0,05·M]`
- U (urgence) = 1 si l'échéance est dépassée ou tombe aujourd'hui, sinon 1−d/14 jusqu'à 14 jours.
- A (ancienneté) = âge/30, plafonné à 1.
- M = 1 si la tâche est en cours.
- « 15 min » ne garde que L≤2. « Peu d'énergie » ne garde que D≤3 et donne plus de poids à la difficulté.
- Exemples : P8/L3/D3 âgée de 83 jours vaut 62 ; P9/L5/D6 due dans 2 jours vaut 67.
- Afficher trois recommandations, comme en 002.

**(b) Récompense**
- Base `B = round(6√L)` (+2 si D≥7), soit 6 / 12 / 18 pour L1 / L4 / L9.
- Multiplier par `(1 + 0,05(P−5))`.
- +20 % si terminée avant l'échéance, sans jamais de pénalité de retard.
- +25 % et +1 Réputation si la tâche a 21 jours ou plus.
- **Plafond quotidien dégressif :** 100 % jusqu'à 40, 50 % de 40 à 80, 25 % au-delà.
- **Évaluation figée au démarrage**, et 50 % seulement si la tâche est terminée moins de 10 min après sa création dans l'app.
- **Registre des gains append-only** : un gain par `completionId`, et une réactivation enregistre l'écriture inverse.

**(c) Calendrier**
- Jour = date locale (America/Toronto). « Jour +1 » seulement en mode `?debug`.
- Cultures en heures réelles (8 h, 24 h, 72 h), qui ne pourrissent jamais.
- Rattrapage limité à 7 jours, sans incident pendant l'absence.
- Après 3 jours d'absence : message « la ferme a tenu » et +5E.
- +1 Confiance par jour réel actif, affiché comme « jours actifs sur 7 ».

**(d) Récurrence et chantiers**
- Une tâche récurrente = un bâtiment à entretenir. S'il est négligé, il devient poussiéreux (effet cosmétique). Gain à 60 %.
- Une tâche L≥7 = un chantier dont les étapes sont les sous-tâches. Le gain du parent est réparti entre elles, donc découper ne rapporte rien de plus. Bonus de +30 % et un bâtiment à la fin.

**(e) Secteurs par domaine**
- Maison → Atelier (réparations −10 %).
- Terrain → Champs (croissance +10 %).
- Enfants → Maison commune (Réputation).
- Véhicule → Garage/Convoi (échange E↔M).
- Administratif → Archives (fragments).
- Professionnel → Comptoir.
- Alias : Jardin/Ferme → Terrain.
- Vitalité sur 14 jours, visible sur la carte. Niveaux à 30 / 80 / 160 / 300 de base cumulée.

**(f) Incidents**
- Un tirage par jour : probabilité 0,25, +0,10 par secteur négligé, +0,10 en cas d'échéance dépassée, plafonnée à 0,6. Au plus 2 incidents actifs.
- Paquet pondéré par `1+2·négligence` du domaine.
- Quatre réponses : payer C, investir 1,5C (−50 % de probabilité pendant 14 jours), accepter une perte virtuelle, ou **résoudre en terminant une quête du domaine**.
- Après 48 h, la conséquence la plus douce s'applique. Réparer coûte au moins 1,25C.

**(g) Méta**
- Saisons de 8 à 10 semaines, conclues par un almanach.
- Collection.
- Villageois débloqués à 3 / 6 / 10 / 15 de Réputation, chacun avec un effet passif.
- Secteurs du Bastion : −10 % de coût et de probabilité d'incident par niveau.

**(h) Rituel du matin**
- Choisir 1 à 3 quêtes : +2E.
- En terminer au moins 2 : +1R.
- Retour quotidien : +1E. Ajout d'une tâche : +1E. Bilan de la semaine : +1E/+1M/+1R.
- Au total, environ 4E par jour au maximum.

## 5. Architecture cible

**Données**
- `tasks.json` reste un tableau. Les champs inconnus sont conservés tels quels.
- Champs : `id, task, domain, priority, length, difficulty, deadline, notes, status, created, updated, completedAt, recurrence, subtasks, parentId, source, rev`. Une suppression laisse une trace (tombstone) au lieu d'effacer la tâche.
- Un fichier séparé `game-state.json` contient `{rev, lastTickAt, ledger, world, chapter, incidents, daily}`.

**API PHP**
- `GET tasks`.
- `POST tasks/ops` avec `{baseRev, ops}`. Les opérations sont appliquées sous `flock` sur le fichier courant, ce qui fusionne avec les écritures de l'agent. Écriture atomique via fichier temporaire puis renommage, et 50 sauvegardes.
- `game-state` utilise `If-Match` et renvoie 409 en cas de conflit.

**Agent et sécurité**
- L'agent écrit par cette API avec un jeton. À défaut, fusion par id selon `max(updated)`.
- `.htaccess` bloque l'accès direct aux `*.json`.
- Connexion par code : `password_hash`, cookie HttpOnly, nombre d'essais limité.

**PWA**
- Manifest et service worker : cache-first pour les fichiers statiques, network-first pour l'API.
- File d'opérations dans IndexedDB, rejouée à l'ouverture.
- Notifications : déléguer le rappel à l'agent (le Web Push sur iOS exige une PWA installée).

**Modules**
- `core/` pur, sans DOM : tâches, migration, score, récompenses, registre, calendrier, incidents, chapitres. L'horloge et le stockage sont injectés.
- `rules/*.js` pour les règles de jeu, `adapters/` pour les accès externes, `ui/` pour l'affichage.

**Tests avec `node --test`**
- aller-retour de `tasks.example.json` ;
- pas de double gain ;
- plafond quotidien ;
- changement d'heure du 1er novembre 2026 ;
- les incidents ne touchent pas aux tâches ;
- chapitres.
- En complément : `php -l` et un test curl de fumée.

**Rendu de la carte**
- Rester en DOM/CSS : accessibilité native et zéro dépendance.
- Passer à un rendu incrémental et limiter la carte à 12×12 cases.
- Ajouter une couche décor en Canvas 2D si les animations se multiplient.
- PixiJS (environ 0,5 Mo) seulement avec de vrais sprites, mais l'accessibilité serait alors à refaire.

## 6. Feuille de route

**Phase 1 : Fondations**
1. Retirer les données réelles des sketches (S).
2. `core/`, migration sans perte et tests (M).
3. API d'opérations, sauvegardes et vrai `tasks.json` (M).
4. Registre des gains idempotent (S).
5. Jour calendaire réel (S).
6. Registre des quêtes complet : filtres, notes, échéance, historique (M).
7. Connexion par code (M).
8. PWA de base (S).

**Phase 2 : Boucle de jeu riche**
1. Score v2 et contextes (M).
2. Récompense plafonnée (M).
3. Rituel du matin et bonus (S).
4. Secteurs par domaine (M).
5. Générateur d'incidents (M).
6. Cultures en temps réel et retour après absence (M).
7. Chantiers et récurrences (L).
8. File d'opérations hors ligne (M).

**Phase 3 : Contenu et finition**
1. Moteur de chapitres et chapitres 2-3 (L).
2. Bastion défensif (M).
3. Villageois (M).
4. Saisons et collection (M).
5. Rappels (M).
6. Rendu incrémental ou Canvas (M).
7. Accessibilité et tests sur iOS réel (S).
8. Journal et statistiques (S).