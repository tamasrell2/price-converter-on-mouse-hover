# Feltöltés a Chrome Web Store-ba – Price Converter on Mouse Hover (magyarul: Ár átváltó)

Minden bemásolandó szöveg a `CHROMEWEBSTORE.md`-ben van (angolul, ahogy a bolt kéri). Ez a leírás azt mondja meg, hova kerüljenek.

## 0. Amit előtte el kell döntened vagy ki kell töltened

- **Kapcsolati e-mail-cím.** Nyilvánosan megjelenik a bolti oldalon, és a Google ide küldi a hivatalos értesítéseket, ezért olyat adj meg, amit rendszeresen olvasol. Ezt kell beírni a `privacy-policy.html`-be is a `[CONTACT EMAIL]` helyére (2 helyen).
- **Kiadói név** (Publisher name): a saját neved vagy egy becenév.
- **Láthatóság:** *Nyilvános* (bárki megtalálja) vagy *Nem listázott* (csak link birtokában telepíthető).

## 1. Fejlesztői fiók regisztrálása (egyszeri)

1. Nyisd meg: https://chrome.google.com/webstore/devconsole, és lépj be a Google-fiókoddal.
2. A Google-fiókban legyen bekapcsolva a **kétlépcsős azonosítás**, enélkül nem lehet közzétenni.
3. Fogadd el a fejlesztői szerződést, és fizesd ki az **egyszeri 5 USD** regisztrációs díjat (bankkártyával).
4. Az **Account** (Fiók) oldalon add meg a kiadói nevet és a kapcsolati e-mail-címet, majd **igazold az e-mail-címet** (a kapott levélben lévő linkkel).

## 2. Az adatvédelmi tájékoztató közzététele

A bővítmény minden oldalon fut, ezért a bolt kötelezően kér egy nyilvános adatvédelmi oldalt. A kész szöveg: `store/privacy-policy.html` (előbb írd át benne a `[CONTACT EMAIL]` részt).

**A) GitHub Pages (ajánlott, ingyenes, stabil link)**
1. Hozz létre egy nyilvános repót a GitHubon, pl. `hover-price-converter`.
2. Töltsd fel a `privacy-policy.html` fájlt (a webes felületen: *Add file → Upload files*).
3. *Settings → Pages* → *Source: Deploy from a branch* → `main` / `(root)` → *Save*.
4. Pár perc múlva elérhető: `https://<felhasználóneved>.github.io/hover-price-converter/privacy-policy.html`

**B) Nyilvános Google-dokumentum**
1. Nyisd meg a `privacy-policy.html`-t a böngészőben, jelöld ki és másold be a szöveget egy új Google-dokumentumba.
2. *Megosztás → Általános hozzáférés: Bárki, aki rendelkezik a linkkel (Megtekintő)*.
3. Ezt a linket add meg.

Mindkét esetben nyisd meg a linket egy **inkognitóablakban**, hogy biztosan bejelentkezés nélkül is betöltődjön.

## 3. A csomag elkészítése

A projekt mappájában (`price-converter-on-mouse-hover`) futtasd ezt. Csak a bővítmény működéséhez szükséges fájlok kerülnek bele:

```bash
zip -r price-converter-on-mouse-hover-1.7.0.zip manifest.json _locales src popup icons
```

A `store/`, `test/` és `tools/` mappát, valamint a `README.md`-t **ne** tedd bele.

## 4. Új elem létrehozása és a zip feltöltése

1. Az irányítópulton: **+ New item** → válaszd ki a zipet.
2. A feltöltés után megnyílik az elem szerkesztője, bal oldalt fülekkel.

## 5. A fülek kitöltése

### Store listing (Bolti adatlap)
A szövegek a `CHROMEWEBSTORE.md` → *Store Listing* részből:
- **Description:** az angol *Detailed Description* blokk.
- Ha magyarul is szeretnéd: a nyelvválasztóban adj hozzá *Hungarian* nyelvet, és oda a magyar blokkot másold. A név és a rövid leírás nyelvenként magától jön a bővítményből.
- **Category:** Shopping.
- **Language:** English.
- **Store icon:** `icons/icon-128.png`.
- **Screenshots:** a `store/screenshots/` mappából az `1-…`, `2-…`, `3-…`, `4-…` képek (mind 1280×800).
- **Small promo tile:** `store/screenshots/promo-small-440x280.png`.
- **Homepage / Support URL:** elhagyható. Ha van GitHub-repód, megadhatod annak a linkjét.

### Privacy practices (Adatkezelés)
A `CHROMEWEBSTORE.md` → *Permissions Justification* és *Privacy & Data Use* részből:
- **Single purpose:** a *Single Purpose* mondat.
- **Permission justification:** minden engedélyhez (`storage`, `alarms`, host permissions) a táblázat megfelelő sora. A legfontosabb a „minden oldalon fut” (content script) indoklása, ezt szó szerint másold be.
- **Are you using remote code?** → *No, I am not using remote code*.
- **Data usage:** egyik adattípust se jelöld be (a bővítmény nem gyűjt adatot), és pipáld ki mindhárom tanúsítást (nem adja el, nem használja másra, nem hitelbírálatra).
- **Privacy policy URL:** a 2. lépésben kapott link.

### Distribution (Terjesztés)
- **Payments:** Free of charge (ingyenes).
- **Visibility:** Public vagy Unlisted (a te döntésed).
- **Regions:** All regions.

## 6. Beküldés ellenőrzésre

1. Jobb fent: **Submit for review**.
2. Felajánlja, hogy jóváhagyás után azonnal közzétegye, vagy te indítsd el kézzel. Ez utóbbi esetben a jóváhagyástól számított 30 napon belül kell közzétenned.
3. **Várható idő:** általában pár nap. Mivel a bővítmény minden weboldalhoz hozzáfér, valószínűleg alaposabb („in-depth”) ellenőrzést kap, ami 1–2 hétig, ritkán tovább is tarthat.
4. Az eredményről e-mailt kapsz. Ha elutasítják, a levél megírja, melyik szabály miatt. A javítást és az okot jegyezd fel a `CHROMEWEBSTORE.md` *Rejection History* táblázatába, és küldd be újra.

## 7. Későbbi frissítések

1. Emeld a verziószámot a `manifest.json`-ban (pl. `1.6.0` → `1.6.1`). A bolt nem fogad el azonos vagy kisebb verziót.
2. Készítsd el az új zipet (3. lépés, az új verziószámmal a fájlnévben).
3. Irányítópult → az elem → **Package → Upload new package**.
4. Ha változott a felület, frissítsd a képeket: `node store/make-screenshots.js`. Ha változtak az engedélyek vagy az adatkezelés, frissítsd a megfelelő fület is.
5. **Submit for review.** A frissítések ellenőrzése általában gyorsabb, sokszor egy napon belül megvan.
6. A telepített példányok a jóváhagyás után néhány órán belül maguktól frissülnek.

## Ko-fi támogatás

Az 1.7.0-tól a beállítások ablak alján van egy „Support me on Ko-fi” gomb (https://ko-fi.com/R5C12AJWQ8), és az angol bolti leírás végén is szerepel. Adománylink megengedett, de semmilyen funkciót nem szabad mögé zárni.
