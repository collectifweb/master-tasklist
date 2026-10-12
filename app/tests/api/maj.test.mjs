// Mise à jour depuis GitHub (lot U, api/maj.php) : un faux GitHub local sert la liste des références et l'archive d'un
// commit ; une fausse installation porte ses propres fichiers (réglages, .htaccess, données hors du dossier public).
// Aucun test n'appelle le vrai GitHub. Contenus fictifs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const API = join(here, '..', '..', 'api');
const SHA = 'a'.repeat(40);
const TAG_OBJ = 'b'.repeat(40);

function ecrire(racine, fichiers) {
  for (const [rel, c] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, rel)), { recursive: true });
    writeFileSync(join(racine, rel), c);
  }
}

// La version publiée : ce qui s'installe, et ce que l'archive porte mais qui ne doit jamais s'installer.
const PUBLIEE = {
  'app/index.html': 'nouvelle page',
  'app/sw.js': 'nouveau sw',
  'app/js/main.js': 'nouveau main',
  'app/js/nouveau.js': 'fichier ajouté',
  'app/css/a.css': 'même feuille',
  'app/serveur/.htaccess': 'Require all denied\n',
  'app/api/config.php': '<?php // PIRATE',
  'app/api/.htaccess': 'PIRATE',
  'app/api/data/game-state.json': 'PIRATE',
  'app/tests/x.test.mjs': 'PIRATE',
  'app/.impeccable/design.json': 'PIRATE',
  'app/design/reference.html': 'PIRATE',
  'app/DESIGN.md': 'PIRATE',
  'app/content/README.md': 'PIRATE',
  'README.md': 'racine du dépôt',
  'docs/guide.md': 'documentation',
};

/** Archive .tar.gz comme celles de GitHub : un dossier racine master-tasklist-<commit>. */
function archive(fichiers, { avecApi = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'oree-maj-arch-'));
  const racine = `master-tasklist-${SHA}`;
  ecrire(join(d, racine), fichiers);
  if (avecApi) {
    mkdirSync(join(d, racine, 'app', 'api'), { recursive: true });
    copyFileSync(join(API, 'api.php'), join(d, racine, 'app', 'api', 'api.php'));
    copyFileSync(join(API, 'maj.php'), join(d, racine, 'app', 'api', 'maj.php'));
  }
  execFileSync('tar', ['-czf', join(d, 'a.tar.gz'), '-C', d, racine]);
  const b = readFileSync(join(d, 'a.tar.gz'));
  rmSync(d, { recursive: true, force: true });
  return b;
}

// Liste des références au format du protocole Git (lignes préfixées de leur longueur), main étiquetée v9.9 (annotée) et v9.10.
const refs = (main = SHA) => [
  '001e# service=git-upload-pack\n0000',
  `0155${main} HEAD\0multi_ack thin-pack side-band\n`,
  `003f${main} refs/heads/main\n`,
  `003e${'c'.repeat(40)} refs/tags/v1.0\n`,
  `003e${TAG_OBJ} refs/tags/v9.9\n`,
  `0041${main} refs/tags/v9.9^{}\n`,
  `003f${main} refs/tags/v9.10\n`,
  '0000',
].join('');

async function fauxGitHub() {
  const appels = { refs: 0, archive: 0 };
  let corpsArchive = archive(PUBLIEE);
  let corpsRefs = refs();
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith('/refs')) { appels.refs++; res.writeHead(200); return res.end(corpsRefs); }
    if (req.url === `/archive/${SHA}`) { appels.archive++; res.writeHead(200); return res.end(corpsArchive); }
    res.writeHead(404); res.end();
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return {
    refs: `${base}/refs?service=git-upload-pack`, archive: `${base}/archive/`, appels,
    servir: ({ arch, rf } = {}) => { if (arch) corpsArchive = arch; if (rf) corpsRefs = rf; },
    stop: () => { srv.closeAllConnections(); srv.close(); },
  };
}

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}

// L'installation avant la mise à jour : l'ancienne version, plus ce qui lui appartient.
const INSTALLEE = {
  'index.html': 'ancienne page',
  'sw.js': 'ancien sw',
  'js/main.js': 'ancien main',
  'js/garde.js': 'absent de la nouvelle version',
  'css/a.css': 'même feuille',
  'api/config.php': '<?php // réglages de cette installation\n',
  'api/.htaccess': 'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1\n',
};

async function installation(gh, { env = {}, avant } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'oree-maj-'));
  const jeu = join(root, 'jeu');
  const donnees = join(root, 'donnees');
  ecrire(jeu, INSTALLEE);
  copyFileSync(join(API, 'api.php'), join(jeu, 'api', 'api.php'));
  copyFileSync(join(API, 'maj.php'), join(jeu, 'api', 'maj.php'));
  writeFileSync(join(root, 'tasks.json'), '[]\n');
  if (avant) avant({ root, jeu, donnees });
  const port = await freePort();
  const proc = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', jeu], {
    env: {
      ...process.env, PHP_CLI_SERVER_WORKERS: '4', OREE_TASKS_FILE: join(root, 'tasks.json'), OREE_DATA_DIR: donnees,
      OREE_METEO_URL: 'http://127.0.0.1:9/v1/forecast', OREE_MAJ_REFS: gh.refs, OREE_MAJ_ARCHIVE: gh.archive, ...env,
    },
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}/api/maj.php`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(url, { method: 'OPTIONS' }); break; } catch { await new Promise((r) => setTimeout(r, 50)); }
  }
  const lire = (rel) => (existsSync(join(jeu, rel)) ? readFileSync(join(jeu, rel), 'utf8') : null);
  return {
    jeu, donnees, lire,
    get: (h = {}) => fetch(url, { headers: h }),
    lancer: (body = { lancer: true }, h = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) }),
    etat: () => (existsSync(join(donnees, 'maj.json')) ? JSON.parse(readFileSync(join(donnees, 'maj.json'), 'utf8')) : {}),
    stop() { proc.kill('SIGKILL'); rmSync(root, { recursive: true, force: true }); },
  };
}

async function avec(opts, fn) {
  const gh = await fauxGitHub();
  if (opts.servir) gh.servir(opts.servir);
  const s = await installation(gh, opts);
  try { await fn(s, gh); } finally { s.stop(); gh.stop(); }
}

test('lecture : version installée inconnue, version publiée avec sa plus haute étiquette, mise à jour possible', () => avec({}, async (s, gh) => {
  const r = await s.get();
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.actif, true);
  assert.equal(j.installee, null);
  assert.equal(j.publiee.commit, SHA);
  assert.equal(j.publiee.version, 'v9.10');
  assert.equal(j.aJour, false);
  assert.equal(j.possible, true);
  assert.equal(j.raison, null);
  assert.equal(j.injoignable, false);
  // relue au plus toutes les 10 minutes
  await s.get();
  assert.equal(gh.appels.refs, 1);
  assert.equal(gh.appels.archive, 0, 'une lecture ne télécharge jamais l’archive');
}));

test('mise à jour : fichiers remplacés et ajoutés, les fichiers propres à l’installation et le reste intacts', () => avec({}, async (s, gh) => {
  const r = await s.lancer();
  assert.equal(r.status, 200, await r.clone().text());
  const j = await r.json();
  assert.equal(j.aJour, true);
  assert.equal(j.installee.commit, SHA);
  assert.equal(j.installee.version, 'v9.10');
  assert.equal(s.lire('index.html'), 'nouvelle page');
  assert.equal(s.lire('sw.js'), 'nouveau sw');
  assert.equal(s.lire('js/main.js'), 'nouveau main');
  assert.equal(s.lire('js/nouveau.js'), 'fichier ajouté');
  assert.equal(s.lire('serveur/.htaccess'), 'Require all denied\n', 'un .htaccess du jeu s’installe');
  assert.equal(s.lire('js/garde.js'), 'absent de la nouvelle version', 'rien n’est effacé');
  assert.equal(s.lire('api/config.php'), INSTALLEE['api/config.php']);
  assert.equal(s.lire('api/.htaccess'), INSTALLEE['api/.htaccess']);
  for (const rel of ['api/data', 'tests', '.impeccable', 'design/reference.html', 'DESIGN.md', 'content/README.md', 'README.md', '../README.md', '../docs']) {
    assert.equal(existsSync(join(s.jeu, rel)), false, `${rel} ne s’installe pas`);
  }
  // ce qui a été remplacé est gardé ; un fichier identique n'est pas réécrit
  const prec = join(s.donnees, 'maj', 'precedente');
  assert.equal(readFileSync(join(prec, 'index.html'), 'utf8'), 'ancienne page');
  assert.equal(existsSync(join(prec, 'css', 'a.css')), false);
  assert.equal(j.installee.fichiers, 5, 'index.html, sw.js, js/main.js, js/nouveau.js, serveur/.htaccess (css/a.css et api/ identiques)');
  assert.equal(s.etat().installee.commit, SHA);
  assert.equal(existsSync(join(s.donnees, 'maj', `archive-${SHA}.tar.gz`)), false, 'l’archive est retirée');
  // déjà à jour : rien n'est retéléchargé
  const r2 = await s.lancer();
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).aJour, true);
  assert.equal(gh.appels.archive, 1);
  const g = await (await s.get()).json();
  assert.equal(g.aJour, true);
}));

test('archive illisible : refus, rien n’est changé', () => avec({ servir: { arch: Buffer.from('pas une archive') } }, async (s) => {
  const r = await s.lancer();
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, 'archive_invalide');
  assert.equal(s.lire('index.html'), 'ancienne page');
  assert.equal(s.etat().installee, undefined);
}));

test('archive sans le programme de mise à jour (une version d’avant le lot U) : refus, rien n’est changé', () => avec({ servir: { arch: archive(PUBLIEE, { avecApi: false }) } }, async (s) => {
  const r = await s.lancer();
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, 'archive_invalide');
  assert.equal(s.lire('index.html'), 'ancienne page');
}));

test('copie interrompue au milieu : les fichiers remplacés reviennent, les nouveaux partent', () => avec({
  servir: { arch: archive({ ...PUBLIEE, 'app/js/zz.js': 'bloqué' }) },
  avant: ({ jeu }) => mkdirSync(join(jeu, 'js', 'zz.js')), // un dossier à la place du fichier : la copie y échoue
}, async (s) => {
  const r = await s.lancer();
  assert.equal(r.status, 500);
  assert.equal((await r.json()).code, 'maj_echec');
  assert.equal(s.lire('index.html'), 'ancienne page', 'copié avant l’échec (ordre alphabétique), puis remis');
  assert.equal(s.lire('js/main.js'), 'ancien main');
  assert.equal(s.lire('js/nouveau.js'), null);
  assert.equal(s.etat().installee, undefined);
}));

test('GitHub injoignable : la lecture le dit, la mise à jour refuse sans rien changer', async () => {
  const gh = await fauxGitHub();
  const s = await installation({ refs: 'http://127.0.0.1:9/refs', archive: gh.archive });
  try {
    const j = await (await s.get()).json();
    assert.equal(j.injoignable, true);
    assert.equal(j.publiee, null);
    const r = await s.lancer();
    assert.equal(r.status, 502);
    assert.equal((await r.json()).code, 'github_injoignable');
    assert.equal(s.lire('index.html'), 'ancienne page');
  } finally { s.stop(); gh.stop(); }
});

test('MISE_A_JOUR coupé : la lecture répond « inactive », la mise à jour est refusée', () => avec({ env: { OREE_MAJ: '0' } }, async (s, gh) => {
  assert.deepEqual(await (await s.get()).json(), { ok: true, actif: false });
  const r = await s.lancer();
  assert.equal(r.status, 403);
  assert.equal((await r.json()).code, 'maj_off');
  assert.equal(gh.appels.refs + gh.appels.archive, 0);
}));

test('code d’accès exigé, comme pour api.php', () => avec({ env: { OREE_TOKEN_HASH: createHash('sha256').update('code-fictif').digest('hex') } }, async (s, gh) => {
  assert.equal((await s.get()).status, 401);
  assert.equal((await s.lancer()).status, 401);
  assert.equal(gh.appels.refs + gh.appels.archive, 0);
  assert.equal((await s.get({ Authorization: 'Bearer code-fictif' })).status, 200);
}));

test('un dossier où PHP ne peut pas écrire : « ecriture », refus sans téléchargement', () => avec({ avant: ({ jeu }) => chmodSync(join(jeu, 'js'), 0o555) }, async (s, gh) => {
  try {
    const j = await (await s.get()).json();
    assert.equal(j.possible, false);
    assert.equal(j.raison, 'ecriture');
    const r = await s.lancer();
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), { ok: false, code: 'maj_impossible', error: 'La mise à jour ne peut pas se faire sur ce serveur.', raison: 'ecriture' });
    assert.equal(gh.appels.archive, 0);
  } finally { chmodSync(join(s.jeu, 'js'), 0o755); }
}));

test('lancer exige {"lancer": true} en JSON', () => avec({}, async (s, gh) => {
  assert.equal((await s.lancer({})).status, 400);
  assert.equal((await s.lancer({ lancer: 'oui' })).status, 400);
  assert.equal(gh.appels.archive, 0);
}));

// Fonctions pures, appelées en ligne de commande (OREE_MAJ_NO_RUN : le fichier ne répond à aucune requête).
function php(code) {
  return JSON.parse(execFileSync('php', ['-r', `define('OREE_MAJ_NO_RUN', true); require ${JSON.stringify(join(API, 'maj.php'))}; echo json_encode(${code});`], { encoding: 'utf8' }));
}

test('maj_chemin : seul app/ s’installe, sans ce que retire deploy-prod.sh ni ce qui appartient à l’installation', () => {
  const cas = {
    'r/app/index.html': 'index.html', 'r/app/.htaccess': '.htaccess', 'r/app/serveur/.htaccess': 'serveur/.htaccess',
    'r/app/design/icons.svg': 'design/icons.svg', 'r/app/api/maj.php': 'api/maj.php',
    'r/app/api/config.php': null, 'r/app/api/.htaccess': null, 'r/app/api/data/ledger.jsonl': null,
    'r/app/tests/a.mjs': null, 'r/app/.impeccable/design.json': null, 'r/app/design/reference.css': null,
    'r/app/README.md': null, 'r/app/content/README.md': null, 'r/README.md': null, 'r/docs/a.png': null, 'pax_global_header': null,
    'r/app/../evil.php': null, 'r/app/js/../../evil.php': null, 'r/app/./x': null, 'r/app/': null, 'r/app//etc/passwd': null,
  };
  const got = php(`array_map('maj_chemin', ${JSON.stringify(Object.keys(cas))})`);
  assert.deepEqual(Object.fromEntries(Object.keys(cas).map((k, i) => [k, got[i]])), cas);
});

test('maj_refs_lire : main et sa plus haute étiquette ; sans étiquette, version nulle ; sans main, rien', () => {
  assert.deepEqual(php(`maj_refs_lire(${JSON.stringify(refs())})`), { commit: SHA, version: 'v9.10' });
  assert.deepEqual(php(`maj_refs_lire(${JSON.stringify(refs('d'.repeat(40)))})`), { commit: 'd'.repeat(40), version: 'v9.10' });
  const sansTag = `003f${'e'.repeat(40)} refs/heads/main\n003e${'f'.repeat(40)} refs/tags/v2.0\n`;
  assert.deepEqual(php(`maj_refs_lire(${JSON.stringify(sansTag)})`), { commit: 'e'.repeat(40), version: null });
  assert.equal(php(`maj_refs_lire(${JSON.stringify('003e' + 'f'.repeat(40) + ' refs/tags/v2.0\n')})`), null);
  assert.equal(php(`maj_refs_lire('<html>pas une liste</html>')`), null);
});
