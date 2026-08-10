import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Wallet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import EmptyGridPage from '@/pages/landlord/EmptyGridPage'
import PayRentDialog from '@/components/tenant/PayRentDialog'
import DataGrid from '@/components/shared/DataGrid'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { RENT_STATUS_STYLES, rentStatusLabel } from '@/lib/rentStatus'
import { colors } from '@/theme'

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function TenantPaymentsPage() {
  const { fetchMyInvoices, session } = useAuth()
  const [invoices, setInvoices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [payTargets, setPayTargets] = useState(null)

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      setInvoices(await fetchMyInvoices())
    } catch (err) {
      setLoadError(err.message || 'Could not load your payment history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <Card style={{ borderColor: colors.cream[200] }}>
        <CardContent className="py-10 text-center" style={{ color: colors.brown[600] }}>
          Loading your payments…
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card style={{ borderColor: colors.cream[200] }}>
        <CardContent className="space-y-4 py-10 text-center">
          <p style={{ color: colors.brown[600] }}>{loadError}</p>
          <Button onClick={load} className="bg-[#a0622a] text-white hover:bg-[#8a5424]">
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!invoices || invoices.length === 0) {
    return (
      <EmptyGridPage
        icon={Wallet}
        title="Payments"
        message="Your rent invoices will appear here once you've linked a unit."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>Payments</h1>
        <p style={{ fontSize: '0.9rem', color: colors.brown[600] }}>Your rent invoices and payment history.</p>
      </div>

      <DataGrid
        rows={invoices}
        rowId={(i) => i.id}
        itemLabel="invoices"
        searchPlaceholder="Search by period or unit"
        searchKeys={['period_label', 'unit_number', 'building_name']}
        onReload={load}
        columns={[
          {
            key: 'period_label',
            header: 'Period',
            render: (inv) => <span style={{ fontWeight: 700, color: colors.brown[800] }}>{inv.period_label}</span>,
          },
          {
            key: 'unit',
            header: 'Unit',
            render: (inv) => <span style={{ color: colors.brown[700] }}>{inv.unit_number} — {inv.building_name}</span>,
          },
          {
            key: 'amount',
            header: 'Amount',
            render: (inv) => <span style={{ color: colors.brown[700] }}>KES {inv.total_amount.toLocaleString()}</span>,
          },
          {
            key: 'due_date',
            header: 'Due date',
            render: (inv) => <span style={{ color: colors.brown[700] }}>{formatDate(inv.due_date)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (inv) => <Badge style={RENT_STATUS_STYLES[inv.status] || {}}>{rentStatusLabel(inv.status)}</Badge>,
          },
          {
            key: 'paid_at',
            header: 'Paid on',
            render: (inv) => (
              <span style={{ fontSize: '0.8rem', color: colors.brown[600] }}>
                {inv.status === 'paid' && inv.paid_at ? formatDate(inv.paid_at.slice(0, 10)) : '—'}
              </span>
            ),
          },
        ]}
        actions={(selectedRows) => {
          const payable = selectedRows.filter((inv) => inv.status !== 'paid')
          return (
            <DropdownMenuItem disabled={payable.length === 0} onClick={() => setPayTargets(payable)}>
              <Wallet size={14} /> Pay selected
            </DropdownMenuItem>
          )
        }}
      />

      <PayRentDialog
        open={Boolean(payTargets)}
        onOpenChange={(next) => { if (!next) setPayTargets(null) }}
        invoices={payTargets}
        tenantHasEmail={Boolean(session?.user?.email)}
        onSuccess={({ paid, failed }) => {
          setPayTargets(null)
          const base = session?.user?.email
            ? `${paid} payment${paid === 1 ? '' : 's'} recorded — receipts have been emailed to you.`
            : `${paid} payment${paid === 1 ? '' : 's'} recorded.`
          if (paid === 0) {
            toast.error(`Could not record the payment — ${failed} failed.`)
          } else if (failed > 0) {
            toast.warning(`${base} ${failed} failed.`)
          } else {
            toast.success(base)
          }
          load()
        }}
      />
    </div>
  )
}
