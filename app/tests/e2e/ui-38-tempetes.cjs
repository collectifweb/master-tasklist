// 38. L'hiver et ses tempêtes (lot H), à l'écran. Une tempête de l'hiver prochain, tirée par le calendrier (jamais dans
// le passé, hors de la trêve), avec un village dont les premiers pas sont faits depuis longtemps.
//   Partie A (version d'essai, « Jour suivant » à travers l'annonce) :
//   - quatre jours avant : l'île est sous la neige, ni alerte, ni front ;
//   - l'annonce (J-3) : la rangée « Tempête dans 3 jours », « 0 sur 3 », « Rentrer du bois · 3 Matériaux » ; le front de
//     givre paraît ; Fanal l'annonce une fois (et pas au rechargement), la phrase lue dit la barre et le prix ; la carte en
//     liste le dit ;
//   - un double toucher sur « Rentrer du bois » ne paie qu'un cran ; un second cran ensuite ; sans assez de Matériaux, le
//     bouton est verrouillé et un toucher ne dépense rien, la raison est dite ; une quête payée remplit le dernier cran :
//     « Le village est prêt » ;
//   - « Jour suivant » jusqu'au jour même : le titre suit les jours, le front s'approche ; la tempête est tenue, payée une
//     fois au registre (6 Matériaux), aucun dégât ; Fanal et la phrase lue le disent.
//   Partie B (le jour d'une tempête vue mais pas préparée) :
//   - un bâtiment est sous la neige : registre, dégât, marque braise, nom sur la carte, rangée « … sous la neige » ; Fanal
//     et la carte en liste le disent ;
//   - « Déneiger » de la rangée ouvre sa fiche : « Sous la neige », « Déneiger · 2 Énergie », la quête Terrain, la fonte ;
//   - deux appareils : le second déneige au clavier (Fanal le salue), le premier, pas encore relu, aussi : payé une fois,
//     le premier dit pourquoi.
//   Partie C (première largeur seulement) : absent pendant toute l'annonce, la tempête passe sans rien abîmer.
// Données fictives seulement. Chaque geste attend l'écriture du serveur avant de la vérifier.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const REPLIQUES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'), 'utf8'));
const variantes = (sit) => REPLIQUES.situations[sit].variantes.map((v) => sp(v.texte));
const at = (day, h = 15) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`); // 10 h à Montréal

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const { addDays, weekStart, calendrierImprevus, isTruce, tempetesDeLHiver } = core;

  // ───── la tempête : la première de l'hiver prochain dont l'annonce et la veille de l'annonce sont hors de la trêve, en
  // décembre au plus tôt (la neige est au sol quatre jours avant)
  const auj = new Date().toISOString().slice(0, 10);
  let J = null;
  for (let y = Number(auj.slice(0, 4)); y < Number(auj.slice(0, 4)) + 3 && !J; y++) {
    J = tempetesDeLHiver(`${y}-12-01`).find((j) => j > addDays(auj, 7) && j >= `${y}-12-01` && ![0, 1, 2, 3, 4].some((k) => isTruce(addDays(j, -k)))) || null;
  }
  if (!J) throw new Error('aucune tempête trouvée dans les trois prochains hivers');
  const AVANT = addDays(J, -4);
  const avant = tempetesDeLHiver(J).filter((j) => j < J);

  // les créneaux d'imprévus des semaines en jeu, déjà tirés (orignal sans effet) ; les tempêtes d'avant, déjà réglées
  const calme = (jours) => {
    const out = [];
    for (const lundi of new Set(jours.map(weekStart))) {
      // inscrits un mois plus tôt : l'orignal n'est montré aucun des jours du scénario
      for (const c of calendrierImprevus(lundi).creneaux) out.push({ key: `imprevu:${c.jour}`, at: at(addDays(lundi, -30)).toISOString(), day: addDays(lundi, -30), type: 'imprevu', imprevu: 'orignal', pe: 0, energy: 0, materials: 0 });
    }
    for (const j of avant) out.push({ key: `tempete:${j}`, at: at(j).toISOString(), day: j, type: 'tempete', tempete: j, resultat: 'passee', raison: 'absent', pe: 0, energy: 0, materials: 0 });
    return out;
  };
  const village = (day, over = {}) => {
    const g = L.quietState(core, at(day));
    g.resources = { energy: 10, materials: 7, food: 5 };
    g.habitants = 2;
    g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, addDays(day, -30)]));
    g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }, { id: 'eolienne-1', type: 'eolienne' }];
    g.parcelles = [{ id: 'serre-1', semeLe: addDays(day, -1) }];
    g.lastSeenDay = addDays(day, -1);
    return Object.assign(g, over);
  };
  const TASKS = (ref) => Array.from({ length: 6 }, (_, k) => ({
    id: `t${k}`, task: `Petite quête ordinaire ${k + 1}`, domain: ['Maison', 'Administratif', 'Maison'][k % 3],
    difficulty: 2, length: 2, priority: 9 - k, status: 'todo', created: addDays(ref, -3),
  }));

  // Partie B : le jour même, annonce vue la veille, rien de préparé ; le bâtiment enseveli est celui que tire le cœur
  const etatB = () => village(J, { resources: { energy: 10, materials: 2, food: 5 } });
  const ledgerB = () => calme([J]);
  const rB = core.advanceTime(TASKS(J), etatB(), ledgerB(), { gameRevision: 1 }, at(J).toISOString());
  const evB = rB.events.find((e) => e.type === 'tempete');
  if (!evB || evB.resultat !== 'neige') throw new Error(`partie B : la tempête du ${J} devait ensevelir un bâtiment (${JSON.stringify(evB)})`);
  const CIBLE = evB.cible;
  const NOM = CIBLE.startsWith('serre') ? 'Petite serre' : 'Éolienne';

  // ───── lectures de l'écran
  const bulle = (page) => page.evaluate(() => { const e = document.getElementById('speech'); return e.hidden ? null : e.querySelector('.speech-text')?.textContent || null; });
  const alerte = (page) => page.evaluate(() => {
    const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const box = document.getElementById('bandeau-alerte');
    const band = document.getElementById('bandeau').getBoundingClientRect();
    const go = box.querySelector('.bandeau-alerte-go');
    const r = go.getBoundingClientRect();
    const front = document.querySelector('.ow-front');
    return {
      vu: !box.hidden && box.checkVisibility(), etat: document.getElementById('bandeau').dataset.alerte || '',
      titre: s(box.querySelector('.bandeau-alerte-titre').textContent), ligne: s(box.querySelector('.bandeau-alerte-etat').textContent),
      crans: box.querySelectorAll('.bandeau-crans i[data-on]').length,
      go: go.hidden ? null : { text: s(go.innerText), label: go.getAttribute('aria-label'), off: go.getAttribute('aria-disabled') === 'true', h: Math.round(r.height), w: Math.round(r.width) },
      coupe: [...box.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.left < band.left - 1 || b.right > band.right + 1); }).length,
      neige: document.querySelector('.ow').hasAttribute('data-neige'),
      front: front && !front.hasAttribute('hidden') ? front.firstElementChild.style.transform : null,
      deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  const fiche = (page) => page.evaluate(() => {
    const d = document.getElementById('dlg-batiment');
    const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const blk = d.querySelector('.degat');
    const go = blk?.querySelector('.degat-go');
    return {
      open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '',
      degat: blk ? {
        type: blk.dataset.degat, etat: blk.dataset.etat, titre: s(blk.querySelector('.degat-titre')?.textContent), effet: s(blk.querySelector('.degat-effet')?.textContent),
        go: go ? { text: `${s(go.querySelector('span').textContent)} · ${s(go.querySelector('.degat-prix').textContent)}`, off: go.getAttribute('aria-disabled') === 'true', h: go.getBoundingClientRect().height } : null,
        voies: [...blk.querySelectorAll('.degat-voies li')].map((li) => s(li.textContent)), fait: s(blk.querySelector('.degat-fait')?.textContent),
      } : null,
    };
  });
  async function plan(page) {
    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    await page.waitForTimeout(400);
    const p = await page.evaluate(() => {
      const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      const ul = document.querySelector('#dlg-plan .ow-plan-summary');
      return {
        resume: ul.hidden ? [] : [...ul.querySelectorAll('li')].map((li) => s(li.textContent)),
        bats: Object.fromEntries([...document.querySelectorAll('#dlg-plan [data-bat]')].map((b) => [b.dataset.bat, s(b.closest('.ow-plan-bat').querySelector('.ow-plan-bat-etat').textContent)])),
      };
    });
    await page.keyboard.press('Escape');
    await L.waitFor(() => page.evaluate(() => !document.querySelector('dialog[open]')), 3000);
    return p;
  }
  const jourSuivant = async (page, srv, k) => {
    await L.openPanel(page);
    await page.click('[data-action="jour-suivant"]');
    await L.waitFor(() => srv.game()?.horloge?.decalage === k, 5000);
    await L.closeWelcome(page, 2500);
  };
  const fait = async (page, srv, day) => {
    await L.openPanel(page);
    await page.click('#fil-quest [data-action="complete"]');
    return L.waitFor(() => srv.ledger().some((e) => e.type === 'reward' && e.day === day), 5000);
  };
  const dits = async (page) => (await L.said(page)).map((x) => sp(x.text));
  const tempetes = (srv) => srv.ledger().filter((e) => e.type === 'tempete' && !avant.includes(e.tempete));
  const res = (g) => JSON.stringify(g.resources);
  const marque = (page, id) => page.evaluate((id) => !!document.querySelector(`.ow-ent[data-id="${id}"] .ow-mark[data-degat="neige"]`), id);
  const nomCarte = (page, id) => page.evaluate((id) => document.querySelector(`.ow-ent[data-id="${id}"]`)?.getAttribute('aria-label') || '', id);
  const toucher = async (page, sel) => { const r = await L.rect(page, sel); await page.touchscreen.tap(r.x + r.w / 2, r.y + r.h / 2); };

  await L.runScenario('38. l’hiver et ses tempêtes', async ({ R, srv, newPage, shot, tag }) => {
    // ───── Partie A : quatre jours avant
    const { page, context } = await newPage({}, { hasTouch: true, isMobile: tag < 700 });
    await context.addInitScript(L.VOICES);
    await page.clock.install({ time: at(AVANT) });
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    let a = await alerte(page);
    R.check(`${AVANT} : l’île est sous la neige, ni alerte ni front`, a.neige && !a.vu && !a.etat && a.front === null, JSON.stringify(a));

    // l'annonce
    await L.said(page, true);
    await jourSuivant(page, srv, 1);
    a = await L.waitFor(async () => { const x = await alerte(page); return x.vu ? x : null; }, 4000) || await alerte(page);
    R.check('annonce : « Tempête dans 3 jours », « 0 sur 3 », « Rentrer du bois 3 Matériaux »', a.titre === 'Tempête dans 3 jours' && a.ligne === '0 sur 3' && a.crans === 0
      && a.go?.text === 'Rentrer du bois 3 Matériaux' && a.go.label === 'Rentrer du bois pour 3 Matériaux' && !a.go.off, JSON.stringify(a));
    R.check('annonce : bouton de 44 px au moins, rien ne sort du bandeau, aucun défilement horizontal', a.go?.h >= 44 && a.coupe === 0 && !a.deborde, JSON.stringify(a));
    R.check('annonce : le front de givre paraît, au large', !!a.front, String(a.front));
    const front3 = a.front;
    const motA = await L.waitFor(async () => { const m = sp(await bulle(page)); return variantes('tempete.annonce').includes(m) ? m : null; }, 12000);
    R.check('annonce : Fanal la raconte (une variante de « tempete.annonce »)', !!motA, String(await bulle(page)));
    const dA = await dits(page);
    R.check('annonce : la phrase lue dit la barre et le prix', dA.some((x) => x.includes(`Fanal : ${motA}`) && x.includes('Tempête annoncée dans 3 jours. Chaque jour où tu termines une quête remplit un cran de la barre; il en faut 3. Un cran manqué s’achète : rentrer du bois coûte 3 Matériaux.')), JSON.stringify(dA));
    const pA = await plan(page);
    R.check('carte en liste : la tempête et la neige', pA.resume[0] === 'Tempête dans 3 jours : son front de glace approche du bord de l’Atelier.' && pA.resume[1] === 'L’île est sous la neige.', JSON.stringify(pA.resume));
    await shot(page, '38-annonce');
    await page.reload();
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await page.waitForTimeout(2500);
    R.check('rechargement : Fanal ne répète pas l’annonce', !variantes('tempete.annonce').includes(sp(await bulle(page))), String(await bulle(page)));

    // « Rentrer du bois » : un double toucher, un seul cran
    const g0 = srv.game();
    await L.said(page, true);
    await toucher(page, '.bandeau-alerte-go');
    await page.waitForTimeout(120);
    await toucher(page, '.bandeau-alerte-go');
    await page.waitForTimeout(1500);
    let g = srv.game();
    R.check('double toucher : un seul cran payé (3 Matériaux)', g.prepa?.jour === J && g.prepa.achetes === 1 && g.resources.materials === g0.resources.materials - 3, `${res(g0)} → ${res(g)} ${JSON.stringify(g.prepa)}`);
    a = await alerte(page);
    R.check('un cran rentré : « 1 sur 3 », un cran plein', a.ligne === '1 sur 3' && a.crans === 1, JSON.stringify(a));
    R.check('phrase lue : « Bois rentré, pour 3 Matériaux. Préparation : 1 sur 3. »', (await dits(page)).some((x) => x.startsWith('Bois rentré, pour 3 Matériaux. Préparation : 1 sur 3.')), JSON.stringify(await dits(page)));
    await page.waitForTimeout(900);
    await toucher(page, '.bandeau-alerte-go');
    g = await L.waitFor(() => (srv.game().prepa?.achetes === 2 ? srv.game() : null), 4000) || srv.game();
    R.check('second cran : payé, « 2 sur 3 »', g.prepa?.achetes === 2 && g.resources.materials === g0.resources.materials - 6 && (await alerte(page)).ligne === '2 sur 3', `${res(g)} ${JSON.stringify(g.prepa)}`);
    // plus assez de Matériaux : verrouillé, un toucher ne dépense rien et dit pourquoi
    a = await L.waitFor(async () => { const x = await alerte(page); return x.go?.off ? x : null; }, 3000) || await alerte(page);
    R.check('sans assez de Matériaux : « Rentrer du bois » verrouillé', a.go?.off === true, JSON.stringify(a.go));
    await page.waitForTimeout(900);
    await L.said(page, true);
    await toucher(page, '.bandeau-alerte-go');
    await page.waitForTimeout(800);
    const note = await page.evaluate(() => { const n = document.getElementById('notice'); return n && !n.hidden ? n.textContent : ''; });
    R.check('verrouillé : rien de dépensé, la raison est affichée et lue', srv.game().prepa.achetes === 2 && /Il manque 2 Matériaux\./.test(note) && (await dits(page)).includes('Il manque 2 Matériaux.'), `${note} / ${JSON.stringify(await dits(page))}`);
    // une quête payée remplit le dernier cran
    R.check('annonce : une quête payée', !!(await fait(page, srv, addDays(J, -3))));
    a = await L.waitFor(async () => { const x = await alerte(page); return x.etat === 'pret' ? x : null; }, 4000) || await alerte(page);
    R.check('barre pleine : « Le village est prêt », trois crans, plus de bouton', a.ligne === 'Le village est prêt' && a.crans === 3 && !a.go, JSON.stringify(a));
    await shot(page, '38-prete');

    // jusqu'au jour même
    await jourSuivant(page, srv, 2);
    a = await alerte(page);
    R.check('J-2 : « Tempête dans 2 jours », le front s’approche', a.titre === 'Tempête dans 2 jours' && !!a.front && a.front !== front3, JSON.stringify(a));
    await jourSuivant(page, srv, 3);
    a = await alerte(page);
    R.check('veille : « Tempête demain »', a.titre === 'Tempête demain', JSON.stringify(a));
    await L.said(page, true);
    const m0 = srv.game().resources.materials;
    await jourSuivant(page, srv, 4);
    const eT = await L.waitFor(() => tempetes(srv).find((e) => e.key === `tempete:${J}`), 5000);
    R.check('jour même : tempête tenue, au registre une fois, 6 Matériaux', eT?.resultat === 'tenue' && eT.materials === 6 && tempetes(srv).length === 1, JSON.stringify(tempetes(srv)));
    R.check('jour même : aucun dégât, 6 Matériaux de plus', !(srv.game().degats || []).length && Math.round((srv.game().resources.materials - m0) * 10) / 10 === 6, `${m0} → ${res(srv.game())}`);
    a = await L.waitFor(async () => { const x = await alerte(page); return x.etat === 'tenue' ? x : null; }, 4000) || await alerte(page);
    R.check('jour même : « Tempête aujourd’hui », « Tenue : 6 Matériaux de plus »', a.titre === 'Tempête aujourd’hui' && a.ligne === 'Tenue : 6 Matériaux de plus' && !a.go, JSON.stringify(a));
    const motT = await L.waitFor(async () => { const m = sp(await bulle(page)); return variantes('tempete.tenue').includes(m) ? m : null; }, 12000);
    R.check('jour même : Fanal le dit (une variante de « tempete.tenue »)', !!motT, String(await bulle(page)));
    R.check('jour même : la phrase lue le dit', (await dits(page)).some((x) => x.includes('Tempête tenue : le village était prêt.')), JSON.stringify(await dits(page)));
    await shot(page, '38-tenue');
    await page.close();

    // ───── Partie B : le jour d'une tempête vue, pas préparée
    const srvB = await L.startServer({ tasks: TASKS(J), game: etatB(), ledger: ledgerB(), sandbox: true });
    try {
      const { page: pb, context: cb } = await newPage({}, { hasTouch: true, isMobile: tag < 700 });
      await cb.addInitScript(L.VOICES);
      await pb.clock.install({ time: at(J) });
      await pb.goto(srvB.url);
      await L.ready(pb);
      await L.closeWelcome(pb, 1500);
      const eN = await L.waitFor(() => srvB.ledger().find((e) => e.key === `tempete:${J}`), 5000);
      const d = (srvB.game().degats || []).find((x) => x.id === `neige:${J}`);
      R.check(`tempête : ${CIBLE} sous la neige, au registre et dans la partie (3 jours)`, eN?.resultat === 'neige' && eN.cible === CIBLE && d?.cible === CIBLE && d.jusqua === addDays(J, 3), JSON.stringify({ eN, d }));
      a = await L.waitFor(async () => { const x = await alerte(pb); return x.etat === 'neige' ? x : null; }, 4000) || await alerte(pb);
      R.check(`rangée : « Tempête aujourd’hui », « ${NOM} sous la neige », « Déneiger »`, a.titre === 'Tempête aujourd’hui' && a.ligne === `${NOM} sous la neige` && a.go?.text === 'Déneiger' && a.go.h >= 44, JSON.stringify(a));
      R.check('carte : la marque braise (pelle) sur le bâtiment, son nom le dit', await marque(pb, CIBLE) && /sous la neige, fond dans 3 jours/.test(sp(await nomCarte(pb, CIBLE))), await nomCarte(pb, CIBLE));
      const motN = await L.waitFor(async () => { const m = sp(await bulle(pb)); return variantes('tempete.neige').includes(m) ? m : null; }, 12000);
      R.check('tempête : Fanal la raconte (une variante de « tempete.neige »)', !!motN, String(await bulle(pb)));
      const pB = await plan(pb);
      R.check('carte en liste : la tempête, la neige, et l’état du bâtiment', pB.resume[0] === 'Tempête aujourd’hui : son front de glace touche le bord de l’Atelier.' && pB.resume[1] === 'L’île est sous la neige.' && /^sous la neige, fond dans 3 jours/i.test(pB.bats[CIBLE] || ''), JSON.stringify(pB));
      await shot(pb, '38-neige');

      // la rangée ouvre la fiche
      await pb.click('.bandeau-alerte-go');
      let f = await L.waitFor(async () => { const x = await fiche(pb); return x.open && x.id === CIBLE ? x : null; }, 4000);
      await pb.waitForTimeout(700);
      R.check('« Déneiger » ouvre la fiche : « Sous la neige », « Déneiger · 2 Énergie »', f?.degat?.type === 'neige' && f.degat.titre === 'Sous la neige' && f.degat.go?.text === 'Déneiger · 2 Énergie' && !f.degat.go.off && f.degat.go.h >= 44, JSON.stringify(f));
      R.check('fiche : les deux autres voies, une quête Terrain et la fonte', f?.degat?.voies[0] === 'Ou termine une quête Terrain : elle règle ça, gratuitement.' && f.degat.voies[1] === 'Sinon, la neige fond dans 3 jours.', JSON.stringify(f?.degat?.voies));
      await shot(pb, '38-fiche');

      // deux appareils : le second déneige au clavier, le premier (pas encore relu) aussi
      const { page: p3, context: c3 } = await newPage({}, {});
      await c3.addInitScript(L.VOICES);
      await p3.clock.install({ time: at(J) });
      await p3.goto(srvB.url);
      await L.ready(p3);
      await L.closeWelcome(p3, 1500);
      await p3.waitForTimeout(600);
      await p3.click('.bandeau-alerte-go');
      await L.waitFor(async () => { const x = await fiche(p3); return x.open && x.id === CIBLE; }, 4000);
      await p3.waitForTimeout(700);
      const gR = srvB.game();
      await L.said(p3, true);
      await p3.focus('#dlg-batiment .degat-go');
      await p3.keyboard.press('Enter');
      const dR = await L.waitFor(() => { const x = (srvB.game().degats || []).find((y) => y.id === `neige:${J}`); return x?.fin ? x : null; }, 5000);
      R.check('second appareil : déneigé, 2 Énergie', dR?.par === 'paiement' && Math.round((gR.resources.energy - srvB.game().resources.energy) * 10) / 10 === 2, `${res(gR)} → ${res(srvB.game())}`);
      R.check('second appareil : « Bâtiment déneigé, pour 2 Énergie. » est lu', (await dits(p3)).some((x) => x.startsWith('Bâtiment déneigé, pour 2 Énergie.')), JSON.stringify(await dits(p3)));
      const motD = await L.waitFor(async () => { const m = sp(await bulle(p3)); return variantes('tempete.deneige').includes(m) ? m : null; }, 6000);
      R.check('second appareil : Fanal le salue (« tempete.deneige »)', !!motD, String(await bulle(p3)));
      await p3.close();
      const g2 = srvB.game();
      await toucher(pb, '#dlg-batiment .degat-go');
      await pb.waitForTimeout(2500);
      R.check('deux appareils : le déneigement n’est payé qu’une fois', res(srvB.game()) === res(g2), `${res(g2)} → ${res(srvB.game())}`);
      const pourquoi = await L.waitFor(() => pb.evaluate(() => { const n = document.getElementById('notice'); return n && !n.hidden && /Déjà déneigé/.test(n.textContent) ? n.textContent : null; }), 4000)
        || (await L.said(pb)).map((x) => x.text).find((t) => /Déjà déneigé/.test(t));
      R.check('premier appareil : remis à jour, il dit pourquoi (« Déjà déneigé »)', !!pourquoi, String(pourquoi));
      f = await fiche(pb);
      R.check('premier appareil : la fiche dit « Bâtiment déneigé aujourd’hui. »', f.degat?.etat === 'fait' && f.degat.fait === 'Bâtiment déneigé aujourd’hui.', JSON.stringify(f.degat));
      await pb.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
      await L.waitFor(() => pb.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
      await pb.waitForTimeout(400);
      R.check('carte : plus de marque sur le bâtiment déneigé', !(await marque(pb, CIBLE)));
      await pb.close();
    } finally {
      srvB.stop();
    }

    // ───── Partie C : absent pendant toute l'annonce (première largeur seulement)
    if (tag !== L.SIZES[0][0]) return;
    const srvC = await L.startServer({ tasks: TASKS(J), game: village(J, { lastSeenDay: addDays(J, -4) }), ledger: calme([J]), sandbox: true });
    try {
      const { page: pc } = await newPage({}, {});
      await pc.clock.install({ time: at(J) });
      await pc.goto(srvC.url);
      await L.ready(pc);
      await L.closeWelcome(pc, 1500);
      const eC = await L.waitFor(() => srvC.ledger().find((e) => e.key === `tempete:${J}`), 5000);
      R.check('absent pendant l’annonce : la tempête passe sans rien abîmer', eC?.resultat === 'passee' && !eC.cible && !(srvC.game().degats || []).length, JSON.stringify(eC));
      a = await L.waitFor(async () => { const x = await alerte(pc); return x.etat === 'passee' ? x : null; }, 4000) || await alerte(pc);
      R.check('rangée : « Passée sans rien abîmer », aucune marque', a.ligne === 'Passée sans rien abîmer' && !a.go && !(await marque(pc, 'serre-1')) && !(await marque(pc, 'eolienne-1')), JSON.stringify(a));
      await pc.waitForTimeout(2500);
      R.check('Fanal ne dit rien de la tempête', ![...variantes('tempete.neige'), ...variantes('tempete.tenue')].includes(sp(await bulle(pc))), String(await bulle(pc)));
    } finally {
      srvC.stop();
    }
  }, {
    tasks: TASKS(AVANT),
    sandbox: true,
    game: () => village(AVANT),
    ledger: () => calme([AVANT, J]),
  });
})();
