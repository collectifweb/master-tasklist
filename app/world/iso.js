// Projection isométrique 2:1 et petit « crayon » SVG (repris du spike dom-svg, nettoyé).
// Repère grille : u = colonne, v = rangée, z = hauteur en px du monde.
// Lumière unique venant du haut et de la face +v : dessus = -t (clair), face +v = -l (mi-ombre),
// face +u = -r (ombre), ombre portée vers la droite de l'écran.

export const HW = 32;   // demi-largeur d'une case (px monde)
export const HH = 16;   // demi-hauteur d'une case
export const SK = 0.78; // longueur d'ombre portée par px de hauteur

export const P = (u, v, z = 0) => [(u - v) * HW, (u + v) * HH - z];
export const f = (n) => Math.round(n * 10) / 10;
export const pts = (a) => a.map((p) => f(p[0]) + ',' + f(p[1])).join(' ');

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Enveloppe convexe (chaîne monotone d'Andrew). */
export function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}

/** Accumule des formes SVG, leur emprise écran et les points d'ombre portée. */
export class Art {
  constructor() {
    this.o = [];
    this.b = [Infinity, Infinity, -Infinity, -Infinity];
    this.sh = [];
    this.anchors = {};
  }
  ext(x, y) { const b = this.b; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  p(u, v, z = 0) { const q = P(u, v, z); this.ext(q[0], q[1]); return q; }
  cast(u, v, z) { const q = P(u, v, 0); this.sh.push([q[0] + z * SK, q[1]]); }
  castS(x, y, z) { this.sh.push([x + z * SK, y + z]); }
  /** Point d'ancrage nommé (lumière, cristal, fumée…), en coordonnées écran locales. */
  anchor(name, u, v, z) { this.anchors[name] = P(u, v, z); return this; }
  poly(list, cls, extra = '') { this.o.push(`<polygon class="${cls}" points="${pts(list.map((q) => this.p(q[0], q[1], q[2] || 0)))}"${extra}/>`); return this; }
  spoly(list, cls, extra = '') { list.forEach((q) => this.ext(q[0], q[1])); this.o.push(`<polygon class="${cls}" points="${pts(list)}"${extra}/>`); return this; }
  seg(a, b, cls, w = 1, extra = '') {
    const p1 = this.p(a[0], a[1], a[2] || 0), p2 = this.p(b[0], b[1], b[2] || 0);
    this.o.push(`<line class="${cls}" x1="${f(p1[0])}" y1="${f(p1[1])}" x2="${f(p2[0])}" y2="${f(p2[1])}" stroke-width="${w}"${extra}/>`);
    return this;
  }
  raw(s) { this.o.push(s); return this; }

  /** Prisme droit : seules les faces visibles (+v à mi-ombre, +u à l'ombre, dessus clair). */
  box(u, v, du, dv, z, h, m, o = {}) {
    if (o.cast !== false) for (const [a, b] of [[u, v], [u + du, v], [u + du, v + dv], [u, v + dv]]) { this.cast(a, b, z); this.cast(a, b, z + h); }
    this.poly([[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, z + h], [u, v + dv, z + h]], `${m}-l`);
    this.poly([[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, z + h], [u + du, v, z + h]], `${m}-r`);
    if (o.top !== false) this.poly([[u, v, z + h], [u + du, v, z + h], [u + du, v + dv, z + h], [u, v + dv, z + h]], `${m}-t` + (o.rim ? ' rim' : ''));
    return this;
  }

  /** Prisme à n pans (cylindre low-poly) centré en (cu, cv), rayon R en cases. */
  prism(cu, cv, R, z, h, m, n = 8, o = {}) {
    const ring = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.PI / n;
      ring.push([cu + Math.cos(a) * R, cv + Math.sin(a) * R]);
    }
    if (o.cast !== false) for (const [a, b] of ring) { this.cast(a, b, z); this.cast(a, b, z + h); }
    const faces = [];
    for (let k = 0; k < n; k++) {
      const p1 = ring[k], p2 = ring[(k + 1) % n];
      const nu = (p1[0] + p2[0]) / 2 - cu, nv = (p1[1] + p2[1]) / 2 - cv;
      if (nu + nv <= 0) continue; // face tournée vers le fond
      faces.push({ p1, p2, depth: nu + nv, shade: nv - nu >= 0 ? 'l' : 'r' });
    }
    faces.sort((a, b) => a.depth - b.depth);
    for (const fc of faces) this.poly([[fc.p1[0], fc.p1[1], z], [fc.p2[0], fc.p2[1], z], [fc.p2[0], fc.p2[1], z + h], [fc.p1[0], fc.p1[1], z + h]], `${m}-${fc.shade}`);
    if (o.top !== false) this.poly(ring.map(([a, b]) => [a, b, z + h]), `${m}-t` + (o.rim ? ' rim' : ''));
    return ring;
  }

  done(pad = 3) {
    const [x0, y0, x1, y1] = this.b;
    return {
      svg: this.o.join(''),
      x: f(x0 - pad), y: f(y0 - pad), w: f(x1 - x0 + 2 * pad), h: f(y1 - y0 + 2 * pad),
      shadow: this.sh.length > 2 ? hull(this.sh) : null,
      anchors: this.anchors,
    };
  }
}
