'use client';

import Photo from '@/components/Photo';

export default function ProductSections({ sections }) {
    if (!sections || sections.length === 0) return null;

    return (
        <div className="product-sections">
            {sections.map((section, i) => {
                switch (section.type) {
                    case 'text':
                        return <TextSection key={i} data={section} />;
                    case 'features':
                        return <FeaturesSection key={i} data={section} />;
                    case 'gallery':
                        return <GallerySection key={i} data={section} />;
                    case 'banner':
                        return <BannerSection key={i} data={section} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}

function TextSection({ data }) {
    return (
        <div className="section-block section-text">
            {data.title && <h3>{data.title}</h3>}
            <div className="section-text-content">
                {data.content.split('\n').map((p, i) => (
                    <p key={i}>{p}</p>
                ))}
            </div>
        </div>
    );
}

function FeaturesSection({ data }) {
    return (
        <div className="section-block section-features">
            {data.title && <h3>{data.title}</h3>}
            <div className="features-grid">
                {data.items.map((item, i) => (
                    <div key={i} className="feature-item">
                        <span className="feature-icon">{item.icon || '✓'}</span>
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GallerySection({ data }) {
    return (
        <div className="section-block section-gallery">
            {data.title && <h3>{data.title}</h3>}
            <div className="section-gallery-grid">
                {data.images.map((img, i) => (
                    <div key={i} className="section-gallery-item">
                        <Photo src={img} alt={`${data.title || 'Фото'} ${i + 1}`} sizes="(max-width: 768px) 90vw, 420px" width={840} height={840} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function BannerSection({ data }) {
    return (
        <div
            className="section-block section-banner"
            style={data.bgColor ? { background: data.bgColor } : {}}
        >
            {data.icon && <span className="banner-icon">{data.icon}</span>}
            <h3>{data.title}</h3>
            {data.content && <p>{data.content}</p>}
        </div>
    );
}
