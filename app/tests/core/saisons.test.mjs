// Saisons du vrai calendrier (bible §6, lot 5) : automne de septembre à novembre, hiver de décembre à février,
// printemps de mars à mai, été de juin à août, lues sur le jour de jeu (heure de Montréal, journée de 4 h à 3 h 59).
// Seul l'objectif d'automne est livré : « Remplir le grenier », atteint quand la Nourriture touche le plafond du
// stockage au moins une fois pendant l'automne. Manqué, rien n'est perdu ; réussi, une récompense modeste au registre,
// une seule fois par automne. Puis le bandeau d'objectifs (bible §10). Titres fictifs génériques.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saisonDe, objectifSaison, OBJECTIFS_SAISON, bandeau, recolter, accueillir, advanceTime, construire, completeQuest,
  STOCKAGE, GRENIER_STOCKAGE, PAS_IDS, hydrateLedger, voirAccueil, createInitialState, migrateState, applyEntries,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const saisonDuLedger = (ledger) => ledger.filter((e) => String(e.key).startsWith('saison:'));
// Écritures du passage du temps hors imprévus (lot I : un imprévu peut tomber le jour du test).
const horsImprevus = (entries) => entries.filter((e) => e.type !== 'imprevu');
/** Les cinq premiers pas déjà faits : ces tests ne regardent que la saison. */
const sansPas = (w, day) => { w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, day])); return w; };

test('saisons nettes, sans chevauchement : automne 9-11, hiver 12-2, printemps 3-5, été 6-8', () => {
  const cas = {
    '2026-09-01': ['automne', 'automne-2026'], '2026-11-30': ['automne', 'automne-2026'],
    '2026-12-01': ['hiver', 'hiver-2026'], '2027-01-15': ['hiver', 'hiver-2026'], '2027-02-28': ['hiver', 'hiver-2026'],
    '2027-03-01': ['printemps', 'printemps-2027'], '2027-05-31': ['printemps', 'printemps-2027'],
    '2027-06-01': ['ete', 'ete-2027'], '2027-08-31': ['ete', 'ete-2027'],
  };
  for (const [day, [id, cle]] of Object.entries(cas)) {
    const s = saisonDe(day);
    assert.deepEqual([s.id, s.cle], [id, cle], day);
  }
  // les douze mois tombent chacun dans une seule saison
  const parMois = Array.from({ length: 12 }, (_, m) => saisonDe(`2027-${String(m + 1).padStart(2, '0')}-15`).id);
  assert.deepEqual(parMois, ['hiver', 'hiver', 'printemps', 'printemps', 'printemps', 'ete', 'ete', 'ete', 'automne', 'automne', 'automne', 'hiver']);
});

test('objectif d’automne : « grenier » ; d’hiver : « serre » (lot H) ; le printemps et l’été n’en ont pas encore (affichés « à venir »)', () => {
  assert.equal(OBJECTIFS_SAISON.automne.id, 'grenier');
  const r = OBJECTIFS_SAISON.automne.recompense;
  assert.ok((r.energy || 0) + (r.materials || 0) > 0);
  assert.ok(!r.food); // le grenier est plein quand on la reçoit : de la Nourriture ne tiendrait pas
  assert.equal(OBJECTIFS_SAISON.hiver.id, 'serre');
  for (const s of ['printemps', 'ete']) assert.equal(OBJECTIFS_SAISON[s], undefined, s);
});

test('Nourriture au plafond pendant l’automne (récolte) : objectif atteint, récompense au registre, une seule fois', () => {
  const OCT = '2026-10-20';
  const w = sansPas(fresh([], at(OCT)), OCT);
  w.game.resources.food = STOCKAGE - 2;
  w.game.parcelles = [{ id: 'parcelle-1', semeLe: '2026-09-01' }];
  w.ledger = Array.from({ length: 5 }, (_, k) => ({ key: `reward:x${k}:1`, type: 'reward', taskId: `x${k}`, occurrence: 1, day: `2026-09-0${k + 2}`, at: at(`2026-09-0${k + 2}`) }));
  const before = objectifSaison(w.game, w.ledger, at(OCT));
  assert.deepEqual([before.cle, before.objectif, before.atteint, before.stock, before.max], ['automne-2026', 'grenier', false, STOCKAGE - 2, STOCKAGE]);
  const { world, r } = step(w, recolter, { id: 'parcelle-1' }, at(OCT));
  const e = saisonDuLedger(r.entries);
  assert.deepEqual(e.map((x) => x.key), ['saison:automne-2026']);
  const rec = OBJECTIFS_SAISON.automne.recompense;
  assert.deepEqual({ ...e[0], at: undefined }, {
    key: 'saison:automne-2026', at: undefined, day: OCT, type: 'saison', saison: 'automne-2026', objectif: 'grenier', pe: 0,
    energy: rec.energy || 0, materials: rec.materials || 0, food: 0, permis: rec.permis || 0,
  });
  assert.ok(r.events.some((x) => x.type === 'objectif-saison' && x.cle === 'automne-2026'));
  assert.equal(objectifSaison(world.game, world.ledger, at(OCT)).atteint, true);
  // dépenser puis remplir de nouveau, rejouer, recharger : jamais une 2e fois cet automne
  world.game.resources.food = STOCKAGE;
  assert.deepEqual(step(world, advanceTime, {}, at('2026-11-02')).r.entries, []);
  const hydrated = { ...world, ledger: hydrateLedger([], world.ledger.map((x) => x.key)) };
  assert.deepEqual(step(hydrated, advanceTime, {}, at('2026-11-03')).r.entries, []);
});

test('un village déjà plein au 1er septembre compte aussi (au premier passage du temps de l’automne)', () => {
  const w = sansPas(fresh([], at('2026-09-01')), '2026-08-20');
  w.game.resources.food = STOCKAGE;
  assert.deepEqual(saisonDuLedger(step(w, advanceTime, {}, at('2026-09-01')).r.entries).map((e) => e.key), ['saison:automne-2026']);
});

test('avec un grenier, le plafond monte : il faut le remplir, pas seulement les 20 de départ', () => {
  const w = sansPas(fresh([], at('2026-10-20')), '2026-10-01');
  w.game.habitants = 3;
  w.game.batiments = [{ id: 'grenier-1', type: 'grenier' }];
  w.game.resources.food = STOCKAGE;
  assert.deepEqual(horsImprevus(step(w, advanceTime, {}, at('2026-10-20')).r.entries), []);
  w.game.resources.food = STOCKAGE + GRENIER_STOCKAGE;
  assert.equal(saisonDuLedger(step(w, advanceTime, {}, at('2026-10-21')).r.entries).length, 1);
});

test('hors de l’automne, rien ; l’automne suivant, de nouveau possible (clé de l’année)', () => {
  const w = sansPas(fresh([], at('2026-12-02')), '2026-10-01');
  w.game.resources.food = STOCKAGE;
  assert.deepEqual(horsImprevus(step(w, advanceTime, {}, at('2026-12-02')).r.entries), []);
  assert.deepEqual(horsImprevus(step(w, advanceTime, {}, at('2027-07-02')).r.entries), []);
  w.ledger = [{ key: 'saison:automne-2026', type: 'saison', day: '2026-10-10', at: at('2026-10-10'), pe: 0, energy: 1, materials: 1, food: 0 }];
  assert.deepEqual(saisonDuLedger(step(w, advanceTime, {}, at('2027-09-03')).r.entries).map((e) => e.key), ['saison:automne-2027']);
  // le 30 novembre à 3 h 30 du matin, c'est encore l'automne (journée de jeu) ; le 1er décembre à 4 h, l'hiver
  const w2 = sansPas(fresh([], at('2026-11-30')), '2026-10-01');
  w2.game.resources.food = STOCKAGE;
  assert.equal(saisonDuLedger(step(w2, advanceTime, {}, '2026-12-01T08:30:00Z').r.entries).length, 1);
  assert.equal(saisonDuLedger(step(w2, advanceTime, {}, '2026-12-01T09:30:00Z').r.entries).length, 0);
});

test('manqué : rien n’est perdu (aucune écriture à l’hiver), et dépenser de la Nourriture ne compte pas', () => {
  const w = sansPas(fresh([], at('2026-10-10')), '2026-10-01');
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }];
  w.game.resources.food = STOCKAGE - 1;
  const s = step(w, accueillir, {}, at('2026-10-10'));
  assert.deepEqual(saisonDuLedger(s.r.entries), []);
  const hiver = step(s.world, advanceTime, {}, at('2026-12-05'));
  assert.deepEqual(horsImprevus(hiver.r.entries), []);
  // les ressources ne bougent que du gain d'un bon imprévu tiré ce jour-là (lot I)
  assert.deepEqual(hiver.world.game.resources, applyEntries(s.world.game, hiver.r.entries).game.resources);
});

// ───────── Bandeau d'objectifs ─────────

test('bandeau, partie neuve : aujourd’hui = premier pas, cette semaine = premiers pas 0 sur 5, saison, prochain rang', () => {
  const OCT = '2026-10-06';
  const w = fresh([task({ id: 'a' })], at(OCT));
  const b = bandeau(w.tasks, w.game, w.ledger, at(OCT));
  assert.deepEqual(b.aujourdhui, { kind: 'pas', pas: 'chalet', geste: 'construire', cible: 'chalet-1', raison: null });
  assert.deepEqual(b.semaine, { kind: 'pas', faits: 0, total: 5, courant: 'chalet', pas: PAS_IDS.map((id) => ({ id, fait: null })) });
  assert.deepEqual(b.saison, { id: 'automne', cle: 'automne-2026', objectif: 'grenier', atteint: false, stock: 5, max: STOCKAGE, ralenti: false });
  assert.deepEqual(b.rang, { habitants: 0, nom: 'Campement', suivant: 'Hameau', min: 0, cible: 3, encore: 3, part: 0 });
});

test('bandeau, après les cinq pas : la quête n° 1, et le compte vrai de la semaine', () => {
  const OCT = '2026-10-06';
  let w = sansPas(fresh([task({ id: 'a', task: 'Laver les vitres', priority: 9 }), task({ id: 'b', priority: 2 })], at(OCT)), OCT);
  w.game.habitants = 4;
  w = step(w, completeQuest, { id: 'b' }, at(OCT)).world;
  const b = bandeau(w.tasks, w.game, w.ledger, at(OCT, 15));
  assert.deepEqual(b.aujourdhui, { kind: 'quete', taskId: 'a', titre: 'Laver les vitres' });
  assert.deepEqual(b.semaine, { kind: 'semaine', quetes: 1, jours: 1 });
  assert.deepEqual(b.rang, { habitants: 4, nom: 'Hameau', suivant: 'Village', min: 3, cible: 6, encore: 2, part: 1 / 3 });
  // aucune quête ouverte : rien à faire aujourd'hui, et c'est dit
  const vide = bandeau([], w.game, w.ledger, at(OCT, 15));
  assert.deepEqual(vide.aujourdhui, { kind: 'rien' });
});

test('bandeau, hiver : l’objectif « Garder la serre allumée » (lot H), compté sans rien bloquer ; le printemps est « à venir »', () => {
  const w = fresh([], at('2026-12-10'));
  const b = bandeau(w.tasks, w.game, w.ledger, at('2026-12-10'));
  assert.deepEqual(b.saison, { id: 'hiver', cle: 'hiver-2026', objectif: 'serre', atteint: false, stock: 0, max: OBJECTIFS_SAISON.hiver.recoltes, ralenti: false });
  const p = bandeau(w.tasks, w.game, w.ledger, at('2027-04-10'));
  assert.deepEqual(p.saison, { id: 'printemps', cle: 'printemps-2027', objectif: null, atteint: false, aVenir: true });
});

// ───────── Écrans d'accueil ─────────

test('accueil : montré une seule fois, noté dans la partie (tenue) ; une partie v2 relue garde la marque', () => {
  const OCT = '2026-10-06';
  const w = fresh([], at(OCT));
  assert.equal(w.game.accueil, null);
  assert.equal(createInitialState(at(OCT)).accueil, null);
  const s = step(w, voirAccueil, {}, at(OCT));
  assert.equal(s.world.game.accueil, OCT);
  assert.deepEqual(s.r.ops.map((o) => o.type), ['game.set']);
  assert.deepEqual(s.r.entries, []);
  assert.deepEqual(step(s.world, voirAccueil, {}, at('2026-10-07')).r.ops, []); // déjà vu : rien ne bouge
  assert.equal(migrateState(structuredClone(s.world.game), at('2026-10-07')).accueil, OCT);
  // une partie v2 d'avant le lot 5 n'a pas la clé : elle verra l'accueil une fois
  const ancienne = structuredClone(s.world.game);
  delete ancienne.accueil;
  assert.equal(migrateState(ancienne, at('2026-10-07')).accueil, null);
});
