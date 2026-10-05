// Les moments du monde (RECOMMANDATION §7) : chaque événement de core/quests.js devient une étape.
// Une étape sait s'appliquer d'un coup (apply) et se jouer (run). run() fait avancer la vue affichée
// pas à pas et finit dans le même état qu'apply(). En mouvement réduit, chaque moment est un fondu court.
// Pendant un saut, l'étape en cours se termine en 150 ms et les suivantes s'appliquent sans animation.
//
//   1 fil de lumière (reward, fil-libre)      2 germination (cases rallumées, pousse)
//   3 la lisière s'allume (lisiere-allumee)   4 l'objet-reflet reluit (reflet)
//   5 construction (construction)             11 la Lueur en réserve perce la cendre (chapitre, secteur-ouvert)
//   12 l'Orée veille (veille)                 + palier de secteur (secteur-seuil) : vague gris → couleur
//   semaine 3 : 5 aussi pour l'établi, la Tour et les parcelles · 6 récolte (recolte) · semis · brasero · souffler
//   9 le Front de givre arrive (avis-annonce)  10 le matin de l'Avis, rejoué en 8 s (avis-resolu) · voile-leve
//   8 Côte à côte : Fanal va travailler avec toi, puis rentre (seance-debut, seance-fin)
import { P, f, pts } from './iso.js';
import { CELLS, SECTOR_CENTER, SECTOR_ORDER, germCell, LANDMARKS, PLOT_SLOTS, AVIS_EDGE } from './layout.js';
import { tileProgress, nextThreshold, postsFor, ETATS } from './view.js';
import { SECTOR_THRESHOLDS, CROP_STAGES } from '../core/economy.js';
import { sectorOfTask } from '../core/domains.js';
import { daysBetween } from '../core/time.js';
import { cellDiamond, edgeNormal } from './terrain.js';
import { levelKey, fmt } from './texts.js';
import { basketSVG, cropSVG, sealSVG } from './models.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const LANDMARK_IDS = new Set(LANDMARKS.map((l) => l.id));
const CROPS = ['courge', 'patate', 'ble'];

export function cloneView(v) {
  return {
    ...v,
    sectors: Object.fromEntries(Object.entries(v.sectors).map(([k, s]) => [k, { ...s }])),
    plots: v.plots.map((p) => ({ ...p })),
    placements: v.placements.map((p) => ({ ...p })),
    crates: v.crates.map((c) => ({ ...c })),
    reflets: new Set(v.reflets),
    refletAnchors: new Set(v.refletAnchors || []),
    posts: [...v.posts],
    landmarkState: { ...v.landmarkState },
    avis: v.avis ? { ...v.avis } : null,
    veils: (v.veils || []).map((x) => ({ ...x })),
    fanal: v.fanal ? { ...v.fanal } : null,
  };
}

function stageIndex(name) {
  const s = SECTOR_THRESHOLDS.find((x) => x.name === name);
  return s ? s.stage : Math.max(0, ETATS.indexOf(name));
}
function withLueur(sv, lueur) {
  const { lit, germ } = sv.visibility === 'open' ? tileProgress(lueur, sv.stage) : { lit: 0, germ: 0 };
  return { ...sv, lueur, lit, germ };
}
function withStage(sv, stage) {
  const s = { ...sv, stage, etat: ETATS[stage], next: nextThreshold(stage) };
  return withLueur(s, sv.lueur);
}
function openSector(sv) {
  return withLueur({ ...sv, visibility: 'open', stage: 0, etat: 'eteint', next: nextThreshold(0) }, sv.lueur);
}
const cellPoint = ([r, c]) => P(c + 0.5, r + 0.5);
function spread(cells, n) {
  if (cells.length <= n) return cells;
  const step = cells.length / n;
  return Array.from({ length: n }, (_, i) => cells[Math.floor(i * step + step / 2) % cells.length]);
}
const distFromBastion = (n) => { const e = n.e; const u = e.kind ? e.u : e.c + (e.w || 1) / 2; const v = e.kind ? e.v : e.r + (e.h || 1) / 2; return Math.hypot(u - 6, v - 6); };

// ----------------------------------------------------------------------------- outils communs
function litIds(ctx) {
  const on = new Set();
  for (const n of ctx.scene.nodes.values()) if (n.halo && n.e.allume) on.add(n.id);
  return on;
}
/** Allume un à un les halos qui viennent de s'allumer (après un apply). */
async function staggerLights(ctx, before, gap = 110) {
  const fresh = [...ctx.scene.nodes.values()].filter((n) => n.halo && n.e.allume && !before.has(n.id)).sort((a, b) => distFromBastion(a) - distFromBastion(b));
  fresh.forEach((n, i) => {
    const h = n.halo;
    ctx.fx.anim(h, [{ opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.15, offset: 0.6 }, { scale: 1 }], { duration: 520, delay: i * gap, easing: 'ease-out', fill: 'backwards' });
    const art = n.el.querySelector('.ow-art');
    if (art) ctx.fx.anim(art, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.35)', offset: 0.4 }, { filter: 'brightness(1)' }], { duration: 520, delay: i * gap, fill: 'backwards' });
  });
  if (fresh.length) await ctx.fx.wait(fresh.length * gap + 380);
  return fresh.length;
}
function pop(ctx, el, { delay = 0, from = 0, peak = 1.14, dur = 380 } = {}) {
  if (!el) return null;
  return ctx.fx.anim(el, [{ transform: `scale(${from})` }, { transform: `scale(${peak})`, offset: 0.6 }, { transform: 'scale(1)' }], { duration: dur, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
}
function plaquePop(ctx, s) {
  const b = ctx.plaqueEls[s];
  if (!b) return;
  ctx.fx.anim(b, [{ scale: 1 }, { scale: 1.1, offset: 0.35 }, { scale: 1 }], { duration: 420, easing: 'ease-out' });
}
function fade(ctx, el, from = 0, to = 1) {
  if (!el) return Promise.resolve();
  return ctx.fx.anim(el, [{ opacity: from }, { opacity: to }], { duration: 150, easing: 'linear' }).finished.catch(() => {});
}
function sectorPx(s) { const [u, v] = SECTOR_CENTER[s]; return P(u, v); }
/** Retire une pièce de passage à la fin (ou à l'annulation) de son animation. */
function gone(a, el) { a.finished.then(() => el.remove(), () => el.remove()); return a; }
function svgPiece(ctx, cls, [vx, vy, vw, vh], inner, x, y) {
  return ctx.fx.piece(cls, `<svg viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}" style="position:absolute;left:${vx}px;top:${vy}px" aria-hidden="true" focusable="false">${inner}</svg>`, x, y);
}
/** Recopie une parcelle de la vue cible dans la vue affichée (ou, à défaut, `fallback` sur la parcelle affichée). */
function syncPlot(ctx, id, fallback = null) {
  const tp = ctx.target.plots.find((p) => p.id === id);
  const i = ctx.shown.plots.findIndex((p) => p.id === id);
  const next = fallback && i >= 0 ? { ...ctx.shown.plots[i], ...fallback } : tp ? { ...tp, ...(fallback || {}) } : null;
  if (!next) return;
  if (i >= 0) ctx.shown.plots[i] = next; else ctx.shown.plots.push(next);
}

// ----------------------------------------------------------------------------- 1 et 2 : fil de lumière, germination
function rewardStep(ctx, ev, { fromWorld = null, text = null } = {}) {
  const S = ev.sector && ctx.shown.sectors[ev.sector] ? ev.sector : null;
  const amount = Number(ev.lueur) || 0;
  let impacted = false;
  const impact = () => { if (!impacted) { impacted = true; ctx.onImpact(ev); } };
  let before = null, after = null;
  const compute = () => {
    before = ctx.shown.sectors[S];
    after = withLueur(before, Math.round((before.lueur + amount) * 100) / 100);
  };
  const textOf = () => {
    if (text) return text;
    if (!S || !(amount > 0)) return ev.filLibre > 0 ? ctx.t('gain.fil_libre', { n: fmt(ev.filLibre) }) : '';
    if (!before) compute();
    if (before.visibility !== 'open') return ctx.t('monde.reserve.gain', { du_secteur: ctx.t(`sector.${S}.of`), n: fmt(after.lueur) });
    if (after.lit > before.lit) return ctx.t('monde.tile.lit', { du_secteur: ctx.t(`sector.${S}.of`), n: after.lit });
    if (after.germ > before.germ) return ctx.t('monde.germ', { au_secteur: ctx.t(`sector.${S}.in`) });
    return ctx.t('gain.lueur', { n: fmt(amount), secteur: ctx.t(`sector.${S}.the`) });
  };
  const apply = () => {
    if (S && amount > 0) {
      if (!before) compute();
      ctx.shown.sectors[S] = { ...after };
      ctx.setActive(S);
    }
    impact();
    ctx.apply({ enter: false });
  };
  const run = async () => {
    const { fx, camera, scene } = ctx;
    const lueur = !!S && amount > 0;
    if (lueur) { compute(); ctx.setActive(S); }
    // cible : la prochaine case à rallumer, sinon le cœur du secteur ; sans Lueur, le cœur du Relais
    let tx, ty;
    if (lueur && before.visibility === 'open' && before.stage === 0 && before.lit < 12) {
      [tx, ty] = cellPoint(germCell(S, before.lit));
    } else if (lueur) {
      [tx, ty] = sectorPx(S);
    } else {
      [tx, ty] = scene.pointOf('relais', 0.8) || sectorPx('place');
    }
    ctx.reveal(tx, ty, 90);
    if (ctx.reduced) {
      apply();
      const b = S && ctx.plaqueEls[S];
      if (b) await fade(ctx, b, 0.35, 1);
      ctx.say(textOf());
      return;
    }
    const from = fromWorld ? () => camera.toView(...fromWorld) : null;
    const origin = from ? from() : ctx.threadFrom();
    await fx.thread({ from: origin, to: () => camera.toView(tx, ty) });
    impact();
    if (!lueur) {
      fx.ring(tx, ty + 4, 26, { dur: 520 });
      ctx.apply({ enter: false });
      const tx2 = textOf();
      if (tx2) ctx.say(tx2);
      return;
    }
    if (before.visibility !== 'open') {
      // sous la cendre : la Lueur descend et attend ; une bouffée de cendre le montre
      ctx.shown.sectors[S] = { ...after };
      ctx.updatePlaque(ctx.shown.sectors[S]);
      plaquePop(ctx, S);
      const pts6 = spread(CELLS[S], 6).map(cellPoint);
      fx.flakes(pts6, { dur: 900 });
      fx.ring(tx, ty, 50, { cls: 'is-ash', dur: 700 });
      const veil = ctx.veilOf[S];
      if (veil) fx.anim(veil, [{ opacity: 1 }, { opacity: 0.72, offset: 0.3 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
      ctx.say(textOf());
      await fx.wait(420);
      return;
    }
    // secteur ouvert : le chiffre change à l'impact, puis les cases se rallument
    ctx.shown.sectors[S] = { ...before, lueur: after.lueur };
    ctx.updatePlaque(ctx.shown.sectors[S]);
    plaquePop(ctx, S);
    fx.ring(tx, ty, 30, { dur: 520 });
    await germinate(ctx, S, before, after);
    ctx.say(textOf());
  };
  return { apply, run, text: textOf };
}

/** 2. Germination : chaque case gagnée s'éclaire (éclair au sol, étincelles), puis la pousse suivante lève. */
async function germinate(ctx, S, before, after) {
  const { fx } = ctx;
  const gained = Math.max(0, after.lit - before.lit);
  const cells = [];
  for (let i = before.lit; i < after.lit; i++) cells.push(ctx.tiles[S][i]);
  const animated = Math.min(gained, 4);
  // les cases au-delà des quatre premières s'allument directement
  for (let k = 0; k < gained; k++) {
    const idx = before.lit + k;
    if (k >= animated || fx.instant) { ctx.setLit(S, idx + 1); continue; }
    const cell = ctx.tiles[S][idx].dataset.cell.split('-').map(Number);
    const poly = document.createElementNS(SVGNS, 'polygon');
    poly.setAttribute('class', 'ow-tileflash');
    poly.setAttribute('points', pts(cellDiamond(cell[0], cell[1], 0.03)));
    ctx.tileFlashes.appendChild(poly);
    fx.anim(poly, [{ opacity: 0 }, { opacity: 0.95, offset: 0.3 }, { opacity: 0 }], { duration: 560, easing: 'ease-out' }).finished.then(() => poly.remove(), () => poly.remove());
    await fx.wait(150);
    ctx.setLit(S, idx + 1);
    const [x, y] = cellPoint(cell);
    fx.rise([[x - 8, y], [x + 7, y + 2], [x, y - 3]], { dur: 760, height: 34 });
  }
  ctx.shown.sectors[S] = { ...after };
  const g0 = ctx.scene.get(`germe-${S}`);
  const key0 = g0 ? `${g0.e.u},${g0.e.v},${g0.e.stage}` : '';
  ctx.apply({ enter: false });
  const g1 = ctx.scene.get(`germe-${S}`);
  if (g1 && `${g1.e.u},${g1.e.v},${g1.e.stage}` !== key0) {
    pop(ctx, g1.el, { from: 0.1, peak: 1.25, dur: 460 });
    const [x, y] = P(g1.e.u, g1.e.v);
    fx.rise([[x, y - 6]], { dur: 600, height: 26 });
  }
  await fx.wait(gained ? 360 : 260);
}

// ----------------------------------------------------------------------------- palier : vague gris → couleur
function seuilStep(ctx, ev) {
  const S = ev.sector;
  const idx = stageIndex(ev.stage);
  const textOf = () => ctx.t('sr.sector.level', { palier: ctx.t(levelKey(idx)), au_secteur: ctx.t(`sector.${S}.in`) });
  const apply = () => {
    const sv = ctx.shown.sectors[S];
    if (!sv || sv.visibility !== 'open') return;
    const floor = SECTOR_THRESHOLDS.find((x) => x.stage === idx)?.lueur ?? 0;
    ctx.shown.sectors[S] = withStage({ ...sv, lueur: Math.max(sv.lueur, floor) }, Math.max(sv.stage, idx));
    ctx.apply({ enter: false });
  };
  const run = async () => {
    const { fx } = ctx;
    const sv = ctx.shown.sectors[S];
    if (!sv || sv.visibility !== 'open' || idx <= sv.stage) { apply(); return; }
    const [x, y] = sectorPx(S);
    ctx.reveal(x, y, 80);
    const flash = ctx.flashOf[S];
    if (ctx.reduced) {
      apply();
      await fade(ctx, flash, 0.6, 0);
      ctx.say(textOf());
      return;
    }
    fx.ring(x, y, 80, { dur: 1000, to: 2.2 });
    fx.ring(x, y, 50, { dur: 900, delay: 170, to: 2 });
    fx.anim(flash, [{ opacity: 0 }, { opacity: 0.8, offset: 0.28 }, { opacity: 0 }], { duration: 1000, easing: 'ease-out' });
    await fx.wait(250);
    // le sol d'abord, puis les objets ~120 ms plus tard : la couleur se propage du sol vers ce qui s'y dresse
    ctx.setSectorAttr(S, ETATS[idx], null, 'ground');
    ctx.setLit(S, ctx.tiles[S].length);
    await fx.wait(120);
    const before = new Set([...ctx.scene.nodes.keys()].filter((id) => ctx.scene.get(id).e.sector === S));
    apply();
    plaquePop(ctx, S);
    // ce qui a changé de forme (Tour réparée, Atelier remis d'aplomb) s'ébroue
    for (const n of ctx.scene.nodes.values()) {
      if (n.e.sector !== S || n.e.ground || !before.has(n.id)) continue;
      if (n.e.model === 'atelier' || n.e.model === 'tour') pop(ctx, n.el, { from: 0.92, peak: 1.06, dur: 520 });
    }
    fx.rise(spread(CELLS[S], 9).map(cellPoint), { dur: 1100, height: 60, spread: 14 });
    ctx.say(textOf());
    await fx.wait(720);
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- 3 : la lisière s'allume
function lisiereStep(ctx) {
  const textOf = () => ctx.t('monde.lisiere');
  const apply = () => {
    ctx.shown.lisiere = true;
    ctx.shown.posts = postsFor(ctx.shown.sectors);
    ctx.shown.plots = ctx.target.plots.map((p) => ({ ...p }));
    ctx.apply({ enter: false });
  };
  const run = async () => {
    const { fx } = ctx;
    const [x, y] = sectorPx('place');
    ctx.reveal(x, y, 60);
    if (ctx.reduced) { apply(); await fx.wait(150); ctx.say(textOf()); return; }
    const before = litIds(ctx);
    ctx.shown.lisiere = true;
    ctx.shown.posts = postsFor(ctx.shown.sectors);
    ctx.apply({ enter: false });
    fx.ring(x, y, 60, { dur: 900, cls: 'is-gold', to: 2.4 });
    ctx.say(textOf());
    await staggerLights(ctx, before, 120);
    // la lisière veille sur les Champs : chaque parcelle pousse d'un cran
    const grown = [];
    const plots0 = new Map(ctx.shown.plots.map((p) => [p.id, p.stage]));
    ctx.shown.plots = ctx.target.plots.map((p) => ({ ...p }));
    for (const p of ctx.shown.plots) if (plots0.has(p.id) && plots0.get(p.id) !== p.stage) grown.push(p.id);
    if (grown.length) {
      ctx.apply({ enter: false });
      grown.forEach((pid, i) => {
        const n = ctx.scene.get(pid);
        const plant = n && n.el.querySelector('.ow-art');
        if (plant) ctx.fx.anim(plant, [{ transform: 'scaleY(.55)', transformOrigin: '50% 80%' }, { transform: 'scaleY(1.08)', transformOrigin: '50% 80%', offset: 0.65 }, { transform: 'scaleY(1)', transformOrigin: '50% 80%' }], { duration: 520, delay: i * 120, easing: 'ease-out', fill: 'backwards' });
        if (n) { const [px, py] = P(n.e.c + 1, n.e.r + 1); fx.rise([[px - 10, py], [px + 10, py + 2], [px, py - 6]], { dur: 700, height: 30 }); }
      });
      await fx.wait(grown.length * 120 + 520);
    } else ctx.apply({ enter: false });
  };
  return { apply, run, text: textOf };
}

function plainStep(ctx, mutate, text = () => '') {
  const apply = () => { mutate(); ctx.apply({ enter: false }); };
  return { apply, run: async () => { apply(); const s = text(); if (s) ctx.say(s); }, text };
}

// ----------------------------------------------------------------------------- 4 : l'objet-reflet reluit
function resolveObject(ctx, key) {
  if (!key) return null;
  if (key.startsWith('plot:')) return ctx.shown.plots.find((p) => p.slot === Number(key.slice(5)))?.id ?? null;
  if (key.startsWith('caisse:')) return ctx.shown.crates[Number(key.slice(7))]?.id ?? null;
  return key;
}
function refletStep(ctx, key) {
  const objId = () => resolveObject(ctx, key);
  const textOf = () => {
    const n = ctx.scene.get(objId());
    return n ? ctx.t('monde.reflet', { objet: ctx.objName(n.e), au_secteur: ctx.t(`sector.${n.e.sector}.in`) }) : '';
  };
  const apply = () => { ctx.shown.reflets.add(key); ctx.apply({ enter: false }); };
  const run = async () => {
    const n = ctx.scene.get(objId());
    if (!n) { apply(); return; }
    const p = ctx.scene.pointOf(n.id, 0.55);
    ctx.reveal(p[0], p[1], 90);
    const art = n.el.querySelector('.ow-art');
    if (ctx.reduced) { apply(); if (art) await ctx.fx.anim(art, [{ filter: 'brightness(1.3)' }, { filter: 'brightness(1)' }], { duration: 150 }).finished.catch(() => {}); ctx.say(textOf()); return; }
    apply();
    if (art) ctx.fx.anim(art, [{ filter: 'brightness(1) saturate(1)' }, { filter: 'brightness(1.5) saturate(1.25)', offset: 0.3 }, { filter: 'brightness(1.06) saturate(1.1)' }], { duration: 900, easing: 'ease-out' });
    const top = ctx.scene.pointOf(n.id, 0.95);
    ctx.fx.twinkle([[top[0] + 10, top[1] + 4], [top[0] - 12, top[1] + 16], [top[0] + 4, top[1] + 26]]);
    ctx.say(textOf());
    await ctx.fx.wait(820);
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- 5 : construction
function buildStep(ctx, pid) {
  const placement = () => ctx.target.placements.find((p) => p.id === pid);
  const textOf = () => {
    const p = placement();
    if (!p) return '';
    return ctx.t('monde.build', { objet: ctx.t(`monde.obj.${p.model}`), au_secteur: ctx.t(`sector.${p.sector}.in`) });
  };
  const add = () => {
    const p = placement();
    if (p && !ctx.shown.placements.some((x) => x.id === pid)) ctx.shown.placements.push({ ...p });
  };
  const apply = () => { add(); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    const p = placement();
    if (!p) return;
    const [x, y] = P(p.c + 0.5, p.r + 0.5);
    ctx.reveal(x, y - 30, 90);
    if (ctx.reduced) { apply(); const n = ctx.scene.get(pid); if (n) await fade(ctx, n.el); ctx.say(textOf()); return; }
    // empreinte fantôme au sol, puis chute, écrasement et poussière
    fx.ring(x, y, 34, { cls: 'is-ghost', dur: 520, to: 1.05 });
    await fx.wait(200);
    apply();
    const n = ctx.scene.get(pid);
    if (!n) return;
    const fall = fx.anim(n.el, [
      { transform: 'translateY(-340px)', opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: 'translateY(0)', opacity: 1 },
    ], { duration: 470, easing: 'cubic-bezier(.55,0,.85,.4)' });
    if (n.shadow) fx.anim(n.shadow, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 470, easing: 'ease-in' });
    await fall.finished.catch(() => {});
    fx.anim(n.el, [{ transform: 'scale(1.16, .78)' }, { transform: 'scale(.95, 1.06)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
    const [fx0, fy0] = P(p.c + 0.5, p.r + 0.5);
    fx.dust(fx0, fy0);
    ctx.say(textOf());
    await fx.wait(520);
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- 11 : la Lueur en réserve perce la cendre
function perceStep(ctx, S, chapter) {
  let lueur = 0;
  const textOf = () => (lueur > 0
    ? ctx.t('monde.perce', { secteur: ctx.sectorName(S), n: fmt(lueur) })
    : ctx.t('monde.ouvre', { secteur: ctx.sectorName(S) }));
  const mutate = () => {
    const sv = ctx.shown.sectors[S];
    lueur = sv.lueur;
    ctx.shown.sectors[S] = openSector(sv);
    if (chapter) ctx.shown.chapter = chapter;
    ctx.shown.posts = postsFor(ctx.shown.sectors);
  };
  const apply = () => { mutate(); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    lueur = ctx.shown.sectors[S].lueur;
    ctx.setActive(S);
    const [x, y] = sectorPx(S);
    ctx.reveal(x, y, 90);
    const veil = ctx.veilOf[S];
    if (ctx.reduced) { apply(); await fx.wait(150); ctx.say(textOf()); return; }
    // le voile tremble, des faisceaux percent, la cendre s'envole, le voile se lève
    if (veil) fx.anim(veil, [{ transform: 'translate(0,0)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(-1px,0)' }, { transform: 'translate(0,0)' }], { duration: 420, iterations: 2 });
    const cells = spread(CELLS[S], 5).map(cellPoint);
    fx.beam(cells, { dur: 1000 });
    await fx.wait(420);
    fx.flakes(spread(CELLS[S], 14).map(cellPoint), { dur: 1300 });
    if (veil) {
      const lift = fx.anim(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: 620, easing: 'ease-in', fill: 'forwards' });
      await lift.finished.catch(() => {});
    } else await fx.wait(300);
    const before = new Set(ctx.scene.nodes.keys());
    apply();
    let i = 0;
    for (const n of ctx.scene.nodes.values()) {
      if (before.has(n.id) || n.e.ground) continue;
      fx.anim(n.el, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, delay: (i++) * 60, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    }
    if (veil) veil.getAnimations().forEach((a) => a.cancel());
    fx.ring(x, y, 70, { dur: 900, cls: 'is-gold', to: 2 });
    plaquePop(ctx, S);
    ctx.say(textOf());
    await fx.wait(650);
  };
  return { apply, run, text: textOf };
}

/** Un secteur de la brume passe sous la cendre (l'horizon avance d'un chapitre). */
function mistLiftStep(ctx, S) {
  const apply = () => { ctx.shown.sectors[S] = { ...ctx.shown.sectors[S], visibility: 'cendre' }; ctx.shown.posts = postsFor(ctx.shown.sectors); ctx.apply({ enter: false }); };
  const run = async () => {
    const m = ctx.mists[S];
    if (!ctx.reduced && m && !m.hidden) await ctx.fx.anim(m, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'ease-in' }).finished.catch(() => {});
    apply();
    const v = ctx.veilOf[S];
    if (!ctx.reduced && v) await ctx.fx.anim(v, [{ opacity: 0 }, { opacity: 1 }], { duration: 420 }).finished.catch(() => {});
  };
  return { apply, run, text: () => '' };
}

// ----------------------------------------------------------------------------- 12 : l'Orée veille
function veilleStep(ctx) {
  const textOf = () => ctx.t('monde.veille');
  const apply = () => { ctx.shown.veille = true; ctx.root.dataset.veille = '1'; ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    if (ctx.reduced) { apply(); await fade(ctx, ctx.dusk); ctx.say(textOf()); return; }
    ctx.root.dataset.veille = '1';
    fx.anim(ctx.dusk, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, easing: 'ease-in-out' });
    [...ctx.stars.children].forEach((s, i) => fx.anim(s, [{ opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1 }], { duration: 600, delay: 500 + i * 90, fill: 'backwards' }));
    await fx.wait(520);
    const before = litIds(ctx);
    ctx.shown.veille = true;
    ctx.apply({ enter: false });
    ctx.say(textOf());
    await staggerLights(ctx, before, 160);
    await fx.wait(300);
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- petits moments
function surplusStep(ctx) {
  const textOf = () => ctx.t('gain.overflow');
  const run = async () => {
    const p = ctx.scene.pointOf('relais', 0.8);
    if (p && !ctx.reduced) {
      ctx.fx.ring(p[0], p[1] + 20, 30, { dur: 700, cls: 'is-gold' });
      const h = ctx.scene.get('relais')?.halo;
      if (h) ctx.fx.anim(h, [{ scale: 1 }, { scale: 1.6, offset: 0.35 }, { scale: 1 }], { duration: 700 });
      await ctx.fx.wait(500);
    }
    ctx.say(textOf());
  };
  return { apply: () => {}, run, text: textOf };
}
function etapeStep(ctx, ev) {
  const run = async () => {
    if (!ev.done || ctx.reduced) return;
    const task = ctx.tasks.find((x) => x && x.id === ev.taskId);
    const S = task ? sectorOfTask(task) : 'place';
    const [x, y] = sectorPx(S);
    ctx.fx.twinkle([[x, y - 24]]);
    await ctx.fx.wait(300);
  };
  return { apply: () => {}, run, text: () => '' };
}

// ----------------------------------------------------------------------------- 8 : Côte à côte
/**
 * Fanal rejoint sa place de la vue cible (travail ou retour) en une seule marche, puis s'arrête : aucune boucle.
 * La marche glisse l'élément de son ancienne place vers la nouvelle (WAAPI) ; en mouvement réduit, un fondu court.
 */
function fanalStep(ctx) {
  const apply = () => { ctx.shown.fanal = ctx.target.fanal ? { ...ctx.target.fanal } : null; ctx.apply({ enter: false }); };
  const run = async () => {
    const n = ctx.scene.get('fanal');
    const from = n ? [n.X, n.Y] : null;
    apply();
    const m = ctx.scene.get('fanal');
    if (!m || !from) return;
    const dx = from[0] - m.X, dy = from[1] - m.Y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    if (ctx.reduced) { await fade(ctx, m.el, 0, 1); return; }
    const dur = Math.round(Math.min(1400, 450 + Math.hypot(dx, dy) * 5));
    const opts = { duration: dur, easing: 'cubic-bezier(.45,0,.25,1)' };
    if (m.halo) ctx.fx.anim(m.halo, [{ translate: `${f(dx)}px ${f(dy)}px` }, { translate: '0px 0px' }], opts);
    await ctx.fx.anim(m.el, [{ translate: `${f(dx)}px ${f(dy)}px` }, { translate: '0px 0px' }], opts).finished.catch(() => {});
  };
  return { apply, run, text: () => '' };
}

// ----------------------------------------------------------------------------- 5 bis : établi et Tour (repères fixes)
function landmarkStep(ctx, lid) {
  const textOf = () => {
    const n = ctx.scene.get(lid);
    if (!n) return '';
    if (lid === 'tour') return ctx.t('monde.tour.reparee');
    return ctx.t('monde.build', { objet: ctx.t(`monde.obj.${n.e.model === 'chantier' ? 'etabli' : n.e.model}`), au_secteur: ctx.t(`sector.${n.e.sector}.in`) });
  };
  const mutate = () => {
    ctx.shown.landmarkState = { ...ctx.shown.landmarkState, [lid]: ctx.target.landmarkState?.[lid] ?? null };
    if (lid === 'tour') ctx.shown.tourRepaired = ctx.target.tourRepaired;
  };
  const apply = () => { mutate(); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    const n0 = ctx.scene.get(lid);
    if (!n0 || ctx.shown.sectors[n0.e.sector]?.visibility !== 'open') { apply(); return; }
    const [x, y] = P(n0.e.c + (n0.e.w || 1) / 2, n0.e.r + (n0.e.h || 1) / 2);
    ctx.reveal(x, y - 30, 90);
    if (ctx.reduced) { apply(); await fade(ctx, ctx.scene.get(lid)?.el); ctx.say(textOf()); return; }
    const lit0 = litIds(ctx);
    if (lid !== 'etabli') {
      // la Tour se redresse sur place : sursaut, anneau doré, éclats
      apply();
      pop(ctx, ctx.scene.get(lid)?.el, { from: 0.9, peak: 1.07, dur: 560 });
      fx.ring(x, y, 60, { cls: 'is-gold', dur: 900, to: 2 });
      fx.rise([[x - 14, y - 40], [x + 12, y - 60], [x, y - 80]], { dur: 900, height: 50 });
      ctx.say(textOf());
      await staggerLights(ctx, lit0);
      await fx.wait(360);
      return;
    }
    // l'établi : le chantier s'efface, l'empreinte fantôme se pose, puis chute, écrasement et poussière (animation 5)
    fx.ring(x, y, 34, { cls: 'is-ghost', dur: 520, to: 1.05 });
    const out = fx.anim(n0.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    await out.finished.catch(() => {});
    apply();
    out.cancel();
    const n = ctx.scene.get(lid);
    if (!n) return;
    const fall = fx.anim(n.el, [
      { transform: 'translateY(-340px)', opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: 'translateY(0)', opacity: 1 },
    ], { duration: 470, easing: 'cubic-bezier(.55,0,.85,.4)' });
    if (n.shadow) fx.anim(n.shadow, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 470, easing: 'ease-in' });
    await fall.finished.catch(() => {});
    fx.anim(n.el, [{ transform: 'scale(1.16, .78)' }, { transform: 'scale(.95, 1.06)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
    fx.dust(x, y);
    ctx.say(textOf());
    await staggerLights(ctx, lit0);
    await fx.wait(300);
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- potager : parcelle, semis, récolte (6)
const EMPTY_PLOT = { crop: null, stage: 0, need: 0, ripe: false };

function parcelleStep(ctx, ev) {
  const id = String(ev.id);
  const textOf = () => ctx.t('monde.parcelle');
  const apply = () => { if (!ctx.shown.plots.some((p) => p.id === id)) syncPlot(ctx, id, EMPTY_PLOT); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    const tp = ctx.target.plots.find((p) => p.id === id);
    const slot = tp && PLOT_SLOTS[tp.slot];
    if (!slot || ctx.shown.sectors.champs.visibility !== 'open' || ctx.shown.plots.some((p) => p.id === id)) { apply(); return; }
    const [x, y] = P(slot.c + 1, slot.r + 1);
    ctx.reveal(x, y - 20, 90);
    if (ctx.reduced) { apply(); const n = ctx.scene.get(`${id}:sol`); if (n) await fade(ctx, n.el); ctx.say(textOf()); return; }
    fx.ring(x, y, 60, { cls: 'is-ghost', dur: 520, to: 1.05 });
    await fx.wait(200);
    apply();
    const sol = ctx.scene.get(`${id}:sol`);
    if (sol) {
      const fall = fx.anim(sol.el, [
        { transform: 'translateY(-120px)', opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { transform: 'translateY(0)', opacity: 1 },
      ], { duration: 380, easing: 'cubic-bezier(.55,0,.85,.4)' });
      await fall.finished.catch(() => {});
      fx.anim(sol.el, [{ transform: 'scale(1.08, .9)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    }
    fx.dust(x, y, 10);
    ctx.say(textOf());
    await fx.wait(420);
  };
  return { apply, run, text: textOf };
}

function semisStep(ctx, ev) {
  const id = String(ev.plotId);
  const crop = CROPS.includes(ev.crop) ? ev.crop : null;
  const textOf = () => (crop ? ctx.t('monde.semis', { culture: ctx.t(`monde.crop.${crop}`) }) : '');
  const apply = () => { if (crop) syncPlot(ctx, id, { crop, stage: 0, need: CROP_STAGES[crop] ?? 2, ripe: false }); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    const n = ctx.scene.get(id);
    if (!n || !crop) { apply(); return; }
    const [x, y] = P(n.e.c + 1, n.e.r + 1);
    ctx.reveal(x, y - 20, 90);
    if (ctx.reduced) { apply(); const m = ctx.scene.get(id); if (m) await fade(ctx, m.el, 0.4, 1); ctx.say(textOf()); return; }
    // quatre graines tombent dans les sillons, puis les semis lèvent
    [[-24, -2], [-6, -11], [14, -1], [2, 10]].forEach(([dx, dy], i) => {
      const el = fx.piece('ow-seed', '', x + dx, y + dy);
      gone(fx.anim(el, [
        { transform: 'translateY(-46px) rotate(0deg)', opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: 'translateY(0) rotate(160deg)', opacity: 1, offset: 0.8 },
        { transform: 'translateY(0) rotate(180deg) scale(.5)', opacity: 0 },
      ], { duration: 420, delay: i * 60, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'backwards' }), el);
    });
    await fx.wait(400);
    apply();
    const art = ctx.scene.get(id)?.el.querySelector('.ow-art');
    if (art) fx.anim(art, [{ transform: 'scaleY(.4)', transformOrigin: '50% 80%', opacity: 0.3 }, { transform: 'scaleY(1)', transformOrigin: '50% 80%', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2,.8,.3,1)' });
    fx.dust(x, y, 6);
    ctx.say(textOf());
    await fx.wait(380);
  };
  return { apply, run, text: textOf };
}

/** 6. La récolte saute dans le panier (moins de 600 ms), le panier sursaute puis s'en va. */
function recolteStep(ctx, ev) {
  const id = String(ev.plotId);
  const crop = CROPS.includes(ev.crop) ? ev.crop : 'courge';
  const textOf = () => ctx.t('monde.recolte', { culture: ctx.t(`monde.crop.${crop}`) });
  const apply = () => { syncPlot(ctx, id, EMPTY_PLOT); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    const n = ctx.scene.get(id);
    if (!n) { apply(); return; }
    const { c, r } = n.e;
    const [bx, by] = P(c + 1.86, r + 1.86);
    ctx.reveal(bx, by - 20, 90);
    if (ctx.reduced) { apply(); const m = ctx.scene.get(id); if (m) await fade(ctx, m.el, 0.4, 1); ctx.say(textOf()); return; }
    const from = [[0.55, 0.55], [1.45, 0.6], [0.6, 1.4]].map(([u, v]) => P(c + u, r + v));
    // le panier du coin et les fruits deviennent des pièces de passage : la parcelle redevient sol nu dessous
    const basket = svgPiece(ctx, 'ow-basketfx', [-16, -26, 32, 30], basketSVG(0, 0, 1.15), bx, by);
    const fruits = from.map(([sx, sy]) => svgPiece(ctx, 'ow-fruit', [-9, -20, 18, 22], cropSVG(crop, 0, 0, 1), sx, sy));
    apply();
    const jumps = fruits.map((el, i) => {
      const [sx, sy] = from[i];
      const dx = bx - sx, dy = by - 7 - sy, kf = [];
      for (let s = 0; s <= 6; s++) {
        const k = s / 6;
        kf.push({ transform: `translate(${f(dx * k)}px, ${f(dy * k - 120 * k * (1 - k))}px) scale(${f(1 - 0.35 * k)})`, opacity: s === 6 ? 0 : 1 });
      }
      return gone(fx.anim(el, kf, { duration: 340, delay: i * 70, easing: 'linear', fill: 'both' }), el).finished.catch(() => {});
    });
    await Promise.all(jumps);
    fx.anim(basket, [{ transform: 'scale(1)' }, { transform: 'scale(1.14, .86)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
    fx.rise([[bx - 4, by - 14], [bx + 5, by - 16]], { dur: 520, height: 24 });
    ctx.say(textOf());
    gone(fx.anim(basket, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 260, delay: 300, easing: 'ease-in', fill: 'both' }), basket);
    await fx.wait(560);
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- Avis : braseros, souffle, Front, matin, voile
function braseroStep(ctx, ev) {
  const k = Math.max(1, Math.min(3, Math.round(Number(ev.braseros) || 1)));
  const S = () => ctx.shown.avis?.sector ?? ctx.target.avis?.sector ?? 'champs';
  const textOf = () => ctx.t('monde.brasero', { n: k, max: 3, au_secteur: ctx.t(`sector.${S()}.in`) });
  const apply = () => {
    if (ctx.shown.avis) ctx.shown.avis = { ...ctx.shown.avis, braseros: Math.max(ctx.shown.avis.braseros, k) };
    ctx.apply({ enter: false });
  };
  const run = async () => {
    const { fx } = ctx;
    const n0 = ctx.scene.get(`brasero-${k}`);
    if (!n0 || !ctx.shown.avis) { apply(); ctx.say(textOf()); return; }
    const [x, y] = P(n0.e.c + 0.5, n0.e.r + 0.5);
    ctx.reveal(x, y - 20, 90);
    if (ctx.reduced) { apply(); const h = ctx.scene.get(n0.id)?.halo; if (h) await fade(ctx, h); ctx.say(textOf()); return; }
    const lit0 = litIds(ctx);
    apply();
    // une flamme naît dans la vasque : petite au départ, elle prend, puis se pose
    const flame = ctx.scene.get(n0.id)?.el.querySelector('.ow-flame');
    if (flame) fx.anim(flame, [{ transform: 'scale(.1)', opacity: 0 }, { transform: 'scale(1.3)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
    fx.ring(x, y, 22, { cls: 'is-gold', dur: 620 });
    fx.rise([[x - 4, y - 18], [x + 4, y - 22], [x, y - 26]], { dur: 700, height: 30 });
    ctx.say(textOf());
    await staggerLights(ctx, lit0, 0);
    await fx.wait(160);
  };
  return { apply, run, text: textOf };
}

function soufflerStep(ctx, ev) {
  const n = Number(ev.filLibre) || 0;
  const textOf = () => ctx.t('monde.souffler', { n: fmt(n) });
  const run = async () => {
    const p = ctx.scene.pointOf('relais', 0.8) || sectorPx('place');
    if (!ctx.reduced) {
      ctx.reveal(p[0], p[1], 90);
      // la cendre s'envole autour du Relais, son cœur se ravive
      ctx.fx.flakes([[p[0] - 30, p[1] + 30], [p[0] + 26, p[1] + 34], [p[0] - 8, p[1] + 44], [p[0] + 40, p[1] + 20], [p[0] - 44, p[1] + 18]], { dur: 900 });
      ctx.fx.ring(p[0], p[1] + 24, 34, { cls: 'is-gold', dur: 700 });
      const h = ctx.scene.get('relais')?.halo;
      if (h) ctx.fx.anim(h, [{ scale: 1 }, { scale: 1.5, offset: 0.35 }, { scale: 1 }], { duration: 700 });
      await ctx.fx.wait(560);
    }
    ctx.say(textOf());
  };
  return { apply: () => {}, run, text: textOf };
}

function edgePoints(S, n = 5) {
  const E = AVIS_EDGE[S];
  return Array.from({ length: n }, (_, i) => {
    const k = (i + 0.5) / n;
    return P(E.a[0] + (E.b[0] - E.a[0]) * k - E.n[0] * 0.5, E.a[1] + (E.b[1] - E.a[1]) * k - E.n[1] * 0.5);
  });
}
function avisView(ctx, ev) {
  const id = String(ev.id);
  if (ctx.target.avis && ctx.target.avis.id === id) return { ...ctx.target.avis };
  let left = 0;
  try { left = Math.max(0, daysBetween(ctx.shown.today, ev.day)); } catch { left = 0; }
  return { id, sector: ev.sector, day: ev.day, announcedOn: ctx.shown.today, force: Number(ev.force) || 0, braseros: 0, daysLeft: left, progress: 0 };
}

/** 9. Le Front de givre arrive du large et se pose au rivage du secteur visé ; la plaque prend le repère d'Avis. */
function avisAnnonceStep(ctx, ev) {
  const S = ev.sector;
  const textOf = () => ctx.t('monde.avis.annonce', { nom: ctx.avisName(String(ev.id)), au_secteur: ctx.t(`sector.${S}.in`), quand: ctx.avisWhen(avisView(ctx, ev).daysLeft) });
  const apply = () => { ctx.shown.avis = avisView(ctx, ev); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    if (!AVIS_EDGE[S] || !ctx.shown.sectors[S] || ctx.shown.sectors[S].visibility === 'brume') { apply(); ctx.say(textOf()); return; }
    const E = AVIS_EDGE[S];
    const [mx, my] = P((E.a[0] + E.b[0]) / 2, (E.a[1] + E.b[1]) / 2);
    ctx.setActive(S);
    ctx.reveal(mx, my, 120);
    if (ctx.reduced) { apply(); await fade(ctx, ctx.frontHost); ctx.say(textOf()); return; }
    const before = new Set(ctx.scene.nodes.keys());
    apply();
    const p = ctx.shown.avis.progress;
    const come = fx.anim(ctx.frontMove, [
      { transform: ctx.frontShift(p, 1.6), opacity: 0 },
      { opacity: 1, offset: 0.35 },
      { transform: ctx.frontShift(p), opacity: 1 },
    ], { duration: 1100, easing: 'cubic-bezier(.2,.8,.3,1)' });
    const [nx, ny] = edgeNormal(E);
    fx.snow(edgePoints(S, 6), { dur: 1200, drift: [-nx * 1.4, -ny * 1.4] });
    plaquePop(ctx, S);
    let i = 0;
    for (const n of ctx.scene.nodes.values()) if (!before.has(n.id) && n.e.model === 'brasero') pop(ctx, n.el, { delay: 520 + (i++) * 140, from: 0.2, peak: 1.12, dur: 380 });
    ctx.say(textOf());
    await come.finished.catch(() => {});
    await fx.wait(320);
  };
  return { apply, run, text: textOf };
}

/** 10. Le matin de l'Avis, rejoué en 8 s : tenu (le givre passe, les rangs tiennent, un sceau), voilé (2 cases), absent (sobre). */
function avisResoluStep(ctx, ev) {
  const id = String(ev.id);
  const result = ['tenu', 'voile', 'absent'].includes(ev.result) ? ev.result : 'absent';
  let S0;
  const sector = () => {
    if (S0 !== undefined) return S0;
    const tv = ctx.target.veils.find((v) => v.avis === id);
    S0 = ctx.shown.avis?.id === id ? ctx.shown.avis.sector : tv?.sector ?? ctx.shown.avis?.sector ?? null;
    return S0;
  };
  const textOf = () => ctx.t(`monde.avis.${result}`, { nom: ctx.avisName(id), au_secteur: ctx.t(`sector.${sector() ?? 'champs'}.in`) });
  const veilsAfter = () => {
    const s = sector();
    const tv = ctx.target.veils.find((v) => v.sector === s) ?? { avis: id, sector: s, cells: 2 };
    return ctx.shown.veils.filter((v) => v.sector !== s).concat({ ...tv });
  };
  const mutate = () => {
    if (ctx.shown.avis && ctx.shown.avis.id === id) ctx.shown.avis = null;
    if (result === 'voile' && sector()) ctx.shown.veils = veilsAfter();
  };
  const apply = () => { mutate(); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    const s = sector();
    if (!s || !ctx.shown.sectors[s] || ctx.shown.sectors[s].visibility === 'brume' || !AVIS_EDGE[s]) { apply(); ctx.say(textOf()); return; }
    ctx.setActive(s);
    const [cx, cy] = sectorPx(s);
    ctx.reveal(cx, cy, 110);
    const flash = ctx.flashOf[s];
    flash.classList.add('is-frost');
    try {
      if (ctx.reduced) {
        apply();
        await fade(ctx, flash, 0.5, 0);
        if (result === 'tenu') {
          const seal = fx.piece('ow-seal', sealSVG(), cx, cy - 48);
          await fade(ctx, seal);
          await fx.wait(1200);
          await gone(fx.anim(seal, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }), seal).finished.catch(() => {});
        }
        ctx.say(textOf());
        return;
      }
      // c'est le jour J ; si le Front n'était pas affiché (monde ouvert le matin même), on le pose au rivage pour
      // rejouer la scène. L'Avis est déjà résolu dans le jeu (`resolu`) : la plaque n'en montre plus le repère.
      const was = ctx.shown.avis && ctx.shown.avis.id === id ? ctx.shown.avis : null;
      const p0 = was ? was.progress : 1;
      ctx.shown.avis = was ? { ...was, daysLeft: 0, progress: 1, resolu: true }
        : { id, sector: s, day: ev.day, announcedOn: ev.day, force: Number(ev.force) || 0, braseros: 0, daysLeft: 0, progress: 1, resolu: true };
      ctx.apply({ enter: false });
      const fm = ctx.frontMove;
      if (result === 'absent') {
        // sobre : le givre repart au large, les braseros s'éteignent, rien d'autre
        const away = fx.anim(fm, [{ transform: ctx.frontShift(p0), opacity: 1 }, { transform: ctx.frontShift(0, 0.6), opacity: 0 }], { duration: 1500, easing: 'ease-in-out', fill: 'forwards' });
        for (const n of ctx.scene.nodes.values()) if (n.e.model === 'brasero') fx.anim(n.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 300, fill: 'forwards' });
        await away.finished.catch(() => {});
        mutate();
        ctx.apply({ quiet: true }); // braseros déjà éteints : pas de second fondu
        away.cancel();
        ctx.say(textOf());
        await fx.wait(400);
        return;
      }
      // 1. au petit matin, le Front gagne le rivage et mord un peu sur l'île (1,4 s)
      const shore = ctx.frontShift(1, -0.55);
      const adv = fx.anim(fm, [{ transform: ctx.frontShift(p0) }, { transform: shore }], { duration: 1400, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' });
      await adv.finished.catch(() => {});
      // 2. le givre passe sur le secteur : voile bleuté, neige poussée depuis le bord, les braseros résistent
      const E = AVIS_EDGE[s];
      const [nx, ny] = edgeNormal(E);
      const hold = result === 'tenu' ? 0.45 : 0.6;
      const tint = fx.anim(flash, [{ opacity: 0 }, { opacity: hold, offset: 0.3 }, { opacity: hold }], { duration: 1600, easing: 'ease-out', fill: 'forwards' });
      fx.snow(spread(CELLS[s], 12).map(cellPoint), { dur: 1500, drift: [-nx * 2.2, -ny * 2.2] });
      for (const n of ctx.scene.nodes.values()) {
        if (n.e.model !== 'brasero' || !n.e.allume) continue;
        if (n.halo) fx.anim(n.halo, [{ scale: 1 }, { scale: 1.7, offset: 0.4 }, { scale: 1 }], { duration: 1100, easing: 'ease-out' });
        const [bx, by] = P(n.e.c + 0.5, n.e.r + 0.5);
        fx.ring(bx, by, 26, { cls: 'is-gold', dur: 900, delay: 200 });
      }
      let i = 0;
      for (const n of ctx.scene.nodes.values()) {
        if (n.e.sector !== s || !n.e.plot?.crop) continue;
        const art = n.el.querySelector('.ow-art');
        if (art) fx.anim(art, [{ transform: 'scaleY(1)', transformOrigin: '50% 85%' }, { transform: 'scaleY(.88)', transformOrigin: '50% 85%', offset: 0.45 }, { transform: 'scaleY(1)', transformOrigin: '50% 85%' }], { duration: 900, delay: 300 + (i++) * 110, easing: 'ease-in-out' });
      }
      await fx.wait(1500);
      if (result === 'voile') {
        // 3v. le givre se pose sur deux cases, qui cristallisent l'une après l'autre
        const had = new Set(ctx.scene.nodes.keys());
        ctx.shown.veils = veilsAfter();
        ctx.apply({ enter: false });
        let k = 0;
        for (const n of ctx.scene.nodes.values()) {
          if (had.has(n.id) || n.e.kind !== 'frost') continue;
          fx.anim(n.el, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 520, delay: k * 260, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
          const [fxp, fyp] = P(n.e.c + 0.5, n.e.r + 0.5);
          fx.snow([[fxp - 8, fyp], [fxp + 8, fyp + 2], [fxp, fyp - 4]], { dur: 700 });
          k++;
        }
        await fx.wait(520 + 260 * Math.max(0, k - 1) + 300);
      }
      // 3. le Front se retire au large
      const back = fx.anim(fm, [{ transform: shore, opacity: 1 }, { transform: ctx.frontShift(0, 1), opacity: 0 }], { duration: 1300, easing: 'ease-in', fill: 'forwards' });
      let seal = null;
      if (result === 'tenu') {
        // 4. un sceau se pose sur le secteur : il a tenu
        await fx.wait(900);
        seal = fx.piece('ow-seal', sealSVG(), cx, cy - 48);
        const stamp = fx.anim(seal, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(.9)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' });
        await stamp.finished.catch(() => {});
        fx.ring(cx, cy, 70, { cls: 'is-gold', dur: 900, to: 1.8 });
        fx.rise(spread(CELLS[s], 6).map(cellPoint), { dur: 1000, height: 50 });
        plaquePop(ctx, s);
      }
      await back.finished.catch(() => {});
      fx.anim(flash, [{ opacity: hold }, { opacity: 0 }], { duration: 600, easing: 'ease-in' });
      tint.cancel();
      apply();
      back.cancel();
      adv.cancel();
      ctx.say(textOf());
      if (seal) {
        await fx.wait(1900);
        await gone(fx.anim(seal, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: 600, easing: 'ease-in', fill: 'forwards' }), seal).finished.catch(() => {});
      } else await fx.wait(700);
    } finally {
      flash.classList.remove('is-frost');
    }
  };
  return { apply, run, text: textOf };
}

/** Une case du voile levée (1 ⚡) ou tout le voile levé (fin des 3 jours, quête du secteur). */
function voileLeveStep(ctx, ev) {
  const S = ev.sector;
  const left = Math.max(0, Math.round(Number(ev.cells) || 0));
  const textOf = () => ctx.t(left > 0 ? 'monde.voile.leve.case' : 'monde.voile.leve', { au_secteur: ctx.t(`sector.${S}.in`), n: left });
  const mutate = () => {
    const cur = ctx.shown.veils.find((v) => v.sector === S);
    ctx.shown.veils = ctx.shown.veils.filter((v) => v.sector !== S);
    if (cur && left > 0) ctx.shown.veils.push({ ...cur, cells: Math.min(cur.cells, left) });
  };
  const apply = () => { mutate(); ctx.apply({ enter: false }); };
  const run = async () => {
    const { fx } = ctx;
    const cur = ctx.shown.veils.find((v) => v.sector === S);
    if (!cur) { apply(); ctx.say(textOf()); return; }
    const leaving = [];
    for (let k = left > 0 ? Math.min(cur.cells, left) : 0; k < cur.cells; k++) { const n = ctx.scene.get(`givre-${S}-${k}`); if (n) leaving.push(n); }
    if (!leaving.length) { apply(); ctx.say(textOf()); return; }
    const [x0, y0] = P(leaving[0].e.c + 0.5, leaving[0].e.r + 0.5);
    ctx.reveal(x0, y0, 90);
    // les cases déjà effacées partent sans second fondu (retrait discret de la scène)
    const lift = () => { mutate(); ctx.apply({ quiet: true }); };
    if (ctx.reduced) {
      await Promise.all(leaving.map((n) => fx.anim(n.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }).finished.catch(() => {})));
      lift(); ctx.say(textOf()); return;
    }
    leaving.forEach((n, i) => {
      fx.anim(n.el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.12) translateY(-6px)' }], { duration: 560, delay: i * 160, easing: 'ease-in', fill: 'forwards' });
      const [x, y] = P(n.e.c + 0.5, n.e.r + 0.5);
      fx.rise([[x - 8, y], [x + 8, y + 2], [x, y - 4]], { dur: 700, height: 32 });
    });
    await fx.wait(560 + 160 * (leaving.length - 1));
    lift();
    ctx.say(textOf());
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- chef d'orchestre
function stepsFor(ctx, ev) {
  switch (ev.type) {
    case 'reward': return [rewardStep(ctx, ev)];
    case 'fil-libre': {
      const relais = ctx.scene.pointOf('relais', 0.8);
      const n = Number(ev.amount ?? ev.lueur) || 0;
      return [rewardStep(ctx, { type: 'reward', source: 'fil-libre', sector: ev.sector, lueur: n, filLibre: 0 }, {
        fromWorld: relais, text: ctx.t('monde.fil.direct', { n: fmt(n), secteur: ctx.t(`sector.${ev.sector}.the`) }),
      })];
    }
    case 'secteur-seuil': return [seuilStep(ctx, ev)];
    case 'lisiere-allumee': return [lisiereStep(ctx)];
    case 'lisiere-retiree': return [plainStep(ctx, () => { ctx.shown.lisiere = false; })];
    case 'chapitre': {
      const out = [];
      for (const s of SECTOR_ORDER) {
        const from = ctx.shown.sectors[s].visibility, to = ctx.target.sectors[s].visibility;
        if (from !== 'open' && to === 'open') out.push(perceStep(ctx, s, ev.chapter));
        else if (from === 'brume' && to === 'cendre') out.push(mistLiftStep(ctx, s));
      }
      out.push(plainStep(ctx, () => { ctx.shown.chapter = ev.chapter; }));
      return out;
    }
    case 'secteur-ouvert': return ctx.shown.sectors[ev.sector] && ctx.shown.sectors[ev.sector].visibility !== 'open' ? [perceStep(ctx, ev.sector, null)] : [];
    case 'construction': return [LANDMARK_IDS.has(String(ev.id)) ? landmarkStep(ctx, String(ev.id)) : buildStep(ctx, String(ev.id))];
    case 'parcelle': return [parcelleStep(ctx, ev)];
    case 'semis': return [semisStep(ctx, ev)];
    case 'recolte': return [recolteStep(ctx, ev)];
    case 'brasero': return [braseroStep(ctx, ev)];
    case 'souffler': return [soufflerStep(ctx, ev)];
    case 'avis-annonce': return [avisAnnonceStep(ctx, ev)];
    case 'avis-resolu': return [avisResoluStep(ctx, ev)];
    case 'voile-leve': return [voileLeveStep(ctx, ev)];
    // sans dessin propre : simple mise à jour (l'interface les annonce)
    case 'partage': case 'reserve': case 'objectif-atteint': case 'chapitre-fin': return [plainStep(ctx, () => {})];
    case 'reflet': return [refletStep(ctx, ev.objectId ?? ev.object ?? ev.anchor)];
    case 'veille': return [veilleStep(ctx)];
    case 'surplus': return [surplusStep(ctx)];
    case 'etape': return [etapeStep(ctx, ev)];
    case 'seance-debut': case 'seance-fin': return [fanalStep(ctx)];
    default: return [];
  }
}

/** Ce que l'état final montre et qu'aucun événement n'a joué : constructions, repères, parcelles et reflets nouveaux. */
function extraSteps(ctx) {
  const out = [];
  const have = new Set(ctx.shown.placements.map((p) => p.id));
  for (const p of ctx.target.placements) if (!have.has(p.id) && ctx.shown.sectors[p.sector]?.visibility === 'open') out.push(buildStep(ctx, p.id));
  const lm = ctx.target.landmarkState || {};
  for (const lid of Object.keys(lm)) if (LANDMARK_IDS.has(lid) && (ctx.shown.landmarkState || {})[lid] !== lm[lid]) out.push(landmarkStep(ctx, lid));
  if (ctx.shown.sectors.champs?.visibility === 'open') {
    const plots = new Set(ctx.shown.plots.map((p) => p.id));
    for (const p of ctx.target.plots) if (!plots.has(p.id)) out.push(parcelleStep(ctx, { id: p.id }));
  }
  for (const k of ctx.target.reflets) if (!ctx.shown.reflets.has(k)) out.push(refletStep(ctx, k));
  return out.slice(0, 4);
}

/**
 * Une seule voix par événement : les gestes du joueur et le temps du jeu (Avis, voile parti) sont annoncés par
 * l'interface ; le monde les dessine sans les dire. Le voile levé par une quête du secteur reste dit par le monde.
 */
const SAID_BY_UI = new Set(['semis', 'recolte', 'partage', 'reserve', 'construction', 'parcelle', 'brasero', 'souffler', 'fil-libre', 'voile-leve', 'avis-annonce', 'avis-resolu', 'seance-debut', 'seance-fin']);
const saidByUi = (ev) => SAID_BY_UI.has(ev.type) && !(ev.type === 'voile-leve' && ev.reason === 'quete');

export async function playEvents(ctx, events) {
  const missed = [];
  const runAll = async (steps, quiet = false) => {
    for (const step of steps) {
      if (ctx.fx.instant) {
        step.apply();
        const s = quiet ? '' : step.text();
        if (s) missed.push(s);
        continue;
      }
      ctx.onStep?.();
      await step.run();
    }
  };
  for (const ev of events) {
    const quiet = saidByUi(ev);
    await runAll(stepsFor(quiet ? Object.create(ctx, { say: { value: () => {} } }) : ctx, ev), quiet);
  }
  await runAll(extraSteps(ctx));
  if (missed.length) ctx.say(missed.join(' '));
}
