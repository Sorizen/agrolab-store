import { query } from './db.js';

const COUNTED_ORDERS = `o.status <> 'Скасовано'
  and (coalesce(o.payment_method, '') <> 'Оплата карткою онлайн' or o.payment_status in ('Кошти заблоковано', 'Сплачено'))`;

export const popularityMinOrders = () => Math.max(1, Number(process.env.POPULARITY_MIN_ORDERS) || 30);

export async function refreshSalesStats() {
  await query(
    `with sold as (
       select (i->>'id')::bigint as product_id,
              sum((i->>'quantity')::int) as units,
              sum((i->>'quantity')::int) filter (where o.created_at > now() - interval '90 days') as units_90d
       from orders o, jsonb_array_elements(o.items) i
       where ${COUNTED_ORDERS} and (i->>'id') ~ '^[0-9]+$'
       group by 1
     ), target as (
       select p.id, coalesce(s.units, 0) as units, coalesce(s.units_90d, 0) as units_90d
       from products p left join sold s on s.product_id = p.id
     )
     update products p set sales_units = t.units, sales_90d = t.units_90d
     from target t
     where p.id = t.id and (p.sales_units <> t.units or p.sales_90d <> t.units_90d)`
  );
  cached = null;
}

export function refreshSalesInBackground() {
  refreshSalesStats().catch((error) => console.error('Sales stats refresh failed:', error.message));
}

export async function countedOrders() {
  const { rows } = await query(`select count(*) as n from orders o where ${COUNTED_ORDERS}`);
  return rows[0].n;
}

let cached = null;
export async function popularityEnabled() {
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.value;
  let value = false;
  try {
    value = (await countedOrders()) >= popularityMinOrders();
  } catch {
    value = false;
  }
  cached = { value, at: Date.now() };
  return value;
}

export async function salesOverview(limit = 20) {
  const [orders, revenue, top] = await Promise.all([
    countedOrders(),
    query(
      `select coalesce(sum(o.total_amount - o.refunded_amount), 0) as sum, count(*) as n
       from orders o where ${COUNTED_ORDERS} and o.created_at > now() - interval '30 days'`
    ),
    query(
      `select id, title, article, sales_units, sales_90d from products
       where sales_units > 0 order by sales_90d desc, sales_units desc, id limit $1`,
      [limit]
    ),
  ]);
  return {
    orders,
    last30: { orders: revenue.rows[0].n, revenue: revenue.rows[0].sum },
    popularity: { enabled: orders >= popularityMinOrders(), minOrders: popularityMinOrders() },
    top: top.rows,
  };
}
