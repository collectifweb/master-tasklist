// Feuilles (dialog.sheet) : ajout rapide, fiche de quête, « Pourquoi ? », confirmation, code d'accès, aide d'une ressource.
// Le contenu est construit à l'ouverture. Rien n'est recalculé ici : chaque geste passe par `app.run(action, params)`.
import {
  QUARTIERS, QUETE_DEFAUT, SEMAINE_TENUE, JOURS_PAR_PERMIS, quartierOfTask, why, inferDomain, canReverse, hoursBetween, dayOnly, estimatedMinutes,
} from '../../core/index.js';
import { t, tn, content } from '../content.js';
import { $, $$, esc, icon, setHtml, setText, setAttr, reconcile, reducedMotion } from './dom.js';
import { durationText, capitalize, num } from './format.js';
import { taskModel } from './model.js';
import { token } from '../api-client.js';
import { maintenant } from '../horloge.js';

const QUARTIER_ORDER = ['atelier', 'champs', 'mairie', 'ecole', 'garage', 'place'];

// ───────── Ouverture / fermeture ─────────
let stacked = 0; // ordre d'ouverture : la dernière feuille ouverte est au-dessus des autres
export function openSheet(dlg) {
  if (dlg._cancelClose) dlg._cancelClose(); // rouverte pendant sa fermeture : on annule la fermeture
  dlg._openedAt = Date.now(); // un geste qui dépense, touché juste après, est le second toucher d'un double (main.js)
  if (!dlg.open) { dlg.showModal(); dlg._z = ++stacked; }
}
/** Feuille modale du dessus, ou null : quand une feuille est ouverte, le reste de la page est inerte. */
export function topSheet() {
  let top = null;
  for (const d of $$('dialog.sheet[open]')) if (!top || d._z > top._z) top = d;
  return top;
}
export function closeSheet(dlg) {
  if (!dlg.open || dlg.classList.contains('is-closing')) return;
  dlg.classList.add('is-closing');
  let timer = null;
  const onEnd = (e) => { if (e.target === dlg) finish(); };
  const cleanup = () => {
    clearTimeout(timer);
    dlg.removeEventListener('animationend', onEnd);
    dlg.classList.remove('is-closing');
    dlg._cancelClose = null;
  };
  const finish = () => { cleanup(); dlg.close(); };
  dlg._cancelClose = cleanup;
  if (reducedMotion()) return finish();
  dlg.addEventListener('animationend', onEnd);
  timer = setTimeout(finish, 400);
}

// ───────── Pas à pas 1 à 10 ─────────
function hint(kind, v) {
  if (kind === 'length') return durationText(v);
  if (kind === 'priority') return v >= 8 ? t('hint.prio.high') : v >= 4 ? t('hint.prio.mid') : t('hint.prio.low');
  return v >= 7 ? t('hint.effort.high') : v >= 4 ? t('hint.effort.mid') : t('hint.effort.low');
}
export function stepperRow(prefix, kind, value, disabled) {
  const name = kind === 'priority' ? t('field.priority') : kind === 'length' ? t('field.length') : t('field.difficulty');
  const dis = disabled ? ' disabled' : '';
  value = Math.round(Number(value)) || 0;
  return `<div class="stepper-row" data-kind="${kind}">
    <span class="stepper-label"><span class="stepper-name" id="${prefix}-${kind}">${esc(name)}</span><span class="stepper-hint">${esc(hint(kind, value))}</span></span>
    <span class="stepper" role="group" aria-labelledby="${prefix}-${kind}">
      <button type="button" data-step="-1" aria-label="${esc(t('step.dec.' + kind))}"${dis}>${icon('minus')}</button>
      <output aria-live="polite">${value}</output>
      <button type="button" data-step="1" aria-label="${esc(t('step.inc.' + kind))}"${dis}>${icon('plus')}</button>
    </span></div>`;
}
export function syncStepper(row) {
  const out = $('output', row);
  const v = Number(out.textContent);
  $('[data-step="-1"]', row).disabled = v <= 1 || row.dataset.locked === '1';
  $('[data-step="1"]', row).disabled = v >= 10 || row.dataset.locked === '1';
  setText($('.stepper-hint', row), hint(row.dataset.kind, v));
}
export function handleStep(btn) {
  const row = btn.closest('.stepper-row');
  const out = $('output', row);
  out.textContent = String(Math.min(10, Math.max(1, Number(out.textContent) + Number(btn.dataset.step))));
  const focused = document.activeElement === btn;
  syncStepper(row);
  // borne atteinte : le bouton touché se désactive, le focus passe au bouton opposé au lieu de tomber sur la page
  if (btn.disabled && focused) $(`[data-step="${-Number(btn.dataset.step)}"]`, row).focus();
  const dlg = row.closest('dialog');
  if (dlg && dlg.id === 'dlg-add') { dlg.dataset.stepped = '1'; updateAddSummary(); }
}
/**
 * Formulaire d'ajout ouvert avant que la partie soit lue : il montre 5 / 2 / 3. Quand la partie arrive, tant que le joueur
 * n'a touché à aucun des trois « + » ou « − », les valeurs prennent la quête par défaut de ses Réglages.
 */
export function refreshAddDefaults(quete) {
  const dlg = $('#dlg-add');
  if (!dlg.open || dlg.dataset.stepped === '1' || !$('#add-form', dlg)) return;
  for (const row of $$('.stepper-row', dlg)) {
    const v = quete[row.dataset.kind];
    if (Number(row.querySelector('output').textContent) === v) continue;
    row.querySelector('output').textContent = String(v);
    syncStepper(row);
  }
  updateAddSummary();
}
const valueOf = (root, kind) => Number($(`.stepper-row[data-kind="${kind}"] output`, root).textContent);
export { valueOf as stepValue };

// ───────── Ajout rapide ─────────
function quartierOptions(name, checked) {
  return QUARTIER_ORDER.map((id) => `<label class="sector-option"><input type="radio" name="${esc(name)}" value="${esc(id)}"${id === checked ? ' checked' : ''}>
      <span class="sector-card">${icon(id)}<span class="sector-text"><span class="sector-name">${esc(t(`quartier.${id}.name`))}</span><span class="sector-domain">${esc(t(`quartier.${id}.domain`))}</span></span><span class="sector-tick">${icon('check')}</span></span></label>`).join('');
}
/** Domaine écrit dans la tâche pour un quartier choisi (la Place prend « Autres »). */
const domainOf = (id) => QUARTIERS[id].domain || t('add.sector.other');

function updateAddSummary() {
  const form = $('#add-form');
  if (!form) return;
  const p = valueOf(form, 'priority'), l = valueOf(form, 'length'), d = valueOf(form, 'difficulty');
  setHtml($('.disclosure-summary', form), `${esc(t('add.summary.prio'))} <b>${p}</b> · <b>${esc(durationText(l))}</b> · ${esc(t('add.summary.effort'))} <b>${d}</b>`);
}

/** quete : { priority, length, difficulty } de départ du formulaire (la quête par défaut des Réglages, core/reglages.js). */
export function openAdd(quete = QUETE_DEFAUT) {
  const dlg = $('#dlg-add');
  dlg.innerHTML = `
    <header class="sheet-head">
      <h2 class="sheet-title" id="add-h">${esc(t('add.title'))}</h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('add.close'))}">${icon('x')}</button>
    </header>
    <form class="sheet-body" id="add-form" novalidate>
      <div class="field">
        <label class="field-label" for="add-title">${esc(t('add.what'))}</label>
        <input class="input input--lg" id="add-title" name="title" autocomplete="off" enterkeyhint="done" maxlength="200" aria-describedby="add-title-hint">
        <p class="field-hint" id="add-title-hint">${esc(t('add.hint'))}</p>
        <p class="field-error" id="add-title-err" hidden>${icon('why')}${esc(t('add.error.empty'))}</p>
      </div>
      <fieldset class="field">
        <legend class="field-label">${esc(t('add.sector'))} <span class="tag tag--guess" id="add-guess" hidden></span></legend>
        <div class="sector-picker">${quartierOptions('add-sector', 'place')}</div>
      </fieldset>
      <details class="disclosure">
        <summary><span class="disclosure-summary"></span><span class="disclosure-action">${esc(t('add.adjust'))} ${icon('chevron-down')}</span></summary>
        <div class="disclosure-body">
          ${stepperRow('add', 'priority', quete.priority)}${stepperRow('add', 'length', quete.length)}${stepperRow('add', 'difficulty', quete.difficulty)}
        </div>
      </details>
      <label class="check-row"><input type="checkbox" name="already-done"><span>${esc(t('add.done_today'))}<small>${esc(t('add.done_today.hint'))}</small></span></label>
    </form>
    <footer class="sheet-foot">
      <button class="btn btn--primary btn--block" type="submit" form="add-form" data-action="add-submit">${icon('plus')}${esc(t('add.submit'))}</button>
    </footer>`;
  dlg.dataset.manual = '';
  dlg.dataset.stepped = '';
  for (const row of $$('.stepper-row', dlg)) syncStepper(row);
  updateAddSummary();
  openSheet(dlg);
  $('#add-title').focus();
}

/** Devine le quartier à mesure qu'on écrit, tant que l'utilisateur n'a pas choisi lui-même. */
export function onAddInput(input) {
  const dlg = $('#dlg-add');
  input.removeAttribute('aria-invalid');
  $('#add-title-err').hidden = true;
  if (dlg.dataset.manual === '1') return;
  const guess = content.ancres ? inferDomain(input.value, content.ancres) : null;
  const tag = $('#add-guess');
  const pick = guess ? guess.quartier : 'place';
  const radio = $(`input[name="add-sector"][value="${pick}"]`, dlg);
  if (radio) radio.checked = true;
  tag.hidden = !guess;
  if (guess) tag.textContent = t('add.guess', { mot: guess.anchorLabel });
}
export function onAddSectorChange() {
  const dlg = $('#dlg-add');
  dlg.dataset.manual = '1';
  $('#add-guess').hidden = true;
}

/** Valide le formulaire d'ajout ; renvoie les paramètres de createQuest ou null (erreur affichée sous le champ). */
export function readAdd() {
  const form = $('#add-form');
  const input = $('#add-title');
  const title = input.value.trim();
  if (!title) {
    setAttr(input, 'aria-invalid', 'true');
    setAttr(input, 'aria-describedby', 'add-title-err');
    $('#add-title-err').hidden = false;
    input.focus();
    return null;
  }
  const quartier = $('input[name="add-sector"]:checked', form).value;
  return {
    task: title,
    domain: domainOf(quartier),
    priority: valueOf(form, 'priority'),
    length: valueOf(form, 'length'),
    difficulty: valueOf(form, 'difficulty'),
    complete: true,
    alreadyDone: $('input[name="already-done"]', form).checked,
  };
}

// ───────── Fiche de quête ─────────
const RECUR = ['none', 'day', 'week', 'month'];

function recurOptions(rec) {
  // liste blanche : tasks.json peut être rempli par d'autres écrivains
  const every = rec && ['day', 'week', 'month'].includes(rec.every) ? rec.every : null;
  const n0 = Math.floor(Number(rec && rec.interval));
  const cur = every ? `${every}:${Number.isFinite(n0) ? Math.min(365, Math.max(1, n0)) : 1}` : 'none';
  const opts = [['none', t('recurrence.none')], ['day:1', t('recurrence.day.one')], ['week:1', t('recurrence.week.one')], ['month:1', t('recurrence.month.one')]];
  if (!opts.some(([v]) => v === cur)) {
    const [every, n] = cur.split(':');
    opts.push([cur, t(`recurrence.${every}.other`, { n })]);
  }
  return { cur, html: opts.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('') };
}

function stepLi(task, s, ro) {
  return `<label><input type="checkbox" data-action="step-toggle" ${s.done ? 'checked' : ''}${ro || task.status !== 'todo' ? ' disabled' : ''}><span class="step-text"></span></label>
    <button class="step-remove" type="button" data-action="step-remove"${ro ? ' disabled' : ''}>${icon('x')}</button>`;
}
function makeStepLi(task, s, ro) {
  const li = document.createElement('li');
  li.className = 'step';
  li.dataset.stepId = s.id;
  li.innerHTML = stepLi(task, s, ro);
  return li;
}
function patchStepLi(li, task, s, ro) {
  const cb = $('input', li);
  if (cb.checked !== !!s.done) cb.checked = !!s.done;
  const dis = ro || task.status !== 'todo';
  if (cb.disabled !== dis) cb.disabled = dis;
  setText($('.step-text', li), s.label);
  setAttr($('.step-remove', li), 'aria-label', t('fiche.steps.remove', { etape: s.label }));
}

function actionsHtml(m, ctx) {
  const task = m.task;
  const ro = m.readonly;
  const dis = ro ? ' aria-disabled="true"' : '';
  const out = [];
  const occ = task.lastDone ? task.lastDone.occurrence : task.occurrence ?? 1;
  const showRemballer = (task.status === 'done' || task.lastDone) && !ro;
  if (task.status === 'done') {
    out.push(`<button class="btn btn--quiet" type="button" data-action="reopen"${dis}>${icon('undo')}${esc(t('quest.reopen'))}</button>`);
  }
  if (showRemballer) {
    const ok = canReverse(ctx.ledger, task.id, occ, ctx.now);
    if (ok) out.push(`<button class="btn btn--quiet" type="button" data-action="remballer">${icon('undo')}${esc(t('quest.undo'))}</button>`);
    else out.push(`<span><button class="btn btn--quiet" type="button" data-action="remballer" aria-disabled="true" aria-describedby="fiche-undo-why">${icon('lock')}${esc(t('quest.undo'))}</button>
      <span class="btn-reason" id="fiche-undo-why">${icon('clock')}${esc(t('fiche.undo.disabled.late'))}</span></span>`);
  }
  if (task.status === 'archived') out.push(`<button class="btn btn--quiet" type="button" data-action="unarchive"${dis}>${icon('unarchive')}${esc(t('quest.unarchive'))}</button>`);
  else out.push(`<span><button class="btn btn--quiet" type="button" data-action="archive" aria-describedby="fiche-archive-why"${dis}>${icon('archive')}${esc(t('quest.archive'))}</button>
    <span class="btn-reason" id="fiche-archive-why">${esc(t('fiche.archive.hint'))}</span></span>`);
  out.push(`<button class="btn btn--quiet btn--danger" type="button" data-action="delete"${dis}>${icon('trash')}${esc(t('quest.delete'))}</button>`);
  return out.join('');
}

function summaryHtml(m) {
  const tags = [];
  if (m.state === 'done') tags.push(`<span class="tag tag--done">${icon('check')}${esc(t('status.done'))}</span>`);
  if (m.state === 'archived') tags.push(`<span class="tag tag--archived">${icon('archive')}${esc(t('status.archived'))}</span>`);
  if (m.deadline && m.deadline.late) tags.push(`<span class="tag tag--late">${icon('crate')}${esc(m.deadline.text)}</span>`);
  if (m.readonly) tags.push(`<span class="tag">${icon('lock')}${esc(t('readonly.tag'))}</span>`);
  const cote = m.cote !== null
    ? `<button class="cote" type="button" data-action="why" aria-label="Cote ${esc(num(m.cote))}. ${esc(t('quest.why'))}"><span class="cote-value">${esc(num(m.cote))}</span><span class="cote-label">Cote</span></button>`
    : '';
  const link = m.cote !== null ? `<button class="link-btn" type="button" data-action="why">${esc(t('quest.why'))}</button>` : '';
  return cote + tags.join('') + link;
}

export function openFiche(ctx, id) {
  const task = ctx.tasks.find((x) => x.id === id);
  if (!task) return;
  const m = taskModel(task, ctx);
  const ro = m.readonly;
  const dis = ro ? ' disabled' : '';
  const dlg = $('#dlg-fiche');
  dlg.dataset.taskId = id;
  const rec = recurOptions(task.recurrence);
  const quartier = quartierOfTask(task);
  const sectorOpts = QUARTIER_ORDER.map((id) => `<option value="${esc(id)}"${id === quartier ? ' selected' : ''}>${esc(t(`quartier.${id}.name`))} · ${esc(t(`quartier.${id}.domain`))}</option>`).join('');
  dlg.innerHTML = `
    <header class="sheet-head">
      <h2 class="sheet-title" id="fiche-t">${esc(t('fiche.title'))}</h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('fiche.close'))}">${icon('x')}</button>
    </header>
    <form class="sheet-body" id="fiche-form" novalidate>
      <div class="fiche-summary" id="fiche-summary"></div>
      ${ro ? `<p class="fiche-note">${icon('lock')} ${esc(t('readonly.reason'))}</p>` : ''}
      <div class="field">
        <label class="field-label" for="fiche-title">${esc(t('field.title'))}</label>
        <input class="input" id="fiche-title" autocomplete="off" maxlength="200"${dis}>
      </div>
      <div class="field">
        <label class="field-label" for="fiche-sector">${esc(t('add.sector'))}</label>
        <select class="select" id="fiche-sector"${dis}>${sectorOpts}</select>
      </div>
      <div class="disclosure-body" style="border:1px solid var(--c-line);border-radius:var(--r-md)" id="fiche-steppers">
        ${stepperRow('fiche', 'priority', task.priority, ro)}${stepperRow('fiche', 'length', task.length, ro)}${stepperRow('fiche', 'difficulty', task.difficulty, ro)}
      </div>
      <div class="field">
        <label class="field-label" for="fiche-deadline">${esc(t('field.deadline'))}</label>
        <input class="input" type="date" id="fiche-deadline" aria-describedby="fiche-deadline-hint"${dis}>
        <p class="field-hint" id="fiche-deadline-hint">${esc(t('fiche.deadline.hint'))}</p>
      </div>
      <div class="field">
        <label class="field-label" for="fiche-recur">${icon('repeat', 'icon--sm')}${esc(t('field.recurrence'))}</label>
        <select class="select" id="fiche-recur"${dis}>${rec.html}</select>
      </div>
      <fieldset class="field" id="fiche-steps-field">
        <legend class="field-label">${icon('steps', 'icon--sm')}${esc(t('fiche.steps'))} <span class="tag" id="fiche-steps-count"></span></legend>
        <ul class="steps" id="fiche-steps"></ul>
        <div class="step-add">
          <input class="input" id="fiche-step-new" placeholder="${esc(t('fiche.steps.new'))}" aria-label="${esc(t('fiche.steps.new'))}" autocomplete="off" maxlength="120"${dis}>
          <button class="btn btn--secondary btn--icon" type="button" data-action="step-add" aria-label="${esc(t('fiche.steps.add'))}"${dis}>${icon('plus')}</button>
        </div>
      </fieldset>
      <div class="field">
        <label class="field-label" for="fiche-notes">${icon('note', 'icon--sm')}${esc(t('field.notes'))}</label>
        <textarea class="textarea" id="fiche-notes" placeholder="${esc(t('fiche.notes.placeholder'))}"${dis}></textarea>
      </div>
      <div class="fiche-actions" id="fiche-actions"></div>
    </form>
    <footer class="sheet-foot">
      <button class="btn btn--primary btn--block" type="submit" form="fiche-form" data-action="fiche-save"${dis}>${esc(t('quest.save'))}</button>
    </footer>`;
  // valeurs saisies (par propriété : aucun risque d'injection)
  $('#fiche-title').value = task.task;
  $('#fiche-deadline').value = dayOnly(task.deadline) || '';
  $('#fiche-notes').value = task.notes || '';
  dlg._orig = { task: task.task, sector: quartier, priority: task.priority, length: task.length, difficulty: task.difficulty,
    deadline: dayOnly(task.deadline) || '', recur: rec.cur, notes: task.notes || '' };
  for (const row of $$('.stepper-row', dlg)) { row.dataset.locked = ro ? '1' : ''; syncStepper(row); }
  openSheet(dlg);
  refreshFiche(ctx);
}

/** Met à jour ce qui peut changer pendant que la fiche est ouverte (état, étapes, boutons), sans toucher aux champs saisis. */
export function refreshFiche(ctx) {
  const dlg = $('#dlg-fiche');
  if (!dlg.open) return;
  const task = ctx.tasks.find((x) => x.id === dlg.dataset.taskId);
  if (!task) { if (dlg.open) closeSheet(dlg); return 'gone'; }
  const m = taskModel(task, ctx);
  const ro = m.readonly;
  setHtml($('#fiche-summary', dlg), summaryHtml(m));
  setHtml($('#fiche-actions', dlg), actionsHtml(m, ctx));
  const steps = task.steps || [];
  reconcile($('#fiche-steps', dlg), steps, (s) => s.id, (s) => makeStepLi(task, s, ro), (li, s) => patchStepLi(li, task, s, ro), 'stepId');
  setText($('#fiche-steps-count', dlg), steps.length ? `${steps.filter((s) => s.done).length}/${steps.length}` : '');
  $('#fiche-steps-count', dlg).hidden = !steps.length;
}

/** Champs réellement modifiés (le diff part seul à l'API : aucun autre champ n'est touché). */
export function readFiche(ctx) {
  const dlg = $('#dlg-fiche');
  const o = dlg._orig;
  const task = ctx.tasks.find((x) => x.id === dlg.dataset.taskId);
  const patch = {};
  const title = $('#fiche-title').value;
  if (title.trim() === '') return { error: t('add.error.empty') };
  if (title !== o.task) patch.task = title;
  const sector = $('#fiche-sector').value;
  if (sector !== o.sector) patch.domain = domainOf(sector);
  for (const k of ['priority', 'length', 'difficulty']) {
    const v = valueOf(dlg, k);
    if (v !== o[k]) patch[k] = v;
  }
  const dl = $('#fiche-deadline').value;
  if (dl !== o.deadline) patch.deadline = dl || null;
  const rc = $('#fiche-recur').value;
  if (rc !== o.recur) {
    if (rc === 'none') patch.recurrence = null;
    else { const [every, n] = rc.split(':'); patch.recurrence = { every, interval: Number(n) }; }
  }
  const notes = $('#fiche-notes').value;
  if (notes !== o.notes) patch.notes = notes === '' ? null : notes;
  return { id: task.id, patch };
}

// ───────── Pourquoi ? ─────────
export function openWhy(ctx, id) {
  const task = ctx.tasks.find((x) => x.id === id);
  if (!task) return;
  const w = why(task, ctx.now);
  const dlg = $('#dlg-why');
  const lines = w.parts.map((p) => `<div class="why-line"><dt>${esc(capitalize(p.label))}</dt><dd>+${esc(num(p.points))}</dd></div>`).join('');
  const notes = [];
  if (task.priority >= 8) notes.push(t('why.priority_guard'));
  if (w.cote >= 100) notes.push(t('why.capped'));
  dlg.innerHTML = `
    <header class="sheet-head">
      <h2 class="sheet-title" id="why-t">${esc(t('why.sheet.title', { cote: w.cote }))}</h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('add.close'))}">${icon('x')}</button>
    </header>
    <div class="sheet-body"><div class="why">
      <p class="why-note" style="color:var(--text)">${esc(task.task)}</p>
      <dl class="why-ledger">${lines}<div class="why-line why-total"><dt>${esc(t('why.total'))}</dt><dd>${esc(num(w.cote))}</dd></div></dl>
      ${notes.map((n) => `<p class="why-note">${esc(n)}</p>`).join('')}
      <p class="why-note">${esc(t('why.note'))}</p>
    </div></div>`;
  openSheet(dlg);
}

// ───────── Confirmation ─────────
export function confirmDialog({ title, body, extra = '', yes, no, danger = false }) {
  const dlg = $('#dlg-confirm');
  dlg.innerHTML = `
    <div class="sheet-body"><div class="confirm" role="alertdialog" aria-labelledby="cf-t" aria-describedby="cf-d">
      <p class="confirm-title" id="cf-t">${icon(danger ? 'trash' : 'undo')}${esc(title)}</p>
      <p id="cf-d">${esc(body)}${extra ? ' ' + esc(extra) : ''}</p>
      <div class="confirm-actions">
        <button class="btn btn--secondary" type="button" data-answer="no" autofocus>${esc(no)}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="button" data-answer="yes">${esc(yes)}</button>
      </div>
    </div></div>`;
  return new Promise((resolve) => {
    let answer = false;
    const onClick = (e) => {
      const b = e.target.closest('[data-answer]');
      if (!b) return;
      answer = b.dataset.answer === 'yes';
      closeSheet(dlg);
    };
    dlg.addEventListener('click', onClick);
    dlg.addEventListener('close', () => { dlg.removeEventListener('click', onClick); resolve(answer); }, { once: true });
    openSheet(dlg);
  });
}

export function confirmDelete(ctx, task) {
  const given = ctx.ledger.find((e) => e.type === 'bonus' && e.bonus === 'ajout' && e.taskId === task.id && e.energy > 0 && e.at);
  const bonus = given && hoursBetween(given.at, ctx.now) < 24 ? t('confirm.delete.bonus') : '';
  return confirmDialog({
    title: t('confirm.delete.title'), body: t('confirm.delete.body', { quete: task.task }), extra: bonus,
    yes: t('confirm.delete.yes'), no: t('confirm.delete.no'), danger: true,
  });
}
export function confirmRemballer() {
  return confirmDialog({ title: t('confirm.undo.title'), body: t('confirm.undo.body'), yes: t('confirm.undo.yes'), no: t('confirm.undo.no') });
}

// ───────── Code d'accès ─────────
export function openToken(onSaved, { bad = false, locked = 0 } = {}) {
  const err = locked ? tn('token.locked', Math.max(1, Math.ceil(locked / 60))) : bad ? t('token.bad') : '';
  const dlg = $('#dlg-token');
  dlg.innerHTML = `
    <header class="sheet-head"><h2 class="sheet-title" id="tok-t">${esc(t('token.title'))}</h2></header>
    <form class="sheet-body" id="token-form" novalidate>
      <p>${esc(t('token.text'))}</p>
      <div class="field">
        <label class="field-label" for="tok-in">${esc(t('token.label'))}</label>
        <input class="input" id="tok-in" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"${err ? ' aria-invalid="true" aria-describedby="tok-err"' : ''}>
        ${err ? `<p class="field-error" id="tok-err">${icon('why')}${esc(err)}</p>` : ''}
      </div>
    </form>
    <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="submit" form="token-form">${esc(t('token.save'))}</button></footer>`;
  dlg.onsubmit = null;
  $('#token-form', dlg).addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#tok-in', dlg).value.trim();
    if (!v) return;
    token.set(v);
    closeSheet(dlg);
    onSaved();
  });
  if (!dlg.open) openSheet(dlg);
  $('#tok-in', dlg).focus();
}

// ───────── Aide d'une ressource : ce que c'est, d'où ça vient, à quoi ça sert ─────────
const HELP = { energie: 'resource.energy', materiaux: 'resource.materials.other', nourriture: 'resource.food', habitants: 'resource.habitants', permis: 'resource.permis' };
export function openHelp(name) {
  const nom = HELP[name];
  if (!nom) return;
  const dlg = $('#dlg-help');
  // la phrase des Matériaux dit le bonus de la semaine tenue, celle des permis le nombre de jours travaillés pour un permis
  const vars = { n: SEMAINE_TENUE.materials, jours: SEMAINE_TENUE.jours, parPermis: JOURS_PAR_PERMIS };
  const line = (k) => `<div class="help-line"><dt>${esc(t(`help.${k}`))}</dt><dd>${esc(t(`help.${name}.${k}`, vars))}</dd></div>`;
  dlg.innerHTML = `
    <header class="sheet-head"><h2 class="sheet-title help-title" id="help-t" data-res="${esc(name)}">${icon(name)}<span>${esc(t(nom))}</span></h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('add.close'))}">${icon('x')}</button></header>
    <div class="sheet-body"><dl class="help-lines">${line('quoi')}${line('source')}${line('usage')}</dl></div>`;
  openSheet(dlg);
}

/**
 * « Tout est enregistré, à demain » : écran de fin de visite. La prochaine quête en grand, une réplique, et rien d'autre.
 * `saved` : true seulement quand tout est bien enregistré (sinon la phrase de réassurance n'est pas écrite).
 * `onClose` : appelé à la fermeture (le monde allume alors ses lanternes).
 */
export function openVeille({ next, reply, saved, onClose }) {
  const dlg = $('#dlg-veille');
  const m = next ? taskModel(next, { now: maintenant() }) : null;
  dlg.innerHTML = `
    <header class="sheet-head"><h2 class="sheet-title" id="veille-t">${esc(t(saved ? 'visit.end.title' : 'visit.end.title.pending'))}</h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('visit.end.close'))}">${icon('x')}</button></header>
    <div class="sheet-body veille">
      ${reply ? `<p class="veille-reply"><span class="speech-name">${esc(reply.nom)}</span><span class="veille-text">${esc(reply.texte)}</span></p>` : ''}
      ${m ? `<p class="veille-label">${esc(t('visit.end.next'))}</p>
        <p class="veille-quest">${esc(next.task)}</p>
        <p class="veille-meta">${esc(m.quartierName)} · ${esc(durationText(next.length))}</p>` : `<p class="veille-text">${esc(t('visit.end.empty'))}</p>`}
      ${saved ? `<p class="veille-saved">${icon('cloud-ok')}${esc(t(m ? 'visit.end.sub' : 'visit.end.saved'))}</p>` : ''}
    </div>
    <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="button" data-close>${esc(t('visit.end.show'))}</button></footer>`;
  dlg.addEventListener('close', () => { if (onClose) onClose(); }, { once: true });
  openSheet(dlg);
}

/**
 * Câblage commun : fermeture au fond, Échap animé, bouton data-close. Une feuille peut remplacer la fermeture
 * (`_dismiss` : la scène « passe » au lieu de finir). Chaque feuille porte ses régions lues (#live et #live-world sont
 * inertes derrière elle) ; son contenu est réécrit à chaque rendu, elles y sont remises aussitôt.
 */
export function wireDialogs() {
  for (const d of $$('dialog.sheet')) {
    const dismiss = () => (d._dismiss ? d._dismiss() : closeSheet(d));
    d.addEventListener('cancel', (e) => { e.preventDefault(); dismiss(); });
    d.addEventListener('click', (e) => { if (e.target === d) dismiss(); });
    const regions = ['live', 'live-world'].map((id) => {
      const p = document.createElement('p');
      p.className = 'sr-only';
      p.setAttribute('role', 'status');
      p.dataset.live = id;
      return p;
    });
    const keep = () => { for (const p of regions) if (p.parentNode !== d) d.append(p); };
    keep();
    new MutationObserver(keep).observe(d, { childList: true });
  }
}

export { estimatedMinutes };
