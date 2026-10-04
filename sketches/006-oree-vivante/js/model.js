import { BUILDABLES, CHAPTER_STEPS, INITIAL_STATE } from './data.js';

export const STORAGE_KEY = 'oree-vivante-sandbox-v4';
const LEGACY_KEY = 'oree-vivante-sandbox-v3';
const clone = value => JSON.parse(JSON.stringify(value));
const cellKey = (row, col) => `${row}:${col}`;
const clampRating = value => Math.max(1, Math.min(10, Math.round(Number(value) || 1)));

export function scoreTask(task) {
  return Math.round(55 * task.priority / 10 + 25 * (11 - task.length) / 10 + 20 * (11 - task.difficulty) / 10);
}

export function taskReward(task) {
  const reward = task.length <= 1
    ? { energy: 2, materials: 1 }
    : task.length <= 3
      ? { energy: 3, materials: 3 }
      : task.length <= 6
        ? { energy: 5, materials: 5 }
        : task.length <= 8
          ? { energy: 7, materials: 7 }
          : { energy: 10, materials: 9 };
  if (task.difficulty >= 7) reward.materials += 2;
  return reward;
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => scoreTask(b) - scoreTask(a) || b.priority - a.priority || a.length - b.length || a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}

function normalizeTask(task) {
  return {
    id: String(task.id || `task-local-${Date.now()}`),
    task: String(task.task || '').trim(),
    difficulty: clampRating(task.difficulty),
    length: clampRating(task.length),
    priority: clampRating(task.priority),
    domain: String(task.domain || 'Personnel').trim() || 'Personnel',
    status: task.status === 'done' ? 'done' : 'todo',
    created: String(task.created || '2026-10-04')
  };
}

function activateDueIncidents(state) {
  Object.values(state.incidents).forEach(incident => {
    if (incident.status === 'dormant' && state.day >= incident.day) incident.status = 'active';
  });
}

function normalize(raw) {
  const base = clone(INITIAL_STATE);
  if (!raw || !Array.isArray(raw.tasks) || !Array.isArray(raw.entities)) return base;
  const legacyConfidence = raw.resources?.confidence ?? raw.resources?.reputation ?? base.resources.confidence;
  const state = {
    ...base,
    ...raw,
    version: base.version,
    resources: { ...base.resources, ...raw.resources, confidence: legacyConfidence },
    mission: { ...base.mission, ...raw.mission },
    chapter: { ...base.chapter, ...raw.chapter },
    camera: { ...base.camera, ...raw.camera },
    incidents: {
      irrigation: { ...base.incidents.irrigation, ...raw.incidents?.irrigation },
      insects: { ...base.incidents.insects, ...raw.incidents?.insects },
      towerShock: { ...base.incidents.towerShock, ...raw.incidents?.towerShock }
    },
    confidenceDays: Array.isArray(raw.confidenceDays) ? [...new Set(raw.confidenceDays.map(Number))] : [],
    tasks: raw.tasks.map(normalizeTask).filter(task => task.task),
    entities: raw.entities.map(entity => ({ ...entity })),
    placed: Array.isArray(raw.placed) ? raw.placed.map(entity => ({ ...entity })) : [],
    unlockedCells: Array.isArray(raw.unlockedCells) ? [...raw.unlockedCells] : []
  };
  delete state.resources.reputation;
  activateDueIncidents(state);
  return state;
}

export class OreeModel {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.state = this.load();
    this.save();
  }

  load() {
    try {
      const current = this.storage.getItem(STORAGE_KEY);
      const legacy = this.storage.getItem(LEGACY_KEY);
      return normalize(JSON.parse(current || legacy));
    } catch {
      return clone(INITIAL_STATE);
    }
  }

  save() {
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
    catch { /* Le sandbox continue en mémoire si le stockage est indisponible. */ }
  }

  reset() {
    this.state = clone(INITIAL_STATE);
    this.save();
  }

  get openTasks() { return this.state.tasks.filter(task => task.status === 'todo'); }
  get recommendedTask() { return sortTasks(this.openTasks)[0] || null; }
  get activeTask() { return this.state.tasks.find(task => task.id === this.state.mission.taskId) || null; }
  get allEntities() { return [...this.state.entities, ...this.state.placed]; }
  get activeIncidents() { return Object.entries(this.state.incidents).filter(([, incident]) => ['active', 'contained'].includes(incident.status)); }

  getTask(id) { return this.state.tasks.find(task => task.id === id) || null; }
  getEntity(id) { return this.allEntities.find(entity => entity.id === id) || null; }
  getIncident(id) { return this.state.incidents[id] || null; }

  selectTask(id) {
    if (this.getTask(id)) this.state.selectedTaskId = id;
    this.save();
  }

  addTask(values) {
    const task = normalizeTask({
      ...values,
      id: `task-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'todo',
      created: '2026-10-04'
    });
    if (!task.task) throw new Error('Donne un titre à la quête.');
    this.state.tasks.push(task);
    this.state.selectedTaskId = task.id;
    this.save();
    return task;
  }

  updateTask(id, values) {
    const task = this.getTask(id);
    if (!task) throw new Error('Quête introuvable.');
    const updated = normalizeTask({ ...task, ...values, id: task.id, status: task.status, created: task.created });
    if (!updated.task) throw new Error('Donne un titre à la quête.');
    Object.assign(task, updated);
    this.save();
    return task;
  }

  deleteTask(id) {
    const task = this.getTask(id);
    if (!task) throw new Error('Quête introuvable.');
    this.state.tasks = this.state.tasks.filter(item => item.id !== id);
    if (this.state.mission.taskId === id) this.state.mission = { taskId: null, startedAt: null };
    this.state.selectedTaskId = this.recommendedTask?.id || null;
    this.save();
    return task;
  }

  startTask(id) {
    const task = this.getTask(id);
    if (!task || task.status !== 'todo') throw new Error('Cette quête n’est plus disponible.');
    this.state.mission = { taskId: id, startedAt: Date.now() };
    this.state.selectedTaskId = id;
    this.save();
    return task;
  }

  cancelTask() {
    const task = this.activeTask;
    this.state.mission = { taskId: null, startedAt: null };
    this.save();
    return task;
  }

  completeTask(id = this.state.mission.taskId) {
    const task = this.getTask(id);
    if (!task || task.status !== 'todo') throw new Error('Cette quête ne peut pas être terminée.');
    const reward = taskReward(task);
    const confidenceBonus = !this.state.confidenceDays.includes(this.state.day);
    task.status = 'done';
    this.state.resources.energy += reward.energy;
    this.state.resources.materials += reward.materials;
    if (confidenceBonus) {
      this.state.resources.confidence += 1;
      this.state.confidenceDays.push(this.state.day);
    }
    this.state.chapter.taskCompleted = true;
    this.state.mission = { taskId: null, startedAt: null };
    this.state.selectedTaskId = this.recommendedTask?.id || task.id;
    this.save();
    return { task, reward: { ...reward, confidence: confidenceBonus ? 1 : 0 }, confidenceBonus };
  }

  reactivateTask(id) {
    const task = this.getTask(id);
    if (!task) return null;
    task.status = 'todo';
    this.save();
    return task;
  }

  canAfford(cost) {
    return this.state.resources.energy >= (cost.energy || 0) && this.state.resources.materials >= (cost.materials || 0);
  }

  spend(cost) {
    if (!this.canAfford(cost)) throw new Error('Ressources insuffisantes. Termine une quête.');
    this.state.resources.energy -= cost.energy || 0;
    this.state.resources.materials -= cost.materials || 0;
  }

  plotPhase(entity) {
    if (entity.status === 'empty') return 'empty';
    if (entity.status === 'planted') {
      const age = Math.max(0, this.state.day - (entity.plantedDay || this.state.day));
      return age >= 2 ? 'mature' : age === 1 ? 'growing' : 'planted';
    }
    return entity.status;
  }

  plant(id) {
    const plot = this.getEntity(id);
    if (!plot || plot.type !== 'plot' || plot.status !== 'empty') throw new Error('Cette parcelle n’est pas libre.');
    this.spend({ energy: 3 });
    plot.status = 'planted';
    plot.plantedDay = this.state.day;
    plot.pestDamage = false;
    this.state.chapter.planted = true;
    this.save();
    return plot;
  }

  harvest(id) {
    const plot = this.getEntity(id);
    if (!plot || plot.type !== 'plot' || this.plotPhase(plot) !== 'mature') throw new Error('La culture n’est pas encore mûre.');
    const materials = plot.pestDamage ? 1 : 3;
    plot.status = 'empty';
    plot.plantedDay = null;
    plot.pestDamage = false;
    this.state.resources.materials += materials;
    this.save();
    return { plot, materials };
  }

  repairGreenhouse() {
    const greenhouse = this.getEntity('greenhouse');
    if (!greenhouse || greenhouse.status !== 'damaged') throw new Error('La serre est déjà réparée.');
    this.spend({ energy: 4, materials: 8 });
    greenhouse.status = 'online';
    this.save();
  }

  clearRocks() {
    const rocks = this.getEntity('rocks');
    if (!rocks || rocks.status === 'cleared') throw new Error('L’éboulis est déjà déblayé.');
    this.spend({ energy: 4, materials: 6 });
    rocks.status = 'cleared';
    ['3:6', '3:7', '4:6', '4:7', '5:6', '5:7'].forEach(key => {
      if (!this.state.unlockedCells.includes(key)) this.state.unlockedCells.push(key);
    });
    this.save();
  }

  isCellLocked(row, col) {
    return col >= 6 && row >= 3 && !this.state.unlockedCells.includes(cellKey(row, col));
  }

  isOccupied(row, col) {
    return this.allEntities.some(entity => entity.status !== 'cleared' && entity.row === row && entity.col === col);
  }

  canPlace(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8 && !this.isCellLocked(row, col) && !this.isOccupied(row, col) && !((row === 5 || row === 6) && col < 2);
  }

  firstBuildableCell() {
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) if (this.canPlace(row, col)) return { row, col };
    }
    return { row: 0, col: 0 };
  }

  place(type, row, col, rotation = 0) {
    const definition = BUILDABLES[type];
    if (!definition) throw new Error('Objet de construction inconnu.');
    if (!this.canPlace(row, col)) throw new Error('Cette case est occupée ou inaccessible.');
    this.spend(definition);
    const count = this.state.placed.filter(item => item.type === type).length + 1;
    const entity = {
      id: `placed-${type}-${Date.now()}-${count}`,
      type,
      name: `${definition.short} ${count}`,
      row,
      col,
      rotation,
      status: type === 'plot' ? 'empty' : 'online',
      plantedDay: null,
      placed: true
    };
    this.state.placed.push(entity);
    this.save();
    return entity;
  }

  inspectTower() {
    this.state.chapter.towerInspected = true;
    this.save();
  }

  stabilizeTower() {
    if (!this.state.chapter.towerInspected) throw new Error('Inspecte d’abord la Tour météo.');
    if (this.state.resources.confidence < 3) throw new Error('Il faut 3 Confiance pour obtenir les codes.');
    if (this.state.chapter.towerStable) throw new Error('La Tour météo est déjà stabilisée.');
    this.spend({ energy: 6, materials: 12 });
    this.state.chapter.towerStable = true;
    const tower = this.getEntity('tower');
    tower.status = 'stable';
    this.save();
  }

  emitWeatherSignal() {
    if (!this.state.chapter.towerStable) throw new Error('La Tour doit être stabilisée.');
    if (this.state.incidents.towerShock.status === 'contained') throw new Error('Le relais est coupé. Répare l’incident de la Tour.');
    this.state.chapter.weatherSignal = true;
    this.save();
  }

  advanceDay() {
    this.state.day += 1;
    activateDueIncidents(this.state);
    this.save();
    return this.activeIncidents;
  }

  resolveIncident(id, choice) {
    const incident = this.getIncident(id);
    if (!incident || incident.status !== 'active') throw new Error('Cet incident n’attend plus de décision.');
    if (choice === 'paid') {
      const costs = { irrigation: { energy: 2 }, insects: { energy: 3 }, towerShock: { materials: 5 } };
      this.spend(costs[id]);
      incident.status = 'resolved';
      incident.consequence = null;
    } else if (choice === 'free') {
      incident.status = 'contained';
      if (id === 'irrigation') {
        incident.consequence = 'crop-delay';
        const plot = this.allEntities.find(entity => entity.type === 'plot' && entity.status === 'planted');
        if (plot) plot.plantedDay += 1;
      }
      if (id === 'insects') {
        incident.consequence = 'damaged-crop';
        const plot = this.allEntities.find(entity => entity.type === 'plot' && entity.status === 'planted');
        if (plot) plot.pestDamage = true;
      }
      if (id === 'towerShock') incident.consequence = 'relay-offline';
    } else {
      throw new Error('Choix d’incident inconnu.');
    }
    this.save();
    return incident;
  }

  recoverIncident(id) {
    const incident = this.getIncident(id);
    if (!incident || incident.status !== 'contained') throw new Error('Aucune conséquence à réparer ici.');
    const costs = { irrigation: { materials: 2 }, insects: { energy: 2 }, towerShock: { materials: 4 } };
    this.spend(costs[id]);
    if (id === 'irrigation') {
      const plot = this.allEntities.find(entity => entity.type === 'plot' && entity.status === 'planted');
      if (plot) plot.plantedDay = Math.max(1, plot.plantedDay - 1);
    }
    if (id === 'insects') this.allEntities.filter(entity => entity.type === 'plot').forEach(plot => { plot.pestDamage = false; });
    incident.status = 'resolved';
    incident.consequence = null;
    this.save();
    return incident;
  }

  chapterComplete(step) {
    if (step.key === 'confidence') return this.state.resources.confidence >= 3;
    return Boolean(this.state.chapter[step.key]);
  }

  get chapterIndex() {
    const index = CHAPTER_STEPS.findIndex(step => !this.chapterComplete(step));
    return index === -1 ? CHAPTER_STEPS.length : index;
  }

  setOnboarding(step, complete = false) {
    this.state.onboardingStep = step;
    this.state.onboardingComplete = complete;
    this.save();
  }

  setCamera(camera) {
    this.state.camera = { ...this.state.camera, ...camera };
    this.save();
  }
}
