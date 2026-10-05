// Dépenses : constructions, décors, parcelles, potager (semer, récolter, Réserve d'hiver), « Souffler ».
// Même forme que quests.js : (tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }.
// Aucune dépense ni récolte ne passe par le registre : il ne note que les gains de quêtes et d'Avis. Une dépense
// retire de l'Énergie ou des Matériaux déjà gagnés ; une récolte ne rend que de l'Énergie déjà dépensée en semis.
// L'état du jeu (game.set, avec sa révision) suffit donc à les enregistrer, sans ouvrir de voie au farming.
import { Ctx } from './quests.js';
import { CROP_STAGES } from './economy.js';
import { round1, round2 } from './reward.js';

/** Emplacements de construction par secteur : suit BUILD_SLOTS de world/layout.js (un test le vérifie). */
export const BUILD_SLOT_COUNT = { champs: 4, atelier: 6, place: 2, archives: 2, 'maison-commune': 2, relais: 2 };
/** Parcelles au plus : suit PLOT_SLOTS de world/layout.js. */
export const MAX_PLOTS = 4;

/**
 * Catalogue des chapitres 1 et 2 et du Premier gel. Les modèles sont ceux que le monde sait dessiner (MODEL_IDS).
 * `landmark` : repère fixe de la carte, son état passe par la construction { id, model, sector, state } ;
 * `decor` : exige l'établi, secteur au choix (params.sector) ; `defense` : Préparation ajoutée aux Avis
 * (tous, ou seulement ceux qui visent `defense.sector`) ; `max` : nombre au plus.
 */
export const BUILDABLES = {
  tour: { model: 'tour', sector: 'place', landmark: true, state: 'reparee', cost: { energy: 6, materials: 20 }, max: 1, defense: { prep: 4 } },
  tunnel: { model: 'tunnel', sector: 'champs', cost: { energy: 0, materials: 15 }, max: 1, defense: { prep: 6, sector: 'champs' } },
  etabli: { model: 'etabli', sector: 'atelier', landmark: true, state: 'construit', cost: { energy: 6, materials: 25 }, max: 1 },
  parcelle: { model: 'parcelle', sector: 'champs', cost: { energy: 0, materials: 10 }, max: MAX_PLOTS },
  erable: { model: 'erable', sector: 'atelier', decor: true, cost: { energy: 0, materials: 5 }, max: 3 },
  cloture: { model: 'cloture', sector: 'champs', decor: true, cost: { energy: 0, materials: 3 } },
  lanterne: { model: 'lanterne', sector: 'place', decor: true, cost: { energy: 0, materials: 8 } },
};
const LANDMARK_IDS = Object.keys(BUILDABLES).filter((id) => BUILDABLES[id].landmark);

/** Semis : coût en Énergie. Stades à atteindre : CROP_STAGES (economy.js). */
export const SEED_COST = { courge: 3, patate: 4, ble: 4 };
export const PANTRY_MAX = 12;
export const RESERVE_MAX = 6;
export const SOUFFLER = { energy: 8, filLibre: 5 };

/** Retire un coût { energy, materials } de `g` (une copie). Lance une erreur pour le joueur s'il manque quelque chose. */
export function payCost(g, cost) {
  const e = cost.energy || 0, m = cost.materials || 0;
  if (g.resources.materials < m) throw new Error(`Pas assez de Matériaux : il en faut ${m}.`);
  if (g.resources.energy < e) throw new Error(`Pas assez d’Énergie : il en faut ${e}.`);
  g.resources.materials = round1(g.resources.materials - m);
  g.resources.energy = round1(g.resources.energy - e);
}

/** Vrai si le bâtiment (identifiant de repère ou modèle) est construit. */
export function isBuilt(game, id) {
  return (game.placements ?? []).some((p) => p.id === id || p.model === id);
}

function newId(ids, prefix) {
  const used = new Set(ids);
  let n = 1;
  while (used.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

const pantryTotal = (g) => Object.values(g.garden.pantry).reduce((s, n) => s + n, 0);

/**
 * Construit. params : { id (clé de BUILDABLES), sector? (décors seulement) }.
 * Événements : { type: 'construction', id, model, sector, cost } ou, pour une parcelle, { type: 'parcelle', id, slot, cost }.
 */
export function build(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const def = BUILDABLES[params.id];
  if (!def) throw new Error('Construction inconnue.');
  const g = structuredClone(ctx.game);
  const sector = def.decor && params.sector ? params.sector : def.sector;
  if (!g.sectors[sector] || !g.sectors[sector].open) throw new Error('Ce secteur est encore sous la cendre.');
  if (def.decor && !isBuilt(g, 'etabli')) throw new Error('Les décors demandent l’établi.');
  const cost = { ...def.cost };

  if (params.id === 'parcelle') {
    if (g.plots.length >= MAX_PLOTS) throw new Error(`Les Champs comptent ${MAX_PLOTS} parcelles au plus.`);
    payCost(g, cost);
    const taken = new Set(g.plots.map((p, i) => (Number.isInteger(p.slot) ? p.slot : i)));
    let slot = 0;
    while (taken.has(slot)) slot++;
    const id = newId(g.plots.map((p) => p.id), 'parcelle');
    g.plots.push({ id, slot, crop: null, stage: 0 });
    ctx.game = g;
    ctx.events.push({ type: 'parcelle', id, slot, cost });
    return ctx.result();
  }

  const count = g.placements.filter((p) => (def.landmark ? p.id === params.id : p.model === def.model)).length;
  if (def.max && count >= def.max) throw new Error(def.max === 1 ? 'C’est déjà construit.' : `${def.max} au plus.`);
  if (!def.landmark) {
    const used = g.placements.filter((p) => p.sector === sector && !LANDMARK_IDS.includes(p.id)).length;
    if (used >= (BUILD_SLOT_COUNT[sector] ?? 0)) throw new Error('Plus de place libre dans ce secteur.');
  }
  payCost(g, cost);
  const placement = def.landmark
    ? { id: params.id, model: def.model, sector, state: def.state }
    : { id: newId(g.placements.map((p) => p.id), def.model), model: def.model, sector };
  g.placements.push(placement);
  ctx.game = g;
  ctx.events.push({ type: 'construction', id: placement.id, model: def.model, sector, cost });
  return ctx.result();
}

/** Sème. params : { crop: 'courge' | 'patate' | 'ble', plotId? (sinon la première parcelle vide) }. Événement 'semis'. */
export function sow(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const crop = params.crop;
  if (!(crop in SEED_COST)) throw new Error('Culture inconnue.');
  const g = structuredClone(ctx.game);
  const plot = params.plotId === undefined ? g.plots.find((p) => !p.crop) : g.plots.find((p) => p.id === params.plotId);
  if (!plot) throw new Error(params.plotId === undefined ? 'Aucune parcelle libre.' : 'Parcelle introuvable.');
  if (plot.crop) throw new Error('Cette parcelle est déjà semée.');
  const cost = { energy: SEED_COST[crop], materials: 0 };
  payCost(g, cost);
  plot.crop = crop;
  plot.stage = 0;
  g.garden.sown[crop] = (g.garden.sown[crop] || 0) + 1;
  ctx.game = g;
  ctx.events.push({ type: 'semis', plotId: plot.id, slot: plot.slot, crop, cost });
  return ctx.result();
}

/**
 * Récolte les cultures mûres vers le garde-manger (12 au plus). params : { plotId? } (sans plotId : toutes celles qui
 * tiennent). Garde-manger plein : la culture reste mûre dans le champ, elle ne pourrit jamais. Un événement
 * { type: 'recolte', plotId, slot, crop, pantry } par parcelle.
 */
export function harvest(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const g = structuredClone(ctx.game);
  const ripe = g.plots.filter((p) => p.crop && p.stage >= (CROP_STAGES[p.crop] ?? 1)
    && (params.plotId === undefined || p.id === params.plotId));
  if (!ripe.length) throw new Error(params.plotId === undefined ? 'Rien à récolter pour l’instant.' : 'Cette culture n’est pas encore mûre.');
  if (pantryTotal(g) >= PANTRY_MAX) throw new Error(`Le garde-manger est plein (${PANTRY_MAX}). La culture attend dans le champ, elle ne pourrit pas.`);
  for (const p of ripe) {
    if (pantryTotal(g) >= PANTRY_MAX) break;
    const crop = p.crop;
    g.garden.pantry[crop] = (g.garden.pantry[crop] || 0) + 1;
    g.garden.harvested[crop] = (g.garden.harvested[crop] || 0) + 1;
    p.crop = null;
    p.stage = 0;
    ctx.events.push({ type: 'recolte', plotId: p.id, slot: p.slot, crop, pantry: pantryTotal(g) });
  }
  ctx.game = g;
  return ctx.result();
}

/** Met des courges du garde-manger en Réserve d'hiver (+1 Préparation chacune, 6 au plus). params : { n = 1 }. */
export function storeReserve(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const g = structuredClone(ctx.game);
  if (g.garden.reserve >= RESERVE_MAX) throw new Error(`La Réserve d’hiver est pleine (${RESERVE_MAX} courges).`);
  if (!(g.garden.pantry.courge > 0)) throw new Error('Aucune courge au garde-manger.');
  const n = Math.min(Math.max(1, Math.round(Number(params.n) || 1)), g.garden.pantry.courge, RESERVE_MAX - g.garden.reserve);
  g.garden.pantry.courge -= n;
  g.garden.reserve += n;
  g.garden.reserved += n;
  ctx.game = g;
  ctx.events.push({ type: 'reserve', courges: n, reserve: g.garden.reserve });
  return ctx.result();
}

/** « Souffler » sur la cendre : 8 ⚡ → +5 Fil libre (à diriger ensuite vers un secteur). */
export function souffler(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const g = structuredClone(ctx.game);
  payCost(g, { energy: SOUFFLER.energy, materials: 0 });
  g.filLibre = round2(g.filLibre + SOUFFLER.filLibre);
  ctx.game = g;
  ctx.events.push({ type: 'souffler', energy: SOUFFLER.energy, filLibre: SOUFFLER.filLibre });
  return ctx.result();
}
