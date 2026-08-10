import { Link } from 'react-router-dom'
import { colors } from '@/theme'

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${colors.cream[200]}`,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.brown[800],
    textDecoration: 'none',
    letterSpacing: '0.05em',
  },
  logoAccent: { color: colors.accent },
  links: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  link: {
    color: colors.brown[600],
    textDecoration: 'none',
    fontSize: '0.95rem',
    transition: 'color 0.2s',
  },
  btnPrimary: {
    background: colors.accent,
    color: colors.white,
    border: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
}

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>
        Nyum<span style={styles.logoAccent}>ba</span>
      </Link>
      <div style={styles.links}>
        <Link to="/login" style={styles.link}>Login</Link>
        <Link to="/register" style={styles.btnPrimary}>Get Started</Link>
      </div>
    </nav>
  )
}
