// Palette « Orée » + éclairage unique (lumière en haut à gauche).
// Chaque matériau a trois teintes : -t (dessus, clair), -l (face gauche, mi-ombre), -r (face droite, ombre).
// L'heure du jour module toutes les teintes via des variables CSS : un seul recalcul de style par changement,
// aucune animation par image.

export const MATS = {
  grass: '#a9bf6c', grassd: '#94ad5d', grassl: '#bfd287', lip: '#86a556',
  soil: '#a3683f', soilf: '#7a492d', soilr: '#bf8452',
  path: '#e8d29f', pathe: '#c7a776', cobble: '#d6c29a',
  earth: '#8c5a3b', ochre: '#b97f4d', clay: '#d1a26a', rock: '#a0937e',
  woodb: '#e3bb7c', woodd: '#8a5a3a', wooddk: '#64412e',
  stone: '#d4c9af', stoned: '#b2a58a',
  roof: '#7f9d69', roofb: '#56795c',
  metal: '#f0e6cb', tech: '#58a9a4', panel: '#2f6c71',
  glass: '#aee0d7', glassin: '#5f9584',
  leaf: '#87a65b', leafd: '#5d8150', leafb: '#a1ba66', gold: '#dbb457', amber: '#cf9446',
  cabbage: '#93bb8c', wheat: '#e6c163', sprout: '#8fc25c',
  hay: '#e8c86f',
  water: '#7bbabb', waterl: '#b6e1d9', waterd: '#5b9ca3', mud: '#6f7d50',
  cloud: '#fdfaf2', cloudb: '#dde5e8',
  skin: '#e7b892', clothA: '#5f8a63', clothB: '#3f8d8b', hat: '#ebc56b', hair: '#5a3b2a', pants: '#5e5b4d',
  frame: '#f5eed9', fl1: '#fbf0c8', fl2: '#f1c75a', fl3: '#c8b6e2',
  far1: '#9fb7a6', far2: '#6f8f7c', far3: '#4f6f5f'
};

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const mul = (a, k) => a.map((x, i) => x * (Array.isArray(k) ? k[i] : k));
const css = c => `rgb(${c.map(x => Math.max(0, Math.min(255, Math.round(x)))).join(',')})`;

// teintes de base : ombre légèrement froide, mi-ombre légèrement chaude
function shades(h) {
  const c = hex(h);
  return {
    t: c,
    l: mix(mul(c, 0.85), [255, 205, 150], 0.05),
    r: mix(mul(c, 0.63), [64, 74, 120], 0.16)
  };
}
const BASE = Object.fromEntries(Object.entries(MATS).map(([k, v]) => [k, shades(v)]));

// Images clés de l'éclairage ambiant [heure, multiplicateur RVB, ajout RVB, ciel haut, ciel horizon]
const AMB = [
  [0, [.32, .37, .58], [0, 0, 10], '#0c1630', '#23335a'],
  [4.6, [.33, .37, .58], [0, 0, 10], '#101b37', '#2b3a60'],
  [6.0, [.80, .66, .72], [14, 0, 8], '#6a7fb3', '#f2b48d'],
  [7.4, [1, .97, .93], [4, 2, 0], '#8fc6dc', '#f6e3bd'],
  [12, [1.03, 1.02, 1], [0, 0, 0], '#8ccbe0', '#eef0d2'],
  [16.5, [1.02, .97, .9], [4, 2, 0], '#94c3d6', '#f4dfb2'],
  [18.2, [1.0, .80, .64], [16, 4, 0], '#7f8fbf', '#f3a873'],
  [19.4, [.60, .50, .64], [6, 0, 12], '#3f4a80', '#c98482'],
  [20.6, [.34, .38, .6], [0, 0, 10], '#14203f', '#34416a'],
  [24, [.32, .37, .58], [0, 0, 10], '#0c1630', '#23335a']
];

function ambientAt(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0;
  while (i < AMB.length - 2 && AMB[i + 1][0] <= h) i++;
  const a = AMB[i], b = AMB[i + 1];
  const t = (h - a[0]) / (b[0] - a[0] || 1);
  return {
    mul: mix(a[1], b[1], t), add: mix(a[2], b[2], t),
    skyTop: mix(hex(a[3]), hex(b[3]), t), skyHor: mix(hex(a[4]), hex(b[4]), t)
  };
}

export function nightFactor(h) {
  h = ((h % 24) + 24) % 24;
  if (h >= 7 && h <= 17.8) return 0;
  if (h > 17.8 && h < 20.6) return (h - 17.8) / 2.8;
  if (h >= 20.6 || h <= 4.8) return 1;
  return 1 - (h - 4.8) / 2.2; // 4.8 → 7
}

function lit(c, A, n) {
  const lum = c[0] * .3 + c[1] * .59 + c[2] * .11;
  const d = mix(c, [lum, lum, lum], .28 * n);
  return mul(d, A.mul).map((x, i) => x + A.add[i]);
}

// Feuille de style statique : classes de remplissage, de trait et d'arrêts de dégradé
export function staticCSS() {
  let s = '';
  for (const m of Object.keys(MATS)) {
    for (const k of ['t', 'l', 'r']) {
      s += `.${m}-${k}{fill:var(--${m}-${k});stroke:var(--${m}-${k})}`;
      s += `.k-${m}-${k}{stroke:var(--${m}-${k});fill:none}`;
      s += `.p-${m}-${k}{stop-color:var(--${m}-${k})}`;
    }
    s += `.gm-${m}{fill:url(#gm-${m})}`;
  }
  return s;
}

// Dégradés horizontaux (cylindres) : clair à gauche, sombre à droite
export function gradientDefs() {
  return Object.keys(MATS).map(m =>
    `<linearGradient id="gm-${m}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="p-${m}-l"/><stop offset=".32" class="p-${m}-t"/><stop offset=".68" class="p-${m}-l"/><stop offset="1" class="p-${m}-r"/></linearGradient>`
  ).join('');
}

export function timeCSS(h) {
  const A = ambientAt(h), n = nightFactor(h);
  const v = [];
  for (const [m, sh] of Object.entries(BASE)) {
    for (const k of ['t', 'l', 'r']) v.push(`--${m}-${k}:${css(lit(sh[k], A, n))}`);
  }
  // émissifs (non affectés par l'ambiance)
  const winDay = lit(hex('#4f7f82'), A, n);
  v.push(`--win:${css(mix(winDay, hex('#ffd98c'), n))}`);
  v.push(`--win2:${css(mix(lit(hex('#3d6669'), A, n), hex('#f6b75e'), n))}`);
  v.push(`--lamp:${css(mix(lit(hex('#f3e6c0'), A, n), hex('#ffe7a3'), n))}`);
  v.push(`--rune:${css(mix(hex('#6cc4bc'), hex('#8ff5e6'), n))}`);
  v.push(`--rune-op:${(.45 + .55 * n).toFixed(2)}`);
  v.push(`--crys-t:${css(mix(hex('#b9f0e6'), hex('#d8fff8'), n))}`);
  v.push(`--crys-l:${css(mix(hex('#6cc7bd'), hex('#7ff0e2'), n))}`);
  v.push(`--crys-r:${css(mix(hex('#2f8a86'), hex('#3cc9be'), n))}`);
  v.push(`--night:${n.toFixed(3)}`);
  v.push(`--halo-op:${(.18 + .82 * n).toFixed(3)}`);
  v.push(`--lamp-op:${(n * .95).toFixed(3)}`);
  v.push(`--shadow-op:${(.24 * (1 - n * .75)).toFixed(3)}`);
  v.push(`--star-op:${Math.max(0, n * 1.2 - .2).toFixed(3)}`);
  v.push(`--sun-op:${(1 - n).toFixed(3)}`);
  v.push(`--sky-top:${css(A.skyTop)}`);
  v.push(`--sky-hor:${css(A.skyHor)}`);
  const water = lit(hex(MATS.water), A, n);
  const skyMid = mix(A.skyTop, A.skyHor, .55);
  const hh = ((h % 24) + 24) % 24, glow = Math.max(0, 1 - Math.abs(hh - 18.6) / 1.5) + Math.max(0, 1 - Math.abs(hh - 6.2) / 1.1);
  v.push(`--lake:${css(mix(water, mix(skyMid, A.skyHor, glow * .6), .2 + .22 * n + .38 * glow))}`);
  v.push(`--lake-deep:${css(mix(mul(water, .82), mix(A.skyTop, A.skyHor, glow * .5), .25 + .2 * n + .25 * glow))}`);
  v.push(`--ui-tint:${n > .6 ? 'rgba(20,28,48,.12)' : 'rgba(0,0,0,0)'}`);
  return `:root{${v.join(';')}}`;
}
