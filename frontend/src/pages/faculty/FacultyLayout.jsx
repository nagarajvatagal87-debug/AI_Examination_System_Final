import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import './FacultyLayout.css'

const NAV_ITEMS = [
  { to: '/faculty', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/faculty/subjects', label: 'My Subjects', icon: '📚' },
  { to: '/faculty/examinations', label: 'Examinations', icon: '📝' },
  { to: '/faculty/evaluation', label: 'AI Evaluation', icon: '🤖' },
  { to: '/faculty/results', label: 'Results', icon: '📊' },
  { to: '/faculty/analytics', label: 'Analytics', icon: '📈' },
  { to: '/faculty/complaints', label: 'Complaints', icon: '💬' },
  { to: '/faculty/messages', label: 'HOD Messages', icon: '📩' },
  { to: '/faculty/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/faculty/settings', label: 'Settings', icon: '⚙️' },
]

export default function FacultyLayout() {
  const { user, logout } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <HeaderBanner />

      <div className="fl-wrap" style={{ flex: 1 }}>
        <aside className="fl-sidebar glass-card" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
          <div className="fl-brand">
            <div className="fl-logo">🛡️</div>
            <div className="fl-brand-text">Faculty Portal<br /><span style={{ fontSize: 11, color: 'var(--text-sub)' }}>Academic LMS & AI</span></div>
          </div>

          <div className="fl-profile">
            <div className="fl-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : (user?.fullName?.[0] || 'F')}
            </div>
            <div className="fl-profile-name">{user?.fullName || 'Dr. Priya Sharma'}</div>
            <div className="fl-profile-role">Assistant Professor · {user?.departmentName || 'MCA'}</div>
            <div className="fl-online"><span className="fl-dot" /> Online</div>
          </div>

          <nav className="fl-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `fl-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="fl-nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button className="fl-logout" onClick={logout}>🚪 Logout</button>
        </aside>

        <div className="fl-main">
          <header className="fl-topbar glass-card" style={{ margin: '20px 24px 0', padding: '14px 24px', borderRadius: 14 }}>
            <div className="fl-topbar-title">Faculty Execution Workspace</div>
            <div className="fl-topbar-actions">
              <NotificationBell />
              <span className="fl-topbar-name">{user?.fullName || 'Dr. Priya Sharma'}</span>
            </div>
          </header>

          <main className="fl-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}