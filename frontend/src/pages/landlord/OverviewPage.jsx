import { useEffect, useState } from 'react'
import { Building2, Home, Percent, Wallet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/theme'

function StatTile({ icon: Icon, label, value }) {
  return (
    <Card style={{ borderColor: colors.cream[200] }}>
      <CardContent className="py-5">
        <div className="mb-3 flex items-center justify-between">
          <span style={{ fontSize: '0.8rem', color: colors.brown[600], fontWeight: 600 }}>{label}</span>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: colors.cream[100] }}
          >
            <Icon size={15} color={colors.accent} />
          </div>
        </div>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: colors.brown[800] }}>{value}</p>
      </CardContent>
    </Card>
  )
}

export default function OverviewPage() {
  const { session, fetchOverviewStats } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchOverviewStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  // A brand-new landlord has zero buildings — keep the placeholder look until there's
  // something real to show, rather than displaying a wall of zeroes.
  const hasData = Boolean(stats?.buildings_count)

  const stat = [
    { icon: Building2, label: 'Buildings', value: hasData ? stats.buildings_count : '—' },
    { icon: Home, label: 'Units', value: hasData ? stats.units_count : '—' },
    {
      icon: Percent,
      label: 'Occupancy',
      value: hasData && stats.occupancy_rate !== null ? `${stats.occupancy_rate}%` : '—',
    },
    // No invoicing/payments module yet, so this stays a placeholder regardless of data.
    { icon: Wallet, label: 'Monthly collections (KES)', value: '—' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>
          Welcome back, {session?.user?.full_name?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: '0.9rem', color: colors.brown[600] }}>
          Here's where your portfolio analytics will live.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat.map((s) => (
          <StatTile key={s.label} {...s} />
        ))}
      </div>

      <Card style={{ borderColor: colors.cream[200] }}>
        <CardContent className="py-10 text-center">
          <p style={{ color: colors.brown[600], fontSize: '0.9rem' }}>
            {hasData
              ? 'Arrears and collections trends will appear here once tenants and payments start flowing through Nyumba.'
              : 'Occupancy, arrears, and collections trends will appear here once tenants and payments start flowing through Nyumba. Set up your building to get started.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
