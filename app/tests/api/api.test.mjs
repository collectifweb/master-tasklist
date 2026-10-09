import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { startServer, SAMPLE, fmt } from './helpers.mjs';
import { mkdirSync, chmodSync, rmSync, symlinkSync, lstatSync, readdirSync } from 'node:fs';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');

async function withServer(opts, fn) {
  const s = await startServer(opts);
  try { await fn(s); } finally { s.stop(); }
}

test('GET initial : revision, tâches, jeu nul, registre vide', () => withServer({}, async (s) => {
  const r = await s.get();
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control'), /no-store/);
  const j = await r.json();
  assert.equal(j.revision, sha1(s.readTasksRaw()));
  assert.equal(j.tasks.length, 2);
  assert.equal(j.game, null);
  assert.equal(j.gameRevision, null);
  assert.deepEqual(j.ledger, []);
  assert.deepEqual(j.ledgerKeys, []);
  // dossier de données protégé
  assert.equal(readFileSync(join(s.dataDir, '.htaccess'), 'utf8').trim(), 'Require all denied');
  assert.ok(existsSync(join(s.dataDir, 'index.html')));
}));

test('upsert conserve les champs absents et inconnus', () => withServer({}, async (s) => {
  const r = await s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done', doneAt: '2026-10-05T10:00:00Z' } }]);
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.ok, true);
  const t = JSON.parse(s.readTasksRaw()).find((x) => x.id === 'a1');
  assert.equal(t.status, 'done');
  assert.equal(t.task, 'Ranger l’entrée');
  assert.equal(t.deadline, null);
  assert.deepEqual(t.extra, { garde: 'moi' });
  assert.equal(t.doneAt, '2026-10-05T10:00:00Z');
  assert.equal(j.revision, sha1(s.readTasksRaw()));
}));

test('ajout puis suppression', () => withServer({}, async (s) => {
  let j = await (await s.op([{ type: 'task.upsert', task: { id: 'n1', task: 'Nouvelle quête', steps: [] , frozen: {} } }])).json();
  assert.equal(j.tasks.length, 3);
  assert.ok(s.readTasksRaw().includes('"frozen": {}'));
  j = await (await s.op([{ type: 'task.delete', id: 'n1' }, { type: 'task.delete', id: 'inexistante' }])).json();
  assert.equal(j.tasks.length, 2);
  assert.deepEqual(JSON.parse(s.readTasksRaw()).map((x) => x.id), ['a1', 'a2']);
}));

test('lot tout-ou-rien : clé du registre en double', () => withServer({}, async (s) => {
  const e = (key) => ({ key, at: '2026-10-05T10:00:00Z', pe: 5 });
  let r = await s.op([{ type: 'ledger.append', entries: [e('reward:a1:1')] }]);
  assert.equal(r.status, 200);
  const before = s.readTasksRaw();
  r = await s.op([
    { type: 'task.upsert', task: { id: 'a2', status: 'done' } },
    { type: 'ledger.append', entries: [e('reward:a9:1'), e('reward:a1:1')] },
  ]);
  assert.equal(r.status, 409);
  const j = await r.json();
  assert.equal(j.code, 'duplicate_key');
  assert.equal(j.key, 'reward:a1:1');
  assert.equal(s.readTasksRaw(), before);
  const g = await (await s.get()).json();
  assert.deepEqual(g.ledger.map((x) => x.key), ['reward:a1:1']);
  // doublon à l'intérieur d'un même lot
  r = await s.op([{ type: 'ledger.append', entries: [e('k:1'), e('k:1')] }]);
  assert.equal(r.status, 409);
  assert.equal((await (await s.get()).json()).ledger.length, 1);
}));

test('rejeu d’opId : rien n’est réappliqué', () => withServer({}, async (s) => {
  const ops = [{ type: 'ledger.append', entries: [{ key: 'bonus:x:1', pe: 1 }] }];
  let r = await s.op(ops, 'same-op');
  let j = await r.json();
  assert.equal(j.applied, 'same-op');
  assert.equal(j.replay, undefined);
  r = await s.op(ops, 'same-op');
  j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.ok, true);
  assert.equal(j.replay, true);
  assert.equal(j.ledger.length, 1);
}));

test('état du jeu : écriture, puis conflit avec l’état courant', () => withServer({}, async (s) => {
  let r = await s.op([{ type: 'game.set', game: { version: 1, energy: 3 }, baseGameRevision: null }]);
  let j = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual(j.game, { version: 1, energy: 3 });
  assert.equal(j.gameRevision, sha1(readFileSync(join(s.dataDir, 'game-state.json'), 'utf8')));
  const rev = j.gameRevision;
  r = await s.op([{ type: 'game.set', game: { version: 1, energy: 9 }, baseGameRevision: rev }]);
  j = await r.json();
  assert.equal(r.status, 200);
  assert.notEqual(j.gameRevision, rev);
  r = await s.op([
    { type: 'task.upsert', task: { id: 'a1', status: 'done' } },
    { type: 'game.set', game: { version: 1, energy: 0 }, baseGameRevision: rev },
  ]);
  j = await r.json();
  assert.equal(r.status, 409);
  assert.equal(j.code, 'game_conflict');
  assert.equal(j.game.energy, 9);
  assert.equal(typeof j.gameRevision, 'string');
  assert.equal(JSON.parse(s.readTasksRaw()).find((x) => x.id === 'a1').status, 'todo');
}));

test('14 sauvegardes au maximum par fichier', () => withServer({}, async (s) => {
  for (let i = 0; i < 20; i++) {
    const r = await s.op([{ type: 'task.upsert', task: { id: 'a1', priority: (i % 10) + 1 } }]);
    assert.equal(r.status, 200);
  }
  assert.equal(s.backups('tasks.json').length, 14); // 40 copies faites (avant + après), 14 gardées
}));

test('413 au-delà de 512 Kio, 405 pour une autre méthode', () => withServer({}, async (s) => {
  const big = JSON.stringify({ opId: 'big', ops: [], pad: 'x'.repeat(520 * 1024) });
  let r = await s.post(big);
  assert.equal(r.status, 413);
  assert.equal((await r.json()).ok, false);
  r = await fetch(s.url, { method: 'PUT', body: '{}' });
  assert.equal(r.status, 405);
  r = await fetch(s.url, { method: 'DELETE' });
  assert.equal(r.status, 405);
}));

test('400 : JSON invalide, opId manquant', () => withServer({}, async (s) => {
  let r = await s.post('{pas du json');
  assert.equal(r.status, 400);
  let j = await r.json();
  assert.equal(j.ok, false);
  assert.ok(!/\.php|\/tmp|Stack/.test(JSON.stringify(j)));
  r = await s.post({ ops: [] });
  assert.equal(r.status, 400);
  r = await s.post({ opId: 'x', ops: [{ type: 'nimporte.quoi' }] });
  assert.equal(r.status, 400);
}));

test('mode jeton : empreinte SHA-256, 401 sans, 200 avec', () => {
  const jeton = 'jeton-fictif-' + 'a'.repeat(40);
  const hash = createHash('sha256').update(jeton).digest('hex');
  return withServer({ env: { OREE_TOKEN_HASH: hash } }, async (s) => {
    assert.equal((await s.get()).status, 401);
    assert.equal((await s.get({ Authorization: 'Bearer mauvais' })).status, 401);
    assert.equal((await s.get({ Authorization: `Bearer ${jeton}` })).status, 200);
    assert.equal((await s.op([])).status, 401);
    assert.equal((await s.op([], 'o1', { Authorization: `Bearer ${jeton}` })).status, 200);
  });
});

// ---- Blocage après jetons faux ----
const lockoutEnv = (jeton) => ({ OREE_TOKEN_HASH: createHash('sha256').update(jeton).digest('hex') });
const JETON = 'jeton-fictif-' + 'b'.repeat(40);
const bad = { Authorization: 'Bearer mauvais' };
const good = { Authorization: `Bearer ${JETON}` };
const cptFile = (s) => join(s.dataDir, 'lockout.json');

test('blocage : 4 jetons faux puis le bon → 200 et compteur remis à zéro', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  for (let i = 0; i < 4; i++) assert.equal((await s.get(bad)).status, 401);
  assert.equal((await s.get(good)).status, 200);
  const moi = createHash('sha256').update('127.0.0.1').digest('hex');
  assert.ok(!(moi in JSON.parse(readFileSync(cptFile(s), 'utf8'))), 'plus d’entrée pour cette adresse après un bon jeton');
  // le compteur repart de zéro : 4 nouveaux faux ne bloquent pas
  for (let i = 0; i < 4; i++) assert.equal((await s.get(bad)).status, 401);
  assert.equal((await s.get(good)).status, 200);
}));

test('blocage : 5 jetons faux → 429 avec Retry-After, même avec le bon jeton', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  for (let i = 0; i < 5; i++) assert.equal((await s.get(bad)).status, 401);
  let r = await s.get(bad);
  assert.equal(r.status, 429);
  const ra = Number(r.headers.get('retry-after'));
  assert.ok(ra > 880 && ra <= 900, `Retry-After = ${ra}`);
  const j = await r.json();
  assert.equal(j.ok, false);
  assert.equal(j.code, 'too_many_attempts');
  assert.equal(j.retryAfter, ra);
  assert.equal((await s.get(good)).status, 429);
  assert.equal((await s.get()).status, 429);
  assert.equal((await s.op([], 'o-bloque', good)).status, 429);
  // l'adresse brute n'est jamais gardée
  const raw = readFileSync(cptFile(s), 'utf8');
  assert.ok(!raw.includes('127.0.0.1'));
  assert.ok(raw.includes(createHash('sha256').update('127.0.0.1').digest('hex')));
}));

test('blocage : les requêtes sans jeton ne comptent pas', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  for (let i = 0; i < 12; i++) assert.equal((await s.get()).status, 401);
  assert.equal(existsSync(cptFile(s)), false);
  assert.equal((await s.get(good)).status, 200);
}));

test('blocage : un jeton faux est ralenti d’environ 250 ms', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  const t0 = Date.now();
  assert.equal((await s.get(bad)).status, 401);
  assert.ok(Date.now() - t0 >= 240, `${Date.now() - t0} ms`);
}));

test('blocage : le blocage expire, et les vieilles entrées sont purgées', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  for (let i = 0; i < 5; i++) await s.get(bad);
  assert.equal((await s.get(good)).status, 429);
  const d = JSON.parse(readFileSync(cptFile(s), 'utf8'));
  const [k] = Object.keys(d);
  const now = Math.floor(Date.now() / 1000);
  d[k].until = now - 1; // blocage échu
  d['autre-cle'] = { fails: [now - 90000], until: now - 90000 }; // plus de 24 h
  writeFileSync(cptFile(s), JSON.stringify(d));
  assert.equal((await s.get(good)).status, 200);
  // une écriture suivante purge l'entrée oubliée
  writeFileSync(cptFile(s), JSON.stringify({ 'autre-cle': { fails: [now - 90000], until: now - 90000 } }));
  assert.equal((await s.get(bad)).status, 401);
  const after = JSON.parse(readFileSync(cptFile(s), 'utf8'));
  assert.deepEqual(Object.keys(after).sort(), ['*', createHash('sha256').update('127.0.0.1').digest('hex')].sort());
}));

test('blocage : fichier de compteurs abîmé → aucun blocage', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  assert.equal((await s.get(good)).status, 200); // crée le dossier de données
  for (const junk of ['{pas du json', '"texte"', '[1,2', '']) {
    writeFileSync(cptFile(s), junk);
    assert.equal((await s.get(good)).status, 200, `contenu : ${junk}`);
  }
  writeFileSync(cptFile(s), '{pas du json');
  assert.equal((await s.get(bad)).status, 401); // repart d'un fichier vide et le réécrit proprement
  assert.equal(typeof JSON.parse(readFileSync(cptFile(s), 'utf8')), 'object');
}));

test('blocage : entrée abîmée dans un fichier lisible → ni plantage ni blocage', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  assert.equal((await s.get(good)).status, 200); // crée le dossier de données
  const moi = createHash('sha256').update('127.0.0.1').digest('hex');
  for (const entry of [{ until: 'abc' }, { fails: 'x', until: [] }, 'texte', 7]) {
    writeFileSync(cptFile(s), JSON.stringify({ [moi]: entry, autre: entry }));
    assert.equal((await s.get(good)).status, 200, `bon jeton, entrée : ${JSON.stringify(entry)}`);
    writeFileSync(cptFile(s), JSON.stringify({ autre: entry }));
    assert.equal((await s.get(bad)).status, 401, `jeton faux, entrée : ${JSON.stringify(entry)}`);
  }
}));

test('blocage : 12 jetons faux simultanés → 5 jugés (401) au plus, les autres 429', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  assert.equal((await s.get(good)).status, 200); // crée le dossier de données
  const codes = (await Promise.all(Array.from({ length: 12 }, () => s.get(bad)))).map((r) => r.status);
  assert.equal(codes.filter((c) => c === 401).length, 5, `codes : ${codes.join(' ')}`);
  assert.equal(codes.filter((c) => c === 429).length, 7, `codes : ${codes.join(' ')}`);
  assert.equal((await s.get(good)).status, 429);
}));

test('blocage : clé par adresse IPv4, et par préfixe /64 en IPv6', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  const key = (ip) => runCli(s, `$_SERVER['REMOTE_ADDR'] = ${JSON.stringify(ip)}; echo lockout_key();`);
  assert.equal(key('203.0.113.7'), createHash('sha256').update('203.0.113.7').digest('hex'));
  assert.notEqual(key('203.0.113.7'), key('203.0.113.8'));
  assert.equal(key('2001:db8:1:2:aaaa::1'), key('2001:db8:1:2:ffff:ffff:ffff:ffff'), 'même /64');
  assert.notEqual(key('2001:db8:1:2::1'), key('2001:db8:1:3::1'), 'autre /64');
  assert.equal(key('::ffff:203.0.113.7'), key('203.0.113.7'), 'IPv4 écrite en IPv6');
  assert.notEqual(key('::ffff:203.0.113.7'), key('::ffff:203.0.113.8'));
}));

test('blocage : seules les entrées sans information sont purgées (jamais un compteur vivant)', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  assert.equal((await s.get(good)).status, 200); // crée le dossier de données
  const now = Math.floor(Date.now() / 1000);
  const moi = createHash('sha256').update('127.0.0.1').digest('hex');
  // 700 entrées échues (aucun échec dans les 15 dernières minutes) : purgées
  const stale = {};
  for (let i = 0; i < 700; i++) stale['vieille-' + i] = { fails: [now - 1000 - i] };
  writeFileSync(cptFile(s), JSON.stringify(stale));
  assert.equal((await s.get(bad)).status, 401);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(cptFile(s), 'utf8'))).sort(), ['*', moi].sort());
  // 600 compteurs vivants d'autres adresses + 4 échecs ici : le 5e bloque bien cette adresse (pas d'éviction)
  const live = {};
  for (let i = 0; i < 600; i++) live['vivante-' + i] = { fails: [now - 60] };
  live[moi] = { fails: [now - 50, now - 40, now - 30, now - 20] };
  writeFileSync(cptFile(s), JSON.stringify(live));
  assert.equal((await s.get(bad)).status, 401);
  assert.equal((await s.get(good)).status, 429);
  assert.ok('vivante-599' in JSON.parse(readFileSync(cptFile(s), 'utf8')));
}));

test('blocage : budget commun de 20 jetons faux en 15 min, toutes adresses confondues', () => withServer({ env: lockoutEnv(JETON) }, async (s) => {
  assert.equal((await s.get(good)).status, 200); // crée le dossier de données
  const now = Math.floor(Date.now() / 1000);
  writeFileSync(cptFile(s), JSON.stringify({ '*': { fails: Array.from({ length: 19 }, (_, i) => now - 100 + i) } }));
  assert.equal((await s.get(bad)).status, 401); // 20e jeton faux jugé
  const r = await s.get(good);
  assert.equal(r.status, 429, 'plus aucun jeton jugé, même le bon');
  assert.ok(Number(r.headers.get('retry-after')) > 880);
  assert.equal((await s.get()).status, 429);
}));

test('tasks.json corrompu : 503 et fichier intact', () => withServer({ tasksRaw: '[{"id": "a1", "task": ' }, async (s) => {
  const before = s.readTasksRaw();
  const t0 = Date.now();
  const r = await s.op([{ type: 'ledger.append', entries: [{ key: 'k:1' }] }, { type: 'task.upsert', task: { id: 'z', task: 'x' } }]);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, 'tasks_unreadable');
  assert.ok(Date.now() - t0 >= 500, 'doit réessayer brièvement');
  assert.equal(s.readTasksRaw(), before);
  assert.equal(existsSync(join(s.dataDir, 'ledger.jsonl')), false);
  // un objet JSON n'est pas un tableau
  writeFileSync(s.tasksFile, '{"a":1}');
  assert.equal((await s.op([])).status, 503);
  assert.equal(s.readTasksRaw(), '{"a":1}');
}));

test('copie SSH qui se termine pendant les tentatives : l’écriture réussit', () => withServer({ tasksRaw: '[{"id"' }, async (s) => {
  const p = s.op([{ type: 'task.upsert', task: { id: 'a2', status: 'done' } }]);
  setTimeout(() => writeFileSync(s.tasksFile, fmt(SAMPLE)), 250);
  const r = await p;
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(s.readTasksRaw()).find((x) => x.id === 'a2').status, 'done');
}));

test('20 POST concurrents sur des tâches différentes : aucune perte', () => withServer({}, async (s) => {
  const rs = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    s.op([{ type: 'task.upsert', task: { id: `c${i}`, task: `Concurrente ${i}`, priority: 5 } }])));
  assert.deepEqual(rs.map((r) => r.status), Array(20).fill(200));
  const ids = JSON.parse(s.readTasksRaw()).map((t) => t.id);
  assert.equal(ids.length, 22);
  for (let i = 0; i < 20; i++) assert.ok(ids.includes(`c${i}`), `c${i} perdue`);
}));

test('format de tasks.json : 4 espaces, accents non échappés, saut de ligne final', () => withServer({}, async (s) => {
  await s.op([{ type: 'task.upsert', task: { id: 'f1', task: 'Réparer l’étagère à côté' } }]);
  const raw = s.readTasksRaw();
  assert.ok(raw.endsWith(']\n'));
  assert.ok(raw.includes('Réparer l’étagère à côté'));
  assert.ok(!raw.includes('\\u'));
  const expected = fmt(JSON.parse(raw)).replace(/\//g, '\\/');
  assert.equal(raw, expected);
  assert.ok(raw.startsWith('[\n    {\n        "id"'));
  assert.equal((statMode(s.tasksFile)), 0o644);
}));

function statMode(f) {
  return parseInt(execFileSync('stat', ['-c', '%a', f]).toString(), 8);
}

// ---------- Correctifs de la revue ----------

const PHP_ENV = (s, extra = {}) => ({ ...process.env, OREE_TASKS_FILE: s.tasksFile, OREE_DATA_DIR: s.dataDir, ...extra });

function runCli(s, code, extra = {}) {
  const f = join(s.root, 'harness.php');
  writeFileSync(f, `<?php\ndefine('OREE_API_NO_RUN', 1);\nrequire ${JSON.stringify(join(s.root, 'app', 'api', 'api.php'))};\n${code}`);
  return execFileSync('php', [f], { env: PHP_ENV(s, { OREE_ALLOW_OPEN: '1', ...extra }), encoding: 'utf8' });
}

test('1. nombre non fini : 400, fichiers intacts ; déjà présent sur disque : 503 sans écrire', () => withServer({}, async (s) => {
  const before = s.readTasksRaw();
  let r = await s.post('{"opId":"i1","ops":[{"type":"task.upsert","task":{"id":"a1","priority":1e400}}]}');
  assert.equal(r.status, 400);
  assert.equal(s.readTasksRaw(), before);
  r = await s.post('{"opId":"i2","ops":[{"type":"game.set","baseGameRevision":null,"game":{"energy":1e400}}]}');
  assert.equal(r.status, 400);
  assert.equal(existsSync(join(s.dataDir, 'game-state.json')), false);
  const bad = before.replace('"priority": 5', '"priority": 1e999');
  writeFileSync(s.tasksFile, bad);
  assert.equal((await s.get()).status, 503);
  r = await s.op([{ type: 'task.upsert', task: { id: 'a2', status: 'done' } }]);
  assert.equal(r.status, 503);
  assert.equal(s.readTasksRaw(), bad);
}));

test('2. fichier changé pendant l’écriture : relu et réappliqué ; 3 échecs : 503 tasks_changed', () => withServer({}, async (s) => {
  const code = (always) => `
$GLOBALS['oree_body_override'] = json_encode(['client' => 10, 'opId' => 'h1', 'ops' => [['type' => 'task.upsert', 'task' => ['id' => 'a1', 'status' => 'done']]]]);
$_SERVER['REQUEST_METHOD'] = 'POST'; $_SERVER['CONTENT_TYPE'] = 'application/json';
$n = 0;
$GLOBALS['oree_hook_before_rename'] = function ($f) use (&$n) {
  if (basename($f) !== 'tasks.json' || ($n++ >= 1 && !${always})) return;
  $t = json_decode(file_get_contents($f)); $t[] = (object)['id' => 'ext-' . $n, 'task' => 'Ajoutée de l’extérieur'];
  file_put_contents($f . '.x', json_encode($t, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\\n"); rename($f . '.x', $f);
};
register_shutdown_function(fn() => fwrite(STDERR, 'HTTP ' . http_response_code()));
main();`;
  const out = JSON.parse(runCli(s, code('false')));
  assert.equal(out.ok, true, JSON.stringify(out));
  const t = JSON.parse(s.readTasksRaw());
  assert.equal(t.find((x) => x.id === 'a1').status, 'done');
  assert.ok(t.some((x) => x.id === 'ext-1'), 'l’écriture externe est conservée');
  // tout le temps changé : renonce
  writeFileSync(s.tasksFile, fmt(SAMPLE));
  const out2 = JSON.parse(runCli(s, code('true').replace("'h1'", "'h2'")));
  assert.equal(out2.code, 'tasks_changed');
  assert.equal(JSON.parse(s.readTasksRaw()).find((x) => x.id === 'a1').status, 'todo');
}));

test('3. fermée par défaut : décision d’accès', () => withServer({}, async (s) => {
  const dec = (h, open, sapi, tok) => JSON.parse(runCli(s, `$d = auth_decision(${JSON.stringify(h)}, ${open}, ${JSON.stringify(sapi)}, ${JSON.stringify(tok)}); echo json_encode($d ? [$d->status, $d->errCode] : null);`));
  assert.deepEqual(dec('', 'false', 'fpm-fcgi', null), [503, 'auth_not_configured']);
  assert.deepEqual(dec('', 'false', 'litespeed', 'x'), [503, 'auth_not_configured']);
  assert.equal(dec('', 'true', 'litespeed', null), null);
  assert.equal(dec('', 'false', 'cli-server', null), null);
  const h = sha1hex('abc');
  assert.equal(dec(h, 'false', 'litespeed', 'abc'), null);
  assert.deepEqual(dec(h, 'false', 'litespeed', 'abd'), [401, 'unauthorized']);
  assert.deepEqual(dec(h, 'false', 'cli-server', null), [401, 'unauthorized']);
  // la configuration par variable d'environnement
  const cfg = JSON.parse(runCli(s, 'echo json_encode(load_config());', { OREE_ALLOW_OPEN: '1' }));
  assert.equal(cfg.allow_open, true);
}));
/** Tient un verrou flock depuis un autre processus ; ne rend la main qu'une fois le verrou réellement pris. */
async function holdLock(path) {
  const holder = spawn('flock', [path, 'sleep', '60'], { stdio: 'ignore', detached: true });
  const release = () => { try { process.kill(-holder.pid, 'SIGKILL'); } catch {} }; // tout le groupe : flock ET son « sleep »
  holder.release = release;
  for (let i = 0; i < 200; i++) {
    if (spawnSync('flock', ['-n', path, 'true']).status === 1) return holder; // 1 = verrou occupé
    await new Promise((r) => setTimeout(r, 50));
  }
  release();
  throw new Error('le verrou de test n’a jamais été pris');
}

function sha1hex(x) { return createHash('sha256').update(x).digest('hex'); }

test('3b. POST : Content-Type autre que application/json refusé (415)', () => withServer({}, async (s) => {
  const body = JSON.stringify({ client: 10, opId: 'x', ops: [{ type: 'task.delete', id: 'a1' }] });
  for (const ct of ['text/plain', 'application/x-www-form-urlencoded']) {
    const r = await fetch(s.url, { method: 'POST', headers: { 'Content-Type': ct }, body });
    assert.equal(r.status, 415);
    assert.equal((await r.json()).code, 'unsupported_media_type');
  }
  assert.ok(s.readTasksRaw().includes('"a1"'));
  const r = await fetch(s.url, { method: 'POST', headers: { 'Content-Type': 'Application/JSON; charset=utf-8' }, body });
  assert.equal(r.status, 200);
}));

test('4. tasks.json absent : 503 tasks_missing sans rien créer ; création seulement si permise', async () => {
  await withServer({ tasksRaw: null, env: { OREE_ALLOW_CREATE_TASKS: '0' } }, async (s) => {
    let r = await s.get();
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, 'tasks_missing');
    r = await s.op([{ type: 'task.upsert', task: { id: 'n1', task: 'Nouvelle' } }]);
    assert.equal(r.status, 503);
    assert.equal(existsSync(s.tasksFile), false);
    assert.equal(existsSync(s.tasksFile + '.lock'), false);
  });
  await withServer({ tasksRaw: null }, async (s) => {
    const r = await s.op([{ type: 'task.upsert', task: { id: 'n1', task: 'Nouvelle' } }]);
    assert.equal(r.status, 200);
    assert.equal(JSON.parse(s.readTasksRaw()).length, 1);
  });
});

test('5. tout-ou-rien réel : échec du registre, tasks.json et jeu restaurés, puis même opId réussit', () => withServer({}, async (s) => {
  await s.get();
  mkdirSync(join(s.dataDir, 'ledger.jsonl')); // l'ajout au registre échouera, après tasks.json et le jeu
  const before = s.readTasksRaw();
  const lot = [
    { type: 'task.upsert', task: { id: 'a1', status: 'done' } },
    { type: 'game.set', baseGameRevision: null, game: { version: 1, energy: 3 } },
    { type: 'ledger.append', entries: [{ key: 'reward:a1:1', pe: 10 }] },
  ];
  let r = await s.op(lot, 'terminer-a1');
  assert.equal(r.status, 500);
  const j = await r.json();
  assert.equal(j.code, 'server_error');
  assert.ok(!/\/|\.php/.test(j.error));
  assert.equal(s.readTasksRaw(), before);
  assert.equal(existsSync(join(s.dataDir, 'game-state.json')), false);
  assert.equal(existsSync(join(s.dataDir, 'ops.json')), false);
  rmSync(join(s.dataDir, 'ledger.jsonl'), { recursive: true });
  r = await s.op(lot, 'terminer-a1');
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(s.readTasksRaw()).find((x) => x.id === 'a1').status, 'done');
  assert.deepEqual((await r.json()).ledgerKeys, ['reward:a1:1']);
}));

test('6. sauvegardes : avant et après, registre une fois par jour, échec de sauvegarde = refus', () => withServer({}, async (s) => {
  const avant = s.readTasksRaw();
  await s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }]);
  const bdir = join(s.dataDir, 'backups');
  const tb = s.backups('tasks.json');
  assert.equal(tb.length, 2);
  const contenus = tb.map((f) => [f, readFileSync(join(bdir, f), 'utf8')]);
  assert.equal(contenus.find(([f]) => f.endsWith('-avant.bak'))[1], avant);
  assert.equal(contenus.find(([f]) => f.endsWith('-apres.bak'))[1], s.readTasksRaw());
  await s.op([{ type: 'game.set', baseGameRevision: null, game: { v: 1 } }]);
  assert.equal(s.backups('game-state.json').length, 1); // création : pas d'« avant »
  for (const k of ['k1', 'k2', 'k3']) await s.op([{ type: 'ledger.append', entries: [{ key: k }] }]);
  assert.equal(s.backups('ledger.jsonl').length, 1); // une seule copie ce jour-là
  // échec de sauvegarde : rien n'est écrit
  chmodSync(bdir, 0o555);
  try {
    const raw = s.readTasksRaw();
    const r = await s.op([{ type: 'task.upsert', task: { id: 'a2', status: 'done' } }]);
    assert.equal(r.status, 500);
    assert.equal(s.readTasksRaw(), raw);
  } finally { chmodSync(bdir, 0o755); }
}));

test('7. opId réutilisé avec un autre corps : 409 ; ops.json illisible : 503', () => withServer({}, async (s) => {
  assert.equal((await s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }], 'dup')).status, 200);
  const r = await s.op([{ type: 'task.upsert', task: { id: 'n9', task: 'Autre' } }], 'dup');
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'op_id_reused');
  assert.ok(!s.readTasksRaw().includes('n9'));
  writeFileSync(join(s.dataDir, 'ops.json'), '{pas du json');
  const raw = s.readTasksRaw();
  const r2 = await s.op([{ type: 'task.upsert', task: { id: 'a2', status: 'done' } }]);
  assert.equal(r2.status, 503);
  assert.equal((await r2.json()).code, 'ops_unreadable');
  assert.equal(s.readTasksRaw(), raw);
}));

test('8. verrou tenu par un autre processus : 503 busy après environ 5 s', () => withServer({}, async (s) => {
  await s.get();
  const holder = await holdLock(join(s.dataDir, '.lock')); // tenu jusqu'à la fin du test
  try {
    const t0 = Date.now();
    const timed = async (p) => { const r = await p; return [r, Date.now() - t0]; };
    const [[g, dg], [p, dp]] = await Promise.all([timed(s.get()), timed(s.op([{ type: 'task.delete', id: 'a1' }]))]);
    assert.deepEqual([g.status, p.status], [503, 503]);
    assert.equal((await p.json()).code, 'busy');
    assert.ok(dg >= 4800 && dp >= 4800, `attentes de ${dg} et ${dp} ms`);
    assert.ok(s.readTasksRaw().includes('"a1"'));
  } finally { holder.release(); }
}));

test('9. registre : limites, entrées récentes et clés complètes', () => withServer({}, async (s) => {
  const many = Array.from({ length: 51 }, (_, i) => ({ key: `m:${i}` }));
  assert.equal((await s.op([{ type: 'ledger.append', entries: many }])).status, 400);
  assert.equal((await s.op([{ type: 'ledger.append', entries: [{ key: 'gros', pad: 'x'.repeat(3000) }] }])).status, 400);
  assert.equal((await (await s.get()).json()).ledgerKeys.length, 0);
  const old = new Date(Date.now() - 90 * 86400e3).toISOString();
  const recent = new Date().toISOString();
  const r = await s.op([{ type: 'ledger.append', entries: [{ key: 'vieux', at: old }, { key: 'recent', at: recent }, { key: 'sans-date' }, { key: 'date-folle', at: 'pas une date' }] }]);
  const j = await r.json();
  assert.deepEqual(j.ledger.map((e) => e.key), ['recent', 'sans-date', 'date-folle']);
  assert.deepEqual(j.ledgerKeys, ['vieux', 'recent', 'sans-date', 'date-folle']);
  const g = await (await s.get()).json();
  assert.deepEqual(g.ledger.map((e) => e.key), ['recent', 'sans-date', 'date-folle']);
  assert.equal(g.ledgerKeys.length, 4);
  const dup = await s.op([{ type: 'ledger.append', entries: [{ key: 'vieux' }] }]);
  assert.equal(dup.status, 409);
}));

test('10. .htaccess du dossier de données impossible à créer : 500, rien écrit', () => withServer({}, async (s) => {
  mkdirSync(s.dataDir, { recursive: true });
  chmodSync(s.dataDir, 0o555);
  try {
    const raw = s.readTasksRaw();
    const r = await s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }]);
    assert.equal(r.status, 500);
    assert.equal(s.readTasksRaw(), raw);
    assert.equal((await s.get()).status, 500);
  } finally { chmodSync(s.dataDir, 0o755); }
}));

test('11. lien symbolique : le vrai fichier est modifié, le lien reste', () => withServer({}, async (s) => {
  const real = join(s.root, 'vrai.json');
  writeFileSync(real, fmt(SAMPLE));
  rmSync(s.tasksFile);
  symlinkSync(real, s.tasksFile);
  assert.equal((await s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }])).status, 200);
  assert.ok(lstatSync(s.tasksFile).isSymbolicLink());
  assert.ok(readFileSync(real, 'utf8').includes('"done"'));
}));

test('12. sans mbstring ; type d’identifiant conservé à la fusion', async () => {
  await withServer({ phpArgs: ['-n'] }, async (s) => {
    assert.equal((await s.get()).status, 200);
    const r = await s.op([{ type: 'nimporte.quoi' }]);
    assert.equal(r.status, 400);
  });
  await withServer({ tasksRaw: fmt([{ id: 7, task: 'Id entier' }]) }, async (s) => {
    const r = await s.op([{ type: 'task.upsert', task: { id: '7', status: 'done' } }]);
    assert.equal(r.status, 200);
    const t = JSON.parse(s.readTasksRaw());
    assert.equal(t.length, 1);
    assert.strictEqual(t[0].id, 7);
    assert.equal(t[0].status, 'done');
  });
});

test('verrou voisin : l’écriture attend celui de tasks.json.lock', () => withServer({}, async (s) => {
  await s.get();
  const holder = await holdLock(s.tasksFile + '.lock');
  try {
    const p = s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }]).then((r) => [r, Date.now()]);
    await new Promise((r) => setTimeout(r, 1200));
    const releasedAt = Date.now();
    holder.release();
    const [r, doneAt] = await p;
    assert.equal(r.status, 200);
    assert.ok(doneAt >= releasedAt, 'la réponse n’est arrivée qu’après la libération du verrou');
  } finally { holder.release(); }
}));
