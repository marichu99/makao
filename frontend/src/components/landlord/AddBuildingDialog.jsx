import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import BuildingOnboardingForm from '@/components/landlord/BuildingOnboardingForm'
import { colors } from '@/theme'

export default function AddBuildingDialog({ open, onOpenChange, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ color: colors.brown[800] }}>Add a building</DialogTitle>
          <DialogDescription>Configure its unit types — Nyumba will generate the units for you.</DialogDescription>
        </DialogHeader>
        <BuildingOnboardingForm
          onSuccess={(building) => {
            onOpenChange(false)
            onSuccess?.(building)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
