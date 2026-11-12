const $ = (id) => document.getElementById(id);
const t = (key, ...subs) => chrome.i18n.getMessage(key, subs) || key;
const uiLang = chrome.i18n.getUILanguage();

const { NONE } = globalThis.HoverPriceDefaults;
const DEFAULTS = globalThis.HoverPriceDefaults.defaultCurrencies();
const FAVORITES = [...new Set([DEFAULTS.target, 'EUR', 'USD', 'GBP', 'CHF', 'HUF', 'PLN', 'CZK', 'RON', 'JPY', 'CAD', 'AUD'])];
// Ha még nincs letöltött árfolyam, ezekből lehet választani.
const BASIC_LIST = [...FAVORITES, 'SEK', 'NOK', 'DKK', 'BGN', 'RSD', 'UAH', 'TRY', 'CNY', 'INR'];

const names = new Intl.DisplayNames([uiLang, 'en'], { type: 'currency' });
const nameOf = (code) => {
  try { return names.of(code) ?? code; } catch { return code; }
};
const fmtTime = new Intl.DateTimeFormat(uiLang, { dateStyle: 'medium', timeStyle: 'short' });

// Statikus feliratok lefordítása (arabnál jobbról balra)
document.documentElement.lang = uiLang;
document.documentElement.dir = chrome.i18n.getMessage('textDirection') === 'rtl' ? 'rtl' : 'ltr';
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);

// withNone: a lista elejére kerül a "Ne mutasson semmit" opció, a valuták pedig "Átváltás ebbe: …" alakban.
function fillSelect(select, codes, selected, { withNone = false } = {}) {
  if (selected !== NONE && !codes.includes(selected)) codes = [selected, ...codes];
  const favs = FAVORITES.filter(c => codes.includes(c));
  const rest = codes.filter(c => !favs.includes(c)).sort((a, b) => nameOf(a).localeCompare(nameOf(b), uiLang));
  const label = (c) => `${nameOf(c)} (${c})`;
  const option = (c) => new Option(withNone ? t('convertTo', label(c)) : label(c), c, false, c === selected);

  const groupFav = document.createElement('optgroup');
  groupFav.label = t('groupCommon');
  groupFav.append(...favs.map(option));
  const groupAll = document.createElement('optgroup');
  groupAll.label = t('groupAll');
  groupAll.append(...rest.map(option));
  select.replaceChildren(groupFav, groupAll);
  if (withNone) select.prepend(new Option(t('fallbackNone'), NONE, false, selected === NONE));
  select.value = selected;
}

function renderStatus(data, error) {
  $('status').textContent = data?.fetchedAt ? t('ratesUpdated', fmtTime.format(data.fetchedAt)) : t('noRates');
  $('status').title = data?.source ? t('source', data.source) : '';
  $('error').hidden = !error;
  $('error').textContent = error ? t('downloadError', error) : '';
}

async function loadRates(force) {
  const btn = $('refresh');
  btn.disabled = true;
  try {
    const data = await chrome.runtime.sendMessage({ type: force ? 'refreshRates' : 'getRates' });
    const { lastError } = await chrome.storage.local.get('lastError');
    renderStatus(data, data?.rates && !force ? null : lastError);
    return data;
  } catch (err) {
    renderStatus(null, err.message);
    return null;
  } finally {
    btn.disabled = false;
  }
}

async function init() {
  const settings = { ...DEFAULTS, ...(await chrome.storage.sync.get(Object.keys(DEFAULTS))) };

  const fill = (codes) => {
    fillSelect($('target'), codes, settings.target);
    fillSelect($('fallback'), codes, settings.fallback, { withNone: true });
  };
  fill(BASIC_LIST);

  $('target').addEventListener('change', (e) => {
    settings.target = e.target.value;
    chrome.storage.sync.set({ target: settings.target });
  });
  $('fallback').addEventListener('change', (e) => {
    settings.fallback = e.target.value;
    chrome.storage.sync.set({ fallback: settings.fallback });
  });
  $('refresh').addEventListener('click', async () => {
    const data = await loadRates(true);
    if (data?.rates) fill(Object.keys(data.rates));
  });

  const data = await loadRates(false);
  if (data?.rates) fill(Object.keys(data.rates));
}

init().catch((err) => renderStatus(null, err.message));
