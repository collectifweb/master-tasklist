// Passage d'une partie v1 à la v2 (migrateState). Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateState, createInitialState, completeQuest, remballerQuest, bilansPasses } from '../../core/index.js';
import { task, step } from './helpers.mjs';

const NOW = '2026-10-21T14:00:00Z'; // mercredi ; la semaine en cours commence le lundi 19 octobre

function deepFreeze(o) {
  if (o && typeof o === 'object') { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}

// Partie v1 de forme réelle, valeurs fictives.
const V1 = {
  version: 1, createdAt: '2026-10-01T14:00:00.000Z', startDay: '2026-10-01',
  resources: { energy: 23.4, materials: 41, confidence: 4 }, caps: { energy: 40, materials: 150 },
  lueur: { place: 12, champs: 30, atelier: 55, archives: 0, 'maison-commune': 0, relais: 0 }, filLibre: 7.5,
  lisiereDays: ['2026-10-06', '2026-10-07'], weeksHeld: [], daily: { day: '2026-10-20', quests: 1, lisiere: true },
  lastOpenDay: '2026-10-20', lastReturnDay: '2026-10-13', lastSeenDay: '2026-10-20',
  chapter: { number: 2, startDay: '2026-10-09', objectives: { 'ch2.tour': '2026-10-10' } },
  sectors: { place: { open: true, stage: 0 }, champs: { open: true, stage: 1 } },
  placements: [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }],
  plots: [{ id: 'parcelle-1', slot: 0, crop: 'courge', stage: 1 }],
  garden: { pantry: { courge: 2, patate: 0, ble: 0 }, reserve: 1, sown: {}, harvested: {}, reserved: 1, wateredDay: '2026-10-20' },
  avis: { current: null, history: [{ id: 'premier_gel', day: '2026-10-16', result: 'tenu' }], veils: [] },
  story: { seen: ['introduction'], day: '2026-10-20', count: 1 }, recentApplied: {},
  letters: { 'matin.01': '2026-10-20' },
  coteACote: { current: null, totals: [{ taskId: 'a', occurrence: 1, minutes: 25, capped: false, doneOn: '2026-10-06' }] },
  champInconnu: { garde: 'moi' },
};

// Gain de quête écrit en v1 (Lueur au secteur, Fil libre).
const v1Reward = (id, day, sector, occ = 1) => ({
  key: `reward:${id}:${occ}`, at: `${day}T15:00:00.000Z`, day, type: 'reward', taskId: id, occurrence: occ,
  pe: 8, energy: 2.4, materials: 4, lueur: { sector, amount: 6 }, filLibre: 2,
});

const LEDGER = [
  v1Reward('a', '2026-10-06', 'champs'),
  v1Reward('b', '2026-10-07', 'archives'),
  v1Reward('c', '2026-10-07', 'atelier'),
  { key: 'reverse:c:1', at: '2026-10-07T16:00:00.000Z', day: '2026-10-07', type: 'reverse', taskId: 'c', occurrence: 1, reverses: ['reward:c:1'], pe: -8, energy: -2.4, materials: -4, lueur: { sector: 'atelier', amount: -6 }, filLibre: -2 },
  { key: 'step:d:1:s1', at: '2026-10-08T15:00:00.000Z', day: '2026-10-08', type: 'step', taskId: 'd', occurrence: 1, stepId: 's1', pe: 2, energy: 0.6, materials: 1, lueur: { sector: 'relais', amount: 1.5 }, filLibre: 0.5 },
  v1Reward('e', '2026-10-13', 'relais', 1),
  v1Reward('e', '2026-10-14', 'relais', 2),
  v1Reward('f', '2026-10-20', 'place'), // semaine en cours : compte au quartier, pas encore dans un bilan
  { key: 'bonus:ouverture:2026-10-06', at: '2026-10-06T13:00:00.000Z', day: '2026-10-06', type: 'bonus', bonus: 'ouverture', pe: 0, energy: 1, materials: 0, lueur: { sector: 'place', amount: 0 }, filLibre: 0 },
  { key: 'avis:premier_gel', at: '2026-10-16T13:00:00.000Z', day: '2026-10-16', type: 'avis', avis: 'premier_gel', pe: 0, energy: 0, materials: 15, lueur: { sector: 'champs', amount: 0 }, filLibre: 0 },
  { key: 'reward:g:1' }, // entrée minimale (gain de plus de 60 jours) : la clé seule
  { key: 'reward:disparue:1' }, // entrée minimale d'une quête supprimée depuis
];

const TASKS = [
  task({ id: 'a', domain: 'Jardin', length: 2, status: 'done' }),
  task({ id: 'b', domain: 'Administratif', length: 3, status: 'done' }),
  task({ id: 'c', domain: 'Maison' }), // remballée : de nouveau à faire
  task({ id: 'd', domain: 'Véhicule', status: 'done' }), // terminée hors de l'app, mais une étape est au registre
  task({ id: 'e', domain: 'Véhicule', length: 1, recurrence: { every: 'week', interval: 1 }, occurrence: 3 }),
  task({ id: 'f', domain: '', status: 'done' }),
  task({ id: 'g', domain: 'Enfants', status: 'done' }),
  task({ id: 'h', domain: 'Maison', status: 'done' }), // terminée avant l'app : aucune entrée au registre
  task({ id: 'i', domain: 'Professionnel', status: 'done' }), // idem
  task({ id: 'j', domain: 'Terrain' }), // à faire, jamais au registre
  task({ id: 'k', domain: 'Maison', status: 'archived' }),
];

const ctx = () => ({ tasks: deepFreeze(structuredClone(TASKS)), ledger: deepFreeze(structuredClone(LEDGER)) });
const migrate = () => migrateState(deepFreeze(structuredClone(V1)), NOW, ctx());

test('partie v1 → v2 : stock de départ, 0 habitant, plus rien de la v1', () => {
  const g = migrate();
  assert.equal(g.version, 2);
  assert.deepEqual(g.resources, { energy: 10, materials: 20, food: 5 });
  assert.equal(g.habitants, 0);
  assert.deepEqual([g.batiments, g.parcelles, g.premiersPas], [[], [], {}]);
  for (const k of ['caps', 'lueur', 'filLibre', 'lisiereDays', 'weeksHeld', 'daily', 'chapter', 'story', 'sectors', 'placements', 'plots', 'garden', 'avis', 'recentApplied']) {
    assert.equal(k in g, false, k);
  }
});

test('partie v1 → v2 : relevé du temps, jours vus, lettres et clés inconnues gardés', () => {
  const g = migrate();
  for (const k of ['createdAt', 'startDay', 'lastOpenDay', 'lastReturnDay', 'lastSeenDay', 'letters', 'coteACote', 'champInconnu']) {
    assert.deepEqual(g[k], V1[k], k);
  }
});

test('tâches par quartier recomptées depuis le registre : remballées exclues, anciens secteurs traduits', () => {
  // a → Champs ; b, i → Mairie ; g → École (entrée minimale : quartier de la quête) ; e (2 occurrences) → Garage ;
  // f et la quête disparue → Place ; h → Atelier. c est remballée ; d n'a qu'une étape au registre ; j et k ne sont pas terminées.
  assert.deepEqual(migrate().quartiers, { champs: 1, atelier: 1, mairie: 2, ecole: 1, garage: 2, place: 2 });
});

test('décision d’Alex : une tâche terminée sans aucune entrée au registre compte une fois, sans Énergie ni Matériaux', () => {
  const tasks = [
    task({ id: 'x1', domain: 'Maison', status: 'done' }), task({ id: 'x2', domain: 'Ferme', status: 'done' }),
    task({ id: 'x3', domain: 'Maison' }), task({ id: 'x4', domain: 'Maison', status: 'archived' }),
    task({ id: 'x5', domain: 'Maison', status: 'done' }), // payée, remballée puis refaite (0 gain) : ne compte pas
  ];
  const ledger = [
    { ...v1Reward('x5', '2026-10-06', 'atelier') },
    { key: 'reverse:x5:1', at: '2026-10-06T16:00:00.000Z', day: '2026-10-06', type: 'reverse', taskId: 'x5', occurrence: 1, pe: -8, energy: -2.4, materials: -4, lueur: { sector: 'atelier', amount: -6 }, filLibre: -2 },
  ];
  const g = migrateState(structuredClone(V1), NOW, { tasks, ledger });
  assert.deepEqual(g.quartiers, { champs: 1, atelier: 1, mairie: 0, ecole: 0, garage: 0, place: 0 });
  assert.deepEqual(g.resources, { energy: 10, materials: 20, food: 5 });
  // une partie absente (jamais enregistrée) suit la même règle
  assert.deepEqual(migrateState(null, NOW, { tasks, ledger }).quartiers, g.quartiers);
});

test('la migration lit la liste et le registre sans jamais les modifier, et ne produit aucune opération', () => {
  const c = ctx();
  const before = JSON.stringify([c.tasks, c.ledger]);
  const g = migrateState(deepFreeze(structuredClone(V1)), NOW, c); // gelés : toute écriture lancerait une erreur
  assert.equal(JSON.stringify([c.tasks, c.ledger]), before);
  assert.deepEqual(Object.keys(g).filter((k) => ['tasks', 'ops', 'entries'].includes(k)), []);
  assert.equal(JSON.stringify(g).includes('Changer l’ampoule'), false); // aucun titre de tâche recopié dans la partie
});

test('idempotente : une partie convertie ne bouge plus, même plus tard et avec un registre qui a grandi', () => {
  const once = migrate();
  assert.deepEqual(migrate(), once); // même entrée, même résultat
  assert.deepEqual(migrateState(structuredClone(once), NOW, ctx()), once);
  const plusTard = { tasks: TASKS, ledger: [...LEDGER, v1Reward('j', '2026-10-22', 'champs')] };
  assert.deepEqual(migrateState(structuredClone(once), '2026-12-01T14:00:00Z', plusTard), once);
  // sans liste ni registre, une partie v1 repart à zéro partout (l'appelant doit les fournir)
  assert.deepEqual(migrateState(structuredClone(V1), NOW).quartiers, createInitialState(NOW).quartiers);
});

test('bilans recomptés depuis le registre : une entrée par semaine finie, remballées exclues', () => {
  const { bilans } = migrate();
  assert.deepEqual(bilans.map((b) => [b.semaine.start, b.semaine.end, b.quetes, b.joursTravailles, b.domaines.map((d) => [d.quartier, d.quetes])]), [
    ['2026-10-05', '2026-10-11', 2, 2, [['mairie', 1], ['champs', 1]]],
    ['2026-10-12', '2026-10-18', 2, 2, [['garage', 2]]],
  ]);
  const [s1] = bilans;
  assert.equal(s1.heures, 0.8); // 15 + 30 min estimées
  assert.deepEqual(Object.keys(s1).sort(), ['domaines', 'heures', 'joursTravailles', 'quetes', 'semaine', 'tenue']);
  assert.deepEqual(bilans.map((b) => b.tenue), [false, false]); // aucune semaine tenue payée en v1
  assert.deepEqual(bilansPasses([], createInitialState(NOW), [], NOW), []);
});

test('après la migration, Remballer une quête payée en v1 retire bien la tâche de son quartier', () => {
  const at = '2026-10-21T10:00:00.000Z';
  const ledger = [{ ...v1Reward('b', '2026-10-21', 'archives'), at }];
  const tasks = [task({ id: 'b', domain: 'Administratif', status: 'done', doneAt: at })];
  const game = migrateState(structuredClone(V1), NOW, { tasks, ledger });
  assert.equal(game.quartiers.mairie, 1);
  const s = step({ tasks, game, ledger }, remballerQuest, { id: 'b' }, NOW);
  assert.equal(s.world.game.quartiers.mairie, 0);
  assert.equal(s.r.entries[0].quartier, 'mairie');
  // et la partie continue normalement
  assert.equal(step(s.world, completeQuest, { id: 'b' }, NOW).world.game.quartiers.mairie, 0); // déjà payée : 0
});
