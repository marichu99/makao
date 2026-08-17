import { useEffect, useState } from 'react'
import { Receipt, Wallet, Wrench } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/theme'
import TicketConversationDialog from '@/components/shared/TicketConversationDialog'

const ticketStatusStyles = {
  open: { color: '#9a6211', background: '#fff4de' },
  in_progress: { color: '#8a5a2b', background: '#f5e6d3' },
  resolved: { color: '#287446', background: '#e7f5ec' },
}
const ticketPriorityStyles = {
  low: { color: colors.brown[600], background: colors.cream[100] },
  medium: { color: '#8a5a2b', background: '#f5e6d3' },
  high: { color: '#9a6211', background: '#fff4de' },
  emergency: { color: '#a63d2f', background: '#fbe9e5' },
}

export default function OperationsPage({ type }) {
  const { fetchExpenses, fetchTickets, fetchInvoices } = useAuth()
  const [rows, setRows] = useState(null); const [selectedTicket, setSelectedTicket] = useState(null)
  const config = { expenses: [Wallet, 'Expenses', fetchExpenses, 'expenses'], invoices: [Receipt, 'Invoices', fetchInvoices, 'invoices'], tickets: [Wrench, 'Maintenance', fetchTickets, 'tickets'] }[type]
  const [Icon, title, fetcher, key] = config
  const load = () => fetcher().then((r) => setRows(r[key])).catch(() => setRows([]))
  useEffect(() => { load() }, [type])
  const renderTicket = (ticket) => <Card key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: colors.cream[200] }}><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate" style={{ fontWeight: 800, color: colors.brown[800] }}>{ticket.title}</p><p className="mt-1 text-sm" style={{ color: colors.brown[600] }}>{ticket.building_name} · Unit {ticket.unit_number}</p></div><span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={ticketStatusStyles[ticket.status] || {}}>{ticket.status.replace('_', ' ')}</span></div><p className="line-clamp-2 min-h-10 text-sm" style={{ color: colors.brown[700] }}>{ticket.description || 'No description provided.'}</p><div className="flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: colors.cream[200] }}><div><p className="text-xs" style={{ color: colors.brown[600] }}>Reported by {ticket.raised_by}</p><span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" style={ticketPriorityStyles[ticket.priority] || {}}>{ticket.priority} priority</span></div><span className="text-xs font-semibold" style={{ color: colors.accent }}>View conversation →</span></div></CardContent></Card>
  const renderGeneric = (row) => <Card key={row.id}><CardContent className="flex justify-between gap-3 py-4"><div><strong>{row.category || row.tenant_name}</strong><p className="text-sm">{row.building_name} {row.unit_number ? `· ${row.unit_number}` : ''}</p></div><div className="text-right text-sm">{row.status || `KES ${row.amount ?? row.total_amount}`}<p>{row.due_date || row.incurred_on || ''}</p></div></CardContent></Card>
  return <div className="space-y-5"><div><h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>{title}</h1><p style={{ color: colors.brown[600] }}>{type === 'tickets' ? 'Review requests, update progress, and keep the tenant informed.' : 'Operational records across your portfolio.'}</p></div><div className={type === 'tickets' ? 'grid gap-4 md:grid-cols-2' : 'grid gap-3'}>{rows === null ? <Card><CardContent className="py-10 text-center">Loading…</CardContent></Card> : rows.length === 0 ? <Card><CardContent className="flex items-center gap-3 py-10"><Icon color={colors.accent} /> No {title.toLowerCase()} recorded yet.</CardContent></Card> : rows.map(type === 'tickets' ? renderTicket : renderGeneric)}</div><TicketConversationDialog ticket={selectedTicket} open={Boolean(selectedTicket)} onOpenChange={(next) => { if (!next) setSelectedTicket(null) }} canManage onChanged={load} /></div>
}
