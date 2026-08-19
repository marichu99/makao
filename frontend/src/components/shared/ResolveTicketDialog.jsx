import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ResolveTicketDialog({ ticket, open, onOpenChange, onSuccess, onCancel }) {
  const { resolveTicket } = useAuth()
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [saving, setSaving] = useState(false)
  if (!ticket) return null

  const submit = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      if (amount) formData.append('amount_spent', amount)
      if (receipt) formData.append('receipt', receipt)
      await resolveTicket(ticket.id, formData)
      toast.success('Ticket resolved.')
      setAmount(''); setReceipt(null)
      onSuccess?.()
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel?.(); onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve ticket</DialogTitle>
          <DialogDescription>{ticket.title} — log any cost spent fixing this before closing it out.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount spent (optional)</Label>
            <Input type="number" min="0" step="0.01" placeholder="KES" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Receipt (optional)</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="bg-[#a0622a] text-white hover:bg-[#8a5424]">
            {saving ? 'Resolving…' : 'Resolve ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
