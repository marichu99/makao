import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { colors } from '@/theme'

const s = {
  aside: (collapsed) => ({
    width: collapsed ? '72px' : '240px',
    flexShrink: 0,
    minHeight: '100vh',
    background: colors.white,
    borderRight: `1px solid ${colors.cream[200]}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    transition: 'width 0.15s ease, transform 0.2s ease',
  }),
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: colors.brown[800],
    padding: '0 0.5rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  logoAccent: { color: colors.accent },
  collapseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.brown[400],
    padding: '0.3rem',
    borderRadius: '6px',
    flexShrink: 0,
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  link: (active, collapsed) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: '0.7rem',
    padding: collapsed ? '0.6rem' : '0.6rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: active ? 700 : 500,
    color: active ? colors.accent : colors.brown[700],
    background: active ? 'rgba(160, 98, 42, 0.08)' : 'transparent',
    textDecoration: 'none',
  }),
  linkLabel: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  countBadge: {
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    borderRadius: '999px',
    background: colors.error,
    color: colors.white,
    fontSize: '0.7rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  countDot: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: colors.error,
  },
  footer: {
    marginTop: 'auto',
    borderTop: `1px solid ${colors.cream[200]}`,
    paddingTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  userName: {
    fontSize: '0.85rem',
    color: colors.brown[700],
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.brown[400],
    display: 'flex',
    padding: '0.3rem',
    borderRadius: '6px',
    flexShrink: 0,
  },
}

// On mobile this renders as a slide-in drawer controlled by `mobileOpen`/`onMobileClose`
// (with a tap-to-dismiss backdrop); on md+ screens it's the usual sticky inline sidebar
// with its own collapse-to-icons toggle.
export default function Sidebar({ navItems, userName, onLogout, mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onMobileClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 overflow-y-auto transition-transform duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={s.aside(collapsed)}
      >
        <div style={s.header}>
          {!collapsed && (
            <div style={s.logo}>
              Nyum<span style={s.logoAccent}>ba</span>
            </div>
          )}
          <button
            style={s.collapseBtn}
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav style={s.nav}>
          {navItems.map(({ to, end, icon: Icon, label, count }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed && count ? `${label} (${count} pending)` : collapsed ? label : undefined}
              onClick={onMobileClose}
              style={({ isActive }) => s.link(isActive, collapsed)}
            >
              <Icon size={17} />
              {!collapsed && <span style={s.linkLabel}>{label}</span>}
              {!!count && (collapsed ? <span style={s.countDot} /> : <span style={s.countBadge}>{count}</span>)}
            </NavLink>
          ))}
        </nav>

        <div style={s.footer}>
          {!collapsed && <span style={s.userName}>{userName}</span>}
          <button style={s.logoutBtn} onClick={onLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  )
}
