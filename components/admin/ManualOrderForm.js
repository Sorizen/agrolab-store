'use client';

import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import ProductPicker from './ProductPicker';
import NovaPoshtaDropdown from '../cart/NovaPoshtaDropdown';

const STATUSES = ['Нове', 'В обробці', 'Відправлено', 'Виконано'];
const PAYMENTS = ['Оплата при отриманні', 'Передплата на картку', 'Готівка'];

const money = (value) => Number(value || 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

function localNow() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
}

let rowKey = 0;
const newRow = (fields) => ({ key: ++rowKey, id: null, title: '', article: '', quantity: 1, price: '', ...fields });

export default function ManualOrderForm({ onCreated, onCancel }) {
    const [form, setForm] = useState({
        createdAt: localNow(),
        lastName: '',
        firstName: '',
        phone: '',
        email: '',
        city: '',
        branch: '',
        paymentMethod: PAYMENTS[0],
        status: STATUSES[0],
        trackingNumber: '',
        comment: '',
        total: '',
    });
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));
    const sum = items.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const patchItem = (key, patch) => setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    const removeItem = (key) => setItems((prev) => prev.filter((item) => item.key !== key));

    async function submit(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    createdAt: new Date(form.createdAt).toISOString(),
                    customer: {
                        firstName: form.firstName,
                        lastName: form.lastName,
                        phone: form.phone,
                        email: form.email,
                        city: form.city,
                        branch: form.branch,
                    },
                    items: items.map(({ id, title, article, quantity, price }) => ({ id, title, article, quantity, price })),
                    total: form.total,
                    paymentMethod: form.paymentMethod,
                    status: form.status,
                    trackingNumber: form.trackingNumber,
                    comment: form.comment,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Не вдалося додати замовлення');
            onCreated(data.id);
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    }

    return (
        <form className="mo-panel" onSubmit={submit}>
            <div className="mo-head">
                <h3 className="mo-title">Нове замовлення вручну</h3>
                <span className="mo-hint">* обов'язкові поля</span>
            </div>

            <div className="mo-grid">
                <div className="mo-field">
                    <label htmlFor="mo-date">Дата і час *</label>
                    <input id="mo-date" type="datetime-local" value={form.createdAt} onChange={set('createdAt')} required />
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-status">Статус</label>
                    <select id="mo-status" value={form.status} onChange={set('status')}>
                        {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-last">Прізвище *</label>
                    <input id="mo-last" value={form.lastName} onChange={set('lastName')} required />
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-first">Ім'я *</label>
                    <input id="mo-first" value={form.firstName} onChange={set('firstName')} required />
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-phone">Телефон *</label>
                    <input id="mo-phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="0971234567" required />
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-email">Email</label>
                    <input id="mo-email" type="email" value={form.email} onChange={set('email')} placeholder="для листів про статус" />
                </div>
                <div className="mo-np">
                    <NovaPoshtaDropdown
                        required={false}
                        branchLabel="Відділення Нової Пошти або поштомат"
                        selectedCity={form.city}
                        selectedBranch={form.branch}
                        onSelectCity={(city) => setForm((prev) => ({ ...prev, city }))}
                        onSelectBranch={(branch) => setForm((prev) => ({ ...prev, branch }))}
                    />
                </div>
            </div>

            <div className="mo-section">
                <h4>Позиції *</h4>
                <ProductPicker onPick={(product) => setItems((prev) => [...prev, newRow(product)])} />
                {items.length > 0 && (
                    <div className="mo-items">
                        <div className="mo-item mo-items-head">
                            <span>Назва</span>
                            <span>К-сть</span>
                            <span>Ціна, ₴</span>
                            <span className="mo-item-sum">Сума</span>
                            <span />
                        </div>
                        {items.map((item) => (
                            <div className="mo-item" key={item.key}>
                                <div className="mo-item-name">
                                    {item.id ? (
                                        <>
                                            <span>{item.title}</span>
                                            {item.article && <small>Код: {item.article}</small>}
                                        </>
                                    ) : (
                                        <input
                                            value={item.title}
                                            onChange={(e) => patchItem(item.key, { title: e.target.value })}
                                            placeholder="Назва позиції (лише в цьому замовленні)"
                                            aria-label="Назва позиції"
                                            required
                                        />
                                    )}
                                </div>
                                <input
                                    type="number" min="1" max="999" step="1" value={item.quantity}
                                    onChange={(e) => patchItem(item.key, { quantity: e.target.value })}
                                    aria-label="Кількість" required
                                />
                                <input
                                    type="number" min="0" step="0.01" value={item.price}
                                    onChange={(e) => patchItem(item.key, { price: e.target.value })}
                                    aria-label="Ціна за одиницю" required
                                />
                                <strong className="mo-item-sum">₴{money((Number(item.price) || 0) * (Number(item.quantity) || 0))}</strong>
                                <button type="button" className="mo-icon-btn" onClick={() => removeItem(item.key)} aria-label="Прибрати позицію">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <div className="mo-sum-line">Разом за позиціями: <strong>₴{money(sum)}</strong></div>
                    </div>
                )}
                <button type="button" className="btn-small btn-outline mo-add" onClick={() => setItems((prev) => [...prev, newRow()])}>
                    <Plus size={14} /> Позиція, якої немає в каталозі
                </button>
            </div>

            <div className="mo-grid mo-section">
                <div className="mo-field">
                    <label htmlFor="mo-pay">Оплата</label>
                    <select id="mo-pay" value={form.paymentMethod} onChange={set('paymentMethod')}>
                        {PAYMENTS.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-total">Сума замовлення, ₴</label>
                    <input id="mo-total" type="number" min="0" step="0.01" value={form.total} onChange={set('total')} placeholder={`${money(sum)} (за позиціями)`} />
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-ttn">ТТН Нової Пошти</label>
                    <input id="mo-ttn" inputMode="numeric" maxLength={17} value={form.trackingNumber} onChange={set('trackingNumber')} placeholder="14 цифр, обов'язкова для «Відправлено»" />
                </div>
                <div className="mo-field">
                    <label htmlFor="mo-comment">Коментар</label>
                    <input id="mo-comment" value={form.comment} onChange={set('comment')} placeholder="Наприклад: замовлення по телефону" />
                </div>
            </div>

            {error && <div className="admin-message error" style={{ marginTop: '1.25rem', marginBottom: 0 }}>{error}</div>}

            <div className="mo-actions">
                <button type="submit" className="btn btn-blue" disabled={saving}>{saving ? 'Зберігаю…' : 'Додати замовлення'}</button>
                <button type="button" className="btn btn-outline" onClick={onCancel}>Скасувати</button>
            </div>
        </form>
    );
}
