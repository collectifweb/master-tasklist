// Visiteurs du quai (bible §7, lot V). Le premier est le marchand (décisions d'Alex du 6 octobre) : une fois le quai
// rebâti, il est là chaque semaine, du lundi au dimanche (semaine de jeu, celle de la semaine tenue), même si le quai
// est rebâti en milieu de semaine. Le visiteur se déduit de la date et du quai : rien n'est enregistré pour qu'il
// vienne, et tous les appareils voient le même, même hors ligne.
// Quatre offres fixes, chacune prise une fois par visite. Un échange ne fait que convertir ce qui a déjà été gagné :
// un game.set, rien dans les tâches. Comme après construire, les objectifs sont suivis : de la Nourriture reçue qui
// remplit le grenier valide l'objectif d'automne (une ligne au registre et son permis, une fois par saison) ; c'est la
// seule écriture au registre possible. La partie garde les offres prises de la semaine dans
// game.visite = { semaine: lundi, prises: [id] } ; une visite d'une autre semaine ne compte plus.
// Aucun aller-retour ne rapporte (un test le vérifie), et le marchand ne vend aucun permis.
// L'échange du jour (lot T, 8 octobre 2026) : il rachète aussi, une fois par jour, des Matériaux en trop (ECHANGE_DU_JOUR).
// Les visiteurs à commande (lot C, décisions d'Alex du 7 octobre 2026 au soir) : le marchand reste chaque semaine et, à
// côté, un visiteur à commande accoste du lundi au dimanche, chacun son tour (convoi, famille du Sud, scientifique). Il
// demande quelques ressources et laisse quelque chose d'unique : des Matériaux, une famille qui s'installe, ou 1 permis
// (jamais plus d'un). Une seule livraison par semaine, notée au registre sous commande:{lundi} (clé unique : deux appareils
// ne livrent jamais deux fois). Ne pas livrer ne fait rien perdre. La taille suit l'allure de la semaine (allure.js), et
// passe au ralenti quand une reprise commence dans la semaine (retour d'une absence, game.reprise) ; la récompense, elle,
// ne change jamais.
// Même forme que quests.js : (tasks, game, ledger, params, now) → { tasks, game, ops, entries, events }.
import { Ctx } from './quests.js';
import { gameDay, weekStart, weekEnd, daysBetween, isDayString } from './time.js';
import { round1 } from './reward.js';
import { hasKey } from './ledger.js';
import { compte, manque, stockage, entierBas, entierHaut, logements, installerFamille } from './batiments.js';
import { suivreObjectifs } from './objectifs.js';
import { allureDe } from './allure.js';

/**
 * Le marchand et ses offres, dans l'ordre d'affichage. donne : ce que le joueur cède ; recoit : ce qu'il obtient
 * (une ressource de chaque côté : energy, materials ou food). Règle simple : il vend ses Matériaux et sa Nourriture
 * 2 Énergie pièce et les rachète 1 Énergie pièce ; un aller-retour rend la moitié. Valeurs de départ, mesurées dans
 * tests/core/simulation.test.mjs, joueur (h) « avisé » qui n'échange que ce qui est en trop (le 6 octobre) : au rythme
 * de l'essai, autant de niveaux en 16 semaines et le village plein vers la fin décembre au lieu d'après la 16e semaine
 * (départs d'octobre) ; au rythme régulier, un niveau de plus. Le joueur avisé prend surtout Matériaux → Énergie et
 * Énergie → Nourriture : aux prix du lot R2, l'Énergie limite les niveaux du joueur régulier.
 */
export const MARCHAND = {
  id: 'marchand',
  offres: [
    { id: 'energie-materiaux', donne: { energy: 30 }, recoit: { materials: 15 } },
    { id: 'energie-nourriture', donne: { energy: 20 }, recoit: { food: 10 } },
    { id: 'materiaux-energie', donne: { materials: 15 }, recoit: { energy: 15 } },
    { id: 'nourriture-energie', donne: { food: 10 }, recoit: { energy: 10 } },
  ],
};

/**
 * L'échange du jour (lot T, décisions d'Alex du 8 octobre 2026) : en plus de ses quatre offres de la semaine, le marchand
 * rachète chaque jour de jeu 20 Matériaux contre 10 Énergie, moins bien que son offre de la semaine. Il laisse toujours
 * `garde` Matériaux au village : mesuré dans tests/core/simulation.test.mjs, joueur (m), un joueur qui échange chaque soir
 * sans compter perd des niveaux ou remplit son village plus tard en dessous de 150 ; à 150, personne ne recule. Le jour de
 * l'échange est noté dans game.echangeDuJour, pas dans game.visite, qu'un onglet d'avant le lot T réécrit en entier à
 * chaque échange de la semaine.
 */
export const ECHANGE_DU_JOUR = { id: 'materiaux-energie-jour', donne: { materials: 20 }, recoit: { energy: 10 }, garde: { materials: 150 } };

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const offreDe = (id) => (typeof id === 'string' ? MARCHAND.offres.find((o) => o.id === id) ?? null : null);
// Jour du dernier échange du jour (une marque abîmée n'en est pas une).
const jourEchange = (game) => (isDayString(game.echangeDuJour) ? game.echangeDuJour : null);

// Offres déjà prises pendant la visite de la semaine de `lundi` (une visite d'une autre semaine, ou abîmée, n'en a aucune).
function prisesDe(game, lundi) {
  const v = game.visite;
  if (!isObj(v) || v.semaine !== lundi || !Array.isArray(v.prises)) return [];
  return v.prises.filter((id) => offreDe(id));
}

/**
 * Le visiteur de la semaine, ou null sans quai : { id, semaine (lundi), depart (dimanche), joursRestants (aujourd'hui
 * compris : 7 le lundi, 1 le dimanche), offres: [{ id, donne, recoit, prise }], duJour: { id, donne, recoit, garde,
 * prise } (l'échange du jour, pris aujourd'hui ou non) }. Lecture pure.
 */
export function visiteurDeLaSemaine(game, now) {
  if (!compte(game, 'quai')) return null;
  const day = gameDay(now);
  const semaine = weekStart(day);
  const depart = weekEnd(day);
  const prises = prisesDe(game, semaine);
  return {
    id: MARCHAND.id, semaine, depart, joursRestants: daysBetween(day, depart) + 1,
    offres: MARCHAND.offres.map((o) => ({ ...o, prise: prises.includes(o.id) })),
    duJour: { ...ECHANGE_DU_JOUR, prise: jourEchange(game) === day },
  };
}

/**
 * Pourquoi on ne peut pas prendre cette offre maintenant (ou null). Ordre : quai, semaine passée, offre, déjà prise,
 * manque, réserve. Semaine passée : un échange fait hors ligne la semaine d'avant, rejoué après qu'un autre appareil a
 * déjà échangé cette semaine, effacerait la visite de la semaine (game.visite n'en garde qu'une).
 * L'échange du jour a son ordre : quai, jour passé (même raison, avec game.echangeDuJour), déjà fait aujourd'hui, manque
 * (les Matériaux laissés au village compris).
 */
export function refusEchanger(game, params, now) {
  const v = visiteurDeLaSemaine(game, now);
  if (!v) return 'Il faut d’abord rebâtir le quai.';
  if (params?.offre === ECHANGE_DU_JOUR.id) {
    const fait = jourEchange(game);
    const day = gameDay(now);
    if (fait && fait > day) return 'Le marchand a déjà racheté depuis\u00a0: cet échange date d’un jour passé.';
    if (fait === day) return 'Déjà fait aujourd’hui\u00a0: le marchand rachète de nouveau demain.';
    const { donne, garde } = ECHANGE_DU_JOUR;
    const m = manque(game, { materials: donne.materials + garde.materials });
    return m ? `${m} Le marchand en laisse toujours ${garde.materials} au village pour les chantiers.` : null;
  }
  if (isObj(game.visite) && typeof game.visite.semaine === 'string' && game.visite.semaine > v.semaine) return 'Le marchand est reparti : cet échange date d’une semaine passée.';
  const o = offreDe(params?.offre);
  if (!o) return 'Offre inconnue.';
  if (v.offres.find((x) => x.id === o.id).prise) return 'Déjà fait cette semaine : le marchand revient lundi.';
  if (o.donne.food) {
    const m = round1(o.donne.food - game.resources.food);
    if (m > 0) return `Il manque ${entierHaut(m)} Nourriture.`;
  } else {
    const m = manque(game, o.donne);
    if (m) return m;
  }
  if (o.recoit.food) {
    const max = stockage(game);
    const stock = `${entierBas(game.resources.food)} sur ${max}`;
    const place = round1(max - game.resources.food);
    if (place <= 0) return `La réserve est pleine (${stock}).`;
    if (place < 1) return `La réserve est presque pleine (${stock}).`;
    if (place < o.recoit.food) return `La réserve n’a de place que pour ${entierBas(place)} Nourriture (${stock}).`;
  }
  return null;
}

/**
 * Prend une offre du visiteur, ou l'échange du jour. params : { offre }. Événement { type: 'echange', visiteur, offre,
 * donne, recoit }. Une offre de la semaine est notée dans game.visite, l'échange du jour dans game.echangeDuJour.
 */
export function echanger(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusEchanger(ctx.game, params, now);
  if (refus) throw new Error(refus);
  const duJour = params.offre === ECHANGE_DU_JOUR.id;
  const o = duJour ? ECHANGE_DU_JOUR : offreDe(params.offre);
  const semaine = weekStart(ctx.day);
  const g = structuredClone(ctx.game);
  for (const [k, n] of Object.entries(o.donne)) g.resources[k] = round1(g.resources[k] - n);
  for (const [k, n] of Object.entries(o.recoit)) g.resources[k] = round1(g.resources[k] + n);
  if (duJour) g.echangeDuJour = ctx.day;
  else g.visite = { semaine, prises: [...prisesDe(g, semaine), o.id] };
  ctx.game = g;
  ctx.events.push({ type: 'echange', visiteur: MARCHAND.id, offre: o.id, donne: { ...o.donne }, recoit: { ...o.recoit } });
  suivreObjectifs(ctx); // de la Nourriture reçue peut remplir le grenier de l'objectif d'automne
  return ctx.result();
}

// ───────── Visiteurs à commande (lot C) ─────────

/**
 * Les visiteurs à commande, dans l'ordre du tour. demande : ce qu'il faut livrer à la taille « régulier » ; recoit : ce
 * qu'il laisse (une seule chose : materials, habitants ou permis, jamais plus d'un permis). Valeurs de départ, réglées par
 * la simulation (tests/core/simulation.test.mjs, joueur (l), 7 octobre 2026 au soir) : l'Énergie est ce qui manque le plus
 * souvent pour monter un quartier (sauf chez le joueur très lent, plus souvent à court de Matériaux). Une première série qui
 * demandait de l'Énergie (convoi 15 Énergie et 10 Nourriture, scientifique 30 Énergie et 15 Matériaux) faisait acheter
 * moins de niveaux à qui livrait tout : de 0 à 3 de moins au 1er mars selon le joueur et le départ, 8 au lieu de 11 au
 * rythme de l'essai parti l'été. Les commandes ne demandent donc que des Matériaux et de la Nourriture (celle qui se perd quand la réserve est
 * pleine) : livrer tout ne coûte au plus qu'un niveau au joueur très lent, aucun aux autres.
 */
export const VISITEURS = {
  convoi: { demande: { food: 12 }, recoit: { materials: 30 } },
  famille: { demande: { materials: 15, food: 6 }, recoit: { habitants: 1 } },
  scientifique: { demande: { materials: 20, food: 8 }, recoit: { permis: 1 } },
};
export const ORDRE_VISITEURS = Object.keys(VISITEURS);
/** Taille de la commande selon l'allure de la semaine : la demande est multipliée, arrondie au-dessus ; la récompense ne bouge pas. */
export const TAILLES = { ralenti: 0.5, regulier: 1, plein: 1.5 };
// Un lundi de référence : la semaine du convoi. Le tour se lit d'après la date seule, le même sur tous les appareils.
const REPERE = '2026-10-05';
const commandeKey = (lundi) => `commande:${lundi}`;
const visiteurDe = (lundi) => ORDRE_VISITEURS[((Math.round(daysBetween(REPERE, lundi) / 7) % 3) + 3) % 3];
const mesure = (demande, f) => Object.fromEntries(Object.entries(demande).map(([k, n]) => [k, Math.ceil(n * f)]));

// Taille de la commande ce jour-là : celle de l'allure de la semaine, ou « au ralenti » quand une reprise a commencé dans la
// semaine, au plus tard ce jour-là (la commande en cours au retour d'une absence ; allegee le dit).
function tailleDe(game, ledger, day) {
  const r = game.reprise;
  const allegee = !!(isObj(r) && isDayString(r.du) && r.du >= weekStart(day) && r.du <= day);
  return { taille: allegee ? 'ralenti' : allureDe(game, ledger, day).niveau, allegee };
}

/**
 * Le visiteur à commande de la semaine, ou null sans quai : { id, semaine (lundi), depart (dimanche), joursRestants
 * (aujourd'hui compris), taille ('ralenti' | 'regulier' | 'plein'), allegee (ramenée au ralenti par un retour d'absence),
 * demande, recoit, livree }. Lecture pure de la date, du quai, de l'allure et du registre.
 */
export function commandeDeLaSemaine(game, ledger, now) {
  if (!compte(game, 'quai')) return null;
  const day = gameDay(now);
  const semaine = weekStart(day);
  const depart = weekEnd(day);
  const id = visiteurDe(semaine);
  const { taille, allegee } = tailleDe(game, Array.isArray(ledger) ? ledger : [], day);
  return {
    id, semaine, depart, joursRestants: daysBetween(day, depart) + 1, taille, allegee,
    demande: mesure(VISITEURS[id].demande, TAILLES[taille]), recoit: { ...VISITEURS[id].recoit },
    livree: hasKey(Array.isArray(ledger) ? ledger : [], commandeKey(semaine)),
  };
}

/**
 * Pourquoi on ne peut pas livrer la commande maintenant (ou null). Ordre : quai, semaine changée, déjà livrée, place pour
 * la famille, manque. params.semaine (facultatif) : le lundi de la commande que le joueur a vue ; une fiche restée ouverte
 * au passage du lundi (4 h) ne livre pas la commande d'un autre visiteur, à un autre prix.
 */
export function refusLivrer(game, ledger, params, now) {
  const c = commandeDeLaSemaine(game, ledger, now);
  if (!c) return 'Il faut d’abord rebâtir le quai.';
  if (params?.semaine && params.semaine !== c.semaine) return 'La semaine a changé\u00a0: un autre visiteur attend au quai.';
  if (c.livree) return 'Commande déjà livrée cette semaine.';
  if (c.recoit.habitants) {
    const l = logements(game);
    if (!l.places) return 'Il faut d’abord un chalet.';
    if (!l.libres) return 'Aucune place libre dans un chalet\u00a0: la famille ne peut pas s’installer.';
  }
  return manque(game, c.demande);
}

/**
 * Livre la commande du visiteur de la semaine. params : { semaine } (le lundi de la commande vue) ou {}. La commande est payée (game.set) ; l'entrée commande:{lundi}
 * porte la taille et le gain (Matériaux du convoi, permis de la scientifique) ; la famille du Sud s'installe comme une
 * famille accueillie, sans la Nourriture d'accueil (un nouveau rang donne son permis, permisDeRang). Rien dans les tâches.
 * Événements { type: 'commande', visiteur, taille, donne, recoit }, puis le gain, le permis ({ type: 'permis', source:
 * 'commande', dispo }) ou la famille ({ type: 'famille', …, par: 'commande' }).
 */
export function livrer(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusLivrer(ctx.game, ctx.ledger, params, now);
  if (refus) throw new Error(refus);
  const c = commandeDeLaSemaine(ctx.game, ctx.ledger, now);
  const g = structuredClone(ctx.game);
  for (const [k, n] of Object.entries(c.demande)) g.resources[k] = round1(g.resources[k] - n);
  ctx.game = g;
  ctx.events.push({ type: 'commande', visiteur: c.id, taille: c.taille, donne: { ...c.demande }, recoit: { ...c.recoit } });
  ctx.append({
    key: commandeKey(c.semaine), at: ctx.iso, day: ctx.day, type: 'commande', visiteur: c.id, taille: c.taille, semaine: c.semaine,
    pe: 0, energy: 0, materials: c.recoit.materials || 0, ...(c.recoit.permis ? { permis: c.recoit.permis } : {}),
  }, 'commande', { visiteur: c.id });
  if (c.recoit.permis) ctx.events.push({ type: 'permis', source: 'commande', dispo: ctx.game.permis.dispo });
  if (c.recoit.habitants) installerFamille(ctx, 0, { par: 'commande' });
  suivreObjectifs(ctx); // de la Nourriture livrée ne valide rien, mais une famille compte pour les premiers pas
  return ctx.result();
}
