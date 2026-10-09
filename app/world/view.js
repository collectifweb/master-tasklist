// Ce que le monde doit montrer, dérivé de l'état du jeu et des quêtes. Fonction pure (aucun DOM) :
// le monde et la carte en liste lisent la même vue, donc ils disent toujours la même chose.
import { QUARTIER_IDS, quartierOfTask } from '../core/domains.js';
import { niveauDe, niveauMax } from '../core/quartiers.js';
import { gameDay, daysUntil, daysBetween, dayOf, isSnowSeason, weekStart } from '../core/time.js';
import { findAnchors } from '../core/infer.js';
import { BATIMENTS, BATIMENT_IDS, batimentsDuVillage, etatCulture, refusConstruire, logements, produitCeJour, PRODUCTION } from '../core/batiments.js';
import { placesParChalet } from '../core/quartiers.js';
import { visiteurDeLaSemaine, commandeDeLaSemaine } from '../core/visiteurs.js';
import { IMPREVUS, degatDe } from '../core/imprevus.js';
import { alerteTempete } from '../core/hiver.js';
import { bandesGagnees } from '../core/village.js';
import { saisonDe } from '../core/objectifs.js';
import { CRATE_SPOTS, ANCHOR_OBJECT, SECTOR_LANDMARK, EMPLACEMENTS, TEMPETE_BORD } from './layout.js';

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
 * 'seme' | 'pousse' | 'mure', pour la cabane à sucre 'sucres' (mars et avril, lot B) ; refus : pourquoi on ne peut pas bâtir maintenant (null si possible) ; reste : jours
 * travaillés avant la récolte ; occupants : habitants logés dans un chalet (répartis dans l'ordre des chalets) ;
 * places : places par chalet (École) ; visiteur : sur le quai debout, { id, joursRestants } du visiteur de la semaine ;
 * commande : sur le quai debout, { id, livree } du visiteur à commande de la semaine (lot C) ;
 * degat : sur un bâtiment debout touché par un mauvais imprévu (core/imprevus.js), { type, joursRestants }.
 * Un emplacement posé sur une bande de terrain n'y est qu'une fois la bande gagnée (lot B).
 */
export function batimentsView(game, ledger = [], now = new Date()) {
  const g = { ...game, resources: { energy: 0, materials: 0, food: 0, ...(game.resources || {}) } };
  const debout = new Set(batimentsDuVillage(g).map((b) => b.id));
  let loges = logements(g).habitants;
  const places = placesParChalet(g);
  const bandes = bandesGagnees(g.habitants);
  const out = [];
  for (const type of BATIMENT_IDS) {
    EMPLACEMENTS[type].forEach((slot, i) => {
      if (slot.bande && !bandes.includes(slot.bande)) return; // sa bande n'est pas encore gagnée sur la forêt
      const id = `${type}-${i + 1}`;
      const b = { id, type, bati: debout.has(id), etat: 'vide', refus: null, reste: 0, occupants: 0, places };
      if (!b.bati) b.refus = refusConstruire(g, type, id);
      else if (BATIMENTS[type].culture) {
        const c = etatCulture(g, ledger, id, now);
        b.etat = !c.semee ? 'bati' : c.mure ? 'mure' : c.jours > 0 ? 'pousse' : 'seme';
        b.reste = c.reste;
      } else {
        b.etat = 'bati';
        if (type === 'chalet') { b.occupants = Math.min(places, loges); loges -= b.occupants; }
        if (type === 'cabane' && produitCeJour('cabane', gameDay(now))) b.etat = 'sucres'; // le temps des sucres : elle fume
        if (type === 'quai') {
          const v = visiteurDeLaSemaine(g, now);
          if (v) b.visiteur = { id: v.id, joursRestants: v.joursRestants };
          const c = commandeDeLaSemaine(g, ledger, now);
          if (c) b.commande = { id: c.id, livree: c.livree };
        }
      }
      if (b.bati) {
        const d = degatDe(g, id, now);
        if (d) b.degat = { type: d.type, joursRestants: d.joursRestants };
      }
      out.push(b);
    });
  }
  return out;
}

/**
 * Vue complète. options : { now (Date|ISO, obligatoire), anchors (content/fr-CA/ancres.json, facultatif),
 * ledger (registre, pour les cultures et les imprévus ; facultatif) }. Ne lit que des champs connus et tolère un état
 * partiel. imprevus : les bons imprévus reçus aujourd'hui (aurore, peche, trouvaille, orignal), que l'île montre le jour même.
 * Hiver (lot H) : neige, l'île sous la neige (du 15 novembre au 30 avril) ; tempete, l'alerte en cours { jour,
 * joursRestants, crans, max } ou null ; avis, son front de givre { sector, progress (0 à l'annonce, 1 le jour même) } ;
 * bandes (lot F) : les bandes de terrain gagnées sur la forêt, selon les habitants (core/village.js). fetes (lot N) :
 * 'repas' la semaine où le repas est servi (registre, repas:{lundi}), 'tire' ou 'tire-cabane' (cabane bâtie) une fois la
 * partie de sucre faite (game.sucres), jusqu'à la fin du temps des sucres (30 avril : la neige fond) ; places : FETE_SPOTS.
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

  const reg = Array.isArray(ledger) ? ledger : [];
  const batiments = batimentsView(g, reg, now ?? new Date());
  const imprevus = new Set();
  for (const e of reg) if (e && e.type === 'imprevu' && e.day === today && Object.hasOwn(IMPREVUS.bons, e.imprevu)) imprevus.add(e.imprevu);
  const a = alerteTempete(list, g, reg, now ?? new Date());
  const tempete = a ? { jour: a.jour, joursRestants: a.joursRestants, crans: a.crans, max: a.max } : null;
  const avis = a ? { sector: TEMPETE_BORD, progress: 1 - a.joursRestants / daysBetween(a.debut, a.jour) } : null; // 3 ou 6 jours (tour de guet)
  const fetes = new Set();
  const lundi = weekStart(today);
  if (reg.some((e) => e && e.key === `repas:${lundi}`)) fetes.add('repas');
  if (g.sucres && g.sucres === saisonDe(today).cle && PRODUCTION.cabane.mois.includes(Number(today.slice(5, 7)))) fetes.add(batiments.some((b) => b.type === 'cabane' && b.bati) ? 'tire-cabane' : 'tire');
  return { today, sectors, crates, reflets, refletAnchors, batiments, imprevus, fetes, neige: isSnowSeason(today), tempete, avis, bandes: bandesGagnees(g.habitants) };
}
