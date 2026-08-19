import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ApproveApplicationDialog({ application, open, onOpenChange, onSuccess }) {
  const { approveApplication } = useAuth()
  const [initialRent, setInitialRent] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (application) setInitialRent(String(application.unit_rent ?? '')) }, [application?.id])
  if (!application) return null

  const submit = async () => {
    setSaving(true)
    try {
      await approveApplication(application.id, { initial_rent: Number(initialRent) })
      toast.success('Application approved.')
      onSuccess?.()
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve application</DialogTitle>
          <DialogDescription>
            {application.applicant_name} · {application.building_name} · Unit {application.unit_number} · Move-in {application.proposed_move_in_date}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Initial rent</Label>
            <Input type="number" min="1" step="0.01" value={initialRent} onChange={(e) => setInitialRent(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              Defaults to the unit's normal rent (KES {application.unit_rent?.toLocaleString()}). Only applies if this
              move-in doesn't leave a full month before the building's next rent due date — otherwise billing follows
              the normal monthly cycle automatically.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || !initialRent} className="bg-[#a0622a] text-white hover:bg-[#8a5424]">
            {saving ? 'Approving…' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
