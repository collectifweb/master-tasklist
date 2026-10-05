// État du jeu (api/data/game-state.json) : version 2, le village (bible v2).
import { gameDay, toISO } from './time.js';
import { QUARTIER_IDS } from './domains.js';

export const STATE_VERSION = 2;

/** Stock de départ (bible §11). Les Habitants ne se dépensent pas : ils vivent à part (game.habitants). */
export const START_RESOURCES = { energy: 10, materials: 20, food: 5 };

function zeroQuartiers() {
  const out = {};
  for (const id of QUARTIER_IDS) out[id] = 0;
  return out;
}

/** État de départ : 10 Énergie, 20 Matériaux, 5 Nourriture, 0 habitant, six quartiers sans tâche. */
export function createInitialState(now) {
  return {
    version: STATE_VERSION,
    createdAt: toISO(now),
    startDay: gameDay(now),
    resources: { ...START_RESOURCES },
    habitants: 0,
    quartiers: zeroQuartiers(), // tâches terminées et payées, par quartier (niveaux : village.js)
    batiments: [], // bâtiments construits (lot 4)
    parcelles: [], // parcelles du potager (lot 4)
    premiersPas: {}, // { idPas: jour atteint } : les cinq quêtes d'initiation (lot 5)
    bilans: [], // bilans figés des semaines finies (recycling.js)
    lastOpenDay: null,
    lastReturnDay: null,
    letters: {}, // { idLettre: dernier jour montré }
    lastSeenDay: null, // dernier jour de jeu où advanceTime a tourné ; ne recule jamais
    coteACote: { current: null, totals: [] }, // séance « Je m'y mets » en cours et temps relevé (cote-a-cote.js)
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Les valeurs brutes l'emportent ; les clés manquantes reçoivent la valeur par défaut ; les clés inconnues sont gardées.
// Un type brut qui ne correspond pas au défaut (null, chaîne ou tableau là où un objet est attendu ; autre chose qu'un
// tableau là où un tableau est attendu) est un état abîmé : on reprend la valeur par défaut.
function merge(defaults, raw) {
  if (Array.isArray(defaults)) return Array.isArray(raw) ? raw : defaults;
  if (isObj(defaults)) {
    if (!isObj(raw)) return defaults;
  } else return raw === undefined ? defaults : raw;
  const out = { ...raw };
  for (const k of Object.keys(defaults)) {
    out[k] = k in raw && raw[k] !== undefined ? merge(defaults[k], raw[k]) : structuredClone(defaults[k]);
  }
  return out;
}

/** Complète un état lu sur le serveur (champs manquants) sans rien perdre. `now` n'est requis que si `raw` est vide. */
export function migrateState(raw, now) {
  if (!isObj(raw)) return createInitialState(now);
  const defaults = createInitialState(now ?? raw.createdAt ?? '1970-01-01T00:00:00Z');
  if (raw.startDay) defaults.startDay = raw.startDay;
  const out = merge(defaults, raw);
  out.version = Math.max(STATE_VERSION, Number(raw.version) || 0);
  return out;
}
