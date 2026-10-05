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
