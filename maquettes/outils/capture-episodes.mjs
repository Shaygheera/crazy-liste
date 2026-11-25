// Captures des nouveautés épisodes (refonte 01c) avec le TMDB simulé : menu de statut, épisode déplié, grille, saison longue.
// Usage : CHROME_PATH=… node maquettes/outils/capture-episodes.mjs <dossier>
import path from 'node:path';
import { launch, openApp } from '../../tests/helpers/browser.mjs';
const out = process.argv[2];
const b = await launch();
const shot = async (page, name, sel) => { await page.waitForTimeout(400); await page.locator(sel).screenshot({ path: path.join(out, name + '.png') }); };
let { page, context } = await openApp(b, { hash: '#detail/tv/201' });
await page.waitForSelector('#season-1 .ep');
await page.locator('[data-action="episode-menu"][data-season="1"][data-episode="3"]').click();
await page.locator('.ep-menu [data-action="episodes-upto"]').click();
await page.locator('[data-action="episode-expand"][data-season="1"][data-episode="1"]').click();
await shot(page, '16-episode-deplie', '#season-1');
await page.locator('[data-action="episode-menu"][data-season="1"][data-episode="5"]').click();
await shot(page, '17-menu-statut', '#season-1');
await page.keyboard.press('Escape');
await page.locator('#season-1 [data-action="episodes-mode"][data-mode="grid"]').click();
await page.locator('#season-1 [data-tile="1-4"]').click();
await shot(page, '18-grille', '#season-1');
await page.locator('#season-1 [data-action="episodes-mode"][data-mode="list"]').click();
await context.close();
({ page, context } = await openApp(b, { hash: '#detail/tv/299' }));
await page.waitForSelector('#season-1 .ep');
await shot(page, '19-saison-130-episodes', '#season-1');
await context.close();
await b.close();
console.log('ok');
