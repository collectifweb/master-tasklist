// Ce que le monde doit montrer, dérivé de l'état du jeu et des quêtes. Fonction pure (aucun DOM) :
// le monde et le plan accessible lisent la même vue, donc ils disent toujours la même chose.
import { SECTORS, SECTOR_IDS, sectorOfTask } from '../core/domains.js';
import { SECTOR_THRESHOLDS, CROP_STAGES } from '../core/economy.js';
import { gameDay, daysUntil, daysBetween, dayOf } from '../core/time.js';
import { findAnchors } from '../core/infer.js';
import {
  TILES_TO_REPAIR, LUEUR_PER_TILE, PLOT_SLOTS, BUILD_SLOTS, MODEL_SECTOR, CRATE_SPOTS, LISIERE_POSTS, LANDMARKS,
  ANCHOR_OBJECT, SECTOR_LANDMARK,
} from './layout.js';

const LANDMARK_IDS = new Set(LANDMARKS.map((l) => l.id));

export const ETATS = ['eteint', 'reparer', 'prosperer', 'autonome'];
export const MAX_CRATES = CRATE_SPOTS.length;
export const REFLET_DAYS = 14;
export const CRATE_DAYS = 7;
/** Secteurs fermés visibles sous la cendre : ceux qui ouvrent dans les deux chapitres suivants. */
export const ASH_HORIZON = 2;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Avancement d'un secteur ouvert dans son palier : cases rallumées (stade 0), pousse en cours (0, 1, 2). */
export function tileProgress(lueur, stage) {
  if (stage >= 1) return { lit: TILES_TO_REPAIR, germ: 0 };
  const lit = Math.min(TILES_TO_REPAIR, Math.floor(lueur / LUEUR_PER_TILE + 1e-9));
  if (lit >= TILES_TO_REPAIR) return { lit, germ: 0 };
  const frac = (lueur - lit * LUEUR_PER_TILE) / LUEUR_PER_TILE;
  return { lit, germ: frac >= 2 / 3 ? 2 : frac >= 1 / 3 ? 1 : 0 };
}

export function nextThreshold(stage) {
  return SECTOR_THRESHOLDS.find((t) => t.stage === stage + 1) ?? null;
}

export function sectorView(id, game) {
  const s = (game.sectors && game.sectors[id]) || { open: false, stage: 0 };
  const lueur = Math.max(0, num(game.lueur && game.lueur[id]));
  const chapter = SECTORS[id].chapter;
  const current = num(game.chapter && game.chapter.number) || 1;
  const visibility = s.open ? 'open' : chapter <= current + ASH_HORIZON ? 'cendre' : 'brume';
  const stage = s.open ? Math.max(0, Math.min(3, Math.round(num(s.stage)))) : 0;
  const { lit, germ } = s.open ? tileProgress(lueur, stage) : { lit: 0, germ: 0 };
  return { id, chapter, visibility, stage, etat: ETATS[stage], lueur, lit, germ, next: nextThreshold(stage) };
}

/** Poteaux de lisière actifs : sur une frontière entre un secteur ouvert et un secteur sous la cendre. */
export function postsFor(sectors) {
  const isOpen = (id) => sectors[id] && sectors[id].visibility === 'open';
  return LISIERE_POSTS.filter((p) => isOpen(p.between[0]) !== isOpen(p.between[1])
    && sectors[p.between[0]].visibility !== 'brume' && sectors[p.between[1]].visibility !== 'brume').map((p) => p.id);
}

function assignSlots(list, slotsBySector, taken) {
  const used = new Map();
  const out = [];
  for (const p of list) {
    const model = String(p.model ?? p.type ?? 'caisse');
    const sector = SECTOR_IDS.includes(p.sector) ? p.sector : (MODEL_SECTOR[model] ?? 'place');
    let r = Number(p.r), c = Number(p.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) {
      const slots = slotsBySector[sector] ?? [];
      const n = used.get(sector) ?? 0;
      let k = Number.isInteger(p.slot) ? p.slot : n;
      while (k < slots.length && taken.has(`${sector}:${k}`)) k++;
      if (k >= slots.length) continue; // plus de place : on n'invente pas de case
      taken.add(`${sector}:${k}`);
      used.set(sector, k + 1);
      ({ r, c } = slots[k]);
    }
    out.push({ id: String(p.id ?? `${model}-${out.length}`), model, sector, r, c, state: p.state ?? null });
  }
  return out;
}

/**
 * Vue complète. options : { now (Date|ISO, obligatoire), anchors (content/fr-CA/ancres.json, facultatif) }.
 * Ne lit que des champs connus et tolère un état partiel (secteurs, parcelles, constructions absents).
 */
export function deriveView(game, tasks = [], { now, anchors } = {}) {
  const g = game || {};
  const today = gameDay(now ?? new Date());
  const sectors = {};
  for (const id of SECTOR_IDS) sectors[id] = sectorView(id, g);

  // crop null = parcelle vide (sol seul). Sous un voile, stage peut valoir x,5 : on montre le stade entier atteint.
  const plots = (Array.isArray(g.plots) ? g.plots : []).slice(0, PLOT_SLOTS.length).map((p, i) => {
    const crop = ['courge', 'patate', 'ble'].includes(p && p.crop) ? p.crop : null;
    const need = crop ? CROP_STAGES[crop] ?? 2 : 0;
    const slot = Number.isInteger(p && p.slot) && p.slot < PLOT_SLOTS.length ? p.slot : i;
    const stage = crop ? Math.floor(Math.max(0, Math.min(need, num(p && p.stage))) + 1e-9) : 0;
    return { id: String((p && p.id) ?? `parcelle-${i}`), crop, need, stage, slot, ripe: !!crop && stage >= need };
  });

  // une construction qui porte l'identifiant d'un repère fixe (ex. { id: 'tour', state: 'reparee' }) en donne l'état
  const raw = Array.isArray(g.placements) ? g.placements.filter((p) => p && typeof p === 'object') : [];
  const landmarkState = {};
  for (const p of raw) if (LANDMARK_IDS.has(String(p.id))) landmarkState[p.id] = p.state ?? null;
  const placements = assignSlots(raw.filter((p) => !LANDMARK_IDS.has(String(p.id))), BUILD_SLOTS, new Set());

  const list = Array.isArray(tasks) ? tasks : [];
  const crates = [];
  for (const t of list) {
    if (!t || t.status !== 'todo' || !t.deadline) continue;
    let days = null;
    try { days = daysUntil(t.deadline, now); } catch { days = null; }
    if (days === null || days > CRATE_DAYS) continue;
    crates.push({ id: `caisse-${t.id}`, taskId: t.id, days, sector: sectorOfTask(t) });
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
        const obj = ANCHOR_OBJECT[a.id] ?? SECTOR_LANDMARK[a.sector];
        if (obj) reflets.add(obj);
      }
    }
  }

  const days = Array.isArray(g.lisiereDays) ? g.lisiereDays : [];
  const lisiere = days.includes(today) || !!(g.daily && g.daily.day === today && g.daily.lisiere);
  const posts = postsFor(sectors);

  // Avis annoncé : le Front avance de l'annonce (progress 0) à la veille du jour J (progress 1)
  const cur = g.avis && g.avis.current;
  let avis = null;
  if (cur && SECTOR_IDS.includes(cur.sector) && cur.day) {
    const from = cur.announcedOn || today;
    const total = Math.max(1, daysBetween(from, cur.day));
    let left = total;
    try { left = Math.max(0, daysBetween(today, cur.day)); } catch { left = total; }
    avis = {
      id: String(cur.id ?? 'avis'), sector: cur.sector, day: cur.day, announcedOn: from, force: num(cur.force),
      braseros: Math.max(0, Math.min(3, Math.round(num(cur.braseros)))), daysLeft: left,
      progress: Math.max(0, Math.min(1, (total - left) / Math.max(1, total - 1))),
    };
  }
  const veils = (g.avis && Array.isArray(g.avis.veils) ? g.avis.veils : [])
    .filter((x) => x && SECTOR_IDS.includes(x.sector) && num(x.cells) > 0)
    .map((x) => ({ avis: x.avis ?? null, sector: x.sector, cells: Math.min(2, Math.round(num(x.cells))) }));

  return {
    today,
    sectors,
    plots,
    placements,
    crates,
    reflets,
    refletAnchors,
    lisiere,
    posts,
    avis,
    veils,
    landmarkState,
    // semaine 3 : la Tour se répare en la construisant (objectif du chapitre 1), plus au palier de la Place
    tourRepaired: ['reparee', 'repare', 'reparer'].includes(landmarkState.tour),
    filLibre: Math.max(0, num(g.filLibre)),
    confidence: num(g.resources && g.resources.confidence),
    chapter: num(g.chapter && g.chapter.number) || 1,
  };
}
