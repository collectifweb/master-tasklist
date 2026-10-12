// La vraie météo côté serveur (lot Q) : à une lecture (GET), si une ville est réglée dans la partie et que la prévision
// gardée (data/meteo.json) n'est pas du jour de jeu ou pas de cette ville, l'API la relit chez Open-Meteo. Ici, un faux
// Open-Meteo local (OREE_METEO_URL) : aucun test n'appelle le vrai service. Ville fictive, aucune donnée réelle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './helpers.mjs';
import { gameDay, addDays } from '../../core/time.js';

const VILLE = { nom: 'Village-Test', region: 'Région fictive', pays: 'Pays fictif', lat: 46.5, lon: -73.5 };
const AUTRE = { nom: 'Autre-Village', lat: 47.25, lon: -71.25 };

// Prévision de 16 jours à partir d'aujourd'hui : `neiges` donne les cm des premiers jours, 0 ensuite.
function corps(neiges = [5, 0, 3.2]) {
  const auj = gameDay(new Date());
  const time = Array.from({ length: 16 }, (_, k) => addDays(auj, k));
  return { latitude: 46.5, longitude: -73.5, daily: { time, snowfall_sum: time.map((_, k) => neiges[k] ?? 0) } };
}

/** Faux Open-Meteo : note chaque appel ; `repondre(url)` → { status, body, delai }. */
async function fauxOpenMeteo() {
  const appels = [];
  let repondre = () => ({ status: 200, body: corps() });
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://local');
    appels.push(url);
    const r = repondre(url);
    setTimeout(() => {
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(typeof r.body === 'string' ? r.body : JSON.stringify(r.body));
    }, r.delai || 0);
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  return {
    url: `http://127.0.0.1:${srv.address().port}/v1/forecast`,
    appels,
    repondre: (f) => { repondre = f; },
    stop: () => { srv.closeAllConnections(); srv.close(); },
  };
}

async function avecMeteo({ ville = VILLE, env = {} } = {}, fn) {
  const om = await fauxOpenMeteo();
  const s = await startServer({ env: { OREE_METEO_URL: om.url, ...env } });
  try {
    if (ville) partie(s, ville);
    await fn(s, om);
  } finally {
    s.stop();
    om.stop();
  }
}
// Partie minimale avec (ou sans) ville : l'API ne lit que reglages.ville.
function partie(s, ville) {
  mkdirSync(s.dataDir, { recursive: true });
  writeFileSync(join(s.dataDir, 'game-state.json'), JSON.stringify({ version: 2, ...(ville ? { reglages: { ville } } : {}) }, null, 2) + '\n');
}
const cache = (s) => join(s.dataDir, 'meteo.json');
const lireCache = (s) => JSON.parse(readFileSync(cache(s), 'utf8'));
const ecrireCache = (s, c) => writeFileSync(cache(s), JSON.stringify(c) + '\n');
const lecture = async (s, headers) => { const r = await s.get(headers); assert.equal(r.status, 200); return (await r.json()).meteo; };

test('sans ville : aucun appel, `meteo` nul dans les lectures et les écritures', () => avecMeteo({ ville: null }, async (s, om) => {
  assert.equal(await lecture(s), null);
  partie(s, null);
  assert.equal(await lecture(s), null);
  const r = await s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }]);
  assert.equal((await r.json()).meteo, null);
  assert.equal(om.appels.length, 0);
  assert.equal(existsSync(cache(s)), false);
}));

test('avec une ville : une lecture au premier GET, gardée pour le jour de jeu ; forme de `meteo` ; les écritures la portent sans appeler', () => avecMeteo({}, async (s, om) => {
  const avant = Date.now();
  const m = await lecture(s);
  assert.equal(om.appels.length, 1);
  const q = om.appels[0].searchParams;
  assert.equal(om.appels[0].pathname, '/v1/forecast');
  assert.equal(q.get('latitude'), '46.5');
  assert.equal(q.get('longitude'), '-73.5');
  assert.equal(q.get('daily'), 'snowfall_sum');
  assert.equal(q.get('timezone'), 'America/Montreal');
  assert.equal(q.get('forecast_days'), '16');
  assert.deepEqual(Object.keys(m).sort(), ['jours', 'lat', 'lon', 'lue']);
  assert.equal(m.lat, 46.5);
  assert.equal(m.lon, -73.5);
  assert.ok(Date.parse(m.lue) >= Math.floor(avant / 1000) * 1000 && Date.parse(m.lue) <= Date.now(), m.lue);
  const auj = gameDay(new Date());
  assert.equal(Object.keys(m.jours).length, 16);
  assert.equal(m.jours[auj], 5);
  assert.equal(m.jours[addDays(auj, 2)], 3.2);
  assert.equal(m.jours[addDays(auj, 15)], 0);
  // gardée : ni deuxième appel, ni autre prévision
  assert.deepEqual(await lecture(s), m);
  assert.equal(om.appels.length, 1);
  assert.deepEqual(lireCache(s), m);
  const r = await s.op([{ type: 'task.upsert', task: { id: 'a1', status: 'done' } }]);
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).meteo, m);
  assert.equal(om.appels.length, 1);
}));

test('ville changée, ou prévision d’un autre jour : nouvelle lecture', () => avecMeteo({}, async (s, om) => {
  await lecture(s);
  partie(s, AUTRE);
  const m = await lecture(s);
  assert.equal(om.appels.length, 2);
  assert.equal(om.appels[1].searchParams.get('latitude'), '47.25');
  assert.equal(om.appels[1].searchParams.get('longitude'), '-71.25');
  assert.equal(m.lat, 47.25);
  // lue la veille (plus de 24 h) : relue
  ecrireCache(s, { ...lireCache(s), lue: new Date(Date.now() - 30 * 3600000).toISOString() });
  await lecture(s);
  assert.equal(om.appels.length, 3);
  // coordonnées notées avec plus de deux décimales : arrondies au centième, la même ville
  partie(s, { ...AUTRE, lat: 47.2512, lon: -71.2488 });
  await lecture(s);
  assert.equal(om.appels.length, 3);
}));

test('échec (erreur, réponse illisible) : l’ancienne prévision reste, nouvel essai une heure plus tard', () => avecMeteo({}, async (s, om) => {
  const bonne = await lecture(s);
  const vieille = { ...bonne, lue: new Date(Date.now() - 30 * 3600000).toISOString() };
  ecrireCache(s, vieille);
  om.repondre(() => ({ status: 500, body: { error: true, reason: 'panne' } }));
  assert.deepEqual(await lecture(s), vieille);
  assert.equal(om.appels.length, 2);
  // dans l'heure : pas de nouvel appel
  assert.deepEqual(await lecture(s), vieille);
  assert.equal(om.appels.length, 2);
  // une heure plus tard : nouvel essai, réponse illisible, toujours l'ancienne
  const c = lireCache(s);
  assert.equal(typeof c.echec?.le, 'number');
  ecrireCache(s, { ...c, echec: { ...c.echec, le: c.echec.le - 3601 } });
  om.repondre(() => ({ status: 200, body: '<html>maintenance</html>' }));
  assert.deepEqual(await lecture(s), vieille);
  assert.equal(om.appels.length, 3);
  // forme inattendue (pas de neige du jour) : un échec aussi
  ecrireCache(s, { ...lireCache(s), echec: { ...lireCache(s).echec, le: 0 } });
  om.repondre(() => ({ status: 200, body: { daily: { time: ['2026-10-11'] } } }));
  assert.deepEqual(await lecture(s), vieille);
  assert.equal(om.appels.length, 4);
  // le service revient : la prévision du jour remplace l'ancienne, l'échec est oublié
  ecrireCache(s, { ...lireCache(s), echec: { ...lireCache(s).echec, le: 0 } });
  om.repondre(() => ({ status: 200, body: corps([0, 7]) }));
  const neuve = await lecture(s);
  assert.equal(neuve.jours[addDays(gameDay(new Date()), 1)], 7);
  assert.equal(lireCache(s).echec, undefined);
}));

test('jours sans valeur (null) : absents de la prévision', () => avecMeteo({}, async (s, om) => {
  om.repondre(() => { const b = corps(); b.daily.snowfall_sum[1] = null; return { status: 200, body: b }; });
  const m = await lecture(s);
  assert.equal(Object.keys(m.jours).length, 15);
  assert.equal(m.jours[addDays(gameDay(new Date()), 1)], undefined);
}));

test('réponse trop longue ou trop grosse : 16 jours gardés au plus ; au-delà de 256 Kio, un échec, l’ancienne prévision reste', () => avecMeteo({}, async (s, om) => {
  const auj = gameDay(new Date());
  om.repondre(() => {
    const time = Array.from({ length: 40 }, (_, k) => addDays(auj, k));
    return { status: 200, body: { daily: { time, snowfall_sum: time.map(() => 1) } } };
  });
  const m = await lecture(s);
  assert.equal(Object.keys(m.jours).length, 16);
  assert.equal(m.jours[addDays(auj, 15)], 1);
  assert.equal(m.jours[addDays(auj, 16)], undefined);
  const vieille = { ...m, lue: new Date(Date.now() - 30 * 3600000).toISOString() };
  ecrireCache(s, vieille);
  om.repondre(() => ({ status: 200, body: { ...corps([20]), bourrage: 'x'.repeat(300 * 1024) } }));
  assert.deepEqual(await lecture(s), vieille);
  assert.equal(om.appels.length, 2);
  assert.equal(typeof lireCache(s).echec?.le, 'number');
}));

test('service lent : la réponse part en 4 s au plus, sans prévision', () => avecMeteo({}, async (s, om) => {
  om.repondre(() => ({ status: 200, body: corps(), delai: 8000 }));
  const t0 = Date.now();
  const m = await lecture(s);
  const duree = Date.now() - t0;
  assert.ok(duree < 5000, `${duree} ms`);
  assert.equal(m, null);
  assert.equal(om.appels.length, 1);
}));

test('deux lectures en même temps : un seul appel ; l’autre part avec ce qui est gardé', () => avecMeteo({}, async (s, om) => {
  om.repondre(() => ({ status: 200, body: corps(), delai: 1000 }));
  // La seconde part quand la première attend Open-Meteo, donc tient le verrou de la prévision. Envoyées ensemble, php -S
  // les donnait parfois au même processus, qui les servait l'une après l'autre (4 échecs sur 16, mesuré le 12 octobre 2026).
  const a = lecture(s);
  for (let i = 0; i < 100 && om.appels.length === 0; i++) await new Promise((r) => setTimeout(r, 20));
  assert.equal(om.appels.length, 1);
  assert.equal(await lecture(s), null);
  assert.notEqual(await a, null);
  assert.equal(om.appels.length, 1);
}));

test('METEO éteint (OREE_METEO=0) : aucun appel', () => avecMeteo({ env: { OREE_METEO: '0' } }, async (s, om) => {
  assert.equal(await lecture(s), null);
  assert.equal(om.appels.length, 0);
}));

test('code d’accès manquant ou faux : refusé avant tout appel', () => {
  const hash = createHash('sha256').update('bon-jeton').digest('hex');
  return avecMeteo({ env: { OREE_TOKEN_HASH: hash } }, async (s, om) => {
    assert.equal((await s.get()).status, 401);
    assert.equal((await s.get({ Authorization: 'Bearer faux' })).status, 401);
    assert.equal(om.appels.length, 0);
    const m = await lecture(s, { Authorization: 'Bearer bon-jeton' });
    assert.equal(m.lat, 46.5);
    assert.equal(om.appels.length, 1);
  });
});
