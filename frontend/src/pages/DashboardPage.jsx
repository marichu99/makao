import { useEffect, useMemo, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, Wallet, Receipt, Wrench, Menu, FileCheck2, BarChart3, MessageSquareWarning } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/shared/Sidebar'
import OverviewPage from '@/pages/landlord/OverviewPage'
import BuildingsPage from '@/pages/landlord/BuildingsPage'
import TenantsPage from '@/pages/landlord/TenantsPage'
import EmptyGridPage from '@/pages/landlord/EmptyGridPage'
import ApplicationsPage from '@/pages/landlord/ApplicationsPage'
import OperationsPage from '@/pages/landlord/OperationsPage'
import ReportsPage from '@/pages/landlord/ReportsPage'
import InvoicesPage from '@/pages/landlord/InvoicesPage'
import TenantOverviewPage from '@/pages/tenant/OverviewPage'
import TenantPaymentsPage from '@/pages/tenant/PaymentsPage'
import TenantMaintenancePage from '@/pages/tenant/MaintenancePage'
import TenantComplaintsPage from '@/pages/tenant/ComplaintsPage'
import LandlordComplaintsPage from '@/pages/landlord/ComplaintsPage'
import { colors } from '@/theme'

const landlordNavItems = [
  { to: '/dashboard', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/dashboard/buildings', end: false, icon: Building2, label: 'Buildings' },
  { to: '/dashboard/tenants', end: false, icon: Users, label: 'Tenants' },
  { to: '/dashboard/applications', end: false, icon: FileCheck2, label: 'Applications', countKey: 'applications' },
  { to: '/dashboard/expenses', end: false, icon: Wallet, label: 'Expenses' },
  { to: '/dashboard/invoices', end: false, icon: Receipt, label: 'Invoices', countKey: 'invoices' },
  { to: '/dashboard/tickets', end: false, icon: Wrench, label: 'Tickets', countKey: 'tickets' },
  { to: '/dashboard/complaints', end: false, icon: MessageSquareWarning, label: 'Complaints', countKey: 'complaints' },
  { to: '/dashboard/reports', end: false, icon: BarChart3, label: 'Reports' },
]

const tenantNavItems = [
  { to: '/dashboard', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/dashboard/payments', end: false, icon: Wallet, label: 'Payments' },
  { to: '/dashboard/invoices', end: false, icon: Receipt, label: 'Invoices' },
  { to: '/dashboard/tickets', end: false, icon: Wrench, label: 'Maintenance' },
  { to: '/dashboard/complaints', end: false, icon: MessageSquareWarning, label: 'Complaints' },
]

// Shared by both roles: a mobile top bar (hamburger + wordmark, hidden on md+) sits above
// a row containing the sidebar and the routed content. `main` needs min-w-0 — without it,
// a flex child refuses to shrink below its content's intrinsic width, so a wide table
// inside would blow out the whole page's width instead of just scrolling internally.
function DashboardShell({ navItems, userName, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col" style={{ background: colors.cream[50] }}>
      <div
        className="flex items-center justify-between border-b px-4 py-3 md:hidden"
        style={{ borderColor: colors.cream[200], background: colors.white, position: 'sticky', top: 0, zIndex: 30 }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          style={{ background: 'none', border: 'none', color: colors.brown[700], display: 'flex', padding: '0.25rem' }}
        >
          <Menu size={22} />
        </button>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: colors.brown[800] }}>
          Nyum<span style={{ color: colors.accent }}>ba</span>
        </div>
        <div style={{ width: '22px' }} />
      </div>

      <div className="flex flex-1 items-start">
        <Sidebar
          navItems={navItems}
          userName={userName}
          onLogout={onLogout}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="min-w-0 max-w-[1100px] flex-1 p-4 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  )
}

// Pending counts are best-effort UI decoration (sidebar badges), so a failed
// fetch just leaves the badges off rather than blocking the dashboard.
function useLandlordNavItems() {
  const { fetchPendingCounts } = useAuth()
  const [counts, setCounts] = useState({})

  useEffect(() => {
    fetchPendingCounts().then(setCounts).catch(() => {})
  }, [])

  return useMemo(
    () => landlordNavItems.map((item) => (item.countKey ? { ...item, count: counts[item.countKey] } : item)),
    [counts]
  )
}

function LandlordShell({ session, onLogout }) {
  const navItems = useLandlordNavItems()
  return (
    <DashboardShell navItems={navItems} userName={session.user?.full_name} onLogout={onLogout}>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="buildings" element={<BuildingsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="expenses" element={<OperationsPage type="expenses" />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="tickets" element={<OperationsPage type="tickets" />} />
        <Route path="complaints" element={<LandlordComplaintsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Routes>
    </DashboardShell>
  )
}

function TenantShell({ session, onLogout }) {
  return (
    <DashboardShell navItems={tenantNavItems} userName={session.user?.full_name} onLogout={onLogout}>
      <Routes>
        <Route index element={<TenantOverviewPage session={session} />} />
        <Route path="payments" element={<TenantPaymentsPage />} />
        <Route
          path="invoices"
          element={
            <EmptyGridPage
              icon={Receipt}
              title="Invoices"
              message="Rent invoices for your unit will appear here once billing is set up."
            />
          }
        />
        <Route path="tickets" element={<TenantMaintenancePage />} />
        <Route path="complaints" element={<TenantComplaintsPage />} />
      </Routes>
    </DashboardShell>
  )
}

export default function DashboardPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!session) navigate('/login')
  }, [session, navigate])

  if (!session) return null

  const handleLogout = () => { logout(); navigate('/') }

  return session.user?.role === 'landlord' ? (
    <LandlordShell session={session} onLogout={handleLogout} />
  ) : (
    <TenantShell session={session} onLogout={handleLogout} />
  )
}
