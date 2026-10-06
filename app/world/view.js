// Ce que le monde doit montrer, dérivé de l'état du jeu et des quêtes. Fonction pure (aucun DOM) :
// le monde et la carte en liste lisent la même vue, donc ils disent toujours la même chose.
import { QUARTIER_IDS, quartierOfTask } from '../core/domains.js';
import { niveauDe, niveauMax } from '../core/quartiers.js';
import { gameDay, daysUntil, daysBetween, dayOf } from '../core/time.js';
import { findAnchors } from '../core/infer.js';
import { BATIMENTS, BATIMENT_IDS, batimentsDuVillage, etatCulture, refusConstruire, logements } from '../core/batiments.js';
import { placesParChalet } from '../core/quartiers.js';
import { CRATE_SPOTS, ANCHOR_OBJECT, SECTOR_LANDMARK, EMPLACEMENTS } from './layout.js';

export const MAX_CRATES = CRATE_SPOTS.length;
export const REFLET_DAYS = 14;
export const CRATE_DAYS = 7;

/**
 * Un quartier : son niveau acheté (game.niveaux, core/quartiers.js), le plus haut possible, et ses quêtes à faire
 * (quetes : celles que « Voir les quêtes » montre). Tous les quartiers sont ouverts.
 */
export function sectorView(id, game, tasks = []) {
  const quetes = tasks.filter((t) => t && t.status === 'todo' && quartierOfTask(t) === id).length;
  return { id, niveau: niveauDe(game, id), max: niveauMax(id), quetes };
}

/**
 * Bâtiments de l'île, un par emplacement (EMPLACEMENTS), dans l'ordre du catalogue :
 * { id, type, bati, etat, refus, reste, occupants }. etat : 'vide' (pas encore bâti), 'bati', et pour une culture
 * 'seme' | 'pousse' | 'mure' ; refus : pourquoi on ne peut pas bâtir maintenant (null si possible) ; reste : jours
 * travaillés avant la récolte ; occupants : habitants logés dans un chalet (répartis dans l'ordre des chalets) ;
 * places : places par chalet (École).
 */
export function batimentsView(game, ledger = [], now = new Date()) {
  const g = { ...game, resources: { energy: 0, materials: 0, food: 0, ...(game.resources || {}) } };
  const debout = new Set(batimentsDuVillage(g).map((b) => b.id));
  let loges = logements(g).habitants;
  const places = placesParChalet(g);
  const out = [];
  for (const type of BATIMENT_IDS) {
    EMPLACEMENTS[type].forEach((_, i) => {
      const id = `${type}-${i + 1}`;
      const b = { id, type, bati: debout.has(id), etat: 'vide', refus: null, reste: 0, occupants: 0, places };
      if (!b.bati) b.refus = refusConstruire(g, type);
      else if (BATIMENTS[type].culture) {
        const c = etatCulture(g, ledger, id, now);
        b.etat = !c.semee ? 'bati' : c.mure ? 'mure' : c.jours > 0 ? 'pousse' : 'seme';
        b.reste = c.reste;
      } else {
        b.etat = 'bati';
        if (type === 'chalet') { b.occupants = Math.min(places, loges); loges -= b.occupants; }
      }
      out.push(b);
    });
  }
  return out;
}

/**
 * Vue complète. options : { now (Date|ISO, obligatoire), anchors (content/fr-CA/ancres.json, facultatif),
 * ledger (registre, pour les cultures ; facultatif) }. Ne lit que des champs connus et tolère un état partiel.
 */
export function deriveView(game, tasks = [], { now, anchors, ledger } = {}) {
  const g = game || {};
  const today = gameDay(now ?? new Date());
  const sectors = {};
  const list = Array.isArray(tasks) ? tasks : [];
  for (const id of QUARTIER_IDS) sectors[id] = sectorView(id, g, list);

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

  const batiments = batimentsView(g, Array.isArray(ledger) ? ledger : [], now ?? new Date());
  return { today, sectors, crates, reflets, refletAnchors, batiments };
}
