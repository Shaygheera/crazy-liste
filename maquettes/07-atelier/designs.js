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
const epState = (s) => (s === 'v' ? 'v' : 't');
const epItem = (e, i) => {
  const [t, d, r, s] = e;
  return '<div class="ep ep-' + s + '"><span class="no">' + (s === 'v' ? I('check') : 'É' + (i + 1)) + '</span><div class="et"><h4>' + (s === 'v' ? '<span class="sr">É' + (i + 1) + ' </span>' : '') + t + '</h4><p class="em">' + (s === 'next' ? '<b class="nx">' + I('arrow') + 'Prochain</b>' : '') + '<span>' + d + '</span><span>40 min</span>' + rate(r, 'sm') + '</p></div>' +
    '<div class="ec">' + seg(epState(s)) + (i ? '<button class="btn sm upto">Vu jusqu’ici</button>' : '') + '</div></div>';
};
const seasonRow = (name, m, s, on, pc, body) => '<div class="season' + (body ? ' open' : '') + '"><div class="sh"><button class="sx" aria-label="Déplier">' + I(body ? 'chevu' : 'chev') + '</button><h3>' + name + '</h3><span class="smeta">' + m + '</span>' + st(s) + '<span class="sall">Toute la saison</span>' + seg(on) + '</div><div class="sbar"><i class="sb-' + s + '" style="width:' + pc + '%"></i></div>' + (body || '') + '</div>';
function episodes(v) {
  if (v === 'table') {
    return '<div class="tw"><table class="etab"><thead><tr><th>N°</th><th>Titre</th><th>Diffusion</th><th>Durée</th><th>Note</th><th>Mon statut</th><th></th></tr></thead><tbody>' +
      EP.map(([t, d, r, s], i) => '<tr class="tr-' + s + '"><td class="tn">É' + (i + 1) + '</td><td class="tt">' + (s === 'next' ? '<b class="nx">' + I('arrow') + 'Prochain</b>' : '') + t + '</td><td>' + d + '</td><td>40 min</td><td>' + rate(r, 'sm') + '</td><td>' + seg(epState(s)) + '</td><td>' + (i ? '<button class="btn sm upto">Vu jusqu’ici</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
  }
  return '<div class="eps eps-' + v + '">' + EP.map(epItem).join('') + '</div>';
}
const seasons = (v) => '<section class="seasons"><header class="ssh"><h2>Saisons et épisodes</h2><p>Les boutons d’une saison s’appliquent à tous ses épisodes ; ceux d’un épisode ne modifient que lui.</p></header>' +
  seasonRow('Saison 1', '2021 · 9 épisodes', 'v', 'v', 100) +
  seasonRow('Saison 2', '2024 · 9 épisodes', 'p', '', 44, episodes(v)) +
  seasonRow('Épisodes spéciaux', '2 épisodes · hors progression', 't', 't', 0) + '</section>';
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
  '<div class="g2">' + diffusion() + progress(o) + '</div>' + seasons('rows') + similar(4) + '</main>' +
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
  '<div class="wrap"><div class="g3">' + progress(o) + diffusion() + stats() + '</div>' + seasons('cards') + resume() + similar(6) + '</div>' +
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
  let h = '<section class="seasons tline"><header class="ssh"><h2>Saisons et épisodes</h2><p>Chronologie de diffusion. Les boutons d’une saison s’appliquent à tous ses épisodes.</p></header><ol class="tl">';
  h += '<li class="tn-s tv"><span class="dot">' + I('seen') + '</span><div class="tcard"><div class="sh"><h3>Saison 1</h3><span class="smeta">6 – 20 novembre 2021 · 9 épisodes</span>' + st('v') + '<span class="sall">Toute la saison</span>' + seg('v') + '</div></div></li>';
  h += '<li class="tn-s tp"><span class="dot">' + I('prog') + '</span><div class="tcard"><div class="sh"><h3>Saison 2</h3><span class="smeta">9 – 23 novembre 2024 · 9 épisodes</span>' + st('p') + '<span class="sall">Toute la saison</span>' + seg('') + '</div></div></li>';
  let last = '';
  EP.forEach(([t, d, r, s], i) => {
    const day = d !== last ? '<span class="tdate">' + d.replace(' 2024', '') + '</span>' : '';
    last = d;
    h += '<li class="te te-' + s + '">' + day + '<span class="dot sm">' + (s === 'v' ? I('check') : s === 'next' ? I('arrow') : '') + '</span><div class="ep ep-' + s + '"><span class="no">É' + (i + 1) + '</span><div class="et"><h4>' + t + '</h4><p class="em">' + (s === 'next' ? '<b class="nx">Prochain à voir</b>' : '') + '<span>40 min</span>' + rate(r, 'sm') + '</p></div><div class="ec">' + seg(epState(s)) + (i ? '<button class="btn sm upto">Vu jusqu’ici</button>' : '') + '</div></div></li>';
  });
  h += '<li class="tn-s tt"><span class="dot">' + I('todo') + '</span><div class="tcard"><div class="sh"><h3>Épisodes spéciaux</h3><span class="smeta">2 épisodes · hors progression</span>' + st('t') + '<span class="sall">Toute la saison</span>' + seg('t') + '</div></div></li>';
  return h + '</ol></section>';
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
  { id: '01', n: 'Ardoise carrée', L: 'sidebar', th: 'Sombre', style: 'Sombre sans arrondi', lay: 'Menu à gauche + panneau droit', font: 'Geist', o: { bd: 1, logo: 1 }, d: 'La structure de l’immersive v2, mais tout à angles droits, sans verre ni flou : des aplats sombres et des filets fins.' },
  { id: '02', n: 'Verre clair', L: 'dock', th: 'Clair', style: 'Verre clair façon visionOS', lay: 'Dock flottant en bas', font: 'Onest', o: { logo: 1, ring: 1 }, d: 'Panneaux de verre dépoli sur les couleurs floutées d’Arcane, menu en dock flottant en bas de l’écran.' },
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
window.CL_render = (d) => '<div class="dz s' + d.id + ' L-' + d.L + '">' + L[d.L](d.o) + '</div>';
})();
