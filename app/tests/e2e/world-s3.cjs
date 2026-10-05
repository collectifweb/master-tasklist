// Monde, semaine 3 (app/world/demo.html) aux trois largeurs : parcelle vide sans graines, établi absent puis
// construit, Front de givre d'un Avis, deux cases voilées puis levées, récolte au glisser (onHarvest), sélections
// typées (onSelect), cibles de 44 px, plaque entière à côté de la colonne de zoom, bouton « Passer l'animation »
// touchable panneau ouvert, mouvement réduit, aucune image demandée au repos, aucune erreur console.
//
//   python3 -m http.server 8791 --bind 127.0.0.1      (depuis la racine du dépôt)
//   PW_CORE=<chemin>/node_modules/playwright-core PW_CHROME=<chemin>/chrome node app/tests/e2e/world-s3.cjs
//
// Variables : PW_CORE, PW_CHROME, BASE (adresse du serveur), OUT (dossier des captures ; par défaut un dossier
// temporaire, jamais le dépôt). Sortie : rapport JSON, code 1 si une vérification échoue.
const os = require('os');
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PW_CORE || path.join(os.homedir(), '.npm/_npx/361ceb562f3b3235/node_modules/playwright-core'));

function latestChrome() {
  const base = path.join(os.homedir(), '.cache/ms-playwright');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)) : [];
  dirs.sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  return dirs.length ? path.join(base, dirs[0], 'chrome-linux64/chrome') : undefined;
}
const CHROME = process.env.PW_CHROME || latestChrome();
const BASE = process.env.BASE || 'http://127.0.0.1:8791';
const OUT = process.env.OUT || path.join(os.tmpdir(), 'oree-monde-s3');
fs.mkdirSync(OUT, { recursive: true });
const URL = `${BASE}/app/world/demo.html`;
const VIEWS = [[390, 844], [834, 1112], [1280, 900]];

const checks = [];
function check(name, ok, detail) { checks.push({ name, ok: !!ok, ...(detail === undefined ? {} : { detail }) }); }

// compte les requestAnimationFrame demandés par la page
const INIT = () => {
  window.__raf = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) => { window.__raf++; return raf(fn); };
};

async function open(nav, w, h, opts = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: !!opts.touch, isMobile: !!opts.touch, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.addInitScript(INIT);
  await page.goto(URL);
  await page.waitForFunction(() => window.__world && document.querySelectorAll('.ow-plaque').length === 6);
  await page.waitForTimeout(400);
  return { page, errors, close: () => ctx.close() };
}
const idle = (page) => page.waitForFunction(() => !window.__world.playing, null, { timeout: 30000 });
const act = (page, name) => page.evaluate((n) => { window.__demo.actions[n](document.querySelector(`[data-demo="${n}"]`)); }, name);
async function run(page, name) { await act(page, name); await page.waitForTimeout(30); await idle(page); await page.waitForTimeout(120); }
async function focus(page, s) { await page.evaluate((x) => window.__world.focusSector(x), s); await page.waitForTimeout(700); }

/** Point touchable d'un objet : un point de sa zone de toucher que rien d'autre ne recouvre. */
function hitPoint(page, id) {
  return page.evaluate((id) => {
    const el = document.querySelector(`.ow-ent[data-id="${id}"]`);
    const hit = el && el.querySelector('.ow-hit');
    if (!hit) return null;
    const r = hit.getBoundingClientRect();
    for (const gy of [0.5, 0.6, 0.4, 0.7, 0.3, 0.8, 0.2, 0.9, 0.12]) {
      for (const gx of [0.5, 0.4, 0.6, 0.3, 0.7]) {
        const x = r.left + r.width * gx, y = r.top + r.height * gy;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const at = document.elementFromPoint(x, y);
        if (at && at.closest('.ow-ent') === el) return [x, y];
      }
    }
    return null;
  }, id);
}

async function targets(page) {
  return page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const visible = (r) => r.width > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
    const items = [...document.querySelectorAll('.ow-plaque, .ow-zbtn, .ow-skip:not([hidden])')].map((n) => [n, n.getBoundingClientRect()]);
    if (document.querySelector('.ow').dataset.lod !== 'loin') for (const n of document.querySelectorAll('.ow-ent.is-btn .ow-hit')) items.push([n.closest('.ow-ent'), n.getBoundingClientRect()]);
    const small = [];
    let n = 0;
    for (const [el, r] of items) {
      if (!visible(r)) continue;
      n++;
      if (r.width < 44 || r.height < 44) small.push(`${el.dataset.id || el.dataset.sector || el.className} ${r.width.toFixed(0)}×${r.height.toFixed(0)}`);
    }
    return { n, small, lod: document.querySelector('.ow').dataset.lod };
  });
}

/** Plaques : entières dans le monde, jamais sous la colonne de zoom, texte non coupé. */
async function plaques(page) {
  return page.evaluate(() => {
    const ow = document.querySelector('.ow').getBoundingClientRect();
    const z = document.querySelector('.ow-zoom').getBoundingClientRect();
    const bad = [];
    for (const b of document.querySelectorAll('.ow-plaque')) {
      const r = b.getBoundingClientRect();
      const name = `${b.dataset.sector} « ${b.innerText.replace(/\s+/g, ' ').trim()} »`;
      if (r.left < ow.left - 1 || r.right > ow.right + 1 || r.top < ow.top - 1) bad.push(`${name} hors du monde`);
      if (r.right > z.left && r.left < z.right && r.bottom > z.top && r.top < z.bottom) bad.push(`${name} sous la colonne de zoom`);
      if (b.scrollWidth > b.clientWidth + 1) bad.push(`${name} texte coupé`);
    }
    return bad;
  });
}

async function swipe(page, id, touch) {
  const p = await hitPoint(page, id);
  if (!p) return { ok: false, reason: 'parcelle introuvable ou recouverte' };
  const [x, y] = p;
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    const tp = (xx, yy) => [{ x: xx, y: yy, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) });
    for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(x + k * 8, y + k * 2) }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 24, y + 6, { steps: 4 });
    await page.mouse.move(x + 48, y + 10, { steps: 4 });
    await page.mouse.up();
  }
  return { ok: true, at: p };
}

(async () => {
  const nav = await chromium.launch({ executablePath: CHROME });
  const report = {};

  for (const [w, h] of VIEWS) {
    const tag = `${w}`;
    const { page, errors, close } = await open(nav, w, h);
    const r = {};
    await focus(page, 'champs');
    await page.screenshot({ path: `${OUT}/${tag}-01-depart.png` });

    // ---- parcelle vide : le sol seul, aucune graine ; la mûre porte son panier (forme, pas couleur)
    r.empty = await page.evaluate(() => {
      const e = document.querySelector('.ow-ent[data-id="parcelle-1"]');
      const m = document.querySelector('.ow-ent[data-id="parcelle-2"]');
      return { exists: !!e, plants: e ? e.querySelectorAll('.ow-plant').length : -1, mure: e?.hasAttribute('data-mure'), ripeBasket: m ? m.querySelectorAll('.ow-ripe').length : -1, ripeAttr: m?.hasAttribute('data-mure'), label: e?.getAttribute('aria-label') };
    });
    check(`${tag} parcelle vide sans graines`, r.empty.exists && r.empty.plants === 0 && !r.empty.mure, r.empty);
    check(`${tag} parcelle mûre : panier et data-mure`, r.empty.ripeBasket === 1 && r.empty.ripeAttr, r.empty);

    // ---- toucher simple sur une parcelle → onSelect { type: 'plot' }
    const tapAt = await hitPoint(page, 'parcelle-2');
    if (tapAt) { await page.mouse.click(tapAt[0], tapAt[1]); await page.waitForTimeout(150); }
    r.tap = await page.evaluate(() => window.__selections.at(-1) || null);
    check(`${tag} toucher une parcelle → onSelect plot`, r.tap && r.tap.type === 'plot' && r.tap.id === 'parcelle-2' && r.tap.ripe === true, r.tap);
    // ---- retoucher le même objet rappelle onSelect (sa feuille se rouvre) ; clearSelection() retire la sélection
    const nSel = await page.evaluate(() => window.__selections.length);
    if (tapAt) { await page.mouse.click(tapAt[0], tapAt[1]); await page.waitForTimeout(150); }
    r.retap = await page.evaluate((n) => ({ calls: window.__selections.length - n, last: window.__selections.at(-1) || null }), nSel);
    check(`${tag} retoucher la même parcelle → onSelect à nouveau`, r.retap.calls === 1 && r.retap.last?.id === 'parcelle-2', r.retap);
    await page.evaluate(() => window.__world.clearSelection());
    r.cleared = await page.evaluate(() => ({ tagHidden: document.querySelector('.ow-tag').hidden, sel: document.querySelectorAll('.ow-ent.is-sel').length }));
    check(`${tag} clearSelection() : plus d'étiquette ni d'objet sélectionné`, r.cleared.tagHidden && r.cleared.sel === 0, r.cleared);

    // ---- glisser sur la parcelle mûre → onHarvest(id), puis la récolte se joue
    const sw = await swipe(page, 'parcelle-2', false);
    await page.waitForTimeout(80);
    r.harvest = { swipe: sw, harvested: await page.evaluate(() => window.__harvested.slice()) };
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${tag}-02-recolte.png` });
    await idle(page);
    r.harvest.after = await page.evaluate(() => ({ crop: window.__demo.game.plots.find((p) => p.id === 'parcelle-2')?.crop ?? null, mure: document.querySelector('.ow-ent[data-id="parcelle-2"]')?.hasAttribute('data-mure') }));
    check(`${tag} glisser sur une parcelle mûre → onHarvest('parcelle-2')`, r.harvest.harvested.length === 1 && r.harvest.harvested[0] === 'parcelle-2', r.harvest);
    check(`${tag} récolte jouée : parcelle vidée`, r.harvest.after.crop === null && !r.harvest.after.mure, r.harvest.after);

    // ---- établi : chantier discret, puis construit
    await focus(page, 'atelier');
    r.etabli0 = await page.evaluate(() => document.querySelector('.ow-ent[data-id="etabli"]')?.className || null);
    const tapE = await hitPoint(page, 'etabli');
    if (tapE) { await page.mouse.click(tapE[0], tapE[1]); await page.waitForTimeout(150); }
    r.tapEtabli = await page.evaluate(() => window.__selections.at(-1) || null);
    await page.evaluate(() => window.__world.clearSelection());
    await run(page, 'etabli');
    r.etabli1 = await page.evaluate(() => document.querySelector('.ow-ent[data-id="etabli"]')?.className || null);
    check(`${tag} établi absent (chantier) puis construit`, /m-chantier/.test(r.etabli0 || '') && !/m-etabli/.test(r.etabli0 || '') && /m-etabli/.test(r.etabli1 || '') && !/m-chantier/.test(r.etabli1 || ''), { avant: r.etabli0, apres: r.etabli1 });
    check(`${tag} toucher le chantier → onSelect landmark`, r.tapEtabli && r.tapEtabli.type === 'landmark' && r.tapEtabli.id === 'etabli' && r.tapEtabli.model === 'chantier', r.tapEtabli);

    // ---- tunnel : construction du joueur, sélection 'placement'
    await run(page, 'tunnel');
    await focus(page, 'champs');
    const tapT = await hitPoint(page, 'tunnel-1');
    if (tapT) { await page.mouse.click(tapT[0], tapT[1]); await page.waitForTimeout(150); }
    r.tapTunnel = await page.evaluate(() => window.__selections.at(-1) || null);
    await page.evaluate(() => window.__world.clearSelection());
    check(`${tag} tunnel construit aux Champs, onSelect placement`, r.tapTunnel && r.tapTunnel.type === 'placement' && r.tapTunnel.id === 'tunnel-1' && r.tapTunnel.sector === 'champs', r.tapTunnel);

    // ---- Tour sélectionnée puis réparée : l'étiquette suit l'objet (« … à réparer » → « Tour de veille »)
    await focus(page, 'place');
    await page.locator('.ow-ent.is-btn[data-id="tour"]').dispatchEvent('click');
    await page.waitForTimeout(150);
    const tagTour = () => page.evaluate(() => { const g = document.querySelector('.ow-tag'); return g.hidden ? '(cachée)' : g.textContent; });
    r.tourTag = { avant: await tagTour() };
    await run(page, 'tour');
    r.tourTag.apres = await tagTour();
    await page.evaluate(() => window.__world.clearSelection());
    check(`${tag} Tour sélectionnée puis réparée : l'étiquette suit`, r.tourTag.avant === 'Tour de veille à réparer' && r.tourTag.apres === 'Tour de veille', r.tourTag);

    // ---- Avis annoncé : Front visible au bord des Champs, repère picto + texte dans la plaque
    await act(page, 'avis');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${tag}-03-avis-arrive.png` });
    await idle(page);
    await page.waitForTimeout(200);
    r.avis = await page.evaluate(() => {
      const fr = document.querySelector('.ow-front');
      const rr = fr.getBoundingClientRect();
      const ow = document.querySelector('.ow').getBoundingClientRect();
      const visW = Math.max(0, Math.min(rr.right, ow.right) - Math.max(rr.left, ow.left));
      const visH = Math.max(0, Math.min(rr.bottom, ow.bottom) - Math.max(rr.top, ow.top));
      const pl = document.querySelector('.ow-plaque[data-sector="champs"]');
      return { hidden: fr.hasAttribute('hidden'), sector: fr.dataset.sector, visible: Math.round(visW * visH), box: [rr.left, rr.top, rr.width, rr.height].map(Math.round), badge: pl.querySelector('.ow-plaque-avis:not([hidden])')?.textContent || null, label: pl.getAttribute('aria-label'), braseros: document.querySelectorAll('.ow-ent.m-brasero').length };
    });
    await page.screenshot({ path: `${OUT}/${tag}-04-avis-annonce.png` });
    check(`${tag} Front de givre visible côté Champs`, !r.avis.hidden && r.avis.sector === 'champs' && r.avis.visible > 1500, r.avis);
    check(`${tag} plaque : repère d'Avis picto + texte (aussi dans l'étiquette)`, /Premier gel/.test(r.avis.badge || '') && /Avis/.test(r.avis.label || ''), { badge: r.avis.badge, label: r.avis.label });
    check(`${tag} trois braseros posés`, r.avis.braseros === 3, r.avis.braseros);
    r.plaquesAvis = await plaques(page);
    check(`${tag} plaques entières avec le repère d'Avis`, !r.plaquesAvis.length, r.plaquesAvis);

    await run(page, 'brasero');
    r.lit = await page.evaluate(() => [...document.querySelectorAll('.ow-ent.m-brasero')].map((n) => n.hasAttribute('data-allume')));
    check(`${tag} un brasero allumé (flamme)`, r.lit.filter(Boolean).length === 1, r.lit);

    // ---- Avis voilé : 2 cases de givre ; animation sautable ; puis levées une à une
    const t0 = Date.now();
    await act(page, 'avis-voile');
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${OUT}/${tag}-05-matin-avis.png` });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/${tag}-06-givre-pose.png` });
    await idle(page);
    r.voileMs = Date.now() - t0;
    await page.waitForTimeout(200);
    r.frost = await page.evaluate(() => ({ cells: document.querySelectorAll('.ow-ent.m-givre').length, front: document.querySelector('.ow-front').hasAttribute('hidden'), veils: window.__demo.game.avis.veils }));
    await page.screenshot({ path: `${OUT}/${tag}-07-voile.png` });
    check(`${tag} Avis voilé : 2 cases de givre, Front retiré`, r.frost.cells === 2 && r.frost.front, r.frost);
    await run(page, 'lever');
    const one = await page.evaluate(() => document.querySelectorAll('.ow-ent.m-givre').length);
    await run(page, 'lever');
    const none = await page.evaluate(() => document.querySelectorAll('.ow-ent.m-givre').length);
    check(`${tag} cases levées une à une (2 → 1 → 0)`, one === 1 && none === 0, { one, none });

    // ---- événements sans dessin et type inconnu : ignorés sans erreur
    await run(page, 'muets');

    // ---- plaque des Archives qui change de texte : jamais sous la colonne de zoom
    await page.evaluate(() => window.__demo.patch((g) => { g.lueur.archives = 0; }));
    await page.waitForTimeout(200);
    await run(page, 'q-archives');
    r.plaques = await plaques(page);
    await page.screenshot({ path: `${OUT}/${tag}-08-archives.png` });
    check(`${tag} plaque des Archives entière après une quête`, !r.plaques.length, r.plaques);

    // ---- cibles de 44 px au repos, vue rapprochée et vue par défaut
    await focus(page, 'champs');
    r.targets = await targets(page);
    check(`${tag} cibles d'au moins 44 px`, r.targets.small.length === 0 && r.targets.n > 0, r.targets);

    // ---- bouton « Passer l'animation » touchable pendant la veille, panneau ouvert
    await page.evaluate(() => { if (document.querySelector('#app').dataset.panel !== 'open') document.querySelector('[data-demo="panel"]').click(); });
    await page.waitForTimeout(500);
    await act(page, 'veille');
    await page.waitForTimeout(450);
    r.skip = await page.evaluate(() => {
      const b = document.querySelector('.ow-skip');
      const rr = b.getBoundingClientRect();
      const pts = [[rr.left + rr.width / 2, rr.top + rr.height / 2], [rr.left + 8, rr.top + rr.height / 2], [rr.right - 8, rr.top + rr.height / 2]];
      return { hidden: b.hidden, box: [rr.left, rr.top, rr.width, rr.height].map(Math.round), hits: pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && b.contains(e); }) };
    });
    await page.screenshot({ path: `${OUT}/${tag}-09-veille-saut.png` });
    if (!r.skip.hidden) await page.mouse.click(r.skip.box[0] + r.skip.box[2] / 2, r.skip.box[1] + r.skip.box[3] / 2);
    const tSkip = Date.now();
    await idle(page);
    r.skipMs = Date.now() - tSkip;
    check(`${tag} « Passer l'animation » touchable, panneau ouvert`, !r.skip.hidden && r.skip.hits.every(Boolean) && r.skip.box[3] >= 44, r.skip);
    check(`${tag} le saut termine en moins de 400 ms`, r.skipMs < 400, r.skipMs);
    await page.evaluate(() => { document.querySelector('[data-demo="panel"]').click(); });

    // ---- au repos : aucune image demandée après 12 s, aucune animation en cours
    await page.waitForTimeout(12000);
    r.idle = await page.evaluate(async () => {
      const r0 = window.__raf;
      await new Promise((res) => setTimeout(res, 2000));
      return { raf: window.__raf - r0, running: document.getAnimations().filter((a) => a.playState === 'running').length };
    });
    check(`${tag} au repos : 0 requestAnimationFrame après 12 s`, r.idle.raf === 0 && r.idle.running === 0, r.idle);
    r.errors = errors;
    check(`${tag} aucune erreur console`, !errors.length, errors);
    report[tag] = r;
    await close();
  }

  // ---- toucher réel à 390 : glisser au doigt récolte (la carte ne défile pas), toucher simple sélectionne
  {
    const { page, errors, close } = await open(nav, 390, 844, { touch: true });
    await focus(page, 'champs');
    const before = await page.evaluate(() => [document.querySelector('.ow-scroller').scrollLeft, document.querySelector('.ow-scroller').scrollTop]);
    const sw = await swipe(page, 'parcelle-2', true);
    await page.waitForTimeout(100);
    const harvested = await page.evaluate(() => window.__harvested.slice());
    const after = await page.evaluate(() => [document.querySelector('.ow-scroller').scrollLeft, document.querySelector('.ow-scroller').scrollTop]);
    await idle(page);
    check('390 doigt : glisser sur la parcelle mûre → onHarvest', harvested.length === 1 && harvested[0] === 'parcelle-2', { sw, harvested });
    check('390 doigt : la carte ne défile pas pendant le glisser de récolte', Math.abs(after[0] - before[0]) < 3 && Math.abs(after[1] - before[1]) < 3, { before, after });
    const p = await hitPoint(page, 'parcelle-3');
    if (p) await page.touchscreen.tap(p[0], p[1]);
    await page.waitForTimeout(200);
    const sel = await page.evaluate(() => window.__selections.at(-1) || null);
    check('390 doigt : toucher une parcelle → onSelect plot', sel && sel.type === 'plot' && sel.id === 'parcelle-3', sel);
    check('390 doigt : aucune erreur console', !errors.length, errors);
    await close();
  }

  // ---- mouvement réduit : mêmes états, fondus courts, aucune animation de déplacement longue
  {
    const { page, errors, close } = await open(nav, 390, 844, { reduced: true });
    await focus(page, 'champs');
    const timed = async (name) => { const t = Date.now(); await act(page, name); await page.waitForTimeout(20); await idle(page); return Date.now() - t; };
    const longAnims = [];
    await page.evaluate(() => { window.__long = []; const orig = Element.prototype.animate; Element.prototype.animate = function (kf, o) { const d = typeof o === 'number' ? o : (o && o.duration) || 0; if (d > 160) window.__long.push(`${this.className?.baseVal ?? this.className} ${d}`); return orig.call(this, kf, o); }; });
    const ms = {};
    for (const n of ['recolter', 'semer', 'etabli', 'avis', 'brasero', 'avis-tenu']) ms[n] = await timed(n);
    longAnims.push(...(await page.evaluate(() => window.__long)));
    const st = await page.evaluate(() => ({ etabli: document.querySelector('.ow-ent[data-id="etabli"]')?.className, front: document.querySelector('.ow-front').hasAttribute('hidden'), mouvement: document.querySelector('.ow').dataset.mouvement }));
    await page.screenshot({ path: `${OUT}/390-10-reduit.png` });
    check('réduit : chaque moment se règle vite (tenu ≤ 2,5 s, les autres ≤ 700 ms)', ms['avis-tenu'] <= 2500 && Object.entries(ms).every(([k, v]) => k === 'avis-tenu' || v <= 700), ms);
    check('réduit : aucune animation WAAPI de plus de 160 ms', longAnims.length === 0, longAnims.slice(0, 8));
    check('réduit : états finaux identiques (établi construit, Front retiré)', st.mouvement === 'reduit' && /m-etabli/.test(st.etabli || '') && st.front, st);
    check('réduit : aucune erreur console', !errors.length, errors);
    await close();
  }

  // ---- budget : éléments animés pendant le matin de l'Avis (tenu), à 390
  {
    const { page, errors, close } = await open(nav, 390, 844);
    await run(page, 'avis');
    await run(page, 'brasero');
    const peak = await page.evaluate(async () => {
      let max = 0;
      window.__demo.actions['avis-tenu']();
      await new Promise((r) => setTimeout(r, 30));
      const t0 = performance.now();
      while (window.__world.playing) { max = Math.max(max, document.getAnimations().length); await new Promise((r) => setTimeout(r, 50)); }
      return { max, ms: Math.round(performance.now() - t0) };
    });
    await page.screenshot({ path: `${OUT}/390-11-tenu-fin.png` });
    check('matin de l’Avis tenu : 100 animations au plus, environ 8 s', peak.max <= 100 && peak.ms >= 6000 && peak.ms <= 10000, peak);
    check('tenu : aucune erreur console', !errors.length, errors);
    await close();
  }

  await nav.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ out: OUT, total: checks.length, failed: failed.length, checks }, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
