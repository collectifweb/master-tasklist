// Le phare allumé et ses escales (lot Y, étape 3 des Grands travaux ; choix de Claude du 31 octobre 2026, à relire par
// Alex, d'après son idée du 29 octobre : un cadeau qui amène une responsabilité). Le phare debout s'allume une fois par
// semaine de jeu (du lundi au dimanche), pour de l'Énergie ; sa lanterne brille jusqu'au dimanche. Le lendemain, un
// voilier de plaisanciers mouille près du phare et attend qu'on l'accueille, même au-delà du dimanche : rien ne se perd
// pendant une absence. Les accueillir coûte de la Nourriture, les familles d'abord (familleDabord, comme le repas) ; ils
// laissent un décor qui ne s'achète pas, rangé dans la remise (core/decors.js), six dans l'ordre, puis le même ordre.
// Tant que l'escale attend, on ne rallume pas ; ne pas allumer ne fait rien perdre.
// La partie : game.escales = { allume (jour de jeu du dernier allumage), accueillie (l'escale de cet allumage est
// accueillie), n (escales accueillies) } ; absent ou illisible, jamais allumé. Rien au registre : game.set suffit, et un
// geste rejoué est refusé (déjà allumé cette semaine, ou plus d'escale qui attend).
// Cycle d'import avec quests.js et batiments.js : tout est lu à l'appel.
import { Ctx } from './quests.js';
import { gameDay, isDayString, weekStart } from './time.js';
import { round1 } from './reward.js';
import { manque } from './batiments.js';
import { familleDabord } from './nourriture.js';
import { etatOuvrage } from './travaux.js';
import { etatDecors } from './decors.js';

/** Prix réglés par la mesure (u) (tests/core/simulation.test.mjs). */
export const ESCALE = { allumer: { energy: 100 }, accueillir: { food: 20 } };

/** Les décors laissés par les plaisanciers, dans l'ordre des escales (DECORS, unique: true). */
export const DECORS_ESCALE = ['canot', 'ancre', 'cloche', 'girouette', 'bouee', 'filet'];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const count = (v) => Math.max(0, Math.floor(Number(v) || 0));

// Les escales de la partie, lues prudemment : { allume, accueillie, n } (illisible : jamais allumé).
function escalesDe(game) {
  const e = isObj(game?.escales) ? game.escales : {};
  const allume = isDayString(e.allume) ? e.allume : '';
  return { allume, accueillie: !allume || e.accueillie === true, n: count(e.n) };
}

/**
 * Où en sont le phare et ses escales, lecture pure : { debout, allume (sa lanterne brille cette semaine), semaine (lundi),
 * escale: null | 'en-route' (allumé aujourd'hui : le voilier arrive demain) | 'attend', decor (celui que laissera la
 * prochaine escale), n (escales accueillies), cout: { allumer, accueillir } }.
 */
export function etatEscales(game, ledger, now) {
  const day = gameDay(now);
  const e = escalesDe(game);
  const semaine = weekStart(day);
  return {
    debout: etatOuvrage(game, ledger, 'phare', now).fini,
    allume: !!e.allume && weekStart(e.allume) === semaine,
    semaine,
    escale: e.accueillie ? null : day > e.allume ? 'attend' : 'en-route',
    decor: DECORS_ESCALE[e.n % DECORS_ESCALE.length],
    n: e.n,
    cout: ESCALE,
  };
}

/** Pourquoi on ne peut pas allumer le phare (ou null). Ordre : pas debout, escale en route ou qui attend, déjà allumé, ce qui manque. */
export function refusAllumer(game, ledger, params, now) {
  const e = etatEscales(game, ledger, now);
  if (!e.debout) return 'Le phare doit d’abord être debout.';
  if (e.escale === 'en-route') return 'Les plaisanciers arrivent demain.';
  if (e.escale === 'attend') return 'Des plaisanciers attendent au phare : accueille-les d’abord.';
  if (e.allume) return 'Déjà allumé cette semaine : le prochain, lundi.';
  return manque(game, ESCALE.allumer);
}

/** Allume le phare pour la semaine. Événement { type: 'phare-allume', cout }. */
export function allumerPhare(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusAllumer(ctx.game, ctx.ledger, params, now);
  if (refus) throw new Error(refus);
  const e = escalesDe(ctx.game);
  const g = structuredClone(ctx.game);
  g.resources.energy = round1(g.resources.energy - ESCALE.allumer.energy);
  g.escales = { allume: ctx.day, accueillie: false, n: e.n };
  ctx.game = g;
  ctx.events.push({ type: 'phare-allume', cout: ESCALE.allumer });
  return ctx.result();
}

/** Pourquoi on ne peut pas accueillir les plaisanciers (ou null). Ordre : pas d'escale, en route, familles d'abord, Nourriture. */
export function refusAccueillirEscale(game, ledger, params, now) {
  const e = etatEscales(game, ledger, now);
  if (!e.escale) return 'Aucun voilier au phare.';
  if (e.escale === 'en-route') return 'Le voilier arrive demain.';
  return familleDabord(game, ESCALE.accueillir.food, 'pour les plaisanciers') || manque(game, ESCALE.accueillir);
}

/**
 * Accueille les plaisanciers : la Nourriture est payée, leur décor va dans la remise, le voilier repart. Événement
 * { type: 'escale-accueillie', decor, cout }.
 */
export function accueillirEscale(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusAccueillirEscale(ctx.game, ctx.ledger, params, now);
  if (refus) throw new Error(refus);
  const e = escalesDe(ctx.game);
  const decor = DECORS_ESCALE[e.n % DECORS_ESCALE.length];
  const d = etatDecors(ctx.game);
  const g = structuredClone(ctx.game);
  g.resources.food = round1(g.resources.food - ESCALE.accueillir.food);
  g.escales = { allume: e.allume, accueillie: true, n: e.n + 1 };
  g.decors = { poses: d.poses, remise: [...d.remise, decor] };
  ctx.game = g;
  ctx.events.push({ type: 'escale-accueillie', decor, cout: ESCALE.accueillir });
  return ctx.result();
}
