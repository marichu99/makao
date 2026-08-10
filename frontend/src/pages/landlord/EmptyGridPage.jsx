import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/theme'

export default function EmptyGridPage({ icon: Icon, title, message }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>{title}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card style={{ borderColor: colors.cream[200], gridColumn: '1 / -1' }}>
          <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: colors.cream[100] }}
            >
              <Icon size={24} color={colors.accent} />
            </div>
            <p style={{ fontWeight: 700, color: colors.brown[800] }}>Nothing here yet</p>
            <p style={{ color: colors.brown[600], fontSize: '0.9rem', maxWidth: '26rem' }}>{message}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
