// Imprévus, première série (lot I, plan validé par Alex le 6 octobre au soir). Au plus deux par semaine, à des jours tirés
// au sort d'après la date : le premier toujours bon, le second bon ou mauvais à pile ou face. Un bon s'inscrit au registre
// sous imprevu:{jour prévu} ; un mauvais pose un dégât dans la partie, qui se règle de trois façons : payer, terminer une
// quête du bon domaine (Terrain pour le potager, Maison pour l'éolienne), ou attendre. Jamais une tâche touchée, jamais une
// ressource retirée.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMPREVUS, calendrierImprevus, advanceTime, completeQuest, reparer, refusReparer, degatsActifs, degatDe, enReprise,
  recolter, etatCulture, construire, accueillir, semer, echanger, migrateState, PAS_IDS, stockage, addDays, weekStart,
  isoWeekday, isTruce, EOLIENNE_ENERGIE, recolteDe,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

// 14 h UTC = 10 h à Montréal l'été, 9 h l'hiver : toujours le jour de jeu indiqué.
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const mois = (day) => Number(day.slice(5, 7));
const lundis = (depuis, n) => Array.from({ length: n }, (_, k) => addDays(weekStart(depuis), 7 * k));
const EOLIENNE = { id: 'eolienne-1', type: 'eolienne' };
const QUAI = { id: 'quai-1', type: 'quai' };

// Premier jour de créneau, à partir de la semaine de `depuis`, qui répond au filtre (créneau, rang 0 ou 1, calendrier).
function creneau(depuis, filtre, semaines = 300) {
  for (const l of lundis(depuis, semaines)) {
    const c = calendrierImprevus(l);
    for (const [i, x] of c.creneaux.entries()) if (x.jour >= depuis && filtre(x, i, c)) return x.jour;
  }
  throw new Error('aucun créneau trouvé');
}
const mauvaisJour = (depuis, moisOk = () => true) => creneau(depuis, (x, i) => i === 1 && x.nature === 'mauvais' && moisOk(mois(x.jour)));

// Un jour travaillé : une quête payée ce jour-là (forme du registre, quête fictive).
const paye = (day, id = 'x') => ({ key: `reward:${id}-${day}:1`, at: at(day), day, type: 'reward', taskId: `${id}-${day}`, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });

// Village sorti des premiers pas, vu la veille de `day`.
function village(day, over = {}, ledger = []) {
  const w = fresh([task({ id: 'q-maison', domain: 'Maison' }), task({ id: 'q-terrain', domain: 'Terrain' }), task({ id: 'q-enfants', domain: 'Enfants' })], at(day));
  w.game.resources = { energy: 50, materials: 50, food: 10 };
  w.game.habitants = 3;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-01-01']));
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }];
  w.game.lastSeenDay = addDays(day, -1);
  w.game.lastOpenDay = addDays(day, -1);
  Object.assign(w.game, over);
  // vu la veille : les créneaux d'avant aujourd'hui ont déjà été tirés (clés seules, comme un registre ancien)
  const tires = w.game.lastSeenDay === addDays(day, -1) ? calendrierImprevus(day).creneaux.filter((c) => c.jour < day).map((c) => ({ key: `imprevu:${c.jour}` })) : [];
  w.ledger = [...ledger, ...tires];
  return w;
}
// Parcelle semée 10 jours avant `day`, mûre : 5 jours travaillés depuis.
const mure = (day) => ({ parcelles: [{ id: 'parcelle-1', semeLe: addDays(day, -10) }] });
const joursMurs = (day) => [1, 2, 3, 4, 5].map((k) => paye(addDays(day, -10 + k)));
// Parcelle semée l'avant-veille, un jour travaillé depuis : pas mûre.
const verte = (day) => ({ parcelles: [{ id: 'parcelle-1', semeLe: addDays(day, -2) }] });

const imprevus = (r) => r.entries.filter((e) => e.type === 'imprevu');
// L'imprévu du créneau de ce jour (le bon du début de semaine, s'il attendait encore, passe aussi ce jour-là).
const du = (r, jour) => r.entries.find((e) => e.key === `imprevu:${jour}`);

test('catalogue : quatre bons, trois mauvais ; gains et prix en nombres entiers, sans permis', () => {
  assert.deepEqual(Object.keys(IMPREVUS.bons), ['aurore', 'peche', 'trouvaille', 'orignal']);
  assert.deepEqual(Object.keys(IMPREVUS.mauvais), ['panne', 'ours', 'gel']);
  assert.deepEqual(IMPREVUS.bons.orignal.gain, {}, 'l’orignal ne rapporte rien : c’est juste beau');
  assert.deepEqual(Object.keys(IMPREVUS.bons.aurore.gain), ['energy']);
  assert.deepEqual(Object.keys(IMPREVUS.bons.peche.gain), ['food']);
  assert.deepEqual(Object.keys(IMPREVUS.bons.trouvaille.gain), ['materials']);
  for (const [id, b] of Object.entries(IMPREVUS.bons)) {
    for (const v of Object.values(b.gain)) assert.ok(Number.isInteger(v) && v > 0, `${id} : ${v}`);
  }
  for (const [id, m] of Object.entries(IMPREVUS.mauvais)) {
    assert.ok(Number.isInteger(m.jours) && m.jours >= 1, `${id} : ${m.jours} jours`);
    assert.ok(Object.keys(m.reparer).length === 1, id);
    for (const v of Object.values(m.reparer)) assert.ok(Number.isInteger(v) && v > 0, `${id} : ${v}`);
  }
  assert.equal(IMPREVUS.mauvais.panne.quartier, 'atelier', 'une quête Maison répare l’éolienne');
  assert.equal(IMPREVUS.mauvais.ours.quartier, 'champs', 'une quête Terrain chasse l’ours');
  assert.equal(IMPREVUS.mauvais.gel.quartier, 'champs', 'une quête Terrain couvre la parcelle');
});

test('calendrier : deux jours distincts de la semaine, le premier bon, le second à pile ou face, le même sur tous les appareils', () => {
  let mauvais = 0;
  const joursDeSemaine = new Set();
  const semaines = lundis('2026-10-05', 104);
  for (const l of semaines) {
    const c = calendrierImprevus(l);
    assert.equal(c.semaine, l);
    for (let k = 1; k < 7; k++) assert.deepEqual(calendrierImprevus(addDays(l, k)), c, 'tous les jours de la semaine donnent le même calendrier');
    const [a, b] = c.creneaux;
    assert.equal(c.creneaux.length, 2);
    assert.ok(a.jour >= l && b.jour <= addDays(l, 6) && a.jour < b.jour, JSON.stringify(c));
    assert.equal(a.nature, 'bon');
    assert.ok(['bon', 'mauvais'].includes(b.nature));
    if (b.nature === 'mauvais') mauvais++;
    joursDeSemaine.add(isoWeekday(a.jour)).add(isoWeekday(b.jour));
  }
  assert.ok(mauvais >= 36 && mauvais <= 68, `${mauvais} semaines sur 104 avec un second imprévu mauvais`);
  assert.equal(joursDeSemaine.size, 7, 'tous les jours de la semaine sont tirés');
});

test('un bon imprévu le jour prévu : au registre sous imprevu:{jour}, des ressources en plus, une seule fois', () => {
  const jour = creneau('2026-10-05', (x, i) => i === 0);
  const w = village(jour);
  const { world, r } = step(w, advanceTime, {}, at(jour));
  const [e] = imprevus(r);
  assert.equal(imprevus(r).length, 1);
  assert.equal(e.key, `imprevu:${jour}`);
  assert.equal(e.day, jour);
  assert.ok(Object.hasOwn(IMPREVUS.bons, e.imprevu), e.imprevu);
  const g = IMPREVUS.bons[e.imprevu].gain;
  assert.deepEqual(world.game.resources, { energy: 50 + (g.energy || 0), materials: 50 + (g.materials || 0), food: 10 + (g.food || 0) });
  assert.deepEqual(r.events.filter((x) => x.type === 'imprevu').map((x) => [x.nature, x.imprevu]), [['bon', e.imprevu]]);
  assert.deepEqual(r.tasks, w.tasks);
  assert.ok(!r.ops.some((op) => op.type.startsWith('task.')));
  // rejoué (deuxième ouverture, autre onglet) : rien
  const again = step(world, advanceTime, {}, at(jour, 20));
  assert.deepEqual(again.r.entries, []);
  assert.deepEqual(again.r.ops, []);
});

test('un bon manqué attend jusqu’au dimanche ; un mauvais manqué ne frappe jamais ; la semaine suivante les oublie', () => {
  // une semaine dont le second créneau est mauvais et tombe avant le dimanche
  const bad = creneau('2026-10-05', (x, i, c) => i === 1 && x.nature === 'mauvais' && isoWeekday(x.jour) < 7);
  const { semaine, creneaux: [bon] } = calendrierImprevus(bad);
  const dimanche = addDays(semaine, 6);
  const w = village(dimanche, { batiments: [EOLIENNE], lastSeenDay: addDays(semaine, -1), lastOpenDay: addDays(semaine, -1) });
  const { world, r } = step(w, advanceTime, {}, at(dimanche));
  assert.deepEqual(imprevus(r).map((e) => e.key), [`imprevu:${bon.jour}`], 'le bon est payé le dimanche, le mauvais du ' + bad + ' ne frappe pas');
  assert.deepEqual(degatsActifs(world.game, at(dimanche)), []);
  // le lundi suivant : rien de la semaine passée
  const lundi = addDays(semaine, 7);
  const w2 = village(lundi, { batiments: [EOLIENNE], lastSeenDay: addDays(semaine, -1), lastOpenDay: addDays(semaine, -1) });
  const { r: r2 } = step(w2, advanceTime, {}, at(lundi));
  assert.ok(imprevus(r2).every((e) => e.key >= `imprevu:${lundi}`), JSON.stringify(imprevus(r2).map((e) => e.key)));
});

test('panne d’éolienne : le jour prévu seulement, un dégât dans la partie, rien de retiré', () => {
  const jour = mauvaisJour('2026-10-05');
  const w = village(jour, { batiments: [EOLIENNE] });
  const { world, r } = step(w, advanceTime, {}, at(jour));
  const e = du(r, jour);
  assert.deepEqual([e.key, e.imprevu, e.energy, e.materials, e.food ?? 0], [`imprevu:${jour}`, 'panne', 0, 0, 0]);
  const [d] = degatsActifs(world.game, at(jour));
  assert.deepEqual([d.type, d.cible, d.le, d.jusqua], ['panne', 'eolienne-1', jour, addDays(jour, IMPREVUS.mauvais.panne.jours)]);
  assert.equal(d.joursRestants, IMPREVUS.mauvais.panne.jours);
  assert.deepEqual(world.game.resources, w.game.resources, 'un mauvais imprévu ne retire rien');
  assert.deepEqual(r.events.filter((x) => x.type === 'imprevu').map((x) => [x.nature, x.imprevu, x.cible]), [['mauvais', 'panne', 'eolienne-1']]);
  assert.equal(degatDe(world.game, 'eolienne-1', at(jour)).id, d.id);
  // le même jour, un autre domaine que Maison : l'éolienne ne tourne pas
  const { world: w2, r: r2 } = step(world, completeQuest, { id: 'q-enfants' }, at(jour, 16));
  assert.equal(r2.entries.filter((x) => x.type === 'prod').length, 0);
  assert.deepEqual(r2.events.filter((x) => x.type === 'eolienne-arretee').map((x) => x.energy), [EOLIENNE_ENERGIE]);
  assert.ok(degatDe(w2.game, 'eolienne-1', at(jour)), 'toujours en panne');
});

test('la panne se répare seule au bout de ses jours, sans rien écrire ; l’éolienne retourne aussitôt', () => {
  const jour = mauvaisJour('2026-10-05');
  const { world } = step(village(jour, { batiments: [EOLIENNE] }), advanceTime, {}, at(jour));
  const fin = addDays(jour, IMPREVUS.mauvais.panne.jours);
  assert.ok(degatDe(world.game, 'eolienne-1', at(addDays(fin, -1))));
  assert.equal(degatDe(world.game, 'eolienne-1', at(fin)), null);
  assert.deepEqual(degatsActifs(world.game, at(fin)), []);
  const { r } = step(world, completeQuest, { id: 'q-enfants' }, at(fin));
  assert.deepEqual(r.entries.filter((x) => x.type === 'prod').map((x) => x.energy), [EOLIENNE_ENERGIE]);
});

test('une quête Maison payée répare l’éolienne, sans changer la quête ni ce qu’elle rapporte, et l’éolienne tourne ce jour-là', () => {
  const jour = mauvaisJour('2026-10-05');
  const { world } = step(village(jour, { batiments: [EOLIENNE] }), advanceTime, {}, at(jour));
  const avec = step(world, completeQuest, { id: 'q-maison' }, at(jour, 16));
  const sans = step({ ...world, game: { ...world.game, degats: [] } }, completeQuest, { id: 'q-maison' }, at(jour, 16));
  assert.deepEqual(avec.r.tasks, sans.r.tasks, 'la quête est la même');
  const gain = (r) => r.entries.find((x) => x.type === 'reward');
  assert.deepEqual(gain(avec.r), gain(sans.r), 'elle rapporte la même chose');
  assert.deepEqual(avec.r.entries.filter((x) => x.type === 'prod').map((x) => x.energy), [EOLIENNE_ENERGIE]);
  assert.deepEqual(avec.r.events.filter((x) => x.type === 'reparation').map((x) => [x.imprevu, x.cible, x.par]), [['panne', 'eolienne-1', 'quete']]);
  assert.equal(degatDe(avec.world.game, 'eolienne-1', at(jour, 16)), null);
  // une quête d'un autre domaine ne répare pas ; une quête Terrain non plus
  const t = step(world, completeQuest, { id: 'q-terrain' }, at(jour, 16));
  assert.ok(degatDe(t.world.game, 'eolienne-1', at(jour, 16)));
});

test('réparer en payant : le prix, une seule fois ; ensuite l’éolienne tourne à la prochaine quête payée', () => {
  const jour = mauvaisJour('2026-10-05');
  const { world } = step(village(jour, { batiments: [EOLIENNE] }), advanceTime, {}, at(jour));
  const [d] = degatsActifs(world.game, at(jour));
  const prix = IMPREVUS.mauvais.panne.reparer;
  assert.equal(refusReparer(world.game, { id: d.id }, at(jour)), null);
  const { world: w2, r } = step(world, reparer, { id: d.id }, at(jour, 15));
  assert.deepEqual(w2.game.resources, { ...world.game.resources, materials: 50 - (prix.materials || 0), energy: 50 - (prix.energy || 0) });
  assert.deepEqual(r.entries, [], 'rien au registre');
  assert.deepEqual(r.ops.map((op) => op.type), ['game.set']);
  assert.deepEqual(r.events.filter((x) => x.type === 'reparation').map((x) => [x.imprevu, x.par, x.cout]), [['panne', 'paiement', prix]]);
  assert.equal(degatDe(w2.game, 'eolienne-1', at(jour, 15)), null);
  // un second toucher, ou un second appareil qui a déjà la réparation : refusé, rien ne bouge
  assert.equal(refusReparer(w2.game, { id: d.id }, at(jour, 15)), 'Déjà réparé.');
  assert.throws(() => step(w2, reparer, { id: d.id }, at(jour, 15)), { message: 'Déjà réparé.' });
  const { r: r3 } = step(w2, completeQuest, { id: 'q-enfants' }, at(jour, 16));
  assert.deepEqual(r3.entries.filter((x) => x.type === 'prod').map((x) => x.energy), [EOLIENNE_ENERGIE]);
});

test('réparer : raisons écrites (rien à réparer, réglé tout seul, déjà réparé par une quête, ce qui manque) ; jamais de stock négatif', () => {
  const jour = mauvaisJour('2026-10-05');
  const { world } = step(village(jour, { batiments: [EOLIENNE] }), advanceTime, {}, at(jour));
  const [d] = degatsActifs(world.game, at(jour));
  assert.equal(refusReparer(world.game, { id: 'constructor' }, at(jour)), 'Rien à réparer.');
  assert.equal(refusReparer(world.game, {}, at(jour)), 'Rien à réparer.');
  // geste fait hors ligne, rejoué après la guérison : refusé avec sa raison
  const fin = addDays(jour, IMPREVUS.mauvais.panne.jours);
  const seul = 'Ça s’est réglé tout seul : rien à payer.';
  assert.equal(refusReparer(world.game, { id: d.id }, at(fin)), seul);
  assert.throws(() => step(world, reparer, { id: d.id }, at(fin)), { message: seul });
  // réparé par une quête Maison, puis un toucher sur « Réparer » resté à l'écran
  const { world: q } = step(world, completeQuest, { id: 'q-maison' }, at(jour, 16));
  assert.equal(refusReparer(q.game, { id: d.id }, at(jour, 16)), 'Déjà réparé par une quête.');
  // ce qui manque, dit comme ailleurs ; tout juste assez : stock à zéro, pas en dessous
  const prix = IMPREVUS.mauvais.panne.reparer;
  const [cle, n] = Object.entries(prix)[0];
  const pauvre = { ...world, game: { ...world.game, resources: { energy: 0, materials: 0, food: 0, [cle]: n - 1 } } };
  assert.match(refusReparer(pauvre.game, { id: d.id }, at(jour)), /^Il manque 1 /);
  const juste = { ...world, game: { ...world.game, resources: { energy: 0, materials: 0, food: 0, [cle]: n } } };
  const { world: w0 } = step(juste, reparer, { id: d.id }, at(jour));
  assert.deepEqual(w0.game.resources, { energy: 0, materials: 0, food: 0 });
});

test('ours au potager : seulement sur une parcelle mûre, de mai à octobre ; la récolte faite pendant sa visite est réduite et le renvoie', () => {
  const jour = mauvaisJour('2026-05-01', (m) => m >= 5 && m <= 10);
  const w = village(jour, mure(jour), joursMurs(jour));
  assert.ok(etatCulture(w.game, w.ledger, 'parcelle-1', at(jour)).mure);
  const { world, r } = step(w, advanceTime, {}, at(jour));
  assert.deepEqual([du(r, jour).imprevu, du(r, jour).cible], ['ours', 'parcelle-1']);
  const [d] = degatsActifs(world.game, at(jour));
  assert.deepEqual([d.type, d.cible, d.jusqua], ['ours', 'parcelle-1', addDays(jour, IMPREVUS.mauvais.ours.jours)]);
  const plein = recolteDe(world.game, 'potager');
  const { world: w2, r: r2 } = step(world, recolter, { id: 'parcelle-1' }, at(jour, 16));
  const ev = r2.events.find((x) => x.type === 'recolte');
  assert.equal(ev.nourriture, plein - IMPREVUS.mauvais.ours.mange);
  assert.equal(ev.ours, IMPREVUS.mauvais.ours.mange);
  assert.equal(w2.game.resources.food, 10 + plein - IMPREVUS.mauvais.ours.mange);
  assert.deepEqual(degatsActifs(w2.game, at(jour, 16)), [], 'l’ours est reparti avec sa part');
  assert.equal(refusReparer(w2.game, { id: d.id }, at(jour, 16)), 'L’ours est reparti avec sa part.');
});

test('ours : le chasser (Énergie), une quête Terrain, ou attendre son départ rendent la récolte entière', () => {
  const jour = mauvaisJour('2026-05-01', (m) => m >= 5 && m <= 10);
  const { world } = step(village(jour, mure(jour), joursMurs(jour)), advanceTime, {}, at(jour));
  const [d] = degatsActifs(world.game, at(jour));
  const plein = recolteDe(world.game, 'potager');
  const recolte = (w, now) => step(w, recolter, { id: 'parcelle-1' }, now).r.events.find((x) => x.type === 'recolte').nourriture;
  const chasse = step(world, reparer, { id: d.id }, at(jour, 15));
  assert.equal(chasse.world.game.resources.energy, 50 - IMPREVUS.mauvais.ours.reparer.energy);
  assert.equal(recolte(chasse.world, at(jour, 16)), plein);
  const quete = step(world, completeQuest, { id: 'q-terrain' }, at(jour, 15));
  assert.deepEqual(quete.r.events.filter((x) => x.type === 'reparation').map((x) => [x.imprevu, x.par]), [['ours', 'quete']]);
  assert.equal(recolte(quete.world, at(jour, 16)), plein);
  assert.equal(recolte(world, at(addDays(jour, IMPREVUS.mauvais.ours.jours))), plein);
});

test('gel précoce : septembre et octobre, sur une culture pas encore mûre ; le jour de gel ne compte pas pour la pousse, sauf si on couvre', () => {
  const jour = mauvaisJour('2026-09-01', (m) => m === 9 || m === 10);
  const ledger = [paye(addDays(jour, -1))];
  const w = village(jour, verte(jour), ledger);
  const { world, r } = step(w, advanceTime, {}, at(jour));
  assert.deepEqual([du(r, jour).imprevu, du(r, jour).cible], ['gel', 'parcelle-1']);
  const [d] = degatsActifs(world.game, at(jour));
  assert.deepEqual([d.type, d.jusqua], ['gel', addDays(jour, IMPREVUS.mauvais.gel.jours)]);
  // une quête Enfants ce jour-là : jour travaillé, mais la parcelle gelée ne pousse pas
  const { world: w2 } = step(world, completeQuest, { id: 'q-enfants' }, at(jour, 16));
  const lendemain = at(addDays(jour, IMPREVUS.mauvais.gel.jours));
  assert.equal(etatCulture(w2.game, w2.ledger, 'parcelle-1', lendemain).jours, 1, 'le jour de gel ne compte pas');
  assert.equal(etatCulture({ ...w2.game, degats: [] }, w2.ledger, 'parcelle-1', lendemain).jours, 2);
  // couverte le jour même (Énergie) : le jour compte
  const { world: c } = step(world, reparer, { id: d.id }, at(jour, 15));
  assert.equal(c.game.resources.energy, 50 - IMPREVUS.mauvais.gel.reparer.energy);
  const { world: c2 } = step(c, completeQuest, { id: 'q-enfants' }, at(jour, 16));
  assert.equal(etatCulture(c2.game, c2.ledger, 'parcelle-1', lendemain).jours, 2);
  // une quête Terrain ce jour-là couvre la parcelle, et le jour compte
  const { world: t, r: rt } = step(world, completeQuest, { id: 'q-terrain' }, at(jour, 16));
  assert.deepEqual(rt.events.filter((x) => x.type === 'reparation').map((x) => [x.imprevu, x.par]), [['gel', 'quete']]);
  assert.equal(etatCulture(t.game, t.ledger, 'parcelle-1', lendemain).jours, 2);
  // le gel passé, les jours travaillés comptent de nouveau ; il ne revient pas
  assert.deepEqual(degatsActifs(w2.game, lendemain), []);
});

test('saisons : pas d’ours hors de mai à octobre, pas de gel hors de septembre et octobre, rien dans la serre ; le mauvais devient un bon', () => {
  // août, culture pas mûre : ni ours (il veut une parcelle mûre), ni gel (pas la saison)
  const aout = mauvaisJour('2026-08-01', (m) => m === 8);
  const { r } = step(village(aout, verte(aout), [paye(addDays(aout, -1))]), advanceTime, {}, at(aout));
  assert.ok(imprevus(r).every((e) => Object.hasOwn(IMPREVUS.bons, e.imprevu)), JSON.stringify(imprevus(r)));
  assert.ok(imprevus(r).some((e) => e.key === `imprevu:${aout}`));
  // novembre : une serre mûre n'attire pas l'ours
  const nov = mauvaisJour('2026-11-01', (m) => m === 11);
  const serre = { batiments: [{ id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }], parcelles: [{ id: 'serre-1', semeLe: addDays(nov, -10) }] };
  const { r: r2 } = step(village(nov, serre, joursMurs(nov)), advanceTime, {}, at(nov));
  assert.ok(imprevus(r2).every((e) => Object.hasOwn(IMPREVUS.bons, e.imprevu)));
});

test('un mauvais sans cible devient un bon ; un bâtiment ne porte qu’un dégât à la fois', () => {
  const jour = mauvaisJour('2026-10-05');
  const { r } = step(village(jour), advanceTime, {}, at(jour));
  const e = imprevus(r).find((x) => x.key === `imprevu:${jour}`);
  assert.ok(Object.hasOwn(IMPREVUS.bons, e.imprevu), e.imprevu);
  assert.ok(r.events.some((x) => x.type === 'imprevu' && x.nature === 'bon' && x.imprevu === e.imprevu));
  // l'éolienne déjà en panne (dégât d'avant, encore actif) : pas de seconde panne
  const deja = { id: 'panne:avant', type: 'panne', cible: 'eolienne-1', le: addDays(jour, -1), jusqua: addDays(jour, 5) };
  const { world, r: r2 } = step(village(jour, { batiments: [EOLIENNE], degats: [deja] }), advanceTime, {}, at(jour));
  assert.ok(Object.hasOwn(IMPREVUS.bons, imprevus(r2).find((x) => x.key === `imprevu:${jour}`).imprevu));
  assert.deepEqual(degatsActifs(world.game, at(jour)).map((d) => d.id), ['panne:avant']);
});

test('reprise : après 5 jours d’absence ou plus, trois jours sans mauvais imprévu ; 4 jours d’absence n’en donnent pas', () => {
  const jour = mauvaisJour('2026-10-05');
  const vu = (n) => ({ batiments: [EOLIENNE], lastSeenDay: addDays(jour, -n), lastOpenDay: addDays(jour, -n) });
  const { world, r } = step(village(jour, vu(5)), advanceTime, {}, at(jour));
  assert.deepEqual(world.game.reprise, { du: jour, au: addDays(jour, 2) });
  assert.equal(enReprise(world.game, at(addDays(jour, 2))), true);
  assert.equal(enReprise(world.game, at(addDays(jour, 3))), false);
  assert.ok(Object.hasOwn(IMPREVUS.bons, imprevus(r).find((x) => x.key === `imprevu:${jour}`).imprevu), 'le mauvais devient un bon');
  assert.deepEqual(degatsActifs(world.game, at(jour)), []);
  // revenu deux jours avant le mauvais : encore en reprise ce jour-là
  const avant = village(addDays(jour, -2), { batiments: [EOLIENNE], lastSeenDay: addDays(jour, -9), lastOpenDay: addDays(jour, -9) });
  let { world: x } = step(avant, advanceTime, {}, at(addDays(jour, -2)));
  ({ world: x } = step(x, advanceTime, {}, at(jour)));
  assert.deepEqual(degatsActifs(x.game, at(jour)), []);
  // revenu trois jours avant : la reprise est finie, la panne frappe
  const avant3 = village(addDays(jour, -3), { batiments: [EOLIENNE], lastSeenDay: addDays(jour, -10), lastOpenDay: addDays(jour, -10) });
  ({ world: x } = step(avant3, advanceTime, {}, at(addDays(jour, -3))));
  ({ world: x } = step(x, advanceTime, {}, at(jour)));
  assert.deepEqual(degatsActifs(x.game, at(jour)).map((d) => d.type), ['panne']);
  // 4 jours d'absence : pas de reprise
  const { world: w4 } = step(village(jour, vu(4)), advanceTime, {}, at(jour));
  assert.equal(w4.game.reprise ?? null, null);
  assert.deepEqual(degatsActifs(w4.game, at(jour)).map((d) => d.type), ['panne']);
});

test('trêve des Fêtes, du 21 décembre au 4 janvier : aucun mauvais imprévu', () => {
  const treve = creneau('2026-12-21', (x, i) => i === 1 && x.nature === 'mauvais' && isTruce(x.jour));
  const { world, r } = step(village(treve, { batiments: [EOLIENNE] }), advanceTime, {}, at(treve));
  assert.deepEqual(degatsActifs(world.game, at(treve)), []);
  assert.ok(Object.hasOwn(IMPREVUS.bons, imprevus(r).find((x) => x.key === `imprevu:${treve}`).imprevu));
});

test('pas d’imprévu pendant les premiers pas', () => {
  const jour = creneau('2026-10-05', (x, i) => i === 0);
  const { r } = step(village(jour, { premiersPas: {} }), advanceTime, {}, at(jour));
  assert.deepEqual(imprevus(r), []);
});

test('premiers pas finis pendant le passage du temps : l’imprévu du jour suit dans le même passage, un second ne fait rien', () => {
  const jour = creneau('2026-10-05', (x, i) => i === 0);
  const w = village(jour, { premiersPas: {}, habitants: 1, parcelles: [{ id: 'parcelle-1', semeLe: addDays(jour, -1) }] });
  w.tasks = [task({ id: 'fini', status: 'done' })];
  const { world, r } = step(w, advanceTime, {}, at(jour));
  assert.equal(r.entries.filter((e) => e.type === 'pas').length, PAS_IDS.length);
  assert.ok(du(r, jour), 'l’imprévu du jour est tiré dans le même passage');
  assert.deepEqual(step(world, advanceTime, {}, at(jour, 18)).r.ops, []);
});

test('bonne pêche : jamais au-delà de la réserve, et ce qui ne tient pas est dit ; réserve pleine, pas de pêche', () => {
  let trouve = null;
  for (const l of lundis('2026-09-07', 400)) {
    const jour = calendrierImprevus(l).creneaux[0].jour;
    if (![9, 10, 11].includes(mois(jour))) continue; // en automne : le grenier rempli valide l'objectif de la saison
    const w = village(jour);
    const max = stockage(w.game);
    w.game.resources.food = max - 2;
    const { world, r } = step(w, advanceTime, {}, at(jour));
    if (imprevus(r)[0].imprevu !== 'peche') continue;
    trouve = { world, r, max };
    break;
  }
  assert.ok(trouve, 'aucune pêche d’automne en 400 semaines');
  const { world, r, max } = trouve;
  assert.equal(world.game.resources.food, max);
  assert.equal(imprevus(r)[0].food, 2);
  const ev = r.events.find((x) => x.type === 'imprevu');
  assert.deepEqual([ev.food, ev.perdu], [2, IMPREVUS.bons.peche.gain.food - 2]);
  assert.ok(r.entries.some((e) => e.type === 'saison' && e.objectif === 'grenier'), 'la pêche qui remplit le grenier valide l’objectif d’automne, dans le même passage');
  // réserve pleine : la pêche n'est jamais tirée
  for (const l of lundis('2026-10-05', 60)) {
    const jour = calendrierImprevus(l).creneaux[0].jour;
    const w = village(jour);
    w.game.resources.food = stockage(w.game);
    const { r: rp } = step(w, advanceTime, {}, at(jour));
    assert.notEqual(imprevus(rp)[0].imprevu, 'peche', jour);
  }
});

test('deux appareils : le même imprévu, payé une seule fois', () => {
  const jour = creneau('2026-10-05', (x, i) => i === 0);
  const w = village(jour);
  const a = step(w, advanceTime, {}, at(jour, 13));
  const b = step(w, advanceTime, {}, at(jour, 15)); // l'autre appareil n'a pas encore vu le geste du premier
  assert.deepEqual(imprevus(b.r).map((e) => [e.key, e.imprevu]), imprevus(a.r).map((e) => [e.key, e.imprevu]), 'même clé : le serveur refuse la seconde');
  // une fois resynchronisé, le second appareil ne paie rien
  const { r } = step(a.world, advanceTime, {}, at(jour, 15));
  assert.deepEqual(r.entries, []);
  // le mauvais aussi : le second appareil relit le dégât et n'en pose pas d'autre
  const bad = mauvaisJour('2026-10-05');
  const x = step(village(bad, { batiments: [EOLIENNE] }), advanceTime, {}, at(bad, 13));
  const y = step(x.world, advanceTime, {}, at(bad, 15));
  assert.deepEqual(y.r.ops, []);
  assert.equal(degatsActifs(y.world.game, at(bad, 15)).length, 1);
});

test('six mois de passage du temps : aucune tâche touchée, aucune ressource retirée, deux imprévus par semaine au plus', () => {
  let w = village('2026-05-04', { batiments: [EOLIENNE] });
  const parSemaine = new Map();
  for (let i = 0; i < 26 * 7; i++) {
    const day = addDays('2026-05-04', i);
    const avant = w.game.resources;
    const s = step(w, advanceTime, {}, at(day));
    assert.deepEqual(s.r.tasks, w.tasks);
    assert.ok(!s.r.ops.some((op) => op.type.startsWith('task.')), day);
    for (const k of ['energy', 'materials', 'food']) assert.ok(s.world.game.resources[k] >= avant[k], `${day} : ${k}`);
    for (const e of imprevus(s.r)) parSemaine.set(weekStart(day), (parSemaine.get(weekStart(day)) || 0) + 1);
    w = s.world;
  }
  assert.ok([...parSemaine.values()].every((n) => n <= 2));
  assert.ok(parSemaine.size >= 20, `${parSemaine.size} semaines sur 26 avec un imprévu`);
});

test('un onglet d’avant les imprévus garde les dégâts et la reprise : relecture de la partie et gestes ordinaires', () => {
  const jour = '2026-10-07';
  const degats = [{ id: 'panne:2026-10-07', type: 'panne', cible: 'eolienne-1', le: jour, jusqua: '2026-10-10' }];
  const reprise = { du: '2026-10-06', au: '2026-10-08' };
  const w = village(jour, { degats, reprise, batiments: [EOLIENNE, QUAI, { id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }], habitants: 1, resources: { energy: 200, materials: 200, food: 30 } });
  const relue = migrateState(JSON.parse(JSON.stringify(w.game)), at(jour));
  assert.deepEqual([relue.degats, relue.reprise], [degats, reprise]);
  let x = { ...w, game: relue };
  ({ world: x } = step(x, construire, { type: 'serre' }, at(jour)));
  ({ world: x } = step(x, accueillir, {}, at(jour)));
  ({ world: x } = step(x, semer, { id: 'serre-1' }, at(jour)));
  ({ world: x } = step(x, echanger, { offre: 'energie-materiaux' }, at(jour)));
  assert.deepEqual([x.game.degats, x.game.reprise], [degats, reprise]);
});
