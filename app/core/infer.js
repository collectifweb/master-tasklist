// Domaine deviné à l'ajout d'une quête, à partir du dictionnaire content/fr-CA/ancres.json
// (passé en paramètre : core/ ne lit aucun fichier). Insensible à la casse et aux accents.
import { normalizeText, quartierOf, groupedDomain } from './domains.js';

function stem(token) {
  return token.length > 3 ? token.replace(/[sx]$/, '') : token;
}

function tokens(text) {
  return normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean).map(stem);
}

const cache = new WeakMap();

/** Index { 'mot stemmé' | 'mot1 mot2' → ancre } construit une fois par dictionnaire. */
export function buildIndex(dictionary) {
  if (cache.has(dictionary)) return cache.get(dictionary);
  const map = new Map();
  let maxLen = 1;
  for (const anchor of dictionary.anchors) {
    for (const kw of anchor.keywords) {
      const toks = tokens(kw);
      if (!toks.length) continue;
      maxLen = Math.max(maxLen, toks.length);
      const k = toks.join(' ');
      if (!map.has(k)) map.set(k, anchor);
    }
  }
  const index = { map, maxLen };
  cache.set(dictionary, index);
  return index;
}

/** Toutes les ancres trouvées dans le titre, dans l'ordre d'apparition (les expressions longues d'abord). */
export function findAnchors(title, dictionary) {
  const { map, maxLen } = buildIndex(dictionary);
  const toks = tokens(title);
  const found = [];
  for (let i = 0; i < toks.length; ) {
    let hit = null;
    for (let len = Math.min(maxLen, toks.length - i); len >= 1 && !hit; len--) {
      const a = map.get(toks.slice(i, i + len).join(' '));
      if (a) hit = { anchor: a, len };
    }
    if (hit) { found.push(hit.anchor); i += hit.len; } else i++;
  }
  return found;
}

/**
 * Devine le domaine : { domain, quartier, anchor, anchorLabel } ou null si rien ne correspond.
 * Le domaine qui compte le plus de mots-clés l'emporte ; à égalité, le premier mot du titre.
 */
export function inferDomain(title, dictionary) {
  const found = findAnchors(title, dictionary);
  if (!found.length) return null;
  const counts = new Map();
  for (const a of found) counts.set(a.domain, (counts.get(a.domain) || 0) + 1);
  let best = null;
  for (const a of found) {
    if (!best || counts.get(a.domain) > counts.get(best.domain)) best = a;
  }
  const domain = groupedDomain(best.domain) ?? best.domain;
  return { domain, quartier: quartierOf(domain), anchor: best.id, anchorLabel: best.label };
}

/** Objet-reflet (ancre) que la quête fait reluire, ou null. */
export function reflectObject(title, dictionary) {
  const found = findAnchors(title, dictionary);
  return found.length ? found[0].id : null;
}
