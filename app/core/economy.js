// Applique les entrées du registre à l'état du jeu : Énergie, Matériaux (et Nourriture d'un premier pas), permis,
// tâches par quartier.
// Fonctions pures : l'état d'entrée n'est jamais modifié. Aucun plafond de stock : seul le plafond quotidien des
// points d'effort (reward.js) borne ce qu'une journée rapporte.
import { round1 } from './reward.js';
import { quartierOfEntry } from './ledger.js';
import { niveauQuartier } from './village.js';

/**
 * Applique une entrée du registre. Retourne { game, events }.
 * Ressources : le gain s'ajoute tel quel ; une écriture inverse ne fait jamais passer un stock sous zéro. Permis :
 * `entry.permis` s'ajoute aux permis en main (game.permis.dispo) ; aucune écriture inverse n'en porte.
 * Quartier : +1 tâche pour une quête payée (`reward`), −1 au Remballer (`reverse`), jamais sous zéro ; une étape ou un
 * bonus ne compte pas. Événement 'quartier-niveau' { quartier, niveau } quand un quartier atteint un nouveau niveau.
 */
export function applyEntry(game, entry) {
  const g = structuredClone(game);
  const events = [];
  g.resources.energy = Math.max(0, round1(g.resources.energy + (entry.energy || 0)));
  g.resources.materials = Math.max(0, round1(g.resources.materials + (entry.materials || 0)));
  if (entry.food) g.resources.food = Math.max(0, round1((Number(g.resources.food) || 0) + entry.food));
  if (entry.permis) g.permis = { ...g.permis, dispo: Math.max(0, Math.floor(Number(g.permis?.dispo) || 0) + entry.permis) };
  const q = quartierOfEntry(entry);
  const delta = entry.type === 'reward' ? 1 : entry.type === 'reverse' ? -1 : 0;
  if (delta && q) { // quartierOfEntry ne renvoie qu'un quartier connu
    const before = Number(g.quartiers[q]) || 0;
    g.quartiers[q] = Math.max(0, before + delta);
    const niveau = niveauQuartier(g.quartiers[q]).niveau;
    if (niveau > niveauQuartier(before).niveau) events.push({ type: 'quartier-niveau', quartier: q, niveau });
  }
  return { game: g, events };
}

export function applyEntries(game, entries) {
  let g = game;
  const events = [];
  for (const e of entries) {
    const r = applyEntry(g, e);
    g = r.game;
    events.push(...r.events);
  }
  return { game: g, events };
}
