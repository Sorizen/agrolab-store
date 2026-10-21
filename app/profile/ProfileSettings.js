'use client';

import { useState } from 'react';
import { Save, Edit2, X, Loader2, CheckCircle, Phone, User, MapPin } from 'lucide-react';
import NovaPoshtaDropdown from '@/components/cart/NovaPoshtaDropdown';

export default function ProfileSettings({ initialMetadata }) {
    const [isEditing, setIsEditing] = useState(false);
    const formatPhone = (val) => {
        if (!val) return '';
        let nums = val.replace(/\D/g, '');
        if (nums.startsWith('380') && nums.length > 3) nums = '0' + nums.substring(3);
        else if (nums.startsWith('38') && nums.length > 2) nums = '0' + nums.substring(2);

        nums = nums.substring(0, 10);
        if (nums.length === 0) return '';

        let res = nums.substring(0, 3);
        if (nums.length >= 4) res += ` ${nums.substring(3, 6)}`;
        if (nums.length >= 7) res += ` ${nums.substring(6, 8)}`;
        if (nums.length >= 9) res += ` ${nums.substring(8, 10)}`;
        return res;
    };

    const [formData, setFormData] = useState({
        fullName: [initialMetadata?.last_name, initialMetadata?.first_name, initialMetadata?.patronymic].filter(Boolean).join(' '),
        phone: formatPhone(initialMetadata?.phone),
        city: initialMetadata?.city || '',
        branch: initialMetadata?.branch || '',
    });
    const [formError, setFormError] = useState('');
    const [status, setStatus] = useState('idle');

    async function handleSave(e) {
        e.preventDefault();
        if (Boolean(formData.city) !== Boolean(formData.branch)) {
            setFormError('Оберіть і місто, і відділення зі списку, або очистіть обидва поля');
            return;
        }
        setFormError('');
        setStatus('loading');

        try {

            const nameParts = formData.fullName.trim().split(/\s+/);
            const lastName = nameParts[0] || '';
            const firstName = nameParts[1] || '';
            const patronymic = nameParts.slice(2).join(' ') || '';

            const payload = {
                ...formData,
                firstName,
                lastName,
                patronymic
            };

            const res = await fetch('/api/user/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setStatus('success');
                setTimeout(() => {
                    setStatus('idle');
                    setIsEditing(false);
                }, 1500);
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    }

    return (
        <div className="cabinet-card">
            <div className="cabinet-header">
                <h3>Особисті дані</h3>
                {!isEditing ? (
                    <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <Edit2 size={16} /> Редагувати
                    </button>
                ) : (
                    <button className="btn-ghost btn-sm" onClick={() => setIsEditing(false)}>
                        <X size={16} /> Скасувати
                    </button>
                )}
            </div>

            {!isEditing ? (
                <div className="profile-grid">
                    <div className="profile-info-block">
                        <span className="info-label"><User size={16} /> ПІБ</span>
                        <span className="info-value">{formData.fullName || 'Не вказано'}</span>
                    </div>
                    <div className="profile-info-block">
                        <span className="info-label"><Phone size={16} /> Телефон</span>
                        <span className="info-value">{formData.phone || 'Не вказано'}</span>
                    </div>
                    <div className="profile-info-block">
                        <span className="info-label"><MapPin size={16} /> Нова Пошта (за замовчуванням)</span>
                        <span className="info-value">{formData.city && formData.branch ? `${formData.city}, ${formData.branch}` : 'Не вказано'}</span>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} className="admin-form fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>ПІБ (прізвище, ім'я, по батькові) *</label>
                            <input required className="form-input" type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Шевченко Тарас Григорович" />
                        </div>
                        <div className="form-group">
                            <label>Телефон</label>
                            <div style={{ display: 'flex' }}>
                                <select
                                    disabled
                                    className="form-input"
                                    style={{ width: '100px', borderRight: 'none', borderRadius: '4px 0 0 4px', background: 'var(--off-white)', appearance: 'none', textAlign: 'center', fontWeight: 'bold', color: 'var(--charcoal)' }}
                                >
                                    <option>🇺🇦 +38</option>
                                </select>
                                <input
                                    className="form-input"
                                    style={{ borderRadius: '0 4px 4px 0', flex: 1 }}
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                    placeholder="098 000 00 00"
                                />
                            </div>
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Доставка Новою Поштою (підставляється при оформленні замовлення, її можна змінити)</label>
                            <NovaPoshtaDropdown
                                disabled={false}
                                selectedCity={formData.city}
                                selectedBranch={formData.branch}
                                onSelectCity={(city) => setFormData(prev => ({ ...prev, city }))}
                                onSelectBranch={(branch) => setFormData(prev => ({ ...prev, branch }))}
                            />
                            {formError && <p style={{ color: '#dc3545', fontWeight: 'bold', margin: '0.5rem 0 0' }}>{formError}</p>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={status === 'loading'} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.8rem 2rem' }}>
                            {status === 'loading' ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Зберегти дані
                        </button>
                        {status === 'success' && <span style={{ color: '#28a745', display: 'flex', gap: '0.4rem', alignItems: 'center', fontWeight: 'bold' }}><CheckCircle size={18} /> Збережено успішно</span>}
                        {status === 'error' && <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Помилка збереження</span>}
                    </div>
                </form>
            )}

            <style jsx>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .fade-in { animation: fadeIn 0.3s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
