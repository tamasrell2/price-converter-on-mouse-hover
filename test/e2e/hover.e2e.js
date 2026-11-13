const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');
const EXT = path.resolve(__dirname, '../..');
const OUT = require('os').tmpdir(); // képernyőképek ide kerülnek
const RATES = { EUR: 1, HUF: 400, USD: 1.1, GBP: 0.85, PLN: 4.3, JPY: 165, CHF: 0.95, CZK: 25, SEK: 11.5 };
for (let i = 0; i < 20; i++) RATES['X' + String.fromCharCode(65 + i) + 'X'] = 1; // töltelék, hogy elég sok valuta legyen

(async () => {
  const server = http.createServer((req, res) => { res.setHeader('content-type','text/html; charset=utf-8'); res.end(req.url==='/frame' ? '<!doctype html><meta charset=utf-8><body style="margin:8px;font:16px sans-serif"><span id=f1>50 €</span></body>' : fs.readFileSync(path.join(__dirname,'page.html'))); }).listen(8765);
  const ctx = await chromium.launchPersistentContext('', {
    headless: true, channel: 'chromium',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--lang=hu'],
    locale: 'hu-HU', timezoneId: 'Europe/Budapest',
    viewport: { width: 1000, height: 1000 },
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  // A telepítéskor induló valódi árfolyam-letöltést megvárjuk, különben felülírná a teszt ál-árfolyamát.
  await sw.evaluate(async () => {
    for (let i = 0; i < 60; i++) {
      const s = await chrome.storage.local.get(['rateData', 'lastError']);
      if (s.rateData || s.lastError) return;
      await new Promise(r => setTimeout(r, 250));
    }
  });
  await sw.evaluate(async (rates) => {
    await chrome.storage.local.set({ rateData: { rates, date: '2026-11-11', source: 'teszt', fetchedAt: Date.now() }, lastError: null });
    await chrome.storage.sync.set({ fallback: 'EUR' }); // a régi tesztek a forint -> euró viselkedést várják
  }, RATES);

  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
  await page.goto('http://localhost:8765/');
  await page.waitForTimeout(500);

  const tip = () => page.evaluate(() => {
    const h = [...document.querySelectorAll('div[popover]')].find(d => d.shadowRoot);
    if (!h || !h.checkVisibility()) return null;
    return h.shadowRoot.querySelector('.tip').textContent;
  });
  async function hover(sel, frac = 0.5) {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    const box = await page.locator(sel).boundingBox();
    await page.mouse.move(5, 990); await page.waitForTimeout(50);
    await page.mouse.move(box.x + box.width * frac, box.y + box.height / 2, { steps: 3 });
    await page.waitForTimeout(150);
    return await tip();
  }
  const F = (n, c) => new Intl.NumberFormat('hu-HU', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol', ...(c === 'HUF' || n >= 10000 ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) }).format(n);
  const conv = (n, from, to) => F(n / RATES[from] * RATES[to], to);
  let fail = 0;
  async function check(sel, want, frac) {
    const got = await hover(sel, frac);
    const ok = got === want; if (!ok) fail++;
    console.log(ok ? 'OK  ' : 'FAIL', sel.padEnd(6), JSON.stringify(got), ok ? '' : 'várt: ' + want);
  }

  console.log('--- célvaluta: forint (alapértelmezett)');
  const base = [
    ['#t1', 12.99, 'EUR'], ['#t2', 24.99, 'EUR'], ['#t3', 149.95, 'EUR'], ['#t4', 39.90, 'EUR'], ['#t5', 1234.56, 'EUR'],
    ['#t6', 1299, 'EUR'], ['#t7 b', 4990, 'HUF'], ['#t8', 12990, 'HUF'], ['#t9', 1299, 'EUR'], ['#t10b', 999.9, 'EUR'],
    ['#t11', 25000, 'HUF'], ['#t13', 3500, 'HUF'],
    ['#u1', 1299.99, 'USD'], ['#u2', 49.95, 'GBP'], ['#u3', 129.99, 'PLN'], ['#u4', 12800, 'JPY'], ['#u5', 49.9, 'CHF'], ['#u6', 20, 'USD'], ['#u7', 19.99, 'USD'],
  ];
  for (const [sel, n, cur] of base) await check(sel, conv(n, cur, cur === 'HUF' ? 'EUR' : 'HUF'));
  await check('#t12', conv(19, 'EUR', 'HUF'), 0.8);
  for (const f of [0.1, 0.4, 0.8]) { const t = await hover('#neg', f); if (t) { fail++; console.log('FAIL nem-ár szövegre buborék:', t); } }


  console.log('--- ingatlan.com és Amazon jellegű kártyák (célvaluta: forint)');
  await check('#ingp', conv(52.9e6, 'HUF', 'EUR'));
  await check('#ingm', conv(1102083, 'HUF', 'EUR'), 0.3);
  await check('#ingp2', conv(47.5e6, 'HUF', 'EUR'));
  await check('#amzp', conv(129.99, 'USD', 'HUF'));
  await check('#amzlist', conv(159.99, 'USD', 'HUF'));
  {
    const say = (ok, msg) => { if (!ok) fail++; console.log(ok ? 'OK  ' : 'FAIL', msg); };
    for (const [from, to, frac] of [['#ingm', '#ingimg', 0.5], ['#ingp', '#ingimg', 0.2], ['#ingp2', '#ingimg', 0.5], ['#amzp', '#amzimg', 0.5], ['#amzp', '#amzcount', 0.5], ['#amzp', '#amzstars', 0.5], ['#ingm', '#ing', 0.9]]) {
      await hover(from, 0.3);
      const t1 = await tip();
      const box = await page.locator(to).boundingBox();
      if (box.y < 0 || box.y + box.height > 1000) { fail++; console.log('FAIL teszthiba: célpont képernyőn kívül', to); continue; }
      await page.mouse.move(box.x + box.width * frac, box.y + box.height / 2, { steps: 4 }); await page.waitForTimeout(150);
      const t2 = await tip();
      say(t1 && !t2, `${from} -> ${to}: előtte ${JSON.stringify(t1)}, utána ${JSON.stringify(t2)}`);
    }
    for (const sel of ['#ingimg', '#amzimg', '#amzcount', '#amzstars']) {
      const t = await hover(sel); say(!t, `${sel} fölött nincs buborék (${JSON.stringify(t)})`);
    }
  }
  await page.evaluate(() => document.getElementById('ing').scrollIntoView({ block: 'center' }));
  await hover('#ingm', 0.3);
  const ib = await page.locator('#ing').boundingBox();
  await page.screenshot({ path: path.join(OUT, 'shot-ing.png'), clip: { x: 0, y: ib.y - 50, width: 520, height: 160 } });

  console.log('--- célvalutát átállítjuk dollárra');
  await sw.evaluate(() => chrome.storage.sync.set({ target: 'USD' }));
  await page.waitForTimeout(200);
  await check('#t1', conv(12.99, 'EUR', 'USD'));
  await check('#t7 b', conv(4990, 'HUF', 'USD'));
  await check('#u2', conv(49.95, 'GBP', 'USD'));
  await check('#u1', conv(1299.99, 'USD', 'EUR')); // már dollárban van -> másodlagos (euró)
  await page.screenshot({ path: path.join(OUT, 'shot-usd.png'), clip: { x: 0, y: 0, width: 500, height: 130 } });

  console.log('--- régi "kikapcsolva" beállítás (a kapcsoló megszűnt)');
  await sw.evaluate(() => chrome.storage.sync.set({ enabled: false, target: 'HUF' }));
  await page.waitForTimeout(200);
  { const t = await hover('#t1'); console.log(t ? 'OK   a régi beállítás nem kapcsolja ki' : (fail++, 'FAIL a régi beállítás kikapcsolta')); }
  await sw.evaluate(() => chrome.storage.sync.remove('enabled'));
  await page.waitForTimeout(200);

  await page.evaluate(() => document.getElementById('u7').scrollIntoView({ block: 'center' }));
  await hover('#u7');
  const ub = await page.locator('#u7').boundingBox();
  await page.screenshot({ path: path.join(OUT, 'shot-multi.png'), clip: { x: 0, y: ub.y - 60, width: 700, height: 110 } });
  await page.evaluate(() => window.scrollTo(0, 0));
  await hover('#t2');
  await page.screenshot({ path: path.join(OUT, 'shot-t2.png'), clip: { x: 0, y: 0, width: 500, height: 200 } });


  console.log('--- eltüntetés');
  const say = (ok, msg) => { if (!ok) fail++; console.log(ok ? 'OK  ' : 'FAIL', msg); };
  // 1) megjelenik, majd kattintás mellé -> eltűnik
  await hover('#t1');
  const b = await page.locator('#t1').boundingBox();
  await page.mouse.click(b.x + b.width + 200, b.y + b.height / 2); await page.waitForTimeout(150);
  say(await tip() === null, 'kattintás mellé: eltűnt');
  // 2) kattintás az áron (ami közben módosítja az oldalt) -> eltűnik és nem jön vissza, amíg rajta marad az egér
  await hover('#clickme');
  say(await tip() !== null, 'kattintható ár: megjelent');
  const cb = await page.locator('#clickme').boundingBox();
  await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2); await page.waitForTimeout(100);
  await page.mouse.move(cb.x + cb.width / 2 + 2, cb.y + cb.height / 2); await page.waitForTimeout(150);
  say(await tip() === null, 'kattintás az áron: eltűnt és ott is maradt (oldal közben változott: ' + await page.locator('#log').textContent() + ')');
  // 3) elvisszük, majd vissza -> újra megjelenik
  const again = await hover('#clickme');
  say(again !== null, 'elvitt és visszahozott egér: újra megjelent');
  // 4) Escape
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  say(await tip() === null, 'Escape: eltűnt');
  // 5) iframe-ben lévő ár, majd az egér kimegy a keretből
  const frame = page.frameLocator('#frm');
  const fb = await frame.locator('#f1').boundingBox();
  await page.mouse.move(5, 990); await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2, { steps: 3 }); await page.waitForTimeout(200);
  const fTip = await page.frames().find(f => f.url().endsWith('/frame')).evaluate(() => {
    const h = [...document.querySelectorAll('div[popover]')].find(d => d.shadowRoot);
    return h && h.matches(':popover-open') ? h.shadowRoot.querySelector('.tip').textContent : null; });
  say(fTip !== null, 'iframe-ben lévő ár: megjelent (' + fTip + ')');
  await page.mouse.move(fb.x + fb.width / 2, fb.y + 120, { steps: 2 }); await page.waitForTimeout(200);
  const fTip2 = await page.frames().find(f => f.url().endsWith('/frame')).evaluate(() => {
    const h = [...document.querySelectorAll('div[popover]')].find(d => d.shadowRoot);
    return h && h.matches(':popover-open'); });
  say(!fTip2, 'egér kiment az iframe-ből: eltűnt');


  {
    const say = (ok, msg) => { if (!ok) fail++; console.log(ok ? 'OK  ' : 'FAIL', msg); };
    console.log('--- mozgó tartalom és mozdulatlanság');
    const t1 = await hover('#carp');
    await page.evaluate(() => { document.getElementById('car').style.left = '300px'; });
    await page.waitForTimeout(500);
    say(t1 && !(await tip()), `karusel elvitte az árat az álló egér alól: előtte ${JSON.stringify(t1)}, utána ${JSON.stringify(await tip())}`);
    await page.evaluate(() => { document.getElementById('car').style.left = '0px'; });
    const t2 = await hover('#t1');
    await page.waitForTimeout(3000); const t3 = await tip();
    await page.waitForTimeout(3500); const t4 = await tip();
    say(t2 && t3 && !t4, `mozdulatlan egér: 3 mp után még látszik (${JSON.stringify(t3)}), 6,5 mp után eltűnt (${JSON.stringify(t4)})`);
  }


  {
    const say = (ok, msg) => { if (!ok) fail++; console.log(ok ? 'OK  ' : 'FAIL', msg); };
    console.log('--- "Ne mutasson semmit"');
    await sw.evaluate(() => chrome.storage.sync.set({ fallback: 'none' })); await page.waitForTimeout(200);
    const a = await hover('#t7 b'), b = await hover('#t1');
    say(a === null && b !== null, `forint ár (célvaluta forint): ${JSON.stringify(a)}, euró ár: ${JSON.stringify(b)}`);
    await sw.evaluate(() => chrome.storage.sync.set({ fallback: 'EUR' })); await page.waitForTimeout(200);
  }

  const extId = sw.url().split('/')[2];
  const pop = await ctx.newPage(); await pop.setViewportSize({ width: 300, height: 330 });
  await pop.goto(`chrome-extension://${extId}/popup/popup.html`); await pop.waitForTimeout(400);
  console.log('popup cél:', await pop.locator('#target').inputValue(), '| másodlagos:', await pop.locator('#fallback').inputValue(), '| opciók:', await pop.locator('#target option').count());
  await pop.selectOption('#target', 'GBP'); await pop.waitForTimeout(100);
  console.log('popupból mentett cél:', await sw.evaluate(async () => (await chrome.storage.sync.get('target')).target));
  await pop.selectOption('#target', 'HUF');
  await pop.screenshot({ path: path.join(OUT, 'shot-popup.png') });

  console.log('oldalhibák:', pageErrors);
  console.log(fail ? `${fail} HIBA` : 'MINDEN RENDBEN');
  await ctx.close(); server.close();
})();
