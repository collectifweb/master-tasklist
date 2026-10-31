// Les décors à placer soi-même (lot K, étape 2 des Grands travaux) : ouverts au rang Bourg, posés sur des coins fixes,
// payés surtout en Matériaux ; déplacer et ranger sont gratuits, ranger met le décor dans la remise, d'où le reposer est
// gratuit. Aucun effet de jeu. Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  poserDecor, deplacerDecor, rangerDecor, refusPoser, etatDecors, coinDe, DECORS, DECOR_IDS, COINS, RANGS, completeQuest,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';
import { COINS_ILE, DECOR, decorFor, surRoute } from '../../world/layout.js';

const JOUR = '2026-10-06';
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const BOURG = RANGS.find((r) => r.id === 'bourg').min;
const ACHETABLES = DECOR_IDS.filter((id) => !DECORS[id].unique);

function village({ habitants = BOURG, energy = 5000, materials = 5000 } = {}) {
  const w = fresh([task({ id: 'q1', task: 'Quête 1' })], at(JOUR, 12));
  w.game.habitants = habitants;
  w.game.resources = { ...w.game.resources, energy, materials };
  return w;
}
const poser = (w, params) => step(w, poserDecor, params, at(JOUR, 15));

test('le catalogue : des décors achetables, surtout en Matériaux, sans permis ni Nourriture ; des coins numérotés par quartier', () => {
  assert.ok(ACHETABLES.length >= 8, `${ACHETABLES.length} décors achetables`);
  for (const id of ACHETABLES) {
    const c = DECORS[id].cout;
    assert.ok(c.materials > 0 && c.materials > (c.energy || 0), `${id} : surtout en Matériaux`);
    assert.ok(!c.permis && !c.food, `${id} : ni permis ni Nourriture`);
    assert.ok(DECORS[id].nom, `${id} : un nom`);
  }
  assert.ok(COINS.length >= 10, `${COINS.length} coins`);
  assert.equal(new Set(COINS).size, COINS.length);
  for (const c of COINS) assert.match(c, /^(place|champs|atelier|mairie|ecole|garage)-\d+$/);
});

test('avant le Bourg : refusé, avec les habitants qui manquent ; la partie neuve n’a aucun décor', () => {
  const w = village({ habitants: BOURG - 3 });
  const e = etatDecors(w.game);
  assert.deepEqual(e.poses, {});
  assert.deepEqual(e.remise, []);
  assert.deepEqual(e.libres, COINS);
  assert.equal(refusPoser(w.game, { decor: 'banc', coin: COINS[0] }), 'Bourg\u00a0: encore 3 habitants.');
  assert.throws(() => poser(w, { decor: 'banc', coin: COINS[0] }), /Bourg\u00a0: encore 3 habitants/);
});

test('acheter et poser : le prix part, le décor est sur son coin, rien au registre ni dans les tâches', () => {
  const w = village();
  const cout = DECORS.banc.cout;
  const { world, r } = poser(w, { decor: 'banc', coin: COINS[2] });
  assert.equal(world.game.resources.energy, 5000 - (cout.energy || 0));
  assert.equal(world.game.resources.materials, 5000 - cout.materials);
  assert.deepEqual(world.game.decors, { poses: { [COINS[2]]: 'banc' }, remise: [] });
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.events, [{ type: 'decor-pose', decor: 'banc', coin: COINS[2], cout, remise: false }]);
  assert.deepEqual(world.tasks, w.tasks);
  const e = etatDecors(world.game);
  assert.equal(e.libres.length, COINS.length - 1);
  assert.ok(!e.libres.includes(COINS[2]));
});

test('poser : décor ou coin inconnus, coin pris (un double toucher ne paie qu’une fois), ce qui manque', () => {
  const w = village({ materials: 10 });
  assert.equal(refusPoser(w.game, { decor: 'statue', coin: COINS[0] }), 'Décor inconnu.');
  assert.equal(refusPoser(w.game, { decor: 'constructor', coin: COINS[0] }), 'Décor inconnu.');
  assert.equal(refusPoser(w.game, { decor: 'banc', coin: 'lac-1' }), 'Coin inconnu.');
  assert.equal(refusPoser(w.game, { decor: 'banc', coin: '__proto__' }), 'Coin inconnu.');
  assert.match(refusPoser(w.game, { decor: 'banc', coin: COINS[0] }), /^Il manque \d+ Matériaux\.$/);
  const riche = village();
  const { world } = poser(riche, { decor: 'banc', coin: COINS[0] });
  assert.equal(refusPoser(world.game, { decor: 'erable', coin: COINS[0] }), 'Ce coin est déjà pris.');
  assert.throws(() => step(world, poserDecor, { decor: 'banc', coin: COINS[0] }, at(JOUR, 15)), /déjà pris/);
});

test('sans coin (la rangée du catalogue) : refusé quand tous les coins sont pris ; poser exige un coin', () => {
  const w = village();
  assert.equal(refusPoser(w.game, { decor: 'banc' }), null);
  assert.equal(refusPoser(village({ habitants: BOURG - 1 }).game, { decor: 'banc' }), 'Bourg\u00a0: encore 1 habitant.');
  w.game.decors = { poses: Object.fromEntries(COINS.map((c) => [c, 'massif'])), remise: ['banc'] };
  assert.equal(refusPoser(w.game, { decor: 'banc' }), 'Tous les coins sont pris.');
  assert.equal(refusPoser(w.game, { decor: 'banc', remise: true }), 'Tous les coins sont pris.');
  assert.throws(() => poser(village(), { decor: 'banc' }), /Coin inconnu/);
});

test('le nom d’un coin : son quartier, son rang parmi les coins du quartier et leur nombre', () => {
  assert.deepEqual(coinDe('mairie-2'), { quartier: 'mairie', n: 2, total: 4 });
  assert.deepEqual(coinDe('ecole-1'), { quartier: 'ecole', n: 1, total: 1 });
  for (const c of COINS) assert.ok(coinDe(c).n >= 1 && coinDe(c).n <= coinDe(c).total, c);
});

test('déplacer : gratuit, d’un coin à un coin libre ; refusé depuis un coin vide, vers un coin pris ou inconnu', () => {
  const w = village();
  let { world } = poser(w, { decor: 'banc', coin: COINS[0] });
  ({ world } = poser(world, { decor: 'erable', coin: COINS[1] }));
  const avant = structuredClone(world.game.resources);
  assert.throws(() => step(world, deplacerDecor, { de: COINS[0], vers: COINS[1] }, at(JOUR, 16)), /déjà pris/);
  assert.throws(() => step(world, deplacerDecor, { de: COINS[5], vers: COINS[6] }, at(JOUR, 16)), /Aucun décor/);
  assert.throws(() => step(world, deplacerDecor, { de: COINS[0], vers: 'lac-1' }, at(JOUR, 16)), /Coin inconnu/);
  const { world: w2, r } = step(world, deplacerDecor, { de: COINS[0], vers: COINS[4] }, at(JOUR, 16));
  assert.deepEqual(w2.game.decors.poses, { [COINS[1]]: 'erable', [COINS[4]]: 'banc' });
  assert.deepEqual(w2.game.resources, avant);
  assert.deepEqual(r.events, [{ type: 'decor-deplace', decor: 'banc', de: COINS[0], vers: COINS[4] }]);
  // le même geste rejoué (double toucher, file hors ligne) est refusé : le coin de départ est vide
  assert.throws(() => step(w2, deplacerDecor, { de: COINS[0], vers: COINS[4] }, at(JOUR, 16)), /Aucun décor/);
});

test('ranger puis reposer depuis la remise : gratuit, rien n’est remboursé ; refusé si la remise n’a pas ce décor', () => {
  const w = village();
  let { world } = poser(w, { decor: 'lanterne', coin: COINS[3] });
  const apres = structuredClone(world.game.resources);
  let r;
  ({ world, r } = step(world, rangerDecor, { coin: COINS[3] }, at(JOUR, 16)));
  assert.deepEqual(world.game.decors, { poses: {}, remise: ['lanterne'] });
  assert.deepEqual(world.game.resources, apres);
  assert.deepEqual(r.events, [{ type: 'decor-range', decor: 'lanterne', coin: COINS[3] }]);
  assert.throws(() => step(world, rangerDecor, { coin: COINS[3] }, at(JOUR, 16)), /Aucun décor/);
  assert.equal(refusPoser(world.game, { decor: 'banc', coin: COINS[0], remise: true }), 'La remise n’a pas ce décor.');
  ({ world, r } = step(world, poserDecor, { decor: 'lanterne', coin: COINS[7], remise: true }, at(JOUR, 17)));
  assert.deepEqual(world.game.decors, { poses: { [COINS[7]]: 'lanterne' }, remise: [] });
  assert.deepEqual(world.game.resources, apres);
  assert.deepEqual(r.events, [{ type: 'decor-pose', decor: 'lanterne', coin: COINS[7], cout: null, remise: true }]);
});

test('un décor unique ne s’achète pas ; depuis la remise, il se pose comme les autres', () => {
  const uniques = DECOR_IDS.filter((id) => DECORS[id].unique);
  if (!uniques.length) return; // les décors uniques arrivent avec les escales (lot Y)
  const w = village();
  assert.equal(refusPoser(w.game, { decor: uniques[0], coin: COINS[0] }), 'Ce décor ne s’achète pas.');
  w.game.decors = { poses: {}, remise: [uniques[0]] };
  const { world } = poser(w, { decor: uniques[0], coin: COINS[0], remise: true });
  assert.deepEqual(world.game.decors.poses, { [COINS[0]]: uniques[0] });
});

test('une partie illisible ou d’une autre version : lue prudemment, les entrées inconnues écartées', () => {
  const w = village();
  w.game.decors = { poses: { [COINS[0]]: 'banc', 'lac-9': 'banc', [COINS[1]]: 'statue', [COINS[2]]: 7 }, remise: ['erable', 'statue', null, 'erable'] };
  const e = etatDecors(w.game);
  assert.deepEqual(e.poses, { [COINS[0]]: 'banc' });
  assert.deepEqual(e.remise, ['erable', 'erable']);
  for (const g of [{ decors: 'oui' }, { decors: [] }, { decors: { poses: [], remise: {} } }, {}]) {
    assert.deepEqual(etatDecors(g), { poses: {}, remise: [], libres: COINS });
  }
});

test('aucun effet de jeu : une quête rapporte autant avec ou sans décors', () => {
  const sans = village();
  const { world: avec } = poser(village(), { decor: 'erable', coin: COINS[0] });
  const gain = (w) => {
    const { world } = step(w, completeQuest, { id: 'q1' }, at(JOUR, 18));
    return { e: world.game.resources.energy - w.game.resources.energy, m: world.game.resources.materials - w.game.resources.materials };
  };
  assert.deepEqual(gain(avec), gain(sans));
});

test('les coins de la carte : les mêmes que ceux du cœur, hors des routes ; un décor posé remplace le bosquet de son coin', () => {
  assert.deepEqual(Object.keys(COINS_ILE), COINS);
  for (const [id, { r, c }] of Object.entries(COINS_ILE)) {
    assert.ok(!surRoute(c + 0.5, r + 0.5, 0.6), `${id} sur une route`);
    assert.ok(Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < 12 && c < 12, `${id} hors de l'île`);
  }
  const bosquets = Object.values(COINS_ILE).filter(({ r, c }) => DECOR.some((e) => e.r === r && e.c === c));
  assert.ok(bosquets.length >= 1);
  const { r, c } = bosquets[0];
  assert.equal(decorFor([], [[r, c]]).length, DECOR.length - 1);
  assert.ok(!decorFor([], [[r, c]]).some((e) => e.r === r && e.c === c));
  assert.equal(decorFor([]), DECOR, 'sans décor posé, le décor fixe tel quel');
});
