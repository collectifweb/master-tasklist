import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNow, toISO, localParts, gameDay, isDayString, parseDay, dayOf, addDays, addMonths, daysBetween,
  hoursBetween, daysUntil, isoWeekday, weekStart, weekEnd, seasonDates, isTruce, isSnowSeason,
} from '../../core/index.js';

test('parseNow accepte Date, chaîne ISO et nombre, refuse le reste', () => {
  assert.equal(parseNow('2026-10-06T14:00:00Z').getTime(), Date.UTC(2026, 9, 6, 14));
  assert.equal(parseNow(new Date(5)).getTime(), 5);
  assert.equal(parseNow(7).getTime(), 7);
  assert.throws(() => parseNow(undefined), TypeError);
  assert.throws(() => parseNow('pas une date'), TypeError);
});

test('toISO renvoie la chaîne ISO UTC', () => {
  assert.equal(toISO(new Date(Date.UTC(2026, 0, 2, 3, 4, 5))), '2026-01-02T03:04:05.000Z');
});

test('localParts lit l’heure murale de Montréal (EDT puis EST)', () => {
  assert.deepEqual(localParts('2026-10-06T14:00:00Z'), { year: 2026, month: 10, day: 6, hour: 10, minute: 0, second: 0 });
  assert.equal(localParts('2026-12-06T14:00:00Z').hour, 9);
  assert.equal(localParts('2026-10-06T04:00:00Z').hour, 0); // minuit, pas « 24 »
});

test('jour de jeu : 3 h 59 appartient à la veille, 4 h 00 au jour même', () => {
  assert.equal(gameDay('2026-10-06T07:59:00Z'), '2026-10-05'); // 3 h 59 EDT
  assert.equal(gameDay('2026-10-06T08:00:00Z'), '2026-10-06'); // 4 h 00 EDT
  assert.equal(gameDay('2026-10-07T03:59:00Z'), '2026-10-06'); // 23 h 59 EDT
});

test('jour de jeu : 3 h 59 / 4 h 00 aussi au changement d’heure d’automne (1er novembre 2026)', () => {
  assert.equal(gameDay('2026-11-01T08:59:00Z'), '2026-10-31'); // 3 h 59 EST
  assert.equal(gameDay('2026-11-01T09:00:00Z'), '2026-11-01'); // 4 h 00 EST
  assert.equal(gameDay('2026-11-01T05:30:00Z'), '2026-10-31'); // 1 h 30 EDT (première fois)
  assert.equal(gameDay('2026-11-01T06:30:00Z'), '2026-10-31'); // 1 h 30 EST (deuxième fois)
});

test('jour de jeu : 3 h 59 / 4 h 00 aussi au changement d’heure de printemps (8 mars 2026)', () => {
  assert.equal(gameDay('2026-03-08T07:59:00Z'), '2026-03-07'); // 3 h 59 EDT
  assert.equal(gameDay('2026-03-08T08:00:00Z'), '2026-03-08'); // 4 h 00 EDT
  assert.equal(gameDay('2026-03-08T06:59:00Z'), '2026-03-07'); // 1 h 59 EST
});

test('isDayString et parseDay', () => {
  assert.equal(isDayString('2026-10-06'), true);
  assert.equal(isDayString('2026-10-06T00:00:00Z'), false);
  assert.equal(parseDay('2026-10-06'), Date.UTC(2026, 9, 6));
  assert.throws(() => parseDay('hier'), TypeError);
});

test('dayOf accepte un jour, un ISO, ou rien', () => {
  assert.equal(dayOf('2026-10-06'), '2026-10-06');
  assert.equal(dayOf('2026-10-06T07:00:00Z'), '2026-10-05');
  assert.equal(dayOf(null), null);
  assert.equal(dayOf('n’importe quoi'), null);
});

test('addDays, addMonths (fin de mois) et daysBetween', () => {
  assert.equal(addDays('2026-10-30', 3), '2026-11-02');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-11-15', 2), '2027-01-15');
  assert.equal(addMonths('2026-01-15', -2), '2025-11-15');
  assert.equal(daysBetween('2026-10-06', '2026-10-13'), 7);
  assert.equal(daysBetween('2026-10-13', '2026-10-06'), -7);
});

test('hoursBetween', () => {
  assert.equal(hoursBetween('2026-10-06T10:00:00Z', '2026-10-07T10:00:00Z'), 24);
});

test('daysUntil : positif, nul, négatif, ou null sans échéance', () => {
  const now = '2026-10-06T14:00:00Z';
  assert.equal(daysUntil('2026-10-14', now), 8);
  assert.equal(daysUntil('2026-10-06', now), 0);
  assert.equal(daysUntil('2026-10-01', now), -5);
  assert.equal(daysUntil(null, now), null);
});

test('semaine : lundi à dimanche', () => {
  assert.equal(isoWeekday('2026-10-05'), 1); // lundi
  assert.equal(isoWeekday('2026-10-11'), 7); // dimanche
  assert.equal(weekStart('2026-10-08'), '2026-10-05');
  assert.equal(weekStart('2026-10-11'), '2026-10-05');
  assert.equal(weekEnd('2026-10-08'), '2026-10-11');
});

test('saison : neige le 15 novembre, trêve du 21 décembre au 4 janvier', () => {
  assert.deepEqual(seasonDates(2026), { snow: '2026-11-15', truceStart: '2026-12-21', truceEnd: '2027-01-04' });
  assert.equal(isTruce('2026-12-20'), false);
  assert.equal(isTruce('2026-12-21'), true);
  assert.equal(isTruce('2027-01-04'), true);
  assert.equal(isTruce('2027-01-05'), false);
  assert.equal(isSnowSeason('2026-11-14'), false);
  assert.equal(isSnowSeason('2026-11-15'), true);
  assert.equal(isSnowSeason('2027-02-01'), true);
  assert.equal(isSnowSeason('2027-05-15'), false);
});
