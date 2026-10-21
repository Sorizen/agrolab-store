'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { catalogHref as buildHref, SORT_OPTIONS } from '@/lib/catalog-params';
import { Search, SearchX, SlidersHorizontal, X, ChevronDown, ChevronRight, LayoutGrid, List, Loader2 } from 'lucide-react';

function pageWindow(page, pages) {
    const out = [];
    const from = Math.max(1, page - 2);
    const to = Math.min(pages, page + 2);
    if (from > 1) out.push(1);
    if (from > 2) out.push('…');
    for (let i = from; i <= to; i++) out.push(i);
    if (to < pages - 1) out.push('…');
    if (to < pages) out.push(pages);
    return out;
}

function CategoryNode({ node, depth, activeId, openIds, onToggle, onPick }) {
    const hasChildren = node.children.some(c => c.count > 0);
    const isOpen = openIds.has(node.id);
    return (
        <div>
            <div className="sidebar-cat-row" style={{ paddingLeft: `${depth * 0.85}rem` }}>
                {hasChildren ? (
                    <button className="sidebar-cat-chevron" onClick={() => onToggle(node.id)} aria-label={isOpen ? 'Згорнути' : 'Розгорнути'}>
                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                ) : <span className="sidebar-cat-chevron-spacer" />}
                <button
                    className={`sidebar-category ${activeId === node.id ? 'active' : ''}`}
                    onClick={() => onPick(node.id)}
                    title={node.name}
                >
                    <span className="sidebar-category-name" title={node.name}>{node.name}</span>
                    <span className="sidebar-category-count">{node.count}</span>
                </button>
            </div>
            {hasChildren && isOpen && node.children.filter(c => c.count > 0).map(child => (
                <CategoryNode key={child.id} node={child} depth={depth + 1} activeId={activeId} openIds={openIds} onToggle={onToggle} onPick={onPick} />
            ))}
        </div>
    );
}

export default function CatalogueClient({ items, total, page, pages, filters, categories, allCount, activePath, facets, popular }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const slugById = useMemo(() => {
        const map = new Map();
        const walk = (nodes) => nodes.forEach(n => { map.set(n.id, n.slug); walk(n.children); });
        walk(categories);
        return map;
    }, [categories]);
    const catalogHref = (f, overrides) => buildHref(f, overrides, (id) => slugById.get(Number(id)) || '');
    const [search, setSearch] = useState(filters.q);
    const [priceMin, setPriceMin] = useState(filters.minPrice ?? '');
    const [priceMax, setPriceMax] = useState(filters.maxPrice ?? '');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [view, setView] = useState('grid');

    useEffect(() => {
        try { if (localStorage.getItem('catalogue_view') === 'list') setView('list'); } catch {}
    }, []);
    const changeView = (next) => {
        setView(next);
        try { localStorage.setItem('catalogue_view', next); } catch {}
    };
    const [openIds, setOpenIds] = useState(() => new Set(activePath.map(c => c.id)));

    useEffect(() => { setSearch(filters.q); }, [filters.q]);
    useEffect(() => { setPriceMin(filters.minPrice ?? ''); setPriceMax(filters.maxPrice ?? ''); }, [filters.minPrice, filters.maxPrice]);
    useEffect(() => {
        setOpenIds(prev => new Set([...prev, ...activePath.map(c => c.id)]));
    }, [activePath]);

    const go = (overrides) => {
        setSidebarOpen(false);
        startTransition(() => router.push(catalogHref(filters, overrides), { scroll: false }));
    };

    const submitSearch = (e) => {
        e.preventDefault();
        go({ q: search.trim() });
    };

    const applyPrice = (e) => {
        e?.preventDefault();
        const toNum = (v) => (v === '' || v === null ? null : Math.max(0, Number(v) || 0));
        go({ minPrice: toNum(priceMin), maxPrice: toNum(priceMax) });
    };

    const toggleOpen = (id) => setOpenIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const visibleRoots = categories.filter(c => c.count > 0);
    const activeCategory = activePath[activePath.length - 1] || null;
    const hasPrice = filters.minPrice != null || filters.maxPrice != null;
    const hasActiveFilters = filters.categoryId || filters.brand || filters.inStock || hasPrice || filters.q;

    const sidebarContent = (
        <>
            <div className="sidebar-section">
                <div className="sidebar-title">Категорії</div>
                <div className="sidebar-cat-row">
                    <span className="sidebar-cat-chevron-spacer" />
                    <button className={`sidebar-category ${!filters.categoryId ? 'active' : ''}`} onClick={() => go({ categoryId: null })}>
                        <span className="sidebar-category-name">Усі товари</span>
                        <span className="sidebar-category-count">{allCount}</span>
                    </button>
                </div>
                <div className="sidebar-cat-tree">
                    {visibleRoots.map(node => (
                        <CategoryNode
                            key={node.id}
                            node={node}
                            depth={0}
                            activeId={filters.categoryId}
                            openIds={openIds}
                            onToggle={toggleOpen}
                            onPick={(id) => go({ categoryId: id === filters.categoryId ? null : id })}
                        />
                    ))}
                </div>
            </div>

            {facets.brands.length > 0 && (
                <div className="sidebar-section">
                    <div className="sidebar-title">Виробник</div>
                    <div className="sidebar-brand-list">
                        <label className="stock-toggle">
                            <input type="radio" name="brand" checked={!filters.brand} onChange={() => go({ brand: '' })} />
                            Усі виробники
                        </label>
                        {facets.brands.map(b => (
                            <label key={b.name} className="stock-toggle">
                                <input type="radio" name="brand" checked={filters.brand === b.name} onChange={() => go({ brand: b.name })} />
                                <span className="sidebar-brand-name">{b.name}</span>
                                <span className="sidebar-category-count">{b.count}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="sidebar-section">
                <div className="sidebar-title">Ціна, ₴</div>
                <form className="price-filter-inputs" onSubmit={applyPrice}>
                    <input type="number" min="0" inputMode="numeric" value={priceMin} placeholder={facets.priceMin ? String(facets.priceMin) : 'від'} onChange={e => setPriceMin(e.target.value)} />
                    <span>—</span>
                    <input type="number" min="0" inputMode="numeric" value={priceMax} placeholder={facets.priceMax ? String(facets.priceMax) : 'до'} onChange={e => setPriceMax(e.target.value)} />
                    <button type="submit" className="price-apply-btn">OK</button>
                </form>
            </div>

            <div className="sidebar-section">
                <label className="stock-toggle">
                    <input type="checkbox" checked={filters.inStock} onChange={e => go({ inStock: e.target.checked })} />
                    Тільки в наявності
                </label>
            </div>
        </>
    );

    return (
        <>
            <button className="sidebar-mobile-toggle" onClick={() => setSidebarOpen(true)}>
                <SlidersHorizontal size={18} /> Фільтри
            </button>

            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

            <div className="catalogue-layout">
                <aside className={`catalogue-sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-mobile-header">
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Фільтри</span>
                        <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                            <X size={20} />
                        </button>
                    </div>
                    {sidebarContent}
                </aside>

                <div className="catalogue-main">
                    {activePath.length > 0 && (
                        <nav className="catalogue-crumbs" aria-label="Категорія">
                            <Link href={catalogHref(filters, { categoryId: null })}>Каталог</Link>
                            {activePath.map((c, i) => (
                                <span key={c.id}>
                                    <ChevronRight size={13} />
                                    {i === activePath.length - 1
                                        ? <strong>{c.name}</strong>
                                        : <Link href={catalogHref(filters, { categoryId: c.id })}>{c.name}</Link>}
                                </span>
                            ))}
                        </nav>
                    )}

                    <form className="catalogue-search" onSubmit={submitSearch} role="search">
                        <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
                            <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--medium-gray)', pointerEvents: 'none' }} />
                            <input
                                type="search"
                                placeholder="Назва або код запчастини"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="search-input"
                                style={{ paddingLeft: '2.5rem' }}
                                aria-label="Пошук товарів"
                            />
                            <button type="submit" className="btn btn-primary catalogue-search-btn">Знайти</button>
                        </div>
                    </form>

                    {hasActiveFilters && (
                        <div className="filter-pills">
                            {activeCategory && (
                                <span className="filter-pill">
                                    {activeCategory.name}
                                    <button onClick={() => go({ categoryId: null })} aria-label="Прибрати категорію"><X size={14} /></button>
                                </span>
                            )}
                            {filters.brand && (
                                <span className="filter-pill">
                                    {filters.brand}
                                    <button onClick={() => go({ brand: '' })} aria-label="Прибрати виробника"><X size={14} /></button>
                                </span>
                            )}
                            {hasPrice && (
                                <span className="filter-pill">
                                    ₴{filters.minPrice ?? 0} — {filters.maxPrice != null ? `₴${filters.maxPrice}` : '∞'}
                                    <button onClick={() => go({ minPrice: null, maxPrice: null })} aria-label="Прибрати ціну"><X size={14} /></button>
                                </span>
                            )}
                            {filters.inStock && (
                                <span className="filter-pill">
                                    В наявності
                                    <button onClick={() => go({ inStock: false })} aria-label="Прибрати фільтр наявності"><X size={14} /></button>
                                </span>
                            )}
                            {filters.q && (
                                <span className="filter-pill">
                                    &quot;{filters.q}&quot;
                                    <button onClick={() => go({ q: '' })} aria-label="Прибрати пошук"><X size={14} /></button>
                                </span>
                            )}
                            <button
                                onClick={() => startTransition(() => router.push('/catalogue', { scroll: false }))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--dark-gray)', textDecoration: 'underline' }}
                            >
                                Скинути все
                            </button>
                        </div>
                    )}

                    <div className="filter-bar">
                        <div className="filter-bar-left">
                            <select value={filters.sort} onChange={e => go({ sort: e.target.value })} aria-label="Сортування">
                                {SORT_OPTIONS.filter(([key]) => key !== 'popular' || popular).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isPending && <Loader2 size={16} className="spin" color="var(--brand)" />}
                            <span className="results-count">{total.toLocaleString('uk-UA')} товарів</span>
                            <div className="grid-toggle view-toggle">
                                <button onClick={() => changeView('grid')} className={`grid-toggle-btn ${view === 'grid' ? 'active' : ''}`} title="Плиткою" aria-label="Плиткою">
                                    <LayoutGrid size={16} />
                                </button>
                                <button onClick={() => changeView('list')} className={`grid-toggle-btn ${view === 'list' ? 'active' : ''}`} title="Списком" aria-label="Списком">
                                    <List size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {items.length > 0 ? (
                        <div style={{ opacity: isPending ? 0.55 : 1, transition: 'opacity 0.15s ease' }}>
                            {view === 'list' ? (
                                <div className="catalogue-list">
                                    {items.map((product, i) => <ProductCard key={product.id} product={product} variant="row" priority={i < 4} />)}
                                </div>
                            ) : (
                                <div className="catalogue-grid">
                                    {items.map((product, i) => <ProductCard key={product.id} product={product} priority={i < 4} />)}
                                </div>
                            )}

                            {pages > 1 && (
                                <nav className="pagination-controls" aria-label="Сторінки">
                                    {page > 1
                                        ? <Link className="btn btn-outline" href={catalogHref(filters, { page: page - 1 })} scroll>Попередня</Link>
                                        : <span className="btn btn-outline" aria-disabled="true" style={{ opacity: 0.4 }}>Попередня</span>}
                                    <span className="pagination-pages">
                                        {pageWindow(page, pages).map((p, i) => p === '…'
                                            ? <span key={`gap-${i}`} className="pagination-gap">…</span>
                                            : <Link key={p} href={catalogHref(filters, { page: p })} className={`pagination-num ${p === page ? 'active' : ''}`} aria-current={p === page ? 'page' : undefined}>{p}</Link>
                                        )}
                                    </span>
                                    {page < pages
                                        ? <Link className="btn btn-outline" href={catalogHref(filters, { page: page + 1 })} scroll>Наступна</Link>
                                        : <span className="btn btn-outline" aria-disabled="true" style={{ opacity: 0.4 }}>Наступна</span>}
                                </nav>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon"><SearchX size={48} strokeWidth={1.5} color="var(--medium-gray)" /></div>
                            <p>Товарів не знайдено</p>
                            {filters.q && <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>Спробуйте коротший запит або лише номер запчастини.</p>}
                            <Link className="btn btn-outline" href="/catalogue">Скинути фільтри</Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
