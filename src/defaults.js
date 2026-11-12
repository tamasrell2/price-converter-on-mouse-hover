// Alapértelmezett valuta a felhasználó helye alapján — hálózati lekérdezés nélkül:
// 1. a gép időzónájából (pl. Europe/Budapest -> HU), 2. a böngésző nyelvéből (pl. de-AT -> AT).
// Ha egyik sem dönti el, amerikai dollár.
(() => {
  const TZ_COUNTRY = {
    'Europe/Budapest': 'HU', 'Europe/Vienna': 'AT', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
    'Europe/Paris': 'FR', 'Europe/Monaco': 'MC', 'Europe/Rome': 'IT', 'Europe/Vatican': 'VA', 'Europe/San_Marino': 'SM',
    'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT',
    'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Luxembourg': 'LU', 'Europe/Dublin': 'IE',
    'Europe/London': 'GB', 'Europe/Zurich': 'CH', 'Europe/Vaduz': 'LI', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ',
    'Europe/Bratislava': 'SK', 'Europe/Ljubljana': 'SI', 'Europe/Zagreb': 'HR', 'Europe/Belgrade': 'RS',
    'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG', 'Europe/Athens': 'GR', 'Europe/Helsinki': 'FI',
    'Europe/Mariehamn': 'FI', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
    'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT', 'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA',
    'Europe/Chisinau': 'MD', 'Europe/Minsk': 'BY', 'Europe/Moscow': 'RU', 'Europe/Istanbul': 'TR', 'Asia/Istanbul': 'TR',
    'Europe/Malta': 'MT', 'Asia/Nicosia': 'CY', 'Europe/Nicosia': 'CY', 'Atlantic/Reykjavik': 'IS',
    'Europe/Sarajevo': 'BA', 'Europe/Skopje': 'MK', 'Europe/Tirane': 'AL', 'Europe/Podgorica': 'ME', 'Europe/Andorra': 'AD',
    'America/New_York': 'US', 'America/Detroit': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
    'America/Phoenix': 'US', 'America/Los_Angeles': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
    'America/Indiana/Indianapolis': 'US', 'America/Boise': 'US',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA',
    'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA',
    'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Tijuana': 'MX', 'America/Sao_Paulo': 'BR',
    'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'America/Santiago': 'CL',
    'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Montevideo': 'UY',
    'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Singapore': 'SG', 'Asia/Seoul': 'KR',
    'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
    'Asia/Kuala_Lumpur': 'MY', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Taipei': 'TW',
    'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Jerusalem': 'IL', 'Asia/Tel_Aviv': 'IL',
    'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Almaty': 'KZ', 'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM', 'Asia/Baku': 'AZ',
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU',
    'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU', 'Australia/Darwin': 'AU', 'Pacific/Auckland': 'NZ',
    'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
    'Africa/Casablanca': 'MA', 'Africa/Tunis': 'TN', 'Africa/Accra': 'GH',
  };

  const EURO_COUNTRIES = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV',
    'MT', 'NL', 'PT', 'SI', 'SK', 'MC', 'VA', 'SM', 'AD', 'ME', 'XK'];

  const COUNTRY_CURRENCY = {
    HU: 'HUF', GB: 'GBP', CH: 'CHF', LI: 'CHF', PL: 'PLN', CZ: 'CZK', RO: 'RON', BG: 'BGN', RS: 'RSD', SE: 'SEK',
    NO: 'NOK', DK: 'DKK', IS: 'ISK', UA: 'UAH', MD: 'MDL', BY: 'BYN', RU: 'RUB', TR: 'TRY', BA: 'BAM', MK: 'MKD',
    AL: 'ALL', US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', UY: 'UYU',
    JP: 'JPY', CN: 'CNY', HK: 'HKD', SG: 'SGD', KR: 'KRW', IN: 'INR', TH: 'THB', ID: 'IDR', PH: 'PHP', MY: 'MYR',
    VN: 'VND', TW: 'TWD', AE: 'AED', SA: 'SAR', QA: 'QAR', IL: 'ILS', PK: 'PKR', BD: 'BDT', KZ: 'KZT', GE: 'GEL',
    AM: 'AMD', AZ: 'AZN', AU: 'AUD', NZ: 'NZD', ZA: 'ZAR', EG: 'EGP', NG: 'NGN', KE: 'KES', MA: 'MAD', TN: 'TND',
    GH: 'GHS',
  };
  for (const c of EURO_COUNTRIES) COUNTRY_CURRENCY[c] = 'EUR';

  function detectCountry({ timeZone, languages } = {}) {
    try {
      timeZone ??= Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch { /* nincs időzóna */ }
    if (timeZone && TZ_COUNTRY[timeZone]) return TZ_COUNTRY[timeZone];

    languages ??= (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
    for (const lang of languages) {
      try {
        const region = new Intl.Locale(lang).maximize().region;
        // A puszta "en"-ből a maximize() mindig US-t csinálna: csak kifejezetten megadott régiót fogadunk el.
        if (region && /[-_]/.test(lang) && COUNTRY_CURRENCY[region]) return region;
      } catch { /* hibás nyelvkód */ }
    }
    return null;
  }

  // Ha az ár már a célvalutában van: 'none' = ne mutasson semmit (alapértelmezés).
  const NONE = 'none';

  // { target, fallback }: a célvaluta a hely szerinti valuta (vagy dollár); a már célvalutás áraknál nincs buborék.
  function defaultCurrencies(env) {
    const target = COUNTRY_CURRENCY[detectCountry(env)] ?? 'USD';
    return { target, fallback: NONE };
  }

  const api = { defaultCurrencies, detectCountry, NONE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.HoverPriceDefaults = api;
})();
