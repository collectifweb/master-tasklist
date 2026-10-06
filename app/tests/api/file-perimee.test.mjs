// File hors ligne et changements de version (lot R2). Le vrai js/store.js tourne sous Node contre la vraie API
// (php -S), avec un navigateur minimal simulé. Données fictives.
//  1. Un geste « accueillir » calculé par la v3, appliqué par le serveur dont la réponse s'est perdue, reste en file avec
//     son calcul. La v4 efface ce calcul (withoutStaleBodies) et le refait sur un état qui contient déjà l'effet : le
//     serveur répond op_id_reused, et le geste doit alors être écarté, pas repartir sous un nouvel opId (une seconde
//     famille accueillie, la Nourriture dépensée deux fois).
//  2. Un onglet plus ancien que le serveur (client_outdated) ne vide pas la file partagée : le geste mis en file par un
//     onglet à jour du même appareil y reste.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, fmt } from './helpers.mjs';
import { createInitialState, migrateState, accueillir, hydrateLedger } from '../../core/index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const QUETE = { id: 'a1', task: 'Quête fictive', domain: 'Maison', difficulty: 3, length: 2, priority: 5, status: 'todo', created: '2026-10-01', deadline: null };
const realFetch = globalThis.fetch;

// Un seul serveur pour les deux essais : js/api-client.js fixe l'adresse de l'API au premier import du magasin.
let s;
before(async () => { s = await startServer({ tasksRaw: fmt([QUETE]) }); });
after(() => { s.stop(); });

function navigateur() {
  const mem = new Map();
  const ls = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  globalThis.document = { baseURI: s.url.replace(/api\/api\.php$/, '') };
  globalThis.window = { addEventListener() {} };
  return ls;
}
const fileDe = (ls) => JSON.parse(ls.getItem('oree.queue.v2') || '[]');

async function partieAvecChalet(now) {
  const g = { ...createInitialState(now), batiments: [{ id: 'chalet-1', type: 'chalet' }], resources: { energy: 10, materials: 20, food: 40 } };
  assert.equal((await s.op([{ type: 'game.set', baseGameRevision: null, game: g }], 'seed')).status, 200);
}

test('calcul d’une version plus ancienne resté en file, geste déjà appliqué : rien n’est refait', async () => {
  let store = null;
  try {
    const now = new Date();
    await partieAvecChalet(now);
    const lire = async () => (await s.get()).json();
    const j = await lire();
    const game = migrateState(j.game, now, { tasks: j.tasks, ledger: j.ledger });
    const r = accueillir(j.tasks, game, hydrateLedger(j.ledger, j.ledgerKeys), { gameRevision: j.gameRevision }, now);
    assert.equal((await s.op(r.ops, 'X')).status, 200); // le serveur applique ; la réponse « se perd »
    assert.equal((await lire()).game.habitants, 1);

    const ls = navigateur();
    // calcul sans marque de client : celui d'une version d'avant le marquage
    ls.setItem('oree.queue.v2', JSON.stringify([{ opId: 'X', name: 'accueillir', params: {}, at: now.toISOString(), body: { opId: 'X', ops: r.ops } }]));
    const { Store } = await import('../../js/store.js');
    store = new Store();
    await store.load();
    for (let i = 0; i < 80 && (store.flushing || fileDe(ls).length); i++) await sleep(100);
    const final = (await lire()).game;
    assert.deepEqual(fileDe(ls), [], 'la file est vide');
    assert.equal(final.habitants, 1, 'une seule famille accueillie');
    assert.equal(final.resources.food, 22, 'la Nourriture n’est dépensée qu’une fois');
  } finally {
    if (store) clearTimeout(store.retryTimer);
  }
});

test('client_outdated : le geste reste en file, aucune nouvelle tentative, l’erreur est affichée', async () => {
  let store = null;
  try {
    const now = new Date();
    const ls = navigateur();
    let posts = 0;
    // le serveur est passé à une version de client plus récente que celle de cet onglet
    globalThis.fetch = async (url, init = {}) => {
      if (init.method !== 'POST') return realFetch(url, init);
      posts++;
      return new Response(JSON.stringify({ ok: false, code: 'client_outdated', error: 'L’app a été mise à jour : recharge la page.' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    };
    const geste = { opId: 'Y', name: 'accueillir', params: {}, at: now.toISOString() };
    ls.setItem('oree.queue.v2', JSON.stringify([geste]));
    const { Store } = await import('../../js/store.js');
    store = new Store();
    let sync = null;
    store.on('sync', (v) => { sync = v; });
    await store.load();
    for (let i = 0; i < 40 && !(posts >= 1 && !store.flushing); i++) await sleep(50);
    await sleep(800); // une boucle de nouvelles tentatives se verrait ici
    assert.equal(posts, 1, 'un seul envoi');
    assert.equal(store.retryTimer, null, 'aucune relance programmée');
    assert.deepEqual(fileDe(ls).map((e) => e.opId), ['Y'], 'le geste reste en file');
    assert.equal(sync.state, 'error');
    assert.match(sync.message, /recharge la page/);
  } finally {
    globalThis.fetch = realFetch;
    if (store) clearTimeout(store.retryTimer);
  }
});
