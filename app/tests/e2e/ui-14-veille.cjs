// 14. Fin de visite « Tout est enregistré, à demain » : plus de bouton, la visite se termine d'elle-même quand il ne
//     reste plus rien ; le titre ne dit « Tout est enregistré » que si c'est vrai.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'v1', task: 'Changer une ampoule', domain: 'Maison', difficulty: 3, length: 2, priority: 10, status: 'todo', created: day(-1) },
  { id: 'v2', task: 'Ratisser les feuilles', domain: 'Terrain', difficulty: 3, length: 3, priority: 4, status: 'todo', created: day(-3) },
];
L.runScenario('14. Tout est enregistré, à demain : fin de visite', async ({ R, srv, newPage, size }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  await L.openPanel(page);
  R.check('plus de bouton « Finir la visite »', await page.locator('[data-action="end-visit"]').count() === 0);
  await page.locator('#quest-list > li[data-task-id="v1"] [data-action="complete"]').click();
  await page.waitForTimeout(1500);
  R.check('une quête reste ouverte : la visite continue', !(await page.evaluate(() => document.getElementById('dlg-veille').open)));

  // plus aucune quête ouverte : la visite se termine d'elle-même
  await page.locator('#quest-list > li[data-task-id="v2"] [data-action="complete"]').click();
  R.check('la dernière quête faite termine la visite d’elle-même', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-veille').open), 8000));
  await page.waitForTimeout(600);
  const title = (await page.textContent('#veille-t')).trim();
  const online = await page.evaluate(() => !document.querySelector('#sync:not([hidden])[data-sync="offline"], #sync:not([hidden])[data-sync="error"]'));
  R.check('le titre est « Tout est enregistré, à demain » (serveur joignable)', title === 'Tout est enregistré, à demain', title);
  R.check('« Tout est enregistré » n’apparaît que si c’est vrai', !/Tout est enregistré/.test(title) || online);
  const txt = await page.textContent('#dlg-veille');
  R.check('sans quête, elle le dit sans reproche', /Rien ne presse/.test(txt));
  R.check('et ne promet pas une prochaine quête qui n’existe pas', !/prochaine quête t’attend/.test(txt));
  R.check('une réplique de Fanal accompagne (venue de repliques.json)', await page.locator('#dlg-veille .veille-reply').count() === 1);
  await page.screenshot({ path: `${L.SHOTS}/14-veille-${size[0]}.png` });
  await page.click('#dlg-veille footer [data-close]');
  R.check('fermée, elle laisse le monde allumer ses lanternes', await L.waitFor(() => page.evaluate(() => document.querySelector('.ow').dataset.veille === '1'), 8000));
  await page.screenshot({ path: `${L.SHOTS}/14-lanternes-${size[0]}.png` });
  R.check('le Fil du jour affiche son état vide', await L.waitFor(() => page.evaluate(() => !document.getElementById('fil-empty').hidden), 3000));
}, { tasks: TASKS });
