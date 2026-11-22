// Captures « avant / après » : même données, mêmes réponses TMDB simulées, affiches de test colorées.
// node capture-compare.mjs <racine du projet> <fichier html> <dossier de sortie>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [,, root, htmlFile, out] = process.argv;
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import(pathToFileURL(path.join(root, 'node_modules/playwright-core/index.mjs')).href);
const { createMock, handleWikidata, handleAnilist, handleArm } = await import(pathToFileURL(path.join(root, 'tests/fixtures/tmdb-mock.mjs')).href);

const html = fs.readFileSync(htmlFile, 'utf8').replace("const DEFAULT_TMDB_KEY = '';", "const DEFAULT_TMDB_KEY = 'cle-integree-de-test-0123456789';");
const copy = path.join(os.tmpdir(), 'crazy-capture-' + process.pid + '.html');
fs.writeFileSync(copy, html);
const APP = pathToFileURL(copy).href;

/* Affiche de test : dégradé et formes déterminés par le chemin de l'image (aucun texte). */
const PALETTE = [['#1f3b57', '#d9822b'], ['#3a1c4a', '#e05a6d'], ['#0f3d3a', '#5fc4a8'], ['#402218', '#f2b05e'], ['#1b2a4e', '#7aa2ff'], ['#2e2e38', '#c9c3b8'], ['#4a1420', '#ff8a5c'], ['#13303f', '#9bd1e5'], ['#2b3a1d', '#c6d86a'], ['#33204d', '#b39cff']];
function art(p) {
  let h = 0; for (const c of p) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = PALETTE[h % PALETTE.length];
  const wide = /\/w(780|1280)\//.test(p) || /original/.test(p);
  const W = wide ? 1280 : 400, H = wide ? 720 : 600;
  const cx = (h >> 4) % W, cy = (h >> 9) % (H * 0.7), r = (wide ? 260 : 160) + (h % 90);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#0b0c10"/></linearGradient><radialGradient id="s" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${b}" stop-opacity=".95"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#s)"/><rect y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="#000" opacity=".28"/></svg>`;
}

const now = Date.now();
const tr = (type, id, extra) => Object.assign({ type, id, inLibrary: true, favorite: false, watchlist: false, trackingStatus: null, intent: null, seasons: {}, addedAt: 1, lastActivityAt: now - 86400000 }, extra);
const eps = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, 'seen']));
const data = (theme) => ({ schemaVersion: 1, preferences: theme ? { theme } : {}, metadata: {}, tracking: {
  'tv-201': tr('tv', 201, { favorite: true, seasons: { 1: { episodes: eps(1, 10) }, 2: { episodes: eps(1, 3) } }, lastActivityAt: now }),
  'tv-202': tr('tv', 202, { seasons: { 1: { episodes: eps(1, 5) }, 2: { episodes: eps(6, 9) } }, seenAt: now - 5 * 86400000 }),
  'movie-101': tr('movie', 101, { trackingStatus: 'seen', favorite: true, seenAt: now - 20 * 86400000 }),
  'movie-120': tr('movie', 120, { inLibrary: false, watchlist: true }),
  'tv-203': tr('tv', 203, { inLibrary: false, watchlist: true }) } });

const browser = await chromium.launch({ channel: 'chrome' });
async function open(hash, { viewport = { width: 1440, height: 900 }, theme } = {}) {
  const context = await browser.newContext({ viewport, locale: 'fr-FR' });
  const mock = createMock({ generic: true });
  await context.route('https://api.themoviedb.org/**', (r) => mock.handle(r));
  await context.route('https://image.tmdb.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: art(new URL(r.request().url()).pathname) }));
  await context.route('https://query.wikidata.org/**', (r) => handleWikidata(r));
  await context.route('https://graphql.anilist.co/**', (r) => handleAnilist(r));
  await context.route('https://arm.haglund.dev/**', (r) => handleArm(r));
  await context.addInitScript((s) => { if (sessionStorage.getItem('__seeded')) return; localStorage.setItem('crazy-liste-v1', s); sessionStorage.setItem('__seeded', '1'); }, JSON.stringify(data(theme)));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // les séries suivies passent d'abord par leur fiche, comme en vrai : leurs saisons sont alors connues partout
  await page.goto(APP + '#detail/tv/201');
  await page.waitForTimeout(1500);
  for (const h of ['#detail/tv/202', hash]) { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(h === hash ? 2500 : 1500); }
  if (hash === '#home') { await page.reload(); await page.waitForTimeout(2500); }
  return { page, context, errors };
}
const shots = [
  ['01-accueil', '#home'], ['02-fiche-serie', '#detail/tv/201', async (p) => { await p.click('[data-action="season-toggle"][data-season="2"]').catch(() => {}); await p.waitForTimeout(1500); }],
  ['03-fiche-film', '#detail/movie/101'], ['04-recherche', '#search?type=anime'], ['05-bibliotheque', '#library'], ['06-reprendre', '#resume'],
  ['07-a-venir', '#agenda'], ['08-statistiques', '#stats'], ['09-licences', '#sagas'], ['10-licence-mcu', '#saga/mcu'], ['11-reglages', '#settings']
];
const allErrors = [];
for (const [name, hash, act] of shots) {
  const { page, context, errors } = await open(hash);
  if (act) await act(page);
  await page.mouse.move(1, 1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  allErrors.push(...errors.map((e) => name + ': ' + e));
  await context.close();
}
{ // fenêtre Licence ouverte depuis la fiche
  const { page, context, errors } = await open('#detail/tv/201');
  await page.click('.licbtn').catch(() => {}); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '12-fenetre-licence.png') });
  allErrors.push(...errors); await context.close();
}
{ const { page, context, errors } = await open('#detail/tv/201', { theme: 'light' });
  await page.screenshot({ path: path.join(out, '13-fiche-theme-clair.png'), fullPage: true }); allErrors.push(...errors); await context.close(); }
{ const { page, context, errors } = await open('#home', { theme: 'light' });
  await page.screenshot({ path: path.join(out, '14-accueil-theme-clair.png') }); allErrors.push(...errors); await context.close(); }
{ const { page, context, errors } = await open('#detail/tv/201', { viewport: { width: 390, height: 844 } });
  await page.screenshot({ path: path.join(out, '15-mobile-fiche.png'), fullPage: true }); allErrors.push(...errors); await context.close(); }
await browser.close();
fs.unlinkSync(copy);
console.log(allErrors.length ? 'ERREURS JS :\n' + allErrors.join('\n') : 'ok, aucune erreur JS');
