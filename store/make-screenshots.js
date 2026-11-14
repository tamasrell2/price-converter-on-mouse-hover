// Chrome Web Store képek előállítása a bővítmény aktuális kódjából.
// Futtatás (a projekt gyökeréből vagy bárhonnan): node store/make-screenshots.js
// Kimenet: store/screenshots/*.png (1280×800) és store/screenshots/promo-small-440x280.png
//
// A homokozóban az árfolyam-API-k nem érhetők el, ezért rögzített (kb. valós) árfolyamtáblát
// töltünk a bővítmény tárolójába. Bármikor újrafuttatható, ha a bővítmény felülete változik.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const STORE = __dirname;
const EXT = path.resolve(STORE, '..');
const OUT = path.join(STORE, 'screenshots');
const PORT = 8790;

// Euró alapú árfolyamok (szemléltetéshez, nagyságrendileg valósak). A bővítmény legalább 20 valutát vár.
const RATES = {
  EUR: 1, USD: 1.08, GBP: 0.84, JPY: 162, CHF: 0.94, PLN: 4.3, HUF: 395, CZK: 25.1, SEK: 11.4, NOK: 11.6,
  DKK: 7.46, RON: 4.97, BGN: 1.96, CAD: 1.48, AUD: 1.65, NZD: 1.79, CNY: 7.8, INR: 90, BRL: 5.9, MXN: 19.8,
  TRY: 37, UAH: 44.5, KRW: 1480, SGD: 1.45, HKD: 8.4, ZAR: 19.6, ILS: 4.0, AED: 3.97,
};

const read = (f) => fs.readFileSync(path.join(STORE, f));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    const file = req.url === '/travel' ? 'demo-travel.html' : 'demo-shop.html';
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(read(file));
  }).listen(PORT);

  const ctx = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--lang=en-US'],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  await sw.evaluate(async (rates) => {
    await chrome.storage.local.set({
      rateData: { rates, date: new Date().toISOString().slice(0, 10), source: 'ExchangeRate-API', fetchedAt: Date.now() },
      lastError: null,
    });
    await chrome.storage.sync.set({ target: 'USD' });
  }, RATES);
  const extId = sw.url().split('/')[2];

  const page = await ctx.newPage();
  const tipText = () => page.evaluate(() => {
    const h = document.querySelector('div[data-hover-price-converter]') ||
      [...document.querySelectorAll('div[popover]')].find(d => d.shadowRoot?.querySelector('.tip'));
    return h && h.checkVisibility() ? h.shadowRoot.querySelector('.tip').textContent : null;
  });

  async function hoverShot(url, selector, file, xFrac = 0.4) {
    await page.goto(`http://localhost:${PORT}${url}`);
    await page.waitForTimeout(600);
    // A szöveg tényleges kiterjedése (egy blokkelem dobozánál keskenyebb lehet).
    const box = await page.evaluate((sel) => {
      const r = document.createRange();
      r.selectNodeContents(document.querySelector(sel));
      const b = r.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }, selector);
    await page.mouse.move(5, 795);
    await page.mouse.move(box.x + box.width * xFrac, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(350);
    const tip = await tipText();
    if (!tip) throw new Error(`Nem jelent meg a buborék: ${selector}`);
    await page.screenshot({ path: path.join(OUT, file) });
    console.log(`${file}: ${await page.locator(selector).innerText()} -> ${tip}`);
  }

  await hoverShot('/', '#mainPrice', '1-hover-eur-price-in-usd.png');
  await hoverShot('/', '#p1', '2-superscript-cents.png', 0.3);
  await hoverShot('/travel', '#jpy', '3-any-currency.png');

  // Beállítások ablak: külön lerenderelve, majd egy 1280×800-as vászonra helyezve.
  const pop = await ctx.newPage();
  // 1,4-szeres nagyítással rendereljük, hogy a vásznon éles legyen (ne felnagyított kép).
  const ZOOM = 1.4;
  const POPUP_W = 330; // a beállítások ablak szélessége (popup.css body width)
  await pop.setViewportSize({ width: Math.round(POPUP_W * ZOOM), height: 600 });
  await pop.goto(`chrome-extension://${extId}/popup/popup.html`);
  await pop.waitForTimeout(500);
  await pop.evaluate((z) => { document.documentElement.style.zoom = z; }, ZOOM);
  await pop.waitForTimeout(200);
  const bodyH = await pop.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
  const popupPng = await pop.screenshot({ clip: { x: 0, y: 0, width: Math.round(POPUP_W * ZOOM), height: bodyH } });
  await pop.close();
  const popupData = 'data:image/png;base64,' + popupPng.toString('base64');
  const iconData = 'data:image/png;base64,' + fs.readFileSync(path.join(EXT, 'icons', 'icon-128.png')).toString('base64');

  const canvas = await ctx.newPage();
  await canvas.setViewportSize({ width: 1280, height: 800 });
  await canvas.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; width: 1280px; height: 800px; display: flex; align-items: center; justify-content: center; gap: 90px;
      font-family: "Segoe UI", system-ui, sans-serif; background: linear-gradient(135deg, #eef3fb 0%, #dfe8f6 100%); color: #0f172a; }
    .text { width: 470px; } .text img { width: 72px; height: 72px; }
    h1 { font-size: 44px; line-height: 1.1; margin: 18px 0 14px; letter-spacing: -.02em; }
    p { font-size: 20px; line-height: 1.5; color: #475569; margin: 0 0 10px; }
    .shot { width: ${Math.round(POPUP_W * ZOOM)}px; border-radius: 16px; overflow: hidden; background: #fff;
      box-shadow: 0 30px 60px rgb(15 23 42 / .18), 0 0 0 1px rgb(15 23 42 / .06); }
    .shot img { display: block; width: ${Math.round(POPUP_W * ZOOM)}px; }
  </style></head><body>
    <div class="text"><img src="${iconData}" alt=""><h1>Your currency, your rules</h1>
      <p>Pick the currency you think in. It is preselected based on where you are.</p>
      <p>Prices already in your currency stay quiet, or convert them to a second one.</p></div>
    <div class="shot"><img src="${popupData}" alt=""></div>
  </body></html>`);
  await canvas.waitForTimeout(300);
  await canvas.screenshot({ path: path.join(OUT, '4-settings.png') });
  console.log('4-settings.png');

  // Kis promóciós csempe (440×280)
  await canvas.setViewportSize({ width: 440, height: 280 });
  await canvas.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; width: 440px; height: 280px; overflow: hidden; font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%); color: #fff; position: relative; }
    .brand { position: absolute; left: 28px; top: 26px; display: flex; align-items: center; gap: 12px; }
    .brand .ic { width: 48px; height: 48px; border-radius: 12px; background: #fff; overflow: hidden; flex: none;
      box-shadow: 0 4px 10px rgb(0 0 0 / .25); }
    .brand .ic img { display: block; width: 56px; height: 56px; margin: -4px; } /* az ikon átlátszó szegélyét levágjuk */
    .brand b { font-size: 21px; letter-spacing: -.01em; }
    .tag { position: absolute; left: 28px; top: 84px; font-size: 15px; opacity: .85; }
    .card { position: absolute; left: 24px; bottom: 24px; width: 230px; height: 70px; background: #fff; border-radius: 12px;
      box-shadow: 0 10px 24px rgb(0 0 0 / .25); }
    .price { position: absolute; left: 40px; bottom: 38px; font-size: 36px; font-weight: 750; letter-spacing: -.01em; color: #0f172a;
      background: rgb(250 204 21 / .45); border-radius: 4px; padding: 0 6px; }
    .tip { position: absolute; left: 66px; bottom: 108px; background: #0f172a; color: #f8fafc; font-weight: 650; font-size: 22px;
      padding: 9px 15px; border-radius: 10px; box-shadow: 0 10px 24px rgb(0 0 0 / .35); }
    .tip::after { content: ""; position: absolute; left: 50%; bottom: -7px; margin-left: -7px; border: 7px solid transparent;
      border-bottom: 0; border-top-color: #0f172a; }
    .chips { position: absolute; right: 26px; bottom: 30px; display: grid; gap: 8px; text-align: right; font-size: 14px; opacity: .9; }
  </style></head><body>
    <div class="brand"><span class="ic"><img src="${iconData}" alt=""></span><b>Super Simple Currency Converter</b></div>
    <div class="tag">Hover any price. See it in your currency.</div>
    <div class="tip">$269.89</div>
    <div class="card"></div>
    <div class="price">249,90 €</div>
    <div class="chips"><span>£ ¥ zł Ft CHF ₹ …</span><span>160+ currencies</span></div>
  </body></html>`);
  await canvas.waitForTimeout(300);
  await canvas.screenshot({ path: path.join(OUT, 'promo-small-440x280.png') });
  console.log('promo-small-440x280.png');

  await ctx.close();
  server.close();
})().catch((err) => { console.error(err); process.exit(1); });
