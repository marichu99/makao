import { useEffect, useState } from 'react'
import { Home, Plus, Pencil, Check, X, Info, Clock3 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import LinkUnitModal from '@/components/tenant/LinkUnitModal'
import UnitDetailsDialog from '@/components/tenant/UnitDetailsDialog'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { colors } from '@/theme'

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function UnitCard({ tenancy, onShowDetails, onSaveMoveInDate }) {
  const [editing, setEditing] = useState(false)
  const [draftDate, setDraftDate] = useState(tenancy.move_in_date)
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setDraftDate(tenancy.move_in_date)
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSaveMoveInDate(tenancy.id, draftDate)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: colors.cream[200] }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: colors.cream[100] }}>
        <Home size={16} color={colors.accent} />
      </div>
      <div className="flex-1 space-y-1">
        <p style={{ fontWeight: 700, color: colors.brown[800], fontSize: '0.9rem' }}>
          Unit {tenancy.unit_number} — {tenancy.building_name}
        </p>
        <p style={{ fontSize: '0.8rem', color: colors.brown[600] }}>
          KES {tenancy.monthly_rent.toLocaleString()}/month
        </p>

        {editing ? (
          <div className="flex items-center gap-1.5 pt-1">
            <Input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="h-8 w-auto text-sm"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={save}>
              <Check size={14} color={colors.accent} />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditing(false)}>
              <X size={14} color={colors.brown[400]} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span style={{ fontSize: '0.8rem', color: colors.brown[600] }}>
              Moved in: {formatDate(tenancy.move_in_date)}
            </span>
            <button onClick={startEdit} className="flex items-center" title="Edit move-in date">
              <Pencil size={12} color={colors.brown[400]} />
            </button>
          </div>
        )}
      </div>

      <Button variant="ghost" size="sm" onClick={() => onShowDetails(tenancy)} style={{ color: colors.brown[700] }}>
        <Info size={14} /> Details
      </Button>
    </div>
  )
}

export default function TenantOverviewPage({ session }) {
  const { fetchMyTenancies, updateMoveInDate, fetchApplications } = useAuth()
  const [tenancies, setTenancies] = useState(null)
  const [applications, setApplications] = useState(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [detailsTenancy, setDetailsTenancy] = useState(null)

  const load = async () => {
    try {
      const [data, applicationData] = await Promise.all([fetchMyTenancies(), fetchApplications()])
      setTenancies(data)
      setApplications(applicationData.applications)
      const hasPending = applicationData.applications.some((application) => application.status === 'submitted')
      if (data.length === 0 && !hasPending) setShowLinkModal(true)
    } catch {
      setTenancies([])
      setApplications([])
    }
  }

  useEffect(() => { load() }, [])

  const hasUnits = Boolean(tenancies?.length)
  const pendingApplications = applications?.filter((application) => application.status === 'submitted') || []

  const saveMoveInDate = async (tenancyId, moveInDate) => {
    await updateMoveInDate(tenancyId, moveInDate)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>
          Welcome, {session?.user?.full_name?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: '0.9rem', color: colors.brown[600] }}>
          Apply for a unit, then track your tenancy, rent, and maintenance here.
        </p>
      </div>

      <Card style={{ borderColor: colors.cream[200] }}>
        <CardHeader>
          <CardTitle style={{ color: colors.brown[800], fontSize: '1rem' }}>Your units</CardTitle>
          <CardDescription style={{ color: colors.brown[600] }}>
            Units linked to your account across any building.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasUnits ? (
            <div className="space-y-2">
              {tenancies.map((t) => (
                <UnitCard
                  key={t.id}
                  tenancy={t}
                  onShowDetails={setDetailsTenancy}
                  onSaveMoveInDate={saveMoveInDate}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: colors.cream[100] }}>
                <Home size={18} color={colors.accent} />
              </div>
              <p style={{ fontSize: '0.9rem', color: colors.brown[600] }}>
                Apply for a unit to get started.
              </p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setShowLinkModal(true)}
            className="w-full border-[#e8d5b7] sm:w-auto"
            style={{ color: colors.brown[700] }}
          >
            <Plus size={15} /> {hasUnits ? 'Apply for another unit' : 'Apply for a unit'}
          </Button>
        </CardContent>
      </Card>

      {pendingApplications.length > 0 && (
        <Card style={{ borderColor: '#f0ca7b', background: '#fffdf8' }}>
          <CardHeader>
            <CardTitle style={{ color: colors.brown[800], fontSize: '1rem' }}>Applications awaiting review</CardTitle>
            <CardDescription style={{ color: colors.brown[600] }}>
              Your landlord will notify you after reviewing your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {pendingApplications.map((application) => (
                <div key={application.id} className="rounded-xl border p-4" style={{ borderColor: '#f0ca7b', background: '#fff4de' }}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p style={{ fontWeight: 700, color: colors.brown[800] }}>{application.building_name}</p>
                      <p style={{ fontSize: '0.85rem', color: colors.brown[600] }}>Unit {application.unit_number}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold" style={{ color: '#9a6211', background: '#fff' }}>
                      <Clock3 size={13} /> Pending review
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt style={{ color: colors.brown[600] }}>Move-in</dt><dd className="text-right" style={{ color: colors.brown[800] }}>{formatDate(application.proposed_move_in_date)}</dd>
                    <dt style={{ color: colors.brown[600] }}>Submitted</dt><dd className="text-right" style={{ color: colors.brown[800] }}>{new Date(application.created_at).toLocaleDateString('en-KE')}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <LinkUnitModal
        open={showLinkModal}
        forced={false}
        onOpenChange={setShowLinkModal}
        onSuccess={() => { setShowLinkModal(false); load() }}
      />

      <UnitDetailsDialog
        open={Boolean(detailsTenancy)}
        onOpenChange={(next) => { if (!next) setDetailsTenancy(null) }}
        tenancy={detailsTenancy}
      />
    </div>
  )
}
