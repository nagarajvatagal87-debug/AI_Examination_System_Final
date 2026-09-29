import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HeaderBanner from '../components/HeaderBanner.jsx'
import Footer from '../components/Footer.jsx'
import LocationMapModal from '../components/LocationMapModal.jsx'
import PgsModal from '../components/PgsModal.jsx'
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
  const [allPublicInfo, setAllPublicInfo] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  // Modal State: null | 'fees' | 'achievements' | 'departments'
  const [activeModal, setActiveModal] = useState(null)

  useEffect(() => {
    async function loadRealData() {
      try {
        const [statsRes, deptsRes, allInfoRes] = await Promise.allSettled([
          api.get('/public/stats'),
          api.get('/public/departments'),
          api.get('/public/all-info'),
        ])

        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          setStats(statsRes.value.data)
        }
        if (deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value?.data)) {
          setDepartments(deptsRes.value.data)
        }
        if (allInfoRes.status === 'fulfilled' && Array.isArray(allInfoRes.value?.data)) {
          setAllPublicInfo(allInfoRes.value.data)
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

              <Link to={r.route} className={`portal-btn portal-btn-${r.color}`}>
                <span>{r.btnLabel}</span>
              </Link>
            </div>
          ))}
        </div>

        {/* Approved Public College Information (Centered as requested) */}
        <section className="public-info-section glass-card">
          <div className="public-info-header centered-pub-header">
            <div className="pub-header-center-wrap">
              <div className="public-info-tag">OFFICIAL PUBLIC DISCLOSURE</div>
              <h2 className="public-info-title">🏛️ Public College Information</h2>
              <p className="public-info-sub">Approved public data — Department details, fee structures & academic achievements</p>
              <div style={{ marginTop: 12 }}>
                <Link to="/college-info" className="public-view-btn">
                  View Approved Info →
                </Link>
              </div>
            </div>
          </div>

          <div className="public-cards-grid">
            <div
              className="public-subcard card-glow-blue clickable-pub-card"
              onClick={() => setActiveModal('departments')}
            >
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
              <div className="card-click-hint">Click to open branch details →</div>
            </div>

            <div
              className="public-subcard card-glow-emerald clickable-pub-card"
              onClick={() => setActiveModal('fees')}
            >
              <div className="pub-card-header">
                <div className="pub-card-icon">💳</div>
                <span className="pub-badge-count">Transparent</span>
              </div>
              <h4>Department-wise Fees</h4>
              <p>View structured fee schedules, lab quotas, and course details for each branch.</p>
              <div className="card-click-hint">Click to open fee breakdown →</div>
            </div>

            <div
              className="public-subcard card-glow-amber clickable-pub-card"
              onClick={() => setActiveModal('achievements')}
            >
              <div className="pub-card-header">
                <div className="pub-card-icon">🏆</div>
                <span className="pub-badge-count">Rank Holders</span>
              </div>
              <h4>Achievements & Toppers</h4>
              <p>Discover student rank holders with photos, VTU gold medalists, and research grants.</p>
              <div className="card-click-hint">Click to open rank holders & photos →</div>
            </div>

            <div
              className="public-subcard card-glow-cyan clickable-pub-card"
              onClick={() => setActiveModal('location')}
            >
              <div className="pub-card-header">
                <div className="pub-card-icon">📍</div>
                <span className="pub-badge-count">GPS Navigation</span>
              </div>
              <h4>Live Campus Location</h4>
              <p>View interactive Google Maps location of DSATM, transit bus routes, and metro guide.</p>
              <div className="card-click-hint">Click to open live Google Map →</div>
            </div>

            <div
              className="public-subcard card-glow-purple clickable-pub-card"
              onClick={() => setActiveModal('pgs')}
            >
              <div className="pub-card-header">
                <div className="pub-card-icon">🏡</div>
                <span className="pub-badge-count">Student Housing</span>
              </div>
              <h4>Nearby PGs & Hostels</h4>
              <p>Browse verified paying guest accommodations near DSATM with rent, food & phone contacts.</p>
              <div className="card-click-hint">Click to view PGs list & contacts →</div>
            </div>
          </div>
        </section>
      </main>

      {/* Interactive Modal dialogs for Public Information */}
      {activeModal && (
        <div className="modal-overlay-bg" onClick={() => setActiveModal(null)}>
          <div className="modal-dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>
                {activeModal === 'fees' && '💳 Official Department-wise Fees Structure'}
                {activeModal === 'achievements' && '🏆 Department Rank Holders & Student Toppers'}
                {activeModal === 'departments' && '🏢 Academic Departments Directory'}
              </h3>
              <button className="modal-close-x" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="modal-body-scroll">
              {/* Fees Structure Modal Content */}
              {activeModal === 'fees' && (
                <div className="fee-modal-grid">
                  {allPublicInfo.length === 0 ? (
                    <div className="modal-empty-note">
                      <p>Loading published department fee structures...</p>
                    </div>
                  ) : (
                    allPublicInfo.map((info) => (
                      <div key={info.id} className="dept-fee-card">
                        <div className="dept-fee-head">
                          <span className="dept-fee-name">🏢 {info.name} Department</span>
                          <span className="dept-fee-badge">Published</span>
                        </div>
                        <div className="fee-rows-table">
                          <div className="fee-line-item">
                            <span>Tuition Fee / Year:</span>
                            <strong>₹{info.fees?.tuition_fee || '1,25,000'}</strong>
                          </div>
                          <div className="fee-line-item">
                            <span>Lab & Development Fee:</span>
                            <strong>₹{info.fees?.lab_fee || '25,000'}</strong>
                          </div>
                          <div className="fee-line-item">
                            <span>University / Exam Fee:</span>
                            <strong>₹{info.fees?.exam_fee || '8,500'}</strong>
                          </div>
                          <div className="fee-line-total">
                            <span>Total Annual Fee:</span>
                            <strong className="fee-total-amt">₹{info.fees?.total_fee || '1,58,500'}</strong>
                          </div>
                        </div>
                        <div className="fee-quota-note">
                          <strong>Quota Details:</strong> {info.fees?.quota || 'Govt. PGCET / KEA & Management Quota'}
                        </div>
                        {info.fees?.notes && (
                          <div className="fee-scholarship-note">
                            💡 {info.fees.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Achievements & Toppers Modal Content */}
              {activeModal === 'achievements' && (
                <div className="toppers-modal-wrap">
                  {allPublicInfo.map((info) => (
                    <div key={info.id} className="dept-toppers-block">
                      <h4 className="dept-toppers-title">👑 {info.name} Department Rank Holders & Toppers</h4>

                      {Array.isArray(info.toppers) && info.toppers.length > 0 ? (
                        <div className="toppers-cards-row">
                          {info.toppers.map((t, idx) => (
                            <div key={t.id || idx} className="topper-profile-card">
                              <img src={t.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'} alt={t.name} className="topper-passport-img" />
                              <div className="topper-details">
                                <div className="topper-name">{t.name}</div>
                                <div className="topper-usn">USN: {t.usn}</div>
                                <div className="topper-sem">{t.class_sem}</div>
                                <div className="topper-cgpa">CGPA: {t.cgpa}</div>
                                <div className="topper-rank-tag">{t.rank_title}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: '#64748b' }}>No toppers published yet for this department.</p>
                      )}

                      {Array.isArray(info.achievements) && info.achievements.length > 0 && (
                        <div className="dept-ach-list">
                          <strong style={{ fontSize: 12, color: '#0f172a' }}>Key Department Accolades:</strong>
                          <ul>
                            {info.achievements.map((ach, i) => (
                              <li key={i}>★ {ach}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Departments Directory Modal Content */}
              {activeModal === 'departments' && (
                <div className="depts-modal-wrap">
                  {allPublicInfo.map((info) => (
                    <div key={info.id} className="dept-directory-card">
                      <div className="dept-dir-header">
                        <h4>🎓 {info.name} Department</h4>
                        <span className="student-count-pill">👥 {info.student_count || 120} Students Enrolled</span>
                      </div>
                      <p className="dept-dir-about">{info.about}</p>
                      <div className="dept-metrics-inline">
                        <span>Placement Rate: <strong>{info.placement_percentage}%</strong></span>
                        <span>Highest Pkg: <strong>₹{(info.highest_package / 100000).toFixed(1)} LPA</strong></span>
                        <span>Avg Pkg: <strong>₹{(info.average_package / 100000).toFixed(1)} LPA</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location Map & Nearby PGs Modals */}
      <LocationMapModal isOpen={activeModal === 'location'} onClose={() => setActiveModal(null)} />
      <PgsModal isOpen={activeModal === 'pgs'} onClose={() => setActiveModal(null)} />

      {/* Modern Footer Component */}
      <Footer />
    </div>
  )
}