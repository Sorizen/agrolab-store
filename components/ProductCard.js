'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import QuantityStepper from '@/components/QuantityStepper';
import { productPath } from '@/lib/slug';
import Photo from '@/components/Photo';
import { useCart } from '@/contexts/CartContext';
import { isOrderable, AVAILABILITY_LABELS } from '@/lib/availability';

const formatPrice = (n) => Number(n).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

export default function ProductCard({ product, variant = 'card', priority = false }) {
    const { cart, addToCart, updateQuantity } = useCart();
    const inCart = cart.find(item => item.cartKey === String(product.id))?.quantity || 0;
    const orderable = isOrderable(product);
    const [imageFailed, setImageFailed] = useState(false);
    const hasImage = product.images && product.images.length > 0 && !imageFailed;

    const eyebrow = product.brand || product.category;
    const href = productPath(product);

    const stop = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleQuickAdd = (e) => {
        stop(e);
        addToCart(product, 1);
    };
    const handleDecrease = (e) => {
        stop(e);
        updateQuantity(String(product.id), inCart - 1);
    };

    const priceText = product.price > 0 ? (
        <>
            {product.priceFrom && <span className="price-from">від </span>}
            ₴ {formatPrice(product.price)}
            {product.priceUnit && <span className="price-unit"> / {product.priceUnit}</span>}
        </>
    ) : 'За запитом';
    const addButton = orderable && (<div className="add-slot">{inCart > 0 ? (
        <QuantityStepper value={inCart} onDecrease={handleDecrease} onIncrease={handleQuickAdd} onClick={stop} />
    ) : (
        <button
            onClick={handleQuickAdd}
            className="btn-quick-add"
            title="Додати в кошик"
            aria-label={`Додати в кошик: ${product.title}`}
        >
            <Plus size={18} />
        </button>
    )}</div>);

    if (variant === 'row') {
        return (
            <div className="product-row">
                <Link href={href} className="product-row-thumb">
                    {hasImage
                        ? <Photo src={product.images[0]} alt="" sizes="56px" width={112} height={112} priority={priority} onError={() => setImageFailed(true)} />
                        : <Package size={22} color="var(--medium-gray)" />}
                </Link>
                <div className="product-row-main">
                    <Link href={href} className="product-row-title" title={product.title}>{product.title}</Link>
                    <div className="product-row-meta">
                        {product.article && <span className="product-row-code">{product.article}</span>}
                        {eyebrow && <span>{eyebrow}</span>}
                    </div>
                </div>
                <span className={`product-row-stock stock-${product.availability}`}>
                    {AVAILABILITY_LABELS[product.availability] || AVAILABILITY_LABELS.out_of_stock}
                </span>
                <div className="product-row-price">
                    <span>{priceText}</span>
                </div>
                <div className="product-row-action">{addButton}</div>
            </div>
        );
    }

    return (
        <div className="product-card">
            <Link href={href} className="product-card-image">
                {hasImage ? (
                    <Photo src={product.images[0]} alt={product.title} sizes="(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 240px" priority={priority} onError={() => setImageFailed(true)} />
                ) : (
                    <div className="product-card-placeholder">
                        <Package size={32} color="var(--medium-gray)" />
                    </div>
                )}

                {product.availability !== 'in_stock' && (
                    <div className={`product-badge ${product.availability === 'on_order' ? 'badge-order' : 'badge-out'}`} style={{ position: 'absolute', top: '0.7rem', right: '0.7rem' }}>
                        {product.availability === 'on_order' ? 'Під замовлення' : 'Немає'}
                    </div>
                )}
            </Link>

            <div className="product-card-content">
                {eyebrow && <p className="product-card-category" title={eyebrow}>{eyebrow}</p>}
                <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h4 title={product.title}>{product.title}</h4>
                </Link>
                {product.article && <p className="product-card-article">{product.article}</p>}

                <div className="product-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div className="ls-price-wrap">
                        <div className="product-card-price">{priceText}</div>
                    </div>
                    {addButton}
                </div>
            </div>
        </div>
    );
}
