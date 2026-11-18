'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { AVAILABILITY_LABELS } from '@/lib/availability';

const money = (value) => Number(value || 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

export default function ProductPicker({ onPick }) {
    const [text, setText] = useState('');
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        const q = text.trim();
        if (q.length < 2) {
            setResults([]);
            setSearched(false);
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q, status: 'all' });
                const res = await fetch(`/api/products?${params}`, { signal: controller.signal });
                if (!res.ok) return;
                const data = await res.json();
                setResults((data.items || []).slice(0, 8));
                setSearched(true);
            } catch {}
        }, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text]);

    function pick(product) {
        onPick({ id: product.id, title: product.title, article: product.article || '', price: product.price });
        setText('');
        setResults([]);
        setSearched(false);
    }

    return (
        <div className="mo-picker">
            <Search size={16} className="mo-picker-icon" />
            <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Пошук товару за назвою або кодом"
                aria-label="Пошук товару"
            />
            {(results.length > 0 || searched) && (
                <div className="mo-results">
                    {results.length === 0 && <div className="mo-result-empty">Нічого не знайдено</div>}
                    {results.map((product) => (
                        <button type="button" key={product.id} className="mo-result" onClick={() => pick(product)}>
                            <span>
                                {product.title}
                                <small>{[product.article && `Код: ${product.article}`, AVAILABILITY_LABELS[product.availability], product.active === false && 'Прихований на сайті'].filter(Boolean).join(' · ')}</small>
                            </span>
                            <strong>₴{money(product.price)}</strong>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
