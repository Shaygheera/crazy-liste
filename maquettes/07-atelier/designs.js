/* Crazy Liste : 16 propositions de design, toutes construites avec les mêmes blocs et les mêmes données (fiche d'Arcane). */
(function () {
const IMG = (n) => 'img/tmdb/' + n + '.webp';
const I = (k, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + k + '"/></svg>';

const NAV = [
  ['Découvrir', [['Accueil', 'home', '', 'Accueil'], ['Recherche', 'search', '', 'Chercher'], ['Licences', 'wave', '', 'Licences']]],
  ['Mon suivi', [['Reprendre', 'resume', 4, 'Reprendre'], ['À venir', 'cal', 3, 'À venir'], ['Bibliothèque', 'lib', 214, 'Biblio.'], ['Favoris', 'heart', 31, 'Favoris'], ['Watchlist', 'book', 48, 'Watchlist'], ['Statistiques', 'stats', '', 'Stats']]]
];
const EP = [
  ['Heavy Is the Crown', '9 nov. 2024', 8.4, 'v'], ['Watch It All Burn', '9 nov. 2024', 8.2, 'v'], ['Finally Got the Name Right', '9 nov. 2024', 8.6, 'v'],
  ['Paint the Town Blue', '16 nov. 2024', 8.1, 'v'], ['Blisters and Bedrock', '16 nov. 2024', 8.5, 'next'], ['The Message Hidden Within the Pattern', '16 nov. 2024', 8.3, 't'],
  ['Pretend Like It’s the First Time', '23 nov. 2024', 8.4, 't'], ['Killing Is a Cycle', '23 nov. 2024', 8.7, 't'], ['The Dirt Under Your Nails', '23 nov. 2024', 8.6, 't']
];
const SIM = [
  { t: 'Frieren', y: 2023, ty: 'Série', anime: 1, r: 8.8, p: 'frieren', st: 'v', n: '28 / 28 ép.' },
  { t: 'Avatar, le dernier maître de l’air', y: 2005, ty: 'Série', r: 8.7, p: 'avatar', st: 'p', n: '34 / 61 ép.', fav: 1 },
  { t: 'One Piece', y: 1999, ty: 'Série', anime: 1, r: 8.7, p: 'onepiece', st: 'p', n: '1 088 / 1 150' },
  { t: 'Breaking Bad', y: 2008, ty: 'Série', r: 8.9, p: 'breakingbad', st: 't', wl: 1 },
  { t: 'Iron Man', y: 2008, ty: 'Film', r: 7.6, p: 'ironman', st: 'v', fav: 1 },
  { t: 'Avengers : Doomsday', y: 2026, ty: 'Film', r: 0, p: 'doomsday', st: 't', wl: 1, soon: '18 déc. 2026' }
];
const STL = { t: 'À voir', p: 'En cours', v: 'Vu' };
const STI = { t: 'todo', p: 'prog', v: 'seen' };
const tier = (r) => (!r ? 'none' : r >= 8 ? 'top' : r >= 7 ? 'good' : 'mid');
const fr = (r) => (r ? r.toFixed(1).replace('.', ',') : '–');
const rate = (r, cls) => '<span class="rate r-' + tier(r) + (cls ? ' ' + cls : '') + '" title="Note TMDB">' + fr(r) + '</span>';
const st = (s, extra) => '<span class="st st-' + s + '">' + I(STI[s]) + STL[s] + (extra ? '<span class="stn"> · ' + extra + '</span>' : '') + '</span>';

/* ---------- blocs ---------- */
const brand = () => '<div class="brand"><span class="mark">CL</span><span class="bt"><b>Crazy Liste</b><small>Films · Séries · Anime</small></span></div>';
function nav(mode) {
  let h = '<nav class="nav nav-' + mode + '" aria-label="Menu">';
  NAV.forEach(([g, items], gi) => {
    h += '<div class="ng">' + (mode === 'full' || mode === 'top' ? '<p class="ngl">' + g + '</p>' : '');
    items.forEach(([l, ic, n, short]) => {
      const lab = mode === 'rail' || mode === 'dock' ? short : l;
      h += '<a class="nl" href="#">' + I(ic) + '<span class="nt">' + lab + '</span>' + (n && mode !== 'rail' && mode !== 'dock' ? '<span class="nc">' + n + '</span>' : '') + '</a>';
    });
    h += '</div>';
  });
  return h + '</nav>';
}
const navFoot = () => '<div class="nfoot"><a class="nl" href="#">' + I('gear') + '<span class="nt">Réglages</span></a><a class="nl" href="#">' + I('moon') + '<span class="nt">Changer de thème</span></a><p class="sync"><i></i>Synchronisé</p></div>';
const search = (cls) => '<div class="search' + (cls ? ' ' + cls : '') + '">' + I('search') + '<span class="sph">Rechercher un film, une série, un anime…</span><kbd>/</kbd><button class="btn pri sm">Rechercher</button></div>';
const themeBtn = () => '<button class="btn ghost icon" aria-label="Changer de thème">' + I('moon') + '</button>';

const sagaLic = () => '<div class="sl"><button class="slb">' + I('layers') + '<span><b>Saga « Arcane »</b><small>1 série · 2 saisons</small></span>' + I('chev', 'chv') + '</button>' +
  '<button class="slb">' + I('grid') + '<span><b>Licence</b><small>League of Legends · 2 séries</small></span>' + I('chev', 'chv') + '</button></div>';
const posterCol = () => '<div class="pcol"><img class="post" src="' + IMG('arcane-l') + '" alt="Affiche d’Arcane">' + sagaLic() + '</div>';
const title = (o) => o.logo ? '<h1 class="ttl ttl-logo"><img class="logo" src="' + IMG('logo') + '" alt="Arcane"></h1>' : '<h1 class="ttl">Arcane</h1>';
const facts = () => '<div class="facts">' + rate(8.8, 'big') + '<span class="votes">4 912 votes TMDB</span><span class="fsep"></span>' + st('p', '13 / 18 ép.') + '<span class="fsep"></span><span class="avail">' + I('okc') + 'Disponible</span></div>';
const meta = () => '<p class="meta">Série · 2 saisons · 18 épisodes · 40 min / ép. · depuis le 6 novembre 2021</p>';
const genres = () => '<div class="genres"><span>Animation</span><span>Action & Aventure</span><span>Science-Fiction & Fantastique</span><span>Drame</span></div>';
const synopsis = () => '<p class="syn">À Piltover, cité du progrès, et dans les bas-fonds de Zaun, deux sœurs que tout oppose se retrouvent au cœur d’une guerre entre deux mondes, entre technologies magiques et convictions irréconciliables.</p>';
const offers = () => '<div class="offers"><span class="olab">Abonnement</span><span class="prov"><img src="' + IMG('netflix') + '" alt="">Netflix</span><a class="jw" href="#">via JustWatch' + I('ext') + '</a></div>';
const actions = () => '<div class="acts"><button class="btn pri">' + I('play') + 'Bande-annonce (VO)</button><button class="btn fav on" aria-pressed="true">' + I('heartf') + 'En favori</button><button class="btn wl" aria-pressed="false">' + I('book') + 'Ajouter à la watchlist</button></div>';
const heroText = (o) => '<div class="htx">' + title(o) + facts() + meta() + genres() + (o.noSynInHero ? '' : synopsis()) + (o.noOffInHero ? '' : offers()) + actions() + '</div>';

const blk = (cls, h2, body) => '<section class="blk ' + cls + '"><h2 class="bh">' + h2 + '</h2>' + body + '</section>';
const diffusion = () => blk('diff', 'Diffusion <em class="tagS">' + I('okc') + 'Terminée</em>',
  '<div class="cells"><div><small>Dernier épisode diffusé</small><strong>S2 · É9</strong><span>23 novembre 2024</span></div><div><small>Saisons et épisodes</small><strong>2 saisons</strong><span>18 épisodes</span></div><div><small>Prochain épisode</small><strong>Aucun</strong><span>La série est terminée</span></div></div>');
const C = 2 * Math.PI * 40;
const ring = () => '<div class="ring"><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="40" class="rbg"/><circle cx="48" cy="48" r="40" class="rfg" stroke-dasharray="' + (C * 13 / 18).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><b>72<small>%</small></b></div>';
const ticks = () => '<div class="ticks" aria-hidden="true"><span>' + Array.from({ length: 9 }, () => '<i class="s"></i>').join('') + '</span><span>' + Array.from({ length: 9 }, (_, i) => '<i class="' + (i < 4 ? 's' : i === 4 ? 'n' : '') + '"></i>').join('') + '</span></div>';
const progress = (o) => blk('prog', 'Ma progression ' + st('p'),
  '<div class="pv">' + (o.ring ? ring() : '') + '<div class="pvt"><p class="pn"><b>13</b> / 18 épisodes vus</p><p class="pnx">Prochain à voir : <b>S2 · É5</b> « Blisters and Bedrock »</p><p class="pmut">Hors épisodes spéciaux</p></div></div>' + ticks() +
  '<div class="pacts"><button class="btn sm">' + I('check') + 'Tout marquer comme vu</button><button class="btn sm">' + I('reset') + 'Tout remettre à « À voir »</button><button class="btn sm danger">' + I('x') + 'Retirer de ma liste</button></div>');
const seg = (on) => '<div class="seg" role="group" aria-label="Statut">' + ['t', 'p', 'v'].map((k) => '<button class="sg sg-' + k + (on === k ? ' on' : '') + '" aria-pressed="' + (on === k) + '">' + I(on === k ? 'check' : STI[k]) + STL[k] + '</button>').join('') + '</div>';
const epState = (s) => (s === 'v' ? 'v' : s === 'p' ? 'p' : 't');
/* ---------- jeux de saisons pour tester la place prise (seule la partie Saisons et épisodes change) ---------- */
const fmtD = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const gen = (n, seen, start, opt) => Array.from({ length: n }, (_, i) => { const no = (opt && opt.from || 1) + i; const d = new Date(start); d.setDate(d.getDate() + 7 * Math.max(0, i - ((opt && opt.first) || 0)));
  return { no, t: 'Épisode ' + no, d: fmtD(d), r: 7.6 + ((no * 37) % 14) / 10, s: no <= seen ? 'v' : no === seen + 1 ? 'next' : 't' }; });
const S1A = ['Welcome to the Playground', 'Some Mysteries Are Better Left Unsolved', 'The Base Violence Necessary for Change', 'Happy Progress Day!', 'Everybody Wants to Be My Enemy', 'When These Walls Come Tumbling Down', 'The Boy Savior', 'Oil and Water', 'The Monster You Created'];
const SETS = {
  arcane: { min: 40, seasons: [
    { n: 'Saison 1', m: '2021 · 9 épisodes', eps: S1A.map((t, i) => ({ no: i + 1, t, d: ['6', '13', '20'][Math.floor(i / 3)] + ' nov. 2021', r: 8.3 + (i % 4) / 10, s: 'v' })) },
    { n: 'Saison 2', m: '2024 · 9 épisodes', open: 1, eps: EP.map(([t, d, r, s], i) => ({ no: i + 1, t, d, r, s })) },
    { n: 'Épisodes spéciaux', m: '2 épisodes · hors progression', special: 1, eps: [{ no: 1, t: 'Spécial 1', d: '2021', r: 0, s: 't' }, { no: 2, t: 'Spécial 2', d: '2024', r: 0, s: 't' }] }] },
  frieren: { min: 24, seasons: [
    { n: 'Saison 1', m: '2023 – 2024 · 28 épisodes', open: 1, eps: gen(28, 17, '2023-09-29', { first: 3 }) },
    { n: 'Saison 2', m: 'annoncée · 10 épisodes', eps: gen(10, 0, '2026-01-16') }] },
  long: { min: 24, seasons: [
    { n: 'Épisodes 1 à 1 150', m: 'depuis 1999 · 1 150 épisodes (démo)', open: 1, eps: gen(1150, 1088, '1999-10-20') }] }
};
const curSet = () => SETS[window.CL_EPSET] ? window.CL_EPSET : 'arcane';
const sState = (eps) => eps.every((e) => e.s === 'v') ? 'v' : eps.some((e) => e.s === 'v') ? 'p' : 't';
const epItem = (e, i) => {
  const s = e.s;
  return '<div class="ep ep-' + s + '"><span class="no">' + (s === 'v' ? I('check') : 'É' + e.no) + '</span><div class="et"><h4>' + (s === 'v' ? '<span class="sr">É' + e.no + ' </span>' : '') + e.t + '</h4><p class="em">' + (s === 'next' ? '<b class="nx">' + I('arrow') + 'Prochain</b>' : '') + '<span>' + e.d + '</span><span>' + (e.min || 40) + ' min</span>' + (e.r ? rate(e.r, 'sm') : '') + '</p></div>' +
    '<div class="ec">' + seg(epState(s)) + (i ? '<button class="btn sm upto">Vu jusqu’ici</button>' : '') + '</div></div>';
};
const seasonRow = (name, m, s, on, pc, body) => '<div class="season' + (body ? ' open' : '') + '"><div class="sh"><button class="sx" aria-label="Déplier">' + I(body ? 'chevu' : 'chev') + '</button><h3>' + name + '</h3><span class="smeta">' + m + '</span>' + st(s) + '<span class="sall">Toute la saison</span>' + seg(on) + '</div><div class="sbar"><i class="sb-' + s + '" style="width:' + pc + '%"></i></div>' + (body || '') + '</div>';
const CAP = 60;
const capNote = (eps) => eps.length > CAP ? '<p class="capnote">… et ' + (eps.length - CAP).toLocaleString('fr-FR') + ' autres épisodes, non affichés dans cette démo : en liste, ils prendraient environ ' + Math.round(eps.length * 60 / 1000) + ' 000 px de haut.</p>' : '';
function episodes(v, eps) {
  const E = eps.slice(0, CAP);
  if (v === 'table') {
    return '<div class="tw"><table class="etab"><thead><tr><th>N°</th><th>Titre</th><th>Diffusion</th><th>Durée</th><th>Note</th><th>Mon statut</th><th></th></tr></thead><tbody>' +
      E.map((e, i) => '<tr class="tr-' + e.s + '"><td class="tn">É' + e.no + '</td><td class="tt">' + (e.s === 'next' ? '<b class="nx">' + I('arrow') + 'Prochain</b>' : '') + e.t + '</td><td>' + e.d + '</td><td>40 min</td><td>' + (e.r ? rate(e.r, 'sm') : '') + '</td><td>' + seg(epState(e.s)) + '</td><td>' + (i ? '<button class="btn sm upto">Vu jusqu’ici</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' + capNote(eps);
  }
  return '<div class="eps eps-' + v + '">' + E.map(epItem).join('') + '</div>' + capNote(eps);
}
/* épisodes compacts : liste sur plusieurs colonnes (titre, date, note, statut) ou grille ; tranches au-delà de 60 (liste) / 120 (grille) */
const ST_ORDER = ['t', 'p', 'v'];
function stMenu(i) {
  return '<div class="emenu" role="menu">' + ST_ORDER.map((k) => '<button class="mi mi-' + k + '" role="menuitem" data-st="' + i + ':' + k + '">' + I(STI[k]) + STL[k] + '</button>').join('') +
    (i ? '<button class="mi" role="menuitem" data-st="' + i + ':upto">' + I('check') + 'Vu jusqu’ici</button>' : '') + '</div>';
}
const votes = (e) => (180 + (e.no * 53) % 900).toLocaleString('fr-FR');
const epDetail = (e, i) => '<div class="edet" data-i="' + i + '"><p class="emeta"><span>' + I('cal') + 'Diffusé le ' + e.d + '</span><span>' + I('resume') + '40 min</span>' + (e.r ? '<span>' + rate(e.r, 'sm') + votes(e) + ' votes TMDB</span>' : '') + '</p>' +
  '<p class="syn2"><b>Résumé</b> <em>(exemple : sur le site, il viendra de TMDB)</em><br>' + (e.syn || 'Après les événements de l’épisode précédent, les alliances se fissurent : chacun doit choisir son camp pendant que la tension monte entre les deux villes. Un épisode charnière, riche en révélations.') + '</p>' +
  '<div class="eact">' + seg(epState(e.s)) + (i ? '<button class="btn sm upto" data-st="' + i + ':upto">' + I('check') + 'Vu jusqu’ici</button>' : '') + '</div></div>';
function epBlock(setKey, si, S) {
  const eps = SETS[setKey].seasons[si].eps;
  S = Object.assign({ mode: 'list', sel: null, rng: null, menu: -1, open: -1 }, S || {});
  const nextI = Math.max(0, eps.findIndex((e) => e.s === 'next'));
  const R = S.mode === 'list' ? 50 : 100, paged = eps.length > (S.mode === 'list' ? 60 : 120);
  if (S.sel == null) S.sel = nextI;
  if (S.rng == null) S.rng = paged ? Math.floor(S.sel / R) : 0;
  const from = paged ? S.rng * R : 0, show = paged ? eps.slice(from, from + R) : eps, nR = Math.ceil(eps.length / R);
  let h = '<div class="eg eg-' + S.mode + '" data-set="' + setKey + '" data-si="' + si + '" data-state=\'' + JSON.stringify(S) + '\'>';
  h += '<div class="etop">';
  if (paged && S.mode === 'list') h += '<div class="enav"><button class="btn sm icon" data-nav="-1" aria-label="Tranche précédente">' + I('left') + '</button><span class="enl">Épisodes <b>' + show[0].no.toLocaleString('fr-FR') + ' – ' + show[show.length - 1].no.toLocaleString('fr-FR') + '</b> sur ' + eps.length.toLocaleString('fr-FR') + '</span><button class="btn sm icon" data-nav="1" aria-label="Tranche suivante">' + I('chevr') + '</button>' +
    (Math.floor(nextI / R) !== S.rng ? '<button class="btn sm" data-gonext="1">' + I('arrow') + 'Aller au prochain · É' + eps[nextI].no + '</button>' : '') + '</div>';
  else if (paged) { h += '<div class="erng" role="group" aria-label="Tranches d’épisodes">';
    for (let k = 0; k < nR; k++) { const part = eps.slice(k * R, k * R + R), ss = sState(part);
      h += '<button class="rg rg-' + ss + (k === S.rng ? ' on' : '') + '" data-rng="' + k + '" aria-pressed="' + (k === S.rng) + '">' + I(k === S.rng && ss === 'v' ? 'check' : STI[ss]) + part[0].no + '–' + part[part.length - 1].no + '</button>'; }
    h += '</div>'; }
  else h += '<span></span>';
  h += '<div class="emode" role="group" aria-label="Affichage des épisodes"><button class="mo' + (S.mode === 'list' ? ' on' : '') + '" data-mode="list" aria-pressed="' + (S.mode === 'list') + '">' + I('lines') + 'Liste</button><button class="mo' + (S.mode === 'grid' ? ' on' : '') + '" data-mode="grid" aria-pressed="' + (S.mode === 'grid') + '">' + I('lib') + 'Grille</button></div></div>';
  if (S.mode === 'list') {
    h += '<div class="elist">' + show.map((e, j) => { const i = from + j, es = epState(e.s);
      const op = S.open === i;
      return '<div class="er er-' + e.s + (op ? ' open' : '') + '"><button class="ehd" data-exp="' + i + '" aria-expanded="' + op + '" aria-label="Épisode ' + e.no + ', ' + (op ? 'replier' : 'déplier') + '"><span class="no">' + e.no + '</span><span class="et"><span class="h4">' + (e.s === 'next' ? '<b class="nx">' + I('arrow') + 'Prochain</b> ' : '') + e.t + '</span><span class="em"><span>' + e.d + '</span>' + (e.r ? rate(e.r, 'sm') : '') + '</span></span>' + I(op ? 'chevu' : 'chev', 'echv') + '</button>' +
        '<button class="stb stb-' + es + '" data-menu="' + i + '" aria-haspopup="menu" aria-expanded="' + (S.menu === i) + '" aria-label="Statut de l’épisode ' + e.no + ' : ' + STL[es] + '">' + I(es === 'v' ? 'check' : STI[es]) + STL[es] + I('chev', 'chv') + '</button>' + (S.menu === i ? stMenu(i) : '') + (op ? epDetail(e, i) : '') + '</div>'; }).join('') + '</div>';
  } else {
    h += '<div class="etiles' + (eps.length > 999 ? ' wide' : '') + '" role="group" aria-label="Épisodes">' + show.map((e, j) => { const i = from + j;
      return '<button class="tile-ep te-' + e.s + (i === S.sel ? ' sel' : '') + '" data-ep="' + i + '" aria-pressed="' + (i === S.sel) + '" aria-label="Épisode ' + e.no + ' : ' + (e.s === 'next' ? 'prochain à voir' : STL[epState(e.s)]) + '"><span>' + e.no + '</span>' + (e.s === 'v' ? I('check') : e.s === 'next' ? I('arrow') : e.s === 'p' ? I('prog') : '') + '</button>'; }).join('') + '</div>';
    const e = eps[S.sel];
    h += '<div class="esel"><p class="esk">' + (e.s === 'next' ? '<b class="nx">' + I('arrow') + 'Prochain à voir</b>' : 'Épisode choisi') + '</p><h4>É' + e.no + ' · ' + e.t + '</h4>' + epDetail(e, S.sel) + '</div>';
  }
  h += '<p class="elg"><span>' + I('check') + 'Vu</span><span>' + I('arrow') + 'Prochain</span><span>' + I('prog') + 'En cours</span><span>' + I('todo') + 'À voir</span><span>' + (S.mode === 'list' ? 'Clique un épisode pour le déplier (résumé, note, date). Le bouton de statut ouvre À voir / En cours / Vu / Vu jusqu’ici.' : 'Clique une case pour voir l’épisode.') + ' Démo : rien n’est enregistré.</span></p></div>';
  return h;
}
const grid = (k, si) => epBlock(k, si, { mode: 'list' });
const fixNext = (eps) => { eps.forEach((e) => { if (e.s === 'next') e.s = 't'; }); const n = eps.findIndex((e) => e.s !== 'v'); if (n >= 0 && eps[n].s === 't') eps[n].s = 'next'; };
window.CL_epClick = (btn) => {
  const g = btn.closest('.eg'); if (!g) return false;
  const S = JSON.parse(g.dataset.state), eps = SETS[g.dataset.set].seasons[+g.dataset.si].eps, d = btn.dataset;
  const R = S.mode === 'list' ? 50 : 100, nR = Math.ceil(eps.length / R);
  if (d.mode) { S.mode = d.mode; S.rng = null; S.menu = -1; }
  else if (d.exp != null) { S.open = S.open === +d.exp ? -1 : +d.exp; S.menu = -1; }
  else if (d.menu != null) { S.menu = S.menu === +d.menu ? -1 : +d.menu; }
  else if (d.st) { const [i, k] = d.st.split(':'); const n = +i;
    if (k === 'upto') eps.forEach((e, j) => { if (j <= n) e.s = 'v'; }); else eps[n].s = k;
    fixNext(eps); S.menu = -1; S.sel = n; }
  else if (d.ep != null) S.sel = +d.ep;
  else if (d.rng != null) { S.rng = +d.rng; S.sel = S.rng * R; }
  else if (d.nav) { S.rng = (S.rng + +d.nav + nR) % nR; S.menu = -1; }
  else if (d.gonext) { S.rng = null; S.sel = null; S.menu = -1; }
  else if (btn.classList.contains('sg')) { const k = ['t', 'p', 'v'].find((x) => btn.classList.contains('sg-' + x)); const host = btn.closest('[data-i]'); if (host && k) { eps[+host.dataset.i].s = k; fixNext(eps); } else return false; }
  else return false;
  g.outerHTML = epBlock(g.dataset.set, +g.dataset.si, S);
  return true;
};
const seasons = (v) => { const k = curSet(), S = SETS[k];
  return '<section class="seasons"><header class="ssh"><h2>Saisons et épisodes</h2><p>Les boutons d’une saison s’appliquent à tous ses épisodes ; ceux d’un épisode ne modifient que lui.</p></header>' +
  S.seasons.map((se, si) => { const ss = sState(se.eps), pc = Math.round(100 * se.eps.filter((e) => e.s === 'v').length / se.eps.length);
    return seasonRow(se.n, se.m, ss, ss === 'p' ? '' : ss, pc, se.open ? (v === 'grid' ? grid(k, si) : episodes(v, se.eps)) : ''); }).join('') + '</section>'; };
const stats = () => blk('stats', 'Mes statistiques <a href="#">Détails</a>', '<div class="sn">' +
  '<div class="sn-v"><strong>162</strong><span>' + I('seen') + 'Vus</span></div><div class="sn-p"><strong>4</strong><span>' + I('prog') + 'En cours</span></div>' +
  '<div class="sn-f"><strong>31</strong><span>' + I('heart') + 'Favoris</span></div><div class="sn-t"><strong>214</strong><span>' + I('lib') + 'Total</span></div></div>');
const statsInline = () => '<div class="sinl" aria-label="Mes statistiques"><span><b>162</b>' + I('seen') + 'vus</span><span><b>4</b>' + I('prog') + 'en cours</span><span><b>31</b>' + I('heart') + 'favoris</span><span><b>214</b>' + I('lib') + 'au total</span></div>';
const RES = [['arcane', 'Arcane', '13 / 18 ép. · prochain S2 · É5', 72], ['onepiece', 'One Piece', '1 088 / 1 150 ép. · prochain É1089', 94], ['avatar', 'Avatar, le dernier maître de l’air', '34 / 61 ép. · prochain S2 · É15', 56], ['frieren', 'Frieren', 'Saison 2 annoncée · 0 / 10 ép.', 3]];
const resume = () => blk('reprise', 'Reprendre <a href="#">Tout voir</a>', '<div class="rl">' + RES.map(([p, t, m, pc], i) =>
  '<a class="rr' + (i ? '' : ' on') + '" href="#"><img src="' + IMG(p) + '" alt=""><span class="rt"><b>' + t + '</b><small>' + m + '</small><span class="bar"><i style="width:' + pc + '%"></i></span></span></a>').join('') + '</div>');
const card = (c) => '<article class="card"><div class="cp"><img src="' + IMG(c.p) + '" alt="Affiche de ' + c.t + '">' + rate(c.r) + (c.anime ? '<span class="ctag">Anime</span>' : '') +
  '<span class="cav' + (c.soon ? ' soon' : '') + '">' + I(c.soon ? 'cal' : 'okc') + (c.soon ? 'Sortie ' + c.soon : 'Disponible') + '</span></div>' +
  '<h3>' + c.t + '</h3><p class="cm">' + c.y + ' · ' + c.ty + (c.anime ? ' · Anime' : '') + '</p>' + st(c.st, c.n) +
  '<div class="ca"><button class="btn xs fav' + (c.fav ? ' on' : '') + '" aria-pressed="' + !!c.fav + '">' + I(c.fav ? 'heartf' : 'heart') + 'Favori</button><button class="btn xs wl' + (c.wl ? ' on' : '') + '" aria-pressed="' + !!c.wl + '">' + I('book') + 'Watchlist</button></div></article>';
const similar = (n) => '<section class="sim"><header class="ssh"><h2>Dans le même esprit</h2><p>Recommandations TMDB : ce ne sont pas des suites officielles.</p></header><div class="cards">' + SIM.slice(0, n || 5).map(card).join('') + '</div></section>';

/* ---------- agencements ---------- */
const L = {};
L.sidebar = (o) => '<aside class="navcol">' + brand() + nav('full') + navFoot() + '</aside>' +
  '<main class="mn"><div class="topbar">' + search() + '</div>' +
  '<section class="hero' + (o.bd ? ' bdh onimg' : '') + '">' + (o.bd ? '<img class="bd" src="' + IMG('fond') + '" alt="">' : '') + '<div class="hin">' + posterCol() + heroText(o) + '</div></section>' +
  '<div class="g2">' + diffusion() + progress(o) + '</div>' + seasons(o.grid ? 'grid' : 'rows') + similar(4) + '</main>' +
  '<aside class="side">' + stats() + resume() + '</aside>';
L.top = (o) => '<header class="tbar">' + brand() + nav('top') + search('compact') + themeBtn() + '</header>' +
  '<section class="hero' + (o.bd ? ' bdh onimg' : '') + '">' + (o.bd ? '<img class="bd" src="' + IMG('fond') + '" alt="">' : '') + '<div class="hin">' + posterCol() + heroText(o) + '</div></section>' +
  '<div class="cols"><main class="mn">' + diffusion() + seasons('rows') + similar(5) + '</main><aside class="side">' + progress(o) + stats() + resume() + '</aside></div>';
L.rail = (o) => '<aside class="rail"><span class="mark">CL</span>' + nav('rail') + '<div class="rfoot"><a class="nl" href="#">' + I('gear') + '<span class="nt">Réglages</span></a><a class="nl" href="#">' + I('moon') + '<span class="nt">Thème</span></a></div></aside>' +
  '<main class="mn"><div class="topbar"><p class="crumb">Bibliothèque' + I('chevr') + 'Séries' + I('chevr') + '<b>Arcane</b></p>' + search('compact') + '</div>' +
  '<section class="hero">' + posterCol() + heroText(o) + '</section>' + diffusion() + seasons('rows') + similar(4) + '</main>' +
  '<aside class="side">' + progress(o) + stats() + resume() + '</aside>';
L.dock = (o) => '<div class="amb" style="background-image:url(' + IMG('fond') + ')"></div>' +
  '<header class="tbar">' + brand() + search() + statsInline() + '</header>' +
  '<section class="hero bdh onimg"><img class="bd" src="' + IMG('fond') + '" alt=""><div class="hin">' + posterCol() + heroText(o) + '</div></section>' +
  '<div class="wrap"><div class="g3">' + progress(o) + diffusion() + stats() + '</div>' + seasons(o.grid ? 'grid' : 'cards') + resume() + similar(6) + '</div>' +
  '<nav class="dock" aria-label="Menu">' + nav('dock').replace(/^<nav[^>]*>|<\/nav>$/g, '') + '<span class="dsep"></span><a class="nl" href="#">' + I('gear') + '<span class="nt">Réglages</span></a></nav>';
L.bento = (o) => '<header class="tbar">' + brand() + nav('top') + search('compact') + themeBtn() + '</header>' +
  '<div class="bento">' +
  '<div class="tile t-post">' + posterCol() + '</div>' +
  '<div class="tile t-hero' + (o.bd ? ' bdh onimg' : '') + '">' + (o.bd ? '<img class="bd" src="' + IMG('fond') + '" alt="">' : '') + '<div class="hin">' + title(o) + facts() + meta() + genres() + actions() + '</div></div>' +
  '<div class="tile t-note"><p class="tl">Note TMDB</p>' + rate(8.8, 'huge') + '<p class="tsub">4 912 votes</p><p class="tl2">' + I('okc') + 'Disponible en France</p></div>' +
  '<div class="tile t-prog">' + progress(Object.assign({}, o, { ring: true })) + '</div>' +
  '<div class="tile t-diff">' + diffusion() + '</div>' +
  '<div class="tile t-syn"><h2 class="bh">Résumé</h2>' + synopsis() + offers() + '</div>' +
  '<div class="tile t-stats">' + stats() + '</div>' +
  '<div class="tile t-res">' + resume() + '</div>' +
  '<div class="tile t-seas">' + seasons('cards') + '</div>' +
  '<div class="tile t-sim">' + similar(6) + '</div></div>';
L.split = (o) => '<aside class="left onimg"><img class="bd" src="' + IMG('fond') + '" alt=""><div class="lin">' + brand() + '<div class="lbody">' + posterCol() + heroText(Object.assign({}, o, { noSynInHero: true })) + '</div>' + stats() + '</div></aside>' +
  '<main class="right"><header class="tbar">' + nav('top') + search('compact') + '</header>' +
  '<section class="lead"><h2 class="bh">Résumé</h2>' + synopsis() + '</section>' + progress(o) + diffusion() + seasons('rows') + resume() + similar(4) + '</main>';
function timeline() {
  const S = SETS[curSet()], op = S.seasons.find((x) => x.open), eps = op.eps.slice(0, CAP);
  let h = '<section class="seasons tline"><header class="ssh"><h2>Saisons et épisodes</h2><p>Chronologie de diffusion. Les boutons d’une saison s’appliquent à tous ses épisodes.</p></header><ol class="tl">';
  S.seasons.forEach((se) => { const ss = sState(se.eps);
    h += '<li class="tn-s t' + ss + '"><span class="dot">' + I(STI[ss]) + '</span><div class="tcard"><div class="sh"><h3>' + se.n + '</h3><span class="smeta">' + se.m + '</span>' + st(ss) + '<span class="sall">Toute la saison</span>' + seg(ss === 'p' ? '' : ss) + '</div></div></li>';
    if (se !== op) return;
    let last = '';
    eps.forEach((e, i) => { const day = e.d !== last ? '<span class="tdate">' + e.d.replace(/ \d{4}$/, '') + '</span>' : ''; last = e.d;
      h += '<li class="te te-' + e.s + '">' + day + '<span class="dot sm">' + (e.s === 'v' ? I('check') : e.s === 'next' ? I('arrow') : '') + '</span><div class="ep ep-' + e.s + '"><span class="no">É' + e.no + '</span><div class="et"><h4>' + e.t + '</h4><p class="em">' + (e.s === 'next' ? '<b class="nx">Prochain à voir</b>' : '') + '<span>40 min</span>' + (e.r ? rate(e.r, 'sm') : '') + '</p></div><div class="ec">' + seg(epState(e.s)) + (i ? '<button class="btn sm upto">Vu jusqu’ici</button>' : '') + '</div></div></li>'; });
  });
  return h + '</ol>' + capNote(op.eps) + '</section>';
}
L.timeline = (o) => '<header class="tbar">' + brand() + nav('top') + search('compact') + themeBtn() + '</header>' +
  '<section class="hero' + (o.bd ? ' bdh onimg' : '') + '">' + (o.bd ? '<img class="bd" src="' + IMG('fond') + '" alt="">' : '') + '<div class="hin">' + posterCol() + heroText(Object.assign({}, o, { noOffInHero: true })) + '</div></section>' +
  '<div class="cols"><main class="mn">' + timeline() + similar(4) + '</main><aside class="side">' + progress(o) + diffusion() + blk('offre', 'Où regarder', offers()) + stats() + resume() + '</aside></div>';
L.table = (o) => '<aside class="navcol">' + brand() + nav('full') + navFoot() + '</aside>' +
  '<main class="mn"><header class="tbar">' + search('compact') + statsInline() + '</header>' +
  '<section class="hd"><div class="pcol"><img class="post" src="' + IMG('arcane-l') + '" alt="Affiche d’Arcane">' + sagaLic() + '</div><div class="hdm"><div class="hdt"><h1 class="ttl">Arcane</h1>' + actions() + '</div>' +
  '<dl class="kv"><div><dt>Note TMDB</dt><dd>' + rate(8.8) + ' 4 912 votes</dd></div><div><dt>Mon statut</dt><dd>' + st('p', '13 / 18 ép.') + '</dd></div><div><dt>Disponibilité</dt><dd><span class="avail">' + I('okc') + 'Disponible</span></dd></div>' +
  '<div><dt>Type</dt><dd>Série · 2 saisons · 18 ép. · 40 min</dd></div><div><dt>Première diffusion</dt><dd>6 novembre 2021</dd></div><div><dt>Diffusion</dt><dd><span class="tagS">' + I('okc') + 'Terminée</span> dernier : S2 · É9, 23 nov. 2024</dd></div>' +
  '<div><dt>Prochain épisode</dt><dd>Aucun (série terminée)</dd></div><div><dt>Où regarder</dt><dd>' + offers() + '</dd></div><div><dt>Genres</dt><dd>Animation, Action & Aventure, Science-Fiction & Fantastique, Drame</dd></div>' +
  '<div class="full"><dt>Résumé</dt><dd>' + synopsis() + '</dd></div></dl></div></section>' +
  '<div class="g2">' + progress(o) + resume() + '</div>' + seasons('table') + similar(6) + '</main>';

/* ---------- les 16 propositions ---------- */
const D = [
  { id: '01', n: 'Ardoise carrée', L: 'sidebar', th: 'Sombre', style: 'Sombre sans arrondi', lay: 'Menu à gauche + panneau droit', font: 'Geist', o: { bd: 1, logo: 1, grid: 1 }, d: 'La structure de l’immersive v2, mais tout à angles droits, sans verre ni flou : des aplats sombres et des filets fins.' },
  { id: '02', n: 'Verre clair', L: 'dock', th: 'Clair', style: 'Verre clair façon visionOS', lay: 'Dock flottant en bas', font: 'Onest', o: { logo: 1, ring: 1, grid: 1 }, d: 'Panneaux de verre dépoli sur les couleurs floutées d’Arcane, menu en dock flottant en bas de l’écran.' },
  { id: '03', n: 'Néon Zaun', L: 'rail', th: 'Sombre', style: 'Néon', lay: 'Rail d’icônes', font: 'Unbounded + Manrope', o: { logo: 0, ring: 1 }, d: 'Fond violet-noir, accents rose et bleu néon, lueurs discrètes ; un rail d’icônes à gauche libère la largeur.' },
  { id: '04', n: 'Suisse moderne', L: 'top', th: 'Clair', style: 'Suisse moderne', lay: 'Barre en haut', font: 'Archivo', o: { logo: 0 }, d: 'Grille stricte, noir sur blanc, un seul rouge pour l’action, titre typographique géant à la place du logo.' },
  { id: '05', n: 'Material You', L: 'bento', th: 'Clair', style: 'Couleur dynamique façon Material You', lay: 'Mosaïque bento', font: 'Roboto Flex', o: { logo: 1, bd: 0 }, d: 'Palette tonale tirée de l’affiche (bleu de Piltover, rose de Jinx), tuiles de tailles variées.' },
  { id: '06', n: 'Magazine', L: 'split', th: 'Clair', style: 'Magazine moderne sans empattement', lay: 'Écran partagé', font: 'Bricolage Grotesque', o: { logo: 0 }, d: 'Grande image à gauche comme une couverture, colonne de lecture à droite avec une typographie très affirmée.' },
  { id: '07', n: 'Chronologie nuit', L: 'timeline', th: 'Sombre', style: 'Sombre chaud', lay: 'Chronologie', font: 'Sora', o: { bd: 1, logo: 1 }, d: 'Les épisodes sur une ligne du temps par date de diffusion : on voit d’un coup où on en est.' },
  { id: '08', n: 'Tableau dense', L: 'table', th: 'Sombre', style: 'Densité maximale, graphite', lay: 'Tableau', font: 'IBM Plex Sans + Mono', o: {}, d: 'Toutes les infos en fiche technique et en tableau, chiffres en chasse fixe, presque rien de décoratif.' },
  { id: '09', n: 'Immersive v3', L: 'sidebar', th: 'Sombre', style: 'Immersive (suite de la v2)', lay: 'Menu à gauche + panneau droit', font: 'DM Sans', o: { bd: 1, logo: 1, ring: 1 }, d: 'Ta préférée, poussée plus loin : arrondis à 8 px, verre plus discret, contrastes vérifiés, statuts avec icône.' },
  { id: '10', n: 'Carré clair', L: 'top', th: 'Clair', style: 'Clair sans arrondi', lay: 'Barre en haut', font: 'Schibsted Grotesk', o: { bd: 1, logo: 1 }, d: 'Bandeau photo pleine largeur puis page blanche à angles droits, séparations par filets.' },
  { id: '11', n: 'Cinéma', L: 'split', th: 'Sombre', style: 'Sombre cinéma', lay: 'Écran partagé', font: 'Hanken Grotesk', o: { logo: 1 }, d: 'Moitié gauche occupée par l’image du titre et l’affiche, moitié droite pour le suivi.' },
  { id: '12', n: 'Bento nuit', L: 'bento', th: 'Sombre', style: 'Sombre teinté', lay: 'Mosaïque bento', font: 'Instrument Sans', o: { bd: 1, logo: 1 }, d: 'Chaque info dans sa tuile, fond noir légèrement bleuté, tuiles teintées par la couleur du titre.' },
  { id: '13', n: 'Dock fumé', L: 'dock', th: 'Sombre', style: 'Verre fumé sombre', lay: 'Dock flottant en bas', font: 'Albert Sans', o: { logo: 1 }, d: 'Version sombre du dock : verre fumé, grande image, tout le menu à portée en bas.' },
  { id: '14', n: 'Rail Piltover', L: 'rail', th: 'Clair', style: 'Clair à rail coloré', lay: 'Rail d’icônes', font: 'Red Hat Display', o: { ring: 0 }, d: 'Page claire, rail d’icônes bleu profond, accent cuivre : la ville de Piltover plutôt que Zaun.' },
  { id: '15', n: 'Chronologie claire', L: 'timeline', th: 'Clair', style: 'Clair', lay: 'Chronologie', font: 'Familjen Grotesk', o: { bd: 0, logo: 0 }, d: 'La chronologie en clair, sans image de fond : sobre et très lisible en journée.' },
  { id: '16', n: 'Tableau clair', L: 'table', th: 'Clair', style: 'Densité maximale, clair', lay: 'Tableau', font: 'Public Sans', o: {}, d: 'Le tableau dense en clair, lignes alternées, pour voir le plus d’épisodes possible sans défiler.' }
];
window.CL_DESIGNS = D;
window.CL_SETS = { arcane: 'Arcane · 9 épisodes par saison', frieren: 'Frieren · 28 épisodes', long: 'Très longue · 1 150 épisodes' };
window.CL_render = (d) => '<div class="dz s' + d.id + ' L-' + d.L + '">' + L[d.L](d.o) + '</div>';
})();
