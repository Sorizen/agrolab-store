'use client';

import { useState, useEffect, useCallback } from 'react';
import { Edit, Save, X, Star, Loader2, EyeOff, Lock, ExternalLink, Package } from 'lucide-react';
import { AVAILABILITY_LABELS } from '@/lib/availability';

const formatPrice = (n) => Number(n || 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

export default function ProductsTab() {
    const [list, setList] = useState({ items: [], total: 0, page: 1, pages: 1 });
    const [filters, setFilters] = useState({ q: '', status: 'all', page: 1 });
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [markup, setMarkup] = useState(5);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ q: filters.q, status: filters.status, page: String(filters.page) });
            const res = await fetch(`/api/products?${qs}`);
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
            setList(await res.json());
        } catch (err) {
            showMessage(`Помилка завантаження товарів: ${err.message}`, 'error');
        }
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(s => { if (s.markup_percent !== undefined) setMarkup(Number(s.markup_percent)); }).catch(() => {});
    }, []);

    const retailFor = (supplierPrice) => (Number(supplierPrice) > 0 ? Math.ceil(Number((Number(supplierPrice) * (100 + markup)).toFixed(4)) / 100) : 0);

    useEffect(() => {
        const t = setTimeout(() => {
            setFilters(f => (f.q === searchInput.trim() ? f : { ...f, q: searchInput.trim(), page: 1 }));
        }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    function showMessage(text, type = 'success') {
        setMessage({ text, type });
        if (type !== 'error') setTimeout(() => setMessage(null), 5000);
    }

    async function startEdit(id) {
        try {
            const res = await fetch(`/api/products?id=${id}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setProduct(data);
            setForm({
                price: String(data.price),
                active: data.active !== false,
                featured: Boolean(data.featured),
                syncLocked: Boolean(data.syncLocked),
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            showMessage(`Не вдалося відкрити товар: ${err.message}`, 'error');
        }
    }

    function cancelEdit() {
        setProduct(null);
        setForm(null);
    }

    const set = (patch) => setForm(prev => ({ ...prev, ...patch }));

    function toggleLock(locked) {
        set({ syncLocked: locked, ...(locked ? {} : { price: String(retailFor(product.supplierPrice) || product.price) }) });
    }

    async function handleSave(e) {
        e.preventDefault();
        const price = Number(form.price);
        if (form.syncLocked && !(price >= 0)) {
            showMessage('Вкажіть ціну числом', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/products', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: product.id,
                    ...(form.syncLocked ? { price } : {}),
                    active: form.active,
                    featured: form.featured,
                    syncLocked: form.syncLocked,
                }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
            showMessage('Збережено');
            cancelEdit();
            fetchProducts();
        } catch (err) {
            showMessage(err.message, 'error');
        }
        setSaving(false);
    }

    async function handleHide(item) {
        if (!confirm('Сховати цей товар? Синхронізація більше не покаже його на сайті.')) return;
        try {
            const res = await fetch('/api/products', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showMessage('Товар приховано');
            fetchProducts();
        } catch (err) {
            showMessage(err.message, 'error');
        }
    }

    return (
        <div>
            {message && (
                <div
                    className={`admin-message ${message.type}`}
                    style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999, padding: '1rem', borderRadius: '8px', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}
                >
                    <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{message.text}</div>
                    <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                        <X size={18} />
                    </button>
                </div>
            )}

            {product && form && (
                <div className="admin-form-wrapper">
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div className="table-thumb" style={{ width: 120, height: 120, flex: '0 0 120px' }}>
                            {product.images?.[0] ? <img src={product.images[0]} alt="" /> : <Package size={32} color="var(--medium-gray)" />}
                        </div>
                        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                            <h3 style={{ marginBottom: '0.4rem' }}>{product.title}</h3>
                            <div style={{ color: 'var(--muted)', fontSize: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1.25rem' }}>
                                <span>#{product.id}</span>
                                {product.article && <span>Код: <strong>{product.article}</strong></span>}
                                {product.brand && <span>{product.brand}</span>}
                                {product.category && <span>{product.category}</span>}
                            </div>
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1.5rem', alignItems: 'center' }}>
                                <span>Ціна АГРОЛОСК: <strong>₴ {formatPrice(product.supplierPrice)}</strong> (з націнкою {markup}%: <strong>₴ {formatPrice(retailFor(product.supplierPrice))}</strong>)</span>
                                <span>{AVAILABILITY_LABELS[product.availability] || product.availability}</span>
                                {product.syncedAt && <span style={{ color: 'var(--muted)' }}>Оновлено: {new Date(product.syncedAt).toLocaleString('uk-UA')}</span>}
                                {product.supplierUrl && (
                                    <a href={product.supplierUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--brand)', fontWeight: 600 }}>
                                        <ExternalLink size={14} /> Сторінка у постачальника
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="admin-form" style={{ marginTop: '1.5rem' }}>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexDirection: 'row', flexWrap: 'wrap' }}>
                            <label style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.active} style={{ width: 'auto' }}
                                    onChange={e => set({ active: e.target.checked, ...(!e.target.checked ? { syncLocked: true } : {}) })} />
                                Показувати на сайті
                            </label>
                            <label style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.featured} onChange={e => set({ featured: e.target.checked })} style={{ width: 'auto' }} />
                                <Star size={16} color="var(--gold)" /> На головній
                            </label>
                        </div>

                        <div className="form-group" style={{ background: 'var(--brand-wash)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '1rem 1.2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                                <input type="checkbox" checked={form.syncLocked} onChange={e => toggleLock(e.target.checked)} style={{ width: 'auto', marginTop: '0.2rem' }} />
                                <span>
                                    <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Lock size={14} /> Ручне керування</strong>
                                    {' '}— синхронізація не змінюватиме ціну, видимість, назву, опис, фото та категорію. Без галочки ціна дорівнює ціні АГРОЛОСК з націнкою.
                                </span>
                            </label>
                            <label>Ціна на сайті (₴)</label>
                            <input type="number" min="0" step="0.01" value={form.price} disabled={!form.syncLocked}
                                onChange={e => set({ price: e.target.value })} style={{ maxWidth: '240px' }} />
                            {form.syncLocked && Number(form.price) > 0 && product.supplierPrice > 0 && Number(form.price) !== retailFor(product.supplierPrice) && (
                                <span style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                    {Number(form.price) > retailFor(product.supplierPrice) ? 'Вище' : 'Нижче'} за ціну АГРОЛОСК з націнкою на {formatPrice(Math.abs(Number(form.price) - retailFor(product.supplierPrice)))} ₴ ({(((Number(form.price) - retailFor(product.supplierPrice)) / retailFor(product.supplierPrice)) * 100).toFixed(1)}%)
                                </span>
                            )}
                        </div>

                        <div className="admin-form-actions">
                            <button type="submit" className="btn btn-blue" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Зберегти
                            </button>
                            <button type="button" onClick={cancelEdit} className="btn btn-outline">Скасувати</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="admin-toolbar">
                <input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Пошук: назва, код, бренд або ID" aria-label="Пошук товарів" />
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))} aria-label="Видимість">
                    <option value="all">Усі</option>
                    <option value="active">На сайті</option>
                    <option value="hidden">Приховані</option>
                </select>
                {loading && <Loader2 className="spin" size={18} color="var(--brand)" />}
            </div>

            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Фото</th>
                            <th>Назва</th>
                            <th>Ціна</th>
                            <th>Наявність</th>
                            <th>Категорія</th>
                            <th><Star size={16} /></th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.items.map(product => (
                            <tr key={product.id} style={{ opacity: product.active ? 1 : 0.55 }}>
                                <td>
                                    <div className="table-thumb">
                                        {product.images && product.images.length > 0 ? (
                                            <img src={product.images[0]} alt="" loading="lazy" />
                                        ) : (
                                            <span>—</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ maxWidth: '360px' }}>
                                    <strong>{product.title}</strong>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                        #{product.id}{product.article ? ` · ${product.article}` : ''}{product.brand ? ` · ${product.brand}` : ''}
                                    </div>
                                    <div style={{ marginTop: '0.25rem' }}>
                                        {!product.active && <span className="admin-chip admin-chip-hidden">Приховано</span>}
                                        {product.syncLocked && <span className="admin-chip admin-chip-locked">Ручне керування</span>}
                                    </div>
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                    {product.price > 0 ? `₴ ${formatPrice(product.price)}` : 'За запитом'}
                                    {product.supplierPrice != null && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>пост.: ₴ {formatPrice(product.supplierPrice)}</div>
                                    )}
                                </td>
                                <td>
                                    <span className={product.availability === 'in_stock' ? 'stock-ok' : product.availability === 'out_of_stock' ? 'stock-zero' : ''} style={product.availability === 'on_order' ? { color: 'var(--gold-deep)', fontWeight: 600 } : undefined}>
                                        {AVAILABILITY_LABELS[product.availability] || product.availability}
                                    </span>
                                </td>
                                <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>{product.category}</td>
                                <td>{product.featured ? <Star size={16} fill="var(--gold)" color="var(--gold)" /> : '—'}</td>
                                <td>
                                    <div className="admin-actions">
                                        <button onClick={() => startEdit(product.id)} className="btn-small btn-edit" title="Редагувати"><Edit size={16} /></button>
                                        <button onClick={() => handleHide(product)} className="btn-small btn-delete" title="Сховати">
                                            <EyeOff size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && list.items.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--medium-gray)' }}>Нічого не знайдено</p>
                )}
                <div className="admin-pager">
                    <button className="btn-small btn-outline" disabled={list.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Назад</button>
                    <span>Сторінка {list.page} з {list.pages} · {list.total.toLocaleString('uk-UA')} товарів</span>
                    <button className="btn-small btn-outline" disabled={list.page >= list.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Далі →</button>
                </div>
            </div>
        </div>
    );
}
