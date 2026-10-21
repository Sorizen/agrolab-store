import { getSitemapEntries, getCategoryTree } from './data.js';
import { absoluteUrl } from './seo.js';
import { productPath, categoryUrl } from './slug.js';

const PRODUCTS_PER_FILE = 10000;
const STATIC_PAGES = ['/', '/catalogue', '/about', '/contacts', '/delivery', '/returns', '/terms'];

const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

const date = (value) => (value ? new Date(value).toISOString() : null);

const urlset = (body, extraNamespaces = '') =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${extraNamespaces}>\n${body}</urlset>\n`;

const entry = (loc, lastmod, extra = '') =>
  `  <url><loc>${escapeXml(absoluteUrl(loc))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${extra}</url>\n`;

async function safeEntries() {
  try {
    return await getSitemapEntries();
  } catch {
    return { products: [], categories: [] };
  }
}

export async function sitemapIndex() {
  const { products } = await safeEntries();
  const productFiles = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_FILE));
  const names = ['pages', 'categories', ...Array.from({ length: productFiles }, (_, i) => `products-${i + 1}`)];
  const items = names.map((name) => `  <sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${name}.xml`))}</loc></sitemap>\n`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}</sitemapindex>\n`;
}

export async function sitemapFile(name) {
  if (name === 'pages') return urlset(STATIC_PAGES.map((path) => entry(path)).join(''));
  const { products, categories } = await safeEntries();
  if (name === 'categories') {
    let visible = categories;
    try {
      const tree = await getCategoryTree();
      visible = categories.filter((c) => tree.byId.get(c.id)?.count > 0);
    } catch {}
    return urlset(visible.map((c) => entry(categoryUrl(c))).join(''));
  }
  const match = /^products-(\d+)$/.exec(name);
  if (!match) return null;
  const part = Number(match[1]);
  const chunk = products.slice((part - 1) * PRODUCTS_PER_FILE, part * PRODUCTS_PER_FILE);
  if (part < 1 || (!chunk.length && part > 1)) return null;
  const body = chunk
    .map((p) => entry(productPath(p), date(p.updated_at), p.image ? `<image:image><image:loc>${escapeXml(p.image)}</image:loc></image:image>` : ''))
    .join('');
  return urlset(body, ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
}
