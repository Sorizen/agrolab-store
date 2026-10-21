export function LegalSection({ title, children }) {
  return (
    <>
      <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--charcoal)' }}>{title}</h3>
      <div style={{ color: 'var(--dark-gray)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>{children}</div>
    </>
  );
}

export default function LegalPage({ title, lead, children }) {
  return (
    <>
      <section className="hero" style={{ padding: '2rem 0', minHeight: '30vh', display: 'flex', alignItems: 'center' }}>
        <div className="container hero-content">
          <div style={{ textAlign: 'center', margin: '0 auto', maxWidth: '800px', background: 'rgba(0,0,0,0.4)', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--white)' }}>{title}</h1>
            <p style={{ margin: '0 auto', color: 'var(--white)', fontSize: '1.25rem', fontWeight: 500 }}>{lead}</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '2rem' }}>
        <div className="container">
          <div className="legal-text" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--white)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-subtle)' }}>
            {children}
          </div>
        </div>
      </section>
    </>
  );
}
