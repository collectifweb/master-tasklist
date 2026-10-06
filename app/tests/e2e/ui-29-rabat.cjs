// 29. Rabat des quêtes : pas de « tirer pour rafraîchir » sur la page (valeur calculée sur html et body ; le vrai
//     geste n'existe pas dans Chromium de bureau, il s'essaie sur un téléphone Android).
const L = require('./lib.cjs');

L.runScenario('29. Rabat : anti-rechargement', async ({ R, srv, newPage, tag }) => {
  const { page } = await newPage({}, { hasTouch: true, isMobile: tag < 1000 });
  await page.goto(srv.url);
  await L.ready(page);

  const ob = await page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).overscrollBehaviorY,
    body: getComputedStyle(document.body).overscrollBehaviorY,
  }));
  R.check('html : overscroll-behavior-y vaut contain (pas de tirer pour rafraîchir)', ob.html === 'contain', ob.html);
  R.check('body : overscroll-behavior-y vaut contain', ob.body === 'contain', ob.body);
});
