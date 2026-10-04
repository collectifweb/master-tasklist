import { SandboxModel } from './model.js';
import {
  allTasksMarkup,
  buildingsMarkup,
  eventChoicesMarkup,
  icon,
  plotsMarkup,
  primeTaskMarkup,
  quickTasksMarkup,
  sectorDetailMarkup,
  taskDetailMarkup
} from './ui.js';

const model = new SandboxModel();
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const uiState = {
  view: location.hash.replace('#', '') || 'today',
  editingId: null,
  query: '',
  status: 'todo',
  sort: 'score',
  toastTimer: null
};

function clonePanorama() {
  const source = $('.mini-panorama');
  const mount = $('#colony-panorama-mount');
  let markup = source.innerHTML;
  const replacements = [
    ['id="weather-line"', 'id="weather-line-colony"'],
    ['id="panorama-output"', 'id="panorama-output-colony"'],
    ['id="farm-title"', 'id="farm-title-colony"'],
    ['id="farm-desc"', 'id="farm-desc-colony"'],
    ['aria-labelledby="farm-title farm-desc"', 'aria-labelledby="farm-title-colony farm-desc-colony"'],
    ['id="sky"', 'id="sky-colony"'],
    ['id="soil"', 'id="soil-colony"'],
    ['id="glass"', 'id="glass-colony"'],
    ['url(#sky)', 'url(#sky-colony)'],
    ['url(#soil)', 'url(#soil-colony)'],
    ['url(#glass)', 'url(#glass-colony)']
  ];
  replacements.forEach(([from, to]) => { markup = markup.replaceAll(from, to); });
  mount.innerHTML = markup;
  mount.querySelector('[data-go-colony]')?.remove();
}

function setView(view, updateHash = true) {
  const valid = ['today', 'quests', 'colony', 'bastion'];
  const target = valid.includes(view) ? view : 'today';
  uiState.view = target;
  $$('.view').forEach(section => {
    const active = section.dataset.view === target;
    section.hidden = !active;
    section.classList.toggle('is-active', active);
  });
  $$('.nav-item').forEach(button => {
    const active = button.dataset.viewTarget === target;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (updateHash) history.replaceState(null, '', `#${target}`);
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

function showToast(title, message) {
  clearTimeout(uiState.toastTimer);
  $('#toast-title').textContent = title;
  $('#toast-message').textContent = message;
  $('#toast').classList.add('is-visible');
  $('#live-region').textContent = `${title}. ${message}`;
  uiState.toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 4200);
}

function resourceLabel() {
  const { energy, materials, reputation } = model.state.resources;
  return `${energy} Énergie, ${materials} Matériaux, ${reputation} Réputation`;
}

function updateResourceBar() {
  Object.entries(model.state.resources).forEach(([key, value]) => {
    const output = $(`#resource-${key}`);
    output.textContent = value;
    output.closest('.resource').setAttribute('aria-label', `${output.nextElementSibling.textContent} : ${value}`);
  });
  $('.resource-bar').setAttribute('aria-label', `Ressources de la colonie : ${resourceLabel()}`);
}

function updatePanoramaText() {
  const phases = model.state.plots.map(plot => model.plotPhase(plot));
  const active = phases.filter(phase => ['seeded', 'growing', 'mature'].includes(phase)).length;
  const damaged = phases.filter(phase => phase === 'damaged').length;
  const built = Object.values(model.state.buildings).filter(Boolean).length;
  const output = damaged ? `${damaged} parcelle endommagée` : active ? `${active} culture${active > 1 ? 's' : ''} active${active > 1 ? 's' : ''}` : 'Parcelles disponibles';
  ['#panorama-output', '#panorama-output-colony'].forEach(selector => { const node = $(selector); if (node) node.textContent = output; });
  const weather = model.state.event.larvaeActive ? 'Alerte biologique · décision requise' : built ? `${built} infrastructure${built > 1 ? 's' : ''} en ligne` : 'Vent clair · production stable';
  ['#weather-line', '#weather-line-colony'].forEach(selector => { const node = $(selector); if (node) node.textContent = weather; });
}

function renderTasks() {
  $('#prime-task').innerHTML = primeTaskMarkup(model);
  $('#quick-task-list').innerHTML = quickTasksMarkup(model);
  $('#quick-count').textContent = `${Math.max(0, model.openTasks.length - 1)} autres quêtes ouvertes`;
  $('#all-task-list').innerHTML = allTasksMarkup(model, { query: uiState.query, status: uiState.status, sort: uiState.sort });
  const selected = model.getTask(model.state.selectedTaskId) || model.state.tasks[0];
  $('#task-detail-pane').innerHTML = taskDetailMarkup(model, selected);
  $('#today-summary').textContent = model.activeMissionTask ? 'Une mission est active. Terminez-la ou annulez-la sans pénalité.' : 'Une action réelle alimente la prochaine décision de la colonie.';
}

function renderEvent() {
  const panel = $('#event-panel');
  panel.hidden = !model.state.event.larvaeActive;
  if (model.state.event.larvaeActive) $('#event-options').innerHTML = eventChoicesMarkup(model);
}

function renderColony() {
  $('#plot-grid').innerHTML = plotsMarkup(model);
  $('#build-list').innerHTML = buildingsMarkup(model);
  updatePanoramaText();
}

function renderBastion() {
  $('#integrity-value').textContent = model.state.bastion.integrity;
  $('#integrity-badge').setAttribute('aria-label', `Intégrité du Bastion : ${model.state.bastion.integrity} sur 100`);
  $$('.sector-node').forEach(node => {
    const key = node.dataset.sector;
    node.classList.toggle('is-selected', key === model.state.bastion.selectedSector);
    if (key === 'tower') node.querySelector('small').textContent = model.state.bastion.towerStable ? 'Stabilisée' : 'Instable';
    if (key === 'archives') {
      node.classList.toggle('is-locked', !model.state.bastion.archivesUnlocked);
      node.querySelector('small').textContent = model.state.bastion.archivesUnlocked ? 'Ouvertes' : 'Scellées';
    }
  });
  $('#sector-detail').innerHTML = sectorDetailMarkup(model);
  const index = ['gate', 'tower', 'archives'].indexOf(model.state.bastion.selectedSector) + 1;
  $('#bastion-map-status').textContent = `Secteur ${index} / 3`;
  const fragmentText = $('.narrative-fragment p');
  fragmentText.textContent = model.state.bastion.archivesUnlocked
    ? 'Archive ouverte : les racines minérales pointent vers une quatrième structure, hors du périmètre cartographié.'
    : 'La suite s’ouvre lorsque la Réputation atteint 3 et que la Tour météo est stabilisée.';
}

function render() {
  updateResourceBar();
  $('#day-label').textContent = `Jour ${model.state.day} · cycle ${String(model.state.day).padStart(2, '0')}`;
  $('#cycle-label').textContent = `Cycle ${String(model.state.day).padStart(2, '0')}`;
  renderTasks();
  renderEvent();
  renderColony();
  renderBastion();
  ['#advance-day', '#colony-advance-day'].forEach(selector => {
    const button = $(selector);
    button.disabled = model.state.event.larvaeActive;
    button.title = model.state.event.larvaeActive ? 'Résolvez Larves cendrées avant de continuer.' : '';
  });
}

function pulseResources(keys) {
  keys.forEach(key => {
    const resource = $(`[data-resource="${key}"]`);
    resource.classList.remove('is-gaining');
    requestAnimationFrame(() => resource.classList.add('is-gaining'));
    setTimeout(() => resource.classList.remove('is-gaining'), 800);
  });
}

function animateRewards(originRect, reward) {
  const keys = ['energy', 'materials', 'reputation'].filter(key => reward[key] > 0);
  pulseResources(keys);
  if (reducedMotion.matches || !originRect) return;
  const layer = $('#reward-flight');
  keys.forEach((key, index) => {
    const target = $(`[data-resource="${key}"]`).getBoundingClientRect();
    const particle = document.createElement('span');
    particle.className = `reward-particle ${key}`;
    particle.style.color = key === 'energy' ? 'var(--acid)' : key === 'materials' ? 'var(--cyan)' : 'var(--green)';
    particle.style.left = `${originRect.left + originRect.width / 2 - 12 + index * 8}px`;
    particle.style.top = `${originRect.top + originRect.height / 2 - 12}px`;
    particle.innerHTML = icon(key === 'materials' ? 'material' : key === 'reputation' ? 'reputation' : 'bolt');
    layer.appendChild(particle);
    requestAnimationFrame(() => {
      particle.style.translate = `${target.left + target.width / 2 - (originRect.left + originRect.width / 2) - index * 8}px ${target.top + target.height / 2 - (originRect.top + originRect.height / 2)}px`;
      particle.style.scale = '.35';
      particle.style.opacity = '.1';
    });
    setTimeout(() => particle.remove(), 900);
  });
}

function openTaskDialog(id = null) {
  uiState.editingId = id;
  const task = id ? model.getTask(id) : null;
  $('#task-dialog-title').textContent = task ? 'Modifier la quête' : 'Nouvelle quête';
  $('#save-task').textContent = task ? 'Enregistrer' : 'Ajouter la quête';
  $('#form-task').value = task?.task || '';
  $('#form-domain').value = task?.domain || 'Maison';
  $('#form-status').value = task?.status || 'todo';
  $('#form-priority').value = task?.priority || 5;
  $('#form-length').value = task?.length || 3;
  $('#form-difficulty').value = task?.difficulty || 3;
  $('#form-task-error').textContent = '';
  syncRangeOutputs();
  $('#task-dialog').showModal();
  setTimeout(() => $('#form-task').focus(), 30);
}

function closeTaskDialog() {
  $('#task-dialog').close();
  uiState.editingId = null;
}

function syncRangeOutputs() {
  ['priority', 'length', 'difficulty'].forEach(name => {
    $(`#form-${name}-output`).value = $(`#form-${name}`).value;
  });
}

function saveTask(event) {
  event.preventDefault();
  const title = $('#form-task').value.trim();
  if (!title) {
    $('#form-task-error').textContent = 'Ajoutez un intitulé concret avant d’enregistrer.';
    $('#form-task').focus();
    return;
  }
  const payload = {
    task: title,
    domain: $('#form-domain').value,
    status: $('#form-status').value,
    priority: Number($('#form-priority').value),
    length: Number($('#form-length').value),
    difficulty: Number($('#form-difficulty').value)
  };
  const editing = Boolean(uiState.editingId);
  const result = editing ? { task: model.updateTask(uiState.editingId, payload), bonus: 0 } : model.addTask(payload);
  closeTaskDialog();
  render();
  showToast(editing ? 'Quête mise à jour' : 'Quête ajoutée', result.bonus ? 'Copie locale enregistrée · bonus quotidien +1 Énergie.' : 'La copie locale du sandbox a été enregistrée.');
  if (result.bonus) pulseResources(['energy']);
}

function advanceDay() {
  try {
    model.advanceDay();
    render();
    showToast(`Jour ${model.state.day}`, model.state.event.larvaeActive ? 'Les Larves cendrées exigent une décision avant de continuer.' : 'Les cultures ont avancé selon leur cycle déterministe.');
    if (model.state.event.larvaeActive) setView('today');
  } catch (error) {
    showToast('Action suspendue', error.message);
  }
}

function handleAction(button) {
  if (button.closest('.nav-item')) return setView(button.closest('.nav-item').dataset.viewTarget);
  if (button.closest('[data-nav]')) return setView(button.closest('[data-nav]').dataset.nav);
  if (button.closest('[data-go-colony]')) return setView('colony');
  if (button.closest('.add-task-button')) return openTaskDialog();
  if (button.closest('.close-dialog')) return closeTaskDialog();

  const selected = button.closest('[data-select-task]');
  if (selected) {
    model.selectTask(selected.dataset.selectTask);
    renderTasks();
    if (innerWidth < 760 && uiState.view === 'quests') $('#task-detail-pane').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    return;
  }

  const edit = button.closest('[data-edit-task]');
  if (edit) return openTaskDialog(edit.dataset.editTask);

  const start = button.closest('[data-start-task]');
  if (start) {
    try {
      const task = model.startMission(start.dataset.startTask);
      render();
      showToast('Mission lancée', task.task);
      setView('today');
    } catch (error) { showToast('Mission indisponible', error.message); }
    return;
  }

  if (button.closest('[data-cancel-mission]')) {
    const task = model.cancelMission();
    render();
    showToast('Mission annulée', task ? `${task.task} reste ouverte, sans pénalité.` : 'Aucune tâche n’a été modifiée.');
    return;
  }

  if (button.closest('[data-complete-mission]')) {
    const origin = button.closest('[data-complete-mission]').getBoundingClientRect();
    try {
      const { task, reward } = model.completeMission();
      render();
      animateRewards(origin, reward);
      showToast('Quête accomplie', `${task.task} · +${reward.energy} Énergie, +${reward.materials} Matériaux${reward.reputation ? `, +${reward.reputation} Réputation` : ''}.`);
    } catch (error) { showToast('Complétion impossible', error.message); }
    return;
  }

  const reactivate = button.closest('[data-reactivate-task]');
  if (reactivate) {
    model.updateTask(reactivate.dataset.reactivateTask, { status: 'todo' });
    render();
    showToast('Quête réactivée', 'Elle rejoint le classement sans modifier les ressources.');
    return;
  }

  if (button.closest('#score-help')) {
    const help = $('#score-explanation');
    help.hidden = !help.hidden;
    $('#score-help').setAttribute('aria-expanded', String(!help.hidden));
    return;
  }

  const plant = button.closest('[data-plant]');
  if (plant) {
    try { model.plant(plant.dataset.plant); render(); showToast('Culture semée', '3 Énergie dépensées · maturité dans deux jours simulés.'); }
    catch (error) { showToast('Plantation impossible', error.message); }
    return;
  }

  const harvest = button.closest('[data-harvest]');
  if (harvest) {
    const origin = harvest.getBoundingClientRect();
    try { model.harvest(harvest.dataset.harvest); render(); animateRewards(origin, { energy: 0, materials: 2, reputation: 0 }); showToast('Récolte stockée', '+2 Matériaux pour les constructions et réparations.'); }
    catch (error) { showToast('Récolte impossible', error.message); }
    return;
  }

  const repairPlot = button.closest('[data-repair-plot]');
  if (repairPlot) {
    try { model.repairPlot(repairPlot.dataset.repairPlot); render(); showToast('Parcelle en récupération', '4 Énergie dépensées · retour en service demain.'); }
    catch (error) { showToast('Réparation impossible', error.message); }
    return;
  }

  const build = button.closest('[data-build]');
  if (build) {
    try { const definition = model.build(build.dataset.build); render(); showToast('Infrastructure construite', `${definition.name} est maintenant en ligne.`); }
    catch (error) { showToast('Construction impossible', error.message); }
    return;
  }

  const eventChoice = button.closest('[data-event-choice]');
  if (eventChoice) {
    try { const outcome = model.resolveLarvae(eventChoice.dataset.eventChoice); render(); showToast('Événement résolu', outcome); }
    catch (error) { showToast('Choix impossible', error.message); }
    return;
  }

  const sector = button.closest('[data-sector]');
  if (sector) { model.selectSector(sector.dataset.sector); renderBastion(); return; }

  if (button.closest('[data-repair-bastion]')) {
    try { model.repairBastion(); render(); showToast('Tour météo stabilisée', 'Intégrité du Bastion restaurée à 100.'); }
    catch (error) { showToast('Réparation impossible', error.message); }
    return;
  }

  if (button.closest('[data-unlock-archives]')) {
    try { model.unlockArchives(); render(); showToast('Archives ouvertes', 'Un nouveau relevé prolonge Le premier sillon.'); }
    catch (error) { showToast('Archives scellées', error.message); }
    return;
  }

  if (button.closest('#advance-day') || button.closest('#colony-advance-day')) return advanceDay();
  if (button.closest('#reset-sandbox')) return $('#reset-dialog').showModal();
  if (button.closest('#confirm-reset')) {
    model.reset();
    uiState.query = '';
    uiState.status = 'todo';
    uiState.sort = 'score';
    $('#task-search').value = '';
    $('#task-sort').value = 'score';
    $('#task-status-filter').value = 'todo';
    render();
    showToast('Sandbox réinitialisé', 'La copie locale et le monde de démonstration ont retrouvé leur état initial.');
  }
}

function updateMissionClock() {
  const output = $('#mission-time');
  if (!output || !model.state.mission.startedAt) return;
  const elapsed = Math.max(0, Math.floor((Date.now() - model.state.mission.startedAt) / 1000));
  output.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
}

clonePanorama();
render();
setView(uiState.view, false);

document.addEventListener('click', event => {
  const actionable = event.target.closest('button, [data-nav]');
  if (!actionable) return;
  handleAction(actionable);
});

$('#task-form').addEventListener('submit', saveTask);
['priority', 'length', 'difficulty'].forEach(name => $(`#form-${name}`).addEventListener('input', syncRangeOutputs));
$('#task-search').addEventListener('input', event => { uiState.query = event.target.value; renderTasks(); });
$('#task-sort').addEventListener('change', event => { uiState.sort = event.target.value; renderTasks(); });
$('#task-status-filter').addEventListener('change', event => { uiState.status = event.target.value; renderTasks(); });
window.addEventListener('hashchange', () => setView(location.hash.replace('#', ''), false));
setInterval(updateMissionClock, 1000);
updateMissionClock();
