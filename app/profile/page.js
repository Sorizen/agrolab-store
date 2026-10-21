import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getUserById, toPublicUser } from '@/lib/users';
import ProfileHistoryTabs from './ProfileHistoryTabs';
import ProfileSettings from './ProfileSettings';
import LogoutCustomerButton from '@/components/LogoutCustomerButton';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const session = await getSessionUser();
    const dbUser = session ? await getUserById(session.id).catch(() => null) : null;
    if (!dbUser) {
        redirect('/profile/login');
    }
    const user = toPublicUser(dbUser);

    const isAdmin = session.role === 'admin';

    return (
        <>
            <section className="page-header" style={{ padding: '3rem 0', background: 'var(--off-white)', borderBottom: '1px solid var(--extra-light-gray)' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Особистий кабінет</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <p style={{ color: 'var(--dark-gray)', margin: 0 }}>
                                Ви увійшли як <strong>{user.email}</strong>
                            </p>
                            {isAdmin && (
                                <a href="/admin" className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '4px' }}>
                                    Панель адміністратора
                                </a>
                            )}
                        </div>
                    </div>
                    <div>
                        <LogoutCustomerButton />
                    </div>
                </div>
            </section>
            <section className="section">
                <div className="container">
                    <ProfileSettings initialMetadata={user.metadata} />

                    <ProfileHistoryTabs />
                </div>
            </section>
        </>
    );
}
