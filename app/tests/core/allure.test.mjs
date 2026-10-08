// L'allure du village (bible §9, lot A, plan validé par Alex le 7 octobre 2026 au soir) : au ralenti, régulier, plein
// régime. Calculée chaque lundi d'après les quêtes payées les 14 jours d'avant (remballées exclues) ; moins de 14, au
// ralenti ; plus de 70, plein régime ; un cran au plus par semaine ; « régulier » au départ et tant que la partie a moins
// de 14 jours. Seules les quêtes comptent (les réserves viendront avec les grands chantiers). Elle change le nombre
// d'imprévus, la cible de l'objectif de saison et la quête proposée au ralenti ; jamais un prix ni un gain de quête.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLURE, allureDe, plusCourte, calendrierImprevus, advanceTime, completeQuest, reparer, objectifSaison, bandeau,
  morningLetter, weeklyReview, figerBilans, listQuests, OBJECTIFS_SAISON, PAS_IDS, addDays, weekStart, stockageBase,
  recolter, degatsActifs, IMPREVUS, construire, BATIMENTS, ALLURE_BILAN_JOURS, daysBetween,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const LUNDI = '2026-10-19'; // lundi
const DEPART = '2026-08-03'; // partie de plus de 14 jours
const lundis = (depuis, n) => Array.from({ length: n }, (_, k) => addDays(weekStart(depuis), 7 * k));

// Une quête payée ce jour-là (forme du registre, quête fictive).
const paye = (day, id) => ({ key: `reward:${id}:1`, at: at(day), day, type: 'reward', taskId: id, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });
// n quêtes payées, réparties sur les 14 jours qui finissent la veille de `lundi`.
const quetes = (lundi, n, tag = 'q') => Array.from({ length: n }, (_, k) => paye(addDays(lundi, -1 - (k % 14)), `${tag}-${lundi}-${k}`));
// n quêtes payées sur les 7 jours qui finissent la veille de `lundi` (une seule fenêtre de lundi les voit en entier).
const sur7 = (lundi, n, tag) => Array.from({ length: n }, (_, k) => paye(addDays(lundi, -1 - (k % 7)), `${tag}-${lundi}-${k}`));
const partie = (depart = DEPART) => { const w = fresh([], at(depart)); return w.game; };

test('départ à « régulier », et il y reste tant que la partie a moins de 14 jours au lundi, même sans quête', () => {
  const game = partie(LUNDI);
  assert.equal(allureDe(game, [], LUNDI).niveau, 'regulier');
  assert.equal(allureDe(game, [], addDays(LUNDI, 7)).niveau, 'regulier'); // 7 jours au lundi
  assert.equal(allureDe(game, [], addDays(LUNDI, 13)).niveau, 'regulier');
  const a = allureDe(game, [], addDays(LUNDI, 14)); // 14 jours au lundi : la fenêtre est pleine, aucune quête
  assert.deepEqual([a.niveau, a.quetes, a.cible], ['ralenti', 0, 'ralenti']);
  assert.equal(allureDe(game, [], addDays(LUNDI, 7)).quetes, null);
});

test('cible : moins de 14 quêtes en 14 jours au ralenti, plus de 70 plein régime, régulier entre les deux (bornes)', () => {
  assert.deepEqual([ALLURE.fenetre, ALLURE.ralenti, ALLURE.plein], [14, 14, 70]);
  const game = partie();
  for (const [n, cible] of [[0, 'ralenti'], [13, 'ralenti'], [14, 'regulier'], [70, 'regulier'], [71, 'plein']]) {
    const a = allureDe(game, quetes(LUNDI, n), LUNDI);
    assert.deepEqual([a.quetes, a.cible], [n, cible], `${n} quêtes`);
  }
});

test('un cran par semaine au plus : du ralenti au plein régime en deux semaines, et l’inverse', () => {
  const game = partie();
  // des semaines sans rien : au ralenti
  assert.equal(allureDe(game, [], LUNDI).niveau, 'ralenti');
  // puis 100 quêtes par semaine pendant deux semaines : régulier la 1re semaine, plein régime la 2e
  const vite = [...sur7(addDays(LUNDI, 7), 100, 'a'), ...sur7(addDays(LUNDI, 14), 100, 'b')];
  assert.equal(allureDe(game, vite, LUNDI).niveau, 'ralenti');
  const s1 = allureDe(game, vite, addDays(LUNDI, 7));
  assert.deepEqual([s1.quetes, s1.cible, s1.niveau, s1.change], [100, 'plein', 'regulier', 1]);
  const s2 = allureDe(game, vite, addDays(LUNDI, 14));
  assert.deepEqual([s2.quetes, s2.niveau, s2.change], [200, 'plein', 1]);
  assert.deepEqual([allureDe(game, vite, addDays(LUNDI, 21)).niveau], ['plein']); // fenêtre : encore les 100 de « b »
  // puis une absence : un cran de moins par semaine
  const s4 = allureDe(game, vite, addDays(LUNDI, 28));
  assert.deepEqual([s4.quetes, s4.cible, s4.niveau, s4.change], [0, 'ralenti', 'regulier', -1]);
  assert.equal(allureDe(game, vite, addDays(LUNDI, 35)).niveau, 'ralenti');
  const steps = lundis(addDays(LUNDI, 14), 9).map((l) => allureDe(game, vite, l).niveau);
  for (let k = 1; k < steps.length; k++) {
    const ordre = ['ralenti', 'regulier', 'plein'];
    assert.ok(Math.abs(ordre.indexOf(steps[k]) - ordre.indexOf(steps[k - 1])) <= 1, steps.join(' → '));
  }
});

test('une quête remballée ne compte pas', () => {
  const game = partie();
  const l = quetes(LUNDI, 14);
  assert.equal(allureDe(game, l, LUNDI).cible, 'regulier');
  const r = l[0];
  const remballee = [...l, { key: `reverse:${r.taskId}:${r.occurrence}`, at: r.at, day: r.day, type: 'reverse', taskId: r.taskId, occurrence: r.occurrence, pe: -7, energy: 0, materials: 0 }];
  assert.deepEqual([allureDe(game, remballee, LUNDI).quetes, allureDe(game, remballee, LUNDI).cible], [13, 'ralenti']);
});

test('la même allure partout : lecture pure, ordre du registre indifférent, stable du lundi au dimanche, rien dans la partie', () => {
  const game = partie();
  const l = quetes(LUNDI, 30);
  const a = allureDe(game, l, LUNDI);
  assert.deepEqual(allureDe(structuredClone(game), [...l].reverse(), addDays(LUNDI, 6)), a);
  // une quête payée pendant la semaine ne change pas l'allure de la semaine
  assert.deepEqual(allureDe(game, [...l, paye(addDays(LUNDI, 2), 'mardi')], addDays(LUNDI, 6)), a);
  // le passage du temps n'écrit rien de l'allure dans la partie
  const w = { tasks: [], game: { ...structuredClone(game), premiersPas: Object.fromEntries(PAS_IDS.map((id) => [id, DEPART])), lastSeenDay: addDays(LUNDI, -1) }, ledger: l };
  const r = step(w, advanceTime, {}, at(LUNDI));
  assert.ok(!Object.keys(r.world.game).some((k) => /allure/i.test(k)), Object.keys(r.world.game).join());
});

// Calendrier d'avant le lot (lot I), recopié pour vérifier que « régulier » n'a pas bougé.
function ancienCalendrier(day, tirage) {
  const semaine = weekStart(day);
  const h = tirage(`imprevus:${semaine}`);
  const a = h % 7;
  const b = (a + 1 + (Math.floor(h / 7) % 6)) % 7;
  const mauvais = Math.floor(h / 42) % 2 === 1;
  return { semaine, creneaux: [{ jour: addDays(semaine, Math.min(a, b)), nature: 'bon' }, { jour: addDays(semaine, Math.max(a, b)), nature: mauvais ? 'mauvais' : 'bon' }] };
}

test('calendrier : « régulier » est exactement celui d’avant ; au ralenti, les deux mêmes jours, tous deux bons ; plein régime, quatre jours distincts', async () => {
  const { tirage } = await import('../../core/imprevus.js');
  let mauvaisPlein = 0;
  for (const l of lundis('2026-01-05', 520)) {
    assert.deepEqual(calendrierImprevus(l), ancienCalendrier(l, tirage), l);
    assert.deepEqual(calendrierImprevus(l, 'regulier'), ancienCalendrier(l, tirage), l);
    const ralenti = calendrierImprevus(addDays(l, 3), 'ralenti');
    assert.deepEqual(ralenti.creneaux, ancienCalendrier(l, tirage).creneaux.map((c) => ({ ...c, nature: 'bon' })));
    const plein = calendrierImprevus(addDays(l, 5), 'plein').creneaux;
    assert.equal(plein.length, 4);
    assert.equal(new Set(plein.map((c) => c.jour)).size, 4, `${l} : quatre jours distincts`);
    assert.ok(plein.every((c) => c.jour >= l && c.jour <= addDays(l, 6)));
    assert.deepEqual([...plein].sort((x, y) => (x.jour < y.jour ? -1 : 1)), plein, 'dans l’ordre des jours');
    for (const c of ancienCalendrier(l, tirage).creneaux) assert.ok(plein.some((p) => p.jour === c.jour && p.nature === c.nature), `${l} : les deux d’avant restent`);
    assert.ok(plein.filter((c) => c.nature === 'bon').length >= 2);
    mauvaisPlein += plein.filter((c) => c.nature === 'mauvais').length;
  }
  // deux créneaux à pile ou face par semaine : en moyenne un mauvais (borne large sur 520 semaines)
  assert.ok(mauvaisPlein > 0.8 * 520 && mauvaisPlein < 1.2 * 520, String(mauvaisPlein));
});

// Village sorti des premiers pas, avec une éolienne (cible d'un mauvais imprévu), vu la veille de `jour`.
function village(jour, ledger) {
  const w = fresh([task({ id: 'q-maison', domain: 'Maison' })], at(DEPART));
  w.game.resources = { energy: 50, materials: 50, food: 10 };
  w.game.habitants = 3;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, DEPART]));
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'eolienne-1', type: 'eolienne' }];
  w.game.lastSeenDay = addDays(jour, -1);
  w.game.lastOpenDay = addDays(jour, -1);
  w.ledger = ledger;
  return w;
}
// Une semaine jouée jour par jour (passage du temps chaque matin) ; renvoie les imprévus tirés.
function semaine(lundi, ledger) {
  let w = village(lundi, ledger);
  const tires = [];
  for (let k = 0; k < 7; k++) {
    const s = step(w, advanceTime, {}, at(addDays(lundi, k)));
    w = s.world;
    tires.push(...s.r.entries.filter((e) => e.type === 'imprevu'));
    assert.ok(!s.r.ops.some((o) => o.type === 'task.upsert' || o.type === 'task.delete'), 'aucune tâche touchée');
  }
  return tires;
}

test('au ralenti : deux imprévus par semaine, jamais mauvais (aucun cadeau en moins) ; plein régime : jusqu’à quatre, jamais deux le même jour', () => {
  let pleinMauvais = 0, pleinTotal = 0;
  for (const l of lundis('2027-04-05', 40)) { // avril à décembre : hors des tempêtes (sauf la trêve, sans effet ici)
    const lent = semaine(l, []);
    assert.equal(allureDe(village(l, []).game, [], l).niveau, 'ralenti');
    assert.equal(lent.length, 2, `${l} : ${lent.length}`);
    assert.ok(lent.every((e) => !e.cible), `${l} : un mauvais au ralenti`);
    // plein régime : 100 quêtes sur chacune des deux fenêtres qui précèdent ce lundi
    const vite = [...quetes(addDays(l, -7), 100, 'a'), ...quetes(l, 100, 'b')];
    assert.equal(allureDe(village(l, vite).game, vite, l).niveau, 'plein');
    const fort = semaine(l, vite);
    assert.ok(fort.length <= 4, `${l} : ${fort.length}`);
    assert.equal(new Set(fort.map((e) => e.key)).size, fort.length, 'une clé par jour : jamais deux le même jour');
    pleinMauvais += fort.filter((e) => e.cible).length;
    pleinTotal += fort.length;
  }
  assert.ok(pleinTotal > 2 * 40, `plein régime : ${pleinTotal} imprévus en 40 semaines`);
  assert.ok(pleinMauvais > 0, 'plein régime : des mauvais aussi');
});

test('jamais un prix ni un gain de quête selon l’allure : même gain, même prix de réparation, même prix de construction', () => {
  const lents = [];
  const vite = [...quetes(addDays(LUNDI, -7), 100, 'a'), ...quetes(LUNDI, 100, 'b')];
  const jour = addDays(LUNDI, 2);
  const res = {};
  for (const [nom, l] of [['ralenti', lents], ['plein', vite]]) {
    const w = village(jour, l);
    w.tasks = [task({ id: 'p', priority: 8, length: 5, difficulty: 6, created: DEPART })];
    w.game.degats = [{ id: 'panne:x', type: 'panne', cible: 'eolienne-1', le: jour, jusqua: addDays(jour, 3) }];
    assert.equal(allureDe(w.game, l, jour).niveau, nom);
    const q = step(w, completeQuest, { id: 'p' }, at(jour));
    const gain = q.r.entries.find((e) => e.type === 'reward');
    const rep = step(w, reparer, { id: 'panne:x' }, at(jour));
    const bat = step(w, construire, { type: 'chalet' }, at(jour));
    res[nom] = { gain: [gain.pe, gain.energy, gain.materials], reparation: rep.r.events.find((e) => e.type === 'reparation').cout, chalet: bat.r.events.find((e) => e.type === 'construction').cout };
  }
  assert.deepEqual(res.ralenti, res.plein);
  assert.deepEqual(res.ralenti.reparation, IMPREVUS.mauvais.panne.reparer);
  assert.deepEqual(res.ralenti.chalet, BATIMENTS.chalet.cout);
});

test('objectif de saison réduit au ralenti, à l’automne comme l’hiver ; payé une fois, il le reste si l’allure remonte', () => {
  // automne : la moitié du stockage de base
  const automne = '2026-10-21';
  const w = village(automne, []);
  assert.equal(allureDe(w.game, [], automne).niveau, 'ralenti');
  const o = objectifSaison(w.game, w.ledger, at(automne));
  assert.equal(o.max, Math.ceil(stockageBase(w.game) * OBJECTIFS_SAISON.automne.partRalenti));
  const vite = quetes(weekStart(automne), 30);
  assert.equal(objectifSaison(w.game, vite, at(automne)).max, stockageBase(w.game)); // régulier : le grenier plein
  // hiver : moins de récoltes de serre
  const hiver = '2027-01-13';
  const h = village(hiver, []);
  assert.equal(objectifSaison(h.game, [], at(hiver)).max, OBJECTIFS_SAISON.hiver.recoltesRalenti);
  assert.ok(OBJECTIFS_SAISON.hiver.recoltesRalenti < OBJECTIFS_SAISON.hiver.recoltes);
  assert.equal(objectifSaison(h.game, quetes(weekStart(hiver), 30), at(hiver)).max, OBJECTIFS_SAISON.hiver.recoltes);
  // au ralenti, la cible réduite atteinte paie l'objectif, une seule fois ; l'allure qui remonte ne le reprend pas
  h.game.recoltesHiver = { cle: 'hiver-2026', n: OBJECTIFS_SAISON.hiver.recoltesRalenti };
  const s = step(h, advanceTime, {}, at(hiver));
  assert.equal(s.r.entries.filter((e) => e.key === 'saison:hiver-2026').length, 1);
  const apres = { ...s.world, ledger: [...s.world.ledger, ...quetes(addDays(weekStart(hiver), 7), 30)] };
  const o2 = objectifSaison(apres.game, apres.ledger, at(addDays(weekStart(hiver), 7)));
  assert.deepEqual([o2.atteint, o2.max], [true, OBJECTIFS_SAISON.hiver.recoltes]);
  assert.equal(step(apres, advanceTime, {}, at(addDays(weekStart(hiver), 8))).r.entries.filter((e) => e.key.startsWith('saison:')).length, 0);
});

test('au ralenti, la lettre du matin et le bandeau proposent la quête la plus courte ; l’ordre de la liste ne change pas', () => {
  const jour = '2026-10-21';
  const tasks = [
    task({ id: 'longue', task: 'Quête longue', priority: 10, length: 8, difficulty: 2, created: DEPART }),
    task({ id: 'courte-b', task: 'Quête courte B', priority: 4, length: 1, difficulty: 2, created: DEPART }),
    task({ id: 'courte-a', task: 'Quête courte A', priority: 6, length: 1, difficulty: 2, created: DEPART }),
    task({ id: 'moyenne', task: 'Quête moyenne', priority: 7, length: 3, difficulty: 2, created: DEPART }),
  ];
  const w = village(jour, []);
  const ordre = listQuests(tasks, {}, at(jour)).map((t) => t.id);
  assert.equal(ordre[0], 'longue');
  // la plus courte ; à durée égale, la mieux placée dans la Cote
  assert.equal(plusCourte(tasks, at(jour)).id, ordre.find((id) => id.startsWith('courte')));
  const lettres = { matin: [{ id: 'm1', texte: ['Bonjour.', 'Il y a « {quete} ».'] }] };
  // au ralenti
  assert.equal(allureDe(w.game, [], jour).niveau, 'ralenti');
  assert.equal(bandeau(tasks, w.game, [], at(jour)).aujourdhui.taskId, plusCourte(tasks, at(jour)).id);
  const lettre = morningLetter(lettres, tasks, w.game, at(jour), { ledger: [] });
  assert.equal(lettre.questId, plusCourte(tasks, at(jour)).id);
  assert.match(lettre.lignes[1], /Quête courte/);
  // régulier : la première de la Cote, comme avant
  const vite = quetes(weekStart(jour), 30);
  assert.equal(bandeau(tasks, w.game, vite, at(jour)).aujourdhui.taskId, 'longue');
  assert.equal(morningLetter(lettres, tasks, w.game, at(jour), { ledger: vite }).questId, 'longue');
  // sans registre, la lettre garde la première de la Cote
  assert.equal(morningLetter(lettres, tasks, w.game, at(jour)).questId, 'longue');
  // la liste, elle, ne bouge pas
  assert.deepEqual(listQuests(tasks, {}, at(jour)).map((t) => t.id), ordre);
});

test('bilan : l’allure de la semaine et sa raison ; un bilan figé garde la sienne', () => {
  const game = partie();
  const l = quetes(LUNDI, 21);
  const r = weeklyReview([], game, l, at(addDays(LUNDI, 6)));
  assert.deepEqual(r.allure, { niveau: 'regulier', quetes: 21 });
  // la semaine suivante, la semaine du 19 est figée avec son allure
  const g = { ...game, bilans: [] };
  const fige = figerBilans([], g, [...l, paye(addDays(LUNDI, 1), 'semaine')], at(addDays(LUNDI, 8)));
  const b = fige.find((x) => x.semaine.start === LUNDI);
  assert.deepEqual(b.allure, { niveau: 'regulier', quetes: 21 });
  // partie trop jeune : l'allure est là, sans compte
  const jeune = partie(LUNDI);
  assert.deepEqual(weeklyReview([], jeune, [], at(LUNDI)).allure, { niveau: 'regulier', quetes: null });
});

test('bilan figé longtemps après sa semaine : sans allure plutôt qu’une fausse (registre complet sur 60 jours seulement)', () => {
  const game = { ...partie(), bilans: [] };
  const mercredi = addDays(LUNDI, 2);
  const l = [];
  for (let d = DEPART; d <= mercredi; d = addDays(d, 1)) for (let k = 0; k < 3; k++) l.push(paye(d, `t-${d}-${k}`));
  // le registre tel que le serveur l'envoie ce jour-là : au-delà de 60 jours, la clé seule
  const vu = (jour) => l.map((e) => (daysBetween(e.day, jour) > 60 ? { key: e.key } : e));
  const fige = (jour) => figerBilans([], game, vu(jour), at(jour)).find((x) => x.semaine.start === LUNDI);
  // retour 55 jours plus tard : la fenêtre est hors du registre complet ; rejouée, elle donnerait une allure fausse
  const tard = addDays(mercredi, 55);
  assert.notDeepEqual(allureDe(game, vu(tard), LUNDI).niveau, allureDe(game, l, LUNDI).niveau);
  const b1 = fige(tard);
  assert.equal(b1.quetes, 9);
  assert.equal(Object.hasOwn(b1, 'allure'), false);
  // retour à la limite : l'allure est écrite, juste
  const b2 = fige(addDays(LUNDI, ALLURE_BILAN_JOURS));
  assert.deepEqual(b2.allure, { niveau: 'regulier', quetes: 42 });
  assert.equal(Object.hasOwn(fige(addDays(LUNDI, ALLURE_BILAN_JOURS + 1)), 'allure'), false);
});
