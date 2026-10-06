// Le marchand, premier visiteur du quai (lot V, décisions d'Alex du 6 octobre) : une fois le quai rebâti, il est là
// chaque semaine, du lundi au dimanche (semaine de jeu). Quatre offres fixes, chacune prise une fois par visite. Aucun
// aller-retour ne rapporte. Un échange ne passe que par la partie (game.set) : rien au registre, rien dans les tâches.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARCHAND, visiteurDeLaSemaine, refusEchanger, echanger, construire, migrateState, accueillir, semer, stockage,
  PAS_IDS, BATIMENTS,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

// 14 h UTC = 10 h à Montréal. Semaine du lundi 5 au dimanche 11 octobre 2026.
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const LUNDI = '2026-10-05';
const MARDI = '2026-10-06';
const DIMANCHE = '2026-10-11';
const LUNDI_SUIVANT = '2026-10-12';
const QUAI = { id: 'quai-1', type: 'quai' };
const offre = (id) => MARCHAND.offres.find((o) => o.id === id);
const [EM, EN, ME, NE] = ['energie-materiaux', 'energie-nourriture', 'materiaux-energie', 'nourriture-energie'];

const village = (over = {}) => {
  const w = fresh([task({ id: 'q1' })], at(MARDI));
  w.game.resources = { energy: 200, materials: 200, food: 10 };
  w.game.habitants = 3;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-10-01']));
  w.game.batiments = [QUAI];
  Object.assign(w.game, over);
  return w;
};

test('catalogue : quatre offres fixes, dans l’ordre, une ressource donnée et une reçue, en nombres entiers, sans permis', () => {
  assert.equal(MARCHAND.id, 'marchand');
  assert.deepEqual(MARCHAND.offres.map((o) => o.id), [EM, EN, ME, NE]);
  const sens = MARCHAND.offres.map((o) => `${Object.keys(o.donne)}>${Object.keys(o.recoit)}`);
  assert.deepEqual(sens, ['energy>materials', 'energy>food', 'materials>energy', 'food>energy']);
  for (const o of MARCHAND.offres) {
    for (const v of [...Object.values(o.donne), ...Object.values(o.recoit)]) assert.ok(Number.isInteger(v) && v > 0, `${o.id} : ${v}`);
    assert.ok(!('permis' in o.recoit), 'le marchand ne donne aucun permis');
  }
});

test('aucun aller-retour ne rapporte : acheter puis revendre rend toujours moins que le départ', () => {
  const taux = (o) => Object.values(o.recoit)[0] / Object.values(o.donne)[0];
  assert.ok(taux(offre(EM)) * taux(offre(ME)) < 1, 'Énergie → Matériaux → Énergie');
  assert.ok(taux(offre(EN)) * taux(offre(NE)) < 1, 'Énergie → Nourriture → Énergie');
  // et dans les faits : les deux offres prises la même semaine, les Matériaux restants comptés au prix d'achat, laissent moins qu'au départ
  let { world: w } = step(village(), echanger, { offre: EM }, at(MARDI));
  ({ world: w } = step(w, echanger, { offre: ME }, at(MARDI)));
  const g = w.game.resources;
  const net = g.energy - 200 + (g.materials - 200) * (offre(EM).donne.energy / offre(EM).recoit.materials);
  assert.ok(net < 0, `aller-retour Matériaux : ${JSON.stringify(g)}`);
});

test('sans quai, aucun visiteur ; le vieux quai ne suffit pas', () => {
  const w = village({ batiments: [] });
  assert.equal(visiteurDeLaSemaine(w.game, at(MARDI)), null);
  assert.equal(refusEchanger(w.game, { offre: EM }, at(MARDI)), 'Il faut d’abord rebâtir le quai.');
  assert.throws(() => step(w, echanger, { offre: EM }, at(MARDI)), { message: 'Il faut d’abord rebâtir le quai.' });
});

test('quai bâti : le marchand est là du lundi au dimanche, avec les jours qui restent', () => {
  const w = village();
  const v = visiteurDeLaSemaine(w.game, at(MARDI));
  assert.equal(v.id, 'marchand');
  assert.equal(v.semaine, LUNDI);
  assert.equal(v.depart, DIMANCHE);
  assert.equal(v.joursRestants, 6);
  assert.deepEqual(v.offres.map((o) => [o.id, o.prise]), [[EM, false], [EN, false], [ME, false], [NE, false]]);
  assert.equal(visiteurDeLaSemaine(w.game, at(LUNDI)).joursRestants, 7);
  assert.equal(visiteurDeLaSemaine(w.game, at(DIMANCHE)).joursRestants, 1);
  // la journée de jeu finit à 3 h 59 : la nuit du dimanche au lundi, il est encore là ; à 4 h, c'est la semaine suivante
  assert.equal(visiteurDeLaSemaine(w.game, `${LUNDI_SUIVANT}T07:30:00Z`).semaine, LUNDI); // 3 h 30 à Montréal
  assert.equal(visiteurDeLaSemaine(w.game, `${LUNDI_SUIVANT}T08:30:00Z`).semaine, LUNDI_SUIVANT); // 4 h 30
});

test('quai rebâti en milieu de semaine : le marchand arrive aussitôt', () => {
  const w = village({ batiments: [] });
  const { world } = step(w, construire, { type: 'quai' }, at('2026-10-08'));
  const v = visiteurDeLaSemaine(world.game, at('2026-10-08'));
  assert.equal(v.semaine, LUNDI);
  assert.equal(v.joursRestants, 4);
  assert.equal(refusEchanger(world.game, { offre: EM }, at('2026-10-08')), null);
});

test('échanger : les ressources bougent, la partie note l’offre prise, rien au registre ni dans les tâches', () => {
  const w = village();
  const { world, r } = step(w, echanger, { offre: EM }, at(MARDI));
  const o = offre(EM);
  assert.deepEqual(world.game.resources, { energy: 200 - o.donne.energy, materials: 200 + o.recoit.materials, food: 10 });
  assert.deepEqual(world.game.visite, { semaine: LUNDI, prises: [EM] });
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.ops.map((op) => op.type), ['game.set']);
  assert.deepEqual(r.tasks, w.tasks);
  assert.deepEqual(r.events.filter((e) => e.type === 'echange'), [{ type: 'echange', visiteur: 'marchand', offre: EM, donne: o.donne, recoit: o.recoit }]);
  assert.equal(visiteurDeLaSemaine(world.game, at(MARDI)).offres.find((x) => x.id === EM).prise, true);
});

test('chaque offre une seule fois par visite ; les autres restent ouvertes', () => {
  let { world: w } = step(village(), echanger, { offre: EM }, at(MARDI));
  const deja = 'Déjà fait cette semaine : le marchand revient lundi.';
  assert.equal(refusEchanger(w.game, { offre: EM }, at(DIMANCHE)), deja);
  assert.throws(() => step(w, echanger, { offre: EM }, at('2026-10-09')), { message: deja });
  ({ world: w } = step(w, echanger, { offre: EN }, at('2026-10-09')));
  assert.deepEqual(w.game.visite, { semaine: LUNDI, prises: [EM, EN] });
});

test('le lundi suivant, les offres sont de nouveau disponibles et l’ancienne visite est oubliée', () => {
  let { world: w } = step(village(), echanger, { offre: EM }, at(MARDI));
  assert.equal(visiteurDeLaSemaine(w.game, at(LUNDI_SUIVANT)).offres.every((o) => !o.prise), true);
  assert.equal(refusEchanger(w.game, { offre: EM }, at(LUNDI_SUIVANT)), null);
  ({ world: w } = step(w, echanger, { offre: ME }, at(LUNDI_SUIVANT)));
  assert.deepEqual(w.game.visite, { semaine: LUNDI_SUIVANT, prises: [ME] });
});

test('ce qui manque se dit comme ailleurs, et rien ne bouge', () => {
  const o = offre(EM);
  const w = village({ resources: { energy: o.donne.energy - 2.5, materials: 0, food: 0 } });
  assert.equal(refusEchanger(w.game, { offre: EM }, at(MARDI)), 'Il manque 3 Énergie.');
  const m = offre(ME);
  const w2 = village({ resources: { energy: 0, materials: m.donne.materials - 1, food: 0 } });
  assert.equal(refusEchanger(w2.game, { offre: ME }, at(MARDI)), 'Il manque 1 Matériau.');
  const n = offre(NE);
  const w3 = village({ resources: { energy: 0, materials: 0, food: n.donne.food - 4 } });
  assert.equal(refusEchanger(w3.game, { offre: NE }, at(MARDI)), 'Il manque 4 Nourriture.');
  assert.throws(() => step(w3, echanger, { offre: NE }, at(MARDI)), { message: 'Il manque 4 Nourriture.' });
});

test('Nourriture : refusée si la réserve n’a pas toute la place, sans rien perdre en cachette', () => {
  const o = offre(EN);
  const w = village();
  const max = stockage(w.game);
  w.game.resources.food = max;
  assert.equal(refusEchanger(w.game, { offre: EN }, at(MARDI)), `La réserve est pleine (${max} sur ${max}).`);
  w.game.resources.food = max - o.recoit.food + 1.5; // place pour une partie seulement
  const place = Math.floor(max - w.game.resources.food);
  assert.equal(refusEchanger(w.game, { offre: EN }, at(MARDI)), `La réserve n’a de place que pour ${place} Nourriture (${Math.floor(w.game.resources.food)} sur ${max}).`);
  w.game.resources.food = max - o.recoit.food; // tout juste la place
  const { world } = step(w, echanger, { offre: EN }, at(MARDI));
  assert.equal(world.game.resources.food, max);
});

test('ordre des raisons : quai, offre, déjà prise, manque, réserve', () => {
  const w = village({ resources: { energy: 0, materials: 0, food: 0 } });
  assert.equal(refusEchanger(w.game, { offre: 'constructor' }, at(MARDI)), 'Offre inconnue.');
  assert.equal(refusEchanger(w.game, { offre: undefined }, at(MARDI)), 'Offre inconnue.');
  assert.equal(refusEchanger(w.game, {}, at(MARDI)), 'Offre inconnue.');
  w.game.visite = { semaine: LUNDI, prises: [EM] };
  assert.equal(refusEchanger(w.game, { offre: EM }, at(MARDI)), 'Déjà fait cette semaine : le marchand revient lundi.');
  assert.match(refusEchanger(w.game, { offre: EN }, at(MARDI)), /^Il manque/);
});

test('une visite abîmée dans la partie ne bloque rien', () => {
  for (const visite of [null, 'x', [], { semaine: 3, prises: 'x' }, { semaine: LUNDI, prises: [1, null, {}] }]) {
    const w = village({ visite });
    assert.equal(visiteurDeLaSemaine(w.game, at(MARDI)).offres.some((o) => o.prise), false, JSON.stringify(visite));
    const { world } = step(w, echanger, { offre: EM }, at(MARDI));
    assert.deepEqual(world.game.visite, { semaine: LUNDI, prises: [EM] });
  }
});

test('un onglet d’avant le marchand garde la visite : relecture de la partie et gestes ordinaires', () => {
  // les fonctions d'avant le lot V (migrateState, construire, accueillir, semer) ne connaissent pas `visite` : elles la gardent
  const w = village({ visite: { semaine: LUNDI, prises: [EM] }, batiments: [QUAI, { id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }], habitants: 1, resources: { energy: 200, materials: 200, food: 30 } });
  const relue = migrateState(JSON.parse(JSON.stringify(w.game)), at(MARDI));
  assert.deepEqual(relue.visite, { semaine: LUNDI, prises: [EM] });
  let x = { ...w, game: relue };
  ({ world: x } = step(x, construire, { type: 'serre' }, at(MARDI)));
  ({ world: x } = step(x, accueillir, {}, at(MARDI)));
  ({ world: x } = step(x, semer, { id: 'serre-1' }, at(MARDI)));
  assert.deepEqual(x.game.visite, { semaine: LUNDI, prises: [EM] });
  assert.ok(BATIMENTS.quai.rang === 'hameau', 'le quai reste au Hameau');
});
