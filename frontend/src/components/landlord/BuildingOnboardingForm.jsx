import { useState } from 'react'
import { Building2, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { colors } from '@/theme'

const UNIT_TYPE_OPTIONS = [
  'Bedsitter', 'Studio', '1-Bed', '2-Bed', '3-Bed', '4-Bed', 'Penthouse', 'Maisonette',
]

const s = {
  sectionTitle: {
    color: colors.brown[800],
    fontWeight: 700,
    fontSize: '0.95rem',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
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
  unitTypeCard: {
    border: `1px solid ${colors.cream[200]}`,
    borderRadius: '10px',
    padding: '1rem',
    background: colors.cream[50],
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  unitTypeRow: { display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', gap: '0.6rem', alignItems: 'end' },
  smallLabel: { fontSize: '0.75rem', color: colors.brown[600], fontWeight: 500 },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: colors.accent,
    background: 'transparent',
    border: `1px dashed ${colors.cream[300]}`,
    borderRadius: '8px',
    padding: '0.6rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    justifyContent: 'center',
  },
}

const emptyUnitType = () => ({ name: '', size_sqft: '', base_rent: '', max_occupants: 1, count: '' })

export default function BuildingOnboardingForm({ onSuccess }) {
  const [building, setBuilding] = useState({ name: '', location: '', year_built: '', total_floors: '', rent_due_day: '5' })
  const [unitTypes, setUnitTypes] = useState([emptyUnitType()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { createBuilding } = useAuth()

  const updateUnitType = (index, field, value) => {
    setUnitTypes((prev) => prev.map((ut, i) => (i === index ? { ...ut, [field]: value } : ut)))
  }
  const addUnitType = () => setUnitTypes((prev) => [...prev, emptyUnitType()])
  const removeUnitType = (index) => setUnitTypes((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (unitTypes.some((ut) => !ut.name)) {
      setError('Select a type for every unit row.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: building.name,
        location: building.location,
        year_built: building.year_built ? Number(building.year_built) : undefined,
        total_floors: building.total_floors ? Number(building.total_floors) : undefined,
        rent_due_day: building.rent_due_day ? Number(building.rent_due_day) : undefined,
        unit_types: unitTypes.map((ut) => ({
          name: ut.name,
          size_sqft: ut.size_sqft ? Number(ut.size_sqft) : undefined,
          base_rent: Number(ut.base_rent),
          max_occupants: Number(ut.max_occupants) || 1,
          count: Number(ut.count),
        })),
      }
      const created = await createBuilding(payload)
      onSuccess?.(created)
    } catch (err) {
      setError(err.message || 'Could not create building. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <p style={s.sectionTitle}><Building2 size={16} /> Your building</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={s.row}>
            <div style={s.fieldGroup}>
              <Label>Building name</Label>
              <div style={s.inputWrap}>
                <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" placeholder="Jabavu Apartments"
                  value={building.name} onChange={(e) => setBuilding({ ...building, name: e.target.value })} required />
              </div>
            </div>
            <div style={s.fieldGroup}>
              <Label>Location</Label>
              <div style={s.inputWrap}>
                <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" placeholder="Kilimani, Nairobi"
                  value={building.location} onChange={(e) => setBuilding({ ...building, location: e.target.value })} required />
              </div>
            </div>
          </div>
          <div style={s.row}>
            <div style={s.fieldGroup}>
              <Label>Year built (optional)</Label>
              <div style={s.inputWrap}>
                <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" type="number" placeholder="2018"
                  value={building.year_built} onChange={(e) => setBuilding({ ...building, year_built: e.target.value })} />
              </div>
            </div>
            <div style={s.fieldGroup}>
              <Label>Total floors (optional)</Label>
              <div style={s.inputWrap}>
                <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" type="number" placeholder="4"
                  value={building.total_floors} onChange={(e) => setBuilding({ ...building, total_floors: e.target.value })} />
              </div>
            </div>
          </div>
          <div style={s.row}>
            <div style={s.fieldGroup}>
              <Label>Rent due day</Label>
              <div style={s.inputWrap}>
                <Input className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" type="number" min={1} max={28} placeholder="5"
                  value={building.rent_due_day} onChange={(e) => setBuilding({ ...building, rent_due_day: e.target.value })} />
              </div>
              <span style={{ fontSize: '0.75rem', color: colors.brown[600] }}>
                Day of the month rent is due for every tenant here.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p style={s.sectionTitle}><Building2 size={16} /> Unit types</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {unitTypes.map((ut, i) => (
            <div key={i} style={s.unitTypeCard}>
              <div style={s.unitTypeRow}>
                <div style={s.fieldGroup}>
                  <span style={s.smallLabel}>Type name</span>
                  <Select value={ut.name} onValueChange={(value) => updateUnitType(i, 'name', value)}>
                    <SelectTrigger data-field="name" className="h-10 w-full bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div style={s.fieldGroup}>
                  <span style={s.smallLabel}>Size (sq.ft, optional)</span>
                  <Input data-field="size_sqft" className="h-10 bg-white" type="number" placeholder="450" value={ut.size_sqft}
                    onChange={(e) => updateUnitType(i, 'size_sqft', e.target.value)} />
                </div>
                <div style={s.fieldGroup}>
                  <span style={s.smallLabel}>Rent (KES)</span>
                  <Input data-field="base_rent" className="h-10 bg-white" type="number" placeholder="25000" value={ut.base_rent}
                    onChange={(e) => updateUnitType(i, 'base_rent', e.target.value)} required />
                </div>
                <div style={s.fieldGroup}>
                  <span style={s.smallLabel}>Max occupants</span>
                  <Input data-field="max_occupants" className="h-10 bg-white" type="number" min={1} value={ut.max_occupants}
                    onChange={(e) => updateUnitType(i, 'max_occupants', e.target.value)} />
                </div>
                <div style={s.fieldGroup}>
                  <span style={s.smallLabel}># of units</span>
                  <Input data-field="count" className="h-10 bg-white" type="number" placeholder="4" value={ut.count}
                    onChange={(e) => updateUnitType(i, 'count', e.target.value)} required />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUnitType(i)}
                  disabled={unitTypes.length === 1}
                  className="text-[#a0622a]"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
          <button type="button" style={s.addBtn} onClick={addUnitType}>
            <Plus size={16} /> Add another unit type
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full bg-[#a0622a] text-white hover:bg-[#8a5424]"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Setting up your building…
          </>
        ) : (
          'Create Building'
        )}
      </Button>
    </form>
  )
}
