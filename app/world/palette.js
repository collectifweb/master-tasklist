// Palette du monde : matières à trois tons (-t dessus, -l face +v, -r face +u), en couleurs pleines.
// Couleurs de base reprises du spike dom-svg (heure 12 h) ; celles qui existent dans tokens.css y sont lues
// au démarrage (--c-glass, --c-soil, --c-lake…), ce qui permet de les rebrancher là-bas.
// Chaque matière est une variable CSS (--grass-t, --woodb-l…), lue par les classes de remplissage ci-dessous.

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
  paper: '#fbf2d9', rope: '#c9a46a', snow: '#f2f4ee',
  // végétation et récoltes
  leaf: '#87a65b', leafd: '#5d8150', leafb: '#a1ba66', gold: '#dbb457', amber: '#cf9446',
  maple: '#b8404a', sprout: '#8fc25c', wheat: '#e6c163', squash: '#e8a542', hay: '#e8c86f',
  fl1: '#fbf0c8', fl2: '#f1c75a', fl3: '#c8b6e2',
  // eau
  water: '#7bbabb', waterl: '#b6e1d9', waterd: '#5b9ca3', mud: '#6f7d50',
  // socle
  earth: '#8c5a3b', ochre: '#b97f4d', clay: '#d1a26a', rock: '#a0937e',
  // décor lointain
  far1: '#9fb7a6', far2: '#6f8f7c', far3: '#4f6f5f', cloud: '#fdfaf2', cloudb: '#dde5e8',
};

const SHADES = ['t', 'l', 'r'];

// Hiver (lot H) : du 15 novembre au 30 avril, l'île est sous la neige (world.js pose data-neige sur .ow ; les miniatures du
// catalogue n'en ont pas). Le sol prend la neige sur ses trois tons ; le dessus (-t) des toits, des feuillages et de la
// toile des serres devient neige et leurs faces gardent leur couleur, comme une neige posée. L'érable a perdu ses
// feuilles : ses faces passent au gris bleuté du givre. Les chemins restent dégagés (Fanal déneige).
const NEIGE_SOL = { grass: '#eef2ec', grassd: '#e2e8e6', grassl: '#f6f7f1', lip: '#e5ebe8' };
const NEIGE_DESSUS = ['roof', 'roofb', 'leaf', 'leafd', 'leafb', 'maple', 'gold', 'amber', 'canvas'];
const NEIGE_NU = { maple: '#aab5b4', gold: '#b6bfba', amber: '#a3adab' };

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

function shade(c, k) {
  if (k === 't') return c;
  if (k === 'l') return mix(mul(c, 0.85), [255, 205, 150], 0.05);
  return mix(mul(c, 0.63), [64, 74, 120], 0.16);
}

function readTokens(el) {
  const out = { lantern: '#ffd98c' };
  if (!el || typeof getComputedStyle !== 'function') return out;
  const cs = getComputedStyle(el);
  const get = (name) => cs.getPropertyValue(name).trim();
  const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
  if (isHex(get('--c-lantern-glow'))) out.lantern = get('--c-lantern-glow');
  for (const [tok, mat] of Object.entries(TOKEN_MAP)) { const v = get(tok); if (isHex(v)) out[mat] = v; }
  return out;
}

/** Feuille de style des matières. `tokenRoot` : élément sur lequel lire les jetons de tokens.css (facultatif). */
export function paletteCSS(tokenRoot) {
  const tk = readTokens(tokenRoot);
  const base = { ...BASE };
  for (const mat of Object.values(TOKEN_MAP)) if (tk[mat]) base[mat] = tk[mat];

  const decl = (mats) => {
    const out = [];
    for (const m of mats) {
      const c = hex(base[m]);
      for (const k of SHADES) out.push(`--${m}-${k}:${css(shade(c, k))}`);
    }
    return out.join(';');
  };

  let s = '';
  s += `.ow,.ow-thumb{${decl(Object.keys(base))};--lampg-off:#6d6b5f;--lampg-on:${tk.lantern};--win-day:#4f7f82;--win-night:#ffd98c}`;
  const neige = [];
  for (const [m, c] of Object.entries({ ...NEIGE_SOL, ...NEIGE_NU })) for (const k of SHADES) neige.push(`--${m}-${k}:${css(shade(hex(c), k))}`);
  for (const m of NEIGE_DESSUS) neige.push(`--${m}-t:${css(hex(base.snow))}`);
  s += `.ow[data-neige]{${neige.join(';')}}`;
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
