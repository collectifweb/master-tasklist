// L'allure du village (bible §9, lot A, plan validé par Alex le 7 octobre 2026 au soir) : au ralenti, régulier, plein régime.
// Elle se calcule chaque lundi pour la semaine de jeu (lundi au dimanche), d'après les quêtes payées les 14 jours d'avant
// (une quête remballée ne compte pas) : moins de 14, la cible est « au ralenti » ; plus de 70, « plein régime » ; entre les
// deux, « régulier ». L'allure avance d'un cran au plus par semaine vers sa cible. Départ à « régulier », où elle reste tant
// que la partie a moins de 14 jours au lundi. Seules les quêtes comptent (décision d'Alex) : le second critère de la bible,
// les réserves, viendra avec les grands chantiers, qui donneront de quoi dépenser.
// Lecture pure du registre et du jour de départ de la partie (game.startDay) : tous les appareils voient la même, même hors
// ligne, et rien n'est écrit dans la partie. Ce qu'elle change : les imprévus de la semaine (imprevus.js), la cible
// de l'objectif de saison (objectifs.js), la quête que proposent la lettre du matin et le bandeau au ralenti (plusCourte).
// Jamais un prix, une réparation, un niveau, ni ce que rapporte une quête.
import { weekStart, addDays, daysBetween, isDayString } from './time.js';
import { reverseKey } from './ledger.js';
import { orderByCote } from './cote.js';

/** Les trois allures, de la plus douce à la plus exigeante. */
export const ALLURES = ['ralenti', 'regulier', 'plein'];
/** Fenêtre (jours avant le lundi) et seuils : moins de `ralenti` quêtes, au ralenti ; plus de `plein`, plein régime. */
export const ALLURE = { fenetre: 14, ralenti: 14, plein: 70 };

// Quêtes payées par jour, remballées exclues.
function parJour(ledger) {
  const keys = new Set(ledger.map((e) => e.key));
  const m = new Map();
  for (const e of ledger) {
    if (e.type !== 'reward' || !isDayString(e.day) || keys.has(reverseKey(e.taskId, e.occurrence))) continue;
    m.set(e.day, (m.get(e.day) || 0) + 1);
  }
  return m;
}

const cibleDe = (quetes) => (quetes < ALLURE.ralenti ? 'ralenti' : quetes > ALLURE.plein ? 'plein' : 'regulier');
// Un cran au plus vers la cible.
function versCible(niveau, cible) {
  const a = ALLURES.indexOf(niveau);
  return ALLURES[a + Math.sign(ALLURES.indexOf(cible) - a)];
}

/**
 * Allure de la semaine qui contient `day` : { niveau ('ralenti' | 'regulier' | 'plein'), semaine (le lundi), quetes
 * (payées sur les 14 jours d'avant le lundi), cible, change (-1, 0 ou 1 par rapport à la semaine d'avant) }. `quetes` et
 * `cible` valent null tant que la partie a moins de 14 jours au lundi. Les semaines sont rejouées depuis la première de la
 * partie : une absence fait descendre l'allure d'un cran par semaine, sans que personne ait ouvert l'app.
 */
export function allureDe(game, ledger, day) {
  const lundi = weekStart(day);
  const depart = isDayString(game?.startDay) ? game.startDay : lundi;
  const jours = parJour(Array.isArray(ledger) ? ledger : []);
  let niveau = 'regulier', avant = 'regulier', quetes = null, cible = null;
  for (let w = weekStart(depart); w <= lundi; w = addDays(w, 7)) {
    avant = niveau;
    if (daysBetween(depart, w) < ALLURE.fenetre) { quetes = null; cible = null; continue; }
    quetes = 0;
    for (let k = 1; k <= ALLURE.fenetre; k++) quetes += jours.get(addDays(w, -k)) || 0;
    cible = cibleDe(quetes);
    niveau = versCible(niveau, cible);
  }
  return { niveau, semaine: lundi, quetes, cible, change: ALLURES.indexOf(niveau) - ALLURES.indexOf(avant) };
}

const duree = (t) => Number(t.frozen?.length ?? t.length) || 0;

/**
 * Quête ouverte la plus courte (Durée, valeur gelée comprise), à durée égale la mieux placée dans la Cote ; null s'il n'y
 * en a aucune. C'est celle que proposent la lettre du matin et le bandeau au ralenti ; l'ordre de la liste ne change pas.
 */
export function plusCourte(tasks, now) {
  const ouvertes = orderByCote(tasks.filter((t) => t.status === 'todo' && !t.readonly), now);
  return ouvertes.length ? ouvertes.reduce((m, t) => (duree(t) < duree(m) ? t : m)) : null;
}
