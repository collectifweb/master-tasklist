// 35. Réglages et formulaire d'ajout ouverts AVANT que la partie soit lue, et refus d'enregistrer dans la feuille.
//   - la lecture de la partie est retenue : le formulaire d'ajout s'ouvre sur 5, 2, 3 (valeurs fixes) ; quand la partie arrive
//     (quête par défaut 8, 2, 3), il prend 8, 2, 3 tant qu'on n'a touché à aucun « + » ou « − » ; s'ils ont été touchés,
//     rien ne bouge sous les doigts ;
//   - les Réglages ouverts dans le même état gardent les trois valeurs fermées, avec la phrase « Disponible une fois la
//     partie chargée » ; une fois la partie lue, ils s'ouvrent sur 8, 2, 3 et les boutons marchent ;
//   - stockage plein : l'enregistrement de la quête par défaut est refusé DANS la feuille (zone d'alerte de la feuille), la
//     feuille reste ouverte et le prénom n'est pas enregistré. Données fictives seulement.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'r1', task: 'Ranger le cabanon', domain: 'Terrain', difficulty: 3, length: 2, priority: 6, status: 'todo', created: day(-2) },
  { id: 'r2', task: 'Trier le courrier', domain: 'Administratif', difficulty: 2, length: 2, priority: 5, status: 'todo', created: day(-1) },
];
const steppers = (page, dlg) => page.evaluate((d) => [...document.querySelectorAll(`${d} .stepper-row output`)].map((o) => o.textContent.trim()).join(), dlg);
const isOpen = (page, id) => page.evaluate((id) => { const d = document.getElementById(id); return d.open && !d.classList.contains('is-closing'); }, id);
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500); };
const clic = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

/** Page dont la lecture de la partie (GET) attend `liberer()` ; les écritures passent. */
async function pageRetenue(newPage, srv, opts) {
  const { page } = await newPage({}, opts);
  let lacher;
  const barriere = new Promise((r) => { lacher = r; });
  await page.route('**/api/api.php*', async (route) => {
    if (route.request().method() === 'GET') await barriere;
    await route.continue();
  });
  await page.goto(srv.url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.panel-head [data-action="add"]', { state: 'attached' });
  return { page, liberer: () => lacher() };
}

L.runScenario('35. Réglages et ajout ouverts avant la lecture de la partie', async ({ R, srv, newPage, tag }) => {
  const compact = tag < 1000;
  const opts = { hasTouch: true, isMobile: compact };

  // ───── formulaire d'ajout ouvert avant la lecture, valeurs non touchées
  const a = await pageRetenue(newPage, srv, opts);
  await clic(a.page, '.panel-head [data-action="add"]');
  await a.page.waitForSelector('#dlg-add[open] #add-form');
  R.check('ajout avant la lecture : 5, 2, 3', await steppers(a.page, '#dlg-add') === '5,2,3', await steppers(a.page, '#dlg-add'));
  a.liberer();
  R.check('la partie arrive : l’ajout prend la quête par défaut 8, 2, 3', await L.waitFor(async () => (await steppers(a.page, '#dlg-add')) === '8,2,3', 8000), await steppers(a.page, '#dlg-add'));
  R.check('le résumé replié suit (priorité 8)', /8/.test(await a.page.textContent('#dlg-add .disclosure-summary')), await a.page.textContent('#dlg-add .disclosure-summary'));
  await a.page.close();

  // ───── formulaire d'ajout dont un pas à pas a été touché avant la lecture : rien ne bouge ensuite
  const b = await pageRetenue(newPage, srv, opts);
  await clic(b.page, '.panel-head [data-action="add"]');
  await b.page.waitForSelector('#dlg-add[open] #add-form');
  await b.page.evaluate(() => { document.querySelector('#dlg-add details').open = true; });
  await clic(b.page, '#dlg-add .stepper-row[data-kind="length"] [data-step="1"]');
  R.check('un « + » touché avant la lecture : durée 3', await steppers(b.page, '#dlg-add') === '5,3,3', await steppers(b.page, '#dlg-add'));
  b.liberer();
  await L.ready(b.page);
  await b.page.waitForTimeout(800);
  R.check('la partie arrive : les valeurs touchées ne sont pas remplacées', await steppers(b.page, '#dlg-add') === '5,3,3', await steppers(b.page, '#dlg-add'));
  await b.page.close();

  // ───── Réglages ouverts avant la lecture : fermés ; après la lecture : 8, 2, 3
  const c = await pageRetenue(newPage, srv, opts);
  // les textes arrivent par leur propre lecture : le joueur touche « Réglages » quand le bouton porte son nom
  await c.page.waitForFunction(() => document.querySelector('[data-action="open-settings"] [data-t]').textContent.trim() !== '');
  await clic(c.page, '[data-action="open-settings"]');
  await c.page.waitForSelector('#dlg-settings[open]');
  await settle(c.page);
  const ferme = await c.page.evaluate(() => [...document.querySelectorAll('#dlg-settings .stepper button')].map((x) => x.disabled));
  R.check('Réglages avant la lecture : les six boutons des pas à pas sont désactivés', ferme.length === 6 && ferme.every(Boolean), JSON.stringify(ferme));
  R.check('Réglages avant la lecture : la phrase « Disponible une fois la partie chargée »', /Disponible une fois la partie chargée\./.test(await c.page.textContent('#set-quete-hint')), await c.page.textContent('#set-quete-hint'));
  c.liberer();
  await L.ready(c.page);
  await c.page.evaluate(() => document.querySelector('#dlg-settings [data-close]').click());
  await L.waitFor(async () => !(await isOpen(c.page, 'dlg-settings')), 3000);
  await clic(c.page, '[data-action="open-settings"]');
  await c.page.waitForSelector('#dlg-settings[open]');
  await settle(c.page);
  R.check('Réglages après la lecture : 8, 2, 3, boutons actifs', await steppers(c.page, '#dlg-settings') === '8,2,3'
    && await c.page.evaluate(() => [...document.querySelectorAll('#dlg-settings .stepper button')].some((x) => !x.disabled)), await steppers(c.page, '#dlg-settings'));
  R.check('Réglages après la lecture : plus de phrase d’attente', !/Disponible une fois/.test(await c.page.textContent('#set-quete-hint')));

  // ───── stockage plein : le refus s'écrit dans la feuille, qui reste ouverte, sans prénom enregistré
  await c.page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === 'oree.queue.v2') throw new Error('plein'); return set.call(this, k, v); };
  });
  await c.page.fill('#set-prenom', 'Prénom fictif');
  await clic(c.page, '#dlg-settings .stepper-row[data-kind="length"] [data-step="1"]');
  await clic(c.page, '#dlg-settings [type="submit"]');
  await c.page.waitForTimeout(500);
  const err = await c.page.evaluate(() => { const e = document.getElementById('set-err'); return { hidden: e.hidden, texte: e.textContent.trim(), role: e.getAttribute('role'), dansFeuille: !!e.closest('#dlg-settings') }; });
  R.check('refus : le message est écrit dans la feuille des Réglages (zone d’alerte), en français', !err.hidden && err.role === 'alert' && err.dansFeuille && /stockage de cet appareil est plein/.test(err.texte), JSON.stringify(err));
  R.check('refus : la feuille reste ouverte', await isOpen(c.page, 'dlg-settings'));
  R.check('refus : le prénom n’est pas enregistré', await c.page.evaluate(() => !localStorage.getItem('oree.prenom.v1')), await c.page.evaluate(() => localStorage.getItem('oree.prenom.v1')));
  await c.page.close();
}, { tasks: TASKS, game: (core) => ({ ...L.quietState(core), reglages: { queteDefaut: { priority: 8, length: 2, difficulty: 3 } } }) });
