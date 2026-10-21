'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function LogoutCustomerButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);
        await fetch('/api/auth', { method: 'DELETE' });
        router.push('/profile/login');
        router.refresh();
    }

    return (
        <button 
            onClick={handleLogout} 
            className="btn btn-outline"
            disabled={loading}
            style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
            <LogOut size={16} /> {loading ? 'Вихід...' : 'Вийти'}
        </button>
    );
}
