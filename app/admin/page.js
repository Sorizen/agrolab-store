'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductsTab from '@/components/admin/ProductsTab';
import OrdersTab from '@/components/admin/OrdersTab';
import SettingsTab from '@/components/admin/SettingsTab';
import SupportTab from '@/components/admin/SupportTab';
import StatsTab from '@/components/admin/StatsTab';
import { Package, ShoppingCart, LogOut, Settings, MessageSquare, BarChart3 } from 'lucide-react';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('products');
    const router = useRouter();

    async function handleLogout() {
        await fetch('/api/auth', { method: 'DELETE' });
        router.push('/');
    }

    return (
        <>
            <section className="page-header">
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Адмін панель</h1>
                        <p>Управління товарами та замовленнями</p>
                    </div>
                    <button onClick={handleLogout} className="btn btn-outline" style={{ height: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <LogOut size={16} /> Вийти
                    </button>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--extra-light-gray)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
                        <button 
                            onClick={() => setActiveTab('products')} 
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                fontSize: '1.2rem', 
                                fontWeight: activeTab === 'products' ? 'bold' : 'normal',
                                color: activeTab === 'products' ? 'var(--primary-color)' : 'var(--dark-gray)',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'products' ? '2px solid var(--primary-color)' : 'none',
                                paddingBottom: '0.5rem',
                                marginBottom: '-0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <Package size={18} /> Товари
                        </button>
                        <button 
                            onClick={() => setActiveTab('orders')} 
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                fontSize: '1.2rem', 
                                fontWeight: activeTab === 'orders' ? 'bold' : 'normal',
                                color: activeTab === 'orders' ? 'var(--primary-color)' : 'var(--dark-gray)',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'orders' ? '2px solid var(--primary-color)' : 'none',
                                paddingBottom: '0.5rem',
                                marginBottom: '-0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <ShoppingCart size={18} /> Замовлення
                        </button>
                        <button 
                            onClick={() => setActiveTab('support')} 
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                fontSize: '1.2rem', 
                                fontWeight: activeTab === 'support' ? 'bold' : 'normal',
                                color: activeTab === 'support' ? 'var(--primary-color)' : 'var(--dark-gray)',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'support' ? '2px solid var(--primary-color)' : 'none',
                                paddingBottom: '0.5rem',
                                marginBottom: '-0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <MessageSquare size={18} /> Звернення
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '1.2rem',
                                fontWeight: activeTab === 'stats' ? 'bold' : 'normal',
                                color: activeTab === 'stats' ? 'var(--primary-color)' : 'var(--dark-gray)',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'stats' ? '2px solid var(--primary-color)' : 'none',
                                paddingBottom: '0.5rem',
                                marginBottom: '-0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <BarChart3 size={18} /> Статистика
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '1.2rem',
                                fontWeight: activeTab === 'settings' ? 'bold' : 'normal',
                                color: activeTab === 'settings' ? 'var(--primary-color)' : 'var(--dark-gray)',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'settings' ? '2px solid var(--primary-color)' : 'none',
                                paddingBottom: '0.5rem',
                                marginBottom: '-0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <Settings size={18} /> Налаштування
                        </button>
                    </div>

                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'orders' && <OrdersTab />}
                    {activeTab === 'support' && <SupportTab />}
                    {activeTab === 'stats' && <StatsTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </section>
        </>
    );
}
