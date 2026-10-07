// 27. Bandeau d'objectifs (bible §10) : toujours visible sous la voie d'annonce, lisible aux trois largeurs (aucun
// texte coupé, police d'au moins 12 px, cibles de 44 px), sans défilement horizontal, compact à 390 (la carte reste
// dominante) où « Voir tous les objectifs » le déplie en carte ; à partir de 700 px, les quatre objectifs sur la
// rangée. Mis à jour après un geste (chalet rebâti, quête faite). L'hiver, l'objectif de saison est « à venir » et le
// pas « semer » passe par l'atelier et la petite serre (texte le plus long du geste, lu en entier).
// Dates fixes (un mardi d'octobre, un mardi de décembre). Titres fictifs.
const L = require('./lib.cjs');
const OCT = new Date('2026-10-20T14:00:00Z');
const DEC = new Date('2026-12-08T14:00:00Z');
const TASKS = [
  { id: 'b1', task: 'Ranger le garde-manger', domain: 'Maison', difficulty: 2, length: 2, priority: 8, status: 'todo', created: '2026-10-15' },
  { id: 'b2', task: 'Arroser les plates-bandes', domain: 'Terrain', difficulty: 2, length: 2, priority: 5, status: 'todo', created: '2026-10-16' },
];

/** Mesures du bandeau : textes, cases visibles, textes coupés, tailles de police, cibles, place prise à l'écran. */
const lire = (page) => page.evaluate(() => {
  const root = document.getElementById('bandeau');
  const tx = (sel) => (root.querySelector(sel)?.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const shown = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const r = root.getBoundingClientRect();
  const lane = document.querySelector('.announce-lane')?.getBoundingClientRect();
  const hud = document.querySelector('.hud')?.getBoundingClientRect();
  // textes visibles du bandeau : coupés (points de suspension ou lignes de trop) ? police ?
  const coupes = [], petits = [];
  for (const e of root.querySelectorAll('.bandeau-label, .bandeau-value, #bandeau-today, .bandeau-pas, .bandeau-saison-detail')) {
    if (!shown(e) || !e.textContent.trim()) continue;
    if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) coupes.push(e.textContent.trim().slice(0, 40));
    if (parseFloat(getComputedStyle(e).fontSize) < 12) petits.push(e.textContent.trim().slice(0, 40));
  }
  const box = (sel) => { const e = root.querySelector(sel); if (!shown(e)) return null; const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
  return {
    today: tx('#bandeau-today'), semaine: tx('#bandeau-semaine'), saison: tx('#bandeau-saison'), rangNom: tx('#bandeau-rang-nom'), rang: tx('#bandeau-rang'),
    label: root.querySelector('.bandeau-today').getAttribute('aria-label').replace(/\u00a0/g, ' '),
    titre: document.getElementById(root.getAttribute('aria-labelledby'))?.textContent.trim(),
    visibles: ['.bandeau-today', '.bandeau-semaine', '.bandeau-saison', '.bandeau-rang', '.bandeau-more'].filter((s) => shown(root.querySelector(s))),
    lit: root.dataset.lit, open: root.dataset.open === 'true', expanded: root.querySelector('.bandeau-more').getAttribute('aria-expanded'),
    coupes, petits, today44: box('.bandeau-today'), more44: box('.bandeau-more'),
    rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) },
    sousAnnonce: lane ? r.top >= lane.bottom - 1 : true, sousHud: hud ? r.top >= hud.bottom : true,
    part: (r.width * r.height) / (innerWidth * innerHeight),
    dansEcran: r.left >= 0 && r.right <= innerWidth + 0.5,
    barre: !!root.querySelector('.bandeau-bar > i') && shown(root.querySelector('.bandeau-bar')),
    pas: [...root.querySelectorAll('.bandeau-pas')].map((li) => ({ fait: li.classList.contains('is-done'), now: li.classList.contains('is-now'), tx: li.textContent.replace(/\s+/g, ' ').trim() })),
    deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});

L.runScenario('27. bandeau d’objectifs : visible, lisible, compact à 390, suit les gestes', async ({ R, srv, newPage, tag, shot, core }) => {
  const { page } = await newPage();
  await page.clock.install({ time: OCT });
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page, 1200);
  await page.waitForTimeout(500);
  const compact = tag < 700;

  let b = await lire(page);
  R.check('visible et allumé, sous la voie d’annonce, dans l’écran', b.lit === 'true' && b.visibles.includes('.bandeau-today') && b.sousAnnonce && b.sousHud && b.dansEcran, JSON.stringify(b.rect));
  R.check('titre de la région pour les lecteurs d’écran : « Objectifs »', b.titre === 'Objectifs', b.titre);
  R.check('contenu : Aujourd’hui « Rebâtis un chalet », premiers pas 0 sur 5, grenier 5 sur 20, prochain rang Hameau', b.today === 'Rebâtis un chalet' && b.semaine === 'Premiers pas : 0 sur 5' && b.saison === 'Grenier : 5 sur 20' && b.rangNom === 'Hameau' && b.rang === 'encore 3 habitants', JSON.stringify(b));
  R.check('« Aujourd’hui » se lit en entier : « Aujourd’hui : Rebâtis un chalet »', b.label === 'Aujourd’hui : Rebâtis un chalet', b.label);
  R.check('la barre du rang est doublée par le texte « encore 3 habitants »', b.barre && b.rang === 'encore 3 habitants');
  R.check('aucun texte coupé, aucune police sous 12 px', !b.coupes.length && !b.petits.length, JSON.stringify([b.coupes, b.petits]));
  R.check('cible « Aujourd’hui » de 44 px de haut au moins', b.today44 && b.today44[1] >= 44, JSON.stringify(b.today44));
  R.check('aucun défilement horizontal', !b.deborde);
  if (compact) {
    R.check('390 : compact (Aujourd’hui, prochain rang, déplier), au plus 48 px de haut et 7 % de l’écran', b.visibles.join() === '.bandeau-today,.bandeau-rang,.bandeau-more' && b.rect.h <= 48 && b.part <= 0.07, JSON.stringify([b.visibles, b.rect.h, b.part.toFixed(3)]));
    R.check('390 : « Voir tous les objectifs » fait 44 × 44 px au moins', b.more44 && b.more44[0] >= 44 && b.more44[1] >= 44, JSON.stringify(b.more44));
  } else {
    R.check(`${tag} : les quatre objectifs sur la rangée, rien à déplier, au plus 60 px de haut`, b.visibles.join() === '.bandeau-today,.bandeau-semaine,.bandeau-saison,.bandeau-rang' && b.rect.h <= 60, JSON.stringify([b.visibles, b.rect.h]));
  }
  await shot(page, '27-bandeau');

  // ───── 390 : la carte dépliée
  if (compact) {
    await page.click('.bandeau-more');
    await page.waitForTimeout(350);
    b = await lire(page);
    R.check('390 déplié : les quatre objectifs, aria-expanded vrai', b.open && b.expanded === 'true' && b.visibles.join() === '.bandeau-today,.bandeau-semaine,.bandeau-saison,.bandeau-rang,.bandeau-more', JSON.stringify(b.visibles));
    R.check('390 déplié : les cinq premiers pas, le premier « maintenant », sans texte coupé ni défilement', b.pas.length === 5 && b.pas[0].now && !b.pas.some((p) => p.fait) && !b.coupes.length && !b.deborde && b.dansEcran, JSON.stringify([b.pas, b.coupes]));
    await shot(page, '27-bandeau-deplie');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    b = await lire(page);
    R.check('Échap replie la carte', !b.open && b.expanded === 'false', JSON.stringify([b.open, b.expanded]));
  }

  // ───── après un geste : chalet rebâti depuis « Aujourd'hui »
  await page.click('.bandeau-today');
  R.check('« Aujourd’hui » ouvre la fiche du premier chalet', await L.waitFor(() => page.evaluate(() => { const d = document.getElementById('dlg-batiment'); return d.open && d.dataset.batId === 'chalet-1'; }), 3000));
  await page.click('#dlg-batiment [data-action="bat-geste"]');
  await L.waitFor(() => srv.ledger().some((e) => e.key === 'pas:chalet'), 5000);
  await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
  b = await L.waitFor(async () => { const x = await lire(page); return x.semaine === 'Premiers pas : 2 sur 5' ? x : null; }, 4000);
  R.check('chalet rebâti : le bandeau suit (« Termine une vraie tâche », 2 sur 5 : la liste avait déjà des tâches)', b && b.today === 'Termine une vraie tâche', JSON.stringify(b || await lire(page)));
  R.check('… et rien n’est coupé ni ne déborde', b && !b.coupes.length && !b.deborde, JSON.stringify(b && b.coupes));

  // ───── après un autre geste : une quête faite
  await page.click('#fil-quest [data-action="complete"]');
  b = await L.waitFor(async () => { const x = await lire(page); return x.semaine === 'Premiers pas : 3 sur 5' ? x : null; }, 5000);
  R.check('quête faite : le bandeau suit (« Sème le vieux potager », 3 sur 5)', b && b.today === 'Sème le vieux potager', JSON.stringify(b || await lire(page)));
  if (compact) {
    await page.click('.bandeau-more');
    await page.waitForTimeout(350);
    b = await lire(page);
    R.check('390 déplié : trois pas cochés, « Semer ta première parcelle » maintenant', b.pas.filter((p) => p.fait).length === 3 && /Semer ta première parcelle/.test(b.pas.find((p) => p.now)?.tx || ''), JSON.stringify(b.pas));
    await page.click('.bandeau-more');
  }
  await L.closeWelcome(page, 600);

  // ───── l'hiver : l'objectif de saison compte les récoltes de serre (lot H) ; sans serre, il dit d'en bâtir une ; trois
  // pas faits, semer passe par l'atelier (pas de tempête pendant les premiers pas)
  const fait = core.gameDay(DEC);
  const hiver = { ...L.quietState(core, DEC), batiments: [{ id: 'chalet-1', type: 'chalet' }], premiersPas: { chalet: fait, tache: fait, terminer: fait } };
  const srv2 = await L.startServer({ tasks: TASKS, game: hiver });
  try {
    const { page: p2 } = await newPage();
    await p2.clock.install({ time: DEC });
    await p2.goto(srv2.url);
    await L.ready(p2);
    await L.closeWelcome(p2, 1200);
    const h = await lire(p2);
    R.check('hiver : objectif d’hiver sans serre, « Bâtir une petite serre », rien de bloquant', h.saison === 'Bâtir une petite serre', h.saison);
    R.check('hiver : aucune alerte de tempête pendant les premiers pas', await p2.evaluate(() => document.getElementById('bandeau-alerte').hidden && !document.getElementById('bandeau').hasAttribute('data-alerte')));
    R.check('hiver : semer passe par l’atelier (« Bâtis l’atelier, pour la serre »), 3 sur 5', h.today === 'Bâtis l’atelier, pour la serre' && h.semaine === 'Premiers pas : 3 sur 5', JSON.stringify([h.today, h.semaine]));
    R.check('hiver : rien de coupé, aucun défilement horizontal', !h.coupes.length && !h.deborde, JSON.stringify(h.coupes));
    if (!compact) await shot(p2, '27-bandeau-hiver');
  } finally {
    srv2.stop();
  }
}, {
  tasks: TASKS,
  game: (core) => L.quietState(core, OCT),
});
