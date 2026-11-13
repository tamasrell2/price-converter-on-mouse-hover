# Price Converter on Mouse Hover — magyarul: Ár átváltó (Chrome bővítmény)

Vidd az egeret egy ár fölé bármelyik weboldalon, és buborékban megmutatja a kiválasztott valutában.
A felismert ár halványsárga kiemelést kap.

- **Nyelvek:** angol (alapértelmezett), magyar, kínai (egyszerűsített), hindi, spanyol, arab (jobbról balra), francia — a böngésző nyelve szerint (`_locales/`).
- **Alapértelmezett valuta:** a gép időzónájából, ennek hiányában a böngésző nyelvi régiójából
  (pl. Europe/Budapest → forint, America/New_York → dollár). Ha nem dönthető el: amerikai dollár.
  Semmilyen adat nem megy ki a gépről, és a felhasználó választása mindig felülírja.

## Beállítások
Kattints a bővítmény ikonjára (vagy `chrome://extensions` → Ár átváltó → Részletek → Bővítmény beállításai):
- **Mutassa ebben a valutában** – a célvaluta (alap: a hely szerinti valuta, vagy dollár)
- **Ha az ár már ebben a valutában van** – alapból nem mutat semmit; választható egy másik valuta is (pl. forint árnál euró)
- árfolyamok kézi frissítése
- „Support me on Ko-fi” gomb (sima link, külső szkript nélkül)

Ki-be kapcsolni a Chrome bővítménykezelőjében lehet (`chrome://extensions`).

A buborék eltűnik, ha elviszed az egeret, ha bárhová kattintasz, ha megnyomod az Escape-et, vagy ha 6 másodpercig nem mozdul az egér.

## Telepítés / frissítés
1. Csomagold ki a zipet egy mappába (frissítésnél ugyanabba, felülírva a régit).
2. `chrome://extensions` → **Fejlesztői mód** be → **Kicsomagolt bővítmény betöltése** → a mappa,
   amiben a `manifest.json` van. (Frissítésnél elég a kártyán a ↻ ikon.)
3. A már nyitva lévő lapokat töltsd újra.

## Felismert valuták (példák)
`12,99 €` · `1.234,56 EUR` · `24⁹⁹ €` · `4 990 Ft` · `HUF 25 000` · `$1,299.99` · `US$ 49` · `£9.99` ·
`49,90 CHF` · `129,99 zł` · `1 299 Kč` · `249,99 lei` · `199 kr` · `¥12,800` · `1,280円` · `₹2,499` ·
`52,9 M Ft` · `120 E Ft` · `$2.5M` · `R$ 59,90` · `Rp 150.000` · `1.234,50 TL` · `999 ₴` · `15 лв.` · és bármi `USD 20` / `20 USD` alakban (ISO-kód).

A `$`, `¥` és `kr` jelentését az oldal domainje alapján dönti el (pl. `.ca` → kanadai dollár,
`.no` → norvég korona, `.cn` → jüan); egyébként amerikai dollár, japán jen, svéd korona.

## Árfolyamok
Forrás: ExchangeRate-API (open.er-api.com, ~160 valuta), tartalék: Európai Központi Bank (frankfurter.dev),
illetve fawazahmed0 currency-api. 6 óránként frissül.

## Fejlesztés
- Egységtesztek: `node --test test/parser.test.js test/defaults.test.js`
- Böngészős tesztek (Playwright + Chromium kell hozzá):
  `node test/e2e/hover.e2e.js`, `node test/e2e/locale.e2e.js`, `node test/e2e/page-css.e2e.js`
- Bolti képernyőképek újragenerálása: `node store/make-screenshots.js`
- Bolti csomag: `zip -r price-converter-on-mouse-hover-<verzió>.zip manifest.json _locales src popup icons`
- Ikonok újragenerálása: `python3 tools/make-icons.py`
