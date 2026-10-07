// Objectifs du village (bible §10 et §11, lot 5) : les cinq premiers pas, l'objectif de la saison et le bandeau.
// Les premiers pas appartiennent au jeu, jamais à la liste : rien n'est écrit dans les tâches. Le bandeau les propose
// dans l'ordre, et chaque pas est un constat sur l'état (bâtiments, liste, registre), coché dès qu'il est vrai, même
// avant son tour (demande d'Alex, 7 octobre 2026). Chacun verse une seule fois un coup de pouce au registre sous pas:{id} ;
// l'objectif de saison, sous saison:{saison-année}. Clés uniques : rejouer, recharger ou migrer ne repaie jamais.
// Les gestes de batiments.js et quests.js appellent suivreObjectifs(ctx) à la fin de leur travail.
import { gameDay, weekStart } from './time.js';
import { round1 } from './reward.js';
import { findEntry, hasKey, reverseKey } from './ledger.js';
import { orderByCote } from './cote.js';
import { rangDuVillage } from './village.js';
import {
  batimentsDuVillage, compte, logements, stockage, stockageBase, potagerOuvert, refusConstruire, refusSemer, refusAccueillir,
} from './batiments.js';
import { Ctx } from './quests.js';
import { annoncerPermisDeSaison } from './quartiers.js';

/**
 * Les cinq premiers pas, dans l'ordre de la bible. recompense : { energy?, materials?, food? }, réglée par la
 * simulation (tests/core/simulation.test.mjs) pour qu'à rythme régulier la première famille arrive vers le 6e jour.
 * hiver : le coup de pouce quand le potager dort (novembre à avril). Le pas passe alors par l'atelier et la petite
 * serre, seule à nourrir le village : sans ce supplément, la première famille attendrait deux récoltes de la serre.
 */
export const PREMIERS_PAS = [
  { id: 'chalet', recompense: { materials: 5 } },
  { id: 'tache', recompense: { energy: 2 } },
  { id: 'terminer', recompense: { materials: 5 } },
  { id: 'semer', recompense: { food: 6 }, hiver: { food: 9 } },
  { id: 'famille', recompense: { energy: 3 } },
];
export const PAS_IDS = PREMIERS_PAS.map((p) => p.id);

/**
 * Objectif de chaque saison (récompense : { energy?, materials?, permis? }). L'automne : remplir le grenier ; l'hiver :
 * « Garder la serre allumée », `recoltes` récoltes de petite serre de décembre à février (10 : la simulation (j) les
 * place entre le 2 et le 31 janvier selon le joueur, mesuré le 7 octobre 2026). Le printemps et l'été s'affichent « à venir ».
 */
export const OBJECTIFS_SAISON = {
  automne: { id: 'grenier', recompense: { energy: 3, materials: 10, permis: 1 } },
  hiver: { id: 'serre', recoltes: 10, recompense: { energy: 3, materials: 10, permis: 1 } },
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v.filter(isObj) : []);
const pasKey = (id) => `pas:${id}`;
const saisonKey = (cle) => `saison:${cle}`;

// Constat de chaque pas sur l'état : vrai dès que le joueur l'a fait, quel que soit le moment.
const CONSTATS = {
  chalet: (tasks, game) => compte(game, 'chalet') > 0,
  tache: (tasks) => tasks.length > 0,
  terminer: (tasks, game, ledger) => tasks.some((t) => t.status === 'done' || t.doneAt || t.lastDone)
    || ledger.some((e) => String(e.key).startsWith('reward:')),
  semer: (tasks, game) => list(game.parcelles).some((p) => typeof p.semeLe === 'string'),
  famille: (tasks, game) => logements(game).habitants > 0,
};

/** Récoltes de petite serre comptées pour l'hiver `cle` (hiver-AAAA), d'après game.recoltesHiver = { cle, n }. */
export function recoltesHiver(game, cle) {
  const r = game.recoltesHiver;
  return isObj(r) && r.cle === cle ? Math.max(0, Math.floor(Number(r.n)) || 0) : 0;
}

/** Récolte faite (recolter, batiments.js) : une récolte de serre en hiver compte pour l'objectif. Modifie `g` (une copie). */
export function noterRecolteHiver(g, lieu, day) {
  const s = saisonDe(day);
  if (lieu !== 'serre' || s.id !== 'hiver') return;
  g.recoltesHiver = { cle: s.cle, n: recoltesHiver(g, s.cle) + 1 };
}

// Avancée de chaque objectif de saison : { stock, max } ; atteint quand stock ≥ max. Le grenier se mesure au stockage de
// base (départ et greniers) : monter la Place ne rend pas l'objectif plus dur.
const AVANCEE = {
  grenier: (game) => ({ stock: round1(game.resources.food), max: stockageBase(game) }),
  serre: (game, cle) => ({ stock: recoltesHiver(game, cle), max: OBJECTIFS_SAISON.hiver.recoltes }),
};
const atteint = (id, game, cle) => { const a = AVANCEE[id](game, cle); return a.stock >= a.max; };

/** Saison du vrai calendrier pour un jour de jeu : { id, cle }. L'hiver de décembre 2026 à février 2027 est hiver-2026. */
export function saisonDe(day) {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const id = m >= 9 && m <= 11 ? 'automne' : m === 12 || m <= 2 ? 'hiver' : m <= 5 ? 'printemps' : 'ete';
  return { id, cle: `${id}-${id === 'hiver' && m <= 2 ? y - 1 : y}` };
}

/**
 * Premiers pas : { courant (id du pas à faire, ou null), faits, total, pas: [{ id, fait (jour atteint, ou null) }] }.
 * Lecture pure de l'état noté (game.premiersPas), complétée par le registre si l'état a perdu sa mémoire.
 */
export function etatPremiersPas(tasks, game, ledger = []) {
  const notes = isObj(game.premiersPas) ? game.premiersPas : {};
  const pas = PAS_IDS.map((id) => ({ id, fait: typeof notes[id] === 'string' ? notes[id] : findEntry(ledger, pasKey(id))?.day ?? null }));
  return { courant: pas.find((p) => !p.fait)?.id ?? null, faits: pas.filter((p) => p.fait).length, total: PAS_IDS.length, pas };
}

// Première quête à faire, dans l'ordre de la Cote (celle que la liste montre en tête).
const premiereQuete = (tasks, now) => orderByCote(tasks.filter((t) => t.status === 'todo' && !t.readonly), now)[0] ?? null;

// Premier emplacement libre d'un type (chalet-1…).
function emplacementLibre(game, type) {
  const pris = new Set(batimentsDuVillage(game).map((b) => b.id));
  let k = 1;
  while (pris.has(`${type}-${k}`)) k++;
  return `${type}-${k}`;
}

/**
 * Prochain geste du pas courant : { pas, geste ('construire' | 'ajouter' | 'terminer' | 'semer' | 'accueillir'), cible
 * (emplacement ou identifiant de quête, ou null), raison (ce qui manque, écrit par le cœur, ou null) } ; null quand les
 * cinq pas sont faits. L'hiver, « semer » passe par l'atelier puis la petite serre.
 */
export function prochainGeste(tasks, game, ledger, now) {
  const { courant } = etatPremiersPas(tasks, game, ledger);
  if (!courant) return null;
  const out = (geste, cible, raison) => ({ pas: courant, geste, cible, raison: raison ?? null });
  if (courant === 'chalet') return out('construire', emplacementLibre(game, 'chalet'), refusConstruire(game, 'chalet'));
  if (courant === 'tache') return out('ajouter', null, null);
  if (courant === 'terminer') return out('terminer', premiereQuete(tasks, now)?.id ?? null, null);
  if (courant === 'semer') {
    if (potagerOuvert(gameDay(now))) {
      const p = batimentsDuVillage(game).find((b) => b.type === 'parcelle')?.id ?? 'parcelle-1';
      return out('semer', p, refusSemer(game, ledger, p, now));
    }
    for (const type of ['atelier', 'serre']) if (!compte(game, type)) return out('construire', `${type}-1`, refusConstruire(game, type));
    return out('semer', 'serre-1', refusSemer(game, ledger, 'serre-1', now));
  }
  const chalet = batimentsDuVillage(game).find((b) => b.type === 'chalet')?.id ?? null;
  return out('accueillir', chalet, refusAccueillir(game));
}

/**
 * Objectif de la saison en cours : { id, cle, objectif, atteint, stock, max } (automne : la Nourriture sur le stockage de
 * base ; hiver : les récoltes de serre sur leur nombre), ou { id, cle, objectif: null, atteint: false, aVenir: true } pour
 * une saison qui n'en a pas encore.
 */
export function objectifSaison(game, ledger, now) {
  const s = saisonDe(gameDay(now));
  const obj = OBJECTIFS_SAISON[s.id];
  if (!obj) return { id: s.id, cle: s.cle, objectif: null, atteint: false, aVenir: true };
  return { id: s.id, cle: s.cle, objectif: obj.id, atteint: hasKey(ledger, saisonKey(s.cle)), ...AVANCEE[obj.id](game, s.cle) };
}

// Quêtes payées cette semaine (lundi à aujourd'hui, remballées exclues) et jours où il y en a eu au moins une.
function semaineDe(ledger, day) {
  const debut = weekStart(day);
  const keys = new Set(ledger.map((e) => e.key));
  const payees = ledger.filter((e) => e.type === 'reward' && typeof e.day === 'string' && e.day >= debut && e.day <= day
    && !keys.has(reverseKey(e.taskId, e.occurrence)));
  return { quetes: payees.length, jours: new Set(payees.map((e) => e.day)).size };
}

/**
 * Bandeau d'objectifs (bible §10), lecture pure : { aujourdhui, semaine, saison, rang }.
 * - aujourdhui : { kind: 'pas', …prochainGeste } ; une fois les pas faits, { kind: 'quete', taskId, titre } (la quête en
 *   tête de la Cote), ou { kind: 'rien' } quand aucune quête n'est ouverte.
 * - semaine : { kind: 'pas', faits, total, courant, pas } tant que les premiers pas durent, puis
 *   { kind: 'semaine', quetes, jours } (quêtes payées cette semaine, et sur combien de jours).
 * - saison : objectifSaison.
 * - rang : { habitants, nom, suivant, min, cible, encore, part } (part : avancée de 0 à 1 vers le rang suivant).
 */
export function bandeau(tasks, game, ledger, now) {
  const etat = etatPremiersPas(tasks, game, ledger);
  let aujourdhui;
  if (etat.courant) aujourdhui = { kind: 'pas', ...prochainGeste(tasks, game, ledger, now) };
  else {
    const q = premiereQuete(tasks, now);
    aujourdhui = q ? { kind: 'quete', taskId: q.id, titre: q.task } : { kind: 'rien' };
  }
  const semaine = etat.courant
    ? { kind: 'pas', faits: etat.faits, total: etat.total, courant: etat.courant, pas: etat.pas }
    : { kind: 'semaine', ...semaineDe(ledger, gameDay(now)) };
  const h = logements(game).habitants;
  const r = rangDuVillage(h);
  const rang = { habitants: h, nom: r.name, suivant: r.suivant.name, min: r.min, cible: r.suivant.min, encore: r.suivant.encore, part: (h - r.min) / (r.suivant.min - r.min) };
  return { aujourdhui, semaine, saison: objectifSaison(game, ledger, now), rang };
}

// ───────── Suivi, appelé par les gestes ─────────

function suivrePremiersPas(ctx) {
  for (const p of PREMIERS_PAS) {
    const notes = isObj(ctx.game.premiersPas) ? ctx.game.premiersPas : {};
    if (typeof notes[p.id] === 'string') continue;
    const deja = findEntry(ctx.ledger, pasKey(p.id));
    if (deja) { // l'état a perdu sa mémoire : retrouvée au registre, sans repayer
      ctx.game = { ...ctx.game, premiersPas: { ...notes, [p.id]: typeof deja.day === 'string' ? deja.day : ctx.day } };
      continue;
    }
    if (!CONSTATS[p.id](ctx.tasks, ctx.game, ctx.ledger)) continue; // un pas pas encore fait n'empêche pas de cocher les suivants
    ctx.game = { ...ctx.game, premiersPas: { ...notes, [p.id]: ctx.day } };
    const r = p.hiver && !potagerOuvert(ctx.day) ? p.hiver : p.recompense;
    // la Nourriture ne dépasse jamais le stockage : ce qui ne tient pas n'est pas inscrit
    const food = round1(Math.min(r.food || 0, Math.max(0, stockage(ctx.game) - ctx.game.resources.food)));
    ctx.append({ key: pasKey(p.id), at: ctx.iso, day: ctx.day, type: 'pas', pas: p.id, pe: 0, energy: r.energy || 0, materials: r.materials || 0, food }, 'pas', { pas: p.id });
    ctx.events.push({ type: 'premier-pas', id: p.id, energy: r.energy || 0, materials: r.materials || 0, food });
  }
}

function suivreSaison(ctx) {
  const s = saisonDe(ctx.day);
  const obj = OBJECTIFS_SAISON[s.id];
  if (!obj || hasKey(ctx.ledger, saisonKey(s.cle)) || !atteint(obj.id, ctx.game, s.cle)) return;
  const r = obj.recompense;
  ctx.append({ key: saisonKey(s.cle), at: ctx.iso, day: ctx.day, type: 'saison', saison: s.cle, objectif: obj.id, pe: 0, energy: r.energy || 0, materials: r.materials || 0, food: 0, permis: r.permis || 0 }, 'saison', { objectif: obj.id });
  ctx.events.push({ type: 'objectif-saison', saison: s.id, cle: s.cle, objectif: obj.id, energy: r.energy || 0, materials: r.materials || 0, permis: r.permis || 0 });
  if (r.permis) annoncerPermisDeSaison(ctx);
}

/** Valide ce qui est devenu vrai : les premiers pas (chacun dès qu'il est vrai), puis l'objectif de la saison. */
export function suivreObjectifs(ctx) {
  suivrePremiersPas(ctx);
  suivreSaison(ctx);
}

/** Tenue : les écrans d'accueil ont été vus (game.accueil = jour). Une seule fois ; ensuite, sans effet. */
export function voirAccueil(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  if (!ctx.game.accueil) ctx.game = { ...ctx.game, accueil: ctx.day };
  return ctx.result();
}
