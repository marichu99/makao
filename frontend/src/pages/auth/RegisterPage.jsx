import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Phone, Mail, IdCard, Building2, Users, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PasswordField from '@/components/shared/PasswordField'
import { isPasswordValid } from '@/lib/password'
import { colors, gradients } from '@/theme'

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: gradients.hero,
    padding: '2rem 1rem',
  },
  card: {
    background: colors.white,
    border: `1px solid ${colors.cream[200]}`,
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 25px 60px rgba(160, 98, 42, 0.12)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '0.4rem',
    fontSize: '1.6rem',
    fontWeight: 800,
    color: colors.brown[800],
  },
  logoAccent: { color: colors.accent },
  subtitle: {
    textAlign: 'center',
    color: colors.brown[600],
    marginBottom: '2rem',
    fontSize: '0.9rem',
  },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  roleCard: (active) => ({
    border: `1.5px solid ${active ? colors.accent : colors.cream[200]}`,
    background: active ? 'rgba(160, 98, 42, 0.06)' : colors.cream[50],
    borderRadius: '12px',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.6rem',
    cursor: 'pointer',
    textAlign: 'center',
  }),
  roleIcon: (active) => ({
    color: active ? colors.accent : colors.brown[400],
  }),
  roleTitle: { fontWeight: 700, color: colors.brown[800], fontSize: '1rem' },
  roleDesc: { fontSize: '0.8rem', color: colors.brown[600], lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    background: colors.cream[50],
    border: `1px solid ${colors.cream[200]}`,
    borderRadius: '10px',
    padding: '0 0.9rem',
    gap: '0.6rem',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: colors.brown[600],
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    padding: 0,
  },
  footer: {
    textAlign: 'center',
    marginTop: '0.5rem',
    color: colors.brown[600],
    fontSize: '0.875rem',
  },
  footerLink: { color: colors.accent, fontWeight: 600 },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '0.75rem',
    color: colors.brown[400],
    fontSize: '0.8rem',
  },
}

const emptyForm = {
  full_name: '', phone: '', email: '', password: '', confirmPassword: '',
  id_number: '',
}

export default function RegisterPage() {
  const [role, setRole] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isPasswordValid(form.password)) {
      setError('Password does not meet all requirements.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        role,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        ...(role === 'landlord' ? { id_number: form.id_number } : {}),
      }
      await register(payload)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          Nyum<span style={s.logoAccent}>ba</span>
        </div>
        <p style={s.subtitle}>
          {role ? 'Create your account' : 'How will you be using Nyumba?'}
        </p>

        {!role && (
          <div style={s.roleGrid}>
            <div style={s.roleCard(false)} onClick={() => setRole('landlord')}>
              <Building2 size={28} style={s.roleIcon(false)} />
              <span style={s.roleTitle}>Landlord</span>
              <span style={s.roleDesc}>Set up your building and manage tenants once you're logged in.</span>
            </div>
            <div style={s.roleCard(false)} onClick={() => setRole('tenant')}>
              <Users size={28} style={s.roleIcon(false)} />
              <span style={s.roleTitle}>Tenant</span>
              <span style={s.roleDesc}>Create your account, then pick your building and unit once you're logged in.</span>
            </div>
          </div>
        )}

        {role && (
          <>
            <button style={s.backBtn} onClick={() => { setRole(null); setError('') }}>
              <ArrowLeft size={14} /> Change account type
            </button>

            <form style={s.form} onSubmit={handleSubmit}>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle size={16} />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div style={s.row}>
                <div style={s.fieldGroup}>
                  <Label>Full name</Label>
                  <div style={s.inputWrap}>
                    <User size={16} color={colors.brown[400]} />
                    <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" placeholder="Jane Wanjiru"
                      value={form.full_name} onChange={update('full_name')} required />
                  </div>
                </div>
                <div style={s.fieldGroup}>
                  <Label>Phone number</Label>
                  <div style={s.inputWrap}>
                    <Phone size={16} color={colors.brown[400]} />
                    <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" type="tel" placeholder="+254712345678"
                      value={form.phone} onChange={update('phone')} required />
                  </div>
                </div>
              </div>

              <div style={role === 'landlord' ? s.row : undefined}>
                <div style={s.fieldGroup}>
                  <Label>Email (optional)</Label>
                  <div style={s.inputWrap}>
                    <Mail size={16} color={colors.brown[400]} />
                    <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" type="email" placeholder="you@example.com"
                      value={form.email} onChange={update('email')} />
                  </div>
                </div>
                {role === 'landlord' && (
                  <div style={s.fieldGroup}>
                    <Label>National ID number</Label>
                    <div style={s.inputWrap}>
                      <IdCard size={16} color={colors.brown[400]} />
                      <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" placeholder="23456789"
                        value={form.id_number} onChange={update('id_number')} required />
                    </div>
                  </div>
                )}
              </div>

              <PasswordField
                password={form.password}
                confirmPassword={form.confirmPassword}
                onPasswordChange={(v) => setForm({ ...form, password: v })}
                onConfirmPasswordChange={(v) => setForm({ ...form, confirmPassword: v })}
              />

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-[#a0622a] text-white hover:bg-[#8a5424]"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating your account…
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </>
        )}

        <p style={s.footer}>
          Already have an account?{' '}
          <Link to="/login" style={s.footerLink}>Sign in</Link>
        </p>
        <Link to="/" style={s.backLink}>← Back to home</Link>
      </div>
    </div>
  )
}
