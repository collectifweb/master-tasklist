// Jour du recyclage (dimanche) : bilan informatif de la semaine et quêtes ouvertes depuis plus de 60 jours, à garder
// ou à archiver (l'archivage passe par archiveQuest de quests.js) ; bilans des semaines passées, figés par advanceTime
// (quests.js) avec figerBilans. Rien n'est modifié ici.
import { gameDay, weekStart, weekEnd, isoWeekday, isDayString } from './time.js';
import { estimatedMinutes, taskAgeDays } from './cote.js';
import { QUARTIERS, PLACE_ID } from './domains.js';
import { reverseKey, quartierOfEntry } from './ledger.js';

export const RECYCLE_AGE_DAYS = 60;
export const BILANS_MAX = 104; // deux ans de bilans figés gardés dans la partie

const hours = (min) => Math.round(min / 6) / 10;

/**
 * Bilan de la semaine (lundi à dimanche) qui contient `now` :
 * { day, dimanche, semaine: { start, end }, quetes, heures,
 *   domaines: [{ quartier, domain, quetes, minutes, heures }],
 *   joursTravailles, aTrier: [{ id, task, domain, ageDays }], ratioJeuQuetes: null }.
 * Quêtes = gains de quête du registre (remballées exclues) ; heures estimées par estimatedMinutes(Durée) ; domaine
 * lu par le quartier du gain (domain null = Place du village, « autres quêtes » ; un gain écrit en v1 porte son ancien
 * secteur, traduit). Jours travaillés = jours de la semaine avec au moins une de ces quêtes. `ratioJeuQuetes` reste null :
 * il demande de mesurer le temps passé dans le jeu, que rien ne mesure encore.
 */
export function weeklyReview(tasks, game, ledger, now) {
  const today = gameDay(now);
  const aTrier = tasks.filter((t) => t.status === 'todo' && !t.readonly && taskAgeDays(t, now) > RECYCLE_AGE_DAYS)
    .map((t) => ({ id: t.id, task: t.task, domain: t.domain ?? '', ageDays: taskAgeDays(t, now) }))
    .sort((a, b) => b.ageDays - a.ageDays || String(a.id).localeCompare(String(b.id)));
  return { day: today, dimanche: isoWeekday(today) === 7, ...bilanSemaine(tasks, game, ledger, weekStart(today), now), aTrier, ratioJeuQuetes: null };
}

/**
 * Bilans figés des semaines finies avant celle de `now` qui comptent au moins une quête au registre (remballées
 * exclues), du plus ancien au plus récent : même forme que weeklyReview, sans day, dimanche, aTrier ni ratioJeuQuetes.
 * Une entrée minimale (registre de plus de 60 jours, sans jour) n'entre dans aucun bilan.
 */
export function bilansPasses(tasks, game, ledger, now) {
  const current = weekStart(gameDay(now));
  const weeks = new Set(paidQuests(ledger).map((e) => weekStart(e.day)).filter((w) => w < current));
  return [...weeks].sort().map((w) => bilanSemaine(tasks, game, ledger, w, now));
}

/**
 * Bilans figés de la partie (game.bilans, du plus ancien au plus récent), complétés par ceux des semaines finies
 * après le dernier (bilansPasses) : un bilan déjà figé ne change plus et n'est jamais doublé. BILANS_MAX au plus, les
 * plus anciens partent. Renvoie le tableau d'origine quand rien ne s'ajoute.
 */
export function figerBilans(tasks, game, ledger, now) {
  const kept = game.bilans;
  const last = kept.length ? kept[kept.length - 1].semaine?.start ?? '' : '';
  const added = bilansPasses(tasks, game, ledger, now).filter((b) => b.semaine.start > last);
  return added.length ? [...kept, ...added].slice(-BILANS_MAX) : kept;
}

// Gains de quête datés du registre, sans ceux qui ont été remballés.
function paidQuests(ledger) {
  const keys = new Set(ledger.map((e) => e.key));
  return ledger.filter((e) => e.type === 'reward' && isDayString(e.day) && !keys.has(reverseKey(e.taskId, e.occurrence)));
}

// Bilan de la semaine qui commence le lundi `start`.
function bilanSemaine(tasks, game, ledger, start, now) {
  const end = weekEnd(start);
  const byId = new Map(tasks.map((t) => [String(t.id), t]));
  const byQuartier = {};
  const jours = new Set();
  let quetes = 0, minutes = 0;
  for (const e of paidQuests(ledger)) {
    if (e.day < start || e.day > end) continue;
    const quartier = quartierOfEntry(e) ?? PLACE_ID;
    const d = (byQuartier[quartier] ||= { quartier, domain: QUARTIERS[quartier].domain, quetes: 0, minutes: 0 });
    jours.add(e.day);
    const t = byId.get(String(e.taskId));
    const m = t ? estimatedMinutes(t.frozen?.length ?? t.length) : 0; // quête supprimée depuis : comptée sans durée
    d.quetes++; d.minutes += m;
    quetes++; minutes += m;
  }
  const domaines = Object.values(byQuartier)
    .map((d) => ({ ...d, heures: hours(d.minutes) }))
    .sort((a, b) => b.minutes - a.minutes || a.quartier.localeCompare(b.quartier));
  return {
    semaine: { start, end },
    quetes, heures: hours(minutes), domaines,
    joursTravailles: jours.size,
  };
}
