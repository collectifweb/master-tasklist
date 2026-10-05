// 23. Blocage après trop d'essais (429) : message dans la feuille du jeton, plus aucune requête pendant le blocage, pas de « hors ligne ».
// Le serveur est simulé (réponse 429 posée par le navigateur) : le vrai blocage est couvert par les tests de l'API.
const L = require('./lib.cjs');
const BLOCAGE = { status: 429, contentType: 'application/json', headers: { 'Retry-After': '600' }, body: JSON.stringify({ ok: false, code: 'too_many_attempts', error: 'Trop d’essais.', retryAfter: 600 }) };
L.runScenario('23. blocage après trop d’essais', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  page.expected.push(/status of 429/);
  let calls = 0;
  const compte = (r) => { if (/api\.php/.test(r.url())) calls++; };
  page.on('request', compte);
  const sheet = () => page.evaluate(() => { const d = document.getElementById('dlg-token'); return { open: d.open, err: (d.querySelector('.field-error') || {}).textContent || '' }; });

  // 1. premier chargement déjà bloqué : la feuille du jeton porte le message, l'app ne bascule pas hors ligne
  await page.route('**/api/api.php', (r) => r.fulfill(BLOCAGE));
  await page.goto(srv.url);
  R.check('chargement bloqué : la feuille du jeton s’ouvre', !!(await L.waitFor(async () => (await sheet()).open, 6000)));
  let s = await sheet();
  R.check('… avec « Trop d’essais. Réessaie dans 10 minutes. »', s.err.trim() === 'Trop d’essais. Réessaie dans 10 minutes.', s.err);
  R.check('… sans l’ancien « jeton refusé » ni écran d’échec de chargement', !/pas été accepté/.test(s.err) && await page.evaluate(() => document.getElementById('load-error').hidden));
  await shot(page, '23-blocage-chargement');
  await page.unroute('**/api/api.php');

  // 2. blocage qui survient en cours de route (relecture) : message, puis plus aucune requête tant que ça dure
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(600);
  R.check('l’app démarre normalement hors blocage', !(await sheet()).open);
  await page.route('**/api/api.php', (r) => r.fulfill(BLOCAGE));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  R.check('relecture bloquée : la feuille s’ouvre avec le message', !!(await L.waitFor(async () => (await sheet()).err.includes('10 minutes'), 4000)), (await sheet()).err);
  const sync = await page.getAttribute('#sync', 'data-sync');
  R.check('l’indicateur n’affiche pas « hors ligne »', sync !== 'offline', sync);
  const avant = calls;
  for (let i = 0; i < 3; i++) { await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(150); }
  R.check('plus aucune requête vers l’API pendant le blocage', calls === avant, `${calls - avant} requête(s) de trop`);
  await shot(page, '23-blocage-relecture');
}, { fresh: false });
