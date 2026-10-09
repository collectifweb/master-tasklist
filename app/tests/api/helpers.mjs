import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const here = dirname(fileURLToPath(import.meta.url));
const API_SRC = join(here, '..', '..', 'api', 'api.php');

export const SAMPLE = [
  { id: 'a1', task: 'Ranger l’entrée', domain: 'Maison', difficulty: 2, length: 3, priority: 5, status: 'todo', created: '2026-01-01', deadline: null, extra: { garde: 'moi' } },
  { id: 'a2', task: 'Arroser les plantes', domain: 'Terrain', difficulty: 3, length: 4, priority: 6, status: 'todo', created: '2026-01-01' },
];

export const fmt = (tasks) => JSON.stringify(tasks, null, 4) + '\n';

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}

/** Démarre php -S sur un dossier temporaire reproduisant la disposition app/api + tasks.json. */
export async function startServer({ tasksRaw = fmt(SAMPLE), env = {}, phpArgs = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'oree-api-'));
  mkdirSync(join(root, 'app', 'api'), { recursive: true });
  copyFileSync(API_SRC, join(root, 'app', 'api', 'api.php'));
  const tasksFile = join(root, 'tasks.json');
  if (tasksRaw !== null) writeFileSync(tasksFile, tasksRaw);
  const dataDir = join(root, 'app', 'api', 'data');
  const port = await freePort();
  const proc = spawn('php', [...phpArgs, '-S', `127.0.0.1:${port}`, '-t', root], {
    env: { ...process.env, PHP_CLI_SERVER_WORKERS: '8', OREE_TASKS_FILE: tasksFile, OREE_DATA_DIR: dataDir, ...(tasksRaw === null ? { OREE_ALLOW_CREATE_TASKS: '1' } : {}), ...env },
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}/app/api/api.php`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(url, { method: 'OPTIONS' }); break; } catch { await new Promise((r) => setTimeout(r, 50)); }
  }
  let n = 0;
  return {
    url, root, tasksFile, dataDir,
    readTasksRaw: () => readFileSync(tasksFile, 'utf8'),
    backups: (name) => readdirSync(join(dataDir, 'backups')).filter((f) => f.startsWith(name + '.')),
    get: (headers = {}) => fetch(url, { headers }),
    post: (body, headers = {}) =>
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }),
    // envoi de la v2 : il porte sa version de client (l'API refuse l'ancienne app, qui n'en envoie pas)
    op: (ops, opId, headers) => (n++, fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ client: 9, opId: opId ?? `op-${Date.now()}-${n}-${Math.random()}`, ops }) })),
    stop() { proc.kill('SIGKILL'); rmSync(root, { recursive: true, force: true }); },
  };
}
