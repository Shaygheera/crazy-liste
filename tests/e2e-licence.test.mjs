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
    assert.equal(C.licenceBase('KONOSUBA -An Explosion on This Wonderful World!'), 'konosuba', 'tiret collé au mot suivant');
    assert.equal(C.licenceBase("KONOSUBA -God's blessing on this wonderful world!"), 'konosuba');
    assert.equal(C.licenceBase('Spider-Man'), 'spider man', 'tiret à l’intérieur d’un mot : pas de coupure');
    assert.equal(C.licenceBaseOf({ title: 'Konosuba le film - Legend of Crimson', originalTitle: "KONOSUBA -God's blessing on this wonderful world!- Legend of Crimson" }), 'konosuba', 'la plus courte des deux');
    assert.equal(C.licenceBaseOf({ title: 'Boruto : Naruto Next Generations', originalTitle: 'BORUTO-ボルト- NARUTO NEXT GENERATIONS' }), 'boruto');
    assert.equal(C.licenceBase('The: Show'), '');
    assert.equal(C.inLicence('naruto', { title: 'Naruto Shippuden' }), true);
    assert.equal(C.inLicence('naruto', { title: 'Narutoverse' }), false, 'mot entier seulement');
    assert.equal(C.inLicence('boruto', { title: 'Two Blue Vortex', originalTitle: 'BORUTO: TWO BLUE VORTEX' }), true, 'titre original accepté');
  });
  it('liste par date, suite probable = série suivante ; anime : seulement l’animation', () => {
    const cur = { key: 'tv-1', type: 'tv', title: 'Boruto : Naruto Next Generations', date: '2017-04-05', genreIds: [16], originalLanguage: 'ja' };
    const cands = [
      { key: 'tv-2', type: 'tv', title: 'Boruto : Two Blue Vortex', date: '', genreIds: [] }, // fiche toute neuve : pas encore de genre
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
    assert.deepEqual(C.parseWikidataRelations(json), { next: ['tv-31910'], prev: ['movie-12'], anilist: [] });
    assert.deepEqual(C.parseWikidataRelations({ results: { bindings: [{ rel: { value: 'anilist' }, al: { value: '1735' } }, { rel: { value: 'anilist' }, al: { value: 'x' } }] } }).anilist, [1735]);
    assert.deepEqual(C.parseWikidataRelations(null), { next: [], prev: [], anilist: [] });
    assert.match(C.wikidataQuery(46260), /\{ \?item wdt:P156 \?x\. BIND\("next" AS \?rel\) OPTIONAL \{ \?x wdt:P4983 \?tv\. \}/, 'numéros TMDB cherchés dans chaque branche, jamais hors branche');
    assert.match(C.wikidataQuery('46260 } DROP'), /wdt:P4983 "NaN"/, 'identifiant non numérique neutralisé');
  });
});

describe('AniList : chaîne d’une licence', () => {
  it('maillon suivant / précédent : séries seulement, la plus proche dans le temps', () => {
    const n = (id, format, year, type = 'ANIME') => ({ id, type, format, startDate: { year, month: 1, day: 1 } });
    const media = { relations: { edges: [
      { relationType: 'SEQUEL', node: n(3, 'SPECIAL', 2016) }, { relationType: 'SEQUEL', node: n(4, 'TV', 2023) }, { relationType: 'SEQUEL', node: n(5, 'TV', 2018) },
      { relationType: 'SEQUEL', node: n(6, 'MANGA', 2010, 'MANGA') }, { relationType: 'PREQUEL', node: n(1, 'TV', 2002) }, { relationType: 'PREQUEL', node: n(2, 'ONA', 2007) },
      { relationType: 'ADAPTATION', node: n(7, 'TV', 2017) }
    ] } };
    assert.equal(C.anilistStep(media, 'SEQUEL').id, 5);
    assert.equal(C.anilistStep(media, 'PREQUEL').id, 2, 'le plus récent des précédents');
    assert.equal(C.anilistStep({}, 'SEQUEL'), null);
    const viaFilm = { relations: { edges: [{ relationType: 'SEQUEL', node: n(8, 'MOVIE', 2019) }, { relationType: 'SIDE_STORY', node: n(9, 'TV', 2023) }] } };
    assert.equal(C.anilistStep(viaFilm, 'SEQUEL'), null, 'séries seulement par défaut');
    assert.equal(C.anilistStep(viaFilm, 'SEQUEL', true).id, 8, 'saison 2 → film → saison 3 : on passe par le film');
    assert.equal(C.anilistTitle({ title: { english: null, romaji: 'NARUTO: Shippuuden' } }), 'NARUTO: Shippuuden');
  });
  it('correspondance AniList → TMDB par Wikidata ; requête bornée aux numéros', () => {
    assert.deepEqual(C.parseWikidataAnilistMap({ results: { bindings: [{ al: { value: '20' }, tv: { value: '46260' } }, { al: { value: '21' }, movie: { value: '9' } }, { al: { value: '20' }, movie: { value: '1' } }] } }), { 20: 'tv-46260', 21: 'movie-9' });
    assert.match(C.wikidataAnilistQuery([20, 1735, 'x', -3]), /VALUES \?al \{ "20" "1735" \}/);
    assert.match(C.anilistQuery('97938 }'), /Media\(id: NaN, type: ANIME\)/);
  });
});

describe('Licence : OVA et spéciaux', () => {
  it('AniList : films, OVA et spéciaux reliés, sans adaptations ni résumés', () => {
    const n = (id, format, year) => ({ id, type: 'ANIME', format, title: { romaji: 'T' + id }, startDate: { year, month: 3, day: 4 } });
    const media = { relations: { edges: [
      { relationType: 'SIDE_STORY', node: n(1, 'OVA', 2016) }, { relationType: 'ALTERNATIVE', node: n(2, 'MOVIE', 2015) }, { relationType: 'OTHER', node: n(3, 'SPECIAL', 2013) },
      { relationType: 'SUMMARY', node: n(4, 'SPECIAL', 2022) }, { relationType: 'CHARACTER', node: n(5, 'MOVIE', 2022) }, { relationType: 'SEQUEL', node: n(6, 'TV', 2020) },
      { relationType: 'SIDE_STORY', node: n(1, 'OVA', 2016) }
    ] } };
    assert.deepEqual(C.anilistExtras(media), [
      { al: 1, format: 'OVA', title: 'T1', date: '2016-03-04' }, { al: 2, format: 'MOVIE', title: 'T2', date: '2015-03-04' }, { al: 3, format: 'SPECIAL', title: 'T3', date: '2013-03-04' }
    ]);
  });
  it('rangement : type d’après AniList, placé sous la série reliée ; sans fiche TMDB : ajouté avec lien AniList', () => {
    const s1 = { key: 'tv-1', type: 'tv', title: 'Série Un', date: '2010-01-01' }, s2 = { key: 'tv-2', type: 'tv', title: 'Série Deux', date: '2015-01-01' };
    const film = { key: 'movie-7', type: 'movie', title: 'Série Un : OVA de Noël', date: '2016-12-01' };
    const autre = { key: 'movie-8', type: 'movie', title: 'Série Un : le film', date: '2011-06-01' };
    const r = C.attachExtras([{ series: s1, films: [film, autre] }, { series: s2, films: [] }], [], [
      { al: 70, format: 'SPECIAL', title: 'Spécial', date: '2014-01-01', seriesKey: 'tv-1', key: 'movie-7' },
      { al: 71, format: 'OVA', title: 'OVA sans fiche', date: '2016-02-02', seriesKey: 'tv-2', key: null },
      { al: 72, format: 'OVA', title: 'Série inconnue', date: '2016-02-02', seriesKey: 'tv-9', key: null }
    ]);
    assert.deepEqual(r.groups.map((g) => [g.series.key, g.films.map((x) => x.key + ':' + x.kind)]), [
      ['tv-1', ['movie-8:MOVIE', 'movie-7:SPECIAL']], ['tv-2', ['anilist-71:OVA']]
    ], 'type d’AniList prioritaire sur « OVA » dans le titre ; série inconnue ignorée');
    assert.equal(C.attachExtras([{ series: s1, films: [{ key: 'movie-3', type: 'movie', title: 'Série Un OVA 2' }] }], [], []).groups[0].films[0].kind, 'OVA', '« OVA » dans le titre');
  });
});

describe('Licence : séries et films', () => {
  it('chaque film va sous la série dont il reprend le nom, sinon sous la série en cours à sa sortie', () => {
    const tv = (id, title, date) => ({ key: 'tv-' + id, type: 'tv', id, title, date });
    const mv = (id, title, date) => ({ key: 'movie-' + id, type: 'movie', id, title, date });
    const { groups, orphans } = C.licenceGroups([
      tv(1, 'Naruto', '2002-10-03'), tv(2, 'Naruto Shippuden', '2007-02-15'), tv(3, 'Boruto : Naruto Next Generations', '2017-04-05'),
      mv(10, 'Naruto et la Princesse des neiges', '2004-08-21'), mv(11, 'Naruto Shippuden : Les Liens', '2008-08-02'),
      mv(12, 'Boruto : Naruto, le film', '2015-08-07'), mv(13, 'Naruto : Road to Ninja', '2012-07-28'), mv(14, 'The Last', '2014-12-06'), mv(15, 'Naruto the Last', '2014-12-06')
    ]);
    assert.deepEqual(groups.map((g) => [g.series.key, g.films.map((x) => x.key)]), [
      ['tv-1', ['movie-10']], ['tv-2', ['movie-11', 'movie-13', 'movie-15', 'movie-14']], ['tv-3', ['movie-12']]
    ], 'nom « Naruto » mais sorti pendant Shippuden : avec Shippuden ; « Boruto, le film » avant la série Boruto : avec Boruto');
    assert.deepEqual(orphans, [], 'aucun film perdu');
    assert.deepEqual(C.licenceGroups([mv(1, 'Seul', '2000-01-01')]), { groups: [], orphans: [mv(1, 'Seul', '2000-01-01')] });
  });
  it('recherche « Quand regarder … » : anime ou série, texte encodé', () => {
    const u = new URL(C.watchWhenSearchUrl('The Last : Naruto, le film', 'Naruto Shippuden', true));
    assert.equal(u.origin + u.pathname, 'https://www.google.com/search');
    assert.equal(u.searchParams.get('q'), "Quand regarder The Last : Naruto, le film dans l'anime Naruto Shippuden");
    assert.equal(new URL(C.watchWhenSearchUrl('A & B', 'C#D', false)).searchParams.get('q'), 'Quand regarder A & B dans la série C#D');
  });
});

describe('Licence : carte Diffusion', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  const col = (page, id) => page.locator('#detail-cards [data-col="' + id + '"]').textContent();
  const eras = (page) => page.$$eval('#detail-licence .lera[data-series]', (els) => els.map((e) => e.dataset.series));
  async function openLicence(page) {
    await page.locator('#detail-licence-btn .licbtn').click();
    await page.waitForSelector('#detail-licence:not([hidden]) .lera');
  }

  it('suite probable d’après la licence, titres de la licence par date, fiche ouverte mise en avant', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#detail/tv/216' });
    await page.waitForSelector('#detail-cards [data-col="suite"]');
    assert.match(await page.locator('#detail-cards .dcard-head').textContent(), /^Diffusion et suite/);
    assert.match(await col(page, 'suite'), /^Suite probableLicence Test : Seconde partie ›Série · à venir · même licence, après celui-ci$/);
    assert.equal(await page.locator('#detail-cards .dcols-4').count(), 1);
    assert.match(await col(page, 'next'), /Aucun nouvel épisode pour cette série/);
    assert.equal(await page.locator('#detail-cards .dlicence').count(), 0, 'plus de ligne d’étiquettes dans la carte');
    assert.match(await page.locator('.detail-meta .detail-badges').first().textContent(), /^Mon suivi :/, 'Mon suivi juste sous l’affiche');
    await page.waitForSelector('#detail-licence-btn .licbtn');
    assert.equal(await page.locator('#detail-licence-btn .licbtn').textContent(), '▾ Licence « Licence Test »3 séries · 1 film');
    assert.equal(await page.locator('#detail-licence').isHidden(), true, 'fermé par défaut');
    await openLicence(page);
    assert.equal(await page.locator('#detail-licence-btn .licbtn').getAttribute('aria-expanded'), 'true');
    assert.deepEqual(await eras(page), ['tv-219', 'tv-216', 'tv-217'], 'une ligne par série, par date ; faux ami « Licencieux » écarté');
    assert.deepEqual(await page.$$eval('#detail-licence [data-series="tv-216"] .lfilm', (els) => els.map((e) => e.dataset.itemKey)), ['movie-140'], 'le film va avec la série dont il reprend le nom');
    assert.equal(await page.locator('#detail-licence .lera.is-current').getAttribute('data-series'), 'tv-216');
    // Films liés, juste au-dessus des saisons, avec une recherche « Quand le regarder ? »
    assert.deepEqual(await page.$$eval('#detail-films .film-row', (els) => els.map((e) => e.dataset.itemKey)), ['movie-140']);
    assert.equal(await page.evaluate(() => document.getElementById('detail-films').nextElementSibling.id), 'seasons-section');
    const search = page.locator('#detail-films .film-row-search');
    assert.equal(await search.getAttribute('target'), '_blank');
    assert.equal(await search.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(new URL(await search.getAttribute('href')).searchParams.get('q'), 'Quand regarder Licence Test : le film dans la série Licence Test : Première partie');
    assert.doesNotMatch(await page.locator('#detail-films').textContent(), /Histoire/, 'aucun avis « histoire / hors histoire »');
    assert.match(await page.locator('#detail-licence .lera.is-current').textContent(), /tu es ici/);
    assert.ok(mock.state.requests.some((r) => r.startsWith('/search/multi') && /query=licence\+test/.test(r)));
    assert.ok(mock.state.requests.some((r) => r.startsWith('/search/movie') && /query=licence\+test/.test(r)), 'films cherchés pour chaque série');
    await page.locator('#detail-licence .lfilm[data-item-key="movie-140"]').click();
    await page.waitForFunction(() => location.hash === '#detail/movie/140');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('fiche d’un film : bouton Licence aussi, le film ouvert est mis en avant sous sa série', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/140' });
    await page.waitForSelector('#detail-licence-btn .licbtn');
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-219', 'tv-216', 'tv-217']);
    assert.equal(await page.locator('#detail-licence [data-series="tv-216"] .lfilm.is-current').getAttribute('data-item-key'), 'movie-140');
    assert.match(await page.locator('#detail-licence .lfilm.is-current').textContent(), /Film[\s\S]*tu es ici/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('suite confirmée par Wikidata, même avec un titre différent', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#detail-cards [data-col="suite"]');
    assert.match(await col(page, 'suite'), /^SuiteAnime Bêta ›Anime · 2019$/);
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-202', 'tv-201'], 'même date : ordre alphabétique');
    await page.locator('#detail-licence [data-action="licence-toggle"]').click();
    assert.equal(await page.locator('#detail-licence').isHidden(), true, '« Fermer » replie le panneau');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('chaîne AniList : titres aux noms différents reliés, suite confirmée, licence nommée d’après le premier titre', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/221' });
    await page.waitForSelector('#detail-cards [data-col="suite"]');
    assert.match(await col(page, 'suite'), /^SuiteTroisième Volet ›Anime · 2015$/);
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-220', 'tv-221', 'tv-222']);
    assert.match(await page.locator('#detail-licence .licence-head h2').textContent(), /^Licence « Chaîne Un »$/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('suite annoncée par AniList mais absente de TMDB : nommée, sans lien ; le spécial est ignoré', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/222' });
    await page.waitForSelector('#detail-cards [data-col="suite"]');
    assert.equal(await col(page, 'suite'), 'Suite annoncéeChaine Yon : le retourAnime · en production · pas encore sur TMDB');
    assert.equal(await page.locator('#detail-cards [data-col="suite"] a').count(), 0);
    assert.match(await page.locator('#detail-licence-btn .licbtn').textContent(), /4 séries · 0 film · 1 OVA \/ spécial$/, 'la suite annoncée compte comme série ; le spécial relié est compté');
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-220', 'tv-221', 'tv-222']);
    assert.match(await page.locator('#detail-licence .lera.is-announced').textContent(), /Chaine Yon : le retour[\s\S]*annoncée · pas encore sur TMDB/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('AniList injoignable : la suite trouvée par Wikidata ou par le titre reste affichée, aucune erreur', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/216' });
    await context.route('https://graphql.anilist.co/**', (r) => r.abort());
    await page.reload();
    await page.waitForSelector('#detail-cards [data-col="suite"]');
    assert.match(await col(page, 'suite'), /^Suite probable/);
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
    assert.equal(await page.locator('#detail-licence-btn .licbtn').count(), 0, 'pas de bouton Licence sans titre lié');
    assert.equal(await page.locator('#detail-films .film-row').count(), 0, 'pas de section Films liés sans film');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
