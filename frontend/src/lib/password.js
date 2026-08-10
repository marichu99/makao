export const PASSWORD_REQS = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'transparent' }
  const score = PASSWORD_REQS.filter((r) => r.test(password)).length
  if (score <= 1) return { score, label: 'Weak', color: '#c0392b' }
  if (score === 2) return { score, label: 'Fair', color: '#c98a2c' }
  return { score, label: 'Strong', color: '#4caf50' }
}

export function isPasswordValid(password) {
  return PASSWORD_REQS.every((r) => r.test(password))
}
