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
    flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 }, { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 }, { provider_id: 1796, provider_name: 'Netflix Standard with Ads', logo_path: '/netflix-ads.jpg', display_priority: 9 }],
    rent: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '/apple.jpg', display_priority: 3 }], buy: [] }, US: { flatrate: [{ provider_id: 9, provider_name: 'Prime Video US', logo_path: '/p.jpg', display_priority: 1 }] } }
};
// Licence de test (titres hors découverte) : un film et trois séries de la franchise Wikidata « Licence Test », plus un faux ami.
SHOWS[216] = { base: show(216, 'Licence Test : Première partie', { first_air_date: '2017-04-05' }), status: 'Ended', seasons: [[1, range(1, 3)]], hidden: true };
SHOWS[217] = { base: show(217, 'Licence Test Deux : Seconde partie', { first_air_date: '' }), status: 'In Production', seasons: [], hidden: true };
SHOWS[218] = { base: show(218, 'Licencieux', { first_air_date: '2020-01-01' }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[219] = { base: show(219, 'Licence Test Origines', { first_air_date: '2010-01-01' }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
MOVIES[140] = movie(140, 'Licence Test : le film', { release_date: '2015-08-01', original_language: 'en', _hidden: true });
// Saga « Le Labyrinthe » (collection TMDB 950) et des films aux titres français proches mais sans rapport
const maze = (id, title, original, date) => movie(id, title, { original_title: original, release_date: date, original_language: 'en', genre_ids: [28, 9648, 878], belongs_to_collection: { id: 950, name: 'Le Labyrinthe - Saga' }, _hidden: true });
MOVIES[150] = maze(150, 'Le Labyrinthe', 'The Maze Runner', '2014-09-10');
MOVIES[151] = maze(151, 'Le Labyrinthe : La Terre brûlée', 'Maze Runner: The Scorch Trials', '2015-09-09');
MOVIES[152] = maze(152, 'Le Labyrinthe : Le Remède mortel', 'Maze Runner: The Death Cure', '2018-01-24');
MOVIES[153] = movie(153, 'Le Labyrinthe', { original_title: 'Le labyrinthe', release_date: '1953-01-01', original_language: 'fr', genre_ids: [18], _hidden: true });
MOVIES[154] = movie(154, 'Le Labyrinthe de Pan', { original_title: 'El laberinto del fauno', release_date: '2006-10-11', original_language: 'es', genre_ids: [14, 18], _hidden: true });
MOVIES[155] = movie(155, 'Maze Runner : le documentaire', { original_title: 'Maze Runner Behind', release_date: '2016-01-01', original_language: 'en', genre_ids: [99], _hidden: true });
// Chaîne d'anime aux titres différents (AniList 11 → 12 → 13 → 14 pas encore sortie) : séries TMDB 220, 221, 222 (hors découverte).
SHOWS[220] = { base: show(220, 'Chaîne Un', { first_air_date: '2005-01-01', original_language: 'ja', genre_ids: [16] }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[221] = { base: show(221, 'Chaîne Deux autre nom', { first_air_date: '2010-01-01', original_language: 'ja', genre_ids: [16] }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[222] = { base: show(222, 'Troisième Volet', { first_air_date: '2015-01-01', original_language: 'ja', genre_ids: [16] }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
// Film de la chaîne au titre sans rapport (relié seulement par AniList : « histoire parallèle » de 12)
MOVIES[142] = movie(142, 'Volet spécial : le film', { release_date: '2012-05-05', original_language: 'ja', genre_ids: [16], _hidden: true });
// Pièges Wikidata (films) : « Jouets Test » (série de 3 films) est aussi dans une liste du studio, un catalogue du studio, une franchise
// démesurée, un univers et a pour origine un conte ; « Là-haut Test » n'est que dans la liste et le catalogue du studio.
const toon = (id, title, date) => movie(id, title, { release_date: date, original_language: 'en', genre_ids: [16, 10751], _hidden: true });
MOVIES[160] = toon(160, 'Jouets Test', '2005-11-22');
MOVIES[161] = toon(161, 'Jouets Test 2', '2009-11-24');
MOVIES[162] = toon(162, 'Jouets Test 3', '2013-06-18');
MOVIES[163] = toon(163, 'Là-haut Test', '2010-05-29');
MOVIES[164] = toon(164, 'Studio Test : Poisson', '2008-05-30');
MOVIES[165] = toon(165, 'Studio Test : Voiture', '2011-06-09');
MOVIES[166] = movie(166, 'Le Conte du jouet', { release_date: '1960-01-01', original_language: 'fr', genre_ids: [18], _hidden: true });
MOVIES[167] = toon(167, 'Jouets Test : court métrage', '2014-01-01');
// Univers seul lien entre deux séries (secours) ; « suivi par » validé par le titre (226 → 227) ou ignoré (ordre de sortie d'un univers : 228 → 229).
SHOWS[230] = { base: show(230, 'Trône Test', { first_air_date: '2011-04-17' }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[231] = { base: show(231, 'Maison Test', { first_air_date: '2022-08-21' }), status: 'Returning Series', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[233] = { base: show(233, 'Trône : une autre adaptation', { first_air_date: '2013-03-01' }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true }; // même univers, autre chaîne
SHOWS[226] = { base: show(226, 'Dextre', { first_air_date: '2006-10-01' }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[227] = { base: show(227, 'Dextre : Nouveau sang', { first_air_date: '2021-11-07' }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[228] = { base: show(228, 'Loka', { first_air_date: '2021-06-09' }), status: 'Returning Series', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[229] = { base: show(229, 'Et si… ?', { first_air_date: '2021-08-11' }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
// Anime relié seulement par ARM (absent de Wikidata) : série TMDB 225 (saisons AniList 70, 71 et 76), film-pont 72 (rangé par ARM en « saison 0 »,
// fiche film retrouvée par son numéro IMDb dans Wikidata), OVA 73 (épisode spécial), film dérivé 74 (fiche 173), film 79 mal relié par ARM
// (fiche 174, d'une autre époque), saison 4 annoncée (77) et un crossover (78, personnages communs) à ignorer.
SHOWS[225] = { base: show(225, 'Anime Pont', { first_air_date: '2018-04-01', original_name: 'アニメ橋', original_language: 'ja', genre_ids: [16], origin_country: ['JP'] }), status: 'Returning Series', seasons: [[1, range(1, 2)], [2, range(1, 2)], [3, range(1, 2)]], hidden: true };
SHOWS[232] = { base: show(232, 'Crossover Quartet', { first_air_date: '2019-04-09', original_language: 'ja', genre_ids: [16] }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
SHOWS[234] = { base: show(234, 'Crossover Quintet', { first_air_date: '2021-01-12', original_language: 'ja', genre_ids: [16] }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
MOVIES[172] = movie(172, 'Anime Pont : le film', { release_date: '2021-07-01', original_language: 'ja', genre_ids: [16], _hidden: true });
MOVIES[173] = movie(173, 'Gaiden Pont', { release_date: '2022-03-01', original_language: 'ja', genre_ids: [16], _hidden: true });
MOVIES[174] = movie(174, 'Film sans rapport', { release_date: '1995-01-01', original_language: 'ja', genre_ids: [16], _hidden: true });
// Franchise Wikidata de l'anime : un film live (gardé) et le crossover (anime absent du graphe AniList : écarté)
MOVIES[175] = movie(175, 'Pont : le film live', { release_date: '2024-05-01', original_language: 'en', genre_ids: [28], _hidden: true });
// Identifiants externes donnés par TMDB (append_to_response=external_ids)
const EXTERNAL = { 'tv-225': { imdb_id: 'tt9000225', wikidata_id: null } };

// ----- Wikidata simulé -----
// Œuvres : « suivi par » / « précédé par » (numéros TMDB), numéro AniList, sociétés de production.
export const WIKIDATA = {
  'tv-201': { next: [['tv', 202]] }, 'tv-202': { prev: [['tv', 201]] },
  'tv-220': { anilist: 11 }, 'tv-221': { anilist: 12 }, 'tv-222': { anilist: 13 }, 'movie-142': { anilist: 60 },
  'tv-226': { next: [['tv', 227]] }, 'tv-227': { prev: [['tv', 226]] }, 'tv-228': { next: [['tv', 229]] }, 'tv-229': { prev: [['tv', 228]] },
  'movie-160': { companies: ['Studio Test Animation, Inc.'] }, 'movie-163': { companies: ['Studio Test Animation, Inc.'] }
};
// Groupes : nature (P31), lien de l'œuvre vers le groupe (rel) et membres [type, numéro TMDB].
const WD_GROUPS = {
  Q900: { label: 'Licence Test', en: 'Licence Test', types: ['Q196600'], rel: 'franchise', members: [['tv', 216], ['tv', 217], ['tv', 219], ['movie', 140]] },
  Q950: { label: 'Le Labyrinthe', en: 'Maze Runner', types: ['Q24856'], rel: 'series', members: [['movie', 150], ['movie', 151], ['movie', 152]] },
  Q960: { label: 'Jouets Test', en: 'Jouets Test', types: ['Q196600', 'Q56884562'], rel: 'series', members: [['movie', 160], ['movie', 161], ['movie', 162]] },
  Q961: { label: 'liste des films du Studio Test', en: 'list of Studio Test Animation films', types: ['Q13406463'], rel: 'series', members: [['movie', 160], ['movie', 163], ['movie', 164], ['movie', 165]] },
  Q962: { label: 'Classiques du Studio Test', en: 'Studio Test Animation classics', types: ['Q56884562'], rel: 'series', members: [['movie', 160], ['movie', 163], ['movie', 164]] },
  Q963: { label: 'Le Conte du jouet', en: 'The Toy Tale', types: ['Q699'], rel: 'source', members: [['movie', 160], ['movie', 166]] },
  Q964: { label: 'Énorme franchise', en: 'Huge franchise', types: ['Q196600'], rel: 'franchise', members: [['movie', 160], ...range(5000, 5129).map((id) => ['movie', id])] },
  Q965: { label: 'univers de Jouets Test', en: 'Jouets Test universe', types: ['Q559618'], rel: 'universe', members: [['movie', 160], ['movie', 161], ['movie', 167]] },
  Q970: { label: 'univers de Trône Test', en: 'Trône Test universe', types: ['Q559618'], rel: 'universe', members: [['tv', 230], ['tv', 231], ['tv', 233]] },
  Q973: { label: 'Univers Marvelo', en: 'Marvelo Universe', types: ['Q196600'], rel: 'franchise', members: [['tv', 228], ['tv', 229]] },
  Q974: { label: 'Pont', en: 'Pont', types: ['Q196600'], rel: 'franchise', members: [['tv', 225], ['tv', 232], ['movie', 175]] },
  // œuvre d'origine (série de romans) : l'anime 225, et un crossover adapté de plusieurs séries (234, sans numéro AniList dans Wikidata)
  Q975: { label: 'Pont (romans)', en: 'Pont (novels)', types: ['Q104213567'], rel: 'source', members: [['tv', 225], ['tv', 234]], multiSource: ['tv-234'] }
};
// Chaîne de diffusion (P449) : un univers ne relie que les œuvres de la même chaîne, du même studio ou du même créateur
const WD_NETWORK = { 'tv-230': 'Q23633', 'tv-231': 'Q23633', 'tv-233': 'Q1137' };
const keyOfFakeQ = (q) => { const mm = /^Q([78])(\d{6})$/.exec(q || ''); return mm ? (mm[1] === '7' ? 'tv-' : 'movie-') + Number(mm[2]) : ''; };
// Numéros AniList des membres (P8729)
const WD_MEMBER_AL = { 'tv-225': 70, 'tv-232': 78 };
const WIKIDATA_ANILIST = { 11: ['tv', 220], 12: ['tv', 221], 13: ['tv', 222], 60: ['movie', 142] };
const WIKIDATA_IMDB = { tt9000172: ['movie', 172] };
const lit = (v) => ({ type: 'literal', value: String(v) });
const uri = (q) => ({ type: 'uri', value: 'http://www.wikidata.org/entity/' + q });
const fakeQ = (type, id) => (type === 'tv' ? 'Q7' : 'Q8') + String(id).padStart(6, '0');
const inGroup = (g, key) => g.members.some(([t, i]) => t + '-' + i === key);
function relationRows(key) {
  const rel = WIKIDATA[key] || {};
  const rows = [];
  for (const r of ['next', 'prev']) for (const [t, i] of rel[r] || []) rows.push({ rel: lit(r), x: uri(fakeQ(t, i)), xLabel: lit('Titre ' + i), [t]: lit(i) });
  if (rel.anilist) rows.push({ rel: lit('anilist'), al: lit(rel.anilist) });
  for (const [qid, g] of Object.entries(WD_GROUPS)) {
    if (!inGroup(g, key)) continue;
    for (const t of g.types) rows.push({ rel: lit(g.rel), x: uri(qid), xLabel: lit(g.label), en: lit(g.en), t: uri(t) });
  }
  (rel.companies || []).forEach((c, i) => rows.push({ rel: lit('company'), x: uri('Q99000' + i), xLabel: lit(c), en: lit(c) }));
  const [t0, i0] = key.split('-');
  if (i0) rows.push({ rel: lit('self'), x: uri(fakeQ(t0, Number(i0))) });
  return rows;
}
export const wikidataState = { queries: [] };
export async function handleWikidata(route) {
  const q = new URL(route.request().url()).searchParams.get('query') || '';
  wikidataState.queries.push(q);
  let bindings = [];
  if (q.includes('BIND("next" AS ?rel)')) { // relations d'une œuvre (trouvée par son numéro TMDB)
    const m = /\?item wdt:(P4983|P4947) "(\d+)"/.exec(q);
    bindings = m ? relationRows((m[1] === 'P4947' ? 'movie-' : 'tv-') + m[2]) : [];
  } else if (/BIND\("Q\d+" AS \?g\)/.test(q)) { // membres des groupes, bornés par sous-requête
    for (const [, qid, part, limit] of [...q.matchAll(/BIND\("(Q\d+)" AS \?g\)([\s\S]*?)LIMIT (\d+)/g)]) {
      const g = WD_GROUPS[qid];
      // univers : seulement les membres de la même chaîne que l'œuvre ouverte
      const self = /FILTER EXISTS[\s\S]*?wd:(Q\d+) wdt:P449/.exec(part);
      const net = self ? WD_NETWORK[keyOfFakeQ(self[1])] : null;
      const notCrossover = part.includes('FILTER NOT EXISTS { ?m wdt:P144 ?other.');
      const members = g ? g.members.filter(([t, i]) => (!self || (net && WD_NETWORK[t + '-' + i] === net)) && !(notCrossover && (g.multiSource || []).includes(t + '-' + i))) : [];
      if (g) for (const [t, i] of members.slice(0, Number(limit))) bindings.push({ g: lit(qid), m: uri(fakeQ(t, i)), [t]: lit(i), ...(WD_MEMBER_AL[t + '-' + i] ? { al: lit(WD_MEMBER_AL[t + '-' + i]) } : {}) });
    }
  } else { // numéros AniList / IMDb → fiches TMDB
    const al = /VALUES \?al \{([^}]*)\}/.exec(q), im = /VALUES \?imdb \{([^}]*)\}/.exec(q);
    if (al) for (const [, v] of al[1].matchAll(/"(\d+)"/g)) { const k = WIKIDATA_ANILIST[v]; if (k) bindings.push({ al: lit(v), [k[0]]: lit(k[1]) }); }
    if (im) for (const [, v] of im[1].matchAll(/"(tt\d+)"/g)) { const k = WIKIDATA_IMDB[v]; if (k) bindings.push({ imdb: lit(v), [k[0]]: lit(k[1]) }); }
  }
  return route.fulfill({ status: 200, contentType: 'application/sparql-results+json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ head: { vars: [] }, results: { bindings } }) });
}
// ----- AniList simulé (GraphQL, plusieurs médias par requête) : 13 a aussi un spécial « suite », rangé sous sa série -----
const al = (id, title, year, status = 'FINISHED', format = 'TV') => ({ id, type: 'ANIME', format, status, title: { romaji: title, english: null, native: null }, startDate: { year, month: 1, day: 1 } });
// Anime absent de Wikidata et d'ARM (série 224), retrouvé par la recherche AniList (titre original + année) : OVA et suite annoncée
SHOWS[224] = { base: show(224, 'Recherche Test', { first_air_date: '2016-04-03', original_name: 'テスト検索', original_language: 'ja', genre_ids: [16] }), status: 'Ended', seasons: [[1, range(1, 2)]], hidden: true };
const AL_SEARCH = { 'テスト検索': [{ id: 33, format: 'TV', startDate: { year: 2014 }, title: { romaji: 'Tesuto Kensaku', english: null, native: 'テスト検索' } }, { id: 30, format: 'TV', startDate: { year: 2016 }, title: { romaji: 'Tesuto Kensaku', english: 'Search Test', native: 'テスト検索' } }] };
const AL_NODES = { 30: al(30, 'Search Test', 2016), 31: al(31, 'Search Test 2', null, 'NOT_YET_RELEASED'), 32: al(32, 'Search Test OVA', 2017, 'FINISHED', 'OVA'), 60: al(60, 'Chaine Movie', 2012, 'FINISHED', 'MOVIE'), 11: al(11, 'Chaine Ichi', 2005), 12: al(12, 'Chaine Ni', 2010), 13: al(13, 'Chaine San', 2015), 14: al(14, 'Chaine Yon : le retour', null, 'NOT_YET_RELEASED'), 16: al(16, 'Chaine San Season 2', 2018), 17: al(17, 'Chaine San OVA', 2019, 'FINISHED', 'OVA'), 99: al(99, 'Spécial', 2016, 'FINISHED', 'SPECIAL'),
  70: al(70, 'Pont Saison 1', 2018), 71: al(71, 'Pont Saison 2', 2020), 72: al(72, 'Pont le film', 2021, 'FINISHED', 'MOVIE'), 73: al(73, 'Pont OVA', 2019, 'FINISHED', 'OVA'), 74: al(74, 'Pont Gaiden', 2022, 'FINISHED', 'MOVIE'),
  76: al(76, 'Pont Saison 3', 2023), 77: al(77, 'Pont Saison 4', null, 'NOT_YET_RELEASED'), 78: al(78, 'Crossover Quartet', 2019), 79: al(79, 'Pont Mystère', 2022, 'FINISHED', 'MOVIE') };
const AL_REL = { 30: [['SEQUEL', 31], ['SIDE_STORY', 32]], 31: [['PREQUEL', 30]], 60: [['PARENT', 12]], 11: [['SEQUEL', 12]], 12: [['PREQUEL', 11], ['SEQUEL', 13], ['SIDE_STORY', 60]], 13: [['PREQUEL', 12], ['SEQUEL', 99], ['SEQUEL', 16]], 16: [['PREQUEL', 13], ['SEQUEL', 14], ['SIDE_STORY', 17]], 14: [['PREQUEL', 16]],
  70: [['SEQUEL', 71], ['SIDE_STORY', 73], ['CHARACTER', 78]], 71: [['PREQUEL', 70], ['SEQUEL', 72], ['SPIN_OFF', 74], ['SIDE_STORY', 79]], 72: [['PREQUEL', 71], ['SEQUEL', 76]], 76: [['PREQUEL', 72], ['SEQUEL', 77]], 77: [['PREQUEL', 76]],
  73: [['PARENT', 70]], 74: [['PARENT', 71]], 78: [['CHARACTER', 70]], 79: [['PARENT', 71]] };
export const anilistState = { calls: 0 };
export async function handleAnilist(route) {
  const req = route.request();
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
  anilistState.calls++;
  const query = JSON.parse(req.postData() || '{}').query || '';
  const search = /media\(search: ("(?:[^"\\]|\\.)*")/.exec(query);
  if (search) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ data: { Page: { media: AL_SEARCH[JSON.parse(search[1])] || [] } } }) });
  const asked = [...query.matchAll(/(a\d+): Media\(id: (\d+)/g)];
  const media = (id) => (AL_NODES[id] ? { ...AL_NODES[id], relations: { edges: (AL_REL[id] || []).map(([t, n]) => ({ relationType: t, node: AL_NODES[n] })) } } : null);
  // comme AniList : un seul numéro inconnu → « introuvable » (404) pour tout le lot
  if (asked.some(([, , id]) => !AL_NODES[id])) return route.fulfill({ status: 404, contentType: 'application/json', headers: cors, body: JSON.stringify({ data: Object.fromEntries(asked.map(([, a]) => [a, null])), errors: [{ message: 'Not Found.', status: 404 }] }) });
  return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ data: Object.fromEntries(asked.map(([, a, id]) => [a, media(Number(id))])) }) });
}
// ----- ARM simulé (arm.haglund.dev) : correspondances AniList ↔ TMDB / IMDb -----
const ARM = [
  { anilist: 70, media: 'TV', themoviedb: 225, 'themoviedb-season': 1, imdb: 'tt9000225' },
  { anilist: 71, media: 'TV', themoviedb: 225, 'themoviedb-season': 2, imdb: 'tt9000225' },
  { anilist: 72, media: 'MOVIE', themoviedb: 225, 'themoviedb-season': 0, imdb: 'tt9000172' },
  { anilist: 73, media: 'OVA', themoviedb: 225, 'themoviedb-season': 0, imdb: 'tt9000225' },
  { anilist: 74, media: 'MOVIE', themoviedb: 173, 'themoviedb-season': null, imdb: 'tt9000173' },
  { anilist: 79, media: 'MOVIE', themoviedb: 174, 'themoviedb-season': null, imdb: null },
  { anilist: 78, media: 'TV', themoviedb: 232, 'themoviedb-season': 1, imdb: null },
  { anilist: 75, media: 'MOVIE', themoviedb: 225, 'themoviedb-season': null, imdb: 'tt9000175' } // film dont le numéro TMDB (film) vaut 225 : pas la série 225
];
export const armState = { calls: 0, asked: [] };
export async function handleArm(route) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
  armState.calls++;
  const send = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (url.pathname === '/api/v2/ids' && req.method() === 'POST') {
    const list = JSON.parse(req.postData() || '[]');
    armState.asked.push(...list.map((x) => x.anilist));
    return send(list.map((x) => ARM.find((e) => e.anilist === x.anilist) || null));
  }
  if (url.pathname === '/api/v2/themoviedb') return send(ARM.filter((e) => e.themoviedb === Number(url.searchParams.get('id'))));
  if (url.pathname === '/api/v2/imdb') return send(ARM.filter((e) => e.imdb === url.searchParams.get('id')));
  return route.fulfill({ status: 404, contentType: 'application/json', headers: cors, body: '{}' });
}
const STATUS_CODES = { 'Returning Series': '0', Planned: '1', 'In Production': '2', Ended: '3', Canceled: '4', Pilot: '5' };
// Applique les paramètres de /discover comme TMDB (sous-ensemble utilisé par l'application).
function discover(kind, q) {
  const items = kind === 'tv' ? Object.values(SHOWS).filter((s) => !s.hidden).map((s) => ({ ...s.base, _status: s.status, _next: s.next ? s.next.air_date : '' })) : Object.values(MOVIES).filter((m) => !m._hidden).map((m) => ({ ...m }));
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
const COLLECTIONS = { 900: { id: 900, name: 'Saga intégrale', parts: [MOVIES[122], MOVIES[120], MOVIES[121]] }, 950: { id: 950, name: 'Le Labyrinthe - Saga', parts: [MOVIES[152], MOVIES[150], MOVIES[151]] } };
const SEARCH = {
  alpha: { multi: [asShow(201), PERSON, asMovie(101)], movie: [MOVIES[101]], tv: [SHOWS[201].base] },
  anime: { multi: [asShow(202), asShow(210), asShow(211), asShow(212), asMovie(104)], movie: [MOVIES[104]], tv: [SHOWS[202].base, SHOWS[210].base, SHOWS[211].base, SHOWS[212].base] },
  lent: { multi: [asMovie(102)], movie: [MOVIES[102]], tv: [], delay: 1500 },
  rapide: { multi: [asMovie(103)], movie: [MOVIES[103]], tv: [] },
  'maze runner': { multi: [150, 151, 152, 155].map(asMovie), movie: [150, 151, 152, 155].map((id) => MOVIES[id]), tv: [] },
  'labyrinthe': { multi: [153, 154, 150, 151, 152].map(asMovie), movie: [153, 154, 150, 151, 152].map((id) => MOVIES[id]), tv: [] },
  'licence test': { multi: [asShow(217), asMovie(140), asShow(216), asShow(218), asShow(219), PERSON], movie: [MOVIES[140]], tv: [216, 217, 218, 219].map((id) => SHOWS[id].base) },
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
      if (append.includes('external_ids')) out.external_ids = EXTERNAL[key] || { imdb_id: null, wikidata_id: null };
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
