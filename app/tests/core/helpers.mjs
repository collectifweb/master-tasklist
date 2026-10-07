// Aides communes aux tests (aucune donnée réelle : titres fictifs génériques).
import { createInitialState } from '../../core/index.js';

export const T0 = '2026-10-06T14:00:00Z'; // 10 h à Montréal, mardi 6 octobre 2026
export const at = (iso) => iso;
export const plusHours = (iso, h) => new Date(new Date(iso).getTime() + h * 3600000).toISOString();

export function task(over = {}) {
  return {
    id: 't1', task: 'Changer l’ampoule', domain: 'Maison',
    difficulty: 3, length: 2, priority: 5, status: 'todo', created: '2026-10-06', deadline: null,
    ...over,
  };
}

export function fresh(tasks = [], now = T0) {
  return { tasks, game: createInitialState(now), ledger: [] };
}

/**
 * Partie où seul le chalet reste à faire parmi les premiers pas (tâche, terminer, semer et famille notés la veille de T0).
 * Depuis le 7 octobre 2026, un pas se coche dès qu'il est vrai, même avant son tour (objectifs.js) : un test qui vérifie
 * autre chose sur une partie sans chalet garde ainsi ses montants d'avant, sans coup de pouce de pas. Le chalet reste le
 * pas courant : ni imprévu ni tempête, comme avant. Modifie `game` et le renvoie.
 */
export function avantLeChalet(game) {
  game.premiersPas = { tache: '2026-10-05', terminer: '2026-10-05', semer: '2026-10-05', famille: '2026-10-05' };
  return game;
}

/** Applique un résultat de quests.js à un « monde » { tasks, game, ledger }. */
export function step(world, fn, params, now = T0) {
  const r = fn(world.tasks, world.game, world.ledger, { gameRevision: null, ...params }, now);
  return { world: { tasks: r.tasks, game: r.game, ledger: [...world.ledger, ...r.entries] }, r };
}

export function sum(ledger, f) {
  return Math.round(ledger.reduce((s, e) => s + f(e), 0) * 100) / 100;
}
