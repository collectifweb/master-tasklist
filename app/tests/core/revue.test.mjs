// Correctifs issus de la relecture indépendante de core/.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createQuest, updateQuest, addStep, removeStep, toggleStep, completeQuest, reopenQuest,
  remballerQuest, archiveQuest, unarchiveQuest, deleteQuest, claimBonus, openApp, newTaskId,
  normalizeTask, normalizeTasks, dayOnly, daysUntil, isValidDay, addMonths, orderByCote, bonusPe, questPe,
  hydrateLedger, cote,
} from '../../core/index.js';
import { T0, task, fresh, step, plusHours, sum, avantLeChalet } from './helpers.mjs';

const upsert = (r) => r.ops.filter((o) => o.type === 'task.upsert').map((o) => o.task);
const refuse = (fn, w, params, now = T0, motif) =>
  assert.throws(() => fn(w.tasks, w.game, w.ledger, { gameRevision: null, ...params }, now), motif);

const hebdo = (over = {}) => task({
  id: 'r1', priority: 6, length: 1, difficulty: 1, deadline: '2026-10-06',
  recurrence: { every: 'week', interval: 1 }, occurrence: 1, ...over,
});

// 1
test('récurrence : « Fait » répété le même jour de jeu est refusé, sans rien payer ni repousser l’échéance', () => {
  let w = fresh([hebdo()]);
  const premier = step(w, completeQuest, { id: 'r1' });
  w = premier.world;
  assert.equal(w.tasks[0].deadline, '2026-10-13');
  for (const h of [0.001, 1, 5]) {
    assert.throws(() => completeQuest(w.tasks, w.game, w.ledger, { id: 'r1', gameRevision: null }, plusHours(T0, h)), /déjà d’être terminée aujourd’hui/);
  }
  assert.equal(w.ledger.filter((e) => e.type === 'reward').length, 1);
  assert.equal(w.tasks[0].occurrence, 2);
});

test('récurrence : terminer avant le début de la période de l’occurrence est refusé ; au début, c’est permis', () => {
  const w = fresh([hebdo({ deadline: '2026-10-20' })]); // période : du 13 au 20 octobre
  avantLeChalet(w.game);
  refuse(completeQuest, w, { id: 'r1' }, T0, /Trop tôt .* 2026-10-13/);
  const ok = step(w, completeQuest, { id: 'r1' }, '2026-10-13T14:00:00Z');
  assert.equal(ok.world.tasks[0].deadline, '2026-10-27');
  assert.equal(ok.r.entries.filter((e) => e.type === 'reward').length, 1);
  // sans échéance : jamais « trop tôt »
  const sans = fresh([hebdo({ deadline: null })]);
  avantLeChalet(sans.game);
  assert.equal(step(sans, completeQuest, { id: 'r1' }).r.entries.length, 1);
});

test('récurrence : après Remballer, on peut terminer de nouveau (rapporte 0) sans être bloqué par « aujourd’hui »', () => {
  let w = fresh([hebdo()]);
  w = step(w, completeQuest, { id: 'r1' }).world;
  w = step(w, remballerQuest, { id: 'r1' }, plusHours(T0, 1)).world;
  const s = step(w, completeQuest, { id: 'r1' }, plusHours(T0, 2));
  assert.deepEqual(s.r.entries, []);
});

// 2
test('récurrence mal formée : intervalle absent = 1, borné de 1 à 365, `every` inconnu = pas de récurrence', () => {
  const next = (rec, extra = {}) => step(fresh([hebdo({ recurrence: rec, deadline: '2026-10-06', ...extra })]), completeQuest, { id: 'r1' }).world.tasks[0];
  assert.equal(next({ every: 'week' }).deadline, '2026-10-13');
  assert.deepEqual(next({ every: 'week' }).recurrence, { every: 'week', interval: 1 });
  assert.equal(next({ every: 'day', interval: 1e9 }).deadline, '2027-10-06'); // 365 jours
  assert.equal(next({ every: 'day', interval: 0 }).deadline, '2026-10-07');
  assert.equal(next({ every: 'day', interval: 'abc' }).deadline, '2026-10-07');
  const inconnue = next({ every: 'weekly', interval: 1 });
  assert.equal(inconnue.status, 'done'); // pas de récurrence : la quête se termine
  assert.equal(inconnue.deadline, '2026-10-06');
});

test('récurrence mal formée : une date calculée invalide refuse tout, sans aucune opération', () => {
  const w = fresh([hebdo({ recurrence: { every: 'month', interval: 1 }, deadline: '9999-12-31' })]);
  refuse(completeQuest, w, { id: 'r1' }, '9999-12-30T14:00:00Z', /échéance de la récurrence est invalide/);
  const r = completeQuest.bind(null, w.tasks, w.game, w.ledger, { id: 'r1', gameRevision: null });
  assert.throws(() => r('9999-12-30T14:00:00Z')); // rien n'est renvoyé : aucune opération possible
  assert.equal(isValidDay('10000-01-31'), false);
  assert.equal(isValidDay('2026-02-30'), false);
  assert.equal(isValidDay('2028-02-29'), true);
});

test('récurrence : à la création et à la modification, un `every` inconnu est refusé et l’intervalle est borné', () => {
  const w = fresh([task()]);
  assert.throws(() => createQuest(w.tasks, w.game, w.ledger, { task: 'x', recurrence: { every: 'an' }, gameRevision: null }, T0), /récurrence/);
  const s = step(w, updateQuest, { id: 't1', patch: { recurrence: { every: 'day', interval: 5000 } } });
  assert.equal(s.world.tasks[0].recurrence.interval, 365);
});

// 3
test('tâche sans id ou à id en double : marquée en lecture seule, jamais ciblée par une opération', () => {
  const brut = [
    { id: 'a', task: 'Première', status: 'todo', created: '2026-10-01' },
    { id: 'a', task: 'Doublon', status: 'todo', created: '2026-10-01' },
    { task: 'Sans identifiant', status: 'todo', created: '2026-10-01' },
    { id: 'b', task: 'Normale', status: 'todo', created: '2026-10-01' },
  ];
  const ts = normalizeTasks(brut, T0);
  assert.deepEqual(ts.map((t) => !!t.readonly), [false, true, true, false]);
  assert.equal(ts[1].id, 'a-2');
  assert.match(ts[2].id, /^m-/);
  assert.equal(normalizeTask(ts[1], T0).readonly, true); // la marque survit à une nouvelle normalisation
  const w = fresh(ts);
  const actions = [
    [updateQuest, { patch: { notes: 'x' } }], [addStep, { label: 'x' }],
    [removeStep, { stepId: 's1' }], [toggleStep, { stepId: 's1' }], [completeQuest, {}], [reopenQuest, {}],
    [remballerQuest, {}], [archiveQuest, {}], [unarchiveQuest, {}], [deleteQuest, {}],
  ];
  for (const id of ['a-2', ts[2].id]) {
    for (const [fn, extra] of actions) refuse(fn, w, { id, ...extra }, T0, /lecture seule/);
  }
  // la tâche saine de la même liste fonctionne, et le champ `readonly` n'est jamais envoyé
  const ok = step(w, updateQuest, { id: 'b', patch: { notes: 'x' } });
  assert.deepEqual(Object.keys(upsert(ok.r)[0]).sort(), ['frozen', 'id', 'notes', 'updatedAt']); // quête de plus de 24 h : gel d'abord
  assert.equal(ok.world.tasks.find((t) => t.id === 'a-2').readonly, true);
  for (const o of ok.r.ops) assert.equal(JSON.stringify(o).includes('readonly'), false);
  const neuve = createQuest(w.tasks, w.game, w.ledger, { task: 'Neuve', gameRevision: null }, T0);
  assert.equal('readonly' in upsert(neuve)[0], false);
});

// 4
test('récurrence mensuelle : le quantième d’origine est gardé (31 → 28 en février → 31 en mars)', () => {
  const dep = hebdo({ recurrence: { every: 'month', interval: 1 }, deadline: '2027-01-31' });
  let w = fresh([dep], '2027-01-31T15:00:00Z');
  const vus = [];
  let now = '2027-01-31T15:00:00Z';
  for (let i = 0; i < 4; i++) {
    w = step(w, completeQuest, { id: 'r1' }, now).world;
    vus.push(w.tasks[0].deadline);
    now = w.tasks[0].deadline + 'T15:00:00Z';
  }
  assert.deepEqual(vus, ['2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
  assert.equal(w.tasks[0].recurrence.day, 31);
  assert.equal(addMonths('2027-02-28', 1, 31), '2027-03-31');
});

test('récurrence mensuelle : le quantième est posé à la création (échéance ou jour courant)', () => {
  const w = fresh();
  const a = step(w, createQuest, { id: 'm', task: 'Mensuelle', deadline: '2026-10-31', recurrence: { every: 'month', interval: 1 } });
  assert.equal(a.world.tasks[0].recurrence.day, 31);
  const b = step(w, createQuest, { id: 'n', task: 'Mensuelle', recurrence: { every: 'month' } });
  assert.equal(b.world.tasks[0].recurrence.day, 6);
});

// 5
test('dates avec heure : on garde les 10 premiers caractères, sans dépendre du fuseau de la machine', () => {
  const tz = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Pacific/Auckland']) {
      process.env.TZ = zone;
      assert.equal(dayOnly('2026-10-06T00:00:00Z'), '2026-10-06', zone);
      assert.equal(dayOnly('2026-10-06T23:59:59-04:00'), '2026-10-06', zone);
      assert.equal(dayOnly('2026-10-06T06:00'), '2026-10-06', zone);
      assert.equal(daysUntil('2026-10-20T00:00:00Z', T0), 14, zone);
      assert.equal(normalizeTask({ id: 'x', task: 'x', created: '2026-10-06T06:00' }, '2026-10-10T14:00:00Z').created, '2026-10-06', zone);
    }
  } finally {
    if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz;
  }
  assert.equal(dayOnly('2026-02-30'), null);
  assert.equal(dayOnly('bientôt'), null);
  assert.equal(dayOnly(null), null);
});

test('dates avec heure : une échéance reçue avec une heure compte pour son jour (Cote, récurrence, création)', () => {
  const t = hebdo({ deadline: '2026-10-06T00:00:00Z' });
  assert.equal(cote({ ...t, deadline: '2026-10-06T00:00:00Z' }, T0), cote({ ...t, deadline: '2026-10-06' }, T0));
  const s = step(fresh([t]), completeQuest, { id: 'r1' });
  assert.equal(s.world.tasks[0].deadline, '2026-10-13');
  const c = step(fresh(), createQuest, { id: 'z', task: 'x', deadline: '2026-10-20T08:00:00Z' });
  assert.equal(c.world.tasks[0].deadline, '2026-10-20');
});

// 6
test('désarchiver une quête terminée la remet à « terminée », pas « à faire »', () => {
  const w = fresh([task({ status: 'done', doneAt: '2026-09-02T12:00:00Z' }), task({ id: 'b' })]);
  let s = step(w, archiveQuest, { id: 't1' });
  s = step(s.world, unarchiveQuest, { id: 't1' });
  assert.equal(s.world.tasks[0].status, 'done');
  assert.equal(s.world.tasks[0].doneAt, '2026-09-02T12:00:00Z');
  const b = step(step(w, archiveQuest, { id: 'b' }).world, unarchiveQuest, { id: 'b' });
  assert.equal(b.world.tasks[1].status, 'todo');
});

// 7
test('gel : modifier P/L/D d’une quête de plus de 24 h fige d’abord les anciennes valeurs, et la fin les paie', () => {
  const w = fresh([task({ id: 'g', priority: 3, length: 2, difficulty: 2, created: '2026-09-26', createdAt: '2026-09-26T14:00:00Z' })]);
  const u = step(w, updateQuest, { id: 'g', patch: { priority: 10, length: 10, difficulty: 10 } });
  assert.deepEqual({ ...u.world.tasks[0].frozen, at: 0 }, { priority: 3, length: 2, difficulty: 2, at: 0 });
  assert.ok(upsert(u.r)[0].frozen);
  const f = step(u.world, completeQuest, { id: 'g' }, plusHours(T0, 0.01));
  assert.equal(f.r.entries.find((e) => e.type === 'reward').pe, 6 + 2 * Math.floor(10 / 14) /* P3 L2 D2 ; ancienneté 10 j : 0 */);
});

test('gel : « Bon fil » lit la priorité gelée, pas la priorité courante', () => {
  const frozen = { priority: 2, length: 3, difficulty: 3, at: T0 };
  const w = fresh([task({ id: 'h', priority: 9, frozen })]);
  const s = step(w, completeQuest, { id: 'h' });
  assert.equal(s.r.entries.some((e) => e.bonus === 'bon-fil'), false);
  const w2 = fresh([task({ id: 'h', priority: 2, frozen: { ...frozen, priority: 9 } })]);
  assert.equal(step(w2, completeQuest, { id: 'h' }).r.entries.some((e) => e.bonus === 'bon-fil'), true);
});

// 8
test('une étape ne paie rien si la quête a déjà été récompensée (même après Remballer)', () => {
  let w = fresh([task({ id: 'e', priority: 7, length: 7, difficulty: 5 })]);
  w = step(w, completeQuest, { id: 'e' }).world;
  w = step(w, remballerQuest, { id: 'e' }, plusHours(T0, 1)).world;
  w = step(w, addStep, { id: 'e', label: 'une' }, plusHours(T0, 1)).world;
  const s = step(w, toggleStep, { id: 'e', stepId: 's1', done: true }, plusHours(T0, 1.1));
  assert.deepEqual(s.r.entries, []);
  assert.equal(s.world.tasks[0].steps[0].done, true); // l'étape se coche quand même
  assert.equal(sum(s.world.ledger, (e) => e.pe), 0);
  // même chose après simple réouverture
  let v = fresh([task({ id: 'e', priority: 7, length: 7, difficulty: 5, steps: [{ id: 's1', label: 'a', done: false }] })]);
  v = step(v, completeQuest, { id: 'e' }).world;
  v = step(v, reopenQuest, { id: 'e' }, plusHours(T0, 1)).world;
  assert.deepEqual(step(v, toggleStep, { id: 'e', stepId: 's1', done: true }, plusHours(T0, 2)).r.entries, []);
});

// 9
test('bonus ×1,2 : il faut 48 h réelles entre la pose de l’échéance et la fin, et finir au plus tard le jour dit', () => {
  const base = { priority: 10, length: 10, difficulty: 10, deadline: '2026-10-10', created: '2026-10-06' };
  const pe = (setAt, now = T0) => questPe(task({ ...base, deadlineSetAt: setAt }), now).pe;
  assert.equal(pe('2026-10-04T14:00:00Z'), 80); // 48 h pile : 67 × 1,2
  assert.equal(pe('2026-10-04T14:00:01Z'), 67); // 47 h 59 min 59 s
  assert.equal(pe('2026-10-06T13:59:00Z'), 67); // posée il y a une minute
  assert.equal(pe('2026-10-04T14:00:00Z', '2026-10-10T20:00:00Z'), 80); // le jour de l'échéance
  assert.equal(pe('2026-10-04T14:00:00Z', '2026-10-11T14:00:00Z'), 67); // après
  assert.equal(bonusPe(task({ ...base }), 25, T0).deadline, 0); // jamais posée : pas de bonus
});

test('bonus ×1,2 : poser une échéance puis terminer aussitôt ne donne rien', () => {
  const w = fresh([task({ id: 'p', priority: 7, length: 7, difficulty: 5, created: '2026-10-06' })]);
  let s = step(w, updateQuest, { id: 'p', patch: { deadline: '2026-10-09' } });
  s = step(s.world, completeQuest, { id: 'p' }, plusHours(T0, 0.01));
  assert.equal(s.r.entries.find((e) => e.type === 'reward').pe, 30); // P7 L7 D5, sans bonus
});

// 10
test('remballer retire la tâche du quartier ; refaite ensuite, elle ne rapporte rien et ne recompte pas', () => {
  let w = fresh([task({ id: 'a' }), task({ id: 'b' })]);
  w = step(w, completeQuest, { id: 'a' }).world;
  w = step(w, completeQuest, { id: 'b' }).world;
  assert.equal(w.game.quartiers.atelier, 2);
  let s = step(w, remballerQuest, { id: 'b' }, plusHours(T0, 0.1));
  assert.equal(s.world.game.quartiers.atelier, 1);
  s = step(s.world, completeQuest, { id: 'b' }, plusHours(T0, 0.2));
  assert.deepEqual(s.r.entries, []);
  assert.equal(s.world.game.quartiers.atelier, 1);
});

// 11
test('claimBonus n’accepte que plan, plan-honore et ajout', () => {
  const w = fresh();
  for (const type of ['retour', 'bon-fil', 'ouverture', 'nimporte']) refuse(claimBonus, w, { type }, T0, /ne se réclame pas/);
  for (const type of ['plan', 'plan-honore', 'ajout']) assert.equal(step(w, claimBonus, { type }).r.entries.length, 1);
});

// 13
test('remballer annule exactement le gain : sans plafond de stock, rien n’est parti ailleurs', () => {
  const w = fresh([task({ id: 's', priority: 10, length: 10, difficulty: 10 })]);
  avantLeChalet(w.game);
  w.game.resources = { energy: 40, materials: 150, food: 5 };
  let s = step(w, completeQuest, { id: 's' });
  assert.deepEqual(s.world.game.resources, { energy: 58.8, materials: 178, food: 5 }); // 67 PE dont 56 comptés : +16,8 ⚡ +28 ▣ et « Bon fil » +2 ⚡
  s = step(s.world, remballerQuest, { id: 's' }, plusHours(T0, 0.1));
  assert.deepEqual(s.world.game.resources, { energy: 40, materials: 150, food: 5 });
  assert.equal(s.world.game.quartiers.atelier, 0);
});

// 14
test('« Déjà faite » : une quête terminée moins de 10 minutes après sa création compte dans le quota', () => {
  let w = fresh();
  const pes = [];
  for (let i = 0; i < 5; i++) {
    const now = plusHours(T0, i * 0.01);
    w = step(w, createQuest, { id: 'n' + i, task: 'Fictive ' + i, priority: 5, length: 3, difficulty: 3 }, now).world;
    const s = step(w, completeQuest, { id: 'n' + i }, plusHours(now, 0.05)); // 3 minutes plus tard
    w = s.world;
    pes.push(s.r.entries.find((e) => e.type === 'reward').pe);
    assert.equal(s.r.entries.find((e) => e.type === 'reward').alreadyDone, true);
  }
  assert.deepEqual(pes, [10, 10, 10, 5, 5]);
});

test('« Déjà faite » : après 10 minutes, la quête est une quête normale', () => {
  const w = step(fresh(), createQuest, { id: 'n', task: 'Fictive', priority: 5, length: 3, difficulty: 3 }).world;
  const s = step(w, completeQuest, { id: 'n' }, plusHours(T0, 11 / 60));
  assert.equal(s.r.entries[0].alreadyDone, undefined);
});

// 15
test('game.set sans gameRevision est refusé ; null est permis ; la valeur est reprise', () => {
  const w = fresh([task()]);
  assert.throws(() => completeQuest(w.tasks, w.game, w.ledger, { id: 't1' }, T0), /gameRevision/);
  assert.throws(() => completeQuest(w.tasks, w.game, w.ledger, { id: 't1', gameRevision: undefined }, T0), /gameRevision/);
  const nul = completeQuest(w.tasks, w.game, w.ledger, { id: 't1', gameRevision: null }, T0);
  assert.equal(nul.ops.find((o) => o.type === 'game.set').baseGameRevision, null);
  const sept = completeQuest(w.tasks, w.game, w.ledger, { id: 't1', gameRevision: 7 }, T0);
  assert.equal(sept.ops.find((o) => o.type === 'game.set').baseGameRevision, 7);
  // pas de game.set, pas d'exigence
  assert.doesNotThrow(() => updateQuest(w.tasks, w.game, w.ledger, { id: 't1', patch: { notes: 'x' } }, T0));
});

// 16
test('mineur : terminer une quête dont la récurrence a été retirée efface lastDone', () => {
  let w = fresh([hebdo()]);
  w = step(w, completeQuest, { id: 'r1' }).world;
  assert.ok(w.tasks[0].lastDone);
  w = step(w, updateQuest, { id: 'r1', patch: { recurrence: null } }, plusHours(T0, 25)).world;
  const s = step(w, completeQuest, { id: 'r1' }, plusHours(T0, 26));
  assert.equal(s.world.tasks[0].lastDone, null);
  assert.equal(upsert(s.r)[0].lastDone, null);
  assert.equal(s.world.tasks[0].status, 'done');
});

test('mineur : un identifiant d’étape n’est jamais réutilisé, même après suppression', () => {
  let w = fresh([task({ id: 'S', steps: [{ id: 's1', label: 'a', done: false }, { id: 's2', label: 'b', done: false }], stepSeq: 2 })]);
  w = step(w, removeStep, { id: 'S', stepId: 's2' }).world;
  w = step(w, addStep, { id: 'S', label: 'neuve' }).world;
  assert.deepEqual(w.tasks[0].steps.map((s) => s.id), ['s1', 's3']);
  w = step(w, removeStep, { id: 'S', stepId: 's3' }).world;
  w = step(w, addStep, { id: 'S', label: 'encore' }).world;
  assert.equal(w.tasks[0].steps[1].id, 's4');
  // sans stepSeq (quête venue d'ailleurs) : le registre empêche aussi la réutilisation
  const ledger = hydrateLedger([], ['step:X:1:s5']);
  const v = { tasks: [task({ id: 'X', steps: [{ id: 's1', label: 'a', done: false }] })], game: fresh().game, ledger };
  assert.equal(step(v, addStep, { id: 'X', label: 'n' }).world.tasks[0].steps[1].id, 's6');
  // à la création
  assert.equal(step(fresh(), createQuest, { id: 'C', task: 'x', steps: ['a', 'b'] }).world.tasks[0].stepSeq, 2);
});

test('mineur : le statut est lu sans tenir compte de la casse', () => {
  assert.equal(normalizeTask({ id: 'u', task: 'x', status: 'Done' }, T0).status, 'done');
  assert.equal(normalizeTask({ id: 'u', task: 'x', status: ' ARCHIVED ' }, T0).status, 'archived');
  assert.equal(normalizeTask({ id: 'u', task: 'x', status: 'bizarre' }, T0).status, 'todo');
  assert.equal(normalizeTask({ id: 'u', task: 'x' }, T0).status, 'todo');
});

test('mineur : newTaskId reste un texte exact, sans dépassement de 2^53', () => {
  const id = newTaskId([], '2026-10-06T14:00:00.123Z');
  assert.equal(id, 'q-' + BigInt('20261006140000123').toString(36));
  assert.notEqual(newTaskId([], '2026-10-06T14:00:00.123Z'), newTaskId([], '2026-10-06T14:00:00.124Z'));
  assert.equal(BigInt('20261006140000123') > BigInt(Number.MAX_SAFE_INTEGER), true);
});

test('tri : une quête de priorité 8 ou plus reste dans les 3 premières, même devant des quêtes à forte Cote', () => {
  const ts = [
    task({ id: 'p1', priority: 2 }),
    task({ id: 'p2', priority: 2 }),
    task({ id: 'p3', priority: 2 }),
    ...[1, 2, 3, 4].map((i) => task({ id: 'u' + i, priority: 3, length: 1, difficulty: 1, deadline: '2026-09-20' })),
    task({ id: 'hi', priority: 9, length: 10, difficulty: 10 }),
  ];
  const ordre = orderByCote(ts, T0).map((t) => t.id);
  const rang = ordre.indexOf('hi');
  assert.ok(rang >= 0 && rang <= 2, 'rang : ' + rang);
});
