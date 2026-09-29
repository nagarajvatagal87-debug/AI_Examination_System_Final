import { useEffect, useState } from 'react'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import ProfileSettings from '../../components/ProfileSettings.jsx'
import Notifications from '../faculty/Notifications.jsx'
import '../student/StudentDashboard.css'
import './PrincipalDashboard.css'

// Modular Components
import PrincipalOverview from './PrincipalOverview.jsx'
import DepartmentDirectory from './DepartmentDirectory.jsx'
import InstitutionAnalytics from './InstitutionAnalytics.jsx'
import DepartmentComparison from './DepartmentComparison.jsx'
import TopStudentsOverall from './TopStudentsOverall.jsx'
import ExaminationOverview from './ExaminationOverview.jsx'
import CollegeInfoPublish from './CollegeInfoPublish.jsx'
import PrincipalMessages from './PrincipalMessages.jsx'

import './PrincipalDashboard.css'

const NAV = [
  { key: 'overview', icon: '📊', label: 'Overview' },
  { key: 'directory', icon: '🏛️', label: 'Department Directory' },
  { key: 'analytics', icon: '📈', label: 'Institution Analytics' },
  { key: 'comparison', icon: '⚖️', label: 'Department Comparison' },
  { key: 'top-students', icon: '👑', label: 'Top Students' },
  { key: 'exam-overview', icon: '📋', label: 'Examination Overview' },
  { key: 'publish', icon: '📢', label: 'Publish College Info' },
  { key: 'messages', icon: '✉️', label: 'Messages & Invites' },
  { key: 'notifications', icon: '🔔', label: 'Notifications' },
  { key: 'profile', icon: '⚙️', label: 'Profile & Settings' },
]

export default function PrincipalDashboard() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('overview')

  const [myProfile, setMyProfile] = useState(null)
  const [overview, setOverview] = useState(null)
  const [invites, setInvites] = useState([])
  const [deptStats, setDeptStats] = useState([])
  const [staffDirectory, setStaffDirectory] = useState([])
  const [error, setError] = useState('')

  function loadOverview() {
    api.get('/principal/overview').then((res) => setOverview(res.data)).catch((err) => setError(err.response?.data?.error || 'Failed to load overview'))
  }
  function loadInvites() {
    api.get('/invites').then((res) => setInvites(res.data)).catch(() => {})
  }
  function loadDeptStats() {
    api.get('/principal/department-stats').then((res) => setDeptStats(res.data)).catch(() => {})
  }
  function loadStaffDirectory() {
    api.get('/principal/staff-directory').then((res) => setStaffDirectory(res.data)).catch(() => {})
  }
  function loadMyProfile() {
    api.get('/profile').then((res) => setMyProfile(res.data)).catch(() => {})
  }

  useEffect(() => {
    loadOverview()
    loadInvites()
    loadDeptStats()
    loadStaffDirectory()
    loadMyProfile()
  }, [])

  const departments = overview?.departments || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <div className="pd-shell" style={{ flex: 1 }}>
        {/* Principal Portal Sidebar */}
        <aside className="pd-sidebar glass-card" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
          <div className="pd-sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 800,
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.4)'
            }}>
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Principal Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '👑'
              )}
            </div>
            <div>
              <div className="name" style={{ color: '#0f172a', fontWeight: 800 }}>{user?.fullName || myProfile?.full_name || 'Principal'}</div>
              <div className="role" style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>Principal · Institution Head</div>
            </div>
          </div>

          <nav className="pd-nav">
            {NAV.map((n) => (
              <div
                key={n.key}
                className={`pd-nav-item ${active === n.key ? 'active' : ''}`}
                onClick={() => setActive(n.key)}
              >
                <span>{n.icon}</span> {n.label}
              </div>
            ))}
          </nav>
          <button className="pd-sidebar-logout" onClick={logout}>🚪 Log out</button>
        </aside>

        {/* Main Content Workspace */}
        <main className="pd-main">
          <header className="eduexam-top-header">
            <div className="search-bar-wrap">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search institution reports, departments..." />
            </div>

            <div className="top-header-center">
              <h1 className="header-college-title-center">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
              <p className="header-dashboard-subtitle-center">👑 Principal Dashboard — Academic Governance</p>
            </div>

            <div className="top-header-right">
              <NotificationBell count={0} />
              <div className="header-icon-btn" onClick={() => setActive('profile')} style={{ cursor: 'pointer' }} title="Profile Settings">⚙️</div>

              <div className="user-profile-badge" onClick={() => setActive('profile')} style={{ cursor: 'pointer' }}>
                <div className="user-avatar-circle" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: '#fff', fontWeight: 800 }}>
                  {myProfile?.avatar_url ? <img src={myProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👑'}
                </div>
                <div>
                  <div className="user-name-title">{user?.fullName || myProfile?.full_name || 'Principal'}</div>
                  <div className="user-sub-title">DSATM · Institution Head</div>
                </div>
                <span className="caret-down">▾</span>
              </div>
            </div>
          </header>

          <div className="pd-content" style={{ padding: '24px' }}>
            {error && <p className="pd-status error">{error}</p>}

            {/* Modular Tab Content */}
            {active === 'overview' && <PrincipalOverview overview={overview} deptStats={deptStats} user={user} />}
            {active === 'directory' && <DepartmentDirectory deptStats={deptStats} />}
            {active === 'analytics' && <InstitutionAnalytics />}
            {active === 'comparison' && <DepartmentComparison />}
            {active === 'top-students' && <TopStudentsOverall overview={overview} departments={departments} />}
            {active === 'exam-overview' && <ExaminationOverview />}
            {active === 'publish' && <CollegeInfoPublish />}
            {active === 'messages' && (
              <PrincipalMessages
                staffDirectory={staffDirectory}
                invites={invites}
                loadInvites={loadInvites}
                departments={departments}
              />
            )}
            {active === 'notifications' && <Notifications />}
            {active === 'profile' && <ProfileSettings onProfileUpdated={loadMyProfile} />}
          </div>
        </main>
      </div>
    </div>
  )
}