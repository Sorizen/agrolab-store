const DEFAULT_MIN_PRICE = 1;

export function publishSettings() {
  const raw = process.env.PUBLISH_MIN_PRICE;
  const minPrice = raw === undefined || raw === '' ? DEFAULT_MIN_PRICE : Number(raw);
  return {
    minPrice: Number.isFinite(minPrice) ? minPrice : DEFAULT_MIN_PRICE,
    requireImage: process.env.PUBLISH_REQUIRE_IMAGE !== 'false',
  };
}

export function isPublishable({ title, price, imageCount }, rules = publishSettings()) {
  if (!title) return false;
  if (!(price > rules.minPrice)) return false;
  if (rules.requireImage && !imageCount) return false;
  return true;
}
