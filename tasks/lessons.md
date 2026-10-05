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
