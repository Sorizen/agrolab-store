import Link from 'next/link';
import Form from 'next/form';
import { Search } from 'lucide-react';

export default function NotFound() {
    return (
        <section className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
            <div className="container" style={{ maxWidth: '560px', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '0.75rem' }}>Сторінку не знайдено</h1>
                <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                    Можливо, товар більше не продається. Спробуйте знайти його за назвою або номером запчастини.
                </p>
                <Form action="/catalogue" className="hero-search" role="search" style={{ margin: '0 auto 1.5rem', border: '1px solid var(--line)' }}>
                    <Search size={20} className="hero-search-icon" />
                    <input name="q" type="search" placeholder="Назва або номер запчастини" aria-label="Пошук запчастин" />
                    <button type="submit" className="btn-star">Знайти</button>
                </Form>
                <Link href="/catalogue" className="btn btn-outline">До каталогу</Link>
            </div>
        </section>
    );
}
