// Ce que le monde doit montrer, dérivé de l'état du jeu et des quêtes. Fonction pure (aucun DOM) :
// le monde et la carte en liste lisent la même vue, donc ils disent toujours la même chose.
import { QUARTIER_IDS, quartierOfTask } from '../core/domains.js';
import { niveauDe, niveauMax, refusMonter } from '../core/quartiers.js';
import { gameDay, daysUntil, daysBetween, dayOf, isSnowSeason, weekStart } from '../core/time.js';
import { findAnchors } from '../core/infer.js';
import {
  BATIMENTS, BATIMENT_IDS, batimentsDuVillage, etatCulture, refusConstruire, logements, produitCeJour, PRODUCTION, recolteDe, stockage,
  refusAccueillir,
} from '../core/batiments.js';
import { placesParChalet } from '../core/quartiers.js';
import { visiteurDeLaSemaine, commandeDeLaSemaine, refusLivrer } from '../core/visiteurs.js';
import { IMPREVUS, degatDe } from '../core/imprevus.js';
import { alerteTempete } from '../core/hiver.js';
import { bandesGagnees } from '../core/village.js';
import { saisonDe } from '../core/objectifs.js';
import { etatOuvrage, OUVRAGE_IDS } from '../core/travaux.js';
import { etatDecors } from '../core/decors.js';
import { etatEscales, refusAccueillirEscale } from '../core/escales.js';
import { CRATE_SPOTS, ANCHOR_OBJECT, SECTOR_LANDMARK, EMPLACEMENTS, TEMPETE_BORD } from './layout.js';

export const MAX_CRATES = CRATE_SPOTS.length;
export const REFLET_DAYS = 14;
export const CRATE_DAYS = 7;

/**
 * Un quartier : son niveau acheté (game.niveaux, core/quartiers.js), le plus haut possible, et ses quêtes à faire
 * (quetes : celles que « Voir les quêtes » montre). Tous les quartiers sont ouverts. monte : le niveau qu'on peut acheter
 * maintenant (refusMonter vide, la pastille de sa plaque, lot L), sinon 0.
 */
export function sectorView(id, game, tasks = [], ledger = []) {
  const quetes = tasks.filter((t) => t && t.status === 'todo' && quartierOfTask(t) === id).length;
  const niveau = niveauDe(game, id);
  return { id, niveau, max: niveauMax(id), quetes, monte: game.resources && !refusMonter(game, ledger, { quartier: id }) ? niveau + 1 : 0 };
}

/**
 * Bâtiments de l'île, un par emplacement (EMPLACEMENTS), dans l'ordre du catalogue :
 * { id, type, bati, etat, refus, reste, occupants }. etat : 'vide' (pas encore bâti), 'bati', et pour une culture
 * 'seme' | 'pousse' | 'mure', pour la cabane à sucre 'sucres' (mars et avril, lot B) ; refus : pourquoi on ne peut pas bâtir maintenant (null si possible) ; reste : jours
 * travaillés avant la récolte ; occupants : habitants logés dans un chalet (répartis dans l'ordre des chalets) ;
 * places : places par chalet (École) ; visiteur : sur le quai debout, { id, joursRestants } du visiteur de la semaine ;
 * commande : sur le quai debout, { id, livree } du visiteur à commande de la semaine (lot C) ;
 * degat : sur un bâtiment debout touché par un mauvais imprévu (core/imprevus.js), { type, joursRestants }.
 * bulle (lot L) : ce qui attend un geste, lu au cœur. { kind: 'recolte', n, direct } sur une culture mûre (n : la récolte ;
 * direct : elle tient entière dans la réserve, sans dégât, et un toucher sur la bulle la fait) ; { kind: 'famille' } sur le
 * premier chalet qui a une place, quand une famille peut venir (refusAccueillir vide) ; { kind: 'commande' } sur le quai,
 * quand la commande de la semaine peut partir (refusLivrer vide).
 * Un emplacement posé sur une bande de terrain n'y est qu'une fois la bande gagnée (lot B).
 */
export function batimentsView(game, ledger = [], now = new Date()) {
  const g = { ...game, resources: { energy: 0, materials: 0, food: 0, ...(game.resources || {}) } };
  const debout = new Set(batimentsDuVillage(g).map((b) => b.id));
  let loges = logements(g).habitants;
  const places = placesParChalet(g);
  const bandes = bandesGagnees(g.habitants);
  let famille = !refusAccueillir(g);
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
        if (c.mure) b.bulle = { kind: 'recolte', n: recolteDe(g, BATIMENTS[type].culture), direct: false };
      } else {
        b.etat = 'bati';
        if (type === 'chalet') {
          b.occupants = Math.min(places, loges); loges -= b.occupants;
          if (famille && b.occupants < places) { b.bulle = { kind: 'famille' }; famille = false; }
        }
        if (type === 'cabane' && produitCeJour('cabane', gameDay(now))) b.etat = 'sucres'; // le temps des sucres : elle fume
        if (type === 'quai') {
          const v = visiteurDeLaSemaine(g, now);
          if (v) b.visiteur = { id: v.id, joursRestants: v.joursRestants };
          const c = commandeDeLaSemaine(g, ledger, now);
          if (c) b.commande = { id: c.id, livree: c.livree };
          if (c && !c.livree && !refusLivrer(g, ledger, {}, now)) b.bulle = { kind: 'commande' };
        }
      }
      if (b.bati) {
        const d = degatDe(g, id, now);
        if (d) b.degat = { type: d.type, joursRestants: d.joursRestants };
        // la récolte d'un toucher : pas de dégât (l'ours prend sa part) et assez de place dans la réserve, sinon la fiche
        // s'ouvre avec son avertissement (js/ui/batiment.js, la même comparaison)
        if (b.bulle?.kind === 'recolte') b.bulle.direct = !d && stockage(g) - g.resources.food >= b.bulle.n;
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
 * joursRestants, crans, max, ville (lot Q : la ville de la prévision, notée avec une tempête venue de la vraie météo, sinon null) } ou null ; avis, son front de givre { sector, progress (0 à l'annonce, 1 le jour même) } ;
 * bandes (lot F) : les bandes de terrain gagnées sur la forêt, selon les habitants (core/village.js). fetes (lot N) :
 * 'repas' la semaine où le repas est servi (registre, repas:{lundi}), 'tire' ou 'tire-cabane' (cabane bâtie) une fois la
 * partie de sucre faite (game.sucres), jusqu'à la fin du temps des sucres (30 avril : la neige fond) ; places : FETE_SPOTS.
 */
export function deriveView(game, tasks = [], { now, anchors, ledger } = {}) {
  const g = game || {};
  const today = gameDay(now ?? new Date());
  const sectors = {};
  const list = Array.isArray(tasks) ? tasks : [];
  const reg = Array.isArray(ledger) ? ledger : [];
  for (const id of QUARTIER_IDS) sectors[id] = sectorView(id, g, list, reg);

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

  const batiments = batimentsView(g, reg, now ?? new Date());
  const imprevus = new Set();
  for (const e of reg) if (e && e.type === 'imprevu' && e.day === today && Object.hasOwn(IMPREVUS.bons, e.imprevu)) imprevus.add(e.imprevu);
  const a = alerteTempete(list, g, reg, now ?? new Date());
  // ville : celle de la prévision, pour une tempête venue de la vraie météo (lot Q)
  const tempete = a ? { jour: a.jour, joursRestants: a.joursRestants, crans: a.crans, max: a.max, ville: a.ville } : null;
  const avis = a ? { sector: TEMPETE_BORD, progress: 1 - a.joursRestants / daysBetween(a.debut, a.jour) } : null; // 3 ou 6 jours (tour de guet)
  const fetes = new Set();
  const lundi = weekStart(today);
  if (reg.some((e) => e && e.key === `repas:${lundi}`)) fetes.add('repas');
  if (g.sucres && g.sucres === saisonDe(today).cle && PRODUCTION.cabane.mois.includes(Number(today.slice(5, 7)))) fetes.add(batiments.some((b) => b.type === 'cabane' && b.bati) ? 'tire-cabane' : 'tire');
  // Grands travaux (lot O) : les étapes finies de chaque ouvrage, et celle que les ouvriers bâtissent
  const travaux = Object.fromEntries(OUVRAGE_IDS.map((id) => { const e = etatOuvrage(g, reg, id, now ?? new Date()); return [id, { finies: e.finies, enCours: !!e.enCours }]; }));
  // le phare allumé pour la semaine et le voilier des plaisanciers qui attend (lot Y) ; la bulle, quand on peut les accueillir
  const esc = etatEscales(g, reg, now ?? new Date());
  if (esc.debout) Object.assign(travaux.phare, { allume: esc.allume, escale: esc.escale === 'attend' });
  const escale = esc.escale === 'attend' ? { bulle: !refusAccueillirEscale(g, reg, {}, now ?? new Date()) } : null;
  // décors posés par le joueur (lot K), dans l'ordre des coins ; les coins libres servent au mode de pose
  const d = etatDecors(g);
  const decors = { poses: Object.entries(d.poses).map(([coin, decor]) => ({ coin, decor })), libres: d.libres };
  return { today, sectors, crates, reflets, refletAnchors, batiments, imprevus, fetes, neige: isSnowSeason(today), tempete, avis, bandes: bandesGagnees(g.habitants), travaux, decors, escale };
}
