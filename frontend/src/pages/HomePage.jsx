import { Link } from 'react-router-dom'
import { Building2, Users, Wallet, Wrench } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'
import { colors, gradients } from '@/theme'

const features = [
  {
    icon: Building2,
    title: 'Building & Unit Setup',
    desc: 'Configure your apartment block once — unit types, sizes, and rent per sq. ft. — and let units generate themselves.',
  },
  {
    icon: Users,
    title: 'Tenant Management',
    desc: 'Onboard tenants via self-service or bulk upload, and track move-ins, deposits, and notice periods.',
  },
  {
    icon: Wallet,
    title: 'Rent & Expense Tracking',
    desc: 'Automate invoices, M-Pesa and cash payments, and pro-rata splits for water, electricity, and common area costs.',
  },
  {
    icon: Wrench,
    title: 'Maintenance Tickets',
    desc: 'Give caretakers a simple mobile view to log repairs, record cash, and keep every unit status up to date.',
  },
]

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.white },

  hero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 2rem',
    background: gradients.hero,
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroBadge: {
    display: 'inline-block',
    background: 'rgba(160, 98, 42, 0.1)',
    border: `1px solid ${colors.accent}`,
    color: colors.accent,
    padding: '0.35rem 1rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '1.5rem',
  },
  heroTitle: {
    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
    fontWeight: 800,
    color: colors.brown[800],
    lineHeight: 1.1,
    marginBottom: '1.5rem',
    maxWidth: '800px',
  },
  heroAccent: { color: colors.accent },
  heroSub: {
    fontSize: '1.2rem',
    color: colors.brown[600],
    maxWidth: '600px',
    lineHeight: 1.7,
    marginBottom: '2.5rem',
  },
  heroCta: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' },
  btnPrimary: {
    display: 'inline-block',
    background: colors.accent,
    color: colors.white,
    textDecoration: 'none',
    padding: '0.85rem 2.25rem',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '1rem',
    transition: 'transform 0.2s, opacity 0.2s',
  },
  btnSecondary: {
    display: 'inline-block',
    background: 'transparent',
    color: colors.brown[800],
    textDecoration: 'none',
    padding: '0.85rem 2.25rem',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '1rem',
    border: `1px solid ${colors.cream[300]}`,
    transition: 'all 0.2s',
  },

  featuresSection: {
    padding: '5rem 2rem',
    background: colors.cream[50],
  },
  featuresInner: { maxWidth: '1100px', margin: '0 auto' },
  sectionTitle: {
    textAlign: 'center',
    fontSize: '2rem',
    fontWeight: 700,
    color: colors.brown[800],
    marginBottom: '0.75rem',
  },
  sectionSub: {
    textAlign: 'center',
    color: colors.brown[600],
    marginBottom: '3rem',
    fontSize: '1.05rem',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: gradients.card,
    border: `1px solid ${colors.cream[200]}`,
    borderRadius: '12px',
    padding: '2rem',
    transition: 'transform 0.2s',
  },
  cardIcon: {
    color: colors.accent,
    fontSize: '2rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    color: colors.brown[800],
    fontWeight: 700,
    fontSize: '1.1rem',
    marginBottom: '0.75rem',
  },
  cardDesc: {
    color: colors.brown[600],
    fontSize: '0.925rem',
    lineHeight: 1.65,
  },

  ctaSection: {
    padding: '4rem 2rem',
    background: gradients.hero,
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: colors.brown[800],
    marginBottom: '1rem',
  },
  ctaSub: {
    color: colors.brown[600],
    marginBottom: '2rem',
    fontSize: '1.05rem',
  },
}

export default function HomePage() {
  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.hero}>
        <div style={styles.heroBadge}>Apartment Block Management</div>
        <h1 style={styles.heroTitle}>
          Run Your <span style={styles.heroAccent}>Block</span>,<br />
          Not a Spreadsheet
        </h1>
        <p style={styles.heroSub}>
          Nyumba Block Manager brings your buildings, units, tenants, and rent collection
          into one place — built for how Kenyan landlords actually manage apartments.
        </p>
        <div style={styles.heroCta}>
          <Link to="/register" style={styles.btnPrimary}>Get Started Free</Link>
          <Link to="/login" style={styles.btnSecondary}>Sign In</Link>
        </div>
      </section>

      <section style={styles.featuresSection}>
        <div style={styles.featuresInner}>
          <h2 style={styles.sectionTitle}>Everything You Need</h2>
          <p style={styles.sectionSub}>
            Manage buildings, tenants, and expenses with confidence
          </p>
          <div style={styles.featuresGrid}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={styles.card}>
                <div style={styles.cardIcon}><Icon size={32} /></div>
                <h3 style={styles.cardTitle}>{title}</h3>
                <p style={styles.cardDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>Ready to take control of your block?</h2>
        <p style={styles.ctaSub}>Join landlords already simplifying rent collection with Nyumba.</p>
        <Link to="/register" style={styles.btnPrimary}>Create Your Account</Link>
      </section>

      <Footer />
    </div>
  )
}
