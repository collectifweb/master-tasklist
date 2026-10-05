// État du jeu (api/data/game-state.json) : version 1.
import { gameDay, toISO } from './time.js';
import { SECTOR_IDS, SECTORS } from './domains.js';

export const STATE_VERSION = 1;

export const START_RESOURCES = { energy: 10, materials: 15, confidence: 0 };
export const START_CAPS = { energy: 40, materials: 150 };

function initialSectors() {
  const out = {};
  for (const id of SECTOR_IDS) out[id] = { open: SECTORS[id].chapter === 1, stage: 0 };
  return out;
}

function initialLueur() {
  const out = {};
  for (const id of SECTOR_IDS) out[id] = 0;
  return out;
}

/** État de départ : Énergie 10, Matériaux 15, Confiance 0, chapitre 1, Champs et Place ouverts. */
export function createInitialState(now) {
  return {
    version: STATE_VERSION,
    createdAt: toISO(now),
    startDay: gameDay(now),
    resources: { ...START_RESOURCES },
    caps: { ...START_CAPS },
    lueur: initialLueur(),
    filLibre: 0,
    lisiereDays: [],
    weeksHeld: [],
    daily: { day: gameDay(now), quests: 0, lisiere: false },
    lastOpenDay: null,
    lastReturnDay: null,
    chapter: { number: 1, startDay: gameDay(now), objectives: {} },
    sectors: initialSectors(),
    placements: [],
    plots: [],
    avis: { current: null, history: [] },
    recentApplied: {}, // ce que chaque gain des 48 dernières heures a réellement appliqué (sert aux annulations)
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Les valeurs brutes l'emportent ; les clés manquantes reçoivent la valeur par défaut ; les clés inconnues sont gardées.
function merge(defaults, raw) {
  if (!isObj(defaults) || !isObj(raw)) return raw === undefined ? defaults : raw;
  const out = { ...raw };
  for (const k of Object.keys(defaults)) {
    out[k] = k in raw && raw[k] !== undefined ? merge(defaults[k], raw[k]) : structuredClone(defaults[k]);
  }
  return out;
}

/** Complète un état lu sur le serveur (ancienne forme, champs manquants) sans rien perdre. `now` n'est requis que si `raw` est vide. */
export function migrateState(raw, now) {
  if (!isObj(raw)) return createInitialState(now);
  const defaults = createInitialState(now ?? raw.createdAt ?? '1970-01-01T00:00:00Z');
  if (raw.startDay) defaults.startDay = raw.startDay;
  if (raw.chapter && raw.chapter.startDay) defaults.chapter.startDay = raw.chapter.startDay;
  if (raw.daily && raw.daily.day) defaults.daily.day = raw.daily.day;
  const out = merge(defaults, raw);
  out.version = Math.max(STATE_VERSION, Number(raw.version) || 0);
  return out;
}
