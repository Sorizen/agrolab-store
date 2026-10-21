'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const formatMoney = (n) => Number(n || 0).toLocaleString('uk-UA', { maximumFractionDigits: 0 });

export default function StatsTab() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(async r => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
                setStats(data);
            })
            .catch(e => setError(e.message));
    }, []);

    if (error) return <p style={{ color: 'var(--sale)' }}>Помилка: {error}</p>;
    if (!stats) return <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Loader2 size={16} className="spin" /> Завантаження…</p>;

    return (
        <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="admin-stat-grid">
                <div className="admin-stat"><strong>{stats.orders}</strong><span>замовлень (без скасованих)</span></div>
                <div className="admin-stat"><strong>{stats.last30.orders}</strong><span>за 30 днів</span></div>
                <div className="admin-stat"><strong>₴ {formatMoney(stats.last30.revenue)}</strong><span>обіг за 30 днів</span></div>
            </div>

            <div className="admin-form-wrapper">
                <h3>Топ товарів</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {stats.popularity.enabled
                        ? 'Каталог сортується за популярністю (продажі за останні 90 днів).'
                        : `Популярність у каталозі ввімкнеться, коли набереться ${stats.popularity.minOrders} замовлень (зараз ${stats.orders}). До цього порядок у каталозі звичайний.`}
                </p>
                {stats.top.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>Продажів ще немає.</p>
                ) : (
                    <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead><tr><th>#</th><th>Товар</th><th>90 днів, шт.</th><th>Всього, шт.</th></tr></thead>
                            <tbody>
                                {stats.top.map((p, i) => (
                                    <tr key={p.id}>
                                        <td>{i + 1}</td>
                                        <td>
                                            <strong>{p.title}</strong>
                                            {p.article && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Код: {p.article}</div>}
                                        </td>
                                        <td>{p.sales_90d}</td>
                                        <td>{p.sales_units}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
