// Bande-annonce : choix de la vidéo (logique pure) et lecteur sur la fiche (Chrome, TMDB et YouTube simulés).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, duplicateIds } from './helpers/browser.mjs';

const { Core: C } = loadCore();
const T = { timeout: 60000 };
const v = (o) => ({ site: 'YouTube', key: 'abcdefghijk', type: 'Trailer', iso_639_1: 'en', official: true, name: 'x', published_at: '2024-01-01', ...o });

describe('Choix de la bande-annonce', () => {
  it('préfère le français, puis Trailer à Teaser, puis officiel, puis la plus récente', () => {
    assert.equal(C.pickTrailer({ results: [v({ key: 'en_trailer1' }), v({ key: 'fr_teaser01', type: 'Teaser', iso_639_1: 'fr' })] }).key, 'fr_teaser01');
    assert.equal(C.pickTrailer({ results: [v({ key: 'teaser00001', type: 'Teaser' }), v({ key: 'trailer0001' })] }).key, 'trailer0001');
    assert.equal(C.pickTrailer({ results: [v({ key: 'unofficial1', official: false }), v({ key: 'official001' })] }).key, 'official001');
    assert.equal(C.pickTrailer({ results: [v({ key: 'old00000001', published_at: '2020-01-01' }), v({ key: 'new00000001', published_at: '2025-01-01' })] }).key, 'new00000001');
  });
  it('ignore ce qui n’est pas une bande-annonce YouTube valide', () => {
    assert.equal(C.pickTrailer({ results: [v({ site: 'Vimeo' }), v({ type: 'Clip' }), v({ type: 'Featurette' }), v({ key: 'x"><script>' }), null] }), null);
    assert.equal(C.pickTrailer(undefined), null);
    assert.equal(C.pickTrailer({ results: [v({ iso_639_1: 'ja', key: 'jp_op000001', type: 'Opening Credits' })] }).lang, 'other');
  });
});

describe('Statut de production', () => {
  it('« Returning Series » : en diffusion seulement si un prochain épisode est annoncé', () => {
    assert.equal(C.productionLabel('Returning Series', { season: 3, episode: 6 }), 'En cours de diffusion');
    assert.equal(C.productionLabel('Returning Series', null), 'Pas terminée selon TMDB · aucun épisode annoncé');
    assert.equal(C.productionLabel('Ended'), 'Terminée');
  });
});

describe('Bande-annonce sur la fiche', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });

  it('film : bouton, lecteur VF intégré, lien YouTube, arrêt à la fermeture', T, async () => {
    const { context, page, errors } = await openApp(browser, { hash: '#detail/movie/101' });
    const embeds = [];
    await context.route('https://www.youtube-nocookie.com/**', (r) => { embeds.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>lecteur</p>' }); });
    const btn = page.locator('[data-action="trailer-open"]');
    await btn.waitFor();
    assert.equal((await btn.textContent()).trim(), 'Bande-annonce', 'VF disponible : pas de mention VO');
    const embedRequest = page.waitForRequest((r) => r.url().startsWith('https://www.youtube-nocookie.com/embed/'));
    await btn.click();
    await embedRequest;
    const frame = page.locator('#trailer-dialog iframe');
    await frame.waitFor();
    assert.equal(await frame.getAttribute('src'), 'https://www.youtube-nocookie.com/embed/vf_trailer1?autoplay=1&rel=0&hl=fr');
    assert.equal(await page.locator('#trailer-foot a').getAttribute('href'), 'https://www.youtube.com/watch?v=vf_trailer1');
    assert.match(await page.locator('#trailer-title').textContent(), /^Bande-annonce VF · /);
    await page.waitForFunction(() => document.querySelector('#trailer-dialog').open);
    assert.equal(embeds.length, 1, 'une seule vidéo chargée');
    const box = await page.evaluate(() => { const r = document.querySelector('#trailer-dialog').getBoundingClientRect(); return { w: r.width, bottom: r.bottom }; });
    assert.ok(box.w >= 1000, 'lecteur large sur un écran 1440×900 (' + box.w + ' px)');
    assert.ok(box.bottom <= 900, 'le lecteur tient en hauteur dans l’écran');
    await page.locator('[data-action="trailer-close"]').click();
    assert.equal(await page.locator('#trailer-dialog iframe').count(), 0, 'la vidéo est retirée : la lecture s’arrête');
    assert.equal(await page.evaluate(() => document.querySelector('#trailer-dialog').open), false);
    await btn.click();
    await page.locator('#trailer-dialog iframe').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#trailer-dialog').open && !document.querySelector('#trailer-dialog iframe'), null, { timeout: 5000 });
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('série en VO seulement : signalée ; contenu sans vidéo : aucun bouton', T, async () => {
    const { context, page, errors } = await openApp(browser, { hash: '#detail/tv/201' });
    await context.route('https://www.youtube-nocookie.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '' }));
    await page.locator('[data-action="trailer-open"]').waitFor();
    assert.equal((await page.locator('[data-action="trailer-open"]').textContent()).trim(), 'Bande-annonce (VO)');
    const loaded = page.waitForResponse((r) => r.url().includes('/3/movie/102?'));
    await page.evaluate(() => { location.hash = '#detail/movie/102'; });
    await loaded;
    await page.waitForFunction(() => document.querySelector('h1') && document.querySelector('.detail-overview') && !document.querySelector('[aria-busy="true"]'));
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-action="trailer-open"]').count(), 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
