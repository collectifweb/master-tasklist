// 15. Potager et construction : semer depuis la carte, réparer la Tour depuis le plan accessible, boutons refusés
// lisibles (« Il manque… »), quête le lendemain, récolte au glissé, partage au village.
const L = require('./lib.cjs');

const actSheet = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-act');
  return {
    open: d.open,
    title: (d.querySelector('#act-t') || {}).textContent?.replace(/\s+/g, ' ').trim() || '',
    buttons: [...d.querySelectorAll('[data-act]')].map((b) => ({
      act: b.dataset.act, params: b.dataset.params, text: b.textContent.replace(/\s+/g, ' ').trim(),
      off: b.getAttribute('aria-disabled') === 'true',
      reason: b.getAttribute('aria-describedby') ? (document.getElementById(b.getAttribute('aria-describedby')) || {}).textContent?.replace(/\s+/g, ' ').trim() : '',
      h: b.getBoundingClientRect().height,
    })),
    overflow: [...d.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length,
  };
});
const btn = (s, act, part) => s.buttons.find((b) => b.act === act && (!part || (b.params || '').includes(part)));
// voix de l'interface : #live, ou son double dans la feuille ouverte (#live est alors inerte)
const live = (page) => page.evaluate(() => [document.getElementById('live'), ...document.querySelectorAll('dialog > [data-live="live"]')].map((e) => e.textContent).join(' ').trim());
/** Un geste, une voix : l'interface le dit, le monde le dessine sans le redire. */
const oneVoice = async (page, re) => {
  const s = (await L.said(page)).filter((x) => re.test(x.text));
  return { ok: s.some((x) => x.voice === 'live') && !s.some((x) => x.voice === 'live-world'), detail: JSON.stringify(s) };
};
const openPlanTarget = async (page, target) => {
  if (!(await page.evaluate(() => document.getElementById('dlg-plan').open))) {
    await L.openPanel(page);
    await page.click('[data-action="open-plan"]');
    await page.waitForSelector('#dlg-plan[open]');
  }
  await page.click(`#dlg-plan [data-act="open-target"][data-params='${JSON.stringify(target)}']`);
  await page.waitForSelector('#dlg-act[open]');
  await page.waitForTimeout(250);
};
const idle = (page) => L.waitFor(() => page.evaluate(() => document.querySelector('.ow-skip').hidden), 8000);
/** Point de la zone de toucher d'un objet que rien d'autre ne recouvre (Solène se tient devant la parcelle 1). */
const freePoint = (page, id) => page.evaluate((id) => {
  const el = document.querySelector(`.ow-ent[data-id="${id}"]`);
  const hit = el && el.querySelector('.ow-hit');
  if (!hit) return null;
  const r = hit.getBoundingClientRect();
  for (const gy of [0.6, 0.5, 0.7, 0.4, 0.8, 0.3]) {
    for (const gx of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      const x = r.left + r.width * gx, y = r.top + r.height * gy;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const at = document.elementFromPoint(x, y);
      if (at && at.closest('.ow-ent') === el) return [x, y];
    }
  }
  return null;
}, id);

L.runScenario('15. potager et construction', async ({ R, srv, newPage, size, shot }) => {
  const { context, page } = await newPage();
  await context.addInitScript(L.VOICES);
  await page.clock.install({ time: new Date() });
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForSelector('.ow-ent.is-btn[data-id="parcelle-1"]', { timeout: 8000 });
  await page.waitForTimeout(600);
  const e0 = await L.resValue(page, 'energie');

  // ───── semer depuis la carte
  await page.locator('.ow-ent.is-btn[data-id="parcelle-1"]').dispatchEvent('click');
  R.check('toucher la parcelle ouvre sa feuille d’actions', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-act').open), 3000));
  let s = await actSheet(page);
  R.check('feuille : « Parcelle 1 », parcelle vide', /Parcelle 1/.test(s.title) && /Parcelle vide/.test(s.title), s.title);
  const sc = btn(s, 'sow', 'courge'), sp = btn(s, 'sow', 'patate'), sb = btn(s, 'sow', 'ble');
  R.check('trois semis avec leur coût (3, 4 et 4 Énergie)', sc && sp && sb && /Semer une courge\s*3/.test(sc.text) && /4/.test(sp.text) && /4/.test(sb.text) && /Énergie/.test(sc.text), s.buttons.map((b) => b.text).join(' | '));
  R.check('feuille : boutons d’au moins 44 px, aucun débordement', s.buttons.every((b) => b.h >= 43.5) && s.overflow === 0, JSON.stringify(s.buttons.map((b) => b.h)) + ' / ' + s.overflow);
  await shot(page, '15-parcelle');
  await page.click('#dlg-act [data-act="sow"][data-params*="courge"]');
  R.check('semer referme la feuille', await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-act').open), 2000));
  R.check('la courge est semée dans l’état enregistré', await L.waitFor(() => { const g = srv.game(); return g && g.plots[0].crop === 'courge'; }, 5000));
  R.check('3 Énergie dépensées', await L.waitFor(async () => (await L.resValue(page, 'energie')) === e0 - 3, 3000), `${e0} → ${await L.resValue(page, 'energie')}`);
  // lue une fois la feuille fermée (pendant sa fermeture, elle est encore modale)
  R.check('annonce lue : « Courge semée. »', await L.waitFor(async () => /Courge semée/.test(await live(page)), 2000), await live(page));
  const sem = (await L.said(page)).find((x) => /Courge semée/.test(x.text));
  R.check('« Courge semée. » est écrite une fois la feuille fermée (pas dans une page rendue inerte par elle)', !!sem && sem.voice === 'live' && sem.sheet === '' && sem.open.length === 0, JSON.stringify(sem));
  await idle(page);
  let v = await oneVoice(page, /semée|semis/i);
  R.check('une seule voix : le monde ne redit pas le semis', v.ok, v.detail);

  // ───── réparer la Tour depuis le plan accessible
  await openPlanTarget(page, { type: 'landmark', id: 'tour' });
  s = await actSheet(page);
  const rep = btn(s, 'build', 'tour');
  R.check('plan → Tour : « Réparer la Tour · 20 ▣ + 6 ⚡ »', rep && !rep.off && /Réparer la Tour/.test(rep.text) && /20/.test(rep.text) && /6/.test(rep.text) && /Matériaux/.test(rep.text), rep && rep.text);
  await shot(page, '15-tour');
  await page.click('#dlg-act [data-act="build"]');
  R.check('la Tour est réparée (état enregistré)', await L.waitFor(() => (srv.game()?.placements || []).some((p) => p.id === 'tour' && p.state === 'reparee'), 5000));
  R.check('le plan reste ouvert après le geste', await L.waitFor(() => page.evaluate(() => document.getElementById('dlg-plan').open && !document.getElementById('dlg-act').open), 2000));
  const focusTour = () => page.evaluate(() => { const a = document.activeElement; return !!a && a.matches('#dlg-plan [data-act="open-target"]') && a.dataset.params === '{"type":"landmark","id":"tour"}'; });
  R.check('le focus revient au bouton « Agir » de la Tour dans le plan (pas sur la page)', await L.waitFor(focusTour, 2000), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 140)));
  await L.waitFor(async () => /réparée/.test((await L.voice(page)).text), 2000);
  const vt = await L.voice(page);
  R.check('« Tour de veille réparée. » lue dans le plan ouvert, là où un lecteur d’écran l’entend', /Tour de veille réparée/.test(vt.text) && vt.sheet === 'dlg-plan' && vt.ignored === false, JSON.stringify(vt));
  await idle(page);
  v = await oneVoice(page, /réparée/);
  R.check('une seule voix : le monde ne redit pas la réparation', v.ok, v.detail);
  const planTour = await page.textContent('#dlg-plan .plan-acts');
  R.check('le plan dit « Réparée »', /Réparée/.test(planTour), planTour.slice(0, 200));

  // ───── refusé, mais lisible : le tunnel coûte 15 ▣, il en reste 2
  await openPlanTarget(page, { type: 'sector', id: 'champs' });
  s = await actSheet(page);
  const tun = btn(s, 'build', 'tunnel');
  R.check('tunnel refusé : aria-disabled, texte lisible', tun && tun.off && /Construire le tunnel/.test(tun.text), tun && tun.text);
  R.check('la raison dit ce qui manque : « Il manque 13 ▣ »', tun && /Il manque 13/.test(tun.reason) && /Matériaux/.test(tun.reason), tun && tun.reason);
  const souf = btn(s, 'souffler');
  R.check('« Souffler » refusé : il manque de l’Énergie', souf && souf.off && /Il manque/.test(souf.reason) && /Énergie/.test(souf.reason), souf && souf.reason);
  await shot(page, '15-manque');
  const m0 = srv.game().resources.materials;
  await page.click('#dlg-act [data-act="build"][data-params*="tunnel"]', { force: true });
  await page.waitForTimeout(500);
  R.check('toucher un bouton refusé ne fait rien', srv.game().resources.materials === m0 && await page.evaluate(() => document.getElementById('dlg-act').open));
  R.check('… et relit la raison', /Il manque/.test(await live(page)), await live(page));
  const vr = await L.voice(page);
  R.check('… dans la feuille ouverte, là où un lecteur d’écran l’entend', vr.sheet === 'dlg-act' && vr.ignored === false, JSON.stringify(vr));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  R.check('Échap referme la feuille puis le plan', await page.evaluate(() => !document.querySelector('dialog[open]')));
  if (size[0] < 1000) { await page.click('.panel-toggle'); await page.waitForTimeout(450); }

  // ───── jour 1 : une quête (la courge pousse), puis jour 2 : une quête (elle mûrit)
  await page.click('#fil-quest [data-action="complete"]');
  R.check('jour 1 : la quête fait pousser la courge (1 sur 2)', await L.waitFor(() => srv.game()?.plots[0].stage === 1, 5000), JSON.stringify(srv.game()?.plots[0]));
  await idle(page);
  await L.closeWelcome(page, 1200);
  await page.clock.fastForward(24 * 3600 * 1000);
  const closed = await L.closeWelcome(page, 3000);
  R.check('jour 2 : la journée s’ouvre (lettre du matin)', closed.includes('dlg-letter'), closed.join());
  await page.click('#fil-quest [data-action="complete"]');
  R.check('jour 2 : la courge est mûre', await L.waitFor(() => srv.game()?.plots[0].stage === 2, 5000), JSON.stringify(srv.game()?.plots[0]));
  await idle(page);
  await L.closeWelcome(page, 1200);

  // ───── récolte au glissé sur la carte (le plan accessible montre d'abord les Champs)
  await L.openPanel(page);
  await page.click('[data-action="open-plan"]');
  await page.waitForSelector('#dlg-plan[open]');
  await page.click('#dlg-plan .ow-plan-show[data-sector="champs"]');
  await L.waitFor(() => page.evaluate(() => !document.getElementById('dlg-plan').open), 2000);
  await page.waitForTimeout(1200);
  await page.waitForSelector('.ow-ent.is-btn[data-id="parcelle-1"][data-mure]', { timeout: 4000 }).catch(() => {});
  const at = await freePoint(page, 'parcelle-1');
  if (at) {
    const [x, y] = at;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y + 4, { steps: 3 });
    await page.mouse.move(x + 44, y + 8, { steps: 3 });
    await page.mouse.up();
  }
  R.check('glisser sur la parcelle mûre récolte la courge', await L.waitFor(() => { const g = srv.game(); return g && g.garden.pantry.courge === 1 && !g.plots[0].crop; }, 5000), JSON.stringify(srv.game()?.garden));
  await page.waitForTimeout(300);
  R.check('annonce lue : « Courge récoltée. Garde-manger : 1 sur 12. »', /Courge récoltée\. Garde-manger.?: 1 sur 12/.test(await live(page)), JSON.stringify(await live(page)));
  await idle(page);
  v = await oneVoice(page, /récolt/i);
  R.check('une seule voix : le monde ne redit pas la récolte', v.ok, v.detail);

  // ───── partager au village (la feuille reste ouverte)
  await openPlanTarget(page, { type: 'plot', id: 'parcelle-1' });
  s = await actSheet(page);
  R.check('feuille : garde-manger 1 sur 12, « Partager une courge au village »', /Garde-manger · 1 sur 12/.test(await page.textContent('#dlg-act')) && !!btn(s, 'shareHarvest', 'courge'), s.buttons.map((b) => b.text).join(' | '));
  await shot(page, '15-garde-manger');
  await page.click('#dlg-act [data-act="shareHarvest"]');
  R.check('partagée : le garde-manger est vide', await L.waitFor(() => srv.game()?.garden.pantry.courge === 0, 5000));
  // le rendu suit l'action ; on attend qu'il soit là (au plus 3 s) plutôt que de lire une seule fois
  const sheetNow = () => page.evaluate(() => ({ open: document.getElementById('dlg-act').open, text: document.getElementById('dlg-act').textContent.replace(/\s+/g, ' ').trim() }));
  const updated = await L.waitFor(async () => { const x = await sheetNow(); return x.open && /Garde-manger · 0 sur 12/.test(x.text); }, 3000);
  R.check('la feuille reste ouverte et se met à jour', updated, JSON.stringify(await sheetNow()).slice(0, 400));
  R.check('annonce lue : « Une courge partagée au village. »', /partagée au village/.test(await live(page)), await live(page));
}, { game: (core) => { const g = L.quietState(core); g.resources = { energy: 12, materials: 22, confidence: 0 }; return g; } });
