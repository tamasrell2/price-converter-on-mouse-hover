// Árfelismerő: szövegben megkeresi a különféle valutájú árakat, és számmá alakítja őket.
// A content script és a node-os tesztek is ezt használják.
(() => {
  // Különleges jel, amit a DOM-bejáró a felső indexes centek elé szúr be:
  // ez biztosan tizedesjel (pl. 12<sup>99</sup> € -> "1299 €").
  const DECIMAL_MARK = '';

  // A DOM-bejáró ezt teszi két blokk-elem (pl. két div vagy cella) közé: ezen át nem nyúlhat egy ár.
  const BLOCK_SEP = String.fromCharCode(0xE001);

  // Szóköz-félék: sima, nem törhető, keskeny nem törhető, vékony szóköz.
  // A szám és a valuta között legfeljebb pár szóköz lehet, blokkhatár nem.
  const SP = '[ \\u00A0\\u202F\\u2009\\u2007]';
  const WS = '[ \\t\\r\\n\\u00A0\\u202F\\u2009\\u2007]{0,3}';
  const LETTER = 'A-Za-z\\u00C0-\\u024F\\u0400-\\u04FF';

  // Szám: ezres tagolással (pont, vessző, szóköz, aposztróf) vagy anélkül, opcionális tizedesekkel.
  // A "12,-" és "12,–" alakot is elfogadjuk (kerek összeg).
  const GROUP = `(?:[.,'’]|${SP})`;
  const DEC = `[.,${DECIMAL_MARK}]`;
  const NUM =
    `(?<![\\d.,${DECIMAL_MARK}])` +
    `(?:\\d{1,3}(?:${GROUP}\\d{3})+|\\d+)` +
    `(?:${DEC}\\d{1,2}(?!\\d)|,[-–—](?![\\d-]))?` +
    `(?![\\d${DECIMAL_MARK}]|[.,]\\d)`;

  // ISO-kódok, amiket "USD 12" / "12 USD" alakban elfogadunk. Szándékosan kimaradtak azok,
  // amik gyakori angol szavak is (ALL, TOP, CUP, PEN, TRY, MAD, SOS...).
  const ISO_CODES = new Set((
    'EUR HUF USD GBP CHF PLN CZK RON BGN RSD SEK NOK DKK ISK UAH RUB BYN MDL MKD GEL AMD AZN ' +
    'CAD AUD NZD JPY CNY HKD SGD TWD KRW INR IDR MYR THB VND PHP PKR BDT LKR NPR KZT UZS ' +
    'ILS AED SAR QAR KWD BHD OMR JOD EGP ZAR NGN KES GHS TND MXN BRL ARS CLP COP UYU ' +
    'CRC DOP GTQ PYG BOB'
  ).split(' '));

  // Szimbólumok és rövidítések -> valuta. A "?" jelű értékeket az oldal domainje alapján döntjük el.
  const TOKENS = {
    '€': 'EUR', '£': 'GBP', '$': '?dollar', '¥': '?yen', '￥': '?yen', 'kr': '?kr', 'kr.': '?kr',
    'US$': 'USD', 'CA$': 'CAD', 'C$': 'CAD', 'AU$': 'AUD', 'A$': 'AUD', 'NZ$': 'NZD', 'HK$': 'HKD',
    'S$': 'SGD', 'MX$': 'MXN', 'R$': 'BRL', 'NT$': 'TWD',
    '₹': 'INR', '₨': 'INR', 'Rs': 'INR', 'Rs.': 'INR', '₩': 'KRW', '₺': 'TRY', 'TL': 'TRY', '₪': 'ILS',
    '₴': 'UAH', 'грн': 'UAH', '₽': 'RUB', 'руб': 'RUB', 'р.': 'RUB', '฿': 'THB', '₫': 'VND', '₱': 'PHP',
    '₦': 'NGN', '₸': 'KZT', '₼': 'AZN', '₾': 'GEL', '₲': 'PYG', '₵': 'GHS', '₡': 'CRC',
    '元': 'CNY', '円': 'JPY', 'zł': 'PLN', 'Kč': 'CZK', 'lei': 'RON', 'Rp': 'IDR', 'RM': 'MYR',
    'лв': 'BGN', 'лв.': 'BGN', 'дин': 'RSD', 'din': 'RSD', 'Ft': 'HUF', 'ft': 'HUF', 'FT': 'HUF',
  };

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const byLength = (a, b) => b.length - a.length;
  const symbolTokens = Object.keys(TOKENS).filter(t => !/[A-Za-zа-я]/i.test(t)).sort(byLength);
  const wordTokens = Object.keys(TOKENS).filter(t => /[A-Za-zа-я]/i.test(t)).sort(byLength);

  const NOT_LETTER_AFTER = `(?![${LETTER}])`;
  const TOKEN =
    `(?<tok>` +
      `(?<![${LETTER}])(?:${wordTokens.map(esc).join('|')})${NOT_LETTER_AFTER}` +
      `|(?:${symbolTokens.map(esc).join('|')})` +
      `|(?<![${LETTER}])[A-Z]{3}${NOT_LETTER_AFTER}` +
      // "52,9 MFt", "120 eFt": a szorzó egybeírva a Ft-tal
      `|(?<=\\d${WS}[MmEe])Ft${NOT_LETTER_AFTER}` +
      // magyar és angol szavak, toldalékkal is: "100 euróért", "3500 forintos", "20 dollárt"
      `|(?<![${LETTER}])(?:[Ee]ur(?![${LETTER}])|[Ee]ur[oó](?![pP])|[Ff]orint|[Dd]oll[aá]r)` +
    `)`;

  // Szorzók: "52,9 M Ft", "120 E Ft", "1,2 Mrd Ft", "3 millió forint", "$2.5M", "€15k"
  const MUL_BEFORE_TOKEN = `(?:[Mm]rd\\.?|[Mm]illiárd|[Mm]illió|[Mm]illion|[Mm]io\\.?|[Ee]zer|bn|M|E|e|m|k|K)`;
  const MUL_AFTER_NUM = `(?:[Mm]rd\\.?|[Mm]illiárd|[Mm]illió|[Mm]illion|[Mm]io\\.?|bn|M|k|K)`;
  const MULTIPLIERS = [
    [/^(mrd\.?|milliárd|bn|billion)$/i, 1e9],
    [/^(m|mio\.?|millió|million)$/i, 1e6],
    [/^(e|ezer|k)$/i, 1e3],
  ];
  function multiplierOf(token) {
    if (!token) return 1;
    for (const [re, factor] of MULTIPLIERS) if (re.test(token)) return factor;
    return 1;
  }

  const PRICE_RE = new RegExp(
    // valuta elöl: "€ 12,99", "USD 1,299", "$5", "$2.5M"
    `${TOKEN.replace('<tok>', '<pre>')}${WS}(?<num1>${NUM})(?:${WS}(?<mul1>${MUL_AFTER_NUM})${NOT_LETTER_AFTER})?` +
    '|' +
    // valuta hátul: "12,99 €", "1 299 Ft", "199 kr", "4.500,- Ft", "100 euró", "52,9 M Ft"
    `(?<num2>${NUM})${WS}(?:(?<mul2>${MUL_BEFORE_TOKEN})${WS})?${TOKEN.replace('<tok>', '<post>')}`,
    'g'
  );

  const DEFAULT_HINTS = { dollar: 'USD', yen: 'JPY', kr: 'SEK' };

  // A domain végződése alapján eldönti, mit jelent a "$", a "¥" és a "kr".
  function hintsForHost(hostname = '') {
    const h = hostname.toLowerCase();
    const ends = (...tlds) => tlds.some(t => h.endsWith('.' + t) || h === t);
    const hints = { ...DEFAULT_HINTS };
    if (ends('ca')) hints.dollar = 'CAD';
    else if (ends('au')) hints.dollar = 'AUD';
    else if (ends('nz')) hints.dollar = 'NZD';
    else if (ends('mx')) hints.dollar = 'MXN';
    else if (ends('hk')) hints.dollar = 'HKD';
    else if (ends('sg')) hints.dollar = 'SGD';
    else if (ends('tw')) hints.dollar = 'TWD';
    else if (ends('ar')) hints.dollar = 'ARS';
    else if (ends('cl')) hints.dollar = 'CLP';
    if (ends('cn')) hints.yen = 'CNY';
    if (ends('no')) hints.kr = 'NOK';
    else if (ends('dk', 'fo', 'gl')) hints.kr = 'DKK';
    else if (ends('is')) hints.kr = 'ISK';
    return hints;
  }

  function currencyOf(token, hints) {
    if (!token) return null;
    let cur = TOKENS[token];
    if (!cur && ISO_CODES.has(token)) cur = token;
    if (!cur) {
      if (/^eur/i.test(token)) cur = 'EUR';
      else if (/^forint/i.test(token)) cur = 'HUF';
      else if (/^doll/i.test(token)) cur = '?dollar';
    }
    if (cur?.startsWith('?')) cur = hints[cur.slice(1)] ?? DEFAULT_HINTS[cur.slice(1)];
    return cur ?? null;
  }

  // Egy szám-szövegből (pl. "1.234,56", "1,234.56", "1 299", "1299") értéket csinál.
  function parseAmount(raw) {
    let s = raw.replace(/,[-–—]$/, '');
    s = s.replace(/[\s    '’]/g, '');

    if (s.includes(DECIMAL_MARK)) {
      const [intPart, frac] = s.split(DECIMAL_MARK);
      return Number(intPart.replace(/[.,]/g, '') + '.' + frac);
    }

    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');

    if (lastDot !== -1 && lastComma !== -1) {
      // Mindkettő szerepel: a később jövő a tizedesjel.
      const decIdx = Math.max(lastDot, lastComma);
      const intPart = s.slice(0, decIdx).replace(/[.,]/g, '');
      return Number(intPart + '.' + s.slice(decIdx + 1));
    }

    const sep = lastDot !== -1 ? '.' : lastComma !== -1 ? ',' : null;
    if (!sep) return Number(s);

    const parts = s.split(sep);
    if (parts.length > 2) return Number(parts.join('')); // több elválasztó -> ezres tagolás

    const [intPart, frac] = parts;
    if (frac.length === 3 && intPart !== '0') return Number(intPart + frac); // "1.299" -> ezres
    return Number(intPart + '.' + frac); // "12,99" -> tizedes
  }

  // Visszaadja az összes talált árat: [{ start, end, amount, currency, text }]
  function findPrices(text, hints = DEFAULT_HINTS) {
    const results = [];
    PRICE_RE.lastIndex = 0;
    let m;
    while ((m = PRICE_RE.exec(text))) {
      const g = m.groups;
      const numText = g.num1 ?? g.num2;
      const currency = currencyOf(g.pre ?? g.post, hints);
      if (!currency) {
        // Nem valuta (pl. "128 GBs"): a szám után folytatjuk, hátha ott valódi ár kezdődik.
        PRICE_RE.lastIndex = m.index + 1;
        continue;
      }
      const amount = parseAmount(numText) * multiplierOf(g.mul1 ?? g.mul2);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      results.push({
        start: m.index,
        end: m.index + m[0].length,
        amount,
        currency,
        text: m[0].replaceAll(DECIMAL_MARK, ','),
      });
    }
    return results;
  }

  const api = { findPrices, parseAmount, hintsForHost, DECIMAL_MARK, BLOCK_SEP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.PriceParser = api;
})();
