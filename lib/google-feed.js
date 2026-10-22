import { getFeedBatch, getCategoryTree, categoryPath } from './data.js';
import { absoluteUrl, truncate } from './seo.js';
import { productPath } from './slug.js';

const BATCH = 500;
const BACKORDER_DAYS = 7;
const GOOGLE_CATEGORY = 'Vehicles & Parts > Vehicle Parts & Accessories';

const escapeXml = (value) =>
  String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

const tag = (name, value) => `      <${name}>${escapeXml(value)}</${name}>\n`;

function availabilityTags(product) {
  if (product.availability === 'in_stock') return tag('g:availability', 'in_stock');
  const date = new Date(Date.now() + BACKORDER_DAYS * 86400000).toISOString();
  return tag('g:availability', 'backorder') + tag('g:availability_date', date);
}

function itemXml(product, tree) {
  const images = (product.images || []).filter(Boolean);
  if (!images.length) return '';
  const description = String(product.description || '').replace(/\s+/g, ' ').trim() || product.title;
  const path = product.categoryId ? categoryPath(tree, product.categoryId).map((c) => c.name).join(' > ') : '';
  const hasBrand = Boolean(product.brand);
  const hasMpn = Boolean(product.article);
  let xml = '    <item>\n';
  xml += tag('g:id', product.id);
  xml += tag('title', truncate(product.title, 150));
  xml += tag('description', truncate(description, 5000));
  xml += tag('link', absoluteUrl(productPath(product)));
  xml += tag('g:image_link', images[0]);
  for (const extra of images.slice(1, 11)) xml += tag('g:additional_image_link', extra);
  xml += availabilityTags(product);
  xml += tag('g:price', `${Number(product.price).toFixed(2)} UAH`);
  xml += tag('g:condition', 'new');
  if (hasBrand) xml += tag('g:brand', product.brand);
  if (hasMpn) xml += tag('g:mpn', product.article);
  if (!hasBrand || !hasMpn) xml += tag('g:identifier_exists', 'no');
  if (path) xml += tag('g:product_type', path);
  xml += tag('g:google_product_category', GOOGLE_CATEGORY);
  xml += '    </item>\n';
  return xml;
}

export function googleFeedStream() {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const tree = await getCategoryTree();
        controller.enqueue(
          encoder.encode(
            `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>${escapeXml('Agrolab')}</title>\n    <link>${escapeXml(absoluteUrl('/'))}</link>\n    <description>${escapeXml('Запчастини для тракторів і сільгосптехніки')}</description>\n`
          )
        );
        let afterId = 0;
        for (;;) {
          const batch = await getFeedBatch(afterId, BATCH);
          if (!batch.length) break;
          controller.enqueue(encoder.encode(batch.map((p) => itemXml(p, tree)).join('')));
          afterId = batch[batch.length - 1].id;
        }
        controller.enqueue(encoder.encode('  </channel>\n</rss>\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
