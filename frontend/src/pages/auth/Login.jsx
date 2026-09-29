import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api, { setAuthToken } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './Auth.css'

const ROLE_CONFIG = {
  student: {
    key: 'student',
    label: 'Student Login',
    tabLabel: '🎓 Student',
    icon: '🎓',
    badge: 'Student Portal',
    color: 'blue',
    placeholder: 'Enter USN or Email',
    previewTitle: 'Student Features',
    features: [
      'Course Materials & Lecture Notes',
      'AI Study Assistant & Practice Quizzes',
      'Published Results & Transcripts',
      'College Notices & Timetables',
    ],
  },
  faculty: {
    key: 'faculty',
    label: 'Faculty Login',
    tabLabel: '🛡️ Faculty',
    icon: '🛡️',
    badge: 'Faculty Portal',
    color: 'emerald',
    placeholder: 'Enter Faculty Email',
    previewTitle: 'Faculty Features',
    features: [
      'Upload Course Materials & Syllabus PDFs',
      'Generate AI Question Papers & Schemes',
      'Review AI Answer Sheet Evaluation',
      'Class Performance Analytics',
    ],
  },
  hod: {
    key: 'hod',
    label: 'HOD Login',
    tabLabel: '🏛️ HOD',
    icon: '🏛️',
    badge: 'HOD Portal',
    color: 'purple',
    placeholder: 'Enter HOD Email',
    previewTitle: 'HOD Features',
    features: [
      'Department Pass/Fail Analytics',
      'Transfer Top Performers to Principal',
      'Faculty Messaging & Notices',
      'Manage Department Info',
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
      'Publish Official Announcements',
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
      'Assign Answer Sheets for AI Evaluation',
      'Verify & Audit AI Marks',
      'Publish Official Results',
    ],
  },
}

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeRole = searchParams.get('role') || 'student'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const config = ROLE_CONFIG[activeRole] || ROLE_CONFIG.student

  function switchRole(roleKey) {
    setSearchParams({ role: roleKey })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password, role: activeRole })

      setAuthToken(data.token)
      login(data.user)
      navigate(`/${data.user.role}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Header with College Name & Logo */}
        <header className="auth-header-bar">
          <div className="auth-header-brand">
            <div className="auth-logo-box">
              <img src="/dsi-logo.png" alt="DSI Logo" className="auth-dsi-logo" />
            </div>
            <div>
              <h2 className="auth-college-name">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h2>
              <p className="auth-college-sub">Autonomous Institute Affiliated to VTU • AI Examination Portal</p>
            </div>
          </div>
          <Link to="/" className="auth-back-link">
            ← Main Portal
          </Link>
        </header>

        {/* Quick Role Switcher Tabs */}
        <div className="login-role-tabs">
          {Object.values(ROLE_CONFIG).map((role) => (
            <button
              key={role.key}
              type="button"
              className={`role-tab-btn tab-${role.color} ${activeRole === role.key ? 'active' : ''}`}
              onClick={() => switchRole(role.key)}
            >
              {role.tabLabel}
            </button>
          ))}
        </div>

        <div className="auth-content-grid">
          {/* Main Clean Login Card */}
          <div className="auth-card">
            <div className="auth-brand-header">
              <span className="auth-role-tag">{config.icon} {config.badge}</span>
              <h1 className="auth-title">{config.label}</h1>
              <p className="auth-subtitle">Sign in to access your portal</p>
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

              {error && <div className="auth-error-banner">{error}</div>}

              <button type="submit" className={`auth-submit-btn btn-${config.color}`} disabled={loading}>
                {loading ? 'Authenticating...' : `Sign In →`}
              </button>
            </form>

            <div className="auth-footer-nav">
              <p>
                Don't have an account?{' '}
                <Link to={activeRole ? `/register?role=${activeRole}` : '/register'}>
                  Register
                </Link>
              </p>
            </div>
          </div>

          {/* Role Access Info & Feature Panel */}
          <div className="auth-info-panel">
            <div className="info-panel-header">
              <span className="info-badge">{config.icon} {config.badge} GUIDE</span>
              <h3>{config.previewTitle}</h3>
            </div>

            <div className="info-features-list">
              {config.features.map((feature, idx) => (
                <div key={idx} className="info-feature-item">
                  <span className="feature-bullet">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="info-panel-footer">
              <div className="footer-shield-tag">
                🔒 Secure Permission System • DSATM Autonomous
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}