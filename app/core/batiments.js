// Bâtiments, cultures et habitants du village (bible §3 à §6, lot 4). Même forme que quests.js :
// (tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }. Un refus lance une Error en français
// pour le joueur, et la même raison se lit sans rien faire par refusConstruire, refusSemer, refusRecolter et
// refusAccueillir (les fiches de l'interface l'écrivent sous le bouton).
// Construire, semer, récolter et accueillir n'écrivent rien au registre : ils dépensent ou convertissent ce qui a déjà
// été gagné (game.set suffit). Seule l'éolienne y inscrit sa production, une fois par jour travaillé.
// Les nombres sont des exemples de départ (bible), réglés par la simulation de tests/core/simulation.test.mjs.
import { Ctx } from './quests.js';
import { gameDay, toISO } from './time.js';
import { round1 } from './reward.js';
import { hasKey, reverseKey } from './ledger.js';
import { rangDuVillage, RANGS } from './village.js';

/**
 * Catalogue, dans l'ordre d'affichage. cout : { energy, materials } ; rang : identifiant de RANGS ; max : emplacements
 * sur l'île (world/layout.js, EMPLACEMENTS : un test vérifie qu'ils correspondent) ; prerequis : un autre bâtiment ;
 * un : le nom avec son article, pour les raisons écrites ; loge : places par chalet ; culture : où l'on sème.
 */
export const BATIMENTS = {
  chalet: { rang: 'campement', cout: { energy: 0, materials: 15 }, max: 3, un: 'un chalet', loge: 2 },
  parcelle: { rang: 'campement', cout: { energy: 0, materials: 8 }, max: 3, un: 'une parcelle', culture: 'potager' },
  atelier: { rang: 'campement', cout: { energy: 4, materials: 20 }, max: 1, un: 'un atelier' },
  serre: { rang: 'campement', cout: { energy: 6, materials: 25 }, max: 1, un: 'une petite serre', prerequis: 'atelier', culture: 'serre' },
  eolienne: { rang: 'hameau', cout: { energy: 5, materials: 30 }, max: 1, un: 'une éolienne', prerequis: 'atelier' },
  grenier: { rang: 'hameau', cout: { energy: 0, materials: 30 }, max: 1, un: 'un grenier' },
  quai: { rang: 'hameau', cout: { energy: 4, materials: 25 }, max: 1, un: 'un quai' },
};
export const BATIMENT_IDS = Object.keys(BATIMENTS);

/** Déjà debout au départ (bible §2) : la parcelle du vieux potager. Les trois chalets vides, eux, sont à rebâtir. */
export const DEPART = { parcelle: 1 };

/** Une culture mûrit après `jours` jours travaillés (une quête payée) après celui du semis, et rapporte `recolte`. */
export const CULTURE = { jours: 5, recolte: 4 };
/** Semis, en Énergie ; la petite serre se chauffe de novembre à avril (CHAUFFAGE en plus, choisi et affiché). */
export const SEMIS = { potager: 2, serre: 2 };
export const CHAUFFAGE = 3;
/** Nourriture gardée au plus, et ce que le grenier ajoute. */
export const STOCKAGE = 20;
export const GRENIER_STOCKAGE = 40;
/** Nourriture dépensée pour accueillir une famille (+1 habitant). */
export const ACCUEIL_NOURRITURE = 18;
/** Énergie d'une éolienne, par jour travaillé. */
export const EOLIENNE_ENERGIE = 3;

const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const num = (n) => String(round1(n)).replace('.', ',');
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v.filter(isObj) : []);

// ───────── Lectures ─────────

/** Bâtiments debout : ceux du départ (parcelle-1…) puis ceux construits, sans doublon ni type inconnu. */
export function batimentsDuVillage(game) {
  const out = [];
  const seen = new Set();
  const add = (id, type) => { if (!seen.has(id)) { seen.add(id); out.push({ id, type }); } };
  for (const [type, n] of Object.entries(DEPART)) for (let k = 1; k <= n; k++) add(`${type}-${k}`, type);
  for (const b of list(game.batiments)) if (own(BATIMENTS, b.type) && typeof b.id === 'string') add(b.id, b.type);
  return out;
}

export const compte = (game, type) => batimentsDuVillage(game).filter((b) => b.type === type).length;
export const aBati = (game, id) => batimentsDuVillage(game).some((b) => b.id === id);

/** Logements : 2 places par chalet. */
export function logements(game) {
  const places = compte(game, 'chalet') * BATIMENTS.chalet.loge;
  const habitants = Math.max(0, Math.floor(Number(game.habitants) || 0));
  return { places, habitants, libres: Math.max(0, places - habitants) };
}

/** Nourriture gardée au plus. */
export const stockage = (game) => STOCKAGE + GRENIER_STOCKAGE * compte(game, 'grenier');

const mois = (day) => Number(day.slice(5, 7));
/** Le potager produit de mai à octobre ; il dort de novembre à avril. */
export const potagerOuvert = (day) => mois(day) >= 5 && mois(day) <= 10;

const lieuDe = (id) => {
  const type = String(id).replace(/-\d+$/, '');
  return own(BATIMENTS, type) ? BATIMENTS[type].culture ?? null : null;
};

/** Coût d'un semis à cette date : { energy (total), chauffage (part du chauffage, 0 hors saison froide) }. */
export function coutSemis(id, day) {
  const lieu = lieuDe(id);
  const chauffage = lieu === 'serre' && !potagerOuvert(day) ? CHAUFFAGE : 0;
  return { energy: (lieu === 'serre' ? SEMIS.serre : SEMIS.potager) + chauffage, chauffage };
}

/** Jours travaillés (au moins une quête payée, non remballée) après `apres` et jusqu'à `jusqua` inclus. */
export function joursTravailles(ledger, apres, jusqua) {
  const keys = new Set(ledger.map((e) => e.key));
  const days = new Set();
  for (const e of ledger) {
    if (e.type !== 'reward' || typeof e.day !== 'string' || e.day <= apres || e.day > jusqua) continue;
    if (!keys.has(reverseKey(e.taskId, e.occurrence))) days.add(e.day);
  }
  return days.size;
}

/**
 * État d'un emplacement de culture : { id, lieu, semee, semeLe, jours, reste, mure }. Au potager, ce qui est en terre
 * mûrit d'un coup le 1er novembre (sans perte) ; la serre suit seulement les jours travaillés.
 */
export function etatCulture(game, ledger, id, now) {
  const today = gameDay(now);
  const lieu = lieuDe(id);
  const c = list(game.parcelles).find((p) => p.id === id);
  if (!c || typeof c.semeLe !== 'string') return { id, lieu, semee: false, semeLe: null, jours: 0, reste: 0, mure: false };
  const jours = joursTravailles(ledger, c.semeLe, today);
  const gel = lieu === 'potager' && today >= `${c.semeLe.slice(0, 4)}-11-01`;
  const mure = gel || jours >= CULTURE.jours;
  return { id, lieu, semee: true, semeLe: c.semeLe, jours, reste: mure ? 0 : CULTURE.jours - jours, mure };
}

// ───────── Raisons écrites ─────────

function manque(game, cout) {
  const m = round1((cout.materials || 0) - game.resources.materials);
  const e = round1((cout.energy || 0) - game.resources.energy);
  const parts = [];
  if (m > 0) parts.push(`${num(m)} ${m < 2 ? 'Matériau' : 'Matériaux'}`);
  if (e > 0) parts.push(`${num(e)} Énergie`);
  return parts.length ? `Il manque ${parts.join(' et ')}.` : null;
}

/** Pourquoi on ne peut pas construire ce bâtiment maintenant (ou null). Ordre : maximum, rang, prérequis, coût. */
export function refusConstruire(game, type) {
  if (!own(BATIMENTS, type)) return 'Bâtiment inconnu.';
  const def = BATIMENTS[type];
  if (compte(game, type) >= def.max) return def.max === 1 ? `Il y a déjà ${def.un} au village.` : `Plus d’emplacement libre pour ${def.un}.`;
  const besoin = RANGS.find((r) => r.id === def.rang);
  const h = logements(game).habitants;
  if (besoin && h < besoin.min) return `${besoin.name} : encore ${besoin.min - h} habitant${besoin.min - h > 1 ? 's' : ''}.`;
  if (def.prerequis && !compte(game, def.prerequis)) return `Il faut d’abord ${BATIMENTS[def.prerequis].un}.`;
  return manque(game, def.cout);
}

/** Pourquoi on ne peut pas semer à cet emplacement maintenant (ou null). */
export function refusSemer(game, ledger, id, now) {
  const lieu = lieuDe(id);
  if (!lieu) return 'On ne sème pas ici.';
  if (!aBati(game, id)) return lieu === 'serre' ? 'Il faut d’abord une petite serre.' : 'Il faut d’abord une parcelle ici.';
  if (etatCulture(game, ledger, id, now).semee) return 'C’est déjà semé.';
  const day = gameDay(now);
  if (lieu === 'potager' && !potagerOuvert(day)) return 'Le potager dort de novembre à avril : sème dans la petite serre.';
  return manque(game, { energy: coutSemis(id, day).energy });
}

/** Pourquoi on ne peut pas récolter maintenant (ou null). */
export function refusRecolter(game, ledger, id, now) {
  const st = etatCulture(game, ledger, id, now);
  if (!st.semee) return 'Rien n’est semé ici.';
  if (!st.mure) return `Pas encore mûr : encore ${st.reste} jour${st.reste > 1 ? 's' : ''} travaillé${st.reste > 1 ? 's' : ''}.`;
  const max = stockage(game);
  if (game.resources.food >= max) return `Le stockage est plein (${num(game.resources.food)} sur ${max}). Accueille une famille, ou bâtis un grenier au hameau.`;
  return null;
}

/** Pourquoi on ne peut pas accueillir une famille maintenant (ou null). */
export function refusAccueillir(game) {
  const l = logements(game);
  if (!l.places) return 'Il faut d’abord un chalet.';
  if (!l.libres) return 'Aucun logement libre : rebâtis un chalet.';
  const m = round1(ACCUEIL_NOURRITURE - game.resources.food);
  return m > 0 ? `Il manque ${num(m)} Nourriture.` : null;
}

// ───────── Gestes ─────────

function pay(g, cout) {
  g.resources.energy = round1(g.resources.energy - (cout.energy || 0));
  g.resources.materials = round1(g.resources.materials - (cout.materials || 0));
}

/** Construit. params : { type }. Événement { type: 'construction', id, batiment, cout }. */
export function construire(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const type = params.type;
  const refus = refusConstruire(ctx.game, type);
  if (refus) throw new Error(refus);
  const g = structuredClone(ctx.game);
  const cout = { ...BATIMENTS[type].cout };
  pay(g, cout);
  const taken = new Set(batimentsDuVillage(g).map((b) => b.id));
  let k = 1;
  while (taken.has(`${type}-${k}`)) k++;
  const id = `${type}-${k}`;
  g.batiments = [...list(g.batiments), { id, type }];
  ctx.game = g;
  ctx.events.push({ type: 'construction', id, batiment: type, cout });
  return ctx.result();
}

/** Sème. params : { id } (parcelle-n ou serre-1). Événement { type: 'semis', id, lieu, cout, chauffage }. */
export function semer(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusSemer(ctx.game, ctx.ledger, params.id, now);
  if (refus) throw new Error(refus);
  const g = structuredClone(ctx.game);
  const { energy, chauffage } = coutSemis(params.id, ctx.day);
  const cout = { energy, materials: 0 };
  pay(g, cout);
  g.parcelles = [...list(g.parcelles).filter((p) => p.id !== params.id), { id: params.id, semeLe: ctx.day }];
  ctx.game = g;
  ctx.events.push({ type: 'semis', id: params.id, lieu: lieuDe(params.id), cout, chauffage });
  return ctx.result();
}

/**
 * Récolte une culture mûre : +Nourriture, plafonnée par le stockage (`perdu` : ce qui n'a pas tenu, dit au joueur).
 * Stockage déjà plein : refusé, la culture attend en terre. Événement { type: 'recolte', id, lieu, nourriture, perdu, stock, max }.
 */
export function recolter(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusRecolter(ctx.game, ctx.ledger, params.id, now);
  if (refus) throw new Error(refus);
  const g = structuredClone(ctx.game);
  const max = stockage(g);
  const nourriture = round1(Math.min(CULTURE.recolte, max - g.resources.food));
  g.resources.food = round1(g.resources.food + nourriture);
  g.parcelles = list(g.parcelles).filter((p) => p.id !== params.id);
  ctx.game = g;
  ctx.events.push({ type: 'recolte', id: params.id, lieu: lieuDe(params.id), nourriture, perdu: round1(CULTURE.recolte - nourriture), stock: g.resources.food, max });
  return ctx.result();
}

/** Accueille une famille : −Nourriture, +1 habitant. Événements { type: 'famille', habitants, nourriture } et, au changement de rang, { type: 'rang', id, name, habitants }. */
export function accueillir(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusAccueillir(ctx.game);
  if (refus) throw new Error(refus);
  const g = structuredClone(ctx.game);
  const avant = rangDuVillage(logements(g).habitants);
  g.resources.food = round1(g.resources.food - ACCUEIL_NOURRITURE);
  g.habitants = logements(g).habitants + 1;
  ctx.game = g;
  ctx.events.push({ type: 'famille', habitants: g.habitants, nourriture: ACCUEIL_NOURRITURE });
  const apres = rangDuVillage(g.habitants);
  if (apres.palier > avant.palier) ctx.events.push({ type: 'rang', id: apres.id, name: apres.name, habitants: g.habitants });
  return ctx.result();
}

/**
 * Production de l'éolienne, appelée par quests.js après une quête payée : la première du jour inscrit
 * prod:eolienne:{jour} au registre (clé unique : jamais deux fois le même jour, même après Remballer puis refaire).
 */
export function produireEolienne(ctx) {
  const n = compte(ctx.game, 'eolienne');
  const key = `prod:eolienne:${ctx.day}`;
  if (!n || hasKey(ctx.ledger, key)) return;
  ctx.append({ key, at: toISO(ctx.now), day: ctx.day, type: 'prod', batiment: 'eolienne', pe: 0, energy: EOLIENNE_ENERGIE * n, materials: 0 }, 'eolienne');
}
