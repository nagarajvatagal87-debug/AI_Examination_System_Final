import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import PublicChatbot from '../../components/PublicChatbot.jsx'
import './CollegeInfo.css'

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export default function CollegeInfo() {
  const [overview, setOverview] = useState(null)
  const [departments, setDepartments] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState(null)
  const [deptInfo, setDeptInfo] = useState(null)
  const [loadingDept, setLoadingDept] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadInitialInfo() {
      try {
        const [overviewRes, deptsRes] = await Promise.allSettled([
          publicApi.get('/public/college-info'),
          publicApi.get('/public/departments'),
        ])

        if (overviewRes.status === 'fulfilled' && overviewRes.value?.data) {
          setOverview(overviewRes.value.data.overview)
        }

        if (deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value?.data)) {
          const depts = deptsRes.value.data
          setDepartments(depts)
          if (depts.length > 0) {
            // Auto select first department
            fetchDeptDetail(depts[0].id)
          }
        }
      } catch (err) {
        console.warn('Error loading public college info:', err)
      }
    }

    loadInitialInfo()
  }, [])

  async function fetchDeptDetail(id) {
    setSelectedDeptId(id)
    setLoadingDept(true)
    setError('')
    try {
      const { data } = await publicApi.get(`/public/departments/${id}`)
      setDeptInfo(data)
    } catch (err) {
      setDeptInfo(null)
      setError(err.response?.data?.error || 'No published public information is available for this department yet.')
    } finally {
      setLoadingDept(false)
    }
  }

  return (
    <div className="college-info-shell">
      <HeaderBanner />

      <main className="college-info-container">
        {/* Navigation Bar */}
        <div className="college-nav-bar">
          <Link to="/" className="back-link-btn">
            ← Back to Main Portal
          </Link>
          <span className="info-status-badge">
            ✓ Official Approved Public Information
          </span>
        </div>

        {/* Hero College Overview */}
        <section className="college-hero-card">
          <div className="hero-college-tag">DAYANANDA SAGAR INSTITUTIONS • DSI</div>
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
        </section>

        {/* Main Grid: Department Explorer + AI Assistant Sidebar */}
        <div className="info-main-grid">
          {/* Left Column: Explorer & Department Profile */}
          <div className="info-explorer-wrap">
            <h2 className="explorer-section-title">
              🏢 Department Explorer ({departments.length})
            </h2>

            {/* Department Selection Cards Grid */}
            <div className="dept-selector-grid">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`dept-select-card ${selectedDeptId === d.id ? 'active' : ''}`}
                  onClick={() => fetchDeptDetail(d.id)}
                >
                  <div className="dept-card-icon">🎓</div>
                  <div className="dept-card-name">{d.name}</div>
                  <div className="dept-card-sub">Click to view profile</div>
                </button>
              ))}
            </div>

            {/* Department Detail Showcase Card */}
            {loadingDept ? (
              <div className="dept-detail-card" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#38bdf8', fontWeight: 600 }}>Loading Department Public Data...</p>
              </div>
            ) : error || !deptInfo ? (
              <div className="dept-detail-card" style={{ textAlign: 'center', padding: '44px 28px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📝</div>
                <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                  No Information Published Yet
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.5' }}>
                  {error || 'No public profile has been published for this department yet.'}
                </p>
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
                  HODs and Principal can publish official department details via their respective portals.
                </div>
              </div>
            ) : (
              <div className="dept-detail-card">
                <div className="dept-detail-header">
                  <div>
                    <h3 className="dept-detail-title">{deptInfo.departments?.name} Department</h3>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '2px' }}>
                      Approved Academic & Placement Profile
                    </p>
                  </div>
                  {deptInfo.student_count && (
                    <span className="dept-students-badge">
                      👥 {deptInfo.student_count} Enrolled Students
                    </span>
                  )}
                </div>

                {deptInfo.about && <p className="dept-about-text">{deptInfo.about}</p>}

                {/* Placement & Metrics Strip */}
                <div className="dept-metrics-grid">
                  <div className="dept-metric-box">
                    <div className="dept-metric-val val-emerald">
                      {deptInfo.placement_percentage ? `${deptInfo.placement_percentage}%` : 'N/A'}
                    </div>
                    <div className="dept-metric-label">Placement Rate</div>
                  </div>

                  <div className="dept-metric-box">
                    <div className="dept-metric-val val-amber">
                      {deptInfo.highest_package ? `₹${(deptInfo.highest_package / 100000).toFixed(1)} LPA` : 'N/A'}
                    </div>
                    <div className="dept-metric-label">Highest Package</div>
                  </div>

                  <div className="dept-metric-box">
                    <div className="dept-metric-val val-purple">
                      {deptInfo.average_package ? `₹${(deptInfo.average_package / 100000).toFixed(1)} LPA` : 'N/A'}
                    </div>
                    <div className="dept-metric-label">Average Package</div>
                  </div>
                </div>

                {/* Courses Offered */}
                {Array.isArray(deptInfo.courses) && deptInfo.courses.length > 0 && (
                  <div className="detail-sub-block">
                    <h4 className="detail-sub-heading">📚 Offered Programs & Courses</h4>
                    <div className="courses-chips-wrap">
                      {deptInfo.courses.map((course, idx) => (
                        <span key={idx} className="course-chip">
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements List */}
                {Array.isArray(deptInfo.achievements) && deptInfo.achievements.length > 0 && (
                  <div className="detail-sub-block">
                    <h4 className="detail-sub-heading">🏆 Department Achievements</h4>
                    <ul className="achievements-list">
                      {deptInfo.achievements.map((ach, idx) => (
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

          {/* Right Column: Interactive AI Assistant */}
          <div className="info-sidebar-wrap">
            <PublicChatbot />
          </div>
        </div>
      </main>
    </div>
  )
}