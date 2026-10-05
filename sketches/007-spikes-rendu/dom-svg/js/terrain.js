// Terrain : UN seul SVG continu (lac, socle avec strates, dessus herbeux, chemin, parcelles, ruisseau).
// Le dessus est dessiné « à plat » en coordonnées de grille puis projeté par une matrice affine,
// ce qui donne des courbes, arrondis et épaisseurs de trait correctement isométriques.
import { P, f, pts, rng, HW, HH, Art } from './iso.js';
import { PLOTS, POND, occupied } from './layout.js';
import { PLANT_V } from './art.js';

export const D = 74;                                   // épaisseur visible du socle
export const WORLD = { x: -1000, y: -380, w: 2000, h: 1300 };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function terrainSVG() {
  const R = rng(42);
  const o = [];
  const L = P(0, 12), B = P(12, 12), Rt = P(12, 0), T = P(0, 0);
  const Lb = [L[0], L[1] + D], Bb = [B[0], B[1] + D], Rb = [Rt[0], Rt[1] + D];

  // ---- lac
  for (let i = 0; i < 110; i++) {
    const x = WORLD.x + R() * WORLD.w, y = WORLD.y + R() * WORLD.h;
    if (Math.abs(x) / 480 + Math.abs(y - 240) / 300 < 1.05) continue;
    const w = 6 + R() * 18;
    o.push(`<path d="M${f(x - w)},${f(y)}q${f(w)},-2.6 ${f(2 * w)},0" class="ripple"/>`);
  }
  const sk = D * .78;
  o.push(`<polygon points="${pts([Rb, [Rb[0] + sk, Rb[1]], [Bb[0] + sk, Bb[1]], Bb])}" class="lakeshadow"/>`);
  o.push(`<polygon points="${pts([[Lb[0] - 18, Lb[1] + 1], [Bb[0], Bb[1] + 14], [Rb[0] + 18, Rb[1] + 1], Rb, Bb, Lb])}" class="shallow"/>`);
  const rd = D * .38;
  o.push(`<polygon points="${pts([Lb, Bb, Rb, [Rb[0], Rb[1] + rd], [Bb[0], Bb[1] + rd], [Lb[0], Lb[1] + rd]])}" class="reflect"/>`);
  for (let i = 0; i < 16; i++) {
    const t = R(), d = 4 + R() * (rd - 6);
    const p = t < .5 ? lerp(Lb, Bb, t * 2) : lerp(Bb, Rb, (t - .5) * 2);
    const w = 10 + R() * 26;
    o.push(`<path d="M${f(p[0] - w)},${f(p[1] + d)}h${f(2 * w)}" class="reflectcut"/>`);
  }

  // ---- socle : deux faces visibles, strates ondulées
  function face(A, Bp, side, seed) {
    const r = rng(seed), n = 40;
    const top = i => lerp(A, Bp, i / n);
    const line = (d, amp, ph) => Array.from({ length: n + 1 }, (_, i) => { const [x, y] = top(i); return [x, y + d + Math.sin(i * .62 + ph) * amp + (r() - .5) * amp * .9]; });
    const b0 = Array.from({ length: n + 1 }, (_, i) => top(i));
    const b1 = line(6.5, 1.2, 1).map((p, i) => (i % 5 === 2 || i % 7 === 4) ? [p[0], p[1] + 3.5 + r() * 4] : p);
    const bD = Array.from({ length: n + 1 }, (_, i) => { const [x, y] = top(i); return [x, y + D]; });
    const bounds = [b0, b1, line(24, 2.2, 2), line(42, 2.6, 4), line(57, 2, 5), bD];
    const mats = ['lip', 'earth', 'ochre', 'clay', 'rock'];
    for (let k = 0; k < 5; k++) o.push(`<polygon points="${pts(bounds[k].concat(bounds[k + 1].slice().reverse()))}" class="${mats[k]}-${side}"/>`);
    // veines dans l'ocre, cailloux dans l'argile et la roche, racines dans la terre
    for (let k = 0; k < 9; k++) {
      const i = Math.floor(r() * (n - 6)), d = 30 + r() * 10, len = 3 + Math.floor(r() * 4);
      const seg = Array.from({ length: len }, (_, j) => { const [x, y] = top(i + j); return [x, y + d + (r() - .5) * 2]; });
      o.push(`<polyline points="${pts(seg)}" class="k-clay-${side}" stroke-width="1" fill="none" opacity=".55"/>`);
    }
    for (let k = 0; k < 30; k++) {
      const [x, y] = top(r() * n), d = 46 + r() * 24, rx = 2 + r() * 3.4, ry = 1.4 + r() * 2;
      o.push(`<ellipse cx="${f(x)}" cy="${f(y + d + 1)}" rx="${f(rx)}" ry="${f(ry)}" class="rock-r"/><ellipse cx="${f(x - .5)}" cy="${f(y + d)}" rx="${f(rx * .85)}" ry="${f(ry * .8)}" class="rock-${side === 'l' ? 't' : 'l'}"/>`);
    }
    for (let k = 0; k < 7; k++) {
      const [x, y] = top(2 + r() * (n - 4));
      o.push(`<path d="M${f(x)},${f(y + 7)}q${f(-2 + r() * 4)},6 ${f(-1 + r() * 2)},${f(10 + r() * 8)}" class="k-wooddk-${side}" stroke-width=".9" fill="none" opacity=".55"/>`);
    }
    o.push(`<polygon points="${pts(bD.map(p => [p[0], p[1] - 7]).concat(bD.slice().reverse()))}" class="rock-r" opacity=".55"/>`);
    o.push(`<polyline points="${pts(bD.map(p => [p[0], p[1] - .5]))}" class="foam"/>`);
  }
  face(L, B, 'l', 5);
  face(B, Rt, 'r', 6);

  // échelle et ponton sous le pont
  const lt = lerp(L, B, 6.5 / 12);
  let rungs = '';
  for (let d = 8; d < D - 2; d += 7) rungs += `M${f(lt[0] - 4)},${f(lt[1] + d - 2)}l8,4`;
  o.push(`<path d="M${f(lt[0] - 4)},${f(lt[1] - 1)}v${D}M${f(lt[0] + 4)},${f(lt[1] + 3)}v${D}${rungs}" class="k-woodd-l" stroke-width="1.3" fill="none"/>`);
  const dock = new Art();
  for (const [u, v] of [[6.1, 12.1], [6.9, 12.1], [6.1, 12.85], [6.9, 12.85]]) dock.box(u - .04, v - .04, .08, .08, -D - 4, 6, 'woodd', { cast: false });
  dock.box(6.02, 12.02, .96, .9, -D + 1.5, 2.5, 'woodb', { rim: true, cast: false });
  for (let u = 6.12; u < 7; u += .12) dock.seg([u, 12.03, -D + 4.1], [u, 12.9, -D + 4.1], 'k-woodd-t', .5, ' opacity=".55"');
  o.push(dock.o.join(''));
  const [bx, by] = P(7.55, 12.55, -D);
  o.push(`<path d="M${f(bx - 22)},${f(by - 6)}Q${f(bx)},${f(by + 9)} ${f(bx + 22)},${f(by + 5)}L${f(bx + 18)},${f(by - 3)}Q${f(bx)},${f(by - 13)} ${f(bx - 22)},${f(by - 6)}Z" class="woodb-l"/>`);
  o.push(`<path d="M${f(bx - 17)},${f(by - 5.5)}Q${f(bx)},${f(by + 3)} ${f(bx + 17)},${f(by + 1)}Q${f(bx)},${f(by - 9)} ${f(bx - 17)},${f(by - 5.5)}Z" class="woodd-t"/>`);
  o.push(`<path d="M${f(bx - 3)},${f(by - 7.5)}l6,5.5" class="k-woodb-t" stroke-width="2.4"/>`);
  o.push(`<path d="M${f(bx - 30)},${f(by + 6)}q30,10 60,2" class="k-waterl-t" stroke-width="1.2" fill="none" opacity=".6"/>`);

  // chute d'eau (partie fixe ; le ruissellement animé est un calque séparé)
  const ft = lerp(L, B, 10.6 / 12);
  o.push(`<polygon points="${pts([[ft[0] - 7, ft[1] - 3.5], [ft[0] + 7, ft[1] + 3.5], [ft[0] + 7, ft[1] + 3.5 + D], [ft[0] - 7, ft[1] - 3.5 + D]])}" class="water-l"/>`);
  o.push(`<ellipse cx="${f(ft[0])}" cy="${f(ft[1] + D + 3)}" rx="15" ry="4.6" class="waterl-t" opacity=".85"/>`);

  // ---- dessus herbeux, en coordonnées de grille
  o.push(`<g transform="matrix(${HW},${HH},${-HW},${HH},0,0)" stroke-width=".02">`);
  o.push(`<rect x="0" y="0" width="12" height="12" class="grass-t"/>`);
  for (let i = 0; i < 40; i++) {
    const cx = .4 + R() * 11.2, cy = .4 + R() * 11.2;
    o.push(`<ellipse cx="${f(cx * 10) / 10}" cy="${f(cy * 10) / 10}" rx="${(.5 + R() * 1.3).toFixed(2)}" ry="${(.4 + R() * 1.0).toFixed(2)}" class="${R() < .55 ? 'grassd' : 'grassl'}-t" opacity=".42" stroke="none"/>`);
  }
  o.push(`<rect x="0" y="0" width="12" height=".95" class="grassd-t" opacity=".55" stroke="none"/><rect x="0" y="0" width=".95" height="12" class="grassd-t" opacity=".55" stroke="none"/>`);
  for (const p of PLOTS) {
    const u0 = p.c + .1, v0 = p.r + .1, s = 1.8;
    o.push(`<rect x="${u0 - .08}" y="${v0 - .08}" width="${s + .16}" height="${s + .16}" rx=".26" class="grassd-t" opacity=".85" stroke="none"/>`);
    o.push(`<rect x="${u0}" y="${v0}" width="${s}" height="${s}" rx=".16" class="soil-t" stroke="none"/>`);
    for (let k = 0; k <= 4; k++) o.push(`<path d="M${u0 + .12},${f((p.r + .24 + k * .4) * 100) / 100}H${u0 + s - .12}" class="k-soilf-t" stroke-width=".08" stroke-linecap="round"/>`);
    for (const pv of PLANT_V) o.push(`<path d="M${u0 + .12},${p.r + pv}H${u0 + s - .12}" class="k-soilr-t" stroke-width=".12" stroke-linecap="round"/>`);
    o.push(`<path d="M${u0 + .05},${v0 + s - .1}V${v0 + .05}H${u0 + s - .1}" class="k-soilf-t" stroke-width=".07" fill="none" stroke-linecap="round"/>`);
  }
  const pd = 'M6.5,.15V11.95M1.3,5.5H10.7';
  o.push(`<path d="${pd}" class="k-pathe-t" stroke-width=".88" stroke-linecap="round" fill="none"/><circle cx="6.5" cy="5.5" r=".8" class="pathe-t" stroke="none"/>`);
  o.push(`<path d="${pd}" class="k-path-t" stroke-width=".7" stroke-linecap="round" fill="none"/><circle cx="6.5" cy="5.5" r=".7" class="path-t" stroke="none"/>`);
  o.push(`<path d="M6.33,.5V11M6.67,.5V11" class="k-pathe-t" stroke-width=".035" opacity=".55" fill="none"/>`);
  for (let i = 0; i < 80; i++) {
    const onSpine = R() < .55;
    const u = onSpine ? 6.5 + (R() - .5) * .56 : 1.4 + R() * 9.2, v = onSpine ? .3 + R() * 11.5 : 5.5 + (R() - .5) * .56;
    o.push(`<ellipse cx="${u.toFixed(2)}" cy="${v.toFixed(2)}" rx="${(.04 + R() * .05).toFixed(3)}" ry="${(.035 + R() * .04).toFixed(3)}" class="${R() < .6 ? 'cobble' : 'pathe'}-t" stroke="none"/>`);
  }
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; o.push(`<ellipse cx="${(6.5 + Math.cos(a) * .45).toFixed(2)}" cy="${(5.5 + Math.sin(a) * .45).toFixed(2)}" rx=".1" ry=".08" class="cobble-t" stroke="none"/>`); }
  const ck = 'M.75,11.3C1.6,11.15 2.4,11.7 3.6,11.55S5.6,11.3 6.5,11.45S8.3,11.75 9.3,11.5S10.3,11.55 10.6,12';
  o.push(`<ellipse cx=".78" cy="11.25" rx=".52" ry=".46" class="mud-t" stroke="none"/>`);
  o.push(`<path d="${ck}" class="k-mud-t" stroke-width=".6" fill="none" stroke-linecap="round"/>`);
  o.push(`<path d="M10.1,10.6Q10.3,11.1 10.05,11.55" class="k-mud-t" stroke-width=".42" fill="none" stroke-linecap="round"/>`);
  o.push(`<ellipse cx="${POND.u}" cy="${POND.v}" rx="${POND.rx + .1}" ry="${POND.ry + .1}" class="mud-t" stroke="none"/>`);
  o.push(`<ellipse cx=".78" cy="11.25" rx=".4" ry=".34" class="water-t" stroke="none"/>`);
  o.push(`<path d="${ck}" class="k-water-t" stroke-width=".42" fill="none" stroke-linecap="round"/>`);
  o.push(`<path d="M10.1,10.6Q10.3,11.1 10.05,11.55" class="k-water-t" stroke-width=".26" fill="none" stroke-linecap="round"/>`);
  o.push(`<ellipse cx="${POND.u}" cy="${POND.v}" rx="${POND.rx}" ry="${POND.ry}" class="water-t" stroke="none"/>`);
  o.push(`<ellipse cx="${POND.u - .15}" cy="${POND.v - .12}" rx="${POND.rx * .62}" ry="${POND.ry * .55}" class="waterd-t" opacity=".55" stroke="none"/>`);
  o.push(`<path d="${ck}" class="k-waterl-t" stroke-width=".05" stroke-dasharray=".25 .55" fill="none"/>`);
  for (const [u, v, r] of [[9.75, 9.7, .17], [10.35, 10.25, .13], [10.2, 9.55, .1]]) o.push(`<circle cx="${u}" cy="${v}" r="${r}" class="leaf-t" stroke="none"/><path d="M${u},${v}l${r},-${r * .3}" class="k-water-t" stroke-width=".04"/>`);
  o.push('</g>');

  // ---- détails debout (herbes, fleurs, roseaux, galets)
  o.push(`<path d="M${pts([L, T, Rt]).replace(/ /g, 'L')}" class="k-grassl-t" stroke-width="1.6" fill="none" opacity=".75"/>`);
  o.push(`<path d="M${pts([L, B, Rt]).replace(/ /g, 'L')}" class="k-grassl-t" stroke-width="1.2" fill="none" opacity=".6"/>`);
  for (let i = 0; i < 300; i++) {
    const u = .3 + R() * 11.4, v = .3 + R() * 11.4;
    if (occupied(u, v)) continue;
    const [x, y] = P(u, v);
    if (R() < .2) {
      const c = ['fl1', 'fl2', 'fl3'][Math.floor(R() * 3)];
      o.push(`<path d="M${f(x)},${f(y)}v-3" class="k-leafd-l" stroke-width=".7"/><circle cx="${f(x)}" cy="${f(y - 3.4)}" r="1.5" class="${c}-t"/>`);
    } else {
      o.push(`<path d="M${f(x - 2)},${f(y)}l-.8,-3.2M${f(x)},${f(y)}l0,-4.2M${f(x + 2)},${f(y)}l.9,-3.2" class="k-grassd-r" stroke-width=".9" fill="none"/>`);
    }
  }
  for (let i = 0; i < 26; i++) {
    const u = 1 + R() * 9.4, side = R() < .5 ? 11.08 + R() * .1 : 11.82 + R() * .12;
    if (Math.abs(u - 6.5) < .6) continue;
    const [x, y] = P(u, side);
    const h = 6 + R() * 5;
    o.push(`<path d="M${f(x)},${f(y)}q-1,-${f(h * .6)} -2,-${f(h)}M${f(x + 1)},${f(y)}q.6,-${f(h * .5)} 1.6,-${f(h * .85)}M${f(x - .5)},${f(y)}v-${f(h * .7)}" class="k-leafd-l" stroke-width=".9" fill="none"/>`);
    if (R() < .4) o.push(`<ellipse cx="${f(x - .5)}" cy="${f(y - h * .7 - 1.5)}" rx="1" ry="2.2" class="woodd-t"/>`);
  }
  for (const [u, v, s] of [[.35, 11.0, 1.2], [1.2, 11.55, 1], [.4, 11.6, .9], [1.25, 10.9, .8], [9.3, 9.25, .9], [10.85, 10.6, 1], [10.9, 9.5, .8], [5.9, 11.65, .8]]) {
    const [x, y] = P(u, v);
    o.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(4.5 * s)}" ry="${f(2.6 * s)}" class="rock-r"/><ellipse cx="${f(x - .6)}" cy="${f(y - 1)}" rx="${f(3.6 * s)}" ry="${f(2 * s)}" class="rock-t"/>`);
  }
  return `<svg class="terrain" viewBox="${WORLD.x} ${WORLD.y} ${WORLD.w} ${WORLD.h}" width="${WORLD.w}" height="${WORLD.h}" aria-hidden="true">${o.join('')}</svg>`;
}

export const FALL = (() => { const L = P(0, 12), B = P(12, 12); return lerp(L, B, 10.6 / 12); })();
export const SPARKLES = [[-520, 120], [470, 90], [-300, 520], [330, 470], [-640, 330], [610, 360], [120, 560], [-90, -150], [520, -60]];
