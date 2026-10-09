// Fiche d'un bâtiment (bible §5) : trois lignes, « Ce que c'est », « Ce que ça fait », « Maintenant », puis le seul
// geste possible ici (bâtir, semer, récolter, accueillir une famille). Un geste impossible reste visible, à plat, avec
// sa raison écrite par le cœur (« Hameau : encore 2 habitants. ») et un cadenas : le joueur sait toujours pourquoi.
// Rien n'est calculé ici qui ne vienne de core/batiments.js ; les valeurs que les niveaux de quartier changent (récolte
// selon le lieu, jours de pousse, places par chalet, prix d'une famille, stockage) sont lues au cœur, jamais des
// constantes de départ. Le geste passe par data-action="bat-geste".
// Quand le marchand est au quai (core/visiteurs.js), la fiche du quai devient son comptoir : une ligne par offre, ce
// que tu donnes → ce que tu reçois, et « Échanger » (bouton secondaire, data-geste="echanger"), le cadenas et la raison
// du cœur, ou « Fait cette semaine ». Sous ces offres, l'échange du jour (lot T), dessiné pareil sous sa propre phrase,
// avec « Fait aujourd'hui ». Au-dessus, la commande du visiteur de la semaine (lot C) : « Livrer », seul geste
// principal de la fiche (data-geste="livrer", épinglé au lundi de la commande vue), ou le cadenas et la raison, ou
// « Commande livrée ». Le pied de la fiche reste caché.
// Un mauvais imprévu (core/imprevus.js, lot I) se lit dans « Maintenant » : ce qui s'est passé, ce que ça change, puis
// « Réparer » (« Chasser l'ours », « Couvrir la culture ») et son prix, en bouton secondaire (data-geste="reparer"), ou le
// cadenas et la raison du cœur, et les deux autres voies : une quête du bon domaine, ou attendre qu'il se règle seul.
// Réglé aujourd'hui, il laisse à sa place une ligne cochée jusqu'au soir. La neige d'une tempête (core/hiver.js, lot H)
// est un dégât du même genre : « Déneiger », une quête Terrain, ou la neige qui fond.
// Le visiteur à commande (lot C) a son bloc au-dessus du comptoir : qui il est, ce qu'il demande, ce qu'il laisse, la
// taille de la commande quand elle n'est pas « régulière », puis « Livrer » (la seule action principale de la fiche,
// data-geste="livrer"), le cadenas et la raison du cœur, ou « Commande livrée ».
import {
  BATIMENTS, CHAUFFAGE, GRENIER_STOCKAGE, EOLIENNE_ENERGIE, aBati, etatCulture, coutSemis,
  refusConstruire, refusSemer, refusRecolter, refusAccueillir, logements, stockage, gameDay, eolienneDuJour,
  recolteDe, prixFamille, placesParChalet, valeur, visiteurDeLaSemaine, refusEchanger, IMPREVUS, DEGATS, degatDe, refusReparer,
  saisonDe, degatsALaRecolte, commandeDeLaSemaine, refusLivrer,
} from '../../core/index.js';
import { t } from '../content.js';
import { $, esc, icon, setHtml } from './dom.js';
import { numPossede, numManque, numGain, entierGain, shortDate } from './format.js';

const typeOf = (id) => String(id ?? '').replace(/-\d+$/, '');

/** « 15 Matériaux », « 4 Énergie et 20 Matériaux » (les mêmes mots et le même ordre que le HUD et les prix des quartiers). */
export function coutText(cout) {
  const parts = [];
  if (cout.energy) parts.push(`${numManque(cout.energy)} ${t('resource.energy')}`);
  if (cout.materials) parts.push(`${numManque(cout.materials)} ${t(Math.ceil(cout.materials) < 2 ? 'resource.materials.one' : 'resource.materials.other')}`);
  return parts.join(' et ');
}

// habitants logés dans chaque chalet debout, dans l'ordre des chalets (comme la carte)
function occupantsDe(game, id) {
  let reste = logements(game).habitants;
  const places = placesParChalet(game);
  for (let k = 1; k <= BATIMENTS.chalet.max; k++) {
    const cid = `chalet-${k}`;
    if (!aBati(game, cid)) continue;
    const n = Math.min(places, reste);
    if (cid === id) return n;
    reste -= n;
  }
  return 0;
}

// « 30 Énergie », « 15 Matériaux », « 10 Nourriture » : une ressource d'un côté d'une offre du marchand
const RES = { energy: 'energie', materials: 'materiaux', food: 'nourriture' };
export function ressource(obj) {
  const [k, n] = Object.entries(obj)[0];
  const nom = k === 'materials' ? t(n < 2 ? 'resource.materials.one' : 'resource.materials.other') : t(k === 'energy' ? 'resource.energy' : 'resource.food');
  return { res: RES[k], n, nom, texte: `${n} ${nom}` };
}

/** « 12 Nourriture », « 15 Matériaux et 6 Nourriture » : une demande de visiteur, dans l'ordre de la barre du haut. */
export function ressourcesText(obj) {
  const parts = ['energy', 'materials', 'food'].filter((k) => obj[k] > 0).map((k) => ressource({ [k]: obj[k] }).texte);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts.join('');
}

const DEGAT_ICON = { panne: 'cle', ours: 'patte', gel: 'flocon', neige: 'pelle' };
const domaine = (type) => t(`quartier.${DEGATS[type].quartier}.domain`);

/**
 * Dégât d'un mauvais imprévu sur ce bâtiment : en cours { id, type, titre, effet, geste, cout, label, raison, quete, seul,
 * voie (picto du quartier de la quête qui le règle) }, réglé aujourd'hui { id, type, titre, fini }, ou null.
 */
function degatModel(game, id, now) {
  const type = typeOf(id);
  const d = degatDe(game, id, now);
  if (d) {
    const def = DEGATS[d.type];
    const geste = t(`bat.degat.${d.type}.geste`);
    const cout = coutText(def.reparer);
    const neige = d.type === 'neige'; // la neige dit ce qu'elle change selon le bâtiment, et qu'elle fond
    return {
      id: d.id, type: d.type, fini: null,
      titre: t(`bat.degat.${d.type}.titre`),
      effet: t(neige ? `bat.degat.neige.effet.${type}` : `bat.degat.${d.type}.effet`, { n: IMPREVUS.mauvais.ours.mange }),
      geste, cout, label: t('bat.degat.geste.label', { geste, cout }),
      raison: refusReparer(game, { id: d.id }, now),
      quete: t('bat.degat.quete', { domaine: domaine(d.type) }), voie: def.quartier,
      seul: t(`bat.degat.${neige ? 'neige.' : ''}seul.${d.joursRestants === 1 ? 'one' : 'other'}`, { n: d.joursRestants }),
    };
  }
  const today = gameDay(now);
  const f = (Array.isArray(game.degats) ? game.degats : []).find((x) => x && x.cible === id && x.fin === today && Object.hasOwn(DEGATS, x.type));
  if (!f) return null;
  const fini = f.par === 'quete' ? t('bat.degat.fait.quete', { domaine: domaine(f.type) })
    : f.par === 'recolte' ? t('bat.degat.ours.recolte') : t(`bat.degat.${f.type}.fait`);
  return { id: f.id, type: f.type, titre: t(`bat.degat.${f.type}.titre`), fini };
}

/**
 * Modèle de la fiche : { id, type, bati, nom, quoi, fait, maintenant, raison, geste: { action, params, label } | null,
 * comptoir: [{ id, donne, recoit, prise, raison }] | null, duJour: { même forme } | null, commande, degat } (comptoir et
 * duJour : le quai debout, quand le marchand y est ; commande : voir commandeModel ; degat : voir degatModel).
 */
export function batimentModel(c, id) {
  const type = typeOf(id);
  if (!Object.hasOwn(BATIMENTS, type)) return null;
  const def = BATIMENTS[type];
  const { game, ledger, now } = c;
  const bati = aBati(game, id);
  const m = {
    id, type, bati,
    nom: t(`bat.${type}.${bati ? 'nom' : 'vide'}`),
    quoi: t(`bat.${type}.${bati ? 'quoi' : 'quoiVide'}`),
    fait: t(`bat.${type}.fait`, {
      loge: placesParChalet(game), recolte: recolteDe(game, def.culture), jours: valeur(game, 'joursPousse'), chauffage: CHAUFFAGE,
      n: type === 'eolienne' ? EOLIENNE_ENERGIE : GRENIER_STOCKAGE,
    }),
    maintenant: '', raison: null, geste: null, comptoir: null, duJour: null, commande: null, degat: bati ? degatModel(game, id, now) : null,
  };
  if (!bati) {
    m.maintenant = t('bat.fiche.cout', { cout: coutText(def.cout) });
    m.raison = refusConstruire(game, type, id);
    m.geste = { action: 'construire', params: { type, id }, label: t(`bat.${type}.geste`) };
  } else if (def.culture) {
    const st = etatCulture(game, ledger, id, now);
    if (!st.semee) {
      const cs = coutSemis(id, gameDay(now));
      m.maintenant = cs.chauffage
        ? t('bat.fiche.semer.chauffage', { semis: numManque(cs.energy - cs.chauffage), chauffage: numManque(cs.chauffage) })
        : t('bat.fiche.semer.cout', { cout: coutText({ energy: cs.energy }) });
      m.raison = refusSemer(game, ledger, id, now);
      m.geste = { action: 'semer', params: { id }, label: t('bat.fiche.semer') };
    } else if (!st.mure) {
      m.maintenant = t(`bat.fiche.pousse.${st.reste === 1 ? 'one' : 'other'}`, { n: st.reste, date: shortDate(st.semeLe) });
      m.geste = { action: 'recolter', params: { id }, label: t('bat.fiche.recolter'), attente: true };
    } else {
      // la réserve pleine ne bloque plus la récolte : la fiche dit d'avance ce qui serait perdu (l'hiver, la serre compte
      // quand même pour son objectif)
      const n = recolteDe(game, def.culture);
      const tient = n - degatsALaRecolte(game, id, n, now).mange; // un ours en visite prend sa part avant le stockage
      const place = stockage(game) - game.resources.food;
      const serreHiver = def.culture === 'serre' && saisonDe(gameDay(now)).id === 'hiver';
      m.maintenant = entierGain(place) <= 0
        ? t(`bat.fiche.mure.plein${serreHiver ? '.hiver' : ''}`, { n: numGain(n), stock: numPossede(game.resources.food), max: numPossede(stockage(game)), objectif: t('bandeau.saison.serre.titre') })
        : place < tient ? t('bat.fiche.mure.place', { n: numGain(n), place: numGain(place) }) : t('bat.fiche.mure', { n: numGain(n) });
      m.raison = refusRecolter(game, ledger, id, now);
      m.geste = { action: 'recolter', params: { id }, label: t('bat.fiche.recolter') };
    }
  } else if (type === 'chalet') {
    const occupants = occupantsDe(game, id);
    m.maintenant = t(`bat.fiche.chalet.${occupants === 0 ? 'zero' : occupants === 1 ? 'one' : 'other'}`, { occupants, loge: placesParChalet(game), n: prixFamille(game) });
    m.raison = refusAccueillir(game);
    m.geste = { action: 'accueillir', params: {}, label: t('bat.fiche.accueillir') };
  } else if (type === 'eolienne') {
    const d = degatDe(game, id, now);
    m.maintenant = d ? t(`bat.eolienne.maintenant.${d.type}`)
      : eolienneDuJour(ledger, gameDay(now)) > 0 ? t('bat.eolienne.maintenant.fait', { n: EOLIENNE_ENERGIE }) : t('bat.eolienne.maintenant');
  } else if (type === 'quai') {
    const v = visiteurDeLaSemaine(game, now);
    if (v) {
      m.maintenant = t(`bat.quai.maintenant.${v.joursRestants === 1 ? 'one' : 'other'}`, { n: v.joursRestants });
      const offre = (o) => ({
        id: o.id, donne: ressource(o.donne), recoit: ressource(o.recoit), prise: o.prise,
        raison: o.prise ? null : refusEchanger(game, { offre: o.id }, now),
      });
      m.comptoir = v.offres.map(offre);
      m.duJour = offre(v.duJour);
    }
    m.commande = commandeModel(game, ledger, now);
  } else if (type === 'grenier') {
    m.maintenant = t('bat.grenier.maintenant', { stock: numPossede(game.resources.food), max: numPossede(stockage(game)) });
  } else {
    m.maintenant = t(`bat.${type}.maintenant`);
  }
  return m;
}

/**
 * Le visiteur à commande de la semaine dans la fiche du quai, ou null : { id, nom, qui, jours, demande: [ressource],
 * recoit: { res, n, nom, note }, taille (phrase, ou null à l'allure régulière), livree, semaine, raison, label }.
 */
function commandeModel(game, ledger, now) {
  const c = commandeDeLaSemaine(game, ledger, now);
  if (!c) return null;
  const [res, n] = Object.entries(c.recoit)[0];
  const recoit = res === 'materials' ? { ...ressource({ materials: n }), note: null }
    : { res, n, nom: t(`bat.commande.recoit.${res}`), note: res === 'habitants' ? t('bat.commande.recoit.habitants.note') : null };
  return {
    id: c.id, nom: t(`bat.commande.${c.id}.nom`), qui: t(`bat.commande.${c.id}.qui`),
    jours: t(`bat.commande.jours.${c.joursRestants === 1 ? 'one' : 'other'}`, { n: c.joursRestants }),
    demande: ['energy', 'materials', 'food'].filter((k) => c.demande[k] > 0).map((k) => ressource({ [k]: c.demande[k] })),
    recoit, livree: c.livree, semaine: c.semaine,
    taille: c.allegee ? t('bat.commande.taille.allegee') : c.taille === 'regulier' ? null : t(`bat.commande.taille.${c.taille}`),
    raison: c.livree ? null : refusLivrer(game, ledger, {}, now),
    label: t('bat.commande.geste.label', { demande: ressourcesText(c.demande), au: t(`bat.commande.${c.id}.au`) }),
  };
}

const GESTE_ICON = { construire: 'chantier', semer: 'champs', recolter: 'nourriture', accueillir: 'habitants' };

const resHtml = (r) => `<span class="offre-res" data-res="${r.res}">${icon(r.res)}<b>${r.n}</b> ${esc(r.nom)}</span>`;

// Une offre du marchand : le troc sur une ligne, puis « Échanger » (ou « Fait cette semaine », « Fait aujourd'hui » pour
// l'échange du jour) ; la raison du cœur dessous.
function offreHtml(o, quand = t('bat.comptoir.fait.quand')) {
  const etat = o.prise ? 'fait' : o.raison ? 'verrou' : 'libre';
  const action = o.prise
    ? `<p class="offre-fait" id="offre-${o.id}-etat" tabindex="-1">${icon('check')}<span>${esc(t('bat.comptoir.fait'))} <small>${esc(quand)}</small></span></p>`
    : `<button class="btn btn--small offre-go" type="button" data-action="bat-geste" data-geste="echanger"
      data-params="${esc(JSON.stringify({ offre: o.id }))}" aria-label="${esc(t('bat.comptoir.geste.label', { donne: o.donne.texte, recoit: o.recoit.texte }))}"${o.raison ? ` aria-disabled="true" aria-describedby="offre-${o.id}-raison"` : ''}>${icon(o.raison ? 'lock' : 'echange')}<span>${esc(t('bat.comptoir.geste'))}</span></button>`;
  return `<li class="offre" data-offre="${o.id}" data-etat="${etat}">
    <p class="offre-troc">${resHtml(o.donne)}${icon('fleche', 'offre-fleche')}<span class="sr-only"> ${esc(t('bat.comptoir.contre'))} </span>${resHtml(o.recoit)}</p>
    ${action}${o.raison ? `<p class="offre-raison" id="offre-${o.id}-raison">${icon('lock')}<span>${esc(o.raison)}</span></p>` : ''}</li>`;
}

function comptoirHtml(offres, duJour) {
  return `<section class="comptoir" aria-labelledby="comptoir-t">
    <h3 class="comptoir-titre" id="comptoir-t">${icon('barque')}<span>${esc(t('bat.comptoir.titre'))}</span></h3>
    <p class="comptoir-intro">${esc(t('bat.comptoir.intro'))}</p>
    <ul class="comptoir-offres" role="list">${offres.map((o) => offreHtml(o)).join('')}</ul>
    <p class="comptoir-intro comptoir-jour">${esc(t('bat.comptoir.jour.intro'))}</p>
    <ul class="comptoir-offres" role="list">${offreHtml(duJour, t('bat.comptoir.jour.fait.quand'))}</ul></section>`;
}

// Le visiteur à commande, au-dessus du comptoir : son nom et ses jours, qui il est, « Demande » et « Laisse » (picto teinté
// de la ressource, nombre, mot), la taille quand elle n'est pas régulière, puis « Livrer » (principal) ou, verrouillé, le
// cadenas et la raison du cœur ; livrée, une ligne cochée à la même place.
function commandeHtml(c) {
  const etat = c.livree ? 'fait' : c.raison ? 'verrou' : 'libre';
  const action = c.livree
    ? `<p class="commande-fait" id="commande-etat" tabindex="-1">${icon('check')}<span>${esc(t('bat.commande.fait'))} <small>${esc(t(`bat.commande.${c.id}.fait`))}</small></span></p>`
    : `<button class="btn btn--block ${c.raison ? '' : 'btn--primary '}commande-go" type="button" data-action="bat-geste" data-geste="livrer" data-params="${esc(JSON.stringify({ semaine: c.semaine }))}"
      aria-label="${esc(c.label)}"${c.raison ? ' aria-disabled="true" aria-describedby="commande-raison"' : ''}>${icon(c.raison ? 'lock' : 'fleche')}<span>${esc(t('bat.commande.geste'))}</span></button>
      ${c.raison ? `<p class="commande-raison" id="commande-raison">${icon('lock')}<span>${esc(c.raison)}</span></p>` : ''}`;
  return `<section class="commande" data-visiteur="${c.id}" data-etat="${etat}" aria-labelledby="commande-t">
    <h3 class="commande-titre" id="commande-t">${icon('note')}<span>${esc(c.nom)}</span><small class="commande-jours">${esc(c.jours)}</small></h3>
    <p class="commande-qui">${esc(c.qui)}</p>
    <dl class="commande-troc">
      <div><dt>${esc(t('bat.commande.demande'))}</dt><dd>${c.demande.map((r, i) => (i ? `<span class="commande-plus"><span class="commande-et" aria-hidden="true">+</span><span class="sr-only"> ${esc(t('bat.commande.et'))} </span>${resHtml(r)}</span>` : resHtml(r))).join('')}</dd></div>
      <div><dt>${esc(t('bat.commande.laisse'))}</dt><dd>${resHtml(c.recoit)}${c.recoit.note ? `<small class="commande-note">${esc(c.recoit.note)}</small>` : ''}</dd></div>
    </dl>
    ${c.taille ? `<p class="commande-taille">${esc(c.taille)}</p>` : ''}
    ${action}
    <p class="commande-regle">${esc(t('bat.commande.regle'))}</p></section>`;
}

// Le dégât dans « Maintenant » : titre et picto braise, ce que ça change, le geste et son prix (ou le cadenas et la raison),
// les deux autres voies. Réglé : une ligne cochée, à la même place (un second toucher n'y trouve rien à refaire).
function degatHtml(d) {
  if (d.fini) return `<div class="degat" data-degat="${d.type}" data-etat="fait"><p class="degat-fait" id="degat-etat" tabindex="-1">${icon('check')}<span>${esc(d.fini)}</span></p></div>`;
  return `<div class="degat" data-degat="${d.type}" data-etat="${d.raison ? 'verrou' : 'libre'}">
    <p class="degat-titre">${icon(DEGAT_ICON[d.type])}<span>${esc(d.titre)}</span></p>
    <p class="degat-effet">${esc(d.effet)}</p>
    <button class="btn btn--small degat-go" type="button" data-action="bat-geste" data-geste="reparer"
      data-params="${esc(JSON.stringify({ id: d.id }))}" aria-label="${esc(d.label)}"${d.raison ? ' aria-disabled="true" aria-describedby="degat-raison"' : ''}>${icon(d.raison ? 'lock' : DEGAT_ICON[d.type])}<span>${esc(d.geste)}</span><span class="degat-prix">${esc(d.cout)}</span></button>
    ${d.raison ? `<p class="degat-raison" id="degat-raison">${icon('lock')}<span>${esc(d.raison)}</span></p>` : ''}
    <ul class="degat-voies" role="list"><li>${icon(d.voie)}<span>${esc(d.quete)}</span></li><li>${icon('clock')}<span>${esc(d.seul)}</span></li></ul></div>`;
}

function bodyHtml(m) {
  const line = (k, html) => `<div class="help-line"><dt>${esc(t(`bat.fiche.${k}`))}</dt><dd>${html}</dd></div>`;
  const now = `<p id="bat-now">${esc(m.maintenant)}</p>${m.raison ? `<p class="bat-raison" id="bat-raison">${icon('lock')}<span>${esc(m.raison)}</span></p>` : ''}${m.degat ? degatHtml(m.degat) : ''}`;
  return `<dl class="help-lines">${line('quoi', esc(m.quoi))}${line('fait', esc(m.fait))}${line('maintenant', now)}</dl>${m.commande ? commandeHtml(m.commande) : ''}${m.comptoir ? comptoirHtml(m.comptoir, m.duJour) : ''}`;
}

function footHtml(m) {
  const g = m.geste;
  if (!g) return '';
  const off = !!m.raison || !!g.attente;
  const desc = m.raison ? 'bat-raison' : g.attente ? 'bat-now' : '';
  return `<button class="btn ${off ? '' : 'btn--primary '}btn--block" type="button" data-action="bat-geste" data-geste="${esc(g.action)}"
    data-params="${esc(JSON.stringify(g.params))}"${off ? ' aria-disabled="true"' : ''}${desc ? ` aria-describedby="${desc}"` : ''}>${icon(off ? 'lock' : GESTE_ICON[g.action])}<span>${esc(g.label)}</span></button>`;
}

/**
 * Ouvre la fiche du bâtiment `id` (chalet-1, parcelle-2…). `thumb(id)` (facultatif) renvoie le dessin de la carte en
 * SVG, pour que la fiche montre le même objet ; sans monde, la fiche s'ouvre sans dessin.
 */
export function openBatiment(c, id, { thumb, open } = {}) {
  const m = batimentModel(c, id);
  if (!m) return false;
  const dlg = $('#dlg-batiment');
  dlg.dataset.batId = id;
  dlg._thumb = thumb || null;
  dlg.innerHTML = `
    <header class="sheet-head"><h2 class="sheet-title bat-title" id="bat-t"><span class="bat-thumb" aria-hidden="true"></span><span class="bat-nom"></span></h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('bat.fiche.fermer'))}">${icon('x')}</button></header>
    <div class="sheet-body bat-body"></div>
    <footer class="sheet-foot bat-foot"></footer>`;
  fill(dlg, m);
  open(dlg);
  return true;
}

function fill(dlg, m) {
  $('.bat-nom', dlg).textContent = m.nom;
  dlg.dataset.bati = String(m.bati);
  const art = dlg._thumb ? dlg._thumb(m.id) : '';
  const th = $('.bat-thumb', dlg);
  setHtml(th, art || '');
  th.hidden = !art;
  // une offre prise ou devenue impossible change de bouton : le focus reste sur sa ligne (bouton, ou « Fait cette semaine ») ;
  // de même pour un dégât réglé ou une commande livrée (bouton, ou la ligne cochée qui le remplace)
  const body = $('.bat-body', dlg);
  const offre = body.contains(document.activeElement) ? document.activeElement.closest('.offre')?.dataset.offre : null;
  const degat = body.contains(document.activeElement) && !!document.activeElement.closest('.degat');
  const commande = body.contains(document.activeElement) && !!document.activeElement.closest('.commande');
  setHtml(body, bodyHtml(m));
  const li = offre && !body.contains(document.activeElement) ? $(`.offre[data-offre="${offre}"]`, body) : null;
  if (li) ($('.offre-go', li) || $('.offre-fait', li))?.focus();
  if (degat && !body.contains(document.activeElement)) ($('.degat-go', body) || $('.degat-fait', body))?.focus();
  if (commande && !body.contains(document.activeElement)) ($('.commande-go', body) || $('.commande-fait', body))?.focus();
  const foot = $('.bat-foot', dlg);
  const had = foot.contains(document.activeElement);
  setHtml(foot, footHtml(m));
  foot.hidden = !m.geste;
  if (had) ($('[data-action="bat-geste"]', foot) || $('[data-close]', dlg)).focus();
}

/** Remet la fiche ouverte à jour après un geste ou une synchronisation. */
export function refreshBatiment(c) {
  const dlg = $('#dlg-batiment');
  if (!dlg || !dlg.open || !dlg.dataset.batId) return;
  const m = batimentModel(c, dlg.dataset.batId);
  if (m) fill(dlg, m);
}
