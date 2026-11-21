// Version publique avec relais TMDB : sans clé, il suffit de se connecter avec Google ; le site n'appelle alors
// jamais TMDB directement et joint le ticket de connexion à chaque requête vers le relais (simulé ici).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, jsErrors } from './helpers/browser.mjs';
import { createMock, PNG } from './fixtures/tmdb-mock.mjs';
import { createFirebaseBackend } from './fixtures/firebase-mock.mjs';
import { buildPublic, validateRelay } from '../tools/build-public.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.resolve(here, '..', 'crazy-liste.html'), 'utf8');
const CONFIG = { apiKey: 'AIza-test', authDomain: 'crazy-test.firebaseapp.com', projectId: 'crazy-test', appId: '1:1:web:1' };
const RELAY = 'https://relais.test';
const PUBLIC = buildPublic(SOURCE, CONFIG, RELAY + '/');
const ORIGIN = 'https://crazy.test';
const T = { timeout: 90000 };

let browser;
before(async () => { browser = await launch(); });
after(async () => { if (browser) await browser.close(); });

/* Relais simulé : exige « Bearer mock-id-token.<uid> », puis répond avec le faux TMDB (clé ajoutée côté relais). */
async function device({ storage = null, relayStatus = 200 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const backend = createFirebaseBackend();
  const tmdb = createMock();
  const relay = { calls: [], refused: 0 };
  await context.route('https://api.themoviedb.org/**', (r) => tmdb.handle(r));
  await context.route('https://image.tmdb.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await context.route('https://www.gstatic.com/**', (r) => backend.handle(r));
  await context.route('https://mock-firebase.test/**', (r) => backend.handle(r));
  await context.route(ORIGIN + '/**', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PUBLIC }));
  const cors = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': 'Authorization, Accept', 'access-control-allow-methods': 'GET, OPTIONS' };
  await context.route(RELAY + '/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
    const url = new URL(req.url());
    const auth = (await req.allHeaders()).authorization || '';
    relay.calls.push({ path: url.pathname + url.search, auth });
    if (!/^Bearer mock-id-token\.\S+$/.test(auth)) { relay.refused++; return route.fulfill({ status: 401, headers: cors, contentType: 'application/json', body: '{"error":"token"}' }); }
    if (relayStatus !== 200) return route.fulfill({ status: relayStatus, headers: cors, contentType: 'application/json', body: '{"error":"x"}' });
    url.searchParams.set('api_key', 'cle-du-relais-0123456789');
    return tmdb.handle({ request: () => ({ url: () => 'https://api.themoviedb.org/3' + url.pathname + '?' + url.searchParams }), fulfill: (o) => route.fulfill({ ...o, headers: { ...(o.headers || {}), ...cors } }) });
  });
  if (storage) await context.addInitScript((s) => { if (!localStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); localStorage.setItem('__seeded', '1'); } }, storage);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(ORIGIN + '/index.html#home');
  return { context, page, errors, tmdb, relay, backend };
}

describe('Relais TMDB dans la version publique', () => {
  it('adresse du relais : https uniquement, sans paramètres', () => {
    assert.equal(validateRelay('https://crazy-liste-tmdb.exemple.workers.dev/'), 'https://crazy-liste-tmdb.exemple.workers.dev');
    assert.equal(validateRelay(null), null);
    assert.throws(() => validateRelay('http://relais.test'));
    assert.throws(() => validateRelay('https://relais.test/?api_key=x'));
    assert.match(PUBLIC, /const TMDB_RELAY = "https:\/\/relais\.test";/);
    assert.match(buildPublic(SOURCE, CONFIG), /const TMDB_RELAY = null;/, 'sans relais : comportement d’avant');
  });

  it('non connecté : invitation à se connecter, aucune requête TMDB ; connecté : tout passe par le relais avec le ticket', T, async () => {
    const { page, errors, tmdb, relay, context } = await device();
    await page.waitForSelector('#welcome-panel [data-action="sync-signin"]');
    assert.match(await page.locator('#welcome-panel').textContent(), /Connecte-toi pour commencer[\s\S]*Aucune clé à fournir/);
    assert.equal(relay.calls.length + tmdb.state.requests.length, 0, 'rien n’est demandé avant la connexion');
    await page.locator('#welcome-panel [data-action="sync-signin"]').click();
    await page.waitForSelector('#rail-trending .card', { timeout: 15000 });
    assert.ok(relay.calls.length >= 6, 'les sections de l’accueil passent par le relais');
    assert.ok(relay.calls.every((c) => c.auth === 'Bearer mock-id-token.user-1'), 'ticket Google joint à chaque requête');
    assert.ok(relay.calls.every((c) => !/api_key=/.test(c.path)), 'aucune clé dans les requêtes du site');
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.startsWith('https://api.themoviedb.org/')).length), 0, 'TMDB jamais appelé directement par le navigateur');
    await page.evaluate(() => { location.hash = '#detail/movie/101'; });
    await page.waitForSelector('#detail-cards .dcard-head', { timeout: 15000 });
    assert.ok(relay.calls.some((c) => c.path.startsWith('/movie/101?')));
    await page.evaluate(() => { location.hash = '#settings'; });
    assert.match(await page.locator('.settings').textContent(), /par le relais Crazy Liste/);
    await page.locator('#sync-panel [data-action="sync-signout"]').click();
    await page.evaluate(() => { location.hash = '#home'; });
    await page.waitForSelector('#welcome-panel [data-action="sync-signin"]');
    assert.equal(relay.refused, 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('clé personnelle : utilisée directement, le relais n’est pas sollicité', T, async () => {
    const data = { schemaVersion: 1, tracking: {}, metadata: {}, preferences: { apiKey: 'cle-perso-0123456789abcdef' } };
    const { page, errors, relay, tmdb, context } = await device({ storage: { 'crazy-liste-v1': JSON.stringify(data) } });
    await page.waitForSelector('#rail-trending .card', { timeout: 15000 });
    assert.equal(relay.calls.length, 0);
    assert.ok(tmdb.state.requests.length >= 6);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('compte refusé par le relais : message clair au lieu d’une erreur de clé', T, async () => {
    const { page, context } = await device({ relayStatus: 403 });
    await page.locator('#welcome-panel [data-action="sync-signin"]').click();
    await page.waitForFunction(() => /n’est pas autorisé à utiliser le relais/.test(document.querySelector('#view-root').textContent), null, { timeout: 15000 });
    await context.close();
  });
});
