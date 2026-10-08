// 40. Les visiteurs à commande (lot C), à l'écran.
//   Partie A (un samedi, quai bâti, version d'essai) :
//   - arrivée : Fanal annonce le visiteur de la semaine une fois sur l'appareil (une variante de « commande.arrive.<id> »),
//     pas au rechargement ; son bateau est amarré dans le dessin du quai, et le toucher ouvre la fiche du quai ;
//   - « Cette semaine » : « Commande au quai, encore 2 jours », qui ouvre la fiche ; la commande au-dessus du comptoir :
//     qui, ce qu'il demande, ce qu'il laisse, « Livrer » (principal, 44 px au moins), rien ne déborde ;
//   - double toucher : une seule livraison (une entrée commande:{lundi} au registre, la demande payée une fois, aucune offre
//     du comptoir prise par le second toucher), la phrase lue et le merci de Fanal ; « Commande livrée » à sa place ;
//   - le bandeau, le nom du quai et la carte en liste disent la commande livrée ;
//   - « Jour suivant » : dimanche, toujours livrée ; lundi, le visiteur suivant, sa commande ouverte, Fanal l'annonce.
//   Partie B (allure au ralenti, réserves trop basses) : petite commande et sa phrase, la récompense inchangée ; « Livrer »
//   verrouillé avec la raison du cœur ; le toucher ne livre rien et redit la raison.
//   Partie C (retour d'absence cette semaine) : commande allégée, et la fiche le dit sans reproche.
//   Partie D (deux appareils) : le second livre au clavier (le focus reste sur la ligne cochée) ; le premier, pas encore
//   relu, livre à son tour : le serveur refuse, l'appareil se remet à jour et dit pourquoi ; une seule livraison.
//   Le bateau se balance quand l'île est réveillée, jamais en mouvement réduit.
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
  { id: 'c1', task: 'Ranger la remise', domain: 'Terrain', difficulty: 3, length: 3, priority: 7, status: 'todo', created: ymd(-4) },
  { id: 'c2', task: 'Trier les papiers', domain: 'Administratif', difficulty: 2, length: 2, priority: 6, status: 'todo', created: ymd(-3) },
];
const C = (f) => JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', f), 'utf8'));
const REPLIQUES = C('repliques.json').situations;
const BAT = C('batiments.json');
const UI = C('interface.json');
const variantes = (sit) => REPLIQUES[sit].variantes.map((v) => sp(v.texte));
const nomRes = { energy: () => UI['resource.energy'], materials: (n) => UI[n < 2 ? 'resource.materials.one' : 'resource.materials.other'], food: () => UI['resource.food'] };
// « 12 Nourriture », « 15 Matériaux et 6 Nourriture » : le texte de la fiche et de la phrase lue
function demandeText(d) {
  const parts = ['energy', 'materials', 'food'].filter((k) => d[k] > 0).map((k) => `${d[k]} ${nomRes[k](d[k])}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts.join('');
}

// Village au Hameau : deux chalets (une place libre), un grenier, de quoi payer chaque commande à sa taille régulière
function village(core, { reserves = { energy: 64, materials: 60, food: 30 }, startDay, reprise } = {}) {
  const g = L.quietState(core, SAMEDI);
  g.resources = { ...reserves };
  g.habitants = 3;
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, ymd(-20)]));
  g.batiments = ['chalet-1', 'chalet-2', 'atelier-1', 'serre-1', 'grenier-1', 'quai-1'].map((id) => ({ id, type: id.replace(/-\d+$/, '') }));
  if (startDay) g.startDay = startDay;
  if (reprise) g.reprise = reprise;
  return g;
}

// ───── lectures de l'écran
const bulle = (page) => page.evaluate(() => { const e = document.getElementById('speech'); return e.hidden ? null : e.querySelector('.speech-text')?.textContent || null; });
const bandeau = (page) => page.evaluate(() => {
  const b = document.querySelector('.bandeau-visiteur');
  const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const t = document.getElementById('bandeau-visiteur');
  return { shown: !b.hidden, text: s(b.textContent), livree: b.dataset.livree === 'true', icone: b.querySelector('use')?.getAttribute('href') || '', coupe: t.scrollHeight > t.clientHeight + 1 };
});
const fiche = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-batiment');
  const s = (x) => String(x || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const c = d.querySelector('.commande');
  const r = d.getBoundingClientRect();
  const go = c?.querySelector('.commande-go');
  const gr = go?.getBoundingClientRect();
  const dd = [...(c?.querySelectorAll('.commande-troc dd') || [])];
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '', commande: !!c, visiteur: c?.dataset.visiteur || '', etat: c?.dataset.etat || '',
    nom: s(c?.querySelector('.commande-titre > span')?.textContent), jours: s(c?.querySelector('.commande-jours')?.textContent),
    demande: s(dd[0]?.textContent), laisse: s(dd[1]?.textContent), taille: s(c?.querySelector('.commande-taille')?.textContent),
    raison: s(c?.querySelector('.commande-raison')?.textContent), fait: s(c?.querySelector('.commande-fait')?.textContent),
    go: go ? { label: go.getAttribute('aria-label'), off: go.getAttribute('aria-disabled') === 'true', primaire: go.classList.contains('btn--primary'), h: gr.height, w: gr.width } : null,
    avantComptoir: !!c && !!d.querySelector('.comptoir') && !!(c.compareDocumentPosition(d.querySelector('.comptoir')) & Node.DOCUMENT_POSITION_FOLLOWING),
    primaires: d.querySelectorAll('.btn--primary').length,
    debord: [...d.querySelectorAll('.commande *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.left < r.left - 1 || b.right > r.right + 1); }).map((e) => e.className.baseVal ?? e.className),
  };
});
async function ouvrirParBandeau(page, compact) {
  if (compact && await page.evaluate(() => document.getElementById('app').dataset.panel === 'open')) { await page.click('[data-action="toggle-panel"]'); await page.waitForTimeout(450); }
  if (compact && await page.getAttribute('.bandeau-more', 'aria-expanded') !== 'true') { await page.click('.bandeau-more'); await page.waitForTimeout(300); }
  await page.click('.bandeau-visiteur');
  const f = await L.waitFor(async () => { const x = await fiche(page); return x.open && x.commande ? x : null; }, 4000);
  await page.waitForTimeout(700); // un toucher juste après l'ouverture serait le second de celui qui l'a ouverte
  return f;
}
async function fermer(page) {
  await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
}
const centre = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const GO = '#dlg-batiment .commande-go';
const jourSuivant = async (page, srv, k) => {
  await L.openPanel(page);
  await page.click('[data-action="jour-suivant"]');
  await L.waitFor(() => srv.game()?.horloge?.decalage === k, 5000);
  await L.closeWelcome(page, 2500);
};
const res = (g) => JSON.stringify(g.resources);
const commandes = (srv) => srv.ledger().filter((e) => e.type === 'commande');
async function ouvrir(newPage, srv, opts = {}, ctx = {}) {
  const { page, context } = await newPage(opts, ctx);
  await context.addInitScript(L.VOICES);
  await page.clock.install({ time: SAMEDI });
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page, 1500);
  return page;
}

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);
  const iso = SAMEDI.toISOString();
  const cmd0 = core.commandeDeLaSemaine(village(core), [], iso);
  const v0 = cmd0.id;
  const v1 = core.commandeDeLaSemaine(village(core), [], `${LUNDI_SUIVANT}T14:00:00Z`).id;
  const au = (id) => BAT.commande[`${id}.au`];

  await L.runScenario('40. les visiteurs à commande', async ({ R, srv, newPage, shot, tag }) => {
    const compact = tag < 700;

    // ───── Partie A : arrivée
    const page = await ouvrir(newPage, srv, {}, { hasTouch: true, isMobile: compact });
    const arrivee = await L.waitFor(() => bulle(page), 5000);
    R.check(`arrivée : Fanal annonce le visiteur de la semaine (une variante de « commande.arrive.${v0} »)`, variantes(`commande.arrive.${v0}`).includes(sp(arrivee)), String(arrivee));
    R.check('arrivée : son mot est lu (« Fanal : … »)', (await L.said(page)).some((x) => sp(x.text) === `Fanal : ${sp(arrivee)}`), JSON.stringify(await L.said(page)));
    R.check('arrivée : la semaine dite est notée sur l’appareil', await page.evaluate(() => localStorage.getItem('oree.visite.v1')) === LUNDI);
    const dessin = await page.evaluate(() => {
      const e = document.querySelector('.ow-ent[data-id="quai-1"]');
      const b = e?.querySelector('.ow-bateau');
      const r = b?.getBoundingClientRect();
      const x = r ? r.left + r.width / 2 : 0, y = r ? r.top + r.height / 2 : 0;
      return { bateau: !!b, chaland: !!e?.querySelector('.ow-barge'), label: e?.getAttribute('aria-label') || '', x, y, dessous: !!document.elementFromPoint(x, y)?.closest('.ow-ent[data-id="quai-1"]') };
    });
    const phrase = BAT.etat[`quai.commande.${v0}`];
    R.check('carte : le bateau du visiteur est amarré à côté du chaland', dessin.bateau && dessin.chaland, JSON.stringify(dessin));
    R.check(`carte : le nom du quai dit « ${phrase} »`, sp(dessin.label).includes(`le marchand est au quai, encore 2 jours · ${phrase}`), dessin.label);
    await page.reload();
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await page.waitForTimeout(1500);
    R.check('rechargement : Fanal ne répète pas l’arrivée', !variantes(`commande.arrive.${v0}`).includes(sp(await bulle(page))), String(await bulle(page)));
    // le bateau sous le doigt, c'est le quai : le toucher ouvre sa fiche
    const pb = await page.evaluate(() => {
      const r = document.querySelector('.ow-ent[data-id="quai-1"] .ow-bateau').getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      return { x, y, quai: !!document.elementFromPoint(x, y)?.closest('.ow-ent[data-id="quai-1"]') };
    });
    R.check('bateau : sous le doigt, c’est le quai', pb.quai, JSON.stringify(pb));
    await page.mouse.click(pb.x, pb.y);
    const fb = await L.waitFor(async () => { const x = await fiche(page); return x.open && x.commande ? x : null; }, 4000);
    R.check('bateau : le toucher ouvre la fiche du quai et sa commande', !!fb && fb.id === 'quai-1' && fb.visiteur === v0, JSON.stringify(fb && [fb.id, fb.visiteur]));
    await fermer(page);

    // ───── « Cette semaine » et la fiche
    if (compact) { await page.click('.bandeau-more'); await page.waitForTimeout(300); }
    const b1 = await bandeau(page);
    R.check('« Cette semaine » : « Commande au quai, encore 2 jours », la barque, rien de coupé', b1.shown && b1.text === 'Commande au quai, encore 2 jours' && /i-barque$/.test(b1.icone) && !b1.coupe, JSON.stringify(b1));
    let f = await ouvrirParBandeau(page, compact);
    const demande0 = demandeText(cmd0.demande);
    R.check('fiche : la commande du visiteur, au-dessus du comptoir', f.id === 'quai-1' && f.visiteur === v0 && f.nom === BAT.commande[`${v0}.nom`] && f.avantComptoir, JSON.stringify([f.id, f.visiteur, f.nom, f.avantComptoir]));
    R.check('fiche : ses jours (« encore 2 jours ») et sa demande, à la taille régulière', f.jours === 'encore 2 jours' && sp(f.demande.replace(/\+/g, ' ')) === demande0 && !f.taille, JSON.stringify([f.jours, f.demande, demande0, f.taille]));
    R.check('fiche : « Livrer » est l’action principale, la seule de la fiche, 44 px au moins, et dit tout', f.go && !f.go.off && f.go.primaire && f.primaires === 1 && f.go.h >= 43.99 && f.go.label === `Livrer ${demande0} ${au(v0)}`, JSON.stringify([f.go, f.primaires]));
    R.check('fiche : rien ne déborde', f.debord.length === 0, JSON.stringify(f.debord));
    await shot(page, '40-commande');

    // double toucher : une seule livraison, et le second toucher ne prend aucune offre du comptoir
    await L.said(page, true);
    const gA = srv.game();
    const pt = await centre(page, GO);
    await page.evaluate(() => { window.__taps = []; document.addEventListener('click', (e) => window.__taps.push(e.target.closest('button, p')?.className || e.target.tagName), true); });
    await page.touchscreen.tap(pt[0], pt[1]);
    await page.waitForTimeout(150);
    await page.touchscreen.tap(pt[0], pt[1]);
    const taps = await page.evaluate(() => window.__taps);
    R.check('double toucher : deux touchers notés, le premier sur « Livrer »', taps.length === 2 && /commande-go/.test(taps[0]), JSON.stringify(taps));
    R.check('livraison : une entrée commande:{lundi} au registre', !!await L.waitFor(() => commandes(srv).length === 1, 5000), JSON.stringify(commandes(srv)));
    await page.waitForTimeout(1200);
    const gB = srv.game();
    const e0 = commandes(srv);
    const paye = Object.entries(cmd0.demande).every(([k, n]) => Math.round((gA.resources[k] - gB.resources[k]) * 10) / 10 === n - (k === 'materials' ? (cmd0.recoit.materials || 0) : 0));
    R.check('double toucher : une seule livraison au serveur, la demande payée une fois', e0.length === 1 && e0[0].key === `commande:${LUNDI}` && e0[0].visiteur === v0 && paye, `${res(gA)} → ${res(gB)} ${JSON.stringify(e0)}`);
    R.check('double toucher : aucune offre du comptoir prise par le second toucher', !gB.visite, JSON.stringify(gB.visite));
    R.check('livraison : ce que laisse le visiteur (Matériaux, une famille ou 1 permis)',
      v0 === 'convoi' ? e0[0].materials === cmd0.recoit.materials : v0 === 'famille' ? gB.habitants === gA.habitants + 1 : (gB.permis?.dispo ?? 0) === (gA.permis?.dispo ?? 0) + 1, JSON.stringify({ v0, h: [gA.habitants, gB.habitants], p: [gA.permis, gB.permis], e: e0[0] }));
    R.check('livraison : les tâches sont intactes', JSON.stringify(srv.readTasks().map((x) => [x.id, x.status])) === JSON.stringify(TASKS.map((x) => [x.id, x.status])));
    f = await L.waitFor(async () => { const x = await fiche(page); return x.etat === 'fait' ? x : null; }, 3000) || await fiche(page);
    R.check('fiche : « Commande livrée » à la place du bouton', f.etat === 'fait' && f.fait.startsWith(sp(BAT.commande.fait)) && !f.go, JSON.stringify([f.etat, f.fait]));
    const dits = (await L.said(page)).map((x) => sp(x.text));
    const tete = sp(`Commande livrée ${au(v0)} : ${demande0}.`);
    const merci = [...variantes(`commande.livree.${v0}`), ...variantes('permis.rang')];
    R.check(`livraison : une seule phrase lue, « ${tete} … », avec le merci de Fanal`, dits.filter((t) => t.startsWith('Commande livrée')).length === 1 && dits.some((t) => t.startsWith(tete) && merci.some((m) => t.endsWith(`Fanal : ${m}`))), JSON.stringify(dits));
    await shot(page, '40-livree');
    await fermer(page);
    const b2 = await bandeau(page);
    R.check(`bandeau : « Commande livrée ${au(v0)} », cochée`, b2.text === sp(UI[`bandeau.commande.livree.${v0}`]) && b2.livree && /i-check$/.test(b2.icone) && !b2.coupe, JSON.stringify(b2));
    const label2 = await page.evaluate(() => document.querySelector('.ow-ent[data-id="quai-1"]').getAttribute('aria-label'));
    R.check('carte : le nom du quai dit la commande livrée', sp(label2).includes(sp(BAT.etat[`quai.livree.${v0}`])), label2);

    // ───── carte en liste
    await L.openPlan(page);
    await page.waitForSelector('#dlg-plan[open]');
    const ligne = await page.evaluate(() => document.querySelector('#dlg-plan [data-bat="quai-1"]').closest('.ow-plan-bat').querySelector('.ow-plan-bat-etat').textContent);
    R.check('carte en liste : le quai dit le marchand et la commande livrée', sp(ligne) === `Le marchand est au quai, encore 2 jours · ${sp(BAT.etat[`quai.livree.${v0}`])}`, ligne);
    await page.keyboard.press('Escape');
    await L.waitFor(() => page.evaluate(() => !document.querySelector('dialog[open]')), 3000);

    // ───── dimanche : toujours livrée ; lundi : le visiteur suivant
    await jourSuivant(page, srv, 1);
    const b3 = await bandeau(page);
    R.check('dimanche : la commande reste livrée', b3.livree && b3.text === sp(UI[`bandeau.commande.livree.${v0}`]), JSON.stringify(b3));
    await jourSuivant(page, srv, 2);
    const retour = await L.waitFor(async () => { const m = sp(await bulle(page)); return variantes(`commande.arrive.${v1}`).includes(m) ? m : null; }, 9000);
    R.check(`lundi : Fanal annonce le visiteur suivant (${v1})`, !!retour, String(await bulle(page)));
    R.check('lundi : la semaine notée sur l’appareil est la nouvelle', await page.evaluate(() => localStorage.getItem('oree.visite.v1')) === LUNDI_SUIVANT);
    const b4 = await bandeau(page);
    R.check('lundi : « Commande au quai, encore 7 jours »', b4.text === 'Commande au quai, encore 7 jours' && !b4.livree, JSON.stringify(b4));
    f = await ouvrirParBandeau(page, compact);
    R.check('lundi : la commande du nouveau visiteur, pas livrée', f.visiteur === v1 && f.etat !== 'fait' && f.jours === 'encore 7 jours', JSON.stringify([f.visiteur, f.etat, f.jours]));
    await fermer(page);
    const label3 = await page.evaluate(() => document.querySelector('.ow-ent[data-id="quai-1"]').getAttribute('aria-label'));
    R.check('lundi : le bateau du nouveau visiteur est au quai', sp(label3).includes(BAT.etat[`quai.commande.${v1}`]), label3);
    await page.close();

    // ───── Partie B : au ralenti, réserves trop basses
    const gR = village(core, { reserves: { energy: 64, materials: 3, food: 2 }, startDay: ymd(-40) });
    const cR = core.commandeDeLaSemaine(gR, [], iso);
    const sB = await L.startServer({ tasks: TASKS, game: gR, sandbox: true });
    try {
      const pB = await ouvrir(newPage, sB, {}, { hasTouch: true, isMobile: compact });
      await pB.waitForTimeout(600);
      await L.closeWelcome(pB, 800);
      const fR = await ouvrirParBandeau(pB, compact);
      const raison = sp(core.refusLivrer(sB.game(), sB.ledger(), {}, iso));
      R.check('ralenti : petite commande, et la fiche le dit', cR.taille === 'ralenti' && fR.taille === sp(BAT.commande['taille.ralenti']), JSON.stringify([cR.taille, fR.taille]));
      R.check('ralenti : la demande est la moitié (arrondie au-dessus), la récompense ne change pas',
        Object.entries(core.VISITEURS[cR.id].demande).every(([k, n]) => cR.demande[k] === Math.ceil(n / 2)) && JSON.stringify(cR.recoit) === JSON.stringify(core.VISITEURS[cR.id].recoit)
        && fR.go.label === `Livrer ${demandeText(cR.demande)} ${au(cR.id)}`, JSON.stringify([cR, fR.go]));
      R.check('verrou : « Livrer » à plat, cadenas, et la raison du cœur dessous', fR.go.off && !fR.go.primaire && /^Il manque /.test(raison) && fR.raison === raison, JSON.stringify([fR.go, fR.raison, raison]));
      await L.said(pB, true);
      const g0 = sB.game();
      await pB.click(GO, { force: true }); // verrouillé (aria-disabled) : Playwright attendrait qu'il s'ouvre
      await pB.waitForTimeout(900);
      R.check('verrou : le toucher ne livre rien', commandes(sB).length === 0 && res(sB.game()) === res(g0), res(sB.game()));
      R.check('verrou : la raison est redite', (await L.said(pB)).some((x) => sp(x.text) === raison), JSON.stringify(await L.said(pB)));
      await shot(pB, '40-ralenti');
      await pB.close();
    } finally {
      sB.stop();
    }

    // ───── Partie C : revenu d'une absence cette semaine
    const gC = village(core, { reprise: { du: ymd(-2), au: ymd(-1) } });
    const sC = await L.startServer({ tasks: TASKS, game: gC, sandbox: true });
    try {
      const pC = await ouvrir(newPage, sC);
      await pC.waitForTimeout(600);
      await L.closeWelcome(pC, 800);
      const fC = await ouvrirParBandeau(pC, compact);
      const cC = core.commandeDeLaSemaine(sC.game(), sC.ledger(), iso);
      R.check('retour d’absence : commande allégée, dite sans reproche', cC.allegee && cC.taille === 'ralenti' && fC.taille === sp(BAT.commande['taille.allegee']), JSON.stringify([cC.allegee, cC.taille, fC.taille]));
      R.check('retour d’absence : « Livrer » reste ouvert avec la petite demande', fC.go && !fC.go.off && fC.go.label === `Livrer ${demandeText(cC.demande)} ${au(cC.id)}`, JSON.stringify(fC.go));
      await pC.close();
    } finally {
      sC.stop();
    }

    // ───── Partie D : deux appareils
    const sD = await L.startServer({ tasks: TASKS, game: village(core), sandbox: true });
    try {
      const p1 = await ouvrir(newPage, sD);
      await p1.waitForTimeout(600);
      await L.closeWelcome(p1, 800);
      await ouvrirParBandeau(p1, compact);
      const p2 = await ouvrir(newPage, sD, {}, { reducedMotion: 'reduce' });
      await p2.waitForTimeout(600);
      await L.closeWelcome(p2, 800);
      // l'île réveillée : le bateau se balance sur le premier appareil, pas sur celui en mouvement réduit
      const balance = (pg) => pg.evaluate(() => { document.querySelector('.ow').dataset.ambient = 'on'; const b = document.querySelector('.ow-ent[data-id="quai-1"] .ow-bateau'); return b ? getComputedStyle(b).animationPlayState : null; });
      const [complet, reduit] = [await balance(p1), await balance(p2)];
      R.check('mouvement : le bateau se balance quand l’île est réveillée, pas en mouvement réduit', complet === 'running' && reduit === 'paused', `${complet} / ${reduit}`);
      await ouvrirParBandeau(p2, compact);
      await p2.focus(GO);
      await p2.keyboard.press('Enter');
      R.check('second appareil : livré au clavier', !!await L.waitFor(() => commandes(sD).length === 1, 5000), JSON.stringify(commandes(sD)));
      const focus = await L.waitFor(() => p2.evaluate(() => { const a = document.activeElement; return a?.classList.contains('commande-fait') ? a.className : null; }), 3000);
      R.check('clavier : le focus reste sur la ligne, sur « Commande livrée »', !!focus, String(await p2.evaluate(() => document.activeElement?.className)));
      const g2 = sD.game();
      await L.said(p1, true);
      await p1.click(GO); // le premier appareil n'a pas encore relu le serveur : son bouton est ouvert
      await p1.waitForTimeout(2500);
      const g3 = sD.game();
      R.check('deux appareils : une seule livraison (serveur inchangé après le second geste)', commandes(sD).length === 1 && res(g3) === res(g2) && g3.habitants === g2.habitants, `${res(g2)} → ${res(g3)} ${JSON.stringify(commandes(sD))}`);
      const pourquoi = 'Commande déjà livrée cette semaine.';
      const note = await L.waitFor(() => p1.evaluate((p) => { const n = document.getElementById('notice'); return n && !n.hidden && n.textContent.includes(p) ? n.textContent : null; }, pourquoi), 4000)
        || (await L.said(p1)).map((x) => x.text).find((t) => t.includes(pourquoi));
      R.check(`premier appareil : remis à jour, il dit pourquoi (« ${pourquoi} »)`, !!note, String(note));
      R.check('premier appareil : la fiche montre la commande livrée', !!await L.waitFor(async () => (await fiche(p1)).etat === 'fait', 4000), JSON.stringify(await fiche(p1)));
      await p2.close();
      await p1.close();
    } finally {
      sD.stop();
    }
  }, { tasks: TASKS, game: (core) => village(core), sandbox: true });
})();
