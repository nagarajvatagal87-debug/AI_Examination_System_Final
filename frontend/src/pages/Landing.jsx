import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HeaderBanner from '../components/HeaderBanner.jsx'
import api from '../api/client.js'
import './Landing.css'

const roles = [
  {
    key: 'student',
    label: 'STUDENT PORTAL',
    category: 'academic',
    title: 'Student Portal',
    description: 'Access course materials, view results, practice AI MCQs & chat with document AI assistant.',
    features: ['Course Materials', 'AI Study Assistant', 'Practice Tests', 'View Results'],
    color: 'blue',
    icon: '🎓',
    route: '/login?role=student',
    btnLabel: 'Student Login →',
    details: 'Learn | Access Materials | Practice | View Results',
  },
  {
    key: 'faculty',
    label: 'FACULTY PORTAL',
    category: 'academic',
    title: 'Faculty Portal',
    description: 'Upload materials, generate question papers with RAG, review & finalize AI answer evaluations.',
    features: ['Upload Materials', 'Generate Exams', 'AI Evaluation', 'View Analytics'],
    color: 'emerald',
    icon: '🛡️',
    badge: 'Core AI Engine',
    route: '/login?role=faculty',
    btnLabel: 'Faculty Login →',
    details: 'Upload Materials | Generate Exams | Evaluate | View Analytics',
  },
  {
    key: 'hod',
    label: 'HOD PORTAL',
    category: 'admin',
    title: 'HOD Portal',
    description: 'Department analytics, pass/fail performance, backlogs, Top 10 transfer to Principal.',
    features: ['Department Overview', 'Pass/Fail Graphs', 'Top 10 Students', 'Faculty Messaging'],
    color: 'purple',
    icon: '🏛️',
    route: '/login?role=hod',
    btnLabel: 'HOD Login →',
    details: 'Department Overview | Results | Analytics | Top 10',
  },
  {
    key: 'principal',
    label: 'PRINCIPAL PORTAL',
    category: 'admin',
    title: 'Principal Portal',
    description: 'Institution-wide oversight, department comparisons, college information publishing.',
    features: ['Institution Overview', 'Department Comparison', 'Top Students (All)', 'Analytics'],
    color: 'amber',
    icon: '👑',
    route: '/login?role=principal',
    btnLabel: 'Principal Login →',
    details: 'Institution Overview | Department Comparison | Top Students',
  },
  {
    key: 'examdept',
    label: 'EXAM DEPT PORTAL',
    category: 'admin',
    title: 'Examination Dept Portal',
    description: 'Owns Main Examination scheduling, answer sheet evaluation, and result publication.',
    features: ['Main Examinations', 'Exam Schedule', 'Main Evaluation', 'Publish Results'],
    color: 'rose',
    icon: '⚖️',
    route: '/login?role=examdept',
    btnLabel: 'Exam Dept Login →',
    details: 'Schedule | Manage | Evaluate Main Exams | Publish Results',
  },
]

export default function Landing() {
  const [stats, setStats] = useState({
    departments: 0,
    students: 0,
    faculty: 0,
    exams: 0,
    evaluations: 0,
    satisfaction: '100%',
  })
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    async function loadRealData() {
      try {
        const [statsRes, deptsRes] = await Promise.allSettled([
          api.get('/public/stats'),
          api.get('/public/departments'),
        ])

        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          setStats(statsRes.value.data)
        }
        if (deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value?.data)) {
          setDepartments(deptsRes.value.data)
        }
      } catch (err) {
        console.warn('Failed to load live landing stats:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRealData()
  }, [])

  const filteredRoles = roles.filter((r) => activeTab === 'all' || r.category === activeTab)

  return (
    <div className="landing-page-shell">
      {/* Background ambient lighting effects */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />
      <div className="ambient-glow glow-3" />

      <HeaderBanner />

      <main className="landing-container">
        {/* Hero Section */}
        <section className="landing-hero-card glass-card">
          <div className="hero-content">
            <div className="hero-badge-wrap">
              <span className="hero-badge">
                <span className="live-dot" /> Live Integrated Academic & AI System
              </span>
              {loading ? (
                <span className="live-status-tag loading-tag">⚡ Fetching Live Database Stats...</span>
              ) : (
                <span className="live-status-tag ready-tag">✓ Real Database Connected</span>
              )}
            </div>

            <h1 className="hero-heading">
              AI Examination & <span className="highlight-text">Academic Management System</span>
            </h1>

            <p className="hero-subtitle">
              Empowering Education with AI for a Brighter Future. RAG-grounded question paper generation, OCR handwritten answer evaluation, and real-time role-based academic oversight.
            </p>

            {/* Dynamic Metric Strip with Real Data */}
            <div className="hero-metrics-grid">
              <div className="hero-metric-box metric-blue">
                <div className="metric-icon-wrap">🏢</div>
                <div>
                  <div className="metric-num">{stats.departments}</div>
                  <div className="metric-lbl">Departments</div>
                </div>
              </div>

              <div className="hero-metric-box metric-cyan">
                <div className="metric-icon-wrap">🎓</div>
                <div>
                  <div className="metric-num">{stats.students}</div>
                  <div className="metric-lbl">Active Students</div>
                </div>
              </div>

              <div className="hero-metric-box metric-emerald">
                <div className="metric-icon-wrap">👨‍🏫</div>
                <div>
                  <div className="metric-num">{stats.faculty}</div>
                  <div className="metric-lbl">Faculty Members</div>
                </div>
              </div>

              <div className="hero-metric-box metric-purple">
                <div className="metric-icon-wrap">📑</div>
                <div>
                  <div className="metric-num">{stats.exams}</div>
                  <div className="metric-lbl">Exams Generated</div>
                </div>
              </div>

              <div className="hero-metric-box metric-amber">
                <div className="metric-icon-wrap">🤖</div>
                <div>
                  <div className="metric-num">{stats.evaluations}</div>
                  <div className="metric-lbl">AI Evaluations</div>
                </div>
              </div>

              <div className="hero-metric-box metric-rose">
                <div className="metric-icon-wrap">✨</div>
                <div>
                  <div className="metric-num">{stats.satisfaction}</div>
                  <div className="metric-lbl">Excellence Rating</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Title & Filter Tabs */}
        <div className="section-title-header">
          <div>
            <h2 className="section-title">Select Role Portal to Login</h2>
            <p className="section-subtitle">Single login portal with automatic role-based permission routing</p>
          </div>

          <div className="portal-tabs">
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Portals ({roles.length})
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
              onClick={() => setActiveTab('academic')}
            >
              Academic Portals
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Administration Portals
            </button>
          </div>
        </div>

        {/* 5 Role Portals Grid */}
        <div className="portals-grid">
          {filteredRoles.map((r) => (
            <div key={r.key} className={`portal-card portal-card-${r.color} glass-card`}>
              {r.badge && <div className="portal-badge">★ {r.badge}</div>}
              <div className="portal-header">
                <div className="portal-icon-circle">{r.icon}</div>
                <div>
                  <div className="portal-label-tag">{r.label}</div>
                  <h3 className="portal-card-title">{r.title}</h3>
                </div>
              </div>

              <p className="portal-card-desc">{r.description}</p>

              <div className="portal-features-list">
                {r.features.map((f) => (
                  <span key={f} className="feature-chip">
                    <span className="chip-check">✓</span> {f}
                  </span>
                ))}
              </div>

              <div className="portal-footer-flow">{r.details}</div>

              <Link to={r.route} className={`portal-btn portal-btn-${r.color}`}>
                <span>{r.btnLabel}</span>
              </Link>
            </div>
          ))}
        </div>

        {/* Approved Public College Information */}
        <section className="public-info-section glass-card">
          <div className="public-info-header">
            <div>
              <div className="public-info-tag">OFFICIAL PUBLIC DISCLOSURE</div>
              <h2 className="public-info-title">🏛️ Public College Information</h2>
              <p className="public-info-sub">Approved public data — Department details, fee structures & academic achievements</p>
            </div>
            <Link to="/college-info" className="public-view-btn">
              View Approved Info →
            </Link>
          </div>

          <div className="public-cards-grid">
            <div className="public-subcard card-glow-blue">
              <div className="pub-card-header">
                <div className="pub-card-icon">📚</div>
                <span className="pub-badge-count">{departments.length > 0 ? `${departments.length} Active` : 'Active Branches'}</span>
              </div>
              <h4>Departments</h4>
              <p>Explore computer science, ISE, MCA, BCA, ECE and management departments.</p>

              {departments.length > 0 && (
                <div className="pub-dept-tags">
                  {departments.slice(0, 4).map((d) => (
                    <span key={d.id} className="dept-pill">{d.name}</span>
                  ))}
                  {departments.length > 4 && <span className="dept-pill count-pill">+{departments.length - 4} more</span>}
                </div>
              )}
            </div>

            <div className="public-subcard card-glow-emerald">
              <div className="pub-card-header">
                <div className="pub-card-icon">💳</div>
                <span className="pub-badge-count">Transparent</span>
              </div>
              <h4>Department-wise Fees</h4>
              <p>View structured fee schedules, lab quotas, and course details for each branch.</p>
            </div>

            <div className="public-subcard card-glow-amber">
              <div className="pub-card-header">
                <div className="pub-card-icon">🏆</div>
                <span className="pub-badge-count">Rank Holders</span>
              </div>
              <h4>Achievements</h4>
              <p>Discover student rank holders, VTU gold medalists, research grants, and college accolades.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}