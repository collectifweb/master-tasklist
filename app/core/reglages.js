// Réglages gardés avec la partie (game.reglages), donc les mêmes sur tous les appareils. Le prénom, lui, reste sur
// l'appareil (localStorage, js/content.js). Même forme que quests.js : (tasks, game, ledger, params, now) →
// { tasks, game, ops, entries, events }. Ne change que la partie : game.set suffit, rien au registre ni aux tâches.
import { Ctx } from './quests.js';

/** Valeurs du formulaire d'ajout tant que rien n'est réglé : priorité 5, durée 2, effort 3. */
export const QUETE_DEFAUT = Object.freeze({ priority: 5, length: 2, difficulty: 3 });

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const entier1a10 = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10;

/**
 * Quête par défaut du formulaire d'ajout : { priority, length, difficulty }, entiers de 1 à 10. Une valeur absente ou
 * invalide (partie sans réglages, texte, 0, 11, décimal…) reprend celle de QUETE_DEFAUT, champ par champ.
 */
export function queteDefaut(game) {
  const r = isObj(game?.reglages) && isObj(game.reglages.queteDefaut) ? game.reglages.queteDefaut : {};
  const out = {};
  for (const k of Object.keys(QUETE_DEFAUT)) out[k] = entier1a10(r[k]) ? r[k] : QUETE_DEFAUT[k];
  return out;
}

/**
 * Enregistre la quête par défaut. params : { priority, length, difficulty } (entiers de 1 à 10, les trois requis) ;
 * une valeur hors de 1 à 10 est refusée. Sans changement, aucune opération n'est envoyée.
 */
export function reglerQueteDefaut(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const quete = {};
  for (const k of Object.keys(QUETE_DEFAUT)) {
    if (!entier1a10(params?.[k])) throw new Error('La quête par défaut demande trois valeurs entières de 1 à 10.');
    quete[k] = params[k];
  }
  const avant = queteDefaut(ctx.game);
  const reglages = isObj(ctx.game.reglages) ? ctx.game.reglages : {};
  if (isObj(reglages.queteDefaut) && Object.keys(QUETE_DEFAUT).every((k) => reglages.queteDefaut[k] === avant[k] && avant[k] === quete[k])) return ctx.result();
  ctx.game = { ...ctx.game, reglages: { ...reglages, queteDefaut: quete } };
  ctx.events.push({ type: 'reglage-quete', quete });
  return ctx.result();
}
