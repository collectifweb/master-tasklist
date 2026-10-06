// Visiteurs du quai (bible §7, lot V). Le premier est le marchand (décisions d'Alex du 6 octobre) : une fois le quai
// rebâti, il est là chaque semaine, du lundi au dimanche (semaine de jeu, celle de la semaine tenue), même si le quai
// est rebâti en milieu de semaine. Le visiteur se déduit de la date et du quai : rien n'est enregistré pour qu'il
// vienne, et tous les appareils voient le même, même hors ligne.
// Quatre offres fixes, chacune prise une fois par visite. Un échange ne fait que convertir ce qui a déjà été gagné :
// game.set suffit (comme construire), rien au registre ni dans les tâches. La partie garde les offres prises de la
// semaine dans game.visite = { semaine: lundi, prises: [id] } ; une visite d'une autre semaine ne compte plus.
// Aucun aller-retour ne rapporte (un test le vérifie), et le marchand ne donne aucun permis.
// Même forme que quests.js : (tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }.
import { Ctx } from './quests.js';
import { gameDay, weekStart, weekEnd, daysBetween } from './time.js';
import { round1 } from './reward.js';
import { compte, manque, stockage, entierBas, entierHaut } from './batiments.js';
import { suivreObjectifs } from './objectifs.js';

/**
 * Le marchand et ses offres, dans l'ordre d'affichage. donne : ce que le joueur cède ; recoit : ce qu'il obtient
 * (une ressource de chaque côté : energy, materials ou food). Règle simple : il vend ses Matériaux et sa Nourriture
 * 2 Énergie pièce et les rachète 1 Énergie pièce ; un aller-retour rend la moitié. Valeurs de départ, mesurées dans
 * tests/core/simulation.test.mjs, joueur (h) « avisé » qui n'échange que ce qui est en trop (le 6 octobre) : au rythme
 * de l'essai, autant de niveaux en 16 semaines et le village plein vers la fin décembre au lieu d'après la 16e semaine
 * (départs d'octobre) ; au rythme régulier, un niveau de plus. Le joueur avisé prend surtout Matériaux → Énergie et
 * Énergie → Nourriture : aux prix du lot R2, l'Énergie limite les niveaux du joueur régulier.
 */
export const MARCHAND = {
  id: 'marchand',
  offres: [
    { id: 'energie-materiaux', donne: { energy: 30 }, recoit: { materials: 15 } },
    { id: 'energie-nourriture', donne: { energy: 20 }, recoit: { food: 10 } },
    { id: 'materiaux-energie', donne: { materials: 15 }, recoit: { energy: 15 } },
    { id: 'nourriture-energie', donne: { food: 10 }, recoit: { energy: 10 } },
  ],
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const offreDe = (id) => (typeof id === 'string' ? MARCHAND.offres.find((o) => o.id === id) ?? null : null);

// Offres déjà prises pendant la visite de la semaine de `lundi` (une visite d'une autre semaine, ou abîmée, n'en a aucune).
function prisesDe(game, lundi) {
  const v = game.visite;
  if (!isObj(v) || v.semaine !== lundi || !Array.isArray(v.prises)) return [];
  return v.prises.filter((id) => offreDe(id));
}

/**
 * Le visiteur de la semaine, ou null sans quai : { id, semaine (lundi), depart (dimanche), joursRestants (aujourd'hui
 * compris : 7 le lundi, 1 le dimanche), offres: [{ id, donne, recoit, prise }] }. Lecture pure.
 */
export function visiteurDeLaSemaine(game, now) {
  if (!compte(game, 'quai')) return null;
  const day = gameDay(now);
  const semaine = weekStart(day);
  const depart = weekEnd(day);
  const prises = prisesDe(game, semaine);
  return {
    id: MARCHAND.id, semaine, depart, joursRestants: daysBetween(day, depart) + 1,
    offres: MARCHAND.offres.map((o) => ({ ...o, prise: prises.includes(o.id) })),
  };
}

/** Pourquoi on ne peut pas prendre cette offre maintenant (ou null). Ordre : quai, offre, déjà prise, manque, réserve. */
export function refusEchanger(game, params, now) {
  const v = visiteurDeLaSemaine(game, now);
  if (!v) return 'Il faut d’abord rebâtir le quai.';
  const o = offreDe(params?.offre);
  if (!o) return 'Offre inconnue.';
  if (v.offres.find((x) => x.id === o.id).prise) return 'Déjà fait cette semaine : le marchand revient lundi.';
  if (o.donne.food) {
    const m = round1(o.donne.food - game.resources.food);
    if (m > 0) return `Il manque ${entierHaut(m)} Nourriture.`;
  } else {
    const m = manque(game, o.donne);
    if (m) return m;
  }
  if (o.recoit.food) {
    const max = stockage(game);
    const stock = `${entierBas(game.resources.food)} sur ${max}`;
    const place = round1(max - game.resources.food);
    if (place <= 0) return `La réserve est pleine (${stock}).`;
    if (place < o.recoit.food) return `La réserve n’a de place que pour ${entierBas(place)} Nourriture (${stock}).`;
  }
  return null;
}

/** Prend une offre du visiteur. params : { offre }. Événement { type: 'echange', visiteur, offre, donne, recoit }. */
export function echanger(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusEchanger(ctx.game, params, now);
  if (refus) throw new Error(refus);
  const o = offreDe(params.offre);
  const semaine = weekStart(ctx.day);
  const g = structuredClone(ctx.game);
  for (const [k, n] of Object.entries(o.donne)) g.resources[k] = round1(g.resources[k] - n);
  for (const [k, n] of Object.entries(o.recoit)) g.resources[k] = round1(g.resources[k] + n);
  g.visite = { semaine, prises: [...prisesDe(g, semaine), o.id] };
  ctx.game = g;
  ctx.events.push({ type: 'echange', visiteur: MARCHAND.id, offre: o.id, donne: { ...o.donne }, recoit: { ...o.recoit } });
  suivreObjectifs(ctx); // de la Nourriture reçue peut remplir le grenier de l'objectif d'automne
  return ctx.result();
}
