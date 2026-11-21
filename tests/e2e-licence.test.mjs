// Suite et licence d'une série : règles (Node) puis carte Diffusion dans Chrome (TMDB et Wikidata simulés).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, duplicateIds } from './helpers/browser.mjs';

const { Core: C } = loadCore();
const T = { timeout: 60000 };

describe('Licence : règles', () => {
  it('début de titre commun : avant « : », « - » ou « ( » ; accents et casse ignorés ; trop court ou générique : rien', () => {
    assert.equal(C.licenceBase('Boruto : Naruto Next Generations'), 'boruto');
    assert.equal(C.licenceBase('Boruto: Two Blue Vortex'), 'boruto');
    assert.equal(C.licenceBase('Dr. Stone: New World'), 'dr stone');
    assert.equal(C.licenceBase('Naruto Shippuden'), 'naruto shippuden');
    assert.equal(C.licenceBase('Élite - Histoires courtes'), 'elite');
    assert.equal(C.licenceBase('Up'), '');
    assert.equal(C.licenceBase('The: Show'), '');
    assert.equal(C.inLicence('naruto', { title: 'Naruto Shippuden' }), true);
    assert.equal(C.inLicence('naruto', { title: 'Narutoverse' }), false, 'mot entier seulement');
    assert.equal(C.inLicence('boruto', { title: 'Two Blue Vortex', originalTitle: 'BORUTO: TWO BLUE VORTEX' }), true, 'titre original accepté');
  });
  it('liste par date, suite probable = série suivante ; anime : seulement l’animation', () => {
    const cur = { key: 'tv-1', type: 'tv', title: 'Boruto : Naruto Next Generations', date: '2017-04-05', genreIds: [16], originalLanguage: 'ja' };
    const cands = [
      { key: 'tv-2', type: 'tv', title: 'Boruto : Two Blue Vortex', date: '', genreIds: [16] },
      { key: 'movie-3', type: 'movie', title: 'Boruto : Naruto, le film', date: '2015-08-07', genreIds: [16, 28] },
      { key: 'tv-4', type: 'tv', title: 'Boruto (série live)', date: '2024-01-01', genreIds: [18] },
      { key: 'tv-5', type: 'tv', title: 'Borutopia', date: '2019-01-01', genreIds: [16] },
      { key: 'tv-1', type: 'tv', title: 'Boruto : Naruto Next Generations', date: '2017-04-05', genreIds: [16] }
    ];
    const list = C.licenceList(cur, cands, 'boruto');
    assert.deepEqual(list.map((x) => x.key), ['movie-3', 'tv-1', 'tv-2'], 'film, fiche ouverte, suite sans date en dernier ; pas de doublon ni de faux ami');
    assert.equal(C.probableNext(list, cur).key, 'tv-2');
    assert.equal(C.probableNext([cur], cur), null);
  });
  it('Wikidata : titres suivants et précédents, numéros TMDB seulement', () => {
    const json = { results: { bindings: [
      { rel: { value: 'next' }, tv: { value: '31910' } },
      { rel: { value: 'next' }, tv: { value: '31910' } },
      { rel: { value: 'prev' }, movie: { value: '12' } },
      { rel: { value: 'next' } },
      { rel: { value: 'autre' }, tv: { value: '9' } },
      { rel: { value: 'next' }, tv: { value: '<b>' } }
    ] } };
    assert.deepEqual(C.parseWikidataRelations(json), { next: ['tv-31910'], prev: ['movie-12'] });
    assert.deepEqual(C.parseWikidataRelations(null), { next: [], prev: [] });
    assert.match(C.wikidataQuery('46260 } DROP'), /wdt:P4983 "NaN"/, 'identifiant non numérique neutralisé');
  });
});

describe('Licence : carte Diffusion', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  const col = (page, id) => page.locator('#detail-cards [data-col="' + id + '"]').textContent();

  it('suite probable d’après la licence, titres de la licence par date, fiche ouverte mise en avant', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#detail/tv/216' });
    await page.waitForSelector('#detail-cards [data-col="suite"]');
    assert.match(await page.locator('#detail-cards .dcard-head').textContent(), /^Diffusion et suite/);
    assert.match(await col(page, 'suite'), /^Suite probableLicence Test : Seconde partie ›Série · à venir · même licence, après celui-ci$/);
    assert.equal(await page.locator('#detail-cards .dcols-4').count(), 1);
    assert.match(await col(page, 'next'), /Aucun nouvel épisode pour cette série/);
    assert.deepEqual(await page.$$eval('#detail-cards .lic', (els) => els.map((e) => e.dataset.lic)), ['tv-219', 'movie-140', 'tv-216', 'tv-217'], 'par date, faux ami « Licencieux » écarté');
    assert.equal(await page.locator('#detail-cards .lic-current').getAttribute('data-lic'), 'tv-216');
    assert.match(await page.locator('.dlicence-label').textContent(), /Licence « Licence Test » :/);
    assert.ok(mock.state.requests.some((r) => r.startsWith('/search/multi') && /query=licence\+test/.test(r)));
    await page.locator('#detail-cards a.lic[data-lic="movie-140"]').click();
    await page.waitForFunction(() => location.hash === '#detail/movie/140');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('suite confirmée par Wikidata, même avec un titre différent', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#detail-cards [data-col="suite"]');
    assert.match(await col(page, 'suite'), /^SuiteAnime Bêta ›Anime · 2019$/);
    assert.deepEqual(await page.$$eval('#detail-cards .lic', (els) => els.map((e) => e.dataset.lic)), ['tv-201', 'tv-202']);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('Wikidata injoignable et aucun titre lié : pas de colonne Suite, aucune erreur', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/205' });
    await context.route('https://query.wikidata.org/**', (r) => r.abort());
    await page.reload();
    await page.waitForSelector('#detail-cards .dcard-head');
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#detail-cards [data-col="suite"]').count(), 0);
    assert.equal(await page.locator('#detail-cards .dlicence').count(), 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
