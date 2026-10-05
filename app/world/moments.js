// Les moments du monde (RECOMMANDATION §7) : chaque événement de core/quests.js devient une étape.
// Une étape sait s'appliquer d'un coup (apply) et se jouer (run). run() fait avancer la vue affichée
// pas à pas et finit dans le même état qu'apply(). En mouvement réduit, chaque moment est un fondu court.
// Pendant un saut, l'étape en cours se termine en 150 ms et les suivantes s'appliquent sans animation.
//
//   1 fil de lumière (reward, fil-libre)      2 germination (cases rallumées, pousse)
//   3 la lisière s'allume (lisiere-allumee)   4 l'objet-reflet reluit (reflet)
//   5 construction (construction)             11 la Lueur en réserve perce la cendre (chapitre, secteur-ouvert)
//   12 l'Orée veille (veille)                 + palier de secteur (secteur-seuil) : vague gris → couleur
import { P, f, pts } from './iso.js';
import { CELLS, SECTOR_CENTER, SECTOR_ORDER, germCell } from './layout.js';
import { tileProgress, nextThreshold, postsFor, ETATS } from './view.js';
import { SECTOR_THRESHOLDS } from '../core/economy.js';
import { sectorOfTask } from '../core/domains.js';
import { cellDiamond } from './terrain.js';
import { levelKey, fmt } from './texts.js';

const SVGNS = 'http://www.w3.org/2000/svg';

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
    if (S === 'place' && idx >= 1) ctx.shown.tourRepaired = true;
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
    case 'construction': return [buildStep(ctx, String(ev.id))];
    case 'reflet': return [refletStep(ctx, ev.objectId ?? ev.object ?? ev.anchor)];
    case 'veille': return [veilleStep(ctx)];
    case 'surplus': return [surplusStep(ctx)];
    case 'etape': return [etapeStep(ctx, ev)];
    default: return [];
  }
}

/** Ce que l'état final montre et qu'aucun événement n'a joué : constructions et reflets nouveaux. */
function extraSteps(ctx) {
  const out = [];
  const have = new Set(ctx.shown.placements.map((p) => p.id));
  for (const p of ctx.target.placements) if (!have.has(p.id) && ctx.shown.sectors[p.sector]?.visibility === 'open') out.push(buildStep(ctx, p.id));
  for (const k of ctx.target.reflets) if (!ctx.shown.reflets.has(k)) out.push(refletStep(ctx, k));
  return out.slice(0, 4);
}

export async function playEvents(ctx, events) {
  const missed = [];
  const runAll = async (steps) => {
    for (const step of steps) {
      if (ctx.fx.instant) {
        step.apply();
        const s = step.text();
        if (s) missed.push(s);
        continue;
      }
      await step.run();
    }
  };
  for (const ev of events) await runAll(stepsFor(ctx, ev));
  await runAll(extraSteps(ctx));
  if (missed.length) ctx.say(missed.join(' '));
}
