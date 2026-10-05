// 9 (suite). Navigation au clavier jusqu'à « Fait » ; mouvement réduit respecté ; 40 quêtes dont 10 en retard, sans rouge.
const L = require('./lib.cjs');
const today = new Date().toISOString().slice(0, 10);
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const MANY = Array.from({ length: 40 }, (_, i) => ({
  id: `t${i}`, task: `Quête de test numéro ${i + 1} avec un titre assez long pour passer sur deux lignes dans la liste`,
  domain: ['Maison', 'Terrain', 'Administratif', 'Enfants', 'Véhicule', 'Autre'][i % 6],
  difficulty: 1 + (i % 9), length: 1 + (i % 8), priority: 1 + ((i * 3) % 10), status: 'todo', created: day(-30 - i),
  deadline: i < 10 ? day(-3 - i) : i < 14 ? day(2 + i) : null,
}));

L.runScenario('9 (suite). clavier, mouvement réduit, 40 quêtes dont 10 en retard', async ({ R, srv, newPage, size, shot }) => {
  // ───── clavier
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  let n = 0, onFait = false;
  for (; n < 20 && !onFait; n++) {
    await page.keyboard.press('Tab');
    onFait = await page.evaluate(() => document.activeElement && document.activeElement.matches('#fil-quest [data-action="complete"]'));
  }
  R.check('Tab atteint « Fait » du Fil du jour', onFait, `${n} touches`);
  R.check('le focus est visible (anneau)', await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2; }));
  const e0 = await L.resValue(page, 'energie');
  const title = (await page.textContent('#fil-quest .fil-title')).trim();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  R.check('Entrée sur « Fait » termine la quête', (await L.resValue(page, 'energie')) > e0 && (await page.textContent('#fil-quest .fil-title')).trim() !== title);
  // ouverture du panneau et de l'ajout au clavier
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  const reach = await page.evaluate(() => document.activeElement.getAttribute('data-action') || document.activeElement.className);
  R.check('Maj+Tab remonte vers les boutons de l’en-tête du panneau', /toggle-panel|add|panel-toggle|btn|res-help/.test(reach), reach);
  if (size[0] < 700) {
    await page.focus('.panel-toggle');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    R.check('Entrée sur « Tout voir » ouvre le panneau', await page.getAttribute('#app', 'data-panel') === 'open');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    R.check('Échap referme le panneau et rend le focus à la bascule', await page.getAttribute('#app', 'data-panel') === 'peek' && await page.evaluate(() => document.activeElement.matches('.panel-toggle')));
  }
  await page.focus('.panel-head [data-action="add"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#dlg-add[open]');
  R.check('l’ajout s’ouvre au clavier, focus dans le champ du titre', await page.evaluate(() => document.activeElement.id === 'add-title'));
  await page.keyboard.type('Vider le bac à compost');
  await page.keyboard.press('Enter');
  await L.waitFor(() => srv.readTasks().some((t) => t.task === 'Vider le bac à compost'));
  R.check('Entrée dans le champ valide l’ajout (3 gestes au clavier)', srv.readTasks().some((t) => t.task === 'Vider le bac à compost'));

  // ───── mouvement réduit
  const { page: pr } = await newPage({}, { reducedMotion: 'reduce' });
  await pr.goto(srv.url);
  await L.ready(pr);
  const m = await pr.evaluate(() => { const cs = getComputedStyle(document.documentElement); return [cs.getPropertyValue('--motion').trim(), cs.getPropertyValue('--t-medium').trim(), cs.getPropertyValue('--ambient').trim()]; });
  R.check('mouvement réduit : --motion 0, durées de 150 ms, boucles à l’arrêt', m[0] === '0' && m[1] === '150ms' && m[2] === 'paused', m.join(' '));
  R.check('mouvement réduit : le panneau ne glisse plus (fondu seulement)', /opacity/.test(await pr.evaluate(() => getComputedStyle(document.querySelector('.panel')).transitionProperty)) && !/transform/.test(await pr.evaluate(() => getComputedStyle(document.querySelector('.panel')).transitionProperty)));
  await pr.click('#fil-quest [data-action="complete"]');
  await pr.waitForTimeout(250);
  const moving = await pr.evaluate(() => document.getAnimations().filter((a) => {
    if (a.playState !== 'running') return false; // les boucles du décor sont en pause en mouvement réduit
    const k = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
    return k.some((f) => f.transform && f.transform !== 'none' && !/^(translate[XY]?\((calc\(0 ?\* ?-?[\d.]+px\)|-?0(px)?)\)|translate\(0(px)?, ?0(px)?\)|matrix\(1, 0, 0, 1, 0, 0\)|scale\(1\))$/.test(String(f.transform).trim()));
  }).map((a) => a.animationName || a.constructor.name));
  R.check('mouvement réduit : aucune animation de déplacement ou d’échelle après « Fait »', moving.length === 0, moving.join(','));
  await pr.click('.panel-head [data-action="add"]').catch(() => {});
  await pr.waitForSelector('#dlg-add[open]');
  await pr.keyboard.press('Escape');
  const closed = await L.waitFor(() => pr.evaluate(() => !document.getElementById('dlg-add').open), 300, 30);
  R.check('mouvement réduit : la feuille se ferme sans attendre une animation', !!closed);

  // ───── 40 quêtes dont 10 en retard : accueillant, sans rouge
  const t = srv.readTasks();
  srv.writeTasks(MANY);
  const { page: pm } = await newPage();
  await pm.goto(srv.url);
  await L.ready(pm);
  await L.openPanel(pm);
  const rows = await pm.locator('#quest-list > li').count();
  R.check('40 quêtes affichées', rows === 40, String(rows));
  const late = await pm.locator('#quest-list .meta-item--late').count();
  R.check('10 quêtes « en retard » marquées par texte et picto', late === 10, String(late));
  const red = await pm.evaluate(() => {
    // couleur « rouge » = canal rouge dominant et saturé, hors braise (réservée aux menaces et aux erreurs de casse)
    const out = [];
    for (const el of document.querySelectorAll('#quest-list *, #fil-quest *, .alts *')) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
        const m = (cs[prop] || '').match(/rgba?\((\d+), (\d+), (\d+)/);
        if (!m) continue;
        const [r, g, b] = m.slice(1).map(Number);
        if (r > 170 && g < 80 && b < 80) out.push(`${el.className}:${prop}:${cs[prop]}`);
      }
    }
    return out;
  });
  R.check('aucun rouge dans la liste ni le Fil du jour', red.length === 0, red.slice(0, 3).join(' ; '));
  const lateTxt = await pm.locator('#quest-list .meta-item--late').first().textContent();
  R.check('le retard se dit sans reproche (« Attend depuis… »)', /Attend depuis/.test(lateTxt), lateTxt);
  await shot(pm, '10-quarante');
  // aucune régénération complète : un nœud marqué survit à une action sur une autre ligne
  await pm.evaluate(() => { for (const li of document.querySelectorAll('#quest-list > li')) li.__marque = true; });
  await pm.locator('#quest-list > li[data-task-id="t30"] [data-action="complete"]').click();
  await pm.waitForTimeout(800);
  const survivors = await pm.evaluate(() => [...document.querySelectorAll('#quest-list > li')].filter((li) => li.__marque).length);
  R.check('rendu par identifiant : les 39 autres lignes gardent le même nœud DOM', survivors === 39, String(survivors));
  await pm.fill('#search', 'numéro 3');
  await pm.waitForTimeout(200);
  const after = await pm.evaluate(() => [...document.querySelectorAll('#quest-list > li')].filter((li) => li.__marque).length);
  R.check('la recherche réutilise les nœuds des lignes qui restent', after > 0 && after === await pm.locator('#quest-list > li').count(), String(after));
}, { tasks: undefined });
