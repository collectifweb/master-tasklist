// Rendu du Fil du jour (quête n° 1 + deux alternatives) et de la liste complète, par identifiant.
import { topCards, listQuests } from '../../core/index.js';
import { t, tn } from '../content.js';
import { $, esc, icon, setText, setAttr, setHtml, reconcile } from './dom.js';
import { taskModel, metaItems, reasonText } from './model.js';

const metaLi = (it) =>
  `<li${it.cls ? ` class="${it.cls}"` : ''}>${it.icon ? icon(it.icon) : ''}${it.sr ? `<span class="sr-only">${esc(it.sr)}</span>` : ''}${esc(it.text)}</li>`;
const metaSpan = (it) =>
  `<span class="meta-item${it.cls ? ' ' + it.cls : ''}">${it.icon ? icon(it.icon) : ''}${it.sr ? `<span class="sr-only">${esc(it.sr)}</span>` : ''}${esc(it.text)}</span>`;

const READONLY_ID = 'fil-readonly';

// ───────── Fil du jour ─────────
export function renderFil(root, ctx) {
  const { tasks, now } = ctx;
  const cards = topCards(tasks, now);
  const art = $('#fil-quest', root);
  const empty = $('#fil-empty', root);
  if (!cards.first) {
    art.hidden = true;
    empty.hidden = false;
    $('#alts', root).hidden = true;
    return cards;
  }
  empty.hidden = true;
  art.hidden = false;
  const m = taskModel(cards.first, ctx);
  setAttr(art, 'data-task-id', m.id);
  setAttr(art, 'data-state', m.state);
  setText($('.fil-title', art), m.title);
  setText($('.cote-value', art.querySelector('.cote')), String(m.cote));
  for (const c of art.querySelectorAll('.cote')) setAttr(c, 'aria-label', `Cote ${m.cote}. ${t('quest.why')}`.replace('?', ' ?'));
  setHtml($('.meta', art), metaItems(m, { now, withSeance: false }).map(metaLi).join(''));
  setText($('.fil-reason > span', art), reasonText(m, now));
  art.classList.toggle('is-seance', m.seanceMinutes !== null);
  const complete = $('[data-action="complete"]', art);
  const start = $('[data-action="start"]', art);
  const doing = m.state === 'doing';
  setAttr(complete, 'aria-label', `Fait : ${m.title}`);
  setAttr(start, 'aria-pressed', String(doing));
  setText($('.start-label', start), doing ? t('fil.pause') : t('quest.start'));
  const use = start.querySelector('use');
  setAttr(use, 'href', `${use.getAttribute('href').split('#')[0]}#i-${doing ? 'pause' : 'start'}`);
  // quête en lecture seule : actions grisées, raison écrite
  for (const b of [complete, start]) {
    setAttr(b, 'aria-disabled', m.readonly ? 'true' : null);
    setAttr(b, 'aria-describedby', m.readonly ? READONLY_ID : null);
  }
  const ro = document.getElementById(READONLY_ID);
  ro.hidden = !m.readonly;
  return cards;
}

const ALT_KIND = {
  quick: { icon: 'quick', key: 'card.quick_win' },
  big: { icon: 'chantier', key: 'card.big_project' },
};

function altMarkup(kind) {
  const actions = kind === 'quick'
    ? `<button class="btn btn--primary" type="button" data-action="complete">${t('quest.done').replace(' ✓', '')} ${icon('check')}</button>
       <button class="btn btn--secondary" type="button" data-action="start">${icon('start')}<span class="start-label">${esc(t('quest.start'))}</span></button>`
    : `<button class="btn btn--secondary" type="button" data-action="start">${icon('start')}<span class="start-label">${esc(t('quest.start'))}</span></button>
       <button class="btn btn--quiet" type="button" data-action="split">${icon('split')}${esc(t('quest.split'))}</button>`;
  return `
    <button class="alt-row" type="button" aria-expanded="false" aria-controls="alt-${kind}">
      <span class="alt-text"><span class="alt-title"></span><span class="alt-kind"></span></span>
      <span class="cote cote--sm"><span class="cote-value"></span><span class="sr-only">de Cote</span></span>
      ${icon('chevron-down', 'alt-chevron')}
    </button>
    <div class="alt-panel" id="alt-${kind}"><div><div class="alt-body">
      <ul class="meta"></ul>
      <div class="fil-actions">${actions}</div>
    </div></div></div>`;
}

export function renderAlts(root, ctx, cards) {
  const ul = $('#alts', root);
  let any = false;
  for (const kind of ['quick', 'big']) {
    let li = ul.querySelector(`[data-kind="${kind}"]`);
    if (!li) {
      li = document.createElement('li');
      li.className = 'alt';
      li.dataset.kind = kind;
      li.innerHTML = altMarkup(kind);
      ul.append(li);
    }
    const task = cards[kind];
    li.hidden = !task;
    if (!task) continue;
    any = true;
    const m = taskModel(task, ctx);
    setAttr(li, 'data-task-id', m.id);
    setAttr(li, 'data-state', m.state);
    setText($('.alt-title', li), m.title);
    const steps = m.steps ? ` · ${t('step.progress', { fait: m.steps.done, total: m.steps.total })}` : '';
    setHtml($('.alt-kind', li), `${icon(ALT_KIND[kind].icon)}${esc(t(ALT_KIND[kind].key))} · ${esc(m.duration)}${esc(steps)}`);
    setText($('.cote-value', li), String(m.cote));
    setHtml($('.meta', li), metaItems(m, { now: ctx.now }).map(metaLi).join(''));
    const start = $('[data-action="start"]', li);
    const doing = m.state === 'doing';
    setText($('.start-label', start), doing ? t('fil.pause') : t('quest.start'));
    setAttr(start, 'aria-pressed', String(doing));
    const complete = $('[data-action="complete"]', li);
    for (const b of [complete, start, $('[data-action="split"]', li)]) {
      if (b) setAttr(b, 'aria-disabled', m.readonly ? 'true' : null);
    }
    if (complete) setAttr(complete, 'aria-label', `Fait : ${m.title}`);
  }
  ul.hidden = !any;
}

// ───────── Liste ─────────
function rowSkeleton(m) {
  const title = esc(m.title);
  const check = m.state === 'done'
    ? `<span class="quest-check" role="img" aria-label="${esc(t('status.done'))}"><span class="quest-check-ring">${icon('check')}</span></span>`
    : m.state === 'archived'
      ? `<span class="quest-icon" role="img" aria-label="${esc(t('status.archived'))}">${icon('archive')}</span>`
      : `<button class="quest-check" type="button" data-action="complete"><span class="quest-check-ring">${icon('check')}</span></button>`;
  const cote = m.cote !== null ? `<span class="cote cote--sm"><span class="cote-value"></span><span class="sr-only">de Cote</span></span>` : '';
  let aside = '';
  if (m.state === 'done') {
    aside = m.remballer
      ? `<div class="quest-aside"><button class="btn btn--quiet btn--small" type="button" data-action="remballer">${icon('undo')}${esc(t('quest.undo'))}</button></div>`
      : `<div class="quest-aside"><button class="btn btn--quiet btn--small" type="button" data-action="reopen">${icon('undo')}${esc(t('quest.reopen'))}</button></div>`;
  } else if (m.state === 'archived') {
    aside = `<div class="quest-aside"><button class="btn btn--quiet btn--small" type="button" data-action="unarchive">${icon('unarchive')}${esc(t('quest.unarchive'))}</button></div>`;
  }
  return `${check}<button class="quest-main" type="button" data-action="open"><span class="quest-text"><span class="quest-title">${title}</span><span class="meta"></span></span>${cote}</button>${aside}`;
}

function makeRow(m) {
  const li = document.createElement('li');
  li.className = 'quest';
  li.dataset.taskId = m.id;
  return li;
}

function patchRow(li, m, now) {
  const struct = `${m.state}|${m.remballer ? 'r' : ''}`;
  if (li._struct !== struct) { li.innerHTML = rowSkeleton(m); li._struct = struct; }
  setAttr(li, 'data-state', m.state);
  setAttr(li, 'data-late', m.deadline && m.deadline.late ? 'true' : null);
  setText($('.quest-title', li), m.title);
  setHtml($('.meta', li), metaItems(m, { now }).map(metaSpan).join(''));
  const cv = $('.cote-value', li);
  if (cv) setText(cv, String(m.cote));
  const check = $('button.quest-check', li);
  if (check) {
    setAttr(check, 'aria-label', `Marquer « ${m.title} » comme faite`);
    setAttr(check, 'aria-disabled', m.readonly ? 'true' : null);
  }
}

export function renderList(root, ctx, ui) {
  const { tasks, now } = ctx;
  const ul = $('#quest-list', root);
  const filters = { status: ui.status, quick: ui.quick, lowEnergy: ui.lowEnergy, thisWeek: ui.thisWeek, quartier: ui.quartier, search: ui.search };
  let items = listQuests(tasks, { sort: ui.sort, filters }, now);
  if (ui.sort === 'cote' && ui.status === 'done') items = items.slice().sort((a, b) => String(b.doneAt || '').localeCompare(String(a.doneAt || '')));
  if (ui.sort === 'cote' && ui.status === 'archived') items = items.slice().sort((a, b) => String(b.archivedAt || '').localeCompare(String(a.archivedAt || '')));
  reconcile(ul, items, (t0) => t0.id, makeRow.bind(null), (li, task) => patchRow(li, taskModel(task, ctx), now));

  // compteurs du contrôle de statut (sans les autres filtres)
  const count = (s) => tasks.filter((x) => x.status === s).length;
  for (const s of ['todo', 'done', 'archived']) setText($(`[data-count="${s}"]`, root), String(count(s)));
  const open = count('todo');
  setText($('#list-count', root), tn('list.open', open));

  // état vide
  const empty = $('#list-empty', root);
  const filtered = ui.quick || ui.lowEnergy || ui.thisWeek || ui.quartier || ui.search;
  ul.hidden = items.length === 0;
  empty.hidden = items.length > 0;
  if (!items.length) {
    const title = $('.empty-title', empty);
    const text = $('.empty-text', empty);
    const clear = $('[data-action="clear-filters"]', empty);
    if (filtered) {
      setText(title, t('state.empty.filter'));
      setText(text, ui.search ? t('state.empty.search', { recherche: ui.search }) : t('empty.filter.some'));
      clear.hidden = false;
    } else {
      setText(title, ui.status === 'done' ? t('state.empty.done') : ui.status === 'archived' ? t('state.empty.archived') : t('state.empty.list'));
      setText(text, '');
      clear.hidden = true;
    }
  }
  return items;
}
