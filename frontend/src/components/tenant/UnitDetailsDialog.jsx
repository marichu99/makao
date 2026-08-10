import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { colors } from '@/theme'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 last:border-b-0" style={{ borderColor: colors.cream[200] }}>
      <span style={{ fontSize: '0.85rem', color: colors.brown[600] }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.brown[800] }}>{value}</span>
    </div>
  )
}

export default function UnitDetailsDialog({ open, onOpenChange, tenancy }) {
  if (!tenancy) return null
  const d = tenancy.unit_details || {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: colors.brown[800] }}>
            Unit {tenancy.unit_number} — {tenancy.building_name}
          </DialogTitle>
          <DialogDescription>{tenancy.building_location}</DialogDescription>
        </DialogHeader>

        <div>
          <Row label="Unit type" value={d.unit_type_name || '—'} />
          <Row label="Size" value={d.size_sqft ? `${d.size_sqft} sq ft` : 'Not specified'} />
          <Row label="Floor" value={d.floor ?? 'Ground / not specified'} />
          <Row label="Max occupants" value={d.max_occupants ?? '—'} />
          <Row label="Monthly rent" value={`KES ${tenancy.monthly_rent.toLocaleString()}`} />
          <Row label="Deposit paid" value={`KES ${tenancy.deposit_amount.toLocaleString()}`} />
          <Row label="Tenancy status" value={tenancy.status.replace('_', ' ')} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
