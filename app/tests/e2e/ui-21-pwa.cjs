// 21. Application installable : manifeste valide (nom, couleurs du DESIGN, icônes 192 et 512), service worker
// enregistré, coquille en cache, l'API jamais en cache, puis rechargement hors ligne depuis le cache.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const L = require('./lib.cjs');

const APP = path.join(L.REPO, 'app');
const swSrc = fs.readFileSync(path.join(APP, 'sw.js'), 'utf8');
const VERSION = swSrc.match(/const VERSION = '([^']+)'/)[1];
const SHELL = [...swSrc.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const tokens = fs.readFileSync(path.join(APP, 'css', 'tokens.css'), 'utf8').toLowerCase();

/** Fichiers que la page charge à l'exécution (la démo du monde et les package.json n'en font pas partie). */
function runtimeFiles() {
  const list = (dir, ext) => fs.readdirSync(path.join(APP, dir)).filter((f) => f.endsWith(ext)).map((f) => `${dir}/${f}`);
  return [
    ...list('js', '.js'), ...list('js/ui', '.js'), ...list('core', '.js'),
    ...list('world', '.js').filter((f) => f !== 'world/demo.js'),
    ...list('css', '.css'), ...list('content/fr-CA', '.json'),
    'index.html', 'manifest.webmanifest', 'design/icons.svg',
  ];
}

L.runScenario('21. application installable et lancement hors ligne', async ({ R, srv, newPage, shot }) => {
  // ───── la liste de la coquille suit les fichiers du dépôt
  const missing = runtimeFiles().filter((f) => !SHELL.includes(f));
  const ghost = SHELL.filter((f) => f !== './' && !fs.existsSync(path.join(APP, f)));
  R.check('le service worker garde tous les fichiers chargés par la page', missing.length === 0, missing.join(', '));
  R.check('… et aucun fichier qui n’existe pas', ghost.length === 0, ghost.join(', '));
  R.check('chemins relatifs partout (aucun « / » en tête, aucune adresse)', SHELL.every((f) => !/^\/|^[a-z]+:/i.test(f)) && !/api\.php/.test(SHELL.join()), SHELL.filter((f) => /^\//.test(f)).join());

  const { context, page } = await newPage();
  const apiFromSw = [];
  page.on('response', (r) => { if (/\/api\//.test(r.url()) && r.fromServiceWorker()) apiFromSw.push(r.url()); });
  await page.goto(srv.url);
  await L.ready(page);

  // ───── manifeste
  const man = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const href = link.getAttribute('href');
    const r = await fetch(link.href);
    const json = await r.json();
    const icons = [];
    for (const ic of json.icons || []) {
      const res = await fetch(new URL(ic.src, link.href));
      const bmp = res.ok ? await createImageBitmap(await res.blob()) : null;
      icons.push({ src: ic.src, sizes: ic.sizes, purpose: ic.purpose, status: res.status, type: res.headers.get('content-type'), w: bmp && bmp.width, h: bmp && bmp.height });
    }
    return { href, status: r.status, json, icons, theme: document.querySelector('meta[name="theme-color"]').content };
  });
  const m = man.json;
  R.check('manifeste lié en chemin relatif et servi', man.href === 'manifest.webmanifest' && man.status === 200, man.href);
  R.check('nom « Orée », affichage autonome, start_url et scope relatifs', m.name === 'Orée' && m.short_name === 'Orée' && m.display === 'standalone' && m.start_url === './' && m.scope === './', JSON.stringify({ n: m.name, d: m.display, s: m.start_url, sc: m.scope }));
  R.check('couleurs tirées des jetons du DESIGN (papier, ciel) et égales à theme-color', tokens.includes(m.background_color.toLowerCase()) && tokens.includes(m.theme_color.toLowerCase()) && m.theme_color === man.theme, `${m.background_color} / ${m.theme_color} / ${man.theme}`);
  const ic = (s, p) => man.icons.find((x) => x.sizes === s && (x.purpose || 'any').split(' ').includes(p));
  const okIcon = (x, n) => x && x.status === 200 && /image\/png/.test(x.type || '') && x.w === n && x.h === n && !/^\//.test(x.src);
  R.check('icône 192 × 192 : PNG servie, vraie taille', okIcon(ic('192x192', 'any'), 192), JSON.stringify(ic('192x192', 'any')));
  R.check('icône 512 × 512 : PNG servie, vraie taille, aussi « maskable »', okIcon(ic('512x512', 'any'), 512) && okIcon(ic('512x512', 'maskable'), 512), JSON.stringify(man.icons));

  // ───── service worker
  const reg = await page.evaluate(async () => {
    const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 8000))]);
    return r && { scope: r.scope, script: r.active && r.active.scriptURL, state: r.active && r.active.state };
  });
  R.check('service worker enregistré et actif, portée = dossier de l’app', reg && reg.scope === srv.url && reg.script === srv.url + 'sw.js' && reg.state === 'activated', JSON.stringify(reg));
  R.check('il contrôle la page', await L.waitFor(() => page.evaluate(() => !!navigator.serviceWorker.controller), 5000));

  // une quête faite (POST à l'API) avant de regarder le cache
  const done = await page.getAttribute('#fil-quest', 'data-task-id');
  await page.click('#fil-quest [data-action="complete"]');
  R.check('la quête faite part au serveur', await L.waitFor(() => srv.readTasks().find((x) => x.id === done)?.status === 'done', 5000));
  await L.waitFor(() => page.evaluate(() => JSON.parse(localStorage.getItem('oree.queue.v1') || '[]').length === 0), 4000);
  await L.closeWelcome(page, 1200);
  const next = await page.getAttribute('#fil-quest', 'data-task-id');
  const cache = await page.evaluate(async (v) => {
    const keys = await caches.keys();
    const c = keys.includes(v) ? await caches.open(v) : null;
    const urls = c ? (await c.keys()).map((r) => r.url) : [];
    return { keys, urls };
  }, VERSION);
  const want = SHELL.map((f) => new URL(f, srv.url).href);
  const notCached = want.filter((u) => !cache.urls.includes(u));
  R.check(`cache « ${VERSION} » créé`, cache.keys.includes(VERSION), cache.keys.join());
  R.check('toute la coquille est en cache', notCached.length === 0, notCached.join(', '));
  R.check('l’API n’est jamais en cache', !cache.urls.some((u) => /\/api\//.test(u)) && cache.keys.every((k) => k.startsWith('oree-')), cache.urls.filter((u) => /api/.test(u)).join());
  R.check('aucune réponse de l’API ne vient du service worker', apiFromSw.length === 0, apiFromSw.join());

  // ───── ni variante « ?v=N » ni fichier hors de la portée de l'app (../tasks.json) dans le cache
  await page.evaluate(async () => { for (const u of ['index.html?v=1', 'js/main.js?x=2', '../tasks.json']) await fetch(u).catch(() => {}); });
  await page.waitForTimeout(300);
  const urls2 = await page.evaluate(async (v) => (await (await caches.open(v)).keys()).map((r) => r.url), VERSION);
  R.check('le cache ne garde ni chaîne de requête ni fichier hors de l’app', urls2.every((u) => !u.includes('?') && u.startsWith(srv.url)), urls2.filter((u) => u.includes('?') || !u.startsWith(srv.url)).join(', '));

  // ───── serveur en panne (503 partout, réseau présent) : coquille en cache, copie locale, indicateur d'erreur
  const port = Number(new URL(srv.base).port);
  srv.stop();
  page.expected.push(/status of 503/, /ServiceWorker/);
  const down = http.createServer((req, res) => { res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<h1>Service indisponible</h1>'); });
  // le serveur PHP vient d'être tué : le port se libère un instant plus tard
  const tryListen = () => new Promise((r) => {
    const onErr = () => r(false);
    down.once('error', onErr);
    down.listen(port, '127.0.0.1', () => { down.off('error', onErr); r(true); });
  });
  let listening = false;
  for (let i = 0; i < 50 && !listening; i++) { listening = await tryListen(); if (!listening) await new Promise((r) => setTimeout(r, 100)); }
  if (!listening) throw new Error(`port ${port} toujours occupé après l’arrêt du serveur`);
  try {
    const r503 = await page.reload();
    R.check('serveur en 503 : la page vient du cache (pas la page d’erreur)', !!r503 && r503.fromServiceWorker() && r503.status() === 200, r503 ? `${r503.status()} / ${r503.fromServiceWorker()}` : 'aucune réponse');
    R.check('… le Fil du jour s’affiche depuis la copie locale', !!(await L.waitFor(() => page.locator('#fil-quest:not([hidden])').count(), 8000)) && await page.getAttribute('#fil-quest', 'data-task-id') === next, await page.getAttribute('#fil-quest', 'data-task-id'));
    R.check('… et l’indicateur dit que le serveur ne répond pas', await L.waitFor(() => page.isVisible('#sync[data-sync="error"]'), 4000), await page.getAttribute('#sync', 'data-sync'));
  } finally {
    await new Promise((r) => down.close(r));
  }

  // ───── hors ligne : réseau coupé ET serveur arrêté, puis rechargement
  const titles = await page.$$eval('#quest-list > li .quest-title', (els) => els.map((e) => e.textContent.trim()));
  await context.setOffline(true);
  srv.stop();
  const resp = await page.reload();
  R.check('hors ligne : la page vient du service worker', !!resp && resp.fromServiceWorker(), resp ? String(resp.status()) : 'aucune réponse');
  const up = await L.waitFor(() => page.locator('#fil-quest:not([hidden]), #fil-empty:not([hidden])').count(), 8000);
  R.check('hors ligne : le Fil du jour s’affiche', !!up);
  const after = await page.$$eval('#quest-list > li .quest-title', (els) => els.map((e) => e.textContent.trim()));
  R.check(`hors ligne : la liste revient de la copie locale (${after.length} quêtes)`, after.length > 0 && after.join('|') === titles.join('|'), `${titles.length} → ${after.length}`);
  R.check('hors ligne : le Fil propose la même quête qu’avant la coupure (la quête faite reste faite)', await page.getAttribute('#fil-quest', 'data-task-id') === next && next !== done, `${done} / ${next} / ${await page.getAttribute('#fil-quest', 'data-task-id')}`);
  R.check('hors ligne : l’indicateur le dit', await L.waitFor(() => page.isVisible('#sync[data-sync="offline"]'), 4000), await page.getAttribute('#sync', 'data-sync'));
  R.check('hors ligne : le monde se dessine (modules en cache)', await L.waitFor(() => page.evaluate(() => document.querySelectorAll('.ow-ent').length > 5), 8000));
  R.check('hors ligne : textes de l’interface chargés (aucune clé brute)', await page.evaluate(() => !/\b[a-z_]+\.[a-z_]+\.[a-z_.]+\b/.test(document.querySelector('#fil-quest').innerText + document.querySelector('.hud, header, body').innerText.slice(0, 400))));
  await shot(page, '21-hors-ligne');
});
