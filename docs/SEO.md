# SEO

## What is in place

- **Readable URLs.** Products `/product/123-porshneva-hrupa-d-245`, categories `/catalogue/45-porshneva-hrupa` (`lib/slug.js`). The numeric id leads and is what is looked up; a missing or outdated slug answers with a permanent redirect to the canonical address. Slugs are derived from the title/name at request time, so they follow renames.
- **Canonical and indexing rules** (`app/catalogue/view.js`): filters, sorting and search results are `noindex, follow` with a canonical to the clean category; pagination keeps a self-canonical (`?page=N`). Legacy `?cat=` links redirect to the path form.
- **Titles and descriptions** are built from templates that fit search snippets (`lib/seo.js` `truncate`): product title + part number, price, availability, delivery; category name + product count + lowest price. One `<h1>` per page, subcategory links under the category heading.
- **Structured data:** `Product` (price, availability, sku/mpn, brand, seller, category), `BreadcrumbList` (products and categories), `CollectionPage` + `ItemList` (categories), `Organization` and `WebSite` with sitelinks search (site-wide). A placeholder phone number is never published in the markup.
- **Sitemaps:** `/sitemap.xml` is an index of `/sitemaps/pages.xml`, `categories.xml` and `products-N.xml` (10 000 per file, with `lastmod` and the product image). Split files let Search Console report indexing per type.
- `robots.txt` blocks admin, API, profile and cart.

## When the site goes live

1. Set `SITE_URL` to the final domain before the first build: every canonical and sitemap URL comes from it. Do not index on a temporary domain.
2. Verify the domain in Google Search Console and submit `https://your-domain/sitemap.xml`.
3. Check Page indexing and Product/Breadcrumb rich results after one to two weeks.
