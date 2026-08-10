import { useEffect, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { colors } from '@/theme'

export default function EditBuildingDialog({ open, onOpenChange, building, onSuccess }) {
  const { updateBuilding } = useAuth()
  const [form, setForm] = useState({ name: '', location: '', year_built: '', total_floors: '', rent_due_day: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (building) {
      setForm({
        name: building.name || '',
        location: building.location || '',
        year_built: building.year_built ?? '',
        total_floors: building.total_floors ?? '',
        rent_due_day: building.rent_due_day ?? '',
      })
      setError('')
    }
  }, [building, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const updated = await updateBuilding(building.id, {
        name: form.name,
        location: form.location,
        year_built: form.year_built ? Number(form.year_built) : null,
        total_floors: form.total_floors ? Number(form.total_floors) : null,
        rent_due_day: form.rent_due_day ? Number(form.rent_due_day) : null,
      })
      onOpenChange(false)
      onSuccess?.(updated)
    } catch (err) {
      setError(err.message || 'Could not update building.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: colors.brown[800] }}>Edit building</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label>Building name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Year built</Label>
              <Input type="number" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Total floors</Label>
              <Input type="number" value={form.total_floors} onChange={(e) => setForm({ ...form, total_floors: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Rent due day</Label>
            <Input
              type="number"
              min={1}
              max={28}
              value={form.rent_due_day}
              onChange={(e) => setForm({ ...form, rent_due_day: e.target.value })}
            />
            <p style={{ fontSize: '0.75rem', color: colors.brown[600] }}>
              Day of the month rent is due for every tenant here.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="bg-[#a0622a] text-white hover:bg-[#8a5424]">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
