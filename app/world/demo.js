// Démo autonome du monde : état FICTIF construit avec core/, aucun appel réseau sauf les textes locaux
// de content/fr-CA/. Chaque bouton passe par les vraies fonctions du cœur quand elles existent
// (completeQuest, remballerQuest, directFilLibre, advanceChapter) et joue leurs événements.
import { createWorld, createWorldPlan } from './world.js';
import { createInitialState } from '../core/state.js';
import { completeQuest, remballerQuest } from '../core/quests.js';
import { directFilLibre, advanceChapter, stageForLueur, stageName } from '../core/economy.js';
import { gameDay } from '../core/time.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const live = $('#live');

async function loadJSON(url) {
  try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; }
}
const [texts, anchors] = await Promise.all([
  loadJSON('../content/fr-CA/interface.json'),
  loadJSON('../content/fr-CA/ancres.json'),
]);

const DAY_MS = 86400000;
const iso = (d) => new Date(d).toISOString();

// ---------------------------------------------------------------- état fictif
function fictiveTasks(now) {
  const t0 = iso(now - 30 * DAY_MS);
  const day = (n) => gameDay(new Date(now + n * DAY_MS));
  const base = { status: 'todo', created: day(-30), createdAt: t0 };
  return [
    { ...base, id: 'demo-1', task: 'Nettoyer le frigo', domain: 'Maison', difficulty: 3, length: 3, priority: 8 },
    { ...base, id: 'demo-2', task: 'Ratisser les feuilles', domain: 'Terrain', difficulty: 4, length: 5, priority: 6 },
    { ...base, id: 'demo-3', task: 'Classer les documents', domain: 'Administratif', difficulty: 3, length: 4, priority: 5 },
    { ...base, id: 'demo-4', task: 'Changer une ampoule', domain: 'Maison', difficulty: 1, length: 1, priority: 6, deadline: day(2) },
    { ...base, id: 'demo-5', task: 'Arroser le potager', domain: 'Terrain', difficulty: 2, length: 2, priority: 4, deadline: day(0) },
    { ...base, id: 'demo-6', task: 'Payer une facture', domain: 'Administratif', difficulty: 2, length: 1, priority: 7, deadline: day(5) },
    { ...base, id: 'demo-7', task: 'Tailler la haie', domain: 'Terrain', difficulty: 6, length: 6, priority: 3 },
    { ...base, id: 'demo-8', task: 'Réparer la clôture', domain: 'Terrain', difficulty: 5, length: 5, priority: 5 },
  ];
}

function fictiveGame(now) {
  const g = createInitialState(new Date(now));
  g.chapter = { number: 2, startDay: gameDay(new Date(now - 20 * DAY_MS)), objectives: {} };
  g.sectors.atelier.open = true;
  g.lueur = { place: 160, champs: 420, atelier: 118, archives: 45, 'maison-commune': 0, relais: 0 };
  for (const id of Object.keys(g.sectors)) if (g.sectors[id].open) g.sectors[id].stage = stageForLueur(g.lueur[id]);
  g.resources = { energy: 22, materials: 64, confidence: 9 };
  g.filLibre = 12;
  g.plots = [{ id: 'parcelle-a', crop: 'courge', stage: 1, slot: 0 }, { id: 'parcelle-b', crop: 'ble', stage: 2, slot: 1 }];
  g.placements = [{ id: 'tunnel-1', model: 'tunnel', sector: 'champs' }];
  return g;
}

let now = Date.now();
let game, tasks, ledger, lastDone, builds;
function reset() {
  now = Date.now();
  game = fictiveGame(now);
  tasks = fictiveTasks(now);
  ledger = [];
  lastDone = [];
  builds = 0;
}
reset();

// ---------------------------------------------------------------- monde, plan, tête
function announce(text) {
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 80);
}
function hud(g) {
  const v = { energy: g.resources.energy, materials: g.resources.materials, confidence: g.resources.confidence, filLibre: g.filLibre };
  for (const [k, n] of Object.entries(v)) {
    const el = document.querySelector(`[data-val="${k}"]`);
    el.textContent = String(Math.round(n * 10) / 10).replace('.', ',');
    el.closest('.res').setAttribute('aria-label', `${el.nextElementSibling.textContent} : ${el.textContent}`);
  }
}
let pendingHud = null;
const world = createWorld($('#world'), {
  texts, anchors, announce, now: () => new Date(now),
  onImpact: () => { if (pendingHud) { hud(pendingHud); pendingHud = null; } },
});
const plan = createWorldPlan($('#plan'), { texts, anchors, now: () => new Date(now), onFocusSector: (s) => world.focusSector(s) });

function show(result, extra = []) {
  if (!result) return;
  ({ game, tasks } = result);
  if (result.entries) ledger = ledger.concat(result.entries);
  pendingHud = game;
  world.render(game, tasks);
  plan.render(game, tasks);
  const events = [...extra, ...(result.events || [])];
  const run = world.play(events);
  run.then(() => { if (pendingHud) { hud(pendingHud); pendingHud = null; } });
  window.__lastEvents = events;
  return run;
}

function complete(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  if (t.status === 'done') {
    // la démo rouvre la quête pour qu'on puisse la rejouer (le cœur la remet à 0 gain si déjà payée)
    tasks = tasks.map((x) => (x.id === id ? { ...x, status: 'todo', doneAt: null } : x));
  }
  now += 60 * 1000;
  const r = completeQuest(tasks, structuredClone(game), ledger, { id, gameRevision: 0 }, new Date(now));
  lastDone.push(id);
  return show(r);
}

const actions = {
  'q-champs': () => complete(tasks.find((t) => t.domain === 'Terrain' && t.status === 'todo')?.id ?? 'demo-2'),
  'q-atelier': () => complete(tasks.find((t) => t.domain === 'Maison' && t.status === 'todo')?.id ?? 'demo-1'),
  'q-archives': () => complete(tasks.find((t) => t.domain === 'Administratif' && t.status === 'todo')?.id ?? 'demo-3'),
  fil: () => {
    const n = Math.min(game.filLibre, 10);
    if (!(n > 0)) { announce('Le Fil libre est vide.'); return; }
    const r = directFilLibre(game, 'atelier', n);
    return show({ game: r.game, tasks, events: r.events }, [{ type: 'fil-libre', sector: 'atelier', amount: n }]);
  },
  build: () => {
    const list = [{ model: 'erable', sector: 'atelier' }, { model: 'lanterne', sector: 'champs' }, { model: 'glaciere', sector: 'atelier' }, { model: 'caisse', sector: 'place' }];
    const p = { id: `construction-${++builds}`, ...list[(builds - 1) % list.length] };
    const g = structuredClone(game);
    g.placements = [...g.placements, p];
    return show({ game: g, tasks, events: [] }, [{ type: 'construction', id: p.id }]);
  },
  seuil: () => {
    const g = structuredClone(game);
    const s = g.sectors.atelier;
    const next = Math.min(3, s.stage + 1);
    g.lueur.atelier = Math.max(g.lueur.atelier, [0, 150, 400, 750][next]);
    const events = [];
    for (let st = s.stage + 1; st <= stageForLueur(g.lueur.atelier); st++) events.push({ type: 'secteur-seuil', sector: 'atelier', stage: stageName(st) });
    s.stage = stageForLueur(g.lueur.atelier);
    return show({ game: g, tasks, events });
  },
  reflet: () => {
    // une quête fictive « frigo » terminée aujourd'hui : l'ancre « glaciere » fait reluire la glacière
    const t = tasks.map((x) => (x.id === 'demo-1' ? { ...x, status: 'done', doneAt: iso(now) } : x));
    return show({ game, tasks: t, events: [] }, [{ type: 'reflet', objectId: 'glaciere' }]);
  },
  chapitre: () => {
    const g = structuredClone(game);
    g.chapter.startDay = gameDay(new Date(now - 40 * DAY_MS));
    g.resources.confidence = Math.max(g.resources.confidence, 60);
    try {
      const r = advanceChapter(g, new Date(now));
      return show({ game: r.game, tasks, events: r.events });
    } catch (err) { announce(err.message); }
  },
  veille: () => world.play([{ type: 'veille' }]),
  remballer: () => {
    const id = lastDone.pop();
    if (!id) { announce('Aucune quête à remballer.'); return; }
    try {
      const r = remballerQuest(tasks, structuredClone(game), ledger, { id, gameRevision: 0 }, new Date(now));
      return show(r);
    } catch (err) { announce(err.message); }
  },
  motion: (b) => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    document.documentElement.dataset.motion = on ? 'reduce' : 'full';
    world.setReducedMotion(on);
  },
  plan: (b) => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    $('#plan').hidden = !on;
    if (on) plan.focus();
  },
  reset: () => {
    reset();
    hud(game);
    world.render(game, tasks);
    plan.render(game, tasks);
  },
  panel: (b) => {
    const open = app.dataset.panel !== 'open';
    app.dataset.panel = open ? 'open' : 'peek';
    b.setAttribute('aria-expanded', String(open));
    b.querySelector('.panel-toggle-label').textContent = open ? 'Replier' : 'Tout voir';
  },
};

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-demo]');
  if (!b) return;
  const fn = actions[b.dataset.demo];
  if (fn) fn(b);
});

hud(game);
world.render(game, tasks);
plan.render(game, tasks);
window.__world = world;
window.__demo = { actions, get game() { return game; }, get tasks() { return tasks; } };
