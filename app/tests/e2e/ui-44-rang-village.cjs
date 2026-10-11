// 44. Le rang Village (lot B), à l'écran : les quatre bâtiments posés sur la bande du Hameau.
//   Partie A (village au rang Village, aujourd'hui ; poulailler déjà debout) : à l'ouverture, sans quête, le poulailler
//   donne sa Nourriture du jour (la visite du jour, lot J) ; les quatre emplacements sont sur l'île, aucune plaque n'en
//   couvre plus du quart ; toucher les piquets de la scierie ouvre sa fiche (ce qu'elle fait, son prix, « Bâtir ») ; bâtir
//   la paie une fois au serveur et elle scie aussitôt sa part du jour, que sa fiche dit ; la fiche du poulailler dit les
//   œufs ramassés ; une quête faite puis remballée ne fait rien produire et ne reprend rien aux bâtiments.
//   Partie B (l'hiver, tour bâtie, TOUR_ANNONCE jours avant une tempête) : la rangée d'alerte paraît 6 jours d'avance ; la
//   fiche de la tour dit la tempête annoncée.
//   Partie C (16 mars, cabane bâtie) : la cabane fume, la carte en liste dit le temps des sucres, sa fiche dit qu'elle a
//   bouilli à l'ouverture.
// Données fictives seulement.
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const at = (day, h = 15) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`); // 10 ou 11 h à Montréal
const VILLAGE = ['tour', 'scierie', 'poulailler', 'cabane'];
const TASKS = (ref) => Array.from({ length: 4 }, (_, k) => ({
  id: `v${k}`, task: `Petite quête ordinaire ${k + 1}`, domain: ['Maison', 'Administratif'][k % 2],
  difficulty: 2, length: 2, priority: 9 - k, status: 'todo', created: ref,
}));

const fiche = (page) => page.evaluate(() => {
  const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const d = document.getElementById('dlg-batiment');
  const b = d.querySelector('[data-action="bat-geste"]');
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '', nom: s(d.querySelector('.bat-nom')?.textContent),
    values: [...d.querySelectorAll('.help-lines dd')].map((e) => s(e.textContent)), raison: s(d.querySelector('#bat-raison')?.textContent),
    geste: b ? { label: s(b.textContent), off: b.getAttribute('aria-disabled') === 'true', h: Math.round(b.getBoundingClientRect().height) } : null,
  };
});
const ouvrir = async (page) => L.waitFor(async () => { const f = await fiche(page); return f.open ? f : null; }, 3000);
// Échap jusqu'à ce que plus rien ne soit ouvert (la fiche ouverte depuis la carte en liste laisse la liste dessous)
const fermer = async (page) => {
  for (let k = 0; k < 3 && await page.evaluate(() => !!document.querySelector('dialog[open]')); k++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }
  await L.waitFor(() => page.evaluate(() => !document.querySelector('dialog[open]')), 3000);
};
// un point de la zone de toucher que rien ne recouvre (null si l'objet est caché ou hors de l'écran)
const hitPoint = (page, id) => page.evaluate((id) => {
  const el = document.querySelector(`.ow-ent[data-id="${id}"]`);
  const hit = el && el.querySelector('.ow-hit');
  if (!hit) return null;
  const r = hit.getBoundingClientRect();
  for (const fy of [0.5, 0.35, 0.65, 0.2, 0.8]) {
    for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      const top = document.elementFromPoint(x, y);
      if (top && top.closest('.ow-ent') === el) return [x, y];
    }
  }
  return null;
}, id);
const fit = async (page) => {
  await page.click('[data-ow="vue"]');
  await page.click('[data-zoom="fit"]');
  await page.waitForTimeout(900);
  await page.click('[data-ow="vue"]');
  await page.waitForTimeout(400);
};
// part de la boîte de chaque bâtiment du Village couverte par une plaque de secteur
const couvert = (page) => page.evaluate(() => {
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const pl = [...document.querySelectorAll('.ow-plaque')].filter((p) => p.offsetParent).map((p) => p.getBoundingClientRect());
  return Object.fromEntries([...document.querySelectorAll('.ow-ent[data-id]')].filter((e) => /^(tour|scierie|poulailler|cabane)-/.test(e.dataset.id)).map((e) => {
    const r = e.getBoundingClientRect();
    return [e.dataset.id, Math.round((100 * Math.max(0, ...pl.map((p) => inter(p, r)))) / (r.width * r.height))];
  }));
});
async function plan(page) {
  await L.openPlan(page);
  await page.waitForSelector('#dlg-plan[open]');
  await page.waitForTimeout(400);
  const bats = await page.evaluate(() => {
    const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    return Object.fromEntries([...document.querySelectorAll('#dlg-plan [data-bat]')].map((b) => [b.dataset.bat, s(b.closest('.ow-plan-bat').querySelector('.ow-plan-bat-etat').textContent)]));
  });
  return bats;
}

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const { addDays, weekStart, calendrierImprevus, isTruce, tempetesDeLHiver, daysBetween, gameDay, PRODUCTION, TOUR_ANNONCE: A } = core;
  const auj = gameDay(new Date());

  const village = (day, types, over = {}) => {
    const g = L.quietState(core, at(day));
    g.resources = { energy: 60, materials: 80, food: 10 };
    g.habitants = 6;
    g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, addDays(day, -30)]));
    g.batiments = [...['chalet-1', 'chalet-2', 'chalet-3'].map((id) => ({ id, type: 'chalet' })), { id: 'atelier-1', type: 'atelier' }, ...types.map((t) => ({ id: `${t}-1`, type: t }))];
    g.lastSeenDay = addDays(day, -1);
    return Object.assign(g, over);
  };
  // les créneaux d'imprévus des semaines en jeu, déjà tirés (orignal sans effet) ; les tempêtes d'avant, déjà réglées
  const calme = (jours, tempetesAvant = []) => {
    const out = [];
    for (const lundi of new Set(jours.map(weekStart))) {
      for (const c of calendrierImprevus(lundi).creneaux) out.push({ key: `imprevu:${c.jour}`, at: at(addDays(lundi, -30)).toISOString(), day: addDays(lundi, -30), type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0 });
    }
    for (const j of tempetesAvant) out.push({ key: `tempete:${j}`, at: at(j).toISOString(), day: j, type: 'tempete', tempete: j, resultat: 'passee', raison: 'absent', pe: 0, energy: 0, materials: 0 });
    return out;
  };

  // Partie B : la première tempête des prochains hivers dont les A jours d'annonce sont libres (hors trêve, la précédente
  // au moins A + 1 jours avant), et qui tombe au moins 8 jours après aujourd'hui
  let J = null;
  for (let y = Number(auj.slice(0, 4)); y < Number(auj.slice(0, 4)) + 4 && !J; y++) {
    const s = tempetesDeLHiver(`${y}-12-01`);
    J = s.find((j, i) => j > addDays(auj, 8) && (!i || daysBetween(s[i - 1], j) >= A + 1) && ![...Array(A + 1).keys()].some((k) => isTruce(addDays(j, -k)))) || null;
  }
  if (!J) throw new Error('aucune tempête libre trouvée dans les quatre prochains hivers');
  const B = addDays(J, -A);
  // Partie C : le 16 mars qui suit aujourd'hui
  const C = `${Number(auj.slice(0, 4)) + (auj.slice(5) >= '03-16' ? 1 : 0)}-03-16`;

  await L.runScenario('44. le rang Village : produire à la visite, bâtir, la tour et la cabane', async ({ R, srv, newPage, shot, tag }) => {
    // ───── Partie A : bâtir la scierie, une quête, Remballer
    const { page } = await newPage();
    await page.addInitScript(L.VOICES);
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await page.waitForTimeout(600);
    // la visite du jour : sans quête, le poulailler a déjà donné sa Nourriture
    const ouvert = await L.waitFor(() => srv.ledger().some((e) => e.key === `prod:poulailler:${auj}`), 5000);
    R.check('à l’ouverture, sans quête : le poulailler donne sa Nourriture du jour, au registre', !!ouvert && !srv.ledger().some((e) => e.type === 'reward'), JSON.stringify(srv.ledger().map((e) => e.key)));
    const ids = await page.evaluate(() => [...document.querySelectorAll('.ow-ent[data-id]')].map((e) => e.dataset.id));
    R.check('les quatre emplacements du Village sont sur l’île', VILLAGE.every((t) => ids.includes(`${t}-1`)), ids.join(' '));
    await fit(page);
    const cv = await couvert(page);
    R.check('aucune plaque ne couvre plus du quart d’un bâtiment du Village', Object.values(cv).every((x) => x <= 25), JSON.stringify(cv));
    R.check('aucun défilement horizontal', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));

    // vue d'ensemble « loin » (téléphone) : les objets ne prennent pas le toucher (css/world.css), la carte en liste y mène
    const loin = await page.evaluate(() => document.querySelector('.ow').dataset.lod === 'loin');
    if (loin) {
      await L.openPlan(page);
      await page.waitForSelector('#dlg-plan[open]');
      await page.click('#dlg-plan [data-bat="scierie-1"]');
    } else {
      const p = await hitPoint(page, 'scierie-1');
      R.check('les piquets de la scierie se touchent', !!p);
      if (!p) return;
      await page.mouse.click(p[0], p[1]);
    }
    const f0 = await ouvrir(page);
    R.check(`${loin ? 'la carte en liste (vue d’ensemble)' : 'le toucher'} ouvre la fiche de la scierie`, f0 && f0.id === 'scierie-1' && f0.nom === 'Emplacement de la scierie', JSON.stringify(f0));
    if (!f0) return;
    R.check('« Ce que ça fait » : 3 Matériaux chaque jour où tu passes au village', f0.values[1] === `${PRODUCTION.scierie.materials} Matériaux de plus chaque jour où tu passes au village.`, f0.values[1]);
    R.check('« Maintenant » : le prix ; « Bâtir » actif, 44 px', f0.values[2] === 'Coûte 6 Énergie et 35 Matériaux.' && f0.geste && f0.geste.label === 'Bâtir' && !f0.geste.off && f0.geste.h >= 44, JSON.stringify([f0.values[2], f0.geste]));
    await shot(page, '44-scierie-vide');
    const g0 = srv.game();
    await page.click('#dlg-batiment [data-action="bat-geste"]');
    const bati = await L.waitFor(() => (srv.game().batiments || []).some((b) => b.id === 'scierie-1'), 5000);
    R.check('bâtie : enregistrée sur le serveur', !!bati);
    const g1 = srv.game();
    const sciee = srv.ledger().filter((e) => e.key.startsWith('prod:scierie:')).map((e) => e.key);
    R.check('payée une fois (6 Énergie, 35 Matériaux), elle scie aussitôt sa part du jour, au registre', g0.resources.energy - g1.resources.energy === 6
      && g0.resources.materials - g1.resources.materials === 35 - PRODUCTION.scierie.materials && sciee.join() === `prod:scierie:${auj}`, JSON.stringify([g0.resources, g1.resources, sciee]));
    await page.waitForTimeout(600);
    if (!(await fiche(page)).open) {
      await fermer(page);
      await L.openPlan(page);
      await page.waitForSelector('#dlg-plan[open]');
      await page.click('#dlg-plan [data-bat="scierie-1"]');
    }
    const f1 = await ouvrir(page);
    R.check('la fiche de la scierie dit ce qu’elle a donné', f1 && f1.nom === 'Scierie' && f1.values[2] === `Elle a scié aujourd’hui : ${PRODUCTION.scierie.materials} Matériaux de plus.`, JSON.stringify(f1));
    await shot(page, '44-scierie');
    await fermer(page);

    // une quête faite puis remballée : rien ne produit de plus, rien n'est repris aux bâtiments (lot J)
    const prods = () => srv.ledger().filter((e) => e.type === 'prod').map((e) => e.key).sort().join(' ');
    const avant = prods();
    const id = await page.getAttribute('#fil-quest', 'data-task-id');
    await L.said(page, true);
    await page.click('#fil-quest [data-action="complete"]');
    const paye = await L.waitFor(() => srv.ledger().some((e) => e.type === 'reward' && e.taskId === id), 5000);
    await page.waitForTimeout(800);
    const live1 = sp(await page.textContent('#live'));
    R.check('une quête faite : payée, sans production de plus ; la phrase lue ne parle pas de Nourriture', !!paye && prods() === avant && /Gains/.test(live1) && !/Nourriture/.test(live1), JSON.stringify([avant, prods(), live1]));
    await L.openPanel(page);
    await page.locator('label.seg-option', { hasText: 'Faites' }).click();
    const row = page.locator(`#quest-list > li[data-task-id="${id}"]`);
    await row.locator('[data-action="remballer"]').click();
    await page.waitForSelector('#dlg-confirm[open]');
    await page.click('#dlg-confirm [data-answer="yes"]');
    const remballe = await L.waitFor(() => srv.ledger().some((e) => e.type === 'reverse' && e.taskId === id), 5000);
    await page.waitForTimeout(800);
    const live2 = sp(await page.textContent('#live'));
    R.check('Remballer : la quête est reprise, rien des bâtiments (registre, phrase lue)', !!remballe && prods() === avant && !srv.ledger().some((e) => e.key.startsWith('reprise:'))
      && /Gains repris/.test(live2) && !/Nourriture/.test(live2), JSON.stringify([prods(), live2]));
    await fermer(page);
    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    await page.click('#dlg-plan [data-bat="poulailler-1"]');
    const f3 = await ouvrir(page);
    R.check('la fiche du poulailler dit toujours les œufs ramassés', f3 && f3.values[2] === `Les œufs du jour sont ramassés : ${PRODUCTION.poulailler.food} Nourriture de plus.`, JSON.stringify(f3 && f3.values));
    await fermer(page);

    // ───── Partie B : la tour de guet, A jours avant une tempête
    const srvB = await L.startServer({ tasks: TASKS(B), game: village(B, ['tour']), ledger: calme([B], tempetesDeLHiver(J).filter((j) => j < J)), sandbox: true });
    const { page: pb, context: cb } = await newPage();
    try {
      await pb.clock.install({ time: at(B) });
      await pb.goto(srvB.url);
      await L.ready(pb);
      await L.closeWelcome(pb, 1500);
      await pb.waitForTimeout(800);
      const al = await pb.evaluate(() => {
        const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
        const box = document.getElementById('bandeau-alerte');
        return { vu: !box.hidden && box.checkVisibility(), titre: s(box.querySelector('.bandeau-alerte-titre')?.textContent), crans: box.querySelectorAll('.bandeau-crans i').length };
      });
      R.check(`avec la tour : l’alerte paraît ${A} jours avant la tempête, avec ses 3 crans`, al.vu && new RegExp(`${A} jours`).test(al.titre) && al.crans === 3, JSON.stringify(al));
      await L.openPlan(pb);
      await pb.waitForSelector('#dlg-plan[open]');
      await pb.click('#dlg-plan [data-bat="tour-1"]');
      const ft = await ouvrir(pb);
      R.check('la fiche de la tour dit la tempête annoncée', ft && ft.nom === 'Tour de guet' && ft.values[2] === `Tempête de neige annoncée dans ${A} jours.`, JSON.stringify(ft && ft.values));
      await shot(pb, '44-tour');
    } finally {
      await cb.close();
      srvB.stop();
    }

    // ───── Partie C : la cabane au temps des sucres
    const srvC = await L.startServer({ tasks: TASKS(C), game: village(C, ['cabane']), ledger: calme([C]), sandbox: true });
    const { page: pc, context: cc } = await newPage();
    try {
      await pc.clock.install({ time: at(C) });
      await pc.goto(srvC.url);
      await L.ready(pc);
      await L.closeWelcome(pc, 1500);
      await pc.waitForTimeout(800);
      R.check('la cabane fume au temps des sucres', await pc.evaluate(() => !!document.querySelector('.ow-ent[data-id="cabane-1"] .ow-vapeur')));
      const bats = await plan(pc);
      R.check('la carte en liste dit le temps des sucres', bats['cabane-1'] === 'Temps des sucres', JSON.stringify(bats));
      await pc.click('#dlg-plan [data-bat="cabane-1"]');
      const fc = await ouvrir(pc);
      R.check('la fiche de la cabane dit qu’elle a bouilli à l’ouverture', fc && fc.nom === 'Cabane à sucre' && fc.values[2] === `Elle a bouilli aujourd’hui : ${PRODUCTION.cabane.food} Nourriture de plus.`, JSON.stringify(fc && fc.values));
      await shot(pc, '44-cabane');
    } finally {
      await cc.close();
      srvC.stop();
    }
  }, { tasks: TASKS(auj), game: () => village(auj, ['poulailler']), ledger: calme([auj]) });
})();
