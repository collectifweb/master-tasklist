// Art procédural isométrique : tout est dessiné en Graphics puis « cuit » en textures.
// Convention : (c, r) = colonne/rangée de grille, z = hauteur en unités de case.
import { Graphics, Container, Rectangle, Matrix, FillGradient, Texture } from '../vendor/pixi.min.mjs';

export const TW = 64, TH = 32, ZH = 30, N = 12;
export const iso = (c, r, z = 0) => [(c - r) * TW / 2, (c + r) * TH / 2 - z * ZH];

export const PAL = {
  ink: 0x273026, inkSoft: 0x4f5848, paper: 0xfff8e8, cream: 0xf7e7bd, sun: 0xf3c879,
  soil: 0xaa6c43, soilDeep: 0x75472f, sage: 0x718c5d, sageDeep: 0x3f6047,
  glass: 0x58a9a4, glassDeep: 0x2d7473, ember: 0xbf5a38,
  grass: 0xa4bd74, grassLight: 0xb8cd86, grassDark: 0x8ba862,
  wood: 0xdcb47c, woodDark: 0xa9794a, stone: 0xcbbd9f, stoneDark: 0x968a72,
  path: 0xe8d6a8, pathEdge: 0xc9a874, water: 0x4fa3a2, waterLight: 0x8fd3c9,
};

// ---------- utilitaires couleur / hasard ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function shade(hex, f) {
  let r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  if (f < 1) { r *= f; g *= f; b *= f; }
  else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
  return (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255);
}
export function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- primitives iso ----------
const flat = (pts) => pts.flat();
function poly(g, pts, color, alpha = 1) { g.poly(flat(pts)).fill({ color, alpha }); }
function line(g, pts, width, color, alpha = 1, cap = 'round') {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke({ width, color, alpha, cap, join: 'round' });
}
// paramétrage (u,v) des faces visibles
const leftFace = (c0, c1, r1, z0, z1) => (u, v) => iso(c0 + (c1 - c0) * u, r1, z0 + (z1 - z0) * v);
const rightFace = (r0, r1, c1, z0, z1) => (u, v) => iso(c1, r1 - (r1 - r0) * u, z0 + (z1 - z0) * v); // u=0 coin avant
const topFace = (c0, r0, c1, r1, z) => (u, v) => iso(c0 + (c1 - c0) * u, r0 + (r1 - r0) * v, z);
function quad(g, f, u0, v0, u1, v1, color, alpha = 1) { poly(g, [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)], color, alpha); }

export function box(g, c0, r0, c1, r1, z0, z1, col, o = {}) {
  const top = o.top ?? shade(col, 1.14), left = o.left ?? col, right = o.right ?? shade(col, 0.74);
  const P = iso;
  poly(g, [P(c1, r0, z0), P(c1, r1, z0), P(c1, r1, z1), P(c1, r0, z1)], right, o.alpha ?? 1);
  poly(g, [P(c0, r1, z0), P(c1, r1, z0), P(c1, r1, z1), P(c0, r1, z1)], left, o.alpha ?? 1);
  if (!o.noTop) poly(g, [P(c0, r0, z1), P(c1, r0, z1), P(c1, r1, z1), P(c0, r1, z1)], top, o.alpha ?? 1);
  if (o.edge !== false) {
    const e = o.edgeColor ?? shade(col, 0.45);
    g.poly(flat([P(c0, r0, z1), P(c1, r0, z1), P(c1, r0, z0), P(c1, r1, z0), P(c0, r1, z0), P(c0, r1, z1)])).stroke({ width: 1.1, color: e, alpha: 0.55, join: 'round' });
    line(g, [P(c0, r1, z1), P(c1, r1, z1), P(c1, r0, z1)], 1, shade(col, 1.35), 0.7);
    line(g, [P(c1, r1, z1), P(c1, r1, z0)], 0.8, shade(col, 0.6), 0.5);
  }
}

// toit à deux pans, faîtage selon l'axe c (pente vers r0 et r1)
function gableRoofC(g, c0, r0, c1, r1, zEave, zRidge, col, o = {}) {
  const rm = (r0 + r1) / 2, P = iso;
  const back = shade(col, 0.82), front = o.front ?? col, gableCol = o.gable ?? shade(col, 0.7);
  poly(g, [P(c0, r0, zEave), P(c1, r0, zEave), P(c1, rm, zRidge), P(c0, rm, zRidge)], back);
  if (o.wallGable !== undefined) poly(g, [P(c1 - 0.06, r0 + 0.12, zEave), P(c1 - 0.06, r1 - 0.12, zEave), P(c1 - 0.06, rm, zRidge - 0.08)], o.wallGable);
  poly(g, [P(c0, rm, zRidge), P(c1, rm, zRidge), P(c1, r1, zEave), P(c0, r1, zEave)], front);
  // tranche du toit côté pignon
  line(g, [P(c1, r0, zEave), P(c1, rm, zRidge), P(c1, r1, zEave)], 3.2, gableCol, 1, 'round');
  line(g, [P(c0, rm, zRidge), P(c1, rm, zRidge)], 2.2, shade(col, 1.25), 0.9);
  line(g, [P(c0, r1, zEave), P(c1, r1, zEave)], 1.4, shade(col, 0.5), 0.6);
  return { rm, frontFace: (u, v) => iso(c0 + (c1 - c0) * u, rm + (r1 - rm) * v, zRidge + (zEave - zRidge) * v) };
}

// ---------- cuisson Graphics -> Texture ----------
export function bake(renderer, target, originX, originY, res = 3) {
  const b = target.getLocalBounds();
  const frame = new Rectangle(Math.floor(b.x) - 2, Math.floor(b.y) - 2, Math.ceil(b.width) + 4, Math.ceil(b.height) + 4);
  const texture = renderer.generateTexture({ target, frame, resolution: res, antialias: true });
  return { texture, ax: (originX - frame.x) / frame.width, ay: (originY - frame.y) / frame.height, w: frame.width, h: frame.height };
}

// =====================================================================
// SOL : herbe, ruisseau, chemins, parcelles, ombres portées (repère grille U=64)
// =====================================================================
const U = 64;
export const ISO_MATRIX = new Matrix(TW / 2 / U, TH / 2 / U, -TW / 2 / U, TH / 2 / U, 0, 0);

export function drawGround(layout) {
  const outer = new Container();
  const inner = new Container();
  inner.setFromMatrix(ISO_MATRIX);
  outer.addChild(inner);
  const g = new Graphics();
  inner.addChild(g);
  const R = rng(7);
  const S = N * U;
  // herbe
  g.rect(0, 0, S, S).fill({ color: PAL.grass });
  // marbrures
  for (let i = 0; i < 170; i++) {
    const rad = 14 + R() * 46, x = rad + R() * (S - 2 * rad), y = rad + R() * (S - 2 * rad);
    g.circle(x, y, rad).fill({ color: R() < 0.55 ? PAL.grassLight : PAL.grassDark, alpha: 0.18 + R() * 0.22 });
  }
  // liseré lumineux des bords avant
  line(g, [[0, S - 3], [S - 3, S - 3], [S - 3, 0]], 6, 0xd0df9b, 0.75, 'butt');
  line(g, [[3, 0], [3, S - 3]], 3, 0x7f9a58, 0.5, 'butt');

  // ombres portées (lumière en haut à gauche -> ombre vers +c)
  for (const s of layout.shadows) {
    g.roundRect(s.c * U + 4, s.r * U + 6, s.w * U + s.len * U, s.d * U - 8, 22).fill({ color: 0x2f3d22, alpha: s.alpha ?? 0.17 });
  }
  // ruisseau
  const st = layout.stream.map(([c, r]) => [c * U, r * U]);
  line(g, st, 54, 0x7e9452, 0.55);
  line(g, st, 42, 0xd5c08e, 1);
  line(g, st, 30, PAL.water, 1);
  line(g, st, 12, 0x6dbdb6, 0.9);
  g.circle(layout.spring[0] * U, layout.spring[1] * U, 34).fill({ color: 0xd5c08e });
  g.circle(layout.spring[0] * U, layout.spring[1] * U, 27).fill({ color: PAL.water });
  g.circle(layout.spring[0] * U - 5, layout.spring[1] * U - 5, 14).fill({ color: 0x6dbdb6, alpha: 0.9 });
  // reflets du ruisseau
  for (let i = 1; i < st.length - 1; i++) {
    const [x, y] = st[i];
    line(g, [[x - 6, y - 10], [x + 4, y + 10]], 3, 0xd8f1ea, 0.6);
  }

  // chemins (bordure puis surface)
  const plaza = layout.plaza;
  for (const seg of layout.paths) line(g, seg.map(([c, r]) => [c * U, r * U]), 46, PAL.pathEdge, 1);
  g.circle(plaza[0] * U, plaza[1] * U, 58).fill({ color: PAL.pathEdge });
  for (const seg of layout.paths) line(g, seg.map(([c, r]) => [c * U, r * U]), 37, PAL.path, 1);
  g.circle(plaza[0] * U, plaza[1] * U, 52).fill({ color: PAL.path });
  g.circle(plaza[0] * U, plaza[1] * U, 30).stroke({ width: 3, color: PAL.pathEdge, alpha: 0.7 });
  // gravier
  for (const seg of layout.paths) {
    for (let k = 0; k < seg.length - 1; k++) {
      const [a, b] = [seg[k], seg[k + 1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let i = 0; i < len * 7; i++) {
        const t = R(), off = (R() - 0.5) * 30;
        const x = (a[0] + (b[0] - a[0]) * t) * U + (b[1] !== a[1] ? off : 0);
        const y = (a[1] + (b[1] - a[1]) * t) * U + (b[0] !== a[0] ? off : 0);
        g.circle(x, y, 1.6 + R() * 2.2).fill({ color: R() < 0.5 ? 0xcdb183 : 0xf4e6c2, alpha: 0.75 });
      }
    }
  }
  // parcelles labourées à plat
  for (const p of layout.plots) {
    const x = p.c * U, y = p.r * U, w = p.w * U, h = p.d * U;
    const wet = p.stage === 0;
    g.roundRect(x + 5, y + 5, w - 10, h - 10, 16).fill({ color: wet ? 0x5f3a24 : 0x6f4429 });
    g.roundRect(x + 10, y + 10, w - 20, h - 20, 12).fill({ color: wet ? 0x7d4d2f : 0x93603a });
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const yy = y + 20 + i * ((h - 40) / (rows - 1));
      line(g, [[x + 18, yy - 3], [x + w - 18, yy - 3]], 8, wet ? 0x8c5a37 : 0xab7448, 1);
      line(g, [[x + 18, yy + 5], [x + w - 18, yy + 5]], 4, wet ? 0x4f301e : 0x6a4128, 0.9);
    }
  }
  // touffes et fleurs (en espace écran, au-dessus)
  const deco = new Graphics();
  outer.addChild(deco);
  for (let i = 0; i < 420; i++) {
    const c = 0.3 + R() * 11.4, r = 0.3 + R() * 11.4;
    if (layout.blocked(c, r)) continue;
    const [x, y] = iso(c, r);
    if (R() < 0.82) {
      const col = R() < 0.5 ? 0x7f9c55 : 0x92b062;
      deco.moveTo(x - 3, y).lineTo(x - 4, y - 4).moveTo(x, y).lineTo(x, y - 5).moveTo(x + 3, y).lineTo(x + 4, y - 4).stroke({ width: 1.1, color: col, cap: 'round' });
    } else {
      const col = [PAL.cream, PAL.sun, 0xf2f0e6, 0xd9c2e0][Math.floor(R() * 4)];
      deco.circle(x, y - 1.5, 1.7).fill({ color: col });
      deco.circle(x - 0.4, y - 1.9, 0.6).fill({ color: 0xffffff, alpha: 0.7 });
    }
  }
  return outer;
}

// =====================================================================
// SOCLE : tranche de terre continue + reflet + ombre sur l'eau
// =====================================================================
export const DEPTH = 66;
export function drawIslandBase() {
  const g = new Graphics();
  const R = rng(11);
  const L = iso(0, N), B = iso(N, N), Rr = iso(N, 0);
  const D = DEPTH;
  const off = (p, dy, dx = 0) => [p[0] + dx, p[1] + dy];
  // ombre portée sur l'eau
  poly(g, [off(Rr, D - 6, 6), off(B, D - 6, 6), off(B, D + 26, 58), off(Rr, D + 26, 58)], 0x1f5a5c, 0.28);
  poly(g, [off(L, D - 6), off(B, D - 6), off(B, D + 14, 18), off(L, D + 14, 18)], 0x1f5a5c, 0.18);
  // reflet (bandes d'alpha décroissant)
  for (let i = 0; i < 5; i++) {
    const a = 0.2 - i * 0.035, y0 = D + i * 9, y1 = D + (i + 1) * 9;
    poly(g, [off(L, y0), off(B, y0), off(B, y1), off(L, y1)], 0x8a5a3a, a);
    poly(g, [off(B, y0), off(Rr, y0), off(Rr, y1), off(B, y1)], 0x6a4430, a);
  }
  // faces : strates
  const bands = [
    { o0: 0, o1: 24, l: 0xbb7b4d, r: 0x955f3c },
    { o0: 24, o1: 45, l: 0xa3683f, r: 0x7f5033 },
    { o0: 45, o1: D, l: 0x87533a, r: 0x69412c },
  ];
  const wavy = (A, Bp, o, amp, seed) => {
    const pts = [], n = 28, rr = rng(seed);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = (i === 0 || i === n) ? 0 : (Math.sin(t * 19 + seed) * 0.5 + (rr() - 0.5)) * amp;
      pts.push([A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t + o + w]);
    }
    return pts;
  };
  for (const [A, Bp, key, seedBase] of [[L, B, 'l', 3], [B, Rr, 'r', 9]]) {
    for (let k = 0; k < bands.length; k++) {
      const bd = bands[k];
      const top = k === 0 ? wavy(A, Bp, bd.o0, 0, 1) : wavy(A, Bp, bd.o0, 3, seedBase + k);
      const bot = k === bands.length - 1 ? wavy(A, Bp, bd.o1, 0, 1) : wavy(A, Bp, bd.o1, 3, seedBase + k + 1);
      poly(g, [...top, ...bot.reverse()], bd[key]);
    }
    // cailloux
    for (let i = 0; i < 46; i++) {
      const t = 0.02 + R() * 0.96, o = 26 + R() * (D - 32);
      const x = A[0] + (Bp[0] - A[0]) * t, y = A[1] + (Bp[1] - A[1]) * t + o;
      const rx = 2.5 + R() * 4.5, ry = rx * (0.55 + R() * 0.2);
      g.ellipse(x, y + 1, rx, ry).fill({ color: key === 'l' ? 0x6d4330 : 0x553424, alpha: 0.55 });
      g.ellipse(x, y, rx, ry).fill({ color: key === 'l' ? 0xcaa47c : 0xa7845f, alpha: 0.85 });
    }
    // racines
    for (let i = 0; i < 16; i++) {
      const t = 0.03 + R() * 0.94;
      const x = A[0] + (Bp[0] - A[0]) * t, y = A[1] + (Bp[1] - A[1]) * t + 8;
      const len = 7 + R() * 14;
      g.moveTo(x, y).quadraticCurveTo(x + (R() - 0.5) * 6, y + len * 0.6, x + (R() - 0.5) * 5, y + len).stroke({ width: 1.1, color: 0x5d3b26, alpha: 0.55, cap: 'round' });
    }
    // lèvre d'herbe avec coulures
    const lipTop = wavy(A, Bp, 0, 0, 1);
    const lipBot = [];
    const n = 40, rr = rng(seedBase * 13);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let o = 5 + rr() * 3;
      if (rr() < 0.22) o += 5 + rr() * 6;
      if (i === 0 || i === n) o = 4;
      lipBot.push([A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t + o]);
    }
    poly(g, [...lipTop, ...lipBot.reverse()], key === 'l' ? 0x87a55a : 0x6d8a48);
    line(g, [A, Bp], 2, 0xd3e19e, 0.9, 'butt');
    // ligne d'eau humide
    line(g, [off(A, D - 3), off(Bp, D - 3)], 5, 0x4a2f20, 0.35, 'butt');
  }
  // arête avant (coin)
  line(g, [B, off(B, D)], 1.2, 0x5a3826, 0.45, 'butt');
  return g;
}

export function drawFoam(seed) {
  const g = new Graphics();
  const R = rng(seed);
  const L = iso(0, N), B = iso(N, N), Rr = iso(N, 0), D = DEPTH;
  for (const [A, Bp] of [[L, B], [B, Rr]]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push([A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t + D + 2 + Math.sin(t * 40 + seed) * 1.6]);
    }
    line(g, pts, 3, 0xf4fbf7, 0.85);
    for (let i = 0; i < 22; i++) {
      const t = R();
      g.ellipse(A[0] + (Bp[0] - A[0]) * t + 4, A[1] + (Bp[1] - A[1]) * t + D + 7 + R() * 4, 3 + R() * 6, 1 + R() * 0.8).fill({ color: 0xeaf7f2, alpha: 0.6 });
    }
  }
  return g;
}

// cascade (texture répétable verticalement)
export function drawFallStreaks() {
  const g = new Graphics();
  g.rect(0, 0, 32, 64).fill({ color: 0x5fb3ae });
  const R = rng(5);
  for (let i = 0; i < 9; i++) {
    const x = 3 + R() * 26, y = R() * 64, h = 10 + R() * 22;
    g.roundRect(x, y, 2.2, h, 1).fill({ color: 0xe8f7f2, alpha: 0.75 });
    if (y + h > 64) g.roundRect(x, y - 64, 2.2, h, 1).fill({ color: 0xe8f7f2, alpha: 0.75 });
  }
  return g;
}

// =====================================================================
// FOND : eau, rive lointaine (l'Orée), vaguelettes
// =====================================================================
export function drawRipples() {
  const g = new Graphics();
  g.rect(0, 0, 256, 160).fill({ color: 0xffffff, alpha: 0.001 });
  const R = rng(21);
  for (let i = 0; i < 11; i++) {
    const x = R() * 236, y = 8 + R() * 144, w = 10 + R() * 22;
    g.moveTo(x, y).quadraticCurveTo(x + w / 2, y - 3, x + w, y).stroke({ width: 1.5, color: 0xe9fbf6, alpha: 0.22 + R() * 0.2, cap: 'round' });
  }
  return g;
}

export function drawShore(width) {
  const g = new Graphics();
  const R = rng(33);
  const layer = (base, step, hMin, hVar, col, wave) => {
    g.moveTo(-40, base + 20);
    for (let x = -40; x <= width + 40; x += step) {
      const h = hMin + R() * hVar + Math.sin((x / width) * Math.PI * 2 * wave) * 8;
      g.lineTo(x, base - h * 0.32).lineTo(x + step / 2, base - h).lineTo(x + step, base - h * 0.32);
    }
    g.lineTo(width + 40, base + 20).closePath().fill({ color: col });
  };
  layer(72, 14, 28, 26, 0x86ab9b, 3);
  layer(88, 18, 24, 30, 0x5f8a6f, 2);
  g.rect(-40, 96, width + 80, 12).fill({ color: 0x5f8a6f });
  g.rect(-40, 104, width + 80, 4).fill({ color: 0xc9d7b2, alpha: 0.85 });
  return g;
}

export function drawCloud(seed) {
  const g = new Graphics();
  const R = rng(seed);
  const blobs = [];
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) blobs.push([i * 22 + R() * 8, -R() * 18 - (i > 0 && i < n - 1 ? 12 : 0), 18 + R() * 14]);
  for (const [x, y, r] of blobs) g.circle(x, y + 6, r).fill({ color: 0xd9e4e2 });
  for (const [x, y, r] of blobs) g.circle(x - 2, y, r).fill({ color: 0xfffdf6 });
  g.roundRect(-14, -4, (n - 1) * 22 + 30, 22, 11).fill({ color: 0xfffdf6 });
  return g;
}

// =====================================================================
// BÂTIMENTS (origine = coin haut de l'emprise, en coordonnées locales)
// =====================================================================
export function drawEntrepot() {
  const g = new Graphics();
  const W = PAL.wood;
  box(g, 0.12, 0.14, 1.88, 1.86, 0, 1.05, W, { right: 0xb88d58, left: W });
  // planches verticales
  const lf = leftFace(0.12, 1.88, 1.86, 0, 1.05), rf = rightFace(0.14, 1.86, 1.88, 0, 1.05);
  for (let i = 1; i < 10; i++) { line(g, [lf(i / 10, 0.02), lf(i / 10, 0.98)], 0.8, 0x9b7044, 0.35); line(g, [rf(i / 10, 0.02), rf(i / 10, 0.98)], 0.8, 0x7a5532, 0.35); }
  // poteaux d'angle
  box(g, 1.78, 1.76, 1.92, 1.9, 0, 1.08, 0x8b6038, { edge: false });
  box(g, 0.08, 1.76, 0.22, 1.9, 0, 1.08, 0x8b6038, { edge: false });
  box(g, 1.78, 0.1, 1.92, 0.24, 0, 1.08, 0x8b6038, { edge: false });
  // grande porte
  quad(g, lf, 0.3, 0, 0.7, 0.78, 0x8a5c36);
  quad(g, lf, 0.33, 0.03, 0.67, 0.75, 0x9e6c41);
  line(g, [lf(0.33, 0.03), lf(0.67, 0.75)], 1.6, PAL.cream, 0.85);
  line(g, [lf(0.67, 0.03), lf(0.33, 0.75)], 1.6, PAL.cream, 0.85);
  line(g, [lf(0.5, 0.03), lf(0.5, 0.75)], 1, 0x6e4a2c, 0.6);
  // fenêtre côté droit
  quad(g, rf, 0.35, 0.45, 0.65, 0.8, PAL.cream);
  quad(g, rf, 0.38, 0.49, 0.62, 0.76, 0x4d6d68);
  line(g, [rf(0.5, 0.49), rf(0.5, 0.76)], 1, PAL.cream, 0.9);
  // toit
  const roof = gableRoofC(g, -0.02, 0.02, 2.02, 1.98, 0.98, 1.8, 0xb0663f, { wallGable: 0xc49a63 });
  // tuiles
  for (let i = 1; i < 6; i++) line(g, [roof.frontFace(0, i / 6), roof.frontFace(1, i / 6)], 0.9, 0x86482b, 0.45);
  // panneaux solaires
  for (let k = 0; k < 3; k++) {
    const u0 = 0.1 + k * 0.28, u1 = u0 + 0.24;
    quad(g, roof.frontFace, u0, 0.18, u1, 0.78, 0x2d6f70);
    quad(g, roof.frontFace, u0 + 0.015, 0.21, u1 - 0.015, 0.75, PAL.glass);
    line(g, [roof.frontFace(u0 + 0.12, 0.21), roof.frontFace(u0 + 0.12, 0.75)], 0.8, 0x2d6f70, 0.8);
    line(g, [roof.frontFace(u0 + 0.02, 0.48), roof.frontFace(u1 - 0.02, 0.48)], 0.8, 0x2d6f70, 0.8);
    line(g, [roof.frontFace(u0 + 0.03, 0.26), roof.frontFace(u0 + 0.1, 0.4)], 1.4, 0xd8f4ef, 0.7);
  }
  return g;
}

export function drawSerre() {
  const g = new Graphics();
  const frame = 0xf3ecdc;
  box(g, 0.08, 0.08, 1.92, 1.92, 0, 0.2, 0xd9ccb0);
  // parois du fond (vues à travers)
  const P = iso;
  poly(g, [P(0.1, 0.1, 0.2), P(1.9, 0.1, 0.2), P(1.9, 0.1, 0.98), P(0.1, 0.1, 0.98)], 0x9fd6cf, 0.35);
  poly(g, [P(0.1, 0.1, 0.2), P(0.1, 1.9, 0.2), P(0.1, 1.9, 0.98), P(0.1, 0.1, 0.98)], 0x8fcac3, 0.35);
  // plantes à l'intérieur
  const R = rng(4);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const c = 0.4 + i * 0.38, r = 0.45 + j * 0.5;
    const [x, y] = iso(c, r, 0.2);
    g.circle(x, y - 6, 7 + R() * 2).fill({ color: 0x5f8f4c });
    g.circle(x - 2, y - 9, 5).fill({ color: 0x86b363 });
    if (R() < 0.5) g.circle(x + 3, y - 8, 1.8).fill({ color: 0xe9a64a });
  }
  // parois avant en verre
  const lf = leftFace(0.1, 1.9, 1.9, 0.2, 0.98), rf = rightFace(0.1, 1.9, 1.9, 0.2, 0.98);
  quad(g, lf, 0, 0, 1, 1, 0x86cbc4, 0.42);
  quad(g, rf, 0, 0, 1, 1, 0x5ea9a3, 0.48);
  for (let i = 0; i <= 5; i++) { line(g, [lf(i / 5, 0), lf(i / 5, 1)], 1.3, frame, 0.95); line(g, [rf(i / 5, 0), rf(i / 5, 1)], 1.3, frame, 0.95); }
  line(g, [lf(0, 0.5), lf(1, 0.5)], 1, frame, 0.8); line(g, [rf(0, 0.5), rf(1, 0.5)], 1, frame, 0.8);
  // porte
  quad(g, lf, 0.4, 0, 0.6, 0.85, 0x3f7f7a, 0.5);
  // toit de verre
  const rm = 1.0, zE = 0.98, zR = 1.62;
  poly(g, [P(0.04, 0.04, zE), P(1.96, 0.04, zE), P(1.96, rm, zR), P(0.04, rm, zR)], 0x9fd3cc, 0.5);
  poly(g, [P(1.9, 0.1, zE), P(1.9, 1.9, zE), P(1.9, rm, zR)], 0x6db5ae, 0.55);
  const ff = (u, v) => iso(0.04 + 1.92 * u, rm + (1.96 - rm) * v, zR + (zE - zR) * v);
  quad(g, ff, 0, 0, 1, 1, 0xbfe9e2, 0.55);
  for (let i = 0; i <= 6; i++) line(g, [ff(i / 6, 0), ff(i / 6, 1)], 1.2, frame, 0.95);
  line(g, [ff(0, 0.5), ff(1, 0.5)], 1, frame, 0.8);
  line(g, [P(0.04, rm, zR), P(1.96, rm, zR)], 2.4, frame, 1);
  line(g, [P(1.96, 0.04, zE), P(1.96, rm, zR), P(1.96, 1.96, zE)], 2, frame, 1);
  line(g, [P(0.04, 1.96, zE), P(1.96, 1.96, zE)], 1.8, frame, 1);
  // reflets du soleil
  line(g, [ff(0.15, 0.15), ff(0.32, 0.8)], 3, 0xffffff, 0.55);
  line(g, [ff(0.23, 0.12), ff(0.36, 0.5)], 1.6, 0xffffff, 0.5);
  line(g, [ff(0.7, 0.2), ff(0.82, 0.7)], 2.2, 0xffffff, 0.4);
  // contour
  g.poly(flat([P(0.04, 0.04, zE), P(0.04, rm, zR), P(1.96, rm, zR), P(1.96, 0.04, zE), P(1.92, 0.08, 0), P(1.92, 1.92, 0), P(0.08, 1.92, 0), P(0.04, 1.96, zE)])).stroke({ width: 1, color: 0x2d5f5c, alpha: 0.35, join: 'round' });
  return g;
}

export function drawSilo() {
  const g = new Graphics();
  const [cx, cy] = iso(0.5, 0.5);
  const rx = 19, ry = 9.5, h = 2.5 * ZH;
  // socle
  box(g, 0.1, 0.1, 0.9, 0.9, 0, 0.12, PAL.stone);
  const by = cy - 0.12 * ZH;
  const grad = new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, textureSpace: 'local', colorStops: [
    { offset: 0, color: '#d8c7a2' }, { offset: 0.28, color: '#f4e8cb' }, { offset: 0.62, color: '#d6c29a' }, { offset: 1, color: '#9d8a68' }] });
  g.rect(cx - rx, by - h, rx * 2, h).fill(grad);
  g.ellipse(cx, by, rx, ry).fill(grad);
  // nervures
  for (let i = 1; i < 9; i++) {
    const y = by - (h * i) / 9;
    g.moveTo(cx - rx, y).bezierCurveTo(cx - rx, y + ry * 1.33, cx + rx, y + ry * 1.33, cx + rx, y).stroke({ width: 0.9, color: 0x8f7c5a, alpha: 0.35 });
  }
  // bandes sauge
  for (const yy of [by - h * 0.78, by - h * 0.2]) {
    g.moveTo(cx - rx, yy).bezierCurveTo(cx - rx, yy + ry * 1.33, cx + rx, yy + ry * 1.33, cx + rx, yy)
      .lineTo(cx + rx, yy - 6).bezierCurveTo(cx + rx, yy - 6 + ry * 1.33, cx - rx, yy - 6 + ry * 1.33, cx - rx, yy - 6).closePath().fill({ color: PAL.sage });
  }
  // échelle
  const lx = cx - 7;
  line(g, [[lx, by + 4], [lx, by - h - 2]], 1.1, 0x5b4a3a, 0.9);
  line(g, [[lx + 5, by + 5], [lx + 5, by - h - 1]], 1.1, 0x5b4a3a, 0.9);
  for (let y = by; y > by - h; y -= 6) line(g, [[lx, y], [lx + 5, y + 1]], 0.9, 0x5b4a3a, 0.8);
  // dôme
  const dome = new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, textureSpace: 'local', colorStops: [
    { offset: 0, color: '#c47a4a' }, { offset: 0.3, color: '#d99161' }, { offset: 1, color: '#8f5233' }] });
  const ty = by - h;
  g.ellipse(cx, ty, rx + 1.5, ry + 0.8).fill({ color: 0x8f5233 });
  g.moveTo(cx - rx - 1.5, ty).bezierCurveTo(cx - rx, ty - 22, cx + rx, ty - 22, cx + rx + 1.5, ty).bezierCurveTo(cx + rx, ty + ry, cx - rx, ty + ry, cx - rx - 1.5, ty).fill(dome);
  g.roundRect(cx - 3.5, ty - 21, 7, 6, 2).fill({ color: 0x7a4529 });
  g.moveTo(cx - 9, ty - 9).quadraticCurveTo(cx - 5, ty - 17, cx + 1, ty - 18).stroke({ width: 2, color: 0xf5c9a4, alpha: 0.6, cap: 'round' });
  // trappe
  g.roundRect(cx + 5, by - 20, 8, 14, 2).fill({ color: 0x8e7a59 });
  // contour
  g.moveTo(cx - rx, ty).lineTo(cx - rx, by).moveTo(cx + rx, ty).lineTo(cx + rx, by).stroke({ width: 1, color: 0x5b4a3a, alpha: 0.45 });
  return g;
}

export function drawTour() {
  const g = new Graphics();
  box(g, 0.12, 0.12, 0.88, 0.88, 0, 0.32, PAL.stone, { right: 0x9e927a });
  const zb = 0.32, zt = 3.15;
  const b0 = 0.2, b1 = 0.8, t0 = 0.38, t1 = 0.62;
  const leg = 0x5e4b39;
  const P = iso;
  // jambe arrière
  line(g, [P(b0, b0, zb), P(t0, t0, zt)], 2, shade(leg, 0.7));
  // contreventements faces visibles
  const levels = [zb, 1.05, 1.8, 2.5, zt];
  const lerp = (a, b, t) => a + (b - a) * t;
  const at = (z) => { const t = (z - zb) / (zt - zb); return [lerp(b0, t0, t), lerp(b1, t1, t)]; };
  for (let i = 0; i < levels.length - 1; i++) {
    const [lo0, lo1] = at(levels[i]), [hi0, hi1] = at(levels[i + 1]);
    // face gauche (r = max)
    line(g, [P(lo0, lo1, levels[i]), P(hi1, hi1, levels[i + 1])], 1.1, 0x7a644d, 0.9);
    line(g, [P(lo1, lo1, levels[i]), P(hi0, hi1, levels[i + 1])], 1.1, 0x7a644d, 0.9);
    // face droite (c = max)
    line(g, [P(lo1, lo0, levels[i]), P(hi1, hi1, levels[i + 1])], 1.1, 0x5c4a39, 0.9);
    line(g, [P(lo1, lo1, levels[i]), P(hi1, hi0, levels[i + 1])], 1.1, 0x5c4a39, 0.9);
    line(g, [P(hi0, hi1, levels[i + 1]), P(hi1, hi1, levels[i + 1]), P(hi1, hi0, levels[i + 1])], 1.3, leg, 1);
  }
  // jambes avant
  line(g, [P(b0, b1, zb), P(t0, t1, zt)], 2.6, leg);
  line(g, [P(b1, b0, zb), P(t1, t0, zt)], 2.6, shade(leg, 0.8));
  line(g, [P(b1, b1, zb), P(t1, t1, zt)], 2.8, shade(leg, 1.1));
  // plateforme
  box(g, 0.3, 0.3, 0.7, 0.7, zt, zt + 0.12, PAL.wood);
  // panneau solaire incliné
  const sp = [P(0.66, 0.2, zt + 0.25), P(0.86, 0.38, zt + 0.42), P(0.86, 0.62, zt + 0.42), P(0.66, 0.44, zt + 0.25)];
  poly(g, sp, PAL.glassDeep);
  line(g, [P(0.7, 0.28, zt + 0.15), P(0.62, 0.45, zt + 0.12)], 1.4, leg);
  // cristal-lanterne du relais
  const [cx, cy] = P(0.5, 0.5, zt + 0.12);
  const top = cy - 30, mid = cy - 15;
  poly(g, [[cx, top], [cx - 9, mid], [cx, cy - 2]], 0x8fe0d6);
  poly(g, [[cx, top], [cx + 9, mid], [cx, cy - 2]], 0x3c938d);
  poly(g, [[cx - 9, mid], [cx, mid + 4], [cx, cy - 2]], 0x5fbab2);
  poly(g, [[cx + 9, mid], [cx, mid + 4], [cx, cy - 2]], 0x2d7473);
  line(g, [[cx - 3, top + 6], [cx - 6, mid - 1]], 1.5, 0xffffff, 0.75);
  g.poly([cx, top, cx - 9, mid, cx, cy - 2, cx + 9, mid]).stroke({ width: 1, color: 0x1f5654, alpha: 0.6, join: 'round' });
  // antenne
  line(g, [[cx + 4, top + 4], [cx + 4, top - 12]], 1, leg);
  g.circle(cx + 4, top - 13, 1.8).fill({ color: PAL.sun });
  return g;
}

export function drawAtelier() {
  const g = new Graphics();
  box(g, 0.14, 0.16, 0.86, 0.84, 0, 0.78, 0xd2a56b, { right: 0xa97e4c });
  const lf = leftFace(0.14, 0.86, 0.84, 0, 0.78), rf = rightFace(0.16, 0.84, 0.86, 0, 0.78);
  for (let i = 1; i < 5; i++) { line(g, [lf(0, i / 5), lf(1, i / 5)], 0.8, 0x8f6640, 0.4); line(g, [rf(0, i / 5), rf(1, i / 5)], 0.8, 0x6e4c2e, 0.4); }
  quad(g, lf, 0.3, 0, 0.62, 0.72, 0x7a5232);
  g.circle(...lf(0.56, 0.36), 1).fill({ color: PAL.sun });
  quad(g, rf, 0.3, 0.38, 0.7, 0.74, PAL.cream);
  quad(g, rf, 0.34, 0.42, 0.66, 0.7, 0x55716a);
  // cheminée (avant le toit pour l'arrière)
  const roof = gableRoofC(g, 0.06, 0.08, 0.94, 0.92, 0.74, 1.3, 0x3c8a86, { front: PAL.glass, wallGable: 0xbf9460 });
  for (let i = 1; i < 4; i++) line(g, [roof.frontFace(i / 4, 0.05), roof.frontFace(i / 4, 0.95)], 0.8, 0x2d6f70, 0.8);
  line(g, [roof.frontFace(0.1, 0.2), roof.frontFace(0.24, 0.6)], 1.4, 0xe2f6f2, 0.7);
  box(g, 0.24, 0.3, 0.38, 0.44, 1.0, 1.55, PAL.stone, { right: 0x9e927a });
  return g;
}

// segment de muret du Bastion (cellule c=0)
export function drawMuret(kind) {
  const g = new Graphics();
  const st = 0xc8b898;
  const c0 = 0.14, c1 = 0.62;
  if (kind === 'gate') {
    box(g, c0 - 0.04, 0.0, c1 + 0.06, 0.28, 0, 1.25, st, { right: 0xa49477 });
    // porte scellée (verre solaire)
    const P = iso;
    const sealF = (u, v) => P(c1 - 0.02, 0.28 + 0.44 * u, 0.02 + 0.95 * v);
    quad(g, sealF, 0, 0, 1, 1, 0x2d7473);
    quad(g, sealF, 0.08, 0.05, 0.92, 0.9, PAL.glass, 0.9);
    line(g, [sealF(0.5, 0.15), sealF(0.5, 0.75)], 1.4, 0xbff2ea, 0.9);
    line(g, [sealF(0.25, 0.45), sealF(0.75, 0.45)], 1.4, 0xbff2ea, 0.9);
    g.circle(...sealF(0.5, 0.45), 3).stroke({ width: 1.2, color: 0xbff2ea, alpha: 0.9 });
    box(g, c0 - 0.04, 0.72, c1 + 0.06, 1.0, 0, 1.25, st, { right: 0xa49477 });
    box(g, c0 - 0.06, -0.02, c1 + 0.08, 1.02, 0.98, 1.22, shade(st, 1.05), { right: 0xa89a7c });
    box(g, c0 + 0.08, 0.38, c1 - 0.06, 0.62, 1.22, 1.42, st, { right: 0xa49477 });
    return g;
  }
  box(g, c0, 0.0, c1, 1.0, 0, 0.62, st, { right: 0xa49477, edge: true });
  // appareillage de pierres
  const rf = rightFace(0, 1, c1, 0, 0.62);
  for (let row = 0; row < 3; row++) {
    const v0 = row / 3, v1 = (row + 1) / 3;
    line(g, [rf(0, v1), rf(1, v1)], 0.9, 0x7f735e, 0.5);
    const offs = row % 2 ? [0.18, 0.52, 0.86] : [0.35, 0.7];
    for (const u of offs) line(g, [rf(u, v0), rf(u, v1)], 0.9, 0x7f735e, 0.5);
  }
  // créneaux
  box(g, c0, 0.06, c1, 0.4, 0.62, 0.84, st, { right: 0xa49477 });
  box(g, c0, 0.6, c1, 0.94, 0.62, 0.84, st, { right: 0xa49477 });
  // mousse
  const R = rng(kind === 'glyph' ? 3 : 8);
  for (let i = 0; i < 4; i++) {
    const [x, y] = iso(c0 + R() * (c1 - c0), 0.1 + R() * 0.8, 0.84);
    g.ellipse(x, y, 4 + R() * 3, 2).fill({ color: 0x7d9a56, alpha: 0.9 });
  }
  if (kind === 'glyph') {
    quad(g, rf, 0.36, 0.3, 0.64, 0.75, 0x2d7473);
    quad(g, rf, 0.4, 0.36, 0.6, 0.69, PAL.glass);
    line(g, [rf(0.5, 0.4), rf(0.5, 0.66)], 1, 0xd9fbf5, 0.9);
    line(g, [rf(0.43, 0.53), rf(0.57, 0.53)], 1, 0xd9fbf5, 0.9);
  }
  return g;
}

// ---------- végétation ----------
export function drawPine(seed, scale = 1) {
  const g = new Graphics();
  const R = rng(seed);
  const [x, y] = iso(0.5, 0.5);
  g.ellipse(x, y, 13 * scale, 6 * scale).fill({ color: 0x2f3d22, alpha: 0.18 });
  g.rect(x - 2, y - 10, 4, 10).fill({ color: 0x6e4a2e });
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const w = (17 - i * 4) * scale * (0.9 + R() * 0.2), base = y - 6 - i * 13 * scale, top = base - 24 * scale;
    poly(g, [[x, top], [x - w, base], [x, base + 4]], 0x4f7d55);
    poly(g, [[x, top], [x + w, base], [x, base + 4]], 0x365b40);
    line(g, [[x, top], [x - w * 0.6, base - 6]], 1.1, 0x76a271, 0.6);
  }
  return g;
}
export function drawRoundTree(seed, palette = 'gold', scale = 1) {
  const g = new Graphics();
  const R = rng(seed);
  const [x, y] = iso(0.5, 0.5);
  const cols = {
    gold: [0xe2b44e, 0xc08d34, 0xf2d27a],
    sage: [0x8cab62, 0x67874a, 0xb0c983],
    rust: [0xcf8f45, 0xa8692f, 0xe8b46c],
  }[palette];
  g.ellipse(x, y, 15 * scale, 7 * scale).fill({ color: 0x2f3d22, alpha: 0.18 });
  g.moveTo(x - 2.5, y).lineTo(x - 1.5, y - 22 * scale).lineTo(x + 1.5, y - 22 * scale).lineTo(x + 2.5, y).fill({ color: 0x6e4a2e });
  const blobs = [];
  for (let i = 0; i < 6; i++) blobs.push([x + (R() - 0.5) * 18 * scale, y - 30 * scale + (R() - 0.5) * 16 * scale, (9 + R() * 6) * scale]);
  for (const [bx, by, br] of blobs) g.circle(bx + 2, by + 2, br).fill({ color: cols[1] });
  for (const [bx, by, br] of blobs) g.circle(bx - 1.5, by - 1.5, br * 0.82).fill({ color: cols[0] });
  for (const [bx, by, br] of blobs.slice(0, 3)) g.circle(bx - 4, by - 4, br * 0.35).fill({ color: cols[2], alpha: 0.9 });
  return g;
}
export function drawBush(seed, col = 0x7f9f57) {
  const g = new Graphics();
  const R = rng(seed);
  const [x, y] = iso(0.5, 0.5);
  g.ellipse(x, y, 13, 6).fill({ color: 0x2f3d22, alpha: 0.16 });
  const blobs = [];
  for (let i = 0; i < 4; i++) blobs.push([x + (R() - 0.5) * 16, y - 6 - R() * 5, 6 + R() * 3]);
  for (const [bx, by, br] of blobs) g.circle(bx + 1.5, by + 1.5, br).fill({ color: shade(col, 0.75) });
  for (const [bx, by, br] of blobs) g.circle(bx - 1, by - 1, br * 0.8).fill({ color: col });
  if (R() < 0.5) for (let i = 0; i < 3; i++) g.circle(x + (R() - 0.5) * 14, y - 7 - R() * 6, 1.3).fill({ color: PAL.cream });
  return g;
}
export function drawHedge(seed) {
  const g = new Graphics();
  const R = rng(seed);
  const col = 0x6f9150;
  box(g, 0.04, 0.3, 0.96, 0.74, 0, 0.42, col, { top: 0x8aab62, right: 0x52703c, edge: false });
  for (let i = 0; i < 5; i++) {
    const [x, y] = iso(0.1 + i * 0.2, 0.52, 0.42);
    g.circle(x, y + 1, 5.5 + R() * 1.5).fill({ color: 0x8aab62 });
    g.circle(x - 1.5, y - 1, 3).fill({ color: 0xa3c27a, alpha: 0.9 });
  }
  return g;
}
export function drawGate() {
  const g = new Graphics();
  for (const r of [0.3, 0.74]) {
    box(g, 0.02, r - 0.06, 0.12, r + 0.06, 0, 0.62, PAL.woodDark, { edge: false });
    box(g, 0.88, r - 0.06, 0.98, r + 0.06, 0, 0.62, PAL.woodDark, { edge: false });
  }
  // portillon ouvert (planches)
  const P = iso;
  line(g, [P(0.12, 0.3, 0.42), P(0.12, 0.05, 0.42)], 2, PAL.wood);
  line(g, [P(0.12, 0.3, 0.2), P(0.12, 0.05, 0.2)], 2, PAL.wood);
  line(g, [P(0.88, 0.74, 0.42), P(0.88, 0.98, 0.42)], 2, PAL.wood);
  line(g, [P(0.88, 0.74, 0.2), P(0.88, 0.98, 0.2)], 2, PAL.wood);
  return g;
}
export function drawRock(seed) {
  const g = new Graphics();
  const R = rng(seed);
  const [x, y] = iso(0.5, 0.5);
  const w = 7 + R() * 5;
  poly(g, [[x - w, y], [x - w * 0.6, y - w * 0.8], [x + w * 0.2, y - w], [x + w, y - w * 0.3], [x + w * 0.8, y + 2], [x - w * 0.3, y + 3]], 0xa79d88);
  poly(g, [[x + w * 0.2, y - w], [x + w, y - w * 0.3], [x + w * 0.8, y + 2], [x + w * 0.1, y - w * 0.2]], 0x82796a);
  return g;
}
export function drawReeds(seed) {
  const g = new Graphics();
  const R = rng(seed);
  const [x, y] = iso(0.5, 0.5);
  for (let i = 0; i < 6; i++) {
    const dx = (R() - 0.5) * 14, h = 10 + R() * 10;
    g.moveTo(x + dx, y).quadraticCurveTo(x + dx + 2, y - h * 0.6, x + dx + (R() - 0.5) * 6, y - h).stroke({ width: 1.3, color: 0x6f8d48, cap: 'round' });
    if (R() < 0.5) g.roundRect(x + dx - 1.2, y - h * 0.8, 2.4, 6, 1.2).fill({ color: 0x7a5534 });
  }
  return g;
}
export function drawLantern() {
  const g = new Graphics();
  const [x, y] = iso(0.5, 0.5);
  g.ellipse(x, y, 4, 2).fill({ color: 0x2f3d22, alpha: 0.2 });
  g.rect(x - 1, y - 26, 2, 26).fill({ color: 0x4b3d30 });
  g.rect(x - 1, y - 26, 6, 1.6).fill({ color: 0x4b3d30 });
  g.roundRect(x + 1.6, y - 25.5, 6.4, 8.5, 2).fill({ color: 0x4b3d30 });
  g.roundRect(x + 2.6, y - 24.2, 4.4, 6, 1.4).fill({ color: 0xffe9a8 });
  g.poly([x + 1, y - 25.5, x + 4.8, y - 28.5, x + 8.6, y - 25.5]).fill({ color: 0x4b3d30 });
  return g;
}
export function drawLogs() {
  const g = new Graphics();
  const P = iso;
  for (const [r, z] of [[0.3, 0], [0.62, 0], [0.46, 0.3]]) {
    const a = P(0.15, r, z + 0.15), b = P(0.85, r, z + 0.15);
    line(g, [a, b], 8, 0x9b6a3f, 1, 'butt');
    line(g, [[a[0], a[1] - 2], [b[0], b[1] - 2]], 2, 0xc28f5a, 0.8, 'butt');
    g.ellipse(b[0], b[1], 3.2, 4).fill({ color: 0xe6c690 });
    g.ellipse(b[0], b[1], 1.4, 1.8).stroke({ width: 0.7, color: 0xa77a4a });
  }
  return g;
}
export function drawCrates() {
  const g = new Graphics();
  box(g, 0.15, 0.2, 0.55, 0.6, 0, 0.42, PAL.wood);
  box(g, 0.55, 0.4, 0.88, 0.75, 0, 0.36, 0xd0a56c);
  box(g, 0.25, 0.28, 0.55, 0.58, 0.42, 0.75, 0xe0bd88);
  return g;
}
export function drawHay() {
  const g = new Graphics();
  for (const [c, r] of [[0.35, 0.5], [0.68, 0.38]]) {
    const [x, y] = iso(c, r);
    g.ellipse(x, y - 1, 10, 5).fill({ color: 0xb08a3e });
    g.roundRect(x - 10, y - 13, 20, 12, 3).fill({ color: 0xe6c66b });
    g.ellipse(x, y - 13, 10, 5).fill({ color: 0xf2da8c });
    g.ellipse(x, y - 13, 6, 3).stroke({ width: 0.8, color: 0xc9a453, alpha: 0.8 });
    line(g, [[x - 10, y - 6], [x + 10, y - 6]], 1, 0xb08a3e, 0.6);
  }
  return g;
}

// ---------- cultures (origine au pied) ----------
export function drawCrop(kind, seed) {
  const g = new Graphics();
  const R = rng(seed);
  if (kind === 'seed') {
    line(g, [[0, 0], [0, -4]], 1, 0x6f9a48);
    g.ellipse(-2.2, -4.5, 2.4, 1.2).fill({ color: 0x9cc46a });
    g.ellipse(2.2, -4.8, 2.4, 1.2).fill({ color: 0x86b35a });
  } else if (kind === 'sprout') {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45, l = 7 + R() * 3;
      g.moveTo(0, 0).quadraticCurveTo(Math.cos(a) * l * 0.4, -l * 0.3, Math.cos(a) * l, Math.sin(a) * l).stroke({ width: 2.4, color: i % 2 ? 0x6d9a4a : 0x8fbc5c, cap: 'round' });
    }
  } else if (kind === 'wheat') {
    for (let i = 0; i < 6; i++) {
      const dx = (i - 2.5) * 1.8 + (R() - 0.5), h = 13 + R() * 4;
      line(g, [[dx * 0.5, 0], [dx, -h]], 1, 0xc9a04a);
      g.ellipse(dx + 0.3, -h - 2.5, 1.5, 3.6).fill({ color: i % 2 ? 0xf0cf72 : 0xe2b955 });
    }
  } else if (kind === 'squash') {
    g.ellipse(-3, -3, 6, 3.2).fill({ color: 0x5f8a45 });
    g.ellipse(4, -4, 5, 3).fill({ color: 0x77a352 });
    g.ellipse(0, -4.5, 6.5, 5).fill({ color: 0xd99a3e });
    g.ellipse(-1.2, -5.5, 4.2, 3.4).fill({ color: 0xebb455 });
    line(g, [[-2.5, -8.5], [-3, -1]], 0.8, 0xb07a2c, 0.7);
    line(g, [[2.2, -8.5], [2.6, -1]], 0.8, 0xb07a2c, 0.7);
    g.roundRect(-0.8, -11, 1.8, 3, 0.8).fill({ color: 0x5b7a3a });
  }
  return g;
}

// ---------- villageois (2 images de marche) ----------
export function drawVillager(who, frame) {
  const g = new Graphics();
  const P = who === 'solene'
    ? { skin: 0xe2ad84, top: PAL.sage, topDark: 0x58704a, legs: 0x4a4238, hat: PAL.sun, hair: 0x6b4a2e }
    : { skin: 0xb9805a, top: PAL.glass, topDark: 0x3d807b, legs: 0x3f4a52, hat: 0x2d7473, hair: 0x2e2620 };
  const s = frame ? 2.4 : 0;
  g.roundRect(-4.2 - s * 0.5, -10, 3.6, 10, 1.6).fill({ color: P.legs });
  g.roundRect(0.6 + s * 0.5, -10, 3.6, 10, 1.6).fill({ color: shade(P.legs, 0.8) });
  g.roundRect(-6, -22, 12, 14, 4).fill({ color: P.top });
  g.poly([1, -22, 6, -20, 6, -10, 1, -8]).fill({ color: P.topDark });
  g.roundRect(-8.2, -21 + (frame ? 1 : 0), 3.2, 9, 1.6).fill({ color: P.topDark });
  g.roundRect(5, -21 - (frame ? 1 : 0), 3.2, 9, 1.6).fill({ color: shade(P.topDark, 0.85) });
  if (who === 'milo') { g.rect(-4, -21, 8, 3).fill({ color: PAL.cream }); }
  else { g.roundRect(-3.5, -17, 7, 8, 2).fill({ color: PAL.cream, alpha: 0.9 }); }
  g.circle(0, -27, 5.4).fill({ color: P.skin });
  g.circle(1.8, -26.4, 3.6).fill({ color: shade(P.skin, 0.88) });
  if (who === 'solene') {
    g.ellipse(0, -30, 9, 2.8).fill({ color: shade(P.hat, 0.85) });
    g.roundRect(-4.5, -35, 9, 5.5, 2.5).fill({ color: P.hat });
    g.rect(-4.5, -31.5, 9, 1.2).fill({ color: PAL.sage });
  } else {
    g.roundRect(-5.2, -33.5, 10.4, 5, 2.5).fill({ color: P.hat });
    g.ellipse(4.5, -29.5, 4, 1.4).fill({ color: shade(P.hat, 0.75) });
  }
  return g;
}

// ---------- textures diverses ----------
export function drawSoftDot(radius = 32) {
  const g = new Graphics();
  for (let i = 10; i >= 1; i--) g.circle(0, 0, (radius * i) / 10).fill({ color: 0xffffff, alpha: 0.1 });
  return g;
}
export function drawPuff() {
  const g = new Graphics();
  g.circle(0, 0, 10).fill({ color: 0xffffff, alpha: 0.55 });
  g.circle(-3, -3, 7).fill({ color: 0xffffff, alpha: 0.6 });
  g.circle(3, -1, 6).fill({ color: 0xffffff, alpha: 0.5 });
  return g;
}
export function drawSpark() {
  const g = new Graphics();
  g.poly([0, -7, 1.6, -1.6, 7, 0, 1.6, 1.6, 0, 7, -1.6, 1.6, -7, 0, -1.6, -1.6]).fill({ color: 0xffffff });
  return g;
}
export function drawChip() {
  const g = new Graphics();
  g.poly([-3, -2, 2, -3, 3, 2, -2, 3]).fill({ color: 0xffffff });
  return g;
}

// SVG partagés DOM <-> canvas (icônes de ressources)
export const ICONS = {
  energy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#fff3d1"/><path d="M13.6 3.2 6.2 13.1h5l-.9 7.7 7.5-10.2h-5.1z" fill="#f3c879" stroke="#8a5a1f" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  materials: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#f6e6c8"/><path d="M5 8.6 12 5l7 3.6v7.2L12 19.4l-7-3.6z" fill="#dcb47c" stroke="#7a5230" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 8.6 12 12l7-3.4M12 12v7.4" fill="none" stroke="#7a5230" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.6 9.9 12 13" stroke="#a9794a" stroke-width=".9"/></svg>`,
  trust: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#e6efd9"/><path d="M6.2 18.2C6 11 10 6.4 18.4 5.4 18 13.6 13.6 18 6.2 18.2z" fill="#8fb06a" stroke="#3f6047" stroke-width="1.4" stroke-linejoin="round"/><path d="M6.4 18 14.2 9.8" stroke="#3f6047" stroke-width="1.3" stroke-linecap="round"/></svg>`,
};

export async function svgTexture(svg, size = 64) {
  const img = new Image(size, size);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg width="${size}" height="${size}" `));
  await img.decode();
  return Texture.from(img);
}

// ponton au bout du chemin : escalier dans la falaise, quai, barque (coordonnées absolues de grille)
export function drawPier() {
  const g = new Graphics();
  const wood = 0xc49a63, P = iso;
  const zw = -DEPTH / ZH; // niveau de l'eau
  for (let k = 0; k < 6; k++) {
    const r0 = 12 + k * 0.16, r1 = r0 + 0.16, zt = -(k + 1) * 0.33;
    box(g, 5.2, r0, 5.8, r1, zw, zt, k % 2 ? wood : 0xb98f58, { right: 0x8a6438 });
  }
  // poteaux
  for (const [c, r] of [[5.18, 13.1], [5.82, 13.1], [5.18, 14.0], [5.82, 14.0]]) box(g, c - 0.04, r - 0.04, c + 0.04, r + 0.04, zw - 0.15, -1.85, 0x6e4a2e, { edge: false });
  // tablier
  box(g, 5.12, 12.96, 5.88, 14.06, -2.0, -1.88, wood, { right: 0x8a6438 });
  const tf = (u, v) => P(5.12 + 0.76 * u, 12.96 + 1.1 * v, -1.88);
  for (let i = 1; i < 8; i++) line(g, [tf(0, i / 8), tf(1, i / 8)], 0.8, 0x8a6438, 0.55);
  // remous
  for (const [c, r] of [[5.82, 14.0], [5.82, 13.1]]) { const [x, y] = P(c, r, zw); g.ellipse(x, y + 1, 6, 2).stroke({ width: 1.2, color: 0xeaf7f2, alpha: 0.75 }); }
  // barque
  const [bx, by] = P(6.35, 13.55, zw);
  g.ellipse(bx + 2, by + 3, 22, 7).fill({ color: 0x1f5a5c, alpha: 0.25 });
  g.poly([bx - 22, by - 6, bx + 18, by - 12, bx + 24, by - 9, bx + 14, by + 3, bx - 14, by + 6]).fill({ color: 0x5f8a6f });
  g.poly([bx - 22, by - 6, bx + 18, by - 12, bx + 24, by - 9, bx - 14, by - 1]).fill({ color: 0xd8c08a });
  g.poly([bx - 16, by - 4.5, bx + 16, by - 10, bx + 19, by - 8.5, bx - 12, by - 1.5]).fill({ color: 0x9b6a3f });
  line(g, [[bx - 6, by - 4], [bx - 2, by - 9]], 2, 0xb98f58);
  line(g, [[bx + 7, by - 6], [bx + 10, by - 10.5]], 2, 0xb98f58);
  line(g, [[bx - 22, by - 6], [bx - 30, by - 14]], 0.8, 0x5d3b26, 0.8);
  return g;
}

// halo lisse (dégradé radial Canvas 2D -> texture)
export function glowTexture(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,0.7)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.22)'); g.addColorStop(0.7, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return Texture.from(c);
}
// décor du lac
export function drawWaterRock(seed) {
  const g = new Graphics(); const R = rng(seed);
  const w = 10 + R() * 8;
  g.ellipse(0, 2, w + 7, (w + 7) * 0.42).fill({ color: 0xeaf7f2, alpha: 0.55 });
  g.ellipse(0, 1, w + 2, (w + 2) * 0.4).fill({ color: 0x2f6f70, alpha: 0.35 });
  poly(g, [[-w, 0], [-w * 0.5, -w * 0.7], [w * 0.2, -w * 0.85], [w, -w * 0.2], [w * 0.8, 2], [-w * 0.6, 3]], 0xa79d88);
  poly(g, [[w * 0.2, -w * 0.85], [w, -w * 0.2], [w * 0.8, 2], [w * 0.1, -w * 0.25]], 0x7f776a);
  g.ellipse(-w * 0.3, -w * 0.55, w * 0.35, w * 0.12).fill({ color: 0x8aa860, alpha: 0.9 });
  return g;
}
export function drawLilies(seed) {
  const g = new Graphics(); const R = rng(seed);
  for (let i = 0; i < 6; i++) {
    const x = (R() - 0.5) * 50, y = (R() - 0.5) * 18, r = 4 + R() * 3.5;
    g.ellipse(x, y, r, r * 0.5).fill({ color: i % 2 ? 0x6f9a52 : 0x86b062 });
    g.moveTo(x, y).lineTo(x + r, y - r * 0.15).stroke({ width: 1, color: 0x4f7a45, alpha: 0.7 });
    if (R() < 0.35) { g.circle(x - 1, y - 2, 1.8).fill({ color: 0xfff6f0 }); g.circle(x - 1, y - 2.4, 0.8).fill({ color: PAL.sun }); }
  }
  return g;
}
// huard (plongeon huard), emblème des lacs québécois
export function drawLoon() {
  const g = new Graphics();
  g.moveTo(-26, 4).lineTo(-12, 1).moveTo(-26, -2).lineTo(-12, -1).stroke({ width: 1.1, color: 0xeaf7f2, alpha: 0.7, cap: 'round' });
  g.ellipse(0, 1.5, 12, 3).fill({ color: 0x1f5a5c, alpha: 0.3 });
  g.ellipse(0, -1, 11, 4.2).fill({ color: 0x1f2a28 });
  for (let i = 0; i < 7; i++) g.circle(-6 + i * 1.8, -2.5 + (i % 2) * 1.2, 0.55).fill({ color: 0xf2f2ea });
  g.roundRect(6, -9, 3.6, 8, 1.8).fill({ color: 0x1f2a28 });
  g.ellipse(8.6, -9.2, 3.4, 2.6).fill({ color: 0x1f2a28 });
  g.rect(6, -6.2, 3.6, 0.8).fill({ color: 0xf2f2ea });
  g.poly([11.5, -9.6, 16, -8.6, 11.5, -8.2]).fill({ color: 0x2b2b2b });
  g.circle(9.6, -9.8, 0.6).fill({ color: 0xbf3030 });
  return g;
}
