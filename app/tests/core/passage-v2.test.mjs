// Lot 3 (migration sûre), côté cœur : file hors ligne de la v1 convertie, Remballer d'un gain v1, enregistrement de
// la partie convertie, lettre de passage. Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  migrateState, createInitialState, isV1State, convertQueueV1, withoutRetiredGestures, migrateGame, isV1Entry, remballerQuest, completeQuest,
  toggleStep, passageLetter, markLetterShown,
} from '../../core/index.js';
import { task, step } from './helpers.mjs';

const NOW = '2026-10-21T14:00:00Z';
const V1 = {
  version: 1, createdAt: '2026-10-01T14:00:00.000Z', startDay: '2026-10-01',
  resources: { energy: 23.4, materials: 41, confidence: 4 }, lueur: { place: 12, archives: 30 }, filLibre: 7.5,
  letters: { 'matin.01': '2026-10-20' },
};
// entrées telles que la v1 les écrivait : Lueur au secteur et Fil libre, jamais de `quartier`
const v1Reward = (id, at, sector, occ = 1) => ({
  key: `reward:${id}:${occ}`, at, day: at.slice(0, 10), type: 'reward', taskId: id, occurrence: occ,
  pe: 8, energy: 2.4, materials: 4, lueur: { sector, amount: 6 }, filLibre: 2,
});
const v1Step = (id, stepId, at, sector) => ({
  key: `step:${id}:1:${stepId}`, at, day: at.slice(0, 10), type: 'step', taskId: id, occurrence: 1, stepId,
  pe: 2, energy: 0.6, materials: 1, lueur: { sector, amount: 1.5 }, filLibre: 0.5,
});
const V2_ACTIONS = new Set(['createQuest', 'updateQuest', 'startQuest', 'pauseQuest', 'addStep', 'removeStep', 'toggleStep',
  'completeQuest', 'reopenQuest', 'remballerQuest', 'archiveQuest', 'unarchiveQuest', 'deleteQuest', 'claimBonus', 'openApp',
  'advanceTime', 'markLetterShown', 'migrateGame']);
const known = (name) => V2_ACTIONS.has(name);

// ───────── Gain v1 reconnu à son format ─────────

test('gain v1 : reconnu au champ filLibre (toutes les entrées v1 le portent, aucune entrée v2)', () => {
  assert.equal(isV1Entry(v1Reward('a', '2026-10-21T10:00:00.000Z', 'place')), true);
  assert.equal(isV1Entry({ key: 'bonus:ouverture:2026-10-20', type: 'bonus', bonus: 'ouverture', energy: 1, lueur: { sector: 'place', amount: 0 }, filLibre: 0 }), true);
  // la v2 n'écrit jamais filLibre, même sur un bonus sans quartier (« Bon fil »)
  const w = step({ tasks: [task({ id: 'b' })], game: createInitialState(NOW), ledger: [] }, completeQuest, { id: 'b' }, NOW);
  assert.ok(w.r.entries.length >= 1);
  for (const e of w.r.entries) assert.equal(isV1Entry(e), false, e.key);
  assert.equal(isV1Entry({ key: 'bonus:bon-fil:2026-10-21', type: 'bonus', bonus: 'bon-fil', energy: 2 }), false);
  assert.equal(isV1Entry({ key: 'reward:x:1' }), false); // entrée minimale : aucun montant, jamais remballable
  assert.equal(isV1Entry(null), false);
});

// ───────── Remballer après la bascule ─────────

test('remballer dans les 24 h une quête payée en v1 : la tâche quitte son quartier, Énergie et Matériaux restent', () => {
  const at = '2026-10-21T10:00:00.000Z';
  const ledger = [v1Reward('b', at, 'archives')];
  const tasks = [task({ id: 'b', domain: 'Administratif', status: 'done', doneAt: at })];
  const game = migrateState(structuredClone(V1), NOW, { tasks, ledger });
  assert.deepEqual([game.quartiers.mairie, game.resources.energy, game.resources.materials], [1, 10, 20]);
  const s = step({ tasks, game, ledger }, remballerQuest, { id: 'b' }, NOW);
  const e = s.r.entries[0];
  assert.equal(e.type, 'reverse');
  assert.ok(e.energy === 0 && e.materials === 0, `rien à reprendre au stock v2 (${e.energy}, ${e.materials})`);
  assert.equal(e.pe, -8); // les points d'effort du jour restent annulés comme avant
  assert.equal(e.quartier, 'mairie');
  assert.equal(s.world.game.quartiers.mairie, 0);
  assert.deepEqual(s.world.game.resources, game.resources);
  assert.equal(s.world.tasks[0].status, 'todo');
  // refaite ensuite : déjà payée en v1, elle ne rapporte rien
  const again = step(s.world, completeQuest, { id: 'b' }, NOW);
  assert.deepEqual(again.world.game.resources, game.resources);
});

test('remballer un gain mêlé (étape cochée en v1, quête finie en v2) : seule la part v2 est reprise', () => {
  const tasks = [task({ id: 'c', domain: 'Maison', steps: [{ id: 's1', label: 'Première étape', done: true }, { id: 's2', label: 'Deuxième étape', done: false }] })];
  const ledger = [v1Step('c', 's1', '2026-10-21T09:00:00.000Z', 'atelier')];
  const game = migrateState(structuredClone(V1), NOW, { tasks, ledger });
  const done = step({ tasks, game, ledger }, completeQuest, { id: 'c' }, NOW);
  const paid = done.r.entries.filter((x) => x.type === 'reward' || x.type === 'bonus');
  const gained = { energy: paid.reduce((s, x) => s + x.energy, 0), materials: paid.reduce((s, x) => s + x.materials, 0) };
  assert.ok(gained.energy > 0);
  const back = step(done.world, remballerQuest, { id: 'c' }, '2026-10-21T15:00:00Z');
  const e = back.r.entries[0];
  assert.ok(Math.abs(e.energy + gained.energy) < 0.011, `${e.energy} contre ${gained.energy}`);
  assert.ok(Math.abs(e.materials + gained.materials) < 0.011);
  assert.deepEqual(back.world.game.resources, game.resources); // l'étape v1 n'avait rien versé : retour au stock d'avant
  assert.equal(back.world.game.quartiers.atelier, 0);
});

test('remballer une quête payée en v2 reprend toujours ses gains', () => {
  const tasks = [task({ id: 'd' })];
  const done = step({ tasks, game: createInitialState(NOW), ledger: [] }, completeQuest, { id: 'd' }, NOW);
  assert.ok(done.world.game.resources.energy > 10);
  const back = step(done.world, remballerQuest, { id: 'd' }, NOW);
  assert.equal(back.world.game.resources.energy, 10);
  assert.equal(back.world.game.resources.materials, 20);
});

// ───────── Partie convertie, puis enregistrée ─────────

test('migrateState note l’instant de la conversion sur une partie v1, jamais sur une partie neuve ou déjà en v2', () => {
  assert.equal(migrateState(structuredClone(V1), NOW).migratedAt, '2026-10-21T14:00:00.000Z');
  assert.equal('migratedAt' in migrateState(null, NOW), false);
  assert.equal('migratedAt' in migrateState(createInitialState(NOW), NOW), false);
  assert.equal('migratedAt' in createInitialState(NOW), false);
  // une partie déjà convertie garde son instant de conversion
  const once = migrateState(structuredClone(V1), NOW);
  assert.equal(migrateState(structuredClone(once), '2026-12-01T14:00:00Z').migratedAt, once.migratedAt);
  assert.equal(isV1State(V1), true);
  assert.equal(isV1State({ resources: {} }), true); // sans version : v1
  assert.equal(isV1State(once), false);
  assert.equal(isV1State(null), false);
});

test('migrateGame (tenue) : enregistre la partie convertie d’une partie v1, sans toucher aux tâches ni au registre', () => {
  const tasks = [task({ id: 'a', domain: 'Jardin', status: 'done' }), task({ id: 'b' })];
  const ledger = [v1Reward('a', '2026-10-20T15:00:00.000Z', 'champs')];
  const frozen = JSON.stringify([tasks, ledger]);
  const r = migrateGame(tasks, structuredClone(V1), ledger, { gameRevision: 'rev-v1' }, NOW);
  assert.deepEqual(r.ops.map((o) => o.type), ['game.set']);
  const [op] = r.ops;
  assert.equal(op.baseGameRevision, 'rev-v1');
  assert.equal(op.game.version, 2);
  assert.equal(op.game.migratedAt, '2026-10-21T14:00:00.000Z');
  assert.equal(op.game.quartiers.champs, 1);
  assert.deepEqual(r.entries, []);
  assert.equal(JSON.stringify([tasks, ledger]), frozen);
  // partie déjà en v2 ou absente : rien à faire
  assert.deepEqual(migrateGame(tasks, op.game, ledger, { gameRevision: 'rev-v2' }, NOW).ops, []);
  assert.deepEqual(migrateGame(tasks, null, ledger, { gameRevision: null }, NOW).ops, []);
});

// ───────── File d'attente hors ligne de la v1 ─────────

test('file v1 convertie : gestes sur les quêtes gardés sans leur corps v1, gestes de jeu v1 écartés et nommés', () => {
  const at = '2026-10-20T15:00:00.000Z';
  const body = { opId: 'o2', ops: [{ type: 'game.set', game: { version: 1 }, baseGameRevision: 'x' }] };
  const old = [
    { opId: 'o1', name: 'createQuest', params: { task: 'Quête fictive', domain: 'Maison' }, at },
    { opId: 'o2', name: 'completeQuest', params: { id: 'a' }, at, body, tries: 2, conflicts: 1, dups: 1 },
    { opId: 'o3', name: 'souffler', params: {}, at },
    { opId: 'o4', name: 'remballerQuest', params: { id: 'a' }, at },
    { opId: 'o5', name: 'build', params: { model: 'tunnel' }, at },
    { opId: 'o6', name: 'markStorySeen', params: { ids: ['x'] }, at }, // tenue v1 : écartée sans rien dire
    { opId: 'o7', name: 'openApp', params: {}, at },
    { opId: 'o8', name: 'souffler', params: {}, at },
    null, 'abîmée', { name: 'completeQuest' }, { opId: 'o9', name: 'constructor', at },
  ];
  const { queue, dropped } = convertQueueV1(old, known);
  assert.deepEqual(queue.map((e) => e.opId), ['o1', 'o2', 'o4', 'o7']);
  assert.deepEqual(queue[1], { opId: 'o2', name: 'completeQuest', params: { id: 'a' }, at, v1: true }); // corps et compteurs jetés
  assert.ok(queue.every((e) => e.v1 === true && !('body' in e)));
  assert.deepEqual(dropped, ['souffler', 'build', 'souffler']);
  assert.deepEqual(convertQueueV1('pas une file', known), { queue: [], dropped: [] });
  assert.deepEqual(convertQueueV1(null, known), { queue: [], dropped: [] });
});

test('file v1 convertie : un « Fait » rejoué par le cœur v2 paie dans le format v2, au quartier', () => {
  const tasks = [task({ id: 'a', domain: 'Jardin' })];
  const { queue } = convertQueueV1([{ opId: 'o1', name: 'completeQuest', params: { id: 'a' }, at: '2026-10-20T15:00:00.000Z' }], known);
  const game = migrateState(structuredClone(V1), NOW, { tasks, ledger: [] });
  const e = queue[0];
  const r = completeQuest(tasks, game, [], { ...e.params, gameRevision: 'rev' }, new Date(e.at));
  const reward = r.entries.find((x) => x.type === 'reward');
  assert.equal(reward.quartier, 'champs');
  assert.equal(isV1Entry(reward), false);
  assert.equal(r.game.quartiers.champs, 1);
});

// ───────── Lettre de passage ─────────

const LETTRES = {
  signature: 'fanal',
  passage: [{ id: 'passage.v2', texte: ['Allô, {prenom}.', 'Petit changement au village.'] }],
  matin: [{ id: 'matin.01', texte: ['Bon matin.'] }],
};

test('lettre de passage : à une partie convertie, une seule fois ; jamais à une partie neuve', () => {
  const migrated = migrateState(structuredClone(V1), NOW);
  const l = passageLetter(LETTRES, migrated, { prenom: 'Sam' });
  assert.deepEqual(l, { id: 'passage.v2', kind: 'passage', lignes: ['Allô, Sam.', 'Petit changement au village.'], questId: null, seen: false });
  assert.deepEqual(passageLetter(LETTRES, migrated).lignes[0], 'Allô.'); // sans prénom
  assert.equal(passageLetter(LETTRES, createInitialState(NOW)), null);
  assert.equal(passageLetter(LETTRES, migrateState(null, NOW)), null);
  assert.equal(passageLetter({ matin: LETTRES.matin }, migrated), null); // textes sans lettre de passage
  // montrée : plus jamais, même un autre jour
  const shown = markLetterShown([], migrated, [], { id: l.id, gameRevision: 'r' }, NOW).game;
  assert.equal(passageLetter(LETTRES, shown), null);
  assert.equal(passageLetter(LETTRES, migrateState(structuredClone(shown), '2026-11-02T14:00:00Z')), null);
});

test('le texte de la lettre de passage existe, sans gabarit autre que le prénom', async () => {
  const { readFile } = await import('node:fs/promises');
  const lettres = JSON.parse(await readFile(new URL('../../content/fr-CA/lettres.json', import.meta.url), 'utf8'));
  const l = passageLetter(lettres, migrateState(structuredClone(V1), NOW));
  assert.ok(l && l.lignes.length >= 3, 'lettre de passage dans content/fr-CA/lettres.json');
  const text = l.lignes.join(' ');
  for (const mot of ['Énergie', 'Matériaux', 'Nourriture', 'Habitants', 'quartier']) assert.ok(text.includes(mot), mot);
  assert.equal(/[{}]/.test(text), false);
});

test('« Je m’y mets » retiré : startQuest et pauseQuest en file sont écartés sans message, le reste est gardé', () => {
  const at = '2026-10-06T14:00:00.000Z';
  const file = [
    { opId: 'a1', name: 'startQuest', params: { id: 'a' }, at },
    { opId: 'a2', name: 'completeQuest', params: { id: 'a' }, at },
    { opId: 'a3', name: 'pauseQuest', params: { id: 'a' }, at },
    null, 'abîmée',
  ];
  assert.deepEqual(withoutRetiredGestures(file).filter((e) => e && typeof e === 'object').map((e) => e.opId), ['a2']);
  assert.deepEqual(withoutRetiredGestures('pas une file'), []);
  // file de la v1 : ces noms n'existent plus, ils sont écartés sans aller dans la liste des gestes nommés au joueur
  const known = (n) => n === 'completeQuest';
  assert.deepEqual(convertQueueV1(file, known).dropped, []);
  assert.deepEqual(convertQueueV1(file, known).queue.map((e) => e.opId), ['a2']);
});
