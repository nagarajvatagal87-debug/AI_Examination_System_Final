import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './DashboardHome.css'

export default function DashboardHome() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/faculty/dashboard-summary')
      .then((res) => setStats(res.data))
      .catch(() => {
        // Fallback demo structure if endpoint is loading
        setStats({
          facultyName: user?.fullName || 'Dr. Priya Sharma',
          subjectCount: 6,
          examCount: 3,
          studentCount: 87,
          pendingEvaluations: 25,
          recentExams: [
            { id: 'ex-1', title: 'DBMS Internal-1', subjectName: 'DBMS', totalMarks: 50, status: 'evaluation' },
            { id: 'ex-2', title: 'DSA Internal-2', subjectName: 'DSA', totalMarks: 50, status: 'draft' },
            { id: 'ex-3', title: 'CN Internal-1', subjectName: 'CN', totalMarks: 50, status: 'published' },
          ]
        })
      })
  }, [user])

  const subjectsList = [
    { name: 'DBMS', code: 'DBMS-301', students: 87, color: '#3b82f6' },
    { name: 'DSA', code: 'DSA-302', students: 82, color: '#6366f1' },
    { name: 'Computer Networks', code: 'CN-303', students: 78, color: '#f59e0b' },
    { name: 'Operating Systems', code: 'OS-304', students: 76, color: '#ec4899' },
    { name: 'Artificial Intelligence', code: 'AI-305', students: 80, color: '#8b5cf6' },
    { name: 'Generative AI', code: 'GAI-306', students: 74, color: '#10b981' },
  ]

  return (
    <div className="dh-wrap">
      {/* Top Banner Greeting */}
      <div className="dh-greeting-card glass-card">
        <div>
          <h2 className="dh-welcome">Welcome, {stats?.facultyName || 'Dr. Priya Sharma'}! 👋</h2>
          <p className="dh-sub">Assistant Professor | Department of Computer Science & Engineering (MCA)</p>
        </div>
        <div className="quote-pill">"Teaching is shaping a better future."</div>
      </div>

      {/* 4 Key Stat Cards */}
      <div className="dh-cards">
        <div className="dh-card glass-card">
          <div className="card-icon-bubble blue">📚</div>
          <div>
            <div className="dh-card-value">{stats?.subjectCount || 6}</div>
            <div className="dh-card-label">My Subjects</div>
          </div>
        </div>

        <div className="dh-card glass-card">
          <div className="card-icon-bubble green">📝</div>
          <div>
            <div className="dh-card-value">{stats?.examCount || 3}</div>
            <div className="dh-card-label">Active Exams</div>
          </div>
        </div>

        <div className="dh-card glass-card">
          <div className="card-icon-bubble purple">👥</div>
          <div>
            <div className="dh-card-value">{stats?.studentCount || 87}</div>
            <div className="dh-card-label">Total Students</div>
          </div>
        </div>

        <div className="dh-card glass-card highlight">
          <div className="card-icon-bubble orange">⏳</div>
          <div>
            <div className="dh-card-value">{stats?.pendingEvaluations || 25}</div>
            <div className="dh-card-label">Pending Evaluations</div>
          </div>
        </div>
      </div>

      {/* Middle Grid: My Subjects & Evaluation Donut Progress Chart */}
      <div className="dh-grid-split">
        {/* My Subjects Grid */}
        <div className="glass-card dh-section-box">
          <div className="dh-section-header">
            <h3>My Subjects</h3>
            <Link to="/faculty/subjects" className="dh-link">Manage</Link>
          </div>

          <div className="faculty-subject-grid">
            {subjectsList.map((s, idx) => (
              <div key={idx} className="fac-sub-card" style={{ borderLeft: `4px solid ${s.color}` }}>
                <div className="fac-sub-name">{s.name}</div>
                <div className="fac-sub-count">{s.students} Students</div>
              </div>
            ))}
          </div>
        </div>

        {/* Evaluation Progress Donut Chart (71% Evaluated - 62 Evaluated, 25 Pending) */}
        <div className="glass-card dh-section-box eval-donut-box">
          <h3>Evaluation Progress (DBMS - Internal 1)</h3>

          <div className="donut-container">
            <div className="donut-graphic">
              <svg width="120" height="120" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.8" />
                <path strokeDasharray="71, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.8" strokeLinecap="round" />
              </svg>
              <div className="donut-center-text">
                <span className="donut-percent">71%</span>
              </div>
            </div>

            <div className="donut-legend">
              <div className="legend-item">
                <span className="dot green-dot" />
                <span>Evaluated (62)</span>
              </div>
              <div className="legend-item">
                <span className="dot amber-dot" />
                <span>Pending (25)</span>
              </div>
              <div className="total-label">62 / 87 Students Evaluated</div>
              <Link to="/faculty/evaluation" className="fd-btn eval-btn-cta">
                Go to Evaluation →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Activities & Quick Actions */}
      <div className="dh-grid-split">
        {/* Recent Activities Timeline */}
        <div className="glass-card dh-section-box">
          <div className="dh-section-header">
            <h3>Recent Activities</h3>
            <span className="dh-link">View All</span>
          </div>

          <div className="act-list">
            <div className="act-item">
              <div className="act-icon blue">📄</div>
              <div>
                <div className="act-title">Uploaded DBMS Unit 1.pdf</div>
                <div className="act-time">2 hours ago</div>
              </div>
            </div>

            <div className="act-item">
              <div className="act-icon purple">🧠</div>
              <div>
                <div className="act-title">Generated AI Question Paper (DSA Internal-2)</div>
                <div className="act-time">5 hours ago</div>
              </div>
            </div>

            <div className="act-item">
              <div className="act-icon green">✍️</div>
              <div>
                <div className="act-title">Evaluated 10 answer sheets (DBMS Internal-1)</div>
                <div className="act-time">Yesterday</div>
              </div>
            </div>

            <div className="act-item">
              <div className="act-icon orange">💬</div>
              <div>
                <div className="act-title">Received internal complaint (MCA003)</div>
                <div className="act-time">Yesterday</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
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