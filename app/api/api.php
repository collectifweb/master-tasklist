<?php
declare(strict_types=1);

/**
 * API de « La lisière rallumée » : tâches (tasks.json), état du jeu et registre des gains.
 * Contrat : app/ARCHITECTURE.md, section « API ».
 */

const MAX_BODY = 512 * 1024;
const MAX_OPS_KEPT = 500;
const BACKUPS_KEPT = 14;
const BACKUP_DAYS = 30;
const LEDGER_DAYS = 60;
const LEDGER_MAX_ENTRIES = 50;
const LEDGER_MAX_ENTRY_BYTES = 2048;
const READ_RETRIES = 3;
const READ_RETRY_US = 200000;
const LOCK_WAIT_S = 5.0;
const TASKS_WRITE_ATTEMPTS = 3;
const LOCKOUT_MAX_FAILS = 5;          // jetons faux tolérés dans la fenêtre
const LOCKOUT_WINDOW_S = 900;         // fenêtre de comptage : 15 minutes
const LOCKOUT_DURATION_S = 900;       // durée du blocage : 15 minutes
const LOCKOUT_GLOBAL_MAX = 20;        // jetons faux tolérés dans la fenêtre, toutes adresses confondues
const LOCKOUT_GLOBAL_KEY = '*';       // entrée du budget commun (une clé d'adresse est un SHA-256, jamais « * »)
const LOCKOUT_DELAY_US = 250000;      // délai fixe après un jeton faux
const MIN_CLIENT = 2;                 // version d'app exigée pour écrire (la v1 n'envoie pas la sienne)
const GAME_V1_COPY = 'game-state.v1.json'; // copie de la partie v1, dans backups/ : hors de l'élagage (backup_names)

ini_set('display_errors', '0');
ini_set('log_errors', '1');

final class ApiError extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errCode,
        string $message,
        public readonly array $extra = [],
        public readonly array $headers = []
    ) {
        parent::__construct($message);
    }
}

/** Erreur 500 : le détail va au journal du serveur, jamais au client. */
function server_error(string $detail): ApiError
{
    error_log('oree api: ' . $detail);
    return new ApiError(500, 'server_error', 'Erreur interne du serveur.');
}

function jenc(mixed $v, int $flags = 0): string
{
    return json_encode($v, $flags | JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
}

function emit(int $status, string $json, array $headers = []): never
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        foreach ($headers as $h) header($h);
    }
    echo $json;
    exit;
}

function respond(int $status, array $payload, array $headers = []): never
{
    emit($status, jenc($payload, JSON_UNESCAPED_SLASHES), $headers);
}

function fail(ApiError $e): never
{
    respond($e->status, ['ok' => false, 'code' => $e->errCode, 'error' => $e->getMessage()] + $e->extra, $e->headers);
}

function bad(string $msg): ApiError
{
    return new ApiError(400, 'bad_request', $msg);
}

// ---------- Configuration : environnement, puis config.php, puis défauts ----------

function load_config(): array
{
    $cfg = [
        'tasks' => __DIR__ . '/../../tasks.json',
        'data' => __DIR__ . '/data',
        'hash' => '',
        'allow_open' => false,
        'allow_create' => false,
        'sandbox' => false, // version d'essai : « Jour suivant » permis (décalage de date dans la partie)
    ];
    $file = __DIR__ . '/config.php';
    if (is_file($file)) {
        require_once $file;
        if (defined('TASKS_FILE') && is_string(TASKS_FILE) && TASKS_FILE !== '') $cfg['tasks'] = TASKS_FILE;
        if (defined('DATA_DIR') && is_string(DATA_DIR) && DATA_DIR !== '') $cfg['data'] = DATA_DIR;
        if (defined('TOKEN_HASH') && is_string(TOKEN_HASH)) $cfg['hash'] = TOKEN_HASH;
        if (defined('ALLOW_OPEN')) $cfg['allow_open'] = (bool)ALLOW_OPEN;
        if (defined('ALLOW_CREATE_TASKS')) $cfg['allow_create'] = (bool)ALLOW_CREATE_TASKS;
        if (defined('SANDBOX')) $cfg['sandbox'] = (bool)SANDBOX;
    }
    foreach (['tasks' => 'OREE_TASKS_FILE', 'data' => 'OREE_DATA_DIR', 'hash' => 'OREE_TOKEN_HASH'] as $k => $name) {
        $v = getenv($name);
        if (is_string($v) && $v !== '') $cfg[$k] = $v;
    }
    foreach (['allow_open' => 'OREE_ALLOW_OPEN', 'allow_create' => 'OREE_ALLOW_CREATE_TASKS', 'sandbox' => 'OREE_SANDBOX'] as $k => $name) {
        $v = getenv($name);
        if (is_string($v) && $v !== '') $cfg[$k] = ($v === '1');
    }
    return $cfg;
}

// ---------- Authentification ----------

function bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    if ($h === null && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strcasecmp((string)$k, 'Authorization') === 0) { $h = $v; break; }
        }
    }
    if (!is_string($h) || !preg_match('/^Bearer\s+(\S+)\s*$/i', $h, $m)) return null;
    return $m[1];
}

/** Décision d'accès : null si permis, sinon l'erreur à renvoyer. Fermée par défaut. */
function auth_decision(string $hash, bool $allowOpen, string $sapi, ?string $token): ?ApiError
{
    if ($hash !== '') {
        if ($token !== null && hash_equals(strtolower($hash), hash('sha256', $token))) return null;
        return new ApiError(401, 'unauthorized', 'Accès refusé : code d’accès manquant ou invalide.', [], ['WWW-Authenticate: Bearer']);
    }
    if ($allowOpen || $sapi === 'cli-server') return null;
    return new ApiError(503, 'auth_not_configured', 'L’API n’est pas configurée : aucun jeton défini.');
}

// ---------- Blocage après jetons faux ----------

/**
 * Clé de blocage : l'adresse du visiteur, et en IPv6 son préfixe /64 (une seule machine en contrôle souvent des
 * milliards d'adresses). Jamais X-Forwarded-For ; l'adresse brute n'est pas gardée.
 */
function lockout_key(): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $bin = @inet_pton($ip);
    if (is_string($bin) && strlen($bin) === 16) {
        $ip = substr($bin, 0, 12) === str_repeat("\0", 10) . "\xff\xff"
            ? (string)inet_ntop(substr($bin, 12))   // IPv4 écrite en IPv6 (::ffff:a.b.c.d)
            : bin2hex(substr($bin, 0, 8)) . '::/64';
    }
    return hash('sha256', $ip);
}

/** Compteurs lus sans verrou (les écritures sont atomiques). Fichier absent ou abîmé : liste vide. */
function lockout_read(string $dataDir): array
{
    $raw = @file_get_contents($dataDir . '/lockout.json');
    $d = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($d) ? $d : [];
}

/** Secondes restantes de blocage pour cette clé, 0 si elle n'est pas bloquée. */
function lockout_remaining(array $all, string $key, int $now): int
{
    $until = $all[$key]['until'] ?? 0;
    return is_int($until) && $until > $now ? $until - $now : 0;
}

/** Une entrée compte encore si elle est bloquée ou a un échec dans la fenêtre ; sinon elle n'apporte rien et part. */
function lockout_live(mixed $e, int $now): bool
{
    if (!is_array($e)) return false;
    if (is_int($e['until'] ?? null) && $e['until'] > $now) return true;
    foreach ((array)($e['fails'] ?? []) as $t) {
        if (is_int($t) && $t > $now - LOCKOUT_WINDOW_S) return true;
    }
    return false;
}

/** Ajoute un échec à une entrée ; au seuil `$max` dans la fenêtre, elle est bloquée LOCKOUT_DURATION_S. */
function lockout_count(mixed $e, int $now, int $max): array
{
    $fails = array_values(array_filter((array)(is_array($e) ? ($e['fails'] ?? []) : []), fn($t) => is_int($t) && $t > $now - LOCKOUT_WINDOW_S));
    $fails[] = $now;
    return count($fails) >= $max ? ['fails' => [], 'until' => $now + LOCKOUT_DURATION_S] : ['fails' => $fails];
}

/**
 * Relit, modifie et réécrit le fichier de compteurs sous verrou, seulement s'il change. N'en retire que les entrées
 * sans information (ni blocage en cours, ni échec dans la fenêtre) : jamais un compteur vivant, sinon des adresses en
 * rotation pourraient faire effacer le leur. Sa taille reste bornée par le budget commun.
 */
function lockout_update(string $dataDir, int $now, callable $change): void
{
    prepare_data_dir($dataDir);
    $lock = lock_file($dataDir . '/.lockout.lock', LOCK_EX);
    try {
        $before = lockout_read($dataDir);
        $all = array_filter($change($before), fn($e) => lockout_live($e, $now));
        if ($all === $before) return;
        if ($all === []) {
            @unlink($dataDir . '/lockout.json');
        } else {
            atomic_write($dataDir . '/lockout.json', jenc($all), 0640);
        }
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function lockout_error(int $left): ApiError
{
    return new ApiError(429, 'too_many_attempts', 'Trop d’essais. Réessayez plus tard.', ['retryAfter' => $left], ['Retry-After: ' . $left]);
}

/** Requête sans jeton : rien à juger ; 429 si la clé ou le budget commun est bloqué (simple lecture). */
function lockout_guard(string $dataDir, int $now): void
{
    $all = lockout_read($dataDir);
    $left = max(lockout_remaining($all, LOCKOUT_GLOBAL_KEY, $now), lockout_remaining($all, lockout_key(), $now));
    if ($left > 0) throw lockout_error($left);
}

/**
 * Requête qui porte un jeton : sous un seul verrou, 429 si la clé ou le budget commun est bloqué (le jeton n'est alors
 * pas jugé), sinon compte le jeton faux (5 en 15 min par adresse, 20 en 15 min en tout = blocage de 15 min) ou remet le
 * compteur de l'adresse à zéro. Des requêtes simultanées ne
 * peuvent donc pas faire juger plus de LOCKOUT_MAX_FAILS jetons. Un jeton faux est ensuite ralenti.
 */
function lockout_attempt(string $dataDir, int $now, bool $wrong): void
{
    $key = lockout_key();
    $left = 0;
    lockout_update($dataDir, $now, function (array $all) use ($key, $now, $wrong, &$left): array {
        $left = max(lockout_remaining($all, LOCKOUT_GLOBAL_KEY, $now), lockout_remaining($all, $key, $now));
        if ($left > 0) return $all;
        if (!$wrong) {
            unset($all[$key]);
            return $all;
        }
        $all[$key] = lockout_count($all[$key] ?? null, $now, LOCKOUT_MAX_FAILS);
        $all[LOCKOUT_GLOBAL_KEY] = lockout_count($all[LOCKOUT_GLOBAL_KEY] ?? null, $now, LOCKOUT_GLOBAL_MAX);
        return $all;
    });
    if ($left > 0) throw lockout_error($left);
    if ($wrong) usleep(LOCKOUT_DELAY_US);
}

// ---------- Fichiers, verrous, sauvegardes ----------

function prepare_data_dir(string $dir): void
{
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw server_error("dossier de données impossible à créer : $dir");
    }
    if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', "Require all denied\n");
    if (!is_file($dir . '/.htaccess')) throw server_error("impossible de créer $dir/.htaccess");
    if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
    if (!is_dir($dir . '/backups') && !@mkdir($dir . '/backups', 0755, true) && !is_dir($dir . '/backups')) {
        throw server_error("dossier de sauvegardes impossible à créer : $dir/backups");
    }
}

/** Verrou non bloquant, réessayé 5 s au plus. */
function lock_file(string $path, int $mode)
{
    $fh = @fopen($path, 'c');
    if (!$fh) throw server_error("verrou impossible à ouvrir : $path");
    $deadline = microtime(true) + LOCK_WAIT_S;
    while (!flock($fh, $mode | LOCK_NB)) {
        if (microtime(true) >= $deadline) {
            fclose($fh);
            throw new ApiError(503, 'busy', 'Le serveur est occupé. Rien n’a été enregistré ; réessayez dans un instant.');
        }
        usleep(50000);
    }
    return $fh;
}

/** Écriture atomique. $precheck (facultatif) renvoie false pour renoncer au rename ; renvoie alors false. */
function atomic_write(string $file, string $content, int $mode, ?callable $precheck = null): bool
{
    $dir = dirname($file);
    $tmp = @tempnam($dir, '.tmp-');
    if ($tmp === false) throw server_error("fichier temporaire impossible dans $dir");
    if (realpath(dirname($tmp)) !== realpath($dir)) {
        @unlink($tmp);
        throw server_error("fichier temporaire hors du dossier de $file");
    }
    $fh = @fopen($tmp, 'wb');
    $ok = $fh && fwrite($fh, $content) === strlen($content) && fflush($fh) && fsync($fh);
    if ($fh) fclose($fh);
    if (!$ok) {
        @unlink($tmp);
        throw server_error("écriture impossible : $file");
    }
    @chmod($tmp, $mode);
    $hook = PHP_SAPI === 'cli' ? ($GLOBALS['oree_hook_before_rename'] ?? null) : null; // crochet réservé aux tests en ligne de commande
    if (is_callable($hook)) $hook($file);
    if ($precheck !== null && !$precheck()) {
        @unlink($tmp);
        return false;
    }
    if (!@rename($tmp, $file)) {
        @unlink($tmp);
        throw server_error("rename impossible : $file");
    }
    return true;
}

function stamp(): string
{
    return gmdate('Ymd-His') . '-' . sprintf('%06d', (int)((microtime(true) * 1000000) % 1000000));
}

function backup_names(string $dir, string $name): array
{
    $all = [];
    foreach (scandir($dir) ?: [] as $f) {
        if (str_starts_with($f, $name . '.') && str_ends_with($f, '.bak')) $all[] = $f;
    }
    sort($all, SORT_STRING);
    return $all;
}

function backup_day(string $name, string $file): ?string
{
    return preg_match('/^' . preg_quote($name, '/') . '\.(\d{8})-\d{6}-\d{6}/', $file, $m) ? $m[1] : null;
}

/** Copie le contenu (donné, ou lu dans le fichier) ; un échec refuse l'écriture (exception). Garde 14 copies + 1 par jour pendant 30 jours. */
function backup_file(string $file, string $dataDir, string $tag, bool $oncePerDay = false, ?string $content = null): void
{
    if ($content === null && !is_file($file)) return;
    $name = basename($file);
    $dir = $dataDir . '/backups';
    if ($oncePerDay) {
        $today = gmdate('Ymd');
        foreach (backup_names($dir, $name) as $f) if (backup_day($name, $f) === $today) return;
    }
    $dest = "$dir/$name." . stamp() . "-$tag.bak";
    $content ??= @file_get_contents($file);
    if (!is_string($content) || @file_put_contents($dest, $content) !== strlen($content)) {
        @unlink($dest);
        throw server_error("sauvegarde impossible : $file");
    }
    $all = backup_names($dir, $name);
    $keep = array_flip(array_slice($all, -BACKUPS_KEPT));
    $lastOfDay = [];
    foreach ($all as $f) {
        $d = backup_day($name, $f);
        if ($d !== null) $lastOfDay[$d] = $f;
    }
    $limit = gmdate('Ymd', time() - BACKUP_DAYS * 86400);
    foreach ($lastOfDay as $d => $f) if ($d >= $limit) $keep[$f] = true;
    foreach ($all as $f) if (!isset($keep[$f])) @unlink("$dir/$f");
}

/** Version d'une partie ; sans champ `version`, c'est une partie v1 (même règle que core/state.js). */
function game_version(stdClass $game): float
{
    return isset($game->version) && (is_int($game->version) || is_float($game->version)) ? (float)$game->version : 1.0;
}

/** Copie de la partie v1 au passage en v2 : une seule fois, jamais remplacée ; un échec refuse l'écriture. */
function keep_v1_copy(string $dataDir, string $v1Raw): void
{
    $dest = $dataDir . '/backups/' . GAME_V1_COPY;
    if (is_file($dest)) return;
    atomic_write($dest, $v1Raw, 0600);
}

// ---------- Lecture des données ----------

function has_non_finite(mixed $v): bool
{
    if (is_float($v)) return !is_finite($v);
    if (is_array($v) || $v instanceof stdClass) {
        foreach ($v as $x) if (has_non_finite($x)) return true;
    }
    return false;
}

function unreadable_tasks(): ApiError
{
    return new ApiError(503, 'tasks_unreadable', 'Le fichier des tâches est momentanément illisible. Rien n’a été enregistré ; réessayez dans un instant.');
}

/** Signature légère d'un fichier (inode, taille, date) : sert à détecter un remplacement à la dernière milliseconde. */
function file_sig(string $f): string
{
    clearstatcache(true, $f);
    $st = @stat($f);
    return $st ? $st['ino'] . '-' . $st['size'] . '-' . $st['mtime'] : '';
}

/** Lit tasks.json (chemin résolu par realpath) ; réessaie brièvement s'il est illisible. */
function read_tasks(array $cfg): array
{
    for ($i = 0; $i <= READ_RETRIES; $i++) {
        if ($i > 0) usleep(READ_RETRY_US);
        clearstatcache(true);
        $real = @realpath($cfg['tasks']);
        if ($real === false) {
            if (!$cfg['allow_create']) {
                throw new ApiError(503, 'tasks_missing', 'Le fichier des tâches est introuvable. Rien n’a été enregistré.');
            }
            $dir = @realpath(dirname($cfg['tasks']));
            if ($dir === false) throw server_error('dossier de tasks.json introuvable');
            return ['raw' => '', 'tasks' => [], 'real' => $dir . '/' . basename($cfg['tasks']), 'exists' => false, 'sig' => ''];
        }
        $sig = file_sig($real);
        $raw = is_file($real) ? @file_get_contents($real) : false;
        if (!is_string($raw)) continue;
        $data = json_decode($raw, false, 512);
        if (!is_array($data)) continue;
        if (has_non_finite($data)) throw unreadable_tasks();
        return ['raw' => $raw, 'tasks' => $data, 'real' => $real, 'exists' => true, 'sig' => $sig];
    }
    throw unreadable_tasks();
}

function read_game(string $file): array
{
    if (!is_file($file)) return ['raw' => null, 'game' => null, 'rev' => null];
    $raw = @file_get_contents($file);
    $game = is_string($raw) ? json_decode($raw, false, 512) : null;
    if (!($game instanceof stdClass)) throw server_error('game-state.json illisible');
    return ['raw' => $raw, 'game' => $game, 'rev' => sha1($raw)];
}

/** Registre : entrées récentes (60 jours, selon `at`) et toutes les clés. */
function read_ledger(string $file): array
{
    $out = ['recent' => [], 'keys' => []];
    if (!is_file($file)) return $out;
    $fh = @fopen($file, 'rb');
    if (!$fh) throw server_error('ledger.jsonl illisible');
    while (($line = fgets($fh)) !== false) {
        $line = trim($line);
        if ($line === '') continue;
        $e = json_decode($line, false, 512);
        if (!($e instanceof stdClass)) continue;
        ledger_add($out, $e);
    }
    fclose($fh);
    return $out;
}

function ledger_add(array &$state, stdClass $e): void
{
    if (isset($e->key) && is_string($e->key)) $state['keys'][$e->key] = true;
    $ts = isset($e->at) && is_string($e->at) ? strtotime($e->at) : false;
    if ($ts === false || $ts >= time() - LEDGER_DAYS * 86400) $state['recent'][] = $e;
}

function read_ops(string $file): array
{
    if (!is_file($file)) return [];
    $raw = @file_get_contents($file);
    $d = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($d)) throw new ApiError(503, 'ops_unreadable', 'Le journal des opérations est illisible. Rien n’a été enregistré.');
    $out = [];
    foreach ($d as $o) {
        if (!is_array($o) || !isset($o['id'], $o['h']) || !is_string($o['id']) || !is_string($o['h'])) {
            throw new ApiError(503, 'ops_unreadable', 'Le journal des opérations est illisible. Rien n’a été enregistré.');
        }
        $out[] = $o;
    }
    return $out;
}

/** Charge utile des réponses ; `sandbox: true` seulement en version d'essai (l'interface montre alors « Jour suivant »). */
function state_payload(array $t, array $g, array $l, bool $sandbox): array
{
    return [
        'revision' => sha1($t['raw']),
        'tasks' => $t['tasks'],
        'game' => $g['game'],
        'gameRevision' => $g['rev'],
        'ledger' => $l['recent'],
        'ledgerKeys' => array_map('strval', array_keys($l['keys'])),
    ] + ($sandbox ? ['sandbox' => true] : []);
}

// ---------- Opérations ----------

function id_ok(mixed $v): bool
{
    return (is_string($v) || is_int($v)) && (string)$v !== '';
}

/** Valide la forme de toutes les opérations (400) et les range par nature. */
function parse_ops(array $ops): array
{
    $r = ['task' => [], 'entries' => [], 'game' => null, 'baseRev' => null];
    foreach ($ops as $n => $op) {
        $at = 'Opération n° ' . ($n + 1);
        if (!($op instanceof stdClass) || !isset($op->type) || !is_string($op->type)) throw bad("$at invalide.");
        switch ($op->type) {
            case 'task.upsert':
                $in = $op->task ?? null;
                if (!($in instanceof stdClass) || !isset($in->id) || !id_ok($in->id)) throw bad("$at : la tâche doit avoir un identifiant.");
                $r['task'][] = $op;
                break;
            case 'task.delete':
                if (!isset($op->id) || !id_ok($op->id)) throw bad("$at : identifiant manquant.");
                $r['task'][] = $op;
                break;
            case 'ledger.append':
                if (!isset($op->entries) || !is_array($op->entries)) throw bad("$at : liste d’entrées manquante.");
                foreach ($op->entries as $e) {
                    if (!($e instanceof stdClass) || !isset($e->key) || !is_string($e->key) || $e->key === '') throw bad("$at : chaque entrée du registre doit avoir une clé.");
                    if (strlen(jenc($e)) > LEDGER_MAX_ENTRY_BYTES) throw bad("$at : une entrée du registre dépasse 2 Kio.");
                    $r['entries'][] = $e;
                }
                if (count($r['entries']) > LEDGER_MAX_ENTRIES) throw bad('Au plus ' . LEDGER_MAX_ENTRIES . ' entrées de registre par requête.');
                break;
            case 'game.set':
                if ($r['game'] !== null) throw bad("$at : un seul game.set par requête.");
                if (!property_exists($op, 'baseGameRevision') || !(is_string($op->baseGameRevision) || $op->baseGameRevision === null)) throw bad("$at : baseGameRevision requis.");
                if (!isset($op->game) || !($op->game instanceof stdClass)) throw bad("$at : état du jeu invalide.");
                $r['game'] = $op->game;
                $r['baseRev'] = $op->baseGameRevision;
                break;
            default:
                throw bad('Type d’opération inconnu.');
        }
    }
    return $r;
}

function find_task_index(array $tasks, string $id): ?int
{
    foreach ($tasks as $i => $t) {
        if ($t instanceof stdClass && isset($t->id) && (is_string($t->id) || is_int($t->id)) && (string)$t->id === $id) return $i;
    }
    return null;
}

/** Applique les opérations sur les tâches ; renvoie true si quelque chose a changé. */
function apply_task_ops(array &$tasks, array $taskOps): bool
{
    $changed = false;
    foreach ($taskOps as $op) {
        if ($op->type === 'task.upsert') {
            $in = $op->task;
            $idx = find_task_index($tasks, (string)$in->id);
            if ($idx === null) {
                $tasks[] = clone $in;
            } else {
                foreach (get_object_vars($in) as $k => $v) {
                    if ($k === 'id') continue; // le type d'origine de l'identifiant est conservé
                    $tasks[$idx]->$k = $v;
                }
            }
            $changed = true;
        } else {
            $idx = find_task_index($tasks, (string)$op->id);
            if ($idx !== null) {
                array_splice($tasks, $idx, 1);
                $changed = true;
            }
        }
    }
    return $changed;
}

/**
 * Écrit tasks.json sous verrou voisin ; relit et réapplique si le fichier a changé
 * entre la lecture et le rename (écrivain externe sans verrou).
 * Renvoie [état tasks, fonction d'annulation|null].
 */
function write_tasks(array $cfg, string $dataDir, array $taskOps): array
{
    $first = read_tasks($cfg);
    $lock = lock_file($first['real'] . '.lock', LOCK_EX);
    try {
        for ($attempt = 1; $attempt <= TASKS_WRITE_ATTEMPTS; $attempt++) {
            $t = read_tasks($cfg); // relu après la prise du verrou
            $tasks = $t['tasks'];
            if (!apply_task_ops($tasks, $taskOps)) return [$t, null];
            $json = jenc($tasks, JSON_PRETTY_PRINT) . "\n";
            $real = $t['real'];
            if ($t['exists']) backup_file($real, $dataDir, 'avant', false, $t['raw']);
            $baseSha = $t['exists'] ? sha1($t['raw']) : null;
            $sig = $t['sig'] ?? '';
            // Empreinte du contenu, puis signature (le contrôle le plus court en dernier : fenêtre minimale).
            $precheck = fn(): bool => (is_file($real) ? sha1_file($real) : null) === $baseSha && ($sig === '' || file_sig($real) === $sig);
            if (!atomic_write($real, $json, 0644, $precheck)) continue;
            backup_file($real, $dataDir, 'apres', false, $json);
            $prev = $t['exists'] ? $t['raw'] : null;
            $undo = function () use ($real, $json, $prev): void { restore_file($real, $prev, $json, 0644); };
            return [['raw' => $json, 'tasks' => $tasks, 'real' => $real, 'exists' => true], $undo];
        }
        throw new ApiError(503, 'tasks_changed', 'Le fichier des tâches change sans arrêt. Rien n’a été enregistré ; réessayez dans un instant.');
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function restore_file(string $file, ?string $prev, string $writtenJson, int $mode): void
{
    if (is_file($file) && sha1_file($file) !== sha1($writtenJson)) return;
    if ($prev === null) @unlink($file); else atomic_write($file, $prev, $mode);
}

// ---------- Programme principal ----------

function read_body(): string
{
    if (isset($GLOBALS['oree_body_override'])) return (string)$GLOBALS['oree_body_override'];
    return (string)file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
}

function handle(): void
{
    $cfg = load_config();
    $token = bearer_token();
    $dataDir = rtrim($cfg['data'], '/\\');
    $guarded = $cfg['hash'] !== '';
    $now = time();
    $denied = auth_decision($cfg['hash'], $cfg['allow_open'], PHP_SAPI, $token);
    if ($guarded) {
        if ($token === null) lockout_guard($dataDir, $now);
        else lockout_attempt($dataDir, $now, $denied !== null); // avec le hash réglé, un jeton refusé est un jeton faux
    }
    if ($denied) throw $denied;

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'GET' && $method !== 'POST') {
        throw new ApiError(405, 'method_not_allowed', 'Méthode non permise.', [], ['Allow: GET, POST']);
    }

    $body = null;
    $opsHash = '';
    if ($method === 'POST') {
        $ct = strtolower(trim(explode(';', (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''))[0]));
        if ($ct !== 'application/json') throw new ApiError(415, 'unsupported_media_type', 'Type de contenu non pris en charge : application/json attendu.');
        $len = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($len > MAX_BODY) throw new ApiError(413, 'payload_too_large', 'Requête trop volumineuse (512 Kio au plus).');
        $raw = read_body();
        if (strlen($raw) > MAX_BODY) throw new ApiError(413, 'payload_too_large', 'Requête trop volumineuse (512 Kio au plus).');
        $body = json_decode($raw, false, 512);
        if (!($body instanceof stdClass)) throw new ApiError(400, 'invalid_json', 'Corps de requête invalide : un objet JSON est attendu.');
        if (!isset($body->opId) || !is_string($body->opId) || $body->opId === '' || strlen($body->opId) > 200) throw new ApiError(400, 'missing_op_id', 'Identifiant d’opération (opId) manquant ou invalide.');
        if (!isset($body->ops) || !is_array($body->ops)) throw bad('Liste d’opérations (ops) manquante.');
        if (has_non_finite($body)) throw bad('Nombre non valide (infini) refusé.');
        $parsed = parse_ops($body->ops);
        $opsHash = sha1(jenc($body->ops));
        // L'ancienne app n'envoie pas sa version : un onglet v1 resté ouvert réécrirait la partie v2 avec ses valeurs v1.
        // Refus avant tout verrou ni écriture. Code hors de ceux que la v1 traite en conflit (aiguillage sur `code` dans
        // son js/store.js) : elle écarte le geste avec ce message, sans nouvelle tentative.
        if (!is_int($body->client ?? null) || $body->client < MIN_CLIENT) {
            throw new ApiError(409, 'client_outdated', 'L’app a été mise à jour : recharge la page.');
        }
        // Décalage de date (« Jour suivant ») : version d'essai seulement, pour qu'il n'atteigne jamais la production.
        if (!$cfg['sandbox'] && $parsed['game'] !== null && isset($parsed['game']->horloge)) {
            throw new ApiError(409, 'sandbox_only', 'Le décalage de date ne sert qu’à la version d’essai. Rien n’a été enregistré.');
        }
    }

    prepare_data_dir($dataDir);
    $gameFile = $dataDir . '/game-state.json';
    $ledgerFile = $dataDir . '/ledger.jsonl';
    $opsFile = $dataDir . '/ops.json';

    if ($method === 'GET') {
        $lock = lock_file($dataDir . '/.lock', LOCK_SH);
        $t = read_tasks($cfg);
        $g = read_game($gameFile);
        $l = read_ledger($ledgerFile);
        flock($lock, LOCK_UN);
        respond(200, state_payload($t, $g, $l, $cfg['sandbox']));
    }

    $lock = lock_file($dataDir . '/.lock', LOCK_EX);
    // Tout est relu après la prise du verrou.
    $ops = read_ops($opsFile);
    foreach ($ops as $o) {
        if ($o['id'] === $body->opId) {
            if ($o['h'] !== $opsHash) {
                throw new ApiError(409, 'op_id_reused', 'Cet identifiant d’opération a déjà servi pour une autre requête. Rien n’a été enregistré.');
            }
            $t = read_tasks($cfg);
            respond(200, ['ok' => true, 'replay' => true, 'applied' => $body->opId] + state_payload($t, read_game($gameFile), read_ledger($ledgerFile), $cfg['sandbox']));
        }
    }

    $g = read_game($gameFile);
    $l = read_ledger($ledgerFile);

    // Contrôles qui dépendent de l'état courant, avant toute écriture.
    $seen = $l['keys'];
    foreach ($parsed['entries'] as $e) {
        if (isset($seen[$e->key])) {
            throw new ApiError(409, 'duplicate_key', 'Ce gain est déjà inscrit au registre. Rien n’a été enregistré.', ['key' => $e->key]);
        }
        $seen[$e->key] = true;
    }
    if ($parsed['game'] !== null && $parsed['baseRev'] !== $g['rev']) {
        $t = read_tasks($cfg);
        respond(409, ['ok' => false, 'code' => 'game_conflict', 'error' => 'L’état du jeu a changé ailleurs. Rien n’a été enregistré.'] + state_payload($t, $g, $l, $cfg['sandbox']));
    }

    // Écritures, dans l'ordre : tasks.json, game-state.json, registre, ops.json. Annulées en cas d'échec.
    $undo = [];
    try {
        // Passage de la partie de la version 1 à 2 : la partie v1 est d'abord copiée telle quelle (jamais effacée).
        if ($parsed['game'] !== null && $g['game'] !== null && game_version($g['game']) < 2 && game_version($parsed['game']) >= 2) {
            keep_v1_copy($dataDir, $g['raw']);
        }
        if ($parsed['task']) {
            [$t, $u] = write_tasks($cfg, $dataDir, $parsed['task']);
            if ($u) $undo[] = $u;
        } else {
            $t = read_tasks($cfg);
        }

        $newGameJson = null;
        if ($parsed['game'] !== null) {
            $newGameJson = jenc($parsed['game'], JSON_PRETTY_PRINT) . "\n";
            $g2 = ['raw' => $newGameJson, 'game' => $parsed['game'], 'rev' => sha1($newGameJson)];
        } else {
            $g2 = $g;
        }
        $l2 = $l;
        $lines = '';
        foreach ($parsed['entries'] as $e) {
            $lines .= jenc($e, JSON_UNESCAPED_SLASHES) . "\n";
            ledger_add($l2, $e);
        }
        $ops[] = ['id' => $body->opId, 'h' => $opsHash];
        $ops = array_slice($ops, -MAX_OPS_KEPT);
        $opsJson = jenc($ops) . "\n";
        $responseJson = jenc(['ok' => true, 'applied' => $body->opId] + state_payload($t, $g2, $l2, $cfg['sandbox']), JSON_UNESCAPED_SLASHES);

        if ($newGameJson !== null) {
            $prevRaw = $g['raw'];
            if ($prevRaw !== null) backup_file($gameFile, $dataDir, 'avant', false, $prevRaw);
            atomic_write($gameFile, $newGameJson, 0600);
            $undo[] = function () use ($gameFile, $prevRaw, $newGameJson): void { restore_file($gameFile, $prevRaw, $newGameJson, 0600); };
            backup_file($gameFile, $dataDir, 'apres', false, $newGameJson);
        }
        if ($lines !== '') {
            backup_file($ledgerFile, $dataDir, 'jour', true);
            $oldSize = is_file($ledgerFile) ? (int)filesize($ledgerFile) : null;
            $prefix = '';
            if ($oldSize) {
                $fh = fopen($ledgerFile, 'rb');
                fseek($fh, -1, SEEK_END);
                if (fread($fh, 1) !== "\n") $prefix = "\n";
                fclose($fh);
            }
            $data = $prefix . $lines;
            $undo[] = function () use ($ledgerFile, $oldSize): void {
                if ($oldSize === null) { @unlink($ledgerFile); return; }
                $fh = @fopen($ledgerFile, 'cb');
                if ($fh) { ftruncate($fh, $oldSize); fclose($fh); }
            };
            if (@file_put_contents($ledgerFile, $data, FILE_APPEND | LOCK_EX) !== strlen($data)) {
                throw server_error('ajout au registre impossible');
            }
            @chmod($ledgerFile, 0600);
        }
        atomic_write($opsFile, $opsJson, 0600);
    } catch (Throwable $e) {
        foreach (array_reverse($undo) as $u) {
            try { $u(); } catch (Throwable $e2) { error_log('oree api: restauration impossible : ' . $e2->getMessage()); }
        }
        throw $e instanceof ApiError ? $e : server_error(get_class($e) . ' : ' . $e->getMessage());
    }

    flock($lock, LOCK_UN);
    emit(200, $responseJson);
}

function main(): void
{
    try {
        handle();
    } catch (ApiError $e) {
        fail($e);
    } catch (Throwable $e) {
        error_log('oree api: ' . get_class($e) . ' : ' . $e->getMessage());
        if (!headers_sent()) respond(500, ['ok' => false, 'code' => 'server_error', 'error' => 'Erreur interne du serveur.']);
    }
}

if (!defined('OREE_API_NO_RUN')) main();
