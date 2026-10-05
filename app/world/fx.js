// Primitives d'effets : fils de lumière, anneaux, éclats, étoiles scintillantes.
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
