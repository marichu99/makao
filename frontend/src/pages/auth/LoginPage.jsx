import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, AlertCircle, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { colors, gradients } from '@/theme'

const OTP_LENGTH = 6
const OTP_SECONDS = 600 // matches the backend's 10-minute code validity

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: gradients.hero,
    padding: '2rem',
  },
  card: {
    background: colors.white,
    border: `1px solid ${colors.cream[200]}`,
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
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
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
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
  footer: {
    textAlign: 'center',
    marginTop: '1.5rem',
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
  otpRow: { display: 'flex', gap: '0.5rem', justifyContent: 'center' },
  otpDigit: (focused, hasValue) => ({
    width: '2.75rem',
    height: '3.25rem',
    textAlign: 'center',
    fontSize: '1.25rem',
    fontWeight: 700,
    background: colors.cream[50],
    borderRadius: '10px',
    color: colors.brown[800],
    outline: 'none',
    border: `2px solid ${focused ? colors.accent : hasValue ? colors.cream[300] : colors.cream[200]}`,
  }),
}

function OtpStep({ identifier, onSuccess, onBack }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [focusedIdx, setFocusedIdx] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [otpError, setOtpError] = useState('')
  const inputRefs = useRef([])
  const timerRef = useRef(null)
  const { verifyLoginOtp, resendLoginOtp } = useAuth()

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    setSecondsLeft(OTP_SECONDS)
    timerRef.current = setInterval(() => {
      setSecondsLeft((sec) => {
        if (sec <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return sec - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [startTimer])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')
  const expired = secondsLeft === 0

  const handleDigitChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = digit
    setDigits(next)
    setOtpError('')
    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
      setFocusedIdx(idx + 1)
    }
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
      setFocusedIdx(idx - 1)
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const focusTo = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusTo]?.focus()
    setFocusedIdx(focusTo)
  }

  const handleVerify = async () => {
    const code = digits.join('')
    if (code.length < OTP_LENGTH) {
      setOtpError('Enter the full 6-digit code.')
      return
    }
    setVerifying(true)
    setOtpError('')
    try {
      await verifyLoginOtp(identifier, code)
      onSuccess()
    } catch (err) {
      setOtpError(err.message || 'Verification failed. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setOtpError('')
    setDigits(Array(OTP_LENGTH).fill(''))
    try {
      await resendLoginOtp(identifier)
      startTimer()
      inputRefs.current[0]?.focus()
      setFocusedIdx(0)
    } catch (err) {
      setOtpError(err.message || 'Could not resend code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ textAlign: 'center', color: colors.brown[600], fontSize: '0.85rem' }}>
        We sent a 6-digit code to your registered email.
      </p>

      {otpError && (
        <Alert variant="destructive">
          <AlertCircle size={16} />
          <AlertDescription>{otpError}</AlertDescription>
        </Alert>
      )}

      <div style={s.otpRow} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            style={s.otpDigit(focusedIdx === i, !!d)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={() => setFocusedIdx(i)}
          />
        ))}
      </div>

      {!expired ? (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: colors.brown[600] }}>
          Code expires in <strong style={{ color: colors.accent }}>{minutes}:{secs}</strong>
        </p>
      ) : (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#c0392b' }}>
          Code expired. Please resend.
        </p>
      )}

      <Button
        onClick={handleVerify}
        disabled={verifying || expired}
        className="h-11 w-full bg-[#a0622a] text-white hover:bg-[#8a5424]"
      >
        {verifying ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Verifying…
          </>
        ) : (
          'Verify & Sign In'
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleResend}
        disabled={!expired || resending}
        className="h-11 w-full border-[#e8d5b7]"
      >
        {resending ? 'Sending…' : 'Resend code'}
      </Button>

      <button
        type="button"
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.8rem', color: colors.brown[400], background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={13} /> Back to sign in
      </button>
    </div>
  )
}

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [otpIdentifier, setOtpIdentifier] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(form.identifier, form.password)
      if (result.otpRequired) {
        setOtpIdentifier(form.identifier)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
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
        <p style={s.subtitle}>{otpIdentifier ? 'Verify your identity' : 'Sign in to your account'}</p>

        {otpIdentifier ? (
          <OtpStep
            identifier={otpIdentifier}
            onSuccess={() => navigate('/dashboard')}
            onBack={() => { setOtpIdentifier(null); setError('') }}
          />
        ) : (
          <form style={s.form} onSubmit={handleSubmit}>
            {error && (
              <Alert variant="destructive">
                <AlertCircle size={16} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div style={s.fieldGroup}>
              <Label htmlFor="identifier">Phone number or email</Label>
              <div style={s.inputWrap}>
                <User size={16} color={colors.brown[400]} />
                <Input
                  id="identifier"
                  className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  type="text"
                  name="identifier"
                  placeholder="+254712345678 or you@example.com"
                  value={form.identifier}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div style={s.fieldGroup}>
              <Label htmlFor="password">Password</Label>
              <div style={s.inputWrap}>
                <Lock size={16} color={colors.brown[400]} />
                <Input
                  id="password"
                  className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.brown[400], display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full bg-[#a0622a] text-white hover:bg-[#8a5424]"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        )}

        {!otpIdentifier && (
          <>
            <p style={s.footer}>
              Don&apos;t have an account?{' '}
              <Link to="/register" style={s.footerLink}>Create one</Link>
            </p>
            <Link to="/" style={s.backLink}>← Back to home</Link>
          </>
        )}
      </div>
    </div>
  )
}
