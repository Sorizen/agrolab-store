'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import Photo from '@/components/Photo';

export default function ImageGallery({ images, title }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [failed, setFailed] = useState({});
    const list = (images || []).filter((_, i) => !failed[i]);

    if (list.length === 0) {
        return (
            <div className="pd-photo pd-photo-empty">
                <Package size={56} strokeWidth={1.2} />
                <span>Фото незабаром</span>
            </div>
        );
    }

    const index = Math.min(activeIndex, list.length - 1);
    const go = (step) => setActiveIndex((index + step + list.length) % list.length);

    return (
        <div className="pd-gallery-inner">
            <div className="pd-photo">
                <Photo
                    src={list[index]}
                    alt={`${title} — фото ${index + 1}`}
                    sizes="(max-width: 900px) 100vw, 560px"
                    width={900}
                    height={900}
                    priority={index === 0}
                    onError={() => setFailed(prev => ({ ...prev, [images.indexOf(list[index])]: true }))}
                />
                {list.length > 1 && (
                    <>
                        <button type="button" className="pd-photo-nav prev" onClick={() => go(-1)} aria-label="Попереднє фото"><ChevronLeft size={22} /></button>
                        <button type="button" className="pd-photo-nav next" onClick={() => go(1)} aria-label="Наступне фото"><ChevronRight size={22} /></button>
                        <span className="pd-photo-count">{index + 1} / {list.length}</span>
                    </>
                )}
            </div>
            {list.length > 1 && (
                <div className="pd-thumbs">
                    {list.map((img, i) => (
                        <button
                            type="button"
                            key={img}
                            className={`pd-thumb ${i === index ? 'active' : ''}`}
                            onClick={() => setActiveIndex(i)}
                            aria-label={`Фото ${i + 1}`}
                        >
                            <Photo src={img} alt="" sizes="80px" width={160} height={160} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
