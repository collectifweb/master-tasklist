// 43. La bande de terrain du Hameau (lot F) : quand la 3e famille arrive, la forêt du fond recule et l'île gagne une
//     bande de terre, vide pour l'instant.
//   Partie A (deux appareils ouverts, partie à 2 habitants) :
//     - avant : pas de bande, le décor de départ (DECOR) ;
//     - la 3e famille accueillie au chalet : la fiche se ferme, la bande monte (une animation sur elle), la phrase
//       « La forêt recule » est lue une seule fois, hors de toute fiche, et Fanal dit une réplique du Hameau ;
//     - après : le décor de decorFor(['hameau']) (lisière replantée, souches), l'île garde sa taille à l'écran (largeur
//       de la Place), aucun défilement horizontal ; toucher la bande, loin de tout objet, n'ouvre rien ;
//     - le second appareil, relu (retour sur l'onglet), dessine la bande sans moment ni phrase.
//   Partie B : une partie déjà au Hameau a la bande dès l'ouverture, sans moment ; lanternes du soir (fin de visite),
//     été et hiver en capture ; en mouvement réduit, l'accueil pose la bande sans la déplacer.
//   Partie C : le chalet ouvert depuis la carte en liste : après l'accueil, aucune feuille ne reste ouverte.
//   Partie D : la famille du Sud livrée au quai, ouvert depuis la carte : la bande reste à l'écran pendant tout le moment
//     (le focus rendu au quai par la fiche qui se ferme ne ramène pas la caméra). Données fictives seulement.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'b1', task: 'Ranger le cabanon', domain: 'Terrain', difficulty: 3, length: 2, priority: 6, status: 'todo', created: day(-2) },
];

function village(core, habitants, now = new Date()) {
  const g = L.quietState(core, now);
  g.resources = { energy: 60, materials: 40, food: 30 };
  g.habitants = habitants;
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, day(-20)]));
  g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }];
  return g;
}

// ───── lectures de l'écran
/** Un point du chalet où le toucher tombe bien sur lui (rien par-dessus). */
const hitPoint = (page, id) => page.evaluate((id) => {
  const el = document.querySelector(`.ow-ent[data-id="${id}"]`);
  const hit = el && el.querySelector('.ow-hit');
  if (!hit) return null;
  const r = hit.getBoundingClientRect();
  for (const fy of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy;
    const top = document.elementFromPoint(x, y);
    if (top && top.closest('.ow-ent') === el) return [x, y];
  }
  return null;
}, id);
const toucher = (page, p, compact) => (compact ? page.touchscreen.tap(p[0], p[1]) : page.mouse.click(p[0], p[1]));
const placeLarge = (page) => page.evaluate(() => Math.round(document.querySelector('.ow-ground[data-sector="place"]').getBoundingClientRect().width));
const decorIds = (page) => page.evaluate(() => [...document.querySelectorAll('.ow-ent[data-id^="d-"]')].map((e) => e.dataset.id).sort());
const bande = (page) => page.evaluate(() => {
  const b = document.querySelector('.ow-bande');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const anims = b.getAnimations();
  return {
    w: r.width, h: r.height, o: Number(getComputedStyle(b).opacity), anims: anims.length,
    bouge: anims.some((a) => a.effect.getKeyframes().some((k) => k.transform && k.transform !== 'none')),
  };
});
const defile = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const ouvertes = (page) => page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.id));
/**
 * Un point au milieu de la bande, sans rien de touchable par-dessus ni à moins de 28 px (sur écran tactile, Chromium
 * rapproche un toucher de l'élément cliquable voisin, sur la bande comme sur le reste du sol). Boîte de la bande : de
 * P(2, 0) à P(10, -2) en x (320 px monde) et depuis P(2, -2) en y ; la ligne du milieu de la bande est y = x / 2 - 32.
 */
const solBande = (page) => page.evaluate(() => {
  const r = document.querySelector('.ow-bande').getBoundingClientRect();
  const s = r.width / 320;
  const libre = (x, y) => {
    const top = document.elementFromPoint(x, y);
    return top && top.closest('.ow') && !top.closest('.is-btn, .ow-plaque, button, [role="button"], .ow-zoom');
  };
  for (const X of [220, 180, 260, 150, 290]) {
    const x = r.left + (X - 64) * s, y = r.top + (X / 2 - 32) * s;
    const autour = Array.from({ length: 8 }, (_, k) => [x + 28 * Math.cos((k * Math.PI) / 4), y + 28 * Math.sin((k * Math.PI) / 4)]);
    if (libre(x, y) && autour.every(([a, b]) => libre(a, b))) return [x, y];
  }
  return null;
});
const foret = (s) => s.filter((x) => x.text.includes('La forêt recule'));
/** La bande à l'écran : part de sa boîte dans la carte, et ce qui est au centre est bien la carte (ni panneau ni barre). */
const enVue = (page) => page.evaluate(() => {
  const b = document.querySelector('.ow-bande');
  if (!b) return null;
  const r = b.getBoundingClientRect(), w = document.querySelector('.ow').getBoundingClientRect();
  const ix = Math.max(0, Math.min(r.right, w.right, innerWidth) - Math.max(r.left, w.left, 0));
  const iy = Math.max(0, Math.min(r.bottom, w.bottom, innerHeight) - Math.max(r.top, w.top, 0));
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { part: Math.round((100 * ix * iy) / (r.width * r.height)), centre: !!top && !!top.closest('.ow') && !top.closest('.ow-zoom, .panel, .hud') };
});
const samediSuivant = () => { const d = new Date(); d.setUTCHours(14, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 1); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1); return d; };

L.runScenario('43. La bande de terrain du Hameau', async ({ R, srv, newPage, size, tag, core }) => {
  const compact = tag < 1000;
  const layout = await import(pathToFileURL(path.join(L.REPO, 'app', 'world', 'layout.js')).href);
  const rep = require(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'));
  const repliques = rep.situations['permis.rang.bande'].variantes.map((v) => v.texte.replace('{rang}', 'Hameau'));
  const touche = { hasTouch: compact, isMobile: compact };

  // ───── Partie A : la 3e famille accueillie, deux appareils
  const { page } = await newPage({}, touche);
  await page.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page);
  const p2 = (await newPage({}, touche)).page;
  await p2.addInitScript(L.VOICES);
  await p2.goto(srv.url);
  await L.ready(p2);
  await L.closeWelcome(p2);
  await page.waitForTimeout(600);
  R.check('avant : pas de bande, le décor de départ', !(await bande(page)) && JSON.stringify(await decorIds(page)) === JSON.stringify(layout.DECOR.map((e) => e.id).sort()));
  const large0 = await placeLarge(page);
  await L.said(page, true);

  const p = await hitPoint(page, 'chalet-2');
  R.check('le chalet se touche', !!p);
  await toucher(page, p, compact);
  await page.waitForSelector('#dlg-batiment[open] [data-action="bat-geste"][data-geste="accueillir"]', { timeout: 5000 });
  await page.click('#dlg-batiment[open] [data-action="bat-geste"]');
  R.check('la fiche du chalet se ferme : le moment se voit sur la carte', !!await L.waitFor(async () => !(await ouvertes(page)).includes('dlg-batiment'), 1500), JSON.stringify(await ouvertes(page)));
  const monte = await L.waitFor(async () => { const b = await bande(page); return b && b.bouge ? b : null; }, 5000, 50);
  R.check('la bande monte (une animation la déplace)', !!monte, JSON.stringify(await bande(page)));
  await page.waitForTimeout(2500);
  const b1 = await bande(page);
  R.check('après : la bande est là, posée, entière', !!b1 && b1.o === 1 && b1.anims === 0 && b1.w > 40 && b1.h > 20, JSON.stringify(b1));
  R.check('après : la lisière a reculé, des souches sur la terre gagnée (decorFor)', JSON.stringify(await decorIds(page)) === JSON.stringify(layout.decorFor(['hameau']).map((e) => e.id).sort()));
  R.check('l’île garde sa taille à l’écran (largeur de la Place)', (await placeLarge(page)) === large0, `${large0} → ${await placeLarge(page)}`);
  R.check('aucun défilement horizontal', !(await defile(page)));
  const dits = foret(await L.said(page));
  R.check('« La forêt recule » est lu une seule fois, hors de toute fiche', dits.length === 1 && dits[0].sheet === '' && /Nouveau rang : Hameau\./.test(dits[0].text), JSON.stringify(dits));
  const fanal = await page.evaluate(() => document.querySelector('#speech')?.textContent || '');
  R.check('Fanal dit une réplique du Hameau qui gagne sa bande', repliques.some((t) => fanal.includes(t)), fanal);
  await page.screenshot({ path: `${L.SHOTS}/43-bande-${size[0]}.png` });

  const q = await solBande(page);
  R.check('un point de la bande loin de tout objet touchable', !!q);
  if (q) {
    await toucher(page, q, compact);
    await page.waitForTimeout(700);
    R.check('toucher la bande n’ouvre rien', (await ouvertes(page)).length === 0, JSON.stringify({ q, ouvertes: await ouvertes(page), titre: await page.evaluate(() => document.querySelector('dialog[open] h2')?.textContent) }));
  }

  // le second appareil n'a pas encore relu le serveur : il le relit au retour sur l'onglet
  R.check('enregistré : 3 habitants sur le serveur', !!await L.waitFor(() => (srv.game() || {}).habitants === 3, 5000));
  R.check('second appareil : pas encore de bande avant d’avoir relu', !(await bande(p2)));
  await L.said(p2, true);
  await p2.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const b2 = await L.waitFor(() => bande(p2), 6000, 50);
  R.check('second appareil : relu, il dessine la bande, sans la faire monter', !!b2 && !b2.bouge, JSON.stringify(b2));
  await p2.waitForTimeout(1500);
  R.check('second appareil : ni moment ni phrase', !(await bande(p2)).anims && foret(await L.said(p2)).length === 0, JSON.stringify(foret(await L.said(p2))));

  // ───── Partie B : une partie déjà au Hameau ; le soir, l'été, l'hiver ; le mouvement réduit
  const sB = await L.startServer({ tasks: TASKS, game: village(core, 3) });
  const cB = await newPage({}, touche);
  try {
    const pb = cB.page;
    await pb.addInitScript(L.VOICES);
    await pb.goto(sB.url);
    await L.ready(pb);
    const ouverture = await bande(pb);
    R.check('déjà au Hameau : la bande est là dès l’ouverture, sans moment', !!ouverture && !ouverture.bouge, JSON.stringify(ouverture));
    await L.closeWelcome(pb);
    await L.openPanel(pb);
    await pb.locator('#quest-list > li[data-task-id="b1"] [data-action="complete"]').click();
    R.check('le soir : la dernière quête faite, la visite se termine', !!await L.waitFor(() => pb.evaluate(() => document.getElementById('dlg-veille').open), 8000));
    await pb.click('#dlg-veille footer [data-close]');
    R.check('le soir : les lanternes s’allument, la bande reste', !!await L.waitFor(() => pb.evaluate(() => document.querySelector('.ow').dataset.veille === '1'), 8000) && !!(await bande(pb)),
      JSON.stringify({ veille: await pb.evaluate(() => document.querySelector('.ow').dataset.veille), ouvertes: await ouvertes(pb), taches: sB.readTasks().map((x) => x.status) }));
    // le panneau ouvert pour la quête se replie : l'île se voit aussi sur téléphone
    if (await pb.evaluate(() => document.getElementById('app').dataset.panel === 'open') && await pb.locator('.panel-toggle').isVisible()) await pb.click('.panel-toggle');
    await pb.waitForTimeout(800);
    R.check('déjà au Hameau : jamais « La forêt recule »', foret(await L.said(pb)).length === 0);
    await pb.screenshot({ path: `${L.SHOTS}/43-soir-${size[0]}.png` });
  } finally { await cB.context.close(); sB.stop(); }

  for (const [nom, date] of [['ete', '2027-07-15T14:00:00-04:00'], ['hiver', '2026-12-10T15:00:00-05:00']]) {
    const now = new Date(date);
    const s = await L.startServer({ game: village(core, 3, now) });
    const c = await newPage({}, touche);
    try {
      await c.page.clock.setFixedTime(now);
      await c.page.goto(s.url);
      await L.ready(c.page);
      await L.closeWelcome(c.page);
      await c.page.waitForTimeout(800);
      R.check(`${nom} : la bande est là`, !!(await bande(c.page)));
      await c.page.screenshot({ path: `${L.SHOTS}/43-${nom}-${size[0]}.png` });
    } finally { await c.context.close(); s.stop(); }
  }

  const sR = await L.startServer({ game: village(core, 2) });
  const cR = await newPage({}, { ...touche, reducedMotion: 'reduce' });
  try {
    const pr = cR.page;
    await pr.goto(sR.url);
    await L.ready(pr);
    await L.closeWelcome(pr);
    await pr.waitForTimeout(600);
    const pp = await hitPoint(pr, 'chalet-2');
    await toucher(pr, pp, compact);
    await pr.waitForSelector('#dlg-batiment[open] [data-action="bat-geste"][data-geste="accueillir"]', { timeout: 5000 });
    await pr.click('#dlg-batiment[open] [data-action="bat-geste"]');
    let deplacee = false;
    const vue = await L.waitFor(async () => { const b = await bande(pr); if (b && b.bouge) deplacee = true; return b; }, 4000, 30);
    await pr.waitForTimeout(400);
    const b = await bande(pr);
    if (b && b.bouge) deplacee = true;
    R.check('mouvement réduit : la bande arrive sans bouger', !!vue && !deplacee, JSON.stringify(b));
  } finally { await cR.context.close(); sR.stop(); }

  // ───── Partie C : depuis la carte en liste
  const sC = await L.startServer({ game: village(core, 2) });
  const cC = await newPage({}, touche);
  try {
    const pc = cC.page;
    await pc.goto(sC.url);
    await L.ready(pc);
    await L.closeWelcome(pc);
    await L.openPlan(pc);
    await pc.waitForSelector('#dlg-plan[open] [data-bat="chalet-2"]', { timeout: 4000 });
    await pc.click('#dlg-plan [data-bat="chalet-2"]');
    await pc.waitForSelector('#dlg-batiment[open] [data-action="bat-geste"][data-geste="accueillir"]', { timeout: 5000 });
    await pc.waitForTimeout(700); // un toucher juste après l'ouverture serait le second de celui qui l'a ouverte
    await pc.click('#dlg-batiment[open] [data-action="bat-geste"]');
    R.check('carte en liste : après l’accueil, aucune feuille ne reste ouverte', !!await L.waitFor(async () => (await ouvertes(pc)).length === 0, 1500), JSON.stringify(await ouvertes(pc)));
    await pc.waitForTimeout(2500);
    R.check('carte en liste : la bande est là', !!(await bande(pc)));
  } finally { await cC.context.close(); sC.stop(); }

  // ───── Partie D : la famille du Sud livrée au quai, ouvert depuis la carte
  const sam = samediSuivant();
  const villageQuai = (date) => {
    const g = village(core, 2, date);
    g.batiments = ['chalet-1', 'chalet-2', 'atelier-1', 'serre-1', 'quai-1'].map((id) => ({ id, type: id.replace(/-\d+$/, '') }));
    return g;
  };
  const jour = [0, 7, 14, 21].map((n) => new Date(sam.getTime() + n * 86400000)).find((d) => core.commandeDeLaSemaine(villageQuai(d), [], d.toISOString()).id === 'famille');
  R.check('un samedi de la famille du Sud dans les quatre semaines', !!jour);
  const sD = await L.startServer({ game: villageQuai(jour), sandbox: true });
  const cD = await newPage({}, touche);
  try {
    const pd = cD.page;
    await pd.clock.install({ time: jour });
    await pd.goto(sD.url);
    await L.ready(pd);
    await L.closeWelcome(pd, 1500);
    await pd.waitForTimeout(800);
    const pq = await hitPoint(pd, 'quai-1');
    R.check('le quai se touche', !!pq);
    await toucher(pd, pq, compact);
    await pd.waitForSelector('#dlg-batiment[open] .commande-go', { timeout: 5000 });
    await pd.waitForTimeout(700);
    await pd.click('#dlg-batiment .commande-go');
    R.check('quai : la famille du Sud livrée, le Hameau atteint', !!await L.waitFor(() => (sD.game() || {}).habitants === 3, 5000));
    const vues = [];
    for (const ms of [700, 1200, 1800, 2600]) { await pd.waitForTimeout(ms - (vues.length ? [700, 1200, 1800, 2600][vues.length - 1] : 0)); vues.push(await enVue(pd)); }
    R.check('quai : la bande reste à l’écran pendant tout le moment (focus rendu au quai sans ramener la caméra)', vues.every((v) => v && v.part >= 80 && v.centre), JSON.stringify(vues));
    await pd.screenshot({ path: `${L.SHOTS}/43-quai-${size[0]}.png` });
  } finally { await cD.context.close(); sD.stop(); }
}, { game: (core) => village(core, 2) });
