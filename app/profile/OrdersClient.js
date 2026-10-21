'use client';

import React, { useState, useEffect } from 'react';

export default function OrdersClient() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        async function fetchOrders() {
            try {
                const res = await fetch('/api/customer-orders');
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data);
                } else {
                    setError('Не вдалося завантажити замовлення.');
                }
            } catch (err) {
                setError('Помилка з\'єднання.');
            } finally {
                setLoading(false);
            }
        }
        fetchOrders();
    }, []);

    const displayStatus = (status) => status === 'Нове' ? 'В обробці' : status;

    const getStatusColor = (rawStatus) => {
        switch(rawStatus) {
            case 'Нове':
            case 'В обробці': return '#e67e22';
            case 'Відправлено': return '#3498db';
            case 'Виконано': return '#2ecc71';
            case 'Скасовано': return '#e74c3c';
            default: return 'var(--dark-gray)';
        }
    }

    if (loading) return <p>Завантаження історії…</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    if (orders.length === 0) {
        return (
            <div style={{ background: 'var(--off-white)', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <p>У вас ще немає замовлень.</p>
            </div>
        );
    }

    return (
        <div className="admin-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--extra-light-gray)' }}>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Замовлення #</th>
                        <th>Дата</th>
                        <th>Статус</th>
                        <th>Сума</th>
                        <th>Деталі</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <React.Fragment key={order.id}>
                            <tr>
                                <td><span style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>#{order.id}</span></td>
                                <td>{new Date(order.created_at).toLocaleDateString('uk-UA')}</td>
                                <td>
                                    <span style={{
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        background: `${getStatusColor(order.status)}20`,
                                        color: getStatusColor(order.status)
                                    }}>
                                        {displayStatus(order.status)}
                                    </span>
                                </td>
                                <td><strong>₴ {order.total_amount}</strong></td>
                                <td>
                                    <button
                                        className="btn-small btn-outline"
                                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    >
                                        {expandedOrder === order.id ? 'Сховати' : 'Переглянути'}
                                    </button>
                                </td>
                            </tr>
                            {expandedOrder === order.id && (
                                <tr style={{ backgroundColor: '#fafafa' }}>
                                    <td colSpan="5" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
                                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                            <div style={{ flex: '1', minWidth: '200px' }}>
                                                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Доставка</h4>
                                                <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem' }}>{order.delivery_method}</p>
                                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--dark-gray)' }}>м. {order.delivery_city}, {order.delivery_branch}</p>

                                                {order.tracking_number && (
                                                    <>
                                                        <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>ТТН Нової Пошти</h4>
                                                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                                                            <a href={`https://novaposhta.ua/tracking/?cargo_number=${order.tracking_number}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                                                                {order.tracking_number}
                                                            </a>
                                                            {' '}· відстежити посилку
                                                        </p>
                                                    </>
                                                )}
                                                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Оплата</h4>
                                                <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem' }}>{order.payment_method || '—'}</p>
                                                <p style={{ margin: '0', fontSize: '0.9rem' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        background: order.payment_status === 'Сплачено' ? '#28a74520' : order.payment_status === 'Помилка оплати' ? '#dc354520' : '#ffc10720',
                                                        color: order.payment_status === 'Сплачено' ? '#28a745' : order.payment_status === 'Помилка оплати' ? '#dc3545' : '#d39e00'
                                                    }}>
                                                        {order.payment_status || '—'}
                                                    </span>
                                                </p>
                                            </div>
                                            <div style={{ flex: '2', minWidth: '300px' }}>
                                                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Товари</h4>
                                                <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                                                    {(order.items || []).map((item, idx) => (
                                                        <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                                            <span>{item.title} <strong style={{ color: 'var(--dark-gray)', marginLeft: '0.5rem' }}>x{item.quantity}</strong></span>
                                                            <span>₴ {item.price * item.quantity}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div style={{ textAlign: 'right', marginTop: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                    Разом: ₴ {order.total_amount}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
