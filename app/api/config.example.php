<?php
/**
 * Modèle de réglages. Copier en `config.php` (ignoré par Git) et adapter.
 * Ordre de priorité : variables d'environnement (OREE_TASKS_FILE, OREE_DATA_DIR,
 * OREE_TOKEN_HASH), puis ce fichier, puis les valeurs par défaut.
 */

// Chemin de tasks.json. Défaut : deux niveaux au-dessus de api.php.
// define('TASKS_FILE', '/chemin/fictif/vers/tasks.json');

// Dossier des données (état du jeu, registre, sauvegardes). Défaut : api/data.
// define('DATA_DIR', '/chemin/fictif/vers/oree-data');

// Empreinte du jeton. Sans cette ligne, l'API est ouverte (développement local).
// Produire l'empreinte avec :
//   php -r 'echo password_hash("mon-jeton-secret-fictif", PASSWORD_DEFAULT);'
// puis coller le résultat ci-dessous. Le client envoie : Authorization: Bearer mon-jeton-secret-fictif
// define('TOKEN_HASH', '$2y$10$remplacer-par-l-empreinte-generee');

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
 */
