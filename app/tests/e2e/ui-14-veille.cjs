// 14. Fin de visite « L'Orée veille » : à la main (prochaine quête en grand) et d'elle-même quand il ne reste plus rien.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'v1', task: 'Changer une ampoule', domain: 'Maison', difficulty: 3, length: 2, priority: 10, status: 'todo', created: day(-1) },
  { id: 'v2', task: 'Ratisser les feuilles', domain: 'Terrain', difficulty: 3, length: 3, priority: 4, status: 'todo', created: day(-3) },
];
L.runScenario('14. L’Orée veille : fin de visite', async ({ R, srv, newPage, size }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  await L.openPanel(page);
  await page.click('[data-action="end-visit"]');
  await page.waitForSelector('#dlg-veille[open]');
  await page.waitForTimeout(500);
  const txt = await page.textContent('#dlg-veille');
  R.check('le titre « L’Orée veille » s’affiche', /L’Orée veille/.test(txt));
  R.check('la prochaine quête est en grand', (await page.textContent('#dlg-veille .veille-quest')).trim() === 'Changer une ampoule');
  const fs = await page.$eval('#dlg-veille .veille-quest', (e) => parseFloat(getComputedStyle(e).fontSize));
  R.check('et plus grande que le texte courant', fs >= 24, `${fs}px`);
  R.check('une réplique de personnage accompagne (venue de repliques.json)', await page.locator('#dlg-veille .veille-reply').count() === 1);
  R.check('la phrase « Tout est enregistré » n’apparaît que si c’est vrai', /Tout est enregistré/.test(txt) === (await page.evaluate(() => !document.querySelector('#sync:not([hidden])[data-sync="offline"], #sync:not([hidden])[data-sync="error"]'))));
  await page.screenshot({ path: `${L.SHOTS}/14-veille-${size[0]}.png` });
  await page.click('#dlg-veille footer [data-close]');
  R.check('fermée, elle laisse le monde allumer ses lanternes', await L.waitFor(() => page.evaluate(() => document.querySelector('.ow').dataset.veille === '1'), 8000));
  await page.screenshot({ path: `${L.SHOTS}/14-lanternes-${size[0]}.png` });

  // plus aucune quête ouverte : la visite se termine d'elle-même
  await page.locator('#quest-list > li[data-task-id="v1"] [data-action="complete"]').click();
  await page.waitForTimeout(500);
  await page.locator('#quest-list > li[data-task-id="v2"] [data-action="complete"]').click();
  R.check('la dernière quête faite ouvre « L’Orée veille » toute seule', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-veille').open), 8000));
  R.check('sans quête, elle le dit sans reproche', /Rien ne presse/.test(await page.textContent('#dlg-veille')));
  R.check('et ne promet pas une prochaine quête qui n’existe pas', !/prochaine quête t’attend/.test(await page.textContent('#dlg-veille')));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${L.SHOTS}/14-vide-${size[0]}.png` });
  await page.click('#dlg-veille footer [data-close]');
  R.check('le Fil du jour affiche son état vide', await L.waitFor(() => page.evaluate(() => !document.getElementById('fil-empty').hidden), 3000));
}, { tasks: TASKS });
