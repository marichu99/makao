import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const methods = [{ value: 'mpesa', label: 'M-Pesa' }, { value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank transfer' }]

export default function RecordPaymentDialog({ invoice, open, onOpenChange, onSuccess }) {
  const { recordInvoicePayment } = useAuth()
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState('mpesa')
  const [saving, setSaving] = useState(false)
  if (!invoice) return null
  const submit = async () => {
    setSaving(true)
    try {
      await recordInvoicePayment(invoice.id, { amount: Number(amount), reference, method })
      toast.success('Payment reconciled.')
      setAmount(''); setReference(''); onSuccess?.()
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>{invoice.tenant_name} · balance KES {invoice.balance.toLocaleString()}</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Amount</Label><Input type="number" min="1" max={invoice.balance} value={amount} onChange={(e) => setAmount(e.target.value)} /></div><div><Label>Method</Label><Select value={method} onValueChange={setMethod} items={methods}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{methods.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div><Label>Verified reference</Label><Input placeholder="M-Pesa code, receipt number…" value={reference} onChange={(e) => setReference(e.target.value)} /></div></div><DialogFooter><Button onClick={submit} disabled={saving || !amount || !reference}>{saving ? 'Saving…' : 'Reconcile payment'}</Button></DialogFooter></DialogContent></Dialog>
}
