// Content script: ha az egér egy ár fölött áll, buborékban mutatja az összeget a beállított célvalutában.
(() => {
  const { findPrices, hintsForHost, DECIMAL_MARK, BLOCK_SEP } = globalThis.PriceParser;
  const HINTS = hintsForHost(location.hostname); // mit jelent ezen az oldalon a $, ¥, kr

  const MAX_LEVELS = 6;          // ennyi szülőelemig nézünk felfelé a hovered elemtől
  const MAX_ANCESTOR_TEXT = 400; // nagyobb szövegű szülőben már nem keresünk
  const MAX_FIRST_TEXT = 3000;   // a legbelső elemben se dolgozzunk fel óriási szöveget
  const HIT_PADDING = 3;         // px, ennyivel a szöveg körül is "eltalálja" az egér
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'INPUT', 'SELECT', 'SVG', 'CANVAS', 'IFRAME']);
  const BLOCK_DISPLAYS = /^(block|flex|grid|table|table-row|table-cell|list-item|flow-root)/;

  let rates = null;     // { EUR: 1, HUF: 390.5, USD: 1.08, ... } (euró alapon)
  // Alapértelmezés a felhasználó helye szerint (időzóna / böngészőnyelv), ha még nem választott valutát.
  const settings = globalThis.HoverPriceDefaults.defaultCurrencies();
  const LOCALE = navigator.language || 'en';
  let candidates = [];  // az aktuális elemhez talált árak: [{ range, amount, currency }]
  let candidatesFor = null;
  let hoverTarget = null;
  let dirty = false;    // az oldal megváltozott, újra kell számolni
  let active = null;    // éppen mutatott ár
  let dismissed = null; // az az ár, amit kattintással eltüntettek (amíg el nem viszi róla az egeret)
  let lastPointer = null;
  let rafPending = false;

  // ---------- Árfolyam ----------

  async function loadRates() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'getRates' });
      if (res?.rates) rates = res.rates;
    } catch {
      // A bővítmény frissült vagy le lett tiltva: ilyenkor ez a példány már nem tud üzenni.
    }
  }

  async function loadSettings() {
    try {
      Object.assign(settings, await chrome.storage.sync.get(Object.keys(settings)));
    } catch { /* lásd fent */ }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.rateData?.newValue?.rates) rates = changes.rateData.newValue.rates;
    if (area === 'sync') {
      for (const key of Object.keys(settings)) {
        if (changes[key]) settings[key] = changes[key].newValue ?? settings[key];
      }
      hide();
    }
  });

  // ---------- Szöveg kinyerése a DOM-ból ----------

  // Kinyeri egy elem látható szövegét úgy, hogy minden karakterről tudjuk, melyik szövegcsomópontból jön.
  // - rejtett elemeket kihagy (pl. képernyőolvasóknak szánt dupla árakat)
  // - blokk-elemek közé sortörést tesz, hogy két cella száma ne olvadjon össze
  // - felső indexes / kisebb betűs centek elé tizedesjelet szúr be
  function extract(root) {
    let text = '';
    const segs = []; // { node, start (a text-ben), length }

    const pushVirtual = (s) => { text += s; };

    const visit = (node, depth) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const v = node.nodeValue;
        if (v) {
          segs.push({ node, start: text.length, length: v.length });
          text += v;
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || node === host) return;
      if (SKIP_TAGS.has(node.tagName.toUpperCase())) return;
      if (node.tagName === 'BR') { pushVirtual(BLOCK_SEP); return; }

      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return;
      if (cs.display !== 'contents' && isVisuallyHidden(node, cs)) return;

      const isBlock = depth > 0 && BLOCK_DISPLAYS.test(cs.display);
      if (isBlock) pushVirtual(BLOCK_SEP);

      if (depth > 0 && looksLikeCents(node, cs, text)) pushVirtual(DECIMAL_MARK);

      for (const child of node.childNodes) visit(child, depth + 1);
      if (isBlock) pushVirtual(BLOCK_SEP);
    };

    visit(root, 0);
    return { text, segs };
  }

  function isVisuallyHidden(el, cs) {
    if (cs.position === 'absolute' || cs.position === 'fixed') {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1) return true;           // "sr-only" minta
      if (r.right < -500 || r.bottom < -500) return true;        // képernyőn kívülre tolva
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true;
    }
    return cs.opacity === '0';
  }

  // Centek felismerése: 1–2 számjegy, közvetlenül egy szám után, és felső indexben vagy kisebb betűvel.
  function looksLikeCents(el, cs, textSoFar) {
    const own = el.textContent.trim();
    if (!/^\d{1,2}$/.test(own)) return false;
    if (!/\d[\s   ]*$/.test(textSoFar)) return false; // előtte szám (és nem vessző/pont)
    if (el.tagName === 'SUP') return true;
    if (cs.verticalAlign !== 'baseline' && cs.verticalAlign !== '0px') return true;
    const parent = el.parentElement;
    if (parent) {
      const parentSize = parseFloat(getComputedStyle(parent).fontSize);
      if (parseFloat(cs.fontSize) < parentSize * 0.85) return true;
    }
    return false;
  }

  // A kinyert szöveg egy pozíciójához megkeresi a DOM-beli helyet (virtuális karaktereket átugorva).
  function boundaryAt(segs, pos, isEnd) {
    for (const s of segs) {
      if (isEnd ? pos <= s.start + s.length && pos > s.start : pos < s.start + s.length && pos >= s.start) {
        return [s.node, pos - s.start];
      }
    }
    // Virtuális karakterre esett: a legközelebbi valódi szöveghez igazítunk.
    if (isEnd) {
      for (let i = segs.length - 1; i >= 0; i--) {
        if (segs[i].start + segs[i].length <= pos) return [segs[i].node, segs[i].length];
      }
    } else {
      for (const s of segs) if (s.start >= pos) return [s.node, 0];
    }
    return null;
  }

  function computeCandidates(target) {
    const result = [];
    const seen = new Set();
    let el = target;
    for (let level = 0; el && level < MAX_LEVELS; level++, el = el.parentElement) {
      if (el === document.documentElement) break;
      const len = el.textContent.length;
      if (level === 0 ? len > MAX_FIRST_TEXT : len > MAX_ANCESTOR_TEXT) break;
      if (!/\d/.test(el.textContent)) continue;

      const { text, segs } = extract(el);
      for (const p of findPrices(text, HINTS)) {
        const a = boundaryAt(segs, p.start, false);
        const b = boundaryAt(segs, p.end, true);
        if (!a || !b) continue;
        const key = `${p.amount}|${p.currency}|${p.text}`;
        try {
          const range = document.createRange();
          range.setStart(a[0], a[1]);
          range.setEnd(b[0], b[1]);
          // Ugyanaz az ár feljebb is megtalálható: a legbelső változat marad.
          const id = key + '|' + range.toString();
          if (seen.has(id)) continue;
          seen.add(id);
          const parts = textParts(segs, p.start, p.end);
          if (!parts.length) continue;
          result.push({ range, parts, amount: p.amount, currency: p.currency, text: p.text });
        } catch { /* érvénytelen tartomány, kihagyjuk */ }
      }
    }
    return result;
  }

  // Az ár szövegdarabjai külön-külön (szövegcsomópontonként). Ezek téglalapjai pontosan a betűket
  // fedik, nem a köztük lévő elemeket (képeket, ikonokat, dobozokat).
  function textParts(segs, start, end) {
    const parts = [];
    for (const s of segs) {
      const from = Math.max(start, s.start), to = Math.min(end, s.start + s.length);
      if (from >= to) continue;
      const r = document.createRange();
      r.setStart(s.node, from - s.start);
      r.setEnd(s.node, to - s.start);
      if (r.toString().trim()) parts.push(r);
    }
    return parts;
  }

  function rectsOf(c) {
    return c.parts.flatMap(r => [...r.getClientRects()]).filter(r => r.width > 0 && r.height > 0);
  }

  function hitTest(x, y) {
    for (const c of candidates) {
      for (const r of rectsOf(c)) {
        if (x >= r.left - HIT_PADDING && x <= r.right + HIT_PADDING &&
            y >= r.top - HIT_PADDING && y <= r.bottom + HIT_PADDING) {
          return c;
        }
      }
    }
    return null;
  }

  // ---------- Egér követése ----------

  const IDLE_HIDE_MS = 6000;   // ennyi mozdulatlanság után magától eltűnik
  const WATCHDOG_MS = 250;     // amíg látszik, ilyen sűrűn ellenőrizzük, hogy az egér még az áron van-e
  let lastMoveAt = 0;
  let stopped = false;   // a bővítményt frissítették/kikapcsolták: ez a példány már nem dolgozik
  let watchdog = null;

  // A bővítmény frissítése/kikapcsolása után ez a példány "árva" lesz: ilyenkor takarítson el maga után.
  function alive() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  function onOver(e) {
    if (stopped) return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target || target === host) return;
    hoverTarget = target;
    lastMoveAt = Date.now();
    schedule(e.clientX, e.clientY);
  }
  function onMove(e) {
    if (stopped) return;
    lastMoveAt = Date.now();
    schedule(e.clientX, e.clientY);
  }
  // Egér- és pointer-eseményeket is figyelünk: egyes oldalak az egyiket elnyelik.
  for (const type of ['mouseover', 'pointerover']) document.addEventListener(type, onOver, { passive: true, capture: true });
  for (const type of ['mousemove', 'pointermove']) document.addEventListener(type, onMove, { passive: true, capture: true });

  function startWatchdog() {
    if (watchdog) return;
    watchdog = setInterval(() => {
      if (!active) { stopWatchdog(); return; }
      if (!alive()) { teardown(); return; }
      if (Date.now() - lastMoveAt > IDLE_HIDE_MS) { dismissed = active; hide(); return; }
      // Ha az egér már nem azon az elemen van (pl. az oldal elnyelte az eseményeket), tüntessük el.
      if (hoverTarget && !hoverTarget.matches(':hover')) {
        const under = lastPointer && document.elementFromPoint(lastPointer.x, lastPointer.y);
        if (under && under !== host && under !== hoverTarget) hoverTarget = under;
      }
      // A tartalom elmozdulhatott az egér alól (pl. forgó termékkarusel): újra ellenőrizzük.
      if (lastPointer) update(lastPointer.x, lastPointer.y);
    }, WATCHDOG_MS);
  }
  function stopWatchdog() {
    clearInterval(watchdog);
    watchdog = null;
  }

  // Az egér elhagyta az oldalt (vagy azt a keretet, amiben az ár van).
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) { hoverTarget = null; hide(); }
  }, { passive: true, capture: true });

  // Kattintásra (bárhová) eltűnik, és ugyanazon az áron nem jön vissza, amíg el nem viszed róla az egeret.
  window.addEventListener('pointerdown', () => {
    if (!active) return;
    dismissed = active;
    hide();
  }, { passive: true, capture: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) { dismissed = active; hide(); }
  }, { capture: true });

  window.addEventListener('scroll', () => {
    if (active && lastPointer) schedule(lastPointer.x, lastPointer.y);
  }, { passive: true, capture: true });
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });

  // Ugyanarról az árról van-e szó (újraszámolás után új objektum lehet, de ugyanott kezdődik).
  function sameHit(a, b) {
    return !!a && !!b && a.amount === b.amount && a.currency === b.currency &&
      a.range.startContainer === b.range.startContainer && a.range.startOffset === b.range.startOffset;
  }

  function schedule(x, y) {
    if (!alive()) { teardown(); return; }
    lastPointer = { x, y };
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      update(lastPointer.x, lastPointer.y);
    });
  }

  function update(x, y) {
    if (hoverTarget && (dirty || hoverTarget !== candidatesFor)) {
      dirty = false;
      candidatesFor = hoverTarget;
      candidates = hoverTarget.isConnected ? computeCandidates(hoverTarget) : [];
    }
    const hit = candidates.length ? hitTest(x, y) : null;
    if (dismissed && !sameHit(hit, dismissed)) dismissed = null;
    if (!hit || dismissed) { hide(); return; }
    if (hit === active) { position(hit); return; }
    show(hit);
  }

  // ---------- Buborék ----------

  // Régebbi verziók (vagy egy frissítés előtti példány) ottmaradt buborékjainak eltakarítása.
  for (const old of document.querySelectorAll('div[data-hover-price-converter], div[data-ar-valto], div[popover]')) {
    try {
      if (old.hasAttribute('data-hover-price-converter') || old.hasAttribute('data-ar-valto') || old.shadowRoot?.querySelector('.tip')) old.remove();
    } catch { /* nem a miénk */ }
  }

  const host = document.createElement('div');
  host.setAttribute('popover', 'manual');
  host.setAttribute('data-hover-price-converter', '');
  // A láthatóságot inline !important szabállyal állítjuk: az oldal stílusa (pl. "body > div { display: block }")
  // különben felülírhatná a popover elrejtését, és a buborék ott maradna.
  host.style.cssText = [
    'display:none', 'position:fixed', 'inset:auto', 'left:0', 'top:0', 'margin:0', 'padding:0', 'border:0',
    'background:transparent', 'overflow:visible', 'pointer-events:none', 'width:max-content', 'height:auto',
  ].map(s => s + ' !important').join(';');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .tip {
        font: 600 15px/1.25 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: #f8fafc; background: #1e293b;
        padding: 7px 11px 6px; border-radius: 8px;
        box-shadow: 0 6px 20px rgb(0 0 0 / .28), 0 0 0 1px rgb(255 255 255 / .06) inset;
        white-space: nowrap; letter-spacing: .01em;
      }
      .err { color: #fca5a5; font-weight: 500; font-size: 13px; }
    </style>
    <div class="tip"></div>`;
  const tipEl = shadow.querySelector('.tip');

  // Pénznem-formázók valutánként (pl. "12 345 Ft", "31,62 €", "$34.20" helyett "34,20 $").
  const formatters = new Map();
  // Melyik nyelvi szokás szerint írjuk ki az összeget:
  // 1. ha a felhasználó saját valutája (a böngésző régiójáé), akkor a böngésző szokása szerint;
  // 2. különben a valuta hazájának szokása szerint (HUF -> "5 196 Ft", USD -> "$1,234.56", PLN -> "1 234,56 zł");
  //    a hazát az ISO-kód első két betűje adja (HUF -> HU), ebből a böngésző beépített adatai a nyelvet;
  // 3. az euró (sok ország) és a több országos valuták (XAF, XOF…) a böngésző szokása szerint.
  function formatLocaleFor(currency) {
    let region;
    try { region = new Intl.Locale(LOCALE).maximize().region; } catch { /* hibás nyelvkód */ }
    if (region && globalThis.HoverPriceDefaults.currencyForCountry(region) === currency) return { locale: LOCALE, own: true };
    if (currency !== 'EUR' && !currency.startsWith('X')) {
      const cc = currency.slice(0, 2);
      try {
        const loc = new Intl.Locale('und-' + cc).maximize();
        if (loc.region === cc && loc.language !== 'und') return { locale: `${loc.language}-${cc}`, own: false };
      } catch { /* nincs ilyen régió */ }
    }
    return { locale: LOCALE, own: true };
  }

  function format(amount, currency) {
    // Forintnál és nagy összegeknél (10 000 felett) nincs értelme a filléreknek/centeknek.
    const whole = currency === 'HUF' || amount >= 10000;
    const key = currency + (whole ? ':0' : '');
    if (!formatters.has(key)) {
      const { locale, own } = formatLocaleFor(currency);
      // Ezres elválasztó négyjegyű számoknál is ("5 000 Ft", nem "5000 Ft").
      const opts = { style: 'currency', currency, currencyDisplay: 'narrowSymbol', useGrouping: 'always' };
      if (whole) { opts.minimumFractionDigits = 0; opts.maximumFractionDigits = 0; }
      // Más ország valutájánál mindig 0–9 számjegyek (pl. a szaúdi rijál hazai írásmódja arab számjegyes lenne).
      if (!own) opts.numberingSystem = 'latn';
      try {
        formatters.set(key, new Intl.NumberFormat(locale, opts));
      } catch {
        formatters.set(key, new Intl.NumberFormat(LOCALE, { style: 'currency', currency }));
      }
    }
    return formatters.get(key).format(amount);
  }

  // Melyik valutába váltsunk: a célvalutába; ha az ár már abban van, a másodlagosba (vagy sehova).
  function destinationFor(currency) {
    const dest = currency === settings.target ? settings.fallback : settings.target;
    if (!dest || dest === globalThis.HoverPriceDefaults.NONE) return null; // "ne mutasson semmit"
    return dest !== currency ? dest : null;
  }

  // A felismert árat halványan alá is húzzuk, hogy látszódjon, mit váltottunk át.
  const HIGHLIGHT = 'hover-price-converter';
  let highlightOk = false;
  try {
    if (CSS.highlights) {
      const style = document.createElement('style');
      style.textContent = `::highlight(${HIGHLIGHT}) { background-color: rgb(250 204 21 / .35); }`;
      (document.head || document.documentElement).appendChild(style);
      highlightOk = true;
    }
  } catch { /* nem támogatott */ }

  function ensureHost() {
    if (!host.isConnected) (document.body || document.documentElement).appendChild(host);
  }

  async function show(hit) {
    const dest = destinationFor(hit.currency);
    if (!dest) { hide(); return; }
    active = hit;
    if (!rates) await loadRates();
    if (active !== hit) return;

    tipEl.classList.remove('err');
    if (!rates) {
      tipEl.textContent = chrome.i18n.getMessage('tipNoRates') || 'No exchange rate';
      tipEl.classList.add('err');
    } else if (!rates[hit.currency] || !rates[dest]) {
      hide(); // ehhez a valutához nincs árfolyam
      return;
    } else {
      tipEl.textContent = format(hit.amount / rates[hit.currency] * rates[dest], dest);
    }

    ensureHost();
    host.style.setProperty('display', 'block', 'important');
    try { if (!host.matches(':popover-open')) host.showPopover(); } catch { host.style.setProperty('z-index', '2147483647', 'important'); }
    startWatchdog();
    if (highlightOk) CSS.highlights.set(HIGHLIGHT, new Highlight(...hit.parts));
    position(hit);
  }

  function position(hit) {
    const rects = rectsOf(hit);
    if (!rects.length) { hide(); return; }
    const r = {
      left: Math.min(...rects.map(q => q.left)), right: Math.max(...rects.map(q => q.right)),
      top: Math.min(...rects.map(q => q.top)), bottom: Math.max(...rects.map(q => q.bottom)),
    };
    r.width = r.right - r.left;
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(6, Math.min(left, vw - tw - 6));
    let top = r.top - th - 8;
    if (top < 6) top = r.bottom + 8; // ha felül nincs hely, alá tesszük
    host.style.setProperty('left', `${Math.round(left)}px`, 'important');
    host.style.setProperty('top', `${Math.round(top)}px`, 'important');
  }

  function hide() {
    if (!active && !watchdog && host.style.getPropertyValue('display') === 'none') return; // már rejtve
    active = null;
    stopWatchdog();
    host.style.setProperty('display', 'none', 'important');
    try { if (host.matches(':popover-open')) host.hidePopover(); } catch { /* már rejtve */ }
    if (highlightOk) { try { CSS.highlights.delete(HIGHLIGHT); } catch { /* */ } }
  }

  // A bővítményt frissítették vagy kikapcsolták: ez a példány eltakarít maga után és leáll.
  function teardown() {
    hide();
    stopped = true;
    observer.disconnect();
    host.remove();
  }

  // Ha az oldal tartalma változik (pl. betöltődik egy új ár), a régi tartományok érvénytelenek lehetnek.
  const observer = new MutationObserver((records) => {
    if (records.every(r => r.target === host || r.addedNodes[0] === host)) return;
    dirty = true;
    if (active && lastPointer) schedule(lastPointer.x, lastPointer.y);
  }).observe(document.documentElement, {
    childList: true, subtree: true, characterData: true,
  });

  loadSettings();
  loadRates();
})();
