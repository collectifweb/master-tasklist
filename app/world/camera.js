// Cadrage : défilement NATIF (conteneur overflow:auto, inertie et barres du système) et zoom par paliers.
// La scène est mise à l'échelle par une transformation ; le contenu défilable prend sa taille réelle.
// Zones masquées par l'interface (HUD en haut, feuille en bas) lues dans les variables de tokens.css
// (--world-safe-top, --world-cover-bottom) au moyen de deux sondes, ou passées par options.insets.
import { BOUNDS } from './terrain.js';

export const MIN_TARGET = 44;      // px : cible tactile minimale
const TILE_W = 64;                  // largeur d'une case à l'échelle 1
export const NEAR_SCALE = MIN_TARGET / TILE_W + 0.06; // ≈ 0,75 : une case fait au moins 48 px de large
const LEVELS = [1.05, 1.4];
const PAD = 12;

export class Camera {
  constructor({ root, scroller, content, stage, plaques, insets, onChange }) {
    Object.assign(this, { root, scroller, content, stage, plaques, onChange });
    this.fixedInsets = insets || null;
    this.s = 1; this.fit = 1; this.ox = 0; this.oy = 0;
    this.sx = 0; this.sy = 0; this.W = 0; this.H = 0; this.top = 0; this.bottom = 0;
    this.probeTop = this.probe('--world-safe-top');
    this.probeBottom = this.probe('--world-cover-bottom');
    this.onScroll = () => { this.sx = this.scroller.scrollLeft; this.sy = this.scroller.scrollTop; };
    scroller.addEventListener('scroll', this.onScroll, { passive: true });
  }

  probe(varName) {
    const p = document.createElement('i');
    p.className = 'ow-probe';
    p.style.height = `var(${varName}, 0px)`;
    this.root.appendChild(p);
    return p;
  }

  measure() {
    this.W = this.root.clientWidth;
    this.H = this.root.clientHeight;
    const ins = this.fixedInsets;
    this.top = ins ? ins.top || 0 : this.probeTop.offsetHeight;
    this.bottom = ins ? ins.bottom || 0 : this.probeBottom.offsetHeight;
    // garde-fou : jamais moins de 45 % de hauteur libre
    const maxCover = this.H * 0.55;
    if (this.top + this.bottom > maxCover) { const k = maxCover / (this.top + this.bottom); this.top *= k; this.bottom *= k; }
    const freeH = Math.max(80, this.H - this.top - this.bottom);
    this.fit = Math.max(0.28, Math.min(1.25, (this.W - 2 * PAD) / BOUNDS.w, freeH / BOUNDS.h));
  }

  /** Échelle de départ : toute l'île si les cibles restent ≥ 44 px, sinon le cadrage rapproché. */
  defaultScale() { return this.fit >= NEAR_SCALE ? this.fit : NEAR_SCALE; }
  get far() { return this.s * TILE_W < MIN_TARGET; }
  levels() { return [...new Set([this.fit, ...(this.fit < NEAR_SCALE ? [NEAR_SCALE] : []), ...LEVELS.filter((l) => l > this.fit + 0.05)])].sort((a, b) => a - b); }

  /** Calcule et applique la mise en page pour l'échelle s. Ne touche pas au défilement. */
  layout(s) {
    this.s = s;
    const bw = BOUNDS.w * s, bh = BOUNDS.h * s;
    const freeH = Math.max(80, this.H - this.top - this.bottom);
    const cw = Math.max(this.W, bw + 2 * PAD);
    const ch = Math.max(this.H, this.top + bh + this.bottom + PAD);
    this.cw = cw; this.ch = ch;
    this.ox = (cw - bw) / 2 - BOUNDS.x * s;
    this.oy = this.top + Math.max(0, (freeH - bh) / 2) - BOUNDS.y * s;
    this.content.style.width = Math.round(cw) + 'px';
    this.content.style.height = Math.round(ch) + 'px';
    this.stage.style.transform = `translate(${this.ox.toFixed(1)}px, ${this.oy.toFixed(1)}px) scale(${s.toFixed(4)})`;
    this.root.style.setProperty('--ow-s', s.toFixed(4));
    this.root.style.setProperty('--ow-inv', (1 / s).toFixed(4));
    this.onChange?.();
  }

  /** Point du monde → coordonnées dans le contenu défilable. */
  toContent(x, y) { return [this.ox + x * this.s, this.oy + y * this.s]; }
  /** Point du monde → coordonnées dans la vue (relatives au conteneur du monde). */
  toView(x, y) { return [this.ox + x * this.s - this.sx, this.oy + y * this.s - this.sy]; }
  /** Point de la vue → point du monde. */
  toWorld(vx, vy) { return [(vx + this.sx - this.ox) / this.s, (vy + this.sy - this.oy) / this.s]; }

  /** Centre de la zone libre (sous le HUD, au-dessus de la feuille). */
  freeCenter() { return [this.W / 2, this.top + (this.H - this.top - this.bottom) / 2]; }

  /** Vrai si le point du monde est visible dans la zone libre, avec une marge. */
  isVisible(x, y, margin = 40) {
    const [vx, vy] = this.toView(x, y);
    return vx >= margin && vx <= this.W - margin && vy >= this.top + margin && vy <= this.H - this.bottom - margin;
  }

  scrollToView(left, top, smooth) {
    const maxL = Math.max(0, this.cw - this.W), maxT = Math.max(0, this.ch - this.H);
    const l = Math.max(0, Math.min(maxL, left)), t = Math.max(0, Math.min(maxT, top));
    if (smooth) this.scroller.scrollTo({ left: l, top: t, behavior: 'smooth' });
    else { this.scroller.scrollLeft = l; this.scroller.scrollTop = t; this.sx = this.scroller.scrollLeft; this.sy = this.scroller.scrollTop; }
  }

  /** Défile pour amener un point du monde au centre de la zone libre. */
  centerOn(x, y, smooth = false) {
    const [cx, cy] = this.toContent(x, y);
    const [fx, fy] = this.freeCenter();
    this.scrollToView(cx - fx, cy - fy, smooth);
  }

  /** Change d'échelle en gardant fixe le point du monde sous `focusView` (coordonnées de vue). */
  setScale(s, focusView = this.freeCenter()) {
    const [wx, wy] = this.toWorld(focusView[0], focusView[1]);
    this.layout(s);
    const [cx, cy] = this.toContent(wx, wy);
    this.scrollToView(cx - focusView[0], cy - focusView[1], false);
  }

  destroy() {
    this.scroller.removeEventListener('scroll', this.onScroll);
    this.probeTop.remove(); this.probeBottom.remove();
  }
}
