// Monde v2 (app/world/demo.html, état fictif) aux trois largeurs : six quartiers ouverts avec leur niveau, plus rien de
// la v1 (cendre, brume, braseros, givre, germes, personnages autres que Fanal), front de givre en sommeil, quête qui
// fait avancer un quartier, niveau suivant joué, sélections typées (onSelect), cibles de 44 px, plaques entières à côté
// de la colonne de zoom, bouton « Passer l'animation » touchable panneau ouvert, mouvement réduit, aucune image
// demandée au repos, aucune erreur console.
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
const OUT = process.env.OUT || path.join(os.tmpdir(), 'oree-monde-v2');
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
      // 43,99 : une position au dixième de pixel peut donner 44 − 1/65 536 px (arrondi du moteur), pas une cible plus petite
      if (r.width < 43.99 || r.height < 43.99) small.push(`${el.dataset.id || el.dataset.sector || el.className} ${r.width.toFixed(0)}×${r.height.toFixed(0)}`);
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

/** Plaque d'un quartier : étiquette et niveau affiché. */
const plaque = (page, s) => page.evaluate((s) => { const b = document.querySelector(`.ow-plaque[data-sector="${s}"]`); return { label: b.getAttribute('aria-label').replace(/\s+/g, ' '), niveau: b.dataset.niveau, line: b.querySelector('.ow-plaque-val').textContent }; }, s);
const lastSel = (page) => page.evaluate(() => window.__selections.at(-1) || null);
async function tap(page, id) { const p = await hitPoint(page, id); if (p) { await page.mouse.click(p[0], p[1]); await page.waitForTimeout(150); } return p; }

(async () => {
  const nav = await chromium.launch({ executablePath: CHROME });
  const report = {};

  for (const [w, h] of VIEWS) {
    const tag = `${w}`;
    const { page, errors, close } = await open(nav, w, h);
    const r = {};
    await page.screenshot({ path: `${OUT}/${tag}-01-depart.png` });

    // ---- six quartiers ouverts, leur niveau sur la plaque ; plus rien de la v1 ; front de givre en sommeil
    r.start = await page.evaluate(() => ({
      plaques: [...document.querySelectorAll('.ow-plaque')].map((b) => `${b.dataset.sector}:${b.dataset.niveau}`),
      v1: document.querySelectorAll('.ow-veil, .ow-mist, .ow-pips, .ow-plaque-avis, .ow-ent.m-brasero, .ow-ent.m-givre, .ow-ent.m-culture, .ow-ent.m-chantier, .ow-ent.m-relais, .ow-ent.m-tunnel, .ow-ent.m-solene, .ow-ent.m-milo, .ow-germ').length,
      chars: [...document.querySelectorAll('.ow-ent[data-id]')].filter((e) => e.querySelector('.ow-char-bob')).map((e) => e.dataset.id),
      front: document.querySelector('.ow-front').hasAttribute('hidden'),
    }));
    check(`${tag} six plaques de quartier avec leur niveau`, r.start.plaques.join() === 'place:0,champs:1,atelier:0,mairie:0,ecole:0,garage:0', r.start.plaques);
    check(`${tag} plus aucun élément de la v1 sur l'île`, r.start.v1 === 0, r.start.v1);
    check(`${tag} Fanal seul personnage`, r.start.chars.join() === 'fanal', r.start.chars);
    check(`${tag} front de givre en sommeil (caché)`, r.start.front, r.start.front);
    r.champs = await plaque(page, 'champs');
    check(`${tag} plaque des Champs : niveau et ce qui manque`, r.champs.line === 'Niveau 1' && /Champs : niveau 1, encore 3 tâches Terrain pour le niveau 2\./.test(r.champs.label), r.champs);

    // ---- sélections typées : plaque, repère, caisse, Fanal ; retoucher rappelle onSelect ; clearSelection()
    await page.click('.ow-plaque[data-sector="mairie"]');
    await page.waitForTimeout(800);
    r.selPlaque = await lastSel(page);
    check(`${tag} toucher une plaque → onSelect sector`, r.selPlaque && r.selPlaque.type === 'sector' && r.selPlaque.id === 'mairie' && r.selPlaque.sector === 'mairie', r.selPlaque);
    await tap(page, 'grenier-1');
    r.selMairie = await lastSel(page);
    check(`${tag} toucher l'emplacement du grenier → onSelect batiment du quartier`, r.selMairie && r.selMairie.type === 'batiment' && r.selMairie.id === 'grenier-1' && r.selMairie.sector === 'mairie', r.selMairie);
    r.tagMairie = await page.evaluate(() => document.querySelector('.ow-tag').textContent);
    check(`${tag} étiquette du bâtiment : son nom et son état`, /^Emplacement du grenier, /.test(r.tagMairie), r.tagMairie);
    await page.evaluate(() => window.__world.clearSelection());
    await focus(page, 'place');
    await tap(page, 'fanal');
    r.selFanal = await lastSel(page);
    check(`${tag} toucher Fanal → onSelect object fanal`, r.selFanal && r.selFanal.type === 'object' && r.selFanal.model === 'fanal' && r.selFanal.taskId === null, r.selFanal);
    const nSel = await page.evaluate(() => window.__selections.length);
    await tap(page, 'fanal');
    r.retap = await page.evaluate((n) => ({ calls: window.__selections.length - n, last: window.__selections.at(-1) || null }), nSel);
    check(`${tag} retoucher Fanal → onSelect à nouveau`, r.retap.calls === 1 && r.retap.last?.id === 'fanal', r.retap);
    await page.evaluate(() => window.__world.clearSelection());
    r.cleared = await page.evaluate(() => ({ tagHidden: document.querySelector('.ow-tag').hidden, sel: document.querySelectorAll('.ow-ent.is-sel').length }));
    check(`${tag} clearSelection() : plus d'étiquette ni d'objet sélectionné`, r.cleared.tagHidden && r.cleared.sel === 0, r.cleared);
    // une caisse touchable (les plaques peuvent en recouvrir certaines selon la largeur)
    const crates = await page.evaluate(() => [...document.querySelectorAll('.ow-ent.m-caisse.is-btn[data-id^="caisse-"]')].map((e) => ({ id: e.dataset.id, sector: e.closest('.ow-ents').dataset.sector })));
    if (crates.length) await focus(page, crates[0].sector);
    let crate = null;
    for (const c of crates) if (await hitPoint(page, c.id)) { crate = c; break; }
    const n0 = await page.evaluate(() => window.__selections.length);
    const pCrate = crate && await tap(page, crate.id);
    r.selCrate = await page.evaluate((n) => (window.__selections.length > n ? window.__selections.at(-1) : null), n0);
    check(`${tag} toucher une caisse d'échéance → onSelect object avec sa quête`, crate && r.selCrate && r.selCrate.type === 'object' && r.selCrate.id === crate.id && /^demo-/.test(r.selCrate.taskId || ''), { crate, point: pCrate, sel: r.selCrate });
    await page.evaluate(() => window.__world.clearSelection());

    // ---- une quête à l'Atelier : sa plaque avance ; puis le niveau suivant se joue
    const a0 = await plaque(page, 'atelier');
    await run(page, 'q-mairie');
    r.mairie = await plaque(page, 'mairie');
    check(`${tag} quête à la Mairie : la plaque compte une tâche de plus`, /encore 3 tâches Administratif/.test(r.mairie.label), r.mairie);
    await act(page, 'niveau');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${tag}-02-niveau.png` });
    await idle(page);
    r.atelier = await plaque(page, 'atelier');
    r.niveauEvents = await page.evaluate(() => (window.__lastEvents || []).map((e) => e.type));
    check(`${tag} niveau suivant de l'Atelier : événement du cœur et plaque à jour`, r.niveauEvents.includes('quartier-niveau') && a0.niveau === '0' && r.atelier.niveau === '1' && r.atelier.line === 'Niveau 1' && /encore 10 tâches Maison pour le niveau 2/.test(r.atelier.label), { a0, a1: r.atelier, ev: r.niveauEvents });

    // ---- événements sans dessin et type inconnu : ignorés sans erreur
    await run(page, 'muets');

    // ---- plaques entières, jamais sous la colonne de zoom (vue par défaut et rapprochée)
    r.plaques = await plaques(page);
    check(`${tag} plaques entières (vue par défaut)`, !r.plaques.length, r.plaques);
    await focus(page, 'atelier');
    r.plaquesNear = await plaques(page);
    await page.screenshot({ path: `${OUT}/${tag}-03-atelier.png` });
    check(`${tag} plaques entières (vue rapprochée)`, !r.plaquesNear.length, r.plaquesNear);

    // ---- cibles de 44 px
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
    await page.screenshot({ path: `${OUT}/${tag}-04-veille-saut.png` });
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

  // ---- toucher réel à 390 : un toucher sur Fanal le sélectionne
  {
    const { page, errors, close } = await open(nav, 390, 844, { touch: true });
    await focus(page, 'place');
    const p = await hitPoint(page, 'fanal');
    if (p) await page.touchscreen.tap(p[0], p[1]);
    await page.waitForTimeout(200);
    const sel = await lastSel(page);
    check('390 doigt : toucher Fanal → onSelect object', sel && sel.type === 'object' && sel.id === 'fanal', sel);
    check('390 doigt : aucune erreur console', !errors.length, errors);
    await close();
  }

  // ---- mouvement réduit : mêmes états, fondus courts, aucune animation longue
  {
    const { page, errors, close } = await open(nav, 390, 844, { reduced: true });
    const timed = async (name) => { const t = Date.now(); await act(page, name); await page.waitForTimeout(20); await idle(page); return Date.now() - t; };
    await page.evaluate(() => { window.__long = []; const orig = Element.prototype.animate; Element.prototype.animate = function (kf, o) { const d = typeof o === 'number' ? o : (o && o.duration) || 0; if (d > 160) window.__long.push(`${this.className?.baseVal ?? this.className} ${d}`); return orig.call(this, kf, o); }; });
    const ms = {};
    for (const n of ['q-champs', 'niveau', 'reflet', 'veille']) ms[n] = await timed(n);
    const longAnims = await page.evaluate(() => window.__long);
    const st = await page.evaluate(() => ({ atelier: document.querySelector('.ow-plaque[data-sector="atelier"]').dataset.niveau, mouvement: document.querySelector('.ow').dataset.mouvement }));
    await page.screenshot({ path: `${OUT}/390-05-reduit.png` });
    check('réduit : chaque moment se règle vite (≤ 700 ms)', Object.values(ms).every((v) => v <= 700), ms);
    check('réduit : aucune animation WAAPI de plus de 160 ms', longAnims.length === 0, longAnims.slice(0, 8));
    check('réduit : états finaux identiques (Atelier au niveau 1)', st.mouvement === 'reduit' && st.atelier === '1', st);
    check('réduit : aucune erreur console', !errors.length, errors);
    await close();
  }

  // ---- budget : éléments animés pendant le passage de niveau, à 390
  {
    const { page, errors, close } = await open(nav, 390, 844);
    const peak = await page.evaluate(async () => {
      let max = 0;
      window.__demo.actions.niveau();
      await new Promise((r) => setTimeout(r, 30));
      const t0 = performance.now();
      while (window.__world.playing) { max = Math.max(max, document.getAnimations().length); await new Promise((r) => setTimeout(r, 50)); }
      return { max, ms: Math.round(performance.now() - t0) };
    });
    check('passage de niveau : 100 animations au plus, moins de 6 s', peak.max <= 100 && peak.ms <= 6000, peak);
    check('niveau : aucune erreur console', !errors.length, errors);
    await close();
  }

  await nav.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ out: OUT, total: checks.length, failed: failed.length, checks }, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
