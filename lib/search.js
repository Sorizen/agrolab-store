export function normalizeCode(value) {
  return String(value || '').toLowerCase().replace(/[^0-9a-zа-яіїєґё]/g, '');
}

export function buildSearchText({ title, article, brand, category, tags, specs } = {}) {
  const parts = [title, article, normalizeCode(article), brand, category];
  if (Array.isArray(tags)) parts.push(...tags);
  if (specs && typeof specs === 'object') {
    for (const [key, value] of Object.entries(specs)) {
      if (!key.startsWith('_') && value != null && typeof value !== 'object') parts.push(String(value));
    }
  }
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

function escapeLike(value) {
  return value.replace(/[\%_]/g, (ch) => `\${ch}`);
}

export function parseSearchQuery(q) {
  const text = String(q || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100);
  const tokens = text.split(' ').filter(Boolean).slice(0, 8);
  const code = normalizeCode(text);
  return {
    text,
    tokenPatterns: tokens.map((t) => `%${escapeLike(t)}%`),
    codePattern: code.length >= 4 ? `%${escapeLike(code)}%` : null,
    prefixPattern: text ? `${escapeLike(text)}%` : null,
  };
}
