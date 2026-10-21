import { site } from './site.js';

export const siteBase = () => (process.env.SITE_URL || site.url).replace(/\/+$/, '');
export const absoluteUrl = (path = '') => `${siteBase()}${path}`;

export function truncate(text, max) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

export const jsonLdString = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

export function breadcrumbJsonLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const isPlaceholderPhone = (phone) => /^\+38(0{9,10})$/.test(String(phone).replace(/\s/g, ''));

export function organizationJsonLd() {
  const sameAs = [site.telegramUrl].filter((url) => url && !/\/t\.me\/?$/.test(url));
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteBase()}/#organization`,
    name: site.name,
    url: siteBase(),
    logo: absoluteUrl('/images/agrolab-logo.png'),
    email: site.email,
    ...(isPlaceholderPhone(site.phone) ? {} : { telephone: site.phone }),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteBase()}/#website`,
    name: site.name,
    url: siteBase(),
    inLanguage: 'uk-UA',
    publisher: { '@id': `${siteBase()}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteBase()}/catalogue?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
