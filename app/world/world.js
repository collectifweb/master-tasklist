// L'île de l'Orée, en DOM et SVG, sans dépendance.
//
//   const world = createWorld(conteneur, { texts, anchors, announce, onImpact, onSelect, threadFrom, now });
//   world.render(game, tasks, ledger); // met à jour ce qui a changé (différence par identifiant) ; ledger : cultures
//   world.play(events);          // joue les événements du cœur, dans l'ordre ; sautables
//   world.setReducedMotion(true | false | null);  // null : suivre le système et <html data-motion>
//   world.setEconomie(true | false); // économie de batterie (options.economie au départ) : l'île ne vit que 9 s après un geste
//   world.focusSector('champs'); // cadre un quartier
//   world.focusEntity('chalet-2'); // cadre un objet (bâtiment, emplacement, repère), quai compris, et le nomme
//   world.clearSelection();      // retire la sélection (feuille de l'objet fermée)
//   world.setQuestsShown(false); // le panneau des quêtes est caché (bouton « Quêtes » : aria-expanded)
//   world.thumbType('serre');    // dessin d'un bâtiment debout (catalogue « Construire »)
//   world.destroy();
//
// Commandes de la carte (colonne en bas à droite) : « Construire », « Quêtes », « Vue ». « Vue » déplie vers la gauche
// Rapprocher, Éloigner, Toute l'île et Carte en liste. options.controls = { build, quests, plan } : ce que l'hôte fait
// de « Construire », « Quêtes » et « Carte en liste » ; options.panelId : l'élément que « Quêtes » montre ou cache.
// La colonne se pose au-dessus de --world-ctl-bottom (le vrai haut du panneau, posé par l'hôte).
//
// Appeler render(game, tasks) PUIS play(events) dans la même tâche (ou play d'abord) : le nouvel état
// est retenu pendant que les animations le dévoilent, puis appliqué en entier à la fin.
// Ici, « secteur » désigne la zone de carte d'un quartier (identifiants de core/domains.js : champs, atelier…).
//
// onSelect(info) — un toucher (ou Entrée) sur la carte. Formes de `info` :
//   { type: 'sector', id, sector }                           plaque de quartier (id = sector)
//   { type: 'landmark', id, sector, model }                  repère fixe (lanterne, établi, clôture, convoi…)
//   { type: 'batiment', id, sector, model, batiment }        bâtiment ou emplacement (chalet-1, parcelle-2…) ; batiment = son type
//   { type: 'object', id, sector, model, taskId }            caisse d'échéance (taskId) ou Fanal (taskId null)
//
// Événements que play() sait jouer (un type inconnu est ignoré) : reward, quartier-monte, reflet, veille, etape.
import { P, f } from './iso.js';
import { ensurePalette, BASE } from './palette.js';
import {
  SECTOR_ORDER, SECTOR_CENTER, PLAQUE_ANCHOR, LANDMARKS, DECOR, CRATE_SPOTS, AVIS_EDGE, FANAL_HOME, sectorAt, EMPLACEMENTS,
  IMPREVU_SPOTS,
} from './layout.js';
import { deriveView } from './view.js';
import { terrainSVG, TERRAIN, BOUNDS, frontSVG, edgeNormal, D } from './terrain.js';
import { Scene } from './scene.js';
import { artFor, QUAI_MARCHAND_H, QUAI_BATEAU_W } from './models.js';
import { createTicker, createBus } from './ticker.js';
import { promeneurs, trajet } from './habitants.js';
import { Camera, NEAR_SCALE } from './camera.js';
import { Fx } from './fx.js';
import { makeTexts, batimentNom, batimentEtat } from './texts.js';
import { playEvents, cloneView } from './moments.js';

export { createWorldPlan } from './plan.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const LIGHT = { lanterne: 'lantern', etabli: 'lamp', chalet: 'window', grenier: 'window' };
const HORIZON_Y = -128; // ligne d'horizon (px monde), derrière les arbres du fond
const HAB_MS = 250; // l'île vivante : profondeur des habitants recopiée quatre fois par seconde (scene.habDepths)
const AMBIENT_MS = 9000; // en économie de batterie, l'île respire quelques secondes après chaque activité, puis s'immobilise
const FRONT_FAR = 1.8; // recul du front de givre à l'annonce d'une tempête (cases), jusqu'au rivage le jour même
let uid = 0;

/** Pictos de quartier : les mêmes tracés que design/icons.svg (grille de 24, trait arrondi, currentColor). */
export const SECTOR_GLYPH = {
  place: 'M4 10.4c3.4-.6 6.4-2.6 8-6.2 1.6 3.6 4.6 5.6 8 6.2zM12 4.2V2.6M6 10.4v7.4M12 10.4v7.4M18 10.4v7.4M4 17.8h16M5 20.2h14',
  champs: 'M12 20V12M12 12c-3.4 0-5.6-2.2-5.6-5.6 3.4 0 5.6 2.2 5.6 5.6zm0 0c0-3.4 2.2-5.6 5.6-5.6 0 3.4-2.2 5.6-5.6 5.6zM4 20h16',
  atelier: 'M5.5 4.5h9.8l2.9 3.4H5.5zM10.6 7.9v12.6M8.4 20.5h4.4',
  mairie: 'M3.5 20.2h17M4.8 18h14.4M4.6 10 12 6.2l7.4 3.8zM7.2 10v8M10.4 10v8M13.6 10v8M16.8 10v8M12 6.2V2.6l3.6 1.3L12 5.2',
  ecole: 'M3.5 20.2h17M3.8 12.6 12 7.4l8.2 5.2M5.4 11.6v8.6M18.6 11.6v8.6M10.2 20.2v-4.6h3.6v4.6M9.6 4.6 12 2.8l2.4 1.8M10.2 4.6v3.6M13.8 4.6v3.6',
  garage: 'M3 20.2h18M3 10.4 12 5.2l9 5.2M4.8 9.4v10.8M19.2 9.4v10.8M7.4 20.2v-7.6h9.2v7.6M7.4 15.2h9.2M7.4 17.7h9.2',
};

/** Pictos des commandes de la carte (même grille et même trait que les pictos de quartier). */
const CTL_GLYPH = {
  construire: 'M6 20.5V4M18 20.5V4M6 8h12M6 14h12M6 8l12 6M3.5 20.5h17', // échafaudage : le même que le geste « Bâtir »
  quetes: 'M11 6.5h9M11 12h9M11 17.5h9M3.8 6.4l1.6 1.6 2.8-3M3.8 12l1.6 1.6 2.8-3M7.9 17.5a1.9 1.9 0 1 1-3.8 0 1.9 1.9 0 0 1 3.8 0',
  vue: 'M2.5 12s3.5-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.5 6.2-9.5 6.2S2.5 12 2.5 12zM14.8 12a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0',
  plan: 'M9.5 6.5h10.5M9.5 12h10.5M9.5 17.5h10.5M5.4 6.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0M5.4 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0M5.4 17.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0',
  in: 'M12 5v14M5 12h14',
  out: 'M5 12h14',
  fit: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
};

function glyph(id, cls = '') {
  return `<svg class="ow-glyph ${cls}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${SECTOR_GLYPH[id] || ''}"/></svg>`;
}

function el(tag, cls, attrs = {}) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// ----------------------------------------------------------------------------- entités voulues
export function entitiesFor(v, tasks = []) {
  const list = [];
  for (const L of LANDMARKS) {
    const e = { ...L, landmark: true, interactive: true, light: LIGHT[L.model] ?? null, allume: false };
    if (e.light) e.allume = !!v.veille; // lanternes, fenêtres et lampe s'allument quand tout est enregistré
    if (v.reflets?.has?.(L.id)) e.reluit = true;
    list.push(e);
  }
  // bâtiments du joueur, un par emplacement : debout, ou chalet vide, atelier abîmé, vieux quai, piquets d'un chantier
  for (const b of v.batiments || []) {
    const slot = EMPLACEMENTS[b.type][Number(b.id.slice(b.type.length + 1)) - 1];
    const lac = slot.lac ? D / 32 : 0; // au niveau de l'eau : décalé d'autant que le socle est épais
    const e = {
      id: b.id, sector: slot.sector || sectorAt(Math.floor(slot.r), Math.floor(slot.c)),
      r: slot.r + lac, c: slot.c + lac, h: slot.h, w: slot.w, interactive: true, batiment: b, light: null, allume: false,
    };
    if (b.type === 'chalet') Object.assign(e, { model: 'chalet', variant: !b.bati ? 'vide' : b.occupants ? 'habite' : '' });
    else if (b.type === 'atelier') Object.assign(e, { model: 'atelier', variant: b.bati ? '' : 'abime' });
    // le marchand amarré : son chaland est dessiné avec le quai, dont l'emprise s'allonge vers le large pour le toucher ;
    // le visiteur à commande (lot C) : son bateau dans le prolongement du chaland, l'emprise s'élargit d'autant
    else if (b.type === 'quai') {
      const variant = !b.bati ? 'vieux' : b.visiteur ? ['marchand', b.commande?.id, b.commande?.livree ? 'livree' : ''].filter(Boolean).join('+') : '';
      Object.assign(e, { model: 'quai', variant }, b.visiteur ? { h: QUAI_MARCHAND_H } : {}, b.bati && b.commande ? { w: QUAI_BATEAU_W } : {});
    }
    else if (!b.bati) Object.assign(e, { model: 'piquets', variant: `${slot.w}x${slot.h}` });
    else Object.assign(e, { model: b.type, variant: b.etat === 'bati' ? '' : b.etat });
    if (b.bati && LIGHT[e.model] && (b.type !== 'chalet' || b.occupants)) { e.light = LIGHT[e.model]; e.allume = !!v.veille; }
    if (b.degat) e.degat = b.degat.type; // éolienne en panne, parcelle visitée par l'ours ou gelée : dessin et marque braise
    if (v.reflets?.has?.(b.id)) e.reluit = true;
    list.push(e);
  }
  for (const d of DECOR) list.push(d);
  // imprévus heureux du jour : orignal, caisse de poissons, pile de bois (décor, rien à toucher ; l'aurore est dans le ciel)
  for (const id of v.imprevus || []) {
    const s = IMPREVU_SPOTS[id];
    if (s) list.push({ id: `imprevu-${id}`, sector: sectorAt(Math.floor(s.r), Math.floor(s.c)), ...s });
  }
  v.crates.forEach((cr, i) => {
    const [u, vv] = CRATE_SPOTS[i];
    const task = tasks.find((t) => t && t.id === cr.taskId);
    list.push({ id: cr.id, model: 'caisse', sector: sectorAt(Math.floor(vv), Math.floor(u)), r: vv - 0.5, c: u - 0.5, seed: i + 2, interactive: true, crate: cr, title: task ? String(task.task ?? '') : '', reluit: v.reflets?.has?.(`caisse:${i}`) || false });
  });
  // Fanal sur la Place
  const fanal = { id: 'fanal', kind: 'char', who: 'fanal', sector: 'place', u: FANAL_HOME[0], v: FANAL_HOME[1], interactive: true, light: 'fanal', allume: true };
  list.push(fanal);
  // habitants au travail (lot E) : posés à leur poste ; leur trajet est une animation, allumée avec l'ambiance
  for (const p of promeneurs(v)) {
    const [u, vv] = p.chemin.at(-1);
    const n = Number(p.id.slice('habitant-'.length)) - 1;
    list.push({ id: p.id, kind: 'hab', sector: sectorAt(Math.floor(vv), Math.floor(u)), u, v: vv, n, outil: OUTIL[p.lieu.split('-')[0]] ?? '', trajet: trajet(p), decalage: p.decalage });
  }
  return list;
}
/** Outil que porte un habitant, selon son lieu de travail (dessins : habitantSVG, world/models.js). */
const OUTIL = { parcelle: 'panier', serre: 'arrosoir', atelier: 'marteau', grenier: 'sac' };

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

// ----------------------------------------------------------------------------- aurore boréale (lot I)
// Imprévu heureux : des rubans verts dans le ciel, au-dessus du fond de l'île (px monde, le coin du fond est en 0, 0), le
// jour où elle passe. Trois rideaux à lisière ondulée, ourlet clair et stries ; ils ondulent seulement avec le mouvement
// d'ambiance (world.css), jamais en mouvement réduit. Sous les objets : les arbres du fond passent devant leur ourlet.
const AURORE = { x: -300, y: -150, w: 600, h: 130 };
function auroreSVG(n) {
  // trois rideaux effilés : chaque bord du bas (le plus clair) rejoint son bord du haut aux deux bouts, sans flanc
  // vertical ; les rais du grand rideau sont découpés à sa forme
  const g = `ow-aur-${n}`, c = `ow-aur-c-${n}`;
  const r1 = 'M30,98C110,72 200,110 300,92S480,62 570,82C540,52 470,28 390,36S230,40 150,42S62,64 30,98Z';
  const r2 = 'M24,60C80,42 150,60 232,40C208,20 150,8 100,14S44,38 24,60Z';
  const r3 = 'M372,52C430,38 510,54 588,30C560,12 492,2 442,10S392,32 372,52Z';
  const streaks = Array.from({ length: 14 }, (_, k) => {
    const x = 70 + k * 34, bas = 104 - Math.round(Math.sin(k * 1.3) * 6), haut = 30 + Math.round(Math.cos(k * 0.9) * 8);
    return `M${x},${bas}V${haut}`;
  }).join('');
  return `<svg viewBox="0 0 ${AURORE.w} ${AURORE.h}" width="${AURORE.w}" height="${AURORE.h}" aria-hidden="true" focusable="false">`
    + `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ow-aur-a" stop-opacity="0"/><stop offset=".6" class="ow-aur-a" stop-opacity=".3"/><stop offset="1" class="ow-aur-b" stop-opacity=".62"/></linearGradient>`
    + `<clipPath id="${c}"><path d="${r1}"/></clipPath></defs>`
    + `<g class="ow-aurore-r r2"><path d="${r2}" fill="url(#${g})"/><path d="M24,60C80,42 150,60 232,40" class="ow-aur-hem"/></g>`
    + `<g class="ow-aurore-r r3"><path d="${r3}" fill="url(#${g})"/><path d="M372,52C430,38 510,54 588,30" class="ow-aur-hem"/></g>`
    + `<g class="ow-aurore-r r1"><path d="${r1}" fill="url(#${g})"/><path d="${streaks}" class="ow-aur-streak" clip-path="url(#${c})"/>`
    + `<path d="M30,98C110,72 200,110 300,92S480,62 570,82" class="ow-aur-hem"/></g></svg>`;
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
  // front de givre : la tempête annoncée (lot H) ; caché tant qu'aucune ne l'est
  veils.innerHTML = '<g class="ow-front" hidden><g class="ow-front-move"></g></g>';
  const frontHost = veils.querySelector('.ow-front');
  const frontMove = frontHost.firstElementChild;

  const fxg = el('div', 'ow-fxg', { 'aria-hidden': 'true' });
  const aurore = el('div', 'ow-aurore', { 'aria-hidden': 'true' });
  aurore.hidden = true;
  aurore.innerHTML = auroreSVG(id);
  Object.assign(aurore.style, { left: AURORE.x + 'px', top: AURORE.y + 'px' });

  const shadows = el('div', 'ow-shadows', { 'aria-hidden': 'true' });
  const ents = el('div', 'ow-ents-root');
  const groups = {};
  for (const s of SECTOR_ORDER) { groups[s] = el('div', 'ow-ents', { 'data-sector': s }); ents.appendChild(groups[s]); }
  const dusk = el('div', 'ow-dusk', { 'aria-hidden': 'true' });
  const stars = el('div', 'ow-stars', { 'aria-hidden': 'true' });
  for (let k = 0; k < 9; k++) {
    const s = el('i', 'ow-nightstar');
    s.style.transform = `translate(${f(-380 + ((k * 97) % 760))}px, ${f(HORIZON_Y - 40 - ((k * 53) % 90))}px)`;
    stars.appendChild(s);
  }
  const lights = el('div', 'ow-lights', { 'aria-hidden': 'true' });
  const fxw = el('div', 'ow-fxw', { 'aria-hidden': 'true' });
  stage.append(terrainHost, aurore, veils, fxg, shadows, ents, dusk, stars, lights, fxw);
  // le décor du terrain est purement visuel : seuls les boutons d'objets sont exposés
  terrainHost.setAttribute('aria-hidden', 'true');

  const plaques = el('div', 'ow-plaques');
  const tag = el('div', 'ow-tag', { 'aria-hidden': 'true' });
  tag.hidden = true;
  content.append(far, sky, stage, plaques, tag);
  scroller.append(content);

  const fxv = el('div', 'ow-fxv', { 'aria-hidden': 'true' });
  // colonne des commandes : Construire, Quêtes, Vue ; « Vue » déplie vers la gauche la rangée du cadrage
  const ctl = options.controls || {};
  const zoom = el('div', 'ow-zoom', { role: 'group', 'aria-label': t('monde.ctl.group') });
  const zbtn = (attrs, label, d) => {
    const b = el('button', 'ow-zbtn', { type: 'button', ...attrs, 'aria-label': label, title: label });
    b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
    return b;
  };
  const rowId = `ow-vue-${id}`;
  const bBuild = zbtn({ 'data-ow': 'build', 'aria-haspopup': 'dialog' }, t('monde.ctl.construire'), CTL_GLYPH.construire);
  const bQuests = zbtn({ 'data-ow': 'quetes', 'aria-expanded': 'true', ...(options.panelId ? { 'aria-controls': options.panelId } : {}) }, t('monde.ctl.quetes'), CTL_GLYPH.quetes);
  const bView = zbtn({ 'data-ow': 'vue', 'aria-expanded': 'false', 'aria-controls': rowId }, t('monde.ctl.vue'), CTL_GLYPH.vue);
  const row = el('div', 'ow-zrow', { id: rowId, role: 'group', 'aria-label': t('monde.zoom.group') });
  row.hidden = true;
  const zIn = zbtn({ 'data-zoom': 'in' }, t('monde.zoom.in'), CTL_GLYPH.in);
  const zOut = zbtn({ 'data-zoom': 'out' }, t('monde.zoom.out'), CTL_GLYPH.out);
  const zFit = zbtn({ 'data-zoom': 'fit' }, t('monde.zoom.fit'), CTL_GLYPH.fit);
  const bPlan = zbtn({ 'data-ow': 'plan', 'aria-haspopup': 'dialog' }, t('monde.ctl.plan'), CTL_GLYPH.plan);
  row.append(zIn, zOut, zFit, bPlan);
  zoom.append(bBuild, bQuests, bView, row);
  // la colonne se pose sur --world-ctl-bottom (haut réel du panneau) : quand il bouge, les plaques s'écartent à nouveau
  const ctlProbe = el('i', 'ow-probe');
  ctlProbe.style.height = 'var(--world-ctl-bottom, 0px)';
  const skipBtn = el('button', 'ow-skip', { type: 'button' });
  skipBtn.textContent = t('a11y.skip_animation');
  skipBtn.hidden = true;
  let live = null;
  if (!options.announce) { live = el('p', 'ow-sr', { role: 'status', 'aria-live': 'polite' }); }
  root.append(scroller, hint, fxv, zoom, skipBtn, ctlProbe);
  if (live) root.append(live);
  container.appendChild(root);

  // ---- moteurs
  const ticker = createTicker(win);
  const bus = createBus();
  const scene = new Scene({ shadows, lights, groups }, { label: labelOf });
  const camera = new Camera({ root, scroller, content, stage, plaques, insets: options.insets, onChange: onLayout });
  const fx = new Fx({ camera, ticker, layers: { view: fxv, world: fxw, ground: fxg } });


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
  // « Économie de batterie » (Réglages, lot E) : sans elle, l'île reste vivante tant qu'elle est à l'écran (l'onglet
  // caché, l'île hors de l'écran et le mouvement réduit la figent toujours, world.css) ; avec elle, comme avant le lot E
  let economie = !!options.economie;
  let suppressClick = false;
  const plaqueEls = {};
  const plaqueLast = {};

  // ---------------------------------------------------------------------------- textes accessibles
  function sectorName(s) { return t(`quartier.${s}.name`); }
  function objName(e) {
    if (e.kind === 'char') return t(`monde.obj.${e.who}`);
    if (e.batiment) return `${batimentNom(t, e.batiment)}, ${batimentEtat(t, e.batiment)}`;
    if (e.crate) {
      const d = e.crate.days;
      const when = d < 0 ? t('monde.crate.passed') : d === 0 ? t('monde.crate.today') : t('monde.crate.days', { n: d });
      return `${t('monde.obj.caisse')}${e.title ? ` : ${e.title}` : ''}, ${when}`;
    }
    if (e.landmark && t.has(`monde.obj.${e.id}`)) return t(`monde.obj.${e.id}`); // repère qui porte son propre nom
    return t(`monde.obj.${e.model}`);
  }
  function labelOf(e) { return t('monde.select.object', { objet: objName(e), au_secteur: t(`quartier.${e.sector}.in`) }); }

  function say(text) {
    if (!text) return;
    if (options.announce) { options.announce(text); return; }
    live.textContent = '';
    win.setTimeout(() => { if (!destroyed) live.textContent = text; }, 60);
  }

  // ---------------------------------------------------------------------------- application d'une vue
  // ---- front de givre (lot H) : posé au rivage du bord visé, reculé selon le temps qui reste avant la tempête (v.avis).
  // Il avance d'un jour à l'autre (transition --t-day), jamais au repos.
  let frontSector = null;
  function frontShift(progress, extra = 0) {
    const [nx, ny] = edgeNormal(AVIS_EDGE[frontSector]);
    const d = FRONT_FAR * (1 - Math.max(0, Math.min(1, progress))) + extra;
    return `translate(${f(nx * d)}px, ${f(ny * d)}px)`;
  }
  function applyFront(v) {
    const a = v.avis;
    const s = a && AVIS_EDGE[a.sector] ? a.sector : null;
    if (!s) {
      if (!frontHost.hasAttribute('hidden')) frontHost.setAttribute('hidden', '');
      return;
    }
    if (frontSector !== s) { frontSector = s; frontMove.innerHTML = frontSVG(AVIS_EDGE[s]); frontHost.dataset.sector = s; }
    if (frontHost.hasAttribute('hidden')) frontHost.removeAttribute('hidden');
    const tr = frontShift(a.progress);
    if (frontMove.style.transform !== tr) frontMove.style.transform = tr;
  }

  // ---- plaques de quartier : « Champs · niv. 2 » (niveau acheté, game.niveaux)
  function plaqueModel(sv) {
    const name = sectorName(sv.id);
    return {
      name,
      line: t('monde.niveau.court', { n: sv.niveau }),
      niveau: sv.niveau,
      label: t('monde.plaque.label', { quartier: name, n: sv.niveau }),
    };
  }
  function makePlaque(s) {
    const b = el('button', 'ow-plaque', { type: 'button', 'data-sector': s, tabindex: '-1' });
    b.innerHTML = `<span class="ow-plaque-icon" aria-hidden="true">${glyph(s)}</span><span class="ow-plaque-text" aria-hidden="true"><span class="ow-plaque-name"></span><span class="ow-plaque-line"><span class="ow-plaque-sep">·</span><span class="ow-plaque-val num"></span></span></span>`;
    plaques.appendChild(b);
    plaqueEls[s] = b;
    return b;
  }
  function updatePlaque(sv) {
    const b = plaqueEls[sv.id] || makePlaque(sv.id);
    const m = plaqueModel(sv);
    const key = JSON.stringify(m);
    if (plaqueLast[sv.id] === key) return false;
    const prev = plaqueLast[sv.id] ? JSON.parse(plaqueLast[sv.id]) : null;
    plaqueLast[sv.id] = key;
    b.dataset.niveau = String(m.niveau);
    b.setAttribute('aria-label', m.label);
    b.querySelector('.ow-plaque-name').textContent = m.name;
    b.querySelector('.ow-plaque-val').textContent = m.line;
    // le texte change de longueur : la plaque se remesure et se replace (sinon elle déborde sous la colonne de zoom)
    if (!first && prev && (prev.line !== m.line || prev.name !== m.name)) {
      plaqueSize[sv.id] = [b.offsetWidth, b.offsetHeight];
      placePlaques();
    }
    return true;
  }
  function applyPlaques(v) {
    let changed = false;
    for (const s of SECTOR_ORDER) changed = updatePlaque(v.sectors[s]) || changed;
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
  // la colonne des commandes (rangée « Vue » dépliée comprise) ni hors de l'écran (elles se rangent alors au bord).
  const plaqueSize = {};
  let zoomBox = null; // colonne : [gauche, haut, droite, bas] en coordonnées de vue, jusqu'au bord droit
  let rowBox = null;  // rangée « Vue » dépliée, ou null
  function measurePlaques() {
    for (const s of SECTOR_ORDER) if (plaqueEls[s]) plaqueSize[s] = [plaqueEls[s].offsetWidth, plaqueEls[s].offsetHeight];
  }
  /** Boîtes réelles de la colonne et de la rangée dépliée, avec une marge : deux obstacles, pas leur union. */
  function measureZoom() {
    const R = root.getBoundingClientRect(), m = 6;
    const c = zoom.getBoundingClientRect();
    zoomBox = [c.left - R.left - m, c.top - R.top - m, camera.W, c.bottom - R.top + m];
    const r = row.hidden ? null : row.getBoundingClientRect();
    rowBox = r ? [r.left - R.left - m, r.top - R.top - m, r.right - R.left + m, r.bottom - R.top + m] : null;
  }
  function relayoutControls() {
    if (first || destroyed) return;
    measureZoom();
    placePlaques();
    placeTag();
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
      const hit = (z) => vl + w > z[0] && vl < z[2] && vt + h > z[1] && vt < z[3];
      const z = zoomBox;
      if (hit(z)) {
        // à gauche de la colonne si elle y tient entière, sinon au-dessus d'elle
        if (z[0] - w >= m) vl = z[0] - w;
        else vt = Math.max(camera.top + m, z[1] - h);
      }
      // rangée « Vue » dépliée : la plaque remonte juste au-dessus d'elle, sans changer de côté
      if (rowBox && hit(rowBox)) vt = Math.max(camera.top + m, rowBox[1] - h);
      b.style.transform = `translate(${f(vl + camera.sx)}px, ${f(vt + camera.sy)}px)`;
    }
  }

  function apply(v, { quiet = false, enter = true } = {}) {
    if (root.hasAttribute('data-neige') !== !!v.neige) root.toggleAttribute('data-neige', !!v.neige); // l'hiver : palette.js
    applyFront(v);
    const aur = !v.imprevus?.has?.('aurore');
    if (aurore.hidden !== aur) aurore.hidden = aur;
    applyPlaques(v);
    const res = scene.sync(entitiesFor(v, tasks), { quiet });
    if (!habTimer) scene.habDepths(); // île immobile : une figurine neuve ou un trajet changé reste à la bonne profondeur
    if (!quiet && enter) {
      for (const eid of res.added) {
        const n = scene.get(eid);
        if (n) fx.anim(n.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
      }
    }
    if (selected && !scene.get(selected)) select(null);
    else syncTag();
    syncRoving();
    return res;
  }

  function derive(p) { return deriveView(p.game, p.tasks, { now: nowOf(), anchors: options.anchors, ledger: p.ledger }); }

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
    // aux limites, aria-disabled plutôt que disabled : le bouton garde le focus et reste lu
    const lv = camera.levels();
    limit(zOut, camera.s <= lv[0] + 0.001);
    limit(zIn, camera.s >= lv[lv.length - 1] - 0.001);
  }
  function limit(b, on) {
    if ((b.getAttribute('aria-disabled') === 'true') === on) return;
    if (on) b.setAttribute('aria-disabled', 'true');
    else b.removeAttribute('aria-disabled');
  }

  function defaultActive() { return active || 'place'; }
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

  /** Cadre un objet de la carte (bâtiment ou emplacement, quai compris) au centre de la zone libre, et le nomme
   *  (sélection et étiquette, retirées comme les autres : Échap, toucher à côté, clearSelection()). */
  function focusEntity(eid) {
    if (destroyed) return;
    const p = scene.pointOf(eid);
    if (!p) return;
    setActive(scene.get(eid).e.sector);
    if (camera.s < NEAR_SCALE - 0.001) camera.setScale(NEAR_SCALE);
    camera.centerOn(p[0], p[1], !reduced);
    select(eid);
    wake();
  }

  // ---------------------------------------------------------------------------- commandes de la carte
  function setRow(open) {
    if (row.hidden === !open) return;
    if (!open && row.contains(doc.activeElement)) bView.focus({ preventScroll: true });
    row.hidden = !open;
    bView.setAttribute('aria-expanded', String(open));
    relayoutControls();
  }
  function control(kind) {
    if (kind === 'vue') setRow(row.hidden);
    else if (kind === 'build') ctl.build?.();
    else if (kind === 'quetes') ctl.quests?.();
    else if (kind === 'plan') {
      // la rangée se replie et le focus revient sur « Vue » : la carte en liste le rendra à « Vue » en se fermant
      bView.focus({ preventScroll: true });
      setRow(false);
      ctl.plan?.();
    }
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
  /** L'objet sélectionné a pu changer (caisse dont l'échéance approche, Fanal au travail) : l'étiquette suit. */
  function syncTag() {
    if (!selected || tag.hidden) return;
    const text = objName(scene.get(selected).e);
    if (tag.textContent !== text) tag.textContent = text;
    placeTag();
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
  // Il ne se pose jamais sur la colonne des commandes (téléphone couché : elle monte jusque sous le bandeau) : il passe
  // alors juste au-dessus d'elle.
  function placeSkip() {
    if (skipBtn.hidden || destroyed) return;
    const h = skipBtn.offsetHeight || 44;
    const R = root.getBoundingClientRect();
    const ctls = [zoom, row].filter((n) => !n.hidden).map((n) => n.getBoundingClientRect());
    const colTop = Math.min(...ctls.map((c) => c.top)) - R.top;
    for (const top of [camera.top + 8, colTop - h - 8, camera.top - h, 8]) {
      skipBtn.style.top = f(Math.max(0, top)) + 'px';
      const r = skipBtn.getBoundingClientRect();
      if (ctls.some((c) => r.right > c.left && r.left < c.right && r.bottom > c.top - 4 && r.top < c.bottom)) continue;
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
    syncHab();
    win.clearTimeout(ambientTimer);
    if (!economie) return;
    ambientTimer = win.setTimeout(() => { if (!destroyed && !playing) { root.dataset.ambient = 'off'; syncHab(); } }, ms);
  }
  // Profondeur des habitants : minuterie tant que leurs animations tournent (île vivante, hors mouvement réduit, onglet
  // caché ou île hors de l'écran ; pas d'image demandée), arrêtée sinon. À l'arrêt, un dernier passage cale chaque
  // figurine où elle s'est arrêtée (ou à son poste, en mouvement réduit) ; au départ, un premier passage la recale.
  let habTimer = 0;
  function syncHab() {
    const vit = !destroyed && !reduced && root.dataset.ambient === 'on' && !root.hasAttribute('data-cache') && !root.hasAttribute('data-hors-vue');
    if (vit === !!habTimer) return;
    if (vit) habTimer = win.setInterval(() => scene.habDepths(), HAB_MS);
    else { win.clearInterval(habTimer); habTimer = 0; }
    if (!destroyed) scene.habDepths();
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
    syncHab();
    if (!habTimer) scene.habDepths(); // île immobile : chaque figurine à son poste (réduit) ou là où elle s'est arrêtée
  }
  syncMotion();
  mq?.addEventListener?.('change', syncMotion);
  const motionObs = new win.MutationObserver(syncMotion);
  motionObs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-motion'] });

  // ---------------------------------------------------------------------------- événements
  function skip() { if (playing || queued) fx.skip(); }

  function onClick(ev) {
    if (suppressClick) { suppressClick = false; ev.preventDefault(); return; }
    // commandes de la carte : avant le zoom et avant la garde des animations (elles restent utilisables)
    const c = ev.target.closest('[data-ow]');
    if (c) { control(c.dataset.ow); return; }
    const z = ev.target.closest('[data-zoom]');
    if (z) { if (z.getAttribute('aria-disabled') !== 'true') zoomTo(z.dataset.zoom); return; }
    if (ev.target.closest('.ow-skip')) { skip(); return; }
    if (playing) return;
    clearVeille();
    const pl = ev.target.closest('.ow-plaque');
    if (pl) {
      const s = pl.dataset.sector;
      rovingTo(pl);
      focusSector(s);
      options.onSelect?.({ type: 'sector', id: s, sector: s });
      bus.emit('select', { type: 'sector', id: s, sector: s });
      return;
    }
    const b = ev.target.closest('.ow-ent.is-btn');
    if (b) {
      const n = scene.get(b.dataset.id);
      rovingTo(b);
      // chaque toucher ouvre la feuille, même sur l'objet déjà sélectionné ; la sélection part par Échap,
      // un toucher à côté ou clearSelection() (feuille fermée)
      select(b.dataset.id);
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
    if (e.landmark) return { type: 'landmark', id: e.id, sector: e.sector, model: e.model };
    if (e.batiment) return { type: 'batiment', id: e.id, sector: e.sector, model: e.model, batiment: e.batiment.type };
    return { type: 'object', id: e.id, sector: e.sector, model: e.kind === 'char' ? e.who : e.model, taskId: e.crate?.taskId ?? null };
  }
  function rovingTo(n) {
    for (const x of rovingItems()) if (x !== n && x.tabIndex === 0) x.tabIndex = -1;
    n.tabIndex = 0;
    rovingId = n.dataset.id || n.dataset.sector;
  }

  function onKey(ev) {
    if (ev.key === 'Escape') {
      // Échap dans la colonne, rangée « Vue » dépliée : elle se replie et le focus revient sur « Vue »
      if (!row.hidden && zoom.contains(doc.activeElement)) { setRow(false); bView.focus({ preventScroll: true }); ev.preventDefault(); return; }
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
  function onPointerDown(ev) {
    if (!row.hidden && !ev.target.closest('.ow-zoom')) setRow(false); // un toucher sur la carte replie la rangée « Vue »
    if (playing || queued) { skip(); }
    clearVeille();
    wake();
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
  // les zones couvertes changent sans que la carte change de taille (panneau caché, bandeau) : la caméra se recentre
  ro.observe(camera.probeTop);
  ro.observe(camera.probeBottom);
  const ctlRo = new win.ResizeObserver(relayoutControls);
  ctlRo.observe(ctlProbe);
  const io =win.IntersectionObserver ? new win.IntersectionObserver((list) => {
    for (const e of list) root.toggleAttribute('data-hors-vue', !e.isIntersecting);
    syncHab();
  }) : null;
  io?.observe(root);
  const onVis = () => { root.toggleAttribute('data-cache', doc.hidden); syncHab(); };
  doc.addEventListener('visibilitychange', onVis);

  // ---------------------------------------------------------------------------- jeu des événements
  const ctx = {
    t, fx, camera, scene, root, dusk, stars, plaqueEls,
    say, apply: (opts) => apply(shown, opts),
    get shown() { return shown; }, get target() { return target; }, get tasks() { return tasks; },
    get reduced() { return reduced; },
    updatePlaque, reveal,
    onImpact(ev) { options.onImpact?.(ev); bus.emit('impact', ev); },
    setActive,
    threadFrom: null,
    objName,
    onStep: placeSkip, // le bouton « Passer l'animation » reste touchable à chaque étape
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
    syncHab();
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
    /**
     * Dessin d'un objet de la carte (bâtiment), dans l'état du dernier render() : SVG autonome pour une fiche
     * (matières lues par la classe ow-thumb). Chaîne vide si l'objet n'existe pas.
     */
    thumb(id) {
      if (!pending) return '';
      const e = entitiesFor(derive(pending), pending.tasks).find((x) => x.id === id);
      if (!e || !e.model) return '';
      const a = artFor(e);
      return `<svg class="ow-thumb" viewBox="${a.x} ${a.y} ${a.w} ${a.h}" width="${a.w}" height="${a.h}" focusable="false" aria-hidden="true">${a.svg}</svg>`;
    },
    /** Dessin d'un type de bâtiment debout (catalogue « Construire »), indépendant de l'état du jeu. */
    thumbType(type) {
      const a = artFor({ model: type, variant: '' });
      return `<svg class="ow-thumb" viewBox="${a.x} ${a.y} ${a.w} ${a.h}" width="${a.w}" height="${a.h}" focusable="false" aria-hidden="true">${a.svg}</svg>`;
    },
    /** Mémorise le nouvel état ; l'applique au prochain micro-temps, ou à la fin des animations en cours. */
    render(game, taskList = [], ledger = []) {
      if (destroyed) return;
      pending = { game, tasks: Array.isArray(taskList) ? taskList : [], ledger: Array.isArray(ledger) ? ledger : [] };
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
    /** true : économie de batterie (l'île ne bouge que quelques secondes après un geste) ; false : île vivante. */
    setEconomie(v) { economie = !!v; wake(); },
    get economie() { return economie; },
    focusSector,
    focusEntity,
    /** Le panneau des quêtes est montré (true) ou caché (false) : état du bouton « Quêtes ». */
    setQuestsShown(on) { if (!destroyed) bQuests.setAttribute('aria-expanded', String(!!on)); },
    /** Retire la sélection et son étiquette (par exemple quand la feuille de l'objet se ferme). */
    clearSelection() { if (!destroyed) select(null); },
    /** Termine les animations en cours en 150 ms au plus. */
    skip,
    /** Écoute : 'impact' (gain arrivé), 'select', 'render', 'played'. Renvoie la fonction de retrait. */
    on: (type, fn) => bus.on(type, fn),
    get playing() { return playing > 0 || queued > 0; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      fx.skip();
      ticker.stop();
      win.clearTimeout(ambientTimer);
      win.clearInterval(habTimer);
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
      ctlRo.disconnect();
      io?.disconnect();
      camera.destroy();
      scene.clear();
      bus.clear();
      root.remove();
    },
  };
  return api;
}
