// 28. « Jour suivant », outil de la version d'essai : absent par défaut ; présent quand le serveur est en bac à sable ;
// un toucher avance d'un jour la date affichée et le jeu passe au nouveau jour comme pour un vrai (lettre du matin,
// ouverture du jour) ; franchir la fin de semaine fige le bilan, que l'historique du bilan montre. Titres fictifs.
const L = require('./lib.cjs');

// prochain samedi (au moins demain), 10 h à Montréal
function nextSaturday() {
  const d = new Date();
  d.setUTCHours(14, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const SATURDAY = nextSaturday();
const ymd = (n) => new Date(SATURDAY.getTime() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'j1', task: 'Passer le balai dans l’entrée', domain: 'Maison', difficulty: 2, length: 2, priority: 8, status: 'todo', created: ymd(-3) },
  { id: 'j2', task: 'Ramasser les branches', domain: 'Terrain', difficulty: 3, length: 4, priority: 6, status: 'todo', created: ymd(-5) },
  { id: 'j3', task: 'Vérifier le niveau d’huile', domain: 'Véhicule', difficulty: 2, length: 2, priority: 5, status: 'todo', created: ymd(-2) },
];
const BTN = '[data-action="jour-suivant"]';
// date du panneau attendue n jours après le samedi (même format que l'app)
const expected = (page, n) => page.evaluate(([iso, n]) => new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Montreal' })
  .format(new Date(new Date(iso).getTime() + n * 86400000)), [SATURDAY.toISOString(), n]);
const reviewOpen = (page) => page.evaluate(() => { const d = document.getElementById('dlg-review'); return d.open && !d.classList.contains('is-closing'); });

L.runScenario('28. jour suivant', async ({ R, srv, newPage, shot, core }) => {
  // ───── sans le réglage : ni `sandbox` dans la réponse, ni bouton
  const plain = await L.startServer({ tasks: TASKS, game: L.quietState(core, SATURDAY) });
  try {
    R.check('sans réglage : la réponse de l’API ne porte pas « sandbox »', !('sandbox' in await (await fetch(plain.api)).json()));
    const { page: p0 } = await newPage();
    await p0.clock.install({ time: SATURDAY });
    await p0.goto(plain.url);
    await L.ready(p0);
    await L.openPanel(p0);
    R.check('sans réglage : aucun bouton « Jour suivant »', !(await p0.locator(BTN).isVisible()) && !(await p0.locator('#essai').isVisible()));
    await p0.close();
  } finally {
    plain.stop();
  }

  // ───── version d'essai
  R.check('bac à sable : la réponse de l’API porte « sandbox: true »', (await (await fetch(srv.api)).json()).sandbox === true);
  const { page } = await newPage();
  await page.clock.install({ time: SATURDAY });
  await page.goto(srv.url);
  await L.ready(page);
  await L.openPanel(page);
  const btn = page.locator(BTN);
  await btn.scrollIntoViewIfNeeded();
  R.check('bac à sable : « Jour suivant » visible, marqué « Version d’essai »', await btn.isVisible() && /Version d’essai/.test(await page.locator('#essai').textContent()));
  const box = await btn.boundingBox();
  R.check('« Jour suivant » : cible de 44 px au moins', box && box.height >= 44 && box.width >= 44, JSON.stringify(box));
  await shot(page, '28-essai');

  // une quête le samedi ; l'historique est encore vide
  await page.click('#fil-quest [data-action="complete"]');
  R.check('samedi : la quête est payée au registre', await L.waitFor(() => srv.ledger().some((e) => e.type === 'reward' && e.day === ymd(0)), 5000));
  await page.click('[data-action="open-review"]');
  R.check('le bilan s’ouvre', await L.waitFor(() => reviewOpen(page), 3000));
  R.check('historique vide : la phrase qui l’explique', /Semaines passées/.test(await page.textContent('#dlg-review')) && /Chaque semaine finie/.test(await page.textContent('#dlg-review')));
  await page.click('#dlg-review .sheet-foot [data-close]');
  await page.waitForTimeout(500);

  // ───── samedi → dimanche
  R.check('date affichée : samedi', (await page.textContent('#panel-date')) === await expected(page, 0), await page.textContent('#panel-date'));
  await btn.click();
  const sunday = await expected(page, 1);
  R.check('un toucher : la date affichée avance d’un jour', await L.waitFor(async () => (await page.textContent('#panel-date')) === sunday, 4000), `${await page.textContent('#panel-date')} ≠ ${sunday}`);
  R.check('le décalage est enregistré dans la partie (1 jour)', await L.waitFor(() => srv.game()?.horloge?.decalage === 1, 5000), JSON.stringify(srv.game()?.horloge));
  R.check('nouveau jour : ouverture du jour au registre', await L.waitFor(() => srv.ledger().some((e) => e.key === `bonus:ouverture:${ymd(1)}`), 5000));
  const closed = await L.closeWelcome(page, 3500);
  R.check('nouveau jour : la lettre du matin s’ouvre, comme un vrai matin', closed.includes('dlg-letter'), closed.join());
  R.check('« Version d’essai » dit le décalage', /1 jour/.test(await page.textContent('#essai')), await page.textContent('#essai'));

  // ───── dimanche → lundi : la semaine est finie
  await L.openPanel(page);
  await btn.click();
  const monday = await expected(page, 2);
  R.check('deuxième toucher : lundi', await L.waitFor(async () => (await page.textContent('#panel-date')) === monday, 4000), `${await page.textContent('#panel-date')} ≠ ${monday}`);
  const start = core.weekStart(ymd(0));
  R.check('fin de semaine franchie : le bilan est figé dans la partie', await L.waitFor(() => (srv.game()?.bilans || []).some((b) => b.semaine.start === start && b.quetes === 1), 5000), JSON.stringify((srv.game()?.bilans || []).map((b) => [b.semaine.start, b.quetes])));
  await L.closeWelcome(page, 3500);
  await L.openPanel(page);
  await page.click('[data-action="open-review"]');
  R.check('le bilan se rouvre', await L.waitFor(() => reviewOpen(page), 3000));
  const rows = await page.evaluate(() => [...document.querySelectorAll('#dlg-review .review-weeks .why-line')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  const debut = await page.evaluate((d) => new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short', timeZone: 'America/Montreal' }).format(new Date(d + 'T12:00:00Z')), start);
  R.check('historique : la semaine figée, ses dates, 1 quête, 1 jour travaillé', rows.length === 1 && rows[0].includes(debut) && /1 quête\b/.test(rows[0]) && /1 jour travaillé sur 7/.test(rows[0]), rows.join(' | '));
  R.check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await shot(page, '28-historique');
}, {
  tasks: TASKS,
  sandbox: true,
  game: (core) => L.quietState(core, SATURDAY),
});
