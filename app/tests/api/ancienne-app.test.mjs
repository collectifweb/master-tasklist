// L'ancienne app (code de l'étiquette Git `v1`, tiré par git archive) face à l'API de la v2 : son envoi est refusé
// (client_outdated), elle l'écarte avec un message, sans nouvelle tentative, et rien n'est écrit sur le serveur.
// Le magasin v1 (js/store.js) tourne sous Node avec un navigateur minimal simulé : localStorage, document, window.
// Données fictives seulement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer } from './helpers.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const hasV1 = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'v1^{commit}'], { cwd: REPO }).status === 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(fn, ms = 8000) {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) return false;
    await sleep(50);
  }
  return true;
}

test('ancienne app (v1) : refus écarté avec un message, sans boucle de nouvelles tentatives, rien écrit', { skip: hasV1 ? false : 'étiquette Git v1 absente' }, async () => {
  const s = await startServer();
  const realFetch = globalThis.fetch;
  let store = null;
  try {
    // code v1 de l'interface, du cœur et des textes, servi à côté de l'API de la v2
    const tar = execFileSync('git', ['archive', 'v1', 'app/js', 'app/core', 'app/content'], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 });
    execFileSync('tar', ['-x', '-C', s.root], { input: tar });
    // partie déjà passée en v2 sur le serveur
    mkdirSync(s.dataDir, { recursive: true });
    const game = JSON.stringify({ version: 2, migratedAt: '2026-10-05T14:00:00.000Z', resources: { energy: 10, materials: 20, food: 5 }, habitants: 0 }, null, 4) + '\n';
    writeFileSync(join(s.dataDir, 'game-state.json'), game);
    const files = () => [s.readTasksRaw(), readFileSync(join(s.dataDir, 'game-state.json'), 'utf8'), existsSync(join(s.dataDir, 'ledger.jsonl')), existsSync(join(s.dataDir, 'ops.json'))];
    const before = files();

    // navigateur minimal
    const mem = new Map();
    const ls = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
    globalThis.document = { baseURI: s.url.replace(/api\/api\.php$/, '') };
    globalThis.window = { addEventListener() {} };
    let posts = 0;
    globalThis.fetch = (url, init = {}) => { if (init.method === 'POST') posts++; return realFetch(url, init); };

    // un onglet v1 resté ouvert : une quête terminée attend dans sa file
    ls.setItem('oree.queue.v1', JSON.stringify([{ opId: 'v1-onglet', name: 'completeQuest', params: { id: 'a1' }, at: new Date().toISOString() }]));
    const base = pathToFileURL(join(s.root, 'app', 'js') + '/').href;
    const { loadContent } = await import(base + 'content.js');
    const { Store } = await import(base + 'store.js');
    await loadContent();
    store = new Store();
    const notices = [];
    store.on('notice', (n) => notices.push(n));
    await store.load(); // lance l'envoi de la file sans l'attendre
    assert.ok(await until(() => posts >= 1 && !store.flushing), 'la file de la v1 est envoyée');
    await sleep(1500); // une boucle de nouvelles tentatives se verrait ici

    assert.equal(posts, 1, 'un seul envoi, aucune nouvelle tentative');
    assert.equal(store.retryTimer, null, 'aucune relance programmée');
    assert.deepEqual(JSON.parse(ls.getItem('oree.queue.v1')), [], 'le geste refusé est écarté de la file');
    assert.equal(notices.length, 1);
    assert.equal(notices[0].kind, 'error');
    assert.match(notices[0].text, /L’app a été mise à jour : recharge la page\./);
    assert.deepEqual(files(), before, 'rien n’est écrit sur le serveur');
  } finally {
    if (store) clearTimeout(store.retryTimer);
    globalThis.fetch = realFetch;
    s.stop();
  }
});
