export const AVAILABILITY_LABELS = {
  in_stock: 'В наявності',
  on_order: 'Під замовлення',
  out_of_stock: 'Немає в наявності',
};

export function normalizeAvailability(raw) {
  if (raw === true) return 'in_stock';
  const v = String(raw ?? '').toLowerCase().trim();
  if (!v || v === 'false') return 'out_of_stock';
  if (v === 'unknown') return 'on_order';
  if (/out|not|unavail|absent|none|no_stock|нема/.test(v)) return 'out_of_stock';
  if (/order|pre|wait|замовл/.test(v)) return 'on_order';
  if (/in_stock|instock|available|yes|true|stock|ready|ship|налич|наявн|готов/.test(v)) return 'in_stock';
  return 'out_of_stock';
}

export function isInStock(product) {
  return product?.availability === 'in_stock';
}

export function isOrderable(product) {
  return Boolean(product) && product.price > 0 && product.availability !== 'out_of_stock';
}
