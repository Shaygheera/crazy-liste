// Contrôle optionnel contre la VRAIE API TMDB (Internet requis). Clé lue dans la variable TMDB_KEY.
// Usage (PowerShell) : $env:TMDB_KEY = 'ta-clé'; node tests/live-smoke.mjs
// Profil de navigateur vierge : n'utilise ni ne modifie tes données personnelles.
// Usage : node tests/live-smoke.mjs
import assert from 'node:assert/strict';
if (!process.env.TMDB_KEY) { console.error('Définis TMDB_KEY (ta clé TMDB) avant de lancer ce contrôle.'); process.exit(1); }
const { launch, APP_URL } = await import('./helpers/browser.mjs');

const browser = await launch();
const errors = [];
const step = (m) => console.log('✔ ' + m);
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const h1 = (t) => page.waitForFunction((x) => document.querySelector('h1') && document.querySelector('h1').textContent === x, t, { timeout: 20000 });
  const status = (key) => page.locator(`[data-status-for="${key}"]`).first().textContent();

  await page.goto(APP_URL + '#home');
  for (const id of ['trending', 'popular-movies', 'popular-tv', 'anime', 'top-movies', 'upcoming']) await page.waitForSelector(`#rail-${id} .card`, { timeout: 20000 });
  step('accueil : 6 sections chargées depuis TMDB (' + (await page.locator('.card').count()) + ' cartes)');

  await page.fill('#search-input', 'naruto');
  await page.press('#search-input', 'Enter');
  await page.waitForSelector('#search-results .card', { timeout: 20000 });
  step('recherche « naruto » : ' + (await page.locator('#search-results .card').count()) + ' résultats (personnes exclues)');

  await page.evaluate(() => { location.hash = '#detail/tv/46260'; });
  await h1('Naruto');
  await page.waitForSelector('#season-1 .ep', { timeout: 20000 });
  await page.locator('#season-2 [data-action="season-toggle"]').click();
  await page.waitForSelector('#season-2 .ep', { timeout: 20000 });
  const s2 = await page.$$eval('#season-2 .ep', (els) => els.map((e) => Number(e.dataset.ep.split('-')[1])));
  assert.equal(s2[0], 53, 'numérotation absolue de TMDB');
  step(`Naruto saison 2 : épisodes ${s2[0]} à ${s2[s2.length - 1]} (${s2.length})`);
  await page.locator('[data-action="season-status"][data-season="2"][data-status="seen"]').click();
  await page.waitForFunction(() => document.querySelector('#season-2').dataset.status === 'seen');
  assert.equal(await status('tv-46260'), 'En cours');
  step('Naruto : saison 2 vue, série « En cours » (les autres saisons comptent)');

  await page.evaluate(() => { location.hash = '#detail/tv/1396'; });
  await h1('Breaking Bad');
  await page.waitForSelector('#season-1 .ep', { timeout: 20000 });
  await page.locator('[data-action="show-all-seen"]').click();
  await page.waitForFunction(() => document.querySelector('[data-status-for="tv-1396"]').textContent === 'Vu', null, { timeout: 30000 });
  const tracked = await page.evaluate(() => JSON.parse(localStorage.getItem('crazy-liste-v1')).tracking['tv-1396'].seasons);
  const counts = Object.fromEntries(Object.entries(tracked).map(([s, v]) => [s, Object.keys(v.episodes).length]));
  assert.deepEqual(Object.keys(counts), ['1', '2', '3', '4', '5'], 'saisons régulières uniquement (spéciaux exclus)');
  step('Breaking Bad « Tout marquer comme vu » : ' + JSON.stringify(counts) + ' → « Vu »');
  assert.match(await page.locator('#related-panel').textContent(), /Aucun prochain épisode annoncé|Prochain épisode annoncé/);
  step('panneau « Prochain contenu lié » rempli depuis TMDB');

  await page.evaluate(() => { location.hash = '#detail/movie/120'; });
  await page.waitForFunction(() => document.querySelector('#related-panel').textContent.includes('Film suivant'), null, { timeout: 20000 });
  step('film « La Communauté de l’anneau » : suite trouvée via sa collection TMDB');

  await page.reload();
  await page.waitForSelector('#detail-track', { timeout: 20000 });
  step('rechargement : la fiche reste ouverte');
  assert.deepEqual(errors, []);
  step('aucune erreur JavaScript ni console');
  await context.close();
} catch (err) {
  console.error('✖ ÉCHEC :', err.message);
  if (errors.length) console.error('Erreurs console :', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
