// Audit UI/UX du vrai site (règles du skill UI/UX Pro Max) avec le TMDB simulé des tests :
// contraste du texte mesuré sur les pixels réels du fond, cibles de 40 px (souris) / 44 px (tactile), 8 px entre cibles, texte de 12 px minimum.
// Usage : CHROME_PATH=… node maquettes/outils/audit-site.mjs
import { launch, openApp } from '../../tests/helpers/browser.mjs';

const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

async function audit(page, label, { minTarget }) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden], dialog:not([open]), .visually-hidden, .skip-link'); };
    const texts = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (el.closest('svg') || !vis(el)) return;
      const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (!tn) return;
      const range = document.createRange(); range.selectNodeContents(tn);
      const rr = range.getBoundingClientRect(); let L = rr.left, T = rr.top, R = rr.right, B = rr.bottom;
      for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.overflow !== 'visible' || c.overflowX !== 'visible') { const q = e.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } }
      if (R - L < 2 || B - T < 2 || B < 0 || T > innerHeight) return;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
      if (op < 0.05) return; // indication visible seulement au survol
      const cs = getComputedStyle(el);
      texts.push({ t: tn.textContent.trim().slice(0, 30), cls: String(el.className).slice(0, 30), x: L, y: T, w: R - L, h: B - T, color: cs.color, fs: parseFloat(cs.fontSize), fw: parseInt(cs.fontWeight, 10), op });
    });
    const targets = [];
    document.querySelectorAll('button, a[href], select, input:not([type="hidden"]), label.avail-toggle').forEach((el) => {
      if (!vis(el)) return;
      if (el.matches('.card-link, .skip-link') || el.closest('.detail-overview, .hint, p') || (el.tagName === 'INPUT' && el.closest('label'))) return; // lien couvrant la carte, liens dans une phrase (exception WCAG), case dans son libellé
      const r0 = el.getBoundingClientRect(), top = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2);
      if (top && !el.contains(top) && !top.contains(el)) return; // caché sous la barre de recherche fixe
      const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      targets.push({ t: (el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 26), x: r.left, y: r.top, w: r.width, h: r.height, tag: el.tagName });
    });
    const small = []; document.querySelectorAll('body *').forEach((el) => { if (el.closest('svg') || !vis(el)) return; if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12) small.push(String(el.className).slice(0, 24) + ' ' + getComputedStyle(el).fontSize); });
    return { texts, targets, small };
  });
  await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}svg,.icon{visibility:hidden!important}' });
  const buf = await page.screenshot();
  await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());
  const pts = []; for (const t of info.texts) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) pts.push([t.x + (t.w * (i + 0.5)) / 6, t.y + (t.h * (j + 0.5)) / 3]);
  const vals = await page.evaluate(async ([b64, pts]) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    return pts.map(([x, y]) => { x = Math.max(0, Math.min(c.width - 1, Math.round(x))); y = Math.max(0, Math.min(c.height - 1, Math.round(y))); const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; }); }, [buf.toString('base64'), pts]);
  let vi = 0; const fails = [];
  for (const t of info.texts) {
    const m = t.color.match(/[\d.]+/g).map(Number); const a = (m[3] ?? 1) * t.op; let worst = 99;
    for (let k = 0; k < 18; k++) { const bg = vals[vi++]; const fg = [0, 1, 2].map((q) => m[q] * a + bg[q] * (1 - a)); worst = Math.min(worst, ratio(fg, bg)); }
    const need = t.fs >= 24 || (t.fs >= 18.66 && t.fw >= 700) ? 3 : 4.5;
    if (worst < need) fails.push(worst.toFixed(2) + ' « ' + t.t + ' » .' + t.cls);
  }
  const tsmall = info.targets.filter((t) => (t.h < minTarget - 0.5 || t.w < minTarget - 0.5) && !(t.tag === 'INPUT' && t.h >= 24)).map((t) => '« ' + t.t + ' » ' + Math.round(t.w) + '×' + Math.round(t.h));
  const close = [];
  for (let i = 0; i < info.targets.length; i++) for (let j = i + 1; j < info.targets.length; j++) {
    const A = info.targets[i], B = info.targets[j];
    const dx = Math.max(0, Math.max(A.x, B.x) - Math.min(A.x + A.w, B.x + B.w)), dy = Math.max(0, Math.max(A.y, B.y) - Math.min(A.y + A.h, B.y + B.h));
    const inside = (A.x >= B.x - 1 && A.y >= B.y - 1 && A.x + A.w <= B.x + B.w + 1 && A.y + A.h <= B.y + B.h + 1) || (B.x >= A.x - 1 && B.y >= A.y - 1 && B.x + B.w <= A.x + A.w + 1 && B.y + B.h <= A.y + A.h + 1);
    if (!inside && Math.max(dx, dy) < 7.5 && Math.min(A.h, B.h, A.w, B.w) < 44) close.push('« ' + A.t + ' » / « ' + B.t + ' » ' + Math.round(Math.max(dx, dy)) + ' px');
  }
  const u = (a) => [...new Set(a)];
  console.log('\n=== ' + label + ' : ' + info.texts.length + ' textes, ' + info.targets.length + ' cibles | contraste < seuil : ' + u(fails).length + ' | cibles < ' + minTarget + ' px : ' + u(tsmall).length + ' | écart < 8 px : ' + u(close).length + ' | texte < 12 px : ' + u(info.small).length);
  for (const [k, list] of [['C', fails], ['T', tsmall], ['E', close], ['P', info.small]]) u(list).slice(0, 12).forEach((x) => console.log('  ' + k + ' ' + x));
  return u(fails).length + u(tsmall).length + u(close).length + u(info.small).length;
}

const browser = await launch();
let total = 0;
const pages = [['Accueil', '#home', '.card'], ['Fiche série', '#detail/tv/201', '#season-1 .ep'], ['Fiche film', '#detail/movie/101', '.detail-hero'], ['Bibliothèque', '#library', 'h1'], ['Statistiques', '#stats', 'h1'], ['Réglages', '#settings', 'h1']];
for (const theme of ['dark', 'light']) {
  for (const [name, hash, wait] of pages) {
    const storage = theme === 'light' ? { 'crazy-liste-v1': JSON.stringify({ schemaVersion: 1, tracking: {}, metadata: {}, preferences: { theme: 'light' } }) } : null;
    const { page, context } = await openApp(browser, { hash, storage });
    await page.waitForSelector(wait);
    for (let y = 0; y < 3; y++) { total += await audit(page, name + ' · ' + theme + ' · écran ' + (y + 1), { minTarget: 40 }); const more = await page.evaluate(() => { const before = scrollY; scrollBy({ top: innerHeight * 0.9, behavior: 'instant' }); return scrollY !== before; }); if (!more) break; }
    if (hash === '#detail/tv/201') {
      await page.locator('[data-action="episode-menu"][data-season="1"][data-episode="2"]').click();
      total += await audit(page, name + ' · ' + theme + ' · menu de statut ouvert', { minTarget: 40 });
      await page.keyboard.press('Escape');
      await page.locator('[data-action="episode-expand"][data-season="1"][data-episode="1"]').click();
      total += await audit(page, name + ' · ' + theme + ' · épisode déplié', { minTarget: 40 });
    }
    await context.close();
  }
}
for (const [name, hash, wait] of [['Téléphone accueil', '#home', '.card'], ['Téléphone fiche', '#detail/tv/201', '#season-1 .ep']]) {
  const { page, context } = await openApp(browser, { hash, viewport: { width: 390, height: 844 }, touch: true });
  await page.waitForSelector(wait);
  total += await audit(page, name, { minTarget: 44 });
  await context.close();
}
await browser.close();
console.log('\nTOTAL : ' + total);
