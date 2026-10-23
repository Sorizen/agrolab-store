import { readFile } from 'node:fs/promises';

const site = (process.env.SITE_URL || 'https://agrolab.com.ua').replace(/\/+$/, '');
const host = new URL(site).host;
const keyArg = process.argv.find((a) => a.startsWith('--key='));
const key = keyArg ? keyArg.slice(6) : process.env.INDEXNOW_KEY;
if (!key) {
  console.error('Pass the key: --key=<key> or INDEXNOW_KEY');
  process.exit(1);
}

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

const index = locs(await get(`${site}/sitemap.xml`));
const urls = [];
for (const sitemap of index) urls.push(...locs(await get(sitemap)));

const unique = [...new Set(urls)];
console.log(`urls: ${unique.length}`);

const LIMIT = 500;
for (let i = 0; i < unique.length; i += LIMIT) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: unique.slice(i, i + LIMIT) }),
  });
  console.log(`batch ${i / LIMIT + 1}: ${res.status} ${res.statusText}`);
}
