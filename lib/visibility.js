import { query } from './db.js';

export const hiddenCategorySql = (column) =>
  `coalesce((select hc.hidden_effective from categories hc where hc.id = ${column}), false)`;

export async function applyCategoryVisibility() {
  await query(
    `with recursive tree as (
       select id, hidden as h from categories where parent_id is null
       union all
       select c.id, c.hidden or t.h from categories c join tree t on c.parent_id = t.id
     )
     update categories c set hidden_effective = t.h
     from tree t where c.id = t.id and c.hidden_effective is distinct from t.h`
  );
  const { rowCount } = await query(
    `update products p set
       active = coalesce(p.supplier_active, p.active) and not ${hiddenCategorySql('p.category_id')},
       updated_at = now()
     where p.supplier_id is not null and not p.sync_locked
       and p.active is distinct from (coalesce(p.supplier_active, p.active) and not ${hiddenCategorySql('p.category_id')})`
  );
  return rowCount;
}

export async function setCategoryHidden(id, hidden) {
  const { rowCount } = await query('update categories set hidden = $2 where id = $1', [id, Boolean(hidden)]);
  if (!rowCount) throw new Error('Category not found');
  return applyCategoryVisibility();
}

export async function categoryVisibilityTree() {
  const [{ rows: cats }, { rows: counts }] = await Promise.all([
    query('select id, name, parent_id, hidden, hidden_effective from categories order by sort_order, name'),
    query('select category_id, count(*) as total, count(*) filter (where active) as visible from products group by category_id'),
  ]);
  const own = new Map(counts.map((r) => [r.category_id, r]));
  const byId = new Map(cats.map((c) => [c.id, {
    id: c.id, name: c.name, hidden: c.hidden, inherited: c.hidden_effective && !c.hidden,
    total: 0, visible: 0, children: [], parentId: c.parent_id,
  }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sum = (node) => {
    const o = own.get(node.id);
    node.total = (o?.total || 0) + node.children.reduce((s, ch) => s + sum(ch).total, 0);
    node.visible = (o?.visible || 0) + node.children.reduce((s, ch) => s + ch.visible, 0);
    return node;
  };
  roots.forEach(sum);
  const strip = ({ parentId, children, ...rest }) => ({ ...rest, children: children.map(strip) });
  return roots.map(strip);
}
