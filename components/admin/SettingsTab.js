'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, CheckCircle, Megaphone, RefreshCw, DatabaseZap, Percent, ShoppingBasket } from 'lucide-react';

const RUN_MODES = { full: 'Повна', updates: 'Оновлення', push: 'Від постачальника', file: 'З файлу' };

export default function SettingsTab() {
    const [announcement, setAnnouncement] = useState('');
    const [markup, setMarkup] = useState('');
    const [minOrder, setMinOrder] = useState('');
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [notice, setNotice] = useState(null);

    const loadOverview = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/supplier');
            if (res.ok) setOverview(await res.json());
        } catch {}
    }, []);

    useEffect(() => {
        Promise.all([
            fetch('/api/settings').then(r => r.json()).then(d => {
                setAnnouncement(d.announcement ?? '');
                setMarkup(d.markup_percent ?? '5');
                setMinOrder(d.min_order ?? '200');
            }),
            loadOverview(),
        ]).catch(() => {}).finally(() => setLoading(false));
    }, [loadOverview]);

    const running = overview?.runs?.some(r => r.status === 'running');
    useEffect(() => {
        if (!running) return;
        const t = setInterval(loadOverview, 5000);
        return () => clearInterval(t);
    }, [running, loadOverview]);

    async function saveMarkup() {
        const value = String(markup).replace(',', '.');
        if (!(Number(value) >= 0) || Number(value) > 300) {
            setNotice({ kind: 'markup', type: 'error', text: 'Вкажіть число від 0 до 300' });
            return;
        }
        if (!window.confirm(`Встановити націнку ${value}% і перерахувати ціни всіх товарів АГРОЛОСК (крім «Ручне керування»)?`)) return;
        setSaving('markup'); setNotice(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markup_percent: value }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'Не вдалося зберегти');
            setMarkup(String(d.percent));
            setNotice({ kind: 'markup', type: 'ok', text: `Збережено. Перераховано цін: ${Number(d.repriced).toLocaleString('uk-UA')}` });
        } catch (e) {
            setNotice({ kind: 'markup', type: 'error', text: e.message });
        } finally {
            setSaving(null);
        }
    }

    async function saveMinOrder() {
        const value = String(minOrder).trim();
        if (!/^\d{1,7}$/.test(value)) {
            setNotice({ kind: 'minOrder', type: 'error', text: 'Вкажіть ціле число гривень' });
            return;
        }
        await save('minOrder', { min_order_uah: value });
    }

    async function save(kind, body) {
        setSaving(kind); setNotice(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'Не вдалося зберегти');
            setNotice({ kind, type: 'ok', text: 'Збережено' });
        } catch (e) {
            setNotice({ kind, type: 'error', text: e.message });
        } finally {
            setSaving(null);
        }
    }

    async function startSync(mode) {
        setNotice(null);
        const res = await fetch(`/api/supplier/sync?mode=${mode}`, { method: 'POST' });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) setNotice({ kind: 'sync', type: 'error', text: d.error || `HTTP ${res.status}` });
        else setNotice({ kind: 'sync', type: 'ok', text: 'Синхронізацію запущено' });
        setTimeout(loadOverview, 800);
    }

    if (loading) return <p style={{ color: 'var(--muted)' }}>Завантаження…</p>;

    const Notice = ({ kind }) => notice?.kind === kind ? (
        <span style={{ color: notice.type === 'ok' ? 'var(--brand)' : 'var(--sale)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            {notice.type === 'ok' && <CheckCircle size={18} />} {notice.text}
        </span>
    ) : null;

    const c = overview?.counts;

    return (
        <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="admin-form-wrapper">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Megaphone size={20} /> Верхній рядок-оголошення
                </h3>
                <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.92rem' }}>
                    Текст у вузькій смужці над меню на всіх сторінках. Залиште порожнім, щоб приховати смужку.
                </p>
                <div className="form-group">
                    <input type="text" className="form-input" value={announcement} onChange={e => setAnnouncement(e.target.value)}
                        placeholder="Швидка доставка Новою Поштою по всій Україні" maxLength={160} />
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button className="btn-star" onClick={() => save('announcement', { announcement })} disabled={saving === 'announcement'}>
                        {saving === 'announcement' ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Зберегти
                    </button>
                    <Notice kind="announcement" />
                </div>
            </div>

            <div className="admin-form-wrapper">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingBasket size={20} /> Мінімальне замовлення
                </h3>
                <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.92rem' }}>
                    Менше цієї суми покупець не зможе оформити замовлення (діє в кошику і на сервері). 0 вимикає обмеження.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input type="text" inputMode="numeric" className="form-input" value={minOrder} onChange={e => setMinOrder(e.target.value)} style={{ width: '120px' }} aria-label="Мінімальне замовлення, грн" />
                    <span>₴</span>
                    <button className="btn-star" onClick={saveMinOrder} disabled={saving === 'minOrder'}>
                        {saving === 'minOrder' ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Зберегти
                    </button>
                    <Notice kind="minOrder" />
                </div>
            </div>

            <div className="admin-form-wrapper">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Percent size={20} /> Націнка на товари АГРОЛОСК
                </h3>
                <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.92rem' }}>
                    Ціна на сайті = ціна АГРОЛОСК + націнка, округлена вгору до цілої гривні (100 ₴ при 5% стануть 105 ₴). Товари з «Ручне керування» не змінюються.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input type="text" inputMode="decimal" className="form-input" value={markup} onChange={e => setMarkup(e.target.value)} style={{ width: '120px' }} aria-label="Націнка, %" />
                    <span>%</span>
                    <button className="btn-star" onClick={saveMarkup} disabled={saving === 'markup'}>
                        {saving === 'markup' ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Зберегти і перерахувати
                    </button>
                    <Notice kind="markup" />
                </div>
            </div>

            <div className="admin-form-wrapper">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DatabaseZap size={20} /> Синхронізація з постачальником
                </h3>
                {c && (
                    <div className="admin-stat-grid">
                        <div className="admin-stat"><strong>{Number(c.supplier_active).toLocaleString('uk-UA')}</strong><span>на сайті</span></div>
                        <div className="admin-stat"><strong>{Number(c.supplier_hidden).toLocaleString('uk-UA')}</strong><span>приховано</span></div>
                        <div className="admin-stat"><strong>{Number(c.supplier_locked).toLocaleString('uk-UA')}</strong><span>ручне керування</span></div>
                        <div className="admin-stat"><strong>{Number(c.manual_total).toLocaleString('uk-UA')}</strong><span>додано вручну</span></div>
                    </div>
                )}
                {overview?.pullConfigured ? (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
                        <button className="btn-star" onClick={() => startSync('updates')} disabled={running}>
                            <RefreshCw size={18} className={running ? 'spin' : ''} /> Оновити зміни
                        </button>
                        <button className="btn-ghost-star" onClick={() => startSync('full')} disabled={running}>Повна синхронізація</button>
                        <Notice kind="sync" />
                    </div>
                ) : (
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Кнопки з&apos;являться, коли на сервері буде задано SUPPLIER_API_URL. Постачальник також може
                        надсилати товари сам (POST /api/supplier/items). Деталі: docs/SUPPLIER-SYNC.md.
                    </p>
                )}

                {overview?.runs?.length > 0 ? (
                    <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr><th>#</th><th>Початок</th><th>Тип</th><th>Статус</th><th>Отримано</th><th>Нових</th><th>Змінено</th><th>Приховано</th></tr>
                            </thead>
                            <tbody>
                                {overview.runs.map(r => (
                                    <tr key={r.id} title={r.message || ''}>
                                        <td>{r.id}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.started_at).toLocaleString('uk-UA')}</td>
                                        <td>{RUN_MODES[r.mode] || r.mode}</td>
                                        <td style={{ color: r.status === 'error' ? 'var(--sale)' : r.status === 'running' ? 'var(--gold-deep)' : 'var(--brand)', fontWeight: 600 }}>
                                            {r.status === 'ok' ? 'OK' : r.status === 'running' ? 'Виконується…' : 'Помилка'}
                                            {r.message && <div style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--muted)', maxWidth: '260px' }}>{r.message}</div>}
                                        </td>
                                        <td>{r.received}</td>
                                        <td>{r.inserted}</td>
                                        <td>{r.updated}</td>
                                        <td>{r.hidden}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Синхронізацій ще не було.</p>
                )}
            </div>
        </div>
    );
}
