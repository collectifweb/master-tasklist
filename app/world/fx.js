// Primitives d'effets : fils de lumière, anneaux, éclats, poussière, flocons de cendre, faisceaux.
// Particules préparées d'avance (réserves d'éléments), animées par la Web Animations API sur transform et
// opacity (compositeur). Les fils sont redessinés par la boucle unique (ticker), image par image.
// Tout est « sautable » : skip() termine ce qui joue en 150 ms au plus.
import { f, pts } from './iso.js';

export const SKIP_MS = 150;
const HURRY_MS = 110; // marge : le saut doit finir en moins de 150 ms, image de fin comprise
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);

function quad(p0, p1, p2, t) {
  const m = 1 - t;
  return [m * m * p0[0] + 2 * m * t * p1[0] + t * t * p2[0], m * m * p0[1] + 2 * m * t * p1[1] + t * t * p2[1]];
}
// sous-courbe [t0, t1] d'une quadratique (floraison)
function subQuad(p0, p1, p2, t0, t1) {
  const a = quad(p0, p1, p2, t0), b = quad(p0, p1, p2, t1);
  const c = [
    (1 - t0) * (1 - t1) * p0[0] + ((1 - t0) * t1 + t0 * (1 - t1)) * p1[0] + t0 * t1 * p2[0],
    (1 - t0) * (1 - t1) * p0[1] + ((1 - t0) * t1 + t0 * (1 - t1)) * p1[1] + t0 * t1 * p2[1],
  ];
  return `M${f(a[0])},${f(a[1])}Q${f(c[0])},${f(c[1])} ${f(b[0])},${f(b[1])}`;
}

class Pool {
  constructor(parent, cls, n, html = '') {
    this.parent = parent; this.cls = cls; this.html = html; this.free = [];
    for (let i = 0; i < n; i++) this.free.push(this.make());
  }
  make() {
    const el = document.createElement('i');
    el.className = this.cls;
    el.hidden = true;
    if (this.html) el.innerHTML = this.html;
    this.parent.appendChild(el);
    return el;
  }
  take() { const el = this.free.pop() || this.make(); el.hidden = false; return el; }
  give(el) { el.hidden = true; el.style.transform = ''; this.free.push(el); }
}

export class Fx {
  /** layers : { view (calque à l'échelle de la vue), world (calque dans la scène), ground (au sol) } */
  constructor({ camera, ticker, layers }) {
    this.camera = camera; this.ticker = ticker; this.L = layers;
    this.anims = new Set();
    this.tweens = new Set();
    this.skipping = false;
    this.reduced = false;
    // réserves
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'ow-fxsvg');
    this.svg.setAttribute('aria-hidden', 'true');
    layers.view.appendChild(this.svg);
    this.threads = [];
    for (let i = 0; i < 3; i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'ow-thread');
      g.innerHTML = '<path class="ow-thread-glow"/><path class="ow-thread-core"/>';
      g.style.display = 'none';
      this.svg.appendChild(g);
      this.threads.push({ g, glow: g.firstChild, core: g.lastChild, busy: false });
    }
    this.orbs = new Pool(layers.view, 'ow-orb', 3);
    this.sparks = new Pool(layers.view, 'ow-spark', 18);
    this.wsparks = new Pool(layers.world, 'ow-wspark', 16);
    this.dusts = new Pool(layers.world, 'ow-dust', 14);
    this.chips = new Pool(layers.world, 'ow-chip', 8);
    this.flakePool = new Pool(layers.world, 'ow-flake', 14);
    this.beams = new Pool(layers.world, 'ow-beam', 5);
    this.rings = new Pool(layers.ground, 'ow-ring', 5);
    this.stars = new Pool(layers.world, 'ow-star', 4, '<svg viewBox="-10 -10 20 20" width="20" height="20" aria-hidden="true"><path d="M0,-9 C1,-2 2,-1 9,0 C2,1 1,2 0,9 C-1,2 -2,1 -9,0 C-2,-1 -1,-2 0,-9Z"/></svg>');
  }

  /** Vrai quand il faut tout appliquer sans animer (saut en cours). */
  get instant() { return this.skipping; }

  /** Lance une animation WAAPI enregistrée (pour pouvoir la sauter). */
  anim(el, keyframes, opts) {
    const a = el.animate(keyframes, opts);
    if (this.skipping) a.finish(); // pendant un saut, ce qui commence se termine aussitôt
    this.anims.add(a);
    const done = () => this.anims.delete(a);
    a.finished.then(done, done);
    return a;
  }

  hurry(a) {
    const t = a.effect && a.effect.getComputedTiming();
    if (!t) return;
    const rem = (t.endTime ?? 0) - (Number(a.currentTime) || 0);
    if (rem > HURRY_MS) a.updatePlaybackRate(rem / HURRY_MS);
  }

  /** Interpolation pilotée par la boucle unique. fn(p) reçoit 0 → 1. */
  tween(dur, fn = null) {
    if (this.skipping) { if (fn) fn(1); return Promise.resolve(); }
    return new Promise((resolve) => {
      const tw = { start: performance.now(), dur: Math.max(1, dur), p: 0, from: 0, skipAt: 0, fn, resolve };
      this.tweens.add(tw);
      this.ticker.add((now) => {
        let p;
        if (tw.skipAt) p = tw.from + (1 - tw.from) * Math.min(1, (now - tw.skipAt) / HURRY_MS);
        else p = Math.min(1, (now - tw.start) / tw.dur);
        tw.p = p;
        if (tw.fn) tw.fn(p);
        if (p >= 1) { this.tweens.delete(tw); resolve(); return false; }
        return true;
      });
    });
  }
  wait(ms) { return this.tween(ms); }

  /** Termine tout ce qui joue en 150 ms ; ce qui viendra ensuite s'applique sans animation. */
  skip() {
    if (this.skipping) return;
    this.skipping = true;
    const now = performance.now();
    for (const a of this.anims) this.hurry(a);
    for (const tw of this.tweens) { tw.from = tw.p; tw.skipAt = now; }
  }
  reset() { this.skipping = false; }

  // ------------------------------------------------------------ fil de lumière (coordonnées de vue)
  /**
   * from : [x, y] dans la vue ; to() : [x, y] dans la vue, relu à chaque image (la caméra peut défiler).
   * Résout à l'arrivée de la tête.
   */
  thread({ from, to, dur = 760, thin = false, delay = 0 }) {
    const th = this.threads.find((t) => !t.busy);
    if (!th) return Promise.resolve();
    th.busy = true;
    th.g.classList.toggle('is-thin', thin);
    const orb = this.orbs.take();
    orb.classList.toggle('is-thin', thin);
    let lastSpark = 0;
    const run = async () => {
      if (delay) await this.wait(delay);
      th.g.style.display = '';
      await this.tween(dur, (p) => {
        const T = to();
        const S = from;
        const dist = Math.hypot(T[0] - S[0], T[1] - S[1]);
        const C = [(S[0] + T[0]) / 2 + (T[0] - S[0]) * 0.08, Math.min(S[1], T[1]) - Math.max(50, dist * 0.32)];
        const h = easeInOut(p);
        const trail = 0.34 * (1 - Math.max(0, (p - 0.7) / 0.3));
        const t0 = Math.max(0, h - trail);
        const d = subQuad(S, C, T, t0, Math.max(t0 + 0.001, h));
        th.glow.setAttribute('d', d);
        th.core.setAttribute('d', d);
        const H = quad(S, C, T, h);
        orb.style.transform = `translate(${f(H[0])}px, ${f(H[1])}px)`;
        const now = performance.now();
        if (!this.skipping && !thin && now - lastSpark > 46 && p < 0.96) { lastSpark = now; this.spark(H); }
      });
      th.g.style.display = 'none';
      th.busy = false;
      const at = orb.style.transform;
      this.anim(orb, [{ transform: `${at} scale(1)`, opacity: 1 }, { transform: `${at} scale(2.6)`, opacity: 0 }], { duration: 220, easing: 'ease-out' })
        .finished.then(() => this.orbs.give(orb), () => this.orbs.give(orb));
    };
    return run();
  }

  spark([x, y]) {
    const el = this.sparks.take();
    const dx = rand(-10, 10), dy = rand(6, 18);
    this.anim(el, [
      { transform: `translate(${f(x)}px, ${f(y)}px) scale(1)`, opacity: 1 },
      { transform: `translate(${f(x + dx)}px, ${f(y + dy)}px) scale(0)`, opacity: 0 },
    ], { duration: rand(380, 560), easing: 'cubic-bezier(.2,.7,.4,1)' }).finished.then(() => this.sparks.give(el), () => this.sparks.give(el));
  }

  // ------------------------------------------------------------ effets dans la scène (px monde)
  /** Anneau au sol (ellipse isométrique) centré en (x, y), rayon rx px monde. */
  ring(x, y, rx = 46, { cls = '', dur = 700, delay = 0, to = 1.5 } = {}) {
    const el = this.rings.take();
    el.className = `ow-ring ${cls}`;
    Object.assign(el.style, { left: f(x - rx) + 'px', top: f(y - rx / 2) + 'px', width: f(2 * rx) + 'px', height: f(rx) + 'px' });
    return this.anim(el, [{ transform: 'scale(.25)', opacity: 0.95 }, { transform: `scale(${to})`, opacity: 0 }], { duration: dur, delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' })
      .finished.then(() => this.rings.give(el), () => this.rings.give(el));
  }

  /** Éclats lumineux qui montent depuis des points (px monde). */
  rise(points, { dur = 900, spread = 10, height = 46 } = {}) {
    const all = points.map(([x, y], i) => {
      const el = this.wsparks.take();
      const dx = rand(-spread, spread), up = rand(height * 0.6, height);
      return this.anim(el, [
        { transform: `translate(${f(x)}px, ${f(y)}px) scale(.3)`, opacity: 0 },
        { transform: `translate(${f(x + dx * 0.4)}px, ${f(y - up * 0.4)}px) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${f(x + dx)}px, ${f(y - up)}px) scale(.2)`, opacity: 0 },
      ], { duration: dur * rand(0.8, 1.1), delay: i * 30, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
        .finished.then(() => this.wsparks.give(el), () => this.wsparks.give(el));
    });
    return Promise.all(all);
  }

  dust(x, y, count = 12) {
    const all = [];
    for (let i = 0; i < count; i++) {
      const el = this.dusts.take();
      const ang = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const sx = x + Math.cos(ang) * 20, sy = y + Math.sin(ang) * 10;
      const ex = x + Math.cos(ang) * rand(42, 64), ey = y + Math.sin(ang) * rand(20, 30) - rand(4, 14);
      const s = rand(0.9, 1.5);
      all.push(this.anim(el, [
        { transform: `translate(${f(sx)}px, ${f(sy)}px) scale(${f(s * 0.4)})`, opacity: 0.95 },
        { transform: `translate(${f((sx + ex) / 2)}px, ${f((sy + ey) / 2 - 4)}px) scale(${f(s)})`, opacity: 0.8, offset: 0.35 },
        { transform: `translate(${f(ex)}px, ${f(ey - 8)}px) scale(${f(s * 1.3)})`, opacity: 0 },
      ], { duration: rand(600, 820), easing: 'cubic-bezier(.15,.7,.3,1)' }).finished.then(() => this.dusts.give(el), () => this.dusts.give(el)));
    }
    for (let i = 0; i < 8; i++) {
      const el = this.chips.take();
      const dx = rand(-46, 46), up = rand(22, 44), dr = rand(-380, 380), kf = [];
      for (let s = 0; s <= 8; s++) { const t = s / 8; kf.push({ transform: `translate(${f(x + dx * t)}px, ${f(y - 6 - up * 4 * t * (1 - t) + t * 14)}px) rotate(${f(dr * t)}deg)`, opacity: t > 0.75 ? (1 - t) * 4 : 1 }); }
      all.push(this.anim(el, kf, { duration: rand(480, 680), easing: 'linear' }).finished.then(() => this.chips.give(el), () => this.chips.give(el)));
    }
    return Promise.all(all);
  }

  /** Flocons de cendre soufflés depuis une zone (liste de points px monde). */
  flakes(points, { dur = 1100 } = {}) {
    const all = points.map(([x, y], i) => {
      const el = this.flakePool.take();
      const dx = rand(-40, 40), up = rand(40, 90), dr = rand(-260, 260);
      return this.anim(el, [
        { transform: `translate(${f(x)}px, ${f(y)}px) rotate(0deg) scale(1)`, opacity: 0.95 },
        { transform: `translate(${f(x + dx * 0.5)}px, ${f(y - up * 0.6)}px) rotate(${f(dr * 0.5)}deg) scale(.9)`, opacity: 0.8, offset: 0.45 },
        { transform: `translate(${f(x + dx)}px, ${f(y - up)}px) rotate(${f(dr)}deg) scale(.5)`, opacity: 0 },
      ], { duration: dur * rand(0.75, 1.1), delay: i * 22, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'backwards' })
        .finished.then(() => this.flakePool.give(el), () => this.flakePool.give(el));
    });
    return Promise.all(all);
  }

  /** Faisceaux de lumière qui percent le sol (px monde). */
  beam(points, { dur = 900 } = {}) {
    const all = points.map(([x, y], i) => {
      const el = this.beams.take();
      Object.assign(el.style, { left: f(x - 9) + 'px', top: f(y - 120) + 'px' });
      return this.anim(el, [
        { transform: 'scaleY(0)', opacity: 0 },
        { transform: 'scaleY(1)', opacity: 1, offset: 0.35 },
        { transform: 'scaleY(1.08)', opacity: 0 },
      ], { duration: dur, delay: i * 70, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' })
        .finished.then(() => this.beams.give(el), () => this.beams.give(el));
    });
    return Promise.all(all);
  }

  /** Étoiles scintillantes (reflet). */
  twinkle(points) {
    const all = points.map(([x, y], i) => {
      const el = this.stars.take();
      return this.anim(el, [
        { transform: `translate(${f(x)}px, ${f(y)}px) scale(0) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${f(x)}px, ${f(y)}px) scale(1) rotate(45deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${f(x)}px, ${f(y)}px) scale(0) rotate(90deg)`, opacity: 0 },
      ], { duration: 640, delay: i * 110, easing: 'ease-out', fill: 'backwards' })
        .finished.then(() => this.stars.give(el), () => this.stars.give(el));
    });
    return Promise.all(all);
  }

  /** Fondu court (mouvement réduit) : un élément apparaît puis disparaît en 150 ms au total. */
  blink(el, peak = 1) {
    return this.anim(el, [{ opacity: 0 }, { opacity: peak, offset: 0.4 }, { opacity: 0 }], { duration: SKIP_MS, easing: 'linear' }).finished;
  }
}

export { pts, easeOut, easeInOut };
