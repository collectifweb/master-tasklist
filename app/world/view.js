// Ce que le monde doit montrer, dérivé de l'état du jeu et des quêtes. Fonction pure (aucun DOM) :
// le monde et la carte en liste lisent la même vue, donc ils disent toujours la même chose.
import { QUARTIER_IDS, quartierOfTask } from '../core/domains.js';
import { niveauQuartier, NIVEAUX_QUARTIER, QUARTIER_PALIER } from '../core/village.js';
import { gameDay, daysUntil, daysBetween, dayOf } from '../core/time.js';
import { findAnchors } from '../core/infer.js';
import { currentSeance } from '../core/cote-a-cote.js';
import { CRATE_SPOTS, ANCHOR_OBJECT, SECTOR_LANDMARK } from './layout.js';

export const MAX_CRATES = CRATE_SPOTS.length;
export const REFLET_DAYS = 14;
export const CRATE_DAYS = 7;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Tâches qu'il a fallu pour atteindre le niveau v (0 pour le niveau 0), comme dans core/village.js.
const depuis = (v) => (v <= 0 ? 0 : v <= NIVEAUX_QUARTIER.length
  ? NIVEAUX_QUARTIER[v - 1]
  : NIVEAUX_QUARTIER[NIVEAUX_QUARTIER.length - 1] + QUARTIER_PALIER * (v - NIVEAUX_QUARTIER.length));

/**
 * Un quartier : tâches comptées, niveau ({ niveau, taches, suivant }) et progres (0 à 1) vers le niveau suivant.
 * Tous les quartiers sont ouverts.
 */
export function sectorView(id, game) {
  const taches = Math.max(0, Math.floor(num(game.quartiers && game.quartiers[id])));
  const lv = niveauQuartier(taches);
  const from = depuis(lv.niveau);
  const progres = Math.max(0, Math.min(1, (taches - from) / Math.max(1, lv.suivant.seuil - from)));
  return { id, ...lv, progres };
}

/**
 * Vue complète. options : { now (Date|ISO, obligatoire), anchors (content/fr-CA/ancres.json, facultatif) }.
 * Ne lit que des champs connus et tolère un état partiel (quartiers absents).
 */
export function deriveView(game, tasks = [], { now, anchors } = {}) {
  const g = game || {};
  const today = gameDay(now ?? new Date());
  const sectors = {};
  for (const id of QUARTIER_IDS) sectors[id] = sectorView(id, g);

  const list = Array.isArray(tasks) ? tasks : [];
  const crates = [];
  for (const t of list) {
    if (!t || t.status !== 'todo' || !t.deadline) continue;
    let days = null;
    try { days = daysUntil(t.deadline, now); } catch { days = null; }
    if (days === null || days > CRATE_DAYS) continue;
    crates.push({ id: `caisse-${t.id}`, taskId: t.id, days, sector: quartierOfTask(t) });
  }
  crates.sort((a, b) => a.days - b.days || String(a.taskId).localeCompare(String(b.taskId)));
  crates.length = Math.min(crates.length, MAX_CRATES);

  // objets-reflets : ancre trouvée dans le titre d'une quête finie depuis 14 jours ou moins → objet de la carte
  const reflets = new Set();
  const refletAnchors = new Set();
  if (anchors && Array.isArray(anchors.anchors)) {
    for (const t of list) {
      if (!t || !t.doneAt || t.status === 'archived') continue;
      const d = dayOf(t.doneAt);
      if (!d || daysBetween(d, today) > REFLET_DAYS) continue;
      for (const a of findAnchors(String(t.task ?? ''), anchors)) {
        refletAnchors.add(a.id);
        const obj = ANCHOR_OBJECT[a.id] ?? SECTOR_LANDMARK[a.quartier];
        if (obj) reflets.add(obj);
      }
    }
  }

  // Côte à côte : pendant une séance, Fanal travaille au bord de la Place, tourné vers le quartier de la quête
  const seance = currentSeance(g, now ?? new Date());
  const seanceTask = seance && !seance.oubliee ? list.find((t) => t && String(t.id) === seance.taskId && t.status === 'todo') : null;
  const fanal = seanceTask ? { taskId: seance.taskId, sector: quartierOfTask(seanceTask) } : null;

  return { today, sectors, crates, reflets, refletAnchors, fanal };
}
