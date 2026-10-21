'use client';

import { useEffect, useRef } from 'react';

export default function ScrollReveal({ children, direction = 'left', className = '' }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal');
                    }
                });
            },
            { root: null, rootMargin: '0px', threshold: 0.15 }
        );

        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    const directionClass = `about-card--from-${direction}`;

    return (
        <div ref={ref} className={`about-card ${directionClass} ${className}`}>
            {children}
        </div>
    );
}
