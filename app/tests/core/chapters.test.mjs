import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evalCondition, chapterDef, chapterProgress, syncChapter, storyMoments, markStorySeen, advanceTime, CONDITION_TYPES,
  CHAPTER_GATES, CHAPTER_MIN_DAYS, CHAPTER_DEFAULT_MIN_DAYS, STORY_PER_DAY, BUILDABLES, SEED_COST, createInitialState,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const chapitres = JSON.parse(readFileSync(new URL('../../content/fr-CA/chapitres.json', import.meta.url), 'utf8'));
const at = (day, hourUtc = 14) => `${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`;
const S = (game, over = {}) => ({ game, tasks: [], ledger: [], since: game.chapter.startDay, ...over });
const reward = (day, sector, key, type = 'reward') => ({
  key, at: at(day), day, type, taskId: key, occurrence: 1, pe: 5, energy: 0, materials: 0, lueur: { sector, amount: 3 }, filLibre: 1,
});

// Chapitre 1 commencé le 6 octobre, tous ses objectifs atteints.
function ch1Done() {
  const w = fresh([], at('2026-10-06'));
  const g = w.game;
  g.lisiereDays = ['2026-10-06'];
  g.garden.sown.courge = 1;
  g.garden.harvested.courge = 1;
  g.placements = [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }];
  g.resources.confidence = 3;
  return w;
}

function conditionsIn(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => conditionsIn(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'condition' || k === 'si') && v && v.type) out.push(v);
      if (k === 'conditions') out.push(...v);
      conditionsIn(v, out);
    }
  }
  return out;
}

test('chapitres.json : tous les types de condition sont reconnus ; durées et paliers de Confiance concordent avec economy.js', () => {
  const types = new Set(conditionsIn(chapitres).map((c) => c.type));
  for (const t of types) assert.ok(CONDITION_TYPES.includes(t), t);
  for (const c of chapitres.chapitres) {
    assert.equal(c.dureeMinJours, CHAPTER_MIN_DAYS[c.numero] ?? CHAPTER_DEFAULT_MIN_DAYS, c.id);
    if (c.numero > 1) assert.equal(c.confianceMin, CHAPTER_GATES[c.numero], c.id);
    for (const o of c.objectifs) {
      if (o.condition.type === 'batiment' || o.condition.type === 'decor') assert.ok(BUILDABLES[o.condition.id], o.id);
    }
  }
  assert.equal(chapterDef(chapitres, 2).id, 'rouge-des-erables');
  assert.equal(chapterDef(chapitres, 9), null);
});

test('evalCondition : compteurs du potager, min et max, bâtiment et son état, décors', () => {
  const g = createInitialState(at('2026-10-06'));
  assert.equal(evalCondition({ type: 'semis', culture: 'courge', max: 0 }, S(g)), true);
  assert.equal(evalCondition({ type: 'semis', culture: 'courge', min: 1 }, S(g)), false);
  g.garden.sown.courge = 1;
  g.garden.harvested.ble = 2;
  g.garden.reserved = 1;
  assert.equal(evalCondition({ type: 'semis', culture: 'courge', min: 1 }, S(g)), true);
  assert.equal(evalCondition({ type: 'recolte', min: 2 }, S(g)), true); // toutes cultures
  assert.equal(evalCondition({ type: 'recolte', culture: 'courge', min: 1 }, S(g)), false);
  assert.equal(evalCondition({ type: 'reserve', min: 1 }, S(g)), true);
  g.placements = [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }, { id: 'tunnel-1', model: 'tunnel', sector: 'champs' },
    { id: 'erable-1', model: 'erable', sector: 'atelier' }, { id: 'erable-2', model: 'erable', sector: 'atelier' }];
  assert.equal(evalCondition({ type: 'batiment', id: 'tour', etat: 'reparee' }, S(g)), true);
  assert.equal(evalCondition({ type: 'batiment', id: 'tour', etat: 'detruite' }, S(g)), false);
  assert.equal(evalCondition({ type: 'batiment', id: 'tunnel', etat: 'construit' }, S(g)), true); // sans état : construit
  assert.equal(evalCondition({ type: 'batiment', id: 'etabli', etat: 'construit' }, S(g)), false);
  assert.equal(evalCondition({ type: 'decor', id: 'erable', min: 3 }, S(g)), false);
  assert.equal(evalCondition({ type: 'decor', id: 'erable', min: 2 }, S(g)), true);
  assert.equal(evalCondition({ type: 'inconnu' }, S(g)), false);
});

test('evalCondition : lisière, Confiance, palier de secteur, Lueur en réserve, Avis', () => {
  const g = createInitialState(at('2026-10-06'));
  g.lisiereDays = ['2026-10-06', '2026-10-07'];
  g.resources.confidence = 9;
  g.lueur.atelier = 40;
  assert.equal(evalCondition({ type: 'lisiere', min: 2 }, S(g)), true);
  assert.equal(evalCondition({ type: 'confiance', min: 9 }, S(g)), true);
  assert.equal(evalCondition({ type: 'lueur_en_reserve', secteur: 'atelier', min: 1 }, S(g)), true);
  assert.equal(evalCondition({ type: 'lueur_en_reserve', secteur: 'archives', max: 0 }, S(g)), true);
  assert.equal(evalCondition({ type: 'secteur_palier', secteur: 'atelier', palier: 'reparer' }, S(g)), false); // fermé
  g.sectors.atelier = { open: true, stage: 1 };
  assert.equal(evalCondition({ type: 'secteur_palier', secteur: 'atelier', palier: 'reparer' }, S(g)), true);
  assert.equal(evalCondition({ type: 'secteur_palier', secteur: 'atelier', palier: 'prosperer' }, S(g)), false);
  assert.equal(evalCondition({ type: 'avis', id: 'premier_gel' }, S(g)), false);
  g.avis.history = [{ id: 'premier_gel', result: 'voile' }]; // tenu ou voilé, les deux comptent
  assert.equal(evalCondition({ type: 'avis', id: 'premier_gel' }, S(g)), true);
});

test('evalCondition : quêtes et étapes depuis le début du chapitre, remballées exclues, « un parmi »', () => {
  const g = createInitialState(at('2026-10-06'));
  g.chapter.startDay = '2026-10-10';
  const ledger = [
    reward('2026-10-09', 'atelier', 'avant'), reward('2026-10-10', 'atelier', 'a'), reward('2026-10-11', 'champs', 'b'),
    reward('2026-10-11', 'atelier', 'c'), { key: 'reverse:c:1', type: 'reverse', day: '2026-10-11' },
    { ...reward('2026-10-12', 'atelier', 'step:long:1:s1', 'step'), taskId: 'long' },
  ];
  const tasks = [task({ id: 'long', length: 7 }), task({ id: 'court', length: 2 })];
  const s = S(g, { ledger, tasks });
  assert.equal(evalCondition({ type: 'quetes', secteur: 'atelier', min: 1 }, s), true);
  assert.equal(evalCondition({ type: 'quetes', secteur: 'atelier', min: 2 }, s), false); // « avant » et « c » ne comptent pas
  assert.equal(evalCondition({ type: 'quetes', min: 2 }, s), true);
  assert.equal(evalCondition({ type: 'etape', longueurMin: 6, min: 1 }, s), true);
  assert.equal(evalCondition({ type: 'etape', longueurMin: 8, min: 1 }, s), false);
  assert.equal(evalCondition({ type: 'un_parmi', conditions: [{ type: 'etape', longueurMin: 8 }, { type: 'quetes', min: 2 }] }, s), true);
  assert.equal(evalCondition({ type: 'un_parmi', conditions: [] }, s), false);
});

test('chapterProgress : objectifs, coût à afficher ({cout}), état du chapitre', () => {
  const w = fresh([], at('2026-10-06'));
  const p = chapterProgress(w.game, [], [], chapitres, at('2026-10-06'));
  assert.deepEqual(p.objectives.map((o) => o.id), ['ch1.lisiere', 'ch1.semis', 'ch1.recolte', 'ch1.tour', 'ch1.confiance']);
  assert.equal(p.objectives.find((o) => o.id === 'ch1.semis').cost.energy, SEED_COST.courge);
  assert.deepEqual(p.objectives.find((o) => o.id === 'ch1.tour').cost, BUILDABLES.tour.cost);
  assert.deepEqual([p.number, p.titre, p.day, p.minDays, p.done, p.total, p.contenu, p.canFinish], [1, 'Le premier sillon', 1, 3, 0, 5, true, false]);
});

test('le chapitre 1 ne se termine jamais avant le jour 3, même avec tous ses objectifs atteints', () => {
  const w = ch1Done();
  assert.equal(chapterProgress(w.game, [], [], chapitres, at('2026-10-06')).done, 5);
  let s = step(w, advanceTime, { chapitres }, at('2026-10-06'));
  assert.equal(s.world.game.chapter.number, 1);
  assert.deepEqual(s.r.events.filter((e) => e.type === 'objectif-atteint').map((e) => e.id),
    ['ch1.lisiere', 'ch1.semis', 'ch1.recolte', 'ch1.tour', 'ch1.confiance']);
  s = step(s.world, advanceTime, { chapitres }, at('2026-10-07'));
  assert.equal(s.world.game.chapter.number, 1);
  s = step(s.world, advanceTime, { chapitres }, at('2026-10-08'));
  assert.deepEqual(s.r.events.filter((e) => e.type.startsWith('chapitre')), [{ type: 'chapitre-fin', chapter: 1 }, { type: 'chapitre', chapter: 2 }]);
  const g = s.world.game;
  assert.deepEqual([g.chapter.number, g.chapter.startDay, g.resources.confidence, g.sectors.atelier.open], [2, '2026-10-08', 5, true]);
  assert.deepEqual(step(s.world, advanceTime, { chapitres }, at('2026-10-08')).r.ops, []); // rejouer : rien
});

test('syncChapter : un objectif atteint reste atteint ; il en manque un, le chapitre attend', () => {
  const w = ch1Done();
  const r = syncChapter(w.game, [], [], chapitres, at('2026-10-06'));
  assert.equal(r.game.chapter.objectives['ch1.confiance'], '2026-10-06');
  r.game.resources.confidence = 2; // une quête remballée fait redescendre la Confiance
  assert.equal(chapterProgress(r.game, [], [], chapitres, at('2026-10-06')).objectives.find((o) => o.id === 'ch1.confiance').done, true);
  const missing = ch1Done();
  missing.game.placements = [];
  const m = syncChapter(missing.game, [], [], chapitres, at('2026-10-09'));
  assert.equal(m.game.chapter.number, 1);
  assert.equal(chapterProgress(m.game, [], [], chapitres, at('2026-10-09')).canFinish, false);
  assert.deepEqual(syncChapter(missing.game, [], [], null, at('2026-10-09')).events, []);
});

test('un chapitre absent du contenu ne finit jamais tout seul', () => {
  const g = createInitialState(at('2026-10-06'));
  g.chapter = { number: 3, startDay: '2026-09-01', objectives: {} };
  g.resources.confidence = 99;
  const p = chapterProgress(g, [], [], chapitres, at('2026-10-06'));
  assert.deepEqual([p.contenu, p.total, p.canFinish], [false, 0, false]);
  assert.equal(syncChapter(g, [], [], chapitres, at('2026-10-06')).game, g);
});

test('moments d’histoire : introduction, puis ouverture du chapitre 1 après la première quête, 3 par jour au plus', () => {
  let w = fresh([], at('2026-10-06'));
  assert.deepEqual(storyMoments(w.game, [], [], chapitres, at('2026-10-06')).map((m) => m.id), ['introduction']);
  w.game.lisiereDays = ['2026-10-06'];
  const m = storyMoments(w.game, [], [], chapitres, at('2026-10-06'));
  assert.deepEqual(m.map((x) => [x.id, x.kind]), [
    ['introduction', 'introduction'], ['premier-sillon.ouverture', 'ouverture'], ['ch1.semis.annonce', 'objectif-annonce'],
  ]);
  assert.equal(m.length, STORY_PER_DAY);
  assert.deepEqual(m[1].lignes[0], { voix: 'narration', texte: chapitres.chapitres[0].ouverture.lignes[0].texte });
  w = step(w, markStorySeen, { ids: m.map((x) => x.id) }, at('2026-10-06')).world;
  assert.deepEqual(w.game.story, { seen: m.map((x) => x.id), day: '2026-10-06', count: 3 });
  assert.deepEqual(storyMoments(w.game, [], [], chapitres, at('2026-10-06', 22)), []); // plus rien aujourd'hui
  const next = storyMoments(w.game, [], [], chapitres, at('2026-10-07'));
  assert.deepEqual(next.map((x) => x.id), ['ch1.beat.jour2', 'ch1.tour.annonce', 'ch1.confiance.annonce']);
  // les lignes « si » : rien de semé → la variante sans courge seulement
  assert.deepEqual(next[0].lignes.map((l) => l.texte), [chapitres.chapitres[0].beats[0].lignes[1].texte]);
});

test('moments d’histoire : fin du chapitre passé, ouverture du suivant (lignes « si »), Avis annoncé puis résolu', () => {
  const w = fresh([], at('2026-10-06'));
  const g = w.game;
  g.chapter = { number: 2, startDay: '2026-10-08', objectives: {} };
  g.lueur.atelier = 25;
  // les moments « atteint » du chapitre 1 passent avant sa fin (déjà montrés ici)
  g.story = { seen: ['introduction', 'premier-sillon.ouverture', ...chapitres.chapitres[0].objectifs.filter((o) => o.atteint).map((o) => `${o.id}.atteint`)], day: null, count: 0 };
  let m = storyMoments(g, [], [], chapitres, at('2026-10-08'));
  assert.deepEqual(m.slice(0, 2).map((x) => x.id), ['premier-sillon.fin', 'rouge-des-erables.ouverture']);
  assert.match(m[1].lignes[0].texte, /attendait là/); // Lueur gardée sous la cendre
  g.story.seen.push('premier-sillon.fin', 'rouge-des-erables.ouverture');
  g.avis.current = { id: 'premier_gel', sector: 'champs', day: '2026-10-19', announcedOn: '2026-10-12', force: 24, braseros: 0 };
  m = storyMoments(g, [], [], chapitres, at('2026-10-12'));
  assert.deepEqual(m[0], { id: 'avis.premier_gel.annonce', kind: 'avis-annonce', avis: 'premier_gel', day: '2026-10-19', lignes: chapitres.chapitres[1].avis.annonce });
  g.avis.current = null;
  g.avis.history = [{ id: 'premier_gel', day: '2026-10-19', result: 'voile' }];
  m = storyMoments(g, [], [], chapitres, at('2026-10-19'));
  assert.deepEqual([m[0].id, m[0].kind, m[0].result], ['avis.premier_gel.voile', 'avis-resultat', 'voile']);
});

test('markStorySeen : un moment déjà vu ne compte pas deux fois ; le compteur repart chaque jour', () => {
  let w = fresh();
  w = step(w, markStorySeen, { ids: ['a', 'b'] }, at('2026-10-06')).world;
  const again = step(w, markStorySeen, { ids: ['a'] }, at('2026-10-06'));
  assert.deepEqual(again.r.ops, []);
  w = step(w, markStorySeen, { ids: ['c'] }, at('2026-10-07')).world;
  assert.deepEqual(w.game.story, { seen: ['a', 'b', 'c'], day: '2026-10-07', count: 1 });
});
