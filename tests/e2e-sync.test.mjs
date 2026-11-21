// Synchronisation entre appareils : version publique (sans clé intégrée) servie en https, Firebase simulé,
// deux navigateurs indépendants (« PC » et « téléphone ») partageant le même serveur fictif.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import { launch, jsErrors } from './helpers/browser.mjs';
import { createMock, PNG, handleWikidata, handleAnilist } from './fixtures/tmdb-mock.mjs';
import { createFirebaseBackend } from './fixtures/firebase-mock.mjs';
import { buildPublic } from '../tools/build-public.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.resolve(here, '..', 'crazy-liste.html'), 'utf8');
const CONFIG = { apiKey: 'AIza-test', authDomain: 'crazy-test.firebaseapp.com', projectId: 'crazy-test', appId: '1:1:web:1' };
const PUBLIC = buildPublic(SOURCE, CONFIG);
const ORIGIN = 'https://crazy.test';
const TMDB_KEY = 'cle-de-test-0123456789abcdef';
const T = { timeout: 90000 };

let browser;
before(async () => { browser = await launch(); });
after(async () => { if (browser) await browser.close(); });

async function device(backend, { storage = null, viewport = { width: 1440, height: 900 }, hash = '#home' } = {}) {
  const context = await browser.newContext({ viewport, locale: 'fr-FR' });
  const tmdb = createMock();
  await context.route('https://api.themoviedb.org/**', (r) => tmdb.handle(r));
  await context.route('https://image.tmdb.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await context.route('https://query.wikidata.org/**', (r) => handleWikidata(r));
  await context.route('https://graphql.anilist.co/**', (r) => handleAnilist(r));
  await context.route('https://www.gstatic.com/**', (r) => backend.handle(r));
  await context.route('https://mock-firebase.test/**', (r) => backend.handle(r));
  await context.route(ORIGIN + '/**', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PUBLIC }));
  if (storage) await context.addInitScript((s) => { if (!localStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); localStorage.setItem('__seeded', '1'); } }, storage);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(ORIGIN + '/index.html' + hash);
  return { context, page, errors, tmdb };
}
const go = (page, hash) => page.evaluate((h) => { location.hash = h; }, hash);
const local = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('crazy-liste-v1') || 'null'));
const chip = (page) => page.locator('[data-sync-chip]').textContent();
const waitSynced = (page) => page.waitForFunction(() => { const c = document.querySelector('[data-sync-chip]'); return c && c.textContent === 'Synchronisé'; }, null, { timeout: 15000 });
async function signIn(page) {
  await go(page, '#settings');
  await page.locator('#sync-panel [data-action="sync-signin"]').click();
  await page.waitForFunction(() => document.querySelector('#sync-panel').textContent.includes('Connecté avec'), null, { timeout: 15000 });
}

const PC_DATA = {
  schemaVersion: 1,
  tracking: {
    'tv-201': { type: 'tv', id: 201, inLibrary: true, favorite: false, watchlist: false, trackingStatus: null, intent: null, seasons: { 1: { episodes: { 1: 'seen', 2: 'seen' } } }, addedAt: 1000, lastActivityAt: 2000 },
    'movie-101': { type: 'movie', id: 101, inLibrary: false, favorite: true, watchlist: false, trackingStatus: null, intent: null, seasons: {}, addedAt: 1500, lastActivityAt: 0 }
  },
  metadata: {},
  preferences: { theme: 'dark', apiKey: TMDB_KEY, libraryStatus: 'all', libraryType: 'all', librarySort: 'activity' }
};

describe('Version publique', () => {
  it('ne contient pas la clé intégrée, n’est pas référencée et demande de se connecter', T, async () => {
    assert.match(PUBLIC, /const DEFAULT_TMDB_KEY = '';/);
    assert.match(PUBLIC, /<meta name="robots" content="noindex, nofollow">/);
    const backend = createFirebaseBackend();
    const phone = await device(backend, { viewport: { width: 390, height: 844 } });
    await phone.page.waitForSelector('#welcome-panel [data-action="sync-signin"]');
    assert.equal(await phone.page.locator('.error-box').count(), 0, 'pas de mur d’erreurs sans clé');
    assert.equal(await phone.page.locator('#banners .banner').count(), 0, 'un seul message, pas de bandeau en double');
    assert.equal(phone.tmdb.state.requests.length, 0, 'aucune requête TMDB sans clé');
    assert.deepEqual(jsErrors(phone.errors), []);
    await phone.context.close();
  });

  it('ouverte depuis un fichier : la synchronisation explique qu’il faut l’adresse web', T, async () => {
    const file = path.join(os.tmpdir(), 'crazy-public-test.html');
    fs.writeFileSync(file, PUBLIC);
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(pathToFileURL(file).href + '#settings');
    assert.match(await page.locator('#sync-panel').textContent(), /Ouvre-la depuis son adresse web/);
    assert.equal(await page.locator('#sync-panel [data-action="sync-signin"]').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe('Synchronisation PC ↔ téléphone', () => {
  it('liste, clé TMDB, épisodes, favoris et suppression passent d’un appareil à l’autre', T, async () => {
    const backend = createFirebaseBackend();
    const pc = await device(backend, { storage: { 'crazy-liste-v1': JSON.stringify(PC_DATA) } });
    const phone = await device(backend, { viewport: { width: 390, height: 844 } });

    // 1. Le PC se connecte : sa liste et sa clé partent sur le serveur, dans l'espace de son compte uniquement.
    await signIn(pc.page);
    await waitSynced(pc.page);
    assert.ok(backend.docs.has('users/user-1/items/tv-201'));
    assert.ok(backend.docs.has('users/user-1/items/movie-101'));
    await pc.page.waitForFunction(() => true);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(backend.docs.get('users/user-1/settings/app').tmdbKey, TMDB_KEY);
    assert.ok([...backend.docs.keys()].every((p) => p.startsWith('users/user-1/')));

    // 2. Le téléphone (vide, sans clé) se connecte : il récupère la clé et toute la liste.
    await signIn(phone.page);
    await phone.page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('crazy-liste-v1') || 'null'); return d && d.tracking['tv-201'] && d.tracking['movie-101']; }, null, { timeout: 15000 });
    let p = await local(phone.page);
    assert.equal(p.preferences.apiKey, TMDB_KEY, 'clé TMDB récupérée depuis le compte');
    assert.deepEqual(p.tracking['tv-201'].seasons, { 1: { episodes: { 1: 'seen', 2: 'seen' } } });
    assert.equal(p.tracking['movie-101'].favorite, true);
    await go(phone.page, '#favorites');
    await phone.page.waitForSelector('[data-item-key="movie-101"]');
    await go(phone.page, '#home');
    await phone.page.waitForSelector('#rail-trending .card', { timeout: 15000 });

    // 3. Le PC a la fiche ouverte ; le téléphone coche l'épisode 3 : la fiche du PC se met à jour sans rechargement.
    await go(pc.page, '#detail/tv/201');
    await pc.page.waitForSelector('#season-1 .ep');
    await go(phone.page, '#detail/tv/201');
    await phone.page.waitForSelector('#season-1 .ep');
    await phone.page.locator('[data-action="episode-status"][data-season="1"][data-episode="3"][data-status="seen"]').click();
    await pc.page.waitForFunction(() => { const e = document.querySelector('#season-1 [data-ep="1-3"]'); return e && e.dataset.status === 'seen'; }, null, { timeout: 15000 });
    const reloads = await pc.page.evaluate(() => performance.getEntriesByType('navigation').length);
    assert.equal(reloads, 1, 'pas de rechargement de page');

    // 4. Le PC retire le favori : il disparaît du téléphone.
    await go(pc.page, '#favorites');
    await pc.page.locator('[data-item-key="movie-101"] [data-action="toggle-favorite"]').click();
    await phone.page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('crazy-liste-v1')); return !d.tracking['movie-101']; }, null, { timeout: 15000 });

    // 5. Modifications des deux côtés sur des contenus différents : rien n'est perdu.
    await go(phone.page, '#home');
    await phone.page.waitForSelector('#rail-popular-movies [data-item-key="movie-103"]');
    await phone.page.locator('#rail-popular-movies [data-item-key="movie-103"] [data-action="toggle-watchlist"]').click();
    await go(pc.page, '#home');
    await pc.page.waitForSelector('#rail-popular-movies [data-item-key="movie-104"]');
    await pc.page.locator('#rail-popular-movies [data-item-key="movie-104"] [data-action="toggle-favorite"]').click();
    for (const d of [pc, phone]) {
      await d.page.waitForFunction(() => { const x = JSON.parse(localStorage.getItem('crazy-liste-v1')).tracking; return x['movie-103'] && x['movie-103'].watchlist && x['movie-104'] && x['movie-104'].favorite; }, null, { timeout: 15000 });
    }
    const a = await local(pc.page), b = await local(phone.page);
    assert.deepEqual(a.tracking, b.tracking, 'les deux appareils ont exactement la même liste');
    await waitSynced(pc.page);
    await waitSynced(phone.page);
    assert.equal(backend.st.denied, 0, 'aucun accès hors de l’espace du compte');
    assert.deepEqual(jsErrors(pc.errors), []);
    assert.deepEqual(jsErrors(phone.errors), []);
    await pc.context.close();
    await phone.context.close();
  });

  it('un autre compte ne voit rien, et se déconnecter garde la liste sur l’appareil', T, async () => {
    const backend = createFirebaseBackend();
    const pc = await device(backend, { storage: { 'crazy-liste-v1': JSON.stringify(PC_DATA) } });
    await signIn(pc.page);
    await waitSynced(pc.page);

    backend.st.nextUser = { uid: 'user-2', email: 'autre@example.test', displayName: 'Autre' };
    const other = await device(backend);
    await signIn(other.page);
    await waitSynced(other.page);
    const o = await local(other.page);
    assert.deepEqual(o ? o.tracking : {}, {}, 'le second compte ne reçoit rien du premier');
    assert.equal(o ? o.preferences.apiKey : '', '');

    await pc.page.locator('#sync-panel [data-action="sync-signout"]').click();
    await pc.page.waitForFunction(() => document.querySelector('#sync-panel [data-action="sync-signin"]'));
    const after = await local(pc.page);
    assert.ok(after.tracking['tv-201'] && after.tracking['movie-101'], 'la liste reste sur l’appareil');
    assert.equal(await chip(pc.page), 'Synchro désactivée');
    assert.equal(backend.st.denied, 0);
    assert.deepEqual(jsErrors(pc.errors), []);
    assert.deepEqual(jsErrors(other.errors), []);
    await pc.context.close();
    await other.context.close();
  });

  it('modification faite sans Internet : enregistrée sur l’appareil puis envoyée au retour de la connexion', T, async () => {
    const backend = createFirebaseBackend();
    const pc = await device(backend, { storage: { 'crazy-liste-v1': JSON.stringify(PC_DATA) } });
    await signIn(pc.page);
    await waitSynced(pc.page);
    const phone = await device(backend);
    await signIn(phone.page);
    await phone.page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('crazy-liste-v1') || 'null'); return d && d.tracking['tv-201']; }, null, { timeout: 15000 });
    await phone.context.setOffline(true); // le téléphone perd Internet
    await go(phone.page, '#detail/tv/201');
    await phone.page.waitForSelector('#season-1 .ep');
    await phone.page.locator('[data-action="episode-status"][data-season="1"][data-episode="4"][data-status="seen"]').click();
    assert.equal((await local(phone.page)).tracking['tv-201'].seasons[1].episodes[4], 'seen', 'enregistré sur l’appareil malgré la coupure');
    await phone.context.setOffline(false);
    await phone.page.locator('#detail-track').waitFor();
    await go(phone.page, '#settings');
    await phone.page.locator('#sync-panel [data-action="sync-now"]').click().catch(() => {});
    await pc.page.waitForFunction(() => JSON.parse(localStorage.getItem('crazy-liste-v1')).tracking['tv-201'].seasons[1].episodes[4] === 'seen', null, { timeout: 45000 });
    await pc.context.close();
    await phone.context.close();
  });
});
