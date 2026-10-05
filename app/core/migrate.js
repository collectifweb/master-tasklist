// Migration des tâches, sans perte : tout champ inconnu est recopié tel quel.
import { gameDay, isDayString, dayOnly, dayOf } from './time.js';

export const STATUSES = ['todo', 'done', 'archived'];

/** Valeur 1-10 entière ; défaut 5 si absente ou illisible. */
export function clampScale(v, fallback = 5) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || v === null || v === '' || v === undefined) return fallback;
  return Math.min(10, Math.max(1, n));
}

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Tâche brute → tâche normalisée. Copie tous les champs (même inconnus), borne P/L/D à 1-10,
 * garde `archived`, `deadline`, `notes`. N'ajoute que `id`, `created`, `status` s'ils manquent.
 * Une tâche dont l'identifiant est inventé ou renommé reçoit `readonly: true` (propriété de vue : quests.js refuse
 * d'agir dessus et ne l'envoie jamais à l'API).
 */
export function normalizeTask(raw, now, index = 0) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const t = { ...src };
  t.task = typeof src.task === 'string' ? src.task : String(src.task ?? '');
  t.difficulty = clampScale(src.difficulty);
  t.length = clampScale(src.length);
  t.priority = clampScale(src.priority);
  const status = typeof src.status === 'string' ? src.status.trim().toLowerCase() : src.status;
  t.status = STATUSES.includes(status) ? status : 'todo';
  if (!isDayString(src.created)) t.created = dayOnly(src.created) ?? dayOf(src.created) ?? gameDay(now);
  if (src.id === undefined || src.id === null || src.id === '') {
    // identifiant inventé : le serveur ne le connaît pas, la tâche est en lecture seule (propriété de vue, jamais envoyée)
    t.id = 'm-' + hash(`${t.task}|${t.created}|${index}`);
    t.readonly = true;
  } else if (typeof src.id !== 'string') {
    t.id = String(src.id);
  }
  return t;
}

/** Tableau de tâches → tableau normalisé. Les identifiants en double reçoivent un suffixe. */
export function normalizeTasks(raw, now) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.map((r, i) => {
    const t = normalizeTask(r, now, i);
    if (seen.has(t.id)) {
      let n = 2;
      while (seen.has(`${t.id}-${n}`)) n++;
      t.id = `${t.id}-${n}`;
      t.readonly = true; // identifiant renommé : inconnu du serveur, lecture seule
    }
    seen.add(t.id);
    return t;
  });
}

