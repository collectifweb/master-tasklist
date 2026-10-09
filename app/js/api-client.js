// Client de api/api.php : GET (état complet) et POST (lot d'opérations). Jeton facultatif gardé dans localStorage.
const TOKEN_KEY = 'oree.token';
const URL_API = new URL('api/api.php', document.baseURI).href;

export class ApiError extends Error {
  /** status 0 = réseau injoignable ; code = code de l'API (game_conflict, busy…) ; body = réponse JSON si lisible. */
  constructor(status, code, message, body = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function readToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export const token = {
  has: () => readToken() !== '',
  set(v) { try { localStorage.setItem(TOKEN_KEY, String(v).trim()); } catch { /* ignoré */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignoré */ } },
};

export const newOpId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'op-' + Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''));

async function call(method, payload) {
  const headers = { Accept: 'application/json' };
  const tk = readToken();
  if (tk) headers.Authorization = 'Bearer ' + tk;
  const init = { method, headers, cache: 'no-store' };
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }
  let res;
  try {
    res = await fetch(URL_API, init);
  } catch (e) {
    throw new ApiError(0, 'network', 'Le serveur est injoignable.');
  }
  let body = null;
  try { body = await res.json(); } catch { /* corps non JSON */ }
  if (!res.ok || !body || body.ok === false) {
    throw new ApiError(res.status, (body && body.code) || 'http_' + res.status, (body && body.error) || 'Réponse inattendue du serveur.', body);
  }
  return body;
}

/**
 * Version de l'app envoyée avec chaque écriture : l'API refuse l'ancienne app (v1), qui n'en envoie pas, et un onglet resté
 * en version 3, qui achèterait un niveau à l'ancien prix et ne paierait pas la semaine tenue. Version 5 (imprévus, lot I) :
 * l'API refuse la version 4, qui ferait tourner une éolienne en panne, récolterait sans la part de l'ours et effacerait la
 * reprise ; son geste reste en file et l'onglet rechargé le recalcule avant l'envoi (`withoutStaleBodies`). Version 6 (hiver,
 * lot H) : l'API refuse la version 5, qui ferait tourner une éolienne ensevelie et effacerait la neige des tempêtes.
 * Version 7 (allure, lot A) : l'API refuse la version 6, qui tirerait deux imprévus par semaine quelle que soit l'allure.
 * Version 8 (rang Village, lot B) : l'API refuse la version 7, qui réglerait une tempête avec 3 jours d'annonce malgré la
 * tour de guet et ne verserait pas la production de la scierie, du poulailler ni de la cabane à sucre.
 * Version 9 (lot B, annonce de 6 jours) : l'API refuse la version 8, qui réglerait une tempête avec 7 jours d'annonce au
 * lieu de 6 avec la tour de guet.
 */
export const CLIENT_VERSION = 9;

export const api = {
  get: () => call('GET'),
  post: (opId, ops) => call('POST', { client: CLIENT_VERSION, opId, ops }),
};
