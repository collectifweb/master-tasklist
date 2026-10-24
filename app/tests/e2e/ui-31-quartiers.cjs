// 31. Niveaux de quartier achetés par permis.
//   - compteur « Permis » de la barre des ressources (et plus de pastille sur « Construire ») ; plaques « Champs · niv. 0 », sans barre,
//     avec la pastille « on peut monter » (lot L) tant qu'un niveau est payable ;
//   - toucher une plaque ouvre la fiche du quartier (lot L) : l'avant et l'après (« 4 → 5 », « +1 »), le prix en pastilles
//     (en pointillés avec « il manque N » quand il en manque), la règle dans un repli fermé ; plus les permis en main ;
//   - achat : un double toucher n'achète qu'un niveau ; la fiche se range, puis la carte de récompense (lot L) : « Niveau 1 »,
//     « Champs », 4 → 5, la réplique de Fanal (au niveau 1 seulement, pas dans sa bulle), nommée et décrite pour le lecteur
//     d'écran, le focus sur « Continuer » ; plaque et compteur à jour ; la fiche rouverte montre le niveau suivant ; le
//     niveau 3, trop cher, reste visible avec le cadenas et la raison du cœur, redite au toucher, sans rien acheter ;
//   - même chemin au clavier par « Construire » → onglet Quartiers, atteint par la flèche droite (lot L : « 6 → 7 par
//     récolte », le prix en pastilles, en pointillés quand il en manque ; la fiche s'empile sur le catalogue, Échap la referme
//     seule) et par « Vue » → Carte en liste ; « Voir les quêtes » ferme toutes les feuilles et filtre la liste ;
//   - cibles de 44 px, aucun défilement horizontal. Données fictives seulement.
const L = require('./lib.cjs');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const q = (id, task, domain, priority) => ({ id, task, domain, difficulty: 3, length: 2, priority, status: 'todo', created: day(-2) });
const TASKS = [
  q('c1', 'Ratisser les feuilles', 'Terrain', 6),
  q('c2', 'Changer une ampoule', 'Maison', 5),
  q('c3', 'Payer une facture', 'Administratif', 4),
  q('c4', 'Vérifier la pression des pneus', 'Véhicule', 3),
];
const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Fiche ouverte : identité, lignes, bouton d'achat, cibles et débordement. */
const fiche = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-quartier');
  const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const b = d.querySelector('[data-action="qrt-monter"]');
  const raison = d.querySelector('#qrt-raison');
  const small = [...d.querySelectorAll('button')].map((x) => [x, x.getBoundingClientRect()])
    .filter(([, r]) => r.width && (r.width < 43.99 || r.height < 43.99)).map(([x, r]) => `${x.dataset.action || x.className} ${r.width.toFixed(0)}×${r.height.toFixed(0)}`);
  const wide = [...d.querySelectorAll('*')].some((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); });
  const z = [...document.querySelectorAll('dialog.sheet[open]')].sort((a, b2) => (a._z || 0) - (b2._z || 0)).map((x) => x.id);
  return {
    open: d.open && !d.classList.contains('is-closing'), quartier: d.dataset.quartier, niveau: d.dataset.niveau,
    titre: sp(d.querySelector('#qrt-t')?.textContent), ligne: sp(d.querySelector('#qrt-d')?.textContent),
    compare: (() => {
      const c = d.querySelector('.qrt-compare');
      if (!c) return null;
      const vals = [...c.querySelectorAll('.qrt-val b')].map((x) => sp(x.textContent));
      return { label: sp(c.querySelector('.qrt-compare-t').textContent), avant: vals[0], apres: vals[1] ?? null, ecart: sp(c.querySelector('.qrt-ecart')?.textContent) || null,
        legendes: [...c.querySelectorAll('.qrt-legende')].map((x) => sp(x.textContent)).join(' | '), sr: sp(c.querySelector('.sr-only').textContent), muet: c.querySelector('.qrt-compare-row').getAttribute('aria-hidden') === 'true' };
    })(),
    // « permis 1 plein, energie 80 plein… » ; une pastille qui manque : « permis 3 pointillés il manque 3 »
    pastilles: [...d.querySelectorAll('.qrt-pastilles .pastille-prix')].map((p) => {
      const b = p.querySelector('.pastille');
      return [b.dataset.res, sp(b.textContent), b.hasAttribute('data-manque') && getComputedStyle(b).borderTopStyle === 'dashed' ? 'pointillés' : 'plein', sp(p.querySelector('.pastille-manque')?.textContent)].filter(Boolean).join(' ');
    }).join(', '),
    prix: sp(d.querySelector('#qrt-prix')?.textContent),
    permis: !!d.querySelector('#qrt-permis') || /Tu as|Tu n’as aucun permis|Le prochain/.test(d.querySelector('.qrt-body').textContent),
    regle: (() => { const r = d.querySelector('.repli'); return r ? { open: r.open, resume: sp(r.querySelector('summary').textContent), texte: sp(r.querySelector('p').textContent), h: r.querySelector('summary').getBoundingClientRect().height } : null; })(),
    monter: b ? { text: sp(b.textContent), niveau: b.dataset.niveau, off: b.getAttribute('aria-disabled') === 'true', primaire: b.classList.contains('btn--primary'), desc: b.getAttribute('aria-describedby'), lock: !!b.querySelector('use[href$="#i-lock"]') } : null,
    raison: raison ? { text: sp(raison.textContent), cache: raison.classList.contains('sr-only') } : null,
    max: sp(d.querySelector('.qrt-max')?.textContent),
    quetes: sp(d.querySelector('[data-action="qrt-quetes"]')?.textContent),
    focus: document.activeElement && d.contains(document.activeElement) ? (document.activeElement.dataset.action || document.activeElement.className) : null,
    focusNiveau: document.activeElement?.dataset?.niveau || null,
    small, wide, pile: z, scroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
const plaque = (page, s) => page.evaluate((s) => {
  const b = document.querySelector(`.ow-plaque[data-sector="${s}"]`);
  const tx = (sel) => (b.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
  return { label: b.getAttribute('aria-label'), niveau: b.dataset.niveau, text: [tx('.ow-plaque-name'), tx('.ow-plaque-sep'), tx('.ow-plaque-val')].join(' '), barre: !!b.querySelector('.ow-plaque-bar'), monte: !b.querySelector('.ow-plaque-monte').hidden };
}, s);
/** Compteur « Permis » de la barre des ressources, et « Construire » (qui ne porte plus de pastille). */
const badge = (page) => page.evaluate(() => {
  const r = document.querySelector('.res[data-res="permis"]');
  const b = document.querySelector('[data-ow="build"]');
  return { text: r.querySelector('.res-value').textContent.trim(), label: r.getAttribute('aria-label'), pastille: !!b.querySelector('.ow-badge'), build: b.getAttribute('aria-label') };
});
/** Carte de récompense (lot L) : ce qu'elle montre, son nom et sa description lus, le focus, le texte de la bulle de Fanal
 *  (vide si elle est cachée : un imprévu de la semaine peut y parler, selon le calendrier). */
const carte = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-recompense');
  const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const txt = (ids) => (ids || '').split(' ').map((id) => document.getElementById(id)?.textContent).filter(Boolean).map(sp).join(' ');
  const b = d.querySelector('.btn');
  return {
    niveau: sp(d.querySelector('.recompense-niveau')?.textContent), titre: sp(d.querySelector('.recompense-titre')?.textContent),
    compare: [...d.querySelectorAll('.recompense-val b')].map((x) => sp(x.textContent)).join(' '), label: sp(d.querySelector('.recompense-label')?.textContent),
    fanal: sp(d.querySelector('.recompense-fanal')?.textContent), nom: txt(d.getAttribute('aria-labelledby')), desc: txt(d.getAttribute('aria-describedby')),
    focus: d.contains(document.activeElement) ? sp(document.activeElement.textContent) : null, bouton: b ? b.getBoundingClientRect().height : 0,
    wide: [...d.querySelectorAll('*')].some((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }),
    pile: [...document.querySelectorAll('dialog.sheet[open]')].map((x) => x.id).join(), bulle: document.getElementById('speech').hidden ? '' : sp(document.getElementById('speech').textContent),
  };
});
/** Centre touchable d'une plaque (rien par-dessus), ou null. */
const hit = (page, s) => page.evaluate((s) => {
  const b = document.querySelector(`.ow-plaque[data-sector="${s}"]`);
  const r = b.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const at = document.elementFromPoint(x, y);
  return at && b.contains(at) ? [x, y] : null;
}, s);
const closed = (page, id) => L.waitFor(() => page.evaluate((id) => !document.getElementById(id).open, id), 2000);

L.runScenario('31. Niveaux de quartier : fiche, achat par permis, catalogue et carte en liste', async ({ R, srv, newPage, tag, shot }) => {
  const compact = tag < 1000;
  const { page, context } = await newPage({}, { hasTouch: true, isMobile: compact });
  await context.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await L.closeWelcome(page);
  await page.waitForTimeout(500);

  // ───── compteur des permis et plaques
  let bd = await badge(page);
  R.check('compteur « Permis : 3 » dans la barre ; « Construire » sans pastille ni chiffre', bd.text === '3' && bd.label === 'Permis\u00a0: 3' && !bd.pastille && bd.build === 'Construire', JSON.stringify(bd));
  let pc = await plaque(page, 'champs');
  // on peut le monter (lot L) : la pastille de la plaque, et son nom lu le dit
  R.check('plaque des Champs : « Champs · niv. 0 », lue « Champs : niveau 0. Tu peux monter au niveau 1. », pastille, sans barre', pc.text === 'Champs · niv. 0' && pc.label === 'Champs : niveau 0. Tu peux monter au niveau 1.' && pc.monte && pc.niveau === '0' && !pc.barre, JSON.stringify(pc));
  const pg = await plaque(page, 'garage');
  R.check('plaque du Garage : son niveau acheté (2)', pg.text === 'Garage · niv. 2' && pg.label === 'Garage : niveau 2.', JSON.stringify(pg));

  // ───── toucher la plaque des Champs : la fiche
  if (!(await hit(page, 'champs'))) { await page.click('[data-ow="quetes"]'); await page.waitForTimeout(450); } // le panneau la couvre
  const pt = await hit(page, 'champs');
  R.check('la plaque des Champs est touchable', !!pt);
  if (compact && pt) await page.touchscreen.tap(pt[0], pt[1]); else await page.click('.ow-plaque[data-sector="champs"]');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await page.waitForTimeout(450);
  let f = await fiche(page);
  R.check('toucher la plaque ouvre la fiche des Champs', f.open && f.quartier === 'champs' && f.titre === 'Champs', JSON.stringify(f));
  R.check('en-tête : « Quartier · niveau 0 »', f.ligne === 'Quartier · niveau 0', f.ligne);
  R.check('l’avant et l’après : « Nourriture par récolte du potager », 4 → 5, « +1 », légendes « maintenant » et « niveau 1 »', f.compare && f.compare.label === 'Nourriture par récolte du potager' && f.compare.avant === '4' && f.compare.apres === '5' && f.compare.ecart === '+1' && f.compare.legendes === 'maintenant | niveau 1', JSON.stringify(f.compare));
  R.check('… dessin muet, phrase lue « Maintenant : 4 Nourriture par récolte du potager. Niveau 1 : 5 … »', f.compare.muet && f.compare.sr === 'Maintenant : 4 Nourriture par récolte du potager. Niveau 1 : 5 Nourriture par récolte du potager.', f.compare.sr);
  R.check('prix en pastilles : permis 1, Énergie 80, Matériaux 60, aucune en pointillés ; phrase lue « Prix : 1 permis, 80 Énergie et 60 Matériaux. »', f.pastilles === 'permis 1 plein, energie 80 plein, materiaux 60 plein' && f.prix === 'Prix : 1 permis, 80 Énergie et 60 Matériaux.', JSON.stringify({ p: f.pastilles, prix: f.prix }));
  R.check('plus de permis en main dans la fiche (la tuile « Permis » les dit)', !f.permis);
  R.check('repli « Comment ça marche » fermé, 44 px, avec la règle des niveaux', f.regle && !f.regle.open && f.regle.resume === 'Comment ça marche' && f.regle.h >= 43.99 && f.regle.texte === 'Au départ : 4 Nourriture par récolte du potager. Aux niveaux 1, 2 et 3 : 5, 6 et 7. Chaque niveau coûte des permis : touche « Permis » en haut pour savoir comment en gagner.', JSON.stringify(f.regle));
  R.check('« Monter au niveau 1 » : bouton principal actif, décrit par le prix', f.monter && f.monter.text === 'Monter au niveau 1' && !f.monter.off && f.monter.primaire && f.monter.desc === 'qrt-prix', JSON.stringify(f.monter));
  R.check('« Voir les quêtes Terrain (1) »', f.quetes === 'Voir les quêtes Terrain (1)', f.quetes);
  R.check('fiche : cibles de 44 px, aucun défilement horizontal', !f.small.length && !f.wide && !f.scroll, JSON.stringify({ small: f.small, wide: f.wide, scroll: f.scroll }));
  R.check('fiche : une région lue dans la feuille', await page.evaluate(() => !!document.querySelector('#dlg-quartier > [data-live][role="status"]')));
  await shot(page, '31-fiche');

  // ───── achat par un double toucher : un seul niveau ; la fiche se range, le moment se joue sur la plaque, puis la carte
  await L.said(page, true);
  const g0 = srv.game();
  const go = await page.evaluate(() => { const r = document.querySelector('#dlg-quartier [data-action="qrt-monter"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.touchscreen.tap(go[0], go[1]);
  await page.waitForTimeout(90);
  await page.touchscreen.tap(go[0], go[1]);
  R.check('achat enregistré : Champs au niveau 1', await L.waitFor(() => srv.game()?.niveaux?.champs === 1, 6000), JSON.stringify(srv.game()?.niveaux));
  R.check('la fiche se range aussitôt (lot L)', await closed(page, 'dlg-quartier'));
  R.check('la carte de récompense s’ouvre après le moment', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-recompense').open), 4000));
  await page.waitForTimeout(450);
  let g = srv.game();
  R.check('double toucher : un seul niveau payé (1 permis, 80 Énergie, 60 Matériaux)', g.niveaux.champs === 1 && g.permis.dispo === g0.permis.dispo - 1 && g.resources.energy === g0.resources.energy - 80 && g.resources.materials === g0.resources.materials - 60, JSON.stringify({ n: g.niveaux, avant: [g0.permis, g0.resources], apres: [g.permis, g.resources] }));
  let k = await carte(page);
  R.check('carte : « Niveau 1 », « Champs », 4 → 5, « Nourriture par récolte du potager », seule feuille ouverte', k.niveau === 'Niveau 1' && k.titre === 'Champs' && k.compare === '4 5' && k.label === 'Nourriture par récolte du potager' && k.pile === 'dlg-recompense', JSON.stringify(k));
  R.check('carte : la réplique de Fanal au niveau 1, sur la carte et pas dans sa bulle', !!k.fanal && !k.bulle.includes(k.fanal.replace(/^Fanal\s*/, '')), JSON.stringify(k));
  R.check('carte : nommée « Champs », décrite par « Champs : niveau 1. 5 Nourriture par récolte du potager. » et Fanal', k.nom === 'Champs' && k.desc.startsWith('Champs : niveau 1. 5 Nourriture par récolte du potager. Fanal : '), JSON.stringify(k));
  R.check('carte : le focus sur « Continuer » (44 px), aucun débordement', k.focus === 'Continuer' && k.bouton >= 43.99 && !k.wide, JSON.stringify(k));
  const dits = (await L.said(page)).filter((x) => /^Champs : niveau/.test(sp(x.text)));
  R.check('rien n’est annoncé en double : la carte dit la montée', dits.length === 0, JSON.stringify(await L.said(page)));
  pc = await plaque(page, 'champs');
  // la pastille et la phrase « Tu peux monter au niveau 2. » vont ensemble (lot L)
  R.check('plaque à jour : « Champs · niv. 1 », lue « Champs : niveau 1. », pastille et phrase d’accord', pc.text === 'Champs · niv. 1' && pc.label === `Champs : niveau 1.${pc.monte ? ' Tu peux monter au niveau 2.' : ''}` && pc.niveau === '1', JSON.stringify(pc));
  await L.waitFor(async () => (await badge(page)).text === '2', 4000); // le compteur monte à l'impact, après l'écriture
  bd = await badge(page);
  R.check('compteur à jour : « Permis : 2 »', bd.text === '2' && bd.label === 'Permis\u00a0: 2' && !bd.pastille && bd.build === 'Construire', JSON.stringify(bd));
  await shot(page, '31-achat');
  await page.keyboard.press('Enter'); // « Continuer »
  R.check('« Continuer » ferme la carte', await closed(page, 'dlg-recompense'));

  // ───── la fiche rouverte : le niveau suivant ; niveau 2 acheté (sans réplique), puis le 3 trop cher
  const rouvrir = async () => {
    await page.waitForTimeout(300);
    const p2 = await hit(page, 'champs');
    if (compact && p2) await page.touchscreen.tap(p2[0], p2[1]); else await page.click('.ow-plaque[data-sector="champs"]');
    await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
    await page.waitForTimeout(450);
  };
  await rouvrir();
  f = await fiche(page);
  R.check('fiche rouverte : niveau 1, 5 → 6, niveau 2 à 2 permis, 160 Énergie et 120 Matériaux', f.open && f.ligne.endsWith('niveau 1') && f.compare.avant === '5' && f.compare.apres === '6' && f.compare.legendes === 'maintenant | niveau 2' && f.pastilles === 'permis 2 plein, energie 160 plein, materiaux 120 plein' && f.prix === 'Prix : 2 permis, 160 Énergie et 120 Matériaux.' && !f.permis, JSON.stringify(f));
  R.check('niveau 2 achetable : bouton actif', f.monter && !f.monter.off && f.monter.niveau === '2', JSON.stringify(f.monter));
  await L.said(page, true);
  await page.click('#dlg-quartier [data-action="qrt-monter"]');
  R.check('niveau 2 acheté', await L.waitFor(() => srv.game()?.niveaux?.champs === 2, 6000));
  R.check('… sa carte, sans réplique de Fanal (il ne parle qu’au niveau 1)', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-recompense').open), 4000));
  await page.waitForTimeout(450);
  k = await carte(page);
  R.check('carte du niveau 2 : 5 → 6, décrite par la phrase seule', k.niveau === 'Niveau 2' && k.compare === '5 6' && !k.fanal && k.desc === 'Champs : niveau 2. 6 Nourriture par récolte du potager.', JSON.stringify(k));
  await page.keyboard.press('Escape');
  R.check('Échap ferme la carte', await closed(page, 'dlg-recompense'));
  await rouvrir();
  f = await fiche(page);
  R.check('niveau 3 trop cher : bouton à plat, aria-disabled, cadenas, décrit par la raison', f.monter && f.monter.off && !f.monter.primaire && f.monter.lock && f.monter.desc === 'qrt-raison' && f.monter.text === 'Monter au niveau 3', JSON.stringify(f.monter));
  g = srv.game();
  const raison = `Il manque 3 permis, ${Math.ceil(Math.round((240 - g.resources.energy) * 10) / 10)} Énergie et ${Math.ceil(Math.round((180 - g.resources.materials) * 10) / 10)} Matériaux.`;
  R.check('raison écrite par le cœur, lue mais pas affichée (les pastilles la montrent)', f.raison && f.raison.cache && f.raison.text === raison, JSON.stringify({ vu: f.raison, attendu: raison }));
  const mq = (n) => Math.ceil(Math.round(n * 10) / 10);
  const pastilles = `permis 3 pointillés il manque 3, energie 240 pointillés il manque ${mq(240 - g.resources.energy)}, materiaux 180 pointillés il manque ${mq(180 - g.resources.materials)}`;
  R.check('pastilles en pointillés, « il manque N » sous chacune', f.pastilles === pastilles, JSON.stringify({ vu: f.pastilles, attendu: pastilles }));
  await L.waitFor(async () => (await badge(page)).text === '0', 4000);
  bd = await badge(page);
  R.check('plus de permis : le compteur dit « Permis : 0 », « Construire » reste « Construire »', bd.text === '0' && bd.label === 'Permis\u00a0: 0' && !bd.pastille && bd.build === 'Construire', JSON.stringify(bd));
  await shot(page, '31-refus');
  const g2 = JSON.stringify(srv.game());
  await L.said(page, true);
  await page.click('#dlg-quartier [data-action="qrt-monter"]', { force: true }); // aria-disabled : Playwright attendrait
  await page.waitForTimeout(600);
  const redit = (await L.said(page)).find((x) => /Il manque 3 permis/.test(x.text));
  R.check('toucher le bouton verrouillé redit la raison, dans la fiche', redit && redit.sheet === 'dlg-quartier', JSON.stringify(await L.said(page)));
  R.check('… et n’achète rien', JSON.stringify(srv.game()) === g2);
  await page.keyboard.press('Escape');
  R.check('Échap ferme la fiche', await closed(page, 'dlg-quartier'));

  // ───── filtres déjà posés dans la liste (« Faites », une recherche, « 15 min ») : « Voir les quêtes » les retire plus bas
  await page.waitForTimeout(400);
  await L.openPanel(page);
  await page.click('.seg-option:has(input[value="done"])');
  await page.fill('#search', 'zz');
  await page.click('.chip[data-filter="quick"]');
  if (compact) { await page.click('.panel-toggle'); await page.waitForTimeout(450); }

  // ───── clavier : « Construire » → Quartiers ; la fiche s'empile sur le catalogue
  await page.waitForTimeout(400);
  await page.focus('[data-ow="build"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#dlg-construire[open]');
  await page.waitForTimeout(450);
  const onglets0 = await page.evaluate(() => [...document.querySelectorAll('#dlg-construire [role="tab"]')].map((t) => `${t.id}:${t.getAttribute('aria-selected')}`).join());
  R.check('catalogue : deux onglets, ouvert sur « Bâtiments »', onglets0 === 'cat-bats-t:true,cat-qrts-t:false', onglets0);
  await page.focus('#cat-bats-t');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const onglet = await page.evaluate(() => ({ focus: document.activeElement?.id, sel: document.getElementById('cat-qrts-t').getAttribute('aria-selected'), bats: document.getElementById('cat-bats').hidden, qrts: document.getElementById('cat-qrts').hidden, h: document.getElementById('cat-qrts-t').getBoundingClientRect().height }));
  R.check('flèche droite : l’onglet Quartiers a le focus et s’affiche (44 px)', onglet.focus === 'cat-qrts-t' && onglet.sel === 'true' && onglet.bats && !onglet.qrts && onglet.h >= 43.99, JSON.stringify(onglet));
  const cat = await page.evaluate(() => {
    const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const d = document.getElementById('dlg-construire');
    return {
      permis: !!d.querySelector('#cat-permis'),
      titre: sp(d.querySelector('#cat-qrts-t')?.textContent),
      rows: [...d.querySelectorAll('.cat-qrt')].map((li) => {
        const b = li.querySelector('.cat-qrt-go'), r = b.getBoundingClientRect();
        const e = li.querySelector('.cat-etat');
        const c = li.querySelector('.cat-compare');
        return { q: li.dataset.quartier, nom: sp(li.querySelector('.cat-nom').textContent), label: sp(b.getAttribute('aria-label')), suivant: sp(li.querySelector('.cat-suivant').textContent),
          compare: [c.querySelector('.cat-avant')?.textContent, c.querySelector('b')?.textContent, c.querySelector('.cat-unite')?.textContent].filter(Boolean).join(' '),
          prix: [...li.querySelectorAll('.cat-prix .pastille')].map((p) => sp(p.textContent) + (p.hasAttribute('data-manque') ? '…' : '')).join(' '), w: r.width, h: r.height,
          etat: e && !e.hidden ? sp(e.textContent) : '', lu: !!e?.classList.contains('sr-only'), data: li.dataset.etat || '', lock: !!e?.querySelector('use[href$="#i-lock"]') };
      }),
      wide: [...d.querySelectorAll('*')].some((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }),
      bats: d.querySelectorAll('.cat-row').length,
    };
  });
  const row = (id) => cat.rows.find((r) => r.q === id) || {};
  R.check('catalogue : plus de ligne des permis en tête (la fiche « Permis » le dit)', !cat.permis);
  R.check('catalogue : onglet « Quartiers », six lignes (les 11 bâtiments dans l’autre onglet)', cat.titre === 'Quartiers' && cat.rows.map((r) => r.q).join() === 'champs,atelier,mairie,ecole,garage,place' && cat.bats === 11, JSON.stringify(cat.rows.map((r) => r.q)));
  R.check('ligne des Champs : niveau, « 6 → 7 par récolte », prix en pastilles, la phrase lue', row('champs').nom === 'Champs · niveau 2' && row('champs').label === 'Champs · niveau 2' && row('champs').compare === '6 7 par récolte'
    && row('champs').prix === '3… 240… 180…'
    && row('champs').suivant === 'Maintenant : 6 Nourriture par récolte du potager. Niveau 3 : 7 Nourriture par récolte du potager. Prix : 3 permis, 240 Énergie et 180 Matériaux.', JSON.stringify(row('champs')));
  R.check('ligne du Garage : le plus haut pour l’instant, sans prix', row('garage').nom === 'Garage · niveau 2' && row('garage').compare === '3 jours pour mûrir' && row('garage').etat === 'Le plus haut pour l’instant' && row('garage').prix === '', JSON.stringify(row('garage')));
  const manque = (await (async () => { const g = srv.game(); return `Il manque 3 permis, ${Math.ceil(Math.round((240 - g.resources.energy) * 10) / 10)} Énergie et ${Math.ceil(Math.round((180 - g.resources.materials) * 10) / 10)} Matériaux.`; })());
  R.check('ligne des Champs : ce qui manque (la phrase de la fiche), lue seulement : les pointillés le montrent', row('champs').data === 'manque' && row('champs').lu && row('champs').etat === manque, JSON.stringify({ vu: row('champs'), attendu: manque }));
  R.check('ligne de l’Atelier : « Il manque 1 permis… », lue, la pastille du permis en pointillés', row('atelier').data === 'manque' && row('atelier').lu && /^Il manque 1 permis/.test(row('atelier').etat) && /^1…/.test(row('atelier').prix), JSON.stringify(row('atelier')));
  R.check('ligne du Garage : au plus haut, sans cadenas', row('garage').data === 'max' && !row('garage').lock && !row('garage').lu, JSON.stringify(row('garage')));
  R.check('lignes des quartiers : cibles de 44 px, aucun débordement', cat.rows.every((r) => r.h >= 43.99 && r.w >= 43.99) && !cat.wide, JSON.stringify({ h: cat.rows.map((r) => Math.round(r.h)), wide: cat.wide }));
  await shot(page, '31-catalogue');
  await page.focus('#dlg-construire .cat-qrt-go[data-quartier="garage"]');
  await page.keyboard.press('Enter');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await page.waitForTimeout(450);
  f = await fiche(page);
  R.check('Entrée sur la ligne du Garage : sa fiche, posée sur le catalogue', f.open && f.quartier === 'garage' && f.pile.join() === 'dlg-construire,dlg-quartier', JSON.stringify({ q: f.quartier, pile: f.pile }));
  R.check('Garage au plus haut : pas de bouton d’achat ni de prix, « Niveau 2 : le plus haut pour l’instant. », la valeur seule (3)', !f.monter && !f.pastilles && f.max === 'Niveau 2 : le plus haut pour l’instant.' && f.compare.avant === '3' && f.compare.apres === null && f.compare.sr === 'Maintenant : 3 jours de passage pour qu’une culture mûrisse.', JSON.stringify({ max: f.max, compare: f.compare, p: f.pastilles }));
  R.check('le focus est dans la fiche', await page.evaluate(() => document.getElementById('dlg-quartier').contains(document.activeElement)));
  await shot(page, '31-pile');
  await page.keyboard.press('Escape');
  await closed(page, 'dlg-quartier');
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => ({ cat: document.getElementById('dlg-construire').open, focus: document.activeElement?.dataset?.quartier || document.activeElement?.tagName }));
  R.check('Échap ne ferme que la fiche ; le focus revient sur la ligne du Garage', back.cat && back.focus === 'garage', JSON.stringify(back));
  await page.focus('#dlg-construire .cat-qrt-go[data-quartier="atelier"]');
  await page.keyboard.press('Enter');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open && document.getElementById('dlg-quartier').dataset.quartier === 'atelier'), 2000);
  await page.waitForTimeout(450);
  f = await fiche(page);
  R.check('fiche de l’Atelier : niveau 1 verrouillé (aucun permis)', f.monter && f.monter.off && f.raison && /^Il manque 1 permis/.test(f.raison.text), JSON.stringify({ m: f.monter, r: f.raison }));
  await page.focus('#dlg-quartier [data-action="qrt-quetes"]');
  await page.keyboard.press('Enter');
  R.check('« Voir les quêtes Maison (1) » ferme la fiche et le catalogue, ouvre le panneau filtré', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-quartier').open && !document.getElementById('dlg-construire').open
    && document.getElementById('app').dataset.panel === 'open'
    && document.querySelector('.chip[data-quartier="atelier"]').getAttribute('aria-pressed') === 'true'
    && [...document.querySelectorAll('#quest-list .quest-title')].map((e) => e.textContent.trim()).join('|') === 'Changer une ampoule'), 2500), f.quetes);
  const filtres = await page.evaluate(() => ({ statut: document.querySelector('input[name="statut"]:checked')?.value, search: document.getElementById('search').value, quick: document.querySelector('.chip[data-filter="quick"]').getAttribute('aria-pressed'), liste: [...document.querySelectorAll('#quest-list:not([hidden]) .quest-title')].map((e) => e.textContent.trim()) }));
  R.check('« Voir les quêtes » remet « À faire », vide la recherche et retire « 15 min » : la liste montre la quête comptée', filtres.statut === 'todo' && filtres.search === '' && filtres.quick === 'false' && filtres.liste.join('|') === 'Changer une ampoule', JSON.stringify(filtres));
  const foc = await L.waitFor(() => page.evaluate(() => {
    const a = document.activeElement;
    if (!a || !a.matches('#quest-list .quest-main')) return null;
    const r = a.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { titre: a.querySelector('.quest-title')?.textContent.trim(), vu: !!top && a.contains(top) };
  }), 2000);
  R.check('au clavier, le focus arrive sur la quête de la liste filtrée, visible', foc && foc.titre === 'Changer une ampoule' && foc.vu, JSON.stringify(foc || await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80))));
  await page.locator('.chip[data-quartier="atelier"]').click(); // retire le filtre

  // ───── clavier : « Vue » → Carte en liste → « Ouvrir la fiche »
  await L.openPlan(page);
  await page.waitForSelector('#dlg-plan[open]');
  await page.waitForTimeout(450);
  const open = await page.evaluate(() => { const b = document.querySelector('#dlg-plan .ow-plan-open[data-quartier="mairie"]'); const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), text: b.textContent.trim(), w: r.width, h: r.height }; });
  R.check('Carte en liste : « Ouvrir la fiche », nommé par le quartier, 44 px', open.text === 'Ouvrir la fiche' && open.label === 'Ouvrir la fiche de la Mairie' && open.w >= 43.99 && open.h >= 43.99, JSON.stringify(open));
  await page.focus('#dlg-plan .ow-plan-open[data-quartier="mairie"]');
  await page.keyboard.press('Enter');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await page.waitForTimeout(450);
  f = await fiche(page);
  R.check('Entrée : fiche de la Mairie posée sur la carte en liste, 18 → 15, « −3 », « moins cher »', f.open && f.quartier === 'mairie' && f.pile.join() === 'dlg-plan,dlg-quartier' && f.compare.avant === '18' && f.compare.apres === '15' && f.compare.ecart === '\u22123' && f.compare.legendes === 'maintenant | niveau 1 | moins cher', JSON.stringify({ q: f.quartier, pile: f.pile, compare: f.compare }));
  await shot(page, '31-plan-fiche');
  await page.keyboard.press('Escape');
  await closed(page, 'dlg-quartier');
  await page.waitForTimeout(200);
  R.check('Échap ne ferme que la fiche ; la carte en liste reste, le focus sur « Ouvrir la fiche »', await page.evaluate(() => document.getElementById('dlg-plan').open && document.activeElement?.dataset?.quartier === 'mairie'));
  await page.keyboard.press('Escape');
  await closed(page, 'dlg-plan');
  R.check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));

  // ───── plafond des permis (lot M) : à 4 en main, la fiche du quartier n'en parle plus (lot L : la fiche Permis le dit) ;
  //       la pastille du permis passe pleine
  const gf = require('path').join(srv.root, 'app', 'api', 'data', 'game-state.json');
  const g4 = JSON.parse(require('fs').readFileSync(gf, 'utf8'));
  g4.permis = { ...g4.permis, dispo: 4 };
  require('fs').writeFileSync(gf, JSON.stringify(g4));
  await page.reload();
  await L.ready(page);
  await L.closeWelcome(page);
  await page.waitForTimeout(500);
  if (!(await hit(page, 'champs'))) { await page.click('[data-ow="quetes"]'); await page.waitForTimeout(450); }
  const p4 = await hit(page, 'champs');
  if (compact && p4) await page.touchscreen.tap(p4[0], p4[1]); else await page.click('.ow-plaque[data-sector="champs"]');
  await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-quartier').open), 2000);
  await page.waitForTimeout(450);
  f = await fiche(page);
  R.check('plafond : 4 permis en main, la fiche n’en parle pas ; la pastille « permis 3 » est pleine', !f.permis && /^permis 3 plein,/.test(f.pastilles), JSON.stringify({ permis: f.permis, p: f.pastilles }));
  R.check('plafond : la fiche ne déborde pas', !f.wide && !f.scroll, JSON.stringify({ wide: f.wide, scroll: f.scroll }));
  await shot(page, '31-plafond');
}, {
  tasks: TASKS,
  game: (core) => {
    const g = L.quietState(core);
    const today = core.gameDay(new Date());
    for (const id of core.PAS_IDS) g.premiersPas[id] = today; // un niveau s'achète après les premiers pas
    g.permis = { ...g.permis, dispo: 3 };
    g.resources = { ...g.resources, energy: 320, materials: 320, food: 5 };
    g.niveaux = { ...g.niveaux, garage: 2 };
    return g;
  },
});
