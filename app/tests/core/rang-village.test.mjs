// Bâtiments du rang Village (bible §5, lot B ; lot J) : tour de guet, scierie, poulailler, cabane à sucre. Les trois
// derniers produisent les jours où tu passes au village, comme l'éolienne : au premier passage du temps du jour, inscrit au
// registre sous prod:{type}:{jour} ; Remballer ne reprend plus rien. Titres fictifs génériques.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATIMENTS, PRODUCTION, EOLIENNE_ENERGIE, openApp, advanceTime, completeQuest, remballerQuest, construire, refusConstruire,
  stockage,
} from '../../core/index.js';
import { regrouperProductions } from '../../world/moments.js';
import { batimentsView } from '../../world/view.js';
import { artFor } from '../../world/models.js';
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
// ce que fait l'interface à l'ouverture : openApp, puis le passage du temps
const visite = (w, day, h = 14) => step(step(w, openApp, {}, at(day, h)).world, advanceTime, {}, at(day, h));

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

test('scierie : +Matériaux à la première visite du jour, une seule fois, au registre sous prod:scierie:{jour}', () => {
  let { world: w, r } = visite(monde(['scierie']), D);
  const p = prod(w.ledger, 'scierie');
  assert.equal(p.length, 1);
  assert.deepEqual({ ...p[0], at: undefined }, { key: `prod:scierie:${D}`, at: undefined, day: D, type: 'prod', batiment: 'scierie', pe: 0, energy: 0, materials: PRODUCTION.scierie.materials });
  assert.equal(w.game.resources.materials, 10 + PRODUCTION.scierie.materials);
  assert.ok(r.events.some((e) => e.type === 'reward' && e.source === 'scierie' && e.materials === PRODUCTION.scierie.materials));
  w = step(w, completeQuest, { id: 'q1' }, at(D, 15)).world;
  w = visite(w, D, 16).world;
  assert.equal(prod(w.ledger, 'scierie').length, 1);
  w = visite(w, '2026-10-07').world;
  assert.deepEqual(prod(w.ledger, 'scierie').map((e) => e.day), [D, '2026-10-07']);
});

test('sans le bâtiment, rien ; l’éolienne et la scierie produisent chacune la leur le même jour', () => {
  assert.equal(visite(monde([]), D).world.ledger.filter((e) => e.type === 'prod').length, 0);
  const { world } = visite(monde(['eolienne', 'scierie', 'poulailler']), D);
  assert.equal(prod(world.ledger, 'eolienne')[0].energy, EOLIENNE_ENERGIE);
  assert.equal(prod(world.ledger, 'scierie')[0].materials, PRODUCTION.scierie.materials);
  assert.equal(prod(world.ledger, 'poulailler')[0].food, PRODUCTION.poulailler.food);
});

test('poulailler : +Nourriture toute l’année, l’hiver aussi', () => {
  for (const day of ['2026-10-06', '2027-01-12', '2027-07-20']) {
    const { world } = visite(monde(['poulailler'], day), day);
    const p = prod(world.ledger, 'poulailler');
    assert.equal(p.length, 1, day);
    assert.deepEqual({ ...p[0], at: undefined }, { key: `prod:poulailler:${day}`, at: undefined, day, type: 'prod', batiment: 'poulailler', pe: 0, energy: 0, materials: 0, food: PRODUCTION.poulailler.food });
    assert.equal(world.game.resources.food, 5 + PRODUCTION.poulailler.food, day);
  }
});

test('cabane à sucre : seulement au temps des sucres, du 1er mars au 30 avril', () => {
  const donne = (day) => prod(visite(monde(['cabane'], day), day).world.ledger, 'cabane').map((e) => e.food);
  assert.deepEqual(donne('2027-02-28'), []);
  assert.deepEqual(donne('2027-03-01'), [PRODUCTION.cabane.food]);
  assert.deepEqual(donne('2027-04-30'), [PRODUCTION.cabane.food]);
  assert.deepEqual(donne('2027-05-01'), []);
  assert.deepEqual(donne(D), []);
  assert.deepEqual(PRODUCTION.cabane.mois, [3, 4]);
});

test('Nourriture plafonnée à la réserve : rien au-delà ; réserve pleine, rien d’inscrit, le passage suivant réessaie', () => {
  const day = '2027-03-10';
  const w0 = monde(['cabane', 'poulailler'], day);
  const max = stockage(w0.game);
  w0.game.resources.food = max - 2.5;
  let w = visite(w0, day).world;
  assert.equal(w.game.resources.food, max);
  const donne = [...prod(w.ledger, 'poulailler'), ...prod(w.ledger, 'cabane')].reduce((s, e) => s + e.food, 0);
  assert.equal(donne, 2.5);
  // réserve pleine dès le départ : rien d'inscrit
  const w1 = monde(['poulailler'], day);
  w1.game.resources.food = stockage(w1.game);
  w = visite(w1, day).world;
  assert.equal(prod(w.ledger, 'poulailler').length, 0);
  // une place se libère : le passage du temps suivant du même jour donne la Nourriture du jour
  w.game.resources.food = stockage(w.game) - 5;
  w = step(w, advanceTime, {}, at(day, 15)).world;
  assert.equal(prod(w.ledger, 'poulailler').length, 1);
});

test('Remballer ne reprend plus la production ; un jour déjà repris avant le lot J reverse sous une nouvelle clé', () => {
  let w = visite(monde(['scierie', 'poulailler']), D).world;
  w = step(w, completeQuest, { id: 'q0' }, at(D, 15)).world;
  const avant = { ...w.game.resources };
  const quete = w.ledger.find((e) => e.key === 'reward:q0:1');
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at(D, 16));
  assert.equal(r.entries.filter((e) => e.type === 'prod').length, 0);
  assert.equal(world.game.resources.materials, Math.round((avant.materials - quete.materials) * 10) / 10);
  assert.equal(world.game.resources.food, avant.food);
  // le jour de l'envoi, une reprise écrite par l'ancienne règle : la visite suivante reverse la production, une fois
  const w2 = monde(['scierie']);
  w2.ledger = [
    { key: `prod:scierie:${D}`, at: at(D, 13), day: D, type: 'prod', batiment: 'scierie', pe: 0, energy: 0, materials: PRODUCTION.scierie.materials },
    { key: `reprise:scierie:${D}:1`, at: at(D, 13), day: D, type: 'prod', batiment: 'scierie', reprise: true, pe: 0, energy: 0, materials: -PRODUCTION.scierie.materials },
  ];
  const again = visite(visite(w2, D).world, D, 15).world;
  assert.deepEqual(prod(again.ledger, 'scierie').map((e) => e.key), [`prod:scierie:${D}`, `reprise:scierie:${D}:1`, `prod:scierie:${D}:2`]);
  assert.equal(new Set(again.ledger.map((e) => e.key)).size, again.ledger.length);
});

test('île : les productions du jour partent en un seul fil ; le reste ne change pas', () => {
  const { r } = visite(monde(['eolienne', 'scierie', 'poulailler']), D);
  const fils = regrouperProductions(r.events).filter((e) => e.type === 'reward');
  assert.deepEqual(fils.map((e) => e.source), ['eolienne']);
  assert.deepEqual([fils[0].energy, fils[0].materials, fils[0].food], [EOLIENNE_ENERGIE, PRODUCTION.scierie.materials, PRODUCTION.poulailler.food]);
  const autres = [{ type: 'reward', source: 'semaine', materials: 5 }, { type: 'permis' }, { type: 'reward', source: 'scierie', materials: 3 }];
  assert.deepEqual(regrouperProductions(autres), autres);
});

test('île : la cabane fume au temps des sucres, pas avant ; l’emplacement vide reste des piquets', () => {
  const etat = (day, types = ['cabane']) => batimentsView(monde(types, day).game, [], new Date(at(day))).find((b) => b.type === 'cabane');
  assert.equal(etat('2027-02-28').etat, 'bati');
  assert.equal(etat('2027-03-01').etat, 'sucres');
  assert.equal(etat('2027-04-30').etat, 'sucres');
  assert.equal(etat('2027-05-01').etat, 'bati');
  assert.equal(etat('2027-03-16', []).etat, 'vide');
  assert.ok(artFor({ model: 'cabane', variant: 'sucres' }).anchors.vapeur);
  assert.equal(artFor({ model: 'cabane', variant: '' }).anchors.vapeur, undefined);
});
