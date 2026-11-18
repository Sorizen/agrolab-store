import { TRACKING_PATTERN } from './order-mail.js';

export const MANUAL_STATUSES = ['Нове', 'В обробці', 'Відправлено', 'Виконано'];

export const MANUAL_PAYMENTS = {
  'Оплата при отриманні': 'Оплата при отриманні',
  'Передплата на картку': 'Сплачено',
  Готівка: 'Сплачено',
};

const MAX_ITEMS = 100;
const DAY = 86_400_000;

const text = (value, max) => String(value ?? '').trim().slice(0, max);
const cents = (value) => Math.round(Number(value) * 100) / 100;

export function normalizePhone(raw) {
  const value = text(raw, 30);
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith('380')) return `+${digits}`;
  return value;
}

function parseItem(raw) {
  const quantity = Math.trunc(Number(raw?.quantity));
  if (raw?.price === '' || raw?.price == null) return { error: 'Вкажіть ціну у кожній позиції' };
  const price = cents(raw.price);
  const id = Number(raw?.id);
  const title = text(raw?.title, 300);
  if (!(quantity >= 1 && quantity <= 999)) return { error: 'Кількість у позиції має бути від 1 до 999' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Ціна у позиції вказана некоректно' };
  if (!title && !(id > 0)) return { error: 'У кожної позиції має бути назва' };
  return {
    value: {
      ...(id > 0 ? { id } : {}),
      title,
      article: text(raw?.article, 100),
      quantity,
      price,
    },
  };
}

export function parseManualOrder(body, now = new Date()) {
  const customer = body?.customer || {};
  const firstName = text(customer.firstName, 100);
  const lastName = text(customer.lastName, 100);
  const phone = normalizePhone(customer.phone);
  if (!phone) return { error: 'Вкажіть телефон' };
  if (!firstName || !lastName) return { error: "Вкажіть прізвище та ім'я одержувача" };

  if (!Array.isArray(body?.items) || body.items.length === 0) return { error: 'Додайте хоча б одну позицію' };
  if (body.items.length > MAX_ITEMS) return { error: `Не більше ${MAX_ITEMS} позицій` };
  const items = [];
  for (const raw of body.items) {
    const parsed = parseItem(raw);
    if (parsed.error) return parsed;
    items.push(parsed.value);
  }
  const sum = cents(items.reduce((total, item) => total + item.price * item.quantity, 0));
  const override = body.total === '' || body.total == null ? null : cents(body.total);
  if (override !== null && (!Number.isFinite(override) || override < 0)) return { error: 'Сума вказана некоректно' };

  const createdAt = body.createdAt ? new Date(body.createdAt) : now;
  if (Number.isNaN(createdAt.getTime())) return { error: 'Дата вказана некоректно' };
  if (createdAt.getTime() > now.getTime() + DAY) return { error: 'Дата не може бути в майбутньому' };

  const status = body.status ?? 'Нове';
  if (!MANUAL_STATUSES.includes(status)) return { error: 'Невідомий статус' };
  const paymentMethod = body.paymentMethod ?? 'Оплата при отриманні';
  if (!(paymentMethod in MANUAL_PAYMENTS)) return { error: 'Невідомий спосіб оплати' };

  const tracking = String(body.trackingNumber ?? '').replace(/\s+/g, '');
  if (tracking && !TRACKING_PATTERN.test(tracking)) return { error: 'ТТН Нової Пошти складається з 14 цифр' };
  if (status === 'Відправлено' && !tracking) return { error: 'Для статусу «Відправлено» вкажіть ТТН' };

  return {
    value: {
      createdAt,
      firstName,
      lastName,
      phone,
      email: text(customer.email, 200) || null,
      city: text(customer.city, 200),
      branch: text(customer.branch, 300),
      comment: text(body.comment, 1000),
      items,
      total: override ?? sum,
      status,
      paymentMethod,
      paymentStatus: MANUAL_PAYMENTS[paymentMethod],
      tracking: tracking || null,
    },
  };
}
