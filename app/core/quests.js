// Opérations métier sur les quêtes. Fonctions pures : (tasks, game, ledger, params, now) →
// { tasks, game, ops, entries, events }.
//   tasks   : la liste à afficher après l'opération
//   game    : l'état du jeu après l'opération
//   ops     : opérations à envoyer telles quelles à l'API (task.upsert, task.delete, ledger.append, game.set)
//   entries : nouvelles entrées du registre (déjà dans ops)
//   events  : événements pour l'interface (reward, lisiere-allumee, secteur-seuil, etape, plaque…)
// `params.gameRevision` (facultatif) est repris dans game.set comme `baseGameRevision`.
// Un champ qu'on vide est écrit `null` (l'API conserve les champs absents).
import { gameDay, toISO, addDays, addMonths, dayOf, isDayString, daysBetween } from './time.js';
import { clampScale } from './migrate.js';
import { orderByCote } from './cote.js';
import { applyFreeze, freezeValues, questPe, stepPe, completionPe, MAX_STEPS } from './reward.js';
import {
  buildRewardEntry, buildStepEntry, buildReverseEntry, buildBonusEntry, buildAjoutRefund,
  canReverse, stepsPaid, hasKey, rewardKey, reverseKey, findEntry,
} from './ledger.js';
import { applyEntry } from './economy.js';

const RECURRENCE_EVERY = ['day', 'week', 'month'];

class Ctx {
  constructor(tasks, game, ledger, params, now) {
    this.now = now;
    this.iso = toISO(now);
    this.day = gameDay(now);
    this.params = params || {};
    this.tasks = tasks.map((t) => ({ ...t }));
    this.game0 = JSON.stringify(game);
    this.game = game;
    this.ledger = [...ledger];
    this.entries = [];
    this.events = [];
    this.changed = new Map();
    this.deleted = [];
  }
  get(id) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) throw new Error('Quête introuvable.');
    return t;
  }
  put(task) {
    const t = { ...task, updatedAt: this.iso };
    const i = this.tasks.findIndex((x) => x.id === t.id);
    if (i >= 0) this.tasks[i] = t; else this.tasks.push(t);
    this.changed.set(t.id, t);
    return t;
  }
  remove(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.changed.delete(id);
    this.deleted.push(id);
  }
  append(entry, source, extra = {}) {
    this.entries.push(entry);
    this.ledger.push(entry);
    if (entry.type !== 'reverse' && (entry.pe > 0 || entry.energy > 0 || entry.materials > 0)) {
      this.events.push({
        type: 'reward', source, taskId: entry.taskId ?? null,
        pe: entry.pe, energy: entry.energy, materials: entry.materials,
        lueur: entry.lueur ? entry.lueur.amount : 0, filLibre: entry.filLibre, sector: entry.lueur ? entry.lueur.sector : null,
        ...extra,
      });
    }
    const r = applyEntry(this.game, entry, this.now);
    this.game = r.game;
    this.events.push(...r.events);
  }
  result() {
    const ops = [];
    for (const t of this.changed.values()) ops.push({ type: 'task.upsert', task: t });
    for (const id of this.deleted) ops.push({ type: 'task.delete', id });
    if (this.entries.length) ops.push({ type: 'ledger.append', entries: this.entries });
    if (JSON.stringify(this.game) !== this.game0) {
      ops.push({ type: 'game.set', game: this.game, baseGameRevision: this.params.gameRevision });
    }
    return { tasks: this.tasks, game: this.game, ops, entries: this.entries, events: this.events };
  }
}

function cleanTitle(v) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  if (!s) throw new Error('Il faut un titre pour la quête.');
  return s.slice(0, 200);
}

function cleanDeadline(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = isDayString(v) ? v : dayOf(v);
  if (!d) throw new Error("L'échéance est invalide.");
  return d;
}

function cleanRecurrence(r) {
  if (r === undefined || r === null) return null;
  const interval = Math.round(Number(r.interval ?? 1));
  if (!RECURRENCE_EVERY.includes(r.every) || !(interval >= 1)) throw new Error('La récurrence est invalide.');
  return { every: r.every, interval };
}

function nextStepId(steps) {
  let n = steps.length + 1;
  const ids = new Set(steps.map((s) => s.id));
  while (ids.has('s' + n)) n++;
  return 's' + n;
}

/** Identifiant d'une nouvelle quête, dérivé de l'instant (jamais deux fois le même). */
export function newTaskId(tasks, now) {
  const base = 'q-' + parseInt(toISO(now).replace(/\D/g, '').slice(0, 17), 10).toString(36);
  const ids = new Set(tasks.map((t) => t.id));
  let id = base, n = 2;
  while (ids.has(id)) id = `${base}-${n++}`;
  return id;
}

function nextDeadline(task, recurrence, today) {
  const step = (d) => {
    if (recurrence.every === 'day') return addDays(d, recurrence.interval);
    if (recurrence.every === 'week') return addDays(d, 7 * recurrence.interval);
    return addMonths(d, recurrence.interval);
  };
  let d = dayOf(task.deadline) ?? today;
  let guard = 0;
  do { d = step(d); } while (d <= today && ++guard < 1000);
  return d;
}

// Termine une quête dans le contexte (gain, passage à « done », ou occurrence suivante).
function complete(ctx, task, { alreadyDone = false } = {}) {
  const now = ctx.now;
  let t = { ...task, frozen: task.frozen ?? freezeValues(task, now) };
  const occ = t.occurrence ?? 1;
  const { pe } = questPe(t, now);
  const net = completionPe(pe, stepsPaid(ctx.ledger, t.id, occ));

  let wasTop3 = false;
  if (!alreadyDone) {
    const open = ctx.tasks.filter((x) => x.status === 'todo');
    wasTop3 = orderByCote(open, now).slice(0, 3).some((x) => x.id === t.id) && t.priority >= 8;
  }

  const entry = buildRewardEntry({ task: t, occurrence: occ, pe: net, alreadyDone }, ctx.ledger, now);
  if (entry) ctx.append(entry, alreadyDone ? 'deja-faite' : 'quete');
  else ctx.events.push({ type: 'sans-gain', taskId: t.id, reason: 'deja-recompensee' });

  if (entry && wasTop3) {
    const bonus = buildBonusEntry('bon-fil', ctx.ledger, now, { taskId: t.id });
    if (bonus) ctx.append(bonus, 'bonus', { bonus: 'bon-fil' });
  }
  if (t.frozen.length >= 6) ctx.events.push({ type: 'plaque', taskId: t.id, day: ctx.day });

  if (t.recurrence) {
    const prev = {
      deadline: t.deadline ?? null, deadlineSetAt: t.deadlineSetAt ?? null, occurrenceSince: t.occurrenceSince ?? null,
      startedAt: t.startedAt ?? null, frozen: t.frozen, steps: t.steps ?? null,
    };
    const nd = nextDeadline(t, t.recurrence, ctx.day);
    t = {
      ...t, status: 'todo', occurrence: occ + 1, doneAt: null, startedAt: null, frozen: null,
      deadline: nd, deadlineSetAt: null, occurrenceSince: ctx.day,
      steps: Array.isArray(t.steps) ? t.steps.map((s) => ({ ...s, done: false, doneAt: null })) : t.steps,
      lastDone: { occurrence: occ, at: ctx.iso, prev },
    };
  } else {
    t = { ...t, status: 'done', doneAt: ctx.iso };
  }
  return ctx.put(t);
}

/**
 * Crée une quête. params : { task, domain, difficulty, length, priority, deadline, notes, steps (libellés),
 * recurrence, alreadyDone, complete, id }. `complete: true` = ajout complet (+1 ⚡, 2 par jour).
 */
export function createQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const labels = params.steps ?? [];
  if (labels.length > MAX_STEPS) throw new Error(`Une quête compte ${MAX_STEPS} étapes au plus.`);
  const deadline = cleanDeadline(params.deadline);
  const id = params.id ?? newTaskId(ctx.tasks, now);
  if (ctx.tasks.some((t) => t.id === id)) throw new Error('Cet identifiant existe déjà.');
  let t = {
    id,
    task: cleanTitle(params.task),
    domain: params.domain ?? '',
    difficulty: clampScale(params.difficulty),
    length: clampScale(params.length),
    priority: clampScale(params.priority),
    status: 'todo',
    created: ctx.day,
    createdAt: ctx.iso,
    deadline,
  };
  if (params.notes) t.notes = String(params.notes);
  if (deadline) t.deadlineSetAt = ctx.iso;
  if (labels.length) t.steps = labels.map((label, i) => ({ id: 's' + (i + 1), label: String(label).trim(), done: false }));
  const rec = cleanRecurrence(params.recurrence);
  if (rec) { t.recurrence = rec; t.occurrence = 1; t.occurrenceSince = ctx.day; }
  if (params.alreadyDone) t.alreadyDone = true;
  ctx.put(t);

  if (params.complete) {
    const b = buildBonusEntry('ajout', ctx.ledger, now, { taskId: id });
    if (b) ctx.append(b, 'bonus', { bonus: 'ajout' });
  }
  if (params.alreadyDone) complete(ctx, ctx.get(id), { alreadyDone: true });
  return ctx.result();
}

const PATCHABLE = ['task', 'domain', 'difficulty', 'length', 'priority', 'deadline', 'notes', 'recurrence'];

/** params : { id, patch: { task, domain, difficulty, length, priority, deadline, notes, recurrence } }. Les valeurs figées ne bougent pas. */
export function updateQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const t = { ...ctx.get(params.id) };
  const patch = params.patch || {};
  for (const k of PATCHABLE) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (k === 'task') t.task = cleanTitle(v);
    else if (k === 'domain') t.domain = v ?? '';
    else if (k === 'difficulty' || k === 'length' || k === 'priority') t[k] = clampScale(v);
    else if (k === 'deadline') {
      const d = cleanDeadline(v);
      if (d !== (t.deadline ?? null)) t.deadlineSetAt = d ? ctx.iso : null;
      t.deadline = d;
    } else if (k === 'notes') t.notes = v == null ? null : String(v);
    else if (k === 'recurrence') {
      t.recurrence = cleanRecurrence(v);
      if (t.recurrence && !t.occurrence) { t.occurrence = 1; t.occurrenceSince = t.created; }
    }
  }
  ctx.put(t);
  return ctx.result();
}

/** « Je m'y mets » : épingle la quête et fige P/L/D. */
export function startQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  let t = ctx.get(params.id);
  if (t.status !== 'todo') throw new Error('Seule une quête à faire peut être commencée.');
  if (!t.startedAt) t = { ...t, startedAt: ctx.iso };
  ctx.put(applyFreeze(t, now));
  return ctx.result();
}

/** Retire l'épingle (« Pause »). Les valeurs figées restent. */
export function pauseQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  ctx.put({ ...ctx.get(params.id), startedAt: null });
  return ctx.result();
}

export function addStep(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const t = ctx.get(params.id);
  const steps = [...(t.steps ?? [])];
  if (steps.length >= MAX_STEPS) throw new Error(`Une quête compte ${MAX_STEPS} étapes au plus.`);
  const label = String(params.label ?? '').trim();
  if (!label) throw new Error('Il faut un libellé pour l’étape.');
  steps.push({ id: nextStepId(steps), label, done: false });
  ctx.put({ ...t, steps });
  return ctx.result();
}

export function removeStep(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const t = ctx.get(params.id);
  ctx.put({ ...t, steps: (t.steps ?? []).filter((s) => s.id !== params.stepId) });
  return ctx.result();
}

/** Coche ou décoche une étape. Une étape paie une seule fois par occurrence (40 % des PE partagés entre les étapes). */
export function toggleStep(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  let t = ctx.get(params.id);
  if (t.status !== 'todo') throw new Error('Les étapes se cochent sur une quête à faire.');
  const steps = (t.steps ?? []).map((s) => ({ ...s }));
  const s = steps.find((x) => x.id === params.stepId);
  if (!s) throw new Error('Étape introuvable.');
  s.done = params.done === undefined ? !s.done : !!params.done;
  s.doneAt = s.done ? ctx.iso : null;
  t = { ...t, steps };
  if (s.done) {
    t = applyFreeze(t, now);
    const occ = t.occurrence ?? 1;
    const { pe } = questPe(t, now);
    const share = stepPe(pe, steps.length, stepsPaid(ctx.ledger, t.id, occ));
    ctx.events.push({ type: 'etape', taskId: t.id, stepId: s.id, done: true, restantes: steps.filter((x) => !x.done).length });
    if (share > 0) {
      const entry = buildStepEntry({ task: t, occurrence: occ, stepId: s.id, pe: share }, ctx.ledger, now);
      if (entry) ctx.append(entry, 'etape');
    }
  } else {
    ctx.events.push({ type: 'etape', taskId: t.id, stepId: s.id, done: false, restantes: steps.filter((x) => !x.done).length });
  }
  ctx.put(t);
  return ctx.result();
}

/** Termine la quête. Une occurrence récompensée ne rapporte jamais deux fois (clé reward:{id}:{occurrence}). */
export function completeQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const t = ctx.get(params.id);
  if (t.status === 'done') throw new Error('Cette quête est déjà terminée.');
  if (t.status === 'archived') throw new Error('Une quête archivée ne se termine pas : il faut d’abord la sortir des archives.');
  complete(ctx, t);
  return ctx.result();
}

/** Rouvre une quête terminée, sans toucher au registre : la terminer à nouveau rapporte 0. */
export function reopenQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const t = ctx.get(params.id);
  if (t.status !== 'done') throw new Error('Seule une quête terminée peut être rouverte.');
  ctx.put({ ...t, status: 'todo', doneAt: null });
  return ctx.result();
}

/** « Remballer » : dans les 24 h suivant la fin, annule le gain par une écriture inverse. */
export function remballerQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const t = ctx.get(params.id);
  const recurring = !!t.lastDone;
  if (t.status !== 'done' && !recurring) throw new Error('Seule une quête terminée peut être remballée.');
  const occ = recurring ? t.lastDone.occurrence : t.occurrence ?? 1;
  if (hasKey(ctx.ledger, reverseKey(t.id, occ))) throw new Error('Cette quête a déjà été remballée.');
  if (!canReverse(ctx.ledger, t.id, occ, now)) {
    throw new Error(findEntry(ctx.ledger, rewardKey(t.id, occ)) ? 'Trop tard pour remballer : plus de 24 h se sont écoulées.' : 'Cette quête n’a rien rapporté, il n’y a rien à remballer.');
  }
  const entry = buildReverseEntry(ctx.ledger, t.id, occ, now);
  ctx.append(entry, 'reverse');
  if (recurring) {
    const p = t.lastDone.prev;
    ctx.put({ ...t, ...p, status: 'todo', occurrence: occ, doneAt: null, lastDone: null });
  } else {
    ctx.put({ ...t, status: 'todo', doneAt: null });
  }
  ctx.events.push({ type: 'remballe', taskId: t.id });
  return ctx.result();
}

export function archiveQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  ctx.put({ ...ctx.get(params.id), status: 'archived', archivedAt: ctx.iso, startedAt: null });
  return ctx.result();
}

export function unarchiveQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const t = ctx.get(params.id);
  if (t.status !== 'archived') throw new Error('Cette quête n’est pas archivée.');
  ctx.put({ ...t, status: 'todo', archivedAt: null });
  return ctx.result();
}

/** Supprime une quête. Le bonus « ajout complet » est repris si la suppression a lieu dans les 24 h. */
export function deleteQuest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  ctx.get(params.id);
  const refund = buildAjoutRefund(ctx.ledger, params.id, now);
  if (refund) ctx.append(refund, 'bonus', { bonus: 'ajout-reprise' });
  ctx.remove(params.id);
  return ctx.result();
}

/** Bonus hors tâches : params.type = 'ouverture' | 'plan' | 'plan-honore' | 'ajout'. Sans effet si le plafond du jour est atteint. */
export function claimBonus(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const entry = buildBonusEntry(params.type, ctx.ledger, now);
  if (entry) ctx.append(entry, 'bonus', { bonus: params.type });
  return ctx.result();
}

/**
 * À appeler à l'ouverture de l'app : +1 ⚡ (ouverture, une fois par jour) et, après 3 jours d'absence ou plus,
 * le bonus de retour (+10 ⚡, une fois par 14 jours). Note le jour d'ouverture dans l'état.
 */
export function openApp(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const day = ctx.day;
  if (ctx.game.lastOpenDay === day) return ctx.result();
  const gap = ctx.game.lastOpenDay ? daysBetween(ctx.game.lastOpenDay, day) : 0;
  const o = buildBonusEntry('ouverture', ctx.ledger, now);
  if (o) ctx.append(o, 'bonus', { bonus: 'ouverture' });
  if (gap >= 3) {
    const last = ctx.ledger.filter((e) => e.type === 'bonus' && e.bonus === 'retour').map((e) => e.day).sort().pop();
    if (!last || daysBetween(last, day) >= 14) {
      const r = buildBonusEntry('retour', ctx.ledger, now);
      if (r) {
        ctx.events.push({ type: 'retour', jours: gap });
        ctx.append(r, 'bonus', { bonus: 'retour' });
        ctx.game = { ...ctx.game, lastReturnDay: day };
      }
    }
  }
  ctx.game = { ...ctx.game, lastOpenDay: day };
  return ctx.result();
}
