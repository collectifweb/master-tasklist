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

## Sécurité

- **Un plafond qui efface les compteurs les plus anciens ouvre un contournement.** Pour borner le fichier des essais ratés, j'avais gardé les 500 entrées les plus récentes : quelqu'un qui alterne entre 501 adresses fait effacer chaque compteur avant qu'il atteigne le seuil. Règle : ne jamais évincer une information de sécurité encore utile ; borner la taille par une limite commune, pas par l'oubli.
- **Contrôler puis compter en deux temps laisse passer des requêtes simultanées.** Le blocage lisait l'état sans verrou, puis comptait l'échec : 12 codes envoyés ensemble, 10 jugés au lieu de 5. Règle : la décision et la mise à jour d'un compteur de sécurité se font sous le même verrou, et un test l'éprouve avec des requêtes réellement parallèles.
