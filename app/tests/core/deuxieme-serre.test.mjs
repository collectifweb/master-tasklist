// Deuxième petite serre (lot R2, décision d'Alex du 6 octobre) : la première reste au campement avec l'atelier, la
// seconde vient au rang Hameau (3 habitants). Semis, récolte, chauffage d'hiver et effet de l'Atelier valent pour
// toute serre-n ; l'objectif « semer » reste sur serre-1. Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATIMENTS, CULTURE, SEMIS, CHAUFFAGE, construire, semer, recolter, refusConstruire, refusSemer, refusRecolter, etatCulture,
  coutSemis, completeQuest, prochainGeste, rangRequis, compte, PAS_IDS,
} from '../../core/index.js';
import { EMPLACEMENTS, LANDMARKS } from '../../world/layout.js';
import { batimentsView } from '../../world/view.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const ETE = '2026-06-10';
const HIVER = '2026-12-01';
const ATELIER = { id: 'atelier-1', type: 'atelier' };
const SERRE1 = { id: 'serre-1', type: 'serre' };
const SERRE2 = { id: 'serre-2', type: 'serre' };
const monde = (day, over = {}) => {
  const w = fresh([], at(day));
  w.game.resources = { energy: 60, materials: 200, food: 0 };
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-10-01']));
  Object.assign(w.game, over);
  w.tasks = Array.from({ length: 12 }, (_, k) => task({ id: `q${k}`, created: '2026-01-01' }));
  return w;
};
let n = 0;
const travaille = (w, day) => step(w, completeQuest, { id: `q${n++ % 12}` }, at(day, 15)).world;
const plusJours = (day, k) => new Date(Date.parse(day + 'T12:00:00Z') + k * 86400000).toISOString().slice(0, 10);

test('catalogue : deux petites serres, la seconde exige le rang Hameau, la première reste au campement', () => {
  assert.equal(BATIMENTS.serre.max, 2);
  assert.equal(BATIMENTS.serre.rang, 'campement');
  assert.equal(rangRequis('serre', 1), 'campement');
  assert.equal(rangRequis('serre', 2), 'hameau');
  assert.equal(rangRequis('chalet', 3), 'campement'); // aucune autre règle par exemplaire
  assert.equal(rangRequis('grenier', 1), 'hameau');
  assert.equal(EMPLACEMENTS.serre.length, 2);
});

test('refus avant le Hameau : « Il faut d’abord le rang Hameau », avec ce qui manque ; accepté dès 3 habitants', () => {
  const w = monde(ETE, { batiments: [ATELIER, SERRE1], habitants: 0 });
  assert.equal(refusConstruire(w.game, 'serre'), 'Il faut d’abord le rang Hameau : encore 3 habitants.');
  w.game.habitants = 2;
  assert.equal(refusConstruire(w.game, 'serre'), 'Il faut d’abord le rang Hameau : encore 1 habitant.');
  assert.throws(() => step(w, construire, { type: 'serre' }, at(ETE)), { message: 'Il faut d’abord le rang Hameau : encore 1 habitant.' });
  w.game.habitants = 3;
  assert.equal(refusConstruire(w.game, 'serre'), null);
  // les autres bâtiments du Hameau gardent leur ancienne phrase
  w.game.habitants = 2;
  assert.equal(refusConstruire(w.game, 'grenier'), 'Hameau : encore 1 habitant.');
});

test('construire la seconde : identifiant serre-2, même prix que la première, puis plus d’emplacement', () => {
  const w = monde(ETE, { batiments: [ATELIER, SERRE1], habitants: 3 });
  const { world, r } = step(w, construire, { type: 'serre' }, at(ETE));
  const c = BATIMENTS.serre.cout;
  assert.deepEqual(world.game.batiments.map((b) => b.id), ['atelier-1', 'serre-1', 'serre-2']);
  assert.deepEqual(world.game.resources, { energy: 60 - c.energy, materials: 200 - c.materials, food: 0 });
  assert.deepEqual(r.events, [{ type: 'construction', id: 'serre-2', batiment: 'serre', cout: c }]);
  assert.equal(compte(world.game, 'serre'), 2);
  assert.equal(refusConstruire(world.game, 'serre'), 'Plus d’emplacement libre pour une petite serre.');
});

test('le rang se lit sur l’emplacement visé : serre-2 refusé au campement même sans aucune serre, serre-1 reste permis', () => {
  const camp = monde(ETE, { batiments: [ATELIER], habitants: 1 });
  assert.equal(refusConstruire(camp.game, 'serre', 'serre-1'), null);
  assert.equal(refusConstruire(camp.game, 'serre', 'serre-2'), 'Il faut d’abord le rang Hameau : encore 2 habitants.');
  assert.throws(() => step(camp, construire, { type: 'serre', id: 'serre-2' }, at(ETE)), /rang Hameau/);
  assert.equal(step(camp, construire, { type: 'serre', id: 'serre-1' }, at(ETE)).world.game.batiments.at(-1).id, 'serre-1');
  // au Hameau, on peut poser la seconde la première ; la première libre est alors serre-1, au rang du campement
  const hameau = monde(ETE, { batiments: [ATELIER], habitants: 3 });
  const deuxFirst = step(hameau, construire, { type: 'serre', id: 'serre-2' }, at(ETE)).world;
  assert.equal(refusConstruire(deuxFirst.game, 'serre'), null);
  assert.deepEqual(step(deuxFirst, construire, { type: 'serre' }, at(ETE)).world.game.batiments.map((b) => b.id), ['atelier-1', 'serre-2', 'serre-1']);
  // un emplacement déjà bâti, ou hors catalogue
  assert.throws(() => step(deuxFirst, construire, { type: 'serre', id: 'serre-2' }, at(ETE)), { message: 'Cet emplacement est déjà bâti.' });
  assert.throws(() => step(deuxFirst, construire, { type: 'serre', id: 'serre-3' }, at(ETE)), { message: 'Emplacement inconnu.' });
});

test('semis et récolte de serre-2 : indépendants de serre-1, mûrs après le même nombre de jours travaillés', () => {
  let w = monde(ETE, { batiments: [ATELIER, SERRE1, SERRE2], habitants: 3 });
  assert.equal(refusSemer(w.game, w.ledger, 'serre-2', at(ETE)), null);
  const s = step(w, semer, { id: 'serre-2' }, at(ETE));
  w = s.world;
  assert.deepEqual(s.r.events, [{ type: 'semis', id: 'serre-2', lieu: 'serre', cout: { energy: SEMIS.serre, materials: 0 }, chauffage: 0 }]);
  assert.deepEqual(w.game.parcelles, [{ id: 'serre-2', semeLe: ETE }]);
  assert.equal(w.game.resources.energy, 60 - SEMIS.serre);
  assert.equal(etatCulture(w.game, w.ledger, 'serre-1', at(ETE)).semee, false); // la première n'est pas semée pour autant
  assert.equal(refusSemer(w.game, w.ledger, 'serre-2', at(ETE)), 'C’est déjà semé.');
  let day = ETE;
  for (let k = 1; k <= CULTURE.jours; k++) {
    assert.equal(etatCulture(w.game, w.ledger, 'serre-2', at(day, 20)).mure, false, `avant le jour travaillé n° ${k}`);
    day = plusJours(day, 1);
    w = travaille(w, day);
  }
  assert.equal(etatCulture(w.game, w.ledger, 'serre-2', at(day, 20)).mure, true);
  assert.equal(refusRecolter(w.game, w.ledger, 'serre-2', at(day, 20)), null);
  const r = step(w, recolter, { id: 'serre-2' }, at(day, 20));
  assert.equal(r.world.game.resources.food, CULTURE.recolte);
  assert.equal(r.r.events[0].lieu, 'serre');
  assert.deepEqual(r.world.game.parcelles, []);
  // une serre-2 qui n'existe pas : même raison que pour serre-1
  const sans = monde(ETE, { batiments: [ATELIER, SERRE1] });
  assert.equal(refusSemer(sans.game, sans.ledger, 'serre-2', at(ETE)), 'Il faut d’abord une petite serre.');
});

test('chauffage d’hiver : chaque serre coûte son semis plus le chauffage, de novembre à avril', () => {
  for (const id of ['serre-1', 'serre-2']) {
    assert.deepEqual(coutSemis(id, ETE), { energy: SEMIS.serre, chauffage: 0 }, id);
    assert.deepEqual(coutSemis(id, HIVER), { energy: SEMIS.serre + CHAUFFAGE, chauffage: CHAUFFAGE }, id);
  }
  let w = monde(HIVER, { batiments: [ATELIER, SERRE1, SERRE2], habitants: 3 });
  w = step(w, semer, { id: 'serre-1' }, at(HIVER)).world;
  const s = step(w, semer, { id: 'serre-2' }, at(HIVER));
  assert.equal(s.world.game.resources.energy, 60 - 2 * (SEMIS.serre + CHAUFFAGE));
  assert.deepEqual(s.r.events[0].cout, { energy: SEMIS.serre + CHAUFFAGE, materials: 0 });
  assert.equal(s.r.events[0].chauffage, CHAUFFAGE);
  // sans assez d'Énergie pour chauffer
  const pauvre = monde(HIVER, { batiments: [ATELIER, SERRE1, SERRE2] });
  pauvre.game.resources.energy = SEMIS.serre;
  assert.equal(refusSemer(pauvre.game, [], 'serre-2', at(HIVER)), `Il manque ${CHAUFFAGE} Énergie.`);
});

test('effet du niveau d’Atelier : la récolte monte à 5 dans les deux serres, pas au potager', () => {
  let w = monde(ETE, { batiments: [ATELIER, SERRE1, SERRE2], habitants: 3, parcelles: [{ id: 'serre-1', semeLe: ETE }, { id: 'serre-2', semeLe: ETE }, { id: 'parcelle-1', semeLe: ETE }] });
  w.game.niveaux.atelier = 1;
  let day = ETE;
  for (let k = 0; k < CULTURE.jours; k++) { day = plusJours(day, 1); w = travaille(w, day); }
  const food = (id) => step(w, recolter, { id }, at(day, 20)).r.events[0].nourriture;
  assert.equal(food('serre-1'), CULTURE.recolte + 1);
  assert.equal(food('serre-2'), CULTURE.recolte + 1);
  assert.equal(food('parcelle-1'), CULTURE.recolte);
});

test('l’objectif « semer » reste sur serre-1, même avec deux serres debout', () => {
  const w = monde(HIVER, { batiments: [{ id: 'chalet-1', type: 'chalet' }, ATELIER, SERRE1, SERRE2], habitants: 0 });
  w.game.premiersPas = { chalet: '2026-10-01', tache: '2026-10-01', terminer: '2026-10-01' };
  w.ledger = [{ key: 'reward:q0:1', type: 'reward', taskId: 'q0', occurrence: 1, day: '2026-10-01' }];
  assert.deepEqual(prochainGeste(w.tasks, w.game, w.ledger, at(HIVER)), { pas: 'semer', geste: 'semer', cible: 'serre-1', raison: null });
});

test('île : les deux emplacements de la serre ne se chevauchent avec aucun autre bâtiment ni repère', () => {
  const rects = [
    ...Object.entries(EMPLACEMENTS).flatMap(([type, list]) => list.map((e, i) => [`${type}-${i + 1}`, e])),
    ...LANDMARKS.map((e) => [e.id, e]),
  ];
  const dedans = (a, b) => a.r < b.r + b.h && b.r < a.r + a.h && a.c < b.c + b.w && b.c < a.c + a.w;
  for (const [id, e] of rects.filter(([id]) => id.startsWith('serre-'))) {
    for (const [autre, f] of rects) {
      if (autre === id) continue;
      assert.equal(dedans(e, f), false, `${id} chevauche ${autre}`);
    }
    assert.ok(e.r >= 0 && e.c >= 0 && e.r + e.h <= 12 && e.c + e.w <= 12, `${id} sort de l’île`);
  }
});

test('vue de l’île au campement : serre-2 verrouillée (rang Hameau), serre-1 libre, chacune selon son emplacement', () => {
  const w = monde(ETE, { batiments: [ATELIER, { id: 'chalet-1', type: 'chalet' }], habitants: 0 });
  const serres = (g) => batimentsView(g, [], new Date(at(ETE))).filter((b) => b.type === 'serre').map((b) => [b.id, b.refus]);
  assert.deepEqual(serres(w.game), [['serre-1', null], ['serre-2', 'Il faut d’abord le rang Hameau\u00a0: encore 3 habitants.']]);
  // serre-1 bâtie : serre-2 reste verrouillée tant qu'on n'a pas 3 habitants, puis s'ouvre
  const w2 = monde(ETE, { batiments: [ATELIER, SERRE1], habitants: 0 });
  assert.deepEqual(serres(w2.game), [['serre-1', null], ['serre-2', 'Il faut d’abord le rang Hameau\u00a0: encore 3 habitants.']]);
  w2.game.habitants = 3;
  assert.deepEqual(serres(w2.game), [['serre-1', null], ['serre-2', null]]);
});
