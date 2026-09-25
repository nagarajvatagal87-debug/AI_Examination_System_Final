import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../api/client.js'
import Sidebar from '../../components/Sidebar.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import './HodDashboard.css'

const SECTIONS = [
  { key: 'overview', label: 'Dashboard', icon: '📊' },
  { key: 'students', label: 'Department Students', icon: '🎓' },
  { key: 'faculty', label: 'Manage Faculty', icon: '👩‍🏫' },
  { key: 'internals', label: '50m Internal Approval', icon: '📋' },
  { key: 'internal_analytics', label: 'Internal Analytics', icon: '📉' },
  { key: 'timetable', label: 'Exam Schedule & Hall Tickets', icon: '🎫' },
  { key: 'mainexam', label: 'Main Exam Analytics', icon: '📈' },
  { key: 'attendance', label: 'Attendance', icon: '📅' },
  { key: 'results', label: 'Results & Ranking', icon: '🏆' },
  { key: 'settings', label: 'Settings & Profile', icon: '⚙️' },
]

export default function HodDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/hod/overview')
      .then((res) => setOverview(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const sidebarItems = SECTIONS.map((s) => ({
    ...s,
    active: activeSection === s.key,
    onClick: () => setActiveSection(s.key),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <HeaderBanner />

      <div className="hod-layout" style={{ flex: 1 }}>
        <Sidebar title="HOD Portal" subtitle="Department Oversight" items={sidebarItems} />

        <div className="hod-content">
          <header className="hod-topbar glass-card" style={{ margin: '20px 24px 0', padding: '14px 24px', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="hod-page-title">{SECTIONS.find((s) => s.key === activeSection)?.label}</h1>
              <p className="hod-page-sub">{overview?.department_name ? `${overview.department_name} — Performance & Academic Oversight` : 'Department Performance & Academic Oversight'}</p>
            </div>
            <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 900, color: '#38bdf8', letterSpacing: '0.6px', textShadow: '0 0 10px rgba(56,189,248,0.4)' }}>
              🎓 Exam AI Platform — HOD Portal
            </div>
            <NotificationBell />
          </header>

        <main className="hod-main">
          {loading && <p className="hod-loading">Loading...</p>}
          {error && <p className="hod-error">{error}</p>}

          {!loading && !error && overview?.warning && (
            <div className="hod-warning">{overview.warning}</div>
          )}

          {!loading && !error && activeSection === 'overview' && <OverviewSection overview={overview} />}
          {!loading && !error && activeSection === 'students' && <DepartmentStudentsSection />}
          {!loading && !error && activeSection === 'faculty' && <FacultyManagement />}
          {!loading && !error && activeSection === 'internals' && <HodInternalApprovalSection />}
          {!loading && !error && activeSection === 'internal_analytics' && <HodInternalAnalyticsSection />}
          {!loading && !error && activeSection === 'timetable' && <HodExamTimetableSection overview={overview} />}
          {!loading && !error && activeSection === 'mainexam' && <MainExamAnalyticsSection />}
          {!loading && !error && activeSection === 'attendance' && <HodAttendanceSection />}
          {!loading && !error && activeSection === 'results' && <ResultsSection />}
          {!loading && !error && activeSection === 'settings' && <HodSettingsSection />}
        </main>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview: stats + top students + subject pass-rate chart + recent activity
// ---------------------------------------------------------------------------

function OverviewSection({ overview }) {
  const [passRates, setPassRates] = useState([])
  const [transferred, setTransferred] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.get('/hod/subject-pass-rates').then((res) => setPassRates(res.data)).catch(() => {})
  }, [])

  const topStudentsList = overview?.top_students || []

  async function handleTransferToPrincipal() {
    try {
      const { data } = await api.post('/hod/top10/transfer')
      setTransferred(true)
      alert(`✅ Top ${data.count || 0} Students of ${overview?.department_name || 'Department'} have been transferred successfully to Principal Dashboard & Notification sent!`)
    } catch (err) {
      alert(`❌ Transfer failed: ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleDownloadResultSheet() {
    setDownloading(true)
    try {
      const { data } = await api.get('/hod/result-sheet/download')
      if (!data?.rows || data.rows.length === 0) {
        alert('No result data available for export.')
        return
      }

      const headers = ['Registration No', 'Student Name', 'Semester', 'Department', 'Subject', 'Total Marks', 'Max Marks', 'Percentage', 'Result']
      const csvRows = [headers.join(',')]

      data.rows.forEach(r => {
        csvRows.push([
          `"${r.registrationNo}"`,
          `"${r.fullName}"`,
          `"${r.semester}"`,
          `"${r.departmentName}"`,
          `"${r.subjectName}"`,
          r.totalMarks,
          r.maxMarks,
          `${r.percentage}%`,
          r.result
        ].join(','))
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${(data.departmentName || 'Department').replace(/[^a-zA-Z0-9]/g, '_')}_Result_Sheet.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Download failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="hod-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard icon="👥" label="Total Department Students" value={overview?.total_students ?? 6} tone="blue" />
        <StatCard icon="📚" label="Active Subjects" value={overview?.subjects?.length || passRates.length || 1} tone="green" />
        <StatCard icon="👩‍🏫" label="Department Faculty" value={overview?.faculty_count ?? 2} tone="purple" />
        <StatCard icon="📅" label="Department Attendance Avg" value={overview?.attendance_avg || "Pending Upload"} tone="blue" />
      </div>

      <div style={{ margin: '20px 0' }}>
        <div className="hod-card">
          <h3 className="hod-card-title">📊 Subject-wise Academic Pass Rates</h3>
          <div className="bar-chart" style={{ marginTop: 12 }}>
            {passRates.length === 0 ? (
              <div className="hod-empty">No subject evaluation data available yet.</div>
            ) : (
              passRates.map((p) => (
                <div className="bar-row" key={p.subjectId || p.subjectName} style={{ marginBottom: 12 }}>
                  <div className="bar-label" style={{ fontSize: 13 }}>{p.subjectName}</div>
                  <div className="bar-track" style={{ background: '#1e193b', height: 10, borderRadius: 5 }}>
                    <div className="bar-fill" style={{ width: `${p.passPercent}%`, background: p.passPercent > 75 ? '#34d399' : '#f59e0b', height: '100%', borderRadius: 5 }} />
                  </div>
                  <div className="bar-value" style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{p.passPercent}%</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="hod-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="hod-card-title" style={{ margin: 0 }}>🏆 {overview?.department_name || 'Department'} Top 10 Merit Students</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDownloadResultSheet}
              disabled={downloading}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {downloading ? '⏳ Generating...' : '📥 Download Result Sheet (CSV)'}
            </button>

            <button
              onClick={handleTransferToPrincipal}
              disabled={transferred || topStudentsList.length === 0}
              style={{
                background: transferred ? '#059669' : topStudentsList.length === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: (transferred || topStudentsList.length === 0) ? 'default' : 'pointer',
              }}
            >
              {transferred ? '✓ Transferred to Principal' : '👑 Transfer Top 10 to Principal'}
            </button>
          </div>
        </div>

        {topStudentsList.length === 0 ? (
          <div className="hod-empty">No main exam evaluation results published yet for top student ranking.</div>
        ) : (
          <table className="hod-table">
            <thead>
              <tr><th>Rank</th><th>Student Name</th><th>Reg No</th><th>Percentage</th></tr>
            </thead>
            <tbody>
              {topStudentsList.map((t, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 800, color: i < 3 ? '#f59e0b' : '#cbd5e1' }}>#{t.rank || (i + 1)}</td>
                  <td style={{ fontWeight: 600 }}>{t.name || t.fullName || t.profiles?.full_name}</td>
                  <td style={{ color: '#94a3b8' }}>{t.regNo || t.registrationNo || t.profiles?.registration_no}</td>
                  <td style={{ fontWeight: 700, color: '#34d399' }}>{t.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function DepartmentStudentsSection() {
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [search, setSearch] = useState('')
  const [selectedSem, setSelectedSem] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [activeCourseModalStudent, setActiveCourseModalStudent] = useState(null)

  // Forms
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)

  // Student Form State
  const [fullName, setFullName] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [studentSem, setStudentSem] = useState('2nd Sem')
  const [email, setEmail] = useState('')

  // Subject Form State
  const [subjectName, setSubjectName] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [subjectSem, setSubjectSem] = useState('2nd Sem')

  const [statusMsg, setStatusMsg] = useState('')

  function loadData(sem = selectedSem) {
    setLoading(true)
    const semParam = sem && sem !== 'ALL' ? `?semester=${encodeURIComponent(sem)}` : ''
    Promise.all([
      api.get(`/hod/students${semParam}`).catch(() => ({ data: [] })),
      api.get('/hod/subjects').catch(() => ({ data: [] }))
    ]).then(([stRes, subRes]) => {
      setStudents(stRes.data || [])
      setSubjects(subRes.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData(selectedSem) }, [selectedSem])

  async function handleRegisterStudent(e) {
    e.preventDefault()
    if (!fullName || !registrationNo) return setStatusMsg('Full Name and USN are required.')
    try {
      await api.post('/hod/students', { fullName, registrationNo, semester: studentSem, email })
      setStatusMsg(`✅ Student ${fullName} (${registrationNo}) registered successfully! Linked to Exam Dept.`)
      setFullName('')
      setRegistrationNo('')
      setEmail('')
      setShowAddStudent(false)
      loadData(selectedSem)
    } catch (err) {
      setStatusMsg(`❌ ${err.response?.data?.error || 'Registration failed'}`)
    }
  }

  async function handleAddSubject(e) {
    e.preventDefault()
    if (!subjectName || !subjectCode) return setStatusMsg('Subject Name and Code are required.')
    try {
      await api.post('/hod/subjects', { name: subjectName, code: subjectCode, semester: subjectSem })
      setStatusMsg(`✅ Subject ${subjectName} (${subjectCode}) added successfully! Linked to Exam Dept.`)
      setSubjectName('')
      setSubjectCode('')
      setShowAddSubject(false)
      loadData(selectedSem)
    } catch (err) {
      setStatusMsg(`❌ ${err.response?.data?.error || 'Failed to add subject'}`)
    }
  }

  async function handleDeleteSubject(subjectId, sName) {
    if (!window.confirm(`Are you sure you want to remove subject "${sName}"?`)) return
    try {
      await api.delete(`/hod/subjects/${subjectId}`)
      setStatusMsg(`✅ Subject "${sName}" removed successfully!`)
      loadData(selectedSem)
    } catch (err) {
      setStatusMsg(`❌ ${err.response?.data?.error || 'Failed to remove subject'}`)
    }
  }

  const filtered = students.filter((s) => {
    const matchesSearch = !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.registration_no?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action Header & Buttons */}
      <div className="hod-card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 className="hod-card-title" style={{ margin: 0 }}>🏛️ Department Roster & Subject Management</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
              Add semester subjects and register student USNs. Registered data automatically syncs to Examination Department.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setShowAddSubject(!showAddSubject); setShowAddStudent(false) }}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(192,132,252,0.4)', background: 'rgba(192,132,252,0.15)', color: '#c084fc', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              📚 + Add Department Subject
            </button>
            <button
              onClick={() => { setShowAddStudent(!showAddStudent); setShowAddSubject(false) }}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}
            >
              🎓 + Register Student Candidate
            </button>
          </div>
        </div>

        {statusMsg && (
          <p style={{ margin: '14px 0 0 0', fontSize: 13, fontWeight: 700, color: statusMsg.includes('✅') ? '#34d399' : '#f87171' }}>{statusMsg}</p>
        )}

        {/* Add Subject Modal Form */}
        {showAddSubject && (
          <form onSubmit={handleAddSubject} style={{ marginTop: 20, padding: 18, background: 'rgba(15,23,42,0.6)', borderRadius: 10, border: '1px solid rgba(192,132,252,0.3)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Subject Name</label>
              <input placeholder="e.g., Computer Networks" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Subject Code</label>
              <input placeholder="e.g., MMC204 / 22MCA31" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Semester</label>
              <select value={subjectSem} onChange={(e) => setSubjectSem(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
                <option value="1st Sem">1st Sem</option>
                <option value="2nd Sem">2nd Sem</option>
                <option value="3rd Sem">3rd Sem</option>
                <option value="4th Sem">4th Sem</option>
              </select>
            </div>
            <button type="submit" style={{ padding: '9px 18px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Save Subject</button>
          </form>
        )}

        {/* Add Student Modal Form */}
        {showAddStudent && (
          <form onSubmit={handleRegisterStudent} style={{ marginTop: 20, padding: 18, background: 'rgba(15,23,42,0.6)', borderRadius: 10, border: '1px solid rgba(56,189,248,0.3)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Full Candidate Name</label>
              <input placeholder="e.g., Ameer Nagarasi" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Register No / USN</label>
              <input placeholder="e.g., 1DS23MCA001" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Semester</label>
              <select value={studentSem} onChange={(e) => setStudentSem(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
                <option value="1st Sem">1st Sem</option>
                <option value="2nd Sem">2nd Sem</option>
                <option value="3rd Sem">3rd Sem</option>
                <option value="4th Sem">4th Sem</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Email Address</label>
              <input type="email" placeholder="e.g., ameer@dsatm.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
            <button type="submit" style={{ padding: '9px 18px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Register Candidate</button>
          </form>
        )}
      </div>

      {/* Subjects Roster Card */}
      {subjects.length > 0 && (
        <div className="hod-card" style={{ margin: 0 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#c084fc' }}>📚 Department Registered Subjects ({subjects.length} Active)</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {subjects.map((sub, idx) => (
              <div key={idx} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.3)', color: '#e2e8f0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div>
                  <strong>{sub.code}</strong> — {sub.name} <span style={{ color: '#c084fc', fontSize: 11 }}>({sub.semester})</span>
                </div>
                <button
                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 800, fontSize: 13, padding: '2px 4px' }}
                  title="Remove Subject"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Roster Table Card */}
      <div className="hod-card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 className="hod-card-title" style={{ margin: 0 }}>🎓 Department Student Roster ({students.length} Enrolled)</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>Semester-wise student search & registered courses taken breakdown</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 13 }}
            >
              <option value="ALL">All Semesters</option>
              <option value="1st Sem">1st Sem</option>
              <option value="2nd Sem">2nd Sem</option>
              <option value="3rd Sem">3rd Sem</option>
              <option value="4th Sem">4th Sem</option>
            </select>

            <input
              placeholder="🔍 Search name or USN"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 13, width: 220 }}
            />
          </div>
        </div>

        {loading ? (
          <p>Loading student roster...</p>
        ) : filtered.length === 0 ? (
          <div className="hod-empty">No student candidates registered yet. Click "+ Register Student Candidate" above to add students.</div>
        ) : (
          <table className="hod-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Reg No / USN</th>
                <th>Student Name</th>
                <th>Semester</th>
                <th>Email</th>
                <th>Courses Taken</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const sCourses = s.registeredCourses || []
                return (
                  <tr key={s.id || idx}>
                    <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#c084fc' }}>{s.registration_no || 'N/A'}</td>
                    <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                    <td><span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontSize: 12 }}>{s.semester || '2nd Sem'}</span></td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{s.email}</td>
                    <td>
                      <button
                        onClick={() => setActiveCourseModalStudent(s)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        📖 View Courses ({sCourses.length})
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Student Registered Courses Modal */}
      {activeCourseModalStudent && (() => {
        const studentCourses = activeCourseModalStudent.registeredCourses || []

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div className="glass-card" style={{ background: '#0f172a', padding: 24, borderRadius: 16, border: '1px solid rgba(56,189,248,0.3)', width: '100%', maxWidth: 550, color: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#38bdf8' }}>📖 Courses Taken for {activeCourseModalStudent.semester || 'Current Sem'}</h3>
                <button onClick={() => setActiveCourseModalStudent(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✖</button>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: 13, color: '#cbd5e1' }}>
                Student: <strong>{activeCourseModalStudent.full_name}</strong> ({activeCourseModalStudent.registration_no})
              </p>

              <table className="hod-table" style={{ width: '100%', marginBottom: 16 }}>
                <thead>
                  <tr><th>Course Code</th><th>Course Title</th><th>Semester</th></tr>
                </thead>
                <tbody>
                  {studentCourses.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '16px 8px' }}>
                        No courses registered for this department yet. Use <strong>+ Add Department Subject</strong> above to add subjects.
                      </td>
                    </tr>
                  ) : (
                    studentCourses.map((c, i) => (
                      <tr key={c.id || i}>
                        <td style={{ fontWeight: 700, color: '#c084fc' }}>{c.code}</td>
                        <td>{c.name}</td>
                        <td><span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', fontSize: 11 }}>{c.semester || activeCourseModalStudent.semester}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <button
                onClick={() => setActiveCourseModalStudent(null)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Breakdown
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function StatCard({ icon, label, value, tone, note }) {
  return (
    <div className={`hod-stat-card tone-${tone}`}>
      <div className="hod-stat-icon">{icon}</div>
      <div className="hod-stat-value">{value}</div>
      <div className="hod-stat-label">{label}</div>
      {note && <div className="hod-stat-note">{note}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Faculty Management
// ---------------------------------------------------------------------------

function FacultyManagement() {
  const [faculty, setFaculty] = useState([])
  const [deptSubjects, setDeptSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('Female')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTempPassword, setNewTempPassword] = useState(null)

  // Edit Faculty State
  const [editingFaculty, setEditingFaculty] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [updating, setUpdating] = useState(false)

  function loadFaculty() {
    setLoading(true)
    Promise.all([
      api.get('/hod/faculty').catch(() => ({ data: [] })),
      api.get('/hod/subjects').catch(() => ({ data: [] }))
    ]).then(([facRes, subRes]) => {
      setFaculty(facRes.data || [])
      setDeptSubjects(subRes.data || [])
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load faculty'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadFaculty() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setNewTempPassword(null)
    try {
      const payload = { fullName, email, gender }
      if (password && password.length >= 6) payload.password = password
      const { data } = await api.post('/hod/faculty', payload)
      if (selectedSubjectId && data.faculty?.id) {
        await api.put(`/hod/faculty/${data.faculty.id}/assign-subject`, { subjectId: selectedSubjectId }).catch(() => {})
      }
      setNewTempPassword({ email: data.faculty.email, password: data.tempPassword })
      setFullName('')
      setEmail('')
      setPassword('')
      setGender('Female')
      setSelectedSubjectId('')
      loadFaculty()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add faculty')
    } finally {
      setCreating(false)
    }
  }

  async function handleAssignSubject(facultyId, subjectId) {
    try {
      await api.put(`/hod/faculty/${facultyId}/assign-subject`, { subjectId })
      loadFaculty()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign subject')
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove this faculty member? This cannot be undone.')) return
    try {
      await api.delete(`/hod/faculty/${id}`)
      loadFaculty()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove faculty')
    }
  }

  function startEdit(f) {
    setEditingFaculty(f)
    setEditName(f.full_name)
    setEditEmail(f.email)
  }

  async function handleUpdateFaculty(e) {
    e.preventDefault()
    if (!editingFaculty) return
    setUpdating(true)
    setError('')
    try {
      await api.put(`/hod/faculty/${editingFaculty.id}`, { fullName: editName, email: editEmail })
      setEditingFaculty(null)
      loadFaculty()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update faculty member')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="hod-card">
      <h3 className="hod-card-title">Add New Faculty</h3>
      <form className="hod-inline-form" onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto 1fr auto auto', gap: 10 }}>
        <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input type="email" placeholder="Email (login ID)" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
          <option value="Female">Female 👩‍🏫</option>
          <option value="Male">Male 👨‍🏫</option>
          <option value="Other">Other</option>
        </select>
        <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)' }}>
          <option value="">-- Assign Subject --</option>
          {deptSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
          ))}
        </select>
        <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={creating}>{creating ? 'Adding...' : 'Add Faculty'}</button>
      </form>

      {newTempPassword && (
        <div className="hod-temp-password" style={{ marginTop: 12, padding: 14, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8, color: '#6ee7b7' }}>
          🔑 <strong>Faculty Account Created Successfully!</strong><br />
          Email: <code>{newTempPassword.email}</code> &nbsp;|&nbsp; Password: <code>{newTempPassword.password}</code><br />
          <span style={{ fontSize: 12, color: '#a7f3d0' }}>The faculty member can now log in directly to their Faculty Dashboard using these credentials.</span>
        </div>
      )}
      {error && <p className="hod-error">{error}</p>}

      {/* Edit Faculty Modal / Form */}
      {editingFaculty && (
        <form onSubmit={handleUpdateFaculty} style={{ marginTop: 20, padding: 18, background: 'rgba(124,58,237,0.15)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.4)', display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#c4b5fd', marginBottom: 4 }}>Full Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#c4b5fd', marginBottom: 4 }}>Email Address</label>
            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />
          </div>
          <button type="submit" disabled={updating} style={{ padding: '9px 18px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => setEditingFaculty(null)} style={{ padding: '9px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}>
            Cancel
          </button>
        </form>
      )}

      <h3 className="hod-card-title" style={{ marginTop: 28 }}>Current Faculty & Subject Allocation</h3>
      {loading ? (
        <p>Loading...</p>
      ) : faculty.length === 0 ? (
        <div className="hod-empty">No faculty added yet.</div>
      ) : (
        <table className="hod-table">
          <thead><tr><th>Name</th><th>Email</th><th>Assigned Subject</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600 }}>{f.full_name}</td>
                <td>{f.email}</td>
                <td>
                  <select
                    value={f.subjectId || ''}
                    onChange={(e) => handleAssignSubject(f.id, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', fontSize: 13, fontWeight: 700 }}
                  >
                    <option value="">-- Assign Subject --</option>
                    {deptSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
                    ))}
                  </select>
                </td>
                <td>{new Date(f.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => startEdit(f)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                    <button className="hod-remove-btn" onClick={() => handleRemove(f.id)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}


// ---------------------------------------------------------------------------
// Main Exam Analytics: pass/fail, backlogs, subject-wise %, top-10 transfer
// ---------------------------------------------------------------------------

function MainExamAnalyticsSection() {
  const [overview, setOverview] = useState(null)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [top10, setTop10] = useState([])
  const [showTop10, setShowTop10] = useState(false)
  const [transferMsg, setTransferMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.get('/hod/main-exam-overview')
      .then((res) => setOverview(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load Main Exam overview'))
      .finally(() => setLoading(false))

    loadStudents('')
    loadTop10()
  }, [])

  function loadStudents(q = '') {
    api.get(`/hod/students-search${q ? `?search=${q}` : ''}`).then((res) => setStudents(res.data || [])).catch(() => {})
  }

  function loadTop10() {
    api.get('/hod/top10').then((res) => { setTop10(res.data || []); setShowTop10(true) }).catch(() => {})
  }

  async function handleTransfer() {
    setTransferMsg('Transferring...')
    try {
      const { data } = await api.post('/hod/top10/transfer')
      setTransferMsg(`✅ Transferred ${data.count} students to the Principal.`)
    } catch (err) {
      setTransferMsg(`❌ ${err.response?.data?.error || 'Transfer failed'}`)
    }
  }

  async function handleDownloadResultSheet() {
    setDownloading(true)
    try {
      const { data } = await api.get('/hod/result-sheet/download')
      if (!data?.rows || data.rows.length === 0) {
        alert('No main exam result data available for export yet.')
        return
      }

      const headers = ['Registration No', 'Student Name', 'Semester', 'Department', 'Subject', 'Total Marks', 'Max Marks', 'Percentage', 'Result']
      const csvRows = [headers.join(',')]

      data.rows.forEach(r => {
        csvRows.push([
          `"${r.registrationNo}"`,
          `"${r.fullName}"`,
          `"${r.semester}"`,
          `"${r.departmentName}"`,
          `"${r.subjectName}"`,
          r.totalMarks,
          r.maxMarks,
          `${r.percentage}%`,
          r.result
        ].join(','))
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${(data.departmentName || 'Department').replace(/[^a-zA-Z0-9]/g, '_')}_Main_Exam_Results.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Download failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <p className="hod-loading">Loading Main Exam analytics...</p>
  if (error) return <p className="hod-error">{error}</p>
  if (overview?.department_id === null) return <div className="hod-card"><div className="hod-empty">{overview.warning}</div></div>
  if (!overview) return null

  const isPublished = overview.results_published && (overview.passed > 0 || overview.failed > 0 || (overview.subjectBreakdown && overview.subjectBreakdown.length > 0))
  const backlogsBySubject = (overview.subjectBreakdown || []).filter((s) => s.failCount > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!isPublished ? (
        <div className="hod-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📢</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: 22, fontWeight: 800 }}>Main Examination Results Not Announced Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 620, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            The Examination Department has not published main examination scores for this department yet. Once the Examination Department evaluates and announces main exam results, real pass/fail analytics, subject performance breakdowns, and top 10 rankings will automatically reflect here.
          </p>

          <div className="hod-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard icon="👥" label="Department Students" value={overview.students || 0} tone="blue" />
            <StatCard icon="✅" label="Passed" value="0" tone="green" note="Awaiting Result Announcement" />
            <StatCard icon="❌" label="Failed" value="0" tone="purple" note="Awaiting Result Announcement" />
            <StatCard icon="⚠️" label="Backlogs" value="0" tone="purple" note="Awaiting Result Announcement" />
          </div>
        </div>
      ) : (
        <>
          <div className="hod-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard icon="👥" label="Students" value={overview.students} tone="blue" />
            <StatCard icon="✅" label="Passed" value={overview.passed} tone="green" />
            <StatCard icon="❌" label="Failed" value={overview.failed} tone="purple" />
            <StatCard icon="⚠️" label="Backlogs" value={overview.backlogs} tone="purple" />
          </div>

          <div className="hod-card">
            <h3 className="hod-card-title">📊 Subject-wise Main Exam Performance</h3>
            {overview.subjectBreakdown.length === 0 ? (
              <div className="hod-empty">No Main Exam results published for department subjects yet.</div>
            ) : (
              <div className="bar-chart" style={{ marginTop: 12 }}>
                {overview.subjectBreakdown.map((s) => (
                  <div className="bar-row" key={s.subjectId} style={{ marginBottom: 12 }}>
                    <div className="bar-label">{s.subjectName}</div>
                    <div className="bar-track" style={{ background: '#1e193b', height: 10, borderRadius: 5 }}>
                      <div className="bar-fill" style={{ width: `${s.avgPercent}%`, background: s.avgPercent > 75 ? '#34d399' : '#f59e0b', height: '100%', borderRadius: 5 }} />
                    </div>
                    <div className="bar-value" style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{s.avgPercent}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hod-card">
            <h3 className="hod-card-title">⚠️ Backlog Analysis</h3>
            {backlogsBySubject.length === 0 ? (
              <div className="hod-empty">No backlogs recorded for main exams — clean sweep! 🎉</div>
            ) : (
              <table className="hod-table">
                <thead><tr><th>Subject</th><th>Students Failed</th></tr></thead>
                <tbody>
                  {backlogsBySubject.map((s) => (
                    <tr key={s.subjectId}><td>{s.subjectName}</td><td style={{ color: '#fca5a5', fontWeight: 700 }}>{s.failCount} students</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="hod-card">
            <h3 className="hod-card-title">🎯 Overall Department Main Exam Performance</h3>
            <div className="hod-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <StatCard icon="📊" label="Average %" value={`${overview.overallAveragePercent}%`} tone="blue" />
              <StatCard icon="🎯" label="Pass Rate" value={`${overview.passPercent}%`} tone="green" />
              <StatCard icon="🔝" label="Highest %" value={`${overview.highestPercent}%`} tone="green" />
              <StatCard icon="🔻" label="Lowest %" value={`${overview.lowestPercent}%`} tone="purple" />
            </div>
          </div>

          <div className="hod-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="hod-card-title" style={{ margin: 0 }}>🎓 Main Exam Student Roster Performance</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleDownloadResultSheet}
                  disabled={downloading}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '7px 14px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {downloading ? '⏳ Exporting...' : '📥 Download Result Sheet (CSV)'}
                </button>
                <input
                  placeholder="🔍 Search student"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); loadStudents(e.target.value) }}
                  onFocus={() => students.length === 0 && loadStudents()}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 13, width: 200 }}
                />
              </div>
            </div>
            {students.length === 0 ? (
              <div className="hod-empty">No student main exam results recorded.</div>
            ) : (
              <table className="hod-table">
                <thead><tr><th>Reg No</th><th>Student</th><th>%</th><th>Result</th><th>Backlogs</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.studentId}>
                      <td style={{ fontWeight: 700, color: '#c084fc' }}>{s.registrationNo}</td>
                      <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                      <td style={{ fontWeight: 700 }}>{s.percentage}%</td>
                      <td style={{ color: s.result === 'Pass' ? '#86efac' : '#fca5a5', fontWeight: 800 }}>{s.result}</td>
                      <td>{s.backlogs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="hod-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="hod-card-title" style={{ margin: 0 }}>🏆 Top 10 Merit Students</h3>
              <button
                onClick={loadTop10}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >
                View Top Performers
              </button>
            </div>
            {showTop10 && (
              <>
                {top10.length === 0 ? (
                  <div className="hod-empty">No top 10 merit rankings available yet.</div>
                ) : (
                  <table className="hod-table" style={{ marginBottom: 16 }}>
                    <thead><tr><th>Rank</th><th>Student</th><th>Reg No</th><th>%</th></tr></thead>
                    <tbody>
                      {top10.map((s) => (
                        <tr key={s.studentId}>
                          <td style={{ fontWeight: 800, color: s.rank <= 3 ? '#f59e0b' : '#e2e8f0' }}>#{s.rank}</td>
                          <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                          <td style={{ color: '#c084fc', fontWeight: 700 }}>{s.registrationNo}</td>
                          <td style={{ fontWeight: 700, color: '#34d399' }}>{s.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {top10.length > 0 && (
                  <button
                    onClick={handleTransfer}
                    style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📤 Transfer Top 10 to Principal
                  </button>
                )}
                {transferMsg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 700 }}>{transferMsg}</p>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results & Top-10 Ranking (Internal Exams, with low-scorer direct message)
// ---------------------------------------------------------------------------

function ResultsSection() {
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forwarding, setForwarding] = useState(false)
  const [forwardMsg, setForwardMsg] = useState('')
  const [messagingStudentId, setMessagingStudentId] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [messageStatus, setMessageStatus] = useState('')

  useEffect(() => {
    api.get('/hod/exams')
      .then((res) => {
        setExams(res.data)
        if (res.data.length > 0) setSelectedExamId(res.data[0].id)
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load exams'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedExamId) return
    setResults(null)
    api.get(`/hod/results/${selectedExamId}`)
      .then((res) => setResults(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load results'))
  }, [selectedExamId])

  async function handleForward() {
    setForwarding(true)
    setForwardMsg('')
    try {
      const { data } = await api.post(`/hod/results/${selectedExamId}/forward`)
      setForwardMsg(`✅ Forwarded to ${data.notifiedPrincipals} Principal account(s).`)
    } catch (err) {
      setForwardMsg(`❌ ${err.response?.data?.error || 'Forward failed'}`)
    } finally {
      setForwarding(false)
    }
  }

  async function handleSendMessage(studentId) {
    if (!messageText.trim()) return
    setMessageStatus('Sending...')
    try {
      await api.post('/hod/message', { studentId, body: messageText })
      setMessageStatus('✅ Message sent.')
      setMessageText('')
      setMessagingStudentId(null)
    } catch (err) {
      setMessageStatus(`❌ ${err.response?.data?.error || 'Failed to send'}`)
    }
  }

  if (loading) return <p>Loading...</p>
  if (exams.length === 0) return <div className="hod-card"><div className="hod-empty">No exams found in your department yet.</div></div>

  return (
    <div className="hod-card">
      <div className="hod-inline-form" style={{ marginBottom: 20 }}>
        <label style={{ color: '#c4b5fd', fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>Exam:</label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb' }}
        >
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.subjects?.name} — {ex.title} ({ex.type})</option>
          ))}
        </select>
      </div>

      {error && <p className="hod-error">{error}</p>}

      {results && (
        <>
          <div className="hod-stat-grid" style={{ marginBottom: 20 }}>
            <StatCard icon="👥" label="Total Students" value={results.totalStudents} tone="blue" />
            <StatCard icon="✅" label="Passed" value={results.passCount} tone="green" note={`≥ ${results.passMark} marks`} />
            <StatCard icon="❌" label="Failed" value={results.failCount} tone="purple" />
          </div>

          <h3 className="hod-card-title">Top 10 Students</h3>
          {results.top10.length === 0 ? (
            <div className="hod-empty">No results recorded for this exam yet.</div>
          ) : (
            <table className="hod-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Rank</th><th>Photo</th><th>Student</th><th>Reg No</th><th>Marks</th></tr></thead>
              <tbody>
                {results.top10.map((r, i) => (
                  <tr key={i}>
                    <td>#{i + 1}</td>
                    <td><Avatar name={r.profiles?.full_name} url={r.profiles?.avatar_url} /></td>
                    <td>{r.profiles?.full_name}</td>
                    <td>{r.profiles?.registration_no}</td>
                    <td>{r.total_marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 className="hod-card-title">Students Needing Attention</h3>
          {results.rankings.filter((r) => r.total_marks < results.passMark).length === 0 ? (
            <div className="hod-empty">No low-scoring students — everyone is above the pass mark.</div>
          ) : (
            <table className="hod-table">
              <thead><tr><th>Photo</th><th>Student</th><th>Reg No</th><th>Marks</th><th></th></tr></thead>
              <tbody>
                {results.rankings.filter((r) => r.total_marks < results.passMark).map((r, i) => (
                  <tr key={i}>
                    <td><Avatar name={r.profiles?.full_name} url={r.profiles?.avatar_url} /></td>
                    <td>{r.profiles?.full_name}</td>
                    <td>{r.profiles?.registration_no}</td>
                    <td style={{ color: '#fca5a5' }}>{r.total_marks}</td>
                    <td>
                      {messagingStudentId === r.student_id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            autoFocus
                            placeholder="Type a message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 12 }}
                          />
                          <button className="hod-remove-btn" style={{ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)', color: '#86efac' }} onClick={() => handleSendMessage(r.student_id)}>Send</button>
                        </div>
                      ) : (
                        <button className="hod-remove-btn" style={{ background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)', color: '#c4b5fd' }} onClick={() => { setMessagingStudentId(r.student_id); setMessageText('') }}>
                          💬 Message
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {messageStatus && <p style={{ marginTop: 10, fontSize: 13 }}>{messageStatus}</p>}

          <button
            onClick={handleForward}
            disabled={forwarding}
            style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            {forwarding ? 'Forwarding...' : '📤 Forward Top 10 to Principal'}
          </button>
          {forwardMsg && <p style={{ marginTop: 10, fontSize: 13 }}>{forwardMsg}</p>}
        </>
      )}
    </div>
  )
}

function Avatar({ name, url }) {
  if (url) return <img src={url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function ComingSoon({ label }) {
  return (
    <div className="hod-card">
      <div className="hod-empty">🚧 {label} — coming in the next build step.</div>
    </div>
  )
}

function HodExamTimetableSection({ overview }) {
  const [subjectDetails, setSubjectDetails] = useState([])
  const [timetableData, setTimetableData] = useState(null)
  const [examName, setExamName] = useState('Continuous Internal Assessment Test - 1 (IAT-1 2026)')
  const [scheduleInputs, setScheduleInputs] = useState([])
  const [publishMsg, setPublishMsg] = useState('')
  const [loading, setLoading] = useState(true)

  // Real Database Attendance & Hall Tickets State
  const [attendanceOverview, setAttendanceOverview] = useState(null)
  const [condonMsg, setCondonMsg] = useState('')
  const [grantingId, setGrantingId] = useState(null)

  function loadAllData() {
    setLoading(true)
    Promise.all([
      api.get('/hod/subjects-detail').catch(() => ({ data: [] })),
      api.get('/hod/internal-timetable').catch(() => ({ data: null })),
      api.get('/hod/attendance').catch(() => ({ data: null }))
    ]).then(([subRes, ttRes, attRes]) => {
      const subs = subRes.data || []
      setSubjectDetails(subs)
      setAttendanceOverview(attRes.data)

      if (ttRes.data && Array.isArray(ttRes.data.schedule) && ttRes.data.schedule.length > 0) {
        setTimetableData(ttRes.data)
        if (ttRes.data.examName) setExamName(ttRes.data.examName)
        setScheduleInputs(ttRes.data.schedule)
      } else {
        const baseDate = new Date()
        baseDate.setDate(baseDate.getDate() + 10)
        const initialSched = subs.map((s, idx) => {
          const d = new Date(baseDate)
          d.setDate(d.getDate() + idx)
          return {
            slNo: idx + 1,
            subjectId: s.id,
            subjectCode: s.code,
            subjectName: s.name,
            examDate: d.toISOString().split('T')[0],
            timeSlot: '10:00 AM - 11:30 AM',
            hallNo: idx < 2 ? 'Block-A Room 302' : 'Block-B Room 405',
            totalMarks: 50
          }
        })

        if (initialSched.length === 0) {
          initialSched.push({
            slNo: 1,
            subjectId: 'new-1',
            subjectCode: 'MMC321',
            subjectName: 'Deep Learning & Neural Networks',
            examDate: baseDate.toISOString().split('T')[0],
            timeSlot: '10:00 AM - 11:30 AM',
            hallNo: 'Block-A Room 302',
            totalMarks: 50
          })
        }
        setScheduleInputs(initialSched)
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadAllData() }, [])

  function handleScheduleChange(index, field, value) {
    const updated = [...scheduleInputs]
    updated[index] = { ...updated[index], [field]: value }
    setScheduleInputs(updated)
  }

  function handleAddScheduleRow() {
    const nextSlNo = scheduleInputs.length + 1
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() + 10 + scheduleInputs.length)
    setScheduleInputs([
      ...scheduleInputs,
      {
        slNo: nextSlNo,
        subjectId: `custom-${Date.now()}`,
        subjectCode: '',
        subjectName: '',
        examDate: baseDate.toISOString().split('T')[0],
        timeSlot: '10:00 AM - 11:30 AM',
        hallNo: 'Block-A Room 302',
        totalMarks: 50
      }
    ])
  }

  function handleRemoveScheduleRow(index) {
    const filtered = scheduleInputs.filter((_, i) => i !== index)
    const reindexed = filtered.map((item, idx) => ({ ...item, slNo: idx + 1 }))
    setScheduleInputs(reindexed)
  }

  async function handlePublishInternalTimetable() {
    setPublishMsg('Publishing internal exam timetable...')
    try {
      const res = await api.post('/hod/internal-timetable', {
        examName,
        schedule: scheduleInputs
      })
      setPublishMsg(`✅ ${res.data?.message || 'Internal Exam Timetable published successfully! Attendance cutoff rule enforced.'}`)
      if (res.data?.timetable) setTimetableData(res.data.timetable)
      // Reload attendance to reflect updated alerts
      loadAllData()
    } catch (err) {
      setPublishMsg(`❌ ${err.response?.data?.error || 'Failed to publish timetable'}`)
    }
  }

  async function handleGrantMedicalCondonation(studentId, studentName) {
    if (!confirm(`Grant HOD Medical Condonation to ${studentName}? This will override attendance shortage and issue their exam Hall Ticket.`)) return
    setGrantingId(studentId)
    setCondonMsg('')
    try {
      const res = await api.post('/hod/condonation', { studentId, reason: 'HOD Medical Condonation' })
      setCondonMsg(`✅ ${res.data.message || 'Medical Condonation granted successfully! Student notified via Email.'}`)
      loadAllData()
    } catch (err) {
      setCondonMsg(`❌ ${err.response?.data?.error || 'Failed to grant condonation'}`)
    } finally {
      setGrantingId(null)
    }
  }

  const studentList = attendanceOverview?.students || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Subject Details & Department Roster Overview */}
      <div className="hod-card">
        <h3 className="hod-card-title">📚 Department Subject Details & Faculty Assignments</h3>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 16px 0' }}>
          {overview?.department_name || 'Master of Computer Applications (MCA)'} · Academic Course Catalogue
        </p>

        <table className="hod-table">
          <thead>
            <tr>
              <th>SUBJECT CODE</th>
              <th>SUBJECT NAME</th>
              <th>SEMESTER</th>
              <th>CREDITS</th>
              <th>ASSIGNED FACULTY</th>
            </tr>
          </thead>
          <tbody>
            {subjectDetails.map((sub) => (
              <tr key={sub.id}>
                <td style={{ fontWeight: 700, color: '#38bdf8' }}>{sub.code}</td>
                <td style={{ fontWeight: 600 }}>{sub.name}</td>
                <td>{sub.semester}</td>
                <td>{sub.credits} Credits</td>
                <td style={{ color: '#34d399', fontWeight: 600 }}>{sub.faculty_name}</td>
              </tr>
            ))}
            {subjectDetails.length === 0 && (
              <tr><td colSpan={5} className="hod-empty">No subjects added to department catalogue yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Internal Timetable Generator & Publisher */}
      <div className="hod-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="hod-card-title" style={{ margin: 0 }}>📅 Generate & Publish Internal Exam Timetable</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0 0' }}>
              Set examination dates, time slots, and room allocations. Enforces 75% attendance rule automatically.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleAddScheduleRow}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(192,132,252,0.4)', background: 'rgba(192,132,252,0.15)', color: '#c084fc', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              ➕ Add Exam Schedule Row
            </button>
            <span style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 800, fontSize: 12 }}>
              🔒 Attendance Cutoff: 75% Rule Enforced
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#c4b5fd', marginBottom: 6, fontWeight: 700 }}>
            Internal Exam Series Name:
          </label>
          <input
            type="text"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 14, fontWeight: 600 }}
          />
        </div>

        {publishMsg && (
          <p style={{ padding: '12px 16px', borderRadius: 8, background: publishMsg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: publishMsg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
            {publishMsg}
          </p>
        )}

        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table className="hod-table">
            <thead>
              <tr>
                <th>SL NO</th>
                <th>CODE</th>
                <th>SUBJECT NAME</th>
                <th>EXAM DATE</th>
                <th>TIME SLOT</th>
                <th>EXAM HALL</th>
                <th>MAX MARKS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {scheduleInputs.map((row, idx) => (
                <tr key={idx}>
                  <td>#{row.slNo || idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      placeholder="e.g., MMC321"
                      value={row.subjectCode}
                      onChange={(e) => handleScheduleChange(idx, 'subjectCode', e.target.value)}
                      style={{ width: 90, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#38bdf8', fontWeight: 700, fontSize: 13 }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Course Title"
                      value={row.subjectName}
                      onChange={(e) => handleScheduleChange(idx, 'subjectName', e.target.value)}
                      style={{ width: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.examDate}
                      onChange={(e) => handleScheduleChange(idx, 'examDate', e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.timeSlot}
                      onChange={(e) => handleScheduleChange(idx, 'timeSlot', e.target.value)}
                      style={{ width: 150, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.hallNo}
                      onChange={(e) => handleScheduleChange(idx, 'hallNo', e.target.value)}
                      style={{ width: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.totalMarks || 50}
                      onChange={(e) => handleScheduleChange(idx, 'totalMarks', Number(e.target.value))}
                      style={{ width: 60, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13, textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => handleRemoveScheduleRow(idx)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 12, cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {scheduleInputs.length === 0 && (
                <tr><td colSpan={8} className="hod-empty">No exam schedule rows. Click "+ Add Exam Schedule Row" to add exams.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={handlePublishInternalTimetable}
          style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
        >
          🚀 Generate & Publish Internal Exam Timetable
        </button>
      </div>

      {/* Student Hall Tickets & Eligibility Status (75% Attendance Rule + Medical Condonation) */}
      <div className="hod-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 className="hod-card-title" style={{ margin: 0 }}>🎟️ Student Hall Tickets & Eligibility Status (Live DB)</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
              Enforces 75% minimum attendance rule. Students with &lt;75% attendance are automatically barred unless granted HOD Medical Condonation.
            </p>
          </div>
        </div>

        {condonMsg && (
          <p style={{ padding: '10px 14px', borderRadius: 8, background: condonMsg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: condonMsg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
            {condonMsg}
          </p>
        )}

        <table className="hod-table">
          <thead>
            <tr>
              <th>REG NO / USN</th>
              <th>STUDENT NAME</th>
              <th>SEMESTER</th>
              <th>ATTENDANCE %</th>
              <th>HALL TICKET STATUS</th>
              <th>HALL TICKET #</th>
              <th>HOD CONDONATION ACTION</th>
            </tr>
          </thead>
          <tbody>
            {studentList.map((st) => {
              const hasAtt = st.hasAttendance
              const pct = st.overallPercentage
              const isEligible = st.isEligible
              const isCondoned = st.isCondoned

              return (
                <tr key={st.studentId}>
                  <td style={{ fontWeight: 700, color: '#c084fc' }}>{st.registrationNo}</td>
                  <td style={{ fontWeight: 600 }}>{st.studentName}</td>
                  <td>{st.semester || '3rd Sem'}</td>
                  <td style={{ fontWeight: 800, color: !hasAtt ? '#94a3b8' : (isEligible ? '#34d399' : '#f87171') }}>
                    {hasAtt ? `${pct}%` : 'Not Marked Yet'}
                  </td>
                  <td>
                    {!hasAtt ? (
                      <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(148,163,184,0.15)', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                        ⏳ ATTENDANCE NOT MARKED
                      </span>
                    ) : isEligible ? (
                      <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: 12, fontWeight: 800 }}>
                        {isCondoned ? '✓ ISSUED / ELIGIBLE (Condoned)' : '✓ ISSUED / ELIGIBLE'}
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, fontWeight: 800 }}>
                        🚫 BLOCKED (&lt;75% Attendance)
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: (hasAtt && isEligible) ? '#38bdf8' : '#64748b' }}>
                    {(hasAtt && isEligible) ? `HT-2026-${st.registrationNo}` : (hasAtt ? '— BLOCKED —' : '— PENDING —')}
                  </td>
                  <td>
                    {hasAtt && !isEligible && (
                      <button
                        onClick={() => handleGrantMedicalCondonation(st.studentId, st.studentName)}
                        disabled={grantingId === st.studentId}
                        style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {grantingId === st.studentId ? 'Granting...' : '🏥 Grant Medical Condonation'}
                      </button>
                    )}
                    {isCondoned && (
                      <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>🏥 Medical Condoned by HOD</span>
                    )}
                    {hasAtt && isEligible && !isCondoned && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Standard Eligible</span>
                    )}
                    {!hasAtt && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Awaiting Faculty Attendance</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {studentList.length === 0 && (
              <tr><td colSpan={7} className="hod-empty">No student registered in department. Add candidates in "Department Students" tab.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HodAttendanceSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSem, setSelectedSem] = useState('ALL')

  useEffect(() => {
    api.get('/hod/attendance')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="hod-loading">Loading student attendance data...</p>

  const rawStudents = data?.students || []

  const students = rawStudents.filter((st) =>
    selectedSem === 'ALL' || st.semester === selectedSem
  )

  const studentsWithAtt = students.filter((st) => st.hasAttendance || (st.overallPercentage !== null && st.overallPercentage !== undefined))
  const lowAttendanceCount = studentsWithAtt.filter((st) => (st.overallPercentage ?? st.percentage) < 75).length
  const avgDepartmentAttendance = studentsWithAtt.length > 0
    ? `${Math.round(studentsWithAtt.reduce((acc, st) => acc + (st.overallPercentage ?? st.percentage ?? 0), 0) / studentsWithAtt.length)}%`
    : (data?.avgDepartmentAttendance !== null && data?.avgDepartmentAttendance !== undefined ? `${data.avgDepartmentAttendance}%` : "Pending Upload")

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Attendance KPI Cards */}
      <div className="hod-stat-grid">
        <StatCard icon="👥" label="Total Department Students" value={students.length} tone="blue" />
        <StatCard icon="⚠️" label="Attendance Shortage (<75%)" value={lowAttendanceCount} tone="purple" note="Barred from Internal Exams" />
        <StatCard icon="📊" label="Average Department Attendance" value={avgDepartmentAttendance} tone="green" />
      </div>

      {/* Student Attendance Roster & Eligibility Breakdown */}
      <div className="hod-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="hod-card-title" style={{ margin: 0 }}>📊 Real-Time Student Attendance Monitoring</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0 0' }}>
              Attendance percentages updated directly by subject faculty. Students with &lt; 75% attendance are automatically barred.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#c084fc', fontWeight: 700 }}>Filter Semester:</span>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(15,23,42,0.9)', color: '#fff', fontSize: 13 }}
            >
              <option value="ALL">All Semesters</option>
              <option value="1st Sem">1st Sem</option>
              <option value="2nd Sem">2nd Sem</option>
              <option value="3rd Sem">3rd Sem</option>
              <option value="4th Sem">4th Sem</option>
            </select>
          </div>
        </div>

        {lowAttendanceCount > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: '1px solid rgba(239,68,68,0.4)', marginBottom: 16 }}>
            ⚠️ {lowAttendanceCount} Student(s) in {selectedSem === 'ALL' ? 'Department' : selectedSem} below 75% cutoff — Barred from internal exams.
          </div>
        )}

        <table className="hod-table">
          <thead>
            <tr>
              <th>REGISTRATION NO</th>
              <th>STUDENT NAME</th>
              <th>SEMESTER</th>
              <th>OVERALL ATTENDANCE %</th>
              <th>EXAM ELIGIBILITY</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const hasAtt = st.hasAttendance || (st.overallPercentage !== null && st.overallPercentage !== undefined)
              const pct = hasAtt ? (st.overallPercentage ?? st.percentage ?? 0) : null
              const isEligible = hasAtt ? pct >= 75 : true
              return (
                <tr key={st.studentId || st.registrationNo} style={{ background: hasAtt && !isEligible ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                  <td style={{ fontWeight: 700, color: '#38bdf8' }}>{st.registrationNo}</td>
                  <td style={{ fontWeight: 600 }}>{st.studentName}</td>
                  <td>{st.semester || '3rd Sem'}</td>
                  <td style={{ fontWeight: 900, fontSize: 15, color: !hasAtt ? '#94a3b8' : isEligible ? '#34d399' : '#f87171' }}>
                    {hasAtt ? `${pct}%` : 'Pending Upload'}
                  </td>
                  <td>
                    {!hasAtt ? (
                      <span style={{ padding: '4px 12px', borderRadius: 12, background: 'rgba(148,163,184,0.15)', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                        ⏳ ATTENDANCE PENDING
                      </span>
                    ) : isEligible ? (
                      <span style={{ padding: '4px 12px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: 12, fontWeight: 800 }}>
                        ✓ ELIGIBLE FOR INTERNALS
                      </span>
                    ) : (
                      <span style={{ padding: '4px 12px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, fontWeight: 800 }}>
                        ⛔ BARRED (&lt; 75% ATTENDANCE)
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {students.length === 0 && (
              <tr><td colSpan={5} className="hod-empty">No student attendance records found for this semester filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HodInternalAnalyticsSection() {
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedInternal, setSelectedInternal] = useState('internal1') // 'internal1' | 'internal2'
  const [sortBy, setSortBy] = useState('desc')
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Messaging state
  const [messagingStudent, setMessagingStudent] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [noticeText, setNoticeText] = useState('')
  const [sendingNotice, setSendingNotice] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)

  // Load subjects
  useEffect(() => {
    api.get('/hod/subjects-detail')
      .then((res) => {
        const list = res.data || []
        setSubjects(list)
        if (list.length > 0) {
          setSelectedSubject(list[0].id)
        }
      })
      .catch(() => {
        api.get('/hod/subjects')
          .then((res) => {
            const list = res.data || []
            setSubjects(list)
            if (list.length > 0) setSelectedSubject(list[0].id)
          })
          .catch(() => {})
      })
  }, [])

  // Load Roster for Selected Subject
  const loadRoster = (subjId) => {
    if (!subjId) return
    setLoading(true)
    api.get(`/hod/subjects/${subjId}/internal-marks`)
      .then((res) => {
        setRoster(res.data?.roster || [])
      })
      .catch(() => setRoster([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (selectedSubject) {
      loadRoster(selectedSubject)
    }
  }, [selectedSubject])

  // Open Chat Modal for Student
  const handleOpenChat = (student) => {
    setMessagingStudent(student)
    setNoticeText('')
    setLoadingChat(true)
    api.get(`/hod/student-messages/${student.studentId}`)
      .then((res) => setChatMessages(res.data || []))
      .catch(() => setChatMessages([]))
      .finally(() => setLoadingChat(false))
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!noticeText.trim() || !messagingStudent) return
    setSendingNotice(true)
    try {
      const selectedSubjObj = subjects.find((s) => s.id === selectedSubject)
      await api.post('/hod/message-student', {
        studentId: messagingStudent.studentId,
        message: noticeText,
        subject: `Performance Guidance Notice — ${selectedSubjObj?.name || 'Subject'}`,
      })
      setMsg(`✅ Guidance notice & email sent to ${messagingStudent.fullName}!`)
      setNoticeText('')
      // Refresh chat thread
      const res = await api.get(`/hod/student-messages/${messagingStudent.studentId}`)
      setChatMessages(res.data || [])
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Failed to send notice'}`)
    } finally {
      setSendingNotice(false)
    }
  }

  // Filter roster for selected internal exam
  const maxMark = 50 // Internal 1 & Internal 2 are out of 50 marks
  const currentSubjectObj = subjects.find((s) => s.id === selectedSubject)

  // Map student performance for selected internal
  const studentData = roster.map((st) => {
    const rawMark = selectedInternal === 'internal1' ? st.internal1 : st.internal2
    const mark = Number(rawMark ?? 0)
    const pct = Math.round((mark / maxMark) * 100)

    let grade = 'Needs Guidance ⚠️'
    let gradeColor = '#f87171'
    let isPass = pct >= 40

    if (pct >= 80) {
      grade = 'Excellence 🌟'
      gradeColor = '#34d399'
    } else if (pct >= 60) {
      grade = 'Good Performance 👍'
      gradeColor = '#38bdf8'
    } else if (pct >= 40) {
      grade = 'Average / Pass 🟢'
      gradeColor = '#fbbf24'
    }

    return {
      ...st,
      currentMark: mark,
      maxMark,
      pct,
      grade,
      gradeColor,
      isPass,
    }
  })

  // Sorted Roster
  const sortedData = [...studentData].sort((a, b) => {
    if (sortBy === 'desc') return b.currentMark - a.currentMark
    if (sortBy === 'asc') return a.currentMark - b.currentMark
    return (a.registrationNo || '').localeCompare(b.registrationNo || '')
  })

  // Dynamic Chart Analytics calculations
  const totalStudents = sortedData.length
  const passCount = sortedData.filter((s) => s.isPass).length
  const failCount = totalStudents - passCount
  const passPercentage = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0
  const avgScore = totalStudents > 0 ? (sortedData.reduce((acc, s) => acc + s.currentMark, 0) / totalStudents).toFixed(1) : 0
  const maxScore = totalStudents > 0 ? Math.max(...sortedData.map((s) => s.currentMark)) : 0
  const minScore = totalStudents > 0 ? Math.min(...sortedData.map((s) => s.currentMark)) : 0

  // Score distribution brackets
  const excCount = sortedData.filter((s) => s.pct >= 80).length
  const goodCount = sortedData.filter((s) => s.pct >= 60 && s.pct < 80).length
  const avgCount = sortedData.filter((s) => s.pct >= 40 && s.pct < 60).length
  const criticalCount = sortedData.filter((s) => s.pct < 40).length

  return (
    <div className="hod-section-card glass-card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            📉 Department Internal Assessment Analytics & Performance Oversight
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            Filter student performance per subject and specific internal exam round. Monitor real-time score charts and send direct guidance notices.
          </p>
        </div>

        <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          🟢 Marks Published & Announced by Subject Faculty
        </div>
      </div>

      {/* Control Filters */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', background: 'rgba(15,23,42,0.6)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#c084fc', fontWeight: 700 }}>Select Subject:</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(192,132,252,0.4)', color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 220 }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>Internal Exam Round:</label>
          <select
            value={selectedInternal}
            onChange={(e) => setSelectedInternal(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(56,189,248,0.4)', color: '#fff', fontSize: 13, fontWeight: 700 }}
          >
            <option value="internal1">📝 Internal 1 (50 Marks)</option>
            <option value="internal2">📝 Internal 2 (50 Marks)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <label style={{ fontSize: 13, color: '#a7f3d0', fontWeight: 700 }}>Sort Roster:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13 }}
          >
            <option value="desc">🔥 Highest Marks First</option>
            <option value="asc">⚠️ Lowest Marks First (Needs Guidance)</option>
            <option value="usn">🔢 Order by USN / Reg No</option>
          </select>
        </div>
      </div>

      {msg && <p style={{ padding: '10px 14px', borderRadius: 8, background: msg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: msg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>{msg}</p>}

      {/* Real-time Summary Cards & Dynamic SVG Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 700 }}>STUDENTS ENROLLED</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginTop: 4 }}>{totalStudents}</div>
          <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2 }}>{currentSubjectObj?.name}</div>
        </div>

        <div style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#7dd3fc', fontWeight: 700 }}>AVERAGE SCORE</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>{avgScore} / {maxMark}</div>
          <div style={{ fontSize: 11, color: '#bae6fd', marginTop: 2 }}>Mean Subject Performance</div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 700 }}>PASS RATE (≥40%)</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#34d399', marginTop: 4 }}>{passPercentage}%</div>
          <div style={{ fontSize: 11, color: '#a7f3d0', marginTop: 2 }}>{passCount} of {totalStudents} Passed</div>
        </div>

        <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#fde68a', fontWeight: 700 }}>HIGHEST / LOWEST</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fbbf24', marginTop: 4 }}>{maxScore} / {minScore}</div>
          <div style={{ fontSize: 11, color: '#fef3c7', marginTop: 2 }}>Score Range</div>
        </div>
      </div>

      {/* Real-time Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Score Distribution Bar Chart */}
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 15, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Real-Time Score Bracket Distribution — {selectedInternal === 'internal1' ? 'Internal 1' : 'Internal 2'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#a7f3d0', marginBottom: 4, fontWeight: 700 }}>
                <span>🌟 Excellence (80-100% | 40-50 Marks)</span>
                <span>{excCount} Students ({totalStudents > 0 ? Math.round((excCount / totalStudents) * 100) : 0}%)</span>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${totalStudents > 0 ? (excCount / totalStudents) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7dd3fc', marginBottom: 4, fontWeight: 700 }}>
                <span>👍 Good Performance (60-79% | 30-39 Marks)</span>
                <span>{goodCount} Students ({totalStudents > 0 ? Math.round((goodCount / totalStudents) * 100) : 0}%)</span>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${totalStudents > 0 ? (goodCount / totalStudents) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#fde68a', marginBottom: 4, fontWeight: 700 }}>
                <span>🟢 Average / Pass (40-59% | 20-29 Marks)</span>
                <span>{avgCount} Students ({totalStudents > 0 ? Math.round((avgCount / totalStudents) * 100) : 0}%)</span>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${totalStudents > 0 ? (avgCount / totalStudents) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #d97706, #fbbf24)', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#fca5a5', marginBottom: 4, fontWeight: 700 }}>
                <span>⚠️ Critical Risk / Needs Guidance (&lt;40% | 0-19 Marks)</span>
                <span>{criticalCount} Students ({totalStudents > 0 ? Math.round((criticalCount / totalStudents) * 100) : 0}%)</span>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${totalStudents > 0 ? (criticalCount / totalStudents) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #dc2626, #f87171)', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pass / Guidance Donut Gauge */}
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#f8fafc', textAlign: 'center' }}>🎯 Performance Overview</h4>

          <div style={{ position: 'relative', width: 120, height: 120, margin: '10px 0' }}>
            <svg width="120" height="120" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="3.8" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.8" strokeDasharray={`${passPercentage}, 100`} />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{passPercentage}%</span>
              <span style={{ fontSize: 10, color: '#6ee7b7' }}>Passing</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: '#6ee7b7', fontWeight: 700 }}>🟢 Passed: {passCount}</span>
            <span style={{ color: '#f87171', fontWeight: 700 }}>🔴 Action: {failCount}</span>
          </div>
        </div>
      </div>

      {/* Student Marks Table */}
      <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#f8fafc' }}>
        🎓 Student Roster & Marks Sheet ({selectedInternal === 'internal1' ? 'Internal 1' : 'Internal 2'})
      </h3>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading student marks...</p>
      ) : (
        <table className="hod-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(124,58,237,0.2)', color: '#c084fc' }}>
              <th>USN / REG NO</th>
              <th>STUDENT NAME</th>
              <th>EMAIL ADDRESS</th>
              <th>MARKS (MAX {maxMark})</th>
              <th>PERCENTAGE & GRADE</th>
              <th>STATUS</th>
              <th>ACTION & HOD DIRECT MESSAGE</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((st) => (
              <tr key={st.studentId}>
                <td style={{ fontWeight: 700, color: '#38bdf8' }}>{st.registrationNo}</td>
                <td style={{ fontWeight: 600, color: '#f8fafc' }}>{st.fullName}</td>
                <td style={{ color: '#cbd5e1', fontSize: 12 }}>{st.email}</td>
                <td style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>
                  {st.currentMark} / {st.maxMark}
                </td>
                <td style={{ fontWeight: 700, color: st.gradeColor }}>
                  {st.pct}% — {st.grade}
                </td>
                <td>
                  {st.isPass ? (
                    <span style={{ padding: '3px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: 11, fontWeight: 700 }}>
                      ✓ Eligible / Pass
                    </span>
                  ) : (
                    <span style={{ padding: '3px 8px', borderRadius: 10, background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 11, fontWeight: 700 }}>
                      ⚠️ Needs Guidance
                    </span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => handleOpenChat(st)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.18)', color: '#c4b5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    💬 Message Student
                  </button>
                </td>
              </tr>
            ))}

            {sortedData.length === 0 && (
              <tr>
                <td colSpan={7} className="hod-empty">No student internal marks records found for this subject.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* HOD <-> Student Direct Guidance Chat Modal */}
      {messagingStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 16, width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(56,189,248,0.15))', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>💬 Performance Guidance — {messagingStudent.fullName}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#38bdf8' }}>
                  USN: {messagingStudent.registrationNo} | Email: {messagingStudent.email}
                </p>
              </div>
              <button onClick={() => setMessagingStudent(null)} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: 20, cursor: 'pointer' }}>✖</button>
            </div>

            {/* Chat Messages Body */}
            <div style={{ padding: 16, height: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(0,0,0,0.4)' }}>
              {loadingChat ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading conversation thread...</p>
              ) : chatMessages.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', margin: 'auto 0' }}>
                  No past messages with {messagingStudent.fullName}. Write a guidance notice below.
                </p>
              ) : (
                chatMessages.map((m) => {
                  const isHod = m.sender_id !== messagingStudent.studentId
                  return (
                    <div key={m.id} style={{ alignSelf: isHod ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ padding: '8px 12px', borderRadius: 12, background: isHod ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13 }}>
                        {m.body}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: isHod ? 'right' : 'left' }}>
                        {isHod ? 'You (HOD)' : messagingStudent.fullName} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Chat Input Footer */}
            <form onSubmit={handleSendMessage} style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 10, background: 'rgba(15,23,42,0.9)' }}>
              <input
                autoFocus
                placeholder={`Type guidance message for ${messagingStudent.fullName}...`}
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13 }}
              />
              <button
                type="submit"
                disabled={sendingNotice || !noticeText.trim()}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                {sendingNotice ? 'Sending...' : 'Send Notice (+ Email)'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}

function HodInternalApprovalSection() {
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [roster, setRoster] = useState([])
  const [sortBy, setSortBy] = useState('desc') // 'desc', 'asc', 'usn'
  const [msg, setMsg] = useState('')
  const [savingEdits, setSavingEdits] = useState(false)
  const [messagingStudentId, setMessagingStudentId] = useState(null)
  const [noticeText, setNoticeText] = useState('')
  const [sendingNotice, setSendingNotice] = useState(false)

  useEffect(() => {
    api.get('/hod/subjects').then((res) => {
      const subs = res.data || []
      setSubjects(subs)
      if (subs.length > 0) {
        setSelectedSubject(subs[0].id)
        loadRoster(subs[0].id)
      } else {
        // Fetch detailed subjects as fallback
        api.get('/hod/subjects-detail').then((detailRes) => {
          const det = detailRes.data || []
          setSubjects(det)
          if (det.length > 0) {
            setSelectedSubject(det[0].id)
            loadRoster(det[0].id)
          }
        }).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  function loadRoster(subId) {
    if (!subId) return
    api.get(`/hod/subjects/${subId}/internal-marks`)
      .then((res) => setRoster(res.data.roster || []))
      .catch(() => {})
  }

  function handleSelectSubject(subId) {
    setSelectedSubject(subId)
    loadRoster(subId)
  }

  function handleMarkChange(studentId, field, value) {
    const val = Math.max(0, Number(value) || 0)
    setRoster((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r
        const updatedRow = { ...r, [field]: val }
        const i1 = field === 'internal1' ? val : (updatedRow.internal1 || 0)
        const i2 = field === 'internal2' ? val : (updatedRow.internal2 || 0)
        const i3 = field === 'internal3' ? val : (updatedRow.internal3 || 0)
        const ass = field === 'assignment' ? val : (updatedRow.assignment || 0)
        const total = i1 + i2 + i3 + ass
        return {
          ...updatedRow,
          totalInternal: total,
          isEligible: total >= 25,
        }
      })
    )
  }

  async function handleSaveEdits() {
    if (!selectedSubject) return
    setSavingEdits(true)
    setMsg('Saving internal marks edits...')
    try {
      const marksPayload = roster.map((r) => ({
        studentId: r.studentId,
        internal1: r.internal1,
        internal2: r.internal2,
        internal3: r.internal3,
        assignment: r.assignment,
      }))
      await api.put(`/hod/subjects/${selectedSubject}/internal-marks`, { marks: marksPayload })
      setMsg('✅ Internal marks edits saved successfully!')
      loadRoster(selectedSubject)
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Failed to save mark edits'}`)
    } finally {
      setSavingEdits(false)
    }
  }

  async function handleApprove() {
    if (!selectedSubject) return
    setMsg('Approving 50-mark internal sheet...')
    try {
      // First save any unsaved inline edits
      const marksPayload = roster.map((r) => ({
        studentId: r.studentId,
        internal1: r.internal1,
        internal2: r.internal2,
        internal3: r.internal3,
        assignment: r.assignment,
      }))
      await api.put(`/hod/subjects/${selectedSubject}/internal-marks`, { marks: marksPayload })

      const res = await api.post(`/hod/subjects/${selectedSubject}/approve-internal-marks`)
      setMsg(`✅ 50-Mark Internal Sheet for ${res.data.subjectName} confirmed & approved! Email notification sent to Examination Department.`)
      loadRoster(selectedSubject)
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Approval failed'}`)
    }
  }

  async function handleSendNotice(studentId) {
    if (!noticeText.trim()) return
    setSendingNotice(true)
    try {
      await api.post('/hod/message-student', {
        studentId,
        message: noticeText,
        subject: 'Academic Guidance & Performance Consultation Notice'
      })
      setMsg('✅ Guidance notice and email notification sent to student!')
      setNoticeText('')
      setMessagingStudentId(null)
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Failed to send notice'}`)
    } finally {
      setSendingNotice(false)
    }
  }

  const sortedRoster = [...roster].sort((a, b) => {
    if (sortBy === 'desc') return b.totalInternal - a.totalInternal
    if (sortBy === 'asc') return a.totalInternal - b.totalInternal
    return (a.registrationNo || '').localeCompare(b.registrationNo || '')
  })

  return (
    <div className="hod-section-card glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#f8fafc' }}>📋 Department 50-Mark Internal Assessment Approval & Oversight</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            Review, sort, and edit faculty-submitted 50-mark internal sheets (Internal 1, Internal 2, Internal 3 & Assignment) before approving for Examination Department.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSaveEdits}
            disabled={savingEdits || !selectedSubject}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            {savingEdits ? '⏳ Saving...' : '💾 Save Marks Edits'}
          </button>

          {selectedSubject && (
            <button className="fd-btn" onClick={handleApprove} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              ✓ Confirm & Approve Internal Sheet for Exam Dept
            </button>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#c084fc', fontWeight: 700 }}>Select Subject:</label>
          <select
            value={selectedSubject}
            onChange={(e) => handleSelectSubject(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13 }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
            ))}
            {subjects.length === 0 && <option value="">No subjects created yet</option>}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>Sort Scores:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13 }}
          >
            <option value="desc">🔥 Highest Marks First</option>
            <option value="asc">⚠️ Lowest Marks First</option>
            <option value="usn">🔢 Order by USN / Reg No</option>
          </select>
        </div>
      </div>

      {msg && <p style={{ padding: '10px 14px', borderRadius: 6, background: msg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: msg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>{msg}</p>}

      <table className="hod-table" style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'rgba(124,58,237,0.2)', color: '#c084fc' }}>
            <th>USN / REG NO</th>
            <th>STUDENT NAME</th>
            <th>INT-1 (15M)</th>
            <th>INT-2 (15M)</th>
            <th>INT-3 (10M)</th>
            <th>ASSIGNMENT (10M)</th>
            <th>TOTAL (50M)</th>
            <th>ELIGIBILITY STATUS</th>
            <th>ACTION & NOTICE</th>
          </tr>
        </thead>
        <tbody>
          {sortedRoster.map((st) => (
            <tr key={st.studentId}>
              <td style={{ fontWeight: 700, color: '#38bdf8' }}>{st.registrationNo}</td>
              <td style={{ fontWeight: 600 }}>{st.fullName}</td>
              <td>
                <input
                  type="number"
                  max={15}
                  min={0}
                  value={st.internal1}
                  onChange={(e) => handleMarkChange(st.studentId, 'internal1', e.target.value)}
                  style={{ width: 60, padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }}
                />
              </td>
              <td>
                <input
                  type="number"
                  max={15}
                  min={0}
                  value={st.internal2}
                  onChange={(e) => handleMarkChange(st.studentId, 'internal2', e.target.value)}
                  style={{ width: 60, padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }}
                />
              </td>
              <td>
                <input
                  type="number"
                  max={10}
                  min={0}
                  value={st.internal3}
                  onChange={(e) => handleMarkChange(st.studentId, 'internal3', e.target.value)}
                  style={{ width: 60, padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }}
                />
              </td>
              <td>
                <input
                  type="number"
                  max={10}
                  min={0}
                  value={st.assignment}
                  onChange={(e) => handleMarkChange(st.studentId, 'assignment', e.target.value)}
                  style={{ width: 60, padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }}
                />
              </td>
              <td style={{ fontWeight: 900, color: st.isEligible ? '#34d399' : '#f87171' }}>{st.totalInternal} / 50</td>
              <td>
                {st.isEligible ? (
                  <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: 12, fontWeight: 700 }}>
                    ✓ Eligible (≥25)
                  </span>
                ) : (
                  <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, fontWeight: 700 }}>
                    ⚠️ Detained (&lt;25)
                  </span>
                )}
              </td>
              <td>
                {messagingStudentId === st.studentId ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      placeholder="Type guidance message..."
                      value={noticeText}
                      onChange={(e) => setNoticeText(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, width: 160 }}
                    />
                    <button
                      onClick={() => handleSendNotice(st.studentId)}
                      disabled={sendingNotice}
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {sendingNotice ? '...' : 'Send'}
                    </button>
                    <button
                      onClick={() => setMessagingStudentId(null)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }}
                    >
                      ✖
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setMessagingStudentId(st.studentId); setNoticeText('') }}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    💬 Send Notice (+ Email)
                  </button>
                )}
              </td>
            </tr>
          ))}
          {sortedRoster.length === 0 && (
            <tr><td colSpan={9} className="hod-empty">No student internal marks uploaded for this subject yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function HodSettingsSection() {
  const { user } = useAuth ? useAuth() : { user: null }
  const [fullName, setFullName] = useState(user?.fullName || 'Bhuvi')
  const [email, setEmail] = useState(user?.email || 'hod@gmail.com')
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar') || ''
  )
  const [msg, setMsg] = useState('')

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target.result
        setAvatarUrl(base64)
        localStorage.setItem('user_avatar', base64)
        if (user) user.avatarUrl = base64
        window.dispatchEvent(new Event('user_avatar_updated'))
        setMsg('✅ Profile photo uploaded & avatar updated!')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    if (avatarUrl) {
      localStorage.setItem('user_avatar', avatarUrl)
      if (user) user.avatarUrl = avatarUrl
      window.dispatchEvent(new Event('user_avatar_updated'))
    }
    setMsg('✅ Profile credentials & avatar photo updated successfully!')
  }

  return (
    <div className="hod-card" style={{ maxWidth: 650 }}>
      <h3 className="hod-card-title">⚙️ Head of Department — Profile & Settings</h3>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
        Manage your administrative HOD profile credentials and upload your official profile avatar photo.
      </p>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff', overflow: 'hidden', border: '3px solid rgba(124,58,237,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          {avatarUrl ? <img src={avatarUrl} alt="HOD Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : fullName?.[0] || 'H'}
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 18, color: '#f8fafc' }}>{fullName}</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#38bdf8' }}>Head of Department — MCA</p>
        </div>
      </div>

      {msg && <p style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{msg}</p>}

      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#c4b5fd', marginBottom: 6, fontWeight: 700 }}>Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#c4b5fd', marginBottom: 6, fontWeight: 700 }}>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#c4b5fd', marginBottom: 6, fontWeight: 700 }}>📷 Upload Profile Avatar Photo File</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(124,58,237,0.4)', color: '#fff', fontSize: 13, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>Select any image file (JPG, PNG) from your device. It will automatically update the avatar on top of the sidebar.</span>
        </div>
        <button type="submit" style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 8 }}>
          Save Profile Settings
        </button>
      </form>
    </div>
  )
}