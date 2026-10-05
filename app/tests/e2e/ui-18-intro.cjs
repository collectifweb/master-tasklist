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
  const desc = await page.evaluate(() => { const b = document.querySelector('#dlg-scene [data-action="scene-next"]'); const d = document.getElementById(b.getAttribute('aria-describedby') || '-'); return d ? d.textContent.trim() : ''; });
  R.check('« Continuer » est décrit par la réplique (lue avec le bouton qui garde le focus)', desc === s.text, desc);
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
  R.check('après « Plus tard » : le focus est sur « Fait » du Fil du jour (pas sur la page)', await page.evaluate(() => !!document.activeElement && document.activeElement.matches('#fil-quest [data-action="complete"]')), await page.evaluate(() => document.activeElement?.tagName));
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

  // ───── Échap et toucher le fond pendant l'intro : « Passer » (dernière ligne), jamais la fin
  const srv3 = await L.startServer();
  try {
    const { page: p3 } = await newPage();
    await p3.clock.install({ time: WEDNESDAY });
    await p3.goto(srv3.url);
    await L.ready(p3);
    await L.waitFor(() => p3.evaluate(() => document.getElementById('dlg-scene').open), 6000);
    await p3.waitForTimeout(400);
    const at8 = async () => { const x = await scene(p3); return x.open && /^8 sur 8$/.test(x.count.replace(/\s/g, ' ')) && x.buttons.join() === 'scene-later,scene-start'; };
    await p3.keyboard.press('Escape');
    await p3.waitForTimeout(500);
    R.check('Échap (aucun toucher avant) : l’intro reste ouverte, à sa dernière ligne', await at8(), JSON.stringify(await scene(p3)));
    await p3.keyboard.press('Escape');
    await p3.waitForTimeout(500);
    R.check('Échap une 2e fois : toujours ouverte', await at8(), JSON.stringify(await scene(p3)));
    const r = await p3.evaluate(() => { const b = document.getElementById('dlg-scene').getBoundingClientRect(); return [b.left, b.top, innerWidth, innerHeight]; });
    const [x, y] = r[1] > 40 ? [r[2] / 2, r[1] / 2] : [r[0] / 2, r[3] / 2];
    await p3.mouse.click(x, y);
    await p3.waitForTimeout(600);
    R.check('toucher le fond : l’intro reste ouverte, rien n’est noté comme vu', await at8() && !(srv3.game()?.story?.seen || []).includes('introduction'), JSON.stringify(await scene(p3)));
  } finally {
    srv3.stop();
  }

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
