// Côte à côte : « Je m'y mets » lance un simple relevé du temps passé, Fanal à côté. Rien d'autre :
// pas de gain, pas d'entrée au registre, aucune ressource (pas de récompense au temps passé), et le temps vit dans
// l'état du jeu, jamais dans la vraie tâche. Une seule séance à la fois.
//
// game.coteACote = {
//   current: { taskId, occurrence, since } | null,               // séance en cours (since : instant ISO du début)
//   totals:  [{ taskId, occurrence, minutes, capped, doneOn }],  // temps relevé par occurrence de quête
// }
//   minutes : total en minutes (une décimale) ; capped : une séance oubliée y a été plafonnée ;
//   doneOn  : jour de jeu où l'occurrence s'est terminée (Fait, archive, suppression), null tant qu'elle est à faire.
// Une séance oubliée compte SEANCE_MAX_MINUTES au plus. Les totaux terminés depuis plus de RELEVE_KEEP_DAYS jours
// sont effacés. Les fonctions qui écrivent prennent le contexte d'une opération (classe Ctx de quests.js) ; l'état lu
// peut être abîmé : tout est vérifié, rien n'est supposé.
import { daysBetween, hoursBetween, isDayString } from './time.js';
import { estimatedMinutes } from './cote.js';
import { MAX_STEPS } from './reward.js';

export const SEANCE_MAX_MINUTES = 180;
export const RELEVE_KEEP_DAYS = 60;
export const DECOUPAGE_FACTEUR = 2;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isId = (v) => (typeof v === 'string' && v !== '') || Number.isFinite(v);
const isOcc = (v) => Number.isInteger(v) && v >= 1;
const isInstant = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const round1 = (n) => Math.round(n * 10) / 10;
const occOf = (task) => (isOcc(task.occurrence) ? task.occurrence : 1);

function bloc(game) {
  return isObj(game) && Object.hasOwn(game, 'coteACote') && isObj(game.coteACote) ? game.coteACote : {};
}

function readCurrent(game) {
  const c = bloc(game).current;
  if (!isObj(c) || !isId(c.taskId) || !isOcc(c.occurrence) || !isInstant(c.since)) return null;
  return { taskId: String(c.taskId), occurrence: c.occurrence, since: c.since };
}

// Les champs inconnus d'un total sont gardés (état écrit par une version plus récente).
function readTotals(game) {
  const list = bloc(game).totals;
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => isObj(r) && isId(r.taskId) && isOcc(r.occurrence) && Number.isFinite(r.minutes) && r.minutes >= 0)
    .map((r) => ({ ...r, taskId: String(r.taskId), capped: r.capped === true, doneOn: isDayString(r.doneOn) ? r.doneOn : null }));
}

// Minutes écoulées depuis `since`, jamais négatives (horloge reculée).
const elapsed = (since, now) => Math.max(0, hoursBetween(since, now) * 60);

function write(ctx, current, totals) {
  ctx.game = { ...ctx.game, coteACote: { ...bloc(ctx.game), current, totals } };
}

/** Lance la séance de `task` (sa quête et son occurrence). Une autre séance en cours est d'abord arrêtée. */
export function startSeance(ctx, task) {
  const id = String(task.id), occurrence = occOf(task);
  const cur = readCurrent(ctx.game);
  if (cur && cur.taskId === id && cur.occurrence === occurrence) return; // déjà en cours (double appui, file rejouée)
  if (cur) stopSeance(ctx, cur.taskId, 'autre-quete');
  const totals = readTotals(ctx.game);
  const rec = totals.find((r) => r.taskId === id && r.occurrence === occurrence);
  if (rec) rec.doneOn = null;
  write(ctx, { taskId: id, occurrence, since: ctx.iso }, totals);
  ctx.events.push({ type: 'seance-debut', taskId: id, occurrence });
}

/**
 * Arrête la séance en cours si elle porte sur la quête `taskId` (n'importe quelle occurrence) et ajoute son temps au
 * total de cette occurrence. `raison` : 'pause' | 'fait' | 'remballer' | 'archive' | 'suppression' | 'autre-quete'.
 * `fin` (facultatif) : { task, occurrence, terminee }. `task` = la quête après l'opération (proposition de découpage) ;
 * `terminee` true note la fin de l'occurrence `occurrence` (doneOn), false l'efface (Remballer), absent n'y touche pas.
 * Événement 'seance-fin' { taskId, occurrence, minutes, total, oubliee, raison, decoupage }.
 */
export function stopSeance(ctx, taskId, raison, fin = null) {
  const id = String(taskId);
  let current = readCurrent(ctx.game);
  const totals = readTotals(ctx.game);
  const recOf = (occ) => totals.find((r) => r.taskId === id && r.occurrence === occ);
  let changed = false, event = null;
  if (current && current.taskId === id) {
    const ecoule = elapsed(current.since, ctx.now);
    const oubliee = ecoule > SEANCE_MAX_MINUTES;
    const minutes = round1(Math.min(ecoule, SEANCE_MAX_MINUTES));
    let rec = recOf(current.occurrence);
    if (!rec) totals.push(rec = { taskId: id, occurrence: current.occurrence, minutes: 0, capped: false, doneOn: null });
    rec.minutes = round1(rec.minutes + minutes);
    if (oubliee) rec.capped = true;
    event = { type: 'seance-fin', taskId: id, occurrence: current.occurrence, minutes, total: rec.minutes, oubliee, raison, decoupage: false };
    current = null;
    changed = true;
  }
  if (fin && isOcc(fin.occurrence) && typeof fin.terminee === 'boolean') {
    const rec = recOf(fin.occurrence);
    const doneOn = fin.terminee ? ctx.day : null;
    if (rec && rec.doneOn !== doneOn) { rec.doneOn = doneOn; changed = true; }
  }
  if (changed) write(ctx, current, totals);
  if (event) {
    if (fin && fin.task) event.decoupage = decoupagePropose(ctx.game, fin.task, ctx.now, event.occurrence);
    ctx.events.push(event);
  }
}

/**
 * Entretien (appelé par advanceTime) : ferme une séance oubliée (plus de SEANCE_MAX_MINUTES, plafonnée), note la fin
 * des occurrences qui ne sont plus à faire (quête terminée, archivée ou retirée ailleurs) et efface les totaux terminés
 * depuis plus de RELEVE_KEEP_DAYS jours.
 */
export function tidySeances(ctx) {
  const cur = readCurrent(ctx.game);
  if (cur && elapsed(cur.since, ctx.now) > SEANCE_MAX_MINUTES) stopSeance(ctx, cur.taskId, 'oubliee');
  if (!isObj(ctx.game) || !Object.hasOwn(ctx.game, 'coteACote')) return;
  const current = readCurrent(ctx.game);
  const totals = readTotals(ctx.game);
  const live = (r) => {
    const t = ctx.tasks.find((x) => String(x.id) === r.taskId);
    return !!t && t.status === 'todo' && occOf(t) === r.occurrence;
  };
  let changed = false;
  for (const r of totals) {
    if (!r.doneOn && !live(r) && !(current && current.taskId === r.taskId && current.occurrence === r.occurrence)) { r.doneOn = ctx.day; changed = true; }
  }
  const kept = totals.filter((r) => !r.doneOn || live(r) || daysBetween(r.doneOn, ctx.day) <= RELEVE_KEEP_DAYS);
  if (changed || kept.length !== totals.length) write(ctx, current, kept);
}

// ---- Lecture (interface) ------------------------------------------------

/** Séance en cours : { taskId, occurrence, since, minutes (entières, plafonnées), oubliee } ou null. */
export function currentSeance(game, now) {
  const cur = readCurrent(game);
  if (!cur) return null;
  const e = elapsed(cur.since, now);
  return { ...cur, minutes: Math.floor(Math.min(e, SEANCE_MAX_MINUTES)), oubliee: e > SEANCE_MAX_MINUTES };
}

/** Temps relevé pour une occurrence (séance en cours comprise) : { minutes, capped, enCours }. */
export function releve(game, taskId, occurrence, now) {
  const id = String(taskId);
  const rec = readTotals(game).find((r) => r.taskId === id && r.occurrence === occurrence);
  const cur = readCurrent(game);
  const enCours = !!cur && cur.taskId === id && cur.occurrence === occurrence;
  const e = enCours ? elapsed(cur.since, now) : 0;
  return {
    minutes: round1((rec ? rec.minutes : 0) + Math.min(e, SEANCE_MAX_MINUTES)),
    capped: (rec ? rec.capped : false) || e > SEANCE_MAX_MINUTES,
    enCours,
  };
}

/**
 * Découpage proposé : le temps relevé pour l'occurrence (par défaut celle en cours de la quête) dépasse
 * DECOUPAGE_FACTEUR fois la durée estimée, aucune séance oubliée n'y est comptée, et la quête est encore à faire
 * avec de la place pour des étapes.
 */
export function decoupagePropose(game, task, now, occurrence = occOf(task)) {
  if (!task || task.status !== 'todo' || task.readonly) return false;
  if ((Array.isArray(task.steps) ? task.steps.length : 0) >= MAX_STEPS) return false;
  const r = releve(game, task.id, occurrence, now);
  return !r.capped && r.minutes > DECOUPAGE_FACTEUR * estimatedMinutes(task.frozen?.length ?? task.length);
}
