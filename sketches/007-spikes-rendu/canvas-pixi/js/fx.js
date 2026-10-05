// Moteur minimal : tweens + particules, pilotés par le ticker Pixi.
import { Sprite } from '../vendor/pixi.min.mjs';

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

const tweens = new Set();
export function tween({ dur, delay = 0, ease: e = ease.linear, update, done }) {
  const tw = { dur, delay, e, update, done, t: 0 };
  tweens.add(tw);
  return tw;
}
export const wait = (ms) => new Promise((res) => tween({ dur: ms, update() {}, done: res }));
export function tweenP(opts) { return new Promise((res) => tween({ ...opts, done: () => { opts.done?.(); res(); } })); }
export function stepTweens(dt) {
  for (const tw of tweens) {
    if (tw.delay > 0) { tw.delay -= dt; if (tw.delay > 0) continue; }
    tw.t += dt;
    const p = Math.min(1, tw.t / tw.dur);
    tw.update(tw.e(p), p);
    if (p >= 1) { tweens.delete(tw); tw.done?.(); }
  }
}
export const activeTweens = () => tweens.size;

// Particules : sprites réutilisés (pool par texture)
const live = [];
const pools = new Map();
export function particle(layer, texture, o) {
  let pool = pools.get(texture);
  if (!pool) { pool = []; pools.set(texture, pool); }
  const s = pool.pop() || new Sprite(texture);
  s.anchor.set(0.5);
  s.texture = texture;
  s.position.set(o.x, o.y);
  s.tint = o.tint ?? 0xffffff;
  s.alpha = o.alpha ?? 1;
  s.rotation = o.rot ?? 0;
  s.scale.set(o.scale ?? 1);
  s.blendMode = o.blend ?? 'normal';
  s.visible = true;
  layer.addChild(s);
  live.push({ s, layer, texture, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, drag: o.drag ?? 0, life: o.life ?? 600, t: 0,
    a0: s.alpha, s0: o.scale ?? 1, s1: o.scaleTo ?? o.scale ?? 1, spin: o.spin ?? 0, fadeIn: o.fadeIn ?? 0 });
}
export function stepParticles(dt) {
  const k = dt / 1000;
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i];
    p.t += dt;
    const u = p.t / p.life;
    if (u >= 1) {
      p.layer.removeChild(p.s);
      pools.get(p.texture).push(p.s);
      live.splice(i, 1);
      continue;
    }
    p.vy += p.g * k;
    if (p.drag) { p.vx *= 1 - p.drag * k; p.vy *= 1 - p.drag * k; }
    p.s.x += p.vx * k; p.s.y += p.vy * k;
    p.s.rotation += p.spin * k;
    p.s.scale.set(p.s0 + (p.s1 - p.s0) * u);
    const fin = p.fadeIn ? Math.min(1, p.t / p.fadeIn) : 1;
    p.s.alpha = p.a0 * fin * (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
  }
}
export const liveParticles = () => live.length;
