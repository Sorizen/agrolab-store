export const SORT_OPTIONS = [
  ['default', 'За замовчуванням'],
  ['popular', 'Популярні'],
  ['price-asc', 'Ціна: від дешевих'],
  ['price-desc', 'Ціна: від дорогих'],
  ['name-asc', 'Назва: А → Я'],
  ['name-desc', 'Назва: Я → А'],
  ['newest', 'Новинки'],
];
const SORT_KEYS = SORT_OPTIONS.map(([key]) => key);

export function parseCatalogParams(sp = {}, categoryId = null) {
  const str = (key) => (typeof sp[key] === 'string' ? sp[key].trim() : '');
  const price = (key) => {
    const raw = str(key);
    const n = Number(raw);
    return raw !== '' && Number.isFinite(n) && n >= 0 ? n : null;
  };
  return {
    q: str('q').slice(0, 100),
    categoryId: categoryId ?? (/^\d{1,12}$/.test(str('cat')) ? Number(str('cat')) : null),
    brand: str('brand').slice(0, 100),
    minPrice: price('min'),
    maxPrice: price('max'),
    inStock: str('stock') === '1',
    sort: SORT_KEYS.includes(str('sort')) ? str('sort') : 'default',
    page: Math.min(10_000, Math.max(1, parseInt(str('page'), 10) || 1)),
  };
}

export function catalogHref(filters, overrides = {}, slugOf = () => '') {
  const f = { ...filters, ...overrides };
  if (!('page' in overrides)) f.page = 1;
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.brand) p.set('brand', f.brand);
  if (f.minPrice != null) p.set('min', String(f.minPrice));
  if (f.maxPrice != null) p.set('max', String(f.maxPrice));
  if (f.inStock) p.set('stock', '1');
  if (f.sort && f.sort !== 'default') p.set('sort', f.sort);
  if (f.page > 1) p.set('page', String(f.page));
  const qs = p.toString();
  const slug = f.categoryId ? slugOf(f.categoryId) : '';
  const base = f.categoryId ? `/catalogue/${f.categoryId}${slug ? `-${slug}` : ''}` : '/catalogue';
  return qs ? `${base}?${qs}` : base;
}
