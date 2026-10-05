// 6. Hors ligne : action, indicateur hors ligne, retour en ligne, lot envoyé une seule fois.
const L = require('./lib.cjs');
L.runScenario('6. hors ligne', async ({ R, srv, newPage, shot }) => {
  const { context, page } = await newPage();
  const posts = [];
  page.on('request', (r) => { if (r.method() === 'POST' && /api\.php/.test(r.url())) posts.push({ at: Date.now(), body: r.postData() }); });
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForTimeout(600);
  const base = posts.length;
  const id = await page.getAttribute('#fil-quest', 'data-task-id');
  const e0 = await L.resValue(page, 'energie');
  await context.setOffline(true);
  await page.waitForTimeout(200);
  await page.click('#fil-quest [data-action="complete"]');
  await page.waitForTimeout(800);
  R.check('l’indicateur hors ligne s’affiche', await page.isVisible('#sync[data-sync="offline"]'), await page.getAttribute('#sync', 'data-sync'));
  R.check('le texte hors ligne dit combien de changements attendent', /1 changement/.test(await page.textContent('#sync')), await page.textContent('#sync'));
  R.check('l’action est visible tout de suite (ressources en hausse)', (await L.resValue(page, 'energie')) > e0);
  R.check('rien n’est parti vers le serveur', posts.length === base && !srv.ledger().some((e) => e.key === `reward:${id}:1`) && srv.readTasks().find((t) => t.id === id).status === 'todo');
  // la quête, plus la tenue du jeu qui la suit (passage du temps) : seule la quête compte comme changement
  const q = await page.evaluate(() => JSON.parse(localStorage.getItem('oree.queue.v1') || '[]').map((e) => e.name));
  R.check('la file d’attente est gardée dans localStorage (une quête faite)', q.filter((n) => n === 'completeQuest').length === 1 && q.every((n) => ['completeQuest', 'advanceTime'].includes(n)), q.join());
  await shot(page, '06-hors-ligne');
  await context.setOffline(false);
  // serveur injoignable au démarrage (la page est déjà là, l'API non) : l'app se reconstruit depuis la copie locale
  await page.route('**/api/api.php', (r) => r.abort('internetdisconnected'));
  await page.reload();
  const up = await L.waitFor(() => page.locator('#fil-quest:not([hidden])').count(), 6000);
  R.check('API injoignable au démarrage : le Fil du jour se reconstruit depuis la copie locale', !!up);
  R.check('et l’indicateur hors ligne le dit', await L.waitFor(() => page.isVisible('#sync[data-sync="offline"]'), 3000));
  await shot(page, '06-copie-locale');
  await page.unroute('**/api/api.php');
});
