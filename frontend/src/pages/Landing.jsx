import { Link } from 'react-router-dom'
import HeaderBanner from '../components/HeaderBanner.jsx'
import './Landing.css'

const roles = [
  {
    key: 'student',
    label: 'STUDENT PORTAL',
    title: 'Student Portal',
    description: 'Access course materials, view results, practice AI MCQs & chat with document AI.',
    features: ['Course Materials', 'AI Study Assistant', 'Practice Tests', 'View Results'],
    color: 'blue',
    icon: '🎓',
    route: '/login',
    btnLabel: 'Student Login →',
    details: 'Learn | Access Materials | Practice | View Results',
  },
  {
    key: 'faculty',
    label: 'FACULTY PORTAL',
    title: 'Faculty Portal',
    description: 'Upload materials, generate question papers with RAG, review & finalize AI answer evaluations.',
    features: ['Upload Materials', 'Generate Exams', 'AI Evaluation', 'View Analytics'],
    color: 'emerald',
    icon: '🛡️',
    badge: 'Core Internal Engine',
    route: '/login',
    btnLabel: 'Faculty Login →',
    details: 'Upload Materials | Generate Exams | Evaluate | View Analytics',
  },
  {
    key: 'hod',
    label: 'HOD PORTAL',
    title: 'HOD Portal',
    description: 'Department analytics, pass/fail performance, backlogs, Top 10 transfer to Principal.',
    features: ['Department Overview', 'Pass/Fail Graphs', 'Top 10 Students', 'Faculty Messaging'],
    color: 'purple',
    icon: '🏛️',
    route: '/login',
    btnLabel: 'HOD Login →',
    details: 'Department Overview | Results | Analytics | Top 10',
  },
  {
    key: 'principal',
    label: 'PRINCIPAL PORTAL',
    title: 'Principal Portal',
    description: 'Institution-wide oversight, department comparisons, college information publishing.',
    features: ['Institution Overview', 'Department Comparison', 'Top Students (All)', 'Analytics'],
    color: 'amber',
    icon: '👑',
    route: '/login',
    btnLabel: 'Principal Login →',
    details: 'Institution Overview | Department Comparison | Top Students',
  },
  {
    key: 'examdept',
    label: 'EXAM DEPT PORTAL',
    title: 'Examination Dept Portal',
    description: 'Owns Main Examination scheduling, answer sheet evaluation, and result publication.',
    features: ['Main Examinations', 'Exam Schedule', 'Main Evaluation', 'Publish Results'],
    color: 'rose',
    icon: '⚖️',
    route: '/login',
    btnLabel: 'Exam Dept Login →',
    details: 'Schedule | Manage | Evaluate Main Exams | Publish Results',
  },
]

export default function Landing() {
  return (
    <div className="landing-page-shell">
      <HeaderBanner />

      <main className="landing-container">
        {/* Hero Section */}
        <section className="landing-hero-card glass-card">
          <div className="hero-content">
            <span className="hero-badge">● Live Integrated Academic & AI System</span>
            <h1 className="hero-heading">
              AI Examination & <span className="highlight-text">Academic Management System</span>
            </h1>
            <p className="hero-subtitle">
              Empowering Education with AI for a Brighter Future. RAG-grounded question paper generation, OCR handwritten answer evaluation, and role-based academic oversight.
            </p>

            <div className="hero-metrics-strip">
              <div className="hero-metric">
                <div className="metric-num">4</div>
                <div className="metric-lbl">Departments</div>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric">
                <div className="metric-num">428</div>
                <div className="metric-lbl">Students</div>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric">
                <div className="metric-num">25</div>
                <div className="metric-lbl">Faculty Members</div>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric">
                <div className="metric-num">100%</div>
                <div className="metric-lbl">Committed to Excellence</div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 Role Portals Grid */}
        <div className="section-title-wrap">
          <h2 className="section-title">Select Role Portal to Login</h2>
          <p className="section-subtitle">Single login portal with automatic role-based permission routing</p>
        </div>

        <div className="portals-grid">
          {roles.map((r) => (
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
                  <span key={f} className="feature-chip">✓ {f}</span>
                ))}
              </div>

              <div className="portal-footer-flow">{r.details}</div>

              <Link to={r.route} className={`portal-btn portal-btn-${r.color}`}>
                {r.btnLabel}
              </Link>
            </div>
          ))}
        </div>

        {/* Approved Public College Information */}
        <section className="public-info-section glass-card">
          <div className="public-info-header">
            <div>
              <h2 className="public-info-title">🏛️ Public College Information</h2>
              <p className="public-info-sub">Approved public data — Department fees & academic achievements</p>
            </div>
            <Link to="/college-info" className="public-view-btn">
              View Approved Info →
            </Link>
          </div>

          <div className="public-cards-grid">
            <div className="public-subcard">
              <div className="pub-card-icon">📚</div>
              <h4>Departments</h4>
              <p>Explore computer science, MCA, BCA, and management departments.</p>
            </div>

            <div className="public-subcard">
              <div className="pub-card-icon">💳</div>
              <h4>Department-wise Fees</h4>
              <p>View structured fee schedules and course details for each branch.</p>
            </div>

            <div className="public-subcard">
              <div className="pub-card-icon">🏆</div>
              <h4>Achievements</h4>
              <p>Discover student rank holders, research grants, and college accolades.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}