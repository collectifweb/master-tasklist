<?php
declare(strict_types=1);

/**
 * API de « La lisière rallumée » : tâches (tasks.json), état du jeu et registre des gains.
 * Contrat : app/ARCHITECTURE.md, section « API ».
 */

const MAX_BODY = 512 * 1024;
const MAX_OPS_KEPT = 500;
const BACKUPS_KEPT = 14;
const READ_RETRIES = 3;
const READ_RETRY_US = 200000;

ini_set('display_errors', '0');
ini_set('log_errors', '1');

final class ApiError extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errCode,
        string $message,
        public readonly array $extra = [],
        public readonly ?array $headers = null
    ) {
        parent::__construct($message);
    }
}

function respond(int $status, array $payload, array $headers = []): never
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        foreach ($headers as $h) {
            header($h);
        }
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(ApiError $e): never
{
    respond($e->status, ['ok' => false, 'code' => $e->errCode, 'error' => $e->getMessage()] + $e->extra, $e->headers ?? []);
}

// ---------- Configuration : environnement, puis config.php, puis défauts ----------

function load_config(): array
{
    $cfg = ['tasks' => __DIR__ . '/../../tasks.json', 'data' => __DIR__ . '/data', 'hash' => ''];
    $file = __DIR__ . '/config.php';
    if (is_file($file)) {
        require_once $file;
        if (defined('TASKS_FILE') && is_string(TASKS_FILE) && TASKS_FILE !== '') $cfg['tasks'] = TASKS_FILE;
        if (defined('DATA_DIR') && is_string(DATA_DIR) && DATA_DIR !== '') $cfg['data'] = DATA_DIR;
        if (defined('TOKEN_HASH') && is_string(TOKEN_HASH)) $cfg['hash'] = TOKEN_HASH;
    }
    foreach (['tasks' => 'OREE_TASKS_FILE', 'data' => 'OREE_DATA_DIR', 'hash' => 'OREE_TOKEN_HASH'] as $k => $name) {
        $v = getenv($name);
        if (is_string($v) && $v !== '') $cfg[$k] = $v;
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

function require_auth(string $hash): void
{
    if ($hash === '') return;
    $t = bearer_token();
    if ($t === null || !password_verify($t, $hash)) {
        throw new ApiError(401, 'unauthorized', 'Accès refusé : jeton manquant ou invalide.', [], ['WWW-Authenticate: Bearer']);
    }
}

// ---------- Fichiers ----------

function prepare_data_dir(string $dir): void
{
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new ApiError(500, 'server_error', 'Dossier de données inaccessible.');
        }
    }
    if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', "Require all denied\n");
    if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
    if (!is_dir($dir . '/backups')) @mkdir($dir . '/backups', 0755, true);
}

function atomic_write(string $file, string $content, int $mode): void
{
    $tmp = @tempnam(dirname($file), '.tmp-');
    if ($tmp === false) throw new ApiError(500, 'server_error', 'Écriture impossible.');
    if (@file_put_contents($tmp, $content, LOCK_EX) !== strlen($content)) {
        @unlink($tmp);
        throw new ApiError(500, 'server_error', 'Écriture impossible.');
    }
    @chmod($tmp, $mode);
    if (!@rename($tmp, $file)) {
        @unlink($tmp);
        throw new ApiError(500, 'server_error', 'Écriture impossible.');
    }
}

function backup_file(string $file, string $dataDir): void
{
    if (!is_file($file)) return;
    $name = basename($file);
    $dir = $dataDir . '/backups';
    $stamp = gmdate('Ymd-His') . '-' . sprintf('%06d', (int)((microtime(true) * 1000000) % 1000000));
    @copy($file, "$dir/$name.$stamp.bak");
    $all = [];
    foreach (scandir($dir) ?: [] as $f) {
        if (str_starts_with($f, $name . '.') && str_ends_with($f, '.bak')) $all[] = $f;
    }
    sort($all, SORT_STRING);
    foreach (array_slice($all, 0, max(0, count($all) - BACKUPS_KEPT)) as $old) @unlink("$dir/$old");
}

/** Lit tasks.json ; réessaie brièvement s'il est illisible (copie SSH en cours). */
function read_tasks(string $file): array
{
    for ($i = 0; $i <= READ_RETRIES; $i++) {
        if ($i > 0) usleep(READ_RETRY_US);
        clearstatcache(true, $file);
        if (!file_exists($file)) return ['raw' => '', 'tasks' => []];
        $raw = @file_get_contents($file);
        if (!is_string($raw)) continue;
        $data = json_decode($raw, false, 512);
        if (is_array($data)) return ['raw' => $raw, 'tasks' => $data];
    }
    throw new ApiError(503, 'tasks_unreadable', 'Le fichier des tâches est momentanément illisible. Rien n’a été enregistré ; réessayez dans un instant.');
}

function read_game(string $file): array
{
    if (!is_file($file)) return ['raw' => null, 'game' => null, 'rev' => null];
    $raw = @file_get_contents($file);
    $game = is_string($raw) ? json_decode($raw, false, 512) : null;
    if (!($game instanceof stdClass)) throw new ApiError(500, 'server_error', 'État du jeu illisible.');
    return ['raw' => $raw, 'game' => $game, 'rev' => sha1($raw)];
}

function read_ledger(string $file): array
{
    $out = [];
    if (!is_file($file)) return $out;
    $fh = @fopen($file, 'rb');
    if (!$fh) throw new ApiError(500, 'server_error', 'Registre illisible.');
    while (($line = fgets($fh)) !== false) {
        $line = trim($line);
        if ($line === '') continue;
        $e = json_decode($line, false, 512);
        if ($e instanceof stdClass) $out[] = $e;
    }
    fclose($fh);
    return $out;
}

function read_ops(string $file): array
{
    if (!is_file($file)) return [];
    $d = json_decode((string)@file_get_contents($file), true);
    return is_array($d) ? array_values(array_filter($d, 'is_string')) : [];
}

function state_payload(array $t, array $g, array $ledger): array
{
    return [
        'revision' => sha1($t['raw']),
        'tasks' => $t['tasks'],
        'game' => $g['game'],
        'gameRevision' => $g['rev'],
        'ledger' => $ledger,
    ];
}

function open_lock(string $dataDir, int $mode)
{
    $fh = @fopen($dataDir . '/.lock', 'c');
    if (!$fh || !flock($fh, $mode)) throw new ApiError(500, 'server_error', 'Verrou indisponible.');
    return $fh;
}

// ---------- Opérations ----------

function bad(string $msg): ApiError
{
    return new ApiError(400, 'bad_request', $msg);
}

function find_task_index(array $tasks, string $id): ?int
{
    foreach ($tasks as $i => $t) {
        if ($t instanceof stdClass && isset($t->id) && (is_string($t->id) || is_int($t->id)) && (string)$t->id === $id) return $i;
    }
    return null;
}

function apply_ops(array $ops, array &$tasks, array &$ledger, array &$game, array &$flags, array $gameCur): void
{
    $keys = [];
    foreach ($ledger as $e) if (isset($e->key) && is_string($e->key)) $keys[$e->key] = true;

    foreach ($ops as $n => $op) {
        if (!($op instanceof stdClass) || !isset($op->type) || !is_string($op->type)) throw bad("Opération n° " . ($n + 1) . " invalide.");
        switch ($op->type) {
            case 'task.upsert':
                $in = $op->task ?? null;
                if (!($in instanceof stdClass) || !isset($in->id) || !(is_string($in->id) || is_int($in->id)) || (string)$in->id === '') {
                    throw bad("Opération n° " . ($n + 1) . " : la tâche doit avoir un identifiant.");
                }
                $idx = find_task_index($tasks, (string)$in->id);
                if ($idx === null) {
                    $tasks[] = $in;
                } else {
                    foreach (get_object_vars($in) as $k => $v) $tasks[$idx]->$k = $v;
                }
                $flags['tasks'] = true;
                break;
            case 'task.delete':
                if (!isset($op->id) || !(is_string($op->id) || is_int($op->id)) || (string)$op->id === '') throw bad("Opération n° " . ($n + 1) . " : identifiant manquant.");
                $idx = find_task_index($tasks, (string)$op->id);
                if ($idx !== null) {
                    array_splice($tasks, $idx, 1);
                    $flags['tasks'] = true;
                }
                break;
            case 'ledger.append':
                if (!isset($op->entries) || !is_array($op->entries)) throw bad("Opération n° " . ($n + 1) . " : liste d’entrées manquante.");
                foreach ($op->entries as $e) {
                    if (!($e instanceof stdClass) || !isset($e->key) || !is_string($e->key) || $e->key === '') throw bad("Opération n° " . ($n + 1) . " : chaque entrée du registre doit avoir une clé.");
                    if (isset($keys[$e->key])) {
                        throw new ApiError(409, 'duplicate_key', 'Ce gain est déjà inscrit au registre. Rien n’a été enregistré.', ['key' => $e->key]);
                    }
                    $keys[$e->key] = true;
                    $ledger[] = $e;
                    $flags['ledger'][] = $e;
                }
                break;
            case 'game.set':
                if (!property_exists($op, 'baseGameRevision') || !(is_string($op->baseGameRevision) || $op->baseGameRevision === null)) throw bad("Opération n° " . ($n + 1) . " : baseGameRevision requis.");
                if (!isset($op->game) || !($op->game instanceof stdClass)) throw bad("Opération n° " . ($n + 1) . " : état du jeu invalide.");
                if ($op->baseGameRevision !== $gameCur['rev']) {
                    throw new ApiError(409, 'game_conflict', 'L’état du jeu a changé ailleurs. Rien n’a été enregistré.', ['conflict' => true]);
                }
                $game = ['game' => $op->game];
                $flags['game'] = true;
                // Les set suivants du même lot s'appuient sur la révision de départ : un seul game.set par lot.
                $gameCur = ['rev' => '__pending__'];
                break;
            default:
                throw bad("Type d’opération inconnu : « " . mb_substr($op->type, 0, 40) . " ».");
        }
    }
}

// ---------- Programme principal ----------

function main(): void
{
    $cfg = load_config();
    require_auth($cfg['hash']);

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'GET' && $method !== 'POST') {
        throw new ApiError(405, 'method_not_allowed', 'Méthode non permise.', [], ['Allow: GET, POST']);
    }

    $body = null;
    if ($method === 'POST') {
        $len = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($len > MAX_BODY) throw new ApiError(413, 'payload_too_large', 'Requête trop volumineuse (512 Kio au plus).');
        $raw = (string)file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
        if (strlen($raw) > MAX_BODY) throw new ApiError(413, 'payload_too_large', 'Requête trop volumineuse (512 Kio au plus).');
        $body = json_decode($raw, false, 512);
        if (!($body instanceof stdClass)) throw new ApiError(400, 'invalid_json', 'Corps de requête invalide : un objet JSON est attendu.');
        if (!isset($body->opId) || !is_string($body->opId) || $body->opId === '' || strlen($body->opId) > 200) throw new ApiError(400, 'missing_op_id', 'Identifiant d’opération (opId) manquant ou invalide.');
        if (!isset($body->ops) || !is_array($body->ops)) throw new ApiError(400, 'bad_request', 'Liste d’opérations (ops) manquante.');
    }

    $dataDir = rtrim($cfg['data'], '/\\');
    prepare_data_dir($dataDir);
    $tasksFile = $cfg['tasks'];
    $gameFile = $dataDir . '/game-state.json';
    $ledgerFile = $dataDir . '/ledger.jsonl';
    $opsFile = $dataDir . '/ops.json';

    if ($method === 'GET') {
        $lock = open_lock($dataDir, LOCK_SH);
        $t = read_tasks($tasksFile);
        $g = read_game($gameFile);
        $l = read_ledger($ledgerFile);
        flock($lock, LOCK_UN);
        respond(200, state_payload($t, $g, $l));
    }

    $lock = open_lock($dataDir, LOCK_EX);
    // Tout est relu après la prise du verrou.
    $t = read_tasks($tasksFile);
    $g = read_game($gameFile);
    $ledger = read_ledger($ledgerFile);
    $ops = read_ops($opsFile);

    if (in_array($body->opId, $ops, true)) {
        respond(200, ['ok' => true, 'replay' => true, 'applied' => $body->opId] + state_payload($t, $g, $ledger));
    }

    $tasks = $t['tasks'];
    $newGame = [];
    $flags = ['tasks' => false, 'game' => false, 'ledger' => []];
    try {
        apply_ops($body->ops, $tasks, $ledger, $newGame, $flags, $g);
    } catch (ApiError $e) {
        if ($e->errCode === 'game_conflict') {
            $l = read_ledger($ledgerFile);
            respond(409, ['ok' => false, 'code' => 'game_conflict', 'error' => $e->getMessage()] + state_payload($t, $g, $l));
        }
        throw $e;
    }

    // Écritures (le lot est entièrement validé en mémoire avant la première).
    if ($flags['ledger']) {
        backup_file($ledgerFile, $dataDir);
        $lines = '';
        foreach ($flags['ledger'] as $e) $lines .= json_encode($e, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        $prefix = '';
        if (is_file($ledgerFile) && filesize($ledgerFile) > 0) {
            $fh = fopen($ledgerFile, 'rb');
            fseek($fh, -1, SEEK_END);
            if (fread($fh, 1) !== "\n") $prefix = "\n";
            fclose($fh);
        }
        if (@file_put_contents($ledgerFile, $prefix . $lines, FILE_APPEND | LOCK_EX) === false) throw new ApiError(500, 'server_error', 'Écriture du registre impossible.');
        @chmod($ledgerFile, 0600);
    }
    if ($flags['game']) {
        backup_file($gameFile, $dataDir);
        $json = json_encode($newGame['game'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        atomic_write($gameFile, $json, 0600);
        $g = read_game($gameFile);
    }
    if ($flags['tasks']) {
        backup_file($tasksFile, $dataDir);
        $json = json_encode($tasks, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        atomic_write($tasksFile, $json, 0644);
        $t = ['raw' => $json, 'tasks' => $tasks];
    }
    $ops[] = $body->opId;
    $ops = array_slice($ops, -MAX_OPS_KEPT);
    atomic_write($opsFile, json_encode($ops) . "\n", 0600);

    respond(200, ['ok' => true, 'applied' => $body->opId] + state_payload($t, $g, $ledger));
}

try {
    main();
} catch (ApiError $e) {
    fail($e);
} catch (Throwable $e) {
    error_log('oree api: ' . $e->getMessage());
    if (!headers_sent()) respond(500, ['ok' => false, 'code' => 'server_error', 'error' => 'Erreur interne du serveur.']);
}
