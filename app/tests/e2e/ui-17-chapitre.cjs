// 17. Chapitre 1 jusqu'à l'ouverture du chapitre 2 : carte de chapitre (objectifs, coût réel, Confiance), récolte et
// Tour depuis la carte, tous les objectifs atteints dès le jour 1 mais le chapitre 2 attend le jour 3, puis la scène
// de fin et d'ouverture.
const L = require('./lib.cjs');

const card = (page) => page.evaluate(() => {
  const c = document.getElementById('carnet-card');
  return {
    open: !c.hidden,
    title: (c.querySelector('#carnet-card-t') || {}).textContent?.trim() || '',
    meta: (c.querySelector('.carnet-meta') || {}).textContent?.replace(/\s+/g, ' ').trim() || '',
    done: c.querySelectorAll('.carnet-obj.is-done').length,
    total: c.querySelectorAll('.carnet-obj').length,
    now: (c.querySelector('.carnet-obj.is-now') || {}).textContent?.replace(/\s+/g, ' ').trim() || '',
    status: (c.querySelector('.carnet-status') || {}).textContent?.replace(/\s+/g, ' ').trim() || '',
  };
});
const openCard = async (page) => {
  if (!(await card(page)).open) await page.click('#carnet [data-card="chapitre"]');
  await page.waitForTimeout(250);
  return card(page);
};
const closeCard = async (page) => { if ((await card(page)).open) await page.click('#carnet [data-card="chapitre"]'); await page.waitForTimeout(200); };
const tap = async (page, id) => {
  await page.locator(`.ow-ent.is-btn[data-id="${id}"]`).dispatchEvent('click');
  await page.waitForSelector('#dlg-act[open]', { timeout: 3000 });
  await page.waitForTimeout(250);
};
const idle = (page) => L.waitFor(() => page.evaluate(() => document.querySelector('.ow-skip').hidden), 8000);
// Formes SVG du monde peintes en noir (remplissage non résolu : zone de toucher d'un objet hors .is-btn, par exemple)
const blackShapes = (page) => page.evaluate(() => {
  const out = [];
  for (const n of document.querySelectorAll('.ow svg *')) {
    if (!(n instanceof SVGGeometryElement) || n.closest('[hidden]')) continue;
    const cs = getComputedStyle(n);
    if (cs.fill !== 'rgb(0, 0, 0)' || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = n.getBoundingClientRect();
    if (Math.min(r.width, r.height) < 4) continue; // un trait seul (manche d'outil) n'a pas de surface à remplir
    out.push(`${n.getAttribute('class') || n.tagName} de ${n.closest('[data-id]')?.dataset.id || '?'} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  return out;
});
const worldTag = (page) => page.evaluate(() => { const g = document.querySelector('.ow-tag'); return g.hidden ? '' : g.textContent; });

L.runScenario('17. chapitre 1 → chapitre 2 (pas avant le jour 3)', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.clock.install({ time: new Date() });
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('.ow-ent.is-btn[data-id="parcelle-1"]', { timeout: 8000 });
  await page.waitForTimeout(500);

  // ───── carte du chapitre
  const pill = await page.getAttribute('#carnet [data-card="chapitre"]', 'aria-label');
  R.check('pastille : « Chapitre 1 : 2 objectifs atteints sur 5 »', /Chapitre 1.*2 objectifs atteints sur 5/.test(pill), pill);
  let c = await openCard(page);
  R.check('carte : « Chapitre 1 · Le premier sillon »', c.title === 'Chapitre 1 · Le premier sillon', c.title);
  R.check('carte : jour du chapitre et durée minimale, Confiance 2 sur 3', /Jour 1/.test(c.meta) && /au moins 3 jours/.test(c.meta) && /Confiance 2 sur 3/.test(c.meta), c.meta);
  R.check('carte : 5 objectifs, 2 atteints, « Maintenant » sur la récolte', c.total === 5 && c.done === 2 && /Récolter la courge/.test(c.now) && /Maintenant/.test(c.now), JSON.stringify(c));
  R.check('la pastille dit qu’elle est dépliée', await page.getAttribute('#carnet [data-card="chapitre"]', 'aria-expanded') === 'true');
  await shot(page, '17-chapitre');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  R.check('Échap replie la carte', !(await card(page)).open);

  // ───── toucher la parcelle, fermer sa feuille, la retoucher : la feuille se rouvre dès le 2e toucher
  await tap(page, 'parcelle-1');
  await page.keyboard.press('Escape');
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-act').open), 2000);
  R.check('feuille fermée : plus d’étiquette de sélection sur la carte', (await worldTag(page)) === '', await worldTag(page));
  await page.locator('.ow-ent.is-btn[data-id="parcelle-1"]').dispatchEvent('click');
  R.check('retoucher la même parcelle rouvre sa feuille', !!(await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-act').open), 2000)));
  await page.waitForTimeout(250);
  if (!(await page.evaluate(() => document.getElementById('dlg-act').open))) await tap(page, 'parcelle-1');

  // ───── récolter depuis la feuille, puis réparer la Tour (toucher la Tour)
  await page.click('#dlg-act [data-act="harvest"]');
  R.check('récolte depuis la feuille de la parcelle', await L.waitFor(() => srv.game()?.garden.harvested.courge === 1, 5000));
  await idle(page);
  c = await openCard(page);
  R.check('l’objectif suivant montre son coût réel : « 20 Matériaux et 6 Énergie »', /Réparer la Tour/.test(c.now) && /20 Matériaux et 6 Énergie/.test(c.now) && !/[{}]/.test(c.now), c.now);
  await closeCard(page);
  await tap(page, 'tour');
  R.check('toucher la Tour ouvre sa feuille (« Tour de veille »)', /Tour de veille/.test(await page.textContent('#act-t')), await page.textContent('#act-t'));
  await page.click('#dlg-act [data-act="build"]');
  R.check('la Tour est réparée', await L.waitFor(() => (srv.game()?.placements || []).some((p) => p.id === 'tour'), 5000));
  await idle(page);
  const tourLabel = await page.getAttribute('.ow-ent[data-id="tour"]', 'aria-label');
  R.check('après la réparation : ni l’étiquette ni le nom de la Tour ne disent « à réparer »', !/à réparer/.test(await worldTag(page)) && /^Tour de veille,/.test(tourLabel || '') && !/à réparer/.test(tourLabel || ''), `${await worldTag(page)} | ${tourLabel}`);

  // ───── une quête : Confiance 3, tous les objectifs atteints… mais jour 1
  await page.click('#fil-quest [data-action="complete"]');
  R.check('Confiance 3 après la lisière du jour', await L.waitFor(() => srv.game()?.resources.confidence === 3, 5000), String(srv.game()?.resources.confidence));
  await idle(page);
  await L.closeWelcome(page, 1200);
  c = await openCard(page);
  R.check('jour 1 : 5 objectifs sur 5', c.done === 5, JSON.stringify(c));
  R.check('jour 1 : le chapitre 2 attend, et la carte dit pourquoi', srv.game().chapter.number === 1 && /Tous les objectifs sont atteints/.test(c.status) && /jour 3/.test(c.status) && /dans 2 jours/.test(c.status), c.status);
  await shot(page, '17-attente');
  await closeCard(page);

  // ───── jour 2 : toujours le chapitre 1
  await page.clock.fastForward(24 * 3600 * 1000);
  await L.closeWelcome(page, 2500);
  c = await openCard(page);
  R.check('jour 2 : toujours le chapitre 1 (« dans 1 jour »)', srv.game().chapter.number === 1 && /dans 1 jour\b/.test(c.status), c.status);
  await closeCard(page);

  // ───── jour 3 : scène de fin, puis ouverture du chapitre 2
  await page.clock.fastForward(24 * 3600 * 1000);
  R.check('jour 3 : une scène s’ouvre', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-scene').open), 5000));
  const titles = [];
  let black = null;
  for (let i = 0; i < 30 && await page.evaluate(() => { const d = document.getElementById('dlg-scene'); return d.open && !d.classList.contains('is-closing'); }); i++) {
    const tt = (await page.textContent('#scene-t')).trim();
    if (titles[titles.length - 1] !== tt) titles.push(tt);
    if (titles.length === 2 && i < 30) { await shot(page, '17-ouverture'); black ??= await blackShapes(page); }
    await page.click('#dlg-scene [data-action="scene-next"]');
    await page.waitForTimeout(80);
  }
  R.check('scènes : « Chapitre 1 terminé » puis « Chapitre 2 · Le rouge des érables »', titles[0] === 'Chapitre 1 terminé' && titles[1] === 'Chapitre 2 · Le rouge des érables', titles.join(' → '));
  const g = srv.game();
  R.check('état : chapitre 2, Confiance 5 (+2), l’Atelier ouvert', g.chapter.number === 2 && g.resources.confidence === 5 && g.sectors.atelier.open, JSON.stringify({ ch: g.chapter, conf: g.resources.confidence }));
  R.check('moments notés comme vus', await L.waitFor(() => ['premier-sillon.fin', 'rouge-des-erables.ouverture'].every((id) => srv.game().story.seen.includes(id)), 4000));
  await L.closeWelcome(page, 1500);
  const pill2 = await page.getAttribute('#carnet [data-card="chapitre"]', 'aria-label');
  R.check('la pastille passe au chapitre 2', /Chapitre 2/.test(pill2), pill2);
  await idle(page);
  const blackEnd = await blackShapes(page);
  R.check('ouverture du chapitre 2 : aucune forme noire dans le monde (pendant la scène et après)', black !== null && !black.length && !blackEnd.length, JSON.stringify({ scene: black, apres: blackEnd }));
  R.check('les objets de l’Atelier ouvert sont touchables (boutons)', await page.evaluate(() => ['atelier', 'etabli'].every((id) => document.querySelector(`.ow-ent[data-id="${id}"]`)?.matches('button.is-btn'))));
}, {
  game: (core) => {
    const now = new Date();
    const today = core.gameDay(now);
    const g = L.quietState(core, now);
    g.story.seen = g.story.seen.filter((id) => id !== 'premier-sillon.fin' && id !== 'rouge-des-erables.ouverture');
    g.startDay = core.addDays(today, -2);
    g.chapter = { number: 1, startDay: today, objectives: {} };
    g.resources = { energy: 30, materials: 40, confidence: 2 };
    g.lisiereDays = [core.addDays(today, -2), core.addDays(today, -1)];
    g.garden.sown.courge = 1;
    g.plots = [{ id: 'parcelle-1', slot: 0, crop: 'courge', stage: 2 }];
    return g;
  },
});
