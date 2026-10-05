// Points d'effort (PE), gel de P/L/D, bonus plafonnés, plafond quotidien dégressif,
// conversion en Énergie / Matériaux, partage étapes / complétion, « Déjà faite ».
import { daysBetween, dayOnly, gameDay, hoursBetween, toISO } from './time.js';
import { taskAgeDays } from './cote.js';

export const ENERGY_PER_PE = 0.3;
export const MATERIALS_PER_PE = 0.5;
export const STEPS_SHARE = 0.4;
export const MAX_STEPS = 12;
export const BONUS_CAP = 0.4;
export const DAILY_TIERS = [
  { upTo: 45, rate: 1 },
  { upTo: 90, rate: 0.5 },
  { upTo: Infinity, rate: 0.2 },
];
export const ALREADY_DONE_FULL_PER_DAY = 3;
export const ALREADY_DONE_RATE = 0.5;

export const round1 = (n) => Math.round(n * 10) / 10;
export const round2 = (n) => Math.round(n * 100) / 100;

/** PE = round((6·√L + 2·[D ≥ 7]) × (0,8 + 0,04·P)). */
export function effortPoints(priority, length, difficulty) {
  return Math.round((6 * Math.sqrt(length) + (difficulty >= 7 ? 2 : 0)) * (0.8 + 0.04 * priority));
}

// ---- Gel de P / L / D --------------------------------------------------

/**
 * Faut-il figer P/L/D ? Oui au premier de : « Je m'y mets », première étape cochée, 24 h après la création.
 * (La création est lue dans `createdAt` si présent, sinon dans `created` : un jour de calendrier suffit alors.)
 */
export function shouldFreeze(task, now) {
  if (task.frozen) return false;
  if (task.startedAt) return true;
  if (Array.isArray(task.steps) && task.steps.some((s) => s.done)) return true;
  if (task.createdAt) return hoursBetween(task.createdAt, now) >= 24;
  const c = dayOnly(task.created);
  return !!c && daysBetween(c, gameDay(now)) >= 1;
}

export function freezeValues(task, now) {
  return { priority: task.priority, length: task.length, difficulty: task.difficulty, at: toISO(now) };
}

/** Valeurs qui servent à la récompense : celles du gel si elles existent, sinon les valeurs courantes. */
export function effectiveValues(task, now) {
  if (task.frozen) return task.frozen;
  return { priority: task.priority, length: task.length, difficulty: task.difficulty };
}

/** Renvoie la tâche avec `frozen` posé si la règle l'exige (copie, ne modifie pas l'entrée). */
export function applyFreeze(task, now) {
  return shouldFreeze(task, now) ? { ...task, frozen: freezeValues(task, now) } : task;
}

// ---- PE d'une quête ----------------------------------------------------

/**
 * Bonus plafonnés ensemble à +40 % : ×1,2 si finie avant une échéance posée au moins 48 h plus tôt,
 * +2 PE par tranche de 14 jours d'ancienneté.
 */
export function bonusPe(task, basePe, now) {
  let deadlineBonus = 0;
  const dl = dayOnly(task.deadline);
  // l'échéance doit avoir été posée au moins 48 h plus tôt (heures réelles) et la quête finie le jour dit ou avant
  if (dl && task.deadlineSetAt && hoursBetween(task.deadlineSetAt, now) >= 48 && gameDay(now) <= dl) deadlineBonus = basePe * 0.2;
  const ageBonus = 2 * Math.floor(taskAgeDays(task, now) / 14);
  const raw = deadlineBonus + ageBonus;
  const total = Math.min(raw, basePe * BONUS_CAP);
  return { deadline: deadlineBonus, age: ageBonus, raw, total, capped: raw > basePe * BONUS_CAP };
}

/** PE complets d'une quête : { base, bonus, pe }. */
export function questPe(task, now) {
  const v = effectiveValues(task, now);
  const base = effortPoints(v.priority, v.length, v.difficulty);
  const bonus = bonusPe(task, base, now);
  return { base, bonus, pe: Math.round(base + bonus.total) };
}

// ---- Plafond quotidien dégressif --------------------------------------

/** PE comptés pour ⚡ et ▣ : 100 % jusqu'à 45 PE dans la journée, 50 % de 45 à 90, 20 % au-delà. */
export function cappedPe(dayPeBefore, pe) {
  let pos = Math.max(0, dayPeBefore);
  let left = pe;
  let eff = 0;
  for (const tier of DAILY_TIERS) {
    if (left <= 0) break;
    if (pos < tier.upTo) {
      const take = Math.min(left, tier.upTo - pos);
      eff += take * tier.rate;
      left -= take;
      pos += take;
    }
  }
  return eff;
}

/** Facteur « Déjà faite » : plein tarif pour 3 quêtes par jour, 50 % ensuite. `countToday` = déjà comptées aujourd'hui. */
export function alreadyDoneRate(countToday) {
  return countToday < ALREADY_DONE_FULL_PER_DAY ? 1 : ALREADY_DONE_RATE;
}

/**
 * Montants d'un gain de `pe` PE, compte tenu des PE déjà gagnés aujourd'hui.
 * ⚡ = 0,3·PE comptés, ▣ = 0,5·PE comptés (PE comptés : après le plafond quotidien dégressif).
 */
export function amountsForPe(pe, dayPeBefore = 0) {
  const eff = cappedPe(dayPeBefore, pe);
  return { pe: round2(pe), energy: round1(eff * ENERGY_PER_PE), materials: round1(eff * MATERIALS_PER_PE) };
}

// ---- Étapes ------------------------------------------------------------

/** Partage d'une quête : 40 % pour les étapes, 60 % pour la complétion (total inchangé). */
export function splitSteps(pe) {
  const steps = round2(pe * STEPS_SHARE);
  return { steps, completion: round2(pe - steps) };
}

/** PE d'une étape cochée : 40 % des PE / nombre d'étapes, sans dépasser ce qui reste des 40 %. */
export function stepPe(pe, stepCount, paidSoFar = 0) {
  if (!stepCount) return 0;
  const pool = pe * STEPS_SHARE;
  return Math.max(0, round2(Math.min(pool / stepCount, pool - paidSoFar)));
}

/** PE payés à la complétion : le total moins ce que les étapes ont déjà payé (jamais négatif). */
export function completionPe(pe, paidSteps = 0) {
  return Math.max(0, round2(pe - paidSteps));
}
