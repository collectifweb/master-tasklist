// 16. Premier gel : annonce au jour 5 du chapitre 2, jauge Préparation contre Force (givre), braseros (3 au plus),
// résolution « tenu » (+15 ▣ au registre) ; puis un Avis voilé et le voile levé à l'Énergie.
const L = require('./lib.cjs');

const carte = (page) => page.evaluate(() => {
  const c = document.getElementById('carnet-card');
  const b = c.querySelector('[data-act="lightBrasero"]');
  return {
    open: !c.hidden,
    text: c.textContent.replace(/\s+/g, ' ').trim(),
    lines: c.querySelectorAll('.carnet-lines .why-line').length,
    verdict: (c.querySelector('.avis-verdict') || {}).textContent?.trim() || '',
    brasero: b ? { off: b.getAttribute('aria-disabled') === 'true', text: b.textContent.replace(/\s+/g, ' ').trim(), reason: b.getAttribute('aria-describedby') ? document.getElementById(b.getAttribute('aria-describedby')).textContent.trim() : '' } : null,
    fill: (() => { const f = c.querySelector('.avis-gauge-fill'); return f ? getComputedStyle(f).backgroundColor : ''; })(),
  };
});
const sceneTitle = (page) => page.evaluate(() => (document.getElementById('dlg-scene').open ? document.getElementById('scene-t').textContent.trim() : ''));
const sceneText = async (page) => {
  const out = [];
  for (let i = 0; i < 20 && await page.evaluate(() => { const d = document.getElementById('dlg-scene'); return d.open && !d.classList.contains('is-closing'); }); i++) {
    out.push((await page.textContent('#dlg-scene .scene-text')).trim());
    await page.click('#dlg-scene [data-action="scene-next"]');
    await page.waitForTimeout(80);
  }
  return out;
};
const DAY = 24 * 3600 * 1000;
const idle = (page) => L.waitFor(() => page.evaluate(() => document.querySelector('.ow-skip').hidden), 12000);

function seed(core, now, extra) {
  const today = core.gameDay(now);
  const g = L.quietState(core, now);
  g.startDay = core.addDays(today, -30);
  g.chapter = { number: 2, startDay: core.addDays(today, -3), objectives: {} };
  g.sectors.atelier.open = true;
  g.resources = { energy: 40, materials: 30, confidence: 5 };
  g.lisiereDays = [];
  g.lastSeenDay = core.addDays(today, -1);
  return extra(g, today) || g;
}

L.runScenario('16. Premier gel : annonce, jauge, braseros, tenu ; voilé puis levé', async ({ R, srv, newPage, core, shot }) => {
  // ───── annonce au jour 5 du chapitre 2
  const { context, page } = await newPage();
  await context.addInitScript(L.VOICES);
  await page.clock.install({ time: new Date() });
  await page.goto(srv.url);
  await L.ready(page);
  await page.waitForTimeout(800);
  R.check('jour 4 du chapitre 2 : aucun Avis annoncé', await page.locator('#carnet [data-card="avis"]').count() === 0 && !srv.game().avis.current);
  await page.clock.fastForward(DAY);
  R.check('jour 5 : le Premier gel est annoncé (scène)', await L.waitFor(async () => (await sceneTitle(page)) === 'Avis · Premier gel', 5000), await sceneTitle(page));
  const lines = await sceneText(page);
  R.check('scène d’annonce : le jour est écrit, aucune accolade', lines.length >= 3 && /arrive (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|le \d+ \w+)/.test(lines[0]) && !lines.some((x) => /[{}]/.test(x)), lines[0]);
  await L.closeWelcome(page, 2000);
  await idle(page);
  const quand = (lines[0].match(/arrive (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|le \d+ \w+)/) || [])[1];
  const dit = (await L.said(page, true)).filter((x) => /Premier gel/.test(x.text));
  R.check('une seule annonce vocale de l’Avis, avec le jour de la scène', dit.length === 1 && dit[0].voice === 'live' && !!quand && dit[0].text.includes(quand) && !/dans \d+ jours/.test(dit[0].text), JSON.stringify({ quand, dit }));
  const cur = srv.game().avis.current;
  R.check('Avis enregistré : dans 7 jours, Force 18 (activité nulle)', cur && cur.id === 'premier_gel' && cur.force === 18 && core.daysBetween(cur.announcedOn, cur.day) === 7, JSON.stringify(cur));

  // ───── jauge
  const pill = await page.getAttribute('#carnet [data-card="avis"]', 'aria-label');
  R.check('pastille d’Avis : « Préparation 8 contre Force 18 »', /Premier gel/.test(pill) && /Préparation 8 contre Force 18/.test(pill), pill);
  await page.click('#carnet [data-card="avis"]');
  await page.waitForTimeout(300);
  let c = await carte(page);
  R.check('carte : Préparation, Force, ce qui manque', c.open && /Préparation 8/.test(c.text) && /Force 18/.test(c.text) && /Il manque 10 de Préparation/.test(c.verdict), c.verdict);
  R.check('carte : le détail ligne par ligne (Garde, quêtes, réserve, braseros…)', c.lines === 6 && /Garde/.test(c.text) && /Braseros/.test(c.text), String(c.lines));
  R.check('la jauge est en givre (encre de givre), pas en braise', c.fill === 'rgb(61, 101, 119)', c.fill);
  R.check('« Allumer un brasero · 8 ⚡ » disponible', c.brasero && !c.brasero.off && /Allumer un brasero/.test(c.brasero.text) && /8/.test(c.brasero.text), JSON.stringify(c.brasero));
  await shot(page, '16-jauge');

  // ───── braseros : 3 au plus
  for (let i = 1; i <= 3; i++) {
    await page.click('#carnet-card [data-act="lightBrasero"]');
    await L.waitFor(() => srv.game().avis.current.braseros === i, 4000);
  }
  await page.waitForTimeout(300);
  c = await carte(page);
  R.check('3 braseros : Préparation 23, « Tenu si l’Avis arrivait aujourd’hui »', /Préparation 23/.test(c.text) && /Tenu si l’Avis arrivait aujourd’hui/.test(c.verdict), c.verdict);
  R.check('4e brasero refusé, avec sa raison', c.brasero && c.brasero.off && /3 braseros au plus/.test(c.brasero.reason), JSON.stringify(c.brasero));
  R.check('24 Énergie dépensées pour les braseros', srv.game().resources.energy <= 40 + 2 - 24 + 0.01, String(srv.game().resources.energy));
  await shot(page, '16-braseros');
  await page.keyboard.press('Escape');

  // ───── jusqu'au jour de l'Avis, en passant tous les 2 jours (sinon : absent)
  for (const n of [2, 2, 2]) {
    await page.clock.fastForward(n * DAY);
    await L.closeWelcome(page, 2000);
  }
  R.check('la veille : l’Avis est toujours annoncé', !!srv.game().avis.current);
  await page.clock.fastForward(DAY);
  R.check('jour de l’Avis : scène « Premier gel · tenu »', await L.waitFor(async () => (await sceneTitle(page)) === 'Premier gel · tenu', 5000), await sceneTitle(page));
  await L.closeWelcome(page, 2000);
  const g = srv.game();
  R.check('résultat enregistré : tenu', g.avis.history.length === 1 && g.avis.history[0].result === 'tenu' && !g.avis.current, JSON.stringify(g.avis));
  R.check('+15 Matériaux au registre (avis:premier_gel)', srv.ledger().some((e) => e.key === 'avis:premier_gel' && e.materials === 15));
  R.check('l’objectif « Traverser le Premier gel » est atteint', !!g.chapter.objectives['ch2.gel']);
  R.check('la pastille d’Avis a disparu', await page.locator('#carnet [data-card="avis"]').count() === 0);

  // ───── un Avis voilé (Préparation 8 contre Force 30), puis le voile levé à l'Énergie
  const now = new Date();
  const srv2 = await L.startServer({
    game: seed(core, now, (g2, today) => {
      g2.story.seen = g2.story.seen.filter((id) => id !== 'avis.premier_gel.voile');
      g2.avis.current = { id: 'premier_gel', sector: 'champs', day: core.addDays(today, 1), announcedOn: core.addDays(today, -6), base: 24, force: 30, activity: 0, braseros: 0 };
    }),
  });
  try {
    const { context: c2, page: p2 } = await newPage();
    await c2.addInitScript(L.VOICES);
    await p2.clock.install({ time: now });
    await p2.goto(srv2.url);
    await L.ready(p2);
    await p2.waitForTimeout(600);
    await p2.clock.fastForward(DAY);
    R.check('Avis voilé : scène « Premier gel · voilé »', await L.waitFor(async () => (await sceneTitle(p2)) === 'Premier gel · voilé', 5000), await sceneTitle(p2));
    // le matin de l'Avis se rejoue sur la carte pendant la scène : la plaque des Champs ne l'annonce déjà plus
    const plaqueAvis = () => p2.evaluate(() => {
      const b = document.querySelector('.ow-plaque[data-sector="champs"] .ow-plaque-avis');
      return { repere: b && !b.hidden ? b.textContent.trim() : '', rejoue: !!document.querySelector('.ow-flash.is-frost') };
    });
    // échantillon pris pendant que le givre passe sur les Champs (étape de résolution en cours)
    await L.waitFor(() => p2.evaluate(() => !!document.querySelector('.ow-flash.is-frost')), 8000, 50);
    const pendant = await plaqueAvis();
    const v = await sceneText(p2);
    R.check('la scène nomme le secteur : « deux cases des Champs »', /deux cases des Champs/.test(v[0]) && !v.some((x) => /[{}]/.test(x)), v[0]);
    await L.closeWelcome(p2, 2000);
    await idle(p2);
    const dit2 = (await L.said(p2, true)).filter((x) => /Premier gel/.test(x.text));
    R.check('l’Avis voilé est dit une seule fois (l’interface ; le monde le dessine)', dit2.length === 1 && dit2[0].voice === 'live', JSON.stringify(dit2));
    const g2 = srv2.game();
    R.check('voile enregistré : 2 cases des Champs, 3 jours', g2.avis.veils.length === 1 && g2.avis.veils[0].sector === 'champs' && g2.avis.veils[0].cells === 2, JSON.stringify(g2.avis.veils));
    const vp = await p2.getAttribute('#carnet [data-card="voile"]', 'aria-label');
    R.check('pastille « Voile : 2 cases à lever »', /2 cases à lever/.test(vp || ''), vp);
    await p2.click('#carnet [data-card="voile"]');
    await p2.waitForTimeout(300);
    const vt = await p2.textContent('#carnet-card');
    R.check('carte du voile : secteur, cases, départ seul, « Lever une case du voile · 1 ⚡ »', /Champs/.test(vt) && /2 cases voilées/.test(vt) && /Il part seul/.test(vt) && /Lever une case du voile/.test(vt), vt.replace(/\s+/g, ' ').slice(0, 200));
    await shot(p2, '16-voile');
    const apres = await plaqueAvis();
    R.check('Avis passé : plus de repère « Premier gel » sur la plaque des Champs (matin rejoué, puis après)', pendant.rejoue && !pendant.repere && !apres.repere, JSON.stringify({ pendant, apres }));
    await p2.click('#carnet-card [data-act="liftVeil"]');
    await L.waitFor(() => srv2.game().avis.veils[0]?.cells === 1, 4000);
    await p2.click('#carnet-card [data-act="liftVeil"]');
    R.check('deux gestes : le voile est levé', await L.waitFor(() => srv2.game().avis.veils.length === 0, 4000), JSON.stringify(srv2.game().avis.veils));
    R.check('annonce lue : « Le voile est levé. »', await L.waitFor(() => p2.evaluate(() => /Le voile est levé/.test(document.getElementById('live').textContent)), 2000));
    R.check('la pastille du voile a disparu', await L.waitFor(() => p2.evaluate(() => !document.querySelector('#carnet [data-card="voile"]')), 2000));
  } finally {
    srv2.stop();
  }
}, {
  game: (core) => seed(core, new Date(), (g) => {
    g.story.seen = g.story.seen.filter((id) => !['avis.premier_gel.annonce', 'avis.premier_gel.tenu'].includes(id));
  }),
});
