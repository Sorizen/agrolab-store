'use client';

import { useState } from 'react';
import Link from 'next/link';

const linkStyle = { color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none' };

export default function ForgotPasswordPage() {
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function post(url, body) {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'Щось пішло не так. Спробуйте ще раз.');
                return false;
            }
            return true;
        } finally {
            setLoading(false);
        }
    }

    async function requestCode(e) {
        e.preventDefault();
        if (await post('/api/auth/forgot', { email })) setStep('code');
    }

    async function resetPassword(e) {
        e.preventDefault();
        if (await post('/api/auth/reset', { email, code, password })) setStep('done');
    }

    return (
        <section className="section" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
            <div className="container" style={{ maxWidth: '520px' }}>
                <div className="contact-form-wrapper" style={{ textAlign: 'center' }}>
                    {step === 'email' && (
                        <>
                            <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>Відновлення пароля</h2>
                            <p style={{ color: 'var(--dark-gray)', marginBottom: 'var(--spacing-lg)' }}>
                                Вкажіть email акаунта, і ми надішлемо код для зміни пароля
                            </p>
                            <form onSubmit={requestCode} className="contact-form">
                                <div className="form-group">
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ваш Email" required autoFocus />
                                </div>
                                {error && <div className="admin-message error" style={{ fontSize: '0.9rem', padding: '0.6rem' }}>{error}</div>}
                                <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                                    {loading ? 'Надсилаємо...' : 'Надіслати код'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'code' && (
                        <>
                            <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>Введіть код</h2>
                            <p style={{ color: 'var(--dark-gray)', marginBottom: 'var(--spacing-lg)' }}>
                                Якщо акаунт з адресою {email} існує, ми надіслали на неї 6-значний код. Він діє 15 хвилин.
                            </p>
                            <form onSubmit={resetPassword} className="contact-form">
                                <div className="form-group">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        pattern="\d{6}"
                                        maxLength={6}
                                        value={code}
                                        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Код з листа"
                                        required
                                        autoFocus
                                        style={{ textAlign: 'center', letterSpacing: '0.35em', fontSize: '1.2rem' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Новий пароль (мінімум 8 символів)" minLength={8} required />
                                </div>
                                {error && <div className="admin-message error" style={{ fontSize: '0.9rem', padding: '0.6rem' }}>{error}</div>}
                                <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                                    {loading ? 'Зберігаємо...' : 'Змінити пароль'}
                                </button>
                            </form>
                            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                                <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} style={{ ...linkStyle, background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Надіслати код ще раз
                                </button>
                            </p>
                        </>
                    )}

                    {step === 'done' && (
                        <>
                            <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>Пароль змінено</h2>
                            <p style={{ color: 'var(--dark-gray)', marginBottom: 'var(--spacing-lg)' }}>Тепер можна увійти з новим паролем.</p>
                            <Link href="/profile/login" className="btn btn-blue" style={{ display: 'block', width: '100%' }}>Увійти</Link>
                        </>
                    )}

                    {step !== 'done' && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--extra-light-gray)' }}>
                            <p style={{ color: 'var(--dark-gray)', fontSize: '0.95rem' }}>
                                Згадали пароль? <Link href="/profile/login" style={linkStyle}>Увійти</Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
