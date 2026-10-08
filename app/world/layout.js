// Carte de l'île 12×12 (r = rangée = v, c = colonne = u). Place du village au centre (4×4),
// cinq quartiers autour, séparés par deux routes qui se croisent sur la place (u = 6 et v = 6).
// Dans ce module, « secteur » désigne la zone de carte d'un quartier ; les identifiants sont ceux des quartiers.
//
//   écran : haut = fond de l'île (r et c petits), bas = premier plan (r et c grands)
//   ┌ quart arrière-gauche (r<6, c<6) : Garage au fond (c > r), École à gauche (c ≤ r)
//   ├ quart arrière-droit (r<6, c≥6) : Mairie, à droite
//   ├ quart avant-gauche  (r≥6, c<6) : Champs, à gauche
//   └ quart avant-droit   (r≥6, c≥6) : Atelier, au premier plan
// Le contenu (niveaux, caisses, Fanal) vient toujours de l'état du jeu, jamais d'ici.

import { rng } from './iso.js';

export const N = 12;
export const SECTOR_ORDER = ['place', 'champs', 'atelier', 'mairie', 'ecole', 'garage'];

export function sectorAt(r, c) {
  if (r >= 4 && r <= 7 && c >= 4 && c <= 7) return 'place';
  if (r >= 6) return c >= 6 ? 'atelier' : 'champs';
  if (c >= 6) return 'mairie';
  return c > r ? 'garage' : 'ecole';
}

/** Cases de chaque secteur. */
export const CELLS = (() => {
  const out = Object.fromEntries(SECTOR_ORDER.map((id) => [id, []]));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) out[sectorAt(r, c)].push([r, c]);
  return out;
})();

/** Centre visuel d'un secteur (grille) : sert aux anneaux, au fil de lumière et au cadrage. */
export const SECTOR_CENTER = {
  place: [6, 6],
  champs: [2.6, 8.9],
  atelier: [9.2, 9.2],
  mairie: [8.9, 2.6],
  ecole: [1.7, 3.6],
  garage: [4.1, 1.6],
};

/**
 * Ancre des plaques de secteur (grille). Les secteurs du premier plan accrochent leur plaque sous leur rebord,
 * sur la face du socle (hang) : elle ne cache ni les emplacements de construction ni les cultures. Celles du fond
 * (École, Garage) se posent sur la lisière d'arbres du bord, au-dessus des chalets et du convoi.
 */
export const PLAQUE_ANCHOR = {
  place: [5.0, 7.6],
  champs: [4.8, 11.95, 'hang'],
  atelier: [11.95, 11.95, 'hang'],
  mairie: [11.95, 5.0, 'hang'],
  ecole: [0.15, 3.0],
  garage: [3.0, 0.15],
};

/** Contour d'un secteur en coordonnées de grille (polygone du bord des cases), pour les éclats. */
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
// model, secteur, emprise (r, c, h = rangées, w = colonnes). Décor fixe ; les bâtiments du joueur sont dans EMPLACEMENTS.
export const LANDMARKS = [
  { id: 'lanterne-p1', model: 'lanterne', sector: 'place', r: 7, c: 4, h: 1, w: 1, village: true },
  { id: 'lanterne-p2', model: 'lanterne', sector: 'place', r: 6.15, c: 7, h: 1, w: 1, village: true },
  { id: 'etabli', model: 'etabli', sector: 'atelier', r: 7, c: 9, h: 1, w: 1 },
  { id: 'glaciere', model: 'glaciere', sector: 'atelier', r: 8, c: 7, h: 1, w: 1 },
  { id: 'lanterne-a1', model: 'lanterne', sector: 'atelier', r: 10, c: 8, h: 1, w: 1, village: true },
  { id: 'cloture-c1', model: 'cloture', sector: 'champs', r: 7.35, c: 0, h: 1, w: 1 },
  { id: 'cloture-c2', model: 'cloture', sector: 'champs', r: 7.35, c: 1, h: 1, w: 1 },
  { id: 'cloture-c3', model: 'cloture', sector: 'champs', r: 7.35, c: 2, h: 1, w: 1 },
  { id: 'cloture-c4', model: 'cloture', sector: 'champs', r: 7.35, c: 3, h: 1, w: 1, end: true },
  { id: 'lanterne-c1', model: 'lanterne', sector: 'champs', r: 6, c: 3, h: 1, w: 1, village: true },
  { id: 'lanterne-x1', model: 'lanterne', sector: 'mairie', r: 4, c: 10, h: 1, w: 1, village: true },
  { id: 'convoi', model: 'caisse', sector: 'garage', r: 2.4, c: 4.3, h: 1, w: 1 },
];

/**
 * Emplacements des bâtiments du joueur (core/batiments.js) : un par bâtiment possible, dans l'ordre des identifiants
 * (chalet-1, chalet-2…). Emprise en grille comme les repères. Un emplacement vide reste visible : chalet vide, atelier
 * abîmé, vieux quai, ou piquets d'un chantier possible. Le quai est posé sur le lac, au bout de la route avant
 * (lac : dessiné au niveau de l'eau, au pied du socle) ; il appartient à la Place, dont il est le front.
 */
export const EMPLACEMENTS = {
  chalet: [{ r: 4.2, c: 4.2, h: 1.2, w: 1.2 }, { r: 4.2, c: 6.7, h: 1.2, w: 1.2 }, { r: 4.2, c: 1.8, h: 1.2, w: 1.2 }],
  parcelle: [{ r: 8.4, c: 0.4, h: 1.6, w: 1.6 }, { r: 10.3, c: 0.4, h: 1.6, w: 1.6 }, { r: 10.3, c: 2.4, h: 1.6, w: 1.6 }],
  atelier: [{ r: 9, c: 9, h: 1, w: 2 }],
  serre: [{ r: 10.3, c: 9.7, h: 1.5, w: 1.9 }, { r: 7.2, c: 10.05, h: 1.5, w: 1.9 }],
  eolienne: [{ r: 0.5, c: 10.6, h: 1, w: 1 }],
  grenier: [{ r: 1, c: 8, h: 2, w: 2 }],
  quai: [{ r: 12, c: 5.5, h: 0.9, w: 1, lac: true, sector: 'place' }],
};

/**
 * Habitants au travail (lot E, world/habitants.js), en grille [u, v] comme FANAL_HOME. PORTES : où un habitant sort de
 * son chalet (devant la porte, face +v). POSTES : où il travaille, un par emplacement, toujours d'un côté visible du
 * bâtiment (une figurine derrière un dessin disparaît). POSTE_PLACE : sans lieu de travail bâti, près de Fanal.
 */
export const PORTES = { chalet: [[5.05, 5.6], [7.55, 5.6], [2.65, 5.6]] };
export const POSTES = {
  parcelle: [[1.28, 9.36], [1.28, 11.26], [3.28, 11.26]],
  serre: [[11.8, 11.2], [11.45, 8.88]],
  atelier: [[8.75, 10.05]],
  grenier: [[9.0, 3.25]],
};
export const POSTE_PLACE = [7.4, 6.45];

/** Objets-reflets : ancre de content/fr-CA/ancres.json → objet de la carte. Par défaut, le repère du quartier. */
export const ANCHOR_OBJECT = {
  glaciere: 'glaciere', garage: 'etabli', cloture: 'cloture-c1', poubelle: 'caisse:0', lit: 'chalet-3', jouets: 'chalet-3',
};
export const SECTOR_LANDMARK = {
  place: 'chalet-1', champs: 'cloture-c1', atelier: 'atelier-1', mairie: 'grenier-1', ecole: 'chalet-3', garage: 'convoi',
};

// ---------------------------------------------------------------- front de givre (lot H)
/**
 * Bord de l'île par où arrive un front de givre, selon le quartier visé : segment a → b sur le bord
 * (grille [u, v]), normale sortante n, `face` = le socle de ce bord est visible (le lac commence à son pied).
 * La Place n'a pas de bord : son front vient du quai. Une tempête annoncée (core/hiver.js) arrive par TEMPETE_BORD.
 */
export const AVIS_EDGE = {
  champs: { a: [0.5, 12], b: [5.5, 12], n: [0, 1], face: true },
  atelier: { a: [12, 6.5], b: [12, 11.5], n: [1, 0], face: true },
  mairie: { a: [12, 0.5], b: [12, 5.5], n: [1, 0], face: true },
  ecole: { a: [0, 0.5], b: [0, 5.5], n: [-1, 0], face: false },
  garage: { a: [0.5, 0], b: [5.5, 0], n: [0, -1], face: false },
  place: { a: [4.5, 12], b: [7.5, 12], n: [0, 1], face: true },
};
/** La tempête arrive par le bord de l'Atelier : la face avant droite, visible à toutes les largeurs, au pied des serres. */
export const TEMPETE_BORD = 'atelier';

/**
 * Caisses d'échéance : au bord de la route de droite (v = 6), de la Place vers le bord de l'île. Pas sur la route
 * avant : la plaque de la Place les y recouvrait (lot 4). Côté Mairie le long du chalet, puis côté Atelier une fois
 * passé l'établi, qui les cachait.
 */
export const CRATE_SPOTS = [[9.25, 5.5], [9.85, 5.5], [10.45, 5.5], [10.8, 6.45], [11.4, 6.45]];

/** Fanal, vieux robot de déneigement, sur la Place. */
export const FANAL_HOME = [6.85, 6.55];

/**
 * Imprévus heureux du jour (lot I) : où l'île les montre, sur des cases que le décor laisse libres et qu'aucune plaque ne
 * couvre. L'orignal traverse la route des Champs devant le chalet du fond, la caisse de poissons attend au bout de la route
 * du quai, la pile de bois trouvée en forêt est rangée près du grenier (la lisière du fond est sous les plaques de
 * l'École et du Garage, ou derrière le grenier). L'aurore n'a pas de case : elle passe dans le ciel (world.js).
 */
export const IMPREVU_SPOTS = {
  orignal: { model: 'orignal', r: 5.35, c: 1.7, h: 0.9, w: 0.9 },
  peche: { model: 'poissons', r: 11.0, c: 4.9, h: 0.5, w: 0.5 },
  trouvaille: { model: 'bois', r: 3.15, c: 6.7, h: 0.6, w: 0.85 },
};

// ---------------------------------------------------------------- décor (arbres, buissons, rochers)
// Lisière boréale sur les deux bords du fond, quelques bouquets ailleurs. Déterministe.
function isFree(u, v) {
  const r = Math.floor(v), c = Math.floor(u);
  if (Math.abs(u - 6) < 0.6 || Math.abs(v - 6) < 0.6) return false; // routes
  if (r >= 4 && r <= 7 && c >= 4 && c <= 7) return false; // place
  for (const e of [...LANDMARKS, ...Object.values(EMPLACEMENTS).flat()]) if (v >= e.r - 0.2 && v < e.r + (e.h || 1) + 0.1 && u >= e.c - 0.2 && u < e.c + (e.w || 1) + 0.1) return false;
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
  { sector: 'garage', d: 'M6,.15V3.95' },
  { sector: 'champs', d: 'M.15,6H3.95' },
  { sector: 'atelier', d: 'M8.05,6H11.85' },
  { sector: 'place', d: 'M6,3.95V8.05M3.95,6H8.05' },
];
