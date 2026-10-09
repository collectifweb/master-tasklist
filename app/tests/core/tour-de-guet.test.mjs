// Tour de guet (bible §5 et §8, lot V) : avec elle, une tempête de neige est annoncée 7 jours d'avance au lieu de 3. La
// barre garde ses trois crans : les jours travaillés des 7 jours comptent, et un cran manqué s'achète, au plus un par jour
// d'annonce écoulé. L'annonce ne commence jamais pendant la trêve des Fêtes, ni avant le lendemain de la tempête
// précédente. Les jours de tempête ne changent pas. Sans tour, tout est comme avant (tests/core/hiver.test.mjs, inchangé).
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPETE, TOUR_ANNONCE, annonceDe, debutAnnonce, tempetesDeLHiver, tempeteEnVue, preparation, alerteTempete, refusPreparer,
  preparer, advanceTime, calendrierImprevus, PAS_IDS, addDays, daysBetween, isTruce,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const TOUR = { id: 'tour-1', type: 'tour' };
const EOLIENNE = { id: 'eolienne-1', type: 'eolienne' };
const CHALETS = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }, { id: 'chalet-3', type: 'chalet' }];
const paye = (day, id = 'x') => ({ key: `reward:${id}-${day}:1`, at: at(day), day, type: 'reward', taskId: `${id}-${day}`, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });

// Village au rang Village sorti des premiers pas, vu la veille de `day`, avec ou sans tour de guet.
function village(day, tour = true, over = {}, ledger = []) {
  const w = fresh([task({ id: 'q-maison', domain: 'Maison' })], at(day));
  w.game.resources = { energy: 50, materials: 50, food: 10 };
  w.game.habitants = 6;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-01-01']));
  w.game.batiments = [...CHALETS, EOLIENNE, ...(tour ? [TOUR] : [])];
  w.game.lastSeenDay = addDays(day, -1);
  w.game.lastOpenDay = addDays(day, -1);
  Object.assign(w.game, over);
  w.ledger = [...ledger, ...calendrierImprevus(day).creneaux.map((c) => ({ key: `imprevu:${c.jour}` }))];
  return w;
}

// Première tempête (hivers 2026 à 2100) qui répond au filtre ; `prec` : la tempête d'avant dans le même hiver, ou null.
function tempete(filtre) {
  for (let y = 2026; y <= 2100; y++) {
    const s = tempetesDeLHiver(`${y}-12-01`);
    for (let i = 0; i < s.length; i++) if (filtre(s[i], i ? s[i - 1] : null)) return s[i];
  }
  throw new Error('aucune tempête trouvée');
}
// Une tempête dont les 7 jours d'annonce sont libres : hors trêve, la précédente au moins 8 jours avant.
const libre = (j, prec) => (!prec || daysBetween(prec, j) >= 8) && ![...Array(8).keys()].some((k) => isTruce(addDays(j, -k)));

test('catalogue : 7 jours d’annonce avec la tour, 3 sans ; la constante des tempêtes ne change pas', () => {
  assert.equal(TOUR_ANNONCE, 7);
  assert.equal(TEMPETE.annonce, 3);
  assert.equal(annonceDe(village('2026-12-01', false).game), 3);
  assert.equal(annonceDe(village('2026-12-01').game), 7);
});

test('les jours de tempête ne dépendent pas de la tour : même liste, avec ou sans', () => {
  for (const y of [2026, 2027, 2030, 2041]) {
    const s = tempetesDeLHiver(`${y}-12-01`);
    for (const j of s) assert.equal(debutAnnonce(j), addDays(j, -3), j);
  }
});

test('avec la tour, l’alerte paraît 7 jours d’avance ; sans, 3', () => {
  const j = tempete(libre);
  const voit = (tour, k) => {
    const w = village(addDays(j, -k), tour);
    return alerteTempete(w.tasks, w.game, w.ledger, at(addDays(j, -k)));
  };
  assert.equal(voit(true, 8), null);
  assert.deepEqual([voit(true, 7).jour, voit(true, 7).joursRestants], [j, 7]);
  assert.equal(voit(false, 4), null);
  assert.equal(voit(false, 3).joursRestants, 3);
  assert.deepEqual(tempeteEnVue(addDays(j, -7), 7), { jour: j, joursRestants: 7 });
  assert.equal(tempeteEnVue(addDays(j, -7)), null, 'sans la longueur, l’annonce de base');
});

test('barre : les jours travaillés des 7 jours comptent avec la tour ; la veille de l’annonce non', () => {
  const j = tempete(libre);
  const ledger = [paye(addDays(j, -8)), paye(addDays(j, -7)), paye(addDays(j, -6)), paye(addDays(j, -5))];
  assert.deepEqual(preparation(village(j).game, ledger, j, j), { travailles: 3, achetes: 0, crans: 3, max: 3 });
  assert.deepEqual(preparation(village(j, false).game, ledger, j, j), { travailles: 0, achetes: 0, crans: 0, max: 3 });
});

test('rentrer du bois sur 7 jours : au plus un cran acheté par jour d’annonce écoulé', () => {
  const j = tempete(libre);
  const d1 = addDays(j, -7);
  const w = village(d1);
  assert.equal(refusPreparer(w.tasks, w.game, w.ledger, { jour: j, n: 1 }, at(d1)), null);
  const w1 = step(w, preparer, { jour: j, n: 1 }, at(d1)).world;
  assert.equal(refusPreparer(w1.tasks, w1.game, w1.ledger, { jour: j, n: 2 }, at(d1)), 'Le prochain cran se gagne demain.');
  // trois jours plus tard, sans avoir travaillé : les deux crans qui manquent s'achètent
  const d3 = addDays(j, -5);
  const w3 = step(w1, preparer, { jour: j, n: 2 }, at(d3)).world;
  assert.equal(refusPreparer(w3.tasks, w3.game, w3.ledger, { jour: j, n: 3 }, at(d3)), null);
  // sans tour, ce jour-là, rien n'est encore annoncé
  const sans = village(d3, false);
  assert.equal(refusPreparer(sans.tasks, sans.game, sans.ledger, { jour: j, n: 1 }, at(d3)), 'Aucune tempête annoncée.');
});

test('deux tempêtes à 7 jours : l’annonce de la seconde commence le lendemain de la première, pas avant', () => {
  const j2 = tempete((j, prec) => prec && daysBetween(prec, j) === 7);
  const j1 = addDays(j2, -7);
  assert.equal(debutAnnonce(j2, 7), addDays(j1, 1));
  assert.deepEqual(tempeteEnVue(j1, 7), { jour: j1, joursRestants: 0 });
  assert.deepEqual(tempeteEnVue(addDays(j1, 1), 7), { jour: j2, joursRestants: 6 });
  // le jour de la première tempête, travaillé, ne compte pas pour la seconde
  assert.equal(preparation(village(j2).game, [paye(j1)], j2, j2).travailles, 0);
  assert.equal(preparation(village(j2).game, [paye(addDays(j1, 1))], j2, j2).travailles, 1);
});

test('jamais d’annonce pendant la trêve des Fêtes : elle commence le lendemain de la trêve', () => {
  const j = tempete((x) => isTruce(addDays(x, -7)));
  const debut = debutAnnonce(j, 7);
  assert.ok(!isTruce(debut) && isTruce(addDays(debut, -1)), debut);
  assert.ok(daysBetween(debut, j) >= 3 && daysBetween(debut, j) < 7, `${debut} → ${j}`);
  assert.equal(tempeteEnVue(addDays(debut, -1), 7), null);
  assert.equal(tempeteEnVue(debut, 7).jour, j);
});

test('annonce vue : avec la tour, le dernier passage 6 jours avant suffit ; la tempête ensevelit l’éolienne si la barre n’est pas pleine', () => {
  const j = tempete(libre);
  const seen = addDays(j, -6);
  const avec = village(j, true, { lastSeenDay: seen, lastOpenDay: seen });
  const ra = step(avec, advanceTime, {}, at(j)).r;
  assert.deepEqual(ra.events.filter((e) => e.type === 'tempete').map((e) => [e.jour, e.resultat]), [[j, 'neige']]);
  const sans = village(j, false, { lastSeenDay: seen, lastOpenDay: seen });
  const rs = step(sans, advanceTime, {}, at(j)).r;
  assert.deepEqual(rs.events.filter((e) => e.type === 'tempete').map((e) => [e.jour, e.resultat, e.raison]), [[j, 'passee', 'pas-vue']]);
});

test('tenue : trois jours travaillés au début des 7 jours suffisent avec la tour', () => {
  const j = tempete(libre);
  const ledger = [paye(addDays(j, -7)), paye(addDays(j, -6)), paye(addDays(j, -5))];
  const r = step(village(j, true, {}, ledger), advanceTime, {}, at(j)).r;
  assert.deepEqual(r.events.filter((e) => e.type === 'tempete').map((e) => [e.jour, e.resultat]), [[j, 'tenue']]);
});

test('tour bâtie au milieu d’une annonce : les jours travaillés d’avant elle comptent aussi (la partie ne garde pas la date d’un bâtiment)', () => {
  const j = tempete(libre);
  const ledger = [paye(addDays(j, -6)), paye(addDays(j, -5))];
  const day = addDays(j, -2);
  assert.equal(preparation(village(day, false).game, ledger, j, day).travailles, 0);
  assert.equal(preparation(village(day).game, ledger, j, day).travailles, 2);
});
