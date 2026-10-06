import test from 'node:test';
import assert from 'node:assert/strict';
import {
  effortPoints, shouldFreeze, freezeValues, effectiveValues, applyFreeze, bonusPe, questPe, cappedPe,
  alreadyDoneRate, amountsForPe, splitSteps, stepPe, completionPe, round1, round2,
} from '../../core/index.js';
import { T0, task, plusHours } from './helpers.mjs';

test('Points d’effort : P9 L2 D2 = 7 ; P9 L9 D9 = 55 ; P5 L5 D5 = 20 ; P3 L1 D1 = 3 ; P10 L10 D10 = 67', () => {
  assert.equal(effortPoints(9, 2, 2), 7);
  assert.equal(effortPoints(9, 9, 9), 55);
  assert.equal(effortPoints(5, 5, 5), 20);
  assert.equal(effortPoints(3, 1, 1), 3);
  assert.equal(effortPoints(10, 10, 10), 67);
});

test('Points d’effort : l’effort paie, une longue et difficile vaut plus que cinq courtes et faciles', () => {
  assert.ok(effortPoints(9, 9, 9) > 5 * effortPoints(9, 2, 2));
  // proportionnel à la longueur, multiplié par la difficulté, petite prime de priorité
  assert.ok(effortPoints(5, 8, 5) > effortPoints(5, 4, 5));
  assert.ok(effortPoints(5, 5, 9) > effortPoints(5, 5, 6));
  assert.ok(effortPoints(10, 5, 5) > effortPoints(1, 5, 5));
});

test('gel de P/L/D : à la première étape, ou 24 h après la création', () => {
  assert.equal(shouldFreeze(task({ created: '2026-10-06', createdAt: T0 }), T0), false);
  assert.equal(shouldFreeze(task({ created: '2026-10-06', createdAt: T0, startedAt: T0 }), T0), false); // l'ancien « Je m’y mets » ne fige plus
  assert.equal(shouldFreeze(task({ steps: [{ id: 's1', label: 'a', done: true }] }), T0), true);
  assert.equal(shouldFreeze(task({ steps: [{ id: 's1', label: 'a', done: false }] }), T0), false);
  assert.equal(shouldFreeze(task({ createdAt: T0 }), plusHours(T0, 23)), false);
  assert.equal(shouldFreeze(task({ createdAt: T0 }), plusHours(T0, 24)), true);
  assert.equal(shouldFreeze(task({ created: '2026-10-05' }), T0), true); // sans createdAt : un jour de calendrier
  assert.equal(shouldFreeze(task({ frozen: { priority: 1, length: 1, difficulty: 1, at: T0 } }), T0), false);
});

test('freezeValues, effectiveValues et applyFreeze', () => {
  const t = task({ priority: 8, length: 4, difficulty: 6, created: '2026-10-05' });
  assert.deepEqual(freezeValues(t, T0), { priority: 8, length: 4, difficulty: 6, at: '2026-10-06T14:00:00.000Z' });
  const f = applyFreeze(t, T0);
  assert.notEqual(f, t);
  assert.equal(t.frozen, undefined);
  assert.equal(f.frozen.priority, 8);
  assert.equal(applyFreeze(task(), T0).frozen, undefined);
  // modifier P/L/D après le gel ne change pas ce qui paie
  const modif = { ...f, priority: 1, length: 10 };
  assert.deepEqual(effectiveValues(modif, T0), f.frozen);
  assert.equal(effectiveValues(task({ priority: 2 }), T0).priority, 2);
});

test('bonus : ×1,2 si finie avant une échéance posée 48 h plus tôt', () => {
  const t = task({ priority: 10, length: 10, difficulty: 10, deadline: '2026-10-10', deadlineSetAt: '2026-10-03T10:00:00Z', created: '2026-10-06' });
  const q = questPe(t, T0);
  assert.equal(q.base, 67);
  assert.equal(q.pe, 80); // 67 × 1,2 = 80,4
  const tard = { ...t, deadlineSetAt: '2026-10-09T14:00:00Z' }; // posée la veille : pas de bonus
  assert.equal(questPe(tard, T0).pe, 67);
  assert.equal(questPe({ ...t, deadlineSetAt: undefined }, T0).pe, 67);
  assert.equal(questPe(t, '2026-10-11T14:00:00Z').pe, 67); // après l’échéance
});

test('bonus : +2 PE par tranche de 14 jours d’ancienneté', () => {
  const t = task({ priority: 10, length: 10, difficulty: 10, created: '2026-09-08' }); // 28 jours
  assert.equal(bonusPe(t, 25, T0).age, 4);
  assert.equal(questPe(t, T0).pe, 71);
});

test('bonus plafonnés ensemble à +40 %', () => {
  const t = task({ priority: 6, length: 1, difficulty: 1, created: '2025-01-01', deadline: '2026-10-12', deadlineSetAt: '2026-10-01T10:00:00Z' });
  const b = bonusPe(t, 6, T0);
  assert.equal(b.capped, true);
  assert.ok(Math.abs(b.total - 2.4) < 1e-9);
  assert.equal(questPe(t, T0).base, 3); // P6 L1 D1
  assert.equal(questPe(t, T0).pe, Math.round(3 + 3 * 0.4));
});

test('plafond quotidien dégressif : 100 % jusqu’à 45 PE, 50 % de 45 à 90, 20 % au-delà', () => {
  assert.equal(cappedPe(0, 45), 45);
  assert.equal(cappedPe(0, 60), 45 + 7.5);
  assert.equal(cappedPe(40, 10), 5 + 2.5);
  assert.equal(cappedPe(90, 10), 2);
  assert.equal(cappedPe(0, 100), 45 + 22.5 + 2);
  assert.equal(cappedPe(100, 0), 0);
  assert.equal(cappedPe(-5, 10), 10);
});

test('« Déjà faite » : plein tarif pour 3 par jour, puis 50 %', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(alreadyDoneRate), [1, 1, 1, 0.5, 0.5]);
});

test('montants : ⚡ 0,3·PE, ▣ 0,5·PE, rien d’autre (ni Lueur ni Fil libre)', () => {
  assert.deepEqual(amountsForPe(20, 0), { pe: 20, energy: 6, materials: 10 });
  // au-delà du plafond de 45 PE du jour, ⚡ et ▣ baissent ; les PE restent ceux de la quête
  assert.deepEqual(amountsForPe(20, 90), { pe: 20, energy: 1.2, materials: 2 });
});

test('étapes : 40 % pour les étapes, 60 % pour la complétion, total identique', () => {
  assert.deepEqual(splitSteps(25), { steps: 10, completion: 15 });
  const pe = 17;
  const n = 4;
  let paid = 0;
  for (let i = 0; i < n; i++) paid += stepPe(pe, n, paid);
  paid = round2(paid);
  assert.ok(Math.abs(paid - pe * 0.4) < 0.05);
  assert.ok(Math.abs(paid + completionPe(pe, paid) - pe) < 1e-9);
  assert.equal(stepPe(10, 0), 0);
  assert.equal(stepPe(10, 2, 4), 0); // la part des étapes est épuisée
  assert.equal(completionPe(10, 12), 0);
});

test('arrondis', () => {
  assert.equal(round1(1.26), 1.3);
  assert.equal(round2(1.005 + 0.001), 1.01);
});
