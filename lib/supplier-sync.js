import { query } from './db.js';
import { buildSearchText } from './search.js';
import { normalizeAvailability } from './availability.js';
import { isPublishable, publishSettings } from './publish-rules.js';
import { fetchSupplierPage, pullConfigured } from './supplier-api.js';
import { verifyPrices } from './price-check.js';
import { getMarkupPercent, retailSql } from './pricing.js';

export { pullConfigured, refreshSupplierService } from './supplier-api.js';

const BATCH_SIZE = 500;
const PAGE_SIZE = 100;
const MAX_PAGES = 2000;
const RUN_STALE_MINUTES = 30;

const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function validDate(v) {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

function supplierPrice(raw) {
  if (raw.price === undefined) return undefined;
  const n = Number(raw.price);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function normalizeSupplierItem(raw, rules = publishSettings()) {
  const id = Number(raw?.id);
  if (!Number.isSafeInteger(id) || id <= 0) return { kind: 'skip', reason: 'no id' };

  const currency = clean(raw.currency || 'UAH', 10).toUpperCase();
  if (currency !== 'UAH') return { kind: 'skip', reason: `currency ${currency}` };

  const hasStatus = raw.status !== undefined && raw.status !== null;
  const statusActive = !hasStatus || String(raw.status).toLowerCase() === 'active';
  const availability =
    raw.availability === undefined && !hasStatus
      ? undefined
      : statusActive
        ? normalizeAvailability(raw.availability)
        : 'out_of_stock';

  if (raw.title === undefined) {
    return {
      kind: 'price',
      supplier_id: id,
      supplier_price: supplierPrice(raw) ?? null,
      availability: availability ?? null,
      active: hasStatus ? statusActive : null,
    };
  }

  const specs = {};
  for (const attr of Array.isArray(raw.attributes) ? raw.attributes : []) {
    const name = clean(attr?.name, 120).replace(/^_+/, '');
    const value = clean(attr?.value, 500);
    if (!name || !value) continue;
    if (specs[name] && specs[name] !== value) specs[name] = `${specs[name]}, ${value}`;
    else specs[name] = value;
  }

  const images = [...new Set([raw.main_image, ...(Array.isArray(raw.images) ? raw.images : [])])]
    .filter(isHttpUrl)
    .map((u) => u.trim())
    .slice(0, 15);

  const title = clean(raw.title, 500);
  const price = supplierPrice(raw) ?? 0;
  return {
    kind: 'full',
    supplier_id: id,
    title,
    description: clean(raw.description, 20000),
    article: clean(raw.part_number, 100),
    brand: clean(raw.brand, 100),
    images,
    specs,
    categoryPath: (Array.isArray(raw.category_path) ? raw.category_path : [])
      .map((s) => clean(s, 200))
      .filter(Boolean)
      .slice(0, 8),
    supplier_price: price,
    price_unit: /^шт\.?$/i.test(clean(raw.price_unit, 30)) ? '' : clean(raw.price_unit, 30),
    price_from: raw.price_from === true,
    availability: availability ?? 'out_of_stock',
    active: statusActive && isPublishable({ title, price, imageCount: images.length }, rules),
    supplier_url: isHttpUrl(raw.url) ? raw.url.trim() : null,
    first_seen_at: validDate(raw.first_seen_at),
  };
}

async function loadCategoryCache() {
  const { rows } = await query('select id, name, coalesce(parent_id, 0) as parent from categories');
  return new Map(rows.map((r) => [`${r.parent}\u0001${r.name}`, r.id]));
}

async function ensureCategoryPath(path, cache) {
  let parent = 0;
  for (const name of path) {
    const key = `${parent}\u0001${name}`;
    if (!cache.has(key)) {
      const { rows } = await query(
        `insert into categories (name, parent_id) values ($1, $2)
         on conflict ((coalesce(parent_id, 0)), name) do update set name = excluded.name
         returning id`,
        [name, parent || null]
      );
      cache.set(key, rows[0].id);
    }
    parent = cache.get(key);
  }
  return parent || null;
}

const UPSERT_SQL = `
with incoming as (
  select * from jsonb_to_recordset($1::jsonb) as x(
    supplier_id bigint, title text, description text, article text, brand text,
    category text, category_id bigint, images jsonb, specs jsonb, supplier_price numeric,
    price_unit text, price_from boolean, availability text, active boolean, supplier_url text, search_text text, first_seen_at timestamptz)
)
insert into products as p (
  supplier_id, title, description, article, brand, category, category_id, images, specs,
  supplier_price, price, price_unit, price_from, availability, active, supplier_url, search_text, synced_at, created_at, updated_at)
select
  supplier_id, title, description, article, brand, category, category_id, images, specs,
  supplier_price, ${retailSql('supplier_price', '$2')}, coalesce(price_unit, ''), coalesce(price_from, false), availability, active, supplier_url, search_text,
  now(), coalesce(first_seen_at, now()), now()
from incoming
on conflict (supplier_id) do update set
  supplier_price = excluded.supplier_price,
  price_unit     = excluded.price_unit,
  price_from     = excluded.price_from,
  availability   = excluded.availability,
  supplier_url   = excluded.supplier_url,
  title          = case when p.sync_locked then p.title else excluded.title end,
  description    = case when p.sync_locked then p.description else excluded.description end,
  article        = case when p.sync_locked then p.article else excluded.article end,
  brand          = case when p.sync_locked then p.brand else excluded.brand end,
  category       = case when p.sync_locked then p.category else excluded.category end,
  category_id    = case when p.sync_locked then p.category_id else excluded.category_id end,
  images         = case when p.sync_locked then p.images else excluded.images end,
  specs          = case when p.sync_locked then p.specs else excluded.specs end,
  search_text    = case when p.sync_locked then p.search_text else excluded.search_text end,
  price          = case when p.sync_locked then p.price else excluded.price end,
  active         = case when p.sync_locked then p.active else excluded.active end,
  synced_at      = now(),
  updated_at     = now()
where p.supplier_price is distinct from excluded.supplier_price
   or p.price_unit     is distinct from excluded.price_unit
   or p.price_from     is distinct from excluded.price_from
   or p.availability   is distinct from excluded.availability
   or p.supplier_url   is distinct from excluded.supplier_url
   or (not p.sync_locked and (
        p.title is distinct from excluded.title
     or p.description is distinct from excluded.description
     or p.article is distinct from excluded.article
     or p.brand is distinct from excluded.brand
     or p.category_id is distinct from excluded.category_id
     or p.images is distinct from excluded.images
     or p.search_text is distinct from excluded.search_text
     or p.price is distinct from excluded.price
     or p.active is distinct from excluded.active))
returning (xmax = 0) as inserted`;

const PUBLISHABLE_SQL = `(m.active and p.title <> '' and m.supplier_price > $2::numeric
  and (not $3::boolean or jsonb_array_length(p.images) > 0))`;

const PRICE_UPDATE_SQL = `
with incoming as (
  select * from jsonb_to_recordset($1::jsonb) as x(
    supplier_id bigint, supplier_price numeric, availability text, active boolean)
), merged as (
  select p.id, p.sync_locked,
         coalesce(x.supplier_price, p.supplier_price) as supplier_price,
         coalesce(x.availability, p.availability) as availability,
         coalesce(x.active, p.active) as active
  from incoming x join products p on p.supplier_id = x.supplier_id
)
update products p set
  supplier_price = m.supplier_price,
  availability   = m.availability,
  price          = case when m.sync_locked then p.price else ${retailSql('m.supplier_price', '$4')} end,
  active         = case when m.sync_locked then p.active else ${PUBLISHABLE_SQL} end,
  synced_at      = now(),
  updated_at     = now()
from merged m
where p.id = m.id
  and (p.supplier_price is distinct from m.supplier_price
    or p.availability is distinct from m.availability
    or (not m.sync_locked and (
         p.active is distinct from ${PUBLISHABLE_SQL}
      or p.price is distinct from ${retailSql('m.supplier_price', '$4')})))`;

async function writeFullBatch(items, ctx) {
  const rows = [];
  for (const item of items) {
    const categoryId = await ensureCategoryPath(item.categoryPath, ctx.categories);
    const category = item.categoryPath[item.categoryPath.length - 1] || '';
    rows.push({
      ...item,
      categoryPath: undefined,
      category,
      category_id: categoryId,
      search_text: buildSearchText({ ...item, category }),
    });
  }
  const { rows: result } = await query(UPSERT_SQL, [JSON.stringify(rows), ctx.markup]);
  const inserted = result.filter((r) => r.inserted).length;
  return { inserted, updated: result.length - inserted };
}

async function writePriceBatch(items, ctx) {
  const { rowCount } = await query(PRICE_UPDATE_SQL, [JSON.stringify(items), ctx.minPrice, ctx.requireImage, ctx.markup]);
  return { inserted: 0, updated: rowCount };
}

async function createContext() {
  return { ...publishSettings(), markup: await getMarkupPercent(), categories: await loadCategoryCache() };
}

export async function importItems(rawItems, ctx) {
  const stats = { received: rawItems.length, inserted: 0, updated: 0, skipped: 0, seenIds: [] };

  const byId = new Map();
  for (const raw of rawItems) {
    const item = normalizeSupplierItem(raw, ctx);
    if (item.kind === 'skip') stats.skipped += 1;
    else byId.set(item.supplier_id, item);
  }
  const full = [];
  const prices = [];
  for (const item of byId.values()) {
    stats.seenIds.push(item.supplier_id);
    if (item.kind === 'full') full.push(item);
    else prices.push(item);
  }
  for (let i = 0; i < full.length; i += BATCH_SIZE) {
    const r = await writeFullBatch(full.slice(i, i + BATCH_SIZE), ctx);
    stats.inserted += r.inserted;
    stats.updated += r.updated;
  }
  for (let i = 0; i < prices.length; i += BATCH_SIZE) {
    const r = await writePriceBatch(prices.slice(i, i + BATCH_SIZE), ctx);
    stats.updated += r.updated;
  }
  return stats;
}

async function hideUnseen(seenIds) {
  const { rows } = await query('select count(*) as n from products where supplier_id is not null and active');
  const visible = rows[0].n;
  if (visible > 0 && seenIds.length < visible * 0.5) {
    return {
      hidden: 0,
      warning: `Пропущено приховування: отримано ${seenIds.length} товарів, а на сайті ${visible}. Схоже на неповну відповідь постачальника.`,
    };
  }
  const { rowCount } = await query(
    `update products set
       active = case when sync_locked then active else false end,
       availability = 'out_of_stock', synced_at = now(), updated_at = now()
     where supplier_id is not null
       and not (supplier_id = any($1::bigint[]))
       and (availability <> 'out_of_stock' or (active and not sync_locked))`,
    [seenIds]
  );
  return { hidden: rowCount };
}

async function startRun(mode) {
  const { rows } = await query('insert into supplier_sync_runs (mode) values ($1) returning id', [mode]);
  return rows[0].id;
}

async function finishRun(id, status, stats, message) {
  await query(
    `update supplier_sync_runs set status = $2, finished_at = now(), received = $3, inserted = $4,
       updated = $5, hidden = $6, skipped = $7, message = $8 where id = $1`,
    [id, status, stats.received || 0, stats.inserted || 0, stats.updated || 0, stats.hidden || 0, stats.skipped || 0, message || null]
  );
}

export async function runningPull() {
  const { rows } = await query(
    `select id, mode, started_at from supplier_sync_runs
     where status = 'running' and mode in ('full', 'updates') and started_at > now() - ($1 || ' minutes')::interval
     order by started_at desc limit 1`,
    [String(RUN_STALE_MINUTES)]
  );
  return rows[0] || null;
}

async function assertNotRunning() {
  const running = await runningPull();
  if (running) throw new Error(`Синхронізація #${running.id} ще виконується`);
}

export async function importAndLog(rawItems, { mode, full = false }) {
  const runId = await startRun(mode);
  const stats = { received: 0, inserted: 0, updated: 0, skipped: 0, hidden: 0 };
  try {
    const ctx = await createContext();
    const r = await importItems(rawItems, ctx);
    Object.assign(stats, r);
    let message = null;
    if (full) {
      const h = await hideUnseen(r.seenIds);
      stats.hidden = h.hidden;
      message = h.warning || null;
    }
    delete stats.seenIds;
    await finishRun(runId, 'ok', stats, message);
    return { runId, ...stats, message };
  } catch (error) {
    await finishRun(runId, 'error', stats, error.message).catch(() => {});
    throw error;
  }
}

export async function runSupplierSync({ mode = 'updates', log = () => {} } = {}) {
  if (!pullConfigured()) throw new Error('SUPPLIER_API_URL is not set');
  await assertNotRunning();

  let updatedSince = null;
  if (mode === 'updates') {
    const { rows } = await query(
      `select started_at from supplier_sync_runs
       where status = 'ok' and mode in ('full', 'updates') order by started_at desc limit 1`
    );

    if (rows[0]) updatedSince = new Date(new Date(rows[0].started_at).getTime() - 5 * 60_000).toISOString();
    else mode = 'full';
  }

  const startedAt = new Date();
  const runId = await startRun(mode);
  const stats = { received: 0, inserted: 0, updated: 0, skipped: 0, hidden: 0 };
  const seenIds = [];
  try {
    const ctx = await createContext();
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const { items, pages } = await fetchSupplierPage({ page, perPage: PAGE_SIZE, updatedSince });
      const r = await importItems(items, ctx);
      stats.received += r.received;
      stats.inserted += r.inserted;
      stats.updated += r.updated;
      stats.skipped += r.skipped;
      seenIds.push(...r.seenIds);
      log(`page ${page}${pages ? `/${pages}` : ''}: ${items.length} items (total ${stats.received})`);
      if (items.length < PAGE_SIZE || (pages && page >= pages)) break;
    }
    let message = null;
    if (mode === 'full') {
      const h = await hideUnseen(seenIds);
      stats.hidden = h.hidden;
      message = h.warning || null;
    }
    await finishRun(runId, 'ok', stats, message);
    const priceCheck = await verifyPrices({ since: startedAt, log }).catch((error) => ({ error: error.message }));
    return { runId, mode, ...stats, message, priceCheck };
  } catch (error) {
    await finishRun(runId, 'error', stats, error.message).catch(() => {});
    throw error;
  }
}

export async function getSyncOverview() {
  const [{ rows: counts }, { rows: runs }] = await Promise.all([
    query(`select
        count(*) filter (where supplier_id is not null) as supplier_total,
        count(*) filter (where supplier_id is not null and active) as supplier_active,
        count(*) filter (where supplier_id is not null and not active) as supplier_hidden,
        count(*) filter (where supplier_id is not null and sync_locked) as supplier_locked,
        count(*) filter (where supplier_id is null) as manual_total
      from products`),
    query('select * from supplier_sync_runs order by started_at desc limit 10'),
  ]);
  return {
    counts: counts[0],
    runs,
    pullConfigured: pullConfigured(),
    pushConfigured: Boolean(process.env.SUPPLIER_SYNC_SECRET),
  };
}
