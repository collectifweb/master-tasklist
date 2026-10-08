// Point d'entrée : branche l'état (store.js) sur l'écran (ui/*.js) et sur le monde (world-bridge.js).
import {
  SORTS, gameDay, daysBetween, topCards, queteDefaut, visiteurDeLaSemaine, batimentsDuVillage, IMPREVUS, DEGATS, TEMPETE, alerteTempete,
  findEntry, allureDe,
} from '../core/index.js';
import { Store, POLL_MS } from './store.js';
import { token } from './api-client.js';
import { maintenant, decalage, enEssai } from './horloge.js';
import { loadContent, t, tn, content, pickReply, replyVars } from './content.js';
import { $, $$, esc, reducedMotion, setText, inlineSprite, restart } from './ui/dom.js';
import { createHud } from './ui/hud.js';
import { createAnnounce, createVoice, summarize, gainList, aGagne } from './ui/announce.js';
import { createSpeech } from './ui/speech.js';
import { createSync } from './ui/sync.js';
import { renderFil, renderAlts, renderList } from './ui/quests.js';
import { numGain, entierGain } from './ui/format.js';
import {
  wireDialogs, openAdd, refreshAddDefaults, onAddInput, onAddSectorChange, readAdd, openFiche, refreshFiche, readFiche, openWhy,
  confirmDelete, confirmRemballer, openToken, openHelp, openVeille, openSheet, closeSheet, handleStep,
} from './ui/sheets.js';
import { initWorld } from './world-bridge.js';
import { openBatiment, refreshBatiment, coutText, ressource } from './ui/batiment.js';
import { openCatalogue, refreshCatalogue } from './ui/catalogue.js';
import { openQuartier, refreshQuartier, monteText, showMonte } from './ui/quartier.js';
import { createStory } from './ui/story.js';
import { createBandeau } from './ui/bandeau.js';

const root = document.documentElement;
const app = $('#app');
const store = new Store();
const ui = { sort: 'cote', status: 'todo', quick: false, lowEnergy: false, thisWeek: false, quartier: null, search: '' };

const hud = createHud($('.hud'));
const announce = createAnnounce($('.announce-lane'), $('#live'));
// Dernière phrase lue : le passage du temps qui suit un geste (objectif atteint…) s'y ajoute au lieu de l'effacer.
let lastLive = { text: '', at: 0 };
const after = (text) => {
  const prev = Date.now() - lastLive.at < 1500 ? `${lastLive.text} ` : '';
  lastLive = { text: '', at: 0 };
  return prev + text;
};
const remember = (text) => { lastLive = { text, at: Date.now() }; return text; };
const speech = createSpeech(app);
const sync = createSync($('.panel-status'), {});
const bandeau = createBandeau($('#bandeau'));
let world = null;
let worldPlan = null;
let started = false;
let touchFrom = null; // [x, y] du bouton « Fait » touché : le fil de lumière part de là

const ctx = () => ({ tasks: store.view.tasks, game: store.view.game, ledger: store.view.ledger, now: maintenant() });
const story = createStory({
  ctx: () => (store.view ? ctx() : null),
  run: (action, params) => run(action, params),
  attempt: (action, params) => { try { store.do(action, params); return null; } catch (err) { return err.message; } },
  announce: (text) => announce.say(text),
  focusHome,
  thumb: (id) => (world ? world.thumb(id) : ''),
  lightBandeau: () => bandeau.light(),
  focusBandeau: () => { if (!document.activeElement || document.activeElement === document.body) $('.bandeau-today').focus(); },
  arrivee: () => { annonceAllure(); annonceVisiteur(); annonceImprevu(); annonceTempete(); },
});
/** Le clavier repart du Fil du jour (« Fait » de la quête n° 1) quand une feuille ouverte seule se ferme. */
function focusHome() {
  showPanel(); // panneau caché : il revient replié avant que le focus y entre
  const done = $('#fil-quest:not([hidden]) [data-action="complete"]');
  (done || $('.panel-head [data-action="add"]')).focus();
}
const findTask = (id) => (id ? store.view.tasks.find((x) => x.id === id) || null : null);

// ───────── Rendu ─────────
let hudTimer = null;
function renderAll({ deferHud = false } = {}) {
  if (!store.view) return;
  const c = ctx();
  $('#fil-skeleton').hidden = true;
  $('#load-error').hidden = true;
  const cards = renderFil($('#panel-scroll'), c);
  renderAlts($('#panel-scroll'), c, cards);
  renderList($('#panel-scroll'), c, ui);
  refreshFiche(c);
  refreshAddDefaults(queteDefaut(c.game));
  setText($('#panel-date'), panelDate(c.now));
  bandeau.render(c);
  renderEssai();
  // Les compteurs montent à l'impact du fil de lumière (onImpact du monde), pas avant. Sans monde : 320 ms de retard.
  // Filet : si l'impact n'arrive jamais (animation interrompue), les compteurs se mettent à jour au plus tard après 6 s.
  // Un rendu sans gain (la réponse du serveur, par exemple) ne doit pas griller l'impact : il attend lui aussi.
  if (deferHud && world) { hudPending = true; clearTimeout(hudTimer); hudTimer = setTimeout(flushHud, 6000); }
  else if (hudPending) { /* l'impact ou le filet mettra les compteurs à jour */ }
  else if (deferHud && !reducedMotion()) { clearTimeout(hudTimer); hudTimer = setTimeout(flushHud, 320); }
  else { clearTimeout(hudTimer); hud.render(c.game, { animate: true }); }
  if (world) world.render(c.game, c.tasks, c.ledger);
  refreshBatiment(c); // après le monde : la fiche reprend son dessin dans le nouvel état
  refreshQuartier(c);
  if (world) refreshCatalogue(c, { slots: () => world.batiments(c.game, c.ledger) });
  if (worldPlan && $('#dlg-plan').open) worldPlan.render(c.game, c.tasks, c.ledger);
}
const panelDate = (now) => new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Montreal' })
  .format(new Date(gameDay(now) + 'T12:00:00Z'));
/** Outil de la version d'essai (« Jour suivant ») : montré seulement si le serveur l'a dit, avec le décalage en cours. */
function renderEssai() {
  const box = $('#essai');
  box.hidden = !enEssai();
  if (box.hidden) return;
  const n = decalage();
  setText($('#essai-decalage'), n ? tn('essai.decalage', n) : t('essai.decalage.none'));
}
/** « Jour suivant » : la date du jeu avance d'un jour, puis le nouveau jour se joue comme un vrai (tickDay). */
function jourSuivant() {
  if (!enEssai() || !run('jourSuivant', {})) return;
  tickDay();
  announce.say(after(t('essai.jour.sr', { date: panelDate(maintenant()) }))); // après les gains de l'ouverture du jour
}
let hudPending = false;
function flushHud() {
  clearTimeout(hudTimer);
  hudPending = false;
  if (store.view) hud.render(store.view.game, { animate: true });
}

// ───────── Réactions à une action ─────────
function react(payload) {
  const { action, params = {}, events = [], result, now } = payload;
  const s = summarize(events);
  const created = action === 'createQuest' ? ((result.ops || []).find((o) => o.type === 'task.upsert') || {}).task?.id : null;
  const taskId = params.id || created || (events.find((e) => e.type === 'reward' && e.taskId) || {}).taskId || null;
  const task = findTask(taskId) || (result && result.tasks.find((x) => x.id === taskId)) || null;
  const title = task ? task.task : '';
  if (action === 'construire' && params.type === 'quai') noterVisite(result.game, now || maintenant()); // Fanal l'annonce ici
  const reply = speech.react({ action, params, events, task, now: now || maintenant() });
  const replyText = reply ? ` ${reply.nom}\u00a0: ${reply.texte}` : '';
  const gains = gainList(s);
  const objectifs = [objectifsSay(events), degatsSay(events)].filter(Boolean).join(' ');

  if (['completeQuest', 'createQuest', 'toggleStep', 'openApp', 'claimBonus', 'advanceTime', ...BAT_ACTIONS].includes(action) && aGagne(s)) { // même sans chiffre à montrer (gains arrondis à 0), l'annonce reste
    const head = action === 'completeQuest' || (action === 'createQuest' && params.alreadyDone) ? t('sr.quest.done', { quete: title })
      : action === 'createQuest' ? t('sr.added', { quete: title })
        : action === 'toggleStep' ? t('sr.step.done', { etape: ((task && task.steps) || []).find((x) => x.id === params.stepId)?.label || '', fait: (task.steps || []).filter((x) => x.done).length, total: (task.steps || []).length })
          : action === 'advanceTime' ? [imprevuSay(events, now || maintenant()), tempeteSay(events)].filter(Boolean).join(' ')
            : BAT_ACTIONS.includes(action) ? batimentSay(events) : '';
    const liveText = `${head}${objectifs ? ' ' + objectifs : ''} ${gains.length ? t('sr.gains', { liste: gains.join(', ') }) : ''}${replyText}`.trim();
    announce.show(s, 'gain', { liveText: remember(action === 'advanceTime' ? after(liveText) : liveText) }); // « Jour suivant » s'y ajoute
    return;
  }
  if (action === 'completeQuest' && s.noGain) {
    announce.show(s, 'none', { liveText: `${t('sr.quest.done', { quete: title })} ${t('sr.repeat_zero')}` });
    return;
  }
  if (action === 'remballerQuest') {
    // l'écriture inverse de la quête, et celle de l'éolienne si le jour reste sans quête payée
    const e = (result.entries || []).reduce((a, x) => ({ energy: a.energy + (x.energy || 0), materials: a.materials + (x.materials || 0) }), { energy: 0, materials: 0 });
    const list = [entierGain(e.energy) && `${numGain(e.energy)} ${t('resource.energy')}`, entierGain(e.materials) && `${numGain(e.materials)} ${t('resource.materials.other')}`].filter(Boolean);
    const rouverts = events.filter((e) => e.type === 'degat-rouvert').map((e) => ` ${t(`bat.sr.rouvert.${e.imprevu}`)}`).join('');
    announce.show(s, 'undo', { liveText: `${t('sr.quest.undone', { quete: title })}${list.length ? ' ' + t('sr.undone.gains', { liste: list.join(', ') }) : ''}${rouverts}${replyText}` });
    return;
  }
  const say = {
    archiveQuest: () => t('sr.archived', { quete: title }),
    unarchiveQuest: () => t('sr.unarchived', { quete: title }),
    deleteQuest: () => t('sr.deleted', { quete: title }),
    reopenQuest: () => t('sr.reopened', { quete: title }),
    createQuest: () => t('sr.added', { quete: title }),
  }[action];
  if (say) return announce.say(remember(say() + replyText));
  // geste du village sans gain (réparer, rentrer du bois), ou passage du temps sans gain (orignal, mauvais imprévu, tempête)
  const bat = [batimentSay(events), imprevuSay(events, now || maintenant()), tempeteSay(events)].filter(Boolean).join(' ');
  if (bat) announce.say(remember(action === 'advanceTime' ? after(bat + replyText) : bat + replyText));
}

const BAT_ACTIONS = ['construire', 'semer', 'recolter', 'accueillir', 'monterQuartier', 'echanger'];

/** Phrase lue quand un objectif est atteint : un premier pas (et le dernier des cinq), l'objectif de la saison, la semaine tenue. */
function objectifsSay(events) {
  const out = [];
  for (const e of events) {
    if (e.type === 'premier-pas') out.push(t('sr.pas', { nom: t(`pas.${e.id}.nom`) }));
    else if (e.type === 'objectif-saison') out.push(t(`sr.saison.${e.objectif}`));
    else if (e.type === 'semaine-tenue') out.push(t('sr.semaine', { n: numGain(e.materials) }));
  }
  if (events.some((e) => e.type === 'premier-pas' && e.id === 'famille')) out.push(t('sr.pas.fin'));
  return out.join(' ');
}

/**
 * Phrase lue après un geste du village : construction, semis, récolte, famille accueillie, nouveau rang, quartier monté,
 * échange au comptoir du marchand.
 */
function batimentSay(events) {
  const out = [];
  const nom = (id) => t(`bat.${String(id).replace(/-\d+$/, '')}.nom`);
  for (const e of events) {
    if (e.type === 'construction') out.push(t('bat.sr.construction', { nom: nom(e.id), cout: coutText(e.cout) }));
    else if (e.type === 'semis') out.push(t('bat.sr.semis', { nom: nom(e.id), cout: coutText(e.cout) }));
    else if (e.type === 'recolte') out.push(t(entierGain(e.perdu) > 0 ? `bat.sr.recolte.${entierGain(e.nourriture) > 0 ? 'perdu' : 'plein'}` : 'bat.sr.recolte', { n: numGain(e.nourriture), perdu: numGain(e.perdu) }) + (e.ours ? ` ${t('bat.sr.recolte.ours', { n: numGain(e.ours) })}` : ''));
    else if (e.type === 'famille') out.push(t(e.habitants === 1 ? 'bat.sr.famille.one' : 'bat.sr.famille', { n: e.habitants }));
    else if (e.type === 'rang') out.push(t('bat.sr.rang', { rang: e.name }));
    else if (e.type === 'quartier-monte') out.push(monteText(e));
    else if (e.type === 'echange') out.push(t('bat.sr.echange', { donne: ressource(e.donne).texte, recoit: ressource(e.recoit).texte }));
    else if (e.type === 'reparation' && e.par === 'paiement') out.push(t(`bat.sr.reparation.${e.imprevu}`, { cout: coutText(e.cout) }));
  }
  return out.join(' ');
}

/** Phrase lue avec une quête payée (lot I) : elle règle aussi un dégât de son domaine, ou l'éolienne en panne n'a pas tourné. */
function degatsSay(events) {
  const out = [];
  for (const e of events) {
    if (e.type === 'reparation' && e.par === 'quete') out.push(t(`bat.sr.reparation.quete.${e.imprevu}`));
    else if (e.type === 'eolienne-arretee') out.push(t(e.neige ? 'bat.sr.eolienne.arretee.neige' : 'bat.sr.eolienne.arretee'));
  }
  return out.join(' ');
}

/**
 * Phrase lue quand un imprévu arrive (lot I) : ce qui se passe et, pour un mauvais, ce que ça change, son prix et quand il
 * se règle seul. Une bonne pêche plafonnée par la réserve le dit.
 */
function imprevuSay(events, now) {
  const out = [];
  const one = (n) => (n === 1 ? 'one' : 'other');
  for (const e of events) {
    if (e.type !== 'imprevu') continue;
    if (e.nature === 'mauvais') {
      const n = daysBetween(gameDay(now), e.jusqua);
      out.push(t(`sr.imprevu.${e.imprevu}.${one(n)}`, { n, cout: coutText(IMPREVUS.mauvais[e.imprevu].reparer) }));
    } else if (e.imprevu === 'peche' && entierGain(e.perdu) > 0) out.push(t(`sr.imprevu.peche.plein.${e.perdu < 2 ? 'one' : 'other'}`, { perdu: numGain(e.perdu) }));
    else out.push(t(`sr.imprevu.${e.imprevu}`));
  }
  return out.join(' ');
}

/**
 * Phrase lue pour une tempête (lot H) : un cran de bois rentré (et la barre pleine), ou l'issue au passage du temps (tenue,
 * un bâtiment sous la neige avec ses trois voies, passée sans rien abîmer).
 */
function tempeteSay(events) {
  const out = [];
  for (const e of events) {
    if (e.type === 'preparation') {
      out.push(t('sr.tempete.preparation', { cout: coutText(e.cout), n: e.crans, max: TEMPETE.crans }));
      if (e.crans >= TEMPETE.crans) out.push(t('sr.tempete.prete'));
    } else if (e.type !== 'tempete') continue;
    else if (e.resultat === 'tenue') out.push(t('sr.tempete.tenue'));
    else if (e.resultat === 'passee') out.push(t('sr.tempete.passee'));
    else {
      const n = daysBetween(e.jour, e.jusqua);
      out.push(t(`sr.tempete.neige.${String(e.cible).replace(/-\d+$/, '')}.${n === 1 ? 'one' : 'other'}`, { n, cout: coutText(DEGATS.neige.reparer) }));
    }
  }
  return out.join(' ');
}

/** Événements du jeu + ceux que seule l'interface connaît : objet-reflet de la quête faite. */
function worldEvents(payload) {
  const events = [...((payload && payload.events) || [])];
  if (!world || !payload || !payload.action) return events;
  const { action, params = {}, result } = payload;
  const done = action === 'completeQuest' || (action === 'createQuest' && params.alreadyDone);
  if (done && result) {
    const id = params.id || ((result.ops || []).find((o) => o.type === 'task.upsert') || {}).task?.id;
    const gained = events.some((e) => e.type === 'reward');
    const after = result.tasks;
    if (gained && id) {
      const prior = after.map((x) => (x.id === id ? { ...x, status: 'todo', doneAt: null } : x));
      events.push(...world.refletEvents(result.game, after, prior));
    }
  }
  return events;
}

store.on('change', (payload) => {
  const events = (payload && payload.events) || [];
  renderAll({ deferHud: events.some((e) => e.type === 'reward') });
  if (payload && payload.action && started) react(payload);
  if (world && events.length) {
    const from = touchFrom && Date.now() - touchFrom.at < 4000 ? [touchFrom.x, touchFrom.y] : undefined;
    touchFrom = null;
    const run = world.play(worldEvents(payload), { from });
    Promise.resolve(run).then(() => {
      if (hudPending) flushHud();
      // plus aucune quête ouverte après un « Fait » : la visite se termine d'elle-même
      if (payload.action === 'completeQuest' && !topCards(store.view.tasks, maintenant()).first) setTimeout(endVisit, 600);
    });
  }
});
// Un message court ou une erreur d'enregistrement (« Réessayer ») vit dans la zone d'état du panneau : panneau caché,
// il revient replié avant que le texte s'écrive, pour être vu et lu. « Enregistrement… » et « Enregistré » ne le font pas.
store.on('sync', (s) => { if (s && (s.state === 'error' || s.state === 'offline')) showPanel(); sync.set(s); });
store.on('notice', (n) => notice(n));
const askToken = (locked = 0) => openToken(
  // pendant un blocage, le nouveau code attend : la feuille se rouvre avec le temps qui reste
  () => (store.lockLeft() ? askToken(store.lockLeft()) : started ? store.retryNow() : start()),
  { bad: token.has() && !locked, locked },
);
store.on('need-token', (p) => askToken((p && p.locked) || 0));

// Après ces gestes, le temps du jeu avance : advanceTime est idempotente.
const AFTER_TIME = new Set(['completeQuest', 'createQuest', 'toggleStep']);

/** Lance une action ; un refus du jeu (message en français) s'affiche en message court, rien n'est modifié. */
function run(action, params) {
  let r;
  try {
    r = store.do(action, params);
  } catch (err) {
    notice({ kind: 'info', text: err.message });
    return null;
  }
  // un imprévu ou une tempête peut arriver ici, la première fois que le temps passe après les premiers pas : Fanal le raconte
  if (AFTER_TIME.has(action)) {
    const ev = advanceTime()?.events || [];
    if (ev.some((e) => e.type === 'imprevu')) annonceImprevu();
    if (ev.some((e) => e.type === 'tempete')) annonceTempete();
  }
  return r;
}
function advanceTime() {
  try { return store.do('advanceTime', {}); } catch { return null; /* état illisible : on réessaiera au prochain geste */ }
}

// ───────── Panneau ─────────
// Trois états : 'open' (ouvert), 'peek' (replié : le Fil du jour), 'cache' (caché par « Quêtes » : la carte prend tout
// l'écran ; le panneau est inert). true / false valent 'open' / 'peek'. Table des passages :
//   « Tout voir » / « Replier »    replié ↔ ouvert (hors d'atteinte quand il est caché)
//   en-tête, compact seulement     toucher : replié ↔ ouvert ; glisser vers le haut : ouvert ; vers le bas : replié
//   « Quêtes » (carte)             ouvert ou replié → caché ; caché → replié
//   Échap                          ouvert → replié, focus sur « Tout voir » (rien si une feuille est ouverte)
//   filtre par quartier            tout état → ouvert
//   « Aujourd'hui », retour au Fil caché → replié avant que le focus entre ; sinon inchangé
//   « Voir sur la carte »          ouvert → replié ; replié et caché inchangés
//   focus clavier entrant          replié → ouvert s'il tombe hors de la partie visible ; caché : impossible (inert)
//   message court, erreur          caché → replié avant que le texte s'écrive
function setPanel(state) {
  state = state === true ? 'open' : state === false ? 'peek' : state;
  const open = state === 'open';
  app.dataset.panel = state;
  $('#panel').inert = state === 'cache';
  if (open) bandeau.toggle(false); // la carte des objectifs dépliée passerait sous le panneau
  const toggle = $('[data-action="toggle-panel"]');
  toggle.setAttribute('aria-expanded', String(open));
  setText($('.panel-toggle-label', toggle), open ? t('panel.less') : t('panel.more'));
  if (!open) $('#panel-scroll').scrollTop = 0;
  if (world) world.setQuestsShown(state !== 'cache');
}
/** Panneau caché : il revient replié (avant un focus ou un message qui doit être vu). */
function showPanel() {
  if (app.dataset.panel === 'cache') setPanel('peek');
}
/** Message court dans la zone d'état du panneau, montrée d'abord si le panneau était caché. */
function notice(n) {
  showPanel();
  sync.notice(n);
}

// En-tête du rabat (disposition compacte, la même requête que le CSS) : un toucher n'importe où hors des boutons
// déplie ou replie ; un glissement vers le haut ouvre, vers le bas replie. Les boutons gardent leur seule action.
const LARGE = matchMedia('(min-width: 1000px), (min-width: 700px) and (orientation: landscape)');
const SWIPE_PX = 8; // en deçà, c'est un toucher ; au-delà, un glissement
let headDown = null;
const head = $('.panel-head');
head.addEventListener('pointerdown', (e) => {
  if (LARGE.matches || app.dataset.panel === 'cache' || e.button !== 0) return;
  if (e.target.closest('button, a, input, select, textarea')) return;
  headDown = { id: e.pointerId, x: e.clientX, y: e.clientY };
  try { head.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
});
head.addEventListener('pointerup', (e) => {
  if (!headDown || e.pointerId !== headDown.id) return;
  const dx = e.clientX - headDown.x, dy = e.clientY - headDown.y;
  headDown = null;
  if (Math.hypot(dx, dy) <= SWIPE_PX) setPanel(app.dataset.panel !== 'open');
  else if (Math.abs(dy) > Math.abs(dx)) setPanel(dy < 0);
});
head.addEventListener('pointercancel', () => { headDown = null; });

// Panneau replié : si le clavier envoie le focus sur un élément qui dépasse la partie visible, on ouvre le panneau
// plutôt que de laisser le contenu glisser sous l'en-tête.
document.addEventListener('focusin', (e) => {
  // au clavier seulement : un toucher sur « Fait » pendant que le panneau finit de bouger ne doit pas l'ouvrir
  if (app.dataset.panel !== 'peek' || !e.target.closest || !e.target.closest('#panel-scroll') || !e.target.matches(':focus-visible')) return;
  const r = e.target.getBoundingClientRect();
  if (r.bottom > window.innerHeight || r.top < $('#panel-scroll').getBoundingClientRect().top) setPanel(true);
});

// ───────── Monde : sélection d'un quartier, carte en liste ─────────
/**
 * « Voir les quêtes » (fiche d'un quartier) : la liste montre exactement les quêtes à faire de ce quartier, celles que
 * le bouton compte (statut « À faire », sans recherche ni filtre rapide), et le panneau s'ouvre.
 */
function filterByQuartier(id) {
  Object.assign(ui, { status: 'todo', quick: false, lowEnergy: false, thisWeek: false, search: '', quartier: id });
  $('input[name="statut"][value="todo"]').checked = true;
  for (const c of $$('.chips .chip')) c.setAttribute('aria-pressed', String(c.dataset.quartier === id));
  $('#search').value = ''; $('.search-clear').hidden = true;
  renderAll();
  setPanel(true);
}
/** Le clavier arrive sur la première quête de la liste filtrée (sur le titre de la liste si elle est vide). */
function focusQuestList() {
  const first = $('#quest-list:not([hidden]) .quest-main');
  if (first) return first.focus();
  const h = $('#list-h');
  h.tabIndex = -1;
  h.focus();
}
/** Toucher la carte : une caisse ouvre sa quête ; une plaque, un repère ou Fanal ouvre la fiche du quartier (Fanal : la Place). */
function onWorldSelect(info) {
  if (!info) return;
  if (info.type === 'batiment') { openBatimentSheet(info.id); return; }
  if (info.taskId) { if (findTask(info.taskId)) openFiche(ctx(), info.taskId); return; }
  if (info.sector) openQuartierSheet(info.sector);
}
// La fiche ouverte par un toucher sur la carte se ferme : l'objet n'est plus sélectionné (le toucher suivant la rouvre)
$('#dlg-fiche').addEventListener('close', () => { if (world) world.clearSelection(); });
$('#dlg-batiment').addEventListener('close', () => { if (world) world.clearSelection(); });
$('#dlg-quartier').addEventListener('close', () => { if (world) world.clearSelection(); });
/** Fiche d'un bâtiment (carte, ou carte en liste) : trois lignes et le geste possible, avec le dessin de la carte. */
function openBatimentSheet(id) {
  openBatiment(ctx(), id, { thumb: world ? (bid) => world.thumb(bid) : null, open: openSheet });
}
/** Fiche d'un quartier (carte, catalogue, carte en liste) : ce qu'il fait, le niveau suivant et son prix. */
function openQuartierSheet(id) {
  if (store.view) openQuartier(ctx(), id, { open: openSheet });
}

/** Fin de visite : « Tout est enregistré, à demain ». Fermée, elle laisse le monde allumer ses lanternes. */
function endVisit() {
  if (!started || document.querySelector('dialog[open]')) return;
  const c = ctx();
  const next = topCards(c.tasks, c.now).first;
  const reply = pickReply('visit.end', { now: c.now, quartier: 'place', length: 0, vars: replyVars(null, 'place') }, { gate: false });
  const sync = store.sync || {};
  openVeille({
    next, reply,
    saved: (sync.state === 'idle' || sync.state === 'saved') && !sync.pending,
    onClose: () => { if (world) world.play([{ type: 'veille' }]); },
  });
}
function openPlan() {
  if (!worldPlan) return;
  const c = ctx();
  worldPlan.render(c.game, c.tasks, c.ledger);
  openSheet($('#dlg-plan'));
  worldPlan.focus();
}
/** Catalogue « Construire » (bouton de la carte) : bâtir se fait sur le premier emplacement libre du type choisi. */
function openConstruire() {
  if (!world || !store.view) return;
  const c = ctx();
  openCatalogue(c, { slots: () => world.batiments(c.game, c.ledger), thumb: (type) => world.thumbType(type), open: openSheet });
}

// ───────── Clics ─────────
const idOf = (el) => (el.closest('[data-task-id]') || {}).dataset?.taskId || null;
const disabled = (el) => el.getAttribute('aria-disabled') === 'true';

// Gestes qui dépensent (bâtir, monter un niveau, geste d'un bâtiment) : un double toucher ne dépense qu'une fois.
// Moins de 600 ms après l'ouverture de sa feuille, un geste touché au doigt (ou par le second clic d'un double clic)
// est le second toucher de celui qui l'a ouverte (« Construire », une ligne du catalogue, une plaque) : ignoré. Le
// clavier (detail 0) et un simple clic de souris passent. Puis le même geste n'est pas refait dans les 800 ms, et la
// raison d'un bouton déjà mis à jour n'est pas relue.
const SPEND_OPEN_MS = 600;
const SPEND_AGAIN_MS = 800;
let spent = { key: '', at: 0 };
const spendKey = (action, target) => (action === 'bat-geste' ? `${action}:${target.closest('dialog')?.dataset.batId}` : action);
function spendBlocked(e, target, action) {
  const dlg = target.closest('dialog');
  const ghost = e.detail > 0 && (e.pointerType !== 'mouse' || e.detail > 1);
  if (ghost && dlg && Date.now() - (dlg._openedAt || 0) < SPEND_OPEN_MS) return true;
  return spent.key === spendKey(action, target) && Date.now() - spent.at < SPEND_AGAIN_MS;
}
const markSpent = (action, target) => {
  spent = { key: spendKey(action, target), at: Date.now() };
  const dlg = target.closest('dialog');
  if (dlg) dlg._spentAt = spent.at; // sa feuille peut rapetisser : le second toucher tomberait au fond (sheets.js)
};

document.addEventListener('click', (e) => {
  const target = e.target.closest('button, [data-action], [data-close], input[data-action]');
  if (!target) return;

  if (target.hasAttribute('data-close')) return closeSheet(target.closest('dialog'));
  if (target.matches('.alt-row')) {
    const open = target.getAttribute('aria-expanded') !== 'true';
    target.setAttribute('aria-expanded', String(open));
    target.closest('.alt').classList.toggle('is-open', open);
    return;
  }
  if (target.matches('.chip[aria-pressed]')) {
    const on = target.getAttribute('aria-pressed') !== 'true';
    if (target.dataset.quartier) {
      $$('.chip[data-quartier]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      ui.quartier = on ? target.dataset.quartier : null;
    } else {
      ui[target.dataset.filter] = on;
    }
    target.setAttribute('aria-pressed', String(on));
    return renderAll();
  }
  if (target.dataset.step) return handleStep(target);

  const action = target.dataset.action;
  const id = idOf(target);
  const task = findTask(id);

  if (disabled(target) && ['complete', 'split', 'archive', 'unarchive', 'delete', 'reopen', 'remballer'].includes(action)) {
    if (task && task.readonly) notice({ kind: 'info', text: t('readonly.reason') });
    return;
  }

  switch (action) {
    case 'toggle-panel': return setPanel(app.dataset.panel !== 'open');
    case 'bandeau-toggle': return bandeau.toggle();
    case 'bandeau-go': return goToday();
    case 'visiteur-go': {
      bandeau.toggle(false);
      // en compact, la carte repliée cache la ligne touchée : la fiche rendra le focus au bouton qui la déplie
      if (target.checkVisibility?.() === false) $('.bandeau-more')?.focus();
      const quai = store.view && batimentsDuVillage(store.view.game).find((b) => b.type === 'quai');
      return quai && openBatimentSheet(quai.id);
    }
    case 'preparer': {
      // « Rentrer du bois » (bandeau, tempête annoncée) : un cran payé une fois, même touché deux fois
      if (spendBlocked(e, target, action)) return;
      if (disabled(target)) {
        const raison = $('#bandeau-alerte-raison').textContent.trim();
        notice({ kind: 'info', text: raison });
        return announce.say(raison);
      }
      let params = {};
      try { params = JSON.parse(target.dataset.params || '{}'); } catch { return; }
      markSpent(action, target);
      return run('preparer', params);
    }
    case 'tempete-voir': {
      // le bâtiment sous la neige : sa fiche (« Déneiger », la quête Terrain, la fonte)
      bandeau.toggle(false);
      let params = {};
      try { params = JSON.parse(target.dataset.params || '{}'); } catch { return; }
      return params.id && openBatimentSheet(params.id);
    }
    case 'accueil-suivant': return story.accueilSuivant();
    case 'add': return openAdd(queteDefaut(store.view?.game));
    case 'res-help': return openHelp(target.dataset.res);
    case 'why': return openWhy(ctx(), id);
    case 'open': return openFiche(ctx(), id);
    case 'complete': {
      const r = target.getBoundingClientRect();
      touchFrom = { x: r.left + r.width / 2, y: r.top + r.height / 2, at: Date.now() };
      return run('completeQuest', { id });
    }
    case 'open-settings': return story.openSettings();
    case 'open-review': return story.openReview();
    case 'review-keep': case 'review-archive': return story.reviewAction(action, target.dataset.id);
    case 'split':
      openFiche(ctx(), id);
      return $('#fiche-step-new').focus();
    case 'reopen': return run('reopenQuest', { id });
    case 'archive': case 'unarchive': {
      const inFiche = !!target.closest('#dlg-fiche'); // avant l'action : le rendu remplace les boutons de la fiche
      const r = run(action === 'archive' ? 'archiveQuest' : 'unarchiveQuest', { id });
      if (r && inFiche) closeSheet($('#dlg-fiche'));
      return;
    }
    case 'remballer':
      return confirmRemballer().then((ok) => { if (ok) run('remballerQuest', { id }); });
    case 'delete':
      if (!task) return;
      return confirmDelete(ctx(), task).then((ok) => {
        if (!ok) return;
        if (run('deleteQuest', { id })) closeSheet($('#dlg-fiche'));
      });
    case 'step-toggle': {
      const stepId = target.closest('.step').dataset.stepId;
      if (!run('toggleStep', { id, stepId, done: target.checked })) target.checked = !target.checked;
      return;
    }
    case 'step-remove': return run('removeStep', { id, stepId: target.closest('.step').dataset.stepId });
    case 'step-add': return addStepFromInput(id);
    case 'search-clear': {
      const input = $('#search');
      input.value = ''; ui.search = ''; target.hidden = true; input.focus();
      return renderAll();
    }
    case 'clear-filters':
      Object.assign(ui, { quick: false, lowEnergy: false, thisWeek: false, quartier: null, search: '' });
      $$('.chips .chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      $('#search').value = ''; $('.search-clear').hidden = true;
      return renderAll();
    case 'sync-retry': return store.retryNow();
    case 'notice-close': return sync.closeNotice();
    case 'reload': return start();
    case 'jour-suivant': return jourSuivant();
    case 'cat-construire': {
      // un double toucher ne bâtit pas deux fois, et ne lit pas le refus de la ligne déjà mise à jour
      if (spendBlocked(e, target, action)) return;
      if (disabled(target)) return announce.say($(`#cat-${target.dataset.type}-etat`).textContent.trim());
      markSpent(action, target);
      const bid = target.dataset.id;
      if (!run('construire', { type: target.dataset.type, id: bid })) return;
      closeSheet($('#dlg-construire'));
      return world && world.focusEntity(bid); // la carte montre le bâtiment neuf (mouvement réduit respecté)
    }
    case 'qrt-ouvrir': return openQuartierSheet(target.dataset.quartier);
    case 'qrt-monter': {
      if (spendBlocked(e, target, action)) return;
      // achat impossible : la raison est écrite dans la fiche ; on la redit au lecteur d'écran
      if (disabled(target)) return announce.say(($('#qrt-raison') || target).textContent.trim());
      markSpent(action, target);
      const r = run('monterQuartier', { quartier: target.dataset.quartier, niveau: Number(target.dataset.niveau) });
      const monte = r && r.events.find((x) => x.type === 'quartier-monte');
      return monte && showMonte(ctx(), monte); // la réussite se voit dans la fiche, pas seulement sur la carte derrière
    }
    case 'qrt-quetes': {
      // le panneau s'ouvre derrière : toutes les feuilles se ferment (fiche, catalogue, carte en liste)
      const sheets = $$('dialog.sheet[open]');
      for (const d of sheets) closeSheet(d);
      filterByQuartier(target.dataset.quartier);
      // chaque feuille rend le focus en se fermant (événement close, après l'animation) : la dernière l'envoie à la liste
      const toList = () => { if (!document.querySelector('dialog.sheet[open]')) focusQuestList(); };
      for (const d of sheets) d.addEventListener('close', toList, { once: true });
      if (!sheets.length) focusQuestList();
      return;
    }
    case 'bat-geste': {
      if (spendBlocked(e, target, action)) return;
      // geste impossible : la raison est écrite dans la fiche ; on la redit au lecteur d'écran
      if (disabled(target)) return announce.say(($(`#${target.getAttribute('aria-describedby')}`) || target).textContent.trim());
      let params = {};
      try { params = JSON.parse(target.dataset.params || '{}'); } catch { return; }
      markSpent(action, target);
      return run(target.dataset.geste, params);
    }
  }
});

// Le marchand est au quai : Fanal l'annonce une fois par semaine sur cet appareil, à la première visite de sa semaine
// (après la lettre et le bilan), ou en le voyant accoster quand le quai vient d'être rebâti (situation de « construire »).
const VISITE_KEY = 'oree.visite.v1';
function noterVisite(game, now) {
  const v = visiteurDeLaSemaine(game, now);
  if (v) try { localStorage.setItem(VISITE_KEY, v.semaine); } catch { /* sans stockage : pas d'annonce répétée */ }
}
const visiteVue = (semaine) => { try { return localStorage.getItem(VISITE_KEY) === semaine; } catch { return true; } };
function annonceVisiteur() {
  if (!started || !store.view) return;
  const c = ctx();
  const v = visiteurDeLaSemaine(c.game, c.now);
  if (!v || visiteVue(v.semaine)) return;
  if (!$('#speech').hidden) { setTimeout(annonceVisiteur, 7500); return; } // Fanal finit d'abord sa phrase en cours
  noterVisite(c.game, c.now);
  const reply = pickReply('marchand.arrive', { now: c.now, quartier: 'place', length: 0, vars: replyVars(null, 'place') });
  if (!reply) return;
  speech.showText(reply.nom, reply.texte);
  announce.say(`${reply.nom}\u00a0: ${reply.texte}`);
}

// Un imprévu du jour (lot I) : Fanal le raconte une fois sur cet appareil, à l'ouverture où il arrive, après l'accueil, la
// lettre, le bilan et le mot du marchand (il attend que la bulle en cours se ferme). Une seule réplique par ouverture : le
// dernier imprévu inscrit aujourd'hui (le mauvais, quand un bon manqué arrive le même jour).
const IMPREVU_KEY = 'oree.imprevu.v1';
const imprevuVu = (key) => { try { return localStorage.getItem(IMPREVU_KEY) === key; } catch { return true; } };
function annonceImprevu() {
  if (!started || !store.view) return;
  const c = ctx();
  const today = gameDay(c.now);
  const e = c.ledger.findLast((x) => x && x.type === 'imprevu' && x.day === today && typeof x.imprevu === 'string');
  if (!e || imprevuVu(e.key)) return;
  if (!$('#speech').hidden || document.querySelector('dialog[open]')) { setTimeout(annonceImprevu, 7500); return; }
  try { localStorage.setItem(IMPREVU_KEY, e.key); } catch { /* sans stockage : pas d'annonce répétée */ }
  const reply = pickReply(`imprevu.${e.imprevu}`, { now: c.now, quartier: 'place', length: 0, vars: replyVars(null, 'place') });
  if (!reply) return;
  speech.showText(reply.nom, reply.texte);
  announce.say(remember(after(`${reply.nom}\u00a0: ${reply.texte}`))); // la phrase d'un geste ou du passage du temps juste lue est gardée, et « Jour suivant » s'ajoute
}

// L'allure du village (lot A) : la semaine où elle change d'un cran, Fanal le dit une fois sur cet appareil, à l'ouverture
// (après l'accueil, la lettre et le bilan, et après une réplique en cours). oree.allure.v1 = lundi de la semaine dite.
const ALLURE_KEY = 'oree.allure.v1';
const allureDite = (semaine) => { try { return localStorage.getItem(ALLURE_KEY) === semaine; } catch { return true; } };
function annonceAllure() {
  if (!started || !store.view) return;
  const c = ctx();
  const a = allureDe(c.game, c.ledger, gameDay(c.now));
  if (!a.change || allureDite(a.semaine)) return;
  if (!$('#speech').hidden || document.querySelector('dialog[open]')) { setTimeout(annonceAllure, 7500); return; }
  try { localStorage.setItem(ALLURE_KEY, a.semaine); } catch { /* sans stockage : pas d'annonce répétée */ }
  const reply = pickReply(a.change < 0 ? 'allure.ralentit' : 'allure.elan', { now: c.now, quartier: 'place', length: 0, vars: replyVars(null, 'place') });
  if (!reply) return;
  speech.showText(reply.nom, reply.texte);
  announce.say(remember(after(`${reply.nom}\u00a0: ${reply.texte}`)));
}

// Une tempête (lot H) : Fanal l'annonce une fois par appareil (avec, pour le lecteur d'écran, la barre et son prix), en
// reparle la veille si la barre n'est pas pleine, et raconte son issue le jour même (tenue, ou un bâtiment sous la neige ;
// rien pour une tempête passée sans dégât). Même moment que l'imprévu, après lui. Étape dite gardée sur l'appareil :
// oree.tempete.v1 = « jour:étape » (1 annonce, 2 veille, 3 issue) ; un rechargement ne la répète pas.
const TEMPETE_KEY = 'oree.tempete.v1';
function etapeDite(jour) {
  try {
    const [j, n] = String(localStorage.getItem(TEMPETE_KEY) || '').split(':');
    return j === jour ? Number(n) || 0 : 0;
  } catch { return 3; } // sans stockage : pas d'annonce répétée
}
function annonceTempete() {
  if (!started || !store.view) return;
  const c = ctx();
  const a = alerteTempete(c.tasks, c.game, c.ledger, c.now);
  if (!a) return;
  const dite = etapeDite(a.jour);
  let etape = 0, sit = null, sr = '';
  if (a.joursRestants === 0) {
    const e = findEntry(c.ledger, `tempete:${a.jour}`);
    if (!e || dite >= 3) return;
    etape = 3;
    sit = e.resultat === 'tenue' ? 'tempete.tenue' : e.resultat === 'neige' ? 'tempete.neige' : null;
  } else if (!dite) {
    etape = a.joursRestants === 1 ? 2 : 1;
    sit = 'tempete.annonce';
    sr = t(`sr.tempete.annonce.${a.joursRestants === 1 ? 'one' : 'other'}`, { n: a.joursRestants, max: a.max, cout: coutText(a.prix) });
  } else if (a.joursRestants === 1 && dite < 2) {
    etape = 2;
    sit = a.crans < a.max ? 'tempete.veille' : null;
  } else return;
  if (sit && (!$('#speech').hidden || document.querySelector('dialog[open]'))) { setTimeout(annonceTempete, 7500); return; }
  try { localStorage.setItem(TEMPETE_KEY, `${a.jour}:${etape}`); } catch { /* sans stockage : pas d'annonce répétée */ }
  const reply = sit && pickReply(sit, { now: c.now, quartier: 'place', length: 0, vars: replyVars(null, 'place') });
  if (reply) speech.showText(reply.nom, reply.texte);
  const text = [reply ? `${reply.nom}\u00a0: ${reply.texte}` : '', sr].filter(Boolean).join(' ');
  if (text) announce.say(remember(after(text)));
}

/** Toucher « Aujourd'hui » dans le bandeau : la fiche où se fait le geste proposé (bâtiment, quête), ou l'ajout. */
function goToday() {
  const a = bandeau.action();
  bandeau.toggle(false);
  if (!a) return;
  if (a.kind === 'pas' && ['construire', 'semer', 'accueillir'].includes(a.geste) && a.cible) return openBatimentSheet(a.cible);
  const id = a.kind === 'quete' ? a.taskId : a.kind === 'pas' && a.geste === 'terminer' ? a.cible : null;
  if (!id || !findTask(id)) return openAdd(queteDefaut(store.view?.game));
  // la quête est au Fil du jour : son « Fait » est là, la carte s'éclaire un instant et « Fait » prend le focus
  const fil = $('#fil-quest:not([hidden])');
  if (fil && fil.dataset.taskId === id) {
    showPanel();
    $('[data-action="complete"]', fil).focus();
    restart(fil, 'is-pointed');
    return;
  }
  return openFiche(ctx(), id);
}

function addStepFromInput(id) {
  const input = $('#fiche-step-new');
  const label = input.value.trim();
  if (!label) return input.focus();
  if (run('addStep', { id, label })) { input.value = ''; input.focus(); }
}

// ───────── Saisie, formulaires ─────────
document.addEventListener('input', (e) => {
  if (e.target.id === 'search') {
    ui.search = e.target.value.trim();
    $('.search-clear').hidden = e.target.value === '';
    renderAll();
  } else if (e.target.id === 'add-title') onAddInput(e.target);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'sort') { ui.sort = e.target.value; renderAll(); }
  else if (e.target.name === 'statut') { ui.status = e.target.value; renderAll(); }
  else if (e.target.name === 'add-sector') onAddSectorChange();
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'add-form') {
    e.preventDefault();
    const params = readAdd();
    if (!params) return;
    if (run('createQuest', params)) closeSheet($('#dlg-add'));
  } else if (e.target.id === 'settings-form') {
    e.preventDefault();
    story.saveSettings(e.target);
  } else if (e.target.id === 'fiche-form') {
    e.preventDefault();
    const r = readFiche(ctx());
    if (r.error) { notice({ kind: 'info', text: r.error }); return; }
    if (!Object.keys(r.patch).length || run('updateQuest', r)) closeSheet($('#dlg-fiche'));
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'fiche-step-new') { e.preventDefault(); addStepFromInput($('#dlg-fiche').dataset.taskId); }
  if (e.key === 'Escape' && e.defaultPrevented) return; // déjà traitée (rangée « Vue » de la carte, animation…)
  if (e.key === 'Escape' && $('#bandeau').dataset.open === 'true' && !document.querySelector('dialog[open]')) {
    bandeau.toggle(false);
    $('.bandeau-more').focus();
    return;
  }
  if (e.key === 'Escape' && app.dataset.panel === 'open' && !document.querySelector('dialog[open]')) {
    setPanel(false);
    $('[data-action="toggle-panel"]').focus();
  }
});

// ───────── Démarrage ─────────
function fillSortOptions() {
  const sel = $('#sort');
  if (sel.options.length) return;
  for (const s of SORTS) sel.add(new Option(t('sort.' + s.id) === 'sort.' + s.id ? s.label : t('sort.' + s.id), s.id));
  sel.value = ui.sort;
}

function showLoadError(text) {
  $('#fil-skeleton').hidden = true;
  $('#load-error').hidden = false;
  setText($('#load-error-text'), text);
}

async function start() {
  $('#load-error').hidden = true;
  $('#fil-skeleton').hidden = false;
  try {
    await loadContent();
  } catch {
    return showLoadError(t('load.fail.text'));
  }
  fillSortOptions();
  for (const el of $$('[data-t]')) setText(el, t(el.dataset.t)); // libellés posés dans la page, textes dans interface.json
  await inlineSprite();
  try {
    await store.load();
  } catch (err) {
    if (err.status === 401) return store.emit('need-token', {});
    if (err.status === 429) return store.emit('need-token', { locked: store.lockLeft() });
    return showLoadError(t('load.fail.text'));
  }
  renderAll();
  started = true;
  // ouverture du jour, puis le temps du jeu ; l'accueil vient quand le monde est prêt
  run('openApp', {});
  advanceTime();
  playedDay = gameDay(maintenant());
  initWorld({
    container: $('#world-live'), slot: $('.world-slot'), content,
    now: maintenant, reducedMotion,
    announce: createVoice($('#live-world')),
    onImpact: () => { if (hudPending) flushHud(); },
    onSelect: onWorldSelect,
    panelId: 'panel',
    controls: {
      build: openConstruire,
      quests: () => setPanel(app.dataset.panel === 'cache' ? 'peek' : 'cache'),
      plan: openPlan,
    },
  }).then((w) => {
    world = w;
    setTimeout(() => story.welcome(), world ? 400 : 0);
    if (!world) return;
    world.render(store.view.game, store.view.tasks, store.view.ledger);
    const host = $('#dlg-plan');
    host.innerHTML = `<header class="sheet-head"><span></span><button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('plan.close'))}"><svg class="icon" aria-hidden="true"><use href="${document.querySelector('.res-tile use').getAttribute('href').split('#')[0]}#i-x"/></svg></button></header><div class="sheet-body" id="plan-host"></div>`;
    worldPlan = world.plan($('#plan-host'), {
      onFocusSector: (id) => { closeSheet(host); if (app.dataset.panel === 'open') setPanel(false); world.focusSector(id); },
      onQuartier: (id) => openQuartierSheet(id),
      onBatiment: (id) => openBatimentSheet(id),
    });
    host.setAttribute('aria-labelledby', $('#plan-host .ow-plan-title').id);
  });
}

/** Changement de jour de jeu (4 h, Montréal) : ouverture du jour, temps du jeu, accueil (lettre, bilan). */
let playedDay = null;
function tickDay() {
  if (!started || !store.view) return;
  const day = gameDay(maintenant());
  if (day !== playedDay) {
    playedDay = day;
    run('openApp', {});
    advanceTime();
    story.welcome();
  }
}

// relecture régulière (30 s, page visible) et au retour sur la page
setInterval(() => { if (started && document.visibilityState === 'visible') store.refresh(); }, POLL_MS);
// le jour de jeu ne passe que page visible : un onglet caché pendant une absence ne fait pas passer le temps (lot I : pas de
// mauvais imprévu ni de reprise effacée sans que le joueur soit là) ; au retour, visibilitychange s'en charge
setInterval(() => { if (started) { if (document.visibilityState === 'visible') tickDay(); renderAll(); } }, 60000); // durées « En cours depuis… », jour de jeu
document.addEventListener('visibilitychange', () => {
  if (!started || document.visibilityState !== 'visible') return;
  store.refresh({ force: true });
  if (gameDay(maintenant()) !== playedDay) tickDay();
  else {
    const ev = advanceTime()?.events || []; // idempotente : ne fait rien si rien n'a bougé
    if (ev.some((e) => e.type === 'imprevu')) annonceImprevu();
    if (ev.some((e) => e.type === 'tempete')) annonceTempete();
  }
});

// Installation sur l'écran d'accueil : le service worker garde la coquille pour un lancement hors ligne
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* sans cache hors ligne */ }); });
}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { if (world) world.setReducedMotion(reducedMotion()); });
wireDialogs();
start();
