# Leçons du projet

À relire au début de chaque session.

## Scripts shell

- **Une apostrophe dans le message de `${var:?message}`, entre guillemets doubles, casse l'analyse de bash.** `CODE="${1:?code d'accès manquant}"` ouvre une chaîne qui avale le reste du fichier : bash signale une erreur bien plus loin (ici 25 lignes plus bas) et n'exécute rien après. Règle : pas d'apostrophe dans ces messages, et `bash -n script.sh` avant de lancer tout script qui touche un serveur.

## Vérifications navigateur

- **Une suite Playwright qui tourne pendant qu'un agent modifie les fichiers donne des échecs trompeurs.** Le serveur de test copie l'app depuis le dossier de travail. Règle : vérifier sur un état figé (après le retour de l'agent, ou sur un export de la version commitée).
- **Playwright est une bibliothèque, pas une commande.** Un `command -v playwright` vide ne prouve pas l'absence de navigateur : chercher `~/.cache/ms-playwright/chromium-*` et le dossier `playwright-core`.

## Accessibilité

- **Une feuille ouverte par `showModal()` rend le reste de la page inerte, régions `aria-live` comprises.** Une annonce écrite hors de la feuille n'est pas lue. Règle : chaque feuille porte sa propre région `role="status"`, et l'annonce va dans la feuille du dessus.

## Données

- **Ne jamais copier les vraies tâches sur ce poste pour un essai.** Utiliser un fichier fictif de même forme (`app/tests/e2e/ui-13-forme-reelle.cjs`) ; un essai sur les vraies données demande l'accord d'Alex.

## Serveur (LiteSpeed)

- **Un `.htaccess` remplacé n'est pas relu instantanément.** Juste après la bascule, l'ancienne API a répondu 405 (donc exécutée) au lieu de 403 ; quelques secondes plus tard, 403 stable. Règle : refaire les contrôles d'accès après une courte pause, plusieurs fois, avant de conclure dans un sens ou dans l'autre.
- **Un contrôle de mise en ligne ne doit jamais écrire.** Le premier script de bascule envoyait une liste vide à l'adresse de la liste de production pour vérifier qu'elle était bloquée : sans danger si le blocage tient, destructeur sinon. Règle : contrôles en lecture seule (GET), le blocage d'un fichier valant pour toutes les méthodes.

- **Ne jamais réécrire la table des tâches planifiées par un tuyau.** Le 5 octobre, `(crontab -l; echo …) | crontab -` a remplacé les 10 lignes du compte par la seule ligne ajoutée. Restaurée en moins d'une minute grâce à la copie faite juste avant ; d'après les horaires, aucune tâche n'a été manquée. Règle : copier la table dans un fichier, ajouter la ligne au fichier, installer avec `crontab <fichier>`, puis comparer ligne à ligne avec la copie.

- **Changer `MIN_CLIENT` peut faire perdre un geste en file à un onglet resté ouvert.** Relecture du lot R2 : la v3 retire de la file tout geste refusé en 4xx, `client_outdated` compris, et la file est partagée entre onglets (`oree.queue.v2`) ; un geste mis en file par un onglet à jour peut donc être jeté par un vieil onglet. Corrigé pour la v4 et les suivantes (le geste reste en file), pas pour un onglet v3 déjà ouvert. Règle : avant un envoi qui relève `MIN_CLIENT`, demander à Alex de recharger ses onglets ouverts ; et un calcul en file d'une version plus ancienne se refait à l'envoi (`withoutStaleBodies`), sans être rejoué s'il était déjà appliqué.

## Sécurité

- **Un plafond qui efface les compteurs les plus anciens ouvre un contournement.** Pour borner le fichier des essais ratés, j'avais gardé les 500 entrées les plus récentes : quelqu'un qui alterne entre 501 adresses fait effacer chaque compteur avant qu'il atteigne le seuil. Règle : ne jamais évincer une information de sécurité encore utile ; borner la taille par une limite commune, pas par l'oubli.
- **Contrôler puis compter en deux temps laisse passer des requêtes simultanées.** Le blocage lisait l'état sans verrou, puis comptait l'échec : 12 codes envoyés ensemble, 10 jugés au lieu de 5. Règle : la décision et la mise à jour d'un compteur de sécurité se font sous le même verrou, et un test l'éprouve avec des requêtes réellement parallèles.

## Tests navigateur

- **L'écran se met à jour avant la fin de l'envoi.** Le scénario 1 lisait le registre du serveur dès que l'Énergie s'affichait : il a échoué une fois à 1280 (lot 2), alors que l'agent l'avait vu au vert. Règle : tout contrôle qui lit le serveur après un geste dans l'interface attend l'écriture (`L.waitFor`), au lieu de la supposer faite.
- **`setsid` peut rendre la main tout de suite.** Lancé depuis un chef de groupe de processus, il se dédouble et revient aussitôt : un marqueur « FIN » écrit juste après arrive avant la fin de la série (lot 6). Règle : `setsid --wait`, ou écrire le marqueur dans le même sous-shell que la commande, et vérifier qu'aucun `node ui-…` ne tourne encore avant de lire le résultat.
- **Le bonus d'ouverture aussi arrive après l'écran.** Le scénario 22 comptait le registre juste après l'ouverture : le bonus d'ouverture est arrivé pendant la séance et trois contrôles ont échoué à 1280 (lot 5), alors que la même série avait réussi chez l'agent. Règle : un scénario qui prend une photo du registre au départ attend d'abord le bonus d'ouverture (`L.waitFor(… e.bonus === 'ouverture' …)`), comme le scénario 1.
- **`pgrep -f "node ui-"` se trouve lui-même.** La boucle d'attente contient ce motif dans sa propre ligne de commande : elle ne s'arrête jamais (lot 5). Règle : ancrer le motif, `pgrep -f "^node ui-"`.
- **Pas de relance automatique dans le lanceur.** « Relance-le seul trois fois » (diagnostic d'une instabilité, à la main) a été compris comme « le lanceur relance tout seul » : une instabilité serait passée au vert sans qu'on la voie (lot 5). Règle : `run-ui.sh` fait un seul essai par défaut ; `ESSAIS=3` seulement pour diagnostiquer. Dans une consigne d'agent, écrire « à la main, pour diagnostiquer ».
- **Une mesure de position prise sans attendre la page posée échoue sous charge.** Pendant que R3 tournait en parallèle (lot R), le scénario 1 a mesuré « Fait » 20 px trop bas à 390 : police de repli ou panneau en mouvement. Seul, il passait deux fois sur deux. Règle : avant de mesurer une position, attendre `document.fonts.ready` et la fin des animations de l’élément qui bouge.
- **Un second onglet reçoit l’avis `storage` avant d’avoir lu la partie.** Le scénario 7 a levé « Cannot destructure property 'tasks' of 'this.server' » sous charge (lot R) : l’écouteur de la file recalculait la vue alors que la partie n’était pas encore lue, depuis la semaine 1. Règle : tout écouteur qui lit l’état du serveur vérifie qu’il est là ; le chargement refait le calcul.

- **Un contrôle qui lit un fichier écrit plus tard dans la même requête doit attendre ce fichier.** Le scénario 2 vérifiait le registre dès que `tasks.json` montrait la quête « Déjà faite » ; le serveur écrit le registre 10 à 12 ms après (mesuré). Pendant que la passe de documents tournait (lot R2), le contrôle a échoué aux trois largeurs ; seul, il passait cinq fois sur cinq. Règle : chaque fichier contrôlé a son propre `L.waitFor`, dans l'ordre d'écriture du serveur (tasks.json, game-state.json, registre, ops.json).
- **Un onglet déjà ouvert fait tourner l'ancien code.** Avant l'envoi du lot R2 sur l'essai, j'ai écrit à Alex qu'un geste fait dans un ancien onglet « reste en attente, il n'est pas perdu » : c'est le comportement de la version 4. Un onglet resté ouvert fait tourner la version 3 (`7afb898`), qui écarte tout refus 4xx, donc aussi `client_outdated`, avec l'avis « Un changement n'a pas pu être appliqué ». Repéré par moi, après l'envoi. Règle : ce que fait un onglet ouvert se lit dans le code de la version qu'il fait tourner (`git show <commit déployé>:app/js/store.js`), jamais dans celle qu'on vient d'envoyer.
- **Un agent qui choisit lui-même ses scénarios en oublie.** L'agent des entiers à l'écran (lot 8) a relancé 13 scénarios « touchés » et a laissé le n° 7 (deux onglets), qui comparait la barre au serveur avec ses dixièmes : échec dans la série du soir. Règle : un changement d'affichage partagé (format des nombres, barre, annonce) se valide par la série complète avant la fusion, pas par une sélection.

## Consignes aux agents
- **Un profil de simulation « calqué sur l'essai » se compare d'abord au registre réel.** Le 6 octobre (lot R2), le profil (g) gagnait 84 Énergie en 24 jours contre 154 sur l'essai : sa conclusion « cible du jour 21 non tenue, cause l'Énergie » était fausse pour la partie d'Alex. Règle : avant de calibrer sur un joueur simulé, comparer ses gains sur la même période au registre de l'essai ; pour une décision sur la partie d'Alex, rejouer son registre réel jour par jour (reconstitution) plutôt que le joueur simulé.
- **Un chiffre écrit dans un fichier suivi se calcule avant d'être écrit.** Le 6 octobre, j'ai écrit « au plus 44 points dans une journée » dans `tasks/todo.md` par déduction ; c'était 37, relevé par le contre-calcul avant le commit. Règle : pas de chiffre déduit dans un document, même interne ; le script d'abord, la phrase ensuite.

- **Compter les fautes, pas seulement les bons exemples.** J'ai écrit à l'agent du lot 5 que les textes de `content/fr-CA/` avaient déjà l'espace insécable, sur la foi de 53 bonnes occurrences ; il en restait 92 ordinaires (lot 5). Règle : avant d'écrire « comme dans X » dans une consigne, mesurer aussi les écarts dans X. Et la règle elle-même était fausse : `app/content/README.md` (Conventions communes) veut l'insécable devant « : » et dans les guillemets, mais **aucune espace devant « ? ! ; »** (OQLF). Ma consigne demandait l'insécable devant les cinq ; c'était déjà l'erreur d'une session précédente. Corrigé le soir même (7 textes, 3 lignes de code, test durci). Règle : la typographie se lit dans `app/content/README.md`, jamais de mémoire.
- **Refaire un chiffre de simulation avant de le relayer.** J'ai écrit à Alex « village plein fin novembre » d'après le rapport de l'agent du lot 4, sans relancer `simuler()` ; c'était faux pour un départ le 25 octobre (30 janvier en réalité, mesuré au lot 5). Règle : un chiffre d'agent qui sert à une décision se relance (la simulation prend moins d'une minute), ou il est donné à Alex comme « rapporté par l'agent, pas refait ».
