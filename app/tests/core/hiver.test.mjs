// L'hiver (lot H, plan validé par Alex le 7 octobre 2026). Tempêtes de neige de la première neige (15 novembre) à la fin
// de mars, à un écart tiré entre 7 et 14 jours d'après la date, annoncées trois jours d'avance. La barre de préparation a
// trois crans : un par jour travaillé pendant l'annonce, un cran manqué s'achète en Matériaux. Barre pleine : la tempête
// est tenue (une récompense, une seule fois). Sinon, si l'annonce a été vue et qu'on ouvre l'app le jour même, hors
// reprise, un bâtiment est enseveli (dégât « neige ») : la serre ne pousse plus, l'éolienne ne produit plus ; il se règle
// en payant, par une quête Terrain, ou seul. Objectif d'hiver : des récoltes de serre entre décembre et février.
// Jamais une tâche touchée, jamais une ressource retirée. Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPETE, DEGATS, OBJECTIFS_SAISON, tempetesDeLHiver, estJourDeTempete, tempeteEnVue, preparation, alerteTempete,
  refusPreparer, preparer, advanceTime, completeQuest, remballerQuest, reparer, refusReparer, recolter, construire,
  accueillir, semer, migrateState, degatsActifs, degatDe, etatCulture, objectifSaison, recoltesHiver, calendrierImprevus,
  IMPREVUS, PAS_IDS, EOLIENNE_ENERGIE, addDays, weekStart, daysBetween, isTruce, reverseKey,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

// 14 h UTC = 9 h à Montréal l'hiver : toujours le jour de jeu indiqué.
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const EOLIENNE = { id: 'eolienne-1', type: 'eolienne' };
const SERRE = { id: 'serre-1', type: 'serre' };
const ATELIER = { id: 'atelier-1', type: 'atelier' };
const CHALETS = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }];

// Un jour travaillé : une quête payée ce jour-là (forme du registre, quête fictive).
const paye = (day, id = 'x') => ({ key: `reward:${id}-${day}:1`, at: at(day), day, type: 'reward', taskId: `${id}-${day}`, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });
// Les trois jours de l'annonce travaillés : barre pleine.
const prets = (j) => [3, 2, 1].map((k) => paye(addDays(j, -k)));

// Village sorti des premiers pas, vu la veille de `day`. Les imprévus de la semaine sont déjà tirés (clés seules) : seules
// les tempêtes jouent, sauf dans le test qui les croise.
function village(day, over = {}, ledger = []) {
  const w = fresh([task({ id: 'q-maison', domain: 'Maison' }), task({ id: 'q-terrain', domain: 'Terrain' }), task({ id: 'q-enfants', domain: 'Enfants' })], at(day));
  w.game.resources = { energy: 50, materials: 50, food: 10 };
  w.game.habitants = 3;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-01-01']));
  w.game.batiments = [...CHALETS];
  w.game.lastSeenDay = addDays(day, -1);
  w.game.lastOpenDay = addDays(day, -1);
  Object.assign(w.game, over);
  w.ledger = [...ledger, ...calendrierImprevus(day).creneaux.map((c) => ({ key: `imprevu:${c.jour}` }))];
  return w;
}

// Première tempête, de l'hiver 2026 à 2100, qui répond au filtre.
function tempete(filtre = () => true) {
  for (let y = 2026; y <= 2100; y++) for (const j of tempetesDeLHiver(`${y}-12-01`)) if (filtre(j)) return j;
  throw new Error('aucune tempête trouvée');
}
const lundi = (j) => weekStart(j) === j;
const dimanche = (j) => addDays(weekStart(j), 6) === j;
const issue = (r) => r.events.filter((e) => e.type === 'tempete');
const cle = (r, j) => r.entries.find((e) => e.key === `tempete:${j}`);

test('catalogue : trois jours d’annonce, trois crans, un écart de 7 à 14 jours ; prix et récompense en nombres entiers ; la neige se règle par une quête Terrain', () => {
  assert.equal(TEMPETE.annonce, 3);
  assert.equal(TEMPETE.crans, 3);
  assert.deepEqual(TEMPETE.ecart, [7, 14]);
  for (const o of [TEMPETE.cran, TEMPETE.tenue, DEGATS.neige.reparer]) {
    assert.equal(Object.keys(o).length, 1);
    for (const v of Object.values(o)) assert.ok(Number.isInteger(v) && v > 0, String(v));
  }
  assert.deepEqual(Object.keys(TEMPETE.cran), ['materials'], 'un cran : rentrer du bois');
  assert.deepEqual(Object.keys(DEGATS.neige.reparer), ['energy'], 'déneiger : de l’Énergie (bible §8)');
  assert.equal(DEGATS.neige.quartier, 'champs', 'une quête Terrain déneige');
  assert.ok(Number.isInteger(DEGATS.neige.jours) && DEGATS.neige.jours >= 1);
  assert.deepEqual(Object.keys(IMPREVUS.mauvais), ['panne', 'ours', 'gel'], 'la neige n’est pas un imprévu de la semaine');
});

test('calendrier : de la première neige à la fin de mars, un écart de 7 jours au moins et de 14 au plus hors trêve ; ni tempête ni annonce pendant la trêve ; le même hiver lu à toute date', () => {
  for (let y = 2026; y <= 2040; y++) {
    const s = tempetesDeLHiver(`${y}-12-01`);
    assert.deepEqual(tempetesDeLHiver(`${y}-10-07`), s, `${y} : lu en octobre`);
    assert.deepEqual(tempetesDeLHiver(`${y + 1}-03-31`), s, `${y} : lu en mars`);
    assert.deepEqual(tempetesDeLHiver(`${y + 1}-06-30`), s, `${y} : lu en juin`);
    // 136 jours de la neige à la fin de mars : au moins 9 écarts de 14 jours, moins trois au plus dans les 18 jours de la
    // trêve et de son annonce ; au plus 19 écarts de 7 jours
    assert.ok(s.length >= 6 && s.length <= 19, `${y} : ${s.length} tempêtes`);
    assert.deepEqual([...s].sort(), s);
    for (const j of s) {
      assert.ok(j > `${y}-11-15` && j <= `${y + 1}-03-31`, j);
      for (let k = 0; k <= TEMPETE.annonce; k++) assert.ok(!isTruce(addDays(j, -k)), `${j} : annonce ou tempête pendant la trêve`);
      assert.ok(estJourDeTempete(j));
      assert.ok(!estJourDeTempete(addDays(j, 1)) && !estJourDeTempete(addDays(j, -1)));
    }
    for (let i = 1; i < s.length; i++) {
      const ecart = daysBetween(s[i - 1], s[i]);
      assert.ok(ecart >= 7, `${s[i - 1]} → ${s[i]}`);
      if (s[i - 1] > `${y + 1}-01-04` || s[i] < `${y}-12-21`) assert.ok(ecart <= 14, `${s[i - 1]} → ${s[i]} : ${ecart} jours`);
    }
  }
  assert.ok(!estJourDeTempete('2026-11-10') && !estJourDeTempete('2027-04-15') && !estJourDeTempete('2027-07-01'));
});

test('annonce : trois jours d’avance, une seule à la fois ; rien avant la fin des premiers pas', () => {
  const j = tempetesDeLHiver('2026-12-01')[0];
  assert.equal(tempeteEnVue(addDays(j, -4)), null);
  for (const k of [3, 2, 1, 0]) assert.deepEqual(tempeteEnVue(addDays(j, -k)), { jour: j, joursRestants: k });
  assert.equal(tempeteEnVue(addDays(j, 1)), null);
  const w = village(addDays(j, -3));
  const a = alerteTempete(w.tasks, w.game, w.ledger, at(addDays(j, -3)));
  assert.deepEqual([a.jour, a.joursRestants, a.crans, a.max], [j, 3, 0, 3]);
  const debutant = fresh([task()], at(addDays(j, -3)));
  assert.equal(alerteTempete(debutant.tasks, debutant.game, debutant.ledger, at(addDays(j, -3))), null, 'pendant les premiers pas : pas d’alerte');
});

test('barre de préparation : un cran par jour travaillé pendant l’annonce, au plus trois ; la veille de l’annonce, le jour même et une quête remballée ne comptent pas', () => {
  const j = tempete();
  const w = village(j);
  const ledger = [paye(addDays(j, -4)), paye(addDays(j, -3)), paye(addDays(j, -3), 'y'), paye(addDays(j, -2), 'z'), paye(j)];
  ledger.push({ key: reverseKey(`z-${addDays(j, -2)}`, 1), at: at(addDays(j, -2), 18), day: addDays(j, -2), type: 'reverse', taskId: `z-${addDays(j, -2)}`, occurrence: 1, pe: -7, energy: 0, materials: 0 });
  assert.deepEqual(preparation(w.game, ledger, j, j), { travailles: 1, achetes: 0, crans: 1, max: 3 });
  assert.deepEqual(preparation(w.game, [...ledger, paye(addDays(j, -1))], j, addDays(j, -1)), { travailles: 2, achetes: 0, crans: 2, max: 3 });
  const plein = { ...w.game, prepa: { jour: j, achetes: 2 } };
  assert.deepEqual(preparation(plein, [...ledger, paye(addDays(j, -1))], j, j), { travailles: 2, achetes: 2, crans: 3, max: 3 });
  assert.equal(preparation({ ...w.game, prepa: { jour: addDays(j, -11), achetes: 2 } }, ledger, j, j).achetes, 0, 'les crans d’une autre tempête ne comptent pas');
});

test('rentrer du bois : un cran pour son prix, une seule fois par cran, jamais au-delà de la barre ; raisons écrites ; rien au registre', () => {
  const j = tempete((x) => !lundi(x));
  const veille = addDays(j, -1);
  const w = village(veille, {}, [paye(addDays(j, -2))]);
  const prix = TEMPETE.cran.materials;
  assert.equal(refusPreparer(w.tasks, w.game, w.ledger, { jour: j, n: 1 }, at(veille)), null);
  const { world: w1, r } = step(w, preparer, { jour: j, n: 1 }, at(veille));
  assert.equal(w1.game.resources.materials, 50 - prix);
  assert.deepEqual(w1.game.prepa, { jour: j, achetes: 1 });
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.ops.map((op) => op.type), ['game.set']);
  assert.deepEqual(r.events.filter((e) => e.type === 'preparation').map((e) => [e.jour, e.crans, e.cout]), [[j, 2, TEMPETE.cran]]);
  // un second appareil qui n'a pas vu l'achat touche le même cran : refusé, rien ne bouge
  assert.throws(() => step(w1, preparer, { jour: j, n: 1 }, at(veille)), { message: 'Ce cran est déjà rentré.' });
  const { world: w2 } = step(w1, preparer, { jour: j, n: 2 }, at(veille));
  assert.equal(preparation(w2.game, w2.ledger, j, veille).crans, 3);
  assert.equal(refusPreparer(w2.tasks, w2.game, w2.ledger, { jour: j, n: 3 }, at(veille)), 'La barre est déjà pleine.');
  // raisons : pas d'annonce, la tempête est là, une autre tempête, ce qui manque
  assert.equal(refusPreparer(w.tasks, w.game, w.ledger, { jour: j, n: 1 }, at(addDays(j, -4))), 'Aucune tempête annoncée.');
  assert.equal(refusPreparer(w.tasks, w.game, w.ledger, { jour: j, n: 1 }, at(j)), 'La tempête est là\u00a0: trop tard pour se préparer.');
  assert.equal(refusPreparer(w.tasks, w.game, w.ledger, { jour: addDays(j, 7), n: 1 }, at(veille)), 'Aucune tempête annoncée.');
  const pauvre = { ...w.game, resources: { ...w.game.resources, materials: prix - 1 } };
  assert.equal(refusPreparer(w.tasks, pauvre, w.ledger, { jour: j, n: 1 }, at(veille)), 'Il manque 1 Matériau.');
  assert.throws(() => step({ ...w, game: pauvre }, preparer, { jour: j, n: 1 }, at(veille)), { message: 'Il manque 1 Matériau.' });
});

test('tempête tenue : barre pleine, une récompense au registre sous tempete:{jour}, une seule fois, même avec deux appareils', () => {
  const j = tempete();
  const w = village(j, { batiments: [...CHALETS, EOLIENNE] }, prets(j));
  const a = step(w, advanceTime, {}, at(j, 13));
  const e = cle(a.r, j);
  assert.deepEqual([e.type, e.resultat, e.materials, e.energy], ['tempete', 'tenue', TEMPETE.tenue.materials, 0]);
  assert.equal(a.world.game.resources.materials, 50 + TEMPETE.tenue.materials);
  assert.deepEqual(degatsActifs(a.world.game, at(j)), [], 'rien d’enseveli');
  assert.deepEqual(issue(a.r).map((x) => [x.jour, x.resultat]), [[j, 'tenue']]);
  const b = step(w, advanceTime, {}, at(j, 15)); // l'autre appareil n'a pas encore vu le premier
  assert.equal(cle(b.r, j).key, e.key, 'même clé : le serveur refuse la seconde');
  assert.deepEqual(step(a.world, advanceTime, {}, at(j, 15)).r.entries, [], 'une fois relu, rien de plus');
  // achetés ou travaillés, les crans se valent
  const achete = village(j, { prepa: { jour: j, achetes: 2 } }, [paye(addDays(j, -1))]);
  assert.equal(cle(step(achete, advanceTime, {}, at(j)).r, j).resultat, 'tenue');
});

test('tempête tenue manquée : la récompense attend jusqu’au dimanche ; la semaine suivante l’oublie', () => {
  const j = tempete((x) => !dimanche(x));
  const w = village(addDays(j, 1), {}, prets(j));
  w.game.lastSeenDay = addDays(j, -1);
  const { r } = step(w, advanceTime, {}, at(addDays(j, 1)));
  assert.equal(cle(r, j).resultat, 'tenue');
  const tard = village(addDays(weekStart(j), 7), {}, prets(j));
  tard.game.lastSeenDay = addDays(j, -1);
  assert.equal(cle(step(tard, advanceTime, {}, at(addDays(weekStart(j), 7))).r, j), undefined);
});

test('bâtiment enseveli : annonce vue, barre pas pleine, ouverture le jour même ; l’éolienne ne produit plus ; rien de retiré, aucune tâche touchée', () => {
  const j = tempete();
  const w = village(j, { batiments: [...CHALETS, EOLIENNE] }, [paye(addDays(j, -2))]);
  const { world, r } = step(w, advanceTime, {}, at(j));
  const [d] = degatsActifs(world.game, at(j));
  assert.deepEqual([d.type, d.cible, d.le, d.jusqua, d.id], ['neige', 'eolienne-1', j, addDays(j, DEGATS.neige.jours), `neige:${j}`]);
  assert.deepEqual(world.game.resources, w.game.resources, 'la neige ne retire rien');
  assert.deepEqual(r.tasks, w.tasks);
  assert.ok(!r.ops.some((op) => op.type.startsWith('task.')));
  const e = cle(r, j);
  assert.deepEqual([e.resultat, e.cible, e.materials, e.energy], ['neige', 'eolienne-1', 0, 0]);
  assert.deepEqual(issue(r).map((x) => [x.resultat, x.cible, x.degat, x.jusqua]), [['neige', 'eolienne-1', d.id, d.jusqua]]);
  const { r: r2 } = step(world, completeQuest, { id: 'q-enfants' }, at(j, 16));
  assert.equal(r2.entries.filter((x) => x.type === 'prod').length, 0, 'l’éolienne ensevelie ne tourne pas');
  assert.deepEqual(r2.events.filter((x) => x.type === 'eolienne-arretee').map((x) => x.energy), [EOLIENNE_ENERGIE]);
});

test('serre ensevelie : une culture pas mûre ; les jours travaillés sous la neige ne comptent pas pour la pousse', () => {
  const j = tempete((x) => daysBetween(x, tempetesDeLHiver(x).find((y) => y > x) || '2999-01-01') > DEGATS.neige.jours);
  const seme = addDays(j, -6);
  const w = village(j, { batiments: [...CHALETS, ATELIER, SERRE], parcelles: [{ id: 'serre-1', semeLe: seme }] }, [paye(addDays(j, -5)), paye(addDays(j, -2))]);
  const { world } = step(w, advanceTime, {}, at(j));
  const d = degatDe(world.game, 'serre-1', at(j));
  assert.deepEqual([d.type, d.semeLe], ['neige', seme]);
  const sous = [paye(j, 'a'), paye(addDays(j, 1), 'a')];
  const fonte = addDays(j, DEGATS.neige.jours);
  const apres = [...world.ledger, ...sous, paye(fonte, 'a')];
  assert.equal(etatCulture(world.game, [...world.ledger, ...sous], 'serre-1', at(addDays(j, 1))).jours, 2, 'sous la neige, la serre ne pousse pas');
  assert.equal(etatCulture(world.game, apres, 'serre-1', at(fonte)).jours, 3, 'la neige fondue, elle repousse');
  // la semaine suivante, le rangement des vieux dégâts garde cette neige tant que la culture est en terre
  const suivante = addDays(weekStart(j), 7);
  const { world: w2 } = step({ ...world, ledger: apres }, advanceTime, {}, at(suivante));
  assert.equal(etatCulture(w2.game, w2.ledger, 'serre-1', at(suivante)).jours, 3, 'les jours sous la neige restent perdus');
});

test('déneiger : en payant (Énergie), une seule fois ; une quête Terrain déneige, pas une quête Maison ; « Remballer » la rouvre ; sinon la neige fond seule', () => {
  const j = tempete();
  const { world } = step(village(j, { batiments: [...CHALETS, EOLIENNE] }), advanceTime, {}, at(j));
  const [d] = degatsActifs(world.game, at(j));
  const prix = DEGATS.neige.reparer.energy;
  const { world: w1, r } = step(world, reparer, { id: d.id }, at(j, 15));
  assert.equal(w1.game.resources.energy, 50 - prix);
  assert.deepEqual(r.entries, []);
  assert.deepEqual(r.events.filter((x) => x.type === 'reparation').map((x) => [x.imprevu, x.par, x.cout]), [['neige', 'paiement', DEGATS.neige.reparer]]);
  assert.equal(degatDe(w1.game, 'eolienne-1', at(j, 15)), null);
  assert.equal(refusReparer(w1.game, { id: d.id }, at(j, 15)), 'Déjà déneigé.');
  // une quête Maison ne déneige pas ; une quête Terrain, si, et « Remballer » la rouvre
  const m = step(world, completeQuest, { id: 'q-maison' }, at(j, 16));
  assert.ok(degatDe(m.world.game, 'eolienne-1', at(j, 16)));
  const t = step(world, completeQuest, { id: 'q-terrain' }, at(j, 16));
  assert.equal(degatDe(t.world.game, 'eolienne-1', at(j, 16)), null);
  assert.deepEqual(t.r.events.filter((x) => x.type === 'reparation').map((x) => [x.imprevu, x.par]), [['neige', 'quete']]);
  assert.equal(refusReparer(t.world.game, { id: d.id }, at(j, 16)), 'Déjà déneigé par une quête.');
  const back = step(t.world, remballerQuest, { id: 'q-terrain' }, at(j, 17));
  assert.ok(degatDe(back.world.game, 'eolienne-1', at(j, 17)), 'la neige revient avec « Remballer »');
  // la neige fond seule
  const fonte = addDays(j, DEGATS.neige.jours);
  assert.ok(degatDe(world.game, 'eolienne-1', at(addDays(fonte, -1))));
  assert.equal(degatDe(world.game, 'eolienne-1', at(fonte)), null);
  assert.equal(refusReparer(world.game, { id: d.id }, at(fonte)), 'La neige a fondu\u00a0: rien à payer.');
});

test('jamais à cause d’une absence : annonce pas vue, pas d’ouverture le jour même, ou reprise : la tempête passe sans rien laisser', () => {
  const j = tempete((x) => !dimanche(x));
  const B = [...CHALETS, EOLIENNE];
  // dernière ouverture avant l'annonce : jamais vue
  const pasVue = village(j, { batiments: B, lastSeenDay: addDays(j, -4) });
  let s = step(pasVue, advanceTime, {}, at(j));
  assert.deepEqual(degatsActifs(s.world.game, at(j)), []);
  assert.deepEqual([cle(s.r, j).resultat, issue(s.r)[0].raison], ['passee', 'pas-vue']);
  // annonce vue, mais pas d'ouverture le jour même : rien le lendemain
  const absent = village(addDays(j, 1), { batiments: B, lastSeenDay: addDays(j, -1) });
  s = step(absent, advanceTime, {}, at(addDays(j, 1)));
  assert.deepEqual(degatsActifs(s.world.game, at(addDays(j, 1))), []);
  assert.deepEqual([cle(s.r, j).resultat, issue(s.r)[0].raison], ['passee', 'absent']);
  // reprise après une absence (retour la veille) : rien
  const reprise = village(j, { batiments: B, reprise: { du: addDays(j, -1), au: addDays(j, 1) } });
  s = step(reprise, advanceTime, {}, at(j));
  assert.deepEqual(degatsActifs(s.world.game, at(j)), []);
  assert.deepEqual([cle(s.r, j).resultat, issue(s.r)[0].raison], ['passee', 'reprise']);
  // rejoué après coup : un passage du temps du jour de la tempête, alors que la partie l'a déjà dépassé
  const rejoue = village(j, { batiments: B, lastSeenDay: addDays(j, 1) });
  s = step(rejoue, advanceTime, {}, at(j));
  assert.deepEqual(degatsActifs(s.world.game, at(addDays(j, 1))), []);
});

test('rien à ensevelir (ni éolienne libre, ni culture verte en serre) : la tempête passe ; un bâtiment ne porte qu’un dégât', () => {
  const j = tempete();
  let s = step(village(j), advanceTime, {}, at(j));
  assert.deepEqual([cle(s.r, j).resultat, issue(s.r)[0].raison], ['passee', 'rien']);
  // serre mûre : rien à arrêter
  const mure = village(j, { batiments: [...CHALETS, ATELIER, SERRE], parcelles: [{ id: 'serre-1', semeLe: addDays(j, -12) }] }, [1, 2, 3, 4, 5].map((k) => paye(addDays(j, -12 + k), 'm')));
  s = step(mure, advanceTime, {}, at(j));
  assert.deepEqual(degatsActifs(s.world.game, at(j)), []);
  // éolienne déjà en panne : la neige ne s'y ajoute pas
  const panne = [{ id: `panne:${addDays(j, -1)}`, type: 'panne', cible: 'eolienne-1', le: addDays(j, -1), jusqua: addDays(j, 2) }];
  s = step(village(j, { batiments: [...CHALETS, EOLIENNE], degats: panne }), advanceTime, {}, at(j));
  assert.deepEqual(degatsActifs(s.world.game, at(j)).map((d) => d.type), ['panne']);
  assert.equal(cle(s.r, j).resultat, 'passee');
});

test('trêve des Fêtes : une neige qui y serait encore ne tombe pas', () => {
  const j = tempete((x) => !isTruce(x) && isTruce(addDays(x, DEGATS.neige.jours - 1)));
  const s = step(village(j, { batiments: [...CHALETS, EOLIENNE] }), advanceTime, {}, at(j));
  assert.deepEqual(degatsActifs(s.world.game, at(j)), []);
  assert.deepEqual([cle(s.r, j).resultat, issue(s.r)[0].raison], ['passee', 'rien']);
});

test('jamais deux coups le même jour : le jour d’une tempête, le second imprévu de la semaine ne peut pas être mauvais', () => {
  const j = tempete((x) => calendrierImprevus(x).creneaux.some((c) => c.jour === x && c.nature === 'mauvais'));
  const w = village(j, { batiments: [...CHALETS, EOLIENNE] });
  w.ledger = w.ledger.filter((e) => e.key !== `imprevu:${j}`);
  const { world, r } = step(w, advanceTime, {}, at(j));
  assert.deepEqual(degatsActifs(world.game, at(j)).map((d) => d.type), ['neige']);
  const imp = r.entries.find((e) => e.key === `imprevu:${j}`);
  assert.ok(Object.hasOwn(IMPREVUS.bons, imp.imprevu), `${imp.imprevu} : le mauvais devient un bon`);
  // tempête tenue : l'éolienne reste libre, et pourtant pas de panne ce jour-là
  const tenue = village(j, { batiments: [...CHALETS, EOLIENNE] }, prets(j));
  tenue.ledger = tenue.ledger.filter((e) => e.key !== `imprevu:${j}`);
  const t = step(tenue, advanceTime, {}, at(j));
  assert.equal(cle(t.r, j).resultat, 'tenue');
  assert.deepEqual(degatsActifs(t.world.game, at(j)), []);
  assert.ok(Object.hasOwn(IMPREVUS.bons, t.r.entries.find((e) => e.key === `imprevu:${j}`).imprevu));
});

test('pas de tempête pendant les premiers pas', () => {
  const j = tempete();
  const w = village(j, { batiments: [...CHALETS, EOLIENNE] });
  w.game.premiersPas = {};
  w.game.batiments = [EOLIENNE];
  const { world, r } = step(w, advanceTime, {}, at(j));
  assert.equal(cle(r, j), undefined);
  assert.deepEqual(degatsActifs(world.game, at(j)), []);
});

test('un hiver entier de passage du temps : aucune tâche touchée, aucune ressource retirée, chaque tempête réglée une fois, rien pendant la trêve', () => {
  const debut = '2026-11-01';
  let w = village(debut, { batiments: [...CHALETS, EOLIENNE] });
  const vues = new Map();
  for (let i = 0; i < 156; i++) {
    const day = addDays(debut, i);
    if (i % 2 === 0) w = { ...w, ledger: [...w.ledger, paye(day, 'h')] };
    const avant = w.game.resources;
    const s = step(w, advanceTime, {}, at(day));
    assert.deepEqual(s.r.tasks, w.tasks);
    assert.ok(!s.r.ops.some((op) => op.type.startsWith('task.')), day);
    for (const k of ['energy', 'materials', 'food']) assert.ok(s.world.game.resources[k] >= avant[k], `${day} : ${k}`);
    for (const e of issue(s.r)) {
      vues.set(e.jour, (vues.get(e.jour) || 0) + 1);
      assert.ok(!isTruce(e.jour), e.jour);
    }
    for (const d of degatsActifs(s.world.game, at(day))) if (d.type === 'neige') assert.ok(!isTruce(day), `${day} : neige pendant la trêve`);
    w = s.world;
  }
  assert.deepEqual([...vues.keys()], tempetesDeLHiver('2026-12-01'), 'chaque tempête de l’hiver, dans l’ordre');
  assert.ok([...vues.values()].every((n) => n === 1));
});

test('objectif d’hiver : les récoltes de la petite serre de décembre à février ; ni novembre ni le potager ; une récompense une seule fois ; l’hiver suivant repart de zéro', () => {
  const obj = OBJECTIFS_SAISON.hiver;
  assert.equal(obj.id, 'serre');
  assert.ok(Number.isInteger(obj.recoltes) && obj.recoltes >= 2);
  // une culture mûre dans la serre (ou la parcelle) au jour dit, réserve vide
  const recolte = (w, id, day) => {
    const semeLe = addDays(day, -10);
    const x = { ...w, game: { ...w.game, resources: { ...w.game.resources, food: 0 }, parcelles: [{ id, semeLe }] }, ledger: [...w.ledger, ...[1, 2, 3, 4, 5].map((k) => paye(addDays(semeLe, k), `${id}-${day}`))] };
    return step(x, recolter, { id }, at(day));
  };
  let w = village('2026-11-20', { batiments: [...CHALETS, ATELIER, SERRE] });
  ({ world: w } = recolte(w, 'serre-1', '2026-11-20'));
  assert.equal(recoltesHiver(w.game, 'hiver-2026'), 0, 'novembre : pas encore l’hiver');
  ({ world: w } = recolte(w, 'parcelle-1', '2026-12-02'));
  assert.equal(recoltesHiver(w.game, 'hiver-2026'), 0, 'le potager ne compte pas');
  let r;
  for (let k = 1; k <= obj.recoltes; k++) {
    const day = addDays('2026-12-03', 9 * k);
    ({ world: w, r } = recolte(w, 'serre-1', day));
    assert.equal(recoltesHiver(w.game, 'hiver-2026'), k, day);
    const o = objectifSaison(w.game, w.ledger, at(day));
    assert.deepEqual([o.objectif, o.stock, o.max], ['serre', k, obj.recoltes]);
    const paye = r.entries.filter((e) => e.key === 'saison:hiver-2026');
    assert.equal(paye.length, k === obj.recoltes ? 1 : 0, day);
  }
  assert.ok(objectifSaison(w.game, w.ledger, at('2027-02-20')).atteint);
  assert.deepEqual(r.events.filter((e) => e.type === 'objectif-saison').map((e) => [e.objectif, e.permis]), [['serre', obj.recompense.permis]]);
  // une récolte de plus ne repaie rien
  ({ r } = recolte(w, 'serre-1', '2027-02-25'));
  assert.equal(r.entries.filter((e) => e.type === 'saison').length, 0);
  assert.equal(recoltesHiver(w.game, 'hiver-2027'), 0, 'l’hiver suivant repart de zéro');
});

test('une partie qui porte les clés de l’hiver les garde : relecture et gestes ordinaires', () => {
  const jour = '2026-12-02';
  const degats = [{ id: `neige:${jour}`, type: 'neige', cible: 'eolienne-1', le: jour, jusqua: addDays(jour, DEGATS.neige.jours) }];
  const prepa = { jour: '2026-12-12', achetes: 1 };
  const hiver = { cle: 'hiver-2026', n: 2 };
  const w = village(jour, { degats, prepa, recoltesHiver: hiver, batiments: [...CHALETS, EOLIENNE, ATELIER], habitants: 1, resources: { energy: 200, materials: 200, food: 30 } });
  const relue = migrateState(JSON.parse(JSON.stringify(w.game)), at(jour));
  assert.deepEqual([relue.degats, relue.prepa, relue.recoltesHiver], [degats, prepa, hiver]);
  let x = { ...w, game: relue };
  ({ world: x } = step(x, construire, { type: 'serre' }, at(jour)));
  ({ world: x } = step(x, accueillir, {}, at(jour)));
  ({ world: x } = step(x, semer, { id: 'serre-1' }, at(jour)));
  ({ world: x } = step(x, advanceTime, {}, at(jour, 16)));
  assert.deepEqual([x.game.degats, x.game.prepa, x.game.recoltesHiver], [degats, prepa, hiver]);
});
