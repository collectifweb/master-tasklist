// L'échange du jour au comptoir du marchand (lot T, décisions d'Alex du 8 octobre 2026) : en plus de ses quatre offres de
// la semaine, le marchand rachète chaque jour 20 Matériaux contre 10 Énergie, une fois par jour de jeu (le jour change à
// 4 h), quai rebâti. Il laisse toujours 150 Matériaux au village : il en faut 170 pour échanger. Le jour de l'échange est
// noté dans game.echangeDuJour, pas dans game.visite. Rien au registre, rien dans les tâches.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARCHAND, ECHANGE_DU_JOUR, visiteurDeLaSemaine, refusEchanger, echanger, migrateState, construire, accueillir, semer,
  PAS_IDS,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

// 14 h UTC = 10 h à Montréal. Semaine du lundi 5 au dimanche 11 octobre 2026.
const at = (day, h = 14, m = 0) => `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;
const LUNDI = '2026-10-05';
const MARDI = '2026-10-06';
const MERCREDI = '2026-10-07';
const JEUDI = '2026-10-08';
const QUAI = { id: 'quai-1', type: 'quai' };
const JOUR = 'materiaux-energie-jour';
const [EM, ME] = ['energie-materiaux', 'materiaux-energie'];
const GARDE = 'Le marchand en laisse toujours 150 au village pour les chantiers.';
const DEJA = 'Déjà fait aujourd’hui\u00a0: le marchand rachète de nouveau demain.';
const PASSE = 'Le marchand a déjà racheté depuis\u00a0: cet échange date d’un jour passé.';

const village = (over = {}) => {
  const w = fresh([task({ id: 'q1' })], at(MARDI));
  w.game.resources = { energy: 50, materials: 200, food: 10 };
  w.game.habitants = 3;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-10-01']));
  w.game.batiments = [QUAI];
  Object.assign(w.game, over);
  return w;
};

test('l’offre du jour : 20 Matériaux contre 10 Énergie, 150 Matériaux laissés au village, à part des quatre offres de la semaine', () => {
  assert.deepEqual(ECHANGE_DU_JOUR, { id: JOUR, donne: { materials: 20 }, recoit: { energy: 10 }, garde: { materials: 150 } });
  assert.equal(MARCHAND.offres.length, 4);
  assert.ok(!MARCHAND.offres.some((o) => o.id === JOUR));
  const v = visiteurDeLaSemaine(village().game, at(MARDI));
  assert.deepEqual(v.duJour, { ...ECHANGE_DU_JOUR, prise: false });
  assert.equal(v.offres.length, 4);
});

test('aucun aller-retour ne rapporte : le marchand vend 1 Matériau 2 Énergie et le rachète une demi-Énergie chaque jour', () => {
  const em = MARCHAND.offres.find((o) => o.id === EM);
  const taux = (o) => Object.values(o.recoit)[0] / Object.values(o.donne)[0];
  assert.ok(taux(em) * taux(ECHANGE_DU_JOUR) < 1);
  // et l'échange du jour paie moins que l'offre de la semaine dans le même sens
  assert.ok(taux(ECHANGE_DU_JOUR) < taux(MARCHAND.offres.find((o) => o.id === ME)));
});

test('sans quai, pas d’échange du jour', () => {
  const w = village({ batiments: [] });
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MARDI)), 'Il faut d’abord rebâtir le quai.');
  assert.throws(() => step(w, echanger, { offre: JOUR }, at(MARDI)), { message: 'Il faut d’abord rebâtir le quai.' });
});

test('170 Matériaux : l’échange passe, il en reste 150 ; la partie note le jour, rien au registre ni dans les tâches', () => {
  const w = village({ resources: { energy: 50, materials: 170, food: 10 } });
  const { world, r } = step(w, echanger, { offre: JOUR }, at(MARDI));
  assert.deepEqual(world.game.resources, { energy: 60, materials: 150, food: 10 });
  assert.equal(world.game.echangeDuJour, MARDI);
  assert.equal(world.game.visite, undefined, 'les offres de la semaine ne sont pas touchées');
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.ops.map((op) => op.type), ['game.set']);
  assert.deepEqual(r.tasks, w.tasks);
  assert.deepEqual(r.events.filter((e) => e.type === 'echange'), [{ type: 'echange', visiteur: 'marchand', offre: JOUR, donne: { materials: 20 }, recoit: { energy: 10 } }]);
  assert.equal(visiteurDeLaSemaine(world.game, at(MARDI)).duJour.prise, true);
});

test('moins de 170 Matériaux : refusé, avec ce qui manque et la raison, et rien ne bouge', () => {
  const w = village({ resources: { energy: 50, materials: 169, food: 10 } });
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MARDI)), `Il manque 1 Matériau. ${GARDE}`);
  assert.throws(() => step(w, echanger, { offre: JOUR }, at(MARDI)), { message: `Il manque 1 Matériau. ${GARDE}` });
  const w2 = village({ resources: { energy: 0, materials: 10.5, food: 0 } }); // ce qui manque s'arrondit au-dessus
  assert.equal(refusEchanger(w2.game, { offre: JOUR }, at(MARDI)), `Il manque 160 Matériaux. ${GARDE}`);
});

test('une fois par jour : refusé jusqu’à 3 h 59, de nouveau possible à 4 h', () => {
  let { world: w } = step(village(), echanger, { offre: JOUR }, at(MARDI));
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MARDI, 23)), DEJA);
  assert.throws(() => step(w, echanger, { offre: JOUR }, at(MARDI, 22)), { message: DEJA }); // le double toucher
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MERCREDI, 7, 59)), DEJA); // 3 h 59 à Montréal : encore mardi
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MERCREDI, 8, 0)), null); // 4 h
  ({ world: w } = step(w, echanger, { offre: JOUR }, at(MERCREDI, 8, 0)));
  assert.deepEqual(w.game.resources, { energy: 70, materials: 160, food: 10 });
  assert.equal(w.game.echangeDuJour, MERCREDI);
});

test('un jour sauté ne donne pas deux échanges', () => {
  let { world: w } = step(village({ resources: { energy: 50, materials: 400, food: 10 } }), echanger, { offre: JOUR }, at(LUNDI));
  ({ world: w } = step(w, echanger, { offre: JOUR }, at(JEUDI)));
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(JEUDI, 20)), DEJA);
  assert.equal(w.game.resources.energy, 70);
});

test('le geste de la veille, rejoué après l’échange du jour fait ailleurs, est refusé ; sans échange du jour, il passe', () => {
  // l'appareil A échange mardi hors ligne ; B échange mercredi ; A revient en ligne et rejoue son geste de mardi
  const { world: w } = step(village(), echanger, { offre: JOUR }, at(MERCREDI));
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MARDI)), PASSE);
  assert.throws(() => step(w, echanger, { offre: JOUR }, at(MARDI)), { message: PASSE });
  // sans échange de mercredi, le geste de mardi passe, et celui de mercredi reste possible
  let { world: x } = step(village(), echanger, { offre: JOUR }, at(MARDI));
  assert.equal(refusEchanger(x.game, { offre: JOUR }, at(MERCREDI)), null);
  ({ world: x } = step(x, echanger, { offre: JOUR }, at(MERCREDI)));
  assert.equal(x.game.echangeDuJour, MERCREDI);
});

test('l’échange du jour et les offres de la semaine ne se gênent pas, dans un sens comme dans l’autre', () => {
  let { world: w } = step(village(), echanger, { offre: ME }, at(MARDI));
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MARDI)), null);
  ({ world: w } = step(w, echanger, { offre: JOUR }, at(MARDI)));
  assert.deepEqual(w.game.visite, { semaine: LUNDI, prises: [ME] });
  // une offre de la semaine prise après l'échange du jour (le chemin d'avant le lot T : il réécrit game.visite en entier)
  // garde la marque du jour
  ({ world: w } = step(w, echanger, { offre: EM }, at(MARDI)));
  assert.equal(w.game.echangeDuJour, MARDI);
  assert.deepEqual(w.game.visite, { semaine: LUNDI, prises: [ME, EM] });
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MARDI)), DEJA);
});

test('un échange du jour de la semaine passée ne gêne pas les offres de la nouvelle semaine', () => {
  const { world: w } = step(village(), echanger, { offre: JOUR }, at('2026-10-11')); // dimanche
  assert.equal(refusEchanger(w.game, { offre: EM }, at('2026-10-12')), null);
  assert.equal(refusEchanger(w.game, { offre: JOUR }, at('2026-10-12')), null);
});

test('une marque du jour abîmée dans la partie ne bloque rien', () => {
  for (const echangeDuJour of [null, 'x', 3, [], {}, '2026-13-45x']) {
    const w = village({ echangeDuJour });
    assert.equal(visiteurDeLaSemaine(w.game, at(MARDI)).duJour.prise, false, JSON.stringify(echangeDuJour));
    assert.equal(refusEchanger(w.game, { offre: JOUR }, at(MARDI)), null, JSON.stringify(echangeDuJour));
    const { world } = step(w, echanger, { offre: JOUR }, at(MARDI));
    assert.equal(world.game.echangeDuJour, MARDI);
  }
});

test('une partie qui porte la marque du jour la garde : relecture et gestes ordinaires', () => {
  const w = village({ echangeDuJour: MARDI, batiments: [QUAI, { id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }], habitants: 1, resources: { energy: 200, materials: 200, food: 30 } });
  const relue = migrateState(JSON.parse(JSON.stringify(w.game)), at(MARDI));
  assert.equal(relue.echangeDuJour, MARDI);
  let x = { ...w, game: relue };
  ({ world: x } = step(x, construire, { type: 'serre' }, at(MARDI)));
  ({ world: x } = step(x, accueillir, {}, at(MARDI)));
  ({ world: x } = step(x, semer, { id: 'serre-1' }, at(MARDI)));
  assert.equal(x.game.echangeDuJour, MARDI);
  assert.equal(refusEchanger(x.game, { offre: JOUR }, at(MARDI)), DEJA);
});
