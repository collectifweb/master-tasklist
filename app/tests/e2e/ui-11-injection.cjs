// 11. Injection : des données hostiles dans tasks.json ne doivent jamais s'exécuter, dans aucune vue.
const L = require('./lib.cjs');
const P1 = '"><img src=x onerror=window.__xss=1>';
const P2 = '</script><script>window.__xss=1</script>';
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const evil = (id, extra) => ({
  id, task: `${P1} ${P2}`, domain: P1 + P2, difficulty: 2, length: 1, priority: 10, status: 'todo', created: day(-2),
  notes: `${P1}${P2}`, steps: [{ id: 's1', label: `${P1}${P2}`, done: false }, { id: 's2', label: P2, done: false }],
  recurrence: { every: P1, interval: P2 }, ...extra,
});
L.runScenario('11. injection : aucune donnée hostile ne s’exécute', async ({ R, srv, newPage, core }) => {
  srv.writeTasks([evil('x1', { deadline: day(2) }), evil('x2', { priority: 3, recurrence: { every: 'week', interval: P1 } }), evil('x3', { status: 'done', doneAt: new Date().toISOString() })]);
  const { page } = await newPage();
  await page.addInitScript(() => { Object.defineProperty(window, '__xss', { configurable: true, set() { window.__hit = true; }, get() { return undefined; } }); });
  await page.goto(srv.url);
  await L.ready(page);
  const hit = () => page.evaluate(() => !!window.__hit);
  const injected = () => page.evaluate(() => document.querySelectorAll('img[src="x"], #app script, dialog script').length);
  await page.waitForTimeout(500);
  R.check('Fil du jour : rien exécuté, aucune balise injectée', !(await hit()) && (await injected()) === 0);
  R.check('Fil du jour : le titre est affiché en texte', (await page.textContent('#fil-quest .fil-title')).includes('<img'));
  await L.openPanel(page);
  await page.waitForTimeout(300);
  R.check('liste : rien exécuté', !(await hit()) && (await injected()) === 0);
  await page.locator('#quest-list > li:first-child [data-action="open"]').click();
  await page.waitForSelector('#dlg-fiche[open]');
  await page.waitForTimeout(400);
  R.check('fiche : rien exécuté', !(await hit()) && (await injected()) === 0);
  R.check('fiche : la récurrence hostile retombe sur « aucune »', await page.$eval('#fiche-recur', (s) => s.value) === 'none' || (await page.$eval('#fiche-recur', (s) => /^(day|week|month):\d+$/.test(s.value))));
  const why = page.locator('#dlg-fiche [data-action="why"]').first();
  if (await why.count()) { await why.click(); await page.waitForSelector('#dlg-why[open]'); await page.waitForTimeout(400); }
  R.check('« Pourquoi ? » : rien exécuté', !(await hit()) && (await injected()) === 0);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.locator('#fil-quest [data-action="complete"]').click().catch(() => {});
  await page.waitForTimeout(900);
  R.check('annonce de gain : rien exécuté', !(await hit()) && (await injected()) === 0);
  await page.reload(); await L.ready(page); await page.waitForTimeout(400);
  R.check('après rechargement : rien exécuté', !(await hit()) && (await injected()) === 0);

  // ───── lettre du matin : elle nomme la quête du jour, donc le titre hostile
  const now = new Date();
  const g = L.quietState(core, now, { letters: false });
  g.startDay = core.addDays(core.gameDay(now), -3);
  const srv2 = await L.startServer({ tasks: [evil('x1', { deadline: day(2) }), evil('x2', { priority: 3 })], game: g });
  try {
    const { page: p2 } = await newPage();
    await p2.addInitScript(() => { Object.defineProperty(window, '__xss', { configurable: true, set() { window.__hit = true; }, get() { return undefined; } }); });
    await p2.goto(srv2.url);
    await L.ready(p2);
    R.check('lettre : elle s’ouvre', await L.waitFor(() => p2.evaluate(() => document.getElementById('dlg-letter').open), 6000));
    await p2.waitForTimeout(400);
    const paper = await p2.evaluate(() => (document.querySelector('#dlg-letter .letter-paper') || {}).textContent || '');
    R.check('lettre : rien exécuté, aucune balise injectée', !(await p2.evaluate(() => !!window.__hit)) && (await p2.evaluate(() => document.querySelectorAll('img[src="x"], #app script, dialog script').length)) === 0);
    R.check('lettre : le titre hostile est écrit en texte', paper.includes('<img') && paper.includes('</script>'), paper.slice(0, 160));
  } finally {
    srv2.stop();
  }
});
