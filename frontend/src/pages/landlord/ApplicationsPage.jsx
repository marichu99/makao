import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import DataGrid from '@/components/shared/DataGrid'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, MoreVertical, X } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import ApproveApplicationDialog from '@/components/landlord/ApproveApplicationDialog'
import { colors } from '@/theme'

export default function ApplicationsPage() {
  const { fetchApplications, approveApplication, rejectApplication } = useAuth()
  const [applications, setApplications] = useState(null)
  const [approving, setApproving] = useState(null)
  const load = () => fetchApplications().then((r) => setApplications(r.applications)).catch((e) => toast.error(e.message))
  useEffect(() => { load() }, [])
  if (!applications) return <Card><CardContent className="py-10 text-center">Loading applications…</CardContent></Card>
  return <div className="space-y-5"><div><h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>Applications</h1><p style={{ color: colors.brown[600] }}>Review applicants before a tenancy is created.</p></div>
    <DataGrid rows={applications} rowId={(a) => a.id} itemLabel="applications" actionsLabel="Operations" searchKeys={['applicant_name', 'building_name', 'unit_number']} actions={(selectedRows, { clearSelection }) => {
      const pending = selectedRows.filter((application) => application.status === 'submitted')
      const run = async (operation) => {
        if (!pending.length) { toast.info('Select at least one application awaiting review.'); return }
        let completed = 0
        for (const application of pending) {
          try { await operation(application.id); completed += 1 } catch (error) { toast.error(error.message) }
        }
        if (completed) toast.success(`${completed} application${completed === 1 ? '' : 's'} updated.`)
        clearSelection(); load()
      }
      return <>
        <DropdownMenuItem onClick={() => run((id) => approveApplication(id))} style={{ color: colors.accent }}><Check size={14} /> Approve selected (default rent)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run(rejectApplication)} style={{ color: colors.brown[700] }}><X size={14} /> Reject selected</DropdownMenuItem>
      </>
    }} columns={[
      { key: 'applicant_name', header: 'Applicant', render: (a) => <span className="font-semibold">{a.applicant_name}</span> },
      { key: 'home', header: 'Unit', render: (a) => `${a.building_name} · ${a.unit_number}` },
      { key: 'move', header: 'Move-in', render: (a) => a.proposed_move_in_date },
      { key: 'status', header: 'Status', render: (a) => <span style={{ color: a.status === 'submitted' ? '#9a6211' : colors.brown[600], background: a.status === 'submitted' ? '#fff4de' : colors.cream[100] }} className="inline-flex rounded-full px-2 py-1 text-xs font-semibold">{a.status.replace('_', ' ')}</span> },
      { key: 'actions', header: 'Actions', render: (a) => a.status === 'submitted' && <div className="flex gap-1"><Button size="sm" onClick={() => setApproving(a)}><Check size={14} /> Approve</Button><Button size="sm" variant="outline" onClick={async () => { try { await rejectApplication(a.id); toast.success('Application rejected.'); load() } catch (error) { toast.error(error.message) } }}><X size={14} /></Button></div> },
    ]} />
    <ApproveApplicationDialog application={approving} open={Boolean(approving)} onOpenChange={(next) => { if (!next) setApproving(null) }} onSuccess={() => { setApproving(null); load() }} />
  </div>
}
