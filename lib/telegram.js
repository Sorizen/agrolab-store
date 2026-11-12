import { query } from './db.js';
import { site } from './site.js';
import { productPath } from './slug.js';

const CHANNELS = {
  orders: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_THREAD_ID'],
  alerts: ['TELEGRAM_ALERTS_BOT_TOKEN', 'TELEGRAM_ALERTS_CHAT_ID', 'TELEGRAM_ALERTS_THREAD_ID'],
};

async function send(text, channel = 'orders', { html = false } = {}) {
  const [tokenVar, chatVar, threadVar] = CHANNELS[channel];
  const token = process.env[tokenVar];
  const chatId = process.env[chatVar];
  const threadId = Number(process.env[threadVar]) || undefined;
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_thread_id: threadId,
        text: html ? text : text.slice(0, 4000),
        ...(html ? { parse_mode: 'HTML' } : {}),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`Telegram ${channel} alert failed:`, res.status, (await res.text()).slice(0, 200));
  } catch (error) {
    console.error('Telegram alert failed:', error.message);
  }
}

const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (value) => `${Number(value).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн`;
const RULE = '───────────────';
const MAX_MESSAGE = 3800;

function invoiceLine(item, index, product) {
  const quantity = Number(item.quantity) || 1;
  const price = Number(item.price) || 0;
  const cost = product?.supplier_price == null ? null : Number(product.supplier_price);
  const links = [
    product?.supplier_url ? `<a href="${escapeHtml(product.supplier_url)}">Постачальник</a>` : null,
    `<a href="${escapeHtml(site.url + productPath({ id: item.id, title: item.title }))}">На сайті</a>`,
  ].filter(Boolean).join(' · ');
  return [
    `${index + 1}. <b>${escapeHtml(item.title)}</b>`,
    item.article ? `    Код: <code>${escapeHtml(item.article)}</code>` : null,
    `    Наша ціна: ${money(price)} × ${quantity} = <b>${money(price * quantity)}</b>`,
    `    Закупівля: ${cost == null ? '—' : `${money(cost)} × ${quantity} = ${money(cost * quantity)}`}`,
    `    ${links}`,
  ].filter((line) => line !== null).join('\n');
}

function packMessages(head, blocks, tail) {
  const messages = [];
  let current = head;
  for (const block of blocks) {
    if (current.length + block.length + 2 > MAX_MESSAGE) {
      messages.push(current);
      current = '';
    }
    current = current ? `${current}\n\n${block}` : block;
  }
  messages.push(`${current}\n\n${tail}`);
  return messages;
}

export async function notifyNewOrder(order) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    const ids = order.items.map((i) => i.id);
    const { rows } = await query('select id, supplier_url, supplier_price from products where id = any($1::bigint[])', [ids]);
    const products = new Map(rows.map((r) => [Number(r.id), r]));

    const sale = order.items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const known = order.items.every((i) => products.get(Number(i.id))?.supplier_price != null);
    const cost = known
      ? order.items.reduce((sum, i) => sum + Number(products.get(Number(i.id)).supplier_price) * (Number(i.quantity) || 1), 0)
      : null;

    const head = [
      `🛒 <b>Нове замовлення #${escapeHtml(order.id)}</b> · ${escapeHtml(site.name)}`,
      '',
      `👤 ${escapeHtml(`${order.customer_last_name} ${order.customer_first_name}`.trim())}`,
      `📞 ${escapeHtml(order.customer_phone)}${order.do_not_call ? ' (не телефонувати)' : ''}`,
      `📍 ${escapeHtml(order.delivery_city || '—')}, ${escapeHtml(order.delivery_branch || '—')}`,
      `💳 ${escapeHtml(order.payment_method)}`,
      order.comment ? `💬 ${escapeHtml(order.comment)}` : null,
      '',
      RULE,
      `📦 <b>Накладна</b>, позицій: ${order.items.length}`,
    ].filter((line) => line !== null).join('\n');

    const blocks = order.items.map((item, index) => invoiceLine(item, index, products.get(Number(item.id))));

    const tail = [
      RULE,
      `Разом: <b>${money(order.total_amount)}</b>`,
      cost == null ? null : `Закупівля: ${money(cost)}`,
      cost == null ? null : `Різниця: <b>${money(sale - cost)}</b>`,
    ].filter((line) => line !== null).join('\n');

    for (const message of packMessages(head, blocks, tail)) await send(message, 'orders', { html: true });
  } catch (error) {
    console.error('Telegram alert failed:', error.message);
  }
}

export async function notifyNewSupportRequest(request) {
  const name = [request.customer_first_name, request.customer_last_name].filter(Boolean).join(' ') || '—';
  await send([
    `✉️ <b>Нове звернення #${escapeHtml(request.id)}</b> · ${escapeHtml(site.name)}`,
    '',
    `👤 ${escapeHtml(name)}`,
    request.customer_phone ? `📞 ${escapeHtml(request.customer_phone)}` : null,
    request.customer_email ? `📧 ${escapeHtml(request.customer_email)}` : null,
    '',
    `<blockquote>${escapeHtml(String(request.message ?? '').slice(0, 3000))}</blockquote>`,
  ].filter((line) => line !== null).join('\n'), 'orders', { html: true });
}

function priceEntry(entry, index, { current, target, currentLabel, targetLabel }) {
  const delta = target - current;
  const sign = delta > 0 ? '+' : '';
  return [
    `${index + 1}. <b>${escapeHtml(String(entry.title).slice(0, 80))}</b>`,
    `    #${entry.id} · <a href="${escapeHtml(site.url + productPath({ id: entry.id, title: entry.title }))}">На сайті</a>`,
    `    ${currentLabel}: ${money(current)} → ${targetLabel}: <b>${money(target)}</b> (${sign}${money(delta)})`,
  ].join('\n');
}

export async function notifyPriceCheck(summary) {
  const sections = [
    summary.drift && {
      mark: '🔴',
      title: 'Ціна на сайті не збігається з розрахунковою (закупівля + націнка)',
      total: summary.drift,
      entries: summary.samples.drift,
      pick: (i) => ({ current: Number(i.price), target: Number(i.expected), currentLabel: 'Зараз', targetLabel: 'Має бути' }),
    },
    summary.stale && {
      mark: '🟠',
      title: 'Закупівельна ціна не оновлена з парсера',
      total: summary.stale,
      entries: summary.samples.stale,
      pick: (i) => ({ current: Number(i.supplierPrice), target: Number(i.expected), currentLabel: 'У нас', targetLabel: 'У парсері' }),
    },
    summary.manual && {
      mark: '🟡',
      title: 'Ручна ціна, а ціна постачальника змінилась',
      total: summary.manual,
      entries: summary.samples.manual,
      pick: (i) => ({ current: Number(i.price), target: Number(i.expected), currentLabel: 'Зараз', targetLabel: 'З націнкою було б' }),
    },
  ].filter(Boolean);

  const head = [
    `⚠️ <b>Звірка цін</b> · ${escapeHtml(site.name)}`,
    `Перевірено товарів: ${Number(summary.checked).toLocaleString('uk-UA')}`,
    '',
    RULE,
  ].join('\n');

  const blocks = sections.map((section) => [
    `${section.mark} <b>${section.title}</b>: ${section.total}`,
    '',
    ...section.entries.map((entry, index) => priceEntry(entry, index, section.pick(entry))),
    section.total > section.entries.length ? `\n…і ще ${section.total - section.entries.length}` : null,
  ].filter((line) => line !== null).join('\n'));

  for (const message of packMessages(head, blocks, RULE)) await send(message, 'alerts', { html: true });
}
