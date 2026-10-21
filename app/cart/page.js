'use client';

import { useState, useEffect, useRef } from 'react';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { Trash2, CheckCircle, ArrowLeft, Phone, PhoneOff, Check, ArrowRight } from 'lucide-react';
import { trackBeginCheckout, trackPurchase, rememberPendingPurchase, trackPendingPurchase } from '@/lib/analytics';
import NovaPoshtaDropdown from '@/components/cart/NovaPoshtaDropdown';
import { useMinOrder } from '@/lib/use-min-order';
import QuantityStepper from '@/components/QuantityStepper';
import Photo from '@/components/Photo';
import { productPath } from '@/lib/slug';

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, cartTotal, isMounted, clearCart, updatePrices } = useCart();
    const minOrder = useMinOrder();
    const [errorMessage, setErrorMessage] = useState('');
    const [cardPayments, setCardPayments] = useState(false);

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(s => setCardPayments(s.card_payments === '1')).catch(() => {});
    }, []);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        deliveryMethod: 'nova_poshta',
        city: '',
        branch: '',
        comment: '',
        doNotCall: false,
        paymentMethod: 'cod'
    });
    const [status, setStatus] = useState('idle');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [authData, setAuthData] = useState(null);
    const [editingDelivery, setEditingDelivery] = useState(true);
    const [saveDelivery, setSaveDelivery] = useState(null);
    const checkoutTracked = useRef(false);

    useEffect(() => {
        if (isMounted && cart.length > 0 && !checkoutTracked.current) {
            checkoutTracked.current = true;
            trackBeginCheckout(cart);
        }
    }, [isMounted, cart]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const redirectStatus = params.get('status');
            if (redirectStatus === 'success') {
                setStatus('success');
                trackPendingPurchase();
                clearCart();
            } else if (redirectStatus === 'error' || redirectStatus === 'failure') {
                setStatus('payment_error');
            }
        }

    }, []);

    const cartDimensions = cart.reduce((acc, item) => {
        let w = 0;
        if (item.weight) {
            w = item.weight;
        } else if (item.specs && item.specs['Вага']) {
            const str = String(item.specs['Вага']).toLowerCase();
            let val = parseFloat(str.replace(',', '.').replace(/[^0-9.]/g, ''));
            if (str.includes('г') || str.includes('g') && !str.includes('кг') && !str.includes('kg')) val /= 1000;
            w = isNaN(val) ? 0 : val;
        }

        return {
            weight: acc.weight + (w * item.quantity),
            length: acc.length + ((item.length || 0) * item.quantity),
            width: acc.width + ((item.width || 0) * item.quantity),
            height: acc.height + ((item.height || 0) * item.quantity)
        };
    }, { weight: 0, length: 0, width: 0, height: 0 });

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setIsLoggedIn(true);

                        const dbPhone = data.user.metadata?.phone || '';
                        let cleanPhone = dbPhone;
                        if (cleanPhone.startsWith('+38 ')) cleanPhone = cleanPhone.substring(4);
                        else if (cleanPhone.startsWith('+380 ')) cleanPhone = '0' + cleanPhone.substring(5);
                        else if (cleanPhone.startsWith('+380')) cleanPhone = '0' + cleanPhone.substring(4);
                        cleanPhone = formatPhone(cleanPhone);

                        const firstName = data.user.metadata?.first_name || '';
                        const lastName = data.user.metadata?.last_name || '';
                        const fullName = [firstName, lastName].filter(Boolean).join(' ');

                        const savedInfo = {
                            email: data.user.email || '',
                            fullName: [lastName, firstName, data.user.metadata?.patronymic].filter(Boolean).join(' '),
                            phone: cleanPhone,
                            city: data.user.metadata?.city || '',
                            branch: data.user.metadata?.branch || '',
                            deliveryMethod: 'nova_poshta',
                            comment: ''
                        };

                        setAuthData(savedInfo);
                        setFormData(prev => ({ ...prev, ...savedInfo }));
                        setEditingDelivery(!(savedInfo.fullName && savedInfo.phone && savedInfo.city && savedInfo.branch));
                    }
                }
            } catch (error) {

            } finally {
                setAuthLoading(false);
            }
        }
        if (isMounted) fetchUser();
    }, [isMounted]);

    if (!isMounted) return null;

    if (cart.length === 0 && status !== 'success') {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h1>Ваш кошик порожній</h1>
                <p style={{ margin: '2rem 0' }}>Ви ще нічого не додали до кошика.</p>
                <Link href="/catalogue" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', fontWeight: 600 }}>
                    <ArrowLeft size={18} /> Повернутися до каталогу
                </Link>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <CheckCircle color="var(--primary-color)" size={32} /> Дякуємо за замовлення!
                </h1>
                <p style={{ margin: '1rem 0' }}>Ми отримали ваше замовлення і скоро зв'яжемося з вами, щоб підтвердити деталі.</p>

                {!authLoading && !isLoggedIn && (
                    <div style={{ background: 'var(--off-white)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '500px', margin: '2rem auto', border: '1px solid var(--extra-light-gray)' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--charcoal)' }}>Відстежуйте свої замовлення</h3>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--dark-gray)', fontSize: '0.95rem' }}>
                            Бажаєте бачити свої замовлення в одному місці та наступного разу оформлювати їх швидше? Створіть кабінет!
                        </p>
                        <Link href="/profile/register" className="btn btn-blue" style={{ width: '100%' }}>
                            Створити особистий кабінет
                        </Link>
                    </div>
                )}

                <div style={{ marginTop: '2rem' }}>
                    <Link href="/catalogue" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', fontWeight: 600 }}>
                        <ArrowLeft size={18} /> Повернутися до каталогу
                    </Link>
                </div>
            </div>
        );
    }

    const useSaved = () => {
        setFormData(prev => ({ ...prev, ...authData }));
        setEditingDelivery(false);
    };

    const formatPhone = (val) => {
        let nums = val.replace(/\D/g, '');
        if (nums.startsWith('380') && nums.length > 3) nums = '0' + nums.substring(3);
        else if (nums.startsWith('38') && nums.length > 2) nums = '0' + nums.substring(2);

        nums = nums.substring(0, 10);
        if (nums.length === 0) return '';

        let res = nums.substring(0, 3);
        if (nums.length >= 4) res += ` ${nums.substring(3, 6)}`;
        if (nums.length >= 7) res += ` ${nums.substring(6, 8)}`;
        if (nums.length >= 9) res += ` ${nums.substring(8, 10)}`;
        return res;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.deliveryMethod === 'nova_poshta') {
            if (!formData.city || !formData.branch) {
                setStatus('np_validation_error');
                return;
            }
        }

        setStatus('loading');

        try {

            const nameParts = formData.fullName.trim().split(/\s+/);
            const lastName = nameParts[0] || '';
            const firstName = nameParts[1] || '';
            const patronymic = nameParts.slice(2).join(' ') || '';

            const finalCustomer = {
                ...formData,
                firstName,
                lastName,
                patronymic,
                phone: `+38 ${formData.phone}`
            };
            const remember = editingDelivery && isLoggedIn && formData.city && formData.branch && (saveDelivery ?? !authData?.city);
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer: finalCustomer,
                    items: cart,
                    total: cartTotal,
                    paymentMethod: formData.paymentMethod
                })
            });

            if (res.ok) {
                const result = await res.json();
                if (result.redirectUrl) rememberPendingPurchase(result.orderId, cart);
                else trackPurchase(result.orderId, cart);
                if (remember) {
                    const profile = { city: formData.city, branch: formData.branch, deliveryMethod: 'nova_poshta' };
                    if (!authData?.fullName) Object.assign(profile, { firstName, lastName, patronymic });
                    if (!authData?.phone) profile.phone = finalCustomer.phone;
                    fetch('/api/user/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }).catch(() => {});
                }
                clearCart();
                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                } else {
                    setStatus('success');
                }
            } else {
                const data = await res.json().catch(() => ({}));
                if (data.prices) updatePrices(data.prices);
                setErrorMessage(data.error || '');
                setStatus('error');
            }
        } catch (error) {
            setErrorMessage('');
            setStatus('error');
        }
    };

    return (
        <section className="section" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
            <div className="container">
                <h1 style={{ marginBottom: '1.5rem' }}>Оформлення замовлення</h1>

                <div className="cart-layout">

                    <div className="cart-items" style={{ background: 'var(--off-white)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h2 style={{ marginBottom: '1rem' }}>Кошик</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {cart.map(item => (
                                <div key={item.cartKey} style={{ display: 'flex', gap: '1rem', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {item.images && item.images[0] ? (
                                        <Photo src={item.images[0]} alt={item.title} sizes="64px" width={128} height={128} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px' }} />
                                    ) : (
                                        <div style={{ width: '64px', height: '64px', background: 'var(--light-gray)', borderRadius: '4px' }} />
                                    )}
                                    <div style={{ flex: '1 1 160px' }}>
                                        <Link href={productPath(item)} style={{ fontWeight: 600, color: 'var(--charcoal)', textDecoration: 'none', fontSize: '0.95rem' }}>
                                            {item.title}
                                        </Link>
                                        <div style={{ color: 'var(--ua-blue)', fontWeight: 600, marginTop: '0.25rem', fontSize: '0.9rem' }}>₴ {item.price}</div>
                                    </div>
                                    <QuantityStepper
                                        value={item.quantity}
                                        size="lg"
                                        decreaseDisabled={item.quantity <= 1}
                                        increaseDisabled={item.quantity >= 999}
                                        onDecrease={() => updateQuantity(item.cartKey, item.quantity - 1)}
                                        onIncrease={() => updateQuantity(item.cartKey, item.quantity + 1)}
                                    />
                                    <button type="button" onClick={() => removeFromCart(item.cartKey)} className="btn btn-outline" style={{ borderColor: '#dc3545', color: '#dc3545', padding: '0.3rem 0.5rem' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--light-gray)', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700 }}>
                            <span>Разом:</span>
                            <span style={{ color: 'var(--ua-blue)' }}>₴ {cartTotal}</span>
                        </div>

                        {cartTotal < minOrder && (
                            <div style={{ marginTop: '0.75rem', color: '#dc3545', fontSize: '0.88rem', fontWeight: 600, padding: '0.65rem 1rem', background: '#ffe6e6', borderRadius: '5px', border: '1px solid #f5c6cb' }}>
                                Мінімальна сума замовлення — {minOrder} ₴. Додайте ще на <strong>{Math.ceil(minOrder - cartTotal)} ₴</strong>
                            </div>
                        )}
                    </div>

                    <div className="checkout-form">
                        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.25rem' }}>Доставка та контакти</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                            {isLoggedIn && !editingDelivery ? (
                                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '1rem 1.1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700 }}>{formData.fullName}</div>
                                        <div style={{ color: 'var(--dark-gray)', fontSize: '0.92rem', marginTop: '0.15rem' }}>+38 {formData.phone}{formData.email ? ` · ${formData.email}` : ''}</div>
                                        <div style={{ marginTop: '0.6rem', fontSize: '0.95rem' }}>
                                            <strong>Нова Пошта:</strong> {formData.city}, {formData.branch}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setEditingDelivery(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                                        Змінити
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {isLoggedIn && authData?.fullName && authData?.city && authData?.branch && (
                                        <div style={{ textAlign: 'right' }}>
                                            <button type="button" onClick={useSaved} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                Використати збережені дані
                                            </button>
                                        </div>
                                    )}

                            <div className="form-group">
                                <label>ПІБ (прізвище, ім'я, по батькові) *</label>
                                <input
                                    required
                                    type="text"
                                    className="form-input"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Шевченко Тарас Григорович"
                                />
                            </div>

                            <div className="form-group">
                                <label>Номер телефону *</label>
                                <div style={{ display: 'flex' }}>
                                    <select
                                        disabled
                                        className="form-input"
                                        style={{ width: '100px', borderRight: 'none', borderRadius: '4px 0 0 4px', background: 'var(--off-white)', appearance: 'none', textAlign: 'center', fontWeight: 'bold', color: 'var(--charcoal)' }}
                                    >
                                        <option>🇺🇦 +38</option>
                                    </select>
                                    <input
                                        required
                                            type="tel"
                                        className="form-input"
                                        style={{ borderRadius: '0 4px 4px 0', flex: 1 }}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                        placeholder="098 000 00 00"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Email адреса <span style={{fontSize: '0.8rem', color: 'var(--medium-gray)', fontWeight: 'normal'}}>(Необов'язково)</span></label>
                                <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="taras@example.com" />
                            </div>

                            <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,91,187,0.04)', borderLeft: '3px solid var(--ua-blue)', borderRadius: '0 4px 4px 0', fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                                Доставка: <strong>Нова Пошта</strong> — оберіть місто та відділення нижче
                            </div>

                            <NovaPoshtaDropdown
                                disabled={false}
                                selectedCity={formData.city}
                                selectedBranch={formData.branch}
                                onSelectCity={(c) => setFormData(prev => ({ ...prev, city: c }))}
                                onSelectBranch={(b) => setFormData(prev => ({ ...prev, branch: b }))}
                                weight={cartDimensions.weight || 0.1}
                                length={cartDimensions.length || null}
                                width={cartDimensions.width || null}
                                height={cartDimensions.height || null}
                                cost={cartTotal || 0}
                            />

                            {editingDelivery && isLoggedIn && formData.city && formData.branch && (!authData?.city || formData.city !== authData.city || formData.branch !== authData.branch) && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={saveDelivery ?? !authData?.city} onChange={e => setSaveDelivery(e.target.checked)} />
                                    Запам&apos;ятати це відділення для наступних замовлень
                                </label>
                            )}
                                </>
                            )}

                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>Спосіб оплати *</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'normal', fontSize: '0.95rem' }}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="cod"
                                            checked={formData.paymentMethod === 'cod'}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                            style={{ accentColor: 'var(--brand)' }}
                                        />
                                        Оплата під час отримання (накладений платіж)
                                    </label>
                                    {cardPayments && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'normal', fontSize: '0.95rem' }}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="monobank"
                                                checked={formData.paymentMethod === 'monobank'}
                                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                                style={{ accentColor: 'var(--brand)' }}
                                            />
                                            Оплата карткою онлайн
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.8rem', paddingLeft: '1.8rem', opacity: 0.9, alignItems: 'center', marginTop: '0.2rem' }}>
                                            <img src="/images/payment/visa.svg" alt="Visa" style={{ height: '22px' }} />
                                            <img src="/images/payment/mastercard.svg" alt="Mastercard" style={{ height: '28px' }} />
                                            <img src="/images/payment/apple-pay.svg" alt="Apple Pay" style={{ height: '26px' }} />
                                            <img src="/images/payment/google-pay.svg" alt="Google Pay" style={{ height: '26px' }} />
                                        </div>
                                    </div>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Коментар до замовлення</label>
                                <textarea className="form-input" rows="2" value={formData.comment} onChange={e => setFormData({ ...formData, comment: e.target.value })} placeholder="Ваші побажання..." />
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, doNotCall: !formData.doNotCall })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    background: formData.doNotCall ? 'rgba(220, 53, 69, 0.05)' : 'var(--off-white)',
                                    padding: '0.9rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${formData.doNotCall ? '#dc3545' : 'var(--medium-gray)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    userSelect: 'none',
                                }}
                                onMouseEnter={(e) => { if (!formData.doNotCall) e.currentTarget.style.borderColor = 'var(--dark-gray)'; }}
                                onMouseLeave={(e) => { if (!formData.doNotCall) e.currentTarget.style.borderColor = 'var(--medium-gray)'; else e.currentTarget.style.borderColor = '#dc3545'; }}
                            >
                                <div style={{
                                    background: formData.doNotCall ? '#dc3545' : 'var(--light-gray)',
                                    color: formData.doNotCall ? 'white' : 'var(--charcoal)',
                                    width: '38px', height: '38px', borderRadius: '50%',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
                                    transition: 'background 0.3s, transform 0.2s',
                                    transform: formData.doNotCall ? 'rotate(-10deg)' : 'scale(1)'
                                }}>
                                    {formData.doNotCall ? <PhoneOff size={18} /> : <Phone size={18} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: formData.doNotCall ? '#dc3545' : 'var(--charcoal)', fontSize: '0.95rem' }}>
                                        Не телефонувати мені
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-gray)', lineHeight: 1.4 }}>
                                        {formData.doNotCall
                                            ? 'Зв\'яжемося через повідомлення (Viber/Telegram) та email.'
                                            : 'Менеджер зателефонує для підтвердження деталей.'}
                                    </div>
                                </div>
                                <div style={{
                                    width: '22px', height: '22px', borderRadius: '5px',
                                    background: formData.doNotCall ? '#dc3545' : 'transparent',
                                    border: `2px solid ${formData.doNotCall ? '#dc3545' : 'var(--medium-gray)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    transition: 'all 0.2s ease',
                                }}>
                                    <Check size={15} color="white" style={{ opacity: formData.doNotCall ? 1 : 0, transform: formData.doNotCall ? 'scale(1)' : 'scale(0)', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
                                </div>
                            </div>

                            {status === 'error' && <div style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.9rem' }}>{errorMessage || 'Помилка збереження. Спробуйте ще раз.'}</div>}
                            {status === 'payment_error' && <div style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.9rem', padding: '1rem', background: '#ffe6e6', borderRadius: '5px', border: '1px solid #dc3545' }}>Помилка оплати Monobank. Замовлення збережено, але не оплачено. Ви можете спробувати інший метод оплати.</div>}
                            {status === 'np_validation_error' && <div style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.9rem', padding: '1rem', background: '#ffe6e6', borderRadius: '5px', border: '1px solid #dc3545' }}>Будь ласка, оберіть місто та відділення Нової Пошти!</div>}

                            <button
                                type="submit"
                                className="btn btn-checkout"
                                disabled={status === 'loading' || cartTotal < minOrder}
                                style={cartTotal < minOrder ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                                {status === 'loading' ? (
                                    'Обробка...'
                                ) : (
                                    <>Підтвердити замовлення <ArrowRight size={18} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
