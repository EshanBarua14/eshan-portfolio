// Takes review screenshots of the built site. Needs Playwright and a local server:
//   python3 -m http.server 8765   (from the repo root)
//   node scripts/screenshots.js <out-dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || 'docs/screenshots';
  const b = await chromium.launch();
  const runs = [
    ['desktop-en', { width: 1440, height: 900 }, 'en', true],
    ['desktop-bn', { width: 1440, height: 900 }, 'bn', true],
    ['mobile-en', { width: 390, height: 844 }, 'en', true],
    ['mobile-bn', { width: 390, height: 844 }, 'bn', false],
  ];
  for (const [name, vp, lang, full] of runs) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
    const errs = [];
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await p.goto('http://localhost:8765/?lang=' + lang, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in')));
    await p.waitForTimeout(1500);
    const info = await p.evaluate(() => ({
      shader: document.getElementById('hero-canvas').classList.contains('on'),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      lang: document.documentElement.lang,
      h1: document.querySelector('h1').textContent,
    }));
    console.log(name, JSON.stringify(info), errs.join(' | '));
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: full });
    await p.close();
  }
  await b.close();
})();
