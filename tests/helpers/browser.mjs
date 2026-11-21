// Ouverture de l'application dans Chrome (playwright-core) avec TMDB simulé et collecte des erreurs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createMock, PNG, handleWikidata, handleAnilist } from '../fixtures/tmdb-mock.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = process.env.CRAZY_HTML || path.resolve(here, '..', '..', 'crazy-liste.html');
/* Le code publié ne contient aucune clé TMDB. Les tests ouvrent une copie dotée d'une clé fictive (TEST_TMDB_KEY),
   ou de la vraie clé pour le contrôle en ligne : TMDB_KEY=… node tests/live-smoke.mjs */
export const TEST_TMDB_KEY = 'cle-integree-de-test-0123456789';
function appCopy() {
  const key = process.env.TMDB_KEY || TEST_TMDB_KEY;
  const html = fs.readFileSync(SOURCE, 'utf8').replace("const DEFAULT_TMDB_KEY = '';", () => "const DEFAULT_TMDB_KEY = '" + key.replace(/[^\w.-]/g, '') + "';");
  if (!html.includes("const DEFAULT_TMDB_KEY = '" )) throw new Error('Repère DEFAULT_TMDB_KEY introuvable');
  const out = path.join(os.tmpdir(), 'crazy-liste-test-' + process.pid + '.html');
  fs.writeFileSync(out, html);
  return out;
}
export const APP_URL = pathToFileURL(appCopy()).href;

export async function launch() {
  const opts = { headless: process.env.HEADED ? false : true };
  return process.env.CHROME_PATH ? chromium.launch({ ...opts, executablePath: process.env.CHROME_PATH }) : chromium.launch({ ...opts, channel: 'chrome' });
}

/* storage : paires clé/valeur écrites dans localStorage avant le premier chargement de l'onglet (une seule fois). */
export async function openApp(browser, { hash = '', storage = null, viewport = { width: 1440, height: 900 }, mock: mockOptions, initScript, acceptDownloads = false } = {}) {
  const context = await browser.newContext({ viewport, acceptDownloads, locale: 'fr-FR' });
  const mock = createMock(mockOptions);
  await context.route('https://api.themoviedb.org/**', (r) => mock.handle(r));
  await context.route('https://image.tmdb.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await context.route('https://query.wikidata.org/**', (r) => handleWikidata(r));
  await context.route('https://graphql.anilist.co/**', (r) => handleAnilist(r));
  if (storage) {
    await context.addInitScript((s) => {
      if (sessionStorage.getItem('__seeded')) return;
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      sessionStorage.setItem('__seeded', '1');
    }, storage);
  }
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(APP_URL + hash);
  return { context, page, mock, errors };
}

/* Erreurs JavaScript réelles : on écarte uniquement les journaux réseau des réponses d'erreur simulées volontairement. */
export const jsErrors = (errors) => errors.filter((e) => !/Failed to load resource/.test(e));
export const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('crazy-liste-v1') || 'null'));
export const duplicateIds = (page) => page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); return ids.filter((x, i) => ids.indexOf(x) !== i); });
