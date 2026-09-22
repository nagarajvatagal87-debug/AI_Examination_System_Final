import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import './ExamDeptLayout.css'

const NAV_ITEMS = [
  { to: '/examdept', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/examdept/examinations', label: 'Main Examinations', icon: '📝' },
  { to: '/examdept/evaluation', label: 'Evaluation', icon: '🤖' },
  { to: '/examdept/results', label: 'Results', icon: '📊' },
  { to: '/examdept/notifications', label: 'Notifications', icon: '🔔' },
]

export default function ExamDeptLayout() {
  const { user, logout } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <HeaderBanner />

      <div className="ed-wrap" style={{ flex: 1 }}>
        <aside className="ed-sidebar glass-card" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
          <div className="ed-brand">
            <div className="ed-logo">⚖️</div>
            <div className="ed-brand-text">Exam Department<br /><span style={{ fontSize: 11, color: 'var(--text-sub)' }}>Main Exam Authority</span></div>
          </div>

          <div className="ed-profile">
            <div className="ed-avatar" style={{ overflow: 'hidden', padding: 0 }}>
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.fullName?.[0] || 'E')}
            </div>
            <div className="ed-profile-name">{user?.fullName || 'Mr. Suresh Rao'}</div>
            <div className="ed-profile-role">Main Examination Authority</div>
            <div className="ed-online"><span className="ed-dot" /> Online</div>
          </div>

          <nav className="ed-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `ed-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="ed-nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button className="ed-logout" onClick={logout}>🚪 Logout</button>
        </aside>

        <div className="ed-main">
          <header className="ed-topbar glass-card" style={{ margin: '20px 24px 0', padding: '14px 24px', borderRadius: 14 }}>
            <div className="ed-topbar-title">Main Examination Control Centre</div>
            <div className="ed-topbar-actions">
              <NotificationBell />
              <span className="ed-topbar-name">{user?.fullName || 'Mr. Suresh Rao'}</span>
            </div>
          </header>
          <main className="ed-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}