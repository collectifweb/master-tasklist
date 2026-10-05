// Correctifs de la relecture indépendante du commit 5131ed8 (semaine 3) : chaque test échoue sans le correctif.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createInitialState, migrateState, openApp, advanceTime, completeQuest, remballerQuest, harvest, storeReserve, sow, build,
  shareHarvest, lightBrasero, souffler, avisStatus, directFilLibre, addDays, evalCondition, chapterProgress, storyMoments,
  morningLetter, markLetterShown, fillText,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const chapitres = JSON.parse(readFileSync(new URL('../../content/fr-CA/chapitres.json', import.meta.url), 'utf8'));
const lettres = JSON.parse(readFileSync(new URL('../../content/fr-CA/lettres.json', import.meta.url), 'utf8'));
const at = (day, hourUtc = 14) => `${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`;

// Chapitre 2 commencé le 1er octobre, Avis annoncé le 5 pour le 12, vu la veille.
function avisWorld(over = {}) {
  const w = fresh([], at('2026-09-28'));
  Object.assign(w.game, { chapter: { number: 2, startDay: '2026-10-01', objectives: {} }, lastSeenDay: '2026-10-11', ...over });
  w.game.sectors.atelier.open = true;
  w.game.avis.current = { id: 'premier_gel', sector: 'champs', day: '2026-10-12', announcedOn: '2026-10-05', base: 24, force: 24, activity: 4, braseros: 0 };
  return w;
}
const prepared = (w) => { // Préparation 24 : Garde 8 + tour 4 + tunnel 6 + Réserve 6
  w.game.placements = [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }, { id: 'tunnel-1', model: 'tunnel', sector: 'champs' }];
  w.game.garden.reserve = 6;
  return w;
};

// ---- 1. Garde-manger : « Partager au village » ------------------------------------------------------------------

test('shareHarvest : retire n récoltes sans aucun gain, événement « partage »', () => {
  const w = fresh();
  w.game.garden.pantry = { courge: 0, patate: 12, ble: 0 };
  const s = step(w, shareHarvest, { crop: 'patate', n: 2 });
  assert.equal(s.world.game.garden.pantry.patate, 10);
  assert.deepEqual(s.r.events, [{ type: 'partage', crop: 'patate', n: 2, pantry: 10 }]);
  const { game: g0 } = w, { game: g1 } = s.world;
  assert.deepEqual([g1.resources, g1.filLibre, g1.lueur, g1.garden.reserve, g1.garden.reserved], [g0.resources, g0.filLibre, g0.lueur, 0, 0]);
  assert.deepEqual(s.r.entries, []);
  assert.equal(step(w, shareHarvest, { crop: 'patate', n: 99 }).world.game.garden.pantry.patate, 0); // plafonné à ce qu'il y a
  assert.equal(step(w, shareHarvest, { crop: 'patate' }).world.game.garden.pantry.patate, 11); // n = 1 par défaut
  assert.throws(() => shareHarvest([], w.game, [], {}, at('2026-10-06')), /Culture inconnue/);
  assert.throws(() => shareHarvest([], w.game, [], { crop: 'ble' }, at('2026-10-06')), /Aucune récolte/);
});

test('garde-manger plein de patates : après partage, la courge mûre se récolte et ch2.reserve redevient atteignable', () => {
  let w = fresh([], at('2026-10-06'));
  w.game.garden.pantry = { courge: 0, patate: 12, ble: 0 };
  w.game.plots[0] = { id: 'parcelle-1', slot: 0, crop: 'courge', stage: 2 };
  assert.throws(() => harvest([], w.game, [], {}, at('2026-10-06')), /garde-manger est plein/);
  assert.throws(() => storeReserve([], w.game, [], {}, at('2026-10-06')), /Aucune courge/);
  w = step(w, shareHarvest, { crop: 'patate' }).world;
  w = step(w, harvest, {}).world;
  w = step(w, storeReserve, {}).world;
  assert.equal(w.game.garden.reserved, 1);
  assert.equal(evalCondition({ type: 'reserve', min: 1 }, { game: w.game, tasks: [], ledger: [], since: '2026-10-01' }), true);
});

// Joueur appliqué (même plan que simulation.test.mjs, sur 70 jours). Avec `partage`, il libère une place dès que le
// garde-manger est plein ; sans, il constate le blocage de s17 (revue de la semaine 3).
const POOL = [[8, 3, 3, 'Administratif'], [7, 2, 2, 'Jardin'], [9, 5, 6, 'Maison'], [6, 1, 2, 'Professionnel'], [6, 2, 2, 'Jardin'], [8, 5, 5, 'Véhicule']];
const PLAN = [3, 2, 4, 3, 2, 4, 3, 3, 0, 0, 0, 0, 2, 4, 3, 2, 4, 3, 2, 3, 4];
const BUY = ['tour', 'tunnel', 'etabli', 'parcelle', 'erable', 'parcelle', 'erable', 'erable', 'parcelle', 'cloture', 'lanterne', 'cloture', 'lanterne', 'cloture'];
const DAY1 = '2026-10-06';
const atD = (d, h) => `${addDays(DAY1, d - 1)}T${String(h).padStart(2, '0')}:00:00Z`;
function play70(partage) {
  const plan = Array.from({ length: 70 }, (_, i) => PLAN[i % PLAN.length]);
  const tasks = Array.from({ length: plan.reduce((a, b) => a + b, 0) }, (_, k) => {
    const [priority, length, difficulty, domain] = POOL[k % POOL.length];
    return { id: 'q' + k, task: `Quête d’essai ${k + 1}`, domain, priority, length, difficulty, status: 'todo', created: '2026-10-05' };
  });
  let w = { tasks, game: createInitialState(atD(1, 12)), ledger: [] };
  const act = (fn, params, now) => {
    let r;
    try { r = fn(w.tasks, w.game, w.ledger, { gameRevision: null, chapitres, ...params }, now); } catch { return false; }
    w = { tasks: r.tasks, game: r.game, ledger: [...w.ledger, ...r.entries] };
    return true;
  };
  const pantry = () => Object.values(w.game.garden.pantry).reduce((s, n) => s + n, 0);
  const ripe = () => w.game.plots.filter((p) => p.crop && p.stage >= 2).length;
  let k = 0, stuck = 0, shared = 0;
  for (let d = 1; d <= plan.length; d++) {
    if (!plan[d - 1]) continue;
    act(openApp, {}, atD(d, 13));
    act(advanceTime, {}, atD(d, 13));
    for (let i = 0; i < 20 && ripe(); i++) {
      if (!act(harvest, {}, atD(d, 13)) && partage && pantry() >= 12) {
        const crop = Object.entries(w.game.garden.pantry).sort((a, b) => b[1] - a[1])[0][0];
        if (act(shareHarvest, { crop }, atD(d, 13))) shared++;
      } else if (!partage) break;
    }
    while (act(storeReserve, {}, atD(d, 13)));
    if (ripe()) stuck++; // une culture mûre est restée bloquée jusqu'à la visite suivante
    for (let i = 0; i < plan[d - 1]; i++) assert.ok(act(completeQuest, { id: 'q' + k++ }, atD(d, 14 + i)));
    act(advanceTime, {}, atD(d, 20));
    while (act(sow, { crop: 'courge' }, atD(d, 21)));
    for (const id of BUY) act(build, { id }, atD(d, 21));
    let st;
    while ((st = avisStatus(w.game, w.ledger, atD(d, 21))) && st.preparation < st.force + 6 && act(lightBrasero, {}, atD(d, 21)));
    while (w.game.resources.energy >= 30 && act(souffler, {}, atD(d, 21)));
    if (w.game.sectors.atelier.open && w.game.sectors.atelier.stage < 1 && w.game.filLibre >= 1) {
      w = { ...w, game: directFilLibre(w.game, 'atelier', Math.floor(w.game.filLibre)).game };
    }
    act(advanceTime, {}, atD(d, 22));
  }
  return { stuck, shared };
}

test('simulation de 70 jours : sans partage une récolte mûre reste bloquée ; avec partage, jamais au-delà d’une visite', () => {
  assert.ok(play70(false).stuck > 0, 'le blocage du garde-manger doit exister sans partage (sinon le test ne prouve rien)');
  const r = play70(true);
  assert.ok(r.shared > 0, 'le joueur a dû partager au moins une fois');
  assert.equal(r.stuck, 0);
});

// ---- 2. Absence ---------------------------------------------------------------------------------------------------

test('absence : un retour après 10 ou 30 jours ne fait jamais tomber de voile ; 2 jours sans visite, si', () => {
  for (const [seen, back, result] of [['2026-10-11', '2026-10-12', 'voile'], ['2026-10-10', '2026-10-12', 'voile'], ['2026-10-09', '2026-10-12', 'absent'],
    ['2026-10-11', '2026-10-22', 'absent'], ['2026-10-11', '2026-11-11', 'absent']]) {
    const s = step(avisWorld({ lastSeenDay: seen }), advanceTime, {}, at(back));
    assert.equal(s.world.game.avis.history.at(-1).result, result, `vu le ${seen}, de retour le ${back}`);
    assert.equal(s.world.game.avis.veils.length, result === 'voile' ? 1 : 0);
  }
});

// ---- 3. État abîmé ------------------------------------------------------------------------------------------------

test('état abîmé : un type inattendu reprend la valeur par défaut, plus de plantage', () => {
  const now = at('2026-10-06');
  const cas = {
    'plots: null': (g) => { g.plots = null; },
    'avis: null': (g) => { g.avis = null; },
    'avis.history: null': (g) => { g.avis.history = null; },
    'avis.veils: "x"': (g) => { g.avis.veils = 'x'; },
    'garden: null': (g) => { g.garden = null; },
    'placements: null': (g) => { g.placements = null; },
    'story.seen: null': (g) => { g.story.seen = null; },
    'sectors: []': (g) => { g.sectors = []; },
  };
  for (const [label, abime] of Object.entries(cas)) {
    const raw = createInitialState(now);
    abime(raw);
    const g = migrateState(raw, now);
    const w = { tasks: [task({ id: 't1', domain: 'Terrain' })], game: g, ledger: [] };
    assert.doesNotThrow(() => step(w, completeQuest, { id: 't1' }, now), label);
    assert.doesNotThrow(() => step(w, advanceTime, { chapitres }, now), label);
  }
  const g = migrateState({ ...createInitialState(now), avis: null, plots: null, garden: null }, now);
  assert.deepEqual(g.avis, { current: null, history: [], veils: [] });
  assert.equal(g.plots.length, 1);
  assert.equal(g.garden.reserve, 0);
});

test('un état de la semaine 1 migre toujours sans perte', () => {
  const w1 = {
    version: 1, createdAt: '2026-09-20T14:00:00.000Z', startDay: '2026-09-20',
    resources: { energy: 23.4, materials: 41, confidence: 4 }, caps: { energy: 40, materials: 150 },
    lueur: { place: 12, champs: 30, atelier: 55, archives: 0, 'maison-commune': 0, relais: 0 }, filLibre: 7.5,
    lisiereDays: ['2026-09-20', '2026-09-22'], weeksHeld: ['2026-09-21'],
    daily: { day: '2026-09-22', quests: 2, lisiere: true }, lastOpenDay: '2026-09-22', lastReturnDay: null,
    chapter: { number: 1, startDay: '2026-09-20', objectives: {} },
    sectors: { place: { open: true, stage: 0 }, champs: { open: true, stage: 0 }, atelier: { open: false, stage: 0 }, archives: { open: false, stage: 0 }, 'maison-commune': { open: false, stage: 0 }, relais: { open: false, stage: 0 } },
    placements: [], plots: [], avis: { current: null, history: [] }, recentApplied: {}, champInconnu: { garde: 'moi' },
  };
  const m = migrateState(structuredClone(w1), '2026-10-05T14:00:00Z');
  for (const k of Object.keys(w1)) if (!['plots', 'avis'].includes(k)) assert.deepEqual(m[k], w1[k], k);
  assert.deepEqual(m.avis.history, []);
  assert.equal(m.plots.length, 1);
  assert.deepEqual(m.avis.veils, []);
});

// ---- 4. Noms hérités ------------------------------------------------------------------------------------------------

test('noms hérités (constructor, toString, __proto__) : refusés avec un message français', () => {
  const w = fresh([], at('2026-10-06'));
  for (const crop of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.throws(() => sow([], w.game, [], { crop }, at('2026-10-06')), /Culture inconnue/);
    assert.throws(() => shareHarvest([], w.game, [], { crop }, at('2026-10-06')), /Culture inconnue/);
    assert.throws(() => build([], w.game, [], { id: crop }, at('2026-10-06')), /Construction inconnue/);
  }
});

// ---- 5. lastSeenDay ne recule jamais ------------------------------------------------------------------------------

test('lastSeenDay ne recule jamais (file hors ligne rejouée en retard)', () => {
  const w = avisWorld({ lastSeenDay: '2026-10-06' });
  const a = step(w, advanceTime, {}, at('2026-10-08'));
  assert.equal(a.world.game.lastSeenDay, '2026-10-08');
  const b = step(a.world, advanceTime, {}, at('2026-10-07'));
  assert.equal(b.world.game.lastSeenDay, '2026-10-08');
  assert.deepEqual(b.r.ops, []);
});

// ---- 6. Arrosage une seule fois par jour --------------------------------------------------------------------------

test('remballer puis refaire une quête le même jour de jeu n’arrose pas une 2e fois', () => {
  const t = (id) => task({ id, domain: 'Terrain', createdAt: '2026-09-01T12:00:00Z' });
  let w = fresh(['a', 'b', 'c'].map(t), at('2026-10-20'));
  w.game.plots[0] = { id: 'parcelle-1', slot: 0, crop: 'ble', stage: 0 };
  const now = (m) => `2026-10-20T14:${String(m).padStart(2, '0')}:00Z`;
  w = step(w, completeQuest, { id: 'a' }, now(0)).world;
  assert.equal(w.game.plots[0].stage, 1);
  assert.equal(w.game.garden.wateredDay, '2026-10-20');
  w = step(w, remballerQuest, { id: 'a' }, now(1)).world;
  w = step(w, completeQuest, { id: 'b' }, now(2)).world;
  assert.equal(w.game.plots[0].stage, 1);
  w = step(w, remballerQuest, { id: 'b' }, now(3)).world;
  w = step(w, completeQuest, { id: 'c' }, now(4)).world;
  assert.equal(w.game.plots[0].stage, 1);
  // le lendemain, la lisière arrose de nouveau
  w = step({ ...w, tasks: [...w.tasks, t('d')] }, completeQuest, { id: 'd' }, '2026-10-21T14:00:00Z').world;
  assert.equal(w.game.plots[0].stage, 2);
});

// ---- 7. Avis résolu figé -------------------------------------------------------------------------------------------

test('Avis résolu = figé : remballer une quête après la résolution ne reprend pas les 15 ▣', () => {
  let w = prepared(avisWorld());
  w.tasks = [task({ id: 'a', domain: 'Terrain', createdAt: '2026-09-01T12:00:00Z' })];
  w = step(w, completeQuest, { id: 'a' }, at('2026-10-11', 20)).world;
  w = step(w, advanceTime, {}, at('2026-10-12')).world;
  assert.equal(w.game.avis.history.at(-1).result, 'tenu');
  w = step(w, remballerQuest, { id: 'a' }, at('2026-10-12', 16)).world;
  assert.equal(w.game.avis.history.at(-1).result, 'tenu');
  assert.deepEqual(w.game.avis.veils, []);
  assert.equal(w.ledger.some((e) => e.key === 'avis:premier_gel'), true);
  assert.equal(w.ledger.some((e) => (e.reverses ?? []).includes('avis:premier_gel')), false); // l'annulation ne touche pas à l'Avis
});

// ---- 8. advanceTime sans effet au 2e appel, même quand un chapitre se termine -------------------------------------

test('advanceTime : fin de chapitre, le 2e appel au même instant ne fait rien', () => {
  const start = '2026-10-01';
  const w = fresh([], at(start));
  Object.assign(w.game.resources, { confidence: 3 });
  w.game.lisiereDays = [start];
  Object.assign(w.game.garden, { sown: { courge: 1, patate: 0, ble: 0 }, harvested: { courge: 1, patate: 0, ble: 0 }, reserved: 1 });
  w.game.placements = [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }, { id: 'tunnel-1', model: 'tunnel', sector: 'champs' }];
  w.game.lueur.atelier = 200;
  const now = at('2026-10-03');
  const a = step(w, advanceTime, { chapitres }, now);
  assert.equal(a.world.game.chapter.number, 2);
  assert.ok(a.r.events.some((e) => e.type === 'objectif-atteint' && e.id === 'ch2.atelier'), 'objectifs du chapitre 2 retenus dans le même appel');
  const b = step(a.world, advanceTime, { chapitres }, now);
  assert.deepEqual(b.r.ops, []);
  assert.deepEqual(b.r.events, []);
});

// ---- 9. Moment « atteint » du dernier objectif ---------------------------------------------------------------------

test('le moment « atteint » du dernier objectif est proposé avant la fin du chapitre', () => {
  const w = fresh([], at('2026-10-04'));
  w.game.chapter = { number: 2, startDay: '2026-10-04', objectives: {} };
  w.game.story = { seen: ['introduction', 'premier-sillon.ouverture', 'ch1.semis.atteint', 'ch1.recolte.atteint', 'ch1.confiance.atteint'], day: null, count: 0 };
  const m = storyMoments(w.game, [], [], chapitres, at('2026-10-04'));
  assert.deepEqual(m.map((x) => x.id), ['ch1.tour.atteint', 'premier-sillon.fin', 'rouge-des-erables.ouverture']);
  assert.equal(m[0].kind, 'objectif-atteint');
});

// ---- 10. Trêve des Fêtes -------------------------------------------------------------------------------------------

test('aucune annonce d’Avis pendant la trêve des Fêtes', () => {
  const w = avisWorld({ chapter: { number: 2, startDay: '2026-12-10', objectives: {} }, lastSeenDay: null });
  w.game.avis.current = null;
  const trêve = step(w, advanceTime, {}, at('2026-12-29'));
  assert.equal(trêve.world.game.avis.current, null);
  assert.equal(trêve.r.events.some((e) => e.type === 'avis-annonce'), false);
  const après = step(trêve.world, advanceTime, {}, at('2027-01-05'));
  assert.equal(après.world.game.avis.current.day, '2027-01-12');
});

// ---- 11. Lettres ---------------------------------------------------------------------------------------------------

test('lettres : matinSansQuete ne se répète pas sur 7 jours', () => {
  assert.ok(lettres.matinSansQuete.length >= 7);
  let w = fresh();
  const ids = [];
  for (let i = 0; i < 21; i++) {
    const day = addDays('2026-10-06', i);
    const l = morningLetter(lettres, [], w.game, at(day));
    assert.equal(l.kind, 'matinSansQuete');
    ids.push(l.id);
    w = step(w, markLetterShown, { id: l.id }, at(day)).world;
  }
  for (let i = 0; i < ids.length; i++) assert.equal(ids.slice(Math.max(0, i - 6), i).includes(ids[i]), false, `${ids[i]} répétée au jour ${i + 1}`);
  for (const l of lettres.matinSansQuete) for (const t of l.texte) assert.doesNotMatch(t, /tu n’as pas|manqué|négligé/i);
});

test('fillText sans prénom : « , {prenom} » et « {prenom}, » disparaissent proprement', () => {
  assert.equal(fillText('T’es {prenom}, le septième intendant.', {}), 'T’es le septième intendant.');
  assert.equal(fillText('Bon matin, {prenom}.', {}), 'Bon matin.');
  assert.equal(fillText('T’es {prenom}, le septième intendant.', { prenom: 'Sam' }), 'T’es Sam, le septième intendant.');
  for (const l of chapitres.introduction.lignes) assert.notEqual(fillText(l.texte, {}), null, l.texte);
  assert.equal(fillText('Je propose « {quete} ».', {}), null);
});
