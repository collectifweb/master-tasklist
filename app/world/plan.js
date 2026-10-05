// Plan accessible : la même île, en liste. Mêmes données que la carte (view.js), lisible au lecteur d'écran
// et au clavier. Les boutons « Voir sur la carte » forment un seul arrêt de tabulation (↑ ↓ Début Fin).
//
//   const plan = createWorldPlan(conteneur, { texts, anchors, now, onFocusSector });
//   plan.render(game, tasks); plan.focus(); plan.destroy();
import { SECTOR_ORDER, LANDMARKS } from './layout.js';
import { deriveView } from './view.js';
import { makeTexts, levelKey, fmt, avisName, avisWhen } from './texts.js';

let uid = 0;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function createWorldPlan(container, options = {}) {
  const t = makeTexts(options.texts || {});
  const id = ++uid;
  const nowOf = () => (typeof options.now === 'function' ? options.now() : options.now) || new Date();

  const root = el('section', 'ow-plan');
  root.setAttribute('aria-labelledby', `ow-plan-title-${id}`);
  const h = el('h2', 'ow-plan-title', t('monde.plan.title'));
  h.id = `ow-plan-title-${id}`;
  h.tabIndex = -1;
  const intro = el('p', 'ow-plan-intro', t('monde.plan.intro'));
  const summary = el('ul', 'ow-plan-summary');
  const list = el('ol', 'ow-plan-sectors');
  root.append(h, intro, summary, list);
  container.appendChild(root);

  const items = {};
  const last = {};

  function names(ids) {
    const count = new Map();
    for (const n of ids) count.set(n, (count.get(n) || 0) + 1);
    return [...count].map(([n, k]) => (k > 1 ? `${n} (${k})` : n)).join(', ');
  }

  function sectorLines(v, s) {
    const sv = v.sectors[s];
    const lines = [];
    if (sv.visibility === 'brume') {
      return { title: t('monde.mist'), lines: [t('monde.mist.hint')], canShow: false };
    }
    const name = t(`sector.${s}.name`);
    if (sv.visibility === 'cendre') {
      lines.push(`${t('sector.closed')}.`);
      if (sv.lueur > 0) lines.push(`${t('monde.plaque.reserve', { n: fmt(sv.lueur) })}.`);
      lines.push(t('monde.plan.opens', { n: sv.chapter }));
      return { title: name, lines, canShow: true };
    }
    const lvl = t(levelKey(sv.stage));
    const val = sv.next ? t('monde.plaque.lueur', { n: fmt(sv.lueur), cible: sv.next.lueur }) : t('monde.plaque.full', { n: fmt(sv.lueur) });
    lines.push(t('monde.plan.stage', { etat: lvl, detail: val }));
    if (sv.stage === 0) lines.push(`${t('monde.tiles', { n: sv.lit })}.`);
    if (sv.next) lines.push(t('sector.level.next', { palier: t(levelKey(sv.stage + 1)), n: sv.next.lueur }));
    // l'établi non construit est un chantier sur la carte : il n'entre pas dans « Construit »
    const chantier = LANDMARKS.some((L) => L.sector === s && L.model === 'etabli') && v.landmarkState?.etabli !== 'construit';
    const built = LANDMARKS.filter((L) => L.sector === s && !(L.model === 'etabli' && chantier)).map((L) => {
      if (L.model === 'tour') return t(v.tourRepaired ? 'monde.obj.tour' : 'monde.obj.tour.abimee');
      return t(`monde.obj.${L.model}`);
    });
    for (const p of v.placements) if (p.sector === s) built.push(t(`monde.obj.${p.model}`));
    if (built.length) lines.push(t('monde.plan.built', { liste: names(built) }));
    if (chantier) lines.push(t('monde.plan.chantier'));
    if (s === 'champs' && v.plots.length) {
      const plots = v.plots.map((p) => {
        if (!p.crop) return t('monde.plan.plot.empty');
        const st = p.stage <= 0 ? t('monde.crop.state.0') : p.ripe ? t('monde.crop.state.ripe') : t('monde.crop.state.mid', { s: p.stage, n: p.need });
        return `${t(`monde.crop.${p.crop}`)} (${st})`;
      });
      lines.push(t('monde.plan.plots', { liste: plots.join(', ') }));
    }
    const veil = v.veils.find((x) => x.sector === s);
    if (veil) lines.push(veil.cells === 1 ? t('monde.plan.voile.one') : t('monde.plan.voile.other', { n: veil.cells }));
    return { title: name, lines, canShow: true };
  }

  function makeItem(s) {
    const li = el('li', 'ow-plan-sector');
    li.dataset.sector = s;
    const h3 = el('h3', 'ow-plan-name');
    const body = el('div', 'ow-plan-body');
    const btn = el('button', 'ow-plan-show', t('monde.plan.show'));
    btn.type = 'button';
    btn.dataset.sector = s;
    btn.tabIndex = -1;
    li.append(h3, body, btn);
    list.appendChild(li);
    items[s] = { li, h3, body, btn };
    return items[s];
  }

  function roving() {
    const btns = SECTOR_ORDER.map((s) => items[s]?.btn).filter((b) => b && !b.hidden);
    if (!btns.some((b) => b.tabIndex === 0) && btns[0]) btns[0].tabIndex = 0;
    return btns;
  }

  function render(game, tasks = []) {
    const v = deriveView(game, tasks, { now: nowOf(), anchors: options.anchors });
    // résumé
    const sum = [v.lisiere ? t('monde.plan.lisiere.on') : t('monde.plan.lisiere.off')];
    if (v.filLibre > 0) sum.push(t('monde.plan.fil', { n: fmt(v.filLibre) }));
    if (v.avis) {
      sum.push(t('monde.plan.avis', { nom: avisName(t, v.avis.id), au_secteur: t(`sector.${v.avis.sector}.in`), quand: avisWhen(t, v.avis.daysLeft), n: v.avis.braseros }));
    }
    if (v.crates.length) sum.push(v.crates.length === 1 ? t('monde.plan.crates.one') : t('monde.plan.crates.other', { n: v.crates.length }));
    const sk = sum.join('|');
    if (last.summary !== sk) {
      last.summary = sk;
      summary.replaceChildren(...sum.map((x) => el('li', '', x)));
    }
    // secteurs, dans l'ordre de la carte : ouverts, puis sous la cendre, puis la brume
    const order = SECTOR_ORDER.slice().sort((a, b) => {
      const rank = (s) => ({ open: 0, cendre: 1, brume: 2 })[v.sectors[s].visibility];
      return rank(a) - rank(b) || v.sectors[a].chapter - v.sectors[b].chapter;
    });
    for (const s of order) {
      const it = items[s] || makeItem(s);
      const m = sectorLines(v, s);
      const key = JSON.stringify(m) + v.sectors[s].visibility;
      if (last[s] !== key) {
        last[s] = key;
        it.li.dataset.vis = v.sectors[s].visibility;
        it.h3.textContent = m.title;
        it.body.replaceChildren(...m.lines.map((x) => el('p', '', x)));
        it.btn.hidden = !m.canShow;
        it.btn.setAttribute('aria-label', t('monde.plan.show.label', { secteur: t(`sector.${s}.the`) }));
      }
      list.appendChild(it.li); // garde l'ordre voulu sans recréer les nœuds
    }
    roving();
  }

  function onClick(ev) {
    const b = ev.target.closest('.ow-plan-show');
    if (!b) return;
    for (const x of roving()) x.tabIndex = x === b ? 0 : -1;
    options.onFocusSector?.(b.dataset.sector);
  }
  function onKey(ev) {
    const b = ev.target.closest('.ow-plan-show');
    if (!b) return;
    const btns = roving();
    const i = btns.indexOf(b);
    let j = -1;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') j = Math.min(btns.length - 1, i + 1);
    else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') j = Math.max(0, i - 1);
    else if (ev.key === 'Home') j = 0;
    else if (ev.key === 'End') j = btns.length - 1;
    if (j < 0) return;
    ev.preventDefault();
    for (const x of btns) x.tabIndex = -1;
    btns[j].tabIndex = 0;
    btns[j].focus();
  }
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);

  return {
    render,
    /** Donne le focus au titre du plan (utile quand on vient de l'afficher). */
    focus() { h.focus(); },
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}
