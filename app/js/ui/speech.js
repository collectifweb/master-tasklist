// Réaction d'un personnage : une bulle posée sur le monde, sous la voie d'annonce (elle ne couvre aucun bouton).
import { esc, $ } from './dom.js';
import { pickReply, replyVars, t } from '../content.js';
import { quartierOfTask } from '../../core/index.js';

/** Quelle situation joue pour ce geste ? Une seule, la première de la liste de content/README.md. */
export function situationFor(action, params, events, task) {
  const has = (type) => events.some((e) => e.type === type);
  // un dégât réglé : la neige d'une tempête a sa propre réplique (lot H)
  const regle = () => (events.some((e) => e.type === 'reparation' && e.imprevu === 'neige') ? 'tempete.deneige' : 'imprevu.regle');
  const lengthOf = task ? (task.frozen ? task.frozen.length : task.length) : 0;
  const doneFlow = () => {
    if (has('sans-gain')) return null;
    if (events.some((e) => e.type === 'permis' && e.source === 'jours')) return 'permis.gagne';
    if (has('semaine-tenue')) return 'semaine.tenue';
    if (has('reparation')) return regle(); // la quête règle aussi un dégât de son domaine (lot I)
    if (lengthOf >= 6) return 'quest.done.big';
    if (events.some((e) => e.type === 'reward' && e.source === 'deja-faite')) return 'quest.already_done';
    return lengthOf >= 4 ? 'quest.done.medium' : 'quest.done.short';
  };
  switch (action) {
    case 'completeQuest': return doneFlow();
    case 'createQuest': return params.alreadyDone ? doneFlow() : null;
    case 'toggleStep': return events.some((e) => e.type === 'etape' && e.done) ? 'step.done' : null;
    case 'remballerQuest': return 'quest.undo';
    case 'openApp': return has('retour') ? 'return.after_absence' : null;
    // le quai rebâti : le marchand accoste aussitôt, Fanal l'annonce à la place du mot de chantier
    case 'construire': return events.some((e) => e.type === 'construction' && String(e.id).startsWith('quai')) ? 'marchand.arrive' : 'batiment.construit';
    case 'accueillir': return events.some((e) => e.type === 'permis' && e.source === 'rang') ? 'permis.rang' : 'famille.arrive';
    // la commande livrée (lot C) : le merci de son visiteur, ou le nouveau rang quand la famille du Sud le fait monter
    case 'livrer': {
      const c = events.find((e) => e.type === 'commande');
      if (!c) return null;
      return events.some((e) => e.type === 'permis' && e.source === 'rang') ? 'permis.rang' : `commande.livree.${c.visiteur}`;
    }
    // une ligne par quartier, au niveau 1 seulement (ses variantes portent le quartier)
    case 'monterQuartier': return events.some((e) => e.type === 'quartier-monte' && e.niveau === 1) ? 'quartier.monte' : null;
    case 'reparer': return regle();
    // la récolte qui atteint l'objectif d'hiver (lot H) ; les autres récoltes ne disent rien
    case 'recolter': return events.some((e) => e.type === 'objectif-saison' && e.objectif === 'serre') ? 'saison.serre' : null;
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
    react({ action, params, events, task, now }) {
      const sit = situationFor(action, params || {}, events || [], task);
      if (!sit) return null;
      const monte = (events || []).find((e) => e.type === 'quartier-monte');
      const quartier = task ? quartierOfTask(task) : monte ? monte.quartier : 'place';
      const rang = (events || []).find((e) => e.type === 'rang');
      const reply = pickReply(sit, {
        now, quartier,
        length: task ? (task.frozen ? task.frozen.length : task.length) : 0,
        vars: { ...replyVars(task, quartier), rang: rang ? rang.name : null },
      });
      if (reply) show(reply);
      return reply;
    },
    showText(nom, texte) { show({ nom, texte }); },
    hide() { el.hidden = true; },
  };
}
