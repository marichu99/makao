import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { colors } from '@/theme'

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
]

// Accepts one or more unpaid invoices (a single row's "Pay rent" or a bulk
// selection) and settles each of them with the same method/reference.
export default function PayRentDialog({ open, onOpenChange, invoices, tenantHasEmail, onSuccess }) {
  const { payInvoice } = useAuth()
  const [method, setMethod] = useState('mpesa')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!invoices || invoices.length === 0) return null

  const total = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        invoices.map((inv) => payInvoice(inv.id, { method, reference: reference || undefined }))
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      setReference('')
      setMethod('mpesa')
      onSuccess?.({ paid: invoices.length - failed, failed })
    } catch (err) {
      setError(err.message || 'Could not record this payment.')
    } finally {
      setSubmitting(false)
    }
  }

  const title = invoices.length > 1 ? `Pay ${invoices.length} invoices` : `Pay rent — ${invoices[0].period_label}`
  const description =
    invoices.length > 1
      ? invoices.map((i) => i.period_label).join(', ') + ` · KES ${total.toLocaleString()} total`
      : `Unit ${invoices[0].unit_number} — ${invoices[0].building_name} · KES ${invoices[0].total_amount.toLocaleString()}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: colors.brown[800] }}>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod} items={METHODS}>
              <SelectTrigger className="h-10 w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reference (optional)</Label>
            <Input
              placeholder="M-Pesa code, receipt no., etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <p style={{ fontSize: '0.8rem', color: colors.brown[600] }}>
            {tenantHasEmail
              ? `A receipt will be emailed to you for each payment recorded.`
              : 'Add an email to your account to receive receipts by email.'}
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#a0622a] text-white hover:bg-[#8a5424]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirm payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
