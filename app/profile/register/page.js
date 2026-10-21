'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfileRegisterPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleRegister(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {

                router.push('/profile');
                router.refresh();
                return;
            } else {
                const data = await res.json();
                setError(data.error || 'Помилка реєстрації');
            }
        } catch (err) {
            setError('Помилка з\'єднання.');
        }
        setLoading(false);
    }

    return (
        <section className="section" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
            <div className="container" style={{ maxWidth: '520px' }}>
                <div className="contact-form-wrapper" style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>Реєстрація</h2>
                    <p style={{ color: 'var(--dark-gray)', marginBottom: 'var(--spacing-lg)' }}>
                        Створіть особистий кабінет, щоб бачити свої замовлення
                    </p>
                    <form onSubmit={handleRegister} className="contact-form">
                        <div className="form-row" style={{ display: 'flex', gap: '1rem', flexDirection: 'row' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="Ім'я"
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Прізвище"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Ваш Email"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Пароль (мінімум 8 символів)"
                                minLength={8}
                                required
                            />
                        </div>
                        {error && (
                            <div className="admin-message error" style={{ fontSize: '0.9rem', padding: '0.6rem' }}>
                                {error}
                            </div>
                        )}
                        <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                            {loading ? 'Реєстрація...' : 'Зареєструватися'}
                        </button>
                    </form>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--extra-light-gray)' }}>
                        <p style={{ color: 'var(--dark-gray)', fontSize: '0.95rem' }}>
                            Вже маєте акаунт? <Link href="/profile/login" style={{ color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none' }}>Увійти</Link>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
