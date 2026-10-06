// Les moments du monde : chaque événement de core/quests.js devient une étape.
// Une étape sait s'appliquer d'un coup (apply) et se jouer (run). run() fait avancer la vue affichée
// pas à pas et finit dans le même état qu'apply(). En mouvement réduit, chaque moment est un fondu court.
// Pendant un saut, l'étape en cours se termine en 150 ms et les suivantes s'appliquent sans animation.
//
//   fil de lumière vers le quartier de la tâche (reward)   un quartier monte de niveau (quartier-niveau)
//   l'objet-reflet reluit (reflet)                          tout est enregistré, les lanternes s'allument (veille)
import { P, f } from './iso.js';
import { SECTOR_CENTER } from './layout.js';
import { quartierOfTask, QUARTIERS } from '../core/domains.js';
import { tachesText } from './texts.js';

export function cloneView(v) {
  return {
    ...v,
    sectors: Object.fromEntries(Object.entries(v.sectors).map(([k, s]) => [k, { ...s }])),
    crates: v.crates.map((c) => ({ ...c })),
    reflets: new Set(v.reflets),
    refletAnchors: new Set(v.refletAnchors || []),
    batiments: (v.batiments || []).map((b) => ({ ...b })),
  };
}

const distFromCenter = (n) => { const e = n.e; const u = e.kind ? e.u : e.c + (e.w || 1) / 2; const v = e.kind ? e.v : e.r + (e.h || 1) / 2; return Math.hypot(u - 6, v - 6); };

// ----------------------------------------------------------------------------- outils communs
function litIds(ctx) {
  const on = new Set();
  for (const n of ctx.scene.nodes.values()) if (n.halo && n.e.allume) on.add(n.id);
  return on;
}
/** Allume un à un les halos qui viennent de s'allumer (après un apply), du centre vers le bord. */
async function staggerLights(ctx, before, gap = 110) {
  const fresh = [...ctx.scene.nodes.values()].filter((n) => n.halo && n.e.allume && !before.has(n.id)).sort((a, b) => distFromCenter(a) - distFromCenter(b));
  fresh.forEach((n, i) => {
    const h = n.halo;
    ctx.fx.anim(h, [{ opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.15, offset: 0.6 }, { scale: 1 }], { duration: 520, delay: i * gap, easing: 'ease-out', fill: 'backwards' });
    const art = n.el.querySelector('.ow-art');
    if (art) ctx.fx.anim(art, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.35)', offset: 0.4 }, { filter: 'brightness(1)' }], { duration: 520, delay: i * gap, fill: 'backwards' });
  });
  if (fresh.length) await ctx.fx.wait(fresh.length * gap + 380);
  return fresh.length;
}
function plaquePop(ctx, s, peak = 1.1) {
  const b = ctx.plaqueEls[s];
  if (!b) return;
  ctx.fx.anim(b, [{ scale: 1 }, { scale: peak, offset: 0.35 }, { scale: 1 }], { duration: 420, easing: 'ease-out' });
}
function fade(ctx, el, from = 0, to = 1) {
  if (!el) return Promise.resolve();
  return ctx.fx.anim(el, [{ opacity: from }, { opacity: to }], { duration: 150, easing: 'linear' }).finished.catch(() => {});
}
function sectorPx(s) { const [u, v] = SECTOR_CENTER[s]; return P(u, v); }

// ----------------------------------------------------------------------------- fil de lumière
/**
 * Le gain part du bouton « Fait » vers le quartier de la tâche ; à l'impact, les compteurs montent (onImpact) et la
 * plaque du quartier prend son nouveau compte. Un bonus sans quartier va au cœur de la Place.
 */
function rewardStep(ctx, ev) {
  const S = ev.quartier && ctx.shown.sectors[ev.quartier] ? ev.quartier : null;
  let impacted = false;
  const impact = () => { if (!impacted) { impacted = true; ctx.onImpact(ev); } };
  const textOf = () => {
    const sv = S && ctx.target.sectors[S];
    if (!sv || !sv.suivant) return '';
    return ctx.t('monde.progres', {
      Quartier: ctx.t(`quartier.${S}.name`),
      taches: tachesText(ctx.t, sv.suivant.encore, QUARTIERS[S].domain),
      suivant: sv.suivant.niveau,
    });
  };
  const sync = () => { if (S) { ctx.shown.sectors[S] = { ...ctx.target.sectors[S] }; ctx.updatePlaque(ctx.shown.sectors[S]); } };
  const apply = () => {
    sync();
    if (S) ctx.setActive(S);
    impact();
    ctx.apply({ enter: false });
  };
  const run = async () => {
    const { fx, camera } = ctx;
    if (S) ctx.setActive(S);
    const [tx, ty] = sectorPx(S || 'place');
    ctx.reveal(tx, ty, 90);
    if (ctx.reduced) {
      apply();
      const b = S && ctx.plaqueEls[S];
      if (b) await fade(ctx, b, 0.35, 1);
      ctx.say(textOf());
      return;
    }
    await fx.thread({ from: ctx.threadFrom(), to: () => camera.toView(tx, ty) });
    impact();
    sync();
    if (S) plaquePop(ctx, S);
    fx.ring(tx, ty, 30, { dur: 520 });
    ctx.apply({ enter: false });
    ctx.say(textOf());
    await fx.wait(300);
  };
  return { apply, run, text: textOf };
}

// ----------------------------------------------------------------------------- un quartier monte de niveau
function niveauStep(ctx, ev) {
  const S = ctx.shown.sectors[ev.quartier] ? ev.quartier : null;
  const apply = () => { if (S) { ctx.shown.sectors[S] = { ...ctx.target.sectors[S] }; ctx.updatePlaque(ctx.shown.sectors[S]); } ctx.apply({ enter: false }); };
  const run = async () => {
    apply();
    if (!S) return;
    const b = ctx.plaqueEls[S];
    if (ctx.reduced) { if (b) await fade(ctx, b, 0.35, 1); return; }
    const [x, y] = sectorPx(S);
    plaquePop(ctx, S, 1.18);
    ctx.fx.ring(x, y, 46, { dur: 800, cls: 'is-gold' });
    ctx.fx.ring(x, y, 30, { dur: 700, delay: 160 });
    ctx.fx.twinkle([[x - 18, y - 30], [x + 16, y - 22], [x, y - 44]]);
    await ctx.fx.wait(720);
  };
  return { apply, run, text: () => '' };
}

// ----------------------------------------------------------------------------- l'objet-reflet reluit
function resolveObject(ctx, key) {
  if (!key) return null;
  if (key.startsWith('caisse:')) return ctx.shown.crates[Number(key.slice(7))]?.id ?? null;
  return key;
}
function refletStep(ctx, key) {
  const objId = () => resolveObject(ctx, key);
  const textOf = () => {
    const n = ctx.scene.get(objId());
    return n ? ctx.t('monde.reflet', { objet: ctx.objName(n.e), au_secteur: ctx.t(`quartier.${n.e.sector}.in`) }) : '';
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

// ----------------------------------------------------------------------------- tout est enregistré, à demain
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

// ----------------------------------------------------------------------------- étape cochée
function etapeStep(ctx, ev) {
  const run = async () => {
    if (!ev.done || ctx.reduced) return;
    const task = ctx.tasks.find((x) => x && x.id === ev.taskId);
    const [x, y] = sectorPx(task ? quartierOfTask(task) : 'place');
    ctx.fx.twinkle([[x, y - 24]]);
    await ctx.fx.wait(300);
  };
  return { apply: () => {}, run, text: () => '' };
}

// ----------------------------------------------------------------------------- chef d'orchestre
function stepsFor(ctx, ev) {
  switch (ev.type) {
    case 'reward': return [rewardStep(ctx, ev)];
    case 'quartier-niveau': return [niveauStep(ctx, ev)];
    case 'reflet': return [refletStep(ctx, ev.objectId ?? ev.object ?? ev.anchor)];
    case 'veille': return [veilleStep(ctx)];
    case 'etape': return [etapeStep(ctx, ev)];
    default: return [];
  }
}

/** Ce que l'état final montre et qu'aucun événement n'a joué : les reflets nouveaux. */
function extraSteps(ctx) {
  const out = [];
  for (const k of ctx.target.reflets) if (!ctx.shown.reflets.has(k)) out.push(refletStep(ctx, k));
  return out.slice(0, 4);
}

/** Une seule voix par événement : le niveau de quartier est annoncé par l'interface ; le monde le dessine. */
const SAID_BY_UI = new Set(['quartier-niveau']);

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
    const quiet = SAID_BY_UI.has(ev.type);
    await runAll(stepsFor(quiet ? Object.create(ctx, { say: { value: () => {} } }) : ctx, ev), quiet);
  }
  await runAll(extraSteps(ctx));
  if (missed.length) ctx.say(missed.join(' '));
}
