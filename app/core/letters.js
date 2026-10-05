// Lettre du matin de Fanal. content/fr-CA/lettres.json est passé en paramètre (core/ ne lit aucun fichier).
// Sans répétition sur 7 jours ; la mémoire des lettres montrées est dans l'état du jeu (game.letters : { id: jour }).
import { Ctx } from './quests.js';
import { gameDay, daysBetween, isSnowSeason } from './time.js';
import { topCards } from './cote.js';

export const LETTER_REPEAT_DAYS = 7;

/**
 * Remplit les gabarits {nom}. Sans prénom, l'apostrophe « , {prenom} » disparaît (« Bon matin, {prenom}. » →
 * « Bon matin. »). Tout autre gabarit sans valeur rend la phrase impossible : renvoie null.
 */
export function fillText(text, vars = {}) {
  let s = String(text);
  if (!vars.prenom) s = s.replace(/,\s*\{prenom\}/g, '');
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

function hash(s) {
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

/** Note la lettre montrée aujourd'hui (params.id). */
export function markLetterShown(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  if (!params.id) throw new Error('Lettre inconnue.');
  if ((ctx.game.letters ?? {})[params.id] !== ctx.day) {
    ctx.game = { ...ctx.game, letters: { ...(ctx.game.letters ?? {}), [params.id]: ctx.day } };
  }
  return ctx.result();
}
