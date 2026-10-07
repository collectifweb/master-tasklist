// 15. Potager et familles (v2) : rebâtir un chalet depuis sa fiche, semer la parcelle du vieux potager, la voir pousser
// au fil des jours travaillés (« Jour suivant » de la version d'essai), récolter, puis accueillir une famille. Chaque
// geste attend l'écriture du serveur avant de la vérifier. Date fixe en juin (potager ouvert). Titres fictifs.
// Les premiers pas sont déjà faits (leurs coups de pouce changeraient les comptes) : le scénario 17 les suit.
const L = require('./lib.cjs');

// un lundi de juin à venir, 10 h à Montréal : cinq jours suivants restent dans la même semaine et dans la saison
function juneMonday() {
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), 5, 8, 14));
  if (d <= now) d = new Date(Date.UTC(now.getUTCFullYear() + 1, 5, 8, 14));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const MONDAY = juneMonday();
const ymd = (n) => new Date(MONDAY.getTime() + n * 86400000).toISOString().slice(0, 10);
const TASKS = Array.from({ length: 7 }, (_, k) => ({
  id: `p${k}`, task: `Petite quête ordinaire ${k + 1}`, domain: ['Maison', 'Terrain', 'Administratif'][k % 3],
  difficulty: 2, length: 2, priority: 9 - k, status: 'todo', created: ymd(-3),
}));

// fiche du bâtiment ouverte : titre, raison du refus, bouton du geste
const sheet = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-batiment');
  const b = d.querySelector('[data-action="bat-geste"]');
  const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '', nom: txt(d.querySelector('.bat-nom')),
    now: txt(d.querySelector('#bat-now')), raison: txt(d.querySelector('#bat-raison')),
    geste: b ? { label: txt(b), off: b.getAttribute('aria-disabled') === 'true' } : null,
  };
});
// toucher un bâtiment de la carte (son bouton) ouvre sa fiche ; pendant une animation, le monde ignore le toucher :
// on retouche, comme le joueur
async function openBat(page, id) {
  return L.waitFor(async () => {
    await page.evaluate((id) => document.querySelector(`.ow-ent[data-id="${id}"]`).click(), id);
    await page.waitForTimeout(250);
    const s = await sheet(page);
    return s.open && s.id === id ? s : null;
  }, 6000);
}
async function closeBat(page) {
  await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
}
const geste = (page) => page.click('#dlg-batiment [data-action="bat-geste"]');

L.runScenario('15. potager : chalet, semis, jours travaillés, récolte, famille', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.clock.install({ time: MONDAY });
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page, 1500);
  const g0 = srv.game();

  // ───── rebâtir le premier chalet
  let s = await openBat(page, 'chalet-1');
  R.check('chalet vide : sa fiche s’ouvre depuis la carte, geste « Rebâtir » possible', s && s.nom === 'Chalet vide' && s.geste?.label === 'Rebâtir' && !s.geste.off, JSON.stringify(s));
  await geste(page);
  R.check('chalet rebâti : enregistré, 15 Matériaux dépensés', await L.waitFor(() => {
    const g = srv.game();
    return (g?.batiments || []).some((b) => b.id === 'chalet-1') && g.resources.materials === g0.resources.materials - 15;
  }, 5000), JSON.stringify(srv.game()?.resources));
  s = await L.waitFor(async () => { const x = await sheet(page); return x.nom === 'Chalet' ? x : null; }, 3000);
  R.check('la fiche se met à jour : « Accueillir une famille », refusé, raison écrite', s && s.geste?.label === 'Accueillir une famille' && s.geste.off && s.raison === 'Il manque 4 Nourriture.', JSON.stringify(s));
  await closeBat(page);

  // ───── semer la parcelle du vieux potager
  s = await openBat(page, 'parcelle-1');
  R.check('parcelle : rien de semé, semer coûte 2 Énergie', s && /Rien n’est semé\. Semer coûte 2 Énergie\./.test(s.now) && s.geste?.label === 'Semer' && !s.geste.off, JSON.stringify(s));
  await geste(page);
  R.check('semé : enregistré à la date du jour, 2 Énergie dépensées', await L.waitFor(() => {
    const g = srv.game();
    return (g?.parcelles || []).some((p) => p.id === 'parcelle-1' && p.semeLe === ymd(0)) && g.resources.energy === g0.resources.energy - 2;
  }, 5000), JSON.stringify(srv.game()?.parcelles));
  s = await L.waitFor(async () => { const x = await sheet(page); return /Mûr dans 5 jours travaillés/.test(x.now) ? x : null; }, 3000);
  R.check('en terre : « Mûr dans 5 jours travaillés », « Récolter » en attente', s && s.geste?.label === 'Récolter' && s.geste.off, JSON.stringify(s));
  await closeBat(page);

  // ───── cinq jours travaillés : « Jour suivant », puis une quête
  for (let k = 1; k <= 5; k++) {
    await L.openPanel(page);
    await page.click('[data-action="jour-suivant"]');
    await L.waitFor(() => srv.game()?.horloge?.decalage === k, 5000);
    await L.closeWelcome(page, 2500);
    await L.openPanel(page);
    await page.click('#fil-quest [data-action="complete"]');
    const paid = await L.waitFor(() => srv.ledger().some((e) => e.type === 'reward' && e.day === ymd(k)), 5000);
    if (!paid) { R.check(`jour ${k} : une quête payée`, false, JSON.stringify(srv.ledger().map((e) => [e.type, e.day]))); break; }
    await page.waitForTimeout(400);
    if (k === 1) {
      s = await openBat(page, 'parcelle-1');
      R.check('un jour travaillé plus tard : « Mûr dans 4 jours travaillés »', s && /Mûr dans 4 jours travaillés/.test(s.now), JSON.stringify(s));
      await closeBat(page);
    }
  }

  // ───── récolter, puis accueillir une famille
  s = await openBat(page, 'parcelle-1');
  R.check('après 5 jours travaillés : mûr, 4 Nourriture à récolter', s && s.now === 'C’est mûr : 4 Nourriture à récolter.' && !s.geste?.off, JSON.stringify(s));
  await geste(page);
  R.check('récolté : 4 Nourriture de plus, la parcelle est libre', await L.waitFor(() => {
    const g = srv.game();
    return g?.resources.food === g0.resources.food + 4 && !(g.parcelles || []).some((p) => p.id === 'parcelle-1');
  }, 5000), JSON.stringify(srv.game()?.resources));
  await closeBat(page);
  s = await openBat(page, 'chalet-1');
  R.check('chalet : « Accueillir une famille » possible maintenant', s && !s.geste?.off && /Personne n’y vit encore/.test(s.now), JSON.stringify(s));
  await geste(page);
  R.check('famille accueillie : 1 habitant, 18 Nourriture dépensées', await L.waitFor(() => {
    const g = srv.game();
    return g?.habitants === 1 && g.resources.food === g0.resources.food + 4 - 18;
  }, 5000), JSON.stringify({ h: srv.game()?.habitants, r: srv.game()?.resources }));
  s = await L.waitFor(async () => { const x = await sheet(page); return /^1 habitant sur 2/.test(x.now) ? x : null; }, 3000);
  R.check('la fiche le dit : « 1 habitant sur 2 »', !!s, JSON.stringify(await sheet(page)));
  R.check('le compteur Habitants affiche 1', await L.waitFor(async () => (await L.resValue(page, 'habitants')) === 1, 3000), String(await L.resValue(page, 'habitants')));
  R.check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await shot(page, '15-famille');
}, {
  tasks: TASKS,
  sandbox: true,
  game: (core) => ({
    ...L.quietState(core, MONDAY), resources: { energy: 10, materials: 40, food: 14 },
    premiersPas: Object.fromEntries(core.PAS_IDS.map((id) => [id, core.addDays(core.gameDay(MONDAY), -1)])),
  }),
  // les deux imprévus de la semaine sont déjà passés (une pêche ou un ours changeraient les comptes) : le scénario 37 les suit
  ledger: (core) => core.calendrierImprevus(ymd(0)).creneaux.map((c) => ({
    key: `imprevu:${c.jour}`, at: MONDAY.toISOString(), day: ymd(0), type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0,
  })),
});
