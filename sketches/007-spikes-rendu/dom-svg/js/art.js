// Bâtiments et décor isométriques dessinés à la main (primitives + détails).
// Repère local : (0,0,0) = coin arrière de l'emprise. Lumière unique en haut à gauche :
// dessus = -t (clair), face gauche = -l (mi-ombre), face droite = -r (ombre), ombre portée vers la droite.
import { Art, P, HW, HH, f, rng } from './iso.js';

const SQ2 = Math.SQRT2;
const arcFront = (cx, y, rx, ry) => `M${f(cx - rx)},${f(y)}A${f(rx)},${f(ry)} 0 0 0 ${f(cx + rx)},${f(y)}`;

function cyl(a, cu, cv, R, z, h, m, o = {}) {
  const [cx, cy] = a.p(cu, cv, z);
  const rx = R * HW * SQ2, ry = R * HH * SQ2, top = cy - h;
  a.ext(cx - rx, top - ry); a.ext(cx + rx, cy + ry);
  if (o.cast !== false) for (let k = 0; k < 12; k++) {
    const t = k / 12 * Math.PI * 2, du = Math.cos(t) * R, dv = Math.sin(t) * R;
    a.cast(cu + du, cv + dv, z); a.cast(cu + du, cv + dv, z + h);
  }
  a.raw(`<path class="${o.body || 'gm-' + m}" d="M${f(cx - rx)},${f(top)}V${f(cy)}A${f(rx)},${f(ry)} 0 0 0 ${f(cx + rx)},${f(cy)}V${f(top)}Z"/>`);
  if (o.top !== false) a.raw(`<ellipse class="${m}-t" cx="${f(cx)}" cy="${f(top)}" rx="${f(rx)}" ry="${f(ry)}"/>`);
  return { cx, cy, top, rx, ry };
}

const rectV = (a, V, u0, u1, z0, z1, cls, ex) => a.poly([[u0, V, z0], [u1, V, z0], [u1, V, z1], [u0, V, z1]], cls, ex);
const rectU = (a, U, v0, v1, z0, z1, cls, ex) => a.poly([[U, v0, z0], [U, v1, z0], [U, v1, z1], [U, v0, z1]], cls, ex);

// Toit à deux pans, faîtage parallèle à u. `mid` est dessiné entre le pan arrière et le pan avant (cheminée…)
function roofU(a, u, v, du, dv, z, rise, m, wall, ov = .07, mid = null, o = {}) {
  const u0 = u - ov, u1 = u + du + ov, v0 = v - ov, v1 = v + dv + ov, vm = v + dv / 2;
  for (const [x, y] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) a.cast(x, y, z);
  a.cast(u0, vm, z + rise); a.cast(u1, vm, z + rise);
  const g = o.glass ? ' glassy' : '';
  a.poly([[u0, v0, z], [u1, v0, z], [u1, vm, z + rise], [u0, vm, z + rise]], `${m}-r${g}`);
  a.poly([[u + du, v, z], [u + du, v + dv, z], [u + du, vm, z + rise]], `${wall}-r${g}`);
  if (mid) mid();
  a.poly([[u0, v1, z], [u1, v1, z], [u1, vm, z + rise], [u0, vm, z + rise]], `${m}-t${g}`);
  if (!o.glass) {
    a.poly([[u0, v1, z], [u1, v1, z], [u1, v1, z - 2.2], [u0, v1, z - 2.2]], `${m}-r`);
    a.poly([[u1, v1, z], [u1, vm, z + rise], [u1, vm, z + rise - 2.2], [u1, v1, z - 2.2]], `${m}-r`);
  }
  return { u0, u1, v0, v1, vm, z, rise };
}
const onSlope = (rf, uu, s) => [uu, rf.v1 + (rf.vm - rf.v1) * s, rf.z + rf.rise * s];

// Boule facettée (feuillage) : chaque facette est teintée selon son orientation par rapport à la lumière
function ball(a, cx, cy, r, m, R, n = 7) {
  const q = [];
  for (let k = 0; k < n; k++) {
    const t = -Math.PI / 2 + k / n * Math.PI * 2 + (R() - .5) * .3;
    const rr = r * (.9 + R() * .16);
    q.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * .9]);
  }
  const c = [cx - r * .2, cy - r * .26];
  for (let k = 0; k < n; k++) {
    const p1 = q[k], p2 = q[(k + 1) % n];
    const mx = (p1[0] + p2[0]) / 2 - cx, my = (p1[1] + p2[1]) / 2 - cy;
    const d = (-mx * .62 - my * .78) / (Math.hypot(mx, my) || 1);
    a.spoly([c, p1, p2], d > .3 ? `${m}-t` : d > -.45 ? `${m}-l` : `${m}-r`);
  }
}

function cone(a, cx, by, w, h, m) {
  const ap = [cx, by - h], L = [cx - w, by - w * .08], Rr = [cx + w, by - w * .08], F = [cx + w * .1, by + w * .36];
  a.spoly([ap, L, F], `${m}-l`);
  a.spoly([ap, F, Rr], `${m}-r`);
  a.spoly([ap, L, [cx - w * .42, by + w * .1]], `${m}-t`);
}

// ---------------------------------------------------------------- bâtiments

export function serre() {
  const a = new Art();
  const u = .14, v = .14, du = 1.72, dv = 1.72, b = 7, H = 25, rise = 19;
  a.box(u, v, du, dv, 0, b, 'stone', { rim: true });
  // parois du fond vues à travers le verre
  a.poly([[u, v, b], [u + du, v, b], [u + du, v, b + H], [u, v, b + H]], 'glassin-l', ' opacity=".7"');
  a.poly([[u, v, b], [u, v + dv, b], [u, v + dv, b + H], [u, v, b + H]], 'glassin-r', ' opacity=".7"');
  // planches de culture et plants
  const R = rng(11);
  for (const vv of [v + .22, v + dv - .62]) {
    a.box(u + .16, vv, du - .32, .4, b, 4, 'soilf');
    for (let k = 0; k < 4; k++) {
      const [x, y] = P(u + .38 + k * .36, vv + .2, b + 4);
      ball(a, x, y - 5, 5.6, k % 2 ? 'leaf' : 'leafb', R, 6);
      if (k % 2 === 0) a.raw(`<circle cx="${f(x + 2)}" cy="${f(y - 6)}" r="1.4" class="fl2-t"/>`);
    }
  }
  // vitrages avant
  a.cast(u, v, 0); a.cast(u + du, v + dv, b + H + rise); a.cast(u + du, v, b + H + rise); a.cast(u, v + dv, b + H);
  a.poly([[u, v + dv, b], [u + du, v + dv, b], [u + du, v + dv, b + H], [u, v + dv, b + H]], 'glass-l glassy');
  a.poly([[u + du, v, b], [u + du, v + dv, b], [u + du, v + dv, b + H], [u + du, v, b + H]], 'glass-r glassy');
  for (let k = 0; k <= 4; k++) {
    const uu = u + k * du / 4, vv = v + k * dv / 4;
    a.seg([uu, v + dv, b], [uu, v + dv, b + H], 'k-frame-t', k % 4 ? 1 : 1.6);
    a.seg([u + du, vv, b], [u + du, vv, b + H], 'k-frame-l', k % 4 ? 1 : 1.6);
  }
  a.seg([u, v + dv, b + H * .55], [u + du, v + dv, b + H * .55], 'k-frame-t', .8);
  a.seg([u + du, v, b + H * .55], [u + du, v + dv, b + H * .55], 'k-frame-l', .8);
  // porte
  const dc = u + du * .5;
  a.seg([dc - .16, v + dv, b], [dc - .16, v + dv, b + 17], 'k-woodd-l', 1.6);
  a.seg([dc + .16, v + dv, b], [dc + .16, v + dv, b + 17], 'k-woodd-l', 1.6);
  a.seg([dc - .16, v + dv, b + 17], [dc + .16, v + dv, b + 17], 'k-woodd-l', 1.6);
  // reflets
  for (const s of [.12, .62, 1.12]) a.poly([[u + s, v + dv, b + 2], [u + s + .1, v + dv, b + 2], [u + s + .34, v + dv, b + H - 2], [u + s + .24, v + dv, b + H - 2]], 'shine');
  // toit vitré
  const rf = roofU(a, u, v, du, dv, b + H, rise, 'glass', 'glass', .05, null, { glass: true });
  for (let k = 0; k <= 6; k++) { const uu = rf.u0 + k * (rf.u1 - rf.u0) / 6; a.seg(onSlope(rf, uu, 0), onSlope(rf, uu, 1), 'k-frame-t', k % 6 ? .9 : 1.5); }
  a.seg(onSlope(rf, rf.u0, 0), onSlope(rf, rf.u1, 0), 'k-frame-t', 1.5);
  a.seg([u + du, v, b + H], [u + du, rf.vm, b + H + rise], 'k-frame-l', 1.2);
  a.seg([u + du, v + dv, b + H], [u + du, rf.vm, b + H + rise], 'k-frame-l', 1.4);
  a.seg([u + du, rf.vm, b + H], [u + du, rf.vm, b + H + rise], 'k-frame-l', .9);
  for (const s of [.3, 1.0]) a.poly([onSlope(rf, rf.u0 + s, .1), onSlope(rf, rf.u0 + s + .12, .1), onSlope(rf, rf.u0 + s + .34, .9), onSlope(rf, rf.u0 + s + .22, .9)], 'shine');
  a.seg(onSlope(rf, rf.u0 - .02, 1), onSlope(rf, rf.u1 + .02, 1), 'k-tech-l', 2.6);
  return a.done();
}

export function silo() {
  const a = new Art();
  const cu = .5, cv = .5, R = .32, H = 64;
  cyl(a, cu, cv, R + .08, 0, 5, 'stoned', { body: 'stoned-l' });
  const c = cyl(a, cu, cv, R, 5, H - 5, 'metal', { top: false });
  const gy = P(cu, cv, 0)[1];
  for (const zz of [15, 28, 41, 54]) a.raw(`<path class="k-metal-r" stroke-width="1.1" d="${arcFront(c.cx, gy - zz, c.rx, c.ry)}"/>`);
  // échelle
  const lx = c.cx - c.rx * .72, lx2 = c.cx - c.rx * .42;
  a.raw(`<path class="k-woodd-l" stroke-width=".9" d="M${f(lx)},${f(gy - 4)}V${f(gy - H + 3)}M${f(lx2)},${f(gy - 2)}V${f(gy - H + 4)}"/>`);
  let rungs = '';
  for (let y = gy - 8; y > gy - H + 4; y -= 5) rungs += `M${f(lx)},${f(y)}L${f(lx2)},${f(y + 1.2)}`;
  a.raw(`<path class="k-woodd-l" stroke-width=".8" d="${rungs}"/>`);
  // dôme
  const yt = gy - H, rx = c.rx, ry = c.ry;
  a.ext(c.cx, yt - 19);
  a.raw(`<path class="gm-tech" d="M${f(c.cx - rx)},${f(yt)}A${f(rx)},${f(ry)} 0 0 0 ${f(c.cx + rx)},${f(yt)}C${f(c.cx + rx)},${f(yt - 11)} ${f(c.cx + rx * .45)},${f(yt - 18)} ${f(c.cx)},${f(yt - 18)}C${f(c.cx - rx * .45)},${f(yt - 18)} ${f(c.cx - rx)},${f(yt - 11)} ${f(c.cx - rx)},${f(yt)}Z"/>`);
  a.raw(`<path class="k-tech-r" stroke-width="1.6" d="${arcFront(c.cx, yt, rx, ry)}"/>`);
  a.raw(`<path class="shine" d="M${f(c.cx - rx * .62)},${f(yt - 4)}Q${f(c.cx - rx * .5)},${f(yt - 13)} ${f(c.cx - rx * .1)},${f(yt - 16)}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.6"/>`);
  a.raw(`<rect class="tech-r" x="${f(c.cx - 1.6)}" y="${f(yt - 23)}" width="3.2" height="6" rx="1"/>`);
  a.castS(c.cx, yt - 20, H + 20);
  // trémie et conduite
  a.box(.84, .6, .2, .26, 0, 11, 'woodb', { rim: true });
  const [hx, hy] = P(.94, .73, 11);
  a.raw(`<path class="k-tech-r" stroke-width="2.4" fill="none" d="M${f(c.cx + rx * .7)},${f(yt + 4)}Q${f(hx + 2)},${f(yt + 10)} ${f(hx)},${f(hy - 1)}"/>`);
  return a.done();
}

export function relais() {
  const a = new Art();
  a.box(.14, .14, .72, .72, 0, 10, 'stone', { rim: true });
  a.box(.22, .22, .56, .56, 10, 4, 'stoned', { rim: true });
  a.seg([.18, .86, 5], [.82, .86, 5], 'rune', 1.4);
  a.seg([.86, .18, 5], [.86, .82, 5], 'rune', 1.4);
  const z0 = 14, z1 = 98;
  const B = [[.3, .3], [.7, .3], [.7, .7], [.3, .7]], T = [[.44, .44], [.56, .44], [.56, .56], [.44, .56]];
  const L = (i, t) => [B[i][0] + (T[i][0] - B[i][0]) * t, B[i][1] + (T[i][1] - B[i][1]) * t, z0 + (z1 - z0) * t];
  const lv = [0, .22, .46, .72, 1];
  a.seg(L(0, 0), L(0, 1), 'k-panel-r', 1.4);
  for (let k = 0; k < 4; k++) {
    a.seg(L(0, lv[k]), L(1, lv[k + 1]), 'k-panel-r', .7); a.seg(L(1, lv[k]), L(0, lv[k + 1]), 'k-panel-r', .7);
    a.seg(L(0, lv[k]), L(3, lv[k + 1]), 'k-panel-r', .7); a.seg(L(3, lv[k]), L(0, lv[k + 1]), 'k-panel-r', .7);
  }
  a.seg(L(1, 0), L(1, 1), 'k-panel-r', 2); a.seg(L(3, 0), L(3, 1), 'k-panel-l', 2);
  for (let k = 0; k < 4; k++) {
    a.seg(L(3, lv[k]), L(2, lv[k + 1]), 'k-tech-l', .9); a.seg(L(2, lv[k]), L(3, lv[k + 1]), 'k-tech-l', .9);
    a.seg(L(2, lv[k]), L(1, lv[k + 1]), 'k-panel-l', .9); a.seg(L(1, lv[k]), L(2, lv[k + 1]), 'k-panel-l', .9);
  }
  for (const t of lv.slice(1)) { a.seg(L(3, t), L(2, t), 'k-tech-l', 1.1); a.seg(L(2, t), L(1, t), 'k-panel-l', 1.1); }
  a.seg(L(2, 0), L(2, 1), 'k-tech-t', 2.3);
  // panneaux solaires latéraux
  const pz = 62;
  a.seg(L(3, .58), [.0, .76, pz + 3], 'k-panel-l', 1.2);
  a.poly([[-.2, .56, pz], [.12, .56, pz], [.12, .96, pz + 7], [-.2, .96, pz + 7]], 'panel-t');
  a.seg([-.04, .56, pz], [-.04, .96, pz + 7], 'k-tech-l', .5); a.seg([-.2, .76, pz + 3.5], [.12, .76, pz + 3.5], 'k-tech-l', .5);
  a.seg(L(1, .58), [.78, .02, pz + 3], 'k-panel-r', 1.2);
  a.poly([[.58, -.2, pz], [.98, -.2, pz], [.98, .12, pz + 7], [.58, .12, pz + 7]], 'panel-l');
  a.seg([.78, -.2, pz], [.78, .12, pz + 7], 'k-tech-l', .5);
  a.box(.36, .36, .28, .28, z1, 3, 'woodb', { rim: true });
  for (const [u, v] of [[.3, .3], [.7, .3], [.7, .7], [.3, .7]]) a.cast(u, v, 14);
  a.cast(.5, .5, z1 + 34);
  a.ext(P(.5, .5, z1 + 40)[0], P(.5, .5, z1 + 40)[1]);
  const r = a.done(4);
  r.sub = { crystal: P(.5, .5, z1 + 19) };
  return r;
}

export function crystalSVG() {
  return `<svg class="art" viewBox="-40 -40 80 80" width="80" height="80" aria-hidden="true">
  <circle r="38" fill="url(#halo)" class="halo"/>
  <ellipse rx="15" ry="5" cy="2" fill="none" class="k-crys" stroke-width="1" opacity=".75"/>
  <polygon points="0,-17 -9,-1 1,4" class="crys-t"/><polygon points="0,-17 1,4 9,-1" class="crys-l"/>
  <polygon points="0,15 -9,-1 1,4" class="crys-l"/><polygon points="0,15 1,4 9,-1" class="crys-r"/>
  <polygon points="0,-17 -9,-1 -5,-3" fill="#fff" opacity=".55"/>
  <path d="M-15,2 A15,5 0 0 0 15,2" fill="none" class="k-crys" stroke-width="1.2"/>
  </svg>`;
}

export function entrepot() {
  const a = new Art();
  const u = .12, v = .1, du = 1.42, dv = 1.66, H = 30;
  a.box(u, v, du, dv, 0, 5, 'stoned');
  a.box(u, v, du, dv, 5, H - 5, 'woodb', { top: false });
  for (let uu = u + .14; uu < u + du - .05; uu += .14) a.seg([uu, v + dv, 5.5], [uu, v + dv, H], 'k-woodd-l', .6, ' opacity=".45"');
  for (let vv = v + .14; vv < v + dv - .05; vv += .14) a.seg([u + du, vv, 5.5], [u + du, vv, H], 'k-woodd-r', .6, ' opacity=".45"');
  a.seg([u + du, v + dv, 5], [u + du, v + dv, H], 'k-woodd-l', 2.2);
  a.seg([u, v + dv, 5], [u, v + dv, H], 'k-woodd-l', 2.2);
  a.seg([u + du, v, 5], [u + du, v, H], 'k-woodd-r', 2.2);
  // grande porte coulissante
  const d0 = u + .34, d1 = u + 1.06, dm = (d0 + d1) / 2, V = v + dv;
  rectV(a, V, d0, d1, 5, 24, 'woodd-l');
  a.seg([d0, V, 5], [dm, V, 24], 'k-woodb-l', 1.2); a.seg([dm, V, 5], [d0, V, 24], 'k-woodb-l', 1.2);
  a.seg([dm, V, 5], [d1, V, 24], 'k-woodb-l', 1.2); a.seg([d1, V, 5], [dm, V, 24], 'k-woodb-l', 1.2);
  a.seg([dm, V, 5], [dm, V, 24], 'k-wooddk-l', 1);
  for (const [p, q] of [[[d0, V, 24], [d1, V, 24]], [[d0, V, 5], [d0, V, 24]], [[d1, V, 5], [d1, V, 24]]]) a.seg(p, q, 'k-wooddk-l', 1.4);
  a.seg([d0 - .1, V, 26.5], [d1 + .1, V, 26.5], 'k-wooddk-l', 1.6);
  // fenêtre côté droit
  rectU(a, u + du, v + .5, v + .92, 14, 22, 'win');
  a.poly([[u + du, v + .5, 22], [u + du, v + .92, 22], [u + du, v + .92, 23.5], [u + du, v + .5, 23.5]], 'woodd-r');
  a.seg([u + du, v + .71, 14], [u + du, v + .71, 22], 'k-woodd-r', .8);
  // toit en tôle sauge + capteurs
  const rf = roofU(a, u, v, du, dv, H, 22, 'roof', 'woodb', .1);
  rectU(a, u + du, rf.vm - .14, rf.vm + .14, H + 4, H + 10, 'win2');
  for (let uu = rf.u0 + .09; uu < rf.u1 - .03; uu += .1) a.seg(onSlope(rf, uu, .02), onSlope(rf, uu, .97), 'k-roof-l', .55, ' opacity=".7"');
  a.poly([onSlope(rf, u + .22, .2), onSlope(rf, u + 1.02, .2), onSlope(rf, u + 1.02, .8), onSlope(rf, u + .22, .8)], 'panel-t');
  for (let k = 1; k < 4; k++) a.seg(onSlope(rf, u + .22 + k * .2, .2), onSlope(rf, u + .22 + k * .2, .8), 'k-tech-l', .5);
  a.seg(onSlope(rf, u + .22, .5), onSlope(rf, u + 1.02, .5), 'k-tech-l', .5);
  a.poly([onSlope(rf, u + .3, .26), onSlope(rf, u + .42, .26), onSlope(rf, u + .5, .74), onSlope(rf, u + .38, .74)], 'shine');
  a.seg(onSlope(rf, rf.u0 - .02, 1), onSlope(rf, rf.u1 + .02, 1), 'k-roofb-r', 2.4);
  // caisses
  a.box(1.66, 1.14, .26, .26, 0, 9, 'woodb', { rim: true });
  a.box(1.66, 1.46, .26, .26, 0, 9, 'woodb', { rim: true });
  a.box(1.68, 1.3, .22, .22, 9, 8, 'woodd', { rim: true });
  a.seg([1.66, 1.72, 4.5], [1.92, 1.72, 4.5], 'k-woodd-l', .7);
  return a.done();
}

function post(a, u, v) {
  a.box(u, v, .46, .56, 0, 29, 'stoned', { rim: true });
  a.box(u + .05, v + .05, .36, .46, 29, 3, 'stone', { rim: true });
  a.box(u + .15, v + .18, .16, .2, 32, 7, 'runelamp', { top: false, cast: false });
  a.poly([[u + .12, v + .15, 39], [u + .34, v + .15, 39], [u + .34, v + .41, 39], [u + .12, v + .41, 39]], 'stoned-t');
  const [x, y] = P(u + .23, v + .28, 35);
  a.raw(`<circle cx="${f(x)}" cy="${f(y)}" r="16" fill="url(#runeHalo)" class="halo"/>`);
}

export function muret(len, o = {}) {
  const a = new Art();
  const v = .24, dv = .4, H = 17;
  const s = o.start ? .46 : 0, e = o.end ? len - .46 : len;
  if (o.start) post(a, 0, v - .08);
  a.box(s, v, e - s, dv, 0, H, 'stone');
  const V = v + dv;
  for (let i = 1; i < 3; i++) a.seg([s, V, i * H / 3], [e, V, i * H / 3], 'k-stoned-l', .7);
  for (let i = 0; i < 3; i++) for (let uu = s + .2 + (i % 2) * .19; uu < e - .05; uu += .38) a.seg([uu, V, i * H / 3], [uu, V, (i + 1) * H / 3], 'k-stoned-l', .7);
  a.seg([s + .05, V, H * .5], [e - .05, V, H * .5], 'rune', 1.2);
  for (let uu = s + .07; uu + .26 <= e; uu += .5) a.box(uu, v + .04, .26, dv - .08, H, 6, 'stone', { rim: true });
  const R = rng(len * 13 + (o.start ? 3 : 7));
  for (let k = 0; k < len * 1.4; k++) {
    const uu = s + R() * (e - s - .3) + .1;
    a.poly([[uu, v + .02, H + .01], [uu + .22, v + .02, H + .01], [uu + .22, v + .2, H + .01]], 'leaf-t', ' opacity=".85"');
    if (R() < .5) a.poly([[uu, V, H], [uu + .18, V, H], [uu + .12, V, H - 5]], 'leaf-l');
  }
  if (o.end) post(a, len - .46, v - .08);
  return a.done();
}

export function atelier() {
  const a = new Art();
  const u = .15, v = .18, du = .7, dv = .64, H = 21;
  a.box(u, v, du, dv, 0, 4, 'stoned');
  a.box(u, v, du, dv, 4, H - 4, 'woodb', { top: false });
  for (let uu = u + .12; uu < u + du - .04; uu += .12) a.seg([uu, v + dv, 4.5], [uu, v + dv, H], 'k-woodd-l', .6, ' opacity=".45"');
  for (let vv = v + .12; vv < v + dv - .04; vv += .12) a.seg([u + du, vv, 4.5], [u + du, vv, H], 'k-woodd-r', .6, ' opacity=".45"');
  a.seg([u + du, v + dv, 4], [u + du, v + dv, H], 'k-woodd-l', 1.8);
  rectV(a, v + dv, u + .14, u + .36, 4, 17, 'woodd-l');
  a.seg([u + .14, v + dv, 17.5], [u + .36, v + dv, 17.5], 'k-wooddk-l', 1.2);
  rectU(a, u + du, v + .18, v + .46, 10, 16, 'win');
  a.seg([u + du, v + .32, 10], [u + du, v + .32, 16], 'k-woodd-r', .7);
  a.poly([[u + du, v + .14, 9], [u + du, v + .5, 9], [u + du, v + .5, 10], [u + du, v + .14, 10]], 'woodd-r');
  roofU(a, u, v, du, dv, H, 13, 'roofb', 'woodb', .08, () => {
    a.box(u + .46, v + .1, .13, .13, H + 2, 15, 'stoned', { rim: true });
  });
  a.box(.86, .68, .16, .16, 0, 7, 'woodd', { rim: true });
  const r = a.done(4);
  r.sub = { smoke: P(u + .525, v + .165, H + 18) };
  return r;
}

export function lanterne() {
  const a = new Art();
  a.box(.38, .38, .24, .24, 0, 3, 'stoned', { rim: true });
  a.box(.46, .46, .08, .08, 3, 20, 'woodd');
  a.box(.41, .41, .18, .18, 23, 1.5, 'roofb');
  a.poly([[.42, .59, 24.5], [.58, .59, 24.5], [.58, .59, 31], [.42, .59, 31]], 'lampg');
  a.poly([[.59, .42, 24.5], [.59, .58, 24.5], [.59, .58, 31], [.59, .42, 31]], 'lampg', ' opacity=".78"');
  a.seg([.5, .59, 24.5], [.5, .59, 31], 'k-roofb-l', .6);
  a.poly([[.38, .62, 31], [.62, .62, 31], [.5, .5, 36]], 'roofb-l');
  a.poly([[.62, .38, 31], [.62, .62, 31], [.5, .5, 36]], 'roofb-r');
  const [x, y] = P(.5, .5, 28);
  a.raw(`<circle cx="${f(x)}" cy="${f(y)}" r="22" fill="url(#lampHalo)" class="lamphalo"/>`);
  a.ext(x - 22, y - 22); a.ext(x + 22, y + 22);
  return a.done(1);
}

export function pont() {
  const a = new Art();
  a.box(.2, -.04, .6, .14, 0, 3, 'stoned', { cast: false });
  a.box(.2, .9, .6, .14, 0, 3, 'stoned', { cast: false });
  const post = (u, v) => a.box(u, v, .07, .07, 5, 9, 'woodd');
  post(.18, .02); post(.18, .5); post(.18, .9);
  a.seg([.215, .02, 13], [.215, .97, 13], 'k-woodd-l', 1.6);
  a.box(.2, .0, .6, 1.0, 3, 2.5, 'woodb', { rim: true });
  for (let vv = .1; vv < 1; vv += .11) a.seg([.21, vv, 5.6], [.79, vv, 5.6], 'k-woodd-t', .55, ' opacity=".6"');
  post(.76, .02); post(.76, .5); post(.76, .9);
  a.seg([.795, .02, 13], [.795, .97, 13], 'k-woodd-l', 1.8);
  return a.done();
}

export function botte() {
  const a = new Art();
  for (const [u, v, z] of [[.18, .3, 0], [.5, .48, 0], [.3, .36, 10]]) {
    a.box(u, v, .36, .26, z, 10, 'hay', { rim: true });
    a.seg([u + .12, v + .26, z], [u + .12, v + .26, z + 10], 'k-woodd-l', .7, ' opacity=".6"');
    a.seg([u + .26, v + .26, z], [u + .26, v + .26, z + 10], 'k-woodd-l', .7, ' opacity=".6"');
  }
  return a.done();
}

export function epouvantail() {
  const a = new Art();
  a.box(.47, .47, .06, .06, 0, 30, 'woodd');
  a.seg([.22, .78, 24], [.78, .22, 24], 'k-woodd-l', 2);
  const [x, y] = P(.5, .5, 30);
  a.raw(`<path d="M${x - 6},${y + 12} L${x - 5},${y - 1} L${x + 5},${y - 1} L${x + 6},${y + 12}Z" class="clothB-l"/><path d="M${x},${y - 1} L${x + 5},${y - 1} L${x + 6},${y + 12} L${x},${y + 12}Z" class="clothB-r"/>`);
  a.raw(`<circle cx="${x}" cy="${y - 4}" r="4" class="hay-t"/><ellipse cx="${x}" cy="${y - 7}" rx="7" ry="2" class="hat-l"/><path d="M${x - 3.5},${y - 7} Q${x},${y - 13} ${x + 3.5},${y - 7}Z" class="hat-t"/>`);
  a.ext(x - 8, y - 14); a.castS(x, y - 10, 40);
  return a.done();
}

// ---------------------------------------------------------------- végétation

export function arbre(seed, m = 'leaf', scale = 1) {
  const a = new Art();
  const R = rng(seed);
  a.box(.45, .45, .1, .1, 0, 15 * scale, 'woodd');
  const [cx, cy] = P(.5, .5);
  const s = scale * (.92 + R() * .2);
  ball(a, cx + 1, cy - 38 * s, 12.5 * s, m, R, 8);
  ball(a, cx - 8 * s, cy - 26 * s, 11 * s, m, R, 7);
  ball(a, cx + 8 * s, cy - 25 * s, 10.5 * s, m, R, 7);
  for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2; a.castS(cx + Math.cos(t) * 17 * s, cy - 30 * s + Math.sin(t) * 12 * s, 30 * s); }
  a.cast(.45, .45, 0); a.cast(.55, .55, 0);
  return a.done();
}

export function sapin(seed, scale = 1) {
  const a = new Art();
  const R = rng(seed);
  const s = scale * (.9 + R() * .25);
  a.box(.46, .46, .08, .08, 0, 9, 'woodd');
  const [cx, cy] = P(.5, .5);
  cone(a, cx, cy - 6 * s, 15 * s, 24 * s, 'leafd');
  cone(a, cx, cy - 18 * s, 12 * s, 22 * s, 'leafd');
  cone(a, cx, cy - 30 * s, 9 * s, 19 * s, 'leafd');
  cone(a, cx, cy - 41 * s, 5.5 * s, 14 * s, 'leafd');
  a.castS(cx - 15 * s, cy - 6 * s, 6 * s); a.castS(cx + 15 * s, cy - 6 * s, 6 * s); a.castS(cx, cy - 55 * s, 55 * s);
  return a.done();
}

export function buisson(seed, m = 'leaf') {
  const a = new Art();
  const R = rng(seed);
  const [cx, cy] = P(.5, .5);
  ball(a, cx - 5, cy - 6, 7, m, R, 6);
  ball(a, cx + 5, cy - 5, 6.5, m, R, 6);
  ball(a, cx, cy - 10, 6.5, m, R, 6);
  if (R() < .7) for (let k = 0; k < 4; k++) a.raw(`<circle cx="${f(cx - 7 + R() * 14)}" cy="${f(cy - 13 + R() * 10)}" r="1.3" class="${R() < .5 ? 'fl1' : 'fl2'}-t"/>`);
  a.castS(cx - 10, cy - 6, 6); a.castS(cx + 10, cy - 6, 6); a.castS(cx, cy - 16, 16);
  return a.done();
}

export function haie(n, seed) {
  const a = new Art();
  const R = rng(seed);
  a.box(.26, .06, .48, n - .12, 0, 10, 'leafd');
  for (let k = 0; k < n * 3; k++) {
    const [x, y] = P(.5, .2 + k * (n - .4) / (n * 3 - 1), 10);
    ball(a, x, y - 1, 4.8, 'leafd', R, 6);
    if (R() < .3) a.raw(`<circle cx="${f(x - 1 + R() * 3)}" cy="${f(y - 3)}" r="1.2" class="${R() < .5 ? 'fl1' : 'fl3'}-t"/>`);
  }
  return a.done();
}

// ---------------------------------------------------------------- cultures

export const PLANT_U = [.38, .7, 1.0, 1.3, 1.62];
export const PLANT_V = [.44, .84, 1.24, 1.64];

function plantSVG(stage, crop, x, y, R) {
  if (stage === 1) {
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3" ry="1.4" class="soilr-t"/><path d="M${f(x)},${f(y - .5)}q-1.6,-2.4 -3.2,-2M${f(x)},${f(y - .5)}q1.4,-2.8 3,-2.6" class="k-sprout-l" stroke-width="1.1" stroke-linecap="round"/>`;
  }
  if (stage === 2) {
    return `<path d="M${f(x)},${f(y)}Q${f(x - 6)},${f(y - 3)} ${f(x - 6.5)},${f(y - 8)}Q${f(x - 1.5)},${f(y - 6)} ${f(x)},${f(y)}Z" class="sprout-t"/>` +
      `<path d="M${f(x)},${f(y)}Q${f(x + 6)},${f(y - 3)} ${f(x + 6)},${f(y - 7.5)}Q${f(x + 1.5)},${f(y - 6)} ${f(x)},${f(y)}Z" class="sprout-r"/>` +
      `<path d="M${f(x)},${f(y)}Q${f(x - 2.4)},${f(y - 6)} ${f(x + .4)},${f(y - 10)}Q${f(x + 2.4)},${f(y - 5)} ${f(x)},${f(y)}Z" class="sprout-l"/>`;
  }
  if (crop === 'chou') {
    let s = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="7" ry="3" class="leafd-r" opacity=".55"/>`;
    s += `<path d="M${f(x - 7)},${f(y - 2)}Q${f(x - 8)},${f(y - 8)} ${f(x - 2)},${f(y - 6)}Z" class="cabbage-l"/><path d="M${f(x + 7)},${f(y - 2)}Q${f(x + 8)},${f(y - 8)} ${f(x + 2)},${f(y - 6)}Z" class="cabbage-r"/>`;
    s += `<circle cx="${f(x)}" cy="${f(y - 5.5)}" r="5" class="cabbage-l"/><path d="M${f(x)},${f(y - 10.5)}A5,5 0 0 1 ${f(x)},${f(y - .5)}Z" class="cabbage-r"/><circle cx="${f(x - 1.4)}" cy="${f(y - 7)}" r="2.4" class="cabbage-t"/>`;
    return s;
  }
  // blé mûr : touffe d'épis
  let s = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="5.5" ry="2" class="soilf-t" opacity=".5"/>`;
  for (let k = -2; k <= 2; k++) {
    const tx = x + k * 2.1 + (R() - .5), ty = y - 15 - (2 - Math.abs(k)) * 1.6;
    s += `<path d="M${f(x + k * .8)},${f(y)}Q${f(x + k * 1.2)},${f(y - 8)} ${f(tx)},${f(ty)}" class="k-wheat-${k < 0 ? 'l' : 'r'}" stroke-width="1"/>`;
    s += `<ellipse cx="${f(tx)}" cy="${f(ty - 2.2)}" rx="1.5" ry="3.4" transform="rotate(${k * 9} ${f(tx)} ${f(ty - 2.2)})" class="wheat-${k < 0 ? 't' : k === 0 ? 'l' : 'r'}"/>`;
  }
  return s;
}

export function plantsSVG(stage, crop, seed = 1) {
  if (!stage) return '';
  const R = rng(seed + stage * 31);
  const list = [];
  for (const v of PLANT_V) for (const u of PLANT_U) list.push([u, v]);
  list.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  return list.map(([u, v], i) => {
    const [x, y] = P(u + (R() - .5) * .05, v + (R() - .5) * .05);
    return `<g class="plant" style="--i:${i}">${plantSVG(stage, crop, x, y, R)}</g>`;
  }).join('');
}

// ---------------------------------------------------------------- personnages et ciel

export function villageoisSVG(kind) {
  const solene = kind === 'solene';
  const cloth = solene ? 'clothA' : 'clothB';
  const hat = solene
    ? `<ellipse cx="0" cy="-29" rx="8.6" ry="2.6" class="hat-l"/><path d="M-4.4,-29 Q-4,-35 0,-35 Q4,-35 4.4,-29Z" class="hat-t"/><path d="M-4.4,-29.6 Q0,-28.4 4.4,-29.6" class="k-clothA-l" stroke-width="1.1"/>`
    : `<path d="M-4.8,-27.5 Q-4.6,-33.6 0,-33.6 Q4.6,-33.6 4.8,-27.5Z" class="clothB-t"/><path d="M2,-28 L8.6,-27.4 L8,-26.2 L2,-26.8Z" class="clothB-r"/>`;
  const tool = solene
    ? `<path d="M7,-13 L9.5,-6" class="k-woodd-l" stroke-width="1.2"/><path d="M5,-7 h9 l-1.4,5.4 h-6.2z" class="hay-l"/><path d="M9.5,-7 h4.5 l-1.4,5.4 h-3.1z" class="hay-r"/>`
    : `<rect x="5" y="-9" width="8" height="5.6" rx="1" class="tech-l"/><rect x="9" y="-9" width="4" height="5.6" rx="1" class="tech-r"/><path d="M7.4,-9 v-1.6 h3.2 v1.6" class="k-wooddk-l" fill="none" stroke-width=".9"/>`;
  return `<svg class="art" viewBox="-14 -38 28 42" width="28" height="42" aria-hidden="true">
  <ellipse cx="0" cy="0" rx="8" ry="3.4" class="vshadow"/>
  <ellipse cx="0" cy="0" rx="11" ry="5" class="vring" fill="none" stroke-width="1.6"/>
  <rect x="-3.8" y="-10" width="3" height="10" rx="1.3" class="pants-l"/><rect x=".8" y="-10" width="3" height="10" rx="1.3" class="pants-r"/>
  <path d="M-6.4,-9 Q-7,-21.5 0,-22.6 Q7,-21.5 6.4,-9 Z" class="${cloth}-l"/>
  <path d="M.6,-22.6 Q7,-21.5 6.4,-9 L.6,-9Z" class="${cloth}-r"/>
  <path d="M-6,-19 Q-8.6,-15 -7.6,-11" class="k-${cloth}-l" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M5.6,-19 Q7.6,-16 7,-12.4" class="k-${cloth}-r" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <circle cx="0" cy="-26.4" r="4.9" class="skin-t"/><path d="M.4,-31.3 A4.9,4.9 0 0 1 .4,-21.5Z" class="skin-r"/>
  <path d="M-4.9,-27 Q-4.4,-31.6 0,-31.6 Q-3,-29.5 -4.9,-27Z" class="hair-t"/>
  ${hat}${tool}
  </svg>`;
}

export function nuageSVG(seed, w = 120) {
  const R = rng(seed);
  const n = 5 + Math.floor(R() * 3);
  let base = '', top = '', hl = '';
  for (let i = 0; i < n; i++) {
    const x = 14 + (i / (n - 1)) * (w - 28), r = 10 + Math.sin(i / (n - 1) * Math.PI) * 13 + R() * 5;
    base += `<circle cx="${f(x)}" cy="${f(44 - r * .55 + 5)}" r="${f(r)}"/>`;
    top += `<circle cx="${f(x)}" cy="${f(44 - r * .55)}" r="${f(r)}"/>`;
    if (i > 0 && i < n - 1) hl += `<circle cx="${f(x - r * .25)}" cy="${f(44 - r * .9)}" r="${f(r * .45)}"/>`;
  }
  return `<svg viewBox="0 0 ${w} 56" width="${w}" height="56" aria-hidden="true">
  <g class="cloudb-t">${base}<rect x="8" y="38" width="${w - 16}" height="11" rx="5.5"/></g>
  <g class="cloud-t">${top}<rect x="8" y="33" width="${w - 16}" height="11" rx="5.5"/></g>
  <g fill="#fff" opacity=".7">${hl}</g></svg>`;
}
