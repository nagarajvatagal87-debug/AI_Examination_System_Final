import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api, { setAuthToken } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import '../../components/HeaderBanner.css'
import './Auth.css'

const ROLE_CONFIG = {
  student: {
    key: 'student',
    label: 'Student Login',
    tabLabel: '🎓 Student',
    icon: '🎓',
    badge: 'Student Portal',
    color: 'blue',
    placeholder: 'Enter USN (e.g. 1DT25MC036) or Student Email',
    previewTitle: 'Student Features',
    features: [
      'Course Materials & Syllabus Reader',
      'AI Study Assistant & Practice Quizzes',
      'Official Hall Ticket & Seat Allocation',
      'Published Semester Results & Transcripts',
    ],
  },
  faculty: {
    key: 'faculty',
    label: 'Faculty Login',
    tabLabel: '🛡️ Faculty',
    icon: '🛡️',
    badge: 'Faculty Portal',
    color: 'emerald',
    placeholder: 'Enter Faculty Email (e.g. ushashree-mca@dsatm.edu.in)',
    previewTitle: 'Faculty Features',
    features: [
      'Upload Course Materials & Notes',
      'Generate AI Question Papers & Schemes',
      'Review AI Answer Sheet Evaluation',
      'Continuous Attendance & CIA Marks',
    ],
  },
  hod: {
    key: 'hod',
    label: 'HOD Login',
    tabLabel: '🏛️ HOD',
    icon: '🏛️',
    badge: 'HOD Portal',
    color: 'purple',
    placeholder: 'Enter HOD Email (e.g. hod@gmail.com)',
    previewTitle: 'HOD Features',
    features: [
      'Department Pass/Fail Analytics',
      'Approve & Audit CIA Marks',
      'Attendance Condonation & Hall Tickets',
      'Faculty Messaging & Notices',
    ],
  },
  principal: {
    key: 'principal',
    label: 'Principal Login',
    tabLabel: '👑 Principal',
    icon: '👑',
    badge: 'Principal Portal',
    color: 'amber',
    placeholder: 'Enter Principal Email',
    previewTitle: 'Principal Features',
    features: [
      'Institution Performance Oversight',
      'Department Comparative Analytics',
      'College Merit Student Ranking',
      'Publish Official College Announcements',
    ],
  },
  examdept: {
    key: 'examdept',
    label: 'Exam Dept Login',
    tabLabel: '⚖️ Exam Dept',
    icon: '⚖️',
    badge: 'Exam Dept Portal',
    color: 'rose',
    placeholder: 'Enter Exam Dept Email',
    previewTitle: 'Exam Dept Features',
    features: [
      'Schedule Exams & Timetables',
      'Exam Centres & Hall Ticket Generator',
      'Audit AI Marks & Moderation',
      'Official Semester Result Publication',
    ],
  },
}

// Role-specific dynamic floating features that glide and move across the DSATM logo
const ROLE_BADGES = {
  student: [
    { id: 'st1', label: 'Admission Reports', pos: 'pos-top-right', side: 'right' },
    { id: 'st2', label: 'Examination', pos: 'pos-mid-right-top', side: 'right' },
    { id: 'st3', label: 'LMS & Notes', pos: 'pos-mid-right', side: 'right' },
    { id: 'st4', label: 'Archive', pos: 'pos-mid-right-bot', side: 'right' },
    { id: 'st5', label: 'Academic Calendar', pos: 'pos-bot-right', side: 'right' },
    { id: 'st6', label: 'Student Clubs', pos: 'pos-far-bot-right', side: 'right' },
    { id: 'st7', label: 'AI Study Assistant', pos: 'pos-top-mid', side: 'top' },
    { id: 'st8', label: 'Merit Awards', pos: 'pos-top-mid-left', side: 'top' },
    { id: 'st9', label: 'On-Screen Marking', pos: 'pos-bot-left', side: 'left' },
    { id: 'st10', label: 'Malpractice Check', pos: 'pos-mid-left-bot', side: 'left' },
    { id: 'st11', label: 'Semester Registration', pos: 'pos-far-bot-left', side: 'left' },
    { id: 'st12', label: 'Placement Cell', pos: 'pos-bot-edge-left', side: 'left' },
    { id: 'st13', label: 'Fee Payments', pos: 'pos-mid-left-top', side: 'left' },
    { id: 'st14', label: 'Sports & Cultural', pos: 'pos-top-left', side: 'left' },
  ],
  faculty: [
    { id: 'fa1', label: 'AI Question Gen', pos: 'pos-top-right', side: 'right' },
    { id: 'fa2', label: 'Evaluation Schemes', pos: 'pos-mid-right-top', side: 'right' },
    { id: 'fa3', label: 'AI Answer Grading', pos: 'pos-mid-right', side: 'right' },
    { id: 'fa4', label: 'Upload Notes & Syllabus', pos: 'pos-mid-right-bot', side: 'right' },
    { id: 'fa5', label: 'Continuous CIA Marks', pos: 'pos-bot-right', side: 'right' },
    { id: 'fa6', label: 'Class Analytics', pos: 'pos-far-bot-right', side: 'right' },
    { id: 'fa7', label: 'Subject Roster (55 Stds)', pos: 'pos-top-mid', side: 'top' },
    { id: 'fa8', label: 'Parent SMS Alerts', pos: 'pos-top-mid-left', side: 'top' },
    { id: 'fa9', label: 'On-Screen Valuation', pos: 'pos-bot-left', side: 'left' },
    { id: 'fa10', label: 'Attendance Entry', pos: 'pos-mid-left-bot', side: 'left' },
    { id: 'fa11', label: 'Faculty Calendar', pos: 'pos-far-bot-left', side: 'left' },
    { id: 'fa12', label: 'Club Coordination', pos: 'pos-bot-edge-left', side: 'left' },
    { id: 'fa13', label: 'CIA Moderation', pos: 'pos-mid-left-top', side: 'left' },
    { id: 'fa14', label: 'Course Materials', pos: 'pos-top-left', side: 'left' },
  ],
  hod: [
    { id: 'hd1', label: 'Department Analytics', pos: 'pos-top-right', side: 'right' },
    { id: 'hd2', label: 'Pass / Fail Performance', pos: 'pos-mid-right-top', side: 'right' },
    { id: 'hd3', label: 'Approve CIA Marks', pos: 'pos-mid-right', side: 'right' },
    { id: 'hd4', label: 'Medical Condonation', pos: 'pos-mid-right-bot', side: 'right' },
    { id: 'hd5', label: 'Top 10 Performers', pos: 'pos-bot-right', side: 'right' },
    { id: 'hd6', label: 'Calendar Logs', pos: 'pos-far-bot-right', side: 'right' },
    { id: 'hd7', label: 'Hall Ticket Authority', pos: 'pos-top-mid', side: 'top' },
    { id: 'hd8', label: 'Faculty Messaging', pos: 'pos-top-mid-left', side: 'top' },
    { id: 'hd9', label: 'Marks Audit Panel', pos: 'pos-bot-left', side: 'left' },
    { id: 'hd10', label: 'Faculty Subject Map', pos: 'pos-mid-left-bot', side: 'left' },
    { id: 'hd11', label: 'Student Direct Intervene', pos: 'pos-far-bot-left', side: 'left' },
    { id: 'hd12', label: 'Department Roster', pos: 'pos-bot-edge-left', side: 'left' },
    { id: 'hd13', label: 'Course Verification', pos: 'pos-mid-left-top', side: 'left' },
    { id: 'hd14', label: 'Autonomous Oversight', pos: 'pos-top-left', side: 'left' },
  ],
  principal: [
    { id: 'pr1', label: 'Institutional Oversight', pos: 'pos-top-right', side: 'right' },
    { id: 'pr2', label: 'Department Pass Rates', pos: 'pos-mid-right-top', side: 'right' },
    { id: 'pr3', label: 'College Merit Ranking', pos: 'pos-mid-right', side: 'right' },
    { id: 'pr4', label: 'Official Announcements', pos: 'pos-mid-right-bot', side: 'right' },
    { id: 'pr5', label: 'Institutional Policy', pos: 'pos-bot-right', side: 'right' },
    { id: 'pr6', label: 'Centre Audit Reports', pos: 'pos-far-bot-right', side: 'right' },
    { id: 'pr7', label: 'Autonomous Governance', pos: 'pos-top-mid', side: 'top' },
    { id: 'pr8', label: 'Public Info Publish', pos: 'pos-top-mid-left', side: 'top' },
    { id: 'pr9', label: 'Faculty Audit Oversight', pos: 'pos-bot-left', side: 'left' },
    { id: 'pr10', label: 'College Calendar Pub', pos: 'pos-mid-left-bot', side: 'left' },
    { id: 'pr11', label: 'Rank Transfer Engine', pos: 'pos-far-bot-left', side: 'left' },
    { id: 'pr12', label: 'NAAC A+ Compliance', pos: 'pos-bot-edge-left', side: 'left' },
    { id: 'pr13', label: 'Merit Scholarships', pos: 'pos-mid-left-top', side: 'left' },
    { id: 'pr14', label: 'VTU Affiliation Hub', pos: 'pos-top-left', side: 'left' },
  ],
  examdept: [
    { id: 'ex1', label: 'Schedule Main Exams', pos: 'pos-top-right', side: 'right' },
    { id: 'ex2', label: 'Confidential QP Vault', pos: 'pos-mid-right-top', side: 'right' },
    { id: 'ex3', label: 'Room & Seat Allotment', pos: 'pos-mid-right', side: 'right' },
    { id: 'ex4', label: 'Hall Ticket Generator', pos: 'pos-mid-right-bot', side: 'right' },
    { id: 'ex5', label: 'Official Result Release', pos: 'pos-bot-right', side: 'right' },
    { id: 'ex6', label: 'Revaluation Processing', pos: 'pos-far-bot-right', side: 'right' },
    { id: 'ex7', label: 'Automated Seat Matrix', pos: 'pos-top-mid', side: 'top' },
    { id: 'ex8', label: 'Chief Supt Verifications', pos: 'pos-top-mid-left', side: 'top' },
    { id: 'ex9', label: 'On-Screen Mark Audit', pos: 'pos-bot-left', side: 'left' },
    { id: 'ex10', label: 'Malpractice Committee', pos: 'pos-mid-left-bot', side: 'left' },
    { id: 'ex11', label: 'Answer Script Barcode', pos: 'pos-far-bot-left', side: 'left' },
    { id: 'ex12', label: 'Attendance Lock Engine', pos: 'pos-bot-edge-left', side: 'left' },
    { id: 'ex13', label: 'Exam Centre Master', pos: 'pos-mid-left-top', side: 'left' },
    { id: 'ex14', label: 'Digital Ledger Roster', pos: 'pos-top-left', side: 'left' },
  ],
}

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeRole = searchParams.get('role') || 'student'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [detectedRole, setDetectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [animateKey, setAnimateKey] = useState(0)

  const { login } = useAuth()
  const navigate = useNavigate()

  const config = ROLE_CONFIG[activeRole] || ROLE_CONFIG.student
  const activeBadges = ROLE_BADGES[activeRole] || ROLE_BADGES.student

  const [stats, setStats] = useState({
    departments: 11,
    students: 75,
    faculty: 6,
    exams: 1,
    evaluations: 10,
    satisfaction: '100%',
  })
  const [deptInfo, setDeptInfo] = useState(null)

  useEffect(() => {
    async function loadRealData() {
      try {
        const [statsRes, infoRes] = await Promise.allSettled([
          api.get('/public/stats'),
          api.get('/public/all-info'),
        ])
        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          setStats(statsRes.value.data)
        }
        if (infoRes.status === 'fulfilled' && Array.isArray(infoRes.value?.data) && infoRes.value.data.length > 0) {
          setDeptInfo(infoRes.value.data[0])
        }
      } catch (err) {
        console.warn('Real data fallback active:', err)
      }
    }
    loadRealData()
  }, [])

  function switchRole(roleKey) {
    setSearchParams({ role: roleKey })
    setError('')
    setDetectedRole(null)
    setAnimateKey((prev) => prev + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setDetectedRole(null)
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password, role: activeRole })

      setAuthToken(data.token)
      login(data.user)
      navigate(`/${data.user.role}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check credentials.')
      if (err.response?.data?.detectedRole) {
        setDetectedRole(err.response?.data?.detectedRole)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page jems-mode full-screen-mode">
      <div className="auth-container full-container">
        {/* Full Header Banner with Real Institutional Data from Main Dashboard */}
        <header className="main-header-banner dsatm-auth-header">
          <div className="header-left">
            <div className="logo-container">
              <img src="/dsi-logo.png" alt="DSI Logo" className="header-dsi-logo" />
            </div>
            <div className="header-left-badge">
              <span className="institution-tag">DSI • ESTD 1960</span>
            </div>
          </div>

          <div className="header-center-marquee">
            <div className="header-marquee-track">
              <span className="header-marquee-item">
                🏛️ <strong>DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</strong> • Autonomous Institute Affiliated to VTU • AI Examination & Autonomous Evaluation System
              </span>
              <span className="header-marquee-item">
                🏛️ <strong>DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</strong> • Autonomous Institute Affiliated to VTU • AI Examination & Autonomous Evaluation System
              </span>
            </div>
          </div>

          <div className="header-right">
            <span className="tagline-pill">Learn | Assess | Analyze | Excel</span>
            <Link to="/" className="auth-back-link">
              ← Main Portal
            </Link>
          </div>
        </header>

        {/* 50/50 Full Screen Split Grid: Left Animated DSATM Showcase + Right Login Card */}
        <div className="auth-content-grid jems-split-grid full-grid">
          {/* LEFT 50%: Animated Institutional DSATM Showcase */}
          <div className="jems-showcase-panel full-panel">
            {/* Top Governance & Live Database Status Badges */}
            <div className="jems-top-badge-row">
              <div className="jems-pill-badge">
                <span className="jems-pill-icon">🏛️</span>
                <span>Autonomous Institutional Governance</span>
              </div>
              <div className="dsatm-live-db-pill">
                <span className="live-pulse-dot"></span>
                <span>Real Database Connected</span>
              </div>
              <div className="dsatm-accredit-pill">
                <span>NAAC A+ • VTU Affiliated • Estd 1960</span>
              </div>
            </div>

            {/* Project Header matching AI Examination System */}
            <div className="project-hero-header">
              <h1 className="project-main-title">
                AI Examination <span className="highlight-ai-gradient">System</span>
              </h1>
              <p className="project-hero-desc">
                Autonomous AI Question Paper Generation, Handwritten Answer Script Evaluation & Academic Portal
              </p>
            </div>

            {/* Structured Real Data Metrics Grid from Main Dashboard */}
            <div className="dsatm-metrics-structured">
              <div className="hero-metric-box metric-blue">
                <div className="metric-icon-wrap">🎓</div>
                <div className="metric-info">
                  <div className="metric-num">{stats.students}+</div>
                  <div className="metric-lbl">Active Students</div>
                </div>
              </div>

              <div className="hero-metric-box metric-cyan">
                <div className="metric-icon-wrap">🏢</div>
                <div className="metric-info">
                  <div className="metric-num">{stats.departments}</div>
                  <div className="metric-lbl">Academic Depts</div>
                </div>
              </div>

              <div className="hero-metric-box metric-emerald">
                <div className="metric-icon-wrap">👨‍🏫</div>
                <div className="metric-info">
                  <div className="metric-num">{stats.faculty}</div>
                  <div className="metric-lbl">Faculty Members</div>
                </div>
              </div>

              <div className="hero-metric-box metric-amber">
                <div className="metric-icon-wrap">🤖</div>
                <div className="metric-info">
                  <div className="metric-num">{stats.evaluations}+</div>
                  <div className="metric-lbl">AI Evaluations</div>
                </div>
              </div>

              <div className="hero-metric-box metric-purple">
                <div className="metric-icon-wrap">📑</div>
                <div className="metric-info">
                  <div className="metric-num">{stats.exams}</div>
                  <div className="metric-lbl">Exam Schemes</div>
                </div>
              </div>

              <div className="hero-metric-box metric-rose">
                <div className="metric-icon-wrap">✨</div>
                <div className="metric-info">
                  <div className="metric-num">{stats.satisfaction || '100%'}</div>
                  <div className="metric-lbl">Excellence Rating</div>
                </div>
              </div>
            </div>

            {/* Animated Constellation & Radar Orb Stage */}
            <div className="jems-orb-stage">
              {/* Central Glowing Radar Circle with DSATM College Logo & Name */}
              <div className="jems-radar-circle">
                <div className="radar-scanner-sweep"></div>
                <div className="radar-grid-dots"></div>
                <div className="radar-inner-ring"></div>

                {/* Center Core with DSATM College Logo and DSATM Title */}
                <div className="radar-center-core">
                  <div className="core-college-logo-wrap">
                    <img src="/dsi-logo.png" alt="DSATM College Logo" className="radar-dsatm-logo" />
                  </div>
                  <div className="radar-dsatm-title">DSATM</div>
                  <div className="radar-dsatm-tagline">SMARTER • BETTER • STRONGER</div>
                  <div className="radar-active-role-tag">
                    {config.icon} {config.badge}
                  </div>
                </div>
              </div>

              {/* Continuous Orbiting Feature Labels & Coupled Connecting Lines */}
              <div key={animateKey} className="jems-orbital-system">
                {activeBadges.map((badge, idx) => {
                  // 3 orbital radii & speeds for natural Keplerian distribution around DSATM globe
                  const ringConfig = [
                    { radius: 172, duration: 46, lineOffset: 130 },
                    { radius: 212, duration: 60, lineOffset: 130 },
                    { radius: 252, duration: 74, lineOffset: 130 },
                  ]
                  const ring = ringConfig[idx % 3]
                  const baseAngle = idx * (360 / activeBadges.length)

                  return (
                    <div
                      key={badge.id}
                      className="orbit-arm-slot"
                      style={{
                        '--start-angle': `${baseAngle}deg`,
                        '--orbit-radius': `${ring.radius}px`,
                        '--orbit-duration': `${ring.duration}s`,
                      }}
                    >
                      <div className="orbit-arm-spinner">
                        {/* Connecting line belonging to this feature, moving in lockstep with it */}
                        <svg
                          className="orbit-line-canvas"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '1px',
                            height: '1px',
                            overflow: 'visible',
                            pointerEvents: 'none',
                          }}
                        >
                          <line
                            x1={ring.lineOffset}
                            y1="0"
                            x2={ring.radius - 14}
                            y2="0"
                            className="constellation-line orbit-moving-line"
                          />
                          <circle cx={ring.lineOffset} cy="0" r="2.5" className="orbit-anchor-dot" />
                          <circle cx={ring.radius - 14} cy="0" r="2" className="orbit-badge-dot" />
                        </svg>

                        {/* Feature Label Counter-Rotating so text stays horizontally upright */}
                        <div className="orbit-badge-anchor">
                          <div className="orbit-static-unrotate">
                            <div className="orbit-counter-rotator">
                              <span className="jems-module-badge">
                                {badge.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 50%: The Working Login Card */}
          <div className="jems-login-column full-panel">
            {/* Role Switcher Tabs */}
            <div className="login-role-tabs-glass">
              {Object.values(ROLE_CONFIG).map((role) => (
                <button
                  key={role.key}
                  type="button"
                  className={`role-tab-pill tab-${role.color} ${activeRole === role.key ? 'active' : ''}`}
                  onClick={() => switchRole(role.key)}
                >
                  {role.tabLabel}
                </button>
              ))}
            </div>

            {/* Login Card Form */}
            <div className="auth-card jems-glass-card">
              <div className="auth-brand-header">
                <span className={`auth-role-tag tag-${config.color}`}>{config.icon} {config.badge}</span>
                <h2 className="auth-title">{config.label}</h2>
                <p className="auth-subtitle">Sign in to access your autonomous institutional workspace</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label>Email Address / Registration USN</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={config.placeholder}
                    required
                    autoFocus
                  />
                </div>

                <div className="auth-field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="auth-error-banner" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span>{error}</span>
                    {detectedRole && ROLE_CONFIG[detectedRole] && (
                      <button
                        type="button"
                        className="auth-switch-role-btn"
                        onClick={() => switchRole(detectedRole)}
                      >
                        👉 Switch to {ROLE_CONFIG[detectedRole].tabLabel} Portal
                      </button>
                    )}
                  </div>
                )}

                <button type="submit" className={`auth-submit-btn btn-${config.color}`} disabled={loading}>
                  {loading ? 'Authenticating...' : `Sign In to ${config.tabLabel.replace(/^[^\w\s]+/, '').trim()} Portal →`}
                </button>
              </form>

              {/* Quick Feature Highlights of selected role */}
              <div className="jems-role-quick-features">
                <div className="quick-features-title">✨ Included in {config.badge}:</div>
                <div className="quick-features-grid">
                  {config.features.map((feat, idx) => (
                    <div key={idx} className="quick-feature-chip">
                      <span className="chip-tick">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="auth-footer-nav">
                <p>
                  Don't have an account?{' '}
                  <Link to={activeRole ? `/register?role=${activeRole}` : '/register'}>
                    Register
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Institutional Footer */}
        <footer className="dsatm-simple-footer">
          <div className="simple-footer-content">
            <span>© 2026 Dayananda Sagar Academy of Technology and Management (DSATM)</span>
            <span className="footer-dot">•</span>
            <span>Autonomous Institute Affiliated to VTU</span>
            <span className="footer-dot">•</span>
            <span>AI Examination & Autonomous Evaluation System</span>
          </div>
        </footer>
      </div>
    </div>
  )
}