// Imprévus, première série (bible §8 et §9, lot I, plan validé par Alex le 6 octobre 2026 au soir).
// Calendrier : au plus deux par semaine (semaine de jeu, lundi au dimanche), à des jours tirés au sort d'après la date,
// le premier toujours bon, le second bon ou mauvais à pile ou face. Tous les appareils voient le même, même hors ligne.
// Ce qui arrive se décide le jour même, selon ce que le village possède ; un mauvais qui ne peut pas frapper (rien à
// toucher, reprise après une absence, trêve des Fêtes) devient un bon. Un bon manqué attend jusqu'au dimanche ; un mauvais
// ne frappe que le jour prévu, à l'ouverture, jamais à cause d'une absence. Rien avant la fin des premiers pas.
// Chaque créneau tiré s'inscrit au registre sous imprevu:{jour prévu} (clé unique : deux appareils ne le paient jamais
// deux fois) ; un bon y porte son gain. Un mauvais pose aussi un dégât dans la partie :
//   game.degats = [{ id, type, cible, le, jusqua, semeLe? (gel), fin?, par? ('paiement' | 'quete' | 'recolte') }]
// Un dégât agit tant que le jour est avant `jusqua` et qu'il n'est pas fini ; il se règle en payant (reparer), par une
// quête payée du bon domaine (reparerParQuete, appelée par quests.js), ou tout seul à `jusqua`, sans rien écrire. Il ne
// retire jamais de ressource et ne touche jamais une tâche : l'éolienne ne produit plus, l'ours mange une part de la
// récolte, le gel arrête la pousse (batiments.js lit ces effets).
// Montants : valeurs de départ, réglées par la simulation (tests/core/simulation.test.mjs, joueur (i)).
// Cycle d'import avec quests.js et batiments.js : tout est lu à l'appel.
import { Ctx } from './quests.js';
import { gameDay, addDays, weekStart, daysBetween, isTruce, isDayString } from './time.js';
import { round1 } from './reward.js';
import { hasKey } from './ledger.js';
import { hash } from './letters.js';
import { quartierOfTask } from './domains.js';
import { batimentsDuVillage, etatCulture, joursTravailles, stockage, potagerOuvert, manque } from './batiments.js';
import { etatPremiersPas, suivreObjectifs } from './objectifs.js';

/**
 * Catalogue. bons : gain { energy?, materials?, food? } (la Nourriture ne dépasse jamais la réserve). mauvais : quartier
 * dont une quête payée règle le dégât (atelier = Maison, champs = Terrain), prix pour le régler, jours avant qu'il se
 * règle seul ; ours.mange : Nourriture prise sur la récolte faite pendant sa visite ; gel.mois : mois où il peut frapper.
 */
export const IMPREVUS = {
  bons: {
    aurore: { gain: { energy: 6 } },
    peche: { gain: { food: 5 } },
    trouvaille: { gain: { materials: 6 } },
    orignal: { gain: {} },
  },
  mauvais: {
    panne: { quartier: 'atelier', reparer: { materials: 8 }, jours: 3 },
    ours: { quartier: 'champs', reparer: { energy: 3 }, jours: 3, mange: 2 },
    gel: { quartier: 'champs', reparer: { energy: 2 }, jours: 1, mois: [9, 10] },
  },
};
/** Reprise (bible §9) : après `absence` jours ou plus sans passage, `jours` jours sans mauvais imprévu (celui du retour compris). */
export const REPRISE = { absence: 5, jours: 3 };

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v.filter(isObj) : []);
const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const cle = (jour) => `imprevu:${jour}`;

// Tirage déterministe : le hash des lettres (letters.js), brassé (fmix32) pour que deux clés voisines, comme deux lundis
// qui se suivent, donnent des tirages indépendants.
function tirage(s) {
  let h = hash(s);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Calendrier de la semaine qui contient `day` : { semaine (lundi), creneaux: [{ jour, nature: 'bon' }, { jour, nature:
 * 'bon' | 'mauvais' }] }, deux jours distincts dans l'ordre. Lecture pure de la date.
 */
export function calendrierImprevus(day) {
  const semaine = weekStart(day);
  const h = tirage(`imprevus:${semaine}`);
  const a = h % 7;
  const b = (a + 1 + (Math.floor(h / 7) % 6)) % 7;
  const mauvais = Math.floor(h / 42) % 2 === 1;
  return {
    semaine,
    creneaux: [
      { jour: addDays(semaine, Math.min(a, b)), nature: 'bon' },
      { jour: addDays(semaine, Math.max(a, b)), nature: mauvais ? 'mauvais' : 'bon' },
    ],
  };
}

// Dégâts lisibles de la partie (un dégât abîmé est ignoré).
const degatsDe = (game) => list(game.degats).filter((d) => typeof d.id === 'string' && own(IMPREVUS.mauvais, d.type)
  && typeof d.cible === 'string' && isDayString(d.le) && isDayString(d.jusqua));
const actif = (d, day) => !d.fin && d.le <= day && day < d.jusqua;

/** Dégâts en cours ce jour-là : [{ …dégât, joursRestants (avant qu'il se règle seul : 1 = demain) }]. */
export function degatsActifs(game, now) {
  const day = gameDay(now);
  return degatsDe(game).filter((d) => actif(d, day)).map((d) => ({ ...d, joursRestants: daysBetween(day, d.jusqua) }));
}

/** Dégât en cours sur ce bâtiment ou cette parcelle (eolienne-1, parcelle-2…), ou null. */
export const degatDe = (game, cible, now) => degatsActifs(game, now).find((d) => d.cible === cible) ?? null;

const repriseLe = (game, day) => isObj(game.reprise) && isDayString(game.reprise.du) && isDayString(game.reprise.au)
  && game.reprise.du <= day && day <= game.reprise.au;
/** Vrai pendant la reprise qui suit une absence (game.reprise = { du, au }). */
export const enReprise = (game, now) => repriseLe(game, gameDay(now));

/**
 * Jours travaillés perdus par une culture à cause du gel : ceux de la fenêtre de gel (du jour du gel à sa fin, réparée ou
 * non), après le semis et jusqu'à aujourd'hui. Lu par etatCulture (batiments.js).
 */
export function joursGeles(game, ledger, id, semeLe, today) {
  let n = 0;
  for (const d of degatsDe(game)) {
    if (d.type !== 'gel' || d.cible !== id || d.semeLe !== semeLe) continue;
    const debut = addDays(d.le, -1) > semeLe ? addDays(d.le, -1) : semeLe;
    const fin = addDays(d.fin ?? d.jusqua, -1) < today ? addDays(d.fin ?? d.jusqua, -1) : today;
    if (fin > debut) n += joursTravailles(ledger, debut, fin);
  }
  return n;
}

/**
 * Récolte d'une parcelle (recolter, batiments.js) : { mange (Nourriture prise par l'ours en visite, au plus la récolte),
 * degats (la liste après la récolte : l'ours repart avec sa part, le gel de cette culture n'a plus d'objet) }.
 */
export function degatsALaRecolte(game, id, recolte, now) {
  const day = gameDay(now);
  const ours = degatsDe(game).find((d) => d.type === 'ours' && d.cible === id && actif(d, day));
  const degats = list(game.degats).filter((d) => !(d.type === 'gel' && d.cible === id))
    .map((d) => (ours && d.id === ours.id ? { ...d, fin: day, par: 'recolte' } : d));
  return { mange: ours ? Math.min(IMPREVUS.mauvais.ours.mange, recolte) : 0, degats };
}

/** Pourquoi on ne peut pas régler ce dégât en payant (ou null). params : { id }. */
export function refusReparer(game, params, now) {
  const d = degatsDe(game).find((x) => x.id === params?.id);
  if (!d) return 'Rien à réparer.';
  if (d.fin) return d.par === 'quete' ? 'Déjà réparé par une quête.' : d.par === 'recolte' ? 'L’ours est reparti avec sa part.' : 'Déjà réparé.';
  if (gameDay(now) >= d.jusqua) return 'Ça s’est réglé tout seul : rien à payer.';
  return manque(game, IMPREVUS.mauvais[d.type].reparer);
}

/**
 * Règle un dégât en payant son prix. params : { id }. Événement { type: 'reparation', degat, imprevu, cible, par:
 * 'paiement', cout }. Rien au registre ni dans les tâches.
 */
export function reparer(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusReparer(ctx.game, params, now);
  if (refus) throw new Error(refus);
  const d = degatsDe(ctx.game).find((x) => x.id === params.id);
  const cout = { ...IMPREVUS.mauvais[d.type].reparer };
  const g = structuredClone(ctx.game);
  for (const [k, n] of Object.entries(cout)) g.resources[k] = round1(g.resources[k] - n);
  g.degats = list(g.degats).map((x) => (x.id === d.id ? { ...x, fin: ctx.day, par: 'paiement' } : x));
  ctx.game = g;
  ctx.events.push({ type: 'reparation', degat: d.id, imprevu: d.type, cible: d.cible, par: 'paiement', cout });
  return ctx.result();
}

/**
 * Une quête payée règle les dégâts en cours de son domaine (Maison : l'éolienne ; Terrain : le potager), sans rien changer
 * à la quête ni à son gain. Appelée par quests.js juste après le gain, avant l'éolienne. Événement { type: 'reparation',
 * degat, imprevu, cible, par: 'quete', taskId } par dégât réglé.
 */
export function reparerParQuete(ctx, task) {
  const q = quartierOfTask(task);
  const regles = degatsDe(ctx.game).filter((d) => actif(d, ctx.day) && IMPREVUS.mauvais[d.type].quartier === q);
  if (!regles.length) return;
  const ids = new Set(regles.map((d) => d.id));
  ctx.game = { ...ctx.game, degats: list(ctx.game.degats).map((d) => (ids.has(d.id) ? { ...d, fin: ctx.day, par: 'quete' } : d)) };
  for (const d of regles) ctx.events.push({ type: 'reparation', degat: d.id, imprevu: d.type, cible: d.cible, par: 'quete', taskId: task.id });
}

// Cibles possibles d'un mauvais imprévu aujourd'hui : [{ type, cible, semeLe? }]. Un bâtiment ne porte qu'un dégât à la
// fois. L'ours vient sur une parcelle mûre du potager (mai à octobre), le gel sur une culture pas encore mûre.
function cibles(ctx) {
  const day = ctx.day;
  const occupe = new Set(degatsDe(ctx.game).filter((d) => actif(d, day)).map((d) => d.cible));
  const out = [];
  for (const b of batimentsDuVillage(ctx.game)) {
    if (occupe.has(b.id)) continue;
    if (b.type === 'eolienne') out.push({ type: 'panne', cible: b.id });
    if (b.type !== 'parcelle' || !potagerOuvert(day)) continue;
    const st = etatCulture(ctx.game, ctx.ledger, b.id, ctx.now);
    if (!st.semee) continue;
    if (st.mure) out.push({ type: 'ours', cible: b.id });
    else if (IMPREVUS.mauvais.gel.mois.includes(Number(day.slice(5, 7)))) out.push({ type: 'gel', cible: b.id, semeLe: st.semeLe });
  }
  return out;
}

// Un mauvais imprévu frappe, s'il le peut. Renvoie false sinon (le créneau devient un bon).
function frapper(ctx, jour) {
  if (isTruce(jour) || repriseLe(ctx.game, jour)) return false;
  const possibles = cibles(ctx);
  if (!possibles.length) return false;
  const types = [...new Set(possibles.map((c) => c.type))];
  const type = types[tirage(`mauvais:${jour}`) % types.length];
  const ceux = possibles.filter((c) => c.type === type);
  const c = ceux[tirage(`cible:${jour}`) % ceux.length];
  const d = { id: `${type}:${jour}`, type, cible: c.cible, le: jour, jusqua: addDays(jour, IMPREVUS.mauvais[type].jours), ...(c.semeLe ? { semeLe: c.semeLe } : {}) };
  ctx.game = { ...ctx.game, degats: [...list(ctx.game.degats), d] };
  ctx.append({ key: cle(jour), at: ctx.iso, day: ctx.day, type: 'imprevu', imprevu: type, cible: c.cible, pe: 0, energy: 0, materials: 0 }, 'imprevu');
  ctx.events.push({ type: 'imprevu', nature: 'mauvais', imprevu: type, cible: c.cible, degat: d.id, jusqua: d.jusqua });
  return true;
}

// Un bon imprévu : la pêche seulement s'il reste de la place dans la réserve (au moins 1 Nourriture).
function offrir(ctx, jour) {
  const place = round1(stockage(ctx.game) - ctx.game.resources.food);
  const ids = Object.keys(IMPREVUS.bons).filter((id) => id !== 'peche' || place >= 1);
  const id = ids[tirage(`bon:${jour}`) % ids.length];
  const gain = IMPREVUS.bons[id].gain;
  const food = gain.food ? round1(Math.min(gain.food, place)) : 0;
  ctx.append({ key: cle(jour), at: ctx.iso, day: ctx.day, type: 'imprevu', imprevu: id, pe: 0, energy: gain.energy || 0, materials: gain.materials || 0, ...(food ? { food } : {}) }, 'imprevu', { imprevu: id });
  ctx.events.push({ type: 'imprevu', nature: 'bon', imprevu: id, energy: gain.energy || 0, materials: gain.materials || 0, food, perdu: round1((gain.food || 0) - food) });
  if (food) suivreObjectifs(ctx); // une bonne pêche peut remplir le grenier (objectif d'automne), comme le marchand
}

// Les dégâts finis avant le lundi de la semaine quittent la partie, sauf un gel dont la culture est encore en terre.
function ranger(ctx) {
  if (!Array.isArray(ctx.game.degats)) return;
  const lundi = weekStart(ctx.day);
  const terre = new Map(list(ctx.game.parcelles).map((p) => [p.id, p.semeLe]));
  const garde = degatsDe(ctx.game).filter((d) => (d.fin ?? d.jusqua) >= lundi || (d.type === 'gel' && terre.get(d.cible) === d.semeLe));
  if (garde.length !== ctx.game.degats.length) ctx.game = { ...ctx.game, degats: garde };
}

/**
 * Passage du temps (advanceTime, quests.js), avant que le jour de présence soit noté : `seen` est le dernier jour vu.
 * Après REPRISE.absence jours ou plus, note la reprise ; range les vieux dégâts ; puis, les premiers pas faits, tire les
 * créneaux de la semaine arrivés à échéance. Idempotente. Événements : 'imprevu' (et 'reward' pour un gain).
 */
export function suivreImprevus(ctx, seen) {
  const day = ctx.day;
  if (isDayString(seen) && daysBetween(seen, day) >= REPRISE.absence) {
    ctx.game = { ...ctx.game, reprise: { du: day, au: addDays(day, REPRISE.jours - 1) } };
  }
  ranger(ctx);
  if (etatPremiersPas(ctx.tasks, ctx.game, ctx.ledger).courant) return;
  for (const c of calendrierImprevus(day).creneaux) {
    if (c.jour > day || hasKey(ctx.ledger, cle(c.jour))) continue;
    if (c.nature === 'mauvais') {
      if (c.jour < day) continue; // jour manqué : un mauvais ne frappe jamais à cause d'une absence
      if (frapper(ctx, c.jour)) continue;
    }
    offrir(ctx, c.jour);
  }
}
