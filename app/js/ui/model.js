// Modèle d'affichage d'une quête : tout ce que les rendus ont besoin de savoir, calculé une fois.
import {
  cote, quartierOfTask, canReverse, taskAgeDays, daysUntil, dayOnly, gameDay,
} from '../../core/index.js';
import { t, quartierName } from '../content.js';
import { durationText, deadlineInfo, recurrenceText, stepsProgress, shortDate, timeOf, capitalize } from './format.js';

export function taskModel(task, ctx) {
  const { now, ledger } = ctx;
  const quartier = quartierOfTask(task);
  const state = task.status === 'done' ? 'done' : task.status === 'archived' ? 'archived' : 'todo';
  const dl = state === 'todo' ? deadlineInfo(task, now) : null;
  const steps = stepsProgress(task);
  const occ = task.occurrence ?? 1;
  const remballer = task.status === 'done' && !task.readonly && canReverse(ledger, task.id, occ, now);
  return {
    id: task.id,
    task,
    title: task.task,
    state,
    quartier,
    quartierName: quartierName(quartier),
    cote: state === 'todo' ? cote(task, now) : null,
    duration: durationText(task.length),
    deadline: dl,
    recurrence: recurrenceText(task.recurrence),
    steps,
    readonly: !!task.readonly,
    remballer,
  };
}

/** Éléments de la ligne de méta, dans l'ordre : { cls?, icon, text, sr? }. */
export function metaItems(m, { now, withQuartier = true, done = true } = {}) {
  const items = [];
  const task = m.task;
  if (withQuartier) items.push({ icon: m.quartier, text: m.quartierName }); // picto du même nom que le quartier
  if (m.state === 'todo') items.push({ icon: 'clock', text: m.duration });
  if (m.deadline) items.push({ cls: m.deadline.late ? 'meta-item--late' : '', icon: m.deadline.late ? 'crate' : 'calendar', text: m.deadline.text });
  if (m.recurrence) items.push({ icon: 'repeat', text: m.recurrence.toLowerCase() });
  if (m.steps) items.push({ icon: 'steps', text: `${m.steps.done}/${m.steps.total}`, sr: 'Étapes\u00a0: ' });
  if (m.readonly) items.push({ icon: 'lock', text: t('readonly.tag') });
  if (done && m.state === 'done') {
    const at = task.doneAt;
    if (at) {
      const same = gameDay(at) === gameDay(now);
      items.push({ text: same ? t('done.at', { heure: timeOf(at) }) : t('done.on', { date: shortDate(gameDay(at)) }) });
    }
  }
  if (done && m.state === 'archived') {
    const at = task.archivedAt;
    items.push({ text: at ? t('archived.on', { date: shortDate(gameDay(at)) }) : t('status.archived') });
  }
  return items;
}

/** Raison courte du Fil du jour. */
export function reasonText(m, now) {
  const task = m.task;
  const parts = [];
  if (task.priority >= 8) parts.push(t('reason.priority'));
  if (task.length <= 3) parts.push(t('reason.short'));
  if (task.difficulty <= 3) parts.push(t('reason.easy'));
  const j = daysUntil(task.deadline, now);
  if (j !== null) {
    if (j < 0) parts.push(t('reason.passed'));
    else if (j === 0) parts.push(t('reason.due.today'));
    else if (j === 1) parts.push(t('reason.due.tomorrow'));
    else if (j <= 7) parts.push(t('reason.due.days', { n: j }));
  }
  if (parts.length < 3 && taskAgeDays(task, now) >= 60) parts.push(t('reason.old'));
  if (!parts.length) return t('fil.reason.none');
  // trois raisons au plus, et une ligne assez courte pour laisser « Pourquoi ? » à côté sur un téléphone
  const join = (list) => (list.length === 1 ? list[0] : list.slice(0, -1).join(', ') + ' et ' + list[list.length - 1]);
  let used = parts.slice(0, 3);
  while (used.length > 1 && join(used).length > 32) used = used.slice(0, -1);
  return capitalize(join(used)) + '.';
}
