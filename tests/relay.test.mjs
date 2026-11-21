// Relais TMDB (Cloudflare Worker) testé dans Node : vrais jetons RS256 signés avec une clé de test,
// clés publiques et TMDB simulés. Vérifie que seul un ticket Firebase valide du bon projet ouvre l'accès.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handle, verifyIdToken, resetKeyCache } from '../relay/worker.js';

const PROJECT = 'crazy-test';
const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);
const SEC = Math.floor(NOW / 1000);
const ORIGIN = 'https://shaygheera.github.io';
const ENV = { TMDB_KEY: 'cle-relais-secrete-123456', FIREBASE_PROJECT_ID: PROJECT, ALLOWED_ORIGINS: ORIGIN, ALLOWED_EMAILS: '' };

const b64url = (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'cle-1', alg: 'RS256', use: 'sig' };

async function token(over = {}, { key = pair.privateKey, kid = 'cle-1', alg = 'RS256' } = {}) {
  const header = b64url(Buffer.from(JSON.stringify({ alg, kid, typ: 'JWT' })));
  const payload = b64url(Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/' + PROJECT, aud: PROJECT, sub: 'uid-ami', auth_time: SEC - 60,
    iat: SEC - 60, exp: SEC + 3000, email: 'ami@example.test', email_verified: true, ...over })));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(header + '.' + payload));
  return header + '.' + payload + '.' + b64url(new Uint8Array(sig));
}

let calls;
function fakeFetch(tmdbStatus = 200) {
  calls = [];
  return async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://www.googleapis.com/')) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    return new Response(JSON.stringify({ ok: true, page: 1 }), { status: tmdbStatus });
  };
}
const req = (path, { auth, origin = ORIGIN, method = 'GET' } = {}) => new Request('https://relais.test' + path, { method, headers: { ...(auth ? { Authorization: 'Bearer ' + auth } : {}), ...(origin ? { Origin: origin } : {}) } });
const call = (r, env = ENV, fetchImpl = fakeFetch()) => handle(r, env, null, { fetchImpl, nowMs: NOW, cache: null });

beforeEach(() => resetKeyCache());

describe('Relais TMDB : ticket de connexion', () => {
  it('ticket valide : la requête part vers TMDB avec la clé du relais, jamais celle du visiteur', async () => {
    const res = await call(req('/movie/550?language=fr-FR&append_to_response=videos&api_key=cle-du-visiteur', { auth: await token() }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, page: 1 });
    const tmdb = calls.find((c) => c.url.startsWith('https://api.themoviedb.org/'));
    const u = new URL(tmdb.url);
    assert.equal(u.pathname, '/3/movie/550');
    assert.equal(u.searchParams.get('api_key'), ENV.TMDB_KEY);
    assert.equal(u.searchParams.getAll('api_key').length, 1, 'la clé envoyée par le visiteur est retirée');
    assert.equal(u.searchParams.get('append_to_response'), 'videos');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  });
  it('sans ticket, ticket mal formé, autre projet, expiré, signature d’une autre clé : refusé (401), TMDB jamais appelé', async () => {
    const cases = [
      [null, 'sans ticket'],
      ['abc.def', 'mal formé'],
      [await token({ aud: 'autre-projet' }), 'autre projet (aud)'],
      [await token({ iss: 'https://securetoken.google.com/autre-projet' }), 'autre émetteur'],
      [await token({ exp: SEC - 10 }), 'expiré'],
      [await token({ iat: SEC + 3600 }), 'émis dans le futur'],
      [await token({ sub: '' }), 'sans identifiant'],
      [await token({}, { key: other.privateKey }), 'signé par une autre clé'],
      [await token({}, { kid: 'inconnue' }), 'clé inconnue'],
      [await token({}, { alg: 'HS256' }), 'algorithme non autorisé']
    ];
    for (const [t, label] of cases) {
      const fetchImpl = fakeFetch();
      const res = await call(req('/trending/all/week', { auth: t }), ENV, fetchImpl);
      assert.equal(res.status, 401, label);
      assert.equal(calls.filter((c) => c.url.startsWith('https://api.themoviedb.org/')).length, 0, label + ' : TMDB pas appelé');
    }
  });
  it('liste de comptes autorisés : seul un e-mail vérifié de la liste passe', async () => {
    const env = { ...ENV, ALLOWED_EMAILS: 'moi@example.test, Ami@Example.test' };
    assert.equal((await call(req('/movie/1', { auth: await token() }), env)).status, 200);
    assert.equal((await call(req('/movie/1', { auth: await token({ email: 'inconnu@example.test' }) }), env)).status, 403);
    assert.equal((await call(req('/movie/1', { auth: await token({ email_verified: false }) }), env)).status, 403, 'adresse non vérifiée');
  });
  it('vérification directe : renvoie le contenu du ticket', async () => {
    const claims = await verifyIdToken(await token(), PROJECT, { fetchImpl: fakeFetch(), nowMs: NOW });
    assert.equal(claims.sub, 'uid-ami');
  });
});

describe('Relais TMDB : périmètre et erreurs', () => {
  it('seules les parties de TMDB utilisées par l’appli, en lecture seule (aucune écriture possible)', async () => {
    const t = await token();
    for (const p of ['/account', '/authentication/token/new', '/list/1', '/', '/person/1', '/movie/1/2/3/4/5/6']) assert.equal((await call(req(p, { auth: t }))).status, 404, p); // le compte TMDB, les sessions et le reste de l’API restent fermés
    assert.equal((await call(req('/movie/1', { auth: t, method: 'POST' }))).status, 405);
    for (const p of ['/search/multi?query=a', '/discover/tv', '/tv/1/season/2', '/movie/1/release_dates', '/collection/9', '/configuration']) assert.equal((await call(req(p, { auth: t }))).status, 200, p);
  });
  it('préflight du navigateur : autorisé pour le site, aucune autorisation pour une autre origine', async () => {
    const ok = await call(req('/movie/1', { method: 'OPTIONS' }));
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    assert.match(ok.headers.get('Access-Control-Allow-Headers'), /Authorization/);
    const bad = await call(req('/movie/1', { method: 'OPTIONS', origin: 'https://pirate.test' }));
    assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
  });
  it('clé du relais refusée par TMDB : 502 explicite (pas confondu avec un ticket refusé) ; clé absente : 500', async () => {
    const res = await call(req('/movie/1', { auth: await token() }), ENV, fakeFetch(401));
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'tmdb-key' });
    assert.equal((await call(req('/movie/1', { auth: await token() }), { ...ENV, TMDB_KEY: '' })).status, 500);
  });
  it('jeton d’accès TMDB v4 : envoyé en en-tête, pas dans l’adresse', async () => {
    await call(req('/movie/1', { auth: await token() }), { ...ENV, TMDB_KEY: 'eyJhbGciOiJIUzI1NiJ9.test' });
    const tmdb = calls.find((c) => c.url.startsWith('https://api.themoviedb.org/'));
    assert.equal(new URL(tmdb.url).searchParams.get('api_key'), null);
    assert.equal(tmdb.init.headers.Authorization, 'Bearer eyJhbGciOiJIUzI1NiJ9.test');
  });
  it('cache : seconde demande servie sans rappeler TMDB, mais toujours après vérification du ticket', async () => {
    const store = new Map();
    const cache = { match: async (r) => { const v = store.get(r.url); return v ? new Response(v, { status: 200 }) : undefined; }, put: async (r, res) => { store.set(r.url, await res.text()); } };
    const fetchImpl = fakeFetch();
    const t = await token();
    await handle(req('/movie/7?language=fr-FR', { auth: t }), ENV, null, { fetchImpl, nowMs: NOW, cache });
    const again = await handle(req('/movie/7?language=fr-FR', { auth: t }), ENV, null, { fetchImpl, nowMs: NOW, cache });
    assert.equal(again.headers.get('X-Relay-Cache'), 'HIT');
    assert.equal(calls.filter((c) => c.url.startsWith('https://api.themoviedb.org/')).length, 1);
    assert.equal((await handle(req('/movie/7?language=fr-FR'), ENV, null, { fetchImpl, nowMs: NOW, cache })).status, 401, 'pas de ticket : rien depuis le cache');
  });
});
