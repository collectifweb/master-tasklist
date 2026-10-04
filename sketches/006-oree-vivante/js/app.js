import { BUILDABLES, CHAPTER_STEPS, RESOURCE_HELP } from './data.js';
import { OreeModel } from './model.js';
import {
  INCIDENT_META,
  catalogMarkup,
  entitiesMarkup,
  entitySheetMarkup,
  escapeHtml,
  icon,
  incidentSheetMarkup,
  objectivesMarkup,
  questsMarkup,
  recommendedTaskMarkup,
  terrainMarkup
} from './ui.js';

const model = new OreeModel();
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const ui = {
  selectedEntityId: null,
  taskExpanded: false,
  activePanel: null,
  lastFocus: null,
  toastTimer: null,
  resourceTimer: null,
  pendingDeleteId: null,
  build: { active: false, type: null, cell: null, cellTouched: false, rotation: 0, dragging: false },
  pan: { active: false, pointerId: null, x: 0, y: 0, cameraX: 0, cameraY: 0, moved: false },
  suppressClick: false
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function applyCamera(immediate = false) {
  const { x, y, zoom, rotation } = model.state.camera;
  const stage = $('#map-stage');
  stage.classList.toggle('no-transition', immediate);
  stage.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${zoom}) rotate(${rotation}deg)`;
  if (immediate) requestAnimationFrame(() => stage.classList.remove('no-transition'));
}

function setCamera(patch, immediate = false) {
  const next = { ...model.state.camera, ...patch };
  next.zoom = clamp(next.zoom, .65, 1.5);
  next.x = clamp(next.x, -250, 250);
  next.y = clamp(next.y, -190, 190);
  next.rotation = ((next.rotation % 360) + 360) % 360;
  model.setCamera(next);
  applyCamera(immediate);
  renderMap();
}

function renderResources() {
  const { energy, materials, confidence } = model.state.resources;
  $('#energy-value').textContent = energy;
  $('#materials-value').textContent = materials;
  $('#confidence-value').textContent = confidence;
  $('.resources').setAttribute('aria-label', `${energy} Énergie, ${materials} Matériaux, ${confidence} Confiance`);
  const incidentCount = model.activeIncidents.length;
  const weather = model.state.chapter.weatherSignal ? 'signal établi' : model.state.chapter.towerStable ? 'tour stable' : incidentCount ? `${incidentCount} incident${incidentCount > 1 ? 's' : ''}` : 'matin clair';
  $('#day-label').textContent = innerWidth < 700 ? `J${model.state.day}` : `Jour ${model.state.day} · ${weather}`;
}

function renderMap(focusCell = false) {
  $('#terrain-layer').innerHTML = terrainMarkup(model, ui.build);
  $('#entity-layer').innerHTML = entitiesMarkup(model, ui.selectedEntityId, model.state.camera.rotation, ui.build);
  applyCamera();
  if (focusCell && ui.build.cell) requestAnimationFrame(() => $(`[data-map-cell="${ui.build.cell.row}:${ui.build.cell.col}"]`)?.focus());
}

function renderTask() {
  $('#recommended-task').innerHTML = recommendedTaskMarkup(model, ui.taskExpanded);
}

function renderChapter() {
  const index = model.chapterIndex;
  const safeIndex = Math.min(index, CHAPTER_STEPS.length - 1);
  const step = CHAPTER_STEPS[safeIndex];
  $('#now-objective').textContent = index >= CHAPTER_STEPS.length ? 'Explorer l’Orée' : step.title;
  $('#chapter-step').textContent = index >= CHAPTER_STEPS.length ? '6 sur 6 · Signal transmis' : `${safeIndex + 1} sur 6 · ${step.title}`;
  $('#chapter-progress').style.transform = `scaleX(${Math.max(.08, index / CHAPTER_STEPS.length)})`;
  const messages = [
    'Trois parcelles tiennent bon. À toi de relancer l’Orée.',
    'Une parcelle libre attend tes semences.',
    'Milo veut inspecter la Tour météo.',
    'La première quête du jour renforce la Confiance.',
    'Les codes sont prêts. Stabilise la Tour.',
    'La vallée écoute. Émets le relevé.',
    'Signal reçu. Les Archives ont répondu.'
  ];
  $('#character-line').textContent = messages[Math.min(index, messages.length - 1)];
}

function renderBuild() {
  $('#build-dock').hidden = !ui.build.active;
  document.body.classList.toggle('is-building', ui.build.active);
  $('[data-build-mode]').classList.toggle('is-active', ui.build.active);
  $('[data-build-mode]').setAttribute('aria-pressed', String(ui.build.active));
  $('#build-catalog').innerHTML = catalogMarkup(ui.build.type);
  const placing = Boolean(ui.build.type && ui.build.cell && ui.build.cellTouched);
  $('#placement-actions').hidden = !placing;
  let step = 1;
  let instruction = '1. Choisis un objet';
  if (ui.build.type && !placing) { step = 2; instruction = '2. Choisis une case'; }
  if (placing) {
    step = 3;
    instruction = model.canPlace(ui.build.cell.row, ui.build.cell.col) ? '3. Tourne ou confirme' : '2. Choisis une autre case';
  }
  $('#build-instruction').textContent = instruction;
  $$('[data-build-step]').forEach(item => item.classList.toggle('is-current', Number(item.dataset.buildStep) === step));
  $('[data-confirm-placement]').disabled = !placing || !model.canPlace(ui.build.cell.row, ui.build.cell.col) || !model.canAfford(BUILDABLES[ui.build.type]);
}

function renderSheet() {
  const sheet = $('#game-sheet');
  document.body.classList.toggle('has-sheet', Boolean(ui.activePanel));
  if (!ui.activePanel) {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    return;
  }
  let title = '';
  let kicker = '';
  let content = '';
  if (ui.activePanel === 'objectives') {
    title = 'Cap de l’intendant'; kicker = 'Objectifs'; content = objectivesMarkup(model);
  } else if (ui.activePanel === 'quests') {
    title = 'Quêtes réelles'; kicker = 'Registre local'; content = questsMarkup(model);
  } else if (ui.activePanel === 'entity') {
    const entity = model.getEntity(ui.selectedEntityId);
    if (!entity || entity.status === 'cleared') { closeSheet(false); return; }
    title = entity.name; kicker = entity.type === 'bastion' || entity.type === 'tower' ? 'Bastion' : 'Ferme'; content = entitySheetMarkup(entity, model);
  } else if (ui.activePanel.startsWith('incident:')) {
    const id = ui.activePanel.split(':')[1];
    const incident = model.getIncident(id);
    if (!incident || !['active', 'contained'].includes(incident.status)) { closeSheet(false); return; }
    title = INCIDENT_META[id].title; kicker = `Incident · jour ${incident.day}`; content = incidentSheetMarkup(id, incident, model);
  }
  $('#sheet-title').textContent = title;
  $('#sheet-kicker').textContent = kicker;
  $('#sheet-content').innerHTML = content;
  sheet.classList.add('is-open');
  sheet.setAttribute('aria-hidden', 'false');
  $('.sheet-panel').setAttribute('aria-modal', String(innerWidth < 700));
}

function renderAll() {
  renderResources();
  renderMap();
  renderTask();
  renderChapter();
  renderBuild();
  renderSheet();
}

function showToast(title, copy) {
  clearTimeout(ui.toastTimer);
  $('#toast-title').textContent = title;
  $('#toast-copy').textContent = copy;
  $('#toast').classList.add('is-visible');
  $('#live-region').textContent = `${title}. ${copy}`;
  ui.toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 3800);
}

function pulseResources(reward, origin) {
  const keys = ['energy', 'materials', 'confidence'].filter(key => reward[key] > 0);
  keys.forEach(key => {
    const resource = $(`.resource-${key}`);
    resource.classList.remove('is-gaining');
    requestAnimationFrame(() => resource.classList.add('is-gaining'));
    setTimeout(() => resource.classList.remove('is-gaining'), 760);
  });
  if (reducedMotion.matches || !origin) return;
  keys.forEach((key, index) => {
    const target = $(`.resource-${key}`).getBoundingClientRect();
    const particle = document.createElement('span');
    particle.className = 'reward-particle';
    particle.style.color = key === 'energy' ? '#936313' : key === 'materials' ? '#2d7473' : '#3f6047';
    particle.style.left = `${origin.left + origin.width / 2 - 15 + index * 7}px`;
    particle.style.top = `${origin.top + origin.height / 2 - 15}px`;
    particle.innerHTML = icon(key === 'energy' ? 'bolt' : key === 'materials' ? 'crate' : 'star');
    $('#reward-layer').appendChild(particle);
    requestAnimationFrame(() => {
      particle.style.translate = `${target.left + target.width / 2 - (origin.left + origin.width / 2) - index * 7}px ${target.top + target.height / 2 - (origin.top + origin.height / 2)}px`;
      particle.style.scale = '.3';
      particle.style.opacity = '.08';
    });
    setTimeout(() => particle.remove(), 900);
  });
}

function openSheet(panel, trigger = document.activeElement) {
  ui.lastFocus = trigger;
  ui.activePanel = panel;
  renderSheet();
  requestAnimationFrame(() => $('.sheet-panel').focus());
}

function closeSheet(restoreFocus = true) {
  ui.activePanel = null;
  renderSheet();
  if (restoreFocus) ui.lastFocus?.focus?.();
}

function selectEntity(id, trigger) {
  const entity = model.getEntity(id);
  if (!entity || entity.status === 'cleared') return;
  ui.selectedEntityId = id;
  openSheet('entity', trigger);
  renderAll();
}

function setBuildCell(row, col, focus = false) {
  ui.build.cell = { row: clamp(row, 0, 7), col: clamp(col, 0, 7) };
  ui.build.cellTouched = true;
  renderMap(focus);
  renderBuild();
}

function chooseBuildType(type, useFirstCell = false) {
  ui.build.type = type;
  ui.build.rotation = 0;
  ui.build.cell = useFirstCell ? model.firstBuildableCell() : null;
  ui.build.cellTouched = false;
  renderMap();
  renderBuild();
  if (useFirstCell) requestAnimationFrame(() => $(`[data-map-cell="${ui.build.cell.row}:${ui.build.cell.col}"]`)?.focus());
}

function toggleBuildMode(force) {
  ui.build.active = typeof force === 'boolean' ? force : !ui.build.active;
  if (!ui.build.active) ui.build = { active: false, type: null, cell: null, cellTouched: false, rotation: 0, dragging: false };
  closeSheet(false);
  renderAll();
  if (ui.build.active) {
    showToast('Construction', '1. Choisis  2. Place  3. Confirme.');
    requestAnimationFrame(() => $('#build-catalog .catalog-item')?.focus());
  }
}

function onboardingCopy(step) {
  return [
    { title: 'L’Orée a besoin d’un intendant', copy: 'La tempête a coupé la vallée. La ferme nourrit encore la colonie, mais le Bastion s’éteint.', action: 'Prendre l’intendance' },
    { title: 'Le réel alimente la ferme', copy: 'Une quête terminée donne Énergie et Matériaux. La première du jour donne aussi +1 Confiance.', action: 'Voir la ferme' },
    { title: 'Premier objectif', copy: 'Termine une quête, puis plante et répare la Tour météo.', action: 'Commencer' }
  ][step];
}

function renderOnboarding() {
  const onboarding = $('#onboarding');
  if (model.state.onboardingComplete) { onboarding.hidden = true; return; }
  const step = clamp(model.state.onboardingStep, 0, 2);
  const content = onboardingCopy(step);
  onboarding.hidden = false;
  $('#onboarding-step').textContent = `${step + 1} / 3`;
  $('#onboarding-title').textContent = content.title;
  $('#onboarding-copy').textContent = content.copy;
  $('[data-next-onboarding]').textContent = content.action;
}

function finishOnboarding() {
  model.setOnboarding(3, true);
  renderOnboarding();
  showToast('Intendance ouverte', 'Commence par la quête conseillée.');
}

function fillRatingSelects() {
  ['priority', 'length', 'difficulty'].forEach(name => {
    const select = $(`#task-${name}`);
    select.innerHTML = Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">${index + 1} / 10</option>`).join('');
  });
}

function openTaskDialog(task = null) {
  $('#task-form').reset();
  $('#task-id').value = task?.id || '';
  $('#task-dialog-title').textContent = task ? 'Modifier la quête' : 'Ajouter une quête';
  $('#task-title').value = task?.task || '';
  $('#task-domain').value = task?.domain || 'Maison';
  $('#task-priority').value = String(task?.priority || 5);
  $('#task-length').value = String(task?.length || 3);
  $('#task-difficulty').value = String(task?.difficulty || 3);
  $('#task-dialog').showModal();
  requestAnimationFrame(() => $('#task-title').focus());
}

function closeTaskDialog() {
  $('#task-dialog').close();
}

function submitTaskForm(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const task = data.id ? model.updateTask(data.id, data) : model.addTask(data);
    closeTaskDialog();
    ui.activePanel = 'quests';
    renderAll();
    showToast(data.id ? 'Quête modifiée' : 'Quête ajoutée', `${task.task} · recommandation recalculée.`);
  } catch (error) {
    showToast('Impossible d’enregistrer', error.message);
  }
}

function confirmPlacement() {
  try {
    const item = model.place(ui.build.type, ui.build.cell.row, ui.build.cell.col, ui.build.rotation);
    const definition = BUILDABLES[ui.build.type];
    ui.build.cell = null;
    ui.build.cellTouched = false;
    renderAll();
    showToast('Construction terminée', `${item.name} · ${definition.energy} Énergie, ${definition.materials} Matériaux.`);
  } catch (error) {
    showToast('Placement impossible', error.message);
  }
}

function handleClick(event) {
  const button = event.target.closest('button, [data-select-entity]');
  if (!button || ui.suppressClick) return;

  const resource = button.closest('[data-resource-help]');
  if (resource) {
    const key = resource.dataset.resourceHelp;
    const info = RESOURCE_HELP[key];
    clearTimeout(ui.resourceTimer);
    $$('.resource').forEach(item => item.setAttribute('aria-expanded', String(item === resource && $('#resource-popover').hidden)));
    $('#resource-popover').innerHTML = `<strong>${escapeHtml(info.title)}</strong>${escapeHtml(info.text)}`;
    $('#resource-popover').hidden = false;
    ui.resourceTimer = setTimeout(() => { $('#resource-popover').hidden = true; resource.setAttribute('aria-expanded', 'false'); }, 5200);
    return;
  }

  if (button.closest('[data-toggle-task]')) { ui.taskExpanded = !ui.taskExpanded; renderTask(); return; }
  if (button.closest('[data-dismiss-character]')) { $('#character-bubble').hidden = true; return; }
  if (button.closest('[data-open-panel]')) { openSheet(button.closest('[data-open-panel]').dataset.openPanel, button); return; }
  if (button.closest('[data-close-sheet]')) { closeSheet(); return; }
  if (button.closest('[data-build-mode]')) { toggleBuildMode(); return; }
  if (button.closest('[data-cancel-build]')) { toggleBuildMode(false); return; }

  const incidentMarker = button.closest('[data-open-incident]');
  if (incidentMarker) { openSheet(`incident:${incidentMarker.dataset.openIncident}`, incidentMarker); return; }

  const buildItem = button.closest('[data-build-item]');
  if (buildItem) { chooseBuildType(buildItem.dataset.buildItem, true); return; }

  const mapCell = button.closest('[data-map-cell]');
  if (mapCell && ui.build.active && ui.build.type) {
    const [row, col] = mapCell.dataset.mapCell.split(':').map(Number);
    setBuildCell(row, col);
    return;
  }

  if (button.closest('[data-rotate-placement]')) { ui.build.rotation = (ui.build.rotation + 90) % 360; renderMap(); return; }
  if (button.closest('[data-clear-placement]')) { ui.build.cell = model.firstBuildableCell(); ui.build.cellTouched = false; renderAll(); return; }
  if (button.closest('[data-confirm-placement]')) { confirmPlacement(); return; }

  const mapAction = button.closest('[data-map-action]');
  if (mapAction) {
    const action = mapAction.dataset.mapAction;
    if (action === 'zoom-in') setCamera({ zoom: model.state.camera.zoom + .14 });
    if (action === 'zoom-out') setCamera({ zoom: model.state.camera.zoom - .14 });
    if (action === 'rotate') setCamera({ rotation: model.state.camera.rotation + 90 });
    if (action === 'recenter') setCamera({ x: -10, y: 24, zoom: innerWidth < 700 ? .74 : .95, rotation: 0 });
    return;
  }

  const entityButton = button.closest('[data-select-entity]');
  if (entityButton && !ui.build.active) { selectEntity(entityButton.dataset.selectEntity, entityButton); return; }

  if (button.closest('[data-add-task]')) { openTaskDialog(); return; }
  const edit = button.closest('[data-edit-task]');
  if (edit) { openTaskDialog(model.getTask(edit.dataset.editTask)); return; }
  const remove = button.closest('[data-delete-task]');
  if (remove) {
    const task = model.getTask(remove.dataset.deleteTask);
    ui.pendingDeleteId = task?.id || null;
    $('#delete-copy').textContent = task ? `« ${task.task} » sera retirée de la copie locale.` : 'Cette action touche seulement la copie locale.';
    $('#delete-dialog').showModal();
    return;
  }
  if (button.closest('[data-close-task-dialog]')) { closeTaskDialog(); return; }

  const start = button.closest('[data-start-task]');
  if (start) {
    try { const task = model.startTask(start.dataset.startTask); ui.taskExpanded = true; closeSheet(false); renderAll(); showToast('Quête lancée', task.task); }
    catch (error) { showToast('Quête indisponible', error.message); }
    return;
  }
  if (button.closest('[data-cancel-task]')) { const task = model.cancelTask(); renderAll(); showToast('Quête arrêtée', task ? 'Elle reste ouverte.' : 'Aucune quête modifiée.'); return; }
  const complete = button.closest('[data-complete-task]');
  if (complete) {
    const origin = complete.getBoundingClientRect();
    try {
      const { task, reward, confidenceBonus } = model.completeTask(complete.dataset.completeTask);
      ui.taskExpanded = false;
      renderAll();
      pulseResources(reward, origin);
      showToast('Quête accomplie', `+${reward.energy} Énergie · +${reward.materials} Matériaux${confidenceBonus ? ' · +1 Confiance' : ''}.`);
      $('#live-region').textContent += ` ${task.task}`;
    } catch (error) { showToast('Complétion impossible', error.message); }
    return;
  }
  const reactivate = button.closest('[data-reactivate-task]');
  if (reactivate) { model.reactivateTask(reactivate.dataset.reactivateTask); renderAll(); showToast('Quête réactivée', 'La recommandation est recalculée.'); return; }

  const plant = button.closest('[data-plant]');
  if (plant) { try { model.plant(plant.dataset.plant); renderAll(); showToast('Parcelle semée', 'Récolte dans deux jours.'); } catch (error) { showToast('Plantation impossible', error.message); } return; }
  const harvest = button.closest('[data-harvest]');
  if (harvest) { try { const result = model.harvest(harvest.dataset.harvest); renderAll(); pulseResources({ energy: 0, materials: result.materials, confidence: 0 }, harvest.getBoundingClientRect()); showToast('Récolte stockée', `+${result.materials} Matériau${result.materials > 1 ? 'x' : ''}.`); } catch (error) { showToast('Récolte impossible', error.message); } return; }
  if (button.closest('[data-advance-day]')) {
    const before = new Set(model.activeIncidents.map(([id]) => id));
    model.advanceDay();
    renderAll();
    const fresh = model.activeIncidents.find(([id]) => !before.has(id));
    showToast(`Jour ${model.state.day}`, fresh ? INCIDENT_META[fresh[0]].title : 'Les cultures avancent.');
    if (fresh) openSheet(`incident:${fresh[0]}`, button);
    return;
  }
  if (button.closest('[data-repair-greenhouse]')) { try { model.repairGreenhouse(); renderAll(); showToast('Serre active', 'Ventilation et lampes solaires relancées.'); } catch (error) { showToast('Réparation impossible', error.message); } return; }
  if (button.closest('[data-clear-rocks]')) { try { model.clearRocks(); ui.selectedEntityId = null; closeSheet(false); renderAll(); showToast('Extension ouverte', 'Six cases sont constructibles.'); } catch (error) { showToast('Déblayage impossible', error.message); } return; }
  if (button.closest('[data-inspect-tower]')) { model.inspectTower(); renderAll(); showToast('Diagnostic de Milo', 'Il faut 3 Confiance, 6 Énergie et 12 Matériaux.'); return; }
  if (button.closest('[data-stabilize-tower]')) { try { model.stabilizeTower(); renderAll(); showToast('Tour stabilisée', 'Le réseau météo attend ton ordre.'); } catch (error) { showToast('Stabilisation impossible', error.message); } return; }
  if (button.closest('[data-weather-signal]')) { try { model.emitWeatherSignal(); renderAll(); showToast('Signal transmis', 'Les Archives ont répondu.'); } catch (error) { showToast('Signal impossible', error.message); } return; }

  const resolve = button.closest('[data-resolve-incident]');
  if (resolve) {
    try {
      const id = resolve.dataset.resolveIncident;
      model.resolveIncident(id, resolve.dataset.choice);
      renderAll();
      showToast(resolve.dataset.choice === 'paid' ? 'Incident réglé' : 'Incident contenu', resolve.dataset.choice === 'paid' ? 'Aucune conséquence.' : 'La conséquence reste visible et réparable.');
    } catch (error) { showToast('Décision impossible', error.message); }
    return;
  }
  const recover = button.closest('[data-recover-incident]');
  if (recover) {
    try { model.recoverIncident(recover.dataset.recoverIncident); closeSheet(false); renderAll(); showToast('Incident réparé', 'Le marqueur a disparu de la carte.'); }
    catch (error) { showToast('Réparation impossible', error.message); }
    return;
  }

  if (button.closest('[data-reset-sandbox]')) { $('#reset-dialog').showModal(); return; }
  if (button.closest('#confirm-reset')) {
    model.reset();
    ui.selectedEntityId = null;
    ui.taskExpanded = false;
    ui.activePanel = null;
    ui.build = { active: false, type: null, cell: null, cellTouched: false, rotation: 0, dragging: false };
    renderAll();
    renderOnboarding();
    showToast('Sandbox réinitialisé', 'État initial restauré.');
  }
  if (button.closest('#confirm-delete') && ui.pendingDeleteId) {
    try {
      const task = model.deleteTask(ui.pendingDeleteId);
      ui.pendingDeleteId = null;
      renderAll();
      showToast('Quête supprimée', `${task.task} · recommandation recalculée.`);
    } catch (error) { showToast('Suppression impossible', error.message); }
  }
}

function startPan(event) {
  if (event.target.closest('button') || ui.build.dragging) return;
  ui.pan = { active: true, pointerId: event.pointerId, x: event.clientX, y: event.clientY, cameraX: model.state.camera.x, cameraY: model.state.camera.y, moved: false };
  $('#map-viewport').setPointerCapture(event.pointerId);
  $('#map-viewport').classList.add('is-dragging');
  $('#map-stage').classList.add('no-transition');
}

function movePan(event) {
  if (!ui.pan.active || event.pointerId !== ui.pan.pointerId) return;
  const dx = event.clientX - ui.pan.x;
  const dy = event.clientY - ui.pan.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) ui.pan.moved = true;
  model.state.camera.x = clamp(ui.pan.cameraX + dx, -250, 250);
  model.state.camera.y = clamp(ui.pan.cameraY + dy, -190, 190);
  applyCamera(true);
}

function endPan(event) {
  if (!ui.pan.active || event.pointerId !== ui.pan.pointerId) return;
  model.save();
  ui.suppressClick = ui.pan.moved;
  setTimeout(() => { ui.suppressClick = false; }, 0);
  ui.pan.active = false;
  $('#map-viewport').classList.remove('is-dragging');
  $('#map-stage').classList.remove('no-transition');
}

function handleMapKeyboard(event) {
  const cellButton = event.target.closest('[data-map-cell]');
  if (cellButton && ui.build.active && ui.build.type) {
    const [row, col] = cellButton.dataset.mapCell.split(':').map(Number);
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (moves[event.key]) {
      event.preventDefault();
      const [dr, dc] = moves[event.key];
      setBuildCell(row + dr, col + dc, true);
      return;
    }
    if (event.key === 'r' || event.key === 'R') { event.preventDefault(); ui.build.rotation = (ui.build.rotation + 90) % 360; renderMap(true); return; }
    if ((event.key === 'Enter' || event.key === ' ') && model.canPlace(row, col)) { event.preventDefault(); confirmPlacement(); return; }
    if (event.key === 'Escape') { event.preventDefault(); ui.build.cell = null; renderAll(); return; }
  }

  const amount = event.shiftKey ? 50 : 24;
  const actions = {
    ArrowLeft: { x: model.state.camera.x + amount }, ArrowRight: { x: model.state.camera.x - amount },
    ArrowUp: { y: model.state.camera.y + amount }, ArrowDown: { y: model.state.camera.y - amount },
    '+': { zoom: model.state.camera.zoom + .12 }, '=': { zoom: model.state.camera.zoom + .12 }, '-': { zoom: model.state.camera.zoom - .12 },
    '0': { x: -10, y: 24, zoom: innerWidth < 700 ? .74 : .95, rotation: 0 }, r: { rotation: model.state.camera.rotation + 90 }, R: { rotation: model.state.camera.rotation + 90 }
  };
  if (!actions[event.key]) return;
  event.preventDefault();
  setCamera(actions[event.key]);
}

function handleDragStart(event) {
  const item = event.target.closest('[data-build-item]');
  if (!item || !ui.build.active) return;
  ui.build.dragging = true;
  chooseBuildType(item.dataset.buildItem, false);
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', item.dataset.buildItem);
  $('#map-viewport').classList.add('is-drop-target');
}

function tileAtPoint(x, y) {
  return document.elementsFromPoint(x, y).find(element => element.matches?.('[data-map-cell]')) || null;
}

function handleMapDragOver(event) {
  if (!ui.build.dragging || !ui.build.type) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  const tile = tileAtPoint(event.clientX, event.clientY) || event.target.closest('[data-map-cell]');
  if (!tile) return;
  const [row, col] = tile.dataset.mapCell.split(':').map(Number);
  if (ui.build.cell?.row === row && ui.build.cell?.col === col) return;
  ui.build.cell = { row, col };
  ui.build.cellTouched = true;
  renderMap();
  renderBuild();
}

function handleMapDrop(event) {
  if (!ui.build.dragging) return;
  event.preventDefault();
  ui.build.dragging = false;
  $('#map-viewport').classList.remove('is-drop-target');
  renderBuild();
  showToast('Fantôme aimanté', 'Tourne si besoin, puis confirme.');
}

function handleDragEnd() {
  ui.build.dragging = false;
  $('#map-viewport').classList.remove('is-drop-target');
}

function trapSheetFocus(event) {
  if (event.key === 'Escape' && ui.activePanel) { closeSheet(); return; }
  if (event.key !== 'Tab' || !ui.activePanel || innerWidth >= 700) return;
  const focusable = $$('#game-sheet .sheet-panel button:not(:disabled), #game-sheet .sheet-panel input, #game-sheet .sheet-panel select, #game-sheet .sheet-panel textarea, #game-sheet .sheet-panel [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

fillRatingSelects();
renderAll();
renderOnboarding();
if (model.state.camera.zoom === 1 && innerWidth < 700) setCamera({ x: -10, y: 24, zoom: .74 }, true);
else applyCamera(true);

$('#task-form').addEventListener('submit', submitTaskForm);
document.addEventListener('click', handleClick);
document.addEventListener('keydown', trapSheetFocus);
document.addEventListener('dragstart', handleDragStart);
document.addEventListener('dragend', handleDragEnd);
$('#map-viewport').addEventListener('keydown', handleMapKeyboard);
$('#map-viewport').addEventListener('pointerdown', startPan);
$('#map-viewport').addEventListener('pointermove', movePan);
$('#map-viewport').addEventListener('pointerup', endPan);
$('#map-viewport').addEventListener('pointercancel', endPan);
$('#map-viewport').addEventListener('dragover', handleMapDragOver);
$('#map-viewport').addEventListener('drop', handleMapDrop);
$('[data-next-onboarding]').addEventListener('click', () => {
  const next = model.state.onboardingStep + 1;
  if (next >= 3) finishOnboarding();
  else { model.setOnboarding(next, false); renderOnboarding(); }
});
$('[data-skip-onboarding]').addEventListener('click', finishOnboarding);
window.addEventListener('resize', () => { renderMap(); renderSheet(); });
