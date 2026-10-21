'use client';

import { useState } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, User, Phone, Search, Sprout } from 'lucide-react';
import { site } from '@/lib/site';

const DEFAULT_ANNOUNCEMENT = 'Швидка доставка Новою Поштою по всій Україні';

export default function Navbar({ announcement }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { cartCount, isMounted, openCart } = useCart();

  const announceText = announcement === undefined ? DEFAULT_ANNOUNCEMENT : announcement;

  const links = [
    { href: '/catalogue', label: 'Каталог' },
    { href: '/about', label: 'Про нас' },
    { href: '/contacts', label: 'Контакти' },
  ];

  return (
    <header className="header">
      {announceText ? (
        <div className="ls-announce">
          <div className="ls-announce-inner">
            <span className="star"><Sprout size={13} /></span>
            {announceText}
          </div>
        </div>
      ) : null}

      <div className="container">
        <nav className="nav">
          <Link href="/" className="logo" aria-label={`${site.name} — головна`}>
            <img src="/images/agrolab-logo.png" alt={site.name} className="logo-image" width="57" height="56" />
          </Link>

          <Form action="/catalogue" className="nav-search hide-on-mobile" role="search">
            <Search size={16} className="nav-search-icon" />
            <input name="q" type="search" placeholder="Пошук за назвою або кодом" aria-label="Пошук товарів" autoComplete="off" />
          </Form>

          <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <li className="nav-links-search">
              <Form action="/catalogue" role="search" onSubmit={() => setMenuOpen(false)}>
                <input name="q" type="search" placeholder="Пошук запчастин…" aria-label="Пошук товарів" />
              </Form>
            </li>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={pathname === link.href ? 'active' : ''}
                  onClick={() => {
                    setMenuOpen(false);
                    window.scrollTo(0, 0);
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            <a href={`tel:${site.phone}`} className="nav-phone-chip hide-on-mobile">
              <Phone size={15} />
              {site.phoneDisplay}
            </a>
            <button className="cart-icon" onClick={openCart} title="Кошик" aria-label="Кошик">
              <ShoppingCart size={22} />
              {isMounted && cartCount > 0 && (
                <span className="cart-badge" key={cartCount}>{cartCount}</span>
              )}
            </button>
            <Link href="/profile" className="cart-icon" title="Кабінет" aria-label="Особистий кабінет">
              <User size={22} />
            </Link>
          </div>

          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </nav>
      </div>
    </header>
  );
}
