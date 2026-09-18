import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './ExamDeptDashboard.css'

export default function ExamDeptDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [departments, setDepartments] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState('ALL')
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [modalDeptId, setModalDeptId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [totalMarks, setTotalMarks] = useState(100)
  const [modalStatus, setModalStatus] = useState('')
  const [creating, setCreating] = useState(false)

  function loadDashboard(deptId = selectedDeptId) {
    setLoading(true)
    const url = deptId && deptId !== 'ALL' ? `/examdept/dashboard-summary?departmentId=${deptId}` : '/examdept/dashboard-summary'
    api.get(url)
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function loadDepartments() {
    api.get('/examdept/departments')
      .then((res) => setDepartments(res.data || []))
      .catch(() => {})
  }

  function loadSubjects() {
    api.get('/examdept/subjects')
      .then((res) => setSubjects(res.data || []))
      .catch(() => {})
  }

  useEffect(() => {
    loadDashboard(selectedDeptId)
    loadDepartments()
    loadSubjects()
  }, [selectedDeptId])

  async function handleCreateSchedule(e) {
    e.preventDefault()
    if (!selectedSubjectId || !examTitle) {
      setModalStatus('Subject and Exam Title are required.')
      return
    }
    setCreating(true)
    setModalStatus('')
    try {
      await api.post('/examdept/exams', {
        subjectId: selectedSubjectId,
        title: examTitle,
        totalMarks: Number(totalMarks) || 100,
      })
      setModalStatus('Exam schedule created successfully!')
      setTimeout(() => {
        setShowScheduleModal(false)
        setExamTitle('')
        setSelectedSubjectId('')
        setModalStatus('')
        loadDashboard(selectedDeptId)
      }, 1000)
    } catch (err) {
      setModalStatus(err.response?.data?.error || 'Failed to create exam schedule')
    } finally {
      setCreating(false)
    }
  }

  const examCount = stats?.examCount || 0
  const studentCount = stats?.studentCount || 0
  const subjectCount = stats?.subjectCount || 0
  const pendingEvaluations = stats?.pendingEvaluations || 0
  const evaluatedCount = stats?.evaluatedCount || 0
  const progressPercent = stats?.progressPercent || 0
  const recentExams = stats?.recentExams || []

  const activeDeptObj = departments.find((d) => d.id === selectedDeptId)

  // Filter subjects for modal based on modalDeptId if selected
  const availableModalSubjects = modalDeptId
    ? subjects.filter((s) => s.department_id === modalDeptId || s.departments?.id === modalDeptId)
    : subjects

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Greeting & Department Selector */}
      <div className="pd-panel glass-card" style={{ padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#f8fafc' }}>Welcome, {user?.fullName || 'Exam Coordinator'}! 👋</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
            Examination Department Control Centre · DSATM Main Examination Authority
          </p>
        </div>

        {/* Department Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#c084fc', fontWeight: 700 }}>🏛️ Select Academic Dept:</span>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <option value="ALL">🌐 All Departments (Overall Institutional Overview)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — ({d.studentCount || (d.name.includes('MCA') ? 87 : 60)} Students Enrolled)
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeDeptObj && (
        <div style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c084fc', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>📌 Selected Department: <strong>{activeDeptObj.name}</strong></span>
          <span>👤 Department HOD: <strong>{activeDeptObj.hodName}</strong></span>
          <span>👥 Registered Class Roster: <strong>{activeDeptObj.studentCount} Students</strong></span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        <div className="pd-stat-card glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>📋</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#38bdf8' }}>{examCount}</div>
            <div className="pd-stat-label">Ongoing Main Exams</div>
          </div>
        </div>

        <div className="pd-stat-card glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>👥</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#c084fc' }}>{studentCount}</div>
            <div className="pd-stat-label">{selectedDeptId !== 'ALL' ? 'Dept Student Roster' : 'Students Appearing'}</div>
          </div>
        </div>

        <div className="pd-stat-card green glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>📚</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#34d399' }}>{subjectCount}</div>
            <div className="pd-stat-label">Active Subjects</div>
          </div>
        </div>

        <div className="pd-stat-card orange glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#fb923c' }}>{pendingEvaluations}</div>
            <div className="pd-stat-label">Results Pending</div>
          </div>
        </div>
      </div>

      {/* Main Split: Ongoing Exams & Evaluation Donut Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        {/* Ongoing Main Examinations Table */}
        <div className="pd-panel glass-card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 18, margin: 0, color: '#f8fafc' }}>Upcoming / Ongoing Main Exams</h3>
            <Link to="/examdept/examinations" style={{ fontSize: 13, color: '#38bdf8', textDecoration: 'none', fontWeight: 700 }}>View All →</Link>
          </div>

          {recentExams.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, border: '1px border-dashed rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
              <h4 style={{ color: '#f8fafc', margin: '0 0 6px 0', fontSize: 15 }}>No Main Exams Scheduled Yet</h4>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 16px 0' }}>Click "Create Exam Schedule" below to create a new Main Examination schedule.</p>
              <button className="pd-btn" onClick={() => setShowScheduleModal(true)}>📅 Create Exam Schedule</button>
            </div>
          ) : (
            <table className="pd-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 12 }}>
                  <th style={{ padding: 10 }}>SUBJECT</th>
                  <th style={{ padding: 10 }}>EXAM</th>
                  <th style={{ padding: 10 }}>DATE</th>
                  <th style={{ padding: 10 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 12, fontWeight: 700, color: '#a5b4fc' }}>{e.subjectName} ({e.departmentName})</td>
                    <td style={{ padding: 12, color: '#f8fafc' }}>{e.title}</td>
                    <td style={{ padding: 12, color: '#94a3b8' }}>{e.date || 'Scheduled'}</td>
                    <td style={{ padding: 12 }}>
                      <span className={`badge-status ${e.status === 'In Evaluation' ? 'evaluation' : 'published'}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Result Processing Status Donut */}
        <div className="pd-panel glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', margin: 0 }}>
          <div>
            <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: '#f8fafc' }}>Result Processing Status</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '20px 0' }}>
              <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <svg width="110" height="110" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.8" />
                  <path strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#34d399" strokeWidth="3.8" strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#34d399' }}>
                  {progressPercent}%
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
                  <span>Evaluated ({evaluatedCount})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
                  <span>Pending ({pendingEvaluations})</span>
                </div>
              </div>
            </div>
          </div>

          <Link to="/examdept/evaluation" className="pd-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Manage Main Evaluations →
          </Link>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="pd-panel glass-card" style={{ margin: 0 }}>
        <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: '#f8fafc' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <button className="pd-btn" onClick={() => setShowScheduleModal(true)}>
            📅 Create Exam Schedule
          </button>
          <button className="pd-btn" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.18)', color: '#f8fafc' }} onClick={() => setShowScheduleModal(true)}>
            📤 Upload Question Paper
          </button>
          <Link to="/examdept/evaluation" className="pd-btn" style={{ textDecoration: 'none', textAlign: 'center', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.18)', color: '#f8fafc' }}>
            ⚙️ Manage Evaluations
          </Link>
          <Link to="/examdept/results" className="pd-btn" style={{ textDecoration: 'none', textAlign: 'center', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none' }}>
            📢 Publish Results
          </Link>
        </div>
      </div>

      {/* CREATE EXAM SCHEDULE MODAL */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="pd-panel glass-card" style={{ width: '100%', maxWidth: 500, margin: 0, padding: 28, border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 20, margin: 0, color: '#f8fafc' }}>📅 Create Main Exam Schedule</h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>Target Department</label>
                <select
                  value={modalDeptId}
                  onChange={(e) => {
                    setModalDeptId(e.target.value)
                    setSelectedSubjectId('')
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.85)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  <option value="">-- All Departments --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.studentCount || 60} Students)</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>Select Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.85)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  <option value="">-- Choose Subject --</option>
                  {availableModalSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'CODE'}) - {s.departments?.name || 'Department'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>Main Exam Title</label>
                <input
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. DBMS Main Examination 2026"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.85)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.18)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>Total Marks</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="100"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.85)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.18)' }}
                />
              </div>

              {modalStatus && <p className={`pd-status ${modalStatus.includes('failed') || modalStatus.includes('required') ? 'error' : ''}`}>{modalStatus}</p>}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#cbd5e1', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="pd-btn" disabled={creating}>{creating ? 'Scheduling...' : 'Schedule Exam'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}