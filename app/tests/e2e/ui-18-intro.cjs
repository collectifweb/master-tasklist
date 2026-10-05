// 18. Intro du premier lancement : lignes passables, « Passer l'intro », « Plus tard » laisse tout utilisable,
// « Commencer » mène à « Fait », plus jamais d'intro ensuite. Mercredi fixe : pas de bilan du dimanche.
const L = require('./lib.cjs');
const WEDNESDAY = new Date('2026-10-07T14:00:00Z'); // 10 h à Montréal

const scene = (page) => page.evaluate(() => {
  const d = document.querySelector('#dlg-scene');
  return {
    open: d.open,
    title: (d.querySelector('#scene-t') || {}).textContent?.trim() || '',
    count: (d.querySelector('.scene-count') || {}).textContent?.trim() || '',
    text: (d.querySelector('.scene-text') || {}).textContent?.trim() || '',
    buttons: [...d.querySelectorAll('.sheet-foot button:not([hidden])')].map((b) => b.dataset.action),
    inscription: !!d.querySelector('.scene-line--inscription'),
    focus: document.activeElement && d.contains(document.activeElement) ? document.activeElement.dataset.action || document.activeElement.id : null,
  };
});

L.runScenario('18. intro du premier lancement', async ({ R, srv, newPage, size, shot }) => {
  // ───── « Passer l'intro », puis « Plus tard »
  const { page } = await newPage();
  await page.clock.install({ time: WEDNESDAY });
  await page.goto(srv.url);
  await L.ready(page);
  R.check('l’intro s’ouvre au premier lancement', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-scene').open), 6000));
  let s = await scene(page);
  R.check('intro : titre, compteur 1 sur 8, première ligne', s.title === 'L’Orée' && /^1 sur 8$/.test(s.count.replace(/\s/g, ' ')) && s.text.length > 20, JSON.stringify(s));
  R.check('intro : « Continuer » a le focus, « Passer l’intro » est là', s.focus === 'scene-next' && s.buttons.includes('scene-skip'), JSON.stringify(s));
  await shot(page, '18-intro');
  await page.click('#dlg-scene [data-action="scene-next"]');
  await page.click('#dlg-scene [data-action="scene-next"]');
  s = await scene(page);
  R.check('« Continuer » avance ligne par ligne (3 sur 8)', /^3 sur 8$/.test(s.count.replace(/\s/g, ' ')), s.count);
  await page.click('#dlg-scene [data-action="scene-skip"]');
  s = await scene(page);
  R.check('« Passer l’intro » mène à la dernière ligne : « Plus tard » et « Commencer »', /^8 sur 8$/.test(s.count.replace(/\s/g, ' ')) && s.buttons.join() === 'scene-later,scene-start', JSON.stringify(s));
  await shot(page, '18-intro-fin');
  await page.click('#dlg-scene [data-action="scene-later"]');
  R.check('« Plus tard » referme l’intro', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-scene').open), 2000));
  await page.waitForTimeout(800);
  R.check('après « Plus tard » : aucune autre feuille ouverte (pas de lettre le premier jour)', await page.evaluate(() => !document.querySelector('dialog[open]')));
  R.check('l’intro est notée comme vue dans l’état du jeu', await L.waitFor(() => (srv.game()?.story?.seen || []).includes('introduction'), 5000));
  const e0 = await L.resValue(page, 'energie');
  await page.click('#fil-quest [data-action="complete"]');
  R.check('tout reste utilisable : « Fait » donne ses gains', await L.waitFor(async () => (await L.resValue(page, 'energie')) > e0, 4000));
  await L.closeWelcome(page, 1500); // l'ouverture du chapitre 1 suit la première quête
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(1500);
  R.check('rechargement : plus d’intro', await page.evaluate(() => !document.getElementById('dlg-scene').open || !/L’Orée/.test(document.getElementById('scene-t').textContent)));

  // ───── tout lire, puis « Commencer »
  const srv2 = await L.startServer();
  try {
    const { page: p2 } = await newPage();
    await p2.clock.install({ time: WEDNESDAY });
    await p2.goto(srv2.url);
    await L.ready(p2);
    await L.waitFor(() => p2.evaluate(() => document.getElementById('dlg-scene').open), 6000);
    const texts = [];
    let engraved = '';
    for (let i = 0; i < 12; i++) {
      const x = await scene(p2);
      texts.push(x.text);
      if (x.inscription) { engraved = x.text; await shot(p2, '18-inscription'); }
      if (x.buttons.includes('scene-start')) break;
      await p2.click('#dlg-scene [data-action="scene-next"]');
    }
    R.check('les 8 lignes défilent', texts.length === 8, String(texts.length));
    R.check('sans prénom : « T’es le septième intendant. » (aucune accolade)', texts.some((x) => x.startsWith('T’es le septième intendant.')) && !texts.some((x) => /[{}]/.test(x)), texts[5]);
    R.check('l’inscription du Relais a son propre style', engraved.startsWith('Ce que tu accomplis'), engraved);
    await p2.click('#dlg-scene [data-action="scene-start"]');
    R.check('« Commencer » referme l’intro et met le focus sur « Fait »', await L.waitFor(() => p2.evaluate(() => !document.getElementById('dlg-scene').open && document.activeElement && document.activeElement.matches('#fil-quest [data-action="complete"]')), 2000));
  } finally {
    srv2.stop();
  }
}, { fresh: true });
