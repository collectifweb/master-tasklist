// Cote (le rang d'une quête), tris, filtres, cartes du Fil du jour, « Pourquoi ? ».
// Le jeu n'influence jamais la Cote.
import { daysBetween, daysUntil, dayOnly, gameDay, weekEnd } from './time.js';
import { normalizeText, quartierOfTask } from './domains.js';

const ratio = (n) => Math.round(n * 10) / 10;

/** Jours depuis le début de l'occurrence active (récurrence) ou la création. */
export function taskAgeDays(task, now) {
  const start = dayOnly(task.occurrenceSince) ?? dayOnly(task.created);
  if (!start) return 0;
  return Math.max(0, daysBetween(start, gameDay(now)));
}

/** U : round(20·(14−j)/14) si l'échéance tombe dans 14 jours ou moins, 25 si dépassée, 0 sinon. */
export function urgency(task, now) {
  const j = daysUntil(task.deadline, now);
  if (j === null) return 0;
  if (j < 0) return 25;
  if (j <= 14) return Math.round((20 * (14 - j)) / 14);
  return 0;
}

/** A : min(5, âge / 14 jours). */
export function ageBonus(task, now) {
  return Math.min(5, taskAgeDays(task, now) / 14);
}

/** Détail des points de la Cote (avant arrondi et plafond). */
export function coteBreakdown(task, now) {
  const P = task.priority, L = task.length, D = task.difficulty;
  const parts = {
    priority: 4.5 * P,
    length: 2 * (11 - L),
    difficulty: 11 - D,
    urgency: urgency(task, now),
    age: ageBonus(task, now),
  };
  const raw = parts.priority + parts.length + parts.difficulty + parts.urgency + parts.age;
  return { ...parts, raw, total: Math.round(Math.min(100, raw)) };
}

/** Cote = min(100, 4,5·P + 2·(11−L) + (11−D) + U + A), arrondie à l'entier. */
export function cote(task, now) {
  return coteBreakdown(task, now).total;
}

const MINUTES = { 1: 5, 2: 15, 3: 30, 4: 45, 5: 60, 6: 120, 7: 180 };
/** Durée estimée en minutes : L1 5, L2 15, L3 30, L4 45, L5 60, L6 120, L7 180, L8+ 240. */
export function estimatedMinutes(length) {
  return length >= 8 ? 240 : MINUTES[length] ?? 60;
}

export function durationLabel(length) {
  const m = estimatedMinutes(length);
  if (m < 60) return `${m} min`;
  return `${m / 60} h`;
}

/** Quête épinglée : « Je m'y mets » posé, encore à faire. */
export function isPinned(task) {
  return task.status === 'todo' && !!task.startedAt;
}

// ---- Tris --------------------------------------------------------------

export const SORTS = [
  { id: 'cote', label: 'Cote' },
  { id: 'priorite', label: 'Priorité' },
  { id: 'echeance', label: 'Échéance' },
  { id: 'courtes', label: 'Courtes d’abord' },
  { id: 'faciles', label: 'Faciles d’abord' },
  { id: 'anciennes', label: 'Plus anciennes' },
  { id: 'recentes', label: 'Plus récentes' },
];

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function pinnedFirst(list, now) {
  const pinned = list.filter(isPinned).sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : byId(a, b)));
  return pinned;
}

/**
 * Tri par Cote : les quêtes épinglées (en cours) restent en tête, puis les autres par Cote décroissante.
 * Une quête de priorité ≥ 8 est toujours dans les 3 premières des quêtes non épinglées.
 */
export function orderByCote(tasks, now) {
  const scored = tasks.filter((t) => !isPinned(t)).map((t) => ({ t, c: cote(t, now) }));
  scored.sort((a, b) => b.c - a.c || b.t.priority - a.t.priority || byId(a.t, b.t));
  const rest = scored.map((s) => s.t);
  if (!rest.slice(0, 3).some((t) => t.priority >= 8)) {
    const idx = rest.findIndex((t, i) => i >= 3 && t.priority >= 8);
    if (idx > 0) {
      const [t] = rest.splice(idx, 1);
      rest.splice(Math.min(2, rest.length), 0, t);
    }
  }
  return [...pinnedFirst(tasks, now), ...rest];
}

export function sortTasks(tasks, sortId, now) {
  if (!sortId || sortId === 'cote') return orderByCote(tasks, now);
  const cmp = {
    priorite: (a, b) => b.priority - a.priority,
    echeance: (a, b) => {
      const da = a.deadline || '9999-99-99', db = b.deadline || '9999-99-99';
      return da < db ? -1 : da > db ? 1 : 0;
    },
    courtes: (a, b) => a.length - b.length,
    faciles: (a, b) => a.difficulty - b.difficulty,
    anciennes: (a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0),
    recentes: (a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0),
  }[sortId];
  if (!cmp) throw new Error('Tri inconnu : ' + sortId);
  return [...tasks].sort((a, b) => cmp(a, b) || cote(b, now) - cote(a, now) || byId(a, b));
}

// ---- Filtres -----------------------------------------------------------

/**
 * filters : { status = 'todo' | 'done' | 'archived' | 'all', quick (L ≤ 2), lowEnergy (D ≤ 3),
 * thisWeek (échéance au plus tard dimanche, retards compris), quartier (id), search }.
 */
export function filterTasks(tasks, filters = {}, now) {
  const status = filters.status ?? 'todo';
  const q = normalizeText(filters.search);
  const end = filters.thisWeek ? weekEnd(gameDay(now)) : null;
  return tasks.filter((t) => {
    if (status !== 'all' && t.status !== status) return false;
    if (filters.quick && !(t.length <= 2)) return false;
    if (filters.lowEnergy && !(t.difficulty <= 3)) return false;
    if (end) {
      const dl = dayOnly(t.deadline);
      if (!dl || dl > end) return false;
    }
    if (filters.quartier && quartierOfTask(t) !== filters.quartier) return false;
    if (q) {
      const hay = normalizeText([t.task, t.notes, t.domain].filter(Boolean).join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Filtre, puis trie. */
export function listQuests(tasks, { sort = 'cote', filters = {} } = {}, now) {
  return sortTasks(filterTasks(tasks, filters, now), sort, now);
}

// ---- Cartes du Fil du jour ---------------------------------------------

/** { first, quick, big } : À faire d'abord, Victoire rapide (L ≤ 3 et D ≤ 4), Grand chantier (L ≥ 6). Cartes distinctes si possible. */
export function topCards(tasks, now) {
  const open = tasks.filter((t) => t.status === 'todo');
  const ordered = orderByCote(open, now);
  const first = ordered[0] ?? null;
  const pick = (pred) => ordered.find((t) => pred(t) && t !== first) ?? null;
  return {
    first,
    quick: pick((t) => t.length <= 3 && t.difficulty <= 4),
    big: pick((t) => t.length >= 6),
  };
}

/** « Pourquoi ? » : la raison chiffrée de la Cote. */
export function why(task, now) {
  const b = coteBreakdown(task, now);
  const parts = [
    { label: `priorité ${task.priority}`, points: ratio(b.priority) },
    { label: task.length <= 3 ? 'courte' : task.length >= 6 ? 'longue' : 'durée moyenne', points: ratio(b.length) },
    { label: task.difficulty <= 3 ? 'facile' : task.difficulty >= 7 ? 'exigeante' : 'difficulté moyenne', points: ratio(b.difficulty) },
  ];
  if (b.urgency > 0) {
    const j = daysUntil(task.deadline, now);
    parts.push({ label: j < 0 ? 'échéance dépassée' : j === 0 ? 'échéance aujourd’hui' : `échéance dans ${j} jour${j > 1 ? 's' : ''}`, points: ratio(b.urgency) });
  }
  if (b.age >= 0.1) parts.push({ label: 'ancienneté', points: ratio(b.age) });
  const fmt = (n) => String(n).replace('.', ',');
  const text = `Cote ${b.total} : ` + parts.map((p) => `${p.label} (+${fmt(p.points)})`).join(', ') + '.';
  return { cote: b.total, parts, text };
}
