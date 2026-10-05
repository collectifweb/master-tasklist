// Outils communs des scénarios navigateur : serveur PHP sur une COPIE temporaire, Chromium, collecte des erreurs.
// Jamais de donnée réelle : tasks.example.json copié dans un dossier temporaire.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const PW_CORE = process.env.PW_CORE || path.join(os.homedir(), '.npm/_npx/361ceb562f3b3235/node_modules/playwright-core');
const PW_CHROME = process.env.PW_CHROME || path.join(os.homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome');
const { chromium } = require(PW_CORE);

const REPO = path.resolve(__dirname, '..', '..', '..');
const SHOTS = process.env.SHOTS || '/tmp/claude-1000/-home-alexandre-Apps-coding-Master-Tasklist/310ca09f-4894-4ec6-b965-9bff03723fff/scratchpad/ui';
fs.mkdirSync(SHOTS, { recursive: true });

const SIZES = [[390, 844], [834, 1112], [1280, 900]];
const only = process.env.ONLY_WIDTH ? process.env.ONLY_WIDTH.split(',').map(Number) : null;
const sizes = only ? SIZES.filter((s) => only.includes(s[0])) : SIZES;

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}

async function startServer({ tasks } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oree-ui-'));
  fs.cpSync(path.join(REPO, 'app'), path.join(root, 'app'), {
    recursive: true,
    filter: (src) => !/[\\/]app[\\/](tests|api[\\/]data)([\\/]|$)/.test(src) && !/api[\\/]config\.php$/.test(src)
      && (process.env.WITH_WORLD === '1' || !/[\\/]app[\\/]world([\\/]|$)/.test(src)), // monde exclu par défaut : essais hermétiques
  });
  const tasksFile = path.join(root, 'tasks.json');
  if (tasks) fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 4) + '\n');
  else fs.copyFileSync(path.join(REPO, 'tasks.example.json'), tasksFile);
  const port = await freePort();
  const proc = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], {
    env: { ...process.env, PHP_CLI_SERVER_WORKERS: '8' }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + '/app/api/api.php'); break; } catch { await new Promise((r) => setTimeout(r, 50)); }
  }
  return {
    base, url: base + '/app/', root, tasksFile,
    api: base + '/app/api/api.php',
    readTasks: () => JSON.parse(fs.readFileSync(tasksFile, 'utf8')),
    writeTasks: (t) => fs.writeFileSync(tasksFile, JSON.stringify(t, null, 4) + '\n'),
    ledger: () => {
      const f = path.join(root, 'app', 'api', 'data', 'ledger.jsonl');
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    },
    game: () => {
      const f = path.join(root, 'app', 'api', 'data', 'game-state.json');
      return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
    },
    stop() { try { proc.kill('SIGKILL'); } catch {} fs.rmSync(root, { recursive: true, force: true }); },
  };
}

async function launch() {
  return chromium.launch({ executablePath: PW_CHROME });
}

/** Contexte + page avec collecte des erreurs console (le 404 attendu de world/world.js est ignoré tant que le monde n'existe pas). */
async function newPage(browser, [w, h], opts = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, ...opts });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    if (/world\/world\.js/.test(loc.url || '') || /Failed to load resource.*404/.test(m.text()) && /world\.js/.test(loc.url || '')) return;
    if (/ERR_INTERNET_DISCONNECTED/.test(m.text())) return; // coupure de réseau provoquée par le scénario (journal du navigateur, pas de l'app)
    if (/status of 409/.test(m.text())) return; // conflit 409 : réponse normale du protocole (game_conflict), le navigateur la journalise
    page.errors.push('console: ' + m.text() + ' ' + (loc.url || ''));
  });
  page.on('requestfailed', (r) => { if (!/world\.js/.test(r.url()) && !/INTERNET_DISCONNECTED|ABORTED/.test(r.failure().errorText)) page.errors.push('requestfailed: ' + r.url() + ' ' + r.failure().errorText); });
  return { context, page };
}

/** Compteur de résultats : check(nom, condition, détail). */
function reporter(name) {
  const results = [];
  const r = {
    results,
    check(label, ok, detail = '') {
      results.push({ label, ok: !!ok, detail });
      console.log(`  ${ok ? 'OK ' : 'ÉCHEC'}  ${label}${ok ? '' : detail ? ' : ' + detail : ''}`);
    },
    failed: () => results.filter((x) => !x.ok).length,
  };
  console.log(`\n=== ${name}`);
  return r;
}

async function waitFor(fn, ms = 8000, step = 100) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) return false;
    await new Promise((r) => setTimeout(r, step));
  }
}

/** Attend que l'app ait fini son premier rendu (Fil du jour visible). */
async function ready(page) {
  await page.waitForSelector('#fil-quest:not([hidden]), #fil-empty:not([hidden])', { timeout: 10000 });
  await page.waitForTimeout(150);
}

/** Ouvre le panneau en compact (la liste n'est visible qu'ouverte). */
async function openPanel(page) {
  const open = await page.evaluate(() => document.getElementById('app').dataset.panel === 'open');
  const visible = await page.locator('.panel-toggle').isVisible();
  if (visible && !open) await page.click('.panel-toggle');
  await page.waitForTimeout(450);
}

/** Lance fn pour chacune des 3 largeurs, avec un serveur neuf à chaque fois. */
async function runScenario(name, fn, { tasks } = {}) {
  const R = reporter(name);
  const b = await launch();
  const core = await import(require('node:url').pathToFileURL(path.join(REPO, 'app', 'core', 'index.js')).href);
  for (const size of sizes) {
    console.log(`-- ${size[0]}x${size[1]}`);
    const srv = await startServer({ tasks });
    const pages = [];
    const mk = async (opts, ctxOpts) => {
      const c = await newPage(b, size, ctxOpts);
      pages.push(c.page);
      return c;
    };
    try {
      await fn({ R, srv, browser: b, size, tag: size[0], core, newPage: mk, shot: async (page, n) => { await page.waitForTimeout(500); return page.screenshot({ path: `${SHOTS}/${n}-${size[0]}.png` }); } });
    } catch (e) {
      R.check('exception : ' + e.message, false, e.stack);
    }
    for (const p of pages) R.check(`aucune erreur console (${size[0]})`, p.errors.length === 0, p.errors.join(' | '));
    srv.stop();
  }
  await b.close();
  const f = R.failed();
  console.log(f ? `RESULTAT ${name} : ECHEC (${f} verifications)` : `RESULTAT ${name} : REUSSI (${R.results.length} verifications)`);
  process.exit(f ? 1 : 0);
}

/** Valeur numérique affichée d'une ressource du HUD. */
const resValue = (page, name) => page.evaluate((n) => {
  const t = document.querySelector(`.res[data-res="${n}"] .res-value`).firstChild.nodeValue;
  return Number(t.replace(/\s/g, '').replace(',', '.'));
}, name);

/** Rectangle d'un élément ou null. */
const rect = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom };
}, sel);

module.exports = { runScenario, resValue, rect, SIZES: sizes, SHOTS, REPO, startServer, launch, newPage, reporter, waitFor, ready, openPanel, chromium };
