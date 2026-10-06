// Ressources en nombres entiers à l'écran : l'état garde ses dixièmes, seul l'affichage arrondit.
// Possédé : vers le bas. Manque et prix : vers le haut. Gains, pertes, récoltes : au plus proche. Aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Les modules d'interface lisent `document.baseURI` à l'import et leurs textes dans content/ : on leur donne les deux.
globalThis.document = { baseURI: 'file:///app/' };
const { content } = await import('../../js/content.js');
content.ui = JSON.parse(readFileSync(new URL('../../content/fr-CA/interface.json', import.meta.url), 'utf8'));
const { numPossede, numManque, numGain, entierGain } = await import('../../js/ui/format.js');
const { shortNum } = await import('../../js/ui/hud.js');
const { summarize, gainList, aGagne } = await import('../../js/ui/announce.js');

test('possédé : 59,6 s’affiche 59 (la barre ne promet pas un prix de 60), 60 reste 60', () => {
  assert.equal(numPossede(59.6), '59');
  assert.equal(numPossede(60), '60');
  assert.equal(numPossede(2.9999999999), '3'); // bruit des flottants : on part du dixième le plus proche
  assert.equal(shortNum(59.6), '59');
});

test('puce : la forme courte « 1,2 k » se calcule sur la valeur arrondie vers le bas', () => {
  assert.equal(shortNum(999.6), '999');
  assert.equal(shortNum(999.96), '1 k');
  assert.equal(shortNum(1238.5), '1,2 k');
  assert.equal(shortNum(12349.6), '12 k');
});

test('manque et prix : 0,4 s’affiche 1, 19,5 s’affiche 20', () => {
  assert.equal(numManque(0.4), '1');
  assert.equal(numManque(19.5), '20');
  assert.equal(numManque(4), '4');
});

test('gain : 2,5 s’affiche 3, 0,3 s’arrondit à 0', () => {
  assert.equal(numGain(2.5), '3');
  assert.equal(numGain(2.4), '2');
  assert.equal(entierGain(0.3), 0);
  assert.equal(entierGain(0.5), 1);
});

test('liste des gains : 2,5 Énergie → « +3 Énergie » ; 0,3 Matériau n’est pas écrit', () => {
  const s = summarize([{ type: 'reward', energy: 2.5, materials: 0.3, food: 0 }]);
  assert.deepEqual(gainList(s), ['+3 Énergie']);
  assert.equal(s.energy, 2.5); // la somme garde son dixième
});

test('une quête payée dont tous les montants s’arrondissent à 0 garde son annonce, sans chiffre', () => {
  const s = summarize([{ type: 'reward', energy: 0.3, materials: 0.2, food: 0.1, quartier: 'champs' }]);
  assert.deepEqual(gainList(s), []);
  assert.equal(aGagne(s), true); // main.js : l'annonce (quartier, réplique, texte lu) ne disparaît pas
  assert.equal(s.quartier, 'champs');
  assert.equal(aGagne(summarize([{ type: 'sans-gain' }])), false);
});
