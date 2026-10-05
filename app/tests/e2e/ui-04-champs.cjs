// 4. Modifier la priorité ne modifie AUCUN autre champ de tasks.json ; un champ inconnu survit à toutes les actions.
const L = require('./lib.cjs');
const base = require('node:fs').readFileSync(require('node:path').join(L.REPO, 'tasks.example.json'), 'utf8');
const TASKS = JSON.parse(base).map((t, i) => (i === 0
  ? { ...t, champ_inconnu: { a: 1, liste: [1, 2] }, notes: 'à garder', deadline: '2026-12-24' }
  : i === 1 ? { ...t, autre_inconnu: 'x', steps: [{ id: 's1', label: 'Première', done: false }], stepSeq: 1 } : t));

L.runScenario('4. champs préservés', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  await L.openPanel(page);
  const before = srv.readTasks();
  const idOf = (list, id) => list.find((t) => t.id === id);

  // 4a. modifier la priorité d'une quête ancienne (example-003)
  await page.locator('#quest-list > li[data-task-id="example-003"] [data-action="open"]').click();
  await page.waitForSelector('#dlg-fiche[open]');
  const p0 = Number(await page.textContent('#fiche-steppers .stepper-row[data-kind="priority"] output'));
  await page.click('#fiche-steppers .stepper-row[data-kind="priority"] [data-step="-1"]');
  await shot(page, '04-fiche');
  await page.click('#dlg-fiche [data-action="fiche-save"]');
  await L.waitFor(() => idOf(srv.readTasks(), 'example-003').priority !== p0);
  const after = srv.readTasks();
  const b3 = idOf(before, 'example-003'), a3 = idOf(after, 'example-003');
  const diff = Object.keys({ ...a3, ...b3 }).filter((k) => JSON.stringify(a3[k]) !== JSON.stringify(b3[k]));
  R.check('priorité modifiée', a3.priority === p0 - 1, `${b3.priority} → ${a3.priority}`);
  // règle du cœur : une quête de plus de 24 h voit P/L/D figées au premier changement (champ `frozen`, anti-triche de la récompense)
  R.check('seuls priority, updatedAt (et frozen, règle du cœur) ont changé', diff.every((k) => ['priority', 'updatedAt', 'frozen'].includes(k)), diff.join(','));
  R.check('toutes les autres quêtes sont identiques, champ pour champ', JSON.stringify(after.filter((t) => t.id !== 'example-003')) === JSON.stringify(before.filter((t) => t.id !== 'example-003')));

  // 4b. quête neuve : seule la priorité et updatedAt bougent
  await page.click('.panel-head [data-action="add"]');
  await page.fill('#add-title', 'Quête neuve pour test');
  await page.click('#dlg-add [data-action="add-submit"]');
  await L.waitFor(() => srv.readTasks().some((t) => t.task === 'Quête neuve pour test'));
  const mid = srv.readTasks();
  const neuve = mid.find((t) => t.task === 'Quête neuve pour test');
  await page.locator(`#quest-list > li[data-task-id="${neuve.id}"] [data-action="open"]`).click();
  await page.waitForSelector('#dlg-fiche[open]');
  await page.click('#fiche-steppers .stepper-row[data-kind="priority"] [data-step="1"]');
  await page.click('#dlg-fiche [data-action="fiche-save"]');
  await L.waitFor(() => srv.readTasks().find((t) => t.id === neuve.id).priority === 6);
  const n2 = srv.readTasks().find((t) => t.id === neuve.id);
  const d2 = Object.keys({ ...n2, ...neuve }).filter((k) => JSON.stringify(n2[k]) !== JSON.stringify(neuve[k]));
  R.check('quête neuve : seuls priority et updatedAt ont changé', d2.every((k) => ['priority', 'updatedAt'].includes(k)) && d2.includes('priority'), d2.join(','));

  // 4c. champ inconnu ajouté à la main pendant que l'app est ouverte, puis action sur cette quête
  const hand = srv.readTasks();
  hand.find((t) => t.id === 'example-001').ajout_manuel = { ok: true };
  srv.writeTasks(hand);
  await page.locator('#quest-list > li[data-task-id="example-001"] [data-action="complete"]').click();
  await L.waitFor(() => srv.readTasks().find((t) => t.id === 'example-001').status === 'done');
  R.check('un champ ajouté à la main pendant la session survit à « Fait »', JSON.stringify(srv.readTasks().find((t) => t.id === 'example-001').ajout_manuel) === '{"ok":true}');

  // 4d. toutes les actions sur les quêtes qui portent des champs inconnus
  const unknownOK = () => {
    const l = srv.readTasks();
    const a = idOf(l, 'example-001'), b = idOf(l, 'example-002');
    return JSON.stringify(a.champ_inconnu) === '{"a":1,"liste":[1,2]}' && a.notes === 'à garder' && a.deadline === '2026-12-24'
      && b.autre_inconnu === 'x' && Array.isArray(b.steps);
  };
  R.check('champs inconnus intacts après « Fait »', unknownOK());
  // example-002 : démarrer, cocher l'étape, ajouter une étape, archiver, désarchiver, modifier
  await page.locator('#quest-list > li[data-task-id="example-002"] [data-action="open"]').click();
  await page.waitForSelector('#dlg-fiche[open]');
  await page.check('#fiche-steps li.step input');
  await page.fill('#fiche-step-new', 'Deuxième');
  await page.press('#fiche-step-new', 'Enter');
  await page.fill('#fiche-notes', 'note ajoutée');
  await page.click('#dlg-fiche [data-action="fiche-save"]');
  await L.waitFor(() => (idOf(srv.readTasks(), 'example-002').notes || '') === 'note ajoutée');
  R.check('champs inconnus intacts après étapes et notes', unknownOK());
  await page.locator('#quest-list > li[data-task-id="example-002"] [data-action="open"]').click();
  await page.waitForSelector('#dlg-fiche[open]');
  await page.click('#dlg-fiche [data-action="archive"]');
  await L.waitFor(() => idOf(srv.readTasks(), 'example-002').status === 'archived');
  R.check('champs inconnus intacts après archivage', unknownOK());
  await page.locator('label.seg-option', { hasText: 'Archivées' }).click();
  await page.locator('#quest-list > li[data-task-id="example-002"] [data-action="unarchive"]').click();
  await L.waitFor(() => idOf(srv.readTasks(), 'example-002').status === 'todo');
  R.check('champs inconnus intacts après désarchivage', unknownOK());
  const fin = idOf(srv.readTasks(), 'example-002');
  R.check('les étapes sont écrites avec leurs champs', Array.isArray(fin.steps) && fin.steps.length === 2 && fin.steps[0].done === true && !!fin.steps[0].doneAt && fin.steps[1].label === 'Deuxième', JSON.stringify(fin.steps));
}, { tasks: TASKS });
