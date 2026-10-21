import { site } from '@/lib/site';

export default function robots() {
  const base = (process.env.SITE_URL || site.url).replace(/\/+$/, '');
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/profile', '/cart'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
