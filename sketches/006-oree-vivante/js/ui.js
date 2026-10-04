import { BUILDABLES, CHAPTER_STEPS } from './data.js';
import { scoreTask, sortTasks, taskReward } from './model.js';

export const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
export const cellKey = (row, col) => `${row}:${col}`;

export function isoPosition(row, col) {
  return { x: 338 + (col - row) * 43, y: 88 + (col + row) * 22 };
}

export function durationLabel(value) {
  return value <= 1 ? '10 min' : value <= 2 ? '15–25 min' : value <= 4 ? '30–60 min' : value <= 6 ? '1–2 h' : value <= 8 ? 'longue' : 'jalon';
}

function confidenceThreshold(value) {
  const thresholds = [
    { value: 3, benefit: 'codes de la Tour' },
    { value: 5, benefit: 'permis de serre' },
    { value: 8, benefit: 'accès aux Archives' }
  ];
  return thresholds.find(item => value < item.value) || { value, benefit: 'tous les accès connus ouverts' };
}

export function terrainMarkup(model, buildState) {
  const tiles = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const { x, y } = isoPosition(row, col);
      const path = (row === 5 && col >= 1 && col <= 6) || (col === 5 && row <= 5);
      const locked = model.isCellLocked(row, col);
      const selected = buildState.cell?.row === row && buildState.cell?.col === col;
      const buildable = Boolean(buildState.active && buildState.type) && model.canPlace(row, col);
      const invalid = Boolean(buildState.active && buildState.type) && !model.canPlace(row, col);
      const classes = ['tile', path ? 'path' : '', locked ? 'locked' : '', buildable ? 'buildable' : '', invalid ? 'invalid' : '', selected ? 'candidate' : ''].filter(Boolean).join(' ');
      const tabIndex = buildState.active && buildState.type && selected ? 0 : -1;
      tiles.push(`<button type="button" tabindex="${tabIndex}" class="${classes}" data-map-cell="${row}:${col}" style="left:${x}px;top:${y}px;z-index:${row + col}" aria-label="Case ${row + 1}, ${col + 1}${locked ? ', bloquée' : buildable ? ', placement valide' : invalid ? ', placement impossible' : ''}"></button>`);
    }
  }
  return tiles.join('');
}

function entityObjectClass(entity, model) {
  if (entity.type === 'plot') return `plot phase-${model.plotPhase(entity)} ${entity.pestDamage ? 'has-pests' : ''}`;
  if (entity.type === 'beacon') return 'beacon';
  if (entity.type === 'rock') return 'rock';
  return entity.type;
}

export function entityMarkup(entity, model, selectedId = null, mapRotation = 0, ghost = false, valid = true) {
  if (entity.status === 'cleared') return '';
  const { x, y } = isoPosition(entity.row, entity.col);
  const selected = entity.id === selectedId;
  const classes = [
    'entity', entity.type, entity.status === 'damaged' ? 'damaged' : '', entity.status === 'online' ? 'online' : '',
    selected ? 'is-selected' : '', entity.type === 'tower' && model.state.chapter.towerStable ? 'is-stable' : '',
    ghost ? 'ghost' : '', ghost && !valid ? 'invalid' : ''
  ].filter(Boolean).join(' ');
  const label = ghost ? `Aperçu : ${BUILDABLES[entity.type]?.name || entity.name}` : entity.name;
  const depth = ghost || selected ? 3000 : 100 + entity.row + entity.col;
  return `<button type="button" class="${classes}" data-select-entity="${escapeHtml(entity.id)}" style="left:${x}px;top:${y}px;z-index:${depth};--counter-rotation:${-mapRotation}deg;--entity-rotation:${entity.rotation || 0}deg" aria-label="${escapeHtml(label)}">
    <span class="object ${entityObjectClass(entity, model)}" aria-hidden="true"><i></i><i></i><i></i></span><span class="tag">${escapeHtml(label)}</span>
  </button>`;
}

const INCIDENT_META = {
  irrigation: { title: 'Irrigation bouchée', row: 3, col: 3, symbol: '!' },
  insects: { title: 'Insectes dans les cultures', row: 4, col: 2, symbol: '!' },
  towerShock: { title: 'Tour instable', row: 1, col: 6, symbol: '!' }
};

function incidentMarkersMarkup(model, mapRotation) {
  return model.activeIncidents.map(([id, incident]) => {
    const meta = INCIDENT_META[id];
    const { x, y } = isoPosition(meta.row, meta.col);
    const state = incident.status === 'contained' ? 'Conséquence à réparer' : 'Décision requise';
    return `<button type="button" class="incident-marker ${incident.status}" data-open-incident="${id}" style="left:${x + 25}px;top:${y - 50}px;z-index:${2100 + meta.row + meta.col};--counter-rotation:${-mapRotation}deg" aria-label="${escapeHtml(meta.title)}. ${state}"><span>${meta.symbol}</span><b>${escapeHtml(meta.title)}</b></button>`;
  }).join('');
}

export function entitiesMarkup(model, selectedId, mapRotation, buildState) {
  const ordered = [...model.allEntities].sort((a, b) => (a.row + a.col) - (b.row + b.col) || a.row - b.row);
  let markup = ordered.map(entity => entityMarkup(entity, model, selectedId, mapRotation)).join('');
  markup += incidentMarkersMarkup(model, mapRotation);
  if (buildState.type && buildState.cell) {
    markup += entityMarkup({ id: 'placement-ghost', type: buildState.type, name: BUILDABLES[buildState.type].name, row: buildState.cell.row, col: buildState.cell.col, rotation: buildState.rotation, status: 'preview' }, model, null, mapRotation, true, model.canPlace(buildState.cell.row, buildState.cell.col));
  }
  return markup;
}

export function recommendedTaskMarkup(model, expanded = false) {
  const task = model.activeTask || model.recommendedTask;
  if (!task) return `<button class="task-summary" type="button" data-open-panel="quests"><span><span>Quêtes</span><strong id="recommended-title">Tout est terminé</strong><small>Ouvrir le registre</small></span>${icon('check')}</button>`;
  const reward = taskReward(task);
  const active = model.activeTask?.id === task.id;
  const confidenceAvailable = !model.state.confidenceDays.includes(model.state.day);
  return `<button class="task-summary" type="button" data-toggle-task aria-expanded="${expanded}">
      <span><span>${active ? 'En cours' : 'Conseillée'}</span><strong id="recommended-title">${escapeHtml(task.task)}</strong><small>${escapeHtml(task.domain)} · ${durationLabel(task.length)}</small></span>
      <span class="task-score"><b>${scoreTask(task)}</b><small>priorité</small></span>
    </button>
    <div class="task-details" ${expanded ? '' : 'hidden'}>
      <p>Courte, prioritaire et réaliste maintenant.</p>
      <div class="task-meta"><span>Priorité ${task.priority}/10</span><span>Durée ${task.length}/10</span><span>Effort ${task.difficulty}/10</span></div>
      <div class="reward-row" aria-label="Gains"><span class="reward-chip">${icon('bolt')}+${reward.energy}</span><span class="reward-chip">${icon('crate')}+${reward.materials}</span>${confidenceAvailable ? `<span class="reward-chip confidence-chip">${icon('star')}+1 première quête du jour</span>` : ''}</div>
      <div class="task-actions">${active
        ? `<button class="button primary" type="button" data-complete-task="${escapeHtml(task.id)}">Terminer</button><button class="button quiet" type="button" data-cancel-task>Arrêter</button>`
        : `<button class="button primary" type="button" data-start-task="${escapeHtml(task.id)}">${icon('play')} Commencer</button><button class="button quiet" type="button" data-open-panel="quests">Toutes</button>`}</div>
    </div>`;
}

function catalogThumbnail(type) {
  return `<span class="catalog-thumb thumb-${type}" aria-hidden="true"><span class="thumb-tile"></span><span class="object ${type}"><i></i><i></i></span></span>`;
}

export function catalogMarkup(selectedType = null) {
  return Object.entries(BUILDABLES).map(([key, item]) => `<button type="button" draggable="true" class="catalog-item ${selectedType === key ? 'is-selected' : ''}" data-build-item="${key}" aria-pressed="${selectedType === key}" aria-label="${escapeHtml(item.name)}, ${item.energy} Énergie et ${item.materials} Matériaux. Cliquer ou glisser vers la carte.">
    ${catalogThumbnail(key)}<span><strong>${escapeHtml(item.name)}</strong><span>${item.energy} É · ${item.materials} M</span></span>
  </button>`).join('');
}

function entityDescription(entity, model) {
  if (entity.type === 'plot') {
    const phase = model.plotPhase(entity);
    const copy = {
      empty: 'Sol prêt. Planter coûte 3 Énergie.',
      planted: 'Semis visibles. Récolte dans deux jours.',
      growing: 'Les pousses grandissent. Encore un jour.',
      mature: entity.pestDamage ? 'Récolte abîmée : 1 Matériau. Traite les insectes pour récupérer.' : 'Récolte mûre : 3 Matériaux.'
    };
    return copy[phase] || copy.empty;
  }
  if (entity.type === 'greenhouse') return entity.status === 'damaged' ? 'Verrière brisée. Réparation : 4 Énergie et 8 Matériaux.' : 'Serre active. Ventilation et lampes solaires fonctionnent.';
  if (entity.type === 'warehouse') return 'Réserve des Matériaux de la colonie.';
  if (entity.type === 'rock') return 'Bloque six cases. Déblayage : 4 Énergie et 6 Matériaux.';
  if (entity.type === 'bastion') return 'Protège la ferme et relie la Tour météo.';
  if (entity.type === 'tower') return model.state.chapter.towerStable ? 'Tour alignée. Prête à émettre.' : 'Tour désalignée. Inspecte-la avec Milo.';
  if (entity.type === 'silo') return 'Stockage pour les futures récoltes.';
  if (entity.type === 'beacon') return 'Balise qui marque les chemins.';
  return 'Construction locale.';
}

export function entitySheetMarkup(entity, model) {
  const phase = entity.type === 'plot' ? model.plotPhase(entity) : null;
  let action = '';
  if (entity.type === 'plot' && phase === 'empty') action = `<button class="button primary" type="button" data-plant="${escapeHtml(entity.id)}" ${model.canAfford({ energy: 3 }) ? '' : 'disabled'}>Planter · 3 Énergie</button>`;
  if (entity.type === 'plot' && phase === 'mature') action = `<button class="button primary" type="button" data-harvest="${escapeHtml(entity.id)}">Récolter · +${entity.pestDamage ? 1 : 3} Matériau${entity.pestDamage ? '' : 'x'}</button>`;
  if (entity.type === 'plot' && ['planted', 'growing'].includes(phase)) action = `<button class="button quiet" type="button" data-advance-day>Jour suivant</button>`;
  if (entity.type === 'greenhouse' && entity.status === 'damaged') action = `<button class="button primary" type="button" data-repair-greenhouse ${model.canAfford({ energy: 4, materials: 8 }) ? '' : 'disabled'}>Réparer · 4 É · 8 M</button>`;
  if (entity.type === 'rock') action = `<button class="button primary" type="button" data-clear-rocks ${model.canAfford({ energy: 4, materials: 6 }) ? '' : 'disabled'}>Déblayer · 4 É · 6 M</button>`;
  if (entity.type === 'tower') {
    if (!model.state.chapter.towerInspected) action = `<button class="button primary" type="button" data-inspect-tower>Inspecter avec Milo</button>`;
    else if (!model.state.chapter.towerStable) action = `<button class="button primary" type="button" data-stabilize-tower ${model.state.resources.confidence >= 3 && model.canAfford({ energy: 6, materials: 12 }) ? '' : 'disabled'}>Stabiliser · 6 É · 12 M</button>`;
    else if (!model.state.chapter.weatherSignal) action = `<button class="button primary" type="button" data-weather-signal>Émettre le signal</button>`;
    else action = `<button class="button quiet" type="button" disabled>Signal transmis</button>`;
  }
  if (entity.type === 'bastion') action = `<button class="button primary" type="button" data-select-entity="tower">Voir la Tour</button>`;
  const threshold = confidenceThreshold(model.state.resources.confidence);
  return `<p>${escapeHtml(entityDescription(entity, model))}</p>
    ${entity.type === 'tower' ? `<div class="confidence-summary"><strong>${model.state.resources.confidence} / ${threshold.value} Confiance</strong><span>À ${threshold.value} : ${escapeHtml(threshold.benefit)}</span></div>` : ''}
    <div class="sheet-actions">${action || '<button class="button quiet" type="button" data-close-sheet>Fermer</button>'}</div>`;
}

export function objectivesMarkup(model) {
  const index = model.chapterIndex;
  const safeIndex = Math.min(index, CHAPTER_STEPS.length - 1);
  const threshold = confidenceThreshold(model.state.resources.confidence);
  return `<div class="goal-group"><h3>Maintenant</h3><div class="goal-item ${index >= 1 ? 'is-done' : ''}"><i>${index >= 1 ? '✓' : '1'}</i><div><strong>${escapeHtml(CHAPTER_STEPS[safeIndex].title)}</strong><span>${escapeHtml(CHAPTER_STEPS[safeIndex].detail)}</span></div></div></div>
    <div class="goal-group"><h3>Chapitre</h3>${CHAPTER_STEPS.map((step, stepIndex) => `<div class="goal-item ${model.chapterComplete(step) ? 'is-done' : ''}"><i>${model.chapterComplete(step) ? '✓' : stepIndex + 1}</i><div><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.detail)}</span></div></div>`).join('')}</div>
    <div class="goal-group"><h3>Confiance</h3><p><strong>${model.state.resources.confidence} / ${threshold.value}</strong> · Prochain : ${escapeHtml(threshold.benefit)}.</p><p>Règle : +1 à la première quête terminée chaque jour.</p><div class="rep-meter"><span style="width:${Math.min(100, model.state.resources.confidence / threshold.value * 100)}%"></span></div></div>
    <div class="goal-group"><h3>Plus tard</h3><div class="goal-item"><i>∞</i><div><strong>Rendre l’Orée autonome</strong><span>Restaurer le Bastion et ouvrir les Archives.</span></div></div></div>`;
}

export function questsMarkup(model) {
  const tasks = sortTasks(model.state.tasks.filter(task => task.status === 'todo'));
  const done = model.state.tasks.filter(task => task.status === 'done').slice(-4).reverse();
  const row = task => `<article class="quest-row ${task.status === 'done' ? 'is-done' : ''}" data-task-row="${escapeHtml(task.id)}"><h3>${escapeHtml(task.task)}</h3><div class="quest-row-meta"><span>${escapeHtml(task.domain)}</span><span>Priorité ${scoreTask(task)}</span><span>${durationLabel(task.length)}</span></div><div class="quest-row-actions">${task.status === 'todo' ? `<button type="button" class="primary" data-start-task="${escapeHtml(task.id)}">Commencer</button>` : `<button type="button" data-reactivate-task="${escapeHtml(task.id)}">Réactiver</button>`}<button type="button" data-edit-task="${escapeHtml(task.id)}">Modifier</button><button type="button" class="danger-link" data-delete-task="${escapeHtml(task.id)}">Supprimer</button></div></article>`;
  return `<div class="quest-toolbar"><div><strong>${tasks.length} ouverte${tasks.length > 1 ? 's' : ''}</strong><span>Triées par utilité</span></div><button class="button primary" type="button" data-add-task>${icon('plus')} Ajouter</button></div><div class="goal-group"><h3>Quêtes ouvertes</h3><div class="quest-list">${tasks.map(row).join('') || '<p>Aucune quête ouverte.</p>'}</div></div>${done.length ? `<div class="goal-group"><h3>Terminées</h3><div class="quest-list">${done.map(row).join('')}</div></div>` : ''}<div class="sheet-actions"><button class="button quiet" type="button" data-reset-sandbox>${icon('reset')} Réinitialiser le sandbox</button></div>`;
}

export function incidentSheetMarkup(id, incident, model) {
  const meta = {
    irrigation: {
      title: 'Irrigation bouchée', copy: 'La conduite alimente mal les parcelles.', paid: 'Purger maintenant · 2 Énergie', free: 'Dévier à la main · gratuit', consequence: 'Une culture prend un jour de retard.', recover: 'Réparer la conduite · 2 Matériaux'
    },
    insects: {
      title: 'Insectes', copy: 'Des insectes gagnent les jeunes pousses.', paid: 'Traiter maintenant · 3 Énergie', free: 'Récolter tôt · gratuit', consequence: 'La prochaine récolte ne donne que 1 Matériau.', recover: 'Soigner les cultures · 2 Énergie'
    },
    towerShock: {
      title: 'Tour instable', copy: 'Une rafale a desserré le relais météo.', paid: 'Renforcer · 5 Matériaux', free: 'Couper le relais · gratuit', consequence: 'Le signal reste bloqué jusqu’à réparation.', recover: 'Réparer le relais · 4 Matériaux'
    }
  }[id];
  if (!meta) return '<p>Incident inconnu.</p>';
  if (incident.status === 'contained') return `<p>${escapeHtml(meta.consequence)}</p><div class="incident-consequence"><strong>Conséquence récupérable</strong><span>Le marqueur reste sur la carte jusqu’à la réparation.</span></div><div class="sheet-actions"><button class="button primary" type="button" data-recover-incident="${id}">${escapeHtml(meta.recover)}</button><button class="button quiet" type="button" data-close-sheet>Plus tard</button></div>`;
  return `<p>${escapeHtml(meta.copy)}</p><div class="incident-choices"><button class="incident-choice paid" type="button" data-resolve-incident="${id}" data-choice="paid"><strong>${escapeHtml(meta.paid)}</strong><span>Évite la conséquence.</span></button><button class="incident-choice" type="button" data-resolve-incident="${id}" data-choice="free"><strong>${escapeHtml(meta.free)}</strong><span>${escapeHtml(meta.consequence)}</span></button></div><p class="fine-print">Les conséquences touchent seulement le monde du jeu et restent réparables.</p>`;
}

export { INCIDENT_META, confidenceThreshold };
