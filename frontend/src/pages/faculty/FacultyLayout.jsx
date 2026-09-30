import React, { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import '../student/StudentDashboard.css'
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
  { to: '/faculty/academic-calendar', label: 'Academic Calendar', icon: '📅' },
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
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef(null)

  const facultyName = user?.full_name || user?.fullName || user?.name || user?.email?.split('@')[0] || 'Priya'
  const facultyRole = (user?.designation || 'Assistant Professor') + ' · ' + (user?.departmentName || user?.department_id || 'MCA')
  const facultyEmail = user?.email || 'priya@dsatm.edu.in'
  const avatarUrl = user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar')

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileMenuOpen])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <div className="fl-wrap" style={{ flex: 1 }}>
        <aside className="fl-sidebar glass-card" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
          <NavLink to="/faculty/settings" style={{ textDecoration: 'none' }}>
            <div className="fl-profile" style={{ cursor: 'pointer' }}>
              <div className="fl-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                {avatarUrl && !avatarUrl.includes('dsi-logo') && !avatarUrl.includes('logo') ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  facultyName[0]?.toUpperCase() || 'P'
                )}
              </div>
              <div className="fl-profile-name">{facultyName}</div>
              <div className="fl-profile-role">{facultyRole}</div>
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
          <header className="eduexam-top-header">
            <div className="search-bar-wrap">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search subjects, materials, students..." />
            </div>

            <div className="top-header-center">
              <h1 className="header-college-title-center">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
              <p className="header-dashboard-subtitle-center">👨‍🏫 Faculty Dashboard — Academic LMS & AI</p>
            </div>

            <div className="top-header-right">
              <NotificationBell />
              <div className="header-icon-btn" onClick={() => navigate('/faculty/settings')} style={{ cursor: 'pointer' }} title="Settings">⚙️</div>

              <div ref={profileRef} style={{ position: 'relative' }}>
                <div
                  className="user-profile-badge"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar-circle" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: '#fff', fontWeight: 800 }}>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (facultyName[0]?.toUpperCase() || 'F')}
                  </div>
                  <div>
                    <div className="user-name-title">{facultyName}</div>
                    <div className="user-sub-title">{facultyRole}</div>
                  </div>
                  <span className="caret-down">▾</span>
                </div>

                {profileMenuOpen && (
                  <div className="fl-profile-popover glass-card">
                    <div className="fl-pop-header">
                      <div className="fl-pop-avatar">
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (facultyName[0]?.toUpperCase() || 'F')}
                      </div>
                      <div className="fl-pop-user-info">
                        <h4 className="fl-pop-name">{facultyName}</h4>
                        <p className="fl-pop-email">{facultyEmail}</p>
                        <span className="fl-pop-badge">{facultyRole}</span>
                      </div>
                    </div>

                    <div className="fl-pop-menu">
                      <button
                        type="button"
                        className="fl-pop-item"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          navigate('/faculty/settings')
                        }}
                      >
                        <span className="fl-pop-icon">👤</span>
                        <div>
                          <strong>View Profile & Settings</strong>
                          <p>Edit name, email & avatar picture</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="fl-pop-item"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          navigate('/faculty/subjects')
                        }}
                      >
                        <span className="fl-pop-icon">📚</span>
                        <div>
                          <strong>My Teaching Subjects</strong>
                          <p>Manage course materials & syllabus</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="fl-pop-item"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          navigate('/faculty/examinations')
                        }}
                      >
                        <span className="fl-pop-icon">📝</span>
                        <div>
                          <strong>Examinations</strong>
                          <p>Generate question papers & view scheme</p>
                        </div>
                      </button>

                      <div className="fl-pop-divider" />

                      <button
                        type="button"
                        className="fl-pop-item logout"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          logout()
                        }}
                      >
                        <span className="fl-pop-icon">🚪</span>
                        <div>
                          <strong>Sign Out</strong>
                          <p>Log out of Faculty Portal</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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