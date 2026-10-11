// 47. La vraie météo (lot Q), à l'écran. Une partie avec une ville fictive, et la prévision du jour déjà gardée par le
// serveur (data/meteo.json) : 5 cm de neige dans 3 jours. Aucun appel au vrai Open-Meteo : la prévision est posée avant le
// chargement, l'adresse du serveur vise un port fermé, et la recherche de ville (faite par le navigateur) est interceptée.
//   - au chargement, la tempête est notée dans la partie du serveur (source « meteo ») ; la rangée « Tempête dans 3 jours »
//     dit d'où elle vient (« Neige prévue à Village-Test. ») avec le lien de crédit d'Open-Meteo (nouvel onglet, 44 px) ;
//     Fanal l'annonce avec le nom de la ville (« tempete.meteo ») ; la carte en liste le dit aussi. Pendant la trêve des
//     Fêtes, rien n'est noté ni annoncé, et c'est ce qui est vérifié ;
//   - Réglages, « Météo du village » : la ville réglée (nom, région, pays, « Retirer ») ; le crédit et la phrase sur ce qui
//     part vers Open-Meteo ; champ vide, hors ligne, service en panne, aucun résultat : un message chacun, rien d'enregistré ;
//   - Entrée dans le champ cherche (sans enregistrer la feuille) : trois choix avec région et pays, de 44 px ; la requête ne
//     porte pas la page d'origine ; choisir une ville l'enregistre aussitôt dans la partie (coordonnées au centième), sans
//     rien au registre ni aux ressources ; le focus va sur la ville, la phrase lue le dit ; la tempête notée reste, et la
//     rangée nomme toujours la ville de sa prévision ;
//   - « Retirer » : la ville part de la partie, le focus va sur « Chercher », la phrase lue le dit ; au rechargement, plus
//     de ville ; aucun débordement horizontal.
// Données fictives seulement.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REPLIQUES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'), 'utf8'));
const TEXTES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'interface.json'), 'utf8'));
const tx = (k, vars = {}) => sp(TEXTES[k].replace(/\{(\w+)\}/g, (_, v) => vars[v]));
const VILLE = { nom: 'Village-Test', region: 'Région fictive', pays: 'Pays fictif', lat: 46.5, lon: -73.5 };
const TROUVEES = [
  { name: 'Village-Test', admin1: 'Région fictive', country: 'Pays fictif', latitude: 46.5, longitude: -73.5 },
  { name: 'Autre-Village', admin1: 'Autre région fictive', country: 'Autre pays fictif', latitude: 47.2512, longitude: -71.2488 },
  { name: 'Village-Test-des-Grands-Lacs-et-des-Montagnes-Bleues', admin1: 'Région', country: 'Pays', latitude: 47, longitude: -70 },
];

L.runScenario('47 · la vraie météo : tempête annoncée par la prévision, ville des Réglages', async ({ R, srv, tag, core, newPage, shot }) => {
  const { addDays, gameDay, isTruce } = core;
  const auj = gameDay(new Date());
  const J = addDays(auj, 3);
  const annoncee = !isTruce(J) && !isTruce(auj);
  const { page, context } = await newPage();
  await context.addInitScript(L.VOICES);
  page.expected.push(/status of 500/); // le service de recherche en panne, provoqué plus bas

  // tout ce qui part vers Open-Meteo depuis le navigateur ; la recherche répond selon `mode`
  const appels = [];
  let mode = 'ok';
  await context.route(/^https:\/\/([a-z-]+\.)?open-meteo\.com\//, async (r) => {
    const req = r.request();
    appels.push({ url: new URL(req.url()), headers: await req.allHeaders() });
    const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (mode === 'panne') return json(500, { error: true, reason: 'panne' });
    if (mode === 'vide') return json(200, { generationtime_ms: 0.1 });
    return json(200, { results: TROUVEES });
  });

  await page.goto(srv.url);
  await L.ready(page);

  // ───── la tempête venue de la prévision
  const notee = await L.waitFor(() => (srv.game()?.tempetes?.notees || []).find((t) => t.jour === J) || null, 8000);
  if (annoncee) {
    R.check(`tempête du ${J} notée dans la partie du serveur, source « meteo »`, notee && notee.source === 'meteo' && !notee.des, JSON.stringify(srv.game()?.tempetes));
    const variantes = REPLIQUES.situations['tempete.meteo'].variantes.map((v) => sp(v.texte.replace(/\{ville\}/g, VILLE.nom)));
    const mot = await L.waitFor(async () => {
      const m = sp(await page.evaluate(() => { const e = document.getElementById('speech'); return e.hidden ? '' : e.querySelector('.speech-text')?.textContent; }));
      return variantes.includes(m) ? m : null;
    }, 12000);
    R.check('Fanal annonce la tempête avec le nom de la ville (une variante de « tempete.meteo »)', !!mot);

    if (await page.locator('.bandeau-more').isVisible()) {
      await page.click('.bandeau-more');
      await page.waitForTimeout(500);
    }
    const b = await page.evaluate(() => {
      const s = (x) => String(x || '').replace(/\s+/g, ' ').trim();
      const box = document.getElementById('bandeau-alerte');
      const band = document.getElementById('bandeau').getBoundingClientRect();
      const src = box.querySelector('.bandeau-alerte-source');
      const a = src.querySelector('a');
      const r = a.getBoundingClientRect();
      return {
        titre: s(box.querySelector('.bandeau-alerte-titre').textContent), vue: !src.hidden && src.checkVisibility(),
        texte: s(src.querySelector('.bandeau-alerte-source-texte').textContent),
        lien: { texte: s(a.textContent), href: a.getAttribute('href'), target: a.target, rel: a.rel, h: Math.round(r.height), vu: a.checkVisibility() },
        coupe: [...box.querySelectorAll('*')].filter((e) => { const x = e.getBoundingClientRect(); return x.width && (x.left < band.left - 1 || x.right > band.right + 1); }).length,
        deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    R.check('rangée « Tempête dans 3 jours »', b.titre === 'Tempête dans 3 jours', b.titre);
    R.check('la rangée dit d’où vient la tempête : « Neige prévue à Village-Test. »', b.vue && b.texte === tx('bandeau.tempete.meteo', { ville: VILLE.nom }), JSON.stringify(b));
    R.check('crédit « Open-Meteo.com » : lien vers open-meteo.com, nouvel onglet, sans page d’origine, 44 px', b.lien.vu && b.lien.texte === 'Open-Meteo.com' && b.lien.href === 'https://open-meteo.com/'
      && b.lien.target === '_blank' && /noopener/.test(b.lien.rel) && /noreferrer/.test(b.lien.rel) && b.lien.h >= 44, JSON.stringify(b.lien));
    R.check('rangée : rien ne dépasse, aucun défilement horizontal', !b.coupe && !b.deborde, JSON.stringify(b));
    await shot(page, '47-bandeau');
    if (await page.evaluate(() => document.getElementById('bandeau').dataset.open === 'true') && await page.locator('.bandeau-more').isVisible()) {
      await page.click('.bandeau-more');
      await page.waitForTimeout(400);
    }

    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    await page.waitForTimeout(400);
    const lignes = await page.evaluate(() => [...document.querySelectorAll('#dlg-plan .ow-plan-summary li')].map((li) => li.textContent));
    R.check('carte en liste : « Neige prévue à Village-Test, selon Open-Meteo.com. »', lignes.map(sp).includes(tx('monde.plan.tempete.meteo', { ville: VILLE.nom })), JSON.stringify(lignes));
    await page.keyboard.press('Escape');
    await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-plan').open), 2000);
    await page.waitForTimeout(300);
  } else {
    R.check(`trêve des Fêtes : la neige du ${J} n’est ni notée ni annoncée`, !notee && await page.evaluate(() => !document.getElementById('bandeau').dataset.alerte), JSON.stringify(srv.game()?.tempetes));
  }

  // ───── Réglages : la ville réglée
  await L.openPanel(page);
  await page.click('[data-action="open-settings"]');
  await page.waitForSelector('#dlg-settings[open]');
  await page.waitForTimeout(600);
  const section = () => page.evaluate(() => {
    const s = (x) => String(x || '').replace(/\s+/g, ' ').trim();
    const f = document.getElementById('set-meteo');
    const v = f.querySelector('.meteo-ville');
    const a = f.querySelector('.meteo-credit a');
    return {
      legende: s(f.querySelector('legend').textContent), label: s(f.querySelector('label[for="set-ville"]').textContent),
      ville: v ? s(v.querySelector('b').textContent) : null, lieu: v ? s(v.querySelector('small')?.textContent) : null,
      retirer: v ? v.querySelector('[data-action="meteo-retirer"]').getAttribute('aria-label') : null,
      etat: s(f.querySelector('#set-meteo-etat').textContent), texte: s(f.textContent),
      credit: a ? { href: a.getAttribute('href'), target: a.target, rel: a.rel } : null,
      choix: f.querySelector('#set-meteo-choix').hidden ? [] : [...f.querySelectorAll('.meteo-choix-btn')].map((c) => ({ nom: s(c.querySelector('b').textContent), lieu: s(c.querySelector('small')?.textContent), label: c.getAttribute('aria-label') })),
      petits: [...f.querySelectorAll('button, input, a')].map((e) => [e, e.getBoundingClientRect()]).filter(([, r]) => r.width && r.height < 43.99).map(([e, r]) => `${e.dataset.action || e.id || e.tagName} ${Math.round(r.height)}`),
      focus: document.activeElement === v ? 'ville' : document.activeElement?.dataset?.action || document.activeElement?.id || '',
      deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth || [...document.querySelectorAll('#dlg-settings *')].some((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'auto'),
    };
  });
  let m = await section();
  R.check('Réglages : section « Météo du village »', m.legende === 'Météo du village', m.legende);
  R.check('la ville réglée : nom, région et pays, « Changer de ville »', m.ville === VILLE.nom && m.lieu === 'Région fictive, Pays fictif' && m.label === 'Changer de ville', JSON.stringify(m));
  R.check('« Retirer » nomme la ville pour le lecteur d’écran', sp(m.retirer) === 'Retirer la ville : Village-Test', m.retirer);
  R.check('la phrase dit le seuil (3 cm) et ce qui part vers Open-Meteo', m.texte.includes(tx('settings.meteo.hint', { cm: core.METEO.seuil })) && m.texte.includes(tx('settings.meteo.confidentialite')), m.texte.slice(0, 400));
  R.check('crédit : lien vers open-meteo.com, nouvel onglet, sans page d’origine', m.credit && m.credit.href === 'https://open-meteo.com/' && m.credit.target === '_blank' && /noreferrer/.test(m.credit.rel), JSON.stringify(m.credit));
  R.check('aucun appel à Open-Meteo depuis le navigateur avant une recherche', appels.length === 0, appels.map((a) => a.url.href).join(' '));

  const chercher = async (nom, par = 'bouton') => {
    await page.fill('#set-ville', nom);
    if (par === 'entree') await page.press('#set-ville', 'Enter');
    else await page.click('[data-action="meteo-chercher"]');
    await L.waitFor(async () => { const e = (await section()).etat; return e && e !== tx('settings.meteo.cherche'); }, 6000);
    return section();
  };

  m = await chercher('');
  R.check('champ vide : « Écris le nom de ta ville… », aucun appel', m.etat === tx('settings.meteo.vide') && appels.length === 0, m.etat);
  await context.setOffline(true);
  m = await chercher('Village');
  await context.setOffline(false);
  R.check('hors ligne : « La recherche demande le réseau… », aucun appel', m.etat === tx('settings.meteo.hors_ligne') && appels.length === 0, m.etat);
  mode = 'panne';
  m = await chercher('Village');
  R.check('service en panne : « Open-Meteo n’a pas répondu… », aucun choix', m.etat === tx('settings.meteo.echec') && !m.choix.length && appels.length === 1, JSON.stringify({ e: m.etat, n: appels.length }));
  mode = 'vide';
  m = await chercher('Zzz', 'entree');
  R.check('aucun résultat : « Aucune ville trouvée pour « Zzz »… »', m.etat === tx('settings.meteo.aucune', { nom: 'Zzz' }) && !m.choix.length, m.etat);
  mode = 'ok';
  m = await chercher('Village', 'entree');
  const q = appels.at(-1);
  R.check('Entrée cherche sans enregistrer : la feuille reste ouverte, la ville ne change pas', await page.evaluate(() => document.getElementById('dlg-settings').open) && srv.game()?.reglages?.ville?.nom === VILLE.nom, JSON.stringify(srv.game()?.reglages));
  R.check('la recherche vise le service de villes d’Open-Meteo (nom, 6 résultats, en français)', q.url.host === 'geocoding-api.open-meteo.com' && q.url.pathname === '/v1/search'
    && q.url.searchParams.get('name') === 'Village' && q.url.searchParams.get('count') === '6' && q.url.searchParams.get('language') === 'fr', q.url.href);
  R.check('la recherche ne porte pas la page d’origine', !q.headers.referer, JSON.stringify(q.headers));
  R.check('trois choix, avec région et pays', m.choix.length === 3 && m.etat === tx('settings.meteo.trouvees.other', { n: 3 }) && m.choix[1].nom === 'Autre-Village' && m.choix[1].lieu === 'Autre région fictive, Autre pays fictif', JSON.stringify(m.choix));
  R.check('chaque choix se nomme en entier pour le lecteur d’écran', sp(m.choix[1].label) === 'Choisir Autre-Village, Autre région fictive, Autre pays fictif', m.choix[1].label);
  R.check('Réglages : cibles de 44 px, aucun débordement horizontal', !m.petits.length && !m.deborde, JSON.stringify(m.petits));
  await shot(page, '47-choix');

  // ───── choisir une ville : enregistrée aussitôt
  const g0 = srv.game();
  const n0 = srv.ledger().length;
  await page.evaluate(() => { window.__said = []; });
  await page.click('#set-meteo-choix [data-i="1"]');
  const v2 = await L.waitFor(() => (srv.game()?.reglages?.ville?.nom === 'Autre-Village' ? srv.game().reglages.ville : null), 8000);
  R.check('ville choisie enregistrée dans la partie, coordonnées au centième', v2 && JSON.stringify(v2) === JSON.stringify({ nom: 'Autre-Village', region: 'Autre région fictive', pays: 'Autre pays fictif', lat: 47.25, lon: -71.25 }), JSON.stringify(v2));
  await page.waitForTimeout(300);
  m = await section();
  R.check('la section montre la nouvelle ville, le focus est sur elle', m.ville === 'Autre-Village' && m.focus === 'ville' && !m.choix.length, JSON.stringify({ v: m.ville, f: m.focus }));
  const lu = (await L.said(page)).filter((x) => sp(x.text).includes(tx('settings.saved.ville', { ville: 'Autre-Village' })));
  R.check('la phrase lue dit la ville choisie, depuis la feuille ouverte', lu.length >= 1 && lu.every((x) => x.sheet === 'dlg-settings'), JSON.stringify(await L.said(page)));
  if (annoncee) R.check('la tempête notée reste', (srv.game()?.tempetes?.notees || []).some((t) => t.jour === J && t.source === 'meteo'), JSON.stringify(srv.game()?.tempetes));
  R.check('rien au registre, ressources inchangées', srv.ledger().length === n0 && JSON.stringify(srv.game().resources) === JSON.stringify(g0.resources), JSON.stringify({ n0, n: srv.ledger().length, r: srv.game().resources }));
  if (annoncee) {
    const src = sp(await page.evaluate(() => document.querySelector('.bandeau-alerte-source-texte').textContent));
    R.check('la rangée nomme toujours la ville de la prévision (Village-Test), pas la nouvelle', src === tx('bandeau.tempete.meteo', { ville: VILLE.nom }), src);
  }

  // ───── retirer la ville
  await page.evaluate(() => { window.__said = []; });
  await page.click('[data-action="meteo-retirer"]');
  R.check('« Retirer » : la ville part de la partie', await L.waitFor(() => srv.game()?.reglages && !srv.game().reglages.ville, 8000), JSON.stringify(srv.game()?.reglages));
  await page.waitForTimeout(300);
  m = await section();
  R.check('sans ville : « Chercher ta ville », le focus est sur « Chercher »', m.ville === null && m.label === 'Chercher ta ville' && m.focus === 'meteo-chercher', JSON.stringify({ v: m.ville, l: m.label, f: m.focus }));
  const lu2 = (await L.said(page)).filter((x) => sp(x.text).includes(tx('settings.saved.ville.retiree')));
  R.check('la phrase lue dit que les tempêtes suivent de nouveau le calendrier', lu2.length >= 1 && lu2.every((x) => x.sheet === 'dlg-settings'), JSON.stringify(await L.said(page)));
  await shot(page, '47-sans-ville');
  await page.keyboard.press('Escape');
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-settings').open), 2000);

  await page.reload();
  await L.ready(page);
  await L.openPanel(page);
  await page.click('[data-action="open-settings"]');
  await page.waitForSelector('#dlg-settings[open]');
  await page.waitForTimeout(500);
  m = await section();
  R.check('au rechargement : toujours sans ville', m.ville === null && !srv.game()?.reglages?.ville, JSON.stringify(srv.game()?.reglages));
  R.check('le navigateur n’a appelé que la recherche de villes, une fois par recherche (3)', appels.length === 3 && appels.every((a) => a.url.host === 'geocoding-api.open-meteo.com'), appels.map((a) => a.url.href).join(' '));
  await page.keyboard.press('Escape');
  if (tag === 390) console.log('  (tempête attendue : ' + (annoncee ? J : 'aucune, trêve') + ')');
}, {
  game: (core) => {
    const { addDays, gameDay, PAS_IDS } = core;
    const auj = gameDay(new Date());
    const g = L.quietState(core, new Date());
    g.resources = { energy: 10, materials: 7, food: 5 };
    g.habitants = 2;
    g.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, addDays(auj, -30)]));
    g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }];
    g.lastSeenDay = addDays(auj, -1);
    g.reglages = { ville: VILLE };
    return g;
  },
  // les créneaux d'imprévus de ces deux semaines, déjà tirés il y a un mois (orignal sans effet) : rien ne vient se mêler
  ledger: (core) => {
    const { addDays, gameDay, weekStart, calendrierImprevus } = core;
    const auj = gameDay(new Date());
    const out = [];
    for (const lundi of new Set([weekStart(auj), weekStart(addDays(auj, 7))])) {
      for (const c of calendrierImprevus(lundi).creneaux) out.push({ key: `imprevu:${c.jour}`, at: new Date(Date.now() - 30 * 864e5).toISOString(), day: addDays(lundi, -30), type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0 });
    }
    return out;
  },
  meteo: (core) => {
    const { addDays, gameDay } = core;
    const auj = gameDay(new Date());
    const jours = {};
    for (let k = 0; k < 16; k++) jours[addDays(auj, k)] = k === 3 ? 5 : 0;
    return { lat: VILLE.lat, lon: VILLE.lon, lue: new Date().toISOString(), jours };
  },
});
