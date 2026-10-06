// 26. Fiches des bâtiments : un vrai toucher sur la carte ouvre la fiche ; trois lignes (« Ce que c’est », « Ce que ça
// fait », « Maintenant ») ; un geste verrouillé reste visible, à plat, avec sa raison écrite et un cadenas, et l'activer
// ne fait que redire la raison ; cibles de 44 px ; au clavier, « Carte en liste » mène à la même fiche et le geste se
// fait avec Entrée ; la liste montre l'état de chaque emplacement. Titres fictifs.
const L = require('./lib.cjs');

const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'f1', task: 'Ranger le garde-manger', domain: 'Maison', difficulty: 3, length: 2, priority: 7, status: 'todo', created: day(-2) },
  { id: 'f2', task: 'Arroser les plates-bandes', domain: 'Terrain', difficulty: 2, length: 2, priority: 5, status: 'todo', created: day(-1) },
];

const sheetInfo = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-batiment');
  const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
  const b = d.querySelector('[data-action="bat-geste"]');
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const th = d.querySelector('.bat-thumb');
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '', nom: txt(d.querySelector('.bat-nom')),
    labels: [...d.querySelectorAll('.help-lines dt')].map(txt), values: [...d.querySelectorAll('.help-lines dd')].map(txt),
    raison: txt(d.querySelector('#bat-raison')), cadenas: !!d.querySelector('#bat-raison use[href$="#i-lock"]'),
    geste: b ? { label: txt(b), off: b.getAttribute('aria-disabled') === 'true', desc: b.getAttribute('aria-describedby'), cadenas: !!b.querySelector('use[href$="#i-lock"]'), box: box(b) } : null,
    fermer: box(d.querySelector('[data-close]')),
    vignette: !!th && !th.hidden && !!th.querySelector('svg'),
    deborde: [...d.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length,
  };
});

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

L.runScenario('26. fiches des bâtiments : trois lignes, verrou, 44 px, clavier', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page, 1500);
  await page.waitForTimeout(600);
  const g0 = srv.game();

  // ───── un vrai toucher sur l'emplacement du grenier (rang Hameau : verrouillé)
  const p = await hitPoint(page, 'grenier-1');
  R.check('l’emplacement du grenier a un point touchable sur la carte', !!p);
  if (p) await page.mouse.click(p[0], p[1]);
  const s = await L.waitFor(async () => { const x = await sheetInfo(page); return x.open ? x : null; }, 3000);
  R.check('le toucher ouvre sa fiche', s && s.id === 'grenier-1' && s.nom === 'Emplacement du grenier', JSON.stringify(s));
  if (!s) return;
  R.check('trois lignes : Ce que c’est, Ce que ça fait, Maintenant', s.labels.join('|') === 'Ce que c’est|Ce que ça fait|Maintenant' && s.values.every(Boolean), JSON.stringify(s.labels));
  R.check('« Ce que ça fait » : le stockage en plus', s.values[1] === 'Garde 40 Nourriture de plus en réserve.', s.values[1]);
  R.check('« Maintenant » : le coût, puis la raison du verrou avec un cadenas', s.values[2].startsWith('Coûte 30 Matériaux.') && s.raison === 'Hameau : encore 3 habitants.' && s.cadenas, JSON.stringify([s.values[2], s.raison, s.cadenas]));
  R.check('geste verrouillé : visible, aria-disabled, décrit par la raison, cadenas', s.geste && s.geste.label === 'Bâtir' && s.geste.off && s.geste.desc === 'bat-raison' && s.geste.cadenas, JSON.stringify(s.geste));
  R.check('cibles de 44 px : geste et fermeture', s.geste.box[0] >= 44 && s.geste.box[1] >= 44 && s.fermer[0] >= 44 && s.fermer[1] >= 44, JSON.stringify([s.geste.box, s.fermer]));
  R.check('la fiche montre le dessin de la carte', s.vignette);
  R.check('rien ne déborde de l’écran dans la fiche', s.deborde === 0, String(s.deborde));
  await shot(page, '26-verrou');
  await L.said(page, true);
  // aria-disabled : Playwright le tient pour désactivé ; le doigt, lui, peut toucher le bouton (force)
  await page.click('#dlg-batiment [data-action="bat-geste"]', { force: true });
  const dit = await L.waitFor(async () => (await L.said(page)).find((x) => x.text.replace(/\u00a0/g, ' ') === 'Hameau : encore 3 habitants.'), 3000);
  R.check('activer le geste verrouillé redit la raison, dans la fiche', dit && dit.voice === 'live' && dit.sheet === 'dlg-batiment', JSON.stringify(await L.said(page)));
  await page.waitForTimeout(600);
  R.check('… et ne bâtit rien', JSON.stringify(srv.game().batiments || []) === JSON.stringify(g0.batiments || []) && srv.game().resources.materials === g0.resources.materials);
  await page.keyboard.press('Escape');
  R.check('Échap ferme la fiche', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000));

  // ───── au clavier : Vue → Carte en liste (colonne de la carte) → chalet → Entrée → geste → Entrée
  await page.focus('[data-ow="vue"]');
  await page.keyboard.press('Enter');
  await page.focus('[data-ow="plan"]');
  await page.keyboard.press('Enter');
  R.check('« Carte en liste » s’ouvre au clavier', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-plan').open), 2000));
  const rows = await page.evaluate(() => [...document.querySelectorAll('#dlg-plan .ow-plan-bat')].map((li) => ({
    nom: li.querySelector('.ow-plan-bat-name').textContent, etat: li.querySelector('.ow-plan-bat-etat').textContent.replace(/\u00a0/g, ' '),
    h: Math.round(li.querySelector('[data-bat]').getBoundingClientRect().height), id: li.querySelector('[data-bat]').dataset.bat,
  })));
  R.check('la liste montre les 11 emplacements', rows.length === 11, JSON.stringify(rows.map((r) => r.id)));
  const row = (id) => rows.find((r) => r.id === id) || {};
  R.check('liste : même nom et même état que la fiche (grenier verrouillé, chalet à rebâtir, parcelle du départ)',
    row('grenier-1').etat === 'Verrouillé : Hameau : encore 3 habitants.' && row('chalet-1').nom === 'Chalet vide' && row('chalet-1').etat === 'À rebâtir' && row('parcelle-1').etat === 'Rien de semé',
    JSON.stringify([row('grenier-1'), row('chalet-1'), row('parcelle-1')]));
  R.check('liste : boutons « Ouvrir la fiche » de 44 px au moins', rows.every((r) => r.h >= 44), JSON.stringify(rows.map((r) => r.h)));
  // le titre de la liste a le focus ; Tab mène au premier bouton, les flèches parcourent la liste
  let inList = false;
  for (let i = 0; i < 4 && !inList; i++) {
    await page.keyboard.press('Tab');
    inList = await page.evaluate(() => !!document.activeElement?.closest('#dlg-plan .ow-plan-show'));
  }
  let focused = '';
  for (let i = 0; i < 24 && inList && focused !== 'chalet-1'; i++) {
    await page.keyboard.press('ArrowDown');
    focused = await page.evaluate(() => document.activeElement?.dataset?.bat || '');
  }
  R.check('les flèches mènent au bouton du premier chalet', focused === 'chalet-1', focused);
  await page.keyboard.press('Enter');
  const k = await L.waitFor(async () => { const x = await sheetInfo(page); return x.open && x.id === 'chalet-1' ? x : null; }, 3000);
  R.check('Entrée ouvre la fiche du chalet, geste « Rebâtir » possible', k && k.geste?.label === 'Rebâtir' && !k.geste.off, JSON.stringify(k));
  let onGeste = false;
  for (let i = 0; i < 4 && !onGeste; i++) {
    await page.keyboard.press('Tab');
    onGeste = await page.evaluate(() => document.activeElement?.dataset?.action === 'bat-geste');
  }
  R.check('Tab atteint le geste dans la fiche', onGeste);
  await page.keyboard.press('Enter');
  R.check('Entrée sur le geste : chalet rebâti et enregistré', await L.waitFor(() => (srv.game()?.batiments || []).some((b) => b.id === 'chalet-1'), 5000));
  const after = await L.waitFor(async () => { const x = await sheetInfo(page); return x.nom === 'Chalet' ? x : null; }, 3000);
  R.check('la fiche passe au chalet debout et garde le focus sur son geste', after && after.geste?.label === 'Accueillir une famille' && await page.evaluate(() => document.activeElement?.dataset?.action === 'bat-geste'), JSON.stringify(after));
  await page.keyboard.press('Escape');
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
  R.check('Échap : retour à la liste, sur le bouton du chalet', await L.waitFor(() => page.evaluate(() => document.activeElement?.dataset?.bat === 'chalet-1'), 2000), await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80)));
  R.check('la liste suit : le chalet est « Prêt pour une famille »', await L.waitFor(() => page.evaluate(() => document.querySelector('#dlg-plan [data-bat="chalet-1"]').closest('li').querySelector('.ow-plan-bat-etat').textContent === 'Prêt pour une famille'), 3000));
  R.check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await shot(page, '26-liste');
}, {
  tasks: TASKS,
  game: (core) => ({ ...L.quietState(core), resources: { energy: 5, materials: 20, food: 0 } }),
});
