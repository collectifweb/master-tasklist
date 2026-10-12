// Rendez-vous : écrans d'accueil, lettre du matin, réglage du prénom, bilan de la semaine.
// Une seule feuille à la fois : l'accueil (welcome) les enchaîne et attend qu'aucune autre feuille ne soit ouverte.
// Le cœur choisit (morningLetter, weeklyReview) ; l'interface montre, puis note (markLetterShown).
// Tout texte dynamique passe par esc(), titres de quêtes compris.
import { morningLetter, passageLetter, conversionLetter, weeklyReview, gameDay, daysBetween, queteDefaut, fusionQuete, SEMAINE_TENUE, objectifSaison, villeDe, METEO } from '../../core/index.js';
import { t, tn, content, prenom, setPrenom, economieBatterie, setEconomieBatterie } from '../content.js';
import { $, $$, esc, icon } from './dom.js';
import { glyph } from './glyphs.js';
import { num, numGain, shortDate, durationText } from './format.js';
import { openSheet, closeSheet, stepperRow, syncStepper, stepValue } from './sheets.js';
import { psProduction } from './batiment.js';
import { maj } from '../api-client.js';

const REVIEW_KEY = 'oree.recycle.v1';
const KEEP_DAYS = 28; // « Garder » : la quête ne revient pas dans le bilan avant 4 semaines
const PAST_SHOWN = 6; // semaines passées visibles d'emblée ; les plus anciennes sont repliées

function readReview() {
  try { const v = JSON.parse(localStorage.getItem(REVIEW_KEY)); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function writeReview(v) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(v)); } catch { /* sans stockage : le bilan revient au prochain lancement */ }
}

const anyOpen = () => document.querySelector('dialog[open]');

// Météo du village (lot Q) : la ville se cherche depuis l'appareil, directement chez Open-Meteo (le service accepte les
// appels d'un navigateur), puis se règle dans la partie (reglerVille) ; c'est le serveur qui lit ensuite la prévision.
const RECHERCHE_VILLE = 'https://geocoding-api.open-meteo.com/v1/search';
const RECHERCHE_MS = 8000;
const OPEN_METEO = 'https://open-meteo.com/';
const lieuDe = (v) => [v.region, v.pays].filter(Boolean).join(', ');

/**
 * app : { ctx() → { tasks, game, ledger, now }, run(action, params) → résultat ou null, attempt(action, params) → null ou
 * le message du refus (pour l'écrire dans la feuille ouverte, la page derrière étant inerte), announce(texte), focusHome(),
 * thumb(id) → dessin d'un bâtiment (ou ''), lightBandeau(), focusBandeau(), arrivee() : le mot de Fanal quand le marchand
 * vient d'arriver (une fois par semaine sur l'appareil), puis celui de l'imprévu du jour (une fois par imprévu) }.
 */
export function createStory(app) {
  let welcoming = false;
  let waitFor = null;
  let accueilIci = false; // l'accueil a été montré pendant cette visite : lettres et bilan attendent la suivante
  const voiceName = (v) => content.repliques?.voix?.[v]?.nom || null;

  // ───────── Lettre du matin ─────────
  /** `ps` : le P.-S. de la lettre du matin (ce que le village a produit aujourd'hui, lot J), ou rien. */
  function openLetter(letter, onDone, ps = null) {
    const dlg = $('#dlg-letter');
    const sign = voiceName(content.lettres?.signature) || content.lettres?.signature || '';
    const p = prenom();
    dlg.innerHTML = `
      <header class="sheet-head">
        <h2 class="sheet-title letter-title" id="letter-t">${glyph('lettre')}<span>${esc(t('letter.title'))}</span></h2>
        <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('letter.close'))}">${icon('x')}</button>
      </header>
      <div class="sheet-body">
        <div class="letter-paper">
          ${letter.lignes.map((l) => `<p>${esc(l)}</p>`).join('')}
          ${sign ? `<p class="letter-sign">${esc(sign)}</p>` : ''}
          ${ps ? `<p class="letter-ps">${esc(ps)}</p>` : ''}
        </div>
        <p class="letter-prenom">${glyph('personne')}<button class="link-btn" type="button" data-action="open-settings">${esc(p ? t('letter.prenom.change', { prenom: p }) : t('letter.prenom.add'))}</button></p>
      </div>
      <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="button" data-close>${esc(t('letter.close'))}</button></footer>`;
    app.run('markLetterShown', { id: letter.id });
    openSheet(dlg);
    dlg.querySelector('.sheet-foot .btn')?.focus();
    whenClosed(dlg, onDone);
  }

  // ───────── Réglages : prénom facultatif et économie de batterie (sur l'appareil), quête par défaut (dans la partie) ─────────
  let queteOuverte = null; // valeurs montrées à l'ouverture : seul un geste sur « + » ou « − » les fait partir au serveur
  function openSettings() {
    const dlg = $('#dlg-settings');
    const charge = !!app.ctx(); // sans la partie, la quête par défaut n'est pas connue : les trois valeurs restent fermées
    const quete = queteDefaut(app.ctx()?.game);
    queteOuverte = quete;
    const depuisLettre = !!$('#dlg-letter[open]'); // le lien « prénom » de la lettre vient pour écrire le prénom
    dlg.innerHTML = `
      <header class="sheet-head">
        <h2 class="sheet-title" id="settings-t">${esc(t('settings.title'))}</h2>
        <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('settings.close'))}">${icon('x')}</button>
      </header>
      <form class="sheet-body" id="settings-form" novalidate>
        <div class="field">
          <label class="field-label" for="set-prenom">${esc(t('settings.prenom'))}</label>
          <input class="input" id="set-prenom" name="prenom" type="text" maxlength="40" autocomplete="given-name" autocapitalize="words" enterkeyhint="done" value="${esc(prenom())}" aria-describedby="set-prenom-hint">
          <p class="field-hint" id="set-prenom-hint">${esc(t('settings.prenom.hint'))}</p>
        </div>
        <label class="check-row"><input type="checkbox" name="batterie"${economieBatterie() ? ' checked' : ''}><span>${esc(t('settings.batterie'))}<small>${esc(t('settings.batterie.hint'))}</small></span></label>
        <fieldset class="field set-quete" aria-describedby="set-quete-hint">
          <legend class="field-label">${esc(t('settings.quete'))}</legend>
          <p class="field-hint" id="set-quete-hint">${esc(t('settings.quete.hint'))}${charge ? '' : ` ${esc(t('settings.quete.attente'))}`}</p>
          ${stepperRow('set', 'priority', quete.priority)}${stepperRow('set', 'length', quete.length)}${stepperRow('set', 'difficulty', quete.difficulty)}
        </fieldset>
        ${meteoHtml(charge)}
        ${majHtml()}
        <p class="field-error" id="set-err" role="alert" hidden>${icon('why')}<span></span></p>
      </form>
      <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="submit" form="settings-form">${esc(t('settings.save'))}</button></footer>`;
    for (const row of $$('.stepper-row', dlg)) { if (!charge) row.dataset.locked = '1'; syncStepper(row); }
    openSheet(dlg);
    // clavier virtuel : il ne s'ouvre que si l'on vient écrire le prénom, sinon il cacherait les trois rangées
    (depuisLettre ? $('#set-prenom', dlg) : $('[data-close]', dlg)).focus();
    lireMaj();
  }
  // ───────── Version du jeu (lot U) : la version installée, et la mise à jour depuis GitHub quand le serveur la permet ─────────
  // La section reste cachée tant que le serveur n'a pas répondu, et pour de bon s'il a coupé la mise à jour (MISE_A_JOUR),
  // s'il n'a pas api/maj.php ou si l'appareil est hors ligne : il n'y aurait rien à y faire.
  let majEnCours = false;
  const numero = (x) => (x && typeof x.version === 'string' ? x.version.replace(/^v/, '') : null);
  function majHtml() {
    return `
        <fieldset class="field set-quete set-maj" id="set-maj" aria-describedby="set-maj-hint" hidden>
          <legend class="field-label">${esc(t('settings.maj'))}</legend>
          <p class="field-hint" id="set-maj-hint">${esc(t('settings.maj.hint'))}</p>
          <div class="meteo-ville" id="set-maj-version"></div>
          <p class="field-hint meteo-etat" id="set-maj-etat" role="status" aria-live="polite"></p>
        </fieldset>`;
  }
  async function lireMaj() {
    if (!navigator.onLine || majEnCours) return;
    let r;
    try { r = await maj.lire(); } catch { return; }
    if (r && r.actif) rendreMaj(r);
  }
  function rendreMaj(r) {
    const f = $('#dlg-settings[open] #set-maj');
    if (!f) return;
    const inst = r.installee;
    const titre = !inst ? t('settings.maj.inconnue') : numero(inst) ? t('settings.maj.version', { version: numero(inst) }) : t('settings.maj.sans_numero');
    const sous = !inst ? t('settings.maj.inconnue.hint') : t('settings.maj.le', { date: shortDate(gameDay(new Date(inst.le))) });
    const dispo = !r.aJour && r.publiee && r.possible;
    $('#set-maj-version', f).innerHTML = `<span class="meteo-ville-text"><b>${esc(titre)}</b><small>${esc(sous)}</small></span>${dispo
      ? `<button class="btn btn--secondary btn--small" type="button" data-action="maj-lancer">${icon('refresh')}<span>${esc(t('settings.maj.lancer'))}</span></button>` : ''}`;
    let etat = '';
    if (r.aJour) etat = t('settings.maj.a_jour');
    else if (!r.publiee) etat = r.injoignable ? t('settings.maj.injoignable') : '';
    else if (!r.possible) etat = r.raison === 'ecriture' ? t('settings.maj.ecriture') : t('settings.maj.extension', { ext: r.raison === 'curl' ? 'cURL' : 'Phar' });
    else etat = numero(r.publiee) ? t('settings.maj.disponible', { version: numero(r.publiee) }) : t('settings.maj.disponible.sans_numero');
    $('#set-maj-etat', f).textContent = etat;
    f.hidden = false;
  }
  async function lancerMaj() {
    const f = $('#set-maj');
    const btn = f && $('[data-action="maj-lancer"]', f);
    if (!btn || majEnCours) return;
    const etat = $('#set-maj-etat', f);
    majEnCours = true;
    btn.setAttribute('aria-busy', 'true');
    btn.setAttribute('aria-disabled', 'true');
    etat.textContent = t('settings.maj.en_cours');
    try {
      await maj.lancer();
      etat.textContent = t('settings.maj.fait');
      setTimeout(() => location.reload(), 1500); // le temps de lire la phrase ; le service hors ligne prend le réseau d'abord
    } catch (e) {
      majEnCours = false;
      btn.removeAttribute('aria-busy');
      btn.removeAttribute('aria-disabled');
      // les refus du serveur sont des phrases complètes (« Rien n'a été changé ») ; sans réponse, on ne sait pas où il en est
      etat.textContent = e.status ? e.message : t('settings.maj.sans_reponse');
    }
  }
  // ───────── Météo du village : chercher, choisir ou retirer la ville (gardée dans la partie dès le choix) ─────────
  let villes = []; // villes trouvées par la dernière recherche
  let recherche = null; // AbortController de la recherche en cours
  function meteoHtml(charge) {
    const ville = villeDe(app.ctx()?.game);
    const off = charge ? '' : ' disabled';
    const lieu = ville && lieuDe(ville);
    return `
        <fieldset class="field set-quete set-meteo" id="set-meteo" aria-describedby="set-meteo-hint">
          <legend class="field-label">${esc(t('settings.meteo'))}</legend>
          <p class="field-hint" id="set-meteo-hint">${esc(t('settings.meteo.hint', { cm: METEO.seuil }))}${charge ? '' : ` ${esc(t('settings.meteo.attente'))}`}</p>
          ${ville ? `<div class="meteo-ville" tabindex="-1">
            <span class="meteo-ville-text"><span class="sr-only">${esc(t('settings.meteo.ville'))}\u00a0: </span><b>${esc(ville.nom)}</b>${lieu ? `<small>${esc(lieu)}</small>` : ''}</span>
            <button class="btn btn--quiet btn--small" type="button" data-action="meteo-retirer" aria-label="${esc(t('settings.meteo.retirer.label', { ville: ville.nom }))}">${esc(t('settings.meteo.retirer'))}</button>
          </div>` : ''}
          <label class="field-label meteo-cherche-label" for="set-ville">${esc(t(ville ? 'settings.meteo.changer.label' : 'settings.meteo.chercher.label'))}</label>
          <div class="input-row">
            <input class="input" id="set-ville" type="search" maxlength="80" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="search"${off}>
            <button class="btn btn--secondary" type="button" data-action="meteo-chercher"${off}>${icon('search')}<span>${esc(t('settings.meteo.chercher'))}</span></button>
          </div>
          <p class="field-hint meteo-etat" id="set-meteo-etat" role="status" aria-live="polite"></p>
          <ul class="meteo-choix" id="set-meteo-choix" hidden></ul>
          <p class="field-hint">${esc(t('settings.meteo.confidentialite'))}</p>
          <p class="field-hint meteo-credit">${esc(t('settings.meteo.credit'))} <a class="link-btn" href="${OPEN_METEO}" target="_blank" rel="noopener noreferrer">${esc(t('meteo.credit.lien'))}</a></p>
        </fieldset>`;
  }
  async function chercherVille() {
    const dlg = $('#dlg-settings');
    const input = $('#set-ville', dlg);
    if (!input || input.disabled) return;
    const nom = input.value.trim();
    const etat = $('#set-meteo-etat', dlg);
    const liste = $('#set-meteo-choix', dlg);
    const btn = $('[data-action="meteo-chercher"]', dlg);
    villes = [];
    liste.hidden = true;
    liste.replaceChildren();
    recherche?.abort();
    recherche = null;
    if (!nom) { etat.textContent = t('settings.meteo.vide'); input.focus(); return; }
    if (!navigator.onLine) { etat.textContent = t('settings.meteo.hors_ligne'); return; }
    const ctl = new AbortController();
    recherche = ctl;
    const delai = setTimeout(() => ctl.abort(), RECHERCHE_MS);
    etat.textContent = t('settings.meteo.cherche');
    btn.setAttribute('aria-busy', 'true');
    try {
      const url = `${RECHERCHE_VILLE}?${new URLSearchParams({ name: nom, count: '6', language: 'fr', format: 'json' })}`;
      const r = await fetch(url, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) throw new Error(`recherche ${r.status}`);
      const j = await r.json();
      if (recherche !== ctl) return;
      villes = (Array.isArray(j?.results) ? j.results : [])
        .filter((x) => x && typeof x.name === 'string' && Number.isFinite(x.latitude) && Number.isFinite(x.longitude))
        .map((x) => ({ nom: x.name, region: typeof x.admin1 === 'string' ? x.admin1 : '', pays: typeof x.country === 'string' ? x.country : '', lat: x.latitude, lon: x.longitude }));
      if (!villes.length) { etat.textContent = t('settings.meteo.aucune', { nom }); return; }
      liste.innerHTML = villes.map((v, i) => {
        const lieu = lieuDe(v);
        return `<li><button class="meteo-choix-btn" type="button" data-action="meteo-choisir" data-i="${i}" aria-label="${esc(t('settings.meteo.choix.label', { lieu: [v.nom, lieu].filter(Boolean).join(', ') }))}"><b>${esc(v.nom)}</b>${lieu ? `<small>${esc(lieu)}</small>` : ''}</button></li>`;
      }).join('');
      liste.hidden = false;
      etat.textContent = tn('settings.meteo.trouvees', villes.length, { n: villes.length });
    } catch {
      if (recherche === ctl) etat.textContent = t(navigator.onLine ? 'settings.meteo.echec' : 'settings.meteo.hors_ligne');
    } finally {
      clearTimeout(delai);
      if (recherche === ctl) { recherche = null; btn.removeAttribute('aria-busy'); }
    }
  }
  /** Redessine la section après un choix ; le focus va sur `focus` (jamais sur le champ : le clavier virtuel s'ouvrirait). */
  function redessinerMeteo(focus) {
    const f = $('#set-meteo');
    if (!f) return;
    recherche?.abort();
    recherche = null;
    villes = [];
    f.outerHTML = meteoHtml(!!app.ctx());
    $(focus, $('#dlg-settings'))?.focus();
  }
  function reglerVille(ville) {
    $('#set-err').hidden = true;
    const refus = app.attempt('reglerVille', { ville });
    if (refus) {
      const err = $('#set-err');
      $('span', err).textContent = refus;
      err.hidden = false;
      return;
    }
    redessinerMeteo(ville ? '.meteo-ville' : '[data-action="meteo-chercher"]');
    app.announce(ville ? t('settings.saved.ville', { ville: ville.nom }) : t('settings.saved.ville.retiree'));
  }
  const choisirVille = (i) => { const v = villes[Number(i)]; if (v) reglerVille(v); };
  const retirerVille = () => reglerVille(null);

  function saveSettings(form) {
    const lu = { priority: stepValue(form, 'priority'), length: stepValue(form, 'length'), difficulty: stepValue(form, 'difficulty') };
    const avant = queteOuverte || queteDefaut(app.ctx()?.game); // ce que la feuille montrait : seul ce que le joueur change part
    const change = Object.keys(lu).some((k) => lu[k] !== avant[k]);
    // les valeurs non touchées viennent de la partie d'à présent, pas de l'ouverture de la feuille (un autre appareil a pu les changer)
    const quete = fusionQuete(queteDefaut(app.ctx()?.game), avant, lu);
    // la quête d'abord : un refus laisse la feuille ouverte, avec son message dedans (la page derrière est inerte, rien n'y serait lu)
    if (change) {
      const refus = app.attempt('reglerQueteDefaut', quete);
      if (refus) {
        const err = $('#set-err');
        $('span', err).textContent = refus;
        err.hidden = false;
        return;
      }
    }
    const avantPrenom = prenom();
    const v = setPrenom(form.elements.prenom.value);
    const avantBatterie = economieBatterie();
    const batterie = setEconomieBatterie(form.elements.batterie.checked);
    app.setEconomie(batterie); // même sans changement : un autre onglet a pu cocher la case sans que ce monde-ci le sache
    const link = $('#dlg-letter[open] .letter-prenom .link-btn');
    if (link) link.textContent = v ? t('letter.prenom.change', { prenom: v }) : t('letter.prenom.add');
    closeSheet($('#dlg-settings'));
    const dit = v ? t('settings.saved', { prenom: v }) : t('settings.saved.none');
    const diteQuete = t('settings.saved.quete', { p: quete.priority, d: durationText(quete.length), e: quete.difficulty });
    const dits = [];
    if (v !== avantPrenom || (!change && batterie === avantBatterie)) dits.push(dit); // rien de changé : le prénom confirme
    if (change) dits.push(diteQuete);
    if (batterie !== avantBatterie) dits.push(t(batterie ? 'settings.saved.batterie' : 'settings.saved.vivante'));
    app.announce(dits.join(' '));
  }

  // ───────── Bilan de la semaine ─────────
  function keptNow(c) {
    const today = gameDay(c.now);
    const kept = readReview().kept || {};
    return new Set(Object.keys(kept).filter((id) => daysBetween(kept[id], today) < KEEP_DAYS));
  }

  /** Ligne de la semaine tenue (icône des Matériaux + texte) ; rien pour une semaine non tenue ni pour un ancien bilan sans le champ. Le montant est celui qui a été payé (repli : le montant actuel). */
  const tenueHtml = (b, tag) => (b.tenue === true
    ? `<${tag} class="review-tenue">${icon('materiaux')}<span>${esc(t('review.tenue', { n: numGain(Number.isFinite(b.tenueMateriaux) ? b.tenueMateriaux : SEMAINE_TENUE.materials) }))}</span></${tag}>` : '');

  // Allure de la semaine (lot A) : trois crans en motif, doublés du mot et de la raison ; rien pour un bilan figé avant le lot.
  const CRANS = { ralenti: 1, regulier: 2, plein: 3 };
  const aAllure = (b) => Boolean(b.allure && Object.hasOwn(CRANS, b.allure.niveau));
  const cransHtml = (niveau) => `<span class="allure-crans" data-allure="${niveau}" aria-hidden="true">${[1, 2, 3].map((k) => `<span class="allure-cran${k <= CRANS[niveau] ? ' is-on' : ''}"></span>`).join('')}</span>`;
  const allureMot = (a) => t('review.allure', { niveau: t(`allure.${a.niveau}`) });
  /** La semaine en cours : l'allure, sa raison (les quêtes des 14 jours d'avant le lundi), puis ce qu'elle change. */
  function allureHtml(a, c) {
    if (!aAllure({ allure: a })) return '';
    const raison = Number.isFinite(a.quetes) ? tn('review.allure.quetes', a.quetes, { n: a.quetes }) : t('review.allure.jeune');
    const sansObjectif = a.niveau === 'ralenti' && objectifSaison(c.game, c.ledger, c.now).aVenir;
    return `<div class="review-allure">${cransHtml(a.niveau)}<p class="review-allure-mot"><b>${esc(allureMot(a))}</b> <span class="review-allure-raison">${esc(raison)}</span></p><p class="review-allure-effet">${esc(t(`review.allure.effet.${a.niveau}${sansObjectif ? '.sans' : ''}`))}</p></div>`;
  }

  /** Une semaine figée (game.bilans) : dates et jours travaillés (sept pastilles doublées du texte), allure, quêtes et heures. */
  function weekHtml(b) {
    const pips = Array.from({ length: 7 }, (_, i) => `<span class="review-pip${i < b.joursTravailles ? ' is-on' : ''}"></span>`).join('');
    const allure = aAllure(b) ? `<span class="sr-only">. </span><span class="review-allure-court">${cransHtml(b.allure.niveau)}${esc(allureMot(b.allure))}</span>` : '';
    return `<div class="why-line"><dt><span class="review-week-dates">${esc(t('review.week', { debut: shortDate(b.semaine.start), fin: shortDate(b.semaine.end) }))}</span><small><span class="review-pips" aria-hidden="true">${pips}</span>${esc(tn('review.past.days', b.joursTravailles, { n: b.joursTravailles }))}${allure}</small>${tenueHtml(b, 'small')}</dt><dd>${esc(tn('review.domain.quests', b.quetes, { n: b.quetes }))}<small>${esc(t('review.domain.hours', { h: num(b.heures) }))}</small></dd></div>`;
  }
  /** Semaines passées, la plus récente en haut : les PAST_SHOWN dernières, puis les autres dans un bloc replié. */
  function pastHtml(game) {
    const weeks = (Array.isArray(game.bilans) ? game.bilans : []).filter((b) => b && b.semaine && b.semaine.start).reverse();
    const recent = weeks.slice(0, PAST_SHOWN), older = weeks.slice(PAST_SHOWN);
    return `<section class="review-past" aria-labelledby="review-past-t">
        <h3 class="act-section-title" id="review-past-t">${esc(t('review.past.title'))}</h3>
        ${weeks.length ? `<dl class="why-ledger review-weeks">${recent.map(weekHtml).join('')}</dl>` : `<p class="act-text">${esc(t('review.past.none'))}</p>`}
        ${older.length ? `<details class="disclosure review-older">
          <summary><span class="disclosure-summary">${esc(t('review.past.older'))} <b>(${older.length})</b></span><span class="disclosure-action">${esc(t('review.past.show'))} ${icon('chevron-down')}</span></summary>
          <div class="disclosure-body"><dl class="why-ledger review-weeks">${older.map(weekHtml).join('')}</dl></div>
        </details>` : ''}
      </section>`;
  }

  function reviewHtml(c) {
    const r = weeklyReview(c.tasks, c.game, c.ledger, c.now);
    const kept = keptNow(c);
    const old = r.aTrier.filter((q) => !kept.has(String(q.id)));
    const summary = r.quetes
      ? `${tn('review.quests', r.quetes, { n: r.quetes })} ${t('review.hours', { h: num(r.heures) })}`
      : t('review.none');
    const jours = tn('review.days', r.joursTravailles, { n: r.joursTravailles });
    const domains = r.domaines.map((d) => `<div class="why-line"><dt>${esc(t(`quartier.${d.quartier}.domain`))}<small>${esc(tn('review.domain.quests', d.quetes, { n: d.quetes }))} · ${esc(t(`quartier.${d.quartier}.name`))}</small></dt><dd>${esc(t('review.domain.hours', { h: num(d.heures) }))}</dd></div>`).join('');
    const olds = old.map((q) => `<li class="review-old" data-quest="${esc(q.id)}">
        <span class="review-old-text"><span class="review-old-title">${esc(q.task)}</span><span class="review-old-meta">${esc(t('review.old.age', { n: q.ageDays }))}${q.domain ? ` · ${esc(q.domain)}` : ''}</span></span>
        <span class="review-old-acts">
          <button class="btn btn--secondary btn--small" type="button" data-action="review-keep" data-id="${esc(q.id)}" aria-label="${esc(t('review.keep.aria', { quete: q.task }))}">${esc(t('review.keep'))}</button>
          <button class="btn btn--quiet btn--small" type="button" data-action="review-archive" data-id="${esc(q.id)}" aria-label="${esc(t('review.archive.aria', { quete: q.task }))}">${icon('archive')}${esc(t('review.archive'))}</button>
        </span>
      </li>`).join('');
    return `
      <header class="sheet-head">
        <h2 class="sheet-title" id="review-t">${esc(t('review.title'))}<small class="act-sub">${esc(t('review.week', { debut: shortDate(r.semaine.start), fin: shortDate(r.semaine.end) }))}</small></h2>
        <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('review.close'))}">${icon('x')}</button>
      </header>
      <div class="sheet-body review-body">
        <section class="review-sum">
          <p class="review-lead">${esc(summary)}</p>
          <p class="review-days">${icon('calendar')}<span>${esc(jours)}</span></p>
          ${tenueHtml(r, 'p')}
          ${allureHtml(r.allure, c)}
          ${domains ? `<dl class="why-ledger review-domains">${domains}</dl>` : ''}
        </section>
        ${pastHtml(c.game)}
        ${old.length ? `<section class="review-sort" aria-labelledby="review-old-t">
          <h3 class="act-section-title" id="review-old-t">${esc(t('review.old.title'))}</h3>
          <p class="act-text">${esc(t('review.old.text'))}</p>
          <ul class="review-olds">${olds}</ul>
        </section>` : r.aTrier.length ? '' : `<p class="act-text">${esc(t('review.old.none'))}</p>`}
      </div>
      <footer class="sheet-foot"><button class="btn btn--primary btn--block" type="button" data-close>${esc(t('review.close'))}</button></footer>`;
  }

  function openReview(c, onDone) {
    const dlg = $('#dlg-review');
    dlg.innerHTML = reviewHtml(c);
    const v = readReview();
    v.shown = gameDay(c.now);
    writeReview(v);
    openSheet(dlg);
    dlg.querySelector('.sheet-foot .btn')?.focus();
    whenClosed(dlg, onDone);
  }
  function refreshReview(c) {
    const dlg = $('#dlg-review');
    if (!dlg.open) return;
    dlg.innerHTML = reviewHtml(c);
  }
  /** « Garder » ou « Archiver » une vieille quête ; le focus passe à la ligne suivante (ou au bouton Fermer). */
  function reviewAction(action, id, c) {
    const dlg = $('#dlg-review');
    const li = dlg.querySelector(`.review-old[data-quest="${CSS.escape(id)}"]`);
    const nextId = li && li.nextElementSibling ? li.nextElementSibling.dataset.quest : null;
    const title = li ? li.querySelector('.review-old-title').textContent : '';
    if (action === 'review-keep') {
      const v = readReview();
      v.kept = { ...(v.kept || {}), [id]: gameDay(c.now) };
      writeReview(v);
      app.announce(t('review.kept', { quete: title }));
    } else {
      if (!app.run('archiveQuest', { id })) return;
    }
    refreshReview(app.ctx());
    const back = nextId ? dlg.querySelector(`.review-old[data-quest="${CSS.escape(nextId)}"] [data-action="review-keep"]`) : null;
    (back || dlg.querySelector('.sheet-foot .btn')).focus();
  }

  // ───────── Écrans d'accueil (bible §2) : trois écrans, passables à tout moment, montrés une seule fois ─────────
  const ACCUEIL = 3;
  /** Décor de chaque écran, sans texte (aria-hidden) : le texte de l'écran dit tout. */
  function sceneHtml(n) {
    const th = (id) => app.thumb?.(id) || '';
    if (n === 1) return `<span class="accueil-thumbs">${['chalet-1', 'chalet-2', 'chalet-3', 'parcelle-1'].map(th).join('')}</span>`;
    if (n === 2) {
      return `<span class="accueil-envol">
          <span class="accueil-gains">${icon('energie', 'accueil-gain accueil-gain--e')}${icon('materiaux', 'accueil-gain accueil-gain--m')}</span>
          <span class="accueil-tache"><span class="accueil-coche">${icon('check')}</span><span>${esc(t('accueil.tache'))}</span></span>
        </span>`;
    }
    return `<span class="accueil-objectif"><span class="accueil-cible">${icon('target')}</span>${th('chalet-1')}</span>`;
  }
  function drawAccueil(dlg, n) {
    dlg.dataset.ecran = String(n);
    dlg.innerHTML = `
      <header class="sheet-head accueil-head">
        <h2 class="sheet-title accueil-titre" id="accueil-t">${esc(t('accueil.titre'))}</h2>
        <p class="accueil-etape"><span class="accueil-pips" aria-hidden="true">${Array.from({ length: ACCUEIL }, (_, i) => `<i${i + 1 === n ? ' class="is-on"' : i + 1 < n ? ' class="is-past"' : ''}></i>`).join('')}</span><span>${esc(t('accueil.etape', { n, total: ACCUEIL }))}</span></p>
      </header>
      <div class="sheet-body accueil-body">
        <div class="accueil-scene" data-scene="${n}" aria-hidden="true">${sceneHtml(n)}</div>
        <p class="accueil-texte" id="accueil-texte">${esc(t(`accueil.${n}`))}</p>
      </div>
      <footer class="sheet-foot accueil-foot">
        ${n < ACCUEIL ? `<button class="btn btn--quiet" type="button" data-close>${esc(t('accueil.passer'))}</button>` : ''}
        <button class="btn btn--primary" type="button" ${n < ACCUEIL ? 'data-action="accueil-suivant"' : 'data-close'}>${esc(t(n < ACCUEIL ? 'accueil.suivant' : 'accueil.commencer'))}</button>
      </footer>`;
    if (n === ACCUEIL) app.lightBandeau?.(); // 3e écran : le bandeau d'objectifs s'allume
    dlg.querySelector('.accueil-foot .btn--primary')?.focus();
  }
  function openAccueil(onDone) {
    const dlg = $('#dlg-accueil');
    drawAccueil(dlg, 1);
    openSheet(dlg);
    dlg.querySelector('.accueil-foot .btn--primary')?.focus();
    whenClosed(dlg, () => {
      app.run('voirAccueil', {}); // vu, passé ou fermé : une seule fois
      app.lightBandeau?.();
      onDone();
    });
  }
  /** « Suivant » : écran d'après, le focus reste sur le bouton principal. */
  function accueilSuivant() {
    const dlg = $('#dlg-accueil');
    if (!dlg.open) return;
    drawAccueil(dlg, Math.min(ACCUEIL, Number(dlg.dataset.ecran || 1) + 1));
  }

  // ───────── Accueil : lettre, bilan du dimanche ─────────
  /** Une feuille d'accueil s'ouvre seule : à sa fermeture, le navigateur rend le focus à la page entière. */
  const refocus = () => { if (!document.activeElement || document.activeElement === document.body) app.focusHome?.(); };
  function whenClosed(dlg, fn) {
    if (!fn) return;
    const h = () => { dlg.removeEventListener('close', h); fn(); };
    dlg.addEventListener('close', h);
  }

  /**
   * Montre ce qui attend, une feuille à la fois : les écrans d'accueil (une seule fois, partie neuve ou convertie ;
   * pendant cette visite, rien d'autre ne suit : pas de mur d'écrans), sinon la lettre de passage à la v2 (une seule
   * fois, partie convertie), puis la lettre de conversion des niveaux en permis (une seule fois, partie v2 d'avant les
   * permis), sinon la lettre du matin (pas le premier jour ; la lettre de passage ou de conversion en tient lieu le jour
   * où elle est montrée), puis le bilan le dimanche (une fois par appareil), puis le mot de Fanal sur le marchand et sur
   * l'imprévu du jour. Si une autre feuille est ouverte, attend sa fermeture.
   */
  function welcome() {
    if (welcoming) return;
    const open = anyOpen();
    if (open) {
      if (waitFor !== open) { waitFor = open; whenClosed(open, () => { waitFor = null; setTimeout(welcome, 50); }); }
      return;
    }
    const c = app.ctx();
    if (!c || !c.game) return;
    const next = () => { welcoming = false; refocus(); setTimeout(welcome, 50); };
    if (!c.game.accueil && !accueilIci) {
      accueilIci = true;
      welcoming = true;
      openAccueil(() => { welcoming = false; app.focusBandeau?.(); });
      return;
    }
    if (accueilIci) return; // la lettre de passage et le reste attendent la prochaine visite
    const today = gameDay(c.now);
    const passage = content.lettres ? passageLetter(content.lettres, c.game, { prenom: prenom() || null }) : null;
    if (passage) { welcoming = true; openLetter(passage, next); return; }
    const conversion = content.lettres ? conversionLetter(content.lettres, c.game, { prenom: prenom() || null }) : null;
    if (conversion) { welcoming = true; openLetter(conversion, next); return; }
    const passageToday = [...(content.lettres?.passage ?? []), ...(content.lettres?.conversion ?? [])]
      .some((l) => (c.game.letters ?? {})[l.id] === today);
    if (content.lettres && c.game.startDay !== today && !passageToday) {
      const letter = morningLetter(content.lettres, c.tasks, c.game, c.now, { prenom: prenom() || null, ledger: c.ledger });
      if (letter && !letter.seen) { welcoming = true; openLetter(letter, next, psProduction(c.ledger, today)); return; }
    }
    const r = readReview();
    if (r.shown !== today && weeklyReview(c.tasks, c.game, c.ledger, c.now).dimanche) {
      welcoming = true; openReview(c, () => { welcoming = false; refocus(); app.arrivee?.(); }); return;
    }
    app.arrivee?.(); // rien d'autre n'attend : Fanal annonce le marchand s'il vient d'arriver, puis l'imprévu du jour
  }

  return {
    welcome,
    accueilSuivant,
    openSettings,
    saveSettings,
    chercherVille,
    choisirVille,
    retirerVille,
    lancerMaj,
    openReview: () => openReview(app.ctx()),
    refreshReview: () => refreshReview(app.ctx()),
    reviewAction: (action, id) => reviewAction(action, id, app.ctx()),
  };
}
