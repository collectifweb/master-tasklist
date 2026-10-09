// La bande de terrain du Hameau (bible §4, lot F) : la forêt du fond recule quand le village atteint le Hameau, et
// l'île gagne une bande de terre, vide pour l'instant. Rien n'est écrit dans la partie : la bande se lit dans le
// nombre d'habitants, qui ne baisse jamais. Logique pure du cœur, de la vue et de la carte de l'île.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BANDES, bandesGagnees, rangDuVillage, createInitialState } from '../../core/index.js';
import { deriveView } from '../../world/view.js';
import {
  N, CELLS, DECOR, EMPLACEMENTS, LANDMARKS, ROADS, BANDES_ILE, bandeCells, cellsFor, decorFor, sectorAt,
} from '../../world/layout.js';
import { P } from '../../world/iso.js';

const NOW = new Date('2026-10-20T15:00:00Z');
const ARBRES = new Set(['epinette', 'arbre', 'erable']);
const key = ([r, c]) => `${r},${c}`;

test('bandes : une seule pour l’instant, celle du Hameau', () => {
  assert.deepEqual(BANDES, [{ id: 'hameau', rang: 'hameau' }]);
});

test('bandes : aucune au Campement, celle du Hameau dès le 3e habitant, et rien de plus après', () => {
  for (const n of [0, 1, 2]) assert.deepEqual(bandesGagnees(n), [], `${n} habitants`);
  for (const n of [3, 5, 6, 11, 21, 40, 1e9]) assert.deepEqual(bandesGagnees(n), ['hameau'], `${n} habitants`);
  assert.equal(rangDuVillage(3).id, 'hameau');
});

test('bandes : un nombre d’habitants illisible ou négatif ne gagne rien', () => {
  for (const v of [undefined, null, -3, 'abc', NaN, 2.9]) assert.deepEqual(bandesGagnees(v), [], String(v));
});

test('vue de l’île : les bandes gagnées, lues dans les habitants, sans rien écrire dans la partie', () => {
  const g = createInitialState(NOW);
  assert.deepEqual(deriveView(g, [], { now: NOW }).bandes, []);
  const h = { ...g, habitants: 3 };
  const avant = JSON.stringify(h);
  assert.deepEqual(deriveView(h, [], { now: NOW }).bandes, ['hameau']);
  assert.equal(JSON.stringify(h), avant);
  assert.deepEqual(deriveView({}, [], { now: NOW }).bandes, [], 'partie vide');
});

test('carte : chaque bande du cœur a sa place sur l’île, et aucune autre', () => {
  assert.deepEqual(Object.keys(BANDES_ILE).sort(), BANDES.map((b) => b.id).sort());
});

test('carte : la bande du Hameau est au fond, hors de l’île de départ, au Garage et à la Mairie', () => {
  const cells = bandeCells(['hameau']);
  assert.equal(cells.length, 16); // deux rangées sur huit colonnes
  const depart = new Set(Object.values(CELLS).flat().map(key));
  assert.equal(depart.size, N * N);
  for (const cell of cells) assert.ok(!depart.has(key(cell)) && cell[0] < 0, `case ${key(cell)} déjà sur l’île`);
  // chaque case touche l'île ou une autre case de la bande : un seul tenant
  const tout = new Set([...depart, ...cells.map(key)]);
  for (const [r, c] of cells) assert.ok(tout.has(key([r + 1, c])), `case ${r},${c} détachée`);
  assert.deepEqual([...new Set(cells.map(([r, c]) => sectorAt(r, c)))].sort(), ['garage', 'mairie']);
  assert.deepEqual(bandeCells([]), []);
  assert.deepEqual(bandeCells(['inconnue']), []);
});

test('carte : avec la bande, l’île ne sort pas de son emprise actuelle à l’écran (sa taille ne change pas)', () => {
  const xs = [P(0, 0), P(N, 0), P(N, N), P(0, N)].map((p) => p[0]);
  const ys = [P(0, 0), P(N, 0), P(N, N), P(0, N)].map((p) => p[1]);
  for (const [r, c] of bandeCells(['hameau'])) {
    for (const [x, y] of [P(c, r), P(c + 1, r), P(c + 1, r + 1), P(c, r + 1)]) {
      assert.ok(x >= Math.min(...xs) && x <= Math.max(...xs) && y >= Math.min(...ys) && y <= Math.max(...ys), `case ${r},${c} : ${x}, ${y}`);
    }
  }
});

test('carte : les cases par secteur gardent l’île de départ, et y ajoutent la bande', () => {
  assert.deepEqual(cellsFor([]), CELLS);
  const avec = cellsFor(['hameau']);
  for (const [id, cells] of Object.entries(CELLS)) {
    const extra = avec[id].filter((x) => !cells.some((y) => key(x) === key(y)));
    assert.deepEqual(extra.map(key).sort(), bandeCells(['hameau']).filter(([r, c]) => sectorAt(r, c) === id).map(key).sort(), id);
  }
});

test('décor : sans bande, exactement celui d’aujourd’hui', () => {
  assert.deepEqual(decorFor([]), DECOR);
});

test('décor : avec la bande, la lisière a reculé au bord neuf, et rien ne sort de l’île', () => {
  const b = BANDES_ILE.hameau;
  const d = decorFor(['hameau']);
  const dans = (e, r0, r1) => e.r >= r0 && e.r < r1 && e.c >= b.c && e.c < b.c + b.w;
  // plus un arbre sur l'ancienne lisière, au droit de la bande
  assert.deepEqual(d.filter((e) => ARBRES.has(e.model) && dans(e, 0, 1)).map((e) => e.id), []);
  // la nouvelle lisière : des arbres sur la rangée du fond de la bande, sur toute sa longueur
  const lisiere = d.filter((e) => ARBRES.has(e.model) && dans(e, b.r, b.r + 1));
  assert.ok(lisiere.length >= b.w - 2, `${lisiere.length} arbres au bord neuf`);
  assert.ok(Math.min(...lisiere.map((e) => e.c)) <= b.c + 1 && Math.max(...lisiere.map((e) => e.c)) >= b.c + b.w - 2, 'toute la longueur');
  // des souches sur la terre gagnée
  assert.ok(d.some((e) => e.model === 'souche' && dans(e, b.r + 1, 1)), 'souches');
  // le reste du décor ne bouge pas
  const garde = DECOR.filter((e) => !(ARBRES.has(e.model) && dans(e, 0, 1)));
  for (const e of garde) assert.ok(d.some((x) => x.id === e.id && x.r === e.r && x.c === e.c), e.id);
  // tout est sur une case de l'île, identifiants uniques
  const ile = new Set([...Object.values(CELLS).flat(), ...bandeCells(['hameau'])].map(key));
  for (const e of d) assert.ok(ile.has(key([Math.floor(e.r), Math.floor(e.c)])), `${e.id} hors de l’île`);
  assert.equal(new Set(d.map((e) => e.id)).size, d.length);
  // le secteur d'un objet de la bande suit la règle des secteurs
  for (const e of d.filter((x) => x.r < 0)) assert.equal(e.sector, sectorAt(Math.floor(e.r), Math.floor(e.c)), e.id);
});

test('décor : rien de neuf sur un emplacement, un repère ou une route', () => {
  const avant = new Set(DECOR.map((e) => e.id));
  const neufs = decorFor(['hameau']).filter((e) => !avant.has(e.id));
  assert.ok(neufs.length > 0);
  const occupe = [...LANDMARKS, ...Object.values(EMPLACEMENTS).flat()];
  for (const e of neufs) {
    const u = e.c + 0.5, v = e.r + 0.5;
    for (const o of occupe) assert.ok(!(v >= o.r - 0.2 && v < o.r + (o.h || 1) + 0.1 && u >= o.c - 0.2 && u < o.c + (o.w || 1) + 0.1), `${e.id} sur ${o.id || o.r + ',' + o.c}`);
    assert.ok(Math.abs(u - 6) >= 0.6, `${e.id} sur la route du Garage`);
  }
  assert.ok(ROADS.length >= 5);
});
