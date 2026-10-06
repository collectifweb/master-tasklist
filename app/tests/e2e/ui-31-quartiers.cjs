// 31. Niveaux de quartier achetés par permis.
//   - compteur « Permis » de la barre des ressources (et plus de pastille sur « Construire ») ; plaques « Champs · niv. 0 », sans barre ;
//   - toucher une plaque ouvre la fiche du quartier : ce qu'il fait, le niveau suivant, son prix, les permis ;
//   - achat : un double toucher n'achète qu'un niveau ; la phrase « Champs : niveau 1. … » est lue dans la feuille ;
//     plaque, compteur et fiche à jour, le bouton d'achat reste à sa place et garde le focus ; le niveau suivant, trop cher, reste visible avec
//     le cadenas et la raison du cœur, redite au toucher, sans rien acheter ;
//   - même chemin au clavier par « Construire » → Quartiers (la fiche s'empile sur le catalogue, Échap la referme
//     seule) et par « Vue » → Carte en liste ; « Voir les quêtes » ferme toutes les feuilles et filtre la liste ;
//   - cibles de 44 px, aucun défilement horizontal. Données fictives seulement.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const q = (id, task, domain, priority) => ({ id, task, domain, difficulty: 3, length: 2, priority, status: 'todo', created: day(-2) });
const TASKS = [
  q('c1', 'Ratisser les feuilles', 'Terrain', 6),
  q('c2', 'Changer une ampoule', 'Maison', 5),
  q('c3', 'Payer une facture', 'Administratif', 4),
  q('c4', 'Vérifier la pression des pneus', 'Véhicule', 3),
];
const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Fiche ouverte : identité, lignes, bouton d'achat, cibles et débordement. */
const fiche = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-quartier');
  const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const b = d.querySelector('[data-action="qrt-monter"]');
  const raison = d.querySelector('#qrt-raison');
  const small = [...d.querySelectorAll('button')].map((x) => [x, x.getBoundingClientRect()])
    .filter(([, r]) => r.width && (r.width < 43.99 || r.height < 43.99)).map(([x, r]) => `${x.dataset.action || x.className} ${r.width.toFixed(0)}×${r.height.toFixed(0)}`);
  const wide = [...d.querySelectorAll('*')].some((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); });
  const z = [...document.querySelectorAll('dialog.sheet[open]')].sort((a, b2) => (a._z || 0) - (b2._z || 0)).map((x) => x.id);
  return {
    open: d.open && !d.classList.contains('is-closing'), quartier: d.dataset.quartier, niveau: d.dataset.niveau,
    titre: sp(d.querySelector('#qrt-t')?.textContent), ligne: sp(d.querySelector('#qrt-d')?.textContent),
    corps: [...d.querySelectorAll('.qrt-body .help-line')].map((l) => [l.querySelector('dt'), ...l.querySelector('dd').children].map((x) => sp(x.textContent)).join(' ')).join(' '),
    permis: sp(d.querySelector('#qrt-permis')?.textContent),
    monter: b ? { text: sp(b.textContent), niveau: b.dataset.niveau, off: b.getAttribute('aria-disabled') === 'true', primaire: b.classList.contains('btn--primary'), desc: b.getAttribute('aria-describedby'), lock: !!b.querySelector('use[href$="#i-lock"]') } : null,
    raison: raison ? { text: sp(raison.textContent), lock: !!raison.querySelector('use[href$="#i-lock"]') } : null,
    max: sp(d.querySelector('.qrt-max')?.textContent),
    monte: (() => { const p = d.querySelector('.qrt-monte'); if (!p) return null; const r = p.getBoundingClientRect(); return { text: sp(p.textContent), check: !!p.querySelector('use[href$="#i-check"]'), premier: p === d.querySelector('.qrt-body').firstElementChild, vu: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight }; })(),
    quetes: sp(d.querySelector('[data-action="qrt-quetes"]')?.textContent),
    focus: document.activeElement && d.contains(document.activeElement) ? (document.activeElement.dataset.action || document.activeElement.className) : null,
    focusNiveau: document.activeElement?.dataset?.niveau || null,
    small, wide, pile: z, scroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
const plaque = (page, s) => page.evaluate((s) => {
  const b = document.querySelector(`.ow-plaque[data-sector="${s}"]`);
  const tx = (sel) => (b.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
  return { label: b.getAttribute('aria-label'), niveau: b.dataset.niveau, text: [tx('.ow-plaque-name'), tx('.ow-plaque-sep'), tx('.ow-plaque-val')].join(' '), barre: !!b.querySelector('.ow-plaque-bar') };
}, s);
/** Compteur « Permis » de la barre des ressources, et « Construire » (qui ne porte plus de pastille). */
const badge = (page) => page.evaluate(() => {
  const r = document.querySelector('.res[data-res="permis"]');
  const b = document.querySelector('[data-ow="build"]');
  return { text: r.querySelector('.res-value').textContent.trim(), label: r.getAttribute('aria-label'), pastille: !!b.querySelector('.ow-badge'), build: b.getAttribute('aria-label') };
});
/** Centre touchable d'une plaque (rien par-dessus), ou null. */
const hit = (page, s) => page.evaluate((s) => {
  const b = document.querySelector(`.ow-plaque[data-sector="${s}"]`);
  const r = b.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const at = document.elementFromPoint(x, y);
  return at && b.contains(at) ? [x, y] : null;
}, s);
const closed = (page, id) => L.waitFor(() => page.evaluate((id) => !document.getElementById(id).open, id), 2000);

L.runScenario('31. Niveaux de quartier : fiche, achat par permis, catalogue et carte en liste', async ({ R, srv, newPage, tag, shot }) => {
  const compact = tag < 1000;
  const { page, context } = await newPage({}, { hasTouch: true, isMobile: compact });
  await context.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(page);
  await page.waitForTimeout(500);

  // ───── compteur des permis et plaques
  let bd = await badge(page);
  R.check('compteur « Permis : 3 » dans la barre ; « Construire » sans pastille ni chiffre', bd.text === '3' && bd.label === 'Permis\u00a0: 3' && !bd.pastille && bd.build === 'Construire', JSON.stringify(bd));
  let pc = await plaque(page, 'champs');
  R.check('plaque des Champs : « Champs · niv. 0 », lue « Champs : niveau 0. », sans barre', pc.text === 'Champs · niv. 0' && pc.label === 'Champs : niveau 0.' && pc.niveau === '0' && !pc.barre, JSON.stringify(pc));
  const pg = await plaque(page, 'garage');
  R.check('plaque du Garage : son niveau acheté (2)', pg.text === 'Garage · niv. 2' && pg.label === 'Garage : niveau 2.', JSON.stringify(pg));

  // ───── toucher la plaque des Champs : la fiche
  if (!(await hit(page, 'champs'))) { await page.click('[data-ow="quetes"]'); await page.waitForTimeout(450); } // le panneau la couvre
  const pt = await hit(page, 'champs');
  R.check('la plaque des Champs est touchable', !!pt);
  if (compact && pt) await page.touchscreen.tap(pt[0], pt[1]); else await page.click('.ow-plaque[data-sector="champs"]');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await page.waitForTimeout(450);
  let f = await fiche(page);
  R.check('toucher la plaque ouvre la fiche des Champs', f.open && f.quartier === 'champs' && f.titre === 'Champs', JSON.stringify(f));
  R.check('en-tête : « Quartier · quêtes Terrain · niveau 0 »', f.ligne === 'Quartier · quêtes Terrain · niveau 0', f.ligne);
  R.check('ce qu’il fait : « Rien encore. » ; niveau 1 : 5 Nourriture par récolte', /^Ce qu’il fait Rien encore\./.test(f.corps) && /Niveau 1 5 Nourriture par récolte du potager\./.test(f.corps), f.corps);
  R.check('prix : 1 permis, 100 Énergie et 75 Matériaux', /Prix 1 permis, 100 Énergie et 75 Matériaux\./.test(f.corps), f.corps);
  R.check('permis : « Tu as 3 permis. » et le prochain', /^Tu as 3 permis\. Le prochain : (encore \d+ jours? travaillés?|avec ta prochaine quête payée)\.$/.test(f.permis), f.permis);
  R.check('« Monter au niveau 1 » : bouton principal actif, décrit par le prix', f.monter && f.monter.text === 'Monter au niveau 1' && !f.monter.off && f.monter.primaire && f.monter.desc === 'qrt-prix qrt-permis', JSON.stringify(f.monter));
  R.check('« Voir les quêtes Terrain (1) »', f.quetes === 'Voir les quêtes Terrain (1)', f.quetes);
  R.check('fiche : cibles de 44 px, aucun défilement horizontal', !f.small.length && !f.wide && !f.scroll, JSON.stringify({ small: f.small, wide: f.wide, scroll: f.scroll }));
  R.check('fiche : une région lue dans la feuille', await page.evaluate(() => !!document.querySelector('#dlg-quartier > [data-live][role="status"]')));
  await shot(page, '31-fiche');

  // ───── achat par un double toucher : un seul niveau
  await L.said(page, true);
  const g0 = srv.game();
  const go = await page.evaluate(() => { const r = document.querySelector('#dlg-quartier [data-action="qrt-monter"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.touchscreen.tap(go[0], go[1]);
  await page.waitForTimeout(90);
  await page.touchscreen.tap(go[0], go[1]);
  R.check('achat enregistré : Champs au niveau 1', await L.waitFor(() => srv.game()?.niveaux?.champs === 1, 6000), JSON.stringify(srv.game()?.niveaux));
  await page.waitForTimeout(1200);
  let g = srv.game();
  R.check('double toucher : un seul niveau payé (1 permis, 100 Énergie, 75 Matériaux)', g.niveaux.champs === 1 && g.permis.dispo === g0.permis.dispo - 1 && g.resources.energy === g0.resources.energy - 100 && g.resources.materials === g0.resources.materials - 75, JSON.stringify({ n: g.niveaux, avant: [g0.permis, g0.resources], apres: [g.permis, g.resources] }));
  let dits = (await L.said(page)).filter((x) => /^Champs : niveau/.test(sp(x.text)));
  R.check('annonce « Champs : niveau 1. 5 Nourriture par récolte du potager. », une seule fois, dans la fiche', dits.length === 1 && sp(dits[0].text).startsWith('Champs : niveau 1. 5 Nourriture par récolte du potager.') && dits[0].sheet === 'dlg-quartier', JSON.stringify(await L.said(page)));
  const v = await L.voice(page, 'live');
  R.check('… et un lecteur d’écran la reçoit (région non inerte)', v.sheet === 'dlg-quartier' && v.ignored === false, JSON.stringify(v));
  pc = await plaque(page, 'champs');
  R.check('plaque à jour : « Champs · niv. 1 », lue « Champs : niveau 1. »', pc.text === 'Champs · niv. 1' && pc.label === 'Champs : niveau 1.' && pc.niveau === '1', JSON.stringify(pc));
  await L.waitFor(async () => (await badge(page)).text === '2', 4000); // le compteur monte à l'impact, après l'écriture
  bd = await badge(page);
  R.check('compteur à jour : « Permis : 2 »', bd.text === '2' && bd.label === 'Permis\u00a0: 2' && !bd.pastille && bd.build === 'Construire', JSON.stringify(bd));
  const apres = await page.evaluate(() => { const r = document.querySelector('#dlg-quartier [data-action="qrt-monter"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  R.check('le bouton d’achat n’a pas bougé après l’achat (second toucher sur le même bouton)', Math.abs(apres[0] - go[0]) <= 1 && Math.abs(apres[1] - go[1]) <= 1, JSON.stringify({ avant: go, apres }));
  f = await fiche(page);
  R.check('fiche à jour sur place : niveau 1, ce qu’il fait, niveau 2 à 2 permis', f.open && f.ligne.endsWith('niveau 1') && /Ce qu’il fait 5 Nourriture par récolte du potager \(\d+ au départ\)\./.test(f.corps) && /Prix 2 permis, 200 Énergie et 150 Matériaux\./.test(f.corps) && /^Tu as 2 permis\./.test(f.permis), JSON.stringify(f));
  // la fiche a une hauteur fixe dès 700 px : la ligne de réussite ne la fait plus grandir ni descendre son bouton
  R.check('le focus reste sur le bouton (« Monter au niveau 2 »)', f.focus === 'qrt-monter' && f.focusNiveau === '2', JSON.stringify({ focus: f.focus, n: f.focusNiveau }));
  R.check('niveau 2 achetable : bouton actif', f.monter && !f.monter.off && f.monter.niveau === '2', JSON.stringify(f.monter));
  R.check('réussite visible dans la fiche : coche et « Champs : niveau 1. 5 Nourriture par récolte du potager. », en tête, à l’écran', f.monte && f.monte.check && f.monte.premier && f.monte.vu && f.monte.text === 'Champs : niveau 1. 5 Nourriture par récolte du potager.', JSON.stringify(f.monte));
  await shot(page, '31-achat');

  // ───── niveau 2, puis le 3 trop cher : cadenas et raison du cœur
  await L.said(page, true);
  await page.click('#dlg-quartier [data-action="qrt-monter"]');
  R.check('niveau 2 acheté', await L.waitFor(() => srv.game()?.niveaux?.champs === 2, 6000));
  await page.waitForTimeout(900);
  f = await fiche(page);
  R.check('niveau 3 trop cher : bouton à plat, aria-disabled, cadenas, décrit par la raison', f.monter && f.monter.off && !f.monter.primaire && f.monter.lock && f.monter.desc === 'qrt-raison' && f.monter.text === 'Monter au niveau 3', JSON.stringify(f.monter));
  R.check('le focus reste sur le bouton après l’achat (« Monter au niveau 3 », verrouillé)', f.focus === 'qrt-monter' && f.focusNiveau === '3', JSON.stringify({ focus: f.focus, n: f.focusNiveau }));
  R.check('réussite du niveau 2 visible en tête de la fiche', f.monte && f.monte.check && f.monte.premier && f.monte.vu && /^Champs : niveau 2\. \d+ Nourriture par récolte du potager\.$/.test(f.monte.text), JSON.stringify(f.monte));
  g = srv.game();
  const raison = `Il manque 3 permis, ${225 - g.resources.materials} Matériaux et ${300 - g.resources.energy} Énergie.`;
  R.check('raison écrite par le cœur, avec le cadenas', f.raison && f.raison.lock && f.raison.text === raison, JSON.stringify({ vu: f.raison, attendu: raison }));
  R.check('« Tu n’as aucun permis. »', /^Tu n’as aucun permis\./.test(f.permis), f.permis);
  await L.waitFor(async () => (await badge(page)).text === '0', 4000);
  bd = await badge(page);
  R.check('plus de permis : le compteur dit « Permis : 0 », « Construire » reste « Construire »', bd.text === '0' && bd.label === 'Permis\u00a0: 0' && !bd.pastille && bd.build === 'Construire', JSON.stringify(bd));
  await shot(page, '31-refus');
  const g2 = JSON.stringify(srv.game());
  await L.said(page, true);
  await page.click('#dlg-quartier [data-action="qrt-monter"]', { force: true }); // aria-disabled : Playwright attendrait
  await page.waitForTimeout(600);
  const redit = (await L.said(page)).find((x) => /Il manque 3 permis/.test(x.text));
  R.check('toucher le bouton verrouillé redit la raison, dans la fiche', redit && redit.sheet === 'dlg-quartier', JSON.stringify(await L.said(page)));
  R.check('… et n’achète rien', JSON.stringify(srv.game()) === g2);
  await page.keyboard.press('Escape');
  R.check('Échap ferme la fiche', await closed(page, 'dlg-quartier'));

  // ───── filtres déjà posés dans la liste (« Faites », une recherche, « 15 min ») : « Voir les quêtes » les retire plus bas
  await page.waitForTimeout(400);
  await L.openPanel(page);
  await page.click('.seg-option:has(input[value="done"])');
  await page.fill('#search', 'zz');
  await page.click('.chip[data-filter="quick"]');
  if (compact) { await page.click('.panel-toggle'); await page.waitForTimeout(450); }

  // ───── clavier : « Construire » → Quartiers ; la fiche s'empile sur le catalogue
  await page.waitForTimeout(400);
  await page.focus('[data-ow="build"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#dlg-construire[open]');
  await page.waitForTimeout(450);
  const cat = await page.evaluate(() => {
    const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const d = document.getElementById('dlg-construire');
    return {
      permis: sp(d.querySelector('#cat-permis').textContent),
      titre: sp(d.querySelector('#cat-qrts-t')?.textContent),
      rows: [...d.querySelectorAll('.cat-qrt')].map((li) => {
        const b = li.querySelector('.cat-qrt-go'), r = b.getBoundingClientRect();
        const e = li.querySelector('.cat-etat');
        return { q: li.dataset.quartier, nom: sp(li.querySelector('.cat-nom').textContent), suivant: sp(li.querySelector('.cat-suivant').textContent), prix: li.querySelector('.cat-prix').hidden ? '' : sp(li.querySelector('.cat-prix').textContent), w: r.width, h: r.height,
          etat: e && !e.hidden ? sp(e.textContent) : '', data: li.dataset.etat || '', lock: !!e?.querySelector('use[href$="#i-lock"]') };
      }),
      wide: [...d.querySelectorAll('*')].some((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }),
      bats: d.querySelectorAll('.cat-row').length,
    };
  });
  const row = (id) => cat.rows.find((r) => r.q === id) || {};
  R.check('catalogue : en tête, les permis (« Tu n’as aucun permis. … »)', /^Tu n’as aucun permis\. Le prochain/.test(cat.permis), cat.permis);
  R.check('catalogue : section « Quartiers », six lignes, après les 7 bâtiments', cat.titre === 'Quartiers' && cat.rows.map((r) => r.q).join() === 'champs,atelier,mairie,ecole,garage,place' && cat.bats === 7, JSON.stringify(cat.rows.map((r) => r.q)));
  R.check('ligne des Champs : niveau, effet suivant et prix', row('champs').nom === 'Champs · niveau 2' && row('champs').suivant === 'Niveau 3 : 7 Nourriture par récolte du potager' && row('champs').prix === '3 permis, 300 Énergie et 225 Matériaux', JSON.stringify(row('champs')));
  R.check('ligne du Garage : le plus haut pour l’instant, sans prix', row('garage').nom === 'Garage · niveau 2' && row('garage').suivant === 'Le plus haut pour l’instant' && row('garage').prix === '', JSON.stringify(row('garage')));
  const manque = (await (async () => { const g = srv.game(); return `Il manque 3 permis, ${225 - g.resources.materials} Matériaux et ${300 - g.resources.energy} Énergie.`; })());
  R.check('ligne des Champs : ce qui manque (la phrase de la fiche), avec le cadenas', row('champs').data === 'verrou' && row('champs').lock && row('champs').etat === manque, JSON.stringify({ vu: row('champs'), attendu: manque }));
  R.check('ligne de l’Atelier : « Il manque 1 permis… », cadenas', row('atelier').data === 'verrou' && row('atelier').lock && /^Il manque 1 permis/.test(row('atelier').etat), JSON.stringify(row('atelier')));
  R.check('ligne du Garage : pas de ligne d’état (déjà au plus haut)', row('garage').etat === '' && row('garage').data === '', JSON.stringify(row('garage')));
  R.check('lignes des quartiers : cibles de 44 px, aucun débordement', cat.rows.every((r) => r.h >= 43.99 && r.w >= 43.99) && !cat.wide, JSON.stringify({ h: cat.rows.map((r) => Math.round(r.h)), wide: cat.wide }));
  await page.evaluate(() => document.getElementById('cat-qrts-t').scrollIntoView({ block: 'start' }));
  await shot(page, '31-catalogue');
  await page.focus('#dlg-construire .cat-qrt-go[data-quartier="garage"]');
  await page.keyboard.press('Enter');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await page.waitForTimeout(450);
  f = await fiche(page);
  R.check('Entrée sur la ligne du Garage : sa fiche, posée sur le catalogue', f.open && f.quartier === 'garage' && f.pile.join() === 'dlg-construire,dlg-quartier', JSON.stringify({ q: f.quartier, pile: f.pile }));
  R.check('Garage au plus haut : pas de bouton d’achat, « Niveau 2 : le plus haut pour l’instant. »', !f.monter && f.max === 'Niveau 2 : le plus haut pour l’instant.' && /^Ce qu’il fait 3 jours travaillés pour qu’une culture mûrisse \(\d+ au départ\)\./.test(f.corps), JSON.stringify({ max: f.max, corps: f.corps }));
  R.check('le focus est dans la fiche', await page.evaluate(() => document.getElementById('dlg-quartier').contains(document.activeElement)));
  R.check('une autre fiche ouverte : plus de ligne de réussite', f.monte === null, JSON.stringify(f.monte));
  await shot(page, '31-pile');
  await page.keyboard.press('Escape');
  await closed(page, 'dlg-quartier');
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => ({ cat: document.getElementById('dlg-construire').open, focus: document.activeElement?.dataset?.quartier || document.activeElement?.tagName }));
  R.check('Échap ne ferme que la fiche ; le focus revient sur la ligne du Garage', back.cat && back.focus === 'garage', JSON.stringify(back));
  await page.focus('#dlg-construire .cat-qrt-go[data-quartier="atelier"]');
  await page.keyboard.press('Enter');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open && document.getElementById('dlg-quartier').dataset.quartier === 'atelier'), 2000);
  await page.waitForTimeout(450);
  f = await fiche(page);
  R.check('fiche de l’Atelier : niveau 1 verrouillé (aucun permis)', f.monter && f.monter.off && f.raison && /^Il manque 1 permis/.test(f.raison.text), JSON.stringify({ m: f.monter, r: f.raison }));
  await page.focus('#dlg-quartier [data-action="qrt-quetes"]');
  await page.keyboard.press('Enter');
  R.check('« Voir les quêtes Maison (1) » ferme la fiche et le catalogue, ouvre le panneau filtré', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-quartier').open && !document.getElementById('dlg-construire').open
    && document.getElementById('app').dataset.panel === 'open'
    && document.querySelector('.chip[data-quartier="atelier"]').getAttribute('aria-pressed') === 'true'
    && [...document.querySelectorAll('#quest-list .quest-title')].map((e) => e.textContent.trim()).join('|') === 'Changer une ampoule'), 2500), f.quetes);
  const filtres = await page.evaluate(() => ({ statut: document.querySelector('input[name="statut"]:checked')?.value, search: document.getElementById('search').value, quick: document.querySelector('.chip[data-filter="quick"]').getAttribute('aria-pressed'), liste: [...document.querySelectorAll('#quest-list:not([hidden]) .quest-title')].map((e) => e.textContent.trim()) }));
  R.check('« Voir les quêtes » remet « À faire », vide la recherche et retire « 15 min » : la liste montre la quête comptée', filtres.statut === 'todo' && filtres.search === '' && filtres.quick === 'false' && filtres.liste.join('|') === 'Changer une ampoule', JSON.stringify(filtres));
  const foc = await L.waitFor(() => page.evaluate(() => {
    const a = document.activeElement;
    if (!a || !a.matches('#quest-list .quest-main')) return null;
    const r = a.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { titre: a.querySelector('.quest-title')?.textContent.trim(), vu: !!top && a.contains(top) };
  }), 2000);
  R.check('au clavier, le focus arrive sur la quête de la liste filtrée, visible', foc && foc.titre === 'Changer une ampoule' && foc.vu, JSON.stringify(foc || await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80))));
  await page.locator('.chip[data-quartier="atelier"]').click(); // retire le filtre

  // ───── clavier : « Vue » → Carte en liste → « Ouvrir la fiche »
  await L.openPlan(page);
  await page.waitForSelector('#dlg-plan[open]');
  await page.waitForTimeout(450);
  const open = await page.evaluate(() => { const b = document.querySelector('#dlg-plan .ow-plan-open[data-quartier="mairie"]'); const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), text: b.textContent.trim(), w: r.width, h: r.height }; });
  R.check('Carte en liste : « Ouvrir la fiche », nommé par le quartier, 44 px', open.text === 'Ouvrir la fiche' && open.label === 'Ouvrir la fiche de la Mairie' && open.w >= 43.99 && open.h >= 43.99, JSON.stringify(open));
  await page.focus('#dlg-plan .ow-plan-open[data-quartier="mairie"]');
  await page.keyboard.press('Enter');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await page.waitForTimeout(450);
  f = await fiche(page);
  R.check('Entrée : fiche de la Mairie posée sur la carte en liste', f.open && f.quartier === 'mairie' && f.pile.join() === 'dlg-plan,dlg-quartier' && /Niveau 1 15 Nourriture pour accueillir une famille\./.test(f.corps), JSON.stringify({ q: f.quartier, pile: f.pile, corps: f.corps }));
  await shot(page, '31-plan-fiche');
  await page.keyboard.press('Escape');
  await closed(page, 'dlg-quartier');
  await page.waitForTimeout(200);
  R.check('Échap ne ferme que la fiche ; la carte en liste reste, le focus sur « Ouvrir la fiche »', await page.evaluate(() => document.getElementById('dlg-plan').open && document.activeElement?.dataset?.quartier === 'mairie'));
  await page.keyboard.press('Escape');
  await closed(page, 'dlg-plan');
  R.check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
}, {
  tasks: TASKS,
  game: (core) => {
    const g = L.quietState(core);
    const today = core.gameDay(new Date());
    for (const id of core.PAS_IDS) g.premiersPas[id] = today; // un niveau s'achète après les premiers pas
    g.permis = { ...g.permis, dispo: 3 };
    g.resources = { ...g.resources, energy: 320, materials: 320, food: 5 };
    g.niveaux = { ...g.niveaux, garage: 2 };
    return g;
  },
});
