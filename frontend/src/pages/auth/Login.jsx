import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api, { setAuthToken } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './Auth.css'

const ROLE_CONFIG = {
  student: {
    key: 'student',
    label: 'Student Portal Login',
    tabLabel: '🎓 Student',
    icon: '🎓',
    badge: 'Student Account',
    color: 'blue',
    placeholder: 'e.g. 1dt25mc036@dsatm.edu.in or USN',
    previewTitle: 'What Students Can See & Access:',
    features: [
      '📚 Course Materials, Lecture Slides & Reference PDFs',
      '🤖 AI Study Assistant & Practice Test Quizzes',
      '📊 Published Exam Results, Marks & Transcripts',
      '🏛️ Approved Public College Information & Fees',
    ],
  },
  faculty: {
    key: 'faculty',
    label: 'Faculty Portal Login',
    tabLabel: '🛡️ Faculty',
    icon: '🛡️',
    badge: 'Faculty Account',
    color: 'emerald',
    placeholder: 'e.g. faculty@dsatm.edu.in',
    previewTitle: 'What Faculty Can See & Access:',
    features: [
      '📤 Upload Course Materials & Syllabus PDFs',
      '📑 Generate AI RAG Question Papers & Schemes',
      '🤖 Review & Finalize AI Answer Sheet Evaluations',
      '📈 View Class & Subject Performance Analytics',
    ],
  },
  hod: {
    key: 'hod',
    label: 'HOD Portal Login',
    tabLabel: '🏛️ HOD',
    icon: '🏛️',
    badge: 'HOD Account',
    color: 'purple',
    placeholder: 'e.g. hod.mca@dsatm.edu.in',
    previewTitle: 'What HODs Can See & Access:',
    features: [
      '📊 Department Pass/Fail Performance Graphs & Backlogs',
      '🏆 Nominate & Transfer Top 10 Performers to Principal',
      '💬 Faculty Direct Messaging & Department Notices',
      '📢 Manage & Publish Department Public Profiles',
    ],
  },
  principal: {
    key: 'principal',
    label: 'Principal Portal Login',
    tabLabel: '👑 Principal',
    icon: '👑',
    badge: 'Principal Oversight',
    color: 'amber',
    placeholder: 'e.g. principal@dsatm.edu.in',
    previewTitle: 'What Principal Can See & Access:',
    features: [
      '🏛️ Institution-Wide Academic Performance Oversight',
      '📊 Inter-Department Comparative Analytics & Graphs',
      '🏆 College-Wide Top 10 Meritorious Students',
      '📢 Publish Official College Announcements',
    ],
  },
  examdept: {
    key: 'examdept',
    label: 'Exam Dept Portal Login',
    tabLabel: '⚖️ Exam Dept',
    icon: '⚖️',
    badge: 'Exam Administration',
    color: 'rose',
    placeholder: 'e.g. examdept@dsatm.edu.in',
    previewTitle: 'What Exam Dept Can See & Access:',
    features: [
      '📅 Schedule Main Examinations & Semester Timetables',
      '📝 Assign Answer Sheets for AI RAG Evaluation',
      '✅ Verify & Audit AI Evaluation Marks',
      '🚀 Official Result Publication System',
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
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Navigation Bar */}
        <div className="auth-top-nav">
          <Link to="/" className="auth-back-link">
            ← Back to Main Portal
          </Link>
          <span className="auth-top-tag">
            DSATM • AI Examination System
          </span>
        </div>

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
          <div className="auth-card glass-card">
            <div className="auth-brand-header">
              <div className="auth-logo-frame">
                <img src="/dsi-logo.png" alt="DSI Logo" className="auth-logo-img" />
              </div>
              <div>
                <span className="auth-role-tag">{config.icon} {config.badge}</span>
                <h1 className="auth-title">{config.label}</h1>
                <p className="auth-subtitle">Sign in to access your portal dashboard</p>
              </div>
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
                {loading ? 'Authenticating...' : `Sign In to ${config.badge} →`}
              </button>
            </form>

            <div className="auth-footer-nav">
              <p>
                Don't have an account?{' '}
                <Link to={activeRole ? `/register?role=${activeRole}` : '/register'}>
                  Register Here
                </Link>
              </p>
            </div>
          </div>

          {/* Role Access Info & Feature Panel */}
          <div className="auth-info-panel glass-card">
            <div className="info-panel-header">
              <span className="info-badge">{config.icon} {config.badge} GUIDE</span>
              <h3>{config.previewTitle}</h3>
              <p>Features and tools unlocked for you upon logging in with your account.</p>
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
                🔒 Secure Role-Based Permission System • DSATM Autonomous
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}