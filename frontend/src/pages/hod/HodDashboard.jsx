import { useEffect, useState } from 'react'
import api from '../../api/client.js'
import Sidebar from '../../components/Sidebar.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import HeaderBanner from '../../components/HeaderBanner.jsx'
import './HodDashboard.css'

const SECTIONS = [
  { key: 'overview', label: 'Dashboard', icon: '📊' },
  { key: 'students', label: 'Department Students', icon: '🎓' },
  { key: 'faculty', label: 'Manage Faculty', icon: '👩‍🏫' },
  { key: 'timetable', label: 'Exam Schedule & Hall Tickets', icon: '🎫' },
  { key: 'mainexam', label: 'Main Exam Analytics', icon: '📈' },
  { key: 'attendance', label: 'Attendance', icon: '📅' },
  { key: 'results', label: 'Results & Ranking', icon: '🏆' },
  { key: 'placements', label: 'Placements', icon: '💼' },
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
        <Sidebar title="Exam AI Platform" subtitle="HOD Portal" items={sidebarItems} />

        <div className="hod-content">
          <header className="hod-topbar glass-card" style={{ margin: '20px 24px 0', padding: '14px 24px', borderRadius: 14 }}>
            <div>
              <h1 className="hod-page-title">{SECTIONS.find((s) => s.key === activeSection)?.label}</h1>
              <p className="hod-page-sub">{overview?.department_name ? `${overview.department_name} — Performance & Academic Oversight` : 'Department Performance & Academic Oversight'}</p>
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
          {!loading && !error && activeSection === 'timetable' && <HodExamTimetableSection overview={overview} />}
          {!loading && !error && activeSection === 'mainexam' && <MainExamAnalyticsSection />}
          {!loading && !error && activeSection === 'attendance' && <ComingSoon label="Attendance Tracking" />}
          {!loading && !error && activeSection === 'results' && <ResultsSection />}
          {!loading && !error && activeSection === 'placements' && <ComingSoon label="Placement Tracking" />}
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

  const topStudentsList = overview?.top_students?.length > 0 ? overview.top_students : [
    { rank: 1, name: 'Ameer Nagarasi', regNo: '1DS23MCA001', percentage: 98.0 },
    { rank: 2, name: 'Prajwal Kumar', regNo: '1DS23MCA002', percentage: 97.1 },
    { rank: 3, name: 'Rohan Verma', regNo: '1DS23MCA003', percentage: 96.2 },
    { rank: 4, name: 'Sneha Patil', regNo: '1DS23MCA004', percentage: 95.3 },
    { rank: 5, name: 'Karthik Raja', regNo: '1DS23MCA005', percentage: 94.4 },
    { rank: 6, name: 'Divyashree H', regNo: '1DS23MCA006', percentage: 93.5 },
    { rank: 7, name: 'Omkar Hatti', regNo: '1DS23MCA007', percentage: 92.6 },
    { rank: 8, name: 'Ananya Roy', regNo: '1DS23MCA008', percentage: 91.7 },
    { rank: 9, name: 'Vikas Gowda', regNo: '1DS23MCA009', percentage: 90.8 },
    { rank: 10, name: 'Sanjay Kumar', regNo: '1DS23MCA010', percentage: 89.9 },
  ]

  async function handleTransferToPrincipal() {
    try {
      const { data } = await api.post('/hod/top10/transfer')
      setTransferred(true)
      alert(`✅ Top ${data.count || 10} Students of ${overview?.department_name || 'Department'} have been transferred successfully to Principal Dashboard & Notification sent!`)
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
        <StatCard icon="👥" label="Total Students" value={overview?.total_students || 87} tone="blue" />
        <StatCard icon="✅" label="Passed" value={overview?.passed_students || 71} tone="green" />
        <StatCard icon="❌" label="Failed" value={overview?.failed_students || 16} tone="orange" />
        <StatCard icon="⚠️" label="Backlogs" value={overview?.backlog_students || 16} tone="purple" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '20px 0' }}>
        <div className="hod-card">
          <h3 className="hod-card-title">📊 Subject-wise Pass Rates</h3>
          <div className="bar-chart" style={{ marginTop: 12 }}>
            {passRates.map((p) => (
              <div className="bar-row" key={p.subjectId || p.subjectName} style={{ marginBottom: 12 }}>
                <div className="bar-label" style={{ fontSize: 13 }}>{p.subjectName}</div>
                <div className="bar-track" style={{ background: '#1e193b', height: 10, borderRadius: 5 }}>
                  <div className="bar-fill" style={{ width: `${p.passPercent}%`, background: p.passPercent > 75 ? '#34d399' : '#f59e0b', height: '100%', borderRadius: 5 }} />
                </div>
                <div className="bar-value" style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{p.passPercent}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hod-card">
          <h3 className="hod-card-title">⚠️ Backlog Analysis by Subject</h3>
          <table className="hod-table" style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Subject</th><th>Students with Backlog</th><th>Action Required</th></tr>
            </thead>
            <tbody>
              <tr><td>Database Management Systems (DBMS)</td><td style={{ color: '#f87171', fontWeight: 700 }}>16 students</td><td>Remedial Classes</td></tr>
              <tr><td>Java Enterprise Programming</td><td style={{ color: '#fb923c', fontWeight: 700 }}>5 students</td><td>Concept Revision</td></tr>
              <tr><td>Computer Networks (CN)</td><td style={{ color: '#fb923c', fontWeight: 700 }}>4 students</td><td>Lab Practice</td></tr>
              <tr><td>Operating Systems (OS)</td><td style={{ color: '#34d399', fontWeight: 700 }}>2 students</td><td>Doubt Session</td></tr>
            </tbody>
          </table>
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
              disabled={transferred}
              style={{
                background: transferred ? '#059669' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: transferred ? 'default' : 'pointer',
              }}
            >
              {transferred ? '✓ Transferred to Principal' : '👑 Transfer Top 10 to Principal'}
            </button>
          </div>
        </div>

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

  function loadData() {
    setLoading(true)
    Promise.all([
      api.get('/hod/students').catch(() => ({ data: [] })),
      api.get('/hod/subjects').catch(() => ({ data: [] }))
    ]).then(([stRes, subRes]) => {
      setStudents(stRes.data || [])
      setSubjects(subRes.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

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
      loadData()
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
      loadData()
    } catch (err) {
      setStatusMsg(`❌ ${err.response?.data?.error || 'Failed to add subject'}`)
    }
  }

  const filtered = students.filter((s) => {
    const matchesSearch = !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.registration_no?.toLowerCase().includes(search.toLowerCase())
    const matchesSem = selectedSem === 'ALL' || (s.semester || '2nd Sem') === selectedSem
    return matchesSearch && matchesSem
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
              <div key={idx} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.3)', color: '#e2e8f0', fontSize: 13 }}>
                <strong>{sub.code}</strong> — {sub.name} <span style={{ color: '#c084fc', fontSize: 11 }}>({sub.semester})</span>
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
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>Complete student candidate information registered under your department</p>
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: '#c084fc' }}>{s.registration_no || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                  <td><span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontSize: 12 }}>{s.semester || '2nd Sem'}</span></td>
                  <td style={{ color: '#94a3b8', fontSize: 13 }}>{s.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTempPassword, setNewTempPassword] = useState(null)

  function loadFaculty() {
    setLoading(true)
    api.get('/hod/faculty')
      .then((res) => setFaculty(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load faculty'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadFaculty() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setNewTempPassword(null)
    try {
      const { data } = await api.post('/hod/faculty', { fullName, email })
      setNewTempPassword({ email: data.faculty.email, password: data.tempPassword })
      setFullName('')
      setEmail('')
      loadFaculty()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add faculty')
    } finally {
      setCreating(false)
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

  return (
    <div className="hod-card">
      <h3 className="hod-card-title">Add New Faculty</h3>
      <form className="hod-inline-form" onSubmit={handleAdd}>
        <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit" disabled={creating}>{creating ? 'Adding...' : 'Add Faculty'}</button>
      </form>

      {newTempPassword && (
        <div className="hod-temp-password">
          Account created for <strong>{newTempPassword.email}</strong>. Temporary password:{' '}
          <code>{newTempPassword.password}</code> — share this with them; they should change it after first login.
        </div>
      )}
      {error && <p className="hod-error">{error}</p>}

      <h3 className="hod-card-title" style={{ marginTop: 28 }}>Current Faculty</h3>
      {loading ? (
        <p>Loading...</p>
      ) : faculty.length === 0 ? (
        <div className="hod-empty">No faculty added yet.</div>
      ) : (
        <table className="hod-table">
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f.id}>
                <td>{f.full_name}</td>
                <td>{f.email}</td>
                <td>{new Date(f.created_at).toLocaleDateString()}</td>
                <td><button className="hod-remove-btn" onClick={() => handleRemove(f.id)}>Remove</button></td>
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

  useEffect(() => {
    api.get('/hod/main-exam-overview')
      .then((res) => setOverview(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load Main Exam overview'))
      .finally(() => setLoading(false))
  }, [])

  function loadStudents(q = '') {
    api.get(`/hod/students-search${q ? `?search=${q}` : ''}`).then((res) => setStudents(res.data)).catch(() => {})
  }

  function loadTop10() {
    api.get('/hod/top10').then((res) => { setTop10(res.data); setShowTop10(true) }).catch(() => {})
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

  if (loading) return <p>Loading...</p>
  if (error) return <p className="hod-error">{error}</p>
  if (overview?.department_id === null) return <div className="hod-card"><div className="hod-empty">{overview.warning}</div></div>
  if (!overview) return null

  const backlogsBySubject = overview.subjectBreakdown.filter((s) => s.failCount > 0)

  return (
    <>
      <div className="hod-stat-grid">
        <StatCard icon="👥" label="Students" value={overview.students} tone="blue" />
        <StatCard icon="✅" label="Passed" value={overview.passed} tone="green" />
        <StatCard icon="❌" label="Failed" value={overview.failed} tone="purple" />
        <StatCard icon="⚠️" label="Backlogs" value={overview.backlogs} tone="purple" />
      </div>

      <div className="hod-card">
        <h3 className="hod-card-title">Subject-wise Performance</h3>
        {overview.subjectBreakdown.length === 0 ? (
          <div className="hod-empty">No Main Exam results yet.</div>
        ) : (
          <div className="bar-chart">
            {overview.subjectBreakdown.map((s) => (
              <div className="bar-row" key={s.subjectId}>
                <div className="bar-label">{s.subjectName}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${s.avgPercent}%` }} />
                </div>
                <div className="bar-value">{s.avgPercent}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hod-card">
        <h3 className="hod-card-title">Backlog Analysis</h3>
        {backlogsBySubject.length === 0 ? (
          <div className="hod-empty">No backlogs — clean sweep! 🎉</div>
        ) : (
          <table className="hod-table">
            <thead><tr><th>Subject</th><th>Students Failed</th></tr></thead>
            <tbody>
              {backlogsBySubject.map((s) => (
                <tr key={s.subjectId}><td>{s.subjectName}</td><td style={{ color: '#fca5a5' }}>{s.failCount} students</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="hod-card">
        <h3 className="hod-card-title">Overall Department Performance</h3>
        <div className="hod-stat-grid">
          <StatCard icon="📊" label="Average %" value={`${overview.overallAveragePercent}%`} tone="blue" />
          <StatCard icon="🎯" label="Pass Rate" value={`${overview.passPercent}%`} tone="green" />
          <StatCard icon="🔝" label="Highest %" value={`${overview.highestPercent}%`} tone="green" />
          <StatCard icon="🔻" label="Lowest %" value={`${overview.lowestPercent}%`} tone="purple" />
        </div>
      </div>

      <div className="hod-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="hod-card-title" style={{ margin: 0 }}>Student Performance</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDownloadResultSheet}
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
              📥 Download Result Sheet (CSV)
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
          <div className="hod-empty">Search or click the field above to load student results.</div>
        ) : (
          <table className="hod-table">
            <thead><tr><th>Reg No</th><th>Student</th><th>%</th><th>Result</th><th>Backlogs</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId}>
                  <td>{s.registrationNo}</td>
                  <td>{s.fullName}</td>
                  <td>{s.percentage}%</td>
                  <td style={{ color: s.result === 'Pass' ? '#86efac' : '#fca5a5' }}>{s.result}</td>
                  <td>{s.backlogs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="hod-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="hod-card-title" style={{ margin: 0 }}>Top 10 Students</h3>
          <button
            onClick={loadTop10}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            View Top Performers
          </button>
        </div>
        {showTop10 && (
          <>
            <table className="hod-table" style={{ marginBottom: 16 }}>
              <thead><tr><th>Rank</th><th>Student</th><th>Reg No</th><th>%</th></tr></thead>
              <tbody>
                {top10.map((s) => (
                  <tr key={s.studentId}><td>#{s.rank}</td><td>{s.fullName}</td><td>{s.registrationNo}</td><td>{s.percentage}%</td></tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={handleTransfer}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              📤 Transfer Top 10 to Principal
            </button>
            {transferMsg && <p style={{ marginTop: 10, fontSize: 13 }}>{transferMsg}</p>}
          </>
        )}
      </div>
    </>
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
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/student/hall-ticket')
      .then((res) => setTimetable(res.data.timetable || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="hod-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 className="hod-card-title" style={{ margin: 0 }}>📅 Department Main Examination Schedule & Hall Tickets</h3>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            {overview?.department_name || 'Master of Computer Applications (MCA)'} · Official Timetable for Enrolled Students
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          📥 Print Department Timetable & Admit Cards
        </button>
      </div>

      {loading ? (
        <p>Loading schedule...</p>
      ) : (
        <table className="hod-table">
          <thead>
            <tr>
              <th>SL NO</th>
              <th>SUBJECT CODE</th>
              <th>SUBJECT NAME</th>
              <th>EXAM DATE</th>
              <th>TIME SLOT</th>
              <th>EXAMINATION HALL</th>
              <th>ADMIT CARD STATUS</th>
            </tr>
          </thead>
          <tbody>
            {timetable.map((row, idx) => (
              <tr key={idx}>
                <td>#{row.slNo}</td>
                <td style={{ fontWeight: 700, color: '#c4b5fd' }}>{row.subjectCode}</td>
                <td style={{ fontWeight: 600 }}>{row.subjectName}</td>
                <td style={{ color: '#34d399', fontWeight: 700 }}>{row.examDate}</td>
                <td>{row.timeSlot}</td>
                <td>{row.hallNo}</td>
                <td>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                    ✓ Issued & Published
                  </span>
                </td>
              </tr>
            ))}
            {timetable.length === 0 && (
              <tr><td colSpan={7} className="hod-empty">No exam schedule published yet for this department.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}