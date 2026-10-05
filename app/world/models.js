// Modèles low-poly en aplats à trois tons (dessus -t, face +v -l, face +u -r). Repère local : (0,0,0) = coin
// arrière de l'emprise. Chaque fonction renvoie { svg, x, y, w, h, shadow, anchors } (voir iso.js : Art.done).
// Les modèles du décor fixe : bastion (grande halle), tour, lanterne, cloture, caisse, atelier, etabli, erable,
// glaciere, registres (mairie), maison (école). Décor : epinette, arbre, buisson, rocher. Fanal : characterSVG().
import { Art, P, f, pts, rng } from './iso.js';

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

export function bastion() {
  const a = new Art();
  a.box(0.1, 0.1, 1.8, 1.8, 0, 5, 'stoned', { rim: true });
  // donjon
  const u = 0.32, v = 0.26, du = 1.2, dv = 1.12, H = 36;
  a.box(u, v, du, dv, 5, H, 'stone');
  for (let k = 1; k < 4; k++) {
    a.seg([u, v + dv, 5 + k * 9], [u + du, v + dv, 5 + k * 9], 'k-stoned-l', 0.7);
    a.seg([u + du, v, 5 + k * 9], [u + du, v + dv, 5 + k * 9], 'k-stoned-r', 0.7);
  }
  // créneaux
  for (let uu = u + 0.02; uu + 0.16 <= u + du + 0.01; uu += 0.27) a.box(uu, v + dv - 0.14, 0.16, 0.14, 5 + H, 6, 'stone', { rim: true });
  for (let vv = v + 0.02; vv + 0.16 <= v + dv - 0.2; vv += 0.27) a.box(u + du - 0.14, vv, 0.14, 0.16, 5 + H, 6, 'stone', { rim: true });
  // porte voûtée sur la face avant gauche
  const g0 = u + 0.42, g1 = u + 0.78, V = v + dv;
  const arch = [];
  for (let k = 0; k <= 6; k++) { const t = Math.PI * (k / 6); arch.push([(g0 + g1) / 2 - Math.cos(t) * (g1 - g0) / 2, V, 21 + Math.sin(t) * 5]); }
  a.poly([[g0, V, 5], [g1, V, 5], ...arch.reverse(), [g0, V, 21]], 'wooddk-l');
  for (const t of [0.25, 0.5, 0.75]) a.seg([g0 + (g1 - g0) * t, V, 5], [g0 + (g1 - g0) * t, V, 24], 'k-woodd-l', 0.8);
  a.seg([g0, V, 12], [g1, V, 12], 'k-woodd-l', 0.8);
  // bande de runes et fentes de tir
  a.seg([u + 0.04, V, 30], [u + du - 0.04, V, 30], 'rune', 1.3);
  rectU(a, u + du, v + 0.3, v + 0.42, 18, 28, 'win');
  rectU(a, u + du, v + 0.7, v + 0.82, 18, 28, 'win');
  // marches
  a.box(g0 - 0.06, V, (g1 - g0) + 0.12, 0.22, 0, 3, 'stoned', { rim: true, cast: false });
  // tourelle d'angle avec toit conique
  const tr = a.prism(u + du + 0.02, v + dv + 0.02, 0.22, 5, H + 12, 'stone', 8, { rim: true });
  void tr;
  const [tx, ty] = P(u + du + 0.02, v + dv + 0.02, 5 + H + 12);
  cone(a, tx, ty + 2, 15, 24, 'roofb');
  a.castS(tx, ty - 22, H + 40);
  // mât et fanion
  const [mx, my] = P(u + 0.35, v + 0.3, 5 + H);
  a.raw(`<path d="M${f(mx)},${f(my)}V${f(my - 26)}" class="k-wooddk-l" stroke-width="1.4"/>`);
  a.raw(`<path d="M${f(mx)},${f(my - 26)}l13,4 -13,4z" class="gold-t"/><path d="M${f(mx)},${f(my - 22)}l13,0 -13,4z" class="gold-r"/>`);
  a.ext(mx - 2, my - 28); a.ext(mx + 14, my - 16);
  a.anchor('light', (g0 + g1) / 2, V + 0.1, 24);
  return a.done();
}

/** Tour de veille. `reparee` : pylône complet et cristal ; sinon tronquée, cristal tombé au pied. */
export function tour(reparee = false) {
  const a = new Art();
  a.box(0.14, 0.14, 0.72, 0.72, 0, 10, 'stone', { rim: true });
  a.box(0.22, 0.22, 0.56, 0.56, 10, 4, 'stoned', { rim: true });
  a.seg([0.18, 0.86, 5], [0.82, 0.86, 5], 'rune', 1.4);
  a.seg([0.86, 0.18, 5], [0.86, 0.82, 5], 'rune', 1.4);
  const z0 = 14, zTop = 98, z1 = reparee ? zTop : 60;
  const B = [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]], T = [[0.44, 0.44], [0.56, 0.44], [0.56, 0.56], [0.44, 0.56]];
  const L = (i, t) => [B[i][0] + (T[i][0] - B[i][0]) * t, B[i][1] + (T[i][1] - B[i][1]) * t, z0 + (zTop - z0) * t];
  const tMax = (z1 - z0) / (zTop - z0);
  const lv = [0, 0.22, 0.46, 0.72, 1].filter((t) => t <= tMax + 1e-6);
  a.seg(L(0, 0), L(0, tMax), 'k-panel-r', 1.4);
  for (let k = 0; k < lv.length - 1; k++) {
    a.seg(L(0, lv[k]), L(1, lv[k + 1]), 'k-panel-r', 0.7); a.seg(L(1, lv[k]), L(0, lv[k + 1]), 'k-panel-r', 0.7);
    a.seg(L(0, lv[k]), L(3, lv[k + 1]), 'k-panel-r', 0.7); a.seg(L(3, lv[k]), L(0, lv[k + 1]), 'k-panel-r', 0.7);
  }
  a.seg(L(1, 0), L(1, tMax), 'k-panel-r', 2); a.seg(L(3, 0), L(3, tMax), 'k-panel-l', 2);
  for (let k = 0; k < lv.length - 1; k++) {
    a.seg(L(3, lv[k]), L(2, lv[k + 1]), 'k-tech-l', 0.9); a.seg(L(2, lv[k]), L(3, lv[k + 1]), 'k-tech-l', 0.9);
    a.seg(L(2, lv[k]), L(1, lv[k + 1]), 'k-panel-l', 0.9); a.seg(L(1, lv[k]), L(2, lv[k + 1]), 'k-panel-l', 0.9);
  }
  for (const t of lv.slice(1)) { a.seg(L(3, t), L(2, t), 'k-tech-l', 1.1); a.seg(L(2, t), L(1, t), 'k-panel-l', 1.1); }
  a.seg(L(2, 0), L(2, tMax), 'k-tech-t', 2.3);
  for (const [u, v] of [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]]) a.cast(u, v, 14);
  if (reparee) {
    const pz = 62;
    a.seg(L(3, 0.58), [0.0, 0.76, pz + 3], 'k-panel-l', 1.2);
    a.poly([[-0.2, 0.56, pz], [0.12, 0.56, pz], [0.12, 0.96, pz + 7], [-0.2, 0.96, pz + 7]], 'panel-t');
    a.seg(L(1, 0.58), [0.78, 0.02, pz + 3], 'k-panel-r', 1.2);
    a.poly([[0.58, -0.2, pz], [0.98, -0.2, pz], [0.98, 0.12, pz + 7], [0.58, 0.12, pz + 7]], 'panel-l');
    a.box(0.36, 0.36, 0.28, 0.28, zTop, 3, 'woodb', { rim: true });
    a.cast(0.5, 0.5, zTop + 34);
    a.ext(...P(0.5, 0.5, zTop + 42));
    a.anchor('crystal', 0.5, 0.5, zTop + 19);
    a.anchor('light', 0.5, 0.5, zTop + 19);
  } else {
    // montant cassé, planches et cristal éteint au pied
    const top = L(2, tMax);
    a.seg(top, [top[0] + 0.22, top[1] - 0.1, top[2] + 9], 'k-tech-t', 2);
    a.seg(L(3, tMax), [0.26, 0.62, z1 - 6], 'k-panel-l', 1.4);
    a.box(0.78, 0.62, 0.32, 0.08, 0, 2.5, 'woodd', { rim: true });
    a.box(0.7, 0.8, 0.08, 0.26, 0, 2.5, 'woodb', { rim: true });
    const [cx, cy] = P(0.92, 0.95, 2);
    a.spoly([[cx - 8, cy - 2], [cx + 1, cy - 9], [cx + 6, cy - 1], [cx - 2, cy + 3]], 'glass-l');
    a.spoly([[cx + 1, cy - 9], [cx + 6, cy - 1], [cx + 9, cy - 5]], 'glass-r');
    a.ext(cx + 10, cy + 4);
    a.anchor('light', 0.92, 0.95, 4);
  }
  return a.done(4);
}

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

// ---------------------------------------------------------------- Mairie et École

export function registres() {
  const a = new Art();
  a.box(0.1, 0.1, 1.8, 1.8, 0, 4, 'stoned', { rim: true });
  const u = 0.3, v = 0.25, du = 1.4, dv = 1.05, H = 26;
  a.box(u, v, du, dv, 4, H, 'stone');
  rectU(a, u + du, v + 0.25, v + 0.45, 12, 22, 'win');
  rectU(a, u + du, v + 0.62, v + 0.82, 12, 22, 'win');
  const V = v + dv;
  rectV(a, V, u + 0.55, u + 0.85, 4, 20, 'wooddk-l');
  // portique : colonnes devant la face avant
  for (const cu of [u + 0.12, u + 0.45, u + 0.95, u + 1.28]) a.prism(cu, V + 0.2, 0.06, 4, H, 'stone', 6);
  a.box(u - 0.04, v, du + 0.08, dv + 0.32, 4 + H, 4, 'stoned', { rim: true });
  const rf = roofU(a, u - 0.04, v, du + 0.08, dv + 0.32, 4 + H + 4, 15, 'roofb', 'stone', 0.06);
  const [ox, oy] = P(u + du + 0.04, rf.vm, 4 + H + 9);
  a.raw(`<circle cx="${f(ox)}" cy="${f(oy)}" r="3.2" class="win"/>`);
  a.box(u + 0.5, V, 0.4, 0.38, 0, 2.5, 'stoned', { cast: false, rim: true });
  a.anchor('light', u + 0.7, V + 0.1, 16);
  return a.done(3);
}

export function maison() {
  const a = new Art();
  const u = 0.2, v = 0.45, du = 1.6, dv = 0.95, H = 20;
  a.box(u - 0.05, v - 0.05, du + 0.1, dv + 0.1, 0, 3, 'stoned', { rim: true });
  a.box(u, v, du, dv, 3, H - 3, 'woodb', { top: false });
  for (let vv = v + 0.12; vv < v + dv - 0.04; vv += 0.12) a.seg([u + du, vv, 3.5], [u + du, vv, H], 'k-woodd-r', 0.6, ' opacity=".45"');
  const V = v + dv;
  rectV(a, V, u + 0.7, u + 0.92, 3, 16, 'woodd-l');
  rectV(a, V, u + 0.2, u + 0.46, 9, 15, 'win');
  rectV(a, V, u + 1.16, u + 1.42, 9, 15, 'win');
  a.box(u + 0.18, V, 0.3, 0.08, 7, 2.2, 'woodd', { cast: false });
  a.box(u + 1.14, V, 0.3, 0.08, 7, 2.2, 'woodd', { cast: false });
  const [fx1, fy1] = P(u + 0.33, V + 0.04, 9.6), [fx2, fy2] = P(u + 1.29, V + 0.04, 9.6);
  a.raw(`<circle cx="${f(fx1 - 3)}" cy="${f(fy1)}" r="1.5" class="fl3-t"/><circle cx="${f(fx1 + 1)}" cy="${f(fy1 - 0.5)}" r="1.5" class="fl2-t"/><circle cx="${f(fx2)}" cy="${f(fy2)}" r="1.5" class="fl1-t"/>`);
  roofU(a, u, v, du, dv, H, 20, 'roof', 'woodb', 0.09, () => a.box(u + 0.3, v + 0.12, 0.14, 0.14, H + 4, 18, 'stoned', { rim: true }));
  a.box(u + 1.7, v + 0.1, 0.14, 0.5, 0, 6, 'woodd', { rim: true }); // banc
  a.anchor('light', u + 0.81, V + 0.05, 17);
  return a.done(3);
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

// ---------------------------------------------------------------- registre des modèles

/** Construit l'art d'une entité (voir scene.js). Mis en cache par clé : un même modèle n'est dessiné qu'une fois. */
export function artFor(e) {
  switch (e.model) {
    case 'bastion': return bastion();
    case 'tour': return tour(!!e.variant);
    case 'lanterne': return lanterne();
    case 'cloture': return cloture(!!e.end);
    case 'caisse': return caisse(e.seed || 1);
    case 'glaciere': return glaciere();
    case 'etabli': return etabli();
    case 'atelier': return atelier(e.variant === 'abime');
    case 'erable': return erable(e.seed || 1);
    case 'registres': return registres();
    case 'maison': return maison();
    case 'epinette': return epinette(e.seed || 1, e.s || 1);
    case 'arbre': return arbre(e.seed || 1, e.m || 'leaf', e.s || 1);
    case 'buisson': return buisson(e.seed || 1, e.m || 'leaf');
    case 'rocher': return rocher(e.seed || 1);
    default: return caisse(1);
  }
}

export const MODEL_IDS = ['bastion', 'tour', 'lanterne', 'cloture', 'caisse', 'atelier', 'etabli', 'erable', 'glaciere', 'registres', 'maison'];

/** Hauteur approximative (px monde) au-dessus du sol, pour viser le haut d'un objet. */
export function artTop(art) { return art.y; }
export { pts };
