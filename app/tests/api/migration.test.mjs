// Lot 3 (migration sûre), côté API : refus de l'ancienne app, copie unique de la partie v1, fichiers jamais réécrits.
// Données fictives seulement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './helpers.mjs';
import { migrateState, hydrateLedger } from '../../core/index.js';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const OUTDATED = 'L’app a été mise à jour : recharge la page.';

// Partie, registre et journal des opérations laissés par la v1 (forme réelle, valeurs fictives).
const V1_GAME = JSON.stringify({
  version: 1, createdAt: '2026-10-01T14:00:00.000Z', startDay: '2026-10-01',
  resources: { energy: 23.4, materials: 41, confidence: 4 }, lueur: { place: 12, champs: 30 }, filLibre: 7.5,
}, null, 4) + '\n';
const V1_REWARD = {
  key: 'reward:a1:1', at: '2026-10-04T15:00:00.000Z', day: '2026-10-04', type: 'reward', taskId: 'a1', occurrence: 1,
  pe: 8, energy: 2.4, materials: 4, lueur: { sector: 'place', amount: 6 }, filLibre: 2,
};
const V1_LEDGER = JSON.stringify(V1_REWARD) + '\n';
const V1_OPS = [{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }]; // même JSON en PHP et en JS : même empreinte
const V1_OPS_JSON = JSON.stringify([{ id: 'v1-op', h: sha1(JSON.stringify(V1_OPS)) }]) + '\n';
const V2_GAME = { version: 2, migratedAt: '2026-10-05T14:00:00.000Z', resources: { energy: 10, materials: 20, food: 5 }, habitants: 0 };

const file = (s, name) => join(s.dataDir, name);
const v1Copy = (s) => join(s.dataDir, 'backups', 'game-state.v1.json');
const raw = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : null);
/** Contenu exact des quatre fichiers de données. */
const snapshot = (s) => ({
  tasks: s.readTasksRaw(), game: raw(file(s, 'game-state.json')), ledger: raw(file(s, 'ledger.jsonl')), ops: raw(file(s, 'ops.json')),
});

/** Serveur parti des fichiers de la v1, posés avant la première requête. */
async function withV1(fn, { copy } = {}) {
  const s = await startServer();
  try {
    mkdirSync(join(s.dataDir, 'backups'), { recursive: true });
    writeFileSync(file(s, 'game-state.json'), V1_GAME);
    writeFileSync(file(s, 'ledger.jsonl'), V1_LEDGER);
    writeFileSync(file(s, 'ops.json'), V1_OPS_JSON);
    if (copy !== undefined) writeFileSync(v1Copy(s), copy);
    await fn(s);
  } finally {
    s.stop();
  }
}

test('ancienne app : écriture sans version de client (ou < 6) refusée, code client_outdated, rien écrit ni retenu', () => withV1(async (s) => {
  const before = snapshot(s);
  const listing = readdirSync(s.dataDir).sort();
  const ops = [
    { type: 'task.upsert', task: { id: 'a2', status: 'done' } },
    { type: 'game.set', game: { version: 1, resources: { energy: 99 } }, baseGameRevision: sha1(V1_GAME) },
  ];
  for (const extra of [{}, { client: 1 }, { client: 2 }, { client: 3 }, { client: 4 }, { client: 5 }, { client: 6 }, { client: 7 }, { client: '8' }, { client: null }]) {
    const r = await s.post({ opId: 'vieil-onglet', ops, ...extra });
    assert.equal(r.status, 409, JSON.stringify(extra));
    const j = await r.json();
    assert.equal(j.ok, false);
    assert.equal(j.code, 'client_outdated');
    assert.equal(j.error, OUTDATED);
  }
  assert.deepEqual(snapshot(s), before);
  assert.deepEqual(readdirSync(s.dataDir).sort(), listing); // ni verrou, ni sauvegarde : refusé avant tout
  // l'opId refusé n'a pas été retenu : appliqué normalement par la v2, ce n'est pas un rejeu
  const r = await s.op([{ type: 'task.upsert', task: { id: 'a2', status: 'done' } }], 'vieil-onglet');
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.replay, undefined);
  assert.equal(JSON.parse(s.readTasksRaw()).find((t) => t.id === 'a2').status, 'done');
}));

test('une lecture (GET) reste permise à l’ancienne app', () => withV1(async (s) => {
  const r = await s.get();
  assert.equal(r.status, 200);
  assert.equal((await r.json()).game.version, 1);
}));

test('passage en v2 : copie de la partie v1 ; tasks.json, registre et opérations identiques à l’octet', () => withV1(async (s) => {
  const before = snapshot(s);
  assert.equal(existsSync(v1Copy(s)), false);
  const r = await s.op([{ type: 'game.set', game: V2_GAME, baseGameRevision: sha1(V1_GAME) }], 'migration');
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.equal(j.game.version, 2);
  assert.equal(readFileSync(v1Copy(s), 'utf8'), V1_GAME); // la partie v1 telle quelle, à l'octet
  const after = snapshot(s);
  assert.equal(after.tasks, before.tasks);
  assert.equal(after.ledger, before.ledger);
  const ops = JSON.parse(after.ops);
  assert.deepEqual(ops[0], JSON.parse(V1_OPS_JSON)[0]); // l'opération v1 est toujours retenue, en tête
  assert.equal(ops.at(-1).id, 'migration');
}));

test('copie v1 unique : jamais remplacée par les écritures suivantes ni élaguée avec les sauvegardes', () => withV1(async (s) => {
  let j = await (await s.op([{ type: 'game.set', game: V2_GAME, baseGameRevision: sha1(V1_GAME) }])).json();
  let rev = j.gameRevision;
  for (let i = 0; i < 20; i++) {
    j = await (await s.op([{ type: 'game.set', game: { ...V2_GAME, n: i }, baseGameRevision: rev }])).json();
    assert.equal(j.ok, true);
    rev = j.gameRevision;
  }
  assert.equal(readFileSync(v1Copy(s), 'utf8'), V1_GAME);
  assert.ok(s.backups('game-state.json').length < 40, 'les sauvegardes ordinaires sont bien élaguées');
}));

test('copie v1 déjà présente : jamais écrasée', () => withV1(async (s) => {
  const r = await s.op([{ type: 'game.set', game: V2_GAME, baseGameRevision: sha1(V1_GAME) }]);
  assert.equal(r.status, 200);
  assert.equal(readFileSync(v1Copy(s), 'utf8'), 'copie déjà faite\n');
}, { copy: 'copie déjà faite\n' }));

test('partie neuve ou déjà en v2 : aucune copie v1', async () => {
  const s = await startServer();
  try {
    let j = await (await s.op([{ type: 'game.set', game: V2_GAME, baseGameRevision: null }])).json();
    assert.equal(j.ok, true);
    j = await (await s.op([{ type: 'game.set', game: { ...V2_GAME, n: 1 }, baseGameRevision: j.gameRevision }])).json();
    assert.equal(j.ok, true);
    assert.equal(existsSync(v1Copy(s)), false);
  } finally {
    s.stop();
  }
});

test('opId de la v1 rejoué : sans effet, par l’ancienne app comme par la v2', () => withV1(async (s) => {
  const before = snapshot(s);
  // l'ancienne app rejoue son opération : refusée
  let r = await s.post({ opId: 'v1-op', ops: V1_OPS });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'client_outdated');
  // la v2 la rejoue telle quelle : déjà appliquée, rien n'est refait
  r = await s.post({ client: 8, opId: 'v1-op', ops: V1_OPS });
  let j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.replay, true);
  // la v2 la rejoue recalculée (autre corps) : refusée
  r = await s.post({ client: 8, opId: 'v1-op', ops: [...V1_OPS, { type: 'ledger.append', entries: [{ key: 'reward:a1:2', pe: 1 }] }] });
  j = await r.json();
  assert.equal(r.status, 409);
  assert.equal(j.code, 'op_id_reused');
  assert.deepEqual(snapshot(s), before);
}));

test('quête payée en v1 : la v2 ne peut pas l’inscrire une seconde fois', () => withV1(async (s) => {
  const before = snapshot(s);
  const r = await s.op([{ type: 'ledger.append', entries: [{ key: 'reward:a1:1', at: '2026-10-05T15:00:00.000Z', type: 'reward', pe: 8, energy: 2.4, materials: 4, quartier: 'place' }] }]);
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'duplicate_key');
  assert.deepEqual(snapshot(s), before);
}));

test('versions 3, 4, 5, 6 et 7 refusées (409 client_outdated) : un onglet resté à l’ancien prix des niveaux, d’avant les imprévus, d’avant l’hiver, d’avant l’allure ou d’avant le rang Village, n’écrit plus', async () => {
  const s = await startServer();
  try {
    const before = s.readTasksRaw();
    const ops = [{ type: 'task.upsert', task: { id: 'a2', status: 'done' } }];
    for (const client of [2, 3, 4, 5, 6, 7]) {
      const r = await s.post({ client, opId: 'onglet-ancien', ops });
      assert.equal(r.status, 409, `client ${client}`);
      const j = await r.json();
      assert.equal(j.code, 'client_outdated');
      assert.equal(j.error, OUTDATED);
      assert.equal(s.readTasksRaw(), before);
    }
    // la version 8 passe, et l'opId refusé n'a pas été retenu
    const ok = await s.post({ client: 8, opId: 'onglet-ancien', ops });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).replay, undefined);
  } finally {
    s.stop();
  }
});

test('permis : une partie v2 sans niveaux, convertie par le cœur, s’enregistre ; tasks.json et registre identiques à l’octet', async () => {
  const s = await startServer();
  try {
    mkdirSync(join(s.dataDir, 'backups'), { recursive: true });
    const game0 = JSON.stringify({
      version: 2, createdAt: '2026-10-01T14:00:00.000Z', startDay: '2026-10-01', resources: { energy: 77.4, materials: 88, food: 9 },
      habitants: 2, quartiers: { champs: 16, atelier: 5, mairie: 0, ecole: 0, garage: 0, place: 0 }, // niveaux 2 et 1
    }, null, 4) + '\n';
    const reward = { key: 'reward:a1:1', at: '2026-10-20T15:00:00.000Z', day: '2026-10-20', type: 'reward', taskId: 'a1', occurrence: 1, pe: 7, energy: 2.1, materials: 3.5, quartier: 'atelier' };
    writeFileSync(file(s, 'game-state.json'), game0);
    writeFileSync(file(s, 'ledger.jsonl'), JSON.stringify(reward) + '\n');
    const before = snapshot(s);
    const now = '2026-10-21T14:00:00Z';
    const j = await (await s.get()).json();
    const ctx = { tasks: j.tasks, ledger: hydrateLedger(j.ledger, j.ledgerKeys) };
    const game = migrateState(j.game, now, ctx);
    assert.deepEqual(game.permis, { dispo: 3, depuis: '2026-10-20', cadeau: 3 });
    const r = await s.op([{ type: 'game.set', game, baseGameRevision: j.gameRevision }]);
    assert.equal(r.status, 200, await r.clone().text());
    const after = snapshot(s);
    assert.equal(after.tasks, before.tasks);
    assert.equal(after.ledger, before.ledger);
    const saved = (await (await s.get()).json()).game;
    assert.deepEqual(saved.permis, game.permis);
    assert.deepEqual(saved.resources, { energy: 77.4, materials: 88, food: 9 });
    assert.deepEqual(saved.quartiers, JSON.parse(game0).quartiers);
    assert.deepEqual(migrateState(saved, '2026-10-25T14:00:00Z', ctx), saved); // relue plus tard : rien ne bouge
  } finally {
    s.stop();
  }
});
