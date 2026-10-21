import { sendMail } from './mail.js';
import { site } from './site.js';
import {
  escapeHtml, mailButton, mailHeading, mailItems, mailKeyValue, mailMuted, mailParagraph, renderMail,
} from './mail-layout.js';

export const NOTIFY_STATUSES = ['Відправлено', 'Виконано', 'Скасовано'];
export const TRACKING_PATTERN = /^\d{14}$/;

export const trackingUrl = (number) => `https://novaposhta.ua/tracking/?cargo_number=${number}`;

export function buildShippedMail(order) {
  const link = trackingUrl(order.tracking_number);
  const place = [order.delivery_city, order.delivery_branch].filter(Boolean).join(', ');
  const items = order.items || [];
  const text = [
    `Ваше замовлення №${order.id} відправлено Новою Поштою.`,
    `ТТН: ${order.tracking_number}`,
    `Відстежити посилку: ${link}`,
    place ? `Відділення: ${place}` : '',
    '',
    ...items.map((i) => `${i.title} ×${i.quantity}`),
  ].join('\n');
  const html = renderMail({
    preheader: `ТТН ${order.tracking_number}`,
    bodyHtml: [
      mailHeading(`Замовлення №${order.id} відправлено`),
      mailParagraph('Посилку передано Новій Пошті. Номер накладної для відстеження:'),
      mailKeyValue('ТТН', order.tracking_number),
      mailButton(link, 'Відстежити посилку'),
      place ? mailMuted(`Відділення: ${escapeHtml(place)}`) : '',
      mailItems(items),
    ].join(''),
  });
  return { subject: `Замовлення №${order.id} відправлено, ТТН ${order.tracking_number}`, text, html };
}

export function buildCompletedMail(order) {
  const items = order.items || [];
  const text = [
    `Ваше замовлення №${order.id} виконано. Дякуємо, що обрали ${site.name}!`,
    '',
    ...items.map((i) => `${i.title} ×${i.quantity}`),
  ].join('\n');
  const html = renderMail({
    preheader: 'Дякуємо, що обрали нас',
    bodyHtml: [
      mailHeading(`Замовлення №${order.id} виконано`),
      mailParagraph(`Дякуємо, що обрали ${escapeHtml(site.name)}! Сподіваємось, запчастини прослужать вам довго.`),
      mailItems(items),
      mailMuted('Якщо щось не так із товаром, напишіть або зателефонуйте нам, ми допоможемо.'),
    ].join(''),
  });
  return { subject: `Замовлення №${order.id} виконано`, text, html };
}

const money = (n) => `${Number(n).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} ₴`;

const MONEY_NOTES = {
  'Блокування знято': 'Гроші на вашій картці лише блокувались і не списувались. Банк зніме блокування, зазвичай це займає до кількох робочих днів.',
  'Повернено': 'Кошти повернуться на вашу картку, зазвичай до 5 робочих днів.',
};

export function buildCancelledMail(order) {
  const items = order.items || [];
  const note = MONEY_NOTES[order.payment_status] || '';
  const reason = order.cancel_reason || '';
  const text = [
    `Ваше замовлення №${order.id} скасовано.`,
    reason ? `Причина: ${reason}` : '',
    note,
    '',
    ...items.map((i) => `${i.title} ×${i.quantity}`),
    '',
    'Вибачте за незручності. Якщо потрібна допомога, напишіть або зателефонуйте нам.',
  ].join('\n');
  const html = renderMail({
    preheader: `Замовлення №${order.id} скасовано`,
    bodyHtml: [
      mailHeading(`Замовлення №${order.id} скасовано`),
      reason ? mailParagraph(`Причина: <strong>${escapeHtml(reason)}</strong>`) : '',
      note ? mailParagraph(escapeHtml(note)) : '',
      mailItems(items),
      mailMuted('Вибачте за незручності. Якщо потрібна допомога, напишіть або зателефонуйте нам.'),
    ].join(''),
  });
  return { subject: `Замовлення №${order.id} скасовано`, text, html };
}

export function buildPartialMail(order, amount, reason) {
  const text = [
    `За замовленням №${order.id} змінилась сума: ${money(amount)} повернеться на вашу картку.`,
    reason ? `Причина: ${reason}` : '',
    MONEY_NOTES['Повернено'],
  ].filter(Boolean).join('\n');
  const html = renderMail({
    preheader: `Повернення ${money(amount)}`,
    bodyHtml: [
      mailHeading(`Замовлення №${order.id}: часткове повернення`),
      mailParagraph(`На вашу картку повернеться <strong>${escapeHtml(money(amount))}</strong>.`),
      reason ? mailParagraph(`Причина: ${escapeHtml(reason)}`) : '',
      mailMuted(escapeHtml(MONEY_NOTES['Повернено'])),
    ].join(''),
  });
  return { subject: `Замовлення №${order.id}: повернення ${money(amount)}`, text, html };
}

export async function sendPartialRefundMail(order, amount, reason) {
  if (!order.customer_email) return 'no-email';
  await sendMail({ to: order.customer_email, ...buildPartialMail(order, amount, reason) });
  return 'sent';
}

export async function notifyOrderStatus(order) {
  if (!NOTIFY_STATUSES.includes(order.status)) return 'skipped';
  if (!order.customer_email) return 'no-email';
  const builders = { 'Відправлено': buildShippedMail, 'Виконано': buildCompletedMail, 'Скасовано': buildCancelledMail };
  const mail = builders[order.status](order);
  await sendMail({ to: order.customer_email, ...mail });
  return 'sent';
}
