import { cache } from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { popularityEnabled } from '@/lib/sales';
import { getCatalog, getCatalogFacets, getCategoryTree, categoryPath, findCategoryByName } from '@/lib/data';
import { parseCatalogParams, catalogHref } from '@/lib/catalog-params';
import { parseIdSlug, categoryUrl, productPath, slugify } from '@/lib/slug';
import { absoluteUrl, breadcrumbJsonLd, jsonLdString, truncate } from '@/lib/seo';
import { site } from '@/lib/site';
import CatalogueClient from '@/components/CatalogueClient';

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

const loadCatalogue = cache(async (key) => {
  const filters = JSON.parse(key);
  let tree = { roots: [], byId: new Map(), allCount: 0 };
  let result = EMPTY;
  let facets = { brands: [], priceMin: 0, priceMax: 0 };
  try {
    tree = await getCategoryTree();
    [result, facets] = await Promise.all([getCatalog(filters, tree), getCatalogFacets(filters, tree)]);
  } catch (e) {
    console.error('Catalogue query failed:', e.message);
  }
  return { tree, result, facets, popular: await popularityEnabled() };
});

const slugOfTree = (tree) => (id) => tree.byId.get(Number(id))?.slug || '';

function isFiltered(filters) {
  return Boolean(
    filters.q || filters.brand || filters.minPrice != null || filters.maxPrice != null || filters.inStock || filters.sort !== 'default'
  );
}

const pageSuffix = (page) => (page > 1 ? ` (сторінка ${page})` : '');

export async function catalogueMetadata(sp, categoryParam) {
  const parsed = categoryParam === undefined ? null : parseIdSlug(categoryParam);
  if (categoryParam !== undefined && !parsed) return { title: 'Категорію не знайдено', robots: { index: false } };
  const filters = parseCatalogParams(sp, parsed ? Number(parsed.id) : null);
  const { tree, result, facets } = await loadCatalogue(JSON.stringify(filters));
  const category = filters.categoryId ? tree.byId.get(filters.categoryId) : null;
  if (filters.categoryId && !category) return { title: 'Категорію не знайдено', robots: { index: false } };

  const basePath = category ? categoryUrl(category) : '/catalogue';
  const filtered = isFiltered(filters);
  const canonical = absoluteUrl(!filtered && filters.page > 1 ? `${basePath}?page=${filters.page}` : basePath);

  let title;
  let description;
  if (filters.q) {
    title = `Пошук: ${truncate(filters.q, 50)} | ${site.name}`;
    description = `Результати пошуку «${truncate(filters.q, 60)}» у ${site.name}.`;
  } else if (category) {
    title = `${truncate(category.name, 56)} — купити в Україні${pageSuffix(filters.page)} | ${site.name}`;
    description = truncate(
      `${category.name}: ${category.count.toLocaleString('uk-UA')} товарів${facets.priceMin ? `, ціни від ${facets.priceMin.toLocaleString('uk-UA')} грн` : ''}. Доставка Новою Поштою по Україні, оплата при отриманні.`,
      158
    );
  } else {
    title = `Каталог запчастин для тракторів і сільгосптехніки${pageSuffix(filters.page)} | ${site.name}`;
    description = truncate(
      `Каталог ${site.name}: ${result.total.toLocaleString('uk-UA')} запчастин для тракторів і сільгосптехніки. Пошук за номером деталі, доставка Новою Поштою по Україні.`,
      158
    );
  }
  return {
    title,
    description,
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, type: 'website', locale: 'uk_UA', siteName: site.name },
  };
}

export async function CatalogueView({ sp, categoryParam }) {
  const parsed = categoryParam === undefined ? null : parseIdSlug(categoryParam);
  if (categoryParam !== undefined && !parsed) notFound();
  const filters = parseCatalogParams(sp, parsed ? Number(parsed.id) : null);

  if (!parsed && !filters.categoryId) {
    const tree = (await loadCatalogue(JSON.stringify({ ...filters, page: 1 }))).tree;
    const legacy = typeof sp.category === 'string' ? findCategoryByName(tree, sp.category) : null;
    if (legacy) permanentRedirect(catalogHref(filters, { categoryId: legacy.id }, slugOfTree(tree)));
  }

  const { tree, result, facets, popular } = await loadCatalogue(JSON.stringify(filters));
  const slugOf = slugOfTree(tree);
  const category = filters.categoryId ? tree.byId.get(filters.categoryId) : null;
  if (filters.categoryId && !category) notFound();
  if (category && (!parsed || parsed.slug !== category.slug)) permanentRedirect(catalogHref(filters, { page: filters.page }, slugOf));

  const activePath = category ? categoryPath(tree, category.id) : [];
  const trail = [{ name: 'Головна', path: '/' }, { name: 'Каталог', path: '/catalogue' }, ...activePath.map((c) => ({ name: c.name, path: categoryUrl(c) }))];
  const heading = filters.q ? `Пошук: ${filters.q}` : category ? category.name : 'Каталог запчастин для тракторів і сільгосптехніки';
  const children = category ? category.children.filter((c) => c.count > 0) : [];

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: heading,
    url: absoluteUrl(category ? categoryUrl(category) : '/catalogue'),
    inLanguage: 'uk-UA',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: result.total,
      itemListElement: result.items.slice(0, 40).map((item, index) => ({
        '@type': 'ListItem',
        position: (result.page - 1) * 40 + index + 1,
        url: absoluteUrl(productPath(item)),
        name: item.title,
      })),
    },
  };

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd(trail)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(collection) }} />
      <div className="container">
        <h1 className="catalogue-h1">{heading}</h1>
        {children.length > 0 && (
          <p className="catalogue-subcats">
            {children.slice(0, 14).map((child) => (
              <Link key={child.id} href={categoryUrl(child)}>{child.name} <span>{child.count}</span></Link>
            ))}
          </p>
        )}
        <CatalogueClient
          items={result.items}
          total={result.total}
          page={result.page}
          pages={result.pages}
          filters={filters}
          categories={tree.roots}
          allCount={tree.allCount}
          activePath={activePath}
          facets={facets}
          popular={popular}
        />
      </div>
    </section>
  );
}
