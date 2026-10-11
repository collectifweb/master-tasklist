// File hors ligne et vraie météo (lot Q). Le vrai js/store.js tourne sous Node contre la vraie API (php -S), avec un
// navigateur minimal simulé. Un geste mis en file garde la prévision que l'appareil avait sous les yeux ; rejoué plus
// tard, il est recalculé avec elle, pas avec celle du jour : sinon, une prévision plus récente ferait retomber le geste
// sur le tirage, qui pouvait noter (et régler) une tempête que l'appareil n'avait jamais annoncée. Ville et prévisions
// fictives ; aucun appel au vrai Open-Meteo (le serveur de test vise un port fermé).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, fmt } from './helpers.mjs';
import { createInitialState, gameDay, addDays } from '../../core/index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const QUETE = { id: 'a1', task: 'Quête fictive', domain: 'Maison', difficulty: 3, length: 2, priority: 5, status: 'todo', created: '2026-10-01', deadline: null };
const VILLE = { nom: 'Village-Test', region: 'Région fictive', pays: 'Pays fictif', lat: 46.5, lon: -73.5 };
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;

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
// Prévision de 16 jours à partir de `day`, lue ce jour-là ; `neiges` : { jour: cm }.
function prevision(day, neiges = {}) {
  const jours = {};
  for (let k = 0; k < 16; k++) jours[addDays(day, k)] = 0;
  return { lat: VILLE.lat, lon: VILLE.lon, lue: at(day, 12), jours: { ...jours, ...neiges } };
}

test('geste hors ligne rejoué deux jours plus tard : recalculé avec la prévision qu’il a vue, celle du jour n’y change rien ; un nouveau geste garde la sienne', async () => {
  let store = null;
  try {
    const T = gameDay(new Date());
    const avant = addDays(T, -2);
    const J = addDays(avant, 3);
    // la partie du serveur : ville réglée, passée pour la dernière fois la veille du geste
    const g = { ...createInitialState(new Date(at(addDays(avant, -1)))), reglages: { ville: VILLE } };
    assert.equal((await s.op([{ type: 'game.set', baseGameRevision: null, game: g }], 'seed')).status, 200);
    // la prévision du jour, gardée par le serveur : aucune neige
    writeFileSync(join(s.dataDir, 'meteo.json'), JSON.stringify(prevision(T)) + '\n');
    const ls = navigateur();
    // il y a deux jours, hors ligne : la prévision de l'appareil annonçait 10 cm dans 3 jours
    const vue = prevision(avant, { [J]: 10 });
    ls.setItem('oree.queue.v2', JSON.stringify([{ opId: 'Q1', name: 'advanceTime', params: { meteo: vue }, at: at(avant) }]));
    const { Store } = await import('../../js/store.js');
    store = new Store();
    await store.load();
    assert.deepEqual(store.server.meteo.jours, prevision(T).jours, 'le serveur renvoie la prévision du jour');
    for (let i = 0; i < 80 && (store.flushing || fileDe(ls).length); i++) await sleep(100);
    assert.deepEqual(fileDe(ls), [], 'la file est vide');
    const partie = (await (await s.get()).json()).game;
    assert.deepEqual(partie.tempetes?.notees, [{ jour: J, source: 'meteo', ville: VILLE.nom }], JSON.stringify(partie.tempetes));

    // un nouveau geste garde, dans la file, la prévision de l'appareil à cet instant
    navigator.onLine = false;
    store.do('reglerVille', { ville: { nom: 'Autre-Village', lat: 47.25, lon: -71.25 } });
    const [e] = fileDe(ls);
    assert.equal(e.name, 'reglerVille');
    assert.deepEqual(e.params.meteo, store.server.meteo);
    assert.equal(e.params.ville.nom, 'Autre-Village');
  } finally {
    if (store) clearTimeout(store.retryTimer);
  }
});
