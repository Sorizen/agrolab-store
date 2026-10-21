import { query } from './db.js';
import { site } from './site.js';

export const MIN_ORDER_KEY = 'min_order_uah';
export const MAX_MIN_ORDER = 1_000_000;

export function parseMinOrder(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isInteger(n) && n >= 0 && n <= MAX_MIN_ORDER ? n : null;
}

export async function getMinOrder() {
  try {
    const { rows } = await query('select value from site_settings where key = $1', [MIN_ORDER_KEY]);
    return parseMinOrder(rows[0]?.value) ?? site.minOrderUah;
  } catch {
    return site.minOrderUah;
  }
}
