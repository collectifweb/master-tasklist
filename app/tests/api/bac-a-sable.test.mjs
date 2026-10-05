// Lot 6, côté API : réglage « bac à sable » (SANDBOX dans config.php, ou OREE_SANDBOX=1). Avec lui, les réponses
// portent `sandbox: true` ; sans lui, une partie qui porte un décalage de date (`horloge`) est refusée, pour qu'il
// n'atteigne jamais la production. Données fictives seulement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './helpers.mjs';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const GAME = { version: 2, resources: { energy: 10, materials: 20, food: 5 }, habitants: 0 };

async function withServer(opts, fn) {
  const s = await startServer(opts);
  try { await fn(s); } finally { s.stop(); }
}
const gameFile = (s) => join(s.dataDir, 'game-state.json');

test('sans réglage : aucune réponse ne porte `sandbox`', () => withServer({}, async (s) => {
  const g = await (await s.get()).json();
  assert.equal('sandbox' in g, false);
  const r = await (await s.op([{ type: 'game.set', game: GAME, baseGameRevision: null }])).json();
  assert.equal(r.ok, true);
  assert.equal('sandbox' in r, false);
}));

test('avec OREE_SANDBOX=1 : lecture et écriture portent `sandbox: true`', () => withServer({ env: { OREE_SANDBOX: '1' } }, async (s) => {
  assert.equal((await (await s.get()).json()).sandbox, true);
  const r = await (await s.op([{ type: 'game.set', game: GAME, baseGameRevision: null }])).json();
  assert.equal(r.ok, true);
  assert.equal(r.sandbox, true);
}));

test('avec define(\'SANDBOX\', true) dans config.php : `sandbox: true` ; à false : rien', () => withServer({}, async (s) => {
  const cfg = join(s.root, 'app', 'api', 'config.php');
  writeFileSync(cfg, "<?php\ndefine('SANDBOX', true);\n");
  assert.equal((await (await s.get()).json()).sandbox, true);
  writeFileSync(cfg, "<?php\ndefine('SANDBOX', false);\n");
  assert.equal('sandbox' in (await (await s.get()).json()), false);
}));

test('sans réglage : une partie qui porte `horloge` est refusée (409 sandbox_only), rien n’est écrit', () => withServer({}, async (s) => {
  await s.op([{ type: 'game.set', game: GAME, baseGameRevision: null }]);
  const before = readFileSync(gameFile(s), 'utf8');
  const r = await s.op([
    { type: 'task.upsert', task: { id: 'a1', status: 'done' } },
    { type: 'game.set', game: { ...GAME, horloge: { decalage: 1 } }, baseGameRevision: sha1(before) },
  ]);
  assert.equal(r.status, 409);
  const j = await r.json();
  assert.equal(j.code, 'sandbox_only');
  assert.match(j.error, /essai/);
  assert.equal(readFileSync(gameFile(s), 'utf8'), before);
  assert.equal(JSON.parse(s.readTasksRaw()).find((t) => t.id === 'a1').status, 'todo');
}));

test('avec le réglage : la partie avec `horloge` est acceptée et enregistrée', () => withServer({ env: { OREE_SANDBOX: '1' } }, async (s) => {
  const r = await s.op([{ type: 'game.set', game: { ...GAME, horloge: { decalage: 2 } }, baseGameRevision: null }]);
  assert.equal(r.status, 200);
  assert.ok(existsSync(gameFile(s)));
  assert.deepEqual(JSON.parse(readFileSync(gameFile(s), 'utf8')).horloge, { decalage: 2 });
  assert.deepEqual((await (await s.get()).json()).game.horloge, { decalage: 2 });
}));
