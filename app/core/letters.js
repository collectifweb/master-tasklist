// Lettre du matin de Fanal. content/fr-CA/lettres.json est passé en paramètre (core/ ne lit aucun fichier).
// Sans répétition sur 7 jours ; la mémoire des lettres montrées est dans l'état du jeu (game.letters : { id: jour }).
import { Ctx } from './quests.js';
import { gameDay, daysBetween, isSnowSeason } from './time.js';
import { topCards } from './cote.js';

export const LETTER_REPEAT_DAYS = 7;

/**
 * Remplit les gabarits {nom}. Sans prénom, l'apostrophe « , {prenom} » ou « {prenom}, » disparaît (« Bon matin, {prenom}. » →
 * « Bon matin. » ; « T’es {prenom}, le septième… » → « T’es le septième… »). Tout autre gabarit sans valeur rend la phrase impossible : renvoie null.
 */
export function fillText(text, vars = {}) {
  let s = String(text);
  if (!vars.prenom) s = s.replace(/,\s*\{prenom\}/g, '').replace(/\{prenom\},\s*/g, ''); // « Bon matin, {prenom}. » et « T’es {prenom}, le… »
  let ok = true;
  s = s.replace(/\{(\w+)\}/g, (m, k) => {
    const v = vars[k];
    if (v === undefined || v === null || v === '') { ok = false; return m; }
    return String(v);
  });
  return ok ? s : null;
}

// Période d'une lettre : neige du 15 novembre au 30 avril, automne de septembre à la neige.
function periodOf(day) {
  if (isSnowSeason(day)) return 'neige';
  const m = Number(day.slice(5, 7));
  return m >= 9 && m <= 11 ? 'automne' : null;
}

/** Hash djb2 d'une chaîne (entier non signé) : tirages déterministes des lettres et des imprévus (imprevus.js). */
export function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/**
 * Lettre du jour : `retour` si le bonus de retour a été donné aujourd'hui (openApp, après 3 jours ou plus),
 * sinon `matin` avec {quete} = la quête n° 1 (topCards), ou `matinSansQuete` s'il n'y a aucune quête ouverte.
 * options : { prenom } (réglage facultatif). Renvoie { id, kind, lignes, questId, seen } ou null ; `seen: true` si la
 * lettre du jour a déjà été montrée (c'est alors la même). L'interface note la lettre montrée par markLetterShown.
 */
export function morningLetter(lettres, tasks, game, now, { prenom } = {}) {
  const today = gameDay(now);
  const shown = game.letters ?? {};
  const first = topCards(tasks, now).first;
  const kind = game.lastReturnDay === today ? 'retour' : first ? 'matin' : 'matinSansQuete';
  const vars = { prenom: prenom || null, quete: first ? first.task : null };
  const period = periodOf(today);
  const cands = [];
  for (const l of lettres?.[kind] ?? []) {
    if (l.periode && l.periode !== period) continue;
    const lignes = (l.texte ?? []).map((t) => fillText(t, vars));
    if (!lignes.length || lignes.some((x) => x === null)) continue;
    cands.push({ id: l.id, lignes });
  }
  if (!cands.length) return null;
  const out = (c, seen) => ({ id: c.id, kind, lignes: c.lignes, questId: first ? first.id : null, seen });
  const todays = cands.find((c) => shown[c.id] === today);
  if (todays) return out(todays, true);
  const fresh = cands.filter((c) => !shown[c.id] || daysBetween(shown[c.id], today) >= LETTER_REPEAT_DAYS);
  if (fresh.length) return out(fresh[hash(today) % fresh.length], false);
  // toutes vues dans les 7 derniers jours : la plus anciennement montrée
  return out([...cands].sort((a, b) => (shown[a.id] < shown[b.id] ? -1 : shown[a.id] > shown[b.id] ? 1 : 0))[0], false);
}

/**
 * Lettre de passage à la v2 (`lettres.passage`) : seulement à une partie convertie depuis la v1 (`game.migratedAt`),
 * jamais à une partie neuve, et une seule fois (notée par markLetterShown comme les autres). options : { prenom }.
 * Renvoie { id, kind: 'passage', lignes, questId: null, seen: false } ou null.
 */
export function passageLetter(lettres, game, { prenom } = {}) {
  const l = lettres?.passage?.[0];
  if (!l || !game?.migratedAt || (game.letters ?? {})[l.id]) return null;
  const lignes = (l.texte ?? []).map((t) => fillText(t, { prenom: prenom || null }));
  if (!lignes.length || lignes.some((x) => x === null)) return null;
  return { id: l.id, kind: 'passage', lignes, questId: null, seen: false };
}

/**
 * Lettre de conversion des niveaux en permis (`lettres.conversion`) : seulement à une partie v2 d'avant les permis, qui
 * porte `permis.cadeau` (state.js : n anciens niveaux devenus n permis), et une seule fois (markLetterShown). Le texte
 * dépend de n : `zero`, `one` ou `other` ({n} rempli). options : { prenom }.
 * Renvoie { id, kind: 'conversion', lignes, questId: null, seen: false } ou null.
 */
export function conversionLetter(lettres, game, { prenom } = {}) {
  const l = lettres?.conversion?.[0];
  const n = game?.permis?.cadeau;
  if (!l || !Number.isInteger(n) || n < 0 || (game.letters ?? {})[l.id]) return null;
  const textes = l[n === 0 ? 'zero' : n === 1 ? 'one' : 'other'] ?? [];
  const lignes = textes.map((t) => fillText(t, { prenom: prenom || null, n }));
  if (!lignes.length || lignes.some((x) => x === null)) return null;
  return { id: l.id, kind: 'conversion', lignes, questId: null, seen: false };
}

/** Note la lettre montrée aujourd'hui (params.id). */
export function markLetterShown(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  if (!params.id) throw new Error('Lettre inconnue.');
  if ((ctx.game.letters ?? {})[params.id] !== ctx.day) {
    ctx.game = { ...ctx.game, letters: { ...(ctx.game.letters ?? {}), [params.id]: ctx.day } };
  }
  return ctx.result();
}
