import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import '../student/StudentDashboard.css'
import './ExamDeptLayout.css'

const NAV_ITEMS = [
  { to: '/examdept', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/examdept/examinations', label: 'Main Examinations', icon: '📝' },
  { to: '/examdept/evaluation', label: 'Evaluation', icon: '🤖' },
  { to: '/examdept/results', label: 'Results', icon: '📊' },
  { to: '/examdept/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/examdept/settings', label: 'Settings', icon: '⚙️' },
]

export default function ExamDeptLayout() {
  const { user, logout } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <div className="ed-wrap" style={{ flex: 1 }}>
        <aside className="ed-sidebar glass-card" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
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
          <header className="eduexam-top-header">
            <div className="search-bar-wrap">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search exams, results, evaluations..." />
            </div>

            <div className="top-header-center">
              <h1 className="header-college-title-center">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
              <p className="header-dashboard-subtitle-center">🏛️ Main Examination Control Centre</p>
            </div>

            <div className="top-header-right">
              <NotificationBell />
              <div className="header-icon-btn" style={{ cursor: 'pointer' }} title="Settings">⚙️</div>

              <div className="user-profile-badge" style={{ cursor: 'pointer' }}>
                <div className="user-avatar-circle" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: '#fff', fontWeight: 800 }}>
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.fullName?.[0] || 'E')}
                </div>
                <div>
                  <div className="user-name-title">{user?.fullName || 'Mr. Suresh Rao'}</div>
                  <div className="user-sub-title">DSATM · Exam Authority</div>
                </div>
                <span className="caret-down">▾</span>
              </div>
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