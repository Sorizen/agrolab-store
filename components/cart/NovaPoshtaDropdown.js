'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, MapPin, Package } from 'lucide-react';

function useLookup(params, enabled) {
    const [state, setState] = useState({ items: [], loading: false, error: '' });
    const key = enabled ? new URLSearchParams(params).toString() : '';
    useEffect(() => {
        if (!key) { setState({ items: [], loading: false, error: '' }); return; }
        const ctrl = new AbortController();
        setState((s) => ({ ...s, loading: true, error: '' }));
        const timer = setTimeout(() => {
            fetch(`/api/novaposhta?${key}`, { signal: ctrl.signal })
                .then((r) => r.json())
                .then((d) => setState({ items: d.items || [], loading: false, error: d.error || '' }))
                .catch((e) => { if (e.name !== 'AbortError') setState({ items: [], loading: false, error: 'Нова Пошта не відповідає. Спробуйте ще раз.' }); });
        }, 250);
        return () => { clearTimeout(timer); ctrl.abort(); };
    }, [key]);
    return state;
}

function Combo({ label, value, onType, placeholder, disabled, open, setOpen, lookup, onPick, renderItem, empty, inputRef }) {
    const [active, setActive] = useState(0);
    useEffect(() => setActive(0), [lookup.items]);
    const pick = (item) => { onPick(item); setOpen(false); };
    const onKeyDown = (e) => {
        if (!open || !lookup.items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, lookup.items.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); pick(lookup.items[active]); }
        else if (e.key === 'Escape') setOpen(false);
    };
    return (
        <div className="np-field">
            <label className="np-label">{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    ref={inputRef}
                    className="form-input"
                    value={value}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    onChange={(e) => { onType(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={onKeyDown}
                    role="combobox"
                    aria-expanded={open}
                />
                {lookup.loading && <Loader2 className="spin np-spinner" size={16} />}
                {open && !disabled && (lookup.items.length > 0 || lookup.error || (empty && !lookup.loading)) && (
                    <ul className="np-list" role="listbox">
                        {lookup.error && <li className="np-note">{lookup.error}</li>}
                        {!lookup.error && lookup.items.length === 0 && <li className="np-note">{empty}</li>}
                        {lookup.items.map((item, i) => (
                            <li
                                key={item.ref || item.name}
                                role="option"
                                aria-selected={i === active}
                                className={`np-option${i === active ? ' active' : ''}`}
                                onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                                onMouseEnter={() => setActive(i)}
                            >
                                {renderItem(item)}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

const bareCity = (s) => String(s || '').split(',')[0].replace(/^(м|с|смт|сел)\.\s*/i, '').trim();

export default function NovaPoshtaDropdown({ selectedCity, selectedBranch, onSelectCity, onSelectBranch, disabled }) {
    const [cityText, setCityText] = useState(selectedCity || '');
    const [cityRef, setCityRef] = useState(null);
    const [branchText, setBranchText] = useState(selectedBranch || '');
    const [cityOpen, setCityOpen] = useState(false);
    const [branchOpen, setBranchOpen] = useState(false);
    const branchInput = useRef(null);

    useEffect(() => { if (selectedCity && selectedCity !== cityText) { setCityText(selectedCity); setCityRef(null); } }, [selectedCity]);
    useEffect(() => { if (selectedBranch && selectedBranch !== branchText) setBranchText(selectedBranch); }, [selectedBranch]);

    const cityLookup = useLookup({ city: cityText }, cityOpen && cityText.trim().length >= 2);

    const savedCity = useLookup({ city: bareCity(selectedCity) }, Boolean(selectedCity && !cityRef && bareCity(selectedCity).length >= 2));
    const ref = cityRef || savedCity.items[0]?.ref || null;
    const branchQuery = branchText === selectedBranch ? '' : branchText;
    const branchLookup = useLookup({ cityRef: ref || '', q: branchQuery }, branchOpen && Boolean(ref));

    return (
        <div className="np-picker">
            <Combo
                label="Місто *"
                value={cityText}
                placeholder="Почніть вводити назву міста"
                disabled={disabled}
                open={cityOpen}
                setOpen={setCityOpen}
                lookup={cityLookup}
                empty={cityText.trim().length >= 2 ? 'Не знайдено. Перевірте назву.' : ''}
                onType={(v) => { setCityText(v); setCityRef(null); if (selectedCity) onSelectCity(''); if (selectedBranch) onSelectBranch(''); setBranchText(''); }}
                onPick={(item) => {
                    setCityText(item.name); setCityRef(item.ref); onSelectCity(item.name);
                    setBranchText(''); onSelectBranch('');
                    setTimeout(() => branchInput.current?.focus(), 0);
                }}
                renderItem={(item) => <><MapPin size={14} /> {item.name}</>}
            />
            <Combo
                label="Відділення або поштомат *"
                value={branchText}
                placeholder={ref ? 'Номер або вулиця, наприклад: 12' : 'Спочатку оберіть місто'}
                disabled={disabled || !ref}
                open={branchOpen}
                setOpen={setBranchOpen}
                lookup={branchLookup}
                inputRef={branchInput}
                empty="Нічого не знайдено"
                onType={(v) => { setBranchText(v); if (selectedBranch) onSelectBranch(''); }}
                onPick={(item) => { setBranchText(item.name); onSelectBranch(item.name); }}
                renderItem={(item) => (
                    <>
                        {item.type === 'postomat' ? <Package size={14} /> : <MapPin size={14} />}
                        <span>{item.name}</span>
                    </>
                )}
            />
        </div>
    );
}
