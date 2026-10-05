// 20. Jour du recyclage v1 : le dimanche, le bilan de la semaine s'ouvre une fois (heures estimées par domaine,
// quêtes, jours travaillés), les quêtes ouvertes depuis plus de 60 jours se gardent ou s'archivent ; ton informatif.
const L = require('./lib.cjs');

// prochain dimanche (ou aujourd'hui), 10 h à Montréal
function nextSunday() {
  const d = new Date();
  d.setUTCHours(14, 0, 0, 0);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const SUNDAY = nextSunday();
const ymd = (n) => new Date(SUNDAY.getTime() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'r1', task: 'Passer le balai dans l’entrée', domain: 'Maison', difficulty: 2, length: 2, priority: 8, status: 'todo', created: ymd(-3) },
  { id: 'r2', task: 'Ramasser les branches', domain: 'Terrain', difficulty: 3, length: 4, priority: 6, status: 'todo', created: ymd(-5) },
  { id: 'r3', task: 'Vérifier le niveau d’huile', domain: 'Véhicule', difficulty: 2, length: 2, priority: 5, status: 'todo', created: ymd(-2) },
  { id: 'old1', task: 'Trier la boîte de câbles', domain: 'Maison', difficulty: 3, length: 3, priority: 2, status: 'todo', created: ymd(-90) },
  { id: 'old2', task: 'Repeindre le banc du jardin', domain: 'Terrain', difficulty: 5, length: 6, priority: 2, status: 'todo', created: ymd(-75) },
];
const review = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-review');
  return {
    open: d.open && !d.classList.contains('is-closing'),
    text: d.textContent.replace(/\s+/g, ' ').trim(),
    olds: [...d.querySelectorAll('.review-old')].map((li) => li.dataset.quest),
  };
});

L.runScenario('20. jour du recyclage', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.clock.install({ time: SUNDAY });
  await page.goto(srv.url);
  await L.ready(page);
  R.check('dimanche : le bilan de la semaine s’ouvre tout seul', await L.waitFor(async () => (await review(page)).open, 6000));
  let r = await review(page);
  R.check('titre et semaine (du lundi au dimanche)', /Bilan de la semaine/.test(r.text) && /du \d+ \S+ au \d+ \S+/.test(r.text), r.text.slice(0, 120));
  R.check('semaine encore vide : le dire sans reproche', /Aucune quête comptée cette semaine/.test(r.text) && /sans presse/.test(r.text), r.text.slice(0, 200));
  R.check('jours travaillés sur 7', /0 jour travaillé sur 7/.test(r.text), r.text.slice(0, 200));
  R.check('les 2 quêtes ouvertes depuis plus de 60 jours, la plus ancienne d’abord', r.olds.join() === 'old1,old2', r.olds.join());
  R.check('« ouverte depuis 90 jours », « Garder » et « Archiver »', /ouverte depuis 90 jours/.test(r.text) && /Garder/.test(r.text) && /Archiver/.test(r.text));
  R.check('ton informatif : aucune expression bannie', !/tu n’as pas|tu n'as pas|manqué|négligé|en retard/i.test(r.text));
  await shot(page, '20-bilan');

  await page.click('#dlg-review [data-action="review-keep"][data-id="old1"]');
  await page.waitForTimeout(300);
  r = await review(page);
  R.check('« Garder » : la quête quitte le bilan (sans rien changer à tasks.json)', r.olds.join() === 'old2' && srv.readTasks().find((t) => t.id === 'old1').status === 'todo', r.olds.join());
  R.check('le focus passe à la ligne suivante', await page.evaluate(() => document.activeElement && document.activeElement.closest('.review-old')?.dataset.quest === 'old2'));
  await page.click('#dlg-review [data-action="review-archive"][data-id="old2"]');
  R.check('« Archiver » : archivée dans tasks.json', await L.waitFor(() => srv.readTasks().find((t) => t.id === 'old2').status === 'archived', 5000));
  r = await review(page);
  R.check('plus rien à trier dans le bilan', r.olds.length === 0, r.olds.join());
  await page.click('#dlg-review .sheet-foot [data-close]');
  await page.waitForTimeout(500);

  // ───── une quête, puis le bilan rouvert à la main
  await page.click('#fil-quest [data-action="complete"]');
  await L.waitFor(() => srv.ledger().some((e) => e.type === 'reward'), 5000);
  await page.waitForTimeout(800);
  await L.closeWelcome(page, 1200);
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(1500);
  R.check('rechargement : le bilan ne se rouvre pas le même dimanche', !(await review(page)).open);
  await L.openPanel(page);
  await page.click('[data-action="open-review"]');
  R.check('le bouton « Bilan de la semaine » l’ouvre', await L.waitFor(async () => (await review(page)).open, 2000));
  r = await review(page);
  R.check('le bilan compte la quête : « 1 quête », heures, domaine', /Cette semaine.?: 1 quête, environ/.test(r.text) && /≈/.test(r.text), r.text.slice(0, 200));
  R.check('… et le jour travaillé', /1 jour travaillé sur 7/.test(r.text), r.text.slice(0, 200));
  R.check('la quête gardée ne revient pas', !r.olds.includes('old1'), r.olds.join());
  await shot(page, '20-bilan-manuel');
}, {
  tasks: TASKS,
  quietReview: false,
  game: (core) => L.quietState(core, SUNDAY),
});
