// node shot2.mjs <racine projet> <fichier html> <prefixe sortie>  → une image par .frame
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [,, root, file, out] = process.argv;
const { chromium } = await import(pathToFileURL(path.join(root, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1500);
const broken = await p.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src));
const frames = p.locator('.frame');
const n = await frames.count();
for (let i = 0; i < n; i++) await frames.nth(i).screenshot({ path: out + '-' + (i + 1) + '.png' });
await b.close();
console.log(n + ' cadres ; images manquantes : ' + (broken.length ? [...new Set(broken)].join(', ') : 'aucune'));
