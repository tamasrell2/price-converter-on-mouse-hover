// Háttér: letölti és tárolja az összes valuta árfolyamát (euró alapon). Az állapot mindig a
// chrome.storage-ban van, mert a service worker bármikor leállhat.

const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 óránként frissítünk
const ALARM = 'refresh-rate';
const MIN_CURRENCIES = 20;             // ennél kevesebb valutával a válasz gyanús

const upper = (obj) => Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [k.toUpperCase(), v]));

const SOURCES = [
  {
    // ~160 valuta, naponta frissül
    name: 'ExchangeRate-API',
    url: 'https://open.er-api.com/v6/latest/EUR',
    parse: (j) => ({
      rates: j?.rates,
      date: j?.time_last_update_unix ? new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10) : null,
    }),
  },
  {
    // Európai Központi Bank, ~30 valuta
    name: 'Európai Központi Bank (Frankfurter)',
    url: 'https://api.frankfurter.dev/v1/latest?base=EUR',
    parse: (j) => ({ rates: { ...j?.rates, EUR: 1 }, date: j?.date }),
  },
  {
    // ~300 valuta (kriptók is), jsDelivr CDN-ről
    name: 'fawazahmed0 currency-api',
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json',
    parse: (j) => ({ rates: upper(j?.eur), date: j?.date }),
  },
];

async function fetchRates() {
  const errors = [];
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { rates, date } = src.parse(await res.json());
      const clean = Object.fromEntries(
        Object.entries(rates ?? {}).filter(([k, v]) => /^[A-Z]{3}$/.test(k) && typeof v === 'number' && v > 0)
      );
      if (Object.keys(clean).length < MIN_CURRENCIES || !clean.HUF) throw new Error('hiányos válasz');
      clean.EUR = 1;
      return { rates: clean, date: date ?? new Date().toISOString().slice(0, 10), source: src.name, fetchedAt: Date.now() };
    } catch (err) {
      errors.push(`${src.name}: ${err.message}`);
    }
  }
  throw new Error(errors.join('; '));
}

// Visszaadja a tárolt árfolyamokat; ha régiek vagy nincsenek, újakat tölt le.
async function getRates({ force = false } = {}) {
  const { rateData } = await chrome.storage.local.get('rateData');
  const valid = rateData?.rates; // az 1.0-s verzió még csak egy árfolyamot tárolt
  const fresh = valid && Date.now() - rateData.fetchedAt < MAX_AGE_MS;
  if (fresh && !force) return rateData;

  try {
    const data = await fetchRates();
    await chrome.storage.local.set({ rateData: data, lastError: null });
    return data;
  } catch (err) {
    console.warn('Árfolyamok letöltése sikertelen:', err.message);
    await chrome.storage.local.set({ lastError: err.message });
    return valid ? rateData : null; // régi árfolyam még mindig jobb a semminél
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'getRates' || msg?.type === 'refreshRates') {
    (async () => {
      try {
        sendResponse(await getRates({ force: msg.type === 'refreshRates' }));
      } catch (err) {
        console.error(err);
        sendResponse(null);
      }
    })();
    return true; // aszinkron válasz
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(ALARM, { periodInMinutes: 6 * 60 });
  await getRates();
});

chrome.runtime.onStartup.addListener(() => getRates());

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) getRates({ force: true });
});
