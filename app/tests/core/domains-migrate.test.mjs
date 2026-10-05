import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText, DOMAINS, SECTORS, SECTOR_IDS, PLACE_ID, groupedDomain, sectorOf, sectorOfTask, sectorInfo,
  normalizeTask, normalizeTasks, clampScale, STATUSES,
} from '../../core/index.js';
import { T0, task } from './helpers.mjs';

test('normalizeText retire accents, casse et apostrophes', () => {
  assert.equal(normalizeText('  Véhicule d’Été '), 'vehicule d ete');
  assert.equal(normalizeText(null), '');
});

test('domaines regroupés : Jardin et Ferme → Champs ; Professionnel → Archives', () => {
  assert.equal(sectorOf('Jardin'), 'champs');
  assert.equal(sectorOf('Ferme'), 'champs');
  assert.equal(groupedDomain('Jardin'), 'Terrain');
  assert.equal(sectorOf('Professionnel'), 'archives');
  assert.equal(groupedDomain('professionnel'), 'Administratif');
  assert.equal(SECTORS[sectorOf('Jardin')].name, 'Champs');
  assert.equal(SECTORS[sectorOf('Professionnel')].name, 'Archives');
});

test('domaines regroupés : vide ou inconnu → Place du Bastion', () => {
  for (const d of ['', null, undefined, 'Personnel', 'Autre']) {
    assert.equal(sectorOf(d), PLACE_ID);
    assert.equal(sectorInfo(sectorOf(d)).name, 'Place du Bastion');
  }
});

test('les cinq domaines vont à leur secteur', () => {
  assert.deepEqual(DOMAINS.map(sectorOf), ['champs', 'atelier', 'archives', 'maison-commune', 'relais']);
  assert.equal(sectorOf('VEHICULE'), 'relais');
  assert.equal(SECTOR_IDS.length, 6);
});

test('le regroupement ne réécrit pas le domaine dans la tâche', () => {
  const t = task({ domain: 'Jardin' });
  const copy = structuredClone(t);
  assert.equal(sectorOfTask(t), 'champs');
  assert.deepEqual(t, copy);
  assert.equal(normalizeTask(t, T0).domain, 'Jardin');
});

test('sectorInfo retombe sur la Place pour un identifiant inconnu', () => {
  assert.equal(sectorInfo('nimporte').id, 'place');
});

test('clampScale borne à 1-10 et arrondit', () => {
  assert.equal(clampScale(0), 1);
  assert.equal(clampScale(14), 10);
  assert.equal(clampScale(4.6), 5);
  assert.equal(clampScale(undefined), 5);
  assert.equal(clampScale('abc', 3), 3);
});

test('la migration ne perd aucun champ', () => {
  const raw = {
    id: 'a1', task: 'Laver l’auto', domain: 'Véhicule', difficulty: 2, length: 3, priority: 7,
    status: 'archived', created: '2026-09-01', deadline: '2026-10-20', notes: 'Une note',
    champInconnu: { a: [1, 2, 3] }, subtasks: ['x'], completedAt: '2026-09-02T10:00:00Z', updatedAt: 'z',
    startedAt: '2026-09-02T09:00:00Z', frozen: { priority: 7, length: 3, difficulty: 2, at: 'x' },
    steps: [{ id: 's1', label: 'a', done: true, extra: 1 }], recurrence: { every: 'week', interval: 2 },
    occurrence: 4, alreadyDone: true, deadlineSetAt: '2026-09-05T10:00:00Z', doneAt: null,
  };
  const out = normalizeTask(raw, T0);
  assert.deepEqual(out, raw);
  assert.equal(out.status, 'archived');
  assert.equal(out.deadline, '2026-10-20');
  assert.equal(out.notes, 'Une note');
  // normaliser deux fois ne change plus rien
  assert.deepEqual(normalizeTask(out, T0), out);
});

test('la migration borne les valeurs, complète id, created et statut, sans modifier l’entrée', () => {
  const raw = { task: 'Sans id', difficulty: 99, length: 0, priority: 'x', status: 'bizarre', zzz: 1 };
  const frozen = structuredClone(raw);
  const out = normalizeTask(raw, T0, 3);
  assert.deepEqual(raw, frozen);
  assert.equal(out.difficulty, 10);
  assert.equal(out.length, 1);
  assert.equal(out.priority, 5);
  assert.equal(out.status, 'todo');
  assert.equal(out.created, '2026-10-06');
  assert.match(out.id, /^m-/);
  assert.equal(out.zzz, 1);
  assert.ok(STATUSES.includes(out.status));
});

test('normalizeTasks : identifiants en double départagés, non-tableau → []', () => {
  const out = normalizeTasks([{ id: 'x', task: 'A' }, { id: 'x', task: 'B' }, { id: 'x', task: 'C' }], T0);
  assert.deepEqual(out.map((t) => t.id), ['x', 'x-2', 'x-3']);
  assert.deepEqual(normalizeTasks(null, T0), []);
  const sans = normalizeTasks([{ task: 'Pareil', created: '2026-10-01' }, { task: 'Pareil', created: '2026-10-01' }], T0);
  assert.notEqual(sans[0].id, sans[1].id);
});
