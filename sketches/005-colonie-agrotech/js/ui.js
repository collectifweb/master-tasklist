import { BUILDINGS, SECTORS } from './data.js';
import { scoreTask, scoreParts, taskReward, sortTasks } from './model.js';

export const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

const lengthLabel = value => value <= 1 ? '≈ 10 min' : value <= 2 ? '15–25 min' : value <= 4 ? '30–60 min' : value <= 6 ? '1–2 h' : value <= 8 ? 'longue' : 'jalon';
const difficultyLabel = value => value <= 2 ? 'faible' : value <= 4 ? 'modérée' : value <= 6 ? 'soutenue' : 'forte';
const splitTaskText = value => {
  const separator = value.indexOf(':');
  return separator > 0 ? [value.slice(0, separator), value.slice(separator + 1).trim()] : [value, ''];
};

function rewardMarkup(task) {
  const reward = taskReward(task);
  return `<div class="reward-line" aria-label="Récompenses de tâche, indépendantes du score">
    <span class="reward-chip energy">${icon('bolt')}+${reward.energy}</span>
    <span class="reward-chip materials">${icon('material')}+${reward.materials}</span>
    ${reward.reputation ? `<span class="reward-chip reputation">${icon('reputation')}+${reward.reputation}</span>` : ''}
    <span class="reward-chip">${escapeHtml(reward.className)}</span>
  </div>`;
}

function taskMeta(task) {
  return `<div class="task-meta">
    <span>${icon('flag')}priorité ${task.priority}</span>
    <span>${icon('clock')}${lengthLabel(task.length)}</span>
    <span>${icon('gauge')}énergie ${difficultyLabel(task.difficulty)}</span>
  </div>`;
}

export function primeTaskMarkup(model) {
  const active = model.activeMissionTask;
  const task = active || sortTasks(model.openTasks, 'score')[0];
  if (!task) return `<div class="empty-state"><strong>Toutes les quêtes du sandbox sont terminées.</strong><span>Ajoutez une tâche ou réactivez-en une depuis le registre.</span></div>`;
  const missionActive = Boolean(active);
  const [title, detail] = splitTaskText(task.task);
  return `<div class="prime-content">
    <div class="prime-head">
      <div>
        <h2 class="prime-title">${escapeHtml(title)}</h2>
        <div class="status-line">${icon(missionActive ? 'play' : 'arrow')}${missionActive ? 'Mission active' : 'Recommandation calculée'}</div>
        ${detail ? `<p class="prime-detail">${escapeHtml(detail)}</p>` : ''}
        <span class="task-domain">${escapeHtml(task.domain)}</span>
      </div>
      <div class="score-block" aria-label="Score de recommandation ${scoreTask(task)} sur 100"><strong>${scoreTask(task)}</strong><small>score</small></div>
    </div>
    ${taskMeta(task)}
    ${rewardMarkup(task)}
    ${missionActive ? '' : `<div class="prime-actions"><button class="button button-primary" type="button" data-start-task="${escapeHtml(task.id)}">${icon('play')}Commencer</button><button class="icon-button" type="button" data-edit-task="${escapeHtml(task.id)}" aria-label="Modifier cette quête">${icon('edit')}</button></div>`}
  </div>
  ${missionActive ? `<div class="mission-active">
    <div class="mission-line"><span class="live-label">Mission en cours</span><span class="mission-time" id="mission-time">00:00</span></div>
    <div class="mission-actions"><button class="button button-primary" type="button" data-complete-mission>${icon('check')}Terminer la quête</button><button class="button button-secondary" type="button" data-cancel-mission>${icon('x')}Annuler la mission</button></div>
  </div>` : ''}`;
}

export function taskRowMarkup(task, selectedId = null) {
  return `<article class="task-row ${task.status === 'done' ? 'is-done' : ''} ${task.id === selectedId ? 'is-selected' : ''}" data-task-row="${escapeHtml(task.id)}">
    <div><h3>${escapeHtml(task.task)}</h3><div class="task-meta"><span>${escapeHtml(task.domain)}</span><span>${lengthLabel(task.length)}</span><span>difficulté ${task.difficulty}</span></div></div>
    <div class="task-row-score"><span>${scoreTask(task)}</span><small>score</small></div>
    <button class="task-row-button" type="button" data-select-task="${escapeHtml(task.id)}" aria-label="Afficher la quête : ${escapeHtml(task.task)}"></button>
  </article>`;
}

export function quickTasksMarkup(model) {
  const primeId = model.activeMissionTask?.id || sortTasks(model.openTasks, 'score')[0]?.id;
  return sortTasks(model.openTasks.filter(task => task.id !== primeId), 'score').slice(0, 6).map(task => taskRowMarkup(task, model.state.selectedTaskId)).join('') || '<div class="empty-state"><strong>Aucune autre quête ouverte.</strong></div>';
}

export function allTasksMarkup(model, { query = '', status = 'todo', sort = 'score' } = {}) {
  const normalized = query.trim().toLocaleLowerCase('fr');
  let tasks = model.state.tasks.filter(task => (status === 'all' || task.status === status) && (!normalized || `${task.task} ${task.domain}`.toLocaleLowerCase('fr').includes(normalized)));
  tasks = sortTasks(tasks, sort);
  return tasks.length ? tasks.map(task => taskRowMarkup(task, model.state.selectedTaskId)).join('') : '<div class="empty-state"><strong>Aucune quête ne correspond.</strong><span>Modifiez la recherche ou le filtre d’état.</span></div>';
}

export function taskDetailMarkup(model, task) {
  if (!task) return `<div class="empty-state"><strong>Sélectionnez une quête.</strong><span>Son score et ses récompenses apparaîtront ici.</span></div>`;
  const parts = scoreParts(task);
  const active = model.state.mission.taskId === task.id;
  const [title, detail] = splitTaskText(task.task);
  return `<article class="task-detail-card">
    <h2>${escapeHtml(title)}</h2>
    <div class="status-line">${icon(task.status === 'done' ? 'check' : active ? 'play' : 'quests')}${task.status === 'done' ? 'Terminée' : active ? 'Mission active' : 'Quête ouverte'}</div>
    ${detail ? `<p>${escapeHtml(detail)}</p>` : ''}
    <span class="task-domain">${escapeHtml(task.domain)}</span>
    ${taskMeta(task)}
    ${rewardMarkup(task)}
    <div class="score-anatomy" aria-label="Détail du score de recommandation">
      <div class="score-factor"><span>Priorité ${task.priority}/10</span><strong>+${parts.priority}</strong></div>
      <div class="score-factor"><span>Brièveté ${11 - task.length}/10</span><strong>+${parts.length}</strong></div>
      <div class="score-factor"><span>Facilité ${11 - task.difficulty}/10</span><strong>+${parts.difficulty}</strong></div>
      <div class="score-factor"><span>Score de recommandation</span><strong>${scoreTask(task)} / 100</strong></div>
    </div>
    <div class="task-detail-actions">
      ${task.status === 'todo' ? `<button class="button button-primary" type="button" data-start-task="${escapeHtml(task.id)}" ${active ? 'disabled' : ''}>${icon('play')}${active ? 'En cours' : 'Commencer'}</button>` : `<button class="button button-secondary" type="button" data-reactivate-task="${escapeHtml(task.id)}">${icon('reset')}Réactiver</button>`}
      <button class="icon-button" type="button" data-edit-task="${escapeHtml(task.id)}" aria-label="Modifier cette quête">${icon('edit')}</button>
    </div>
  </article>`;
}

const PLOT_COPY = {
  empty: ['Libre', 'Prête à recevoir une culture.'],
  seeded: ['Semée', 'Germination engagée · 2 jours avant maturité.'],
  growing: ['Croissance', 'Tiges stabilisées · 1 jour avant maturité.'],
  mature: ['Mûre', 'Récolte disponible · +2 Matériaux.'],
  damaged: ['Endommagée', 'Le substrat doit être réparé pour 4 Énergie.'],
  recovering: ['Récupération', 'La parcelle sera libre au prochain jour.']
};

export function plotsMarkup(model) {
  return model.state.plots.map((plot, index) => {
    const phase = model.plotPhase(plot);
    const [label, description] = PLOT_COPY[phase];
    const growth = phase === 'seeded' ? 18 : phase === 'growing' ? 34 : phase === 'mature' ? 48 : 9;
    const leaves = phase === 'seeded' ? .35 : phase === 'growing' ? .75 : phase === 'mature' ? 1 : .15;
    let action = `<button class="button button-primary" type="button" data-plant="${plot.id}" ${model.canAfford({ energy: 3 }) ? '' : 'disabled'}>${icon('seed')}Planter · 3 Énergie</button>`;
    if (phase === 'mature') action = `<button class="button button-primary" type="button" data-harvest="${plot.id}">${icon('material')}Récolter · +2</button>`;
    if (phase === 'damaged') action = `<button class="button button-primary" type="button" data-repair-plot="${plot.id}" ${model.canAfford({ energy: 4 }) ? '' : 'disabled'}>${icon('wrench')}Réparer · 4 Énergie</button>`;
    if (!['empty', 'mature', 'damaged'].includes(phase)) action = `<button class="button button-secondary" type="button" disabled>${phase === 'recovering' ? icon('wrench') + 'Récupération' : icon('clock') + 'Culture en cours'}</button>`;
    return `<article class="plot is-${phase}">
      <div class="plot-head"><h3>Parcelle ${String.fromCharCode(65 + index)}</h3><span class="plot-state ${phase === 'damaged' ? 'damaged' : ''}">${label}</span></div>
      <div class="plot-body"><div class="crop-icon" style="--growth:${growth}px;--leaves:${leaves}"></div><div class="plot-copy"><strong>${label}</strong><span>${description}</span></div></div>
      <div class="plot-actions">${action}</div>
    </article>`;
  }).join('');
}

export function buildingsMarkup(model) {
  return Object.entries(BUILDINGS).map(([key, building]) => {
    const built = model.state.buildings[key];
    const canBuild = model.canAfford(building);
    return `<article class="build-item">
      <div><h3>${escapeHtml(building.name)}</h3><p>${escapeHtml(building.description)}</p>${built ? '<span class="build-status">Construite · en ligne</span>' : ''}</div>
      ${built ? `<span class="build-status">${icon('check')}</span>` : `<button class="button button-secondary" type="button" data-build="${key}" ${canBuild ? '' : 'disabled'} aria-label="Construire ${escapeHtml(building.name)}, coût ${building.energy} Énergie et ${building.materials} Matériaux">${building.energy} E · ${building.materials} M</button>`}
    </article>`;
  }).join('');
}

export function eventChoicesMarkup(model) {
  const treatCost = model.state.event.durableProtection ? 4 : 6;
  const choices = [
    { key: 'treat', title: 'Traiter maintenant', detail: 'Aucune perte de culture.', cost: `${treatCost} Énergie`, affordable: model.canAfford({ energy: treatCost }) },
    { key: 'protect', title: 'Protéger durablement', detail: 'Réduit les prochains coûts de traitement.', cost: '4 Énergie · 8 Matériaux', affordable: model.canAfford({ energy: 4, materials: 8 }) },
    { key: 'accept', title: 'Accepter la perte', detail: 'Une parcelle devient endommagée et réparable.', cost: 'Aucune ressource', affordable: true }
  ];
  return choices.map(choice => `<button class="event-choice" type="button" data-event-choice="${choice.key}" ${choice.affordable ? '' : 'disabled'}><strong>${choice.title}</strong><span>${choice.detail}</span><span class="cost">${choice.cost}</span></button>`).join('');
}

export function sectorDetailMarkup(model) {
  const key = model.state.bastion.selectedSector;
  const base = SECTORS[key];
  const sector = { ...base };
  if (key === 'tower' && model.state.bastion.towerStable) sector.state = 'Stabilisée';
  if (key === 'archives' && model.state.bastion.archivesUnlocked) sector.state = 'Ouvertes';
  let action = '';
  if (key === 'tower') {
    action = model.state.bastion.towerStable
      ? `<button class="button button-secondary" type="button" disabled>${icon('check')}Réparation terminée</button>`
      : `<button class="button button-primary" type="button" data-repair-bastion ${model.canAfford({ energy: 6, materials: 12 }) ? '' : 'disabled'}>${icon('wrench')}Réparer · 6 Énergie · 12 Matériaux</button>`;
  }
  if (key === 'archives') {
    const canUnlock = model.state.bastion.towerStable && model.state.resources.reputation >= 3;
    action = model.state.bastion.archivesUnlocked
      ? `<button class="button button-secondary" type="button" disabled>${icon('book')}Fragment déverrouillé</button>`
      : `<button class="button button-primary" type="button" data-unlock-archives ${canUnlock ? '' : 'disabled'}>${icon('book')}Ouvrir · 3 Réputation requise</button>`;
  }
  return `<h2>${escapeHtml(sector.name)}</h2>
    <div class="status-line">${icon(key === 'archives' ? 'book' : key === 'tower' ? 'gauge' : 'shield')}Secteur du Bastion</div>
    <span class="task-domain">${escapeHtml(sector.state)}</span>
    <p>${escapeHtml(sector.description)}</p>
    <div class="integrity-meter" aria-label="Intégrité du Bastion ${model.state.bastion.integrity} sur 100"><span style="width:${model.state.bastion.integrity}%"></span></div>
    <div class="meter-caption"><span>Intégrité structurelle</span><strong>${model.state.bastion.integrity} / 100</strong></div>
    ${action ? `<div style="margin-top:17px">${action}</div>` : ''}`;
}
