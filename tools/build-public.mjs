// Prépare la version publiée sur GitHub Pages à partir de crazy-liste.html :
//  - retire la clé TMDB intégrée (chacun utilise la sienne, enregistrée dans son compte) ;
//  - insère la configuration web Firebase (identifiants publics du projet, pas des secrets) ;
//  - demande aux moteurs de recherche de ne pas référencer la page.
// Usage : node tools/build-public.mjs firebase-config.json [dossier-de-sortie]   (défaut : public/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(here, '..', 'crazy-liste.html');
const CONFIG_FIELDS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

export function validateConfig(config) {
  if (!config || typeof config !== 'object') throw new Error('Configuration Firebase absente.');
  for (const f of ['apiKey', 'authDomain', 'projectId', 'appId']) {
    if (typeof config[f] !== 'string' || !config[f].trim()) throw new Error('Configuration Firebase incomplète : champ « ' + f + ' » manquant.');
  }
  return Object.fromEntries(CONFIG_FIELDS.filter((f) => typeof config[f] === 'string').map((f) => [f, config[f].trim()]));
}

export function buildPublic(html, config) {
  const clean = validateConfig(config);
  const swaps = [
    [/const DEFAULT_TMDB_KEY = '[^']*';/, "const DEFAULT_TMDB_KEY = ''; // version publique : aucune clé intégrée"],
    [/const FIREBASE_CONFIG = null;/, 'const FIREBASE_CONFIG = ' + JSON.stringify(clean) + ';'],
    [/(<meta name="viewport"[^>]*>)/, '$1\n<meta name="robots" content="noindex, nofollow">']
  ];
  let out = html;
  for (const [re, by] of swaps) {
    if (!re.test(out)) throw new Error('Repère introuvable dans crazy-liste.html : ' + re);
    out = out.replace(re, by);
  }
  if (!/const DEFAULT_TMDB_KEY = '';/.test(out)) throw new Error('La clé TMDB intégrée est encore présente.');
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [configPath, outDir = path.resolve(here, '..', 'public')] = process.argv.slice(2);
  if (!configPath) { console.error('Usage : node tools/build-public.mjs firebase-config.json [dossier]'); process.exit(1); }
  const out = buildPublic(fs.readFileSync(SOURCE, 'utf8'), JSON.parse(fs.readFileSync(configPath, 'utf8')));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), out);
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  console.log('Version publique écrite dans ' + path.join(outDir, 'index.html'));
}
