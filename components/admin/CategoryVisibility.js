'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

function matches(node, needle) {
    return node.name.toLowerCase().includes(needle) || node.children.some((child) => matches(child, needle));
}

function Row({ node, depth, needle, expanded, toggleOpen, onToggle, onTogglePhotos, busyId }) {
    const forced = Boolean(needle);
    const open = forced || expanded.has(node.id);
    const children = needle ? node.children.filter((child) => matches(child, needle)) : node.children;
    const state = node.hidden ? 'hidden' : node.inherited ? 'inherited' : 'shown';

    return (
        <>
            <div className={`vis-row vis-${state}`} style={{ paddingLeft: `${0.5 + depth * 1.4}rem` }}>
                {node.children.length > 0 ? (
                    <button type="button" className="vis-chevron" onClick={() => toggleOpen(node.id)} aria-label={open ? 'Згорнути' : 'Розгорнути'} aria-expanded={open}>
                        <ChevronRight size={16} style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
                    </button>
                ) : (
                    <span className="vis-chevron" />
                )}
                <span className="vis-name">{node.name}</span>
                <span className="vis-count">{node.visible} із {node.total} на сайті</span>
                <span className="vis-photos">
                    {node.ownPhotosInherited ? (
                        <span className="vis-note">фото: свої (з групи вище)</span>
                    ) : (
                        <button
                            type="button"
                            className={`vis-photos-btn${node.ownPhotos ? ' on' : ''}`}
                            disabled={busyId === node.id}
                            onClick={() => onTogglePhotos(node)}
                            title="Лише свої фото: синхронізація не бере фото постачальника"
                        >
                            {node.ownPhotos ? 'Фото: свої' : 'Фото: постачальника'}
                        </button>
                    )}
                </span>
                <span className="vis-action">
                    {node.inherited ? (
                        <span className="vis-note">прихована разом із групою вище</span>
                    ) : (
                        <button
                            type="button"
                            className={`btn-small ${node.hidden ? 'btn-edit' : 'btn-delete'}`}
                            disabled={busyId === node.id}
                            onClick={() => onToggle(node)}
                        >
                            {node.hidden ? 'Показати' : 'Приховати'}
                        </button>
                    )}
                </span>
            </div>
            {open && children.map((child) => (
                <Row key={child.id} node={child} depth={depth + 1} needle={needle} expanded={expanded} toggleOpen={toggleOpen} onToggle={onToggle} onTogglePhotos={onTogglePhotos} busyId={busyId} />
            ))}
        </>
    );
}

export default function CategoryVisibility({ categories, onToggle, onTogglePhotos, busyId }) {
    const [expanded, setExpanded] = useState(() => new Set());
    const [filter, setFilter] = useState('');
    const needle = filter.trim().toLowerCase();
    const roots = needle ? categories.filter((node) => matches(node, needle)) : categories;

    const toggleOpen = (id) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    return (
        <div>
            <div className="admin-toolbar">
                <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Знайти групу за назвою" aria-label="Пошук групи" />
            </div>
            <div className="vis-tree">
                {roots.map((node) => (
                    <Row key={node.id} node={node} depth={0} needle={needle} expanded={expanded} toggleOpen={toggleOpen} onToggle={onToggle} onTogglePhotos={onTogglePhotos} busyId={busyId} />
                ))}
                {roots.length === 0 && <p className="vis-empty">Нічого не знайдено</p>}
            </div>
        </div>
    );
}
