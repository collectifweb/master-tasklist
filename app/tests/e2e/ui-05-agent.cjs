// 5. Une tâche ajoutée directement dans tasks.json (comme le ferait l'agent familial) apparaît en 30 s au plus, sans recharger.
const L = require('./lib.cjs');
L.runScenario('5. tâche ajoutée par l’agent', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  await L.openPanel(page);
  const t = srv.readTasks();
  t.push({ id: 'agent-001', task: 'Appeler le plombier', domain: 'Maison', difficulty: 1, length: 1, priority: 10, status: 'todo', created: new Date().toISOString().slice(0, 10), deadline: null });
  srv.writeTasks(t);
  const t0 = Date.now();
  const seen = await L.waitFor(() => page.locator('#quest-list > li[data-task-id="agent-001"]').count(), 36000, 500);
  const dt = Date.now() - t0;
  R.check('apparaît dans la liste sans recharger', !!seen, dt + ' ms');
  R.check('en 30 s au plus (+1 s de marge de mesure)', dt <= 31000, dt + ' ms');
  const title = (await page.textContent('#fil-quest .fil-title')).trim();
  R.check('devient la quête n° 1 du Fil du jour (priorité 10, courte)', title === 'Appeler le plombier', title);
  await shot(page, '05-agent');
  // modifier la tâche côté fichier : la page suit aussi
  const t2 = srv.readTasks();
  t2.find((x) => x.id === 'agent-001').task = 'Appeler le plombier (rappel)';
  srv.writeTasks(t2);
  const ok = await L.waitFor(async () => (await page.textContent('#fil-quest .fil-title')).includes('(rappel)'), 36000, 500);
  R.check('un changement de titre fait hors de l’app est repris aussi', !!ok);
});
