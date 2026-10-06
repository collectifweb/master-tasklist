// Semaine tenue, côté API (lot R2) : l'entrée semaine:{lundi} est un gain de registre comme un autre (une clé, des
// Matériaux), acceptée par l'API sans réglage de plus ; une seule fois, même rejouée ou renvoyée sous un autre envoi.
// Passe par la vraie API (php -S). Données fictives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, fmt } from './helpers.mjs';
import { completeQuest, migrateState, hydrateLedger, addDays, SEMAINE_TENUE } from '../../core/index.js';

const LUNDI = '2026-10-05';
const at = (day) => `${day}T14:00:00Z`;
const QUETES = Array.from({ length: 8 }, (_, k) => ({ id: `q${k}`, task: `Quête ${k}`, domain: 'Maison', difficulty: 3, length: 2, priority: 5, status: 'todo', created: '2026-10-01', deadline: null }));

async function withServer(fn) {
  const s = await startServer({ tasksRaw: fmt(QUETES) });
  try { await fn(s); } finally { s.stop(); }
}

// Lit l'état sur le serveur, termine une quête, envoie les opérations.
async function terminer(s, id, now, opId) {
  const j = await (await s.get()).json();
  const game = migrateState(j.game, now, { tasks: j.tasks, ledger: j.ledger });
  const r = completeQuest(j.tasks, game, hydrateLedger(j.ledger, j.ledgerKeys), { id, gameRevision: j.gameRevision }, now);
  const res = await s.op(r.ops, opId);
  return { res, r };
}
const cles = async (s) => (await (await s.get()).json()).ledgerKeys.filter((k) => k.startsWith('semaine:'));

test('semaine tenue par l’API : acceptée au 5e jour travaillé, une seule clé, rejeu et doublon refusés', () => withServer(async (s) => {
  for (let k = 0; k < 4; k++) assert.equal((await terminer(s, `q${k}`, at(addDays(LUNDI, k)), `j${k}`)).res.status, 200);
  assert.deepEqual(await cles(s), []);
  const cinq = await terminer(s, 'q4', at(addDays(LUNDI, 4)), 'j4');
  assert.equal(cinq.res.status, 200);
  const entree = cinq.r.entries.find((e) => e.type === 'semaine');
  assert.equal(entree.key, 'semaine:2026-10-05');
  assert.equal(entree.materials, SEMAINE_TENUE.materials);
  assert.deepEqual(await cles(s), ['semaine:2026-10-05']);
  // l'entrée est relue telle quelle par le serveur, avec ses Matériaux
  const j = await (await s.get()).json();
  assert.equal(j.ledger.find((e) => e.key === 'semaine:2026-10-05').materials, SEMAINE_TENUE.materials);
  // le même envoi rejoué (même opId) : rien n'est réappliqué
  assert.equal((await s.op(cinq.r.ops, 'j4')).status, 200);
  assert.deepEqual(await cles(s), ['semaine:2026-10-05']);
  // la même entrée sous un autre envoi (second appareil resté en arrière) : refusée par la clé unique
  const dup = await s.op([{ type: 'ledger.append', entries: [entree] }]);
  assert.equal(dup.status, 409);
  assert.equal((await dup.json()).code, 'duplicate_key');
  // un 6e jour : aucune nouvelle entrée de semaine
  const six = await terminer(s, 'q5', at(addDays(LUNDI, 5)), 'j5');
  assert.equal(six.res.status, 200);
  assert.equal(six.r.entries.some((e) => e.type === 'semaine'), false);
  assert.deepEqual(await cles(s), ['semaine:2026-10-05']);
}));
