'use client';

import { useState, useEffect, useCallback } from 'react';
import { Phone, Mail, Loader2 } from 'lucide-react';

const STATUSES = ['Нове', 'В обробці', 'Вирішено', 'Закрито'];
const STATUS_COLOR = { 'Нове': 'var(--sale)', 'В обробці': 'var(--gold-deep)', 'Вирішено': 'var(--brand)', 'Закрито': 'var(--muted)' };

export default function SupportTab() {
    const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ page: String(page), ...(statusFilter ? { status: statusFilter } : {}) });
            const res = await fetch(`/api/admin/support?${qs}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
            setError('');
        } catch (e) {
            setError(`Не вдалося завантажити звернення: ${e.message}`);
        }
        setLoading(false);
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    async function changeStatus(id, status) {
        const res = await fetch('/api/admin/support', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        });
        if (res.ok) setData(d => ({ ...d, items: d.items.map(r => (r.id === id ? { ...r, status } : r)) }));
        else setError('Не вдалося оновити статус');
    }

    return (
        <div>
            <div className="admin-toolbar">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Статус">
                    <option value="">Усі статуси</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{data.total.toLocaleString('uk-UA')} звернень</span>
                {loading && <Loader2 className="spin" size={18} color="var(--brand)" />}
            </div>
            {error && <div className="admin-message error">{error}</div>}

            {!loading && data.items.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--medium-gray)' }}>Звернень немає</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.items.map(r => (
                        <div key={r.id} className="pd-card" style={{ padding: '1rem 1.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.9rem' }}>
                                    <strong>#{r.id} · {[r.customer_first_name, r.customer_last_name].filter(Boolean).join(' ') || 'Без імені'}</strong>
                                    <span style={{ color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    {r.customer_phone && <a href={`tel:${r.customer_phone.replace(/[^\d+]/g, '')}`} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center', color: 'var(--brand)' }}><Phone size={14} /> {r.customer_phone}</a>}
                                    {r.customer_email && <a href={`mailto:${r.customer_email}`} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center', color: 'var(--brand)' }}><Mail size={14} /> {r.customer_email}</a>}
                                    {r.user_id && <span className="admin-chip admin-chip-supplier">Зареєстрований клієнт</span>}
                                </div>
                                <select
                                    value={r.status}
                                    onChange={e => changeStatus(r.id, e.target.value)}
                                    style={{ padding: '0.3rem', borderRadius: '4px', border: `1px solid ${STATUS_COLOR[r.status] || 'var(--line)'}`, color: STATUS_COLOR[r.status], fontWeight: 600, background: 'transparent' }}
                                    aria-label="Статус звернення"
                                >
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <p style={{ whiteSpace: 'pre-wrap', margin: '0.6rem 0 0', fontSize: '0.92rem', lineHeight: 1.6 }}>{r.message}</p>
                        </div>
                    ))}
                </div>
            )}

            {data.pages > 1 && (
                <div className="admin-pager">
                    <button className="btn-small btn-outline" disabled={data.page <= 1} onClick={() => setPage(p => p - 1)}>← Новіші</button>
                    <span>Сторінка {data.page} з {data.pages}</span>
                    <button className="btn-small btn-outline" disabled={data.page >= data.pages} onClick={() => setPage(p => p + 1)}>Старіші →</button>
                </div>
            )}
        </div>
    );
}
