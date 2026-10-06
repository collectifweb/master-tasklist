// Bâtiments, cultures et habitants du village (bible §3 à §6, lot 4). Même forme que quests.js :
// (tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }. Un refus lance une Error en français
// pour le joueur, et la même raison se lit sans rien faire par refusConstruire, refusSemer, refusRecolter et
// refusAccueillir (les fiches de l'interface l'écrivent sous le bouton).
// Construire, semer, récolter et accueillir n'écrivent rien au registre : ils dépensent ou convertissent ce qui a déjà
// été gagné (game.set suffit). Seule l'éolienne y inscrit sa production, une fois par jour travaillé ; un geste qui
// accomplit un premier pas ou l'objectif de la saison y inscrit son coup de pouce (objectifs.js) ; et l'accueil qui
// fait passer un nouveau rang y inscrit son permis (quartiers.js).
// Les nombres sont des exemples de départ (bible), réglés par la simulation de tests/core/simulation.test.mjs. Les
// niveaux de quartier changent cinq d'entre eux (quartiers.js) : récolte du potager et de la serre, jours de pousse,
// places par chalet, prix d'une famille, stockage ; ils se lisent par valeur(game, réglage), jamais en dur.
import { Ctx } from './quests.js';
import { gameDay, toISO } from './time.js';
import { round1 } from './reward.js';
import { hasKey, reverseKey } from './ledger.js';
import { rangDuVillage, RANGS } from './village.js';
import { suivreObjectifs } from './objectifs.js';
import { valeur, placesParChalet, permisDeRang } from './quartiers.js';

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

/**
 * Une culture mûrit après `jours` jours travaillés (une quête payée) après celui du semis, et rapporte `recolte`. Valeurs
 * de départ : le Garage raccourcit la pousse, les Champs et l'Atelier font monter la récolte du potager et de la serre.
 */
export const CULTURE = { jours: 5, recolte: 4 };
/** Semis, en Énergie ; la petite serre se chauffe de novembre à avril (CHAUFFAGE en plus, choisi et affiché). */
export const SEMIS = { potager: 2, serre: 2 };
export const CHAUFFAGE = 3;
/** Nourriture gardée au plus, et ce que le grenier ajoute (la Place en ajoute encore, par niveau). */
export const STOCKAGE = 20;
export const GRENIER_STOCKAGE = 40;
/** Nourriture dépensée pour accueillir une famille (+1 habitant), au départ (la Mairie la fait baisser). */
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

/** Logements : 2 places par chalet au départ (plus avec l'École, placesParChalet). */
export function logements(game) {
  const places = compte(game, 'chalet') * placesParChalet(game);
  const habitants = Math.max(0, Math.floor(Number(game.habitants) || 0));
  return { places, habitants, libres: Math.max(0, places - habitants) };
}

/** Nourriture gardée au plus, sans la Place : le départ et les greniers (l'objectif d'automne se mesure à lui). */
export const stockageBase = (game) => STOCKAGE + GRENIER_STOCKAGE * compte(game, 'grenier');
/** Nourriture gardée au plus : le stockage de base, plus la Place. */
export const stockage = (game) => stockageBase(game) + valeur(game, 'stockagePlace');

const mois = (day) => Number(day.slice(5, 7));
/** Le potager produit de mai à octobre ; il dort de novembre à avril. */
export const potagerOuvert = (day) => mois(day) >= 5 && mois(day) <= 10;

const lieuDe = (id) => {
  const type = String(id).replace(/-\d+$/, '');
  return own(BATIMENTS, type) ? BATIMENTS[type].culture ?? null : null;
};

/** Nourriture d'une récolte selon le lieu : le potager suit les Champs, la petite serre suit l'Atelier. */
export const recolteDe = (game, lieu) => valeur(game, lieu === 'serre' ? 'recolteSerre' : 'recoltePotager');
/** Nourriture pour accueillir une famille (Mairie). */
export const prixFamille = (game) => valeur(game, 'prixFamille');

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
  const pousse = valeur(game, 'joursPousse');
  const gel = lieu === 'potager' && today >= `${c.semeLe.slice(0, 4)}-11-01`;
  const mure = gel || jours >= pousse;
  return { id, lieu, semee: true, semeLe: c.semeLe, jours, reste: mure ? 0 : pousse - jours, mure };
}

// ───────── Raisons écrites ─────────

/** Ce qui manque pour payer `cout` ({ permis?, energy?, materials? }), en une phrase, ou null. */
export function manque(game, cout) {
  const p = (cout.permis || 0) - Math.max(0, Math.floor(Number(game.permis?.dispo) || 0));
  const m = round1((cout.materials || 0) - game.resources.materials);
  const e = round1((cout.energy || 0) - game.resources.energy);
  const parts = [];
  if (p > 0) parts.push(`${p} permis`);
  if (m > 0) parts.push(`${num(m)} ${m < 2 ? 'Matériau' : 'Matériaux'}`);
  if (e > 0) parts.push(`${num(e)} Énergie`);
  if (!parts.length) return null;
  return `Il manque ${parts.length > 2 ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}` : parts.join(' et ')}.`;
}

/** Pourquoi on ne peut pas construire ce bâtiment maintenant (ou null). Ordre : maximum, rang, prérequis, coût. */
export function refusConstruire(game, type) {
  if (!own(BATIMENTS, type)) return 'Bâtiment inconnu.';
  const def = BATIMENTS[type];
  if (compte(game, type) >= def.max) return def.max === 1 ? `Il y a déjà ${def.un} au village.` : `Plus d’emplacement libre pour ${def.un}.`;
  const besoin = RANGS.find((r) => r.id === def.rang);
  const h = logements(game).habitants;
  if (besoin && h < besoin.min) return `${besoin.name}\u00a0: encore ${besoin.min - h} habitant${besoin.min - h > 1 ? 's' : ''}.`;
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
  if (lieu === 'potager' && !potagerOuvert(day)) return 'Le potager dort de novembre à avril\u00a0: sème dans la petite serre.';
  return manque(game, { energy: coutSemis(id, day).energy });
}

/** Pourquoi on ne peut pas récolter maintenant (ou null). */
export function refusRecolter(game, ledger, id, now) {
  const st = etatCulture(game, ledger, id, now);
  if (!st.semee) return 'Rien n’est semé ici.';
  if (!st.mure) return `Pas encore mûr\u00a0: encore ${st.reste} jour${st.reste > 1 ? 's' : ''} travaillé${st.reste > 1 ? 's' : ''}.`;
  const max = stockage(game);
  if (game.resources.food >= max) return `Le stockage est plein (${num(game.resources.food)} sur ${max}). Accueille une famille, ou bâtis un grenier au hameau.`;
  return null;
}

/** Pourquoi on ne peut pas accueillir une famille maintenant (ou null). */
export function refusAccueillir(game) {
  const l = logements(game);
  if (!l.places) return 'Il faut d’abord un chalet.';
  if (!l.libres) return 'Aucun logement libre\u00a0: rebâtis un chalet.';
  const m = round1(prixFamille(game) - game.resources.food);
  return m > 0 ? `Il manque ${num(m)} Nourriture.` : null;
}

// ───────── Gestes ─────────

function pay(g, cout) {
  g.resources.energy = round1(g.resources.energy - (cout.energy || 0));
  g.resources.materials = round1(g.resources.materials - (cout.materials || 0));
}

/**
 * Construit. params : { type, id } ; id (facultatif) = l'emplacement touché sur la carte (chalet-3…), sinon le premier
 * libre. Événement { type: 'construction', id, batiment, cout }.
 */
export function construire(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const type = params.type;
  const refus = refusConstruire(ctx.game, type);
  if (refus) throw new Error(refus);
  const taken = new Set(batimentsDuVillage(ctx.game).map((b) => b.id));
  let id = params.id;
  if (id !== undefined && id !== null) {
    const k = typeof id === 'string' && id.startsWith(`${type}-`) ? Number(id.slice(type.length + 1)) : NaN;
    if (!(Number.isInteger(k) && k >= 1 && k <= BATIMENTS[type].max && id === `${type}-${k}`)) throw new Error('Emplacement inconnu.');
    if (taken.has(id)) throw new Error('Cet emplacement est déjà bâti.');
  } else {
    let k = 1;
    while (taken.has(`${type}-${k}`)) k++;
    id = `${type}-${k}`;
  }
  const g = structuredClone(ctx.game);
  const cout = { ...BATIMENTS[type].cout };
  pay(g, cout);
  g.batiments = [...list(g.batiments), { id, type }];
  ctx.game = g;
  ctx.events.push({ type: 'construction', id, batiment: type, cout });
  suivreObjectifs(ctx);
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
  suivreObjectifs(ctx);
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
  const lieu = lieuDe(params.id);
  const recolte = recolteDe(g, lieu);
  const nourriture = round1(Math.min(recolte, max - g.resources.food));
  g.resources.food = round1(g.resources.food + nourriture);
  g.parcelles = list(g.parcelles).filter((p) => p.id !== params.id);
  ctx.game = g;
  ctx.events.push({ type: 'recolte', id: params.id, lieu, nourriture, perdu: round1(recolte - nourriture), stock: g.resources.food, max });
  suivreObjectifs(ctx);
  return ctx.result();
}

/**
 * Accueille une famille : −Nourriture, +1 habitant. Événements { type: 'famille', habitants, nourriture } et, au
 * changement de rang, { type: 'rang', id, name, habitants } suivi du permis du nouveau rang (permis:rang:{palier},
 * événement { type: 'permis', source: 'rang', dispo }).
 */
export function accueillir(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusAccueillir(ctx.game);
  if (refus) throw new Error(refus);
  const g = structuredClone(ctx.game);
  const avant = rangDuVillage(logements(g).habitants);
  const prix = prixFamille(g);
  g.resources.food = round1(g.resources.food - prix);
  g.habitants = logements(g).habitants + 1;
  ctx.game = g;
  ctx.events.push({ type: 'famille', habitants: g.habitants, nourriture: prix });
  const apres = rangDuVillage(g.habitants);
  if (apres.palier > avant.palier) {
    ctx.events.push({ type: 'rang', id: apres.id, name: apres.name, habitants: g.habitants });
    permisDeRang(ctx, apres.palier);
  }
  suivreObjectifs(ctx);
  return ctx.result();
}

/** Jour travaillé : au moins une quête payée ce jour-là et pas remballée. */
function jourPaye(ledger, day) {
  const keys = new Set(ledger.map((e) => e.key));
  return ledger.some((e) => e.type === 'reward' && e.day === day && !keys.has(reverseKey(e.taskId, e.occurrence)));
}

/** Énergie de l'éolienne qui reste acquise pour ce jour : productions moins reprises (0, ou celle d'un jour). */
export function eolienneDuJour(ledger, day) {
  return round1(ledger.filter((e) => e.type === 'prod' && e.batiment === 'eolienne' && e.day === day)
    .reduce((s, e) => s + (Number(e.energy) || 0), 0));
}

// Première clé libre de la série : base, puis base:2, base:3… (ou base:1, base:2… si `depuis` vaut 1).
function cleLibre(ledger, base, depuis = 2) {
  if (depuis > 1 && !hasKey(ledger, base)) return base;
  let k = depuis;
  while (hasKey(ledger, `${base}:${k}`)) k++;
  return `${base}:${k}`;
}

/**
 * Production de l'éolienne, appelée par quests.js après une quête payée : la première du jour inscrit
 * prod:eolienne:{jour} au registre. Jamais deux fois en même temps : rien si l'Énergie du jour est déjà acquise. Si
 * elle a été reprise (Remballer), une nouvelle quête payée ce jour-là la reverse sous prod:eolienne:{jour}:2, :3…
 */
export function produireEolienne(ctx) {
  const n = compte(ctx.game, 'eolienne');
  if (!n || eolienneDuJour(ctx.ledger, ctx.day) > 0) return;
  const key = cleLibre(ctx.ledger, `prod:eolienne:${ctx.day}`);
  ctx.append({ key, at: toISO(ctx.now), day: ctx.day, type: 'prod', batiment: 'eolienne', pe: 0, energy: EOLIENNE_ENERGIE * n, materials: 0 }, 'eolienne');
}

/**
 * Reprise, appelée par Remballer : si le jour du gain annulé n'a plus aucune quête payée, l'Énergie de l'éolienne de
 * ce jour est reprise par une écriture inverse reprise:eolienne:{jour}:{n} (le registre n'est jamais réécrit).
 * Événement { type: 'eolienne-reprise', day, energy }.
 */
export function reprendreEolienne(ctx, day) {
  const net = eolienneDuJour(ctx.ledger, day);
  if (net <= 0 || jourPaye(ctx.ledger, day)) return;
  const key = cleLibre(ctx.ledger, `reprise:eolienne:${day}`, 1);
  ctx.append({ key, at: toISO(ctx.now), day, type: 'prod', batiment: 'eolienne', reprise: true, pe: 0, energy: -net, materials: 0 }, 'eolienne');
  ctx.events.push({ type: 'eolienne-reprise', day, energy: net });
}
