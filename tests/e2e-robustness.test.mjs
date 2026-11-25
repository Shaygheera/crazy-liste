// Tests de bout en bout dans Chrome (playwright-core), TMDB simulé. Partie 2 : navigation, robustesse, recherche, affichage.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launch, openApp, jsErrors, store, duplicateIds } from './helpers/browser.mjs';
import { SPECIAL_TITLE, INVALID_KEY } from './fixtures/tmdb-mock.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { if (browser) await browser.close(); });

const T = { timeout: 60000 };
const SHOTS = process.env.CRAZY_SHOTS || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); };
const h1Is = (page, t) => page.waitForFunction((x) => document.querySelector('h1') && document.querySelector('h1').textContent === x, t);
const go = async (page, hash, h1) => { await page.evaluate((h) => { location.hash = h; }, hash); if (h1) await h1Is(page, h1); };
const text = (page, s) => page.locator(s).first().textContent();
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

describe('E. Navigation', () => {
  it('URL directe sans cache local, rechargement sur la fiche, précédent / suivant', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    assert.equal(await text(page, 'h1'), 'Série Alpha');
    await page.reload();
    await page.waitForSelector('#season-1 .ep');
    assert.equal(await text(page, 'h1'), 'Série Alpha', 'le rechargement rouvre la même fiche');
    assert.equal(await page.evaluate(() => location.hash), '#detail/tv/201');
    await go(page, '#home', 'Crazy Liste');
    await page.waitForSelector('#rail-trending .card');
    await page.locator('#rail-trending [data-item-key="movie-103"]').click({ position: { x: 40, y: 60 } });
    await h1Is(page, 'Film Test 3');
    await page.goBack();
    await h1Is(page, 'Crazy Liste');
    await page.waitForSelector('#rail-trending .card');
    await page.goForward();
    await h1Is(page, 'Film Test 3');
    await page.goBack();
    await h1Is(page, 'Crazy Liste');
    await page.reload();
    await h1Is(page, 'Crazy Liste');
    assert.equal(await page.evaluate(() => location.hash), '#home', 'accueil puis rechargement : reste à l’accueil');
    await go(page, '#favorites', 'Favoris');
    await page.reload();
    await h1Is(page, 'Favoris');
    assert.equal(await page.locator('.nav [aria-current="page"]').getAttribute('data-nav'), 'favorites');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('identifiant invalide, page inconnue, fiche introuvable, échec réseau avec données locales', T, async () => {
    const tracked = { schemaVersion: 1, tracking: { 'movie-102': { inLibrary: true, trackingStatus: 'progress', lastActivityAt: 1700000000000, addedAt: 1700000000000 } },
      metadata: { 'movie-102': { title: 'Film Test 2 (local)', year: '2022', type: 'movie', id: 102 } }, preferences: {} };
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/abc', storage: { 'crazy-liste-v1': JSON.stringify(tracked) }, mock: { fail: ['/movie/102'] } });
    await page.waitForSelector('text=Lien de fiche invalide');
    await go(page, '#nimporte-quoi');
    await page.waitForSelector('text=Page introuvable');
    await go(page, '#detail/movie/999999');
    await page.waitForSelector('text=Fiche indisponible');
    assert.match(await text(page, '.error-box'), /Contenu introuvable sur TMDB/);
    assert.equal(await page.locator('[data-action="retry-detail"]').count(), 1);
    await go(page, '#detail/movie/102', 'Film Test 2 (local)');
    await page.waitForSelector('text=Affichage hors ligne');
    assert.equal(await page.locator('[data-action="movie-status"][data-status="progress"]').getAttribute('aria-pressed'), 'true', 'le suivi reste utilisable hors ligne');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});

describe('F. Robustesse', () => {
  it('une section TMDB en erreur ne bloque pas les autres et peut être relancée', T, async () => {
    const { page, errors, mock, context } = await openApp(browser, { mock: { fail: ['/movie/top_rated'] } });
    await page.waitForSelector('#home-sec-top-movies .error-box');
    for (const id of ['trending', 'popular-movies', 'popular-tv', 'anime', 'upcoming']) await page.waitForSelector(`#rail-${id} .card`);
    assert.match(await text(page, '#home-sec-top-movies .error-box'), /erreur serveur/);
    mock.state.fail.clear();
    await page.locator('#home-sec-top-movies [data-action="retry-section"]').click();
    await page.waitForSelector('#rail-top-movies .card');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('sauvegarde corrompue : copie conservée, message clair, application utilisable', T, async () => {
    const { page, errors, context } = await openApp(browser, { storage: { 'crazy-liste-v1': '{oops' } });
    await page.waitForSelector('.banner-error');
    assert.match(await text(page, '.banner-error'), /illisible/);
    const backup = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('crazy-liste-v1-illisible-')).map((k) => localStorage.getItem(k)));
    assert.deepEqual(backup, ['{oops'], 'copie intacte de la sauvegarde illisible');
    await page.waitForSelector('#rail-trending .card');
    await page.locator('#rail-trending [data-item-key="movie-101"] [data-action="toggle-favorite"]').click();
    assert.equal((await store(page)).tracking['movie-101'].favorite, true);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('stockage indisponible : avertissement, interface fonctionnelle, aucune erreur', T, async () => {
    const { page, errors, context } = await openApp(browser, { initScript: () => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Accès refusé', 'SecurityError'); } }); } });
    await page.waitForSelector('.banner-warn');
    assert.match(await text(page, '.banner-warn'), /Stockage local indisponible/);
    await page.waitForSelector('#rail-trending .card');
    const fav = page.locator('#rail-trending [data-item-key="tv-201"] [data-action="toggle-favorite"]');
    await fav.click();
    assert.equal(await fav.textContent(), 'En favori');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('migration de l’ancien format « cinelog-data » : statuts explicites gardés, rien de propagé, original intact', T, async () => {
    const legacy = JSON.stringify({
      items: {
        'movie-102': { id: 102, media_type: 'movie', title: 'Film Test 2', status: 'progress', updatedAt: 1776020057449, seasons: {} },
        'movie-103': { id: 103, media_type: 'movie', title: 'Film Test 3', status: 'todo', updatedAt: 1776020057450, seasons: {} },
        'tv-201': { id: 201, media_type: 'tv', title: 'Série Alpha', status: 'todo', updatedAt: 1776020057451, seasons: { 1: { status: 'seen', episodes: { 3: 'seen' } } } }
      }, favorites: ['tv-201'], watchlist: [], history: []
    });
    const { page, errors, context } = await openApp(browser, { hash: '#library', storage: { 'cinelog-data': legacy } });
    await page.waitForSelector('.banner-info');
    assert.match(await text(page, '.banner-info'), /Ancienne sauvegarde reprise : 2 contenu/);
    const data = await store(page);
    assert.deepEqual(Object.keys(data.tracking).sort(), ['movie-102', 'tv-201'], 'simple consultation non reprise');
    assert.deepEqual(data.tracking['tv-201'].seasons, { 1: { episodes: { 3: 'seen' } } });
    assert.equal(await page.evaluate(() => localStorage.getItem('cinelog-data')), legacy, 'ancienne sauvegarde intacte');
    assert.ok(await page.evaluate(() => localStorage.getItem('crazy-liste-backup-legacy')), 'copie de secours créée');
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('crazy-liste-v1')).metadata['tv-201'].seasonSummaries || []).length === 4);
    await page.waitForFunction(() => document.querySelector('[data-status-for="tv-201"]').textContent === 'En cours');
    assert.equal(await text(page, '[data-status-for="movie-102"]'), 'En cours');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('import : fichier invalide refusé, sauvegarde complète fusionnée, remplacement avec copie, export', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#settings', acceptDownloads: true });
    await h1Is(page, 'Réglages');
    await page.setInputFiles('#import-file', { name: 'casse.json', mimeType: 'application/json', buffer: Buffer.from('{oops') });
    await page.waitForFunction(() => document.querySelector('#import-result').textContent.includes('Import refusé'));
    assert.match(await text(page, '#import-result'), /JSON valide/);
    await page.setInputFiles('#import-file', { name: 'autre.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') });
    await page.waitForFunction(() => document.querySelector('#import-result').textContent.includes('Format non reconnu'));
    const full = { app: 'crazy-liste', kind: 'full', schemaVersion: 1, tracking: {
      'tv-201': { inLibrary: true, favorite: true, seasons: { 1: { episodes: { 1: 'seen', 2: 'seen' } } }, lastActivityAt: 1770000000000, addedAt: 1770000000000 },
      'movie-104': { watchlist: true, addedAt: 1770000000000 } }, metadata: { 'tv-201': { title: 'Série Alpha', type: 'tv', id: 201 }, 'movie-104': { title: 'Film Test 4', type: 'movie', id: 104 } } };
    await page.setInputFiles('#import-file', { name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(full)) });
    await page.waitForSelector('#app-dialog[open]');
    assert.match(await text(page, '#dialog-content'), /2 contenu\(s\), 1 favori\(s\), 1 en watchlist, 2 épisode\(s\)/);
    await page.locator('#app-dialog [data-value="merge"]').click();
    await page.waitForFunction(() => document.querySelector('#import-result').textContent.includes('Import fusionné'));
    assert.deepEqual(Object.keys((await store(page)).tracking).sort(), ['movie-104', 'tv-201']);
    const lists = { app: 'crazy-liste', kind: 'lists', schemaVersion: 1, items: [{ key: 'movie-105', type: 'movie', id: 105, favorite: true, watchlist: false, title: 'Film Test 5' }] };
    await page.setInputFiles('#import-file', { name: 'listes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(lists)) });
    await page.waitForSelector('#app-dialog[open]');
    await page.locator('#app-dialog [data-value="replace"]').click();
    await page.waitForFunction(() => document.querySelector('#import-result').textContent.includes('remplacée'));
    assert.deepEqual(Object.keys((await store(page)).tracking), ['movie-105']);
    const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('crazy-liste-backup-before-import')));
    assert.deepEqual(Object.keys(backup.tracking).sort(), ['movie-104', 'tv-201'], 'liste précédente conservée en copie');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-action="export-full"]').click()]);
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.deepEqual([exported.app, exported.kind, Object.keys(exported.tracking)], ['crazy-liste', 'full', ['movie-105']]);
    assert.equal(exported.preferences.apiKey, undefined);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('clé TMDB : refusée si invalide, enregistrée si valide, retour à la clé intégrée', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#settings' });
    await h1Is(page, 'Réglages');
    await page.fill('#tmdb-key-input', INVALID_KEY);
    await page.locator('[data-action="key-save"]').click();
    await page.waitForFunction(() => document.querySelector('#key-result').textContent.includes('refuse'));
    assert.equal(await page.evaluate(() => localStorage.getItem('crazy-liste-v1')), null, 'clé refusée non enregistrée');
    await page.fill('#tmdb-key-input', 'abcdef0123456789abcdef0123456789');
    await page.locator('[data-action="key-save"]').click();
    await page.waitForFunction(() => document.querySelector('#key-result').textContent.includes('Clé valide'));
    assert.equal((await store(page)).preferences.apiKey, 'abcdef0123456789abcdef0123456789');
    await page.reload();
    await h1Is(page, 'Réglages');
    await page.locator('[data-action="key-reset"]').click();
    assert.equal((await store(page)).preferences.apiKey, '');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});

describe('Recherche', () => {
  it('saisie temporisée, filtres, Entrée, aucun résultat, erreur, réponses obsolètes ignorées', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#home' });
    await page.waitForSelector('#rail-trending .card');
    await page.locator('#search-input').pressSequentially('alpha', { delay: 40 });
    await page.waitForFunction(() => location.hash === '#search?q=alpha');
    await page.waitForSelector('#search-results .card');
    const titles = async () => page.$$eval('#search-results .card-title', (els) => els.map((e) => e.textContent));
    assert.deepEqual(await titles(), ['Série Alpha', SPECIAL_TITLE], 'personnes exclues');
    await page.locator('[data-action="search-type"][data-type="movie"]').click();
    await page.waitForFunction(() => location.hash === '#search?q=alpha&type=movie');
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 1);
    assert.deepEqual(await titles(), [SPECIAL_TITLE]);
    await page.locator('[data-action="search-type"][data-type="all"]').click();
    await page.fill('#search-input', 'zzz');
    await page.press('#search-input', 'Enter');
    await page.waitForSelector('text=Aucun résultat pour « zzz »');
    await page.fill('#search-input', 'boom');
    await page.press('#search-input', 'Enter');
    await page.waitForSelector('#search-results .error-box [data-action="retry-search"]');
    await page.fill('#search-input', 'lent');
    await page.press('#search-input', 'Enter');
    await page.waitForTimeout(150);
    await page.fill('#search-input', 'rapide');
    await page.press('#search-input', 'Enter');
    await page.waitForSelector('#search-results .card');
    assert.deepEqual(await titles(), ['Film Test 3']);
    await page.waitForTimeout(2000); // la réponse lente (1,5 s) arrive après : elle doit être ignorée
    assert.deepEqual(await titles(), ['Film Test 3']);
    assert.equal(await page.evaluate(() => location.hash), '#search?q=rapide');
    await page.goBack();
    await h1Is(page, 'Crazy Liste');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});

describe('Affichage', () => {
  it('textes avec apostrophes, guillemets et HTML affichés tels quels, sans injection', T, async () => {
    const { page, errors, context } = await openApp(browser);
    await page.waitForSelector('#rail-trending [data-item-key="movie-101"]');
    assert.equal(await text(page, '#rail-trending [data-item-key="movie-101"] .card-title'), SPECIAL_TITLE);
    assert.equal(await page.locator('.card-title b').count(), 0);
    await go(page, '#detail/movie/101', SPECIAL_TITLE);
    assert.match(await text(page, '.detail-overview'), /<script>window.__pwned=1<\/script>/);
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    await go(page, '#detail/tv/201', 'Série Alpha');
    await page.waitForSelector('#season-1 .ep');
    assert.equal(await text(page, '[data-ep="1-2"] .ep-title'), `Épisode 2 : L'épisode "piège" <i>n°2</i>`);
    assert.equal(await page.locator('.ep-title i').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('miniatures d’affiche visibles dans le panneau et raccourci « / » vers la recherche', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/103' });
    await page.waitForSelector('[data-action="movie-status"]');
    await page.locator('[data-action="movie-status"][data-status="progress"]').click();
    const topTag = await page.evaluate(() => {
      const r = document.querySelector('#resume-panel-list .resume-thumb').getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).tagName;
    });
    assert.equal(topTag, 'IMG', 'l’affiche passe au-dessus du titre de secours');
    await page.locator('h1').click();
    await page.keyboard.press('/');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search-input');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('thème clair et sombre (persistant)', T, async () => {
    const { page, errors, context } = await openApp(browser);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    assert.equal(await bg(), 'rgb(11, 12, 14)');
    await page.locator('.sidebar [data-action="toggle-theme"]').click();
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    assert.equal(await bg(), 'rgb(244, 245, 247)');
    await page.waitForSelector('#rail-trending .card');
    await page.waitForTimeout(300); // fin de la transition de couleur avant la capture
    await shot(page, 'desktop-clair');
    await page.reload();
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light', 'thème conservé après rechargement');
    await go(page, '#settings', 'Réglages');
    assert.equal(await page.locator('[data-action="set-theme"][data-theme="light"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-action="set-theme"][data-theme="dark"]').click();
    assert.equal(await bg(), 'rgb(11, 12, 14)');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('mobile (375 × 812) et tablette : barre de navigation basse, aucun débordement horizontal', T, async () => {
    const { page, errors, context } = await openApp(browser, { viewport: { width: 375, height: 812 } });
    await page.waitForSelector('#rail-trending .card');
    assert.ok(await page.locator('.bottom-nav').isVisible());
    assert.equal(await page.locator('.sidebar nav.nav').isVisible(), false, 'menu de gauche remplacé par la barre du bas');
    assert.ok(await page.locator('#stats-panel').isVisible(), 'statistiques et Reprendre sous le contenu');
    assert.ok(await noOverflow(page), 'accueil');
    await shot(page, 'mobile-accueil');
    await go(page, '#detail/tv/201', 'Série Alpha');
    await page.waitForSelector('#season-1 .ep');
    await page.locator('[data-action="episode-menu"][data-season="1"][data-episode="1"]').click();
    await page.locator('.ep-menu [data-action="episode-status"][data-season="1"][data-episode="1"][data-status="seen"]').click();
    assert.ok(await noOverflow(page), 'fiche série');
    await shot(page, 'mobile-fiche');
    await page.locator('.bottom-nav [data-nav="library"]').click();
    await h1Is(page, 'Bibliothèque');
    assert.ok(await noOverflow(page), 'bibliothèque');
    assert.equal(await page.locator('.bottom-nav [aria-current="page"]').getAttribute('data-nav'), 'library');
    await page.setViewportSize({ width: 820, height: 1180 });
    await go(page, '#detail/tv/201', 'Série Alpha');
    await page.waitForSelector('#season-1 .ep');
    assert.ok(await noOverflow(page), 'tablette');
    await shot(page, 'tablette-fiche');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
