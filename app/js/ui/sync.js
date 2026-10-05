// Indicateur de synchronisation (.sync[data-sync]) et messages courts (.sync, valeur « saved » neutre ou « error »).
// Proposition de découpage (#offer, Côte à côte) : même ligne neutre, sans délai ; elle reste jusqu'à un geste.
import { t, tn } from '../content.js';
import { $, esc, icon, setHtml } from './dom.js';
import { timeOf } from './format.js';

export function createSync(root, { onRetry }) {
  const el = $('#sync', root);
  const noticeEl = $('#notice', root);
  const offerEl = $('#offer', root);
  const app = $('#app');
  let hideTimer = null;
  let noticeTimer = null;
  // le panneau replié doit grandir de la hauteur réelle de cette zone, sinon « Fait » passe sous le bord de l'écran
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => app.style.setProperty('--status-h', `${Math.ceil(root.getBoundingClientRect().height)}px`)).observe(root);
  }

  function status() {
    app.dataset.status = !el.hidden || !noticeEl.hidden || !offerEl.hidden ? '1' : '';
    if (!app.dataset.status) delete app.dataset.status;
  }

  function set(sync) {
    clearTimeout(hideTimer);
    const { state, message, detail, pending } = sync;
    if (state === 'idle') { el.hidden = true; status(); return; }
    el.hidden = false;
    el.dataset.sync = state;
    el.setAttribute('role', state === 'error' ? 'alert' : 'status');
    let html = '';
    if (state === 'offline') {
      const waiting = pending ? ' ' + tn('state.offline.pending', pending) : '';
      html = `${icon('offline')}<p class="sync-text"><strong>${esc(t('sync.offline.title'))}</strong>${esc(t('state.offline'))}${esc(waiting)}</p>`;
    } else if (state === 'error') {
      html = `${icon('cloud-alert')}<p class="sync-text"><strong>${esc(detail || t('sync.error.title'))}</strong>${esc(message || t('state.sync.error'))}</p>
        <button class="btn btn--secondary btn--small" type="button" data-action="sync-retry">${icon('refresh')}${esc(t('state.sync.retry'))}</button>`;
    } else if (state === 'saving') {
      html = `${icon('spinner', 'spin')}<p class="sync-text">${esc(message || t('sync.saving'))}</p>`;
    } else {
      html = `${icon('cloud-ok')}<p class="sync-text">${esc(t('sync.saved', { heure: timeOf(new Date().toISOString()) }))}</p>`;
      hideTimer = setTimeout(() => { el.hidden = true; status(); }, 2500);
    }
    setHtml(el, html);
    status();
  }

  function notice({ kind = 'info', text }) {
    clearTimeout(noticeTimer);
    noticeEl.hidden = false;
    noticeEl.dataset.sync = kind === 'error' ? 'error' : 'saved';
    setHtml(noticeEl, `${icon(kind === 'error' ? 'cloud-alert' : 'why')}<p class="sync-text">${esc(text)}</p>
      <button class="btn btn--quiet btn--icon" type="button" data-action="notice-close" aria-label="${esc(t('notice.dismiss'))}">${icon('x')}</button>`);
    status();
    if (kind !== 'error') noticeTimer = setTimeout(closeNotice, 9000);
  }
  function closeNotice() { clearTimeout(noticeTimer); noticeEl.hidden = true; status(); }

  /** Propose de découper la quête `taskId` en étapes (le bouton ouvre l'éditeur d'étapes de sa fiche). */
  function offer({ taskId, text }) {
    offerEl.hidden = false;
    offerEl.dataset.taskId = taskId;
    setHtml(offerEl, `${icon('split')}<p class="sync-text">${esc(text)}</p>
      <button class="btn btn--secondary btn--small" type="button" data-action="split">${esc(t('quest.split'))}</button>
      <button class="btn btn--quiet btn--icon" type="button" data-action="offer-close" aria-label="${esc(t('notice.dismiss'))}">${icon('x')}</button>`);
    status();
  }
  function closeOffer() { offerEl.hidden = true; status(); }

  return { set, notice, closeNotice, offer, closeOffer };
}
