// Tests de bout en bout dans Chrome (playwright-core), TMDB simulé. Partie 1 : suivi et listes.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, jsErrors, store, duplicateIds } from './helpers/browser.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { if (browser) await browser.close(); });

const T = { timeout: 60000 };
const sel = {
  ep: (s, e, st) => `[data-action="episode-status"][data-season="${s}"][data-episode="${e}"][data-status="${st}"]`,
  season: (s, st) => `[data-action="season-status"][data-season="${s}"][data-status="${st}"]`
};
const text = (page, s) => page.locator(s).first().textContent();
const statusOf = (page, key) => text(page, `[data-status-for="${key}"]`);
const epStatuses = (page, s) => page.$$eval(`#season-${s} .ep`, (els) => els.map((e) => e.dataset.status));
const seasonStatus = (page, s) => page.locator(`#season-${s}`).getAttribute('data-status');
const go = async (page, hash, h1) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  if (h1) await page.waitForFunction((t) => document.querySelector('h1') && document.querySelector('h1').textContent === t, h1);
};
const resumeKeys = (page, list) => page.$$eval(`#${list} .resume-row`, (els) => els.map((e) => e.dataset.resumeKey));

describe('Accueil TMDB', () => {
  it('démarre sans erreur, toutes les sections, deux boutons par carte, aucun id dupliqué', T, async () => {
    const { page, errors, context } = await openApp(browser);
    for (const id of ['trending', 'popular-movies', 'popular-tv', 'anime', 'top-movies', 'upcoming']) await page.waitForSelector(`#rail-${id} .card`);
    assert.equal(await page.locator('#rail-trending .card').count(), 5, 'la « personne » des tendances est exclue');
    const buttons = await page.$$eval('.card', (cards) => cards.map((c) => [...c.querySelectorAll('button')].map((b) => b.textContent.trim())));
    assert.ok(buttons.length > 20);
    for (const b of buttons) assert.deepEqual(b, ['♡ Ajouter favori', '＋ Ajouter watchlist']);
    assert.equal(await page.locator('button, a').filter({ hasText: /^\s*Ouvrir\s*$/ }).count(), 0, 'aucun bouton « Ouvrir »');
    assert.deepEqual(await duplicateIds(page), []);
    assert.equal(await text(page, 'h1'), 'Crazy Liste');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('Favori / Watchlist depuis l’accueil : immédiat, partout, sans navigation ni requête TMDB', T, async () => {
    const { page, errors, mock, context } = await openApp(browser);
    await page.waitForSelector('#rail-popular-tv .card');
    await page.waitForSelector('#rail-trending .card');
    const requests = mock.state.requests.length;
    const favTrending = page.locator('#rail-trending [data-item-key="tv-201"] [data-action="toggle-favorite"]');
    await favTrending.click();
    assert.equal(await favTrending.textContent(), '♥ En favori');
    assert.equal(await favTrending.getAttribute('aria-pressed'), 'true');
    const favOther = page.locator('#rail-popular-tv [data-item-key="tv-201"] [data-action="toggle-favorite"]');
    assert.equal(await favOther.textContent(), '♥ En favori', 'autre représentation du même contenu mise à jour');
    assert.equal(await page.evaluate(() => location.hash), '', 'aucune redirection');
    assert.equal(await page.locator('h1').first().textContent(), 'Crazy Liste', 'la carte ne s’est pas ouverte');
    assert.equal(await text(page, '[data-count="favorites"]'), '1');
    assert.equal(await text(page, '[data-stat="fav"] strong'), '1');
    const watch = page.locator('#rail-popular-movies [data-item-key="movie-103"] [data-action="toggle-watchlist"]');
    await watch.click();
    assert.equal(await watch.textContent(), '✓ En watchlist');
    assert.equal(await text(page, '#rail-trending [data-item-key="movie-103"] [data-action="toggle-watchlist"]'), '✓ En watchlist');
    assert.equal(mock.state.requests.length, requests, 'aucune requête TMDB pour actualiser un bouton');
    const data = await store(page);
    assert.deepEqual([data.tracking['tv-201'].favorite, data.tracking['movie-103'].watchlist], [true, true]);
    assert.equal(data.tracking['tv-201'].lastActivityAt, 0, 'un favori ne change pas la date d’activité');
    assert.equal(await page.locator('#resume-panel-list .resume-row').count(), 0, 'un favori ne fait pas remonter dans Reprendre');
    await favOther.click();
    assert.equal(await favTrending.textContent(), '♡ Ajouter favori');
    await page.locator('.toast [data-action="toast-action"]').click();
    assert.equal(await favTrending.textContent(), '♥ En favori', 'annulation du retrait');
    assert.equal(Object.keys((await store(page)).tracking).length, 2, 'l’affichage de l’accueil n’ajoute rien à la bibliothèque');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('un clic sur une carte ouvre la fiche', T, async () => {
    const { page, errors, context } = await openApp(browser);
    await page.waitForSelector('#rail-trending .card');
    await page.locator('#rail-trending [data-item-key="tv-201"]').click({ position: { x: 40, y: 60 } });
    await page.waitForFunction(() => document.querySelector('h1') && document.querySelector('h1').textContent === 'Série Alpha');
    assert.equal(await page.evaluate(() => location.hash), '#detail/tv/201');
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe('Épisodes et saisons', () => {
  it('A. un épisode ne modifie que lui-même ; saison et série recalculées immédiatement', T, async () => {
    const { page, errors, mock, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    const requests = mock.state.requests.length;
    await page.locator(sel.ep(1, 3, 'seen')).click();
    assert.equal(await page.locator(sel.ep(1, 3, 'seen')).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator(sel.ep(1, 3, 'todo')).getAttribute('aria-pressed'), 'false');
    assert.equal(await text(page, '[data-ep="1-3"] .status'), 'Vu');
    assert.deepEqual(await epStatuses(page, 1), ['todo', 'todo', 'seen', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo']);
    assert.equal(await seasonStatus(page, 1), 'progress', '1 épisode vu sur 10 : saison En cours');
    assert.equal(await statusOf(page, 'tv-201'), 'En cours');
    assert.equal(await text(page, '[data-stat="progress"] strong'), '1');
    assert.deepEqual(await resumeKeys(page, 'resume-panel-list'), ['tv-201']);
    assert.deepEqual((await store(page)).tracking['tv-201'].seasons, { 1: { episodes: { 3: 'seen' } } });
    for (const e of [1, 2, 4, 5, 6, 7, 8, 9, 10]) await page.locator(sel.ep(1, e, 'seen')).click();
    assert.equal(await seasonStatus(page, 1), 'seen', 'tous les épisodes vus : saison Vue');
    assert.equal(await statusOf(page, 'tv-201'), 'En cours', 'une saison vue sur trois : la série reste En cours');
    await page.locator(sel.ep(1, 7, 'todo')).click();
    assert.equal(await seasonStatus(page, 1), 'progress', 'un épisode remis à À voir : saison En cours');
    await page.locator(sel.ep(1, 5, 'progress')).click();
    assert.equal(await text(page, '[data-ep="1-5"] .status'), 'En cours');
    assert.equal(await page.locator('[data-ep="1-5"]').getAttribute('data-status'), 'progress');
    assert.equal(mock.state.requests.length, requests, 'aucune requête réseau pour un clic d’épisode');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('B. boutons de saison, saisons non modifiées intactes, série Vue seulement quand tout est vu', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    const box1 = await page.locator('#season-1 .season-name').boundingBox();
    const box2 = await page.locator('#season-1 .season-meta').boundingBox();
    assert.ok(Math.abs(box1.y - box2.y) < 12 && box2.x > box1.x, 'date • épisodes • statut à droite de « Saison 1 »');
    assert.match(await text(page, '#season-1 .season-meta'), /2019-07-25\s*•\s*10 épisodes\s*•\s*À voir/);
    await page.locator(sel.season(1, 'seen')).click();
    assert.deepEqual(new Set(await epStatuses(page, 1)), new Set(['seen']));
    assert.equal(await seasonStatus(page, 2), 'todo');
    let data = await store(page);
    assert.deepEqual(Object.keys(data.tracking['tv-201'].seasons), ['1'], 'aucune autre saison modifiée');
    assert.equal(await statusOf(page, 'tv-201'), 'En cours');
    await page.locator(sel.season(3, 'seen')).click(); // saison repliée : chargée puis appliquée
    await page.waitForFunction(() => document.querySelector('#season-3').dataset.status === 'seen');
    assert.equal(await statusOf(page, 'tv-201'), 'En cours', 'deux saisons vues sur trois : En cours');
    await page.locator(sel.season(2, 'seen')).click();
    await page.waitForFunction(() => document.querySelector('#season-2').dataset.status === 'seen');
    assert.equal(await statusOf(page, 'tv-201'), 'Vu', 'toutes les saisons régulières vues : Vu');
    assert.equal(await text(page, '[data-stat="seen"] strong'), '1');
    await page.locator('#season-0 [data-action="season-toggle"]').click();
    await page.waitForSelector('#season-0 .ep');
    assert.equal(await seasonStatus(page, 0), 'todo', 'les spéciaux ne sont pas requis pour Vu');
    await page.locator('#season-3 [data-action="season-toggle"]').click();
    await page.locator(sel.ep(3, 2, 'todo')).click();
    assert.equal(await statusOf(page, 'tv-201'), 'En cours');
    await page.locator('[data-action="show-reset"]').click();
    assert.equal(await statusOf(page, 'tv-201'), 'À voir', 'tout remis à À voir');
    assert.deepEqual((await store(page)).tracking['tv-201'].seasons, {});
    await page.locator('.toast [data-action="toast-action"]').last().click();
    assert.equal(await statusOf(page, 'tv-201'), 'En cours', 'annulation de la remise à zéro');
    await page.locator('[data-action="show-all-seen"]').click();
    await page.waitForFunction(() => document.querySelector('[data-status-for="tv-201"]').textContent === 'Vu');
    data = await store(page);
    assert.deepEqual(Object.keys(data.tracking['tv-201'].seasons).sort(), ['1', '2', '3'], '« Tout marquer comme vu » couvre les saisons régulières, pas les spéciaux');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('B. une saison annoncée sans épisode ou impossible à charger ne valide jamais la série', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/203' });
    await page.waitForSelector('#season-1 .ep');
    await page.locator(sel.season(1, 'seen')).click();
    assert.equal(await statusOf(page, 'tv-203'), 'En cours');
    await page.locator('#season-2 [data-action="season-toggle"]').click();
    await page.waitForSelector('#season-2 .empty');
    assert.match(await text(page, '#season-2 .empty'), /Aucun épisode disponible/);
    await page.locator('[data-action="show-all-seen"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-action="show-all-seen"]').textContent.includes('Chargement'));
    assert.equal(await statusOf(page, 'tv-203'), 'En cours', 'saison annoncée vide : pas de Vu automatique');
    await go(page, '#detail/tv/204', 'Série Delta');
    await page.waitForSelector('#season-1 .ep');
    await page.locator('[data-action="show-all-seen"]').click();
    await page.waitForSelector('.toast-error');
    assert.match(await page.locator('.toast-error').last().textContent(), /Saison\(s\) 2 impossible\(s\) à charger/);
    assert.equal(await statusOf(page, 'tv-204'), 'En cours', 'saison en échec : la série n’est pas Vue');
    assert.deepEqual(Object.keys((await store(page)).tracking['tv-204'].seasons), ['1']);
    assert.deepEqual(jsErrors(errors), []);
    await context.close();
  });

  it('B. anime à numérotation absolue (saison 2 = épisodes 6 à 9)', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/202' });
    await page.waitForSelector('#season-1 .ep');
    await page.locator(sel.season(2, 'seen')).click();
    await page.waitForFunction(() => document.querySelector('#season-2').dataset.status === 'seen');
    assert.deepEqual((await store(page)).tracking['tv-202'].seasons, { 2: { episodes: { 6: 'seen', 7: 'seen', 8: 'seen', 9: 'seen' } } });
    assert.equal(await seasonStatus(page, 1), 'todo');
    assert.equal(await statusOf(page, 'tv-202'), 'En cours');
    await page.locator(sel.season(1, 'seen')).click();
    assert.equal(await statusOf(page, 'tv-202'), 'Vu');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('« Vu jusqu’ici » et « Commencer le suivi »', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/tv/201' });
    await page.waitForSelector('#season-1 .ep');
    await page.locator('[data-action="show-start"]').click();
    assert.equal(await statusOf(page, 'tv-201'), 'En cours', 'intention de suivi sans épisode');
    assert.deepEqual((await store(page)).tracking['tv-201'].seasons, {});
    await page.locator('[data-action="episodes-upto"][data-season="1"][data-episode="4"]').click();
    assert.deepEqual(await epStatuses(page, 1), ['seen', 'seen', 'seen', 'seen', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo']);
    assert.match(await text(page, '#detail-track'), /Prochain à voir : S1 · É5/);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe('Films, fiche et Reprendre', () => {
  it('statut d’un film, favoris et watchlist sur la fiche sans navigation ni requête', T, async () => {
    const { page, errors, mock, context } = await openApp(browser, { hash: '#detail/movie/120' });
    await page.waitForSelector('#detail-track');
    await page.waitForFunction(() => document.querySelector('#detail-cards').textContent.includes('Saga : Partie 2'));
    await page.waitForLoadState('networkidle'); // la licence se charge en arrière-plan après la fiche
    const requests = mock.state.requests.length;
    await page.locator('[data-action="movie-status"][data-status="seen"]').click();
    assert.equal(await page.locator('[data-action="movie-status"][data-status="seen"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await statusOf(page, 'movie-120'), 'Vu');
    const fav = page.locator('.detail-actions [data-action="toggle-favorite"]');
    await fav.click();
    assert.equal(await fav.textContent(), '♥ En favori');
    const watch = page.locator('.detail-actions [data-action="toggle-watchlist"]');
    await watch.click();
    assert.equal(await watch.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => location.hash), '#detail/movie/120');
    assert.equal(mock.state.requests.length, requests);
    assert.match(await text(page, '#detail-cards'), /Sortie et saga « Saga intégrale »/);
    assert.match(await text(page, '#detail-cards [data-col="following"]'), /Film suivant[\s\S]*Saga : Partie 2/);
    assert.match(await text(page, '#detail-cards [data-col="previous"]'), /Aucun/, 'premier film de la saga');
    assert.match(await text(page, '#detail-reco'), /Dans le même esprit[\s\S]*pas des suites officielles/);
    assert.equal(await page.locator('#related-panel').count(), 0, 'plus de panneau « Prochain contenu lié »');
    await page.locator('#detail-cards a[href="#detail/movie/121"]').click();
    await page.waitForFunction(() => document.querySelector('h1').textContent === 'Saga : Partie 2');
    await page.waitForFunction(() => document.querySelector('#detail-cards').textContent.includes('Film suivant (à venir)'));
    assert.match(await text(page, '#detail-cards [data-col="previous"]'), /Saga : Partie 1/);
    await go(page, '#detail/movie/101', `L'Été d'Amélie & <b>Les "Fous"</b>`);
    await page.waitForFunction(() => document.querySelector('#detail-cards').textContent.includes('Aucune collection'));
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('C. Reprendre : 5 maximum, ordre réel, sixième en tête, deux emplacements identiques', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#home' });
    await page.waitForSelector('#rail-trending .card');
    for (const id of [102, 103, 104, 105, 106]) {
      await go(page, '#detail/movie/' + id, 'Film Test ' + (id - 100));
      await page.waitForSelector('[data-action="movie-status"][data-status="progress"]');
      await page.locator('[data-action="movie-status"][data-status="progress"]').click();
    }
    assert.deepEqual(await resumeKeys(page, 'resume-panel-list'), ['movie-106', 'movie-105', 'movie-104', 'movie-103', 'movie-102']);
    await go(page, '#detail/tv/205', 'Série Rapide 1');
    await page.waitForSelector('#season-1 .ep');
    await page.locator(sel.ep(1, 1, 'seen')).click();
    await page.locator(sel.ep(1, 2, 'seen')).click();
    const expected = ['tv-205', 'movie-106', 'movie-105', 'movie-104', 'movie-103'];
    assert.deepEqual(await resumeKeys(page, 'resume-panel-list'), expected, 'le sixième est en tête, le plus ancien sort, une ligne par série');
    await go(page, '#detail/movie/102', 'Film Test 2'); // simple ouverture : aucun effet
    await page.locator('.detail-actions [data-action="toggle-favorite"]').click(); // favori : aucun effet sur l'ordre
    assert.deepEqual(await resumeKeys(page, 'resume-panel-list'), expected);
    await go(page, '#resume', 'Reprendre');
    assert.deepEqual(await resumeKeys(page, 'resume-page-list'), expected, 'page Reprendre identique au panneau');
    assert.deepEqual(await resumeKeys(page, 'resume-panel-list'), expected);
    assert.match(await text(page, '#resume-page-more'), /1 autre\(s\) contenu\(s\) en cours/);
    await go(page, '#detail/movie/104', 'Film Test 4');
    await page.locator('[data-action="movie-status"][data-status="seen"]').click();
    assert.deepEqual(await resumeKeys(page, 'resume-panel-list'), ['tv-205', 'movie-106', 'movie-105', 'movie-103', 'movie-102'], 'un contenu Vu sort, le suivant réapparaît');
    await go(page, '#resume', 'Reprendre');
    assert.deepEqual(await resumeKeys(page, 'resume-page-list'), await resumeKeys(page, 'resume-panel-list'));
    await page.locator('#resume-page-list [data-resume-key="movie-105"]').click();
    await page.waitForFunction(() => document.querySelector('h1').textContent === 'Film Test 5');
    assert.equal(await page.evaluate(() => location.hash), '#detail/movie/105');
    await go(page, '#library?status=progress', 'Bibliothèque');
    assert.equal(await page.locator('#view-root .card').count(), 5, 'tous les En cours (6 moins le film passé en Vu) restent dans la bibliothèque');
    assert.deepEqual(await duplicateIds(page), []);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('bibliothèque : filtres Tous / Vu / En cours / À voir et compteurs', T, async () => {
    const { page, errors, context } = await openApp(browser, { hash: '#detail/movie/102' });
    await page.waitForSelector('[data-action="movie-status"]');
    await page.locator('[data-action="movie-status"][data-status="seen"]').click();
    await go(page, '#detail/movie/103', 'Film Test 3');
    await page.locator('[data-action="movie-status"][data-status="progress"]').click();
    await page.locator('.detail-actions [data-action="toggle-favorite"]').click();
    await go(page, '#detail/movie/104', 'Film Test 4');
    await page.locator('.detail-actions [data-action="toggle-watchlist"]').click();
    await go(page, '#library', 'Bibliothèque');
    const counts = async () => page.$$eval('[data-action="lib-status"]', (b) => b.map((x) => x.textContent));
    assert.deepEqual(await counts(), ['Tous (3)', 'Vu (1)', 'En cours (1)', 'À voir (1)']);
    await page.locator('[data-action="lib-status"][data-status="todo"]').click();
    assert.deepEqual(await page.$$eval('#view-root .card', (c) => c.map((x) => x.dataset.itemKey)), ['movie-104']);
    await page.locator('[data-action="lib-status"][data-status="all"]').click();
    assert.deepEqual([await text(page, '[data-stat="seen"] strong'), await text(page, '[data-stat="progress"] strong'), await text(page, '[data-stat="fav"] strong'), await text(page, '[data-stat="total"] strong')], ['1', '1', '1', '3']);
    await go(page, '#favorites', 'Favoris');
    assert.deepEqual(await page.$$eval('#view-root .card', (c) => c.map((x) => x.dataset.itemKey)), ['movie-103']);
    await page.locator('#view-root [data-action="toggle-favorite"]').click();
    assert.equal(await page.locator('#view-root .card').count(), 0, 'retrait immédiat de la liste');
    assert.equal(await page.evaluate(() => location.hash), '#favorites');
    assert.deepEqual(errors, []);
    await context.close();
  });
});
