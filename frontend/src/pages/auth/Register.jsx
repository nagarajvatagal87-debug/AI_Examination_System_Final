import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export default function Register() {
  const [searchParams] = useSearchParams()
  const roleFromUrl = searchParams.get('role')

  const [role, setRole] = useState(roleFromUrl || 'student')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState([])
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    publicApi.get('/public/departments').then((res) => setDepartments(res.data)).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await publicApi.post('/auth/register', {
        email,
        password,
        fullName,
        role,
        registrationNo: role === 'student' ? registrationNo || undefined : undefined,
        year: role === 'student' && year ? Number(year) : undefined,
        section: role === 'student' ? section || undefined : undefined,
        departmentId: role !== 'principal' && role !== 'examdept' ? departmentId || undefined : undefined,
        inviteCode: inviteCode || undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Account Created!</h1>
          <p className="auth-subtitle">Redirecting you to login screen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Set up your AI Examination Platform login</p>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="hod">HOD (Head of Department)</option>
              <option value="principal">Principal</option>
              <option value="examdept">Examination Department</option>
            </select>
          </div>

          <div className="auth-field">
            <label>Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Enter full name" />
          </div>

          <div className="auth-field">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@college.edu" />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Minimum 6 characters" />
          </div>

          {role === 'student' && (
            <>
              <div className="auth-field">
                <label>Registration / ID Number (Optional)</label>
                <input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} placeholder="e.g. MCA001" />
              </div>
              <div className="auth-field">
                <label>Academic Year (Optional)</label>
                <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1, 2, 3, 4" />
              </div>
              <div className="auth-field">
                <label>Section (Optional)</label>
                <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="A, B, C" />
              </div>
            </>
          )}

          {role !== 'principal' && role !== 'examdept' && (
            <div className="auth-field">
              <label>Department (Optional)</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}