'use client';

import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { X, ShoppingBag, Trash2 } from 'lucide-react';
import { useMinOrder } from '@/lib/use-min-order';
import QuantityStepper from '@/components/QuantityStepper';
import Photo from '@/components/Photo';

export default function CartDrawer() {
    const { cart, isCartOpen, closeCart, updateQuantity, removeFromCart, cartTotal } = useCart();
    const minOrder = useMinOrder();

    if (!isCartOpen) return null;

    return (
        <>

            <div
                className="drawer-overlay"
                onClick={closeCart}
                aria-label="Закрити кошик"
            />

            <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <h3>Ваш кошик</h3>
                    <button className="drawer-close" onClick={closeCart} aria-label="Закрити кошик">
                        <X size={24} />
                    </button>
                </div>

                <div className="drawer-body">
                    {cart.length === 0 ? (
                        <div className="drawer-empty">
                            <ShoppingBag size={48} color="var(--medium-gray)" />
                            <p>Кошик ще порожній.</p>
                            <Link href="/catalogue" className="btn-checkout" onClick={() => { closeCart(); window.scrollTo(0, 0); }} style={{ marginTop: '1rem', width: 'fit-content' }}>
                                До каталогу
                            </Link>
                        </div>
                    ) : (
                        <div className="drawer-items">
                            {cart.map((item) => (
                                <div key={item.cartKey} className="drawer-item">
                                    <div className="drawer-item-img">
                                        <Photo src={item.images?.[0] || '/images/placeholder.jpg'} alt={item.title} sizes="72px" width={144} height={144} />
                                    </div>
                                    <div className="drawer-item-details">
                                        <h4>{item.title}</h4>
                                        {(item.size || item.color) && (
                                            <div className="ls-cart-variant">
                                                {item.size && <span>Розмір: <b>{item.size}</b></span>}
                                                {item.color && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        Колір:
                                                        {item.colorValue && <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.colorValue, display: 'inline-block', boxShadow: '0 0 0 1px var(--light-gray)' }} />}
                                                        <b>{item.color}</b>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <p className="drawer-item-price">₴ {item.price}</p>

                                        <div className="drawer-item-controls">
                                            <QuantityStepper
                                                value={item.quantity}
                                                size="lg"
                                                decreaseDisabled={item.quantity <= 1}
                                                increaseDisabled={item.quantity >= 999}
                                                onDecrease={() => updateQuantity(item.cartKey, item.quantity - 1)}
                                                onIncrease={() => updateQuantity(item.cartKey, item.quantity + 1)}
                                            />
                                            <button className="btn-remove" onClick={() => removeFromCart(item.cartKey)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="drawer-footer">
                        <div className="drawer-total">
                            <span>Загалом:</span>
                            <strong>₴ {cartTotal}</strong>
                        </div>

                        {cartTotal < minOrder && (
                            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#dc3545', fontSize: '0.9rem', padding: '0.5rem', background: '#ffe6e6', borderRadius: '4px' }}>
                                Мінімальна сума замовлення — {minOrder} ₴.<br/>
                                Додайте товарів ще на <strong>{Math.ceil(minOrder - cartTotal)} ₴</strong>
                            </div>
                        )}

                        {cartTotal >= minOrder ? (
                            <Link href="/cart" className="btn-checkout" style={{ width: '100%', textAlign: 'center', padding: '1rem' }} onClick={() => { closeCart(); window.scrollTo(0, 0); }}>
                                Оформити замовлення
                            </Link>
                        ) : (
                            <button className="btn-checkout" disabled style={{ width: '100%', textAlign: 'center', padding: '1rem', opacity: 0.5, cursor: 'not-allowed' }}>
                                Оформити замовлення
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
