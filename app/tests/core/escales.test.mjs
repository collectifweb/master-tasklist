// Le phare allumé et ses escales (lot Y, étape 3 des Grands travaux) : le phare debout s'allume une fois par semaine pour
// de l'Énergie ; le lendemain, un voilier de plaisanciers attend qu'on l'accueille (de la Nourriture, les familles
// d'abord) ; ils laissent un décor unique, rangé dans la remise. Rien ne se perd pendant une absence. Titres fictifs
// génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allumerPhare, accueillirEscale, refusAllumer, refusAccueillirEscale, etatEscales, ESCALE, DECORS_ESCALE, DECORS,
  refusPoser, poserDecor, etatDecors, RANGS, completeQuest, OUVRAGES, ACCUEIL_NOURRITURE, logements,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const MARDI = '2026-11-03', MERCREDI = '2026-11-04', DIMANCHE = '2026-11-08', LUNDI = '2026-11-09';
const BOURG = RANGS.find((r) => r.id === 'bourg').min;
const ETAPES = OUVRAGES.phare.etapes.length;

// Un village au Bourg, le chalet plein (aucune famille n'attend de place), le phare debout ou non.
function village({ debout = true, energy = 1000, food = 100 } = {}) {
  const w = fresh([task({ id: 'q1', task: 'Quête 1' })], at(MARDI, 12));
  w.game.habitants = BOURG;
  w.game.resources = { ...w.game.resources, energy, materials: 1000, food };
  if (debout) w.game.travaux = { phare: { payees: ETAPES, le: '2026-10-20', finies: ETAPES } };
  return w;
}
const allumer = (w, day = MARDI) => step(w, allumerPhare, {}, at(day, 15));
const accueillir = (w, day = MERCREDI) => step(w, accueillirEscale, {}, at(day, 15));

test('les décors des escales : six, uniques, qui ne s’achètent pas ; des prix en Énergie pour allumer, en Nourriture pour accueillir', () => {
  assert.equal(DECORS_ESCALE.length, 6);
  assert.equal(new Set(DECORS_ESCALE).size, 6);
  for (const id of DECORS_ESCALE) {
    assert.ok(DECORS[id]?.unique, `${id} : un décor unique`);
    assert.equal(refusPoser(village().game, { decor: id, coin: 'ecole-1' }), 'Ce décor ne s’achète pas.');
  }
  assert.ok(ESCALE.allumer.energy > 0 && Object.keys(ESCALE.allumer).length === 1);
  assert.ok(ESCALE.accueillir.food > 0 && Object.keys(ESCALE.accueillir).length === 1);
});

test('allumer : refusé tant que le phare n’est pas debout ; une partie neuve n’a jamais allumé', () => {
  const w = village({ debout: false });
  const e = etatEscales(w.game, w.ledger, at(MARDI));
  assert.equal(e.debout, false);
  assert.equal(e.allume, false);
  assert.equal(e.escale, null);
  assert.equal(e.decor, DECORS_ESCALE[0]);
  assert.equal(refusAllumer(w.game, w.ledger, {}, at(MARDI)), 'Le phare doit d’abord être debout.');
  assert.throws(() => allumer(w), /debout/);
});

test('allumer : l’Énergie part, la lanterne brille jusqu’au dimanche, rien au registre ni dans les tâches', () => {
  const w = village();
  const { world, r } = allumer(w);
  assert.equal(world.game.resources.energy, 1000 - ESCALE.allumer.energy);
  assert.deepEqual(world.game.escales, { allume: MARDI, accueillie: false, n: 0 });
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.events, [{ type: 'phare-allume', cout: ESCALE.allumer }]);
  assert.deepEqual(world.tasks, w.tasks);
  for (const day of [MARDI, MERCREDI, DIMANCHE]) assert.equal(etatEscales(world.game, world.ledger, at(day)).allume, true, day);
  assert.equal(etatEscales(world.game, world.ledger, at(LUNDI)).allume, false);
});

test('le voilier arrive le lendemain et attend, même au-delà du dimanche ; tant qu’il est là, on ne rallume pas', () => {
  const { world } = allumer(village());
  assert.equal(etatEscales(world.game, world.ledger, at(MARDI)).escale, 'en-route');
  assert.equal(refusAccueillirEscale(world.game, world.ledger, {}, at(MARDI)), 'Le voilier arrive demain.');
  assert.equal(refusAllumer(world.game, world.ledger, {}, at(MARDI)), 'Les plaisanciers arrivent demain.');
  for (const day of [MERCREDI, LUNDI, '2026-12-01']) {
    assert.equal(etatEscales(world.game, world.ledger, at(day)).escale, 'attend', day);
    assert.match(refusAllumer(world.game, world.ledger, {}, at(day)), /attendent au phare/);
  }
  // le même geste rejoué (double toucher, file hors ligne) est refusé
  assert.throws(() => allumer(world), /arrivent demain/);
});

test('accueillir : la Nourriture part, leur décor va dans la remise, le voilier repart ; la lanterne brille jusqu’au dimanche', () => {
  let { world } = allumer(village());
  let r;
  ({ world, r } = accueillir(world));
  assert.equal(world.game.resources.food, 100 - ESCALE.accueillir.food);
  assert.deepEqual(world.game.escales, { allume: MARDI, accueillie: true, n: 1 });
  assert.deepEqual(etatDecors(world.game).remise, [DECORS_ESCALE[0]]);
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.events, [{ type: 'escale-accueillie', decor: DECORS_ESCALE[0], cout: ESCALE.accueillir }]);
  const e = etatEscales(world.game, world.ledger, at(MERCREDI));
  assert.equal(e.escale, null);
  assert.equal(e.allume, true);
  assert.equal(e.decor, DECORS_ESCALE[1]);
  assert.equal(refusAccueillirEscale(world.game, world.ledger, {}, at(MERCREDI)), 'Aucun voilier au phare.');
  assert.throws(() => accueillir(world), /Aucun voilier/);
  assert.equal(refusAllumer(world.game, world.ledger, {}, at(DIMANCHE)), 'Déjà allumé cette semaine : le prochain, lundi.');
  assert.equal(refusAllumer(world.game, world.ledger, {}, at(LUNDI)), null);
  // le décor de la remise se pose comme un autre, gratuitement
  ({ world } = step(world, poserDecor, { decor: DECORS_ESCALE[0], coin: 'ecole-1', remise: true }, at(MERCREDI, 16)));
  assert.deepEqual(etatDecors(world.game).poses, { 'ecole-1': DECORS_ESCALE[0] });
});

test('six escales, six décors dans l’ordre, puis le même ordre', () => {
  let w = village({ energy: 5000, food: 1000 });
  const recus = [];
  let lundi = '2026-11-02';
  for (let k = 0; k < 8; k++) {
    const mardi = new Date(`${lundi}T12:00:00Z`);
    mardi.setUTCDate(mardi.getUTCDate() + 1);
    const m = mardi.toISOString().slice(0, 10);
    mardi.setUTCDate(mardi.getUTCDate() + 1);
    const me = mardi.toISOString().slice(0, 10);
    ({ world: w } = allumer(w, m));
    let r;
    ({ world: w, r } = accueillir(w, me));
    recus.push(r.events[0].decor);
    const s = new Date(`${lundi}T12:00:00Z`);
    s.setUTCDate(s.getUTCDate() + 7);
    lundi = s.toISOString().slice(0, 10);
  }
  assert.deepEqual(recus, [...DECORS_ESCALE, DECORS_ESCALE[0], DECORS_ESCALE[1]]);
});

test('accueillir : ce qui manque ; les familles d’abord quand une place est libre au chalet', () => {
  const pauvre = allumer(village({ food: 5 })).world;
  assert.equal(refusAccueillirEscale(pauvre.game, pauvre.ledger, {}, at(MERCREDI)), `Il manque ${ESCALE.accueillir.food - 5} Nourriture.`);
  // six chalets et un habitant de moins qu'eux n'en logent : une place est libre, la prochaine famille passe avant ; un
  // grenier, pour que la réserve garde les deux
  const w = village({ food: ESCALE.accueillir.food + ACCUEIL_NOURRITURE - 1 });
  w.game.batiments = [...Array.from({ length: 6 }, (_, k) => ({ id: `chalet-${k + 1}`, type: 'chalet' })), { id: 'grenier-1', type: 'grenier' }];
  w.game.habitants = logements(w.game).places - 1;
  assert.ok(w.game.habitants >= BOURG && logements(w.game).libres === 1);
  const { world } = allumer(w);
  assert.match(refusAccueillirEscale(world.game, world.ledger, {}, at(MERCREDI)), /^Les familles d’abord\u00a0: il faut \d+ Nourriture/);
  world.game.resources.food += 1;
  assert.equal(refusAccueillirEscale(world.game, world.ledger, {}, at(MERCREDI)), null);
});

test('allumer : ce qui manque ; une partie illisible est lue comme jamais allumée', () => {
  const w = village({ energy: 10 });
  assert.equal(refusAllumer(w.game, w.ledger, {}, at(MARDI)), `Il manque ${ESCALE.allumer.energy - 10} Énergie.`);
  for (const escales of ['oui', [], { allume: 'hier' }, { allume: 7, accueillie: false }, null]) {
    const g = { ...village().game, escales };
    const e = etatEscales(g, [], at(MARDI));
    assert.equal(e.escale, null, JSON.stringify(escales));
    assert.equal(e.allume, false);
    assert.equal(refusAllumer(g, [], {}, at(MARDI)), null);
  }
});

test('aucun effet de jeu : une quête rapporte autant, phare allumé ou non', () => {
  const sans = village();
  const { world: avec } = allumer(village());
  const gain = (w) => {
    const { world } = step(w, completeQuest, { id: 'q1' }, at(MARDI, 18));
    return { e: world.game.resources.energy - w.game.resources.energy, m: world.game.resources.materials - w.game.resources.materials };
  };
  assert.deepEqual(gain(avec), gain(sans));
});
