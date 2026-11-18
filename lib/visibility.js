import { query } from './db.js';
import { publishSettings } from './publish-rules.js';

const FLAGS = { hidden: 'hidden_effective', own_photos: 'own_photos_effective' };

const effectiveCategorySql = (column, field) =>
  `coalesce((select ec.${field} from categories ec where ec.id = ${column}), false)`;

export const hiddenCategorySql = (column) => effectiveCategorySql(column, 'hidden_effective');
export const ownPhotosCategorySql = (column) => effectiveCategorySql(column, 'own_photos_effective');

async function spreadFlag(flag) {
  const effective = FLAGS[flag];
  await query(
    `with recursive tree as (
       select id, ${flag} as v from categories where parent_id is null
       union all
       select c.id, c.${flag} or t.v from categories c join tree t on c.parent_id = t.id
     )
     update categories c set ${effective} = t.v
     from tree t where c.id = t.id and c.${effective} is distinct from t.v`
  );
}

export async function applyCategoryVisibility() {
  await spreadFlag('hidden');
  const { requireImage } = publishSettings();
  const shown = `(coalesce(p.supplier_active, p.active) and (not $1::boolean or jsonb_array_length(p.images) > 0)
    and not ${hiddenCategorySql('p.category_id')})`;
  const { rowCount } = await query(
    `update products p set active = ${shown}, updated_at = now()
     where p.supplier_id is not null and not p.sync_locked and p.active is distinct from ${shown}`,
    [requireImage]
  );
  return rowCount;
}

export async function refreshProductActive(id) {
  const { requireImage } = publishSettings();
  await query(
    `update products p set
       active = coalesce(p.supplier_active, p.active) and (not $2::boolean or jsonb_array_length(p.images) > 0)
         and not ${hiddenCategorySql('p.category_id')},
       updated_at = now()
     where p.id = $1 and p.supplier_id is not null and not p.sync_locked`,
    [id, requireImage]
  );
}

export async function setCategoryHidden(id, hidden) {
  const { rowCount } = await query('update categories set hidden = $2 where id = $1', [id, Boolean(hidden)]);
  if (!rowCount) throw new Error('Category not found');
  return applyCategoryVisibility();
}

export async function setCategoryOwnPhotos(id, value) {
  const { rowCount } = await query('update categories set own_photos = $2 where id = $1', [id, Boolean(value)]);
  if (!rowCount) throw new Error('Category not found');
  await spreadFlag('own_photos');
}

export async function categoryVisibilityTree() {
  const [{ rows: cats }, { rows: counts }] = await Promise.all([
    query('select id, name, parent_id, hidden, hidden_effective, own_photos, own_photos_effective from categories order by sort_order, name'),
    query('select category_id, count(*) as total, count(*) filter (where active) as visible from products group by category_id'),
  ]);
  const own = new Map(counts.map((r) => [r.category_id, r]));
  const byId = new Map(cats.map((c) => [c.id, {
    id: c.id, name: c.name, hidden: c.hidden, inherited: c.hidden_effective && !c.hidden,
    ownPhotos: c.own_photos, ownPhotosInherited: c.own_photos_effective && !c.own_photos,
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
