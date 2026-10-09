// 45. Ce que la Nourriture achète (lot N), à l'écran, le 16 mars (temps des sucres), réserve pleine (un grenier : elle
//   tient la partie de sucre et le repas), chalets pleins, sans cabane à sucre :
//   la case « Cette saison » du bandeau mène à la fiche de la Place ; la fiche porte la partie de sucre (son prix, ce
//   qu'elle laisse, « Faire la partie de sucre » en bouton secondaire), puis le repas de la semaine (15 Nourriture contre
//   15 Énergie, « Servir le repas ») ; chaque geste est payé une fois au serveur, la phrase lue le dit, sa ligne cochée prend
//   le focus ; l'île dresse la table de tire près de l'érable et la tablée sur la Place ; le bandeau dit l'objectif atteint ;
//   après rechargement, la fiche garde les deux lignes cochées.
// Données fictives seulement.
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const at = (day, h = 15) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`); // 10 ou 11 h à Montréal
const TASKS = (ref) => Array.from({ length: 3 }, (_, k) => ({
  id: `n${k}`, task: `Petite quête ordinaire ${k + 1}`, domain: 'Maison', difficulty: 2, length: 2, priority: 9 - k, status: 'todo', created: ref,
}));

// la fiche de la Place : ses deux blocs, leurs boutons, la ligne cochée, le focus, et aucun débordement
const place = (page) => page.evaluate(() => {
  const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const d = document.getElementById('dlg-quartier');
  const bloc = (sel, geste) => {
    const b = d.querySelector(sel);
    if (!b) return null;
    const btn = b.querySelector(`[data-geste="${geste}"]`);
    const r = btn && btn.getBoundingClientRect();
    return {
      titre: s(b.querySelector('h3')?.textContent), etat: b.dataset.etat || b.querySelector('.offre')?.dataset.etat || '',
      texte: s(b.textContent),
      bouton: btn ? { text: s(btn.textContent), off: btn.getAttribute('aria-disabled') === 'true', primaire: btn.classList.contains('btn--primary'), h: Math.round(r.height), w: Math.round(r.width) } : null,
      fait: s(b.querySelector('.commande-fait, .offre-fait')?.textContent),
    };
  };
  const wide = [...d.querySelectorAll('*')].some((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); });
  const blocs = [...d.querySelectorAll('.fete')].map((x) => [...x.classList].find((c) => c.startsWith('fete--')));
  return {
    open: d.open && !d.classList.contains('is-closing'), quartier: d.dataset.quartier, wide, blocs,
    sucres: bloc('.fete--sucres', 'faireLesSucres'), repas: bloc('.fete--repas', 'servirRepas'),
    focus: document.activeElement?.id || document.activeElement?.className || '',
  };
});
const ouvert = (page) => L.waitFor(async () => { const f = await place(page); return f.open && f.quartier === 'place' ? f : null; }, 3000);
const fermer = async (page) => {
  for (let k = 0; k < 3 && await page.evaluate(() => !!document.querySelector('dialog[open]')); k++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }
  await L.waitFor(() => page.evaluate(() => !document.querySelector('dialog[open]')), 3000);
};
const bandeau = (page) => page.evaluate(() => {
  const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const b = document.querySelector('.bandeau-sucres');
  // le bouton s'étend sur toute la case (::after) : la cible, c'est la case ; on la touche au coin et au libellé
  const r = b.closest('.bandeau-item').getBoundingClientRect();
  const touche = [[r.left + 6, r.top + 6], [r.left + r.width / 2, r.top + 8], [r.right - 6, r.bottom - 6]].every(([x, y]) => document.elementFromPoint(x, y)?.closest('.bandeau-sucres') === b);
  return {
    sucres: !b.hidden, vu: b.checkVisibility(), texte: s(b.textContent), label: b.getAttribute('aria-label'), h: Math.round(r.height), w: Math.round(r.width), touche,
    saison: s(document.getElementById('bandeau-saison').textContent), saisonVu: !document.querySelector('.bandeau-saison-texte').hidden,
  };
});

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const { addDays, weekStart, calendrierImprevus, gameDay, REPAS, OBJECTIFS_SAISON, saisonDe } = core;
  const auj = gameDay(new Date());
  const C = `${Number(auj.slice(0, 4)) + (auj.slice(5) >= '03-16' ? 1 : 0)}-03-16`; // le 16 mars qui suit aujourd'hui

  const village = () => {
    const g = L.quietState(core, at(C));
    g.habitants = 6;
    g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, addDays(C, -30)]));
    g.batiments = [...['chalet-1', 'chalet-2', 'chalet-3'].map((id) => ({ id, type: 'chalet' })), { id: 'atelier-1', type: 'atelier' }, { id: 'grenier-1', type: 'grenier' }, { id: 'quai-1', type: 'quai' }];
    g.habitants = core.logements(g).places; // chalets pleins : « les familles d'abord » ne retient rien (core/nourriture.js)
    g.lastSeenDay = addDays(C, -1);
    g.resources = { energy: 20, materials: 40, food: 0 };
    g.resources.food = core.stockage(g); // réserve pleine
    return g;
  };
  // les créneaux d'imprévus de la semaine, déjà tirés (orignal sans effet)
  const calme = () => calendrierImprevus(weekStart(C)).creneaux.map((c) => ({ key: `imprevu:${c.jour}`, at: at(addDays(C, -30)).toISOString(), day: addDays(C, -30), type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0 }));

  await L.runScenario('45. la Nourriture : partie de sucre et repas de la semaine, depuis la Place', async ({ R, srv, newPage, shot, tag }) => {
    const g0 = srv.game();
    const prix = core.prixPartieDeSucre(g0, core.objectifSaison(g0, srv.ledger(), at(C)).ralenti);
    R.check('départ : les deux gestes sont permis par le cœur', !core.refusFaireLesSucres(g0, srv.ledger(), {}, at(C)) && !core.refusServirRepas(g0, srv.ledger(), {}, at(C)),
      JSON.stringify([core.refusFaireLesSucres(g0, srv.ledger(), {}, at(C)), core.refusServirRepas(g0, srv.ledger(), {}, at(C))]));
    const { page } = await newPage();
    await page.addInitScript(L.VOICES);
    await page.clock.install({ time: at(C) });
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await page.waitForTimeout(800);

    // ───── le bandeau : au temps des sucres, la case de la saison mène à la Place
    const b0 = await bandeau(page);
    R.check('bandeau : la case des sucres remplace le texte de la saison ; réserve pleine, « Faire la partie de sucre »', b0.sucres && !b0.saisonVu && b0.texte === 'Faire la partie de sucre', JSON.stringify(b0));
    R.check('bandeau : son nom lu mène à la fiche de la Place', b0.label && /Ouvrir la fiche de la Place\.$/.test(sp(b0.label)), b0.label);
    if (!b0.vu) await page.click('.bandeau-more'); // téléphone : le bandeau compact cache la saison
    await page.waitForTimeout(350);
    const b1 = await bandeau(page);
    R.check('la case des sucres se voit ; toute la case (au moins 44 px) se touche', b1.vu && b1.h >= 44 && b1.w >= 44 && b1.touche, JSON.stringify(b1));
    await page.click('.bandeau-sucres');
    const f0 = await ouvert(page);
    R.check('toucher la case ouvre la fiche de la Place', !!f0, JSON.stringify(f0));
    if (!f0) return;
    R.check('la partie de sucre d’abord, puis le repas de la semaine', f0.blocs.join() === 'fete--sucres,fete--repas', f0.blocs.join());
    R.check(`partie de sucre : demande ${prix} Nourriture, laisse la récompense du printemps`, f0.sucres && new RegExp(`Demande\\s*${prix} Nourriture`).test(f0.sucres.texte)
      && new RegExp(`Laisse\\s*${OBJECTIFS_SAISON.printemps.recompense.energy} Énergie`).test(f0.sucres.texte), f0.sucres && f0.sucres.texte);
    R.check('« Faire la partie de sucre » : actif, secondaire, 44 px', f0.sucres?.bouton && f0.sucres.bouton.text === 'Faire la partie de sucre' && !f0.sucres.bouton.off && !f0.sucres.bouton.primaire && f0.sucres.bouton.h >= 44, JSON.stringify(f0.sucres?.bouton));
    R.check(`repas : ${REPAS.donne.food} Nourriture contre ${REPAS.recoit.energy} Énergie ; « Servir le repas » actif, 44 px`, f0.repas && f0.repas.titre === 'Le repas de la semaine'
      && new RegExp(`${REPAS.donne.food} Nourriture.*${REPAS.recoit.energy} Énergie`).test(f0.repas.texte) && f0.repas.bouton && f0.repas.bouton.text === 'Servir le repas' && !f0.repas.bouton.off && f0.repas.bouton.h >= 44 && f0.repas.bouton.w >= 44,
      JSON.stringify(f0.repas));
    R.check('rien ne déborde de la fiche', !f0.wide);
    await page.locator('#dlg-quartier .fete--sucres').scrollIntoViewIfNeeded();
    await shot(page, '45-place-avant');

    // ───── la partie de sucre
    await L.said(page, true);
    await page.click('#dlg-quartier [data-geste="faireLesSucres"]');
    const faite = await L.waitFor(() => srv.game().sucres === saisonDe(C).cle, 5000);
    R.check('partie de sucre : notée au serveur pour ce printemps', !!faite, JSON.stringify(srv.game().sucres));
    const g1 = srv.game();
    R.check(`payée une fois : ${prix} Nourriture`, Math.round((g0.resources.food - g1.resources.food) * 10) / 10 === prix, JSON.stringify([g0.resources.food, g1.resources.food]));
    await page.waitForTimeout(700);
    const v1 = await L.voice(page); // fiche ouverte : la phrase passe par son double dans la feuille
    R.check('la phrase lue dit la partie de sucre, et un lecteur d’écran la reçoit', new RegExp(`Partie de sucre faite : ${prix} Nourriture partagées autour de la tire`).test(sp(v1.text)) && v1.ignored === false, JSON.stringify(v1));
    const f1 = await place(page);
    R.check('la ligne cochée prend sa place et le focus', f1.sucres && f1.sucres.etat === 'fait' && f1.sucres.fait === 'Partie de sucre faite Les érables se reposent jusqu’au printemps prochain.' && !f1.sucres.bouton && f1.focus === 'sucres-etat', JSON.stringify([f1.sucres, f1.focus]));

    // ───── le repas de la semaine
    R.check('après la partie, le repas reste permis (réserve assez grande)', f1.repas?.bouton && !f1.repas.bouton.off, JSON.stringify(f1.repas));
    if (!f1.repas?.bouton || f1.repas.bouton.off) return;
    await page.click('#dlg-quartier [data-geste="servirRepas"]');
    const servi = await L.waitFor(() => srv.ledger().some((e) => e.key === `repas:${weekStart(C)}`), 5000);
    R.check('repas : inscrit au registre sous repas:{lundi}', !!servi, JSON.stringify(srv.ledger().map((e) => e.key)));
    const g2 = srv.game();
    R.check(`payé une fois : ${REPAS.donne.food} Nourriture contre ${REPAS.recoit.energy} Énergie`, Math.round((g1.resources.food - g2.resources.food) * 10) / 10 === REPAS.donne.food
      && Math.round((g2.resources.energy - g1.resources.energy) * 10) / 10 === REPAS.recoit.energy, JSON.stringify([g1.resources, g2.resources]));
    await page.waitForTimeout(700);
    const v2 = await L.voice(page);
    R.check('la phrase lue dit le repas, et un lecteur d’écran la reçoit', new RegExp(`Repas servi sur la Place : ${REPAS.donne.food} Nourriture contre ${REPAS.recoit.energy} Énergie`).test(sp(v2.text)) && v2.ignored === false, JSON.stringify(v2));
    const f2 = await place(page);
    R.check('« Servi cette semaine » prend sa place et le focus', f2.repas && f2.repas.etat === 'fait' && f2.repas.fait === 'Servi cette semaine' && !f2.repas.bouton && f2.focus === 'repas-etat', JSON.stringify([f2.repas, f2.focus]));
    R.check('rien ne déborde de la fiche, après', !f2.wide);
    await shot(page, '45-place-apres');
    await fermer(page);

    // ───── l'île et le bandeau
    await page.waitForTimeout(600);
    const ile = await page.evaluate(() => ['fete-repas', 'fete-tire', 'fete-tire-cabane'].filter((id) => document.querySelector(`.ow-ent[data-id="${id}"]`)));
    R.check('l’île dresse la tablée sur la Place et la table de tire près de l’érable', ile.join() === 'fete-repas,fete-tire', ile.join());
    const b2 = await bandeau(page);
    R.check('bandeau : objectif atteint, la case des sucres disparaît', !b2.sucres && b2.saisonVu && b2.saison === 'Partie de sucre faite', JSON.stringify(b2));
    R.check('aucun défilement horizontal', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
    await shot(page, '45-ile');

    // ───── rechargement : la fiche (par la carte en liste) garde les deux lignes cochées
    await page.reload();
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await page.waitForTimeout(600);
    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    await page.locator('#dlg-plan .ow-plan-open[data-quartier="place"]').click();
    const f3 = await ouvert(page);
    R.check('après rechargement : la partie de sucre et le repas restent cochés', f3 && f3.sucres?.etat === 'fait' && f3.repas?.etat === 'fait', JSON.stringify(f3 && [f3.sucres, f3.repas]));
    await fermer(page);
  }, { tasks: TASKS(C), game: () => village(), ledger: calme() });
})();
