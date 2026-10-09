// 30. Colonne de la carte et catalogue « Construire ».
//   - colonne Construire, Quêtes, Vue : cibles de 44 px, posée au-dessus du vrai haut du panneau, jamais sous
//     « Passer l'animation » ni sous une plaque (rangée « Vue » dépliée comprise) ;
//   - « Vue » au clavier : Entrée déplie, Échap replie et rend le focus à « Vue » sans toucher au panneau ; aux limites
//     du zoom, aria-disabled (le bouton garde le focus) ; « Carte en liste » s'ouvre de la rangée et rend le focus à « Vue » ;
//   - catalogue : une ligne par type, coût, « Disponible » ou la raison du cœur ; un geste verrouillé redit la raison et
//     ne bâtit rien ; un double toucher bâtit une seule fois, le catalogue se ferme et la carte montre le bâtiment ;
//     une synchronisation le met à jour sur place sans perdre le focus ; aucun défilement horizontal.
const L = require('./lib.cjs');

/** Boîtes de la colonne, de la rangée (si dépliée), du bouton de saut et des plaques, et du haut du panneau. */
const layout = (page) => page.evaluate(() => {
  const box = (e) => { if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
  const panel = document.getElementById('panel').getBoundingClientRect();
  return {
    col: box(document.querySelector('.ow-zoom')),
    row: box(document.querySelector('.ow-zrow')),
    skip: box(document.querySelector('.ow-skip')),
    plaques: [...document.querySelectorAll('.ow-plaque')].map((p) => ({ s: p.dataset.sector, ...box(p) })),
    btns: [...document.querySelectorAll('.ow-zbtn')].map((b) => ({ k: b.dataset.ow || b.dataset.zoom, ...box(b) })).filter((b) => b.w),
    panelTop: panel.top, panelLeft: panel.left, vw: innerWidth, vh: innerHeight,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
  };
});
const meets = (a, b) => a && b && a.r > b.l && a.l < b.r && a.b > b.t && a.t < b.b;

L.runScenario('30. Colonne de la carte et catalogue « Construire »', async ({ R, srv, newPage, tag, shot }) => {
  const compact = tag < 1000;
  const { page, context } = await newPage({}, { hasTouch: true, isMobile: compact });
  await context.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('[data-ow="vue"]', { timeout: 8000 });
  await page.waitForTimeout(500);

  // ───── colonne : trois boutons, dans l'ordre, nommés, 44 px, au-dessus du panneau
  const col = await page.evaluate(() => [...document.querySelectorAll('.ow-zoom > .ow-zbtn')].map((b) => ({
    k: b.dataset.ow, label: b.getAttribute('aria-label'), exp: b.getAttribute('aria-expanded'), ctl: b.getAttribute('aria-controls'), pop: b.getAttribute('aria-haspopup'),
  })));
  R.check('colonne : Construire, Quêtes, Vue (dans cet ordre, nommés)', col.map((c) => `${c.k}:${c.label}`).join('|') === 'build:Construire|quetes:Quêtes|vue:Vue', JSON.stringify(col));
  R.check('« Quêtes » commande le panneau (aria-controls, aria-expanded)', col[1].ctl === 'panel' && col[1].exp === 'true', JSON.stringify(col[1]));
  R.check('« Vue » : aria-expanded=false et aria-controls vers sa rangée', col[2].exp === 'false' && !!col[2].ctl && await page.evaluate((id) => { const r = document.getElementById(id); return !!r && r.hidden; }, col[2].ctl), JSON.stringify(col[2]));
  let lay = await layout(page);
  R.check('colonne : cibles de 44 px', lay.btns.length === 3 && lay.btns.every((b) => b.w >= 43.99 && b.h >= 43.99), JSON.stringify(lay.btns.map((b) => [b.k, b.w, b.h])));
  const floor = compact ? lay.panelTop : lay.vh;
  R.check('colonne : posée au-dessus du haut réel du panneau (8 px au moins)', lay.col.b <= floor - 8 && lay.col.b >= floor - 20, JSON.stringify({ bas: lay.col.b, plancher: floor }));
  if (!compact) R.check('colonne large : à gauche de la colonne des quêtes', lay.col.r <= lay.panelLeft - 8, JSON.stringify({ col: lay.col.r, panel: lay.panelLeft }));

  // ───── « Vue » au clavier ; Échap replie la rangée sans toucher au panneau
  await L.openPanel(page);
  const panel0 = await page.getAttribute('#app', 'data-panel');
  await page.focus('[data-ow="vue"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  let vue = await page.evaluate(() => ({ exp: document.querySelector('[data-ow="vue"]').getAttribute('aria-expanded'), row: !document.querySelector('.ow-zrow').hidden, order: [...document.querySelectorAll('.ow-zrow .ow-zbtn')].map((b) => b.getAttribute('aria-label')) }));
  R.check('clavier : Entrée sur « Vue » déplie la rangée (aria-expanded=true)', vue.exp === 'true' && vue.row, JSON.stringify(vue));
  R.check('rangée : Rapprocher, Éloigner, Toute l’île, Carte en liste', vue.order.join('|') === 'Rapprocher|Éloigner|Toute l’île|Carte en liste', JSON.stringify(vue.order));
  await page.keyboard.press('Tab');
  R.check('Tab entre dans la rangée (Rapprocher)', await page.evaluate(() => document.activeElement?.dataset?.zoom === 'in'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  vue = await page.evaluate(() => ({ exp: document.querySelector('[data-ow="vue"]').getAttribute('aria-expanded'), row: !document.querySelector('.ow-zrow').hidden, focus: document.activeElement?.dataset?.ow || document.activeElement?.tagName, panel: document.getElementById('app').dataset.panel }));
  R.check('Échap dans la rangée : elle se replie et le focus revient sur « Vue »', vue.exp === 'false' && !vue.row && vue.focus === 'vue', JSON.stringify(vue));
  R.check('… sans replier le panneau (Échap déjà traitée)', vue.panel === panel0, `${panel0} → ${vue.panel}`);
  if (compact) { await page.click('.panel-toggle'); await page.waitForTimeout(450); } // en compact, le panneau ouvert recouvre la colonne

  // ───── limites du zoom : aria-disabled, pas disabled ; le bouton garde le focus
  await page.click('[data-ow="vue"]');
  await page.click('[data-zoom="fit"]');
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => { const b = document.querySelector('[data-zoom="out"]'); b.focus(); return { aria: b.getAttribute('aria-disabled'), disabled: b.disabled, focus: document.activeElement === b }; });
  R.check('toute l’île : « Éloigner » aria-disabled (pas disabled), garde le focus', out.aria === 'true' && !out.disabled && out.focus, JSON.stringify(out));
  for (let i = 0; i < 5 && await page.getAttribute('[data-zoom="in"]', 'aria-disabled') !== 'true'; i++) { await page.click('[data-zoom="in"]'); await page.waitForTimeout(350); }
  const inn = await page.evaluate(() => { const b = document.querySelector('[data-zoom="in"]'); return { aria: b.getAttribute('aria-disabled'), disabled: b.disabled, out: document.querySelector('[data-zoom="out"]').getAttribute('aria-disabled') }; });
  R.check('au plus près : « Rapprocher » aria-disabled, « Éloigner » de nouveau actif', inn.aria === 'true' && !inn.disabled && inn.out === null, JSON.stringify(inn));

  // ───── rangée dépliée : aucune plaque dessous, ni sous la colonne ; aucun défilement horizontal
  await page.click('[data-zoom="fit"]');
  await page.waitForTimeout(600);
  lay = await layout(page);
  const under = lay.plaques.filter((p) => meets(p, lay.col) || meets(p, lay.row)).map((p) => p.s);
  R.check('rangée dépliée : aucune plaque sous la colonne ni sous la rangée', lay.row && under.length === 0, JSON.stringify({ under, row: lay.row }));
  R.check('rangée dépliée : cibles de 44 px', lay.btns.length === 7 && lay.btns.every((b) => b.w >= 43.99 && b.h >= 43.99), JSON.stringify(lay.btns.map((b) => [b.k, b.w])));
  R.check('rangée dépliée : dans l’écran, aucun défilement horizontal', lay.row.l >= 0 && lay.scrollW <= lay.clientW, JSON.stringify({ l: lay.row.l, sw: lay.scrollW }));
  await shot(page, '30-vue');
  // la rangée fait seulement remonter les plaques qu'elle toucherait : aucune ne change de côté, aucune ne s'empile
  await page.click('[data-ow="vue"]');
  await page.waitForTimeout(250);
  const closed = await layout(page);
  await page.click('[data-ow="vue"]');
  await page.waitForTimeout(250);
  const pairs = (ps) => { const out = []; ps.forEach((a, i) => ps.slice(i + 1).forEach((b) => { if (meets(a, b)) out.push(`${a.s}/${b.s}`); })); return out; };
  const moved = lay.plaques.filter((p) => { const q = closed.plaques.find((x) => x.s === p.s); return Math.abs(p.l - q.l) > 1; }).map((p) => p.s);
  const stacked = pairs(lay.plaques).filter((x) => !pairs(closed.plaques).includes(x));
  R.check('rangée dépliée : aucune plaque ne change de côté ni ne s’empile sur une autre', !moved.length && !stacked.length, JSON.stringify({ moved, stacked }));

  // ───── « Carte en liste » depuis la rangée ; en se fermant, elle rend le focus à « Vue »
  await page.click('[data-ow="plan"]');
  R.check('« Carte en liste » s’ouvre depuis la rangée', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-plan').open), 2000));
  R.check('… et la rangée se replie', await page.evaluate(() => document.querySelector('.ow-zrow').hidden && document.querySelector('[data-ow="vue"]').getAttribute('aria-expanded') === 'false'));
  await page.keyboard.press('Escape');
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-plan').open), 2000);
  R.check('fermer la carte en liste rend le focus à « Vue »', await L.waitFor(() => page.evaluate(() => document.activeElement?.dataset?.ow === 'vue'), 1500), await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80)));

  // ───── catalogue « Construire »
  await page.click('[data-ow="build"]');
  await page.waitForSelector('#dlg-construire[open]');
  await page.waitForTimeout(450);
  const cat = await page.evaluate(() => [...document.querySelectorAll('#dlg-construire .cat-row')].map((li) => {
    const b = li.querySelector('.cat-go');
    const r = b.getBoundingClientRect();
    return {
      type: li.dataset.type, nom: li.querySelector('.cat-nom').textContent, cout: li.querySelector('.cat-cout').textContent.replace(/ /g, ' '),
      etat: li.querySelector('.cat-etat').textContent.replace(/ /g, ' '), off: b.getAttribute('aria-disabled') === 'true', id: b.dataset.id || null,
      label: b.getAttribute('aria-label').replace(/ /g, ' '), h: r.height, thumb: !!li.querySelector('.cat-thumb svg'),
    };
  }));
  const row = (t) => cat.find((c) => c.type === t) || {};
  R.check('catalogue : une ligne par type de bâtiment (11, le rang Village compris), avec son dessin', cat.map((c) => c.type).join() === 'chalet,parcelle,atelier,serre,eolienne,grenier,quai,tour,scierie,poulailler,cabane' && cat.every((c) => c.thumb), JSON.stringify(cat.map((c) => c.type)));
  R.check('catalogue : coût écrit (chalet)', row('chalet').cout === 'Coûte 15 Matériaux.', row('chalet').cout);
  R.check('catalogue : chalet disponible, sur le premier emplacement libre', !row('chalet').off && row('chalet').etat === 'Disponible' && row('chalet').id === 'chalet-1' && row('chalet').label === 'Rebâtir : Chalet', JSON.stringify(row('chalet')));
  R.check('catalogue : parcelle sur la 2e (la 1re est là depuis le départ)', row('parcelle').id === 'parcelle-2', JSON.stringify(row('parcelle')));
  R.check('catalogue : grenier verrouillé avec la raison du cœur (comme la fiche)', row('grenier').off && row('grenier').etat === 'Hameau : encore 3 habitants.', JSON.stringify(row('grenier')));
  R.check('catalogue : serre verrouillée (il faut d’abord un atelier)', row('serre').off && row('serre').etat === 'Il faut d’abord un atelier.', JSON.stringify(row('serre')));
  R.check('catalogue : boutons de 44 px au moins', cat.every((c) => c.h >= 43.99), JSON.stringify(cat.map((c) => c.h)));
  R.check('catalogue : une région lue dans la feuille', await page.evaluate(() => !!document.querySelector('#dlg-construire > [data-live][role="status"]')));
  R.check('catalogue : aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && [...document.querySelectorAll('#dlg-construire *')].every((e) => { const r = e.getBoundingClientRect(); return !r.width || (r.left >= -1 && r.right <= innerWidth + 1); })));
  await shot(page, '30-catalogue');

  const g0 = srv.game();
  await L.said(page, true);
  await page.click('#dlg-construire .cat-row[data-type="grenier"] .cat-go', { force: true }); // aria-disabled : Playwright attendrait
  await page.waitForTimeout(500);
  const dit = (await L.said(page)).find((x) => /Hameau/.test(x.text));
  R.check('geste verrouillé : la raison est redite, dans la feuille', dit && dit.sheet === 'dlg-construire', JSON.stringify(await L.said(page)));
  R.check('… et rien n’est bâti', JSON.stringify(srv.game().batiments || []) === JSON.stringify(g0.batiments || []));

  // double toucher sur « Rebâtir » : une seule construction
  await page.waitForTimeout(900);
  const go = await page.evaluate(() => { const r = document.querySelector('#dlg-construire .cat-row[data-type="chalet"] .cat-go').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.touchscreen.tap(go[0], go[1]);
  await page.waitForTimeout(90);
  await page.touchscreen.tap(go[0], go[1]);
  R.check('double toucher : le chalet est enregistré', await L.waitFor(() => (srv.game()?.batiments || []).some((b) => b.id === 'chalet-1'), 6000));
  await page.waitForTimeout(1200);
  const g1 = srv.game();
  const chalets = (g1.batiments || []).filter((b) => b.type === 'chalet').map((b) => b.id);
  const batis = (await L.said(page)).filter((x) => /c’est bâti/.test(x.text)).map((x) => x.text);
  R.check('double toucher : un seul chalet bâti, une seule annonce « c’est bâti »', chalets.join() === 'chalet-1' && batis.length === 1, JSON.stringify({ chalets, batis, said: await L.said(page) }));
  R.check('le catalogue se ferme après la construction', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-construire').open), 2000));
  R.check('le focus revient sur « Construire »', await L.waitFor(() => page.evaluate(() => document.activeElement?.dataset?.ow === 'build'), 1500));
  await page.waitForTimeout(900);
  const cam = await page.evaluate(() => {
    const e = document.querySelector('.ow-ent[data-id="chalet-1"]').getBoundingClientRect();
    const ow = document.querySelector('.ow').getBoundingClientRect();
    // les deux sondes de la caméra (zones couvertes en haut et en bas), et sa règle des 45 % de hauteur libre
    const probe = (v) => [...document.querySelectorAll('.ow > .ow-probe')].find((p) => p.style.height.includes(v)).offsetHeight;
    let top = probe('--world-safe-top'), bottom = probe('--world-cover-bottom');
    const max = ow.height * 0.55;
    if (top + bottom > max) { const k = max / (top + bottom); top *= k; bottom *= k; }
    const cx = e.left + e.width / 2 - ow.left, cy = e.top + e.height / 2 - ow.top;
    return { cx, cy, fx: ow.width / 2, fy: top + (ow.height - top - bottom) / 2, top, bottom: ow.height - bottom, w: ow.width };
  });
  R.check('la carte montre le chalet neuf, dans la zone libre', cam.cx > 20 && cam.cx < cam.w - 20 && cam.cy > cam.top && cam.cy < cam.bottom, JSON.stringify(cam));
  const tagText = await page.evaluate(() => { const t = document.querySelector('.ow-tag'); return t.hidden ? '' : t.textContent; });
  R.check('… et le nomme (étiquette de la carte)', /^Chalet/.test(tagText), tagText);
  if (compact) R.check('… près du centre de la zone libre', Math.abs(cam.cx - cam.fx) < 80 && Math.abs(cam.cy - cam.fy) < 80, JSON.stringify(cam));
  await shot(page, '30-bati');

  // le catalogue rouvert : le chalet suivant ; une synchronisation le met à jour sur place, le focus reste
  await page.waitForTimeout(800);
  await page.click('[data-ow="build"]');
  await page.waitForSelector('#dlg-construire[open]');
  await page.waitForTimeout(400);
  R.check('catalogue rouvert : le chalet suivant est visé (chalet-2)', await page.getAttribute('#dlg-construire .cat-row[data-type="chalet"] .cat-go', 'data-id') === 'chalet-2');
  await page.focus('#dlg-construire .cat-row[data-type="parcelle"] .cat-go');
  await page.evaluate(() => { document.querySelector('#dlg-construire .cat-row[data-type="parcelle"] .cat-go').__mark = 1; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(1200);
  const kept = await page.evaluate(() => ({ same: document.activeElement?.__mark === 1, open: document.getElementById('dlg-construire').open }));
  R.check('synchronisation, catalogue ouvert : mis à jour sur place, le focus reste sur la ligne', kept.same && kept.open, JSON.stringify(kept));
  await page.keyboard.press('Escape');
});
