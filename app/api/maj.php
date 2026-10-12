<?php
declare(strict_types=1);

/**
 * Mise à jour du jeu depuis GitHub (lot U). Une installation chez quelqu'un d'autre se met à la version de `main`, la
 * branche que deploy-prod.sh avance à chaque envoi en production. Même code d'accès qu'api.php.
 *   GET  : version installée, dernière version publiée, et si la mise à jour peut se faire ici.
 *   POST : la fait (corps JSON {"lancer": true}).
 * Ne touche jamais api/config.php, api/.htaccess, api/data/ ni le dossier des données ; n'efface aucun fichier. Les
 * fichiers remplacés sont gardés dans <données>/maj/precedente/, et remis si une copie échoue.
 * Contrat : app/ARCHITECTURE.md, section « Mise à jour depuis GitHub ».
 */

define('OREE_API_NO_RUN', true);
require __DIR__ . '/api.php';

const MAJ_REFS_DEFAUT = 'https://github.com/collectifweb/master-tasklist.git/info/refs?service=git-upload-pack';
const MAJ_ARCHIVE_DEFAUT = 'https://codeload.github.com/collectifweb/master-tasklist/tar.gz/'; // + commit
const MAJ_RELIRE_S = 600;             // une lecture relit la version publiée au plus toutes les 10 minutes (échec compris)
const MAJ_DELAI_REFS_S = 8;
const MAJ_DELAI_ARCHIVE_S = 120;
const MAJ_REFS_MAX = 1048576;         // 1 Mio pour la liste des références
const MAJ_ARCHIVE_MAX = 52428800;     // 50 Mio pour l'archive (2,7 Mo le 12 octobre 2026)
const MAJ_GARDES_MAX = 20971520;      // 20 Mio décompressés pour les fichiers gardés (0,9 Mo le 12 octobre 2026)
const MAJ_FICHIERS_MAX = 2000;
const MAJ_REQUIS = ['index.html', 'sw.js', 'api/api.php', 'api/maj.php', 'js/main.js']; // sinon, l'archive est refusée

/** Réglages de la mise à jour, après load_config() (qui lit config.php) : MISE_A_JOUR, puis l'environnement. */
function maj_config(array $cfg): array
{
    $cfg['maj'] = !defined('MISE_A_JOUR') || (bool)MISE_A_JOUR;
    $v = getenv('OREE_MAJ');
    if (is_string($v) && $v !== '') $cfg['maj'] = ($v === '1');
    // adresses réglables pour les essais seulement (un faux GitHub local) : l'environnement, jamais l'appareil
    $cfg['maj_refs'] = (string)(getenv('OREE_MAJ_REFS') ?: MAJ_REFS_DEFAUT);
    $cfg['maj_archive'] = (string)(getenv('OREE_MAJ_ARCHIVE') ?: MAJ_ARCHIVE_DEFAUT);
    return $cfg;
}

/** Dossier public du jeu : celui qui contient index.html et api/. */
function maj_racine(): string
{
    return dirname(__DIR__);
}

function maj_lire(string $dataDir): array
{
    $raw = @file_get_contents($dataDir . '/maj.json');
    $e = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($e) ? $e : [];
}

function maj_ecrire(string $dataDir, array $e): void
{
    atomic_write($dataDir . '/maj.json', jenc($e, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n", 0600);
}

/**
 * Appel HTTP(S) borné en temps et en taille. Avec $fichier, la réponse y est écrite ; sinon elle est renvoyée.
 * null si l'appel échoue, si le code n'est pas 200 ou si la taille dépasse $max.
 */
function maj_appeler(string $url, int $max, int $delai, ?string $fichier = null): ?string
{
    if (!function_exists('curl_init')) return null;
    $fh = $fichier !== null ? @fopen($fichier, 'wb') : null;
    if ($fichier !== null && !$fh) return null;
    $raw = '';
    $taille = 0;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CONNECTTIMEOUT => min($delai, 10),
        CURLOPT_TIMEOUT => $delai,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
        CURLOPT_USERAGENT => 'oree-mise-a-jour',
        CURLOPT_WRITEFUNCTION => function ($ch, string $morceau) use (&$raw, &$taille, $fh, $max): int {
            $taille += strlen($morceau);
            if ($taille > $max) return 0;
            if ($fh) return (int)fwrite($fh, $morceau);
            $raw .= $morceau;
            return strlen($morceau);
        },
    ]);
    $ok = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($fh) fclose($fh);
    if ($ok !== true || $code !== 200) {
        if ($fichier !== null) @unlink($fichier);
        return null;
    }
    return $fichier ?? $raw;
}

/**
 * Commit de `main` et étiquette qui le désigne, lus dans la liste des références du dépôt (protocole Git) :
 * ['commit' => 40 hex, 'version' => 'v2.14' ou null], ou null si la liste est illisible.
 */
function maj_refs_lire(string $raw): ?array
{
    $main = null;
    $tags = [];
    foreach (explode("\n", $raw) as $ligne) {
        if (!preg_match('~([0-9a-f]{40}) refs/(heads/main|tags/([^\s\x00^]+)(\^\{\})?)(?:\x00|$)~', $ligne, $m)) continue;
        if ($m[2] === 'heads/main') { $main = $m[1]; continue; }
        // étiquette annotée : la ligne « ^{} » donne le commit, et passe devant celle de l'objet étiquette
        if (($m[4] ?? '') === '^{}' || !isset($tags[$m[3]])) $tags[$m[3]] = $m[1];
    }
    if ($main === null) return null;
    $noms = array_keys(array_filter($tags, fn($c) => $c === $main));
    usort($noms, fn($a, $b) => version_compare(ltrim((string)$b, 'v'), ltrim((string)$a, 'v')));
    return ['commit' => $main, 'version' => $noms[0] ?? null];
}

/** Dernière version publiée, relue chez GitHub : ['commit', 'version'], ou null si GitHub ne répond pas. */
function maj_publiee_relire(array $cfg): ?array
{
    $raw = maj_appeler($cfg['maj_refs'], MAJ_REFS_MAX, MAJ_DELAI_REFS_S);
    return $raw === null ? null : maj_refs_lire($raw);
}

/**
 * Chemin d'une entrée de l'archive, relatif au dossier app/ ; null si elle ne s'installe pas : hors de app/, chemin
 * douteux, ce que deploy-prod.sh retire (essais, conception, documents) et ce que chaque installation garde à elle.
 */
function maj_chemin(string $entree): ?string
{
    $p = explode('/', str_replace('\\', '/', $entree), 3);
    if (count($p) < 3 || $p[1] !== 'app') return null;
    $rel = $p[2];
    if ($rel === '' || str_contains($rel, "\0") || str_starts_with($rel, '/') || preg_match('~(^|/)\.{1,2}(/|$)~', $rel)) return null;
    if (preg_match('~^(tests|\.impeccable|api/data)(/|$)~', $rel)) return null;
    if (str_starts_with($rel, 'design/reference.') || preg_match('~\.md$~i', $rel)) return null;
    if ($rel === 'api/config.php' || $rel === 'api/.htaccess') return null;
    return $rel;
}

/** Fichiers à installer, lus dans l'archive : [chemin relatif => contenu], triés. Lève une ApiError si elle est refusée. */
function maj_extraire(string $archive): array
{
    $refus = new ApiError(502, 'archive_invalide', 'L’archive reçue de GitHub est illisible ou incomplète. Rien n’a été changé.');
    try {
        $phar = new PharData($archive);
        $prefixe = 'phar://' . $archive . '/';
        $fichiers = [];
        $total = 0;
        foreach (new RecursiveIteratorIterator($phar) as $f) {
            if (!$f->isFile()) continue;
            $nom = (string)$f->getPathname();
            if (!str_starts_with($nom, $prefixe)) continue;
            $rel = maj_chemin(substr($nom, strlen($prefixe)));
            if ($rel === null) continue;
            $c = file_get_contents($nom);
            if (!is_string($c)) throw $refus;
            $total += strlen($c);
            if ($total > MAJ_GARDES_MAX || count($fichiers) >= MAJ_FICHIERS_MAX) throw $refus;
            $fichiers[$rel] = $c;
        }
    } catch (ApiError $e) {
        throw $e;
    } catch (Throwable $e) {
        error_log('oree maj: archive illisible : ' . $e->getMessage());
        throw $refus;
    }
    foreach (MAJ_REQUIS as $r) if (!isset($fichiers[$r])) throw $refus;
    ksort($fichiers, SORT_STRING);
    return $fichiers;
}

/**
 * Raison pour laquelle la mise à jour ne peut pas se faire ici, ou null : 'phar' ou 'curl' (extension de PHP absente),
 * 'ecriture' (PHP n'a pas le droit d'écrire dans un dossier ou un fichier du jeu).
 */
function maj_raison(string $racine, string $dataDir): ?string
{
    if (!class_exists('PharData')) return 'phar';
    if (!function_exists('curl_init')) return 'curl';
    $donnees = realpath($dataDir) ?: $dataDir;
    $it = new RecursiveIteratorIterator(
        new RecursiveCallbackFilterIterator(
            new RecursiveDirectoryIterator($racine, FilesystemIterator::SKIP_DOTS),
            fn(SplFileInfo $f) => (realpath($f->getPathname()) ?: '') !== $donnees && $f->getPathname() !== $racine . '/api/data'
        ),
        RecursiveIteratorIterator::SELF_FIRST
    );
    if (!is_writable($racine)) return 'ecriture';
    foreach ($it as $f) if (!is_writable($f->getPathname())) return 'ecriture';
    return null;
}

/** Vide un dossier de travail de la mise à jour (sous le dossier des données). */
function maj_vider(string $dir): void
{
    if (!is_dir($dir)) return;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($it as $f) $f->isDir() && !$f->isLink() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
    @rmdir($dir);
}

function maj_poser(string $fichier, string $contenu, int $mode): void
{
    $dir = dirname($fichier);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) throw server_error("dossier impossible à créer : $dir");
    atomic_write($fichier, $contenu, $mode);
}

/**
 * Copie les fichiers dans le dossier du jeu. Ceux qu'elle remplace sont d'abord gardés dans $precedente ; si une copie
 * échoue, ils sont remis et les fichiers nouveaux retirés. Renvoie le nombre de fichiers écrits.
 */
function maj_installer(string $racine, array $fichiers, string $precedente): int
{
    maj_vider($precedente);
    $aEcrire = [];
    foreach ($fichiers as $rel => $c) {
        $cible = $racine . '/' . $rel;
        if (is_file($cible)) {
            $ancien = file_get_contents($cible);
            if ($ancien === $c) continue;
            if (!is_string($ancien)) throw server_error("lecture impossible : $cible");
            maj_poser($precedente . '/' . $rel, $ancien, 0600);
        }
        $aEcrire[$rel] = $c;
    }
    $remplaces = [];
    $crees = [];
    try {
        foreach ($aEcrire as $rel => $c) {
            $cible = $racine . '/' . $rel;
            $existait = file_exists($cible);
            maj_poser($cible, $c, 0644);
            if ($existait) $remplaces[] = $rel; else $crees[] = $rel;
        }
    } catch (Throwable $e) {
        foreach ($remplaces as $rel) {
            try { maj_poser($racine . '/' . $rel, (string)file_get_contents($precedente . '/' . $rel), 0644); }
            catch (Throwable $e2) { error_log("oree maj: impossible de remettre $rel : " . $e2->getMessage()); }
        }
        foreach ($crees as $rel) @unlink($racine . '/' . $rel);
        error_log('oree maj: copie interrompue : ' . $e->getMessage());
        throw new ApiError(500, 'maj_echec', 'La mise à jour n’a pas pu se terminer. L’ancienne version est remise.');
    }
    if (function_exists('opcache_invalidate')) {
        foreach (array_keys($aEcrire) as $rel) if (str_ends_with($rel, '.php')) @opcache_invalidate($racine . '/' . $rel, true);
    }
    return count($aEcrire);
}

/** Ce que voit l'app : versions installée et publiée, et si la mise à jour peut se faire ici. */
function maj_vue(array $etat, string $racine, string $dataDir): array
{
    $installee = $etat['installee'] ?? null;
    $publiee = $etat['publiee'] ?? null;
    $raison = maj_raison($racine, $dataDir);
    return [
        'ok' => true,
        'actif' => true,
        'installee' => $installee,
        'publiee' => $publiee,
        'aJour' => is_array($installee) && is_array($publiee) && ($installee['commit'] ?? null) === ($publiee['commit'] ?? 0),
        'possible' => $raison === null,
        'raison' => $raison,
        'injoignable' => isset($etat['echec']), // la dernière relecture a échoué (une réussite l'efface)
    ];
}

function maj_main(): void
{
    try {
        $cfg = maj_config(load_config());
        $dataDir = rtrim($cfg['data'], '/\\');
        $now = time();
        check_access($cfg, $dataDir, $now);
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($method !== 'GET' && $method !== 'POST') {
            throw new ApiError(405, 'method_not_allowed', 'Méthode non permise.', [], ['Allow: GET, POST']);
        }
        if (!$cfg['maj']) {
            if ($method === 'GET') respond(200, ['ok' => true, 'actif' => false]);
            throw new ApiError(403, 'maj_off', 'La mise à jour depuis GitHub est coupée sur ce serveur.');
        }
        prepare_data_dir($dataDir);
        $racine = maj_racine();
        $etat = maj_lire($dataDir);

        if ($method === 'GET') {
            $lue = strtotime((string)($etat['publiee']['lue'] ?? '')) ?: 0;
            $essai = max($lue, (int)($etat['echec'] ?? 0));
            if ($now - $essai >= MAJ_RELIRE_S) {
                $fh = @fopen($dataDir . '/.maj.lock', 'c');
                if ($fh && flock($fh, LOCK_EX | LOCK_NB)) { // une mise à jour en cours : on répond avec ce qu'on sait
                    try {
                        $pub = maj_publiee_relire($cfg);
                        $etat = maj_lire($dataDir);
                        if ($pub !== null) { $etat['publiee'] = $pub + ['lue' => gmdate('Y-m-d\TH:i:s\Z', $now)]; unset($etat['echec']); }
                        else $etat['echec'] = $now;
                        maj_ecrire($dataDir, $etat);
                    } finally {
                        flock($fh, LOCK_UN);
                    }
                }
                if ($fh) fclose($fh);
            }
            respond(200, maj_vue($etat, $racine, $dataDir));
        }

        $ct = strtolower(trim(explode(';', (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''))[0]));
        $body = json_decode((string)file_get_contents('php://input', false, null, 0, 1024), false);
        if ($ct !== 'application/json' || !($body instanceof stdClass) || ($body->lancer ?? null) !== true) {
            throw bad('Corps attendu : {"lancer": true}.');
        }
        $raison = maj_raison($racine, $dataDir);
        if ($raison !== null) {
            throw new ApiError(503, 'maj_impossible', 'La mise à jour ne peut pas se faire sur ce serveur.', ['raison' => $raison]);
        }
        $fh = @fopen($dataDir . '/.maj.lock', 'c');
        if (!$fh || !flock($fh, LOCK_EX | LOCK_NB)) throw new ApiError(409, 'maj_en_cours', 'Une mise à jour est déjà en cours.');
        ignore_user_abort(true);
        @set_time_limit(300);
        try {
            $pub = maj_publiee_relire($cfg);
            if ($pub === null) throw new ApiError(502, 'github_injoignable', 'GitHub ne répond pas. Rien n’a été changé ; réessaie plus tard.');
            $etat = maj_lire($dataDir);
            $etat['publiee'] = $pub + ['lue' => gmdate('Y-m-d\TH:i:s\Z', $now)];
            unset($etat['echec']);
            if (($etat['installee']['commit'] ?? null) !== $pub['commit']) {
                $travail = $dataDir . '/maj';
                if (!is_dir($travail) && !@mkdir($travail, 0755, true) && !is_dir($travail)) throw server_error("dossier impossible à créer : $travail");
                // un nom par commit : PharData garde en mémoire ce qu'il a lu sous un nom de fichier
                $archive = maj_appeler($cfg['maj_archive'] . $pub['commit'], MAJ_ARCHIVE_MAX, MAJ_DELAI_ARCHIVE_S, $travail . '/archive-' . $pub['commit'] . '.tar.gz');
                if ($archive === null) throw new ApiError(502, 'github_injoignable', 'L’archive de GitHub n’a pas pu être téléchargée. Rien n’a été changé.');
                try {
                    $n = maj_installer($racine, maj_extraire($archive), $travail . '/precedente');
                } finally {
                    @unlink($archive);
                }
                $etat['installee'] = ['commit' => $pub['commit'], 'version' => $pub['version'], 'le' => gmdate('Y-m-d\TH:i:s\Z', $now), 'fichiers' => $n];
            }
            maj_ecrire($dataDir, $etat);
        } finally {
            flock($fh, LOCK_UN);
            fclose($fh);
        }
        respond(200, maj_vue($etat, $racine, $dataDir));
    } catch (ApiError $e) {
        fail($e);
    } catch (Throwable $e) {
        error_log('oree maj: ' . get_class($e) . ' : ' . $e->getMessage());
        if (!headers_sent()) respond(500, ['ok' => false, 'code' => 'server_error', 'error' => 'Erreur interne du serveur.']);
    }
}

if (!defined('OREE_MAJ_NO_RUN')) maj_main();
