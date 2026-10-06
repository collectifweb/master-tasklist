// 32. Double toucher sur un geste qui dépense : rien n'est dépensé par le second toucher.
//   - deux touchers sur « Construire » (colonne de la carte) : le second tombe dans le catalogue qui vient de s'ouvrir,
//     rien n'est bâti ;
//   - deux touchers sur une ligne de la section « Quartiers » : la fiche s'ouvre, aucun niveau n'est acheté ;
//   - deux touchers sur « Accueillir une famille » : une seule famille ;
//   - au clavier, rien ne change : Entrée bâtit aussitôt après l'ouverture du catalogue. Données fictives seulement.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'd1', task: 'Ranger le cabanon', domain: 'Terrain', difficulty: 3, length: 2, priority: 6, status: 'todo', created: day(-2) },
  { id: 'd2', task: 'Trier le courrier', domain: 'Administratif', difficulty: 2, length: 2, priority: 5, status: 'todo', created: day(-1) },
];
const center = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const isOpen = (page, id) => page.evaluate((id) => { const d = document.getElementById(id); return d.open && !d.classList.contains('is-closing'); }, id);
async function closeAll(page) {
  for (let i = 0; i < 3 && await page.evaluate(() => !!document.querySelector('dialog.sheet[open]')); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(450);
  }
}
async function doubleTap(page, [x, y], ms = 120) {
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(ms);
  await page.touchscreen.tap(x, y);
}
const spentSince = (g0, g) => JSON.stringify({ b: g.batiments, n: g.niveaux, h: g.habitants, p: g.permis.dispo, r: g.resources })
  === JSON.stringify({ b: g0.batiments, n: g0.niveaux, h: g0.habitants, p: g0.permis.dispo, r: g0.resources });

L.runScenario('32. Double toucher : un geste qui dépense ne se fait qu’une fois', async ({ R, srv, newPage, tag }) => {
  const compact = tag < 1000;
  const { page, context } = await newPage({}, { hasTouch: true, isMobile: compact });
  await context.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(page);
  await page.waitForTimeout(600);

  // ───── « Construire » touché deux fois
  let g0 = srv.game();
  await doubleTap(page, await center(page, '[data-ow="build"]'));
  await page.waitForTimeout(1200);
  R.check('double toucher sur « Construire » : rien n’est bâti ni payé', spentSince(g0, srv.game()), JSON.stringify({ avant: g0.batiments, apres: srv.game().batiments, r: srv.game().resources }));
  await closeAll(page);

  // ───── une ligne de quartier du catalogue touchée deux fois
  await page.touchscreen.tap(...await center(page, '[data-ow="build"]'));
  await L.waitFor(() => isOpen(page, 'dlg-construire'), 2000);
  await page.waitForTimeout(800);
  const dispo = await page.evaluate(() => [...document.querySelectorAll('#dlg-construire .cat-qrt')].map((li) => {
    const e = li.querySelector('.cat-etat');
    return { q: li.dataset.quartier, data: li.dataset.etat || '', etat: e.hidden ? '' : e.textContent.trim(), check: !!e.querySelector('use[href$="#i-check"]') };
  }));
  const peut = dispo;
  R.check('section Quartiers : « Disponible » avec la coche quand le niveau suivant s’achète (comme les bâtiments)', peut.length === 6 && peut.every((r) => r.data === 'libre' && r.check && r.etat === 'Disponible'), JSON.stringify(dispo));
  const q = compact ? 'place' : 'ecole';
  await page.evaluate((q) => document.querySelector(`#dlg-construire .cat-qrt-go[data-quartier="${q}"]`).scrollIntoView({ block: 'center' }), q);
  await page.waitForTimeout(400);
  g0 = srv.game();
  await doubleTap(page, await center(page, `#dlg-construire .cat-qrt-go[data-quartier="${q}"]`));
  R.check(`double toucher sur la ligne « ${q} » : sa fiche s’ouvre`, await L.waitFor(() => page.evaluate((q) => document.getElementById('dlg-quartier').open && document.getElementById('dlg-quartier').dataset.quartier === q, q), 2000));
  await page.waitForTimeout(1200);
  R.check('… et aucun niveau n’est acheté', spentSince(g0, srv.game()), JSON.stringify({ avant: g0.niveaux, apres: srv.game().niveaux }));
  await closeAll(page);

  // ───── « Accueillir une famille » touché deux fois (fiche du chalet par la carte en liste)
  await L.openPlan(page);
  await L.waitFor(() => isOpen(page, 'dlg-plan'), 2000);
  await page.waitForTimeout(450);
  await page.click('#dlg-plan [data-bat="chalet-1"]');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-batiment').open && document.getElementById('dlg-batiment').dataset.batId === 'chalet-1'), 2000);
  await page.waitForTimeout(800);
  const label = await page.evaluate(() => document.querySelector('#dlg-batiment [data-action="bat-geste"]').textContent.trim());
  R.check('fiche du chalet : « Accueillir une famille » possible', label === 'Accueillir une famille', label);
  g0 = srv.game();
  await doubleTap(page, await center(page, '#dlg-batiment [data-action="bat-geste"]'));
  R.check('une famille accueillie', await L.waitFor(() => srv.game()?.habitants === g0.habitants + 1, 5000), String(srv.game()?.habitants));
  await page.waitForTimeout(1200);
  const g1 = srv.game();
  R.check('double toucher sur « Accueillir une famille » : une seule famille, payée une fois', g1.habitants === g0.habitants + 1 && g1.resources.food === g0.resources.food - 18, JSON.stringify({ h: [g0.habitants, g1.habitants], food: [g0.resources.food, g1.resources.food] }));
  await closeAll(page);

  // ───── clavier : Entrée bâtit aussitôt le catalogue ouvert (aucune attente imposée)
  if (compact) await page.evaluate(() => { if (document.getElementById('app').dataset.panel === 'open') document.querySelector('.panel-toggle').click(); });
  await page.waitForTimeout(450);
  g0 = srv.game();
  await page.focus('[data-ow="build"]');
  await page.keyboard.press('Enter');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-construire').open), 2000);
  const id = await page.getAttribute('#dlg-construire .cat-row[data-type="chalet"] .cat-go', 'data-id');
  await page.focus('#dlg-construire .cat-row[data-type="chalet"] .cat-go');
  await page.keyboard.press('Enter');
  R.check(`clavier : Entrée tout de suite après l’ouverture bâtit (${id})`, await L.waitFor(() => (srv.game()?.batiments || []).some((b) => b.id === id), 5000), JSON.stringify(srv.game()?.batiments));
  await closeAll(page);
}, {
  tasks: TASKS,
  game: (core) => {
    const g = L.quietState(core);
    const today = core.gameDay(new Date());
    for (const id of core.PAS_IDS) g.premiersPas[id] = today;
    g.permis = { ...g.permis, dispo: 3 };
    g.resources = { energy: 2000, materials: 2000, food: 40 };
    g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }];
    return g;
  },
});
