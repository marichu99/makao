import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RENT_STATUS_STYLES, rentStatusLabel } from '@/lib/rentStatus'
import { colors } from '@/theme'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Accepts one or more tenants and fetches each one's rent history in parallel.
// Both the summary and the month-by-month detail are plain tables — a tab per
// tenant doesn't scale once more than a handful of tenants are selected.
export default function PaymentHistoryDialog({ open, onOpenChange, tenants }) {
  const { fetchTenantRentHistory } = useAuth()
  const [histories, setHistories] = useState({})

  useEffect(() => {
    if (!open || !tenants || tenants.length === 0) return
    setHistories(Object.fromEntries(tenants.map((t) => [t.id, { loading: true }])))

    tenants.forEach((t) => {
      fetchTenantRentHistory(t.id)
        .then((data) => setHistories((prev) => ({ ...prev, [t.id]: { loading: false, data } })))
        .catch((err) =>
          setHistories((prev) => ({
            ...prev,
            [t.id]: { loading: false, error: err.message || 'Could not load payment history.' },
          }))
        )
    })
  }, [open, tenants])

  if (!tenants || tenants.length === 0) return null

  const single = tenants.length === 1
  const entries = tenants.map((t) => ({ tenant: t, entry: histories[t.id] }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle style={{ color: colors.brown[800] }}>
            Payment history{!single ? ` — ${tenants.length} tenants` : ''}
          </DialogTitle>
          <DialogDescription>
            {single
              ? `${tenants[0].tenant_name} — Unit ${tenants[0].unit_number}, ${tenants[0].building_name}`
              : tenants.length <= 4
                ? tenants.map((t) => t.tenant_name).join(', ')
                : `${tenants.length} tenants selected`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: colors.cream[200] }}>
            <Table>
              <TableHeader>
                <TableRow>
                  {!single && <TableHead>Tenant</TableHead>}
                  <TableHead>On-time rate</TableHead>
                  <TableHead>On-time</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(({ tenant, entry }) => {
                  if (entry?.loading) {
                    return (
                      <TableRow key={tenant.id}>
                        {!single && (
                          <TableCell style={{ fontWeight: 700, color: colors.brown[800] }}>{tenant.tenant_name}</TableCell>
                        )}
                        <TableCell colSpan={4} style={{ color: colors.brown[600] }}>Loading…</TableCell>
                      </TableRow>
                    )
                  }
                  if (entry?.error) {
                    return (
                      <TableRow key={tenant.id}>
                        {!single && (
                          <TableCell style={{ fontWeight: 700, color: colors.brown[800] }}>{tenant.tenant_name}</TableCell>
                        )}
                        <TableCell colSpan={4} style={{ color: colors.error }}>{entry.error}</TableCell>
                      </TableRow>
                    )
                  }
                  if (!entry?.data) return null
                  const { summary } = entry.data
                  return (
                    <TableRow key={tenant.id}>
                      {!single && (
                        <TableCell style={{ fontWeight: 700, color: colors.brown[800] }}>{tenant.tenant_name}</TableCell>
                      )}
                      <TableCell style={{ color: colors.brown[700] }}>
                        {summary.on_time_rate !== null ? `${summary.on_time_rate}%` : '—'}
                      </TableCell>
                      <TableCell style={{ color: colors.brown[700] }}>{summary.on_time_count}</TableCell>
                      <TableCell style={{ color: colors.brown[700] }}>{summary.late_count}</TableCell>
                      <TableCell style={{ color: colors.brown[700] }}>{summary.outstanding_count}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg border" style={{ borderColor: colors.cream[200] }}>
            <Table>
              <TableHeader>
                <TableRow>
                  {!single && <TableHead>Tenant</TableHead>}
                  <TableHead>Period</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>On time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.flatMap(({ tenant, entry }) =>
                  (entry?.data?.months || []).map((m) => (
                    <TableRow key={`${tenant.id}-${m.period_label}`}>
                      {!single && (
                        <TableCell style={{ color: colors.brown[700] }}>{tenant.tenant_name}</TableCell>
                      )}
                      <TableCell style={{ fontWeight: 700, color: colors.brown[800] }}>{m.period_label}</TableCell>
                      <TableCell style={{ color: colors.brown[700] }}>{formatDate(m.due_date)}</TableCell>
                      <TableCell style={{ color: colors.brown[700] }}>
                        {m.paid_at ? formatDate(m.paid_at.slice(0, 10)) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge style={RENT_STATUS_STYLES[m.status] || {}}>{rentStatusLabel(m.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.on_time === null ? (
                          <span style={{ color: colors.brown[400] }}>—</span>
                        ) : m.on_time ? (
                          <CheckCircle2 size={16} color={colors.success} />
                        ) : (
                          <XCircle size={16} color={colors.error} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
