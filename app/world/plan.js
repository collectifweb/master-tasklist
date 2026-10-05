// Carte en liste : la même île, en liste. Mêmes données que la carte (view.js), lisible au lecteur d'écran
// et au clavier. Les boutons « Voir sur la carte » et « Ses quêtes » forment un seul arrêt de tabulation
// (↑ ↓ Début Fin).
//
//   const plan = createWorldPlan(conteneur, { texts, anchors, now, onFocusSector, onFilter });
//   plan.render(game, tasks); plan.focus(); plan.destroy();
import { SECTOR_ORDER } from './layout.js';
import { deriveView } from './view.js';
import { makeTexts, tachesText } from './texts.js';
import { QUARTIERS } from '../core/domains.js';

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

  function sectorLines(v, s) {
    const sv = v.sectors[s];
    const name = t(`quartier.${s}.name`);
    const nx = sv.suivant;
    return {
      title: `${name} · ${t('monde.niveau', { n: sv.niveau })}`,
      lines: [t('monde.progres', { Quartier: name, taches: tachesText(t, nx.encore, QUARTIERS[s]?.domain), suivant: nx.niveau })],
    };
  }

  function makeItem(s) {
    const li = el('li', 'ow-plan-sector');
    li.dataset.sector = s;
    const h3 = el('h3', 'ow-plan-name');
    const body = el('div', 'ow-plan-body');
    const acts = el('div', 'ow-plan-acts');
    const btn = el('button', 'ow-plan-show', t('monde.plan.show'));
    btn.type = 'button';
    btn.dataset.sector = s;
    btn.tabIndex = -1;
    btn.setAttribute('aria-label', t('monde.plan.show.label', { secteur: t(`quartier.${s}.the`) }));
    const quests = el('button', 'ow-plan-show ow-plan-quests', t('monde.plan.quests'));
    quests.type = 'button';
    quests.dataset.sector = s;
    quests.dataset.filter = '';
    quests.tabIndex = -1;
    quests.setAttribute('aria-label', t('monde.plan.quests.label', { du_secteur: t(`quartier.${s}.of`) }));
    acts.append(btn, quests);
    li.append(h3, body, acts);
    list.appendChild(li);
    items[s] = { li, h3, body, btn, quests };
    return items[s];
  }

  function roving() {
    const btns = SECTOR_ORDER.flatMap((s) => (items[s] ? [items[s].btn, items[s].quests] : []));
    if (!btns.some((b) => b.tabIndex === 0) && btns[0]) btns[0].tabIndex = 0;
    return btns;
  }

  function render(game, tasks = []) {
    const v = deriveView(game, tasks, { now: nowOf(), anchors: options.anchors });
    // résumé : les caisses d'échéance (rien quand il n'y en a pas)
    const sum = v.crates.length ? [v.crates.length === 1 ? t('monde.plan.crates.one') : t('monde.plan.crates.other', { n: v.crates.length })] : [];
    const sk = sum.join('|');
    if (last.summary !== sk) {
      last.summary = sk;
      summary.replaceChildren(...sum.map((x) => el('li', '', x)));
      summary.hidden = !sum.length;
    }
    // quartiers, dans l'ordre de la carte (tous ouverts)
    for (const s of SECTOR_ORDER) {
      const it = items[s] || makeItem(s);
      const m = sectorLines(v, s);
      const key = JSON.stringify(m);
      if (last[s] !== key) {
        last[s] = key;
        it.h3.textContent = m.title;
        it.body.replaceChildren(...m.lines.map((x) => el('p', '', x)));
      }
    }
    roving();
  }

  function onClick(ev) {
    const b = ev.target.closest('.ow-plan-show');
    if (!b) return;
    for (const x of roving()) x.tabIndex = x === b ? 0 : -1;
    if ('filter' in b.dataset) options.onFilter?.(b.dataset.sector);
    else options.onFocusSector?.(b.dataset.sector);
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
