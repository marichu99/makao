import { useEffect, useState } from 'react'
import { Building2, MapPin, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BuildingOnboardingForm from '@/components/landlord/BuildingOnboardingForm'
import AddBuildingDialog from '@/components/landlord/AddBuildingDialog'
import EditBuildingDialog from '@/components/landlord/EditBuildingDialog'
import DeleteBuildingDialog from '@/components/landlord/DeleteBuildingDialog'
import BuildingUnitsPanel from '@/components/landlord/BuildingUnitsPanel'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { colors } from '@/theme'

function ordinalSuffix(day) {
  if (day % 10 === 1 && day % 100 !== 11) return 'st'
  if (day % 10 === 2 && day % 100 !== 12) return 'nd'
  if (day % 10 === 3 && day % 100 !== 13) return 'rd'
  return 'th'
}

function StickyBuildingBar({ building, onBack, onEdit, onDelete }) {
  return (
    <div
      className="top-14 mb-5 flex flex-wrap items-center justify-between gap-3 border-b md:top-0"
      style={{
        position: 'sticky',
        zIndex: 20,
        background: colors.cream[50],
        borderColor: colors.cream[200],
        padding: '0.5rem 0 1rem',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          title="All buildings"
          style={{ color: colors.brown[600], background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: colors.cream[100] }}>
          <Building2 size={16} color={colors.accent} />
        </div>
        <div className="min-w-0">
          <p style={{ fontWeight: 700, color: colors.brown[800], fontSize: '0.95rem' }}>{building.name}</p>
          <p style={{ fontSize: '0.75rem', color: colors.brown[600], lineHeight: 1.6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
              <MapPin size={11} /> {building.location}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}> · Code: <strong>{building.building_code}</strong></span>
            <span style={{ whiteSpace: 'nowrap' }}> · {building.units_count} units</span>
            {building.rent_due_day && (
              <span style={{ whiteSpace: 'nowrap' }}>
                {' '}· Rent due by the <strong>{building.rent_due_day}{ordinalSuffix(building.rent_due_day)}</strong>
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} className="border-[#e8d5b7]" style={{ color: colors.brown[700] }}>
          <Pencil size={14} /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="border-[#e8d5b7] text-destructive hover:text-destructive">
          <Trash2 size={14} /> Delete
        </Button>
      </div>
    </div>
  )
}

export default function BuildingsPage() {
  const { fetchBuildings } = useAuth()
  const [buildings, setBuildings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const loadBuildings = async () => {
    setLoading(true)
    setLoadError('')
    try {
      setBuildings(await fetchBuildings())
    } catch (err) {
      setLoadError(err.message || 'Could not load your buildings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBuildings() }, [])

  const selected = buildings?.find((b) => b.id === selectedId) || null

  if (loading) {
    return (
      <Card style={{ borderColor: colors.cream[200] }}>
        <CardContent className="py-10 text-center" style={{ color: colors.brown[600] }}>
          Loading your buildings…
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card style={{ borderColor: colors.cream[200] }}>
        <CardContent className="space-y-4 py-10 text-center">
          <p style={{ color: colors.brown[600] }}>{loadError}</p>
          <Button onClick={loadBuildings} className="bg-[#a0622a] text-white hover:bg-[#8a5424]">
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!buildings || buildings.length === 0) {
    return (
      <Card style={{ borderColor: colors.cream[200] }}>
        <CardHeader>
          <CardTitle style={{ color: colors.brown[800] }}>Set up your first building</CardTitle>
          <CardDescription style={{ color: colors.brown[600] }}>
            Configure your building's unit types so tenants can start moving in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BuildingOnboardingForm onSuccess={loadBuildings} />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {selected ? (
        <div key={selected.id} className="animate-in fade-in-0 slide-in-from-right-4 duration-300 ease-out">
          <StickyBuildingBar
            building={selected}
            onBack={() => setSelectedId(null)}
            onEdit={() => setShowEdit(true)}
            onDelete={() => setShowDelete(true)}
          />
          <BuildingUnitsPanel
            buildingId={selected.id}
            onClose={() => setSelectedId(null)}
            onUnitsChanged={loadBuildings}
          />
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in-0 duration-300 ease-out">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>Your buildings</h1>
              <p style={{ fontSize: '0.9rem', color: colors.brown[600] }}>
                Select a building to view its units, or to edit/delete it.
              </p>
            </div>
            <Button onClick={() => setShowAdd(true)} className="bg-[#a0622a] text-white hover:bg-[#8a5424]">
              <Plus size={16} /> Add Building
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((b) => (
              <Card
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] active:duration-75"
                style={{ borderColor: colors.cream[200] }}
              >
                <CardContent className="space-y-3 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: colors.cream[100] }}>
                    <Building2 size={18} color={colors.accent} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: colors.brown[800] }}>{b.name}</p>
                    <p style={{ fontSize: '0.8rem', color: colors.brown[600], display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={12} /> {b.location}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: colors.cream[200] }}>
                    <span style={{ fontSize: '0.75rem', color: colors.brown[600] }}>
                      Code: <strong>{b.building_code}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: colors.brown[600] }}>{b.units_count} units</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AddBuildingDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSuccess={() => loadBuildings()}
      />
      <EditBuildingDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        building={selected}
        onSuccess={() => loadBuildings()}
      />
      <DeleteBuildingDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        building={selected}
        onSuccess={() => {
          setSelectedId(null)
          loadBuildings()
        }}
      />
    </>
  )
}
