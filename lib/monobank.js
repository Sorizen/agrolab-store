const API = 'https://api.monobank.ua/api/merchant';

function token() {
  const value = process.env.MONOBANK_API_TOKEN;
  if (!value) throw new Error('MONOBANK_API_TOKEN is not set');
  return value;
}

async function call(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'X-Token': token(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Monobank ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export const PAYMENT_STATUS_BY_INVOICE = {
  hold: 'Кошти заблоковано',
  success: 'Сплачено',
  failure: 'Помилка оплати',
  expired: 'Помилка оплати',
  reversed: 'Повернено',
};

export const invoiceStatus = (invoiceId) =>
  call(`/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`, { method: 'GET' });

export const finalizeInvoice = (invoiceId, amountKop) => call('/invoice/finalize', { body: { invoiceId, amount: amountKop } });

export const cancelInvoice = (invoiceId, { amountKop, extRef } = {}) =>
  call('/invoice/cancel', { body: { invoiceId, ...(amountKop ? { amount: amountKop } : {}), ...(extRef ? { extRef } : {}) } });
