// Tests de bout en bout : présentation compacte des épisodes (refonte 01c) et menu de gauche.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, jsErrors, store, duplicateIds } from './helpers/browser.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { if (browser) await browser.close(); });

const T = { timeout: 60000 };
const head = (s, e) => `[data-action="episode-expand"][data-season="${s}"][data-episode="${e}"]`;
const menuBtn = (s, e) => `[data-action="episode-menu"][data-season="${s}"][data-episode="${e}"]`;
const epStatus = (page, s, e) => page.locator(`[data-ep="${s}-${e}"]`).getAttribute('data-status');

describe('Épisodes : liste compacte', () => {
  it('un clic déplie l’épisode sur place avec son résumé TMDB, un seul à la fois', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    assert.equal(await page.locator('#season-1 .ep').count(), 10, 'une ligne par épisode');
    assert.equal(await page.locator('#season-1 .ep-detail').count(), 0, 'rien n’est déplié au départ');
    assert.equal(await page.locator('#season-1 [data-action="episode-status"]').count(), 0, 'les boutons de statut sont dans le menu ou le détail');
    await page.locator(head(1, 1)).click();
    assert.equal(await page.locator(head(1, 1)).getAttribute('aria-expanded'), 'true');
    assert.match(await page.locator('#ep-detail-1-1').textContent(), /Résumé TMDB du premier épisode de Série Alpha\./);
    assert.match(await page.locator('#ep-detail-1-1').textContent(), /Diffusé le 1er août 2019/);
    assert.equal(await page.locator('#ep-detail-1-1 [data-action="episodes-upto"]').count(), 0, 'pas de « Vu jusqu’ici » sur le premier épisode');
    await page.locator(head(1, 2)).click();
    assert.equal(await page.locator('#ep-detail-1-1').count(), 0, 'le précédent se replie');
    assert.match(await page.locator('#ep-detail-1-2').textContent(), /Pas de résumé en français sur TMDB/);
    await page.locator('#ep-detail-1-2 [data-action="episode-status"][data-status="seen"]').click();
    assert.equal(await epStatus(page, 1, 2), 'seen');
    assert.equal(await page.locator('#ep-detail-1-2').count(), 1, 'l’épisode reste déplié après un changement de statut');
    assert.equal(await page.locator('#ep-detail-1-2 [data-action="episode-status"][data-status="seen"]').getAttribute('aria-pressed'), 'true');
    await page.locator('#ep-detail-1-2 [data-action="episodes-upto"]').click();
    assert.equal(await epStatus(page, 1, 1), 'seen', '« Vu jusqu’ici » depuis le détail');
    await page.locator(head(1, 2)).click();
    assert.equal(await page.locator('#season-1 .ep-detail').count(), 0, 'second clic : replié');
    assert.deepEqual((await store(page)).tracking['tv-201'].seasons, { 1: { episodes: { 1: 'seen', 2: 'seen' } } });
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('le menu de statut se ferme au choix, à Échap ou en cliquant ailleurs ; « Prochain » est signalé', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    await page.locator(menuBtn(1, 1)).click();
    assert.equal(await page.locator('.ep-menu').count(), 1);
    assert.equal(await page.locator(menuBtn(1, 1)).getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.ep-menu [data-action="episodes-upto"]').count(), 0, 'pas de « Vu jusqu’ici » sur le premier épisode');
    await page.locator('h2#seasons-title').click();
    assert.equal(await page.locator('.ep-menu').count(), 0, 'clic ailleurs : menu fermé');
    await page.locator(menuBtn(1, 3)).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ep-menu').count(), 0, 'Échap : menu fermé');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action + ' ' + document.activeElement.dataset.episode), 'episode-menu 3', 'le focus revient au bouton');
    await page.locator(menuBtn(1, 3)).click();
    await page.locator('.ep-menu [data-action="episodes-upto"]').click();
    assert.equal(await page.locator('.ep-menu').count(), 0);
    assert.deepEqual(await page.$$eval('#season-1 .ep', (els) => els.slice(0, 5).map((e) => e.dataset.status)), ['seen', 'seen', 'seen', 'todo', 'todo']);
    assert.equal(await page.locator('[data-ep="1-4"]').getAttribute('data-next'), 'true', 'le prochain épisode est mis en avant');
    assert.match(await page.locator('[data-ep="1-4"] .ep-title').textContent(), /^Prochain/);
    assert.equal(await page.locator('#season-1 [data-next="true"]').count(), 1);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('la grille : une case par épisode, détail sous la grille, préférence gardée', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    await page.locator('#season-1 [data-action="episodes-mode"][data-mode="grid"]').click();
    assert.equal(await page.locator('#season-1 .ep-tile').count(), 10);
    assert.equal(await page.locator('#season-1 .ep').count(), 0);
    assert.match(await page.locator('#season-1 .ep-hint').textContent(), /Clique une case/);
    await page.locator('#season-1 [data-tile="1-3"]').click();
    assert.match(await page.locator('#season-1 .ep-panel').textContent(), /É3 · Épisode 3/);
    await page.locator('#season-1 .ep-panel [data-action="episode-status"][data-status="seen"]').click();
    assert.equal(await page.locator('#season-1 [data-tile="1-3"]').getAttribute('data-status'), 'seen');
    assert.equal(await page.locator('#season-1 [data-tile="1-3"]').getAttribute('aria-label'), 'Épisode 3 : Vu', 'statut lisible sans la couleur');
    assert.equal(await page.evaluate(() => localStorage.getItem('crazy-liste-ep-mode')), 'grid');
    await page.reload();
    await page.waitForSelector('#season-1 .ep-tile');
    assert.equal(await page.locator('#season-1 .ep').count(), 0, 'la grille est gardée après rechargement');
    await page.locator('#season-1 [data-action="episodes-mode"][data-mode="list"]').click();
    assert.equal(await page.locator('#season-1 .ep').count(), 10);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('une saison de 130 épisodes s’affiche par tranches de 50 (liste) ou 100 (grille)', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/299' });
    await page.waitForSelector('#season-1 .ep');
    assert.equal(await page.locator('#season-1 .ep').count(), 50);
    assert.match(await page.locator('#season-1 .ep-range').textContent(), /Épisodes 1 – 50 sur 130/);
    await page.locator('#season-1 [data-action="episodes-page"][data-dir="next"]').click();
    assert.match(await page.locator('#season-1 .ep-range').textContent(), /51 – 100/);
    await page.locator(menuBtn(1, 70)).click();
    await page.locator('.ep-menu [data-action="episodes-upto"]').click();
    assert.equal(await epStatus(page, 1, 70), 'seen');
    assert.equal(await page.locator('[data-ep="1-71"]').getAttribute('data-next'), 'true');
    await page.locator('#season-1 [data-action="episodes-page"][data-dir="next"]').click();
    assert.match(await page.locator('#season-1 .ep-range').textContent(), /101 – 130/);
    await page.getByRole('button', { name: 'Aller au prochain · É71' }).click();
    assert.match(await page.locator('#season-1 .ep-range').textContent(), /51 – 100/);
    await page.locator('#season-1 [data-action="episodes-page"][data-dir="prev"]').click();
    await page.locator('#season-1 [data-action="episodes-page"][data-dir="prev"]').click();
    assert.match(await page.locator('#season-1 .ep-range').textContent(), /101 – 130/, 'les flèches bouclent');
    await page.locator('#season-1 [data-action="episodes-mode"][data-mode="grid"]').click();
    assert.deepEqual(await page.locator('#season-1 .ep-tab').allTextContents(), ['1–100', '101–130']);
    assert.equal(await page.locator('#season-1 .ep-tab[aria-pressed="true"]').textContent(), '1–100', 'la tranche du prochain épisode');
    assert.equal(await page.locator('#season-1 .ep-tab-progress').count(), 1);
    assert.equal(await page.locator('#season-1 .ep-tile').count(), 100);
    await page.locator('#season-1 .ep-tab', { hasText: '101–130' }).click();
    assert.equal(await page.locator('#season-1 .ep-tile').count(), 30);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});

describe('Menu de gauche (refonte 01c)', () => {
  it('Mes statistiques et Reprendre sont dans le menu de gauche ; plus de panneau à droite', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    assert.equal(await page.locator('.sidebar #stats-panel').count(), 1);
    assert.equal(await page.locator('.sidebar #resume-panel-list').count(), 1);
    assert.equal(await page.locator('.side-panel').count(), 0);
    assert.deepEqual(await page.locator('.sidebar .nav-group').allTextContents(), ['Découvrir', 'Mon suivi']);
    const main = await page.locator('.main-col').boundingBox();
    assert.ok(main.x + main.width >= 1430, 'la fiche va jusqu’au bord droit');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).fontFamily.split(',')[0].replace(/"/g, '')), 'Geist');
    assert.ok(await page.evaluate(() => document.fonts.check('16px Geist')), 'police intégrée chargée');
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('sur téléphone : statistiques et Reprendre sous le contenu, sans défilement horizontal', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#home', viewport: { width: 390, height: 844 } });
    await page.waitForSelector('.card');
    assert.ok(await page.locator('#stats-panel').isVisible());
    assert.equal(await page.locator('.sidebar nav.nav').isVisible(), false, 'la navigation passe dans la barre du bas');
    assert.ok(await page.locator('.bottom-nav').isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });
});
