// Spike PixiJS v8 — île/ferme isométrique de référence (Quêtes du foyer / l'Orée)
import { Application, Container, Sprite, Graphics, TilingSprite, ColorMatrixFilter, Text, Polygon, Circle, FillGradient, Rectangle } from '../vendor/pixi.min.mjs';
import * as A from './art.js';
import { tween, tweenP, wait, ease, stepTweens, particle, stepParticles, liveParticles } from './fx.js';

const T0 = performance.now();
const perf = (window.__perf = { bootStart: T0, firstRender: null, buildMs: null, frames: [], recording: false });
(function rafProbe() {
  let last = performance.now();
  const loop = (now) => { if (perf.recording) perf.frames.push(now - last); last = now; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
perf.start = () => { perf.frames = []; perf.cpu = []; perf.recording = true; };
perf.stop = () => {
  perf.recording = false;
  const f = perf.frames.slice(1);
  const total = f.reduce((a, b) => a + b, 0);
  // FPS min = pire fenêtre glissante de 250 ms
  let minWin = Infinity;
  for (let i = 0; i < f.length; i++) {
    let acc = 0, n = 0;
    for (let j = i; j < f.length && acc < 250; j++) { acc += f[j]; n++; }
    if (acc >= 250) minWin = Math.min(minWin, (n * 1000) / acc);
  }
  const sorted = [...f].sort((a, b) => a - b);
  const c = [...(perf.cpu || [])].sort((a, b) => a - b);
  const cpu = c.length ? { cpuAvgMs: +(c.reduce((a, b) => a + b, 0) / c.length).toFixed(2), cpuP95Ms: +c[Math.floor(c.length * 0.95)].toFixed(2), cpuMaxMs: +c[c.length - 1].toFixed(2) } : {};
  return { ...cpu, frames: f.length, avgFps: +(f.length * 1000 / total).toFixed(1), minFps250ms: +(minWin === Infinity ? 0 : minWin).toFixed(1), worstFrameMs: +sorted[sorted.length - 1]?.toFixed(1), p95FrameMs: +sorted[Math.floor(sorted.length * 0.95)]?.toFixed(1) };
};

// ---------------------------------------------------------------- état
const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = RMQ.matches;
const res = { energy: 24, materials: 12, trust: 3 };
const shown = { ...res };
const RES_LABEL = { energy: 'Énergie', materials: 'Matériaux', trust: 'Confiance' };
const $ = (s) => document.querySelector(s);
const SELECTABLE = [];
const hotspots = $('#hotspots');
let selected = null, outline = null;

// ---------------------------------------------------------------- Pixi
await document.fonts.load('800 16px Nunito').catch(() => {});
const stageEl = $('#stage');
const app = new Application();
await app.init({ resizeTo: stageEl, background: 0x5fb0ab, antialias: devicePixelRatio < 2, resolution: Math.min(devicePixelRatio, 2), autoDensity: true, preference: 'webgl' });
stageEl.appendChild(app.canvas);
app.canvas.setAttribute('aria-hidden', 'true');
const R = app.renderer;
const RES = 3;
const tBuild0 = performance.now();

const sceneRoot = new Container();
const bg = new Container();
const cam = new Container();
const lights = new Container();
const glowFx = new Container();
const fxScreen = new Container();
app.stage.addChild(sceneRoot, lights, glowFx, fxScreen);
sceneRoot.addChild(bg, cam);

const baseLayer = new Container();
const groundFx = new Container();
const groundFxIso = new Container(); groundFxIso.setFromMatrix(A.ISO_MATRIX);
const entities = new Container(); entities.sortableChildren = true;
const worldFx = new Container();
const cloudLayer = new Container();
cam.addChild(baseLayer, groundFx, groundFxIso, entities, worldFx, cloudLayer);

// ---------------------------------------------------------------- disposition
const PATHS = [
  [[5.5, 1.4], [5.5, 12.02]],
  [[0.72, 5.5], [10.5, 5.5]],
  [[8.5, 5.5], [8.5, 10.4]],
  [[5.5, 8.5], [10.4, 8.5]],
  [[2.5, 8.5], [5.5, 8.5]],
  [[2.5, 5.5], [2.5, 3.15]],
  [[8, 5.5], [8, 4.1]],
  [[10.5, 5.5], [10.5, 3.1]],
];
const PLAZA = [5.5, 5.5];
const STREAM = [[11.35, 0.55], [11.5, 1.6], [11.35, 2.7], [11.6, 3.8], [11.45, 4.9], [11.62, 5.55], [12.02, 5.75]];
const BUILDINGS = [
  { id: 'tour', name: 'Tour-relais', desc: 'Relaie l’élan de tes quêtes vers l’Orée.', c: 2, r: 2, w: 1, d: 1, h: 4.4, draw: A.drawTour, shadow: { len: 1.5, w: 0.7 } },
  { id: 'serre', name: 'Serre en verre', desc: '12 plants au chaud, arrosage automatique.', c: 7, r: 2, w: 2, d: 2, h: 1.7, draw: A.drawSerre, shadow: { len: 0.55 } },
  { id: 'silo', name: 'Silo', desc: 'Réserve de grain : 40 %.', c: 10, r: 2, w: 1, d: 1, h: 3.4, draw: A.drawSilo, shadow: { len: 1.2, w: 0.8 } },
  { id: 'entrepot', name: 'Entrepôt', desc: 'Matériaux à l’abri : 12 caisses.', c: 2, r: 6, w: 2, d: 2, h: 1.9, draw: A.drawEntrepot, shadow: { len: 0.7 } },
];
const PLOTS = [
  { id: 'plot-a', name: 'Parcelle de carottes', c: 6, r: 6, w: 2, d: 2, stage: 0, crop: 'seed' },
  { id: 'plot-b', name: 'Parcelle de choux', c: 9, r: 6, w: 2, d: 2, stage: 1, crop: 'sprout' },
  { id: 'plot-c', name: 'Parcelle de blé', c: 6, r: 9, w: 2, d: 2, stage: 2, crop: 'wheat' },
  { id: 'plot-d', name: 'Parcelle de courges', c: 9, r: 9, w: 2, d: 2, stage: 2, crop: 'squash' },
];
const STAGE_TXT = ['Semis — germe dans 2 jours.', 'Pousses — mûre dans 1 jour.', 'Mûre — prête à récolter.', 'Récoltée — à ressemer.'];
const BUILD_CELLS = [[4, 3], [3, 9], [1, 9], [6, 2]];
const LANTERNS = [[4.78, 10.3], [4.78, 6.25], [6.22, 4.78], [4.78, 2.4]];

const occ = new Set();
for (const b of [...BUILDINGS, ...PLOTS]) for (let i = 0; i < b.w; i++) for (let j = 0; j < b.d; j++) occ.add(`${b.c + i},${b.r + j}`);
function distSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
const layout = {
  paths: PATHS, plaza: PLAZA, stream: STREAM, spring: STREAM[0], plots: PLOTS,
  shadows: [
    ...BUILDINGS.map((b) => ({ c: b.c + (b.shadow.w ? (1 - b.shadow.w) / 2 : 0), r: b.r + (b.shadow.w ? (1 - b.shadow.w) / 2 : 0), w: b.shadow.w ?? b.w, d: b.shadow.w ?? b.d, len: b.shadow.len })),
    { c: 0.15, r: 1, w: 0.5, d: 10, len: 0.35, alpha: 0.13 },
  ],
  blocked(c, r) {
    if (occ.has(`${Math.floor(c)},${Math.floor(r)}`)) return true;
    for (const seg of PATHS) if (distSeg(c, r, seg[0], seg[1]) < 0.5) return true;
    if (Math.hypot(c - PLAZA[0], r - PLAZA[1]) < 1.05) return true;
    for (let i = 0; i < STREAM.length - 1; i++) if (distSeg(c, r, STREAM[i], STREAM[i + 1]) < 0.42) return true;
    if (Math.hypot(c - STREAM[0][0], r - STREAM[0][1]) < 0.6) return true;
    return false;
  },
};

// ---------------------------------------------------------------- cuisson des textures
const texCache = new Map();
function baked(key, drawFn, ox, oy, res = RES) {
  if (texCache.has(key)) return texCache.get(key);
  const g = drawFn();
  const b = A.bake(R, g, ox, oy, res);
  g.destroy();
  texCache.set(key, b);
  return b;
}
const softDot = { texture: A.glowTexture(128) };
const puffTex = baked('puff', A.drawPuff, 0, 0, 2).texture;
const sparkTex = baked('spark', A.drawSpark, 0, 0, 2).texture;
const chipTex = baked('chip', A.drawChip, 0, 0, 2).texture;
const ICON_TEX = {};
for (const k of Object.keys(A.ICONS)) ICON_TEX[k] = await A.svgTexture(A.ICONS[k], 72);
for (const k of Object.keys(A.ICONS)) document.querySelector(`#res-${k} .ico`).innerHTML = A.ICONS[k];

// ---------------------------------------------------------------- fond : eau + rive lointaine
const water = new Graphics();
const ripplesTex = baked('ripples', A.drawRipples, 0, 0, 1).texture;
const ripplesA = new TilingSprite({ texture: ripplesTex, width: 10, height: 10 });
const ripplesB = new TilingSprite({ texture: ripplesTex, width: 10, height: 10 });
ripplesB.alpha = 0.55; ripplesB.tileScale.set(1.6);
const shoreTex = (() => { const g = A.drawShore(1024); const t = R.generateTexture({ target: g, resolution: 2, frame: new Rectangle(0, 0, 1024, 108) }); g.destroy(); return t; })();
const shore = new TilingSprite({ texture: shoreTex, width: 10, height: shoreTex.height });
bg.addChild(water, ripplesA, ripplesB, shore);

// ---------------------------------------------------------------- île
const islandBase = (() => { const b = baked('island', A.drawIslandBase, 0, 0, 2); const s = new Sprite(b.texture); s.anchor.set(b.ax, b.ay); return s; })();
const foamA = (() => { const b = baked('foamA', () => A.drawFoam(1), 0, 0, 2); const s = new Sprite(b.texture); s.anchor.set(b.ax, b.ay); return s; })();
const foamB = (() => { const b = baked('foamB', () => A.drawFoam(7), 0, 0, 2); const s = new Sprite(b.texture); s.anchor.set(b.ax, b.ay); return s; })();
const fallTex = (() => { const g = A.drawFallStreaks(); const t = R.generateTexture({ target: g, resolution: 2 }); g.destroy(); return t; })();
const [fx0, fy0] = A.iso(12, 5.97);
const fall = new TilingSprite({ texture: fallTex, width: 15, height: A.DEPTH + 2 });
fall.position.set(fx0, fy0 - 1);
fall.skew.set(0, Math.atan2(-16, 32));
const groundTex = baked('ground', () => A.drawGround(layout), 0, 0, 2.5);
const ground = new Sprite(groundTex.texture); ground.anchor.set(groundTex.ax, groundTex.ay);
baseLayer.addChild(islandBase, foamA, foamB, fall, ground);
const lake = new Container();
baseLayer.addChildAt(lake, 0);
for (const [x, y, seed] of [[-470, 330, 1], [455, 360, 2], [250, 520, 3], [-120, 560, 4]]) {
  const b = baked(`wrock-${seed}`, () => A.drawWaterRock(seed), 0, 0, 2); const s = new Sprite(b.texture); s.anchor.set(b.ax, b.ay); s.position.set(x, y); lake.addChild(s);
}
for (const [x, y, seed] of [[150, 500, 5], [-330, 460, 6], [420, 300, 7]]) {
  const b = baked(`lily-${seed}`, () => A.drawLilies(seed), 0, 0, 2); const s = new Sprite(b.texture); s.anchor.set(b.ax, b.ay); s.position.set(x, y); lake.addChild(s);
}
const loonB = baked('loon', A.drawLoon, 0, 0, 3);
const loon = new Sprite(loonB.texture); loon.anchor.set(loonB.ax, loonB.ay); lake.addChild(loon);
const loonPath = { cx: 60, cy: 590, rx: 330, ry: 60, t: 0.3 };

// ---------------------------------------------------------------- entités
const ENT = new Map();
const depth = (c, r) => (c + r) * 100 + c * 0.1;
function placeStatic(id, key, drawFn, c, r, w = 1, d = 1, extra = {}) {
  const [ox, oy] = A.iso(w / 2, d / 2);
  const b = baked(key, drawFn, ox, oy);
  const node = new Container();
  const sp = new Sprite(b.texture);
  sp.anchor.set(b.ax, b.ay);
  node.addChild(sp);
  const [x, y] = A.iso(c + w / 2, r + d / 2);
  node.position.set(x, y);
  node.zIndex = depth(c + w / 2, r + d / 2);
  entities.addChild(node);
  const ent = { id, c, r, w, d, node, sprite: sp, ...extra };
  if (extra.name) registerSelectable(ent);
  return ent;
}

// décor de couronne
const TREE_ROW = ['pine', 'gold', 'pine', 'sage', 'rust', 'pine', 'gold', 'pine', 'sage', 'gold'];
TREE_ROW.forEach((t, i) => {
  const c = i + 1, seed = 100 + i;
  const fn = t === 'pine' ? () => A.drawPine(seed, 1.05) : () => A.drawRoundTree(seed, t, 1.05);
  placeStatic(null, `tree-${i}`, fn, c, 0);
});
placeStatic(null, 'pine-corner', () => A.drawPine(77, 1.2), 0, 0);
for (let r = 1; r <= 10; r++) {
  const kind = r === 5 ? 'gate' : r === 3 || r === 8 ? 'glyph' : 'plain';
  const extra = r === 5 ? { name: 'Porte scellée du Bastion', desc: 'Un sceau des Veilleurs. Il réagit à la Confiance.', h: 1.5, kind: 'gate' } : {};
  placeStatic(r === 5 ? 'bastion' : null, `wall-${kind}`, () => A.drawMuret(kind), 0, r, 1, 1, extra);
}
for (let c = 1; c <= 10; c++) {
  if (c === 5) placeStatic(null, 'gate', A.drawGate, c, 11);
  else placeStatic(null, `hedge-${c % 3}`, () => A.drawHedge(c % 3), c, 11);
}
placeStatic(null, 'bush-a', () => A.drawBush(1), 0, 11);
placeStatic(null, 'bush-b', () => A.drawBush(2, 0x8aab5e), 11, 11);
placeStatic(null, 'bush-c', () => A.drawBush(3), 11, 6);
placeStatic(null, 'tree-s', () => A.drawRoundTree(42, 'sage', 0.85), 11, 7.6);
placeStatic(null, 'bush-d', () => A.drawBush(4, 0x93a957), 11, 9);
placeStatic(null, 'bush-e', () => A.drawBush(5), 11, 10.2);
placeStatic(null, 'reeds-a', () => A.drawReeds(1), 10.75, 1.0);
placeStatic(null, 'reeds-b', () => A.drawReeds(2), 10.7, 3.3);
placeStatic(null, 'rock-a', () => A.drawRock(1), 10.6, 0.2);
placeStatic(null, 'rock-b', () => A.drawRock(2), 1, 1);
placeStatic(null, 'rock-c', () => A.drawRock(3), 1, 10);
placeStatic(null, 'rock-d', () => A.drawRock(4), 9, 1);
placeStatic(null, 'logs', A.drawLogs, 4, 7);
placeStatic(null, 'crates', A.drawCrates, 1, 7);
placeStatic(null, 'hay', A.drawHay, 9, 4);
for (const [c, r] of LANTERNS) placeStatic(null, 'lantern', A.drawLantern, c - 0.5, r - 0.5);
{ const b = baked('pier', A.drawPier, 0, 0); const s = new Sprite(b.texture); s.anchor.set(b.ax, b.ay); s.zIndex = depth(5.5, 13.5); entities.addChild(s); }

// bâtiments
for (const b of BUILDINGS) placeStatic(b.id, `b-${b.id}`, b.draw, b.c, b.r, b.w, b.d, { name: b.name, desc: b.desc, h: b.h, kind: 'building' });

// parcelles + cultures
const CROP_KIND = ['seed', 'sprout'];
function cropTex(kind, v) { return baked(`crop-${kind}-${v}`, () => A.drawCrop(kind, v + 1), 0, 0).texture; }
function cropAnchor(kind, v) { const b = baked(`crop-${kind}-${v}`, () => A.drawCrop(kind, v + 1), 0, 0); return [b.ax, b.ay]; }
function fillPlot(p, popIn = false) {
  p.node.removeChildren();
  const kind = p.stage === 0 ? 'seed' : p.stage === 1 ? 'sprout' : p.crop;
  const rows = kind === 'squash' ? [0.42, 1.0, 1.58] : [0.27, 0.54, 0.82, 1.09, 1.36, 1.64];
  const cols = kind === 'squash' ? [0.35, 0.78, 1.22, 1.65] : [0.3, 0.6, 0.9, 1.2, 1.5, 1.75];
  const [cx, cy] = A.iso(p.w / 2, p.d / 2);
  let i = 0;
  p.crops = [];
  for (const rr of rows) for (const cc of cols) {
    const v = i++ % 3;
    const s = new Sprite(cropTex(kind, v));
    s.anchor.set(...cropAnchor(kind, v));
    const [x, y] = A.iso(cc + (Math.sin(i * 7.3) * 0.04), rr);
    s.position.set(x - cx, y - cy);
    s.scale.set(kind === 'seed' ? 1 : 1.05);
    p.node.addChild(s);
    p.crops.push(s);
  }
  p.crops.sort((a, b) => a.y - b.y);
  p.crops.forEach((s, k) => p.node.setChildIndex(s, k));
  if (popIn) {
    p.crops.forEach((s, k) => { s.scale.set(0); tween({ dur: 380, delay: k * 12, ease: ease.outBack, update: (e) => s.scale.set(Math.max(0, e) * 1.05) }); });
  }
}
for (const p of PLOTS) {
  const node = new Container();
  const [x, y] = A.iso(p.c + p.w / 2, p.r + p.d / 2);
  node.position.set(x, y);
  node.zIndex = depth(p.c + p.w / 2, p.r + p.d / 2) - 50;
  entities.addChild(node);
  Object.assign(p, { node, kind: 'plot', h: 0.5, desc: STAGE_TXT[p.stage] });
  fillPlot(p);
  registerSelectable(p);
}

// villageois
const VILLAGERS = [
  { id: 'solene', name: 'Solène', desc: 'Agronome. Veille sur les champs.', route: [[5.5, 5.5], [8.5, 5.5], [8.5, 8.5], [5.5, 8.5], [5.5, 5.5]], loop: true, speed: 0.7, pauseAt: { 2: 1600 }, still: [8.5, 7.3] },
  { id: 'milo', name: 'Milo', desc: 'Technicien. Entretient la tour-relais.', route: [[5.5, 11.2], [5.5, 5.5], [2.5, 5.5], [2.5, 3.45]], loop: false, speed: 0.85, pauseAt: { 3: 2000, 0: 1200 }, still: [2.5, 3.6] },
];
for (const v of VILLAGERS) {
  const frames = [0, 1].map((f) => baked(`vill-${v.id}-${f}`, () => A.drawVillager(v.id, f), 0, 0));
  const node = new Container();
  const shadow = new Graphics().ellipse(0, 0, 8, 3.6).fill({ color: 0x24301c, alpha: 0.28 });
  const sp = new Sprite(frames[0].texture);
  sp.anchor.set(frames[0].ax, frames[0].ay);
  sp.scale.set(1.25);
  node.addChild(shadow, sp);
  entities.addChild(node);
  Object.assign(v, { node, sprite: sp, frames, kind: 'villager', h: 1.5, seg: 0, t: 0, dir: 1, pause: 0, gc: v.route[0][0], gr: v.route[0][1], anim: 0 });
  registerSelectable(v);
}

// nuages + ombres
const cloudTex = [1, 2, 3].map((s) => baked(`cloud-${s}`, () => A.drawCloud(s * 13), 0, 0, 1.5));
const CLOUDS = [
  { x: -260, y: -10, s: 0.95, v: 9, t: 0 }, { x: 160, y: 70, s: 0.75, v: 6, t: 1 }, { x: 520, y: 260, s: 1.05, v: 7.5, t: 2 },
].map((c) => {
  const sh = new Sprite(cloudTex[c.t].texture); sh.anchor.set(0.5); sh.tint = 0x1e2c1c; sh.alpha = 0.1; sh.scale.set(c.s, c.s * 0.75);
  const sp = new Sprite(cloudTex[c.t].texture); sp.anchor.set(0.5); sp.alpha = 0.92; sp.scale.set(c.s);
  groundFx.addChild(sh); cloudLayer.addChild(sp);
  return { ...c, sp, sh };
});

// ---------------------------------------------------------------- lumières (non filtrées, additives)
const LIGHTS = [];
function addLight(x, y, color, scale, base = 1, pulse = 0) {
  const s = new Sprite(softDot.texture); s.anchor.set(0.5); s.tint = color; s.scale.set(scale * 0.5); s.blendMode = 'add'; s.position.set(x, y);
  lights.addChild(s); LIGHTS.push({ s, base, pulse, ph: Math.random() * 6 });
  return s;
}
for (const [c, r] of LANTERNS) { const [x, y] = A.iso(c, r); addLight(x + 4.7, y - 21.5, 0xffd890, 1.0, 1); addLight(x + 2, y - 4, 0xffb860, 2.8, 0.5); }
{ const [x, y] = A.iso(2.5, 2.5, 3.27); addLight(x, y - 16, 0x6fe6d9, 1.3, 0.9, 0.35); }
{ const [x, y] = A.iso(8, 3, 0.5); addLight(x, y, 0xbff4c8, 2.6, 0.55); }
{ const [x, y] = A.iso(3.88, 7.0, 0.65); addLight(x, y, 0xffcf80, 1.1, 1); addLight(x - 4, y + 22, 0xffb860, 2.2, 0.35); }
{ const [x, y] = A.iso(0.62, 5.5, 0.5); addLight(x, y, 0x6fe6d9, 1.1, 0.8, 0.25); }
for (const r of [3.5, 8.5]) { const [x, y] = A.iso(0.62, r, 0.32); addLight(x, y, 0x6fe6d9, 0.45, 0.9, 0.3); }
const FIREFLIES = Array.from({ length: 14 }, (_, i) => {
  const c = 5 + Math.random() * 6, r = 5 + Math.random() * 6;
  const s = addLight(0, 0, 0xf6f0a0, 0.2, 1);
  return { s, c, r, ph: i * 1.7 };
});

// ---------------------------------------------------------------- jour / nuit (filtre)
const cm = new ColorMatrixFilter();
const I = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
const WARM = (() => {
  const sat = 1.1, L = [0.3086, 0.6094, 0.082], tint = [1.1, 0.97, 0.8], off = [0.03, 0.012, 0], M = [];
  for (let row = 0; row < 3; row++) { for (let col = 0; col < 3; col++) M.push(((row === col ? sat : 0) + (1 - sat) * L[col]) * tint[row]); M.push(0, off[row]); }
  M.push(0, 0, 0, 1, 0);
  return M;
})();
const NIGHT = (() => {
  const s = 0.42, L = [0.3, 0.59, 0.11], tint = [0.44, 0.5, 0.74], off = [0.02, 0.03, 0.065], M = [];
  for (let row = 0; row < 3; row++) { for (let col = 0; col < 3; col++) M.push(((row === col ? 1 : 0) * (1 - s) + s * L[col]) * tint[row]); M.push(0, off[row]); }
  M.push(0, 0, 0, 1, 0);
  return M;
})();
let nightK = 0;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function setTime(min, fromUser = false) {
  const h = min / 60;
  const night = h < 12 ? 1 - smooth(4.6, 7.2, h) : smooth(18.7, 21.4, h);
  const warm = Math.max(1 - Math.min(1, Math.abs(h - 6.3) / 1.6), 1 - Math.min(1, Math.abs(h - 18.8) / 2.0));
  nightK = night;
  if (night < 0.005 && warm < 0.005 && !window.__ff) sceneRoot.filters = null;
  else {
    const M = I.map((v, i) => { const w = v + (WARM[i] - v) * warm * (1 - night * 0.8); return w + (NIGHT[i] - w) * night; });
    cm.matrix = M;
    sceneRoot.filters = [cm];
  }
  lights.alpha = Math.min(1, night * 1.05 + warm * 0.22);
  lights.visible = lights.alpha > 0.01;
  const hh = Math.floor(h), mm = Math.floor(min % 60);
  const phase = h >= 7.2 && h < 17.8 ? 'Jour' : h >= 17.8 && h < 21.2 ? 'Soir' : h >= 4.6 && h < 7.2 ? 'Aube' : 'Nuit';
  $('#time-out').textContent = `${hh} h ${String(mm).padStart(2, '0')} · ${phase}`;
  $('#time').value = min;
  $('#time').setAttribute('aria-valuetext', `${hh} heures ${mm}, ${phase}`);
  document.documentElement.dataset.phase = phase.toLowerCase();
  if (fromUser) $('#realtime').checked = false;
}
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
$('#time').addEventListener('input', (e) => setTime(+e.target.value, true));
$('#realtime').addEventListener('change', (e) => { if (e.target.checked) setTime(nowMin()); });
setInterval(() => { if ($('#realtime').checked) setTime(nowMin()); }, 30000);
setTime(nowMin());

// ---------------------------------------------------------------- caméra
const camS = { x: 0, y: 205, z: 1, shake: 0 };
let camDirty = true;
let insetCache = null;
function insets() {
  if (insetCache) return insetCache;
  const hud = $('.hud').getBoundingClientRect(), dock = $('.dock').getBoundingClientRect(), tools = $('.tools').getBoundingClientRect();
  const wide = innerWidth >= 900;
  return (insetCache = { top: hud.bottom + 6, bottom: wide ? innerHeight : dock.top - 6, toolsBottom: tools.bottom });
}
addEventListener('resize', () => { insetCache = null; });
function fitZoom(full = false) {
  const { top, bottom } = insets();
  const W = app.screen.width, H = bottom - top;
  const wide = innerWidth >= 900;
  const wz = W / (full ? 800 : W < 600 ? 700 : 742), hz = wide ? (H - 40) / 600 : H / 560;
  return Math.max(0.3, Math.min(wz, hz, wide ? 1.25 : 1.6));
}
function viewCenterY() { const { top, bottom } = insets(); return (top + bottom) / 2; }
function clampCam() {
  camS.z = Math.max(fitZoom(true) * 0.85, Math.min(2.8, camS.z));
  camS.x = Math.max(-420, Math.min(420, camS.x));
  camS.y = Math.max(-60, Math.min(480, camS.y));
}
function applyCam() {
  clampCam();
  const W = app.screen.width;
  const sx = camS.shake ? (Math.random() - 0.5) * camS.shake : 0, sy = camS.shake ? (Math.random() - 0.5) * camS.shake : 0;
  for (const c of [cam, lights, glowFx]) { c.scale.set(camS.z); c.position.set(W / 2 - camS.x * camS.z + sx, viewCenterY() - camS.y * camS.z + sy); }
  camDirty = true;
}
function resizeBg() {
  const W = app.screen.width, H = app.screen.height;
  water.clear();
  const grad = new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, textureSpace: 'local', colorStops: [
    { offset: 0, color: '#8fcfc5' }, { offset: 0.35, color: '#62b3ad' }, { offset: 1, color: '#3f8f92' }] });
  water.rect(0, 0, W, H).fill(grad);
  for (const t of [ripplesA, ripplesB]) { t.width = W; t.height = H; }
  shore.width = W;
}
function recenter(animated = true) {
  const target = { x: 0, y: 205, z: fitZoom() };
  if (!animated || reduced) { Object.assign(camS, target); applyCam(); return; }
  const from = { ...camS };
  tween({ dur: 420, ease: ease.inOutCubic, update: (e) => { camS.x = from.x + (target.x - from.x) * e; camS.y = from.y + (target.y - from.y) * e; camS.z = from.z + (target.z - from.z) * e; applyCam(); } });
}
function zoomBy(f, sx = app.screen.width / 2, sy = viewCenterY()) {
  const wx = camS.x + (sx - app.screen.width / 2) / camS.z, wy = camS.y + (sy - viewCenterY()) / camS.z;
  camS.z *= f; clampCam();
  camS.x = wx - (sx - app.screen.width / 2) / camS.z; camS.y = wy - (sy - viewCenterY()) / camS.z;
  applyCam();
}
app.renderer.on('resize', () => { insetCache = null; resizeBg(); applyCam(); });
resizeBg();
recenter(false);

// gestes : glisser, pincer, molette
const ptrs = new Map();
let dragDist = 0, pinch = null;
const cv = app.canvas;
cv.style.touchAction = 'none';
cv.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) dragDist = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: camS.z }; dragDist = 99; } });
addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) { dragDist += Math.abs(dx) + Math.abs(dy); if (dragDist > 8) { camS.x -= dx / camS.z; camS.y -= dy / camS.z; applyCam(); } }
  else if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomBy((pinch.z * d) / pinch.d / camS.z, (a.x + b.x) / 2, (a.y + b.y) / 2); }
});
const endPtr = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; };
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX, e.offsetY); }, { passive: false });
$('#zoom-in').onclick = () => zoomBy(1.25);
$('#zoom-out').onclick = () => zoomBy(0.8);
$('#recenter').onclick = () => recenter();
addEventListener('keydown', (e) => {
  if (e.target.closest('input, aside, .hotspot')) return;
  const k = e.key, step = 40 / camS.z;
  if (k === 'ArrowLeft') camS.x -= step; else if (k === 'ArrowRight') camS.x += step;
  else if (k === 'ArrowUp') camS.y -= step; else if (k === 'ArrowDown') camS.y += step;
  else if (k === '+' || k === '=') return zoomBy(1.2); else if (k === '-') return zoomBy(1 / 1.2);
  else if (k === '0') return recenter(); else if (k === 'Escape') return select(null);
  else return;
  e.preventDefault(); applyCam();
});

// ---------------------------------------------------------------- sélection + accessibilité
function registerSelectable(ent) {
  SELECTABLE.push(ent);
  ENT.set(ent.id, ent);
  const n = ent.node;
  n.eventMode = 'static';
  n.cursor = 'pointer';
  n.interactiveChildren = false;
  if (ent.kind === 'villager') n.hitArea = new Circle(0, -18, 20);
  else {
    const P = (c, r, z) => { const [x, y] = A.iso(c, r, z), [ox, oy] = A.iso(ent.w / 2, ent.d / 2); return [x - ox, y - oy]; };
    const { w, d } = ent, h = ent.h ?? 1;
    n.hitArea = new Polygon([...P(0, 0, h), ...P(w, 0, h), ...P(w, 0, 0), ...P(w, d, 0), ...P(0, d, 0), ...P(0, d, h)]);
  }
  n.on('pointertap', () => { if (dragDist <= 8) select(ent); });
  const btn = document.createElement('button');
  btn.className = 'hotspot';
  btn.type = 'button';
  btn.tabIndex = SELECTABLE.length === 1 ? 0 : -1;
  btn.addEventListener('focus', () => { for (const e of SELECTABLE) e.btn.tabIndex = -1; btn.tabIndex = 0; select(ent, { keyboard: true }); });
  btn.addEventListener('keydown', (e) => {
    const i = SELECTABLE.indexOf(ent), n = SELECTABLE.length;
    const j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (j === undefined) return;
    e.preventDefault(); e.stopPropagation();
    SELECTABLE[(j + n) % n].btn.focus();
  });
  btn.addEventListener('click', () => select(ent, { keyboard: true }));
  hotspots.appendChild(btn);
  ent.btn = btn;
  updateA11yText(ent);
}
function updateA11yText(ent) {
  ent.btn.setAttribute('aria-label', `${ent.name}. ${ent.desc}`);
  renderAltList();
}
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointertap', (e) => { if (e.target === app.stage && dragDist <= 8) select(null); });

const silCache = new Map();
const whiteFilter = new ColorMatrixFilter();
whiteFilter.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
function silhouette(tex) {
  if (silCache.has(tex.uid)) return silCache.get(tex.uid);
  const s = new Sprite(tex); s.filters = [whiteFilter];
  const t = R.generateTexture({ target: s, resolution: 2 });
  s.destroy();
  silCache.set(tex.uid, t);
  return t;
}
const ring = new Graphics();
groundFxIso.addChild(ring);
function buildOutline(ent) {
  const o = new Container();
  const t = silhouette(ent.sprite.texture);
  for (const [rad, col, a] of [[3.6, A.PAL.sageDeep, 0.9], [1.9, 0xfffbea, 1]]) {
    for (let k = 0; k < 12; k++) {
      const s = new Sprite(t); s.anchor.copyFrom(ent.sprite.anchor); s.scale.copyFrom(ent.sprite.scale); s.tint = col; s.alpha = a;
      const ang = (k / 12) * Math.PI * 2;
      s.position.set(ent.sprite.x + (Math.cos(ang) * rad) / camS.z, ent.sprite.y + (Math.sin(ang) * rad) / camS.z);
      o.addChild(s);
    }
  }
  o.zoom = camS.z;
  return o;
}
function select(ent, opts = {}) {
  if (outline) { outline.parent?.removeChild(outline); outline.destroy({ children: true }); outline = null; }
  ring.clear();
  for (const e of SELECTABLE) e.btn.removeAttribute('aria-current');
  selected = ent;
  const label = $('#sel-label');
  if (!ent) { label.hidden = true; return; }
  ent.btn.setAttribute('aria-current', 'true');
  if (ent.kind === 'plot') {
    const U = 64;
    ring.roundRect(ent.c * U + 2, ent.r * U + 2, ent.w * U - 4, ent.d * U - 4, 16).stroke({ width: 10, color: A.PAL.sageDeep, alpha: 0.9 });
    ring.roundRect(ent.c * U + 2, ent.r * U + 2, ent.w * U - 4, ent.d * U - 4, 16).stroke({ width: 5, color: 0xfffbea, alpha: 1 });
  } else {
    outline = buildOutline(ent);
    ent.node.addChildAt(outline, ent.node.getChildIndex(ent.sprite));
  }
  label.querySelector('strong').textContent = ent.name;
  label.querySelector('span').textContent = ent.desc;
  label.hidden = false;
  if (!opts.silent) announce(`${ent.name} sélectionné. ${ent.desc}`, false);
  if (opts.keyboard) ensureVisible(ent);
  if (!reduced) {
    const s = ent.sprite ?? ent.node;
    const base = s.scale.y;
    tween({ dur: 260, ease: ease.outBack, update: (e, p) => { const k = Math.sin(p * Math.PI) * 0.06; s.scale.y = base * (1 + k); } , done: () => { s.scale.y = base; } });
  }
  camDirty = true;
}
function entityTop(ent) {
  const h = ent.kind === 'villager' ? 48 : (ent.h ?? 1) * A.ZH + 8;
  return cam.toGlobal({ x: ent.node.x, y: ent.node.y - h });
}
function entityBox(ent) {
  const top = entityTop(ent), base = cam.toGlobal({ x: ent.node.x, y: ent.node.y + (ent.kind === 'villager' ? 2 : (A.TH * Math.max(ent.w ?? 1, ent.d ?? 1)) / 2) });
  const half = Math.max(22, ((ent.kind === 'villager' ? 12 : (A.TW * ((ent.w ?? 1) + (ent.d ?? 1))) / 4) * camS.z));
  return { x: top.x - half, y: top.y, w: half * 2, h: Math.max(44, base.y - top.y) };
}
function ensureVisible(ent) {
  const b = entityBox(ent), { top, bottom } = insets();
  if (b.x < 0 || b.x + b.w > app.screen.width || b.y < top || b.y + b.h > bottom) { camS.x = ent.node.x; camS.y = ent.node.y - 20; applyCam(); }
}
let hsTick = 0;
function updateOverlay() {
  hsTick++;
  if (camDirty || hsTick % 3 === 0) {
    for (const e of SELECTABLE) {
      if (!camDirty && e.kind !== 'villager') continue;
      const b = entityBox(e);
      e.btn.style.transform = `translate(${b.x | 0}px, ${b.y | 0}px)`;
      e.btn.style.width = `${b.w | 0}px`; e.btn.style.height = `${b.h | 0}px`;
    }
  }
  if (selected) {
    const p = entityTop(selected);
    const lab = $('#sel-label');
    const w = lab.offsetWidth, h = lab.offsetHeight, W = innerWidth;
    const top = Math.max(insets().top, p.y - h - 12);
    const toolsBottom = insets().toolsBottom;
    const right = top < toolsBottom ? W - 66 : W - 8;
    const left = Math.max(8, Math.min(right - w, p.x - w / 2));
    lab.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    lab.style.setProperty('--ax', `${Math.round(Math.max(14, Math.min(w - 14, p.x - left)))}px`);
    if (outline && Math.abs(outline.zoom - camS.z) > 0.05) { const ent = selected; select(ent, { silent: true }); }
  }
  camDirty = false;
}

// liste alternative
function renderAltList() {
  const ul = $('#alt-list');
  if (!ul) return;
  ul.innerHTML = '';
  for (const e of SELECTABLE) {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong></strong><span></span></div>`;
    li.querySelector('strong').textContent = e.name;
    li.querySelector('span').textContent = e.desc;
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Situer';
    b.setAttribute('aria-label', `Situer ${e.name} sur la carte`);
    b.onclick = () => { select(e); camS.x = e.node.x; camS.y = e.node.y - 20; applyCam(); };
    li.appendChild(b);
    if (e.kind === 'plot' && e.stage === 2) { const h = document.createElement('button'); h.type = 'button'; h.className = 'primary'; h.textContent = 'Récolter'; h.onclick = () => harvest(e); li.appendChild(h); }
    ul.appendChild(li);
  }
}
$('#list-toggle').onclick = () => {
  const p = $('#alt-panel'), open = p.hidden;
  p.hidden = !open; $('#list-toggle').setAttribute('aria-expanded', String(open));
  if (open) { renderAltList(); p.querySelector('h2').focus(); }
};
$('#alt-close').onclick = () => { $('#alt-panel').hidden = true; $('#list-toggle').setAttribute('aria-expanded', 'false'); $('#list-toggle').focus(); };

// ---------------------------------------------------------------- HUD, annonces
let toastTimer;
function announce(msg, toast = true) {
  $('#live').textContent = msg;
  if (!toast) return;
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const countTw = {};
function addRes(key, n) {
  res[key] += n;
  const el = $(`#res-${key}`), num = el.querySelector('.num');
  const from = shown[key], to = res[key];
  if (countTw[key]) countTw[key].dead = true;
  const tok = (countTw[key] = { dead: false });
  if (reduced) { shown[key] = to; num.textContent = to; }
  else tween({ dur: 320, ease: ease.outCubic, update: (e) => { if (tok.dead) return; shown[key] = Math.round(from + (to - from) * e); num.textContent = shown[key]; } });
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function hudTarget(key) { const r = $(`#res-${key} .ico`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
for (const k of Object.keys(res)) { $(`#res-${k} .num`).textContent = res[k]; }

// ---------------------------------------------------------------- MOMENT 1 : quête terminée
let questBusy = false;
async function questComplete() {
  if (questBusy) return; questBusy = true;
  const tour = ENT.get('tour');
  const rewards = ['energy', 'energy', 'materials', 'energy', 'trust', 'materials', 'energy', 'materials', 'energy'];
  announce('Quête terminée · +5 Énergie, +3 Matériaux, +1 Confiance');
  if (reduced) {
    for (const k of ['energy', 'materials', 'trust']) addRes(k, rewards.filter((r) => r === k).length);
    questBusy = false; return;
  }
  // pulsation de la tour + flash du relais
  const sp = tour.sprite;
  tween({ dur: 420, ease: ease.linear, update: (e, p) => { const k = Math.sin(p * Math.PI * 2) * Math.exp(-p * 3); sp.scale.set(1 - k * 0.06, 1 + k * 0.1); }, done: () => sp.scale.set(1) });
  const [tx, ty] = A.iso(2.5, 2.5, 3.27);
  const src = { x: tx, y: ty - 16 };
  const ringG = new Graphics();
  worldFx.addChild(ringG);
  tween({ dur: 650, ease: ease.outCubic, update: (e) => { ringG.clear().ellipse(src.x, src.y + 4, 8 + e * 60, 4 + e * 30).stroke({ width: 3 * (1 - e) + 0.5, color: 0x9ff3e8, alpha: 1 - e }); }, done: () => ringG.destroy() });
  const flash = new Sprite(softDot.texture); flash.anchor.set(0.5); flash.tint = 0x9ff3e8; flash.blendMode = 'add'; flash.position.set(src.x, src.y);
  glowFx.addChild(flash);
  tween({ dur: 520, ease: ease.outQuad, update: (e) => { flash.alpha = 1 - e; flash.scale.set((0.6 + e * 2.4) * 0.5); }, done: () => flash.destroy() });
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    particle(glowFx, sparkTex, { x: src.x, y: src.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 60 - 30, drag: 2, life: 520, scale: 0.7, scaleTo: 0.1, tint: 0xbff7ee, blend: 'add', spin: 4 });
  }
  const start = cam.toGlobal(src);
  let arrived = 0;
  await new Promise((resolve) => {
    rewards.forEach((key, i) => {
      const s = new Sprite(ICON_TEX[key]);
      s.anchor.set(0.5); s.scale.set(0); s.position.set(start.x, start.y);
      fxScreen.addChild(s);
      const n = rewards.length;
      const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.3 + (Math.random() - 0.5) * 0.25;
      const sp0 = 150 + Math.random() * 90;
      const vx = Math.cos(ang) * sp0, vy = Math.sin(ang) * sp0;
      const burst = 360;
      tween({ dur: burst, delay: i * 26, update: (e, p) => {
        const t = (p * burst) / 1000;
        s.x = start.x + vx * t; s.y = start.y + vy * t + 0.5 * 560 * t * t;
        s.scale.set(ease.outBack(Math.min(1, p * 1.7)) * 0.54);
        s.rotation = (1 - p) * 0.5 * (i % 2 ? 1 : -1);
      }, done: () => {
        const p0 = { x: s.x, y: s.y }, tgt = hudTarget(key);
        const ctl = { x: (p0.x + tgt.x) / 2 + (Math.random() - 0.5) * 160, y: Math.min(p0.y, tgt.y) - 40 - Math.random() * 70 };
        let trail = 0;
        tween({ dur: 560 + i * 30, delay: 40 + i * 34, ease: ease.inOutCubic, update: (e) => {
          const u = 1 - e;
          s.x = u * u * p0.x + 2 * u * e * ctl.x + e * e * tgt.x;
          s.y = u * u * p0.y + 2 * u * e * ctl.y + e * e * tgt.y;
          s.scale.set(0.54 - 0.2 * e);
          if (++trail % 3 === 0) particle(fxScreen, sparkTex, { x: s.x, y: s.y, life: 320, scale: 0.45, scaleTo: 0.05, tint: key === 'energy' ? 0xffe6a0 : key === 'trust' ? 0xd3ecb8 : 0xf3dcb4, alpha: 0.9, blend: 'add' });
        }, done: () => {
          fxScreen.removeChild(s); s.destroy();
          addRes(key, 1);
          for (let k = 0; k < 5; k++) { const a = Math.random() * Math.PI * 2; particle(fxScreen, sparkTex, { x: tgt.x, y: tgt.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, drag: 5, life: 380, scale: 0.5, scaleTo: 0, tint: 0xfff1c2, blend: 'add' }); }
          if (++arrived === n) resolve();
        } });
      } });
    });
  });
  questBusy = false;
}

// ---------------------------------------------------------------- MOMENT 2 : construire
let buildIdx = 0;
const built = [];
const ghost = new Graphics();
groundFxIso.addChild(ghost);
async function build() {
  if (build.busy) return; build.busy = true;
  if (buildIdx >= BUILD_CELLS.length) {
    for (const b of built.splice(0)) { entities.removeChild(b.node); groundFx.removeChild(b.shadow); b.btn.remove(); SELECTABLE.splice(SELECTABLE.indexOf(b), 1); ENT.delete(b.id); if (selected === b) select(null); }
    renderAltList();
    buildIdx = 0;
  }
  const [c, r] = BUILD_CELLS[buildIdx++];
  const U = 64;
  // fantôme de placement
  if (!reduced) {
    await tweenP({ dur: 380, update: (e, p) => { ghost.clear(); const a = 0.5 + 0.5 * Math.sin(p * Math.PI * 3); ghost.roundRect(c * U + 4, r * U + 4, U - 8, U - 8, 8).fill({ color: 0xfffbea, alpha: 0.25 * a }).stroke({ width: 4, color: 0xfffbea, alpha: a }); } });
  }
  ghost.clear();
  const ent = placeStatic(`atelier-${buildIdx}`, 'b-atelier', A.drawAtelier, c, r, 1, 1, { name: 'Atelier', desc: 'Nouvel atelier : répare et améliore.', h: 1.7, kind: 'building' });
  const [gx, gy] = A.iso(c + 0.5, r + 0.5);
  const shadow = new Graphics().ellipse(0, 0, 30, 15).fill({ color: 0x24301c, alpha: 1 });
  shadow.position.set(gx + 8, gy + 3); shadow.alpha = 0.2;
  groundFx.addChild(shadow);
  ent.shadow = shadow;
  built.push(ent);
  const sp = ent.sprite;
  if (reduced) {
    announce('Atelier construit.');
    sp.alpha = 0;
    await tweenP({ dur: 200, update: (e) => (sp.alpha = e) });
    build.busy = false; return;
  }
  const H = 340;
  sp.y = -H; sp.scale.set(0.9, 1.14);
  shadow.scale.set(0.3); shadow.alpha = 0.05;
  await tweenP({ dur: 440, ease: ease.inQuad, update: (e) => { sp.y = -H * (1 - e); shadow.scale.set(0.3 + 0.7 * e); shadow.alpha = 0.05 + 0.17 * e; } });
  sp.y = 0;
  announce('Atelier construit.');
  // impact : onde au sol + poussière + éclats + secousse
  const wave = new Graphics(); groundFx.addChild(wave);
  tween({ dur: 520, ease: ease.outCubic, update: (e) => { wave.clear().ellipse(gx, gy, 30 + e * 70, 15 + e * 35).stroke({ width: 4 * (1 - e) + 1, color: 0xfff6dc, alpha: 0.85 * (1 - e) }); }, done: () => wave.destroy() });
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2 + Math.random() * 0.2;
    const ex = Math.cos(a), ey = Math.sin(a) * 0.5;
    particle(worldFx, puffTex, { x: gx + ex * 28, y: gy + ey * 28, vx: ex * (80 + Math.random() * 60), vy: ey * (80 + Math.random() * 60) - 14, drag: 3, g: -22, life: 800 + Math.random() * 260, scale: 0.8, scaleTo: 2.1, tint: 0xeadcc0, alpha: 0.95 });
  }
  for (let k = 0; k < 8; k++) particle(worldFx, chipTex, { x: gx + (Math.random() - 0.5) * 30, y: gy - 4, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 90, g: 620, life: 520, scale: 0.8, tint: [0xa9794a, 0xc8b898, 0x7f9c55][k % 3], spin: 9 });
  tween({ dur: 260, update: (e, p) => { camS.shake = 7 * (1 - p); applyCam(); }, done: () => { camS.shake = 0; applyCam(); } });
  await tweenP({ dur: 620, update: (e, p) => {
    const sy = 1 - 0.3 * Math.exp(-5.5 * p) * Math.cos(p * 15);
    sp.scale.set(1 + (1 - sy) * 0.85, sy);
  } });
  sp.scale.set(1);
  build.busy = false;
}

// ---------------------------------------------------------------- MOMENT 3 : récolter
async function harvest(target) {
  if (harvest.busy) return; harvest.busy = true;
  let plot = target && target.stage === 2 ? target : PLOTS.find((p) => p.stage === 2);
  if (!plot) {
    for (const p of PLOTS.filter((p) => p.stage === 3)) { p.stage = 2; p.desc = STAGE_TXT[2]; fillPlot(p, !reduced); updateA11yText(p); }
    if (!reduced) await wait(650);
    plot = PLOTS.find((p) => p.stage === 2);
  }
  const crops = [...plot.crops];
  const gold = plot.crop === 'wheat' ? [0xf0cf72, 0xe2b955, 0xc9a04a] : [0xebb455, 0x77a352, 0xd99a3e];
  const top = cam.toGlobal({ x: plot.node.x, y: plot.node.y - 26 });
  if (reduced) {
    crops.forEach((s) => s.destroy());
  } else {
    await new Promise((resolve) => {
      let done = 0;
      crops.forEach((s, k) => {
        const y0 = s.y, sc = s.scale.x;
        tween({ dur: 300, delay: k * 18, ease: ease.linear, update: (e, p) => {
          s.y = y0 - Math.sin(Math.min(1, p * 1.4) * Math.PI) * 9 - p * 6;
          s.scale.set(sc * (p < 0.4 ? 1 + p * 0.6 : (1.24 * (1 - (p - 0.4) / 0.6))));
          s.alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
        }, done: () => {
          const gp = plot.node.toGlobal(s.position), wp = worldFx.toLocal(gp);
          for (let j = 0; j < 4; j++) particle(worldFx, j === 3 ? sparkTex : chipTex, { x: wp.x, y: wp.y - 8, vx: (Math.random() - 0.5) * 90, vy: -80 - Math.random() * 100, g: 400, life: 650, scale: j === 3 ? 0.5 : 1.1, scaleTo: 0.3, tint: gold[j % 3], spin: 7, blend: j === 3 ? 'add' : 'normal' });
          s.destroy();
          if (++done === crops.length) resolve();
        } });
      });
    });
  }
  plot.crops = [];
  plot.stage = 3; plot.desc = STAGE_TXT[3];
  updateA11yText(plot);
  if (selected === plot) select(plot, { silent: true });
  // « +3 » flottant
  const label = new Container();
  const txt = new Text({ text: '+3', style: { fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: '900', fontSize: 30, fill: 0xfff8e8, stroke: { color: 0x3f6047, width: 6, join: 'round' } }, resolution: 2 });
  txt.anchor.set(1, 0.5);
  const ic = new Sprite(ICON_TEX.energy); ic.anchor.set(0, 0.5); ic.scale.set(0.42); ic.x = 3;
  label.addChild(txt, ic);
  label.position.set(top.x, top.y);
  fxScreen.addChild(label);
  addRes('energy', 3);
  announce(`${plot.name.replace('Parcelle de ', '').replace(/^./, (m) => m.toUpperCase())} récolté · +3 Énergie`);
  if (reduced) {
    await wait(1200);
  } else {
    label.scale.set(0);
    await tweenP({ dur: 260, ease: ease.outBack, update: (e) => label.scale.set(Math.max(0, e)) });
    await tweenP({ dur: 900, ease: ease.outQuad, update: (e, p) => { label.y = top.y - 38 * e; label.alpha = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45; } });
  }
  label.destroy({ children: true });
  harvest.busy = false;
}

$('#btn-quest').onclick = () => questComplete();
$('#btn-build').onclick = () => build();
$('#btn-harvest').onclick = () => harvest();

// ---------------------------------------------------------------- boucle
let time = 0, mistT = 0;
function stepVillager(v, dt) {
  if (reduced) {
    v.gc = v.still[0]; v.gr = v.still[1];
    v.sprite.texture = v.frames[0].texture; v.sprite.y = 0;
  } else if (v.pause > 0) {
    v.pause -= dt; v.sprite.texture = v.frames[0].texture; v.sprite.y = 0;
  } else {
    const pts = v.route;
    const a = pts[v.seg], b = pts[v.seg + v.dir];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    v.t += (v.speed * dt) / 1000 / len;
    if (v.t >= 1) {
      v.t = 0; v.seg += v.dir;
      if (v.pauseAt[v.seg] !== undefined) v.pause = v.pauseAt[v.seg];
      if (v.loop && v.seg === pts.length - 1) v.seg = 0;
      if (!v.loop && (v.seg === pts.length - 1 || v.seg === 0)) v.dir *= -1;
    }
    const a2 = pts[v.seg], b2 = pts[v.seg + v.dir] ?? a2;
    const pc = a2[0] + (b2[0] - a2[0]) * v.t, pr = a2[1] + (b2[1] - a2[1]) * v.t;
    const dx = (pc - pr) - (v.gc - v.gr);
    if (Math.abs(dx) > 0.0005) v.sprite.scale.x = dx > 0 ? 1.25 : -1.25;
    v.gc = pc; v.gr = pr;
    v.anim += dt;
    const f = Math.floor(v.anim / 170) % 2;
    v.sprite.texture = v.frames[f].texture;
    v.sprite.y = -Math.abs(Math.sin(v.anim / 170 * Math.PI)) * 1.6;
  }
  const [x, y] = A.iso(v.gc, v.gr);
  v.node.position.set(x, y);
  v.node.zIndex = depth(v.gc, v.gr);
}
app.ticker.add((tk) => {
  const dt = Math.min(tk.deltaMS, 50);
  time += dt / 1000;
  stepTweens(dt);
  stepParticles(dt);
  for (const v of VILLAGERS) stepVillager(v, dt);
  if (!reduced) {
    ripplesA.tilePosition.x += dt * 0.006; ripplesB.tilePosition.x -= dt * 0.004; ripplesB.tilePosition.y += dt * 0.002;
    fall.tilePosition.y += dt * 0.05;
    loonPath.t += dt / 1000 * 0.025;
    foamA.alpha = 0.55 + 0.45 * Math.sin(time * 1.3); foamB.alpha = 0.55 - 0.45 * Math.sin(time * 1.3);
    for (const c of CLOUDS) { c.x += (c.v * dt) / 1000; if (c.x > 640) c.x = -640; }
    mistT += dt;
    if (mistT > 260) { mistT = 0; const [mx, my] = A.iso(12, 5.85); particle(baseLayer, puffTex, { x: mx + 6 + Math.random() * 8, y: my + A.DEPTH + 2, vx: 6 + Math.random() * 10, vy: -8, life: 1200, scale: 0.3, scaleTo: 0.9, alpha: 0.6 }); }
  }
  for (const c of CLOUDS) { c.sp.position.set(c.x, c.y); c.sh.position.set(c.x + 40, c.y + 210); }
  { const a = loonPath.t * Math.PI * 2; loon.position.set(loonPath.cx + Math.cos(a) * loonPath.rx, loonPath.cy + Math.sin(a) * loonPath.ry); loon.scale.x = Math.sin(a) > 0 ? -1 : 1; loon.y += Math.sin(time * 2) * 0.6; }
  // parallaxe de la rive et de l'eau
  shore.y = Math.max(-shore.height + 40, cam.y + (-140 - 120) * camS.z - shore.height + 20);
  shore.tilePosition.x = cam.x * 0.25;
  ripplesA.tilePosition.y = cam.y * 0.6; ripplesA.tileScale.set(camS.z * 1.2);
  if (lights.visible) {
    for (const L of LIGHTS) L.s.alpha = L.base * (1 - L.pulse + L.pulse * (0.5 + 0.5 * Math.sin(time * 2.2 + L.ph)));
    for (const f of FIREFLIES) {
      const [x, y] = A.iso(f.c + Math.sin(time * 0.4 + f.ph) * 0.6, f.r + Math.cos(time * 0.33 + f.ph * 1.3) * 0.6, 0.6 + Math.sin(time * 0.9 + f.ph) * 0.25);
      f.s.position.set(x, y);
      f.s.alpha = nightK * (0.4 + 0.6 * Math.max(0, Math.sin(time * 2.6 + f.ph * 3)));
    }
  }
  updateOverlay();
});

RMQ.addEventListener('change', (e) => { reduced = e.matches; });

perf.buildMs = +(performance.now() - tBuild0).toFixed(1);
// coût main thread par image : de la première callback du ticker jusqu'après le rendu Pixi (priorité -25)
app.ticker.add(() => { perf._t0 = performance.now(); }, null, 100);
app.ticker.add(() => { if (perf.recording) perf.cpu.push(performance.now() - perf._t0); }, null, -100);
window.__forceFilter = (on) => { window.__ff = on; };
app.ticker.addOnce(() => requestAnimationFrame(() => { perf.firstRender = +performance.now().toFixed(1); window.__ready = true; }));
window.__demo = { questComplete, build, harvest, setTime, select: (id) => select(id ? ENT.get(id) : null), recenter, zoomBy, cam: camS, applyCam, setReduced: (v) => { reduced = v; } };
