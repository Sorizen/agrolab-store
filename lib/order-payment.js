import { query } from './db.js';
import { cancelInvoice, finalizeInvoice, invoiceStatus, PAYMENT_STATUS_BY_INVOICE } from './monobank.js';
import { notifyOrderStatus, sendPartialRefundMail } from './order-mail.js';
import { refreshSalesInBackground } from './sales.js';

const kopecks = (amount) => Math.round(Number(amount) * 100);

async function loadOrder(id) {
  const { rows } = await query('select * from orders where id = $1', [id]);
  if (!rows[0]) throw new Error('Замовлення не знайдено');
  return rows[0];
}

async function liveStatus(order) {
  if (!order.payment_invoice_id) return null;
  return (await invoiceStatus(order.payment_invoice_id)).status;
}

async function mailSafely(action) {
  try {
    return await action();
  } catch (error) {
    console.error('Order payment email failed:', error.message);
    return 'failed';
  }
}

export async function captureOrder(id, amount) {
  const order = await loadOrder(id);
  if ((await liveStatus(order)) !== 'hold') throw new Error('Кошти не заблоковані: списувати нічого або вже списано');
  const total = Number(order.total_amount);
  const capture = amount === undefined || amount === null || amount === '' ? total : Number(amount);
  if (!(capture > 0) || capture > total) throw new Error(`Сума списання має бути від 0 до ${total} ₴`);

  await finalizeInvoice(order.payment_invoice_id, kopecks(capture));
  const refunded = Math.round((total - capture) * 100) / 100;
  const { rows: [updated] } = await query(
    `update orders set payment_status = 'Сплачено', refunded_amount = $2,
            status = case when status = 'Нове' then 'В обробці' else status end
     where id = $1 returning *`,
    [id, refunded]
  );
  refreshSalesInBackground();
  const email = refunded > 0 ? await mailSafely(() => sendPartialRefundMail(updated, refunded, '')) : 'skipped';
  return { status: updated.status, paymentStatus: updated.payment_status, refunded, email };
}

export async function cancelOrder(id, reason) {
  const order = await loadOrder(id);
  if (order.status === 'Скасовано') throw new Error('Замовлення вже скасовано');
  if (order.status === 'Виконано') throw new Error('Виконане замовлення скасувати не можна');
  const cleanReason = String(reason || '').trim().slice(0, 300);
  if (!cleanReason) throw new Error('Вкажіть причину скасування');

  let paymentStatus = order.payment_status;
  const live = await liveStatus(order);
  if (live === 'hold') {
    await cancelInvoice(order.payment_invoice_id, { extRef: `cancel-${order.id}` });
    paymentStatus = 'Блокування знято';
  } else if (live === 'success') {
    await cancelInvoice(order.payment_invoice_id, { extRef: `cancel-${order.id}` });
    paymentStatus = 'Повернено';
  }

  const { rows: [updated] } = await query(
    "update orders set status = 'Скасовано', cancel_reason = $2, payment_status = $3 where id = $1 returning *",
    [id, cleanReason, paymentStatus]
  );
  refreshSalesInBackground();
  const email = await mailSafely(() => notifyOrderStatus(updated));
  return { status: updated.status, paymentStatus: updated.payment_status, email };
}

export async function refundOrder(id, amount, reason) {
  const order = await loadOrder(id);
  if ((await liveStatus(order)) !== 'success') throw new Error('Часткове повернення можливе тільки для сплаченого замовлення');
  const refund = Number(amount);
  const available = Math.round((Number(order.total_amount) - Number(order.refunded_amount)) * 100) / 100;
  if (!(refund > 0) || refund > available) throw new Error(`Сума повернення має бути від 0 до ${available} ₴`);

  await cancelInvoice(order.payment_invoice_id, { amountKop: kopecks(refund), extRef: `refund-${order.id}-${Date.now()}` });
  const { rows: [updated] } = await query(
    'update orders set refunded_amount = refunded_amount + $2 where id = $1 returning *',
    [id, refund]
  );
  const email = await mailSafely(() => sendPartialRefundMail(updated, refund, String(reason || '').trim()));
  return { refunded: Number(updated.refunded_amount), email };
}

export async function refreshPayment(id) {
  const order = await loadOrder(id);
  if (!order.payment_invoice_id) throw new Error('У замовлення немає рахунку Monobank');
  const invoice = await invoiceStatus(order.payment_invoice_id);
  const mapped = PAYMENT_STATUS_BY_INVOICE[invoice.status];
  if (!mapped) return { paymentStatus: order.payment_status, invoiceStatus: invoice.status, changed: false };
  if (order.payment_status === 'Блокування знято' && invoice.status === 'reversed') {
    return { paymentStatus: order.payment_status, invoiceStatus: invoice.status, changed: false };
  }
  const expected = Math.round((Number(order.total_amount) - Number(order.refunded_amount)) * 100);
  const paymentStatus =
    (invoice.status === 'success' || invoice.status === 'hold') && Number(invoice.finalAmount ?? invoice.amount) !== expected
      ? 'Сума оплати не збігається'
      : mapped;
  if (paymentStatus === order.payment_status) return { paymentStatus, invoiceStatus: invoice.status, changed: false };
  await query('update orders set payment_status = $1, payment_metadata = $2 where id = $3', [
    paymentStatus,
    JSON.stringify(invoice.paymentInfo || {}),
    id,
  ]);
  refreshSalesInBackground();
  return { paymentStatus, invoiceStatus: invoice.status, changed: true };
}
