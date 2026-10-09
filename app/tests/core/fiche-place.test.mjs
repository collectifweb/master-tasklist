// Fiche de la Place et île (lot N, écrans) : le repas de la semaine et la partie de sucre lisent leurs valeurs et leurs
// refus au cœur ; l'île dresse la tablée la semaine du repas, la table de tire le printemps de la partie (devant la
// cabane à sucre si elle est bâtie). Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REPAS, OBJECTIFS_SAISON, servirRepas, faireLesSucres, prixPartieDeSucre, refusServirRepas, refusFaireLesSucres, PLACE_ID,
} from '../../core/index.js';
import { fresh, step, task, avantLeChalet } from './helpers.mjs';

// Les modules d'interface lisent `document.baseURI` à l'import et leurs textes dans content/ (comme loadContent).
globalThis.document = { baseURI: 'file:///app/' };
const { content } = await import('../../js/content.js');
const lire = (f) => JSON.parse(readFileSync(new URL(`../../content/fr-CA/${f}`, import.meta.url), 'utf8'));
content.ui = lire('interface.json');
for (const [groupe, textes] of Object.entries(lire('batiments.json'))) for (const [k, v] of Object.entries(textes)) content.ui[`bat.${groupe}.${k}`] = v;
const { quartierModel } = await import('../../js/ui/quartier.js');
const { deriveView } = await import('../../world/view.js');
const { artFor } = await import('../../world/models.js');
const { FETE_SPOTS } = await import('../../world/layout.js');

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const MARS = '2027-03-16'; // un mardi au temps des sucres
const monde = (day, { types = [], habitants = 3, food = 40 } = {}) => {
  const w = fresh(Array.from({ length: 3 }, (_, k) => task({ id: `q${k}`, created: '2026-10-01' })), at(day));
  avantLeChalet(w.game);
  w.game.habitants = habitants;
  w.game.resources = { energy: 10, materials: 10, food };
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, ...types.map((type) => ({ id: `${type}-1`, type }))];
  return w;
};
const fiche = (w, day) => quartierModel({ tasks: w.tasks, game: w.game, ledger: w.ledger, now: new Date(at(day, 16)) }, PLACE_ID);

test('repas : le troc vient du cœur ; libre, servi, puis verrouillé avec la raison du cœur', () => {
  const D = '2026-10-08';
  let w = monde(D);
  const m = fiche(w, D).repas;
  assert.deepEqual([m.donne.res, m.donne.n, m.recoit.res, m.recoit.n], ['nourriture', REPAS.donne.food, 'energie', REPAS.recoit.energy]);
  assert.equal(m.servi, false);
  assert.equal(m.raison, null);
  assert.equal(m.label.replace(/ /g, ' '), `Servir le repas : ${REPAS.donne.food} Nourriture contre ${REPAS.recoit.energy} Énergie`);
  w = step(w, servirRepas, {}, at(D)).world;
  assert.deepEqual([fiche(w, D).repas.servi, fiche(w, D).repas.raison], [true, null]);
  assert.equal(fiche(w, '2026-10-12').repas.servi, false, 'le lundi suivant, de nouveau');
  const vide = monde(D, { habitants: 0 });
  assert.equal(fiche(vide, D).repas.raison, refusServirRepas(vide.game, vide.ledger, {}, at(D)));
  assert.equal(fiche(vide, D).repas.raison, 'Le repas attend une première famille au village.');
});

test('partie de sucre : en mars et avril seulement ; son prix est la cible de l’objectif, la récompense celle du printemps', () => {
  for (const d of ['2027-02-28', '2027-05-01', '2026-10-08']) assert.equal(fiche(monde(d), d).sucres, null, d);
  const w = monde(MARS);
  const s = fiche(w, MARS).sucres;
  assert.deepEqual(s.demande.map((r) => [r.res, r.n]), [['nourriture', prixPartieDeSucre(w.game)]]);
  const rec = OBJECTIFS_SAISON.printemps.recompense;
  assert.deepEqual(s.laisse.map((r) => [r.res, r.n]), [['energie', rec.energy], ['materiaux', rec.materials], ['permis', rec.permis]]);
  assert.deepEqual([s.faite, s.raison], [false, null]);
  const apres = step(w, faireLesSucres, {}, at(MARS)).world;
  assert.deepEqual([fiche(apres, MARS).sucres.faite, fiche(apres, MARS).sucres.raison], [true, null]);
  const pauvre = monde(MARS, { food: 1 });
  assert.equal(fiche(pauvre, MARS).sucres.raison, refusFaireLesSucres(pauvre.game, pauvre.ledger, {}, at(MARS)));
  assert.match(fiche(pauvre, MARS).sucres.raison, /^Il manque \d+ Nourriture\.$/);
});

test('les autres quartiers n’ont ni repas ni partie de sucre', () => {
  const w = monde(MARS);
  for (const q of ['champs', 'atelier', 'mairie', 'ecole', 'garage']) {
    const m = quartierModel({ tasks: w.tasks, game: w.game, ledger: w.ledger, now: new Date(at(MARS)) }, q);
    assert.deepEqual([m.repas, m.sucres], [null, null], q);
  }
});

test('île : la tablée la semaine du repas ; la table de tire le printemps de la partie, devant la cabane si elle est bâtie', () => {
  const fetes = (w, day) => [...deriveView(w.game, w.tasks, { now: new Date(at(day)), ledger: w.ledger }).fetes].sort();
  let w = monde(MARS);
  assert.deepEqual(fetes(w, MARS), []);
  w = step(w, servirRepas, {}, at(MARS)).world;
  assert.deepEqual(fetes(w, MARS), ['repas']);
  assert.deepEqual(fetes(w, '2027-03-21'), ['repas'], 'le dimanche de la même semaine');
  assert.deepEqual(fetes(w, '2027-03-22'), [], 'le lundi suivant');
  w = step(w, faireLesSucres, {}, at(MARS)).world;
  assert.deepEqual(fetes(w, '2027-04-30'), ['tire']);
  assert.deepEqual(fetes(w, '2027-05-01'), [], 'la neige a fondu : le temps des sucres est fini');
  const cabane = step(monde(MARS, { types: ['cabane'], habitants: 6 }), faireLesSucres, {}, at(MARS)).world;
  assert.deepEqual(fetes(cabane, MARS), ['tire-cabane']);
  // les deux dessins fument (la marmite, le chaudron) ; chaque place existe
  for (const id of ['repas', 'tire', 'tire-cabane']) {
    const s = FETE_SPOTS[id];
    assert.ok(s && artFor(s).anchors.smoke, id);
  }
});
