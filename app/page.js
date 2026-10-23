import Link from 'next/link';
import Form from 'next/form';
import { getCategoryTree, getHomeData } from '@/lib/data';
import { heroStyle, publicImage } from '@/lib/heroImage';
import { site } from '@/lib/site';
import { categoryUrl } from '@/lib/slug';
import ProductCard from '@/components/ProductCard';
import Photo from '@/components/Photo';
import { Truck, ShieldCheck, HeartHandshake, Wrench, ArrowRight, Package, Sprout, Search, Phone } from 'lucide-react';

export const revalidate = 300;

export const metadata = {
  title: `${site.name} — запчастини для тракторів і сільгосптехніки`,
  description: `${site.name}: оригінальні запчастини та перевірені аналоги для МТЗ, ЮМЗ та іншої сільгосптехніки. Пошук за номером деталі, доставка Новою Поштою, оплата при отриманні.`,
  alternates: { canonical: '/' },
};

const formatCount = (n) => n.toLocaleString('uk-UA');

export default async function HomePage() {
  let data = { popular: [], topCategories: [], totalProducts: 0 };
  try {
    data = await getHomeData(await getCategoryTree());
  } catch (e) {
    console.error('Home page query failed:', e.message);
  }
  const { popular, topCategories, totalProducts } = data;

  const heroSectionStyle = heroStyle('hero');
  const storyImg = publicImage('story');
  const heroImg = publicImage('hero');

  return (
    <>

      {heroImg && <link rel="preload" as="image" href={heroImg.path} fetchPriority="high" />}
      <section className="hero-ls" style={heroSectionStyle}>
        <div className="container">
          <div className="hero-ls-inner">
            <span className="hero-ls-eyebrow"><Sprout size={14} /> Запчастини та товари для господарства</span>
            <h1 className="hero-ls-title">{site.tagline}</h1>
            <p className="hero-ls-sub">
              {totalProducts > 0 ? `${formatCount(totalProducts)} товарів` : 'Тисячі товарів'} для тракторів і
              сільгосптехніки. Шукайте за назвою або номером деталі.
            </p>
            <Form action="/catalogue" className="hero-search" role="search">
              <Search size={20} className="hero-search-icon" />
              <input
                name="q"
                type="search"
                placeholder="Наприклад: фільтр або 6206"
                aria-label="Пошук запчастин"
                autoComplete="off"
              />
              <button type="submit" className="btn-star">Знайти</button>
            </Form>
            <div className="hero-ls-trust">
              <span><Truck size={16} /> Швидка доставка</span>
              <span><ShieldCheck size={16} /> Оригінал і перевірені аналоги</span>
              <span><Wrench size={16} /> Підбір за номером деталі</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lsx" style={{ paddingTop: '2.5rem', paddingBottom: '0.5rem' }}>
        <div className="container">
          <div className="lsx-benefits">
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0s' }}>
              <div className="lsx-benefit-ic"><Truck size={20} /></div>
              <div><h4>Швидка доставка</h4><p>Відправляємо Новою Поштою по всій Україні</p></div>
            </div>
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0.08s' }}>
              <div className="lsx-benefit-ic"><HeartHandshake size={20} /></div>
              <div><h4>Оплата при отриманні</h4><p>Перевірте деталь у відділенні, потім платіть</p></div>
            </div>
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0.16s' }}>
              <div className="lsx-benefit-ic"><ShieldCheck size={20} /></div>
              <div><h4>Перевірені виробники</h4><p>Оригінальні запчастини заводів та надійні аналоги</p></div>
            </div>
            <div className="lsx-benefit" data-reveal style={{ '--reveal-delay': '0.24s' }}>
              <div className="lsx-benefit-ic"><Wrench size={20} /></div>
              <div><h4>Допоможемо підібрати</h4><p>Підкажемо деталь за номером, фото чи моделлю техніки</p></div>
            </div>
          </div>
        </div>
      </section>

      {topCategories.length > 0 && (
        <section className="lsx">
          <div className="container">
            <div className="lsx-head center" data-reveal>
              <span className="lsx-eyebrow"><Package size={14} /> Каталог</span>
              <h2 className="lsx-title">Категорії</h2>
              <p className="lsx-sub">Запчастини та все необхідне для техніки й господарства.</p>
            </div>
            <div className="lsx-cats">
              {topCategories.map((cat, i) => (
                <Link
                  key={cat.id}
                  href={categoryUrl(cat)}
                  className="lsx-cat"
                  data-reveal
                  style={{ '--reveal-delay': `${i * 0.06}s` }}
                >
                  {cat.image ? (
                    <div className="lsx-cat-img"><Photo src={cat.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 280px" priority={i < 4} style={{ objectFit: 'cover' }} /></div>
                  ) : (
                    <div className="lsx-cat-fallback"><Package size={40} strokeWidth={1.3} /></div>
                  )}
                  <div className="lsx-cat-body">
                    <h3>{cat.name}</h3>
                    <span>{formatCount(cat.count)} товарів <ArrowRight size={14} /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="lsx lsx-soft">
          <div className="container">
            <div className="lsx-head-row" data-reveal>
              <div>
                <span className="lsx-eyebrow"><ShieldCheck size={14} /> Рекомендуємо</span>
                <h2 className="lsx-title">Популярні товари</h2>
              </div>
              <Link href="/catalogue" className="lsx-link">Весь каталог <ArrowRight size={18} /></Link>
            </div>
            <div className="product-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {popular.map((p, i) => (
                <div key={p.id} data-reveal style={{ '--reveal-delay': `${i * 0.05}s` }}><ProductCard product={p} /></div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="lsx">
        <div className="container">
          <div className="lsx-story">
            <div className="lsx-story-media" data-reveal style={storyImg ? { backgroundImage: storyImg.url } : undefined} />
            <div className="lsx-story-body" data-reveal style={{ '--reveal-delay': '0.1s' }}>
              <span className="lsx-eyebrow" style={{ color: 'var(--gold)' }}>Про {site.name}</span>
              <h2>Ваш надійний партнер у полі</h2>
              <p>
                Ми знаємо, що техніка не може чекати. Тому зібрали в одному місці запчастини для
                тракторів, комбайнів і навісного обладнання: від двигуна до гідравліки. Швидко
                знаходимо потрібну деталь і оперативно відправляємо.
              </p>
              <Link href="/about" className="btn-star btn-gold">Дізнатися більше <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="lsx" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="lsx-cta" data-reveal>
            <h2>Не знайшли потрібну деталь?</h2>
            <p>Зателефонуйте або напишіть: підберемо запчастину за номером, фото чи моделлю техніки.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`tel:${site.phone}`} className="btn-star btn-gold"><Phone size={18} /> {site.phoneDisplay}</a>
              <Link href="/catalogue" className="btn-ghost-star btn-ghost-light">До каталогу <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
