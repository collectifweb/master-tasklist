import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cote, coteBreakdown, urgency, ageBonus, taskAgeDays, estimatedMinutes, durationLabel,
  SORTS, sortTasks, orderByCote, filterTasks, listQuests, topCards, why,
} from '../../core/index.js';
import { T0, task } from './helpers.mjs';

// T0 = mardi 6 octobre 2026, 10 h à Montréal.

test('Cote : « Sortir le bac » ce soir, P7 L1 D1 → 82', () => {
  const t = task({ priority: 7, length: 1, difficulty: 1, deadline: '2026-10-06', created: '2026-10-06' });
  assert.equal(cote(t, T0), 82);
});

test('Cote : pneus dans 8 jours, P9 L1 D2 → 79', () => {
  const t = task({ priority: 9, length: 1, difficulty: 2, deadline: '2026-10-14', created: '2026-10-06' });
  assert.equal(cote(t, T0), 79);
});

test('Cote plafonnée à 100', () => {
  const t = task({ priority: 10, length: 1, difficulty: 1, deadline: '2026-09-01', created: '2026-01-01' });
  assert.equal(cote(t, T0), 100);
});

test('urgence : 25 si dépassée, 0 au-delà de 14 jours, dégressive entre les deux', () => {
  assert.equal(urgency(task({ deadline: '2026-10-01' }), T0), 25);
  assert.equal(urgency(task({ deadline: '2026-10-06' }), T0), 20);
  assert.equal(urgency(task({ deadline: '2026-10-13' }), T0), 10);
  assert.equal(urgency(task({ deadline: '2026-10-20' }), T0), 0);
  assert.equal(urgency(task({ deadline: '2026-10-21' }), T0), 0);
  assert.equal(urgency(task({ deadline: null }), T0), 0);
});

test('ancienneté : âge / 14 jours, au plus 5 ; la récurrence repart de l’occurrence', () => {
  assert.equal(taskAgeDays(task({ created: '2026-09-22' }), T0), 14);
  assert.equal(ageBonus(task({ created: '2026-09-22' }), T0), 1);
  assert.equal(ageBonus(task({ created: '2025-01-01' }), T0), 5);
  assert.equal(taskAgeDays(task({ created: '2025-01-01', occurrenceSince: '2026-10-04' }), T0), 2);
  assert.equal(taskAgeDays(task({ created: '2027-01-01' }), T0), 0);
});

test('coteBreakdown détaille les cinq termes', () => {
  const b = coteBreakdown(task({ priority: 6, length: 4, difficulty: 5 }), T0);
  assert.equal(b.priority, 27);
  assert.equal(b.length, 14);
  assert.equal(b.difficulty, 6);
  assert.equal(b.urgency, 0);
  assert.equal(b.total, 47);
});

test('durée estimée : L1 5, L2 15, L3 30, L4 45, L5 60, L6 120, L7 180, L8+ 240', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 10].map(estimatedMinutes), [5, 15, 30, 45, 60, 120, 180, 240, 240]);
  assert.equal(durationLabel(2), '15 min');
  assert.equal(durationLabel(6), '2 h');
});

test('un ancien champ startedAt ne remonte plus la quête en tête du tri par Cote', () => {
  const a = task({ id: 'a', priority: 10, length: 1, difficulty: 1 });
  const b = task({ id: 'b', priority: 1, length: 10, difficulty: 10, startedAt: T0 });
  assert.deepEqual(orderByCote([a, b], T0).map((t) => t.id), ['a', 'b']);
});

test('une quête de priorité 8 ou plus est toujours dans les 3 premières', () => {
  // cinq quêtes en retard à forte Cote, priorité 3 ; une quête P8 longue et difficile, loin derrière
  const urgentes = [1, 2, 3, 4, 5].map((i) => task({ id: 'u' + i, priority: 3, length: 1, difficulty: 1, deadline: '2026-09-20' }));
  const grosse = task({ id: 'g', priority: 8, length: 10, difficulty: 10 });
  assert.ok(cote(grosse, T0) < cote(urgentes[0], T0));
  const ordre = orderByCote([...urgentes, grosse], T0).map((t) => t.id);
  assert.ok(ordre.indexOf('g') <= 2, 'rang : ' + ordre.indexOf('g'));
  // même chose quand elle est seule d’une pile de quêtes très faciles, dans n’importe quel ordre d’entrée
  const ordre2 = orderByCote([grosse, ...urgentes].reverse(), T0).map((t) => t.id);
  assert.ok(ordre2.indexOf('g') <= 2);
  // et la liste complète est conservée
  assert.equal(new Set(ordre).size, 6);
});

test('les sept tris existent et trient', () => {
  assert.equal(SORTS.length, 7);
  const a = task({ id: 'a', priority: 2, length: 9, difficulty: 8, created: '2026-08-01', deadline: '2026-10-30' });
  const b = task({ id: 'b', priority: 9, length: 1, difficulty: 2, created: '2026-10-01', deadline: '2026-10-10' });
  const c = task({ id: 'c', priority: 5, length: 5, difficulty: 5, created: '2026-09-01' });
  const ids = (s) => sortTasks([a, b, c], s, T0).map((t) => t.id).join('');
  assert.equal(ids('cote'), 'bca');
  assert.equal(ids('priorite'), 'bca');
  assert.equal(ids('echeance'), 'bac');
  assert.equal(ids('courtes'), 'bca');
  assert.equal(ids('faciles'), 'bca');
  assert.equal(ids('anciennes'), 'acb');
  assert.equal(ids('recentes'), 'bca');
  assert.equal(sortTasks([a, b, c], undefined, T0).map((t) => t.id).join(''), 'bca');
  assert.throws(() => sortTasks([a], 'nimporte', T0));
});

test('filtres : 15 min, peu d’énergie, cette semaine, quartier, recherche, statut', () => {
  const ts = [
    task({ id: 'a', length: 2, difficulty: 2, domain: 'Maison', task: 'Changer l’ampoule', deadline: '2026-10-11' }),
    task({ id: 'b', length: 3, difficulty: 4, domain: 'Jardin', task: 'Tailler la haie', deadline: '2026-10-12' }),
    task({ id: 'c', length: 1, difficulty: 1, domain: '', task: 'Appeler le plombier', notes: 'Pour la fuite du robinet', deadline: '2026-09-30' }),
    task({ id: 'd', status: 'done', task: 'Vieille quête' }),
    task({ id: 'e', status: 'archived', task: 'Rangée' }),
  ];
  const ids = (f) => filterTasks(ts, f, T0).map((t) => t.id).join('');
  assert.equal(ids({}), 'abc');
  assert.equal(ids({ quick: true }), 'ac');
  assert.equal(ids({ lowEnergy: true }), 'ac');
  assert.equal(ids({ thisWeek: true }), 'ac'); // dimanche 11 octobre inclus, retards compris, pas le 12
  assert.equal(ids({ quartier: 'champs' }), 'b');
  assert.equal(ids({ quartier: 'place' }), 'c');
  assert.equal(ids({ search: 'AMPOULE' }), 'a');
  assert.equal(ids({ search: 'fuite' }), 'c');
  assert.equal(ids({ search: 'élaguer' }), '');
  assert.equal(ids({ status: 'done' }), 'd');
  assert.equal(ids({ status: 'all' }), 'abcde');
});

test('listQuests filtre puis trie', () => {
  const ts = [task({ id: 'a', priority: 2 }), task({ id: 'b', priority: 9 }), task({ id: 'c', status: 'done' })];
  assert.deepEqual(listQuests(ts, { sort: 'priorite' }, T0).map((t) => t.id), ['b', 'a']);
  assert.deepEqual(listQuests(ts, undefined, T0).map((t) => t.id), ['b', 'a']);
});

test('trois cartes : À faire d’abord, Victoire rapide, Grand chantier', () => {
  const ts = [
    task({ id: 'p', priority: 9, length: 5, difficulty: 5 }),
    task({ id: 'q', priority: 6, length: 2, difficulty: 2 }),
    task({ id: 'g', priority: 4, length: 8, difficulty: 6 }),
    task({ id: 'x', priority: 1, length: 3, difficulty: 9 }),
  ];
  const c = topCards(ts, T0);
  assert.equal(c.first.id, 'p');
  assert.equal(c.quick.id, 'q');
  assert.equal(c.big.id, 'g');
  assert.deepEqual(topCards([], T0), { first: null, quick: null, big: null });
  // la première carte n’est pas répétée dans une autre
  const seul = topCards([task({ id: 's', length: 1, difficulty: 1 })], T0);
  assert.equal(seul.first.id, 's');
  assert.equal(seul.quick, null);
});

test('« Pourquoi ? » donne la raison chiffrée', () => {
  const t = task({ priority: 7, length: 1, difficulty: 1, deadline: '2026-10-06', created: '2026-10-06' });
  const w = why(t, T0);
  assert.equal(w.cote, 82);
  assert.match(w.text, /^Cote 82\u00a0: priorité 7 \(\+31,5\), courte \(\+20\), facile \(\+10\), échéance aujourd’hui \(\+20\)/);
  const retard = why(task({ deadline: '2026-10-01', created: '2026-08-01' }), T0);
  assert.match(retard.text, /échéance dépassée \(\+25\)/);
  assert.match(retard.text, /ancienneté/);
});
