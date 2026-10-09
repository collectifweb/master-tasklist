// L'hiver (bible §6 et §8, lot H, plan validé par Alex le 7 octobre 2026).
// Tempêtes de neige : de la première neige (15 novembre) à la fin de mars, l'écart entre deux tempêtes est tiré entre 7 et
// 14 jours d'après la date (tous les appareils voient les mêmes, même hors ligne). Aucune tempête pendant la trêve des
// Fêtes, ni annoncée pendant elle. Chaque tempête est annoncée TEMPETE.annonce jours d'avance (TOUR_ANNONCE avec une tour
// de guet, lot B : jamais pendant la trêve ni avant le lendemain de la tempête précédente) ; la barre de préparation a
// TEMPETE.crans crans : un par jour travaillé pendant l'annonce (une quête payée, non remballée), et un cran manqué
// s'achète, au plus un par jour d'annonce écoulé (« Rentrer du bois », game.prepa = { jour, achetes }).
// Le jour venu, au passage du temps, la tempête se règle une fois, sous la clé tempete:{jour} du registre :
//   - barre pleine : tenue, la récompense au registre (elle attend jusqu'au dimanche si l'on n'ouvre pas ce jour-là) ;
//   - sinon, si l'annonce a été vue (dernier passage pendant l'annonce, premiers pas déjà faits) et qu'on ouvre l'app le
//     jour même, hors reprise : un bâtiment est enseveli (dégât « neige » de imprevus.js : l'éolienne ne produit plus, la
//     culture verte de la serre ne pousse plus ; il se règle en payant, par une quête Terrain, ou fond seul) ;
//   - sinon, elle passe sans rien laisser (raison : 'pas-vue', 'absent', 'reprise', 'rien').
// Une tempête tombée avant la fin des premiers pas passe aussi, même barre pleine (raison 'premiers-pas') : son alerte
// n'a jamais paru.
// Jamais une tâche touchée, jamais une ressource retirée. Rien avant la fin des premiers pas.
// Objectif d'hiver « Garder la serre allumée » (objectifs.js) : les récoltes de serre de décembre à février, comptées dans
// game.recoltesHiver = { cle (hiver-AAAA), n }.
// Montants : à régler par la simulation (tests/core/simulation.test.mjs) et à montrer à Alex avant l'écran.
// Cycle d'import avec quests.js, imprevus.js et objectifs.js : tout est lu à l'appel.
import { Ctx } from './quests.js';
import { gameDay, addDays, weekStart, daysBetween, isTruce, isDayString, seasonDates } from './time.js';
import { round1 } from './reward.js';
import { hasKey } from './ledger.js';
import { tirage, DEGATS, degatsActifs, enReprise } from './imprevus.js';
import { batimentsDuVillage, etatCulture, joursTravailles, manque, compte } from './batiments.js';
import { etatPremiersPas } from './objectifs.js';

/**
 * annonce : jours d'avance ; ecart : [min, max] jours entre deux tempêtes ; fin : dernier jour possible (mois-jour) ;
 * crans : taille de la barre ; cran : prix d'un cran acheté ; tenue : récompense d'une tempête tenue.
 */
export const TEMPETE = { annonce: 3, ecart: [7, 14], fin: '03-31', crans: 3, cran: { materials: 3 }, tenue: { materials: 6 } };
/** Jours d'annonce avec une tour de guet (bible §5, lot B). */
export const TOUR_ANNONCE = 6; // 7 à l'envoi du lot B ; 6 depuis le 9 octobre (Alex : l'alerte restait affichée 63 % des jours d'hiver)
/** Jours d'annonce de ce village : TOUR_ANNONCE avec une tour de guet debout, TEMPETE.annonce sans elle. */
export const annonceDe = (game) => (compte(game, 'tour') ? TOUR_ANNONCE : TEMPETE.annonce);

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const cle = (jour) => `tempete:${jour}`;

// Année de la première neige de l'hiver qui contient `day` (de juillet à juin).
const anneeHiver = (day) => Number(day.slice(0, 4)) - (Number(day.slice(5, 7)) >= 7 ? 0 : 1);

/**
 * Jours de tempête de l'hiver qui contient `day` (de juillet à juin), dans l'ordre. Chaîne tirée depuis la première neige :
 * chaque tempête tire l'écart jusqu'à la suivante. Une tempête dont l'annonce ou le jour tombe dans la trêve est retirée
 * (la chaîne continue). Lecture pure de la date.
 */
export function tempetesDeLHiver(day) {
  const y = anneeHiver(day);
  const fin = `${y + 1}-${TEMPETE.fin}`;
  const [a, b] = TEMPETE.ecart;
  const out = [];
  for (let j = addDays(seasonDates(y).snow, a + (tirage(`tempete:${y}`) % (b - a + 1))); j <= fin; j = addDays(j, a + (tirage(`tempete:${j}`) % (b - a + 1)))) {
    if (!isTruce(j) && !isTruce(addDays(j, -TEMPETE.annonce))) out.push(j);
  }
  return out;
}

/** Vrai le jour d'une tempête. */
export const estJourDeTempete = (day) => tempetesDeLHiver(day).includes(day);

/**
 * Premier jour d'annonce de la tempête du `jour`, pour une annonce de `annonce` jours : jamais avant le lendemain de la
 * tempête précédente, ni pendant la trêve des Fêtes (alors le lendemain de la trêve). Avec l'annonce de base, toujours
 * `jour` − 3 : le tirage écarte une annonce dans la trêve, et deux tempêtes sont à 7 jours au moins. Lecture pure.
 */
export function debutAnnonce(jour, annonce = TEMPETE.annonce) {
  const prec = tempetesDeLHiver(jour).filter((j) => j < jour).at(-1);
  let d = addDays(jour, -annonce);
  if (prec && d <= prec) d = addDays(prec, 1);
  while (isTruce(d)) d = addDays(d, 1);
  return d;
}

/**
 * La tempête annoncée (ou celle du jour) : { jour, joursRestants (0 le jour même) }, ou null. `annonce` : jours d'annonce
 * (annonceDe). Lecture pure de la date.
 */
export function tempeteEnVue(day, annonce = TEMPETE.annonce) {
  const jour = tempetesDeLHiver(day).find((j) => j >= day && daysBetween(day, j) <= annonce && day >= debutAnnonce(j, annonce));
  return jour ? { jour, joursRestants: daysBetween(day, jour) } : null;
}

/**
 * Barre de la tempête du `jour`, vue le `day` : { travailles (jours travaillés de l'annonce, jusqu'à `day` et avant la
 * tempête), achetes (crans achetés pour elle), crans (au plus max), max }.
 */
export function preparation(game, ledger, jour, day) {
  const avant = addDays(debutAnnonce(jour, annonceDe(game)), -1);
  const jusqua = day < jour ? day : addDays(jour, -1);
  const travailles = jusqua > avant ? joursTravailles(ledger, avant, jusqua) : 0;
  const p = isObj(game.prepa) && game.prepa.jour === jour ? Math.max(0, Math.floor(Number(game.prepa.achetes)) || 0) : 0;
  return { travailles, achetes: p, crans: Math.min(TEMPETE.crans, travailles + p), max: TEMPETE.crans };
}

const premiersPasFaits = (tasks, game, ledger) => !etatPremiersPas(tasks, game, ledger).courant;
// Premiers pas tous faits avant le jour `jour` : sinon, l'alerte de cette tempête n'a jamais paru.
const premiersPasAvant = (ctx, jour) => etatPremiersPas(ctx.tasks, ctx.game, ctx.ledger).pas.every((p) => p.fait && p.fait < jour);

/**
 * Alerte à montrer (bandeau, île, Fanal) : { jour, joursRestants, debut (premier jour d'annonce), travailles, achetes,
 * crans, max, prix } pendant l'annonce et le jour même ; null hors alerte et pendant les premiers pas.
 */
export function alerteTempete(tasks, game, ledger, now) {
  const day = gameDay(now);
  const annonce = annonceDe(game);
  const v = tempeteEnVue(day, annonce);
  if (!v || !premiersPasFaits(tasks, game, ledger)) return null;
  return { ...v, debut: debutAnnonce(v.jour, annonce), ...preparation(game, ledger, v.jour, day), prix: { ...TEMPETE.cran } };
}

/**
 * Pourquoi on ne peut pas rentrer ce cran (ou null). params : { jour (la tempête), n (le cran acheté : achetés + 1) }.
 * Seul un cran manqué s'achète : jamais plus de crans que de jours d'annonce écoulés, aujourd'hui compris (la veille, tout
 * ce qui manque). Jamais pour une tempête déjà réglée (un geste hors ligne rejoué à son heure, après qu'un autre appareil
 * l'a réglée).
 */
export function refusPreparer(tasks, game, ledger, params, now) {
  const a = alerteTempete(tasks, game, ledger, now);
  if (!a || a.jour !== params?.jour) return 'Aucune tempête annoncée.';
  if (hasKey(ledger, cle(a.jour))) return 'Cette tempête est déjà passée.';
  if (a.joursRestants === 0) return 'La tempête est là : trop tard pour se préparer.';
  if (a.crans >= a.max) return 'La barre est déjà pleine.';
  if (params.n !== a.achetes + 1) return 'Ce cran est déjà rentré.';
  if (a.travailles + a.achetes >= daysBetween(a.debut, gameDay(now)) + 1) return 'Le prochain cran se gagne demain.';
  return manque(game, TEMPETE.cran);
}

/**
 * Rentrer du bois : un cran de la barre pour son prix. params : { jour, n }. Événement { type: 'preparation', jour, crans,
 * cout }. Rien au registre ni dans les tâches.
 */
export function preparer(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusPreparer(ctx.tasks, ctx.game, ctx.ledger, params, now);
  if (refus) throw new Error(refus);
  const cout = { ...TEMPETE.cran };
  const g = structuredClone(ctx.game);
  for (const [k, n] of Object.entries(cout)) g.resources[k] = round1(g.resources[k] - n);
  g.prepa = { jour: params.jour, achetes: params.n };
  ctx.game = g;
  ctx.events.push({ type: 'preparation', jour: params.jour, crans: preparation(g, ctx.ledger, params.jour, ctx.day).crans, cout });
  return ctx.result();
}

// Bâtiments que la neige peut ensevelir aujourd'hui : [{ cible, semeLe? }]. Une éolienne, ou une serre dont la culture
// pousse encore ; jamais un bâtiment qui porte déjà un dégât.
function cibles(ctx) {
  const occupe = new Set(degatsActifs(ctx.game, ctx.now).map((d) => d.cible));
  const out = [];
  for (const b of batimentsDuVillage(ctx.game)) {
    if (occupe.has(b.id)) continue;
    if (b.type === 'eolienne') out.push({ cible: b.id });
    if (b.type !== 'serre') continue;
    const st = etatCulture(ctx.game, ctx.ledger, b.id, ctx.now);
    if (st.semee && !st.mure) out.push({ cible: b.id, semeLe: st.semeLe });
  }
  return out;
}

// Inscrit l'issue de la tempête au registre (une seule fois : clé tempete:{jour}) et la raconte.
function regler(ctx, jour, resultat, extra = {}, gain = {}) {
  const { raison, ...champs } = extra;
  ctx.append({ key: cle(jour), at: ctx.iso, day: ctx.day, type: 'tempete', tempete: jour, resultat, ...champs, pe: 0, energy: gain.energy || 0, materials: gain.materials || 0 }, 'tempete', { tempete: resultat });
  ctx.events.push({ type: 'tempete', jour, resultat, ...extra, ...(gain.materials ? { materials: gain.materials } : {}) });
}

// La tempête du jour ensevelit un bâtiment, si elle le peut. Renvoie la raison de ne pas le faire, ou null.
function ensevelir(ctx, jour, seen) {
  const vue = isDayString(seen) && seen >= debutAnnonce(jour, annonceDe(ctx.game)) && seen < jour;
  if (!vue) return 'pas-vue';
  if (enReprise(ctx.game, ctx.now)) return 'reprise';
  const jours = DEGATS.neige.jours;
  const possibles = isTruce(addDays(jour, jours - 1)) ? [] : cibles(ctx);
  if (!possibles.length) return 'rien';
  const c = possibles[tirage(`neige:${jour}`) % possibles.length];
  const d = { id: `neige:${jour}`, type: 'neige', cible: c.cible, le: jour, jusqua: addDays(jour, jours), ...(c.semeLe ? { semeLe: c.semeLe } : {}) };
  ctx.game = { ...ctx.game, degats: [...(Array.isArray(ctx.game.degats) ? ctx.game.degats : []), d] };
  regler(ctx, jour, 'neige', { cible: c.cible, degat: d.id, jusqua: d.jusqua });
  return null;
}

/**
 * Passage du temps (advanceTime, quests.js), avant que le jour de présence soit noté : `seen` est le dernier jour vu.
 * Règle les tempêtes de la semaine arrivées à leur jour, une seule fois chacune. Idempotente. Événements : 'tempete' (et
 * 'reward' pour une tempête tenue).
 */
export function suivreTempetes(ctx, seen) {
  if (!premiersPasFaits(ctx.tasks, ctx.game, ctx.ledger)) return;
  const day = ctx.day;
  const lundi = weekStart(day);
  for (const jour of tempetesDeLHiver(day)) {
    if (jour > day || jour < lundi || hasKey(ctx.ledger, cle(jour))) continue;
    if (!premiersPasAvant(ctx, jour)) {
      regler(ctx, jour, 'passee', { raison: 'premiers-pas' });
      continue;
    }
    if (preparation(ctx.game, ctx.ledger, jour, day).crans >= TEMPETE.crans) {
      regler(ctx, jour, 'tenue', {}, TEMPETE.tenue);
      continue;
    }
    const raison = jour === day ? ensevelir(ctx, jour, seen) : 'absent';
    if (raison) regler(ctx, jour, 'passee', { raison });
  }
}
