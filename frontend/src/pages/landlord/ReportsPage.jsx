import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/theme'

export default function ReportsPage() {
  const { fetchPortfolioReport } = useAuth(); const [report, setReport] = useState(null)
  useEffect(() => { fetchPortfolioReport().then(setReport).catch(() => setReport({})) }, [])
  if (!report) return <Card><CardContent className="py-10 text-center">Loading portfolio report…</CardContent></Card>
  const tiles = [['Expected rent', report.expected_rent], ['Collected', report.collected], ['Arrears', report.arrears], ['Net cash flow', report.net_cash_flow]]
  return <div className="space-y-5"><h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.brown[800] }}>Portfolio report</h1><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{tiles.map(([label, value]) => <Card key={label}><CardContent className="py-5"><p className="text-sm" style={{ color: colors.brown[600] }}>{label}</p><strong style={{ color: colors.brown[800], fontSize: '1.4rem' }}>KES {(value || 0).toLocaleString()}</strong></CardContent></Card>)}</div></div>
}
