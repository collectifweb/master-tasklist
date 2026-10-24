// 42. L'échange du jour (lot T) à l'étal du marchand (lot G), à l'écran.
//   Horloge figée un dimanche à 3 h 40, heure de Montréal (le jour de jeu est encore samedi), quai bâti, 200 Matériaux :
//   - le rachat du jour en tuile large sous la grille des quatre offres de la semaine : « Rachat du jour », « 20 Matériaux
//     contre 10 Énergie », ce que le marchand laisse au village ; sa règle dans le repli ; choisi, « Échanger » de 44 px
//     dans la barre du pied, rien ne déborde ;
//   - double toucher sur « Échanger » : un seul échange (−20 Matériaux, +10 Énergie), la cible de chaque toucher notée ;
//     « Fait aujourd'hui » sur la tuile et dans la barre, une seule phrase lue, rien au registre ni dans les tâches, les
//     offres de la semaine intactes ;
//   - deux appareils : le second, pas encore relu, échange à son tour : le serveur refuse, l'appareil se remet à jour et dit
//     pourquoi ; l'échange n'est payé qu'une fois ;
//   - passage de 4 h : la tuile s'ouvre de nouveau ; au clavier (Espace sur la tuile, Tab, Entrée), le focus passe sur
//     « Fait aujourd'hui » ;
//   - 169 Matériaux : la tuile dit ce qui manque, la barre le bouton verrouillé et la raison du cœur ; le toucher ne
//     dépense rien et redit la raison.
// Données fictives seulement. Chaque geste attend l'écriture du serveur avant de la vérifier.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
function nextSaturday() {
  const d = new Date();
  d.setUTCHours(14, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const SAMEDI = nextSaturday();
const ymd = (n) => new Date(SAMEDI.getTime() + n * 86400000).toISOString().slice(0, 10);
const [SAM, DIM] = [ymd(0), ymd(1)];
const TASKS = [
  { id: 'j1', task: 'Ranger la remise', domain: 'Terrain', difficulty: 3, length: 3, priority: 7, status: 'todo', created: ymd(-4) },
  { id: 'j2', task: 'Trier les papiers', domain: 'Administratif', difficulty: 2, length: 2, priority: 6, status: 'todo', created: ymd(-3) },
];
const BAT = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'batiments.json'), 'utf8'));
const JOUR = 'materiaux-energie-jour';
const TUILE = `#dlg-batiment .etal-offre[data-offre="${JOUR}"]`;
const BTN = '#dlg-batiment .etal-go';
const GARDE = 'Le marchand en laisse toujours 150 au village pour les chantiers.';
const DEJA = 'Déjà fait aujourd’hui : le marchand rachète de nouveau demain.';

// 4 h du dimanche, heure de Montréal : la première minute du jour de jeu DIM, cherchée par le cœur (heure d'été ou non)
function quatreHeures(core) {
  let t = Date.parse(`${DIM}T00:00:00Z`);
  while (core.gameDay(new Date(t).toISOString()) !== DIM) t += 60000;
  return t;
}
const avant = (core) => new Date(quatreHeures(core) - 20 * 60000); // 3 h 40 : encore samedi

function village(core) {
  const g = L.quietState(core, avant(core));
  g.resources = { energy: 64, materials: 200, food: 20 };
  g.habitants = 3;
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, ymd(-20)]));
  g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }, { id: 'quai-1', type: 'quai' }];
  return g;
}

// ───── lectures de l'écran
const comptoir = (page) => page.evaluate((JOUR) => {
  const d = document.getElementById('dlg-batiment');
  const s = (x) => String(x || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const r = d.getBoundingClientRect();
  const li = d.querySelector(`.etal-offre[data-offre="${JOUR}"]`);
  const grille = d.querySelector('.etal-grille');
  const barre = d.querySelector('.etal-barre');
  const go = barre?.querySelector('.etal-go');
  const gr = go?.getBoundingClientRect();
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '',
    debord: [...d.querySelectorAll('.etal *, .etal-barre *')].filter((e) => { const x = e.getBoundingClientRect(); return x.width && (x.left < r.left - 1 || x.right > r.right + 1); }).map((e) => e.className.baseVal ?? e.className),
    semaine: [...(grille?.querySelectorAll('.etal-offre') || [])].map((o) => [o.dataset.offre, o.dataset.etat]),
    regle: s(d.querySelector('.repli')?.textContent),
    // la tuile du jour vient après la grille de la semaine, hors d'elle
    ordre: !!grille && !!li && !grille.contains(li) && !!(grille.compareDocumentPosition(li) & Node.DOCUMENT_POSITION_FOLLOWING),
    jour: li ? {
      etat: li.dataset.etat, choisie: li.querySelector('input').checked, large: li.classList.contains('etal-offre--jour'),
      troc: s(li.querySelector('.etal-carte > .sr-only').textContent), titre: s(li.querySelector('.etal-jour-t')?.textContent),
      garde: s(li.querySelector('.etal-jour-garde')?.textContent), fait: s(li.querySelector('.offre-fait')?.textContent), raison: s(li.querySelector('.offre-raison')?.textContent),
    } : null,
    barre: barre ? {
      offre: barre.dataset.offre, etat: barre.dataset.etat, off: go ? go.getAttribute('aria-disabled') === 'true' : null, decrit: go ? go.getAttribute('aria-describedby') : null,
      label: go ? go.getAttribute('aria-label') : null, raison: s(barre.querySelector('.etal-raison')?.textContent), fait: s(barre.querySelector('.etal-fait')?.textContent), h: gr ? gr.height : 0, w: gr ? gr.width : 0,
    } : null,
  };
}, JOUR);
// choisir la tuile du jour : seule la barre du pied change
async function choisirJour(page) {
  await page.click(TUILE);
  return L.waitFor(async () => { const c = await comptoir(page); return c.barre?.offre === JOUR ? c : null; }, 2000);
}
async function ouvrirParBandeau(page, compact) {
  if (compact && await page.getAttribute('.bandeau-more', 'aria-expanded') !== 'true') { await page.click('.bandeau-more'); await page.waitForTimeout(300); }
  await page.click('.bandeau-visiteur');
  const c = await L.waitFor(async () => { const x = await comptoir(page); return x.open && x.jour ? x : null; }, 4000);
  await page.waitForTimeout(700); // un toucher juste après l'ouverture serait le second de celui qui l'a ouverte
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), TUILE);
  await page.waitForTimeout(300);
  return c;
}
async function fermer(page) {
  await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
}
const centre = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const res = (g) => JSON.stringify(g.resources);
const r1 = (x) => Math.round(x * 10) / 10;

(async () => {
  await L.runScenario('42. l’échange du jour au quai', async ({ R, srv, newPage, shot, tag, core }) => {
    const compact = tag < 700;
    const AVANT = avant(core);
    const APRES = new Date(quatreHeures(core) + 2 * 60000); // 4 h 02 : dimanche
    R.check('horloge : 3 h 40 est encore samedi, 4 h 02 est dimanche', core.gameDay(AVANT.toISOString()) === SAM && core.gameDay(APRES.toISOString()) === DIM, `${AVANT.toISOString()} ${APRES.toISOString()}`);

    // ───── premier appareil (toucher), puis le second, ouverts tous deux avant l'échange
    const { page, context } = await newPage({}, { hasTouch: true, isMobile: compact });
    await context.addInitScript(L.VOICES);
    await page.clock.install({ time: AVANT });
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await page.waitForTimeout(800);
    let c = await ouvrirParBandeau(page, compact);
    R.check('fiche : l’étal du quai, avec la tuile du jour', !!c && c.id === 'quai-1', String(c && c.id));
    R.check('tuile du jour : large, après la grille des quatre offres de la semaine ; sa règle dans le repli',
      c.ordre && c.jour.large && c.semaine.length === 4 && !c.semaine.some(([id]) => id === JOUR) && c.regle.includes(sp(BAT.comptoir['jour.intro'])), JSON.stringify([c.ordre, c.jour.large, c.semaine, c.regle]));
    R.check('tuile du jour : « Rachat du jour », ce qui est lu (« 20 Matériaux contre 10 Énergie »), ce que le marchand laisse au village',
      c.jour.etat === 'libre' && c.jour.titre === sp(BAT.comptoir['jour.titre']) && c.jour.troc === `${sp(BAT.comptoir['jour.titre'])} : 20 Matériaux contre 10 Énergie.`
      && c.jour.garde === sp(BAT.comptoir['jour.garde'].replace('{n}', '150')), JSON.stringify(c.jour));
    c = await choisirJour(page);
    R.check('barre : la tuile du jour choisie, « Échanger » ouvert, nommé pour le lecteur d’écran',
      !!c && c.jour.choisie && c.barre.etat === 'libre' && c.barre.off === false && c.barre.label === 'Échanger 20 Matériaux contre 10 Énergie', JSON.stringify(c && [c.jour, c.barre]));
    R.check('barre : bouton de 44 px au moins, rien ne déborde', c.barre.h >= 43.99 && c.barre.w >= 44 && c.debord.length === 0, JSON.stringify([c.barre.w, c.barre.h, c.debord]));
    await shot(page, '42-jour');

    const { page: p2 } = await newPage({}, { reducedMotion: 'reduce' });
    await p2.clock.install({ time: AVANT });
    await p2.goto(srv.url);
    await L.ready(p2);
    await L.closeWelcome(p2, 1500);
    await p2.waitForTimeout(600);
    const c2 = await ouvrirParBandeau(p2, compact);
    R.check('second appareil : la tuile du jour est ouverte, lui aussi', c2.jour.etat === 'libre', JSON.stringify(c2.jour));
    await choisirJour(p2);

    // ───── double toucher : un seul échange ; on note où tombe chaque toucher
    const gA = srv.game();
    const l0 = srv.ledger().length;
    await L.said(page, true);
    const pt = await centre(page, BTN);
    await page.evaluate(() => { window.__taps = []; document.addEventListener('click', (e) => window.__taps.push(`${e.target.closest('.etal-barre')?.dataset.offre}:${e.target.closest('.etal-go:not([aria-disabled])') ? 'echanger' : e.target.closest('.etal-fait') ? 'fait' : e.target.closest('button')?.className || e.target.tagName}`), true); });
    await page.touchscreen.tap(pt[0], pt[1]);
    await page.waitForTimeout(150);
    await page.touchscreen.tap(pt[0], pt[1]);
    const taps = await page.evaluate(() => window.__taps);
    console.log(`  note : cible des deux touchers (${tag}) : ${taps.join(', ')}`);
    R.check('double toucher : le premier toucher tombe sur « Échanger » du jour, le second sur la même barre', taps.length === 2 && taps[0] === `${JOUR}:echanger` && taps[1].startsWith(`${JOUR}:`), JSON.stringify(taps));
    const g1 = await L.waitFor(() => { const g = srv.game(); return g.echangeDuJour ? g : null; }, 5000);
    await page.waitForTimeout(1200);
    const gB = srv.game();
    R.check('double toucher : un seul échange au serveur (−20 Matériaux, +10 Énergie, la Nourriture intacte)',
      !!g1 && r1(gB.resources.materials - gA.resources.materials) === -20 && r1(gB.resources.energy - gA.resources.energy) === 10 && gB.resources.food === gA.resources.food, `${res(gA)} → ${res(gB)} (touchers : ${JSON.stringify(taps)})`);
    R.check('échange : la partie note le jour (samedi), les offres de la semaine intactes', gB.echangeDuJour === SAM && JSON.stringify(gB.visite) === JSON.stringify(gA.visite), JSON.stringify([gB.echangeDuJour, gB.visite]));
    R.check('échange : rien au registre, les tâches intactes', srv.ledger().length === l0 && JSON.stringify(srv.readTasks().map((x) => [x.id, x.status])) === JSON.stringify(TASKS.map((x) => [x.id, x.status])), JSON.stringify(srv.ledger().slice(l0)));
    c = await comptoir(page);
    const faitJour = `${BAT.comptoir.fait} ${sp(BAT.comptoir['jour.fait.quand'])}`;
    R.check('tuile du jour : « Fait aujourd’hui », et dans la barre à la place du bouton', c.jour.etat === 'fait' && c.jour.fait === faitJour && c.barre.offre === JOUR && c.barre.etat === 'fait' && c.barre.fait === faitJour, JSON.stringify([c.jour, c.barre]));
    const dits = (await L.said(page)).map((x) => sp(x.text));
    R.check('échange : une seule phrase lue, « Échange fait : 20 Matériaux contre 10 Énergie. »', dits.filter((t) => /Échange fait/.test(t)).length === 1 && dits.includes('Échange fait : 20 Matériaux contre 10 Énergie.'), JSON.stringify(dits));
    R.check('barre : les chiffres du serveur', !!await L.waitFor(async () => (await L.resValue(page, 'energie')) === Math.floor(gB.resources.energy) && (await L.resValue(page, 'materiaux')) === Math.floor(gB.resources.materials), 3000));
    await shot(page, '42-fait');

    // ───── deux appareils : le second (pas encore relu) échange à son tour
    await p2.click(BTN);
    await p2.waitForTimeout(2500);
    const g3 = srv.game();
    R.check('deux appareils : l’échange n’est payé qu’une fois (serveur inchangé après le second geste)', res(g3) === res(gB) && g3.echangeDuJour === SAM, `${res(gB)} → ${res(g3)}`);
    const note = await L.waitFor(() => p2.evaluate((t) => { const n = document.getElementById('notice'); const s = (x) => String(x || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); return n && !n.hidden && s(n.textContent).includes(t) ? s(n.textContent) : null; }, DEJA), 4000);
    R.check('second appareil : remis à jour, il dit pourquoi (« Déjà fait aujourd’hui… »)', !!note, String(note));
    const c2b = await L.waitFor(async () => { const x = await comptoir(p2); return x.jour?.etat === 'fait' ? x : null; }, 3000);
    R.check('second appareil : la tuile dit « Fait aujourd’hui », la barre du haut montre les chiffres du serveur',
      !!c2b && !!await L.waitFor(async () => (await L.resValue(p2, 'materiaux')) === Math.floor(g3.resources.materials) && (await L.resValue(p2, 'energie')) === Math.floor(g3.resources.energy), 4000), JSON.stringify(c2b && c2b.jour));
    await p2.close();

    // ───── passage de 4 h : la tuile s'ouvre de nouveau ; au clavier, le focus passe sur « Fait aujourd'hui »
    await fermer(page);
    await page.clock.fastForward(APRES.getTime() - await page.evaluate(() => Date.now()));
    await L.closeWelcome(page, 2500);
    await page.waitForTimeout(800);
    c = await ouvrirParBandeau(page, compact);
    R.check('4 h : la tuile du jour est de nouveau ouverte', c.jour.etat === 'libre', JSON.stringify(c.jour));
    const gC = srv.game();
    await L.said(page, true);
    await page.focus(`${TUILE} input`);
    await page.keyboard.press('Space');
    R.check('clavier : Espace choisit la tuile du jour', !!await L.waitFor(async () => (await comptoir(page)).barre?.offre === JOUR, 2000));
    let tabs = 0;
    while (tabs < 4 && !await page.evaluate(() => !!document.activeElement?.closest('.etal-go'))) { await page.keyboard.press('Tab'); tabs++; }
    R.check('clavier : Tab mène à « Échanger » (deux au plus)', tabs <= 2, String(tabs));
    await page.keyboard.press('Enter');
    const g4 = await L.waitFor(() => { const g = srv.game(); return g.echangeDuJour === DIM ? g : null; }, 5000);
    R.check('clavier : l’échange du dimanche arrive au serveur (−20 Matériaux, +10 Énergie)', !!g4 && r1(g4.resources.materials - gC.resources.materials) === -20 && r1(g4.resources.energy - gC.resources.energy) === 10, `${res(gC)} → ${g4 && res(g4)}`);
    const focus = await L.waitFor(() => page.evaluate((JOUR) => { const a = document.activeElement; return a?.closest(`.etal-barre[data-offre="${JOUR}"]`) ? { cls: a.className, etat: a.closest('.etal-barre').dataset.etat } : null; }, JOUR), 2000);
    R.check('clavier : le focus passe sur « Fait aujourd’hui », dans la barre', !!focus && focus.cls === 'etal-fait' && focus.etat === 'fait', JSON.stringify(focus));
    await page.close();

    // ───── 169 Matériaux : le cadenas et la raison ; le toucher ne dépense rien
    const fichier = path.join(srv.root, 'app', 'api', 'data', 'game-state.json');
    const g5 = srv.game();
    g5.resources.materials = 169;
    delete g5.echangeDuJour;
    fs.writeFileSync(fichier, JSON.stringify(g5));
    const { page: p3, context: ctx3 } = await newPage({}, { hasTouch: true, isMobile: compact });
    await ctx3.addInitScript(L.VOICES);
    await p3.clock.install({ time: new Date(APRES.getTime() + 10 * 60000) });
    await p3.goto(srv.url);
    await L.ready(p3);
    await L.closeWelcome(p3, 1500);
    await p3.waitForTimeout(800);
    const g6 = srv.game();
    R.check('169 Matériaux : la partie relue en a bien 169', g6.resources.materials === 169 && await L.resValue(p3, 'materiaux') === 169, res(g6));
    c = await ouvrirParBandeau(p3, compact);
    const raison = `Il manque 1 Matériau. ${GARDE}`;
    R.check('169 Matériaux : la tuile dit ce qui manque (les 150 Matériaux gardés au village comptés)', c.jour.etat === 'verrou' && c.jour.raison === 'Il manque 1 Matériau.', JSON.stringify(c.jour));
    c = await choisirJour(p3);
    R.check('169 Matériaux : la barre montre le bouton verrouillé, et la raison du cœur dessous, reliée au bouton',
      !!c && c.barre.etat === 'verrou' && c.barre.off === true && c.barre.raison === raison && c.barre.decrit === 'etal-raison', JSON.stringify(c && c.barre));
    R.check('169 Matériaux : la raison tient dans la fiche, rien ne déborde', c.debord.length === 0, JSON.stringify(c.debord));
    await shot(p3, '42-manque');
    await L.said(p3, true);
    await p3.click(BTN, { force: true }); // verrouillé (aria-disabled) : Playwright attendrait qu'il s'ouvre
    await p3.waitForTimeout(900);
    R.check('169 Matériaux : le toucher ne dépense rien', res(srv.game()) === res(g6) && !srv.game().echangeDuJour, res(srv.game()));
    R.check('169 Matériaux : la raison est lue', (await L.said(p3)).some((x) => sp(x.text) === raison), JSON.stringify(await L.said(p3)));
  }, { tasks: TASKS, game: (core) => village(core) });
})();
