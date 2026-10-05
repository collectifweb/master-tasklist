// Récit et rendez-vous : moments d'histoire (intro comprise), lettre du matin, réglage du prénom, bilan de la semaine.
// Une seule feuille à la fois : l'accueil (welcome) les enchaîne et attend qu'aucune autre feuille ne soit ouverte.
// Le cœur choisit (storyMoments, morningLetter, weeklyReview) ; l'interface montre, puis note (markStorySeen,
// markLetterShown). Tout texte dynamique passe par esc(), titres de quêtes compris.
import { storyMoments, morningLetter, weeklyReview, AVIS, gameDay, daysBetween } from '../../core/index.js';
import { t, tn, content, prenom, setPrenom, fillLine } from '../content.js';
import { $, esc, icon } from './dom.js';
import { glyph } from './glyphs.js';
import { num, shortDate } from './format.js';
import { openSheet, closeSheet } from './sheets.js';
import { dayWord, avisName } from './carnet.js';

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
 * app : { ctx() → { tasks, game, ledger, now }, run(action, params) → résultat ou null, announce(texte),
 *         onIntroEnd(choix 'start' | 'later') }.
 */
export function createStory(app) {
  const scene = { steps: [], i: 0, ids: [], intro: false, onDone: null };
  let welcoming = false;
  let waitFor = null;

  // ───────── Moments d'histoire ─────────
  const voiceName = (v) => content.repliques?.voix?.[v]?.nom || null;

  function vars(m, c) {
    const avisDef = m.avis ? AVIS[m.avis] : null;
    const cur = c.game.avis && c.game.avis.current;
    const sector = avisDef ? avisDef.sector : null;
    const day = m.day || (cur && m.avis === cur.id ? cur.day : null);
    return {
      prenom: prenom() || null,
      jour: day ? dayWord(day, c.now) : null,
      du_secteur: sector ? t(`sector.${sector}.of`) : null,
      au_secteur: sector ? t(`sector.${sector}.in`) : null,
      secteur: sector ? t(`sector.${sector}.the`) : null,
    };
  }

  function objectiveText(id) {
    for (const ch of content.chapitres?.chapitres ?? []) for (const o of ch.objectifs ?? []) if (o.id === id) return o.texte;
    return '';
  }
  function chapterTitle(n) {
    const ch = (content.chapitres?.chapitres ?? []).find((x) => x.numero === n);
    return ch ? t('carnet.chapter.title', { n, titre: ch.titre }) : t('chapter.label', { n });
  }

  function titleOf(m) {
    switch (m.kind) {
      case 'introduction': return t('scene.intro.title');
      case 'fin': return t('chapter.done', { n: m.chapter });
      case 'ouverture': case 'beat': return chapterTitle(m.chapter);
      case 'objectif-atteint': return t('scene.objective.done', { objectif: objectiveText(m.id.replace(/\.atteint$/, '')) });
      case 'objectif-annonce': return t('scene.objective.new', { objectif: objectiveText(m.id.replace(/\.annonce$/, '')) });
      case 'avis-annonce': return t('carnet.avis.title', { nom: avisName(m.avis) });
      case 'avis-resultat': return t(`scene.avis.${m.result}`, { nom: avisName(m.avis) });
      default: return t('scene.title');
    }
  }

  function renderScene() {
    const dlg = $('#dlg-scene');
    const s = scene.steps[scene.i];
    const last = scene.i === scene.steps.length - 1;
    const momentSteps = scene.steps.filter((x) => x.m === s.m);
    const pos = momentSteps.indexOf(s) + 1;
    const nom = voiceName(s.voix);
    const kindCls = s.voix === 'inscription' ? 'scene-line--inscription' : s.voix === 'narration' ? 'scene-line--narration' : '';
    const intro = s.m.kind === 'introduction';
    const isFrost = s.m.kind === 'avis-annonce' || s.m.kind === 'avis-resultat';
    const skip = intro ? t('intro.skip') : t('scene.skip');
    const foot = intro && last
      ? `<button class="btn btn--quiet" type="button" data-action="scene-later">${esc(t('quest.later'))}</button>
         <button class="btn btn--primary" type="button" data-action="scene-start">${esc(t('scene.intro.start'))}</button>`
      : `<button class="btn btn--quiet" type="button" data-action="scene-skip"${last ? ' hidden' : ''}>${esc(skip)}</button>
         <button class="btn btn--primary" type="button" data-action="scene-next">${esc(last ? t('scene.close') : t('scene.continue'))}</button>`;
    dlg.innerHTML = `
      <header class="sheet-head scene-head">
        <h2 class="sheet-title scene-title${isFrost ? ' scene-title--frost' : ''}" id="scene-t">${isFrost ? glyph('givre') : glyph('chapitre')}<span>${esc(titleOf(s.m))}</span></h2>
        <span class="scene-count">${esc(t('scene.count', { n: pos, total: momentSteps.length }))}</span>
      </header>
      <div class="sheet-body scene-body">
        <div class="scene-line ${kindCls}" data-voix="${esc(s.voix)}" aria-live="polite">
          ${nom ? `<p class="scene-voice">${esc(nom)}</p>` : ''}
          ${s.voix === 'inscription' ? `<p class="scene-inscription-label">${esc(t('scene.inscription'))}</p>` : ''}
          <p class="scene-text">${esc(s.texte)}</p>
        </div>
      </div>
      <footer class="sheet-foot scene-foot">${foot}</footer>`;
    const primary = dlg.querySelector('.btn--primary');
    if (primary) primary.focus();
  }

  function finishScene(choice) {
    const dlg = $('#dlg-scene');
    const ids = scene.ids;
    const intro = scene.intro;
    scene.steps = []; scene.ids = []; scene.i = 0; scene.intro = false;
    if (ids.length) app.run('markStorySeen', { ids });
    const done = scene.onDone; scene.onDone = null;
    // après la fermeture réelle : le navigateur rend d'abord le focus à ce qui l'avait avant la feuille
    const after = () => {
      if (intro && app.onIntroEnd) app.onIntroEnd(choice || 'later');
      if (done) done();
    };
    if (dlg.open) { whenClosed(dlg, after); closeSheet(dlg); } else after();
  }

  /** Montre une suite de moments (lignes passables), puis les note comme vus. */
  function showMoments(moments, c, onDone) {
    const steps = [];
    for (const m of moments) {
      const v = vars(m, c);
      for (const l of m.lignes) {
        const texte = fillLine(l.texte, v);
        if (texte) steps.push({ m, voix: l.voix, texte });
      }
    }
    scene.ids = moments.map((m) => m.id);
    scene.intro = moments.some((m) => m.kind === 'introduction');
    scene.onDone = onDone;
    if (!steps.length) { finishScene(); return; }
    scene.steps = steps;
    scene.i = 0;
    const dlg = $('#dlg-scene');
    renderScene();
    if (!dlg._wired) {
      dlg._wired = true;
      // Échap, toucher hors de la feuille : même effet que « Passer »
      dlg.addEventListener('close', () => { if (scene.steps.length) finishScene('later'); });
    }
    openSheet(dlg);
    dlg.querySelector('.btn--primary')?.focus();
  }

  function sceneAction(action) {
    if (!scene.steps.length) return;
    if (action === 'scene-next') {
      if (scene.i < scene.steps.length - 1) { scene.i++; renderScene(); } else finishScene('next');
    } else if (action === 'scene-skip') {
      // « Passer » saute le moment en cours ; à la fin de l'intro, « Plus tard » ou « Commencer »
      const cur = scene.steps[scene.i].m;
      const next = scene.steps.findIndex((x, k) => k > scene.i && x.m !== cur);
      if (cur.kind === 'introduction') {
        const lastIntro = scene.steps.map((x) => x.m).lastIndexOf(cur);
        scene.i = lastIntro; renderScene();
      } else if (next >= 0) { scene.i = next; renderScene(); } else finishScene('skip');
    } else if (action === 'scene-later') {
      finishScene('later');
    } else if (action === 'scene-start') {
      finishScene('start');
    }
  }

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
    const lisiere = tn('review.lisiere', r.joursLisiere, { n: r.joursLisiere });
    const domains = r.domaines.map((d) => `<div class="why-line"><dt>${esc(t(`sector.${d.sector}.domain`))}<small>${esc(tn('review.domain.quests', d.quetes, { n: d.quetes }))} · ${esc(t(`sector.${d.sector}.name`))}</small></dt><dd>${esc(t('review.domain.hours', { h: num(d.heures) }))}</dd></div>`).join('');
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
          <p class="review-lisiere">${icon('lueur')}<span>${esc(lisiere)}</span></p>
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

  // ───────── Accueil : intro, lettre, moments, bilan du dimanche ─────────
  function whenClosed(dlg, fn) {
    if (!fn) return;
    const h = () => { dlg.removeEventListener('close', h); fn(); };
    dlg.addEventListener('close', h);
  }

  /**
   * Montre ce qui attend, une feuille à la fois : moments d'histoire (intro d'abord), lettre du matin (pas le jour
   * de l'intro), puis le bilan le dimanche (une fois par appareil). Si une autre feuille est ouverte, attend sa fermeture.
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
    const next = () => { welcoming = false; setTimeout(welcome, 50); };
    const moments = content.chapitres ? storyMoments(c.game, c.tasks, c.ledger, content.chapitres, c.now) : [];
    if (moments.length) { welcoming = true; showMoments(moments, c, next); return; }
    const today = gameDay(c.now);
    if (content.lettres && c.game.startDay !== today) {
      const letter = morningLetter(content.lettres, c.tasks, c.game, c.now, { prenom: prenom() || null });
      if (letter && !letter.seen) { welcoming = true; openLetter(letter, next); return; }
    }
    const r = readReview();
    if (r.shown !== today && weeklyReview(c.tasks, c.game, c.ledger, c.now).dimanche) {
      welcoming = true; openReview(c, () => { welcoming = false; }); return;
    }
  }

  return {
    welcome,
    sceneAction,
    openSettings,
    saveSettings,
    openReview: () => openReview(app.ctx()),
    refreshReview: () => refreshReview(app.ctx()),
    reviewAction: (action, id) => reviewAction(action, id, app.ctx()),
  };
}
