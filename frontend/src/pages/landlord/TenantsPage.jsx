import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Users, Mail, History, PiggyBank } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import EmptyGridPage from '@/pages/landlord/EmptyGridPage'
import SendNoticeDialog from '@/components/landlord/SendNoticeDialog'
import PaymentHistoryDialog from '@/components/landlord/PaymentHistoryDialog'
import RecordDepositDialog from '@/components/landlord/RecordDepositDialog'
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

export default function TenantsPage() {
  const { fetchLandlordTenants } = useAuth()
  const [tenants, setTenants] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [noticeTargets, setNoticeTargets] = useState(null)
  const [historyTargets, setHistoryTargets] = useState(null)
  const [depositTarget, setDepositTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      setTenants(await fetchLandlordTenants())
    } catch (err) {
      setLoadError(err.message || 'Could not load tenants.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <Card style={{ borderColor: colors.cream[200] }}>
        <CardContent className="py-10 text-center" style={{ color: colors.brown[600] }}>
          Loading your tenants…
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

  if (!tenants || tenants.length === 0) {
    return (
      <EmptyGridPage
        icon={Users}
        title="Tenants"
        message="Tenants will appear here once they link themselves to one of your units."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>Tenants</h1>
        <p style={{ fontSize: '0.9rem', color: colors.brown[600] }}>
          Everyone currently linked to a unit across your buildings.
        </p>
      </div>

      <DataGrid
        rows={tenants}
        rowId={(t) => t.id}
        itemLabel="tenants"
        searchPlaceholder="Search by name, unit, or phone"
        searchKeys={['tenant_name', 'unit_number', 'building_name', 'tenant_phone', 'tenant_email']}
        onReload={load}
        columns={[
          {
            key: 'tenant_name',
            header: 'Tenant',
            render: (t) => <span style={{ fontWeight: 700, color: colors.brown[800] }}>{t.tenant_name}</span>,
          },
          {
            key: 'contact',
            header: 'Contact',
            render: (t) => (
              <>
                <div style={{ color: colors.brown[700] }}>{t.tenant_phone}</div>
                {t.tenant_email && (
                  <div style={{ fontSize: '0.75rem', color: colors.brown[600] }}>{t.tenant_email}</div>
                )}
              </>
            ),
          },
          {
            key: 'unit',
            header: 'Unit',
            render: (t) => (
              <span style={{ color: colors.brown[700] }}>{t.unit_number} — {t.building_name}</span>
            ),
          },
          {
            key: 'rent',
            header: 'Rent',
            render: (t) => <span style={{ color: colors.brown[700] }}>KES {t.monthly_rent.toLocaleString()}</span>,
          },
          {
            key: 'move_in',
            header: 'Move-in date',
            render: (t) => <span style={{ color: colors.brown[700] }}>{formatDate(t.move_in_date)}</span>,
          },
          {
            key: 'rent_status',
            header: 'Rent status',
            render: (t) => (
              <div className="flex flex-wrap items-center gap-1">
                {t.tenancy_status === 'pending' && (
                  <Badge style={{ background: 'rgba(160, 98, 42, 0.12)', color: colors.accent }}>Pending move-in</Badge>
                )}
                <Badge style={RENT_STATUS_STYLES[t.rent_status] || {}}>{rentStatusLabel(t.rent_status)}</Badge>
              </div>
            ),
          },
          {
            key: 'deposit',
            header: 'Deposit',
            render: (t) => (
              <span style={{ color: colors.brown[700] }}>
                KES {(t.deposit_paid || 0).toLocaleString()} / {(t.deposit_amount || 0).toLocaleString()}
              </span>
            ),
          },
        ]}
        actions={(selectedRows) => (
          <>
            <DropdownMenuItem disabled={selectedRows.length === 0} onClick={() => setNoticeTargets(selectedRows)}>
              <Mail size={14} /> Send notice{selectedRows.length > 1 ? ' to selected' : ''}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={selectedRows.length === 0} onClick={() => setHistoryTargets(selectedRows)}>
              <History size={14} /> Payment history
            </DropdownMenuItem>
            <DropdownMenuItem disabled={selectedRows.length !== 1} onClick={() => setDepositTarget(selectedRows[0])}>
              <PiggyBank size={14} /> Record deposit
            </DropdownMenuItem>
          </>
        )}
      />

      <SendNoticeDialog
        open={Boolean(noticeTargets)}
        onOpenChange={(next) => { if (!next) setNoticeTargets(null) }}
        tenants={noticeTargets}
        onSuccess={({ sent, failed }) => {
          setNoticeTargets(null)
          if (sent === 0) {
            toast.error(`Could not send the notice — ${failed} failed.`)
          } else if (failed > 0) {
            toast.warning(`Notice sent to ${sent} tenant${sent === 1 ? '' : 's'}; ${failed} failed.`)
          } else {
            toast.success(`Notice sent to ${sent} tenant${sent === 1 ? '' : 's'}.`)
          }
        }}
      />

      <PaymentHistoryDialog
        open={Boolean(historyTargets)}
        onOpenChange={(next) => { if (!next) setHistoryTargets(null) }}
        tenants={historyTargets}
      />

      <RecordDepositDialog
        tenant={depositTarget}
        open={Boolean(depositTarget)}
        onOpenChange={(next) => { if (!next) setDepositTarget(null) }}
        onSuccess={() => { setDepositTarget(null); load() }}
      />
    </div>
  )
}
