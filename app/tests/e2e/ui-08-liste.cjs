// 8. Étapes, tri, filtres, recherche, archiver/désarchiver, supprimer avec confirmation.
const L = require('./lib.cjs');
L.runScenario('8. étapes, tris, filtres, recherche, archivage, suppression', async ({ R, srv, newPage, core, shot }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  await L.openPanel(page);
  const titles = () => page.$$eval('#quest-list > li .quest-title', (els) => els.map((e) => e.textContent.trim()));
  const now = () => new Date();
  const norm = () => core.normalizeTasks(srv.readTasks(), now());
  const expected = (sort, filters = {}) => core.listQuests(norm(), { sort, filters: { status: 'todo', ...filters } }, now()).map((t) => t.task);

  // ───── 7 tris
  const sorts = await page.$$eval('#sort option', (o) => o.map((x) => x.value));
  R.check('7 tris proposés', sorts.length === 7, sorts.join(','));
  for (const s of sorts) {
    await page.selectOption('#sort', s);
    await page.waitForTimeout(100);
    const got = await titles();
    const exp = expected(s);
    R.check(`tri « ${s} » : ordre conforme au cœur`, JSON.stringify(got) === JSON.stringify(exp), got.slice(0, 3).join('|') + ' / ' + exp.slice(0, 3).join('|'));
  }
  await page.selectOption('#sort', 'cote');

  // ───── filtres
  const chip = (sel) => page.locator(`.chip[${sel}]`);
  await chip('data-filter="quick"').click();
  R.check('filtre « 15 min »', JSON.stringify(await titles()) === JSON.stringify(expected('cote', { quick: true })), (await titles()).join('|'));
  R.check('la puce active est marquée aria-pressed', await chip('data-filter="quick"').getAttribute('aria-pressed') === 'true');
  await chip('data-filter="lowEnergy"').click();
  R.check('filtres cumulés « 15 min » + « Peu d’énergie »', JSON.stringify(await titles()) === JSON.stringify(expected('cote', { quick: true, lowEnergy: true })), (await titles()).join('|'));
  await chip('data-filter="quick"').click(); await chip('data-filter="lowEnergy"').click();
  await chip('data-filter="thisWeek"').click();
  R.check('« Cette semaine » sans échéance : aucun résultat et message', (await titles()).length === 0 && await page.isVisible('#list-empty'), await page.textContent('#list-empty'));
  await shot(page, '08-vide');
  await page.click('#list-empty [data-action="clear-filters"]');
  R.check('« Retirer les filtres » rend toute la liste', (await titles()).length === 10 && await chip('data-filter="thisWeek"').getAttribute('aria-pressed') === 'false');
  await chip('data-sector="champs"').click();
  R.check('filtre de secteur « Champs »', JSON.stringify(await titles()) === JSON.stringify(expected('cote', { sector: 'champs' })), (await titles()).join('|'));
  await chip('data-sector="champs"').click();

  // ───── recherche
  await page.fill('#search', 'fen');
  R.check('recherche « fen »', JSON.stringify(await titles()) === JSON.stringify(['Laver les fenêtres']), (await titles()).join('|'));
  await page.fill('#search', 'FENETRES');
  R.check('recherche insensible aux accents et à la casse', JSON.stringify(await titles()) === JSON.stringify(['Laver les fenêtres']));
  await page.fill('#search', 'zzzz');
  R.check('recherche sans résultat : message', await page.isVisible('#list-empty') && /zzzz/.test(await page.textContent('#list-empty')), await page.textContent('#list-empty'));
  await page.click('.search-clear');
  R.check('effacer la recherche', (await titles()).length === 10 && (await page.inputValue('#search')) === '');

  // ───── étapes (fiche)
  const id = 'example-010';
  await page.locator(`#quest-list > li[data-task-id="${id}"] [data-action="open"]`).click();
  await page.waitForSelector('#dlg-fiche[open]');
  for (const label of ['Seau et raclette', 'Salon', 'Chambres']) {
    await page.fill('#fiche-step-new', label);
    await page.click('#dlg-fiche [data-action="step-add"]');
  }
  await L.waitFor(() => (srv.readTasks().find((t) => t.id === id).steps || []).length === 3);
  R.check('3 étapes ajoutées et écrites', (srv.readTasks().find((t) => t.id === id).steps || []).length === 3);
  const e0 = await L.resValue(page, 'energie');
  await page.locator('#fiche-steps li.step').nth(0).locator('input').check();
  await L.waitFor(() => srv.ledger().some((e) => e.type === 'step'));
  R.check('cocher une étape : gain au registre (type step)', srv.ledger().filter((e) => e.type === 'step').length === 1);
  R.check('cocher une étape : le compteur 1/3 est visible', (await page.textContent('#fiche-steps-count')).trim() === '1/3');
  R.check('cocher une étape : Énergie en hausse', (await L.resValue(page, 'energie')) >= e0);
  await page.locator('#fiche-steps li.step').nth(0).locator('input').uncheck();
  await page.locator('#fiche-steps li.step').nth(0).locator('input').check();
  await page.waitForTimeout(1200);
  R.check('décocher puis recocher : aucun second gain pour la même étape', srv.ledger().filter((e) => e.type === 'step').length === 1, String(srv.ledger().filter((e) => e.type === 'step').length));
  await page.locator('#fiche-steps li.step').nth(1).locator('.step-remove').click();
  await L.waitFor(() => (srv.readTasks().find((t) => t.id === id).steps || []).length === 2);
  R.check('retirer une étape', (srv.readTasks().find((t) => t.id === id).steps || []).length === 2 && (await page.locator('#fiche-steps li.step').count()) === 2);
  await shot(page, '08-fiche-etapes');

  // ───── récurrence
  await page.selectOption('#fiche-recur', 'week:1');
  await page.click('#dlg-fiche [data-action="fiche-save"]');
  await L.waitFor(() => srv.readTasks().find((t) => t.id === id).recurrence);
  const rec = srv.readTasks().find((t) => t.id === id).recurrence;
  R.check('récurrence hebdomadaire écrite', rec && rec.every === 'week' && rec.interval === 1, JSON.stringify(rec));
  R.check('la ligne affiche « chaque semaine »', /chaque semaine/i.test(await page.locator(`#quest-list > li[data-task-id="${id}"] .meta`).textContent()));

  // ───── archiver / désarchiver
  const id2 = 'example-009';
  await page.locator(`#quest-list > li[data-task-id="${id2}"] [data-action="open"]`).click();
  await page.waitForSelector('#dlg-fiche[open]');
  await page.click('#dlg-fiche [data-action="archive"]');
  await L.waitFor(() => srv.readTasks().find((t) => t.id === id2).status === 'archived');
  await page.waitForTimeout(600);
  R.check('archivée : sortie de la liste « À faire »', await page.locator(`#quest-list > li[data-task-id="${id2}"]`).count() === 0);
  await page.locator('label.seg-option', { hasText: 'Archivées' }).click();
  R.check('archivée : présente dans « Archivées »', await page.locator(`#quest-list > li[data-task-id="${id2}"][data-state="archived"]`).count() === 1);
  await shot(page, '08-archivees');
  await page.locator(`#quest-list > li[data-task-id="${id2}"] [data-action="unarchive"]`).click();
  await L.waitFor(() => srv.readTasks().find((t) => t.id === id2).status === 'todo');
  R.check('désarchivée : retour à « todo »', srv.readTasks().find((t) => t.id === id2).status === 'todo');
  await page.locator('label.seg-option', { hasText: 'À faire' }).click();

  // ───── supprimer avec confirmation
  const id3 = 'example-008';
  await page.locator(`#quest-list > li[data-task-id="${id3}"] [data-action="open"]`).click();
  await page.waitForSelector('#dlg-fiche[open]');
  await page.click('#dlg-fiche [data-action="delete"]');
  await page.waitForSelector('#dlg-confirm[open]');
  await shot(page, '08-supprimer');
  await page.click('#dlg-confirm [data-answer="no"]');
  await page.waitForTimeout(600);
  R.check('« Garder » : la quête reste dans tasks.json', srv.readTasks().some((t) => t.id === id3));
  await page.click('#dlg-fiche [data-action="delete"]');
  await page.waitForSelector('#dlg-confirm[open]');
  await page.click('#dlg-confirm [data-answer="yes"]');
  await L.waitFor(() => !srv.readTasks().some((t) => t.id === id3));
  R.check('« Supprimer » : la quête disparaît de tasks.json', !srv.readTasks().some((t) => t.id === id3));
  await page.waitForTimeout(700);
  R.check('« Supprimer » : la quête disparaît de la liste et la fiche se ferme', await page.locator(`#quest-list > li[data-task-id="${id3}"]`).count() === 0 && await page.locator('#dlg-fiche[open]').count() === 0);
});
