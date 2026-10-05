// Carnet : une rangée de pastilles posée sur le haut du monde (chapitre en cours, Avis annoncé ou voile), chacune
// dépliant une petite carte. Rien de modal : la carte se replie d'un toucher, par Échap, ou d'un toucher ailleurs.
// Le chapitre vient de chapterProgress, l'Avis d'avisStatus (cœur) ; les gestes (brasero, voile) portent data-act.
import { chapterProgress, avisStatus, lightBrasero, liftVeil, AVIS, BRASERO, VEIL_LIFT_ENERGY, fillText, daysBetween, gameDay } from '../../core/index.js';
import { t, tn, content } from '../content.js';
import { $, esc, icon, setHtml } from './dom.js';
import { glyph } from './glyphs.js';
import { num } from './format.js';
import { costText, actionRow } from './game.js';

let openCard = null; // 'chapitre' | 'avis' | 'voile' | null

const fDay = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', timeZone: 'UTC' });
const fDate = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
/** « aujourd’hui », « demain », « samedi », « le 12 octobre » : le {jour} des textes d'Avis. */
export function dayWord(day, now) {
  const n = daysBetween(gameDay(now), day);
  const d = new Date(day + 'T12:00:00Z');
  if (n <= 0) return t('when.today');
  if (n === 1) return t('when.tomorrow');
  if (n <= 6) return fDay.format(d);
  return t('when.date', { date: fDate.format(d) });
}
export const avisName = (id) => (content.chapitres?.chapitres ?? []).map((c) => c.avis).find((a) => a && a.id === id)?.nom || t('avis.title');

// ───────── Chapitre ─────────
function chapterPill(p) {
  const pips = p.objectives.map((o) => `<i${o.done ? ' class="is-done"' : ''}></i>`).join('');
  const label = p.contenu
    ? t('carnet.chapter.aria', { n: p.number, fait: p.done, total: p.total })
    : t('chapter.label', { n: p.number });
  return `<button class="carnet-pill" type="button" data-action="carnet" data-card="chapitre" aria-expanded="${openCard === 'chapitre'}" aria-controls="carnet-card" aria-label="${esc(label)}">
    ${glyph('chapitre')}<span class="carnet-pill-text">${esc(t('chapter.label', { n: p.number }))}</span>${p.total ? `<span class="carnet-pips" aria-hidden="true">${pips}</span>` : ''}
  </button>`;
}

function chapterStatusLine(p) {
  if (!p.contenu) return t('carnet.chapter.no_content');
  if (p.done < p.total) return '';
  const next = p.number + 1;
  const waitDays = Math.max(0, p.minDays - p.day);
  const lackConf = p.needed === null ? 0 : Math.max(0, p.needed - p.confidence);
  if (waitDays && lackConf) return t('carnet.chapter.wait.both', { suivant: next, jour: p.minDays, k: lackConf });
  if (waitDays) return tn('carnet.chapter.wait.days', waitDays, { suivant: next, jour: p.minDays });
  if (lackConf) return t('carnet.chapter.wait.conf', { suivant: next, k: lackConf });
  return t('carnet.chapter.ready', { suivant: next });
}

function chapterCard(p) {
  const title = p.titre ? t('carnet.chapter.title', { n: p.number, titre: p.titre }) : t('chapter.label', { n: p.number });
  const meta = [
    t('carnet.chapter.day', { jour: p.day, min: p.minDays }),
    p.needed === null ? t('carnet.chapter.conf.max', { c: num(p.confidence) }) : t('carnet.chapter.conf', { c: num(p.confidence), n: p.needed }),
  ];
  const current = p.objectives.find((o) => !o.done);
  const items = p.objectives.map((o) => {
    const isNow = o === current;
    const detail = isNow && o.detail ? fillText(o.detail, { cout: o.cost ? costText(o.cost) : null }) : null;
    return `<li class="carnet-obj${o.done ? ' is-done' : ''}${isNow ? ' is-now' : ''}">
      <span class="carnet-obj-mark">${o.done ? icon('check') : ''}</span>
      <span class="carnet-obj-text"><span>${esc(o.texte)}${o.done ? `<span class="sr-only"> · ${esc(t('carnet.obj.done'))}</span>` : ''}</span>${isNow ? ` <span class="tag tag--now">${esc(t('chapter.now'))}</span>` : ''}${detail ? `<small>${esc(detail)}</small>` : ''}</span>
    </li>`;
  }).join('');
  const status = chapterStatusLine(p);
  return `<header class="carnet-card-head">
      <h2 class="carnet-card-title" id="carnet-card-t" tabindex="-1">${glyph('chapitre')}<span>${esc(title)}</span></h2>
      <button class="btn btn--quiet btn--icon" type="button" data-action="carnet-close" aria-label="${esc(t('carnet.close'))}">${icon('x')}</button>
    </header>
    <p class="carnet-meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</p>
    ${items ? `<ol class="carnet-objs" aria-label="${esc(t('carnet.chapter.objs', { fait: p.done, total: p.total }))}">${items}</ol>` : ''}
    ${status ? `<p class="carnet-status">${icon(p.done >= p.total && p.contenu ? 'clock' : 'why')}<span>${esc(status)}</span></p>` : ''}`;
}

// ───────── Avis ─────────
function gaugeHtml(a, cls = '') {
  const scale = Math.max(a.force, a.preparation) * 1.12 || 1;
  const fill = Math.min(100, (a.preparation / scale) * 100);
  const mark = Math.min(100, (a.force / scale) * 100);
  return `<span class="avis-gauge${cls}${a.tenu ? ' is-held' : ''}" aria-hidden="true"><i class="avis-gauge-fill" style="width:${fill.toFixed(1)}%"></i><i class="avis-gauge-force" style="left:${mark.toFixed(1)}%"></i></span>`;
}

function avisPill(a) {
  const days = Math.max(0, a.daysLeft);
  const left = days === 0 ? t('when.today') : t('carnet.avis.days', { n: days });
  const label = t('carnet.avis.aria', { nom: avisName(a.id), quand: dayWordFromLeft(a), preparation: num(a.preparation), force: num(a.force) });
  return `<button class="carnet-pill carnet-pill--frost" type="button" data-action="carnet" data-card="avis" aria-expanded="${openCard === 'avis'}" aria-controls="carnet-card" aria-label="${esc(label)}">
    ${glyph('givre')}<span class="carnet-pill-text">${esc(t('avis.title'))}</span>${gaugeHtml(a)}<span class="carnet-pill-num">${esc(left)}</span>
  </button>`;
}
let nowRef = new Date();
const dayWordFromLeft = (a) => dayWord(a.day, nowRef);

function avisCard(a, c) {
  const sector = AVIS[a.id] ? AVIS[a.id].sector : a.sector;
  const lack = Math.max(0, a.force - a.preparation);
  const lines = a.lignes.map((l) => {
    const val = l.max ? t('carnet.avis.line.max', { v: num(l.value), max: num(l.max) }) : num(l.value);
    return `<div class="why-line${l.value ? '' : ' why-line--zero'}"><dt>${esc(l.label)}</dt><dd>${esc(val)}</dd></div>`;
  }).join('');
  const brasero = actionRow(c, lightBrasero, 'lightBrasero', {}, {
    label: t('carnet.avis.brasero'), cost: { energy: BRASERO.energy, materials: 0 }, ico: glyph('flamme'), kind: 'secondary',
    hint: t('carnet.avis.brasero.hint', { n: a.braseros, max: a.braserosMax, prep: BRASERO.prep }),
  });
  return `<header class="carnet-card-head">
      <h2 class="carnet-card-title carnet-card-title--frost" id="carnet-card-t" tabindex="-1">${glyph('givre')}<span>${esc(t('carnet.avis.title', { nom: avisName(a.id) }))}</span></h2>
      <button class="btn btn--quiet btn--icon" type="button" data-action="carnet-close" aria-label="${esc(t('carnet.close'))}">${icon('x')}</button>
    </header>
    <p class="carnet-meta"><span>${esc(t('carnet.avis.when', { quand: dayWord(a.day, nowRef), secteur: t(`sector.${sector}.the`) }))}</span></p>
    <div class="avis-block">
      <p class="avis-figures"><span>${esc(t('avis.preparation'))} <b>${esc(num(a.preparation))}</b></span><span>${esc(t('avis.force'))} <b>${esc(num(a.force))}</b></span></p>
      ${gaugeHtml(a, ' avis-gauge--big')}
      <p class="avis-verdict">${a.tenu ? icon('check') : glyph('givre')}<span>${esc(a.tenu ? t('carnet.avis.held_now') : t('carnet.avis.lack', { n: num(lack) }))}</span></p>
    </div>
    <dl class="why-ledger carnet-lines">${lines}</dl>
    ${brasero}
    <p class="carnet-note">${esc(t('carnet.avis.note', { du_secteur: t(`sector.${sector}.of`) }))}</p>`;
}

// ───────── Voile ─────────
function veilPill(veils) {
  const cells = veils.reduce((s, v) => s + v.cells, 0);
  return `<button class="carnet-pill carnet-pill--frost" type="button" data-action="carnet" data-card="voile" aria-expanded="${openCard === 'voile'}" aria-controls="carnet-card" aria-label="${esc(tn('carnet.veil.aria', cells, { n: cells }))}">
    ${glyph('voile')}<span class="carnet-pill-text">${esc(t('carnet.veil.pill'))}</span><span class="carnet-pill-num">${esc(num(cells))}</span>
  </button>`;
}

function veilCard(veils, c) {
  const blocks = veils.map((v) => `<section class="carnet-veil">
      <p class="carnet-veil-head"><b>${esc(t(`sector.${v.sector}.name`))}</b> · ${esc(tn('carnet.veil.cells', v.cells, { n: v.cells }))}</p>
      <p class="carnet-note">${esc(t('carnet.veil.until', { quand: dayWord(v.until, nowRef) }))}</p>
      ${actionRow(c, liftVeil, 'liftVeil', { sector: v.sector }, { label: t('act.veil.lift'), cost: { energy: VEIL_LIFT_ENERGY, materials: 0 }, ico: glyph('voile'), kind: 'secondary' })}
    </section>`).join('');
  return `<header class="carnet-card-head">
      <h2 class="carnet-card-title carnet-card-title--frost" id="carnet-card-t" tabindex="-1">${glyph('voile')}<span>${esc(t('carnet.veil.title'))}</span></h2>
      <button class="btn btn--quiet btn--icon" type="button" data-action="carnet-close" aria-label="${esc(t('carnet.close'))}">${icon('x')}</button>
    </header>
    <p class="carnet-note">${esc(t('voile.hint'))}</p>${blocks}`;
}

// ───────── Rendu ─────────
/** c : { tasks, game, ledger, now }. Met à jour les pastilles et la carte ouverte, sans toucher au focus si rien ne change. */
export function renderCarnet(c) {
  const root = $('#carnet');
  if (!root || !c.game) return;
  nowRef = c.now;
  const p = chapterProgress(c.game, c.tasks, c.ledger, content.chapitres, c.now);
  const a = avisStatus(c.game, c.ledger, c.now);
  const veils = (c.game.avis && c.game.avis.veils) || [];
  if (openCard === 'avis' && !a) openCard = null;
  if (openCard === 'voile' && !veils.length) openCard = null;
  const pills = chapterPill(p) + (a ? avisPill(a) : veils.length ? veilPill(veils) : '');
  const card = openCard === 'chapitre' ? chapterCard(p) : openCard === 'avis' ? avisCard(a, c) : openCard === 'voile' ? veilCard(veils, c) : '';
  const active = document.activeElement && root.contains(document.activeElement) ? keyOf(document.activeElement) : null;
  setHtml($('.carnet-pills', root), pills);
  const cardEl = $('#carnet-card', root);
  setHtml(cardEl, card);
  cardEl.hidden = !card;
  cardEl.dataset.card = openCard || '';
  if (active && !root.contains(document.activeElement)) {
    const back = [...root.querySelectorAll('button')].find((b) => keyOf(b) === active);
    if (back) back.focus();
  }
}
const keyOf = (el) => `${el.dataset.action || ''}|${el.dataset.card || ''}|${el.dataset.act || ''}|${el.dataset.params || ''}`;

/** Déplie ou replie une carte. Renvoie la carte ouverte (ou null). */
export function toggleCarnet(card, c, { focus = true } = {}) {
  openCard = openCard === card ? null : card;
  renderCarnet(c);
  if (focus) {
    if (openCard) $('#carnet-card-t')?.focus();
    else $(`#carnet [data-card="${card}"]`)?.focus();
  }
  return openCard;
}

/** Replie la carte ouverte ; `refocus` ramène le focus sur sa pastille. */
export function closeCarnet(c, { refocus = false } = {}) {
  if (!openCard) return false;
  const was = openCard;
  openCard = null;
  renderCarnet(c);
  if (refocus) $(`#carnet [data-card="${was}"]`)?.focus();
  return true;
}
export const carnetOpen = () => openCard;
