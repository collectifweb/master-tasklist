// Temps de jeu. Aucune lecture de l'horloge : l'instant courant est toujours un paramètre.
// Fuseau America/Montreal (heure d'été gérée par Intl). Journée de jeu : 4 h 00 à 3 h 59.

export const TIME_ZONE = 'America/Montreal';
export const DAY_START_HOUR = 4;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_DAY = 86400000;

/** Date, chaîne ISO ou nombre (ms) → Date valide. Lance une erreur si absent ou invalide. */
export function parseNow(now) {
  if (now === undefined || now === null) throw new TypeError("L'instant courant (now) est obligatoire.");
  const d = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (Number.isNaN(d.getTime())) throw new TypeError('Instant invalide : ' + String(now));
  return d;
}

export function toISO(now) {
  return parseNow(now).toISOString();
}

let formatter = null;
function getFormatter() {
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  return formatter;
}

/** Heure murale de Montréal : { year, month, day, hour, minute, second } (nombres). */
export function localParts(now) {
  const out = {};
  for (const p of getFormatter().formatToParts(parseNow(now))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute, second: out.second };
}

const pad = (n) => String(n).padStart(2, '0');
const fmtDay = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** Jour de jeu (AAAA-MM-JJ) : 3 h 59 appartient à la veille, 4 h 00 au jour même. */
export function gameDay(now) {
  const p = localParts(now);
  const base = Date.UTC(p.year, p.month - 1, p.day);
  const ms = p.hour < DAY_START_HOUR ? base - MS_DAY : base;
  return dayFromMs(ms);
}

function dayFromMs(ms) {
  const d = new Date(ms);
  return fmtDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function isDayString(v) {
  return typeof v === 'string' && DAY_RE.test(v);
}

/** AAAA-MM-JJ → ms UTC à minuit (calcul de calendrier seulement). */
export function parseDay(day) {
  if (!isDayString(day)) throw new TypeError('Date attendue au format AAAA-MM-JJ : ' + String(day));
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Vrai si la chaîne est un jour de calendrier réel (AAAA-MM-JJ, 2026-02-30 refusé). */
export function isValidDay(v) {
  return isDayString(v) && dayFromMs(parseDay(v)) === v;
}

/**
 * Pour les champs « jour » (échéance, création) : si la chaîne commence par AAAA-MM-JJ, on garde ces 10
 * caractères, sans conversion en instant (aucune dépendance au fuseau de la machine). Date → jour de jeu.
 * Renvoie null si illisible.
 */
export function dayOnly(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : gameDay(value);
  if (typeof value !== 'string') return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?!\d)/.exec(value.trim());
  return m && isValidDay(m[1]) ? m[1] : null;
}

/** Instant (ISO complet, Date) → jour de jeu ; AAAA-MM-JJ → jour de jeu. Renvoie null si vide ou illisible. */
export function dayOf(value) {
  if (!value) return null;
  if (isDayString(value)) return value;
  try { return gameDay(value); } catch { return null; }
}

export function addDays(day, n) {
  return dayFromMs(parseDay(day) + n * MS_DAY);
}

/** Ajoute des mois en ramenant le quantième au dernier jour du mois au besoin (31 janv. + 1 mois = 28 févr.). */
export function addMonths(day, n, anchorDay) {
  const [y, m, d0] = day.split('-').map(Number);
  const d = anchorDay ?? d0;
  const idx = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12 + 12) % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fmtDay(ny, nm + 1, Math.min(d, last));
}

/** Nombre de jours entre deux jours (b − a). */
export function daysBetween(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / MS_DAY);
}

export function hoursBetween(a, b) {
  return (parseNow(b).getTime() - parseNow(a).getTime()) / 3600000;
}

/** Jours avant l'échéance (négatif si dépassée), ou null sans échéance. */
export function daysUntil(deadline, now) {
  const dl = dayOnly(deadline);
  return dl ? daysBetween(gameDay(now), dl) : null;
}

/** 1 = lundi … 7 = dimanche. */
export function isoWeekday(day) {
  const w = new Date(parseDay(day)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function weekStart(day) {
  return addDays(day, 1 - isoWeekday(day));
}

export function weekEnd(day) {
  return addDays(weekStart(day), 6);
}

/** Dates de la saison qui commence en `year` : neige le 15 novembre, trêve du 21 décembre au 4 janvier. */
export function seasonDates(year) {
  return { snow: `${year}-11-15`, truceStart: `${year}-12-21`, truceEnd: `${year + 1}-01-04` };
}

export function isTruce(day) {
  const y = Number(day.slice(0, 4));
  for (const s of [seasonDates(y - 1), seasonDates(y)]) {
    if (day >= s.truceStart && day <= s.truceEnd) return true;
  }
  return false;
}

export function isSnowSeason(day) {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const start = m >= 7 ? seasonDates(y).snow : seasonDates(y - 1).snow;
  const end = m >= 7 ? `${y + 1}-04-30` : `${y}-04-30`;
  return day >= start && day <= end;
}
