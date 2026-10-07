// Premiers pas (bible §11, lot 5) : cinq quêtes d'initiation qui appartiennent au jeu, jamais à la liste. Le bandeau les
// propose dans l'ordre ; chaque pas est un constat sur l'état (bâtiments, liste, registre), coché dès qu'il est vrai,
// même avant son tour (demande d'Alex, 7 octobre 2026). Chacun est atteint une seule fois et verse un coup de pouce au
// registre sous une clé unique (pas:{id}) : rejouer, recharger ou migrer ne repaie jamais.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREMIERS_PAS, PAS_IDS, etatPremiersPas, prochainGeste, construire, semer, accueillir, createQuest, completeQuest,
  advanceTime, openApp, remballerQuest, migrateState, hydrateLedger, STOCKAGE, ACCUEIL_NOURRITURE, recolter, CULTURE,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const OCT = '2026-10-06';
const pasDu = (ledger) => ledger.filter((e) => String(e.key).startsWith('pas:'));
const taskOps = (r) => r.ops.filter((o) => o.type === 'task.upsert' || o.type === 'task.delete');

test('cinq pas, dans l’ordre de la bible : chalet, tâche, terminer, semer, famille ; chacun a un coup de pouce', () => {
  assert.deepEqual(PAS_IDS, ['chalet', 'tache', 'terminer', 'semer', 'famille']);
  for (const p of PREMIERS_PAS) {
    for (const r of [p.recompense, p.hiver].filter(Boolean)) {
      const total = (r.energy || 0) + (r.materials || 0) + (r.food || 0);
      assert.ok(total > 0, p.id);
      for (const k of Object.keys(r)) assert.ok(['energy', 'materials', 'food'].includes(k) && r[k] > 0, `${p.id}.${k}`);
      // le coup de pouce reste petit : jamais une famille entière d'un coup
      assert.ok((r.food || 0) < ACCUEIL_NOURRITURE, p.id);
    }
  }
});

test('partie neuve sans liste : les cinq pas un à un, au registre sous pas:{id}, jamais écrits dans la liste', () => {
  let w = fresh([], at(OCT));
  assert.equal(etatPremiersPas(w.tasks, w.game, w.ledger).courant, 'chalet');

  let s = step(w, construire, { type: 'chalet' }, at(OCT));
  w = s.world;
  assert.equal(w.game.premiersPas.chalet, OCT);
  assert.deepEqual(pasDu(s.r.entries).map((e) => e.key), ['pas:chalet']);
  assert.deepEqual(taskOps(s.r), []);
  assert.ok(s.r.events.some((e) => e.type === 'premier-pas' && e.id === 'chalet'));
  assert.equal(etatPremiersPas(w.tasks, w.game, w.ledger).courant, 'tache');

  s = step(w, createQuest, { task: 'Ranger le cabanon', domain: 'Maison' }, at(OCT, 15));
  w = s.world;
  assert.deepEqual(pasDu(s.r.entries).map((e) => e.key), ['pas:tache']);
  // la seule écriture dans la liste est la vraie tâche ajoutée par le joueur
  assert.deepEqual(taskOps(s.r).map((o) => o.task.task), ['Ranger le cabanon']);
  const id = w.tasks[0].id;

  s = step(w, completeQuest, { id }, at(OCT, 16));
  w = s.world;
  assert.deepEqual(pasDu(s.r.entries).map((e) => e.key), ['pas:terminer']);
  assert.deepEqual(taskOps(s.r).map((o) => o.task.id), [id]);

  s = step(w, semer, { id: 'parcelle-1' }, at(OCT, 17));
  w = s.world;
  assert.deepEqual(pasDu(s.r.entries).map((e) => e.key), ['pas:semer']);
  assert.deepEqual(taskOps(s.r), []);

  w.game.resources.food = ACCUEIL_NOURRITURE; // la Nourriture vient d'ailleurs (récoltes) : ici, posée pour le test
  s = step(w, accueillir, {}, at(OCT, 18));
  w = s.world;
  assert.deepEqual(pasDu(s.r.entries).map((e) => e.key), ['pas:famille']);
  assert.deepEqual(taskOps(s.r), []);
  const etat = etatPremiersPas(w.tasks, w.game, w.ledger);
  assert.equal(etat.courant, null);
  assert.equal(etat.faits, 5);
  assert.deepEqual(Object.keys(w.game.premiersPas), PAS_IDS);
});

test('le coup de pouce est versé au registre et à l’état : Énergie, Matériaux, Nourriture', () => {
  const w = fresh([], at(OCT));
  const { world, r } = step(w, construire, { type: 'chalet' }, at(OCT));
  const e = r.entries.find((x) => x.key === 'pas:chalet');
  const rec = PREMIERS_PAS[0].recompense;
  assert.deepEqual({ ...e, at: undefined }, {
    key: 'pas:chalet', at: undefined, day: OCT, type: 'pas', pas: 'chalet', pe: 0,
    energy: rec.energy || 0, materials: rec.materials || 0, food: rec.food || 0,
  });
  assert.equal(world.game.resources.food, 5 + (rec.food || 0));
  assert.equal(world.game.resources.energy, 10 + (rec.energy || 0));
  assert.equal(world.game.resources.materials, 20 - 15 + (rec.materials || 0));
});

test('un pas fait avant son tour se coche tout de suite ; le bandeau propose toujours le premier qui reste', () => {
  const tasks = [task({ id: 'a', status: 'done' }), task({ id: 'b' })];
  const w = fresh(tasks, at(OCT));
  const s1 = step(w, advanceTime, {}, at(OCT));
  assert.deepEqual(pasDu(s1.r.entries).map((e) => e.key), ['pas:tache', 'pas:terminer']);
  assert.equal(etatPremiersPas(s1.world.tasks, s1.world.game, s1.world.ledger).courant, 'chalet');
  assert.equal(prochainGeste(s1.world.tasks, s1.world.game, s1.world.ledger, at(OCT)).geste, 'construire');
  const { world, r } = step(s1.world, construire, { type: 'chalet' }, at(OCT));
  assert.deepEqual(pasDu(r.entries).map((e) => e.key), ['pas:chalet']);
  assert.equal(etatPremiersPas(world.tasks, world.game, world.ledger).courant, 'semer');
  assert.deepEqual(taskOps(r), []);
});

test('semer avant le chalet coche « semer » tout de suite ; la récolte ne le reprend pas', () => {
  let w = fresh([task({ id: 'a', status: 'done' })], at(OCT));
  const s = step(w, semer, { id: 'parcelle-1' }, at(OCT));
  assert.deepEqual(pasDu(s.r.entries).map((e) => e.key), ['pas:tache', 'pas:terminer', 'pas:semer']);
  assert.equal(s.world.game.premiersPas.semer, OCT);
  const { r } = step(s.world, construire, { type: 'chalet' }, at(OCT, 15));
  assert.deepEqual(pasDu(r.entries).map((e) => e.key), ['pas:chalet']);
});

test('partie convertie sans chalet ni Matériaux pour lui : les pas déjà faits se cochent et paient, le chalet reste à faire', () => {
  const tasks = [task({ id: 'a', status: 'done' }), task({ id: 'b', status: 'done' }), task({ id: 'c' })];
  const w = fresh(tasks, at(OCT));
  w.game.resources = { energy: 19.2, materials: 6, food: 5 };
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, { id: 'parcelle-2', type: 'parcelle' }, { id: 'parcelle-3', type: 'parcelle' }];
  w.game.parcelles = ['parcelle-1', 'parcelle-2', 'parcelle-3'].map((id) => ({ id, semeLe: OCT }));
  const { world, r } = step(w, advanceTime, {}, at('2026-10-08'));
  assert.deepEqual(pasDu(r.entries).map((e) => e.key), ['pas:tache', 'pas:terminer', 'pas:semer']);
  assert.deepEqual(world.game.resources, { energy: 21.2, materials: 11, food: 11 });
  const etat = etatPremiersPas(world.tasks, world.game, world.ledger);
  assert.equal(etat.courant, 'chalet');
  assert.equal(etat.faits, 3);
  const g = prochainGeste(world.tasks, world.game, world.ledger, at('2026-10-08'));
  assert.equal(g.geste, 'construire');
  assert.ok(g.raison, 'le bandeau dit ce qui manque pour le chalet');
  assert.ok(!r.entries.some((e) => e.type === 'imprevu'), 'rien avant la fin des cinq pas');
  assert.deepEqual(step(world, advanceTime, {}, at('2026-10-08')).r.ops, []);
});

test('jamais deux fois : rejouer, recharger (registre hydraté), perdre la mémoire de l’état, migrer', () => {
  let w = fresh([task({ id: 'a', status: 'done' })], at(OCT));
  w = step(w, construire, { type: 'chalet' }, at(OCT)).world;
  const paid = pasDu(w.ledger).map((e) => e.key);
  assert.deepEqual(paid, ['pas:chalet', 'pas:tache', 'pas:terminer']);
  // rejouer le passage du temps, le même jour et le lendemain
  for (const d of [OCT, '2026-10-07']) assert.deepEqual(step(w, advanceTime, {}, at(d)).r.entries, []);
  // registre rechargé : les vieilles entrées ne sont plus que des clés
  const hydrated = hydrateLedger([], w.ledger.map((e) => e.key));
  assert.deepEqual(step({ ...w, ledger: hydrated }, advanceTime, {}, at('2026-10-08')).r.entries, []);
  // état qui a perdu sa mémoire des pas : retrouvée depuis le registre, sans repayer
  const amnesique = { ...w, game: { ...w.game, premiersPas: {} } };
  const r = step(amnesique, advanceTime, {}, at('2026-10-08')).r;
  assert.deepEqual(r.entries, []);
  assert.deepEqual(Object.keys(r.game.premiersPas), ['chalet', 'tache', 'terminer']);
  assert.equal(r.game.premiersPas.chalet, OCT);
  // une partie v2 relue (migrateState) garde ses pas
  assert.deepEqual(migrateState(structuredClone(w.game), at('2026-10-08')).premiersPas, w.game.premiersPas);
});

test('remballer la quête qui a validé « terminer » ne reprend pas le pas ni son coup de pouce', () => {
  let w = fresh([task({ id: 'a' })], at(OCT));
  w = step(w, construire, { type: 'chalet' }, at(OCT)).world; // chalet, tache
  w = step(w, completeQuest, { id: 'a' }, at(OCT, 15)).world; // terminer
  const { world, r } = step(w, remballerQuest, { id: 'a' }, at(OCT, 16));
  assert.equal(world.game.premiersPas.terminer, OCT);
  assert.ok(!r.entries.some((e) => String(e.key).startsWith('pas:')));
  assert.ok(!r.entries.some((e) => (e.reverses || []).some((k) => String(k).startsWith('pas:'))));
});

test('la Nourriture du coup de pouce est plafonnée par le stockage, sans rien inscrire au-delà', () => {
  const w = fresh([task({ id: 'a', status: 'done' })], at(OCT));
  w.game.premiersPas = { chalet: OCT, tache: OCT, terminer: OCT };
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }];
  w.game.resources.food = STOCKAGE - 1;
  const { world, r } = step(w, semer, { id: 'parcelle-1' }, at(OCT));
  const e = r.entries.find((x) => x.key === 'pas:semer');
  assert.ok(PREMIERS_PAS[3].recompense.food > 1);
  assert.equal(world.game.resources.food, STOCKAGE);
  assert.equal(e.food, 1);
});

test('l’hiver, « semer » passe par la petite serre et son coup de pouce est celui de l’hiver', () => {
  const DEC = '2026-12-15';
  const w = fresh([task({ id: 'a', status: 'done' })], at(DEC));
  w.game.premiersPas = { chalet: DEC, tache: DEC, terminer: DEC };
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }];
  const { world, r } = step(w, semer, { id: 'serre-1' }, at(DEC));
  const pas = PREMIERS_PAS.find((p) => p.id === 'semer');
  assert.ok(pas.hiver.food > pas.recompense.food);
  assert.equal(r.entries.find((x) => x.key === 'pas:semer').food, pas.hiver.food);
  assert.equal(world.game.resources.food, 5 + pas.hiver.food);
  // en octobre, dans le potager : le coup de pouce ordinaire
  const o = fresh([task({ id: 'a', status: 'done' })], at(OCT));
  o.game.premiersPas = { chalet: OCT, tache: OCT, terminer: OCT };
  o.game.batiments = [{ id: 'chalet-1', type: 'chalet' }];
  assert.equal(step(o, semer, { id: 'parcelle-1' }, at(OCT)).r.entries.find((x) => x.key === 'pas:semer').food, pas.recompense.food);
});

test('prochain geste : le pas courant et ce qui manque, avec les raisons du cœur', () => {
  // automne : un chalet vide à rebâtir
  let w = fresh([], at(OCT));
  assert.deepEqual(prochainGeste(w.tasks, w.game, w.ledger, at(OCT)), { pas: 'chalet', geste: 'construire', cible: 'chalet-1', raison: null });
  w.game.resources.materials = 3;
  assert.equal(prochainGeste(w.tasks, w.game, w.ledger, at(OCT)).raison, 'Il manque 12 Matériaux.');
  // hiver, quatre pas faits jusqu'à « semer » : il faut d'abord l'atelier, puis la petite serre
  const DEC = '2026-12-15';
  w = fresh([task({ id: 'a', status: 'done' })], at(DEC));
  w.game.premiersPas = { chalet: DEC, tache: DEC, terminer: DEC };
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }];
  assert.deepEqual(prochainGeste(w.tasks, w.game, w.ledger, at(DEC)), { pas: 'semer', geste: 'construire', cible: 'atelier-1', raison: null });
  w.game.batiments.push({ id: 'atelier-1', type: 'atelier' });
  assert.equal(prochainGeste(w.tasks, w.game, w.ledger, at(DEC)).cible, 'serre-1');
  w.game.batiments.push({ id: 'serre-1', type: 'serre' });
  assert.deepEqual(prochainGeste(w.tasks, w.game, w.ledger, at(DEC)), { pas: 'semer', geste: 'semer', cible: 'serre-1', raison: null });
  // la famille : la Nourriture qui manque
  w.game.premiersPas.semer = DEC;
  const g = prochainGeste(w.tasks, w.game, w.ledger, at(DEC));
  assert.deepEqual([g.pas, g.geste, g.cible], ['famille', 'accueillir', 'chalet-1']);
  assert.equal(g.raison, `Il manque ${ACCUEIL_NOURRITURE - 5} Nourriture.`);
  // tout est fait
  w.game.premiersPas.famille = DEC;
  assert.equal(prochainGeste(w.tasks, w.game, w.ledger, at(DEC)), null);
});

test('une récolte n’efface pas « semer » une fois validé ; la famille reste validée (personne ne part)', () => {
  let w = fresh(Array.from({ length: 8 }, (_, k) => task({ id: `q${k}`, created: '2026-01-01' })), at(OCT));
  w = step(w, construire, { type: 'chalet' }, at(OCT)).world;
  w = step(w, completeQuest, { id: 'q0' }, at(OCT, 15)).world;
  w = step(w, semer, { id: 'parcelle-1' }, at(OCT, 16)).world;
  let day = OCT;
  for (let k = 1; k <= CULTURE.jours; k++) {
    day = `2026-10-${String(6 + k).padStart(2, '0')}`;
    w = step(w, completeQuest, { id: `q${k}` }, at(day, 15)).world;
  }
  w = step(w, recolter, { id: 'parcelle-1' }, at(day, 20)).world;
  assert.equal(w.game.premiersPas.semer, OCT);
  assert.equal(etatPremiersPas(w.tasks, w.game, w.ledger).courant, 'famille');
});

test('ouverture et passage du temps sur une partie déjà avancée : les pas vrais sont validés, une seule fois', () => {
  const w = fresh([task({ id: 'a', status: 'done' })], at(OCT));
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }];
  w.game.habitants = 1;
  w.game.parcelles = [{ id: 'parcelle-1', semeLe: OCT }];
  const s1 = step(w, openApp, {}, at(OCT));
  assert.ok(!s1.r.entries.some((e) => String(e.key).startsWith('pas:'))); // l'ouverture ne fait que l'ouverture
  const s2 = step(s1.world, advanceTime, {}, at(OCT));
  assert.deepEqual(pasDu(s2.r.entries).map((e) => e.key), PAS_IDS.map((id) => `pas:${id}`));
  assert.deepEqual(step(s2.world, advanceTime, {}, at(OCT)).r.ops, []);
});
