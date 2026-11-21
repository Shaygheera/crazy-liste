// Faux serveur TMDB pour les tests navigateur : aucune requête ne sort vers Internet.
// Les réponses imitent la forme réelle de l'API v3 (vérifiée sur l'API le 20/11/2026).

export const SPECIAL_TITLE = `L'Été d'Amélie & <b>Les "Fous"</b>`;
export const SPECIAL_OVERVIEW = `C'est l'histoire d'un <script>window.__pwned=1</script> « drôle » d’été.`;

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const movie = (id, title, extra = {}) => ({ id, title, original_title: title, release_date: '2022-03-1' + (id % 10), vote_average: 6 + (id % 4) * 0.7, vote_count: 100 + id,
  overview: 'Synopsis du ' + title + '.', poster_path: '/m' + id + '.jpg', backdrop_path: '/bm' + id + '.jpg', genre_ids: [18], original_language: 'fr', ...extra });
const show = (id, name, extra = {}) => ({ id, name, original_name: name, first_air_date: '2019-07-25', vote_average: 7.9, vote_count: 500 + id,
  overview: 'Synopsis de ' + name + '.', poster_path: '/t' + id + '.jpg', backdrop_path: '/bt' + id + '.jpg', genre_ids: [18], original_language: 'en', origin_country: ['US'], ...extra });

export const MOVIES = {
  101: movie(101, SPECIAL_TITLE, { overview: SPECIAL_OVERVIEW, vote_average: 8.4, genre_ids: [35] }),
  120: movie(120, 'Saga : Partie 1', { release_date: '2001-12-18', belongs_to_collection: { id: 900, name: 'Saga intégrale' } }),
  121: movie(121, 'Saga : Partie 2', { release_date: '2003-12-17', belongs_to_collection: { id: 900, name: 'Saga intégrale' } }),
  122: movie(122, 'Saga : Partie 3', { release_date: '2027-05-01', belongs_to_collection: { id: 900, name: 'Saga intégrale' } })
};
for (const id of range(102, 110)) MOVIES[id] = movie(id, 'Film Test ' + (id - 100));
// Films récents (dates relatives au jour du test) : 130 seulement au cinéma, 131 déjà sorti en vidéo aux États-Unis.
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
MOVIES[130] = movie(130, 'Film Au Cinéma', { release_date: daysAgo(20) });
MOVIES[131] = movie(131, 'Film En Vidéo', { release_date: daysAgo(100) });
const RELEASES = {
  130: [{ iso_3166_1: 'FR', release_dates: [{ type: 3, release_date: daysAgo(20) + 'T00:00:00.000Z' }] }],
  131: [{ iso_3166_1: 'FR', release_dates: [{ type: 3, release_date: daysAgo(100) + 'T00:00:00.000Z' }, { type: 4, release_date: daysAgo(-10) + 'T00:00:00.000Z' }] },
        { iso_3166_1: 'US', release_dates: [{ type: 4, release_date: daysAgo(30) + 'T00:00:00.000Z' }] }]
};
MOVIES[109].release_date = '2027-02-01';

// seasons : [numéro, numéros d'épisodes] ; null = la requête de saison échoue (500)
export const SHOWS = {
  201: { base: show(201, 'Série Alpha'), status: 'Returning Series', seasons: [[0, range(1, 2)], [1, range(1, 10)], [2, range(1, 8)], [3, range(1, 6)]],
    next: { season_number: 3, episode_number: 6, name: 'Le Final', air_date: '2027-01-15' }, last: { season_number: 3, episode_number: 5, name: 'Avant la fin', air_date: '2026-11-01' } },
  202: { base: show(202, 'Anime Bêta', { original_language: 'ja', genre_ids: [16, 10759], origin_country: ['JP'] }), status: 'Ended', seasons: [[1, range(1, 5)], [2, range(6, 9)]] },
  203: { base: show(203, 'Série Gamma'), status: 'Returning Series', seasons: [[1, range(1, 4)], [2, []]] },
  204: { base: show(204, 'Série Delta'), status: 'Ended', seasons: [[1, range(1, 3)], [2, null]], failSeason: 2, counts: { 2: 3 } }
};
for (const id of range(205, 209)) SHOWS[id] = { base: show(id, 'Série Rapide ' + (id - 204)), status: 'Ended', seasons: [[1, range(1, 3)]] };
// Anime supplémentaires pour la découverte (absents des listes de l'accueil)
SHOWS[210] = { base: show(210, 'Anime Oméga', { original_language: 'ja', genre_ids: [16, 10765], origin_country: ['JP'], first_air_date: '2015-04-05', vote_average: 8.7, vote_count: 900 }), status: 'Returning Series', seasons: [[1, range(1, 12)]] };
SHOWS[211] = { base: show(211, 'Anime Sigma', { original_language: 'ja', genre_ids: [16, 18], origin_country: ['JP'], first_air_date: '2008-10-02', vote_average: 8.9, vote_count: 1500 }), status: 'Ended', seasons: [[1, range(1, 24)]] };
SHOWS[212] = { base: show(212, 'Dessin animé Kappa', { original_language: 'en', genre_ids: [16, 35], first_air_date: '2012-01-01', vote_average: 8.2 }), status: 'Ended', seasons: [[1, range(1, 10)]] };
// Diffusion relative au jour du test : 210 en cours (épisode dans 3 jours), 213 saison annoncée dans 60 jours, 214 dans 300 jours, 215 saison annoncée sans date.
SHOWS[210].next = { season_number: 1, episode_number: 12, name: 'Épisode 12', air_date: daysAgo(-3) };
SHOWS[210].last = { season_number: 1, episode_number: 11, name: 'Épisode 11', air_date: daysAgo(4) };
SHOWS[213] = { base: show(213, 'Anime Bientôt', { original_language: 'ja', genre_ids: [16, 10759], origin_country: ['JP'], first_air_date: '2020-01-10', vote_average: 8.1 }), status: 'Returning Series', seasons: [[1, range(1, 12)], [2, range(1, 12)]],
  next: { season_number: 3, episode_number: 1, name: 'Épisode 1', air_date: daysAgo(-60) } };
SHOWS[214] = { base: show(214, 'Anime Patience', { original_language: 'ja', genre_ids: [16, 18], origin_country: ['JP'], first_air_date: '2018-04-01', vote_average: 8.4 }), status: 'Returning Series', seasons: [[1, range(1, 24)]],
  next: { season_number: 2, episode_number: 1, name: 'Épisode 1', air_date: daysAgo(-300) } };
SHOWS[215] = { base: show(215, 'Anime Mystère', { original_language: 'ja', genre_ids: [16, 9648], origin_country: ['JP'], first_air_date: '2017-04-01', vote_average: 7.6 }), status: 'Returning Series', seasons: [[1, range(1, 10)], [2, []]], undatedSeason: 2 };
// Offres en France (watch/providers) : film 101 en abonnement et en location.
export const PROVIDERS = {
  'movie-101': { FR: { link: 'https://www.themoviedb.org/movie/101/watch?locale=FR',
    flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 }, { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 }],
    rent: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '/apple.jpg', display_priority: 3 }], buy: [] }, US: { flatrate: [{ provider_id: 9, provider_name: 'Prime Video US', logo_path: '/p.jpg', display_priority: 1 }] } }
};
const STATUS_CODES = { 'Returning Series': '0', Planned: '1', 'In Production': '2', Ended: '3', Canceled: '4', Pilot: '5' };
// Applique les paramètres de /discover comme TMDB (sous-ensemble utilisé par l'application).
function discover(kind, q) {
  const items = kind === 'tv' ? Object.values(SHOWS).map((s) => ({ ...s.base, _status: s.status, _next: s.next ? s.next.air_date : '' })) : Object.values(MOVIES).map((m) => ({ ...m }));
  const dateKey = kind === 'tv' ? 'first_air_date' : 'release_date';
  const qDate = kind === 'tv' ? 'first_air_date' : 'primary_release_date';
  let out = items.filter((it) => {
    const g = q.get('with_genres');
    if (g && !g.split(',').every((id) => it.genre_ids.includes(Number(id)))) return false;
    if (q.get('with_original_language') && it.original_language !== q.get('with_original_language')) return false;
    if (q.get('with_status') && !q.get('with_status').split('|').includes(STATUS_CODES[it._status])) return false;
    if (q.get(qDate + '.gte') && it[dateKey] < q.get(qDate + '.gte')) return false;
    if (q.get(qDate + '.lte') && it[dateKey] > q.get(qDate + '.lte')) return false;
    if (q.get('air_date.gte') && !(it._next && it._next >= q.get('air_date.gte'))) return false;
    if (q.get('air_date.lte') && !(it._next && it._next <= q.get('air_date.lte'))) return false;
    if (q.get('vote_average.gte') && it.vote_average < Number(q.get('vote_average.gte'))) return false;
    if (q.get('vote_count.gte') && it.vote_count < Number(q.get('vote_count.gte'))) return false;
    return true;
  });
  const sort = q.get('sort_by') || 'popularity.desc';
  if (sort === 'vote_average.desc') out.sort((a, b) => b.vote_average - a.vote_average);
  else if (sort.endsWith('date.desc')) out.sort((a, b) => b[dateKey].localeCompare(a[dateKey]));
  else if (sort.endsWith('date.asc')) out.sort((a, b) => a[dateKey].localeCompare(b[dateKey]));
  return page(out.map(({ _status, _next, ...rest }) => rest));
}

const PERSON = { id: 9001, media_type: 'person', name: 'Personne Test Alpha', known_for_department: 'Acting' };
const asMovie = (id) => ({ ...MOVIES[id], media_type: 'movie' });
const asShow = (id) => ({ ...SHOWS[id].base, media_type: 'tv' });
const page = (results, total = 1) => ({ page: 1, results, total_pages: total, total_results: results.length });

function showDetail(id) {
  const s = SHOWS[id];
  const seasons = s.seasons.map(([n, eps]) => ({ season_number: n, name: n === 0 ? 'Épisodes spéciaux' : 'Saison ' + n, air_date: s.undatedSeason === n ? null : n === 1 ? '2019-07-25' : n === 0 ? '2020-01-01' : '202' + n + '-01-10',
    episode_count: eps ? eps.length : (s.counts && s.counts[n]) || 0, id: id * 100 + n, poster_path: null }));
  return { ...s.base, status: s.status, in_production: s.status === 'Returning Series', seasons, number_of_seasons: seasons.filter((x) => x.season_number > 0).length,
    number_of_episodes: seasons.filter((x) => x.season_number > 0).reduce((n, x) => n + x.episode_count, 0), episode_run_time: [42], genres: [{ id: 18, name: 'Drame' }],
    next_episode_to_air: s.next || null, last_episode_to_air: s.last || null, tagline: '', recommendations: page([asShow(id === 201 ? 202 : 201), asMovie(102)]) };
}
function seasonDetail(id, n) {
  const s = SHOWS[id];
  const entry = s.seasons.find(([x]) => x === n);
  if (!entry || !entry[1]) return null;
  // saison du prochain épisode annoncé : un épisode par semaine à partir de sa date
  const nx = s.next && s.next.season_number === n ? s.next : null;
  const weekly = (e) => new Date(Date.parse(nx.air_date + 'T00:00:00Z') + 7 * 86400000 * (e - nx.episode_number)).toISOString().slice(0, 10);
  return { season_number: n, name: n === 0 ? 'Épisodes spéciaux' : 'Saison ' + n, air_date: '2019-07-25', episodes: entry[1].map((e, i) => ({
    episode_number: e, season_number: n, name: e === 2 && n === 1 ? `L'épisode "piège" <i>n°2</i>` : 'Épisode ' + e, air_date: nx && e >= nx.episode_number ? weekly(e) : '2019-08-' + String(1 + (i % 27)).padStart(2, '0'),
    runtime: 42, vote_average: 7 + (e % 3) * 0.5, vote_count: 10, overview: '', still_path: null, crew: [], guest_stars: [] })) };
}
function movieDetail(id) {
  const m = MOVIES[id];
  return { ...m, status: id === 122 ? 'Post Production' : 'Released', runtime: 112, genres: [{ id: 18, name: 'Drame' }], tagline: '',
    belongs_to_collection: m.belongs_to_collection || null, recommendations: page([asMovie(id === 103 ? 104 : 103), asShow(201)]) };
}
const COLLECTIONS = { 900: { id: 900, name: 'Saga intégrale', parts: [MOVIES[122], MOVIES[120], MOVIES[121]] } };
const SEARCH = {
  alpha: { multi: [asShow(201), PERSON, asMovie(101)], movie: [MOVIES[101]], tv: [SHOWS[201].base] },
  anime: { multi: [asShow(202), asShow(210), asShow(211), asShow(212), asMovie(104)], movie: [MOVIES[104]], tv: [SHOWS[202].base, SHOWS[210].base, SHOWS[211].base, SHOWS[212].base] },
  lent: { multi: [asMovie(102)], movie: [MOVIES[102]], tv: [], delay: 1500 },
  rapide: { multi: [asMovie(103)], movie: [MOVIES[103]], tv: [] },
  saison: { multi: [asShow(210), asShow(213), asShow(214), asShow(215), asShow(211)], movie: [], tv: [210, 213, 214, 215, 211].map((id) => SHOWS[id].base) },
  sortie: { multi: [asMovie(130), asMovie(131), asMovie(122), asMovie(101), asShow(201)], movie: [MOVIES[130], MOVIES[131], MOVIES[122], MOVIES[101]], tv: [SHOWS[201].base] }
};
// Vidéos TMDB : film 101 avec VF et VO (la bande-annonce VF doit être choisie), série 201 en VO seulement, autres contenus sans vidéo.
export const VIDEOS = {
  'movie-101': [
    { site: 'YouTube', key: 'vo_trailer01', type: 'Trailer', iso_639_1: 'en', official: true, name: 'Official Trailer', published_at: '2024-05-01T10:00:00.000Z' },
    { site: 'Vimeo', key: 'vimeo000001', type: 'Trailer', iso_639_1: 'fr', official: true, name: 'Vimeo', published_at: '2024-06-01T10:00:00.000Z' },
    { site: 'YouTube', key: 'vf_teaser01', type: 'Teaser', iso_639_1: 'fr', official: true, name: 'Teaser VF', published_at: '2024-02-01T10:00:00.000Z' },
    { site: 'YouTube', key: 'vf_trailer1', type: 'Trailer', iso_639_1: 'fr', official: true, name: 'Bande-annonce VF', published_at: '2024-04-01T10:00:00.000Z' },
    { site: 'YouTube', key: 'vf_clip0001', type: 'Clip', iso_639_1: 'fr', official: true, name: 'Extrait', published_at: '2024-07-01T10:00:00.000Z' }
  ],
  'tv-201': [{ site: 'YouTube', key: 'alpha_vo_01', type: 'Trailer', iso_639_1: 'en', official: false, name: 'Season 1 Trailer', published_at: '2023-01-01T10:00:00.000Z' }]
};
// Images : film 101 avec 4 visuels valides (dont un doublon et un avec texte), plus des formats à écarter.
const bd = (file, extra = {}) => ({ file_path: '/' + file + '.jpg', width: 1920, height: 1080, aspect_ratio: 1.778, iso_639_1: null, vote_average: 5, vote_count: 2, ...extra });
export const IMAGES = {
  'movie-101': { backdrops: [
    bd('texte_en', { iso_639_1: 'en', vote_average: 9 }),
    bd('scene_a', { vote_average: 6 }),
    bd('scene_b', { vote_average: 7 }),
    bd('scene_a', { vote_average: 6 }),
    bd('minuscule', { width: 300, height: 169 }),
    bd('vertical', { width: 1000, height: 1500, aspect_ratio: 0.667 }),
    bd('scene_c', { vote_average: 5.5 })
  ], posters: [], logos: [] }
};
export const INVALID_KEY = 'cle-invalide-000000000000';

/* Titres génériques (sagas) : tout identifiant inconnu répond avec un titre fictif daté selon son numéro.
   Les identifiants ≥ 1 000 000 sont « à venir » (2030). */
function genericMovie(id) { return movie(id, 'Film saga ' + id, { release_date: id >= 1000000 ? '2030-01-01' : String(1980 + (id % 40)) + '-06-15' }); }
function genericShow(id) { return { ...show(id, 'Série saga ' + id, { first_air_date: id >= 1000000 ? '2030-01-01' : String(1980 + (id % 40)) + '-09-15' }), status: 'Ended', seasons: [], number_of_seasons: 0, number_of_episodes: 0 }; }

export function createMock(options = {}) {
  const st = { requests: [], fail: new Set(options.fail || []) };
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json; charset=utf-8', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  async function handle(route) {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/3/, '');
    st.requests.push(path + url.search.replace(/api_key=[^&]+&?/, ''));
    if (url.searchParams.get('api_key') === INVALID_KEY) return json(route, 401, { status_code: 7, status_message: 'Invalid API key' });
    if (!url.searchParams.get('api_key')) return json(route, 401, { status_code: 7, status_message: 'No key' });
    if (st.fail.has(path)) return json(route, 500, { status_message: 'Erreur simulée' });
    let m;
    if (path === '/configuration') return json(route, 200, { images: { secure_base_url: 'https://image.tmdb.org/t/p/' } });
    if (path === '/trending/all/week') return json(route, 200, page([asShow(201), asMovie(101), PERSON, asMovie(102), asShow(202), asMovie(103)], 3));
    if (path === '/movie/popular') return json(route, 200, page(range(101, 108).map((id) => MOVIES[id])));
    if (path === '/tv/popular') return json(route, 200, page(range(201, 205).map((id) => SHOWS[id].base)));
    if (path === '/discover/tv' && url.searchParams.get('with_genres') === '16' && url.searchParams.get('sort_by') === 'popularity.desc' && !url.searchParams.get('page')) return json(route, 200, page([SHOWS[202].base])); // section « Anime » de l'accueil
    if ((m = /^\/discover\/(tv|movie)$/.exec(path))) return json(route, 200, discover(m[1], url.searchParams));
    if (path === '/movie/top_rated') return json(route, 200, page([MOVIES[104], MOVIES[105], MOVIES[101]]));
    if (path === '/movie/upcoming') return json(route, 200, page([MOVIES[122], MOVIES[109], MOVIES[102]]));
    if ((m = /^\/search\/(multi|movie|tv)$/.exec(path))) {
      const q = (url.searchParams.get('query') || '').toLowerCase();
      if (q === 'boom') return json(route, 500, { status_message: 'Erreur simulée' });
      const entry = SEARCH[q];
      if (entry && entry.delay) await new Promise((r) => setTimeout(r, entry.delay));
      return json(route, 200, page(entry ? entry[m[1]] : []));
    }
    if ((m = /^\/tv\/(\d+)\/season\/(\d+)$/.exec(path))) {
      const s = SHOWS[m[1]];
      if (s && s.failSeason === Number(m[2])) return json(route, 500, { status_message: 'Saison indisponible' });
      const body = s ? seasonDetail(Number(m[1]), Number(m[2])) : null;
      return body ? json(route, 200, body) : json(route, 404, { status_message: 'Not found' });
    }
    if ((m = /^\/movie\/(\d+)\/release_dates$/.exec(path))) { st.releaseChecks = (st.releaseChecks || 0) + 1; return json(route, 200, { id: Number(m[1]), results: RELEASES[m[1]] || [] }); }
    const withVideos = (body, key) => {
      const append = url.searchParams.get('append_to_response') || '';
      const out = { ...body };
      if (append.includes('videos')) out.videos = { results: VIDEOS[key] || [] };
      if (append.includes('watch/providers')) out['watch/providers'] = { id: body.id, results: PROVIDERS[key] || {} };
      if (append.includes('images')) out.images = IMAGES[key] || { backdrops: [], posters: [], logos: [] };
      return out;
    };
    if (options.generic && (m = /^\/tv\/(\d+)$/.exec(path)) && !SHOWS[m[1]]) return json(route, 200, genericShow(Number(m[1])));
    if (options.generic && (m = /^\/movie\/(\d+)$/.exec(path)) && !MOVIES[m[1]]) return json(route, 200, genericMovie(Number(m[1])));
    if ((m = /^\/tv\/(\d+)$/.exec(path))) return SHOWS[m[1]] ? json(route, 200, withVideos(showDetail(Number(m[1])), 'tv-' + m[1])) : json(route, 404, { status_message: 'Not found' });
    if ((m = /^\/movie\/(\d+)$/.exec(path))) return MOVIES[m[1]] ? json(route, 200, withVideos(movieDetail(Number(m[1])), 'movie-' + m[1])) : json(route, 404, { status_message: 'Not found' });
    if ((m = /^\/collection\/(\d+)$/.exec(path))) return COLLECTIONS[m[1]] ? json(route, 200, COLLECTIONS[m[1]]) : json(route, 404, { status_message: 'Not found' });
    return json(route, 404, { status_message: 'Not found' });
  }
  return { state: st, handle };
}

// PNG 1×1 transparent servi pour toutes les affiches
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
