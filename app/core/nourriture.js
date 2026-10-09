// Ce que la Nourriture achète (lot N, choix d'Alex du 9 octobre 2026). Une fois le village plein, la réserve restait au
// plafond (mesuré : de 0,3 à 15,6 Nourriture perdues par semaine selon le joueur simulé, avec le marchand et les commandes).
// Le repas de la semaine : une fois par semaine de jeu (lundi au dimanche), le jour choisi, le village partage un repas sur
// la Place : de la Nourriture contre de l'Énergie, la ressource qui manque le plus souvent (simulation du lot C). Il attend
// une première famille. Noté au registre sous repas:{lundi} (clé unique : deux appareils ne le servent jamais deux fois) ;
// ne pas le servir ne fait rien perdre ; rien dans les tâches. La partie de sucre (objectif de printemps) est dans
// objectifs.js, le sirop dans batiments.js.
// Même forme que quests.js : (tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }.
import { Ctx } from './quests.js';
import { gameDay, weekStart } from './time.js';
import { round1 } from './reward.js';
import { hasKey } from './ledger.js';
import { logements, entierHaut } from './batiments.js';
import { suivreObjectifs } from './objectifs.js';

/** Le repas : ce qu'il coûte (donne) et ce qu'il rapporte (recoit). Valeurs de départ, à régler par la simulation (o). */
export const REPAS = { donne: { food: 15 }, recoit: { energy: 10 } };
const repasKey = (lundi) => `repas:${lundi}`;

/** Le repas de la semaine : { semaine (lundi), servi, donne, recoit }. Lecture pure de la date et du registre. */
export function repasDeLaSemaine(game, ledger, now) {
  const semaine = weekStart(gameDay(now));
  return { semaine, servi: hasKey(Array.isArray(ledger) ? ledger : [], repasKey(semaine)), donne: REPAS.donne, recoit: REPAS.recoit };
}

/** Pourquoi on ne peut pas servir le repas maintenant (ou null). Ordre : famille, déjà servi, Nourriture. */
export function refusServirRepas(game, ledger, params, now) {
  if (!logements(game).habitants) return 'Le repas attend une première famille au village.';
  if (repasDeLaSemaine(game, ledger, now).servi) return 'Déjà servi cette semaine : le prochain repas, lundi.';
  const m = round1(REPAS.donne.food - game.resources.food);
  return m > 0 ? `Il manque ${entierHaut(m)} Nourriture.` : null;
}

/**
 * Sert le repas de la semaine : la Nourriture est payée (game.set), l'Énergie arrive par l'entrée repas:{lundi}.
 * Événement { type: 'repas', donne, recoit }, puis le gain (reward, source 'repas').
 */
export function servirRepas(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusServirRepas(ctx.game, ctx.ledger, params, now);
  if (refus) throw new Error(refus);
  const semaine = weekStart(ctx.day);
  const g = structuredClone(ctx.game);
  g.resources.food = round1(g.resources.food - REPAS.donne.food);
  ctx.game = g;
  ctx.events.push({ type: 'repas', donne: { ...REPAS.donne }, recoit: { ...REPAS.recoit } });
  ctx.append({ key: repasKey(semaine), at: ctx.iso, day: ctx.day, type: 'repas', semaine, pe: 0, energy: REPAS.recoit.energy, materials: 0 }, 'repas');
  suivreObjectifs(ctx);
  return ctx.result();
}
