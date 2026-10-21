'use client';

import { productPath } from '@/lib/slug';
import Photo from '@/components/Photo';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function FeaturedCarousel({ products }) {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);

    const next = useCallback(() => {
        setActive(prev => (prev + 1) % products.length);
    }, [products.length]);

    const prev = useCallback(() => {
        setActive(prev => (prev - 1 + products.length) % products.length);
    }, [products.length]);

    useEffect(() => {
        if (paused || products.length <= 1) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [paused, next, products.length]);

    if (!products || products.length === 0) return null;

    const product = products[active];
    const hasImage = product.images && product.images.length > 0;

    return (
        <div
            className="featured-carousel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >

            <div className="carousel-bg">
                {hasImage && <Photo src={product.images[0]} alt="" sizes="320px" width={320} height={320} />}
            </div>

            <div className="carousel-content">
                <div className="carousel-info" key={product.id}>
                    <p className="carousel-category">{product.category}</p>
                    <h3>{product.title}</h3>
                    <p className="carousel-desc">
                        {product.shortDescription || product.description?.substring(0, 120)}
                    </p>
                    <div className="carousel-price">
                        {product.price > 0 ? `₴ ${product.price}` : 'За запитом'}
                    </div>
                    <Link href={productPath(product)} className="btn btn-blue">
                        Переглянути →
                    </Link>
                </div>

                <div className="carousel-image-frame">
                    {hasImage ? (
                        <Photo src={product.images[0]} alt={product.title} sizes="(max-width: 768px) 90vw, 420px" width={840} height={840} key={product.id} />
                    ) : (
                        <div className="carousel-placeholder">📦</div>
                    )}
                </div>
            </div>

            {products.length > 1 && (
                <>
                    <button className="carousel-arrow carousel-prev" onClick={prev} aria-label="Previous">‹</button>
                    <button className="carousel-arrow carousel-next" onClick={next} aria-label="Next">›</button>

                    <div className="carousel-dots">
                        {products.map((_, i) => (
                            <button
                                key={i}
                                className={`carousel-dot ${i === active ? 'active' : ''}`}
                                onClick={() => setActive(i)}
                                aria-label={`Product ${i + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
