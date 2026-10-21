const toItem = (product, quantity = 1) => ({
  item_id: String(product.id),
  item_name: product.title,
  item_brand: product.brand || undefined,
  price: Number(product.price) || 0,
  quantity,
});

const queue = [];
let waiting = null;

function flush() {
  if (typeof window.gtag !== 'function') return false;
  while (queue.length) window.gtag('event', ...queue.shift());
  return true;
}

export function track(event, params = {}) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_GA_ID) return;
  queue.push([event, params]);
  if (flush() || waiting) return;
  let tries = 0;
  waiting = setInterval(() => {
    tries += 1;
    if (flush() || tries > 40) {
      clearInterval(waiting);
      waiting = null;
      queue.length = 0;
    }
  }, 250);
}

export const trackViewItem = (product) =>
  track('view_item', { currency: 'UAH', value: Number(product.price) || 0, items: [toItem(product)] });

export const trackAddToCart = (product, quantity) =>
  track('add_to_cart', { currency: 'UAH', value: (Number(product.price) || 0) * quantity, items: [toItem(product, quantity)] });

export const trackBeginCheckout = (cart) =>
  track('begin_checkout', {
    currency: 'UAH',
    value: cart.reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0),
    items: cart.map((i) => toItem(i, i.quantity)),
  });

const PENDING_KEY = 'agrolab_pending_purchase';

export const purchasePayload = (orderId, cart) => ({
  transaction_id: String(orderId),
  currency: 'UAH',
  value: cart.reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0),
  items: cart.map((i) => toItem(i, i.quantity)),
});

export const trackPurchase = (orderId, cart) => track('purchase', purchasePayload(orderId, cart));

export function rememberPendingPurchase(orderId, cart) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(purchasePayload(orderId, cart))); } catch {}
}

export function trackPendingPurchase() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);
    track('purchase', JSON.parse(raw));
  } catch {}
}
