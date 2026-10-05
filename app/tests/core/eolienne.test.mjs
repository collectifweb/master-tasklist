// Éolienne (bible §5, lot 4) : de l'Énergie en plus les jours où tu travailles, versée à la première quête payée du
// jour, inscrite au registre sous une clé unique par jour (prod:eolienne:{jour}), jamais deux fois le même jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EOLIENNE_ENERGIE, completeQuest, remballerQuest, createQuest, reopenQuest } from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const D = '2026-10-06';
const monde = (eolienne = true) => {
  const w = fresh(Array.from({ length: 4 }, (_, k) => task({ id: `q${k}`, created: '2026-10-01' })), at(D));
  w.game.habitants = 3;
  if (eolienne) w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, { id: 'eolienne-1', type: 'eolienne' }];
  return w;
};
const prod = (ledger) => ledger.filter((e) => e.key.startsWith('prod:eolienne:'));

test('première quête payée du jour : +Énergie de l’éolienne, au registre sous prod:eolienne:{jour}', () => {
  const w = monde();
  const { world, r } = step(w, completeQuest, { id: 'q0' }, at(D));
  const p = prod(world.ledger);
  assert.equal(p.length, 1);
  assert.deepEqual({ ...p[0], at: undefined }, { key: `prod:eolienne:${D}`, at: undefined, day: D, type: 'prod', batiment: 'eolienne', pe: 0, energy: EOLIENNE_ENERGIE, materials: 0 });
  const quest = r.entries.find((e) => e.type === 'reward');
  assert.equal(world.game.resources.energy, 10 + quest.energy + EOLIENNE_ENERGIE);
  assert.ok(r.events.some((e) => e.type === 'reward' && e.source === 'eolienne' && e.energy === EOLIENNE_ENERGIE));
});

test('jamais deux fois le même jour : 2e quête, remballer puis refaire, ou rouvrir puis refaire', () => {
  let w = step(monde(), completeQuest, { id: 'q0' }, at(D)).world;
  w = step(w, completeQuest, { id: 'q1' }, at(D, 15)).world;
  w = step(w, remballerQuest, { id: 'q1' }, at(D, 16)).world;
  w = step(w, completeQuest, { id: 'q1' }, at(D, 17)).world;
  w = step(w, reopenQuest, { id: 'q0' }, at(D, 18)).world;
  w = step(w, completeQuest, { id: 'q0' }, at(D, 19)).world;
  assert.equal(prod(w.ledger).length, 1);
  // le lendemain, de nouveau
  w = step(w, completeQuest, { id: 'q2' }, at('2026-10-07')).world;
  assert.deepEqual(prod(w.ledger).map((e) => e.day), [D, '2026-10-07']);
});

test('sans éolienne, rien ; une quête qui ne paie rien (déjà payée) ne déclenche rien non plus', () => {
  assert.equal(prod(step(monde(false), completeQuest, { id: 'q0' }, at(D)).world.ledger).length, 0);
  let w = step(monde(false), completeQuest, { id: 'q0' }, at(D)).world;
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, { id: 'eolienne-1', type: 'eolienne' }];
  w = step(w, reopenQuest, { id: 'q0' }, at(D, 15)).world;
  w = step(w, completeQuest, { id: 'q0' }, at(D, 16)).world; // déjà payée : 0, pas de jour travaillé de plus
  assert.equal(prod(w.ledger).length, 0);
});

test('une quête ajoutée « déjà faite » compte aussi comme un jour travaillé', () => {
  const w = monde();
  const { world } = step(w, createQuest, { task: 'Ranger le cabanon', domain: 'Maison', alreadyDone: true }, at(D));
  assert.equal(prod(world.ledger).length, 1);
});

// ───────── Remballer (lot 5) : le jour redevient sans quête payée → l'Énergie de l'éolienne est reprise ─────────
const net = (ledger, day = D) => ledger.filter((e) => e.type === 'prod' && e.batiment === 'eolienne' && e.day === day).reduce((s, e) => s + e.energy, 0);
const uniques = (ledger) => new Set(ledger.map((e) => e.key)).size === ledger.length;

test('remballer la seule quête payée du jour reprend l’Énergie de l’éolienne, par une écriture inverse', () => {
  let w = step(monde(), completeQuest, { id: 'q0' }, at(D)).world;
  const e0 = w.game.resources.energy;
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at(D, 15));
  const reprise = r.entries.filter((e) => e.type === 'prod');
  assert.equal(reprise.length, 1);
  assert.deepEqual({ ...reprise[0], at: undefined }, {
    key: `reprise:eolienne:${D}:1`, at: undefined, day: D, type: 'prod', batiment: 'eolienne', reprise: true, pe: 0, energy: -EOLIENNE_ENERGIE, materials: 0,
  });
  assert.equal(net(world.ledger), 0);
  // le gain de la quête et celui de l'éolienne sont repris
  const quete = w.ledger.find((e) => e.key === 'reward:q0:1');
  assert.equal(world.game.resources.energy, Math.round((e0 - quete.energy - EOLIENNE_ENERGIE) * 10) / 10);
  // le registre n'est jamais réécrit : l'entrée d'origine est toujours là
  assert.ok(world.ledger.some((e) => e.key === `prod:eolienne:${D}` && e.energy === EOLIENNE_ENERGIE));
});

test('remballer une quête quand une autre reste payée ce jour-là : l’éolienne garde son Énergie', () => {
  let w = step(monde(), completeQuest, { id: 'q0' }, at(D)).world;
  w = step(w, completeQuest, { id: 'q1' }, at(D, 15)).world;
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at(D, 16));
  assert.equal(r.entries.filter((e) => e.type === 'prod').length, 0);
  assert.equal(net(world.ledger), EOLIENNE_ENERGIE);
});

test('une quête de nouveau payée ce jour-là : l’Énergie est reversée, jamais deux fois en même temps', () => {
  let w = step(monde(), completeQuest, { id: 'q0' }, at(D)).world;
  w = step(w, remballerQuest, { id: 'q0' }, at(D, 15)).world;
  w = step(w, completeQuest, { id: 'q1' }, at(D, 16)).world;
  assert.equal(net(w.ledger), EOLIENNE_ENERGIE);
  assert.ok(w.ledger.some((e) => e.key === `prod:eolienne:${D}:2`));
  w = step(w, completeQuest, { id: 'q2' }, at(D, 17)).world; // une 2e quête payée : rien de plus
  assert.equal(net(w.ledger), EOLIENNE_ENERGIE);
  w = step(w, remballerQuest, { id: 'q1' }, at(D, 18)).world; // q2 reste payée : rien n'est repris
  assert.equal(net(w.ledger), EOLIENNE_ENERGIE);
  w = step(w, remballerQuest, { id: 'q2' }, at(D, 19)).world; // plus aucune : repris
  assert.equal(net(w.ledger), 0);
  w = step(w, completeQuest, { id: 'q3' }, at(D, 20)).world; // de nouveau : reversé
  assert.equal(net(w.ledger), EOLIENNE_ENERGIE);
  assert.ok(uniques(w.ledger));
  // la quête remballée puis refaite ne paie plus rien : elle ne relance pas l'éolienne non plus
  w = step(w, remballerQuest, { id: 'q3' }, at(D, 21)).world;
  w = step(w, completeQuest, { id: 'q0' }, at(D, 22)).world;
  assert.equal(net(w.ledger), 0);
});

test('remballer le lendemain (moins de 24 h) une quête de la veille : c’est la veille qui perd l’Énergie', () => {
  let w = step(monde(), completeQuest, { id: 'q0' }, at(D, 22)).world; // 18 h à Montréal
  w = step(w, completeQuest, { id: 'q1' }, at('2026-10-07', 14)).world;
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at('2026-10-07', 15));
  assert.deepEqual(r.entries.filter((e) => e.type === 'prod').map((e) => e.key), [`reprise:eolienne:${D}:1`]);
  assert.equal(net(world.ledger, D), 0);
  assert.equal(net(world.ledger, '2026-10-07'), EOLIENNE_ENERGIE);
});
