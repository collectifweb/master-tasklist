// 37. Les imprévus (lot I), à l'écran.
//   Partie A (un mercredi de septembre, version d'essai, dégâts posés d'avance) :
//   - carte : marque braise sur l'éolienne et deux parcelles, aucune sur la troisième ; caisse de poissons, pile de bois et
//     orignal du jour visibles, pas d'aurore ; la carte en liste dit les trois et l'état de chaque bâtiment touché ;
//   - éolienne sans Matériaux : « Réparer · 4 Matériaux » verrouillé, la raison écrite ; un toucher ne dépense rien et la
//     raison est lue ; boutons de 44 px, rien ne déborde de la fiche ;
//   - parcelle mûre et ours : un double toucher dont le second tombe sur « Récolter » (ouvert) ne fait que chasser l'ours ;
//     la phrase lue le dit une fois, Fanal le salue, la fiche dit « Ours chassé aujourd'hui. » ; la récolte, ensuite, est
//     entière ;
//   - une quête Maison payée répare l'éolienne, gratuitement, et la phrase lue le dit ; « Remballer » cette quête rouvre la
//     panne (la phrase lue le dit, la marque revient) ;
//   - « Jour suivant » : le gel se règle seul, sans rien écrire ; marque, bloc de la fiche et objets du jour s'en vont.
//   Partie B (semaine tirée par le calendrier : une aurore, puis une panne ; version d'essai) :
//   - la veille, rien ; « Jour suivant » : l'aurore paraît, payée une fois au registre, racontée par Fanal une fois par
//     appareil (pas au rechargement), lue, dite par la carte en liste ; elle ondule, sauf en mouvement réduit ;
//   - jusqu'au jour de la panne : marque sur l'éolienne, son nom le dit, Fanal et la phrase lue aussi (prix, jours) ;
//   - deux appareils : le second répare au clavier (le focus reste sur la ligne cochée), le premier, pas encore relu,
//     répare aussi : le serveur refuse, l'appareil se remet à jour et dit pourquoi ; payé une fois.
//   Partie C (première largeur seulement) : retour après six jours d'absence, le jour d'une panne : la reprise la change en
//   bon imprévu ; aucun dégât, deux bons au registre, aucune marque.
// Données fictives seulement. Chaque geste attend l'écriture du serveur avant de la vérifier.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const REPLIQUES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'), 'utf8'));
const variantes = (sit) => REPLIQUES.situations[sit].variantes.map((v) => sp(v.texte));
const TOUS_IMPREVUS = Object.keys(REPLIQUES.situations).filter((k) => k.startsWith('imprevu.')).flatMap(variantes);
const at = (day, h = 14) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`);

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const { addDays, weekStart, calendrierImprevus, isTruce } = core;

  // ───── dates : en septembre prochain (potager ouvert, gel possible), jamais dans le passé
  const now = new Date();
  let sept = new Date(Date.UTC(now.getUTCFullYear(), 8, 1, 14));
  if (sept <= now) sept = new Date(Date.UTC(now.getUTCFullYear() + 1, 8, 1, 14));
  const SEPT = sept.toISOString().slice(0, 10);

  // Partie B : la première semaine dont le premier créneau (pas un lundi) donne l'aurore et le second une panne
  const villageB = (day, over = {}) => {
    const g = L.quietState(core, at(day));
    g.resources = { energy: 20, materials: 10, food: 5 };
    g.habitants = 2;
    g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, addDays(day, -20)]));
    g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'eolienne-1', type: 'eolienne' }];
    g.lastSeenDay = addDays(day, -1);
    return Object.assign(g, over);
  };
  let S1 = null, S2 = null;
  for (let k = 0; k < 104 && !S1; k++) {
    const lundi = addDays(weekStart(SEPT), 7 * k);
    const [a, b] = calendrierImprevus(lundi).creneaux;
    if (a.jour === lundi || b.nature !== 'mauvais' || isTruce(b.jour)) continue;
    const r1 = core.advanceTime([], villageB(a.jour), [], { gameRevision: 1 }, at(a.jour).toISOString());
    if (!r1.events.some((e) => e.type === 'imprevu' && e.imprevu === 'aurore')) continue;
    const r2 = core.advanceTime([], { ...r1.game, lastSeenDay: addDays(b.jour, -1) }, r1.entries, { gameRevision: 2 }, at(b.jour).toISOString());
    if (r2.events.some((e) => e.type === 'imprevu' && e.imprevu === 'panne')) [S1, S2] = [a.jour, b.jour];
  }
  if (!S1) throw new Error('aucune semaine « aurore puis panne » dans les deux ans');
  const VEILLE = addDays(S1, -1);

  // Partie A : le premier mercredi à partir du 15 septembre ; les créneaux de sa semaine sont déjà tirés (rien ne tombe)
  let DA = addDays(SEPT, 14);
  while (at(DA).getUTCDay() !== 3) DA = addDays(DA, 1);
  const creneauxA = calendrierImprevus(DA).creneaux.map((c) => c.jour);
  const TASKS_A = [{ id: 'a1', task: 'Ranger l’atelier', domain: 'Maison', difficulty: 2, length: 2, priority: 8, status: 'todo', created: addDays(DA, -3) }];
  const TASKS_B = [{ id: 'b1', task: 'Trier les papiers', domain: 'Administratif', difficulty: 2, length: 2, priority: 6, status: 'todo', created: addDays(VEILLE, -3) }];
  const paye = (day) => ({ key: `reward:x-${day}:1`, at: at(day).toISOString(), day, type: 'reward', taskId: `x-${day}`, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });
  function etatA() {
    const g = villageB(DA, { resources: { energy: 10, materials: 0, food: 5 } });
    g.batiments.push(...['parcelle-1', 'parcelle-2', 'parcelle-3'].map((id) => ({ id, type: 'parcelle' })));
    g.parcelles = [{ id: 'parcelle-1', semeLe: addDays(DA, -10) }, { id: 'parcelle-2', semeLe: addDays(DA, -1) }, { id: 'parcelle-3', semeLe: addDays(DA, -1) }];
    g.degats = [
      { id: `panne:${addDays(DA, -1)}`, type: 'panne', cible: 'eolienne-1', le: addDays(DA, -1), jusqua: addDays(DA, 2) },
      { id: `ours:${DA}`, type: 'ours', cible: 'parcelle-1', le: DA, jusqua: addDays(DA, 3) },
      { id: `gel:${DA}`, type: 'gel', cible: 'parcelle-2', le: DA, jusqua: addDays(DA, 1), semeLe: addDays(DA, -1) },
    ];
    return g;
  }
  const ledgerA = () => [
    ...[1, 2, 3, 4, 5].map((k) => paye(addDays(DA, -10 + k))), // parcelle-1 mûre : cinq jours travaillés depuis son semis
    // les deux créneaux de la semaine, déjà tirés (pêche et trouvaille), et un orignal : les trois montrés aujourd'hui
    { key: `imprevu:${creneauxA[0]}`, at: at(DA).toISOString(), day: DA, type: 'imprevu', imprevu: 'peche', pe: 0, energy: 0, materials: 0 },
    { key: `imprevu:${creneauxA[1]}`, at: at(DA).toISOString(), day: DA, type: 'imprevu', imprevu: 'trouvaille', pe: 0, energy: 0, materials: 0 },
    { key: `imprevu:${addDays(weekStart(DA), -3)}`, at: at(DA).toISOString(), day: DA, type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0 },
  ];

  // ───── lectures de l'écran
  const bulle = (page) => page.evaluate(() => { const e = document.getElementById('speech'); return e.hidden ? null : e.querySelector('.speech-text')?.textContent || null; });
  // vu = rendu (checkVisibility) et d'une taille ; en tablette et en bureau, aussi dans la vue de la carte (en compact, le
  // cadrage de départ montre le cœur du village : l'éolienne et le potager sont au bord, à un glissé)
  const vus = (page, sels, compact) => page.evaluate(([sels, compact]) => {
    const sc = document.querySelector('.ow-scroller').getBoundingClientRect();
    return Object.fromEntries(sels.map((s) => {
      const e = document.querySelector(s);
      if (!e) return [s, false];
      const r = e.getBoundingClientRect();
      const dessin = e.checkVisibility() && r.height > 0 && r.width > 0;
      return [s, dessin && (compact || (r.bottom > sc.top && r.top < sc.bottom && r.right > sc.left && r.left < sc.right))];
    }));
  }, [sels, compact]);
  const marque = (id) => `.ow-ent[data-id="${id}"] .ow-mark`;
  const objet = (id) => `.ow-ent[data-id="imprevu-${id}"]`;
  const nomCarte = (page, id) => page.evaluate((id) => document.querySelector(`.ow-ent[data-id="${id}"]`)?.getAttribute('aria-label') || '', id);
  const fiche = (page) => page.evaluate(() => {
    const d = document.getElementById('dlg-batiment');
    const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const r = d.getBoundingClientRect();
    const blk = d.querySelector('.degat');
    const go = blk?.querySelector('.degat-go');
    const gr = go && go.getBoundingClientRect();
    const foot = d.querySelector('.bat-foot [data-action="bat-geste"]');
    return {
      open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '', now: s(d.querySelector('#bat-now')?.textContent),
      debord: [...d.querySelectorAll('.degat *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.left < r.left - 1 || b.right > r.right + 1); }).map((e) => e.className.baseVal ?? e.className),
      degat: blk ? {
        type: blk.dataset.degat, etat: blk.dataset.etat, vu: blk.checkVisibility() && blk.getBoundingClientRect().height > 0,
        titre: s(blk.querySelector('.degat-titre')?.textContent), effet: s(blk.querySelector('.degat-effet')?.textContent),
        go: go ? { text: `${s(go.querySelector('span').textContent)} · ${s(go.querySelector('.degat-prix').textContent)}`, label: go.getAttribute('aria-label'), off: go.getAttribute('aria-disabled') === 'true', h: gr.height, w: gr.width } : null,
        raison: s(blk.querySelector('.degat-raison')?.textContent), voies: [...blk.querySelectorAll('.degat-voies li')].map((li) => s(li.textContent)),
        fait: s(blk.querySelector('.degat-fait')?.textContent),
      } : null,
      foot: foot ? { geste: foot.dataset.geste, off: foot.getAttribute('aria-disabled') === 'true' } : null,
    };
  });
  async function carte(page) {
    // panneau ouvert (après « Jour suivant », en compact) : il couvre la carte, on le replie
    if (await page.evaluate(() => document.getElementById('app').dataset.panel === 'open') && await page.locator('.panel-toggle').isVisible()) {
      await page.click('.panel-toggle');
      await page.waitForTimeout(450);
    }
  }
  async function plan(page) {
    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      const ul = document.querySelector('#dlg-plan .ow-plan-summary');
      return {
        resume: ul.hidden ? [] : [...ul.querySelectorAll('li')].map((li) => s(li.textContent)),
        bats: Object.fromEntries([...document.querySelectorAll('#dlg-plan [data-bat]')].map((b) => [b.dataset.bat, s(b.closest('.ow-plan-bat').querySelector('.ow-plan-bat-etat').textContent)])),
      };
    });
  }
  async function ouvrir(page, id) {
    if (!await page.evaluate(() => document.getElementById('dlg-plan').open)) await plan(page);
    await page.click(`#dlg-plan [data-bat="${id}"]`);
    const f = await L.waitFor(async () => { const x = await fiche(page); return x.open && x.id === id ? x : null; }, 4000);
    await page.waitForTimeout(700); // un toucher juste après l'ouverture serait le second de celui qui l'a ouverte
    return f;
  }
  async function fermer(page) {
    if (await page.evaluate(() => document.getElementById('dlg-batiment').open)) {
      await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
      await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
    }
    if (await page.evaluate(() => document.getElementById('dlg-plan').open)) {
      await page.keyboard.press('Escape');
      await L.waitFor(() => page.evaluate(() => !document.querySelector('dialog[open]')), 3000);
    }
  }
  const centre = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const jourSuivant = async (page, srv, k) => {
    await L.openPanel(page);
    await page.click('[data-action="jour-suivant"]');
    await L.waitFor(() => srv.game()?.horloge?.decalage === k, 5000);
    await L.closeWelcome(page, 2500);
  };
  const imprevusAu = (srv) => srv.ledger().filter((e) => e.type === 'imprevu');
  const degat = (srv, id) => (srv.game().degats || []).find((d) => d.id === id);
  const res = (g) => JSON.stringify(g.resources);
  const dits = async (page) => (await L.said(page)).map((x) => sp(x.text));

  await L.runScenario('37. les imprévus', async ({ R, srv, newPage, shot, tag }) => {
    // ───── Partie A : dégâts posés d'avance
    const srvA = await L.startServer({ tasks: TASKS_A, game: etatA(), ledger: ledgerA(), sandbox: true });
    try {
      const { page, context } = await newPage({}, { hasTouch: true, isMobile: tag < 700 });
      await context.addInitScript(L.VOICES);
      await page.clock.install({ time: at(DA) });
      await page.goto(srvA.url);
      await L.ready(page);
      await L.closeWelcome(page, 1500);
      await carte(page);
      await page.waitForTimeout(800);
      const v0 = await vus(page, [marque('eolienne-1'), marque('parcelle-1'), marque('parcelle-2'), marque('parcelle-3'), objet('peche'), objet('trouvaille'), objet('orignal'), '.ow-aurore'], tag < 700);
      R.check('carte : une marque braise sur l’éolienne et les deux parcelles touchées, aucune sur la troisième',
        v0[marque('eolienne-1')] && v0[marque('parcelle-1')] && v0[marque('parcelle-2')] && !v0[marque('parcelle-3')], JSON.stringify(v0));
      R.check('carte : caisse de poissons, pile de bois et orignal du jour en vue ; pas d’aurore',
        v0[objet('peche')] && v0[objet('trouvaille')] && v0[objet('orignal')] && !v0['.ow-aurore'], JSON.stringify(v0));
      const nomE = sp(await nomCarte(page, 'eolienne-1'));
      R.check('carte : le nom de l’éolienne dit « en panne, repart seule dans 2 jours »', /en panne, repart seule dans 2 jours/.test(nomE), nomE);
      await shot(page, '37-degats');
      const p0 = await plan(page);
      R.check('carte en liste : la caisse de poissons, la pile de bois et l’orignal, pas d’aurore',
        JSON.stringify(p0.resume) === JSON.stringify(['Une caisse de poissons attend au bout de la route du quai.', 'Une pile de bois trouvée en forêt attend près du grenier.', 'Un orignal traverse la route des Champs.']), JSON.stringify(p0.resume));
      R.check('carte en liste : l’état de chaque bâtiment touché, et rien sur la parcelle saine',
        p0.bats['eolienne-1'] === 'En panne, repart seule dans 2 jours' && /^Un ours rôde, il repart dans 3 jours/.test(p0.bats['parcelle-1'])
        && /^Gelée, dégèle demain/.test(p0.bats['parcelle-2']) && !/rôde|gelée|panne/i.test(p0.bats['parcelle-3']), JSON.stringify(p0.bats));

      // éolienne, sans Matériaux : verrouillé
      let f = await ouvrir(page, 'eolienne-1');
      R.check('éolienne : « Maintenant » dit l’arrêt, le bloc dit la panne et ses deux autres voies',
        f.now === 'À l’arrêt pour l’instant : une pale est cassée.' && f.degat?.vu && f.degat.titre === 'Panne d’éolienne'
        && JSON.stringify(f.degat.voies) === JSON.stringify(['Ou termine une quête Maison : elle règle ça, gratuitement.', 'Sinon, ça se règle tout seul dans 2 jours.']), JSON.stringify(f));
      R.check('éolienne : « Réparer · 4 Matériaux » verrouillé, la raison écrite',
        f.degat?.etat === 'verrou' && f.degat.go?.off && f.degat.go.text === 'Réparer · 4 Matériaux' && f.degat.go.label === 'Réparer pour 4 Matériaux' && f.degat.raison === 'Il manque 4 Matériaux.', JSON.stringify(f.degat));
      R.check('éolienne : bouton de 44 px au moins, rien ne déborde de la fiche', f.degat?.go?.h >= 43.99 && f.degat.go.w >= 44 && f.debord.length === 0, JSON.stringify({ go: f.degat?.go, debord: f.debord }));
      await shot(page, '37-eolienne-verrou');
      await L.said(page, true);
      const gV = srvA.game();
      await page.click('#dlg-batiment .degat-go', { force: true }); // verrouillé (aria-disabled) : Playwright attendrait qu'il s'ouvre
      await page.waitForTimeout(700);
      R.check('éolienne verrouillée : rien n’est payé, la panne reste', res(srvA.game()) === res(gV) && !degat(srvA, `panne:${addDays(DA, -1)}`).fin, res(srvA.game()));
      R.check('éolienne verrouillée : la raison est lue', (await dits(page)).includes('Il manque 4 Matériaux.'), JSON.stringify(await dits(page)));
      await fermer(page);

      // parcelle mûre et ours : double toucher « Chasser l'ours » puis « Récolter »
      f = await ouvrir(page, 'parcelle-1');
      R.check('parcelle-1 : l’ours, « Chasser l’ours · 2 Énergie » ouvert, « Récolter » ouvert dessous',
        f.degat?.etat === 'libre' && f.degat.titre === 'Un ours au potager' && f.degat.go?.text === 'Chasser l’ours · 2 Énergie' && !f.degat.go.off
        && f.degat.effet === 'Il goûte à la culture : la prochaine récolte donnera 2 Nourriture de moins.' && f.foot?.geste === 'recolter' && !f.foot.off, JSON.stringify(f));
      await L.said(page, true);
      const gO = srvA.game();
      const lO = srvA.ledger().length;
      const pt = await centre(page, '#dlg-batiment .degat-go');
      const pt2 = await centre(page, '#dlg-batiment .bat-foot [data-action="bat-geste"]');
      // où tombe chaque toucher (phase de capture) : un bouton ouvert, le fond de la fiche, ou autre chose
      await page.evaluate(() => {
        window.__taps = [];
        document.addEventListener('click', (e) => window.__taps.push([e.target.closest('[data-action="bat-geste"]:not([aria-disabled])')?.dataset.geste || (e.target.id === 'dlg-batiment' ? 'fond' : '-'), performance.now()]), true);
      });
      await page.touchscreen.tap(pt[0], pt[1]);
      await page.waitForTimeout(150);
      await page.touchscreen.tap(pt2[0], pt2[1]);
      // en compact, la fiche est posée en bas : « Récolter » ne bouge pas. Centrée (tablette, bureau), elle rapetisse quand
      // l'ours s'en va : le second toucher tombe au fond, puis un troisième sur « Récolter », là où il est maintenant
      if (tag >= 700) { const pt3 = await centre(page, '#dlg-batiment .bat-foot [data-action="bat-geste"]'); await page.touchscreen.tap(pt3[0], pt3[1]); }
      const taps = await page.evaluate(() => window.__taps);
      const ou = taps.map((x) => x[0]), duree = Math.round(taps.at(-1)[1] - taps[0][1]);
      R.check(tag < 700 ? 'double toucher : les deux touchers tombent sur deux boutons ouverts, « Chasser l’ours » puis « Récolter »'
        : 'double toucher : « Chasser l’ours », le fond (la fiche a rapetissé), puis « Récolter » ouvert, en moins de 800 ms',
      JSON.stringify(ou) === (tag < 700 ? '["reparer","recolter"]' : '["reparer","fond","recolter"]') && duree < 800, JSON.stringify({ ou, duree }));
      R.check('double toucher : la fiche reste ouverte', (await fiche(page)).open);
      const dO = await L.waitFor(() => degat(srvA, `ours:${DA}`)?.fin ? degat(srvA, `ours:${DA}`) : null, 5000);
      await page.waitForTimeout(1200);
      const gO2 = srvA.game();
      R.check('double toucher : l’ours est chassé (payé, 2 Énergie), la récolte n’a pas eu lieu',
        dO && dO.par === 'paiement' && dO.fin === DA && Math.round((gO.resources.energy - gO2.resources.energy) * 10) / 10 === 2
        && gO2.resources.food === gO.resources.food && JSON.stringify(gO2.parcelles) === JSON.stringify(gO.parcelles), `${res(gO)} → ${res(gO2)} ${JSON.stringify(dO)}`);
      R.check('réparation : rien au registre, les tâches intactes', srvA.ledger().length === lO && JSON.stringify(srvA.readTasks().map((x) => [x.id, x.status])) === JSON.stringify(TASKS_A.map((x) => [x.id, x.status])));
      const d1 = await dits(page);
      R.check('réparation : une seule phrase lue, « Ours chassé, pour 2 Énergie. »', d1.filter((x) => /Ours chassé/.test(x)).length === 1 && d1.some((x) => x.startsWith('Ours chassé, pour 2 Énergie.')), JSON.stringify(d1));
      const motO = await L.waitFor(() => bulle(page), 3000);
      R.check('réparation : Fanal la salue (une variante de « imprevu.regle »)', variantes('imprevu.regle').includes(sp(motO)), String(motO));
      f = await fiche(page);
      R.check('fiche : « Ours chassé aujourd’hui. » à la place du bloc, « Récolter » toujours ouvert', f.degat?.etat === 'fait' && f.degat.fait === 'Ours chassé aujourd’hui.' && f.foot?.geste === 'recolter' && !f.foot.off, JSON.stringify(f));
      R.check('carte : la marque de la parcelle-1 s’en va', !(await vus(page, [marque('parcelle-1')], tag < 700))[marque('parcelle-1')]);
      await shot(page, '37-ours-chasse');
      // la récolte, ensuite : entière (l'ours n'en prend rien)
      const attendu = core.recolter(srvA.readTasks(), srvA.game(), srvA.ledger(), { id: 'parcelle-1', gameRevision: 1 }, at(DA).toISOString()).events.find((e) => e.type === 'recolte');
      await page.click('#dlg-batiment .bat-foot [data-action="bat-geste"]');
      R.check('récolte après l’ours : entière, la Nourriture du serveur monte d’autant', !!await L.waitFor(() => !(srvA.game().parcelles || []).some((p) => p.id === 'parcelle-1'), 5000)
        && attendu.nourriture > 0 && srvA.game().resources.food === Math.round((gO2.resources.food + attendu.nourriture) * 10) / 10, `${JSON.stringify(attendu)} ${res(srvA.game())}`);
      await fermer(page);

      // une quête Maison payée répare l'éolienne, gratuitement
      await L.openPanel(page);
      await L.said(page, true);
      const gQ = srvA.game();
      await page.click('#fil-quest [data-action="complete"]');
      const dQ = await L.waitFor(() => degat(srvA, `panne:${addDays(DA, -1)}`)?.fin ? degat(srvA, `panne:${addDays(DA, -1)}`) : null, 5000);
      R.check('quête Maison : l’éolienne est réparée par la quête, sans rien payer', dQ && dQ.par === 'quete' && srvA.game().resources.materials >= gQ.resources.materials, `${JSON.stringify(dQ)} ${res(gQ)} → ${res(srvA.game())}`);
      const dq = await L.waitFor(async () => { const d = await dits(page); return d.some((x) => /La quête répare aussi l’éolienne\./.test(x)) ? d : null; }, 3000) || await dits(page);
      R.check('quête Maison : la phrase lue le dit, sans « n’a pas tourné »', dq.some((x) => /La quête répare aussi l’éolienne\./.test(x)) && !dq.some((x) => /n’a pas tourné/.test(x)), JSON.stringify(dq));
      await carte(page);
      f = await ouvrir(page, 'eolienne-1');
      R.check('éolienne : « Réglé aujourd’hui par une quête Maison. »', f.degat?.etat === 'fait' && f.degat.fait === 'Réglé aujourd’hui par une quête Maison.', JSON.stringify(f.degat));
      await fermer(page);

      // « Remballer » cette quête : la panne revient, comme le gain s'en va
      await L.openPanel(page);
      await page.locator('label.seg-option', { hasText: 'Faites' }).click();
      await L.said(page, true);
      await page.locator('#quest-list > li[data-task-id="a1"] [data-action="remballer"]').click();
      await page.waitForSelector('#dlg-confirm[open]');
      await page.click('#dlg-confirm [data-answer="yes"]');
      const dRe = await L.waitFor(() => { const d = degat(srvA, `panne:${addDays(DA, -1)}`); return d && !d.fin ? d : null; }, 5000);
      R.check('Remballer la quête : la panne revient, et les ressources d’avant la quête aussi', !!dRe && !dRe.par && !dRe.taskId && res(srvA.game()) === res(gQ), `${JSON.stringify(dRe)} ${res(gQ)} → ${res(srvA.game())}`);
      const dRem = await L.waitFor(async () => { const d = await dits(page); return d.some((x) => x.includes('L’éolienne retombe en panne.')) ? d : null; }, 3000) || await dits(page);
      R.check('Remballer la quête : la phrase lue dit « L’éolienne retombe en panne. »', dRem.some((x) => x.includes('L’éolienne retombe en panne.')), JSON.stringify(dRem));
      await page.waitForSelector('#dlg-confirm:not([open])', { state: 'attached' });
      await carte(page);
      R.check('Remballer la quête : la marque revient sur l’éolienne', (await vus(page, [marque('eolienne-1')], tag < 700))[marque('eolienne-1')]);

      // « Jour suivant » : le gel se règle seul, sans rien écrire
      const gelAvant = JSON.stringify(degat(srvA, `gel:${DA}`));
      await jourSuivant(page, srvA, 1);
      await carte(page);
      await page.waitForTimeout(800);
      const v1 = await vus(page, [marque('parcelle-2'), objet('peche'), objet('trouvaille'), objet('orignal')], tag < 700);
      R.check('lendemain : plus de marque sur la parcelle gelée, plus d’objets de la veille', Object.values(v1).every((x) => !x), JSON.stringify(v1));
      const nomL = sp(await nomCarte(page, 'eolienne-1'));
      R.check('lendemain : la panne rouverte est toujours là, « repart seule demain »', /en panne, repart seule demain/.test(nomL), nomL);
      R.check('lendemain : le gel s’est réglé seul, sans rien écrire', JSON.stringify(degat(srvA, `gel:${DA}`)) === gelAvant && !imprevusAu(srvA).some((e) => e.day === addDays(DA, 1)), JSON.stringify(srvA.game().degats));
      f = await ouvrir(page, 'parcelle-2');
      R.check('lendemain : la fiche de la parcelle-2 n’a plus de bloc de dégât', f.open && !f.degat, JSON.stringify(f));
      await fermer(page);
      const p1 = await plan(page);
      R.check('lendemain : la carte en liste ne dit plus rien d’imprévu', p1.resume.length === 0 && !/gel/i.test(p1.bats['parcelle-2']), JSON.stringify(p1));
      await fermer(page);
      await page.close();
    } finally {
      srvA.stop();
    }

    // ───── Partie B : la veille de l'aurore, premier appareil (toucher)
    const { page, context } = await newPage({}, { hasTouch: true, isMobile: tag < 700 });
    await context.addInitScript(L.VOICES);
    await page.clock.install({ time: at(VEILLE) });
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await carte(page);
    await page.waitForTimeout(800);
    R.check('veille : rien au registre, pas d’aurore, aucun mot de Fanal sur un imprévu',
      imprevusAu(srv).length === 0 && !(await vus(page, ['.ow-aurore'], tag < 700))['.ow-aurore'] && !TOUS_IMPREVUS.includes(sp(await bulle(page))), JSON.stringify(imprevusAu(srv)));
    await L.said(page, true);
    await jourSuivant(page, srv, 1);
    const eA = await L.waitFor(() => imprevusAu(srv).find((e) => e.key === `imprevu:${S1}`), 4000);
    R.check('aurore : une écriture au registre, 3 Énergie', eA && eA.imprevu === 'aurore' && eA.energy === 3 && imprevusAu(srv).length === 1, JSON.stringify(imprevusAu(srv)));
    const motA = await L.waitFor(async () => { const m = sp(await bulle(page)); return variantes('imprevu.aurore').includes(m) ? m : null; }, 12000);
    R.check('aurore : Fanal la raconte (une variante de « imprevu.aurore »)', !!motA, String(await bulle(page)));
    const dA = await dits(page);
    R.check('aurore : la phrase lue la dit, et le mot de Fanal', dA.some((x) => x.includes('Une aurore boréale passe au-dessus de l’île.')) && dA.some((x) => x.includes(`Fanal : ${motA}`)), JSON.stringify(dA));
    R.check('appareil : l’imprévu raconté est noté', await page.evaluate(() => localStorage.getItem('oree.imprevu.v1')) === `imprevu:${S1}`);
    await carte(page);
    R.check('aurore : en vue sur la carte', (await vus(page, ['.ow-aurore'], tag < 700))['.ow-aurore']);
    await shot(page, '37-aurore');
    const pA = await plan(page);
    R.check('carte en liste : « Une aurore boréale passe au-dessus de l’île aujourd’hui. »', JSON.stringify(pA.resume) === JSON.stringify(['Une aurore boréale passe au-dessus de l’île aujourd’hui.']), JSON.stringify(pA.resume));
    await fermer(page);
    await page.reload();
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await page.waitForTimeout(2500);
    R.check('rechargement : Fanal ne la répète pas, rien de plus au registre', !variantes('imprevu.aurore').includes(sp(await bulle(page))) && imprevusAu(srv).length === 1, String(await bulle(page)));

    // second appareil, en mouvement réduit : Fanal la raconte une fois là aussi ; payée une seule fois
    const { page: p2 } = await newPage({}, { reducedMotion: 'reduce' });
    await p2.clock.install({ time: at(VEILLE) });
    await p2.goto(srv.url);
    await L.ready(p2);
    await L.closeWelcome(p2, 1500);
    const motA2 = await L.waitFor(async () => { const m = sp(await bulle(p2)); return variantes('imprevu.aurore').includes(m) ? m : null; }, 12000);
    R.check('second appareil : Fanal raconte l’aurore une fois sur cet appareil', !!motA2, String(await bulle(p2)));
    R.check('second appareil : l’aurore n’est payée qu’une fois', imprevusAu(srv).length === 1, JSON.stringify(imprevusAu(srv)));
    const ondule = (pg) => pg.evaluate(() => { document.querySelector('.ow').dataset.ambient = 'on'; const r = document.querySelector('.ow-aurore-r'); return getComputedStyle(r).animationPlayState; });
    const [complet, reduit] = [await ondule(page), await ondule(p2)];
    R.check('mouvement : l’aurore ondule quand l’île est réveillée, pas en mouvement réduit', complet === 'running' && reduit === 'paused', `${complet} / ${reduit}`);
    await p2.close();

    // jusqu'au jour de la panne
    for (let k = 2; k <= 1 + (at(S2) - at(S1)) / 86400000; k++) await jourSuivant(page, srv, k);
    const eP = await L.waitFor(() => imprevusAu(srv).find((e) => e.key === `imprevu:${S2}`), 4000);
    const idP = `panne:${S2}`;
    R.check('panne : au registre sans gain, le dégât dans la partie (3 jours)', eP && eP.imprevu === 'panne' && eP.cible === 'eolienne-1' && !eP.energy && !eP.materials
      && degat(srv, idP)?.jusqua === addDays(S2, 3), JSON.stringify({ eP, degats: srv.game().degats }));
    const motP = await L.waitFor(async () => { const m = sp(await bulle(page)); return variantes('imprevu.panne').includes(m) ? m : null; }, 16000);
    R.check('panne : Fanal la raconte (une variante de « imprevu.panne »)', !!motP, String(await bulle(page)));
    const dP = await dits(page);
    R.check('panne : la phrase lue dit le prix et les jours', dP.some((x) => x.includes('Panne d’éolienne : elle ne donne plus son Énergie. Réparer coûte 4 Matériaux, ou elle repart seule dans 3 jours.')), JSON.stringify(dP));
    await carte(page);
    R.check('panne : la marque est en vue sur l’éolienne', (await vus(page, [marque('eolienne-1')], tag < 700))[marque('eolienne-1')]);
    R.check('panne : le nom de l’éolienne sur la carte le dit', /en panne, repart seule dans 3 jours/.test(sp(await nomCarte(page, 'eolienne-1'))), await nomCarte(page, 'eolienne-1'));
    await shot(page, '37-panne');

    // deux appareils : le second répare au clavier, le premier (pas encore relu) répare aussi
    let f = await ouvrir(page, 'eolienne-1');
    R.check('premier appareil : « Réparer · 4 Matériaux » ouvert', f.degat?.etat === 'libre' && f.degat.go?.text === 'Réparer · 4 Matériaux' && !f.degat.go.off, JSON.stringify(f.degat));
    const { page: p3, context: c3 } = await newPage({}, {});
    await c3.addInitScript(L.VOICES);
    await p3.clock.install({ time: at(VEILLE) });
    await p3.goto(srv.url);
    await L.ready(p3);
    await L.closeWelcome(p3, 1500);
    await p3.waitForTimeout(600);
    await carte(p3);
    await ouvrir(p3, 'eolienne-1');
    const gR = srv.game();
    await L.said(p3, true);
    await p3.focus('#dlg-batiment .degat-go');
    await p3.keyboard.press('Enter');
    const dR = await L.waitFor(() => degat(srv, idP)?.fin ? degat(srv, idP) : null, 5000);
    R.check('second appareil : la panne est réparée, 4 Matériaux', dR && dR.par === 'paiement' && Math.round((gR.resources.materials - srv.game().resources.materials) * 10) / 10 === 4, `${res(gR)} → ${res(srv.game())}`);
    const focus = await p3.evaluate(() => ({ cls: document.activeElement?.className, txt: document.activeElement?.textContent.trim() }));
    R.check('clavier : le focus reste sur la ligne cochée « Réparée aujourd’hui. »', focus.cls === 'degat-fait' && focus.txt === 'Réparée aujourd’hui.', JSON.stringify(focus));
    R.check('second appareil : « Éolienne réparée, pour 4 Matériaux. » est lu', (await dits(p3)).some((x) => x.startsWith('Éolienne réparée, pour 4 Matériaux.')), JSON.stringify(await dits(p3)));
    await p3.close();
    const g2 = srv.game();
    await L.said(page, true);
    const pg = await centre(page, '#dlg-batiment .degat-go');
    await page.touchscreen.tap(pg[0], pg[1]); // le premier appareil n'a pas encore relu le serveur : son bouton est ouvert
    await page.waitForTimeout(2500);
    R.check('deux appareils : la réparation n’est payée qu’une fois', res(srv.game()) === res(g2), `${res(g2)} → ${res(srv.game())}`);
    const note = await L.waitFor(() => page.evaluate(() => { const n = document.getElementById('notice'); return n && !n.hidden && /Déjà réparé/.test(n.textContent) ? n.textContent : null; }), 4000)
      || (await L.said(page)).map((x) => x.text).find((t) => /Déjà réparé/.test(t));
    R.check('premier appareil : remis à jour, il dit pourquoi (« Déjà réparé »)', !!note, String(note));
    R.check('premier appareil : la barre montre les Matériaux du serveur', await L.waitFor(async () => (await L.resValue(page, 'materiaux')) === Math.floor(srv.game().resources.materials), 4000));
    f = await fiche(page);
    R.check('premier appareil : la fiche dit « Réparée aujourd’hui. »', f.degat?.etat === 'fait' && f.degat.fait === 'Réparée aujourd’hui.', JSON.stringify(f.degat));
    await fermer(page);

    // ───── Partie C : retour après une absence, le jour d'une panne (première largeur seulement)
    if (tag !== L.SIZES[0][0]) return;
    const srvC = await L.startServer({ tasks: TASKS_B, game: villageB(S2, { lastSeenDay: addDays(S2, -6) }), sandbox: true });
    try {
      const { page: pc } = await newPage({}, {});
      await pc.clock.install({ time: at(S2) });
      await pc.goto(srvC.url);
      await L.ready(pc);
      await L.closeWelcome(pc, 2500);
      await carte(pc);
      await pc.waitForTimeout(800);
      const gC = srvC.game();
      const iC = imprevusAu(srvC);
      R.check('reprise : notée pour trois jours', JSON.stringify(gC.reprise) === JSON.stringify({ du: S2, au: addDays(S2, 2) }), JSON.stringify(gC.reprise));
      R.check('reprise : aucun dégât ; le bon manqué et celui du jour au registre, tous deux bons',
        !(gC.degats || []).length && iC.length === 2 && iC.every((e) => !['panne', 'ours', 'gel'].includes(e.imprevu)) && iC.some((e) => e.key === `imprevu:${S1}`) && iC.some((e) => e.key === `imprevu:${S2}`), JSON.stringify(iC));
      R.check('reprise : aucune marque sur l’éolienne', !(await vus(pc, [marque('eolienne-1')], tag < 700))[marque('eolienne-1')]);
      await pc.close();
    } finally {
      srvC.stop();
    }
  }, { tasks: TASKS_B, game: () => villageB(VEILLE), sandbox: true });
})();
