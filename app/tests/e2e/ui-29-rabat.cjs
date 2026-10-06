// 29. Rabat des quêtes, au doigt et au clavier.
//   - pas de « tirer pour rafraîchir » sur la page (valeur calculée sur html et body ; le vrai geste n'existe pas dans
//     Chromium de bureau, il s'essaie sur un téléphone Android) ;
//   - en compact, l'en-tête se touche (déplie, replie) et se glisse (vers le haut : ouvre ; vers le bas : replie), au doigt
//     (événements tactiles de Chromium, pas la souris) ; « Ajouter » et « Tout voir » gardent leur seule action ;
//     en colonne large, l'en-tête ne bascule rien ;
//   - trois états : « Quêtes » (colonne de la carte) cache le panneau (inert, la carte se recentre sur l'espace gagné),
//     puis le rend replié ; Échap et « Tout voir » ;
//   - panneau caché : un message court ou une erreur d'enregistrement (« Réessayer ») le fait revenir, visible et lu.
const L = require('./lib.cjs');

/** Centre d'un élément (coordonnées de la fenêtre). */
const center = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const state = (page) => page.evaluate(() => ({
  panel: document.getElementById('app').dataset.panel,
  inert: document.getElementById('panel').inert,
  expanded: document.querySelector('[data-action="toggle-panel"]').getAttribute('aria-expanded'),
  quetes: document.querySelector('[data-ow="quetes"]').getAttribute('aria-expanded'),
}));

L.runScenario('29. Rabat : anti-rechargement, doigt, trois états, messages', async ({ R, srv, newPage, tag, shot }) => {
  const compact = tag < 1000;
  const { page } = await newPage({}, { hasTouch: true, isMobile: compact });
  page.expected.push(/status of 503/);
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="quetes"]', { timeout: 8000 });
  await page.waitForTimeout(500);

  const ob = await page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).overscrollBehaviorY,
    body: getComputedStyle(document.body).overscrollBehaviorY,
  }));
  R.check('html : overscroll-behavior-y vaut contain (pas de tirer pour rafraîchir)', ob.html === 'contain', ob.html);
  R.check('body : overscroll-behavior-y vaut contain', ob.body === 'contain', ob.body);

  // ───── doigt : événements tactiles envoyés au navigateur (Input.dispatchTouchEvent), comme un écran tactile
  const cdp = await page.context().newCDPSession(page);
  const finger = async (points, pause = 16) => {
    const [x0, y0] = points[0];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (const [x, y] of points.slice(1)) {
      await page.waitForTimeout(pause);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(450);
  };
  const tap = async (sel) => finger([await center(page, sel)]);
  const swipe = async (sel, dy) => { const [x, y] = await center(page, sel); await finger([0.2, 0.45, 0.7, 1].map((k) => [x, y + dy * k])); };
  const touchAction = await page.evaluate(() => getComputedStyle(document.querySelector('.panel-head')).touchAction);

  if (compact) {
    R.check('en-tête du rabat : touch-action none (le geste n’est pas pris par le navigateur)', touchAction === 'none', touchAction);
    await tap('#panel-title');
    let s = await state(page);
    R.check('doigt : toucher l’en-tête déplie le rabat', s.panel === 'open' && s.expanded === 'true', JSON.stringify(s));
    await tap('#panel-title');
    s = await state(page);
    R.check('doigt : toucher à nouveau le replie', s.panel === 'peek' && s.expanded === 'false', JSON.stringify(s));
    await swipe('#panel-title', -90);
    s = await state(page);
    R.check('doigt : glisser vers le haut ouvre', s.panel === 'open', JSON.stringify(s));
    await swipe('#panel-title', 90);
    s = await state(page);
    R.check('doigt : glisser vers le bas replie', s.panel === 'peek', JSON.stringify(s));
    await swipe('#panel-title', 60);
    R.check('doigt : glisser vers le bas, déjà replié : rien ne bouge', (await state(page)).panel === 'peek');
    await tap('[data-action="toggle-panel"]');
    s = await state(page);
    R.check('doigt : « Tout voir » ouvre une seule fois (pas de double bascule avec l’en-tête)', s.panel === 'open' && s.expanded === 'true', JSON.stringify(s));
    await tap('[data-action="toggle-panel"]');
    R.check('doigt : « Replier » referme une seule fois', (await state(page)).panel === 'peek');
    await tap('.panel-head [data-action="add"]');
    const add = await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-add').open), 2000);
    R.check('doigt : « Ajouter » ouvre l’ajout sans basculer le rabat', add && (await state(page)).panel === 'peek');
    await page.keyboard.press('Escape');
    await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-add').open), 2000);
  } else {
    R.check('colonne large : l’en-tête n’est pas réservé aux gestes', touchAction !== 'none', touchAction);
    await tap('#panel-title');
    R.check('colonne large : toucher l’en-tête ne bascule rien', (await state(page)).panel === 'peek');
  }

  // ───── clavier : « Tout voir » puis Échap (compact)
  if (compact) {
    await page.focus('[data-action="toggle-panel"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    R.check('clavier : « Tout voir » ouvre', (await state(page)).panel === 'open');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    R.check('clavier : Échap replie et rend le focus à « Tout voir »', (await state(page)).panel === 'peek' && await page.evaluate(() => document.activeElement.matches('[data-action="toggle-panel"]')));
  }

  // ───── « Quêtes » : caché (inert), la carte prend l'espace et se recentre ; puis replié
  const fanal0 = await center(page, '.ow-ent[data-id="fanal"]');
  await tap('[data-ow="quetes"]');
  await page.waitForTimeout(300);
  let s = await state(page);
  const hidden = await page.evaluate(() => {
    const p = document.getElementById('panel').getBoundingClientRect();
    const col = document.querySelector('.ow-zoom').getBoundingClientRect();
    return { vis: getComputedStyle(document.getElementById('panel')).visibility, onScreen: p.top < innerHeight - 1 && p.left < innerWidth - 1, colBottom: Math.round(innerHeight - col.bottom) };
  });
  R.check('« Quêtes » cache le panneau : état caché, inert, bouton aria-expanded=false', s.panel === 'cache' && s.inert && s.quetes === 'false', JSON.stringify(s));
  R.check('panneau caché : hors de l’écran et invisible', hidden.vis === 'hidden' && !hidden.onScreen, JSON.stringify(hidden));
  R.check('panneau caché : la colonne descend au bas de l’écran (12 px)', hidden.colBottom >= 10 && hidden.colBottom <= 14, JSON.stringify(hidden));
  const fanal1 = await center(page, '.ow-ent[data-id="fanal"]');
  R.check('panneau caché : la carte se recentre sur l’espace gagné', Math.hypot(fanal1[0] - fanal0[0], fanal1[1] - fanal0[1]) > 20, JSON.stringify([fanal0, fanal1]));
  const reach = await page.evaluate(() => { const b = document.querySelector('#fil-quest [data-action="complete"]'); b.focus(); return document.activeElement === b; });
  R.check('panneau caché : « Fait » n’est plus atteignable (inert)', !reach);
  await shot(page, '29-cache');
  await tap('[data-ow="quetes"]');
  s = await state(page);
  R.check('« Quêtes » à nouveau : le panneau revient replié, aria-expanded=true', s.panel === 'peek' && !s.inert && s.quetes === 'true', JSON.stringify(s));
  const fanal2 = await center(page, '.ow-ent[data-id="fanal"]');
  R.check('panneau revenu : la carte se recentre à nouveau', Math.hypot(fanal2[0] - fanal1[0], fanal2[1] - fanal1[1]) > 20, JSON.stringify([fanal1, fanal2]));

  // ───── panneau caché, puis un message court : il revient replié, le message est visible et lu
  // (le refus est provoqué en visant, dans le catalogue, la parcelle du départ, déjà bâtie : un vrai refus du cœur)
  await tap('[data-ow="quetes"]');
  await page.click('[data-ow="build"]');
  await page.waitForSelector('#dlg-construire[open]');
  await page.evaluate(() => { const b = document.querySelector('#dlg-construire .cat-row[data-type="parcelle"] .cat-go'); b.dataset.id = 'parcelle-1'; b.removeAttribute('aria-disabled'); });
  await page.click('#dlg-construire .cat-row[data-type="parcelle"] .cat-go');
  await page.waitForTimeout(300);
  s = await state(page);
  const msg = await page.evaluate(() => {
    const n = document.getElementById('notice');
    const r = n.getBoundingClientRect();
    return { hidden: n.hidden, text: n.textContent.trim(), vis: getComputedStyle(n).visibility, inert: !!n.closest('[inert]'), inView: r.top >= 0 && r.bottom <= innerHeight };
  });
  R.check('message court, panneau caché : le panneau revient replié', s.panel === 'peek' && !s.inert, JSON.stringify(s));
  R.check('… et le message est visible (refus du cœur)', !msg.hidden && /déjà bâti/.test(msg.text) && msg.vis === 'visible' && !msg.inert && msg.inView, JSON.stringify(msg));
  await page.keyboard.press('Escape');
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-construire').open), 2000);
  const ax = await (async () => {
    const c = await page.context().newCDPSession(page);
    try {
      await c.send('Accessibility.enable');
      const { root } = await c.send('DOM.getDocument', { depth: -1 });
      const { nodeId } = await c.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#notice' });
      const { nodes } = await c.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      return { ignored: nodes[0].ignored, role: nodes[0].role?.value };
    } finally { await c.detach().catch(() => {}); }
  })();
  R.check('… et lu : la zone de message est dans l’arbre d’accessibilité (role status)', ax.ignored === false && ax.role === 'status', JSON.stringify(ax));
  await page.click('#notice [data-action="notice-close"]');

  // ───── panneau caché, puis une erreur d'enregistrement : « Réessayer » revient à l'écran, touchable
  await tap('[data-ow="quetes"]');
  await page.route('**/api/api.php', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 503, contentType: 'text/html', body: '<h1>Service indisponible</h1>' }) : r.continue()));
  await page.click('[data-ow="build"]');
  await page.waitForSelector('#dlg-construire[open]');
  await page.waitForTimeout(400);
  await page.click('#dlg-construire .cat-row[data-type="chalet"] .cat-go');
  // (le catalogue se ferme en 220 ms : on regarde une fois la feuille partie)
  const err = await L.waitFor(() => page.evaluate(() => {
    const e = document.querySelector('#sync[data-sync="error"]');
    if (!e || e.hidden || document.querySelector('dialog[open]')) return null;
    const b = e.querySelector('[data-action="sync-retry"]');
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { panel: document.getElementById('app').dataset.panel, inert: document.getElementById('panel').inert, role: e.getAttribute('role'), retry: !!hit && b.contains(hit), h: Math.round(r.height), hit: hit && (hit.id || hit.className?.baseVal || hit.className) };
  }), 8000);
  R.check('erreur d’enregistrement, panneau caché : le panneau revient replié avec « Réessayer » touchable', err && err.panel === 'peek' && !err.inert && err.role === 'alert' && err.retry && err.h >= 44, JSON.stringify(err));
  await shot(page, '29-erreur');
  await page.unroute('**/api/api.php');
  await page.click('#sync [data-action="sync-retry"]');
  R.check('« Réessayer » : le chalet est enregistré', await L.waitFor(() => (srv.game()?.batiments || []).some((b) => b.id === 'chalet-1'), 6000));
  R.check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
});
