'use client';

import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function ContactForm() {
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authData, setAuthData] = useState(null);
    const [useSavedData, setUseSavedData] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        phone: '',
        email: '',
        message: ''
    });

    const formatPhone = (val) => {
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

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setIsLoggedIn(true);
                        setUseSavedData(true);

                        let dbPhone = data.user.metadata?.phone || '';
                        let cleanPhone = dbPhone;
                        if (cleanPhone.startsWith('+38 ')) cleanPhone = cleanPhone.substring(4);

                        const savedInfo = {
                            firstName: data.user.metadata?.first_name || '',
                            lastName: data.user.metadata?.last_name || '',
                            phone: formatPhone(cleanPhone),
                            email: data.user.email || '',
                        };

                        setAuthData(savedInfo);
                        setFormData(prev => ({ ...prev, ...savedInfo }));
                    }
                }
            } catch (error) {

            }
        }
        fetchUser();
    }, []);

    const handleToggleSavedData = (e) => {
        const checked = e.target.checked;
        setUseSavedData(checked);
        if (checked && authData) {
            setFormData(prev => ({ ...prev, ...authData }));
        } else {
            setFormData(prev => ({
                ...prev,
                firstName: '', lastName: '', phone: '', email: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!formData.phone && !formData.email) {
            setErrorMsg('Будь ласка, вкажіть телефон або email, щоб ми могли вам відповісти.');
            return;
        }

        setStatus('loading');

        try {
            const payload = { ...formData };
            if (payload.phone) {
                payload.phone = `+38 ${payload.phone}`;
            }

            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setStatus('success');
                setFormData({ firstName: '', phone: '', email: '', message: '' });
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#d4edda', color: '#155724', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}><CheckCircle size={20} color="#155724" /> Повідомлення надіслано!</h4>
                <p>Дякуємо за звернення. Ми зв'яжемося з вами найближчим часом.</p>
                <button
                    onClick={() => setStatus('idle')}
                    className="btn btn-outline"
                    style={{ marginTop: '1rem', background: 'white' }}
                >
                    Написати ще
                </button>
            </div>
        );
    }

    return (
        <form className="contact-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {!isLoggedIn ? (
                <>
                    <div className="form-group">
                        <label htmlFor="firstName">Як до вас звертатися? *</label>
                        <input
                            required
                            type="text"
                            id="firstName"
                            className="form-input"
                            value={formData.firstName}
                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                            placeholder="Ім'я"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="phone">Номер телефону</label>
                            <div style={{ display: 'flex' }}>
                                <select
                                    disabled
                                    className="form-input"
                                    style={{ width: '84px', flexShrink: 0, paddingLeft: '0.5rem', paddingRight: '0.5rem', borderRight: 'none', borderRadius: '4px 0 0 4px', background: 'var(--off-white)', appearance: 'none', textAlign: 'center', fontWeight: 'bold', color: 'var(--charcoal)' }}
                                >
                                    <option>🇺🇦 +38</option>
                                </select>
                                <input
                                    type="tel"
                                    id="phone"
                                    className="form-input"
                                    style={{ borderRadius: '0 4px 4px 0', flex: 1, minWidth: 0 }}
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})}
                                    placeholder="098 000 00 00"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email адреса</label>
                            <input type="email" id="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="taras@example.com" />
                        </div>
                    </div>
                    <p style={{ margin: '-0.4rem 0 0', fontSize: '0.85rem', color: 'var(--medium-gray)' }}>Достатньо вказати телефон або email.</p>
                </>
            ) : (
                <div style={{ padding: '0.5rem 1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--extra-light-gray)', color: 'var(--dark-gray)', fontSize: '0.9rem' }}>
                    Звернення створюється від авторизованого профілю: <strong>{formData.email}</strong>
                </div>
            )}

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label htmlFor="message">Повідомлення *</label>
                <textarea
                    required
                    id="message"
                    className="form-input"
                    rows="5"
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    placeholder="Питайте, і ми допоможемо."
                />
            </div>

            {status === 'error' && <div style={{ color: '#dc3545', fontWeight: 'bold' }}>Помилка відправки. Спробуйте ще раз.</div>}
            {errorMsg && <div style={{ color: '#dc3545', fontWeight: 'bold' }}>{errorMsg}</div>}

            <button type="submit" className="btn-checkout" style={{ width: '100%', marginTop: '0.5rem', padding: '1rem', fontSize: '1.1rem' }} disabled={status === 'loading'}>
                {status === 'loading' ? 'Обробка...' : 'Надіслати повідомлення'}
            </button>
        </form>
    );
}
