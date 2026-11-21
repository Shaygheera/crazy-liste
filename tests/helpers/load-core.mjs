// Charge les blocs <script id="crazy-core"> et <script id="crazy-data"> du HTML livré
// et les exécute tels quels dans Node : les tests portent sur le code réellement embarqué.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const HTML_PATH = process.env.CRAZY_HTML || path.resolve(here, '..', '..', 'crazy-liste.html');

let cached = null;
export function loadCore() {
  if (cached) return cached;
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  for (const id of ['crazy-core', 'crazy-data']) {
    const m = new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html);
    if (!m) throw new Error(`Bloc <script id="${id}"> introuvable dans ${HTML_PATH}`);
    vm.runInThisContext(m[1], { filename: `${id}.js` });
  }
  cached = { Core: globalThis.CrazyCore, Data: globalThis.CrazyData };
  return cached;
}
