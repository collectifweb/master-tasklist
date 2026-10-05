// 13. Jalon de la semaine 1 : sur un fichier à la forme du vrai, le chargement ne réécrit rien et aucune action ne perd de champ.
const L = require('./lib.cjs');
// Fichier FICTIF à la forme exacte du vrai tasks.json (relevée le 5 oct. 2026 : 27 tâches, champs id/task/difficulty/length/
// priority/domain/status/created, une seule deadline, identifiants texte de 15, 17 et 36 caractères). Aucun titre réel.
function rng(seed) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }
const r = rng(7);
const pick = (n, abc = '0123456789abcdefghijklmnopqrstuvwxyz') => Array.from({ length: n }, () => abc[Math.floor(r() * abc.length)]).join('');
const uuid = () => [8, 4, 4, 4, 12].map((n) => pick(n, '0123456789abcdef')).join('-');
const DOMS = [...Array(11).fill('Maison'), ...Array(5).fill('Professionnel'), 'Véhicule', 'Véhicule', ...Array(5).fill('Jardin'), 'Ferme', 'Ferme', 'Administratif', 'Terrain'];
const STATUTS = [...Array(16).fill('todo'), ...Array(11).fill('done')].sort(() => r() - 0.5);
const TASKS = DOMS.map((domain, i) => {
  const t = { id: i % 3 === 0 ? pick(15) : i % 3 === 1 ? pick(17) : uuid(), task: `Tâche fictive ${i + 1}`,
    difficulty: 1 + Math.floor(r() * 9), length: 1 + Math.floor(r() * 9), priority: 4 + Math.floor(r() * 6),
    domain, status: STATUTS[i], created: `2026-${String(8 + Math.floor(r() * 3)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}` };
  if (i === 4) t.deadline = '2026-10-20';
  return t;
});
L.runScenario('jalon : forme réelle, aucun champ perdu', async ({ R, srv, newPage, shot }) => {
  const orig = JSON.parse(JSON.stringify(TASKS));
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForTimeout(3000);
  R.check('le chargement ne réécrit pas tasks.json', JSON.stringify(srv.readTasks()) === JSON.stringify(orig));
  await L.openPanel(page);
  const seg = await page.textContent('body');
  R.check('16 quêtes à faire affichées', /À faire\s*16/.test(seg), (seg.match(/À faire\s*\d+/) || [''])[0]);
  R.check('11 faites affichées', /Faites\s*11/.test(seg), (seg.match(/Faites\s*\d+/) || [''])[0]);
  // Fait sur la quête n° 1
  const id1 = await page.getAttribute('#fil-quest', 'data-task-id');
  await page.click('#fil-quest [data-action="complete"]');
  await L.waitFor(() => srv.readTasks().find((t) => t.id === id1).status === 'done');
  // priorité d'une autre quête à faire
  const id2 = orig.find((t) => t.status === 'todo' && t.id !== id1).id;
  await page.locator(`#quest-list > li[data-task-id="${id2}"] [data-action="open"]`).click();
  await page.waitForSelector('#dlg-fiche[open]');
  await page.click('#fiche-steppers .stepper-row[data-kind="priority"] [data-step="-1"]');
  await page.click('#dlg-fiche [data-action="fiche-save"]');
  await L.waitFor(() => srv.readTasks().find((t) => t.id === id2).priority !== orig.find((t) => t.id === id2).priority);
  await page.waitForTimeout(1500);
  const after = srv.readTasks();
  R.check('27 tâches toujours présentes, mêmes identifiants', after.length === 27 && orig.every((o) => after.some((a) => a.id === o.id)));
  let lost = [], changed = [];
  for (const o of orig) {
    const a = after.find((t) => t.id === o.id);
    for (const k of Object.keys(o)) {
      if (!(k in a)) lost.push(`${o.id}.${k}`);
      else if (JSON.stringify(a[k]) !== JSON.stringify(o[k])) changed.push(`${o.id === id1 ? 'q1' : o.id === id2 ? 'q2' : o.id}.${k}`);
    }
    if (o.id !== id1 && o.id !== id2 && JSON.stringify(a) !== JSON.stringify(o)) changed.push(`${o.id} (non touchée)`);
  }
  R.check('aucun champ d’origine perdu', lost.length === 0, lost.join(','));
  R.check('seuls les champs attendus ont changé (q1 : statut ; q2 : priorité)', changed.every((c) => /^q[12]\.(status|priority)$/.test(c)), changed.join(','));
  R.check('aucune tâche non touchée modifiée', !changed.some((c) => c.includes('non touchée')));
  R.check('identifiants de 15, 17 et 36 caractères conservés tels quels', orig.every((o) => after.some((a) => a.id === o.id && typeof a.id === 'string')));
  await shot(page, 'jalon-forme');
}, { tasks: TASKS });
