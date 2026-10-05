// Rappel du matin (app/serveur/rappel.php) : un envoi par jour au plus, texte général sans rien de la liste,
// jamais lancé depuis le web, rien d'envoyé sans réglage. Un faux serveur ntfy reçoit les envois.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import net from 'node:net';

const here = dirname(fileURLToPath(import.meta.url));
const SRV = join(here, '..', '..', 'serveur');
const TEXTES = JSON.parse(readFileSync(join(SRV, 'rappels.json'), 'utf8'));

// Copie app/serveur + un dossier de données qui contient une liste au titre reconnaissable.
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'oree-rappel-'));
  mkdirSync(join(root, 'app', 'serveur'), { recursive: true });
  mkdirSync(join(root, 'app', 'api', 'data'), { recursive: true });
  for (const f of ['rappel.php', 'rappels.json']) copyFileSync(join(SRV, f), join(root, 'app', 'serveur', f));
  writeFileSync(join(root, 'app', 'api', 'data', 'tasks.json'), JSON.stringify([{ id: 'x', task: 'Titre-témoin-confidentiel', status: 'todo' }]));
  return { root, script: join(root, 'app', 'serveur', 'rappel.php'), data: join(root, 'app', 'api', 'data') };
}

async function fakeNtfy(status = 200) {
  const got = [];
  const server = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => { got.push({ method: req.method, url: req.url, type: req.headers['content-type'], body: b }); res.writeHead(status); res.end('{}'); });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { got, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

// Lancement sans bloquer : le faux serveur ntfy tourne dans ce même processus et doit pouvoir répondre.
const run = (script, env) => new Promise((res) => {
  const p = spawn('php', [script], { env: { ...process.env, ...env } });
  let stderr = '';
  p.stderr.on('data', (c) => { stderr += c; });
  p.on('close', (status) => res({ status, stderr }));
});

test('rappel : envoie un texte du catalogue, avec le lien de l’app, au bon canal', async () => {
  const { root, script, data } = setup();
  const ntfy = await fakeNtfy();
  try {
    const r = await run(script, { OREE_NTFY_SERVER: ntfy.url, OREE_NTFY_TOPIC: 'canal-fictif', OREE_APP_URL: 'https://exemple.test/app/', OREE_DATA_DIR: data });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(ntfy.got.length, 1);
    const e = ntfy.got[0];
    assert.equal(e.method, 'POST');
    assert.equal(e.url, '/');
    assert.match(e.type, /application\/json/);
    const b = JSON.parse(e.body);
    assert.equal(b.topic, 'canal-fictif');
    assert.equal(b.click, 'https://exemple.test/app/');
    assert.ok(TEXTES.some((t) => t.title === b.title && t.message === b.message), e.body);
  } finally { await ntfy.close(); rmSync(root, { recursive: true, force: true }); }
});

test('rappel : un seul envoi par jour, même si la tâche planifiée tourne deux fois', async () => {
  const { root, script, data } = setup();
  const ntfy = await fakeNtfy();
  const env = { OREE_NTFY_SERVER: ntfy.url, OREE_NTFY_TOPIC: 'canal-fictif', OREE_APP_URL: 'https://exemple.test/app/', OREE_DATA_DIR: data };
  try {
    assert.equal((await run(script, env)).status, 0);
    assert.equal((await run(script, env)).status, 0);
    assert.equal(ntfy.got.length, 1);
    assert.ok(existsSync(join(data, 'rappel.json')));
  } finally { await ntfy.close(); rmSync(root, { recursive: true, force: true }); }
});

test('rappel : rien de la liste des tâches dans le message', async () => {
  const { root, script, data } = setup();
  const ntfy = await fakeNtfy();
  try {
    await run(script, { OREE_NTFY_SERVER: ntfy.url, OREE_NTFY_TOPIC: 'canal-fictif', OREE_APP_URL: 'https://exemple.test/app/', OREE_DATA_DIR: data });
    assert.equal(ntfy.got.length, 1);
    assert.ok(!ntfy.got[0].body.includes('Titre-témoin-confidentiel'));
    assert.ok(!/\d/.test(JSON.parse(ntfy.got[0].body).message), 'aucun nombre (ni compte de tâches) dans le texte');
  } finally { await ntfy.close(); rmSync(root, { recursive: true, force: true }); }
});

test('rappel : un envoi refusé n’est pas noté comme fait (on réessaie au passage suivant)', async () => {
  const { root, script, data } = setup();
  const ntfy = await fakeNtfy(500);
  try {
    const r = await run(script, { OREE_NTFY_SERVER: ntfy.url, OREE_NTFY_TOPIC: 'canal-fictif', OREE_APP_URL: 'https://exemple.test/app/', OREE_DATA_DIR: data });
    assert.notEqual(r.status, 0);
    assert.ok(!existsSync(join(data, 'rappel.json')));
  } finally { await ntfy.close(); rmSync(root, { recursive: true, force: true }); }
});

test('rappel : sans canal ni adresse de l’app, rien n’est envoyé', async () => {
  const { root, script, data } = setup();
  const ntfy = await fakeNtfy();
  try {
    const r = await run(script, { OREE_NTFY_SERVER: ntfy.url, OREE_DATA_DIR: data });
    assert.notEqual(r.status, 0);
    assert.equal(ntfy.got.length, 0);
  } finally { await ntfy.close(); rmSync(root, { recursive: true, force: true }); }
});

test('rappel : appelé depuis le web, il refuse et n’envoie rien', async () => {
  const { root, data } = setup();
  const ntfy = await fakeNtfy();
  const port = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], {
    env: { ...process.env, OREE_NTFY_SERVER: ntfy.url, OREE_NTFY_TOPIC: 'canal-fictif', OREE_APP_URL: 'https://exemple.test/app/', OREE_DATA_DIR: data },
    stdio: 'ignore',
  });
  try {
    let res = null;
    for (let i = 0; i < 50 && !res; i++) {
      try { res = await fetch(`http://127.0.0.1:${port}/app/serveur/rappel.php`); } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    assert.equal(res.status, 403);
    assert.equal(ntfy.got.length, 0);
    assert.ok(!existsSync(join(data, 'rappel.json')));
  } finally { php.kill(); await ntfy.close(); rmSync(root, { recursive: true, force: true }); }
});
