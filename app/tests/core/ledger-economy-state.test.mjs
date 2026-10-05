import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rewardKey, stepKey, reverseKey, bonusKey, hasKey, findEntry, dayTotals, buildRewardEntry, buildStepEntry,
  stepsPaid, occurrenceEntries, canReverse, buildReverseEntry, buildBonusEntry, buildAjoutRefund, BONUSES,
  stageForLueur, stageName, raiseCap, applyEntry, applyEntries, directFilLibre, chapterStatus, advanceChapter,
  CAP_STEPS, createInitialState, migrateState, STATE_VERSION,
} from '../../core/index.js';
import { T0, task, plusHours } from './helpers.mjs';

const entry = (over = {}) => ({
  key: 'reward:t1:1', at: T0, day: '2026-10-06', type: 'reward', taskId: 't1', occurrence: 1,
  pe: 10, energy: 3, materials: 5, lueur: { sector: 'atelier', amount: 7.5 }, filLibre: 2.5, ...over,
});

test('clés du registre', () => {
  assert.equal(rewardKey('a', 2), 'reward:a:2');
  assert.equal(stepKey('a', 2, 's1'), 'step:a:2:s1');
  assert.equal(reverseKey('a', 2), 'reverse:a:2');
  assert.equal(bonusKey('plan', '2026-10-06'), 'bonus:plan:2026-10-06');
  assert.equal(bonusKey('ajout', '2026-10-06', 2), 'bonus:ajout:2026-10-06:2');
});

test('hasKey et findEntry', () => {
  const l = [entry()];
  assert.equal(hasKey(l, 'reward:t1:1'), true);
  assert.equal(hasKey(l, 'reward:t1:2'), false);
  assert.equal(findEntry(l, 'reward:t1:1').pe, 10);
  assert.equal(findEntry(l, 'x'), null);
});

test('buildRewardEntry : forme complète et refus d’une clé déjà écrite', () => {
  const t = task({ domain: 'Maison' });
  const e = buildRewardEntry({ task: t, occurrence: 1, pe: 20 }, [], T0);
  assert.equal(e.key, 'reward:t1:1');
  assert.equal(e.type, 'reward');
  assert.equal(e.day, '2026-10-06');
  assert.equal(e.at, '2026-10-06T14:00:00.000Z');
  assert.deepEqual(e.lueur, { sector: 'atelier', amount: 15 });
  assert.equal(e.filLibre, 5);
  assert.equal(e.energy, 6);
  assert.equal(e.materials, 10);
  assert.equal(buildRewardEntry({ task: t, occurrence: 1, pe: 20 }, [e], T0), null);
  assert.notEqual(buildRewardEntry({ task: t, occurrence: 2, pe: 20 }, [e], T0), null);
});

test('buildRewardEntry : le plafond quotidien compte les PE déjà gagnés', () => {
  const t = task();
  const premier = buildRewardEntry({ task: { ...t, id: 'a' }, occurrence: 1, pe: 45 }, [], T0);
  const second = buildRewardEntry({ task: { ...t, id: 'b' }, occurrence: 1, pe: 10 }, [premier], T0);
  assert.equal(second.energy, 1.5); // 10 PE à 50 % × 0,3
});

test('buildRewardEntry « Déjà faite » : 50 % à partir de la 4e du jour', () => {
  let ledger = [];
  const pes = [];
  for (let i = 0; i < 5; i++) {
    const e = buildRewardEntry({ task: task({ id: 'd' + i }), occurrence: 1, pe: 10, alreadyDone: true }, ledger, T0);
    ledger = [...ledger, e];
    pes.push(e.pe);
    assert.equal(e.alreadyDone, true);
  }
  assert.deepEqual(pes, [10, 10, 10, 5, 5]);
});

test('buildStepEntry et stepsPaid', () => {
  const t = task();
  const s1 = buildStepEntry({ task: t, occurrence: 1, stepId: 's1', pe: 2 }, [], T0);
  assert.equal(s1.key, 'step:t1:1:s1');
  assert.equal(s1.stepId, 's1');
  assert.equal(buildStepEntry({ task: t, occurrence: 1, stepId: 's1', pe: 2 }, [s1], T0), null);
  const s2 = buildStepEntry({ task: t, occurrence: 1, stepId: 's2', pe: 3 }, [s1], T0);
  assert.equal(stepsPaid([s1, s2], 't1', 1), 5);
  assert.equal(stepsPaid([s1, s2], 't1', 2), 0);
  assert.equal(occurrenceEntries([s1, s2, entry()], 't1', 1).length, 3);
});

test('dayTotals : PE, ⚡, ▣, Déjà faite, bonus', () => {
  const l = [entry(), entry({ key: 'reward:t2:1', alreadyDone: true, taskId: 't2' }),
    entry({ key: 'bonus:plan:2026-10-06', type: 'bonus', bonus: 'plan', pe: 0, energy: 2, materials: 0, filLibre: 0 }),
    entry({ key: 'old', day: '2026-10-05' })];
  const d = dayTotals(l, '2026-10-06');
  assert.equal(d.pe, 20);
  assert.equal(d.energy, 8);
  assert.equal(d.alreadyDone, 1);
  assert.equal(d.rewards, 2);
  assert.equal(d.bonusEnergy, 2);
  assert.equal(d.bonusCount.plan, 1);
  assert.equal(dayTotals([], '2026-10-06').pe, 0);
});

test('remballer : annule en 24 h, pas après, pas deux fois', () => {
  const t = task();
  const r = buildRewardEntry({ task: t, occurrence: 1, pe: 20 }, [], T0);
  const s = buildStepEntry({ task: t, occurrence: 1, stepId: 's1', pe: 2 }, [r], T0);
  const ledger = [s, r];
  assert.equal(canReverse(ledger, 't1', 1, plusHours(T0, 23)), true);
  assert.equal(canReverse(ledger, 't1', 1, plusHours(T0, 24)), false);
  assert.equal(canReverse([], 't1', 1, T0), false);
  const rev = buildReverseEntry(ledger, 't1', 1, plusHours(T0, 2));
  assert.equal(rev.key, 'reverse:t1:1');
  assert.equal(rev.type, 'reverse');
  assert.equal(rev.pe, -22);
  assert.equal(rev.energy, -(r.energy + s.energy));
  assert.equal(rev.lueur.amount, -(r.lueur.amount + s.lueur.amount));
  assert.equal(rev.day, r.day);
  assert.equal(canReverse([...ledger, rev], 't1', 1, plusHours(T0, 3)), false);
  assert.equal(buildReverseEntry([...ledger, rev], 't1', 1, T0), null);
  assert.equal(buildReverseEntry([], 't1', 1, T0), null);
});

test('bonus hors tâches : montants, plafond par type, plafond de 5 ⚡, hors plafond pour retour et bon fil', () => {
  assert.equal(BONUSES.retour.energy, 10);
  let l = [];
  const give = (type) => { const e = buildBonusEntry(type, l, T0); if (e) l = [...l, e]; return e; };
  assert.equal(give('ouverture').energy, 1);
  assert.equal(give('ouverture'), null); // une fois par jour
  assert.equal(give('plan').energy, 2);
  assert.equal(give('plan-honore').energy, 2);
  assert.equal(give('ajout'), null); // 5 + 1 > 5
  assert.equal(give('retour').energy, 10); // hors plafond
  assert.equal(give('bon-fil').energy, 2); // hors plafond
  assert.equal(give('bon-fil'), null);
  assert.throws(() => buildBonusEntry('inconnu', l, T0));
});

test('bonus « ajout complet » : deux par jour, clés numérotées', () => {
  let l = [];
  const a = buildBonusEntry('ajout', l, T0, { taskId: 'x' }); l = [...l, a];
  const b = buildBonusEntry('ajout', l, T0, { taskId: 'y' }); l = [...l, b];
  assert.equal(a.key, 'bonus:ajout:2026-10-06:1');
  assert.equal(b.key, 'bonus:ajout:2026-10-06:2');
  assert.equal(buildBonusEntry('ajout', l, T0, { taskId: 'z' }), null);
});

test('reprise du bonus d’ajout si supprimée dans les 24 h', () => {
  const a = buildBonusEntry('ajout', [], T0, { taskId: 'x' });
  const r = buildAjoutRefund([a], 'x', plusHours(T0, 5));
  assert.equal(r.energy, -1);
  assert.equal(buildAjoutRefund([a], 'x', plusHours(T0, 25)), null);
  assert.equal(buildAjoutRefund([a], 'autre', T0), null);
  assert.equal(buildAjoutRefund([a, r], 'x', T0), null);
});

// ---- économie ----

test('seuils de secteur : Réparer 150, Prospérer 400, Autonome 750', () => {
  assert.deepEqual([0, 149, 150, 399, 400, 749, 750, 2000].map(stageForLueur), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.equal(stageName(1), 'reparer');
  assert.equal(stageName(3), 'autonome');
  assert.equal(stageName(0), 'eteint');
});

test('plafonds de stock : ⚡ 40 → 60 → 90, ▣ 150 → 250', () => {
  let g = createInitialState(T0);
  assert.deepEqual(g.caps, { energy: 40, materials: 150 });
  g = raiseCap(g, 'energy');
  assert.equal(g.caps.energy, 60);
  g = raiseCap(g, 'energy');
  assert.equal(g.caps.energy, 90);
  assert.equal(raiseCap(g, 'energy'), g);
  assert.equal(raiseCap(g, 'materials').caps.materials, 250);
  assert.deepEqual(CAP_STEPS.materials, [150, 250]);
  assert.throws(() => raiseCap(g, 'or'));
});

test('applyEntry : ajoute ressources, Lueur et Fil libre sans modifier l’état d’entrée', () => {
  const g0 = createInitialState(T0);
  const copy = structuredClone(g0);
  const { game } = applyEntry(g0, entry(), T0);
  assert.deepEqual(g0, copy);
  assert.equal(game.resources.energy, 13);
  assert.equal(game.resources.materials, 20);
  assert.equal(game.lueur.atelier, 7.5);
  assert.equal(game.filLibre, 2.5);
});

test('surplus au plafond vers le Fil libre à 2 pour 1', () => {
  let g = createInitialState(T0);
  g.resources.energy = 38;
  const { game, events } = applyEntry(g, entry({ type: 'bonus', energy: 6, materials: 0, pe: 0, lueur: { sector: 'place', amount: 0 }, filLibre: 0 }), T0);
  assert.equal(game.resources.energy, 40);
  assert.equal(game.filLibre, 2); // 4 de surplus → 2 de Fil libre
  assert.deepEqual(events.find((e) => e.type === 'surplus'), { type: 'surplus', energy: 4, materials: 0, filLibre: 2 });
  g.resources.materials = 149;
  const r = applyEntry(g, entry({ type: 'bonus', energy: 0, materials: 5, pe: 0, lueur: { sector: 'place', amount: 0 }, filLibre: 0 }), T0);
  assert.equal(r.game.resources.materials, 150);
  assert.equal(r.game.filLibre, 2);
});

test('une écriture inverse ne fait jamais passer un stock sous zéro', () => {
  const g = createInitialState(T0);
  const { game } = applyEntry(g, entry({ type: 'reverse', pe: -50, energy: -50, materials: -50, lueur: { sector: 'atelier', amount: -50 }, filLibre: -50 }), T0);
  assert.equal(game.resources.energy, 0);
  assert.equal(game.resources.materials, 0);
  assert.equal(game.lueur.atelier, 0);
  assert.equal(game.filLibre, 0);
});

test('Confiance : +1 par jour avec une quête (la lisière s’allume une fois), +1 par semaine tenue à 4 jours', () => {
  let g = createInitialState('2026-10-05T14:00:00Z'); // lundi
  const days = ['2026-10-05T14:00:00Z', '2026-10-06T14:00:00Z', '2026-10-07T14:00:00Z', '2026-10-08T14:00:00Z'];
  const evs = [];
  days.forEach((d, i) => {
    const r = applyEntries(g, [entry({ key: 'k' + i, taskId: 'x' + i }), entry({ key: 'kk' + i, taskId: 'y' + i })], d);
    g = r.game;
    evs.push(...r.events);
  });
  assert.equal(evs.filter((e) => e.type === 'lisiere-allumee').length, 4);
  assert.equal(evs.filter((e) => e.type === 'semaine-tenue').length, 1);
  assert.equal(g.resources.confidence, 5); // 4 jours + 1 semaine tenue
  assert.equal(g.lisiereDays.length, 4);
  // un 5e jour de la même semaine ne redonne pas la semaine
  const r = applyEntry(g, entry({ key: 'k9', taskId: 'z' }), '2026-10-09T14:00:00Z');
  assert.equal(r.game.resources.confidence, 6);
});

test('la lisière arrose les cultures : un stade par jour allumé', () => {
  const g = createInitialState(T0);
  g.plots = [{ id: 'p1', crop: 'courge', stage: 0 }, { id: 'p2', crop: 'ble', stage: 3 }];
  const r1 = applyEntry(g, entry(), T0);
  assert.deepEqual(r1.game.plots.map((p) => p.stage), [1, 4]);
  const r2 = applyEntry(r1.game, entry({ key: 'autre', taskId: 'q' }), T0); // même jour : rien
  assert.deepEqual(r2.game.plots.map((p) => p.stage), [1, 4]);
});

test('seuil de secteur franchi : événement, stade conservé', () => {
  const g = createInitialState(T0);
  const { game, events } = applyEntry(g, entry({ key: 'a', type: 'bonus', lueur: { sector: 'champs', amount: 160 }, filLibre: 0 }), T0);
  assert.deepEqual(events.filter((e) => e.type === 'secteur-seuil'), [{ type: 'secteur-seuil', sector: 'champs', stage: 'reparer' }]);
  assert.equal(game.sectors.champs.stage, 1);
  // une écriture inverse ne fait jamais perdre un stade
  const r = applyEntry(game, entry({ key: 'b', type: 'reverse', pe: 0, energy: 0, materials: 0, lueur: { sector: 'champs', amount: -100 }, filLibre: 0 }), T0);
  assert.equal(r.game.sectors.champs.stage, 1);
});

test('la Lueur d’un secteur fermé reste sous la cendre et perce d’un coup à l’ouverture', () => {
  let g = createInitialState(T0);
  const r = applyEntry(g, entry({ key: 'a', type: 'bonus', lueur: { sector: 'archives', amount: 420 }, filLibre: 0 }), T0);
  assert.equal(r.game.sectors.archives.stage, 0);
  assert.equal(r.events.some((e) => e.type === 'secteur-seuil' && e.sector === 'archives'), false);
  g = r.game;
  g.chapter = { number: 2, startDay: '2026-09-20', objectives: {} };
  g.resources.confidence = 9;
  const open = advanceChapter(g, T0);
  const seuils = open.events.filter((e) => e.type === 'secteur-seuil' && e.sector === 'archives');
  assert.deepEqual(seuils.map((e) => e.stage), ['reparer', 'prosperer']);
  assert.equal(open.game.sectors.archives.open, true);
  assert.equal(open.game.sectors.archives.stage, 2);
});

test('directFilLibre : du Fil libre vers la Lueur d’un secteur', () => {
  let g = createInitialState(T0);
  g.filLibre = 200;
  const r = directFilLibre(g, 'relais', 160);
  assert.equal(r.game.filLibre, 40);
  assert.equal(r.game.lueur.relais, 160);
  assert.equal(r.game.sectors.relais.stage, 0); // fermé
  assert.throws(() => directFilLibre(g, 'relais', 300));
  assert.throws(() => directFilLibre(g, 'nulle-part', 10));
  const champs = directFilLibre(g, 'champs', 160);
  assert.deepEqual(champs.events.map((e) => e.stage), ['reparer']);
});

test('le chapitre 1 ne se termine pas avant le jour 3', () => {
  const g = createInitialState('2026-10-06T14:00:00Z');
  g.resources.confidence = 3;
  assert.equal(chapterStatus(g, '2026-10-06T14:00:00Z').canAdvance, false); // jour 1
  assert.equal(chapterStatus(g, '2026-10-07T14:00:00Z').canAdvance, false); // jour 2
  assert.equal(chapterStatus(g, '2026-10-08T14:00:00Z').canAdvance, true); // jour 3
  assert.throws(() => advanceChapter(g, '2026-10-07T14:00:00Z'));
  g.resources.confidence = 2;
  assert.equal(chapterStatus(g, '2026-10-20T14:00:00Z').canAdvance, false); // Confiance 3 requise
});

test('chapitre suivant : +2 Confiance, secteur ouvert, jours minimum de 12', () => {
  const g = createInitialState('2026-10-06T14:00:00Z');
  g.resources.confidence = 3;
  const { game, events } = advanceChapter(g, '2026-10-08T14:00:00Z');
  assert.equal(game.chapter.number, 2);
  assert.equal(game.chapter.startDay, '2026-10-08');
  assert.equal(game.resources.confidence, 5);
  assert.equal(game.sectors.atelier.open, true);
  assert.equal(game.sectors.archives.open, false);
  assert.deepEqual(events[0], { type: 'chapitre', chapter: 2 });
  const st = chapterStatus({ ...game, resources: { ...game.resources, confidence: 9 } }, '2026-10-18T14:00:00Z');
  assert.equal(st.minDays, 12);
  assert.equal(st.canAdvance, false);
  assert.equal(chapterStatus({ ...game, resources: { ...game.resources, confidence: 9 } }, '2026-10-19T14:00:00Z').canAdvance, true);
});

test('le chapitre 8 est le dernier', () => {
  const g = createInitialState(T0);
  g.chapter = { number: 8, startDay: '2026-01-01', objectives: {} };
  g.resources.confidence = 999;
  const st = chapterStatus(g, T0);
  assert.equal(st.canAdvance, false);
  assert.equal(st.needed, null);
});

// ---- état ----

test('createInitialState : départ 10 ⚡ / 15 ▣ / 0 Confiance, Champs et Place ouverts', () => {
  const g = createInitialState(T0);
  assert.equal(g.version, STATE_VERSION);
  assert.deepEqual(g.resources, { energy: 10, materials: 15, confidence: 0 });
  assert.equal(g.startDay, '2026-10-06');
  assert.equal(g.chapter.number, 1);
  assert.deepEqual(Object.entries(g.sectors).filter(([, s]) => s.open).map(([id]) => id).sort(), ['champs', 'place']);
  assert.equal(g.filLibre, 0);
  assert.deepEqual(g.lisiereDays, []);
});

test('migrateState complète les clés manquantes et garde tout le reste', () => {
  const raw = { version: 1, resources: { energy: 33 }, lueur: { champs: 12 }, inconnu: { a: 1 }, lisiereDays: ['2026-10-01'], plots: [{ id: 'p', crop: 'ble', stage: 2, extra: true }], startDay: '2026-09-01' };
  const m = migrateState(raw, T0);
  assert.equal(m.resources.energy, 33);
  assert.equal(m.resources.materials, 15);
  assert.equal(m.lueur.champs, 12);
  assert.equal(m.lueur.atelier, 0);
  assert.deepEqual(m.inconnu, { a: 1 });
  assert.deepEqual(m.lisiereDays, ['2026-10-01']);
  assert.deepEqual(m.plots, [{ id: 'p', crop: 'ble', stage: 2, extra: true }]);
  assert.equal(m.startDay, '2026-09-01');
  assert.equal(m.caps.energy, 40);
  assert.deepEqual(migrateState(m, T0), m);
  assert.equal(raw.caps, undefined);
});

test('migrateState d’un état vide ou absent repart de l’état initial', () => {
  assert.deepEqual(migrateState(null, T0), createInitialState(T0));
  assert.deepEqual(migrateState(undefined, T0), createInitialState(T0));
});
