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

export const api = {
  get: () => call('GET'),
  post: (opId, ops) => call('POST', { opId, ops }),
};
