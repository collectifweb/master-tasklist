// Terrain : UN seul SVG (lac, socle en strates, dessus en cases). Le dessus est dessiné en coordonnées de
// grille dans un groupe par secteur (data-sector / data-etat), projeté par une matrice affine : un secteur
// se recolore en changeant un attribut sur son groupe. Chaque case est un <g class="ow-tile"> de deux
// triangles (aplats low-poly), rallumable une à une (data-lit).
import { P, f, pts, rng, HW, HH, Art } from './iso.js';
import { N, CELLS, SECTOR_ORDER, ROADS, groundDetails, sectorOutline } from './layout.js';

export const D = 74; // épaisseur visible du socle
export const TERRAIN = { x: -560, y: -90, w: 1120, h: 690 };
/** Emprise utile pour le cadrage (île, arbres du fond, socle, un peu de lac). */
export const BOUNDS = { x: -430, y: -150, w: 860, h: 640 };

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Contour d'un secteur en coordonnées écran (px monde). */
export function sectorPolygon(id) {
  return sectorOutline(id).map(([u, v]) => P(u, v));
}

function strata(o, A, Bp, side, seed) {
  const r = rng(seed), n = 40;
  const top = (i) => lerp(A, Bp, i / n);
  const line = (d, amp, ph) => Array.from({ length: n + 1 }, (_, i) => { const [x, y] = top(i); return [x, y + d + Math.sin(i * 0.62 + ph) * amp + (r() - 0.5) * amp * 0.9]; });
  const b1 = line(6.5, 1.2, 1).map((p, i) => ((i % 5 === 2 || i % 7 === 4) ? [p[0], p[1] + 3.5 + r() * 4] : p));
  const bD = Array.from({ length: n + 1 }, (_, i) => { const [x, y] = top(i); return [x, y + D]; });
  const bounds = [b1, line(24, 2.2, 2), line(42, 2.6, 4), line(57, 2, 5), bD];
  const mats = ['earth', 'ochre', 'clay', 'rock'];
  for (let k = 0; k < 4; k++) o.push(`<polygon points="${pts(bounds[k].concat(bounds[k + 1].slice().reverse()))}" class="${mats[k]}-${side}"/>`);
  for (let k = 0; k < 9; k++) {
    const i = Math.floor(r() * (n - 6)), d = 30 + r() * 10, len = 3 + Math.floor(r() * 4);
    const seg = Array.from({ length: len }, (_, j) => { const [x, y] = top(i + j); return [x, y + d + (r() - 0.5) * 2]; });
    o.push(`<polyline points="${pts(seg)}" class="k-clay-${side}" stroke-width="1" opacity=".55"/>`);
  }
  for (let k = 0; k < 26; k++) {
    const [x, y] = top(r() * n), d = 46 + r() * 24, rx = 2 + r() * 3.4, ry = 1.4 + r() * 2;
    o.push(`<ellipse cx="${f(x)}" cy="${f(y + d + 1)}" rx="${f(rx)}" ry="${f(ry)}" class="rock-r"/><ellipse cx="${f(x - 0.5)}" cy="${f(y + d)}" rx="${f(rx * 0.85)}" ry="${f(ry * 0.8)}" class="rock-${side === 'l' ? 't' : 'l'}"/>`);
  }
  for (let k = 0; k < 7; k++) {
    const [x, y] = top(2 + r() * (n - 4));
    o.push(`<path d="M${f(x)},${f(y + 7)}q${f(-2 + r() * 4)},6 ${f(-1 + r() * 2)},${f(10 + r() * 8)}" class="k-earth-r" stroke-width=".9" opacity=".7"/>`);
  }
  o.push(`<polygon points="${pts(bD.map((p) => [p[0], p[1] - 7]).concat(bD.slice().reverse()))}" class="rock-r" opacity=".55"/>`);
  o.push(`<polyline points="${pts(bD.map((p) => [p[0], p[1] - 0.5]))}" class="ow-foam"/>`);
  return b1;
}

// bande d'herbe du rebord, découpée par secteur pour suivre sa couleur
function lipStrip(A, Bp, b1, t0, t1) {
  const n = b1.length - 1;
  const i0 = Math.round(t0 * n), i1 = Math.round(t1 * n);
  const top = Array.from({ length: i1 - i0 + 1 }, (_, k) => lerp(A, Bp, (i0 + k) / n));
  const bottom = b1.slice(i0, i1 + 1).reverse();
  return `<polygon points="${pts(top.concat(bottom))}" class="lip-SIDE"/>`;
}

function sectorGround(id, details) {
  const R = rng(id.length * 31 + 7);
  const g = [];
  g.push(`<g transform="matrix(${HW},${HH},${-HW},${HH},0,0)" stroke-width=".02">`);
  for (const [r, c] of CELLS[id]) {
    const flip = (r + c) % 2 === 0;
    const a = flip ? `${c},${r} ${c + 1},${r} ${c + 1},${r + 1}` : `${c},${r} ${c + 1},${r} ${c},${r + 1}`;
    const b = flip ? `${c},${r} ${c + 1},${r + 1} ${c},${r + 1}` : `${c + 1},${r} ${c + 1},${r + 1} ${c},${r + 1}`;
    const n = R();
    const tb = n < 0.33 ? 'grassl' : n < 0.66 ? 'grass' : 'grassd';
    g.push(`<g class="ow-tile" data-cell="${r}-${c}"><polygon points="${a}" class="grass-t"/><polygon points="${b}" class="${tb}-t"/></g>`);
  }
  // sols particuliers
  if (id === 'place') {
    g.push('<circle cx="6" cy="6" r="1.15" class="pathe-t" stroke="none"/><circle cx="6" cy="6" r="1.02" class="cobble-t" stroke="none"/>');
    for (let k = 0; k < 14; k++) { const t = (k / 14) * Math.PI * 2; g.push(`<ellipse cx="${f(6 + Math.cos(t) * 0.8)}" cy="${f(6 + Math.sin(t) * 0.8)}" rx=".11" ry=".08" class="pathe-t" stroke="none"/>`); }
  }
  if (id === 'atelier') g.push('<rect x="8.6" y="8.55" width="2.8" height="1.9" rx=".35" class="path-t" stroke="none" opacity=".75"/><rect x="8.75" y="6.6" width="1.5" height="1.2" rx=".3" class="path-t" stroke="none" opacity=".6"/>');
  if (id === 'archives') g.push('<rect x="7.8" y="3.1" width="2.6" height=".9" rx=".2" class="cobble-t" stroke="none"/><path d="M8.45,3.1V4M9.1,3.1V4M9.75,3.1V4M7.8,3.55H10.4" class="k-pathe-t" stroke-width=".04"/>');
  if (id === 'maison-commune') g.push('<ellipse cx="2.9" cy="5.3" rx=".9" ry=".45" class="grassl-t" stroke="none"/><ellipse cx="0.9" cy="2.4" rx=".5" ry=".4" class="grassd-t" stroke="none" opacity=".7"/>');
  for (const road of ROADS.filter((x) => x.sector === id)) {
    g.push(`<path d="${road.d}" class="k-pathe-t" stroke-width=".9" stroke-linecap="round"/>`);
    g.push(`<path d="${road.d}" class="k-path-t" stroke-width=".72" stroke-linecap="round"/>`);
  }
  g.push('</g>');
  // détails debout (herbes, fleurs) en coordonnées écran
  for (const d of details.filter((x) => x.sector === id)) {
    const [x, y] = P(d.u, d.v);
    if (d.flower) {
      const c = ['fl1', 'fl2', 'fl3'][d.tone];
      g.push(`<path d="M${f(x)},${f(y)}v-3" class="k-leafd-l" stroke-width=".7"/><circle cx="${f(x)}" cy="${f(y - 3.4)}" r="1.5" class="${c}-t"/>`);
    } else {
      g.push(`<path d="M${f(x - 2)},${f(y)}l-.8,-3.2M${f(x)},${f(y)}l0,-4.2M${f(x + 2)},${f(y)}l.9,-3.2" class="k-grassd-r" stroke-width=".9"/>`);
    }
  }
  return g.join('');
}

/** SVG du terrain. Les groupes de secteur portent data-sector ; world.js y pose data-etat et data-voile. */
export function terrainSVG() {
  const R = rng(42);
  const o = [];
  const L = P(0, N), B = P(N, N), Rt = P(N, 0), T = P(0, 0);
  const Lb = [L[0], L[1] + D], Bb = [B[0], B[1] + D], Rb = [Rt[0], Rt[1] + D];

  // ---- lac
  for (let i = 0; i < 70; i++) {
    const x = TERRAIN.x + R() * TERRAIN.w, y = TERRAIN.y + R() * TERRAIN.h;
    if (Math.abs(x) / 470 + Math.abs(y - 230) / 290 < 1.06) continue;
    const w = 6 + R() * 18;
    o.push(`<path d="M${f(x - w)},${f(y)}q${f(w)},-2.6 ${f(2 * w)},0" class="ow-ripple"/>`);
  }
  const sk = D * 0.78;
  o.push(`<polygon points="${pts([Rb, [Rb[0] + sk, Rb[1]], [Bb[0] + sk, Bb[1]], Bb])}" class="ow-lakeshadow"/>`);
  o.push(`<polygon points="${pts([[Lb[0] - 18, Lb[1] + 1], [Bb[0], Bb[1] + 14], [Rb[0] + 18, Rb[1] + 1], Rb, Bb, Lb])}" class="ow-shallow"/>`);
  const rd = D * 0.38;
  o.push(`<polygon points="${pts([Lb, Bb, Rb, [Rb[0], Rb[1] + rd], [Bb[0], Bb[1] + rd], [Lb[0], Lb[1] + rd]])}" class="ow-reflect"/>`);

  // ---- socle (deux faces visibles) ; la bande d'herbe du rebord suit le secteur
  const b1L = strata(o, L, B, 'l', 5);
  const b1R = strata(o, B, Rt, 'r', 6);
  const lips = {
    champs: [lipStrip(L, B, b1L, 0, 6 / 12).replace('SIDE', 'l')],
    atelier: [lipStrip(L, B, b1L, 6 / 12, 1).replace('SIDE', 'l'), lipStrip(B, Rt, b1R, 0, 6 / 12).replace('SIDE', 'r')],
    archives: [lipStrip(B, Rt, b1R, 6 / 12, 1).replace('SIDE', 'r')],
  };

  // quai et barque sous la route avant
  const lt = lerp(L, B, 6 / 12);
  let rungs = '';
  for (let d = 8; d < D - 2; d += 7) rungs += `M${f(lt[0] - 4)},${f(lt[1] + d - 2)}l8,4`;
  o.push(`<path d="M${f(lt[0] - 4)},${f(lt[1] - 1)}v${D}M${f(lt[0] + 4)},${f(lt[1] + 3)}v${D}${rungs}" class="k-woodd-l" stroke-width="1.3"/>`);
  const dock = new Art();
  for (const [u, v] of [[5.6, 12.1], [6.4, 12.1], [5.6, 12.85], [6.4, 12.85]]) dock.box(u - 0.04, v - 0.04, 0.08, 0.08, -D - 4, 6, 'woodd', { cast: false });
  dock.box(5.52, 12.02, 0.96, 0.9, -D + 1.5, 2.5, 'woodb', { rim: true, cast: false });
  o.push(dock.o.join(''));
  const [bx, by] = P(7.05, 12.55, -D);
  o.push(`<path d="M${f(bx - 22)},${f(by - 6)}Q${f(bx)},${f(by + 9)} ${f(bx + 22)},${f(by + 5)}L${f(bx + 18)},${f(by - 3)}Q${f(bx)},${f(by - 13)} ${f(bx - 22)},${f(by - 6)}Z" class="woodb-l"/>`);
  o.push(`<path d="M${f(bx - 17)},${f(by - 5.5)}Q${f(bx)},${f(by + 3)} ${f(bx + 17)},${f(by + 1)}Q${f(bx)},${f(by - 9)} ${f(bx - 17)},${f(by - 5.5)}Z" class="woodd-t"/>`);

  // ---- dessus, un groupe par secteur
  const details = groundDetails(9);
  for (const id of SECTOR_ORDER) {
    o.push(`<g class="ow-ground" data-sector="${id}">${(lips[id] || []).join('')}${sectorGround(id, details)}</g>`);
  }
  // liserés clairs des arêtes
  o.push(`<path d="M${pts([L, T, Rt]).replace(/ /g, 'L')}" class="ow-edge"/>`);
  o.push(`<path d="M${pts([L, B, Rt]).replace(/ /g, 'L')}" class="ow-edge ow-edge-front"/>`);
  return `<svg class="ow-terrain" viewBox="${TERRAIN.x} ${TERRAIN.y} ${TERRAIN.w} ${TERRAIN.h}" width="${TERRAIN.w}" height="${TERRAIN.h}" aria-hidden="true" focusable="false">${o.join('')}</svg>`;
}

/** Losange d'une case en coordonnées écran (pour vagues de couleur et anneaux). */
export function cellDiamond(r, c, inset = 0) {
  return [P(c + inset, r + inset), P(c + 1 - inset, r + inset), P(c + 1 - inset, r + 1 - inset), P(c + inset, r + 1 - inset)];
}
