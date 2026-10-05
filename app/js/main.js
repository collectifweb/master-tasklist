// Point d'entrée : branche l'état (store.js) sur l'écran (ui/*.js) et sur le monde (world-bridge.js).
import { SORTS, gameDay, isPinned } from '../core/index.js';
import { Store, POLL_MS } from './store.js';
import { token } from './api-client.js';
import { loadContent, t } from './content.js';
import { $, $$, reducedMotion, setText, inlineSprite } from './ui/dom.js';
import { createHud } from './ui/hud.js';
import { createAnnounce, summarize, gainList } from './ui/announce.js';
import { createSpeech } from './ui/speech.js';
import { createSync } from './ui/sync.js';
import { renderFil, renderAlts, renderList } from './ui/quests.js';
import { num } from './ui/format.js';
import {
  wireDialogs, openAdd, onAddInput, onAddSectorChange, readAdd, openFiche, refreshFiche, readFiche, openWhy,
  confirmDelete, confirmRemballer, openToken, openHelp, closeSheet, handleStep,
} from './ui/sheets.js';
import { initWorld } from './world-bridge.js';

const root = document.documentElement;
const app = $('#app');
const store = new Store();
const ui = { sort: 'cote', status: 'todo', quick: false, lowEnergy: false, thisWeek: false, sector: null, search: '' };

const hud = createHud($('.hud'));
const announce = createAnnounce($('.announce-lane'), $('#live'));
const speech = createSpeech(app);
const sync = createSync($('.panel-status'), {});
let world = null;
let started = false;

const ctx = () => ({ tasks: store.view.tasks, game: store.view.game, ledger: store.view.ledger, now: new Date() });
const findTask = (id) => (id ? store.view.tasks.find((x) => x.id === id) || null : null);

// ───────── Rendu ─────────
let hudTimer = null;
function renderAll({ deferHud = false } = {}) {
  if (!store.view) return;
  const c = ctx();
  $('#fil-skeleton').hidden = true;
  $('#load-error').hidden = true;
  const cards = renderFil($('#panel-scroll'), c);
  renderAlts($('#panel-scroll'), c, cards);
  renderList($('#panel-scroll'), c, ui);
  refreshFiche(c);
  setText($('#panel-date'), new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Montreal' })
    .format(new Date(gameDay(c.now) + 'T12:00:00Z')));
  clearTimeout(hudTimer);
  if (deferHud && !reducedMotion()) hudTimer = setTimeout(() => hud.render(c.game, { animate: true }), 320);
  else hud.render(c.game, { animate: true });
  if (world) world.render(c.game, c.tasks);
}

// ───────── Réactions à une action ─────────
function react(payload) {
  const { action, params = {}, events = [], result, now } = payload;
  const c = ctx();
  const s = summarize(events);
  const created = action === 'createQuest' ? ((result.ops || []).find((o) => o.type === 'task.upsert') || {}).task?.id : null;
  const taskId = params.id || created || (events.find((e) => e.type === 'reward' && e.taskId) || {}).taskId || null;
  const task = findTask(taskId) || (result && result.tasks.find((x) => x.id === taskId)) || null;
  const title = task ? task.task : '';
  const reply = speech.react({ action, params, events, task, game: c.game, now: now || new Date() });
  const replyText = reply ? ` ${reply.nom} : ${reply.texte}` : '';
  const gains = gainList(s);

  if (['completeQuest', 'createQuest', 'toggleStep', 'openApp', 'claimBonus'].includes(action) && gains.length) {
    const head = action === 'completeQuest' || (action === 'createQuest' && params.alreadyDone) ? t('sr.quest.done', { quete: title })
      : action === 'createQuest' ? t('sr.added', { quete: title })
        : action === 'toggleStep' ? t('sr.step.done', { etape: ((task && task.steps) || []).find((x) => x.id === params.stepId)?.label || '', fait: (task.steps || []).filter((x) => x.done).length, total: (task.steps || []).length })
          : '';
    announce.show(s, 'gain', { liveText: `${head} ${t('sr.gains', { liste: gains.join(', ') })}${replyText}`.trim() });
    return;
  }
  if (action === 'completeQuest' && s.noGain) {
    announce.show(s, 'none', { liveText: `${t('sr.quest.done', { quete: title })} ${t('sr.repeat_zero')}` });
    return;
  }
  if (action === 'remballerQuest') {
    const e = (result.entries || [])[0];
    const list = e ? [e.energy && `${num(e.energy)} ${t('resource.energy')}`, e.materials && `${num(e.materials)} ${t('resource.materials.other')}`].filter(Boolean) : [];
    announce.show(s, 'undo', { liveText: `${t('sr.quest.undone', { quete: title })}${list.length ? ' ' + t('sr.undone.gains', { liste: list.join(', ') }) : ''}${replyText}` });
    return;
  }
  const say = {
    startQuest: () => t('sr.quest.started', { quete: title }),
    pauseQuest: () => t('sr.paused', { quete: title }),
    archiveQuest: () => t('sr.archived', { quete: title }),
    unarchiveQuest: () => t('sr.unarchived', { quete: title }),
    deleteQuest: () => t('sr.deleted', { quete: title }),
    reopenQuest: () => t('sr.reopened', { quete: title }),
    createQuest: () => t('sr.added', { quete: title }),
  }[action];
  if (say) announce.say(say() + replyText);
}

store.on('change', (payload) => {
  const events = (payload && payload.events) || [];
  renderAll({ deferHud: events.some((e) => e.type === 'reward' || e.type === 'lisiere-allumee') });
  if (payload && payload.action && started) react(payload);
  if (world && payload && payload.events && payload.events.length) world.play(payload.events);
});
store.on('sync', (s) => sync.set(s));
store.on('notice', (n) => sync.notice(n));
store.on('need-token', () => openToken(() => (started ? store.retryNow() : start()), { bad: token.has() }));

/** Lance une action ; un refus du jeu (message en français) s'affiche en message court, rien n'est modifié. */
function run(action, params) {
  try {
    return store.do(action, params);
  } catch (err) {
    sync.notice({ kind: 'info', text: err.message });
    return null;
  }
}

// ───────── Panneau ─────────
function setPanel(open) {
  app.dataset.panel = open ? 'open' : 'peek';
  const toggle = $('[data-action="toggle-panel"]');
  toggle.setAttribute('aria-expanded', String(open));
  setText($('.panel-toggle-label', toggle), open ? t('panel.less') : t('panel.more'));
  if (!open) $('#panel-scroll').scrollTop = 0;
}

// ───────── Clics ─────────
const idOf = (el) => (el.closest('[data-task-id]') || {}).dataset?.taskId || null;
const disabled = (el) => el.getAttribute('aria-disabled') === 'true';

document.addEventListener('click', (e) => {
  const target = e.target.closest('button, [data-action], [data-close], input[data-action]');
  if (!target) return;

  if (target.hasAttribute('data-close')) return closeSheet(target.closest('dialog'));
  if (target.matches('.alt-row')) {
    const open = target.getAttribute('aria-expanded') !== 'true';
    target.setAttribute('aria-expanded', String(open));
    target.closest('.alt').classList.toggle('is-open', open);
    return;
  }
  if (target.matches('.chip[aria-pressed]')) {
    const on = target.getAttribute('aria-pressed') !== 'true';
    if (target.dataset.sector) {
      $$('.chip[data-sector]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      ui.sector = on ? target.dataset.sector : null;
    } else {
      ui[target.dataset.filter] = on;
    }
    target.setAttribute('aria-pressed', String(on));
    return renderAll();
  }
  if (target.dataset.step) return handleStep(target);

  const action = target.dataset.action;
  const id = idOf(target);
  const task = findTask(id);

  if (disabled(target) && ['complete', 'start', 'split', 'archive', 'unarchive', 'delete', 'reopen', 'remballer'].includes(action)) {
    if (task && task.readonly) sync.notice({ kind: 'info', text: t('readonly.reason') });
    return;
  }

  switch (action) {
    case 'toggle-panel': return setPanel(app.dataset.panel !== 'open');
    case 'add': return openAdd();
    case 'res-help': return openHelp(target.dataset.res);
    case 'why': return openWhy(ctx(), id);
    case 'open': return openFiche(ctx(), id);
    case 'complete': return run('completeQuest', { id });
    case 'start':
      if (!task) return;
      return run(isPinned(task) ? 'pauseQuest' : 'startQuest', { id });
    case 'split':
      openFiche(ctx(), id);
      return $('#fiche-step-new').focus();
    case 'reopen': return run('reopenQuest', { id });
    case 'archive': case 'unarchive': {
      const inFiche = !!target.closest('#dlg-fiche'); // avant l'action : le rendu remplace les boutons de la fiche
      const r = run(action === 'archive' ? 'archiveQuest' : 'unarchiveQuest', { id });
      if (r && inFiche) closeSheet($('#dlg-fiche'));
      return;
    }
    case 'remballer':
      return confirmRemballer().then((ok) => { if (ok) run('remballerQuest', { id }); });
    case 'delete':
      if (!task) return;
      return confirmDelete(ctx(), task).then((ok) => {
        if (!ok) return;
        if (run('deleteQuest', { id })) closeSheet($('#dlg-fiche'));
      });
    case 'step-toggle': {
      const stepId = target.closest('.step').dataset.stepId;
      if (!run('toggleStep', { id, stepId, done: target.checked })) target.checked = !target.checked;
      return;
    }
    case 'step-remove': return run('removeStep', { id, stepId: target.closest('.step').dataset.stepId });
    case 'step-add': return addStepFromInput(id);
    case 'search-clear': {
      const input = $('#search');
      input.value = ''; ui.search = ''; target.hidden = true; input.focus();
      return renderAll();
    }
    case 'clear-filters':
      Object.assign(ui, { quick: false, lowEnergy: false, thisWeek: false, sector: null, search: '' });
      $$('.chips .chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      $('#search').value = ''; $('.search-clear').hidden = true;
      return renderAll();
    case 'sync-retry': return store.retryNow();
    case 'notice-close': return sync.closeNotice();
    case 'reload': return start();
  }
});

function addStepFromInput(id) {
  const input = $('#fiche-step-new');
  const label = input.value.trim();
  if (!label) return input.focus();
  if (run('addStep', { id, label })) { input.value = ''; input.focus(); }
}

// ───────── Saisie, formulaires ─────────
document.addEventListener('input', (e) => {
  if (e.target.id === 'search') {
    ui.search = e.target.value.trim();
    $('.search-clear').hidden = e.target.value === '';
    renderAll();
  } else if (e.target.id === 'add-title') onAddInput(e.target);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'sort') { ui.sort = e.target.value; renderAll(); }
  else if (e.target.name === 'statut') { ui.status = e.target.value; renderAll(); }
  else if (e.target.name === 'add-sector') onAddSectorChange();
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'add-form') {
    e.preventDefault();
    const params = readAdd();
    if (!params) return;
    if (run('createQuest', params)) closeSheet($('#dlg-add'));
  } else if (e.target.id === 'fiche-form') {
    e.preventDefault();
    const r = readFiche(ctx());
    if (r.error) { sync.notice({ kind: 'info', text: r.error }); return; }
    if (!Object.keys(r.patch).length || run('updateQuest', r)) closeSheet($('#dlg-fiche'));
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'fiche-step-new') { e.preventDefault(); addStepFromInput($('#dlg-fiche').dataset.taskId); }
  if (e.key === 'Escape' && app.dataset.panel === 'open' && !document.querySelector('dialog[open]')) {
    setPanel(false);
    $('[data-action="toggle-panel"]').focus();
  }
});

// ───────── Démarrage ─────────
function fillSortOptions() {
  const sel = $('#sort');
  if (sel.options.length) return;
  for (const s of SORTS) sel.add(new Option(t('sort.' + s.id) === 'sort.' + s.id ? s.label : t('sort.' + s.id), s.id));
  sel.value = ui.sort;
}

function showLoadError(text) {
  $('#fil-skeleton').hidden = true;
  $('#load-error').hidden = false;
  setText($('#load-error-text'), text);
}

async function start() {
  $('#load-error').hidden = true;
  $('#fil-skeleton').hidden = false;
  try {
    await loadContent();
  } catch {
    return showLoadError(t('load.fail.text'));
  }
  fillSortOptions();
  await inlineSprite();
  try {
    await store.load();
  } catch (err) {
    if (err.status === 401) return store.emit('need-token', {});
    return showLoadError(t('load.fail.text'));
  }
  renderAll();
  started = true;
  run('openApp', {});
  initWorld({ container: $('#world-live'), slot: $('.world-slot'), store, reducedMotion }).then((w) => {
    world = w;
    if (world) world.render(store.view.game, store.view.tasks);
  });
}

// relecture régulière (30 s, page visible) et au retour sur la page
setInterval(() => { if (started && document.visibilityState === 'visible') store.refresh(); }, POLL_MS);
setInterval(() => { if (started) renderAll(); }, 60000); // durées « En cours depuis… », jour de jeu
document.addEventListener('visibilitychange', () => {
  if (started && document.visibilityState === 'visible') store.refresh({ force: true });
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { if (world) world.setReducedMotion(reducedMotion()); });
wireDialogs();
start();
