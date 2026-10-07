// 3. « Fait » → ressources en hausse, annonce visible qui ne couvre aucun bouton, entrée au registre ;
//    Remballer → retour en arrière ; « Fait » de nouveau → aucun gain.
const L = require('./lib.cjs');
L.runScenario('3. Fait, Remballer, Fait de nouveau', async ({ R, srv, newPage, shot, size, core }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  const compact = size[0] < 700;
  const snap = async () => ({ e: await L.resValue(page, 'energie'), m: await L.resValue(page, 'materiaux'), f: await L.resValue(page, 'nourriture'), h: await L.resValue(page, 'habitants') });
  const quartiers = () => ({ ...(srv.game()?.quartiers || {}) });
  // l'ouverture paie son bonus et, la liste ayant déjà des quêtes, le pas « Ajouter ta première vraie tâche » : on attend
  // qu'ils soient au registre et que le compteur ait fini de défiler avant la photo de départ
  await L.waitFor(() => srv.ledger().some((e) => e.bonus === 'ouverture') && srv.ledger().some((e) => e.key === 'pas:tache'), 5000);
  const e0 = 10 + srv.ledger().reduce((s, e) => s + (e.energy || 0), 0); // 10 = Énergie de départ
  await L.waitFor(async () => (await L.resValue(page, 'energie')) === e0, 3000);
  const s0 = await snap();
  const title = (await page.textContent('#fil-quest .fil-title')).trim();
  const id = await page.getAttribute('#fil-quest', 'data-task-id');
  const q = core.quartierOfTask(srv.readTasks().find((t) => t.id === id));
  const q0 = quartiers();
  await page.click('#fil-quest [data-action="complete"]');
  await page.waitForTimeout(700);
  const s1 = await snap();
  R.check('Énergie en hausse', s1.e > s0.e, `${s0.e} → ${s1.e}`);
  R.check('Matériaux en hausse', s1.m > s0.m, `${s0.m} → ${s1.m}`);
  R.check('Nourriture et Habitants inchangés (ils viennent des récoltes et des logements)', s1.f === s0.f && s1.h === s0.h, JSON.stringify({ s0, s1 }));
  await L.waitFor(() => (quartiers()[q] || 0) === (q0[q] || 0) + 1, 3000);
  R.check(`le quartier de la quête (${q}) compte une tâche de plus`, (quartiers()[q] || 0) === (q0[q] || 0) + 1, JSON.stringify({ q0, q1: quartiers() }));
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
  // la première quête payée a coché le pas « Terminer une vraie tâche » : son coup de pouce reste au Remballer (un pas
  // atteint n'est jamais repris ; depuis le 7 octobre 2026, il se coche même avant le chalet)
  const pasTerminer = srv.ledger().filter((e) => e.key === 'pas:terminer');
  R.check('le pas « terminer » est payé une seule fois', pasTerminer.length === 1, JSON.stringify(pasTerminer));
  const mPas = pasTerminer[0]?.materials ?? 0;
  R.check('Remballer : Énergie, Nourriture et Habitants reviennent ; les Matériaux aussi, sauf le coup de pouce du pas « terminer »', s2.e === s0.e && s2.m === s0.m + mPas && s2.f === s0.f && s2.h === s0.h, JSON.stringify({ s0, s2, mPas }));
  R.check('Remballer : le quartier revient à son compte', (quartiers()[q] || 0) === (q0[q] || 0), JSON.stringify({ q0, q2: quartiers() }));
  R.check('Remballer : une écriture reverse au registre', srv.ledger().filter((e) => e.key === `reverse:${id}:1`).length === 1);
  R.check('Remballer : tasks.json revient à « todo »', srv.readTasks().find((t) => t.id === id).status === 'todo');
  await shot(page, '03-remballe');

  // Fait de nouveau : aucun gain
  await page.locator('label.seg-option', { hasText: 'À faire' }).click();
  await page.locator(`#quest-list > li[data-task-id="${id}"] [data-action="complete"]`).click();
  await page.waitForTimeout(800);
  const s3 = await snap();
  R.check('« Fait » de nouveau : aucun gain', s3.e === s2.e && s3.m === s2.m && s3.f === s2.f && s3.h === s2.h, JSON.stringify({ s2, s3 }));
  R.check('« Fait » de nouveau : le quartier ne compte pas la tâche deux fois', (quartiers()[q] || 0) === (q0[q] || 0), JSON.stringify({ q0, q3: quartiers() }));
  R.check('« Fait » de nouveau : toujours une seule entrée reward', srv.ledger().filter((e) => e.key === `reward:${id}:1`).length === 1);
  R.check('« Fait » de nouveau : le message dit « aucun nouveau gain »', /aucun nouveau gain/i.test(await page.textContent('#announce')) || /Aucun nouveau gain/.test(await page.textContent('#live')), (await page.textContent('#announce')) + ' / ' + (await page.textContent('#live')));
  R.check('« Fait » de nouveau : tasks.json à nouveau « done »', srv.readTasks().find((t) => t.id === id).status === 'done');
  await shot(page, '03-refait');
});
