// Lot 5, côté API : les premiers pas appartiennent au jeu. Les gestes du cœur passent par la vraie API (php -S) et
// tasks.json reste identique octet par octet ; les coups de pouce sont au registre sous pas:{id}, une seule fois, même
// quand on rejoue le même envoi, qu'on relit tout depuis le serveur ou qu'on renvoie la même entrée. Données fictives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.mjs';
import { construire, advanceTime, semer, migrateState, hydrateLedger } from '../../core/index.js';

const NOW = '2026-10-06T14:00:00Z';
const LATER = '2026-10-07T14:00:00Z';

async function withServer(fn) {
  const s = await startServer();
  try { await fn(s); } finally { s.stop(); }
}

// Lit l'état sur le serveur, applique un geste du cœur, envoie ses opérations ; renvoie la réponse et le corps envoyé.
async function geste(s, fn, params, now, opId) {
  const j = await (await s.get()).json();
  const game = migrateState(j.game, now, { tasks: j.tasks, ledger: j.ledger });
  const r = fn(j.tasks, game, hydrateLedger(j.ledger, j.ledgerKeys), { ...params, gameRevision: j.gameRevision }, now);
  const res = await s.op(r.ops, opId);
  return { res, r };
}
const pasKeys = async (s) => (await (await s.get()).json()).ledgerKeys.filter((k) => k.startsWith('pas:'));

test('premiers pas par l’API : tasks.json identique octet par octet, coups de pouce au registre, jamais deux fois', () => withServer(async (s) => {
  const avant = s.readTasksRaw();
  // la liste a deux quêtes à faire : le chalet valide aussi « première tâche » (constat), pas « terminer »
  const c = await geste(s, construire, { type: 'chalet' }, NOW, 'chalet');
  assert.equal(c.res.status, 200);
  assert.deepEqual(c.r.ops.map((o) => o.type), ['ledger.append', 'game.set']);
  assert.deepEqual(await pasKeys(s), ['pas:chalet', 'pas:tache']);
  assert.equal(s.readTasksRaw(), avant);
  const g = (await (await s.get()).json()).game;
  assert.deepEqual(Object.keys(g.premiersPas), ['chalet', 'tache']);

  // le même envoi rejoué (même opId) : rien n'est réappliqué
  assert.equal((await s.op(c.r.ops, 'chalet')).status, 200);
  assert.deepEqual(await pasKeys(s), ['pas:chalet', 'pas:tache']);
  // la même entrée renvoyée sous un autre envoi : refusée par la clé unique, rien n'est écrit
  const dup = await s.op([{ type: 'ledger.append', entries: [c.r.entries.find((e) => e.key === 'pas:chalet')] }]);
  assert.equal(dup.status, 409);
  assert.equal((await dup.json()).code, 'duplicate_key');

  // le lendemain, état relu sur le serveur : le passage du temps ne repaie rien
  const t = await geste(s, advanceTime, {}, LATER, 'temps');
  assert.equal(t.res.status, 200);
  assert.ok(!t.r.entries.some((e) => e.key.startsWith('pas:')));
  // semer : coché tout de suite, même avant « terminer » (un pas se coche dès qu'il est vrai) ; la liste ne bouge toujours pas
  const se = await geste(s, semer, { id: 'parcelle-1' }, LATER, 'semer');
  assert.equal(se.res.status, 200);
  assert.deepEqual(await pasKeys(s), ['pas:chalet', 'pas:tache', 'pas:semer']);
  assert.equal(s.readTasksRaw(), avant);
}));
