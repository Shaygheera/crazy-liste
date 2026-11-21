// Recherche ciblée et découverte : logique des filtres (Node) puis parcours dans Chrome avec TMDB simulé.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, duplicateIds } from './helpers/browser.mjs';

const { Core: C } = loadCore();
const T = { timeout: 60000 };

describe('Filtres : lecture et requêtes', () => {
  it('valeurs invalides écartées, années remises dans l’ordre, statut réservé aux séries', () => {
    assert.deepEqual(C.parseSearchFilters({ type: 'anime', status: 'ended', from: '2020', to: '2010', genre: '10765', rating: '7', sort: 'rating' }),
      { type: 'anime', status: 'ended', from: '2010', to: '2020', genre: '10765', rating: '7', sort: 'rating' });
    assert.deepEqual(C.parseSearchFilters({ type: 'x', status: 'ended', from: '99', to: '3000', genre: '<b>', rating: '9', sort: 'hack' }),
      { type: 'all', status: 'any', from: '', to: '', genre: '', rating: '', sort: '' });
    assert.equal(C.parseSearchFilters({ type: 'movie', status: 'ended' }).status, 'any');
    assert.equal(C.parseSearchFilters({ type: 'movie', genre: '10765' }).genre, '', 'genre de série refusé pour les films');
    assert.equal(C.parseSearchFilters({ type: 'anime', genre: '16' }).genre, '', 'animation déjà implicite pour les anime');
  });
  it('anime terminés les mieux notés : une requête /discover/tv complète', () => {
    const [r, ...rest] = C.discoverRequests(C.parseSearchFilters({ type: 'anime', status: 'ended', from: '2010', rating: '8', sort: 'rating' }), 2, '2026-11-21');
    assert.equal(rest.length, 0);
    assert.equal(r.path, '/discover/tv');
    assert.deepEqual(r.params, { page: 2, include_adult: 'false', include_null_first_air_dates: 'false', with_genres: '16', with_original_language: 'ja',
      'first_air_date.gte': '2010-01-01', 'vote_average.gte': '8', 'vote_count.gte': '300', with_status: '3|4', sort_by: 'vote_average.desc' });
  });
  it('« Tout » interroge films et séries ; « Plus récents » exclut ce qui n’est pas sorti', () => {
    const reqs = C.discoverRequests(C.parseSearchFilters({ sort: 'newest' }), 1, '2026-11-21');
    assert.deepEqual(reqs.map((r) => r.path), ['/discover/movie', '/discover/tv']);
    assert.equal(reqs[0].params['primary_release_date.lte'], '2026-11-21');
    assert.equal(reqs[1].params.sort_by, 'first_air_date.desc');
  });
  it('seuil de votes assoupli par niveaux (périodes récentes)', () => {
    const f = C.parseSearchFilters({ type: 'anime', sort: 'rating' });
    assert.deepEqual([0, 1, 2].map((l) => C.discoverRequests(f, 1, '2026-11-21', l)[0].params['vote_count.gte']), ['300', '100', '30']);
    assert.deepEqual([0, 1, 2].map((l) => C.minVotesFor(C.parseSearchFilters({ type: 'movie', rating: '7' }), true, l)), [100, 30, 10]);
    assert.equal(C.minVotesFor(C.parseSearchFilters({ type: 'movie' }), true, 0), 0);
  });
  it('filtre local et tri des résultats d’une recherche par titre', () => {
    const anime = { key: 'tv-1', type: 'tv', date: '2015-04-05', genreIds: [16, 10765], originalLanguage: 'ja', voteAverage: 8.7 };
    const film = { key: 'movie-2', type: 'movie', date: '2001-01-01', genreIds: [27], voteAverage: 6.1 };
    const f = C.parseSearchFilters({ type: 'anime', status: 'ongoing', from: '2010', rating: '8' });
    assert.equal(C.matchesFilters(anime, f, 'Returning Series'), true);
    assert.equal(C.matchesFilters(anime, f, 'Ended'), false);
    assert.equal(C.matchesFilters(anime, f, undefined), false, 'statut inconnu : écarté plutôt que deviné');
    assert.equal(C.matchesFilters(film, C.parseSearchFilters({ type: 'movie', to: '2000' })), false);
    assert.deepEqual(C.sortResults([film, anime], 'rating').map((x) => x.key), ['tv-1', 'movie-2']);
    assert.deepEqual(C.sortResults([film, anime], 'oldest').map((x) => x.key), ['movie-2', 'tv-1']);
    assert.deepEqual(C.mergeResults([[film], [anime, film]], '').map((x) => x.key), ['movie-2', 'tv-1'], 'alternance sans doublon');
  });
});

describe('Découverte dans la page Recherche', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  const titles = (page) => page.$$eval('#search-results .card-title', (els) => els.map((e) => e.textContent));
  const settle = (page) => page.waitForFunction(() => !document.querySelector('#search-results [aria-busy="true"]'));

  it('sans titre : anime → terminés → mieux notés, filtres gardés dans l’adresse et au rechargement', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#search' });
    await page.waitForSelector('#search-results .ideas');
    await page.locator('[data-action="search-type"][data-type="anime"]').click();
    await page.waitForFunction(() => location.hash === '#search?type=anime');
    await page.waitForSelector('#search-results .card');
    assert.deepEqual(await titles(page), ['Anime Bêta', 'Anime Oméga', 'Anime Sigma', 'Anime Bientôt', 'Anime Patience', 'Anime Mystère'], 'uniquement les anime japonais (pas le dessin animé américain)');
    await page.selectOption('select[data-filter="status"]', 'ended');
    await page.waitForFunction(() => location.hash === '#search?type=anime&status=ended');
    await settle(page);
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 2);
    await page.selectOption('select[data-filter="sort"]', 'rating');
    await page.waitForFunction(() => location.hash === '#search?type=anime&status=ended&sort=rating');
    await settle(page);
    await page.waitForFunction(() => document.querySelector('#search-results .card-title').textContent === 'Anime Sigma');
    assert.deepEqual(await titles(page), ['Anime Sigma', 'Anime Bêta'], 'triés par note');
    assert.match(await page.locator('#search-results [role="status"]').textContent(), /Anime · terminés · triés : mieux notés/);
    const last = mock.state.requests.filter((r) => r.startsWith('/discover/tv')).pop();
    assert.match(last, /with_status=3%7C4/);
    assert.match(last, /sort_by=vote_average.desc/);
    await page.reload();
    await page.waitForSelector('#search-results .card');
    assert.equal(await page.locator('select[data-filter="status"]').inputValue(), 'ended');
    assert.deepEqual(await titles(page), ['Anime Sigma', 'Anime Bêta'], 'mêmes résultats après rechargement');
    await page.locator('[data-action="search-reset"]').click();
    await page.waitForFunction(() => location.hash === '#search?type=anime');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('années et note : bornes appliquées ; aucun résultat expliqué ; idée de découverte en un clic', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#search?type=tv' });
    await page.waitForSelector('#search-results .card');
    await page.fill('input[data-filter="from"]', '2010');
    await page.press('input[data-filter="from"]', 'Enter');
    await page.waitForFunction(() => location.hash === '#search?type=tv&from=2010');
    await settle(page);
    await page.fill('input[data-filter="to"]', '2016');
    await page.press('input[data-filter="to"]', 'Enter');
    await page.waitForFunction(() => location.hash === '#search?type=tv&from=2010&to=2016');
    await settle(page);
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 2);
    assert.deepEqual((await titles(page)).sort(), ['Anime Oméga', 'Dessin animé Kappa']);
    await page.selectOption('select[data-filter="rating"]', '8');
    await settle(page);
    await page.fill('input[data-filter="to"]', '2011');
    await page.press('input[data-filter="to"]', 'Enter');
    await page.waitForSelector('text=Aucun résultat : Séries · sortis de 2010 à 2011 · note 8+');
    await page.evaluate(() => { location.hash = '#search'; });
    await page.locator('[data-action="discover"]', { hasText: 'Anime terminés les mieux notés' }).click();
    await page.waitForFunction(() => location.hash === '#search?type=anime&status=ended&sort=rating');
    await page.waitForSelector('#search-results .card');
    assert.equal((await titles(page))[0], 'Anime Sigma');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('avec un titre : filtres appliqués aux résultats (statut lu dans la fiche), tri par note', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#search?q=anime' });
    await page.waitForSelector('#search-results .card');
    assert.equal((await titles(page)).length, 5);
    await page.locator('[data-action="search-type"][data-type="anime"]').click();
    await page.waitForFunction(() => location.hash === '#search?q=anime&type=anime');
    await settle(page);
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 3);
    await page.selectOption('select[data-filter="status"]', 'ongoing');
    await settle(page);
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 1);
    assert.deepEqual(await titles(page), ['Anime Oméga']);
    assert.match(await page.locator('#search-results [role="status"]').textContent(), /écarté\(s\) par tes filtres/);
    await page.selectOption('select[data-filter="status"]', 'any');
    await page.selectOption('select[data-filter="sort"]', 'rating');
    await settle(page);
    await page.waitForFunction(() => document.querySelector('#search-results .card-title').textContent === 'Anime Sigma');
    assert.deepEqual(await titles(page), ['Anime Sigma', 'Anime Oméga', 'Anime Bêta']);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('mieux notés sur une période récente : le seuil de votes s’assouplit au lieu de ne rien montrer', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#search?type=anime&from=2015&sort=rating' });
    await page.waitForSelector('#search-results .card');
    assert.deepEqual(await titles(page), ['Anime Oméga', 'Anime Patience', 'Anime Bientôt', 'Anime Bêta', 'Anime Mystère'], 'anime sortis depuis 2015, triés par note');
    const thresholds = mock.state.requests.filter((r) => r.startsWith('/discover/tv')).map((r) => new URLSearchParams(r.split('?')[1]).get('vote_count.gte'));
    assert.deepEqual(thresholds, ['300', '100', '30'], 'moins de 10 titres : seuils assouplis jusqu’au plus souple');
    assert.match(await page.locator('#search-results').textContent(), /Peu de votes sur cette période : titres notés par au moins 30 personnes/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('téléphone : filtres lisibles sans défilement horizontal', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#search?type=anime&status=ended', viewport: { width: 375, height: 812 } });
    await page.waitForSelector('#search-results .card');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'pas de débordement horizontal');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
