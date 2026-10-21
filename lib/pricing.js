import { query } from './db.js';

export const MARKUP_KEY = 'markup_percent';
export const DEFAULT_MARKUP_PERCENT = 5;
export const MAX_MARKUP_PERCENT = 300;

export function parseMarkup(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= MAX_MARKUP_PERCENT ? Math.round(n * 100) / 100 : null;
}

export async function getMarkupPercent() {
  const { rows } = await query('select value from site_settings where key = $1', [MARKUP_KEY]);
  return parseMarkup(rows[0]?.value) ?? DEFAULT_MARKUP_PERCENT;
}

export function retailPrice(supplierPrice, percent) {
  const price = Number(supplierPrice);
  if (!(price > 0)) return 0;
  return Math.ceil(Number((price * (100 + percent)).toFixed(4)) / 100);
}

export const retailSql = (priceExpr, percentParam) =>
  `(case when ${priceExpr} > 0 then ceil(round(${priceExpr} * (100 + ${percentParam}::numeric), 4) / 100) else 0 end)`;

export async function setMarkupPercent(percent) {
  const value = parseMarkup(percent);
  if (value === null) throw new Error(`Націнка має бути числом від 0 до ${MAX_MARKUP_PERCENT}`);
  await query(
    `insert into site_settings (key, value, updated_at) values ($1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [MARKUP_KEY, String(value)]
  );
  const { rowCount } = await query(
    `update products set price = ${retailSql('supplier_price', '$1')}, updated_at = now()
     where supplier_id is not null and not sync_locked
       and price is distinct from ${retailSql('supplier_price', '$1')}`,
    [value]
  );
  return { percent: value, repriced: rowCount };
}
