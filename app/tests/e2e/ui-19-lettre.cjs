// 19. Lettre du matin : une par jour à la première ouverture, quête n° 1 nommée, prénom facultatif (réglage gardé
// sur l'appareil), lettre correcte sans prénom, nouvelle lettre le lendemain.
const L = require('./lib.cjs');
const DAY = 24 * 3600 * 1000;

const letter = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-letter');
  return { open: d.open && !d.classList.contains('is-closing'), text: (d.querySelector('.letter-paper') || {}).textContent?.replace(/\s+/g, ' ').trim() || '', title: (d.querySelector('#letter-t') || {}).textContent?.trim() || '' };
});

L.runScenario('19. lettre du matin', async ({ R, srv, newPage, core, shot }) => {
  const { page } = await newPage();
  await page.clock.install({ time: new Date() });
  await page.goto(srv.url);
  await L.ready(page);
  R.check('la lettre s’ouvre à la première ouverture du jour', await L.waitFor(async () => (await letter(page)).open, 6000));
  let l = await letter(page);
  const quest = (await page.textContent('#fil-quest .fil-title')).trim();
  R.check('« Une lettre de Fanal », signée Fanal', l.title === 'Une lettre de Fanal' && /Fanal$/.test(l.text), l.title);
  R.check('la lettre nomme la quête n° 1', l.text.includes(quest), `${quest} / ${l.text.slice(0, 160)}`);
  R.check('sans prénom : aucune accolade, aucune virgule orpheline', !/[{}]/.test(l.text) && !/,\s*[.!]/.test(l.text), l.text.slice(0, 160));
  R.check('« Ranger la lettre » a le focus', await page.evaluate(() => document.activeElement && document.activeElement.closest('#dlg-letter .sheet-foot') !== null));
  await shot(page, '19-lettre');
  const today = core.gameDay(new Date(await page.evaluate(() => Date.now())));
  R.check('lettre notée comme montrée aujourd’hui', await L.waitFor(() => Object.values(srv.game()?.letters || {}).includes(today), 4000), JSON.stringify(srv.game()?.letters));
  const firstId = Object.keys(srv.game().letters).find((k) => srv.game().letters[k] === today);

  // ───── prénom facultatif, depuis la lettre
  await page.click('#dlg-letter [data-action="open-settings"]');
  await page.waitForSelector('#dlg-settings[open]');
  await page.waitForTimeout(300);
  R.check('réglages : « Prénom (facultatif) », focus dans le champ', /Prénom \(facultatif\)/.test(await page.textContent('#dlg-settings')) && await page.evaluate(() => document.activeElement.id === 'set-prenom'));
  const quete = await page.evaluate(() => [...document.querySelectorAll('#dlg-settings .stepper-row output')].map((o) => o.textContent.trim()).join());
  R.check('réglages : « Quête par défaut » montre 5, 2, 3 tant que rien n’est réglé, avec la phrase « mêmes sur tous tes appareils »', quete === '5,2,3' && /Quête par défaut/.test(await page.textContent('#dlg-settings')) && /mêmes sur tous tes appareils/.test(await page.textContent('#dlg-settings')), quete);
  await page.fill('#set-prenom', '  Sam  ');
  await shot(page, '19-reglages');
  await page.click('#dlg-settings [type="submit"]');
  R.check('enregistré sur l’appareil seulement (localStorage)', await L.waitFor(() => page.evaluate(() => localStorage.getItem('oree.prenom.v1') === 'Sam'), 2000) && !JSON.stringify(srv.game()).includes('Sam'));
  R.check('prénom seul : la quête par défaut n’écrit rien dans la partie', !('reglages' in (srv.game() || {})), JSON.stringify(srv.game()?.reglages));
  R.check('la lettre reste ouverte et le lien dit le prénom', await L.waitFor(async () => (await letter(page)).open && /Sam/.test(await page.textContent('#dlg-letter .letter-prenom')), 2000));
  await page.click('#dlg-letter .sheet-foot [data-close]');
  R.check('« Ranger la lettre » la referme', await L.waitFor(async () => !(await page.evaluate(() => document.getElementById('dlg-letter').open)), 2000));

  // ───── une seule par jour
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(1500);
  R.check('rechargement le même jour : pas de seconde lettre', !(await letter(page)).open);

  // ───── le lendemain
  await page.clock.fastForward(DAY);
  R.check('le lendemain : une nouvelle lettre', await L.waitFor(async () => (await letter(page)).open, 5000));
  l = await letter(page);
  const tomorrow = core.addDays(today, 1);
  await L.waitFor(() => Object.values(srv.game()?.letters || {}).includes(tomorrow), 4000);
  const secondId = Object.keys(srv.game().letters).find((k) => srv.game().letters[k] === tomorrow);
  R.check('ce n’est pas la même lettre qu’hier', secondId && secondId !== firstId, `${firstId} / ${secondId}`);
  R.check('aucune accolade ; « Bon matin » prend le prénom s’il y est', !/[{}]/.test(l.text) && (!/Bon matin,/.test(l.text) || /Bon matin, Sam/.test(l.text)), l.text.slice(0, 120));
  // Échap : la lettre s'était ouverte seule, le focus revient au Fil du jour (pas sur la page)
  await page.keyboard.press('Escape');
  R.check('Échap range la lettre', await L.waitFor(async () => !(await page.evaluate(() => document.getElementById('dlg-letter').open)), 2000));
  await page.waitForTimeout(300);
  R.check('… et le focus est sur « Fait » du Fil du jour', await page.evaluate(() => !!document.activeElement && document.activeElement.matches('#fil-quest [data-action="complete"]')), await page.evaluate(() => document.activeElement?.tagName));
  await page.clock.fastForward(61 * 1000);
  await page.waitForTimeout(1200);
  R.check('le même jour, plus rien ne s’ouvre', !(await page.evaluate(() => !!document.querySelector('dialog[open]'))));
}, {
  game: (core) => {
    const now = new Date();
    const today = core.gameDay(now);
    const g = L.quietState(core, now, { letters: false });
    g.startDay = core.addDays(today, -3);
    return g;
  },
});
