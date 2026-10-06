// 33. Réglages (quête par défaut gardée avec la partie) et compteur « Permis ».
//   - Réglages sur un appareil : « Quête par défaut » (priorité, durée, effort) passe de 5, 2, 3 à 8, 3, 2 ; l'enregistrement
//     part dans la partie du serveur (game.reglages.queteDefaut), jamais dans le registre ni dans les tâches ;
//   - le formulaire d'ajout du même appareil, puis celui d'un SECOND appareil (autre contexte : autre stockage local), montrent
//     8, 3, 2 ; la quête créée sur le second appareil les porte ; le prénom, lui, reste sur l'appareil ;
//   - le compteur « Permis » de la barre des ressources vaut game.permis.dispo, sa feuille d'aide dit à quoi sert un permis et
//     comment on en gagne ; « Construire » ne porte plus ni chiffre ni pastille ;
//   - la barre de cinq puces tient à 360, 390, 834 et 1280 px : aucun chiffre ni mot coupé, aucune puce hors de la barre, cibles
//     de 44 px, aucun défilement horizontal ;
//   - fiche de quartier : le bouton d'achat reste au même endroit avant et après un achat, et le second toucher tombe sur ce
//     même bouton, désormais verrouillé et expliqué, sans rien acheter. Données fictives seulement.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'r1', task: 'Ranger le cabanon', domain: 'Terrain', difficulty: 3, length: 2, priority: 6, status: 'todo', created: day(-2) },
  { id: 'r2', task: 'Trier le courrier', domain: 'Administratif', difficulty: 2, length: 2, priority: 5, status: 'todo', created: day(-1) },
];
const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const steppers = (page, dlg) => page.evaluate((d) => [...document.querySelectorAll(`${d} .stepper-row output`)].map((o) => o.textContent.trim()).join(), dlg);
const isOpen = (page, id) => page.evaluate((id) => { const d = document.getElementById(id); return d.open && !d.classList.contains('is-closing'); }, id);
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600); };
const center = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);

/** Barre des ressources : cinq puces dans la barre, aucun mot ni chiffre coupé, cibles de 44 px. */
const barre = (page) => page.evaluate(() => {
  const hud = document.querySelector('.hud').getBoundingClientRect();
  const out = { n: 0, hors: [], coupes: [], petits: [], texte: {} };
  for (const r of document.querySelectorAll('.hud .res')) {
    out.n++;
    const b = r.getBoundingClientRect();
    const name = r.dataset.res;
    if (b.left < hud.left - 1 || b.right > hud.right + 1) out.hors.push(name);
    if (b.height < 43.99) out.petits.push(`${name} ${b.height.toFixed(0)}`);
    const v = r.querySelector('.res-value');
    const rg = document.createRange();
    rg.selectNodeContents(v.firstChild);
    const tw = rg.getBoundingClientRect().width;
    if (tw > v.getBoundingClientRect().width + 0.5) out.coupes.push(`${name} chiffre ${tw.toFixed(1)}>${v.getBoundingClientRect().width.toFixed(1)}`);
    const lab = r.querySelector('.res-label');
    if (lab.scrollWidth > lab.clientWidth) out.coupes.push(`${name} mot`);
    if (b.right > innerWidth + 0.5) out.hors.push(`${name} écran`);
    out.texte[name] = r.textContent.replace(/\s+/g, ' ').trim();
  }
  out.defile = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  return out;
});

L.runScenario('33. Réglages (quête par défaut sur tous les appareils) et compteur Permis', async ({ R, srv, newPage, tag, shot }) => {
  const compact = tag < 1000;

  // ───── appareil 1 : Réglages, « Quête par défaut »
  const { page } = await newPage({}, { hasTouch: true, isMobile: compact });
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(page);
  await settle(page);
  const g0 = srv.game();

  // compteur « Permis » et « Construire »
  const valeur = () => page.evaluate(() => Number(document.querySelector('.res[data-res="permis"] .res-value').textContent.replace(/\s/g, '').replace(',', '.')));
  R.check('compteur « Permis » = game.permis.dispo du serveur', await valeur() === g0.permis.dispo && g0.permis.dispo === 3, JSON.stringify({ ecran: await valeur(), jeu: g0.permis }));
  R.check('le compteur est nommé « Permis : 3 » pour un lecteur d’écran', await page.getAttribute('.res[data-res="permis"]', 'aria-label') === 'Permis : 3');
  const build = await page.evaluate(() => { const b = document.querySelector('[data-ow="build"]'); return { label: b.getAttribute('aria-label'), pastille: !!b.querySelector('.ow-badge'), chiffre: /\d/.test(b.textContent + b.getAttribute('aria-label') + (b.title || '')) }; });
  R.check('« Construire » : ni pastille ni chiffre, nom « Construire »', build.label === 'Construire' && !build.pastille && !build.chiffre, JSON.stringify(build));
  const bar = await barre(page);
  R.check(`barre des ressources à ${tag} px : cinq puces, rien de coupé ni hors de la barre, cibles de 44 px, pas de défilement`, bar.n === 5 && !bar.hors.length && !bar.coupes.length && !bar.petits.length && !bar.defile, JSON.stringify(bar));
  await shot(page, '33-barre');

  // feuille d'aide du compteur
  await page.click('.res[data-res="permis"]');
  await L.waitFor(() => isOpen(page, 'dlg-help'), 2000);
  await page.waitForTimeout(450);
  const aide = await page.evaluate(() => {
    const d = document.getElementById('dlg-help');
    return { titre: (d.querySelector('.help-title')?.textContent || '').trim(), picto: !!d.querySelector('.help-title use[href$="#i-permis"]'), lignes: [...d.querySelectorAll('.help-line')].map((l) => [l.querySelector('dt').textContent.trim(), l.querySelector('dd').textContent.trim()]) };
  });
  const [quoi, source, usage] = aide.lignes;
  R.check('aide « Permis » : titre et pictogramme du permis', aide.titre === 'Permis' && aide.picto, JSON.stringify({ t: aide.titre, p: aide.picto }));
  R.check('aide « Permis » : ce que c’est (monter un quartier d’un niveau)', quoi && quoi[0] === 'Ce que c’est' && /quartier/.test(quoi[1]) && /niveau/.test(quoi[1]), JSON.stringify(quoi));
  R.check('aide « Permis » : d’où ça vient (4 jours travaillés, nouveau rang, objectif de saison)', source && source[0] === 'D’où ça vient' && /4 jours travaillés/.test(source[1]) && /rang/.test(source[1]) && /saison/.test(source[1]), JSON.stringify(source));
  R.check('aide « Permis » : à quoi ça sert (le niveau n coûte n permis, plus Énergie et Matériaux)', usage && usage[0] === 'À quoi ça sert' && /coûte 1 permis/.test(usage[1]) && /en coûte 2/.test(usage[1]) && /Énergie/.test(usage[1]) && /Matériaux/.test(usage[1]), JSON.stringify(usage));
  await shot(page, '33-aide');
  await page.keyboard.press('Escape');
  await L.waitFor(async () => !(await isOpen(page, 'dlg-help')), 2000);
  await page.waitForTimeout(300);

  // Réglages
  await L.openPanel(page);
  await page.click('[data-action="open-settings"]');
  await page.waitForSelector('#dlg-settings[open]');
  await settle(page);
  R.check('Réglages : « Quête par défaut » montre 5, 2, 3 au départ', await steppers(page, '#dlg-settings') === '5,2,3', await steppers(page, '#dlg-settings'));
  const phrase = sp(await page.textContent('#dlg-settings'));
  R.check('Réglages : la phrase dit « gardées avec la partie, les mêmes sur tous tes appareils » et que le prénom reste sur l’appareil', /gardées avec la partie/.test(phrase) && /mêmes sur tous tes appareils/.test(phrase) && /Le prénom, lui, reste sur cet appareil/.test(phrase), phrase.slice(0, 300));
  const cibles = await page.evaluate(() => [...document.querySelectorAll('#dlg-settings button')].map((b) => [b, b.getBoundingClientRect()]).filter(([, r]) => r.width && (r.width < 43.99 || r.height < 43.99)).map(([b, r]) => `${b.dataset.step || b.className} ${r.width.toFixed(0)}×${r.height.toFixed(0)}`));
  R.check('Réglages : cibles de 44 px, aucun débordement horizontal', !cibles.length && await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), JSON.stringify(cibles));
  const pas = (kind, sens, n) => (async () => { for (let i = 0; i < n; i++) await page.click(`#dlg-settings .stepper-row[data-kind="${kind}"] [data-step="${sens}"]`); })();
  await pas('priority', 1, 3);
  await pas('length', 1, 1);
  await pas('difficulty', -1, 1);
  R.check('Réglages : les pas montent et descendent (8, 3, 2)', await steppers(page, '#dlg-settings') === '8,3,2', await steppers(page, '#dlg-settings'));
  await shot(page, '33-reglages');
  await page.click('#dlg-settings [type="submit"]');
  R.check('enregistré dans la partie du serveur : game.reglages.queteDefaut = 8, 3, 2',
    await L.waitFor(() => { const q = srv.game()?.reglages?.queteDefaut; return q && q.priority === 8 && q.length === 3 && q.difficulty === 2; }, 8000), JSON.stringify(srv.game()?.reglages));
  R.check('Réglages se ferme', await L.waitFor(async () => !(await isOpen(page, 'dlg-settings')), 2000));
  const g1 = srv.game();
  R.check('ni ressources, ni permis, ni registre ne bougent', JSON.stringify(g1.resources) === JSON.stringify(g0.resources) && g1.permis.dispo === g0.permis.dispo && srv.ledger().every((e) => !/reglage|quete/i.test(e.key)), JSON.stringify({ r: g1.resources }));

  // formulaire d'ajout du même appareil
  await page.click('.panel-head [data-action="add"]');
  await page.waitForSelector('#dlg-add[open]');
  await settle(page);
  R.check('appareil 1 : le formulaire d’ajout montre 8, 3, 2', await steppers(page, '#dlg-add') === '8,3,2', await steppers(page, '#dlg-add'));
  await page.keyboard.press('Escape');
  await L.waitFor(async () => !(await isOpen(page, 'dlg-add')), 2000);

  // ───── appareil 2 : autre contexte (autre stockage local), même serveur
  const second = await newPage({}, { hasTouch: true, isMobile: compact });
  const p2 = second.page;
  await p2.goto(srv.url);
  await L.ready(p2);
  await p2.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(p2);
  await settle(p2);
  R.check('appareil 2 : stockage local vierge (aucun prénom, aucune file)', await p2.evaluate(() => localStorage.getItem('oree.prenom.v1') === null));
  await L.openPanel(p2);
  await p2.click('.panel-head [data-action="add"]');
  await p2.waitForSelector('#dlg-add[open]');
  await settle(p2);
  R.check('appareil 2 : le formulaire d’ajout montre les mêmes valeurs, 8, 3, 2', await steppers(p2, '#dlg-add') === '8,3,2', await steppers(p2, '#dlg-add'));
  await shot(p2, '33-appareil2');
  await p2.fill('#add-title', 'Vider la remise');
  await p2.click('#dlg-add [data-action="add-submit"]');
  R.check('la quête créée sur l’appareil 2 porte priorité 8, durée 3, effort 2', await L.waitFor(() => { const q = srv.readTasks().find((x) => x.task === 'Vider la remise'); return q && q.priority === 8 && q.length === 3 && q.difficulty === 2; }, 8000), JSON.stringify(srv.readTasks().find((x) => x.task === 'Vider la remise')));
  await second.context.close();

  // ───── fiche de quartier : le bouton d'achat ne bouge pas (en compact, le panneau ouvert recouvre la colonne : on le replie)
  if (await page.evaluate(() => document.getElementById('app').dataset.panel === 'open') && await page.locator('.panel-toggle').isVisible()) {
    await page.click('.panel-toggle');
    await page.waitForTimeout(450);
  }
  await page.click('[data-ow="build"]');
  await page.waitForSelector('#dlg-construire[open]');
  await settle(page);
  await page.evaluate(() => document.querySelector('#dlg-construire .cat-qrt-go[data-quartier="champs"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  await page.click('#dlg-construire .cat-qrt-go[data-quartier="champs"]');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await settle(page);
  const SEL = '#dlg-quartier [data-action="qrt-monter"]';
  const avant = await center(page, SEL);
  const dlgAvant = await page.evaluate(() => { const r = document.getElementById('dlg-quartier').getBoundingClientRect(); return [r.top, r.height]; });
  await page.touchscreen.tap(avant[0], avant[1]);
  R.check('achat : Champs au niveau 1', await L.waitFor(() => srv.game()?.niveaux?.champs === 1, 6000), JSON.stringify(srv.game()?.niveaux));
  await settle(page);
  const apres = await center(page, SEL);
  const dlgApres = await page.evaluate(() => { const r = document.getElementById('dlg-quartier').getBoundingClientRect(); return [r.top, r.height]; });
  R.check(`fiche à ${tag} px : le bouton d’achat est au même endroit avant et après l’achat (±1 px)`, Math.abs(apres[0] - avant[0]) <= 1 && Math.abs(apres[1] - avant[1]) <= 1, JSON.stringify({ avant, apres, dlgAvant, dlgApres }));
  if (!compact || tag >= 700) R.check('fiche centrée (tablette, bureau) : la feuille garde sa hauteur', Math.abs(dlgApres[1] - dlgAvant[1]) <= 1 && Math.abs(dlgApres[0] - dlgAvant[0]) <= 1, JSON.stringify({ dlgAvant, dlgApres }));
  const etat = await page.evaluate(() => { const b = document.querySelector('#dlg-quartier [data-action="qrt-monter"]'); return { off: b.getAttribute('aria-disabled') === 'true', texte: b.textContent.trim(), raison: (document.getElementById('qrt-raison')?.textContent || '').trim(), vu: (() => { const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && b.contains(at); })() }; });
  R.check('niveau 2 trop cher : le même bouton, verrouillé, avec la raison écrite à côté', etat.off && etat.texte === 'Monter au niveau 2' && /^Il manque/.test(etat.raison) && etat.vu, JSON.stringify(etat));
  const g2 = JSON.stringify(srv.game());
  await page.touchscreen.tap(apres[0], apres[1]);
  await page.waitForTimeout(900);
  R.check('le second toucher tombe sur ce même bouton et n’achète rien', JSON.stringify(srv.game()) === g2 && srv.game().niveaux.champs === 1, JSON.stringify(srv.game().niveaux));
  await shot(page, '33-fiche');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await L.waitFor(() => page.evaluate(() => !document.querySelector('dialog.sheet[open]')), 2000);
  await L.waitFor(async () => (await valeur()) === 2, 4000);
  R.check('compteur « Permis » à jour après l’achat : 2', await valeur() === 2 && srv.game().permis.dispo === 2, String(await valeur()));

  // ───── 360 px : la barre tient aussi avec des valeurs larges
  if (tag === 390) {
    const small = await newPage({}, { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
    await small.page.goto(srv.url);
    await L.ready(small.page);
    await small.page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
    await L.closeWelcome(small.page);
    await settle(small.page);
    const b360 = await barre(small.page);
    R.check('barre des ressources à 360 px : cinq puces, rien de coupé ni hors de la barre, pas de défilement', b360.n === 5 && !b360.hors.length && !b360.coupes.length && !b360.petits.length && !b360.defile && await small.page.evaluate(() => innerWidth) === 360, JSON.stringify(b360));
    await small.page.screenshot({ path: `${L.SHOTS}/33-barre-360.png`, clip: { x: 0, y: 0, width: 360, height: 200 } });
    await small.context.close();
  }
}, {
  tasks: TASKS,
  game: (core) => {
    const g = L.quietState(core);
    const today = core.gameDay(new Date());
    for (const id of core.PAS_IDS) g.premiersPas[id] = today; // un niveau s'achète après les premiers pas
    g.permis = { ...g.permis, dispo: 3 };
    g.resources = { energy: 206.1, materials: 170.9, food: 12 };
    g.habitants = 24;
    return g;
  },
});

