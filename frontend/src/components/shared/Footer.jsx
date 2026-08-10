import { colors } from '@/theme'

const styles = {
  footer: {
    background: colors.cream[50],
    borderTop: `1px solid ${colors.cream[200]}`,
    padding: '2rem',
    textAlign: 'center',
  },
  text: {
    color: colors.brown[600],
    fontSize: '0.875rem',
  },
  accent: { color: colors.accent, fontWeight: 600 },
}

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <p style={styles.text}>
        &copy; {new Date().getFullYear()} <span style={styles.accent}>Nyumba</span> Block Manager
      </p>
    </footer>
  )
}
