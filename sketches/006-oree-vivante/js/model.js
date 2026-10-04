import { BUILDABLES, CHAPTER_STEPS, INITIAL_STATE } from './data.js';

const STORAGE_KEY = 'oree-vivante-sandbox-v3';
const clone = value => JSON.parse(JSON.stringify(value));
const cellKey = (row, col) => `${row}:${col}`;

export function scoreTask(task) {
  return Math.round(55 * task.priority / 10 + 25 * (11 - task.length) / 10 + 20 * (11 - task.difficulty) / 10);
}

export function taskReward(task) {
  let reward = task.length <= 1
    ? { energy: 2, materials: 1, reputation: 0 }
    : task.length <= 3
      ? { energy: 3, materials: 3, reputation: 0 }
      : task.length <= 6
        ? { energy: 5, materials: 5, reputation: 1 }
        : task.length <= 8
          ? { energy: 7, materials: 7, reputation: 2 }
          : { energy: 10, materials: 9, reputation: 3 };
  reward = { ...reward };
  if (task.difficulty >= 7) {
    reward.materials += 2;
    reward.reputation += 1;
  }
  return reward;
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => scoreTask(b) - scoreTask(a) || b.priority - a.priority || a.length - b.length || a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}

function normalize(raw) {
  const base = clone(INITIAL_STATE);
  if (!raw || raw.version !== base.version || !Array.isArray(raw.tasks) || !Array.isArray(raw.entities)) return base;
  return {
    ...base,
    ...raw,
    resources: { ...base.resources, ...raw.resources },
    mission: { ...base.mission, ...raw.mission },
    chapter: { ...base.chapter, ...raw.chapter },
    camera: { ...base.camera, ...raw.camera },
    tasks: raw.tasks.map(task => ({ ...task })),
    entities: raw.entities.map(entity => ({ ...entity })),
    placed: Array.isArray(raw.placed) ? raw.placed.map(entity => ({ ...entity })) : [],
    unlockedCells: Array.isArray(raw.unlockedCells) ? [...raw.unlockedCells] : []
  };
}

export class OreeModel {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.state = this.load();
  }

  load() {
    try { return normalize(JSON.parse(this.storage.getItem(STORAGE_KEY))); }
    catch { return clone(INITIAL_STATE); }
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

  getTask(id) { return this.state.tasks.find(task => task.id === id) || null; }
  getEntity(id) { return this.allEntities.find(entity => entity.id === id) || null; }

  selectTask(id) {
    if (this.getTask(id)) this.state.selectedTaskId = id;
    this.save();
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
    task.status = 'done';
    this.state.resources.energy += reward.energy;
    this.state.resources.materials += reward.materials;
    this.state.resources.reputation += reward.reputation;
    this.state.chapter.taskCompleted = true;
    this.state.mission = { taskId: null, startedAt: null };
    this.state.selectedTaskId = this.recommendedTask?.id || task.id;
    this.save();
    return { task, reward };
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
    if (!this.canAfford(cost)) throw new Error('Ressources insuffisantes. Termine une quête pour ravitailler l’Orée.');
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
    this.state.chapter.planted = true;
    this.save();
    return plot;
  }

  harvest(id) {
    const plot = this.getEntity(id);
    if (!plot || plot.type !== 'plot' || this.plotPhase(plot) !== 'mature') throw new Error('La culture n’est pas encore mûre.');
    plot.status = 'empty';
    plot.plantedDay = null;
    this.state.resources.materials += 3;
    this.save();
    return plot;
  }

  repairGreenhouse() {
    const greenhouse = this.getEntity('greenhouse');
    if (greenhouse.status !== 'damaged') throw new Error('La serre est déjà réparée.');
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
    if (this.state.resources.reputation < 3) throw new Error('La Tour exige 3 Réputation pour confier ses codes à l’intendant.');
    if (this.state.chapter.towerStable) throw new Error('La Tour météo est déjà stabilisée.');
    this.spend({ energy: 6, materials: 12 });
    this.state.chapter.towerStable = true;
    const tower = this.getEntity('tower');
    tower.status = 'stable';
    this.save();
  }

  emitWeatherSignal() {
    if (!this.state.chapter.towerStable) throw new Error('La Tour doit être stabilisée.');
    this.state.chapter.weatherSignal = true;
    this.save();
  }

  advanceDay() {
    this.state.day += 1;
    this.save();
  }

  chapterComplete(step) {
    if (step.key === 'reputation') return this.state.resources.reputation >= 3;
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
