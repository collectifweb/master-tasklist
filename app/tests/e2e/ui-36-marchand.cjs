// 36. Le marchand au quai (lot V), à l'écran.
//   Partie A (un samedi, village au Hameau, sans quai) : aucune ligne du marchand dans le bandeau ; rebâtir le quai fait
//   accoster le marchand aussitôt : Fanal l'annonce (une variante de « marchand.arrive », lue avec la construction), le
//   chaland est sur la carte, et l'annonce ne revient pas au rechargement.
//   Partie B (même samedi, quai bâti, version d'essai) :
//   - arrivée : Fanal annonce une fois sur l'appareil le visiteur à commande de la semaine (lot C : le marchand, là chaque
//     semaine, n'est annoncé qu'au quai rebâti) ; chaland dans le dessin du quai, au repos en mouvement réduit ;
//   - « Cette semaine » : « Commande au quai, encore 2 jours » (lot C), qui ouvre la fiche du quai et son étal ; le
//     compte des quêtes dessous ;
//   - étal (lot G, piste B) : quatre tuiles, raisons du cœur (réserve pleine, manque), la première offre possible choisie à
//     l'ouverture, tuiles et « Échanger » de 44 px au moins, rien ne déborde ; choisir une tuile ne dépense rien ;
//   - un geste verrouillé ne dépense rien ; un double toucher sur « Échanger » n'échange qu'une fois ; au clavier (Espace sur
//     la tuile, Tab jusqu'à « Échanger », Entrée), le focus passe sur « Fait cette semaine » ; la phrase lue dit l'échange ;
//   - deux appareils : le second prend une offre, le premier (pas encore relu) la reprend : le serveur refuse, l'appareil se
//     remet à jour et dit pourquoi ; l'offre n'est payée qu'une fois ;
//   - carte en liste : le quai dit que le marchand est là (et la commande du visiteur) et ouvre l'étal ;
//   - « Jour suivant » : dimanche, dernier jour ; lundi, le marchand revient, offres de nouveau ouvertes, Fanal annonce le
//     visiteur à commande de la nouvelle semaine.
// Données fictives seulement. Chaque geste attend l'écriture du serveur avant de la vérifier.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
function nextSaturday() {
  const d = new Date();
  d.setUTCHours(14, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const SAMEDI = nextSaturday();
const ymd = (n) => new Date(SAMEDI.getTime() + n * 86400000).toISOString().slice(0, 10);
const LUNDI = ymd(-5);
const LUNDI_SUIVANT = ymd(2);
const TASKS = [
  { id: 'm1', task: 'Ranger la remise', domain: 'Terrain', difficulty: 3, length: 3, priority: 7, status: 'todo', created: ymd(-4) },
  { id: 'm2', task: 'Trier les papiers', domain: 'Administratif', difficulty: 2, length: 2, priority: 6, status: 'todo', created: ymd(-3) },
];
const REPLIQUES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'), 'utf8'));
const ARRIVEE = REPLIQUES.situations['marchand.arrive'].variantes.map((v) => v.texte);
// lot C : le mot de la semaine est celui du visiteur à commande (convoi, famille du Sud ou scientifique, selon la semaine)
const VISITEUR = (id) => REPLIQUES.situations[`commande.arrive.${id}`].variantes.map((v) => v.texte);
const BAT = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'batiments.json'), 'utf8'));

function village(core, { quai }) {
  const g = L.quietState(core, SAMEDI);
  // Nourriture au plafond (20) : réserve pleine. Sans Matériaux, l'offre Matériaux → Énergie manque (l'ouverture du jour en donne quelques-uns)
  g.resources = { energy: 64, materials: quai ? 0 : 40, food: 20 };
  g.habitants = 3;
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, ymd(-20)]));
  g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }];
  if (quai) g.batiments.push({ id: 'quai-1', type: 'quai' });
  return g;
}

// ───── lectures de l'écran
const bulle = (page) => page.evaluate(() => { const e = document.getElementById('speech'); return e.hidden ? null : e.querySelector('.speech-text')?.textContent || null; });
const bandeauVisiteur = (page) => page.evaluate(() => {
  const b = document.querySelector('.bandeau-visiteur');
  const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const d = document.querySelector('.bandeau-semaine-detail');
  return { shown: !b.hidden, text: s(b.textContent), detail: s(d.textContent), detailVu: d.checkVisibility() && d.getBoundingClientRect().height > 0, compte: !document.getElementById('bandeau-semaine').hidden };
});
const comptoir = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-batiment');
  const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const r = d.getBoundingClientRect();
  const barre = d.querySelector('.etal-barre');
  const go = barre?.querySelector('.etal-go');
  const gr = go?.getBoundingClientRect();
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '', now: s(d.querySelector('#bat-now')?.textContent),
    debord: [...d.querySelectorAll('.etal *, .etal-reserve *, .etal-barre *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.left < r.left - 1 || b.right > r.right + 1); }).map((e) => e.className.baseVal ?? e.className),
    // les quatre tuiles de la semaine (le troc lu, sans le point) ; le rachat du jour (lot T), dessous, a son scénario (ui-42)
    offres: [...d.querySelectorAll('.etal-offre:not([data-offre="materiaux-energie-jour"])')].map((li) => {
      const b = li.getBoundingClientRect();
      return { id: li.dataset.offre, etat: li.dataset.etat, choisie: li.querySelector('input').checked, troc: s(li.querySelector('.etal-carte > .sr-only').textContent).replace(/\.$/, ''), raison: s(li.querySelector('.offre-raison')?.textContent), off: li.dataset.etat === 'verrou', h: b.height, w: b.width };
    }),
    // la barre du pied : l'offre choisie et son geste
    barre: barre && { offre: barre.dataset.offre, etat: barre.dataset.etat, off: go ? go.getAttribute('aria-disabled') === 'true' : null, label: go ? go.getAttribute('aria-label') : null,
      raison: s(barre.querySelector('.etal-raison')?.textContent), fait: s(barre.querySelector('.etal-fait')?.textContent), h: gr ? gr.height : 0, w: gr ? gr.width : 0 },
  };
});
const offre = (c, id) => (c && c.offres.find((o) => o.id === id)) || {};
async function ouvrirParBandeau(page, compact, clavier = false) {
  // panneau ouvert (après « Jour suivant ») : il couvre la carte des objectifs dépliée, on le replie d'abord
  if (compact && await page.evaluate(() => document.getElementById('app').dataset.panel === 'open')) { await page.click('[data-action="toggle-panel"]'); await page.waitForTimeout(450); }
  if (compact && await page.getAttribute('.bandeau-more', 'aria-expanded') !== 'true') { await page.click('.bandeau-more'); await page.waitForTimeout(300); }
  if (clavier) { await page.focus('.bandeau-visiteur'); await page.keyboard.press('Enter'); } else await page.click('.bandeau-visiteur');
  const c = await L.waitFor(async () => { const x = await comptoir(page); return x.open && x.offres.length === 4 ? x : null; }, 4000);
  await page.waitForTimeout(700); // un toucher juste après l'ouverture serait le second de celui qui l'a ouverte
  return c;
}
async function fermer(page) {
  await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
}
const centre = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const tuile = (id) => `#dlg-batiment .etal-offre[data-offre="${id}"]`;
const GO = '#dlg-batiment .etal-go';
// choisir une offre (toucher ou clic sur sa tuile) : seule la barre du pied change
async function choisir(page, id) {
  await page.click(tuile(id));
  return L.waitFor(async () => { const c = await comptoir(page); return c.barre?.offre === id ? c : null; }, 2000);
}
const jourSuivant = async (page, srv, k) => {
  await L.openPanel(page);
  await page.click('[data-action="jour-suivant"]');
  await L.waitFor(() => srv.game()?.horloge?.decalage === k, 5000);
  await L.closeWelcome(page, 2500);
};
const res = (g) => JSON.stringify(g.resources);

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const v0 = core.commandeDeLaSemaine(village(core, { quai: true }), [], SAMEDI.toISOString()).id;
  const v1 = core.commandeDeLaSemaine(village(core, { quai: true }), [], `${LUNDI_SUIVANT}T14:00:00Z`).id;

  await L.runScenario('36. le marchand au quai', async ({ R, srv, newPage, shot, tag }) => {
    const compact = tag < 700;

    // ───── Partie A : sans quai, puis le quai rebâti
    const sans = await L.startServer({ tasks: TASKS, game: village(core, { quai: false }) });
    try {
      const { page: p0, context: c0 } = await newPage();
      await c0.addInitScript(L.VOICES);
      await p0.clock.install({ time: SAMEDI });
      await p0.goto(sans.url);
      await L.ready(p0);
      await L.closeWelcome(p0, 1500);
      await p0.waitForTimeout(800);
      const b0 = await bandeauVisiteur(p0);
      R.check('sans quai : aucune ligne du marchand, « Cette semaine » garde le compte des quêtes', !b0.shown && b0.compte, JSON.stringify(b0));
      R.check('sans quai : Fanal n’annonce aucun marchand', !ARRIVEE.includes(await bulle(p0)), String(await bulle(p0)));
      await p0.click('[data-ow="build"]');
      await p0.waitForSelector('#dlg-construire[open]');
      await p0.waitForTimeout(700);
      await L.said(p0, true);
      await p0.click('#dlg-construire .cat-row[data-type="quai"] .cat-go');
      R.check('quai rebâti : le serveur l’enregistre', !!await L.waitFor(() => sans.game().batiments.some((b) => b.id === 'quai-1'), 5000));
      const mot = await L.waitFor(() => bulle(p0), 4000);
      R.check('quai rebâti : Fanal annonce le marchand (une variante de « marchand.arrive »)', ARRIVEE.includes(mot), String(mot));
      const dits = await L.waitFor(async () => { const d = (await L.said(p0)).map((x) => sp(x.text)); return d.some((t) => /Quai : c’est bâti\./.test(t)) ? d : null; }, 3000)
        || (await L.said(p0)).map((x) => sp(x.text));
      R.check('quai rebâti : la construction et le mot de Fanal sont lus ensemble', dits.some((t) => /Quai : c’est bâti\./.test(t) && t.includes(`Fanal : ${sp(mot)}`)), JSON.stringify({ dits, live: await p0.evaluate(() => document.getElementById('live').textContent) }));
      R.check('quai rebâti : la ligne du marchand paraît dans le bandeau', !!await L.waitFor(async () => (await bandeauVisiteur(p0)).shown, 3000));
      const quaiDessin = await p0.evaluate(() => { const e = document.querySelector('.ow-ent[data-id="quai-1"]'); return { barge: !!e?.querySelector('.ow-barge'), label: e?.getAttribute('aria-label') || '' }; });
      R.check('quai rebâti : le chaland est amarré, et le nom du quai le dit', quaiDessin.barge && /le marchand est au quai, encore 2 jours/.test(sp(quaiDessin.label)), JSON.stringify(quaiDessin));
      R.check('appareil : la semaine de l’annonce est notée', await p0.evaluate(() => localStorage.getItem('oree.visite.v1')) === LUNDI);
      await p0.reload();
      await L.ready(p0);
      await L.closeWelcome(p0, 1500);
      await p0.waitForTimeout(1500);
      const b0r = await bulle(p0);
      R.check('rechargement : Fanal ne répète pas l’arrivée, ni n’annonce le visiteur de la semaine', !ARRIVEE.includes(b0r) && !VISITEUR(v0).includes(b0r), String(b0r));
      // toucher le chaland sur la carte (vue de départ) ouvre la fiche du quai et son comptoir
      const pb = await p0.evaluate(() => {
        const r = document.querySelector('.ow-ent[data-id="quai-1"] .ow-barge').getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        return { x, y, quai: !!document.elementFromPoint(x, y)?.closest('.ow-ent[data-id="quai-1"]') };
      });
      R.check('chaland : sous le doigt, c’est le quai', pb.quai, JSON.stringify(pb));
      await p0.mouse.click(pb.x, pb.y);
      const cb = await L.waitFor(async () => { const x = await comptoir(p0); return x.open && x.offres.length === 4 ? x : null; }, 4000);
      R.check('chaland : le toucher ouvre l’étal du quai', !!cb && cb.id === 'quai-1', String(cb && cb.id));
      await p0.close();
    } finally {
      sans.stop();
    }

    // ───── Partie B : quai bâti, premier appareil (toucher)
    const { page, context } = await newPage({}, { hasTouch: true, isMobile: compact });
    await context.addInitScript(L.VOICES);
    await page.clock.install({ time: SAMEDI });
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    const arrivee = await L.waitFor(() => bulle(page), 5000);
    R.check('arrivée : Fanal annonce le visiteur à commande de la semaine à la première visite', VISITEUR(v0).includes(arrivee), String(arrivee));
    R.check('arrivée : son mot est lu (« Fanal : … »)', (await L.said(page)).some((x) => sp(x.text) === `Fanal : ${sp(arrivee)}`), JSON.stringify(await L.said(page)));

    if (compact) { await page.click('.bandeau-more'); await page.waitForTimeout(300); } // en compact, le compte est dans la carte dépliée
    const b1 = await bandeauVisiteur(page);
    R.check('« Cette semaine » : « Commande au quai, encore 2 jours », le compte des quêtes visible dessous', b1.shown && b1.text === 'Commande au quai, encore 2 jours' && !b1.compte && /quête/.test(b1.detail) && b1.detailVu, JSON.stringify(b1));
    let c = await ouvrirParBandeau(page, compact);
    R.check('bandeau : sa ligne ouvre la fiche du quai', c.id === 'quai-1', c.id);
    R.check('fiche : « Maintenant » dit jusqu’à quand', c.now === 'Le marchand est au quai jusqu’à dimanche : encore 2 jours.', c.now);
    R.check('étal : quatre tuiles dans l’ordre, chacune « ce que tu donnes → ce que tu reçois »',
      c.offres.map((o) => o.troc).join(' | ') === '30 Énergie contre 15 Matériaux | 20 Énergie contre 10 Nourriture | 15 Matériaux contre 15 Énergie | 10 Nourriture contre 10 Énergie', JSON.stringify(c.offres.map((o) => o.troc)));
    const gA = srv.game();
    const manqueM = sp(core.refusEchanger(gA, { offre: 'materiaux-energie' }, SAMEDI.toISOString()));
    R.check('étal : réserve pleine, manque de Matériaux (raisons du cœur), deux offres ouvertes',
      offre(c, 'energie-materiaux').etat === 'libre' && offre(c, 'nourriture-energie').etat === 'libre'
      && offre(c, 'energie-nourriture').off && offre(c, 'energie-nourriture').raison === 'La réserve est pleine (20 sur 20).'
      && /^Il manque \d+ Matériaux?\.$/.test(manqueM) && offre(c, 'materiaux-energie').off && offre(c, 'materiaux-energie').raison === manqueM, JSON.stringify({ manqueM, res: gA.resources, offres: c.offres }));
    R.check('étal : à l’ouverture, la première offre possible est choisie, et la barre la montre', offre(c, 'energie-materiaux').choisie && c.barre?.offre === 'energie-materiaux' && c.barre.etat === 'libre' && !c.barre.off, JSON.stringify(c.barre));
    R.check('barre : « Échanger » dit l’échange entier (« Échanger 30 Énergie contre 15 Matériaux »)', c.barre?.label === 'Échanger 30 Énergie contre 15 Matériaux', String(c.barre?.label));
    R.check('étal : tuiles et « Échanger » de 44 px au moins', c.offres.every((o) => o.h >= 43.99 && o.w >= 44) && c.barre.h >= 43.99 && c.barre.w >= 44, JSON.stringify([c.offres.map((o) => [o.w, o.h]), [c.barre.w, c.barre.h]]));
    R.check('étal : rien ne déborde de la fiche', c.debord.length === 0, JSON.stringify(c.debord));
    await shot(page, '36-comptoir');

    // choisir une offre verrouillée ne dépense rien ; son geste non plus, et sa raison est redite
    c = await choisir(page, 'energie-nourriture');
    R.check('offre verrouillée choisie : la barre montre le bouton verrouillé et la raison du cœur', c?.barre.etat === 'verrou' && c.barre.off && c.barre.raison === 'La réserve est pleine (20 sur 20).', JSON.stringify(c?.barre));
    R.check('choisir : rien n’est échangé', res(srv.game()) === res(gA) && !srv.game().visite, res(srv.game()));
    await L.said(page, true);
    await page.click(GO, { force: true }); // verrouillé (aria-disabled) : Playwright attendrait qu'il s'ouvre
    await page.waitForTimeout(700);
    R.check('offre verrouillée : rien n’est échangé', res(srv.game()) === res(gA) && !srv.game().visite, res(srv.game()));
    R.check('offre verrouillée : la raison est lue', (await L.said(page)).some((x) => sp(x.text) === 'La réserve est pleine (20 sur 20).'), JSON.stringify(await L.said(page)));

    // double toucher sur « Échanger » : un seul échange. On note où tombent les deux touchers : sur le bouton ouvert (la
    // garde de 800 ms le retient), ou sur « Fait cette semaine » qui l'a déjà remplacé (rien à toucher).
    await choisir(page, 'energie-materiaux');
    await L.said(page, true);
    const l0 = srv.ledger().length;
    const pt = await centre(page, GO);
    await page.evaluate(() => { window.__taps = []; document.addEventListener('click', (e) => window.__taps.push(e.target.closest('.etal-go:not([aria-disabled])') ? 'echanger' : e.target.closest('.etal-fait') ? 'fait' : String(e.target.className.baseVal ?? e.target.className)), true); });
    await page.touchscreen.tap(pt[0], pt[1]);
    await page.waitForTimeout(150);
    await page.touchscreen.tap(pt[0], pt[1]);
    const taps = await page.evaluate(() => window.__taps);
    R.check('double toucher : le premier tombe sur « Échanger », le second sur « Échanger » ou sur « Fait cette semaine »', taps.length === 2 && taps[0] === 'echanger' && ['echanger', 'fait'].includes(taps[1]), JSON.stringify(taps));
    const g1 = await L.waitFor(() => { const g = srv.game(); return g.visite ? g : null; }, 5000);
    await page.waitForTimeout(1200);
    const g1b = srv.game();
    const dE = Math.round((g1b.resources.energy - gA.resources.energy) * 10) / 10, dM = Math.round((g1b.resources.materials - gA.resources.materials) * 10) / 10;
    R.check('double toucher : un seul échange au serveur (−30 Énergie, +15 Matériaux, la Nourriture intacte)', g1 && dE === -30 && dM === 15 && g1b.resources.food === gA.resources.food, `${res(gA)} → ${res(g1b)}`);
    R.check('échange : la partie note l’offre prise cette semaine', JSON.stringify(g1b.visite) === JSON.stringify({ semaine: LUNDI, prises: ['energie-materiaux'] }), JSON.stringify(g1b.visite));
    R.check('échange : rien au registre', srv.ledger().length === l0, JSON.stringify(srv.ledger().slice(l0)));
    R.check('échange : les tâches sont intactes', JSON.stringify(srv.readTasks().map((x) => [x.id, x.status])) === JSON.stringify(TASKS.map((x) => [x.id, x.status])));
    c = await comptoir(page);
    R.check('étal : la tuile prise dit « Fait cette semaine », celle des Matériaux s’ouvre', offre(c, 'energie-materiaux').etat === 'fait' && offre(c, 'materiaux-energie').etat === 'libre', JSON.stringify(c.offres.map((o) => [o.id, o.etat])));
    R.check('barre : l’offre prise reste choisie, « Fait cette semaine » à la place du bouton', c.barre?.offre === 'energie-materiaux' && c.barre.etat === 'fait' && c.barre.fait === 'Fait cette semaine', JSON.stringify(c.barre));
    const dits = (await L.said(page)).map((x) => sp(x.text));
    R.check('échange : une seule phrase lue, « Échange fait : 30 Énergie contre 15 Matériaux. »', dits.filter((t) => /Échange fait/.test(t)).length === 1 && dits.some((t) => t === 'Échange fait : 30 Énergie contre 15 Matériaux.'), JSON.stringify(dits));
    R.check('barre : les chiffres du serveur', await L.waitFor(async () => (await L.resValue(page, 'energie')) === Math.floor(g1b.resources.energy) && (await L.resValue(page, 'materiaux')) === Math.floor(g1b.resources.materials), 3000));

    // au clavier : Espace choisit la tuile, Tab mène à « Échanger », Entrée échange ; le focus passe sur « Fait cette semaine »
    await page.focus(`${tuile('nourriture-energie')} input`);
    await page.keyboard.press('Space');
    R.check('clavier : Espace choisit la tuile, la barre la montre', !!await L.waitFor(async () => (await comptoir(page)).barre?.offre === 'nourriture-energie', 2000));
    let tabs = 0;
    while (tabs < 4 && !await page.evaluate(() => !!document.activeElement?.closest('.etal-go'))) { await page.keyboard.press('Tab'); tabs++; }
    R.check('clavier : « Échanger » à deux Tab au plus de la tuile (le repli « Comment ça marche » entre les deux)', tabs <= 2 && await page.evaluate(() => !!document.activeElement?.closest('.etal-go')), String(tabs));
    await page.keyboard.press('Enter');
    R.check('clavier : l’échange Nourriture → Énergie arrive au serveur', !!await L.waitFor(() => srv.game().resources.food === g1b.resources.food - 10 && srv.game().resources.energy === g1b.resources.energy + 10, 5000), res(srv.game()));
    const focus = await L.waitFor(() => page.evaluate(() => { const a = document.activeElement; return a?.classList.contains('etal-fait') ? { cls: a.className, offre: a.closest('.etal-barre')?.dataset.offre } : null; }), 2000)
      || await page.evaluate(() => ({ cls: document.activeElement?.className, offre: null }));
    R.check('clavier : le focus passe sur « Fait cette semaine », dans la barre de l’offre', focus.cls === 'etal-fait' && focus.offre === 'nourriture-energie', JSON.stringify(focus));
    c = await comptoir(page);
    R.check('réserve : de la place libérée, l’offre de Nourriture s’ouvre', offre(c, 'energie-nourriture').etat === 'libre', JSON.stringify(offre(c, 'energie-nourriture')));

    // ───── deux appareils : le second prend Matériaux → Énergie, le premier (pas encore relu) la reprend
    const { page: p2 } = await newPage({}, { reducedMotion: 'reduce' });
    await p2.clock.install({ time: SAMEDI });
    await p2.goto(srv.url);
    await L.ready(p2);
    await L.closeWelcome(p2, 1500);
    await p2.waitForTimeout(600);
    // l'île réveillée (ambiance allumée) : le chaland tangue sur le premier appareil, pas sur celui en mouvement réduit
    const tangue = (pg) => pg.evaluate(() => { document.querySelector('.ow').dataset.ambient = 'on'; const b = document.querySelector('.ow-ent[data-id="quai-1"] .ow-barge'); return b ? getComputedStyle(b).animationPlayState : null; });
    const [complet, reduit] = [await tangue(page), await tangue(p2)];
    R.check('mouvement : le chaland tangue quand l’île est réveillée, pas en mouvement réduit', complet === 'running' && reduit === 'paused', `${complet} / ${reduit}`);
    const c2 = await ouvrirParBandeau(p2, compact);
    R.check('second appareil : les offres déjà prises sont faites', offre(c2, 'energie-materiaux').etat === 'fait' && offre(c2, 'nourriture-energie').etat === 'fait', JSON.stringify(c2.offres.map((o) => [o.id, o.etat])));
    await choisir(p2, 'materiaux-energie');
    await p2.click(GO);
    R.check('second appareil : Matériaux → Énergie enregistré', !!await L.waitFor(() => srv.game().visite.prises.includes('materiaux-energie'), 5000), JSON.stringify(srv.game().visite));
    const g2 = srv.game();
    await L.said(page, true);
    await choisir(page, 'materiaux-energie'); // le premier appareil n'a pas encore relu le serveur : son bouton est ouvert
    await page.click(GO);
    await page.waitForTimeout(2500);
    const g3 = srv.game();
    R.check('deux appareils : l’offre n’est payée qu’une fois (serveur inchangé après le second geste)', res(g3) === res(g2) && g3.visite.prises.filter((x) => x === 'materiaux-energie').length === 1, `${res(g2)} → ${res(g3)} ${JSON.stringify(g3.visite)}`);
    const note = await L.waitFor(() => page.evaluate(() => { const n = document.getElementById('notice'); return n && !n.hidden && /Déjà fait cette semaine/.test(n.textContent) ? n.textContent : null; }), 4000)
      || (await L.said(page)).map((x) => x.text).find((t) => /Déjà fait cette semaine/.test(t));
    R.check('premier appareil : remis à jour, il dit pourquoi (« Déjà fait cette semaine »)', !!note, String(note));
    R.check('premier appareil : la barre montre les chiffres du serveur', await L.waitFor(async () => (await L.resValue(page, 'materiaux')) === Math.floor(g3.resources.materials) && (await L.resValue(page, 'energie')) === Math.floor(g3.resources.energy), 4000));
    await p2.close();
    await L.closeWelcome(page, 500);
    if (await page.evaluate(() => document.getElementById('dlg-batiment').open)) await fermer(page);

    // ───── carte en liste
    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    const ligne = await page.evaluate(() => { const b = document.querySelector('#dlg-plan [data-bat="quai-1"]'); const li = b.closest('.ow-plan-bat'); return li.querySelector('.ow-plan-bat-etat').textContent.replace(/ /g, ' '); });
    const attendu = `Le marchand est au quai, encore 2 jours · ${BAT.etat[`quai.commande.${v0}`]}`;
    R.check(`carte en liste : le quai dit « ${attendu} »`, sp(ligne) === attendu, ligne);
    await page.click('#dlg-plan [data-bat="quai-1"]');
    c = await L.waitFor(async () => { const x = await comptoir(page); return x.open && x.offres.length === 4 ? x : null; }, 4000);
    R.check('carte en liste : son bouton ouvre l’étal', !!c);
    await fermer(page);
    await page.keyboard.press('Escape'); // la carte en liste
    await L.waitFor(() => page.evaluate(() => !document.querySelector('dialog[open]')), 3000);

    // ───── dimanche : dernier jour ; lundi : il revient
    await jourSuivant(page, srv, 1);
    const b2 = await bandeauVisiteur(page);
    R.check('dimanche : « Commande au quai, dernier jour »', b2.text === 'Commande au quai, dernier jour', JSON.stringify(b2));
    c = await ouvrirParBandeau(page, compact, true);
    R.check('dimanche : « Dernier jour : le marchand repart cette nuit. », les offres prises le restent', c.now === 'Dernier jour : le marchand repart cette nuit.' && offre(c, 'energie-materiaux').etat === 'fait', JSON.stringify([c.now, c.offres.map((o) => o.etat)]));
    await page.keyboard.press('Escape');
    await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
    const retourFocus = await page.evaluate(() => { const a = document.activeElement; return { cls: a?.className || a?.tagName, vu: !!a && a !== document.body && a.checkVisibility() }; });
    R.check(`clavier : à la fermeture, le focus revient sur ${compact ? 'le bouton qui déplie la carte' : 'la ligne du marchand'}`,
      retourFocus.vu && String(retourFocus.cls).includes(compact ? 'bandeau-more' : 'bandeau-visiteur'), JSON.stringify(retourFocus));
    await L.said(page, true);
    await jourSuivant(page, srv, 2);
    const retour = await L.waitFor(async () => { const m = await bulle(page); return VISITEUR(v1).includes(m) ? m : null; }, 9000);
    R.check('lundi : Fanal annonce le visiteur à commande de la nouvelle semaine', !!retour, String(await bulle(page)));
    R.check('lundi : la semaine notée sur l’appareil est la nouvelle', await page.evaluate(() => localStorage.getItem('oree.visite.v1')) === LUNDI_SUIVANT);
    const b3 = await bandeauVisiteur(page);
    R.check('lundi : « Commande au quai, encore 7 jours »', b3.text === 'Commande au quai, encore 7 jours', JSON.stringify(b3));
    c = await ouvrirParBandeau(page, compact);
    R.check('lundi : plus aucune offre « Fait cette semaine »', c.offres.every((o) => o.etat !== 'fait'), JSON.stringify(c.offres.map((o) => [o.id, o.etat, o.raison])));
    await shot(page, '36-lundi');
  }, { tasks: TASKS, game: (core) => village(core, { quai: true }), sandbox: true });
})();
