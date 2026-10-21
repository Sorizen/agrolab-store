const LETTERS = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: '', ё: 'e',
};

export function slugify(text, max = 70) {
  const latin = String(text ?? '')
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (ch) => LETTERS[ch] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (latin.length <= max) return latin;
  const cut = latin.slice(0, max);
  const boundary = cut.lastIndexOf('-');
  return (boundary > max * 0.5 ? cut.slice(0, boundary) : cut).replace(/-+$/, '');
}

const withSlug = (base, id, text) => {
  const slug = slugify(text);
  return slug ? `${base}/${id}-${slug}` : `${base}/${id}`;
};

export const productPath = (product) => withSlug('/product', product.id, product.title);
export const categoryUrl = (category) => withSlug('/catalogue', category.id, category.name);

export function parseIdSlug(param) {
  let value = String(param ?? '');
  try { value = decodeURIComponent(value); } catch {}
  const match = /^(\d{1,15})(?:-(.*))?$/.exec(value);
  return match ? { id: match[1], slug: match[2] || '' } : null;
}
