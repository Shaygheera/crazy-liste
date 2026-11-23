// Audit des 16 propositions : contraste mesuré sur les pixels réels du fond, taille des cibles, écart entre cibles, taille du texte.
const { chromium } = require('playwright');
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
(async () => {
  const ids = (process.argv[3] || '01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16').split(',');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  if (process.env.SET) await p.addInitScript((v) => { try { localStorage.setItem('cl-epset', v); } catch (e) {} }, process.env.SET);
  await p.goto('file://' + process.argv[2] + '#galerie', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  let total = 0;
  for (const id of ids) {
    await p.evaluate((h) => { location.hash = h; }, 'p-' + id); await p.waitForTimeout(300);
    await p.evaluate(() => { const st = document.querySelector('.stagewrap .stage'); st.style.setProperty('zoom', '1', 'important'); });
    await p.waitForTimeout(300);
    const info = await p.evaluate(() => {
      const dz = document.querySelector('.stagewrap .dz'); const o = dz.getBoundingClientRect();
      const texts = [];
      dz.querySelectorAll('*').forEach((el) => {
        if (el.closest('svg')) return;
        const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
        if (!own) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const range = document.createRange(); const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); range.selectNodeContents(tn);
        const rr = range.getBoundingClientRect(); let L = rr.left, T = rr.top, R = rr.right, B = rr.bottom;
        for (let e = el; e && e !== dz; e = e.parentElement) { const c = getComputedStyle(e); if (c.overflow !== 'visible' || c.overflowX !== 'visible') { const q = e.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } }
        const r = { left: L, top: T, width: R - L, height: B - T }; if (r.width < 2 || r.height < 2) return;
        let op = 1; for (let e = el; e && e !== dz; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
        texts.push({ t: own.slice(0, 28), cls: el.className + '', x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height, color: cs.color, fs: parseFloat(cs.fontSize), fw: parseInt(cs.fontWeight), op });
      });
      const targets = [];
      dz.querySelectorAll('button, a').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width) targets.push({ t: (el.textContent.trim() || el.getAttribute('aria-label') || el.className).slice(0, 24), x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }); });
      const small = []; dz.querySelectorAll('*').forEach((el) => { if (el.closest('svg')) return; const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (own && parseFloat(getComputedStyle(el).fontSize) < 12) small.push((el.className + '').slice(0, 20) + ' ' + getComputedStyle(el).fontSize); });
      return { texts, targets, small, W: o.width, H: o.height };
    });
    await p.addStyleTag({ content: '.stagewrap .dz *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}.stagewrap .dz .i{visibility:hidden}', });
    const buf = await p.locator('.stagewrap .dz').screenshot(); if (process.env.DUMP) require('fs').writeFileSync('shots/hidden-' + id + '.png', buf);
    await p.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('-webkit-text-fill-color:transparent')) s.remove(); }));
    const pts = [];
    for (const t of info.texts) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) pts.push([t.x + (t.w * (i + 0.5)) / 6, t.y + (t.h * (j + 0.5)) / 3]);
    const vals = await p.evaluate(async ([b64, pts]) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
      return pts.map(([x, y]) => { x = Math.max(0, Math.min(c.width - 1, Math.round(x))); y = Math.max(0, Math.min(c.height - 1, Math.round(y))); const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; }); }, [buf.toString('base64'), pts]);
    let vi = 0; const px = () => vals[vi++];
    const fails = [];
    for (const t of info.texts) {
      const m = t.color.match(/[\d.]+/g).map(Number); const a = (m[3] ?? 1) * t.op;
      const samples = [];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) samples.push(px(t.x + (t.w * (i + 0.5)) / 6, t.y + (t.h * (j + 0.5)) / 3));
      let worst = 99;
      for (const bg of samples) { const fg = [0, 1, 2].map((k) => m[k] * a + bg[k] * (1 - a)); worst = Math.min(worst, cr(fg, bg)); }
      const large = t.fs >= 24 || (t.fs >= 18.66 && t.fw >= 700);
      const need = large ? 3 : 4.5;
      if (worst < need) fails.push(worst.toFixed(2) + ' < ' + need + ' « ' + t.t + ' » .' + t.cls.split(' ')[0] + ' ' + t.color);
    }
    const tsmall = info.targets.filter((t) => t.h < 43.5 || t.w < 43.5).map((t) => '« ' + t.t + ' » ' + Math.round(t.w) + '×' + Math.round(t.h));
    const close = [];
    for (let i = 0; i < info.targets.length; i++) for (let j = i + 1; j < info.targets.length; j++) {
      const A = info.targets[i], B = info.targets[j];
      const dx = Math.max(0, Math.max(A.x, B.x) - Math.min(A.x + A.w, B.x + B.w)), dy = Math.max(0, Math.max(A.y, B.y) - Math.min(A.y + A.h, B.y + B.h));
      const inside = (A.x >= B.x && A.y >= B.y && A.x + A.w <= B.x + B.w && A.y + A.h <= B.y + B.h) || (B.x >= A.x && B.y >= A.y && B.x + B.w <= A.x + A.w && B.y + B.h <= A.y + A.h);
      if (!inside && Math.max(dx, dy) < 7.5) close.push('« ' + A.t + ' » / « ' + B.t + ' » ' + Math.round(Math.max(dx, dy)) + ' px');
    }
    total += fails.length + tsmall.length + close.length + info.small.length;
    console.log('\n=== ' + id + ' : ' + info.texts.length + ' textes, ' + info.targets.length + ' cibles | contraste KO ' + fails.length + ' | cibles < 44 : ' + tsmall.length + ' | écart < 8 : ' + close.length + ' | texte < 12 px : ' + info.small.length);
    const uniq = (a) => [...new Set(a)];
    uniq(fails).slice(0, 14).forEach((f) => console.log('  C ' + f));
    uniq(tsmall).slice(0, 6).forEach((f) => console.log('  T ' + f));
    uniq(close).slice(0, 6).forEach((f) => console.log('  E ' + f));
    uniq(info.small).slice(0, 4).forEach((f) => console.log('  P ' + f));
  }
  console.log('\nTOTAL problèmes : ' + total);
  await b.close();
})();
