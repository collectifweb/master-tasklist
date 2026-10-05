// Avis de saison et avance du temps. Un seul Avis à la fois, annoncé 7 jours d'avance, Force fixée à l'annonce,
// Préparation détaillée ligne par ligne, résolution le matin de l'Avis. Jamais de perte définitive : au pire un voile
// de 2 cases, levé par la prochaine quête du secteur (economy.js), par 1 ⚡ par case, ou seul en 3 jours.
//
// Forme des données (game.avis) :
//   current : { id, sector, day, announcedOn, base, force, activity, braseros } | null
//   history : [{ id, day, resolvedOn, result: 'tenu' | 'voile' | 'absent', force, preparation }]
//   veils   : [{ avis, sector, cells, since, until }]
// Registre : un Avis tenu écrit { key: 'avis:{id}', type: 'avis', materials: 15, … } (clé unique, donc idempotent).
import { Ctx } from './quests.js';
import { addDays, daysBetween, gameDay, isTruce, toISO } from './time.js';
import { reverseKey, hasKey } from './ledger.js';
import { BUILDABLES, RESERVE_MAX, payCost } from './build.js';
import { syncChapter } from './chapters.js';

/**
 * Avis connus. `chapter` + `announceDay` : annoncé dès le jour `announceDay` de ce chapitre (au plus tôt), pour le jour
 * d'annonce + `lead`. Premier gel = tutoriel du chapitre 2 : annoncé au 5e jour du chapitre, tombe au 12e.
 */
export const AVIS = {
  premier_gel: { id: 'premier_gel', chapter: 2, announceDay: 5, lead: 7, sector: 'champs', base: 24 },
};
export const AVIS_ACTIVITY_DAYS = 28;
/** Activité cible : la part de jours allumés d'une semaine tenue (4 jours sur 7). */
export const AVIS_TARGET = 4 / 7;
export const AVIS_RATIO_MIN = 0.75;
export const AVIS_RATIO_MAX = 1.25;
export const GARDE = 8;
export const PREP_QUESTS = { each: 1, max: 8 };
export const PREP_SECTOR_QUESTS = { each: 3, max: 9 };
export const PREP_AUTONOMOUS = 6;
export const BRASERO = { energy: 8, prep: 5, max: 3 };
export const AVIS_HELD_MATERIALS = 15;
export const VEIL_CELLS = 2;
export const VEIL_DAYS = 3;
export const VEIL_LIFT_ENERGY = 1;
/** Absent : plus de 2 jours de jeu entre la dernière visite et la résolution de l'Avis (un retour tardif compte aussi). */
export const ABSENT_DAYS = 2;

export const avisKey = (id) => `avis:${id}`;

/**
 * Activité des 28 jours avant `day` (exclu) : part des jours où la lisière s'est allumée, comptée depuis le début
 * de la partie s'il y a moins de 28 jours. ratio = clamp(0,75 ; part / (4/7) ; 1,25). Renvoie { activity, days, ratio }.
 */
export function avisActivity(game, day) {
  let from = addDays(day, -AVIS_ACTIVITY_DAYS);
  if (game.startDay && game.startDay > from) from = game.startDay;
  const days = Math.max(0, daysBetween(from, day));
  const activity = (game.lisiereDays ?? []).filter((d) => d >= from && d < day).length;
  const raw = days ? activity / days / AVIS_TARGET : 1;
  return { activity, days, ratio: Math.min(AVIS_RATIO_MAX, Math.max(AVIS_RATIO_MIN, raw)) };
}

/**
 * Préparation contre un Avis (en cours ou passé en argument), ligne par ligne pour la jauge :
 * Garde 8 + défenses construites + quêtes finies entre l'annonce et l'Avis (+1 chacune, 8 au plus ; secteur visé
 * +3 chacune, 9 au plus) + Réserve d'hiver (6 au plus) + braseros (+5, 3 au plus) + 6 par secteur autonome.
 * Renvoie { total, lignes: [{ id, label, value, count?, max? }] }.
 */
export function avisPreparation(game, ledger, avis) {
  const lignes = [{ id: 'garde', label: 'Garde', value: GARDE }];
  for (const [id, def] of Object.entries(BUILDABLES)) {
    if (!def.defense || (def.defense.sector && def.defense.sector !== avis.sector)) continue;
    const n = (game.placements ?? []).filter((p) => (def.landmark ? p.id === id : p.model === def.model)).length;
    if (n) lignes.push({ id, label: id === 'tour' ? 'Tour de signal' : 'Tunnel de culture', value: def.defense.prep * n, count: n });
  }
  const keys = new Set(ledger.map((e) => e.key));
  const quests = ledger.filter((e) => e.type === 'reward' && e.day && e.day >= avis.announcedOn && e.day < avis.day
    && (e.pe || 0) >= 0 && !keys.has(reverseKey(e.taskId, e.occurrence)));
  const inSector = quests.filter((e) => e.lueur && e.lueur.sector === avis.sector).length;
  const autonomous = Object.values(game.sectors ?? {}).filter((s) => s.open && s.stage >= 3).length;
  const braseros = avis.braseros || 0;
  lignes.push(
    { id: 'quetes', label: 'Quêtes', value: Math.min(PREP_QUESTS.max, quests.length * PREP_QUESTS.each), count: quests.length, max: PREP_QUESTS.max },
    { id: 'quetes-secteur', label: 'Quêtes du secteur visé', value: Math.min(PREP_SECTOR_QUESTS.max, inSector * PREP_SECTOR_QUESTS.each), count: inSector, max: PREP_SECTOR_QUESTS.max },
    { id: 'reserve', label: 'Réserve d’hiver', value: Math.min(RESERVE_MAX, game.garden?.reserve ?? 0), max: RESERVE_MAX },
    { id: 'braseros', label: 'Braseros', value: braseros * BRASERO.prep, count: braseros, max: BRASERO.max * BRASERO.prep },
    { id: 'autonomes', label: 'Secteurs autonomes', value: autonomous * PREP_AUTONOMOUS, count: autonomous },
  );
  return { total: lignes.reduce((s, l) => s + l.value, 0), lignes };
}

/**
 * Pour la jauge : { id, sector, day, announcedOn, daysLeft, force, preparation, lignes, braseros, braserosMax, tenu }
 * de l'Avis en cours, ou null.
 */
export function avisStatus(game, ledger, now) {
  const cur = game.avis && game.avis.current;
  if (!cur) return null;
  const prep = avisPreparation(game, ledger, cur);
  return {
    id: cur.id, sector: cur.sector, day: cur.day, announcedOn: cur.announcedOn, daysLeft: daysBetween(gameDay(now), cur.day),
    force: cur.force, preparation: prep.total, lignes: prep.lignes, braseros: cur.braseros || 0, braserosMax: BRASERO.max,
    tenu: prep.total >= cur.force,
  };
}

/** Allume un brasero pour l'Avis annoncé : 8 ⚡ → +5 Préparation, 3 au plus. Événement { type: 'brasero', avis, braseros, preparation }. */
export function lightBrasero(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const cur = ctx.game.avis && ctx.game.avis.current;
  if (!cur || ctx.day >= cur.day) throw new Error('Aucun Avis annoncé : les braseros attendront le prochain.');
  if ((cur.braseros || 0) >= BRASERO.max) throw new Error(`${BRASERO.max} braseros au plus par Avis.`);
  const g = structuredClone(ctx.game);
  payCost(g, { energy: BRASERO.energy, materials: 0 });
  g.avis.current.braseros = (cur.braseros || 0) + 1;
  ctx.game = g;
  ctx.events.push({ type: 'brasero', avis: cur.id, braseros: g.avis.current.braseros, preparation: avisPreparation(g, ctx.ledger, g.avis.current).total });
  return ctx.result();
}

/** Lève une case voilée d'un secteur pour 1 ⚡. params : { sector }. Événement { type: 'voile-leve', sector, reason: 'energie', cells } (cases restantes). */
export function liftVeil(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const g = structuredClone(ctx.game);
  const veil = (g.avis.veils ?? []).find((v) => v.sector === params.sector);
  if (!veil) throw new Error('Aucun voile sur ce secteur.');
  payCost(g, { energy: VEIL_LIFT_ENERGY, materials: 0 });
  veil.cells -= 1;
  if (veil.cells <= 0) g.avis.veils = g.avis.veils.filter((v) => v !== veil);
  ctx.game = g;
  ctx.events.push({ type: 'voile-leve', sector: params.sector, reason: 'energie', cells: Math.max(0, veil.cells) });
  return ctx.result();
}

// Prochain Avis à annoncer aujourd'hui, ou null. Jamais pendant la trêve des Fêtes : ni annoncé un jour de trêve, ni tombant un jour de trêve.
function nextAvis(g, today) {
  for (const def of Object.values(AVIS)) {
    if (g.avis.history.some((h) => h.id === def.id) || g.chapter.number !== def.chapter) continue;
    if (daysBetween(g.chapter.startDay, today) + 1 < def.announceDay || isTruce(today) || isTruce(addDays(today, def.lead))) continue;
    return def;
  }
  return null;
}

/**
 * Avance du temps, à appeler à l'ouverture (après openApp), au changement de jour et après une action qui peut
 * atteindre un objectif. Déterministe et idempotente : rejouée avec le même `now`, elle ne fait plus rien.
 *  1. lève les voiles arrivés au bout de leurs 3 jours ;
 *  2. résout l'Avis dont le jour est arrivé : Tenu si Préparation ≥ Force (+15 ▣ au registre, la Réserve d'hiver
 *     est consommée), sinon Voilé (2 cases du secteur visé, 3 jours), sauf absence de 48 h ou plus avant l'Avis
 *     (résultat « absent », aucun voile) ;
 *  3. annonce le prochain Avis (Force fixée d'après l'activité des 28 jours précédents) ;
 *  4. avec params.chapitres (content/fr-CA/chapitres.json) : retient les objectifs atteints et termine le chapitre ;
 *  5. note le jour de présence (game.lastSeenDay).
 * Événements : 'voile-leve' { sector, reason: 'temps', cells: 0 }, 'avis-resolu' { id, day, result, force,
 * preparation, lignes }, 'reward' (source 'avis') si tenu, 'avis-annonce' { id, day, sector, force },
 * puis ceux de syncChapter.
 */
export function advanceTime(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const today = ctx.day;
  const g = structuredClone(ctx.game);
  const prevSeen = g.lastSeenDay ?? g.lastOpenDay ?? null;
  const events = [];
  let entry = null;

  const veils = g.avis.veils ?? [];
  for (const v of veils) if (v.until <= today) events.push({ type: 'voile-leve', sector: v.sector, reason: 'temps', cells: 0 });
  g.avis.veils = veils.filter((v) => v.until > today);

  const cur = g.avis.current;
  if (cur && today >= cur.day) {
    const prep = avisPreparation(g, ctx.ledger, cur);
    // absent : jamais vu, ou plus de 2 jours sans visite à la résolution (un long retour ne fait donc jamais tomber de voile)
    const absent = !prevSeen || daysBetween(prevSeen, today) > ABSENT_DAYS;
    const result = prep.total >= cur.force ? 'tenu' : absent ? 'absent' : 'voile';
    g.avis.history.push({ id: cur.id, day: cur.day, resolvedOn: today, result, force: cur.force, preparation: prep.total });
    g.avis.current = null;
    // Résolu = figé : une quête remballée après la résolution ne reprend pas les 15 ▣ ni le voile (aucune perte, voulu).
    if (result === 'tenu') {
      g.garden.reserve = 0; // la réserve a servi à tenir
      if (!hasKey(ctx.ledger, avisKey(cur.id))) {
        entry = {
          key: avisKey(cur.id), at: toISO(now), day: today, type: 'avis', avis: cur.id,
          pe: 0, energy: 0, materials: AVIS_HELD_MATERIALS, lueur: { sector: cur.sector, amount: 0 }, filLibre: 0,
        };
      }
    } else if (result === 'voile') {
      g.avis.veils.push({ avis: cur.id, sector: cur.sector, cells: VEIL_CELLS, since: today, until: addDays(today, VEIL_DAYS) });
    }
    events.push({ type: 'avis-resolu', id: cur.id, day: cur.day, result, force: cur.force, preparation: prep.total, lignes: prep.lignes });
  }

  if (!g.avis.current) {
    const def = nextAvis(g, today);
    if (def) {
      const act = avisActivity(g, today);
      const day = addDays(today, def.lead);
      const force = Math.round(def.base * act.ratio); // Force = base × ratio d'activité, fixée à l'annonce
      g.avis.current = { id: def.id, sector: def.sector, day, announcedOn: today, base: def.base, force, activity: act.activity, braseros: 0 };
      events.push({ type: 'avis-annonce', id: def.id, day, sector: def.sector, force });
    }
  }

  if (!prevSeen || today > prevSeen) g.lastSeenDay = today; // ne recule jamais (file hors ligne rejouée en retard)
  ctx.game = g;
  ctx.events.push(...events);
  if (entry) ctx.append(entry, 'avis');
  if (params.chapitres) {
    const r = syncChapter(ctx.game, ctx.tasks, ctx.ledger, params.chapitres, now);
    ctx.game = r.game;
    ctx.events.push(...r.events);
  }
  return ctx.result();
}
