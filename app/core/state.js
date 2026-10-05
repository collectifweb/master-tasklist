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
    chapter: { number: 1, startDay: gameDay(now), objectives: {} }, // objectives : { idObjectif: jour atteint }
    sectors: initialSectors(),
    placements: [],
    plots: [firstPlot()], // la première parcelle des Champs existe dès le départ ; crop null = parcelle vide
    garden: initialGarden(),
    avis: { current: null, history: [], veils: [] },
    story: { seen: [], day: null, count: 0 }, // moments d'histoire déjà montrés, et combien aujourd'hui (3 au plus)
    letters: {}, // { idLettre: dernier jour montré }
    lastSeenDay: null, // dernier jour de jeu où advanceTime a tourné (présence, pour la règle d'absence des Avis)
    recentApplied: {}, // ce que chaque gain des 48 dernières heures a réellement appliqué (sert aux annulations)
  };
}

const firstPlot = () => ({ id: 'parcelle-1', slot: 0, crop: null, stage: 0 });
const crops = () => ({ courge: 0, patate: 0, ble: 0 });

// Potager : garde-manger (12 récoltes au plus), Réserve d'hiver (courges, 6 au plus), compteurs cumulés pour les objectifs.
function initialGarden() {
  return { pantry: crops(), reserve: 0, sown: crops(), harvested: crops(), reserved: 0 };
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
  if (Array.isArray(out.plots) && !out.plots.length) out.plots = [firstPlot()]; // état d'avant le potager
  out.version = Math.max(STATE_VERSION, Number(raw.version) || 0);
  return out;
}
