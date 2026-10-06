// 34. Semaine tenue et deuxième serre, à l'écran.
//   Partie A (un vendredi, quatre jours déjà travaillés du lundi au jeudi, village au Campement) :
//   - la 2e serre est verrouillée, avec sa raison, au catalogue et sur sa fiche ; la fiche de l'Atelier parle de « chaque » serre ;
//   - la 5e quête de la semaine paie la semaine tenue : annonce lue et affichée, réplique de Fanal, +12 Matériaux sur la barre
//     (en plus de la quête), clé semaine:{lundi} au serveur ; une 2e quête le même jour ne repaie pas ;
//   - la semaine figée (« Jour suivant » jusqu'au lundi) porte la ligne « Semaine tenue : +12 Matériaux » au bilan, les
//     semaines plus anciennes (non tenue, ou sans le champ) n'en portent aucune ; aide des Matériaux, couleur du compteur Permis ;
//   - largeur 360 : rien ne déborde (barre, bilan).
//   Partie B (un lundi de janvier, village au Hameau) : la 2e serre se bâtit par le catalogue, se sème l'hiver (chauffage
//   compris) depuis sa fiche, mûrit après 5 jours travaillés et se récolte.
// Données fictives seulement. Chaque geste attend l'écriture du serveur avant de la vérifier.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const nbsp = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const ymdOf = (d, n = 0) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);

// ───── dates
function nextFriday() {
  const d = new Date();
  d.setUTCHours(14, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
function januaryMonday() {
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), 0, 11, 14));
  if (d <= now) d = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 11, 14));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const FRIDAY = nextFriday();
const LUNDI = ymdOf(FRIDAY, -4);
const JAN = januaryMonday();

const quetes = (n, ref) => Array.from({ length: n }, (_, k) => ({
  id: `s${k}`, task: `Petite quête ordinaire ${k + 1}`, domain: ['Maison', 'Terrain', 'Administratif'][k % 3],
  difficulty: 2, length: 2, priority: 9 - (k % 8), status: 'todo', created: ymdOf(ref, -12),
}));
const REPLIQUES = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'repliques.json'), 'utf8'));
const SEMAINE_TENUE = REPLIQUES.situations['semaine.tenue'].variantes.map((v) => v.texte);
const PERMIS_COULEUR = '#6f3f62';

// fiche d'un bâtiment ouverte : titre, ligne « maintenant », raison du refus, bouton du geste
const fiche = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-batiment');
  const b = d.querySelector('[data-action="bat-geste"]');
  const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
  return {
    open: d.open && !d.classList.contains('is-closing'), id: d.dataset.batId || '', nom: txt(d.querySelector('.bat-nom')),
    now: txt(d.querySelector('#bat-now')), raison: txt(d.querySelector('#bat-raison')),
    geste: b ? { label: txt(b), off: b.getAttribute('aria-disabled') === 'true' } : null,
  };
});
async function openBat(page, id) {
  return L.waitFor(async () => {
    await page.evaluate((id) => document.querySelector(`.ow-ent[data-id="${id}"]`)?.click(), id);
    await page.waitForTimeout(250);
    const s = await fiche(page);
    return s.open && s.id === id ? s : null;
  }, 6000);
}
async function closeBat(page) {
  await page.evaluate(() => document.querySelector('#dlg-batiment [data-close]').click());
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-batiment').open), 2000);
}
async function openCatalogue(page) {
  await page.click('[data-ow="build"]');
  await page.waitForSelector('#dlg-construire[open]');
  await page.waitForTimeout(450);
}
async function closeCatalogue(page) {
  await page.keyboard.press('Escape');
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-construire').open), 2000);
}
const ligne = (page, type) => page.evaluate((type) => {
  const li = document.querySelector(`#dlg-construire .cat-row[data-type="${type}"]`);
  const b = li.querySelector('.cat-go');
  const sp = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  return { nom: sp(li.querySelector('.cat-nom').textContent), cout: sp(li.querySelector('.cat-cout').textContent), etat: sp(li.querySelector('.cat-etat').textContent), off: b.getAttribute('aria-disabled') === 'true', id: b.dataset.id || null, label: sp(b.getAttribute('aria-label')), h: b.getBoundingClientRect().height };
}, type);
const horsEcran = (page, sel) => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return ['absent'];
  return [...root.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map((e) => e.className || e.tagName);
}, sel);
const sansDefilement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const jourSuivant = async (page, srv, k) => {
  await L.openPanel(page);
  await page.click('[data-action="jour-suivant"]');
  await L.waitFor(() => srv.game()?.horloge?.decalage === k, 5000);
  await L.closeWelcome(page, 2500);
};

(async () => {
  const core = await import(require('node:url').pathToFileURL(path.join(L.REPO, 'app', 'core', 'index.js')).href);

  // ───── Partie A : le monde du vendredi, quatre jours travaillés dans la semaine, village au Campement
  const premiersPas = (d) => Object.fromEntries(core.PAS_IDS.map((id) => [id, core.addDays(core.gameDay(d), -1)]));
  const at = (day) => `${day}T14:00:00Z`;
  let w = {
    tasks: quetes(9, FRIDAY),
    game: {
      ...L.quietState(core, new Date(LUNDI + 'T14:00:00Z')),
      resources: { energy: 30, materials: 60, food: 10 }, habitants: 1, premiersPas: premiersPas(FRIDAY),
      batiments: [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }],
    },
    ledger: [],
  };
  for (let k = 0; k < 4; k++) {
    const r = core.completeQuest(w.tasks, w.game, w.ledger, { id: `s${k}`, gameRevision: null }, at(ymdOf(FRIDAY, k - 4)));
    w = { tasks: r.tasks, game: r.game, ledger: [...w.ledger, ...r.entries] };
  }
  const quiet = L.quietState(core, FRIDAY);
  const bilan = (start, extra) => ({ semaine: { start, end: core.addDays(start, 6) }, quetes: 3, heures: 1.5, domaines: [], joursTravailles: 3, ...extra });
  const game = {
    ...w.game, accueil: quiet.accueil, letters: quiet.letters,
    bilans: [bilan(core.addDays(LUNDI, -14), { tenue: false }), bilan(core.addDays(LUNDI, -7), {})], // l'ancienne, sans le champ « tenue »
  };

  await L.runScenario('34. semaine tenue et deuxième serre', async ({ R, srv, newPage, shot, tag, core }) => {
    const { page } = await newPage();
    await page.addInitScript(L.VOICES);
    await page.clock.install({ time: FRIDAY });
    await page.goto(srv.url);
    await L.ready(page);
    await L.closeWelcome(page, 1500);
    await L.waitFor(() => srv.ledger().some((e) => e.bonus === 'ouverture' && e.day === ymdOf(FRIDAY)), 4000);

    // ───── compteur Permis : une teinte à lui (airelle), pas le givre des Avis
    const couleurs = await page.evaluate(() => {
      const v = (el, p) => getComputedStyle(el).getPropertyValue(p).trim().toLowerCase();
      const r = document.querySelector('.res[data-res="permis"]');
      return { res: v(r, '--res'), wash: v(r, '--res-wash'), frost: v(document.documentElement, '--c-frost-ink'), frostWash: v(document.documentElement, '--c-frost-wash') };
    });
    R.check('compteur Permis : teinte airelle, ni le givre ni son lavis', couleurs.res === PERMIS_COULEUR && couleurs.res !== couleurs.frost && couleurs.wash !== couleurs.frostWash, JSON.stringify(couleurs));

    // ───── 2e serre verrouillée au Campement (1 habitant sur les 3 du Hameau)
    const RAISON = 'Il faut d’abord le rang Hameau : encore 2 habitants.';
    await openCatalogue(page);
    const serre = await ligne(page, 'serre');
    R.check('catalogue : la 1re serre est bâtie, la 2e est verrouillée avec sa raison', serre.off && serre.etat === RAISON && serre.id === 'serre-2' && serre.label === 'Bâtir : Petite serre' && serre.cout === 'Coûte 25 Matériaux et 6 Énergie.', JSON.stringify(serre));
    const effetAtelier = await page.evaluate(() => document.querySelector('#dlg-construire .cat-qrt[data-quartier="atelier"] .cat-suivant').textContent.replace(/ /g, ' '));
    R.check('catalogue : l’effet de l’Atelier parle de chaque petite serre', /par récolte de chaque petite serre/.test(effetAtelier), effetAtelier);
    R.check('catalogue : boutons de 44 px au moins', serre.h >= 43.99, String(serre.h));
    await shot(page, '34-catalogue-serre');
    await closeCatalogue(page);
    await page.waitForTimeout(400);
    let s = await openBat(page, 'serre-2');
    R.check('fiche de l’emplacement serre-2 : « Emplacement de la petite serre », coût, raison écrite, geste Bâtir verrouillé', s && s.nom === 'Emplacement de la petite serre' && /Coûte 25 Matériaux et 6 Énergie\./.test(s.now) && s.raison === RAISON && s.geste?.label === 'Bâtir' && s.geste.off, JSON.stringify(s));
    await closeBat(page);

    // ───── la 5e quête de la semaine : la semaine tenue
    await L.openPanel(page);
    const id = await page.getAttribute('#fil-quest', 'data-task-id');
    const g0 = srv.game();
    await L.said(page, true);
    await page.click('#fil-quest [data-action="complete"]');
    R.check('vendredi : la clé semaine:{lundi} arrive au registre, 12 Matériaux', await L.waitFor(() => srv.ledger().some((e) => e.key === `semaine:${LUNDI}` && e.materials === 12 && e.type === 'semaine'), 5000), JSON.stringify(srv.ledger().filter((e) => e.type === 'semaine')));
    const quete = await L.waitFor(() => srv.ledger().find((e) => e.key === `reward:${id}:1`), 3000);
    const gain = Math.round((quete.materials + 12) * 10) / 10;
    await page.waitForTimeout(250);
    const lane = await page.evaluate(() => {
      const l = document.querySelector('.announce-lane'), a = document.getElementById('announce');
      const lr = l.getBoundingClientRect();
      return {
        text: a.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), shown: a.classList.contains('is-shown'),
        debord: [...a.children].filter((e) => e.getBoundingClientRect().right > lr.right + 1).map((e) => e.className),
        tail: (() => { const m = a.querySelector('.announce-tail[data-semaine]'); return !!m && m.scrollWidth <= m.clientWidth && m.getBoundingClientRect().right <= lr.right + 1; })(),
      };
    });
    R.check('annonce visible : « Semaine tenue » en toutes lettres (jamais coupé), avec le gain de Matériaux', lane.shown && /Semaine tenue/.test(lane.text) && lane.tail && lane.text.includes(String(gain).replace('.', ',')), JSON.stringify(lane));
    R.check('annonce : rien ne dépasse de la voie', lane.debord.length === 0, JSON.stringify(lane));
    await shot(page, '34-annonce');
    const dits = (await L.said(page)).map((x) => nbsp(x.text));
    R.check('annonce lue : « Semaine tenue : 12 Matériaux de plus. » avec les gains', dits.some((t) => /Semaine tenue : 12 Matériaux de plus\./.test(t) && /Gains\s?:/.test(t)), JSON.stringify(dits));
    const bulle = await L.waitFor(() => page.evaluate(() => { const e = document.getElementById('speech'); return e.hidden ? null : e.textContent; }), 3000);
    const fanal = String(bulle || '').replace(/^Fanal/, '');
    R.check('réplique de Fanal : une des variantes de « semaine tenue »', /^Fanal/.test(bulle || '') && SEMAINE_TENUE.includes(fanal), String(bulle));
    R.check('la réplique est lue avec l’annonce', dits.some((t) => t.includes(`Fanal : ${fanal}`)), JSON.stringify(dits));
    const delta = await L.waitFor(() => page.evaluate(() => { const d = document.querySelector('.res[data-res="materiaux"] .res-delta'); return d && /\d/.test(d.textContent) ? d.textContent : null; }), 4000);
    R.check('barre : +gain sur Matériaux (la quête et les 12 de la semaine)', delta && Number(delta.replace('+', '').replace(',', '.')) === gain, `${delta} ≠ +${gain}`);
    const apres = srv.game();
    R.check('serveur : Matériaux = avant + quête + 12', Math.round((apres.resources.materials - g0.resources.materials) * 10) / 10 === gain, `${g0.resources.materials} → ${apres.resources.materials} (+${gain})`);
    R.check('barre : le chiffre affiché est celui du serveur', await L.waitFor(async () => (await L.resValue(page, 'materiaux')) === Math.round(apres.resources.materials * 10) / 10, 3000), String(await L.resValue(page, 'materiaux')));
    R.check('aucun permis ce jour-là (le 4e jour était jeudi) : le compteur n’a pas bougé', (await L.resValue(page, 'permis')) === (apres.permis?.dispo ?? 0) && apres.permis.dispo === g0.permis.dispo, JSON.stringify([g0.permis, apres.permis]));

    // ───── une 2e quête le même jour : pas de second bonus, pas de mot « Semaine tenue »
    await page.waitForTimeout(1200);
    await L.openPanel(page);
    await L.said(page, true);
    const id2 = await page.getAttribute('#fil-quest', 'data-task-id');
    await page.click('#fil-quest [data-action="complete"]');
    await L.waitFor(() => srv.ledger().some((e) => e.key === `reward:${id2}:1`), 5000);
    await page.waitForTimeout(900);
    const lane2 = await page.evaluate(() => document.getElementById('announce').textContent.replace(/ /g, ' '));
    const dits2 = (await L.said(page)).map((x) => nbsp(x.text));
    R.check('2e quête : toujours une seule entrée « semaine » au registre', srv.ledger().filter((e) => e.type === 'semaine').length === 1, JSON.stringify(srv.ledger().filter((e) => e.type === 'semaine')));
    R.check('2e quête : ni annonce affichée ni annonce lue de la semaine tenue', !/Semaine tenue/.test(lane2) && !dits2.some((t) => /Semaine tenue/.test(t)), JSON.stringify({ lane2, dits2 }));
    R.check('2e quête : Fanal ne parle pas de la semaine', await page.evaluate((v) => { const e = document.getElementById('speech'); return e.hidden || !v.some((t) => e.textContent.includes(t)); }, SEMAINE_TENUE));

    // ───── aide des Matériaux : la phrase du bonus (nombres lus au cœur)
    await page.click('.res[data-res="materiaux"]');
    await page.waitForSelector('#dlg-help[open]');
    const aide = nbsp(await page.textContent('#dlg-help'));
    R.check('aide des Matériaux : « 12 Matériaux de plus quand tu travailles 5 jours dans une semaine »', aide.includes('Et 12 Matériaux de plus quand tu travailles 5 jours dans une semaine.'), aide);
    await page.evaluate(() => document.querySelector('#dlg-help [data-close]').click());
    await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-help').open), 2000);

    // ───── la semaine passe : le bilan figé porte la ligne
    for (let k = 1; k <= 3; k++) await jourSuivant(page, srv, k); // samedi, dimanche, lundi
    R.check('lundi : le bilan de la semaine est figé avec tenue = vrai', await L.waitFor(() => (srv.game()?.bilans || []).some((b) => b.semaine.start === LUNDI && b.tenue === true && b.joursTravailles === 5), 6000), JSON.stringify((srv.game()?.bilans || []).map((b) => [b.semaine.start, b.tenue, b.joursTravailles])));
    await L.closeWelcome(page, 3000);
    await L.openPanel(page);
    await page.click('[data-action="open-review"]');
    await page.waitForSelector('#dlg-review[open]');
    await page.waitForTimeout(500);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#dlg-review .review-weeks .why-line')].map((r) => ({
      text: r.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), icone: !!r.querySelector('.review-tenue use[href$="#i-materiaux"]'),
    })));
    R.check('bilan : trois semaines figées, la plus récente en haut', rows.length === 3, JSON.stringify(rows));
    R.check('bilan : la semaine tenue affiche « Semaine tenue : +12 Matériaux », doublé d’une icône', rows[0] && /Semaine tenue : \+12 Matériaux/.test(rows[0].text) && rows[0].icone, JSON.stringify(rows[0]));
    const teinte = await page.evaluate(() => { const e = document.querySelector('#dlg-review .review-weeks .review-tenue'); const r = document.querySelector('.res[data-res="materiaux"]'); return e && { ligne: getComputedStyle(e).color, icone: getComputedStyle(e.querySelector('.icon')).color, materiaux: getComputedStyle(document.documentElement).getPropertyValue('--res-materiaux').trim() }; });
    const rgb = await page.evaluate((h) => { const d = document.createElement('i'); d.style.color = h; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, teinte.materiaux);
    R.check('bilan : la ligne d’une semaine passée est en brun Matériaux, pas en gris', teinte.ligne === rgb && teinte.icone === rgb, JSON.stringify({ ...teinte, rgb }));
    R.check('bilan : les semaines non tenue et sans le champ n’affichent rien', rows.slice(1).every((r) => !/Semaine tenue/.test(r.text) && !r.icone), JSON.stringify(rows.slice(1)));
    R.check('bilan : aucune ligne « Semaine tenue » pour la semaine en cours (lundi, 0 quête)', !(await page.evaluate(() => !!document.querySelector('#dlg-review .review-sum .review-tenue'))));
    R.check('bilan : aucun mot « série » ni compteur de jours de suite', !/série|de suite|consécutif/i.test(await page.textContent('#dlg-review')));
    R.check('bilan : rien ne déborde, aucun défilement horizontal', (await horsEcran(page, '#dlg-review')).length === 0 && await sansDefilement(page));
    await shot(page, '34-bilan');
    await page.evaluate(() => document.querySelector('#dlg-review .sheet-foot [data-close]').click());
    await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-review').open), 2000);

    // ───── largeur 360 : barre des ressources (Permis compris) et bilan
    const { page: p360 } = await newPage({}, { viewport: { width: 360, height: 740 } });
    await p360.clock.install({ time: FRIDAY });
    await p360.goto(srv.url);
    await L.ready(p360);
    await L.closeWelcome(p360, 1500);
    const barre = await p360.evaluate(() => [...document.querySelectorAll('.res')].map((r) => { const b = r.getBoundingClientRect(); return { n: r.dataset.res, l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; }));
    R.check('360 px : les cinq compteurs tiennent dans l’écran', barre.length === 5 && barre.every((b) => b.l >= 0 && b.r <= 360), JSON.stringify(barre));
    await L.openPanel(p360);
    await p360.click('[data-action="open-review"]');
    await p360.waitForSelector('#dlg-review[open]');
    await p360.waitForTimeout(500);
    R.check('360 px : le bilan avec la ligne de semaine tenue ne déborde pas', (await horsEcran(p360, '#dlg-review')).length === 0 && await sansDefilement(p360) && /Semaine tenue/.test(nbsp(await p360.textContent('#dlg-review .review-weeks'))), JSON.stringify(await horsEcran(p360, '#dlg-review')));
    await shot(p360, '34-bilan-360');
    await p360.close();

    // ───── un permis des jours et la semaine tenue le même jour : l'annonce la plus chargée, à 320, 360 et 390 px
    //       (le quartier cède la place sans laisser de séparateur ; rien n'est rogné par la pastille #announce elle-même)
    for (const [largeur, avecPermis] of tag === 390 ? [[320, true], [360, true], [390, true], [320, false]] : []) {
      const srvP = await L.startServer({ tasks: w.tasks, sandbox: true, game: avecPermis ? { ...game, permis: { ...(game.permis || {}), depuis: LUNDI } } : game, ledger: w.ledger });
      try {
        const { page: pp } = await newPage({}, { viewport: { width: largeur, height: 740 } });
        await pp.clock.install({ time: FRIDAY });
        await pp.goto(srvP.url);
        await L.ready(pp);
        await L.closeWelcome(pp, 1500);
        await L.waitFor(() => srvP.ledger().some((e) => e.bonus === 'ouverture' && e.day === ymdOf(FRIDAY)), 4000);
        await L.openPanel(pp);
        await pp.click('#fil-quest [data-action="complete"]');
        const arrive = await L.waitFor(() => srvP.ledger().some((e) => e.type === 'semaine') && (!avecPermis || srvP.ledger().some((e) => e.type === 'permis')), 5000);
        await pp.waitForTimeout(450);
        const m = await pp.evaluate(() => {
          const a = document.getElementById('announce');
          const cs = getComputedStyle(a), ar = a.getBoundingClientRect();
          const bord = ar.right - parseFloat(cs.paddingRight);
          const kids = [...a.children];
          const mot = a.querySelector('[data-semaine]');
          return {
            texte: a.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), shown: a.classList.contains('is-shown'),
            coupe: a.scrollWidth > a.clientWidth + 1,
            motFin: mot ? Math.round(mot.getBoundingClientRect().right) : null, motPlein: !!mot && mot.scrollWidth <= mot.clientWidth,
            bord: Math.round(bord), dernier: kids.length ? Math.round(kids[kids.length - 1].getBoundingClientRect().right) : null,
            sepFinal: !!kids.length && kids[kids.length - 1].classList.contains('announce-sep'),
            quartier: !!a.querySelector('[data-quartier]'), permis: !!a.querySelector('[data-res="permis"] use[href$="#i-permis"]'),
          };
        });
        const cas = avecPermis ? 'permis et semaine le même jour' : 'semaine seule';
        R.check(`${largeur} px : ${cas} : tout à l’annonce, en toutes lettres, rien de rogné`, arrive && m.shown && /Semaine tenue/.test(m.texte) && m.permis === avecPermis && (!avecPermis || /\+1/.test(m.texte)) && m.motPlein && !m.coupe && m.dernier <= m.bord + 1, JSON.stringify(m));
        R.check(`${largeur} px (${cas}) : le quartier cède la place sans séparateur orphelin`, !m.quartier && !m.sepFinal && !/→|·\s*$/.test(m.texte), JSON.stringify(m));
        await shot(pp, `34-annonce-${avecPermis ? 'permis-' : ''}${largeur}`);
        await pp.close();
      } finally {
        srvP.stop();
      }
    }

    // ───── Partie B : janvier, village au Hameau (3 habitants) : la 2e serre se bâtit, se sème l'hiver, se récolte
    const ymdJ = (n) => ymdOf(JAN, n);
    const srvB = await L.startServer({
      tasks: quetes(7, JAN), sandbox: true,
      game: {
        ...L.quietState(core, JAN), resources: { energy: 60, materials: 200, food: 0 }, habitants: 3, premiersPas: premiersPas(JAN),
        batiments: [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }],
      },
    });
    try {
      const { page: pb } = await newPage();
      await pb.clock.install({ time: JAN });
      await pb.goto(srvB.url);
      await L.ready(pb);
      await L.closeWelcome(pb, 1500);
      await L.waitFor(() => srvB.ledger().some((e) => e.bonus === 'ouverture'), 4000);
      const b0 = srvB.game();
      await openCatalogue(pb);
      let r = await ligne(pb, 'serre');
      R.check('Hameau : la 2e serre est disponible au catalogue, sur serre-2', !r.off && r.etat === 'Disponible' && r.id === 'serre-2' && r.label === 'Bâtir : Petite serre', JSON.stringify(r));
      await shot(pb, '34-catalogue-hameau');
      await pb.click('#dlg-construire .cat-row[data-type="serre"] .cat-go');
      R.check('serre-2 bâtie : enregistrée, 25 Matériaux et 6 Énergie dépensés', await L.waitFor(() => {
        const g = srvB.game();
        return (g?.batiments || []).some((b) => b.id === 'serre-2') && g.resources.materials === b0.resources.materials - 25 && g.resources.energy === b0.resources.energy - 6;
      }, 5000), JSON.stringify(srvB.game()?.resources));
      await L.waitFor(() => pb.evaluate(() => !document.getElementById('dlg-construire').open), 3000);
      await pb.waitForTimeout(900);
      await openCatalogue(pb);
      r = await ligne(pb, 'serre');
      R.check('2 serres bâties : la ligne dit qu’il n’y a plus d’emplacement libre', r.off && r.etat === 'Plus d’emplacement libre pour une petite serre.', JSON.stringify(r));
      await closeCatalogue(pb);
      await pb.waitForTimeout(500);

      // semer serre-2 en hiver : 2 Énergie de semis + 3 de chauffage, dits sur la fiche
      let f = await openBat(pb, 'serre-2');
      R.check('fiche serre-2 : « Petite serre », coût de semis avec chauffage l’hiver', f && f.nom === 'Petite serre' && /Rien n’est semé\. Semer coûte 2 Énergie, plus 3 Énergie de chauffage jusqu’à la fin d’avril\./.test(f.now) && f.geste?.label === 'Semer' && !f.geste.off, JSON.stringify(f));
      const e0 = srvB.game().resources.energy;
      await pb.click('#dlg-batiment [data-action="bat-geste"]');
      R.check('serre-2 semée : enregistrée à la date du jour, 5 Énergie dépensées (semis et chauffage)', await L.waitFor(() => {
        const g = srvB.game();
        return (g?.parcelles || []).some((p) => p.id === 'serre-2' && p.semeLe === ymdJ(0)) && g.resources.energy === e0 - 5;
      }, 5000), JSON.stringify([srvB.game()?.parcelles, srvB.game()?.resources]));
      f = await L.waitFor(async () => { const x = await fiche(pb); return /Mûr dans 5 jours travaillés/.test(x.now) ? x : null; }, 3000);
      R.check('serre-2 en terre : « Mûr dans 5 jours travaillés », « Récolter » en attente', f && f.geste?.label === 'Récolter' && f.geste.off, JSON.stringify(f));
      await closeBat(pb);
      const un = await openBat(pb, 'serre-1');
      R.check('serre-1 reste vide : la 2e serre se sème seule', un && /^Rien n’est semé\./.test(un.now), JSON.stringify(un));
      await closeBat(pb);

      // cinq jours travaillés, puis la récolte de serre-2
      for (let k = 1; k <= 5; k++) {
        await jourSuivant(pb, srvB, k);
        await L.openPanel(pb);
        await pb.click('#fil-quest [data-action="complete"]');
        const paid = await L.waitFor(() => srvB.ledger().some((e) => e.type === 'reward' && e.day === ymdJ(k)), 5000);
        if (!paid) { R.check(`jour ${k} : une quête payée`, false, JSON.stringify(srvB.ledger().map((e) => [e.type, e.day]))); break; }
        await pb.waitForTimeout(400);
      }
      const food0 = srvB.game().resources.food;
      f = await openBat(pb, 'serre-2');
      R.check('après 5 jours travaillés : serre-2 est mûre, 4 Nourriture à récolter', f && f.now === 'C’est mûr : 4 Nourriture à récolter.' && !f.geste?.off, JSON.stringify(f));
      await shot(pb, '34-serre-2-mure');
      await pb.click('#dlg-batiment [data-action="bat-geste"]');
      R.check('serre-2 récoltée : +4 Nourriture, l’emplacement est libre, serre-1 inchangée', await L.waitFor(() => {
        const g = srvB.game();
        return g?.resources.food === food0 + 4 && !(g.parcelles || []).some((p) => p.id === 'serre-2');
      }, 5000), JSON.stringify([srvB.game()?.resources, srvB.game()?.parcelles]));
      R.check('barre : la Nourriture affichée suit', await L.waitFor(async () => (await L.resValue(pb, 'nourriture')) === food0 + 4, 3000), String(await L.resValue(pb, 'nourriture')));
      R.check('Hameau : aucun défilement horizontal', await sansDefilement(pb));
      await pb.close();
    } finally {
      srvB.stop();
    }
  }, { tasks: w.tasks, sandbox: true, game, ledger: w.ledger });
})();
