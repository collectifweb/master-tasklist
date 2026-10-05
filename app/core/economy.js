// Applique les entrées du registre à l'état : plafonds de stock, surplus vers le Fil libre (2 pour 1),
// Confiance, seuils de secteur, chapitres. Fonctions pures : l'état d'entrée n'est jamais modifié.
import { gameDay, daysBetween, weekStart, addDays } from './time.js';
import { SECTORS } from './domains.js';
import { round1, round2 } from './reward.js';

export const CAP_STEPS = { energy: [40, 60, 90], materials: [150, 250] };
export const SURPLUS_PER_FIL = 2; // 2 de surplus = 1 de Fil libre
export const SECTOR_THRESHOLDS = [
  { stage: 1, name: 'reparer', lueur: 150 },
  { stage: 2, name: 'prosperer', lueur: 400 },
  { stage: 3, name: 'autonome', lueur: 750 },
];
export const WEEK_HELD_DAYS = 4;
export const CHAPTER_CONFIDENCE_BONUS = 2;
/** Confiance requise pour ouvrir le chapitre n (index = n). */
export const CHAPTER_GATES = { 2: 3, 3: 9, 4: 16, 5: 24, 6: 33, 7: 43, 8: 54 };
export const CHAPTER_MIN_DAYS = { 1: 3 };
export const CHAPTER_DEFAULT_MIN_DAYS = 12;
export const MAX_CHAPTER = 8;
export const CROP_STAGES = { courge: 2, patate: 3, ble: 4 };

/** Stade (0 à 3) atteint par un secteur ouvert selon sa Lueur. */
export function stageForLueur(lueur) {
  let stage = 0;
  for (const t of SECTOR_THRESHOLDS) if (lueur >= t.lueur) stage = t.stage;
  return stage;
}

export function stageName(stage) {
  return SECTOR_THRESHOLDS.find((t) => t.stage === stage)?.name ?? 'eteint';
}

/** Passe au palier de plafond suivant. Renvoie l'état inchangé s'il n'y en a plus. */
export function raiseCap(game, resource) {
  const steps = CAP_STEPS[resource];
  if (!steps) throw new Error('Ressource inconnue : ' + resource);
  const next = steps.find((s) => s > game.caps[resource]);
  if (next === undefined) return game;
  const g = structuredClone(game);
  g.caps[resource] = next;
  return g;
}

// Recalcule les stades des secteurs ouverts (ils ne baissent jamais). Renvoie les franchissements.
function refreshSectors(g) {
  const events = [];
  for (const id of Object.keys(g.sectors)) {
    const s = g.sectors[id];
    if (!s.open) continue; // la Lueur d'un secteur fermé reste sous la cendre
    const target = stageForLueur(g.lueur[id] || 0);
    for (let st = s.stage + 1; st <= target; st++) {
      events.push({ type: 'secteur-seuil', sector: id, stage: stageName(st) });
    }
    if (target > s.stage) s.stage = target;
  }
  return events;
}

function growPlots(g) {
  for (const p of g.plots) {
    const need = CROP_STAGES[p.crop] ?? 1;
    p.stage = Math.min(need, (p.stage || 0) + 1);
  }
}

function addResource(g, key, delta) {
  const cap = g.caps[key];
  const cur = g.resources[key];
  if (delta >= 0) {
    const room = Math.max(0, cap - cur);
    const kept = Math.min(delta, room);
    g.resources[key] = round1(cur + kept);
    const surplus = delta - kept;
    if (surplus > 0) g.filLibre = round2(g.filLibre + surplus / SURPLUS_PER_FIL);
    return surplus;
  }
  g.resources[key] = Math.max(0, round1(cur + delta));
  return 0;
}

/**
 * Applique une entrée du registre. Retourne { game, events }.
 * Une entrée `reward` (quête terminée) allume la lisière la première fois du jour de jeu :
 * +1 Confiance, cultures arrosées, et +1 Confiance par « semaine tenue » (4 jours sur 7).
 */
export function applyEntry(game, entry, now) {
  const g = structuredClone(game);
  const events = [];
  const day = gameDay(now);
  if (!g.daily || g.daily.day !== day) g.daily = { day, quests: 0, lisiere: false };

  const surplusE = addResource(g, 'energy', entry.energy || 0);
  const surplusM = addResource(g, 'materials', entry.materials || 0);
  if (surplusE + surplusM > 0) events.push({ type: 'surplus', energy: round1(surplusE), materials: round1(surplusM), filLibre: round2((surplusE + surplusM) / SURPLUS_PER_FIL) });

  if (entry.lueur && entry.lueur.sector in g.lueur) {
    g.lueur[entry.lueur.sector] = Math.max(0, round2(g.lueur[entry.lueur.sector] + (entry.lueur.amount || 0)));
  }
  g.filLibre = Math.max(0, round2(g.filLibre + (entry.filLibre || 0)));

  if (entry.type === 'reward' && (entry.pe || 0) >= 0) {
    g.daily.quests += 1;
    if (!g.daily.lisiere) {
      g.daily.lisiere = true;
      if (!g.lisiereDays.includes(day)) g.lisiereDays.push(day);
      g.resources.confidence += 1;
      growPlots(g);
      events.push({ type: 'lisiere-allumee', day });
      const ws = weekStart(day);
      const inWeek = g.lisiereDays.filter((d) => d >= ws && d <= addDays(ws, 6)).length;
      if (inWeek >= WEEK_HELD_DAYS && !g.weeksHeld.includes(ws)) {
        g.weeksHeld.push(ws);
        g.resources.confidence += 1;
        events.push({ type: 'semaine-tenue', weekStart: ws });
      }
    }
  }
  events.push(...refreshSectors(g));
  return { game: g, events };
}

export function applyEntries(game, entries, now) {
  let g = game;
  const events = [];
  for (const e of entries) {
    const r = applyEntry(g, e, now);
    g = r.game;
    events.push(...r.events);
  }
  return { game: g, events };
}

/** Dépense du Fil libre : l'ajoute à la Lueur du secteur choisi. */
export function directFilLibre(game, sectorId, amount) {
  if (!(sectorId in game.lueur)) throw new Error('Secteur inconnu : ' + sectorId);
  if (!(amount > 0) || amount > game.filLibre) throw new Error('Pas assez de Fil libre.');
  const g = structuredClone(game);
  g.filLibre = round2(g.filLibre - amount);
  g.lueur[sectorId] = round2(g.lueur[sectorId] + amount);
  return { game: g, events: refreshSectors(g) };
}

// ---- Chapitres ---------------------------------------------------------

/** { day, minDays, confidence, needed, canAdvance } pour le chapitre en cours (jour 1 = jour de début). */
export function chapterStatus(game, now) {
  const n = game.chapter.number;
  const day = daysBetween(game.chapter.startDay, gameDay(now)) + 1;
  const minDays = CHAPTER_MIN_DAYS[n] ?? CHAPTER_DEFAULT_MIN_DAYS;
  const needed = CHAPTER_GATES[n + 1] ?? null;
  const confidence = game.resources.confidence;
  return {
    number: n, day, minDays, confidence, needed,
    canAdvance: n < MAX_CHAPTER && day >= minDays && needed !== null && confidence >= needed,
  };
}

/** Ouvre le chapitre suivant : +2 Confiance, ouvre son secteur (la Lueur gardée sous la cendre perce d'un coup). */
export function advanceChapter(game, now) {
  const st = chapterStatus(game, now);
  if (!st.canAdvance) throw new Error("Le chapitre ne peut pas encore s'ouvrir.");
  const g = structuredClone(game);
  const next = st.number + 1;
  g.chapter = { number: next, startDay: gameDay(now), objectives: {} };
  g.resources.confidence += CHAPTER_CONFIDENCE_BONUS;
  const events = [{ type: 'chapitre', chapter: next }];
  for (const id of Object.keys(SECTORS)) {
    if (SECTORS[id].chapter === next) g.sectors[id].open = true;
  }
  events.push(...refreshSectors(g));
  return { game: g, events };
}
