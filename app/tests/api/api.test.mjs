import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, SAMPLE, fmt } from './helpers.mjs';

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
  assert.equal(s.backups('tasks.json').length, 14);
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

test('mode jeton : 401 sans, 200 avec', () => {
  const hash = execFileSync('php', ['-r', 'echo password_hash("jeton-fictif", PASSWORD_DEFAULT);']).toString();
  return withServer({ env: { OREE_TOKEN_HASH: hash } }, async (s) => {
    assert.equal((await s.get()).status, 401);
    assert.equal((await s.get({ Authorization: 'Bearer mauvais' })).status, 401);
    assert.equal((await s.get({ Authorization: 'Bearer jeton-fictif' })).status, 200);
    assert.equal((await s.op([])).status, 401);
    assert.equal((await s.op([], 'o1', { Authorization: 'Bearer jeton-fictif' })).status, 200);
  });
});

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
