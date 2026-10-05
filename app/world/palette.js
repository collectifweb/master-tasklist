// Palette du monde : matières à trois tons (-t dessus, -l face +v, -r face +u) et leurs états de secteur.
// Couleurs de base reprises du spike dom-svg (heure 12 h) ; celles qui existent dans tokens.css y sont lues
// au démarrage (--c-ash, --c-glass, --c-soil, --c-sage, --c-lake…), ce qui permet de les rebrancher là-bas.
//
// Recoloration secteur par secteur : chaque matière « d'environnement » est une variable CSS
// (--grass-t, --woodb-l…). Un groupe [data-etat] la redéfinit pour tout ce qu'il contient. Changer
// data-etat sur un groupe = un seul recalcul de style limité à ce secteur, aucune animation par image.

export const BASE = {
  // sol
  grass: '#a9bf6c', grassd: '#94ad5d', grassl: '#bfd287', lip: '#86a556',
  soil: '#a3683f', soilf: '#7a492d', soilr: '#bf8452',
  path: '#e8d29f', pathe: '#c7a776', cobble: '#d6c29a',
  // matériaux bâtis
  woodb: '#e3bb7c', woodd: '#8a5a3a', wooddk: '#64412e',
  stone: '#d4c9af', stoned: '#b2a58a',
  roof: '#7f9d69', roofb: '#56795c',
  metal: '#f0e6cb', tech: '#58a9a4', panel: '#2f6c71',
  glass: '#aee0d7', glassin: '#5f9584', canvas: '#eef2e2', ice: '#eef4f0',
  paper: '#fbf2d9', rope: '#c9a46a',
  // végétation et récoltes
  leaf: '#87a65b', leafd: '#5d8150', leafb: '#a1ba66', gold: '#dbb457', amber: '#cf9446',
  maple: '#b8404a', sprout: '#8fc25c', wheat: '#e6c163', squash: '#e8a542', hay: '#e8c86f',
  fl1: '#fbf0c8', fl2: '#f1c75a', fl3: '#c8b6e2',
  // eau
  water: '#7bbabb', waterl: '#b6e1d9', waterd: '#5b9ca3', mud: '#6f7d50',
  // socle (jamais recoloré)
  earth: '#8c5a3b', ochre: '#b97f4d', clay: '#d1a26a', rock: '#a0937e',
  // décor lointain
  far1: '#9fb7a6', far2: '#6f8f7c', far3: '#4f6f5f', cloud: '#fdfaf2', cloudb: '#dde5e8',
};

/** Matières qui changent avec l'état du secteur. Le reste (socle, ciel) garde ses couleurs. */
export const ENV = [
  'grass', 'grassd', 'grassl', 'lip', 'soil', 'soilf', 'soilr', 'path', 'pathe', 'cobble',
  'woodb', 'woodd', 'wooddk', 'stone', 'stoned', 'roof', 'roofb', 'metal', 'tech', 'panel',
  'glass', 'glassin', 'canvas', 'ice', 'paper', 'rope',
  'leaf', 'leafd', 'leafb', 'gold', 'amber', 'maple', 'sprout', 'wheat', 'squash', 'hay', 'fl1', 'fl2', 'fl3',
  'water', 'waterl', 'waterd', 'mud',
];
const GROUND = ['grass', 'grassd', 'grassl', 'lip'];
const SHADES = ['t', 'l', 'r'];

// jetons de tokens.css qui alimentent des matières du monde
const TOKEN_MAP = {
  '--c-glass': 'tech',
  '--c-soil': 'soilr',
  '--c-lake': 'water',
  '--c-lake-deep': 'waterd',
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const mul = (a, k) => a.map((x) => x * k);
const css = (c) => `rgb(${c.map((x) => Math.max(0, Math.min(255, Math.round(x)))).join(' ')})`;
const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

function shade(c, k) {
  if (k === 't') return c;
  if (k === 'l') return mix(mul(c, 0.85), [255, 205, 150], 0.05);
  return mix(mul(c, 0.63), [64, 74, 120], 0.16);
}

function readTokens(el) {
  const out = { ash: '#a39b8d', lantern: '#ffd98c' };
  if (!el || typeof getComputedStyle !== 'function') return out;
  const cs = getComputedStyle(el);
  const get = (name) => cs.getPropertyValue(name).trim();
  const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
  if (isHex(get('--c-ash'))) out.ash = get('--c-ash');
  if (isHex(get('--c-lantern-glow'))) out.lantern = get('--c-lantern-glow');
  for (const [tok, mat] of Object.entries(TOKEN_MAP)) { const v = get(tok); if (isHex(v)) out[mat] = v; }
  return out;
}

/**
 * Feuille de style des matières. `tokenRoot` : élément sur lequel lire les jetons de tokens.css (facultatif).
 * États : prosperer = couleurs pleines ; reparer = couleurs adoucies ; autonome = couleurs chaudes et vives ;
 * eteint = gris chauds de cendre ; cendre (secteur fermé) = cendre poudreuse ; brume (secteur caché) = presque blanc.
 */
export function paletteCSS(tokenRoot) {
  const tk = readTokens(tokenRoot);
  const base = { ...BASE };
  for (const mat of Object.values(TOKEN_MAP)) if (tk[mat]) base[mat] = tk[mat];
  const ash = hex(tk.ash);

  const variants = {
    full: (c) => c,
    reparer: (c) => mix(c, toAsh(c), 0.38),
    autonome: (c) => mix(mul(c, 1.05), [255, 226, 160], 0.06),
    eteint: (c) => toAsh(c),
    cendre: (c) => mix(toAsh(c), [236, 230, 219], 0.34),
    brume: (c) => mix(toAsh(c), [240, 242, 238], 0.72),
  };
  function toAsh(c) {
    const l = lum(c);
    const g = mix([l, l, l], ash, 0.42);
    return mix(g, [176, 168, 154], 0.22); // contraste resserré : la cendre aplatit
  }

  const decl = (mats, fn) => {
    const out = [];
    for (const m of mats) {
      const c = hex(base[m]);
      for (const k of SHADES) out.push(`--${m}-${k}:${css(fn(shade(c, k)))}`);
    }
    return out.join(';');
  };

  let s = '';
  s += `.ow{${decl(Object.keys(base), variants.full)};--lampg-off:#6d6b5f;--lampg-on:${tk.lantern};--win-day:#4f7f82;--win-night:#ffd98c}`;
  s += `.ow [data-etat="reparer"]{${decl(ENV, variants.reparer)}}`;
  // une construction neuve garde ses couleurs pleines, même dans un secteur encore gris
  s += `.ow [data-etat="prosperer"],.ow .ow-ent[data-neuf]{${decl(ENV, variants.full)}}`;
  s += `.ow [data-etat="autonome"]{${decl(ENV, variants.autonome)}}`;
  s += `.ow [data-etat="eteint"]{${decl(ENV, variants.eteint)}}`;
  s += `.ow [data-voile="cendre"]{${decl(ENV, variants.cendre)}}`;
  s += `.ow [data-voile="brume"]{${decl(ENV, variants.brume)}}`;
  // une case rallumée dans un secteur encore éteint prend les couleurs adoucies de la réparation
  s += `.ow [data-etat="eteint"] .ow-tile[data-lit]{${decl(GROUND, variants.reparer)}}`;
  // classes de remplissage et de trait
  for (const m of Object.keys(base)) {
    for (const k of SHADES) s += `.${m}-${k}{fill:var(--${m}-${k});stroke:var(--${m}-${k})}.k-${m}-${k}{stroke:var(--${m}-${k});fill:none}`;
  }
  return s;
}

let injected = null;
/** Injecte la feuille des matières une seule fois par document. */
export function ensurePalette(doc, tokenRoot) {
  if (injected && injected.isConnected) return injected;
  const st = doc.createElement('style');
  st.id = 'ow-palette';
  st.textContent = paletteCSS(tokenRoot);
  doc.head.appendChild(st);
  injected = st;
  return st;
}
