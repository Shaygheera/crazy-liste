// Où regarder, genres en « Tout », statuts de diffusion (en cours / saison annoncée), page « À venir » et statistiques détaillées.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, store, duplicateIds } from './helpers/browser.mjs';

const { Core: C, Data: D } = loadCore();
const T = { timeout: 60000 };
const TODAY = '2026-11-21';
const F = (p) => C.parseSearchFilters(p);
const iso = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

describe('Règles : plateformes, genres, diffusion', () => {
  it('plateformes françaises : doublons retirés, ordre TMDB, rien hors de France', () => {
    const raw = { results: { FR: { link: 'https://www.themoviedb.org/movie/1/watch?locale=FR',
      flatrate: [{ provider_id: 2, provider_name: 'B', display_priority: 5 }, { provider_id: 1, provider_name: 'A', logo_path: '/a.jpg', display_priority: 1 }, { provider_id: 1, provider_name: 'A', display_priority: 1 }],
      buy: [{ provider_id: 3, provider_name: '<b>C</b>' }] }, US: { flatrate: [{ provider_id: 9, provider_name: 'US' }] } } };
    const p = C.pickProviders(raw, 'FR');
    assert.deepEqual(p.groups.map((g) => [g.label, g.list.map((x) => x.name)]), [['Abonnement', ['A', 'B']], ['Achat', ['<b>C</b>']]]);
    assert.equal(p.link, 'https://www.themoviedb.org/movie/1/watch?locale=FR');
    assert.equal(C.pickProviders({ results: { US: raw.results.US } }, 'FR'), null);
    const variants = C.pickProviders({ results: { FR: { flatrate: ['Netflix', 'Amazon Prime Video', 'Crunchyroll', 'Netflix Standard with Ads', 'Amazon Prime Video with Ads', 'Crunchyroll Amazon Channel', 'Anime Digital Network Amazon Channel', 'Paramount+ Amazon Channel']
      .map((n, i) => ({ provider_id: i + 1, provider_name: n, display_priority: i })) } } }, 'FR');
    assert.deepEqual(variants.groups[0].list.map((x) => x.name), ['Netflix', 'Amazon Prime Video', 'Crunchyroll', 'Anime Digital Network Amazon Channel', 'Paramount+ Amazon Channel'], 'variantes regroupées avec le service principal ; seules, elles gardent leur nom');
    assert.deepEqual(variants.groups[0].list[0].also, ['Netflix Standard with Ads']);
    assert.equal(C.providerBase('Animation Digital Network'), C.providerBase('Anime Digital Network Amazon Channel'));
    assert.equal(C.pickProviders({ results: { FR: { link: 'javascript:alert(1)', rent: [{ provider_id: 4, provider_name: 'D' }] } } }, 'FR').link, '', 'lien douteux écarté');
  });
  it('« Tout » : genres communs, équivalent série, genres propres aux films', () => {
    const labels = C.genresFor('all').map(([, l]) => l);
    assert.ok(labels.includes('Science-fiction') && labels.includes('Horreur (films)'));
    const [mv, tv] = C.discoverRequests(F({ genre: '878' }), 1, TODAY);
    assert.equal(mv.params.with_genres, '878');
    assert.equal(tv.params.with_genres, '10765', 'science-fiction → « Science-fiction & fantastique » côté séries');
    assert.deepEqual(C.discoverRequests(F({ genre: '27' }), 1, TODAY).map((r) => r.type), ['movie'], 'horreur : films seulement');
    assert.equal(C.matchesFilters({ type: 'tv', genreIds: [10765], date: '2020-01-01' }, F({ genre: '14' })), true);
    assert.equal(C.matchesFilters({ type: 'tv', genreIds: [18], date: '2020-01-01' }, F({ genre: '27' })), false);
  });
  it('en cours de diffusion = épisode dans les 14 jours ; saison annoncée à moins ou plus de 6 mois', () => {
    const info = (airDate, extra) => Object.assign({ status: 'Returning Series', nextEpisode: airDate === undefined ? null : { season: 2, episode: 1, airDate } }, extra);
    assert.equal(C.isAiringSoon({ airDate: '2026-11-28' }, TODAY), true);
    assert.equal(C.isAiringSoon({ airDate: '2027-01-15' }, TODAY), false);
    const tv = { type: 'tv', genreIds: [18], date: '2020-01-01' };
    const m = (status, i) => C.matchesFilters(tv, F({ type: 'tv', status }), i, TODAY);
    assert.equal(m('airing', info('2026-11-24')), true);
    assert.equal(m('soon', info('2026-11-24')), false, 'en cours de diffusion n’est pas une saison annoncée');
    assert.equal(m('soon', info('2027-03-01')), true);
    assert.equal(m('later', info('2027-03-01')), false);
    assert.equal(m('later', info('2027-09-01')), true);
    assert.equal(m('later', info(undefined, { seasons: [{ number: 1, airDate: '2020-01-01', episodeCount: 8 }, { number: 2, airDate: '', episodeCount: 0 }] })), true, 'saison annoncée sans date');
    assert.equal(m('later', info(undefined, { seasons: [{ number: 1, airDate: '2020-01-01', episodeCount: 8 }] })), false, 'rien d’annoncé');
    assert.equal(m('soon', info('2027-03-01', { status: 'Ended' })), false);
    assert.equal(m('ongoing', info('2026-11-24')), true, '« Pas terminés (tous) » garde aussi les séries en cours de diffusion');
    const [air] = C.discoverRequests(F({ type: 'anime', status: 'airing' }), 1, TODAY);
    assert.equal(air.params['air_date.gte'], TODAY);
    assert.equal(air.params['air_date.lte'], '2026-12-05');
    const [soon] = C.discoverRequests(F({ type: 'tv', status: 'soon' }), 1, TODAY);
    assert.equal(soon.params.with_status, '0|1|2');
    assert.equal(soon.params['air_date.lte'], C.addDays(TODAY, 183));
    assert.equal(C.productionLabel('Returning Series', { season: 3, episode: 1, airDate: '2027-06-01' }, TODAY), 'Suite annoncée · reprise le 1er juin 2027');
    assert.equal(C.productionLabel('Returning Series', { season: 3, episode: 4, airDate: '2026-11-25' }, TODAY), 'En cours de diffusion');
  });
});

describe('Règles : saison en cours de diffusion', () => {
  const ep = (number, airDate) => ({ number, airDate });
  const d = { nextEpisode: { season: 2, episode: 8, airDate: '2026-11-27' }, lastEpisode: { season: 2, episode: 7, airDate: '2026-11-20' },
    seasonSummaries: [{ number: 1, episodeCount: 10 }, { number: 2, episodeCount: 12 }] };
  it('avant chargement de la saison : nombre annoncé par TMDB, diffusés d’après le dernier épisode', () => {
    assert.deepEqual(C.airingSeasonInfo(d, null, TODAY), { season: 2, total: 12, aired: 7, remaining: 5, exact: false, listed: true, started: true, lastNumber: null, lastDate: '', datedUntil: null });
    assert.equal(C.airingSeasonInfo({ nextEpisode: null }, null, TODAY), null);
  });
  it('saison chargée : liste réelle, date du dernier épisode ou dates connues jusqu’où', () => {
    const eps = [1, 2, 3, 4, 5, 6, 7].map((n) => ep(n, '2026-10-' + String(n + 1).padStart(2, '0'))).concat([ep(8, '2026-11-27'), ep(9, '2026-12-04'), ep(10, '2026-12-11')]);
    const si = C.airingSeasonInfo(d, { number: 2, episodes: eps }, TODAY);
    assert.equal(si.total, 10, 'la liste des épisodes l’emporte sur le nombre annoncé');
    assert.equal(si.aired, 7);
    assert.equal(si.lastNumber, 10);
    assert.equal(si.lastDate, '2026-12-11');
    const undated = C.airingSeasonInfo(d, { number: 2, episodes: eps.slice(0, 9).concat([ep(10, ''), ep(11, '')]) }, TODAY);
    assert.equal(undated.lastDate, '');
    assert.deepEqual(undated.datedUntil, { number: 9, date: '2026-12-04' });
    assert.equal(C.airingSeasonInfo(d, { number: 1, episodes: eps }, TODAY).exact, false, 'une autre saison chargée ne compte pas');
  });
});

describe('Règles : calendrier et statistiques', () => {
  const track = (type, id, extra) => Object.assign(C.emptyTrack(type, id), { inLibrary: true, addedAt: 1, lastActivityAt: 2 }, extra);
  const meta = (type, id, extra) => Object.assign(C.placeholderMeta(type + '-' + id), { placeholder: undefined, title: 'T' + id }, extra);

  it('date de fin posée au passage à « Vu », retirée ensuite ; conservée par la validation', () => {
    const t = track('movie', 1, { trackingStatus: 'seen' });
    assert.equal(C.stampSeen(t, 'todo', 'seen', 5000).seenAt, 5000);
    assert.equal(C.stampSeen(Object.assign({}, t, { seenAt: 10 }), 'seen', 'seen', 5000).seenAt, 10, 'déjà vu : date inchangée');
    assert.equal('seenAt' in C.stampSeen(Object.assign({}, t, { seenAt: 10 }), 'seen', 'progress', 5000), false);
    assert.equal(D.sanitizeTrack('movie-1', Object.assign({}, t, { seenAt: 1763700000000 })).seenAt, 1763700000000);
    assert.equal(D.sanitizeTrack('movie-1', Object.assign({}, t, { seenAt: 'x' })).seenAt, undefined);
    assert.equal(D.sanitizeMeta('movie-1', { title: 'A', runtime: 112 }).runtime, 112);
    assert.equal(D.sanitizeMeta('movie-1', { title: 'A', runtime: -4 }).runtime, undefined);
  });
  it('statistiques : temps, films, épisodes, genres, titres terminés par mois', () => {
    const oct = new Date(2026, 9, 15).getTime(), nov = new Date(2026, 10, 3).getTime();
    const data = { tracking: {
      'movie-1': track('movie', 1, { trackingStatus: 'seen', seenAt: oct }),
      'movie-2': track('movie', 2, { trackingStatus: 'seen', lastActivityAt: nov }),
      'movie-3': track('movie', 3, { trackingStatus: 'progress' }),
      'tv-4': track('tv', 4, { seasons: { 1: { episodes: { 1: 'seen', 2: 'seen', 3: 'seen' } } }, seenAt: nov })
    }, metadata: {
      'movie-1': meta('movie', 1, { runtime: 120, genreIds: [878, 28] }),
      'movie-2': meta('movie', 2, { genreIds: [878] }),
      'movie-3': meta('movie', 3, { runtime: 90, genreIds: [27] }),
      'tv-4': meta('tv', 4, { runtime: 40, genreIds: [10765], seasonSummaries: [{ number: 1, airDate: '', episodeCount: 3, episodeNumbers: [1, 2, 3] }] })
    } };
    const i = C.computeInsights(data, TODAY);
    assert.equal(i.moviesSeen, 2);
    assert.equal(i.showsDone, 1);
    assert.equal(i.episodes, 3);
    assert.equal(i.totalMinutes, 120 + 3 * 40, 'film en cours non compté');
    assert.equal(i.unknownRuntime, 1, 'film 2 sans durée');
    assert.deepEqual(i.topGenres[0], { name: 'Science-fiction', count: 2 });
    assert.equal(i.months.length, 12);
    assert.equal(i.months[11].key, '2026-11');
    assert.equal(i.months[11].count, 2, 'novembre : série terminée + film 2 (date approximative)');
    assert.equal(i.months[10].count, 1);
    assert.equal(i.approxDates, 1);
  });
  it('calendrier : prochain épisode, saison annoncée, film à venir ; regroupé par échéance', () => {
    const data = { tracking: {
      'tv-1': track('tv', 1), 'tv-2': track('tv', 2, { watchlist: true }), 'tv-3': track('tv', 3), 'tv-5': track('tv', 5),
      'movie-6': track('movie', 6, { watchlist: true, inLibrary: false }), 'movie-7': track('movie', 7, { trackingStatus: 'seen' }), 'movie-8': track('movie', 8, { watchlist: true, inLibrary: false })
    }, metadata: {
      'movie-6': meta('movie', 6, { date: '2027-02-01' }), 'movie-7': meta('movie', 7, { date: '2027-02-01' }), 'movie-8': meta('movie', 8, { date: '2020-01-01' }),
      'tv-1': meta('tv', 1), 'tv-2': meta('tv', 2), 'tv-3': meta('tv', 3), 'tv-5': meta('tv', 5)
    } };
    const details = {
      'tv-1': { title: 'Hebdo', productionStatus: 'Returning Series', nextEpisode: { season: 1, episode: 5, name: 'Épisode 5', airDate: '2026-11-24' }, seasonSummaries: [] },
      'tv-2': { title: 'Annoncée', productionStatus: 'Returning Series', nextEpisode: null, seasonSummaries: [{ number: 1, airDate: '2019-01-01', episodeCount: 8 }, { number: 2, airDate: '', episodeCount: 0 }] },
      'tv-3': { title: 'Finie', productionStatus: 'Ended', nextEpisode: null, seasonSummaries: [] },
      'tv-5': { title: 'Ce soir', productionStatus: 'Returning Series', nextEpisode: { season: 2, episode: 1, name: 'Le retour', airDate: TODAY }, seasonSummaries: [] }
    };
    const list = C.computeAgenda(data, (k) => details[k] || null, TODAY);
    assert.deepEqual(list.map((x) => x.key), ['tv-5', 'tv-1', 'movie-6', 'tv-2']);
    assert.equal(list[0].what, 'Début de la saison 2 · S2 · É1 — Le retour');
    assert.equal(list[1].what, 'Nouvel épisode · S1 · É5', 'titre générique « Épisode 5 » non répété');
    assert.equal(list[3].what, 'Saison 2 annoncée');
    assert.deepEqual(C.agendaGroups(list, TODAY).map((g) => [g.id, g.items.length]), [['today', 1], ['week', 1], ['later', 1], ['nodate', 1]]);
    assert.deepEqual(['2026-11-21', '2026-11-22', '2026-11-24', '2026-12-10', '2027-03-01', '2028-06-01'].map((d) => C.relativeDay(d, TODAY)),
      ['aujourd’hui', 'demain', 'dans 3 jours', 'dans 3 semaines', 'dans 3 mois', 'dans 18 mois']);
  });
});

describe('Dans Chrome', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  const settle = (page) => page.waitForFunction(() => !document.querySelector('#search-results [aria-busy="true"]'));
  const titles = (page) => page.$$eval('#search-results .card-title', (els) => els.map((e) => e.textContent));

  it('fiche : où regarder en France, ou aucune offre', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/101' });
    await page.waitForSelector('.where-group');
    assert.deepEqual(await page.$$eval('.where-group', (els) => els.map((e) => e.querySelector('.where-kind').textContent + ' : ' + [...e.querySelectorAll('.provider span')].map((s) => s.textContent).join(', '))),
      ['Abonnement : Netflix', 'Location : Apple TV']);
    assert.equal(await page.locator('.where a').getAttribute('href'), 'https://www.themoviedb.org/movie/101/watch?locale=FR');
    assert.equal(await page.locator('.where a').getAttribute('rel'), 'noopener noreferrer');
    await page.evaluate(() => { location.hash = '#detail/movie/102'; });
    await page.waitForFunction(() => /Aucune offre/.test((document.querySelector('.where') || {}).textContent || ''));
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('fiche d’une série en cours : carte Diffusion (prochain, diffusés, dernier prévu), offres sous l’affiche, genres en tags', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/210' });
    const last = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const col = (id) => page.locator('#detail-cards [data-col="' + id + '"]').textContent();
    await page.waitForFunction(() => /É12 ·/.test((document.querySelector('#detail-cards [data-col="end"]') || {}).textContent || ''));
    assert.match(await page.locator('#detail-cards .dcard-head').textContent(), /^Diffusion · saison 1En cours de diffusion$/);
    assert.match(await col('next'), /^Prochain épisodeS1 · É12.* · dans 3 jours$/);
    assert.match(await col('aired'), /^Saison 111 \/ 12épisodes diffusés · 1 restantDernier diffusé : É11 — /);
    assert.equal(await page.locator('#detail-cards [data-col="aired"] [role="progressbar"]').getAttribute('aria-valuenow'), '11');
    assert.equal(await col('end'), 'Dernier épisode prévuÉ12 · ' + C.formatDate(last) + 'dans 3 jours · fin de la saison 1');
    assert.match(await page.locator('.detail-sub').textContent(), /^Anime · 1 saison · 12 épisodes · 42 min \/ ép\. · depuis le 5 avril 2015$/);
    assert.deepEqual(await page.$$eval('.detail-badges .genre-tag', (els) => els.map((e) => e.textContent)), ['Drame']);
    assert.equal(await page.locator('.detail-info #detail-cards + #detail-where .where').count(), 1, 'offres juste sous la carte Diffusion');
    assert.equal(await page.locator('.detail-side .detail-meta .genre-tag').count(), 1, 'note, genres et suivi sous l’affiche');
    assert.equal(await page.locator('.detail-side .detail-meta [data-status-for="tv-210"]').count(), 1);
    assert.equal(await page.locator('.where-title').count(), 0, 'sans titre « Où regarder en France »');
    assert.equal(await page.locator('.detail-actions [data-action="toggle-watchlist"]').count(), 1);
    assert.equal(await page.locator('#detail-track [data-action="toggle-watchlist"]').count(), 0, 'favori et watchlist en haut, plus dans le suivi');
    assert.match(await page.locator('.detail-summary').textContent(), /^Résumé/);
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('recherche : genre en « Tout » ; anime en cours de diffusion, saison annoncée à moins / plus de 6 mois', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#search?genre=878' });
    await page.waitForSelector('#search-filters select[data-filter="genre"]');
    assert.equal(await page.locator('#search-filters select[data-filter="genre"]').inputValue(), '878');
    await settle(page);
    const reqs = mock.state.requests.filter((r) => r.startsWith('/discover/'));
    assert.ok(reqs.some((r) => r.startsWith('/discover/movie') && /with_genres=878/.test(r)));
    assert.ok(reqs.some((r) => r.startsWith('/discover/tv') && /with_genres=10765/.test(r)));
    await page.evaluate(() => { location.hash = '#search?type=anime&status=airing'; });
    await settle(page);
    await page.waitForFunction(() => [...document.querySelectorAll('#search-results .card-title')].map((e) => e.textContent).join() === 'Anime Oméga');
    await page.selectOption('select[data-filter="status"]', 'soon');
    await page.waitForFunction(() => location.hash.includes('status=soon'));
    await page.waitForFunction(() => [...document.querySelectorAll('#search-results .card-title')].map((e) => e.textContent).join() === 'Anime Bientôt');
    await page.selectOption('select[data-filter="status"]', 'later');
    await page.waitForFunction(() => location.hash.includes('status=later'));
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 2);
    assert.deepEqual((await titles(page)).sort(), ['Anime Mystère', 'Anime Patience']);
    assert.match(await page.locator('#search-results [role="status"]').textContent(), /écarté/);
    await page.evaluate(() => { location.hash = '#search?q=saison&type=anime&status=later'; });
    await settle(page);
    await page.waitForFunction(() => document.querySelectorAll('#search-results .card').length === 2);
    assert.deepEqual((await titles(page)).sort(), ['Anime Mystère', 'Anime Patience'], 'même règle pour une recherche par titre');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('page « À venir » : épisodes et sorties de ma liste, regroupés ; fiche ouverte au clic', T, async () => {
    const tr = (type, id, extra) => Object.assign({ type, id, inLibrary: true, favorite: false, watchlist: false, trackingStatus: null, intent: null, seasons: {}, addedAt: 1, lastActivityAt: 2 }, extra);
    const data = { schemaVersion: 1, preferences: {}, metadata: {}, tracking: {
      'tv-210': tr('tv', 210, { intent: 'progress' }), 'tv-214': tr('tv', 214, { inLibrary: false, watchlist: true }), 'tv-202': tr('tv', 202),
      'movie-122': tr('movie', 122, { inLibrary: false, watchlist: true }), 'movie-101': tr('movie', 101, { trackingStatus: 'seen' }) } };
    const { page, errors, context, mock } = await openApp(browser, { hash: '#agenda', storage: { 'crazy-liste-v1': JSON.stringify(data) } });
    await page.waitForSelector('.agenda-item');
    await page.waitForFunction(() => document.querySelectorAll('.agenda-item').length === 3);
    assert.deepEqual(await page.$$eval('.agenda-item', (els) => els.map((e) => e.dataset.itemKey)), ['tv-210', 'movie-122', 'tv-214']);
    assert.deepEqual(await page.$$eval('.agenda-group', (els) => els.map((e) => e.dataset.group)), ['week', 'later']);
    assert.match(await page.locator('[data-item-key="tv-210"]').textContent(), /dans 3 jours.*Anime Oméga.*Nouvel épisode · S1 · É12/);
    assert.match(await page.locator('[data-item-key="tv-214"]').textContent(), /Début de la saison 2/);
    await page.waitForSelector('.sidebar [data-nav="agenda"][aria-current="page"]');
    await page.locator('[data-item-key="tv-214"] a').click();
    await page.waitForFunction(() => location.hash === '#detail/tv/214');
    await page.waitForFunction(() => /Suite annoncée · reprise le/.test((document.querySelector('#detail-cards .dcard-head') || {}).textContent || ''));
    assert.match(await page.locator('#detail-cards [data-col="end"]').textContent(), /Saison pas encore détaillée par TMDB/, 'saison annoncée mais pas encore listée par TMDB');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('statistiques : durées récupérées, genres, mois ; un film marqué vu compte ce mois-ci', T, async () => {
    const now = Date.now();
    const data = { schemaVersion: 1, preferences: {}, metadata: {}, tracking: {
      'movie-101': { type: 'movie', id: 101, inLibrary: true, favorite: false, watchlist: false, trackingStatus: 'seen', intent: null, seasons: {}, addedAt: 1, lastActivityAt: now - 40 * 86400000 },
      'tv-205': { type: 'tv', id: 205, inLibrary: true, favorite: false, watchlist: false, trackingStatus: null, intent: null, seasons: { 1: { episodes: { 1: 'seen', 2: 'seen', 3: 'seen' } } }, addedAt: 1, lastActivityAt: 3, seenAt: now } } };
    const { page, errors, context } = await openApp(browser, { hash: '#stats', storage: { 'crazy-liste-v1': JSON.stringify(data) } });
    await page.waitForSelector('.insight');
    await page.waitForFunction(() => (document.querySelector('[data-insight="time"] strong') || {}).textContent === '4 h'); // 112 min + 3 × 42 min
    assert.match(await page.locator('[data-insight="movies"]').textContent(), /1film vu/);
    assert.match(await page.locator('[data-insight="episodes"]').textContent(), /3épisodes vus/);
    assert.match(await page.locator('[data-insight="shows"]').textContent(), /1série terminée/);
    assert.match(await page.locator('.bars').textContent(), /Drame/);
    const month = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const cur = month(new Date());
    assert.equal(await page.locator('.month[data-month="' + cur + '"] .month-value').textContent(), '1');
    assert.equal((await store(page)).metadata['movie-101'].runtime, 112, 'durée enregistrée');
    await page.waitForSelector('.tabs [href="#stats"][aria-current="page"]');
    await page.evaluate(() => { location.hash = '#detail/movie/102'; });
    await page.locator('[data-action="movie-status"][data-status="seen"]').click();
    const s = await store(page);
    assert.ok(Math.abs(s.tracking['movie-102'].seenAt - Date.now()) < 60000, 'date de fin enregistrée');
    await page.evaluate(() => { location.hash = '#stats'; });
    await page.waitForFunction((k) => (document.querySelector('.month[data-month="' + k + '"] .month-value') || {}).textContent === '2', cur);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('téléphone : « À venir » dans la barre du bas, sans débordement ; statistiques accessibles depuis Ma liste', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#library', viewport: { width: 360, height: 780 } });
    await page.waitForSelector('.bottom-nav [data-nav="agenda"]');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(await page.$$eval('.bottom-nav a', (els) => els.map((a) => a.dataset.nav)), ['home', 'search', 'resume', 'agenda', 'library', 'sagas'], 'six onglets, comme avant');
    await page.locator('.topbar [data-nav="settings"]').click(); // Réglages : icône de la barre du haut sur téléphone
    await page.waitForFunction(() => location.hash === '#settings');
    await page.waitForSelector('.topbar [data-nav="settings"][aria-current="page"]');
    await page.evaluate(() => { location.hash = '#library'; });
    await page.locator('.tabs [href="#stats"]').click();
    await page.waitForFunction(() => location.hash === '#stats');
    await page.waitForSelector('.bottom-nav [data-nav="library"][aria-current="page"]'); // Statistiques : onglet de Ma liste
    await page.locator('.bottom-nav [data-nav="agenda"]').click();
    await page.waitForFunction(() => location.hash === '#agenda');
    await page.waitForSelector('.empty');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
