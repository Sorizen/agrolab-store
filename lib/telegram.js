import { query } from './db.js';
import { site } from './site.js';

const CHANNELS = {
  orders: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  alerts: ['TELEGRAM_ALERTS_BOT_TOKEN', 'TELEGRAM_ALERTS_CHAT_ID'],
};

async function send(text, channel = 'orders') {
  const [tokenVar, chatVar] = CHANNELS[channel];
  const token = process.env[tokenVar];
  const chatId = process.env[chatVar];
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`Telegram ${channel} alert failed:`, res.status, (await res.text()).slice(0, 200));
  } catch (error) {
    console.error('Telegram alert failed:', error.message);
  }
}

export async function notifyNewOrder(order) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    const ids = order.items.map((i) => i.id);
    const { rows } = await query('select id, supplier_url from products where id = any($1::bigint[])', [ids]);
    const supplierUrl = new Map(rows.map((r) => [r.id, r.supplier_url]));

    const items = order.items
      .map((item) => {
        const lines = [`• ${item.title} ×${item.quantity} — ${item.price} грн`];
        if (item.article) lines.push(`   Код: ${item.article}`);
        if (supplierUrl.get(item.id)) lines.push(`   ${supplierUrl.get(item.id)}`);
        return lines.join('\n');
      })
      .join('\n');

    await send([
      `🛒 Нове замовлення #${order.id} · ${site.name}`,
      '',
      `👤 ${order.customer_last_name} ${order.customer_first_name}`.trim(),
      `📞 ${order.customer_phone}${order.do_not_call ? ' (не телефонувати)' : ''}`,
      `📍 ${order.delivery_city || '—'}, ${order.delivery_branch || '—'}`,
      '',
      `💰 ${order.total_amount} грн · ${order.payment_method}`,
      order.comment ? `💬 ${order.comment}` : null,
      '',
      `📦 Товари (${order.items.length}):`,
      items,
    ].filter((line) => line !== null).join('\n'));
  } catch (error) {
    console.error('Telegram alert failed:', error.message);
  }
}

export async function notifyNewSupportRequest(request) {
  await send([
    `✉️ Нове звернення #${request.id} · ${site.name}`,
    '',
    `👤 ${[request.customer_first_name, request.customer_last_name].filter(Boolean).join(' ') || '—'}`,
    request.customer_phone ? `📞 ${request.customer_phone}` : null,
    request.customer_email ? `📧 ${request.customer_email}` : null,
    '',
    request.message,
  ].filter((line) => line !== null).join('\n'));
}

const formatPriceLine = (item, label) =>
  `• #${item.id} ${item.title.slice(0, 60)}: у нас ${item.price} грн, ${label} ${item.expected} грн`;

export async function notifyPriceCheck(summary) {
  const sections = [
    summary.drift && [`Ціна не збігається з ціною АГРОЛОСК з націнкою (${summary.drift}):`, ...summary.samples.drift.map((i) => formatPriceLine(i, 'має бути'))],
    summary.stale && [`Не оновлено з парсера (${summary.stale}):`, ...summary.samples.stale.map((i) => formatPriceLine(i, 'парсер'))],
    summary.manual && [`Ручна ціна, а ціна АГРОЛОСК змінилась (${summary.manual}):`, ...summary.samples.manual.map((i) => formatPriceLine(i, 'з націнкою було б'))],
  ].filter(Boolean);
  await send([`⚠️ Звірка цін · ${site.name}`, `Перевірено товарів: ${summary.checked}`, '', ...sections.map((lines) => lines.join('\n')).flatMap((block) => [block, ''])].join('\n').trim(), 'alerts');
}
