import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './DashboardHome.css'

export default function DashboardHome() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [mySubjects, setMySubjects] = useState([])
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubName, setNewSubName] = useState('')
  const [newSubCode, setNewSubCode] = useState('')
  const [msg, setMsg] = useState('')

  const subjectColors = ['#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981']

  function loadDashboard() {
    api.get('/faculty/dashboard-summary')
      .then((res) => setStats(res.data))
      .catch(() => setStats({ facultyName: user?.fullName || 'Faculty', subjectCount: 0, examCount: 0, studentCount: 0, pendingEvaluations: 0 }))

    api.get('/subjects?mine=true')
      .then((res) => setMySubjects(res.data || []))
      .catch(() => setMySubjects([]))
  }

  useEffect(() => { loadDashboard() }, [user])

  async function handleAddSubject(e) {
    e.preventDefault()
    if (!newSubName.trim()) return
    setMsg('Adding subject...')
    try {
      await api.post('/subjects', { name: newSubName, code: newSubCode })
      setMsg('Subject created successfully!')
      setNewSubName('')
      setNewSubCode('')
      setShowAddSubject(false)
      loadDashboard()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create subject')
    }
  }

  async function handleDeleteExam(examId, e) {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this examination?')) return
    try {
      await api.delete(`/faculty/exams/${examId}`)
      loadDashboard()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete exam')
    }
  }

  // Deduplicate recent exams by ID
  const uniqueRecentExams = (stats?.recentExams || []).filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id)
  )

  return (
    <div className="dh-wrap">
      {/* Top Banner Greeting */}
      <div className="dh-greeting-card glass-card">
        <div>
          <h2 className="dh-welcome">Welcome, {stats?.facultyName || user?.fullName || 'Faculty'}! 👋</h2>
          <p className="dh-sub">Assistant Professor | Department of Computer Science & Engineering (MCA)</p>
        </div>
        <div className="quote-pill">"Teaching is shaping a better future."</div>
      </div>

      {/* 4 Key Stat Cards - Computed from real DB data */}
      <div className="dh-cards">
        <div className="dh-card glass-card">
          <div className="card-icon-bubble blue">📚</div>
          <div>
            <div className="dh-card-value">{mySubjects.length}</div>
            <div className="dh-card-label">My Subjects</div>
          </div>
        </div>

        <div className="dh-card glass-card">
          <div className="card-icon-bubble green">📝</div>
          <div>
            <div className="dh-card-value">{stats?.examCount || 0}</div>
            <div className="dh-card-label">Active Exams</div>
          </div>
        </div>

        <div className="dh-card glass-card">
          <div className="card-icon-bubble purple">👥</div>
          <div>
            <div className="dh-card-value">{stats?.studentCount || 0}</div>
            <div className="dh-card-label">Total Students</div>
          </div>
        </div>

        <div className="dh-card glass-card highlight">
          <div className="card-icon-bubble orange">⏳</div>
          <div>
            <div className="dh-card-value">{stats?.pendingEvaluations || 0}</div>
            <div className="dh-card-label">Pending Evaluations</div>
          </div>
        </div>
      </div>

      {/* Middle Grid: My Subjects & Evaluation Donut Progress */}
      <div className="dh-grid-split">
        {/* My Subjects Grid */}
        <div className="glass-card dh-section-box">
          <div className="dh-section-header">
            <h3>My Subjects ({mySubjects.length})</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="fd-btn" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setShowAddSubject(true)}>
                + Add Subject
              </button>
              <Link to="/faculty/subjects" className="dh-link">Manage</Link>
            </div>
          </div>

          {showAddSubject && (
            <form onSubmit={handleAddSubject} style={{ background: 'rgba(15,23,42,0.8)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.15)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#38bdf8' }}>Create New Subject</h4>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Subject Name (e.g. Cloud Computing)"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  required
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13 }}
                />
                <input
                  type="text"
                  placeholder="Subject Code (e.g. CC-301)"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  style={{ width: 140, padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="fd-btn" style={{ flex: 1 }}>Save Subject</button>
                <button type="button" className="fd-btn fd-btn-secondary" onClick={() => setShowAddSubject(false)}>Cancel</button>
              </div>
            </form>
          )}

          {msg && <p style={{ fontSize: 12, color: '#10b981', margin: '0 0 10px 0' }}>{msg}</p>}

          <div className="faculty-subject-grid">
            {mySubjects.map((s, idx) => (
              <div key={s.id} className="fac-sub-card" style={{ borderLeft: `4px solid ${subjectColors[idx % subjectColors.length]}` }}>
                <div className="fac-sub-name">{s.name}</div>
                <div className="fac-sub-count">{s.code || 'Enrolled'}</div>
              </div>
            ))}
            {mySubjects.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', width: '100%', gridColumn: '1 / -1' }}>
                <p style={{ margin: '0 0 10px 0' }}>No subjects added by you yet.</p>
                <button className="fd-btn" onClick={() => setShowAddSubject(true)}>+ Add Your First Subject</button>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Progress Box */}
        <div className="glass-card dh-section-box eval-donut-box">
          <h3>Evaluation Progress Overview</h3>

          <div className="donut-container">
            <div className="donut-graphic">
              <svg width="120" height="120" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3.8" />
                <path strokeDasharray={stats?.pendingEvaluations ? "50, 100" : "100, 100"} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.8" strokeLinecap="round" />
              </svg>
              <div className="donut-center-text">
                <span className="donut-percent">{stats?.pendingEvaluations ? '50%' : '100%'}</span>
              </div>
            </div>

            <div className="donut-legend">
              <div className="legend-item">
                <span className="dot green-dot" />
                <span>Active Exams ({stats?.examCount || 0})</span>
              </div>
              <div className="legend-item">
                <span className="dot amber-dot" />
                <span>Pending Evaluations ({stats?.pendingEvaluations || 0})</span>
              </div>
              <div className="total-label">{stats?.pendingEvaluations || 0} Pending Reviews</div>
              <Link to="/faculty/evaluation" className="fd-btn eval-btn-cta">
                Go to Evaluation →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Activities & Quick Actions */}
      <div className="dh-grid-split">
        <div className="glass-card dh-section-box">
          <div className="dh-section-header">
            <h3>Recent Activities</h3>
            <span className="dh-link">View All</span>
          </div>

          <div className="act-list">
            {uniqueRecentExams.map((e) => (
              <div key={e.id} className="act-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="act-icon blue">📝</div>
                  <div>
                    <div className="act-title">{e.title} ({e.subjectName})</div>
                    <div className="act-time">Status: {e.status} · Max {e.totalMarks} marks</div>
                  </div>
                </div>
                <button
                  className="fd-btn"
                  onClick={(evt) => handleDeleteExam(e.id, evt)}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '4px 10px', fontSize: 12, borderRadius: 6 }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
            {uniqueRecentExams.length === 0 && (
              <p className="hint" style={{ padding: 12 }}>No recent examination activities yet. Generate a question paper to begin.</p>
            )}
          </div>
        </div>

        <div className="glass-card dh-section-box">
          <h3>Quick Actions</h3>
          <div className="quick-actions-flex">
            <Link to="/faculty/subjects" className="qa-button qa-upload">
              <span className="qa-icon">📤</span>
              <div>
                <div className="qa-title">Upload Course Material</div>
                <div className="qa-sub">Publish PDFs for RAG Q&A</div>
              </div>
            </Link>

            <Link to="/faculty/examinations/create" className="qa-button qa-gen">
              <span className="qa-icon">🧠</span>
              <div>
                <div className="qa-title">Generate Question Paper</div>
                <div className="qa-sub">AI RAG candidate generation</div>
              </div>
            </Link>

            <Link to="/faculty/evaluation" className="qa-button qa-eval">
              <span className="qa-icon">✍️</span>
              <div>
                <div className="qa-title">Evaluate Answer Sheets</div>
                <div className="qa-sub">OCR + Rubric AI review</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}