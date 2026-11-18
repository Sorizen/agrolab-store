'use client';

import { useState, useEffect, useCallback } from 'react';
import CategoryVisibility from './CategoryVisibility';
import HiddenProducts from './HiddenProducts';

export default function VisibilityTab() {
    const [data, setData] = useState({ categories: [], hiddenProducts: [] });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/visibility');
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
            setData(await res.json());
        } catch (err) {
            setMessage({ text: `Помилка завантаження: ${err.message}`, type: 'error' });
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    function show(text, type = 'success') {
        setMessage({ text, type });
        if (type !== 'error') setTimeout(() => setMessage(null), 5000);
    }

    async function send(body, id, done) {
        setBusyId(id);
        try {
            const res = await fetch('/api/admin/visibility', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Не вдалося зберегти');
            await load();
            show(done(result));
        } catch (err) {
            show(err.message, 'error');
        }
        setBusyId(null);
    }

    function toggleCategory(node) {
        const hide = !node.hidden;
        if (hide && !window.confirm(`Приховати групу «${node.name}» разом з усіма підгрупами? Зараз на сайті: ${node.visible} товарів.`)) return;
        send({ categoryId: node.id, hidden: hide }, node.id, (r) => (hide ? `Групу приховано, зникло товарів: ${r.changed}` : `Групу показано, повернулося товарів: ${r.changed}`));
    }

    function togglePhotos(node) {
        const next = !node.ownPhotos;
        if (next && !window.confirm(`Для групи «${node.name}» синхронізація більше не братиме фото постачальника: оновлюватимуться лише ціна та наявність. Нові товари цієї групи з'являться на сайті, коли ви додасте їм власні фото. Продовжити?`)) return;
        send({ categoryId: node.id, ownPhotos: next }, node.id, () => (next ? 'Група переведена на власні фото' : 'Група знову бере фото постачальника'));
    }

    function hideProduct(product) {
        if (!window.confirm(`Приховати товар «${product.title}»?`)) return;
        send({ productId: product.id, hidden: true }, product.id, () => 'Товар приховано');
    }

    function showProduct(product) {
        send({ productId: product.id, hidden: false }, product.id, () => 'Товар знову керується синхронізацією');
    }

    return (
        <div>
            {message && <div className={`admin-message ${message.type}`}>{message.text}</div>}
            {loading ? (
                <p>Завантаження…</p>
            ) : (
                <>
                    <section className="vis-section">
                        <h3>Групи товарів</h3>
                        <p className="vis-hint">Прихована група зникає з каталогу, пошуку, карти сайту та фіду Google разом з усіма підгрупами. Нові товари з цієї групи теж не з'являться. Товари з «Ручним керуванням» не змінюються.</p>
                        <CategoryVisibility categories={data.categories} onToggle={toggleCategory} onTogglePhotos={togglePhotos} busyId={busyId} />
                    </section>
                    <section className="vis-section">
                        <h3>Окремі товари</h3>
                        <HiddenProducts products={data.hiddenProducts} onHide={hideProduct} onShow={showProduct} busyId={busyId} />
                    </section>
                </>
            )}
        </div>
    );
}
