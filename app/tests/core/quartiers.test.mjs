// Niveaux de quartier et permis (docs/conception-niveaux-quartiers.md, lot R) : d'où viennent les permis, les refus et
// l'achat d'un niveau, l'effet de chaque niveau, l'équité entre domaines, la conversion des anciens niveaux en permis.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  completeQuest, remballerQuest, toggleStep, accueillir, recolter, construire, advanceTime, markLetterShown,
  withoutStaleBodies, monterQuartier, refusMonter, coutNiveau, ECHELLE, EFFETS_QUARTIERS, niveauMax, valeur, placesParChalet,
  progressionPermis, conversionLetter, passageLetter, JOURS_PAR_PERMIS, QUARTIER_IDS, PAS_IDS, STOCKAGE,
  createInitialState, migrateState, objectifSaison, etatCulture, refusRecolter, refusAccueillir, logements, stockage,
  addDays,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const lettres = JSON.parse(readFileSync(new URL('../../content/fr-CA/lettres.json', import.meta.url), 'utf8'));
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const quetes = (n, over = {}) => Array.from({ length: n }, (_, k) => task({ id: `q${k}`, task: `Quête ${k}`, ...over }));
/** Les cinq premiers pas déjà faits (les tests du permis ne regardent pas l'initiation). */
const sansPas = (w, day = '2026-10-01') => { w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, day])); return w; };
/** Termine, ce jour-là, la première quête à faire qui n'a encore jamais été payée (sans étapes). */
function faire(w, day, h = 14) {
  const id = w.tasks.find((t) => t.status === 'todo' && !t.steps && !w.ledger.some((e) => e.key === `reward:${t.id}:1`)).id;
  return step(w, completeQuest, { id }, at(day, h));
}
const permisDuRegistre = (ledger) => ledger.filter((e) => e.type === 'permis').map((e) => e.key);

// ───────── Permis gagnés par les jours travaillés ─────────

test('permis : rien au 3e jour travaillé, 1 au 4e ; une partie neuve compte son jour de départ', () => {
  const D = '2026-10-06';
  let w = fresh(quetes(10), at(D, 12));
  assert.deepEqual(w.game.permis, { dispo: 0, depuis: '2026-10-05' }); // la veille du départ : le jour de départ compte
  for (const day of [D, '2026-10-07', '2026-10-08']) w = faire(w, day).world;
  assert.equal(w.game.permis.dispo, 0);
  assert.deepEqual(permisDuRegistre(w.ledger), []);
  const s = faire(w, '2026-10-09');
  const e = s.r.entries.find((x) => x.type === 'permis');
  assert.deepEqual({ ...e, at: undefined }, { key: 'permis:2026-10-09', at: undefined, day: '2026-10-09', type: 'permis', pe: 0, energy: 0, materials: 0, permis: 1 });
  assert.deepEqual(s.world.game.permis, { dispo: 1, depuis: '2026-10-09' });
  assert.deepEqual(s.r.events.filter((x) => x.type === 'permis'), [{ type: 'permis', source: 'jours', dispo: 1 }]);
  assert.equal(s.r.events.filter((x) => x.type === 'reward' && x.source === 'permis').length, 0); // aucun faux gain annoncé
  // le compte repart : le 4e jour travaillé suivant donne le 2e
  w = s.world;
  for (const day of ['2026-10-10', '2026-10-11', '2026-10-12']) w = faire(w, day).world;
  assert.equal(w.game.permis.dispo, 1);
  assert.equal(faire(w, '2026-10-13').world.game.permis.dispo, 2);
});

test('permis : une journée à 5 quêtes compte comme une journée à 1', () => {
  let w = fresh(quetes(20), at('2026-10-06', 12));
  for (let h = 10; h < 15; h++) w = faire(w, '2026-10-06', h).world;
  for (const day of ['2026-10-07', '2026-10-08']) w = faire(w, day).world;
  assert.equal(w.game.permis.dispo, 0);
  assert.equal(faire(w, '2026-10-09').world.game.permis.dispo, 1);
});

test('permis : un jour entièrement remballé ne compte pas', () => {
  let w = fresh(quetes(10), at('2026-10-06', 12));
  w = faire(w, '2026-10-06').world;
  w = step(w, remballerQuest, { id: 'q0' }, at('2026-10-06', 15)).world;
  for (const day of ['2026-10-07', '2026-10-08', '2026-10-09']) w = faire(w, day).world;
  assert.equal(w.game.permis.dispo, 0);
  assert.equal(faire(w, '2026-10-10').world.game.permis.dispo, 1);
});

test('permis : Remballer après un permis ne le reprend pas, et le jour ne le redonne pas', () => {
  let w = fresh(quetes(10), at('2026-10-06', 12));
  for (const day of ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']) w = faire(w, day).world;
  assert.equal(w.game.permis.dispo, 1);
  const r = step(w, remballerQuest, { id: 'q3' }, at('2026-10-09', 15));
  assert.equal(r.r.entries.length, 1);
  assert.equal('permis' in r.r.entries[0], false);
  assert.equal(r.world.game.permis.dispo, 1);
  // une autre quête le même jour : pas de second permis
  const again = faire(r.world, '2026-10-09', 16);
  assert.deepEqual(permisDuRegistre(again.world.ledger), ['permis:2026-10-09']);
  assert.equal(again.world.game.permis.dispo, 1);
});

test('permis : rejouer ne paie pas deux fois (clé permis:{jour} déjà au registre)', () => {
  let w = fresh(quetes(10), at('2026-10-06', 12));
  for (const day of ['2026-10-06', '2026-10-07', '2026-10-08']) w = faire(w, day).world;
  const avant = w;
  const s = faire(w, '2026-10-09');
  assert.equal(s.world.game.permis.dispo, 1);
  // un autre appareil, resté sur la partie d'avant, termine une quête le même jour : le registre a déjà la clé
  const perime = faire({ tasks: s.world.tasks, game: avant.game, ledger: s.world.ledger }, '2026-10-09', 16);
  assert.deepEqual(perime.r.entries.filter((e) => e.type === 'permis'), []);
});

test('permis : une étape cochée seule ne fait pas un jour travaillé', () => {
  const avecEtapes = task({ id: 'e', task: 'Quête à étapes', steps: [{ id: 's1', label: 'Une', done: false }, { id: 's2', label: 'Deux', done: false }] });
  let w = fresh([...quetes(5), avecEtapes], at('2026-10-06', 12));
  for (const day of ['2026-10-06', '2026-10-07', '2026-10-08']) w = faire(w, day).world;
  const s = step(w, toggleStep, { id: 'e', stepId: 's1' }, at('2026-10-09'));
  assert.equal(s.r.entries.length, 1);
  assert.equal(s.world.game.permis.dispo, 0);
  assert.equal(progressionPermis(s.world.game, s.world.ledger, at('2026-10-09')).jours, 3);
});

test('progressionPermis : permis en main, jours travaillés depuis le dernier, jours qui restent', () => {
  let w = fresh(quetes(10), at('2026-10-06', 12));
  assert.deepEqual(progressionPermis(w.game, w.ledger, at('2026-10-06')), { dispo: 0, depuis: '2026-10-05', jours: 0, restants: JOURS_PAR_PERMIS });
  for (const day of ['2026-10-06', '2026-10-07']) w = faire(w, day).world;
  assert.deepEqual(progressionPermis(w.game, w.ledger, at('2026-10-08')), { dispo: 0, depuis: '2026-10-05', jours: 2, restants: 2 });
  for (const day of ['2026-10-08', '2026-10-09']) w = faire(w, day).world;
  assert.deepEqual(progressionPermis(w.game, w.ledger, at('2026-10-09', 20)), { dispo: 1, depuis: '2026-10-09', jours: 0, restants: 4 });
});

// ───────── Permis de rang et de saison ─────────

test('permis de rang : un par palier, un seul, même rejoué', () => {
  const D = '2026-10-06';
  const w = fresh([], at(D));
  w.game.batiments = ['chalet-1', 'chalet-2', 'chalet-3'].map((id) => ({ id, type: 'chalet' }));
  w.game.habitants = 2;
  w.game.resources.food = 18;
  const s = step(w, accueillir, {}, at(D)); // 3 habitants : Hameau
  const e = s.r.entries.find((x) => x.type === 'permis');
  assert.deepEqual({ ...e, at: undefined }, { key: 'permis:rang:1', at: undefined, day: D, type: 'permis', pe: 0, energy: 0, materials: 0, permis: 1 });
  assert.equal(s.world.game.permis.dispo, 1);
  const types = s.r.events.map((x) => x.type);
  assert.ok(types.indexOf('rang') < types.indexOf('permis'), types.join());
  assert.deepEqual(s.r.events.find((x) => x.type === 'permis'), { type: 'permis', source: 'rang', dispo: 1 });
  // 4e habitant : même rang, rien
  const w2 = s.world;
  w2.game.resources.food = 18;
  const s2 = step(w2, accueillir, {}, at(D, 15));
  assert.deepEqual(s2.r.entries, []);
  assert.equal(s2.world.game.permis.dispo, 1);
  // une partie périmée (2 habitants) avec le registre à jour : la clé du palier bloque
  const perime = { ...w, ledger: s.world.ledger };
  assert.deepEqual(step(perime, accueillir, {}, at(D, 16)).r.entries, []);
});

test('permis de saison : +1 avec l’objectif d’automne, dans la récompense, l’entrée et l’événement', () => {
  const OCT = '2026-10-20';
  const w = sansPas(fresh([], at(OCT)));
  w.game.resources.food = STOCKAGE - 2;
  w.game.parcelles = [{ id: 'parcelle-1', semeLe: '2026-09-01' }];
  w.ledger = Array.from({ length: 5 }, (_, k) => ({ key: `reward:x${k}:1`, type: 'reward', taskId: `x${k}`, occurrence: 1, day: `2026-09-0${k + 2}`, at: at(`2026-09-0${k + 2}`) }));
  const { world, r } = step(w, recolter, { id: 'parcelle-1' }, at(OCT));
  const e = r.entries.find((x) => x.type === 'saison');
  assert.equal(e.permis, 1);
  assert.equal(world.game.permis.dispo, 1);
  assert.equal(r.events.find((x) => x.type === 'objectif-saison').permis, 1);
  assert.deepEqual(r.events.find((x) => x.type === 'permis'), { type: 'permis', source: 'saison', dispo: 1 });
});

// ───────── Refus ─────────

/** Partie prête à monter : premiers pas faits, de quoi payer largement. */
function pret({ permis = 10, energy = 999, materials = 999 } = {}) {
  const w = sansPas(fresh([], at('2026-10-06')));
  w.game.permis.dispo = permis;
  w.game.resources = { energy, materials, food: 5 };
  return w;
}

test('refus : quartier inconnu, puis avant les premiers pas', () => {
  const w = pret();
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'lune', niveau: 1 }), 'Quartier inconnu.');
  const neuf = fresh([], at('2026-10-06'));
  Object.assign(neuf.game, { permis: { dispo: 10, depuis: '2026-10-05' }, resources: { energy: 999, materials: 999, food: 5 } });
  assert.equal(refusMonter(neuf.game, neuf.ledger, { quartier: 'lune', niveau: 1 }), 'Quartier inconnu.');
  assert.equal(refusMonter(neuf.game, neuf.ledger, { quartier: 'champs', niveau: 1 }), 'Après tes premiers pas.');
  neuf.game.niveaux.garage = 2;
  assert.equal(refusMonter(neuf.game, neuf.ledger, { quartier: 'garage', niveau: 3 }), 'Après tes premiers pas.');
});

test('refus : niveau le plus haut (Garage 2, les autres 3), « Déjà fait. », « Il faut d’abord le niveau n. »', () => {
  assert.equal(niveauMax('garage'), 2);
  for (const q of QUARTIER_IDS.filter((x) => x !== 'garage')) assert.equal(niveauMax(q), 3, q);
  const w = pret();
  w.game.niveaux.garage = 2;
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'garage', niveau: 3 }), 'Niveau 2 : le plus haut pour l’instant.');
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'garage' }), 'Niveau 2 : le plus haut pour l’instant.'); // sans niveau visé : le suivant
  assert.throws(() => step(w, monterQuartier, { quartier: 'garage', niveau: 3 }), /Niveau 2 : le plus haut pour l’instant\./);
  w.game.niveaux.champs = 3;
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'champs', niveau: 4 }), 'Niveau 3 : le plus haut pour l’instant.');
  w.game.niveaux.atelier = 1;
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'atelier', niveau: 1 }), 'Déjà fait.');
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'garage', niveau: 2 }), 'Déjà fait.');
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'atelier', niveau: 3 }), 'Il faut d’abord le niveau 2.');
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'mairie', niveau: 2 }), 'Il faut d’abord le niveau 1.');
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'mairie', niveau: 1 }), null);
  assert.equal(refusMonter(w.game, w.ledger, { quartier: 'atelier', niveau: 2 }), null);
});

test('refus : ce qui manque, en une phrase (permis, Énergie, Matériaux)', () => {
  const c1 = coutNiveau(1);
  const c2 = coutNiveau(2);
  const refus = (o, niveau = 1) => {
    const w = pret(o);
    w.game.niveaux.champs = niveau - 1;
    return refusMonter(w.game, w.ledger, { quartier: 'champs', niveau });
  };
  assert.equal(refus({ permis: 0 }), 'Il manque 1 permis.');
  assert.equal(refus({ permis: 1 }, 2), 'Il manque 1 permis.');
  assert.equal(refus({ permis: 0 }, 2), 'Il manque 2 permis.');
  assert.equal(refus({ materials: c1.materials - 12 }), 'Il manque 12 Matériaux.');
  assert.equal(refus({ energy: c1.energy - 5 }), 'Il manque 5 Énergie.');
  assert.equal(refus({ permis: 0, materials: c1.materials - 12 }), 'Il manque 1 permis et 12 Matériaux.');
  assert.equal(refus({ permis: 1, materials: c2.materials - 12, energy: c2.energy - 5 }, 2), 'Il manque 1 permis, 5 Énergie et 12 Matériaux.');
  assert.equal(refus({ permis: 1, materials: c1.materials, energy: c1.energy }), null); // juste assez
});

// ───────── Achat ─────────

test('prix d’un niveau : n permis + n × ECHELLE × (4 Énergie + 3 Matériaux), soit n × 80 Énergie et n × 60 Matériaux', () => {
  assert.ok(Number.isInteger(ECHELLE) && ECHELLE > 0);
  for (const n of [1, 2, 3]) assert.deepEqual(coutNiveau(n), { permis: n, energy: n * ECHELLE * 4, materials: n * ECHELLE * 3 });
  // décision d'Alex du 6 octobre : les Matériaux, plus durs à gagner, coûtent moins cher que l'Énergie
  assert.equal(ECHELLE, 20);
  assert.deepEqual(coutNiveau(1), { permis: 1, energy: 80, materials: 60 });
  assert.deepEqual(coutNiveau(3), { permis: 3, energy: 240, materials: 180 });
});

test('monter : le prix exact est retiré, le niveau monte de 1, l’événement sort ; ni registre ni tâches', () => {
  const w = pret({ permis: 3, energy: 500, materials: 600 });
  w.tasks = quetes(2);
  const s = step(w, monterQuartier, { quartier: 'champs', niveau: 1 });
  const c = coutNiveau(1);
  assert.deepEqual(s.world.game.resources, { energy: 500 - c.energy, materials: 600 - c.materials, food: 5 });
  assert.equal(s.world.game.permis.dispo, 2);
  assert.deepEqual(s.world.game.niveaux, { champs: 1, atelier: 0, mairie: 0, ecole: 0, garage: 0, place: 0 });
  assert.deepEqual(s.r.events, [{ type: 'quartier-monte', quartier: 'champs', niveau: 1, cout: c }]);
  assert.deepEqual(s.r.entries, []);
  assert.deepEqual(s.r.ops.map((o) => o.type), ['game.set']);
  assert.deepEqual(s.world.tasks, w.tasks);
  assert.deepEqual(s.world.game.quartiers, w.game.quartiers);
  // double toucher, ou geste rejoué : le niveau visé est atteint, refusé
  assert.throws(() => step(s.world, monterQuartier, { quartier: 'champs', niveau: 1 }), /^Error: Déjà fait\.$/);
  // le suivant : 2 permis et le double des travaux
  const s2 = step(s.world, monterQuartier, { quartier: 'champs', niveau: 2 });
  assert.equal(s2.world.game.niveaux.champs, 2);
  assert.equal(s2.world.game.permis.dispo, 0);
  assert.equal(s2.world.game.resources.materials, 600 - c.materials - coutNiveau(2).materials);
});

test('une quête payée ne change jamais un niveau', () => {
  let w = sansPas(fresh(quetes(20, { domain: 'Terrain' }), at('2026-10-06')));
  for (let k = 0; k < 20; k++) w = faire(w, addDays('2026-10-06', k)).world;
  assert.equal(w.game.quartiers.champs, 20);
  assert.deepEqual(Object.values(w.game.niveaux), [0, 0, 0, 0, 0, 0]);
});

// ───────── Un effet par niveau ─────────

test('table des effets : niveau 0 = réglage de départ, puis un chiffre par niveau', () => {
  const attendu = {
    champs: ['recoltePotager', [4, 5, 6, 7]],
    atelier: ['recolteSerre', [4, 5, 6, 7]],
    garage: ['joursPousse', [5, 4, 3]],
    ecole: ['placesParChalet', [2, 3, 4, 5]],
    mairie: ['prixFamille', [18, 15, 12, 9]],
    place: ['stockagePlace', [0, 20, 40, 60]],
  };
  assert.deepEqual(Object.keys(EFFETS_QUARTIERS).sort(), [...QUARTIER_IDS].sort());
  for (const [q, [reglage, valeurs]] of Object.entries(attendu)) {
    assert.equal(EFFETS_QUARTIERS[q].reglage, reglage, q);
    const g = createInitialState(at('2026-10-06'));
    valeurs.forEach((v, n) => { g.niveaux[q] = n; assert.equal(valeur(g, reglage), v, `${q} niveau ${n}`); });
  }
  // un quartier n'agit que sur son réglage
  const g = createInitialState(at('2026-10-06'));
  g.niveaux.champs = 3;
  assert.equal(valeur(g, 'recolteSerre'), 4);
});

/** Monde de mai : potager et petite serre semés le 1er mai, mûrs après 5 jours travaillés (registre fictif). */
function recoltesDeMai(niveaux, joursFaits = 5) {
  const w = sansPas(fresh([], at('2026-05-01')));
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }];
  w.game.parcelles = [{ id: 'parcelle-1', semeLe: '2026-05-01' }, { id: 'serre-1', semeLe: '2026-05-01' }];
  Object.assign(w.game.niveaux, niveaux);
  w.ledger = Array.from({ length: joursFaits }, (_, k) => ({ key: `reward:x${k}:1`, type: 'reward', taskId: `x${k}`, occurrence: 1, day: `2026-05-0${k + 2}`, at: at(`2026-05-0${k + 2}`) }));
  return w;
}

test('Champs 1 : 5 Nourriture au potager, la serre reste à 4 ; Atelier 1 : 5 à la serre, le potager reste à 4', () => {
  const recolte = (w, id) => step(w, recolter, { id }, at('2026-05-08')).r.events.find((e) => e.type === 'recolte').nourriture;
  assert.equal(recolte(recoltesDeMai({ champs: 1 }), 'parcelle-1'), 5);
  assert.equal(recolte(recoltesDeMai({ champs: 1 }), 'serre-1'), 4);
  assert.equal(recolte(recoltesDeMai({ atelier: 1 }), 'serre-1'), 5);
  assert.equal(recolte(recoltesDeMai({ atelier: 1 }), 'parcelle-1'), 4);
  assert.equal(recolte(recoltesDeMai({ champs: 3 }), 'parcelle-1'), 7);
});

test('Garage 1 puis 2 : les cultures mûrissent en 4 puis 3 jours travaillés, au potager comme à la serre', () => {
  const now = at('2026-05-08');
  for (const id of ['parcelle-1', 'serre-1']) {
    assert.equal(etatCulture(recoltesDeMai({}, 4).game, recoltesDeMai({}, 4).ledger, id, now).mure, false);
    const w1 = recoltesDeMai({ garage: 1 }, 4);
    assert.deepEqual([etatCulture(w1.game, w1.ledger, id, now).mure, etatCulture(w1.game, w1.ledger, id, now).reste], [true, 0]);
    const w1b = recoltesDeMai({ garage: 1 }, 3);
    assert.equal(refusRecolter(w1b.game, w1b.ledger, id, now), 'Pas encore mûr : encore 1 jour travaillé.');
    const w2 = recoltesDeMai({ garage: 2 }, 3);
    assert.equal(etatCulture(w2.game, w2.ledger, id, now).mure, true);
  }
});

test('École : 3, 4 puis 5 places par chalet ; un chalet bâti après l’achat a déjà ses places', () => {
  const w = sansPas(fresh([], at('2026-10-06')));
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }];
  w.game.resources.materials = 100;
  assert.equal(logements(w.game).places, 2);
  for (const n of [1, 2, 3]) {
    w.game.niveaux.ecole = n;
    assert.equal(placesParChalet(w.game), n + 2);
    assert.equal(logements(w.game).places, n + 2);
  }
  w.game.niveaux.ecole = 1;
  const s = step(w, construire, { type: 'chalet' });
  assert.deepEqual(logements(s.world.game), { places: 6, habitants: 0, libres: 6 });
});

test('Mairie : accueillir une famille coûte 15, puis 12, puis 9 Nourriture', () => {
  for (const [n, prix] of [[1, 15], [2, 12], [3, 9]]) {
    const w = sansPas(fresh([], at('2026-10-06')));
    w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }];
    w.game.niveaux.mairie = n;
    w.game.resources.food = prix - 1;
    assert.equal(refusAccueillir(w.game), 'Il manque 1 Nourriture.');
    w.game.resources.food = prix;
    assert.equal(refusAccueillir(w.game), null);
    const s = step(w, accueillir, {});
    assert.equal(s.world.game.resources.food, 0);
    assert.deepEqual(s.r.events[0], { type: 'famille', habitants: 1, nourriture: prix });
  }
});

test('Place : stockage à 40, 60 puis 80 (sans grenier) ; la récolte remplit jusque-là', () => {
  const g = createInitialState(at('2026-10-06'));
  assert.equal(stockage(g), STOCKAGE);
  for (const [n, max] of [[1, 40], [2, 60], [3, 80]]) { g.niveaux.place = n; assert.equal(stockage(g), max); }
  const w = recoltesDeMai({ place: 1 });
  w.game.resources.food = STOCKAGE;
  assert.equal(refusRecolter(w.game, w.ledger, 'parcelle-1', at('2026-05-08')), null);
  assert.equal(step(w, recolter, { id: 'parcelle-1' }, at('2026-05-08')).world.game.resources.food, STOCKAGE + 4);
});

test('objectif d’automne : il ne change pas quand la Place monte (stockage de base)', () => {
  const OCT = '2026-10-20';
  const w = sansPas(fresh([], at(OCT)));
  w.game.niveaux.place = 2;
  w.game.resources.food = STOCKAGE;
  assert.equal(objectifSaison(w.game, w.ledger, at(OCT)).max, STOCKAGE);
  const s = step(w, advanceTime, {}, at(OCT));
  assert.deepEqual(s.r.entries.filter((e) => e.type !== 'imprevu').map((e) => e.key), ['saison:automne-2026']); // un imprévu peut tomber ce jour-là (lot I)
});

// ───────── Équité ─────────

test('équité : même effort, tout en Maison ou réparti sur cinq domaines : mêmes permis, mêmes ressources', () => {
  const DOMS = ['Maison', 'Terrain', 'Enfants', 'Véhicule', 'Administratif'];
  const maison = quetes(20, { domain: 'Maison', length: 3, difficulty: 4 });
  const reparti = maison.map((t, k) => ({ ...t, domain: DOMS[k % 5] }));
  const jouer = (tasks) => {
    let w = fresh(tasks, at('2026-10-06', 12));
    for (let d = 0; d < 9; d++) { const day = addDays('2026-10-06', d); w = faire(w, day, 13).world; w = faire(w, day, 15).world; }
    return w.game;
  };
  const a = jouer(maison);
  const b = jouer(reparti);
  assert.equal(a.permis.dispo, 2);
  assert.deepEqual(b.permis, a.permis);
  assert.deepEqual(b.resources, a.resources);
  assert.notDeepEqual(b.quartiers, a.quartiers);
});

test('équité : un hiver sans aucune quête Terrain donne ses permis comme un autre', () => {
  let w = fresh(quetes(10, { domain: 'Maison' }), at('2026-12-01', 12));
  for (let d = 0; d < 8; d++) w = faire(w, addDays('2026-12-01', d)).world;
  assert.equal(w.game.permis.dispo, 2);
  assert.equal(w.game.quartiers.champs, 0);
});

// ───────── Conversion des anciens niveaux en permis ─────────

const NOW = '2026-10-21T14:00:00Z';
// partie v2 d'avant les permis (forme de la partie d'essai, valeurs fictives)
const V2 = {
  version: 2, createdAt: '2026-10-01T14:00:00.000Z', startDay: '2026-10-01',
  resources: { energy: 77.4, materials: 88, food: 9 }, habitants: 2,
  quartiers: { champs: 16, atelier: 5, mairie: 0, ecole: 30, garage: 4, place: 100 }, // niveaux 2, 1, 0, 3, 0, 5
  batiments: [{ id: 'chalet-1', type: 'chalet' }], parcelles: [{ id: 'parcelle-1', semeLe: '2026-10-19' }],
  premiersPas: { chalet: '2026-10-01' }, accueil: '2026-10-01',
  bilans: [{ semaine: { start: '2026-10-12', end: '2026-10-18' }, quetes: 3, joursTravailles: 2, heures: 1, domaines: [] }],
  lastOpenDay: '2026-10-20', letters: { 'matin.01': '2026-10-20' }, horloge: { decalage: 3 },
};

test('conversion v2 : Σ anciens niveaux en permis, à placer ; stock, quartiers et bilans gardés ; le jour de conversion compte', () => {
  const g = migrateState(structuredClone(V2), NOW);
  assert.deepEqual(g.niveaux, { champs: 0, atelier: 0, mairie: 0, ecole: 0, garage: 0, place: 0 });
  assert.deepEqual(g.permis, { dispo: 11, depuis: '2026-10-20', cadeau: 11 });
  for (const k of ['resources', 'quartiers', 'bilans', 'habitants', 'batiments', 'parcelles', 'premiersPas', 'letters', 'horloge', 'startDay']) {
    assert.deepEqual(g[k], V2[k], k);
  }
  // un 2e passage, même plus tard, ne change rien
  assert.deepEqual(migrateState(structuredClone(g), NOW), g);
  assert.deepEqual(migrateState(structuredClone(g), '2026-12-01T14:00:00Z'), g);
  // une partie v2 sans niveau gagné reçoit 0 permis, et la lettre le dira
  const zero = migrateState({ ...structuredClone(V2), quartiers: { champs: 4 } }, NOW);
  assert.deepEqual(zero.permis, { dispo: 0, depuis: '2026-10-20', cadeau: 0 });
});

test('conversion v1 (la vraie partie à la bascule) : même calcul après le recompte, sans lettre de conversion', () => {
  const V1 = { version: 1, createdAt: '2026-09-01T14:00:00.000Z', startDay: '2026-09-01', resources: { energy: 23.4, materials: 41, confidence: 4 }, lueur: { place: 12 }, filLibre: 7.5 };
  const tasks = [
    ...quetes(6, { domain: 'Jardin', status: 'done' }).map((t, k) => ({ ...t, id: `j${k}` })), // Champs : 6 tâches, niveau 1
    ...quetes(15, { domain: 'Maison', status: 'done' }).map((t, k) => ({ ...t, id: `m${k}` })), // Atelier : 15, niveau 2
    task({ id: 'z', domain: 'Véhicule' }),
  ];
  const g = migrateState(structuredClone(V1), NOW, { tasks, ledger: [] });
  assert.deepEqual([g.quartiers.champs, g.quartiers.atelier], [6, 15]);
  assert.deepEqual(g.permis, { dispo: 3, depuis: '2026-10-20' });
  assert.deepEqual(Object.values(g.niveaux), [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(g.resources, { energy: 10, materials: 20, food: 5 });
  assert.deepEqual(migrateState(structuredClone(g), '2026-11-02T14:00:00Z', { tasks, ledger: [] }), g);
  assert.equal(conversionLetter(lettres, g), null);
});

test('partie neuve : niveaux à zéro, aucun permis, le compte part de la veille ; pas de lettre de conversion', () => {
  const g = createInitialState(NOW);
  assert.deepEqual(g.niveaux, { champs: 0, atelier: 0, mairie: 0, ecole: 0, garage: 0, place: 0 });
  assert.deepEqual(g.permis, { dispo: 0, depuis: '2026-10-20' });
  assert.deepEqual(migrateState(null, NOW), g);
  assert.deepEqual(migrateState(structuredClone(g), NOW), g);
  assert.equal(conversionLetter(lettres, g), null);
});

test('la conversion lit la partie sans toucher la liste ni le registre (tasks.json identique à l’octet)', () => {
  const tasks = quetes(3);
  const ledger = [{ key: 'reward:q0:1', at: at('2026-10-20'), day: '2026-10-20', type: 'reward', taskId: 'q0', occurrence: 1, pe: 7, energy: 2.1, materials: 3.5, quartier: 'atelier' }];
  const avant = JSON.stringify([tasks, ledger]);
  migrateState(structuredClone(V2), NOW, { tasks, ledger });
  assert.equal(JSON.stringify([tasks, ledger]), avant);
});

// ───────── Lettres ─────────

test('lettre de conversion : « Tes n niveaux sont devenus n permis », accord au singulier, texte propre à zéro ; une seule fois', () => {
  const g = migrateState(structuredClone(V2), NOW);
  const l = conversionLetter(lettres, g, { prenom: 'Sam' });
  assert.equal(l.kind, 'conversion');
  assert.equal(l.seen, false);
  assert.equal(l.questId, null);
  const texte = l.lignes.join(' ');
  assert.ok(texte.includes('Tes 11 niveaux sont devenus 11 permis.'), texte);
  assert.ok(texte.includes('Sam'));
  assert.equal(/[{}]/.test(texte), false);
  const un = conversionLetter(lettres, { ...g, permis: { ...g.permis, cadeau: 1 } }).lignes.join(' ');
  assert.ok(un.includes('Ton niveau est devenu un permis.'), un);
  assert.ok(!/niveaux|devenus/.test(un), un);
  const zero = conversionLetter(lettres, { ...g, permis: { ...g.permis, cadeau: 0 } }).lignes.join(' ');
  assert.ok(zero.includes('Tous les quatre jours de travail, la Mairie tamponne un permis.'), zero);
  assert.ok(!/\d/.test(zero), zero);
  const vue = markLetterShown([], g, [], { id: l.id, gameRevision: 'r' }, NOW).game;
  assert.equal(conversionLetter(lettres, vue), null);
  assert.equal(conversionLetter(lettres, migrateState(structuredClone(vue), '2026-11-02T14:00:00Z')), null);
  assert.equal(conversionLetter({ matin: lettres.matin }, g), null);
});

test('lettre de passage v1 → v2 : elle parle des permis', () => {
  const V1 = { version: 1, createdAt: '2026-09-01T14:00:00.000Z', startDay: '2026-09-01', resources: { energy: 1, materials: 1 } };
  const l = passageLetter(lettres, migrateState(V1, NOW));
  assert.ok(l.lignes.join(' ').includes('Tous les quatre jours de travail, la Mairie tamponne un permis'), l.lignes.join(' '));
});

test('file hors ligne : un achat de niveau calculé à l’ancien prix (100 et 75) repart recalculé à 80 et 60', () => {
  const at0 = '2026-10-06T14:00:00.000Z';
  const w = pret({ permis: 3, energy: 500, materials: 600 });
  const params = { quartier: 'champs', niveau: 1 };
  // calcul gardé en file par un onglet d'avant le changement de prix (sans marque de version, puis marqué 3)
  const vieux = (client) => ({
    opId: 'a1', name: 'monterQuartier', params, at: at0,
    body: { opId: 'a1', ...(client ? { client } : {}), ops: [{ type: 'game.set', game: { ...w.game, resources: { energy: 400, materials: 525, food: 5 } } }] },
  });
  const courant = { ...vieux(4), opId: 'a2' };
  const sortie = withoutStaleBodies([vieux(), vieux(3), courant, { opId: 'a3', name: 'completeQuest', params: {}, at: at0, body: null }, null], 4);
  assert.deepEqual(sortie.map((e) => e && e.body && e.body.client), [null, null, 4, null, null]);
  assert.equal(sortie[0].body, null);
  assert.equal(sortie[1].body, null);
  // l'entrée effacée garde son opId (le serveur a pu l'appliquer sans que l'onglet le sache), son nom, ses paramètres, son instant
  // et il est marqué `stale` : si le serveur l'avait appliqué, son rejeu ne doit pas repartir sous un nouvel opId
  assert.deepEqual({ ...sortie[0], body: 0 }, { ...vieux(), body: 0, stale: true });
  assert.equal(sortie[2].stale, undefined);
  assert.deepEqual(withoutStaleBodies('pas une file', 4), []);
  // le cœur courant refait le calcul à l'envoi : 80 et 60, pas 100 et 75
  const r = step(w, monterQuartier, sortie[0].params, new Date(sortie[0].at).toISOString());
  assert.deepEqual(r.world.game.resources, { energy: 420, materials: 540, food: 5 });
});
