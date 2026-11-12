const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const EXT = path.resolve(__dirname, '../..');
const RATES = { EUR: 1, HUF: 400, USD: 1.1 }; for (let i = 0; i < 20; i++) RATES['X' + String.fromCharCode(65 + i) + 'X'] = 1;
const html = `<!doctype html><meta charset=utf-8><style>body > div { display: block; }</style>
<body style="font:20px sans-serif;padding:40px"><p><span id=p>12 990 Ft</span></p><p style="margin-top:200px">semmi</p></body>`;
(async () => {
  const server = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(html); }).listen(8766);
  const ctx = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  await sw.evaluate(async (rates) => chrome.storage.local.set({ rateData: { rates, date: 'x', source: 't', fetchedAt: Date.now() } }), RATES);
  const page = await ctx.newPage(); await page.goto('http://localhost:8766/'); await page.waitForTimeout(500);
  const state = () => page.evaluate(() => { const h = [...document.querySelectorAll('div[popover]')].find(d => d.shadowRoot); if (!h) return 'nincs host';
    return { popoverOpen: h.matches(':popover-open'), latszik: h.checkVisibility(), display: getComputedStyle(h).display }; });
  const b = await page.locator('#p').boundingBox();
  await page.mouse.move(b.x + 10, b.y + b.height / 2, { steps: 3 }); await page.waitForTimeout(250);
  console.log('rámutatva:', JSON.stringify(await state()));
  await page.mouse.move(b.x + 10, b.y + 250, { steps: 3 }); await page.waitForTimeout(250);
  console.log('elvitt egér:', JSON.stringify(await state()));
  await ctx.close(); server.close();
})();
