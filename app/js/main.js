// Point d'entrée : branche l'état (store.js) sur l'écran (ui/*.js) et sur le monde (world-bridge.js).
import { SORTS, gameDay, isPinned, topCards, SEANCE_MAX_MINUTES } from '../core/index.js';
import { Store, POLL_MS } from './store.js';
import { token } from './api-client.js';
import { loadContent, t, content, pickReply, replyVars } from './content.js';
import { $, $$, esc, reducedMotion, setText, inlineSprite } from './ui/dom.js';
import { createHud } from './ui/hud.js';
import { createAnnounce, createVoice, summarize, gainList } from './ui/announce.js';
import { createSpeech } from './ui/speech.js';
import { createSync } from './ui/sync.js';
import { renderFil, renderAlts, renderList } from './ui/quests.js';
import { num, releveText } from './ui/format.js';
import {
  wireDialogs, openAdd, onAddInput, onAddSectorChange, readAdd, openFiche, refreshFiche, readFiche, openWhy,
  confirmDelete, confirmRemballer, openToken, openHelp, openVeille, openSheet, closeSheet, handleStep,
} from './ui/sheets.js';
import { initWorld } from './world-bridge.js';
import { createStory } from './ui/story.js';

const root = document.documentElement;
const app = $('#app');
const store = new Store();
const ui = { sort: 'cote', status: 'todo', quick: false, lowEnergy: false, thisWeek: false, quartier: null, search: '' };

const hud = createHud($('.hud'));
const announce = createAnnounce($('.announce-lane'), $('#live'));
// Dernière phrase lue : le passage du temps qui suit un geste (objectif atteint…) s'y ajoute au lieu de l'effacer.
let lastLive = { text: '', at: 0 };
const after = (text) => {
  const prev = Date.now() - lastLive.at < 1500 ? `${lastLive.text} ` : '';
  lastLive = { text: '', at: 0 };
  return prev + text;
};
const remember = (text) => { lastLive = { text, at: Date.now() }; return text; };
const speech = createSpeech(app);
const sync = createSync($('.panel-status'), {});
let world = null;
let worldPlan = null;
let started = false;
let touchFrom = null; // [x, y] du bouton « Fait » touché : le fil de lumière part de là

const ctx = () => ({ tasks: store.view.tasks, game: store.view.game, ledger: store.view.ledger, now: new Date() });
const story = createStory({
  ctx: () => (store.view ? ctx() : null),
  run: (action, params) => run(action, params),
  announce: (text) => announce.say(text),
  focusHome,
});
/** Le clavier repart du Fil du jour (« Fait » de la quête n° 1) quand une feuille ouverte seule se ferme. */
function focusHome() {
  const done = $('#fil-quest:not([hidden]) [data-action="complete"]');
  (done || $('.panel-head [data-action="add"]')).focus();
}
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
  // Les compteurs montent à l'impact du fil de lumière (onImpact du monde), pas avant. Sans monde : 320 ms de retard.
  // Filet : si l'impact n'arrive jamais (animation interrompue), les compteurs se mettent à jour au plus tard après 6 s.
  // Un rendu sans gain (la réponse du serveur, par exemple) ne doit pas griller l'impact : il attend lui aussi.
  if (deferHud && world) { hudPending = true; clearTimeout(hudTimer); hudTimer = setTimeout(flushHud, 6000); }
  else if (hudPending) { /* l'impact ou le filet mettra les compteurs à jour */ }
  else if (deferHud && !reducedMotion()) { clearTimeout(hudTimer); hudTimer = setTimeout(flushHud, 320); }
  else { clearTimeout(hudTimer); hud.render(c.game, { animate: true }); }
  if (world) world.render(c.game, c.tasks);
  if (worldPlan && $('#dlg-plan').open) worldPlan.render(c.game, c.tasks);
}
let hudPending = false;
function flushHud() {
  clearTimeout(hudTimer);
  hudPending = false;
  if (store.view) hud.render(store.view.game, { animate: true });
}

// ───────── Réactions à une action ─────────
function react(payload) {
  const { action, params = {}, events = [], result, now } = payload;
  const s = summarize(events);
  const created = action === 'createQuest' ? ((result.ops || []).find((o) => o.type === 'task.upsert') || {}).task?.id : null;
  const taskId = params.id || created || (events.find((e) => e.type === 'reward' && e.taskId) || {}).taskId || null;
  const task = findTask(taskId) || (result && result.tasks.find((x) => x.id === taskId)) || null;
  const title = task ? task.task : '';
  const reply = speech.react({ action, params, events, task, now: now || new Date() });
  const replyText = reply ? ` ${reply.nom} : ${reply.texte}` : '';
  const gains = gainList(s);
  const fanal = SEANCE_ACTIONS.has(action) ? fanalSay(events, title) : '';

  if (['completeQuest', 'createQuest', 'toggleStep', 'openApp', 'claimBonus', 'advanceTime'].includes(action) && gains.length) {
    const head = action === 'completeQuest' || (action === 'createQuest' && params.alreadyDone) ? t('sr.quest.done', { quete: title })
      : action === 'createQuest' ? t('sr.added', { quete: title })
        : action === 'toggleStep' ? t('sr.step.done', { etape: ((task && task.steps) || []).find((x) => x.id === params.stepId)?.label || '', fait: (task.steps || []).filter((x) => x.done).length, total: (task.steps || []).length })
          : action === 'advanceTime' ? timeSay(events) : '';
    const liveText = `${head}${fanal ? ' ' + fanal : ''} ${t('sr.gains', { liste: gains.join(', ') })}${replyText}`.trim();
    announce.show(s, 'gain', { liveText: action === 'advanceTime' ? after(liveText) : remember(liveText) });
    return;
  }
  if (action === 'completeQuest' && s.noGain) {
    announce.show(s, 'none', { liveText: `${t('sr.quest.done', { quete: title })}${fanal ? ' ' + fanal : ''} ${t('sr.repeat_zero')}` });
    return;
  }
  if (action === 'remballerQuest') {
    const e = (result.entries || [])[0];
    const list = e ? [e.energy && `${num(e.energy)} ${t('resource.energy')}`, e.materials && `${num(e.materials)} ${t('resource.materials.other')}`].filter(Boolean) : [];
    announce.show(s, 'undo', { liveText: `${t('sr.quest.undone', { quete: title })}${list.length ? ' ' + t('sr.undone.gains', { liste: list.join(', ') }) : ''}${fanal ? ' ' + fanal : ''}${replyText}` });
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
  if (say) return announce.say(remember(say() + (fanal ? ' ' + fanal : '') + replyText));
  if (action === 'advanceTime') { const text = timeSay(events); if (text) announce.say(after(text)); }
}

// Côte à côte : une phrase au début de la séance, une à la fin, jamais pendant. Après Pause ou Fait, une quête qui a
// pris plus de deux fois sa durée estimée reçoit une proposition de découpage (zone d'état), lue avec la fin.
const SEANCE_ACTIONS = new Set(['startQuest', 'pauseQuest', 'completeQuest', 'remballerQuest', 'archiveQuest', 'deleteQuest']);
function fanalSay(events, title) {
  if (events.some((e) => e.type === 'seance-debut')) { sync.closeOffer(); return t('sr.seance.start'); }
  const fin = events.find((e) => e.type === 'seance-fin');
  if (!fin) return '';
  const text = fin.oubliee ? t('sr.seance.oubliee', { duree: releveText(SEANCE_MAX_MINUTES) }) : t('sr.seance.stop', { duree: releveText(fin.minutes) });
  if (!fin.decoupage) return text;
  const offer = t('offer.split', { quete: title });
  sync.offer({ taskId: fin.taskId, text: offer });
  return `${text} ${offer}`;
}

/** Phrase lue après le passage du temps : une séance oubliée qui se ferme d'elle-même. */
function timeSay(events) {
  const out = [];
  for (const e of events) {
    if (e.type === 'seance-fin' && e.raison === 'oubliee') out.push(t('sr.seance.oubliee', { duree: releveText(SEANCE_MAX_MINUTES) }));
  }
  return out.join(' ');
}

/** Événements du jeu + ceux que seule l'interface connaît : objet-reflet de la quête faite. */
function worldEvents(payload) {
  const events = [...((payload && payload.events) || [])];
  if (!world || !payload || !payload.action) return events;
  const { action, params = {}, result } = payload;
  const done = action === 'completeQuest' || (action === 'createQuest' && params.alreadyDone);
  if (done && result) {
    const id = params.id || ((result.ops || []).find((o) => o.type === 'task.upsert') || {}).task?.id;
    const gained = events.some((e) => e.type === 'reward');
    const after = result.tasks;
    if (gained && id) {
      const prior = after.map((x) => (x.id === id ? { ...x, status: 'todo', doneAt: null } : x));
      events.push(...world.refletEvents(result.game, after, prior));
    }
  }
  return events;
}

store.on('change', (payload) => {
  const events = (payload && payload.events) || [];
  renderAll({ deferHud: events.some((e) => e.type === 'reward') });
  if (payload && payload.action && started) react(payload);
  if (world && events.length) {
    const from = touchFrom && Date.now() - touchFrom.at < 4000 ? [touchFrom.x, touchFrom.y] : undefined;
    touchFrom = null;
    const run = world.play(worldEvents(payload), { from });
    Promise.resolve(run).then(() => {
      if (hudPending) flushHud();
      // plus aucune quête ouverte après un « Fait » : la visite se termine d'elle-même
      if (payload.action === 'completeQuest' && !topCards(store.view.tasks, new Date()).first) setTimeout(endVisit, 600);
    });
  }
});
store.on('sync', (s) => sync.set(s));
store.on('notice', (n) => sync.notice(n));
const askToken = (locked = 0) => openToken(
  // pendant un blocage, le nouveau code attend : la feuille se rouvre avec le temps qui reste
  () => (store.lockLeft() ? askToken(store.lockLeft()) : started ? store.retryNow() : start()),
  { bad: token.has() && !locked, locked },
);
store.on('need-token', (p) => askToken((p && p.locked) || 0));

// Après ces gestes, le temps du jeu avance (séance oubliée refermée) : advanceTime est idempotente.
const AFTER_TIME = new Set(['completeQuest', 'createQuest', 'toggleStep']);

/** Lance une action ; un refus du jeu (message en français) s'affiche en message court, rien n'est modifié. */
function run(action, params) {
  let r;
  try {
    r = store.do(action, params);
  } catch (err) {
    sync.notice({ kind: 'info', text: err.message });
    return null;
  }
  if (AFTER_TIME.has(action)) advanceTime();
  return r;
}
function advanceTime() {
  try { store.do('advanceTime', {}); } catch { /* état illisible : on réessaiera au prochain geste */ }
}

// ───────── Panneau ─────────
function setPanel(open) {
  app.dataset.panel = open ? 'open' : 'peek';
  const toggle = $('[data-action="toggle-panel"]');
  toggle.setAttribute('aria-expanded', String(open));
  setText($('.panel-toggle-label', toggle), open ? t('panel.less') : t('panel.more'));
  if (!open) $('#panel-scroll').scrollTop = 0;
}

// Panneau replié : si le clavier envoie le focus sur un élément qui dépasse la partie visible, on ouvre le panneau
// plutôt que de laisser le contenu glisser sous l'en-tête.
document.addEventListener('focusin', (e) => {
  // au clavier seulement : un toucher sur « Fait » pendant que le panneau finit de bouger ne doit pas l'ouvrir
  if (app.dataset.panel !== 'peek' || !e.target.closest || !e.target.closest('#panel-scroll') || !e.target.matches(':focus-visible')) return;
  const r = e.target.getBoundingClientRect();
  if (r.bottom > window.innerHeight || r.top < $('#panel-scroll').getBoundingClientRect().top) setPanel(true);
});

// ───────── Monde : sélection d'un quartier, carte en liste ─────────
/** Toucher un quartier de la carte : la liste ne montre que les quêtes de ce quartier, et le panneau s'ouvre. */
function filterByQuartier(id) {
  ui.quartier = id;
  for (const c of $$('.chip[data-quartier]')) c.setAttribute('aria-pressed', String(c.dataset.quartier === id));
  renderAll();
  setPanel(true);
}
/** Toucher la carte : une caisse ouvre sa quête ; un quartier ou l'un de ses repères filtre la liste sur lui. */
function onWorldSelect(info) {
  if (!info) return;
  if (info.taskId) { if (findTask(info.taskId)) openFiche(ctx(), info.taskId); return; }
  if (info.sector) filterByQuartier(info.sector);
}
// La fiche ouverte par un toucher sur la carte se ferme : l'objet n'est plus sélectionné (le toucher suivant la rouvre)
$('#dlg-fiche').addEventListener('close', () => { if (world) world.clearSelection(); });

/** Fin de visite : « Tout est enregistré, à demain ». Fermée, elle laisse le monde allumer ses lanternes. */
function endVisit() {
  if (!started || document.querySelector('dialog[open]')) return;
  const c = ctx();
  const next = topCards(c.tasks, c.now).first;
  const reply = pickReply('visit.end', { now: c.now, quartier: 'place', length: 0, vars: replyVars(null, 'place') }, { gate: false });
  const sync = store.sync || {};
  openVeille({
    next, reply,
    saved: (sync.state === 'idle' || sync.state === 'saved') && !sync.pending,
    onClose: () => { if (world) world.play([{ type: 'veille' }]); },
  });
}
function openPlan() {
  if (!worldPlan) return;
  const c = ctx();
  worldPlan.render(c.game, c.tasks);
  openSheet($('#dlg-plan'));
  worldPlan.focus();
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
    if (target.dataset.quartier) {
      $$('.chip[data-quartier]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      ui.quartier = on ? target.dataset.quartier : null;
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
    case 'complete': {
      const r = target.getBoundingClientRect();
      touchFrom = { x: r.left + r.width / 2, y: r.top + r.height / 2, at: Date.now() };
      return run('completeQuest', { id });
    }
    case 'open-plan': return openPlan();
    case 'open-settings': return story.openSettings();
    case 'open-review': return story.openReview();
    case 'review-keep': case 'review-archive': return story.reviewAction(action, target.dataset.id);
    case 'start':
      if (!task) return;
      return run(isPinned(task) ? 'pauseQuest' : 'startQuest', { id });
    case 'split':
      if (target.closest('#offer')) { sync.closeOffer(); if (!task) return; } // proposition de découpage (Côte à côte)
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
      Object.assign(ui, { quick: false, lowEnergy: false, thisWeek: false, quartier: null, search: '' });
      $$('.chips .chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      $('#search').value = ''; $('.search-clear').hidden = true;
      return renderAll();
    case 'sync-retry': return store.retryNow();
    case 'notice-close': return sync.closeNotice();
    case 'offer-close': return sync.closeOffer();
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
  } else if (e.target.id === 'settings-form') {
    e.preventDefault();
    story.saveSettings(e.target);
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
  for (const el of $$('[data-t]')) setText(el, t(el.dataset.t)); // libellés posés dans la page, textes dans interface.json
  await inlineSprite();
  try {
    await store.load();
  } catch (err) {
    if (err.status === 401) return store.emit('need-token', {});
    if (err.status === 429) return store.emit('need-token', { locked: store.lockLeft() });
    return showLoadError(t('load.fail.text'));
  }
  renderAll();
  started = true;
  // ouverture du jour, puis le temps du jeu ; l'accueil vient quand le monde est prêt
  run('openApp', {});
  advanceTime();
  playedDay = gameDay(new Date());
  initWorld({
    container: $('#world-live'), slot: $('.world-slot'), content,
    now: () => new Date(), reducedMotion,
    announce: createVoice($('#live-world')),
    onImpact: () => { if (hudPending) flushHud(); },
    onSelect: onWorldSelect,
  }).then((w) => {
    world = w;
    setTimeout(() => story.welcome(), world ? 400 : 0);
    if (!world) return;
    world.render(store.view.game, store.view.tasks);
    const host = $('#dlg-plan');
    host.innerHTML = `<header class="sheet-head"><span></span><button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('plan.close'))}"><svg class="icon" aria-hidden="true"><use href="${document.querySelector('.res-tile use').getAttribute('href').split('#')[0]}#i-x"/></svg></button></header><div class="sheet-body" id="plan-host"></div>`;
    worldPlan = world.plan($('#plan-host'), {
      onFocusSector: (id) => { closeSheet(host); setPanel(false); world.focusSector(id); },
      onFilter: (id) => { closeSheet(host); filterByQuartier(id); },
    });
    host.setAttribute('aria-labelledby', $('#plan-host .ow-plan-title').id);
    $('[data-action="open-plan"]').hidden = false;
  });
}

/** Changement de jour de jeu (4 h, Montréal) : ouverture du jour, temps du jeu, accueil (lettre, bilan). */
let playedDay = null;
function tickDay() {
  if (!started || !store.view) return;
  const day = gameDay(new Date());
  if (day !== playedDay) {
    playedDay = day;
    run('openApp', {});
    advanceTime();
    story.welcome();
  }
}

// relecture régulière (30 s, page visible) et au retour sur la page
setInterval(() => { if (started && document.visibilityState === 'visible') store.refresh(); }, POLL_MS);
setInterval(() => { if (started) { tickDay(); renderAll(); } }, 60000); // durées « En cours depuis… », jour de jeu
document.addEventListener('visibilitychange', () => {
  if (!started || document.visibilityState !== 'visible') return;
  store.refresh({ force: true });
  if (gameDay(new Date()) !== playedDay) tickDay();
  else advanceTime(); // idempotente : ne fait rien si rien n'a bougé
});

// Installation sur l'écran d'accueil : le service worker garde la coquille pour un lancement hors ligne
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* sans cache hors ligne */ }); });
}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { if (world) world.setReducedMotion(reducedMotion()); });
wireDialogs();
start();
