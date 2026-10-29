import React, { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import './ExamDeptLayout.css'

const NAV_ITEMS = [
  { to: '/examdept', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/examdept/examinations', label: 'Main Examinations', icon: '📝' },
  { to: '/examdept/question-papers', label: 'Question Papers', icon: '📄' },
  { to: '/examdept/scripts', label: 'Answer Scripts', icon: '📦' },
  { to: '/examdept/evaluation', label: 'Evaluation', icon: '🤖' },
  { to: '/examdept/results', label: 'Results', icon: '📊' },
  { to: '/examdept/revaluation', label: 'Revaluation', icon: '🔄' },
  { to: '/examdept/reports', label: 'Reports', icon: '📑' },
  { to: '/examdept/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/examdept/audit-log', label: 'Audit Log', icon: '📋' },
  { to: '/examdept/settings', label: 'Settings', icon: '⚙️' },
]

export default function ExamDeptLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef(null)

  const userName = user?.fullName || user?.full_name || user?.name || user?.email?.split('@')[0] || 'Mr. Suresh Rao'
  const userRole = 'Main Exam Controller'
  const userEmail = user?.email || 'examdept@dsatm.edu.in'
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
    <div className="ed-wrap">
      <aside className="ed-sidebar">
        <div className="ed-brand">
          <div className="ed-logo-box">
            <img src="/dsi-logo.png" alt="DSI Logo" className="ed-college-logo" />
          </div>
          <div className="ed-brand-text">
            DAYANANDA SAGAR
            <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>ACADEMY OF TECH & MGMT</div>
          </div>
        </div>

        <div className="ed-profile">
          <div className="ed-avatar">
            {avatarUrl && !avatarUrl.includes('dsi-logo') ? (
              <img src={avatarUrl} alt="Avatar" />
            ) : (
              userName[0]?.toUpperCase() || 'E'
            )}
          </div>
          <div className="ed-profile-name">{userName}</div>
          <div className="ed-profile-role">{userRole}</div>
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
          <div className="ed-search-bar-wrap">
            <span className="ed-search-icon">🔍</span>
            <input
              className="ed-search-input"
              type="text"
              placeholder="Search exams, rosters, scripts, results..."
            />
          </div>

          <div className="ed-top-header-center">
            <h1 className="ed-header-college-title">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
            <p className="ed-header-dashboard-subtitle">🏛️ Main Examination Control Centre</p>
          </div>

          <div className="ed-top-header-right">
            <NotificationBell />

            <button
              type="button"
              className="ed-header-icon-btn"
              onClick={() => navigate('/examdept/settings')}
              title="Settings and Profile"
            >
              ⚙️
            </button>

            <div ref={profileRef} className="ed-profile-popover-wrapper">
              <div
                className="ed-user-profile-badge"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                title="Click to view account menu"
              >
                <div className="ed-user-avatar-circle">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userName[0]?.toUpperCase() || 'E'
                  )}
                </div>
                <div className="ed-user-profile-info">
                  <div className="ed-user-name-title">{userName}</div>
                  <div className="ed-user-sub-title">{userRole}</div>
                </div>
                <span className={`ed-caret-down ${profileMenuOpen ? 'open' : ''}`}>▾</span>
              </div>

              {profileMenuOpen && (
                <div className="ed-profile-popover">
                  <div className="ed-pop-header">
                    <div className="ed-pop-avatar">
                      {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (userName[0]?.toUpperCase() || 'E')}
                    </div>
                    <div className="ed-pop-user-info">
                      <h4 className="ed-pop-name">{userName}</h4>
                      <p className="ed-pop-email">{userEmail}</p>
                      <span className="ed-pop-badge">{userRole}</span>
                    </div>
                  </div>

                  <div className="ed-pop-menu">
                    <button
                      type="button"
                      className="ed-pop-item"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        navigate('/examdept/settings')
                      }}
                    >
                      <span>👤</span>
                      <div>
                        <strong>View Profile & Settings</strong>
                        <p>Edit name, email & avatar picture</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="ed-pop-item logout"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        logout()
                      }}
                    >
                      <span>🚪</span>
                      <div>
                        <strong>Sign Out</strong>
                        <p>End session securely</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="ed-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}