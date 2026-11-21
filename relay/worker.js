/* Relais TMDB de Crazy Liste (Cloudflare Worker).
   Le site n'envoie jamais la clé TMDB : il envoie le ticket de connexion Google (jeton d'identité Firebase)
   de la personne connectée. Le relais vérifie ce ticket (signature Google, projet, expiration), ajoute la clé
   TMDB gardée en secret dans Cloudflare, interroge TMDB et renvoie la réponse.

   Réglages (relay/wrangler.toml et secrets Cloudflare) :
     TMDB_KEY             secret : clé API TMDB v3, ou jeton d'accès en lecture v4 (commence par « eyJ »)
     FIREBASE_PROJECT_ID  identifiant du projet Firebase dont les tickets sont acceptés
     ALLOWED_ORIGINS      adresses du site autorisées à appeler le relais depuis un navigateur (séparées par des virgules)
     ALLOWED_EMAILS       facultatif : seuls ces comptes Google (adresses vérifiées) sont acceptés ; vide = tout compte connecté */

const TMDB_API = 'https://api.themoviedb.org/3';
const GOOGLE_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CACHE_SECONDS = 600;       // réponses TMDB gardées 10 minutes dans le cache Cloudflare
const CLOCK_SKEW = 300;          // tolérance d'horloge pour les dates du ticket (secondes)
// Seules les parties de l'API TMDB utilisées par Crazy Liste, en lecture.
const ALLOWED_PATH = /^\/(movie|tv|search|discover|trending|collection|configuration|genre)(\/[A-Za-z0-9_\-]+){0,4}$/;

const enc = new TextEncoder();
function b64urlBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

/* Clés publiques de Google, gardées une heure ; relues une fois si le ticket cite une clé inconnue (rotation). */
const jwksCache = { at: 0, keys: [] };
async function googleKeys(fetchImpl, nowMs, force) {
  if (!force && jwksCache.keys.length && nowMs - jwksCache.at < 3600000) return jwksCache.keys;
  const res = await fetchImpl(GOOGLE_JWKS);
  if (!res.ok) throw new Error('jwks');
  const json = await res.json();
  jwksCache.keys = Array.isArray(json.keys) ? json.keys : [];
  jwksCache.at = nowMs;
  return jwksCache.keys;
}
export function resetKeyCache() { jwksCache.at = 0; jwksCache.keys = []; }

/* Vérifie un jeton d'identité Firebase (RS256) selon la documentation Firebase. Renvoie son contenu, ou lève une erreur. */
export async function verifyIdToken(token, projectId, { fetchImpl = fetch, nowMs = Date.now() } = {}) {
  if (!projectId) throw new Error('config');
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('format');
  let header, payload;
  try { header = b64urlJson(parts[0]); payload = b64urlJson(parts[1]); } catch (e) { throw new Error('format'); }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('alg');
  const now = Math.floor(nowMs / 1000);
  if (payload.aud !== projectId) throw new Error('aud');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('iss');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new Error('sub');
  if (!(payload.exp > now)) throw new Error('expired');
  if (!(payload.iat <= now + CLOCK_SKEW)) throw new Error('iat');
  if (!(payload.auth_time <= now + CLOCK_SKEW)) throw new Error('auth_time');
  let jwk = (await googleKeys(fetchImpl, nowMs, false)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(fetchImpl, nowMs, true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('signature');
  return payload;
}

const list = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const h = { Vary: 'Origin' };
  if (list(env.ALLOWED_ORIGINS).includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Headers'] = 'Authorization, Accept';
    h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
const json = (status, body, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

export async function handle(request, env, ctx, { fetchImpl = fetch, nowMs = Date.now(), cache = (typeof caches !== 'undefined' ? caches.default : null) } = {}) {
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET') return json(405, { error: 'method' }, cors);
  const url = new URL(request.url);
  if (!ALLOWED_PATH.test(url.pathname)) return json(404, { error: 'path' }, cors);
  if (!env.TMDB_KEY) return json(500, { error: 'relay-config' }, cors);

  // 1. Ticket de connexion Google
  const auth = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(\S+)$/.exec(auth);
  if (!m) return json(401, { error: 'token' }, cors);
  let claims;
  try { claims = await verifyIdToken(m[1], env.FIREBASE_PROJECT_ID, { fetchImpl, nowMs }); }
  catch (err) { return json(err.message === 'jwks' || err.message === 'config' ? 503 : 401, { error: 'token', reason: err.message }, cors); }
  const allowed = list(env.ALLOWED_EMAILS).map((e) => e.toLowerCase());
  if (allowed.length && !(claims.email_verified === true && allowed.includes(String(claims.email || '').toLowerCase()))) return json(403, { error: 'account' }, cors);

  // 2. Requête TMDB : paramètres du site conservés (sauf toute clé), clé du relais ajoutée
  const params = new URLSearchParams(url.search);
  params.delete('api_key');
  params.sort();
  const publicUrl = TMDB_API + url.pathname + (params.toString() ? '?' + params : '');
  const cacheKey = new Request(publicUrl);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return new Response(hit.body, { status: hit.status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, 'X-Relay-Cache': 'HIT' } });
  }
  const headers = { Accept: 'application/json' };
  const tmdbUrl = new URL(publicUrl);
  if (/^eyJ/.test(env.TMDB_KEY)) headers.Authorization = 'Bearer ' + env.TMDB_KEY; else tmdbUrl.searchParams.set('api_key', env.TMDB_KEY);
  let res;
  try { res = await fetchImpl(tmdbUrl.toString(), { headers }); } catch (e) { return json(502, { error: 'tmdb-network' }, cors); }
  if (res.status === 401) return json(502, { error: 'tmdb-key' }, cors); // clé du relais refusée par TMDB : à corriger dans Cloudflare
  const body = await res.text();
  const out = new Response(body, { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, max-age=' + CACHE_SECONDS, ...cors } });
  if (cache && res.status === 200) {
    const stored = new Response(body, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + CACHE_SECONDS } });
    const p = cache.put(cacheKey, stored);
    if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
  }
  return out;
}

export default { fetch: (request, env, ctx) => handle(request, env, ctx) };
