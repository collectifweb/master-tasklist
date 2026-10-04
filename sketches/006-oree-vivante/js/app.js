import { BUILDABLES, CHAPTER_STEPS, RESOURCE_HELP } from './data.js';
import { OreeModel } from './model.js';
import {
  catalogMarkup,
  entitiesMarkup,
  entitySheetMarkup,
  escapeHtml,
  icon,
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
  build: { active: false, type: null, cell: null, rotation: 0 },
  drag: { active: false, pointerId: null, x: 0, y: 0, cameraX: 0, cameraY: 0, moved: false },
  suppressClick: false
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function applyCamera(immediate = false) {
  const { x, y, zoom, rotation } = model.state.camera;
  const stage = $('#map-stage');
  stage.classList.toggle('no-transition', immediate);
  stage.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${zoom}) rotate(${rotation}deg)`;
  stage.style.setProperty('--map-rotation', `${rotation}deg`);
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
  const { energy, materials, reputation } = model.state.resources;
  $('#energy-value').textContent = energy;
  $('#materials-value').textContent = materials;
  $('#reputation-value').textContent = reputation;
  $('.resources').setAttribute('aria-label', `${energy} Énergie, ${materials} Matériaux, ${reputation} Réputation`);
  $('#day-label').textContent = `Jour ${model.state.day} · ${model.state.chapter.weatherSignal ? 'signal établi' : model.state.chapter.towerStable ? 'tour stable' : 'matin clair'}`;
}

function renderMap() {
  $('#terrain-layer').innerHTML = terrainMarkup(model, ui.build);
  $('#entity-layer').innerHTML = entitiesMarkup(model, ui.selectedEntityId, model.state.camera.rotation, ui.build);
  applyCamera();
}

function renderTask() {
  $('#recommended-task').innerHTML = recommendedTaskMarkup(model, ui.taskExpanded);
}

function renderChapter() {
  const index = model.chapterIndex;
  const safeIndex = Math.min(index, CHAPTER_STEPS.length - 1);
  const step = CHAPTER_STEPS[safeIndex];
  $('#now-objective').textContent = index >= CHAPTER_STEPS.length ? 'Chapitre accompli · explorer l’Orée' : step.title;
  $('#chapter-step').textContent = index >= CHAPTER_STEPS.length ? '6 sur 6 · Signal météo transmis' : `${safeIndex + 1} sur 6 · ${step.title}`;
  $('#chapter-progress').style.transform = `scaleX(${Math.max(.08, index / CHAPTER_STEPS.length)})`;
  const messages = [
    'Trois parcelles tiennent bon. Le reste dépend de ce que tu accomplis aujourd’hui.',
    'Les réserves circulent enfin. Une parcelle libre attend tes semences.',
    'Le Bastion capte quelque chose. Milo veut inspecter la Tour météo.',
    'Naïma ouvrira les codes à trois points de Réputation.',
    'Les codes sont prêts. Stabilise la Tour quand les réserves le permettent.',
    'La vallée écoute. Émets le premier relevé météo.',
    'Signal reçu. ÉCHO-7 a reconnu une fonction ancienne : intendant de continuité.'
  ];
  $('#character-line').textContent = messages[Math.min(index, messages.length - 1)];
}

function renderBuild() {
  $('#build-dock').hidden = !ui.build.active;
  $('[data-build-mode]').classList.toggle('is-active', ui.build.active);
  $('[data-build-mode]').setAttribute('aria-pressed', String(ui.build.active));
  $('#build-catalog').innerHTML = catalogMarkup(ui.build.type);
  const placing = Boolean(ui.build.type && ui.build.cell);
  $('#placement-actions').hidden = !placing;
  const instruction = !ui.build.type ? 'Choisissez un objet' : !ui.build.cell ? 'Touchez une case sur la carte' : model.canPlace(ui.build.cell.row, ui.build.cell.col) ? `Case ${ui.build.cell.row + 1}, ${ui.build.cell.col + 1} prête` : 'Case inaccessible';
  $('#build-instruction').textContent = instruction;
  $('[data-confirm-placement]').disabled = !placing || !model.canPlace(ui.build.cell.row, ui.build.cell.col) || !model.canAfford(BUILDABLES[ui.build.type]);
}

function renderSheet() {
  const sheet = $('#game-sheet');
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
  }
  $('#sheet-title').textContent = title;
  $('#sheet-kicker').textContent = kicker;
  $('#sheet-content').innerHTML = content;
  sheet.classList.add('is-open');
  sheet.setAttribute('aria-hidden', 'false');
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
  const keys = ['energy', 'materials', 'reputation'].filter(key => reward[key] > 0);
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
  requestAnimationFrame(() => $('#game-sheet .sheet-panel').focus?.());
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
  if (id === 'tower') model.inspectTower();
  openSheet('entity', trigger);
  renderAll();
}

function toggleBuildMode(force) {
  ui.build.active = typeof force === 'boolean' ? force : !ui.build.active;
  if (!ui.build.active) ui.build = { active: false, type: null, cell: null, rotation: 0 };
  closeSheet(false);
  renderAll();
  if (ui.build.active) showToast('Mode construction', 'Choisis un objet, puis une case éclairée sur la grille.');
}

function onboardingCopy(step) {
  return [
    { title: 'L’Orée a besoin d’un intendant', copy: 'La tempête a coupé la vallée. La ferme peut nourrir la colonie, mais le Bastion et son réseau météo s’éteignent.', action: 'Prendre l’intendance' },
    { title: 'Le réel alimente la ferme', copy: 'Solène : « Ce que tu accomplis hors d’ici devient Énergie, Matériaux et confiance des habitants. »', action: 'Voir la ferme' },
    { title: 'Premier objectif', copy: 'Termine une quête réelle, puis dépense ses ressources pour planter, déblayer et réveiller la Tour météo.', action: 'Commencer' }
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
  showToast('Intendance ouverte', 'La carte est active. Commence par la quête recommandée.');
  if (innerWidth >= 700) openSheet('objectives', $('[data-open-panel="objectives"]'));
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

  const buildItem = button.closest('[data-build-item]');
  if (buildItem) {
    ui.build.type = buildItem.dataset.buildItem;
    ui.build.cell = null;
    ui.build.rotation = 0;
    renderAll();
    return;
  }

  const mapCell = button.closest('[data-map-cell]');
  if (mapCell && ui.build.active && ui.build.type) {
    const [row, col] = mapCell.dataset.mapCell.split(':').map(Number);
    ui.build.cell = { row, col };
    renderAll();
    return;
  }

  if (button.closest('[data-rotate-placement]')) { ui.build.rotation = (ui.build.rotation + 90) % 360; renderAll(); return; }
  if (button.closest('[data-clear-placement]')) { ui.build.cell = null; renderAll(); return; }
  if (button.closest('[data-confirm-placement]')) {
    try {
      const item = model.place(ui.build.type, ui.build.cell.row, ui.build.cell.col, ui.build.rotation);
      const definition = BUILDABLES[ui.build.type];
      ui.build.cell = null;
      renderAll();
      showToast('Construction terminée', `${item.name} placé · ${definition.energy} Énergie et ${definition.materials} Matériaux dépensés.`);
    } catch (error) { showToast('Placement impossible', error.message); }
    return;
  }

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

  const start = button.closest('[data-start-task]');
  if (start) {
    try { const task = model.startTask(start.dataset.startTask); ui.taskExpanded = true; closeSheet(false); renderAll(); showToast('Mission lancée', task.task); }
    catch (error) { showToast('Mission indisponible', error.message); }
    return;
  }
  if (button.closest('[data-cancel-task]')) { const task = model.cancelTask(); renderAll(); showToast('Mission annulée', task ? `${task.task} reste ouverte, sans pénalité.` : 'Aucune quête modifiée.'); return; }
  const complete = button.closest('[data-complete-task]');
  if (complete) {
    const origin = complete.getBoundingClientRect();
    try {
      const { task, reward } = model.completeTask(complete.dataset.completeTask);
      ui.taskExpanded = false;
      renderAll();
      pulseResources(reward, origin);
      showToast('Quête accomplie', `${task.task} · +${reward.energy} Énergie, +${reward.materials} Matériaux${reward.reputation ? `, +${reward.reputation} Réputation` : ''}.`);
    } catch (error) { showToast('Complétion impossible', error.message); }
    return;
  }
  const reactivate = button.closest('[data-reactivate-task]');
  if (reactivate) { model.reactivateTask(reactivate.dataset.reactivateTask); renderAll(); showToast('Quête réactivée', 'Elle rejoint le classement local.'); return; }

  const plant = button.closest('[data-plant]');
  if (plant) { try { model.plant(plant.dataset.plant); renderAll(); showToast('Parcelle semée', '3 Énergie dépensées · récolte dans deux jours.'); } catch (error) { showToast('Plantation impossible', error.message); } return; }
  const harvest = button.closest('[data-harvest]');
  if (harvest) { try { model.harvest(harvest.dataset.harvest); renderAll(); pulseResources({ energy: 0, materials: 3, reputation: 0 }, harvest.getBoundingClientRect()); showToast('Récolte stockée', '+3 Matériaux vers l’entrepôt.'); } catch (error) { showToast('Récolte impossible', error.message); } return; }
  if (button.closest('[data-advance-day]')) { model.advanceDay(); renderAll(); showToast(`Jour ${model.state.day}`, 'Les cultures ont avancé dans leur cycle local.'); return; }
  if (button.closest('[data-repair-greenhouse]')) { try { model.repairGreenhouse(); renderAll(); showToast('Serre réparée', 'Les panneaux de verre solaire sont de nouveau alignés.'); } catch (error) { showToast('Réparation impossible', error.message); } return; }
  if (button.closest('[data-clear-rocks]')) { try { model.clearRocks(); ui.selectedEntityId = null; closeSheet(false); renderAll(); showToast('Extension déblayée', 'Six cases de la lisière sont maintenant constructibles.'); } catch (error) { showToast('Déblayage impossible', error.message); } return; }
  if (button.closest('[data-inspect-tower]')) { model.inspectTower(); renderAll(); showToast('Milo · diagnostic', 'Le mât peut être stabilisé avec 6 Énergie, 12 Matériaux et 3 Réputation.'); return; }
  if (button.closest('[data-stabilize-tower]')) { try { model.stabilizeTower(); renderAll(); showToast('Tour stabilisée', 'Le réseau météo attend maintenant ton ordre d’émission.'); } catch (error) { showToast('Stabilisation impossible', error.message); } return; }
  if (button.closest('[data-weather-signal]')) { try { model.emitWeatherSignal(); renderAll(); showToast('Signal météo transmis', 'ÉCHO-7 : « Fonction reconnue : intendant de continuité. »'); } catch (error) { showToast('Signal impossible', error.message); } return; }
  if (button.closest('[data-reset-sandbox]')) { $('#reset-dialog').showModal(); return; }
  if (button.closest('#confirm-reset')) {
    model.reset();
    ui.selectedEntityId = null;
    ui.taskExpanded = false;
    ui.activePanel = null;
    ui.build = { active: false, type: null, cell: null, rotation: 0 };
    renderAll();
    renderOnboarding();
    showToast('Sandbox réinitialisé', 'Le monde local et la copie des quêtes ont retrouvé leur état initial.');
  }
}

function startDrag(event) {
  if (event.target.closest('button')) return;
  ui.drag = { active: true, pointerId: event.pointerId, x: event.clientX, y: event.clientY, cameraX: model.state.camera.x, cameraY: model.state.camera.y, moved: false };
  $('#map-viewport').setPointerCapture(event.pointerId);
  $('#map-viewport').classList.add('is-dragging');
  $('#map-stage').classList.add('no-transition');
}

function moveDrag(event) {
  if (!ui.drag.active || event.pointerId !== ui.drag.pointerId) return;
  const dx = event.clientX - ui.drag.x;
  const dy = event.clientY - ui.drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) ui.drag.moved = true;
  model.state.camera.x = clamp(ui.drag.cameraX + dx, -250, 250);
  model.state.camera.y = clamp(ui.drag.cameraY + dy, -190, 190);
  applyCamera(true);
}

function endDrag(event) {
  if (!ui.drag.active || event.pointerId !== ui.drag.pointerId) return;
  model.save();
  ui.suppressClick = ui.drag.moved;
  setTimeout(() => { ui.suppressClick = false; }, 0);
  ui.drag.active = false;
  $('#map-viewport').classList.remove('is-dragging');
  $('#map-stage').classList.remove('no-transition');
}

function handleMapKeyboard(event) {
  const amount = event.shiftKey ? 50 : 24;
  const actions = {
    ArrowLeft: { x: model.state.camera.x + amount },
    ArrowRight: { x: model.state.camera.x - amount },
    ArrowUp: { y: model.state.camera.y + amount },
    ArrowDown: { y: model.state.camera.y - amount },
    '+': { zoom: model.state.camera.zoom + .12 },
    '=': { zoom: model.state.camera.zoom + .12 },
    '-': { zoom: model.state.camera.zoom - .12 },
    '0': { x: -10, y: 24, zoom: innerWidth < 700 ? .74 : .95, rotation: 0 },
    r: { rotation: model.state.camera.rotation + 90 },
    R: { rotation: model.state.camera.rotation + 90 }
  };
  if (!actions[event.key]) return;
  event.preventDefault();
  setCamera(actions[event.key]);
}

function trapSheetFocus(event) {
  if (event.key === 'Escape' && ui.activePanel) { closeSheet(); return; }
  if (event.key !== 'Tab' || !ui.activePanel) return;
  const focusable = $$('#game-sheet .sheet-panel button:not(:disabled), #game-sheet .sheet-panel [href], #game-sheet .sheet-panel [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

renderAll();
renderOnboarding();
if (model.state.camera.zoom === 1 && innerWidth < 700) setCamera({ x: -10, y: 24, zoom: .74 }, true);
else applyCamera(true);
if (model.state.onboardingComplete && innerWidth >= 700) openSheet('objectives', $('[data-open-panel="objectives"]'));

document.addEventListener('click', handleClick);
document.addEventListener('keydown', trapSheetFocus);
$('#map-viewport').addEventListener('keydown', handleMapKeyboard);
$('#map-viewport').addEventListener('pointerdown', startDrag);
$('#map-viewport').addEventListener('pointermove', moveDrag);
$('#map-viewport').addEventListener('pointerup', endDrag);
$('#map-viewport').addEventListener('pointercancel', endDrag);
$('[data-next-onboarding]').addEventListener('click', () => {
  const next = model.state.onboardingStep + 1;
  if (next >= 3) finishOnboarding();
  else { model.setOnboarding(next, false); renderOnboarding(); }
});
$('[data-skip-onboarding]').addEventListener('click', finishOnboarding);
window.addEventListener('resize', () => renderMap());
