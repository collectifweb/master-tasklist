// 53. Le phare allumé et ses escales (lot Y), aux trois largeurs. Un village fictif au rang Bourg, le phare debout.
//   - éteint : sa fiche dit la lanterne éteinte, « Allumer le phare » (principal, décrit par son prix, 100 Énergie en
//     pastille) ; un double toucher ne l'allume qu'une fois, payé une fois ; la fiche se range, la lanterne s'allume sur
//     l'île avec son halo et son faisceau ; la phrase lue, la réplique de Fanal, le clavier sur le phare ; rouverte : « Allumé
//     jusqu'à dimanche », la lanterne allumée aussi dans le dessin de la fiche, « les plaisanciers arrivent demain »,
//     « Allumer le phare » à plat dont le toucher redit la raison sans rien payer ;
//   - le lendemain : le voilier au phare et sa bulle, nommée ; la bulle ouvre la fiche : ce qu'ils demandent, le canot
//     renversé qu'ils laisseront, en dessin ; un double toucher sur « Accueillir » ne paie qu'une fois ; la phrase lue,
//     Fanal ; le voilier repart, la bulle s'efface ; le canot est dans la remise de l'onglet « Décors », pas à vendre ;
//     rechargée, rien ne revient ;
//   - au clavier, en mouvement réduit : le phare, sa fiche, « Accueillir » ; le voilier part sans glisser ; le clavier
//     revient sur le phare ;
//   - sans assez de Nourriture (une place libre au chalet : la prochaine famille passe avant) : pas de bulle, mais le voilier
//     attend ; « Accueillir » à plat, cadenas et raison sur le bouton, son toucher la redit sans rien payer ; « Allumer » dit
//     qu'il faut d'abord les accueillir.
// Données fictives seulement.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REPLIQUES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'), 'utf8'));
const variantes = (id) => REPLIQUES.situations[id].variantes.map((v) => sp(v.texte));
const TYPES = ['parcelle', 'parcelle', 'parcelle', 'atelier', 'serre', 'serre', 'eolienne', 'grenier', 'quai', 'tour', 'scierie', 'poulailler', 'cabane'];

/** Village au rang Bourg, le phare debout ; escales(jour) : l'état des escales au départ. */
function village(core, { escales = null, res = { energy: 300, materials: 600, food: 60 } } = {}) {
  const now = new Date();
  const day = core.gameDay(now);
  const g = L.quietState(core, now);
  g.resources = res;
  g.habitants = 12;
  g.niveaux = { ...g.niveaux, ecole: 3, champs: 2, atelier: 2, mairie: 2, garage: 2, place: 2 };
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, core.addDays(day, -60)]));
  const n = {};
  g.batiments = [...['chalet-1', 'chalet-2', 'chalet-3'].map((id) => ({ id, type: 'chalet' })), ...TYPES.map((t) => ({ id: `${t}-${(n[t] = (n[t] || 0) + 1)}`, type: t }))];
  g.lastSeenDay = day;
  g.travaux = { phare: { payees: 4, finies: 4, le: core.addDays(day, -20) } };
  if (escales) g.escales = escales(day);
  return g;
}
function registre(core) {
  const now = new Date();
  const day = core.gameDay(now);
  return [{ key: `bonus:ouverture:${day}`, at: now.toISOString(), day, type: 'bonus', bonus: 'ouverture', pe: 0, energy: 0, materials: 0 }];
}
const attend = (core) => village(core, { escales: (d) => ({ allume: core.addDays(d, -1), accueillie: false, n: 0 }) });

/** Le dessin du phare sur l'île : '4' debout, '4+escale' avec le voilier (zone de toucher ôtée, comparé à chaque état). */
const variante = (page) => page.evaluate(async () => {
  const art = document.querySelector('.ow-ent[data-id="phare"] .ow-art');
  if (!art) return null;
  const vu = art.cloneNode(true);
  vu.querySelector('.ow-hit')?.remove();
  const { artFor } = await import(new URL('world/models.js', document.baseURI).href);
  const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const v of ['4', '4+escale']) {
    tmp.innerHTML = artFor({ model: 'phare', variant: v }).svg;
    if (vu.innerHTML === tmp.innerHTML) return v;
  }
  return '?';
});

/** Le phare sur l'île : bouton, lanterne, halo et faisceau, la bulle des plaisanciers. */
const ile = (page) => page.evaluate(() => {
  const b = document.querySelector('.ow-ent[data-id="phare"]');
  const halo = document.querySelector('.ow-halo[data-id="phare"]');
  const bu = document.querySelector('.ow-bulle[data-de="phare"]');
  const fx = halo && getComputedStyle(halo, '::before');
  return b ? {
    tag: b.tagName, allume: b.hasAttribute('data-allume'),
    halo: halo ? { on: halo.hasAttribute('data-on'), phare: halo.classList.contains('h-phare'), anim: fx.animationName, jeu: fx.animationPlayState } : null,
    ambiance: document.querySelector('.ow')?.dataset.ambient,
    bulle: bu ? { kind: bu.dataset.bulle, label: bu.getAttribute('aria-label') } : null,
  } : null;
});

/** La fiche du phare debout : lanterne, escale, gestes, raisons, cibles et débordement. */
const fiche = (page) => page.evaluate(() => {
  const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const d = document.getElementById('dlg-travaux');
  const btn = (s) => { const b = d.querySelector(s); return b ? { text: sp(b.querySelector(':scope > span:not(.commande-raison)')?.textContent), off: b.getAttribute('aria-disabled') === 'true', primaire: b.classList.contains('btn--primary'), desc: b.getAttribute('aria-describedby') || '', lock: !!b.querySelector('use[href$="#i-lock"]'), label: b.getAttribute('aria-label') || '', raison: sp(b.querySelector('.commande-raison')?.textContent) } : null; };
  const small = [...d.querySelectorAll('button, summary')].map((x) => [x, x.getBoundingClientRect()])
    .filter(([, q]) => q.width && (q.width < 43.99 || q.height < 43.99)).map(([x, q]) => `${x.dataset.action || x.tagName} ${q.width.toFixed(0)}×${q.height.toFixed(0)}`);
  const wide = [...d.querySelectorAll('*')].some((e) => { const q = e.getBoundingClientRect(); return q.width && (q.left < -1 || q.right > innerWidth + 1); });
  const lan = d.querySelector('.esc-lanterne');
  const scene = d.querySelector('.trv-scene');
  const e = d.querySelector('.commande.esc');
  const vitre = scene?.querySelector('.ow-thumb .lampg');
  return {
    open: d.open && !d.classList.contains('is-closing'),
    ligne: sp(d.querySelector('#trv-d')?.textContent),
    lanterne: lan ? { text: sp(lan.textContent), allume: lan.hasAttribute('data-allume') } : null,
    scene: scene ? { allume: scene.hasAttribute('data-allume'), legende: sp(scene.querySelector('figcaption')?.textContent), vitre: vitre ? getComputedStyle(vitre).fill : null } : null,
    route: sp(d.querySelector('.esc-route')?.textContent),
    escale: e ? { titre: sp(e.querySelector('#esc-t')?.textContent), demande: [...e.querySelectorAll('.commande-demande .commande-res')].map((r) => `${r.dataset.res} ${sp(r.querySelector('b')?.textContent)}`).join(), laisse: sp(e.querySelector('.esc-decor-nom')?.textContent), dessin: !!e.querySelector('.esc-decor-dessin svg') } : null,
    accueillir: btn('[data-action="esc-accueillir"]'),
    allumer: btn('[data-action="esc-allumer"]'),
    pastilles: [...d.querySelectorAll('.qrt-prix .pastille, .bat-prix .pastille')].map((p) => `${p.dataset.res} ${sp(p.textContent)}`).join(', '),
    prix: sp(d.querySelector('#esc-allumer-prix')?.textContent),
    raisonAllumer: sp(d.querySelector('#esc-allumer-raison')?.textContent),
    raisonVue: !!d.querySelector('#esc-allumer-raison:not(.sr-only)'),
    regle: sp(d.querySelector('.repli p')?.textContent),
    focus: d.contains(document.activeElement),
    small, wide,
  };
});
const fermee = (page, id) => L.waitFor(() => page.evaluate((x) => !document.getElementById(x).open, id), 2500);
const ouverte = (page, id) => L.waitFor(() => page.evaluate((x) => { const d = document.getElementById(x); return d.open && !d.classList.contains('is-closing'); }, id), 2500);
const calme = (page) => L.waitFor(() => page.evaluate(() => !document.querySelector('[data-joue]')), 10000);
const toucherPhare = async (page) => {
  await calme(page);
  await page.click('.ow-ent[data-id="phare"] .ow-hit');
  return ouverte(page, 'dlg-travaux');
};
const centreDe = (page, sel) => page.evaluate((s) => { const q = document.querySelector(s).getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, sel);
const focusSur = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a ? `${a.tagName}${a.dataset.id ? `[data-id=${a.dataset.id}]` : ''}${a.dataset.action ? `[data-action=${a.dataset.action}]` : ''}` : '';
});
const dits = async (page) => (await L.said(page)).map((x) => sp(x.text));
const fanal = (page) => page.evaluate(() => { const s = document.getElementById('speech'); return s && !s.hidden ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });

/** La bulle du phare, touchable : en touchant une flèche au bord tant qu'elle n'est pas à l'écran. */
async function bulleDuPhare(page) {
  for (let i = 0; i < 4; i++) {
    const x = await page.evaluate(() => {
      const touche = (n) => { const b = n.getBoundingClientRect(); const h = document.elementFromPoint(b.left + b.width / 2, b.top + 24); return h && n.contains(h) ? [b.left + b.width / 2, b.top + 24] : null; };
      const bu = document.querySelector('.ow-bulle[data-de="phare"]');
      if (bu && touche(bu)) return { bulle: touche(bu) };
      const bord = [...document.querySelectorAll('.ow-bord')].find((n) => !n.hidden && n.getBoundingClientRect().width);
      if (!bord) return null;
      const b = bord.getBoundingClientRect();
      return { bord: [b.left + b.width / 2, b.top + b.height / 2] };
    });
    if (!x) return null;
    if (x.bulle) return x.bulle;
    await page.mouse.click(...x.bord);
    await page.waitForTimeout(1100);
  }
  return null;
}

L.runScenario('53 · le phare allumé et ses escales', async ({ R, srv, tag, core, newPage, shot }) => {
  const compact = tag < 1000;
  const scroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const auj = core.gameDay(new Date());

  // ───── 1. au toucher : allumer le phare éteint
  {
    const { page } = await newPage({}, { hasTouch: true, isMobile: compact });
    await page.addInitScript(L.VOICES);
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1200);
    await page.waitForTimeout(600);
    const i0 = await ile(page);
    R.check(`le phare debout, éteint, sans halo ni bulle (${tag})`, i0 && (await variante(page)) === '4' && !i0.allume && !i0.halo && !i0.bulle, JSON.stringify(i0));
    R.check(`toucher le phare ouvre sa fiche (${tag})`, await toucherPhare(page));
    await page.waitForTimeout(350);
    let f = await fiche(page);
    const vitreEteinte = f.scene?.vitre;
    R.check(`fiche : « Debout », la lanterne éteinte et ce qu'elle ferait allumée (${tag})`, f.ligne === 'Debout' && f.lanterne && !f.lanterne.allume
      && f.lanterne.text === 'Éteint. Allumé pour la semaine, il attire un voilier de plaisanciers.' && !f.scene.allume && f.scene.legende === 'Debout' && !f.escale && !f.route, JSON.stringify(f));
    R.check(`fiche : « Allumer le phare », principal, décrit par son prix (100 Énergie en pastille) (${tag})`, f.allumer && f.allumer.text === 'Allumer le phare' && !f.allumer.off && f.allumer.primaire && f.allumer.desc === 'esc-allumer-prix'
      && f.pastilles === 'energie 100' && f.prix === 'Prix pour l’allumer cette semaine : 100 Énergie.' && !f.raisonAllumer, JSON.stringify({ a: f.allumer, p: f.pastilles, prix: f.prix }));
    R.check(`fiche : la règle des escales dans le repli (${tag})`, /^Allumé, le phare brille jusqu’au dimanche, pour 100 Énergie\. .+ coûte 20 Nourriture/.test(f.regle), f.regle);
    R.check(`fiche : cibles de 44 px, aucun débordement (${tag})`, !f.small.length && !f.wide && !(await scroll(page)), JSON.stringify({ small: f.small, wide: f.wide }));
    await shot(page, '53-eteint');

    await L.said(page, true);
    const g0 = srv.game();
    const go = await centreDe(page, '#dlg-travaux [data-action="esc-allumer"]');
    await page.touchscreen.tap(...go);
    await page.waitForTimeout(90);
    await page.touchscreen.tap(...go);
    R.check(`allumé aujourd'hui (${tag})`, await L.waitFor(() => srv.game()?.escales?.allume === auj, 6000), JSON.stringify(srv.game()?.escales));
    R.check(`la fiche se range aussitôt (${tag})`, await fermee(page, 'dlg-travaux'));
    await page.waitForTimeout(1800);
    const g1 = srv.game();
    R.check(`double toucher : allumé une fois, 100 Énergie payées une fois (${tag})`, g1.resources.energy === g0.resources.energy - 100 && g1.escales.accueillie === false && g1.escales.n === 0, JSON.stringify({ avant: g0.resources, apres: g1.resources, e: g1.escales }));
    const i1 = await ile(page);
    R.check(`sur l'île : la lanterne allumée, son halo de phare (${tag})`, i1.allume && i1.halo?.on && i1.halo.phare, JSON.stringify(i1));
    R.check(`… et son faisceau qui tourne quand l'ambiance joue (${tag})`, i1.halo?.anim === 'ow-faisceau' && (i1.ambiance === 'on' ? i1.halo.jeu === 'running' : i1.halo.jeu === 'paused'), JSON.stringify(i1));
    const lu = await dits(page);
    R.check(`la phrase lue : « Phare : allumé jusqu’à dimanche, pour 100 Énergie. » (${tag})`, lu.some((x) => x.startsWith('Phare : allumé jusqu’à dimanche, pour 100 Énergie.')), JSON.stringify(lu));
    const b1 = await fanal(page);
    R.check(`Fanal dit un mot de la lanterne (${tag})`, variantes('phare.allume').some((v) => b1.includes(v)), b1);
    R.check(`le clavier revient sur le phare (${tag})`, (await focusSur(page)) === 'BUTTON[data-id=phare]', await focusSur(page));
    await shot(page, '53-allume');

    // rouverte : allumé, les plaisanciers arrivent demain, « Allumer » à plat
    R.check(`le phare allumé se touche encore (${tag})`, await toucherPhare(page));
    await page.waitForTimeout(350);
    f = await fiche(page);
    R.check(`fiche : « Allumé jusqu’à dimanche », la lanterne allumée, aussi dans le dessin (${tag})`, f.ligne === 'Allumé jusqu’à dimanche' && f.lanterne?.allume
      && f.lanterne.text === 'Allumé jusqu’à dimanche : sa lanterne guide les voiliers vers le village.' && f.scene?.allume && f.scene.legende === 'allumé' && !!f.scene.vitre && f.scene.vitre !== vitreEteinte, JSON.stringify({ f, vitreEteinte }));
    R.check(`fiche : « les plaisanciers arrivent demain », sans carte d'escale (${tag})`, f.route === 'Leur voilier a vu la lanterne : les plaisanciers arrivent demain.' && !f.escale && !f.accueillir, JSON.stringify({ r: f.route, e: f.escale }));
    R.check(`fiche : « Allumer le phare » à plat, cadenas, décrit par sa raison, lue seulement (la ligne du voilier la montre), sans prix (${tag})`, f.allumer?.off && !f.allumer.primaire && f.allumer.lock && f.allumer.desc === 'esc-allumer-raison'
      && f.raisonAllumer === 'Les plaisanciers arrivent demain.' && !f.raisonVue && !f.pastilles, JSON.stringify({ a: f.allumer, r: f.raisonAllumer, vue: f.raisonVue, p: f.pastilles }));
    R.check(`fiche allumée : cibles de 44 px, aucun débordement (${tag})`, !f.small.length && !f.wide, JSON.stringify(f.small));
    await shot(page, '53-en-route');
    await L.said(page, true);
    await page.click('#dlg-travaux [data-action="esc-allumer"]', { force: true });
    await page.waitForTimeout(500);
    const lu2 = await dits(page);
    R.check(`le toucher redit la raison, sans rien payer, la fiche reste ouverte (${tag})`, lu2.includes('Les plaisanciers arrivent demain.') && srv.game().resources.energy === g1.resources.energy && (await fiche(page)).open, JSON.stringify(lu2));
  }

  // ───── 2. le lendemain, au toucher : la bulle, la fiche, accueillir
  const srv2 = await L.startServer({ game: attend(core), ledger: registre(core) });
  try {
    R.check(`préalable : rien n'empêche d'accueillir (${tag})`, core.refusAccueillirEscale(srv2.game(), srv2.ledger(), {}, new Date()) === null, String(core.refusAccueillirEscale(srv2.game(), srv2.ledger(), {}, new Date())));
    const { page } = await newPage({}, { hasTouch: true, isMobile: compact });
    await page.addInitScript(L.VOICES);
    await page.goto(srv2.url);
    await L.ready(page);
    await L.closeWelcome(page, 1200);
    await page.waitForTimeout(600);
    const i0 = await ile(page);
    R.check(`le voilier au phare, et sa bulle nommée (${tag})`, (await variante(page)) === '4+escale' && i0.bulle?.kind === 'escale' && sp(i0.bulle.label) === 'Phare : des plaisanciers à accueillir', JSON.stringify({ v: await variante(page), i0 }));
    await shot(page, '53-voilier');
    const pt = await bulleDuPhare(page);
    R.check(`la bulle se touche (${tag})`, !!pt);
    if (pt) await page.mouse.click(...pt);
    R.check(`la bulle ouvre la fiche du phare (${tag})`, await ouverte(page, 'dlg-travaux'));
    await page.waitForTimeout(350);
    const f = await fiche(page);
    R.check(`fiche : la carte des plaisanciers, 20 Nourriture demandées, le canot renversé laissé, en dessin (${tag})`, f.escale && f.escale.titre === 'Des plaisanciers au phare' && f.escale.demande === 'nourriture 20'
      && f.escale.laisse === 'Canot renversé' && f.escale.dessin, JSON.stringify(f.escale));
    R.check(`fiche : « Accueillir », principal, nommé avec le prix et le décor (${tag})`, f.accueillir && f.accueillir.text === 'Accueillir' && !f.accueillir.off && f.accueillir.primaire
      && f.accueillir.label === 'Accueillir les plaisanciers pour 20 Nourriture. Ils laisseront le canot renversé.', JSON.stringify(f.accueillir));
    R.check(`fiche : le voilier dans le dessin du phare (${tag})`, await page.evaluate(() => document.querySelectorAll('#dlg-travaux .trv-scene .ow-voilier').length === 1));
    R.check(`fiche d'escale : cibles de 44 px, aucun débordement (${tag})`, !f.small.length && !f.wide && !(await scroll(page)), JSON.stringify(f.small));
    await shot(page, '53-escale');

    await L.said(page, true);
    const g0 = srv2.game();
    const go = await centreDe(page, '#dlg-travaux [data-action="esc-accueillir"]');
    await page.touchscreen.tap(...go);
    await page.waitForTimeout(90);
    await page.touchscreen.tap(...go);
    R.check(`accueillis (${tag})`, await L.waitFor(() => srv2.game()?.escales?.accueillie === true, 6000), JSON.stringify(srv2.game()?.escales));
    R.check(`la fiche se range aussitôt (${tag})`, await fermee(page, 'dlg-travaux'));
    await page.waitForTimeout(2200);
    const g1 = srv2.game();
    R.check(`double toucher : une escale, 20 Nourriture payées une fois, le canot dans la remise (${tag})`, g1.resources.food === g0.resources.food - 20 && g1.escales.n === 1
      && JSON.stringify(g1.decors?.remise) === '["canot"]', JSON.stringify({ avant: g0.resources.food, apres: g1.resources.food, e: g1.escales, d: g1.decors }));
    const lu = await dits(page);
    R.check(`la phrase lue : accueillis, le prix, le canot dans la remise (${tag})`, lu.some((x) => x.startsWith('Phare : les plaisanciers sont accueillis, pour 20 Nourriture. Ils laissent le canot renversé dans la remise.')), JSON.stringify(lu));
    const b1 = await fanal(page);
    R.check(`Fanal salue les plaisanciers (${tag})`, variantes('escale.accueillie').some((v) => b1.includes(v)), b1);
    R.check(`le voilier est reparti, la bulle effacée (${tag})`, await L.waitFor(async () => (await variante(page)) === '4', 4000) && !(await ile(page)).bulle, JSON.stringify({ v: await variante(page), i: await ile(page) }));

    // le canot dans la remise de l'onglet « Décors », pas parmi ceux qu'on achète
    await calme(page);
    await page.click('[data-ow="build"]');
    await ouverte(page, 'dlg-construire');
    await page.waitForTimeout(300);
    await page.click('#cat-decs-t');
    await page.waitForTimeout(700);
    const o = await page.evaluate(() => {
      const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
      const p = document.querySelector('#cat-decs');
      return {
        remise: [...p.querySelectorAll('.cat-dec-remise li')].map((li) => `${sp(li.querySelector('.cat-nom').textContent)} | ${[...li.querySelectorAll('button')].map((b) => b.textContent).join('+')}`),
        achats: [...p.querySelectorAll('.cat-dec')].map((li) => li.dataset.decor),
        dessin: !!p.querySelector('.cat-dec-remise li .cat-thumb svg'),
      };
    });
    R.check(`« Dans la remise » : le canot renversé, à poser, avec son dessin ; il ne s'achète pas (${tag})`, o.remise.join() === 'Canot renversé | Poser' && o.dessin && !o.achats.includes('canot') && o.achats.length === 9, JSON.stringify(o));
    await shot(page, '53-remise');

    await page.reload();
    await L.ready(page);
    await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
    await page.waitForTimeout(800);
    const i2 = await ile(page);
    R.check(`rechargée : ni voilier ni bulle, le canot gardé (${tag})`, (await variante(page)) === '4' && !i2.bulle && JSON.stringify(srv2.game().decors?.remise) === '["canot"]', JSON.stringify({ v: await variante(page), i2 }));
  } finally {
    srv2.stop();
  }

  // ───── 3. au clavier, en mouvement réduit
  const srv3 = await L.startServer({ game: attend(core), ledger: registre(core) });
  try {
    const { page } = await newPage({}, { reducedMotion: 'reduce' });
    await page.addInitScript(L.VOICES);
    await page.goto(srv3.url);
    await L.ready(page);
    await L.closeWelcome(page, 1200);
    await page.waitForTimeout(600);
    await calme(page);
    await page.focus('.ow-ent[data-id="phare"]');
    await page.keyboard.press('Enter');
    R.check(`Entrée sur le phare ouvre sa fiche, le focus dedans (${tag})`, await ouverte(page, 'dlg-travaux') && (await fiche(page)).focus);
    let sur = '';
    for (let k = 0; k < 16 && !sur.includes('esc-accueillir'); k++) {
      await page.keyboard.press('Tab');
      sur = await focusSur(page);
    }
    R.check(`la tabulation atteint « Accueillir » (${tag})`, sur === 'BUTTON[data-action=esc-accueillir]', sur);
    const g0 = srv3.game();
    await page.keyboard.press('Enter');
    R.check(`Entrée accueille les plaisanciers (${tag})`, await L.waitFor(() => srv3.game()?.escales?.accueillie === true, 6000) && srv3.game().resources.food === g0.resources.food - 20, JSON.stringify(srv3.game()?.escales));
    R.check(`mouvement réduit : le voilier est parti en moins d'une seconde et demie (${tag})`, await L.waitFor(async () => (await variante(page)) === '4', 1500), await variante(page));
    await fermee(page, 'dlg-travaux');
    R.check(`le clavier revient sur le phare (${tag})`, await L.waitFor(async () => (await focusSur(page)) === 'BUTTON[data-id=phare]', 3000), await focusSur(page));
    // rouverte : « Allumer » suit le cœur (déjà allumé cette semaine, ou permis si hier était dimanche)
    await calme(page);
    await page.keyboard.press('Enter');
    await ouverte(page, 'dlg-travaux');
    await page.waitForTimeout(350);
    const f = await fiche(page);
    const attendu = core.refusAllumer(srv3.game(), srv3.ledger(), {}, new Date());
    R.check(`« Allumer » rouverte : ${attendu || 'permis'} (${tag})`, attendu ? f.allumer?.off && f.raisonAllumer === sp(attendu) : f.allumer && !f.allumer.off, JSON.stringify({ a: f.allumer, r: f.raisonAllumer }));
  } finally {
    srv3.stop();
  }

  // ───── 4. sans assez de Nourriture : pas de bulle, le voilier attend
  const srv4 = await L.startServer({ game: village(core, { escales: (d) => ({ allume: core.addDays(d, -1), accueillie: false, n: 0 }), res: { energy: 300, materials: 600, food: 5 } }), ledger: registre(core) });
  try {
    const { page } = await newPage({}, { hasTouch: true, isMobile: compact });
    await page.addInitScript(L.VOICES);
    await page.goto(srv4.url);
    await L.ready(page);
    await L.closeWelcome(page, 1200);
    await page.waitForTimeout(600);
    const i0 = await ile(page);
    R.check(`le voilier attend, sans bulle (${tag})`, (await variante(page)) === '4+escale' && !i0.bulle, JSON.stringify({ v: await variante(page), i0 }));
    R.check(`toucher le phare ouvre sa fiche (${tag})`, await toucherPhare(page));
    await page.waitForTimeout(350);
    const f = await fiche(page);
    const raison = sp(core.refusAccueillirEscale(srv4.game(), srv4.ledger(), {}, new Date()));
    R.check(`« Accueillir » à plat : cadenas, la raison du cœur (les familles d'abord) sur le bouton, décrit par elle (${tag})`, f.accueillir?.off && !f.accueillir.primaire && f.accueillir.lock && f.accueillir.desc === 'esc-raison'
      && /^Les familles d’abord : il faut \d+ Nourriture/.test(raison) && f.accueillir.raison === raison, JSON.stringify({ a: f.accueillir, raison }));
    R.check(`« Allumer » à plat : d'abord les accueillir, écrit (${tag})`, f.allumer?.off && f.raisonAllumer === 'Des plaisanciers attendent au phare : accueille-les d’abord.' && f.raisonVue, JSON.stringify({ a: f.allumer, r: f.raisonAllumer }));
    R.check(`fiche à plat : cibles de 44 px, aucun débordement (${tag})`, !f.small.length && !f.wide && !(await scroll(page)), JSON.stringify(f.small));
    await shot(page, '53-manque');
    await L.said(page, true);
    const g0 = srv4.game();
    await page.click('#dlg-travaux [data-action="esc-accueillir"]', { force: true });
    await page.waitForTimeout(500);
    const lu = await dits(page);
    R.check(`le toucher redit la raison, sans rien payer (${tag})`, lu.includes(raison) && srv4.game().resources.food === g0.resources.food && !srv4.game().escales.accueillie && (await fiche(page)).open, JSON.stringify(lu));
  } finally {
    srv4.stop();
  }
}, { game: (core) => village(core), ledger: (core) => registre(core) });
