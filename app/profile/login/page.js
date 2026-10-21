'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfileLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
            router.push('/profile');
            router.refresh();
        } else {
            const data = await res.json();
            setError(data.error === 'Invalid login credentials' ? 'Невірний логін або пароль' : data.error);
        }
        setLoading(false);
    }

    return (
        <section className="section" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
            <div className="container" style={{ maxWidth: '520px' }}>
                <div className="contact-form-wrapper" style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>Вхід до кабінету</h2>
                    <p style={{ color: 'var(--dark-gray)', marginBottom: 'var(--spacing-lg)' }}>
                        Увійдіть, щоб переглянути свої замовлення
                    </p>
                    <form onSubmit={handleLogin} className="contact-form">
                        <div className="form-group">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Ваш Email"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Пароль"
                                required
                            />
                        </div>
                        {error && (
                            <div className="admin-message error" style={{ fontSize: '0.9rem', padding: '0.6rem' }}>
                                {error}
                            </div>
                        )}
                        <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                            {loading ? 'Вхід...' : 'Увійти'}
                        </button>
                    </form>
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                        <Link href="/profile/forgot" style={{ color: 'var(--dark-gray)' }}>Забули пароль?</Link>
                    </p>
                    
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--extra-light-gray)' }}>
                        <p style={{ color: 'var(--dark-gray)', fontSize: '0.95rem' }}>
                            Немає акаунта? <Link href="/profile/register" style={{ color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none' }}>Зареєструватися</Link>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
