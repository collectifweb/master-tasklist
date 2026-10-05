import test from 'node:test';
import assert from 'node:assert/strict';
import {
  build, sow, harvest, storeReserve, souffler, payCost, isBuilt, BUILDABLES, BUILD_SLOT_COUNT, MAX_PLOTS, SEED_COST,
  PANTRY_MAX, RESERVE_MAX, createInitialState, migrateState, applyEntry,
} from '../../core/index.js';
import { BUILD_SLOTS, PLOT_SLOTS } from '../../world/layout.js';
import { MODEL_IDS } from '../../world/models.js';
import { T0, fresh, step } from './helpers.mjs';

const kinds = (r) => r.ops.map((o) => o.type);
const rich = (over = {}) => {
  const w = fresh();
  w.game.resources = { energy: 40, materials: 150, confidence: 0 };
  Object.assign(w.game, over);
  return w;
};
const reward = (day, sector = 'atelier', key = 'r:' + day) => ({
  key, at: day + 'T14:00:00Z', day, type: 'reward', taskId: key, occurrence: 1, pe: 10, energy: 3, materials: 5,
  lueur: { sector, amount: 7.5 }, filLibre: 2.5,
});

test('le catalogue suit la carte : emplacements de world/layout.js et modèles que le monde sait dessiner', () => {
  assert.deepEqual(BUILD_SLOT_COUNT, Object.fromEntries(Object.entries(BUILD_SLOTS).map(([k, v]) => [k, v.length])));
  assert.equal(MAX_PLOTS, PLOT_SLOTS.length);
  for (const def of Object.values(BUILDABLES)) assert.ok(MODEL_IDS.includes(def.model), def.model);
});

test('état initial : une parcelle vide, potager à zéro ; migrateState rend la parcelle à un état qui n’en a pas', () => {
  const g = createInitialState(T0);
  assert.deepEqual(g.plots, [{ id: 'parcelle-1', slot: 0, crop: null, stage: 0 }]);
  assert.deepEqual(g.garden.pantry, { courge: 0, patate: 0, ble: 0 });
  assert.deepEqual(g.avis, { current: null, history: [], veils: [] });
  const m = migrateState({ version: 1, plots: [], avis: { current: null, history: [] } }, T0);
  assert.equal(m.plots.length, 1);
  assert.deepEqual(m.avis.veils, []);
  assert.equal(m.garden.reserve, 0);
});

test('payCost : retire le coût, refuse s’il manque quelque chose', () => {
  const g = createInitialState(T0);
  payCost(g, { energy: 4, materials: 5 });
  assert.deepEqual([g.resources.energy, g.resources.materials], [6, 10]);
  assert.throws(() => payCost(g, { energy: 0, materials: 11 }), /Matériaux : il en faut 11/);
  assert.throws(() => payCost(g, { energy: 7, materials: 0 }), /Énergie : il en faut 7/);
});

test('réparer la Tour : 20 ▣ + 6 ⚡, repère fixe { id: tour, state: reparee }, une seule fois', () => {
  const w = rich();
  const { world, r } = step(w, build, { id: 'tour' });
  assert.deepEqual(world.game.placements, [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }]);
  assert.deepEqual([world.game.resources.energy, world.game.resources.materials], [34, 130]);
  assert.deepEqual(r.events, [{ type: 'construction', id: 'tour', model: 'tour', sector: 'place', cost: { energy: 6, materials: 20 } }]);
  assert.deepEqual(kinds(r), ['game.set']); // une dépense ne passe pas par le registre
  assert.ok(isBuilt(world.game, 'tour'));
  assert.throws(() => step(world, build, { id: 'tour' }), /déjà construit/);
  assert.equal(w.game.placements.length, 0); // l'entrée n'est pas modifiée
});

test('sans assez de ressources : erreur, aucune opération', () => {
  const w = fresh(); // 10 ⚡ / 15 ▣
  assert.throws(() => build(w.tasks, w.game, w.ledger, { id: 'tour', gameRevision: null }, T0), /Matériaux/);
  assert.throws(() => build(w.tasks, w.game, w.ledger, { id: 'chateau', gameRevision: null }, T0), /inconnue/);
});

test('game.set exige la révision de l’état du jeu', () => {
  const w = rich();
  assert.throws(() => build(w.tasks, w.game, w.ledger, { id: 'tunnel' }, T0), /gameRevision/);
});

test('établi : Atelier ouvert (chapitre 2) ; les décors l’exigent ; érables : 3 au plus, 15 ▣ en tout', () => {
  let w = rich();
  assert.throws(() => step(w, build, { id: 'etabli' }), /cendre/);
  w.game.sectors.atelier.open = true;
  assert.throws(() => step(w, build, { id: 'erable' }), /établi/);
  w = step(w, build, { id: 'etabli' }).world;
  assert.deepEqual(w.game.placements[0], { id: 'etabli', model: 'etabli', sector: 'atelier', state: 'construit' });
  const m0 = w.game.resources.materials;
  for (let i = 0; i < 3; i++) w = step(w, build, { id: 'erable' }).world;
  assert.equal(m0 - w.game.resources.materials, 15);
  assert.deepEqual(w.game.placements.filter((p) => p.model === 'erable').map((p) => [p.id, p.sector]),
    [['erable-1', 'atelier'], ['erable-2', 'atelier'], ['erable-3', 'atelier']]);
  assert.throws(() => step(w, build, { id: 'erable' }), /3 au plus/);
});

test('décors : secteur au choix s’il est ouvert, jamais plus que les emplacements de la carte', () => {
  let w = rich({ placements: [{ id: 'etabli', model: 'etabli', sector: 'atelier', state: 'construit' }] });
  w.game.sectors.atelier.open = true;
  w = step(w, build, { id: 'lanterne', sector: 'champs' }).world;
  assert.equal(w.game.placements.at(-1).sector, 'champs');
  assert.throws(() => step(w, build, { id: 'lanterne', sector: 'archives' }), /cendre/);
  for (let i = 0; i < BUILD_SLOT_COUNT.place; i++) w = step(w, build, { id: 'lanterne' }).world;
  assert.throws(() => step(w, build, { id: 'lanterne' }), /place libre/);
  // les repères (Tour, établi) ne prennent pas d'emplacement
  w = step(w, build, { id: 'tour' }).world;
  assert.equal(w.game.placements.filter((p) => p.sector === 'place').length, 3);
});

test('tunnel de culture : 15 ▣, un seul', () => {
  const { world, r } = step(rich(), build, { id: 'tunnel' });
  assert.deepEqual(world.game.placements, [{ id: 'tunnel-1', model: 'tunnel', sector: 'champs' }]);
  assert.equal(r.events[0].cost.materials, 15);
  assert.throws(() => step(world, build, { id: 'tunnel' }), /déjà/);
});

test('parcelle supplémentaire : 10 ▣, emplacement libre suivant, 4 au plus', () => {
  let w = rich();
  const s = step(w, build, { id: 'parcelle' });
  assert.deepEqual(s.r.events, [{ type: 'parcelle', id: 'parcelle-2', slot: 1, cost: { energy: 0, materials: 10 } }]);
  w = s.world;
  w = step(w, build, { id: 'parcelle' }).world;
  w = step(w, build, { id: 'parcelle' }).world;
  assert.deepEqual(w.game.plots.map((p) => p.slot), [0, 1, 2, 3]);
  assert.equal(w.game.resources.materials, 120);
  assert.throws(() => step(w, build, { id: 'parcelle' }), /4 parcelles au plus/);
});

test('semer : courge 3 ⚡, patate et blé 4 ⚡, parcelle vide seulement', () => {
  let w = fresh();
  w.game.plots.push({ id: 'parcelle-2', slot: 1, crop: null, stage: 0 });
  const s = step(w, sow, { crop: 'courge' });
  assert.deepEqual(s.r.events, [{ type: 'semis', plotId: 'parcelle-1', slot: 0, crop: 'courge', cost: { energy: 3, materials: 0 } }]);
  w = s.world;
  assert.equal(w.game.resources.energy, 7);
  assert.equal(w.game.garden.sown.courge, 1);
  assert.throws(() => step(w, sow, { crop: 'courge', plotId: 'parcelle-1' }), /déjà semée/);
  w = step(w, sow, { crop: 'ble', plotId: 'parcelle-2' }).world;
  assert.equal(w.game.resources.energy, 7 - SEED_COST.ble);
  assert.throws(() => step(w, sow, { crop: 'courge' }), /Aucune parcelle libre/);
  assert.throws(() => step(w, sow, { crop: 'tomate' }), /Culture inconnue/);
});

test('les cultures poussent d’un stade par jour allumé, ne pourrissent jamais, et une parcelle vide ne pousse pas', () => {
  let g = createInitialState(T0);
  g.plots = [{ id: 'a', slot: 0, crop: 'courge', stage: 0 }, { id: 'b', slot: 1, crop: null, stage: 0 }];
  for (const day of ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']) g = applyEntry(g, reward(day), day + 'T15:00:00Z').game;
  assert.deepEqual(g.plots.map((p) => [p.crop, p.stage]), [['courge', 2], [null, 0]]); // mûre et elle le reste
});

test('récolter : vers le garde-manger, la parcelle redevient vide ; rien de mûr → erreur', () => {
  let w = fresh();
  w.game.plots = [{ id: 'a', slot: 0, crop: 'courge', stage: 2 }, { id: 'b', slot: 1, crop: 'ble', stage: 3 }];
  assert.throws(() => step(w, harvest, { plotId: 'b' }), /pas encore mûre/);
  const s = step(w, harvest, {});
  assert.deepEqual(s.r.events, [{ type: 'recolte', plotId: 'a', slot: 0, crop: 'courge', pantry: 1 }]);
  assert.deepEqual(kinds(s.r), ['game.set']); // la récolte n'est pas un gain du registre
  w = s.world;
  assert.deepEqual(w.game.plots[0], { id: 'a', slot: 0, crop: null, stage: 0 });
  assert.equal(w.game.garden.harvested.courge, 1);
  assert.throws(() => step(w, harvest, {}), /Rien à récolter/);
});

test('garde-manger plein (12) : la culture attend mûre dans le champ, rien n’est perdu', () => {
  let w = fresh();
  w.game.garden.pantry = { courge: 6, patate: 5, ble: 0 };
  w.game.plots = [{ id: 'a', slot: 0, crop: 'courge', stage: 2 }, { id: 'b', slot: 1, crop: 'courge', stage: 2 }];
  const s = step(w, harvest, {});
  assert.equal(s.r.events.length, 1); // une seule place
  assert.deepEqual(s.world.game.plots[1], { id: 'b', slot: 1, crop: 'courge', stage: 2 });
  assert.throws(() => step(s.world, harvest, {}), new RegExp(`plein \\(${PANTRY_MAX}\\)`));
});

test('Réserve d’hiver : courges du garde-manger, 6 au plus, compteur cumulé', () => {
  let w = fresh();
  w.game.garden.pantry.courge = 8;
  assert.throws(() => step(fresh(), storeReserve, {}), /Aucune courge/);
  const s = step(w, storeReserve, { n: 10 });
  assert.deepEqual(s.r.events, [{ type: 'reserve', courges: RESERVE_MAX, reserve: RESERVE_MAX }]);
  w = s.world;
  assert.deepEqual([w.game.garden.pantry.courge, w.game.garden.reserve, w.game.garden.reserved], [2, 6, 6]);
  assert.throws(() => step(w, storeReserve, {}), /pleine/);
});

test('Souffler : 8 ⚡ → +5 Fil libre', () => {
  const w = fresh();
  w.game.resources.energy = 9;
  const s = step(w, souffler, {});
  assert.equal(s.world.game.resources.energy, 1);
  assert.equal(s.world.game.filLibre, 5);
  assert.deepEqual(s.r.events, [{ type: 'souffler', energy: 8, filLibre: 5 }]);
  assert.throws(() => step(s.world, souffler, {}), /Énergie/);
});
