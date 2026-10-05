// État client et synchronisation.
//   server : dernier état connu du serveur (tâches, jeu, révision du jeu, registre).
//   queue  : actions en attente d'envoi (localStorage), l'état affiché = server + queue appliquée dans l'ordre.
// Chaque action passe par core/quests.js (fonctions pures), s'affiche tout de suite, puis part à l'API.
import * as core from '../core/index.js';
import { api, ApiError, newOpId } from './api-client.js';
import { t, content } from './content.js';

/**
 * Diriger le Fil libre vers un secteur. core/economy.js n'offre que directFilLibre(game, secteur, montant) ;
 * cette enveloppe lui donne la forme des autres opérations (tasks, game, ledger, params, now) → { …, ops, events }.
 * params : { sector, amount? } (sans montant : tout le Fil libre). Événement 'fil-libre' joué par le monde.
 */
function directFil(tasks, game, ledger, params, now) {
  const ctx = new core.Ctx(tasks, game, ledger, params, now);
  const amount = Math.floor((params.amount === undefined ? ctx.game.filLibre : Number(params.amount)) * 100) / 100;
  const r = core.directFilLibre(ctx.game, params.sector, amount);
  ctx.game = r.game;
  ctx.events.push({ type: 'fil-libre', sector: params.sector, amount }, ...r.events);
  return ctx.result();
}

const ACTIONS = {
  createQuest: core.createQuest, updateQuest: core.updateQuest, startQuest: core.startQuest, pauseQuest: core.pauseQuest,
  addStep: core.addStep, removeStep: core.removeStep, toggleStep: core.toggleStep, completeQuest: core.completeQuest,
  reopenQuest: core.reopenQuest, remballerQuest: core.remballerQuest, archiveQuest: core.archiveQuest,
  unarchiveQuest: core.unarchiveQuest, deleteQuest: core.deleteQuest, claimBonus: core.claimBonus, openApp: core.openApp,
  // semaine 3 : le jeu
  build: core.build, sow: core.sow, harvest: core.harvest, storeReserve: core.storeReserve, souffler: core.souffler,
  lightBrasero: core.lightBrasero, liftVeil: core.liftVeil, markStorySeen: core.markStorySeen,
  markLetterShown: core.markLetterShown, directFil,
  // le contenu des chapitres (15 Ko) n'entre jamais dans la file : il est réinjecté ici, à l'appel comme au rejeu
  advanceTime: (tasks, game, ledger, params, now) =>
    core.advanceTime(tasks, game, ledger, { ...params, chapitres: content.chapitres || undefined }, now),
};
// « Partager au village » : ajouté au cœur en même temps que cet écran ; branché seulement s'il existe
if (typeof core.shareHarvest === 'function') ACTIONS.shareHarvest = core.shareHarvest;

/** Vrai si l'action est connue (permet à l'écran de cacher un geste que le cœur n'offre pas encore). */
export const hasAction = (name) => Object.hasOwn(ACTIONS, name) && typeof ACTIONS[name] === 'function';
/** Action par son nom, parmi les seules clés propres d'ACTIONS (jamais « constructor » ou « __proto__ » lus dans la file). */
function action(name) {
  if (!hasAction(name)) throw new Error('Action inconnue : ' + name);
  return ACTIONS[name];
}

const QUEUE_KEY = 'oree.queue.v1';
const CACHE_KEY = 'oree.cache.v1';
const TICK_KEY = 'oree.tick.v1';
export const POLL_MS = 30000;
const RETRY_MS = 30000;
const MAX_TRIES = 6;

function loadQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY));
    return Array.isArray(q) ? q : [];
  } catch { return []; }
}
/** Renvoie false si la file n'a pas pu être écrite (stockage plein ou bloqué). */
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); return true; } catch { return false; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Tenue du jeu (ouverture, passage du temps, moment vu, lettre montrée) : elle part avec la file, mais n'est pas
// un « changement » du joueur ; l'indicateur hors ligne ne la compte pas (« 1 changement » après une quête faite).
const BOOKKEEPING = new Set(['openApp', 'advanceTime', 'markStorySeen', 'markLetterShown']);
const pendingCount = (q) => q.filter((e) => !BOOKKEEPING.has(e.name)).length;

function fromResponse(r, now) {
  return {
    tasks: core.normalizeTasks(r.tasks, now),
    game: r.game ? core.migrateState(r.game, now) : core.createInitialState(now),
    gameRevision: r.gameRevision ?? null,
    ledger: core.hydrateLedger(r.ledger, r.ledgerKeys),
    sig: JSON.stringify([r.revision, r.gameRevision ?? null, (r.ledgerKeys || []).length]),
  };
}

export class Store {
  constructor() {
    this.server = null;
    this.queue = loadQueue();
    this.view = null;
    this.listeners = {};
    this.sync = { state: 'saved', pending: 0, message: '', detail: '' };
    this.flushing = false;
    this.gen = 0;
    this.retryTimer = null;
    this.needsToken = false;
    this.lockedUntil = 0; // blocage du serveur après trop d'essais (429) : on ne l'interroge plus avant l'heure
    window.addEventListener('online', () => this.flush().then(() => this.refresh({ force: true })));
    window.addEventListener('offline', () => this.setSync('offline'));
    window.addEventListener('storage', (e) => {
      if (e.key === QUEUE_KEY) { this.queue = loadQueue(); this.recompute(); this.emit('change', {}); this.updatePending(); }
      if (e.key === TICK_KEY) this.refresh({ force: true });
    });
  }

  on(type, fn) { (this.listeners[type] ||= new Set()).add(fn); return () => this.listeners[type].delete(fn); }
  emit(type, payload) { for (const fn of this.listeners[type] || []) { try { fn(payload); } catch (e) { console.error(e); } } }

  // ───────── Chargement ─────────
  /**
   * Charge l'état : réseau d'abord, copie locale si hors ligne ou si le serveur est en panne (5xx : hébergement
   * saturé). Lance une ApiError si rien n'est possible.
   */
  async load() {
    let resp = null;
    let fromCache = false;
    try {
      if (this.lockLeft()) throw new ApiError(429, 'too_many_attempts', '', { retryAfter: this.lockLeft() });
      resp = await api.get();
    } catch (err) {
      if (err.status === 401) { this.needsToken = true; throw err; }
      if (err.status === 429) { this.lockFrom(err); throw err; }
      if (err.status !== 0 && !(err.status >= 500)) throw err;
      try { resp = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { resp = null; }
      if (!resp) throw err;
      fromCache = true;
      if (err.status === 0) this.setSync('offline'); else this.setSync('error', t('state.error.server'));
    }
    this.adopt(resp, fromCache);
    if (this.queue.length) this.flush();
  }

  /** Secondes de blocage qui restent (0 = pas bloqué). */
  lockLeft() { return Math.max(0, Math.ceil((this.lockedUntil - Date.now()) / 1000)); }

  /** Le serveur a répondu 429 : plus aucune requête avant la fin du blocage, et les relances en attente sont annulées. */
  lockFrom(err) {
    const s = Number(err.body && err.body.retryAfter);
    this.lockedUntil = Date.now() + (s > 0 ? s : 900) * 1000;
    this.needsToken = true;
    clearTimeout(this.retryTimer);
  }

  adopt(resp, skipCache) {
    this.server = fromResponse(resp, new Date());
    if (!skipCache) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(resp)); } catch { /* quota : tant pis */ }
    }
    this.recompute();
  }

  recompute() {
    let { tasks, game, ledger } = this.server;
    for (const e of this.queue) {
      try {
        const r = action(e.name)(tasks, game, ledger, { ...e.params, gameRevision: this.server.gameRevision }, new Date(e.at));
        tasks = r.tasks; game = r.game; ledger = r.entries.length ? [...ledger, ...r.entries] : ledger;
      } catch { /* sera écartée à l'envoi */ }
    }
    this.view = { tasks, game, ledger };
  }

  // ───────── Actions ─────────
  /**
   * Applique une action tout de suite à l'écran et la met en file pour l'API.
   * Lance une Error (message en français) si le jeu la refuse : rien n'est alors modifié.
   * Renvoie { result, events }.
   */
  do(name, params = {}) {
    const run = action(name);
    const now = new Date();
    const base = this.view;
    const result = run(base.tasks, base.game, base.ledger, { ...params, gameRevision: this.server.gameRevision }, now);
    if (result.ops.length) {
      const queue = [...loadQueue(), { opId: newOpId(), name, params, at: now.toISOString() }];
      // la file est la seule trace de l'action jusqu'à l'envoi : sans elle, l'action serait perdue à la relecture
      if (!saveQueue(queue)) throw new Error(t('notice.storage_full'));
      this.queue = queue;
      this.view = { tasks: result.tasks, game: result.game, ledger: result.entries.length ? [...base.ledger, ...result.entries] : base.ledger };
      this.updatePending();
    }
    this.emit('change', { events: result.events, action: name, params, result, now });
    if (result.ops.length) this.flush();
    return { result, events: result.events };
  }

  updatePending() {
    this.sync = { ...this.sync, pending: pendingCount(this.queue) };
    this.emit('sync', this.sync);
  }

  setSync(state, message = '', detail = '') {
    this.sync = { state, message, detail, pending: pendingCount(this.queue) };
    this.emit('sync', this.sync);
  }

  // ───────── Envoi ─────────
  async flush() {
    if (this.flushing) { this.again = true; return; }
    this.flushing = true;
    clearTimeout(this.retryTimer);
    try {
      const run = async () => { do { this.again = false; await this.flushLoop(); } while (this.again); };
      if (navigator.locks && navigator.locks.request) await navigator.locks.request('oree-flush', run);
      else await run();
    } finally {
      this.flushing = false;
    }
  }

  dropHead(opId) {
    this.queue = loadQueue().filter((e) => e.opId !== opId);
    saveQueue(this.queue);
  }
  patchHead(opId, patch) {
    this.queue = loadQueue().map((e) => (e.opId === opId ? { ...e, ...patch } : e));
    saveQueue(this.queue);
    return this.queue.find((e) => e.opId === opId) || null;
  }

  async flushLoop() {
    let savingTimer = null;
    try {
      while (true) {
        this.queue = loadQueue();
        let e = this.queue[0];
        if (!e) { this.afterIdle(); return; }
        if (!navigator.onLine) { this.setSync('offline'); return; }
        if (this.lockLeft()) { this.setSync('error', t('state.error.save')); this.emit('need-token', { locked: this.lockLeft() }); return; }

        if (!e.body) {
          let r;
          try {
            r = action(e.name)(this.server.tasks, this.server.game, this.server.ledger, { ...e.params, gameRevision: this.server.gameRevision }, new Date(e.at));
          } catch (err) {
            this.dropHead(e.opId);
            this.recompute();
            this.emit('change', {});
            this.emit('notice', { kind: 'info', text: t('notice.dropped', { raison: err.message }) });
            continue;
          }
          if (!r.ops.length) { this.dropHead(e.opId); this.recompute(); this.emit('change', {}); continue; }
          e = this.patchHead(e.opId, { body: { opId: e.opId, ops: r.ops } });
          if (!e) continue;
        }

        clearTimeout(savingTimer);
        savingTimer = setTimeout(() => this.setSync('saving'), 700);
        try {
          const resp = await api.post(e.body.opId, e.body.ops);
          clearTimeout(savingTimer);
          this.dropHead(e.opId);
          this.gen++;
          this.adopt(resp);
          this.emit('change', {});
          try { localStorage.setItem(TICK_KEY, String(Date.now())); } catch { /* ignoré */ }
          if (this.queue.length) this.updatePending(); else this.afterIdle();
        } catch (err) {
          clearTimeout(savingTimer);
          const verdict = await this.onError(err, e);
          if (verdict === 'stop') return;
        }
      }
    } finally {
      clearTimeout(savingTimer);
    }
  }

  afterIdle() {
    const wasProblem = this.sync.state === 'offline' || this.sync.state === 'error';
    this.setSync(wasProblem ? 'saved' : 'idle');
    this.needsToken = false;
  }

  /** 'continue' = reprendre la boucle ; 'stop' = attendre (réseau, jeton, minuterie). */
  async onError(err, e) {
    if (!(err instanceof ApiError)) { this.setSync('error', t('state.error.generic')); this.scheduleRetry(); return 'stop'; }
    if (err.status === 0) { this.setSync('offline'); this.scheduleRetry(10000); return 'stop'; }
    if (err.status === 429) {
      this.lockFrom(err);
      this.setSync('error', t('state.error.save'));
      this.emit('need-token', { locked: this.lockLeft() });
      return 'stop';
    }
    const tries = (e.tries || 0) + 1;
    switch (err.code) {
      case 'game_conflict': {
        // l'état du jeu a changé ailleurs, rien n'a été écrit : on repart de l'état renvoyé et on recalcule
        this.gen++;
        this.adopt(err.body);
        const left = (e.conflicts || 0) + 1;
        if (left > 4) { this.dropHead(e.opId); this.recompute(); this.emit('change', {}); this.emit('notice', { kind: 'info', text: t('state.conflict.game') }); return 'continue'; }
        this.patchHead(e.opId, { body: null, opId: newOpId(), conflicts: left });
        this.recompute();
        this.emit('change', {});
        return 'continue';
      }
      case 'duplicate_key': {
        // un gain existe déjà : on recharge, on recalcule une fois ; au deuxième refus on écarte, jamais de gain en double
        await this.reload();
        const dups = (e.dups || 0) + 1;
        if (dups >= 2) { this.dropHead(e.opId); this.recompute(); this.emit('change', {}); this.emit('notice', { kind: 'info', text: t('notice.duplicate') }); return 'continue'; }
        this.patchHead(e.opId, { body: null, opId: newOpId(), dups });
        this.recompute();
        this.emit('change', {});
        return 'continue';
      }
      case 'op_id_reused':
        this.patchHead(e.opId, { body: null, opId: newOpId() });
        return 'continue';
      case 'busy':
      case 'tasks_changed':
      case 'server_error':
      case 'ops_unreadable': {
        if (tries >= MAX_TRIES) { this.setSync('error', t('state.error.save')); this.scheduleRetry(); return 'stop'; }
        this.patchHead(e.opId, { tries });
        this.setSync('saving', t('sync.error.busy'));
        await sleep(Math.min(8000, 500 * 2 ** tries));
        return 'continue';
      }
      case 'tasks_missing':
      case 'tasks_unreadable':
      case 'auth_not_configured':
        this.setSync('error', t('sync.fatal.' + err.code), t('sync.fatal.title'));
        this.scheduleRetry();
        return 'stop';
      case 'unauthorized':
        this.needsToken = true;
        this.setSync('error', t('state.error.save'));
        this.emit('need-token', {});
        return 'stop';
      default:
        if (err.status >= 400 && err.status < 500) {
          // requête refusée : elle ne passera jamais telle quelle, on l'écarte et on revient à l'état du serveur
          this.dropHead(e.opId);
          await this.reload();
          this.recompute();
          this.emit('change', {});
          this.emit('notice', { kind: 'error', text: t('notice.dropped', { raison: err.message }) });
          return 'continue';
        }
        this.setSync('error', t('state.error.server'));
        this.scheduleRetry();
        return 'stop';
    }
  }

  async reload() {
    try { this.gen++; this.adopt(await api.get()); } catch { /* l'appelant gère la suite */ }
  }

  scheduleRetry(ms = RETRY_MS) {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.flush(), ms);
  }

  retryNow() { this.flush(); }

  // ───────── Relecture régulière ─────────
  async refresh({ force = false } = {}) {
    if (this.lockLeft()) return;
    if (this.flushing || loadQueue().length) { if (!this.flushing) this.flush(); return; }
    const gen = this.gen;
    try {
      const resp = await api.get();
      if (gen !== this.gen || this.flushing || loadQueue().length) return;
      const next = fromResponse(resp, new Date());
      const changed = !this.server || next.sig !== this.server.sig;
      if (changed) this.adopt(resp);
      if (this.sync.state === 'offline' || this.sync.state === 'error') this.setSync('saved');
      if (changed || force) this.emit('change', { polled: true });
    } catch (err) {
      if (err.status === 0) this.setSync('offline');
      else if (err.status === 401) { this.needsToken = true; this.emit('need-token', {}); }
      else if (err.status === 429) { this.lockFrom(err); this.emit('need-token', { locked: this.lockLeft() }); }
    }
  }
}
