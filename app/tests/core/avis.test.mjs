import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTime, avisActivity, avisPreparation, avisStatus, lightBrasero, liftVeil, avisKey, applyEntry, completeQuest,
  AVIS, GARDE, addDays,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, hourUtc = 14) => `${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`; // 14 h UTC = 10 h à Montréal
const days = (from, n) => Array.from({ length: n }, (_, i) => addDays(from, i));
const kinds = (r) => r.ops.map((o) => o.type);

// Chapitre 2 commencé le 1er octobre, partie commencée le 28 septembre, lisière allumée les jours donnés.
function ch2(lisiere = days('2026-09-28', 7), over = {}) {
  const w = fresh([], at('2026-09-28'));
  Object.assign(w.game, { chapter: { number: 2, startDay: '2026-10-01', objectives: {} }, lisiereDays: lisiere, lastSeenDay: '2026-10-04' }, over);
  w.game.sectors.atelier.open = true;
  return w;
}
const reward = (day, sector, key, over = {}) => ({
  key, at: at(day), day, type: 'reward', taskId: key, occurrence: 1, pe: 10, energy: 0, materials: 0,
  lueur: { sector, amount: 7.5 }, filLibre: 2.5, ...over,
});
// Avis annoncé le 5 octobre pour le 12.
function announced(over = {}) {
  const w = ch2(undefined, { lastSeenDay: '2026-10-11' }); // vu la veille de l'Avis : présent
  w.game.avis.current = { id: 'premier_gel', sector: 'champs', day: '2026-10-12', announcedOn: '2026-10-05', base: 24, force: 24, activity: 4, braseros: 0, ...over };
  return w;
}

test('activité : part des jours allumés sur 28 jours (depuis le début si moins), rapportée à 4 sur 7, bornée à ±25 %', () => {
  const w = ch2(days('2026-09-28', 4));
  assert.deepEqual(avisActivity(w.game, '2026-10-05'), { activity: 4, days: 7, ratio: 1 });
  assert.equal(avisActivity({ ...w.game, lisiereDays: days('2026-09-28', 7) }, '2026-10-05').ratio, 1.25);
  assert.equal(avisActivity({ ...w.game, lisiereDays: [] }, '2026-10-05').ratio, 0.75);
  // au-delà de 28 jours, la fenêtre glisse
  const old = { ...w.game, startDay: '2026-08-01', lisiereDays: days('2026-08-01', 30) };
  assert.deepEqual(avisActivity(old, '2026-10-05'), { activity: 0, days: 28, ratio: 0.75 });
});

test('Premier gel : annoncé au 5e jour du chapitre 2, 7 jours d’avance, Force = 24 × activité, une seule fois', () => {
  let w = ch2();
  assert.deepEqual(step(w, advanceTime, {}, at('2026-10-04')).r.events, []); // 4e jour : rien
  const s = step(w, advanceTime, {}, at('2026-10-05'));
  assert.deepEqual(s.r.events, [{ type: 'avis-annonce', id: 'premier_gel', day: '2026-10-12', sector: 'champs', force: 30 }]);
  assert.deepEqual(s.world.game.avis.current, {
    id: 'premier_gel', sector: 'champs', day: '2026-10-12', announcedOn: '2026-10-05', base: AVIS.premier_gel.base, force: 30, activity: 7, braseros: 0,
  });
  assert.deepEqual(kinds(s.r), ['game.set']);
  // rejouer le même instant ne refait rien
  assert.deepEqual(step(s.world, advanceTime, {}, at('2026-10-05')).r.ops, []);
  // jamais au chapitre 1
  const c1 = ch2([], { chapter: { number: 1, startDay: '2026-10-01', objectives: {} } });
  assert.equal(step(c1, advanceTime, {}, at('2026-10-09')).world.game.avis.current, null);
});

test('Préparation détaillée : Garde 8, défenses, quêtes de la fenêtre (8 au plus), secteur visé (+3, 9 au plus), réserve, braseros, autonomes', () => {
  const w = announced({ braseros: 2 });
  const g = w.game;
  g.placements = [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }, { id: 'tunnel-1', model: 'tunnel', sector: 'champs' }];
  g.garden.reserve = 4;
  g.sectors.place.stage = 3;
  const ledger = [
    reward('2026-10-04', 'champs', 'avant'), // avant l'annonce : ne compte pas
    ...days('2026-10-05', 7).map((d, i) => reward(d, i < 4 ? 'champs' : 'atelier', 'q' + i)),
    reward('2026-10-06', 'atelier', 'q7'), reward('2026-10-06', 'atelier', 'q8'), reward('2026-10-06', 'atelier', 'q9'),
    reward('2026-10-07', 'champs', 'remballee'), { key: 'reverse:remballee:1', type: 'reverse', day: '2026-10-07' },
    reward('2026-10-12', 'champs', 'jour-meme'), // le jour de l'Avis : trop tard
  ];
  const p = avisPreparation(g, ledger, g.avis.current);
  const v = Object.fromEntries(p.lignes.map((l) => [l.id, l.value]));
  assert.deepEqual(v, { garde: GARDE, tour: 4, tunnel: 6, quetes: 8, 'quetes-secteur': 9, reserve: 4, braseros: 10, autonomes: 6 });
  assert.equal(p.lignes.find((l) => l.id === 'quetes').count, 10);
  assert.equal(p.lignes.find((l) => l.id === 'quetes-secteur').count, 4);
  assert.equal(p.total, 55);
  // le tunnel ne défend que les Champs
  assert.equal(avisPreparation(g, [], { ...g.avis.current, sector: 'atelier' }).lignes.some((l) => l.id === 'tunnel'), false);
});

test('avisStatus : la jauge de l’Avis en cours', () => {
  const w = announced();
  const st = avisStatus(w.game, [], at('2026-10-09'));
  assert.equal(st.daysLeft, 3);
  assert.equal(st.preparation, GARDE);
  assert.equal(st.force, 24);
  assert.equal(st.tenu, false);
  assert.equal(st.braserosMax, 3);
  assert.equal(avisStatus(ch2().game, [], at('2026-10-09')), null);
});

test('braseros : 8 ⚡ → +5 Préparation, 3 au plus, seulement avant l’Avis', () => {
  let w = announced();
  w.game.resources.energy = 40;
  assert.throws(() => step(ch2(), lightBrasero, {}, at('2026-10-06')), /Aucun Avis/);
  for (let i = 1; i <= 3; i++) {
    const s = step(w, lightBrasero, {}, at('2026-10-06'));
    assert.deepEqual(s.r.events, [{ type: 'brasero', avis: 'premier_gel', braseros: i, preparation: GARDE + 5 * i }]);
    w = s.world;
  }
  assert.equal(w.game.resources.energy, 16);
  assert.throws(() => step(w, lightBrasero, {}, at('2026-10-06')), /3 braseros au plus/);
  assert.throws(() => step(announced(), lightBrasero, {}, at('2026-10-12')), /Aucun Avis/);
});

test('Tenu : +15 ▣ par une entrée de registre idempotente avis:{id}, Réserve consommée, historique, pas de voile', () => {
  const w = announced({ force: 20 });
  w.game.garden.reserve = 6;
  w.game.placements = [{ id: 'tunnel-1', model: 'tunnel', sector: 'champs' }];
  w.game.lastSeenDay = '2026-10-11';
  const s = step(w, advanceTime, {}, at('2026-10-12', 9)); // 5 h à Montréal : le matin de l'Avis
  assert.deepEqual(kinds(s.r), ['ledger.append', 'game.set']);
  assert.deepEqual(s.r.entries.map((e) => [e.key, e.type, e.materials]), [[avisKey('premier_gel'), 'avis', 15]]);
  const res = s.r.events.find((e) => e.type === 'avis-resolu');
  assert.deepEqual([res.result, res.force, res.preparation], ['tenu', 20, 20]);
  assert.ok(s.r.events.some((e) => e.type === 'reward' && e.source === 'avis' && e.materials === 15));
  const g = s.world.game;
  assert.equal(g.resources.materials, 30);
  assert.equal(g.garden.reserve, 0);
  assert.equal(g.avis.current, null);
  assert.deepEqual(g.avis.history, [{ id: 'premier_gel', day: '2026-10-12', resolvedOn: '2026-10-12', result: 'tenu', force: 20, preparation: 20 }]);
  assert.deepEqual(g.avis.veils, []);
  // rejouer : rien
  assert.deepEqual(step(s.world, advanceTime, {}, at('2026-10-12', 9)).r.ops, []);
  // rejouer sur un état qui a perdu la résolution : le registre empêche de payer deux fois
  const stale = step({ ...w, ledger: s.world.ledger }, advanceTime, {}, at('2026-10-12', 9));
  assert.deepEqual(stale.r.entries, []);
  assert.equal(stale.world.game.avis.history.length, 1);
});

test('la résolution attend 4 h du matin, heure de Montréal', () => {
  const w = announced();
  assert.equal(step(w, advanceTime, {}, '2026-10-12T07:30:00Z').world.game.avis.current.id, 'premier_gel'); // 3 h 30
  assert.equal(step(w, advanceTime, {}, '2026-10-12T08:00:00Z').world.game.avis.current, null); // 4 h 00
});

test('Voilé : 2 cases du secteur visé pour 3 jours, aucune perte ; levé par 1 ⚡ par case', () => {
  const w = announced({ force: 30 });
  w.game.lastSeenDay = '2026-10-10'; // vu 2 jours avant : présent
  w.game.resources.energy = 5;
  const s = step(w, advanceTime, {}, at('2026-10-12'));
  assert.equal(s.r.events.find((e) => e.type === 'avis-resolu').result, 'voile');
  assert.deepEqual(s.r.entries, []);
  assert.deepEqual(s.world.game.avis.veils, [{ avis: 'premier_gel', sector: 'champs', cells: 2, since: '2026-10-12', until: '2026-10-15' }]);
  assert.deepEqual(s.world.game.resources, w.game.resources); // rien n'est retiré
  let l = step(s.world, liftVeil, { sector: 'champs' }, at('2026-10-12', 15));
  assert.deepEqual(l.r.events, [{ type: 'voile-leve', sector: 'champs', reason: 'energie', cells: 1 }]);
  l = step(l.world, liftVeil, { sector: 'champs' }, at('2026-10-12', 15));
  assert.deepEqual(l.world.game.avis.veils, []);
  assert.equal(l.world.game.resources.energy, 3);
  assert.throws(() => step(l.world, liftVeil, { sector: 'champs' }, at('2026-10-12', 15)), /Aucun voile/);
});

test('le voile se lève seul après 3 jours, ou avec la prochaine quête du secteur', () => {
  const w = announced({ force: 30 });
  const veiled = step(w, advanceTime, {}, at('2026-10-12')).world;
  assert.equal(step(veiled, advanceTime, {}, at('2026-10-14')).world.game.avis.veils.length, 1);
  const s = step(veiled, advanceTime, {}, at('2026-10-15'));
  assert.deepEqual(s.r.events.filter((e) => e.type === 'voile-leve'), [{ type: 'voile-leve', sector: 'champs', reason: 'temps', cells: 0 }]);
  assert.deepEqual(s.world.game.avis.veils, []);
  // une quête d'un autre secteur ne lève rien ; une quête des Champs lève le voile
  const other = applyEntry(veiled.game, reward('2026-10-13', 'atelier', 'a'), at('2026-10-13'));
  assert.equal(other.game.avis.veils.length, 1);
  const r = applyEntry(other.game, reward('2026-10-13', 'champs', 'b'), at('2026-10-13'));
  assert.deepEqual(r.events.filter((e) => e.type === 'voile-leve'), [{ type: 'voile-leve', sector: 'champs', reason: 'quete', cells: 0 }]);
  assert.deepEqual(r.game.avis.veils, []);
  // par completeQuest aussi
  const q = { ...veiled, tasks: [task({ id: 'c', domain: 'Jardin' })] };
  assert.ok(step(q, completeQuest, { id: 'c' }, at('2026-10-13')).r.events.some((e) => e.type === 'voile-leve'));
});

test('sous un voile des Champs, les cultures poussent de moitié (production réduite de 50 %)', () => {
  const w = announced({ force: 30 });
  const g = step(w, advanceTime, {}, at('2026-10-12')).world.game;
  g.plots = [{ id: 'parcelle-1', slot: 0, crop: 'courge', stage: 0 }];
  const half = applyEntry(g, reward('2026-10-13', 'atelier', 'a'), at('2026-10-13')).game;
  assert.equal(half.plots[0].stage, 0.5);
  // la quête des Champs lève d'abord le voile : la journée pousse à plein
  const full = applyEntry(g, reward('2026-10-13', 'champs', 'b'), at('2026-10-13')).game;
  assert.equal(full.plots[0].stage, 1);
});

test('aucun voile après une absence de 48 h ou plus avant l’Avis (résultat « absent »), mais un Avis tenu reste tenu', () => {
  const w = announced({ force: 30 });
  w.game.lastSeenDay = '2026-10-09'; // aucune visite les 10 et 11
  const s = step(w, advanceTime, {}, at('2026-10-14')); // retour deux jours après l'Avis
  assert.equal(s.r.events.find((e) => e.type === 'avis-resolu').result, 'absent');
  assert.deepEqual(s.world.game.avis.veils, []);
  assert.deepEqual(s.r.entries, []);
  const held = announced({ force: 8 });
  held.game.lastSeenDay = '2026-10-01';
  assert.equal(step(held, advanceTime, {}, at('2026-10-14')).world.game.avis.history[0].result, 'tenu');
});

test('advanceTime note le jour de présence, une fois par jour', () => {
  const w = ch2();
  const s = step(w, advanceTime, {}, at('2026-10-03'));
  assert.equal(s.world.game.lastSeenDay, '2026-10-03');
  assert.deepEqual(step(s.world, advanceTime, {}, at('2026-10-03', 22)).r.ops, []);
});
