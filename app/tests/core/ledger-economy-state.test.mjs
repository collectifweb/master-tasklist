import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hydrateLedger, unknownStepsCount, rewardKey, stepKey, reverseKey, bonusKey, hasKey, findEntry, dayTotals, buildRewardEntry, buildStepEntry,
  stepsPaid, occurrenceEntries, canReverse, buildReverseEntry, buildBonusEntry, buildAjoutRefund, BONUSES, quartierOfEntry,
  applyEntry, applyEntries, createInitialState, migrateState, STATE_VERSION, START_RESOURCES, QUARTIER_IDS,
} from '../../core/index.js';
import { T0, task, plusHours } from './helpers.mjs';

const entry = (over = {}) => ({
  key: 'reward:t1:1', at: T0, day: '2026-10-06', type: 'reward', taskId: 't1', occurrence: 1,
  pe: 10, energy: 3, materials: 5, quartier: 'atelier', ...over,
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

test('buildRewardEntry : forme complète (le quartier au lieu de la Lueur) et refus d’une clé déjà écrite', () => {
  const t = task({ domain: 'Maison' });
  const e = buildRewardEntry({ task: t, occurrence: 1, pe: 20 }, [], T0);
  assert.equal(e.key, 'reward:t1:1');
  assert.equal(e.type, 'reward');
  assert.equal(e.day, '2026-10-06');
  assert.equal(e.at, '2026-10-06T14:00:00.000Z');
  assert.equal(e.quartier, 'atelier');
  assert.equal('lueur' in e, false);
  assert.equal('filLibre' in e, false);
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
  assert.equal(s1.quartier, 'atelier');
  assert.equal(buildStepEntry({ task: t, occurrence: 1, stepId: 's1', pe: 2 }, [s1], T0), null);
  const s2 = buildStepEntry({ task: t, occurrence: 1, stepId: 's2', pe: 3 }, [s1], T0);
  assert.equal(stepsPaid([s1, s2], 't1', 1), 5);
  assert.equal(stepsPaid([s1, s2], 't1', 2), 0);
  assert.equal(occurrenceEntries([s1, s2, entry()], 't1', 1).length, 3);
});

test('dayTotals : PE, ⚡, ▣, Déjà faite, bonus', () => {
  const l = [entry(), entry({ key: 'reward:t2:1', alreadyDone: true, taskId: 't2' }),
    entry({ key: 'bonus:plan:2026-10-06', type: 'bonus', bonus: 'plan', pe: 0, energy: 2, materials: 0, quartier: undefined }),
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
  assert.equal(rev.quartier, 'atelier');
  assert.equal('lueur' in rev, false);
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
  for (const e of l) assert.deepEqual(['lueur', 'filLibre', 'quartier'].filter((k) => k in e), [], e.key); // hors quartier
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

test('remballer une quête terminée en v1 : l’annulation porte le quartier de l’ancien secteur', () => {
  const v1 = { key: 'reward:t1:1', at: T0, day: '2026-10-06', type: 'reward', taskId: 't1', occurrence: 1, pe: 10, energy: 3, materials: 5, lueur: { sector: 'archives', amount: 7.5 }, filLibre: 2.5 };
  const rev = buildReverseEntry([v1], 't1', 1, plusHours(T0, 1));
  assert.equal(rev.quartier, 'mairie');
  assert.equal(rev.energy, -3);
  assert.equal('lueur' in rev, false);
});

test('quartierOfEntry : quartier (v2), ancien secteur (v1), sinon null', () => {
  assert.equal(quartierOfEntry(entry()), 'atelier');
  assert.equal(quartierOfEntry({ lueur: { sector: 'relais', amount: 4 } }), 'garage');
  assert.equal(quartierOfEntry({ lueur: { sector: 'place', amount: 0 } }), 'place');
  assert.equal(quartierOfEntry({ key: 'reward:vieux:1' }), null); // entrée minimale : la clé seule
  assert.equal(quartierOfEntry(entry({ quartier: 'nulle-part' })), null);
  assert.equal(quartierOfEntry(null), null);
});

// ---- économie ----

test('applyEntry : ajoute Énergie et Matériaux sans modifier l’état d’entrée, sans plafond de stock', () => {
  const g0 = createInitialState(T0);
  const copy = structuredClone(g0);
  const { game } = applyEntry(g0, entry());
  assert.deepEqual(g0, copy);
  assert.deepEqual(game.resources, { energy: 13, materials: 25, food: 5 });
  const riche = { ...g0, resources: { energy: 500, materials: 900, food: 5 } };
  assert.deepEqual(applyEntry(riche, entry({ energy: 7.5, materials: 12.5 })).game.resources, { energy: 507.5, materials: 912.5, food: 5 });
});

test('quartier : +1 tâche par quête payée, rien pour une étape ou un bonus', () => {
  let g = createInitialState(T0);
  g = applyEntry(g, entry()).game;
  assert.equal(g.quartiers.atelier, 1);
  g = applyEntry(g, entry({ key: 'step:t2:1:s1', type: 'step', taskId: 't2', quartier: 'champs' })).game;
  g = applyEntry(g, { key: 'bonus:plan:2026-10-06', type: 'bonus', bonus: 'plan', pe: 0, energy: 2, materials: 0 }).game;
  assert.deepEqual(QUARTIER_IDS.map((id) => g.quartiers[id]), [0, 1, 0, 0, 0, 0]);
});

test('Remballer : −1 tâche au quartier, et une écriture inverse ne fait jamais passer un stock ni un quartier sous zéro', () => {
  let g = applyEntry(createInitialState(T0), entry()).game;
  g = applyEntry(g, entry({ key: 'reverse:t1:1', type: 'reverse', pe: -10, energy: -3, materials: -5, reverses: ['reward:t1:1'] })).game;
  assert.equal(g.quartiers.atelier, 0);
  assert.deepEqual(g.resources, { energy: 10, materials: 20, food: 5 });
  const vide = applyEntry(createInitialState(T0), entry({ key: 'reverse:x:1', type: 'reverse', pe: -50, energy: -50, materials: -50 })).game;
  assert.deepEqual([vide.resources.energy, vide.resources.materials, vide.quartiers.atelier], [0, 0, 0]);
});

test('niveau de quartier gagné : événement quartier-niveau, une seule fois par niveau', () => {
  let g = createInitialState(T0);
  g.quartiers.champs = 4;
  const r = applyEntry(g, entry({ quartier: 'champs' }));
  assert.deepEqual(r.events, [{ type: 'quartier-niveau', quartier: 'champs', niveau: 1 }]);
  assert.deepEqual(applyEntry(r.game, entry({ key: 'reward:t2:1', quartier: 'champs' })).events, []);
  // Remballer redescend sans événement ; la quête suivante regagne le niveau et l'annonce de nouveau
  const bas = applyEntry(r.game, entry({ key: 'reverse:t1:1', type: 'reverse', quartier: 'champs', energy: -3, materials: -5 }));
  assert.deepEqual(bas.events, []);
  assert.equal(bas.game.quartiers.champs, 4);
  assert.deepEqual(applyEntry(bas.game, entry({ key: 'reward:t3:1', quartier: 'champs' })).events, [{ type: 'quartier-niveau', quartier: 'champs', niveau: 1 }]);
});

test('applyEntries enchaîne les entrées et cumule les événements', () => {
  const g = createInitialState(T0);
  g.quartiers.garage = 3;
  const r = applyEntries(g, [entry({ key: 'a', quartier: 'garage' }), entry({ key: 'b', quartier: 'garage' })]);
  assert.equal(r.game.quartiers.garage, 5);
  assert.equal(r.game.resources.energy, 16);
  assert.deepEqual(r.events.map((e) => e.type), ['quartier-niveau']);
});

// ---- état ----

test('createInitialState : partie v2, départ 10 ⚡ / 20 ▣ / 5 Nourriture, 0 habitant, six quartiers à zéro', () => {
  const g = createInitialState(T0);
  assert.equal(g.version, 2);
  assert.equal(STATE_VERSION, 2);
  assert.deepEqual(g.resources, { energy: 10, materials: 20, food: 5 });
  assert.deepEqual(START_RESOURCES, { energy: 10, materials: 20, food: 5 });
  assert.equal(g.habitants, 0);
  assert.deepEqual(g.quartiers, { champs: 0, atelier: 0, mairie: 0, ecole: 0, garage: 0, place: 0 });
  assert.deepEqual([g.batiments, g.parcelles, g.premiersPas, g.bilans], [[], [], {}, []]);
  assert.equal(g.startDay, '2026-10-06');
  assert.deepEqual(g.coteACote, { current: null, totals: [] });
  for (const k of ['lueur', 'filLibre', 'caps', 'chapter', 'sectors', 'avis', 'lisiereDays', 'weeksHeld', 'garden', 'story', 'recentApplied']) {
    assert.equal(k in g, false, k);
  }
  assert.equal('confidence' in g.resources, false);
});

test('migrateState (partie v2) complète les clés manquantes et garde tout le reste', () => {
  const raw = { version: 2, resources: { energy: 33 }, quartiers: { champs: 12 }, inconnu: { a: 1 }, batiments: [{ id: 'chalet-1', extra: true }], startDay: '2026-09-01' };
  const m = migrateState(raw, T0);
  assert.deepEqual(m.resources, { energy: 33, materials: 20, food: 5 });
  assert.equal(m.quartiers.champs, 12);
  assert.equal(m.quartiers.mairie, 0);
  assert.deepEqual(m.inconnu, { a: 1 });
  assert.deepEqual(m.batiments, [{ id: 'chalet-1', extra: true }]);
  assert.equal(m.startDay, '2026-09-01');
  assert.equal(m.habitants, 0);
  assert.deepEqual(migrateState(m, T0), m);
  assert.equal(raw.habitants, undefined);
});

test('migrateState d’un état vide ou absent repart de l’état initial', () => {
  assert.deepEqual(migrateState(null, T0), createInitialState(T0));
  assert.deepEqual(migrateState(undefined, T0), createInitialState(T0));
});

// ---- hydrateLedger et entrées minimales ----

test('hydrateLedger : ajoute { key } pour chaque clé absente du registre récent', () => {
  const recent = [entry()];
  const h = hydrateLedger(recent, ['reward:t1:1', 'reward:vieux:1', 'reward:vieux:1', 'step:vieux:1:s1']);
  assert.deepEqual(h, [entry(), { key: 'reward:vieux:1' }, { key: 'step:vieux:1:s1' }]);
  assert.deepEqual(hydrateLedger(recent, undefined), recent);
  assert.deepEqual(hydrateLedger(undefined, ['a']), [{ key: 'a' }]);
  assert.equal(recent.length, 1);
});

test('entrée minimale : « déjà versé » pour hasKey, jamais dans les totaux du jour', () => {
  const h = hydrateLedger([entry()], ['reward:vieux:1', 'reverse:vieux:1', 'bonus:plan:2026-10-06', 'bonus:ajout:2026-10-06:1']);
  assert.equal(hasKey(h, 'reward:vieux:1'), true);
  assert.deepEqual(dayTotals(h, '2026-10-06'), dayTotals([entry()], '2026-10-06'));
  assert.equal(dayTotals(hydrateLedger([], ['reward:a:1']), '2026-10-06').pe, 0);
});

test('entrée minimale : pas de crash dans canReverse, buildReverseEntry, stepsPaid, remballer', () => {
  const h = hydrateLedger([], ['reward:vieux:1', 'step:vieux:1:s1']);
  assert.equal(canReverse(h, 'vieux', 1, T0), false);
  assert.equal(buildReverseEntry(h, 'vieux', 1, T0), null);
  assert.equal(stepsPaid(h, 'vieux', 1), 0);
  assert.deepEqual(occurrenceEntries(h, 'vieux', 1), []);
  assert.equal(unknownStepsCount(h, 'vieux', 1), 1);
  assert.equal(unknownStepsCount(h, 'vieux', 2), 0);
  assert.equal(unknownStepsCount([entry({ key: 'step:t1:1:s1', type: 'step' })], 't1', 1), 0);
});

test('entrée minimale : le compteur « Déjà faite » et les bonus du jour l’ignorent, les clés existantes bloquent', () => {
  const h = hydrateLedger([], ['reward:x:1', 'bonus:ouverture:2026-10-06']);
  const e = buildRewardEntry({ task: task({ id: 'n' }), occurrence: 1, pe: 10, alreadyDone: true }, h, T0);
  assert.equal(e.pe, 10); // 1re « Déjà faite » du jour : plein tarif
  assert.equal(buildBonusEntry('ouverture', h, T0), null); // la clé du jour existe déjà
  assert.equal(buildRewardEntry({ task: task({ id: 'x' }), occurrence: 1, pe: 10 }, h, T0), null);
  assert.equal(buildAjoutRefund(h, 'x', T0), null);
  assert.equal(buildStepEntry({ task: task({ id: 'x' }), occurrence: 1, stepId: 's1', pe: 1 }, hydrateLedger([], ['step:x:1:s1']), T0), null);
});
