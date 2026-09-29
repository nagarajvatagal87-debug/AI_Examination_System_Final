import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import PublicChatbot from '../../components/PublicChatbot.jsx'
import Footer from '../../components/Footer.jsx'
import LocationMapModal from '../../components/LocationMapModal.jsx'
import PgsModal from '../../components/PgsModal.jsx'
import './CollegeInfo.css'

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

// Standardized Unique Departments List (No Duplicates)
const UNIQUE_DEPARTMENTS = [
  { id: 'dept-cse', name: 'Computer Science & Engineering (CSE)', code: 'CSE', icon: '💻' },
  { id: 'dept-ise', name: 'Information Science & Engineering (ISE)', code: 'ISE', icon: '⚡' },
  { id: 'dept-aiml', name: 'Artificial Intelligence & Machine Learning (AI & ML)', code: 'AI&ML', icon: '🤖' },
  { id: 'dept-cs', name: 'Cyber Security & Data Science (CS)', code: 'CS', icon: '🛡️' },
  { id: 'dept-ece', name: 'Electronics & Communication Engineering (ECE)', code: 'ECE', icon: '📡' },
  { id: 'dept-eee', name: 'Electrical & Electronics Engineering (EEE)', code: 'EEE', icon: '💡' },
  { id: 'dept-me', name: 'Mechanical Engineering (ME)', code: 'ME', icon: '⚙️' },
  { id: 'dept-civil', name: 'Civil Engineering (CIVIL)', code: 'CIVIL', icon: '🏗️' },
  { id: 'dept-mca', name: 'Master of Computer Applications (MCA)', code: 'MCA', icon: '🎓' },
  { id: 'dept-mba', name: 'Master of Business Administration (MBA)', code: 'MBA', icon: '📈' },
  { id: 'dept-bca', name: 'Bachelor of Computer Applications (BCA)', code: 'BCA', icon: '🖥️' },
  { id: 'dept-bba', name: 'Bachelor of Business Administration (BBA)', code: 'BBA', icon: '📊' },
]

export default function CollegeInfo() {
  const [overview, setOverview] = useState(null)
  const [allInfo, setAllInfo] = useState([])
  const [selectedDept, setSelectedDept] = useState(UNIQUE_DEPARTMENTS[0])
  const [deptInfo, setDeptInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  const [showMap, setShowMap] = useState(false)
  const [showPgs, setShowPgs] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewRes, allInfoRes] = await Promise.allSettled([
          publicApi.get('/public/college-info'),
          publicApi.get('/public/all-info'),
        ])

        if (overviewRes.status === 'fulfilled' && overviewRes.value?.data) {
          setOverview(overviewRes.value.data.overview)
        }

        if (allInfoRes.status === 'fulfilled' && Array.isArray(allInfoRes.value?.data)) {
          setAllInfo(allInfoRes.value.data)
        }
      } catch (err) {
        console.warn('Error loading public info:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Find published info matching selected department name ONLY if published by HOD/Principal
  const currentDeptData = allInfo.find((item) => {
    if (!item || item.published === false) return false
    const n = (item.name || '').toLowerCase()
    const code = selectedDept.code.toLowerCase()
    const name = selectedDept.name.toLowerCase()
    return n.includes(code) || n.includes(name) || name.includes(n)
  }) || null

  return (
    <div className="college-info-shell">
      <HeaderBanner />

      <main className="college-info-container">
        {/* Navigation Bar */}
        <div className="college-nav-bar">
          <Link to="/" className="back-link-btn">
            ← Back to Main Dashboard
          </Link>

          <span className="info-status-badge">
            ✓ Official Approved Public Disclosure
          </span>
        </div>

        {/* Hero College Overview Card */}
        <section className="college-hero-card">
          <div className="hero-left-content">
            <div className="hero-college-tag">DAYANANDA SAGAR INSTITUTIONS • DSI • ESTD 1960</div>
            <h1 className="hero-college-name">
              {overview?.name && overview.name.length > 5
                ? overview.name
                : 'Dayananda Sagar Academy of Technology and Management'}
            </h1>
            <p className="hero-college-desc">
              {overview?.description && overview.description.length > 10
                ? overview.description
                : 'Dayananda Sagar Academy of Technology and Management (DSATM) is a premier autonomous institution affiliated with Visvesvaraya Technological University (VTU), Belagavi, and approved by AICTE, New Delhi. DSATM offers top-tier undergraduate and postgraduate engineering, MCA, and management programs with state-of-the-art research labs, industry tie-ups, and exceptional placement records.'}
            </p>

            <div className="hero-badge-strip">
              <span className="hero-accred-badge">🏛️ VTU Autonomous</span>
              <span className="hero-accred-badge">📜 AICTE Approved</span>
              <span className="hero-accred-badge">★ NAAC A+ Grade</span>
              <span className="hero-accred-badge">🏆 NBA Accredited</span>
              <span className="hero-accred-badge">💼 95%+ Placement Guarantee</span>
            </div>
          </div>

          <div className="hero-right-emblem-box">
            <div className="hero-logos-wrapper">
              <div className="official-logo-card">
                <div className="logo-img-circle">
                  <img src="/dsi-logo.png" alt="DSATM Official Logo" />
                </div>
                <div className="logo-card-label">DSATM Crest</div>
                <div className="logo-card-sub">Dayananda Sagar</div>
              </div>

              <div className="official-logo-card">
                <div className="logo-img-circle gold-glow">
                  <img src="/vtu-logo.png" alt="VTU Official Seal Logo" />
                </div>
                <div className="logo-card-label">VTU Seal</div>
                <div className="logo-card-sub">Belagavi, Karnataka</div>
              </div>
            </div>

            <div className="hero-fact-strip">
              <div className="fact-item">
                <span className="fact-title">Affiliation</span>
                <span className="fact-val">VTU Belagavi</span>
              </div>
              <div className="fact-divider" />
              <div className="fact-item">
                <span className="fact-title">Approval</span>
                <span className="fact-val">AICTE Govt. of India</span>
              </div>
              <div className="fact-divider" />
              <div className="fact-item">
                <span className="fact-title">Campus</span>
                <span className="fact-val">Kanakapura Rd, BLR</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Grid: Unique Department Explorer + AI Assistant Sidebar */}
        <div className="info-main-grid">
          {/* Left Column: Explorer & Department Profile */}
          <div className="info-explorer-wrap">
            <h2 className="explorer-section-title">
              🏢 Academic Departments Directory ({UNIQUE_DEPARTMENTS.length} Unique Branches)
            </h2>

            {/* Department Selection Cards Grid */}
            <div className="dept-selector-grid">
              {UNIQUE_DEPARTMENTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`dept-select-card ${selectedDept.id === d.id ? 'active' : ''}`}
                  onClick={() => setSelectedDept(d)}
                >
                  <div className="dept-card-icon">{d.icon}</div>
                  <div className="dept-card-name">{d.name}</div>
                  <div className="dept-card-sub">Click to view profile & fees</div>
                </button>
              ))}
            </div>

            {/* Department Detail Showcase Card */}
            {!currentDeptData ? (
              <div className="dept-detail-card" style={{ textAlign: 'center', padding: '48px 28px' }}>
                <div style={{ fontSize: '38px', marginBottom: '12px' }}>📝</div>
                <h3 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>
                  No Information Published Yet
                </h3>
                <p style={{ color: '#475569', fontSize: '14px', maxWidth: '480px', margin: '0 auto 16px', lineHeight: '1.6', fontWeight: 500 }}>
                  Official public details, fee structures, and toppers for the {selectedDept.name} department have not been published by the HOD or Principal yet.
                </p>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
                  🔒 Department HODs can publish official details from their portal.
                </div>
              </div>
            ) : (
              <div className="dept-detail-card">
                <div className="dept-detail-header">
                  <div>
                    <h3 className="dept-detail-title">{currentDeptData.name}</h3>
                    <p style={{ color: '#475569', fontSize: 13, marginTop: 2, fontWeight: 700 }}>
                      Official Academic, Fees & Placement Profile
                    </p>
                  </div>
                  <span className="dept-students-badge">
                    👥 {currentDeptData.student_count || 120} Enrolled Students
                  </span>
                </div>

                {currentDeptData.about && <p className="dept-about-text">{currentDeptData.about}</p>}

                {/* Placement & Metrics Strip */}
                <div className="dept-metrics-grid">
                  <div className="dept-metric-box">
                    <div className="dept-metric-val val-emerald">
                      {currentDeptData.placement_percentage ? `${currentDeptData.placement_percentage}%` : '95%'}
                    </div>
                    <div className="dept-metric-label">Placement Rate</div>
                  </div>

                  <div className="dept-metric-box">
                    <div className="dept-metric-val val-amber">
                      {currentDeptData.highest_package
                        ? `₹${(currentDeptData.highest_package / 100000).toFixed(1)} LPA`
                        : '₹18.0 LPA'}
                    </div>
                    <div className="dept-metric-label">Highest Package</div>
                  </div>

                  <div className="dept-metric-box">
                    <div className="dept-metric-val val-purple">
                      {currentDeptData.average_package
                        ? `₹${(currentDeptData.average_package / 100000).toFixed(1)} LPA`
                        : '₹6.5 LPA'}
                    </div>
                    <div className="dept-metric-label">Average Package</div>
                  </div>
                </div>

                {/* Department Fee Structure */}
                {currentDeptData.fees && (
                  <div className="detail-sub-block">
                    <h4 className="detail-sub-heading">💳 Department Fee Structure</h4>
                    <div className="fee-summary-table">
                      <div className="fee-cell">
                        <span>Tuition Fee / Year:</span>
                        <strong>₹{currentDeptData.fees?.tuition_fee || '1,25,000'}</strong>
                      </div>
                      <div className="fee-cell">
                        <span>Lab & Development Fee:</span>
                        <strong>₹{currentDeptData.fees?.lab_fee || '25,000'}</strong>
                      </div>
                      <div className="fee-cell">
                        <span>University / Exam Fee:</span>
                        <strong>₹{currentDeptData.fees?.exam_fee || '8,500'}</strong>
                      </div>
                      <div className="fee-cell fee-total">
                        <span>Total Annual Fee:</span>
                        <strong>₹{currentDeptData.fees?.total_fee || '1,58,500'}</strong>
                      </div>
                    </div>
                    {currentDeptData.fees?.notes && (
                      <div style={{ fontSize: 12, color: '#059669', marginTop: 8, fontWeight: 700 }}>
                        💡 {currentDeptData.fees.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Department Toppers & Rank Holders */}
                {Array.isArray(currentDeptData.toppers) && currentDeptData.toppers.length > 0 && (
                  <div className="detail-sub-block">
                    <h4 className="detail-sub-heading">🏆 Student Rank Holders & Toppers</h4>
                    <div className="toppers-row-grid">
                      {currentDeptData.toppers.map((t, idx) => (
                        <div key={t.id || idx} className="topper-box-card">
                          <img src={t.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'} alt={t.name} className="topper-avatar" />
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>{t.name}</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8' }}>USN: {t.usn} • {t.class_sem}</div>
                            <div style={{ fontSize: 12, fontWeight: 900, color: '#059669', marginTop: 2 }}>CGPA: {t.cgpa}</div>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 3 }}>{t.rank_title}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offered Courses */}
                {Array.isArray(currentDeptData.courses) && currentDeptData.courses.length > 0 && (
                  <div className="detail-sub-block">
                    <h4 className="detail-sub-heading">📚 Offered Programs & Courses</h4>
                    <div className="courses-chips-wrap">
                      {currentDeptData.courses.map((course, idx) => (
                        <span key={idx} className="course-chip">
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements List */}
                {Array.isArray(currentDeptData.achievements) && currentDeptData.achievements.length > 0 && (
                  <div className="detail-sub-block">
                    <h4 className="detail-sub-heading">🌟 Department Accolades</h4>
                    <ul className="achievements-list">
                      {currentDeptData.achievements.map((ach, idx) => (
                        <li key={idx} className="achievement-item">
                          <span className="star-icon">★</span>
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Interactive RAG AI Assistant */}
          <div className="info-sidebar-wrap">
            <PublicChatbot />
          </div>
        </div>
      </main>

      {/* Global Modals */}
      <LocationMapModal isOpen={showMap} onClose={() => setShowMap(false)} />
      <PgsModal isOpen={showPgs} onClose={() => setShowPgs(false)} />

      <Footer />
    </div>
  )
}