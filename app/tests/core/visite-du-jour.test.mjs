// La visite du jour (lot J, décision 45 de la bible) : dès la première ouverture du jour, les cultures poussent et les
// bâtiments producteurs donnent leur part, sans quête. Un jour de visite : une ligne d'ouverture au registre
// (bonus:ouverture:{jour}), ou une quête payée et non remballée. Remballer ne reprend plus rien aux bâtiments.
// Titres fictifs génériques.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EOLIENNE_ENERGIE, PRODUCTION, CULTURE, addDays, openApp, advanceTime, completeQuest, remballerQuest, semer, etatCulture,
  joursVisites, stockage, construire,
} from '../../core/index.js';
import { fresh, step, task, avantLeChalet } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const D = '2026-10-06';
const monde = (types = [], day = D) => {
  const w = fresh(Array.from({ length: 4 }, (_, k) => task({ id: `q${k}`, created: '2026-10-01' })), at(day));
  avantLeChalet(w.game);
  w.game.habitants = 6;
  w.game.resources = { energy: 10, materials: 10, food: 5 };
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, ...types.map((type) => ({ id: `${type}-1`, type }))];
  return w;
};
// ce que fait l'interface à l'ouverture : openApp, puis le passage du temps
const visite = (w, day, h = 14) => step(step(w, openApp, {}, at(day, h)).world, advanceTime, {}, at(day, h));
const prod = (ledger, type) => ledger.filter((e) => e.type === 'prod' && e.batiment === type);

test('ouvrir le jeu sans quête : l’éolienne, la scierie et le poulailler donnent leur part, une fois dans la journée', () => {
  let { world: w } = visite(monde(['eolienne', 'scierie', 'poulailler']), D);
  assert.equal(w.ledger.filter((e) => e.type === 'reward').length, 0, 'aucune quête');
  assert.deepEqual(prod(w.ledger, 'eolienne').map((e) => [e.key, e.energy]), [[`prod:eolienne:${D}`, EOLIENNE_ENERGIE]]);
  assert.deepEqual(prod(w.ledger, 'scierie').map((e) => [e.key, e.materials]), [[`prod:scierie:${D}`, PRODUCTION.scierie.materials]]);
  assert.deepEqual(prod(w.ledger, 'poulailler').map((e) => [e.key, e.food]), [[`prod:poulailler:${D}`, PRODUCTION.poulailler.food]]);
  w = visite(w, D, 18).world; // seconde ouverture du même jour
  for (const type of ['eolienne', 'scierie', 'poulailler']) assert.equal(prod(w.ledger, type).length, 1, type);
  w = visite(w, addDays(D, 1)).world;
  for (const type of ['eolienne', 'scierie', 'poulailler']) assert.equal(prod(w.ledger, type).length, 2, type);
  assert.equal(prod(w.ledger, 'cabane').length, 0);
});

test('au temps des sucres, la cabane donne aussi à la visite', () => {
  const day = '2027-03-10';
  const { world } = visite(monde(['cabane'], day), day);
  assert.deepEqual(prod(world.ledger, 'cabane').map((e) => [e.key, e.food]), [[`prod:cabane:${day}`, PRODUCTION.cabane.food]]);
});

test('une quête payée ne fait plus produire : c’est le passage du temps qui suit qui le fait, une fois', () => {
  let w = step(monde(['eolienne', 'scierie']), completeQuest, { id: 'q0' }, at(D)).world;
  assert.equal(prod(w.ledger, 'eolienne').length + prod(w.ledger, 'scierie').length, 0);
  w = step(w, advanceTime, {}, at(D)).world;
  w = step(w, completeQuest, { id: 'q1' }, at(D, 15)).world;
  w = step(w, advanceTime, {}, at(D, 15)).world;
  assert.equal(prod(w.ledger, 'eolienne').length, 1);
  assert.equal(prod(w.ledger, 'scierie').length, 1);
});

test('remballer la seule quête payée du jour ne reprend rien aux bâtiments', () => {
  let w = visite(monde(['eolienne', 'scierie']), D).world;
  w = step(w, completeQuest, { id: 'q0' }, at(D, 15)).world;
  const avant = w.game.resources;
  const quete = w.ledger.find((e) => e.key === 'reward:q0:1');
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at(D, 16));
  assert.equal(r.entries.filter((e) => e.type === 'prod').length, 0, 'aucune reprise');
  assert.equal(r.events.filter((e) => e.type === 'eolienne-reprise').length, 0);
  assert.equal(world.game.resources.energy, Math.round((avant.energy - quete.energy) * 10) / 10, 'seul le gain de la quête est repris');
  assert.equal(world.game.resources.materials, Math.round((avant.materials - quete.materials) * 10) / 10);
});

test('jours de visite : ligne d’ouverture ou quête payée non remballée, après `apres` et jusqu’à `jusqua` inclus', () => {
  const ledger = [
    { key: 'bonus:ouverture:2026-10-05' }, // entrée réduite à sa clé (plus de 60 jours au registre du serveur)
    { key: 'bonus:ouverture:2026-10-07', type: 'bonus', bonus: 'ouverture', day: '2026-10-07' },
    { key: 'reward:a:1', type: 'reward', taskId: 'a', occurrence: 1, day: '2026-10-08' },
    { key: 'bonus:ouverture:2026-10-08', type: 'bonus', bonus: 'ouverture', day: '2026-10-08' },
    { key: 'reward:b:1', type: 'reward', taskId: 'b', occurrence: 1, day: '2026-10-09' },
    { key: 'reverse:b:1', type: 'reverse', taskId: 'b', occurrence: 1, day: '2026-10-09' },
    { key: 'bonus:ajout:2026-10-10:1', type: 'bonus', bonus: 'ajout', day: '2026-10-10' },
  ];
  assert.equal(joursVisites(ledger, '2026-10-05', '2026-10-10'), 2, 'le 7 et le 8 ; le 9 remballé, le 10 sans ouverture');
  assert.equal(joursVisites(ledger, '2026-10-04', '2026-10-07'), 2, 'le 5 et le 7');
});

test(`une culture mûrit après ${CULTURE.jours} jours de visite, quête faite ou non ; un jour sans ouvrir le jeu ne compte pas`, () => {
  let w = monde();
  w.game.resources.energy = 20;
  w = step(w, semer, { id: 'parcelle-1' }, at(D)).world;
  for (const n of [1, 2, 4, 5]) w = visite(w, addDays(D, n)).world; // le 3e jour, le jeu reste fermé
  let c = etatCulture(w.game, w.ledger, 'parcelle-1', at(addDays(D, 5)));
  assert.deepEqual([c.jours, c.reste, c.mure], [4, 1, false]);
  w = visite(w, addDays(D, 6)).world;
  c = etatCulture(w.game, w.ledger, 'parcelle-1', at(addDays(D, 6)));
  assert.deepEqual([c.jours, c.reste, c.mure], [5, 0, true]);
});

test('un jour de visite pendant le gel ne compte pas pour la pousse', () => {
  let w = monde();
  w.game.resources.energy = 20;
  w = step(w, semer, { id: 'parcelle-1' }, at(D)).world;
  const le = addDays(D, 2);
  w.game.degats = [{ id: `gel:${le}`, type: 'gel', cible: 'parcelle-1', le, jusqua: addDays(le, 1), semeLe: D }];
  for (const n of [1, 2, 3]) w = visite(w, addDays(D, n)).world;
  assert.equal(etatCulture(w.game, w.ledger, 'parcelle-1', at(addDays(D, 3))).jours, 2, 'le jour de gel ne compte pas');
});

test('éolienne en panne : rien à la visite, et l’avis « arrêtée » une seule fois dans la journée', () => {
  const w0 = monde(['eolienne']);
  w0.game.degats = [{ id: `panne:${D}`, type: 'panne', cible: 'eolienne-1', le: D, jusqua: addDays(D, 3) }];
  const v = visite(w0, D);
  assert.equal(prod(v.world.ledger, 'eolienne').length, 0);
  assert.deepEqual(v.r.events.filter((e) => e.type === 'eolienne-arretee').map((e) => e.energy), [EOLIENNE_ENERGIE]);
  const encore = step(v.world, advanceTime, {}, at(D, 18));
  assert.equal(encore.r.events.filter((e) => e.type === 'eolienne-arretee').length, 0);
});

test('réserve pleine : le poulailler ne donne rien ; le passage suivant du même jour réessaie', () => {
  const w0 = monde(['poulailler']);
  w0.game.resources.food = stockage(w0.game);
  let w = visite(w0, D).world;
  assert.equal(prod(w.ledger, 'poulailler').length, 0);
  w.game.resources.food = 10; // dépensée entre-temps
  w = step(w, advanceTime, {}, at(D, 18)).world;
  assert.deepEqual(prod(w.ledger, 'poulailler').map((e) => [e.day, e.food]), [[D, PRODUCTION.poulailler.food]]);
});

test('une visite faite hors ligne, rejouée après le jour suivant, produit pour son propre jour, une fois', () => {
  const lendemain = addDays(D, 1);
  let w = visite(monde(['eolienne']), lendemain).world; // un autre appareil a déjà ouvert le lendemain
  w = visite(w, D, 15).world; // la file hors ligne rejoue la visite de la veille, à son heure
  w = visite(w, D, 15).world; // et une seconde fois
  assert.deepEqual(prod(w.ledger, 'eolienne').map((e) => e.day).sort(), [D, lendemain]);
});

test('un producteur bâti pendant la visite donne sa part du jour tout de suite, une fois ; bâtir autre chose ne fait rien produire', () => {
  const w0 = monde([]);
  w0.game.resources = { energy: 50, materials: 100, food: 5 };
  let w = visite(w0, D).world;
  const { world, r } = step(w, construire, { type: 'scierie' }, at(D, 15));
  assert.deepEqual(prod(world.ledger, 'scierie').map((e) => [e.day, e.materials]), [[D, PRODUCTION.scierie.materials]]);
  assert.ok(r.events.some((e) => e.type === 'reward' && e.source === 'scierie'));
  w = step(world, advanceTime, {}, at(D, 16)).world;
  assert.equal(prod(w.ledger, 'scierie').length, 1, 'pas deux fois le même jour');
  w = step(w, construire, { type: 'eolienne' }, at(D, 17)).world;
  assert.deepEqual(prod(w.ledger, 'eolienne').map((e) => e.energy), [EOLIENNE_ENERGIE]);
  const tour = step(w, construire, { type: 'tour' }, at(D, 18));
  assert.equal(tour.r.entries.filter((e) => e.type === 'prod').length, 0);
});
