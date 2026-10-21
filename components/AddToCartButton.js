'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Plus, Minus, ShoppingCart, Check } from 'lucide-react';
import { isOrderable } from '@/lib/availability';

export default function AddToCartButton({ product }) {
    const { addToCart, openCart } = useCart();
    const [added, setAdded] = useState(false);
    const [quantity, setQuantity] = useState(1);

    const handleAdd = () => {
        addToCart(product, quantity);
        setAdded(true);
        openCart();
        setTimeout(() => setAdded(false), 2000);
        setQuantity(1);
    };

    if (!isOrderable(product)) {
        return (
            <button className="btn-star cart-btn" disabled style={{ width: '100%', opacity: 0.55, cursor: 'not-allowed' }}>
                {product.price > 0 ? 'Немає в наявності' : 'Ціна за запитом'}
            </button>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--off-white)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--extra-light-gray)' }}>
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        style={{ padding: '0.4rem', background: 'transparent', border: 'none', cursor: quantity <= 1 ? 'not-allowed' : 'pointer', color: quantity <= 1 ? 'var(--dark-gray)' : 'var(--charcoal)' }}
                        disabled={quantity <= 1}
                    >
                        <Minus size={18} />
                    </button>
                    <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>{quantity}</span>
                    <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        style={{ padding: '0.4rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--charcoal)' }}
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <button
                    className={`btn-star cart-btn ${added ? 'btn-success' : ''}`}
                    onClick={handleAdd}
                    style={{
                        flex: 1,
                        minWidth: '180px',
                        transform: added ? 'scale(0.98)' : 'scale(1)',
                    }}
                >
                    {added ? <><Check size={20} /> Додано в кошик</> : <><ShoppingCart size={20} /> У кошик</>}
                </button>
            </div>
        </div>
    );
}
