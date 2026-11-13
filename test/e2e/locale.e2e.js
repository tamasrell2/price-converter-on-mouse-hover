const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const EXT = path.resolve(__dirname, '../..');
const OUT = require('os').tmpdir(); // képernyőképek ide kerülnek
const RATES = { EUR: 1, HUF: 400, USD: 1.1, GBP: 0.85 }; for (let i = 0; i < 20; i++) RATES['X' + String.fromCharCode(65 + i) + 'X'] = 1;
const html = `<!doctype html><meta charset=utf-8><body style="font:20px sans-serif;padding:40px"><p><span id=e>12,99 €</span> · <span id=h>4 990 Ft</span> · <span id=u>$20</span></p></body>`;
async function scenario(name, lang, locale, timezoneId) {
  const ctx = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', locale, timezoneId,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${lang}`], viewport: { width: 800, height: 400 } });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  // A telepítéskor induló valódi árfolyam-letöltést megvárjuk, különben felülírná a teszt ál-árfolyamát.
  await sw.evaluate(async () => {
    for (let i = 0; i < 60; i++) {
      const s = await chrome.storage.local.get(['rateData', 'lastError']);
      if (s.rateData || s.lastError) return;
      await new Promise(r => setTimeout(r, 250));
    }
  });
  await sw.evaluate(async (rates) => chrome.storage.local.set({ rateData: { rates, date: 'x', source: 'test', fetchedAt: Date.now() }, lastError: null }), RATES);
  const page = await ctx.newPage(); await page.goto('http://localhost:8767/'); await page.waitForTimeout(500);
  const tip = () => page.evaluate(() => { const h = document.querySelector('div[data-hover-price-converter]'); return h && h.checkVisibility() ? h.shadowRoot.querySelector('.tip').textContent : null; });
  const res = [];
  for (const id of ['e', 'h', 'u']) {
    const b = await page.locator('#' + id).boundingBox();
    await page.mouse.move(5, 390); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 3 }); await page.waitForTimeout(200);
    res.push(`${await page.locator('#' + id).textContent()} -> ${await tip()}`);
  }
  const extId = sw.url().split('/')[2];
  const pop = await ctx.newPage(); await pop.setViewportSize({ width: 300, height: 330 });
  await pop.goto(`chrome-extension://${extId}/popup/popup.html`); await pop.waitForTimeout(400);
  const target = await pop.locator('#target').inputValue(), fallback = await pop.locator('#fallback').inputValue();
  const label = await pop.locator('[data-i18n="targetLabel"]').textContent();
  const noneText = await pop.locator('#fallback option[value="none"]').textContent();
  const dir = await pop.evaluate(() => document.documentElement.dir);
  await pop.screenshot({ path: path.join(OUT, `popup-${name}.png`) });
  console.log(`[${name}] cél: ${target}, másodlagos: ${fallback} ("${noneText}"), irány: ${dir} | felirat: "${label}" | ${res.join(' | ')}`);
  await ctx.close();
  return { target, fallback, label, dir, res };
}
(async () => {
  const server = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(html); }).listen(8767);
  const a = await scenario('hu', 'hu', 'hu-HU', 'Europe/Budapest');
  const b = await scenario('us', 'en-US', 'en-US', 'America/New_York');
  const c = await scenario('none', 'en-US', 'en', 'Etc/UTC');
  const d = await scenario('de', 'de', 'de-DE', 'Europe/Berlin');
  const zh = await scenario('zh', 'zh-CN', 'zh-CN', 'Asia/Shanghai');
  const hi = await scenario('hi', 'hi', 'hi-IN', 'Asia/Kolkata');
  const es = await scenario('es', 'es', 'es-ES', 'Europe/Madrid');
  const ar = await scenario('ar', 'ar', 'ar-SA', 'Asia/Riyadh');
  const fr = await scenario('fr', 'fr', 'fr-FR', 'Europe/Paris');
  const checks = [
    ['hu: forint, magyar felirat', a.target === 'HUF' && /valutában/.test(a.label)],
    ['hu: forint árnál nincs buborék', /Ft -> null/.test(a.res[1])],
    ['us: dollár, angol, $ árnál nincs buborék', b.target === 'USD' && /Show prices in/.test(b.label) && /\$20 -> null/.test(b.res[2])],
    ['ismeretlen ország: dollár', c.target === 'USD'],
    ['másodlagos alapból: none', [a, b, c, d].every(x => x.fallback === 'none')],
    ['de: euró, angol felirat', d.target === 'EUR'],
    ['zh: jüan, kínai felirat', zh.target === 'CNY' && /货币|价格/.test(zh.label)],
    ['hi: rúpia, hindi felirat', hi.target === 'INR' && /मुद्रा/.test(hi.label)],
    ['es: euró, spanyol felirat', es.target === 'EUR' && /precios/.test(es.label)],
    ['fr: euró, francia felirat', fr.target === 'EUR' && /prix/.test(fr.label)],
    ['ar: rijál, arab felirat, jobbról balra', ar.target === 'SAR' && /الأسعار/.test(ar.label) && ar.dir === 'rtl'],
  ];
  for (const [n, ok] of checks) console.log(ok ? 'OK  ' : 'FAIL', n);
  const ok = checks.every(x => x[1]);
  console.log(ok ? 'MINDEN RENDBEN' : 'HIBA');
  server.close();
})();
