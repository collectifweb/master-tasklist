// Semaine tenue (lot R2) : à partir du 5e jour travaillé d'une semaine (lundi au dimanche, en jours de jeu), un bonus en
// Matériaux inscrit au registre sous semaine:{lundi}, une seule fois par semaine, sans compteur de jours de suite.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeQuest, remballerQuest, toggleStep, advanceTime, figerBilans, weeklyReview, SEMAINE_TENUE, semaineKey, hydrateLedger,
  addDays, weekStart, applyEntry, createInitialState,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const LUNDI = '2026-10-05'; // un lundi
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const quetes = (n) => Array.from({ length: n }, (_, k) => task({ id: `q${k}`, task: `Quête ${k}` }));
const X = SEMAINE_TENUE.materials;
/** Termine, ce jour-là, la première quête à faire qui n'a pas encore été payée. */
function faire(w, day, h = 14) {
  const id = w.tasks.find((t) => t.status === 'todo' && !w.ledger.some((e) => e.key === `reward:${t.id}:1`)).id;
  return step(w, completeQuest, { id }, at(day, h));
}
const semaines = (ledger) => ledger.filter((e) => e.type === 'semaine');
const evenements = (r) => r.events.filter((e) => e.type === 'semaine-tenue');
/** Un jour travaillé par jour, aux jours donnés. */
function jouer(w, jours) {
  let last = null;
  for (const day of jours) { last = faire(w, day); w = last.world; }
  return { w, last };
}
const jours = (debut, n) => Array.from({ length: n }, (_, k) => addDays(debut, k));

test('semaine tenue : réglage exporté, 5 jours sur 7, des Matériaux entiers entre 10 et 20', () => {
  assert.equal(SEMAINE_TENUE.jours, 5);
  assert.ok(Number.isInteger(SEMAINE_TENUE.materials) && SEMAINE_TENUE.materials >= 10 && SEMAINE_TENUE.materials <= 20);
  assert.equal(semaineKey(LUNDI), 'semaine:2026-10-05');
});

test('4 jours travaillés : rien ; le 5e jour : le bonus, une seule fois (entrée, événement, Matériaux)', () => {
  let w = fresh(quetes(10), at(LUNDI, 12));
  const quatre = jouer(w, jours(LUNDI, 4));
  assert.deepEqual(semaines(quatre.w.ledger), []);
  assert.deepEqual(evenements(quatre.last.r), []);
  const avant = quatre.w.game.resources.materials;
  const s = faire(quatre.w, addDays(LUNDI, 4)); // le vendredi
  const e = semaines(s.r.entries);
  assert.equal(e.length, 1);
  assert.deepEqual({ ...e[0], at: undefined }, { key: 'semaine:2026-10-05', at: undefined, day: '2026-10-09', type: 'semaine', semaine: LUNDI, pe: 0, energy: 0, materials: X });
  assert.deepEqual(evenements(s.r), [{ type: 'semaine-tenue', semaine: LUNDI, jours: 5, materials: X }]);
  const quete = s.r.entries.find((x) => x.type === 'reward');
  assert.equal(Math.round((s.world.game.resources.materials - avant) * 10) / 10, Math.round((quete.materials + X) * 10) / 10);
  // le bonus passe par le registre : une entrée dans l'opération envoyée au serveur
  assert.ok(s.r.ops.find((o) => o.type === 'ledger.append').entries.some((x) => x.key === 'semaine:2026-10-05'));
});

test('7 jours travaillés : le bonus n’est payé qu’une fois (le 5e jour), jamais au 6e ni au 7e', () => {
  let w = fresh(quetes(12), at(LUNDI, 12));
  const sept = jouer(w, jours(LUNDI, 7));
  assert.deepEqual(semaines(sept.w.ledger).map((e) => [e.key, e.day]), [['semaine:2026-10-05', '2026-10-09']]);
  // ni au 6e ni au 7e jour (le 7e est le dernier calculé), puis un 8e jour, lundi de la semaine d'après : toujours aucun second
  // bonus pour la semaine du 5, et aucun pour celle du 12 (un seul jour travaillé)
  assert.deepEqual(evenements(sept.last.r), []);
  const huit = faire(sept.w, addDays(LUNDI, 7));
  assert.deepEqual(evenements(huit.r), []);
  assert.deepEqual(semaines(huit.world.ledger).map((e) => e.key), ['semaine:2026-10-05']);
});

test('deux appareils : les jours les plus anciens arrivent après les plus récents, la semaine est tenue quand même', () => {
  // l'appareil B fait mercredi, jeudi et vendredi ; l'appareil A, hors ligne lundi et mardi, envoie sa file ensuite
  // (store.js recalcule chaque geste à sa date, sur l'état du serveur) : aucun envoi n'a vu les 5 jours ensemble
  let w = fresh(quetes(8), at(LUNDI, 12));
  w = jouer(w, jours(addDays(LUNDI, 2), 3)).w;
  assert.deepEqual(semaines(w.ledger), []);
  const lundi = faire(w, LUNDI);
  assert.deepEqual(semaines(lundi.r.entries), []); // 4 jours sur 5
  const mardi = faire(lundi.world, addDays(LUNDI, 1));
  assert.deepEqual(semaines(mardi.r.entries).map((e) => e.key), ['semaine:2026-10-05']);
  assert.deepEqual(evenements(mardi.r), [{ type: 'semaine-tenue', semaine: LUNDI, jours: 5, materials: X }]);
  // le bilan figé de la semaine la compte tenue
  const bilan = figerBilans(mardi.world.tasks, mardi.world.game, mardi.world.ledger, at(addDays(LUNDI, 7)));
  assert.deepEqual(bilan.map((b) => [b.semaine.start, b.joursTravailles, b.tenue]), [[LUNDI, 5, true]]);
});

test('frontière du lundi : le dimanche appartient à la semaine d’avant, le lundi à la suivante', () => {
  const jeudi = addDays(LUNDI, 3);
  let w = fresh(quetes(20), at(LUNDI, 12));
  // jeudi à dimanche (4 jours de la semaine 1), puis lundi à jeudi (4 jours de la semaine 2) : 8 jours, aucune semaine tenue
  const huit = jouer(w, jours(jeudi, 8));
  assert.deepEqual(semaines(huit.w.ledger), []);
  assert.equal(weekStart(addDays(LUNDI, 6)), LUNDI);
  assert.equal(weekStart(addDays(LUNDI, 7)), addDays(LUNDI, 7));
  // le vendredi de la semaine 2 en fait 5 : le bonus est celui de la semaine 2, pas de la 1
  const s = faire(huit.w, addDays(LUNDI, 11));
  assert.deepEqual(semaines(s.r.entries).map((e) => e.key), ['semaine:2026-10-12']);
  assert.deepEqual(evenements(s.r), [{ type: 'semaine-tenue', semaine: '2026-10-12', jours: 5, materials: X }]);
  // et l'autre sens : 5 jours du lundi au vendredi, puis la semaine suivante repart de zéro (4 jours : rien de plus)
  const w2 = jouer(fresh(quetes(20), at(LUNDI, 12)), [...jours(LUNDI, 5), ...jours(addDays(LUNDI, 7), 4)]).w;
  assert.deepEqual(semaines(w2.ledger).map((e) => e.key), ['semaine:2026-10-05']);
});

test('les jours travaillés sont ceux des permis : plusieurs quêtes le même jour comptent pour un', () => {
  let w = fresh(quetes(20), at(LUNDI, 12));
  for (let h = 10; h < 16; h++) w = faire(w, LUNDI, h).world; // six quêtes le lundi : un seul jour
  w = jouer(w, jours(addDays(LUNDI, 1), 3)).w; // mardi à jeudi : 4 jours en tout
  assert.deepEqual(semaines(w.ledger), []);
  assert.equal(faire(w, addDays(LUNDI, 4)).r.entries.some((e) => e.type === 'semaine'), true);
});

test('rejeu sans doublon : le registre à jour bloque la clé, même sur un appareil resté sur la partie d’avant', () => {
  const w = fresh(quetes(12), at(LUNDI, 12));
  const quatre = jouer(w, jours(LUNDI, 4)).w;
  const s = faire(quatre, addDays(LUNDI, 4));
  assert.equal(semaines(s.r.entries).length, 1);
  // une autre quête le même jour : rien de plus
  const encore = faire(s.world, addDays(LUNDI, 4), 16);
  assert.deepEqual(semaines(encore.r.entries), []);
  // un autre appareil : partie d'avant (sans le bonus), registre à jour : la clé est là, rien n'est inscrit
  const perime = faire({ tasks: s.world.tasks, game: quatre.game, ledger: s.world.ledger }, addDays(LUNDI, 4), 17);
  assert.deepEqual(semaines(perime.r.entries), []);
  // même chose quand la clé ne vient que de la liste des clés du serveur (entrée minimale { key })
  const ancien = hydrateLedger(s.world.ledger.filter((e) => e.type !== 'semaine'), ['semaine:2026-10-05']);
  assert.deepEqual(semaines(faire({ tasks: s.world.tasks, game: quatre.game, ledger: ancien }, addDays(LUNDI, 5)).r.entries), []);
  // rejouer la même quête déjà payée : aucune entrée du tout
  assert.throws(() => step(s.world, completeQuest, { id: 'q4' }, at(addDays(LUNDI, 4), 18)), /déjà terminée/);
});

test('Remballer ne reprend pas le bonus (comme le permis), et refaire le jour ne le repaie pas', () => {
  const quatre = jouer(fresh(quetes(12), at(LUNDI, 12)), jours(LUNDI, 4)).w;
  const vendredi = addDays(LUNDI, 4);
  const s = faire(quatre, vendredi);
  const avant = s.world.game.resources.materials;
  const rem = step(s.world, remballerQuest, { id: 'q4' }, at(vendredi, 15));
  // l'annulation ne porte que la quête : aucune écriture pour le bonus, la clé reste au registre
  assert.deepEqual(rem.r.entries.map((e) => e.type), ['reverse']);
  assert.equal(rem.r.entries[0].reverses.some((k) => k.startsWith('semaine:')), false);
  assert.equal(semaines(rem.world.ledger).length, 1);
  assert.equal(rem.world.game.resources.materials, Math.round((avant + rem.r.entries[0].materials) * 10) / 10); // seule la quête est reprise
  assert.ok(rem.world.game.resources.materials >= quatre.game.resources.materials + X - 0.05);
  // le vendredi redevient un jour travaillé avec une autre quête : toujours un seul bonus
  const autre = faire(rem.world, vendredi, 16);
  assert.deepEqual(semaines(autre.r.entries), []);
  assert.equal(semaines(autre.world.ledger).length, 1);
  // un jour entièrement remballé ne compte pas : avec 4 vrais jours et un 5e remballé, pas de bonus
  const q4 = jouer(fresh(quetes(12), at(LUNDI, 12)), jours(LUNDI, 3)).w;
  const j4 = faire(q4, addDays(LUNDI, 3));
  const rembale = step(j4.world, remballerQuest, { id: 'q3' }, at(addDays(LUNDI, 3), 15)).world;
  const j5 = faire(rembale, addDays(LUNDI, 4));
  assert.deepEqual(semaines(j5.r.entries), []); // lundi à mercredi + vendredi = 4 jours
});

test('ni une étape cochée seule ni le passage du temps ne font un jour travaillé ni ne paient la semaine', () => {
  const avecEtapes = task({ id: 'e', task: 'Quête à étapes', steps: [{ id: 's1', label: 'Une', done: false }, { id: 's2', label: 'Deux', done: false }] });
  const w = fresh([...quetes(12), avecEtapes], at(LUNDI, 12));
  const quatre = jouer(w, jours(LUNDI, 4)).w;
  const vendredi = addDays(LUNDI, 4);
  const etape = step(quatre, toggleStep, { id: 'e', stepId: 's1' }, at(vendredi));
  assert.deepEqual(semaines(etape.r.entries), []); // une étape paie des points, pas un jour travaillé
  assert.deepEqual(semaines(step(etape.world, advanceTime, {}, at(vendredi, 20)).r.entries), []);
  // la vraie quête du vendredi, elle, paie la semaine
  assert.equal(semaines(faire(etape.world, vendredi, 16).r.entries).length, 1);
});

test('bilan figé : `tenue` vrai pour la semaine payée, faux sinon ; un ancien bilan sans le champ reste tel quel', () => {
  // semaine 1 tenue (5 jours), semaine 2 à 4 jours
  const w = jouer(fresh(quetes(20), at(LUNDI, 12)), [...jours(LUNDI, 5), ...jours(addDays(LUNDI, 7), 4)]).w;
  const lundi3 = addDays(LUNDI, 14);
  const bilans = figerBilans(w.tasks, w.game, w.ledger, at(lundi3));
  assert.deepEqual(bilans.map((b) => [b.semaine.start, b.joursTravailles, b.tenue]), [[LUNDI, 5, true], [addDays(LUNDI, 7), 4, false]]);
  // via advanceTime, au premier passage de la semaine suivante
  const t = step(w, advanceTime, {}, at(lundi3));
  assert.deepEqual(t.world.game.bilans.map((b) => b.tenue), [true, false]);
  // un bilan figé avant ce champ n'est jamais recalculé ni complété
  const ancien = { semaine: { start: '2026-09-28', end: '2026-10-04' }, quetes: 3, heures: 1, domaines: [], joursTravailles: 3 };
  const garde = figerBilans(w.tasks, { ...w.game, bilans: [ancien] }, w.ledger, at(lundi3));
  assert.deepEqual(garde[0], ancien);
  assert.equal('tenue' in garde[0], false);
  assert.deepEqual(garde.slice(1).map((b) => b.tenue), [true, false]);
  // la semaine en cours se lit aussi (bilan vivant)
  assert.equal(weeklyReview(w.tasks, w.game, w.ledger, at(addDays(LUNDI, 4))).tenue, true);
  assert.equal(weeklyReview(w.tasks, w.game, w.ledger, at(addDays(LUNDI, 10))).tenue, false);
});

test('bilan : le montant payé est celui du registre, pas la constante du moment', () => {
  const w = jouer(fresh(quetes(20), at(LUNDI, 12)), [...jours(LUNDI, 5), ...jours(addDays(LUNDI, 7), 4)]).w;
  const lundi3 = addDays(LUNDI, 14);
  const sauve = SEMAINE_TENUE.materials;
  try {
    SEMAINE_TENUE.materials = 99; // un changement ultérieur du réglage ne réécrit pas ce qui a été payé
    const [tenue, pas] = figerBilans(w.tasks, w.game, w.ledger, at(lundi3));
    assert.equal(tenue.tenueMateriaux, sauve);
    assert.equal('tenueMateriaux' in pas, false);
    assert.equal(weeklyReview(w.tasks, w.game, w.ledger, at(addDays(LUNDI, 4))).tenueMateriaux, sauve);
    // une entrée minimale (clé seule, relue du serveur) : tenue vraie, montant inconnu
    const minimal = hydrateLedger([], [semaineKey(LUNDI)]);
    const b = weeklyReview(w.tasks, w.game, minimal, at(addDays(LUNDI, 4)));
    assert.equal(b.tenue, true);
    assert.equal('tenueMateriaux' in b, false);
  } finally { SEMAINE_TENUE.materials = sauve; }
});

test('l’entrée du registre s’applique à l’état comme un gain : Matériaux ajoutés, rien d’autre', () => {
  const g = createInitialState(at(LUNDI));
  const r = applyEntry(g, { key: 'semaine:2026-10-05', at: at(LUNDI), day: LUNDI, type: 'semaine', semaine: LUNDI, pe: 0, energy: 0, materials: X });
  assert.equal(r.game.resources.materials, Math.round((g.resources.materials + X) * 10) / 10);
  assert.equal(r.game.resources.energy, g.resources.energy);
  assert.deepEqual(r.game.quartiers, g.quartiers); // ni tâche ni quartier
  assert.deepEqual(r.game.permis, g.permis);
});

test('frontière de 4 h : une quête du lundi à 3 h (Montréal) compte pour la semaine qui finit, à 4 h pour celle qui commence', () => {
  const lundiSuivant = addDays(LUNDI, 7); // le lundi 12 octobre
  // quatre jours travaillés, du mercredi au samedi ; le dimanche passe en jour de jeu jusqu'à 3 h 59 le lundi
  const w0 = jouer(fresh(quetes(10), at(addDays(LUNDI, 2), 12)), jours(addDays(LUNDI, 2), 4)).w;
  assert.deepEqual(semaines(w0.ledger), []);
  const tard = faire(w0, lundiSuivant, 7); // 07:00Z = 3 h 00 à Montréal (heure d'été), encore le dimanche de jeu
  assert.deepEqual(semaines(tard.r.entries).map((e) => [e.key, e.day]), [['semaine:2026-10-05', '2026-10-11']]);
  assert.deepEqual(evenements(tard.r), [{ type: 'semaine-tenue', semaine: LUNDI, jours: 5, materials: X }]);
  // la même quête à 4 h 00 (08:00Z) tombe dans la semaine du 12 : un seul jour, aucun bonus
  const tot = faire(w0, lundiSuivant, 8);
  assert.deepEqual(semaines(tot.r.entries), []);
});
