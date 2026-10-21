import { query } from './db.js';
import { buildSearchText, parseSearchQuery } from './search.js';
import { normalizeAvailability } from './availability.js';
import { popularityEnabled } from './sales.js';
import { slugify } from './slug.js';

export const PER_PAGE = 40;
const ADMIN_PER_PAGE = 50;

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

function fromDB(row, { admin = false } = {}) {
  const product = {
    id: row.id,
    title: row.title || '',
    shortDescription: row.short_description || '',
    description: row.description || '',
    price: Number(row.price) || 0,
    priceUnit: row.price_unit || '',
    priceFrom: Boolean(row.price_from),
    stock: row.stock || 0,
    availability: row.availability || 'out_of_stock',
    category: row.category || '',
    categoryId: row.category_id || null,
    brand: row.brand || '',
    featured: Boolean(row.featured),
    images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
    specs: row.specs && typeof row.specs === 'object' ? row.specs : {},
    sections: Array.isArray(row.sections) ? row.sections : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    article: row.article || '',
    weight: num(row.weight),
    length: num(row.length),
    width: num(row.width),
    height: num(row.height),
  };
  if (admin) {
    Object.assign(product, {
      active: row.active !== false,
      supplierId: row.supplier_id || null,
      supplierUrl: row.supplier_url || '',
      supplierPrice: num(row.supplier_price),
      syncLocked: Boolean(row.sync_locked),
      syncedAt: row.synced_at ? new Date(row.synced_at).toISOString() : null,
    });
  }
  return product;
}

function toDB(product) {
  const row = {};
  const copy = (from, to, fn = (v) => v) => {
    if (product[from] !== undefined) row[to] = fn(product[from]);
  };
  copy('title', 'title', (v) => String(v || ''));
  copy('shortDescription', 'short_description', (v) => String(v || ''));
  copy('description', 'description', (v) => String(v || ''));
  copy('price', 'price', (v) => Number(v) || 0);
  copy('priceUnit', 'price_unit', (v) => String(v || '').trim().slice(0, 30));
  copy('priceFrom', 'price_from', Boolean);
  copy('stock', 'stock', (v) => Math.max(0, Math.trunc(Number(v) || 0)));
  copy('availability', 'availability', normalizeAvailability);
  copy('brand', 'brand', (v) => String(v || '').trim());
  copy('featured', 'featured', Boolean);
  copy('active', 'active', Boolean);
  copy('syncLocked', 'sync_locked', Boolean);
  copy('images', 'images', (v) => JSON.stringify(Array.isArray(v) ? v.filter(Boolean) : []));
  copy('sections', 'sections', (v) => JSON.stringify(Array.isArray(v) ? v : []));
  copy('tags', 'tags', (v) => JSON.stringify(Array.isArray(v) ? v : []));
  copy('article', 'article', (v) => String(v || '').trim());
  copy('weight', 'weight', num);
  copy('length', 'length', num);
  copy('width', 'width', num);
  copy('height', 'height', num);

  copy('specs', 'specs', (v) => JSON.stringify(v && typeof v === 'object' ? v : {}));
  return row;
}

const CARD_COLUMNS = `p.id, p.title, p.price, p.specs, p.category, p.category_id, p.brand, p.article,
  p.availability, p.stock, p.featured, p.price_unit, p.price_from,
  case when jsonb_array_length(p.images) > 0 then jsonb_build_array(p.images->0) else '[]'::jsonb end as images`;

const ADMIN_LIST_COLUMNS = `${CARD_COLUMNS}, p.active, p.supplier_id, p.supplier_price, p.sync_locked, p.synced_at`;

function isId(value) {
  return /^\d{1,15}$/.test(String(value ?? ''));
}

let treeCache = null;
const TREE_TTL_MS = 60_000;

export async function getCategoryTree() {
  if (treeCache && Date.now() - treeCache.at < TREE_TTL_MS) return treeCache.value;
  const value = await buildCategoryTree();
  treeCache = { at: Date.now(), value };
  return value;
}

async function buildCategoryTree() {
  const [{ rows: cats }, { rows: counts }] = await Promise.all([
    query('select id, name, parent_id, sort_order from categories order by sort_order, name'),
    query('select category_id, count(*) as n from products where active group by category_id'),
  ]);
  const own = new Map(counts.map((r) => [r.category_id, r.n]));
  const byId = new Map(
    cats.map((c) => [c.id, { id: c.id, name: c.name, slug: slugify(c.name), parentId: c.parent_id, count: 0, children: [] }])
  );
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const total = (node) => {
    node.count = (own.get(node.id) || 0) + node.children.reduce((sum, child) => sum + total(child), 0);
    return node.count;
  };
  roots.forEach(total);

  const allCount = counts.reduce((sum, r) => sum + r.n, 0);
  return { roots, byId, allCount };
}

export function descendantIds(tree, categoryId) {
  const start = tree.byId.get(Number(categoryId));
  if (!start) return [Number(categoryId)];
  const ids = [];
  const stack = [start];
  while (stack.length) {
    const node = stack.pop();
    ids.push(node.id);
    stack.push(...node.children);
  }
  return ids;
}

export function categoryPath(tree, categoryId) {
  const path = [];
  let node = tree.byId.get(Number(categoryId));
  while (node && path.length < 20) {
    path.unshift({ id: node.id, name: node.name, slug: node.slug });
    node = node.parentId ? tree.byId.get(node.parentId) : null;
  }
  return path;
}

export function findCategoryByName(tree, name) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return null;
  for (const node of tree.byId.values()) {
    if (node.name.toLowerCase() === wanted) return node;
  }
  return null;
}

export async function getCategoryOptions() {
  const { roots } = await getCategoryTree();
  const out = [];
  const walk = (nodes, depth) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, depth, count: n.count });
      walk(n.children, depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}

export async function ensureTopCategory(name) {
  const clean = String(name || '').trim().slice(0, 200);
  if (!clean) return null;
  const { rows } = await query(
    `insert into categories (name, parent_id) values ($1, null)
     on conflict ((coalesce(parent_id, 0)), name) do update set name = excluded.name
     returning id`,
    [clean]
  );
  return rows[0].id;
}

function buildWhere(filters, tree, skip = []) {
  const where = ['p.active'];
  const params = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.categoryId && !skip.includes('category')) {
    where.push(`p.category_id = any(${add(descendantIds(tree, filters.categoryId))}::bigint[])`);
  }
  if (filters.q) {
    const s = parseSearchQuery(filters.q);
    const alternatives = [];
    if (s.tokenPatterns.length) {
      alternatives.push(`(${s.tokenPatterns.map((p) => `p.search_text like ${add(p)}`).join(' and ')})`);
    }
    if (s.codePattern) alternatives.push(`p.search_text like ${add(s.codePattern)}`);
    if (alternatives.length) where.push(`(${alternatives.join(' or ')})`);
  }
  if (filters.brand && !skip.includes('brand')) where.push(`p.brand = ${add(filters.brand)}`);
  if (!skip.includes('price')) {
    if (filters.minPrice != null) where.push(`p.price >= ${add(filters.minPrice)}`);
    if (filters.maxPrice != null) where.push(`p.price <= ${add(filters.maxPrice)}`);
  }
  if (filters.inStock) where.push(`p.availability = 'in_stock'`);
  return { where: where.join(' and '), params, add };
}

const SORTS = {
  default: `p.availability = 'in_stock' desc, p.featured desc, p.id desc`,
  'price-asc': 'p.price = 0, p.price asc, p.id desc',
  'price-desc': 'p.price desc, p.id desc',
  'name-asc': 'p.title asc, p.id',
  'name-desc': 'p.title desc, p.id',
  newest: 'p.id desc',
  popular: `p.sales_90d desc, p.availability = 'in_stock' desc, p.featured desc, p.id desc`,
};

export async function getCatalog(filters, tree, perPage = PER_PAGE) {
  const { where, params, add } = buildWhere(filters, tree);
  const whereParams = [...params];
  const page = Math.max(1, Number(filters.page) || 1);

  const defaultSort = (await popularityEnabled()) ? SORTS.popular : SORTS.default;
  let orderBy = filters.sort && filters.sort !== 'default' ? SORTS[filters.sort] || defaultSort : defaultSort;
  if (filters.q && (!filters.sort || filters.sort === 'default')) {

    const s = parseSearchQuery(filters.q);
    orderBy = `lower(p.article) = ${add(s.text)} desc,
      p.search_text like ${add(s.prefixPattern)} desc,
      word_similarity(${add(s.text)}, p.search_text) desc,
      ${defaultSort}`;
  }

  const [{ rows }, { rows: countRows }] = await Promise.all([
    query(
      `select ${CARD_COLUMNS} from products p where ${where}
       order by ${orderBy} limit ${add(perPage)} offset ${add((page - 1) * perPage)}`,
      params
    ),
    query(`select count(*) as n from products p where ${where}`, whereParams),
  ]);
  const total = countRows[0]?.n || 0;
  return {
    items: rows.map((r) => fromDB(r)),
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getCatalogFacets(filters, tree) {
  const brandQ = buildWhere(filters, tree, ['brand']);
  const priceQ = buildWhere(filters, tree, ['price']);
  const [{ rows: brands }, { rows: range }] = await Promise.all([
    query(
      `select p.brand as name, count(*) as count from products p
       where ${brandQ.where} and p.brand <> ''
       group by p.brand order by count(*) desc, p.brand limit 30`,
      brandQ.params
    ),
    query(
      `select min(p.price) filter (where p.price > 0) as min, max(p.price) as max from products p where ${priceQ.where}`,
      priceQ.params
    ),
  ]);
  return {
    brands,
    priceMin: Math.floor(range[0]?.min || 0),
    priceMax: Math.ceil(range[0]?.max || 0),
  };
}

export async function getHomeData(tree) {
  const [{ rows: featured }, { rows: images }, { rows: totals }] = await Promise.all([
    query(`select ${CARD_COLUMNS} from products p where p.active and p.featured order by p.id desc limit 8`),
    query(
      `select distinct on (category_id) category_id, images->>0 as image
       from products where active and category_id is not null and jsonb_array_length(images) > 0
       order by category_id, featured desc, id desc`
    ),
    query('select count(*) as n from products where active'),
  ]);

  let popular = featured;
  if (popular.length < 4) {
    const { rows } = await query(
      `select ${CARD_COLUMNS} from products p
       where p.active and p.availability = 'in_stock' and p.price > 0 and jsonb_array_length(p.images) > 0
       order by p.featured desc, p.id desc limit 8`
    );
    popular = rows;
  }

  const imageByCat = new Map(images.map((r) => [r.category_id, r.image]));
  const firstImage = (node) => {
    if (imageByCat.has(node.id)) return imageByCat.get(node.id);
    for (const child of node.children) {
      const img = firstImage(child);
      if (img) return img;
    }
    return null;
  };
  const topCategories = tree.roots
    .filter((n) => n.count > 0)
    .slice(0, 8)
    .map((n) => ({ id: n.id, name: n.name, slug: n.slug, count: n.count, image: firstImage(n) }));

  return { popular: popular.map((r) => fromDB(r)), topCategories, totalProducts: totals[0]?.n || 0 };
}

export async function getProductById(id, { admin = false } = {}) {
  if (!isId(id)) return null;
  const { rows } = await query(`select * from products where id = $1 ${admin ? '' : 'and active'}`, [id]);
  return rows[0] ? fromDB(rows[0], { admin }) : null;
}

export async function getRelatedProducts(product, limit = 8) {
  if (!product?.categoryId) return [];
  const { rows } = await query(
    `select ${CARD_COLUMNS} from products p
     where p.active and p.category_id = $1 and p.id <> $2
     order by p.availability = 'in_stock' desc, p.id desc limit $3`,
    [product.categoryId, product.id, limit]
  );
  return rows.map((r) => fromDB(r));
}

export async function getProductsForCheckout(ids) {
  const clean = [...new Set(ids.filter(isId).map(Number))];
  if (clean.length === 0) return new Map();
  const { rows } = await query(
    `select id, title, price, article, availability, specs from products where id = any($1::bigint[]) and active`,
    [clean]
  );
  return new Map(rows.map((r) => [r.id, fromDB(r)]));
}

export async function getSitemapEntries() {
  const [{ rows: products }, { rows: categories }] = await Promise.all([
    query(
      `select id, title, updated_at, images->>0 as image
       from products where active order by id limit 45000`
    ),
    query('select id, name from categories order by id limit 5000'),
  ]);
  return { products, categories };
}

export async function listProductsAdmin(filters = {}) {
  const where = ['true'];
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (filters.q) {
    const s = parseSearchQuery(filters.q);
    const alternatives = [];
    if (s.tokenPatterns.length) {
      alternatives.push(`(${s.tokenPatterns.map((p) => `p.search_text like ${add(p)}`).join(' and ')})`);
    }
    if (s.codePattern) alternatives.push(`p.search_text like ${add(s.codePattern)}`);
    if (isId(filters.q.trim())) alternatives.push(`p.id = ${add(Number(filters.q.trim()))}`);
    if (alternatives.length) where.push(`(${alternatives.join(' or ')})`);
  }
  if (filters.source === 'supplier') where.push('p.supplier_id is not null');
  if (filters.source === 'manual') where.push('p.supplier_id is null');
  if (filters.status === 'active') where.push('p.active');
  if (filters.status === 'hidden') where.push('not p.active');
  if (isId(filters.categoryId)) where.push(`p.category_id = ${add(Number(filters.categoryId))}`);

  const page = Math.max(1, Number(filters.page) || 1);
  const whereSql = where.join(' and ');
  const filterParams = [...params];
  const { rows } = await query(
    `select ${ADMIN_LIST_COLUMNS} from products p where ${whereSql}
     order by p.id desc limit ${add(ADMIN_PER_PAGE)} offset ${add((page - 1) * ADMIN_PER_PAGE)}`,
    params
  );
  const { rows: countRows } = await query(`select count(*) as n from products p where ${whereSql}`, filterParams);
  const total = countRows[0]?.n || 0;
  return {
    items: rows.map((r) => fromDB(r, { admin: true })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_PER_PAGE)),
  };
}

async function resolveCategory(product, row) {
  if (product.categoryId !== undefined && product.categoryId !== null && product.categoryId !== '') {
    const { rows } = await query('select id, name from categories where id = $1', [product.categoryId]);
    row.category_id = rows[0]?.id || null;
    row.category = rows[0]?.name || '';
  } else if (product.category !== undefined) {
    const id = await ensureTopCategory(product.category);
    row.category_id = id;
    row.category = id ? String(product.category).trim() : '';
  } else if (product.categoryId === null || product.categoryId === '') {
    row.category_id = null;
    row.category = '';
  }
}

async function refreshSearchText(row) {
  const searchText = buildSearchText(row);
  if (searchText !== row.search_text) {
    await query('update products set search_text = $1 where id = $2', [searchText, row.id]);
    row.search_text = searchText;
  }
}

export async function addProduct(product) {
  const row = toDB(product);
  await resolveCategory(product, row);
  const cols = Object.keys(row);
  const { rows } = await query(
    `insert into products (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
    cols.map((c) => row[c])
  );
  await refreshSearchText(rows[0]);
  return fromDB(rows[0], { admin: true });
}

export async function updateProduct(id, updates) {
  if (!isId(id)) throw new Error('Invalid product id');
  const row = toDB(updates);
  await resolveCategory(updates, row);
  const cols = Object.keys(row);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  const { rows } = await query(
    `update products set ${[...sets, 'updated_at = now()'].join(', ')} where id = $${cols.length + 1} returning *`,
    [...cols.map((c) => row[c]), id]
  );
  if (!rows[0]) throw new Error('Product not found');
  await refreshSearchText(rows[0]);
  return fromDB(rows[0], { admin: true });
}

export async function deleteProduct(id) {
  if (!isId(id)) throw new Error('Invalid product id');
  const { rows } = await query('select supplier_id from products where id = $1', [id]);
  if (!rows[0]) throw new Error('Product not found');
  if (rows[0].supplier_id) {
    await query('update products set active = false, sync_locked = true, updated_at = now() where id = $1', [id]);
    return { id: Number(id), hidden: true };
  }
  await query('delete from products where id = $1', [id]);
  return { id: Number(id), deleted: true };
}

export async function getSettings() {
  try {
    const { rows } = await query('select key, value from site_settings');
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

export async function getSetting(key) {
  try {
    const { rows } = await query('select value from site_settings where key = $1', [key]);
    return rows[0] ? rows[0].value : null;
  } catch {
    return null;
  }
}

export async function setSetting(key, value) {
  await query(
    `insert into site_settings (key, value, updated_at) values ($1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, value == null ? '' : String(value)]
  );
  return true;
}
