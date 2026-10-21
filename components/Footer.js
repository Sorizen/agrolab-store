'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { site } from '@/lib/site';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <h5 style={{ fontFamily: 'var(--font-heading)' }}>{site.name}</h5>
                        <p>{site.tagline} Запчастини для тракторів і сільгосптехніки з доставкою по всій Україні.</p>
                    </div>
                    <div className="footer-section">
                        <h5>Магазин</h5>
                        <Link href="/catalogue" onClick={() => window.scrollTo(0, 0)}>Каталог товарів</Link>
                        <Link href="/about" onClick={() => window.scrollTo(0, 0)}>Про нас</Link>
                        <Link href="/delivery" onClick={() => window.scrollTo(0, 0)}>Доставка і оплата</Link>
                        <Link href="/returns" onClick={() => window.scrollTo(0, 0)}>Повернення та гарантія</Link>
                        <Link href="/contacts" onClick={() => window.scrollTo(0, 0)}>Контакти</Link>
                        <Link href="/terms" onClick={() => window.scrollTo(0, 0)}>Угода користувача</Link>
                    </div>
                    <div className="footer-section">
                        <h5>Контакти</h5>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={14} /> {site.email}</p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={14} /> {site.phoneDisplay}</p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Send size={14} /> <a href={site.telegramUrl} target="_blank" rel="noopener noreferrer">{site.telegramHandle}</a></p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} /> Доставка по всій Україні</p>
                    </div>
                    <div className="footer-section">
                        <h5>Графік роботи</h5>
                        {site.hours.map((h) => <p key={h}>{h}</p>)}
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} {site.name}. Усі права захищені.</p>
                </div>
            </div>
        </footer>
    );
}
