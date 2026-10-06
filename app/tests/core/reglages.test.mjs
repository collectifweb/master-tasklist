// Quête par défaut (Réglages) : gardée dans la partie (game.reglages.queteDefaut), donc la même sur tous les
// appareils. Valeurs validées, repli sur 5 / 2 / 3, une seule opération game.set, rejouable. Aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  queteDefaut, reglerQueteDefaut, fusionQuete, QUETE_DEFAUT, createInitialState, migrateState, completeQuest,
} from '../../core/index.js';
import { fresh, step, task, T0 } from './helpers.mjs';

const VALEURS = { priority: 8, length: 4, difficulty: 6 };

test('queteDefaut : sans réglage, les valeurs du formulaire actuel (5, 2, 3)', () => {
  assert.deepEqual(queteDefaut(createInitialState(T0)), { priority: 5, length: 2, difficulty: 3 });
  assert.deepEqual(queteDefaut({}), { priority: 5, length: 2, difficulty: 3 });
  assert.deepEqual(queteDefaut(null), { priority: 5, length: 2, difficulty: 3 });
  assert.deepEqual(QUETE_DEFAUT, { priority: 5, length: 2, difficulty: 3 });
});

test('queteDefaut : lit les valeurs enregistrées et rejette le reste champ par champ', () => {
  const g = { reglages: { queteDefaut: VALEURS } };
  assert.deepEqual(queteDefaut(g), VALEURS);
  for (const mauvais of [0, 11, 2.5, '7', null, NaN, Infinity, -1, [], {}]) {
    assert.equal(queteDefaut({ reglages: { queteDefaut: { ...VALEURS, length: mauvais } } }).length, 2, String(mauvais));
  }
  assert.deepEqual(queteDefaut({ reglages: { queteDefaut: { priority: 9 } } }), { priority: 9, length: 2, difficulty: 3 });
  for (const abime of [null, 'x', [], 3, { queteDefaut: 'x' }, { queteDefaut: [1, 2, 3] }]) {
    assert.deepEqual(queteDefaut({ reglages: abime }), { priority: 5, length: 2, difficulty: 3 });
  }
});

test('reglerQueteDefaut : une opération game.set, la partie garde ses autres clés, la valeur se relit', () => {
  const w = fresh();
  const { world, r } = step(w, reglerQueteDefaut, VALEURS);
  assert.deepEqual(r.ops.map((o) => o.type), ['game.set']);
  assert.equal(r.ops[0].baseGameRevision, null);
  assert.deepEqual(r.entries, []);
  assert.deepEqual(world.game.reglages.queteDefaut, VALEURS);
  assert.deepEqual(queteDefaut(world.game), VALEURS);
  assert.deepEqual(world.game.resources, w.game.resources);
  assert.equal(w.game.reglages, undefined, 'la partie reçue n’est pas modifiée');
});

test('reglerQueteDefaut : garde les autres réglages, et rejouée à l’identique elle ne renvoie rien', () => {
  const w = fresh();
  w.game.reglages = { autre: 'x', queteDefaut: { priority: 1, length: 1, difficulty: 1 } };
  const a = step(w, reglerQueteDefaut, VALEURS);
  assert.equal(a.world.game.reglages.autre, 'x');
  const b = step(a.world, reglerQueteDefaut, VALEURS);
  assert.deepEqual(b.r.ops, []);
  assert.deepEqual(b.world.game, a.world.game);
});

test('reglerQueteDefaut : refuse une valeur absente, hors de 1 à 10 ou non entière, sans rien changer', () => {
  const w = fresh();
  for (const p of [{}, { ...VALEURS, length: 0 }, { ...VALEURS, priority: 11 }, { ...VALEURS, difficulty: 3.5 },
    { ...VALEURS, priority: '8' }, { priority: 5, length: 2 }]) {
    assert.throws(() => reglerQueteDefaut(w.tasks, w.game, w.ledger, { gameRevision: null, ...p }, T0), /trois valeurs entières de 1 à 10/);
  }
  assert.throws(() => reglerQueteDefaut(w.tasks, w.game, w.ledger, undefined, T0));
});

test('reglerQueteDefaut : sans révision de la partie, l’enregistrement est refusé comme les autres actions', () => {
  const w = fresh();
  assert.throws(() => reglerQueteDefaut(w.tasks, w.game, w.ledger, VALEURS, T0), /gameRevision/);
});

test('une partie qui porte la quête par défaut la garde après migration et après une quête payée', () => {
  const w = fresh([task()]);
  const a = step(w, reglerQueteDefaut, VALEURS);
  const m = migrateState(JSON.parse(JSON.stringify(a.world.game)), T0, {});
  assert.deepEqual(queteDefaut(m), VALEURS);
  const b = step(a.world, completeQuest, { id: 't1' });
  assert.deepEqual(queteDefaut(b.world.game), VALEURS);
});

test('la quête par défaut ne change ni le score ni l’argent : aucune entrée au registre, ressources intactes', () => {
  const w = fresh();
  const { world } = step(w, reglerQueteDefaut, VALEURS);
  assert.deepEqual(world.ledger, []);
  assert.deepEqual(world.game.resources, w.game.resources);
  assert.deepEqual(world.game.permis, w.game.permis);
});

test('fusionQuete : seules les valeurs changées dans la feuille partent, sur la partie d’à présent', () => {
  const ouverte = { priority: 5, length: 2, difficulty: 3 }; // feuille ouverte avant le chargement : 5 / 2 / 3
  const actuel = { priority: 8, length: 2, difficulty: 3 }; // la partie relue depuis garde 8 en priorité
  // seule la durée change : la priorité 8 n'est pas remise à 5
  assert.deepEqual(fusionQuete(actuel, ouverte, { priority: 5, length: 3, difficulty: 3 }), { priority: 8, length: 3, difficulty: 3 });
  // rien de touché : la partie d'à présent, telle quelle
  assert.deepEqual(fusionQuete(actuel, ouverte, ouverte), actuel);
  // une valeur touchée l'emporte, même si un autre appareil l'a changée entre-temps
  assert.deepEqual(fusionQuete({ priority: 9, length: 7, difficulty: 3 }, ouverte, { priority: 5, length: 4, difficulty: 3 }), { priority: 9, length: 4, difficulty: 3 });
  assert.deepEqual(fusionQuete(actuel, ouverte, { priority: 6, length: 2, difficulty: 3 }), { priority: 6, length: 2, difficulty: 3 });
});
