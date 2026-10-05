import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  fillText, morningLetter, markLetterShown, weeklyReview, archiveQuest, addDays, LETTER_REPEAT_DAYS, RECYCLE_AGE_DAYS,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const lettres = JSON.parse(readFileSync(new URL('../../content/fr-CA/lettres.json', import.meta.url), 'utf8'));
const at = (day, hourUtc = 12) => `${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`;

test('fillText : gabarits remplis ; sans prénom, « , {prenom} » disparaît ; un autre trou rend la phrase impossible', () => {
  assert.equal(fillText('Bon matin, {prenom}.', { prenom: 'Sam' }), 'Bon matin, Sam.');
  assert.equal(fillText('Bon matin, {prenom}.', {}), 'Bon matin.');
  assert.equal(fillText('Bon retour, {prenom}.', { prenom: '' }), 'Bon retour.');
  assert.equal(fillText('Je propose « {quete} ».', { quete: 'Sortir le bac' }), 'Je propose « Sortir le bac ».');
  assert.equal(fillText('Je propose « {quete} ».', {}), null);
  assert.equal(fillText('T’es {prenom}, le septième.', {}), null);
});

test('lettre du matin : quête n° 1 dans {quete}, phrase correcte sans prénom, mémoire dans l’état du jeu', () => {
  let w = fresh([task({ id: 'a', task: 'Sortir le bac', priority: 9 }), task({ id: 'b', task: 'Changer l’ampoule du couloir', priority: 2 })]);
  const l = morningLetter(lettres, w.tasks, w.game, at('2026-10-06'));
  assert.equal(l.kind, 'matin');
  assert.equal(l.questId, 'a');
  assert.equal(l.seen, false);
  assert.ok(l.lignes.join(' ').includes('Sortir le bac')); // toutes les lettres « matin » citent la quête n° 1
  for (const line of l.lignes) assert.doesNotMatch(line, /\{|\}|, \./);
  w = step(w, markLetterShown, { id: l.id }, at('2026-10-06')).world;
  assert.equal(w.game.letters[l.id], '2026-10-06');
  const again = morningLetter(lettres, w.tasks, w.game, at('2026-10-06', 20));
  assert.deepEqual([again.id, again.seen], [l.id, true]); // même lettre le même jour
  assert.deepEqual(step(w, markLetterShown, { id: l.id }, at('2026-10-06', 20)).r.ops, []);
});

test('lettre du matin : aucune répétition sur 7 jours', () => {
  let w = fresh([task({ id: 'a', task: 'Sortir le bac' })]);
  const ids = [];
  for (let i = 0; i < 14; i++) {
    const day = addDays('2026-10-06', i);
    const l = morningLetter(lettres, w.tasks, w.game, at(day), { prenom: 'Sam' });
    ids.push(l.id);
    w = step(w, markLetterShown, { id: l.id }, at(day)).world;
  }
  for (let i = 0; i < ids.length; i++) {
    assert.equal(ids.slice(Math.max(0, i - LETTER_REPEAT_DAYS + 1), i).includes(ids[i]), false, `${ids[i]} répétée au jour ${i + 1}`);
  }
});

test('lettre du matin : sans quête ouverte, et au retour après une absence (bonus de retour du jour)', () => {
  const w = fresh([task({ status: 'done' })]);
  assert.equal(morningLetter(lettres, w.tasks, w.game, at('2026-10-06')).kind, 'matinSansQuete');
  w.game.lastReturnDay = '2026-10-06';
  const r = morningLetter(lettres, w.tasks, w.game, at('2026-10-06'));
  assert.equal(r.kind, 'retour');
  assert.notEqual(r.id, 'retour.04'); // celle-là demande une quête
  // en saison de neige, aucune lettre d'automne
  const snow = morningLetter(lettres, [task()], fresh().game, at('2026-12-01'));
  assert.notEqual(lettres.matin.find((x) => x.id === snow.id).periode, 'automne');
});

test('Jour du recyclage : heures estimées par domaine, quêtes, jours de lisière, ratio laissé à null', () => {
  const tasks = [
    task({ id: 'm', domain: 'Maison', length: 5 }), task({ id: 'j', domain: 'Jardin', length: 6 }), task({ id: 'x', domain: '', length: 2 }),
  ];
  const r = (id, day, sector) => ({ key: `reward:${id}:1`, type: 'reward', taskId: id, occurrence: 1, day, pe: 8, lueur: { sector, amount: 6 } });
  const ledger = [
    r('m', '2026-10-05', 'atelier'), r('j', '2026-10-07', 'champs'), r('x', '2026-10-11', 'place'),
    r('vieux', '2026-10-04', 'atelier'), // semaine d'avant
    r('supprimee', '2026-10-08', 'atelier'), // quête supprimée depuis : comptée, sans durée
    { ...r('m2', '2026-10-09', 'atelier'), key: 'reward:m2:1' }, { key: 'reverse:m2:1', type: 'reverse', day: '2026-10-09' },
  ];
  const game = fresh().game;
  game.lisiereDays = ['2026-10-04', '2026-10-05', '2026-10-07', '2026-10-11'];
  const b = weeklyReview(tasks, game, ledger, at('2026-10-11', 18)); // dimanche
  assert.equal(b.dimanche, true);
  assert.deepEqual(b.semaine, { start: '2026-10-05', end: '2026-10-11' });
  assert.equal(b.quetes, 4);
  assert.deepEqual(b.domaines.map((d) => [d.sector, d.domain, d.quetes, d.minutes, d.heures]), [
    ['champs', 'Terrain', 1, 120, 2], ['atelier', 'Maison', 2, 60, 1], ['place', null, 1, 15, 0.3],
  ]);
  assert.equal(b.heures, 3.3);
  assert.equal(b.joursLisiere, 3);
  assert.equal(b.ratioJeuQuetes, null);
  assert.equal(weeklyReview(tasks, game, ledger, at('2026-10-08')).dimanche, false);
});

test('Jour du recyclage : quêtes ouvertes depuis plus de 60 jours à trier, archivées par archiveQuest', () => {
  const tasks = [
    task({ id: 'vieille', created: '2026-07-01' }), task({ id: 'limite', created: addDays('2026-10-11', -RECYCLE_AGE_DAYS) }),
    task({ id: 'neuve', created: '2026-10-01' }), task({ id: 'finie', created: '2026-01-01', status: 'done' }),
    task({ id: 'lecture', created: '2026-01-01', readonly: true }),
  ];
  const b = weeklyReview(tasks, fresh().game, [], at('2026-10-11', 18));
  assert.deepEqual(b.aTrier.map((t) => t.id), ['vieille']);
  assert.equal(b.aTrier[0].ageDays, 102);
  const s = step(fresh(tasks), archiveQuest, { id: 'vieille' }, at('2026-10-11', 18));
  assert.equal(weeklyReview(s.world.tasks, s.world.game, [], at('2026-10-11', 18)).aTrier.length, 0);
});
