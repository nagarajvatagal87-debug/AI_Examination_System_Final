import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api, { setAuthToken } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './Auth.css'

const ROLE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  hod: 'HOD',
  principal: 'Principal',
  examdept: 'Examination Dept',
  lms: 'LMS Portal',
}

const ROLE_PRESETS = {
  student: { email: '1dt25mc036@dsatm.edu.in', label: '🎓 Student Account' },
  faculty: { email: 'priya@gmail.com', label: '🛡️ Faculty Account' },
  hod: { email: 'naga2003@gmail.com', label: '🏛️ HOD Account' },
  principal: { email: 'nagarajvatagal8@gmail.com', label: '👑 Principal Account' },
}

export default function Login() {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const roleLabel = ROLE_LABELS[roleParam] || null

  function fillPreset(role) {
    const preset = ROLE_PRESETS[role]
    if (preset) {
      setEmail(preset.email)
      setPassword('Password123!')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password, role: roleParam })

      setAuthToken(data.token)
      login(data.user)
      navigate(`/${data.user.role}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <h1 className="auth-title">{roleLabel ? `${roleLabel} Login` : 'AI Examination System'}</h1>
        <p className="auth-subtitle">{roleLabel ? `Sign in to your ${roleLabel} portal` : 'Enter your registered credentials'}</p>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email or Registration Number</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@college.edu or Reg No"
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

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-login-section" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10, textAlign: 'center' }}>⚡ Quick Fill Registered Accounts</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              onClick={() => fillPreset('faculty')}
              style={{ padding: '8px 10px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, color: '#a5b4fc', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              🛡️ Faculty
            </button>
            <button
              type="button"
              onClick={() => fillPreset('student')}
              style={{ padding: '8px 10px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 8, color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => fillPreset('hod')}
              style={{ padding: '8px 10px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 8, color: '#d8b4fe', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              🏛️ HOD
            </button>
            <button
              type="button"
              onClick={() => fillPreset('principal')}
              style={{ padding: '8px 10px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 8, color: '#fdba74', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              👑 Principal
            </button>
          </div>
        </div>

        <p className="auth-footer" style={{ marginTop: 20 }}>
          Need a new account?{' '}
          <Link to={roleParam ? `/register?role=${roleParam}` : '/register'}>Create Account</Link>
        </p>
      </div>
    </div>
  )
}