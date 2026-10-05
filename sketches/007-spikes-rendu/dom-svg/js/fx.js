// Les trois moments animés, uniquement avec la Web Animations API (transform/opacity → compositeur).
import { P, f } from './iso.js';
import * as A from './art.js';

export const ICONS = {
  energie: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5 5.6 13.1h5.1l-1 8.4 7.7-10.8h-5.2z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  materiaux: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 20.2 7v9.9L12 21.2 3.8 16.9V7z" fill="currentColor" opacity=".25"/><path d="M12 2.8 20.2 7v9.9L12 21.2 3.8 16.9V7zM3.8 7 12 11.3 20.2 7M12 11.3v9.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  confiance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5C7 16.6 3.6 13.5 3.6 9.4 3.6 6.6 5.7 4.6 8.2 4.6c1.6 0 3 .8 3.8 2.1.8-1.3 2.2-2.1 3.8-2.1 2.5 0 4.6 2 4.6 4.8 0 4.1-3.4 7.2-8.4 11.1z" fill="currentColor"/><path d="M12 8.2v9" stroke="#fff8e8" stroke-width="1.4" stroke-linecap="round" opacity=".8"/></svg>'
};

const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class HUD {
  constructor(root, values) {
    this.shown = { ...values };
    this.chips = {};
    for (const k of Object.keys(values)) {
      const chip = root.querySelector(`[data-res="${k}"]`);
      this.chips[k] = { chip, num: chip.querySelector('b'), icon: chip.querySelector('.ic') };
      this.chips[k].num.textContent = values[k];
    }
    this.tw = {};
  }
  target(k) { const r = this.chips[k].icon.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  // décompte animé + rebond
  add(k, amount, reduced) {
    const from = this.shown[k], to = from + amount;
    this.shown[k] = to;
    const c = this.chips[k];
    if (reduced) { c.num.textContent = to; c.chip.animate([{ backgroundColor: 'var(--hl)' }, { backgroundColor: 'var(--chip)' }], { duration: 600 }); return; }
    cancelAnimationFrame(this.tw[k]);
    const start = performance.now(), dur = 280, base = Number(c.num.textContent) || from;
    const step = now => {
      const t = Math.min(1, (now - start) / dur);
      c.num.textContent = Math.round(base + (to - base) * easeOut(t));
      if (t < 1) this.tw[k] = requestAnimationFrame(step);
    };
    this.tw[k] = requestAnimationFrame(step);
    c.num.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.32) translateY(-2px)', offset: .35 }, { transform: 'scale(.94)', offset: .7 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    c.icon.animate([{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.25) rotate(-8deg)', offset: .4 }, { transform: 'scale(1)' }], { duration: 340, easing: 'ease-out' });
  }
  float(k, txt, reduced) {
    const c = this.chips[k];
    const s = document.createElement('span');
    s.className = 'gain'; s.textContent = txt;
    c.chip.appendChild(s);
    const a = s.animate(reduced ? [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'translateY(-4px) scale(.7)' }, { opacity: 1, transform: 'translateY(6px) scale(1.05)', offset: .25 }, { opacity: 1, transform: 'translateY(10px)', offset: .75 }, { opacity: 0, transform: 'translateY(14px)' }], { duration: 1500, easing: 'ease-out' });
    a.finished.then(() => s.remove());
  }
}

export class FX {
  constructor({ scene, hud, overlay, worldfx, groundfx, shake, live, state }) {
    Object.assign(this, { scene, hud, overlay, worldfx, groundfx, shake, live, state });
    // réserve de jetons pré-créés : aucune analyse SVG pendant le moment
    this.pool = { energie: [], materiaux: [], confiance: [] };
    for (const [k, n] of [['energie', 10], ['materiaux', 8], ['confiance', 3]]) for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = `tok tok-${k}`; el.innerHTML = ICONS[k]; el.hidden = true;
      overlay.appendChild(el); this.pool[k].push(el);
    }
  }
  token(k) { const el = this.pool[k].pop(); if (el) { el.hidden = false; return el; } const n = document.createElement('div'); n.className = `tok tok-${k}`; n.innerHTML = ICONS[k]; this.overlay.appendChild(n); return n; }
  release(k, el) { el.hidden = true; this.pool[k].push(el); }
  get reduced() { return this.state.reduced; }
  say(t) { this.live.textContent = ''; setTimeout(() => { this.live.textContent = t; }, 30); }

  // ---------------------------------------------------------- 1. Quête terminée
  quest(sourceId = 'relais') {
    const gains = { energie: 12, materiaux: 8, confiance: 1 };
    for (const k in gains) this.state.res[k] += gains[k];      // vérité immédiate ; l'affichage suit les icônes
    this.say(`Quête terminée : +${gains.energie} Énergie, +${gains.materiaux} Matériaux, +${gains.confiance} Confiance.`);
    const n = this.scene.nodes.get(sourceId);
    if (this.reduced || !n) { for (const k in gains) { this.hud.add(k, gains[k], true); this.hud.float(k, '+' + gains[k], true); } return Promise.resolve(); }
    const src = (n.crystal || n.el).getBoundingClientRect();
    const sx = src.left + src.width / 2, sy = src.top + src.height * (n.crystal ? .5 : .35);
    // le bâtiment « expire » : squash + anneau d'onde au sol
    n.el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06,.92)', offset: .3 }, { transform: 'scale(.97,1.05)', offset: .65 }, { transform: 'scale(1)' }], { duration: 460, easing: 'ease-out' });
    n.crystal?.firstElementChild.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.5)', filter: 'brightness(1.6)', offset: .25 }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 700, easing: 'ease-out' });
    this.groundRing(n.e, 'ring-tech');
    const targets = { energie: this.hud.target('energie'), materiaux: this.hud.target('materiaux'), confiance: this.hud.target('confiance') };
    const chunks = [['energie', 3], ['energie', 3], ['energie', 2], ['energie', 2], ['energie', 2], ['materiaux', 2], ['materiaux', 2], ['materiaux', 2], ['materiaux', 2], ['confiance', 1]];
    for (const k in gains) setTimeout(() => this.hud.float(k, '+' + gains[k], false), 820);
    const all = chunks.map(([k, amt], i) => {
      const el = this.token(k);
      const [tx, ty] = targets[k];
      const ang = -Math.PI / 2 + (i / (chunks.length - 1) - .5) * 2.6 + rand(-.15, .15);
      const dist = rand(58, 96);
      const bx = sx + Math.cos(ang) * dist, by = sy + Math.sin(ang) * dist * .8 + 10;
      const cx = (bx + tx) / 2 + rand(-60, 60), cy = Math.min(by, ty) - rand(40, 110);
      const kf = [];
      const N = 26, spin = rand(-160, 160);
      for (let s = 0; s <= N; s++) {
        const t = s / N;
        let x, y, sc, op = 1, rot;
        if (t < .3) { const q = easeOut(t / .3); x = sx + (bx - sx) * q; y = sy + (by - sy) * q - Math.sin(q * Math.PI) * 18; sc = .3 + .95 * q; rot = spin * q * .4; }
        else if (t < .42) { const q = (t - .3) / .12; x = bx; y = by + Math.sin(q * Math.PI) * 4; sc = 1.25 - .15 * q; rot = spin * .4; }
        else { const q = easeInOut((t - .42) / .58); const m = 1 - q; x = m * m * bx + 2 * m * q * cx + q * q * tx; y = m * m * by + 2 * m * q * cy + q * q * ty; sc = 1.1 - .55 * q; rot = spin * (.4 + .6 * q); op = q > .96 ? 0 : 1; }
        kf.push({ transform: `translate(${f(x - 15)}px, ${f(y - 15)}px) rotate(${f(rot)}deg) scale(${f(sc * 100) / 100})`, opacity: op });
      }
      const anim = el.animate(kf, { duration: 1150 + i * 30, delay: i * 45, easing: 'linear', fill: 'backwards' });
      return anim.finished.then(() => { this.release(k, el); this.hud.add(k, amt, false); });
    });
    return Promise.all(all);
  }

  groundRing(e, cls) {
    if (this.reduced) return;
    const [X, Y] = P(e.c + e.w / 2, e.r + e.h / 2);
    const r = document.createElement('div');
    r.className = `pulse ${cls}`;
    r.style.left = f(X - 60) + 'px'; r.style.top = f(Y - 30) + 'px';
    this.groundfx.appendChild(r);
    r.animate([{ transform: 'scale(.2)', opacity: .95 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(() => r.remove());
  }

  // ---------------------------------------------------------- 2. Construire
  build(slot) {
    const S = this.state;
    const old = S.entities.findIndex(e => e.id === 'atelier');
    if (old >= 0) { S.entities.splice(old, 1); if (S.selected === 'atelier') S.selected = null; this.scene.render(); }
    const e = { id: 'atelier', type: 'atelier', r: slot.r, c: slot.c, h: 1, w: 1, interactive: true, name: 'Atelier', info: 'Neuf · secteur Maison' };
    this.say('Atelier construit.');
    return new Promise(res => setTimeout(() => {
      this.scene.hooks.enter.set('atelier', n => this.dropIn(n, e).then(res));
      S.entities.push(e);
      this.scene.render();
    }, old >= 0 ? 300 : 0));
  }

  dropIn(n, e) {
    if (this.reduced) {
      n.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      return Promise.resolve();
    }
    const [X, Y] = P(e.c, e.r);
    // fantôme d'emprise
    const g = document.createElement('div');
    g.className = 'ghost';
    g.style.left = (X - 38) + 'px'; g.style.top = (Y - 6) + 'px';
    g.innerHTML = `<svg viewBox="-38 -6 76 44" width="76" height="44"><polygon points="0,0 32,16 0,32 -32,16"/></svg>`;
    this.groundfx.appendChild(g);
    g.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.06)', offset: .5 }, { opacity: .9, transform: 'scale(1)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
    const fall = 430, total = 1050, o = fall / total;
    const a = n.el.animate([
      { transform: 'translateY(-340px) scale(.94,1.08)', opacity: 0, offset: 0, easing: 'cubic-bezier(.55,0,1,.6)' },
      { transform: 'translateY(-300px) scale(.94,1.08)', opacity: 1, offset: .06, easing: 'cubic-bezier(.55,0,1,.6)' },
      { transform: 'translateY(0) scale(.94,1.08)', offset: o },
      { transform: 'translateY(0) scale(1.3,.68)', offset: o + .06, easing: 'cubic-bezier(.3,0,.3,1)' },
      { transform: 'translateY(0) scale(.88,1.16)', offset: o + .22, easing: 'cubic-bezier(.3,0,.3,1)' },
      { transform: 'translateY(0) scale(1.06,.95)', offset: o + .36 },
      { transform: 'translateY(0) scale(.98,1.02)', offset: o + .48 },
      { transform: 'none', offset: 1 }
    ], { duration: total, delay: 160, fill: 'backwards' });
    n.shadow?.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(.3)', offset: .06 }, { opacity: 1, transform: 'scale(1)', offset: o }, { opacity: 1, transform: 'scale(1)' }], { duration: total, delay: 160, fill: 'backwards' });
    setTimeout(() => {
      g.animate([{ opacity: .9 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.then(() => g.remove());
      this.dust(X, Y + 16, 20); this.splinters(X, Y + 10);
      this.groundRing(e, 'ring-dust');
      this.shake.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,3px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(1px,0)' }, { transform: 'translate(0,0)' }], { duration: 300, easing: 'ease-out' });
      navigator.vibrate?.(18);
    }, 160 + fall);
    return a.finished;
  }

  dust(x, y, count) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'dust';
      const ang = i / count * Math.PI * 2 + rand(-.2, .2);
      const sx = x + Math.cos(ang) * 22, sy = y + Math.sin(ang) * 11;
      const ex = x + Math.cos(ang) * rand(46, 70), ey = y + Math.sin(ang) * rand(22, 34) - rand(4, 16);
      const s = rand(.9, 1.6);
      p.style.left = '0px'; p.style.top = '0px';
      this.worldfx.appendChild(p);
      p.animate([
        { transform: `translate(${f(sx)}px, ${f(sy)}px) scale(${f(s * .4)})`, opacity: .95 },
        { transform: `translate(${f((sx + ex) / 2)}px, ${f((sy + ey) / 2 - 4)}px) scale(${f(s)})`, opacity: .8, offset: .35 },
        { transform: `translate(${f(ex)}px, ${f(ey - 8)}px) scale(${f(s * 1.35)})`, opacity: 0 }
      ], { duration: rand(600, 850), easing: 'cubic-bezier(.15,.7,.3,1)' }).finished.then(() => p.remove());
    }
  }

  splinters(x, y) {
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('i');
      p.className = 'chip-w';
      this.worldfx.appendChild(p);
      const dx = rand(-50, 50), up = rand(24, 48), dr = rand(-400, 400), kf = [];
      for (let s = 0; s <= 8; s++) { const t = s / 8; kf.push({ transform: `translate(${f(x + dx * t)}px, ${f(y - up * 4 * t * (1 - t) + t * 18)}px) rotate(${f(dr * t)}deg)`, opacity: t > .75 ? (1 - t) * 4 : 1 }); }
      p.animate(kf, { duration: rand(500, 700), easing: 'linear' }).finished.then(() => p.remove());
    }
  }

  // ---------------------------------------------------------- 3. Récolter
  harvest() {
    const S = this.state;
    const plot = S.entities.find(e => e.type === 'plot' && e.stage === 3);
    if (!plot) { // aucune parcelle mûre : pousse accélérée (démontre aussi les transitions d'état)
      S.entities.filter(e => e.type === 'plot').forEach(e => { e.stage = Math.min(3, e.stage + 1); });
      this.scene.render();
      this.say('Les cultures poussent.');
      return Promise.resolve('grow');
    }
    plot.stage = 0;
    this.scene.render();                 // → hook de stade : vidage animé
    S.res.energie += 3;
    this.say(`${plot.name} récoltée : +3 Énergie.`);
    setTimeout(() => { plot.stage = 1; this.scene.render(); }, 2600);
    return Promise.resolve('harvest');
  }

  // transition de stade appelée par le rendu incrémental
  stageHook(n, e, from, g) {
    const old = [...g.querySelectorAll('.plant')];
    const fresh = A.plantsSVG(e.stage, e.crop, e.r * 7 + e.c);
    if (this.reduced) {
      g.innerHTML = fresh;
      if (from === 3 && e.stage === 0) { this.plus(n, e, true); this.hud.add('energie', 3, true); }
      return;
    }
    if (from === 3 && e.stage === 0) {
      old.forEach((p, i) => p.animate([
        { transform: 'translateY(0) scale(1)', opacity: 1 },
        { transform: 'translateY(-5px) scale(1.18)', opacity: 1, offset: .35 },
        { transform: 'translateY(-16px) scale(0)', opacity: 0 }
      ], { duration: 380, delay: (19 - i) * 16, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' }));
      n.el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04,.94)', offset: .3 }, { transform: 'scale(1)' }], { duration: 300 });
      setTimeout(() => { g.innerHTML = ''; }, 720);
      this.chaff(e);
      setTimeout(() => this.plus(n, e, false), 120);
      setTimeout(() => this.hud.add('energie', 3, false), 760);
      return;
    }
    // pousse : les nouveaux plants surgissent, de l'arrière vers l'avant
    g.innerHTML = fresh;
    [...g.querySelectorAll('.plant')].forEach((p, i) => p.animate([
      { transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: .6 }, { transform: 'scale(1)' }
    ], { duration: 420, delay: i * 22, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'backwards' }));
  }

  chaff(e) {
    const crop = e.crop;
    for (let i = 0; i < 26; i++) {
      const u = e.c + .25 + Math.random() * 1.5, v = e.r + .25 + Math.random() * 1.5;
      const [x, y] = P(u, v, 8);
      const p = document.createElement('i');
      p.className = `chaff ${crop === 'ble' ? 'c-ble' : 'c-chou'} ${i % 3 === 0 ? 'c-leaf' : ''}`;
      this.worldfx.appendChild(p);
      const dx = rand(-34, 34), up = rand(30, 62), dr = rand(-260, 260);
      const kf = [];
      for (let s = 0; s <= 10; s++) {
        const t = s / 10;
        kf.push({ transform: `translate(${f(x + dx * t)}px, ${f(y - up * (4 * t * (1 - t)) + t * 14)}px) rotate(${f(dr * t)}deg) scale(${t < .1 ? f(t * 10) : 1})`, opacity: t > .8 ? (1 - t) * 5 : 1 });
      }
      p.animate(kf, { duration: rand(650, 950), delay: i * 14, easing: 'linear', fill: 'backwards' }).finished.then(() => p.remove());
    }
  }

  plus(n, e, reduced) {
    const [x, y] = P(e.c + 1, e.r + 1, 26);
    const t = document.createElement('div');
    t.className = 'plus';
    t.innerHTML = `<span>+3</span>${ICONS.energie}`;
    t.style.left = f(x) + 'px'; t.style.top = f(y) + 'px';
    this.worldfx.appendChild(t);
    const inv = this.state.inv;
    const a = reduced
      ? t.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1400 })
      : t.animate([
        { transform: `translate(-50%, 0) scale(${inv * .4})`, opacity: 0 },
        { transform: `translate(-50%, -26px) scale(${inv * 1.2})`, opacity: 1, offset: .22, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: `translate(-50%, -38px) scale(${inv})`, opacity: 1, offset: .7 },
        { transform: `translate(-50%, -58px) scale(${inv})`, opacity: 0 }
      ], { duration: 1300, easing: 'ease-out' });
    a.finished.then(() => t.remove());
  }
}
