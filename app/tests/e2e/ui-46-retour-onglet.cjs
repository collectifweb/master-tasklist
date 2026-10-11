// 46. Retour sur un onglet resté caché (lot J, relecture) : la tablette, cachée depuis la veille, revient au premier plan
//   après qu'un autre appareil a déjà ouvert le jeu aujourd'hui (le village a produit, la lettre est lue). Elle relit le
//   serveur avant de jouer le nouveau jour : aucun gain affiché puis retiré (ni phrase « Gains » lue, ni compteur d'Énergie
//   au-dessus de celui du serveur), pas de seconde lettre ; la production et l'ouverture du jour restent écrites une fois.
// Données fictives seulement.
const path = require('node:path');
const L = require('./lib.cjs');

const at = (day, h = 15) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`); // 10 ou 11 h à Montréal
const TASKS = (ref) => Array.from({ length: 3 }, (_, k) => ({
  id: `r${k}`, task: `Petite quête ordinaire ${k + 1}`, domain: 'Maison', difficulty: 2, length: 2, priority: 8 - k, status: 'todo', created: ref,
}));
// la visibilité de la page, commandée par le scénario : un onglet caché, puis de retour
const VISIBILITE = () => {
  window.__vis = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__vis === 'hidden' });
};
const montrer = (page, v) => page.evaluate((v) => { window.__vis = v; document.dispatchEvent(new Event('visibilitychange')); }, v);
// relevé, à partir de maintenant : phrases lues, valeurs du compteur d'Énergie, lettre ouverte
const releve = (page) => page.evaluate(() => {
  const r = window.__releve = { lu: [], energie: [], lettre: false };
  const live = document.getElementById('live');
  new MutationObserver(() => { const s = live.textContent.trim(); if (s) r.lu.push(s); }).observe(live, { childList: true, characterData: true, subtree: true });
  const val = document.querySelector('.res[data-res="energie"] .res-value');
  const lire = () => Number(val.firstChild.nodeValue.replace(/\s/g, '').replace(',', '.'));
  r.energie.push(lire());
  new MutationObserver(() => r.energie.push(lire())).observe(val, { childList: true, characterData: true, subtree: true });
  const dl = document.getElementById('dlg-letter');
  new MutationObserver(() => { if (dl.open) r.lettre = true; }).observe(dl, { attributes: true, attributeFilter: ['open'] });
});

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const { addDays, gameDay, weekStart, calendrierImprevus } = core;
  const auj = gameDay(new Date());
  const veille = addDays(auj, -1);

  const game = () => {
    const g = L.quietState(core, at(veille));
    g.resources = { energy: 20, materials: 20, food: 5 };
    g.habitants = 3;
    g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, addDays(veille, -30)]));
    g.batiments = [...['chalet-1', 'chalet-2'].map((id) => ({ id, type: 'chalet' })), { id: 'atelier-1', type: 'atelier' }, { id: 'eolienne-1', type: 'eolienne' }];
    g.lastSeenDay = addDays(veille, -1);
    return g;
  };
  // les imprévus des semaines en jeu, déjà tirés (une panne arrêterait l'éolienne)
  const ledger = () => [...new Set([weekStart(veille), weekStart(auj)])].flatMap((lundi) => calendrierImprevus(lundi).creneaux.map((c) => ({
    key: `imprevu:${c.jour}`, at: at(addDays(lundi, -30)).toISOString(), day: addDays(lundi, -30), type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0,
  })));

  await L.runScenario('46. retour sur un onglet resté caché depuis la veille', async ({ R, srv, newPage }) => {
    // la tablette : ouverte la veille, puis cachée
    const { page: pa, context: ca } = await newPage({}, {});
    await ca.addInitScript(VISIBILITE);
    await pa.clock.install({ time: at(veille) });
    await pa.goto(srv.url);
    await L.ready(pa);
    await L.closeWelcome(pa, 1500);
    R.check('la veille, la tablette fait tourner l’éolienne', !!await L.waitFor(() => srv.ledger().some((e) => e.key === `prod:eolienne:${veille}`), 5000), JSON.stringify(srv.ledger().map((e) => e.key)));
    await montrer(pa, 'hidden');
    await pa.clock.setSystemTime(at(auj));

    // le téléphone : ouvre le jeu aujourd'hui, le village produit, la lettre est lue
    const { page: pb, context: cb } = await newPage({}, {});
    await pb.clock.install({ time: at(auj) });
    await pb.goto(srv.url);
    await L.ready(pb);
    await L.closeWelcome(pb, 2500);
    R.check('aujourd’hui, le téléphone fait tourner l’éolienne', !!await L.waitFor(() => srv.ledger().some((e) => e.key === `prod:eolienne:${auj}`), 5000), JSON.stringify(srv.ledger().map((e) => e.key)));
    await pb.waitForTimeout(800);
    await cb.close();

    // la tablette revient au premier plan
    await releve(pa);
    await montrer(pa, 'visible');
    await pa.waitForTimeout(5000);
    const r = await pa.evaluate(() => window.__releve);
    const g = srv.game();
    const une = (cle) => srv.ledger().filter((e) => e.key === cle).length === 1;
    R.check('serveur : la production et l’ouverture du jour écrites une seule fois', une(`prod:eolienne:${auj}`) && une(`bonus:ouverture:${auj}`), JSON.stringify(srv.ledger().map((e) => e.key)));
    R.check('tablette : aucune phrase de gains lue au retour', !r.lu.some((s) => /Gains/.test(s)), JSON.stringify(r.lu));
    R.check('tablette : le compteur d’Énergie ne dépasse jamais celui du serveur', Math.max(...r.energie) <= Math.floor(g.resources.energy), `${JSON.stringify(r.energie)} serveur ${g.resources.energy}`);
    R.check('tablette : le compteur d’Énergie finit sur celui du serveur', r.energie.at(-1) === Math.floor(g.resources.energy), `${JSON.stringify(r.energie)} serveur ${g.resources.energy}`);
    R.check('tablette : pas de seconde lettre du jour', !r.lettre);
    await ca.close();
  }, { tasks: TASKS(veille), game, ledger });
})();
