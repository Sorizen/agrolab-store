import { query } from './db.js';
import { publishSettings } from './publish-rules.js';
import { hiddenCategorySql, ownPhotosCategorySql } from './visibility.js';
import { notifyMissingPhotos } from './telegram.js';

const BATCH_LIMIT = 60;

export async function alertProductsWithoutPhotos() {
  try {
    if (!publishSettings().requireImage) return 0;
    await query(
      `update products set photo_alerted_at = null
       where photo_alerted_at is not null and (supplier_active is not true or jsonb_array_length(images) > 0)`
    );
    const { rows } = await query(
      `select p.id, p.title, p.article, p.price, p.supplier_url from products p
       where p.supplier_id is not null and p.supplier_active and not p.active and not p.sync_locked
         and jsonb_array_length(p.images) = 0 and p.photo_alerted_at is null
         and (p.images_locked or ${ownPhotosCategorySql('p.category_id')})
         and not ${hiddenCategorySql('p.category_id')}
       order by p.id limit ${BATCH_LIMIT}`
    );
    if (!rows.length) return 0;
    if (!(await notifyMissingPhotos(rows))) return 0;
    await query('update products set photo_alerted_at = now() where id = any($1::bigint[])', [rows.map((r) => r.id)]);
    return rows.length;
  } catch (error) {
    console.error('Photo alert failed:', error.message);
    return 0;
  }
}
