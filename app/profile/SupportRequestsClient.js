'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

export default function SupportRequestsClient() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRequest, setExpandedRequest] = useState(null);

    useEffect(() => {
        async function fetchRequests() {
            try {
                const res = await fetch('/api/customer-support');
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data);
                }
            } catch (err) {

            } finally {
                setLoading(false);
            }
        }
        fetchRequests();
    }, []);

    const getStatusColor = (status) => {
        switch(status) {
            case 'Нове': return '#e67e22';
            case 'В обробці': return '#3498db';
            case 'Вирішено': return '#2ecc71';
            case 'Закрито': return 'var(--dark-gray)';
            default: return 'var(--dark-gray)';
        }
    };

    if (loading) return <p>Завантаження звернень...</p>;

    if (requests.length === 0) {
        return (
            <div style={{ background: 'var(--off-white)', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <p style={{ marginBottom: '1rem' }}>У вас ще немає звернень.</p>
                <a href="/contacts" className="btn-checkout" style={{ display: 'inline-flex' }}>Створити нове звернення</a>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <a href="/contacts" className="btn-checkout" style={{ display: 'inline-flex', padding: '0.6rem 1.2rem', fontSize: '0.95rem' }}>
                    + Створити нове звернення
                </a>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--extra-light-gray)' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Звернення #</th>
                            <th>Дата</th>
                            <th>Статус</th>
                            <th>Деталі</th>
                        </tr>
                    </thead>
                <tbody>
                    {requests.map(req => (
                        <React.Fragment key={req.id}>
                            <tr>
                                <td><span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>#{req.id}</span></td>
                                <td>{new Date(req.created_at).toLocaleDateString('uk-UA')}</td>
                                <td>
                                    <span style={{
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        background: `${getStatusColor(req.status)}20`,
                                        color: getStatusColor(req.status)
                                    }}>
                                        {req.status}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="btn-small btn-outline"
                                        onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)}
                                    >
                                        {expandedRequest === req.id ? 'Сховати' : 'Переглянути'}
                                    </button>
                                </td>
                            </tr>
                            {expandedRequest === req.id && (
                                <tr style={{ backgroundColor: '#fafafa' }}>
                                    <td colSpan="4" style={{ padding: '1.5rem', borderLeft: '4px solid var(--ua-blue)' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                            <MessageCircle size={18} color="var(--ua-blue)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{req.message}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
        </div>
    );
}
