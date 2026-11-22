// Assemble « Avant | Après » côte à côte (partie haute de chaque page).
// node compose.mjs <racine projet> <dossier cmp>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [,, root, dir] = process.argv;
const { chromium } = await import(pathToFileURL(path.join(root, 'node_modules/playwright-core/index.mjs')).href);
const pairs = [['01-accueil', 'Accueil', 1250], ['02-fiche-serie', 'Fiche d’une série', 1700], ['03-fiche-film', 'Fiche d’un film', 1050], ['05-bibliotheque', 'Bibliothèque', 900], ['04-recherche', 'Recherche', 900], ['10-licence-mcu', 'Licence MCU', 1100]];
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1960, height: 1000 } });
const outDir = path.join(dir, 'comparaison');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, label, h] of pairs) {
  const src = (side) => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, side, name + '.png')).toString('base64');
  const H = Math.round(h * 960 / 1440);
  await p.setContent(`<!doctype html><html><body style="margin:0;background:#2a2d33;font:600 22px system-ui,Segoe UI,sans-serif;color:#fff">
    <div style="display:flex;gap:20px;padding:16px 10px 10px">
      ${['avant', 'apres'].map((s) => `<div style="width:960px"><div style="padding:0 2px 10px;opacity:.9">${label} — ${s === 'avant' ? 'avant' : 'après'}</div>
      <div style="height:${H}px;overflow:hidden;border-radius:6px;outline:1px solid #444"><img src="${src(s)}" style="width:960px;display:block"></div></div>`).join('')}
    </div></body></html>`);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(outDir, name + '.png'), fullPage: true });
}
await b.close();
console.log('ok');
