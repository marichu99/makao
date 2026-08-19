import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const methods = [{ value: 'mpesa', label: 'M-Pesa' }, { value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank transfer' }]

export default function RecordDepositDialog({ tenant, open, onOpenChange, onSuccess }) {
  const { recordDepositPayment } = useAuth()
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState('mpesa')
  const [saving, setSaving] = useState(false)
  if (!tenant) return null
  const balance = Math.max(0, (tenant.deposit_amount || 0) - (tenant.deposit_paid || 0))
  const submit = async () => {
    setSaving(true)
    try {
      await recordDepositPayment(tenant.id, { amount: Number(amount), reference: reference || undefined, method })
      toast.success('Deposit payment recorded.')
      setAmount(''); setReference(''); onSuccess?.()
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Record deposit payment</DialogTitle><DialogDescription>{tenant.tenant_name} · outstanding deposit KES {balance.toLocaleString()}</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Amount</Label><Input type="number" min="1" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} /></div><div><Label>Method</Label><Select value={method} onValueChange={setMethod} items={methods}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{methods.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div><Label>Reference (optional)</Label><Input placeholder="M-Pesa code, receipt number…" value={reference} onChange={(e) => setReference(e.target.value)} /></div></div><DialogFooter><Button onClick={submit} disabled={saving || !amount} className="bg-[#a0622a] text-white hover:bg-[#8a5424]">{saving ? 'Saving…' : 'Record deposit'}</Button></DialogFooter></DialogContent></Dialog>
}
