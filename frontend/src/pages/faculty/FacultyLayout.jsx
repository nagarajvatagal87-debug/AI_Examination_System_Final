import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import './FacultyLayout.css'

class FacultyErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Faculty Portal Error Boundary Caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: 'rgba(30, 41, 59, 0.8)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', margin: 20, textAlign: 'center' }}>
          <h3 style={{ color: '#f87171', margin: '0 0 10px 0', fontSize: 18 }}>⚠️ Section Temporarily Unavailable</h3>
          <p style={{ color: '#cbd5e1', fontSize: 13, margin: '0 0 20px 0' }}>
            {this.state.error?.message || "An error occurred loading this workspace page."}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/faculty'; }}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            🔄 Return to Faculty Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  const facultyName = user?.fullName || user?.full_name || user?.name || user?.email?.split('@')[0] || 'Faculty'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <div className="fl-wrap" style={{ flex: 1 }}>
        <aside className="fl-sidebar glass-card" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
          <div className="fl-brand">
            <div className="fl-logo">🛡️</div>
            <div className="fl-brand-text">Faculty Portal<br /><span style={{ fontSize: 11, color: 'var(--text-sub)' }}>Academic LMS & AI</span></div>
          </div>

          <NavLink to="/faculty/settings" style={{ textDecoration: 'none' }}>
            <div className="fl-profile" style={{ cursor: 'pointer' }}>
              <div className="fl-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (facultyName[0] || 'F')}
              </div>
              <div className="fl-profile-name">{facultyName}</div>
              <div className="fl-profile-role">Assistant Professor · {user?.departmentName || 'MCA'}</div>
              <div className="fl-online"><span className="fl-dot" /> Online</div>
            </div>
          </NavLink>

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
          <header className="fl-topbar" style={{
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
                👨‍🏫 Faculty Portal
              </p>
            </div>
            <div className="fl-topbar-actions" style={{ flex: 1, justifyContent: 'flex-end', display: 'flex', alignItems: 'center', gap: 14 }}>
              <NotificationBell />
              <span className="fl-topbar-name" style={{ color: '#ffffff', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                {facultyName}
              </span>
            </div>
          </header>

          <main className="fl-content">
            <FacultyErrorBoundary>
              <Outlet />
            </FacultyErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  )
}