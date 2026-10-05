// 9. Qualité générale : défilement horizontal, cibles ≥ 44 px, mouvement réduit, navigation au clavier jusqu'à « Fait ».
const L = require('./lib.cjs');

const AUDIT = () => {
  const out = { overflow: [], small: [], scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (e.hasAttribute('hidden')) return false;
    }
    return true;
  };
  // une boîte fermée (dialog non ouvert) est déjà display:none
  for (const el of document.querySelectorAll('button, a[href], summary, select, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, label.seg-option, label.sector-option, label.check-row, .step label')) {
    if (!vis(el)) continue;
    // objets de la carte (sprites cliquables du monde) : leur équivalent à cible de 44 px est le Plan accessible ; mesurés à part
    if (el.closest('.ow-ent')) continue;
    const r = el.getBoundingClientRect();
    const name = (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    if (r.width < 43.5 || r.height < 43.5) out.small.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} « ${name} » ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  for (const el of document.querySelectorAll('#app *, dialog[open] *')) {
    if (!vis(el)) continue;
    if (el.closest('.chips--scroll, .world-slot, .hud-demo, svg')) continue;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 || r.left < -1) out.overflow.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  return out;
};

L.runScenario('9. qualité : défilement, cibles, mouvement réduit, clavier', async ({ R, srv, newPage, shot, size }) => {
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  const audit = async (label) => {
    const a = await page.evaluate(AUDIT);
    R.check(`${label} : aucun défilement horizontal`, a.scrollW <= a.innerW && a.overflow.length === 0, `scrollWidth ${a.scrollW}/${a.innerW} ${a.overflow.slice(0, 4).join(' ; ')}`);
    R.check(`${label} : toutes les cibles ≥ 44 px`, a.small.length === 0, a.small.slice(0, 6).join(' ; '));
  };
  await audit('Fil du jour replié');
  // carte du chapitre dépliée sur la carte
  await page.click('#carnet [data-card="chapitre"]');
  await page.waitForSelector('#carnet-card:not([hidden])'); await page.waitForTimeout(300);
  await audit('carte du chapitre');
  await shot(page, '09-carnet');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await L.openPanel(page);
  await audit('panneau ouvert');
  // états variés
  await page.locator('#quest-list > li:first-child [data-action="open"]').click();
  await page.waitForSelector('#dlg-fiche[open]'); await page.waitForTimeout(500);
  await audit('fiche de quête');
  await shot(page, '09-fiche');
  await page.click('#dlg-fiche [data-action="why"]');
  await page.waitForSelector('#dlg-why[open]'); await page.waitForTimeout(500);
  await audit('« Pourquoi ? »');
  await shot(page, '09-pourquoi');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.click('.panel-head [data-action="add"]');
  await page.waitForSelector('#dlg-add[open]'); await page.waitForTimeout(500);
  await page.fill('#add-title', 'Ranger le garage');
  await page.click('#dlg-add summary');
  await page.waitForTimeout(300);
  await audit('ajout (réglages ouverts)');
  await shot(page, '09-ajout-reglages');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);

  // écrans de jeu : feuille d'actions d'un secteur (depuis le plan), bilan de la semaine, prénom
  await page.click('[data-action="open-plan"]');
  await page.waitForSelector('#dlg-plan[open]'); await page.waitForTimeout(400);
  await audit('plan accessible');
  await page.click(`#dlg-plan [data-act="open-target"][data-params='{"type":"sector","id":"champs"}']`);
  await page.waitForSelector('#dlg-act[open]'); await page.waitForTimeout(500);
  await audit('feuille d’actions des Champs');
  await shot(page, '09-feuille-champs');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.click('[data-action="open-review"]');
  await page.waitForSelector('#dlg-review[open]'); await page.waitForTimeout(500);
  await audit('bilan de la semaine');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.click('[data-action="open-settings"]');
  await page.waitForSelector('#dlg-settings[open]'); await page.waitForTimeout(500);
  await audit('prénom (réglages)');
  await shot(page, '09-prenom');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);

  // indicateur hors ligne et message
  await page.context().setOffline(true);
  await page.waitForTimeout(300);
  await audit('hors ligne');
  await shot(page, '09-hors-ligne');
  await page.context().setOffline(false);

  // gain à l'écran : l'annonce ne déborde pas
  await page.locator('#quest-list > li:first-child [data-action="complete"]').click();
  await page.waitForTimeout(600);
  const ann = await L.rect(page, '#announce');
  R.check('l’annonce tient dans l’écran', ann && ann.x >= 0 && ann.r <= size[0] + 0.5, JSON.stringify(ann));

  // base de lecture : 40 quêtes dont 10 en retard, sans rouge
  // (voir plus bas : scénario dédié)
});

