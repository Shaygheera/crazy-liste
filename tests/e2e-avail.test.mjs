// Disponibilité : sorti ou non, au cinéma ou en vidéo (Node), étiquettes et case « Seulement les titres disponibles » (Chrome).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, store } from './helpers/browser.mjs';

const { Core: C } = loadCore();
const T = { timeout: 60000 };
const TODAY = '2026-11-21';
const rel = (country, type, date) => ({ iso_3166_1: country, release_dates: [{ type, release_date: date + 'T00:00:00.000Z' }] });

describe('Disponibilité : règles', () => {
  it('film : à venir, au cinéma, disponible (vidéo FR ou US), ou à vérifier', () => {
    const m = (date) => ({ key: 'movie-1', type: 'movie', date });
    assert.equal(C.availabilityOf(m('2026-12-16'), TODAY), 'upcoming');
    assert.equal(C.availabilityOf(m(''), TODAY), 'upcoming', 'sans date : pas encore sorti');
    assert.equal(C.availabilityOf(m('2026-10-01'), TODAY), 'unknown', 'sortie récente : à vérifier');
    assert.equal(C.availabilityOf(m('2026-10-01'), TODAY, { results: [rel('FR', 3, '2026-10-01')] }), 'cinema');
    assert.equal(C.availabilityOf(m('2026-10-01'), TODAY, { results: [rel('US', 4, '2026-11-10')] }), 'available', 'vidéo à la demande aux États-Unis');
    assert.equal(C.availabilityOf(m('2026-10-01'), TODAY, { results: [rel('FR', 4, '2026-11-26')] }), 'cinema', 'sortie vidéo française pas encore passée');
    assert.equal(C.availabilityOf(m('2026-10-01'), TODAY, { results: [rel('DE', 4, '2026-10-20')] }), 'cinema', 'seuls la France et les États-Unis comptent');
    assert.equal(C.availabilityOf(m('2025-01-10'), TODAY), 'available', 'sorti depuis plus de 9 mois');
  });
  it('série : à venir avant le premier épisode, sinon disponible ; filtre garde l’inconnu', () => {
    assert.equal(C.availabilityOf({ type: 'tv', date: '2027-01-01' }, TODAY), 'upcoming');
    assert.equal(C.availabilityOf({ type: 'tv', date: '2026-11-20' }, TODAY), 'available');
    assert.deepEqual(['upcoming', 'cinema', 'available', 'unknown', 'released'].map(C.isAvailable), [false, false, true, true, true]);
  });
  it('découverte : la case demande à TMDB les films déjà sortis en vidéo', () => {
    const [mv, tv] = C.discoverRequests(C.parseSearchFilters({}), 1, TODAY, 0, true);
    assert.equal(mv.params.with_release_type, '4|5|6');
    assert.equal(mv.params['release_date.lte'], TODAY);
    assert.equal(tv.params['first_air_date.lte'], TODAY);
  });
});

describe('Disponibilité : miniatures et filtre', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  it('TMDB injoignable pour un film récent : étiquette « Sorti », jamais vide', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#search?q=sortie', mock: { fail: ['/movie/130/release_dates'] } });
    await page.waitForSelector('#search-results .card');
    await page.waitForFunction(() => document.querySelector('[data-item-key="movie-130"] .avail').textContent === 'Sorti');
    assert.equal(await page.locator('#search-results .card .avail:empty').count(), 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  const label = (page, key) => page.locator('#search-results [data-item-key="' + key + '"] .avail').textContent();

  it('étiquettes sur les miniatures, puis case cochée : seuls les titres disponibles restent, et le choix est retenu', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#search?q=sortie' });
    await page.waitForSelector('#search-results .card');
    await page.waitForFunction(() => document.querySelector('[data-item-key="movie-130"] .avail').textContent === 'Au cinéma');
    assert.equal(await label(page, 'movie-130'), 'Au cinéma');
    await page.waitForFunction(() => document.querySelector('[data-item-key="movie-131"] .avail').textContent === 'Disponible');
    assert.match(await label(page, 'movie-122'), /^À venir · 1er mai 2027$/);
    assert.equal(await label(page, 'movie-101'), 'Disponible', 'film de 2022 : disponible sans vérification');
    assert.equal(await page.locator('#search-results [data-item-key="tv-201"] .avail').textContent(), 'Disponible', 'série déjà diffusée : disponible');
    assert.equal(await page.locator('#search-results .card .avail:empty').count(), 0, 'aucune miniature sans étiquette');
    assert.equal(mock.state.releaseChecks, 2, 'seuls les deux films récents sont vérifiés auprès de TMDB');
    await page.locator('#search-filters [data-change="only-available"]').check();
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 3);
    const keys = await page.$$eval('#search-results .card', (els) => els.map((e) => e.dataset.itemKey));
    assert.deepEqual(keys, ['movie-131', 'movie-101', 'tv-201']);
    assert.match(await page.locator('#search-results [role="status"]').textContent(), /2 pas encore disponible\(s\), masqué\(s\)/);
    assert.equal((await store(page)).preferences.onlyAvailable, true, 'choix enregistré');
    await page.evaluate(() => { location.hash = '#home'; });
    await page.waitForSelector('#rail-trending .card');
    assert.equal(await page.locator('.page-head [data-change="only-available"]').isChecked(), true, 'même case sur l’accueil');
    assert.match(await page.locator('#home-sec-upcoming').textContent(), /Tout est masqué|Film Test/, 'films à venir masqués');
    assert.equal(await page.locator('#home-sec-upcoming [data-item-key="movie-122"]').count(), 0);
    await page.locator('.page-head [data-change="only-available"]').uncheck();
    await page.waitForSelector('#home-sec-upcoming [data-item-key="movie-122"]');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('deux dates selon la source TMDB : le statut suit toujours la date affichée (cas Wildwood)', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#search?q=deux' });
    await page.waitForSelector('[data-item-key="movie-135"] [data-avail]');
    assert.equal(await page.locator('[data-item-key="movie-135"] [data-avail]').getAttribute('data-avail'), 'upcoming', 'date de la liste dans 40 jours : à venir');
    await page.evaluate(() => { location.hash = '#detail/movie/135'; });
    await page.waitForSelector('.dcol-avail [data-avail]');
    await page.waitForFunction(() => document.querySelector('.dcol-avail [data-avail]').dataset.avail !== 'unknown');
    assert.equal(await page.locator('.dcol-avail [data-avail]').getAttribute('data-avail'), 'cinema', 'fiche : sortie il y a 20 jours, pas encore en vidéo');
    assert.doesNotMatch(await page.locator('.dcol-avail').textContent(), /À venir/);
    await page.evaluate(() => { location.hash = '#search?q=deux'; });
    await page.waitForSelector('[data-item-key="movie-135"] [data-avail]');
    assert.equal(await page.locator('[data-item-key="movie-135"] [data-avail]').getAttribute('data-avail'), 'upcoming', 'la liste garde sa propre date');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('découverte : la case ajoute le filtre de sortie vidéo à la requête TMDB', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#search?type=movie' });
    await page.waitForSelector('#search-results .card');
    await page.locator('#search-filters [data-change="only-available"]').check();
    await page.waitForFunction(() => document.querySelector('#search-filters [data-change="only-available"]').checked);
    await page.waitForFunction(() => !document.querySelector('#search-results [aria-busy="true"]'));
    const last = mock.state.requests.filter((r) => r.startsWith('/discover/movie')).pop();
    assert.match(last, /with_release_type=4%7C5%7C6/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
