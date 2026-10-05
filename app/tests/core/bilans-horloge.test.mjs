// Lot 6 : bilans figés à la fin de chaque semaine (104 au plus) et « Jour suivant » de la version d'essai.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTime, completeQuest, jourSuivant, addDays, BILANS_MAX } from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, hourUtc = 14) => `${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`; // 10 h à Montréal en octobre

// Une quête faite le mardi 6 octobre 2026 (semaine du lundi 5 au dimanche 11), puis le temps qui passe.
function semaineJouee() {
  let w = fresh([task({ id: 't1', domain: 'Maison', length: 2 })], at('2026-10-06'));
  w = step(w, completeQuest, { id: 't1' }, at('2026-10-06')).world;
  return step(w, advanceTime, {}, at('2026-10-06')).world;
}

test('bilans : rien n’est figé tant que la semaine n’est pas finie', () => {
  const w = semaineJouee();
  assert.deepEqual(w.game.bilans, []);
  assert.deepEqual(step(w, advanceTime, {}, at('2026-10-11')).world.game.bilans, []); // dimanche : encore la même semaine
});

test('bilans : la semaine finie est figée au premier passage du temps de la suivante, une seule fois', () => {
  const lundi = step(semaineJouee(), advanceTime, {}, at('2026-10-12'));
  const { bilans } = lundi.world.game;
  assert.equal(bilans.length, 1);
  assert.deepEqual(bilans[0].semaine, { start: '2026-10-05', end: '2026-10-11' });
  assert.equal(bilans[0].quetes, 1);
  assert.equal(bilans[0].joursTravailles, 1);
  assert.deepEqual(bilans[0].domaines.map((d) => [d.quartier, d.quetes]), [['atelier', 1]]);
  assert.ok(lundi.r.ops.some((o) => o.type === 'game.set'), 'le bilan figé est enregistré');
  // rejoué le même lundi : aucune opération ; même semaine, plus tard : rien de plus
  assert.deepEqual(step(lundi.world, advanceTime, {}, at('2026-10-12', 20)).r.ops, []);
  const mardi = step(lundi.world, advanceTime, {}, at('2026-10-13'));
  assert.equal(mardi.world.game.bilans, lundi.world.game.bilans);
  // figé : un gain du dimanche arrivé après coup (autre appareil) ne change plus le bilan
  const tard = { ...mardi.world, ledger: [...mardi.world.ledger, { ...mardi.world.ledger.find((e) => e.type === 'reward'), key: 'reward:t9:1', taskId: 't9', day: '2026-10-11' }] };
  assert.deepEqual(step(tard, advanceTime, {}, at('2026-10-20')).world.game.bilans[0], bilans[0]);
});

test('bilans : une semaine déjà comptée (migration) n’est pas doublée ; une semaine sans quête n’en a pas', () => {
  const w = step(semaineJouee(), advanceTime, {}, at('2026-10-12')).world;
  // trois semaines d'absence, puis retour : la semaine du 5 reste seule, les semaines vides n'ajoutent rien
  const retour = step(w, advanceTime, {}, at('2026-11-02')).world;
  assert.deepEqual(retour.game.bilans.map((b) => b.semaine.start), ['2026-10-05']);
});

test('bilans : 104 au plus, les plus anciens partent', () => {
  assert.equal(BILANS_MAX, 104);
  const w = semaineJouee();
  const vieux = Array.from({ length: BILANS_MAX }, (_, i) => {
    const start = addDays('2024-10-07', 7 * i);
    return { semaine: { start, end: addDays(start, 6) }, quetes: 1, heures: 0.3, minutesReleve: 0, heuresReleve: 0, domaines: [], joursTravailles: 1 };
  });
  w.game = { ...w.game, bilans: vieux };
  const { bilans } = step(w, advanceTime, {}, at('2026-10-12')).world.game;
  assert.equal(bilans.length, BILANS_MAX);
  assert.equal(bilans[0].semaine.start, vieux[1].semaine.start);
  assert.equal(bilans.at(-1).semaine.start, '2026-10-05');
});

test('jourSuivant : le décalage de la partie avance d’un jour à chaque fois, et s’enregistre', () => {
  const w = fresh([], at('2026-10-06'));
  assert.equal(w.game.horloge, undefined, 'une partie neuve ne porte aucun décalage (la production le refuse)');
  const a = step(w, jourSuivant, {}, at('2026-10-06'));
  assert.deepEqual(a.world.game.horloge, { decalage: 1 });
  assert.ok(a.r.ops.some((o) => o.type === 'game.set'));
  const b = step(a.world, jourSuivant, {}, at('2026-10-07'));
  assert.deepEqual(b.world.game.horloge, { decalage: 2 });
  assert.throws(() => jourSuivant([], w.game, [], {}, at('2026-10-06')), /révision/); // game.set exige la révision
});
