// Ce que la Nourriture achète (lot N, choix d'Alex du 9 octobre 2026) : le repas de la semaine (de la Nourriture contre de
// l'Énergie, une fois par semaine, le jour choisi), la partie de sucre (objectif de printemps « Faire les sucres », sans
// cabane, en mars et avril) et le sirop (ce que la cabane à sucre ne peut pas ranger dans une réserve pleine part au
// marchand, contre de l'Énergie ; il faut le quai). Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPAS, SIROP, PRODUCTION, OBJECTIFS_SAISON, repasDeLaSemaine, refusServirRepas, servirRepas, prixPartieDeSucre,
  refusFaireLesSucres, faireLesSucres, objectifSaison, completeQuest, remballerQuest, stockage, weekStart, addDays,
} from '../../core/index.js';
import { fresh, step, task, avantLeChalet } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const MARS = '2027-03-16'; // un mardi au temps des sucres
const monde = (day, { types = [], habitants = 3, food = 20 } = {}) => {
  const w = fresh(Array.from({ length: 4 }, (_, k) => task({ id: `q${k}`, created: '2026-10-01' })), at(day));
  avantLeChalet(w.game);
  w.game.habitants = habitants;
  w.game.resources = { energy: 10, materials: 10, food };
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, ...types.map((type) => ({ id: `${type}-1`, type }))];
  return w;
};
const prod = (ledger, type) => ledger.filter((e) => e.type === 'prod' && e.batiment === type);

// ───────── Le repas de la semaine

test('repas : il attend une première famille, et assez de Nourriture', () => {
  const D = '2026-10-06';
  assert.equal(refusServirRepas(monde(D, { habitants: 0 }).game, [], {}, at(D)), 'Le repas attend une première famille au village.');
  const w = monde(D, { food: REPAS.donne.food - 2.5 });
  assert.equal(refusServirRepas(w.game, w.ledger, {}, at(D)), 'Il manque 3 Nourriture.');
  assert.equal(refusServirRepas(monde(D).game, [], {}, at(D)), null);
});

test('repas : servi, la Nourriture part et l’Énergie arrive au registre sous repas:{lundi} ; une fois par semaine, le jour choisi', () => {
  const D = '2026-10-08'; // un jeudi
  const lundi = weekStart(D);
  const { world: w, r } = step(monde(D), servirRepas, {}, at(D));
  assert.equal(w.game.resources.food, 20 - REPAS.donne.food);
  assert.equal(w.game.resources.energy, 10 + REPAS.recoit.energy);
  const e = r.entries.find((x) => x.type === 'repas');
  assert.deepEqual({ ...e, at: undefined }, { key: `repas:${lundi}`, at: undefined, day: D, type: 'repas', semaine: lundi, pe: 0, energy: REPAS.recoit.energy, materials: 0 });
  assert.ok(r.events.some((x) => x.type === 'repas' && x.donne.food === REPAS.donne.food && x.recoit.energy === REPAS.recoit.energy));
  assert.deepEqual(repasDeLaSemaine(w.game, w.ledger, at(D)), { semaine: lundi, servi: true, donne: REPAS.donne, recoit: REPAS.recoit });
  // le dimanche de la même semaine : déjà servi ; le lundi suivant, de nouveau
  w.game.resources.food = 40;
  assert.equal(refusServirRepas(w.game, w.ledger, {}, at(addDays(lundi, 6))), 'Déjà servi cette semaine : le prochain repas, lundi.');
  assert.throws(() => step(w, servirRepas, {}, at(addDays(lundi, 6))), /Déjà servi/);
  const suivant = step(w, servirRepas, {}, at(addDays(lundi, 7))).world;
  assert.deepEqual(suivant.ledger.filter((x) => x.type === 'repas').map((x) => x.key), [`repas:${lundi}`, `repas:${addDays(lundi, 7)}`]);
});

test('repas : deux appareils la même semaine, le second est refusé (la clé est déjà au registre)', () => {
  const D = '2026-10-06';
  const a = step(monde(D), servirRepas, {}, at(D)).world;
  const b = monde(D, { food: 40 });
  b.ledger = [...b.ledger, ...a.ledger.filter((x) => x.type === 'repas')];
  assert.match(refusServirRepas(b.game, b.ledger, {}, at(D, 18)), /Déjà servi/);
});

test('repas : il ne touche à aucune tâche', () => {
  const D = '2026-10-06';
  const w0 = monde(D);
  const { world, r } = step(w0, servirRepas, {}, at(D));
  assert.deepEqual(world.tasks, w0.tasks);
  assert.equal(r.ops.filter((o) => o.type.startsWith('task.')).length, 0);
});

// ───────── Le sirop au marchand

test('sirop : réserve pleine, la cabane vend au marchand ce qu’elle ne peut pas ranger, contre de l’Énergie', () => {
  const w = monde(MARS, { types: ['cabane', 'quai'] });
  w.game.resources.food = stockage(w.game);
  const { world, r } = step(w, completeQuest, { id: 'q0' }, at(MARS));
  const p = prod(world.ledger, 'cabane');
  assert.equal(p.length, 1);
  assert.deepEqual([p[0].food, p[0].energy], [0, PRODUCTION.cabane.food * SIROP.energie]);
  assert.ok(r.events.some((e) => e.type === 'reward' && e.source === 'cabane' && e.energy === PRODUCTION.cabane.food * SIROP.energie));
  // une deuxième quête le même jour ne refait pas de sirop
  const again = step(world, completeQuest, { id: 'q1' }, at(MARS, 15)).world;
  assert.equal(prod(again.ledger, 'cabane').length, 1);
});

test('sirop : la place qui reste prend la Nourriture, le reste part en sirop', () => {
  const w = monde(MARS, { types: ['cabane', 'quai'] });
  w.game.resources.food = stockage(w.game) - 1;
  const p = prod(step(w, completeQuest, { id: 'q0' }, at(MARS)).world.ledger, 'cabane');
  assert.deepEqual([p[0].food, p[0].energy], [1, (PRODUCTION.cabane.food - 1) * SIROP.energie]);
});

test('sirop : sans quai, pas de marchand, rien ne part ; le poulailler, lui, ne fait jamais de sirop ; hors saison, rien', () => {
  const sans = monde(MARS, { types: ['cabane'] });
  sans.game.resources.food = stockage(sans.game);
  assert.equal(prod(step(sans, completeQuest, { id: 'q0' }, at(MARS)).world.ledger, 'cabane').length, 0);
  const poules = monde(MARS, { types: ['poulailler', 'quai'] });
  poules.game.resources.food = stockage(poules.game);
  assert.equal(prod(step(poules, completeQuest, { id: 'q0' }, at(MARS)).world.ledger, 'poulailler').length, 0);
  const mai = monde('2027-05-04', { types: ['cabane', 'quai'] });
  mai.game.resources.food = stockage(mai.game);
  assert.equal(prod(step(mai, completeQuest, { id: 'q0' }, at('2027-05-04')).world.ledger, 'cabane').length, 0);
});

test('sirop : Remballer la seule quête du jour reprend aussi l’Énergie du sirop', () => {
  const w0 = monde(MARS, { types: ['cabane', 'quai'] });
  w0.game.resources.food = stockage(w0.game) - 1;
  const w = step(w0, completeQuest, { id: 'q0' }, at(MARS)).world;
  const avant = w.game.resources.energy;
  const quete = w.ledger.find((e) => e.key === 'reward:q0:1');
  const { world, r } = step(w, remballerQuest, { id: 'q0' }, at(MARS, 15));
  const reprise = r.entries.find((e) => e.type === 'prod' && e.batiment === 'cabane');
  assert.deepEqual([reprise.key, reprise.food, reprise.energy], [`reprise:cabane:${MARS}:1`, -1, -(PRODUCTION.cabane.food - 1) * SIROP.energie]);
  assert.equal(world.game.resources.energy, Math.round((avant - quete.energy - (PRODUCTION.cabane.food - 1) * SIROP.energie) * 10) / 10);
  // une nouvelle quête ce jour-là refait la production, sous une nouvelle clé
  const encore = step(world, completeQuest, { id: 'q1' }, at(MARS, 16)).world;
  assert.equal(prod(encore.ledger, 'cabane').filter((e) => !e.reprise).length, 2);
});

// ───────── La partie de sucre, objectif de printemps

test('partie de sucre : l’objectif du printemps ; son prix suit le stockage de base (la moitié ; au ralenti, le quart)', () => {
  assert.equal(OBJECTIFS_SAISON.printemps.id, 'sucres');
  const sans = monde(MARS).game;
  const avec = monde(MARS, { types: ['grenier'] }).game;
  assert.deepEqual([prixPartieDeSucre(sans), prixPartieDeSucre(avec)], [10, 30]);
  assert.deepEqual([prixPartieDeSucre(sans, true), prixPartieDeSucre(avec, true)], [5, 15]);
  const o = objectifSaison(sans, [], at(MARS));
  assert.deepEqual([o.id, o.cle, o.objectif, o.atteint, o.stock, o.max], ['printemps', 'printemps-2027', 'sucres', false, 10, 10]);
});

test('partie de sucre : du 1er mars au 30 avril, sans cabane ; assez de Nourriture ; une fois par printemps', () => {
  const g = monde(MARS).game;
  assert.equal(refusFaireLesSucres(monde('2027-02-27').game, [], {}, at('2027-02-27')), 'Le temps des sucres commence le 1er mars.');
  assert.equal(refusFaireLesSucres(monde('2027-05-04').game, [], {}, at('2027-05-04')), 'Le temps des sucres est fini : il revient le 1er mars.');
  assert.equal(refusFaireLesSucres(monde(MARS, { food: 7.5 }).game, [], {}, at(MARS)), 'Il manque 3 Nourriture.');
  assert.equal(refusFaireLesSucres(g, [], {}, at('2027-03-01')), null);
  assert.equal(refusFaireLesSucres(g, [], {}, at('2027-04-30')), null);
});

test('partie de sucre : faite, la Nourriture part, l’objectif est atteint (registre saison:printemps-AAAA, son permis) ; une seule fois', () => {
  const w0 = monde(MARS, { food: 18 });
  const { world: w, r } = step(w0, faireLesSucres, {}, at(MARS));
  assert.equal(w.game.resources.food, 18 - 10);
  assert.equal(w.game.sucres, 'printemps-2027');
  const e = w.ledger.find((x) => x.key === 'saison:printemps-2027');
  const rec = OBJECTIFS_SAISON.printemps.recompense;
  assert.deepEqual([e.objectif, e.energy, e.materials, e.permis], ['sucres', rec.energy, rec.materials, rec.permis]);
  assert.ok(r.events.some((x) => x.type === 'sucres' && x.nourriture === 10));
  assert.ok(r.events.some((x) => x.type === 'objectif-saison' && x.objectif === 'sucres'));
  assert.equal(objectifSaison(w.game, w.ledger, at(MARS)).atteint, true);
  w.game.resources.food = 40;
  assert.equal(refusFaireLesSucres(w.game, w.ledger, {}, at('2027-04-02')), 'La partie de sucre est déjà faite ce printemps.');
  // le printemps suivant, elle revient
  assert.equal(refusFaireLesSucres(w.game, w.ledger, {}, at('2028-03-07')), null);
});

test('partie de sucre : avoir la Nourriture ne suffit pas, il faut le geste (une quête faite en mars ne valide rien)', () => {
  const w = monde(MARS, { food: 40 });
  const after = step(w, completeQuest, { id: 'q0' }, at(MARS)).world;
  assert.equal(after.ledger.some((x) => x.key === 'saison:printemps-2027'), false);
});
