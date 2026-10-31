// Les moments du monde : chaque événement de core/quests.js devient une étape.
// Une étape sait s'appliquer d'un coup (apply) et se jouer (run). run() fait avancer la vue affichée
// pas à pas et finit dans le même état qu'apply(). En mouvement réduit, chaque moment est un fondu court.
// Pendant un saut, l'étape en cours se termine en 150 ms et les suivantes s'appliquent sans animation.
//
//   fil de lumière vers le quartier de la tâche (reward)   un quartier monte de niveau (quartier-monte, acheté)
//   l'objet-reflet reluit (reflet)                          tout est enregistré, les lanternes s'allument (veille)
//   la forêt recule : un rang gagne une bande de terrain (rang, lot F)
//   la récolte d'une bulle s'envole vers son compteur (cueillette, lot L)
//   une étape du phare payée ou finie, sa lanterne allumée le temps du moment de la fin (travaux-etape-*, lot O)
//   le phare allumé pour la semaine ; le voilier des plaisanciers accueillis repart (phare-allume, escale-accueillie, lot Y)
import { P, f } from './iso.js';
import { SECTOR_CENTER, BANDES_ILE, EMPLACEMENTS, decorFor } from './layout.js';
import { quartierOfTask } from '../core/domains.js';
import { PRODUCTION } from '../core/batiments.js';

export function cloneView(v) {
  return {
    ...v,
    sectors: Object.fromEntries(Object.entries(v.sectors).map(([k, s]) => [k, { ...s }])),
    crates: v.crates.map((c) => ({ ...c })),
    reflets: new Set(v.reflets),
    refletAnchors: new Set(v.refletAnchors || []),
    batiments: (v.batiments || []).map((b) => ({ ...b })),
    imprevus: new Set(v.imprevus || []),
    bandes: [...(v.bandes || [])],
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
 * plaque du quartier se met à jour. Un bonus sans quartier va au cœur de la Place. Le monde ne dit rien : l'interface
 * annonce le gain.
 */
function rewardStep(ctx, ev) {
  const S = ev.quartier && ctx.shown.sectors[ev.quartier] ? ev.quartier : null;
  let impacted = false;
  const impact = () => { if (!impacted) { impacted = true; ctx.onImpact(ev); } };
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
      return;
    }
    await fx.thread({ from: ctx.threadFrom(), to: () => camera.toView(tx, ty) });
    impact();
    sync();
    if (S) plaquePop(ctx, S);
    fx.ring(tx, ty, 30, { dur: 520 });
    ctx.apply({ enter: false });
    await fx.wait(300);
  };
  return { apply, run, text: () => '' };
}

// ----------------------------------------------------------------------------- la récolte d'une bulle (lot L)
/**
 * Une récolte faite d'un toucher sur sa bulle : la bulle part, la culture se vide, la Nourriture s'envole de la bulle vers
 * son compteur de la barre du haut ; à l'arrivée, le compteur monte (onImpact). En mouvement réduit, ou sans compteur à
 * viser, le chiffre change sans vol. Le monde ne dit rien : l'interface annonce la récolte.
 */
function cueilletteStep(ctx, ev) {
  let impacted = false;
  const impact = () => { if (!impacted) { impacted = true; ctx.onImpact(ev); } };
  const sync = () => {
    const i = ctx.shown.batiments.findIndex((b) => b.id === ev.id);
    const b = ctx.target.batiments.find((x) => x.id === ev.id);
    if (i >= 0 && b) ctx.shown.batiments[i] = { ...b };
    ctx.apply({ enter: false });
  };
  const apply = () => { sync(); impact(); };
  const run = async () => {
    const from = ctx.bulleCentre(ev.id);
    sync();
    if (ctx.reduced || !from || !ctx.compteur('nourriture')) { impact(); return; }
    await ctx.fx.envol({ from, to: () => ctx.compteur('nourriture') || from, html: ctx.bulleHtml('recolte') });
    impact();
  };
  return { apply, run, text: () => '' };
}

// ----------------------------------------------------------------------------- un quartier monte de niveau (acheté)
// La fiche s'est rangée (lot L) : la plaque vient dans la zone libre, le temps que la feuille parte, puis monte.
function niveauStep(ctx, ev) {
  const S = ctx.shown.sectors[ev.quartier] ? ev.quartier : null;
  const apply = () => { if (S) { ctx.shown.sectors[S] = { ...ctx.target.sectors[S] }; ctx.updatePlaque(ctx.shown.sectors[S]); } ctx.apply({ enter: false }); };
  const run = async () => {
    if (!S) { apply(); return; }
    const [x, y] = sectorPx(S);
    ctx.reveal(x, y, 90);
    if (!ctx.reduced) await ctx.fx.wait(260);
    apply();
    const b = ctx.plaqueEls[S];
    if (ctx.reduced) { if (b) await fade(ctx, b, 0.35, 1); return; }
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

// ----------------------------------------------------------------------------- la forêt recule (lot F)
/**
 * Un nouveau rang gagne une bande de terrain : les arbres du bord, au droit de la bande, s'effacent en s'enfonçant ; la
 * terre monte de derrière l'île ; la lisière se replante au bord neuf, d'un bout à l'autre, et les souches restent.
 * L'interface dit la phrase, le monde dessine. Une bande déjà là (gagnée sur un autre appareil) ne rejoue rien ; en
 * mouvement réduit, la bande et ses arbres viennent en un fondu court.
 */
function bandeStep(ctx) {
  const neuves = () => (ctx.target?.bandes || []).filter((id) => !(ctx.shown.bandes || []).includes(id));
  // les emplacements posés sur la bande (lot B) arrivent avec elle : leurs piquets se plantent après les souches
  const surBande = (b) => EMPLACEMENTS[b.type]?.[Number(b.id.slice(b.type.length + 1)) - 1]?.bande;
  const apply = () => {
    ctx.shown.bandes = [...(ctx.target?.bandes || [])];
    const deja = new Set(ctx.shown.batiments.map((b) => b.id));
    ctx.shown.batiments = [...ctx.shown.batiments, ...(ctx.target?.batiments || []).filter((b) => !deja.has(b.id) && surBande(b))];
    ctx.apply({ enter: false });
  };
  const art = (n) => n.el.querySelector('.ow-art') || n.el;
  const ordre = (n) => (n.e.model === 'souche' ? 1 : n.e.batiment ? 2 : 0);
  const run = async () => {
    const ids = neuves().filter((id) => BANDES_ILE[id]);
    if (!ids.length) { apply(); return; }
    const b = BANDES_ILE[ids[0]];
    const [x, y] = P(b.c + b.w / 2, b.r + b.h);
    ctx.reveal(x, y - 30, 110);
    const avant = new Map(ctx.scene.nodes);
    if (ctx.reduced) {
      apply();
      await Promise.all([ctx.bande(ids[0]), ...[...ctx.scene.nodes.values()].filter((n) => !avant.has(n.id)).map((n) => n.el)].map((el) => fade(ctx, el)));
      return;
    }
    // 1. les arbres du bord s'effacent en s'enfonçant (ils partent avec l'apply, la scène les retire)
    const reste = new Set(decorFor(ctx.target.bandes).map((d) => d.id));
    const partent = [...avant.values()].filter((n) => /^d-/.test(n.id) && !reste.has(n.id));
    for (const n of partent) {
      ctx.fx.anim(art(n), [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      if (n.shadow) ctx.fx.anim(n.shadow, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: 'forwards' });
    }
    await ctx.fx.wait(380);
    // 2. la terre monte de derrière l'île (le socle et le sol de l'île, dessinés après, en cachent le pied)
    apply();
    const g = ctx.bande(ids[0]);
    if (g) ctx.fx.anim(g, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { duration: 760, easing: 'cubic-bezier(.16,1,.3,1)' });
    ctx.fx.ring(x, y - 20, 70, { dur: 900, delay: 180 });
    // 3. la lisière se replante d'un bout à l'autre, puis les souches et les piquets
    const neufs = [...ctx.scene.nodes.values()].filter((n) => !avant.has(n.id))
      .sort((p, q) => ordre(p) - ordre(q) || p.e.c - q.e.c);
    neufs.forEach((n, i) => {
      const delay = 320 + i * 60;
      ctx.fx.anim(art(n), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      if (n.shadow) ctx.fx.anim(n.shadow, [{ opacity: 0 }, { opacity: 1 }], { duration: 460, delay, fill: 'backwards' });
    });
    ctx.fx.twinkle([[x - 60, y - 34], [x + 34, y - 52], [x - 8, y - 20]]);
    await ctx.fx.wait(320 + neufs.length * 60 + 460);
  };
  return { apply, run, text: () => '' };
}

// ----------------------------------------------------------------------------- Grands travaux (lot O)
/**
 * Une étape d'un ouvrage payée (travaux-etape-payee : l'échafaudage monte du rocher) ou finie (travaux-etape-finie : il
 * part, l'étape neuve brille). La carte cadre l'ouvrage de près, le temps que la fiche se range. Le phare debout (fini) :
 * sa lanterne s'allume le temps du moment, vitres et halo, puis s'éteint ; l'allumer sera un geste (étape 3 des Grands
 * travaux). En mouvement réduit, un fondu court, et la lanterne s'allume et s'éteint sans animation. L'interface dit la
 * phrase et Fanal la réplique ; le monde dessine.
 */
function travauxStep(ctx, ev) {
  const id = ev.ouvrage;
  const sync = (allume) => {
    const t = ctx.target.travaux?.[id];
    if (t) ctx.shown.travaux = { ...ctx.shown.travaux, [id]: allume ? { ...t, allume: true } : t };
    ctx.apply({ enter: false });
  };
  const apply = () => sync(false);
  const art = () => ctx.scene.get(id)?.el.querySelector('.ow-art');
  const lanterne = async () => {
    sync(true);
    const n = ctx.scene.get(id);
    const a = n?.art.anchors.light;
    if (!n?.halo || !a) return;
    const [x, y] = [n.X + a[0], n.Y + a[1]];
    if (ctx.reduced) {
      await ctx.fx.anim(n.halo, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, fill: 'forwards' }).finished.catch(() => {});
      await ctx.fx.wait(1600);
    } else {
      ctx.fx.anim(n.halo, [{ opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.2, offset: 0.55 }, { opacity: 1, scale: 1 }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      const lit = art();
      if (lit) ctx.fx.anim(lit, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.3)', offset: 0.3 }, { filter: 'brightness(1)' }], { duration: 900, easing: 'ease-out' });
      ctx.fx.twinkle([[x - 16, y - 4], [x + 14, y - 12], [x + 2, y - 26]]);
      await ctx.fx.wait(2400);
    }
    // la lanterne s'éteint : le halo part, la scène retire la lumière
    if (n.halo) await ctx.fx.anim(n.halo, [{ opacity: 1 }, { opacity: 0 }], { duration: ctx.reduced ? 150 : 700, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    sync(false);
  };
  const run = async () => {
    const n = ctx.scene.get(id);
    if (!n || !ctx.target.travaux?.[id]) { apply(); return; }
    const [x, y] = ctx.scene.pointOf(id, 0.5);
    ctx.rapprocher(x, y);
    if (!ctx.reduced) await ctx.fx.wait(420);
    apply();
    const el = art();
    const [bx, by] = ctx.scene.pointOf(id, 0);
    if (ctx.reduced) await fade(ctx, el, 0.35, 1);
    else if (ev.type === 'travaux-etape-payee') {
      // l'échafaudage monte du rocher
      if (el) ctx.fx.anim(el, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 760, easing: 'cubic-bezier(.16,1,.3,1)' });
      ctx.fx.ring(bx, by, 30, { dur: 760 });
      await ctx.fx.wait(800);
    } else {
      // l'échafaudage est parti : l'étape neuve brille, des éclats au sommet
      if (el) ctx.fx.anim(el, [{ filter: 'brightness(1.45)' }, { filter: 'brightness(1)' }], { duration: 900, easing: 'ease-out' });
      const [tx, ty] = ctx.scene.pointOf(id, 0.95);
      ctx.fx.ring(bx, by, 34, { dur: 800 });
      ctx.fx.twinkle([[tx - 12, ty + 6], [tx + 10, ty + 14], [tx - 2, ty + 26]]);
      await ctx.fx.wait(ev.fini ? 520 : 820);
    }
    if (ev.type === 'travaux-etape-finie' && ev.fini) await lanterne();
  };
  return { apply, run, text: () => '' };
}

// ----------------------------------------------------------------------------- chef d'orchestre
/** Les événements que le monde joue (les autres sont ignorés). */
// ----------------------------------------------------------------------------- escales du phare (lot Y)
/**
 * Le phare allumé pour la semaine (phare-allume) : la carte le cadre de près, sa lanterne s'allume, le halo et son
 * faisceau éclatent puis se posent ; il reste allumé. Les plaisanciers accueillis (escale-accueillie) : leur voilier
 * s'éloigne vers le large en pâlissant, puis le phare reste seul. En mouvement réduit, des fondus courts. L'interface dit
 * la phrase et Fanal la réplique ; le monde dessine.
 */
function escaleStep(ctx, ev) {
  const apply = () => {
    ctx.shown.travaux = { ...ctx.shown.travaux, phare: ctx.target.travaux?.phare };
    ctx.shown.escale = ctx.target.escale;
    ctx.apply({ enter: false });
  };
  const run = async () => {
    const n = ctx.scene.get('phare');
    if (!n || !ctx.target.travaux?.phare) { apply(); return; }
    const [x, y] = ctx.scene.pointOf('phare', 0.5);
    ctx.rapprocher(x, y);
    if (!ctx.reduced) await ctx.fx.wait(420);
    if (ev.type === 'escale-accueillie') {
      const b = n.el.querySelector('.ow-voilier');
      if (b) {
        const k = ctx.reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '-48px 16px' }];
        await ctx.fx.anim(b, k, { duration: ctx.reduced ? 150 : 1200, easing: 'cubic-bezier(.45,0,.7,.4)', fill: 'forwards' }).finished.catch(() => {});
      }
      apply();
      return;
    }
    apply();
    const m = ctx.scene.get('phare');
    if (!m?.halo) return;
    if (ctx.reduced) { await ctx.fx.anim(m.halo, [{ opacity: 0 }, {}], { duration: 150 }).finished.catch(() => {}); return; }
    // la lumière éclate, puis revient à celle de la journée (ou du soir) : la dernière image est celle de la feuille de style
    ctx.fx.anim(m.halo, [{ opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.25, offset: 0.5 }, {}], { duration: 1400, easing: 'cubic-bezier(.16,1,.3,1)' });
    const a = m.art?.anchors.light;
    if (a) ctx.fx.twinkle([[m.X + a[0] - 16, m.Y + a[1] - 4], [m.X + a[0] + 14, m.Y + a[1] - 12], [m.X + a[0] + 2, m.Y + a[1] - 26]]);
    await ctx.fx.wait(1400);
  };
  return { apply, run, text: () => '' };
}

export const MOMENTS = new Set(['reward', 'quartier-monte', 'reflet', 'veille', 'etape', 'rang', 'cueillette', 'travaux-etape-payee', 'travaux-etape-finie', 'phare-allume', 'escale-accueillie']);
function stepsFor(ctx, ev) {
  switch (ev.type) {
    case 'reward': return [rewardStep(ctx, ev)];
    case 'quartier-monte': return [niveauStep(ctx, ev)];
    case 'reflet': return [refletStep(ctx, ev.objectId ?? ev.object ?? ev.anchor)];
    case 'veille': return [veilleStep(ctx)];
    case 'etape': return [etapeStep(ctx, ev)];
    case 'rang': return [bandeStep(ctx)];
    case 'cueillette': return [cueilletteStep(ctx, ev)];
    case 'travaux-etape-payee': case 'travaux-etape-finie': return [travauxStep(ctx, ev)];
    case 'phare-allume': case 'escale-accueillie': return [escaleStep(ctx, ev)];
    default: return [];
  }
}

/** Ce que l'état final montre et qu'aucun événement n'a joué : les reflets nouveaux. */
function extraSteps(ctx) {
  const out = [];
  for (const k of ctx.target.reflets) if (!ctx.shown.reflets.has(k)) out.push(refletStep(ctx, k));
  return out.slice(0, 4);
}

/** Une seule voix par événement : le niveau acheté est annoncé par l'interface ; le monde le dessine. */
const SAID_BY_UI = new Set(['quartier-monte']);

const PRODUCTEURS = new Set(['eolienne', ...Object.keys(PRODUCTION)]);
/**
 * Les productions du jour (éolienne et bâtiments du rang Village, lot B), qui suivent la quête payée, partent en un seul
 * fil vers la Place : leurs gains s'additionnent. Les autres événements ne changent pas.
 */
export function regrouperProductions(events) {
  const out = [];
  for (const ev of events) {
    const prev = out[out.length - 1];
    const prod = (e) => e?.type === 'reward' && PRODUCTEURS.has(e.source);
    if (prod(ev) && prod(prev)) {
      out[out.length - 1] = { ...prev, energy: (prev.energy || 0) + (ev.energy || 0), materials: (prev.materials || 0) + (ev.materials || 0), food: (prev.food || 0) + (ev.food || 0) };
    } else out.push(ev);
  }
  return out;
}

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
  // une étape d'ouvrage finie se joue en dernier : le reste de la quête (bonus, saison, permis) emmènerait la carte loin du
  // phare et de sa lanterne allumée (lot O)
  const finies = (ev) => ev.type === 'travaux-etape-finie';
  const list = regrouperProductions(events);
  for (const ev of list.filter((e) => !finies(e))) {
    const quiet = SAID_BY_UI.has(ev.type);
    await runAll(stepsFor(quiet ? Object.create(ctx, { say: { value: () => {} } }) : ctx, ev), quiet);
  }
  await runAll(extraSteps(ctx));
  for (const ev of list.filter(finies)) await runAll(stepsFor(ctx, ev));
  if (missed.length) ctx.say(missed.join(' '));
}
