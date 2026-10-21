import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';
import { Sprout, Tractor, Handshake, Search, ShoppingCart, Truck, ArrowRight, Phone } from 'lucide-react';
import { heroStyle } from '@/lib/heroImage';
import { site } from '@/lib/site';

export const metadata = {
  title: `Про нас | ${site.name}`,
  description: `${site.name} — ваш надійний партнер в агросфері. Запчастини для тракторів і сільгосптехніки з доставкою по всій Україні.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>

      <section className="hero-ls" style={heroStyle('about', { minHeight: '420px' })}>
        <div className="container">
          <div className="hero-ls-inner" style={{ margin: '0 auto', textAlign: 'center', maxWidth: '720px' }}>
            <span className="hero-ls-eyebrow" style={{ justifyContent: 'center' }}><Sprout size={14} /> Про компанію</span>
            <h1 className="hero-ls-title">{site.name}</h1>
            <p className="hero-ls-sub" style={{ margin: '0 auto 1.8rem' }}>
              {site.tagline} Все для вашої техніки та врожаю — в одному місці.
            </p>
            <div className="hero-ls-cta" style={{ justifyContent: 'center' }}>
              <Link href="/catalogue" className="btn-star">Переглянути каталог</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="lsx">
        <div className="container">
          <div className="lsx-head center" data-reveal>
            <h2 className="lsx-title">Чим ми корисні</h2>
            <p className="lsx-sub">Запчастини, техніка та обладнання для фермерів і господарств по всій Україні.</p>
          </div>
          <div className="about-stack">
            <ScrollReveal direction="left">
              <div className="about-card-icon"><Sprout size={36} /></div>
              <div className="about-card-content">
                <h4>Широкий асортимент</h4>
                <p>Тисячі запчастин для тракторів, комбайнів і навісного обладнання: двигун, трансмісія, гідравліка, ходова, електрика. Оригінальні деталі від заводів-виробників і перевірені аналоги.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div className="about-card-icon"><Tractor size={36} /></div>
              <div className="about-card-content">
                <h4>Техніка не повинна простоювати</h4>
                <p>Ми розуміємо, що в сезон кожен день на рахунку. Тому тримаємо актуальні ціни та наявність, оперативно підтверджуємо замовлення і швидко відправляємо Новою Поштою.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="center">
              <div className="about-card-icon"><Handshake size={36} /></div>
              <div className="about-card-content">
                <h4>Партнерство та підтримка</h4>
                <p>Допоможемо підібрати деталь за номером, фото або моделлю техніки. Для фермерських господарств пропонуємо гнучкі умови співпраці та індивідуальний підхід незалежно від обсягу замовлення.</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="lsx lsx-soft">
        <div className="container">
          <div className="lsx-head center" data-reveal>
            <h2 className="lsx-title">Як зробити замовлення</h2>
          </div>
          <div className="lsx-benefits">
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0s' }}>
              <div className="lsx-benefit-ic"><Search size={20} /></div>
              <div><h4>1. Знайдіть деталь</h4><p>За назвою або номером запчастини в пошуку</p></div>
            </div>
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0.08s' }}>
              <div className="lsx-benefit-ic"><ShoppingCart size={20} /></div>
              <div><h4>2. Оформіть замовлення</h4><p>Оберіть відділення Нової Пошти та спосіб оплати</p></div>
            </div>
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0.16s' }}>
              <div className="lsx-benefit-ic"><Phone size={20} /></div>
              <div><h4>3. Підтвердження</h4><p>Менеджер зателефонує й перевірить сумісність</p></div>
            </div>
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0.24s' }}>
              <div className="lsx-benefit-ic"><Truck size={20} /></div>
              <div><h4>4. Отримання</h4><p>Швидко відправляємо Новою Поштою у ваше відділення</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="lsx">
        <div className="container">
          <div className="lsx-cta" data-reveal>
            <h2>Маєте питання? Ми завжди на зв&apos;язку</h2>
            <p>Зателефонуйте або напишіть — допоможемо знайти потрібну запчастину.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`tel:${site.phone}`} className="btn-star btn-gold"><Phone size={18} /> {site.phoneDisplay}</a>
              <Link href="/contacts" className="btn-ghost-star btn-ghost-light">Контакти <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
