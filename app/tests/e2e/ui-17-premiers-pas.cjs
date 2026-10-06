// 17. Les cinq premiers pas (bible §11), suivis par le bandeau « Aujourd'hui » : chaque toucher mène au bon endroit
// (fiche du chalet, ajout d'une tâche, « Fait » du Fil du jour, fiche de la parcelle, accueil d'une famille). Chaque pas
// est payé une seule fois au registre (clé pas:{id}), annoncé, et jamais écrit dans tasks.json, qui ne garde que la
// tâche ajoutée. Liste de départ vide, date fixe en juin (potager ouvert). Titres fictifs.
const L = require('./lib.cjs');

function juneMonday() {
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), 5, 8, 14));
  if (d <= now) d = new Date(Date.UTC(now.getUTCFullYear() + 1, 5, 8, 14));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const MONDAY = juneMonday();
const TITRE = 'Ranger la remise';
const PAS = ['chalet', 'tache', 'terminer', 'semer', 'famille'];
const NOMS = {
  chalet: 'Construire ton premier chalet', tache: 'Ajouter ta première vraie tâche', terminer: 'Terminer une vraie tâche',
  semer: 'Semer ta première parcelle', famille: 'Accueillir ta première famille',
};

const norm = (s) => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const bandeau = (page) => page.evaluate(() => {
  const tx = (sel) => (document.querySelector(sel)?.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const e = document.getElementById('bandeau-today');
  return { today: tx('#bandeau-today'), semaine: tx('#bandeau-semaine'), rang: tx('#bandeau-rang'), coupe: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 };
});
const pasKeys = (srv) => srv.ledger().filter((e) => String(e.key).startsWith('pas:')).map((e) => e.key);
const sheetOpen = (page, id) => page.evaluate((id) => { const d = document.getElementById(id); return d.open && !d.classList.contains('is-closing'); }, id);
async function closeBat(page) {
  await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
  await page.waitForTimeout(250);
}
/** Toucher « Aujourd'hui » ; renvoie la fiche de bâtiment ouverte (son id) si c'en est une. */
async function today(page) {
  await page.click('.bandeau-today');
  await page.waitForTimeout(300);
  return page.evaluate(() => { const d = document.getElementById('dlg-batiment'); return d.open ? d.dataset.batId : null; });
}
const geste = (page) => page.click('#dlg-batiment [data-action="bat-geste"]');
/** Le pas est-il payé, une seule fois, avec ce coup de pouce ? */
const paye = (srv, id, gain) => {
  const e = srv.ledger().filter((x) => x.key === `pas:${id}`);
  return e.length === 1 && Object.entries(gain).every(([k, v]) => e[0][k] === v) ? e[0] : null;
};
const ditLePas = async (page, id) => (await L.said(page)).some((x) => norm(x.text).includes(`Premier pas réussi : ${NOMS[id]}.`));

L.runScenario('17. premiers pas : cinq gestes depuis « Aujourd’hui », payés une fois, hors de tasks.json', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.addInitScript(L.VOICES);
  await page.clock.install({ time: MONDAY });
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page, 1200);
  await page.waitForTimeout(400);

  let b = await bandeau(page);
  R.check('départ : « Rebâtis un chalet », premiers pas 0 sur 5', b.today === 'Rebâtis un chalet' && b.semaine === 'Premiers pas : 0 sur 5', JSON.stringify(b));

  // ───── 1. chalet : « Aujourd'hui » ouvre la fiche du chalet, « Rebâtir »
  R.check('1. « Aujourd’hui » ouvre la fiche du premier chalet', (await today(page)) === 'chalet-1');
  await geste(page);
  R.check('1. pas « chalet » payé une fois : 5 Matériaux', !!(await L.waitFor(() => paye(srv, 'chalet', { materials: 5, energy: 0, pe: 0 }), 5000)), JSON.stringify(pasKeys(srv)));
  R.check('1. annoncé : « Premier pas réussi : Construire ton premier chalet. »', !!(await L.waitFor(() => ditLePas(page, 'chalet'), 3000)), JSON.stringify((await L.said(page)).slice(-2)));
  await closeBat(page);
  b = await L.waitFor(async () => { const x = await bandeau(page); return x.semaine === 'Premiers pas : 1 sur 5' ? x : null; }, 3000);
  R.check('1. le bandeau suit : « Ajoute une vraie tâche » (en entier), 1 sur 5', b && b.today === 'Ajoute une vraie tâche' && !b.coupe, JSON.stringify(b || await bandeau(page)));

  // ───── 2. première vraie tâche : « Aujourd'hui » ouvre l'ajout
  await today(page);
  R.check('2. « Aujourd’hui » ouvre l’ajout d’une quête', await L.waitFor(() => sheetOpen(page, 'dlg-add'), 2000));
  await page.fill('#add-title', TITRE);
  await page.click('#dlg-add [data-action="add-submit"]');
  R.check('2. pas « tâche » payé une fois : 2 Énergie', !!(await L.waitFor(() => paye(srv, 'tache', { energy: 2, materials: 0 }), 5000)), JSON.stringify(pasKeys(srv)));
  b = await L.waitFor(async () => { const x = await bandeau(page); return x.semaine === 'Premiers pas : 2 sur 5' ? x : null; }, 3000);
  R.check('2. le bandeau suit : « Termine une vraie tâche » (en entier), 2 sur 5', b && b.today === 'Termine une vraie tâche' && !b.coupe, JSON.stringify(b || await bandeau(page)));
  await page.waitForTimeout(300);

  // ───── 3. terminer : « Aujourd'hui » éclaire le Fil du jour et met le focus sur « Fait »
  await today(page);
  const pointe = await page.evaluate(() => ({
    focus: !!document.activeElement?.matches('#fil-quest [data-action="complete"]'),
    eclaire: document.getElementById('fil-quest').classList.contains('is-pointed'),
    titre: document.querySelector('#fil-quest .fil-title')?.textContent.trim(),
    feuille: !!document.querySelector('dialog[open]'),
  }));
  R.check('3. « Aujourd’hui » : focus sur « Fait » de la quête au Fil du jour, carte éclairée, aucune feuille', pointe.focus && pointe.eclaire && pointe.titre === TITRE && !pointe.feuille, JSON.stringify(pointe));
  await page.keyboard.press('Enter');
  R.check('3. pas « terminer » payé une fois : 5 Matériaux, avec la récompense de la quête', !!(await L.waitFor(() => paye(srv, 'terminer', { materials: 5 }) && srv.ledger().some((e) => e.type === 'reward'), 5000)), JSON.stringify(pasKeys(srv)));
  b = await L.waitFor(async () => { const x = await bandeau(page); return x.semaine === 'Premiers pas : 3 sur 5' ? x : null; }, 3000);
  R.check('3. le bandeau suit : « Sème le vieux potager » (en entier), 3 sur 5', b && b.today === 'Sème le vieux potager' && !b.coupe, JSON.stringify(b || await bandeau(page)));
  await L.closeWelcome(page, 800);

  // ───── 4. semer : « Aujourd'hui » ouvre la fiche de la parcelle
  R.check('4. « Aujourd’hui » ouvre la fiche de la parcelle', (await today(page)) === 'parcelle-1');
  await geste(page);
  R.check('4. pas « semer » payé une fois : 6 Nourriture (potager ouvert)', !!(await L.waitFor(() => paye(srv, 'semer', { food: 6 }), 5000)), JSON.stringify(pasKeys(srv)));
  R.check('4. la Nourriture monte à 18 sur le serveur et dans le compteur', await L.waitFor(async () => srv.game()?.resources.food === 18 && (await L.resValue(page, 'nourriture')) === 18, 4000), JSON.stringify(srv.game()?.resources));
  await closeBat(page);
  b = await L.waitFor(async () => { const x = await bandeau(page); return x.semaine === 'Premiers pas : 4 sur 5' ? x : null; }, 3000);
  R.check('4. le bandeau suit : « Accueille une première famille » (en entier), 4 sur 5', b && b.today === 'Accueille une première famille' && !b.coupe, JSON.stringify(b || await bandeau(page)));

  // ───── 5. famille : « Aujourd'hui » ouvre la fiche du chalet, « Accueillir une famille »
  R.check('5. « Aujourd’hui » ouvre la fiche du chalet', (await today(page)) === 'chalet-1');
  await geste(page);
  R.check('5. pas « famille » payé une fois : 3 Énergie ; 1 habitant', !!(await L.waitFor(() => paye(srv, 'famille', { energy: 3 }) && srv.game()?.habitants === 1, 5000)), JSON.stringify(pasKeys(srv)));
  R.check('5. annoncé : « Les cinq premiers pas sont faits. »', !!(await L.waitFor(async () => (await L.said(page)).some((x) => norm(x.text).includes('Les cinq premiers pas sont faits.')), 3000)));
  await closeBat(page);
  b = await L.waitFor(async () => { const x = await bandeau(page); return /quête faite/.test(x.semaine) ? x : null; }, 3000);
  R.check('après les cinq : la semaine compte les vraies quêtes, rang « encore 2 habitants »', b && b.semaine === '1 quête faite sur 1 jour' && b.rang === 'encore 2 habitants', JSON.stringify(b || await bandeau(page)));
  R.check('après les cinq : rien d’ouvert, « Aujourd’hui » propose d’ajouter une vraie tâche, sans texte coupé', b && b.today === 'Ajoute une vraie tâche' && !b.coupe, JSON.stringify(b));
  await shot(page, '17-premiers-pas');
  // le compteur rattrape le serveur quand l'animation de la famille est passée
  const hud = async () => Promise.all(['energie', 'materiaux', 'nourriture', 'habitants'].map((n) => L.resValue(page, n)));
  const bas = (n) => Math.floor(Math.round(n * 10) / 10); // la barre montre ce que le joueur possède en nombre entier, vers le bas
  const serveur = () => { const g = srv.game(); return [bas(g.resources.energy), bas(g.resources.materials), bas(g.resources.food), g.habitants]; };
  R.check('les compteurs rattrapent le serveur (Énergie, Matériaux, Nourriture, Habitants)', await L.waitFor(async () => JSON.stringify(await hud()) === JSON.stringify(serveur()), 8000), JSON.stringify([await hud(), serveur()]));

  // ───── une seule fois chacun, jamais dans tasks.json, rien de repayé au rechargement
  const keys = pasKeys(srv);
  R.check('registre : les cinq clés pas:{id}, une fois chacune', keys.length === 5 && PAS.every((id) => keys.includes(`pas:${id}`)), JSON.stringify(keys));
  const tasks = srv.readTasks();
  R.check('tasks.json : seulement la tâche ajoutée (aucun premier pas)', tasks.length === 1 && tasks[0].task === TITRE && !JSON.stringify(tasks).includes('Premier'), JSON.stringify(tasks.map((x) => x.task)));
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(1500);
  R.check('rechargement : rien de repayé', pasKeys(srv).length === 5);
  R.check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
}, {
  tasks: [],
  game: (core) => ({ ...L.quietState(core, MONDAY), resources: { energy: 10, materials: 20, food: 12 } }),
});
