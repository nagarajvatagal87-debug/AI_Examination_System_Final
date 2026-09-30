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
        <div className="hl-profile">
          <div className="hl-avatar" style={{ overflow: 'hidden', padding: 0 }}>
            {user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar') ? (
              <img src={user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar')} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.fullName?.[0] || 'H'
            )}
          </div>
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
        <header className="hl-topbar" style={{
          padding: '12px 28px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderBottom: '1.5px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          width: '100%'
        }}>
          <div style={{ flex: 1 }} />
          <div style={{ flex: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{
              fontSize: 15.5,
              fontWeight: 900,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #ffffff 0%, #fef08a 45%, #93c5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              lineHeight: 1.25,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))'
            }}>
              DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT
            </h1>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8', margin: '3px 0 0 0', letterSpacing: '0.5px' }}>
              👩‍💼 Department HOD Portal
            </p>
          </div>
          <div className="hl-topbar-actions" style={{ flex: 1, justifyContent: 'flex-end', display: 'flex', alignItems: 'center', gap: 14 }}>
            <NotificationBell />
          </div>
        </header>
        <main className="hl-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}