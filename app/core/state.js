// État du jeu (api/data/game-state.json) : version 2, le village (bible v2).
import { gameDay, toISO, addDays } from './time.js';
import { QUARTIER_IDS, PLACE_ID, quartierOfTask } from './domains.js';
import { quartierOfEntry } from './ledger.js';
import { figerBilans } from './recycling.js';
import { niveauQuartier } from './village.js';

export const STATE_VERSION = 2;

/** Stock de départ (bible §11). Les Habitants ne se dépensent pas : ils vivent à part (game.habitants). */
export const START_RESOURCES = { energy: 10, materials: 20, food: 5 };

function zeroQuartiers() {
  const out = {};
  for (const id of QUARTIER_IDS) out[id] = 0;
  return out;
}

// Jour d'où l'on compte les jours travaillés vers le prochain permis : la veille, pour que ce jour compte.
const veille = (now) => addDays(gameDay(now), -1);

/** État de départ : 10 Énergie, 20 Matériaux, 5 Nourriture, 0 habitant, six quartiers sans tâche ni niveau, aucun permis. */
export function createInitialState(now) {
  return {
    version: STATE_VERSION,
    createdAt: toISO(now),
    startDay: gameDay(now),
    resources: { ...START_RESOURCES },
    habitants: 0,
    quartiers: zeroQuartiers(), // tâches terminées et payées, par quartier (mémoire de la fiche, « Voir les quêtes »)
    niveaux: zeroQuartiers(), // niveau acheté de chaque quartier (quartiers.js)
    permis: { dispo: 0, depuis: veille(now) }, // permis en main ; jour d'après lequel on compte les jours travaillés
    batiments: [], // bâtiments construits (lot 4)
    parcelles: [], // parcelles du potager (lot 4)
    premiersPas: {}, // { idPas: jour atteint } : les cinq quêtes d'initiation (lot 5, objectifs.js)
    accueil: null, // jour où les écrans d'accueil ont été vus (lot 5) ; null : à montrer
    bilans: [], // bilans figés des semaines finies (recycling.js)
    lastOpenDay: null,
    lastReturnDay: null,
    letters: {}, // { idLettre: dernier jour montré }
    lastSeenDay: null, // dernier jour de jeu où advanceTime a tourné ; ne recule jamais
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Partie enregistrée en version 1 (sans champ `version`, c'est aussi une partie v1) ; une partie absente n'en est pas une. */
export const isV1State = (raw) => !!isObj(raw) && !(Number(raw.version) >= STATE_VERSION);

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

// Clés de la partie v1 qui n'existent plus en v2 (bible §13) : stock et Confiance, plafonds, Lueur, Fil libre, lisière
// et semaines tenues, chapitres et moments d'histoire, secteurs, constructions, potager et Avis de la v1, mémoire des
// annulations (elle ne servait qu'avec les plafonds).
const V1_KEYS = ['resources', 'caps', 'lueur', 'filLibre', 'lisiereDays', 'weeksHeld', 'daily', 'chapter', 'story',
  'sectors', 'placements', 'plots', 'garden', 'avis', 'recentApplied'];

/**
 * Complète un état lu sur le serveur sans rien perdre, ou convertit une partie v1 en partie v2. Fonction pure.
 * - Partie v2 : seules les clés manquantes ou abîmées reprennent leur valeur par défaut (`ctx` est ignoré). Une partie
 *   v2 d'avant les permis (sans `niveaux`) voit ses anciens niveaux, comptés en tâches (village.js), devenir autant de
 *   permis à placer : niveaux à zéro, `permis.cadeau` = ce nombre (pour la lettre de conversion), compte des jours
 *   depuis la veille de la conversion. Stock, quartiers et bilans ne bougent pas.
 * - Partie v1, ou absente : Énergie, Matériaux et Nourriture partent du stock de départ ; les tâches par quartier et
 *   les bilans des semaines finies sont recomptés depuis le registre (remballées exclues) ; une tâche au statut
 *   `done` qui n'a aucune entrée au registre (ni gain de quête ni étape) compte une fois pour son quartier, sans
 *   Énergie ni Matériaux (décision d'Alex du 5 octobre 2026). Relevé du temps, jours vus (lastSeenDay, lastOpenDay,
 *   lastReturnDay), lettres montrées et clés inconnues sont gardés. Une partie v1 reçoit `migratedAt` (instant de la
 *   conversion) ; une partie absente, non. Ses niveaux (comptés sur les tâches recomptées) deviennent des permis, sans
 *   lettre de conversion : elle n'a jamais vu de niveaux.
 * ctx = { tasks, ledger } (liste normalisée, registre complet ou hydraté) : lus, jamais modifiés ; sans eux, rien
 * n'est recompté. `now` est requis pour une partie v1 ou absente. Idempotente : une partie convertie est en v2 et
 * un 2e appel ne la change plus.
 */
export function migrateState(raw, now, { tasks = [], ledger = [] } = {}) {
  if (isObj(raw) && Number(raw.version) >= STATE_VERSION) {
    const at = now ?? raw.createdAt ?? '1970-01-01T00:00:00Z';
    const avantPermis = !isObj(raw.niveaux); // à lire avant la fusion, qui ajouterait le champ
    const defaults = createInitialState(at);
    if (raw.startDay) defaults.startDay = raw.startDay;
    const out = merge(defaults, raw);
    out.version = Math.max(STATE_VERSION, Number(raw.version) || 0);
    if (avantPermis) {
      const dispo = permisDesNiveaux(out.quartiers);
      out.permis = { dispo, depuis: veille(at), cadeau: dispo };
    }
    return out;
  }
  const kept = isObj(raw) ? { ...raw } : {};
  for (const k of V1_KEYS) delete kept[k];
  const g = merge(createInitialState(now), kept);
  g.version = STATE_VERSION;
  if (isObj(raw)) g.migratedAt = toISO(now); // partie v1 convertie (lettre de passage) ; une partie absente est neuve
  g.quartiers = recountQuartiers(tasks, ledger);
  g.permis = { dispo: permisDesNiveaux(g.quartiers), depuis: veille(now) };
  g.bilans = figerBilans(tasks, g, ledger, now); // g.bilans est vide : toutes les semaines finies, 104 au plus
  return g;
}

// Permis donnés à la conversion : la somme des niveaux que l'ancienne règle donnait aux quartiers (tâches comptées).
const permisDesNiveaux = (quartiers) => QUARTIER_IDS.reduce((s, q) => s + niveauQuartier(quartiers[q]).niveau, 0);

// Tâches par quartier d'une partie v1 : quêtes payées au registre, remballées exclues (quartier de l'entrée ; pour
// une entrée minimale, celui de la quête, ou la Place si elle n'existe plus), puis les tâches terminées que le
// registre ne connaît pas. Les clés suffisent : `reward:{id}:{occurrence}`, `step:{id}:{occurrence}:{étape}`.
function recountQuartiers(tasks, ledger) {
  const out = zeroQuartiers();
  const keys = new Set(ledger.map((e) => e.key));
  const byId = new Map(tasks.map((t) => [String(t.id), t]));
  const known = new Set(); // quêtes qui ont au moins une entrée de gain (quête ou étape) au registre
  for (const e of ledger) {
    const [type, ...rest] = String(e.key).split(':');
    if (type !== 'reward' && type !== 'step') continue;
    const id = rest.slice(0, type === 'step' ? -2 : -1).join(':');
    known.add(id);
    if (type !== 'reward' || keys.has(['reverse', ...rest].join(':'))) continue;
    out[quartierOfEntry(e) ?? (byId.has(id) ? quartierOfTask(byId.get(id)) : PLACE_ID)] += 1;
  }
  for (const t of tasks) if (t.status === 'done' && !known.has(String(t.id))) out[quartierOfTask(t)] += 1;
  return out;
}

// Gestes de jeu de la v1 sans équivalent en v2 (bible §13) : écartés de la file, et nommés au joueur.
export const V1_GAME_GESTURES = ['souffler', 'build', 'sow', 'harvest', 'storeReserve', 'shareHarvest', 'lightBrasero', 'liftVeil', 'directFil'];

// Gestes retirés de la v2 (« Je m'y mets », lot R1) : un geste déjà en file sur un appareil est écarté, sans message.
export const RETIRED_GESTURES = ['startQuest', 'pauseQuest'];

/** La file hors ligne sans les gestes retirés (RETIRED_GESTURES). Fonction pure ; ne touche pas aux autres entrées. */
export function withoutRetiredGestures(queue) {
  return (Array.isArray(queue) ? queue : []).filter((e) => !(isObj(e) && RETIRED_GESTURES.includes(e.name)));
}

/**
 * File d'attente hors ligne de la v1 (`oree.queue.v1`) → v2, une seule fois au démarrage. `known(name)` : l'action
 * existe en v2. Gardés : les gestes connus (quêtes, bonus, tenue) avec leur opId, nom, paramètres et instant ; le corps
 * calculé en v1 et les compteurs d'essais sont jetés (le cœur v2 recalcule l'effet à l'envoi), et l'entrée est marquée
 * `v1: true` (son opId a pu être appliqué par la v1). Écartés : les gestes de jeu v1 (`dropped`, pour le message) et la
 * tenue v1 sans équivalent (moments d'histoire vus), sans rien dire. Fonction pure.
 */
export function convertQueueV1(queue, known) {
  const out = { queue: [], dropped: [] };
  for (const e of Array.isArray(queue) ? queue : []) {
    if (!isObj(e) || typeof e.name !== 'string' || typeof e.opId !== 'string' || !e.opId) continue;
    if (known(e.name)) out.queue.push({ opId: e.opId, name: e.name, params: isObj(e.params) ? e.params : {}, at: e.at, v1: true });
    else if (V1_GAME_GESTURES.includes(e.name)) out.dropped.push(e.name);
  }
  return out;
}
