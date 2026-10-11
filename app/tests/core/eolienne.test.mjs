// Éolienne (bible §5, lot 4 ; lot J) : de l'Énergie en plus les jours où tu passes au village, versée au premier passage
// du temps du jour (la visite du jour), inscrite au registre sous une clé unique par jour (prod:eolienne:{jour}), jamais
// deux fois le même jour. Remballer ne la reprend plus.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EOLIENNE_ENERGIE, addDays, openApp, advanceTime, completeQuest, remballerQuest, createQuest, reopenQuest, construire,
  joursTravailles,
} from '../../core/index.js';
import { fresh, step, task, avantLeChalet } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const D = '2026-10-06';
const monde = (eolienne = true) => {
  const w = fresh(Array.from({ length: 4 }, (_, k) => task({ id: `q${k}`, created: '2026-10-01' })), at(D));
  avantLeChalet(w.game);
  w.game.habitants = 3;
  if (eolienne) w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, { id: 'eolienne-1', type: 'eolienne' }];
  return w;
};
const prod = (ledger) => ledger.filter((e) => e.key.startsWith('prod:eolienne:'));
// ce que fait l'interface à l'ouverture : openApp, puis le passage du temps
const visite = (w, day, h = 14) => step(step(w, openApp, {}, at(day, h)).world, advanceTime, {}, at(day, h));
// une quête terminée, puis le passage du temps qui la suit dans l'interface
const quete = (w, id, now) => step(step(w, completeQuest, { id }, now).world, advanceTime, {}, now).world;

test('première visite du jour : +Énergie de l’éolienne, au registre sous prod:eolienne:{jour}', () => {
  const { world, r } = visite(monde(), D);
  const p = prod(world.ledger);
  assert.equal(p.length, 1);
  assert.deepEqual({ ...p[0], at: undefined }, { key: `prod:eolienne:${D}`, at: undefined, day: D, type: 'prod', batiment: 'eolienne', pe: 0, energy: EOLIENNE_ENERGIE, materials: 0 });
  const ouverture = world.ledger.find((e) => e.key === `bonus:ouverture:${D}`);
  assert.equal(world.game.resources.energy, 10 + ouverture.energy + EOLIENNE_ENERGIE);
  assert.ok(r.events.some((e) => e.type === 'reward' && e.source === 'eolienne' && e.energy === EOLIENNE_ENERGIE));
});

test('jamais deux fois le même jour : seconde visite, quêtes, remballer puis refaire, ou rouvrir puis refaire', () => {
  let w = visite(monde(), D).world;
  w = visite(w, D, 15).world;
  w = quete(w, 'q0', at(D, 16));
  w = quete(w, 'q1', at(D, 17));
  w = step(w, remballerQuest, { id: 'q1' }, at(D, 18)).world;
  w = quete(w, 'q1', at(D, 19));
  w = step(w, reopenQuest, { id: 'q0' }, at(D, 20)).world;
  w = quete(w, 'q0', at(D, 21));
  assert.equal(prod(w.ledger).length, 1);
  // le lendemain, de nouveau
  w = visite(w, '2026-10-07').world;
  assert.deepEqual(prod(w.ledger).map((e) => e.day), [D, '2026-10-07']);
});

test('sans éolienne, rien ; bâtie dans la journée, elle tourne aussitôt, une fois', () => {
  let w = visite(monde(false), D).world;
  assert.equal(prod(w.ledger).length, 0);
  w.game.habitants = 3;
  w.game.resources = { energy: 50, materials: 50, food: 5 };
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }];
  w = step(w, construire, { type: 'eolienne' }, at(D, 15)).world;
  assert.deepEqual(prod(w.ledger).map((e) => e.day), [D]);
  w = step(w, advanceTime, {}, at(D, 16)).world;
  assert.deepEqual(prod(w.ledger).map((e) => e.day), [D]);
});

test('une quête ajoutée « déjà faite » compte comme un jour travaillé', () => {
  const { world } = step(monde(), createQuest, { task: 'Ranger le cabanon', domain: 'Maison', alreadyDone: true }, at(D));
  assert.equal(joursTravailles(world.ledger, addDays(D, -1), D), 1);
});

// ───────── Remballer (lot 5, puis lot J) : l'Énergie de l'éolienne ne dépend plus des quêtes, rien n'est repris ─────────
const net = (ledger, day = D) => ledger.filter((e) => e.type === 'prod' && e.batiment === 'eolienne' && e.day === day).reduce((s, e) => s + e.energy, 0);

test('remballer la seule quête payée du jour, ou le lendemain celle de la veille : l’éolienne garde son Énergie', () => {
  let w = visite(monde(), D, 22).world; // 18 h à Montréal
  w = quete(w, 'q0', at(D, 22));
  w = visite(w, '2026-10-07').world;
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at('2026-10-07', 15));
  assert.equal(r.entries.filter((e) => e.type === 'prod').length, 0);
  assert.equal(r.events.filter((e) => e.type === 'eolienne-reprise').length, 0);
  assert.equal(net(world.ledger, D), EOLIENNE_ENERGIE);
  assert.equal(net(world.ledger, '2026-10-07'), EOLIENNE_ENERGIE);
});

test('un jour déjà repris avant le lot J (le jour de l’envoi) : la visite suivante reverse l’Énergie sous :2, une fois', () => {
  const w0 = monde();
  w0.ledger = [
    { key: `prod:eolienne:${D}`, at: at(D, 13), day: D, type: 'prod', batiment: 'eolienne', pe: 0, energy: EOLIENNE_ENERGIE, materials: 0 },
    { key: `reprise:eolienne:${D}:1`, at: at(D, 13), day: D, type: 'prod', batiment: 'eolienne', reprise: true, pe: 0, energy: -EOLIENNE_ENERGIE, materials: 0 },
  ];
  let w = visite(w0, D).world;
  w = visite(w, D, 15).world;
  assert.equal(net(w.ledger), EOLIENNE_ENERGIE);
  assert.ok(w.ledger.some((e) => e.key === `prod:eolienne:${D}:2`));
  assert.equal(new Set(w.ledger.map((e) => e.key)).size, w.ledger.length);
});
