// 51. Le phare, premier des Grands travaux (lot O), aux trois largeurs. Un village fictif au rang Bourg (12 habitants).
//   - au départ : le vieux phare éteint sur l'île, touchable et nommé ;
//   - le toucher ouvre sa fiche : « Le phare », « 4 étapes à bâtir », l'avant et l'après en dessins, les quatre étapes, le
//     prix en pastilles, la règle dans un repli fermé, « Bâtir la fondation » ; cibles de 44 px, aucun débordement ;
//   - payer : un double toucher ne paie qu'une étape ; la fiche se range, l'échafaudage monte du rocher (de bas en haut), la
//     phrase lue, la réplique de Fanal, le clavier sur le phare ; rouverte, la fiche montre le chantier et ses jours
//     travaillés, « Bâtir la tour » à plat, et son toucher redit l'état du chantier sans rien payer ;
//   - au clavier, en mouvement réduit : la quête qui finit la tour (phrase lue, Fanal, l'étape neuve sur l'île, la lanterne
//     éteinte) ; « Construire » → la rangée du phare (« Prochaine étape : la galerie ») → sa fiche, posée sur le catalogue,
//     Échap ne ferme qu'elle ; « Bâtir la galerie » : les deux feuilles se rangent, le clavier revient sur « Construire »,
//     l'échafaudage paraît sans monter ;
//   - la fin : la quête qui finit la lanterne l'allume le temps du moment (vitres et halo, de 2 à 4,5 secondes), puis
//     l'éteint ; la fiche dit « Debout », sans bouton ; le phare quitte le catalogue.
// Données fictives seulement.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REPLIQUES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'), 'utf8'));
const variantes = (id) => REPLIQUES.situations[id].variantes.map((v) => sp(v.texte));
const TYPES = ['parcelle', 'parcelle', 'parcelle', 'atelier', 'serre', 'serre', 'eolienne', 'grenier', 'quai', 'tour', 'scierie', 'poulailler', 'cabane'];

/** Village au rang Bourg ; travaux(jour) : l'état du phare au départ ; ledger : un jour travaillé avant-hier si demandé. */
function village(core, { travaux = null, res = { energy: 300, materials: 600, food: 60 } } = {}) {
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
  if (travaux) g.travaux = { phare: travaux(day) };
  return g;
}
function registre(core, { travaille = false } = {}) {
  const now = new Date();
  const day = core.gameDay(now);
  const l = [{ key: `bonus:ouverture:${day}`, at: now.toISOString(), day, type: 'bonus', bonus: 'ouverture', pe: 0, energy: 0, materials: 0 }];
  if (travaille) l.push({ key: 'reward:fictive:1', at: now.toISOString(), day: core.addDays(day, -2), type: 'reward', taskId: 'fictive', occurrence: 1, pe: 2, energy: 2, materials: 2 });
  return l;
}

/** L'état dessiné du phare sur l'île ('0' à '4', '+chantier'), retrouvé en comparant son dessin, zone de toucher ôtée, à
 *  chaque état possible (le dessin d'une étape commence comme celui de la précédente : il faut l'égalité). */
const variante = (page) => page.evaluate(async () => {
  const art = document.querySelector('.ow-ent[data-id="phare"] .ow-art');
  if (!art) return null;
  const vu = art.cloneNode(true);
  vu.querySelector('.ow-hit')?.remove();
  const { artFor } = await import(new URL('world/models.js', document.baseURI).href);
  const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const v of ['0', '1', '2', '3', '4', '0+chantier', '1+chantier', '2+chantier', '3+chantier']) {
    tmp.innerHTML = artFor({ model: 'phare', variant: v }).svg;
    if (vu.innerHTML === tmp.innerHTML) return v;
  }
  return '?';
});

/** Le phare sur l'île : bouton, nom lu, lanterne allumée, halo. */
const ile = (page) => page.evaluate(() => {
  const b = document.querySelector('.ow-ent[data-id="phare"]');
  const halo = document.querySelector('.ow-halo[data-id="phare"]');
  return b ? { tag: b.tagName, label: b.getAttribute('aria-label') || '', allume: b.hasAttribute('data-allume'), halo: halo ? (halo.hasAttribute('data-on') ? 'on' : 'off') : null } : null;
});

/** Les animations jouées sur le phare (dessin et halo) : les propriétés animées, pour reconnaître la montée (clip-path). */
const PISTE = () => {
  window.__animsPhare = new Set();
  const id = setInterval(() => {
    for (const a of document.getAnimations()) {
      const el = a.effect?.target;
      if (!el || !(el.closest?.('.ow-ent[data-id="phare"]') || el.matches?.('.ow-halo[data-id="phare"]'))) continue;
      for (const k of a.effect.getKeyframes()) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) window.__animsPhare.add(p);
    }
  }, 40);
  setTimeout(() => clearInterval(id), 9000);
};
const anims = (page) => page.evaluate(() => [...(window.__animsPhare || [])].sort());

/** Fiche ouverte : identité, dessins, étapes, prix, bouton, repli, cibles et débordement. */
const fiche = (page) => page.evaluate(() => {
  const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const d = document.getElementById('dlg-travaux');
  const b = d.querySelector('[data-action="trv-batir"]');
  const r = d.querySelector('.repli');
  const small = [...d.querySelectorAll('button, summary')].map((x) => [x, x.getBoundingClientRect()])
    .filter(([, q]) => q.width && (q.width < 43.99 || q.height < 43.99)).map(([x, q]) => `${x.dataset.action || x.tagName} ${q.width.toFixed(0)}×${q.height.toFixed(0)}`);
  const wide = [...d.querySelectorAll('*')].some((e) => { const q = e.getBoundingClientRect(); return q.width && (q.left < -1 || q.right > innerWidth + 1); });
  const scene = d.querySelector('.trv-scene');
  return {
    open: d.open && !d.classList.contains('is-closing'),
    pile: [...document.querySelectorAll('dialog.sheet[open]')].sort((a, c) => (a._z || 0) - (c._z || 0)).map((x) => x.id).join(),
    titre: sp(d.querySelector('#trv-t')?.textContent), ligne: sp(d.querySelector('#trv-d')?.textContent), quoi: sp(d.querySelector('.trv-quoi')?.textContent),
    scene: scene ? { etat: scene.dataset.etat || '', dessins: scene.querySelectorAll('figure svg').length, legendes: [...scene.querySelectorAll('figcaption')].map((x) => sp(x.textContent)).join(' | '),
      chantier: sp(scene.querySelector('.trv-chantier')?.textContent), crans: scene.querySelectorAll('.crans > span').length, pleins: scene.querySelectorAll('.crans > [data-plein]').length, muet: scene.getAttribute('aria-hidden') === 'true' } : null,
    maintenant: sp(d.querySelector('#trv-now')?.textContent),
    etapes: [...d.querySelectorAll('.trv-etape')].map((li) => `${sp(li.textContent)}${li.hasAttribute('data-fini') ? ' ✓' : li.hasAttribute('data-encours') ? ' …' : ''}`).join(', '),
    pastilles: [...d.querySelectorAll('.pastille')].map((p) => `${p.dataset.res} ${sp(p.textContent)}${p.hasAttribute('data-manque') ? ' manque' : ''}`).join(', '),
    prix: sp(d.querySelector('#trv-prix')?.textContent),
    batir: b ? { text: sp(b.textContent), off: b.getAttribute('aria-disabled') === 'true', primaire: b.classList.contains('btn--primary'), desc: b.getAttribute('aria-describedby'), lock: !!b.querySelector('use[href$="#i-lock"]') } : null,
    max: sp(d.querySelector('.qrt-max')?.textContent),
    repli: r ? { open: r.open, resume: sp(r.querySelector('summary').textContent) } : null,
    focus: d.contains(document.activeElement),
    small, wide,
  };
});
const fermee = (page, id) => L.waitFor(() => page.evaluate((x) => !document.getElementById(x).open, id), 2500);
const ouverte = (page, id) => L.waitFor(() => page.evaluate((x) => { const d = document.getElementById(x); return d.open && !d.classList.contains('is-closing'); }, id), 2500);
// une fois les moments joués (pendant un moment, toucher l'île le passe)
const calme = (page) => L.waitFor(() => page.evaluate(() => !document.querySelector('[data-joue]')), 10000);
const toucherPhare = async (page) => {
  await calme(page);
  await page.click('.ow-ent[data-id="phare"] .ow-hit');
  return ouverte(page, 'dlg-travaux');
};
const focusSur = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a ? `${a.tagName}${a.dataset.id ? `[data-id=${a.dataset.id}]` : ''}${a.dataset.ow ? `[data-ow=${a.dataset.ow}]` : ''}${a.dataset.action ? `[data-action=${a.dataset.action}]` : ''}` : '';
});
const dits = async (page) => (await L.said(page)).map((x) => sp(x.text));
const bulle = (page) => page.evaluate(() => { const s = document.getElementById('speech'); return s && !s.hidden ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
const dePanneau = async (page) => {
  if (await page.evaluate(() => document.getElementById('app').dataset.panel === 'open') && await page.locator('.panel-toggle').isVisible()) {
    await page.click('.panel-toggle');
    await page.waitForTimeout(450);
  }
};
const LANCE = (etape) => `Phare : les ouvriers commencent ${etape}, pour 250 Énergie et 500 Matériaux. Ils la bâtissent pendant les 2 jours travaillés qui suivent.`;

L.runScenario('51 · le phare, premier des Grands travaux', async ({ R, srv, tag, core, newPage, shot }) => {
  const compact = tag < 1000;
  const scroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  // ───── 1. au toucher : le vieux phare, sa fiche, payer la fondation
  {
    const { page } = await newPage({}, { hasTouch: true, isMobile: compact });
    await page.addInitScript(L.VOICES);
    await page.addInitScript(PISTE);
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1200);
    await page.waitForTimeout(600);
    const i0 = await ile(page);
    R.check(`le vieux phare sur l'île, éteint, touchable et nommé (${tag})`, i0 && i0.tag === 'BUTTON' && /phare/i.test(i0.label) && !i0.allume && (await variante(page)) === '0', JSON.stringify({ i0, v: await variante(page) }));
    R.check(`toucher le phare ouvre sa fiche (${tag})`, await toucherPhare(page));
    await page.waitForTimeout(350);
    let f = await fiche(page);
    R.check(`fiche : « Le phare », « 4 étapes à bâtir », ce qu'il est (${tag})`, f.titre === 'Le phare' && f.ligne === '4 étapes à bâtir' && f.quoi.startsWith('Une vieille tour de pierre sur un rocher'), JSON.stringify(f));
    R.check(`fiche : l'avant et l'après en dessins, muets (« maintenant », « après la fondation ») (${tag})`, f.scene && f.scene.dessins === 2 && f.scene.legendes === 'maintenant | après la fondation' && f.scene.muet && f.maintenant === 'Prochaine étape : la fondation.', JSON.stringify(f.scene) + f.maintenant);
    R.check(`fiche : les quatre étapes, aucune finie (${tag})`, f.etapes === 'Fondation, Tour, Galerie, Lanterne', f.etapes);
    R.check(`fiche : le prix en pastilles (250 Énergie, 500 Matériaux), lu (${tag})`, f.pastilles === 'energie 250, materiaux 500' && f.prix === 'Prix de la fondation : 250 Énergie et 500 Matériaux.', JSON.stringify({ p: f.pastilles, prix: f.prix }));
    R.check(`fiche : « Bâtir la fondation », bouton principal décrit par le prix (${tag})`, f.batir && f.batir.text === 'Bâtir la fondation' && !f.batir.off && f.batir.primaire && f.batir.desc === 'trv-prix', JSON.stringify(f.batir));
    R.check(`fiche : la règle dans un repli fermé (${tag})`, f.repli && !f.repli.open && f.repli.resume === 'Comment ça marche', JSON.stringify(f.repli));
    R.check(`fiche : cibles de 44 px, aucun débordement (${tag})`, !f.small.length && !f.wide && !(await scroll(page)), JSON.stringify({ small: f.small, wide: f.wide }));
    await shot(page, '51-fiche');

    // payer par un double toucher : une seule étape
    await L.said(page, true);
    const g0 = srv.game();
    const go = await page.evaluate(() => { const q = document.querySelector('#dlg-travaux [data-action="trv-batir"]').getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
    await page.touchscreen.tap(go[0], go[1]);
    await page.waitForTimeout(90);
    await page.touchscreen.tap(go[0], go[1]);
    R.check(`étape payée : la fondation, aujourd'hui (${tag})`, await L.waitFor(() => srv.game()?.travaux?.phare?.payees === 1, 6000), JSON.stringify(srv.game()?.travaux));
    R.check(`la fiche se range aussitôt (${tag})`, await fermee(page, 'dlg-travaux'));
    R.check(`l'échafaudage monte du rocher : une montée de bas en haut (clip-path) (${tag})`, await L.waitFor(async () => (await anims(page)).includes('clipPath'), 3000), JSON.stringify(await anims(page)));
    await page.waitForTimeout(1600);
    const g = srv.game();
    const auj = core.gameDay(new Date());
    R.check(`double toucher : une seule étape payée (250 Énergie, 500 Matériaux) (${tag})`, g.travaux.phare.payees === 1 && g.travaux.phare.finies === 0 && g.travaux.phare.le === auj
      && g.resources.energy === g0.resources.energy - 250 && g.resources.materials === g0.resources.materials - 500, JSON.stringify({ t: g.travaux, avant: g0.resources, apres: g.resources }));
    R.check(`sur l'île, la fondation en chantier (${tag})`, (await variante(page)) === '0+chantier', await variante(page));
    const lu = await dits(page);
    R.check(`la phrase lue : l'étape, son prix, les 2 jours travaillés (${tag})`, lu.some((x) => x.startsWith(LANCE('la fondation'))), JSON.stringify(lu));
    const b1 = await bulle(page);
    R.check(`Fanal dit un mot du chantier (${tag})`, variantes('phare.lance').some((v) => b1.includes(v)), b1);
    R.check(`le clavier revient sur le phare (${tag})`, (await focusSur(page)) === 'BUTTON[data-id=phare]', await focusSur(page));
    await shot(page, '51-chantier');

    // la fiche rouverte : le chantier et ses jours, « Bâtir la tour » à plat
    R.check(`le phare se touche encore pendant le chantier (${tag})`, await toucherPhare(page));
    await page.waitForTimeout(350);
    f = await fiche(page);
    R.check(`fiche en chantier : ce qu'on bâtit, 2 crans vides, « encore 2 jours travaillés » (${tag})`, f.quoi.startsWith('Le phare du rivage, que les ouvriers relèvent') && f.scene?.etat === 'chantier' && f.scene.dessins === 1
      && f.scene.chantier === 'Les ouvriers bâtissent la fondation encore 2 jours travaillés' && f.scene.crans === 2 && f.scene.pleins === 0
      && f.maintenant === 'Les ouvriers bâtissent la fondation : encore 2 jours travaillés.', JSON.stringify({ q: f.quoi, s: f.scene, m: f.maintenant }));
    R.check(`fiche en chantier : la fondation marquée en cours, sans prix (${tag})`, f.etapes === 'Fondation …, Tour, Galerie, Lanterne' && !f.pastilles && !f.prix, JSON.stringify({ e: f.etapes, p: f.pastilles }));
    R.check(`fiche en chantier : « Bâtir la tour » à plat, avec le cadenas, décrit par le chantier (${tag})`, f.batir && f.batir.text === 'Bâtir la tour' && f.batir.off && !f.batir.primaire && f.batir.lock && f.batir.desc === 'trv-now', JSON.stringify(f.batir));
    await L.said(page, true);
    const g1 = srv.game();
    await page.click('#dlg-travaux [data-action="trv-batir"]', { force: true }); // à plat (aria-disabled) : le toucher passe quand même
    await page.waitForTimeout(500);
    const g2 = srv.game();
    const lu2 = await dits(page);
    R.check(`le toucher redit le chantier, sans rien payer, la fiche reste ouverte (${tag})`, lu2.includes('Les ouvriers bâtissent la fondation : encore 2 jours travaillés.') && g2.travaux.phare.payees === 1
      && g2.resources.energy === g1.resources.energy && g2.resources.materials === g1.resources.materials && (await fiche(page)).open, JSON.stringify({ lu2, t: g2.travaux }));
  }

  // ───── 2. au clavier, en mouvement réduit : la quête qui finit la tour, puis payer la galerie depuis le catalogue
  const srv2 = await L.startServer({ game: village(core, { travaux: (d) => ({ payees: 2, finies: 1, le: core.addDays(d, -3) }) }), ledger: registre(core, { travaille: true }) });
  try {
    const { page } = await newPage({}, { reducedMotion: 'reduce' });
    await page.addInitScript(L.VOICES);
    await page.addInitScript(PISTE);
    await page.goto(srv2.url);
    await L.ready(page);
    await L.closeWelcome(page, 1200);
    R.check(`la tour en chantier sur l'île (${tag})`, (await variante(page)) === '1+chantier', await variante(page));
    await L.openPanel(page);
    await L.said(page, true);
    await page.focus('#fil-quest [data-action="complete"]');
    await page.keyboard.press('Enter');
    R.check(`la quête finit la tour (${tag})`, await L.waitFor(() => srv2.game()?.travaux?.phare?.finies === 2, 6000), JSON.stringify(srv2.game()?.travaux));
    await L.waitFor(async () => (await variante(page)) === '2', 5000);
    await page.waitForTimeout(600);
    R.check(`sur l'île, la tour finie, la lanterne restée éteinte (${tag})`, (await variante(page)) === '2' && !(await ile(page)).allume && (await ile(page)).halo === null, JSON.stringify({ v: await variante(page), i: await ile(page) }));
    const lu = await dits(page);
    R.check(`la phrase lue : « Phare : les ouvriers ont fini la tour. » (${tag})`, lu.some((x) => x.includes('Phare : les ouvriers ont fini la tour.')) && !lu.some((x) => x.includes('Le phare est debout')), JSON.stringify(lu));
    const b = await bulle(page);
    R.check(`Fanal parle de l'étape finie (${tag})`, variantes('phare.etape').some((v) => b.includes(v)), b);
    R.check(`mouvement réduit : ni montée ni éclat sur le phare (${tag})`, !(await anims(page)).some((p) => p === 'clipPath' || p === 'filter' || p === 'transform'), JSON.stringify(await anims(page)));

    // « Construire » → la rangée du phare → sa fiche
    await dePanneau(page);
    await page.waitForTimeout(300);
    await page.focus('[data-ow="build"]');
    await page.keyboard.press('Enter');
    await ouverte(page, 'dlg-construire');
    await page.waitForTimeout(300);
    const row = await page.evaluate(() => {
      const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
      const li = document.querySelector('#dlg-construire .cat-trv[data-ouvrage="phare"]');
      if (!li || li.hidden) return null;
      const go = li.querySelector('.cat-trv-go').getBoundingClientRect();
      return { onglet: document.getElementById('cat-bats-t').getAttribute('aria-selected'), nom: sp(li.querySelector('.cat-nom').textContent), label: li.querySelector('.cat-trv-go').getAttribute('aria-label'),
        etapes: sp(li.querySelector('.cat-trv-etapes').textContent), pleins: li.querySelectorAll('.crans--mini > [data-plein]').length, crans: li.querySelectorAll('.crans--mini > span').length,
        prix: [...li.querySelectorAll('.cat-prix .pastille')].map((p) => sp(p.textContent)).join(' '), sr: sp(li.querySelector('#cat-t-phare-sr')?.textContent), h: go.height, w: go.width };
    });
    R.check(`catalogue, onglet « Bâtiments » : la rangée du phare, « Prochaine étape : la galerie », 2 crans pleins sur 4, le prix (${tag})`, row && row.onglet === 'true' && row.nom === 'Le phare' && row.label === 'Le phare'
      && row.etapes === 'Prochaine étape : la galerie' && row.pleins === 2 && row.crans === 4 && row.prix === '250 500'
      && row.sr === 'Étapes finies : 2 sur 4. Prix de la galerie : 250 Énergie et 500 Matériaux.' && row.h >= 43.99, JSON.stringify(row));
    await shot(page, '51-catalogue');
    await page.focus('#dlg-construire .cat-trv-go');
    await page.keyboard.press('Enter');
    R.check(`Entrée sur la rangée : la fiche, posée sur le catalogue, le focus dedans (${tag})`, await ouverte(page, 'dlg-travaux') && (await fiche(page)).pile === 'dlg-construire,dlg-travaux' && (await fiche(page)).focus, JSON.stringify(await fiche(page)));
    await page.keyboard.press('Escape');
    await fermee(page, 'dlg-travaux');
    await page.waitForTimeout(200);
    R.check(`Échap ne ferme que la fiche ; le focus revient sur la rangée (${tag})`, await page.evaluate(() => document.getElementById('dlg-construire').open) && (await focusSur(page)) === 'BUTTON[data-action=trv-ouvrir]', await focusSur(page));
    await page.keyboard.press('Enter');
    await ouverte(page, 'dlg-travaux');
    await page.waitForTimeout(250);
    const f = await fiche(page);
    R.check(`fiche : « 2 étapes sur 4 », deux étapes cochées, « Bâtir la galerie » (${tag})`, f.ligne === '2 étapes sur 4' && f.etapes === 'Fondation ✓, Tour ✓, Galerie, Lanterne' && f.batir?.text === 'Bâtir la galerie' && !f.batir.off, JSON.stringify(f));
    await L.said(page, true);
    await page.focus('#dlg-travaux [data-action="trv-batir"]');
    await page.keyboard.press('Enter');
    R.check(`la galerie payée (${tag})`, await L.waitFor(() => srv2.game()?.travaux?.phare?.payees === 3, 6000), JSON.stringify(srv2.game()?.travaux));
    R.check(`les deux feuilles se rangent (${tag})`, await fermee(page, 'dlg-travaux') && await fermee(page, 'dlg-construire'));
    await page.waitForTimeout(1200);
    R.check(`le clavier revient sur « Construire » (${tag})`, (await focusSur(page)) === 'BUTTON[data-ow=build]', await focusSur(page));
    R.check(`l'échafaudage de la galerie paraît, sans monter (mouvement réduit) (${tag})`, (await variante(page)) === '2+chantier' && !(await anims(page)).includes('clipPath'), JSON.stringify({ v: await variante(page), a: await anims(page) }));
    const lu3 = await dits(page);
    R.check(`la phrase lue : la galerie, son prix, les 2 jours travaillés (${tag})`, lu3.some((x) => x.startsWith(LANCE('la galerie'))), JSON.stringify(lu3));
    R.check(`aucun défilement horizontal (${tag})`, !(await scroll(page)));
  } finally {
    srv2.stop();
  }

  // ───── 3. la fin : la quête qui finit la lanterne
  const srv3 = await L.startServer({ game: village(core, { travaux: (d) => ({ payees: 4, finies: 3, le: core.addDays(d, -3) }), res: { energy: 40, materials: 60, food: 60 } }), ledger: registre(core, { travaille: true }) });
  try {
    const { page } = await newPage();
    await page.addInitScript(L.VOICES);
    await page.goto(srv3.url);
    await L.ready(page);
    await L.closeWelcome(page, 1200);
    R.check(`la lanterne en chantier sur l'île, éteinte (${tag})`, (await variante(page)) === '3+chantier' && !(await ile(page)).allume, JSON.stringify({ v: await variante(page), i: await ile(page) }));
    await L.openPanel(page);
    await L.said(page, true);
    await page.click('#fil-quest [data-action="complete"]');
    R.check(`la quête finit la lanterne (${tag})`, await L.waitFor(() => srv3.game()?.travaux?.phare?.finies === 4, 6000), JSON.stringify(srv3.game()?.travaux));
    // Fanal parle dès la quête faite (sa bulle s'efface après 7 s), le phare se joue après les autres moments
    const t0 = Date.now();
    const b = await bulle(page);
    R.check(`Fanal salue le phare debout (${tag})`, variantes('phare.debout').some((v) => b.includes(v)), b);
    const allumee = await L.waitFor(() => page.evaluate(() => document.querySelector('.ow-ent[data-id="phare"]')?.hasAttribute('data-allume')), 15000, 50);
    const t1 = Date.now();
    console.log(`  (la lanterne s'allume ${t1 - t0} ms après la quête faite, ${tag})`);
    const vu = allumee ? await ile(page) : null;
    if (allumee) await shot(page, '51-lanterne');
    const eteinte = allumee && await L.waitFor(() => page.evaluate(() => !document.querySelector('.ow-ent[data-id="phare"]')?.hasAttribute('data-allume')), 6000, 50);
    const duree = Date.now() - t1;
    R.check(`la lanterne s'allume, vitres et halo (${tag})`, allumee && vu.halo === 'on', JSON.stringify(vu));
    R.check(`puis s'éteint, entre 2 et 4,5 secondes plus tard (${tag})`, eteinte && duree >= 2000 && duree <= 4500, `${duree} ms`);
    await page.waitForTimeout(800);
    const i = await ile(page);
    R.check(`le phare debout, éteint, sans halo (${tag})`, (await variante(page)) === '4' && !i.allume && i.halo === null, JSON.stringify({ v: await variante(page), i }));
    // le phare se joue après les autres moments de la quête (bonus, saison, permis) : la carte finit sur lui
    await calme(page);
    const fin = await page.evaluate(() => { const r = document.querySelector('.ow-ent[data-id="phare"] .ow-hit')?.getBoundingClientRect(); return r && { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: innerWidth, h: innerHeight }; });
    R.check(`les moments finis, le phare est encore à l'écran (${tag})`, fin && fin.x >= 0 && fin.x <= fin.w && fin.y >= 0 && fin.y <= fin.h, JSON.stringify(fin));
    const lu = await dits(page);
    R.check(`la phrase lue : « Phare : les ouvriers ont fini la lanterne. Le phare est debout. » (${tag})`, lu.some((x) => x.includes('Phare : les ouvriers ont fini la lanterne. Le phare est debout.')), JSON.stringify(lu));
    await dePanneau(page);
    R.check(`le phare debout se touche encore (${tag})`, await toucherPhare(page));
    await page.waitForTimeout(350);
    const f = await fiche(page);
    R.check(`fiche : « Debout », les quatre étapes cochées, « Le phare est debout. », sans bouton (${tag})`, f.ligne === 'Debout' && f.quoi.startsWith('Une tour blanche sur un rocher') && f.scene?.etat === 'debout'
      && f.etapes === 'Fondation ✓, Tour ✓, Galerie ✓, Lanterne ✓' && f.max === 'Le phare est debout.' && !f.batir && !f.pastilles, JSON.stringify(f));
    await shot(page, '51-debout');
    await page.keyboard.press('Escape');
    await fermee(page, 'dlg-travaux');
    await page.click('[data-ow="build"]');
    await ouverte(page, 'dlg-construire');
    R.check(`le phare debout quitte le catalogue (${tag})`, await page.evaluate(() => { const li = document.querySelector('#dlg-construire .cat-trv[data-ouvrage="phare"]'); return !li || li.hidden; }));
  } finally {
    srv3.stop();
  }
}, { game: (core) => village(core), ledger: (core) => registre(core) });
