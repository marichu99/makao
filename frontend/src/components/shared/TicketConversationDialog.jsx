import { useEffect, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { colors } from '@/theme'

const statuses = [{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In progress' }, { value: 'resolved', label: 'Resolved' }]
const statusStyle = { open: { color: '#9a6211', background: '#fff4de' }, in_progress: { color: '#8a5a2b', background: '#f5e6d3' }, resolved: { color: '#287446', background: '#e7f5ec' } }

export default function TicketConversationDialog({ ticket, open, onOpenChange, canManage = false, onChanged }) {
  const { fetchTicketComments, addTicketComment, updateTicket } = useAuth()
  const [comments, setComments] = useState([]); const [body, setBody] = useState(''); const [status, setStatus] = useState(ticket?.status || 'open'); const [sending, setSending] = useState(false)
  useEffect(() => { if (!open || !ticket) return; setStatus(ticket.status); fetchTicketComments(ticket.id).then((r) => setComments(r.comments)).catch((e) => toast.error(e.message)) }, [open, ticket?.id])
  if (!ticket) return null
  const sendComment = async () => { if (!body.trim()) return; setSending(true); try { const comment = await addTicketComment(ticket.id, body.trim()); setComments((current) => [...current, comment]); setBody('') } catch (e) { toast.error(e.message) } finally { setSending(false) } }
  const changeStatus = async (nextStatus) => { setStatus(nextStatus); try { await updateTicket(ticket.id, { status: nextStatus }); toast.success('Ticket status updated.'); onChanged?.() } catch (e) { setStatus(ticket.status); toast.error(e.message) } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-full max-w-xl"><DialogHeader><div className="flex items-start justify-between gap-3 pr-5"><div><DialogTitle style={{ color: colors.brown[800] }}>{ticket.title}</DialogTitle><DialogDescription>{ticket.building_name} · Unit {ticket.unit_number} · Raised by {ticket.raised_by}</DialogDescription></div><Badge style={statusStyle[status]}>{status.replace('_', ' ')}</Badge></div></DialogHeader><div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border p-3" style={{ borderColor: colors.cream[200], background: colors.cream[50] }}>{comments.length === 0 ? <div className="flex flex-col items-center gap-2 py-8 text-center" style={{ color: colors.brown[600] }}><MessageCircle size={22} color={colors.accent} /><p>No updates yet. Start the conversation.</p></div> : comments.map((comment) => <div key={comment.id} className={`flex ${comment.author_role === 'tenant' ? 'justify-start' : 'justify-end'}`}><div className="max-w-[85%] rounded-2xl border px-3 py-2" style={{ background: comment.author_role === 'tenant' ? '#fff' : '#f5e6d3', borderColor: colors.cream[200] }}><p className="mb-1 text-xs font-semibold" style={{ color: colors.brown[700] }}>{comment.author_name} · {new Date(comment.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</p><p className="whitespace-pre-wrap text-sm" style={{ color: colors.brown[800] }}>{comment.body}</p></div></div>)}</div>{canManage && <div><Label>Status</Label><Select value={status} onValueChange={changeStatus} items={statuses}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>}<div><Label>Add update</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe what happened, what was done, or what happens next…" rows={3} /></div><DialogFooter><Button onClick={sendComment} disabled={sending || !body.trim()} className="bg-[#a0622a] text-white hover:bg-[#8a5424]"><Send size={15} /> {sending ? 'Sending…' : 'Add update'}</Button></DialogFooter></DialogContent></Dialog>
}
