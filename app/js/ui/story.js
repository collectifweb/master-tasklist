// Rendez-vous : lettre du matin, réglage du prénom, bilan de la semaine.
// Une seule feuille à la fois : l'accueil (welcome) les enchaîne et attend qu'aucune autre feuille ne soit ouverte.
// Le cœur choisit (morningLetter, weeklyReview) ; l'interface montre, puis note (markLetterShown).
// Tout texte dynamique passe par esc(), titres de quêtes compris.
import { morningLetter, weeklyReview, gameDay, daysBetween } from '../../core/index.js';
import { t, tn, content, prenom, setPrenom } from '../content.js';
import { $, esc, icon } from './dom.js';
import { glyph } from './glyphs.js';
import { num, shortDate, releveText } from './format.js';
import { openSheet, closeSheet } from './sheets.js';

const REVIEW_KEY = 'oree.recycle.v1';
const KEEP_DAYS = 28; // « Garder » : la quête ne revient pas dans le bilan avant 4 semaines

function readReview() {
  try { const v = JSON.parse(localStorage.getItem(REVIEW_KEY)); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function writeReview(v) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(v)); } catch { /* sans stockage : le bilan revient au prochain lancement */ }
}

const anyOpen = () => document.querySelector('dialog[open]');

/**
 * app : { ctx() → { tasks, game, ledger, now }, run(action, params) → résultat ou null, announce(texte), focusHome() }.
 */
export function createStory(app) {
  let welcoming = false;
  let waitFor = null;
  const voiceName = (v) => content.repliques?.voix?.[v]?.nom || null;

  // ───────── Lettre du matin ─────────
  function openLetter(letter, onDone) {
    const dlg = $('#dlg-letter');
    const sign = voiceName(content.lettres?.signature) || content.lettres?.signature || '';
    const p = prenom();
    dlg.innerHTML = `
      <header class="sheet-head">
        <h2 class="sheet-title letter-title" id="letter-t">${glyph('lettre')}<span>${esc(t('letter.title'))}</span></h2>
        <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('letter.close'))}">${icon('x')}</button>
      </header>
      <div class="sheet-body">
        <div class="letter-paper">
          ${letter.lignes.map((l) => `<p>${esc(l)}</p>`).join('')}
          ${sign ? `<p class="letter-sign">${esc(sign)}</p>` : ''}
        </div>
        <p class="letter-prenom">${glyph('personne')}<button class="link-btn" type="button" data-action="open-settings">${esc(p ? t('letter.prenom.change', { prenom: p }) : t('letter.prenom.add'))}</button></p>
      </div>
      <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="button" data-close>${esc(t('letter.close'))}</button></footer>`;
    app.run('markLetterShown', { id: letter.id });
    openSheet(dlg);
    dlg.querySelector('.sheet-foot .btn')?.focus();
    whenClosed(dlg, onDone);
  }

  // ───────── Réglages : prénom facultatif ─────────
  function openSettings() {
    const dlg = $('#dlg-settings');
    dlg.innerHTML = `
      <header class="sheet-head">
        <h2 class="sheet-title" id="settings-t">${esc(t('settings.title'))}</h2>
        <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('settings.close'))}">${icon('x')}</button>
      </header>
      <form class="sheet-body" id="settings-form" novalidate>
        <div class="field">
          <label class="field-label" for="set-prenom">${esc(t('settings.prenom'))}</label>
          <input class="input" id="set-prenom" name="prenom" type="text" maxlength="40" autocomplete="given-name" autocapitalize="words" enterkeyhint="done" value="${esc(prenom())}" aria-describedby="set-prenom-hint">
          <p class="field-hint" id="set-prenom-hint">${esc(t('settings.prenom.hint'))}</p>
        </div>
      </form>
      <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="submit" form="settings-form">${esc(t('settings.save'))}</button></footer>`;
    openSheet(dlg);
    $('#set-prenom', dlg).focus();
  }
  function saveSettings(form) {
    const v = setPrenom(form.elements.prenom.value);
    const link = $('#dlg-letter[open] .letter-prenom .link-btn');
    if (link) link.textContent = v ? t('letter.prenom.change', { prenom: v }) : t('letter.prenom.add');
    closeSheet($('#dlg-settings'));
    app.announce(v ? t('settings.saved', { prenom: v }) : t('settings.saved.none'));
  }

  // ───────── Bilan de la semaine ─────────
  function keptNow(c) {
    const today = gameDay(c.now);
    const kept = readReview().kept || {};
    return new Set(Object.keys(kept).filter((id) => daysBetween(kept[id], today) < KEEP_DAYS));
  }

  function reviewHtml(c) {
    const r = weeklyReview(c.tasks, c.game, c.ledger, c.now);
    const kept = keptNow(c);
    const old = r.aTrier.filter((q) => !kept.has(String(q.id)));
    const summary = r.quetes
      ? `${tn('review.quests', r.quetes, { n: r.quetes })} ${t('review.hours', { h: num(r.heures) })}`
      : t('review.none');
    // temps relevé avec Fanal (Côte à côte), seulement s'il y en a : à côté des heures estimées, jamais à leur place
    const releve = r.minutesReleve >= 1 ? t('review.releve', { duree: releveText(r.minutesReleve) }) : '';
    const domainReleve = (d) => (d.minutesReleve >= 1 ? `<small>${esc(t('review.domain.releve', { duree: releveText(d.minutesReleve) }))}</small>` : '');
    const jours = tn('review.days', r.joursTravailles, { n: r.joursTravailles });
    const domains = r.domaines.map((d) => `<div class="why-line"><dt>${esc(t(`quartier.${d.quartier}.domain`))}<small>${esc(tn('review.domain.quests', d.quetes, { n: d.quetes }))} · ${esc(t(`quartier.${d.quartier}.name`))}</small></dt><dd>${esc(t('review.domain.hours', { h: num(d.heures) }))}${domainReleve(d)}</dd></div>`).join('');
    const olds = old.map((q) => `<li class="review-old" data-quest="${esc(q.id)}">
        <span class="review-old-text"><span class="review-old-title">${esc(q.task)}</span><span class="review-old-meta">${esc(t('review.old.age', { n: q.ageDays }))}${q.domain ? ` · ${esc(q.domain)}` : ''}</span></span>
        <span class="review-old-acts">
          <button class="btn btn--secondary btn--small" type="button" data-action="review-keep" data-id="${esc(q.id)}" aria-label="${esc(t('review.keep.aria', { quete: q.task }))}">${esc(t('review.keep'))}</button>
          <button class="btn btn--quiet btn--small" type="button" data-action="review-archive" data-id="${esc(q.id)}" aria-label="${esc(t('review.archive.aria', { quete: q.task }))}">${icon('archive')}${esc(t('review.archive'))}</button>
        </span>
      </li>`).join('');
    return `
      <header class="sheet-head">
        <h2 class="sheet-title" id="review-t">${esc(t('review.title'))}<small class="act-sub">${esc(t('review.week', { debut: shortDate(r.semaine.start), fin: shortDate(r.semaine.end) }))}</small></h2>
        <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('review.close'))}">${icon('x')}</button>
      </header>
      <div class="sheet-body review-body">
        <section class="review-sum">
          <p class="review-lead">${esc(summary)}</p>
          ${releve ? `<p class="act-text">${icon('clock')}<span>${esc(releve)}</span></p>` : ''}
          <p class="review-days">${icon('calendar')}<span>${esc(jours)}</span></p>
          ${domains ? `<dl class="why-ledger review-domains">${domains}</dl>` : ''}
        </section>
        ${old.length ? `<section class="review-sort" aria-labelledby="review-old-t">
          <h3 class="act-section-title" id="review-old-t">${esc(t('review.old.title'))}</h3>
          <p class="act-text">${esc(t('review.old.text'))}</p>
          <ul class="review-olds">${olds}</ul>
        </section>` : r.aTrier.length ? '' : `<p class="act-text">${esc(t('review.old.none'))}</p>`}
      </div>
      <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="button" data-close>${esc(t('review.close'))}</button></footer>`;
  }

  function openReview(c, onDone) {
    const dlg = $('#dlg-review');
    dlg.innerHTML = reviewHtml(c);
    const v = readReview();
    v.shown = gameDay(c.now);
    writeReview(v);
    openSheet(dlg);
    dlg.querySelector('.sheet-foot .btn')?.focus();
    whenClosed(dlg, onDone);
  }
  function refreshReview(c) {
    const dlg = $('#dlg-review');
    if (!dlg.open) return;
    dlg.innerHTML = reviewHtml(c);
  }
  /** « Garder » ou « Archiver » une vieille quête ; le focus passe à la ligne suivante (ou au bouton Fermer). */
  function reviewAction(action, id, c) {
    const dlg = $('#dlg-review');
    const li = dlg.querySelector(`.review-old[data-quest="${CSS.escape(id)}"]`);
    const nextId = li && li.nextElementSibling ? li.nextElementSibling.dataset.quest : null;
    const title = li ? li.querySelector('.review-old-title').textContent : '';
    if (action === 'review-keep') {
      const v = readReview();
      v.kept = { ...(v.kept || {}), [id]: gameDay(c.now) };
      writeReview(v);
      app.announce(t('review.kept', { quete: title }));
    } else {
      if (!app.run('archiveQuest', { id })) return;
    }
    refreshReview(app.ctx());
    const back = nextId ? dlg.querySelector(`.review-old[data-quest="${CSS.escape(nextId)}"] [data-action="review-keep"]`) : null;
    (back || dlg.querySelector('.sheet-foot .btn')).focus();
  }

  // ───────── Accueil : lettre, bilan du dimanche ─────────
  /** Une feuille d'accueil s'ouvre seule : à sa fermeture, le navigateur rend le focus à la page entière. */
  const refocus = () => { if (!document.activeElement || document.activeElement === document.body) app.focusHome?.(); };
  function whenClosed(dlg, fn) {
    if (!fn) return;
    const h = () => { dlg.removeEventListener('close', h); fn(); };
    dlg.addEventListener('close', h);
  }

  /**
   * Montre ce qui attend, une feuille à la fois : lettre du matin (pas le premier jour), puis le bilan le dimanche
   * (une fois par appareil). Si une autre feuille est ouverte, attend sa fermeture.
   */
  function welcome() {
    if (welcoming) return;
    const open = anyOpen();
    if (open) {
      if (waitFor !== open) { waitFor = open; whenClosed(open, () => { waitFor = null; setTimeout(welcome, 50); }); }
      return;
    }
    const c = app.ctx();
    if (!c || !c.game) return;
    const next = () => { welcoming = false; refocus(); setTimeout(welcome, 50); };
    const today = gameDay(c.now);
    if (content.lettres && c.game.startDay !== today) {
      const letter = morningLetter(content.lettres, c.tasks, c.game, c.now, { prenom: prenom() || null });
      if (letter && !letter.seen) { welcoming = true; openLetter(letter, next); return; }
    }
    const r = readReview();
    if (r.shown !== today && weeklyReview(c.tasks, c.game, c.ledger, c.now).dimanche) {
      welcoming = true; openReview(c, () => { welcoming = false; refocus(); }); return;
    }
  }

  return {
    welcome,
    openSettings,
    saveSettings,
    openReview: () => openReview(app.ctx()),
    refreshReview: () => refreshReview(app.ctx()),
    reviewAction: (action, id) => reviewAction(action, id, app.ctx()),
  };
}
