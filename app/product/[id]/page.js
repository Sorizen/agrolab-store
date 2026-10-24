import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProductById, getRelatedProducts, getCategoryTree, categoryPath } from '@/lib/data';
import { AVAILABILITY_LABELS } from '@/lib/availability';
import { site } from '@/lib/site';
import { productPath, categoryUrl, parseIdSlug } from '@/lib/slug';
import { absoluteUrl, breadcrumbJsonLd, jsonLdString, truncate } from '@/lib/seo';
import ImageGallery from '@/components/ImageGallery';
import ProductSections from '@/components/ProductSections';
import AddToCartButton from '@/components/AddToCartButton';
import TrackProductView from '@/components/TrackProductView';
import ProductCard from '@/components/ProductCard';
import CopyCode from '@/components/CopyCode';
import { Truck, HeartHandshake, ShieldCheck, Phone, Wrench, Tractor, ArrowRight, Info } from 'lucide-react';

export const revalidate = 300;

export async function generateStaticParams() {
    return [];
}

const formatPrice = (n) => Number(n).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

function highlightChips(specs) {
    const find = (re) => Object.entries(specs).find(([k]) => re.test(k))?.[1];
    const chips = [];
    const type = find(/^тип запчастин/i);
    const condition = find(/^стан$/i);
    const warranty = find(/^гарантійн/i);
    const country = find(/^країна/i);
    if (type) chips.push(String(type));
    if (condition) chips.push(String(condition));
    if (warranty) chips.push(`Гарантія ${warranty}`);
    if (country) chips.push(String(country));
    return chips;
}

function fitment(specs) {
    const values = Object.entries(specs)
        .filter(([k]) => /^(сумісність|застосування|підходить)/i.test(k))
        .flatMap(([, v]) => String(v).split(/\s*[,;]\s*/))
        .filter(Boolean);
    return [...new Set(values)].join(' · ');
}

function titleWithCodes(title) {
    return title.split(/(\S*\d\S*-\S+)/).map((part, i) =>
        i % 2 ? <span key={i} className="pd-nowrap">{part}</span> : part
    );
}

const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

async function loadProduct(param) {
    const parsed = parseIdSlug(param);
    if (!parsed) return null;
    return getProductById(parsed.id);
}

const AVAILABILITY_TEXT = { in_stock: 'в наявності', on_order: 'під замовлення', out_of_stock: 'немає в наявності' };

export async function generateMetadata({ params }) {
    const { id } = await params;
    const product = await loadProduct(id);
    if (!product) return { title: 'Товар не знайдено', robots: { index: false } };
    const title = `${truncate(product.title, 58)}${product.article && !product.title.includes(product.article) ? ` (${product.article})` : ''} | ${site.name}`;
    const price = product.price > 0 ? `Ціна ${formatPrice(product.price)} грн, ` : '';
    const description = truncate(
        `Купити ${product.title}${product.article && !product.title.includes(product.article) ? ` (код ${product.article})` : ''}. ${price}${AVAILABILITY_TEXT[product.availability] || ''}. Доставка Новою Поштою по Україні.`,
        158
    );
    const canonical = absoluteUrl(productPath(product));
    return {
        title,
        description,
        keywords: product.tags?.length ? product.tags.join(', ') : undefined,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
            locale: 'uk_UA',
            siteName: site.name,
            images: product.images[0] ? [{ url: product.images[0], alt: product.title }] : undefined,
        },
        twitter: { card: product.images[0] ? 'summary_large_image' : 'summary', title, description },
    };
}

export default async function ProductPage({ params }) {
    const { id } = await params;
    const product = await loadProduct(id);
    if (!product) notFound();
    const canonicalPath = productPath(product);
    if (decodeURIComponent(`/product/${id}`) !== canonicalPath) permanentRedirect(canonicalPath);

    let path = [];
    let related = [];
    try {
        const [tree, rel] = await Promise.all([getCategoryTree(), getRelatedProducts(product, 8)]);
        path = product.categoryId ? categoryPath(tree, product.categoryId) : [];
        related = rel;
    } catch (e) {
        console.error('Product extras failed:', e.message);
    }

    const specsEntries = Object.entries(product.specs || {});
    const description = (product.description && product.description.trim()) || product.shortDescription;

    const productUrl = absoluteUrl(canonicalPath);
    const inStockNow = product.availability === 'in_stock';
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        url: productUrl,
        name: product.title,
        sku: product.article || String(product.id),
        mpn: product.article || undefined,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        category: 'Vehicles & Parts > Vehicle Parts & Accessories',
        image: product.images.length ? product.images : undefined,
        description: description ? truncate(description, 500) : undefined,
        offers: product.price > 0 ? {
            '@type': 'Offer',
            url: productUrl,
            priceCurrency: 'UAH',
            price: product.price,
            validFrom: new Date().toISOString().slice(0, 10),
            priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            itemCondition: 'https://schema.org/NewCondition',
            shippingDetails: {
                '@type': 'OfferShippingDetails',
                shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' },
                deliveryTime: {
                    '@type': 'ShippingDeliveryTime',
                    handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
                    transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
                },
            },
            hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                applicableCountry: 'UA',
                returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                merchantReturnDays: 14,
                returnMethod: 'https://schema.org/ReturnByMail',
                returnFees: 'https://schema.org/ReturnShippingFees',
                merchantReturnLink: absoluteUrl('/returns'),
            },
            availability: inStockNow
                ? 'https://schema.org/InStock'
                : product.availability === 'on_order' ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: site.name, url: absoluteUrl('/') },
        } : undefined,
    };
    const trail = [
        { name: 'Головна', path: '/' },
        { name: 'Каталог', path: '/catalogue' },
        ...path.map(c => ({ name: c.name, path: categoryUrl(c) })),
        { name: product.title, path: canonicalPath },
    ];

    const chips = highlightChips(product.specs || {});
    const fits = fitment(product.specs || {});
    const category = path[path.length - 1];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd(trail)) }} />

            <nav className="breadcrumb">
                <div className="container">
                    <ul className="breadcrumb-list">
                        <li><Link href="/">Головна</Link></li>
                        <li><Link href="/catalogue">Каталог</Link></li>
                        {path.map(c => (
                            <li key={c.id}><Link href={categoryUrl(c)}>{c.name}</Link></li>
                        ))}
                        <li>{product.title}</li>
                    </ul>
                </div>
            </nav>

            <section className="section pd-section">
                <div className="container">
                    <div className="pd-top">
                        <div className="pd-gallery">
                            <ImageGallery images={product.images} title={product.title} />
                        </div>

                        <div className="pd-buy">
                            <div className="pd-eyebrow">
                                {product.brand && <span className="pd-brand">{product.brand}</span>}
                                <span className={`availability-pill availability-${product.availability}`}>
                                    {AVAILABILITY_LABELS[product.availability] || AVAILABILITY_LABELS.out_of_stock}
                                </span>
                            </div>

                            <h1 className="pd-title">{titleWithCodes(product.title)}</h1>

                            {(product.article || chips.length > 0) && (
                                <div className="pd-tags">
                                    {product.article && <CopyCode code={product.article} />}
                                    {chips.map(chip => <span key={chip} className="pd-chip">{chip}</span>)}
                                </div>
                            )}

                            {fits && (
                                <div className="pd-fit">
                                    <Tractor size={20} />
                                    <span>Підходить для: <strong>{fits}</strong></span>
                                </div>
                            )}

                            {product.shortDescription && <p className="pd-lead">{product.shortDescription}</p>}

                            <div className="pd-price-card">
                                {product.price > 0 ? (
                                    <div className="ls-detail-price">
                                        <span className="now">
                                            {product.priceFrom && <span className="price-from">від </span>}₴ {formatPrice(product.price)}
                                            {product.priceUnit && <span className="price-unit"> / {product.priceUnit}</span>}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="pd-price-request">Ціна за запитом</div>
                                )}

                                {product.availability === 'on_order' && (
                                    <p className="pd-note"><Info size={15} /> Під замовлення: термін поставки підтвердить менеджер після оформлення.</p>
                                )}
                                {product.availability === 'out_of_stock' && (
                                    <p className="pd-note"><Info size={15} /> Зараз немає в наявності. Зателефонуйте, і ми підберемо аналог.</p>
                                )}

                                <AddToCartButton product={product} />
                                <TrackProductView product={{ id: product.id, title: product.title, brand: product.brand, price: product.price }} />

                                <a href={`tel:${site.phone}`} className="product-call-link">
                                    <Phone size={16} /> Уточнити наявність або підбір: {site.phoneDisplay}
                                </a>

                                <ul className="pd-assure">
                                    <li><Truck size={17} /><span><strong>Швидка доставка</strong> Новою Поштою</span></li>
                                    <li><HeartHandshake size={17} /><span><strong>Оплата при отриманні</strong>{process.env.MONOBANK_API_TOKEN ? ' або карткою' : ''}</span></li>
                                    <li><ShieldCheck size={17} /><span><strong>Гарантія</strong> виробника</span></li>
                                    <li><Wrench size={17} /><span><strong>Підбір</strong> за номером чи фото</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {(description || specsEntries.length > 0) && (
                        <div id="details" className={`pd-details ${description && specsEntries.length > 0 ? 'two' : ''}`}>
                            {description && (
                                <article className="pd-card pd-desc">
                                    <h2>Опис</h2>
                                    {paragraphs(description).map((p, i) => <p key={i}>{p}</p>)}
                                </article>
                            )}
                            {specsEntries.length > 0 && (
                                <aside className="pd-card pd-specs">
                                    <h2>Характеристики</h2>
                                    <dl>
                                        {product.article && <div className="pd-spec-row"><dt>Код</dt><dd>{product.article}</dd></div>}
                                        {product.brand && !product.specs['Виробник'] && <div className="pd-spec-row"><dt>Виробник</dt><dd>{product.brand}</dd></div>}
                                        {specsEntries.map(([key, value]) => (
                                            <div key={key} className="pd-spec-row"><dt>{key}</dt><dd>{String(value)}</dd></div>
                                        ))}
                                    </dl>
                                </aside>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {product.sections && product.sections.length > 0 && (
                <section className="section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        <ProductSections sections={product.sections} />
                    </div>
                </section>
            )}

            {related.length > 0 && (
                <section className="section pd-related">
                    <div className="container">
                        <div className="lsx-head-row">
                            <h2 className="lsx-title" style={{ fontSize: '1.7rem' }}>Схожі товари</h2>
                            {category && (
                                <Link href={categoryUrl(category)} className="lsx-link">Усі в «{category.name}» <ArrowRight size={18} /></Link>
                            )}
                        </div>
                        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            {related.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}
