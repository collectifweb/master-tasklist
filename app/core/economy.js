// Applique les entrées du registre à l'état : plafonds de stock, surplus vers le Fil libre (2 pour 1),
// Confiance, seuils de secteur, chapitres. Fonctions pures : l'état d'entrée n'est jamais modifié.
import { gameDay, daysBetween, weekStart, addDays, parseNow } from './time.js';
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
  const steps = Object.hasOwn(CAP_STEPS, resource) ? CAP_STEPS[resource] : null;
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

// Un stade par jour allumé ; un voile sur les Champs réduit la production de moitié (un demi-stade).
function growPlots(g) {
  const veiled = (g.avis?.veils ?? []).some((v) => v.sector === 'champs' && v.cells > 0);
  for (const p of g.plots) {
    if (!p.crop) continue; // parcelle vide
    const need = Object.hasOwn(CROP_STAGES, p.crop) ? CROP_STAGES[p.crop] : 1;
    p.stage = Math.min(need, (p.stage || 0) + (veiled ? 0.5 : 1));
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
    return { kept, surplus };
  }
  g.resources[key] = Math.max(0, round1(cur + delta));
  return { kept: delta, surplus: 0 };
}

const RECENT_HOURS = 48;

function purgeRecent(g, now) {
  const t = parseNow(now).getTime();
  for (const [k, v] of Object.entries(g.recentApplied)) {
    if (!v.at || t - new Date(v.at).getTime() > RECENT_HOURS * 3600000) delete g.recentApplied[k];
  }
}

// Annulation : retire ce que les gains annulés ont réellement apporté (la part passée au Fil libre par surplus
// comprise). Pour une clé inconnue de `recentApplied`, on retire le montant nominal de l'entrée.
function applyReversal(g, entry, events) {
  const nominal = { energy: 0, materials: 0, lueur: 0, filLibre: 0 };
  const applied = { energy: 0, materials: 0, lueur: 0, filLibre: 0 };
  for (const key of entry.reverses ?? []) {
    const a = g.recentApplied[key];
    if (!a) continue;
    for (const k of Object.keys(nominal)) { nominal[k] += a.nominal[k]; applied[k] += a.applied[k]; }
    delete g.recentApplied[key];
  }
  const want = {
    energy: -(entry.energy || 0), materials: -(entry.materials || 0),
    lueur: -(entry.lueur ? entry.lueur.amount || 0 : 0), filLibre: -(entry.filLibre || 0),
  };
  const remove = {};
  for (const k of Object.keys(want)) remove[k] = round2(applied[k] + Math.max(0, want[k] - nominal[k]));
  g.resources.energy = Math.max(0, round1(g.resources.energy - remove.energy));
  g.resources.materials = Math.max(0, round1(g.resources.materials - remove.materials));
  const sector = entry.lueur && entry.lueur.sector;
  if (Object.hasOwn(g.lueur, sector)) g.lueur[sector] = Math.max(0, round2(g.lueur[sector] - remove.lueur));
  g.filLibre = Math.max(0, round2(g.filLibre - remove.filLibre));
}

/**
 * Applique une entrée du registre. Retourne { game, events }.
 * Une entrée `reward` (quête terminée) lève le voile de son secteur (événement 'voile-leve'), puis allume la lisière
 * si le jour de l'entrée (`entry.day`, pas l'instant courant) n'est pas déjà allumé : +1 Confiance, cultures arrosées,
 * et +1 Confiance par « semaine tenue » (4 jours sur 7). Une entrée qui porte `reverses` retire ce que les gains
 * annulés ont réellement apporté.
 */
export function applyEntry(game, entry, now) {
  const g = structuredClone(game);
  if (!g.recentApplied) g.recentApplied = {};
  const events = [];
  const day = entry.day ?? gameDay(now);
  purgeRecent(g, now);
  if (!g.daily || day > g.daily.day) g.daily = { day, quests: 0, lisiere: g.lisiereDays.includes(day) };

  if (Array.isArray(entry.reverses)) {
    applyReversal(g, entry, events);
    if (entry.type === 'reverse' && g.daily.day === day) g.daily.quests = Math.max(0, g.daily.quests - 1);
  } else {
    const e = addResource(g, 'energy', entry.energy || 0);
    const m = addResource(g, 'materials', entry.materials || 0);
    const surplus = (e.surplus > 0 ? e.surplus : 0) + (m.surplus > 0 ? m.surplus : 0);
    if (surplus > 0) events.push({ type: 'surplus', energy: round1(e.surplus), materials: round1(m.surplus), filLibre: round2(surplus / SURPLUS_PER_FIL) });
    if (entry.lueur && Object.hasOwn(g.lueur, entry.lueur.sector)) {
      g.lueur[entry.lueur.sector] = Math.max(0, round2(g.lueur[entry.lueur.sector] + (entry.lueur.amount || 0)));
    }
    g.filLibre = Math.max(0, round2(g.filLibre + (entry.filLibre || 0)));
    if (entry.key) {
      g.recentApplied[entry.key] = {
        at: entry.at,
        nominal: { energy: entry.energy || 0, materials: entry.materials || 0, lueur: entry.lueur ? entry.lueur.amount || 0 : 0, filLibre: entry.filLibre || 0 },
        applied: {
          energy: e.kept, materials: m.kept, lueur: entry.lueur ? entry.lueur.amount || 0 : 0,
          filLibre: round2((entry.filLibre || 0) + surplus / SURPLUS_PER_FIL),
        },
      };
    }
  }

  if (entry.type === 'reward' && (entry.pe || 0) >= 0) {
    // la prochaine quête du secteur lève son voile (avant l'arrosage : les cultures poussent alors à plein)
    const sector = entry.lueur && entry.lueur.sector;
    if (g.avis && Array.isArray(g.avis.veils) && g.avis.veils.some((v) => v.sector === sector)) {
      g.avis.veils = g.avis.veils.filter((v) => v.sector !== sector);
      events.push({ type: 'voile-leve', sector, reason: 'quete', cells: 0 });
    }
    if (g.daily.day === day) g.daily.quests += 1;
    if (!g.lisiereDays.includes(day)) {
      if (g.daily.day === day) g.daily.lisiere = true;
      g.lisiereDays.push(day);
      g.resources.confidence += 1;
      // arrosage une seule fois par jour de jeu : remballer puis refaire une quête le même jour ne fait pas repousser
      if (g.garden && g.garden.wateredDay !== day) { growPlots(g); g.garden.wateredDay = day; }
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

/**
 * Retire le jour de lisière d'un jour de jeu dont plus aucune quête n'est comptée (tout a été remballé) :
 * −1 Confiance, et −1 de plus si la semaine tenue repasse sous 4 jours. Les cultures déjà arrosées ne reculent pas.
 */
export function retractLisiere(game, day) {
  if (!game.lisiereDays.includes(day)) return { game, events: [] };
  const g = structuredClone(game);
  const events = [{ type: 'lisiere-retiree', day }];
  g.lisiereDays = g.lisiereDays.filter((d) => d !== day);
  g.resources.confidence = Math.max(0, g.resources.confidence - 1);
  if (g.daily && g.daily.day === day) g.daily.lisiere = false;
  const ws = weekStart(day);
  const inWeek = g.lisiereDays.filter((d) => d >= ws && d <= addDays(ws, 6)).length;
  if (inWeek < WEEK_HELD_DAYS && g.weeksHeld.includes(ws)) {
    g.weeksHeld = g.weeksHeld.filter((w) => w !== ws);
    g.resources.confidence = Math.max(0, g.resources.confidence - 1);
    events.push({ type: 'semaine-retiree', weekStart: ws });
  }
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
  if (!Object.hasOwn(game.lueur, sectorId)) throw new Error('Secteur inconnu : ' + sectorId);
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

/** OBSOLÈTE : ignore les objectifs de chapitres.json (utilisé seulement par world/demo.js) ; le jeu passe par syncChapter.
 * Ouvre le chapitre suivant : +2 Confiance, ouvre son secteur (la Lueur gardée sous la cendre perce d'un coup). */
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
