// 25. Passage d'une partie v1 à la v2 (lot 3) : serveur parti d'une partie, d'un registre et d'une file hors ligne de
// la v1. La v2 se charge, enregistre la partie en version 2 (quartiers recomptés depuis le registre), l'API garde la
// copie v1, tasks.json reste identique à l'octet, un « Souffler » resté en file est écarté avec un message, le code
// d'accès et le prénom sont gardés, la lettre de passage de Fanal n'est montrée qu'une fois. Puis un « Fait » laissé
// par un onglet v1 est recalculé par le cœur v2. Données fictives seulement.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');
const DAY = 24 * 3600 * 1000;

const letter = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-letter');
  return { open: d.open && !d.classList.contains('is-closing'), text: (d.querySelector('.letter-paper') || {}).textContent?.replace(/\s+/g, ' ').trim() || '' };
});

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const t = (id, task, domain, status, extra = {}) => ({ id, task, domain, difficulty: 3, length: 2, priority: 5, status, created: '2026-06-01', deadline: null, ...extra });
const TASKS = [
  t('q1', 'Ranger le cabanon', 'Maison', 'done', { doneAt: iso(3 * DAY) }),
  t('q2', 'Tailler la haie', 'Jardin', 'done', { doneAt: iso(30 * DAY) }),
  t('q3', 'Remplir le formulaire', 'Administratif', 'todo'),
  t('q4', 'Vérifier les pneus', 'Véhicule', 'done'), // terminée avant l'app : aucune entrée au registre
  t('q5', 'Laver les fenêtres', 'Maison', 'todo'), // payée puis remballée en v1
  t('q6', 'Préparer les boîtes à lunch', 'Enfants', 'done'), // payée il y a plus de 60 jours : la clé seule revient
];
// Entrées telles que la v1 les écrivait (Lueur au secteur, Fil libre).
const v1Entry = (key, type, taskId, msAgo, sector, sign = 1) => ({
  key, at: iso(msAgo), day: iso(msAgo).slice(0, 10), type, taskId, occurrence: 1,
  pe: 8 * sign, energy: 2.4 * sign, materials: 4 * sign, lueur: { sector, amount: 6 * sign }, filLibre: 2 * sign,
});
const LEDGER = [
  v1Entry('reward:q6:1', 'reward', 'q6', 90 * DAY, 'maison-commune'),
  v1Entry('reward:q2:1', 'reward', 'q2', 30 * DAY, 'champs'),
  v1Entry('reward:q5:1', 'reward', 'q5', 10 * DAY, 'atelier'),
  { ...v1Entry('reverse:q5:1', 'reverse', 'q5', 10 * DAY - 3600000, 'atelier', -1), reverses: ['reward:q5:1'] },
  v1Entry('reward:q1:1', 'reward', 'q1', 3 * DAY, 'atelier'),
];
// q1 → Atelier, q2 → Champs, q4 → Garage (terminée hors registre), q6 → École ; q5 remballée ne compte pas.
const EXPECTED = { champs: 1, atelier: 1, mairie: 0, ecole: 1, garage: 1, place: 0 };

const v1Game = (core) => {
  const today = core.gameDay(new Date());
  return {
    version: 1, createdAt: iso(40 * DAY), startDay: core.addDays(today, -40),
    resources: { energy: 23.4, materials: 41, confidence: 4 }, caps: { energy: 40, materials: 150 },
    lueur: { place: 12, champs: 30, atelier: 55, archives: 0, 'maison-commune': 0, relais: 0 }, filLibre: 7.5,
    lisiereDays: [core.addDays(today, -3)], weeksHeld: [], daily: { day: core.addDays(today, -1), quests: 1, lisiere: true },
    lastOpenDay: core.addDays(today, -1), lastReturnDay: null, lastSeenDay: core.addDays(today, -1),
    chapter: { number: 2, startDay: core.addDays(today, -20), objectives: {} },
    sectors: { place: { open: true, stage: 0 } }, placements: [{ id: 'tour', model: 'tour', sector: 'place', state: 'reparee' }],
    plots: [{ id: 'parcelle-1', slot: 0, crop: null, stage: 0 }],
    garden: { pantry: { courge: 2, patate: 0, ble: 0 }, reserve: 0, sown: {}, harvested: {}, reserved: 0, wateredDay: null },
    avis: { current: null, history: [], veils: [] }, story: { seen: ['introduction'], day: core.addDays(today, -1), count: 1 },
    recentApplied: {}, letters: {}, coteACote: { current: null, totals: [] },
  };
};

// Appareil qui avait la v1 : file hors ligne avec un « Souffler », code d'accès et prénom (posés une seule fois).
const SEED = ({ at }) => {
  if (localStorage.getItem('e2e.seeded')) return;
  localStorage.setItem('e2e.seeded', '1');
  localStorage.setItem('oree.token', 'code-fictif');
  localStorage.setItem('oree.prenom.v1', 'Sam');
  localStorage.setItem('oree.queue.v1', JSON.stringify([
    { opId: 'v1-souffler', name: 'souffler', params: {}, at, body: { opId: 'v1-souffler', ops: [{ type: 'game.set', game: { version: 1 }, baseGameRevision: 'x' }] } },
    { opId: 'v1-histoire', name: 'markStorySeen', params: { ids: ['introduction'] }, at },
  ]));
};

L.runScenario('25. passage de la v1 à la v2', async ({ R, srv, newPage, core, tag, shot }) => {
  const tasksBefore = fs.readFileSync(srv.tasksFile, 'utf8');
  const gameV1Raw = fs.readFileSync(path.join(srv.root, 'app', 'api', 'data', 'game-state.json'), 'utf8');
  const copyFile = path.join(srv.root, 'app', 'api', 'data', 'backups', 'game-state.v1.json');

  const { context, page } = await newPage();
  await context.addInitScript(SEED, { at: iso(2 * 3600000) });
  await page.goto(srv.url);
  await L.ready(page);

  R.check('la partie est enregistrée en version 2', await L.waitFor(() => srv.game()?.version === 2, 8000), JSON.stringify(srv.game()?.version));
  const g = srv.game();
  R.check('… quartiers recomptés depuis le registre', JSON.stringify(g.quartiers) === JSON.stringify(EXPECTED), JSON.stringify(g.quartiers));
  R.check('… quatre ressources, plus rien de la v1', g.resources.food === 5 && !('confidence' in g.resources) && !('lueur' in g) && !('filLibre' in g) && !('chapter' in g), JSON.stringify(g.resources));
  R.check('… instant de la conversion noté', typeof g.migratedAt === 'string');
  R.check('copie de la partie v1 gardée à côté des sauvegardes, à l’octet', fs.existsSync(copyFile) && fs.readFileSync(copyFile, 'utf8') === gameV1Raw);
  R.check('tasks.json identique à l’octet', fs.readFileSync(srv.tasksFile, 'utf8') === tasksBefore);

  // file hors ligne : convertie une fois, « Souffler » écarté avec un message
  R.check('ancienne file vidée et retirée', await L.waitFor(() => page.evaluate(() => localStorage.getItem('oree.queue.v1') === null && JSON.parse(localStorage.getItem('oree.queue.v2') || '[]').length === 0), 6000));
  const notice = await page.evaluate(() => { const n = document.getElementById('notice'); return n.hidden ? '' : n.textContent.replace(/\s+/g, ' ').trim(); });
  R.check('message : le « Souffler » de l’ancienne version est écarté', /Souffler/.test(notice) && /ancienne version/.test(notice), notice);
  R.check('aucun « Souffler » envoyé au serveur', !srv.ledger().some((e) => /souffl/i.test(JSON.stringify(e))) && !('filLibre' in srv.game()));

  // lettre de passage : prénom gardé sur l'appareil
  R.check('la lettre de passage de Fanal s’ouvre', await L.waitFor(async () => (await letter(page)).open, 6000));
  const l = await letter(page);
  R.check('… elle dit les quatre ressources et les quartiers, avec le prénom', /Allô, Sam\./.test(l.text) && /Énergie/.test(l.text) && /Habitants/.test(l.text) && /six quartiers/.test(l.text), l.text.slice(0, 200));
  R.check('code d’accès gardé, aucune feuille de code', await page.evaluate(() => localStorage.getItem('oree.token') === 'code-fictif' && !document.getElementById('dlg-token').open));
  await shot(page, '25-lettre-passage');
  R.check('lettre notée comme montrée', await L.waitFor(() => !!(srv.game()?.letters || {})['passage.v2'], 4000), JSON.stringify(srv.game()?.letters));
  await page.click('#dlg-letter .sheet-foot [data-close]');
  R.check('« Ranger la lettre » la referme', await L.waitFor(async () => !(await letter(page)).open, 2000));
  R.check('la copie v1 n’a pas bougé après les écritures suivantes', fs.readFileSync(copyFile, 'utf8') === gameV1Raw);

  // une seule fois : rien ne se rouvre au rechargement (ni la lettre de passage, ni une lettre du matin le même jour)
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(2000);
  R.check('rechargement : aucune lettre', !(await letter(page)).open);

  // un onglet v1 resté ouvert a laissé un « Fait » dans l'ancienne file : recalculé par le cœur v2
  await page.evaluate((at) => localStorage.setItem('oree.queue.v1', JSON.stringify([
    { opId: 'v1-fait', name: 'completeQuest', params: { id: 'q3' }, at, body: { opId: 'v1-fait', ops: [{ type: 'task.upsert', task: { id: 'q3', status: 'done' } }] } },
  ])), new Date().toISOString());
  await page.reload();
  await L.ready(page);
  R.check('« Fait » de l’ancienne file : la quête est terminée sur le serveur', await L.waitFor(() => srv.readTasks().find((x) => x.id === 'q3').status === 'done', 6000));
  const reward = await L.waitFor(() => srv.ledger().find((e) => e.key === 'reward:q3:1'), 4000);
  R.check('… gain inscrit au format v2, dans son quartier', reward && reward.quartier === 'mairie' && !('filLibre' in reward), JSON.stringify(reward));
  R.check('… et compté à la Mairie', await L.waitFor(() => srv.game()?.quartiers?.mairie === 1, 4000), JSON.stringify(srv.game()?.quartiers));
  R.check('ancienne file de nouveau retirée', await page.evaluate(() => localStorage.getItem('oree.queue.v1') === null));
  if (tag === 390) await shot(page, '25-apres');
}, { tasks: TASKS, game: v1Game, ledger: LEDGER });
