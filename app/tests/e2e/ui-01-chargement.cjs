// 1. Premier chargement : Fil du jour visible et lisible, quête n° 1 conforme à topCards.
const L = require('./lib.cjs');
L.runScenario('1. premier chargement', async ({ R, srv, newPage, core, size, shot }) => {
  const { page } = await newPage();
  const t0 = Date.now();
  await page.goto(srv.url);
  await page.waitForSelector('#fil-quest:not([hidden])');
  const elapsed = Date.now() - t0;
  const tasks = core.normalizeTasks(srv.readTasks(), new Date());
  const cards = core.topCards(tasks, new Date());
  const title = (await page.textContent('#fil-quest .fil-title')).trim();
  R.check('la quête n° 1 est celle de topCards', title === cards.first.task, `${title} / ${cards.first.task}`);
  const coteShown = (await page.textContent('#fil-quest .cote-value')).trim();
  R.check('la Cote affichée est celle du cœur', coteShown === String(core.cote(cards.first, new Date())), coteShown);
  R.check('Fil du jour lisible rapidement (< 2 s)', elapsed < 2000, elapsed + ' ms');
  // mesure sur une page posée : police chargée, panneau arrivé (sous charge, une police de repli ou une transition décale « Fait »)
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.querySelector('.panel').getAnimations().map((a) => a.finished.catch(() => {})));
  });
  for (const sel of ['#fil-quest .fil-title', '#fil-quest .meta', '#fil-quest .fil-reason', '#fil-quest [data-action="complete"]']) {
    const r = await L.rect(page, sel);
    const vh = size[1];
    R.check(`visible dans l'écran : ${sel}`, r && r.w > 0 && r.h > 0 && r.y >= 0 && r.b <= vh + 0.5, JSON.stringify(r));
  }
  const reason = (await page.textContent('#fil-quest .fil-reason > span')).trim();
  R.check('raison courte présente', reason.length > 3, reason);
  R.check('le bouton « Fait » porte le texte Fait', /Fait/.test(await page.textContent('#fil-quest [data-action="complete"]')));
  // la liste a déjà des quêtes : le pas « Ajouter ta première vraie tâche » se coche à l'ouverture (+2 Énergie, depuis le
  // 7 octobre 2026 un pas se coche même avant son tour) ; le compteur défile encore un instant : on attend sa valeur finale
  await L.waitFor(async () => (await L.resValue(page, 'energie')) === 13, 3000);
  const vals = await Promise.all(['energie', 'materiaux', 'nourriture', 'habitants'].map((n) => L.resValue(page, n)));
  R.check('ressources affichées (Énergie 13 = 10 + bonus d’ouverture + coup de pouce du pas « tâche », 20 Matériaux, 5 Nourriture, 0 Habitant)', vals[0] === 13 && vals[1] === 20 && vals[2] === 5 && vals[3] === 0, JSON.stringify(vals));
  // l'écran est mis à jour avant la fin de l'écriture : on attend qu'elle arrive au registre
  await L.waitFor(() => srv.ledger().some((e) => e.bonus === 'ouverture'), 3000);
  const led = srv.ledger();
  R.check('bonus d’ouverture au registre, une seule fois', led.filter((e) => e.bonus === 'ouverture').length === 1, JSON.stringify(led.map((e) => e.key)));
  await shot(page, '01-fil');
  // rechargement : aucun nouveau bonus
  await page.reload();
  await page.waitForSelector('#fil-quest:not([hidden])');
  await page.waitForTimeout(500);
  R.check('rechargement : pas de second bonus d’ouverture', srv.ledger().filter((e) => e.bonus === 'ouverture').length === 1);
  // le panneau ouvert montre les alternatives et la liste
  await L.openPanel(page);
  const rows = await page.locator('#quest-list > li').count();
  R.check('la liste montre les 10 quêtes à faire', rows === 10, String(rows));
  const alts = await page.locator('#alts > li:not([hidden])').count();
  R.check('deux alternatives repliées (Victoire rapide, Grand chantier si elles existent)', alts === [cards.quick, cards.big].filter(Boolean).length, String(alts));
  await shot(page, '01-liste');
});
