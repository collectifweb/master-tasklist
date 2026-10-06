// Démo autonome du monde : état FICTIF construit avec core/, aucun appel réseau sauf les textes locaux
// de content/fr-CA/. Chaque bouton passe par les vraies fonctions du cœur (completeQuest, remballerQuest,
// monterQuartier) et joue leurs événements.
import { createWorld, createWorldPlan } from './world.js';
import { createInitialState } from '../core/state.js';
import { completeQuest, remballerQuest } from '../core/quests.js';
import { monterQuartier, niveauDe, coutNiveau } from '../core/quartiers.js';
import { PAS_IDS } from '../core/objectifs.js';
import { gameDay } from '../core/time.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const live = $('#live');

async function loadJSON(url) {
  try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; }
}
const [texts, anchors, batiments] = await Promise.all([
  loadJSON('../content/fr-CA/interface.json'),
  loadJSON('../content/fr-CA/ancres.json'),
  loadJSON('../content/fr-CA/batiments.json'),
]);
// noms des bâtiments sous bat.<groupe>.<clé>, comme le fait js/content.js pour l'app
for (const [groupe, textes] of Object.entries(batiments || {})) {
  if (texts && textes && typeof textes === 'object') for (const [k, v] of Object.entries(textes)) texts[`bat.${groupe}.${k}`] = v;
}

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
    { ...base, id: 'demo-7', task: 'Préparer les boîtes à lunch', domain: 'Enfants', difficulty: 2, length: 2, priority: 6 },
    { ...base, id: 'demo-8', task: 'Vérifier les pneus', domain: 'Véhicule', difficulty: 3, length: 2, priority: 5 },
    { ...base, id: 'demo-9', task: 'Tailler la haie', domain: 'Terrain', difficulty: 6, length: 6, priority: 3 },
  ];
}

function fictiveGame(now) {
  const g = createInitialState(new Date(now));
  g.quartiers = { place: 3, champs: 12, atelier: 4, mairie: 1, ecole: 0, garage: 0 };
  g.niveaux = { place: 0, champs: 1, atelier: 0, mairie: 0, ecole: 0, garage: 0 };
  g.permis = { ...g.permis, dispo: 2 }; // pastille « 2 » sur « Construire »
  g.resources = { energy: 40, materials: 25, food: 6 };
  g.habitants = 3;
  g.lastSeenDay = gameDay(new Date(now));
  g.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, g.lastSeenDay])); // un niveau s'achète après eux
  return g;
}

let now = Date.now();
let game, tasks, ledger, lastDone;
function reset() {
  now = Date.now();
  game = fictiveGame(now);
  tasks = fictiveTasks(now);
  ledger = [];
  lastDone = [];
}
reset();

// ---------------------------------------------------------------- monde, plan, tête
function announce(text) {
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 80);
}
function hud(g) {
  const v = { energy: g.resources.energy, materials: g.resources.materials, food: g.resources.food, habitants: g.habitants };
  for (const [k, n] of Object.entries(v)) {
    const el = document.querySelector(`[data-val="${k}"]`);
    el.textContent = String(Math.round(n * 10) / 10).replace('.', ',');
    el.closest('.res').setAttribute('aria-label', `${el.nextElementSibling.textContent} : ${el.textContent}`);
  }
}
let pendingHud = null;
window.__selections = [];
window.__controls = []; // commandes de la carte touchées (build, quests, plan), pour les tests
const world = createWorld($('#world'), {
  texts, anchors, announce, now: () => new Date(now),
  onImpact: () => { if (pendingHud) { hud(pendingHud); pendingHud = null; } },
  onSelect: (info) => { window.__selections.push(info); },
  // mêmes boutons que l'app : la démo n'a pas de catalogue, « Quêtes » cache le panneau, « Carte en liste » montre le plan
  panelId: 'panel',
  controls: {
    build: () => { window.__controls.push('build'); announce('Construire\u00a0: le catalogue est dans l’app.'); },
    quests: () => { window.__controls.push('quests'); setPanel(app.dataset.panel === 'cache' ? 'peek' : 'cache'); },
    plan: () => {
      window.__controls.push('plan');
      const b = $('[data-demo="plan"]');
      if (b.getAttribute('aria-pressed') !== 'true') actions.plan(b);
      else plan.focus();
    },
  },
});
/** Panneau de la démo : 'open', 'peek' ou 'cache' (caché par « Quêtes » : inert, la carte prend tout l'écran). */
function setPanel(state) {
  app.dataset.panel = state;
  $('#panel').inert = state === 'cache';
  const b = $('[data-demo="panel"]');
  b.setAttribute('aria-expanded', String(state === 'open'));
  b.querySelector('.panel-toggle-label').textContent = state === 'open' ? 'Replier' : 'Tout voir';
  world.setQuestsShown(state !== 'cache');
}
window.__filters = [];
const plan = createWorldPlan($('#plan'), {
  texts, anchors, now: () => new Date(now),
  onFocusSector: (s) => world.focusSector(s),
  onQuartier: (s) => { window.__filters.push(s); announce(`Fiche du quartier\u00a0: ${s}`); },
});

function show(result, extra = []) {
  if (!result) return;
  ({ game, tasks } = result);
  if (result.entries) ledger = ledger.concat(result.entries);
  pendingHud = game;
  world.render(game, tasks, ledger);
  plan.render(game, tasks, ledger);
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

const todoOf = (domain) => tasks.find((t) => t.domain === domain && t.status === 'todo')?.id;
const actions = {
  'q-champs': () => complete(todoOf('Terrain') ?? 'demo-2'),
  'q-atelier': () => complete(todoOf('Maison') ?? 'demo-1'),
  'q-mairie': () => complete(todoOf('Administratif') ?? 'demo-3'),
  'q-garage': () => complete(todoOf('Véhicule') ?? 'demo-8'),
  // donne de quoi payer le niveau suivant de l'Atelier (permis, Énergie, Matériaux), puis l'achète : quartier-monte
  niveau: () => {
    const g = structuredClone(game);
    const n = niveauDe(g, 'atelier') + 1;
    const cout = coutNiveau(n);
    g.permis = { ...g.permis, dispo: Math.max(g.permis.dispo, cout.permis) };
    g.resources.energy = Math.max(g.resources.energy, cout.energy);
    g.resources.materials = Math.max(g.resources.materials, cout.materials);
    now += 60 * 1000;
    try {
      return show(monterQuartier(tasks, g, ledger, { quartier: 'atelier', niveau: n, gameRevision: 0 }, new Date(now)));
    } catch (err) { announce(err.message); }
  },
  reflet: () => {
    // une quête fictive « frigo » terminée aujourd'hui : l'ancre « glaciere » fait reluire la glacière
    const t = tasks.map((x) => (x.id === 'demo-1' ? { ...x, status: 'done', doneAt: iso(now) } : x));
    return show({ game, tasks: t, events: [] }, [{ type: 'reflet', objectId: 'glaciere' }]);
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
  muets: () => world.play([{ type: 'sans-gain', taskId: 'demo-1' }, { type: 'type-inconnu' }, { type: 'plaque', id: 'demo' }]),
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
    world.render(game, tasks, ledger);
    plan.render(game, tasks, ledger);
  },
  panel: () => setPanel(app.dataset.panel !== 'open' ? 'open' : 'peek'),
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
window.__demo = {
  actions, get game() { return game; }, get tasks() { return tasks; },
  /** Modifie l'état fictif sans événement (ex. mettre une réserve à 0 pour un scénario), puis l'affiche. */
  patch(fn) { const g = structuredClone(game); fn(g); game = g; world.render(game, tasks); plan.render(game, tasks); },
};
