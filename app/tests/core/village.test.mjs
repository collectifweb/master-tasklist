// Les deux progressions du village (bible §4) : rang selon les Habitants, niveau de chaque quartier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rangDuVillage, niveauQuartier, RANGS, NIVEAUX_QUARTIER, QUARTIER_PALIER, VILLE_PALIER } from '../../core/index.js';

const nom = (n) => rangDuVillage(n).name;

test('rang : Campement 0-2, Hameau 3-5, Village 6-10, Bourg 11-20, Ville 21-35', () => {
  assert.deepEqual([0, 2, 3, 5, 6, 10, 11, 20, 21, 35].map(nom),
    ['Campement', 'Campement', 'Hameau', 'Hameau', 'Village', 'Village', 'Bourg', 'Bourg', 'Ville', 'Ville']);
  assert.deepEqual(RANGS.map((r) => r.min), [0, 3, 6, 11, 21]);
  assert.equal(VILLE_PALIER, 15);
});

test('rang : au-delà de la Ville, un palier « Ville +n » tous les 15 habitants, sans fin', () => {
  assert.deepEqual([36, 50, 51, 65, 66].map(nom), ['Ville +1', 'Ville +1', 'Ville +2', 'Ville +2', 'Ville +3']);
  const r = rangDuVillage(51);
  assert.deepEqual({ ...r, suivant: undefined }, { palier: 6, id: 'ville', name: 'Ville +2', min: 51, plus: 2, suivant: undefined });
  assert.equal(rangDuVillage(1e9).id, 'ville'); // un très grand nombre se calcule sans boucle
});

test('rang : le prochain rang avec ce qui manque (« Hameau : encore 2 habitants »)', () => {
  assert.deepEqual(rangDuVillage(1).suivant, { palier: 1, id: 'hameau', name: 'Hameau', min: 3, plus: 0, encore: 2 });
  assert.deepEqual([0, 5, 20, 35, 36].map((n) => [rangDuVillage(n).suivant.name, rangDuVillage(n).suivant.encore]),
    [['Hameau', 3], ['Village', 1], ['Ville', 1], ['Ville +1', 1], ['Ville +2', 15]]);
  assert.equal(rangDuVillage(0).palier, 0);
  assert.equal(rangDuVillage(21).palier, 4);
});

test('rang : une valeur illisible ou négative compte pour 0 habitant', () => {
  for (const v of [undefined, null, -3, 'abc', NaN]) assert.equal(nom(v), 'Campement', String(v));
  assert.equal(nom(2.9), 'Campement');
});

test('niveau de quartier : seuils 5, 15, 30, 60, 100 tâches, puis un niveau tous les 50, sans fin', () => {
  assert.deepEqual(NIVEAUX_QUARTIER, [5, 15, 30, 60, 100]);
  assert.equal(QUARTIER_PALIER, 50);
  assert.deepEqual([0, 4, 5, 14, 15, 29, 30, 59, 60, 99, 100, 149, 150, 250, 1000].map((n) => niveauQuartier(n).niveau),
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 8, 23]);
});

test('niveau de quartier : « encore N tâches » pour le niveau suivant, y compris après 100', () => {
  assert.deepEqual(niveauQuartier(23), { niveau: 2, taches: 23, suivant: { niveau: 3, seuil: 30, encore: 7 } });
  assert.deepEqual(niveauQuartier(0).suivant, { niveau: 1, seuil: 5, encore: 5 });
  assert.deepEqual(niveauQuartier(100).suivant, { niveau: 6, seuil: 150, encore: 50 });
  assert.deepEqual(niveauQuartier(170).suivant, { niveau: 7, seuil: 200, encore: 30 });
  assert.equal(niveauQuartier(-1).niveau, 0);
  assert.equal(niveauQuartier('x').taches, 0);
});
