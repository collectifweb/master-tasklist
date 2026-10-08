// Habitants au travail (bible §10, lot E) : qui va où, et par quel chemin. Logique pure, sans DOM : la scène en tire
// les images clés de chaque figurine (world.js), et les tests la vérifient sous Node.
//
//   promeneurs(view) → [{ id, chalet, lieu, chemin: [[u, v]…], decalage }]
//
// Un habitant logé sort de son chalet (PORTES), suit le meilleur chemin jusqu'à son lieu de travail (POSTES), y reste,
// puis rentre. Le métier se déduit de l'état : les lieux bâtis, servis dans l'ordre de ORDRE_LIEUX, un habitant chacun,
// puis on recommence au premier. Le potager dort de novembre à avril : ses jardiniers vont ailleurs. Sans lieu bâti,
// tout le monde va sur la Place. Rien n'est écrit dans la partie : tous les appareils voient la même chose.
//
// Le chemin est cherché sur une grille fine (PAS) : les routes coûtent le moins, l'herbe davantage, et une case où la
// figurine serait cachée derrière un dessin (bâtiment, arbre) coûte cher. Les bâtiments, repères, décors, caisses,
// imprévus et Fanal bloquent leur pied. Le chemin est ensuite tendu (lignes droites tant que le terrain ne change pas).
import { N, EMPLACEMENTS, LANDMARKS, DECOR, CRATE_SPOTS, IMPREVU_SPOTS, FANAL_HOME, PORTES, POSTES, POSTE_PLACE } from './layout.js';
import { artFor } from './models.js';
import { P } from './iso.js';
import { potagerOuvert } from '../core/batiments.js';

/** Lieux de travail, dans l'ordre où ils reçoivent un habitant. */
export const ORDRE_LIEUX = ['parcelle', 'serre', 'atelier', 'grenier'];
export const MAX_PROMENEURS = 15;
export const PAS = 0.25;
/** Figurine : boîte à l'écran autour de ses pieds (px monde), pour savoir si un dessin la cache. */
export const FIGURINE = { w: 16, h: 30 };

const ROUTE = 1, PLACE = 1.4, HERBE = 3, CACHE = 9;
const MUR = 0.05; // les pieds ne touchent pas le mur ; assez fin pour garder les passages étroits (serres, atelier)

// pied d'un petit objet : disque (grille) qui bloque le passage ; le reste du dessin peut cacher, pas bloquer
const PIED = { lanterne: 0.3, arbre: 0.28, erable: 0.28, epinette: 0.28, buisson: 0.38, rocher: 0.36, etabli: 0.42, glaciere: 0.4, caisse: 0.34, orignal: 0.4, bois: 0.42, poissons: 0.3 };

// ------------------------------------------------------------------------------------------- obstacles (une fois)
function obstacles() {
  const blocs = []; // rectangles (grille) et disques qui bloquent
  const dessins = []; // boîtes à l'écran (px monde) et profondeur du coin avant, pour la règle « caché »
  for (const [type, l] of Object.entries(EMPLACEMENTS)) {
    for (const s of l) {
      if (s.lac) continue;
      // une parcelle est à plat : on peut y marcher (le jardinier travaille entre les rangs)
      if (type !== 'parcelle') blocs.push({ u0: s.c - MUR, u1: s.c + s.w + MUR, v0: s.r - MUR, v1: s.r + s.h + MUR });
      dessin(type === 'parcelle' ? null : type, s);
    }
  }
  for (const e of [...LANDMARKS, ...DECOR]) {
    const cu = e.c + (e.w || 1) / 2, cv = e.r + (e.h || 1) / 2;
    if (e.model === 'cloture') blocs.push({ u0: e.c, u1: e.c + (e.w || 1), v0: e.r + 0.05, v1: e.r + 0.55 });
    else blocs.push({ cu, cv, rad: PIED[e.model] ?? 0.35 });
    dessin(e.model, e);
  }
  for (const [u, v] of CRATE_SPOTS) blocs.push({ cu: u, cv: v, rad: PIED.caisse });
  for (const s of Object.values(IMPREVU_SPOTS)) blocs.push({ cu: s.c + s.w / 2, cv: s.r + s.h / 2, rad: PIED[s.model] ?? 0.35 });
  blocs.push({ cu: FANAL_HOME[0], cv: FANAL_HOME[1], rad: 0.3 });
  return { blocs, dessins };

  function dessin(model, e) {
    if (!model) return;
    const a = artFor({ ...e, model });
    const [x, y] = P(e.c, e.r);
    dessins.push({ x0: x + a.x, x1: x + a.x + a.w, y0: y + a.y, y1: y + a.y + a.h, prof: e.r + (e.h || 1) + e.c + (e.w || 1) });
  }
}
let OBS = null;
const obs = () => (OBS ??= obstacles());

const bloque = (u, v) => {
  if (u < 0.2 || v < 0.2 || u > N - 0.2 || v > N - 0.2) return true;
  for (const b of obs().blocs) {
    if (b.rad !== undefined ? (u - b.cu) ** 2 + (v - b.cv) ** 2 < b.rad ** 2 : u > b.u0 && u < b.u1 && v > b.v0 && v < b.v1) return true;
  }
  return false;
};
/** La figurine posée en (u, v) serait-elle cachée, même en partie, par un dessin devant elle ? */
export function cachee(u, v) {
  const [x, y] = P(u, v);
  const prof = u + v + 1.05;
  return obs().dessins.some((d) => d.prof > prof && x + FIGURINE.w / 2 > d.x0 && x - FIGURINE.w / 2 < d.x1 && y > d.y0 && y - FIGURINE.h < d.y1 && y < d.y1);
}
const surRoute = (u, v) => Math.abs(u - 6) <= 0.3 || Math.abs(v - 6) <= 0.3;
const surPlace = (u, v) => u >= 4 && u <= 8 && v >= 4 && v <= 8;
function cout(u, v) {
  const base = surRoute(u, v) ? ROUTE : surPlace(u, v) ? PLACE : HERBE;
  return cachee(u, v) ? base + CACHE : base;
}

// ------------------------------------------------------------------------------------------- recherche du chemin
const M = Math.round(N / PAS);
const idx = (i, j) => j * (M + 1) + i;
const near = (x) => Math.max(0, Math.min(M, Math.round(x / PAS)));
const PAS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const CHEMINS = new Map();
/** Chemin de a à b ([u, v]) : liste de points, a et b compris ; null s'il n'y en a pas. Mémorisé. */
export function chemin(a, b) {
  const k = `${a}|${b}`;
  if (!CHEMINS.has(k)) CHEMINS.set(k, chercher(a, b));
  return CHEMINS.get(k);
}

function chercher(a, b) {
  const s = [near(a[0]), near(a[1])], t = [near(b[0]), near(b[1])];
  const g = new Map([[idx(...s), 0]]);
  const from = new Map();
  const open = [[dist(s, t), ...s]];
  const done = new Set();
  while (open.length) {
    let m = 0;
    for (let q = 1; q < open.length; q++) if (open[q][0] < open[m][0]) m = q;
    const [, i, j] = open.splice(m, 1)[0];
    const k = idx(i, j);
    if (done.has(k)) continue;
    done.add(k);
    if (i === t[0] && j === t[1]) return tendre(remonter(from, k, i, j), a, b);
    for (const [di, dj] of PAS8) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni > M || nj > M) continue;
      const nk = idx(ni, nj);
      if (done.has(nk)) continue;
      const u = ni * PAS, v = nj * PAS;
      const fin = ni === t[0] && nj === t[1];
      if (!fin && bloque(u, v)) continue;
      // en diagonale, jamais en coupant le coin d'un obstacle
      if (di && dj && (bloque(i * PAS, v) || bloque(u, j * PAS))) continue;
      const ng = g.get(k) + Math.hypot(di, dj) * cout(u, v);
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        from.set(nk, k);
        open.push([ng + dist([ni, nj], t), ni, nj]);
      }
    }
  }
  return null;
}
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
function remonter(from, k, i, j) {
  const out = [[i * PAS, j * PAS]];
  while (from.has(k)) { k = from.get(k); out.push([(k % (M + 1)) * PAS, Math.floor(k / (M + 1)) * PAS]); }
  return out.reverse();
}

// Lignes droites tant que le segment ne bloque pas et ne coûte pas plus cher que le détour qu'il remplace.
function tendre(pts, a, b) {
  pts[0] = a; pts[pts.length - 1] = b;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !droit(pts, i, j)) j--;
    out.push(pts[j]);
    i = j;
  }
  return out.map(([u, v]) => [Math.round(u * 100) / 100, Math.round(v * 100) / 100]);
}
function droit(pts, i, j) {
  let detour = 0;
  for (let q = i + 1; q <= j; q++) detour += dist(pts[q - 1], pts[q]) * cout(...pts[q]);
  const [u0, v0] = pts[i], [u1, v1] = pts[j];
  const n = Math.max(1, Math.ceil(Math.hypot(u1 - u0, v1 - v0) / (PAS / 5)));
  const pas = Math.hypot(u1 - u0, v1 - v0) / n;
  let ligne = 0;
  for (let q = 1; q <= n; q++) {
    const u = u0 + ((u1 - u0) * q) / n, v = v0 + ((v1 - v0) * q) / n;
    if (q < n && bloque(u, v)) return false;
    ligne += pas * cout(u, v);
  }
  return ligne <= detour + 1e-9;
}

// ------------------------------------------------------------------------------------------- qui va où
const ORDRE_DECALAGE = 0.6180339887; // suite de Weyl : tous différents, bien répartis sur le cycle

/**
 * Promeneurs de l'île, d'après la vue (world/view.js : batiments, today). Un par habitant logé, au plus
 * MAX_PROMENEURS, dans l'ordre des chalets. Plusieurs habitants au même lieu : chacun sa place près du poste
 * (placesAutour). decalage : place dans le cycle, entre 0 et 1, tous différents ; les durées des tours diffèrent,
 * deux départs peuvent donc coïncider de temps en temps.
 */
export function promeneurs(view) {
  const bats = Array.isArray(view?.batiments) ? view.batiments : [];
  const debout = (b) => b && b.bati;
  const dort = typeof view?.today === 'string' && !potagerOuvert(view.today);
  const lieux = [];
  for (const type of ORDRE_LIEUX) {
    if (type === 'parcelle' && dort) continue;
    for (const b of bats) if (b.type === type && debout(b) && poste(b.id)) lieux.push({ id: b.id, poste: poste(b.id) });
  }
  if (!lieux.length) lieux.push({ id: 'place', poste: POSTE_PLACE });
  const out = [];
  const pris = new Map(); // lieu → places déjà données
  const PLACE = { id: 'place', poste: POSTE_PLACE };
  // chemin vers la prochaine place libre du lieu (null : lieu plein, ou aucune place atteignable) ; serrer : une fois
  // le lieu plein, reprendre ses places depuis la première
  const vers = (porte, lieu, serrer = false) => {
    const places = placesAutour(lieu.poste);
    const q0 = pris.get(lieu.id) ?? 0;
    for (let q = q0; q < (serrer ? q0 + places.length : places.length); q++) {
      pris.set(lieu.id, q + 1);
      const c = chemin(porte, places[q % places.length]);
      if (c) return c;
    }
    return null;
  };
  for (const b of bats) {
    if (b.type !== 'chalet' || !debout(b)) continue;
    const porte = PORTES.chalet[Number(b.id.split('-')[1]) - 1];
    for (let k = 0; k < (b.occupants || 0) && out.length < MAX_PROMENEURS; k++) {
      const n = out.length;
      // son lieu ; s'il est plein, le suivant qui a de la place, puis la Place ; tout plein : on se serre au sien
      const r = n % lieux.length;
      const ordre = [...lieux.slice(r), ...lieux.slice(0, r), PLACE];
      let lieu = null, c = null;
      for (const l of ordre) if ((c = vers(porte, l))) { lieu = l; break; }
      if (!c && (c = vers(porte, lieux[r], true))) lieu = lieux[r];
      if (!c) continue;
      out.push({ id: `habitant-${n + 1}`, chalet: b.id, lieu: lieu.id, chemin: c, decalage: Math.round(((n * ORDRE_DECALAGE) % 1) * 1000) / 1000 });
    }
  }
  return out;
}

// Places autour d'un poste, la plus proche d'abord : libres (aucun pied, aucun mur), visibles (aucun dessin devant),
// loin de Fanal, dans un rayon de RAYON cases, et assez loin l'une de l'autre à l'écran pour que deux figurines ne se
// recouvrent pas (ECART_X px de côté, ou ECART_Y px de haut). Le poste lui-même vient en premier s'il est libre et
// visible. Assez pour 15 habitants sur la Place. Mémorisé par poste.
const RAYON = 2.2, LOIN_DE_FANAL = 0.6;
export const ECART_X = 12, ECART_Y = 26;
const aPart = (a, b) => { const [xa, ya] = P(...a), [xb, yb] = P(...b); return Math.abs(xa - xb) >= ECART_X || Math.abs(ya - yb) >= ECART_Y; };
const PLACES = new Map();
export function placesAutour(p) {
  const k = `${p}`;
  if (PLACES.has(k)) return PLACES.get(k);
  const libre = (u, v) => !bloque(u, v) && !cachee(u, v) && dist([u, v], FANAL_HOME) >= LOIN_DE_FANAL;
  const cand = [];
  const n = Math.ceil(RAYON / PAS);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const u = Math.round((p[0] + i * PAS) * 100) / 100, v = Math.round((p[1] + j * PAS) * 100) / 100;
      const d = dist([u, v], p);
      if (d > 0 && d <= RAYON && libre(u, v)) cand.push([d, u, v]);
    }
  }
  cand.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const out = libre(...p) ? [p] : [];
  for (const [, u, v] of cand) if (out.every((q) => aPart(q, [u, v]))) out.push([u, v]);
  PLACES.set(k, out);
  return out;
}

function poste(id) {
  const [type, n] = id.split('-');
  return POSTES[type]?.[Number(n) - 1] ?? null;
}

// ------------------------------------------------------------------------------------------- un tour complet
/** Allure d'une figurine, en cases par seconde ; temps passé au travail, puis à la maison ; fondu à la porte (s). */
export const VITESSE = 0.6;
export const TRAVAIL = 16;
export const MAISON = 12;
export const SEUIL = 0.6;

/**
 * Images clés d'un tour : à la maison (invisible), sortie par la porte, chemin, travail au poste, retour, rentrée.
 * { duree (s), images: [{ t (0 à 1), u, v, o (opacité 0 ou 1) }] } ; la scène en fait une animation qui boucle.
 */
export function trajet(p) {
  const c = p.chemin;
  const pas = [];
  const t = [];
  let s = 0;
  const at = (dt, [u, v], o) => { s += dt; pas.push({ s, u, v, o }); };
  at(0, c[0], 0);
  at(MAISON, c[0], 0);
  at(SEUIL, c[0], 1);
  for (let q = 1; q < c.length; q++) at(dist(c[q - 1], c[q]) / VITESSE, c[q], 1);
  at(TRAVAIL, c.at(-1), 1);
  for (let q = c.length - 2; q >= 0; q--) at(dist(c[q + 1], c[q]) / VITESSE, c[q], 1);
  at(SEUIL, c[0], 0);
  const duree = s;
  for (const im of pas) t.push({ t: Math.round((im.s / duree) * 10000) / 10000, u: im.u, v: im.v, o: im.o });
  return { duree: Math.round(duree * 100) / 100, images: t };
}
