// La vraie météo (bible §8 et décision 46, lot Q, plan validé par Alex le 11 octobre 2026).
// La ville du joueur est dans les réglages de la partie (game.reglages.ville), donc la même sur tous les appareils. Le
// serveur lit la prévision d'Open-Meteo une fois par jour et l'envoie avec la partie (`meteo` : { lat, lon, lue, jours :
// { AAAA-MM-JJ: cm de neige } }) ; l'interface la passe au passage du temps (params.meteo) : le cœur ne lit rien lui-même.
// Au passage du temps, de demain jusqu'au dernier jour d'annonce (3 jours, 6 avec la tour de guet), le premier jour où la
// prévision donne au moins METEO.seuil cm de neige devient une tempête, notée dans la partie (game.tempetes.notees) : elle
// ne bouge plus, même si la prévision change ou que la neige ne tombe pas. Toute l'année (réponse d'Alex du 11 octobre),
// ni pendant la trêve des Fêtes ni annoncée pendant elle, à 7 jours au moins de toute autre tempête. Prévision absente,
// plus vieille que METEO.vieille jours de jeu ou d'une autre ville : les jours du tirage (hiver.js) sont notés à la place.
// Sans ville, rien n'est noté : le tirage d'aujourd'hui. Le reste (barre, récompense, neige) ne change pas : hiver.js.
// Cycle d'import avec quests.js et hiver.js : tout est lu à l'appel.
import { Ctx } from './quests.js';
import { gameDay, addDays, daysBetween, isTruce, isDayString } from './time.js';
import { TEMPETE, annonceDe, anneeHiver, tempetesDeLHiver, tempetesNotees, tempeteEnVue } from './hiver.js';

/** seuil : cm de neige prévue qui font une tempête (3 : la ville d'Alex garde le rythme du tirage, mesure du 11 octobre) ;
 * vieille : jours de jeu au-delà desquels une prévision ne sert plus. */
export const METEO = Object.freeze({ seuil: 3, vieille: 2 });

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const texte = (v) => typeof v === 'string' && v.trim() !== '' && v.trim().length <= 100;
const coord = (v, max) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
const centieme = (v) => Math.round(v * 100) / 100;

/** La ville réglée : { nom, region?, pays?, lat, lon }, ou null (aucune, ou illisible). */
export function villeDe(game) {
  const v = isObj(game?.reglages) ? game.reglages.ville : null;
  return isObj(v) && texte(v.nom) && coord(v.lat, 90) && coord(v.lon, 180) ? v : null;
}

// La prévision reçue, si elle sert pour cette ville ce jour-là : { jour: cm }, ou null.
function prevision(meteo, ville, day) {
  if (!isObj(meteo) || !isObj(meteo.jours) || typeof meteo.lue !== 'string') return null;
  if (!coord(meteo.lat, 90) || !coord(meteo.lon, 180)) return null;
  if (centieme(meteo.lat) !== centieme(ville.lat) || centieme(meteo.lon) !== centieme(ville.lon)) return null;
  const lue = new Date(meteo.lue);
  if (Number.isNaN(lue.getTime())) return null;
  const age = daysBetween(gameDay(lue), day);
  if (age > METEO.vieille || age < -1) return null;
  const jours = {};
  for (const [j, cm] of Object.entries(meteo.jours)) if (isDayString(j) && typeof cm === 'number' && Number.isFinite(cm)) jours[j] = cm;
  return jours;
}

// Ajoute des tempêtes notées, dans l'ordre, en ne gardant que cet hiver et le précédent.
function noter(game, day, ajouts) {
  const garder = tempetesNotees(game).filter((t) => anneeHiver(t.jour) >= anneeHiver(day) - 1);
  const notees = [...garder, ...ajouts].sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
  return { ...game, tempetes: { ...(isObj(game.tempetes) ? game.tempetes : {}), notees } };
}

/**
 * Passage du temps (advanceTime, quests.js), avant que les tempêtes du jour soient réglées : avec une ville, note la
 * tempête qui entre dans l'annonce, s'il y en a une. `ctx.params.meteo` : la prévision reçue du serveur. Idempotente.
 */
export function noterTempetes(ctx) {
  const ville = villeDe(ctx.game);
  if (!ville) return;
  const annonce = annonceDe(ctx.game);
  const fin = addDays(ctx.day, annonce);
  const dans = (j) => j > ctx.day && j <= fin;
  const prev = prevision(ctx.params.meteo, ville, ctx.day);
  const candidats = prev
    ? Object.keys(prev).filter((j) => dans(j) && prev[j] >= METEO.seuil).sort()
    : [...new Set([...tempetesDeLHiver(ctx.day), ...tempetesDeLHiver(fin)])].filter(dans).sort();
  for (const jour of candidats) {
    if (isTruce(jour) || isTruce(addDays(jour, -TEMPETE.annonce))) continue;
    if (tempetesDeLHiver(jour, ctx.game).some((k) => Math.abs(daysBetween(k, jour)) < TEMPETE.ecart[0])) continue;
    // notée moins de jours d'avance que l'annonce (neige vue tard, ou personne n'est passé) : l'annonce part d'aujourd'hui
    const des = daysBetween(ctx.day, jour) < annonce ? { des: ctx.day } : {};
    ctx.game = noter(ctx.game, ctx.day, [{ jour, source: prev ? 'meteo' : 'tirage', ...(prev ? { ville: ville.nom } : {}), ...des }]);
  }
}

/**
 * Règle la ville (feuille des Réglages). params : { ville : { nom, region?, pays?, lat, lon } } (coordonnées arrondies au
 * centième), ou { ville: null } pour la retirer. Un game.set suffit : rien au registre ni aux tâches. Une tempête déjà
 * annoncée reste : en réglant une ville, les tempêtes passées de l'hiver et celle qui est annoncée sont notées (source
 * 'tirage') ; en la retirant, les tempêtes notées restent, et le tirage ne reprend qu'avec les tempêtes dont l'annonce
 * commence à partir d'aujourd'hui (tempetes.tirageDepuis). Sans changement, aucune opération n'est envoyée.
 */
export function reglerVille(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const brute = params?.ville;
  let ville = null;
  if (brute !== null) {
    if (!isObj(brute) || !texte(brute.nom) || !coord(brute.lat, 90) || !coord(brute.lon, 180)) throw new Error('Cette ville est illisible : choisis-la dans la liste.');
    ville = {
      nom: brute.nom.trim(),
      ...(texte(brute.region) ? { region: brute.region.trim() } : {}),
      ...(texte(brute.pays) ? { pays: brute.pays.trim() } : {}),
      lat: centieme(brute.lat),
      lon: centieme(brute.lon),
    };
  }
  const avant = villeDe(ctx.game);
  if (JSON.stringify(avant) === JSON.stringify(ville)) return ctx.result();
  let g = ctx.game;
  if (ville && !avant) {
    const annonce = annonceDe(g);
    const enVue = tempeteEnVue(ctx.day, annonce, g)?.jour;
    const deja = new Set(tempetesNotees(g).map((t) => t.jour));
    const garder = tempetesDeLHiver(ctx.day, g).filter((j) => (j <= ctx.day || j === enVue) && !deja.has(j));
    if (garder.length) g = noter(g, ctx.day, garder.map((jour) => ({ jour, source: 'tirage' })));
  }
  // le tirage reprend avec les tempêtes dont l'annonce (3 jours, 6 avec la tour) commence aujourd'hui ou après ; le
  // calendrier compare tirageDepuis au début d'une annonce de 3 jours (hiver.js)
  if (!ville && avant) g = { ...g, tempetes: { ...(isObj(g.tempetes) ? g.tempetes : {}), notees: tempetesNotees(g), tirageDepuis: addDays(ctx.day, annonceDe(g) - TEMPETE.annonce) } };
  const { ville: _ancienne, ...reglages } = isObj(g.reglages) ? g.reglages : {};
  ctx.game = { ...g, reglages: ville ? { ...reglages, ville } : reglages };
  ctx.events.push({ type: 'reglage-ville', ville });
  return ctx.result();
}
