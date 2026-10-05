// 2. Ajout en 3 gestes, domaine deviné, quête présente après rechargement et dans tasks.json avec TOUS ses champs.
const L = require('./lib.cjs');
L.runScenario('2. ajout rapide', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  const before = srv.readTasks();
  let gestes = 0;
  // geste 1 : toucher « + »
  await page.click('.panel-head [data-action="add"]'); gestes++;
  await page.waitForSelector('#dlg-add[open] #add-title');
  // geste 2 : écrire le titre
  await page.fill('#add-title', 'Tondre la pelouse du devant'); gestes++;
  const sector = await page.$eval('input[name="add-sector"]:checked', (e) => e.value);
  R.check('le domaine est deviné (pelouse → champs)', sector === 'champs', sector);
  R.check('l’étiquette « Deviné » est visible', await page.isVisible('#add-guess') && /pelouse/i.test(await page.textContent('#add-guess')), await page.textContent('#add-guess'));
  await shot(page, '02-ajout');
  // geste 3 : valider
  await page.click('#dlg-add [data-action="add-submit"]'); gestes++;
  R.check('trois gestes au plus', gestes <= 3, String(gestes));
  await page.waitForSelector('#dlg-add:not([open])', { state: 'attached' });
  await L.waitFor(() => srv.readTasks().length === before.length + 1);
  const after = srv.readTasks();
  const added = after.find((t) => t.task === 'Tondre la pelouse du devant');
  R.check('la quête est dans tasks.json', !!added);
  if (added) {
    const need = ['id', 'task', 'domain', 'difficulty', 'length', 'priority', 'status', 'created', 'createdAt', 'deadline'];
    R.check('tous les champs sont écrits', need.every((k) => k in added), Object.keys(added).join(','));
    R.check('valeurs : domaine Terrain, priorité 5, durée 2, effort 3, à faire', added.domain === 'Terrain' && added.priority === 5 && added.length === 2 && added.difficulty === 3 && added.status === 'todo', JSON.stringify(added));
    R.check('created au format AAAA-MM-JJ', /^\d{4}-\d{2}-\d{2}$/.test(added.created));
  }
  R.check('les autres quêtes sont intactes', JSON.stringify(after.filter((t) => t !== added && t.task !== 'Tondre la pelouse du devant')) === JSON.stringify(before));
  R.check('bonus d’ajout au registre', srv.ledger().some((e) => e.bonus === 'ajout'));
  // présente après rechargement
  await page.reload();
  await L.ready(page);
  await L.openPanel(page);
  R.check('présente après rechargement', await page.locator('#quest-list li', { hasText: 'Tondre la pelouse du devant' }).count() === 1);

  // domaine modifiable : on corrige le secteur à la main
  await page.click('.panel-head [data-action="add"]');
  await page.waitForSelector('#dlg-add[open] #add-title');
  await page.fill('#add-title', 'Tondre la pelouse chez la voisine');
  await page.locator('label.sector-option', { hasText: 'Archives' }).click();
  R.check('l’étiquette « Deviné » disparaît quand on choisit', !(await page.isVisible('#add-guess')));
  await page.fill('#add-title', 'Tondre la pelouse chez la voisine !');
  R.check('le choix manuel n’est pas écrasé par la devinette', await page.$eval('input[name="add-sector"]:checked', (e) => e.value) === 'archives');
  await page.click('#dlg-add [data-action="add-submit"]');
  await L.waitFor(() => srv.readTasks().some((t) => t.task === 'Tondre la pelouse chez la voisine !'));
  const t2 = srv.readTasks().find((t) => t.task === 'Tondre la pelouse chez la voisine !');
  R.check('domaine modifié écrit (Administratif)', t2 && t2.domain === 'Administratif', t2 && t2.domain);

  // titre vide : erreur sous le champ, la feuille reste ouverte
  await page.click('.panel-head [data-action="add"]');
  await page.waitForSelector('#dlg-add[open] #add-title');
  await page.click('#dlg-add [data-action="add-submit"]');
  R.check('titre vide : erreur affichée sous le champ', await page.isVisible('#add-title-err') && await page.getAttribute('#add-title', 'aria-invalid') === 'true');
  R.check('titre vide : la feuille reste ouverte', await page.locator('#dlg-add[open]').count() === 1);
  await shot(page, '02-ajout-erreur');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#dlg-add:not([open])', { state: 'attached' });

  // « Déjà faite »
  await page.click('.panel-head [data-action="add"]');
  await page.waitForSelector('#dlg-add[open] #add-title');
  await page.fill('#add-title', 'Sortir le bac de recyclage');
  await page.check('#dlg-add input[name="already-done"]');
  await page.click('#dlg-add [data-action="add-submit"]');
  await L.waitFor(() => srv.readTasks().some((t) => t.task === 'Sortir le bac de recyclage' && t.status === 'done'));
  const t3 = srv.readTasks().find((t) => t.task === 'Sortir le bac de recyclage');
  R.check('« Déjà faite » : quête terminée, alreadyDone et doneAt écrits', t3 && t3.status === 'done' && t3.alreadyDone === true && !!t3.doneAt, JSON.stringify(t3));
  R.check('« Déjà faite » : gain au registre', srv.ledger().some((e) => e.type === 'reward' && e.alreadyDone));
});
