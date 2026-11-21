// Outil de contrôle : affiche ce que Crazy Liste reprendrait d'un ancien export JSON (lecture seule).
// Usage : node tests/check-legacy-file.mjs chemin/vers/export.json [autre.json ...]
import fs from 'node:fs';
import { loadCore } from './helpers/load-core.mjs';

const { Core: C, Data: D } = loadCore();
for (const file of process.argv.slice(2)) {
  const res = D.parseImportText(fs.readFileSync(file, 'utf8'));
  console.log(`\n=== ${file}`);
  if (!res.ok) { console.log('  Refusé :', res.error); continue; }
  console.log(`  Format : ${res.kind} | contenus repris : ${res.summary.items} | favoris : ${res.summary.favorites} | watchlist : ${res.summary.watchlist} | épisodes renseignés : ${res.summary.episodes}`);
  if (res.report) console.log('  Rapport :', JSON.stringify(res.report));
  for (const [k, t] of Object.entries(res.data.tracking)) {
    const m = res.data.metadata[k];
    const st = C.computeItemState(t.type, m, t);
    const eps = Object.entries(t.seasons).map(([s, v]) => `S${s}:${Object.entries(v.episodes).map(([e, x]) => e + '=' + x).join(',')}`).join(' ');
    console.log(`  - ${k} « ${m.title} » statut=${st.status}${t.favorite ? ' ♥' : ''}${t.watchlist ? ' +watchlist' : ''}${t.intent ? ' intention=' + t.intent : ''}${t.legacy ? ' ancien=' + t.legacy.status : ''} ${eps}`);
  }
}
