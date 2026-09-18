import { useEffect, useState } from 'react'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import ProfileSettings from '../../components/ProfileSettings.jsx'

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
  { key: 'profile', icon: '👤', label: 'Profile' },
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
      {/* Top Institutional Header Banner */}
      <HeaderBanner collegeName="DSATM - DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT" />

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
              <div className="name" style={{ color: '#f8fafc', fontWeight: 800 }}>{user?.fullName || myProfile?.full_name || 'Principal'}</div>
              <div className="role" style={{ color: '#94a3b8', fontSize: 12 }}>Principal · Institution Head</div>
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
          <header className="pd-topbar glass-card" style={{ margin: '20px 24px 0', padding: '14px 24px', borderRadius: 14 }}>
            <div>
              <h1 style={{ fontSize: 20, margin: 0, color: '#f8fafc' }}>{NAV.find((n) => n.key === active)?.label}</h1>
              <div className="sub" style={{ fontSize: 12, color: '#94a3b8' }}>Institution-wide Oversight & Academic Governance</div>
            </div>
            <NotificationBell />
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
            {active === 'profile' && <ProfileSettings onProfileUpdated={loadMyProfile} />}
          </div>
        </main>
      </div>
    </div>
  )
}