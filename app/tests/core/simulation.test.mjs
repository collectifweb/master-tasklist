// Simulation de 21 jours avec les vraies fonctions du cœur. Même plan de quêtes que
// docs/revue-2026-10/simulations/recommandation-3-semaines.mjs (2 à 4 quêtes par jour, absence du jour 9 au jour 12),
// mêmes valeurs P/L/D et domaines ; titres fictifs génériques.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createInitialState, openApp, advanceTime, completeQuest, harvest, storeReserve, sow, build, lightBrasero, souffler,
  avisStatus, directFilLibre, addDays,
} from '../../core/index.js';

const chapitres = JSON.parse(readFileSync(new URL('../../content/fr-CA/chapitres.json', import.meta.url), 'utf8'));

// [priorité, durée, difficulté, domaine] : les 16 premières tâches de taches-006.json, puis la 21e et la 23e
const POOL = [
  [8, 3, 3, 'Administratif'], [7, 2, 2, 'Jardin'], [9, 5, 6, 'Maison'], [6, 1, 2, 'Professionnel'], [6, 1, 2, 'Professionnel'],
  [7, 3, 3, 'Jardin'], [6, 2, 2, 'Jardin'], [8, 5, 5, 'Véhicule'], [6, 2, 3, 'Maison'], [6, 2, 3, 'Maison'], [5, 1, 1, 'Maison'],
  [7, 4, 5, 'Maison'], [8, 6, 7, 'Maison'], [5, 2, 2, 'Maison'], [5, 2, 2, 'Jardin'], [6, 4, 4, 'Maison'], [7, 8, 4, 'Ferme'],
  [8, 9, 9, 'Professionnel'],
];
const PLAN = [3, 2, 4, 3, 2, 4, 3, 3, 0, 0, 0, 0, 2, 4, 3, 2, 4, 3, 2, 3, 4];
const LEGER = Array.from({ length: 21 }, (_, i) => (i % 2 === 0 ? 1 : 0)); // 1 quête un jour sur deux
const DAY1 = '2026-10-06';
const at = (d, hourUtc) => `${addDays(DAY1, d - 1)}T${String(hourUtc).padStart(2, '0')}:00:00Z`;
// ordre d'achat d'un joueur appliqué : la Tour d'abord, puis la défense des Champs, l'établi, les érables, les décors
const BUY = ['tour', 'tunnel', 'etabli', 'parcelle', 'erable', 'parcelle', 'erable', 'erable', 'parcelle', 'cloture', 'lanterne', 'cloture', 'lanterne', 'cloture'];

function simulate(plan) {
  const total = plan.reduce((a, b) => a + b, 0);
  const tasks = Array.from({ length: total }, (_, k) => {
    const [priority, length, difficulty, domain] = POOL[k % POOL.length];
    return { id: 'q' + k, task: `Quête d’essai ${k + 1}`, domain, priority, length, difficulty, status: 'todo', created: '2026-10-05' };
  });
  let w = { tasks, game: createInitialState(at(1, 12)), ledger: [] };
  const events = [];
  const days = [];
  // applique une action ; une action refusée (ressources insuffisantes, rien à récolter…) renvoie false
  const act = (fn, params, now) => {
    let r;
    try { r = fn(w.tasks, w.game, w.ledger, { gameRevision: null, chapitres, ...params }, now); } catch { return false; }
    w = { tasks: r.tasks, game: r.game, ledger: [...w.ledger, ...r.entries] };
    events.push(...r.events.map((e) => ({ ...e, day: now.slice(0, 10) })));
    return true;
  };
  let k = 0;
  for (let d = 1; d <= plan.length; d++) {
    const n = plan[d - 1];
    let morning = null;
    if (n > 0) {
      act(openApp, {}, at(d, 13)); // 9 h à Montréal
      act(advanceTime, {}, at(d, 13));
      morning = structuredClone(w.game);
      while (act(harvest, {}, at(d, 13)));
      while (act(storeReserve, {}, at(d, 13)));
      for (let i = 0; i < n; i++) assert.ok(act(completeQuest, { id: 'q' + k++ }, at(d, 14 + i)));
      act(advanceTime, {}, at(d, 20));
      while (act(sow, { crop: 'courge' }, at(d, 21)));
      for (const id of BUY) act(build, { id }, at(d, 21));
      let st;
      while ((st = avisStatus(w.game, w.ledger, at(d, 21))) && st.preparation < st.force + 6 && act(lightBrasero, {}, at(d, 21)));
      while (w.game.resources.energy >= 30 && act(souffler, {}, at(d, 21)));
      if (w.game.sectors.atelier.open && w.game.sectors.atelier.stage < 1 && w.game.filLibre >= 1) {
        w = { ...w, game: directFilLibre(w.game, 'atelier', Math.floor(w.game.filLibre)).game };
      }
      act(advanceTime, {}, at(d, 22));
    }
    days.push({ d, morning, end: structuredClone(w.game) });
  }
  return { w, events, days };
}

const capped = (days, key) => days.filter((x) => x.end.resources[key] >= x.end.caps[key]).length;

// Aucune perte définitive : Lueur, stades de secteur, parcelles, constructions ne reculent jamais ; une culture ne
// disparaît que par une récolte.
function assertNothingLost(days) {
  for (let i = 1; i < days.length; i++) {
    const a = days[i - 1].end, b = days[i].end;
    for (const s of Object.keys(a.lueur)) assert.ok(b.lueur[s] >= a.lueur[s], `Lueur ${s} au jour ${i + 1}`);
    for (const s of Object.keys(a.sectors)) assert.ok(b.sectors[s].stage >= a.sectors[s].stage, `stade ${s} au jour ${i + 1}`);
    assert.ok(b.placements.length >= a.placements.length);
    for (const p of a.plots) {
      const q = b.plots.find((x) => x.id === p.id);
      assert.ok(q, `parcelle ${p.id} perdue au jour ${i + 1}`);
      if (p.crop) assert.ok((q.crop === p.crop && q.stage >= p.stage) || b.garden.harvested[p.crop] > a.garden.harvested[p.crop], `culture perdue au jour ${i + 1}`);
    }
  }
}

test('simulation 21 jours (plan de la recommandation) : chapitre 2 au jour 3 au plus tôt, Premier gel tenu, stocks rarement au plafond', () => {
  const { w, events, days } = simulate(PLAN);
  const opened = events.find((e) => e.type === 'chapitre' && e.chapter === 2);
  assert.ok(opened, 'le chapitre 2 s’ouvre');
  const openDay = days.find((x) => x.end.chapter.number >= 2).d;
  assert.ok(openDay >= 3, `chapitre 2 ouvert au jour ${openDay}`);
  const gel = w.game.avis.history.find((h) => h.id === 'premier_gel');
  assert.ok(gel, 'le Premier gel est joué');
  assert.equal(gel.result, 'tenu');
  assert.ok(gel.preparation >= gel.force);
  assert.ok(w.ledger.some((e) => e.key === 'avis:premier_gel' && e.materials === 15));
  for (const key of ['energy', 'materials']) assert.ok(capped(days, key) <= 0.2 * days.length, `${key} au plafond ${capped(days, key)} jours`);
  assertNothingLost(days);
  assert.equal(events.filter((e) => e.type === 'avis-resolu').length, 1);
});

test('simulation 21 jours : l’absence des jours 9 à 12 ne coûte rien', () => {
  const { days } = simulate(PLAN);
  const before = days[7].end; // fin du jour 8
  const back = days[12].morning; // jour 13, après openApp et advanceTime, avant les quêtes
  for (const k of ['energy', 'materials', 'confidence']) assert.ok(back.resources[k] >= before.resources[k], k);
  for (const s of Object.keys(before.lueur)) assert.ok(back.lueur[s] >= before.lueur[s], s);
  assert.ok(back.filLibre >= before.filLibre);
  assert.deepEqual(back.plots, before.plots); // rien n'a poussé, rien n'a pourri
  assert.deepEqual(back.placements, before.placements);
  assert.deepEqual(back.garden, before.garden);
  assert.deepEqual(back.avis.veils, []);
  assert.deepEqual(back.avis.current, before.avis.current); // l'Avis annoncé attend, sa Force n'a pas bougé
  for (const x of days.slice(8, 12)) assert.deepEqual(x.end, before); // pendant l'absence, l'état ne bouge pas
});

test('simulation 21 jours, profil Léger (1 quête un jour sur deux) : Premier gel tenu, aucune perte définitive', () => {
  const { w, days } = simulate(LEGER);
  const gel = w.game.avis.history.find((h) => h.id === 'premier_gel');
  assert.ok(gel, 'le Premier gel est joué');
  assert.equal(gel.result, 'tenu');
  assert.ok(gel.force < 24, 'la Force suit une activité plus légère');
  assert.deepEqual(w.game.avis.veils, []);
  assertNothingLost(days);
  for (const key of ['energy', 'materials']) assert.ok(capped(days, key) <= 0.2 * days.length, key);
});
