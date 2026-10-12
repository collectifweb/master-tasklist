// 48. La mise à jour depuis GitHub (lot U), à l'écran. Un faux GitHub local sert la liste des références (main étiquetée
// v9.9) et une archive faite du dossier app/ de la copie de travail, plus un fichier témoin. Aucun appel au vrai GitHub.
//   - Réglages, « Version du jeu », sous « Météo du village » : « Version installée inconnue », « Version 9.9 disponible. »
//     (lu : role="status") et « Mettre à jour » (44 px) ; aucun débordement ;
//   - « Mettre à jour » : « Mise à jour en cours… », puis « Le jeu est à jour. Il se recharge. », la page se recharge ; le
//     fichier témoin est installé ; rouverte, la section dit « Version 9.9 », « Le jeu est à jour. », sans bouton ;
//   - réponses du serveur simulées : PHP sans droit d'écrire (la phrase du guide, pas de bouton), mise à jour coupée
//     (section absente), hors ligne (section absente).
// Données fictives seulement.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const TEXTES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'interface.json'), 'utf8'));
const tx = (k, vars = {}) => sp(TEXTES[k].replace(/\{(\w+)\}/g, (_, v) => vars[v]));
const SHA = '9'.repeat(40);
const TEMOIN = 'maj-temoin.txt';

// Archive comme celles de GitHub : master-tasklist-<commit>/app/…, sans les essais ni les données.
function archive() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oree-ui48-'));
  const racine = path.join(d, `master-tasklist-${SHA}`);
  fs.cpSync(path.join(L.REPO, 'app'), path.join(racine, 'app'), {
    recursive: true, filter: (src) => !/[\\/]app[\\/](tests|api[\\/]data)([\\/]|$)/.test(src) && !/api[\\/]config\.php$/.test(src),
  });
  fs.writeFileSync(path.join(racine, 'app', TEMOIN), 'installé par la mise à jour\n');
  // format pax, celui de git archive et donc de GitHub : le format GNU, par défaut, code les chemins de plus de 100
  // caractères d'une façon que PharData lit mal (app/.impeccable/surfaces/… dépasse 100 avec le dossier du commit)
  execFileSync('tar', ['--format=pax', '-czf', path.join(d, 'a.tar.gz'), '-C', d, `master-tasklist-${SHA}`]);
  const b = fs.readFileSync(path.join(d, 'a.tar.gz'));
  fs.rmSync(d, { recursive: true, force: true });
  return b;
}

(async () => {
  const corps = archive();
  const refs = `003f${SHA} refs/heads/main\n003e${SHA} refs/tags/v9.9\n0000`;
  const gh = http.createServer((req, res) => {
    if (req.url.startsWith('/refs')) { res.writeHead(200); return res.end(refs); }
    if (req.url === `/archive/${SHA}`) { res.writeHead(200); return res.end(corps); }
    res.writeHead(404); res.end();
  });
  await new Promise((ok) => gh.listen(0, '127.0.0.1', ok));
  // lu par le serveur PHP de chaque largeur (startServer lui passe l'environnement)
  process.env.OREE_MAJ_REFS = `http://127.0.0.1:${gh.address().port}/refs?service=git-upload-pack`;
  process.env.OREE_MAJ_ARCHIVE = `http://127.0.0.1:${gh.address().port}/archive/`;
  process.on('exit', () => gh.close());

  L.runScenario('48 · la mise à jour depuis GitHub : Réglages, « Mettre à jour », rechargement', async ({ R, srv, tag, newPage, shot }) => {
    const { page, context } = await newPage();
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);

    const ouvrir = async () => {
      await L.openPanel(page);
      await page.click('[data-action="open-settings"]');
      await page.waitForSelector('#dlg-settings[open]');
      await page.waitForTimeout(700);
    };
    const fermer = async () => {
      await page.keyboard.press('Escape');
      await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-settings').open), 2000);
      await page.waitForTimeout(300);
    };
    const section = () => page.evaluate(() => {
      const s = (x) => String(x || '').replace(/\s+/g, ' ').trim();
      const f = document.getElementById('set-maj');
      const b = f.querySelector('[data-action="maj-lancer"]');
      const r = b && b.getBoundingClientRect();
      const m = document.getElementById('set-meteo');
      return {
        visible: !f.hidden && f.checkVisibility() && f.getBoundingClientRect().height > 0,
        apresMeteo: !!m && !!(m.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING),
        legende: s(f.querySelector('legend').textContent),
        version: s(f.querySelector('.meteo-ville b')?.textContent), sous: s(f.querySelector('.meteo-ville small')?.textContent),
        etat: s(document.getElementById('set-maj-etat').textContent), role: document.getElementById('set-maj-etat').getAttribute('role'),
        bouton: b ? { texte: s(b.textContent), h: Math.round(r.height), occupe: b.getAttribute('aria-busy') } : null,
        deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth || [...document.querySelectorAll('#dlg-settings *')].some((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'auto'),
      };
    });

    // ───── version inconnue, 9.9 disponible
    await ouvrir();
    await page.evaluate(() => document.getElementById('set-maj').scrollIntoView({ block: 'center' }));
    let s = await section();
    R.check('« Version du jeu » visible, sous « Météo du village »', s.visible && s.apresMeteo && s.legende === tx('settings.maj'), JSON.stringify(s));
    R.check('version installée inconnue, notée à la première mise à jour', s.version === tx('settings.maj.inconnue') && s.sous === tx('settings.maj.inconnue.hint'), JSON.stringify(s));
    R.check('« Version 9.9 disponible. » dans une région lue', s.etat === tx('settings.maj.disponible', { version: '9.9' }) && s.role === 'status', JSON.stringify(s));
    R.check('« Mettre à jour » de 44 px au moins', s.bouton && s.bouton.texte === tx('settings.maj.lancer') && s.bouton.h >= 44, JSON.stringify(s.bouton));
    R.check('aucun débordement horizontal', !s.deborde);
    await shot(page, '48-disponible');

    // ───── « Mettre à jour » : en cours, fait, rechargement
    const etats = [];
    await page.exposeFunction('__etatMaj', (x) => etats.push(x));
    await page.evaluate(() => new MutationObserver(() => window.__etatMaj(document.getElementById('set-maj-etat')?.textContent || ''))
      .observe(document.getElementById('set-maj-etat'), { childList: true, characterData: true, subtree: true }));
    const avant = { quetes: fs.readFileSync(srv.tasksFile, 'utf8'), partie: !!srv.game() };
    const recharge = page.waitForEvent('load', { timeout: 20000 });
    await page.click('[data-action="maj-lancer"]');
    await recharge;
    R.check('« Mise à jour en cours… » puis « Le jeu est à jour. Il se recharge. »', etats.map(sp).join(' | ') === [tx('settings.maj.en_cours'), tx('settings.maj.fait')].join(' | '), JSON.stringify(etats));
    R.check('le fichier témoin de la nouvelle version est installé', fs.existsSync(path.join(srv.root, 'app', TEMOIN)));
    R.check('ni api/config.php, ni les quêtes, ni la partie n’ont bougé', !fs.existsSync(path.join(srv.root, 'app', 'api', 'config.php'))
      && fs.readFileSync(srv.tasksFile, 'utf8') === avant.quetes && (!avant.partie || !!srv.game()), JSON.stringify(avant.partie));
    await L.ready(page);
    await L.closeWelcome(page, 1000);
    await ouvrir();
    s = await section();
    R.check('rouverte : « Version 9.9 », « Le jeu est à jour. », sans bouton', s.visible && s.version === tx('settings.maj.version', { version: '9.9' }) && s.etat === tx('settings.maj.a_jour') && !s.bouton, JSON.stringify(s));
    await page.evaluate(() => document.getElementById('set-maj').scrollIntoView({ block: 'center' }));
    await shot(page, '48-a-jour');
    await fermer();

    // ───── réponses simulées du serveur
    const simuler = async (corps) => {
      await page.route('**/api/maj.php', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corps) }));
      await ouvrir();
      const x = await section();
      await fermer();
      await page.unroute('**/api/maj.php');
      return x;
    };
    s = await simuler({ ok: true, actif: true, installee: null, publiee: { commit: SHA, version: 'v9.9', lue: '2026-10-12T12:00:00Z' }, aJour: false, possible: false, raison: 'ecriture', injoignable: false });
    R.check('PHP sans droit d’écrire : la phrase qui renvoie au guide, sans bouton', s.visible && s.etat === tx('settings.maj.ecriture') && !s.bouton, JSON.stringify(s));
    s = await simuler({ ok: true, actif: false });
    R.check('mise à jour coupée sur le serveur : section absente', !s.visible, JSON.stringify(s));
    await context.setOffline(true);
    await ouvrir();
    s = await section();
    R.check('hors ligne : section absente', !s.visible, JSON.stringify(s));
    await fermer();
    await context.setOffline(false);
  });
})();
