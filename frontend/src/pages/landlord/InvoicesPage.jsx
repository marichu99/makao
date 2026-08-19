import { useEffect, useState } from 'react'
import { Bell, CreditCard, Download, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import DataGrid from '@/components/shared/DataGrid'
import RecordPaymentDialog from '@/components/landlord/RecordPaymentDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { colors } from '@/theme'

const money = (value) => `KES ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const statusStyle = { paid: { background: '#e7f5ec', color: '#287446' }, overdue: { background: '#fdeceb', color: '#ba3128' }, partially_paid: { background: '#fff4de', color: '#9a6211' }, pending: { background: '#f2ede5', color: '#6c5644' } }

export default function InvoicesPage() {
  const { fetchInvoices, sendInvoiceReminder, fetchPaymentReceiptUrl } = useAuth()
  const [invoices, setInvoices] = useState(null); const [paymentInvoice, setPaymentInvoice] = useState(null)
  const load = () => fetchInvoices().then((r) => setInvoices(r.invoices)).catch((e) => toast.error(e.message))
  const downloadReceipt = async (paymentId) => {
    try { const { url } = await fetchPaymentReceiptUrl(paymentId); window.open(url, '_blank') } catch (error) { toast.error(error.message) }
  }
  useEffect(() => { load() }, [])
  return <div className="space-y-5"><div><h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>Invoices</h1><p style={{ color: colors.brown[600] }}>Reconcile collections and follow up outstanding rent.</p></div>{invoices === null ? <p>Loading invoices…</p> : <DataGrid rows={invoices} rowId={(i) => i.id} itemLabel="invoices" onReload={load} searchPlaceholder="Search tenant, building, or unit" searchKeys={['tenant_name', 'building_name', 'unit_number']} columns={[
    { key: 'tenant', header: 'Tenant / unit', render: (i) => <div><strong>{i.tenant_name}</strong><p className="text-xs">{i.building_name} · {i.unit_number}</p></div> },
    { key: 'period', header: 'Period', render: (i) => new Date(`${i.period_start}T00:00:00`).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) },
    { key: 'total', header: 'Total', render: (i) => money(i.total_amount) },
    { key: 'paid', header: 'Paid', render: (i) => money(i.paid_amount) },
    { key: 'balance', header: 'Balance', render: (i) => <strong style={{ color: i.balance ? colors.error : colors.success }}>{money(i.balance)}</strong> },
    { key: 'due', header: 'Due', render: (i) => i.due_date },
    { key: 'status', header: 'Status', render: (i) => <Badge style={statusStyle[i.status]}>{i.status.replace('_', ' ')}</Badge> },
    { key: 'actions', header: 'Actions', render: (i) => <div className="flex gap-1">{i.balance > 0 && <Button size="sm" onClick={() => setPaymentInvoice(i)}><CreditCard /> Record</Button>}{i.balance > 0 && <Button size="sm" variant="outline" title="Send reminder" onClick={async () => { try { const result = await sendInvoiceReminder(i.id); toast.success(result.delivery === 'email' ? 'Reminder emailed.' : 'Reminder saved; tenant has no email.'); load() } catch (error) { toast.error(error.message) } }}><Bell /></Button>}{i.payments.length > 0 && <span title={i.payments.map((p) => `${p.method}: ${p.reference}`).join(', ')}><ReceiptText size={16} /></span>}{(() => { const receiptPayment = [...i.payments].reverse().find((p) => p.has_receipt); return receiptPayment && <Button size="sm" variant="outline" title="Download receipt" onClick={() => downloadReceipt(receiptPayment.id)}><Download /></Button> })()}</div> },
  ]} />}<RecordPaymentDialog invoice={paymentInvoice} open={Boolean(paymentInvoice)} onOpenChange={(open) => { if (!open) setPaymentInvoice(null) }} onSuccess={() => { setPaymentInvoice(null); load() }} /></div>
}
