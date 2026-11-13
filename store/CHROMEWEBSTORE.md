# Chrome Web Store Listing — Price Converter on Mouse Hover

> Last Updated: 2026-11-13 · Extension version: 1.8.1

Single source of truth for everything typed into the Chrome Web Store Developer Dashboard.
Copy each block into the matching dashboard field. (Hungarian step-by-step guide: `PUBLISHING.md`.)

---

## Store Listing

**Extension Name** [REQUIRED]
The name comes from `_locales/<lang>/messages.json` → `extName` (manifest uses `__MSG_extName__`).
The dashboard shows it automatically per language; nothing to type.

| UI language | Listing name |
|---|---|
| English (default) | Price Converter on Mouse Hover |
| Hungarian | Ár átváltó |
| Chinese (Simplified) | 悬停价格换算器 |
| Hindi | होवर प्राइस कन्वर्टर |
| Spanish | Conversor de precios al pasar el ratón |
| Arabic | محوّل الأسعار عند تمرير المؤشر |
| French | Convertisseur de prix au survol |
| Japanese | マウスオーバー価格換算 |
| Indonesian | Konverter Harga saat Mouse Diarahkan |
| Turkish | Fareyle Üzerine Gelince Fiyat Çevirici |
| Russian | Конвертер цен при наведении мыши |

**Short Description** [REQUIRED] — also comes from `extDescription` in each locale (all ≤ 132 chars).
English:
```
Hover over a price on any website and see it converted to your currency instantly.
```

**Detailed Description — English** [REQUIRED]
(Plain text — the store strips Markdown. Paste exactly as below.)
```
Hover over any price on any website and instantly see what it costs in your own currency.

Shopping abroad, booking a hotel, or comparing offers in euros, pounds, yen or forints? Just point at the price. A small bubble shows the converted amount right next to it, and disappears as soon as you move away or click.

FEATURES
• Works on any website — online shops, travel and hotel sites, marketplaces, news articles.
• 160+ currencies: €, $, £, ¥, ₹, zł, Kč, Ft, CHF, kr, R$ and many more, plus three-letter codes such as USD 20 or 49.90 CHF.
• Understands the many ways prices are written: 1,234.56 · 1.234,56 · 1 234,56 · 12,– · 52,9 M Ft · $2.5M, and cents written in superscript (24⁹⁹ €).
• Your currency is preselected based on where you are (from your computer's time zone and browser language). You can change it any time.
• Prices already in your currency stay quiet by default — or choose a second currency to convert them to.
• Exchange rates update automatically every 6 hours, with a manual refresh button.
• Lightweight: it only reacts when your mouse is over a price, and never alters the page's content.
• Available in English, Japanese, Chinese, Spanish, Indonesian, Turkish, Russian, French, Hungarian, Hindi and Arabic.

HOW TO USE
1. Install the extension and pin it to your toolbar (optional).
2. Hover over a price on any website — the converted amount appears above it.
3. Click the toolbar icon to choose your currency and what happens with prices already in your currency.

PRIVACY
No account, no tracking, no analytics. Price detection happens entirely on your computer; page content is never stored or sent anywhere. The only network requests the extension makes are anonymous downloads of public exchange-rate tables. Your currency choice is saved in your browser's settings storage (synced by Chrome if you use Chrome sync).

PERMISSIONS
• "Read and change all your data on all websites" — needed to recognise prices on whatever page you are viewing and show the bubble next to them. The extension only reads the short piece of text around your mouse pointer, processes it locally, and never modifies or transmits page content.

Exchange rates are for information only and may differ from the rate your bank or card applies.

Like it? You can support development on Ko-fi: https://ko-fi.com/R5C12AJWQ8
```

**Detailed Description — Hungarian** [RECOMMENDED — add as a second language in the dashboard]
```
Vidd az egeret egy ár fölé bármelyik weboldalon, és azonnal megmutatja, mennyi az a saját valutádban.

Külföldi webshop, szállásfoglalás, euróban, fontban vagy jenben megadott ajánlat? Csak mutass az árra: egy kis buborék megjeleníti az átváltott összeget, és eltűnik, amint elviszed az egeret vagy kattintasz.

FUNKCIÓK
• Bármelyik weboldalon működik: webshopok, utazási és szállásoldalak, piacterek, cikkek.
• Több mint 160 valuta: €, $, £, ¥, ₹, zł, Kč, Ft, CHF, kr, R$ és még sok más, valamint a háromjegyű kódok (pl. USD 20, 49,90 CHF).
• Érti az árak sokféle írásmódját: 1,234.56 · 1.234,56 · 1 234,56 · 12,– · 52,9 M Ft · $2.5M, és a felső indexbe írt centeket is (24⁹⁹ €).
• A saját valutád automatikusan be van állítva a tartózkodási helyed alapján (a számítógép időzónájából és a böngésző nyelvéből). Bármikor módosíthatod.
• A már a saját valutádban lévő árakhoz alapból nem mutat semmit, de választhatsz hozzájuk egy második valutát is.
• Az árfolyamok 6 óránként maguktól frissülnek, és kézzel is frissíthetők.
• Könnyű: csak akkor dolgozik, ha az egér egy ár fölött van, és sosem módosítja az oldal tartalmát.
• Elérhető angolul, japánul, kínaiul, spanyolul, indonézül, törökül, oroszul, franciául, magyarul, hindiül és arabul.

HASZNÁLAT
1. Telepítsd a bővítményt, és ha szeretnéd, tűzd ki az eszköztárra.
2. Vidd az egeret egy ár fölé bármelyik oldalon: fölötte megjelenik az átváltott összeg.
3. Az eszköztár ikonjára kattintva választhatsz valutát, és beállíthatod, mi legyen a már saját valutás árakkal.

ADATVÉDELEM
Nincs fiók, nincs követés, nincs statisztikagyűjtés. Az árfelismerés teljes egészében a gépeden történik, az oldal tartalmát a bővítmény sehol nem tárolja és sehova nem küldi. Egyetlen hálózati kérése a nyilvános árfolyamtáblák névtelen letöltése. A valutaválasztásodat a böngésző beállításai között tárolja (bekapcsolt Chrome-szinkronizálásnál a Chrome szinkronizálja).

Az árfolyamok tájékoztató jellegűek, eltérhetnek a bankod vagy kártyád által alkalmazott árfolyamtól.
```

**Category** [REQUIRED]
`Shopping` (alternative: `Tools`). Shopping matches the main use case and has less competition.

**Single Purpose** [REQUIRED]
```
Shows prices on web pages converted into the user's chosen currency when the user hovers over them.
```

**Primary Language** [REQUIRED]
English. UI is also available in Japanese, Chinese (Simplified), Spanish, Indonesian, Turkish, Russian, French, Hungarian, Hindi and Arabic.

---

## Graphics & Assets

All generated by `store/make-screenshots.js` from the real extension (see "Regenerating screenshots" below).

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Ready | `store/screenshots/1-hover-eur-price-in-usd.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ✅ Ready | `store/screenshots/2-superscript-cents.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ✅ Ready | `store/screenshots/3-any-currency.png` |
| Screenshot 4 | 1280×800 | ✅ Ready | `store/screenshots/4-settings.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 | ✅ Ready | `store/screenshots/promo-small-440x280.png` |
| Marquee Promo Tile | 1400×560 | ⬜ Not created (optional) | |

### Screenshot Notes
1. Product page of a made-up outdoor shop; hovering 249,00 € shows **$268.92**.
2. Same shop; hovering a price with superscript cents (89⁹⁹ €) shows **$97.19**.
3. Made-up travel deals page with ¥, £, CHF, zł and Ft prices; hovering ¥48,600 shows **$324.00**.
4. The settings popup (currency picker, "Show nothing" option) on a branded background.

Demo pages (`store/demo-shop.html`, `store/demo-travel.html`) use invented names and no real brands.
Screenshots use a fixed, roughly realistic rate table (1 € = 1.08 $), because the build sandbox cannot reach the rate APIs.

### Regenerating screenshots
Re-run after any UI change (the script loads the extension from the project folder as it is):
```bash
node store/make-screenshots.js
```

---

## Permissions Justification

Paste each row into the matching field of the dashboard's **Privacy practices** tab.

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Saves the user's settings (chosen currency, and what to do with prices already in that currency) and caches the downloaded exchange-rate table so it does not have to be fetched on every page. |
| `alarms` | permissions | Schedules a refresh of the exchange-rate table every 6 hours so converted prices stay current without the user doing anything. |
| `https://open.er-api.com/*` | host_permissions | Primary source of the public exchange-rate table (about 160 currencies). The extension sends an anonymous GET request for the latest euro-based rates; no user data is included. |
| `https://api.frankfurter.dev/*` | host_permissions | Backup source (European Central Bank reference rates), used only if the primary source is unavailable. Anonymous GET request, no user data. |
| `https://cdn.jsdelivr.net/*` | host_permissions | Second backup source: a public JSON file of currency rates served from this CDN, used only if both other sources fail. Only data (JSON) is downloaded — no code is loaded or executed. |
| Content script on `<all_urls>` | host_permissions (content_scripts matches) | The extension's single purpose is to convert prices on whatever website the user is viewing — shops, travel sites, marketplaces — which cannot be listed in advance. On each page it reads only the short piece of visible text around the mouse pointer to recognise a price, does the conversion locally, and draws a small bubble next to it. Page content is never stored, modified or sent anywhere. The user can disable or remove the extension at any time from Chrome's extension manager. |

**Remote code:** No. All JavaScript is included in the package. The only network responses are JSON exchange-rate tables, which are parsed as data and never executed.

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications | No | No | — | No |
| Location | No | No | (Country is guessed locally from the time zone / browser language only to preselect a currency; it is never stored or sent.) | No |
| Web history | No | No | — | No |
| User activity | No | No | — | No |
| Website content | No | No | (Price text under the pointer is read and processed in memory only; never stored or transmitted.) | No |

Things worth knowing when filling in the form honestly:
- Settings (target currency, second currency / "show nothing") are saved with Chrome's sync storage. If the user has Chrome sync enabled, Google syncs them between the user's own devices. These are not user data under the CWS definitions, but the privacy policy mentions it.
- Outbound requests: only anonymous GET requests to `open.er-api.com`, `api.frankfurter.dev` and `cdn.jsdelivr.net` to download rate tables. Nothing about the user or the page is sent. As with any web request, those servers see the requesting IP address.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED — `<all_urls>` makes it mandatory]
`store/privacy-policy.html` is ready. Host it publicly (GitHub Pages or a public Google Doc, see `PUBLISHING.md`) and paste the URL here:

```
https://docs.google.com/document/d/1kmCfNNrbafUcVvh8xdTxSla6XuozfMLiOCYAF5-Cpyw/view  (public Google Doc, anyone with the link can view)
```
Contact email already filled in (tamasrell@gmail.com).

---

## Distribution

**Visibility**: **Public** (searchable in the store). Can be switched to Unlisted later in the Distribution tab.

**Regions**: All regions.

## Developer Info

**Publisher Name** [REQUIRED]: Tamas Rell (shown publicly)
**Contact Email** [REQUIRED]: tamasrell@gmail.com (shown publicly; Google sends policy notices here)
**Support URL / Email** [RECOMMENDED]: tamasrell@gmail.com
**Homepage URL** [RECOMMENDED]: optional
**Ko-fi support link**: added in 1.7.0 as a button at the bottom of the settings popup (https://ko-fi.com/R5C12AJWQ8), and mentioned at the end of the English description. It is a plain link: no script or image is loaded from Ko-fi, and nothing is locked behind a donation.

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.8.1 | 2026-11-13 | First store submission. Converted amounts written the way each currency is written at home (e.g. 5 000 Ft, $1,234.56, 1 234,56 zł); UI in 11 languages (added Japanese, Indonesian, Turkish, Russian); "Common" currency list ordered for a worldwide audience; Ko-fi support button in the settings popup; new currency-neutral icon (price tag with exchange arrows). 160+ currencies; superscript cents and M/k multipliers; currency preselected from location (fallback USD); "show nothing" for prices already in the target currency (default); bubble reliably hides on mouse-out, click, Escape, after 6 s idle. | Draft |

---

## Pre-submit checklist

- [ ] `manifest_version` is 3, version bumped above the last uploaded one (now 1.8.1).
- [ ] ZIP contains only: `manifest.json`, `_locales/`, `src/`, `popup/`, `icons/` (no `store/`, `test/`, `tools/`, `README.md`, `CHROMEWEBSTORE.md`). Command in `PUBLISHING.md`.
- [ ] Loaded the ZIP's contents unpacked in Chrome and tested: hover converts, popup opens, no console errors.
- [ ] Every permission row above pasted into the dashboard.
- [ ] Data-use form: "does not collect" + all three certifications ticked.
- [ ] `[CONTACT EMAIL]` replaced in `privacy-policy.html`; policy hosted; URL opens in a private window.
- [ ] At least one 1280×800 screenshot uploaded (4 ready); small promo tile uploaded.
- [ ] Detailed description pasted (English; Hungarian optional as extra language).
- [ ] Category: Shopping. Single purpose pasted.
- [ ] Visibility chosen (public / unlisted).
- [ ] Contact email verified in the developer account.

---

## Review Notes

### Known Issues / Limitations
- Broad host access (content script on all sites) → expect an in-depth review (can take longer than usual).
- Exchange rates are informational (daily/6-hourly public rates), stated in the description.
- `$`, `¥` and `kr` are ambiguous; the extension decides by the site's domain (e.g. `.ca` → CAD), otherwise USD / JPY / SEK.

### Rejection History
| Date | Reason | Fix Applied | Resubmitted |
|------|--------|-------------|-------------|
| | | | |
