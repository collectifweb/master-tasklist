// Carte de l'île 12×12 (r = rangée = v, c = colonne = u). Place du Bastion au centre (4×4),
// cinq secteurs autour, séparés par deux routes qui se croisent sur la place (u = 6 et v = 6).
//
//   écran : haut = fond de l'île (r et c petits), bas = premier plan (r et c grands)
//   ┌ quart arrière-gauche (r<6, c<6) : Relais du convoi au fond (c > r), Maison commune à gauche (c ≤ r)
//   ├ quart arrière-droit (r<6, c≥6) : Archives, à droite
//   ├ quart avant-gauche  (r≥6, c<6) : Champs, à gauche
//   └ quart avant-droit   (r≥6, c≥6) : Atelier, au premier plan
// Le contenu (ce qui est ouvert, construit, allumé) vient toujours de l'état du jeu, jamais d'ici.

import { rng } from './iso.js';

export const N = 12;
export const SECTOR_ORDER = ['place', 'champs', 'atelier', 'archives', 'maison-commune', 'relais'];
export const TILES_TO_REPAIR = 12; // RECOMMANDATION §4 : Réparer à 150 Lueur = 12 cases
export const LUEUR_PER_TILE = 150 / TILES_TO_REPAIR;

export function sectorAt(r, c) {
  if (r >= 4 && r <= 7 && c >= 4 && c <= 7) return 'place';
  if (r >= 6) return c >= 6 ? 'atelier' : 'champs';
  if (c >= 6) return 'archives';
  return c > r ? 'relais' : 'maison-commune';
}

/** Cases de chaque secteur. */
export const CELLS = (() => {
  const out = Object.fromEntries(SECTOR_ORDER.map((id) => [id, []]));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) out[sectorAt(r, c)].push([r, c]);
  return out;
})();

/** Ordre de rallumage : les cases les plus proches du Bastion d'abord (la lisière avance vers l'extérieur). */
export const LIT_ORDER = Object.fromEntries(Object.entries(CELLS).map(([id, cells]) => {
  const d = ([r, c]) => Math.hypot(r + 0.5 - 6, c + 0.5 - 6) + ((r * 7 + c * 3) % 5) * 0.01;
  return [id, cells.slice().sort((a, b) => d(a) - d(b))];
}));

/** Centre visuel d'un secteur (grille) : sert aux anneaux, au voile et au cadrage. */
export const SECTOR_CENTER = {
  place: [6, 6],
  champs: [2.6, 8.9],
  atelier: [9.2, 9.2],
  archives: [8.9, 2.6],
  'maison-commune': [1.7, 3.6],
  relais: [4.1, 1.6],
};

function occupied(u, v) {
  return LANDMARKS_REF().some((L) => v >= L.r && v < L.r + (L.h || 1) && u >= L.c && u < L.c + (L.w || 1));
}
/** Case où pointe la prochaine pousse : la prochaine case à rallumer qui n'est pas sous un bâtiment. */
export function germCell(id, lit) {
  const order = LIT_ORDER[id];
  for (let i = lit; i < order.length; i++) {
    const [r, c] = order[i];
    if (!occupied(c + 0.5, r + 0.5)) return order[i];
  }
  return order[Math.min(lit, order.length - 1)];
}
const LANDMARKS_REF = () => LANDMARKS;

/**
 * Ancre des plaques de secteur (grille). Les secteurs du premier plan accrochent leur plaque sous leur rebord,
 * sur la face du socle (hang) : elle ne cache ni les emplacements de construction ni les cultures.
 */
export const PLAQUE_ANCHOR = {
  place: [5.0, 7.6],
  champs: [4.8, 11.95, 'hang'],
  atelier: [11.95, 11.95, 'hang'],
  archives: [11.95, 3.2, 'hang'],
  'maison-commune': [1.0, 4.4],
  relais: [3.8, 0.9],
};

/** Contour d'un secteur en coordonnées de grille (polygone du bord des cases), pour voiles et éclats. */
export function sectorOutline(id) {
  // arêtes de bord : celles qui séparent une case du secteur d'une case d'un autre secteur ou du vide
  const own = new Set(CELLS[id].map(([r, c]) => r * N + c));
  const has = (r, c) => r >= 0 && c >= 0 && r < N && c < N && own.has(r * N + c);
  const edges = [];
  for (const [r, c] of CELLS[id]) {
    if (!has(r - 1, c)) edges.push([[c, r], [c + 1, r]]);
    if (!has(r, c + 1)) edges.push([[c + 1, r], [c + 1, r + 1]]);
    if (!has(r + 1, c)) edges.push([[c + 1, r + 1], [c, r + 1]]);
    if (!has(r, c - 1)) edges.push([[c, r + 1], [c, r]]);
  }
  // chaînage des arêtes en un contour (les secteurs sont d'un seul tenant)
  const key = (p) => p[0] + ',' + p[1];
  const next = new Map(edges.map((e) => [key(e[0]), e]));
  const out = [];
  let e = edges[0];
  for (let guard = 0; e && guard < edges.length + 1; guard++) {
    out.push(e[0]);
    e = next.get(key(e[1]));
    if (e === edges[0]) break;
  }
  // retirer les points alignés
  return out.filter((p, i) => {
    const a = out[(i - 1 + out.length) % out.length], b = out[(i + 1) % out.length];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
}

// ---------------------------------------------------------------- repères fixes
// model, secteur, emprise (r, c, h = rangées, w = colonnes). L'état (abîmé, réparé…) vient du jeu.
export const LANDMARKS = [
  { id: 'bastion', model: 'bastion', sector: 'place', r: 4, c: 4, h: 2, w: 2 },
  { id: 'tour', model: 'tour', sector: 'place', r: 4, c: 7, h: 1, w: 1 },
  { id: 'relais', model: 'relais', sector: 'place', r: 5.5, c: 5.5, h: 1, w: 1 },
  { id: 'lanterne-p1', model: 'lanterne', sector: 'place', r: 7, c: 4, h: 1, w: 1, village: true },
  { id: 'lanterne-p2', model: 'lanterne', sector: 'place', r: 6.15, c: 7, h: 1, w: 1, village: true },
  { id: 'atelier', model: 'atelier', sector: 'atelier', r: 9, c: 9, h: 1, w: 2 },
  { id: 'etabli', model: 'etabli', sector: 'atelier', r: 7, c: 9, h: 1, w: 1 },
  { id: 'glaciere', model: 'glaciere', sector: 'atelier', r: 8, c: 7, h: 1, w: 1 },
  { id: 'lanterne-a1', model: 'lanterne', sector: 'atelier', r: 10, c: 8, h: 1, w: 1, village: true },
  { id: 'cloture-c1', model: 'cloture', sector: 'champs', r: 7.35, c: 0, h: 1, w: 1 },
  { id: 'cloture-c2', model: 'cloture', sector: 'champs', r: 7.35, c: 1, h: 1, w: 1 },
  { id: 'cloture-c3', model: 'cloture', sector: 'champs', r: 7.35, c: 2, h: 1, w: 1 },
  { id: 'cloture-c4', model: 'cloture', sector: 'champs', r: 7.35, c: 3, h: 1, w: 1, end: true },
  { id: 'lanterne-c1', model: 'lanterne', sector: 'champs', r: 6, c: 3, h: 1, w: 1, village: true },
  { id: 'registres', model: 'registres', sector: 'archives', r: 1, c: 8, h: 2, w: 2 },
  { id: 'lanterne-x1', model: 'lanterne', sector: 'archives', r: 4, c: 10, h: 1, w: 1, village: true },
  { id: 'maison', model: 'maison', sector: 'maison-commune', r: 3, c: 1, h: 2, w: 2 },
  { id: 'convoi', model: 'caisse', sector: 'relais', r: 1, c: 4, h: 1, w: 1 },
];

/** Objets-reflets : ancre de content/fr-CA/ancres.json → objet de la carte. Par défaut, le repère du secteur. */
export const ANCHOR_OBJECT = {
  glaciere: 'glaciere', garage: 'etabli', cloture: 'cloture-c1', potager: 'plot:0', poubelle: 'caisse:0',
  impots: 'registres', classeur: 'registres', facture: 'registres', lit: 'maison', jouets: 'maison',
};
export const SECTOR_LANDMARK = {
  place: 'relais', champs: 'cloture-c1', atelier: 'atelier', archives: 'registres', 'maison-commune': 'maison', relais: 'convoi',
};

// ---------------------------------------------------------------- emplacements dynamiques
/** Parcelles des Champs (2×2), dans l'ordre d'attribution. */
export const PLOT_SLOTS = [
  { r: 8, c: 2 }, { r: 8, c: 0 }, { r: 10, c: 2 }, { r: 10, c: 0 },
];

/** Cases libres où poser une construction, par secteur (1×1 ; un modèle 2×1 prend la case et sa voisine en u). */
export const BUILD_SLOTS = {
  champs: [{ r: 8, c: 4 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 11, c: 4 }],
  atelier: [{ r: 10, c: 10 }, { r: 11, c: 8 }, { r: 8, c: 10 }, { r: 7, c: 11 }, { r: 11, c: 11 }, { r: 6, c: 10 }],
  place: [{ r: 7, c: 6.6 }, { r: 4.5, c: 6.4 }],
  archives: [{ r: 3, c: 9 }, { r: 0, c: 10 }],
  'maison-commune': [{ r: 5, c: 1 }, { r: 2, c: 0 }],
  relais: [{ r: 0, c: 2 }, { r: 2, c: 4 }],
};

/** Modèle → secteur par défaut quand une construction n'en précise pas. */
export const MODEL_SECTOR = {
  tunnel: 'champs', cloture: 'champs', parcelle: 'champs',
  etabli: 'atelier', erable: 'atelier', glaciere: 'atelier', atelier: 'atelier',
  registres: 'archives', maison: 'maison-commune',
};

// ---------------------------------------------------------------- Avis (givre)
/**
 * Bord de l'île par où arrive le Front de givre d'un Avis, selon le secteur visé : segment a → b sur le bord
 * (grille [u, v]), normale sortante n, `face` = le socle de ce bord est visible (le lac commence à son pied).
 * La Place n'a pas de bord : son Front vient du quai.
 */
export const AVIS_EDGE = {
  champs: { a: [0.5, 12], b: [5.5, 12], n: [0, 1], face: true },
  atelier: { a: [12, 6.5], b: [12, 11.5], n: [1, 0], face: true },
  archives: { a: [12, 0.5], b: [12, 5.5], n: [1, 0], face: true },
  'maison-commune': { a: [0, 0.5], b: [0, 5.5], n: [-1, 0], face: false },
  relais: { a: [0.5, 0], b: [5.5, 0], n: [0, -1], face: false },
  place: { a: [4.5, 12], b: [7.5, 12], n: [0, 1], face: true },
};

/** Cases que le givre d'un Voile couvre (2 au plus), [r, c]. Aux Champs : le rang avant de la première parcelle. */
export const VEIL_CELLS = {
  champs: [[9, 2], [9, 3]],
  atelier: [[8, 8], [9, 8]],
  archives: [[3, 7], [3, 8]],
  'maison-commune': [[4, 3], [3, 3]],
  relais: [[3, 4], [3, 5]],
  place: [[7, 5], [6, 4]],
};

/**
 * Braseros (3 au plus), [u, v], allumés dans cet ordre. Aux Champs, le rebord est pris par les parcelles : ils se
 * rangent sur les cases libres le long de la route, du rivage vers l'intérieur. Ailleurs : sur le rebord, face au
 * Front, à 20, 50 et 80 % du bord, un peu en retrait.
 */
const BRASERO_SPOTS = { champs: [[5.5, 11.5], [4.6, 11.62], [5.45, 9.45]] }; // Solène se tient en (4,6 ; 10,7)
export function braseroSpots(sector) {
  if (BRASERO_SPOTS[sector]) return BRASERO_SPOTS[sector];
  const e = AVIS_EDGE[sector];
  if (!e) return [];
  return [0.2, 0.5, 0.8].map((t) => [
    e.a[0] + (e.b[0] - e.a[0]) * t - e.n[0] * 0.32,
    e.a[1] + (e.b[1] - e.a[1]) * t - e.n[1] * 0.32,
  ]);
}

/** Caisses d'échéance : posées au bord de la route avant (u = 6), de la place vers le quai. */
export const CRATE_SPOTS = [[6.42, 8.35], [5.6, 8.9], [6.45, 9.6], [5.58, 10.3], [6.4, 11.0]];

/**
 * Poteaux de lisière : le long des frontières entre secteurs. Un poteau est actif quand l'un de ses deux
 * secteurs est ouvert et l'autre fermé : la lisière, c'est le bord de ce qui est rallumé.
 */
export const LISIERE_POSTS = [
  { id: 'l-cm-1', u: 1.0, v: 6.0, between: ['champs', 'maison-commune'] },
  { id: 'l-cm-2', u: 3.0, v: 6.0, between: ['champs', 'maison-commune'] },
  { id: 'l-ax-1', u: 9.0, v: 6.0, between: ['atelier', 'archives'] },
  { id: 'l-ax-2', u: 11.0, v: 6.0, between: ['atelier', 'archives'] },
  { id: 'l-pm-1', u: 4.0, v: 4.5, between: ['place', 'maison-commune'] },
  { id: 'l-pr-1', u: 5.0, v: 4.0, between: ['place', 'relais'] },
  { id: 'l-px-1', u: 7.0, v: 4.0, between: ['place', 'archives'] },
  { id: 'l-px-2', u: 8.0, v: 5.0, between: ['place', 'archives'] },
  { id: 'l-rx-1', u: 6.0, v: 1.5, between: ['relais', 'archives'] },
  { id: 'l-rm-1', u: 2.4, v: 2.6, between: ['relais', 'maison-commune'] },
];

/** Personnages : un par secteur ouvert qui a une voix (Fanal sur la place). */
export const CHARACTERS = [
  { id: 'fanal', kind: 'fanal', sector: 'place', u: 6.85, v: 6.55 },
  { id: 'solene', kind: 'solene', sector: 'champs', u: 4.6, v: 10.7 },
  { id: 'milo', kind: 'milo', sector: 'atelier', u: 8.55, v: 8.6 },
];

/**
 * Côte à côte : où Fanal travaille avec toi pendant une séance « Je m'y mets » ([u, v, penché vers]) : au bord de la
 * Place, du côté du secteur de la quête (la Place est toujours ouverte) ; aux Champs (ouverts dès le chapitre 1), entre
 * la clôture et les emplacements, hors de la plaque de la Place. Pour une quête de la Place, il reste chez lui.
 */
export const FANAL_SPOTS = {
  place: [6.85, 6.55, 'gauche'],
  champs: [2.5, 7.05, 'gauche'],
  atelier: [7.8, 7.65, 'droite'],
  archives: [7.65, 5.65, 'droite'],
  'maison-commune': [4.35, 6.3, 'gauche'],
  relais: [6.45, 4.3, 'droite'],
};

// ---------------------------------------------------------------- décor (arbres, buissons, rochers)
// Lisière boréale sur les deux bords du fond, quelques bouquets ailleurs. Déterministe.
function isFree(u, v) {
  const r = Math.floor(v), c = Math.floor(u);
  if (Math.abs(u - 6) < 0.6 || Math.abs(v - 6) < 0.6) return false; // routes
  if (r >= 4 && r <= 7 && c >= 4 && c <= 7) return false; // place
  const taken = [...LANDMARKS, ...PLOT_SLOTS.map((p) => ({ ...p, h: 2, w: 2 }))];
  for (const e of taken) if (v >= e.r - 0.2 && v < e.r + (e.h || 1) + 0.1 && u >= e.c - 0.2 && u < e.c + (e.w || 1) + 0.1) return false;
  for (const list of Object.values(BUILD_SLOTS)) for (const s of list) if (v >= s.r && v < s.r + 1 && u >= s.c && u < s.c + 1) return false;
  for (const [cu, cv] of CRATE_SPOTS) if (Math.abs(u - cu) < 0.7 && Math.abs(v - cv) < 0.7) return false;
  return true;
}

export const DECOR = (() => {
  const R = rng(77);
  const out = [];
  const add = (type, r, c, extra = {}) => {
    if (r < 0 || c < 0 || r >= N || c >= N) return;
    out.push({ id: `d-${type}-${r}-${c}`, model: type, sector: sectorAt(Math.floor(r), Math.floor(c)), r, c, h: 1, w: 1, seed: Math.floor(R() * 1e6), ...extra });
  };
  // bord arrière-gauche (c = 0) et arrière-droit (r = 0) : épinettes et bouleaux dorés
  for (let r = 0; r < N; r++) {
    if (!isFree(0.5, r + 0.5) && r !== 0) continue;
    if (r >= 6) { if (r % 3 === 1) add('epinette', r, 0, { s: 0.9 }); continue; }
    add(r % 2 ? 'arbre' : 'epinette', r, 0, { m: r % 4 === 1 ? 'gold' : 'leaf', s: 1.05 });
  }
  for (let c = 1; c < N; c++) {
    if (!isFree(c + 0.5, 0.5)) continue;
    add(c % 2 ? 'epinette' : 'arbre', 0, c, { m: c % 4 === 2 ? 'amber' : 'gold', s: 1 });
  }
  // bouquets intérieurs
  const spots = [
    ['buisson', 2, 2, 'leafb'], ['arbre', 2, 5, 'gold'], ['buisson', 4, 2, 'leaf'], ['epinette', 1, 1],
    ['arbre', 2, 10, 'amber'], ['buisson', 4, 8, 'leaf'], ['epinette', 3, 11], ['buisson', 5, 11, 'gold'],
    ['buisson', 11, 2, 'leafb'], ['rocher', 7, 4.3], ['rocher', 11, 7], ['buisson', 6, 1, 'leaf'],
    ['erable', 10, 7, 'maple'], ['erable', 11, 10, 'maple'], ['buisson', 7, 8, 'leafb'], ['rocher', 8, 11],
  ];
  for (const [t, r, c, m] of spots) if (isFree(c + 0.5, r + 0.5)) add(t, r, c, m ? { m } : {});
  return out;
})();

/** Touffes d'herbe et fleurs posées sur le sol, par secteur. */
export function groundDetails(seed = 9) {
  const R = rng(seed);
  const out = [];
  for (let i = 0; i < 260; i++) {
    const u = 0.3 + R() * 11.4, v = 0.3 + R() * 11.4;
    if (!isFree(u, v)) continue;
    const flower = R() < 0.22;
    out.push({ u, v, flower, tone: Math.floor(R() * 3), sector: sectorAt(Math.floor(v), Math.floor(u)) });
  }
  return out;
}

/** Routes (segments en grille), rattachées au secteur qui les dessine. */
export const ROADS = [
  { sector: 'atelier', d: 'M6,8.05V11.95' },
  { sector: 'relais', d: 'M6,.15V3.95' },
  { sector: 'champs', d: 'M.15,6H3.95' },
  { sector: 'atelier', d: 'M8.05,6H11.85' },
  { sector: 'place', d: 'M6,3.95V8.05M3.95,6H8.05' },
];
