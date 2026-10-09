// 42. L'échange du jour au comptoir du marchand (lot T), à l'écran.
//   Horloge figée un dimanche à 3 h 40, heure de Montréal (le jour de jeu est encore samedi), quai bâti, 200 Matériaux :
//   - la ligne du jour sous les quatre offres de la semaine, après sa phrase : « 20 Matériaux → 10 Énergie », « Échanger »
//     de 44 px, rien ne déborde ;
//   - double toucher sur « Échanger » : un seul échange (−20 Matériaux, +10 Énergie), la cible de chaque toucher notée ;
//     « Fait aujourd'hui » à sa place, une seule phrase lue, rien au registre ni dans les tâches, les offres de la semaine
//     intactes ;
//   - deux appareils : le second, pas encore relu, échange à son tour : le serveur refuse, l'appareil se remet à jour et dit
//     pourquoi ; l'échange n'est payé qu'une fois ;
//   - passage de 4 h : la ligne s'ouvre de nouveau ; au clavier, Entrée échange et le focus reste sur la ligne ;
//   - 169 Matériaux : bouton verrouillé, cadenas et raison du cœur ; le toucher ne dépense rien et redit la raison.
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
const BTN = `#dlg-batiment .offre[data-offre="${JOUR}"] .offre-go`;
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
  const li = d.querySelector(`.offre[data-offre="${JOUR}"]`);
  const b = li?.querySelector('.offre-go');
  const br = b && b.getBoundingClientRect();
  const listes = [...d.querySelectorAll('.comptoir-offres')];
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '',
    debord: [...d.querySelectorAll('.comptoir *')].filter((e) => { const x = e.getBoundingClientRect(); return x.width && (x.left < r.left - 1 || x.right > r.right + 1); }).map((e) => e.className.baseVal ?? e.className),
    semaine: [...(listes[0]?.querySelectorAll('.offre') || [])].map((o) => [o.dataset.offre, o.dataset.etat]),
    phrase: s(d.querySelector('.comptoir-jour')?.textContent),
    // la phrase du jour vient après la liste de la semaine, et la ligne du jour dans la liste qui la suit
    ordre: !!listes[0] && !!li && listes.length === 2 && listes[1].contains(li) && !!(listes[0].compareDocumentPosition(d.querySelector('.comptoir-jour')) & Node.DOCUMENT_POSITION_FOLLOWING),
    jour: li ? {
      etat: li.dataset.etat, troc: s(li.querySelector('.offre-troc').textContent), fait: s(li.querySelector('.offre-fait')?.textContent),
      raison: s(li.querySelector('.offre-raison')?.textContent), off: b ? b.getAttribute('aria-disabled') === 'true' : null,
      decrit: b ? b.getAttribute('aria-describedby') : null, label: b ? b.getAttribute('aria-label') : null, h: br ? br.height : 0, w: br ? br.width : 0,
    } : null,
  };
}, JOUR);
async function ouvrirParBandeau(page, compact) {
  if (compact && await page.getAttribute('.bandeau-more', 'aria-expanded') !== 'true') { await page.click('.bandeau-more'); await page.waitForTimeout(300); }
  await page.click('.bandeau-visiteur');
  const c = await L.waitFor(async () => { const x = await comptoir(page); return x.open && x.jour ? x : null; }, 4000);
  await page.waitForTimeout(700); // un toucher juste après l'ouverture serait le second de celui qui l'a ouverte
  await page.evaluate((sel) => document.querySelector(sel)?.closest('.offre').scrollIntoView({ block: 'center' }), `#dlg-batiment .offre[data-offre="${JOUR}"] p`);
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
    R.check('fiche : le comptoir du quai, avec la ligne du jour', !!c && c.id === 'quai-1', String(c && c.id));
    R.check('ligne du jour : après les quatre offres de la semaine, sous sa propre phrase',
      c.ordre && c.semaine.length === 4 && !c.semaine.some(([id]) => id === JOUR) && c.phrase === sp(BAT.comptoir['jour.intro']), JSON.stringify([c.ordre, c.semaine, c.phrase]));
    R.check('ligne du jour : « 20 Matériaux contre 10 Énergie », « Échanger » ouvert, nommé pour le lecteur d’écran',
      c.jour.troc === '20 Matériaux contre 10 Énergie' && c.jour.etat === 'libre' && c.jour.off === false && c.jour.label === 'Échanger 20 Matériaux contre 10 Énergie', JSON.stringify(c.jour));
    R.check('ligne du jour : bouton de 44 px au moins, rien ne déborde', c.jour.h >= 43.99 && c.jour.w >= 44 && c.debord.length === 0, JSON.stringify([c.jour.w, c.jour.h, c.debord]));
    await shot(page, '42-jour');

    const { page: p2 } = await newPage({}, { reducedMotion: 'reduce' });
    await p2.clock.install({ time: AVANT });
    await p2.goto(srv.url);
    await L.ready(p2);
    await L.closeWelcome(p2, 1500);
    await p2.waitForTimeout(600);
    const c2 = await ouvrirParBandeau(p2, compact);
    R.check('second appareil : la ligne du jour est ouverte, lui aussi', c2.jour.etat === 'libre', JSON.stringify(c2.jour));

    // ───── double toucher : un seul échange ; on note où tombe chaque toucher
    const gA = srv.game();
    const l0 = srv.ledger().length;
    await L.said(page, true);
    const pt = await centre(page, BTN);
    await page.evaluate(() => { window.__taps = []; document.addEventListener('click', (e) => window.__taps.push(`${e.target.closest('.offre')?.dataset.offre}:${e.target.closest('.offre-go:not([aria-disabled])') ? 'echanger' : e.target.closest('.offre-fait') ? 'fait' : e.target.closest('button')?.className || e.target.tagName}`), true); });
    await page.touchscreen.tap(pt[0], pt[1]);
    await page.waitForTimeout(150);
    await page.touchscreen.tap(pt[0], pt[1]);
    const taps = await page.evaluate(() => window.__taps);
    console.log(`  note : cible des deux touchers (${tag}) : ${taps.join(', ')}`);
    R.check('double toucher : le premier toucher tombe sur « Échanger » du jour, le second sur la même ligne', taps.length === 2 && taps[0] === `${JOUR}:echanger` && taps[1].startsWith(`${JOUR}:`), JSON.stringify(taps));
    const g1 = await L.waitFor(() => { const g = srv.game(); return g.echangeDuJour ? g : null; }, 5000);
    await page.waitForTimeout(1200);
    const gB = srv.game();
    R.check('double toucher : un seul échange au serveur (−20 Matériaux, +10 Énergie, la Nourriture intacte)',
      !!g1 && r1(gB.resources.materials - gA.resources.materials) === -20 && r1(gB.resources.energy - gA.resources.energy) === 10 && gB.resources.food === gA.resources.food, `${res(gA)} → ${res(gB)} (touchers : ${JSON.stringify(taps)})`);
    R.check('échange : la partie note le jour (samedi), les offres de la semaine intactes', gB.echangeDuJour === SAM && JSON.stringify(gB.visite) === JSON.stringify(gA.visite), JSON.stringify([gB.echangeDuJour, gB.visite]));
    R.check('échange : rien au registre, les tâches intactes', srv.ledger().length === l0 && JSON.stringify(srv.readTasks().map((x) => [x.id, x.status])) === JSON.stringify(TASKS.map((x) => [x.id, x.status])), JSON.stringify(srv.ledger().slice(l0)));
    c = await comptoir(page);
    R.check('ligne du jour : « Fait aujourd’hui » à la place du bouton', c.jour.etat === 'fait' && c.jour.fait === `${BAT.comptoir.fait} ${sp(BAT.comptoir['jour.fait.quand'])}`, JSON.stringify(c.jour));
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
    R.check('second appareil : la ligne dit « Fait aujourd’hui », la barre montre les chiffres du serveur',
      !!c2b && !!await L.waitFor(async () => (await L.resValue(p2, 'materiaux')) === Math.floor(g3.resources.materials) && (await L.resValue(p2, 'energie')) === Math.floor(g3.resources.energy), 4000), JSON.stringify(c2b && c2b.jour));
    await p2.close();

    // ───── passage de 4 h : la ligne s'ouvre de nouveau ; au clavier, le focus reste sur la ligne
    await fermer(page);
    await page.clock.fastForward(APRES.getTime() - await page.evaluate(() => Date.now()));
    await L.closeWelcome(page, 2500);
    await page.waitForTimeout(800);
    c = await ouvrirParBandeau(page, compact);
    R.check('4 h : la ligne du jour est de nouveau ouverte', c.jour.etat === 'libre' && c.jour.off === false, JSON.stringify(c.jour));
    const gC = srv.game();
    await L.said(page, true);
    await page.focus(BTN);
    await page.keyboard.press('Enter');
    const g4 = await L.waitFor(() => { const g = srv.game(); return g.echangeDuJour === DIM ? g : null; }, 5000);
    R.check('clavier : l’échange du dimanche arrive au serveur (−20 Matériaux, +10 Énergie)', !!g4 && r1(g4.resources.materials - gC.resources.materials) === -20 && r1(g4.resources.energy - gC.resources.energy) === 10, `${res(gC)} → ${g4 && res(g4)}`);
    const focus = await L.waitFor(() => page.evaluate((JOUR) => { const a = document.activeElement; return a?.closest(`.offre[data-offre="${JOUR}"]`) ? { cls: a.className, ligne: a.closest('.offre').dataset.etat } : null; }, JOUR), 2000);
    R.check('clavier : le focus reste sur la ligne, sur « Fait aujourd’hui »', !!focus && focus.cls === 'offre-fait' && focus.ligne === 'fait', JSON.stringify(focus));
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
    R.check('169 Matériaux : bouton verrouillé, cadenas et raison du cœur sous la ligne, reliée au bouton',
      c.jour.etat === 'verrou' && c.jour.off === true && c.jour.raison === raison && c.jour.decrit === `offre-${JOUR}-raison`, JSON.stringify(c.jour));
    R.check('169 Matériaux : la raison tient dans la fiche, rien ne déborde', c.debord.length === 0, JSON.stringify(c.debord));
    await shot(p3, '42-manque');
    await L.said(p3, true);
    await p3.click(BTN, { force: true }); // verrouillé (aria-disabled) : Playwright attendrait qu'il s'ouvre
    await p3.waitForTimeout(900);
    R.check('169 Matériaux : le toucher ne dépense rien', res(srv.game()) === res(g6) && !srv.game().echangeDuJour, res(srv.game()));
    R.check('169 Matériaux : la raison est lue', (await L.said(p3)).some((x) => sp(x.text) === raison), JSON.stringify(await L.said(p3)));
  }, { tasks: TASKS, game: (core) => village(core) });
})();
