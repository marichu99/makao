import { useState } from 'react'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { colors } from '@/theme'
import { PASSWORD_REQS, getPasswordStrength } from '@/lib/password'

const s = {
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
  eyeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.brown[400],
    display: 'flex',
    flexShrink: 0,
  },
  strengthBar: { display: 'flex', gap: '4px', marginTop: '0.35rem' },
  strengthSegment: (filled, color) => ({
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    background: filled ? color : colors.cream[200],
    transition: 'background 0.2s',
  }),
  strengthLabel: (color) => ({ fontSize: '0.75rem', color, marginTop: '0.3rem', fontWeight: 600 }),
  requirements: { display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.4rem' },
  requirement: (met) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.78rem',
    color: met ? '#4caf50' : colors.brown[400],
  }),
  matchIndicator: (match) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.78rem',
    color: match ? '#4caf50' : '#c0392b',
    marginTop: '0.1rem',
  }),
}

export default function PasswordField({ password, confirmPassword, onPasswordChange, onConfirmPasswordChange }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  const reqsMet = PASSWORD_REQS.map((r) => r.test(password))
  const strength = getPasswordStrength(password)
  const confirmMatch = confirmPassword === password && confirmPassword.length > 0

  return (
    <>
      <div style={s.fieldGroup}>
        <Label>Password</Label>
        <div style={s.inputWrap}>
          <Lock size={16} color={colors.brown[400]} />
          <Input
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button type="button" style={s.eyeBtn} onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {password && (
          <div>
            <div style={s.strengthBar}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={s.strengthSegment(i < strength.score, strength.color)} />
              ))}
            </div>
            <span style={s.strengthLabel(strength.color)}>{strength.label}</span>
            <div style={s.requirements}>
              {PASSWORD_REQS.map((req, i) => (
                <span key={req.label} style={s.requirement(reqsMet[i])}>
                  {reqsMet[i] ? <Check size={12} /> : <X size={12} />}
                  {req.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={s.fieldGroup}>
        <Label>Confirm password</Label>
        <div style={s.inputWrap}>
          <Lock size={16} color={colors.brown[400]} />
          <Input
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            required
            autoComplete="new-password"
          />
          <button type="button" style={s.eyeBtn} onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmTouched && confirmPassword && (
          <span style={s.matchIndicator(confirmMatch)}>
            {confirmMatch ? <Check size={12} /> : <X size={12} />}
            {confirmMatch ? 'Passwords match' : 'Passwords do not match'}
          </span>
        )}
      </div>
    </>
  )
}
