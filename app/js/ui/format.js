// Formats d'affichage : durées, échéances, dates, nombres. Les phrases viennent de content/ (t, tn).
import { t, tn } from '../content.js';
import { daysUntil, dayOnly, estimatedMinutes } from '../../core/index.js';

const ZONE = 'America/Montreal';
const fDate = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short', timeZone: ZONE });
const fTime = new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: ZONE });
const fNum = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 1 });

export const num = (n) => fNum.format(Math.round(n * 10) / 10).replace(/−|-/, '−');
// Ressources à l'écran en nombres entiers (l'état garde ses dixièmes ; on n'arrondit que ce qu'on montre). On part du dixième
// le plus proche pour que le bruit des flottants ne fasse pas tomber 3 à 2.
const tenth = (n) => Math.round(n * 10) / 10;
/** Ce que le joueur possède : vers le bas (59,6 s'affiche 59 : la barre ne promet pas un prix de 60). */
export const numPossede = (n) => num(Math.floor(tenth(n)));
/** Ce qu'il manque, ou un prix : vers le haut (0,4 manquant s'affiche 1). */
export const numManque = (n) => num(Math.ceil(tenth(n)));
/** Un gain, une perte ou une récolte : au plus proche. 0 si le montant n'est pas montrable (alors on n'affiche rien). */
export const entierGain = (n) => Math.round(tenth(n));
export const numGain = (n) => num(entierGain(n));
export const shortDate = (day) => fDate.format(new Date(day + 'T12:00:00Z'));
export const timeOf = (iso) => fTime.format(new Date(iso)).replace(/ | /g, ' ');

export function durationText(length) {
  const m = estimatedMinutes(length);
  return m < 60 ? t('duration.minutes', { n: m }) : t('duration.hours', { n: m / 60 });
}

/** { text, late, days } ou null. Une échéance dépassée est une caisse au bord du chemin, jamais un échec. */
export function deadlineInfo(task, now) {
  const dl = dayOnly(task.deadline);
  if (!dl) return null;
  const j = daysUntil(dl, now);
  if (j === null) return null;
  if (j < 0) return { text: j === -1 ? t('late.since.today') : t('late.since', { n: -j }), late: true, days: j };
  if (j === 0) return { text: t('deadline.label.today'), late: false, days: j };
  if (j === 1) return { text: t('deadline.label.tomorrow'), late: false, days: j };
  if (j <= 6) return { text: t('deadline.label.days', { n: j }), late: false, days: j };
  return { text: t('deadline.label.date', { date: shortDate(dl) }), late: false, days: j };
}

export function recurrenceText(rec) {
  if (!rec || !rec.every) return '';
  const n = Math.max(1, Number(rec.interval) || 1);
  return tn(`recurrence.${rec.every}`, n);
}

export function stepsProgress(task) {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  if (!steps.length) return null;
  return { done: steps.filter((s) => s.done).length, total: steps.length };
}

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
