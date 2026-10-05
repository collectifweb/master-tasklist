// Mesures du monde (app/world/demo.html) : erreurs console, défilement horizontal, cibles de 44 px,
// images au repos, i/s pendant le fil de lumière sous ralentissement CPU ×4, durée de recoloration d'un secteur,
// nombre d'éléments animés, saut d'animation, mouvement réduit, plan accessible.
//
//   python3 -m http.server 8791 --bind 127.0.0.1      (depuis la racine du dépôt)
//   PW_CORE=<chemin>/node_modules/playwright-core PW_CHROME=<chemin>/chrome node app/tests/e2e/world-perf.cjs
//
// Variables : PW_CORE, PW_CHROME (navigateur), BASE (adresse du serveur), OUT (dossier des captures ;
// par défaut un dossier temporaire, jamais le dépôt : les captures ne se committent pas).
const HOME = require('os').homedir();
const { chromium } = require(process.env.PW_CORE || `${HOME}/.npm/_npx/361ceb562f3b3235/node_modules/playwright-core`);
const CHROME = process.env.PW_CHROME || `${HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
const BASE = process.env.BASE || 'http://127.0.0.1:8791';
const OUT = process.env.OUT || require('path').join(require('os').tmpdir(), 'oree-monde');
require('fs').mkdirSync(OUT, { recursive: true });
const URL = `${BASE}/app/world/demo.html`;
const VIEWS = [[390, 844], [834, 1112], [1280, 900]];
const report = { views: {}, perf: {} };

// compte les requestAnimationFrame demandés par la page (le monde en a un seul, arrêté au repos)
const INIT = () => {
  window.__raf = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) => { window.__raf++; return raf(fn); };
};

async function open(nav, w, h, opts = {}) {
  const page = await nav.newPage({ viewport: { width: w, height: h }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.addInitScript(INIT);
  await page.goto(URL);
  await page.waitForFunction(() => window.__world && document.querySelectorAll('.ow-plaque').length === 6);
  await page.waitForTimeout(400);
  return { page, errors };
}
const idle = (page) => page.waitForFunction(() => !window.__world.playing, null, { timeout: 20000 });
const act = (page, name) => page.evaluate((n) => { const b = document.querySelector(`[data-demo="${n}"]`); window.__demo.actions[n](b); }, name);

async function layoutChecks(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const hscroll = Math.max(de.scrollWidth, document.body.scrollWidth) > de.clientWidth;
    const small = [];
    const vw = innerWidth, vh = innerHeight;
    const visible = (r) => r.width > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
    const items = [...document.querySelectorAll('.ow-plaque, .ow-zbtn, .ow-skip:not([hidden])')].map((n) => [n, n.getBoundingClientRect()]);
    const lod = document.querySelector('.ow').dataset.lod;
    if (lod !== 'loin') for (const n of document.querySelectorAll('.ow-ent.is-btn .ow-hit')) items.push([n.closest('.ow-ent'), n.getBoundingClientRect()]);
    let count = 0;
    for (const [n, r] of items) {
      if (!visible(r)) continue;
      count++;
      if (r.width < 44 || r.height < 44) small.push(`${n.dataset.id || n.dataset.sector || n.className} ${r.width.toFixed(0)}×${r.height.toFixed(0)}`);
    }
    const ow = document.querySelector('.ow').getBoundingClientRect();
    const free = parseFloat(getComputedStyle(document.querySelector('.ow')).getPropertyValue('--ow-bottom')) || 0;
    return { hscroll, targets: count, small, lod, scale: getComputedStyle(document.querySelector('.ow')).getPropertyValue('--ow-s').trim(), worldShare: { h: +((ow.height - free) / innerHeight).toFixed(2), w: +(ow.width / innerWidth).toFixed(2) } };
  });
}

async function idleFrames(page, ms = 2000) {
  return page.evaluate(async (ms) => {
    const a0 = document.getAnimations().filter((a) => a.playState === 'running').length;
    const r0 = window.__raf;
    await new Promise((r) => setTimeout(r, ms));
    return { raf: window.__raf - r0, runningAnimationsAtStart: a0, runningAnimationsAtEnd: document.getAnimations().filter((a) => a.playState === 'running').length };
  }, ms);
}

(async () => {
  const nav = await chromium.launch({ executablePath: CHROME });
  // ---------------------------------------------------------------- mise en page aux trois largeurs
  for (const [w, h] of VIEWS) {
    const { page, errors } = await open(nav, w, h);
    const v = { layout: await layoutChecks(page) };
    await page.screenshot({ path: `${OUT}/${w}-repos.png` });
    // l'ambiance s'arrête d'elle-même (9 s après la dernière activité) : on attend, puis 2 s sans activité
    await page.waitForTimeout(9600);
    v.idle = await idleFrames(page, 2000);
    v.errors = errors;
    report.views[`${w}x${h}`] = v;
    await page.close();
  }

  // ---------------------------------------------------------------- moments, à 390 × 844
  {
    const { page, errors } = await open(nav, 390, 844);
    const shots = [];
    const snap = async (name, delay) => { await page.waitForTimeout(delay); await page.screenshot({ path: `${OUT}/${name}.png` }); shots.push(name); };
    act(page, 'q-champs'); await snap('390-fil', 380); await idle(page); await snap('390-apres-champs', 50);
    act(page, 'q-atelier'); await snap('390-atelier-fil', 420); await snap('390-atelier-vague', 900); await idle(page); await snap('390-apres-atelier', 50);
    act(page, 'build'); await snap('390-construction', 560); await idle(page);
    act(page, 'chapitre'); await snap('390-perce', 900); await idle(page); await snap('390-apres-chapitre', 50);
    act(page, 'veille'); await idle(page); await snap('390-veille', 50);
    report.moments = { shots, errors };
    await page.close();
  }

  // ---------------------------------------------------------------- performance sous ralentissement ×4
  {
    const { page, errors } = await open(nav, 390, 844);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.waitForTimeout(500);
    // i/s pendant le fil de lumière et la germination (premier événement de la quête de l'Atelier)
    const fps = await page.evaluate(async () => {
      const times = [];
      let maxAnims = 0, maxRunning = 0;
      let on = true;
      const tick = (ts) => {
        times.push(ts);
        const all = document.getAnimations();
        maxAnims = Math.max(maxAnims, all.length);
        maxRunning = Math.max(maxRunning, all.filter((a) => a.playState === 'running').length);
        if (on) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      window.__demo.actions['q-atelier']();
      const t0 = performance.now();
      while (window.__world.playing) await new Promise((r) => setTimeout(r, 50));
      const dur = performance.now() - t0;
      on = false;
      const d = times.slice(1).map((t, i) => t - times[i]).filter((x) => x > 0);
      d.sort((a, b) => a - b);
      const avg = d.reduce((a, b) => a + b, 0) / d.length;
      return { frames: d.length, playMs: Math.round(dur), avgFps: +(1000 / avg).toFixed(1), p95FrameMs: +d[Math.floor(d.length * 0.95)].toFixed(1), worstFrameMs: +d[d.length - 1].toFixed(1), maxAnimations: maxAnims, maxRunningAnimations: maxRunning, events: (window.__lastEvents || []).map((e) => e.type) };
    });
    // i/s pendant le seul fil (sans germination) : Fil libre dirigé
    const fpsThread = await page.evaluate(async () => {
      const times = []; let on = true;
      const tick = (ts) => { times.push(ts); if (on) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      window.__demo.actions.fil();
      while (window.__world.playing) await new Promise((r) => setTimeout(r, 50));
      on = false;
      const d = times.slice(1).map((t, i) => t - times[i]).filter((x) => x > 0).sort((a, b) => a - b);
      const avg = d.reduce((a, b) => a + b, 0) / d.length;
      return { frames: d.length, avgFps: +(1000 / avg).toFixed(1), p95FrameMs: +d[Math.floor(d.length * 0.95)].toFixed(1) };
    });
    // recoloration d'un secteur : changement d'attribut → image suivante (×4 puis ×1)
    const recolor = async () => page.evaluate(async () => {
      const g = document.querySelector('.ow-ground[data-sector="archives"]');
      const e = document.querySelector('.ow-ents[data-sector="archives"]');
      const out = [];
      for (const etat of ['prosperer', 'reparer', 'autonome', 'prosperer', 'reparer']) {
        out.push(await new Promise((res) => requestAnimationFrame(() => {
          const t0 = performance.now();
          g.removeAttribute('data-voile'); e.removeAttribute('data-voile');
          g.setAttribute('data-etat', etat); e.setAttribute('data-etat', etat);
          getComputedStyle(g.querySelector('polygon')).fill; // force le recalcul de style
          const t1 = performance.now();
          requestAnimationFrame(() => res({ style: +(t1 - t0).toFixed(2), frame: +(performance.now() - t0).toFixed(2) }));
        })));
      }
      g.removeAttribute('data-etat'); e.removeAttribute('data-etat'); g.setAttribute('data-voile', 'cendre'); e.setAttribute('data-voile', 'cendre');
      return out;
    });
    const recolorX4 = await recolor();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const recolorX1 = await recolor();
    report.perf = { fps, fpsThread, recolorX4, recolorX1, errors, counts: await page.evaluate(() => ({ entities: document.querySelectorAll('.ow-ent').length, buttons: document.querySelectorAll('.ow-ent.is-btn').length, domNodes: document.querySelector('.ow').querySelectorAll('*').length })) };
    await page.close();
  }

  // ---------------------------------------------------------------- saut : toucher ou Échap termine en ≤ 150 ms
  {
    const { page } = await open(nav, 390, 844);
    act(page, 'q-champs');
    await page.waitForTimeout(250);
    const skip = await page.evaluate(async () => {
      const t0 = performance.now();
      document.querySelector('.ow-scroller').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      while (window.__world.playing) await new Promise((r) => requestAnimationFrame(r));
      return Math.round(performance.now() - t0);
    });
    report.skipEscapeMs = skip;
    act(page, 'q-atelier');
    await page.waitForTimeout(300);
    const t0 = Date.now();
    await page.mouse.click(200, 300);
    await idle(page);
    report.skipTouchMs = Date.now() - t0;
    await page.close();
  }

  // ---------------------------------------------------------------- mouvement réduit et plan accessible
  {
    const { page, errors } = await open(nav, 390, 844, { reduced: true });
    const t0 = Date.now();
    act(page, 'q-atelier');
    await page.waitForTimeout(60);
    await idle(page);
    report.reducedPlayMs = Date.now() - t0;
    await page.screenshot({ path: `${OUT}/390-reduit.png` });
    await page.evaluate(() => { document.querySelector('[data-demo="panel"]').click(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { document.querySelector('[data-demo="plan"]').click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('#plan').scrollIntoView());
    await page.screenshot({ path: `${OUT}/390-plan.png` });
    report.plan = await page.evaluate(() => ({ items: document.querySelectorAll('.ow-plan-sector').length, buttons: [...document.querySelectorAll('.ow-plan-show')].map((b) => b.tabIndex + ':' + b.getAttribute('aria-label')), text: document.querySelector('.ow-plan').innerText.slice(0, 900) }));
    report.reducedErrors = errors;
    await page.close();
  }
  {
    const { page } = await open(nav, 1280, 900);
    act(page, 'q-atelier'); await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/1280-fil.png` }); await idle(page);
    await page.screenshot({ path: `${OUT}/1280-apres.png` });
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => document.activeElement && (document.activeElement.dataset.sector || document.activeElement.dataset.id || document.activeElement.className));
    report.firstTab = focus;
    await page.close();
  }
  await nav.close();
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
