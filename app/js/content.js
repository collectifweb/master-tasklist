// Textes (content/fr-CA/*.json), gabarits, et choix des répliques de personnages sans répétition sur 7 jours.
import { daysBetween, localParts, gameDay, SECTORS } from '../core/index.js';

const BASE = new URL('content/fr-CA/', document.baseURI).href;
export const content = { ui: {}, repliques: null, ancres: null, lettres: null };

export async function loadContent() {
  const get = async (f) => {
    const r = await fetch(BASE + f, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Texte introuvable : ' + f);
    return r.json();
  };
  const [ui, repliques, ancres] = await Promise.all([get('interface.json'), get('repliques.json'), get('ancres.json')]);
  content.ui = ui;
  content.repliques = repliques;
  content.ancres = ancres;
}

/** Remplace {nom} ; renvoie null si un gabarit n'a pas de valeur (jamais d'accolade affichée). */
export function fillStrict(text, vars = {}) {
  let ok = true;
  const out = String(text).replace(/\{(\w+)\}/g, (m, k) => {
    if (vars[k] === undefined || vars[k] === null) { ok = false; return m; }
    return String(vars[k]);
  });
  return ok ? out : null;
}

export function t(key, vars) {
  const raw = content.ui[key];
  if (raw === undefined) return key;
  return String(raw).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? String(vars[k]) : ''));
}

const plural = new Intl.PluralRules('fr-CA');
/** Pluriel : base.one / base.other. */
export function tn(base, n, vars = {}) {
  const form = plural.select(n) === 'one' ? 'one' : 'other';
  return t(`${base}.${form}`, { n, ...vars });
}

export const sectorName = (id) => t(`sector.${id}.name`);

// ───────── Répliques ─────────
const HIST_KEY = 'oree.replies.v1';
function readHist() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY)) || {}; } catch { return {}; }
}
function writeHist(h) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch { /* sans stockage : tirage sans mémoire */ }
}
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function momentOf(now) {
  const h = localParts(now).hour;
  if (h >= 4 && h < 12) return 'matin';
  if (h >= 18 || h < 4) return 'soir';
  return null;
}

/**
 * Tire une réplique pour une situation (règles de content/README.md) :
 * voix arrivée, filtres, gabarits remplissables, pas de repli sur 7 jours, tirage déterministe.
 * ctx : { now, chapter, sector?, length?, vars }. Renvoie { id, nom, texte, voix } ou null.
 * `gate` : applique la fréquence de la situation (1 = chaque fois, 3 = 1re puis une fois sur trois).
 */
export function pickReply(situation, ctx, { gate = true, record = true } = {}) {
  const rep = content.repliques;
  const sit = rep && rep.situations[situation];
  if (!sit) return null;
  const day = gameDay(ctx.now);
  const hist = readHist();
  const occKey = `#${situation}:${day}`;
  const occ = hist[occKey] || 0;
  if (record) { hist[occKey] = occ + 1; }
  if (gate && sit.frequence === 3 && occ % 3 !== 0) { if (record) writeHist(hist); return null; }

  const moment = momentOf(ctx.now);
  const cands = [];
  for (const v of sit.variantes) {
    const voix = rep.voix[v.voix];
    if (!voix || (voix.arrivee ?? 1) > (ctx.chapter ?? 1)) continue;
    if (v.secteur && v.secteur !== ctx.sector) continue;
    if (v.longueurMin && !(ctx.length >= v.longueurMin)) continue;
    if (v.moment && v.moment !== moment) continue;
    const texte = fillStrict(v.texte, ctx.vars);
    if (texte === null) continue;
    cands.push({ v, voix, texte });
  }
  if (!cands.length) { if (record) writeHist(hist); return null; }
  const last = (c) => hist[c.v.id];
  let pool = cands.filter((c) => !last(c) || daysBetween(last(c), day) > 6);
  let pick;
  if (pool.length) {
    pick = pool[hash(`${situation}|${day}|${occ}`) % pool.length];
  } else {
    pick = cands.slice().sort((a, b) => (last(a) < last(b) ? -1 : last(a) > last(b) ? 1 : 0))[0];
  }
  if (record) { hist[pick.v.id] = day; writeHist(hist); }
  return { id: pick.v.id, voix: pick.v.voix, nom: pick.voix.nom, texte: pick.texte };
}

/** Variables de gabarit d'une quête. */
export function replyVars(task, sectorId) {
  const id = sectorId in SECTORS ? sectorId : 'place';
  const the = t(`sector.${id}.the`);
  return {
    prenom: 'Alex',
    quete: task ? task.task : undefined,
    secteur: the,
    Secteur: the.charAt(0).toUpperCase() + the.slice(1),
    du_secteur: t(`sector.${id}.of`),
    au_secteur: t(`sector.${id}.in`),
  };
}
