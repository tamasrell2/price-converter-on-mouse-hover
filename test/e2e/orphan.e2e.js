const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const EXT = process.argv[2] || path.resolve(__dirname, '../..');
// A bővítmény frissítése/újratöltése után a lapokon futó régi példánynak hiba nélkül le kell állnia,
// és el kell takarítania a buborékot (korábban: "Cannot read properties of undefined (reading 'disconnect')").
const html = `<!doctype html><meta charset=utf-8><body style="font:20px sans-serif;padding:40px"><p><span id=e>12,99 €</span></p><p style="margin-top:200px">x</p></body>`;
(async () => {
  const server = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(html); }).listen(8771);
  const ctx = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', locale: 'hu-HU', timezoneId: 'Europe/Budapest',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8771/'); await page.waitForTimeout(800);
  const b = await page.locator('#e').boundingBox();
  await page.mouse.move(b.x + 10, b.y + b.height / 2, { steps: 3 }); await page.waitForTimeout(300);
  // a bővítmény újratöltése (frissítéskor ez történik): a lapon futó példány "árva" lesz
  await sw.evaluate(() => chrome.runtime.reload()).catch(() => {});
  await page.waitForTimeout(1500);
  for (let i = 0; i < 5; i++) { await page.mouse.move(b.x + 10 + i * 30, b.y + b.height / 2 + i * 40, { steps: 3 }); await page.waitForTimeout(150); }
  await page.waitForTimeout(800);
  const hosts = await page.evaluate(() => document.querySelectorAll('div[data-hover-price-converter], div[popover]').length);
  const ok = errors.length === 0 && hosts === 0;
  console.log('hibák:', JSON.stringify(errors), '| ottmaradt buborék-elemek:', hosts);
  console.log(ok ? 'MINDEN RENDBEN' : 'HIBA');
  process.exitCode = ok ? 0 : 1;
  await ctx.close(); server.close();
})();
