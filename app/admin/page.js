'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductsTab from '@/components/admin/ProductsTab';
import OrdersTab from '@/components/admin/OrdersTab';
import SettingsTab from '@/components/admin/SettingsTab';
import SupportTab from '@/components/admin/SupportTab';
import StatsTab from '@/components/admin/StatsTab';
import VisibilityTab from '@/components/admin/VisibilityTab';
import { Package, ShoppingCart, LogOut, Settings, MessageSquare, BarChart3, EyeOff } from 'lucide-react';

const TABS = [
    { id: 'products', label: 'Товари', Icon: Package },
    { id: 'orders', label: 'Замовлення', Icon: ShoppingCart },
    { id: 'support', label: 'Звернення', Icon: MessageSquare },
    { id: 'visibility', label: 'Видимість', Icon: EyeOff },
    { id: 'stats', label: 'Статистика', Icon: BarChart3 },
    { id: 'settings', label: 'Налаштування', Icon: Settings },
];

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
                    <div className="admin-tabs" role="tablist">
                        {TABS.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === id}
                                className={`admin-tab${activeTab === id ? ' active' : ''}`}
                                onClick={() => setActiveTab(id)}
                            >
                                <Icon size={18} /> {label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'orders' && <OrdersTab />}
                    {activeTab === 'support' && <SupportTab />}
                    {activeTab === 'visibility' && <VisibilityTab />}
                    {activeTab === 'stats' && <StatsTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </section>
        </>
    );
}
