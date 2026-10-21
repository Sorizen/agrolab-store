import { query } from './db.js';
import { fetchSupplierPage, pullConfigured } from './supplier-api.js';
import { notifyPriceCheck } from './telegram.js';
import { getMarkupPercent, retailPrice } from './pricing.js';

const PAGE_SIZE = 100;
const MAX_PAGES = 2000;
const SAMPLE_SIZE = 10;
const EPSILON = 0.005;

const differs = (a, b) => Math.abs(Number(a) - Number(b)) > EPSILON;

async function fetchParserPrices() {
  const prices = new Map();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items, pages } = await fetchSupplierPage({ page, perPage: PAGE_SIZE });
    for (const item of items) {
      const price = Number(item.price);
      if (String(item.status ?? 'active') === 'active' && price > 0) prices.set(Number(item.id), price);
    }
    if (items.length < PAGE_SIZE || (pages && page >= pages)) break;
  }
  return prices;
}

export async function verifyPrices({ since = new Date(0), log = () => {}, notify = true } = {}) {
  if (!pullConfigured()) return { skipped: true };
  const parser = await fetchParserPrices();
  const markup = await getMarkupPercent();
  const { rows } = await query(
    `select id, supplier_id, title, price, supplier_price, sync_locked, synced_at
     from products where supplier_id is not null and active order by id`
  );

  const drift = [];
  const stale = [];
  const manual = [];
  let checked = 0;
  for (const row of rows) {
    const rawPrice = parser.get(row.supplier_id);
    if (rawPrice === undefined) continue;
    checked += 1;
    const expected = retailPrice(rawPrice, markup);
    const entry = { id: row.id, title: row.title, price: row.price, supplierPrice: row.supplier_price, expected };
    if (differs(row.supplier_price, rawPrice)) stale.push({ ...entry, expected: rawPrice });
    if (!row.sync_locked && differs(row.price, expected)) drift.push(entry);
    if (row.sync_locked && differs(row.price, expected) && new Date(row.synced_at) >= since) manual.push(entry);
  }

  const summary = {
    checked,
    drift: drift.length,
    stale: stale.length,
    manual: manual.length,
    samples: { drift: drift.slice(0, SAMPLE_SIZE), stale: stale.slice(0, SAMPLE_SIZE), manual: manual.slice(0, SAMPLE_SIZE) },
  };
  log(`price check: ${checked} checked, ${summary.drift} drift, ${summary.stale} stale, ${summary.manual} manual price moved`);
  if (notify && (summary.drift || summary.stale || summary.manual)) await notifyPriceCheck(summary);
  return summary;
}
