<?php
/**
 * Modèle de réglages. Copier en `config.php` (ignoré par Git) et adapter.
 * Ordre de priorité : variables d'environnement (OREE_TASKS_FILE, OREE_DATA_DIR,
 * OREE_TOKEN_HASH, OREE_ALLOW_OPEN=1, OREE_ALLOW_CREATE_TASKS=1), puis ce fichier,
 * puis les valeurs par défaut.
 */

// Chemin de tasks.json. Défaut : deux niveaux au-dessus de api.php.
// define('TASKS_FILE', '/chemin/fictif/vers/tasks.json');

// Dossier des données (état du jeu, registre, sauvegardes). Défaut : api/data.
// define('DATA_DIR', '/chemin/fictif/vers/oree-data');

// PROTECTION. L'API est fermée par défaut : sans TOKEN_HASH, elle répond 503
// (sauf sous « php -S », le serveur de développement de PHP, ou si ALLOW_OPEN est vrai).
//
// 1. Produire un jeton aléatoire long ET son empreinte SHA-256 :
//      php -r '$t=bin2hex(random_bytes(32)); echo $t, PHP_EOL, hash("sha256",$t), PHP_EOL;'
//    Première ligne = le jeton (à garder pour le client, jamais dans le dépôt).
//    Deuxième ligne = l'empreinte (à coller ci-dessous).
// 2. Le client envoie : Authorization: Bearer <le jeton>
// define('TOKEN_HASH', 'remplacer-par-l-empreinte-sha256-en-hexadecimal-fictive-000000000000');

// Ouvre l'API sans jeton (déconseillé hors développement).
// define('ALLOW_OPEN', false);

// Permet à l'API de CRÉER tasks.json s'il est absent (essais seulement ; sinon 503 tasks_missing).
// define('ALLOW_CREATE_TASKS', false);

/*
 * Hébergement LiteSpeed/Apache : l'en-tête Authorization n'arrive parfois pas à PHP.
 * Si l'API répond 401 avec un bon jeton, ajouter dans le .htaccess du dossier app/api/
 * (ou à la racine du site) l'une de ces lignes :
 *
 *   SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
 *
 * ou (Apache 2.4.13+ / LiteSpeed récent) :
 *
 *   CGIPassAuth On
 *
 * api.php lit HTTP_AUTHORIZATION, REDIRECT_HTTP_AUTHORIZATION, puis getallheaders().
 *
 * Après chaque déploiement, vérifier qu'une requête web sur api/data/ledger.jsonl répond 403.
 */
