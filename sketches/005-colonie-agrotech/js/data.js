export const SOURCE_TASKS = Object.freeze([
  { id: 'task-1747108122-1', task: 'Ranger l’entrée', difficulty: 3, length: 2, priority: 6, domain: 'Maison', status: 'done', created: '2026-05-12' },
  { id: 'task-1747108122-2', task: 'Arroser les plantes', difficulty: 5, length: 3, priority: 5, domain: 'Maison', deadline: '2026-05-31', status: 'done', created: '2026-05-12' },
  { id: 'task-1747108122-3', task: 'Préparer les repas de la semaine', difficulty: 9, length: 9, priority: 8, domain: 'Professionnel', status: 'todo', created: '2026-05-12' },
  { id: 'task-1747108122-4', task: 'Nettoyer le réfrigérateur', difficulty: 7, length: 7, priority: 5, domain: 'Professionnel', status: 'done', created: '2026-05-12' },
  { id: 'task-1747108122-5', task: 'Réparer une poignée', difficulty: 2, length: 2, priority: 4, domain: 'Maison', status: 'todo', created: '2026-05-12' },
  { id: 'task-1747108122-6', task: 'Classer les documents', difficulty: 5, length: 7, priority: 5, domain: 'Professionnel', status: 'todo', created: '2026-05-12' },
  { id: 'task-1778643938', task: 'Vérifier la pression des pneus', difficulty: 2, length: 2, priority: 5, domain: 'Maison', status: 'done', created: '2026-05-12' },
  { id: 'task-1778886311-1', task: 'Planifier une sortie familiale', difficulty: 5, length: 5, priority: 5, domain: 'Véhicule', status: 'todo', created: '2026-05-15' },
  { id: 'task-1747708800-1', task: "Donner les vêtements inutilisés", difficulty: 2, length: 2, priority: 5, domain: 'Jardin', status: 'done', created: '2026-05-19' },
  { id: 'task-1747708800-2', task: 'Laver les fenêtres', difficulty: 3, length: 5, priority: 6, domain: 'Ferme', status: 'todo', created: '2026-05-19' },
  { id: 'task-1747708800-3', task: 'Entretenir le jardin', difficulty: 4, length: 8, priority: 7, domain: 'Ferme', status: 'done', created: '2026-05-19' },
  { id: 'task-1748296200-1', task: 'Vérifier les détecteurs de fumée', difficulty: 3, length: 3, priority: 7, domain: 'Jardin', status: 'done', created: '2026-05-27' },
  { id: 'task-1748296200-2', task: 'Organiser le garde-manger', difficulty: 2, length: 2, priority: 7, domain: 'Jardin', status: 'done', created: '2026-05-27' },
  { id: 'task-1748296200-3', task: "Prendre un rendez-vous", difficulty: 2, length: 2, priority: 6, domain: 'Jardin', status: 'done', created: '2026-05-27' },
  { id: 'task-1779979205-1', task: 'Nettoyer le véhicule', difficulty: 2, length: 1, priority: 6, domain: 'Professionnel', status: 'todo', created: '2026-05-28' },
  { id: 'task-1779979205-2', task: 'Réparer une clôture', difficulty: 2, length: 1, priority: 6, domain: 'Professionnel', status: 'todo', created: '2026-05-28' },
  { id: 'task-1781266134-1', task: 'Trier les photos', difficulty: 3, length: 2, priority: 6, domain: 'Maison', status: 'todo', created: '2026-06-12' },
  { id: 'task-1781266134-2', task: 'Préparer le recyclage', difficulty: 5, length: 4, priority: 7, domain: 'Maison', status: 'done', created: '2026-06-12' },
  { id: 'task-1781391139-1', task: 'Installer une étagère', difficulty: 5, length: 7, priority: 5, domain: 'Jardin', status: 'done', created: '2026-06-13' },
  { id: 'task-20260714-1', task: 'Faire l’inventaire des outils', difficulty: 3, length: 3, priority: 8, domain: 'Administratif', status: 'todo', created: '2026-07-14' },
  { id: 'task-20261003-1', task: 'Nettoyer la terrasse', difficulty: 7, length: 6, priority: 8, domain: 'Maison', status: 'todo', created: '2026-10-03' },
  { id: 'task-20261003-2', task: 'Comparer des protections courantes', difficulty: 8, length: 7, priority: 7, domain: 'Terrain', status: 'todo', created: '2026-10-03' },
  { id: 'task-20261003-3', task: 'Préparer les affaires scolaires', difficulty: 1, length: 1, priority: 5, domain: 'Maison', status: 'todo', created: '2026-10-03' },
  { id: 'task-20261003-4', task: "Planifier le budget mensuel", difficulty: 7, length: 5, priority: 7, domain: 'Maison', status: 'todo', created: '2026-10-03' },
  { id: 'task-20261003-5', task: 'Entretenir le vélo', difficulty: 4, length: 4, priority: 6, domain: 'Maison', status: 'todo', created: '2026-10-03' },
  { id: 'task-20261004-1', task: 'Réorganiser le rangement', difficulty: 5, length: 5, priority: 8, domain: 'Véhicule', status: 'todo', created: '2026-10-04' },
  { id: 'task-20261004-2', task: 'Faire le bilan de la semaine', difficulty: 6, length: 5, priority: 9, domain: 'Maison', status: 'todo', created: '2026-10-04' }
]);

export const INITIAL_STATE = Object.freeze({
  version: 1,
  day: 1,
  resources: { energy: 16, materials: 12, reputation: 0 },
  tasks: SOURCE_TASKS,
  mission: { taskId: null, startedAt: null },
  selectedTaskId: 'task-20260714-1',
  plots: [
    { id: 'plot-a', status: 'planted', plantedDay: 1, recoveringUntil: null },
    { id: 'plot-b', status: 'empty', plantedDay: null, recoveringUntil: null },
    { id: 'plot-c', status: 'empty', plantedDay: null, recoveringUntil: null }
  ],
  buildings: { greenhouse: false, recycler: false },
  bastion: {
    integrity: 72,
    towerStable: false,
    archivesUnlocked: false,
    selectedSector: 'gate'
  },
  event: {
    larvaeActive: false,
    larvaeResolved: false,
    durableProtection: false,
    outcome: null
  },
  bonuses: { taskAdded: false }
});

export const BUILDINGS = Object.freeze({
  greenhouse: { name: 'Serre hydroponique', description: 'Protège visuellement les futures cultures et étend la ferme.', energy: 12, materials: 28 },
  recycler: { name: 'Recycleur', description: 'Transforme l’atelier en circuit de matériaux fermé.', energy: 8, materials: 20 }
});

export const SECTORS = Object.freeze({
  gate: {
    name: 'Porte agricole',
    state: 'Opérationnelle',
    description: 'Le passage principal relie les parcelles au Bastion. Ses filtres retiennent la cendre lourde avant chaque convoi.',
    action: null
  },
  tower: {
    name: 'Tour météo',
    state: 'Instable',
    description: 'Le mât de lecture a perdu son alignement pendant la dernière tempête. Une réparation rétablit l’intégrité complète du Bastion.',
    action: 'repair'
  },
  archives: {
    name: 'Archives enfouies',
    state: 'Scellées',
    description: 'Une chambre sous la muraille émet un signal minéral. Elle s’ouvre à 3 Réputation, une fois la Tour météo stabilisée.',
    action: 'unlock'
  }
});
