// 7. Deux onglets : une action dans chacun, aucune perte, aucun gain en double.
const L = require('./lib.cjs');
L.runScenario('7. deux onglets', async ({ R, srv, browser, size, newPage, shot }) => {
  const a = (await newPage()).page;
  // 2e onglet : même contexte (stockage partagé), c'est-à-dire un vrai second onglet du même navigateur
  const b = await a.context().newPage();
  b.errors = [];
  b.on('pageerror', (e) => b.errors.push('pageerror: ' + e.message));
  // 409 : conflit de révision, réponse normale du protocole (l'onglet rejoue sur l'état frais) ; voir lib.cjs
  b.on('console', (m) => { if (m.type() === 'error' && !/world\//.test(m.location().url || '') && !/status of 409/.test(m.text())) b.errors.push('console: ' + m.text()); });
  await a.goto(srv.url); await L.ready(a);
  await b.goto(srv.url); await L.ready(b);
  await L.openPanel(a); await L.openPanel(b);
  const idA = 'example-005', idB = 'example-004';
  await a.locator(`#quest-list > li[data-task-id="${idA}"] [data-action="complete"]`).click();
  await b.locator(`#quest-list > li[data-task-id="${idB}"] [data-action="complete"]`).click();
  await a.waitForTimeout(2500);
  const led = srv.ledger();
  R.check('les deux gains sont au registre, une fois chacun', led.filter((e) => e.key === `reward:${idA}:1`).length === 1 && led.filter((e) => e.key === `reward:${idB}:1`).length === 1, JSON.stringify(led.map((e) => e.key)));
  const tasks = srv.readTasks();
  R.check('les deux quêtes sont terminées dans tasks.json (aucune perte)', tasks.find((t) => t.id === idA).status === 'done' && tasks.find((t) => t.id === idB).status === 'done');
  const g = srv.game();
  const sum = 10 + led.filter((e) => e.type === 'reward' || e.type === 'bonus').reduce((s, e) => s + (e.energy || 0), 0); // 10 = Énergie de départ
  R.check('l’état du jeu est cohérent avec le registre (Énergie)', Math.abs(g.resources.energy - Math.round(sum * 10) / 10) < 0.11, `${g.resources.energy} vs ${sum}`);
  await a.waitForTimeout(1200);
  const stateA = await a.evaluate(() => document.querySelectorAll('#quest-list > li').length);
  const stateB = await b.evaluate(() => document.querySelectorAll('#quest-list > li').length);
  R.check('les deux onglets finissent avec la même liste', stateA === stateB && stateA === 8, `${stateA} / ${stateB}`);
  R.check('Énergie identique dans les deux onglets', (await L.resValue(a, 'energie')) === (await L.resValue(b, 'energie')) && (await L.resValue(a, 'energie')) === g.resources.energy, `${await L.resValue(a, 'energie')} / ${await L.resValue(b, 'energie')} / ${g.resources.energy}`);

  // même quête, au même instant, dans les deux onglets du même navigateur
  const id = 'example-002';
  const click = (pg) => pg.evaluate((q) => document.querySelector(`#quest-list > li[data-task-id="${q}"] [data-action="complete"]`)?.click(), id);
  await Promise.all([click(a), click(b)]);
  await a.waitForTimeout(3000);
  const led2 = srv.ledger();
  R.check('même quête dans deux onglets : un seul gain', led2.filter((e) => e.key === `reward:${id}:1`).length === 1, String(led2.filter((e) => e.key === `reward:${id}:1`).length));
  R.check('même quête : une seule entrée par clé dans tout le registre', new Set(led2.map((e) => e.key)).size === led2.length);
  const g2 = srv.game();
  const sum2 = 10 + led2.filter((e) => e.type === 'reward' || e.type === 'bonus' || e.type === 'step').reduce((s, e) => s + (e.energy || 0), 0);
  R.check('état du jeu toujours cohérent (aucun gain en double)', Math.abs(g2.resources.energy - Math.round(sum2 * 10) / 10) < 0.11, `${g2.resources.energy} vs ${sum2}`);

  // deux appareils (stockage séparé) : le 2e agit sur une vue périmée (la quête est déjà terminée côté serveur)
  const dev1 = (await newPage()).page;
  const dev2 = (await newPage()).page;
  await dev1.goto(srv.url); await L.ready(dev1);
  await dev2.goto(srv.url); await L.ready(dev2);
  await L.openPanel(dev1); await L.openPanel(dev2);
  const id3 = 'example-003';
  await dev1.locator(`#quest-list > li[data-task-id="${id3}"] [data-action="complete"]`).click();
  await L.waitFor(() => srv.ledger().some((e) => e.key === `reward:${id3}:1`));
  await dev2.waitForTimeout(500);
  R.check('appareil 2 : sa vue est encore périmée (quête à faire)', await dev2.locator(`#quest-list > li[data-task-id="${id3}"][data-state="todo"]`).count() === 1);
  await dev2.locator(`#quest-list > li[data-task-id="${id3}"] [data-action="complete"]`).click();
  await dev2.waitForTimeout(2500);
  R.check('appareil périmé : toujours un seul gain pour la quête', srv.ledger().filter((e) => e.key === `reward:${id3}:1`).length === 1);
  R.check('appareil périmé : il se recale sur l’état du serveur (quête terminée, plus dans « À faire »)', await dev2.locator(`#quest-list > li[data-task-id="${id3}"]`).count() === 0);
  R.check('appareil périmé : un message explique ce qui s’est passé', await dev2.isVisible('#notice'), await dev2.textContent('#notice'));
  R.check('appareil périmé : file d’attente vide', await dev2.evaluate(() => JSON.parse(localStorage.getItem('oree.queue.v1') || '[]').length) === 0);
  const gx = srv.game();
  const ledx = srv.ledger();
  const sumx = 10 + ledx.filter((e) => e.type === 'reward' || e.type === 'bonus' || e.type === 'step').reduce((s, e) => s + (e.energy || 0), 0);
  R.check('état du jeu toujours cohérent après le conflit', Math.abs(gx.resources.energy - Math.round(sumx * 10) / 10) < 0.11, `${gx.resources.energy} vs ${sumx}`);
  // une quête différente sur l'appareil périmé : conflit de jeu résolu par recalcul, rien de perdu
  await dev1.locator(`#quest-list > li[data-task-id="example-006"] [data-action="complete"]`).click();
  await L.waitFor(() => srv.ledger().some((e) => e.key === 'reward:example-006:1'));
  await dev2.locator(`#quest-list > li[data-task-id="example-007"] [data-action="complete"]`).click();
  await dev2.waitForTimeout(2500);
  const led4 = srv.ledger();
  R.check('conflit de jeu : les deux gains sont là, une fois chacun', led4.filter((e) => e.key === 'reward:example-006:1').length === 1 && led4.filter((e) => e.key === 'reward:example-007:1').length === 1);
  const gy = srv.game();
  const sumy = 10 + led4.filter((e) => e.type === 'reward' || e.type === 'bonus' || e.type === 'step').reduce((s, e) => s + (e.energy || 0), 0);
  R.check('conflit de jeu : état cohérent avec le registre', Math.abs(gy.resources.energy - Math.round(sumy * 10) / 10) < 0.11, `${gy.resources.energy} vs ${sumy}`);
  await shot(a, '07-onglet-a');
  R.check('aucune erreur console dans le 2e onglet', b.errors.length === 0, b.errors.join(' | '));
});
