import { colors } from '@/theme'

export const RENT_STATUS_STYLES = {
  paid: { background: 'rgba(76, 175, 80, 0.12)', color: colors.success },
  pending: { background: 'rgba(160, 98, 42, 0.12)', color: colors.accent },
  overdue: { background: 'rgba(192, 57, 43, 0.12)', color: colors.error },
  partially_paid: { background: 'rgba(160, 98, 42, 0.12)', color: colors.accent },
}

export function rentStatusLabel(status) {
  return status === 'partially_paid' ? 'Partially paid' : status.charAt(0).toUpperCase() + status.slice(1)
}
