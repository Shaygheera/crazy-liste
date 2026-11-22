// Suite et licence : règles (Node) puis fiche dans Chrome (TMDB, Wikidata, AniList et ARM simulés).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, duplicateIds } from './helpers/browser.mjs';
import { anilistState, armState } from './fixtures/tmdb-mock.mjs';

const { Core: C } = loadCore();
const T = { timeout: 60000 };
const wd = (rows) => ({ results: { bindings: rows } });
const lit = (v) => ({ value: String(v) });
const ent = (q) => ({ value: 'http://www.wikidata.org/entity/' + q });

describe('Licence : règles de titre (affichage seulement)', () => {
  it('début de titre commun : avant « : », « - » ou « ( » ; accents et casse ignorés ; trop court ou générique : rien', () => {
    assert.equal(C.licenceBase('Boruto : Naruto Next Generations'), 'boruto');
    assert.equal(C.licenceBase('Dr. Stone: New World'), 'dr stone');
    assert.equal(C.licenceBase('Naruto Shippuden'), 'naruto shippuden');
    assert.equal(C.licenceBase('Élite - Histoires courtes'), 'elite');
    assert.equal(C.licenceBase('Up'), '');
    assert.equal(C.licenceBase('The Maze Runner'), 'maze runner', 'article ignoré');
    assert.equal(C.licenceBase('KONOSUBA -An Explosion on This Wonderful World!'), 'konosuba', 'tiret collé au mot suivant');
    assert.equal(C.licenceBase('Spider-Man'), 'spider man', 'tiret à l’intérieur d’un mot : pas de coupure');
    assert.equal(C.licenceBase('Konosuba le film - Legend of Crimson'), 'konosuba', '« le film » retiré');
    assert.equal(C.licenceBase('The: Show'), '');
    assert.equal(C.licenceBaseOf({ title: 'Konosuba le film - Legend of Crimson', originalTitle: "KONOSUBA -God's blessing on this wonderful world!- Legend of Crimson" }), 'konosuba');
    assert.equal(C.licenceBaseOf({ title: 'My Hero Academia', originalTitle: '僕のヒーローアカデミア' }), 'my hero academia', 'alphabet latin d’abord');
    assert.equal(C.inLicence('naruto', { title: 'Naruto Shippuden' }), true);
    assert.equal(C.inLicence('naruto', { title: 'Narutoverse' }), false, 'mot entier seulement');
  });
  it('même lignée de titre : valide un « suivi par » de Wikidata, refuse l’ordre de sortie d’un univers', () => {
    assert.equal(C.sameLine({ title: 'Dexter' }, { title: 'Dexter : New Blood' }), true);
    assert.equal(C.sameLine({ title: 'Breaking Bad' }, { title: 'El Camino : un film Breaking Bad' }), true, 'nom repris à l’intérieur du titre');
    assert.equal(C.sameLine({ title: 'Dragon Ball Z' }, { title: 'Dragon Ball GT' }), true, 'deux premiers mots communs');
    assert.equal(C.sameLine({ title: 'Loki' }, { title: 'What If...?' }), false);
    assert.equal(C.sameLine({ title: 'Family Guy' }, { title: 'The Cleveland Show' }), false);
    assert.equal(C.sameLine({ title: 'Black Clover' }, { title: 'Black Butler' }), false, 'un seul mot commun : non');
  });
  it('recherche AniList de secours : titre original ET année exacts, titre échappé', () => {
    const res = [{ id: 1, format: 'TV', startDate: { year: 2014 }, title: { native: '僕のヒーローアカデミア' } }, { id: 2, format: 'TV', startDate: { year: 2016 }, title: { native: '僕のヒーローアカデミア' } }, { id: 3, format: 'MOVIE', startDate: { year: 2016 }, title: { native: '僕のヒーローアカデミア' } }];
    assert.equal(C.pickAnilistMatch(res, { type: 'tv', year: '2016', title: 'My Hero Academia', originalTitle: '僕のヒーローアカデミア' }), 2);
    assert.equal(C.pickAnilistMatch(res, { type: 'tv', year: '2017', title: 'My Hero Academia', originalTitle: '僕のヒーローアカデミア' }), 0, 'année différente : rien plutôt qu’une erreur');
    assert.match(C.anilistSearchQuery('A "B" \\ C'), /search: "A \\"B\\" \\\\ C"/);
  });
});

describe('Licence : Wikidata', () => {
  it('requête : l’œuvre par son numéro TMDB, sinon IMDb ou Wikidata (venus de TMDB) ; identifiants vérifiés', () => {
    const q = C.wikidataQuery(46260, 'tv', { imdb: 'tt0409591', wikidata: 'Q12' });
    assert.match(q, /^SELECT .* \{ \{ \?item wdt:P4983 "46260"\. \} UNION \{ FILTER NOT EXISTS \{ \?z wdt:P4983 "46260"\. \} \?item wdt:P345 "tt0409591"\. \} UNION \{ .*BIND\(wd:Q12 AS \?item\) \}/);
    assert.match(q, /\{ \?item wdt:P156 \?x\. BIND\("next" AS \?rel\) OPTIONAL \{ \?x wdt:P4983 \?tv\. \}/, 'numéros TMDB cherchés dans chaque branche');
    for (const p of ['P8729', 'P179', 'P8345', 'P1434', 'P144', 'P272']) assert.ok(q.includes('wdt:' + p + ' '), p);
    assert.match(C.wikidataQuery('46260 } DROP', 'movie', { imdb: 'tt1" }', wikidata: 'Q1 }' }), /wdt:P4947 "NaN"/);
    assert.doesNotMatch(C.wikidataQuery(1, 'tv', { imdb: 'tt1" }', wikidata: 'Q1 }' }), /P345 "|BIND\(wd:/, 'identifiants invalides ignorés');
  });
  it('réponse : suivant / précédent, numéro AniList, groupes avec leur nature, sociétés', () => {
    const r = C.parseWikidataRelations(wd([
      { rel: lit('next'), tv: lit('31910') }, { rel: lit('next'), tv: lit('31910') }, { rel: lit('prev'), movie: lit('12') }, { rel: lit('next') },
      { rel: lit('autre'), tv: lit('9') }, { rel: lit('next'), tv: lit('<b>') }, { rel: lit('anilist'), al: lit('1735') }, { rel: lit('anilist'), al: lit('x') },
      { rel: lit('series'), x: ent('Q1'), xLabel: lit('Toy Story'), en: lit('Toy Story'), t: ent('Q196600') }, { rel: lit('series'), x: ent('Q1'), t: ent('Q56884562') },
      { rel: lit('franchise'), x: ent('Q1'), t: ent('Q196600') }, { rel: lit('universe'), x: ent('Q2'), xLabel: lit('Q2'), t: ent('Q559618') },
      { rel: lit('source'), x: ent('Q3'), xLabel: lit('Série source'), t: ent('Q5398426'), tv: lit('77') }, { rel: lit('company'), x: ent('Q4'), en: lit('Pixar') },
      { rel: lit('self'), x: ent('Q171048') }
    ]));
    assert.deepEqual([r.next, r.prev, r.anilist, r.companies, r.item], [['tv-31910'], ['movie-12'], [1735], ['pixar'], 'Q171048']);
    assert.deepEqual(r.groups, [
      { id: 'Q1', rels: ['series', 'franchise'], types: ['Q196600', 'Q56884562'], label: 'Toy Story', en: 'Toy Story', key: null },
      { id: 'Q2', rels: ['universe'], types: ['Q559618'], label: '', en: '', key: null },
      { id: 'Q3', rels: ['source'], types: ['Q5398426'], label: 'Série source', en: '', key: 'tv-77' }
    ], 'un libellé qui n’est qu’un numéro Q est ignoré');
    assert.deepEqual(C.parseWikidataRelations(null), { next: [], prev: [], anilist: [], groups: [], companies: [], item: '' });
  });
  it('tri des groupes : listes, catalogues de studio, canons, contes et personnages écartés ; tailles maximales selon la nature', () => {
    const g = (id, rels, types, en) => ({ id, rels, types, label: en, en, key: null });
    const plan = C.wikidataGroupPlan([
      g('Q1', ['series'], ['Q196600', 'Q56884562'], 'Toy Story'),
      g('Q2', ['series'], ['Q13406463'], 'list of Pixar films'),
      g('Q3', ['series'], ['Q56884562'], 'Studio Ghibli Feature Films'),
      g('Q4', ['series'], ['Q56884562'], 'Walt Disney Animation Studios classics'),
      g('Q5', ['source'], ['Q699', 'Q7725634'], 'The Snow Queen'),
      g('Q6', ['source'], ['Q53815', 'Q277759'], 'canon of Sherlock Holmes'),
      g('Q7', ['source'], ['Q21198342'], 'Naruto'),
      g('Q8', ['universe'], ['Q559618'], 'Toy Story universe'),
      g('Q9', ['series', 'universe'], ['Q196600', 'Q3275581'], 'Marvel Cinematic Universe'),
      g('Q10', ['series'], ['Q24856'], 'Maze Runner'),
      g('Q11', ['series'], ['Q56884562'], 'Shrek'),
      g('Q12', ['series'], [], 'Sans nature'),
      g('Q13', ['source'], ['Q1114461'], 'Batman'),
      g('Q14', ['series'], ['Q24856'], 'BBC Filmography')
    ], ['Walt Disney Animation Studios', 'Studio Ghibli, Inc.']);
    assert.deepEqual(plan.map((x) => [x.id, x.props.join('+'), x.cap, x.fallback]), [
      ['Q1', 'P179+P8345', 120, false], ['Q7', 'P144', 40, false], ['Q8', 'P1434', 120, true], ['Q9', 'P179+P8345', 120, false],
      ['Q10', 'P179+P8345', 30, false], ['Q11', 'P179+P8345', 15, false], ['Q12', 'P179+P8345', 15, false]
    ], 'liste, catalogues (« Feature Films », nom d’une société de l’œuvre), conte, canon, personnage, filmographie écartés ; univers seul en secours');
    const q = C.wikidataMembersQuery([{ id: 'Q1', props: ['P179', 'P8345'], cap: 120 }, { id: 'Q1 }', props: ['P179'], cap: 5 }, { id: 'Q7', props: ['P144'], cap: 40 }]);
    assert.match(q, /\{ \?m wdt:P179 wd:Q1\. \} UNION \{ \?m wdt:P8345 wd:Q1\. \} BIND\("Q1" AS \?g\).* LIMIT 121 \}/);
    assert.match(q, /\{ \?m wdt:P144 wd:Q7\. \} BIND\("Q7" AS \?g\).* LIMIT 41 \}/);
    assert.match(q, /FILTER NOT EXISTS \{ \?m wdt:P144 \?other\. FILTER\(\?other != wd:Q7\) \?other wdt:P31 \?otherType\. VALUES \?otherType \{ wd:Q21198342 /, 'adapté aussi d’une autre série : crossover écarté');
    assert.doesNotMatch(q.split('BIND("Q7"')[0], /FILTER NOT EXISTS/, 'pas pour une franchise');
    assert.doesNotMatch(q, /Q1 \}/, 'numéro invalide ignoré');
    assert.match(C.wikidataMembersQuery([]), /FILTER\(false\)/);
    const uni = { id: 'Q8', props: ['P1434'], cap: 120, fallback: true };
    assert.match(C.wikidataMembersQuery([uni], 'Q1399'), /FILTER EXISTS \{ \{ \?m wdt:P449 \?same\. wd:Q1399 wdt:P449 \?same\. \} UNION \{ \?m wdt:P272 \?same\. wd:Q1399 wdt:P272 \?same\. \} UNION \{ \?m wdt:P170 \?same\. wd:Q1399 wdt:P170 \?same\. \} \}/,
      'univers : même chaîne, même studio ou même créateur que l’œuvre');
    assert.match(C.wikidataMembersQuery([uni], 'Q1 }'), /FILTER\(false\)/, 'univers sans élément Wikidata de l’œuvre : pas interrogé');
  });
  it('membres : groupe trop grand écarté entier, groupe sans autre œuvre ignoré, du plus petit au plus grand', () => {
    const rows = [];
    const add = (g, m, type, id) => rows.push({ g: lit(g), m: ent(m), [type]: lit(id) });
    ['1', '2', '3'].forEach((n) => add('Q1', 'Q10' + n, 'movie', n));
    add('Q1', 'Q101', 'movie', '1');
    for (let i = 0; i < 31; i++) add('Q2', 'Q20' + i, 'movie', 100 + i);
    add('Q3', 'Q301', 'movie', '1');
    add('Q4', 'Q401', 'tv', '7'); add('Q4', 'Q402', 'movie', '1');
    rows.push({ g: lit('Q4'), m: ent('Q401'), tv: lit('7'), al: lit('55') }, { g: lit('Q4'), m: ent('Q401'), tv: lit('7'), al: lit('x') });
    const members = C.parseWikidataMembers(wd(rows));
    assert.deepEqual(members.Q1, { count: 3, keys: ['movie-1', 'movie-2', 'movie-3'], al: {} });
    assert.deepEqual(members.Q4.al, { 'tv-7': [55] }, 'numéro AniList du membre (pour reconnaître un crossover)');
    const plan = [{ id: 'Q1', cap: 30, key: null }, { id: 'Q2', cap: 30, key: null }, { id: 'Q3', cap: 30, key: null }, { id: 'Q4', cap: 30, key: 'tv-9' }];
    const r = C.pickWikidataGroups(plan, members, 'movie-1');
    assert.deepEqual(r.groups.map((x) => [x.id, x.size]), [['Q1', 3], ['Q4', 3]], '31 membres pour 30 au plus : écarté ; seule l’œuvre ouverte : ignoré');
    assert.deepEqual(r.keys, ['movie-1', 'movie-2', 'movie-3', 'tv-9', 'tv-7'], 'le groupe, s’il a lui-même une fiche TMDB, en fait partie');
    assert.deepEqual(r.al, { 'tv-7': [55] });
    assert.ok(C.wikidataMembersQuery([{ id: 'Q1', props: ['P179'], cap: 5 }]).includes('OPTIONAL { ?m wdt:P8729 ?al. }'), 'numéro AniList des membres demandé');
  });
  it('nom : le groupe le plus général sans « univers de », sinon la collection TMDB presque aussi grande', () => {
    assert.equal(C.cleanGroupLabel('univers de Toy Story'), 'Toy Story');
    assert.equal(C.cleanGroupLabel('Star Wars (franchise)'), 'Star Wars');
    assert.equal(C.cleanGroupLabel('univers cinématographique Marvel'), 'Univers cinématographique Marvel', 'nom propre gardé');
    const groups = [{ label: 'Iron Man', size: 3 }, { label: 'univers cinématographique Marvel', size: 77 }];
    assert.equal(C.licenceLabel(groups, 'Iron Man', 3), 'Univers cinématographique Marvel');
    assert.equal(C.licenceLabel([{ label: 'Saga cinématographique de la Terre du Milieu', size: 6 }], 'Le Seigneur des anneaux', 3), 'Le Seigneur des anneaux');
    assert.equal(C.licenceLabel([], '', 0), '');
  });
  it('saga de la fiche : collection TMDB d’abord, sinon le plus petit groupe ; jamais toute la licence ni un seul titre', () => {
    const all = ['movie-1', 'movie-2', 'movie-3', 'movie-4', 'movie-5', 'tv-6'];
    const cands = [{ id: 'wd:Q1', label: 'Univers', keys: all }, { id: 'wd:Q2', label: 'Phase 1', keys: ['movie-1', 'movie-4'] }, { id: 'col:9', label: 'Iron Man', keys: ['movie-1', 'movie-2', 'movie-3', 'movie-99'] }];
    assert.deepEqual(C.pickSaga('movie-1', cands, all), { label: 'Iron Man', keys: ['movie-1', 'movie-2', 'movie-3'] }, 'collection prioritaire ; titres hors licence ignorés');
    assert.deepEqual(C.pickSaga('movie-4', cands, all), { label: 'Phase 1', keys: ['movie-1', 'movie-4'] });
    assert.equal(C.pickSaga('tv-6', cands, all), null, 'seul groupe = toute la licence : pas de saga');
    assert.equal(C.pickSaga('movie-5', [{ id: 'wd:Q3', label: 'Seul', keys: ['movie-5'] }], all), null);
    assert.equal(C.collectionLabel('Iron Man - Saga'), 'Iron Man');
    assert.equal(C.collectionLabel('Saga Astérix'), 'Astérix');
  });
  it('numéros AniList et IMDb → fiches TMDB, en une requête bornée', () => {
    const q = C.wikidataIdsQuery([20, 1735, 'x', -3, 20], ['tt0476680', 'tt1" }']);
    assert.match(q, /VALUES \?al \{ "20" "1735" \} \?item wdt:P8729 \?al\./);
    assert.match(q, /VALUES \?imdb \{ "tt0476680" \} \?item wdt:P345 \?imdb\./);
    assert.match(C.wikidataIdsQuery([], []), /FILTER\(false\)/);
    assert.deepEqual(C.parseWikidataIds(wd([{ al: lit(20), tv: lit(46260) }, { al: lit(21), movie: lit(9) }, { imdb: lit('tt0476680'), movie: lit(16907) }, { al: lit(22) }])),
      { al: { 20: { tv: 46260 }, 21: { movie: 9 } }, imdb: { tt0476680: { movie: 16907 } } });
  });
});

describe('Licence : AniList et ARM', () => {
  const n = (id, format, year, rels = [], status = 'FINISHED') => ({ id, type: 'ANIME', format, status, title: { romaji: 'T' + id, english: null }, startDate: { year, month: 3, day: 4 },
    relations: { edges: rels.map(([r, x]) => ({ relationType: r, node: x })) } });
  it('liens suivis (suites, préquelles, parente) et rattachés (parallèles, dérivés, alternatives, résumés) ; jamais les crossovers ni les adaptations', () => {
    const s2 = n(2, 'TV', 2018), film = n(3, 'MOVIE', 2019), ova = n(4, 'OVA', 2017), cross = n(5, 'TV', 2020), manga = Object.assign(n(6, 'MANGA', 2010), { type: 'MANGA' });
    const show = n(1, 'TV', 2016, [['SEQUEL', s2], ['SEQUEL', film], ['SIDE_STORY', ova], ['CHARACTER', cross], ['ADAPTATION', manga], ['OTHER', n(7, 'SPECIAL', 2013)],
      ['SUMMARY', n(8, 'SPECIAL', 2022)], ['SPIN_OFF', n(9, 'TV', 2021)], ['SIDE_STORY', ova]]);
    assert.deepEqual(C.anilistLinks(show).map((l) => l.node.id + ':' + l.kind), ['2:follow', '3:follow', '4:leaf', '8:leaf', '9:leaf'], 'résumé officiel (film « Episode of… ») rattaché');
    const announced = C.normalizeAnilistMedia({ id: 1, type: 'ANIME', format: 'TV', status: 'FINISHED', relations: { edges: [{ relationType: 'ALTERNATIVE', node: { id: 20, type: 'ANIME', format: null, status: 'NOT_YET_RELEASED' } }, { relationType: 'SEQUEL', node: { id: 21, type: 'ANIME', format: null, status: 'FINISHED' } }] } });
    assert.deepEqual(C.anilistLinks(announced).map((l) => l.node.id + ':' + l.node.format + ':' + l.kind), ['20:TV:follow'], 'œuvre annoncée sans format : série (ici une autre version, donc suivie) ; format inconnu d’une œuvre sortie : ignorée');
    assert.equal(C.normalizeAnilistMedia(null), null);
    const fmab = n(5114, 'TV', 2009, [['ALTERNATIVE', n(121, 'TV', 2003)], ['ALTERNATIVE', n(908, 'MOVIE', 2017)]]);
    assert.deepEqual(C.anilistLinks(fmab).map((l) => l.node.id + ':' + l.kind), ['121:follow', '908:leaf'], 'autre version en série : suivie (même licence, ses films compris)');
    const fromFilm = n(3, 'MOVIE', 2019, [['SEQUEL', n(10, 'MOVIE', 2021)], ['SEQUEL', n(11, 'TV', 2022)], ['PARENT', n(1, 'TV', 2016)]]);
    assert.deepEqual(C.anilistLinks(fromFilm).map((l) => l.node.id + ':' + l.kind), ['10:leaf', '11:follow', '1:follow'], 'd’un film : vers une série seulement, jamais de film en film');
    assert.equal(C.anilistStep(show, 'SEQUEL').id, 2);
    assert.equal(C.anilistStep(n(1, 'TV', 2016, [['SEQUEL', film]]), 'SEQUEL'), null, 'séries seulement par défaut');
    assert.equal(C.anilistStep(n(1, 'TV', 2016, [['SEQUEL', film]]), 'SEQUEL', true).id, 3, 'saison 2 → film → saison 3 : on passe par le film');
    assert.equal(C.anilistTitle({ title: { english: null, romaji: 'NARUTO: Shippuuden' } }), 'NARUTO: Shippuuden');
  });
  it('requête groupée : alias par numéro, 15 médias au plus, numéros vérifiés', () => {
    const q = C.anilistBatchQuery([20, 1735, '97938 }', 20, -1]);
    assert.equal((q.match(/: Media\(id: /g) || []).length, 2);
    assert.match(q, /^\{ a20: Media\(id: 20, type: ANIME\) \{ .* \} a1735: Media\(id: 1735, type: ANIME\)/);
    assert.equal((C.anilistBatchQuery(Array.from({ length: 40 }, (_, i) => i + 1)).match(/: Media\(id: /g) || []).length, C.ANILIST_BATCH);
    assert.equal(C.ANILIST_BATCH, 15);
  });
  it('ARM : œuvre d’une fiche ; un numéro TMDB de film n’est pas celui d’une série', () => {
    const entries = [{ anilist: 75, media: 'MOVIE', themoviedb: 225, 'themoviedb-season': null }, { anilist: 71, media: 'TV', themoviedb: 225, 'themoviedb-season': 2 },
      { anilist: 70, media: 'TV', themoviedb: 225, 'themoviedb-season': 1 }, { anilist: 73, media: 'OVA', themoviedb: 225, 'themoviedb-season': 0 }];
    assert.equal(C.armStart(entries, 'tv', false), 70, 'série : la première saison');
    assert.equal(C.armStart(entries, 'movie', false), 75, 'film : entrée film sans saison');
    assert.equal(C.armStart([{ anilist: 442, media: 'MOVIE', themoviedb: 46260, 'themoviedb-season': 0 }], 'movie', false), 0, 'film rangé en saison 0 d’une série : ce numéro est celui de la série');
    assert.equal(C.armStart([{ anilist: 442, media: 'MOVIE', themoviedb: 46260, 'themoviedb-season': 0 }], 'movie', true), 442, 'trouvé par son propre numéro IMDb : c’est bien lui');
    assert.equal(C.armStart(null, 'tv', false), 0);
  });
  it('fiches TMDB : Wikidata, puis ARM (saison), puis IMDb ; épisode spécial « saison 0 » rangé dans sa série ; rien de deviné', () => {
    const map = C.anilistTmdbMap([n(1, 'TV', 2002), n(2, 'TV', 2004), n(3, 'MOVIE', 2004), n(4, 'MOVIE', 2005), n(5, 'OVA', 2006), n(6, 'MOVIE', 2007), n(7, 'OVA', 2008), n(8, 'MOVIE', 2009)], {
      1: { anilist: 1, media: 'TV', themoviedb: 46260, 'themoviedb-season': 1 }, 2: { anilist: 2, media: 'TV', themoviedb: 46260, 'themoviedb-season': 2 },
      3: { anilist: 3, media: 'MOVIE', themoviedb: 46260, 'themoviedb-season': 0, imdb: 'tt0476680' }, 4: { anilist: 4, media: 'MOVIE', themoviedb: 532067, 'themoviedb-season': null },
      5: { anilist: 5, media: 'OVA', themoviedb: 46260, 'themoviedb-season': 0 }, 6: { anilist: 99, media: 'MOVIE', themoviedb: 1 }, 8: { anilist: 8, media: 'MOVIE', themoviedb: 77, 'themoviedb-season': null }
    }, { al: { 7: { tv: 500 }, 8: { movie: 88 } }, imdb: { tt0476680: { movie: 16907 } } });
    assert.deepEqual(map, {
      1: { key: 'tv-46260', show: 'tv-46260', season: 1 }, 2: { key: 'tv-46260', show: 'tv-46260', season: 2 },
      3: { key: 'movie-16907', show: 'tv-46260', season: 0 }, 4: { key: 'movie-532067', show: null, season: null }, 5: { key: null, show: 'tv-46260', season: 0 },
      7: { key: 'tv-500', show: 'tv-500', season: null }, 8: { key: 'movie-88', show: null, season: null }
    }, 'entrée ARM d’un autre numéro ignorée ; Wikidata prioritaire pour un film');
    assert.equal(C.yearsAgree({ startDate: { year: 2022 } }, { year: '1995' }, false), false);
    assert.equal(C.yearsAgree({ startDate: { year: 2022 } }, { year: '2021' }, false), true);
    assert.equal(C.yearsAgree({ startDate: { year: 2020 } }, { year: '2013' }, true), true, 'saison 3 d’une série TMDB commencée avant');
    assert.equal(C.yearsAgree({ startDate: { year: 2013 } }, { year: '2020' }, true), false);
    assert.equal(C.yearsAgree({ startDate: {} }, { year: '2020' }, true), true, 'date inconnue : pas de refus');
  });
  it('licence d’un graphe : saisons regroupées, saison après un film-pont, films sous leur série, dérivé, annonce', () => {
    const s1 = n(1, 'TV', 2016), s2 = n(2, 'TV', 2017), film = n(3, 'MOVIE', 2019), s3 = n(4, 'TV', 2024), s4 = n(5, 'TV', null, [], 'NOT_YET_RELEASED');
    const ova = n(6, 'OVA', 2016), spin = n(7, 'TV', 2023), side = n(8, 'MOVIE', 2020);
    s1.relations.edges = [{ relationType: 'SEQUEL', node: s2 }, { relationType: 'SIDE_STORY', node: ova }];
    s2.relations.edges = [{ relationType: 'PREQUEL', node: s1 }, { relationType: 'SEQUEL', node: film }, { relationType: 'SPIN_OFF', node: spin }];
    film.relations.edges = [{ relationType: 'PREQUEL', node: s2 }, { relationType: 'SEQUEL', node: s3 }, { relationType: 'SIDE_STORY', node: side }];
    s3.relations.edges = [{ relationType: 'PREQUEL', node: film }, { relationType: 'SEQUEL', node: s4 }];
    s4.relations.edges = [{ relationType: 'PREQUEL', node: s3 }];
    const nodes = new Map([s1, s2, film, s3, s4].map((x) => [x.id, x]));
    const leaves = [{ node: ova, from: 1 }, { node: spin, from: 2 }, { node: side, from: 3 }];
    const map = { 1: { key: 'tv-10', show: 'tv-10' }, 3: { key: 'movie-30', show: null }, 7: { key: 'tv-70', show: 'tv-70' }, 6: { key: null, show: 'tv-10' } };
    const L = C.anilistLicence(nodes, [4, 2, 1, 3, 5], leaves, map, new Map([[2, 1], [3, 2], [4, 3], [5, 4]]));
    assert.deepEqual(L.chain.map((c) => [c.al, c.key, c.show, c.next]), [[1, 'tv-10', 'tv-10', 2], [2, null, 'tv-10', 3], [3, 'movie-30', null, 4], [4, null, 'tv-10', 5], [5, null, null, 0]],
      'par date ; saison sans fiche : celle de sa préquelle, même à travers un film ; annonce : aucune');
    assert.deepEqual(L.extras.map((e) => [e.al, e.seriesKey, e.key]), [[3, 'tv-10', 'movie-30'], [6, 'tv-10', null], [8, 'tv-10', null]]);
    assert.deepEqual(L.series, ['tv-70'], 'série dérivée avec sa fiche');
    assert.deepEqual([L.root, L.rootKey], [1, 'tv-10']);
  });
});

describe('Licence : rangement du panneau', () => {
  it('AniList : type, série exacte ; sans fiche TMDB : lien AniList ; même œuvre vue des deux côtés : une seule entrée', () => {
    const s1 = { key: 'tv-1', type: 'tv', title: 'Série Un', date: '2010-01-01' }, s2 = { key: 'tv-2', type: 'tv', title: 'Série Deux', date: '2015-01-01' };
    const film = { key: 'movie-7', type: 'movie', title: 'Série Un : OVA de Noël', date: '2016-12-01' };
    const autre = { key: 'movie-8', type: 'movie', title: 'Série Un : le film', date: '2011-06-01' };
    const r = C.attachExtras([{ series: s1, films: [film, autre] }, { series: s2, films: [] }], [], [
      { al: 70, format: 'SPECIAL', title: 'Spécial', date: '2014-01-01', seriesKey: 'tv-1', key: 'movie-7' },
      { al: 71, format: 'OVA', title: 'OVA sans fiche', date: '2016-02-02', seriesKey: 'tv-2', key: null },
      { al: 72, format: 'OVA', title: 'Série inconnue', date: '2016-02-02', seriesKey: 'tv-9', key: null }
    ]);
    assert.deepEqual(r.groups.map((g) => [g.series.key, g.films.map((x) => x.key + ':' + x.kind)]), [['tv-1', ['movie-8:MOVIE', 'movie-7:SPECIAL']], ['tv-2', ['anilist-71:OVA']]]);
    const twin = C.attachExtras([{ series: s1, films: [] }, { series: s2, films: [{ key: 'movie-9', type: 'movie', title: 'NARUTO -ナルト- THE CROSS ROADS', date: '2009-12-19' }] }], [],
      [{ al: 80, format: 'SPECIAL', title: 'NARUTO: THE CROSS ROADS', date: '2009-12-19', seriesKey: 'tv-1', key: null }]);
    assert.deepEqual(twin.groups.map((g) => g.films.map((x) => x.key + ':' + x.kind)), [['movie-9:SPECIAL'], []]);
  });
  it('un film va sous la seule série dont il reprend le nom ; sinon « Autres films » (plus de rangement d’après les dates)', () => {
    const tv = (id, title, date) => ({ key: 'tv-' + id, type: 'tv', id, title, date });
    const mv = (id, title, date) => ({ key: 'movie-' + id, type: 'movie', id, title, date });
    const { groups, orphans } = C.licenceGroups([
      tv(1, 'Naruto', '2002-10-03'), tv(2, 'Naruto Shippuden', '2007-02-15'), tv(3, 'Boruto : Naruto Next Generations', '2017-04-05'),
      tv(4, 'Star Trek', '1966-09-08'), tv(5, 'Star Trek : La Nouvelle Génération', '1987-09-28'),
      mv(10, 'Naruto et la Princesse des neiges', '2004-08-21'), mv(11, 'Naruto Shippuden : Les Liens', '2008-08-02'), mv(12, 'Boruto : Naruto, le film', '2015-08-07'),
      mv(14, 'The Last', '2014-12-06'), mv(16, 'Star Trek : Nemesis', '2002-12-13')
    ]);
    assert.deepEqual(groups.map((g) => [g.series.key, g.films.map((x) => x.key)]), [['tv-4', []], ['tv-5', []], ['tv-1', ['movie-10']], ['tv-2', ['movie-11']], ['tv-3', ['movie-12']]]);
    assert.deepEqual(orphans.map((x) => x.key), ['movie-16', 'movie-14'], 'nom porté par deux séries, ou aucune : pas de choix au hasard');
  });
  it('recherche « Quand regarder … » : anime ou série, texte encodé', () => {
    const u = new URL(C.watchWhenSearchUrl('The Last : Naruto, le film', 'Naruto Shippuden', true));
    assert.equal(u.origin + u.pathname, 'https://www.google.com/search');
    assert.equal(u.searchParams.get('q'), "Quand regarder The Last : Naruto, le film dans l'anime Naruto Shippuden");
    assert.equal(new URL(C.watchWhenSearchUrl('A & B', 'C#D', false)).searchParams.get('q'), 'Quand regarder A & B dans la série C#D');
  });
});

describe('Licence : fiche', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  const col = (page, id) => page.locator('#detail-cards [data-col="' + id + '"]').textContent();
  const eras = (page) => page.$$eval('#detail-licence .lera[data-series]', (els) => els.map((e) => e.dataset.series));
  const films = (page, series) => page.$$eval('#detail-licence ' + (series ? '[data-series="' + series + '"] ' : '') + '.lfilm', (els) => els.map((e) => e.dataset.itemKey));
  const button = (page) => page.locator('#detail-licence-btn .licbtn').textContent();
  const ready = (page) => page.waitForFunction(() => { const r = document.querySelector('#detail-licence-btn'); return r && !r.querySelector('[disabled]'); }, null, { timeout: 15000 });
  async function openLicence(page) {
    await page.locator('#detail-licence-btn .licbtn').click();
    await page.waitForSelector('#detail-licence:not([hidden]) .lera');
  }

  it('franchise Wikidata : séries et film reliés, film sous la série dont il reprend le nom ; ni suite devinée, ni recherche par titre, ni ARM', T, async () => {
    const arm0 = armState.calls;
    const { page, errors, context, mock } = await openApp(browser, { hash: '#detail/tv/216' });
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    assert.equal(await button(page), '▾ Licence « Licence Test »3 séries · 1 film');
    assert.match(await page.locator('#detail-cards .dcard-head').textContent(), /^Diffusion/);
    assert.equal(await page.locator('#detail-cards [data-col="suite"]').count(), 0, 'plus de « suite probable » devinée');
    assert.match(await page.locator('.detail-meta .detail-badges').first().textContent(), /^Mon suivi :/, 'Mon suivi juste sous l’affiche');
    assert.equal(await page.locator('#detail-licence').isHidden(), true, 'fermé par défaut');
    await openLicence(page);
    assert.equal(await page.locator('#detail-licence-btn .licbtn').getAttribute('aria-expanded'), 'true');
    assert.deepEqual(await eras(page), ['tv-219', 'tv-216', 'tv-217'], 'une ligne par série, par date ; faux ami « Licencieux » absent');
    assert.deepEqual(await films(page, 'tv-216'), ['movie-140']);
    assert.equal(await page.locator('#detail-licence .lera.is-current').getAttribute('data-series'), 'tv-216');
    assert.match(await page.locator('#detail-licence .lera.is-current').textContent(), /tu es ici/);
    // Films liés, juste au-dessus des saisons, avec une recherche « Quand le regarder ? »
    assert.deepEqual(await page.$$eval('#detail-films .film-row', (els) => els.map((e) => e.dataset.itemKey)), ['movie-140']);
    assert.equal(await page.evaluate(() => document.getElementById('detail-films').nextElementSibling.id), 'seasons-section');
    const search = page.locator('#detail-films .film-row-search');
    assert.equal(await search.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(new URL(await search.getAttribute('href')).searchParams.get('q'), 'Quand regarder Licence Test : le film dans la série Licence Test : Première partie');
    assert.equal(mock.state.requests.filter((r) => r.startsWith('/search/')).length, 0, 'aucune recherche par titre');
    assert.equal(armState.calls, arm0, 'pas un anime : ARM n’est pas interrogé');
    await page.locator('#detail-licence .lfilm[data-item-key="movie-140"]').click();
    await page.waitForFunction(() => location.hash === '#detail/movie/140');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('film d’une saga dans une grande licence : deux boutons, « Saga » (Iron Man) et « Licence » (tout Marvel)', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/176' });
    const btns = page.locator('#detail-licence-btn .licbtn');
    await page.waitForFunction(() => document.querySelectorAll('#detail-licence-btn .licbtn[data-scope]').length === 2, null, { timeout: 15000 });
    assert.deepEqual(await btns.allTextContents(), ['▾ Saga « Homme de Fer »3 films', '▾ Licence « Univers Merveille »8 films']);
    assert.deepEqual(await btns.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)')), [true, true], 'aucun bouton coloré avant le clic');
    await btns.nth(0).click();
    await page.waitForSelector('#detail-licence:not([hidden]) .lera');
    assert.deepEqual(await films(page), ['movie-176', 'movie-177', 'movie-178'], 'Saga : seulement les 3 films');
    assert.match(await page.locator('#detail-licence .licence-head h2').textContent(), /^Saga « Homme de Fer »$/);
    assert.deepEqual(await btns.evaluateAll((els) => els.map((e) => e.getAttribute('aria-expanded'))), ['true', 'false']);
    const bg = () => btns.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'));
    assert.deepEqual(await bg(), [true, false], 'seul le bouton ouvert est coloré');
    assert.equal(await page.locator('#licence-dialog').evaluate((d) => d.open), true, 'ouvert dans une fenêtre');
    await page.locator('#detail-licence [data-action="licence-toggle"][data-scope="all"]').click(); // depuis la fenêtre : toute la licence
    await page.waitForFunction(() => document.querySelectorAll('#detail-licence .lfilm').length === 8);
    assert.match(await page.locator('#detail-licence .licence-head h2').textContent(), /^Licence « Univers Merveille »$/);
    assert.deepEqual(await btns.allTextContents(), ['▾ Saga « Homme de Fer »3 films', '▴ Licence « Univers Merveille »8 films']);
    assert.deepEqual(await bg(), [false, true], 'après le clic sur Licence, Saga n’est plus coloré');
    await page.keyboard.press('Escape'); // Échap ferme la fenêtre
    await page.waitForFunction(() => !document.getElementById('licence-dialog').open);
    assert.equal(await page.locator('#detail-licence').isHidden(), true);
    assert.deepEqual(await btns.evaluateAll((els) => els.map((e) => e.getAttribute('aria-expanded'))), ['false', 'false']);
    await btns.nth(1).click(); // bouton Licence : ouvre directement toute la licence
    await page.waitForFunction(() => document.querySelectorAll('#detail-licence .lfilm').length === 8);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('licence répertoriée dans le menu Licences (MCU) : la fenêtre montre la frise de ce menu', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/1726', mock: { generic: true } });
    await page.waitForFunction(() => /Licence « Marvel Cinematic Universe »/.test((document.querySelector('#detail-licence-btn') || {}).textContent || ''), null, { timeout: 15000 });
    assert.match(await page.locator('#detail-licence-btn .licbtn').last().textContent(), /comme dans le menu Licences$/);
    await page.locator('#detail-licence-btn .licbtn').last().click();
    await page.waitForSelector('#licence-saga-body[data-saga="mcu"] .snake-item', { timeout: 20000 });
    assert.ok(await page.locator('#licence-saga-body .snake-item').count() > 20, 'frise par phase, comme la page de la licence');
    assert.equal(await page.locator('#licence-dialog a[href="#saga/mcu"]').count(), 1, 'lien vers la page complète');
    assert.match(await page.locator('nav').first().textContent(), /Licences/, 'menu renommé');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('fiche d’un film : même licence, le film ouvert mis en avant sous sa série, nom de la franchise', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/140' });
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-219', 'tv-216', 'tv-217']);
    assert.equal(await page.locator('#detail-licence [data-series="tv-216"] .lfilm.is-current').getAttribute('data-item-key'), 'movie-140');
    assert.match(await page.locator('#detail-licence .licence-head h2').textContent(), /^Licence « Licence Test »$/);
    assert.match(await page.locator('#detail-licence .lfilm.is-current').textContent(), /Film[\s\S]*tu es ici/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('film d’une collection : la saga officielle seulement, sans les films au titre français proche', T, async () => {
    const arm0 = armState.calls;
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/150' });
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    assert.equal(await button(page), '▾ Licence « Le Labyrinthe »3 films');
    await openLicence(page);
    assert.deepEqual(await films(page), ['movie-150', 'movie-151', 'movie-152'], 'pas « Le Labyrinthe » (1953), « Le Labyrinthe de Pan », ni le documentaire');
    assert.match(await page.locator('#detail-licence .lseries-title').textContent(), /^Films$/);
    assert.equal(armState.calls, arm0, 'pas un anime : ARM n’est pas interrogé');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('pièges Wikidata : ni liste ni catalogue du studio, ni franchise démesurée, ni conte d’origine — seulement la vraie série', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/160' });
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    assert.equal(await button(page), '▾ Licence « Jouets Test »3 films');
    await openLicence(page);
    assert.deepEqual(await films(page), ['movie-160', 'movie-161', 'movie-162'], 'pas les autres films du studio (163-165), du conte (166), de l’univers (167) ni de la franchise de 130 films');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('film relié seulement à la liste et au catalogue de son studio : pas de bouton Licence', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/163' });
    await page.waitForSelector('#detail-cards .dcard-head');
    await ready(page);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#detail-licence-btn .licbtn').count(), 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('aucun lien fiable (titre seulement proche) : pas de bouton Licence, aucune recherche par titre', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#detail/movie/153' });
    await page.waitForSelector('#detail-cards .dcard-head');
    await ready(page);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#detail-licence-btn .licbtn').count(), 0, '« Le Labyrinthe » (1953) n’est relié à rien');
    assert.equal(mock.state.requests.filter((r) => r.startsWith('/search/')).length, 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('univers en secours : seul lien entre deux séries de la même chaîne (comme Game of Thrones et House of the Dragon), pas une autre adaptation', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/231' });
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    assert.equal(await button(page), '▾ Licence « Trône Test »2 séries · 0 film');
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-230', 'tv-231'], 'série du même univers mais d’une autre chaîne (233) : écartée');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('« suivi par » de Wikidata : suite si le titre continue (Dextre → Dextre : Nouveau sang), pas l’ordre de sortie d’un univers', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/226' });
    await page.waitForSelector('#detail-cards [data-col="suite"]', { timeout: 15000 });
    assert.equal(await col(page, 'suite'), 'SuiteDextre : Nouveau sang ›Série · 2021');
    for (const [hash, label] of [['#detail/tv/228', '▾ Licence « Univers Marvelo »2 séries · 0 film'], ['#detail/tv/201', '▾ Licence « Série Alpha »2 séries · 0 film']]) {
      await page.evaluate((h) => { location.hash = h; }, hash);
      // les deux séries sont bien dans la licence…
      await page.waitForFunction((l) => { const b = document.querySelector('#detail-licence-btn .licbtn'); return !!b && b.textContent === l; }, label, { timeout: 15000 });
      assert.equal(await page.locator('#detail-cards [data-col="suite"]').count(), 0, hash + ' : … mais un titre sans rapport (Loka → Et si… ?) n’est pas présenté comme suite');
    }
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('chaîne AniList : titres aux noms différents reliés, suite confirmée, licence nommée d’après la première série', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/221' });
    await page.waitForSelector('#detail-cards [data-col="suite"]', { timeout: 15000 });
    assert.match(await col(page, 'suite'), /^SuiteTroisième Volet ›Anime · 2015$/);
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-220', 'tv-221', 'tv-222']);
    assert.match(await page.locator('#detail-licence .licence-head h2').textContent(), /^Licence « Chaîne Un »$/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('suite annoncée par AniList mais absente de TMDB : nommée, sans lien ; spécial et OVA rangés sous leur série', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/222' });
    await page.waitForSelector('#detail-cards [data-col="suite"]', { timeout: 15000 });
    assert.equal(await col(page, 'suite'), 'Suite annoncéeChaine Yon : le retourAnime · en production · pas encore sur TMDB');
    assert.equal(await page.locator('#detail-cards [data-col="suite"] a').count(), 0);
    assert.match(await button(page), /4 séries · 1 film · 2 OVA \/ spéciaux$/, 'la suite annoncée compte comme série');
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-220', 'tv-221', 'tv-222']);
    assert.match(await page.locator('#detail-licence .lera.is-announced').textContent(), /Chaine Yon : le retour[\s\S]*annoncée · pas encore sur TMDB/);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('anime absent de Wikidata : relié par ARM (IMDb), film-pont retrouvé par son IMDb, mauvaise fiche écartée par l’année, crossovers ignorés', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/225' });
    await page.waitForSelector('#detail-cards [data-col="suite"]', { timeout: 15000 });
    assert.equal(await col(page, 'suite'), 'Suite annoncéePont Saison 4Anime · en production · pas encore sur TMDB', 'saison 3 (sans fiche, après le film) rattachée à la série : la suite est la saison 4');
    assert.equal(await button(page), '▾ Licence « Anime Pont »2 séries · 4 films · 1 OVA / spécial');
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-225']);
    assert.deepEqual(await films(page, 'tv-225'), ['anilist-73', 'movie-172', 'anilist-79', 'movie-173'], 'OVA (spécial de la série), film-pont, film mal relié (lien AniList seulement), film dérivé');
    assert.equal(await page.locator('#detail-licence [data-item-key="movie-174"]').count(), 0, 'fiche TMDB d’une autre époque : écartée');
    assert.equal(await page.locator('#detail-licence [data-series="tv-232"]').count(), 0, 'crossover : ignoré, même s’il est dans la franchise Wikidata (anime absent du graphe AniList)');
    assert.equal(await page.locator('#detail-licence [data-series="tv-234"]').count(), 0, 'crossover adapté de plusieurs séries (sans numéro AniList) : ignoré');
    assert.deepEqual(await films(page).then((all) => all.filter((k) => !k.startsWith('anilist-') && !['movie-172', 'movie-173'].includes(k))), ['movie-175'], 'film live de la franchise : gardé (« Autres films »)');
    assert.ok(!armState.asked.includes(78), 'le crossover n’est même pas recherché');
    assert.deepEqual(await page.$$eval('#detail-films .film-row', (els) => els.map((e) => e.dataset.kind)), ['OVA', 'MOVIE', 'MOVIE', 'MOVIE']);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('même licence depuis n’importe quelle fiche (série, autre série, film relié), puis affichage immédiat sans nouvelle requête AniList', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/220' });
    const snapshot = async () => page.$$eval('#detail-licence .lera', (els) => els.map((e) => (e.dataset.series || 'annoncée') + ':' + [...e.querySelectorAll('.lfilm')].map((f) => f.dataset.itemKey).join(',')));
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    await openLicence(page);
    const ref = await snapshot();
    assert.deepEqual(ref, ['tv-220:', 'tv-221:movie-142', 'tv-222:anilist-99,anilist-17', 'annoncée:'], 'film relié par AniList sous sa série ; spécial et OVA d’une saison sans fiche TMDB avec la série');
    const label = (await button(page)).slice(2); // sans la flèche ouvert / fermé
    const calls = anilistState.calls;
    for (const hash of ['#detail/tv/222', '#detail/movie/142']) {
      await page.evaluate((h) => { location.hash = h; }, hash);
      await page.waitForFunction((h) => location.hash === h, hash);
      await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])');
      assert.equal((await button(page)).slice(2), label, hash + ' : même bouton');
      await openLicence(page);
      assert.deepEqual(await snapshot(), ref, hash + ' : même contenu');
    }
    assert.equal(anilistState.calls, calls, 'licence réutilisée : aucune nouvelle requête AniList');
    assert.equal(await page.locator('#detail-licence .lfilm.is-current').getAttribute('data-item-key'), 'movie-142', 'le film ouvert est mis en avant');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('crazy-liste-licences')));
    assert.equal(stored.v, 10, 'nouvelle version : les licences calculées avec les anciennes règles sont refaites');
    assert.equal(stored.list[0].id, 'al:11', 'identifiée par sa série racine');
    await page.reload();
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])');
    assert.equal(anilistState.calls, calls, 'après rechargement : licence gardée, affichée sans attendre AniList');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('anciennes licences (version 8) ignorées : recalculées avec les nouvelles règles', T, async () => {
    const old = JSON.stringify({ v: 8, list: [{ id: 'base:licence test', at: Date.now(), label: 'Ancienne', items: [{ key: 'tv-216', title: 'Licence Test : Première partie' }, { key: 'tv-218', title: 'Licencieux' }], extras: [], chain: [] }] });
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/216', storage: { 'crazy-liste-licences': old } });
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    assert.equal(await button(page), '▾ Licence « Licence Test »3 séries · 1 film');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('AniList refuse une requête (trop de demandes) : nouvelle tentative, la licence s’affiche ; bouton « recherche » pendant le calcul', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#home' });
    let refused = 0;
    await context.route('https://graphql.anilist.co/**', async (route) => {
      if (route.request().method() === 'POST' && refused === 0) { refused++; return route.fulfill({ status: 429, headers: { 'access-control-allow-origin': '*' }, body: '{}' }); }
      await new Promise((r) => setTimeout(r, 150));
      return route.fallback();
    });
    await page.evaluate(() => { location.hash = '#detail/tv/221'; });
    await page.waitForSelector('#detail-licence-btn .licbtn[disabled]');
    assert.match(await button(page), /Recherche des séries, films et OVA/);
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    assert.equal(refused, 1);
    await openLicence(page);
    assert.deepEqual(await eras(page), ['tv-220', 'tv-221', 'tv-222']);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('anime absent de Wikidata et d’ARM : retrouvé sur AniList par titre original et année (OVA et suite annoncée)', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/224' });
    await page.waitForSelector('#detail-cards [data-col="suite"]', { timeout: 15000 });
    assert.match(await col(page, 'suite'), /^Suite annoncéeSearch Test 2/);
    assert.match(await button(page), /2 séries · 0 film · 1 OVA \/ spécial$/);
    assert.deepEqual(await page.$$eval('#detail-films .film-row', (els) => els.map((e) => e.dataset.kind)), ['OVA']);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('AniList injoignable : licence Wikidata d’une série toujours affichée ; licence d’anime incomplète non gardée', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#home' });
    await context.route('https://graphql.anilist.co/**', (r) => r.abort());
    await page.evaluate(() => { location.hash = '#detail/tv/216'; });
    await page.waitForSelector('#detail-licence-btn .licbtn:not([disabled])', { timeout: 15000 });
    assert.equal(await button(page), '▾ Licence « Licence Test »3 séries · 1 film', 'pas un anime : AniList n’est pas nécessaire');
    await page.evaluate(() => { location.hash = '#detail/tv/221'; });
    await page.waitForSelector('#detail-licence-btn .licbtn[disabled]', { timeout: 15000 }); // calcul en cours (AniList retenté)…
    await page.waitForFunction(() => !document.querySelector('#detail-licence-btn .licbtn[disabled]'), null, { timeout: 15000 }); // … terminé
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('crazy-liste-licences') || '{"list":[]}'));
    assert.deepEqual(stored.list.map((L) => L.id), ['wd:Q900'], 'licence de l’anime incomplète : non gardée');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('Wikidata injoignable et aucun titre lié : pas de colonne Suite, pas de bouton Licence, aucune erreur', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/205' });
    await context.route('https://query.wikidata.org/**', (r) => r.abort());
    await page.reload();
    await page.waitForSelector('#detail-cards .dcard-head');
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#detail-cards [data-col="suite"]').count(), 0);
    assert.equal(await page.locator('#detail-licence-btn .licbtn').count(), 0);
    assert.equal(await page.locator('#detail-films .film-row').count(), 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
