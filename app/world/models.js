// Modèles low-poly en aplats à trois tons (dessus -t, face +v -l, face +u -r). Repère local : (0,0,0) = coin
// arrière de l'emprise. Chaque fonction renvoie { svg, x, y, w, h, shadow, anchors } (voir iso.js : Art.done).
// Les 15 modèles du monde : bastion, tour, relais, lanterne, cloture, caisse, parcelle (sol), culture
// (courge, patate, blé), tunnel, atelier, etabli, erable, glaciere, registres, maison.
// Décor : epinette, arbre, buisson, rocher. Personnages (Fanal, Solène, Milo) : characterSVG().
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

// ---------------------------------------------------------------- Place du Bastion

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

/** Tour de signal. `reparee` : pylône complet et cristal ; sinon tronquée, cristal tombé au pied. */
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

/** Relais : stèle gravée qui reçoit les fils de lumière. Son cœur garde le Fil libre. */
export function relais() {
  const a = new Art();
  a.prism(0.5, 0.5, 0.44, 0, 4, 'stoned', 8, { rim: true });
  a.prism(0.5, 0.5, 0.33, 4, 4, 'stone', 8, { rim: true });
  const u = 0.33, v = 0.42, du = 0.34, dv = 0.18, z = 8, H = 36;
  a.box(u, v, du, dv, z, H, 'stone');
  // gravure (lignes courtes sur la face avant)
  const V = v + dv;
  for (let k = 0; k < 5; k++) a.seg([u + 0.05, V, z + 5 + k * 3.4], [u + du - 0.05 - (k % 2) * 0.08, V, z + 5 + k * 3.4], 'k-stoned-l', 0.7);
  // niche du cœur
  a.poly([[u + 0.09, V, z + 24], [u + du - 0.09, V, z + 24], [u + du - 0.09, V, z + 31], [(u + u + du) / 2, V, z + 34], [u + 0.09, V, z + 31]], 'wooddk-l');
  a.poly([[u + 0.12, V, z + 25], [u + du - 0.12, V, z + 25], [u + du - 0.12, V, z + 30.5], [(u + u + du) / 2, V, z + 33], [u + 0.12, V, z + 30.5]], 'ow-core');
  a.box(u - 0.03, v - 0.03, du + 0.06, dv + 0.06, z + H, 3, 'stoned', { rim: true });
  const [px, py] = P(0.5, 0.51, z + H + 3);
  a.spoly([[px, py - 9], [px - 5, py], [px, py + 1.5]], 'gold-l');
  a.spoly([[px, py - 9], [px, py + 1.5], [px + 5, py]], 'gold-r');
  a.castS(px, py - 9, z + H + 12);
  a.anchor('core', (u + u + du) / 2, V + 0.02, z + 29);
  a.anchor('light', (u + u + du) / 2, V + 0.02, z + 29);
  return a.done(3);
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

// ---------------------------------------------------------------- Champs

/** Sol d'une parcelle 2×2 (élément au ras du sol). */
export function parcelleSol() {
  const a = new Art();
  const u0 = 0.1, v0 = 0.1, s = 1.8;
  a.ext(...P(0, 2)); a.ext(...P(2, 0)); a.ext(...P(0, 0)); a.ext(...P(2, 2));
  let g = `<g transform="matrix(${HW},${HH},${-HW},${HH},0,0)" stroke-width=".02">`;
  g += `<rect x="${u0 - 0.08}" y="${v0 - 0.08}" width="${s + 0.16}" height="${s + 0.16}" rx=".26" class="grassd-t" opacity=".85" stroke="none"/>`;
  g += `<rect x="${u0}" y="${v0}" width="${s}" height="${s}" rx=".16" class="soil-t" stroke="none"/>`;
  for (let k = 0; k <= 4; k++) g += `<path d="M${u0 + 0.12},${f((0.24 + k * 0.4) * 100) / 100}H${u0 + s - 0.12}" class="k-soilf-t" stroke-width=".08" stroke-linecap="round"/>`;
  for (const pv of [0.44, 0.84, 1.24, 1.64]) g += `<path d="M${u0 + 0.12},${pv}H${u0 + s - 0.12}" class="k-soilr-t" stroke-width=".12" stroke-linecap="round"/>`;
  g += `<path d="M${u0 + 0.05},${v0 + s - 0.1}V${v0 + 0.05}H${u0 + s - 0.1}" class="k-soilf-t" stroke-width=".07" fill="none" stroke-linecap="round"/>`;
  g += '</g>';
  a.raw(g);
  const r = a.done(2);
  r.shadow = null;
  return r;
}

/** Culture sur une parcelle 2×2. `progress` = stade / stades nécessaires (0 à 1). */
export function culture(crop, progress, seed = 1) {
  const a = new Art();
  const R = rng(seed);
  a.ext(...P(0, 2)); a.ext(...P(2, 0)); a.ext(...P(0, 0, 4));
  const grid = crop === 'courge' ? [[0.55, 0.5], [1.45, 0.5], [0.55, 1.45], [1.45, 1.45]]
    : crop === 'patate' ? [[0.45, 0.44], [1.0, 0.44], [1.55, 0.44], [0.45, 1.24], [1.0, 1.24], [1.55, 1.24]]
      : [0.44, 0.84, 1.24, 1.64].flatMap((v) => [0.4, 0.8, 1.2, 1.6].map((u) => [u, v])).filter((_, i) => i % 2 === 0 || crop !== 'ble');
  grid.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  for (const [u, v] of grid) {
    const [x, y] = P(u + (R() - 0.5) * 0.05, v + (R() - 0.5) * 0.05);
    a.raw(`<g class="ow-plant">${plant(crop, progress, x, y, R)}</g>`);
    a.ext(x - 12, y - 24); a.ext(x + 12, y + 4);
  }
  const r = a.done(2);
  r.shadow = null;
  return r;
}

function plant(crop, p, x, y, R) {
  if (p <= 0) {
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4" ry="1.8" class="soilr-t"/><circle cx="${f(x - 1)}" cy="${f(y - 0.6)}" r=".9" class="woodb-t"/>`;
  }
  if (p < 0.5) {
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3" ry="1.4" class="soilr-t"/><path d="M${f(x)},${f(y - 0.5)}q-1.8,-2.6 -3.6,-2.2M${f(x)},${f(y - 0.5)}q1.6,-3 3.4,-2.8" class="k-sprout-l" stroke-width="1.3" stroke-linecap="round"/>`;
  }
  if (crop === 'ble') {
    const ripe = p >= 1;
    let s = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="5" ry="2" class="soilf-t" opacity=".5"/>`;
    for (let k = -2; k <= 2; k++) {
      const h = ripe ? 15 : 10;
      const tx = x + k * 2.1 + (R() - 0.5), ty = y - h - (2 - Math.abs(k)) * 1.6;
      s += `<path d="M${f(x + k * 0.8)},${f(y)}Q${f(x + k * 1.2)},${f(y - h * 0.55)} ${f(tx)},${f(ty)}" class="k-${ripe ? 'wheat' : 'sprout'}-${k < 0 ? 'l' : 'r'}" stroke-width="1"/>`;
      if (ripe) s += `<ellipse cx="${f(tx)}" cy="${f(ty - 2.2)}" rx="1.5" ry="3.4" transform="rotate(${k * 9} ${f(tx)} ${f(ty - 2.2)})" class="wheat-${k < 0 ? 't' : k === 0 ? 'l' : 'r'}"/>`;
    }
    return s;
  }
  const big = crop === 'courge' ? 1.35 : 1;
  const leaf = (dx, dy, w, cls) => `<path d="M${f(x)},${f(y)}Q${f(x + dx - w)},${f(y + dy * 0.4)} ${f(x + dx)},${f(y + dy)}Q${f(x + dx + w)},${f(y + dy * 0.5)} ${f(x)},${f(y)}Z" class="${cls}"/>`;
  let s = `<ellipse cx="${f(x)}" cy="${f(y + 0.5)}" rx="${f(7 * big)}" ry="${f(3 * big)}" class="leafd-r" opacity=".45"/>`;
  s += leaf(-7 * big, -4 * big, 3, 'leaf-l') + leaf(7 * big, -3.5 * big, 3, 'leaf-r') + leaf(-2 * big, -8 * big, 3.2, 'leafb-t') + leaf(3 * big, -7 * big, 3, 'leaf-t');
  if (p >= 1 && crop === 'courge') {
    s += `<ellipse cx="${f(x + 3)}" cy="${f(y - 1.5)}" rx="5.4" ry="4.2" class="squash-l"/><path d="M${f(x + 3)},${f(y - 5.7)}A5.4,4.2 0 0 1 ${f(x + 3)},${f(y + 2.7)}Z" class="squash-r"/><path d="M${f(x + 3)},${f(y - 5.6)}v-2.2" class="k-woodd-l" stroke-width="1.3"/><ellipse cx="${f(x + 1.4)}" cy="${f(y - 3)}" rx="1.6" ry="1.1" class="squash-t"/>`;
  } else if (p >= 1) {
    s += `<circle cx="${f(x - 2)}" cy="${f(y - 8)}" r="1.4" class="fl1-t"/><circle cx="${f(x + 2.5)}" cy="${f(y - 7)}" r="1.2" class="fl1-t"/>`;
  }
  return s;
}

/** Tunnel de culture : arceaux et film, emprise 1 (u) × 2 (v). */
export function tunnel() {
  const a = new Art();
  const v0 = 0.08, v1 = 1.92;
  a.box(0.1, v0, 0.07, v1 - v0, 0, 3, 'woodd', { rim: true });
  a.box(0.83, v0, 0.07, v1 - v0, 0, 3, 'woodd', { rim: true });
  const arch = [[0.14, 2], [0.22, 15], [0.5, 22], [0.78, 15], [0.86, 2]];
  const cls = ['canvas-t', 'canvas-t', 'canvas-l', 'canvas-r'];
  for (let k = 0; k < 4; k++) {
    const [ua, za] = arch[k], [ub, zb] = arch[k + 1];
    a.poly([[ua, v0, za], [ub, v0, zb], [ub, v1, zb], [ua, v1, za]], cls[k], ' fill-opacity=".86"');
  }
  for (const v of [v0, 0.54, 1.0, 1.46, v1]) {
    for (let k = 0; k < 4; k++) a.seg([arch[k][0], v, arch[k][1]], [arch[k + 1][0], v, arch[k + 1][1]], 'k-woodd-l', 0.8);
  }
  a.seg([0.5, v0, 22], [0.5, v1, 22], 'k-woodd-l', 0.8);
  // pignon avant (face +v) et porte
  a.poly([[0.14, v1, 2], [0.22, v1, 15], [0.5, v1, 22], [0.78, v1, 15], [0.86, v1, 2]], 'canvas-l', ' fill-opacity=".9"');
  a.poly([[0.4, v1, 2], [0.6, v1, 2], [0.6, v1, 14], [0.4, v1, 14]], 'woodd-l');
  for (const [u, v] of [[0.14, v0], [0.86, v0], [0.86, v1], [0.14, v1]]) a.cast(u, v, 2);
  a.cast(0.5, v0, 22); a.cast(0.5, v1, 22);
  return a.done(2);
}

// ---------------------------------------------------------------- Atelier

/** Atelier : emprise 2 (u) × 1 (v). `cond` : 'abime' tant que le secteur est à rallumer. */
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

// ---------------------------------------------------------------- Archives et Maison commune

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

// ---------------------------------------------------------------- personnages (couleurs propres : ils ne grisent jamais)

const C = {
  skin: '#e7b892', skinR: '#c9946f', hair: '#5a3b2a', pants: '#5e5b4d', pantsR: '#46443a',
  sage: '#5f8a63', sageR: '#466a4c', glass: '#3f8d8b', glassR: '#2c6b6a', hat: '#ebc56b', hatR: '#c9a14a',
  wood: '#8a5a3a', hay: '#e8c86f', hayR: '#c9a84e', brass: '#c99a4a', brassR: '#9c7434', dark: '#3c3a33',
};

/** Sprite debout d'un personnage. Pieds en (0, 0) ; boîte -16..16 × -50..4. */
export function characterSVG(kind) {
  if (kind === 'fanal') {
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
  const solene = kind === 'solene';
  const cloth = solene ? C.sage : C.glass, clothR = solene ? C.sageR : C.glassR;
  const hat = solene
    ? `<ellipse cx="0" cy="-29" rx="8.6" ry="2.6" fill="${C.hatR}"/><path d="M-4.4,-29 Q-4,-35 0,-35 Q4,-35 4.4,-29Z" fill="${C.hat}"/><path d="M-4.4,-29.6 Q0,-28.4 4.4,-29.6" stroke="${C.sage}" stroke-width="1.1" fill="none"/>`
    : `<path d="M-4.8,-27.5 Q-4.6,-33.6 0,-33.6 Q4.6,-33.6 4.8,-27.5Z" fill="${C.glass}"/><path d="M2,-28 L8.6,-27.4 L8,-26.2 L2,-26.8Z" fill="${C.glassR}"/>`;
  const tool = solene
    ? `<path d="M7,-13 L9.5,-6" stroke="${C.wood}" stroke-width="1.2"/><path d="M5,-7 h9 l-1.4,5.4 h-6.2z" fill="${C.hay}"/><path d="M9.5,-7 h4.5 l-1.4,5.4 h-3.1z" fill="${C.hayR}"/>`
    : `<rect x="5" y="-9" width="8" height="5.6" rx="1" fill="#58a9a4"/><rect x="9" y="-9" width="4" height="5.6" rx="1" fill="#2f6c71"/><path d="M7.4,-9 v-1.6 h3.2 v1.6" stroke="#64412e" fill="none" stroke-width=".9"/>`;
  return `<svg class="ow-sprite" viewBox="-16 -50 32 54" width="32" height="54" aria-hidden="true">
<ellipse cx="0" cy="0" rx="8" ry="3.2" class="ow-sprite-shadow"/>
<rect x="-3.8" y="-10" width="3" height="10" rx="1.3" fill="${C.pants}"/><rect x=".8" y="-10" width="3" height="10" rx="1.3" fill="${C.pantsR}"/>
<path d="M-6.4,-9 Q-7,-21.5 0,-22.6 Q7,-21.5 6.4,-9 Z" fill="${cloth}"/>
<path d="M.6,-22.6 Q7,-21.5 6.4,-9 L.6,-9Z" fill="${clothR}"/>
<path d="M-6,-19 Q-8.6,-15 -7.6,-11" stroke="${cloth}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M5.6,-19 Q7.6,-16 7,-12.4" stroke="${clothR}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<circle cx="0" cy="-26.4" r="4.9" fill="${C.skin}"/><path d="M.4,-31.3 A4.9,4.9 0 0 1 .4,-21.5Z" fill="${C.skinR}"/>
<path d="M-4.9,-27 Q-4.4,-31.6 0,-31.6 Q-3,-29.5 -4.9,-27Z" fill="${C.hair}"/>
${hat}${tool}
</svg>`;
}

// ---------------------------------------------------------------- registre des modèles

/** Construit l'art d'une entité (voir scene.js). Mis en cache par clé : un même modèle n'est dessiné qu'une fois. */
export function artFor(e) {
  switch (e.model) {
    case 'bastion': return bastion();
    case 'tour': return tour(!!e.variant);
    case 'relais': return relais();
    case 'lanterne': return lanterne();
    case 'cloture': return cloture(!!e.end);
    case 'caisse': return caisse(e.seed || 1);
    case 'glaciere': return glaciere();
    case 'etabli': return etabli();
    case 'parcelle': return parcelleSol();
    case 'culture': return culture(e.crop, e.progress, e.seed || 1);
    case 'tunnel': return tunnel();
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

export const MODEL_IDS = ['bastion', 'tour', 'relais', 'lanterne', 'cloture', 'caisse', 'parcelle', 'culture', 'tunnel', 'atelier', 'etabli', 'erable', 'glaciere', 'registres', 'maison'];

/** Hauteur approximative (px monde) au-dessus du sol, pour viser le haut d'un objet. */
export function artTop(art) { return art.y; }
export { pts };
