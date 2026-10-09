// Bâtiments du rang Village (bible §5, lot V) : tour de guet, scierie, poulailler, cabane à sucre. Les trois derniers
// produisent les jours travaillés, comme l'éolienne : à la première quête payée du jour, inscrit au registre sous
// prod:{type}:{jour}, repris par Remballer si le jour reste sans quête payée. Titres fictifs génériques.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATIMENTS, PRODUCTION, EOLIENNE_ENERGIE, completeQuest, remballerQuest, construire, refusConstruire, stockage,
} from '../../core/index.js';
import { regrouperProductions } from '../../world/moments.js';
import { fresh, step, task, avantLeChalet } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const D = '2026-10-06';
const monde = (types = [], day = D, over = {}) => {
  const w = fresh(Array.from({ length: 4 }, (_, k) => task({ id: `q${k}`, created: '2026-10-01' })), at(day));
  avantLeChalet(w.game);
  w.game.habitants = 6;
  w.game.resources = { energy: 10, materials: 10, food: 5 };
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, ...types.map((type) => ({ id: `${type}-1`, type }))];
  Object.assign(w.game, over);
  return w;
};
const prod = (ledger, type) => ledger.filter((e) => e.type === 'prod' && e.batiment === type);
const VILLAGE = ['tour', 'scierie', 'poulailler', 'cabane'];

test('catalogue : quatre bâtiments au rang Village, un exemplaire chacun ; la scierie demande l’atelier', () => {
  for (const id of VILLAGE) {
    assert.equal(BATIMENTS[id].rang, 'village', id);
    assert.equal(BATIMENTS[id].max, 1, id);
  }
  assert.equal(BATIMENTS.scierie.prerequis, 'atelier');
  assert.deepEqual(Object.keys(PRODUCTION).sort(), ['cabane', 'poulailler', 'scierie']);
});

test('refus : avant le 6e habitant, « Village : encore N habitants » ; la scierie sans atelier attend l’atelier', () => {
  const w = monde();
  w.game.resources = { energy: 500, materials: 500, food: 5 };
  w.game.habitants = 4;
  assert.equal(refusConstruire(w.game, 'tour'), 'Village : encore 2 habitants.');
  w.game.habitants = 5;
  assert.equal(refusConstruire(w.game, 'poulailler'), 'Village : encore 1 habitant.');
  w.game.habitants = 6;
  for (const id of VILLAGE) assert.equal(refusConstruire(w.game, id), null, id);
  w.game.batiments = [];
  assert.equal(refusConstruire(w.game, 'scierie'), 'Il faut d’abord un atelier.');
  const g = step(monde([], D, { resources: { energy: 500, materials: 500, food: 5 } }), construire, { type: 'cabane' }, at(D)).world.game;
  assert.ok(g.batiments.some((b) => b.id === 'cabane-1' && b.type === 'cabane'));
});

test('scierie : +Matériaux à la première quête payée du jour, une seule fois, au registre sous prod:scierie:{jour}', () => {
  let { world: w, r } = step(monde(['scierie']), completeQuest, { id: 'q0' }, at(D));
  const p = prod(w.ledger, 'scierie');
  assert.equal(p.length, 1);
  assert.deepEqual({ ...p[0], at: undefined }, { key: `prod:scierie:${D}`, at: undefined, day: D, type: 'prod', batiment: 'scierie', pe: 0, energy: 0, materials: PRODUCTION.scierie.materials });
  const quete = r.entries.find((e) => e.type === 'reward');
  assert.equal(w.game.resources.materials, Math.round((10 + quete.materials + PRODUCTION.scierie.materials) * 10) / 10);
  assert.ok(r.events.some((e) => e.type === 'reward' && e.source === 'scierie' && e.materials === PRODUCTION.scierie.materials));
  w = step(w, completeQuest, { id: 'q1' }, at(D, 15)).world;
  assert.equal(prod(w.ledger, 'scierie').length, 1);
  w = step(w, completeQuest, { id: 'q2' }, at('2026-10-07')).world;
  assert.deepEqual(prod(w.ledger, 'scierie').map((e) => e.day), [D, '2026-10-07']);
});

test('sans le bâtiment, rien ; l’éolienne et la scierie produisent chacune la leur le même jour', () => {
  assert.equal(step(monde([]), completeQuest, { id: 'q0' }, at(D)).world.ledger.filter((e) => e.type === 'prod').length, 0);
  const { world } = step(monde(['eolienne', 'scierie', 'poulailler']), completeQuest, { id: 'q0' }, at(D));
  assert.equal(prod(world.ledger, 'eolienne')[0].energy, EOLIENNE_ENERGIE);
  assert.equal(prod(world.ledger, 'scierie')[0].materials, PRODUCTION.scierie.materials);
  assert.equal(prod(world.ledger, 'poulailler')[0].food, PRODUCTION.poulailler.food);
});

test('poulailler : +Nourriture toute l’année, l’hiver aussi', () => {
  for (const day of ['2026-10-06', '2027-01-12', '2027-07-20']) {
    const { world } = step(monde(['poulailler'], day), completeQuest, { id: 'q0' }, at(day));
    const p = prod(world.ledger, 'poulailler');
    assert.equal(p.length, 1, day);
    assert.deepEqual({ ...p[0], at: undefined }, { key: `prod:poulailler:${day}`, at: undefined, day, type: 'prod', batiment: 'poulailler', pe: 0, energy: 0, materials: 0, food: PRODUCTION.poulailler.food });
    assert.equal(world.game.resources.food, 5 + PRODUCTION.poulailler.food, day);
  }
});

test('cabane à sucre : seulement au temps des sucres, du 1er mars au 30 avril', () => {
  const donne = (day) => prod(step(monde(['cabane'], day), completeQuest, { id: 'q0' }, at(day)).world.ledger, 'cabane').map((e) => e.food);
  assert.deepEqual(donne('2027-02-28'), []);
  assert.deepEqual(donne('2027-03-01'), [PRODUCTION.cabane.food]);
  assert.deepEqual(donne('2027-04-30'), [PRODUCTION.cabane.food]);
  assert.deepEqual(donne('2027-05-01'), []);
  assert.deepEqual(donne(D), []);
  assert.deepEqual(PRODUCTION.cabane.mois, [3, 4]);
});

test('Nourriture plafonnée à la réserve : rien au-delà ; réserve pleine, rien d’inscrit, la quête suivante réessaie', () => {
  const day = '2027-03-10';
  const w0 = monde(['cabane', 'poulailler'], day);
  const max = stockage(w0.game);
  w0.game.resources.food = max - 2.5;
  let w = step(w0, completeQuest, { id: 'q0' }, at(day)).world;
  assert.equal(w.game.resources.food, max);
  const donne = [...prod(w.ledger, 'poulailler'), ...prod(w.ledger, 'cabane')].reduce((s, e) => s + e.food, 0);
  assert.equal(donne, 2.5);
  // réserve pleine dès le départ : rien d'inscrit
  const w1 = monde(['poulailler'], day);
  w1.game.resources.food = stockage(w1.game);
  w = step(w1, completeQuest, { id: 'q0' }, at(day)).world;
  assert.equal(prod(w.ledger, 'poulailler').length, 0);
  // une place se libère : la quête payée suivante du même jour donne la Nourriture du jour
  w.game.resources.food = stockage(w.game) - 5;
  w = step(w, completeQuest, { id: 'q1' }, at(day, 15)).world;
  assert.equal(prod(w.ledger, 'poulailler').length, 1);
});

test('Remballer la seule quête payée du jour reprend la production, par une écriture inverse ; le registre garde l’original', () => {
  let w = step(monde(['scierie', 'poulailler']), completeQuest, { id: 'q0' }, at(D)).world;
  const avant = { ...w.game.resources };
  const quete = w.ledger.find((e) => e.key === 'reward:q0:1');
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at(D, 15));
  const reprises = r.entries.filter((e) => e.type === 'prod').map((e) => ({ ...e, at: undefined }));
  assert.deepEqual(reprises, [
    { key: `reprise:scierie:${D}:1`, at: undefined, day: D, type: 'prod', batiment: 'scierie', reprise: true, pe: 0, energy: 0, materials: -PRODUCTION.scierie.materials },
    { key: `reprise:poulailler:${D}:1`, at: undefined, day: D, type: 'prod', batiment: 'poulailler', reprise: true, pe: 0, energy: 0, materials: 0, food: -PRODUCTION.poulailler.food },
  ]);
  assert.equal(world.game.resources.materials, Math.round((avant.materials - quete.materials - PRODUCTION.scierie.materials) * 10) / 10);
  assert.equal(world.game.resources.food, avant.food - PRODUCTION.poulailler.food);
  assert.ok(world.ledger.some((e) => e.key === `prod:scierie:${D}`));
  // une nouvelle quête payée ce jour-là reverse la production, sous une nouvelle clé
  const again = step(world, completeQuest, { id: 'q1' }, at(D, 16)).world;
  assert.deepEqual(prod(again.ledger, 'scierie').map((e) => e.key), [`prod:scierie:${D}`, `reprise:scierie:${D}:1`, `prod:scierie:${D}:2`]);
  assert.equal(new Set(again.ledger.map((e) => e.key)).size, again.ledger.length);
});

test('Remballer quand une autre quête reste payée ce jour-là : la production reste', () => {
  let w = step(monde(['scierie']), completeQuest, { id: 'q0' }, at(D)).world;
  w = step(w, completeQuest, { id: 'q1' }, at(D, 15)).world;
  const { r } = step(w, remballerQuest, { id: 'q1' }, at(D, 16));
  assert.equal(r.entries.filter((e) => e.type === 'prod').length, 0);
});

test('île : les productions du jour partent en un seul fil, après celui de la quête ; le reste ne change pas', () => {
  const { r } = step(monde(['eolienne', 'scierie', 'poulailler']), completeQuest, { id: 'q0' }, at(D));
  const fils = regrouperProductions(r.events).filter((e) => e.type === 'reward');
  assert.deepEqual(fils.map((e) => e.source), ['quete', 'eolienne']);
  assert.deepEqual([fils[1].energy, fils[1].materials, fils[1].food], [EOLIENNE_ENERGIE, PRODUCTION.scierie.materials, PRODUCTION.poulailler.food]);
  const autres = [{ type: 'reward', source: 'semaine', materials: 5 }, { type: 'permis' }, { type: 'reward', source: 'scierie', materials: 3 }];
  assert.deepEqual(regrouperProductions(autres), autres);
});
