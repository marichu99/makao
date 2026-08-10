import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { colors } from '@/theme'

const NOTICE_TYPES = [
  { value: 'reminder', label: 'Rent reminder' },
  { value: 'arrears', label: 'Arrears warning' },
  { value: 'general', label: 'General notice' },
]

const TEMPLATES = {
  reminder: {
    subject: 'Friendly rent reminder',
    message: 'This is a quick reminder that your rent for this month is due. Please make your payment at your earliest convenience.',
  },
  arrears: {
    subject: 'Rent arrears notice',
    message: 'Our records show your rent is overdue. Please settle the outstanding balance as soon as possible to avoid further action.',
  },
  general: {
    subject: '',
    message: '',
  },
}

// Accepts one or more tenants (from a single-row action or a bulk selection) and
// emails the same notice to each of them.
export default function SendNoticeDialog({ open, onOpenChange, tenants, onSuccess }) {
  const { sendTenantNotice } = useAuth()
  const [noticeType, setNoticeType] = useState('reminder')
  const [subject, setSubject] = useState(TEMPLATES.reminder.subject)
  const [message, setMessage] = useState(TEMPLATES.reminder.message)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!tenants || tenants.length === 0) return null

  const reachable = tenants.filter((t) => t.tenant_email)
  const unreachable = tenants.filter((t) => !t.tenant_email)

  const handleTypeChange = (type) => {
    setNoticeType(type)
    setSubject(TEMPLATES[type].subject)
    setMessage(TEMPLATES[type].message)
  }

  const handleSubmit = async () => {
    setError('')
    if (!subject.trim() || !message.trim()) {
      setError('Add a subject and message before sending.')
      return
    }
    setSubmitting(true)
    try {
      const results = await Promise.allSettled(
        reachable.map((t) => sendTenantNotice(t.id, { notice_type: noticeType, subject, message }))
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      onSuccess?.({ sent: reachable.length - failed, failed, tenants })
    } catch (err) {
      setError(err.message || 'Could not send this notice.')
    } finally {
      setSubmitting(false)
    }
  }

  const title = tenants.length > 1 ? `Send a notice to ${tenants.length} tenants` : 'Send a notice'
  const description =
    tenants.length > 1
      ? tenants.map((t) => t.tenant_name).join(', ')
      : `To ${tenants[0].tenant_name} — Unit ${tenants[0].unit_number}, ${tenants[0].building_name}`

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          handleTypeChange('reminder')
          setError('')
        }
      }}
    >
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
            <Label>Notice type</Label>
            <Select value={noticeType} onValueChange={handleTypeChange} items={NOTICE_TYPES}>
              <SelectTrigger className="h-10 w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Notice subject" />
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the notice message…"
            />
          </div>

          <p style={{ fontSize: '0.8rem', color: colors.brown[600] }}>
            {reachable.length > 0
              ? `This will be emailed to ${reachable.length} tenant${reachable.length > 1 ? 's' : ''}.`
              : 'None of the selected tenants have an email on file.'}
            {unreachable.length > 0 && reachable.length > 0 && (
              <> {unreachable.length} of the selected tenant{unreachable.length > 1 ? 's have' : ' has'} no email and will be skipped.</>
            )}
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || reachable.length === 0}
            className="w-full bg-[#a0622a] text-white hover:bg-[#8a5424]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Send notice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
