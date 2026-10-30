// Les Grands travaux (lot O) : le phare, ouvert à tous dès le rang Bourg, payé par étapes ; payer lance une étape, que
// les ouvriers bâtissent pendant les jours travaillés qui suivent (le jour du paiement ne compte pas), une à la fois.
// Fini, il n'a aucun effet de jeu. Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeQuest, remballerQuest, payerEtape, refusTravaux, etatOuvrage, OUVRAGES, JOURS_PAR_ETAPE, RANGS, addDays,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const JOUR = '2026-10-06';
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const PHARE = OUVRAGES.phare;
const BOURG = RANGS.find((r) => r.id === 'bourg').min;
const quetes = (n) => Array.from({ length: n }, (_, k) => task({ id: `q${k}`, task: `Quête ${k}` }));

/** Un village au Bourg, riche, avec des quêtes à faire. */
function village({ habitants = BOURG, energy = 5000, materials = 5000 } = {}) {
  const w = fresh(quetes(12), at(JOUR, 12));
  w.game.habitants = habitants;
  w.game.resources = { ...w.game.resources, energy, materials };
  return w;
}
function faire(w, day, h = 14) {
  const id = w.tasks.find((t) => t.status === 'todo' && !w.ledger.some((e) => e.key === `reward:${t.id}:1`)).id;
  return step(w, completeQuest, { id }, at(day, h));
}
const payer = (w, day, params = {}) => step(w, payerEtape, { ouvrage: 'phare', ...params }, at(day, 15));
const finies = (r) => r.events.filter((e) => e.type === 'travaux-etape-finie');

test('le phare : quatre étapes, rang Bourg, surtout en Matériaux, aucun permis ; deux jours travaillés par étape', () => {
  assert.equal(PHARE.rang, 'bourg');
  assert.deepEqual(PHARE.etapes.map((e) => e.id), ['fondation', 'tour', 'galerie', 'lanterne']);
  for (const e of PHARE.etapes) {
    assert.ok(e.cout.materials > e.cout.energy, `${e.id} : plus de Matériaux que d’Énergie`);
    assert.ok(!e.cout.permis && !e.cout.food);
  }
  assert.equal(JOURS_PAR_ETAPE, 2);
});

test('avant le Bourg : refusé, avec les habitants qui manquent ; rien de commencé', () => {
  const w = village({ habitants: BOURG - 2 });
  assert.equal(refusTravaux(w.game, w.ledger, { ouvrage: 'phare' }, at(JOUR)), 'Bourg : encore 2 habitants.');
  assert.throws(() => payer(w, JOUR), /Bourg : encore 2 habitants/);
  const e = etatOuvrage(w.game, w.ledger, 'phare', at(JOUR));
  assert.deepEqual({ payees: e.payees, finies: e.finies, fini: e.fini, enCours: e.enCours }, { payees: 0, finies: 0, fini: false, enCours: null });
  assert.equal(e.prochaine.etape, 1);
  assert.equal(refusTravaux(w.game, w.ledger, { ouvrage: 'digue' }, at(JOUR)), 'Ouvrage inconnu.');
});

test('payer la fondation : les ressources partent, l’étape est lancée, rien au registre', () => {
  const w = village();
  const { world, r } = payer(w, JOUR, { etape: 1 });
  const cout = PHARE.etapes[0].cout;
  assert.equal(world.game.resources.energy, 5000 - cout.energy);
  assert.equal(world.game.resources.materials, 5000 - cout.materials);
  assert.deepEqual(world.game.travaux.phare, { payees: 1, le: JOUR, finies: 0 });
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.events.filter((e) => e.type === 'travaux-etape-payee'), [{ type: 'travaux-etape-payee', ouvrage: 'phare', etape: 1, cout }]);
  assert.ok(r.ops.some((o) => o.type === 'game.set'));
  const e = etatOuvrage(world.game, world.ledger, 'phare', at(JOUR));
  assert.deepEqual(e.enCours, { etape: 1, jours: 0, restants: 2 });
  assert.equal(e.prochaine.etape, 2);
});

test('une étape à la fois ; un toucher rejoué : « Déjà fait. » ; une étape sautée : refusée', () => {
  const w = payer(village(), JOUR).world;
  assert.equal(refusTravaux(w.game, w.ledger, { ouvrage: 'phare', etape: 1 }, at(JOUR)), 'Déjà fait.');
  assert.equal(refusTravaux(w.game, w.ledger, { ouvrage: 'phare' }, at(JOUR)),
    'Les ouvriers bâtissent encore la fondation : encore 2 jours travaillés.');
  assert.equal(refusTravaux(village().game, [], { ouvrage: 'phare', etape: 3 }, at(JOUR)), 'Il faut d’abord l’étape 1.');
});

test('le jour du paiement ne compte pas ; deux jours travaillés après, l’étape est finie, une seule fois', () => {
  let w = faire(village(), JOUR, 10).world; // une quête le matin, avant de payer
  w = payer(w, JOUR).world;
  const meme = faire(w, JOUR, 18); // le soir même : ne compte pas
  assert.deepEqual(finies(meme.r), []);
  const un = faire(meme.world, addDays(JOUR, 1));
  assert.deepEqual(finies(un.r), []);
  assert.deepEqual(etatOuvrage(un.world.game, un.world.ledger, 'phare', at(addDays(JOUR, 1))).enCours, { etape: 1, jours: 1, restants: 1 });
  const deux = faire(un.world, addDays(JOUR, 3)); // un jour sans quête entre les deux : l'étape attend
  assert.deepEqual(finies(deux.r), [{ type: 'travaux-etape-finie', ouvrage: 'phare', etape: 1, fini: false }]);
  assert.deepEqual(deux.world.game.travaux.phare, { payees: 1, le: JOUR, finies: 1 });
  assert.deepEqual(deux.r.entries.filter((e) => e.type !== 'reward' && e.type !== 'bonus'), []);
  const encore = faire(deux.world, addDays(JOUR, 3), 18);
  assert.deepEqual(finies(encore.r), []);
  const e = etatOuvrage(encore.world.game, encore.world.ledger, 'phare', at(addDays(JOUR, 3)));
  assert.equal(e.enCours, null);
  assert.equal(refusTravaux(encore.world.game, encore.world.ledger, { ouvrage: 'phare', etape: 2 }, at(addDays(JOUR, 3))), null);
});

test('remballer la quête qui a fini l’étape ne la fait pas reculer', () => {
  let w = payer(village(), JOUR).world;
  w = faire(w, addDays(JOUR, 1)).world;
  const deux = faire(w, addDays(JOUR, 2));
  const id = deux.r.entries.find((e) => e.type === 'reward').taskId;
  const rem = step(deux.world, remballerQuest, { id }, at(addDays(JOUR, 2), 16));
  assert.deepEqual(rem.world.game.travaux.phare, { payees: 1, le: JOUR, finies: 1 });
});

test('les quatre étapes : le phare est debout, puis plus rien à payer ; l’allure n’y change rien', () => {
  let w = village();
  let day = JOUR, dernier = null;
  for (let k = 1; k <= 4; k++) {
    w = payer(w, day, { etape: k }).world;
    day = addDays(day, 1); w = faire(w, day).world;
    day = addDays(day, 1); dernier = faire(w, day); w = dernier.world;
  }
  assert.deepEqual(finies(dernier.r), [{ type: 'travaux-etape-finie', ouvrage: 'phare', etape: 4, fini: true }]);
  const e = etatOuvrage(w.game, w.ledger, 'phare', at(day));
  assert.deepEqual({ payees: e.payees, finies: e.finies, fini: e.fini, enCours: e.enCours, prochaine: e.prochaine }, { payees: 4, finies: 4, fini: true, enCours: null, prochaine: null });
  assert.equal(refusTravaux(w.game, w.ledger, { ouvrage: 'phare' }, at(day)), 'Le phare est debout.');
  const total = PHARE.etapes.reduce((s, x) => ({ energy: s.energy + x.cout.energy, materials: s.materials + x.cout.materials }), { energy: 0, materials: 0 });
  // payer n'écrit rien au registre : les Matériaux du village sont le départ, moins le phare, plus tout le registre
  const gagne = (k) => Math.round(w.ledger.reduce((s, x) => s + (x[k] || 0), 0) * 10) / 10;
  assert.equal(Math.round(w.game.resources.materials * 10) / 10, Math.round((5000 - total.materials + gagne('materials')) * 10) / 10);
});

test('ce qui manque : dit en une phrase, rien n’est payé', () => {
  const w = village({ energy: 0, materials: 10 });
  const cout = PHARE.etapes[0].cout;
  assert.match(refusTravaux(w.game, w.ledger, { ouvrage: 'phare' }, at(JOUR)), new RegExp(`^Il manque ${cout.energy} Énergie et ${cout.materials - 10} Matériaux\\.$`));
});

test('une partie abîmée (travaux illisibles) : rien de commencé, on peut payer la fondation', () => {
  for (const abime of ['x', null, { phare: 'x' }, { phare: { payees: 'deux', le: 3 } }]) {
    const w = village();
    w.game.travaux = abime;
    const e = etatOuvrage(w.game, w.ledger, 'phare', at(JOUR));
    assert.equal(e.payees, 0, JSON.stringify(abime));
    assert.equal(refusTravaux(w.game, w.ledger, { ouvrage: 'phare' }, at(JOUR)), null);
  }
});
