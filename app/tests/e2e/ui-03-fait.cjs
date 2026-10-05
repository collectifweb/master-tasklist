// 3. « Fait » → ressources en hausse, annonce visible qui ne couvre aucun bouton, entrée au registre ;
//    Remballer → retour en arrière ; « Fait » de nouveau → aucun gain.
const L = require('./lib.cjs');
L.runScenario('3. Fait, Remballer, Fait de nouveau', async ({ R, srv, newPage, shot, size }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  const compact = size[0] < 700;
  const snap = async () => ({ e: await L.resValue(page, 'energie'), m: await L.resValue(page, 'materiaux'), c: await L.resValue(page, 'confiance'), l: await L.resValue(page, 'lueur') });
  const s0 = await snap();
  const title = (await page.textContent('#fil-quest .fil-title')).trim();
  const id = await page.getAttribute('#fil-quest', 'data-task-id');
  await page.click('#fil-quest [data-action="complete"]');
  await page.waitForTimeout(700);
  const s1 = await snap();
  R.check('Énergie en hausse', s1.e > s0.e, `${s0.e} → ${s1.e}`);
  R.check('Matériaux en hausse', s1.m > s0.m, `${s0.m} → ${s1.m}`);
  R.check('Lueur en hausse', s1.l > s0.l, `${s0.l} → ${s1.l}`);
  R.check('Confiance +1 (la lisière s’allume)', s1.c === s0.c + 1, `${s0.c} → ${s1.c}`);
  // annonce
  const ann = await L.rect(page, '#announce');
  R.check('l’annonce est visible', ann && ann.w > 0 && (await page.evaluate(() => getComputedStyle(document.getElementById('announce')).opacity)) > 0);
  const hits = await page.evaluate(() => {
    const a = document.getElementById('announce').getBoundingClientRect();
    const out = [];
    for (const b of document.querySelectorAll('button, a[href], input, select, summary, textarea')) {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const st = getComputedStyle(b);
      if (st.visibility === 'hidden' || st.display === 'none') continue;
      if (b.closest('[hidden], .panel-rest') && getComputedStyle(b.closest('.panel-rest') || b).visibility === 'hidden') continue;
      const ov = !(r.right <= a.left || r.left >= a.right || r.bottom <= a.top || r.top >= a.bottom);
      if (ov) out.push((b.getAttribute('aria-label') || b.textContent || b.tagName).trim().slice(0, 30));
    }
    return out;
  });
  R.check('l’annonce ne couvre aucun bouton', hits.length === 0, hits.join(' | '));
  const live = (await page.textContent('#live')).trim();
  R.check('la région aria-live annonce la quête terminée et les gains', /Quête terminée/.test(live) && /Gains/.test(live), live);
  R.check('l’annonce visuelle est cachée aux lecteurs d’écran (aria-hidden)', await page.getAttribute('.announce-lane', 'aria-hidden') === 'true');
  await shot(page, '03-fait');
  const led = srv.ledger();
  R.check('une entrée reward au registre', led.filter((e) => e.key === `reward:${id}:1`).length === 1, JSON.stringify(led.map((e) => e.key)));
  const t1 = srv.readTasks().find((t) => t.id === id);
  R.check('tasks.json : status done et doneAt', t1.status === 'done' && !!t1.doneAt, JSON.stringify(t1));
  R.check('la quête n° 1 est maintenant une autre', (await page.textContent('#fil-quest .fil-title')).trim() !== title);
  R.check('une réplique de personnage est affichée', await page.isVisible('#speech') && (await page.textContent('#speech')).length > 5, await page.textContent('#speech'));

  // Remballer : onglet Faites
  await L.openPanel(page);
  await page.locator('label.seg-option', { hasText: 'Faites' }).click();
  const row = page.locator(`#quest-list > li[data-task-id="${id}"]`);
  R.check('la quête est dans l’onglet Faites avec Remballer', await row.locator('[data-action="remballer"]').count() === 1);
  await row.locator('[data-action="remballer"]').click();
  await page.waitForSelector('#dlg-confirm[open]');
  await shot(page, '03-confirm');
  // « Laisser faite » : rien ne change
  await page.click('#dlg-confirm [data-answer="no"]');
  await page.waitForSelector('#dlg-confirm:not([open])', { state: 'attached' });
  R.check('« Laisser faite » ne change rien', srv.ledger().filter((e) => e.type === 'reverse').length === 0);
  await row.locator('[data-action="remballer"]').click();
  await page.waitForSelector('#dlg-confirm[open]');
  await page.click('#dlg-confirm [data-answer="yes"]');
  await page.waitForTimeout(800);
  const s2 = await snap();
  R.check('Remballer : Énergie, Matériaux, Lueur et Confiance reviennent', s2.e === s0.e && s2.m === s0.m && s2.l === s0.l && s2.c === s0.c, JSON.stringify({ s0, s2 }));
  R.check('Remballer : une écriture reverse au registre', srv.ledger().filter((e) => e.key === `reverse:${id}:1`).length === 1);
  R.check('Remballer : tasks.json revient à « todo »', srv.readTasks().find((t) => t.id === id).status === 'todo');
  await shot(page, '03-remballe');

  // Fait de nouveau : aucun gain
  await page.locator('label.seg-option', { hasText: 'À faire' }).click();
  await page.locator(`#quest-list > li[data-task-id="${id}"] [data-action="complete"]`).click();
  await page.waitForTimeout(800);
  const s3 = await snap();
  R.check('« Fait » de nouveau : aucun gain', s3.e === s2.e && s3.m === s2.m && s3.l === s2.l && s3.c === s2.c, JSON.stringify({ s2, s3 }));
  R.check('« Fait » de nouveau : toujours une seule entrée reward', srv.ledger().filter((e) => e.key === `reward:${id}:1`).length === 1);
  R.check('« Fait » de nouveau : le message dit « aucun nouveau gain »', /aucun nouveau gain/i.test(await page.textContent('#announce')) || /Aucun nouveau gain/.test(await page.textContent('#live')), (await page.textContent('#announce')) + ' / ' + (await page.textContent('#live')));
  R.check('« Fait » de nouveau : tasks.json à nouveau « done »', srv.readTasks().find((t) => t.id === id).status === 'done');
  await shot(page, '03-refait');
});
