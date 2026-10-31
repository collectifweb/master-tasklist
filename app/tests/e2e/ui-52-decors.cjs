// 52. Les décors à placer soi-même (lot K), aux trois largeurs. Un village fictif au rang Bourg, un érable déjà posé.
//   - l'onglet « Décors » du catalogue (troisième onglet, flèches) : la phrase d'en tête (rien sur ce qu'un décor rapporte,
//     décision 52), « 10 coins libres sur 11 », une
//     rangée par décor avec son dessin et son prix en pastilles, « Sur l'île » (où il est, Déplacer, Ranger) ; cibles de
//     44 px, aucun débordement ;
//   - acheter au doigt : la rangée range le catalogue et ouvre le mode de pose (la barre « Où poser le banc? », un repère
//     rond de 44 px par coin libre, nommé ; bulles et plaques effacées) ; un double toucher sur un repère n'achète qu'un
//     banc, payé une fois ; la phrase lue ; le banc sur l'île, sans toucher ;
//   - « Ranger » : l'érable passe dans la remise, sans remboursement, le focus suit ; au clavier, « Poser » ouvre la pose,
//     les flèches passent d'un repère à l'autre, Échap rouvre l'onglet sur la même rangée ; Entrée pose, gratuitement, et
//     le clavier revient sur « Construire » ;
//   - « Déplacer » : le banc change de coin, gratuitement ; une autre commande de la carte (« Quêtes ») annule une pose sans
//     rouvrir le catalogue ; rechargée, l'île garde ses décors.
// Données fictives seulement.
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const TYPES = ['parcelle', 'parcelle', 'parcelle', 'atelier', 'serre', 'serre', 'eolienne', 'grenier', 'quai', 'tour', 'scierie', 'poulailler', 'cabane'];

function village(core) {
  const now = new Date();
  const day = core.gameDay(now);
  const g = L.quietState(core, now);
  g.resources = { energy: 300, materials: 600, food: 60 };
  g.habitants = 12;
  g.niveaux = { ...g.niveaux, ecole: 3, champs: 2, atelier: 2, mairie: 2, garage: 2, place: 2 };
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, core.addDays(day, -60)]));
  const n = {};
  g.batiments = [...['chalet-1', 'chalet-2', 'chalet-3'].map((id) => ({ id, type: 'chalet' })), ...TYPES.map((t) => ({ id: `${t}-${(n[t] = (n[t] || 0) + 1)}`, type: t }))];
  g.lastSeenDay = day;
  g.decors = { poses: { 'mairie-1': 'erable' }, remise: [] };
  return g;
}

const center = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const ouverte = (page) => L.waitFor(() => page.evaluate(() => { const d = document.getElementById('dlg-construire'); return d.open && !d.classList.contains('is-closing'); }), 2500);
const enPose = (page) => L.waitFor(() => page.evaluate(() => document.querySelector('.ow-pose')?.hidden === false), 2500);
const horsPose = (page) => L.waitFor(() => page.evaluate(() => !document.querySelector('.ow[data-pose]')), 2500);
const decorsServeur = (srv) => JSON.stringify(srv.game().decors || null);

/** L'onglet « Décors » ouvert : rangées, listes, cibles et débordement. */
const onglet = (page) => page.evaluate(() => {
  const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const d = document.getElementById('dlg-construire');
  const p = d.querySelector('#cat-decs');
  const small = [...p.querySelectorAll('button')].map((x) => [x, x.getBoundingClientRect()])
    .filter(([, q]) => q.width && (q.width < 43.99 || q.height < 43.99)).map(([x, q]) => `${x.dataset.action} ${q.width.toFixed(0)}×${q.height.toFixed(0)}`);
  const wide = [...d.querySelectorAll('*')].some((e) => { const q = e.getBoundingClientRect(); return q.width && (q.left < -1 || q.right > innerWidth + 1); });
  return {
    visible: !p.hidden,
    tabs: [...d.querySelectorAll('[role="tab"]')].map((t) => `${t.id}:${t.getAttribute('aria-selected')}`).join(),
    intro: sp(p.querySelector('.cat-dec-intro')?.textContent), coins: sp(p.querySelector('#cat-dec-coins')?.textContent),
    achats: [...p.querySelectorAll('.cat-dec')].map((li) => ({ id: li.dataset.decor, nom: sp(li.querySelector('.cat-nom').textContent), etat: li.dataset.etat,
      prix: [...li.querySelectorAll('.cat-prix .pastille')].map((x) => `${x.dataset.res} ${sp(x.textContent)}`).join(' + '),
      label: li.querySelector('.cat-dec-go').getAttribute('aria-label'), cout: sp(li.querySelector('.sr-only')?.textContent), dessin: !!li.querySelector('.cat-thumb svg') })),
    ile: [...p.querySelectorAll('.cat-dec-ile li')].map((li) => `${sp(li.querySelector('.cat-nom').textContent)} | ${sp(li.querySelector('.cat-dec-ou')?.textContent)} | ${[...li.querySelectorAll('button')].map((b) => b.textContent).join('+')}`),
    ileH: !p.querySelector('#cat-dec-ile-h').hidden,
    remise: [...p.querySelectorAll('.cat-dec-remise li')].map((li) => `${sp(li.querySelector('.cat-nom').textContent)} | ${[...li.querySelectorAll('button')].map((b) => b.textContent).join('+')}`),
    remiseH: !p.querySelector('#cat-dec-remise-h').hidden,
    focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.id || '',
    small, wide,
  };
});

/** Le mode de pose : barre, repères, ce qui s'efface, focus. */
const pose = (page) => page.evaluate(() => {
  const root = document.querySelector('.ow');
  const bar = document.querySelector('.ow-pose');
  const R = root.getBoundingClientRect();
  const reperes = [...document.querySelectorAll('.ow-coin')].map((c) => {
    const r = c.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const dedans = x > R.left + 30 && x < R.right - 30 && y > R.top + 150 && y < R.bottom - 150;
    const hit = dedans ? document.elementFromPoint(x, y) : null;
    return { coin: c.dataset.coin, w: r.width, h: r.height, label: c.getAttribute('aria-label'), tab: c.tabIndex, dedans, touche: dedans ? c.contains(hit) : null };
  });
  const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.getBoundingClientRect().width > 0);
  const zOut = document.querySelector('[data-zoom="out"]');
  return {
    actif: root.hasAttribute('data-pose'), titre: bar.querySelector('.ow-pose-t').textContent, n: bar.querySelector('.ow-pose-n').textContent,
    annuler: bar.querySelector('.ow-pose-x').textContent, barH: bar.querySelector('.ow-pose-x').getBoundingClientRect().height,
    reperes, focus: document.activeElement?.dataset?.coin || '', tabs: reperes.filter((r) => r.tab === 0).length,
    plaques: vis('.ow-plaque'), bulles: vis('.ow-bulle'), inertes: document.querySelector('.ow-ents-root').inert && document.querySelector('.ow-plaques').inert,
    zOut: zOut.getAttribute('aria-disabled'),
    wide: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});

L.runScenario('52. Les décors à placer soi-même', async ({ R, srv, newPage, tag, shot, core }) => {
  const compact = tag < 1000;
  const { page, context } = await newPage({}, { hasTouch: true, isMobile: compact });
  await context.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(page);
  await page.waitForTimeout(600);
  const g0 = srv.game();

  // ───── l'onglet « Décors », au clavier depuis les onglets
  await page.focus('[data-ow="build"]');
  await page.keyboard.press('Enter');
  R.check('« Construire » ouvre le catalogue', await ouverte(page));
  await page.waitForTimeout(300);
  await page.focus('#cat-bats-t');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  let o = await onglet(page);
  R.check('flèches : le troisième onglet, « Décors », s’affiche', o.visible && o.tabs === 'cat-bats-t:false,cat-qrts-t:false,cat-decs-t:true' && o.focus === 'cat-decs-t', JSON.stringify([o.tabs, o.focus]));
  R.check('en tête : la façon de faire, rien sur ce qu’un décor rapporte ; 10 coins libres sur 11', /coin libre/.test(o.intro) && !/rapporte/.test(o.intro) && o.coins === '10 coins libres sur 11', JSON.stringify([o.intro, o.coins]));
  R.check('neuf décors à acheter, dans l’ordre, chacun avec son dessin', o.achats.map((a) => a.id).join() === 'massif,epinette,nichoir,bouleau,erable,banc,chaise,cordee,lanterne' && o.achats.every((a) => a.dessin), JSON.stringify(o.achats.map((a) => a.id)));
  const banc = o.achats.find((a) => a.id === 'banc') || {};
  const lanterne = o.achats.find((a) => a.id === 'lanterne') || {};
  R.check('le banc : 150 Matériaux en pastille, nom du geste et prix lus', banc.etat === 'libre' && banc.prix === 'materiaux 150' && banc.label === 'Acheter et poser : Banc' && banc.cout === 'Coûte 150 Matériaux.', JSON.stringify(banc));
  R.check('la lanterne : Énergie et Matériaux', lanterne.prix === 'energie 60 + materiaux 200', JSON.stringify(lanterne));
  R.check('« Sur l’île » : l’érable à la Mairie, Déplacer et Ranger ; pas de remise', o.ileH && o.ile.join() === 'Érable | À la Mairie, coin 1 | Déplacer+Ranger' && !o.remiseH && !o.remise.length, JSON.stringify([o.ile, o.remise]));
  R.check('onglet : cibles de 44 px, aucun débordement', !o.small.length && !o.wide, JSON.stringify(o.small));
  await shot(page, '52-onglet');

  // ───── acheter un banc au doigt : le mode de pose
  await page.evaluate(() => document.querySelector('.cat-dec-go[data-decor="banc"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(700);
  await page.touchscreen.tap(...await center(page, '.cat-dec-go[data-decor="banc"]'));
  R.check('la rangée range le catalogue et ouvre le mode de pose', await enPose(page) && await page.evaluate(() => !document.getElementById('dlg-construire').open));
  await page.waitForTimeout(400);
  let p = await pose(page);
  R.check('la barre : « Où poser le banc? », « 10 coins libres », « Annuler » de 44 px', p.actif && p.titre === 'Où poser le banc?' && p.n === '10 coins libres' && p.annuler === 'Annuler' && p.barH >= 43.99, JSON.stringify(p));
  R.check('un repère rond de 44 px par coin libre, nommé', p.reperes.length === 10 && p.reperes.every((r) => r.w >= 43.99 && r.h >= 43.99 && r.label) && !p.reperes.some((r) => r.coin === 'mairie-1'), JSON.stringify(p.reperes.map((r) => [r.coin, r.label, r.w])));
  R.check('les repères visibles se touchent à leur centre', p.reperes.filter((r) => r.dedans).length >= 3 && p.reperes.filter((r) => r.dedans).every((r) => r.touche), JSON.stringify(p.reperes.filter((r) => r.dedans).map((r) => [r.coin, r.touche])));
  R.check('un seul arrêt de tabulation, sur un repère qui a le focus', p.tabs === 1 && !!p.focus, JSON.stringify([p.tabs, p.focus]));
  R.check('bulles et plaques effacées, objets de l’île inertes', !p.plaques && !p.bulles && p.inertes, JSON.stringify(p));
  if (compact) R.check('« Éloigner » à sa limite : pas plus loin que l’échelle proche', p.zOut === 'true', String(p.zOut));
  R.check('pose : aucun défilement horizontal', !p.wide);
  const dits = (await L.said(page, true)).map((s) => s.text);
  R.check('la pose est annoncée, avec la façon de faire', dits.some((s) => s.startsWith('Où poser le banc? 10 coins libres.') && /Échap annule/.test(s)), JSON.stringify(dits.slice(-3)));
  await shot(page, '52-pose');

  const cible = (p.reperes.find((r) => r.dedans && r.touche) || {}).coin;
  const pt = await center(page, `.ow-coin[data-coin="${cible}"]`);
  await page.touchscreen.tap(...pt);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(...pt);
  R.check('le repère touché pose le banc et quitte la pose', await horsPose(page));
  await page.waitForTimeout(600);
  const g1 = await L.waitFor(() => { const g = srv.game(); return g.decors?.poses?.[cible] === 'banc' ? g : null; }, 4000);
  R.check('un double toucher n’achète qu’un banc, payé une fois (150 Matériaux)', !!g1 && g1.resources.materials === g0.resources.materials - 150 && Object.keys(g1.decors.poses).length === 2, JSON.stringify(g1 && { m: [g0.resources.materials, g1.resources.materials], d: g1.decors }));
  const ent = await page.evaluate((c) => { const e = document.querySelector(`.ow-ent[data-id="decor-${c}"]`); return e ? { btn: e.classList.contains('is-btn') || e.tagName === 'BUTTON', pe: getComputedStyle(e).pointerEvents } : null; }, cible);
  R.check('le banc est sur l’île, à son coin, sans toucher', !!ent && !ent.btn, JSON.stringify(ent));
  const dits2 = (await L.said(page, true)).map((s) => s.text);
  R.check('la phrase lue : où il est et son prix', dits2.some((s) => /^Sur l’île : le banc, .+, pour 150 Matériaux\.$/.test(s)), JSON.stringify(dits2));
  await shot(page, '52-pose-faite');

  // ───── ranger l'érable : dans la remise, sans remboursement
  await page.waitForTimeout(900);
  await page.click('[data-ow="build"]');
  await ouverte(page);
  await page.waitForTimeout(300);
  await page.click('#cat-decs-t');
  await page.waitForTimeout(700);
  o = await onglet(page);
  R.check('« Sur l’île » : l’érable et le banc', o.ile.length === 2 && o.ile.some((x) => x.startsWith('Banc |')) && o.ile.some((x) => x.startsWith('Érable | À la Mairie, coin 1')), JSON.stringify(o.ile));
  await page.click('[data-action="dec-ranger"][data-cle="mairie-1"]');
  await page.waitForTimeout(400);
  o = await onglet(page);
  R.check('« Ranger » : l’érable passe dans la remise, le focus suit', o.remiseH && o.remise.join() === 'Érable | Poser' && o.ile.length === 1 && o.focus === 'Poser l’érable de la remise', JSON.stringify([o.ile, o.remise, o.focus]));
  const g2 = await L.waitFor(() => { const g = srv.game(); return g.decors?.remise?.includes('erable') ? g : null; }, 4000);
  R.check('rien n’est remboursé', !!g2 && g2.resources.materials === g1.resources.materials, JSON.stringify(g2 && g2.resources));
  R.check('la phrase lue : « Dans la remise : l’érable. »', (await L.said(page, true)).some((s) => s.text === 'Dans la remise : l’érable.'));

  // ───── au clavier : Poser, flèches, Échap rouvre l'onglet ; Entrée pose gratuitement
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter');
  R.check('« Poser » (Entrée) ouvre la pose de l’érable', await enPose(page) && (await pose(page)).titre === 'Où poser l’érable?');
  await page.waitForTimeout(300);
  const f0 = (await pose(page)).focus;
  let f1 = f0;
  for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
    await page.keyboard.press(k);
    f1 = (await pose(page)).focus;
    if (f1 !== f0) break;
  }
  R.check('les flèches passent d’un repère à l’autre', !!f1 && f1 !== f0, JSON.stringify([f0, f1]));
  await page.keyboard.press('Escape');
  R.check('Échap annule : le catalogue se rouvre sur « Décors »', await horsPose(page) && await ouverte(page));
  await page.waitForTimeout(300);
  o = await onglet(page);
  R.check('… le focus sur la même rangée, rien n’a bougé', o.tabs.endsWith('cat-decs-t:true') && o.focus === 'Poser l’érable de la remise' && decorsServeur(srv) === JSON.stringify(g2.decors), JSON.stringify([o.tabs, o.focus]));
  R.check('« Pose annulée. » est lu', (await L.said(page, true)).some((s) => s.text === 'Pose annulée.'));
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter');
  await enPose(page);
  await page.waitForTimeout(300);
  const coinErable = (await pose(page)).focus;
  await page.keyboard.press('Enter');
  const g3 = await L.waitFor(() => { const g = srv.game(); return g.decors?.poses?.[coinErable] === 'erable' ? g : null; }, 4000);
  R.check('Entrée pose l’érable depuis la remise, gratuitement', !!g3 && !g3.decors.remise.length && g3.resources.materials === g2.resources.materials, JSON.stringify(g3 && { d: g3.decors, m: g3.resources.materials }));
  R.check('le clavier revient sur « Construire »', await page.evaluate(() => document.activeElement?.dataset?.ow === 'build'));

  // ───── déplacer le banc ; une autre commande annule une pose sans rouvrir le catalogue
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter'); // le focus est sur « Construire »
  await ouverte(page);
  await page.waitForTimeout(300);
  await page.click('#cat-decs-t');
  await page.waitForTimeout(700);
  await page.click(`[data-action="dec-deplacer"][data-cle="${cible}"]`);
  R.check('« Déplacer » : « Où mettre le banc? »', await enPose(page) && (await pose(page)).titre === 'Où mettre le banc?');
  await page.waitForTimeout(900); // la souris : un clic dans les 800 ms serait pris pour le second d'un double clic
  const vers = (await pose(page)).reperes.find((r) => r.dedans && r.touche)?.coin;
  await page.click(`.ow-coin[data-coin="${vers}"]`);
  const g4 = await L.waitFor(() => { const g = srv.game(); return g.decors?.poses?.[vers] === 'banc' ? g : null; }, 4000);
  R.check('le banc change de coin, gratuitement', !!g4 && !g4.decors.poses[cible] && g4.resources.materials === g3.resources.materials, JSON.stringify(g4 && g4.decors));
  await page.waitForTimeout(900);
  await page.click('[data-ow="build"]');
  await ouverte(page);
  await page.click('#cat-decs-t');
  await page.waitForTimeout(700);
  await page.click('.cat-dec-go[data-decor="massif"]');
  await enPose(page);
  await page.waitForTimeout(900);
  await page.click('[data-ow="quetes"]');
  await page.waitForTimeout(600);
  R.check('« Quêtes » pendant une pose : la pose finit, le catalogue reste fermé, rien n’est acheté', !await page.evaluate(() => !!document.querySelector('.ow[data-pose]')) && !await page.evaluate(() => document.getElementById('dlg-construire').open) && srv.game().resources.materials === g4.resources.materials);

  // ───── rechargée, l'île garde ses décors
  await page.reload();
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await page.waitForTimeout(800);
  const apres = await page.evaluate(() => [...document.querySelectorAll('.ow-ent')].map((e) => e.dataset.id).filter((id) => id?.startsWith('decor-')).sort());
  R.check('rechargée : le banc et l’érable sont sur l’île, à leurs coins', apres.join() === [`decor-${coinErable}`, `decor-${vers}`].sort().join(), JSON.stringify(apres));
}, { game: (core) => village(core) });
