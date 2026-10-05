// 22. Côte à côte : « Je m'y mets » lance un simple relevé du temps, Fanal travaille avec toi (ligne discrète à la
// minute, une annonce au début et une à la fin), Pause garde le total (rechargement compris), Fait au-delà de 2 fois
// la durée estimée propose de découper la quête, le bilan montre le temps relevé ; rien n'est gagné. Monde : Fanal
// va une fois vers le secteur de la quête, y reste immobile (0 image d'animation au repos), rentre à la fin ;
// mouvement réduit respecté ; séance oubliée arrêtée à 3 h, annoncée dans la feuille du dessus. Titres fictifs.
const L = require('./lib.cjs');

// prochain mardi (ou aujourd'hui), 10 h à Montréal : toute la séance tient dans la même journée et la même semaine
function nextTuesday() {
  const d = new Date();
  d.setUTCHours(14, 0, 0, 0);
  while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const TUESDAY = nextTuesday();
const ymd = (n) => new Date(TUESDAY.getTime() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  // L2 = 15 min estimées : la découpe est proposée au-delà de 30 min relevées
  { id: 'c1', task: 'Ranger la remise', domain: 'Terrain', difficulty: 3, length: 2, priority: 10, status: 'todo', created: ymd(-2),
    recurrence: { every: 'week', interval: 1 }, occurrence: 1, occurrenceSince: ymd(-2) },
  { id: 'c2', task: 'Classer les papiers', domain: 'Administratif', difficulty: 2, length: 3, priority: 4, status: 'todo', created: ymd(-3),
    steps: [{ id: 's1', label: 'Trier', done: false }, { id: 's2', label: 'Ranger', done: false }] },
  { id: 'c3', task: 'Laver les vitres', domain: 'Maison', difficulty: 4, length: 4, priority: 3, status: 'todo', created: ymd(-4) },
];

// journal des animations lancées sur Fanal (marche = translate) et compteur d'images d'animation
const PROBES = () => {
  window.__raf = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__raf++; return raf(cb); };
  window.__walks = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (kf, opts) {
    if (this.classList && this.classList.contains('m-fanal')) window.__walks.push({ translate: JSON.stringify(kf).includes('translate'), opacity: JSON.stringify(kf).includes('opacity') });
    return animate.call(this, kf, opts);
  };
};
const fanal = (page) => page.evaluate(() => {
  const e = document.querySelector('.ow-ent.m-fanal');
  return e ? { left: e.style.left, top: e.style.top, pose: e.dataset.pose || null, label: e.getAttribute('aria-label') || '', running: e.getAnimations().filter((a) => a.playState === 'running').length } : null;
});
// la ligne de Fanal prend la place de la raison (la ligne de méta reste sur une ligne : « Pause » visible, panneau replié)
const metaDoing = (page) => page.evaluate(() => document.querySelector('#fil-quest .fil-reason > span').textContent.trim());
const offer = (page) => page.evaluate(() => {
  const o = document.getElementById('offer');
  const r = (s) => { const b = o.querySelector(s); if (!b) return null; const q = b.getBoundingClientRect(); return { w: q.width, h: q.height }; };
  return { shown: !o.hidden && o.getBoundingClientRect().height > 0, text: o.textContent.replace(/\s+/g, ' ').trim(), task: o.dataset.taskId || '', split: r('[data-action="split"]'), close: r('[data-action="offer-close"]') };
});
const lastSaid = (list) => (list.length ? list[list.length - 1].text : '');
const BANNED = /tu n’as pas|tu n'as pas|manqué|négligé|en retard/i;

L.runScenario('22. côte à côte', async ({ R, srv, newPage, shot }) => {
  const { page } = await newPage();
  await page.clock.install({ time: TUESDAY });
  await page.addInitScript(PROBES);
  await page.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  R.check('le vrai monde est en place', await L.waitFor(() => page.evaluate(() => document.querySelector('.world-slot').dataset.world === 'live' && !!document.querySelector('.ow-ent.m-fanal')), 6000));
  await page.waitForTimeout(800);
  R.check('la quête n° 1 est « Ranger la remise »', await page.getAttribute('#fil-quest', 'data-task-id') === 'c1');
  const home = await fanal(page);
  const e0 = await L.resValue(page, 'energie');
  const ledger0 = srv.ledger().length;

  // ───── « Je m'y mets »
  await L.said(page, true);
  await page.click('#fil-quest [data-action="start"]');
  R.check('la séance est enregistrée dans l’état du jeu', await L.waitFor(() => srv.game()?.coteACote?.current?.taskId === 'c1', 5000), JSON.stringify(srv.game()?.coteACote));
  const t1 = srv.readTasks().find((t) => t.id === 'c1');
  R.check('la vraie tâche ne porte aucun temps (seulement l’épingle et le gel)', !Object.keys(t1).some((k) => /seance|releve|minute|cote/i.test(k)) && !!t1.startedAt, Object.keys(t1).join(','));
  R.check('début : une annonce « Fanal travaille avec toi »', await L.waitFor(async () => /Quête en cours.*Fanal travaille avec toi\./.test(lastSaid(await L.said(page))), 2000), lastSaid(await L.said(page)));
  R.check('ligne discrète : « Fanal travaille avec toi »', await metaDoing(page) === 'Fanal travaille avec toi', await metaDoing(page));
  const start = await L.rect(page, '#fil-quest [data-action="start"]');
  R.check('« Pause » : cible d’au moins 44 px', start.h >= 44 && start.w >= 44, JSON.stringify(start));
  R.check('« Pause » remplace « Je m’y mets »', /Pause/.test(await page.textContent('#fil-quest [data-action="start"]')));
  await L.waitFor(async () => { const f = await fanal(page); return f && f.pose && !f.running; }, 4000);
  const work = await fanal(page);
  R.check('Fanal est allé travailler : autre place, pose de travail', work.pose && (work.left !== home.left || work.top !== home.top), `${JSON.stringify(home)} → ${JSON.stringify(work)}`);
  R.check('Fanal y est allé en une seule marche', (await page.evaluate(() => window.__walks.filter((w) => w.translate).length)) === 1);
  R.check('Fanal le dit à qui le touche', /au travail avec toi/.test(work.label), work.label);
  await shot(page, '22-seance');

  // ───── 25 minutes plus tard
  await L.said(page, true);
  await page.clock.fastForward('25:00');
  await page.waitForTimeout(600);
  R.check('25 min plus tard : « Fanal travaille avec toi · 25 min »', /^Fanal travaille avec toi · 25\smin$/.test(await metaDoing(page)), await metaDoing(page));
  R.check('aucune annonce pendant la séance (rien ne fait tic-tac)', !(await L.said(page)).some((s) => /Fanal|min/.test(s.text)), JSON.stringify(await L.said(page)));
  const still = await fanal(page);
  R.check('Fanal reste à sa place de travail, immobile', still.left === work.left && still.top === work.top && still.pose === work.pose && !still.running, JSON.stringify(still));
  const r1 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(2500);
  const r2 = await page.evaluate(() => window.__raf);
  R.check('pendant la séance, au repos : 0 requestAnimationFrame', r2 === r1, `${r1} → ${r2}`);
  R.check('aucun gain, aucune entrée au registre pendant la séance', (await L.resValue(page, 'energie')) === e0 && srv.ledger().length === ledger0, `${e0} / ${srv.ledger().length - ledger0} entrée(s)`);

  // ───── Pause
  await page.click('#fil-quest [data-action="start"]');
  R.check('Pause : le total est gardé (25 min)', await L.waitFor(() => { const r = (srv.game()?.coteACote?.totals || [])[0]; return r && r.minutes >= 25 && r.minutes < 27 && !srv.game().coteACote.current; }, 5000), JSON.stringify(srv.game()?.coteACote));
  R.check('fin : une annonce « Temps passé avec Fanal : 25 min »', await L.waitFor(async () => /Temps passé avec Fanal\s?:\s25\smin\./.test(lastSaid(await L.said(page))), 2000), lastSaid(await L.said(page)));
  R.check('sous 2 fois l’estimation : aucune proposition de découpage', !(await offer(page)).shown);
  R.check('Fanal rentre chez lui', await L.waitFor(async () => { const f = await fanal(page); return f && !f.pose && f.left === home.left && f.top === home.top && !f.running; }, 4000), JSON.stringify(await fanal(page)));
  R.check('aucun gain après la Pause', (await L.resValue(page, 'energie')) === e0 && srv.ledger().length === ledger0);

  // ───── rechargement, deuxième séance, puis Fait
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(800);
  R.check('après rechargement, le total est toujours là', ((srv.game()?.coteACote?.totals || [])[0] || {}).minutes >= 25);
  await page.click('#fil-quest [data-action="start"]');
  await L.waitFor(() => srv.game()?.coteACote?.current?.taskId === 'c1', 5000);
  await page.clock.fastForward('10:00');
  await page.waitForTimeout(400);
  // panneau ouvert : à 390 px, une quête récurrente avec échéance a déjà « Fait » sous le bord, panneau replié
  // (ligne de méta sur deux lignes ; constaté aussi sur la version commitée avant ce mode)
  await L.openPanel(page);
  await L.said(page, true);
  const raf0 = await page.evaluate(() => window.__raf);
  await page.click('#fil-quest [data-action="complete"]');
  R.check('Fait : la quête est comptée (gain normal de la quête)', await L.waitFor(() => srv.ledger().some((e) => e.type === 'reward' && e.taskId === 'c1'), 5000));
  const rel = await L.waitFor(() => (srv.game()?.coteACote?.totals || []).find((r) => r.taskId === 'c1' && r.occurrence === 1 && r.doneOn), 5000);
  R.check('relevé de l’occurrence : 35 min (25 + 10), fin notée', rel && rel.minutes >= 35 && rel.minutes < 38, JSON.stringify(rel));
  R.check('le registre n’a reçu que les gains de la quête', srv.ledger().slice(ledger0).every((e) => e.taskId === 'c1' && ['reward', 'bonus'].includes(e.type)), JSON.stringify(srv.ledger().slice(ledger0).map((e) => e.type)));
  R.check('plus de 2 fois l’estimation : la découpe est proposée', await L.waitFor(async () => (await offer(page)).shown, 3000));
  const o = await offer(page);
  R.check('proposition douce, qui nomme la quête', /«\s?Ranger la remise\s?» demande plus de temps que prévu\. La découper en étapes\?/.test(o.text) && !BANNED.test(o.text) && o.task === 'c1', o.text);
  R.check('« Découper » et « Fermer » : cibles d’au moins 44 px', o.split && o.close && o.split.h >= 44 && o.close.h >= 44 && o.close.w >= 44, JSON.stringify(o));
  R.check('fin annoncée avec la proposition', await L.waitFor(async () => (await L.said(page)).some((s) => /Temps passé avec Fanal\s?:\s10\smin\./.test(s.text) && /découper en étapes/.test(s.text)), 3000), JSON.stringify(await L.said(page)));
  await page.waitForTimeout(1500);
  R.check('la sonde compte bien les images d’animation (le fil de lumière en demande)', (await page.evaluate(() => window.__raf)) > raf0);
  await shot(page, '22-decoupage');
  await page.click('#offer [data-action="split"]');
  R.check('« Découper » ouvre l’éditeur d’étapes de la quête', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-fiche').open && document.activeElement && document.activeElement.id === 'fiche-step-new' && document.getElementById('dlg-fiche').dataset.taskId === 'c1'), 3000));
  R.check('la proposition se retire', !(await offer(page)).shown);
  await page.click('#dlg-fiche [data-close]');
  await page.waitForTimeout(500);

  // ───── bilan de la semaine
  await L.openPanel(page);
  await page.click('[data-action="open-review"]');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-review').open), 3000);
  await page.waitForTimeout(400);
  const bilan = await page.evaluate(() => document.getElementById('dlg-review').textContent.replace(/\s+/g, ' ').trim());
  R.check('bilan : temps passé avec Fanal, à côté des heures estimées', /environ 0,3\sh de travail estimé/.test(bilan) && /Temps passé avec Fanal\s?:\s3[5-7]\smin\./.test(bilan), bilan.slice(0, 260));
  R.check('bilan : relevé du domaine (« 35 min avec Fanal »)', /3[5-7]\smin avec Fanal/.test(bilan), bilan.slice(0, 300));
  R.check('bilan : aucune expression bannie', !BANNED.test(bilan));
  await shot(page, '22-bilan');
  await page.click('#dlg-review .sheet-foot [data-close]');
  await page.waitForTimeout(500);

  // ───── séance oubliée : arrêtée à 3 h, annoncée dans la feuille du dessus
  await page.click('#fil-quest [data-action="start"]'); // l'occurrence suivante de « Ranger la remise »
  await L.waitFor(() => srv.game()?.coteACote?.current?.occurrence === 2, 5000);
  await page.click('#quest-list > li[data-task-id="c2"] [data-action="open"]');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-fiche').open), 3000);
  await page.waitForTimeout(400);
  await page.clock.fastForward('04:00:00');
  await page.waitForTimeout(400);
  await page.click('#dlg-fiche .step [data-action="step-toggle"]');
  const forgot = await L.waitFor(() => { const g = srv.game()?.coteACote; const r = g && g.totals.find((x) => x.taskId === 'c1' && x.occurrence === 2); return !g.current && r && r.capped ? r : null; }, 5000);
  R.check('séance oubliée : arrêtée et plafonnée à 3 h', forgot && forgot.minutes === 180, JSON.stringify(srv.game()?.coteACote));
  await page.waitForTimeout(600);
  const v = await L.voice(page);
  R.check('annonce dans la feuille ouverte, reçue par le lecteur d’écran', v.sheet === 'dlg-fiche' && v.ignored === false && /Fanal s’est arrêté après 3\sh/.test(v.text), JSON.stringify(v));
  await page.click('#dlg-fiche [data-close]');
  R.check('Fanal est rentré', await L.waitFor(async () => { const f = await fanal(page); return f && !f.pose && f.left === home.left; }, 4000));

  // ───── mouvement réduit : Fanal change de place sans marcher
  const { page: pr } = await newPage({}, { reducedMotion: 'reduce' });
  await pr.clock.install({ time: new Date(TUESDAY.getTime() + 5 * 3600000) });
  await pr.addInitScript(PROBES);
  await pr.goto(srv.url);
  await L.ready(pr);
  await L.waitFor(() => pr.evaluate(() => !!document.querySelector('.ow-ent.m-fanal')), 6000);
  await pr.waitForTimeout(600);
  await L.openPanel(pr); // quête épinglée sans séance : « Pause » sous le bord à 390 px, panneau replié (déjà le cas avant)
  const homeR = await fanal(pr);
  // la séance oubliée est arrêtée, la quête reste épinglée (la vraie tâche n'est pas touchée) : Pause, puis « Je m'y mets »
  R.check('après la séance oubliée, la quête reste épinglée', await pr.getAttribute('#fil-quest [data-action="start"]', 'aria-pressed') === 'true');
  await pr.click('#fil-quest [data-action="start"]');
  await pr.waitForTimeout(500);
  await pr.click('#fil-quest [data-action="start"]');
  R.check('mouvement réduit : Fanal est à sa place de travail en moins de 600 ms', await L.waitFor(async () => { const f = await fanal(pr); return f && f.pose && f.left !== homeR.left; }, 600, 50));
  R.check('mouvement réduit : aucune marche, un fondu seulement', await pr.evaluate(() => !window.__walks.some((w) => w.translate)), JSON.stringify(await pr.evaluate(() => window.__walks)));
  await pr.waitForTimeout(400);
  await pr.click('#fil-quest [data-action="start"]');
  R.check('mouvement réduit : Fanal rentre aussitôt', await L.waitFor(async () => { const f = await fanal(pr); return f && !f.pose && f.left === homeR.left; }, 800, 50));
}, {
  tasks: TASKS,
  game: (core) => L.quietState(core, TUESDAY),
});
