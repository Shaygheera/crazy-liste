// Tests unitaires de la logique métier (aucun réseau, aucun navigateur).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';

const { Core: C, Data: D } = loadCore();
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const tvMeta = (id, seasons) => ({ key: 'tv-' + id, type: 'tv', id, title: 'Série ' + id,
  seasonSummaries: seasons.map(([number, nums]) => (Array.isArray(nums)
    ? { number, name: 'Saison ' + number, airDate: '', episodeCount: nums.length, episodeNumbers: nums }
    : { number, name: 'Saison ' + number, airDate: '', episodeCount: nums })) });
const T0 = 1_700_000_000_000;

describe('A. Épisodes', () => {
  const meta = tvMeta(1, [[1, range(1, 10)]]);
  it('modifier un épisode ne modifie pas ses voisins', () => {
    let t = C.emptyTrack('tv', 1);
    t = C.setEpisodeStatus(t, 1, 2, 'progress', T0);
    t = C.setEpisodeStatus(t, 1, 4, 'seen', T0 + 1);
    const before = range(1, 10).map((n) => C.episodeStatus(t, 1, n));
    const after = C.setEpisodeStatus(t, 1, 3, 'seen', T0 + 2);
    range(1, 10).forEach((n, i) => { if (n !== 3) assert.equal(C.episodeStatus(after, 1, n), before[i], 'épisode ' + n); });
    assert.equal(C.episodeStatus(after, 1, 3), 'seen');
    assert.equal(C.episodeStatus(t, 1, 3), 'todo', 'l’objet d’origine reste intact (transition pure)');
  });
  it('un seul épisode vu sur dix laisse la saison En cours', () => {
    const t = C.setEpisodeStatus(C.emptyTrack('tv', 1), 1, 1, 'seen', T0);
    const s = C.computeShowState(meta, t).seasons[0];
    assert.deepEqual([s.status, s.seen, s.total], ['progress', 1, 10]);
  });
  it('tous les épisodes vus donnent une saison Vue', () => {
    let t = C.emptyTrack('tv', 1);
    for (const n of range(1, 10)) t = C.setEpisodeStatus(t, 1, n, 'seen', T0 + n);
    assert.equal(C.computeShowState(meta, t).seasons[0].status, 'seen');
  });
  it('remettre un épisode à À voir fait repasser la saison En cours', () => {
    let t = C.setSeasonStatus(C.emptyTrack('tv', 1), 1, range(1, 10), 'seen', T0);
    t = C.setEpisodeStatus(t, 1, 7, 'todo', T0 + 1);
    assert.equal(C.computeShowState(meta, t).seasons[0].status, 'progress');
    assert.equal(C.episodeStatus(t, 1, 7), 'todo');
  });
  it('un épisode absent de la sauvegarde est À voir, jamais Vu', () => {
    assert.equal(C.episodeStatus(C.emptyTrack('tv', 1), 1, 5), 'todo');
    assert.equal(C.computeShowState(meta, C.emptyTrack('tv', 1)).seasons[0].status, 'todo');
  });
  it('numérotation absolue (anime) : saison 2 = épisodes 53 à 104', () => {
    const m = tvMeta(2, [[1, range(1, 52)], [2, range(53, 104)]]);
    let t = C.setSeasonStatus(C.emptyTrack('tv', 2), 2, range(53, 104), 'seen', T0);
    const st = C.computeShowState(m, t);
    assert.deepEqual(st.seasons.map((s) => s.status), ['todo', 'seen']);
    assert.equal(st.status, 'progress');
    t = C.setSeasonStatus(t, 1, range(1, 52), 'seen', T0 + 1);
    assert.equal(C.computeShowState(m, t).status, 'seen');
  });
  it('liste exacte inconnue : comptage face au nombre annoncé', () => {
    const m = tvMeta(3, [[1, 8]]);
    let t = C.setEpisodeStatus(C.emptyTrack('tv', 3), 1, 1, 'seen', T0);
    assert.equal(C.computeShowState(m, t).seasons[0].status, 'progress');
    t = C.setSeasonStatus(t, 1, range(1, 8), 'seen', T0 + 1);
    assert.equal(C.computeShowState(m, t).status, 'seen');
  });
  it('« Vu jusqu’ici » ne touche que les épisodes précédents de la même saison', () => {
    const m = tvMeta(4, [[1, range(1, 6)], [2, range(7, 12)]]);
    const t = C.setEpisodesUpTo(C.emptyTrack('tv', 4), 1, range(1, 6), 4, T0);
    assert.deepEqual(range(1, 6).map((n) => C.episodeStatus(t, 1, n)), ['seen', 'seen', 'seen', 'seen', 'todo', 'todo']);
    assert.equal(C.computeShowState(m, t).seasons[1].status, 'todo');
  });
});

describe('B. Saisons et statut global', () => {
  const meta = tvMeta(10, [[0, range(1, 2)], [1, range(1, 10)], [2, range(1, 8)], [3, range(1, 6)]]);
  it('un bouton de saison modifie tous ses épisodes et aucune autre saison', () => {
    let t = C.setEpisodeStatus(C.emptyTrack('tv', 10), 2, 3, 'progress', T0);
    t = C.setSeasonStatus(t, 1, range(1, 10), 'seen', T0 + 1);
    assert.ok(range(1, 10).every((n) => C.episodeStatus(t, 1, n) === 'seen'));
    assert.equal(C.episodeStatus(t, 2, 3), 'progress');
    assert.deepEqual(Object.keys(t.seasons).sort(), ['1', '2']);
    t = C.setSeasonStatus(t, 1, range(1, 10), 'todo', T0 + 2);
    assert.equal(t.seasons['1'], undefined);
    assert.equal(C.episodeStatus(t, 2, 3), 'progress');
  });
  it('une saison vue sur trois ne donne pas une série Vue', () => {
    const t = C.setSeasonStatus(C.emptyTrack('tv', 10), 1, range(1, 10), 'seen', T0);
    const st = C.computeShowState(meta, t);
    assert.equal(st.status, 'progress');
    assert.deepEqual(st.seasons.map((s) => s.status), ['seen', 'todo', 'todo'], 'les saisons absentes de la sauvegarde comptent À voir');
  });
  it('deux saisons vues et une à voir : En cours', () => {
    let t = C.setSeasonStatus(C.emptyTrack('tv', 10), 1, range(1, 10), 'seen', T0);
    t = C.setSeasonStatus(t, 2, range(1, 8), 'seen', T0 + 1);
    assert.equal(C.computeShowState(meta, t).status, 'progress');
  });
  it('un épisode vu sur 24 : En cours', () => {
    const t = C.setEpisodeStatus(C.emptyTrack('tv', 10), 3, 6, 'seen', T0);
    const st = C.computeShowState(meta, t);
    assert.deepEqual([st.status, st.seenEpisodes, st.totalEpisodes], ['progress', 1, 24]);
  });
  it('toutes les saisons régulières vues : Vu (spéciaux exclus)', () => {
    const t = C.markShowSeen(C.emptyTrack('tv', 10), { 1: range(1, 10), 2: range(1, 8), 3: range(1, 6) }, T0);
    const st = C.computeShowState(meta, t);
    assert.equal(st.status, 'seen');
    assert.equal(st.specials.status, 'todo');
  });
  it('les spéciaux seuls ne changent pas le statut global', () => {
    const t = C.setSeasonStatus(C.emptyTrack('tv', 10), 0, range(1, 2), 'seen', T0);
    assert.equal(C.computeShowState(meta, t).status, 'todo');
  });
  it('tout remis à À voir : À voir', () => {
    let t = C.markShowSeen(C.emptyTrack('tv', 10), { 1: range(1, 10), 2: range(1, 8), 3: range(1, 6) }, T0);
    t = C.resetShow(t, T0 + 1);
    assert.equal(C.computeShowState(meta, t).status, 'todo');
    assert.equal(t.inLibrary, true, 'reste dans la bibliothèque');
  });
  it('une saison non chargée (échec) ne valide pas la série', () => {
    const t = C.markShowSeen(C.emptyTrack('tv', 10), { 1: range(1, 10), 3: range(1, 6) }, T0); // saison 2 en échec
    assert.equal(C.computeShowState(meta, t).status, 'progress');
  });
  it('une saison annoncée sans épisode ne rend jamais la série Vue', () => {
    const m = tvMeta(11, [[1, range(1, 4)], [2, []]]);
    const t = C.setSeasonStatus(C.emptyTrack('tv', 11), 1, range(1, 4), 'seen', T0);
    const st = C.computeShowState(m, t);
    assert.deepEqual([st.status, st.seasons[1].status], ['progress', 'todo']);
    const m2 = tvMeta(11, [[1, range(1, 4)], [2, 0]]);
    assert.equal(C.computeShowState(m2, t).status, 'progress');
  });
  it('métadonnées absentes : jamais Vu, même avec beaucoup d’épisodes vus', () => {
    const t = C.setSeasonStatus(C.emptyTrack('tv', 12), 1, range(1, 30), 'seen', T0);
    for (const m of [null, { key: 'tv-12', type: 'tv', id: 12 }, tvMeta(12, [])]) {
      assert.equal(C.computeShowState(m, t).status, 'progress');
    }
  });
  it('intention « En cours » avant le premier épisode, puis priorité aux épisodes', () => {
    let t = C.startShow(C.emptyTrack('tv', 10), T0);
    let st = C.computeShowState(meta, t);
    assert.deepEqual([st.status, st.intentOnly], ['progress', true]);
    t = C.setEpisodeStatus(t, 1, 1, 'seen', T0 + 1);
    st = C.computeShowState(meta, t);
    assert.deepEqual([st.status, st.intentOnly, t.intent], ['progress', false, null]);
    t = C.setEpisodeStatus(t, 1, 1, 'todo', T0 + 2);
    assert.equal(C.computeShowState(meta, t).status, 'todo');
  });
  it('prochain épisode à voir', () => {
    let t = C.setEpisodesUpTo(C.emptyTrack('tv', 10), 1, range(1, 10), 4, T0);
    assert.deepEqual(C.nextUpEpisode(meta, t), { season: 1, episode: 5, announced: false });
    t = C.setSeasonStatus(t, 1, range(1, 10), 'seen', T0 + 1);
    assert.deepEqual(C.nextUpEpisode(meta, t), { season: 2, episode: 1, announced: false });
  });
});

describe('C. Reprendre', () => {
  const build = (n) => {
    const data = D.emptyData();
    for (let i = 1; i <= n; i++) {
      const k = 'movie-' + i;
      data.tracking[k] = C.setMovieStatus(C.emptyTrack('movie', i), 'progress', T0 + i * 10);
      data.metadata[k] = { key: k, type: 'movie', id: i, title: 'Film ' + i };
    }
    return data;
  };
  it('cinq éléments maximum, du plus récent au plus ancien', () => {
    const r = C.computeResume(build(5));
    assert.deepEqual(r.map((e) => e.key), ['movie-5', 'movie-4', 'movie-3', 'movie-2', 'movie-1']);
  });
  it('un sixième contenu prend la tête et le plus ancien sort de l’affichage', () => {
    const data = build(5);
    data.tracking['tv-9'] = C.setEpisodeStatus(C.emptyTrack('tv', 9), 1, 1, 'seen', T0 + 1000);
    data.metadata['tv-9'] = tvMeta(9, [[1, range(1, 3)]]);
    const r = C.computeResume(data);
    assert.deepEqual(r.map((e) => e.key), ['tv-9', 'movie-5', 'movie-4', 'movie-3', 'movie-2']);
    assert.ok(data.tracking['movie-1'], 'le plus ancien reste dans la bibliothèque');
    assert.equal(C.computeLibrary(data, { status: 'progress' }).length, 6);
  });
  it('une ligne par contenu, jamais par épisode', () => {
    const data = D.emptyData();
    let t = C.emptyTrack('tv', 3);
    for (const n of range(1, 4)) t = C.setEpisodeStatus(t, 1, n, 'seen', T0 + n);
    data.tracking['tv-3'] = t;
    data.metadata['tv-3'] = tvMeta(3, [[1, range(1, 10)]]);
    assert.equal(C.computeResume(data).length, 1);
  });
  it('le calcul est pur : le répéter ne change pas l’ordre ni les dates', () => {
    const data = build(7);
    const snapshot = JSON.stringify(data);
    const a = C.computeResume(data).map((e) => e.key);
    const b = C.computeResume(data).map((e) => e.key);
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(data), snapshot);
  });
  it('favori / watchlist ne changent pas la date d’activité', () => {
    const t = C.setMovieStatus(C.emptyTrack('movie', 1), 'progress', T0);
    const f = C.toggleFlag(C.toggleFlag(t, 'favorite', T0 + 50), 'watchlist', T0 + 60);
    assert.equal(f.lastActivityAt, T0);
    assert.deepEqual([f.favorite, f.watchlist], [true, true]);
  });
  it('les contenus Vus ne sont pas dans Reprendre', () => {
    const data = build(2);
    data.tracking['movie-2'] = C.setMovieStatus(data.tracking['movie-2'], 'seen', T0 + 999);
    assert.deepEqual(C.computeResume(data).map((e) => e.key), ['movie-1']);
  });
});

describe('D. Statistiques', () => {
  it('compte des contenus (pas des épisodes) et total personnel = union', () => {
    const data = D.emptyData();
    const put = (k, t, m) => { data.tracking[k] = t; data.metadata[k] = m || { key: k, type: t.type, id: t.id, title: k }; };
    put('movie-1', C.setMovieStatus(C.emptyTrack('movie', 1), 'seen', T0));
    put('movie-2', C.toggleFlag(C.emptyTrack('movie', 2), 'favorite', T0));
    put('movie-3', C.toggleFlag(C.emptyTrack('movie', 3), 'watchlist', T0));
    put('tv-4', C.setSeasonStatus(C.emptyTrack('tv', 4), 1, range(1, 12), 'seen', T0), tvMeta(4, [[1, range(1, 12)], [2, range(1, 12)]]));
    data.tracking['movie-5'] = C.emptyTrack('movie', 5); // non personnel : ignoré
    const s = C.computeStats(data);
    assert.deepEqual([s.total, s.seen, s.progress, s.todo, s.favorites, s.watchlist], [4, 1, 1, 2, 1, 1]);
  });
});

describe('E. Navigation', () => {
  it('analyse des routes', () => {
    assert.equal(C.parseRoute('').name, 'home');
    assert.equal(C.parseRoute('#').name, 'home');
    assert.equal(C.parseRoute('#favorites').name, 'favorites');
    assert.deepEqual((({ name, type, id, key }) => ({ name, type, id, key }))(C.parseRoute('#detail/tv/123')), { name: 'detail', type: 'tv', id: 123, key: 'tv-123' });
    assert.equal(C.parseRoute('#detail/movie/456').key, 'movie-456');
    for (const bad of ['#detail/tv/abc', '#detail/tv/0', '#detail/person/1', '#detail/tv', '#detail/tv/1/2']) assert.equal(C.parseRoute(bad).name, 'invalid', bad);
    assert.equal(C.parseRoute('#nimporte-quoi').name, 'notfound');
    const r = C.parseRoute(C.buildHash('search', { q: "L'été <b>&", type: 'tv' }));
    assert.deepEqual([r.name, r.params.q, r.params.type], ['search', "L'été <b>&", 'tv']);
    assert.equal(C.detailHash('tv', 7), '#detail/tv/7');
  });
});

describe('F. Données, migration, import', () => {
  it('échappement HTML', () => {
    assert.equal(C.escapeHtml(`L'Été "fou" <b>&`), 'L&#39;Été &quot;fou&quot; &lt;b&gt;&amp;');
  });
  it('normalisation TMDB : personnes exclues, chemins d’image validés', () => {
    assert.equal(C.normalizeSummary({ media_type: 'person', id: 1, name: 'X' }, 'movie'), null);
    const s = C.normalizeSummary({ media_type: 'tv', id: 5, name: 'A', poster_path: '/a.jpg', first_air_date: '2019-07-25' });
    assert.deepEqual([s.key, s.year, s.posterPath], ['tv-5', '2019', '/a.jpg']);
    assert.equal(C.normalizeSummary({ id: 6, title: 'B', poster_path: '/x" onerror="alert(1)' }, 'movie').posterPath, null);
  });
  it('formats', () => {
    assert.equal(C.formatDate('2019-07-25'), '25 juillet 2019');
    assert.equal(C.formatDate('2026-01-01'), '1er janvier 2026');
    assert.equal(C.formatDate('n/a'), '');
    assert.deepEqual([C.ratingTier(8.4), C.ratingTier(6.1), C.ratingTier(0)], ['top', 'mid', 'none']);
    assert.equal(C.formatRating(7.25), '7,3');
  });
  it('sauvegarde corrompue ou invalide : aucune exception, entrées invalides écartées', () => {
    for (const raw of [null, 42, 'x', [], { tracking: 'nope' }]) assert.doesNotThrow(() => D.sanitizeData(raw));
    const { data, invalid } = D.sanitizeData({ tracking: { 'tv-1': { inLibrary: true, seasons: { 1: { episodes: { 1: 'seen', 2: 'bogus', x: 'seen' } } } }, 'bad-key': {}, 'movie-2': { trackingStatus: 'zzz' } } });
    assert.equal(invalid, 1);
    assert.deepEqual(data.tracking['tv-1'].seasons, { 1: { episodes: { 1: 'seen' } } });
    assert.equal(data.tracking['movie-2'], undefined, 'non personnel après validation');
    assert.equal(data.metadata['tv-1'].placeholder, true);
  });
  it('migration cinelog-data : statuts explicites préservés, rien de propagé', () => {
    const legacy = {
      items: {
        'movie-1': { id: 1, media_type: 'movie', title: 'Consulté seulement', status: 'todo', updatedAt: T0, seasons: {} },
        'movie-2': { id: 2, media_type: 'movie', title: 'Film en cours', status: 'progress', updatedAt: T0 + 1, seasons: {} },
        'tv-3': { id: 3, media_type: 'tv', title: 'Anime', status: 'todo', updatedAt: T0 + 2, seasons: { 1: { status: 'seen', episodes: { 14: 'seen' } } } },
        'tv-4': { id: 4, media_type: 'tv', title: 'Série', status: 'progress', updatedAt: T0 + 3, seasons: { 1: { status: 'seen', episodes: { 1: 'seen', 2: 'seen' } }, 2: { status: 'progress', episodes: { 1: 'seen', 5: 'progress' } }, 3: { status: 'seen', episodes: {} } } },
        'tv-5': { id: 5, media_type: 'tv', title: 'Vue globalement', status: 'seen', updatedAt: T0 + 4, seasons: {} }
      },
      favorites: ['tv-3', 'movie-2', 'movie-77'], watchlist: ['tv-3'], history: []
    };
    const { tracking, metadata, report } = D.migrateLegacyCinelog(legacy);
    assert.equal(tracking['movie-1'], undefined, 'simple consultation ignorée');
    assert.equal(tracking['movie-2'].trackingStatus, 'progress');
    assert.deepEqual(tracking['tv-3'].seasons, { 1: { episodes: { 14: 'seen' } } }, 'la saison « seen » n’est pas propagée');
    assert.deepEqual([tracking['tv-3'].favorite, tracking['tv-3'].watchlist], [true, true]);
    assert.deepEqual(tracking['tv-4'].seasons, { 1: { episodes: { 1: 'seen', 2: 'seen' } }, 2: { episodes: { 1: 'seen', 5: 'progress' } } });
    assert.equal(report.ambiguousSeasons, 1);
    assert.deepEqual([tracking['tv-5'].intent, tracking['tv-5'].legacy.status], ['progress', 'seen']);
    assert.equal(tracking['movie-77'].favorite, true, 'favori sans fiche conservé');
    assert.equal(metadata['movie-77'].placeholder, true);
    const m3 = tvMeta(3, [[1, range(1, 52)]]);
    assert.equal(C.computeShowState(m3, tracking['tv-3']).seasons[0].status, 'progress', 'saison vue après un seul épisode : corrigé');
    assert.equal(C.computeShowState(null, tracking['tv-5']).status, 'progress', 'jamais Vu sans preuve');
  });
  it('migration cinevault-watch', () => {
    const { tracking } = D.migrateCinevault({ 'tv-8-season-1-ep-1': 'seen', 'tv-8-season-1-ep-2': 'partial', 'tv-8-season-1-ep-3': 'unseen', 'movie-9': 'seen', 'n/a': 'x' });
    assert.deepEqual(tracking['tv-8'].seasons, { 1: { episodes: { 1: 'seen', 2: 'progress' } } });
    assert.equal(tracking['movie-9'].trackingStatus, 'seen');
  });
  it('import : erreurs compréhensibles', () => {
    assert.match(D.parseImportText('').error, /vide/);
    assert.match(D.parseImportText('{oups').error, /JSON valide/);
    assert.match(D.parseImportText('[1,2]').error, /objet JSON/);
    assert.match(D.parseImportText('{"foo":1}').error, /Format non reconnu/);
    assert.match(D.parseImportText('{"app":"crazy-liste","schemaVersion":99,"tracking":{}}').error, /plus récente/);
  });
  it('export complet puis import : aller-retour sans perte, clé API exclue', () => {
    const data = D.emptyData();
    data.preferences.apiKey = 'secret-ish';
    data.tracking['tv-1'] = C.setEpisodeStatus(C.toggleFlag(C.emptyTrack('tv', 1), 'favorite', T0), 2, 3, 'seen', T0 + 5);
    data.metadata['tv-1'] = tvMeta(1, [[1, range(1, 3)], [2, range(1, 3)]]);
    const exp = D.buildFullExport(data, '2026-11-20T00:00:00.000Z');
    assert.equal(exp.preferences.apiKey, undefined);
    const res = D.parseImportText(JSON.stringify(exp));
    assert.equal(res.ok, true);
    assert.deepEqual(res.data.tracking, data.tracking);
    assert.equal(C.computeShowState(res.data.metadata['tv-1'], res.data.tracking['tv-1']).status, 'progress');
  });
  it('export favoris/watchlist puis import', () => {
    const data = D.emptyData();
    data.tracking['movie-1'] = C.toggleFlag(C.emptyTrack('movie', 1), 'watchlist', T0);
    data.metadata['movie-1'] = { key: 'movie-1', type: 'movie', id: 1, title: "L'Été", year: '2020', posterPath: '/p.jpg', voteAverage: 7 };
    const res = D.parseImportText(JSON.stringify(D.buildListsExport(data, 'x')));
    assert.equal(res.kind, 'lists');
    assert.deepEqual([res.data.tracking['movie-1'].watchlist, res.data.metadata['movie-1'].title], [true, "L'Été"]);
  });
  it('fusion et remplacement explicites', () => {
    const cur = D.emptyData();
    cur.preferences.apiKey = 'k';
    cur.tracking['movie-1'] = C.setMovieStatus(C.emptyTrack('movie', 1), 'progress', T0 + 100);
    cur.metadata['movie-1'] = { key: 'movie-1', type: 'movie', id: 1, title: 'A' };
    const inc = D.emptyData();
    inc.tracking['movie-1'] = C.toggleFlag(C.setMovieStatus(C.emptyTrack('movie', 1), 'seen', T0), 'favorite', T0);
    inc.tracking['movie-2'] = C.toggleFlag(C.emptyTrack('movie', 2), 'watchlist', T0);
    const m = D.mergeData(cur, inc);
    assert.deepEqual([m.data.tracking['movie-1'].trackingStatus, m.data.tracking['movie-1'].favorite, m.report.added], ['progress', true, 1]);
    const r = D.replaceData(cur, inc);
    assert.deepEqual([r.data.tracking['movie-1'].trackingStatus, r.data.preferences.apiKey], ['seen', 'k']);
  });
  it('collection : film suivant', () => {
    const parts = [{ id: 3, title: 'C', release_date: '2027-05-01' }, { id: 1, title: 'A', release_date: '2001-12-18' }, { id: 2, title: 'B', release_date: '2002-12-18' }];
    const n = C.collectionNeighbors(parts, 2, '2026-11-20');
    assert.deepEqual([n.previous.id, n.next.id, n.nextIsUpcoming], [1, 3, true]);
    assert.equal(C.collectionNeighbors(parts, 3, '2026-11-20').next, null);
  });
});
