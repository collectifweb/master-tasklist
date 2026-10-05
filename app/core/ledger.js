// Registre des gains : clés uniques, construction des entrées, totaux du jour.
// Le registre est en ajout seul. Une entrée : { key, at, day, type, taskId?, occurrence?, pe, energy, materials,
// quartier? } (`quartier` sur les gains de quête et d'étape et leurs annulations ; + `alreadyDone` sur un gain
// « Déjà faite », `bonus` = nom du bonus sur une entrée `bonus`, `stepId` sur une étape).
// Les entrées écrites en v1 portent `lueur: { sector, amount }` et `filLibre` au lieu de `quartier` : le registre
// n'est jamais réécrit, quartierOfEntry lit les deux formes.
import { gameDay, hoursBetween, toISO } from './time.js';
import { amountsForPe, round1, round2, alreadyDoneRate } from './reward.js';
import { QUARTIERS, quartierOfTask, quartierOfSector } from './domains.js';

export const REVERSE_WINDOW_HOURS = 24;

/** Bonus hors tâches : montant en ⚡, plafond par jour du type, compte dans les 5 ⚡ quotidiens ou non. */
export const BONUSES = {
  ouverture: { energy: 1, perDay: 1, capped: true },
  plan: { energy: 2, perDay: 1, capped: true },
  'plan-honore': { energy: 2, perDay: 1, capped: true },
  ajout: { energy: 1, perDay: 2, capped: true },
  retour: { energy: 10, perDay: 1, capped: false },
  'bon-fil': { energy: 2, perDay: 1, capped: false },
};
export const BONUS_DAILY_ENERGY_CAP = 5;

export const rewardKey = (taskId, occurrence) => `reward:${taskId}:${occurrence}`;
export const stepKey = (taskId, occurrence, stepId) => `step:${taskId}:${occurrence}:${stepId}`;
export const reverseKey = (taskId, occurrence) => `reverse:${taskId}:${occurrence}`;
export const bonusKey = (type, day, n) => `bonus:${type}:${day}` + (n === undefined || n === null ? '' : `:${n}`);

/**
 * Registre reçu de l'API : entrées récentes + clés plus anciennes. Renvoie le registre récent complété d'une
 * entrée minimale `{ key }` pour chaque clé absente. Une entrée minimale compte pour « déjà versé » (hasKey,
 * canReverse refusé) et jamais dans les totaux du jour (elle n'a pas de `day`).
 */
export function hydrateLedger(ledger, ledgerKeys) {
  const recent = Array.isArray(ledger) ? ledger : [];
  const have = new Set(recent.map((e) => e.key));
  const extra = [];
  for (const key of Array.isArray(ledgerKeys) ? ledgerKeys : []) {
    if (!have.has(key)) { have.add(key); extra.push({ key }); }
  }
  return [...recent, ...extra];
}

/** Nombre d'étapes d'une occurrence connues seulement par leur clé (entrées minimales). */
export function unknownStepsCount(ledger, taskId, occurrence) {
  const prefix = `step:${taskId}:${occurrence}:`;
  return ledger.filter((e) => !e.at && typeof e.key === 'string' && e.key.startsWith(prefix)).length;
}

export function hasKey(ledger, key) {
  return ledger.some((e) => e.key === key);
}

export function findEntry(ledger, key) {
  return ledger.find((e) => e.key === key) ?? null;
}

function base(key, type, now, extra = {}) {
  return { key, at: toISO(now), day: gameDay(now), type, ...extra };
}

function fromAmounts(a, quartier) {
  return { pe: a.pe, energy: a.energy, materials: a.materials, quartier };
}

/** Quartier d'une entrée : `quartier` (v2), ou l'ancien secteur `lueur.sector` traduit (v1) ; null sinon (bonus, entrée minimale). */
export function quartierOfEntry(entry) {
  if (!entry) return null;
  if (entry.quartier !== undefined) return Object.hasOwn(QUARTIERS, entry.quartier) ? entry.quartier : null;
  return quartierOfSector(entry.lueur && entry.lueur.sector);
}

/**
 * Entrée écrite par la v1 : seules les entrées v1 portent `filLibre` (toutes : gains, étapes, bonus, annulations,
 * Avis) et la v2 n'en écrit jamais, pas même sur un bonus sans quartier (« Bon fil »). Leur Énergie et leurs Matériaux
 * n'ont jamais été versés au stock v2 : la migration repart du stock de départ (state.js).
 */
export const isV1Entry = (entry) => !!entry && typeof entry === 'object' && Object.hasOwn(entry, 'filLibre');

/** Totaux d'une journée de jeu à partir du registre (la référence des plafonds). */
export function dayTotals(ledger, day) {
  const t = { pe: 0, energy: 0, materials: 0, alreadyDone: 0, bonusEnergy: 0, bonusCount: {}, rewards: 0 };
  for (const e of ledger) {
    if (e.day !== day) continue;
    if (e.type === 'reward' || e.type === 'step' || e.type === 'reverse') t.pe += e.pe || 0;
    if (e.type === 'reward') {
      t.rewards++;
      if (e.alreadyDone) t.alreadyDone++;
    }
    if (e.type === 'bonus' && BONUSES[e.bonus]) {
      if (BONUSES[e.bonus].capped) t.bonusEnergy += e.energy || 0;
      if (e.energy > 0) t.bonusCount[e.bonus] = (t.bonusCount[e.bonus] || 0) + 1;
    }
    t.energy += e.energy || 0;
    t.materials += e.materials || 0;
  }
  t.pe = Math.max(0, round2(t.pe));
  t.bonusEnergy = round1(t.bonusEnergy);
  return t;
}

/** Entrée `reward` : gain de complétion d'une occurrence. `pe` = PE à payer ici (déjà net des étapes). Renvoie null si la clé existe. */
export function buildRewardEntry({ task, occurrence, pe, alreadyDone = false }, ledger, now) {
  const key = rewardKey(task.id, occurrence);
  if (hasKey(ledger, key)) return null;
  const day = gameDay(now);
  const tot = dayTotals(ledger, day);
  let paid = pe;
  if (alreadyDone) paid = round2(pe * alreadyDoneRate(tot.alreadyDone));
  const entry = base(key, 'reward', now, {
    taskId: task.id,
    occurrence,
    ...fromAmounts(amountsForPe(paid, tot.pe), quartierOfTask(task)),
  });
  if (alreadyDone) entry.alreadyDone = true;
  return entry;
}

/** Entrée `step` : une étape cochée. Renvoie null si la clé existe. */
export function buildStepEntry({ task, occurrence, stepId, pe }, ledger, now) {
  const key = stepKey(task.id, occurrence, stepId);
  if (hasKey(ledger, key)) return null;
  const tot = dayTotals(ledger, gameDay(now));
  return base(key, 'step', now, {
    taskId: task.id,
    occurrence,
    stepId,
    ...fromAmounts(amountsForPe(pe, tot.pe), quartierOfTask(task)),
  });
}

/** PE déjà payés par les étapes d'une occurrence (positifs, hors annulations). */
export function stepsPaid(ledger, taskId, occurrence) {
  return round2(ledger.filter((e) => e.type === 'step' && e.taskId === taskId && e.occurrence === occurrence)
    .reduce((s, e) => s + (e.pe || 0), 0));
}

/** Gain total (gain de complétion + étapes) d'une occurrence, ou null s'il n'y a pas de gain. */
export function occurrenceEntries(ledger, taskId, occurrence) {
  return ledger.filter((e) => (e.type === 'reward' || e.type === 'step') && e.taskId === taskId && e.occurrence === occurrence);
}

/** Peut-on remballer ? Gain trouvé, pas déjà annulé, écrit il y a moins de 24 h. */
export function canReverse(ledger, taskId, occurrence, now) {
  const reward = findEntry(ledger, rewardKey(taskId, occurrence));
  if (!reward) return false;
  if (hasKey(ledger, reverseKey(taskId, occurrence))) return false;
  if (!reward.at) return false; // entrée minimale : gain ancien, hors des 24 h
  return hoursBetween(reward.at, now) < REVERSE_WINDOW_HOURS;
}

/**
 * Entrée `reverse` : annule (montants négatifs) le gain de complétion, des étapes et du « Bon fil ». Jour = jour du gain
 * annulé. Une part écrite en v1 (isV1Entry) ne rend ni Énergie ni Matériaux ; le quartier perd la tâche comme d'habitude.
 */
export function buildReverseEntry(ledger, taskId, occurrence, now) {
  const key = reverseKey(taskId, occurrence);
  const reward = findEntry(ledger, rewardKey(taskId, occurrence));
  if (!reward || !reward.at || hasKey(ledger, key)) return null;
  // le « Bon fil » gagné avec cette quête, le même jour, est annulé aussi
  const parts = [
    ...occurrenceEntries(ledger, taskId, occurrence),
    ...ledger.filter((e) => e.type === 'bonus' && e.bonus === 'bon-fil' && e.taskId === taskId && e.day === reward.day),
  ];
  const sum = (f, list = parts) => round2(list.reduce((s, e) => s + f(e), 0));
  // une part payée en v1 n'a jamais été versée au stock v2 : on n'en reprend ni l'Énergie ni les Matériaux
  const inStock = parts.filter((e) => !isV1Entry(e));
  return {
    key, at: toISO(now), day: reward.day, type: 'reverse', taskId, occurrence,
    reverses: parts.map((e) => e.key), // clés annulées : l'état s'en sert pour retirer ce qui a vraiment été appliqué
    pe: -sum((e) => e.pe || 0),
    energy: -sum((e) => e.energy || 0, inStock),
    materials: -sum((e) => e.materials || 0, inStock),
    quartier: quartierOfEntry(reward),
  };
}

/**
 * Entrée `bonus` hors tâches. `n` numérote les occurrences du jour (clé `bonus:{type}:{jour}:{n}`).
 * Renvoie null si le plafond du type ou des 5 ⚡ quotidiens est atteint.
 */
export function buildBonusEntry(type, ledger, now, extra = {}) {
  const def = BONUSES[type];
  if (!def) throw new Error('Bonus inconnu\u00a0: ' + type);
  const day = gameDay(now);
  const tot = dayTotals(ledger, day);
  const done = tot.bonusCount[type] || 0;
  if (done >= def.perDay) return null;
  if (def.capped && tot.bonusEnergy + def.energy > BONUS_DAILY_ENERGY_CAP) return null;
  const n = def.perDay > 1 ? done + 1 : undefined;
  const key = bonusKey(type, day, n);
  if (hasKey(ledger, key)) return null;
  return base(key, 'bonus', now, {
    bonus: type, ...extra,
    pe: 0, energy: def.energy, materials: 0,
  });
}

/** Reprise du bonus « ajout complet » si la quête est supprimée dans les 24 h. */
export function buildAjoutRefund(ledger, taskId, now) {
  const given = ledger.find((e) => e.type === 'bonus' && e.bonus === 'ajout' && e.taskId === taskId && e.energy > 0);
  if (!given || hoursBetween(given.at, now) >= REVERSE_WINDOW_HOURS) return null;
  const key = `bonus:ajout-reprise:${given.day}:${taskId}`;
  if (hasKey(ledger, key)) return null;
  return {
    key, at: toISO(now), day: given.day, type: 'bonus', bonus: 'ajout', taskId, reverses: [given.key],
    pe: 0, energy: -given.energy, materials: 0,
  };
}
