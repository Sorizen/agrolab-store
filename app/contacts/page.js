import { Phone, Mail, MessageCircle } from 'lucide-react';
import { site } from '@/lib/site';

export const metadata = {
    title: `Контакти | ${site.name}`,
    description: `Зв'яжіться з ${site.name}: телефон, email, Telegram та форма зворотного зв'язку. Допоможемо підібрати запчастину за номером, фото чи моделлю техніки.`,
  alternates: { canonical: '/contacts' },
};

import ContactForm from '@/components/ContactForm';

export default function ContactsPage() {
    return (
        <section className="section" style={{ paddingTop: '2rem' }}>
            <div className="container">
                <div className="contacts-grid">

                        <div className="contacts-info">
                            <div className="contact-card">
                                <div className="contact-card-icon"><Phone size={22} /></div>
                                <div>
                                    <h4>Телефон</h4>
                                    <p><a href={`tel:${site.phone}`}>{site.phoneDisplay}</a></p>
                                    <p style={{ color: 'var(--dark-gray)', fontSize: '0.85rem' }}>{site.hours.join(' · ')}</p>
                                </div>
                            </div>

                            <div className="contact-card">
                                <div className="contact-card-icon"><Mail size={22} /></div>
                                <div>
                                    <h4>Email</h4>
                                    <p><a href={`mailto:${site.email}`}>{site.email}</a></p>
                                    <p style={{ color: 'var(--dark-gray)', fontSize: '0.85rem' }}>Відповідаємо протягом 24 годин</p>
                                </div>
                            </div>

                            <div className="contact-card">
                                <div className="contact-card-icon"><MessageCircle size={22} /></div>
                                <div>
                                    <h4>Telegram</h4>
                                    <p><a href={site.telegramUrl} target="_blank" rel="noopener noreferrer">{site.telegramHandle}</a></p>
                                    <p style={{ color: 'var(--dark-gray)', fontSize: '0.85rem' }}>Швидкі відповіді у месенджері</p>
                                </div>
                            </div>
                        </div>

                        <div className="contact-form-wrapper" style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-hover)' }}>
                            <h3 style={{ marginBottom: '0.5rem' }}>Напишіть нам</h3>
                            <p style={{ color: 'var(--dark-gray)', marginBottom: '1.5rem' }}>
                                Заповніть форму, і ми зв&apos;яжемося з вами найближчим часом.
                            </p>
                            <ContactForm />
                        </div>
                </div>
            </div>
        </section>
    );
}
