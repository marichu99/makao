import { useEffect, useState } from 'react'
import { AlertCircle, Send, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import TicketConversationDialog from '@/components/shared/TicketConversationDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { colors } from '@/theme'

const priorities = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'emergency', label: 'Emergency' }]
const statusColors = { open: { color: '#9a6211', background: '#fff4de' }, in_progress: { color: '#8a5a2b', background: '#f5e6d3' }, resolved: { color: '#287446', background: '#e7f5ec' } }

export default function MaintenancePage() {
  const { fetchMyTenancies, fetchTickets, createTicket } = useAuth()
  const [tenancies, setTenancies] = useState([]); const [tickets, setTickets] = useState([]); const [loading, setLoading] = useState(true)
  const [unitId, setUnitId] = useState(''); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [priority, setPriority] = useState('medium'); const [saving, setSaving] = useState(false); const [selectedTicket, setSelectedTicket] = useState(null)
  const load = async () => { try { const [units, requests] = await Promise.all([fetchMyTenancies(), fetchTickets()]); setTenancies(units); setTickets(requests.tickets) } catch (error) { toast.error(error.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!unitId && tenancies[0]) setUnitId(tenancies[0].unit_id) }, [tenancies, unitId])
  const submit = async (event) => { event.preventDefault(); if (!unitId || !title.trim() || !description.trim()) return; setSaving(true); try { await createTicket({ unit_id: unitId, title: title.trim(), description: description.trim(), priority }); toast.success('Maintenance request submitted.'); setTitle(''); setDescription(''); setPriority('medium'); await load() } catch (error) { toast.error(error.message) } finally { setSaving(false) } }
  return <div className="space-y-5"><div><h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>Maintenance</h1><p style={{ color: colors.brown[600] }}>Report a problem and track your landlord’s response.</p></div>
    <Card style={{ borderColor: colors.cream[200] }}><CardHeader><CardTitle style={{ color: colors.brown[800], fontSize: '1rem' }}>Lodge a maintenance request</CardTitle><CardDescription>Describe the problem clearly so it can be assigned and resolved quickly.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}>
      {tenancies.length === 0 && !loading && <div className="flex items-center gap-2 rounded-lg border p-3 text-sm" style={{ color: colors.brown[600], borderColor: colors.cream[200] }}><AlertCircle size={16} /> You need an approved tenancy before lodging a request.</div>}
      {tenancies.length > 0 && <div><Label>Unit</Label><Select value={unitId} onValueChange={setUnitId} items={tenancies.map((t) => ({ value: t.unit_id, label: `${t.building_name} · Unit ${t.unit_number}` }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{tenancies.map((t) => <SelectItem key={t.unit_id} value={t.unit_id}>{t.building_name} · Unit {t.unit_number}</SelectItem>)}</SelectContent></Select></div>}
      <div><Label>Issue title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Leaking kitchen tap" maxLength={150} /></div><div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell your landlord what happened and where…" maxLength={1000} rows={4} /></div><div><Label>Priority</Label><Select value={priority} onValueChange={setPriority} items={priorities}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{priorities.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div><Button type="submit" disabled={saving || !unitId || !title.trim() || !description.trim()} className="bg-[#a0622a] text-white hover:bg-[#8a5424]"><Send size={15} /> {saving ? 'Submitting…' : 'Submit request'}</Button>
    </form></CardContent></Card>
    <Card style={{ borderColor: colors.cream[200] }}><CardHeader><CardTitle style={{ color: colors.brown[800], fontSize: '1rem' }}>Your requests</CardTitle><CardDescription>Click a request to view the conversation and add updates.</CardDescription></CardHeader><CardContent>{loading ? <p>Loading requests…</p> : tickets.length === 0 ? <div className="flex items-center gap-3 py-5" style={{ color: colors.brown[600] }}><Wrench size={18} color={colors.accent} /> No maintenance requests yet.</div> : <div className="space-y-3">{tickets.map((ticket) => <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="cursor-pointer rounded-xl border p-4 transition-shadow hover:shadow-md" style={{ borderColor: colors.cream[200] }}><div className="flex flex-wrap items-start justify-between gap-2"><div><p style={{ fontWeight: 700, color: colors.brown[800] }}>{ticket.title}</p><p className="text-sm" style={{ color: colors.brown[600] }}>{ticket.building_name} · Unit {ticket.unit_number}</p></div><Badge style={statusColors[ticket.status] || {}}>{ticket.status.replace('_', ' ')}</Badge></div><p className="mt-3 text-sm" style={{ color: colors.brown[700] }}>{ticket.description}</p><p className="mt-2 text-xs" style={{ color: colors.brown[600] }}>Priority: {ticket.priority} · Click to view conversation</p></div>)}</div>}</CardContent></Card>
    <TicketConversationDialog ticket={selectedTicket} open={Boolean(selectedTicket)} onOpenChange={(next) => { if (!next) setSelectedTicket(null) }} onChanged={load} />
  </div>
}
