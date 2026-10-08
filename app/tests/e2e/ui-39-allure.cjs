// 39. L'allure du village (lot A), à l'écran. Trois parties de l'automne prochain, chacune avec son registre préparé.
//   Partie A (au ralenti depuis des semaines, une quête tous les quatre jours ; le jour où le calendrier régulier ferait
//   tomber un mauvais imprévu, qui frapperait à ce rythme-là) :
//   - la lettre du matin et la ligne « Aujourd'hui » du bandeau proposent la quête la plus courte, pas la n° 1 ;
//   - les deux imprévus de la semaine sont bons, aucun dégât ; Fanal ne dit rien de l'allure (elle n'a pas changé) ;
//   - bilan : « Allure : au ralenti (N quêtes en 14 jours) », un cran sur trois, ce que ça change ; les deux semaines
//     figées ensuite portent la leur, celle figée avant le lot (sans le champ) n'en montre aucune ;
//   - réserve pleine et parcelle mûre : la fiche le dit, « Récolter » reste ouvert ; la récolte libère la parcelle sans
//     rien ajouter, et la phrase lue dit que tout a été perdu.
//   Partie B (au ralenti, puis 20 quêtes la semaine d'avant : l'allure remonte à « régulier ») :
//   - Fanal dit une variante de « allure.elan », une fois ; pas au rechargement ; une fois sur un second appareil ;
//   - le mauvais imprévu du jour frappe (régulier) ; deux imprévus dans la semaine ; bilan à deux crans.
//   Partie C (régulier, puis six quêtes par jour : plein régime) : un créneau en plus du calendrier régulier tombe ; bilan
//   à trois crans, « plein régime ».
// Données fictives seulement. Les attentes viennent de core/ et des textes de content/fr-CA, pas de valeurs recopiées.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const lire = (f) => JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', f), 'utf8'));
const UI = lire('interface.json');
const BAT = lire('batiments.json');
const REPLIQUES = lire('repliques.json');
const remplir = (s, v) => sp(String(s).replace(/\{(\w+)\}/g, (_, k) => String(v[k])));
const variantes = (sit) => REPLIQUES.situations[sit].variantes.map((v) => sp(v.texte));
const ALLURE_DITS = [...variantes('allure.elan'), ...variantes('allure.ralentit')];
const at = (day, h = 14) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`);

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const { addDays, weekStart, calendrierImprevus, isTruce, allureDe, IMPREVUS } = core;
  const BONS = Object.keys(IMPREVUS.bons);

  // ───── dates : l'automne prochain, jamais dans le passé
  const now = new Date();
  let sept = new Date(Date.UTC(now.getUTCFullYear(), 8, 1, 14));
  if (sept <= now) sept = new Date(Date.UTC(now.getUTCFullYear() + 1, 8, 1, 14));
  const SEPT = sept.toISOString().slice(0, 10);
  const dimanche = (d) => at(d).getUTCDay() === 0;

  const paye = (day, k = 0) => ({ key: `reward:x-${day}-${k}:1`, at: at(day).toISOString(), day, type: 'reward', taskId: `x-${day}-${k}`, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });
  const tire = (day) => ({ key: `imprevu:${day}`, at: at(day).toISOString(), day, type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0 });
  // n quêtes par jour, de debut (compris) à fin (exclue)
  const quetes = (debut, fin, n) => { const out = []; for (let d = debut; d < fin; d = addDays(d, 1)) for (let k = 0; k < n(d); k++) out.push(paye(d, k)); return out; };
  const tousLes4 = (debut) => (d) => (core.daysBetween(debut, d) % 4 ? 0 : 1);
  const village = (day, depart, over = {}) => {
    const g = L.quietState(core, at(day), { letters: false });
    g.startDay = depart;
    g.resources = { energy: 20, materials: 10, food: 5 };
    g.habitants = 2;
    g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, addDays(depart, 1)]));
    g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'eolienne-1', type: 'eolienne' },
      { id: 'parcelle-1', type: 'parcelle' }, { id: 'parcelle-2', type: 'parcelle' }];
    g.lastSeenDay = addDays(day, -1);
    g.lastOpenDay = addDays(day, -1);
    return Object.assign(g, over);
  };
  const frappe = (tasks, game, ledger, day) => (core.advanceTime(tasks, game, ledger, { gameRevision: 1 }, at(day).toISOString()).game.degats || []).some((d) => d.le === day);
  const semaines = function* (debut, n) { for (let k = 0; k < n; k++) yield addDays(weekStart(debut), 7 * k); };

  // ───── Partie A : au ralenti, le jour du second créneau, qui serait mauvais (et frapperait) au rythme régulier
  const TASKS_A = [
    { id: 'a1', task: 'Repeindre la clôture', domain: 'Terrain', difficulty: 4, length: 6, priority: 9, status: 'todo' },
    { id: 'a2', task: 'Arroser les plantes', domain: 'Maison', difficulty: 1, length: 1, priority: 2, status: 'todo' },
    { id: 'a3', task: 'Trier les papiers', domain: 'Administratif', difficulty: 3, length: 3, priority: 5, status: 'todo' },
  ];
  let A = null;
  for (const w of semaines(addDays(SEPT, 7), 8)) {
    const [c1, c2] = calendrierImprevus(w).creneaux;
    if (c2.nature !== 'mauvais' || c1.jour === c2.jour || dimanche(c2.jour) || isTruce(c2.jour)) continue;
    const day = c2.jour, depart = addDays(w, -56);
    const tasks = TASKS_A.map((t) => ({ ...t, created: addDays(day, -3) }));
    const game = village(day, depart, { parcelles: [{ id: 'parcelle-1', semeLe: addDays(day, -30) }] });
    game.resources.food = core.stockage(game);
    const ledger = quetes(depart, day, tousLes4(depart));
    // un bilan figé avant le lot (sans le champ), puis les deux semaines suivantes figées par core au lundi, avec leur allure
    const avant = { semaine: { start: addDays(w, -21), end: addDays(w, -15) }, quetes: 2, heures: 1, domaines: [], joursTravailles: 2 };
    game.bilans = core.figerBilans(tasks, { ...game, bilans: [avant] }, ledger, at(w));
    const regulier = quetes(depart, day, () => 2); // même village, au rythme régulier
    if (!frappe(tasks, game, regulier, day) || frappe(tasks, game, ledger, day)) continue;
    A = { w, day, c1: c1.jour, tasks, game, ledger };
    break;
  }
  if (!A) throw new Error('partie A : aucune semaine d’automne où le second créneau frappe au rythme régulier');
  const aA = allureDe(A.game, A.ledger, A.day);
  if (aA.niveau !== 'ralenti' || aA.change !== 0) throw new Error(`partie A : allure ${JSON.stringify(aA)}`);
  if (core.topCards(A.tasks, at(A.day)).first.id !== 'a1' || core.plusCourte(A.tasks, at(A.day)).id !== 'a2') throw new Error('partie A : quêtes mal choisies');
  if (!core.etatCulture(A.game, A.ledger, 'parcelle-1', at(A.day)).mure) throw new Error('partie A : parcelle-1 pas mûre');

  // ───── Partie B : au ralenti, puis 20 quêtes la semaine d'avant ; le second créneau (mauvais) frappe
  const TASKS_B = [{ id: 'b1', task: 'Ranger le cabanon', domain: 'Terrain', difficulty: 2, length: 2, priority: 6, status: 'todo' }];
  let B = null;
  for (const w of semaines(addDays(SEPT, 7), 8)) {
    const [c1, c2] = calendrierImprevus(w).creneaux;
    if (c2.nature !== 'mauvais' || c1.jour === c2.jour || dimanche(c2.jour) || isTruce(c2.jour)) continue;
    const day = c2.jour, depart = addDays(w, -56);
    const tasks = TASKS_B.map((t) => ({ ...t, created: addDays(day, -3) }));
    const game = village(day, depart, { parcelles: [{ id: 'parcelle-1', semeLe: addDays(day, -1) }] });
    const elan = (d) => (d >= addDays(w, -7) && d < addDays(w, -1) ? 3 : d === addDays(w, -1) ? 2 : 0); // 3 × 6 + 2 = 20 la semaine d'avant
    const ledger = quetes(depart, day, (d) => elan(d) || tousLes4(depart)(d));
    if (!frappe(tasks, game, ledger, day)) continue;
    B = { w, day, tasks, game, ledger };
    break;
  }
  if (!B) throw new Error('partie B : aucune semaine d’automne où le mauvais du jour frappe');
  const aB = allureDe(B.game, B.ledger, B.day);
  if (aB.niveau !== 'regulier' || aB.change !== 1) throw new Error(`partie B : allure ${JSON.stringify(aB)}`);

  // ───── Partie C : régulier, puis six quêtes par jour ; le jour d'un créneau que seul le plein régime ajoute
  let C = null;
  for (const w of semaines(addDays(SEPT, 7), 8)) {
    const regulier = calendrierImprevus(w).creneaux.map((c) => c.jour);
    const tous = calendrierImprevus(w, 'plein').creneaux.map((c) => c.jour);
    const day = tous.find((j) => !regulier.includes(j) && !dimanche(j) && !isTruce(j));
    if (!day) continue;
    const depart = addDays(w, -56);
    const tasks = TASKS_B.map((t) => ({ ...t, created: addDays(day, -3) }));
    const game = village(day, depart, { parcelles: [] });
    const ledger = [...quetes(depart, day, (d) => (d >= addDays(w, -14) && d < w ? 6 : 2)), ...tous.filter((j) => j < day).map(tire)];
    C = { w, day, tasks, game, ledger };
    break;
  }
  if (!C) throw new Error('partie C : aucun créneau du plein régime en automne');
  const aC = allureDe(C.game, C.ledger, C.day);
  if (aC.niveau !== 'plein' || aC.change !== 1) throw new Error(`partie C : allure ${JSON.stringify(aC)}`);

  // ───── lectures de l'écran
  const bulle = (page) => page.evaluate(() => { const e = document.getElementById('speech'); return e.hidden ? null : e.querySelector('.speech-text')?.textContent || null; });
  const ditsAllure = async (page) => (await L.said(page)).map((x) => sp(x.text)).filter((x) => ALLURE_DITS.some((v) => x.endsWith(v)));
  const horsEcran = (page, sel) => page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return ['absent'];
    return [...root.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map((e) => e.className || e.tagName);
  }, sel);
  const sansDefilement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  async function bilan(page) {
    await L.closeWelcome(page, 800);
    await L.openPanel(page);
    await page.click('[data-action="open-review"]');
    await page.waitForSelector('#dlg-review[open]');
    await page.waitForTimeout(500);
    return page.evaluate(() => {
      const s = (x) => String(x || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
      const crans = (el) => el && { on: el.querySelectorAll('.allure-cran.is-on').length, tous: el.querySelectorAll('.allure-cran').length, cache: el.getAttribute('aria-hidden') === 'true', niveau: el.dataset.allure };
      const a = document.querySelector('#dlg-review .review-allure');
      const on = a?.querySelector('.allure-cran.is-on'), off = a?.querySelector('.allure-cran:not(.is-on)');
      return {
        allure: a && { mot: s(a.querySelector('.review-allure-mot')?.textContent), effet: s(a.querySelector('.review-allure-effet')?.textContent), crans: crans(a.querySelector('.allure-crans')),
          fond: { on: on && getComputedStyle(on).backgroundColor, off: off && getComputedStyle(off).backgroundColor } },
        semaines: [...document.querySelectorAll('#dlg-review .review-weeks .why-line')].map((r) => ({ texte: s(r.textContent), court: s(r.querySelector('.review-allure-court')?.textContent), crans: crans(r.querySelector('.allure-crans')) })),
      };
    });
  }
  async function fermerBilan(page) {
    await page.evaluate(() => document.querySelector('#dlg-review .sheet-foot [data-close]').click());
    await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-review').open), 2000);
  }
  const motAllure = (niveau, n) => sp(`${remplir(UI['review.allure'], { niveau: UI[`allure.${niveau}`] })} ${remplir(UI[`review.allure.quetes.${n === 1 ? 'one' : 'other'}`], { n })}`);
  const effetAllure = (niveau, game, ledger, day) => sp(UI[`review.allure.effet.${niveau}${niveau === 'ralenti' && core.objectifSaison(game, ledger, at(day)).aVenir ? '.sans' : ''}`]);
  const imprevusSemaine = (srv, w) => srv.ledger().filter((e) => e.type === 'imprevu' && e.key >= `imprevu:${w}` && e.key <= `imprevu:${addDays(w, 6)}`);
  async function ouvrir(page, id) {
    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    await page.waitForTimeout(400);
    await page.click(`#dlg-plan [data-bat="${id}"]`);
    await L.waitFor(() => page.evaluate((id) => { const d = document.getElementById('dlg-batiment'); return d.open && d.dataset.batId === id; }, id), 4000);
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const s = (x) => String(x || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
      const d = document.getElementById('dlg-batiment');
      const r = d.getBoundingClientRect();
      const g = d.querySelector('.bat-foot [data-action="bat-geste"]');
      return {
        now: s(d.querySelector('#bat-now')?.textContent), geste: g && { nom: g.dataset.geste, off: g.getAttribute('aria-disabled') === 'true', h: g.getBoundingClientRect().height },
        debord: [...d.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.left < r.left - 1 || b.right > r.right + 1); }).length,
      };
    });
  }

  await L.runScenario('39. l’allure du village', async ({ R, newPage, shot, tag }) => {
    // ───── Partie A : au ralenti
    const srvA = await L.startServer({ tasks: A.tasks, game: A.game, ledger: A.ledger });
    try {
      const { page, context } = await newPage({}, { hasTouch: true, isMobile: tag < 700 });
      await context.addInitScript(L.VOICES);
      await page.clock.install({ time: at(A.day) });
      await page.goto(srvA.url);
      await L.ready(page);
      const lettre = await L.waitFor(() => page.evaluate(() => (document.getElementById('dlg-letter').open ? document.querySelector('#dlg-letter .letter-paper')?.textContent : null)), 4000);
      R.check('au ralenti : la lettre du matin propose la quête la plus courte, pas la n° 1',
        sp(lettre).includes('Arroser les plantes') && !sp(lettre).includes('Repeindre la clôture'), sp(lettre));
      await L.closeWelcome(page, 1500);
      R.check('au ralenti : la ligne « Aujourd’hui » du bandeau propose la même', sp(await page.textContent('#bandeau-today')) === 'Arroser les plantes', await page.textContent('#bandeau-today'));
      const iA = imprevusSemaine(srvA, A.w);
      R.check('au ralenti : les deux imprévus de la semaine sont bons, celui qui aurait frappé compris ; aucun dégât',
        iA.length === 2 && iA.every((e) => BONS.includes(e.imprevu)) && iA.some((e) => e.key === `imprevu:${A.day}`) && !(srvA.game().degats || []).length, JSON.stringify({ iA, degats: srvA.game().degats }));
      await page.waitForTimeout(2500);
      R.check('au ralenti, sans changement : Fanal ne dit rien de l’allure', (await ditsAllure(page)).length === 0, JSON.stringify(await ditsAllure(page)));

      const b = await bilan(page);
      R.check('bilan : « Allure : au ralenti (N quêtes en 14 jours) », N lu dans core', b.allure?.mot === motAllure('ralenti', aA.quetes), JSON.stringify(b.allure));
      R.check('bilan : un cran allumé sur trois, la marque cachée au lecteur d’écran (le texte la double)',
        b.allure?.crans?.on === 1 && b.allure.crans.tous === 3 && b.allure.crans.cache && b.allure.fond.on !== b.allure.fond.off, JSON.stringify(b.allure?.crans));
      R.check('bilan : ce que l’allure change, selon l’objectif de saison', b.allure?.effet === effetAllure('ralenti', A.game, A.ledger, A.day), JSON.stringify(b.allure?.effet));
      const figes = srvA.game().bilans || [];
      const attendus = figes.slice().reverse().map((x) => (x.allure ? sp(remplir(UI['review.allure'], { niveau: UI[`allure.${x.allure.niveau}`] })) : ''));
      R.check('semaines passées : les deux figées après le lot portent « Allure : au ralenti », comme core le calcule',
        figes.length === 3 && figes.slice(1).every((x) => x.allure?.niveau === allureDe(A.game, A.ledger, x.semaine.start).niveau && x.allure.niveau === 'ralenti'), JSON.stringify(figes.map((x) => [x.semaine.start, x.allure])));
      R.check('semaines passées : chaque ligne dit son allure (un cran), celle figée avant le lot n’en montre aucune',
        b.semaines.length === 3 && b.semaines.every((r, i) => r.court === attendus[i] && (attendus[i] ? r.crans?.on === 1 && r.crans.cache : !r.crans)), JSON.stringify({ lignes: b.semaines, attendus }));
      R.check('bilan : rien ne déborde, aucun défilement horizontal', (await horsEcran(page, '#dlg-review')).length === 0 && await sansDefilement(page), JSON.stringify(await horsEcran(page, '#dlg-review')));
      await shot(page, '39-bilan-ralenti');
      await page.evaluate(() => document.querySelector('#dlg-review .review-allure').scrollIntoView({ block: 'center' }));
      await shot(page, '39-bilan-ralenti-ligne');
      await fermerBilan(page);

      // réserve pleine, parcelle mûre
      const g0 = srvA.game();
      R.check('réserve pleine au départ', g0.resources.food === core.stockage(g0), JSON.stringify(g0.resources));
      const f = await ouvrir(page, 'parcelle-1');
      const n = core.recolteDe(g0, 'potager');
      R.check('fiche : « Maintenant » dit que tout serait perdu et que récolter libère la place',
        f.now === remplir(BAT.fiche['mure.plein'], { n, stock: g0.resources.food, max: core.stockage(g0) }), f.now);
      R.check('fiche : « Récolter » reste ouvert, 44 px, rien ne déborde', f.geste?.nom === 'recolter' && !f.geste.off && f.geste.h >= 43.99 && f.debord === 0, JSON.stringify(f));
      await shot(page, '39-fiche-pleine');
      await L.said(page, true);
      await page.click('#dlg-batiment .bat-foot [data-action="bat-geste"]');
      const g1 = await L.waitFor(() => { const g = srvA.game(); return !(g.parcelles || []).some((p) => p.id === 'parcelle-1') ? g : null; }, 5000);
      R.check('récolte à réserve pleine : la parcelle est libérée, la Nourriture ne bouge pas', g1 && g1.resources.food === g0.resources.food, JSON.stringify(g1 && { food: g1.resources.food, parcelles: g1.parcelles }));
      const dit = await L.waitFor(async () => (await L.said(page)).map((x) => sp(x.text)).find((x) => x.includes(remplir(BAT.sr['recolte.plein'], { perdu: n }))), 3000);
      R.check('récolte à réserve pleine : la phrase lue dit que tout a été perdu, sans « 0 Nourriture »', !!dit && !/Récolte : 0/.test(dit), JSON.stringify((await L.said(page)).map((x) => sp(x.text))));
      await page.close();
    } finally {
      srvA.stop();
    }

    // ───── Partie B : l'allure remonte à « régulier »
    const srvB = await L.startServer({ tasks: B.tasks, game: B.game, ledger: B.ledger });
    try {
      const { page, context } = await newPage({}, { hasTouch: true, isMobile: tag < 700 });
      await context.addInitScript(L.VOICES);
      await page.clock.install({ time: at(B.day) });
      await page.goto(srvB.url);
      await L.ready(page);
      await L.closeWelcome(page, 1500);
      const mot = await L.waitFor(() => bulle(page), 5000);
      R.check('élan : Fanal dit une variante de « allure.elan »', variantes('allure.elan').includes(sp(mot)), String(mot));
      await shot(page, '39-fanal-elan');
      R.check('élan : la phrase est lue une fois', (await ditsAllure(page)).length === 1, JSON.stringify(await ditsAllure(page)));
      const iB = imprevusSemaine(srvB, B.w);
      R.check('régulier : le mauvais imprévu du jour frappe, deux imprévus dans la semaine',
        iB.length === 2 && (srvB.game().degats || []).some((d) => d.le === B.day), JSON.stringify({ iB, degats: srvB.game().degats }));
      const b = await bilan(page);
      R.check('bilan : « Allure : régulier (N quêtes en 14 jours) », deux crans, l’effet du rythme de base',
        b.allure?.mot === motAllure('regulier', aB.quetes) && b.allure.crans?.on === 2 && b.allure.effet === effetAllure('regulier'), JSON.stringify(b.allure));
      R.check('bilan : rien ne déborde, aucun défilement horizontal', (await horsEcran(page, '#dlg-review')).length === 0 && await sansDefilement(page));
      await page.evaluate(() => document.querySelector('#dlg-review .review-allure').scrollIntoView({ block: 'center' }));
      await shot(page, '39-bilan-regulier');
      await fermerBilan(page);
      await page.reload();
      await L.ready(page);
      await L.closeWelcome(page, 1500);
      await page.waitForTimeout(2500);
      const rebulle = await bulle(page);
      R.check('rechargement : Fanal ne redit pas l’allure', (await ditsAllure(page)).length === 0 && !ALLURE_DITS.includes(sp(rebulle)), JSON.stringify({ dits: await ditsAllure(page), rebulle }));
      await page.close();

      const { page: p2, context: c2 } = await newPage({}, {});
      await c2.addInitScript(L.VOICES);
      await p2.clock.install({ time: at(B.day) });
      await p2.goto(srvB.url);
      await L.ready(p2);
      await L.closeWelcome(p2, 1500);
      const mot2 = await L.waitFor(() => bulle(p2), 5000);
      await p2.waitForTimeout(500);
      R.check('second appareil : Fanal le dit aussi, une fois', variantes('allure.elan').includes(sp(mot2)) && (await ditsAllure(p2)).length === 1, JSON.stringify({ mot2, dits: await ditsAllure(p2) }));
      await p2.close();
    } finally {
      srvB.stop();
    }

    // ───── Partie C : plein régime
    const srvC = await L.startServer({ tasks: C.tasks, game: C.game, ledger: C.ledger });
    try {
      const { page, context } = await newPage({}, {});
      await context.addInitScript(L.VOICES);
      await page.clock.install({ time: at(C.day) });
      await page.goto(srvC.url);
      await L.ready(page);
      await L.closeWelcome(page, 1500);
      const mot = await L.waitFor(() => bulle(page), 5000);
      R.check('plein régime : Fanal dit une variante de « allure.elan »', variantes('allure.elan').includes(sp(mot)), String(mot));
      R.check('plein régime : le créneau en plus du calendrier régulier est tiré', srvC.ledger().some((e) => e.key === `imprevu:${C.day}`), JSON.stringify(imprevusSemaine(srvC, C.w)));
      const b = await bilan(page);
      R.check('bilan : « Allure : plein régime (N quêtes en 14 jours) », trois crans, l’effet du plein régime',
        b.allure?.mot === motAllure('plein', aC.quetes) && b.allure.crans?.on === 3 && b.allure.effet === effetAllure('plein'), JSON.stringify(b.allure));
      R.check('bilan : rien ne déborde, aucun défilement horizontal', (await horsEcran(page, '#dlg-review')).length === 0 && await sansDefilement(page));
      await page.evaluate(() => document.querySelector('#dlg-review .review-allure').scrollIntoView({ block: 'center' }));
      await shot(page, '39-bilan-plein');
      await page.close();
    } finally {
      srvC.stop();
    }
  }, { tasks: TASKS_B, game: (k) => L.quietState(k) });
})();
