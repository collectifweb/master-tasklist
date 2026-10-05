// Réaction d'un personnage : une bulle posée sur le monde, sous la voie d'annonce (elle ne couvre aucun bouton).
import { esc, $ } from './dom.js';
import { pickReply, replyVars, t } from '../content.js';
import { sectorOfTask, SECTORS } from '../../core/index.js';

const STAGE_SIT = { reparer: 'sector.repair', prosperer: 'sector.thrive', autonome: 'sector.autonomous' };

/** Quelle situation joue pour ce geste ? Une seule, la première de la liste de content/README.md. */
export function situationFor(action, params, events, task) {
  const has = (type) => events.some((e) => e.type === type);
  const lengthOf = task ? (task.frozen ? task.frozen.length : task.length) : 0;
  const doneFlow = () => {
    if (has('sans-gain')) return null;
    const seuils = events.filter((e) => e.type === 'secteur-seuil').map((e) => STAGE_SIT[e.stage]).filter(Boolean);
    for (const s of ['sector.autonomous', 'sector.thrive', 'sector.repair']) if (seuils.includes(s)) return s;
    if (has('lisiere-allumee')) return 'day.first_quest';
    if (lengthOf >= 6) return 'quest.done.big';
    if (events.some((e) => e.type === 'reward' && e.source === 'deja-faite')) return 'quest.already_done';
    return lengthOf >= 4 ? 'quest.done.medium' : 'quest.done.short';
  };
  switch (action) {
    case 'completeQuest': return doneFlow();
    case 'createQuest': return params.alreadyDone ? doneFlow() : null;
    case 'toggleStep': return events.some((e) => e.type === 'etape' && e.done) ? 'step.done' : null;
    case 'startQuest': return 'quest.start';
    case 'remballerQuest': return 'quest.undo';
    case 'openApp': return has('retour') ? 'return.after_absence' : null;
    default: return null;
  }
}

export function createSpeech(root) {
  const el = $('#speech', root);
  let timer = null;
  function show(reply) {
    el.innerHTML = `<span class="speech-name">${esc(reply.nom)}</span><span class="speech-text">${esc(reply.texte)}</span>`;
    el.hidden = false;
    el.classList.remove('is-shown');
    void el.offsetWidth;
    el.classList.add('is-shown');
    clearTimeout(timer);
    timer = setTimeout(() => { el.hidden = true; }, 7000);
  }
  return {
    /** Renvoie la réplique jouée (ou null). */
    react({ action, params, events, task, game, now }) {
      const sit = situationFor(action, params || {}, events || [], task);
      if (!sit) return null;
      const sectorId = task ? sectorOfTask(task) : 'place';
      const reply = pickReply(sit, {
        now, chapter: game.chapter ? game.chapter.number : 1, sector: sectorId,
        length: task ? (task.frozen ? task.frozen.length : task.length) : 0,
        vars: replyVars(task, sectorId),
      });
      if (reply) show(reply);
      return reply;
    },
    showText(nom, texte) { show({ nom, texte }); },
    hide() { el.hidden = true; },
  };
}
