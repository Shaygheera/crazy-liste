// Galerie d'images et affiche agrandie : choix des images (Node) puis visionneuse dans Chrome (TMDB simulé).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';
import { launch, openApp, jsErrors, duplicateIds } from './helpers/browser.mjs';

const { Core: C } = loadCore();
const T = { timeout: 60000 };

describe('Choix des images', () => {
  it('sans texte d’abord, mieux notées ensuite, sans doublon ni format inadapté', () => {
    const b = (f, o = {}) => ({ file_path: '/' + f + '.jpg', width: 1920, aspect_ratio: 1.778, iso_639_1: null, vote_average: 5, vote_count: 1, ...o });
    assert.deepEqual(C.pickGallery({ backdrops: [b('en', { iso_639_1: 'en', vote_average: 9 }), b('a', { vote_average: 6 }), b('b', { vote_average: 7 }), b('a'), b('petit', { width: 300 }), b('vertical', { aspect_ratio: 0.66 }), b('bad', { file_path: 'javascript:x' })] }),
      ['/b.jpg', '/a.jpg', '/en.jpg']);
    assert.equal(C.pickGallery({ backdrops: Array.from({ length: 30 }, (_, i) => b('x' + i)) }).length, 10, '10 images au maximum');
    assert.deepEqual(C.pickGallery(undefined), []);
  });
});

describe('Galerie et affiche dans la fiche', () => {
  let browser;
  before(async () => { browser = await launch(); });
  after(async () => { if (browser) await browser.close(); });
  const lb = (page) => page.evaluate(() => ({ open: document.querySelector('#lightbox').open, src: document.querySelector('#lightbox-img').getAttribute('src'), caption: document.querySelector('#lightbox-caption').textContent }));

  it('galerie : vignettes, visionneuse, flèches, boucle, Échap', T, async () => {
    const { page, errors, context, mock } = await openApp(browser, { hash: '#detail/movie/101' });
    await page.waitForSelector('.gallery .gallery-item');
    const thumbs = await page.$$eval('.gallery-item img', (els) => els.map((e) => e.getAttribute('src')));
    assert.deepEqual(thumbs, ['/scene_b.jpg', '/scene_a.jpg', '/scene_c.jpg', '/texte_en.jpg'].map((p) => 'https://image.tmdb.org/t/p/w780' + p));
    assert.ok(mock.state.requests.some((r) => r.startsWith('/movie/101?') && /include_image_language=null%2Cfr%2Cen/.test(r)), 'images demandées avec la fiche, sans requête de plus');
    await page.locator('.gallery-item').nth(1).click();
    let s = await lb(page);
    assert.equal(s.open, true);
    assert.equal(s.src, 'https://image.tmdb.org/t/p/w1280/scene_a.jpg');
    assert.match(s.caption, / · 2 \/ 4$/);
    await page.keyboard.press('ArrowRight');
    assert.equal((await lb(page)).src, 'https://image.tmdb.org/t/p/w1280/scene_c.jpg');
    await page.locator('#lightbox [data-action="lightbox-next"]').click();
    await page.locator('#lightbox [data-action="lightbox-next"]').click();
    assert.equal((await lb(page)).src, 'https://image.tmdb.org/t/p/w1280/scene_b.jpg', 'après la dernière, retour à la première');
    await page.keyboard.press('ArrowLeft');
    assert.match((await lb(page)).caption, / · 4 \/ 4$/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#lightbox').open);
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('affiche : clic pour l’agrandir, une seule image, fermeture par la croix ; pas de galerie vide', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('[data-action="poster-zoom"]');
    await page.locator('[data-action="poster-zoom"]').click();
    const s = await lb(page);
    assert.equal(s.src, 'https://image.tmdb.org/t/p/w780/t201.jpg');
    assert.equal(s.caption, 'Affiche · Série Alpha');
    assert.equal(await page.locator('#lightbox .lb-next').isVisible(), false, 'pas de flèches pour une seule image');
    await page.locator('#lightbox [data-action="lightbox-close"]').click();
    await page.waitForFunction(() => !document.querySelector('#lightbox').open);
    await page.waitForSelector('[data-action="trailer-open"]'); // fiche TMDB chargée
    assert.equal(await page.locator('.gallery-section').count(), 0, 'aucune image fournie : pas de section');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('téléphone : galerie défilante sans débordement de la page', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/101', viewport: { width: 375, height: 812 } });
    await page.waitForSelector('.gallery .gallery-item');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.locator('.gallery-item').first().click();
    assert.equal((await lb(page)).open, true);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
