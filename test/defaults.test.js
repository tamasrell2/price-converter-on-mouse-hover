// Futtatás: node --test test/defaults.test.js
const test = require('node:test');
const assert = require('node:assert');
const { defaultCurrencies } = require('../src/defaults.js');

const cases = [
  [{ timeZone: 'Europe/Budapest', languages: ['en-US'] }, 'HUF'],
  [{ timeZone: 'Europe/Berlin', languages: ['en-US'] }, 'EUR'],
  [{ timeZone: 'Europe/London', languages: ['en-GB'] }, 'GBP'],
  [{ timeZone: 'America/New_York', languages: ['en-US'] }, 'USD'],
  [{ timeZone: 'Asia/Tokyo', languages: ['ja'] }, 'JPY'],
  [{ timeZone: 'Europe/Zurich', languages: ['de-CH'] }, 'CHF'],
  // ismeretlen időzóna: a nyelvi régió dönt
  [{ timeZone: 'Etc/UTC', languages: ['hu-HU'] }, 'HUF'],
  [{ timeZone: 'Etc/UTC', languages: ['de-AT', 'en'] }, 'EUR'],
  // semmi támpont: dollár
  [{ timeZone: 'Etc/UTC', languages: ['en'] }, 'USD'],
  [{ timeZone: undefined, languages: [] }, 'USD'],
];

for (const [env, target] of cases) {
  test(`${env.timeZone} / ${env.languages.join(',') || '-'} -> ${target}`, () => {
    // ha az ár már a célvalutában van, alapból nem mutat semmit
    assert.deepStrictEqual(defaultCurrencies(env), { target, fallback: 'none' });
  });
}
