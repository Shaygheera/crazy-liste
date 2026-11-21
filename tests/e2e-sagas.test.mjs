// Sagas : cohérence des données (Node) puis frise dans Chrome (TMDB simulé, titres génériques).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, duplicateIds } from './helpers/browser.mjs';

const { Core: C } = loadCore();
const T = { timeout: 60000 };

describe('Sagas : données', () => {
  it('chaque saga : codes valides, aucun doublon, ordre de l’histoire = mêmes titres que l’ordre de sortie', () => {
    assert.deepEqual(C.SAGAS.map((s) => s.id), ['mcu', 'dc', 'star-wars', 'monsterverse']);
    for (const saga of C.SAGAS) {
      const groupCodes = saga.groups.flatMap((g) => g.items);
      const storyCodes = saga.story.flatMap((s) => s.items);
      for (const c of groupCodes.concat(storyCodes)) assert.ok(C.sagaKey(c), saga.id + ' : code invalide ' + c);
      assert.equal(new Set(groupCodes).size, groupCodes.length, saga.id + ' : doublon dans les groupes');
      assert.equal(new Set(storyCodes).size, storyCodes.length, saga.id + ' : doublon dans l’ordre de l’histoire');
      assert.deepEqual([...storyCodes].sort(), [...groupCodes].sort(), saga.id + ' : l’ordre de l’histoire doit contenir exactement les mêmes titres');
    }
  });
  it('MCU : phases 1 à 6, Marvel Television seulement sur demande, tri par date, filtre par type', () => {
    const mcu = C.findSaga('mcu');
    assert.deepEqual(mcu.groups.filter((g) => !g.optional).map((g) => g.label), ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6', 'Annoncés']);
    assert.ok(!C.sagaKeys(mcu, false).includes('tv-61889'), 'Daredevil (Netflix) masqué par défaut');
    assert.ok(C.sagaKeys(mcu, true).includes('tv-61889'));
    const dates = { 'movie-1724': '2008-06-12', 'movie-1726': '2008-04-30' };
    const p1 = C.sagaSections(mcu, {}, (k) => dates[k] || '2011-01-01')[0];
    assert.deepEqual(p1.keys.slice(0, 2), ['movie-1726', 'movie-1724'], 'trié par date dans la phase');
    const story = C.sagaSections(mcu, { order: 'story', type: 'movie' }, () => '');
    assert.equal(story[0].keys[0], 'movie-1771', 'histoire : Captain America : First Avenger en premier film');
    assert.ok(story.every((sec) => sec.keys.every((k) => k.startsWith('movie-'))));
  });
  it('adresses : #sagas, #saga/<id>?ordre=histoire, paramètres invalides ignorés', () => {
    assert.equal(C.parseRoute('#sagas').name, 'sagas');
    const r = C.parseRoute('#saga/star-wars?ordre=histoire&type=tv&extra=1');
    assert.equal(r.name, 'saga');
    assert.equal(r.sagaId, 'star-wars');
    assert.deepEqual(C.parseSagaParams(r.params), { order: 'story', type: 'tv', extra: true });
    assert.deepEqual(C.parseSagaParams({ ordre: 'x', type: '<b>', extra: 'oui' }), { order: 'release', type: 'all', extra: false });
    assert.equal(C.parseRoute('#saga/Bad Id').name, 'notfound');
  });
});

describe('Sagas : frise', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  const keys = (page) => page.$$eval('.snake-item', (els) => els.map((e) => e.dataset.itemKey));

  it('liste des sagas, frise, progression, prochain à voir, ordre de l’histoire, filtre Séries', T, async () => {
    const seen = { schemaVersion: 1, tracking: { 'movie-124905': { type: 'movie', id: 124905, inLibrary: true, favorite: false, watchlist: false, trackingStatus: 'seen', intent: null, seasons: {}, addedAt: 1, lastActivityAt: 2 } }, metadata: {}, preferences: {} };
    const { page, errors, context } = await openApp(browser, { hash: '#sagas', mock: { generic: true }, storage: { 'crazy-liste-v1': JSON.stringify(seen) } });
    assert.equal(await page.locator('.saga-tile').count(), 4);
    assert.match(await page.locator('.saga-tile[href="#saga/monsterverse"]').textContent(), /8 titres · 1 étapes · 1 vu/);
    await page.locator('.saga-tile[href="#saga/monsterverse"]').click();
    await page.waitForSelector('.snake-item');
    assert.equal(await page.locator('.sidebar [data-nav="sagas"]').getAttribute('aria-current'), 'page');
    const release = await keys(page);
    assert.equal(release.length, 8);
    assert.equal(release[7], 'movie-1288438', 'titre à venir (2030) en dernier');
    assert.match(await page.locator('.snake-item[data-item-key="movie-1288438"]').textContent(), /À venir/);
    assert.match(await page.locator('.snake-item[data-item-key="movie-124905"]').getAttribute('class'), /seen/);
    assert.match(await page.locator('.saga-summary').textContent(), /1 \/ 7 titres sortis vus · 1 à venir/);
    const nextKey = release.find((k) => k !== 'movie-124905' && k !== 'movie-1288438');
    assert.match(await page.locator('.saga-summary .btn').textContent(), new RegExp('Prochain à voir : .*' + nextKey.split('-')[1]));
    assert.match(await page.locator('.snake-item[data-item-key="' + nextKey + '"]').getAttribute('class'), /is-next/);
    await page.locator('.saga-controls a', { hasText: 'Ordre de l’histoire' }).click();
    await page.waitForFunction(() => location.hash === '#saga/monsterverse?ordre=histoire');
    await page.waitForFunction(() => { const el = document.querySelector('.snake-item'); return el && el.dataset.itemKey === 'movie-293167'; }); // frise redessinée
    assert.equal((await keys(page))[0], 'movie-293167', 'histoire : Kong : Skull Island (1973) en premier');
    await page.locator('.saga-controls a', { hasText: 'Séries' }).click();
    await page.waitForFunction(() => location.hash === '#saga/monsterverse?ordre=histoire&type=tv');
    await page.waitForFunction(() => document.querySelectorAll('.snake-item').length === 2);
    assert.deepEqual(await keys(page), ['tv-117678', 'tv-202411']);
    await page.locator('.snake-item[data-item-key="tv-202411"] a').click();
    await page.waitForFunction(() => location.hash === '#detail/tv/202411');
    await page.goBack();
    await page.waitForSelector('.snake-item');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('MCU : 7 étapes par défaut, Marvel Television ajouté sur demande ; téléphone sans débordement', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#saga/mcu', mock: { generic: true }, viewport: { width: 390, height: 844 } });
    await page.waitForSelector('.snake-item');
    assert.equal(await page.locator('.saga-group').count(), 7);
    const base = await page.locator('.snake-item').count();
    await page.locator('.saga-controls a', { hasText: 'Marvel Television' }).click();
    await page.waitForFunction((n) => document.querySelectorAll('.snake-item').length === n + 12, base, { timeout: 20000 });
    assert.equal(await page.locator('.saga-group').count(), 8);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'pas de débordement horizontal');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
