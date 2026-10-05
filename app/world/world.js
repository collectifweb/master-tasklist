// L'île de l'Orée, en DOM et SVG, sans dépendance.
//
//   const world = createWorld(conteneur, { texts, anchors, announce, onImpact, onSelect, onHarvest, threadFrom, now });
//   world.render(game, tasks);   // met à jour ce qui a changé (différence par identifiant)
//   world.play(events);          // joue les événements du cœur (quests, build, avis, chapters), dans l'ordre ; sautables
//   world.setReducedMotion(true | false | null);  // null : suivre le système et <html data-motion>
//   world.focusSector('champs');
//   world.destroy();
//
// Appeler render(game, tasks) PUIS play(events) dans la même tâche (ou play d'abord) : le nouvel état
// est retenu pendant que les animations le dévoilent, puis appliqué en entier à la fin.
//
// onSelect(info) — un toucher (ou Entrée) sur la carte. Formes de `info` :
//   { type: 'sector', id }                                   plaque de secteur
//   { type: 'plot', id, sector, crop, stage, ripe }          parcelle (crop null = vide ; ripe : l'interface propose « Récolter »)
//   { type: 'landmark', id, sector, model, state }           repère fixe (tour, etabli, relais, bastion, atelier…) ;
//                                                            l'établi non construit : model 'chantier', state null
//   { type: 'placement', id, sector, model }                 construction du joueur ({model}-{n})
//   { type: 'object', id, sector, model, taskId }            caisse d'échéance (taskId) ou personnage (taskId null)
// onHarvest(plotId) — glisser le doigt (ou la souris) sur une parcelle mûre. Le monde n'applique rien lui-même :
//   l'hôte appelle harvest() du cœur puis rejoue ses événements ('recolte'). Équivalent bouton : onSelect 'plot'.
//
// Événements que play() sait jouer (un type inconnu est ignoré) : reward, fil-libre, secteur-seuil, lisiere-allumee,
// lisiere-retiree, chapitre, secteur-ouvert, construction, parcelle, semis, recolte, brasero, souffler, avis-annonce,
// avis-resolu, voile-leve, reflet, veille, surplus, etape ; sans animation : partage, reserve, objectif-atteint,
// chapitre-fin.
import { P, f, pts } from './iso.js';
import { ensurePalette, BASE } from './palette.js';
import {
  CELLS, LIT_ORDER, SECTOR_ORDER, SECTOR_CENTER, PLAQUE_ANCHOR, LANDMARKS, LISIERE_POSTS, CHARACTERS, DECOR,
  PLOT_SLOTS, CRATE_SPOTS, AVIS_EDGE, VEIL_CELLS, braseroSpots, sectorAt, germCell,
} from './layout.js';
import { deriveView } from './view.js';
import { terrainSVG, TERRAIN, BOUNDS, sectorPolygon, frontSVG, edgeNormal } from './terrain.js';
import { Scene } from './scene.js';
import { createTicker, createBus } from './ticker.js';
import { Camera, NEAR_SCALE } from './camera.js';
import { Fx } from './fx.js';
import { makeTexts, levelKey, fmt, avisName, avisWhen } from './texts.js';
import { playEvents, cloneView } from './moments.js';

export { createWorldPlan } from './plan.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const FOOT = { tunnel: [1, 2], atelier: [2, 1], registres: [2, 2], maison: [2, 2], bastion: [2, 2] }; // [w, h]
const LIGHT = { lanterne: 'lantern', relais: 'core', bastion: 'lantern', etabli: 'lamp', registres: 'window', maison: 'window', tour: 'crystal' };
const HORIZON_Y = -128; // ligne d'horizon (px monde), derrière les arbres du fond
const AMBIENT_MS = 9000; // l'île respire quelques secondes après chaque activité, puis s'immobilise
const FRONT_FAR = 1.8; // recul du Front de givre à l'annonce (cases), jusqu'au rivage la veille de l'Avis
const SWIPE_PX = 18; // glissé qui récolte une parcelle mûre
const LANDMARK_IDS = new Set(LANDMARKS.map((l) => l.id));
let uid = 0;

/** Flocon à six branches (grille de 24), pour le Front et le badge d'Avis. */
function flakePath(cx = 12, cy = 12, r = 9) {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const t = (k * Math.PI) / 3 - Math.PI / 2;
    const c = Math.cos(t), s = Math.sin(t);
    const bx = cx + c * r * 0.6, by = cy + s * r * 0.6, w = r * 0.26;
    d += `M${f(cx)} ${f(cy)}L${f(cx + c * r)} ${f(cy + s * r)}`;
    d += `M${f(bx + c * w - s * w)} ${f(by + s * w + c * w)}L${f(bx)} ${f(by)}L${f(bx + c * w + s * w)} ${f(by + s * w - c * w)}`;
  }
  return d;
}

/** Pictos de secteur (grille de 24, trait arrondi, currentColor). */
export const SECTOR_GLYPH = {
  place: 'M6 21V10l3-2V4h6v4l3 2v11M10 21v-4h4v4M4 21h16',
  champs: 'M12 21v-8M12 13c0-4-3-6.5-7-6.5 0 4 3 6.5 7 6.5zM12 11c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM5 21h14',
  atelier: 'M4.5 19.5l8.5-8.5M11 5.5l7.5 7.5M13.5 3.5l7 7-2.8 2.8-7-7z',
  archives: 'M6 4h10.5A2.5 2.5 0 0 1 19 6.5V20H8.5A2.5 2.5 0 0 1 6 17.5zM6 17.5A2.5 2.5 0 0 1 8.5 15H19M10 8h5M10 11h5',
  'maison-commune': 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  relais: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM12 4v16M4 12h16M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6',
  brume: 'M7 17.5h10a3.8 3.8 0 0 0 .4-7.6A5.2 5.2 0 0 0 7.5 9 4.3 4.3 0 0 0 7 17.5zM5 20.5h8M15 20.5h4',
  givre: flakePath(),
};

function glyph(id, cls = '') {
  return `<svg class="ow-glyph ${cls}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${SECTOR_GLYPH[id] || SECTOR_GLYPH.brume}"/></svg>`;
}

function el(tag, cls, attrs = {}) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// ----------------------------------------------------------------------------- entités voulues
export function entitiesFor(v, tasks = []) {
  const S = v.sectors;
  const open = (id) => S[id].visibility === 'open';
  const lanterns = (id) => open(id) && (S[id].stage >= 1 || v.lisiere || v.veille);
  const list = [];
  for (const L of LANDMARKS) {
    const vis = S[L.sector].visibility;
    if (vis === 'brume') continue;
    const e = { ...L, landmark: true, interactive: vis === 'open', light: LIGHT[L.model] ?? null, allume: false };
    if (L.model === 'tour') { e.variant = v.tourRepaired ? 1 : 0; e.allume = open('place') && v.tourRepaired; }
    else if (L.model === 'atelier') e.variant = S.atelier.stage === 0 ? 'abime' : '';
    else if (L.model === 'relais') e.allume = open('place');
    else if (L.model === 'lanterne') e.allume = lanterns(L.sector);
    else if (L.model === 'etabli' && v.landmarkState?.etabli !== 'construit') { e.model = 'chantier'; e.light = null; }
    else if (e.light) e.allume = open(L.sector) && (S[L.sector].stage >= 1 || !!v.veille);
    if (v.reflets?.has?.(L.id)) e.reluit = true;
    list.push(e);
  }
  for (const d of DECOR) list.push(d);
  if (open('champs')) {
    for (const p of v.plots) {
      const slot = PLOT_SLOTS[p.slot];
      if (!slot) continue;
      list.push({ id: `${p.id}:sol`, model: 'parcelle', sector: 'champs', r: slot.r, c: slot.c, w: 2, h: 2, ground: true });
      // la culture porte la cible de toucher, même vide (crop null : aucun dessin, l'interface propose « Semer »)
      list.push({
        id: p.id, model: 'culture', sector: 'champs', r: slot.r, c: slot.c, w: 2, h: 2, crop: p.crop,
        progress: p.crop ? Math.round((p.stage / Math.max(1, p.need)) * 100) / 100 : 0, seed: p.slot + 3, interactive: true, plot: p,
        reluit: v.reflets?.has?.(`plot:${p.slot}`) || false,
      });
    }
  }
  // Avis annoncé : trois braseros sur le rebord du secteur visé, face au Front ; allumés un à un
  if (v.avis && open(v.avis.sector)) {
    braseroSpots(v.avis.sector).forEach(([u, vv], i) => {
      const lit = i < v.avis.braseros;
      list.push({ id: `brasero-${i + 1}`, model: 'brasero', sector: v.avis.sector, r: vv - 0.5, c: u - 0.5, variant: lit ? 1 : 0, placed: true, light: 'lantern', allume: lit });
    });
  }
  // Voile : cases couvertes de givre
  for (const vl of v.veils || []) {
    if (!open(vl.sector)) continue;
    (VEIL_CELLS[vl.sector] || []).slice(0, vl.cells).forEach(([r, c], k) => {
      list.push({ id: `givre-${vl.sector}-${k}`, kind: 'frost', model: 'givre', sector: vl.sector, r, c, seed: r * 13 + c });
    });
  }
  for (const p of v.placements) {
    if (S[p.sector]?.visibility !== 'open') continue;
    const [w, h] = FOOT[p.model] ?? [1, 1];
    list.push({ id: p.id, model: p.model, sector: p.sector, r: p.r, c: p.c, w, h, interactive: true, placed: true, light: p.model === 'lanterne' ? 'lantern' : null, allume: p.model === 'lanterne' && lanterns(p.sector) });
  }
  v.crates.forEach((cr, i) => {
    const [u, vv] = CRATE_SPOTS[i];
    const task = tasks.find((t) => t && t.id === cr.taskId);
    list.push({ id: cr.id, model: 'caisse', sector: sectorAt(Math.floor(vv), Math.floor(u)), r: vv - 0.5, c: u - 0.5, seed: i + 2, interactive: true, crate: cr, title: task ? String(task.task ?? '') : '', reluit: v.reflets?.has?.(`caisse:${i}`) || false });
  });
  for (const id of v.posts) {
    const p = LISIERE_POSTS.find((x) => x.id === id);
    if (!p) continue;
    const side = open(p.between[0]) ? p.between[0] : p.between[1];
    list.push({ id: p.id, model: 'lanterne', sector: side, r: p.v - 0.5, c: p.u - 0.5, light: 'lantern', allume: !!(v.lisiere || v.veille), post: true });
  }
  for (const ch of CHARACTERS) {
    if (!open(ch.sector)) continue;
    list.push({ id: ch.id, kind: 'char', who: ch.kind, sector: ch.sector, u: ch.u, v: ch.v, interactive: true, light: ch.kind === 'fanal' ? 'fanal' : null, allume: true });
  }
  for (const id of SECTOR_ORDER) {
    const s = S[id];
    if (!open(id) || s.stage > 0 || !s.germ) continue;
    const [r, c] = germCell(id, s.lit);
    list.push({ id: `germe-${id}`, kind: 'germ', stage: s.germ, sector: id, u: c + 0.5, v: r + 0.5 });
  }
  return list;
}

// ----------------------------------------------------------------------------- décor lointain
function farForestURI() {
  const w = 360, h = 46;
  let d1 = '', d2 = '';
  for (let x = -10, k = 0; x < w + 10; k++) {
    const s = 10 + ((k * 37) % 11), hh = 14 + ((k * 53) % 17);
    d1 += `M${x},${h}L${x + s / 2},${h - hh}L${x + s},${h}Z`;
    x += s * 0.7;
  }
  for (let x = -4, k = 0; x < w + 10; k++) {
    const s = 13 + ((k * 29) % 9), hh = 10 + ((k * 41) % 13);
    d2 += `M${x},${h}L${x + s / 2},${h - hh}L${x + s},${h}Z`;
    x += s * 0.85;
  }
  const svg = `<svg xmlns="${SVGNS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d1}" fill="${BASE.far1}"/><path d="${d2}" fill="${BASE.far2}"/><rect y="${h - 3}" width="${w}" height="3" fill="${BASE.far2}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ----------------------------------------------------------------------------- création
export function createWorld(container, options = {}) {
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  const id = ++uid;
  const t = makeTexts(options.texts || {});
  const nowOf = () => (typeof options.now === 'function' ? options.now() : options.now) || new Date();
  ensurePalette(doc, doc.documentElement);
  if (win.getComputedStyle(container).position === 'static') container.style.position = 'relative';

  // ---- structure
  const root = el('div', 'ow', { 'data-lod': 'pres', 'data-ambient': 'off' });
  const scroller = el('div', 'ow-scroller', { role: 'region', 'aria-label': t('monde.region'), 'aria-describedby': `ow-hint-${id}` });
  const hint = el('p', 'ow-sr', { id: `ow-hint-${id}` });
  hint.textContent = t('monde.region.hint');
  const content = el('div', 'ow-content');
  const far = el('div', 'ow-far', { 'aria-hidden': 'true' });
  far.style.backgroundImage = farForestURI();
  const sky = el('div', 'ow-skyband', { 'aria-hidden': 'true' });
  sky.innerHTML = '<i class="ow-cloud c1"></i><i class="ow-cloud c2"></i><i class="ow-cloud c3"></i>';
  const stage = el('div', 'ow-stage');
  stage.setAttribute('aria-hidden', 'false');

  const terrainHost = el('div', 'ow-terrain-host', { 'aria-hidden': 'true' });
  terrainHost.innerHTML = terrainSVG();
  const terrain = terrainHost.firstElementChild;
  Object.assign(terrain.style, { left: TERRAIN.x + 'px', top: TERRAIN.y + 'px' });

  const veils = doc.createElementNS(SVGNS, 'svg');
  veils.setAttribute('class', 'ow-veils');
  veils.setAttribute('viewBox', `${TERRAIN.x} ${TERRAIN.y} ${TERRAIN.w} ${TERRAIN.h}`);
  veils.setAttribute('width', TERRAIN.w); veils.setAttribute('height', TERRAIN.h);
  veils.setAttribute('aria-hidden', 'true');
  Object.assign(veils.style, { left: TERRAIN.x + 'px', top: TERRAIN.y + 'px' });
  let vm = `<defs><pattern id="ow-ash-${id}" width="22" height="13" patternUnits="userSpaceOnUse"><ellipse cx="4" cy="3" rx="1.6" ry=".8" class="ow-ash-speck"/><ellipse cx="15" cy="9" rx="1.2" ry=".6" class="ow-ash-speck"/><ellipse cx="19" cy="2" rx=".8" ry=".45" class="ow-ash-speck"/></pattern></defs>`;
  for (const s of SECTOR_ORDER) {
    const poly = pts(sectorPolygon(s));
    vm += `<g class="ow-veil" data-sector="${s}" hidden><polygon class="ow-veil-fill" points="${poly}"/><polygon class="ow-veil-pat" points="${poly}" fill="url(#ow-ash-${id})"/><polygon class="ow-veil-edge" points="${poly}"/></g>`;
  }
  vm += '<g class="ow-front" hidden><g class="ow-front-move"></g></g>';
  veils.innerHTML = vm;
  const frontHost = veils.querySelector('.ow-front');
  const frontMove = frontHost.firstElementChild;

  const fxg = el('div', 'ow-fxg', { 'aria-hidden': 'true' });
  const flashSvg = doc.createElementNS(SVGNS, 'svg');
  flashSvg.setAttribute('class', 'ow-flashes');
  flashSvg.setAttribute('viewBox', `${TERRAIN.x} ${TERRAIN.y} ${TERRAIN.w} ${TERRAIN.h}`);
  flashSvg.setAttribute('width', TERRAIN.w); flashSvg.setAttribute('height', TERRAIN.h);
  Object.assign(flashSvg.style, { left: TERRAIN.x + 'px', top: TERRAIN.y + 'px' });
  let fm = '';
  for (const s of SECTOR_ORDER) fm += `<polygon class="ow-flash" data-sector="${s}" points="${pts(sectorPolygon(s))}"/>`;
  fm += '<g class="ow-tileflashes"></g>';
  flashSvg.innerHTML = fm;
  fxg.appendChild(flashSvg);

  const shadows = el('div', 'ow-shadows', { 'aria-hidden': 'true' });
  const ents = el('div', 'ow-ents-root');
  const groups = {};
  for (const s of SECTOR_ORDER) { groups[s] = el('div', 'ow-ents', { 'data-sector': s }); ents.appendChild(groups[s]); }
  const mist = el('div', 'ow-mistlayer', { 'aria-hidden': 'true' });
  const mists = {};
  for (const s of SECTOR_ORDER) {
    const m = el('div', 'ow-mist', { 'data-sector': s });
    m.hidden = true;
    const [u, v] = SECTOR_CENTER[s];
    const [x, y] = P(u, v);
    m.style.transform = `translate(${f(x)}px, ${f(y - 30)}px)`;
    // la brume passe devant les objets de son secteur, derrière ceux des secteurs plus proches
    m.style.zIndex = String(105 + 10 * Math.max(...CELLS[s].map(([r, c]) => r + c + 2)));
    m.innerHTML = '<i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i>';
    mists[s] = m; mist.appendChild(m);
  }
  const dusk = el('div', 'ow-dusk', { 'aria-hidden': 'true' });
  const stars = el('div', 'ow-stars', { 'aria-hidden': 'true' });
  for (let k = 0; k < 9; k++) {
    const s = el('i', 'ow-nightstar');
    s.style.transform = `translate(${f(-380 + ((k * 97) % 760))}px, ${f(HORIZON_Y - 40 - ((k * 53) % 90))}px)`;
    stars.appendChild(s);
  }
  const lights = el('div', 'ow-lights', { 'aria-hidden': 'true' });
  const fxw = el('div', 'ow-fxw', { 'aria-hidden': 'true' });
  stage.append(terrainHost, veils, fxg, shadows, ents, mist, dusk, stars, lights, fxw);
  // le décor du terrain est purement visuel : seuls les boutons d'objets sont exposés
  terrainHost.setAttribute('aria-hidden', 'true');

  const plaques = el('div', 'ow-plaques');
  const tag = el('div', 'ow-tag', { 'aria-hidden': 'true' });
  tag.hidden = true;
  content.append(far, sky, stage, plaques, tag);
  scroller.append(content);

  const fxv = el('div', 'ow-fxv', { 'aria-hidden': 'true' });
  const zoom = el('div', 'ow-zoom', { role: 'group', 'aria-label': t('monde.zoom.group') });
  const zbtn = (act, label, d) => {
    const b = el('button', 'ow-zbtn', { type: 'button', 'data-zoom': act, 'aria-label': label, title: label });
    b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
    return b;
  };
  const zIn = zbtn('in', t('monde.zoom.in'), 'M12 5v14M5 12h14');
  const zOut = zbtn('out', t('monde.zoom.out'), 'M5 12h14');
  const zFit = zbtn('fit', t('monde.zoom.fit'), 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5');
  zoom.append(zIn, zOut, zFit);
  const skipBtn = el('button', 'ow-skip', { type: 'button' });
  skipBtn.textContent = t('a11y.skip_animation');
  skipBtn.hidden = true;
  let live = null;
  if (!options.announce) { live = el('p', 'ow-sr', { role: 'status', 'aria-live': 'polite' }); }
  root.append(scroller, hint, fxv, zoom, skipBtn);
  if (live) root.append(live);
  container.appendChild(root);

  // ---- moteurs
  const ticker = createTicker(win);
  const bus = createBus();
  const scene = new Scene({ shadows, lights, groups }, { label: labelOf });
  const camera = new Camera({ root, scroller, content, stage, plaques, insets: options.insets, onChange: onLayout });
  const fx = new Fx({ camera, ticker, layers: { view: fxv, world: fxw, ground: fxg } });

  const grounds = {}, tiles = {}, litShown = {}, sectorAttr = {};
  for (const s of SECTOR_ORDER) {
    grounds[s] = terrain.querySelector(`.ow-ground[data-sector="${s}"]`);
    const byCell = new Map([...grounds[s].querySelectorAll('.ow-tile')].map((n) => [n.dataset.cell, n]));
    tiles[s] = LIT_ORDER[s].map(([r, c]) => byCell.get(`${r}-${c}`));
    litShown[s] = -1;
    sectorAttr[s] = { etat: undefined, voile: undefined };
  }
  const veilOf = Object.fromEntries(SECTOR_ORDER.map((s) => [s, veils.querySelector(`.ow-veil[data-sector="${s}"]`)]));
  const flashOf = Object.fromEntries(SECTOR_ORDER.map((s) => [s, flashSvg.querySelector(`.ow-flash[data-sector="${s}"]`)]));
  const tileFlashes = flashSvg.querySelector('.ow-tileflashes');

  // ---- état
  let pending = null;   // dernier { game, tasks } reçu
  let target = null;    // vue dérivée de pending
  let shown = null;     // vue actuellement affichée (avance pas à pas pendant play)
  let tasks = [];
  let scheduled = false;
  let queued = 0, playing = 0;
  let chain = Promise.resolve();
  let selected = null;
  let active = options.activeSector || null;
  let reduced = false, forced = null;
  let destroyed = false;
  let first = true;
  let ambientTimer = 0;
  let suppressClick = false;
  const plaqueEls = {};
  const plaqueLast = {};

  // ---------------------------------------------------------------------------- textes accessibles
  function sectorName(s) { return t(`sector.${s}.name`); }
  function objName(e) {
    if (e.kind === 'char') return t(`monde.obj.${e.who}`);
    if (e.model === 'tour') return t(e.variant ? 'monde.obj.tour' : 'monde.obj.tour.abimee');
    if (e.model === 'culture') {
      const p = e.plot;
      if (!p.crop) return `${t('monde.obj.parcelle')} : ${t('monde.crop.empty')}`;
      const state = p.stage <= 0 ? t('monde.crop.state.0') : p.ripe ? t('monde.crop.state.ripe') : t('monde.crop.state.mid', { s: p.stage, n: p.need });
      return `${t('monde.obj.parcelle')} : ${t(`monde.crop.${p.crop}`)}, ${state}${p.ripe ? `. ${t('monde.crop.ripe.hint')}` : ''}`;
    }
    if (e.model === 'chantier') return t('monde.obj.chantier');
    if (e.crate) {
      const d = e.crate.days;
      const when = d < 0 ? t('monde.crate.passed') : d === 0 ? t('monde.crate.today') : t('monde.crate.days', { n: d });
      return `${t('monde.obj.caisse')}${e.title ? ` : ${e.title}` : ''}, ${when}`;
    }
    return t(`monde.obj.${e.model}`);
  }
  function labelOf(e) { return t('monde.select.object', { objet: objName(e), au_secteur: t(`sector.${e.sector}.in`) }); }

  function say(text) {
    if (!text) return;
    if (options.announce) { options.announce(text); return; }
    live.textContent = '';
    win.setTimeout(() => { if (!destroyed) live.textContent = text; }, 60);
  }

  // ---------------------------------------------------------------------------- application d'une vue
  function applySectors(v) {
    for (const s of SECTOR_ORDER) {
      const sv = v.sectors[s];
      const etat = sv.visibility === 'open' ? sv.etat : null;
      const voile = sv.visibility === 'open' ? null : sv.visibility;
      setSectorAttr(s, etat, voile);
    }
  }
  function setSectorAttr(s, etat, voile, part = 'both') {
    const a = sectorAttr[s];
    for (const node of part === 'ground' ? [grounds[s]] : part === 'ents' ? [groups[s]] : [grounds[s], groups[s]]) {
      if (etat) node.setAttribute('data-etat', etat); else node.removeAttribute('data-etat');
      if (voile) node.setAttribute('data-voile', voile); else node.removeAttribute('data-voile');
    }
    if (part === 'both') { a.etat = etat; a.voile = voile; }
  }

  function litCount(sv) {
    if (sv.visibility !== 'open') return 0;
    return sv.stage >= 1 ? tiles[sv.id].length : sv.lit;
  }
  function setLit(s, n) {
    if (litShown[s] === n) return;
    const list = tiles[s];
    for (let i = 0; i < list.length; i++) list[i].toggleAttribute('data-lit', i < n);
    litShown[s] = n;
  }
  function applyTiles(v) { for (const s of SECTOR_ORDER) setLit(s, litCount(v.sectors[s])); }

  function applyVeils(v) {
    for (const s of SECTOR_ORDER) {
      const vis = v.sectors[s].visibility;
      if (veilOf[s].hasAttribute('hidden') !== (vis !== 'cendre')) veilOf[s].toggleAttribute('hidden', vis !== 'cendre');
      if (mists[s].hidden !== (vis !== 'brume')) mists[s].hidden = vis !== 'brume';
    }
  }

  // ---- Front de givre (Avis annoncé) : posé au rivage du bord visé, reculé selon le temps qui reste
  let frontSector = null;
  function frontShift(progress, extra = 0) {
    const [nx, ny] = edgeNormal(AVIS_EDGE[frontSector]);
    const d = FRONT_FAR * (1 - Math.max(0, Math.min(1, progress))) + extra;
    return `translate(${f(nx * d)}px, ${f(ny * d)}px)`;
  }
  function applyFront(v) {
    const a = v.avis;
    const s = a && AVIS_EDGE[a.sector] && v.sectors[a.sector]?.visibility !== 'brume' ? a.sector : null;
    if (!s) {
      if (!frontHost.hasAttribute('hidden')) frontHost.setAttribute('hidden', '');
      return;
    }
    if (frontSector !== s) { frontSector = s; frontMove.innerHTML = frontSVG(AVIS_EDGE[s]); frontHost.dataset.sector = s; }
    if (frontHost.hasAttribute('hidden')) frontHost.removeAttribute('hidden');
    const tr = frontShift(a.progress);
    if (frontMove.style.transform !== tr) frontMove.style.transform = tr;
  }

  // ---- Avis : nom, échéance en mots
  function avisBadge(a) {
    const nom = avisName(t, a.id);
    return a.daysLeft <= 0 ? t('monde.avis.badge.0', { nom }) : a.daysLeft === 1 ? t('monde.avis.badge.1', { nom }) : t('monde.avis.badge', { nom, n: a.daysLeft });
  }

  // ---- plaques de secteur
  function plaqueModel(sv, avis) {
    const name = sectorName(sv.id);
    if (sv.visibility === 'brume') {
      return { vis: 'brume', name: t('monde.mist'), line: '', etat: '', stage: 0, progress: 0, label: t('monde.mist.hint') };
    }
    // repère d'Avis : picto de givre + texte court, aussi lu dans l'étiquette du bouton
    const av = avis && avis.sector === sv.id ? { text: avisBadge(avis), label: t('monde.avis.label', { nom: avisName(t, avis.id), au_secteur: t(`sector.${sv.id}.in`), quand: avisWhen(t, avis.daysLeft) }) } : null;
    const withAvis = (label) => (av ? `${label} ${av.label}` : label);
    if (sv.visibility === 'cendre') {
      const n = fmt(sv.lueur);
      const line = sv.lueur > 0 ? t('monde.plaque.reserve', { n }) : t('sector.closed');
      return { vis: 'cendre', name, line, etat: '', stage: 0, progress: 0, avis: av, label: withAvis(t('monde.plaque.label', { secteur: name, etat: t('sector.closed'), detail: sv.lueur > 0 ? t('monde.plaque.reserve', { n }) : t('monde.plan.opens', { n: sv.chapter }) })) };
    }
    const lvl = t(levelKey(sv.stage));
    const nx = sv.next;
    const line = nx ? t('monde.plaque.lueur', { n: fmt(sv.lueur), cible: nx.lueur }) : t('monde.plaque.full', { n: fmt(sv.lueur) });
    const prevT = sv.stage === 0 ? 0 : [0, 150, 400, 750][sv.stage];
    const progress = nx ? Math.max(0, Math.min(1, (sv.lueur - prevT) / (nx.lueur - prevT))) : 1;
    const detail = nx ? t('sector.level.next', { palier: t(levelKey(sv.stage + 1)), n: nx.lueur }) : '';
    const tilesTxt = sv.stage === 0 ? ` ${t('monde.tiles', { n: sv.lit })}.` : '';
    return {
      vis: 'open', name, line, etat: sv.etat, stage: sv.stage, progress, lvl, avis: av,
      label: withAvis(t('monde.plaque.label', { secteur: name, etat: lvl, detail: `${line}.${tilesTxt} ${detail}`.trim() })),
    };
  }
  function makePlaque(s) {
    const b = el('button', 'ow-plaque', { type: 'button', 'data-sector': s, tabindex: '-1' });
    b.innerHTML = `<span class="ow-plaque-icon" aria-hidden="true"></span><i class="ow-plaque-mark" aria-hidden="true" hidden>${glyph('givre')}</i><span class="ow-plaque-text" aria-hidden="true"><span class="ow-plaque-name"></span><span class="ow-plaque-line"><span class="ow-pips" aria-hidden="true"><i></i><i></i><i></i></span><span class="ow-plaque-val num"></span></span><span class="ow-plaque-avis" hidden>${glyph('givre')}<span class="ow-plaque-avis-txt"></span></span></span><span class="ow-plaque-bar" aria-hidden="true"><i></i></span>`;
    plaques.appendChild(b);
    plaqueEls[s] = b;
    return b;
  }
  function updatePlaque(sv, avis = shown?.avis ?? null) {
    const b = plaqueEls[sv.id] || makePlaque(sv.id);
    const m = plaqueModel(sv, avis);
    const key = JSON.stringify(m);
    if (plaqueLast[sv.id] === key) return false;
    const prev = plaqueLast[sv.id] ? JSON.parse(plaqueLast[sv.id]) : null;
    plaqueLast[sv.id] = key;
    b.dataset.vis = m.vis;
    if (m.etat) b.dataset.etat = m.etat; else delete b.dataset.etat;
    b.dataset.stage = String(m.stage);
    b.toggleAttribute('data-avis', !!m.avis);
    b.setAttribute('aria-label', m.label);
    if (!prev || prev.vis !== m.vis) b.querySelector('.ow-plaque-icon').innerHTML = glyph(m.vis === 'brume' ? 'brume' : sv.id);
    b.querySelector('.ow-plaque-name').textContent = m.name;
    b.querySelector('.ow-plaque-val').textContent = m.line;
    b.querySelector('.ow-plaque-mark').hidden = !m.avis;
    b.querySelector('.ow-plaque-avis').hidden = !m.avis;
    b.querySelector('.ow-plaque-avis-txt').textContent = m.avis ? m.avis.text : '';
    b.querySelector('.ow-plaque-bar i').style.transform = `scaleX(${m.progress.toFixed(3)})`;
    // le texte change de longueur : la plaque se remesure et se replace (sinon elle déborde sous la colonne de zoom)
    if (!first && prev && (prev.line !== m.line || prev.name !== m.name || !!prev.avis !== !!m.avis || prev.avis?.text !== m.avis?.text)) {
      plaqueSize[sv.id] = [b.offsetWidth, b.offsetHeight];
      placePlaques();
    }
    return true;
  }
  function applyPlaques(v) {
    let changed = false;
    for (const s of SECTOR_ORDER) changed = updatePlaque(v.sectors[s], v.avis) || changed;
    changed = sizePlaques() || changed;
    if (changed && !first) { measurePlaques(); placePlaques(); }
  }
  /** Plaque dépliée : celle du secteur actif, ou toutes quand la carte est assez grande pour les porter. */
  function sizePlaques() {
    let changed = false;
    const roomy = camera.s >= 0.9;
    const act = defaultActive();
    for (const s of SECTOR_ORDER) {
      const b = plaqueEls[s];
      if (!b) continue;
      const short = !(roomy || s === act);
      if (b.hasAttribute('data-court') !== short) { b.toggleAttribute('data-court', short); changed = true; }
    }
    return changed;
  }
  function setActive(s) {
    if (!SECTOR_ORDER.includes(s)) return;
    active = s;
    if (sizePlaques()) { measurePlaques(); placePlaques(); }
  }
  // Les plaques suivent leur ancre mais restent dans la zone libre : jamais sous le HUD, la feuille,
  // la colonne de zoom ni hors de l'écran (elles se rangent alors au bord, côté de leur secteur).
  const plaqueSize = {};
  let zoomBox = null; // [gauche, haut, droite, bas] en coordonnées de vue
  function measurePlaques() {
    for (const s of SECTOR_ORDER) if (plaqueEls[s]) plaqueSize[s] = [plaqueEls[s].offsetWidth, plaqueEls[s].offsetHeight];
  }
  function measureZoom() {
    const zw = zoom.offsetWidth, zh = zoom.offsetHeight, m = 12;
    zoomBox = [camera.W - m - zw - 6, camera.H - camera.bottom - m - zh - 6, camera.W, camera.H - camera.bottom];
  }
  function placePlaques() {
    if (!zoomBox) return;
    const m = 8;
    for (const s of SECTOR_ORDER) {
      const b = plaqueEls[s];
      if (!b || !plaqueSize[s]) continue;
      const [w, h] = plaqueSize[s];
      const [u, v, mode] = PLAQUE_ANCHOR[s];
      const [x, y] = camera.toContent(...P(u, v));
      let vl = x - w / 2 - camera.sx;
      let vt = (mode === 'hang' ? y + 8 : y - h / 2) - camera.sy;
      vl = Math.max(m, Math.min(camera.W - w - m, vl));
      vt = Math.max(camera.top + m, Math.min(camera.H - camera.bottom - h - m, vt));
      const z = zoomBox;
      if (vl + w > z[0] && vl < z[2] && vt + h > z[1] && vt < z[3]) {
        // à gauche de la colonne de zoom si elle y tient entière, sinon au-dessus d'elle
        if (z[0] - w >= m) vl = z[0] - w;
        else vt = Math.max(camera.top + m, z[1] - h);
      }
      b.style.transform = `translate(${f(vl + camera.sx)}px, ${f(vt + camera.sy)}px)`;
    }
  }

  function apply(v, { quiet = false, enter = true } = {}) {
    applySectors(v);
    applyTiles(v);
    applyVeils(v);
    applyFront(v);
    applyPlaques(v);
    const res = scene.sync(entitiesFor(v, tasks), { quiet });
    if (!quiet && enter) {
      for (const eid of res.added) {
        const n = scene.get(eid);
        if (n) fx.anim(n.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
      }
    }
    if (selected && !scene.get(selected)) select(null);
    else placeTag();
    syncRoving();
    return res;
  }

  function derive(p) { return deriveView(p.game, p.tasks, { now: nowOf(), anchors: options.anchors }); }

  function applyPending() {
    if (!pending || destroyed) return;
    tasks = pending.tasks;
    target = derive(pending);
    shown = cloneView(target);
    const quiet = first;
    apply(shown, { quiet });
    if (first) {
      first = false;
      initialCamera();
      wake();
    }
    bus.emit('render', shown);
  }

  // ---------------------------------------------------------------------------- caméra et mise en page
  function onLayout() {
    root.style.setProperty('--ow-top', camera.top.toFixed(0) + 'px');
    root.style.setProperty('--ow-bottom', camera.bottom.toFixed(0) + 'px');
    const [, hy] = camera.toContent(0, HORIZON_Y);
    content.style.setProperty('--ow-horizon', Math.max(0, hy).toFixed(0) + 'px');
    const lod = camera.far ? 'loin' : 'pres';
    if (root.dataset.lod !== lod) root.dataset.lod = lod;
    // bande de ciel sous le HUD : les nuages ne passent jamais derrière les tuiles de ressources
    const band = hy - 30 - camera.top;
    sky.hidden = band < 40;
    sky.style.top = camera.top.toFixed(0) + 'px';
    sky.style.height = Math.max(0, band).toFixed(0) + 'px';
    sizePlaques();
    measureZoom();
    measurePlaques();
    placePlaques();
    placeTag();
    placeSkip();
    const lv = camera.levels();
    zOut.disabled = camera.s <= lv[0] + 0.001;
    zIn.disabled = camera.s >= lv[lv.length - 1] - 0.001;
  }

  function defaultActive() {
    if (active) return active;
    if (!shown) return 'place';
    const open = SECTOR_ORDER.filter((s) => s !== 'place' && shown.sectors[s].visibility === 'open');
    open.sort((a, b) => shown.sectors[b].chapter - shown.sectors[a].chapter);
    return open[0] || 'place';
  }
  function sectorPoint(s) { const [u, v] = SECTOR_CENTER[s]; return P(u, v); }

  function initialCamera() {
    camera.measure();
    const s = camera.defaultScale();
    camera.layout(s);
    if (s > camera.fit + 0.001) camera.centerOn(...sectorPoint(defaultActive()));
    else camera.centerOn(0, BOUNDS.y + BOUNDS.h / 2);
  }

  function zoomTo(dir, focusView) {
    const lv = camera.levels();
    let s = camera.s;
    if (dir === 'fit') s = lv[0];
    else if (dir === 'in') s = lv.find((x) => x > camera.s + 0.01) ?? lv[lv.length - 1];
    else s = [...lv].reverse().find((x) => x < camera.s - 0.01) ?? lv[0];
    camera.setScale(s, focusView);
    if (dir === 'fit') camera.centerOn(0, BOUNDS.y + BOUNDS.h / 2);
    wake();
  }

  function focusSector(s) {
    if (!SECTOR_ORDER.includes(s) || destroyed) return;
    setActive(s);
    if (camera.s < NEAR_SCALE - 0.001) camera.setScale(NEAR_SCALE);
    const [x, y] = sectorPoint(s);
    camera.centerOn(x, y, !reduced);
    wake();
  }

  /** Amène un point du monde dans la zone libre s'il n'y est pas. */
  function reveal(x, y, margin = 50) {
    if (camera.isVisible(x, y, margin)) return;
    camera.centerOn(x, y, !reduced && !fx.instant);
  }

  // ---------------------------------------------------------------------------- sélection
  function placeTag() {
    if (!selected || tag.hidden) return;
    const p = scene.pointOf(selected, 1);
    if (!p) return;
    const [x, y] = camera.toContent(p[0], p[1]);
    const w = tag.offsetWidth, h = tag.offsetHeight, m = 12;
    let vl = x - w / 2 - camera.sx, vt = y - 10 - h - camera.sy;
    const right = zoomBox ? Math.min(camera.W, zoomBox[0]) : camera.W;
    vl = Math.max(m, Math.min(right - w - m, vl));
    if (vt < camera.top + m) vt = y + 14 - camera.sy; // pas de place au-dessus : l'étiquette passe sous l'objet
    tag.style.transform = `translate(${f(vl + camera.sx)}px, ${f(vt + camera.sy)}px)`;
  }
  function select(eid) {
    selected = eid && scene.get(eid) ? eid : null;
    scene.select(selected);
    if (!selected) { tag.hidden = true; return; }
    tag.textContent = objName(scene.get(selected).e);
    tag.style.maxWidth = Math.max(120, Math.min(240, camera.W - 24)).toFixed(0) + 'px';
    tag.hidden = false;
    placeTag();
  }

  // ---------------------------------------------------------------------------- navigation au clavier
  // Un seul arrêt de tabulation parmi les plaques et les objets (tabindex itinérant), flèches spatiales.
  let rovingId = null;
  function rovingItems() {
    const items = SECTOR_ORDER.map((s) => plaqueEls[s]).filter(Boolean);
    if (root.dataset.lod !== 'loin') for (const n of scene.nodes.values()) if (n.e.interactive) items.push(n.el);
    return items;
  }
  function syncRoving() {
    const items = rovingItems();
    let cur = items.find((n) => n.tabIndex === 0);
    if (!cur || !cur.isConnected) cur = items.find((n) => (n.dataset.id || n.dataset.sector) === rovingId) || items[0];
    for (const n of items) if (n !== cur && n.tabIndex !== -1) n.tabIndex = -1;
    if (cur && cur.tabIndex !== 0) cur.tabIndex = 0;
  }
  function centerOfEl(n) { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function moveFocus(from, key) {
    const items = rovingItems().filter((n) => n !== from && !n.closest('[hidden]'));
    if (!items.length) return;
    let best = null;
    if (key === 'Home' || key === 'End') best = key === 'Home' ? items[0] : items[items.length - 1];
    else {
      const [x0, y0] = centerOfEl(from);
      let bestScore = Infinity;
      for (const n of items) {
        const [x, y] = centerOfEl(n);
        const dx = x - x0, dy = y - y0;
        const along = key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy;
        const across = key === 'ArrowRight' || key === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
        if (along <= 4) continue;
        const score = along + across * 2.2;
        if (score < bestScore) { bestScore = score; best = n; }
      }
    }
    if (!best) return;
    from.tabIndex = -1;
    best.tabIndex = 0;
    rovingId = best.dataset.id || best.dataset.sector;
    best.focus({ preventScroll: true });
    revealEl(best);
  }
  function revealEl(n) {
    const r = n.getBoundingClientRect(), R = root.getBoundingClientRect();
    const cx = r.left + r.width / 2 - R.left, cy = r.top + r.height / 2 - R.top;
    const m = 40;
    if (cx < m || cx > camera.W - m || cy < camera.top + m || cy > camera.H - camera.bottom - m) {
      const [fxc, fyc] = camera.freeCenter();
      camera.scrollToView(camera.sx + cx - fxc, camera.sy + cy - fyc, !reduced);
    }
  }

  // ---------------------------------------------------------------------------- bouton « Passer l'animation »
  // Il doit rester touchable : sous la zone réservée du haut par défaut ; si l'interface le recouvre (panneau ouvert
  // en compact), il remonte dans la bande libre juste au-dessus, puis tout en haut. Vérifié par un test de toucher.
  function placeSkip() {
    if (skipBtn.hidden || destroyed) return;
    const h = skipBtn.offsetHeight || 44;
    for (const top of [camera.top + 8, camera.top - h, 8]) {
      skipBtn.style.top = f(Math.max(0, top)) + 'px';
      const r = skipBtn.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const ok = [r.top + 6, r.top + r.height / 2, r.bottom - 6].every((y) => { const hit = doc.elementFromPoint(x, y); return hit && skipBtn.contains(hit); });
      if (ok) return;
    }
    skipBtn.style.top = '';
  }

  // ---------------------------------------------------------------------------- ambiance
  function wake(ms = AMBIENT_MS) {
    if (destroyed) return;
    if (root.dataset.ambient !== 'on') root.dataset.ambient = 'on';
    win.clearTimeout(ambientTimer);
    ambientTimer = win.setTimeout(() => { if (!destroyed && !playing) root.dataset.ambient = 'off'; }, ms);
  }
  function clearVeille() {
    if (!shown || !shown.veille) return;
    shown.veille = false;
    if (target) target.veille = false;
    delete root.dataset.veille;
    apply(shown, { quiet: true });
  }

  // ---------------------------------------------------------------------------- mouvement réduit
  const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function syncMotion() {
    const m = doc.documentElement.dataset.motion;
    reduced = forced !== null ? forced : m === 'reduce' ? true : m === 'full' ? false : !!(mq && mq.matches);
    root.dataset.mouvement = reduced ? 'reduit' : 'complet';
    fx.reduced = reduced;
  }
  syncMotion();
  mq?.addEventListener?.('change', syncMotion);
  const motionObs = new win.MutationObserver(syncMotion);
  motionObs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-motion'] });

  // ---------------------------------------------------------------------------- événements
  function skip() { if (playing || queued) fx.skip(); }

  function onClick(ev) {
    if (suppressClick) { suppressClick = false; ev.preventDefault(); return; }
    const z = ev.target.closest('[data-zoom]');
    if (z) { zoomTo(z.dataset.zoom); return; }
    if (ev.target.closest('.ow-skip')) { skip(); return; }
    if (playing) return;
    clearVeille();
    const pl = ev.target.closest('.ow-plaque');
    if (pl) {
      const s = pl.dataset.sector;
      rovingTo(pl);
      if (shown?.sectors[s]?.visibility === 'brume') { say(t('monde.mist.hint')); return; }
      focusSector(s);
      options.onSelect?.({ type: 'sector', id: s });
      bus.emit('select', { type: 'sector', id: s });
      return;
    }
    const b = ev.target.closest('.ow-ent.is-btn');
    if (b) {
      const n = scene.get(b.dataset.id);
      rovingTo(b);
      select(b.dataset.id === selected ? null : b.dataset.id);
      if (selected && n) {
        const info = selectInfo(n.e);
        options.onSelect?.(info);
        bus.emit('select', info);
      }
      return;
    }
    if (ev.target.closest('.ow-scroller')) select(null);
  }
  function selectInfo(e) {
    if (e.plot) return { type: 'plot', id: e.plot.id, sector: e.sector, crop: e.plot.crop, stage: e.plot.stage, ripe: e.plot.ripe };
    if (e.landmark) return { type: 'landmark', id: e.id, sector: e.sector, model: e.model, state: e.model === 'chantier' ? null : (shown?.landmarkState?.[e.id] ?? null) };
    if (e.placed && !e.kind) return { type: 'placement', id: e.id, sector: e.sector, model: e.model };
    return { type: 'object', id: e.id, sector: e.sector, model: e.kind === 'char' ? e.who : e.model, taskId: e.crate?.taskId ?? null };
  }
  /** Glissé sur une parcelle mûre : petit écrasement de la culture, puis l'hôte décide (onHarvest). */
  function harvestGesture(eid) {
    const n = scene.get(eid);
    if (!n || !n.e.plot?.ripe) return;
    fx.anim(n.el, [{ transform: 'scale(1)' }, { transform: 'scale(1.06, .9)' }, { transform: 'scale(1)' }], { duration: reduced ? 1 : 200, easing: 'ease-out' });
    options.onHarvest?.(n.e.plot.id);
    bus.emit('harvest', { plotId: n.e.plot.id });
  }
  function rovingTo(n) {
    for (const x of rovingItems()) if (x !== n && x.tabIndex === 0) x.tabIndex = -1;
    n.tabIndex = 0;
    rovingId = n.dataset.id || n.dataset.sector;
  }

  function onKey(ev) {
    if (ev.key === 'Escape') {
      if (playing || queued) { skip(); ev.preventDefault(); return; }
      if (shown?.veille) { clearVeille(); return; }
      if (selected) { select(null); ev.preventDefault(); }
      return;
    }
    if (playing) { if (ev.key === ' ' || ev.key === 'Enter') { skip(); ev.preventDefault(); } return; }
    const k = ev.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(k)) {
      if ((k === '+' || k === '=') && scroller.contains(doc.activeElement)) { zoomTo('in'); ev.preventDefault(); }
      else if (k === '-' && scroller.contains(doc.activeElement)) { zoomTo('out'); ev.preventDefault(); }
      return;
    }
    const from = doc.activeElement;
    if (!from || !scroller.contains(from) || from === scroller) return;
    ev.preventDefault();
    moveFocus(from, k);
    wake();
  }

  function onFocusIn(ev) {
    const n = ev.target;
    if (n.classList?.contains('ow-plaque') || n.classList?.contains('ow-ent')) revealEl(n);
  }

  // glisser à la souris pour se déplacer ; pincer à deux doigts pour zoomer
  let drag = null;
  const touches = new Map();
  let pinch = null;
  let swipe = null; // glissé de récolte commencé sur une parcelle mûre
  function onPointerDown(ev) {
    if (playing || queued) { skip(); }
    clearVeille();
    wake();
    const ripe = !playing && (ev.pointerType !== 'mouse' || ev.button === 0) && ev.target.closest?.('.ow-ent.is-btn[data-mure]');
    if (ripe && !touches.size) {
      swipe = { id: ripe.dataset.id, pid: ev.pointerId, x: ev.clientX, y: ev.clientY, done: false };
      if (ev.pointerType !== 'touch') return; // pas de déplacement de carte depuis une parcelle mûre
    }
    if (ev.pointerType === 'touch') {
      touches.set(ev.pointerId, [ev.clientX, ev.clientY]);
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        const R = root.getBoundingClientRect();
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: camera.s, mid: [(a[0] + b[0]) / 2 - R.left, (a[1] + b[1]) / 2 - R.top] };
      }
      return;
    }
    if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
    if (ev.target.closest('.ow-zoom, .ow-skip')) return;
    drag = { x: ev.clientX, y: ev.clientY, sl: scroller.scrollLeft, st: scroller.scrollTop, moved: false };
  }
  function onPointerMove(ev) {
    if (swipe && swipe.pid === ev.pointerId && !swipe.done && touches.size < 2
      && Math.hypot(ev.clientX - swipe.x, ev.clientY - swipe.y) > SWIPE_PX) {
      swipe.done = true;
      harvestGesture(swipe.id);
    }
    if (ev.pointerType === 'touch' && touches.has(ev.pointerId)) {
      touches.set(ev.pointerId, [ev.clientX, ev.clientY]);
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const lv = camera.levels();
        const s = Math.max(lv[0], Math.min(lv[lv.length - 1], pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d));
        if (Math.abs(s - camera.s) > 0.004) camera.setScale(s, pinch.mid);
      }
      return;
    }
    if (!drag) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; root.dataset.glisse = '1'; }
    if (drag.moved) camera.scrollToView(drag.sl - dx, drag.st - dy, false);
  }
  function onPointerUp(ev) {
    if (swipe && swipe.pid === ev.pointerId) {
      if (swipe.done) { suppressClick = true; win.setTimeout(() => { suppressClick = false; }, 0); }
      swipe = null;
    }
    if (ev.pointerType === 'touch') { touches.delete(ev.pointerId); if (touches.size < 2) pinch = null; return; }
    if (drag && drag.moved) { suppressClick = true; win.setTimeout(() => { suppressClick = false; }, 0); }
    if (drag) delete root.dataset.glisse;
    drag = null;
  }
  function onWheel(ev) {
    if (!ev.ctrlKey) { wake(); return; }
    ev.preventDefault();
    const R = root.getBoundingClientRect();
    const lv = camera.levels();
    const s = Math.max(lv[0], Math.min(lv[lv.length - 1], camera.s * Math.exp(-ev.deltaY * 0.0022)));
    camera.setScale(s, [ev.clientX - R.left, ev.clientY - R.top]);
  }
  function onScroll() {
    placePlaques();
    placeTag();
    if (root.dataset.ambient !== 'on') wake();
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('pointerdown', onPointerDown);
  win.addEventListener('pointermove', onPointerMove);
  win.addEventListener('pointerup', onPointerUp);
  win.addEventListener('pointercancel', onPointerUp);
  scroller.addEventListener('wheel', onWheel, { passive: false });
  scroller.addEventListener('scroll', onScroll, { passive: true });

  const ro = new win.ResizeObserver(() => {
    if (first || destroyed) return;
    const wasFit = camera.s <= camera.fit + 0.001;
    const [fx0, fy0] = camera.freeCenter();
    const [wx, wy] = camera.toWorld(fx0, fy0);
    camera.measure();
    const lv = camera.levels();
    const s = wasFit ? camera.defaultScale() : Math.max(lv[0], Math.min(lv[lv.length - 1], camera.s));
    camera.layout(s);
    camera.centerOn(wx, wy);
  });
  ro.observe(root);
  const io = win.IntersectionObserver ? new win.IntersectionObserver((list) => {
    for (const e of list) root.toggleAttribute('data-hors-vue', !e.isIntersecting);
  }) : null;
  io?.observe(root);
  const onVis = () => root.toggleAttribute('data-cache', doc.hidden);
  doc.addEventListener('visibilitychange', onVis);

  // ---------------------------------------------------------------------------- jeu des événements
  const ctx = {
    t, fx, camera, scene, bus, root, win, doc, dusk, stars, tileFlashes, flashOf, veilOf, mists, grounds, groups, plaqueEls,
    say, apply: (opts) => apply(shown, opts), entitiesFor: () => entitiesFor(shown, tasks),
    get shown() { return shown; }, get target() { return target; }, get tasks() { return tasks; },
    get reduced() { return reduced; },
    setSectorAttr, setLit, tiles, updatePlaque, reveal, sectorPoint,
    sectorName,
    onImpact(ev) { options.onImpact?.(ev); bus.emit('impact', ev); },
    setActive,
    threadFrom: null,
    objName,
    // semaine 3 : Front de givre, Avis, bouton de saut
    frontHost, frontMove, frontShift,
    avisName: (aid) => avisName(t, aid), avisWhen: (n) => avisWhen(t, n),
    onStep: placeSkip,
  };

  function originFrom(from) {
    const R = root.getBoundingClientRect();
    if (Array.isArray(from)) return [from[0] - R.left, from[1] - R.top];
    if (from && typeof from.getBoundingClientRect === 'function') {
      const r = from.getBoundingClientRect();
      return [r.left + r.width / 2 - R.left, r.top + r.height / 2 - R.top];
    }
    if (win.innerWidth - R.right > 120) return [camera.W - 6, camera.H * 0.42]; // colonne de quêtes à droite
    return [camera.W / 2, camera.H - camera.bottom + 18]; // feuille de quêtes en bas
  }

  async function runPlay(list, opts) {
    queued--;
    if (destroyed) return;
    if (!shown) { applyPending(); return; }
    playing++;
    root.dataset.joue = '1';
    root.dataset.ambient = 'on';
    skipBtn.hidden = false;
    placeSkip();
    win.setTimeout(placeSkip, 320); // un panneau qui s'ouvre en glissant peut le recouvrir après coup
    clearVeille();
    fx.reset();
    if (pending) { tasks = pending.tasks; target = derive(pending); }
    ctx.threadFrom = () => originFrom(opts.from ?? options.threadFrom?.());
    try {
      await playEvents(ctx, list);
    } catch (err) {
      console.error(err);
    } finally {
      playing--;
      fx.reset();
      if (!playing) {
        skipBtn.hidden = true;
        delete root.dataset.joue;
        const veille = shown?.veille;
        if (pending) { target = derive(pending); if (veille) target.veille = true; }
        if (target) { shown = cloneView(target); apply(shown); }
        if (veille) root.dataset.veille = '1';
        wake();
        bus.emit('played', list);
      }
    }
  }

  // ---------------------------------------------------------------------------- interface publique
  const api = {
    /** Mémorise le nouvel état ; l'applique au prochain micro-temps, ou à la fin des animations en cours. */
    render(game, taskList = []) {
      if (destroyed) return;
      pending = { game, tasks: Array.isArray(taskList) ? taskList : [] };
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (!playing && !queued) applyPending();
      });
    },
    /** Joue les événements dans l'ordre. Renvoie une promesse résolue à la fin (ou après un saut). */
    play(events, opts = {}) {
      if (destroyed) return Promise.resolve();
      const list = Array.isArray(events) ? events.filter((e) => e && typeof e === 'object') : [];
      queued++;
      const run = chain.then(() => runPlay(list, opts));
      chain = run.catch(() => {});
      return run;
    },
    /** true : mouvement réduit ; false : complet ; null : suivre le système et <html data-motion>. */
    setReducedMotion(v) { forced = v === null || v === undefined ? null : !!v; syncMotion(); },
    focusSector,
    /** Termine les animations en cours en 150 ms au plus. */
    skip,
    /** Écoute : 'impact' (gain arrivé), 'select', 'harvest' ({ plotId }), 'render', 'played'. Renvoie la fonction de retrait. */
    on: (type, fn) => bus.on(type, fn),
    get playing() { return playing > 0 || queued > 0; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      fx.skip();
      ticker.stop();
      win.clearTimeout(ambientTimer);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('pointerdown', onPointerDown);
      win.removeEventListener('pointermove', onPointerMove);
      win.removeEventListener('pointerup', onPointerUp);
      win.removeEventListener('pointercancel', onPointerUp);
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('scroll', onScroll);
      doc.removeEventListener('visibilitychange', onVis);
      mq?.removeEventListener?.('change', syncMotion);
      motionObs.disconnect();
      ro.disconnect();
      io?.disconnect();
      camera.destroy();
      scene.clear();
      bus.clear();
      root.remove();
    },
  };
  return api;
}
