import { BUILDABLES, CHAPTER_STEPS } from './data.js';
import { scoreTask, sortTasks, taskReward } from './model.js';

export const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
export const cellKey = (row, col) => `${row}:${col}`;

export function isoPosition(row, col) {
  return { x: 338 + (col - row) * 43, y: 88 + (col + row) * 22 };
}

function durationLabel(value) {
  return value <= 1 ? '≈ 10 min' : value <= 2 ? '15–25 min' : value <= 4 ? '30–60 min' : value <= 6 ? '1–2 h' : value <= 8 ? 'longue' : 'jalon';
}

function difficultyLabel(value) {
  return value <= 2 ? 'douce' : value <= 4 ? 'modérée' : value <= 6 ? 'soutenue' : 'intense';
}

export function terrainMarkup(model, buildState) {
  const tiles = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const { x, y } = isoPosition(row, col);
      const path = (row === 5 && col >= 1 && col <= 6) || (col === 5 && row <= 5);
      const locked = model.isCellLocked(row, col);
      const selected = buildState.cell?.row === row && buildState.cell?.col === col;
      const buildable = Boolean(buildState.type) && model.canPlace(row, col);
      const invalid = Boolean(buildState.type) && !model.canPlace(row, col);
      const classes = ['tile', path ? 'path' : '', locked ? 'locked' : '', buildable ? 'buildable' : '', invalid ? 'invalid' : '', selected ? 'candidate' : ''].filter(Boolean).join(' ');
      tiles.push(`<button type="button" class="${classes}" data-map-cell="${row}:${col}" style="left:${x}px;top:${y}px" aria-label="Case ${row + 1}, ${col + 1}${locked ? ', bloquée' : buildable ? ', placement valide' : ''}"></button>`);
    }
  }
  return tiles.join('');
}

function entityObjectClass(entity, model) {
  if (entity.type === 'plot') return `plot ${model.plotPhase(entity) !== 'empty' ? 'planted' : ''}`;
  if (entity.type === 'beacon') return 'beacon';
  if (entity.type === 'rock') return 'rock';
  return entity.type;
}

export function entityMarkup(entity, model, selectedId = null, mapRotation = 0, ghost = false, valid = true) {
  if (entity.status === 'cleared') return '';
  const { x, y } = isoPosition(entity.row, entity.col);
  const classes = ['entity', entity.type, entity.status === 'damaged' ? 'damaged' : '', entity.id === selectedId ? 'is-selected' : '', entity.type === 'tower' && model.state.chapter.towerStable ? 'is-stable' : '', ghost ? 'ghost' : '', ghost && !valid ? 'invalid' : ''].filter(Boolean).join(' ');
  const label = ghost ? `Aperçu : ${BUILDABLES[entity.type]?.name || entity.name}` : entity.name;
  return `<button type="button" class="${classes}" data-select-entity="${escapeHtml(entity.id)}" style="left:${x}px;top:${y}px;--counter-rotation:${-mapRotation}deg;--entity-rotation:${entity.rotation || 0}deg" aria-label="${escapeHtml(label)}">
    <span class="object ${entityObjectClass(entity, model)}" aria-hidden="true"></span><span class="tag">${escapeHtml(label)}</span>
  </button>`;
}

export function entitiesMarkup(model, selectedId, mapRotation, buildState) {
  const ordered = [...model.allEntities].sort((a, b) => (a.row + a.col) - (b.row + b.col));
  let markup = ordered.map(entity => entityMarkup(entity, model, selectedId, mapRotation)).join('');
  if (buildState.type && buildState.cell) {
    markup += entityMarkup({ id: 'placement-ghost', type: buildState.type, name: BUILDABLES[buildState.type].name, row: buildState.cell.row, col: buildState.cell.col, rotation: buildState.rotation, status: 'preview' }, model, null, mapRotation, true, model.canPlace(buildState.cell.row, buildState.cell.col));
  }
  return markup;
}

export function recommendedTaskMarkup(model, expanded = false) {
  const task = model.activeTask || model.recommendedTask;
  if (!task) return `<button class="task-summary" type="button"><span><span>Quêtes accomplies</span><strong>Le registre local est à jour</strong><small>Réactive une quête depuis le registre pour continuer.</small></span>${icon('check')}</button>`;
  const reward = taskReward(task);
  const active = model.activeTask?.id === task.id;
  return `<button class="task-summary" type="button" data-toggle-task aria-expanded="${expanded}">
      <span><span>${active ? 'Mission en cours' : 'Tâche recommandée'}</span><strong id="recommended-title">${escapeHtml(task.task)}</strong><small>${escapeHtml(task.domain)} · ${durationLabel(task.length)} · toucher pour ${expanded ? 'replier' : 'détailler'}</small></span>
      <span class="task-score">${scoreTask(task)}<small>score</small></span>
    </button>
    <div class="task-details" ${expanded ? '' : 'hidden'}>
      <p>Recommandée car elle combine priorité ${task.priority}/10, durée ${task.length}/10 et difficulté ${task.difficulty}/10.</p>
      <div class="task-meta"><span>Priorité ${task.priority}</span><span>${durationLabel(task.length)}</span><span>Énergie ${difficultyLabel(task.difficulty)}</span></div>
      <div class="reward-row" aria-label="Récompenses"><span class="reward-chip">${icon('bolt')}+${reward.energy}</span><span class="reward-chip">${icon('crate')}+${reward.materials}</span>${reward.reputation ? `<span class="reward-chip">${icon('star')}+${reward.reputation}</span>` : ''}</div>
      <div class="task-actions">${active
        ? `<button class="button primary" type="button" data-complete-task="${escapeHtml(task.id)}">Terminer</button><button class="button quiet" type="button" data-cancel-task>Annuler</button>`
        : `<button class="button primary" type="button" data-start-task="${escapeHtml(task.id)}">${icon('play')} Commencer</button><button class="button quiet" type="button" data-open-panel="quests">Registre</button>`}</div>
      <p class="task-explain">Le score choisit la prochaine action. Les gains dépendent de la longueur et de la difficulté, pas du score.</p>
    </div>`;
}

export function catalogMarkup(selectedType = null) {
  return Object.entries(BUILDABLES).map(([key, item]) => `<button type="button" class="catalog-item ${selectedType === key ? 'is-selected' : ''}" data-build-item="${key}" aria-pressed="${selectedType === key}">
    <span class="catalog-icon">${item.short.slice(0, 2).toUpperCase()}</span><span><strong>${escapeHtml(item.name)}</strong><span>${item.energy} É · ${item.materials} M</span></span>
  </button>`).join('');
}

function entityDescription(entity, model) {
  if (entity.type === 'plot') {
    const phase = model.plotPhase(entity);
    const copy = {
      empty: 'Sol prêt. Planter coûte 3 Énergie.',
      planted: 'Semences engagées. Deux jours avant la récolte.',
      growing: 'La culture prend racine. Un jour avant la récolte.',
      mature: 'Culture mûre. Récolte disponible pour 3 Matériaux.'
    };
    return copy[phase] || copy.empty;
  }
  if (entity.type === 'greenhouse') return entity.status === 'damaged' ? 'Les panneaux solaires ont cédé pendant la tempête. Une réparation protège le futur secteur horticole.' : 'Serre remise en ligne. Sa verrière turquoise éclaire les parcelles voisines.';
  if (entity.type === 'warehouse') return 'Réserve centrale de bois, pierre chaude et pièces récupérées. Les Matériaux financent les constructions et réparations.';
  if (entity.type === 'rock') return 'Un éboulis de cendre bloque six cases d’extension. Le déblayer coûte 4 Énergie et 6 Matériaux.';
  if (entity.type === 'bastion') return 'Une enceinte agricole, un réseau d’alerte et un secret sous les fondations. Ses secteurs réduiront les dégâts des événements.';
  if (entity.type === 'tower') return model.state.chapter.towerStable ? 'Le réseau météo est réaligné. Il peut maintenant émettre vers la vallée.' : 'Le mât de lecture du Bastion est désaligné. Milo peut le stabiliser après inspection, avec 3 Réputation.';
  if (entity.type === 'silo') return 'Silo compact placé sur la grille. Il prépare la future boucle de stockage.';
  if (entity.type === 'beacon') return 'Balise florale placée pour guider les équipes dans la brume de cendre.';
  return 'Élément construit dans le sandbox local.';
}

export function entitySheetMarkup(entity, model) {
  const phase = entity.type === 'plot' ? model.plotPhase(entity) : null;
  let action = '';
  if (entity.type === 'plot' && phase === 'empty') action = `<button class="button primary" type="button" data-plant="${escapeHtml(entity.id)}" ${model.canAfford({ energy: 3 }) ? '' : 'disabled'}>Planter · 3 Énergie</button>`;
  if (entity.type === 'plot' && phase === 'mature') action = `<button class="button primary" type="button" data-harvest="${escapeHtml(entity.id)}">Récolter · +3 Matériaux</button>`;
  if (entity.type === 'plot' && ['planted', 'growing'].includes(phase)) action = `<button class="button quiet" type="button" data-advance-day>Avancer au jour suivant</button>`;
  if (entity.type === 'greenhouse' && entity.status === 'damaged') action = `<button class="button primary" type="button" data-repair-greenhouse ${model.canAfford({ energy: 4, materials: 8 }) ? '' : 'disabled'}>Réparer · 4 Énergie · 8 Matériaux</button>`;
  if (entity.type === 'rock') action = `<button class="button primary" type="button" data-clear-rocks ${model.canAfford({ energy: 4, materials: 6 }) ? '' : 'disabled'}>Déblayer · 4 Énergie · 6 Matériaux</button>`;
  if (entity.type === 'tower') {
    if (!model.state.chapter.towerInspected) action = `<button class="button primary" type="button" data-inspect-tower>Inspecter avec Milo</button>`;
    else if (!model.state.chapter.towerStable) action = `<button class="button primary" type="button" data-stabilize-tower ${model.state.resources.reputation >= 3 && model.canAfford({ energy: 6, materials: 12 }) ? '' : 'disabled'}>Stabiliser · 6 Énergie · 12 Matériaux</button>`;
    else if (!model.state.chapter.weatherSignal) action = `<button class="button primary" type="button" data-weather-signal>Émettre le signal météo</button>`;
    else action = `<button class="button quiet" type="button" disabled>Signal transmis à la vallée</button>`;
  }
  if (entity.type === 'bastion') action = `<button class="button primary" type="button" data-select-entity="tower">Voir la Tour météo</button>`;
  return `<p>${escapeHtml(entityDescription(entity, model))}</p>
    ${entity.type === 'tower' ? `<div class="rep-meter" aria-label="Réputation ${model.state.resources.reputation} sur 3"><span style="width:${Math.min(100, model.state.resources.reputation / 3 * 100)}%"></span></div><p><strong>${model.state.resources.reputation} / 3 Réputation</strong> · À 3, Naïma confie les codes de stabilisation.</p>` : ''}
    <div class="sheet-actions">${action || '<button class="button quiet" type="button" data-close-sheet>Fermer l’inspection</button>'}</div>`;
}

export function objectivesMarkup(model) {
  const index = model.chapterIndex;
  const nextRep = Math.min(3, model.state.resources.reputation);
  return `<div class="goal-group"><h3>Maintenant</h3><div class="goal-item ${index >= 1 ? 'is-done' : ''}"><i>${index >= 1 ? '✓' : '1'}</i><div><strong>${escapeHtml(CHAPTER_STEPS[Math.min(index, 5)].title)}</strong><span>${escapeHtml(CHAPTER_STEPS[Math.min(index, 5)].detail)}</span></div></div></div>
    <div class="goal-group"><h3>Chapitre · Le premier sillon</h3>${CHAPTER_STEPS.map((step, stepIndex) => `<div class="goal-item ${model.chapterComplete(step) ? 'is-done' : ''}"><i>${model.chapterComplete(step) ? '✓' : stepIndex + 1}</i><div><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.detail)}</span></div></div>`).join('')}</div>
    <div class="goal-group"><h3>Réputation</h3><p><strong>${nextRep} / 3</strong> · À 3 : arrivée de Naïma et codes de la Tour. La Réputation ne se dépense jamais.</p><div class="rep-meter"><span style="width:${nextRep / 3 * 100}%"></span></div></div>
    <div class="goal-group"><h3>Long terme</h3><div class="goal-item"><i>∞</i><div><strong>Rendre l’Orée autonome</strong><span>Restaurer toute l’enceinte et découvrir ce que le Bastion protège.</span></div></div></div>`;
}

export function questsMarkup(model) {
  const tasks = sortTasks(model.state.tasks.filter(task => task.status === 'todo')).slice(0, 12);
  const done = model.state.tasks.filter(task => task.status === 'done').slice(-3).reverse();
  const row = task => `<article class="quest-row ${task.status === 'done' ? 'is-done' : ''}"><h3>${escapeHtml(task.task)}</h3><div class="quest-row-meta"><span>${escapeHtml(task.domain)}</span><span>score ${scoreTask(task)}</span><span>${durationLabel(task.length)}</span></div><div class="quest-row-actions">${task.status === 'todo' ? `<button type="button" class="primary" data-start-task="${escapeHtml(task.id)}">Commencer</button>` : `<button type="button" data-reactivate-task="${escapeHtml(task.id)}">Réactiver</button>`}</div></article>`;
  return `<div class="goal-group"><h3>Quêtes ouvertes · copie locale</h3><div class="quest-list">${tasks.map(row).join('') || '<p>Aucune quête ouverte.</p>'}</div></div>${done.length ? `<div class="goal-group"><h3>Dernières terminées</h3><div class="quest-list">${done.map(row).join('')}</div></div>` : ''}<div class="sheet-actions"><button class="button quiet" type="button" data-reset-sandbox>${icon('reset')} Réinitialiser le sandbox</button></div>`;
}
