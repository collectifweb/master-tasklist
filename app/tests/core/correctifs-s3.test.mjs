// Correctifs de la relecture indépendante du commit 5131ed8 (semaine 3) : chaque test échoue sans le correctif.
// Ceux qui portaient sur la v1 (garde-manger, voiles, Avis, chapitres) sont partis avec elle.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createInitialState, migrateState, advanceTime, completeQuest, remballerQuest, addDays, morningLetter, markLetterShown, fillText,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const lettres = JSON.parse(readFileSync(new URL('../../content/fr-CA/lettres.json', import.meta.url), 'utf8'));
const at = (day, hourUtc = 14) => `${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`;

// ---- 1. État abîmé ------------------------------------------------------------------------------------------------

test('état abîmé : un type inattendu reprend la valeur par défaut, plus de plantage', () => {
  const now = at('2026-10-06');
  const cas = {
    'resources: null': (g) => { g.resources = null; },
    'quartiers: []': (g) => { g.quartiers = []; },
    'quartiers.atelier: "x"': (g) => { g.quartiers.atelier = 'x'; },
    'batiments: null': (g) => { g.batiments = null; },
    'parcelles: "x"': (g) => { g.parcelles = 'x'; },
    'premiersPas: []': (g) => { g.premiersPas = []; },
    'bilans: {}': (g) => { g.bilans = {}; },
  };
  for (const [label, abime] of Object.entries(cas)) {
    const raw = createInitialState(now);
    abime(raw);
    const g = migrateState(raw, now);
    const w = { tasks: [task({ id: 't1', domain: 'Maison' })], game: g, ledger: [] };
    let s;
    assert.doesNotThrow(() => { s = step(w, completeQuest, { id: 't1' }, now); }, label);
    assert.equal(s.world.game.quartiers.atelier, 1, label);
    assert.doesNotThrow(() => step(s.world, remballerQuest, { id: 't1' }, now), label);
    assert.doesNotThrow(() => step(w, advanceTime, {}, now), label);
  }
  const g = migrateState({ ...createInitialState(now), resources: null, quartiers: [], bilans: {} }, now);
  assert.deepEqual(g.resources, { energy: 10, materials: 20, food: 5 });
  assert.equal(g.quartiers.place, 0);
  assert.deepEqual(g.bilans, []);
});

// ---- 2. lastSeenDay ne recule jamais ------------------------------------------------------------------------------

test('lastSeenDay ne recule jamais (file hors ligne rejouée en retard)', () => {
  const w = fresh([], at('2026-10-01'));
  w.game.lastSeenDay = '2026-10-06';
  const a = step(w, advanceTime, {}, at('2026-10-08'));
  assert.equal(a.world.game.lastSeenDay, '2026-10-08');
  const b = step(a.world, advanceTime, {}, at('2026-10-07'));
  assert.equal(b.world.game.lastSeenDay, '2026-10-08');
  assert.deepEqual(b.r.ops, []);
  // jamais vue : le premier passage note le jour
  assert.equal(step(fresh([], at('2026-10-01')), advanceTime, {}, at('2026-10-02')).world.game.lastSeenDay, '2026-10-02');
});

// ---- 3. Lettres ---------------------------------------------------------------------------------------------------

test('lettres : matinSansQuete ne se répète pas sur 7 jours', () => {
  assert.ok(lettres.matinSansQuete.length >= 7);
  let w = fresh();
  const ids = [];
  for (let i = 0; i < 21; i++) {
    const day = addDays('2026-10-06', i);
    const l = morningLetter(lettres, [], w.game, at(day));
    assert.equal(l.kind, 'matinSansQuete');
    ids.push(l.id);
    w = step(w, markLetterShown, { id: l.id }, at(day)).world;
  }
  for (let i = 0; i < ids.length; i++) assert.equal(ids.slice(Math.max(0, i - 6), i).includes(ids[i]), false, `${ids[i]} répétée au jour ${i + 1}`);
  for (const l of lettres.matinSansQuete) for (const t of l.texte) assert.doesNotMatch(t, /tu n’as pas|manqué|négligé/i);
});

test('fillText sans prénom : « , {prenom} » et « {prenom}, » disparaissent proprement', () => {
  assert.equal(fillText('T’es {prenom}, le septième intendant.', {}), 'T’es le septième intendant.');
  assert.equal(fillText('Bon matin, {prenom}.', {}), 'Bon matin.');
  assert.equal(fillText('T’es {prenom}, le septième intendant.', { prenom: 'Sam' }), 'T’es Sam, le septième intendant.');
  assert.equal(fillText('Je propose « {quete} ».', {}), null);
});
