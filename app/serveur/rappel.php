<?php
// Rappel du matin (bible §10) : une notification ntfy par jour, au texte général, qui ouvre l'Orée.
// Lancé par une tâche planifiée de l'hébergement (8 h, heure de Montréal), jamais depuis le web.
// Ne lit jamais la liste des tâches : le message passe par un serveur public, il ne dit rien de la vie réelle.
// Réglages : NTFY_TOPIC, NTFY_SERVER, APP_URL, DATA_DIR dans api/config.php ; l'environnement l'emporte
// (OREE_NTFY_TOPIC, OREE_NTFY_SERVER, OREE_APP_URL, OREE_DATA_DIR).
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}
date_default_timezone_set('America/Toronto'); // même heure que Montréal ; le PHP du serveur est réglé sur UTC

$cfg = ['topic' => '', 'server' => 'https://ntfy.sh', 'app' => '', 'data' => __DIR__ . '/../api/data'];
$file = __DIR__ . '/../api/config.php';
if (is_file($file)) {
    require_once $file;
    if (defined('NTFY_TOPIC') && is_string(NTFY_TOPIC)) $cfg['topic'] = NTFY_TOPIC;
    if (defined('NTFY_SERVER') && is_string(NTFY_SERVER) && NTFY_SERVER !== '') $cfg['server'] = NTFY_SERVER;
    if (defined('APP_URL') && is_string(APP_URL)) $cfg['app'] = APP_URL;
    if (defined('DATA_DIR') && is_string(DATA_DIR) && DATA_DIR !== '') $cfg['data'] = DATA_DIR;
}
foreach (['topic' => 'OREE_NTFY_TOPIC', 'server' => 'OREE_NTFY_SERVER', 'app' => 'OREE_APP_URL', 'data' => 'OREE_DATA_DIR'] as $k => $name) {
    $v = getenv($name);
    if (is_string($v) && $v !== '') $cfg[$k] = $v;
}
if ($cfg['topic'] === '' || $cfg['app'] === '') {
    fwrite(STDERR, "rappel : NTFY_TOPIC ou APP_URL manquant, rien n'est envoyé\n");
    exit(2);
}

// Un envoi par jour au plus, même si la tâche planifiée tourne deux fois.
$today = date('Y-m-d');
$mark = $cfg['data'] . '/rappel.json';
$last = is_file($mark) ? json_decode((string)file_get_contents($mark), true) : null;
if (is_array($last) && ($last['day'] ?? '') === $today) exit(0);

$textes = json_decode((string)file_get_contents(__DIR__ . '/rappels.json'), true);
$t = $textes[(int)date('z') % count($textes)];
$body = json_encode([
    'topic' => $cfg['topic'],
    'title' => $t['title'],
    'message' => $t['message'],
    'click' => $cfg['app'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$ch = curl_init(rtrim($cfg['server'], '/') . '/');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
]);
$resp = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);
if ($resp === false || $code < 200 || $code >= 300) {
    fwrite(STDERR, "rappel : envoi refusé ou injoignable (HTTP $code)\n");
    exit(1);
}
@mkdir($cfg['data'], 0750, true);
file_put_contents($mark, json_encode(['day' => $today, 'at' => date('c')]) . "\n", LOCK_EX);
