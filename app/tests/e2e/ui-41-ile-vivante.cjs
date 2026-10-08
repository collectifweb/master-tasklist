// 41. L'île vivante (lot E) : les habitants logés vont de leur chalet à leur lieu de travail, y restent, puis rentrent.
//   - une figurine par habitant logé (au plus 15) ; aucune ne se touche : un toucher sur elle tombe sur ce qui est dessous ;
//   - île vivante par défaut : 12 s après le dernier geste, les figurines marchent encore, sans aucune image demandée
//     (requestAnimationFrame) : le mouvement est en CSS, la profondeur suit la position (recopiée quatre fois par seconde) ;
//   - onglet caché : plus aucune animation de figurine en cours ;
//   - Réglages, « Économie de batterie » (case de 44 px) : enregistrée sur l'appareil, annoncée ; 12 s après le dernier
//     geste, l'île est immobile (aucune animation en cours dans le monde) ; le réglage tient après un rechargement ;
//     décochée, l'île revit ;
//   - mouvement réduit : les figurines restent visibles et immobiles ;
//   - aucun défilement horizontal. Données fictives seulement.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'v1', task: 'Ranger le cabanon', domain: 'Terrain', difficulty: 3, length: 2, priority: 6, status: 'todo', created: day(-2) },
  { id: 'v2', task: 'Trier le courrier', domain: 'Administratif', difficulty: 2, length: 2, priority: 5, status: 'todo', created: day(-1) },
];

function village(core) {
  const g = L.quietState(core);
  g.resources = { energy: 64, materials: 40, food: 20 };
  g.habitants = 4;
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, day(-20)]));
  g.batiments = [
    { id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' },
    { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }, { id: 'grenier-1', type: 'grenier' },
  ];
  return g;
}

// ───── lectures de l'écran
const RAF = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => { window.__raf++; return o(cb); }; };
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600); };
/** Position à l'écran (boîte de .ow-hab-pas) et opacité de chaque figurine. */
const figures = (page) => page.evaluate(() => [...document.querySelectorAll('.ow-ent.m-hab')].map((e) => {
  const p = e.querySelector('.ow-hab-pas');
  const r = p.getBoundingClientRect();
  return { id: e.dataset.id, x: r.x, y: r.y, w: r.width, h: r.height, o: Number(getComputedStyle(p).opacity), pe: getComputedStyle(e).pointerEvents };
}));
/** Animations en cours : celles des figurines et toutes celles du monde. */
const enCours = (page) => page.evaluate(() => {
  const run = document.getAnimations().filter((a) => a.playState === 'running');
  const cible = (a) => a.effect && a.effect.target;
  return { hab: run.filter((a) => cible(a)?.closest?.('.m-hab')).length, monde: run.filter((a) => cible(a)?.closest?.('.ow')).length };
});
const rafPendant = (page, ms) => page.evaluate(async (ms) => { const r0 = window.__raf; await new Promise((r) => setTimeout(r, ms)); return window.__raf - r0; }, ms);
const bouge = (avant, apres) => apres.some((f) => { const a = avant.find((x) => x.id === f.id); return a && Math.hypot(f.x - a.x, f.y - a.y) >= 2; });
/**
 * Profondeur posée (z-index) contre profondeur attendue à l'endroit où la figurine se trouve : pied à Y (px monde) →
 * u + v = Y / 16, profondeur = u + v + 1,05, z = 100 + arrondi(10 × profondeur) (world/scene.js). Écart toléré : 4, le
 * chemin parcouru en un quart de seconde (la profondeur est recopiée quatre fois par seconde).
 */
const profondeurs = (page) => page.evaluate(() => {
  const out = { vues: 0, ecarts: [] };
  for (const e of document.querySelectorAll('.ow-ent.m-hab')) {
    const p = e.querySelector('.ow-hab-pas');
    const cs = getComputedStyle(p);
    if (Number(cs.opacity) < 0.5) continue;
    const ty = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform).m42;
    const y = parseFloat(e.style.top) + 29 + ty;
    const z = 100 + Math.round(10 * (y / 16 + 1.05));
    out.vues++;
    const pose = Number(getComputedStyle(e).zIndex);
    if (Math.abs(pose - z) > 4) out.ecarts.push(`${e.dataset.id} ${pose}≠${z}`);
  }
  return out;
});
const ambiance = (page) => page.evaluate(() => document.querySelector('.ow').dataset.ambient);
const defile = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
/** Le toucher passe au travers : au centre de chaque figurine visible, l'élément touché n'est jamais une figurine. */
const traversables = (page) => page.evaluate(() => {
  const out = { vues: 0, prises: [] };
  for (const e of document.querySelectorAll('.ow-ent.m-hab')) {
    const p = e.querySelector('.ow-hab-pas');
    const r = p.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height * 0.6;
    if (Number(getComputedStyle(p).opacity) < 0.5 || x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
    out.vues++;
    const hit = document.elementFromPoint(x, y);
    if (hit && hit.closest('.m-hab')) out.prises.push(e.dataset.id);
  }
  return out;
});

async function ouvrirReglages(page) {
  await L.openPanel(page);
  await page.click('[data-action="open-settings"]');
  await page.waitForSelector('#dlg-settings[open]');
  await settle(page);
}

L.runScenario('41. L’île vivante : habitants au travail, économie de batterie', async ({ R, srv, newPage, tag, core, shot }) => {
  const compact = tag < 1000;
  const g0 = srv.game();
  const loges = core.logements(g0);
  const attendus = Math.min(15, loges.habitants, loges.places);

  // ───── île vivante (réglage par défaut)
  const { context, page } = await newPage({}, { hasTouch: true, isMobile: compact });
  await context.addInitScript(RAF);
  await context.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(page);
  await settle(page);

  const f0 = await figures(page);
  R.check(`une figurine par habitant logé (${attendus})`, attendus === 4 && f0.length === attendus, JSON.stringify({ attendus, vues: f0.length, loges }));
  R.check('aucune figurine ne prend le toucher (pointer-events: none)', f0.every((f) => f.pe === 'none'), JSON.stringify(f0.map((f) => f.pe)));

  await page.waitForTimeout(12000);
  const avant = await figures(page);
  const marche = await L.waitFor(async () => bouge(avant, await figures(page)), 20000, 500);
  R.check('12 s après le dernier geste, l’île reste vivante et une figurine se déplace', await ambiance(page) === 'on' && !!marche);
  const vivant = await enCours(page);
  const raf = await rafPendant(page, 2000);
  R.check('île vivante : animations des figurines en cours, 0 requestAnimationFrame en 2 s', vivant.hab > 0 && raf === 0, JSON.stringify({ ...vivant, raf }));
  // la profondeur suit la marche : trois relevés espacés d'une seconde et demie, toutes les figurines visibles
  const prof = [];
  for (let k = 0; k < 3; k++) { if (k) await page.waitForTimeout(1500); prof.push(await profondeurs(page)); }
  R.check('la profondeur de chaque figurine suit sa position le long du trajet (écart ≤ 4)', prof.every((x) => x.vues > 0 && !x.ecarts.length), JSON.stringify(prof));
  const t = await traversables(page);
  R.check('un toucher au centre d’une figurine tombe sur ce qui est dessous', t.vues > 0 && !t.prises.length, JSON.stringify(t));
  R.check(`aucun défilement horizontal (${tag})`, !(await defile(page)));
  await shot(page, '41-vivante');

  // onglet caché : la page dit « cachée », le monde s'arrête ; de retour à l'écran, il repart
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  const cache = await enCours(page);
  R.check('onglet caché : aucune animation de figurine en cours', cache.hab === 0, JSON.stringify(cache));
  await page.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  R.check('de retour à l’écran, les figurines repartent', (await enCours(page)).hab > 0);

  // ───── Réglages : « Économie de batterie »
  await ouvrirReglages(page);
  const caseB = await page.evaluate(() => {
    const i = document.querySelector('#dlg-settings input[name="batterie"]');
    const row = i && i.closest('.check-row');
    return i ? { coche: i.checked, h: row.getBoundingClientRect().height, texte: row.textContent.replace(/\s+/g, ' ').trim() } : null;
  });
  R.check('Réglages : case « Économie de batterie », décochée au départ, ligne de 44 px', !!caseB && !caseB.coche && caseB.h >= 43.99 && /^Économie de batterie/.test(caseB.texte), JSON.stringify(caseB));
  R.check('Réglages : aucun défilement horizontal', !(await defile(page)));
  await shot(page, '41-reglages');
  await page.click('#dlg-settings input[name="batterie"]');
  await L.said(page, true);
  await page.click('#dlg-settings .sheet-foot [type="submit"]');
  const dit = await L.waitFor(async () => (await L.said(page)).find((s) => /Économie de batterie activée/.test(s.text)), 3000);
  R.check('l’enregistrement est annoncé (« Économie de batterie activée… »), sans redire le prénom', !!dit && !/Prénom|prénom/.test(dit.text), JSON.stringify(await L.said(page)));
  R.check('le réglage est gardé sur l’appareil', await page.evaluate(() => localStorage.getItem('oree.batterie.v1')) === '1');
  await page.waitForTimeout(12000);
  const eco = await enCours(page);
  R.check('économie : 12 s après le dernier geste, l’île est immobile (aucune animation du monde en cours, data-ambient=off)', await ambiance(page) === 'off' && eco.monde === 0, JSON.stringify(eco));

  // rechargement : le réglage tient
  await page.reload();
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(page);
  await page.waitForTimeout(12000);
  const eco2 = await enCours(page);
  R.check('après un rechargement, l’économie tient : île immobile 12 s après le dernier geste', await ambiance(page) === 'off' && eco2.monde === 0, JSON.stringify(eco2));
  await ouvrirReglages(page);
  R.check('après un rechargement, la case est cochée', await page.isChecked('#dlg-settings input[name="batterie"]'));
  await page.click('#dlg-settings input[name="batterie"]');
  await L.said(page, true);
  await page.click('#dlg-settings .sheet-foot [type="submit"]');
  const dit2 = await L.waitFor(async () => (await L.said(page)).find((s) => /Économie de batterie désactivée/.test(s.text)), 3000);
  R.check('décochée : annoncée, retirée de l’appareil', !!dit2 && await page.evaluate(() => localStorage.getItem('oree.batterie.v1')) === null);
  await page.waitForTimeout(12000);
  R.check('décochée : l’île revit (12 s après, data-ambient=on et figurines en mouvement)', await ambiance(page) === 'on' && (await enCours(page)).hab > 0);

  // ───── mouvement réduit : visibles, immobiles
  const { context: cr, page: pr } = await newPage({}, { reducedMotion: 'reduce', hasTouch: true, isMobile: compact });
  await cr.addInitScript(RAF);
  await pr.goto(srv.url);
  await L.ready(pr);
  await pr.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(pr);
  await settle(pr);
  const m0 = await figures(pr);
  await pr.waitForTimeout(2500);
  const m1 = await figures(pr);
  const mr = await enCours(pr);
  R.check('mouvement réduit : toutes les figurines visibles (opacité 1)', m0.length === attendus && m0.every((f) => f.o === 1), JSON.stringify(m0.map((f) => f.o)));
  R.check('mouvement réduit : aucune figurine ne bouge, aucune animation de figurine', !bouge(m0, m1) && mr.hab === 0, JSON.stringify(mr));
  await shot(pr, '41-reduit');
}, { tasks: TASKS, game: village });
