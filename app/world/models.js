// Modèles low-poly en aplats à trois tons (dessus -t, face +v -l, face +u -r). Repère local : (0,0,0) = coin
// arrière de l'emprise. Chaque fonction renvoie { svg, x, y, w, h, shadow, anchors } (voir iso.js : Art.done).
// Les modèles du décor fixe : lanterne, cloture, caisse, etabli, erable, glaciere. Bâtiments du joueur : chalet,
// parcelle, atelier, serre, eolienne, grenier, quai, tour (de guet), scierie, poulailler, cabane (à sucre), et piquets
// (chantier possible). Décor : epinette, arbre, buisson, rocher, et souche (la bande gagnée sur la forêt, lot F).
// Fanal : characterSVG().
import { Art, P, HW, HH, f, pts, rng } from './iso.js';

// ---------------------------------------------------------------- primitives

// Boule facettée (feuillage) : chaque facette est teintée selon son orientation par rapport à la lumière
function ball(a, cx, cy, r, m, R, n = 7, m2 = null) {
  const q = [];
  for (let k = 0; k < n; k++) {
    const t = -Math.PI / 2 + (k / n) * Math.PI * 2 + (R() - 0.5) * 0.3;
    const rr = r * (0.9 + R() * 0.16);
    q.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.9]);
  }
  const c = [cx - r * 0.2, cy - r * 0.26];
  for (let k = 0; k < n; k++) {
    const p1 = q[k], p2 = q[(k + 1) % n];
    const mx = (p1[0] + p2[0]) / 2 - cx, my = (p1[1] + p2[1]) / 2 - cy;
    const d = (-mx * 0.62 - my * 0.78) / (Math.hypot(mx, my) || 1);
    const mm = m2 && R() < 0.3 ? m2 : m;
    a.spoly([c, p1, p2], d > 0.3 ? `${mm}-t` : d > -0.45 ? `${mm}-l` : `${mm}-r`);
  }
}

function cone(a, cx, by, w, h, m) {
  const ap = [cx, by - h], L = [cx - w, by - w * 0.08], Rr = [cx + w, by - w * 0.08], F = [cx + w * 0.1, by + w * 0.36];
  a.spoly([ap, L, F], `${m}-l`);
  a.spoly([ap, F, Rr], `${m}-r`);
  a.spoly([ap, L, [cx - w * 0.42, by + w * 0.1]], `${m}-t`);
}

// Toit à deux pans, faîtage parallèle à u. `mid` est dessiné entre le pan arrière et le pan avant.
function roofU(a, u, v, du, dv, z, rise, m, wall, ov = 0.07, mid = null) {
  const u0 = u - ov, u1 = u + du + ov, v0 = v - ov, v1 = v + dv + ov, vm = v + dv / 2;
  for (const [x, y] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) a.cast(x, y, z);
  a.cast(u0, vm, z + rise); a.cast(u1, vm, z + rise);
  a.poly([[u0, v0, z], [u1, v0, z], [u1, vm, z + rise], [u0, vm, z + rise]], `${m}-r`);
  a.poly([[u + du, v, z], [u + du, v + dv, z], [u + du, vm, z + rise]], `${wall}-r`);
  if (mid) mid();
  a.poly([[u0, v1, z], [u1, v1, z], [u1, vm, z + rise], [u0, vm, z + rise]], `${m}-t`);
  a.poly([[u0, v1, z], [u1, v1, z], [u1, v1, z - 2.2], [u0, v1, z - 2.2]], `${m}-r`);
  a.poly([[u1, v1, z], [u1, vm, z + rise], [u1, vm, z + rise - 2.2], [u1, v1, z - 2.2]], `${m}-r`);
  return { u0, u1, v0, v1, vm, z, rise };
}
const onSlope = (rf, uu, s) => [uu, rf.v1 + (rf.vm - rf.v1) * s, rf.z + rf.rise * s];
const rectV = (a, V, u0, u1, z0, z1, cls, ex) => a.poly([[u0, V, z0], [u1, V, z0], [u1, V, z1], [u0, V, z1]], cls, ex);
const rectU = (a, U, v0, v1, z0, z1, cls, ex) => a.poly([[U, v0, z0], [U, v1, z0], [U, v1, z1], [U, v0, z1]], cls, ex);

// ---------------------------------------------------------------- Place du village

export function lanterne() {
  const a = new Art();
  a.box(0.38, 0.38, 0.24, 0.24, 0, 3, 'stoned', { rim: true });
  a.box(0.46, 0.46, 0.08, 0.08, 3, 20, 'woodd');
  a.box(0.41, 0.41, 0.18, 0.18, 23, 1.5, 'roofb');
  a.poly([[0.42, 0.59, 24.5], [0.58, 0.59, 24.5], [0.58, 0.59, 31], [0.42, 0.59, 31]], 'lampg');
  a.poly([[0.59, 0.42, 24.5], [0.59, 0.58, 24.5], [0.59, 0.58, 31], [0.59, 0.42, 31]], 'lampg', ' opacity=".78"');
  a.seg([0.5, 0.59, 24.5], [0.5, 0.59, 31], 'k-roofb-l', 0.6);
  a.poly([[0.38, 0.62, 31], [0.62, 0.62, 31], [0.5, 0.5, 36]], 'roofb-l');
  a.poly([[0.62, 0.38, 31], [0.62, 0.62, 31], [0.5, 0.5, 36]], 'roofb-r');
  a.anchor('light', 0.5, 0.5, 28);
  return a.done(1);
}

// ---------------------------------------------------------------- petits objets

export function cloture(end = false) {
  const a = new Art();
  const V = 0.5;
  const posts = end ? [0.06, 0.52, 0.94] : [0.06, 0.52];
  for (const u of posts) a.box(u, V - 0.04, 0.07, 0.07, 0, 13, 'woodd', { rim: true });
  for (const z of [5, 10]) a.poly([[0, V + 0.03, z], [1, V + 0.03, z], [1, V + 0.03, z + 1.8], [0, V + 0.03, z + 1.8]], 'woodb-l');
  return a.done(1);
}

export function caisse(seed = 1) {
  const a = new Art();
  const R = rng(seed);
  const u = 0.26 + R() * 0.06, v = 0.3, du = 0.44, dv = 0.38, H = 14;
  a.box(u, v, du, dv, 0, H, 'woodb', { rim: true });
  for (const t of [0.33, 0.66]) {
    a.seg([u, v + dv, H * t], [u + du, v + dv, H * t], 'k-woodd-l', 0.7);
    a.seg([u + du, v, H * t], [u + du, v + dv, H * t], 'k-woodd-r', 0.7);
  }
  a.seg([u + 0.03, v + dv, 1], [u + du - 0.03, v + dv, H - 1], 'k-woodd-l', 1);
  a.seg([u + du, v + 0.03, 1], [u + du, v + dv - 0.03, H - 1], 'k-woodd-r', 1);
  // étiquette et corde
  a.poly([[u + 0.08, v + dv, 6], [u + 0.2, v + dv, 6], [u + 0.2, v + dv, 11], [u + 0.08, v + dv, 11]], 'paper-l');
  a.seg([u + du * 0.5, v, H], [u + du * 0.5, v + dv, H], 'k-rope-t', 1.2);
  return a.done(1);
}

export function glaciere() {
  const a = new Art();
  const u = 0.24, v = 0.3, du = 0.52, dv = 0.42;
  a.box(u, v, du, dv, 0, 13, 'ice', { rim: true });
  a.box(u - 0.02, v - 0.02, du + 0.04, dv + 0.04, 13, 3.2, 'tech', { rim: true });
  a.seg([u + 0.16, v + dv + 0.02, 10], [u + du - 0.16, v + dv + 0.02, 10], 'k-metal-r', 1.6);
  a.seg([u + du + 0.02, v + 0.12, 7], [u + du + 0.02, v + dv - 0.12, 7], 'k-glass-l', 0.9);
  a.seg([u + 0.06, v + dv, 3], [u + 0.06, v + dv, 9], 'k-glass-t', 0.8);
  a.anchor('glint', 0.4, 0.5, 16);
  return a.done(1);
}

export function etabli() {
  const a = new Art();
  const u = 0.16, v = 0.36, du = 0.68, dv = 0.3;
  for (const [x, y] of [[u + 0.02, v + 0.02], [u + du - 0.07, v + 0.02], [u + 0.02, v + dv - 0.07], [u + du - 0.07, v + dv - 0.07]]) a.box(x, y, 0.05, 0.05, 0, 12, 'woodd');
  a.box(u + 0.04, v + 0.04, du - 0.08, dv - 0.08, 4, 1.5, 'woodd', { cast: false });
  // panneau d'outils
  a.box(u, v - 0.06, du, 0.06, 13, 17, 'woodd');
  const V = v;
  a.seg([u + 0.12, V, 26], [u + 0.12, V, 19], 'k-metal-l', 1.2);
  a.seg([u + 0.07, V, 26], [u + 0.17, V, 26], 'k-metal-l', 2);
  a.poly([[u + 0.28, V, 27], [u + 0.46, V, 25], [u + 0.46, V, 21], [u + 0.28, V, 22]], 'metal-l');
  a.seg([u + 0.56, V, 27], [u + 0.62, V, 18], 'k-wooddk-l', 1.3);
  // plateau, étau, lampe
  a.box(u - 0.02, v - 0.02, du + 0.04, dv + 0.04, 12, 2.5, 'woodb', { rim: true });
  a.box(u + du - 0.2, v + 0.08, 0.12, 0.12, 14.5, 4, 'metal', { rim: true });
  a.box(u + 0.12, v + 0.1, 0.18, 0.12, 14.5, 2, 'tech', { rim: true });
  a.anchor('light', u + 0.6, v, 30);
  a.anchor('glint', u + 0.4, v + 0.15, 18);
  return a.done(2);
}

// ---------------------------------------------------------------- Atelier

/** Atelier : emprise 2 (u) × 1 (v). `abime` : façade abîmée (non utilisé par le décor actuel). */
export function atelier(abime = false) {
  const a = new Art();
  const u = 0.15, v = 0.18, du = 1.7, dv = 0.66, H = 22;
  a.box(u, v, du, dv, 0, 4, 'stoned');
  a.box(u, v, du, dv, 4, H - 4, 'woodb', { top: false });
  for (let uu = u + 0.12; uu < u + du - 0.04; uu += 0.12) a.seg([uu, v + dv, 4.5], [uu, v + dv, H], 'k-woodd-l', 0.6, ' opacity=".45"');
  for (let vv = v + 0.12; vv < v + dv - 0.04; vv += 0.12) a.seg([u + du, vv, 4.5], [u + du, vv, H], 'k-woodd-r', 0.6, ' opacity=".45"');
  a.seg([u + du, v + dv, 4], [u + du, v + dv, H], 'k-woodd-l', 1.8);
  a.seg([u, v + dv, 4], [u, v + dv, H], 'k-woodd-l', 1.8);
  // grande porte et fenêtres
  const V = v + dv;
  rectV(a, V, u + 0.62, u + 1.06, 4, 18, 'woodd-l');
  a.seg([u + 0.84, V, 4], [u + 0.84, V, 18], 'k-wooddk-l', 1);
  a.seg([u + 0.62, V, 18.5], [u + 1.06, V, 18.5], 'k-wooddk-l', 1.4);
  rectV(a, V, u + 0.18, u + 0.44, 10, 16, 'win');
  rectV(a, V, u + 1.26, u + 1.52, 10, 16, 'win');
  rectU(a, u + du, v + 0.18, v + 0.46, 10, 16, 'win');
  // enseigne
  a.poly([[u + 0.66, V + 0.01, 19.5], [u + 1.02, V + 0.01, 19.5], [u + 1.02, V + 0.01, 22.5], [u + 0.66, V + 0.01, 22.5]], 'paper-l');
  roofU(a, u, v, du, dv, H, 14, 'roofb', 'woodb', 0.08, () => {
    a.box(u + 1.3, v + 0.1, 0.14, 0.14, H + 2, 16, 'stoned', { rim: true });
  });
  if (abime) {
    // tôles arrachées : deux trous sombres dans le pan avant
    a.poly([[u + 0.3, v + dv + 0.02, H + 2], [u + 0.62, v + dv - 0.08, H + 4], [u + 0.56, v + dv - 0.2, H + 7], [u + 0.34, v + dv - 0.14, H + 5]], 'wooddk-l');
    a.box(1.9, 0.62, 0.1, 0.34, 0, 2, 'roofb', { rim: true });
  }
  // tonneau
  a.prism(1.98, 0.62, 0.11, 0, 10, 'woodd', 8, { rim: true });
  const r = a.done(4);
  r.anchors.smoke = P(u + 1.37, v + 0.17, H + 20);
  r.anchors.light = P(u + 0.31, V + 0.05, 13);
  return r;
}

export function erable(seed = 1, m = 'maple') {
  const a = new Art();
  const R = rng(seed);
  a.box(0.45, 0.45, 0.1, 0.1, 0, 15, 'woodd');
  const [cx, cy] = P(0.5, 0.5);
  const s = 0.95 + R() * 0.2;
  ball(a, cx - 8 * s, cy - 25 * s, 11 * s, m, R, 7, 'amber');
  ball(a, cx + 8 * s, cy - 24 * s, 10.5 * s, m, R, 7, 'amber');
  ball(a, cx + 1, cy - 37 * s, 12.5 * s, m, R, 8, 'gold');
  for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; a.castS(cx + Math.cos(t) * 17 * s, cy - 30 * s + Math.sin(t) * 12 * s, 30 * s); }
  a.cast(0.45, 0.45, 0); a.cast(0.55, 0.55, 0);
  return a.done();
}

// ---------------------------------------------------------------- marque d'un dégât (lot I)
// Un mauvais imprévu (core/imprevus.js) marque le bâtiment touché : un disque braise posé sur une pointe, un picto clair
// dedans, les mêmes tracés que design/icons.svg (grille de 24). La braise est la couleur des menaces (world.css :
// .ow-mark-*, lue dans tokens.css) ; le picto la double, et le nom de l'objet sur la carte dit le dégât en toutes lettres.
export const MARK_GLYPH = {
  panne: '<path d="M15.6 4.4a4.6 4.6 0 0 0-5 6.2l-6.2 6.2a1.9 1.9 0 0 0 2.7 2.7l6.2-6.2a4.6 4.6 0 0 0 6.2-5l-2.9 2.9-2.6-.5-.5-2.6z"/>',
  ours: '<ellipse cx="12" cy="15.6" rx="4.4" ry="3.6" class="ow-mark-fill"/><circle cx="6.4" cy="10.4" r="1.9" class="ow-mark-fill"/><circle cx="9.7" cy="6.9" r="2" class="ow-mark-fill"/><circle cx="14.3" cy="6.9" r="2" class="ow-mark-fill"/><circle cx="17.6" cy="10.4" r="1.9" class="ow-mark-fill"/>',
  gel: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><circle cx="12" cy="12" r="2.2" class="ow-mark-fill"/>',
  // une pelle penchée (lot H) : la neige d'une tempête, à déneiger
  neige: '<g transform="rotate(-32 12 12)"><path d="M9.4 3.2h5.2M12 3.2v8.6"/><path d="M8.2 11.8h7.6v3.4a3.8 3.8 0 0 1-7.6 0z" class="ow-mark-fill"/></g>',
};
/** (x, y) : la pointe, en px du dessin. */
function marque(a, x, y, type) {
  const r = 8.6, cy = y - 5 - r;
  a.raw(`<g class="ow-mark" data-degat="${type}"><path class="ow-mark-pin" d="M${f(x - 4)},${f(cy + r - 2.4)}L${f(x)},${f(y)}L${f(x + 4)},${f(cy + r - 2.4)}Z"/>`
    + `<circle class="ow-mark-disc" cx="${f(x)}" cy="${f(cy)}" r="${r}"/>`
    + `<g class="ow-mark-glyph" transform="translate(${f(x - 6.6)} ${f(cy - 6.6)}) scale(.55)">${MARK_GLYPH[type] || ''}</g></g>`);
  a.ext(x - r - 1, cy - r - 1); a.ext(x + r + 1, y + 1);
}

// ---------------------------------------------------------------- congère d'une tempête (lot H)
// La neige d'une tempête (dégât « neige », core/hiver.js) s'amoncelle contre les faces avant d'une emprise
// (u0..u1 × v0..v1) : un bourrelet bosselé, haut de h px contre le mur et plus chargé vers le coin avant, qui descend
// jusqu'au sol à `o` case du mur. Une pente par face (lumière du dessus côté +v, ton de face côté +u), sans facettes
// alternées : de loin, une congère, pas des éclats.
function congere(a, u0, u1, v0, v1, h, o, seed) {
  const R = rng(seed);
  const n = 6;
  const z = (k) => h * (0.62 + 0.38 * (k / n) + (R() - 0.5) * 0.18); // k = n : le coin avant
  const ov = (k) => o * (0.45 + 0.55 * (k / n));
  const zu = Array.from({ length: n + 1 }, (_, k) => z(k));
  const zv = Array.from({ length: n + 1 }, (_, k) => z(k));
  zu[n] = zv[n] = h;
  const along = (k, a0, a1) => a0 + ((a1 - a0) * k) / n;
  // face +u (avant droite), du fond vers le coin
  const pu = [];
  for (let k = 0; k <= n; k++) pu.push([u1, along(k, v0, v1), zv[k]]);
  for (let k = n; k >= 0; k--) pu.push([u1 + ov(k), along(k, v0, v1), 0]);
  a.poly(pu, 'snow-l');
  // face +v (avant gauche), du fond vers le coin
  const pv = [];
  for (let k = 0; k <= n; k++) pv.push([along(k, u0, u1), v1, zu[k]]);
  for (let k = n; k >= 0; k--) pv.push([along(k, u0, u1), v1 + ov(k), 0]);
  a.poly(pv, 'snow-t');
  // le coin : la neige fait le tour
  a.poly([[u1, v1, h], [u1 + o, v1, 0], [u1 + o * 0.78, v1 + o * 0.78, 0], [u1, v1 + o, 0]], 'snow-t');
  a.ext(...P(u1 + o, v1 + o)); a.ext(...P(u0, v1 + o)); a.ext(...P(u1 + o, v0));
}

// ---------------------------------------------------------------- bâtiments du joueur (lot 4)
// Chaque bâtiment a un état lisible par sa forme, pas seulement sa couleur : chalet vide aux fenêtres
// condamnées, piquets et cordeau d'un chantier possible, panier posé au coin d'une culture mûre, vieux quai troué.

/** Chalet, emprise 1,2 × 1,2. etat : 'vide' (à rebâtir : fenêtres condamnées, toit percé), '' ou 'habite' (fumée). */
export function chalet(etat = '') {
  const vide = etat === 'vide';
  const a = new Art();
  const u = 0.16, v = 0.24, du = 0.9, dv = 0.78, H = 16;
  a.box(u - 0.05, v - 0.05, du + 0.1, dv + 0.1, 0, 3, 'stoned', { rim: true });
  a.box(u, v, du, dv, 3, H - 3, 'woodb', { top: false });
  // rondins
  for (let z = 5.6; z < H - 0.5; z += 2.6) {
    a.seg([u, v + dv, z], [u + du, v + dv, z], 'k-woodd-l', 0.7, ' opacity=".5"');
    a.seg([u + du, v, z], [u + du, v + dv, z], 'k-woodd-r', 0.7, ' opacity=".5"');
  }
  const V = v + dv;
  rectV(a, V, u + 0.34, u + 0.54, 3, 13, vide ? 'wooddk-l' : 'woodd-l');
  if (vide) {
    // fenêtres condamnées : deux planches en croix
    rectV(a, V, u + 0.66, u + 0.84, 7, 12, 'wooddk-l');
    a.seg([u + 0.64, V + 0.01, 7.4], [u + 0.86, V + 0.01, 11.6], 'k-woodb-l', 1.6);
    a.seg([u + 0.64, V + 0.01, 11.6], [u + 0.86, V + 0.01, 7.4], 'k-woodb-l', 1.6);
    rectU(a, u + du, v + 0.28, v + 0.5, 7, 12, 'wooddk-r');
    a.seg([u + du + 0.01, v + 0.26, 7.4], [u + du + 0.01, v + 0.52, 11.6], 'k-woodb-r', 1.6);
  } else {
    rectV(a, V, u + 0.66, u + 0.84, 7, 12, 'win');
    rectU(a, u + du, v + 0.28, v + 0.5, 7, 12, 'win');
    a.box(u + 0.64, V, 0.22, 0.06, 5.6, 1.6, 'woodd', { cast: false });
    const [fx, fy] = P(u + 0.75, V + 0.03, 7.4);
    a.raw(`<circle cx="${f(fx - 2.4)}" cy="${f(fy)}" r="1.4" class="fl2-t"/><circle cx="${f(fx + 1.2)}" cy="${f(fy - 0.4)}" r="1.4" class="fl1-t"/>`);
  }
  roofU(a, u, v, du, dv, H, 13, 'roof', 'woodb', 0.09, () => {
    if (!vide) a.box(u + 0.66, v + 0.12, 0.12, 0.12, H + 3, 11, 'stoned', { rim: true });
  });
  if (vide) {
    // toit percé et planche appuyée au mur
    a.poly([[u + 0.2, v + dv + 0.02, H + 1.5], [u + 0.46, v + dv - 0.08, H + 3.5], [u + 0.42, v + dv - 0.22, H + 7], [u + 0.24, v + dv - 0.16, H + 5]], 'wooddk-l');
    a.seg([u + du + 0.22, v + dv - 0.1, 0], [u + du + 0.01, v + dv - 0.22, 11], 'k-woodb-r', 2);
  }
  const r = a.done(3);
  if (!vide) r.anchors.light = P(u + 0.75, V + 0.03, 10);
  if (etat === 'habite') r.anchors.smoke = P(u + 0.72, v + 0.18, H + 15);
  return r;
}

/** Piquets et cordeau : un chantier possible, sur une emprise w (u) × h (v). */
export function piquets(w = 1, h = 1) {
  const a = new Art();
  const i = 0.16;
  const c = [[i, i], [w - i, i], [w - i, h - i], [i, h - i]];
  for (const [x, y] of [[0, 0], [w, 0], [w, h], [0, h]]) a.ext(...P(x, y));
  a.seg([...c[0], 6], [...c[1], 6], 'k-rope-t', 0.9);
  a.seg([...c[0], 6], [...c[3], 6], 'k-rope-t', 0.9);
  for (const [u, v] of c) a.box(u - 0.03, v - 0.03, 0.06, 0.06, 0, 9, 'woodd', { rim: true });
  a.seg([...c[3], 6], [...c[2], 6], 'k-rope-l', 0.9);
  a.seg([...c[1], 6], [...c[2], 6], 'k-rope-r', 0.9);
  // fanion sur le piquet avant
  a.poly([[c[2][0], c[2][1], 9], [c[2][0], c[2][1], 14], [c[2][0] - 0.16, c[2][1], 11.5]], 'paper-l');
  a.seg([...c[2], 9], [...c[2], 14.5], 'k-woodd-l', 0.9);
  // petite pile de planches
  const pu = w / 2 - 0.2, pv = h / 2 - 0.08;
  a.box(pu, pv, 0.4, 0.16, 0, 1.8, 'woodb', { rim: true });
  a.box(pu + 0.04, pv + 0.02, 0.34, 0.12, 1.8, 1.8, 'woodb', { rim: true });
  const r = a.done(2);
  r.shadow = null;
  return r;
}

/** Panier tressé : repère « mûre », reconnaissable par sa forme. (x, y) = milieu du fond, en px. */
function panier(x, y, s = 1) {
  const rw = 9.5 * s, w = 7.2 * s, ry = 3.4 * s, top = y - 8 * s, band = 1.5 * s;
  let o = `<ellipse cx="${f(x)}" cy="${f(y + 0.6 * s)}" rx="${f(w + 1.5 * s)}" ry="${f(2.6 * s)}" class="ow-basket-shadow"/>`;
  o += `<path d="M${f(x - rw * 0.78)},${f(top + 0.6 * s)}Q${f(x)},${f(top - 12 * s)} ${f(x + rw * 0.78)},${f(top + 0.6 * s)}" class="k-woodd-l" stroke-width="${f(1.5 * s)}" stroke-linecap="round"/>`;
  o += `<ellipse cx="${f(x)}" cy="${f(top)}" rx="${f(rw)}" ry="${f(ry)}" class="wooddk-t"/>`;
  o += `<ellipse cx="${f(x - 2.4 * s)}" cy="${f(top - 1.6 * s)}" rx="${f(4 * s)}" ry="${f(3 * s)}" class="squash-l"/><ellipse cx="${f(x + 2.8 * s)}" cy="${f(top - 1.2 * s)}" rx="${f(3.4 * s)}" ry="${f(2.6 * s)}" class="squash-r"/>`;
  o += `<polygon points="${pts([[x - rw, top], [x, top + ry], [x, y + 1.6 * s], [x - w, y]])}" class="woodb-l"/>`;
  o += `<polygon points="${pts([[x, top + ry], [x + rw, top], [x + w, y], [x, y + 1.6 * s]])}" class="woodb-r"/>`;
  for (const k of [0.42, 0.74]) {
    const yl = top + (y - top) * k;
    o += `<path d="M${f(x - rw + (rw - w) * k)},${f(yl)}L${f(x)},${f(yl + ry * (1 - k * 0.5))}L${f(x + rw - (rw - w) * k)},${f(yl)}" class="k-woodd-l" stroke-width="${f(0.7 * s)}" fill="none" opacity=".8"/>`;
  }
  o += `<polygon points="${pts([[x - rw, top], [x, top + ry], [x + rw, top], [x + rw, top + band], [x, top + ry + band], [x - rw, top + band]])}" class="woodd-l"/>`;
  return o;
}

// Un plant, du semis à la récolte. Stade : 'seme' (buttes et graines), 'pousse' (feuillage), 'mure' (légume).
function plant(stade, x, y, crop) {
  if (stade === 'seme') return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4" ry="1.8" class="soilr-t"/><path d="M${f(x)},${f(y - 0.5)}q-1.6,-2.4 -3.2,-2M${f(x)},${f(y - 0.5)}q1.4,-2.6 3,-2.5" class="k-sprout-l" stroke-width="1.2" stroke-linecap="round"/>`;
  const leaf = (dx, dy, w, cls) => `<path d="M${f(x)},${f(y)}Q${f(x + dx - w)},${f(y + dy * 0.4)} ${f(x + dx)},${f(y + dy)}Q${f(x + dx + w)},${f(y + dy * 0.5)} ${f(x)},${f(y)}Z" class="${cls}"/>`;
  let s = `<ellipse cx="${f(x)}" cy="${f(y + 0.5)}" rx="7" ry="3" class="leafd-r" opacity=".45"/>`;
  s += leaf(-7, -4, 3, 'leaf-l') + leaf(7, -3.5, 3, 'leaf-r') + leaf(-2, -8, 3.2, 'leafb-t') + leaf(3, -7, 3, 'leaf-t');
  if (stade !== 'mure') return s;
  if (crop === 'chou') return s + `<circle cx="${f(x)}" cy="${f(y - 4)}" r="4.2" class="leafb-l"/><path d="M${f(x - 3)},${f(y - 4)}q3,-3.4 6,0" class="k-leafd-t" stroke-width="1"/>`;
  return s + `<ellipse cx="${f(x + 3)}" cy="${f(y - 1.5)}" rx="5.4" ry="4.2" class="squash-l"/><path d="M${f(x + 3)},${f(y - 5.7)}A5.4,4.2 0 0 1 ${f(x + 3)},${f(y + 2.7)}Z" class="squash-r"/><path d="M${f(x + 3)},${f(y - 5.6)}v-2.2" class="k-woodd-l" stroke-width="1.3"/><ellipse cx="${f(x + 1.4)}" cy="${f(y - 3)}" rx="1.6" ry="1.1" class="squash-t"/>`;
}

// Pattes d'ours sur la terre, dans le repère de la grille (le groupe à matrice de la parcelle) : un coussinet, quatre doigts.
function pattes(list) {
  return list.map(([u, v]) => `<ellipse cx="${u}" cy="${v}" rx=".07" ry=".055" class="soilf-t"/>`
    + [[-0.07, -0.08], [-0.025, -0.11], [0.025, -0.11], [0.07, -0.08]].map(([du, dv]) => `<circle cx="${(u + du * 0.9).toFixed(3)}" cy="${(v + dv * 0.9).toFixed(3)}" r=".024" class="soilf-t"/>`).join('')).join('');
}

/**
 * Parcelle du potager, emprise 1,6 × 1,6 : terre bordée de planches, et la culture à son stade ('' = rien de semé).
 * degat (lot I) : 'ours' (des pattes dans la terre, des plants mangés, la marque braise) ou 'gel' (givre sur la terre et
 * les feuilles, la marque).
 */
export function parcelle(stade = '', degat = '') {
  const a = new Art();
  const u0 = 0.1, v0 = 0.1, s = 1.4;
  for (const [x, y] of [[0, 0], [1.6, 0], [1.6, 1.6], [0, 1.6]]) a.ext(...P(x, y));
  a.box(u0 - 0.05, v0 - 0.05, s + 0.1, s + 0.1, 0, 2.2, 'woodd', { cast: false });
  let g = `<g transform="matrix(${HW},${HH},${-HW},${HH},0,0)" stroke-width=".02">`;
  g += `<rect x="${u0}" y="${v0}" width="${s}" height="${s}" class="soil-t" stroke="none"/>`;
  for (const pv of [0.38, 0.73, 1.08, 1.43]) g += `<path d="M${u0 + 0.1},${pv - 0.1}H${u0 + s - 0.1}" class="k-soilf-t" stroke-width=".07" stroke-linecap="round"/><path d="M${u0 + 0.1},${pv}H${u0 + s - 0.1}" class="k-soilr-t" stroke-width=".1" stroke-linecap="round"/>`;
  if (degat === 'ours') g += pattes([[1.42, 0.62], [1.25, 0.86], [1.38, 1.12], [1.2, 1.36]]);
  if (degat === 'gel') g += `<rect x="${u0}" y="${v0}" width="${s}" height="${s}" class="ice-t" stroke="none" opacity=".42"/>`;
  g += '</g>';
  // le dessus de terre est relevé de la hauteur de la bordure
  a.raw(`<g transform="translate(0 -2.2)">${g}</g>`);
  if (stade) {
    const grid = [0.42, 0.77, 1.12, 1.47].flatMap((v) => [0.45, 0.85, 1.25].map((u) => [u, v - 0.1]));
    grid.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
    grid.forEach(([u, v], k) => {
      const [x, y] = P(u, v, 2.2);
      // l'ours a goûté aux plants du bord de son passage : il n'en reste que les feuilles
      const st = degat === 'ours' && stade === 'mure' && u > 1 && k % 2 ? 'pousse' : stade;
      a.raw(plant(st, x, y, (Math.round(u * 10) + Math.round(v * 10)) % 2 ? 'courge' : 'chou'));
      if (degat === 'gel') a.raw(`<circle cx="${f(x - 3.4)}" cy="${f(y - 4.6)}" r="1.1" class="ice-t"/><circle cx="${f(x + 2.6)}" cy="${f(y - 6.2)}" r=".9" class="ice-t"/><circle cx="${f(x + 0.4)}" cy="${f(y - 2.4)}" r=".8" class="ice-t"/>`);
      a.ext(x - 9, y - 14);
    });
  }
  if (stade === 'mure') {
    const [bx, by] = P(1.62, 1.5);
    a.raw(panier(bx, by, 1.05));
    a.ext(bx - 12, by - 24); a.ext(bx + 12, by + 4);
  }
  if (degat) { const [mx, my] = P(0.8, 0.8, 20); marque(a, mx, my, degat); }
  const r = a.done(2);
  r.shadow = null;
  return r;
}

/**
 * Petite serre : tunnel de bois et de toile, emprise 1,9 (u) × 1,5 (v), porte et tuyau de poêle sur le pignon. degat
 * 'neige' (lot H) : une épaisse couche de neige sur la toile, une congère qui bloque la porte et cache les godets, et la
 * marque braise (une pelle) au-dessus du faîte.
 */
export function serre(stade = '', degat = '') {
  const neige = degat === 'neige';
  const a = new Art();
  const u0 = 0.12, u1 = 1.72, v0 = 0.16, v1 = 1.3, vm = (v0 + v1) / 2;
  a.box(u0, v0 - 0.04, u1 - u0, 0.07, 0, 3, 'woodd', { rim: true });
  a.box(u0, v1 - 0.03, u1 - u0, 0.07, 0, 3, 'woodd', { rim: true });
  const arch = [[v0, 2], [v0 + 0.1, 15], [vm, 23], [v1 - 0.1, 15], [v1, 2]];
  const cls = ['canvas-r', 'canvas-t', 'canvas-t', 'canvas-l'];
  for (let k = 0; k < 4; k++) {
    const [va, za] = arch[k], [vb, zb] = arch[k + 1];
    a.poly([[u0, va, za], [u1, va, za], [u1, vb, zb], [u0, vb, zb]], cls[k], ' fill-opacity=".9"');
  }
  for (const u of [u0, u0 + 0.4, u0 + 0.8, u0 + 1.2, u1]) {
    for (let k = 1; k < 4; k++) a.seg([u, arch[k][0], arch[k][1]], [u, arch[k + 1][0], arch[k + 1][1]], 'k-woodd-l', 0.8);
  }
  a.seg([u0, vm, 23], [u1, vm, 23], 'k-woodd-l', 0.8);
  // pignon (face +u), porte et tuyau du poêle
  a.poly(arch.map(([v, z]) => [u1, v, z]), 'canvas-r', ' fill-opacity=".94"');
  for (let k = 0; k < 4; k++) a.seg([u1, arch[k][0], arch[k][1]], [u1, arch[k + 1][0], arch[k + 1][1]], 'k-woodd-r', 0.9);
  rectU(a, u1, vm - 0.14, vm + 0.14, 2, 14, 'woodd-r');
  if (neige) {
    // la neige pèse sur la toile : une couche épaisse sur les deux pans du dessus, qui déborde au pignon
    a.poly([[u0 - 0.03, arch[1][0] - 0.02, arch[1][1] + 1], [u1 + 0.05, arch[1][0] - 0.02, arch[1][1] + 1], [u1 + 0.05, vm, 26.5], [u0 - 0.03, vm, 26.5]], 'snow-r');
    a.poly([[u0 - 0.03, vm, 26.5], [u1 + 0.05, vm, 26.5], [u1 + 0.05, arch[3][0] + 0.03, arch[3][1] + 1.6], [u0 - 0.03, arch[3][0] + 0.03, arch[3][1] + 1.6]], 'snow-t');
    a.poly([[u1 + 0.05, arch[3][0] + 0.03, arch[3][1] + 1.6], [u1 + 0.05, vm, 26.5], [u1 + 0.05, vm, 23.5], [u1 + 0.05, arch[3][0] + 0.03, arch[3][1] - 1.4]], 'snow-l');
  }
  a.box(u0 + 0.3, vm - 0.04, 0.08, 0.08, 20, 9, 'metal', { rim: true });
  for (const [x, y] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) a.cast(x, y, 2);
  a.cast(u0, vm, 23); a.cast(u1, vm, 23);
  if (neige) {
    // la congère bloque la porte et recouvre les godets ; la marque au-dessus du faîte
    congere(a, u0, u1, v0, v1, 10, 0.24, 5);
    const [mx, my] = P((u0 + u1) / 2, vm, 34);
    marque(a, mx, my, 'neige');
    return a.done(2);
  }
  // ce qui pousse : des godets devant la porte ; mûr : le panier
  if (stade) {
    for (const dv of [-0.2, 0, 0.2]) {
      const [x, y] = P(u1 + 0.14, vm + dv);
      a.raw(`<polygon points="${pts([[x - 3, y - 4], [x + 3, y - 4], [x + 2.2, y], [x - 2.2, y]])}" class="soilr-l"/>${plant(stade === 'mure' ? 'pousse' : stade, x, y - 4, 'chou')}`);
      a.ext(x - 8, y - 14); a.ext(x + 8, y + 2);
    }
  }
  if (stade === 'mure') {
    const [bx, by] = P(u1 + 0.1, v1 + 0.12);
    a.raw(panier(bx, by, 1.05));
    a.ext(bx - 12, by - 24); a.ext(bx + 12, by + 4);
  }
  return a.done(2);
}

/**
 * Éolienne, emprise 1 × 1 : mât, nacelle et rotor à trois pales (tourne quand l'île est éveillée). degat 'panne' (lot I) :
 * le rotor est arrêté, une pale cassée net, la trappe de la nacelle ouverte, et la marque braise au pied du mât. degat
 * 'neige' (lot H) : le rotor arrêté, de la neige sur la nacelle et le moyeu, une congère au pied du mât, la marque (pelle).
 */
export function eolienne(degat = '') {
  const panne = degat === 'panne', neige = degat === 'neige';
  const a = new Art();
  a.box(0.3, 0.3, 0.4, 0.4, 0, 3, 'stoned', { rim: true });
  a.prism(0.5, 0.5, 0.07, 3, 62, 'metal', 6);
  a.box(0.42, 0.36, 0.16, 0.3, 64, 6, 'metal', { rim: true });
  if (neige) a.box(0.41, 0.35, 0.18, 0.32, 70, 2.2, 'snow'); // un chapeau de neige sur la nacelle
  if (panne) a.poly([[0.58, 0.42, 65], [0.58, 0.56, 65], [0.58, 0.56, 69], [0.58, 0.42, 69]], 'wooddk-r'); // trappe ouverte
  const [hx, hy] = P(0.5, 0.68, 67);
  let blades = '';
  for (let k = 0; k < 3; k++) {
    const t = (k / 3) * Math.PI * 2 - Math.PI / 2 + (panne ? 0.5 : 0);
    const c = Math.cos(t), s = Math.sin(t), L = panne && k === 2 ? 12 : 30, W = 3.2;
    const tip = [hx + c * L, hy + s * L];
    const p1 = [hx - s * W, hy + c * W], p2 = [hx + c * L * 0.3 - s * W * 1.1, hy + s * L * 0.3 + c * W * 1.1];
    // pale cassée : un bout franc, en dents, au lieu de la pointe
    const bout = panne && k === 2 ? [[tip[0] - s * 2.6, tip[1] + c * 2.6], [tip[0] + c * 2, tip[1] + s * 2], tip] : [tip];
    blades += `<polygon points="${pts([p1, p2, ...bout, [hx + s * 1, hy - c * 1]])}" class="${k === 1 ? 'metal-r' : 'metal-l'}"/>`;
  }
  a.raw(`<g${panne || neige ? '' : ' class="ow-rotor"'} style="transform-origin:${f(hx)}px ${f(hy)}px">${blades}<circle cx="${f(hx)}" cy="${f(hy)}" r="3.2" class="${neige ? 'snow-t' : 'tech-t'}"/></g>`);
  a.ext(hx - 31, hy - 31); a.ext(hx + 31, hy + 31);
  if (neige) {
    // rotor pris dans la glace, la neige monte au pied du mât ; la marque braise (une pelle) à côté
    congere(a, 0.3, 0.7, 0.3, 0.7, 9, 0.22, 3);
    const [mx, my] = P(0.22, 0.86, 8);
    marque(a, mx, my, 'neige');
  }
  if (panne) {
    // le bout de pale tombé au pied du mât
    a.poly([[0.74, 0.5, 0.6], [0.98, 0.62, 0.6], [0.98, 0.7, 0.6], [0.76, 0.58, 0.6]], 'metal-t');
    const [mx, my] = P(0.22, 0.86, 8);
    marque(a, mx, my, 'panne');
  }
  a.castS(hx, hy, 67); a.cast(0.45, 0.45, 0); a.cast(0.55, 0.55, 0);
  return a.done(2);
}

/** Grenier, emprise 2 × 2 : grange de planches, grande porte et porte de fenil sur le pignon. */
export function grenier() {
  const a = new Art();
  const u = 0.25, v = 0.3, du = 1.45, dv = 1.25, H = 22;
  a.box(u - 0.06, v - 0.06, du + 0.12, dv + 0.12, 0, 3, 'stoned', { rim: true });
  a.box(u, v, du, dv, 3, H - 3, 'woodb', { top: false });
  for (let uu = u + 0.11; uu < u + du - 0.04; uu += 0.11) a.seg([uu, v + dv, 3.5], [uu, v + dv, H], 'k-woodd-l', 0.6, ' opacity=".45"');
  for (let vv = v + 0.11; vv < v + dv - 0.04; vv += 0.11) a.seg([u + du, vv, 3.5], [u + du, vv, H], 'k-woodd-r', 0.6, ' opacity=".45"');
  const V = v + dv, U = u + du, vm = v + dv / 2;
  rectV(a, V, u + 0.25, u + 0.5, 11, 16, 'win');
  rectV(a, V, u + 0.95, u + 1.2, 11, 16, 'win');
  // grande porte à deux battants, écharpes en X
  rectU(a, U, vm - 0.36, vm + 0.36, 3, 16, 'woodd-r');
  a.seg([U, vm, 3], [U, vm, 16], 'k-wooddk-r', 1);
  for (const [a0, a1] of [[vm - 0.36, vm], [vm, vm + 0.36]]) {
    a.seg([U, a0, 3.5], [U, a1, 15.5], 'k-woodb-r', 1.1);
    a.seg([U, a0, 15.5], [U, a1, 3.5], 'k-woodb-r', 1.1);
  }
  roofU(a, u, v, du, dv, H, 20, 'roofb', 'woodb', 0.1, () => {
    // porte de fenil, foin qui dépasse
    rectU(a, U, vm - 0.16, vm + 0.16, H + 2, H + 9, 'hay-r');
    a.seg([U, vm - 0.16, H + 9], [U, vm + 0.16, H + 9], 'k-woodd-r', 1.2);
  });
  a.box(U + 0.08, v + 0.1, 0.22, 0.22, 0, 5, 'hay', { rim: true }); // botte de foin
  a.anchor('light', u + 0.37, V + 0.03, 14);
  return a.done(3);
}

// ---------------------------------------------------------------- rang Village (lot B), sur la bande du Hameau

/**
 * Tour de guet, emprise 0,9 × 0,9 : quatre pieds de bois croisés de Saint-André, une échelle sur la face +v, la
 * plateforme et sa guérite au toit en pointe, plus haute que la lisière ; une lanterne y veille la nuit, un fanion au faîte.
 */
export function tour() {
  const a = new Art();
  const u0 = 0.2, u1 = 0.7, Z = 50; // pieds sur un carré de 0,5 ; plateforme à 50 px
  a.box(0.12, 0.12, 0.66, 0.66, 0, 3, 'stoned', { rim: true });
  const pied = (u, v) => a.box(u - 0.035, v - 0.035, 0.07, 0.07, 3, Z - 3, 'woodd');
  pied(u0, u0);
  pied(u1, u0);
  pied(u0, u1);
  // croix de Saint-André sur les deux faces visibles, en deux étages
  for (const [z0, z1] of [[7, 28.5], [28.5, Z]]) {
    a.seg([u0, u1 + 0.04, z0], [u1, u1 + 0.04, z1], 'k-woodd-l', 1.4);
    a.seg([u0, u1 + 0.04, z1], [u1, u1 + 0.04, z0], 'k-woodd-l', 1.4);
    a.seg([u1 + 0.04, u0, z0], [u1 + 0.04, u1, z1], 'k-woodd-r', 1.4);
    a.seg([u1 + 0.04, u0, z1], [u1 + 0.04, u1, z0], 'k-woodd-r', 1.4);
  }
  a.seg([u0, u1 + 0.04, 28.5], [u1, u1 + 0.04, 28.5], 'k-woodd-l', 1.2); // moise du milieu
  a.seg([u1 + 0.04, u0, 28.5], [u1 + 0.04, u1, 28.5], 'k-woodd-r', 1.2);
  pied(u1, u1);
  // échelle sur la face +v, du sol à la plateforme
  const ev = u1 + 0.1;
  a.seg([0.36, ev, 0], [0.36, ev, Z + 2], 'k-woodb-l', 1.2);
  a.seg([0.5, ev, 0], [0.5, ev, Z + 2], 'k-woodb-l', 1.2);
  for (let z = 4; z < Z; z += 5) a.seg([0.36, ev, z], [0.5, ev, z], 'k-woodb-l', 0.9);
  // plateforme, garde-corps du fond, guérite
  a.box(0.08, 0.08, 0.74, 0.74, Z, 2.5, 'woodb', { rim: true });
  const g0 = 0.13, g1 = 0.77, zg = Z + 2.5, hp = 6, zt = Z + 17;
  a.box(g0, g0, g1 - g0, 0.04, zg, hp, 'woodd'); // parapet du fond
  a.box(g0, g0, 0.04, g1 - g0, zg, hp, 'woodd');
  for (const [pu, pv] of [[g0, g0], [g1 - 0.04, g0], [g0, g1 - 0.04]]) a.box(pu, pv, 0.04, 0.04, zg, zt - zg, 'wooddk');
  // la lanterne pendue au milieu de la guérite (allumée la nuit, world.js)
  a.seg([0.45, 0.45, zt], [0.45, 0.45, zg + 9.5], 'k-wooddk-l', 0.7);
  a.box(0.42, 0.42, 0.06, 0.06, zg + 5.5, 4, 'lampg', { cast: false });
  a.box(g0, g1 - 0.04, g1 - g0, 0.04, zg, hp, 'woodd'); // parapets de devant
  a.box(g1 - 0.04, g0, 0.04, g1 - g0, zg, hp, 'woodd');
  a.seg([g0, g1, zg + hp - 0.2], [g1, g1, zg + hp - 0.2], 'k-woodb-l', 1); // main courante
  a.seg([g1, g0, zg + hp - 0.2], [g1, g1, zg + hp - 0.2], 'k-woodb-r', 1);
  a.box(g1 - 0.04, g1 - 0.04, 0.04, 0.04, zg, zt - zg, 'wooddk');
  // toit en pointe : pans du fond, puis +u et +v
  const e0 = 0.04, e1 = 0.86, ap = [0.45, 0.45, zt + 15];
  a.poly([[e0, e0, zt], [e1, e0, zt], ap], 'roofb-r');
  a.poly([[e0, e0, zt], [e0, e1, zt], ap], 'roofb-r');
  a.poly([[e1, e0, zt], [e1, e1, zt], ap], 'roofb-l');
  a.poly([[e0, e1, zt], [e1, e1, zt], ap], 'roofb-t');
  // fanion au faîte
  a.seg(ap, [ap[0], ap[1], ap[2] + 9], 'k-wooddk-l', 1);
  a.poly([[ap[0], ap[1], ap[2] + 9], [ap[0], ap[1], ap[2] + 5], [ap[0] + 0.2, ap[1], ap[2] + 7.4]], 'paper-l');
  for (const [cu, cv] of [[0.16, 0.16], [0.74, 0.16], [0.74, 0.74], [0.16, 0.74]]) a.cast(cu, cv, 0);
  a.cast(0.45, 0.45, zt + 15);
  const r = a.done(3);
  r.anchors.light = P(0.45, 0.45, zg + 7.5);
  return r;
}

/**
 * Scierie, emprise 1,8 × 1 : un appentis de planches au toit d'une seule pente, le banc de sciage et sa lame ronde qui sort
 * du banc, une bille en travers ; à côté, la pile de rondins tirés de la lisière et des planches sciées.
 */
export function scierie() {
  const a = new Art();
  const u0 = 0.12, u1 = 1.14, v0 = 0.14, v1 = 0.84, zb = 25, zf = 17;
  a.box(0.06, 0.1, 1.14, 0.8, 0, 2, 'stoned', { rim: true });
  // mur du fond en planches, poteaux du fond
  a.box(u0, v0, u1 - u0, 0.06, 2, zb - 2, 'woodd', { top: false });
  for (let uu = u0 + 0.1; uu < u1 - 0.04; uu += 0.1) a.seg([uu, v0 + 0.06, 2.5], [uu, v0 + 0.06, zb], 'k-wooddk-l', 0.6, ' opacity=".45"');
  a.box(u0, v0, 0.06, v1 - v0, 2, zf - 2, 'woodd', { top: false }); // mur de gauche, à mi-hauteur de la pente
  // banc de sciage, la bille en travers, la lame
  a.box(0.3, 0.4, 0.7, 0.26, 2, 7, 'woodb', { rim: true });
  buche(a, 0.34, 0.6, 0.53, 12.2);
  // la lame : demi-disque dressé dans le plan u-z, rayon 6,5 px (une case le long de u fait 35,8 px à l'écran)
  const R = 6.5, k = R / 35.8;
  a.poly(Array.from({ length: 8 }, (_, i) => [0.74 + Math.cos((i / 7) * Math.PI) * k, 0.53, 9 + Math.sin((i / 7) * Math.PI) * R]), 'metal-l');
  a.seg([0.74 - k, 0.53, 9.2], [0.74 + k, 0.53, 9.2], 'k-stoned-l', 0.8);
  // un tas de sciure au pied du banc
  a.poly([[0.62, 0.68, 2], [0.86, 0.68, 2], [0.76, 0.74, 4.6]], 'hay-l');
  // poteaux de devant, puis le toit
  for (const pu of [u0, u1 - 0.06]) a.box(pu, v1 - 0.06, 0.06, 0.06, 2, zf - 2, 'woodd');
  a.box(u1 - 0.06, v0, 0.06, 0.06, 2, zb - 2, 'woodd');
  const r0 = u0 - 0.07, r1 = u1 + 0.07, w0 = v0 - 0.07, w1 = v1 + 0.1;
  a.poly([[r0, w0, zb + 1.6], [r1, w0, zb + 1.6], [r1, w1, zf + 1.6], [r0, w1, zf + 1.6]], 'roofb-t');
  a.poly([[r0, w1, zf + 1.6], [r1, w1, zf + 1.6], [r1, w1, zf], [r0, w1, zf]], 'roofb-l');
  a.poly([[r1, w0, zb + 1.6], [r1, w1, zf + 1.6], [r1, w1, zf], [r1, w0, zb]], 'roofb-r');
  for (const [a0, a1] of [[r0, r1]]) for (let vv = w0 + 0.16; vv < w1; vv += 0.16) a.seg([a0, vv, zb + 1.7 - ((vv - w0) / (w1 - w0)) * (zb - zf)], [a1, vv, zb + 1.7 - ((vv - w0) / (w1 - w0)) * (zb - zf)], 'k-roofb-r', 0.5, ' opacity=".35"');
  // la pile de rondins, bouts coupés vers +u
  for (const [vc, zc] of [[0.26, 3.2], [0.43, 3.2], [0.6, 3.2], [0.345, 9.1], [0.515, 9.1], [0.43, 15]]) buche(a, 1.26, 1.72, vc, zc);
  // planches sciées, devant la pile
  a.box(1.24, 0.78, 0.46, 0.15, 0, 1.8, 'woodb', { rim: true });
  a.box(1.27, 0.79, 0.42, 0.13, 1.8, 1.8, 'woodb', { rim: true });
  for (const [cu, cv] of [[0.06, 0.1], [1.74, 0.16], [1.74, 0.94], [0.06, 0.94]]) a.cast(cu, cv, 0);
  a.cast(u0, v0, zb); a.cast(u1, v0, zb);
  return a.done(3);
}

// Poule de profil, pattes au point (u, v) ; dir : 1 tournée vers la droite de l'écran, -1 vers la gauche. m : plumage.
function poule(a, u, v, dir = 1, m = 'paper') {
  const [x, y] = P(u, v, 0);
  const X = (dx) => f(x + dx * dir);
  const pt = (l) => l.map(([dx, dy]) => `${X(dx)},${f(y + dy)}`).join(' ');
  a.raw(`<line x1="${X(-0.6)}" y1="${f(y - 1)}" x2="${X(-0.6)}" y2="${f(y + 0.6)}" class="k-gold-l" stroke-width=".8"/>`
    + `<line x1="${X(0.9)}" y1="${f(y - 1)}" x2="${X(0.9)}" y2="${f(y + 0.6)}" class="k-gold-l" stroke-width=".8"/>`
    + `<polygon points="${pt([[-3.8, -2.2], [-4.8, -7], [-2.4, -4.8], [1.2, -5.4], [3, -3.2], [1.6, -0.8], [-2, -0.8]])}" class="${m}-l"/>`
    + `<polygon points="${pt([[-4.8, -7], [-2.4, -4.8], [-3.4, -3.4]])}" class="${m}-r"/>`
    + `<circle cx="${X(2.5)}" cy="${f(y - 6.6)}" r="1.8" class="${m}-t"/>`
    + `<circle cx="${X(2.2)}" cy="${f(y - 8.5)}" r=".95" class="maple-t"/>`
    + `<polygon points="${pt([[4.1, -7], [5.6, -6.4], [4.1, -5.9]])}" class="gold-t"/>`);
  a.ext(x - 6, y - 10); a.ext(x + 6, y + 1);
}

// Grillage : un pan de l'enclos entre (ua, va) et (ub, vb), haut de h px, mailles en losange (traits fins, à demi
// transparents : on voit les poules à travers).
function grillage(a, ua, va, ub, vb, h, face) {
  const n = Math.max(2, Math.round(Math.hypot(ub - ua, vb - va) / 0.09));
  const at = (k) => [ua + ((ub - ua) * k) / n, va + ((vb - va) * k) / n];
  for (let k = 0; k < n; k++) {
    const [p, q] = [at(k), at(k + 1)];
    a.seg([p[0], p[1], 0.6], [q[0], q[1], h], `k-stoned-${face}`, 0.45, ' opacity=".6"');
    a.seg([p[0], p[1], h], [q[0], q[1], 0.6], `k-stoned-${face}`, 0.45, ' opacity=".6"');
  }
  a.seg([ua, va, h], [ub, vb, h], `k-woodd-${face}`, 0.9);
}

/**
 * Poulailler, emprise 1,15 × 0,95 : un cabanon de planches sur pilotis, sa trappe et sa rampe à tasseaux, l'enclos
 * grillagé à côté ; trois poules, deux blanches et une rousse.
 */
export function poulailler() {
  const a = new Art();
  const u = 0.1, v = 0.2, du = 0.46, dv = 0.52, z0 = 4, H = 11;
  const e0 = 0.6, e1 = 1.08, f0 = 0.12, f1 = 0.88, hg = 8; // enclos
  // piquets et grillage du fond de l'enclos
  for (const [pu, pv] of [[e0, f0], [e1, f0]]) a.box(pu - 0.025, pv - 0.025, 0.05, 0.05, 0, hg + 1, 'woodd');
  grillage(a, e0, f0, e1, f0, hg, 'l');
  // cabanon sur pilotis
  for (const [pu, pv] of [[u + 0.04, v + 0.04], [u + du - 0.04, v + 0.04], [u + 0.04, v + dv - 0.04], [u + du - 0.04, v + dv - 0.04]]) a.box(pu - 0.025, pv - 0.025, 0.05, 0.05, 0, z0, 'wooddk');
  a.box(u, v, du, dv, z0, H, 'woodb', { top: false });
  for (let uu = u + 0.08; uu < u + du - 0.03; uu += 0.08) a.seg([uu, v + dv, z0 + 0.4], [uu, v + dv, z0 + H], 'k-woodd-l', 0.5, ' opacity=".45"');
  rectV(a, v + dv, u + 0.12, u + 0.3, z0 + 5, z0 + 8.6, 'win');
  rectU(a, u + du, v + 0.18, v + 0.34, z0 + 0.6, z0 + 5.6, 'wooddk-r'); // trappe
  roofU(a, u, v, du, dv, z0 + H, 9, 'roof', 'woodb', 0.07);
  // rampe à tasseaux, de la trappe au sol de l'enclos
  const r0 = v + 0.18, r1 = v + 0.34, ub = u + du, ue = u + du + 0.3;
  a.poly([[ub, r0, z0 + 0.6], [ub, r1, z0 + 0.6], [ue, r1, 0.4], [ue, r0, 0.4]], 'woodb-t');
  for (let k = 1; k < 4; k++) { const uu = ub + (ue - ub) * k / 4, zz = z0 + 0.6 - (z0 + 0.2) * k / 4; a.seg([uu, r0, zz + 0.3], [uu, r1, zz + 0.3], 'k-woodd-t', 0.7); }
  // les poules : une sur la rampe, deux dans l'enclos
  poule(a, u + du + 0.12, v + 0.27, 1, 'hay');
  poule(a, 0.86, 0.42, -1);
  poule(a, 0.95, 0.66, 1);
  // pans de devant de l'enclos
  grillage(a, e1, f0, e1, f1, hg, 'r');
  grillage(a, e0, f1, e1, f1, hg, 'l');
  for (const [pu, pv] of [[e0, f1], [e1, f1]]) a.box(pu - 0.025, pv - 0.025, 0.05, 0.05, 0, hg + 1, 'woodd');
  for (const [cu, cv] of [[u, v], [u + du, v], [u + du, v + dv], [u, v + dv]]) a.cast(cu, cv, 0);
  a.cast(u + du / 2, v + dv / 2, z0 + H + 9);
  return a.done(3);
}

/**
 * Cabane à sucre, emprise 1,4 × 1,1 : bois rond foncé, toit à deux pans et son lanterneau le long du faîtage (d'où sort la
 * vapeur de l'évaporateur), le tuyau du poêle, une corde de bois contre le pignon et un tonneau d'eau d'érable. etat
 * 'sucres' : au temps des sucres, la vapeur sort du lanterneau (anchors.vapeur : la fumée de l'île en bouffées plus grosses
 * et ombrées, lisibles sur la neige et les arbres blancs ; scene.js).
 */
export function cabane(etat = '') {
  const a = new Art();
  const u = 0.1, v = 0.2, du = 0.92, dv = 0.7, H = 14;
  a.box(u - 0.05, v - 0.05, du + 0.1, dv + 0.1, 0, 2.5, 'stoned', { rim: true });
  a.box(u, v, du, dv, 2.5, H - 2.5, 'woodd', { top: false });
  for (let z = 4.6; z < H - 0.4; z += 2.3) {
    a.seg([u, v + dv, z], [u + du, v + dv, z], 'k-woodb-l', 0.8, ' opacity=".5"');
    a.seg([u + du, v, z], [u + du, v + dv, z], 'k-woodb-r', 0.8, ' opacity=".5"');
  }
  const V = v + dv;
  rectV(a, V, u + 0.12, u + 0.3, 2.5, 11, 'wooddk-l'); // porte
  rectV(a, V, u + 0.58, u + 0.78, 6.5, 10.5, 'win');
  rectU(a, u + du, v + 0.24, v + 0.46, 6.5, 10.5, 'win');
  const vm = v + dv / 2, zr = H + 12;
  roofU(a, u, v, du, dv, H, 12, 'roofb', 'woodd', 0.09, () => {
    // tuyau du poêle de l'évaporateur, sur le pan du fond
    a.prism(u + du - 0.2, v + 0.2, 0.045, H + 5, 17, 'metal', 6, { cast: false });
    a.prism(u + du - 0.2, v + 0.2, 0.07, H + 21, 1.6, 'wooddk', 6, { cast: false });
  });
  // lanterneau : une petite caisse à claire-voie sur le faîtage, son propre toit
  const l0 = u + 0.24, l1 = u + 0.74;
  a.box(l0, vm - 0.09, l1 - l0, 0.18, zr - 1.5, 5, 'woodd', { top: false });
  for (let uu = l0 + 0.07; uu < l1 - 0.02; uu += 0.07) a.seg([uu, vm + 0.09, zr - 0.6], [uu, vm + 0.09, zr + 3], 'k-wooddk-l', 0.9);
  roofU(a, l0, vm - 0.09, l1 - l0, 0.18, zr + 3.5, 4, 'roofb', 'woodd', 0.05);
  // corde de bois contre le pignon (+u)
  for (const [vc, zc] of [[v + 0.14, 3.2], [v + 0.31, 3.2], [v + 0.48, 3.2], [v + 0.225, 9.1], [v + 0.395, 9.1]]) buche(a, u + du + 0.04, u + du + 0.3, vc, zc);
  // tonneau d'eau d'érable devant la porte, cerclé
  a.prism(u + 0.44, V + 0.12, 0.075, 0, 7.5, 'woodb', 8, { rim: true });
  a.seg([u + 0.37, V + 0.19, 1.8], [u + 0.51, V + 0.19, 1.8], 'k-wooddk-l', 0.8);
  a.seg([u + 0.37, V + 0.19, 5.8], [u + 0.51, V + 0.19, 5.8], 'k-wooddk-l', 0.8);
  const r = a.done(3);
  r.anchors.light = P(u + 0.68, V + 0.03, 8.5);
  if (etat === 'sucres') r.anchors.vapeur = P(u + 0.49, vm, zr + 8);
  return r;
}

/** Hauteur (en cases) de l'emprise du quai quand le marchand y est amarré : le chaland est dans la zone de toucher. */
export const QUAI_MARCHAND_H = 1.55;

// Chaland solaire du marchand (lot V), amarré le long de la face +v du quai, du côté du large : coque plate, cabine
// couverte de panneaux solaires à l'arrière, caisses et paniers sur le pont avant, un fanion à la proue. Dans un
// groupe .ow-barge : il se balance sur l'eau quand l'île est éveillée (world.css), jamais en mouvement réduit.
function chaland(a) {
  const u0 = -0.04, du = 0.98, v0 = 1.02, dv = 0.46, H = 6;
  const u1 = u0 + du, v1 = v0 + dv;
  a.raw('<g class="ow-barge">');
  a.box(u0, v0, du, dv, -1, H, 'woodd', { rim: true, cast: false });
  a.seg([u0, v1, 2.6], [u1, v1, 2.6], 'k-woodb-l', 1.1); // listel clair sur le flanc
  a.seg([u1, v0, 2.6], [u1, v1, 2.6], 'k-woodb-r', 1.1);
  a.box(u0 + 0.05, v0 + 0.05, du - 0.1, dv - 0.1, H - 1, 1.6, 'woodb', { cast: false }); // pont
  for (let vv = v0 + 0.14; vv < v1 - 0.06; vv += 0.1) a.seg([u0 + 0.05, vv, H + 0.7], [u1 - 0.05, vv, H + 0.7], 'k-woodd-t', 0.5, ' opacity=".5"');
  // cabine à l'arrière : poteaux du fond, banquette, poteaux de devant, toit solaire incliné vers le large
  const c0 = u0 + 0.05, c1 = u0 + 0.46, w0 = v0 + 0.06, w1 = v1 - 0.06, zt = 25, zb = 22.5;
  a.seg([c0, w0, H], [c0, w0, zt], 'k-wooddk-l', 1.3);
  a.seg([c1, w0, H], [c1, w0, zt], 'k-wooddk-r', 1.3);
  a.box(c0 + 0.04, w0 + 0.04, 0.3, 0.14, H + 0.6, 5, 'woodd', { rim: true, cast: false });
  a.box(c0 + 0.05, w0 + 0.2, 0.15, 0.13, H + 0.6, 7, 'woodb', { rim: true, cast: false }); // caisse sous l'abri
  a.seg([c0, w1, H], [c0, w1, zb], 'k-wooddk-l', 1.3);
  a.seg([c1, w1, H], [c1, w1, zb], 'k-wooddk-l', 1.3);
  a.poly([[c0 - 0.03, w1 + 0.03, zb], [c1 + 0.03, w1 + 0.03, zb], [c1 + 0.03, w1 + 0.03, zb - 1.6], [c0 - 0.03, w1 + 0.03, zb - 1.6]], 'metal-l');
  a.poly([[c1 + 0.03, w0 - 0.03, zt], [c1 + 0.03, w1 + 0.03, zb], [c1 + 0.03, w1 + 0.03, zb - 1.6], [c1 + 0.03, w0 - 0.03, zt - 1.6]], 'metal-r');
  a.poly([[c0 - 0.03, w0 - 0.03, zt], [c1 + 0.03, w0 - 0.03, zt], [c1 + 0.03, w1 + 0.03, zb], [c0 - 0.03, w1 + 0.03, zb]], 'panel-t');
  const zAt = (vv) => zt + (zb - zt) * ((vv - (w0 - 0.03)) / (w1 - w0 + 0.06));
  for (const uu of [c0 + 0.13, c0 + 0.27]) a.seg([uu, w0 - 0.03, zt], [uu, w1 + 0.03, zb], 'k-glass-t', 0.6, ' opacity=".7"');
  const vm = (w0 + w1) / 2;
  a.seg([c0 - 0.03, vm, zAt(vm)], [c1 + 0.03, vm, zAt(vm)], 'k-glass-t', 0.6, ' opacity=".7"');
  // pont avant : caisses et paniers, du fond vers le devant
  a.box(c1 + 0.08, v0 + 0.07, 0.17, 0.15, H + 0.6, 8, 'woodb', { rim: true, cast: false });
  a.seg([c1 + 0.08, v0 + 0.22, H + 4.6], [c1 + 0.25, v0 + 0.22, H + 4.6], 'k-woodd-l', 0.6);
  a.prism(c1 + 0.39, v0 + 0.15, 0.075, H + 0.6, 6.5, 'hay', 7, { rim: true, cast: false });
  a.prism(c1 + 0.17, v1 - 0.13, 0.08, H + 0.6, 6, 'hay', 7, { rim: true, cast: false });
  a.box(c1 + 0.3, v1 - 0.24, 0.15, 0.15, H + 0.6, 6, 'woodb', { rim: true, cast: false });
  a.prism(c1 + 0.38, v1 - 0.17, 0.05, H + 6.6, 3, 'squash', 6, { cast: false }); // courges sur la caisse
  // mât et fanion à la proue
  const mu = u1 - 0.07, mv = v0 + dv / 2;
  a.seg([mu, mv, H], [mu, mv, 36], 'k-wooddk-r', 1.3);
  a.poly([[mu, mv, 36], [mu + 0.3, mv, 32.5], [mu, mv, 29]], 'gold-l');
  a.raw('</g>');
}

/** Largeur (en cases) de l'emprise du quai quand un visiteur à commande y est amarré : son bateau est dans la zone de toucher. */
export const QUAI_BATEAU_W = 1.9;

// Bateaux des visiteurs à commande (lot C), amarrés au bout du quai, dans le prolongement du chaland, la proue vers +u.
// Dessinés avec le quai, après le chaland (ils sont devant lui). Coque : flanc +v à mi-ombre, proue à l'ombre, pont cerné
// d'un plat-bord, un listel sur le flanc. Zone u 1,12 à 1,84, v 1,1 à 1,44 : à l'écart de la plaque du quartier.
const B0 = { u: 1.12, v: 1.1, L: 0.72, W: 0.34 };
function coque(a, H, m, pont, listel) {
  const { u: u0, v: v0, L, W } = B0;
  const u1 = u0 + L, ub = u1 - 0.18, v1 = v0 + W, vm = v0 + W / 2, i = 0.035;
  a.poly([[u0, v1, -1], [ub, v1, -1], [ub, v1, H], [u0, v1, H]], `${m}-l`);
  a.poly([[ub, v1, -1], [u1, vm, -1], [u1, vm, H], [ub, v1, H]], `${m}-r`);
  a.poly([[u0, v0, H], [ub, v0, H], [u1, vm, H], [ub, v1, H], [u0, v1, H]], `${m}-t rim`);
  a.poly([[u0 + i, v0 + i, H + 0.3], [ub, v0 + i, H + 0.3], [u1 - 2 * i, vm, H + 0.3], [ub, v1 - i, H + 0.3], [u0 + i, v1 - i, H + 0.3]], `${pont}-t`);
  a.seg([u0, v1, H - 2], [ub, v1, H - 2], `k-${listel}-l`, 1.2);
  a.seg([ub, v1, H - 2], [u1, vm, H - 2], `k-${listel}-r`, 1.2);
}
// fanion au bout d'un mât court, à la proue (il flotte vers +u, comme celui du chaland)
function fanion(a, H, m) {
  const mu = B0.u + B0.L - 0.13, mv = B0.v + B0.W / 2;
  a.seg([mu, mv, H], [mu, mv, H + 20], 'k-wooddk-r', 1.1);
  a.poly([[mu, mv, H + 20], [mu + 0.2, mv, H + 17.5], [mu, mv, H + 15]], `${m}-l`);
}
// paniers de Nourriture à bord : la commande livrée (s : distance depuis la poupe)
function paniers(a, z, s) {
  const u = B0.u + s, v = B0.v;
  a.prism(u + 0.05, v + 0.1, 0.055, z, 5, 'hay', 7, { rim: true, cast: false });
  a.prism(u + 0.06, v + 0.24, 0.055, z, 4.5, 'hay', 7, { rim: true, cast: false });
  a.prism(u + 0.17, v + 0.17, 0.055, z, 5, 'hay', 7, { rim: true, cast: false });
  a.prism(u + 0.17, v + 0.17, 0.032, z + 5, 2.5, 'squash', 6, { cast: false });
}

// Le convoi : remorqueur vert, timonerie crème à la poupe, deux piles de bois d'œuvre sanglées sur le pont.
function convoi(a, livree) {
  const H = 5, z = H + 0.3, u = B0.u, v = B0.v;
  coque(a, H, 'roofb', 'woodd', 'woodb');
  a.box(u + 0.04, v + 0.06, 0.18, 0.22, z, 10, 'metal', { cast: false });
  rectU(a, u + 0.22, v + 0.09, v + 0.25, z + 5, z + 8.5, 'win');
  rectV(a, v + 0.28, u + 0.07, u + 0.19, z + 5, z + 8.5, 'win');
  a.box(u + 0.02, v + 0.04, 0.22, 0.26, z + 10, 1.6, 'roofb', { rim: true, cast: false });
  a.prism(u + 0.09, v + 0.12, 0.03, z + 11.6, 5, 'wooddk', 6, { cast: false }); // cheminée
  if (livree) paniers(a, z, 0.27);
  else {
    for (const [s0, ds, t0, dt, h] of [[0.26, 0.17, 0.06, 0.22, 7], [0.45, 0.11, 0.09, 0.16, 5]]) {
      a.box(u + s0, v + t0, ds, dt, z, h, 'woodb', { rim: true, cast: false });
      for (let k = 1.6; k < h; k += 1.8) a.seg([u + s0, v + t0 + dt, z + k], [u + s0 + ds, v + t0 + dt, z + k], 'k-woodd-l', 0.5, ' opacity=".55"');
      a.seg([u + s0 + ds / 2, v + t0, z + h], [u + s0 + ds / 2, v + t0 + dt, z + h], 'k-amber-t', 1); // sangle
      a.seg([u + s0 + ds / 2, v + t0 + dt, z], [u + s0 + ds / 2, v + t0 + dt, z + h], 'k-amber-l', 1);
    }
  }
  fanion(a, H, 'amber');
}

// La famille du Sud : voilier crème, voile ferlée sur la bôme ; à bord, des malles, une valise et une plante en pot.
// Livrée, la famille a débarqué : le pont est vide.
function famille(a, livree) {
  const H = 4.5, z = H + 0.3, u = B0.u, v = B0.v, vm = v + B0.W / 2;
  coque(a, H, 'metal', 'woodb', 'roof');
  if (!livree) {
    a.box(u + 0.25, v + 0.07, 0.1, 0.12, z, 5.5, 'woodd', { rim: true, cast: false }); // malle
    a.seg([u + 0.35, v + 0.07, z + 2.5], [u + 0.35, v + 0.19, z + 2.5], 'k-gold-r', 0.9);
    a.box(u + 0.26, v + 0.2, 0.09, 0.1, z, 4, 'amber', { rim: true, cast: false }); // seconde malle
    a.box(u + 0.44, v + 0.1, 0.13, 0.07, z, 3.5, 'roofb', { rim: true, cast: false }); // valise
    a.prism(u + 0.5, v + 0.24, 0.035, z, 3.5, 'soil', 6, { cast: false }); // plante en pot
    ball(a, ...P(u + 0.5, v + 0.24, z + 7), 4.2, 'leaf', rng(7));
  }
  // mât, bôme vers la poupe et voile ferlée dessus, étai jusqu'à la proue, flamme verte en tête
  const mu = u + 0.4;
  a.seg([mu, vm, z], [mu, vm, 38], 'k-wooddk-r', 1.3);
  a.seg([mu, vm, z + 9], [u + 0.08, vm, z + 11], 'k-wooddk-l', 1.1);
  a.poly([[mu - 0.02, vm + 0.02, z + 9.5], [u + 0.12, vm + 0.02, z + 11.5], [u + 0.12, vm + 0.02, z + 13.5], [mu - 0.02, vm + 0.02, z + 12]], 'canvas-l rim');
  a.seg([mu, vm, 38], [u + B0.L - 0.04, vm, H], 'k-rope-t', 0.6, ' opacity=".8"');
  a.poly([[mu, vm, 38], [mu + 0.16, vm, 36], [mu, vm, 34]], 'roof-l');
}

// La scientifique : vedette blanche, cabine vitrée coiffée d'un panneau solaire, mât d'instruments (anémomètre, girouette),
// et à la poupe un portique d'où pend une sonde jaune. Livrée : des paniers sur la plage avant.
function scientifique(a, livree) {
  const H = 5, z = H + 0.3, u = B0.u, v = B0.v;
  coque(a, H, 'metal', 'stone', 'tech');
  // portique de prélèvement, à la poupe
  const p0 = u + 0.05;
  a.seg([p0, v + 0.05, z], [p0, v + 0.05, z + 13], 'k-wooddk-r', 1.2);
  a.seg([p0, v + 0.29, z], [p0, v + 0.29, z + 13], 'k-wooddk-l', 1.2);
  a.seg([p0, v + 0.05, z + 13], [p0, v + 0.29, z + 13], 'k-wooddk-l', 1.4);
  a.seg([p0, v + 0.17, z + 13], [p0, v + 0.17, z + 5], 'k-rope-t', 0.7);
  a.prism(p0, v + 0.17, 0.035, z + 2, 3, 'gold', 6, { rim: true, cast: false }); // sonde
  // cabine vitrée
  const c0 = u + 0.13, cv0 = v + 0.05, du = 0.26, dv = 0.24;
  a.box(c0, cv0, du, dv, z, 9, 'metal', { cast: false });
  rectU(a, c0 + du, cv0 + 0.03, cv0 + dv - 0.03, z + 4.5, z + 8, 'glass-r');
  rectV(a, cv0 + dv, c0 + 0.03, c0 + du - 0.03, z + 4.5, z + 8, 'glass-l');
  a.box(c0 - 0.02, cv0 - 0.02, du + 0.04, dv + 0.04, z + 9, 1.2, 'metal', { cast: false });
  a.poly([[c0, cv0, z + 10.6], [c0 + du, cv0, z + 10.6], [c0 + du, cv0 + dv, z + 10.6], [c0, cv0 + dv, z + 10.6]], 'panel-t');
  a.seg([c0, cv0 + dv / 2, z + 10.7], [c0 + du, cv0 + dv / 2, z + 10.7], 'k-glass-t', 0.6, ' opacity=".7"');
  // mât d'instruments : anémomètre à trois coupelles, girouette
  const mu = c0 + 0.05, mv = cv0 + 0.05, zm = 34;
  a.seg([mu, mv, z + 10.6], [mu, mv, zm], 'k-metal-r', 1.2);
  const [ax, ay] = P(mu, mv, zm);
  a.raw(`<path d="M${f(ax - 5)},${f(ay + 1)}h10M${f(ax)},${f(ay - 3)}v4" class="k-metal-r" stroke-width=".9"/>`);
  for (const dx of [-5, 5]) a.raw(`<circle cx="${f(ax + dx)}" cy="${f(ay + 1)}" r="1.5" class="tech-l"/>`);
  a.raw(`<circle cx="${f(ax)}" cy="${f(ay - 3)}" r="1.5" class="tech-t"/>`);
  a.ext(ax - 7, ay - 5);
  a.seg([mu, mv, zm - 6], [mu + 0.14, mv, zm - 6], 'k-metal-r', 0.9); // girouette
  a.poly([[mu + 0.1, mv, zm - 4.5], [mu + 0.16, mv, zm - 6], [mu + 0.1, mv, zm - 7.5]], 'metal-l');
  if (livree) paniers(a, z, 0.4);
  else a.box(u + 0.43, v + 0.1, 0.11, 0.14, z, 3.5, 'tech', { rim: true, cast: false }); // glacière d'échantillons
}

const BATEAUX = { convoi, famille, scientifique };

/**
 * Quai, emprise 1 × 0,9, posé sur le lac. etat : 'vieux' (planches manquantes, poteaux cassés), neuf, ou 'marchand'
 * (neuf, le chaland du marchand amarré au large ; l'entité prend alors QUAI_MARCHAND_H de profondeur). Avec un visiteur à
 * commande : 'marchand+convoi', 'marchand+famille+livree'… (son bateau dans le prolongement du chaland ; l'entité prend
 * alors QUAI_BATEAU_W de largeur).
 */
export function quai(etat = '') {
  const [base, visiteur, livree] = String(etat).split('+');
  const vieux = base === 'vieux';
  const bateau = Object.hasOwn(BATEAUX, visiteur ?? '') ? BATEAUX[visiteur] : null;
  const a = new Art();
  const posts = [[0.08, 0.1, 6], [0.88, 0.1, vieux ? 3 : 6], [0.08, 0.86, vieux ? 2 : 6], [0.88, 0.86, 6]];
  for (const [u, v, h] of posts) a.box(u - 0.04, v - 0.04, 0.08, 0.08, -4, h + 4, 'woodd', { cast: false });
  if (vieux) {
    a.box(0, 0.02, 0.96, 0.32, 1.5, 2.5, 'woodb', { rim: true, cast: false });
    a.box(0.5, 0.36, 0.46, 0.2, 1.5, 2.5, 'woodd', { rim: true, cast: false });
    a.poly([[0.06, 0.62, 0], [0.4, 0.62, 2.5], [0.4, 0.8, 2.5], [0.06, 0.8, 0]], 'woodd-t'); // planche tombée
  } else {
    a.box(0, 0.02, 0.96, 0.9, 1.5, 2.5, 'woodb', { rim: true, cast: false });
    for (let vv = 0.17; vv < 0.9; vv += 0.15) a.seg([0, vv, 4], [0.96, vv, 4], 'k-woodd-t', 0.6, ' opacity=".55"');
    a.prism(0.82, 0.74, 0.06, 4, 7, 'woodd', 6, { rim: true }); // bitte d'amarrage
    if (base === 'marchand') {
      chaland(a);
      a.seg([0.82, 0.74, 9], [0.74, 1.04, 6], 'k-rope-t', 1); // amarres, hors du groupe qui se balance
      a.seg([0.08, 0.86, 10], [0.04, 1.04, 6], 'k-rope-t', 1);
    } else a.seg([0.82, 0.74, 9], [0.5, 1.15, 0], 'k-rope-t', 1);
    if (bateau) {
      // à contretemps du chaland, pour que les deux ne se balancent pas d'un bloc ; l'amarre part du poteau du coin
      a.raw('<g class="ow-bateau" style="animation-delay:-2.1s">');
      bateau(a, livree === 'livree');
      a.raw('</g>');
      a.seg([0.88, 0.86, 10], [1.16, 1.14, 5.5], 'k-rope-t', 1);
    }
  }
  const r = a.done(2);
  r.shadow = null;
  return r;
}

// ---------------------------------------------------------------- imprévus heureux du jour (lot I)

/** Orignal qui traverse la route, emprise 0,9 × 0,9 : il marche vers l'avant (+v), panache clair, pattes grises. */
export function orignal() {
  const a = new Art();
  const u = 0.34, du = 0.22, v = 0.12, dv = 0.56, zb = 12, H = 10;
  // pattes du fond, puis le corps, la bosse du garrot, les pattes de devant
  for (const [pu, pv] of [[u + 0.04, v + 0.06], [u + du - 0.03, v + 0.06]]) a.seg([pu, pv, 0], [pu, pv, zb + 1], 'k-stoned-r', 2.4);
  a.box(u, v, du, dv, zb, H, 'wooddk', { rim: true });
  a.box(u + 0.02, v + dv - 0.2, du - 0.04, 0.18, zb + H, 3.2, 'wooddk', { rim: true });
  for (const [pu, pv] of [[u + 0.04, v + dv - 0.08], [u + du - 0.03, v + dv - 0.08]]) a.seg([pu, pv, 0], [pu, pv, zb + 1], 'k-stoned-l', 2.4);
  a.seg([u + du / 2, v, zb + H - 2], [u + du / 2, v - 0.06, zb + H - 5], 'k-wooddk-l', 1.6); // queue
  // cou, tête basse au long museau, cloche sous la gorge
  const hv = v + dv;
  a.box(u + 0.05, hv - 0.04, du - 0.1, 0.16, zb + 5, 9, 'wooddk', { rim: true });
  a.box(u + 0.06, hv + 0.1, du - 0.12, 0.2, zb + 3, 7, 'woodd', { rim: true });
  a.seg([u + du / 2, hv + 0.06, zb + 4], [u + du / 2, hv + 0.08, zb - 1.5], 'k-wooddk-l', 1.8);
  a.poly([[u + 0.08, hv + 0.3, zb + 4.6], [u + du - 0.08, hv + 0.3, zb + 4.6], [u + du - 0.08, hv + 0.3, zb + 6.4], [u + 0.08, hv + 0.3, zb + 6.4]], 'wooddk-l'); // naseaux
  // panache : deux larges palettes claires de part et d'autre de la tête, à trois andouillers
  const zt = zb + 13, av = hv + 0.05;
  const palette = (s) => { // s = -1 : côté gauche, +1 : côté droit
    const b = s < 0 ? u + 0.05 : u + du - 0.05;
    const x = (d) => b + s * d;
    return [[x(0), av, zt - 2], [x(0.3), av, zt], [x(0.36), av, zt + 7], [x(0.29), av, zt + 4.6], [x(0.26), av, zt + 9.5], [x(0.19), av, zt + 5.4], [x(0.14), av, zt + 9], [x(0.08), av, zt + 4], [x(0), av, zt + 2]];
  };
  a.poly(palette(-1), 'hay-l');
  a.poly(palette(1), 'hay-r');
  a.seg([u + 0.04, av + 0.02, zt - 3.4], [u + 0.04, av + 0.03, zt - 0.6], 'k-wooddk-l', 1.6); // oreilles
  a.seg([u + du - 0.04, av + 0.02, zt - 3.4], [u + du - 0.04, av + 0.03, zt - 0.6], 'k-wooddk-r', 1.6);
  return a.done(2);
}

// Bûche couchée le long de u, d'un bout à l'autre ; ses faces visibles (dessus, face +v), puis le bout coupé (face +u).
function buche(a, u0, u1, vc, zc) {
  const rv = 0.085, rz = 3.2, n = 8;
  const ring = Array.from({ length: n }, (_, k) => { const t = (k / n) * Math.PI * 2; return [vc + Math.cos(t) * rv, zc + Math.sin(t) * rz, Math.cos(t), Math.sin(t)]; });
  for (let k = 0; k < n; k++) {
    const p = ring[k], q = ring[(k + 1) % n];
    const nv = (p[2] + q[2]) / 2, nz = (p[3] + q[3]) / 2;
    if (nv <= -0.2 && nz <= 0.2) continue; // côté du fond ou dessous
    a.poly([[u0, p[0], p[1]], [u1, p[0], p[1]], [u1, q[0], q[1]], [u0, q[0], q[1]]], nz > 0.5 ? 'woodd-t' : 'woodd-l');
  }
  a.poly(ring.map(([vv, zz]) => [u1, vv, zz]), 'woodb-r');
  a.poly(ring.map(([vv, zz]) => [u1, vc + (vv - vc) * 0.45, zc + (zz - zc) * 0.45]), 'hay-r', ' opacity=".7"'); // cerne du cœur
}

/** Trouvaille en forêt : pile de bûches à l'orée, emprise 0,85 × 0,6. */
export function bois() {
  const a = new Art();
  for (const [vc, zc] of [[0.2, 3.2], [0.37, 3.2], [0.54, 3.2], [0.285, 9.1], [0.455, 9.1], [0.37, 15]]) buche(a, 0.08, 0.72, vc, zc);
  a.cast(0.08, 0.1, 0); a.cast(0.72, 0.1, 0); a.cast(0.72, 0.62, 0); a.cast(0.08, 0.62, 0); a.cast(0.4, 0.37, 18);
  // la hache plantée dans une bûche du dessus, manche vers le ciel
  a.seg([0.62, 0.37, 18], [0.66, 0.42, 30], 'k-woodd-l', 1.7);
  a.poly([[0.6, 0.34, 17], [0.64, 0.3, 17], [0.64, 0.3, 21], [0.6, 0.34, 21]], 'metal-r');
  return a.done(2);
}

/** Bonne pêche : une caisse de poissons au bout de la route du quai, emprise 0,5 × 0,5, filet posé dessus. */
export function poissons() {
  const a = new Art();
  const u = 0.05, v = 0.06, du = 0.4, dv = 0.36, H = 8;
  a.box(u, v, du, dv, 0, H, 'woodb', { rim: true });
  a.seg([u, v + dv, H * 0.5], [u + du, v + dv, H * 0.5], 'k-woodd-l', 0.7);
  a.seg([u + du, v, H * 0.5], [u + du, v + dv, H * 0.5], 'k-woodd-r', 0.7);
  // poissons tête-bêche dans la caisse : corps argent, dos de lac, queue fourchue
  for (const [pu, pv, dir] of [[u + 0.12, v + 0.1, 1], [u + 0.22, v + 0.2, -1], [u + 0.14, v + 0.26, 1]]) {
    const [x, y] = P(pu, pv, H + 1);
    const w = 8 * dir;
    a.raw(`<path d="M${f(x - w)},${f(y)}Q${f(x)},${f(y - 4)} ${f(x + w)},${f(y)}Q${f(x)},${f(y + 3.4)} ${f(x - w)},${f(y)}Z" class="waterl-t"/>`
      + `<path d="M${f(x - w * 0.6)},${f(y - 1.4)}Q${f(x)},${f(y - 3.6)} ${f(x + w * 0.7)},${f(y - 0.8)}" class="k-waterd-l" stroke-width="1.1" fill="none"/>`
      + `<path d="M${f(x - w)},${f(y)}l${f(-3.6 * dir)},-2.6v5.2z" class="waterd-l"/><circle cx="${f(x + w * 0.66)}" cy="${f(y - 0.6)}" r=".8" class="wooddk-t"/>`);
    a.ext(x - 13, y - 5); a.ext(x + 13, y + 4);
  }
  // un coin de filet qui pend sur le flanc
  a.raw(`<path d="${[0.1, 0.18, 0.26, 0.34].map((uu) => { const [x1, y1] = P(u + uu, v + dv, H); const [x2, y2] = P(u + uu + 0.04, v + dv, 2); return `M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`; }).join('')}" class="k-rope-l" stroke-width=".8" fill="none"/>`);
  return a.done(2);
}

// ---------------------------------------------------------------- décor

export function epinette(seed = 1, scale = 1) {
  const a = new Art();
  const R = rng(seed);
  const s = scale * (0.9 + R() * 0.25);
  a.box(0.46, 0.46, 0.08, 0.08, 0, 9, 'woodd');
  const [cx, cy] = P(0.5, 0.5);
  cone(a, cx, cy - 6 * s, 15 * s, 24 * s, 'leafd');
  cone(a, cx, cy - 18 * s, 12 * s, 22 * s, 'leafd');
  cone(a, cx, cy - 30 * s, 9 * s, 19 * s, 'leafd');
  cone(a, cx, cy - 41 * s, 5.5 * s, 14 * s, 'leafd');
  a.castS(cx - 15 * s, cy - 6 * s, 6 * s); a.castS(cx + 15 * s, cy - 6 * s, 6 * s); a.castS(cx, cy - 55 * s, 55 * s);
  return a.done();
}

export function arbre(seed = 1, m = 'leaf', scale = 1) {
  const a = new Art();
  const R = rng(seed);
  a.box(0.45, 0.45, 0.1, 0.1, 0, 15 * scale, 'woodd');
  const [cx, cy] = P(0.5, 0.5);
  const s = scale * (0.92 + R() * 0.2);
  ball(a, cx + 1, cy - 38 * s, 12.5 * s, m, R, 8);
  ball(a, cx - 8 * s, cy - 26 * s, 11 * s, m, R, 7);
  ball(a, cx + 8 * s, cy - 25 * s, 10.5 * s, m, R, 7);
  for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; a.castS(cx + Math.cos(t) * 17 * s, cy - 30 * s + Math.sin(t) * 12 * s, 30 * s); }
  a.cast(0.45, 0.45, 0); a.cast(0.55, 0.55, 0);
  return a.done();
}

export function buisson(seed = 1, m = 'leaf') {
  const a = new Art();
  const R = rng(seed);
  const [cx, cy] = P(0.5, 0.5);
  ball(a, cx - 5, cy - 6, 7, m, R, 6);
  ball(a, cx + 5, cy - 5, 6.5, m, R, 6);
  ball(a, cx, cy - 10, 6.5, m, R, 6);
  if (R() < 0.7) for (let k = 0; k < 4; k++) a.raw(`<circle cx="${f(cx - 7 + R() * 14)}" cy="${f(cy - 13 + R() * 10)}" r="1.3" class="${R() < 0.5 ? 'fl1' : 'fl2'}-t"/>`);
  a.castS(cx - 10, cy - 6, 6); a.castS(cx + 10, cy - 6, 6); a.castS(cx, cy - 16, 16);
  return a.done();
}

/**
 * Souche (lot F) : un arbre coupé sur la terre gagnée au Hameau, au centre de son emprise 1 × 1. Tronc court à huit
 * pans d'écorce, coupe claire avec son cœur et deux cernes, trois racines qui s'évasent au pied, côté visible.
 */
export function souche(seed = 1) {
  const a = new Art();
  const R = rng(seed);
  const cu = 0.5, cv = 0.5, rr = 0.13 + R() * 0.03, H = 4.5 + R() * 3, n = 8;
  const ring = Array.from({ length: n }, (_, k) => { const t = (k / n) * Math.PI * 2 + 0.2; return [cu + Math.cos(t) * rr, cv + Math.sin(t) * rr, Math.cos(t), Math.sin(t)]; });
  // racines : un coin d'écorce posé au sol, qui part du tronc vers +u, +v et entre les deux
  for (const [du, dv] of [[1, 0.15], [0.2, 1], [0.8, 0.75]]) {
    const L = Math.hypot(du, dv), eu = du / L, ev = dv / L;
    const base = [cu + eu * rr * 0.8, cv + ev * rr * 0.8], tip = [cu + eu * (rr + 0.11), cv + ev * (rr + 0.11)];
    a.poly([[base[0] - ev * 0.05, base[1] + eu * 0.05, 0], [tip[0], tip[1], 0], [base[0], base[1], 2.4]], 'woodd-l');
    a.poly([[base[0] + ev * 0.05, base[1] - eu * 0.05, 0], [tip[0], tip[1], 0], [base[0], base[1], 2.4]], 'woodd-r');
  }
  // flancs visibles : leur normale regarde vers +u ou +v
  for (let k = 0; k < n; k++) {
    const p = ring[k], q = ring[(k + 1) % n];
    const nu = (p[2] + q[2]) / 2, nv = (p[3] + q[3]) / 2;
    if (nu + nv < -0.2) continue;
    a.poly([[p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], H], [p[0], p[1], H]], nv >= nu ? 'woodd-l' : 'woodd-r');
  }
  // la coupe : bois clair, deux cernes, le cœur
  a.poly(ring.map(([u, v]) => [u, v, H]), 'woodb-t');
  for (const s of [0.68, 0.38]) a.poly(ring.map(([u, v]) => [cu + (u - cu) * s, cv + (v - cv) * s, H]), 'k-woodd-t', ' stroke-width=".6" opacity=".55"');
  a.poly(ring.map(([u, v]) => [cu + (u - cu) * 0.14, cv + (v - cv) * 0.14, H]), 'woodd-t', ' opacity=".7"');
  for (const [u, v] of [[cu - rr, cv], [cu + rr, cv], [cu, cv + rr], [cu, cv - rr]]) a.cast(u, v, 0);
  a.cast(cu, cv, H);
  return a.done();
}

export function rocher(seed = 1) {
  const a = new Art();
  const R = rng(seed);
  for (const [u, v, s] of [[0.42, 0.5, 1], [0.68, 0.62, 0.7]]) {
    const [x, y] = P(u, v);
    const w = 9 * s * (0.9 + R() * 0.2), h = 8 * s * (0.9 + R() * 0.3);
    a.spoly([[x - w, y], [x - w * 0.5, y - h], [x + w * 0.2, y - h * 1.1], [x + w * 0.1, y + 2]], 'stoned-l');
    a.spoly([[x + w * 0.1, y + 2], [x + w * 0.2, y - h * 1.1], [x + w * 0.8, y - h * 0.5], [x + w, y]], 'stoned-r');
    a.spoly([[x - w * 0.5, y - h], [x + w * 0.2, y - h * 1.1], [x - w * 0.05, y - h * 0.6]], 'stoned-t');
    a.castS(x - w, y, 2); a.castS(x + w, y, 2); a.castS(x, y - h, h);
  }
  return a.done();
}

// ---------------------------------------------------------------- Fanal (couleurs propres)

const C = { sage: '#5f8a63', sageR: '#466a4c', brass: '#c99a4a', brassR: '#9c7434', dark: '#3c3a33' };

/** Sprite debout de Fanal. Pieds en (0, 0) ; boîte -16..16 × -50..4. */
export function characterSVG() {
  return `<svg class="ow-sprite" viewBox="-16 -50 32 54" width="32" height="54" aria-hidden="true">
<ellipse cx="0" cy="0" rx="8" ry="3.2" class="ow-sprite-shadow"/>
<path d="M-3.2,-2 L-4.4,-12 M3.2,-2 L4.4,-12" stroke="${C.dark}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
<path d="M-4.4,-2.2h-2.4M4.4,-2.2h2.4" stroke="${C.dark}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M-6.5,-12 Q-7.4,-21 0,-22 Q7.4,-21 6.5,-12 Z" fill="${C.brass}"/>
<path d="M0,-22 Q7.4,-21 6.5,-12 L0,-12 Z" fill="${C.brassR}"/>
<path d="M-6.4,-17 Q-10,-15 -9.4,-11.5" stroke="${C.brassR}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M6.4,-17 Q9.8,-19 10.4,-23" stroke="${C.brassR}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<rect x="-7.5" y="-25.5" width="15" height="3.4" rx="1.2" fill="${C.dark}"/>
<path d="M-7,-25.5 L-6,-39 L6,-39 L7,-25.5 Z" fill="#fff6dc" opacity=".35"/>
<circle cx="0" cy="-32" r="5.6" class="ow-fanal-core"/>
<circle cx="-1.8" cy="-33.6" r="1.8" fill="#fffbe9" opacity=".85"/>
<path d="M-6,-39 L-7,-25.5 M6,-39 L7,-25.5 M0,-39 V-25.5" stroke="${C.dark}" stroke-width="1.1" fill="none"/>
<path d="M-8.4,-39 L0,-45.5 L8.4,-39 Z" fill="${C.sage}"/><path d="M0,-45.5 L8.4,-39 L0,-39 Z" fill="${C.sageR}"/>
<path d="M-2.6,-45.5 Q0,-50.5 2.6,-45.5" stroke="${C.dark}" stroke-width="1.2" fill="none"/>
</svg>`;
}

// ---------------------------------------------------------------- habitants au travail (lot E)
// Plus petits que Fanal, tournés vers la droite (la scène les retourne), pieds en (0, 0), boîte -10..10 × -29..3.
// Couleurs de la palette du monde, jamais la braise, l'airelle (Permis) ni le givre (hors ligne, tempête) ; côté gauche
// éclairé, côté droit dans l'ombre, comme les bâtiments. Casquette du printemps à l'automne, tuque à pompon et foulard
// l'hiver (world.css, sous data-neige). Le bras avant porte l'outil du métier et se balance (marche comme travail).
const HAB = {
  vestes: [['#718c5d', '#56795c'], ['#58a9a4', '#2d7473'], ['#cf9446', '#a8722f'], ['#dcc58e', '#b9a26a'], ['#8a5a3a', '#64412e'], ['#87a65b', '#5d8150']],
  bonnets: [['#f3c879', '#d9a94f'], ['#58a9a4', '#2d7473'], ['#eef2e2', '#cfd6c2'], ['#e8a542', '#c0812a'], ['#718c5d', '#56795c'], ['#fbf2d9', '#ddd0ae']],
  pantalons: ['#4f5848', '#64412e', '#2f6c71'],
  peaux: [['#f0cfa8', '#d9b088'], ['#d9a77a', '#bf8c5f'], ['#b07a52', '#93603d'], ['#7d4f35', '#643d28']],
};
const OUTILS = {
  // potager : un panier de récolte (chaque outil pend sous la main, en (4.6, -9.7))
  panier: '<g transform="translate(-.7 2.6)"><path d="M3.1,-10.6 Q5.3,-14.2 7.5,-10.6" fill="none" stroke="#8a5a3a" stroke-width=".7"/><circle cx="4.3" cy="-10.9" r="1.2" fill="#e8a542"/><circle cx="6.3" cy="-11" r="1.1" fill="#87a65b"/><path d="M2.6,-10.6h5.4l-.8,3.4h-3.8z" fill="#e3bb7c"/><path d="M5.3,-10.6h2.7l-.8,3.4h-1.9z" fill="#c99a5e"/></g>',
  // serre : un arrosoir
  arrosoir: '<g transform="translate(-1 2.9)"><path d="M3.8,-11.6 Q5.6,-14.2 7.4,-11.6" fill="none" stroke="#2f6c71" stroke-width=".8"/><path d="M7.2,-10.4 L10,-12.8" stroke="#58a9a4" stroke-width="1.1" stroke-linecap="round"/><rect x="3.2" y="-11.6" width="4.6" height="3.8" rx=".7" fill="#58a9a4"/><rect x="5.5" y="-11.6" width="2.3" height="3.8" rx=".5" fill="#2d7473"/></g>',
  // atelier : un marteau
  marteau: '<path d="M4.4,-9.4 L6.9,-14.6" stroke="#8a5a3a" stroke-width="1.2" stroke-linecap="round"/><path d="M5.4,-15.8 L8.8,-14.3 L8.2,-12.9 L4.8,-14.4 Z" fill="#b2a58a"/><path d="M7.1,-15 L8.8,-14.3 L8.2,-12.9 L6.5,-13.6 Z" fill="#8f8570"/>',
  // grenier : un sac de grain
  sac: '<g transform="translate(-1 3.6)"><path d="M3,-8.8 Q2.5,-12.7 4.6,-13.5 L6.6,-13.5 Q8.6,-12.7 8,-8.8 Q5.5,-8 3,-8.8 Z" fill="#e8d29f"/><path d="M5.6,-13.5 L6.6,-13.5 Q8.6,-12.7 8,-8.8 Q6.9,-8.5 5.6,-8.5 Z" fill="#c7a776"/><path d="M4.2,-13.4 H7" stroke="#8a5a3a" stroke-width=".8" stroke-linecap="round"/></g>',
};

/** Figurine d'un habitant : n (0, 1, 2…) choisit ses couleurs, outil son métier ('' : mains vides). */
export function habitantSVG(n = 0, outil = '') {
  const [vt, vr] = HAB.vestes[n % HAB.vestes.length];
  const [bt, br] = HAB.bonnets[(n * 2 + 3) % HAB.bonnets.length];
  const pant = HAB.pantalons[n % HAB.pantalons.length];
  const [pt, pr] = HAB.peaux[(n * 3 + 1) % HAB.peaux.length];
  const boot = C.dark;
  return `<svg class="ow-hab" viewBox="-10 -29 20 32" width="20" height="32" aria-hidden="true" focusable="false">
<ellipse cx="0" cy="0" rx="5.2" ry="2" class="ow-sprite-shadow"/>
<path d="M-2.9,-15.2 L-4,-9.8" stroke="${vr}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M-1.6,-1 L-1.7,-7.6 M1.6,-1 L1.7,-7.6" stroke="${pant}" stroke-width="2.3" stroke-linecap="round"/>
<path d="M-2.7,-.9h1.9M.9,-.9h2.2" stroke="${boot}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M-4.2,-7.2 L-3.5,-16.6 Q0,-18 3.5,-16.6 L4.2,-7.2 Z" fill="${vt}"/>
<path d="M0,-17.3 Q2.2,-17.2 3.5,-16.6 L4.2,-7.2 L0,-7.2 Z" fill="${vr}"/>
<g class="ow-hab-hiver"><path d="M-3,-17.5 Q.3,-16 3.6,-17.5 L3.4,-15.9 Q.3,-14.7 -2.8,-15.9 Z" fill="${bt}"/><path d="M2.3,-16 L3.3,-12.7 L1.6,-12.9 Z" fill="${br}"/></g>
<circle cx=".3" cy="-20.4" r="3.2" fill="${pt}"/>
<path d="M.3,-23.6 A3.2,3.2 0 0 1 .3,-17.2 Z" fill="${pr}" opacity=".55"/>
<circle cx="3.4" cy="-20" r=".9" fill="${pr}"/>
<g class="ow-hab-ete"><path d="M-3.2,-21.5 Q-3,-24.7 .3,-24.8 Q3.6,-24.7 3.8,-21.5 Z" fill="${bt}"/><path d="M3.2,-21.7 L6.5,-21.1 L3.4,-20.6 Z" fill="${br}"/></g>
<g class="ow-hab-hiver"><path d="M-3.4,-21 Q-3.4,-25.9 .3,-26.1 Q4,-25.9 4,-21 Z" fill="${bt}"/><rect x="-3.6" y="-21.9" width="7.8" height="1.8" rx=".7" fill="${br}"/><circle cx=".3" cy="-26.6" r="1.4" fill="${br}"/></g>
<g class="ow-hab-bras"><path d="M2.9,-15.2 L4.6,-9.7" stroke="${vr}" stroke-width="1.9" stroke-linecap="round"/>${OUTILS[outil] ?? ''}</g>
</svg>`;
}

// ---------------------------------------------------------------- registre des modèles

/** Construit l'art d'une entité (voir scene.js). Mis en cache par clé : un même modèle n'est dessiné qu'une fois. */
export function artFor(e) {
  switch (e.model) {
    case 'lanterne': return lanterne();
    case 'cloture': return cloture(!!e.end);
    case 'caisse': return caisse(e.seed || 1);
    case 'glaciere': return glaciere();
    case 'etabli': return etabli();
    case 'atelier': return atelier(e.variant === 'abime');
    case 'chalet': return chalet(e.variant || '');
    case 'parcelle': return parcelle(e.variant || '', e.degat || '');
    case 'serre': return serre(e.variant || '', e.degat || '');
    case 'eolienne': return eolienne(e.degat || '');
    case 'orignal': return orignal();
    case 'bois': return bois();
    case 'poissons': return poissons();
    case 'grenier': return grenier();
    case 'quai': return quai(e.variant || '');
    case 'tour': return tour();
    case 'scierie': return scierie();
    case 'poulailler': return poulailler();
    case 'cabane': return cabane(e.variant || '');
    case 'piquets': return piquets(e.w || 1, e.h || 1);
    case 'erable': return erable(e.seed || 1);
    case 'epinette': return epinette(e.seed || 1, e.s || 1);
    case 'arbre': return arbre(e.seed || 1, e.m || 'leaf', e.s || 1);
    case 'buisson': return buisson(e.seed || 1, e.m || 'leaf');
    case 'rocher': return rocher(e.seed || 1);
    case 'souche': return souche(e.seed || 1);
    default: return caisse(1);
  }
}

export const MODEL_IDS = ['lanterne', 'cloture', 'caisse', 'atelier', 'etabli', 'erable', 'glaciere', 'chalet', 'parcelle', 'serre', 'eolienne', 'grenier', 'quai', 'tour', 'scierie', 'poulailler', 'cabane', 'piquets'];

/** Hauteur approximative (px monde) au-dessus du sol, pour viser le haut d'un objet. */
export function artTop(art) { return art.y; }
export { pts };
