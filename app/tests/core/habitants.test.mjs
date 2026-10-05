// Accueillir une famille (bible §3, lot 4) : un logement libre et de la Nourriture dépensée, par un geste choisi,
// donnent un habitant. Personne ne part, aucune Nourriture n'est consommée en cachette. Le rang suit village.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCUEIL_NOURRITURE, accueillir, refusAccueillir, logements, construire, completeQuest, advanceTime, openApp,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const NOW = '2026-10-06T14:00:00Z';
const avecChalets = (n, food = 100, habitants = 0) => {
  const w = fresh([], NOW);
  w.game.resources = { energy: 50, materials: 50, food };
  w.game.batiments = Array.from({ length: n }, (_, k) => ({ id: `chalet-${k + 1}`, type: 'chalet' }));
  w.game.habitants = habitants;
  return w;
};

test('logements : 2 places par chalet ; les places libres', () => {
  assert.deepEqual(logements(avecChalets(0).game), { places: 0, habitants: 0, libres: 0 });
  assert.deepEqual(logements(avecChalets(2, 0, 3).game), { places: 4, habitants: 3, libres: 1 });
});

test('accueillir : −Nourriture, +1 habitant, événement « famille » ; rien au registre', () => {
  const { world, r } = step(avecChalets(1, 30), accueillir, {}, NOW);
  assert.equal(world.game.habitants, 1);
  assert.equal(world.game.resources.food, 30 - ACCUEIL_NOURRITURE);
  assert.deepEqual(r.events, [{ type: 'famille', habitants: 1, nourriture: ACCUEIL_NOURRITURE }]);
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.ops.map((o) => o.type), ['game.set']);
});

test('refus : pas de chalet (« Il faut d’abord un chalet. »)', () => {
  const w = avecChalets(0, 100);
  assert.equal(refusAccueillir(w.game), 'Il faut d’abord un chalet.');
  assert.throws(() => step(w, accueillir, {}, NOW), { message: 'Il faut d’abord un chalet.' });
});

test('refus : aucun logement libre', () => {
  const w = avecChalets(1, 100, 2);
  assert.equal(refusAccueillir(w.game), 'Aucun logement libre : rebâtis un chalet.');
});

test('refus : il manque de la Nourriture, avec le nombre exact', () => {
  const w = avecChalets(1, ACCUEIL_NOURRITURE - 4);
  assert.equal(refusAccueillir(w.game), 'Il manque 4 Nourriture.');
  assert.throws(() => step(w, accueillir, {}, NOW), { message: 'Il manque 4 Nourriture.' });
  assert.equal(w.game.habitants, 0);
});

test('rang : la 3e famille fait passer au Hameau (événement « rang »), la 2e non', () => {
  let w = avecChalets(2, 100, 1);
  let s = step(w, accueillir, {}, NOW);
  assert.equal(s.r.events.some((e) => e.type === 'rang'), false);
  s = step(s.world, accueillir, {}, NOW);
  assert.equal(s.world.game.habitants, 3);
  assert.deepEqual(s.r.events.find((e) => e.type === 'rang'), { type: 'rang', id: 'hameau', name: 'Hameau', habitants: 3 });
});

test('règle d’or : le temps qui passe, les quêtes et les constructions ne retirent jamais ni habitant ni Nourriture', () => {
  let w = avecChalets(2, 40, 3);
  w.tasks = [task({ id: 'q1' })];
  const days = ['2026-10-06', '2026-10-07', '2026-10-20', '2026-12-25', '2027-02-01'];
  for (const d of days) {
    w = step(w, openApp, {}, `${d}T13:00:00Z`).world;
    w = step(w, advanceTime, {}, `${d}T13:00:01Z`).world;
  }
  w = step(w, completeQuest, { id: 'q1' }, '2027-02-01T15:00:00Z').world;
  w.game.resources.materials = 500;
  w = step(w, construire, { type: 'chalet' }, '2027-02-01T15:00:00Z').world;
  assert.equal(w.game.habitants, 3);
  assert.equal(w.game.resources.food, 40);
});
