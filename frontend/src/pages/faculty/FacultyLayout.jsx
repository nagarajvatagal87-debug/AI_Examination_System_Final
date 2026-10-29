import React, { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
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
        <div style={{ padding: 36, background: '#ffffff', borderRadius: 16, border: '1.5px solid #fecaca', margin: 20, textAlign: 'center', boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)' }}>
          <h3 style={{ color: '#dc2626', margin: '0 0 10px 0', fontSize: 18, fontWeight: 800 }}>⚠️ Section Temporarily Unavailable</h3>
          <p style={{ color: '#475569', fontSize: 13, margin: '0 0 20px 0' }}>
            {this.state.error?.message || "An error occurred loading this workspace page."}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/faculty'; }}
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)' }}
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
  { to: '/faculty/sports', label: 'Sports Events', icon: '🏆' },
  { to: '/faculty/clubs', label: 'Clubs & Activities', icon: '🎓' },
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

  const facultyName = (
    user?.fullName ||
    user?.full_name ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'Dr. Priya'
  ).trim() || 'Dr. Priya'

  const facultyRole = (
    (user?.designation || 'Assistant Professor') +
    ' · ' +
    (user?.departmentName || user?.department_id || 'Master of Computer Applications (MCA)')
  ).trim()

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(180deg, #f0f7ff 0%, #f8fafc 40%, #f8fafc 100%)', color: '#0f172a' }}>
      <div className="fl-wrap" style={{ flex: 1 }}>
        <aside className="fl-sidebar">
          <div className="fl-brand">
            <div className="fl-logo-box">
              <img src="/dsi-logo.png" alt="DSI Logo" className="fl-college-logo" />
            </div>
            <div className="fl-brand-text">
              DAYANANDA SAGAR
              <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>ACADEMY OF TECH & MGMT</div>
            </div>
          </div>

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
          {/* TOP INSTITUTIONAL NAVBAR */}
          <header className="eduexam-top-header">
            <div className="fl-search-bar-wrap">
              <span className="fl-search-icon">🔍</span>
              <input
                className="fl-search-input"
                type="text"
                placeholder="Search subjects, materials, students..."
              />
            </div>

            <div className="fl-top-header-center">
              <h1 className="fl-header-college-title">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
              <p className="fl-header-dashboard-subtitle">👨‍🏫 Faculty Dashboard — Academic LMS & AI</p>
            </div>

            <div className="fl-top-header-right">
              <NotificationBell />

              <button
                type="button"
                className="fl-header-icon-btn"
                onClick={() => navigate('/faculty/settings')}
                title="Settings & Profile"
              >
                ⚙️
              </button>

              <div ref={profileRef} className="fl-profile-popover-wrapper">
                <div
                  className="fl-user-profile-badge"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  title="Click to view account menu"
                >
                  <div className="fl-user-avatar-circle">
                    {avatarUrl && !avatarUrl.includes('dsi-logo') && !avatarUrl.includes('logo') ? (
                      <img src={avatarUrl} alt="Avatar" />
                    ) : (
                      facultyName[0]?.toUpperCase() || 'F'
                    )}
                  </div>
                  <div className="fl-user-profile-info">
                    <div className="fl-user-name-title">{facultyName}</div>
                    <div className="fl-user-sub-title">{facultyRole}</div>
                  </div>
                  <span className={`fl-caret-down ${profileMenuOpen ? 'open' : ''}`}>▾</span>
                </div>

                {profileMenuOpen && (
                  <div className="fl-profile-popover">
                    <div className="fl-pop-header">
                      <div className="fl-pop-avatar">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          facultyName[0]?.toUpperCase() || 'F'
                        )}
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
