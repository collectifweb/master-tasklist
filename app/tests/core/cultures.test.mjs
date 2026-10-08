// Cultures (bible §3 et §6, lot 4) : potager de mai à octobre, tout mûrit d'un coup le 1er novembre ; petite serre
// toute l'année, avec un chauffage en Énergie choisi et affiché de novembre à avril ; une culture pousse les jours où
// tu travailles ; la récolte donne de la Nourriture, plafonnée par le stockage (le grenier l'augmente).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CULTURE, SEMIS, CHAUFFAGE, STOCKAGE, GRENIER_STOCKAGE, semer, recolter, refusSemer, refusRecolter, etatCulture,
  coutSemis, stockage, joursTravailles, completeQuest, remballerQuest, jourSuivant,
} from '../../core/index.js';
import { fresh, step, task, avantLeChalet } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`; // 10 h à Montréal en été, 9 h l'hiver
const MAI = '2026-06-10';
const monde = (day = MAI, over = {}) => {
  const w = fresh([], at(day));
  w.game.resources = { energy: 40, materials: 40, food: 0 };
  avantLeChalet(w.game);
  Object.assign(w.game, over);
  w.tasks = Array.from({ length: 12 }, (_, k) => task({ id: `q${k}`, created: '2026-01-01' }));
  return w;
};
const avecSerre = (day, over) => monde(day, { batiments: [{ id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }], ...over });
let n = 0;
/** Une quête terminée ce jour-là (un jour travaillé). */
const travaille = (w, day) => step(w, completeQuest, { id: `q${n++ % 12}` }, at(day, 15)).world;
const plusJours = (day, k) => new Date(Date.parse(day + 'T12:00:00Z') + k * 86400000).toISOString().slice(0, 10);

test('constantes : une culture pousse en jours travaillés, rapporte de la Nourriture ; stockage et grenier', () => {
  assert.ok(Number.isInteger(CULTURE.jours) && CULTURE.jours >= 2);
  assert.ok(CULTURE.recolte > 0);
  assert.ok(SEMIS.potager > 0 && SEMIS.serre > 0 && CHAUFFAGE > 0);
  assert.ok(GRENIER_STOCKAGE > 0);
  assert.equal(stockage(monde().game), STOCKAGE);
  assert.equal(stockage(monde(MAI, { habitants: 3, batiments: [{ id: 'grenier-1', type: 'grenier' }] }).game), STOCKAGE + GRENIER_STOCKAGE);
});

test('semer au potager (parcelle de départ) : coûte de l’Énergie, la culture est en terre', () => {
  const w = monde();
  const { world, r } = step(w, semer, { id: 'parcelle-1' }, at(MAI));
  assert.equal(world.game.resources.energy, 40 - SEMIS.potager);
  assert.deepEqual(world.game.parcelles, [{ id: 'parcelle-1', semeLe: MAI }]);
  assert.deepEqual(r.events, [{ type: 'semis', id: 'parcelle-1', lieu: 'potager', cout: { energy: SEMIS.potager, materials: 0 }, chauffage: 0 }]);
  assert.deepEqual(r.entries, []);
});

test('une culture pousse les jours où tu travailles, pas les autres ; le jour du semis ne compte pas', () => {
  let w = travaille(monde(), MAI); // déjà travaillé avant de semer : ce jour ne compte pas
  w = step(w, semer, { id: 'parcelle-1' }, at(MAI, 16)).world;
  let day = MAI;
  for (let k = 1; k <= CULTURE.jours; k++) {
    const st = etatCulture(w.game, w.ledger, 'parcelle-1', at(day, 20));
    assert.equal(st.mure, false, `avant le jour travaillé n° ${k}`);
    assert.equal(st.reste, CULTURE.jours - k + 1);
    day = plusJours(day, 2); // un jour sur deux : les jours sans quête ne comptent pas
    w = travaille(w, day);
  }
  const st = etatCulture(w.game, w.ledger, 'parcelle-1', at(day, 20));
  assert.deepEqual([st.mure, st.reste, st.jours], [true, 0, CULTURE.jours]);
  assert.equal(joursTravailles(w.ledger, MAI, day), CULTURE.jours);
});

test('une quête remballée ne compte plus comme jour travaillé', () => {
  let w = step(monde(), semer, { id: 'parcelle-1' }, at(MAI)).world;
  const d1 = plusJours(MAI, 1);
  w = travaille(w, d1);
  assert.equal(etatCulture(w.game, w.ledger, 'parcelle-1', at(d1, 20)).jours, 1);
  const id = w.ledger.find((e) => e.type === 'reward' && e.day === d1).taskId;
  w = step(w, remballerQuest, { id }, at(d1, 16)).world;
  assert.equal(etatCulture(w.game, w.ledger, 'parcelle-1', at(d1, 20)).jours, 0);
});

test('« Jour suivant » (version d’essai) : la date avance et, avec une quête, la culture pousse', () => {
  let w = step(monde(), semer, { id: 'parcelle-1' }, at(MAI)).world;
  w = step(w, jourSuivant, {}, at(MAI)).world;
  assert.equal(w.game.horloge.decalage, 1);
  w = travaille(w, plusJours(MAI, 1)); // l'interface lit la date décalée : la quête tombe le lendemain
  assert.equal(etatCulture(w.game, w.ledger, 'parcelle-1', at(plusJours(MAI, 1), 20)).jours, 1);
});

test('récolter : +Nourriture, la parcelle se libère ; pas avant d’être mûre (raison écrite)', () => {
  let w = step(monde(), semer, { id: 'parcelle-1' }, at(MAI)).world;
  assert.equal(refusRecolter(w.game, w.ledger, 'parcelle-1', at(MAI, 20)), `Pas encore mûr\u00a0: encore ${CULTURE.jours} jours travaillés.`);
  let day = MAI;
  for (let k = 0; k < CULTURE.jours - 1; k++) { day = plusJours(day, 1); w = travaille(w, day); }
  assert.equal(refusRecolter(w.game, w.ledger, 'parcelle-1', at(day, 20)), 'Pas encore mûr\u00a0: encore 1 jour travaillé.');
  day = plusJours(day, 1);
  w = travaille(w, day);
  const { world, r } = step(w, recolter, { id: 'parcelle-1' }, at(day, 20));
  assert.equal(world.game.resources.food, CULTURE.recolte);
  assert.deepEqual(world.game.parcelles, []);
  assert.deepEqual(r.events, [{ type: 'recolte', id: 'parcelle-1', lieu: 'potager', nourriture: CULTURE.recolte, perdu: 0, stock: CULTURE.recolte, max: STOCKAGE }]);
  assert.equal(refusRecolter(world.game, world.ledger, 'parcelle-1', at(day, 20)), 'Rien n’est semé ici.');
});

test('récolte plafonnée par le stockage ; réserve pleine : on récolte quand même, rien n’entre, la place se libère', () => {
  let w = monde(MAI, { parcelles: [{ id: 'parcelle-1', semeLe: '2026-05-01' }] });
  for (let k = 1; k <= CULTURE.jours; k++) w = travaille(w, plusJours('2026-05-01', k));
  w.game.resources.food = STOCKAGE - 1;
  const { world, r } = step(w, recolter, { id: 'parcelle-1' }, at(MAI));
  assert.equal(world.game.resources.food, STOCKAGE);
  assert.equal(r.events[0].nourriture, 1);
  assert.equal(r.events[0].perdu, CULTURE.recolte - 1);
  // réserve pleine (décision d'Alex du 7 octobre au soir) : la récolte n'est plus refusée ; tout est perdu, la parcelle se libère
  w.game.resources.food = STOCKAGE;
  assert.equal(refusRecolter(w.game, w.ledger, 'parcelle-1', at(MAI)), null);
  const plein = step(w, recolter, { id: 'parcelle-1' }, at(MAI));
  assert.equal(plein.world.game.resources.food, STOCKAGE);
  assert.deepEqual([plein.r.events[0].nourriture, plein.r.events[0].perdu], [0, CULTURE.recolte]);
  assert.deepEqual(plein.world.game.parcelles, []);
  assert.equal(refusSemer(plein.world.game, plein.world.ledger, 'parcelle-1', at(MAI)), null);
});

test('le grenier augmente le stockage : la même récolte entre en entier', () => {
  let w = monde(MAI, { habitants: 3, batiments: [{ id: 'grenier-1', type: 'grenier' }], parcelles: [{ id: 'parcelle-1', semeLe: '2026-05-01' }] });
  for (let k = 1; k <= CULTURE.jours; k++) w = travaille(w, plusJours('2026-05-01', k));
  w.game.resources.food = STOCKAGE;
  assert.equal(step(w, recolter, { id: 'parcelle-1' }, at(MAI)).world.game.resources.food, STOCKAGE + CULTURE.recolte);
});

test('potager : de mai à octobre seulement ; de novembre à avril, il dort (raison écrite)', () => {
  for (const d of ['2026-05-01', '2026-07-15', '2026-10-31']) assert.equal(refusSemer(monde(d).game, [], 'parcelle-1', at(d)), null, d);
  for (const d of ['2026-11-01', '2026-12-20', '2027-02-10', '2027-04-30']) {
    assert.equal(refusSemer(monde(d).game, [], 'parcelle-1', at(d)), 'Le potager dort de novembre à avril\u00a0: sème dans la petite serre.', d);
    assert.throws(() => step(monde(d), semer, { id: 'parcelle-1' }, at(d)), /dort de novembre à avril/);
  }
});

test('1er novembre : ce qui est en terre au potager mûrit d’un coup, sans perte', () => {
  let w = step(monde('2026-10-30'), semer, { id: 'parcelle-1' }, at('2026-10-30')).world;
  assert.equal(etatCulture(w.game, w.ledger, 'parcelle-1', at('2026-10-31', 20)).mure, false);
  const st = etatCulture(w.game, w.ledger, 'parcelle-1', at('2026-11-01'));
  assert.deepEqual([st.mure, st.reste], [true, 0]); // aucun jour travaillé depuis : mûre quand même
  // la culture attend la récolte tout l'hiver
  assert.equal(etatCulture(w.game, w.ledger, 'parcelle-1', at('2027-01-15')).mure, true);
  const r = step(w, recolter, { id: 'parcelle-1' }, at('2026-11-03'));
  assert.equal(r.world.game.resources.food, CULTURE.recolte);
});

test('petite serre : toute l’année ; de novembre à avril, le chauffage coûte de l’Énergie en plus, affiché et choisi', () => {
  assert.deepEqual(coutSemis('serre-1', '2026-07-01'), { energy: SEMIS.serre, chauffage: 0 });
  assert.deepEqual(coutSemis('serre-1', '2026-12-01'), { energy: SEMIS.serre + CHAUFFAGE, chauffage: CHAUFFAGE });
  assert.deepEqual(coutSemis('parcelle-1', '2026-07-01'), { energy: SEMIS.potager, chauffage: 0 });
  const d = '2026-12-01';
  const { world, r } = step(avecSerre(d), semer, { id: 'serre-1' }, at(d));
  assert.equal(world.game.resources.energy, 40 - SEMIS.serre - CHAUFFAGE);
  assert.deepEqual(r.events, [{ type: 'semis', id: 'serre-1', lieu: 'serre', cout: { energy: SEMIS.serre + CHAUFFAGE, materials: 0 }, chauffage: CHAUFFAGE }]);
  // l'été, aucun chauffage
  assert.equal(step(avecSerre(MAI), semer, { id: 'serre-1' }, at(MAI)).world.game.resources.energy, 40 - SEMIS.serre);
});

test('petite serre l’hiver : elle pousse et se récolte comme le potager, sans dépendre du 1er novembre', () => {
  const d = '2026-12-01';
  let w = step(avecSerre(d), semer, { id: 'serre-1' }, at(d)).world;
  assert.equal(etatCulture(w.game, w.ledger, 'serre-1', at('2027-01-20')).mure, false); // pas de mûrissement d'un coup
  let day = d;
  for (let k = 0; k < CULTURE.jours; k++) { day = plusJours(day, 1); w = travaille(w, day); }
  assert.equal(step(w, recolter, { id: 'serre-1' }, at(day, 20)).world.game.resources.food, CULTURE.recolte);
});

test('refus de semer : déjà semé, emplacement pas construit, Énergie qui manque', () => {
  const w = step(monde(), semer, { id: 'parcelle-1' }, at(MAI)).world;
  assert.equal(refusSemer(w.game, w.ledger, 'parcelle-1', at(MAI)), 'C’est déjà semé.');
  assert.equal(refusSemer(w.game, w.ledger, 'parcelle-2', at(MAI)), 'Il faut d’abord une parcelle ici.');
  assert.equal(refusSemer(w.game, w.ledger, 'serre-1', at(MAI)), 'Il faut d’abord une petite serre.');
  assert.equal(refusSemer(w.game, w.ledger, 'chalet-1', at(MAI)), 'On ne sème pas ici.');
  const pauvre = monde();
  pauvre.game.resources.energy = SEMIS.potager - 1;
  assert.equal(refusSemer(pauvre.game, [], 'parcelle-1', at(MAI)), 'Il manque 1 Énergie.');
  const hiver = avecSerre('2026-12-01');
  hiver.game.resources.energy = SEMIS.serre; // assez pour semer, pas pour chauffer
  assert.equal(refusSemer(hiver.game, [], 'serre-1', at('2026-12-01')), `Il manque ${CHAUFFAGE} Énergie.`);
});
