// Jour du recyclage (dimanche), version 1 : bilan informatif de la semaine et quêtes ouvertes depuis plus de 60 jours,
// à garder ou à archiver (l'archivage passe par archiveQuest de quests.js). Rien n'est modifié ici.
import { gameDay, weekStart, weekEnd, isoWeekday } from './time.js';
import { estimatedMinutes, taskAgeDays } from './cote.js';
import { SECTORS } from './domains.js';
import { reverseKey } from './ledger.js';
import { releve } from './cote-a-cote.js';

export const RECYCLE_AGE_DAYS = 60;

const hours = (min) => Math.round(min / 6) / 10;

/**
 * Bilan de la semaine (lundi à dimanche) qui contient `now` :
 * { day, dimanche, semaine: { start, end }, quetes, heures, minutesReleve, heuresReleve,
 *   domaines: [{ sector, domain, quetes, minutes, heures, minutesReleve, heuresReleve }],
 *   joursLisiere, aTrier: [{ id, task, domain, ageDays }], ratioJeuQuetes: null }.
 * Quêtes = gains de quête du registre (remballées exclues) ; heures estimées par estimatedMinutes(Durée) ; domaine
 * lu par le secteur du gain (domain null = Place du Bastion, « autres quêtes »). Temps relevé : séances « Je m'y mets »
 * des mêmes quêtes (cote-a-cote.js), 0 quand rien n'a été relevé. `ratioJeuQuetes` reste null :
 * il demande de mesurer le temps passé dans le jeu, que rien ne mesure encore.
 */
export function weeklyReview(tasks, game, ledger, now) {
  const today = gameDay(now);
  const start = weekStart(today), end = weekEnd(today);
  const keys = new Set(ledger.map((e) => e.key));
  const byId = new Map(tasks.map((t) => [String(t.id), t]));
  const bySector = {};
  let quetes = 0, minutes = 0, minutesReleve = 0;
  for (const e of ledger) {
    if (e.type !== 'reward' || !e.day || e.day < start || e.day > end || keys.has(reverseKey(e.taskId, e.occurrence))) continue;
    const sector = e.lueur && SECTORS[e.lueur.sector] ? e.lueur.sector : 'place';
    const d = (bySector[sector] ||= { sector, domain: SECTORS[sector].domain, quetes: 0, minutes: 0, minutesReleve: 0 });
    const t = byId.get(String(e.taskId));
    const m = t ? estimatedMinutes(t.frozen?.length ?? t.length) : 0; // quête supprimée depuis : comptée sans durée
    const r = releve(game, e.taskId, e.occurrence, now).minutes;
    d.quetes++; d.minutes += m; d.minutesReleve += r;
    quetes++; minutes += m; minutesReleve += r;
  }
  const round1 = (n) => Math.round(n * 10) / 10;
  const domaines = Object.values(bySector)
    .map((d) => ({ ...d, heures: hours(d.minutes), minutesReleve: round1(d.minutesReleve), heuresReleve: hours(d.minutesReleve) }))
    .sort((a, b) => b.minutes - a.minutes || a.sector.localeCompare(b.sector));
  const aTrier = tasks.filter((t) => t.status === 'todo' && !t.readonly && taskAgeDays(t, now) > RECYCLE_AGE_DAYS)
    .map((t) => ({ id: t.id, task: t.task, domain: t.domain ?? '', ageDays: taskAgeDays(t, now) }))
    .sort((a, b) => b.ageDays - a.ageDays || String(a.id).localeCompare(String(b.id)));
  return {
    day: today, dimanche: isoWeekday(today) === 7, semaine: { start, end },
    quetes, heures: hours(minutes), minutesReleve: round1(minutesReleve), heuresReleve: hours(minutesReleve), domaines,
    joursLisiere: (game.lisiereDays ?? []).filter((d) => d >= start && d <= end).length,
    aTrier,
    ratioJeuQuetes: null,
  };
}
