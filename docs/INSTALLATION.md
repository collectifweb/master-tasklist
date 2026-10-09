# Installer le jeu chez un hébergeur PHP

Ce guide met en ligne ta propre copie du jeu, avec tes quêtes à toi. Il suppose que tu sais déposer des fichiers chez ton hébergeur, par son gestionnaire de fichiers, par FTP ou par SSH.

## Avant de commencer

Il te faut :

- un hébergement avec PHP 8.3 et Apache ou LiteSpeed (le serveur doit lire les fichiers `.htaccess`) ;
- une adresse pour le jeu, avec HTTPS activé : un sous-domaine comme `jeu.example.com` est le plus simple, un sous-dossier comme `example.com/jeu/` marche aussi ;
- l’accès à ton dossier personnel chez l’hébergeur, celui qui contient le dossier public du site.

Dans ce guide, `jeu.example.com` est l’adresse du jeu, `/home/ton-compte/` ton dossier personnel et `/home/ton-compte/public_html/jeu/` le dossier public du jeu. Remplace-les par les tiens.

## 1. Récupérer le jeu

Sur la page GitHub du dépôt, bouton « Code », puis « Download ZIP ». Ou, en ligne de commande :

```bash
git clone https://github.com/collectifweb/master-tasklist.git
```

Seuls le dossier `app/` et le fichier `robots.txt` iront en ligne.

## 2. Choisir ton code d’accès

Le jeu demande un code d’accès sur chaque appareil, une seule fois. Le serveur n’en garde que l’empreinte, une suite de 64 caractères calculée à partir du code.

Le code doit être long, **sans espace ni accent** : le jeu refuse un code qui en contient, même avec la bonne empreinte. Cinq mots reliés par des tirets font l’affaire, par exemple `marmite-boussole-givre-pelle-orage` (prends-en d’autres).

Calcule ensuite son empreinte. Sur Mac :

```bash
printf %s 'ton-code' | shasum -a 256
```

Sous Linux, remplace `shasum -a 256` par `sha256sum`. Si tu as PHP sur ton ordinateur, ou un accès SSH chez ton hébergeur :

```bash
php -r 'echo hash("sha256", "ton-code"), PHP_EOL;'
```

Garde les 64 caractères affichés, sans le « - » que `shasum` et `sha256sum` ajoutent à la fin. Le code lui-même ne va nulle part sur le serveur : note-le dans ton gestionnaire de mots de passe.

## 3. Préparer le dossier des données, hors du site public

Tes quêtes, ta partie et leurs sauvegardes vont dans un dossier que le web ne peut pas lire. Dans ton dossier personnel, à côté du dossier public et pas dedans, crée :

```
/home/ton-compte/oree-donnees/
└── tasks.json
```

`tasks.json` contient seulement :

```json
[]
```

C’est ta liste de quêtes, vide pour l’instant. Le jeu crée le reste lui-même au premier lancement.

## 4. Trouver le chemin complet de ton dossier personnel

Le serveur du jeu a besoin du chemin complet du dossier des données. Si ton hébergeur ne l’affiche pas, dépose dans le dossier public un fichier `chemin.php` qui contient :

```php
<?php echo __DIR__;
```

Ouvre `https://jeu.example.com/chemin.php`. La page affiche quelque chose comme `/home/ton-compte/public_html/jeu` : ton dossier personnel est le début, `/home/ton-compte`. **Supprime `chemin.php` tout de suite après.**

## 5. Mettre le jeu en ligne

Copie le contenu du dossier `app/` dans le dossier public du jeu, sauf le dossier `tests/`. Le fichier `index.html` doit se retrouver directement dans le dossier public :

```
/home/ton-compte/public_html/jeu/
├── index.html
├── api/
├── content/
├── core/
├── css/
└── …
```

## 6. Régler le serveur du jeu

Dans le dossier `api/` mis en ligne, crée un fichier `config.php` :

```php
<?php
define('TASKS_FILE', '/home/ton-compte/oree-donnees/tasks.json');
define('DATA_DIR', '/home/ton-compte/oree-donnees/jeu');
define('TOKEN_HASH', 'colle-ici-les-64-caracteres-de-l-empreinte');
```

Dans le même dossier `api/`, crée un fichier `.htaccess` qui contient cette ligne. Sans elle, certains hébergeurs ne transmettent pas le code d’accès au jeu :

```
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

`api/config.example.php` décrit les autres réglages possibles.

## 7. Tenir les moteurs de recherche à l’écart

Copie `robots.txt`, à la racine du dépôt, dans le dossier public du jeu. Il demande aux moteurs de recherche de ne pas l’indexer.

## 8. Premier lancement

Ouvre `https://jeu.example.com/`. Le jeu affiche « Accès à tes quêtes » : entre ton code, puis « Enregistrer le code ». Trois écrans de bienvenue présentent le jeu ; « Commencer » ouvre l’île, avec un premier objectif : rebâtir un chalet. « Ajouter une quête », ou le bouton + du fil du jour, crée ta première quête.

Ouvre ensuite `https://jeu.example.com/api/config.php` : la page doit rester blanche. Si tu y vois ton empreinte, PHP ne tourne pas : retire `config.php`, vérifie la version de PHP chez ton hébergeur, puis choisis un nouveau code.

## 9. Sur le téléphone et la tablette

Ouvre l’adresse du jeu, entre ton code, puis ajoute le jeu à l’écran d’accueil depuis le menu du navigateur (le nom de l’option change d’un navigateur à l’autre). Il s’ouvre ensuite comme une application, sans barre d’adresse.

## Mettre à jour

1. Copie le dossier `oree-donnees/` sur ton ordinateur : c’est ta sauvegarde.
2. Récupère la nouvelle version (nouveau ZIP, ou `git pull`).
3. Remplace les fichiers en ligne par le contenu du nouveau dossier `app/`, toujours sans `tests/`. Garde tes fichiers `api/config.php` et `api/.htaccess`.
4. Recharge le jeu sur chaque appareil. Quand la nouvelle version l’exige, le serveur refuse un onglet resté sur l’ancienne avec « L’app a été mise à jour : recharge la page. »

## Les sauvegardes

À chaque changement, le jeu copie ta liste de quêtes et ta partie dans `oree-donnees/jeu/backups/`, avant et après l’écriture. Il garde les 14 copies les plus récentes et une copie par jour pendant 30 jours. Ces copies restent chez ton hébergeur : de temps en temps, copie aussi `oree-donnees/` sur ton ordinateur.

## En option : le rappel du matin

`serveur/rappel.php` envoie chaque jour une notification par [ntfy](https://ntfy.sh), qui ouvre le jeu. Il se règle dans `api/config.php` (`NTFY_TOPIC`, `APP_URL`, voir `api/config.example.php`) et se lance par une tâche planifiée de ton hébergeur, par exemple chaque matin à 8 h :

```bash
php /home/ton-compte/public_html/jeu/serveur/rappel.php
```

Il n’envoie qu’un rappel par jour, et il refuse de tourner depuis le web.

## Si quelque chose coince

- Le jeu affiche « Impossible de charger tes quêtes » dès le premier lancement ? Le serveur du jeu ne trouve pas ses fichiers. Vérifie la version de PHP, les chemins de `config.php`, que `tasks.json` existe et contient `[]`, et que PHP a le droit d’écrire dans `oree-donnees/`.
- Le code est refusé alors qu’il est bon ? Vérifie le fichier `api/.htaccess` de l’étape 6, puis l’empreinte (calculée sur le code exact, sans espace en trop). Après 5 codes faux en 15 minutes, le serveur bloque les essais pendant 15 minutes.
- Un serveur Nginx ne lit pas les fichiers `.htaccess`. Le jeu n’a pas été essayé sur Nginx.
