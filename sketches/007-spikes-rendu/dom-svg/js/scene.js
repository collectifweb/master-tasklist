// Rendu DOM incrémental par clés stables : chaque entité est un élément persistant,
// créé une fois puis mis à jour (classe, z-index, contenu partiel). Aucun innerHTML global.
import { P, f, pts, depthOf } from './iso.js';
import * as A from './art.js';

const ART = new Map();
function artFor(e) {
  const key = e.type === 'plot' ? 'plot' : `${e.type}:${e.m || ''}:${e.s || ''}:${e.seed || ''}:${e.len || ''}:${e.n || ''}`;
  if (ART.has(key)) return ART.get(key);
  let a;
  switch (e.type) {
    case 'serre': a = A.serre(); break;
    case 'silo': a = A.silo(); break;
    case 'relais': a = A.relais(); break;
    case 'entrepot': a = A.entrepot(); break;
    case 'muret': a = A.muret(e.len, { start: e.start, end: e.end }); break;
    case 'atelier': a = A.atelier(); break;
    case 'lanterne': a = A.lanterne(); break;
    case 'pont': a = A.pont(); break;
    case 'botte': a = A.botte(); break;
    case 'epouvantail': a = A.epouvantail(); break;
    case 'arbre': a = A.arbre(e.seed, e.m, e.s || 1); break;
    case 'sapin': a = A.sapin(e.seed, e.s || 1); break;
    case 'buisson': a = A.buisson(e.seed, e.m); break;
    case 'haie': a = A.haie(e.n, e.seed); break;
    case 'plot': { // emprise fixe ; les plants vivent dans un <g> mis à jour
      const x0 = -64 - 4, y0 = -6, x1 = 64 + 4, y1 = 64 + 4;
      a = { svg: '', x: x0, y: y0 - 18, w: x1 - x0, h: y1 - y0 + 18, shadow: null };
      break;
    }
  }
  ART.set(key, a);
  return a;
}

const STAGE_TXT = ['Labourée · prête à semer', 'Semis · lève dans 6 h', 'Pousses · mûre dans 3 h', 'Mûre · prête à récolter'];
export const labelOf = e => ({ name: e.name, info: e.type === 'plot' ? STAGE_TXT[e.stage] : e.info });

export class Scene {
  constructor(layers, state, onSelect) {
    this.L = layers; this.state = state; this.onSelect = onSelect;
    this.nodes = new Map();
    this.hooks = { enter: new Map(), stage: null };
    this.walkers = [];
  }

  depth(e) {
    if (e.depth) return e.depth;
    return depthOf(e.r, e.c, e.h, e.w) * 10 + (e.type === 'lanterne' ? 2 : 0);
  }

  render() {
    const seen = new Set();
    for (const e of this.state.entities) {
      seen.add(e.id);
      let n = this.nodes.get(e.id);
      if (!n) { n = this.create(e); this.nodes.set(e.id, n); const h = this.hooks.enter.get(e.id); if (h) { this.hooks.enter.delete(e.id); h(n); } }
      this.update(n, e);
    }
    for (const [id, n] of this.nodes) if (!seen.has(id)) { this.nodes.delete(id); this.remove(n); }
    this.updateRing();
  }

  create(e) {
    const art = artFor(e);
    const el = document.createElement(e.interactive ? 'button' : 'div');
    el.className = `ent t-${e.type}`;
    el.dataset.id = e.id;
    if (e.interactive) { el.type = 'button'; } else el.setAttribute('aria-hidden', 'true');
    const [X, Y] = P(e.c, e.r);
    Object.assign(el.style, { left: f(X + art.x) + 'px', top: f(Y + art.y) + 'px', width: art.w + 'px', height: art.h + 'px' });
    const [fx, fy] = P(e.w / 2, e.h / 2);
    el.style.transformOrigin = `${f(fx - art.x)}px ${f(fy - art.y)}px`;
    let hit = '';
    if (e.interactive) {
      const top = e.type === 'plot' ? -18 : art.y;
      const foot = [P(0, 0), P(e.w, 0), P(e.w, e.h), P(0, e.h)];
      const ring = foot.concat(foot.map(([x, y]) => [x, Math.max(top, y - (y - top))]));
      hit = `<polygon class="hit" points="${pts(hullPts(ring))}"/>`;
    }
    const svg = `<svg class="art" viewBox="${art.x} ${art.y} ${art.w} ${art.h}" width="${art.w}" height="${art.h}" aria-hidden="true">${art.svg}${e.type === 'plot' ? '<g class="plants"></g>' : ''}${hit}</svg>`;
    el.insertAdjacentHTML('beforeend', svg);
    const n = { id: e.id, el, art, e, last: {} };
    if (art.sub?.crystal) {
      const c = document.createElement('div');
      c.className = 'crystal';
      c.style.left = f(art.sub.crystal[0] - art.x - 40) + 'px'; c.style.top = f(art.sub.crystal[1] - art.y - 40) + 'px';
      c.innerHTML = A.crystalSVG();
      el.appendChild(c); n.crystal = c;
    }
    if (art.sub?.smoke) {
      const s = document.createElement('div');
      s.className = 'smoke';
      s.style.left = f(art.sub.smoke[0] - art.x) + 'px'; s.style.top = f(art.sub.smoke[1] - art.y) + 'px';
      s.innerHTML = '<i></i><i></i><i></i>';
      el.appendChild(s);
    }
    if (e.interactive) el.addEventListener('click', ev => { ev.stopPropagation(); this.onSelect(e.id); });
    this.L.entities.appendChild(el);
    if (art.shadow) {
      const sh = document.createElement('div');
      sh.className = 'shadow';
      const xs = art.shadow.map(p => p[0]), ys = art.shadow.map(p => p[1]);
      const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1, w = Math.max(...xs) - x0 + 2, h = Math.max(...ys) - y0 + 2;
      Object.assign(sh.style, { left: f(X + x0) + 'px', top: f(Y + y0) + 'px', width: f(w) + 'px', height: f(h) + 'px', transformOrigin: `${f(fx - x0)}px ${f(fy - y0)}px` });
      sh.innerHTML = `<svg viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}"><polygon points="${pts(art.shadow)}"/></svg>`;
      this.L.shadows.appendChild(sh);
      n.shadow = sh;
    }
    return n;
  }

  update(n, e) {
    const sel = this.state.selected === e.id;
    const z = (sel ? 3000 : 0) + this.depth(e);
    if (n.last.z !== z) { n.el.style.zIndex = z; n.last.z = z; }
    if (n.last.sel !== sel) {
      n.el.classList.toggle('is-sel', sel);
      if (e.interactive) n.el.setAttribute('aria-pressed', sel ? 'true' : 'false');
      if (sel) this.showTag(n, e); else this.hideTag(n);
      n.last.sel = sel;
    }
    if (e.interactive) {
      const lab = labelOf(e);
      const txt = `${lab.name}${lab.info ? ' — ' + lab.info : ''}`;
      if (n.last.aria !== txt) { n.el.setAttribute('aria-label', txt); n.last.aria = txt; if (sel && n.tag) n.tag.querySelector('small').textContent = lab.info; }
    }
    if (e.type === 'plot' && n.last.stage !== e.stage) {
      const from = n.last.stage;
      n.last.stage = e.stage;
      const g = n.el.querySelector('.plants');
      if (from === undefined || !this.hooks.stage) g.innerHTML = A.plantsSVG(e.stage, e.crop, e.r * 7 + e.c);
      else this.hooks.stage(n, e, from, g);
    }
  }

  showTag(n, e) {
    const lab = labelOf(e);
    if (!n.tag) {
      n.tag = document.createElement('span');
      n.tag.className = 'tag';
      n.tag.innerHTML = '<b></b><small></small>';
      n.el.appendChild(n.tag);
    }
    n.tag.querySelector('b').textContent = lab.name;
    n.tag.querySelector('small').textContent = lab.info || '';
    n.tag.hidden = false;
    if (!this.state.reduced) n.tag.animate([{ opacity: 0, transform: `translate(-50%, 6px) scale(${this.state.inv * .8})` }, { opacity: 1, transform: `translate(-50%, 0) scale(${this.state.inv})` }], { duration: 220, easing: 'cubic-bezier(.2,1.4,.4,1)' });
  }
  hideTag(n) { if (n.tag) n.tag.hidden = true; }

  updateRing() {
    const id = this.state.selected;
    const e = this.state.entities.find(x => x.id === id);
    let ring = this.L.ring;
    if (!e || e.type === 'villageois') { ring.hidden = true; return; }
    const [X, Y] = P(e.c, e.r);
    const foot = [P(0, 0), P(e.w, 0), P(e.w, e.h), P(0, e.h)];
    const key = `${e.id}`;
    if (ring.dataset.key !== key) {
      ring.dataset.key = key;
      ring.style.left = (X - e.h * 32 - 6) + 'px'; ring.style.top = (Y - 6) + 'px';
      const w = (e.w + e.h) * 32 + 12, h = (e.w + e.h) * 16 + 12;
      ring.innerHTML = `<svg viewBox="${-e.h * 32 - 6} -6 ${w} ${h}" width="${w}" height="${h}"><polygon points="${pts(foot)}"/></svg>`;
    }
    ring.hidden = false;
  }

  remove(n) {
    const done = () => { n.el.remove(); n.shadow?.remove(); };
    if (this.state.reduced) return done();
    const a = n.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(1.05,.6)' }], { duration: 260, easing: 'ease-in' });
    n.shadow?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260 });
    a.finished.then(done, done);
  }

  // ---------------------------------------------------------------- villageois
  addWalker(w) {
    const e = { ...w, type: 'villageois', interactive: true, h: 1, w: 1 };
    this.state.entities.push(e);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ent vill';
    el.dataset.id = e.id;
    el.innerHTML = `<div class="vflip"><div class="vbob">${A.villageoisSVG(w.kind)}</div></div>`;
    el.addEventListener('click', ev => { ev.stopPropagation(); this.onSelect(e.id); });
    this.L.entities.appendChild(el);
    const n = { id: e.id, el, e, last: {}, walker: w };
    this.nodes.set(e.id, n);
    // route aller-retour en une seule animation composée (transform → compositeur)
    const pA = P(...w.from), pB = P(...w.to);
    const dist = Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1]);
    const move = dist / w.speed * 1000, pause = w.pause;
    const total = 2 * (move + pause);
    const o1 = pause / total, o2 = (pause + move) / total, o3 = (2 * pause + move) / total;
    const tr = p => `translate(${f(p[0] - 14)}px, ${f(p[1] - 38)}px)`;
    w.total = total; w.o = [o1, o2, o3]; w.n = n;
    el.style.transform = tr(pA);
    if (!this.state.reduced) {
      w.anim = el.animate([
        { offset: 0, transform: tr(pA) }, { offset: o1, transform: tr(pA) },
        { offset: o2, transform: tr(pB) }, { offset: o3, transform: tr(pB) }, { offset: 1, transform: tr(pA) }
      ], { duration: total, iterations: Infinity, delay: -w.phase * total });
      const flipA = w.to[1] > w.from[1] || w.to[0] < w.from[0] ? 'scaleX(-1)' : 'scaleX(1)';
      const flipB = flipA === 'scaleX(1)' ? 'scaleX(-1)' : 'scaleX(1)';
      w.flip = el.firstElementChild.animate([
        { offset: 0, transform: flipA }, { offset: o3, transform: flipA }, { offset: o3, transform: flipB }, { offset: 1, transform: flipB }
      ], { duration: total, iterations: Infinity, delay: -w.phase * total });
    } else {
      el.style.transform = tr(this.posAt(w, w.phase));
    }
    this.walkers.push(w);
    this.tickWalkers();
  }

  posAt(w, p) {
    const [o1, o2, o3] = w.o;
    let t;
    if (p < o1) t = 0; else if (p < o2) t = (p - o1) / (o2 - o1); else if (p < o3) t = 1; else t = 1 - (p - o3) / (1 - o3);
    return [w.from[0] + (w.to[0] - w.from[0]) * t, w.from[1] + (w.to[1] - w.from[1]) * t];
  }

  // Profondeur des marcheurs : réévaluée à basse fréquence (le mouvement reste sur le compositeur)
  tickWalkers() {
    for (const w of this.walkers) {
      const p = w.anim ? ((w.anim.currentTime % w.total) + w.total) % w.total / w.total : w.phase;
      const [u, v] = this.posAt(w, p);
      const d = (Math.floor(v) + 1 + Math.floor(u) + 1) * 10 + 5;
      const sel = this.state.selected === w.id;
      const z = (sel ? 3000 : 0) + d;
      const n = w.n;
      if (n.last.z !== z) { n.el.style.zIndex = z; n.last.z = z; }
      if (n.last.sel !== sel) { n.el.classList.toggle('is-sel', sel); n.el.setAttribute('aria-pressed', String(sel)); sel ? this.showTag(n, n.e) : this.hideTag(n); n.last.sel = sel; }
      const lab = `${w.name} — ${w.info}`;
      if (n.last.aria !== lab) { n.el.setAttribute('aria-label', lab); n.last.aria = lab; }
    }
  }
}

function hullPts(p) {
  const s = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = s.length - 1; i >= 0; i--) { const q = s[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
