// Rendu DOM incrémental par identifiant : chaque entité est un élément persistant, créé une fois, puis mis
// à jour (attributs, profondeur, contenu quand son modèle change). Jamais de innerHTML global : les
// animations en cours et l'état d'interaction survivent à chaque rendu.
import { P, f, pts, hull } from './iso.js';
import { artFor, characterSVG, frostCellSVG } from './models.js';

const ART = new Map();
// px monde : 44 px à l'écran dès que les objets deviennent touchables (échelle ≥ 0,69, voir camera.js)
const MIN_HIT = 64;
const FROST_BOX = [-34, -8, 68, 42]; // case de givre : losange de 64 × 32 et aiguilles debout
function artKey(e) {
  return [e.model, e.variant ?? '', e.seed ?? '', e.m ?? '', e.s ?? '', e.end ? 1 : '', e.crop ?? '', e.progress ?? ''].join('|');
}
function cachedArt(e) {
  const k = artKey(e);
  let a = ART.get(k);
  if (!a) { a = artFor(e); ART.set(k, a); }
  return a;
}

/** Profondeur de tri (coin avant de l'emprise). Le sol passe sous tout ce qui est debout. */
export function depthOf(e) {
  if (e.kind === 'char' || e.kind === 'germ') return e.u + e.v + 1.05;
  return e.r + (e.h || 1) + e.c + (e.w || 1);
}
export function zOf(e) {
  if (e.kind === 'frost') return 60; // au-dessus de tous les sols (≤ 34), sous tout ce qui est debout (≥ 100)
  if (e.ground) return 10 + Math.round(depthOf(e));
  return 100 + Math.round(depthOf(e) * 10) + (e.bias || 0);
}

const GERM = [
  '',
  '<svg class="ow-sprite" viewBox="-12 -16 24 18" width="24" height="18" aria-hidden="true"><ellipse cx="0" cy="0" rx="6" ry="2.4" fill="#8a5a3a" opacity=".55"/><path d="M0,0 C-.4,-3 -1.5,-5 -6,-5.5 C-3.5,-2.6 -2,-1.4 0,0Z" fill="#8fc25c"/><path d="M0,0 C.4,-3.5 2,-6.2 6.5,-6.4 C3.8,-3 2.2,-1.4 0,0Z" fill="#a8d46f"/></svg>',
  '<svg class="ow-sprite" viewBox="-12 -22 24 24" width="24" height="24" aria-hidden="true"><ellipse cx="0" cy="0" rx="7" ry="2.8" fill="#8a5a3a" opacity=".55"/><path d="M0,0 V-11" stroke="#6f9e45" stroke-width="1.6"/><path d="M0,-4 C-2,-6 -4,-8.5 -9,-8 C-6,-4.5 -3,-3.8 0,-4Z" fill="#8fc25c"/><path d="M0,-7 C2,-10 4.5,-12 9,-11.4 C6,-8 3,-6.8 0,-7Z" fill="#a8d46f"/><circle cx="0" cy="-12.5" r="2.4" fill="#ffd98c"/><circle cx="-.7" cy="-13.2" r=".8" fill="#fffbe9"/></svg>',
];

export class Scene {
  /**
   * layers : { shadows, lights, groups: { [sector]: Element } }
   * hooks.label(e) → texte accessible ; hooks.enter(node) appelé à la création d'une entité (hors premier rendu).
   */
  constructor(layers, hooks = {}) {
    this.L = layers;
    this.hooks = hooks;
    this.nodes = new Map();
  }

  get(id) { return this.nodes.get(id); }

  /** Synchronise la liste voulue. Renvoie { added, removed, changed } (identifiants). */
  sync(list, { quiet = false } = {}) {
    const seen = new Set();
    const added = [], changed = [];
    for (const e of list) {
      seen.add(e.id);
      let n = this.nodes.get(e.id);
      // devenu touchable (secteur sorti de la cendre) : la balise change (div → button) et la zone de toucher n'a
      // de style transparent que sous .is-btn. L'élément est recréé sur place, sans fondu d'entrée.
      if (n && !!n.e.interactive !== !!e.interactive) {
        this.remove(n, true);
        n = this.create(e);
        this.nodes.set(e.id, n);
        changed.push(e.id);
        continue;
      }
      if (!n) { n = this.create(e); this.nodes.set(e.id, n); added.push(e.id); }
      else if (this.update(n, e)) changed.push(e.id);
    }
    const removed = [];
    for (const [id, n] of this.nodes) if (!seen.has(id)) { this.nodes.delete(id); this.remove(n, quiet); removed.push(id); }
    return { added, removed, changed };
  }

  create(e) {
    const interactive = !!e.interactive;
    const el = document.createElement(interactive ? 'button' : 'div');
    el.className = `ow-ent m-${e.kind === 'char' ? e.who : e.model ?? e.kind}${e.ground ? ' is-ground' : ''}${interactive ? ' is-btn' : ''}`;
    el.dataset.id = e.id;
    if (interactive) { el.type = 'button'; el.tabIndex = -1; } else el.setAttribute('aria-hidden', 'true');
    const n = { id: e.id, el, e: null, key: null, shadow: null, halo: null, last: {} };
    this.place(n, e);
    this.L.groups[e.sector].appendChild(el);
    this.update(n, e, true);
    return n;
  }

  // dessin (ou redessin) du contenu quand le modèle ou sa variante change
  draw(n, e) {
    const el = n.el;
    if (e.kind === 'char') {
      el.innerHTML = `<div class="ow-char-bob">${characterSVG(e.who)}</div><svg class="ow-hitbox" viewBox="-32 -60 64 66" width="64" height="66" aria-hidden="true"><ellipse class="ow-hit" cx="0" cy="-26" rx="32" ry="32"/></svg>`;
      n.art = null;
      return;
    }
    if (e.kind === 'germ') {
      el.innerHTML = GERM[e.stage] || '';
      n.art = null;
      return;
    }
    if (e.kind === 'frost') {
      const [bx, by, bw, bh] = FROST_BOX;
      el.innerHTML = `<svg class="ow-art" viewBox="${bx} ${by} ${bw} ${bh}" width="${bw}" height="${bh}" aria-hidden="true" focusable="false">${frostCellSVG(e.seed || 1)}</svg>`;
      n.art = null;
      return;
    }
    const art = cachedArt(e);
    n.art = art;
    // boîte du bouton (repère local) : le dessin, élargi à la zone de toucher pour un objet touchable
    let box = [art.x, art.y, art.w, art.h];
    let hit = '';
    if (e.interactive) {
      const w = e.w || 1, h = e.h || 1;
      const foot = [P(0, 0), P(w, 0), P(w, h), P(0, h)];
      const top = foot.map(([x, y]) => [x, Math.max(art.y + 4, y - (art.h - 6))]);
      const pts0 = foot.concat(top);
      // cible d'au moins 64 × 64 px monde, sans changer le dessin : zone transparente élargie
      const xs = pts0.map((p) => p[0]), ys = pts0.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      if (y1 - y0 < MIN_HIT) pts0.push([x0, y1 - MIN_HIT], [x1, y1 - MIN_HIT]);
      if (x1 - x0 < MIN_HIT) { const cx = (x0 + x1) / 2; pts0.push([cx - MIN_HIT / 2, y1 - 12], [cx + MIN_HIT / 2, y1 - 12]); }
      const poly = hull(pts0);
      hit = `<polygon class="ow-hit" points="${pts(poly)}"/>`;
      const hx = poly.map((p) => p[0]), hy = poly.map((p) => p[1]);
      const l = Math.min(art.x, ...hx), t = Math.min(art.y, ...hy);
      const r = Math.max(art.x + art.w, ...hx), b = Math.max(art.y + art.h, ...hy);
      box = [f(l), f(t), f(r - l), f(b - t)];
    }
    const [bx, by, bw, bh] = box;
    n.box = box;
    el.innerHTML = `<svg class="ow-art" viewBox="${bx} ${by} ${bw} ${bh}" width="${bw}" height="${bh}" aria-hidden="true" focusable="false">${art.svg}${hit}</svg>`;
    el.style.left = f(n.X + bx) + 'px';
    el.style.top = f(n.Y + by) + 'px';
    el.style.width = bw + 'px';
    el.style.height = bh + 'px';
    const [fx, fy] = P((e.w || 1) / 2, (e.h || 1) / 2);
    el.style.transformOrigin = `${f(fx - bx)}px ${f(fy - by)}px`;
    if (art.anchors.crystal) {
      const c = document.createElement('div');
      c.className = 'ow-crystal';
      c.style.left = f(art.anchors.crystal[0] - bx - 20) + 'px';
      c.style.top = f(art.anchors.crystal[1] - by - 20) + 'px';
      c.innerHTML = '<svg viewBox="-20 -20 40 40" width="40" height="40" aria-hidden="true"><ellipse rx="12" ry="4" cy="2" class="ow-crys-ring"/><polygon points="0,-15 -8,-1 1,4" class="ow-crys-t"/><polygon points="0,-15 1,4 8,-1" class="ow-crys-l"/><polygon points="0,13 -8,-1 1,4" class="ow-crys-l"/><polygon points="0,13 1,4 8,-1" class="ow-crys-r"/><polygon points="0,-15 -8,-1 -4.5,-3" fill="#fff" opacity=".55"/></svg>';
      el.appendChild(c);
    }
    if (art.anchors.smoke) {
      const s = document.createElement('div');
      s.className = 'ow-smoke';
      s.style.left = f(art.anchors.smoke[0] - bx) + 'px';
      s.style.top = f(art.anchors.smoke[1] - by) + 'px';
      s.innerHTML = '<i></i><i></i><i></i>';
      el.appendChild(s);
    }
    this.drawShadow(n, art, e);
  }

  drawShadow(n, art, e) {
    if (!art.shadow || e.ground) { n.shadow?.remove(); n.shadow = null; return; }
    if (!n.shadow) { n.shadow = document.createElement('div'); n.shadow.className = 'ow-shadow'; this.L.shadows.appendChild(n.shadow); }
    const xs = art.shadow.map((p) => p[0]), ys = art.shadow.map((p) => p[1]);
    const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1, w = Math.max(...xs) - x0 + 2, h = Math.max(...ys) - y0 + 2;
    Object.assign(n.shadow.style, { left: f(n.X + x0) + 'px', top: f(n.Y + y0) + 'px', width: f(w) + 'px', height: f(h) + 'px' });
    n.shadow.innerHTML = `<svg viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}"><polygon points="${pts(art.shadow)}"/></svg>`;
  }

  place(n, e) {
    if (e.kind === 'char' || e.kind === 'germ') {
      const [X, Y] = P(e.u, e.v);
      n.X = X; n.Y = Y;
      const box = e.kind === 'char' ? [-32, -60, 64, 66] : [-12, e.stage === 2 ? -22 : -16, 24, e.stage === 2 ? 24 : 18];
      Object.assign(n.el.style, { left: f(X + box[0]) + 'px', top: f(Y + box[1]) + 'px', width: box[2] + 'px', height: box[3] + 'px' });
      n.el.style.transformOrigin = `${-box[0]}px ${-box[1]}px`;
    } else if (e.kind === 'frost') {
      const [X, Y] = P(e.c, e.r);
      n.X = X; n.Y = Y;
      const [bx, by, bw, bh] = FROST_BOX;
      Object.assign(n.el.style, { left: f(X + bx) + 'px', top: f(Y + by) + 'px', width: bw + 'px', height: bh + 'px' });
      n.el.style.transformOrigin = `${-bx}px ${16 - by}px`;
    } else {
      const [X, Y] = P(e.c, e.r);
      n.X = X; n.Y = Y;
      if (n.art) {
        const [bx, by] = n.box || [n.art.x, n.art.y];
        n.el.style.left = f(X + bx) + 'px';
        n.el.style.top = f(Y + by) + 'px';
        this.drawShadow(n, n.art, e);
      }
    }
  }

  /** Met à jour une entité. Renvoie vrai si quelque chose de visible a changé. */
  update(n, e, first = false) {
    const prev = n.e;
    let changed = false;
    if (first || prev.r !== e.r || prev.c !== e.c || prev.u !== e.u || prev.v !== e.v) { this.place(n, e); changed = !first; }
    const key = e.kind === 'char' ? `char|${e.who}` : e.kind === 'germ' ? `germ|${e.stage}` : e.kind === 'frost' ? 'frost' : `${artKey(e)}|${e.interactive ? 1 : 0}`;
    if (key !== n.key) {
      if (e.kind === 'germ' && !first) this.place(n, e);
      this.draw(n, e); n.key = key; changed = changed || !first;
    }
    if (!first && prev.sector !== e.sector) this.L.groups[e.sector].appendChild(n.el);
    if (!first && prev.model !== e.model && e.model) { n.el.classList.remove(`m-${prev.model}`); n.el.classList.add(`m-${e.model}`); }
    const z = zOf(e) + (n.last.sel ? 3000 : 0);
    if (n.last.z !== z) { n.el.style.zIndex = z; n.last.z = z; }
    const label = e.interactive && this.hooks.label ? this.hooks.label(e) : null;
    if (label && n.last.label !== label) { n.el.setAttribute('aria-label', label); n.last.label = label; }
    for (const [attr, val] of [['allume', e.allume], ['reluit', e.reluit], ['neuf', e.placed], ['mure', e.plot?.ripe]]) {
      if (n.last[attr] !== !!val) { n.el.toggleAttribute(`data-${attr}`, !!val); n.last[attr] = !!val; }
    }
    this.syncHalo(n, e);
    n.e = e;
    return changed;
  }

  // halo de lumière (calque au-dessus du crépuscule) pour lanternes, cœur du Relais, cristal, Fanal
  syncHalo(n, e) {
    const anchor = e.kind === 'char' ? (e.who === 'fanal' ? [0, -32] : null) : n.art && (n.art.anchors.light || null);
    if (!e.light || !anchor) { if (n.halo) { n.halo.remove(); n.halo = null; } return; }
    if (!n.halo) {
      n.halo = document.createElement('i');
      n.halo.className = `ow-halo h-${e.light}`;
      n.halo.dataset.id = e.id;
      this.L.lights.appendChild(n.halo);
    }
    const x = n.X + anchor[0], y = n.Y + anchor[1];
    if (n.last.hx !== x || n.last.hy !== y) {
      n.halo.style.transform = `translate(${f(x)}px, ${f(y)}px)`;
      n.last.hx = x; n.last.hy = y;
    }
    const on = !!e.allume;
    if (n.last.hon !== on) { n.halo.toggleAttribute('data-on', on); n.last.hon = on; }
  }

  select(id) {
    for (const n of this.nodes.values()) {
      const sel = n.id === id;
      if (n.last.sel === sel) continue;
      n.last.sel = sel;
      n.el.classList.toggle('is-sel', sel);
      if (n.e.interactive) n.el.setAttribute('aria-pressed', String(sel));
      const z = zOf(n.e) + (sel ? 3000 : 0);
      n.el.style.zIndex = z; n.last.z = z;
    }
  }

  /** Point du monde (px) au centre visuel d'une entité, à une hauteur donnée de sa boîte (0 = pied, 1 = sommet). */
  pointOf(id, lift = 0.4) {
    const n = this.nodes.get(id);
    if (!n) return null;
    const e = n.e;
    if (e.kind === 'char' || e.kind === 'germ') return [n.X, n.Y - 20 * lift];
    if (!n.art) return [n.X, n.Y + 16 - 8 * lift]; // case de givre : milieu du losange
    const [fx, fy] = P((e.w || 1) / 2, (e.h || 1) / 2);
    const art = n.art;
    const top = art.y;
    return [n.X + fx, n.Y + fy + (top - fy) * lift];
  }

  remove(n, quiet) {
    const done = () => { n.el.remove(); n.shadow?.remove(); n.halo?.remove(); };
    if (quiet || !n.el.isConnected) return done();
    const a = n.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-in' });
    n.shadow?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
    a.finished.then(done, done);
  }

  clear() {
    for (const n of this.nodes.values()) { n.el.remove(); n.shadow?.remove(); n.halo?.remove(); }
    this.nodes.clear();
  }
}
