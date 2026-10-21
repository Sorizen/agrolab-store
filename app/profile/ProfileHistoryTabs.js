'use client';

import { useState } from 'react';
import OrdersClient from './OrdersClient';
import SupportRequestsClient from './SupportRequestsClient';

export default function ProfileHistoryTabs() {
    const [activeTab, setActiveTab] = useState('orders');

    return (
        <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--extra-light-gray)', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('orders')}
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'orders' ? '3px solid var(--ua-blue)' : '3px solid transparent',
                        color: activeTab === 'orders' ? 'var(--ua-blue)' : 'var(--dark-gray)',
                        fontWeight: activeTab === 'orders' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '1.1rem'
                    }}
                >
                    Ваші замовлення
                </button>
                <button
                    onClick={() => setActiveTab('support')}
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'support' ? '3px solid var(--ua-blue)' : '3px solid transparent',
                        color: activeTab === 'support' ? 'var(--ua-blue)' : 'var(--dark-gray)',
                        fontWeight: activeTab === 'support' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '1.1rem'
                    }}
                >
                    Ваші звернення
                </button>
            </div>

            <div>
                {activeTab === 'orders' && <OrdersClient />}
                {activeTab === 'support' && <SupportRequestsClient />}
            </div>
        </div>
    );
}
