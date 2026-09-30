import { useEffect, useState } from 'react'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import ProfileSettings from '../../components/ProfileSettings.jsx'
import Notifications from '../faculty/Notifications.jsx'
import '../student/StudentDashboard.css'
import './PrincipalDashboard.css'

// Modular Principal Components
import PrincipalOverview from './PrincipalOverview.jsx'
import DepartmentDirectory from './DepartmentDirectory.jsx'
import InstitutionAnalytics from './InstitutionAnalytics.jsx'
import DepartmentComparison from './DepartmentComparison.jsx'
import TopStudentsOverall from './TopStudentsOverall.jsx'
import ExaminationOverview from './ExaminationOverview.jsx'
import AcademicCalendar from './AcademicCalendar.jsx'
import CircularsAnnouncements from './CircularsAnnouncements.jsx'
import CollegeInfoPublish from './CollegeInfoPublish.jsx'
import PrincipalMessages from './PrincipalMessages.jsx'
import AuditGovernanceLog from './AuditGovernanceLog.jsx'
import InstitutionalReports from './InstitutionalReports.jsx'

const NAV = [
  { key: 'overview', icon: '🏠', label: 'Overview' },
  { key: 'directory', icon: '🏫', label: 'Department Directory' },
  { key: 'analytics', icon: '📊', label: 'Institution Analytics' },
  { key: 'comparison', icon: '⚖️', label: 'Department Comparison' },
  { key: 'top-students', icon: '🏆', label: 'Top Students' },
  { key: 'exam-overview', icon: '📝', label: 'Examination Overview' },
  { key: 'calendar', icon: '📅', label: 'Academic Calendar' },
  { key: 'circulars', icon: '📢', label: 'Circulars & Announcements' },
  { key: 'publish', icon: '📣', label: 'Publish College Info' },
  { key: 'messages', icon: '💬', label: 'Messages & Invites' },
  { key: 'notifications', icon: '🔔', label: 'Notifications' },
  { key: 'audit-log', icon: '📋', label: 'Audit & Governance Log' },
  { key: 'reports', icon: '📑', label: 'Institutional Reports' },
  { key: 'profile', icon: '👤', label: 'Profile & Settings' },
]

export default function PrincipalDashboard() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('overview')

  const [myProfile, setMyProfile] = useState(null)
  const [invites, setInvites] = useState([])
  const [deptStats, setDeptStats] = useState([])
  const [loadingDeptStats, setLoadingDeptStats] = useState(false)
  const [deptStatsError, setDeptStatsError] = useState('')
  const [staffDirectory, setStaffDirectory] = useState([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  function loadInvites() {
    api.get('/invites').then((res) => setInvites(res.data)).catch(() => {})
  }
  function loadDeptStats() {
    setLoadingDeptStats(true)
    setDeptStatsError('')
    api.get('/principal/department-stats')
      .then((res) => setDeptStats(res.data))
      .catch((err) => setDeptStatsError(err.response?.data?.error || 'Failed to load department stats'))
      .finally(() => setLoadingDeptStats(false))
  }
  function loadStaffDirectory() {
    api.get('/principal/staff-directory').then((res) => setStaffDirectory(res.data)).catch(() => {})
  }
  function loadMyProfile() {
    api.get('/profile').then((res) => setMyProfile(res.data)).catch(() => {})
  }
  function loadUnreadNotifs() {
    api.get('/notifications').then((res) => {
      const unread = (res.data || []).filter((n) => !n.read_at).length
      setUnreadNotifCount(unread)
    }).catch(() => {})
  }

  useEffect(() => {
    loadInvites()
    loadDeptStats()
    loadStaffDirectory()
    loadMyProfile()
    loadUnreadNotifs()
  }, [])

  // Live database search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      setSearching(true)
      api.get(`/principal/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => setSearchResults(res.data?.results || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const departments = deptStats || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <div className="pd-shell" style={{ flex: 1 }}>
        {/* Principal Sidebar */}
        <aside className="pd-sidebar glass-card" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
          <div className="pd-sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 800,
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.4)'
            }}>
              {myProfile?.avatar_url || user?.avatarUrl || user?.avatar_url ? (
                <img src={myProfile?.avatar_url || user?.avatarUrl || user?.avatar_url} alt="Principal Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '👑'
              )}
            </div>
            <div>
              <div className="name" style={{ color: '#0f172a', fontWeight: 800 }}>{user?.fullName || myProfile?.full_name || 'Principal'}</div>
              <div className="role" style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>Principal · Institution Head</div>
            </div>
          </div>

          <nav className="pd-nav" style={{ overflowY: 'auto' }}>
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
          <button className="pd-sidebar-logout" onClick={logout}>🚪 Logout</button>
        </aside>

        {/* Main Content Workspace */}
        <main className="pd-main">
          <header className="eduexam-top-header" style={{ position: 'relative' }}>
            <div className="search-bar-wrap" style={{ position: 'relative' }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search departments, students, faculty, circulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {/* Live Search Results Overlay */}
              {searchQuery.trim() && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff',
                  border: '1.5px solid #1e293b', borderRadius: 10, marginTop: 6, zIndex: 1000,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)', overflow: 'hidden'
                }}>
                  {searching ? (
                    <div style={{ padding: 12, fontSize: 12, color: '#475569', textAlign: 'center' }}>Searching database...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: '#475569', textAlign: 'center' }}>No matching institutional records</div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => { setActive(item.tab); setSearchQuery('') }}
                        style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{item.title}</div>
                          <div style={{ fontSize: 11, color: '#475569' }}>{item.sub}</div>
                        </div>
                        <span style={{ fontSize: 10, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>
                          {item.type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="top-header-center">
              <h1 className="header-college-title-center">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
              <p className="header-dashboard-subtitle-center">👑 Principal Dashboard — Academic Governance</p>
            </div>

            <div className="top-header-right">
              <div onClick={() => setActive('notifications')} style={{ cursor: 'pointer' }}>
                <NotificationBell count={unreadNotifCount} />
              </div>
              <div className="header-icon-btn" onClick={() => setActive('profile')} style={{ cursor: 'pointer' }} title="Profile Settings">⚙️</div>

              <div className="user-profile-badge" onClick={() => setActive('profile')} style={{ cursor: 'pointer' }}>
                <div className="user-avatar-circle" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: '#fff', fontWeight: 800 }}>
                  {myProfile?.avatar_url || user?.avatarUrl || user?.avatar_url ? (
                    <img src={myProfile?.avatar_url || user?.avatarUrl || user?.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '👑'
                  )}
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
            {/* Modular Tab Routing */}
            {active === 'overview' && <PrincipalOverview user={user} />}
            {active === 'directory' && <DepartmentDirectory deptStats={deptStats} loading={loadingDeptStats} error={deptStatsError} onRetry={loadDeptStats} />}
            {active === 'analytics' && <InstitutionAnalytics />}
            {active === 'comparison' && <DepartmentComparison departments={departments} />}
            {active === 'top-students' && <TopStudentsOverall departments={departments} />}
            {active === 'exam-overview' && <ExaminationOverview />}
            {active === 'calendar' && <AcademicCalendar />}
            {active === 'circulars' && <CircularsAnnouncements departments={departments} />}
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
            {active === 'audit-log' && <AuditGovernanceLog />}
            {active === 'reports' && <InstitutionalReports departments={departments} />}
            {active === 'profile' && <ProfileSettings onProfileUpdated={loadMyProfile} />}
          </div>
        </main>
      </div>
    </div>
  )
}