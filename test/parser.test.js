// Futtatás: node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { findPrices, hintsForHost, DECIMAL_MARK } = require('../src/price-parser.js');

const cases = [
  ['12,99 €', 12.99, 'EUR'],
  ['€12.99', 12.99, 'EUR'],
  ['€ 1,234.56', 1234.56, 'EUR'],
  ['1.234,56 €', 1234.56, 'EUR'],
  ['1 234,56 €', 1234.56, 'EUR'],
  ['1 234,56 €', 1234.56, 'EUR'],
  ['1 299 €', 1299, 'EUR'],
  ["1'299.90 EUR", 1299.9, 'EUR'],
  ['EUR 49', 49, 'EUR'],
  ['1.299,- €', 1299, 'EUR'],
  ['19,– €', 19, 'EUR'],
  ['9.99€', 9.99, 'EUR'],
  ['100 euró', 100, 'EUR'],
  ['100 euróért', 100, 'EUR'],
  ['25 eur', 25, 'EUR'],
  ['1.299 €', 1299, 'EUR'],
  ['0,5 €', 0.5, 'EUR'],
  [`12${DECIMAL_MARK}99 €`, 12.99, 'EUR'],
  [`1.299${DECIMAL_MARK}00 €`, 1299, 'EUR'],
  ['4 990 Ft', 4990, 'HUF'],
  ['4990 Ft', 4990, 'HUF'],
  ['4.990 Ft', 4990, 'HUF'],
  ['4,990 Ft', 4990, 'HUF'],
  ['1 249 990 Ft', 1249990, 'HUF'],
  ['12.990,- Ft', 12990, 'HUF'],
  ['HUF 25 000', 25000, 'HUF'],
  ['3500 forint', 3500, 'HUF'],
  ['3500 forintért', 3500, 'HUF'],
  ['4 990 Ft-tól', 4990, 'HUF'],
  ['4 990 HUF', 4990, 'HUF'],
  ['$12.99', 12.99, 'USD'],
  ['$ 1,299.00', 1299, 'USD'],
  ['US$ 49', 49, 'USD'],
  ['20 dollárt', 20, 'USD'],
  ['£9.99', 9.99, 'GBP'],
  ['GBP 1,250', 1250, 'GBP'],
  ['CHF 1\'299.50', 1299.5, 'CHF'],
  ['49,90 CHF', 49.9, 'CHF'],
  ['129,99 zł', 129.99, 'PLN'],
  ['1 299 Kč', 1299, 'CZK'],
  ['249,99 lei', 249.99, 'RON'],
  ['199 kr', 199, 'SEK'],
  ['¥1,280', 1280, 'JPY'],
  ['1,280円', 1280, 'JPY'],
  ['₹2,499', 2499, 'INR'],
  ['C$ 25', 25, 'CAD'],
  ['R$ 59,90', 59.9, 'BRL'],
  ['Rp 150.000', 150000, 'IDR'],
  ['1.234,50 TL', 1234.5, 'TRY'],
  ['999 ₴', 999, 'UAH'],
  ['15 лв.', 15, 'BGN'],
];

for (const [text, amount, currency] of cases) {
  test(`felismeri: ${JSON.stringify(text)}`, () => {
    const found = findPrices(text);
    assert.strictEqual(found.length, 1, `találatok: ${JSON.stringify(found)}`);
    assert.strictEqual(found[0].currency, currency);
    assert.ok(Math.abs(found[0].amount - amount) < 1e-9, `kapott: ${found[0].amount}`);
  });
}

test('mondatban több ár', () => {
  const found = findPrices('Régi ár: 1 299 €, most csak 999,90 € (kb. 390 000 Ft).');
  assert.deepStrictEqual(found.map(f => [f.amount, f.currency]), [
    [1299, 'EUR'], [999.9, 'EUR'], [390000, 'HUF'],
  ]);
});

test('nem keveri az előtte álló számot az árral', () => {
  const found = findPrices('Modell 2024\n1 299 €');
  assert.deepStrictEqual(found.map(f => f.amount), [1299]);
});

const negatives = ['Europa 2024', '2024 Europa', '12 kg', 'Ftw 12', 'Page 1 of 3', '12 Fte', 'EURUSD 1.08',
  '128 GB', 'TOP 10', 'ALL 50', 'USB 3', '100 km', '5 krumpli', 'TRY 30 DAYS'];
for (const text of negatives) {
  test(`nem talál árat: ${JSON.stringify(text)}`, () => {
    assert.deepStrictEqual(findPrices(text), []);
  });
}

test('domain alapján dönt a $, ¥, kr jelentéséről', () => {
  assert.strictEqual(findPrices('$20', hintsForHost('www.amazon.ca'))[0].currency, 'CAD');
  assert.strictEqual(findPrices('$20', hintsForHost('www.ebay.com.au'))[0].currency, 'AUD');
  assert.strictEqual(findPrices('$20', hintsForHost('www.amazon.com'))[0].currency, 'USD');
  assert.strictEqual(findPrices('¥20', hintsForHost('www.jd.cn'))[0].currency, 'CNY');
  assert.strictEqual(findPrices('199 kr', hintsForHost('www.elkjop.no'))[0].currency, 'NOK');
  assert.strictEqual(findPrices('199 kr.', hintsForHost('www.elgiganten.dk'))[0].currency, 'DKK');
});

test('nem-valuta után is megtalálja az árat', () => {
  const found = findPrices('128 GB 499 USD');
  assert.deepStrictEqual(found.map(f => [f.amount, f.currency]), [[499, 'USD']]);
});

const { BLOCK_SEP } = require('../src/price-parser.js');
const multiCases = [
  ['52,9 M Ft', 52.9e6, 'HUF'],
  ['52,9 MFt', 52.9e6, 'HUF'],
  ['120 E Ft', 120e3, 'HUF'],
  ['1,2 Mrd Ft', 1.2e9, 'HUF'],
  ['3 millió forint', 3e6, 'HUF'],
  ['$2.5M', 2.5e6, 'USD'],
  ['€15k', 15e3, 'EUR'],
  ['1 102 083 Ft/m²', 1102083, 'HUF'],
];
for (const [text, amount, currency] of multiCases) {
  test(`szorzó: ${JSON.stringify(text)}`, () => {
    const found = findPrices(text);
    assert.strictEqual(found.length, 1, JSON.stringify(found));
    assert.strictEqual(found[0].currency, currency);
    assert.ok(Math.abs(found[0].amount - amount) < 1e-6, `kapott: ${found[0].amount}`);
  });
}

test('ingatlan.com kártya: a fő ár és a négyzetméterár külön', () => {
  const t = `2 szoba${BLOCK_SEP}54 m²${BLOCK_SEP}52,9 M Ft${BLOCK_SEP}1 102 083 Ft/m²${BLOCK_SEP}Budapest`;
  assert.deepStrictEqual(findPrices(t).map(f => [f.amount, f.text]), [[52.9e6, '52,9 M Ft'], [1102083, '1 102 083 Ft']]);
});

test('blokkhatáron nem nyúlik át', () => {
  assert.deepStrictEqual(findPrices(`Ft${BLOCK_SEP}12 345`), []);
  assert.deepStrictEqual(findPrices(`12 345${BLOCK_SEP}€`), []);
  const amazon = `4,5 / 5${BLOCK_SEP}12,345${BLOCK_SEP}$12.99${BLOCK_SEP}List: $19.99`;
  assert.deepStrictEqual(findPrices(amazon).map(f => f.amount), [12.99, 19.99]);
});
