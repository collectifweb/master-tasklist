// Côte à côte : relevé du temps passé (cote-a-cote.js). Titres fictifs génériques.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startQuest, pauseQuest, completeQuest, remballerQuest, archiveQuest, deleteQuest, advanceTime, migrateState,
  createInitialState, currentSeance, releve, decoupagePropose, weeklyReview, SEANCE_MAX_MINUTES, RELEVE_KEEP_DAYS,
  MAX_STEPS,
} from '../../core/index.js';
import { T0, fresh, step, task, plusHours } from './helpers.mjs';

const plusMin = (iso, m) => plusHours(iso, m / 60);
const ev = (r, type) => r.events.filter((e) => e.type === type);
const cac = (w) => w.game.coteACote;

test('« Je m’y mets » lance la séance, Pause l’arrête et garde le total ; la vraie tâche ne porte aucun temps', () => {
  let s = step(fresh([task()]), startQuest, { id: 't1' });
  assert.deepEqual(cac(s.world).current, { taskId: 't1', occurrence: 1, since: '2026-10-06T14:00:00.000Z' });
  assert.deepEqual(ev(s.r, 'seance-debut'), [{ type: 'seance-debut', taskId: 't1', occurrence: 1 }]);
  assert.ok(s.r.ops.some((o) => o.type === 'game.set'));
  assert.equal(currentSeance(s.world.game, plusMin(T0, 12)).minutes, 12);
  assert.equal(currentSeance(s.world.game, plusMin(T0, 12.9)).minutes, 12); // minute entière, jamais de secondes

  s = step(s.world, pauseQuest, { id: 't1' }, plusMin(T0, 25));
  assert.equal(cac(s.world).current, null);
  assert.deepEqual(cac(s.world).totals, [{ taskId: 't1', occurrence: 1, minutes: 25, capped: false, doneOn: null }]);
  const [fin] = ev(s.r, 'seance-fin');
  assert.equal(fin.minutes, 25); assert.equal(fin.total, 25); assert.equal(fin.raison, 'pause'); assert.equal(fin.oubliee, false);
  assert.deepEqual(releve(s.world.game, 't1', 1, plusMin(T0, 60)), { minutes: 25, capped: false, enCours: false });

  // une deuxième séance s'ajoute au total de la même occurrence
  s = step(s.world, startQuest, { id: 't1' }, plusMin(T0, 60));
  assert.deepEqual(releve(s.world.game, 't1', 1, plusMin(T0, 70)), { minutes: 35, capped: false, enCours: true });
  s = step(s.world, pauseQuest, { id: 't1' }, plusMin(T0, 70));
  assert.equal(cac(s.world).totals[0].minutes, 35);

  // la tâche n'a reçu que l'épingle et le gel : aucun champ de temps
  const keys = Object.keys(s.world.tasks[0]).sort();
  assert.deepEqual(keys, [...Object.keys(task()), 'frozen', 'startedAt', 'updatedAt'].sort());
});

test('une seule séance à la fois : en commencer une autre arrête la première', () => {
  let s = step(fresh([task(), task({ id: 't2', task: 'Ranger l’atelier' })]), startQuest, { id: 't1' });
  s = step(s.world, startQuest, { id: 't2' }, plusMin(T0, 10));
  assert.equal(cac(s.world).current.taskId, 't2');
  const [fin] = ev(s.r, 'seance-fin');
  assert.equal(fin.taskId, 't1'); assert.equal(fin.minutes, 10); assert.equal(fin.raison, 'autre-quete');
  assert.equal(releve(s.world.game, 't1', 1, plusMin(T0, 30)).minutes, 10);
  assert.equal(s.world.tasks.find((t) => t.id === 't1').startedAt, T0.replace('Z', '.000Z')); // la vraie tâche reste épinglée
});

test('séance oubliée : plafonnée à 3 h et marquée, sans proposition de découpage', () => {
  let s = step(fresh([task()]), startQuest, { id: 't1' });
  assert.equal(currentSeance(s.world.game, plusHours(T0, 5)).oubliee, true);
  assert.equal(currentSeance(s.world.game, plusHours(T0, 5)).minutes, SEANCE_MAX_MINUTES);
  const p = step(s.world, pauseQuest, { id: 't1' }, plusHours(T0, 5));
  assert.deepEqual(cac(p.world).totals[0], { taskId: 't1', occurrence: 1, minutes: 180, capped: true, doneOn: null });
  assert.equal(ev(p.r, 'seance-fin')[0].oubliee, true);
  assert.equal(ev(p.r, 'seance-fin')[0].decoupage, false);
  assert.equal(decoupagePropose(p.world.game, p.world.tasks[0], plusHours(T0, 5)), false);

  // advanceTime ferme la séance oubliée sans toucher à la vraie tâche
  const a = step(s.world, advanceTime, {}, plusHours(T0, 4));
  assert.equal(cac(a.world).current, null);
  assert.equal(cac(a.world).totals[0].minutes, 180);
  assert.equal(ev(a.r, 'seance-fin')[0].raison, 'oubliee');
  assert.equal(a.r.ops.some((o) => o.type === 'task.upsert'), false);
  assert.deepEqual(step(a.world, advanceTime, {}, plusHours(T0, 4)).r.ops, []); // idempotente
  // avant 3 h, rien ne bouge
  assert.equal(cac(step(s.world, advanceTime, {}, plusHours(T0, 2)).world).current.taskId, 't1');
});

test('côte à côte ne rapporte rien : aucune entrée au registre, aucune ressource', () => {
  const w0 = fresh([task()]);
  let s = step(w0, startQuest, { id: 't1' });
  assert.equal(s.r.entries.length, 0);
  s = step(s.world, pauseQuest, { id: 't1' }, plusHours(T0, 2));
  assert.equal(s.r.entries.length, 0);
  assert.equal(s.r.events.some((e) => e.type === 'reward'), false);
  const { coteACote: _a, ...avec } = s.world.game;
  const { coteACote: _b, ...sans } = w0.game;
  assert.deepEqual(avec, sans); // seul le relevé a changé dans l'état du jeu
  // le gain de la quête est le même avec ou sans séance
  const fait = step(s.world, completeQuest, { id: 't1' }, plusHours(T0, 3)).r.entries;
  const temoin = step(w0, completeQuest, { id: 't1' }, plusHours(T0, 3)).r.entries;
  assert.deepEqual(fait.map(({ at, ...e }) => e), temoin.map(({ at, ...e }) => e));
});

test('file rejouée : Pause ou « Je m’y mets » rejoués ne comptent rien deux fois', () => {
  const a = step(fresh([task()]), startQuest, { id: 't1' });
  const again = step(a.world, startQuest, { id: 't1' }, plusMin(T0, 5));
  assert.deepEqual(again.r.ops, []);
  assert.equal(cac(again.world).current.since, '2026-10-06T14:00:00.000Z');
  const p = step(a.world, pauseQuest, { id: 't1' }, plusMin(T0, 20));
  const replay = step(p.world, pauseQuest, { id: 't1' }, plusMin(T0, 20));
  assert.deepEqual(replay.r.ops, []);
  assert.equal(cac(replay.world).totals[0].minutes, 20);
});

test('migration : un ancien état reçoit le relevé vide sans rien perdre ; un relevé abîmé est ignoré', () => {
  const old = createInitialState(T0);
  delete old.coteACote;
  old.champFutur = { x: 1 };
  const m = migrateState(structuredClone(old));
  assert.deepEqual(m.coteACote, { current: null, totals: [] });
  assert.deepEqual(m.champFutur, { x: 1 });
  assert.deepEqual(migrateState({ ...old, coteACote: 'abîmé' }).coteACote, { current: null, totals: [] });

  const abime = { ...createInitialState(T0), coteACote: {
    current: { taskId: { x: 1 }, occurrence: 'un', since: 'jamais' },
    totals: [null, 7, { taskId: 't1', occurrence: 1, minutes: 'beaucoup' }, { taskId: 't1', occurrence: 0, minutes: 5 }],
  } };
  assert.equal(currentSeance(abime, T0), null);
  assert.deepEqual(releve(abime, 't1', 1, T0), { minutes: 0, capped: false, enCours: false });
  const s = step({ tasks: [task()], game: abime, ledger: [] }, startQuest, { id: 't1' });
  assert.equal(cac(s.world).current.taskId, 't1');
  assert.deepEqual(cac(s.world).totals, []);
  // un identifiant numérique (ancien état) est lu comme chaîne
  const num = { ...createInitialState(T0), coteACote: { current: null, totals: [{ taskId: 7, occurrence: 2, minutes: 12, capped: false, doneOn: null }] } };
  assert.equal(releve(num, '7', 2, T0).minutes, 12);
});

test('mémoire bornée : un relevé terminé depuis plus de 60 jours est effacé, une quête à faire garde le sien', () => {
  let s = step(fresh([task(), task({ id: 't2', task: 'Ranger l’atelier' })]), startQuest, { id: 't1' });
  s = step(s.world, completeQuest, { id: 't1' }, plusMin(T0, 30));
  assert.equal(cac(s.world).totals[0].doneOn, '2026-10-06');
  s = step(s.world, startQuest, { id: 't2' }, plusMin(T0, 40));
  s = step(s.world, pauseQuest, { id: 't2' }, plusMin(T0, 50));
  const garde = step(s.world, advanceTime, {}, plusHours(T0, 24 * RELEVE_KEEP_DAYS));
  assert.deepEqual(cac(garde.world).totals.map((r) => r.taskId), ['t1', 't2']);
  const purge = step(s.world, advanceTime, {}, plusHours(T0, 24 * (RELEVE_KEEP_DAYS + 1)));
  assert.deepEqual(cac(purge.world).totals.map((r) => r.taskId), ['t2']);
  // une quête retirée ailleurs (sans passer par l'app) : sa fin est notée au premier entretien
  const ailleurs = step({ ...s.world, tasks: s.world.tasks.filter((t) => t.id !== 't2') }, advanceTime, {}, plusHours(T0, 2));
  assert.equal(cac(ailleurs.world).totals.find((r) => r.taskId === 't2').doneOn, '2026-10-06');
});

test('découpage proposé au-delà de 2 fois la durée estimée, si la quête reste à faire', () => {
  // L2 = 15 min estimées : proposé au-delà de 30 min
  const s = step(fresh([task()]), startQuest, { id: 't1' });
  assert.equal(ev(step(s.world, pauseQuest, { id: 't1' }, plusMin(T0, 29)).r, 'seance-fin')[0].decoupage, false);
  const p = step(s.world, pauseQuest, { id: 't1' }, plusMin(T0, 31));
  assert.equal(ev(p.r, 'seance-fin')[0].decoupage, true);
  assert.equal(decoupagePropose(p.world.game, p.world.tasks[0], plusMin(T0, 31)), true);
  // quête unique terminée : plus rien à découper
  assert.equal(ev(step(s.world, completeQuest, { id: 't1' }, plusMin(T0, 31)).r, 'seance-fin')[0].decoupage, false);
  // déjà 12 étapes : pas de proposition
  const pleine = task({ steps: Array.from({ length: MAX_STEPS }, (_, i) => ({ id: `s${i + 1}`, label: 'étape', done: false })) });
  const s2 = step(fresh([pleine]), startQuest, { id: 't1' });
  assert.equal(ev(step(s2.world, pauseQuest, { id: 't1' }, plusMin(T0, 40)).r, 'seance-fin')[0].decoupage, false);
  // quête récurrente : la prochaine occurrence est à faire, le découpage est proposé après Fait
  const rec = task({ recurrence: { every: 'week', interval: 1 }, occurrence: 1, occurrenceSince: '2026-10-06' });
  const s3 = step(fresh([rec]), startQuest, { id: 't1' });
  const f = step(s3.world, completeQuest, { id: 't1' }, plusMin(T0, 45));
  const [fin] = ev(f.r, 'seance-fin');
  assert.equal(fin.occurrence, 1); assert.equal(fin.raison, 'fait'); assert.equal(fin.decoupage, true);
  assert.equal(f.world.tasks[0].occurrence, 2);
  assert.equal(cac(f.world).totals[0].doneOn, '2026-10-06');
});

test('Remballer, archiver et supprimer arrêtent la séance ; Remballer rouvre l’occurrence', () => {
  let s = step(fresh([task()]), startQuest, { id: 't1' });
  s = step(s.world, completeQuest, { id: 't1' }, plusMin(T0, 20));
  const r = step(s.world, remballerQuest, { id: 't1' }, plusMin(T0, 30));
  assert.equal(cac(r.world).totals[0].doneOn, null);
  assert.equal(cac(r.world).totals[0].minutes, 20);

  const base = step(fresh([task()]), startQuest, { id: 't1' });
  const a = step(base.world, archiveQuest, { id: 't1' }, plusMin(T0, 15));
  assert.equal(cac(a.world).current, null);
  assert.deepEqual(ev(a.r, 'seance-fin').map((e) => [e.raison, e.minutes]), [['archive', 15]]);
  assert.equal(cac(a.world).totals[0].doneOn, '2026-10-06');
  const d = step(base.world, deleteQuest, { id: 't1' }, plusMin(T0, 15));
  assert.equal(cac(d.world).current, null);
  assert.equal(ev(d.r, 'seance-fin')[0].raison, 'suppression');
});

test('bilan de la semaine : temps relevé par domaine à côté des heures estimées', () => {
  let s = step(fresh([task(), task({ id: 't2', task: 'Ranger l’atelier' })]), startQuest, { id: 't1' });
  s = step(s.world, completeQuest, { id: 't1' }, plusMin(T0, 40));
  s = step(s.world, completeQuest, { id: 't2' }, plusMin(T0, 50)); // terminée sans séance
  const b = weeklyReview(s.world.tasks, s.world.game, s.world.ledger, plusHours(T0, 2));
  assert.equal(b.quetes, 2);
  assert.equal(b.heures, 0.5); // 2 × 15 min estimées
  assert.equal(b.minutesReleve, 40);
  assert.equal(b.heuresReleve, 0.7);
  assert.equal(b.domaines.length, 1);
  assert.deepEqual(
    { ...b.domaines[0] },
    { sector: b.domaines[0].sector, domain: b.domaines[0].domain, quetes: 2, minutes: 30, heures: 0.5, minutesReleve: 40, heuresReleve: 0.7 },
  );
  // sans aucune séance : relevé à 0, la forme ne change pas
  const vide = weeklyReview([], fresh().game, [], plusHours(T0, 2));
  assert.equal(vide.minutesReleve, 0);
  assert.equal(vide.heuresReleve, 0);
});
