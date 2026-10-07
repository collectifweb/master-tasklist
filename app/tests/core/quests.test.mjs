import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createQuest, updateQuest, addStep, removeStep, toggleStep, completeQuest, reopenQuest,
  remballerQuest, archiveQuest, unarchiveQuest, deleteQuest, claimBonus, openApp, newTaskId,
  questPe, normalizeTask, rewardKey, hydrateLedger,
} from '../../core/index.js';
import { T0, task, fresh, step, plusHours, sum, avantLeChalet } from './helpers.mjs';

const kinds = (r) => r.ops.map((o) => o.type);

test('newTaskId : dérivé de l’instant, jamais deux fois le même', () => {
  const a = newTaskId([], T0);
  assert.match(a, /^q-/);
  assert.notEqual(newTaskId([{ id: a }], T0), a);
  assert.equal(newTaskId([], T0), a);
});

test('createQuest : tâche normalisée, opération task.upsert, aucun gain', () => {
  const w = fresh();
  avantLeChalet(w.game);
  const { world, r } = step(w, createQuest, { task: '  Laver   l’auto ', domain: 'Véhicule', priority: 7, length: 3, difficulty: 2, deadline: '2026-10-10', notes: 'n' }, T0);
  const t = world.tasks[0];
  assert.equal(t.task, 'Laver l’auto');
  assert.equal(t.status, 'todo');
  assert.equal(t.created, '2026-10-06');
  assert.equal(t.deadline, '2026-10-10');
  assert.equal(t.deadlineSetAt, '2026-10-06T14:00:00.000Z');
  assert.deepEqual(kinds(r), ['task.upsert']);
  assert.deepEqual(r.ops[0].task, t);
  assert.deepEqual(r.entries, []);
  assert.deepEqual(normalizeTask(t, T0), t);
  assert.equal(w.tasks.length, 0); // l'entrée n'est pas modifiée
});

test('createQuest : refuse un titre vide, une échéance invalide, trop d’étapes, un id en double', () => {
  const w = fresh([task()]);
  assert.throws(() => createQuest(w.tasks, w.game, w.ledger, { task: '  ' }, T0), /titre/);
  assert.throws(() => createQuest(w.tasks, w.game, w.ledger, { task: 'x', deadline: 'bientôt' }, T0), /échéance/);
  assert.throws(() => createQuest(w.tasks, w.game, w.ledger, { task: 'x', steps: Array(13).fill('a') }, T0), /12/);
  assert.throws(() => createQuest(w.tasks, w.game, w.ledger, { task: 'x', id: 't1' }, T0), /existe/);
  assert.throws(() => createQuest(w.tasks, w.game, w.ledger, { task: 'x', recurrence: { every: 'an', interval: 1 } }, T0), /récurrence/);
});

test('createQuest : étapes et récurrence initialisées', () => {
  const { world } = step(fresh(), createQuest, { task: 'Faire le tour', steps: ['a', 'b'], recurrence: { every: 'week', interval: 1 } });
  const t = world.tasks[0];
  assert.deepEqual(t.steps.map((s) => s.id), ['s1', 's2']);
  assert.equal(t.occurrence, 1);
  assert.equal(t.occurrenceSince, '2026-10-06');
});

test('ajout complet : +1 ⚡, deux fois par jour', () => {
  let w = fresh();
  avantLeChalet(w.game);
  const e = [];
  for (let i = 0; i < 3; i++) {
    const s = step(w, createQuest, { task: 'Quête ' + i, complete: true });
    w = s.world;
    e.push(s.r.entries.length);
  }
  assert.deepEqual(e, [1, 1, 0]);
  assert.equal(w.game.resources.energy, 12);
});

test('supprimer dans les 24 h reprend le bonus d’ajout complet', () => {
  let w = fresh();
  avantLeChalet(w.game);
  const id = 'z1';
  w = step(w, createQuest, { id, task: 'Éphémère', complete: true }).world;
  assert.equal(w.game.resources.energy, 11);
  const s = step(w, deleteQuest, { id }, plusHours(T0, 3));
  assert.deepEqual(kinds(s.r), ['task.delete', 'ledger.append', 'game.set']);
  assert.equal(s.world.game.resources.energy, 10);
  assert.equal(s.world.tasks.length, 0);
  // après 24 h : pas de reprise
  const t = step(w, deleteQuest, { id }, plusHours(T0, 30));
  assert.deepEqual(kinds(t.r), ['task.delete']);
});

test('updateQuest : modifie, borne, repose deadlineSetAt seulement si l’échéance change, ne touche pas aux valeurs figées', () => {
  let w = fresh([task({ deadline: '2026-10-20', deadlineSetAt: '2026-10-01T10:00:00Z', frozen: { priority: 5, length: 2, difficulty: 3, at: T0 } })]);
  let s = step(w, updateQuest, { id: 't1', patch: { priority: 99, task: 'Nouveau titre', notes: 'x' } });
  assert.equal(s.world.tasks[0].priority, 10);
  assert.equal(s.world.tasks[0].task, 'Nouveau titre');
  assert.equal(s.world.tasks[0].deadlineSetAt, '2026-10-01T10:00:00Z');
  assert.equal(s.world.tasks[0].frozen.priority, 5);
  s = step(s.world, updateQuest, { id: 't1', patch: { deadline: '2026-10-25' } });
  assert.equal(s.world.tasks[0].deadlineSetAt, '2026-10-06T14:00:00.000Z');
  s = step(s.world, updateQuest, { id: 't1', patch: { deadline: null } });
  assert.equal(s.world.tasks[0].deadline, null);
  assert.equal(s.world.tasks[0].deadlineSetAt, null);
  s = step(s.world, updateQuest, { id: 't1', patch: { recurrence: { every: 'day', interval: 2 }, domain: 'Jardin' } });
  assert.equal(s.world.tasks[0].occurrence, 1);
  assert.equal(s.world.tasks[0].domain, 'Jardin');
  assert.throws(() => updateQuest(w.tasks, w.game, w.ledger, { id: 'nulle' }, T0), /introuvable/);
});

test('addStep, removeStep : au plus 12 étapes', () => {
  let w = fresh([task()]);
  w = step(w, addStep, { id: 't1', label: 'Une' }).world;
  w = step(w, addStep, { id: 't1', label: 'Deux' }).world;
  assert.deepEqual(w.tasks[0].steps.map((s) => s.id), ['s1', 's2']);
  w = step(w, removeStep, { id: 't1', stepId: 's1' }).world;
  w = step(w, addStep, { id: 't1', label: 'Trois' }).world;
  assert.deepEqual(w.tasks[0].steps.map((s) => s.id), ['s2', 's3']);
  for (let i = 0; i < 10; i++) w = step(w, addStep, { id: 't1', label: 'x' + i }).world;
  assert.equal(w.tasks[0].steps.length, 12);
  assert.throws(() => addStep(w.tasks, w.game, w.ledger, { id: 't1', label: 'de trop' }, T0), /12/);
  assert.throws(() => addStep(w.tasks, w.game, w.ledger, { id: 't1', label: ' ' }, T0));
});

test('toggleStep : une étape paie une seule fois ; le total de la quête reste le même', () => {
  const base = task({ priority: 10, length: 10, difficulty: 10, steps: [1, 2, 3, 4].map((i) => ({ id: 's' + i, label: 'é' + i, done: false })) });
  // sans étapes cochées
  const sans = step(fresh([{ ...base }]), completeQuest, { id: 't1' });
  const totalSans = sum(sans.world.ledger, (e) => e.pe);
  // avec étapes cochées, y compris une étape cochée deux fois
  let w = fresh([{ ...base }]);
  const e1 = step(w, toggleStep, { id: 't1', stepId: 's1' }); w = e1.world;
  assert.equal(e1.r.entries.length, 1);
  assert.equal(e1.r.entries[0].key, 'step:t1:1:s1');
  assert.ok(w.tasks[0].frozen, 'la première étape fige P/L/D');
  w = step(w, toggleStep, { id: 't1', stepId: 's1' }).world; // décochée
  const again = step(w, toggleStep, { id: 't1', stepId: 's1' }); // recochée : 0
  assert.equal(again.r.entries.length, 0);
  w = again.world;
  for (const id of ['s2', 's3', 's4']) w = step(w, toggleStep, { id: 't1', stepId: id }).world;
  const stepsPe = sum(w.ledger, (e) => e.pe);
  assert.ok(Math.abs(stepsPe - 67 * 0.4) < 0.05, 'étapes : ' + stepsPe);
  const fin = step(w, completeQuest, { id: 't1' });
  const total = sum(fin.world.ledger, (e) => e.pe);
  assert.equal(total, totalSans);
  assert.equal(totalSans, 67);
});

test('toggleStep : refus sur une quête terminée ou une étape inconnue', () => {
  const w = fresh([task({ steps: [{ id: 's1', label: 'a', done: false }] }), task({ id: 'd', status: 'done' })]);
  assert.throws(() => toggleStep(w.tasks, w.game, w.ledger, { id: 'd', stepId: 's1' }, T0));
  assert.throws(() => toggleStep(w.tasks, w.game, w.ledger, { id: 't1', stepId: 'zz' }, T0));
});

test('completeQuest : gain, +1 tâche au quartier, opérations pour l’API', () => {
  const w = fresh([task({ priority: 6, length: 1, difficulty: 1 })]);
  avantLeChalet(w.game);
  const { world, r } = step(w, completeQuest, { id: 't1', gameRevision: 7 });
  assert.equal(world.tasks[0].status, 'done');
  assert.equal(world.tasks[0].doneAt, '2026-10-06T14:00:00.000Z');
  assert.deepEqual(kinds(r), ['task.upsert', 'ledger.append', 'game.set']);
  assert.equal(r.ops[2].baseGameRevision, 7);
  assert.equal(r.ops[1].entries[0].key, rewardKey('t1', 1));
  assert.equal(r.entries[0].pe, 3);
  const ev = r.events.find((e) => e.type === 'reward');
  assert.deepEqual({ ...ev }, { type: 'reward', source: 'quete', taskId: 't1', pe: 3, energy: 0.9, materials: 1.5, quartier: 'atelier' });
  assert.equal(world.game.quartiers.atelier, 1);
  assert.deepEqual(world.game.resources, { energy: 10.9, materials: 21.5, food: 5 });
  assert.equal(questPe(world.tasks[0], T0).pe, 3);
});

test('chaque quête payée compte au quartier de son domaine, plusieurs fois le même jour', () => {
  let w = fresh([task({ id: 'a' }), task({ id: 'b' }), task({ id: 'c', domain: 'Ferme' }), task({ id: 'd', domain: 'Personnel' })]);
  for (const id of ['a', 'b', 'c', 'd']) w = step(w, completeQuest, { id }).world;
  assert.deepEqual(w.game.quartiers, { champs: 1, atelier: 2, mairie: 0, ecole: 0, garage: 0, place: 1 });
  assert.deepEqual(w.ledger.filter((e) => e.type === 'reward').map((e) => e.quartier), ['atelier', 'atelier', 'champs', 'place']);
});

test('completeQuest : refuse une quête déjà terminée ou archivée', () => {
  const w = fresh([task({ id: 'd', status: 'done' }), task({ id: 'a', status: 'archived' })]);
  assert.throws(() => completeQuest(w.tasks, w.game, w.ledger, { id: 'd' }, T0), /déjà terminée/);
  assert.throws(() => completeQuest(w.tasks, w.game, w.ledger, { id: 'a' }, T0), /archivée/);
});

test('terminer, rouvrir puis terminer de nouveau rapporte 0', () => {
  let w = fresh([task({ priority: 8, length: 5, difficulty: 4 })]);
  const premier = step(w, completeQuest, { id: 't1' });
  assert.ok(premier.r.entries[0].pe > 0);
  w = premier.world;
  const gameApres = structuredClone(w.game);
  w = step(w, reopenQuest, { id: 't1' }, plusHours(T0, 1)).world;
  assert.equal(w.tasks[0].status, 'todo');
  assert.equal(w.tasks[0].doneAt, null);
  const second = step(w, completeQuest, { id: 't1' }, plusHours(T0, 2));
  assert.deepEqual(second.r.entries, []);
  assert.deepEqual(second.r.events.find((e) => e.type === 'sans-gain'), { type: 'sans-gain', taskId: 't1', reason: 'deja-recompensee' });
  assert.equal(second.world.tasks[0].status, 'done');
  assert.deepEqual(second.world.game.resources, gameApres.resources);
  assert.deepEqual(second.world.game.quartiers, gameApres.quartiers);
  assert.equal(sum(second.world.ledger, (e) => e.pe), premier.r.entries[0].pe);
  assert.ok(!second.r.ops.some((o) => o.type === 'ledger.append'));
  // ... même le lendemain
  const lendemain = step(second.world, reopenQuest, { id: 't1' }, plusHours(T0, 30));
  const troisieme = step(lendemain.world, completeQuest, { id: 't1' }, plusHours(T0, 31));
  assert.deepEqual(troisieme.r.entries, []);
});

test('remballer dans les 24 h annule le gain', () => {
  let w = fresh([task({ priority: 8, length: 5, difficulty: 4, steps: [{ id: 's1', label: 'a', done: false }] })]);
  avantLeChalet(w.game);
  w = step(w, toggleStep, { id: 't1', stepId: 's1' }).world;
  w = step(w, completeQuest, { id: 't1' }).world;
  assert.ok(sum(w.ledger, (e) => e.pe) > 0);
  const s = step(w, remballerQuest, { id: 't1' }, plusHours(T0, 20));
  assert.equal(s.r.entries.length, 1);
  assert.equal(s.r.entries[0].key, 'reverse:t1:1');
  assert.equal(s.world.tasks[0].status, 'todo');
  assert.equal(s.world.tasks[0].doneAt, null);
  assert.equal(sum(s.world.ledger, (e) => e.pe), 0);
  assert.equal(sum(s.world.ledger, (e) => e.energy), 0);
  assert.deepEqual(s.world.game.resources, { energy: 10, materials: 20, food: 5 });
  assert.equal(s.world.game.quartiers.atelier, 0);
  assert.deepEqual(kinds(s.r), ['task.upsert', 'ledger.append', 'game.set']);
  // terminer à nouveau ensuite rapporte 0
  const refait = step(s.world, completeQuest, { id: 't1' }, plusHours(T0, 21));
  assert.deepEqual(refait.r.entries, []);
  assert.equal(sum(refait.world.ledger, (e) => e.pe), 0);
  // remballer une deuxième fois est refusé
  assert.throws(() => remballerQuest(refait.world.tasks, refait.world.game, refait.world.ledger, { id: 't1' }, plusHours(T0, 22)), /déjà été remballée/);
});

test('remballer : refusé après 24 h, sur une quête non terminée, ou sans gain', () => {
  let w = fresh([task()]);
  assert.throws(() => remballerQuest(w.tasks, w.game, w.ledger, { id: 't1' }, T0), /terminée/);
  w = step(w, completeQuest, { id: 't1' }).world;
  assert.throws(() => remballerQuest(w.tasks, w.game, w.ledger, { id: 't1' }, plusHours(T0, 25)), /Trop tard/);
  const rev = step(w, remballerQuest, { id: 't1' }, plusHours(T0, 1)).world;
  const refait = step(rev, completeQuest, { id: 't1' }, plusHours(T0, 2)).world;
  assert.throws(() => remballerQuest(refait.tasks, refait.game, refait.ledger, { id: 't1' }, plusHours(T0, 3)), /déjà été remballée/);
  const sansGain = fresh([task({ status: 'done' })]);
  assert.throws(() => remballerQuest(sansGain.tasks, sansGain.game, sansGain.ledger, { id: 't1' }, T0), /rien à remballer/);
});

test('reopenQuest : refus si la quête n’est pas terminée', () => {
  const w = fresh([task()]);
  assert.throws(() => reopenQuest(w.tasks, w.game, w.ledger, { id: 't1' }, T0));
});

test('« Déjà faite » : 3 par jour à plein tarif, puis 50 %', () => {
  let w = fresh();
  const pes = [];
  for (let i = 0; i < 5; i++) {
    const s = step(w, createQuest, { task: 'Déjà ' + i, priority: 6, length: 1, difficulty: 1, alreadyDone: true });
    w = s.world;
    pes.push(s.r.entries.find((e) => e.type === 'reward').pe);
    assert.equal(w.tasks[i].status, 'done');
    assert.equal(w.tasks[i].alreadyDone, true);
  }
  assert.deepEqual(pes, [3, 3, 3, 1.5, 1.5]);
  assert.equal(w.game.quartiers.place, 5); // sans domaine : la Place du village
});

test('plafond quotidien dégressif : le gain en ⚡ et ▣ baisse au-delà de 45 PE du jour, la tâche compte toujours', () => {
  let w = fresh([1, 2, 3, 4].map((i) => task({ id: 'g' + i, priority: 10, length: 10, difficulty: 10 })));
  const rewards = [];
  for (let i = 1; i <= 4; i++) {
    const s = step(w, completeQuest, { id: 'g' + i });
    w = s.world;
    rewards.push(s.r.entries[0]);
  }
  assert.deepEqual(rewards.map((e) => e.pe), [67, 67, 67, 67]);
  assert.equal(rewards[0].energy, 16.8); // 45 PE à 100 % + 22 PE à 50 % = 56 × 0,3
  assert.equal(rewards[1].energy, 6.1); // 23 PE à 50 % + 44 PE à 20 % = 20,3 × 0,3 = 6,09, arrondi à 0,1
  assert.equal(rewards[2].energy, 4); // 67 PE à 20 % = 13,4 × 0,3 = 4,02
  assert.equal(rewards[3].energy, 4);
  assert.ok(rewards.every((e) => e.quartier === 'atelier'));
  assert.equal(w.game.quartiers.atelier, 4);
});

test('aucun plafond de stock : tout le gain entre, même avec de grosses réserves', () => {
  const w = fresh([task({ priority: 10, length: 10, difficulty: 10 })]);
  avantLeChalet(w.game);
  w.game.resources = { energy: 400, materials: 900, food: 5 };
  const s = step(w, completeQuest, { id: 't1' }); // 67 PE, dont 56 comptés : +16,8 ⚡ et +28 ▣, plus le « Bon fil » (+2 ⚡)
  assert.deepEqual(s.world.game.resources, { energy: 418.8, materials: 928, food: 5 });
  assert.equal(s.r.events.some((e) => e.type === 'surplus'), false);
});

test('5e tâche d’un quartier : elle compte, mais le quartier ne monte plus tout seul (niveaux achetés par permis)', () => {
  const w = fresh([task({ domain: 'Jardin' })]);
  w.game.quartiers.champs = 4;
  const s = step(w, completeQuest, { id: 't1' });
  assert.equal(s.world.game.quartiers.champs, 5);
  assert.equal(s.world.game.niveaux.champs, 0);
  assert.equal(s.r.events.some((e) => e.type === 'quartier-niveau' || e.type === 'quartier-monte'), false);
});

test('quête longue : plaque datée à la fin', () => {
  const w = fresh([task({ length: 7 }), task({ id: 'c', length: 2 })]);
  assert.ok(step(w, completeQuest, { id: 't1' }).r.events.some((e) => e.type === 'plaque'));
  assert.ok(!step(w, completeQuest, { id: 'c' }).r.events.some((e) => e.type === 'plaque'));
});

test('« Bon fil » : +2 ⚡ pour une quête P ≥ 8 parmi les 3 premières, une fois par jour', () => {
  let w = fresh([task({ id: 'a', priority: 9 }), task({ id: 'b', priority: 9 }), task({ id: 'c', priority: 2 })]);
  const s1 = step(w, completeQuest, { id: 'a' });
  assert.ok(s1.r.entries.some((e) => e.bonus === 'bon-fil'));
  const s2 = step(s1.world, completeQuest, { id: 'b' });
  assert.ok(!s2.r.entries.some((e) => e.bonus === 'bon-fil'));
  const s3 = step(fresh([task({ id: 'c', priority: 2 })]), completeQuest, { id: 'c' });
  assert.ok(!s3.r.entries.some((e) => e.bonus === 'bon-fil'));
});

test('récurrence : une seule occurrence active, payée plein tarif, une clé par occurrence', () => {
  let w = fresh([task({ priority: 6, length: 1, difficulty: 1, recurrence: { every: 'week', interval: 1 }, occurrence: 1, occurrenceSince: '2026-10-06', deadline: '2026-10-06', deadlineSetAt: '2026-10-01T10:00:00Z' })]);
  const s1 = step(w, completeQuest, { id: 't1' });
  assert.equal(s1.world.tasks.length, 1);
  const t = s1.world.tasks[0];
  assert.equal(t.status, 'todo');
  assert.equal(t.occurrence, 2);
  assert.equal(t.deadline, '2026-10-13');
  assert.equal(t.occurrenceSince, '2026-10-06');
  assert.equal(t.frozen, null);
  assert.equal(s1.r.entries[0].key, 'reward:t1:1');
  const s2 = step(s1.world, completeQuest, { id: 't1' }, plusHours(T0, 24 * 7));
  assert.equal(s2.r.entries[0].key, 'reward:t1:2');
  assert.equal(s2.r.entries[0].pe, 3);
  assert.equal(s2.world.tasks[0].occurrence, 3);
});

test('récurrence : prochaine échéance toujours dans le futur (jour, mois), étapes remises à zéro', () => {
  const rec = (every, interval, deadline) => task({ recurrence: { every, interval }, occurrence: 1, deadline, steps: [{ id: 's1', label: 'a', done: true, doneAt: T0 }] });
  const next = (t) => step(fresh([t]), completeQuest, { id: 't1' }).world.tasks[0];
  assert.equal(next(rec('day', 1, '2026-10-01')).deadline, '2026-10-07'); // en retard : saute jusqu'à demain
  assert.equal(next(rec('month', 1, '2026-09-30')).deadline, '2026-10-30');
  assert.equal(next(rec('day', 3, null)).deadline, '2026-10-09');
  assert.equal(next(rec('week', 2, '2026-10-06')).deadline, '2026-10-20');
  assert.equal(next(rec('day', 1, null)).steps[0].done, false);
});

test('remballer une quête récurrente rétablit l’occurrence', () => {
  const dep = task({ priority: 6, length: 1, difficulty: 1, recurrence: { every: 'week', interval: 1 }, occurrence: 1, deadline: '2026-10-06', occurrenceSince: '2026-09-01' });
  let w = fresh([dep]);
  w = step(w, completeQuest, { id: 't1' }).world;
  const s = step(w, remballerQuest, { id: 't1' }, plusHours(T0, 1));
  const t = s.world.tasks[0];
  assert.equal(t.occurrence, 1);
  assert.equal(t.deadline, '2026-10-06');
  assert.equal(t.occurrenceSince, '2026-09-01');
  assert.equal(t.lastDone, null);
  assert.equal(sum(s.world.ledger, (e) => e.pe), 0);
  const refait = step(s.world, completeQuest, { id: 't1' }, plusHours(T0, 2));
  assert.deepEqual(refait.r.entries, []);
});

test('archiver et sortir des archives ; supprimer', () => {
  let w = fresh([task({ startedAt: T0 })]);
  w = step(w, archiveQuest, { id: 't1' }).world;
  assert.equal(w.tasks[0].status, 'archived');
  assert.equal(w.tasks[0].startedAt, null);
  assert.ok(w.tasks[0].archivedAt);
  w = step(w, unarchiveQuest, { id: 't1' }).world;
  assert.equal(w.tasks[0].status, 'todo');
  assert.equal(w.tasks[0].archivedAt, null);
  assert.throws(() => unarchiveQuest(w.tasks, w.game, w.ledger, { id: 't1' }, T0));
  const d = step(w, deleteQuest, { id: 't1' });
  assert.deepEqual(d.r.ops, [{ type: 'task.delete', id: 't1' }]);
  assert.deepEqual(d.world.tasks, []);
});

test('supprimer une quête terminée ne reprend aucun gain', () => {
  let w = fresh([task()]);
  w = step(w, completeQuest, { id: 't1' }).world;
  const s = step(w, deleteQuest, { id: 't1' }, plusHours(T0, 1));
  assert.deepEqual(s.r.entries, []);
  assert.deepEqual(s.world.game, w.game);
});

test('claimBonus : plan, plan honoré, plafond de 5 ⚡ par jour', () => {
  let w = fresh();
  w = step(w, claimBonus, { type: 'plan' }).world;
  w = step(w, claimBonus, { type: 'plan-honore' }).world;
  assert.equal(w.game.resources.energy, 14);
  const s = step(w, claimBonus, { type: 'plan' }); // déjà pris
  assert.deepEqual(s.r.ops, []);
  w = step(w, claimBonus, { type: 'ajout' }).world;
  assert.equal(w.game.resources.energy, 15);
  assert.deepEqual(step(w, claimBonus, { type: 'ajout' }).r.entries, []); // plafond de 5 ⚡ atteint
});

test('openApp : +1 ⚡ par jour, retour après 3 jours (+10 ⚡) une fois par 14 jours', () => {
  let w = fresh();
  let s = step(w, openApp, {});
  assert.equal(s.world.game.resources.energy, 11);
  assert.equal(s.world.game.lastOpenDay, '2026-10-06');
  assert.deepEqual(step(s.world, openApp, {}, plusHours(T0, 2)).r.ops, []); // même jour
  w = s.world;
  s = step(w, openApp, {}, plusHours(T0, 24 * 2)); // 2 jours : pas de retour
  assert.equal(s.r.entries.length, 1);
  s = step(s.world, openApp, {}, plusHours(T0, 24 * 5 + 1)); // 3 jours plus tard
  assert.equal(s.r.events.find((e) => e.type === 'retour').jours, 3);
  assert.equal(s.world.game.resources.energy, 11 + 1 + 1 + 10);
  assert.equal(s.world.game.lastReturnDay, '2026-10-11');
  s = step(s.world, openApp, {}, plusHours(T0, 24 * 10)); // nouveau retour, mais moins de 14 jours
  assert.equal(s.r.events.some((e) => e.type === 'retour'), false);
  s = step(s.world, openApp, {}, plusHours(T0, 24 * 30));
  assert.equal(s.r.events.some((e) => e.type === 'retour'), true);
});

test('game.set n’est émis que si l’état a changé, et seules task.upsert/delete, ledger.append, game.set existent', () => {
  const w = fresh([task()]);
  const s = step(w, updateQuest, { id: 't1', patch: { notes: 'x' } });
  assert.deepEqual(kinds(s.r), ['task.upsert']);
  const all = step(w, completeQuest, { id: 't1' });
  for (const o of all.r.ops) assert.ok(['task.upsert', 'task.delete', 'ledger.append', 'game.set'].includes(o.type));
});

test('une opération n’efface jamais un champ inconnu de la tâche', () => {
  const t = task({ champInconnu: { x: 1 }, notes: 'garde-moi', deadline: '2026-11-01' });
  let w = fresh([t]);
  w = step(w, completeQuest, { id: 't1' }).world;
  assert.deepEqual(w.tasks[0].champInconnu, { x: 1 });
  assert.equal(w.tasks[0].notes, 'garde-moi');
  assert.equal(w.tasks[0].deadline, '2026-11-01');
});

test('jour de jeu : terminer à 3 h 59 compte pour la veille, à 4 h 00 pour le jour même', () => {
  const avant = step(fresh([task()], '2026-10-06T07:59:00Z'), completeQuest, { id: 't1' }, '2026-10-06T07:59:00Z');
  const apres = step(fresh([task()], '2026-10-06T08:00:00Z'), completeQuest, { id: 't1' }, '2026-10-06T08:00:00Z');
  assert.equal(avant.r.entries[0].day, '2026-10-05');
  assert.equal(apres.r.entries[0].day, '2026-10-06');
});

// ---- opérations minimales sur une tâche existante ----

const upsert = (r) => r.ops.filter((o) => o.type === 'task.upsert').map((o) => o.task);

test('updateQuest n’envoie que les champs modifiés', () => {
  const w = fresh([task({ notes: 'garde', champInconnu: { a: 1 } })]);
  const r = updateQuest(w.tasks, w.game, w.ledger, { id: 't1', patch: { domain: 'Jardin' }, gameRevision: 0 }, T0);
  const [op] = upsert(r);
  assert.deepEqual(Object.keys(op).sort(), ['domain', 'id', 'updatedAt']);
  assert.equal(op.id, 't1');
  assert.equal(op.domain, 'Jardin');
  assert.equal('task' in op, false);
  assert.equal('notes' in op, false);
  // la liste affichée, elle, reste complète
  assert.equal(r.tasks[0].task, 'Changer l’ampoule');
  assert.deepEqual(r.tasks[0].champInconnu, { a: 1 });
});

test('modifier la priorité n’envoie pas le titre', () => {
  const w = fresh([task()]);
  const [op] = upsert(updateQuest(w.tasks, w.game, w.ledger, { id: 't1', patch: { priority: 9 } }, T0));
  assert.deepEqual(Object.keys(op).sort(), ['id', 'priority', 'updatedAt']);
  assert.equal(op.priority, 9);
});

test('terminer une quête envoie status, doneAt, frozen et updatedAt seulement', () => {
  const w = fresh([task()]);
  const [op] = upsert(completeQuest(w.tasks, w.game, w.ledger, { id: 't1', gameRevision: 0 }, T0));
  assert.deepEqual(Object.keys(op).sort(), ['doneAt', 'frozen', 'id', 'status', 'updatedAt']);
});

test('un champ effacé est envoyé à null', () => {
  const w = fresh([task({ deadline: '2026-10-20', deadlineSetAt: '2026-10-01T10:00:00Z' })]);
  const [op] = upsert(updateQuest(w.tasks, w.game, w.ledger, { id: 't1', patch: { deadline: null } }, T0));
  assert.equal(op.deadline, null);
  assert.equal(op.deadlineSetAt, null);
  assert.equal('priority' in op, false);
});

test('comparaison profonde : des étapes inchangées ne sont pas renvoyées', () => {
  const steps = [{ id: 's1', label: 'a', done: false }, { id: 's2', label: 'b', done: false }];
  const w = fresh([task({ steps })]);
  const [a] = upsert(updateQuest(w.tasks, w.game, w.ledger, { id: 't1', patch: { notes: 'x' } }, T0));
  assert.equal('steps' in a, false);
  const [b] = upsert(toggleStep(w.tasks, w.game, w.ledger, { id: 't1', stepId: 's1', gameRevision: 0 }, T0));
  assert.equal(b.steps[0].done, true);
});

test('rien n’a changé : aucune opération, tâche et date intactes', () => {
  const w = fresh([task({ updatedAt: '2026-10-01T00:00:00.000Z' })]);
  const r = updateQuest(w.tasks, w.game, w.ledger, { id: 't1', patch: { priority: 5, task: 'Changer l’ampoule' } }, T0);
  assert.deepEqual(r.ops, []);
  assert.equal(r.tasks[0].updatedAt, '2026-10-01T00:00:00.000Z');
  const s = removeStep(w.tasks, w.game, w.ledger, { id: 't1', stepId: 'inexistante' }, T0);
  assert.equal(s.ops.length, 1); // steps passe de absent à []
});

test('une nouvelle tâche est envoyée en entier ; l’entrée n’est pas modifiée', () => {
  const w = fresh([task()]);
  const avant = structuredClone(w.tasks);
  const r = createQuest(w.tasks, w.game, w.ledger, { task: 'Nouvelle', domain: 'Maison', gameRevision: 0 }, T0);
  const [op] = upsert(r);
  assert.ok(op.task && op.created && op.status && op.priority && op.updatedAt);
  assert.deepEqual(w.tasks, avant);
  // créée puis terminée dans la même opération (« Déjà faite ») : toujours en entier
  const d = createQuest(w.tasks, w.game, w.ledger, { task: 'Déjà', alreadyDone: true, gameRevision: 0 }, T0);
  assert.equal(upsert(d).length, 1);
  assert.equal(upsert(d)[0].status, 'done');
  assert.ok(upsert(d)[0].task);
});

test('remballer une quête récurrente ne renvoie que les champs rétablis', () => {
  const dep = task({ priority: 6, length: 1, difficulty: 1, recurrence: { every: 'week', interval: 1 }, occurrence: 1, deadline: '2026-10-06' });
  let w = fresh([dep]);
  w = step(w, completeQuest, { id: 't1' }).world;
  const r = remballerQuest(w.tasks, w.game, w.ledger, { id: 't1', gameRevision: 0 }, plusHours(T0, 1));
  const [op] = upsert(r);
  assert.equal('task' in op, false);
  assert.equal(op.occurrence, 1);
  assert.equal(op.lastDone, null);
});

// ---- identifiants ----

test('createQuest utilise params.id (UUID de l’interface) ; newTaskId reste le repli', () => {
  const uuid = '3f2b8c1e-5a4d-4c1e-9b7a-0d2e6f8a1b3c';
  const w = fresh();
  avantLeChalet(w.game);
  const a = createQuest(w.tasks, w.game, w.ledger, { id: uuid, task: 'x' }, T0);
  assert.equal(a.tasks[0].id, uuid);
  assert.equal(upsert(a)[0].id, uuid);
  const b = createQuest(w.tasks, w.game, w.ledger, { task: 'x' }, T0);
  assert.equal(b.tasks[0].id, newTaskId([], T0));
});

// ---- registre ancien (entrées minimales) ----

test('registre ancien : une occurrence déjà versée il y a plus de 60 jours rapporte 0 et ne se remballe pas', () => {
  const ledger = hydrateLedger([], ['reward:t1:1']);
  const w = { tasks: [task({ status: 'done' })], game: avantLeChalet(fresh().game), ledger };
  assert.throws(() => remballerQuest(w.tasks, w.game, w.ledger, { id: 't1' }, T0), /Trop tard/);
  const re = step({ ...w, tasks: [task()] }, completeQuest, { id: 't1' });
  assert.deepEqual(re.r.entries, []);
  assert.equal(re.world.tasks[0].status, 'done');
});

test('registre ancien : étapes versées connues par leur clé, la complétion ne les repaie pas', () => {
  const base = task({ priority: 10, length: 10, difficulty: 10, steps: [1, 2, 3, 4].map((i) => ({ id: 's' + i, label: 'é', done: i <= 2 })) });
  const ledger = hydrateLedger([], ['step:t1:1:s1', 'step:t1:1:s2']);
  const r = step({ tasks: [base], game: fresh().game, ledger }, completeQuest, { id: 't1' });
  assert.equal(r.r.entries[0].pe, 53.6); // 67 − 13,4 (2 étapes sur 4 : 2 × 40 % de 67 ÷ 4)
});
