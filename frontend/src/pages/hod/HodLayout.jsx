import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import './HodLayout.css'

const NAV_ITEMS = [
  { to: '/hod', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/hod/faculty', label: 'Faculty Management', icon: '👨‍🏫' },
  { to: '/hod/internal-results', label: 'Internal Results', icon: '📊' },
  { to: '/hod/main-exam', label: 'Main Exam Analytics', icon: '📈' },
  { to: '/hod/subject-pass-rates', label: 'Subject Pass Rates', icon: '📉' },
  { to: '/hod/activity', label: 'Recent Activity', icon: '🕒' },
  { to: '/hod/messages', label: 'Messages', icon: '💬' },
  { to: '/hod/public-info', label: 'Public Info', icon: '🌐' },
  { to: '/hod/notifications', label: 'Notifications', icon: '🔔' },
]

export default function HodLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="hl-wrap">
      <aside className="hl-sidebar">
        <div className="hl-brand">
          <div className="hl-logo">👩‍💼</div>
          <div className="hl-brand-text">AI Examination<br />System</div>
        </div>

        <div className="hl-profile">
          <div className="hl-avatar">{user?.fullName?.[0] || 'H'}</div>
          <div className="hl-profile-name">{user?.fullName || 'HOD'}</div>
          <div className="hl-profile-role">Head of Department</div>
          <div className="hl-online"><span className="hl-dot" /> Online</div>
        </div>

        <nav className="hl-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `hl-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="hl-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="hl-logout" onClick={logout}>🚪 Logout</button>
      </aside>

      <div className="hl-main">
        <header className="hl-topbar">
          <div className="hl-topbar-title">HOD Dashboard</div>
          <div className="hl-topbar-actions">
            <NotificationBell />
            <span className="hl-topbar-name">{user?.fullName}</span>
          </div>
        </header>
        <main className="hl-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}