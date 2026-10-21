'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

export default function OrdersTab() {
    const [orders, setOrders] = useState([]);
    const [pager, setPager] = useState({ page: 1, pages: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [trackingDrafts, setTrackingDrafts] = useState({});
    const [payDrafts, setPayDrafts] = useState({});
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();

    }, [page, statusFilter]);

    async function fetchOrders() {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ page: String(page), ...(statusFilter ? { status: statusFilter } : {}) });
            const res = await fetch(`/api/orders?${qs}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.items);
                setPager({ page: data.page, pages: data.pages, total: data.total });
            }
        } catch (error) {
            showMessage('Помилка завантаження замовлень', 'error');
        }
        setLoading(false);
    }

    function showMessage(text, type = 'success') {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    }

    async function updateOrder(id, changes) {
        const res = await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...changes }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const error = new Error(data.error || 'Не вдалося оновити замовлення');
            error.needsTracking = Boolean(data.needsTracking);
            throw error;
        }
        setOrders(prev => prev.map(order => order.id === id ? { ...order, status: data.status, tracking_number: data.trackingNumber } : order));
        return data;
    }

    const EMAIL_NOTES = {
        sent: 'Покупцю надіслано лист.',
        'no-email': 'Лист не надіслано: покупець не вказав email.',
        failed: 'Лист покупцю НЕ надіслано (помилка пошти, дивіться лог сервера).',
    };

    async function handleStatusChange(id, newStatus) {
        try {
            const data = await updateOrder(id, { status: newStatus });
            const note = EMAIL_NOTES[data.email];
            showMessage(`Статус змінено на "${newStatus}". ${note || ''}`.trim(), data.email === 'failed' ? 'error' : 'success');
        } catch (err) {
            if (err.needsTracking) setExpandedOrder(id);
            showMessage(err.message, 'error');
        }
    }

    async function saveTracking(order) {
        const value = trackingDrafts[order.id] ?? order.tracking_number ?? '';
        try {
            await updateOrder(order.id, { trackingNumber: value });
            setTrackingDrafts(prev => { const next = { ...prev }; delete next[order.id]; return next; });
            showMessage(value.trim() ? 'ТТН збережено' : 'ТТН видалено');
        } catch (err) {
            showMessage(err.message, 'error');
        }
    }

    const patchOrder = (id, changes) => setOrders(prev => prev.map(order => order.id === id ? { ...order, ...changes } : order));
    const draft = (id) => payDrafts[id] || {};
    const setDraft = (id, patch) => setPayDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    async function paymentAction(order, url, body, question, done) {
        if (question && !window.confirm(question)) return;
        setBusy(order.id);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: order.id, ...body }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Не вдалося виконати дію');
            done(data);
        } catch (err) {
            showMessage(err.message, 'error');
        }
        setBusy(null);
    }

    const captureOrder = (order) => {
        const amount = draft(order.id).captureAmount;
        const total = amount ? Number(amount) : order.total_amount;
        paymentAction(order, '/api/orders/capture', { amount: amount || undefined },
            `Списати ₴${total} з картки покупця? Підтверджуйте, тільки коли товар у постачальника є.`,
            data => {
                patchOrder(order.id, { payment_status: data.paymentStatus, status: data.status, refunded_amount: data.refunded });
                showMessage(`Кошти списано.${data.email === 'sent' ? ' Покупцю надіслано лист про повернення різниці.' : ''}`);
            });
    };

    const cancelOrder = (order) => {
        const d = draft(order.id);
        const reason = d.reason === 'Інше' ? (d.customReason || '').trim() : d.reason;
        if (!reason) { showMessage('Оберіть причину скасування', 'error'); return; }
        const money = order.payment_status === 'Кошти заблоковано' ? ' Блокування коштів буде знято.' : order.payment_status === 'Сплачено' ? ' Кошти буде повернено на картку.' : '';
        paymentAction(order, '/api/orders/cancel', { reason },
            `Скасувати замовлення №${order.id}?${money} Покупцю піде лист.`,
            data => {
                patchOrder(order.id, { status: data.status, payment_status: data.paymentStatus, cancel_reason: reason });
                showMessage(`Замовлення скасовано. ${EMAIL_NOTES[data.email] || ''}`.trim(), data.email === 'failed' ? 'error' : 'success');
            });
    };

    const refundOrder = (order) => {
        const d = draft(order.id);
        if (!(Number(d.refundAmount) > 0)) { showMessage('Вкажіть суму повернення', 'error'); return; }
        paymentAction(order, '/api/orders/refund', { amount: d.refundAmount, reason: d.refundReason || '' },
            `Повернути ₴${d.refundAmount} на картку покупця?`,
            data => {
                patchOrder(order.id, { refunded_amount: data.refunded });
                setDraft(order.id, { refundAmount: '', refundReason: '' });
                showMessage(`Повернуто. ${EMAIL_NOTES[data.email] || ''}`.trim());
            });
    };

    const refreshPayment = (order) => paymentAction(order, '/api/orders/refresh-payment', {}, null, data => {
        patchOrder(order.id, { payment_status: data.paymentStatus });
        showMessage(data.changed ? `Статус оплати: ${data.paymentStatus}` : `Без змін (Monobank: ${data.invoiceStatus})`);
    });

    const CANCEL_REASONS = ['Немає в наявності', 'Змінилась ціна', 'Інше'];

    const statuses = ['Нове', 'В обробці', 'Відправлено', 'Виконано', 'Скасовано'];

    const getStatusColor = (status) => {
        switch(status) {
            case 'Нове': return 'var(--primary-color)';
            case 'В обробці': return '#e67e22';
            case 'Відправлено': return '#3498db';
            case 'Виконано': return '#2ecc71';
            case 'Скасовано': return '#e74c3c';
            default: return 'var(--dark-gray)';
        }
    }

    return (
        <div>
            {message && (
                <div className={`admin-message ${message.type}`}>{message.text}</div>
            )}

            <div className="admin-toolbar">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Статус">
                    <option value="">Усі статуси</option>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{pager.total.toLocaleString('uk-UA')} замовлень</span>
            </div>

            {loading ? (
                <p>Завантаження замовлень...</p>
            ) : orders.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--medium-gray)' }}>
                    Немає замовлень
                </p>
            ) : (
                <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Дата</th>
                                <th>Клієнт</th>
                                <th>Сума</th>
                                <th>Статус</th>
                                <th>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <React.Fragment key={order.id}>
                                    <tr>
                                        <td>
                                            <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                                #{order.id}
                                            </span>
                                        </td>
                                        <td>{new Date(order.created_at).toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>
                                            <strong>{order.customer_first_name} {order.customer_last_name}</strong><br/>
                                            <span style={{ fontSize: '0.85rem' }}>
                                                {(order.customer_phone || '').startsWith('+') ? order.customer_phone : `+380 ${order.customer_phone || ''}`}
                                            </span>
                                        </td>
                                        <td><strong>₴{order.total_amount}</strong></td>
                                        <td>
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                style={{
                                                    padding: '0.3rem',
                                                    borderRadius: '4px',
                                                    border: `1px solid ${getStatusColor(order.status)}`,
                                                    color: getStatusColor(order.status),
                                                    fontWeight: 'bold',
                                                    backgroundColor: 'transparent'
                                                }}
                                            >
                                                {statuses.filter(s => s !== 'Скасовано' || order.status === 'Скасовано').map(s => <option key={s} value={s} disabled={s === 'Скасовано'}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-small btn-outline"
                                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                            >
                                                {expandedOrder === order.id ? 'Сховати' : 'Деталі'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedOrder === order.id && (
                                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                                            <td colSpan="6" style={{ padding: '1rem', borderLeft: '3px solid var(--primary-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: '1', minWidth: '250px' }}>
                                                        <strong>Доставка:</strong>
                                                        <p style={{ margin: '0.5rem 0' }}>{order.delivery_method}</p>
                                                        <p style={{ margin: '0 0 1rem 0' }}>м. {order.delivery_city}, {order.delivery_branch}</p>

                                                        <strong>ТТН Нової Пошти:</strong>
                                                        <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0 1rem 0' }}>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                maxLength={17}
                                                                placeholder="14 цифр"
                                                                value={trackingDrafts[order.id] ?? order.tracking_number ?? ''}
                                                                onChange={e => setTrackingDrafts(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                                style={{ flex: 1, minWidth: 0 }}
                                                            />
                                                            <button className="btn-small btn-outline" onClick={() => saveTracking(order)}>Зберегти</button>
                                                        </div>

                                                        {order.status === 'Скасовано' && order.cancel_reason && (
                                                            <p style={{ margin: '0 0 1rem 0', color: 'var(--sale)', fontWeight: 600 }}>Скасовано: {order.cancel_reason}</p>
                                                        )}
                                                        <strong>Оплата:</strong>
                                                        <p style={{ margin: '0.5rem 0' }}>{order.payment_method || '—'}</p>
                                                        <p style={{ margin: '0' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                background: order.payment_status === 'Сплачено' ? '#28a74520' : order.payment_status === 'Помилка оплати' ? '#dc354520' : '#ffc10720',
                                                                color: order.payment_status === 'Сплачено' ? '#28a745' : order.payment_status === 'Помилка оплати' ? '#dc3545' : '#d39e00'
                                                            }}>
                                                                {order.payment_status || '—'}
                                                            </span>
                                                        </p>

                                                        {order.payment_invoice_id && order.status !== 'Скасовано' && (
                                                            <p style={{ margin: '0.5rem 0 0' }}>
                                                                <button className="btn-small btn-outline" disabled={busy === order.id} onClick={() => refreshPayment(order)}>Оновити статус оплати</button>
                                                            </p>
                                                        )}
                                                        {Number(order.refunded_amount) > 0 && <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>Повернено: ₴{order.refunded_amount}</p>}

                                                        {order.payment_status === 'Кошти заблоковано' && order.status !== 'Скасовано' && (
                                                            <div style={{ margin: '1rem 0', padding: '0.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)' }}>
                                                                <strong style={{ display: 'block', marginBottom: '0.4rem' }}>Кошти заблоковані на картці (до 9 днів)</strong>
                                                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>Підтвердіть замовлення у постачальника, потім спишіть кошти. Якщо товару немає, скасуйте: гроші розблокуються.</p>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <input type="number" min="0" step="0.01" placeholder={`Сума, ₴ (за замовч. ${order.total_amount})`} value={draft(order.id).captureAmount || ''}
                                                                        onChange={e => setDraft(order.id, { captureAmount: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
                                                                    <button className="btn-small btn-edit" disabled={busy === order.id} onClick={() => captureOrder(order)}>Підтвердити і списати</button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {order.payment_status === 'Сплачено' && order.payment_invoice_id && order.status !== 'Скасовано' && (
                                                            <div style={{ margin: '1rem 0', padding: '0.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)' }}>
                                                                <strong style={{ display: 'block', marginBottom: '0.4rem' }}>Часткове повернення</strong>
                                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                    <input type="number" min="0" step="0.01" placeholder="Сума, ₴" value={draft(order.id).refundAmount || ''}
                                                                        onChange={e => setDraft(order.id, { refundAmount: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
                                                                    <input type="text" placeholder="Причина (для листа)" value={draft(order.id).refundReason || ''}
                                                                        onChange={e => setDraft(order.id, { refundReason: e.target.value })} style={{ flex: 2, minWidth: 0 }} />
                                                                </div>
                                                                <button className="btn-small btn-edit" disabled={busy === order.id} onClick={() => refundOrder(order)}>Повернути</button>
                                                            </div>
                                                        )}

                                                        {order.status !== 'Скасовано' && order.status !== 'Виконано' && (
                                                            <div style={{ margin: '1rem 0', padding: '0.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)' }}>
                                                                <strong style={{ display: 'block', marginBottom: '0.4rem' }}>Скасувати замовлення</strong>
                                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                    <select value={draft(order.id).reason || ''} onChange={e => setDraft(order.id, { reason: e.target.value })} style={{ flex: 1, minWidth: 160 }}>
                                                                        <option value="">Причина…</option>
                                                                        {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                    {draft(order.id).reason === 'Інше' && (
                                                                        <input type="text" placeholder="Своя причина" value={draft(order.id).customReason || ''}
                                                                            onChange={e => setDraft(order.id, { customReason: e.target.value })} style={{ flex: 2, minWidth: 140 }} />
                                                                    )}
                                                                    <button className="btn-small btn-delete" disabled={busy === order.id} onClick={() => cancelOrder(order)}>Скасувати</button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <strong style={{ display: 'block', marginTop: '1rem' }}>Контакти:</strong>
                                                        <p style={{ margin: '0.5rem 0' }}>Email: {order.customer_email || '—'}</p>
                                                        {order.do_not_call && <p style={{ margin: '0.25rem 0', color: 'var(--sale)', fontWeight: 600 }}>Не телефонувати</p>}
                                                        {order.comment && <p style={{ margin: '0.5rem 0' }}>Коментар: {order.comment}</p>}
                                                    </div>
                                                    <div style={{ flex: '2', minWidth: '300px' }}>
                                                        <strong>Товари:</strong>
                                                        <ul style={{ listStyle: 'none', padding: '0', margin: '0.5rem 0' }}>
                                                            {(order.items || []).map((item, idx) => (
                                                                <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                                                    <span>
                                                                        {item.title} <strong>x{item.quantity}</strong>
                                                                        {(item.size || item.color) && <span style={{ color: 'var(--muted)' }}> ({[item.size, item.color].filter(Boolean).join(', ')})</span>}
                                                                        {item.article && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)' }}>Код: {item.article}</span>}
                                                                        {item.supplierUrl && (
                                                                            <a href={item.supplierUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--brand)', fontWeight: 600 }}>
                                                                                <ExternalLink size={12} /> Замовити у постачальника
                                                                            </a>
                                                                        )}
                                                                    </span>
                                                                    <span style={{ whiteSpace: 'nowrap' }}>₴{item.price * item.quantity}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 'bold' }}>
                                                            Загальна сума: ₴{order.total_amount}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    <div className="admin-pager">
                        <button className="btn-small btn-outline" disabled={pager.page <= 1} onClick={() => setPage(p => p - 1)}>← Новіші</button>
                        <span>Сторінка {pager.page} з {pager.pages}</span>
                        <button className="btn-small btn-outline" disabled={pager.page >= pager.pages} onClick={() => setPage(p => p + 1)}>Старіші →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
