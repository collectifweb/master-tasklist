// 12. Le vrai monde : « Fait » sur une quête de l'Atelier → le fil part du bouton, les compteurs montent à l'impact,
//     le secteur reçoit la Lueur ; aucune erreur ; plus aucune image d'animation après 12 s ; mouvement réduit respecté.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'at1', task: 'Changer une ampoule', domain: 'Maison', difficulty: 3, length: 2, priority: 10, status: 'todo', created: day(-1) },
  { id: 'at2', task: 'Ratisser les feuilles', domain: 'Terrain', difficulty: 3, length: 3, priority: 4, status: 'todo', created: day(-3) },
  { id: 'at3', task: 'Payer une facture', domain: 'Administratif', difficulty: 2, length: 1, priority: 3, status: 'todo', created: day(-4) },
];

const SAMPLER = () => {
  window.__s = { thread: null, hud: null, base: null, fx: 0 };
  const read = () => { const e = document.querySelector('.res[data-res="energie"] .res-value'); return e && e.firstChild ? e.firstChild.nodeValue : null; };
  window.__s.base = read();
  setInterval(() => {
    const now = performance.now();
    const th = [...document.querySelectorAll('.ow-thread')].find((g) => g.style.display !== 'none');
    if (th && !window.__s.thread) {
      const d = th.firstChild.getAttribute('d') || '';
      const m = d.match(/M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/);
      if (m) window.__s.thread = { t: now, x: Number(m[1]), y: Number(m[2]) };
    }
    if (window.__s.base !== null && !window.__s.hud && read() !== window.__s.base) window.__s.hud = { t: now, v: read() };
  }, 16);
};

L.runScenario('12. monde : fil de lumière, impact, Lueur, repos', async ({ R, srv, newPage, size, core }) => {
  const { page } = await newPage();
  await page.addInitScript(() => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => { window.__raf++; return o(cb); }; });
  await page.goto(srv.url);
  await L.ready(page);
  R.check('le vrai monde est en place (pas l’illustration statique)', await L.waitFor(() => page.evaluate(() => document.querySelector('.world-slot').dataset.world === 'live' && document.querySelectorAll('.ow-ent').length > 10), 6000));
  R.check('la légende « Emplacement du monde » a disparu', !(await page.textContent('body')).includes('Emplacement du monde'));
  await page.waitForTimeout(1200);
  R.check('la quête n° 1 est celle de l’Atelier', await page.getAttribute('#fil-quest', 'data-task-id') === 'at1');
  const e0 = await L.resValue(page, 'energie');
  const g0 = srv.game();
  const plaque0 = await page.getAttribute('.ow-plaque[data-sector="atelier"]', 'aria-label');
  await page.evaluate(SAMPLER);
  const btn = await L.rect(page, '#fil-quest [data-action="complete"]');
  const root = await L.rect(page, '.ow');
  const t0 = Date.now();
  await page.click('#fil-quest [data-action="complete"]');
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${L.SHOTS}/12-fil-${size[0]}.png` });
  const hudEarly = await L.resValue(page, 'energie');
  R.check('à mi-chemin du fil, les compteurs n’ont pas encore bougé', hudEarly === e0, `${e0} → ${hudEarly}`);
  await L.waitFor(() => page.evaluate(() => !!window.__s.hud), 5000);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${L.SHOTS}/12-impact-${size[0]}.png` });
  const s = await page.evaluate(() => window.__s);
  R.check('un fil de lumière a été dessiné', !!s.thread);
  if (s.thread) {
    const cx = btn.x + btn.w / 2 - root.x, cy = btn.y + btn.h / 2 - root.y;
    R.check('le fil part du bouton « Fait » touché', Math.hypot(s.thread.x - cx, s.thread.y - cy) < 40, `départ ${Math.round(s.thread.x)},${Math.round(s.thread.y)} ; bouton ${Math.round(cx)},${Math.round(cy)}`);
  }
  R.check('les compteurs ont monté', !!s.hud, JSON.stringify(s.hud));
  if (s.thread && s.hud) R.check('les compteurs montent à l’impact, après le départ du fil (≥ 400 ms)', s.hud.t - s.thread.t >= 400, `${Math.round(s.hud.t - s.thread.t)} ms`);
  R.check('l’Énergie affichée a bien augmenté', (await L.resValue(page, 'energie')) > e0);
  const g1 = srv.game();
  const lu0 = ((g0 && g0.lueur) || {}).atelier || 0, lu1 = ((g1 && g1.lueur) || {}).atelier || 0;
  R.check('l’Atelier a reçu de la Lueur dans l’état du jeu enregistré', lu1 > lu0, `${lu0} → ${lu1}`);
  const plaque1 = await page.getAttribute('.ow-plaque[data-sector="atelier"]', 'aria-label');
  R.check('la plaque de l’Atelier le dit', plaque1 !== plaque0 && /Lueur/.test(plaque1), `${plaque0} → ${plaque1}`);
  R.check('le texte du monde passe par sa propre zone vocale', await L.waitFor(() => page.evaluate(() => document.getElementById('live-world').textContent.trim().length > 0), 3000));
  R.check('la zone vocale des gains reste séparée et remplie', await page.evaluate(() => document.getElementById('live').textContent.trim().length > 0));

  // repos : 12 s sans rien faire, puis aucune image d'animation
  await page.waitForTimeout(12000);
  const r1 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(2000);
  const r2 = await page.evaluate(() => window.__raf);
  R.check('0 requestAnimationFrame après 12 s d’inactivité', r2 === r1, `${r1} → ${r2}`);
  R.check('le monde est au repos (data-ambient=off, plus de bouton « Passer »)', await page.evaluate(() => document.querySelector('.ow').dataset.ambient === 'off' && document.querySelector('.ow-skip').hidden));

  // toucher un secteur de la carte : sa feuille d'actions, puis « Voir les quêtes des Champs » → liste filtrée
  await page.click('.ow-plaque[data-sector="champs"]');
  R.check('toucher un secteur ouvre sa feuille d’actions', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-act').open && /Champs/.test(document.getElementById('act-t').textContent)), 2000));
  await page.waitForTimeout(300);
  await page.click('#dlg-act [data-act="filter"]');
  R.check('« Voir les quêtes » ferme la feuille et ouvre le panneau', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-act').open && document.getElementById('app').dataset.panel === 'open'), 2000));
  R.check('et filtre la liste par ce secteur', await page.evaluate(() => document.querySelector('.chip[data-sector="champs"]').getAttribute('aria-pressed') === 'true' && [...document.querySelectorAll('#quest-list .quest-title')].map((e) => e.textContent.trim()).join('|') === 'Ratisser les feuilles'));
  await page.screenshot({ path: `${L.SHOTS}/12-secteur-${size[0]}.png` });

  // plan accessible
  await page.click('[data-action="open-plan"]');
  await page.waitForSelector('#dlg-plan[open]');
  await page.waitForTimeout(500);
  R.check('le plan accessible s’ouvre et nomme les secteurs', /Plan de l’Orée/.test(await page.textContent('#dlg-plan')) && (await page.locator('#dlg-plan .ow-plan-sectors > li').count()) === 6);
  await page.screenshot({ path: `${L.SHOTS}/12-plan-${size[0]}.png` });
  await page.locator('#dlg-plan .ow-plan-sectors button').first().click();
  R.check('« Voir sur la carte » referme le plan', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-plan').open), 2000));

  // mouvement réduit : pas de fil, compteurs immédiats
  const { page: pr } = await newPage({}, { reducedMotion: 'reduce' });
  await pr.goto(srv.url);
  await L.ready(pr);
  await pr.waitForSelector('.ow-ent');
  await pr.waitForTimeout(800);
  const left = await pr.evaluate(() => document.querySelector('.ow').dataset.mouvement);
  R.check('mouvement réduit : le monde le sait', left === 'reduit', left);
  const id2 = await pr.getAttribute('#fil-quest', 'data-task-id');
  const er0 = await L.resValue(pr, 'energie');
  await pr.evaluate(SAMPLER);
  await pr.click('#fil-quest [data-action="complete"]');
  const rose = await L.waitFor(async () => (await L.resValue(pr, 'energie')) > er0, 1000, 40);
  R.check('mouvement réduit : les compteurs montent tout de suite', !!rose);
  await pr.waitForTimeout(600);
  const sr = await pr.evaluate(() => window.__s);
  R.check('mouvement réduit : aucun fil de lumière', sr.thread === null, JSON.stringify(sr.thread));
  R.check('mouvement réduit : pas de bouton « Passer l’animation »', await pr.evaluate(() => document.querySelector('.ow-skip').hidden));
  await pr.screenshot({ path: `${L.SHOTS}/12-reduit-${size[0]}.png` });
}, { tasks: TASKS });
