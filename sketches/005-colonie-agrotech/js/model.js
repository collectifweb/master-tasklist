import { INITIAL_STATE, BUILDINGS } from './data.js';

const STORAGE_KEY = 'colonie-oree-sandbox-v1';
const SANDBOX_DATE = '2026-10-04';

const clone = value => JSON.parse(JSON.stringify(value));

export function scoreTask(task) {
  return Math.round(55 * task.priority / 10 + 25 * (11 - task.length) / 10 + 20 * (11 - task.difficulty) / 10);
}

export function scoreParts(task) {
  return {
    priority: Math.round(55 * task.priority / 10),
    length: Math.round(25 * (11 - task.length) / 10),
    difficulty: Math.round(20 * (11 - task.difficulty) / 10)
  };
}

export function taskReward(task) {
  let reward;
  if (task.length <= 1) reward = { energy: 2, materials: 1, reputation: 0, className: 'Micro' };
  else if (task.length <= 3) reward = { energy: 3, materials: 2, reputation: 0, className: 'Courte' };
  else if (task.length <= 6) reward = { energy: 5, materials: 4, reputation: 1, className: 'Moyenne' };
  else if (task.length <= 8) reward = { energy: 8, materials: 7, reputation: 2, className: 'Longue' };
  else reward = { energy: 12, materials: 10, reputation: 3, className: 'Jalon' };
  if (task.difficulty >= 7) {
    reward.materials += 2;
    reward.reputation += 1;
  }
  return reward;
}

export function sortTasks(tasks, mode = 'score') {
  return [...tasks].sort((a, b) => {
    if (mode === 'priority') return b.priority - a.priority || a.length - b.length || a.difficulty - b.difficulty || a.created.localeCompare(b.created) || a.id.localeCompare(b.id);
    if (mode === 'length') return a.length - b.length || b.priority - a.priority || a.difficulty - b.difficulty || a.created.localeCompare(b.created) || a.id.localeCompare(b.id);
    if (mode === 'difficulty') return a.difficulty - b.difficulty || b.priority - a.priority || a.length - b.length || a.created.localeCompare(b.created) || a.id.localeCompare(b.id);
    return scoreTask(b) - scoreTask(a) || b.priority - a.priority || a.length - b.length || a.difficulty - b.difficulty || a.created.localeCompare(b.created) || a.id.localeCompare(b.id);
  });
}

function normalizeState(raw) {
  const base = clone(INITIAL_STATE);
  if (!raw || raw.version !== base.version || !Array.isArray(raw.tasks) || !Array.isArray(raw.plots)) return base;
  return {
    ...base,
    ...raw,
    resources: { ...base.resources, ...raw.resources },
    mission: { ...base.mission, ...raw.mission },
    buildings: { ...base.buildings, ...raw.buildings },
    bastion: { ...base.bastion, ...raw.bastion },
    event: { ...base.event, ...raw.event },
    bonuses: { ...base.bonuses, ...raw.bonuses },
    tasks: raw.tasks.map(task => ({ ...task })),
    plots: raw.plots.map((plot, index) => ({ ...base.plots[index], ...plot }))
  };
}

export class SandboxModel {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.state = this.load();
  }

  load() {
    try {
      return normalizeState(JSON.parse(this.storage.getItem(STORAGE_KEY)));
    } catch {
      return clone(INITIAL_STATE);
    }
  }

  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Le prototype reste fonctionnel en mémoire si le stockage est indisponible.
    }
  }

  reset() {
    this.state = clone(INITIAL_STATE);
    this.save();
    return this.state;
  }

  get openTasks() { return this.state.tasks.filter(task => task.status === 'todo'); }
  get activeMissionTask() { return this.state.tasks.find(task => task.id === this.state.mission.taskId) || null; }

  getTask(id) { return this.state.tasks.find(task => task.id === id) || null; }

  selectTask(id) {
    if (this.getTask(id)) this.state.selectedTaskId = id;
    this.save();
  }

  addTask(payload) {
    const id = `sandbox-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const task = { id, created: SANDBOX_DATE, ...payload };
    this.state.tasks.unshift(task);
    this.state.selectedTaskId = id;
    let bonus = 0;
    if (!this.state.bonuses.taskAdded) {
      this.state.resources.energy += 1;
      this.state.bonuses.taskAdded = true;
      bonus = 1;
    }
    this.save();
    return { task, bonus };
  }

  updateTask(id, payload) {
    const task = this.getTask(id);
    if (!task) return null;
    Object.assign(task, payload);
    if (task.status === 'done' && this.state.mission.taskId === id) this.state.mission = { taskId: null, startedAt: null };
    this.save();
    return task;
  }

  startMission(id) {
    const task = this.getTask(id);
    if (!task || task.status !== 'todo') throw new Error('Cette quête ne peut pas être lancée.');
    this.state.mission = { taskId: id, startedAt: Date.now() };
    this.state.selectedTaskId = id;
    this.save();
    return task;
  }

  cancelMission() {
    const task = this.activeMissionTask;
    this.state.mission = { taskId: null, startedAt: null };
    this.save();
    return task;
  }

  completeMission() {
    const task = this.activeMissionTask;
    if (!task) throw new Error('Aucune mission active.');
    task.status = 'done';
    const reward = taskReward(task);
    this.state.resources.energy += reward.energy;
    this.state.resources.materials += reward.materials;
    this.state.resources.reputation += reward.reputation;
    this.state.mission = { taskId: null, startedAt: null };
    const next = sortTasks(this.openTasks, 'score')[0];
    this.state.selectedTaskId = next?.id || task.id;
    this.save();
    return { task, reward };
  }

  canAfford(cost) {
    return this.state.resources.energy >= (cost.energy || 0) && this.state.resources.materials >= (cost.materials || 0);
  }

  spend(cost) {
    if (!this.canAfford(cost)) throw new Error('Ressources insuffisantes.');
    this.state.resources.energy -= cost.energy || 0;
    this.state.resources.materials -= cost.materials || 0;
  }

  plotPhase(plot) {
    if (plot.status === 'damaged') return 'damaged';
    if (plot.status === 'recovering') return 'recovering';
    if (plot.status === 'empty') return 'empty';
    const age = Math.max(0, this.state.day - plot.plantedDay);
    if (age === 0) return 'seeded';
    if (age === 1) return 'growing';
    return 'mature';
  }

  plant(plotId) {
    const plot = this.state.plots.find(item => item.id === plotId);
    if (!plot || plot.status !== 'empty') throw new Error('Cette parcelle n’est pas libre.');
    this.spend({ energy: 3 });
    Object.assign(plot, { status: 'planted', plantedDay: this.state.day, recoveringUntil: null });
    this.save();
    return plot;
  }

  harvest(plotId) {
    const plot = this.state.plots.find(item => item.id === plotId);
    if (!plot || this.plotPhase(plot) !== 'mature') throw new Error('La culture n’est pas encore mûre.');
    this.state.resources.materials += 2;
    Object.assign(plot, { status: 'empty', plantedDay: null, recoveringUntil: null });
    this.save();
    return plot;
  }

  repairPlot(plotId) {
    const plot = this.state.plots.find(item => item.id === plotId);
    if (!plot || plot.status !== 'damaged') throw new Error('Cette parcelle ne requiert pas de réparation.');
    this.spend({ energy: 4 });
    Object.assign(plot, { status: 'recovering', plantedDay: null, recoveringUntil: this.state.day + 1 });
    this.save();
    return plot;
  }

  advanceDay() {
    if (this.state.event.larvaeActive) throw new Error('Résolvez l’événement avant d’avancer.');
    this.state.day += 1;
    this.state.plots.forEach(plot => {
      if (plot.status === 'recovering' && this.state.day >= plot.recoveringUntil) {
        Object.assign(plot, { status: 'empty', plantedDay: null, recoveringUntil: null });
      }
    });
    if (this.state.day === 2 && !this.state.event.larvaeResolved) this.state.event.larvaeActive = true;
    this.save();
    return this.state.day;
  }

  resolveLarvae(choice) {
    if (!this.state.event.larvaeActive) throw new Error('Aucun événement à résoudre.');
    if (choice === 'treat') {
      this.spend({ energy: this.state.event.durableProtection ? 4 : 6 });
      this.state.event.outcome = 'Traitement immédiat appliqué. Aucune culture perdue.';
    } else if (choice === 'protect') {
      this.spend({ energy: 4, materials: 8 });
      this.state.event.durableProtection = true;
      this.state.event.outcome = 'Protection durable installée. Les prochaines interventions coûteront moins d’Énergie.';
    } else if (choice === 'accept') {
      const target = this.state.plots.find(plot => plot.status === 'planted') || this.state.plots[0];
      Object.assign(target, { status: 'damaged', plantedDay: null, recoveringUntil: null });
      this.state.event.outcome = 'La perte est contenue à une parcelle, désormais réparable pour 4 Énergie.';
    } else {
      throw new Error('Réponse inconnue.');
    }
    this.state.event.larvaeActive = false;
    this.state.event.larvaeResolved = true;
    this.save();
    return this.state.event.outcome;
  }

  build(key) {
    const definition = BUILDINGS[key];
    if (!definition || this.state.buildings[key]) throw new Error('Construction indisponible.');
    this.spend(definition);
    this.state.buildings[key] = true;
    this.save();
    return definition;
  }

  selectSector(key) {
    if (!['gate', 'tower', 'archives'].includes(key)) return;
    this.state.bastion.selectedSector = key;
    this.save();
  }

  repairBastion() {
    if (this.state.bastion.towerStable) throw new Error('La Tour météo est déjà stabilisée.');
    this.spend({ energy: 6, materials: 12 });
    this.state.bastion.integrity = 100;
    this.state.bastion.towerStable = true;
    this.save();
  }

  unlockArchives() {
    if (!this.state.bastion.towerStable || this.state.resources.reputation < 3) throw new Error('Il faut 3 Réputation et une Tour météo stable.');
    this.state.bastion.archivesUnlocked = true;
    this.save();
  }
}
