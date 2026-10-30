// Les Grands travaux (lot O, plan validé par Alex le 29 octobre 2026) : de gros ouvrages, ouverts à tous dès le rang
// Bourg, quelle que soit l'allure, payés par étapes, surtout en Matériaux. Ils donnent de quoi dépenser à qui a tout
// acheté (tasks/todo.md, « Grands travaux » : les réserves mesurées sans usage au 1er mars).
// Payer une étape la lance ; les ouvriers la bâtissent pendant les JOURS_PAR_ETAPE jours travaillés qui suivent (une
// quête payée, non remballée, comme pour les permis ; le jour du paiement ne compte pas), une étape à la fois. Rien ne se
// perd en cas d'absence : l'étape attend. L'étape finie est notée dans la partie par la quête payée qui la termine
// (suivreTravaux, appelée par quests.js) : remballer cette quête ne la fait jamais reculer.
// Un ouvrage fini n'a aucun effet de jeu (décision d'Alex) : sa trace sur l'île et un moment de récit.
// La partie : game.travaux = { [ouvrage]: { payees, le (jour de jeu du dernier paiement), finies } } ; absent ou
// illisible, rien n'est commencé. Payer n'écrit rien au registre : game.set suffit, comme pour monter un quartier.
// Cycle d'import avec quests.js et batiments.js : tout est lu à l'appel.
import { Ctx } from './quests.js';
import { gameDay, isDayString } from './time.js';
import { round1 } from './reward.js';
import { RANGS } from './village.js';
import { joursTravailles, logements, manque } from './batiments.js';

/** Jours travaillés pour bâtir une étape payée. */
export const JOURS_PAR_ETAPE = 2;

/** Les ouvrages, dans l'ordre du catalogue. Prix provisoires, à régler par la simulation (s). */
export const OUVRAGES = {
  phare: {
    rang: 'bourg',
    nom: 'le phare',
    etapes: [
      { id: 'fondation', nom: 'la fondation', cout: { energy: 25, materials: 250 } },
      { id: 'tour', nom: 'la tour', cout: { energy: 25, materials: 250 } },
      { id: 'galerie', nom: 'la galerie', cout: { energy: 25, materials: 250 } },
      { id: 'lanterne', nom: 'la lanterne', cout: { energy: 25, materials: 250 } },
    ],
  },
};
export const OUVRAGE_IDS = Object.keys(OUVRAGES);

const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const count = (v) => Math.max(0, Math.floor(Number(v) || 0));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Travaux d'un ouvrage dans la partie, lus prudemment : { payees, le, finies } (illisible : rien de commencé).
function travauxDe(game, id) {
  const t = isObj(game?.travaux) && isObj(game.travaux[id]) ? game.travaux[id] : {};
  const total = OUVRAGES[id].etapes.length;
  const payees = Math.min(total, count(t.payees));
  const le = isDayString(t.le) ? t.le : '';
  if (!payees || !le) return { payees: 0, le: '', finies: 0 };
  return { payees, le, finies: Math.min(payees, count(t.finies)) };
}

/**
 * Où en est un ouvrage, lecture pure : { id, total, payees, finies, fini, enCours: { etape, jours, restants } | null,
 * prochaine: { etape, id, cout } | null }. `etape` compte à partir de 1 ; `jours` : jours travaillés depuis le paiement.
 */
export function etatOuvrage(game, ledger, id, now) {
  const def = OUVRAGES[id];
  const t = travauxDe(game, id);
  const total = def.etapes.length;
  let enCours = null;
  if (t.payees > t.finies) {
    const jours = Math.min(JOURS_PAR_ETAPE, joursTravailles(Array.isArray(ledger) ? ledger : [], t.le, gameDay(now)));
    enCours = { etape: t.payees, jours, restants: JOURS_PAR_ETAPE - jours };
  }
  const suivante = t.payees < total ? def.etapes[t.payees] : null;
  return {
    id, total, payees: t.payees, finies: t.finies, fini: t.finies >= total, enCours,
    prochaine: suivante ? { etape: t.payees + 1, id: suivante.id, cout: suivante.cout } : null,
  };
}

/**
 * Pourquoi on ne peut pas payer l'étape visée de cet ouvrage (ou null). params : { ouvrage, etape } ; sans etape, la
 * suivante. Ordre : ouvrage inconnu, déjà debout, rang, déjà payée, étape en cours, étape sautée, ce qui manque.
 */
export function refusTravaux(game, ledger, { ouvrage, etape } = {}, now) {
  if (!own(OUVRAGES, ouvrage)) return 'Ouvrage inconnu.';
  const def = OUVRAGES[ouvrage];
  const e = etatOuvrage(game, ledger, ouvrage, now);
  if (e.fini) return `${def.nom[0].toUpperCase()}${def.nom.slice(1)} est debout.`;
  const besoin = RANGS.find((r) => r.id === def.rang);
  const h = logements(game).habitants;
  if (h < besoin.min) return `${besoin.name} : encore ${besoin.min - h} habitant${besoin.min - h > 1 ? 's' : ''}.`;
  const vise = etape === undefined || etape === null ? e.payees + 1 : Number(etape);
  if (vise <= e.payees) return 'Déjà fait.';
  if (e.enCours) {
    const r = e.enCours.restants;
    return `Les ouvriers bâtissent encore ${def.etapes[e.enCours.etape - 1].nom} : encore ${r} jour${r > 1 ? 's' : ''} travaillé${r > 1 ? 's' : ''}.`;
  }
  if (vise > e.payees + 1) return `Il faut d’abord l’étape ${e.payees + 1}.`;
  return manque(game, def.etapes[e.payees].cout);
}

/**
 * Paie l'étape suivante d'un ouvrage et la lance. params : { ouvrage, etape } (l'étape visée : un double toucher ou un
 * geste rejoué est refusé, « Déjà fait. »). Événement { type: 'travaux-etape-payee', ouvrage, etape, cout }. Rien au
 * registre ni dans les tâches.
 */
export function payerEtape(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusTravaux(ctx.game, ctx.ledger, params, now);
  if (refus) throw new Error(refus);
  const ouvrage = params.ouvrage;
  const t = travauxDe(ctx.game, ouvrage);
  const etape = t.payees + 1;
  const cout = OUVRAGES[ouvrage].etapes[etape - 1].cout;
  const g = structuredClone(ctx.game);
  g.resources.energy = round1(g.resources.energy - cout.energy);
  g.resources.materials = round1(g.resources.materials - cout.materials);
  g.travaux = { ...(isObj(g.travaux) ? g.travaux : {}), [ouvrage]: { payees: etape, le: ctx.day, finies: t.finies } };
  ctx.game = g;
  ctx.events.push({ type: 'travaux-etape-payee', ouvrage, etape, cout });
  return ctx.result();
}

/**
 * Appelée par quests.js après une quête payée : l'étape en cours de chaque ouvrage qui a ses JOURS_PAR_ETAPE jours
 * travaillés depuis son paiement est finie, et notée dans la partie. Événement { type: 'travaux-etape-finie', ouvrage,
 * etape, fini } (fini : c'était la dernière).
 */
export function suivreTravaux(ctx) {
  for (const ouvrage of OUVRAGE_IDS) {
    const t = travauxDe(ctx.game, ouvrage);
    if (t.payees <= t.finies || joursTravailles(ctx.ledger, t.le, ctx.day) < JOURS_PAR_ETAPE) continue;
    ctx.game = { ...ctx.game, travaux: { ...(isObj(ctx.game.travaux) ? ctx.game.travaux : {}), [ouvrage]: { ...t, finies: t.payees } } };
    ctx.events.push({ type: 'travaux-etape-finie', ouvrage, etape: t.payees, fini: t.payees === OUVRAGES[ouvrage].etapes.length });
  }
}
