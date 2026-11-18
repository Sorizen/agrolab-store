'use client';

import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

export default function ProductPhotos({ images, onChange, locked }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    async function upload(e) {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        setUploading(true);
        setError('');
        try {
            const body = new FormData();
            files.forEach((file) => body.append('files', file));
            const res = await fetch('/api/upload', { method: 'POST', body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Не вдалося завантажити');
            onChange([...images, ...data.urls].slice(0, 15));
        } catch (err) {
            setError(err.message);
        }
        setUploading(false);
    }

    const remove = (index) => onChange(images.filter((_, i) => i !== index));
    const makeFirst = (index) => onChange([images[index], ...images.filter((_, i) => i !== index)]);

    return (
        <div className="pp">
            <div className="pp-head">
                <strong>Фото</strong>
                <span>{locked ? 'Свої фото: синхронізація їх не змінює' : 'Зараз фото від постачальника. Після зміни вони стануть своїми.'}</span>
            </div>
            <div className="pp-grid">
                {images.map((src, index) => (
                    <div className="pp-item" key={`${src}-${index}`}>
                        <img src={src} alt="" />
                        <button type="button" className="pp-remove" onClick={() => remove(index)} aria-label="Прибрати фото"><X size={14} /></button>
                        {index === 0 ? (
                            <span className="pp-main">Головне</span>
                        ) : (
                            <button type="button" className="pp-first" onClick={() => makeFirst(index)}>Зробити головним</button>
                        )}
                    </div>
                ))}
                <label className="pp-add">
                    {uploading ? <Loader2 size={20} className="spin" /> : <Upload size={20} />}
                    <span>{uploading ? 'Завантажую…' : 'Додати фото'}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={upload} disabled={uploading} />
                </label>
            </div>
            {error && <p className="pp-error">{error}</p>}
        </div>
    );
}
