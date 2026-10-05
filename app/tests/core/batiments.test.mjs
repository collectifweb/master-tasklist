// Bâtiments du campement et du hameau (bible §5, lot 4) : coûts, rang requis, prérequis, maximum, emplacements de
// l'île, et chaque refus avec sa raison écrite. Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATIMENTS, BATIMENT_IDS, DEPART, construire, refusConstruire, compte, batimentsDuVillage, createInitialState,
} from '../../core/index.js';
import { EMPLACEMENTS } from '../../world/layout.js';
import { fresh, step } from './helpers.mjs';

const NOW = '2026-10-06T14:00:00Z';
const riche = (over = {}) => {
  const w = fresh([], NOW);
  w.game.resources = { energy: 500, materials: 500, food: 5 };
  Object.assign(w.game, over);
  return w;
};
const bati = (w, type) => step(w, construire, { type }, NOW).world.game;

test('catalogue : campement = chalet, parcelle, atelier, petite serre ; hameau = éolienne, grenier, quai', () => {
  assert.deepEqual(BATIMENT_IDS, ['chalet', 'parcelle', 'atelier', 'serre', 'eolienne', 'grenier', 'quai']);
  const rang = Object.fromEntries(BATIMENT_IDS.map((id) => [id, BATIMENTS[id].rang]));
  assert.deepEqual(rang, { chalet: 'campement', parcelle: 'campement', atelier: 'campement', serre: 'campement', eolienne: 'hameau', grenier: 'hameau', quai: 'hameau' });
  for (const id of BATIMENT_IDS) {
    const b = BATIMENTS[id];
    assert.ok(Number.isInteger(b.cout.energy) && b.cout.energy >= 0, id);
    assert.ok(Number.isInteger(b.cout.materials) && b.cout.materials > 0, id);
    assert.ok(Number.isInteger(b.max) && b.max >= 1, id);
  }
  assert.equal(BATIMENTS.chalet.loge, 2);
  assert.equal(BATIMENTS.serre.prerequis, 'atelier'); // décision d'Alex du 5 octobre : la serre dès le campement
});

test('catalogue = emplacements de l’île : un emplacement par bâtiment possible, aucun en trop', () => {
  assert.deepEqual(Object.keys(EMPLACEMENTS).sort(), [...BATIMENT_IDS].sort());
  for (const id of BATIMENT_IDS) assert.equal(EMPLACEMENTS[id].length, BATIMENTS[id].max, id);
});

test('départ : une parcelle du vieux potager est déjà là, aucun chalet n’est debout (trois chalets vides à rebâtir)', () => {
  const g = createInitialState(NOW);
  assert.deepEqual(DEPART, { parcelle: 1 });
  assert.equal(compte(g, 'parcelle'), 1);
  assert.equal(compte(g, 'chalet'), 0);
  assert.deepEqual(batimentsDuVillage(g).map((b) => b.id), ['parcelle-1']);
});

test('construire : paie le coût, pose le bâtiment au premier emplacement libre, événement « construction »', () => {
  const w = fresh([], NOW);
  const { world, r } = step(w, construire, { type: 'chalet' }, NOW);
  const c = BATIMENTS.chalet.cout;
  assert.deepEqual(world.game.resources, { energy: 10 - c.energy, materials: 20 - c.materials, food: 5 });
  assert.deepEqual(world.game.batiments, [{ id: 'chalet-1', type: 'chalet' }]);
  assert.deepEqual(r.events, [{ type: 'construction', id: 'chalet-1', batiment: 'chalet', cout: c }]);
  // rien au registre : une dépense ne fait que retirer ce qui a déjà été gagné
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.ops.map((o) => o.type), ['game.set']);
  // la parcelle de départ occupe le premier emplacement : la suivante est la n° 2
  assert.deepEqual(bati(riche(), 'parcelle').batiments, [{ id: 'parcelle-2', type: 'parcelle' }]);
});

test('refus : il manque des ressources, avec le nombre exact (« Il manque 4 Matériaux. »)', () => {
  const w = fresh([], NOW);
  w.game.resources = { energy: 10, materials: BATIMENTS.chalet.cout.materials - 4, food: 5 };
  assert.equal(refusConstruire(w.game, 'chalet'), 'Il manque 4 Matériaux.');
  assert.throws(() => step(w, construire, { type: 'chalet' }, NOW), { message: 'Il manque 4 Matériaux.' });
  w.game.resources = { energy: 0, materials: 0.5, food: 5 };
  const a = BATIMENTS.atelier.cout;
  assert.equal(refusConstruire(w.game, 'atelier'), `Il manque ${String(a.materials - 0.5).replace('.', ',')} Matériaux et ${a.energy} Énergie.`);
  w.game.resources = { energy: 0, materials: BATIMENTS.chalet.cout.materials - 1, food: 5 };
  assert.equal(refusConstruire(w.game, 'chalet'), 'Il manque 1 Matériau.');
});

test('refus : rang requis (« Hameau : encore 2 habitants. »), puis « encore 1 habitant »', () => {
  const w = riche({ habitants: 1 });
  for (const id of ['eolienne', 'grenier', 'quai']) assert.equal(refusConstruire(w.game, id), 'Hameau : encore 2 habitants.', id);
  w.game.habitants = 2;
  assert.equal(refusConstruire(w.game, 'grenier'), 'Hameau : encore 1 habitant.');
  w.game.habitants = 3;
  assert.equal(refusConstruire(w.game, 'grenier'), null);
  assert.equal(refusConstruire(w.game, 'quai'), null);
});

test('refus : prérequis (« Il faut d’abord un atelier. »)', () => {
  const w = riche({ habitants: 3 });
  assert.equal(refusConstruire(w.game, 'serre'), 'Il faut d’abord un atelier.');
  assert.equal(refusConstruire(w.game, 'eolienne'), 'Il faut d’abord un atelier.');
  const after = bati(w, 'atelier');
  assert.equal(refusConstruire(after, 'serre'), null);
  assert.equal(refusConstruire(after, 'eolienne'), null);
});

test('refus : maximum atteint, avec sa raison', () => {
  let w = riche({ habitants: 3 });
  for (let k = 0; k < BATIMENTS.chalet.max; k++) w = { ...w, game: bati(w, 'chalet') };
  assert.deepEqual(w.game.batiments.map((b) => b.id), ['chalet-1', 'chalet-2', 'chalet-3'].slice(0, BATIMENTS.chalet.max));
  assert.equal(refusConstruire(w.game, 'chalet'), 'Plus d’emplacement libre pour un chalet.');
  for (let k = compte(w.game, 'parcelle'); k < BATIMENTS.parcelle.max; k++) w = { ...w, game: bati(w, 'parcelle') };
  assert.equal(refusConstruire(w.game, 'parcelle'), 'Plus d’emplacement libre pour une parcelle.');
  w = { ...w, game: bati(w, 'atelier') };
  assert.equal(refusConstruire(w.game, 'atelier'), 'Il y a déjà un atelier au village.');
  w = { ...w, game: bati(w, 'serre') };
  assert.equal(refusConstruire(w.game, 'serre'), 'Il y a déjà une petite serre au village.');
});

test('refus : le maximum passe avant le rang, le rang avant le prérequis, le prérequis avant le coût', () => {
  const pauvre = fresh([], NOW).game;
  pauvre.resources = { energy: 0, materials: 0, food: 0 };
  assert.equal(refusConstruire(pauvre, 'eolienne'), 'Hameau : encore 3 habitants.');
  assert.equal(refusConstruire(pauvre, 'serre'), 'Il faut d’abord un atelier.');
  assert.match(refusConstruire(pauvre, 'atelier'), /^Il manque /);
});

test('refus : bâtiment inconnu, même un nom hérité (constructor)', () => {
  const w = riche();
  for (const type of ['tour', 'constructor', '__proto__', undefined]) {
    assert.equal(refusConstruire(w.game, type), 'Bâtiment inconnu.', String(type));
    assert.throws(() => step(w, construire, { type }, NOW), { message: 'Bâtiment inconnu.' });
  }
});

test('un refus ne modifie rien et ne produit aucune opération', () => {
  const w = fresh([], NOW);
  w.game.resources = { energy: 0, materials: 0, food: 5 };
  const before = JSON.stringify(w.game);
  assert.throws(() => construire(w.tasks, w.game, w.ledger, { type: 'chalet', gameRevision: null }, NOW));
  assert.equal(JSON.stringify(w.game), before);
});

test('état abîmé : un bâtiment inconnu ou en double ne compte qu’une fois, jamais de plantage', () => {
  const w = riche();
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-1', type: 'chalet' }, { id: 'tour-1', type: 'tour' }, null, 'x'];
  assert.equal(compte(w.game, 'chalet'), 1);
  assert.deepEqual(bati(w, 'chalet').batiments.filter((b) => b && b.type === 'chalet').map((b) => b.id), ['chalet-1', 'chalet-1', 'chalet-2']);
  w.game.batiments = null;
  assert.equal(compte(w.game, 'chalet'), 0);
});

test('construire à un emplacement choisi (le chalet touché sur la carte), refusé s’il est pris ou inconnu', () => {
  let w = riche();
  w = { ...w, game: step(w, construire, { type: 'chalet', id: 'chalet-3' }, NOW).world.game };
  assert.deepEqual(w.game.batiments, [{ id: 'chalet-3', type: 'chalet' }]);
  // sans emplacement : le premier libre
  assert.deepEqual(bati(w, 'chalet').batiments.map((b) => b.id), ['chalet-3', 'chalet-1']);
  assert.throws(() => step(w, construire, { type: 'chalet', id: 'chalet-3' }, NOW), { message: 'Cet emplacement est déjà bâti.' });
  assert.throws(() => step(riche(), construire, { type: 'parcelle', id: 'parcelle-1' }, NOW), { message: 'Cet emplacement est déjà bâti.' });
  for (const id of ['chalet-4', 'chalet-0', 'parcelle-2', 'chalet-1x', 7]) {
    assert.throws(() => step(riche(), construire, { type: 'chalet', id }, NOW), { message: 'Emplacement inconnu.' }, String(id));
  }
});
