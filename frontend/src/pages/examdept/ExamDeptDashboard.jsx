import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './ExamDeptDashboard.css'

export default function ExamDeptDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [departments, setDepartments] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState(() => localStorage.getItem('examdept_selected_dept_id') || 'ALL')
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedDeptId) {
      localStorage.setItem('examdept_selected_dept_id', selectedDeptId)
    }
  }, [selectedDeptId])

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [modalDeptId, setModalDeptId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [totalMarks, setTotalMarks] = useState(100)
  const [modalStatus, setModalStatus] = useState('')
  const [creating, setCreating] = useState(false)

  const [deptInternalScores, setDeptInternalScores] = useState([])
  const [selectedSemFilter, setSelectedSemFilter] = useState('ALL')
  const [loadingInternals, setLoadingInternals] = useState(false)

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

  function loadDepartmentInternalScores(deptId = selectedDeptId, sem = selectedSemFilter) {
    setLoadingInternals(true)
    const semParam = sem && sem !== 'ALL' ? `?semester=${encodeURIComponent(sem)}` : ''
    api.get(`/examdept/departments/${deptId}/internal-marks${semParam}`)
      .then((res) => setDeptInternalScores(res.data?.students || []))
      .catch(() => setDeptInternalScores([]))
      .finally(() => setLoadingInternals(false))
  }

  useEffect(() => {
    loadDashboard(selectedDeptId)
    loadDepartments()
    loadSubjects()
    loadDepartmentInternalScores(selectedDeptId, selectedSemFilter)
  }, [selectedDeptId, selectedSemFilter])

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

  // 10-step visual pipeline bound to backend database API response
  const pData = stats?.pipeline || {}
  const pipelineSteps = [
    { label: 'Eligible Students', count: pData.eligibleStudents ?? studentCount, icon: '🎓', color: '#2563eb' },
    { label: 'Hall Tickets', count: pData.hallTicketsPublished ?? studentCount, icon: '🎟️', color: '#4f46e5' },
    { label: 'Exam Completed', count: pData.examsCompleted ?? examCount, icon: '📝', color: '#7c3aed' },
    { label: 'Scripts Received', count: pData.scriptsReceived ?? (evaluatedCount + pendingEvaluations), icon: '📦', color: '#db2777' },
    { label: 'Scripts Assigned', count: pData.scriptsAssigned ?? (evaluatedCount + pendingEvaluations), icon: '👤', color: '#ea580c' },
    { label: 'Evaluation', count: pData.evaluation ?? evaluatedCount, icon: '🤖', color: '#059669' },
    { label: 'Verification', count: pData.verification ?? evaluatedCount, icon: '🔍', color: '#0d9488' },
    { label: 'Result Processing', count: pData.resultProcessing ?? evaluatedCount, icon: '⚙️', color: '#6d28d9' },
    { label: 'Approval', count: pData.approval ?? evaluatedCount, icon: '⚖️', color: '#d97706' },
    { label: 'Published Results', count: pData.publishedResults ?? 0, icon: '📢', color: '#16a34a' },
  ]

  return (
    <div className="edd-wrap">
      {/* Top Greeting Banner */}
      <div className="edd-greeting-card">
        <div>
          <h2 className="edd-welcome">Welcome, {user?.fullName || 'Exam Controller'}! 👋</h2>
          <p className="edd-sub">Main Examination Control Centre · DSATM Academic Examination Authority</p>
        </div>

        {/* Department Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>🏛️ Department Filter:</span>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="edd-dept-select"
          >
            <option value="ALL">🌐 All Departments (Institutional Overview)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.studentCount || 0} Students)
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeDeptObj && (
        <div style={{ padding: '12px 20px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>📌 Selected Department: <strong>{activeDeptObj.name}</strong></span>
          <span>👤 Department HOD: <strong>{activeDeptObj.hodName}</strong></span>
          <span>👥 Registered Roster: <strong>{activeDeptObj.studentCount} Students</strong></span>
        </div>
      )}

      {/* 4 Pastel Stat Cards */}
      <div className="edd-cards">
        <div className="edd-card">
          <div className="card-icon-bubble">📋</div>
          <div>
            <div className="edd-card-val">{examCount}</div>
            <div className="edd-card-lbl">Ongoing Main Exams</div>
          </div>
        </div>

        <div className="edd-card">
          <div className="card-icon-bubble">👥</div>
          <div>
            <div className="edd-card-val">{studentCount}</div>
            <div className="edd-card-lbl">{selectedDeptId !== 'ALL' ? 'Dept Student Roster' : 'Students Appearing'}</div>
          </div>
        </div>

        <div className="edd-card">
          <div className="card-icon-bubble">📚</div>
          <div>
            <div className="edd-card-val">{subjectCount}</div>
            <div className="edd-card-lbl">Active Subjects</div>
          </div>
        </div>

        <div className="edd-card">
          <div className="card-icon-bubble">⏳</div>
          <div>
            <div className="edd-card-val">{pendingEvaluations}</div>
            <div className="edd-card-lbl">Results Pending</div>
          </div>
        </div>
      </div>

      {/* 10-Step Visual Result Processing Pipeline */}
      <div className="edd-section-box">
        <div className="edd-section-header">
          <h3>⚡ Main Examination Result Processing Pipeline</h3>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Real-Time Database Workflow Tracker</span>
        </div>
        <div className="edd-pipeline-grid">
          {pipelineSteps.map((step, idx) => (
            <div key={idx} className="edd-pipeline-step">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="edd-step-badge">Step {idx + 1} of 10</span>
                <span style={{ fontSize: 16 }}>{step.icon}</span>
              </div>
              <div className="edd-step-count" style={{ color: step.color }}>{step.count}</div>
              <div className="edd-step-title">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Split: Ongoing Exams & Evaluation Donut Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        {/* Upcoming / Ongoing Main Exams Table */}
        <div className="edd-section-box" style={{ margin: 0 }}>
          <div className="edd-section-header">
            <h3>Upcoming / Ongoing Main Exams</h3>
            <Link to="/examdept/examinations" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 800 }}>View All →</Link>
          </div>

          {recentExams.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
              <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 15, fontWeight: 800 }}>No Main Exams Scheduled Yet</h4>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px 0' }}>Click below to create a new Main Examination schedule for departments.</p>
              <button className="edd-action-btn blue" onClick={() => setShowScheduleModal(true)}>📅 Create Exam Schedule</button>
            </div>
          ) : (
            <div className="edd-table-container">
              <table className="edd-table">
                <thead>
                  <tr>
                    <th>Subject & Dept</th>
                    <th>Exam Title</th>
                    <th>Exam Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExams.map((e, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: '#1d4ed8' }}>{e.subjectName} ({e.departmentName})</td>
                      <td style={{ color: '#0f172a', fontWeight: 700 }}>{e.title}</td>
                      <td style={{ color: '#64748b' }}>{e.date || 'Scheduled'}</td>
                      <td>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Result Processing Status Donut */}
        <div className="edd-section-box" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', margin: 0 }}>
          <div>
            <div className="edd-section-header">
              <h3>Result Processing Status</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24, margin: '20px 0' }}>
              <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <svg width="110" height="110" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3.8" />
                  <path strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.8" strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#059669' }}>
                  {progressPercent}%
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0f172a', fontWeight: 700 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                  <span>Evaluated ({evaluatedCount})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748b', fontWeight: 700 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316' }} />
                  <span>Pending ({pendingEvaluations})</span>
                </div>
              </div>
            </div>
          </div>

          <Link to="/examdept/evaluation" className="edd-action-btn blue" style={{ width: '100%', boxSizing: 'border-box' }}>
            Manage Main Evaluations →
          </Link>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="edd-section-box">
        <div className="edd-section-header">
          <h3>Quick Actions</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <button className="edd-action-btn blue" onClick={() => setShowScheduleModal(true)}>
            📅 Create Exam Schedule
          </button>
          <Link to="/examdept/question-papers" className="edd-action-btn purple">
            📄 Question Papers Repository
          </Link>
          <Link to="/examdept/scripts" className="edd-action-btn teal">
            📦 Answer Scripts Tracking
          </Link>
          <Link to="/examdept/results" className="edd-action-btn green">
            📢 Publish Results
          </Link>
        </div>
      </div>

      {/* HOD-APPROVED INTERNAL MARKS & ELIGIBILITY FEED */}
      <div className="edd-section-box">
        <div className="edd-section-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 17, margin: 0, color: '#0f172a', fontWeight: 800 }}>
              📋 HOD-Approved Internal Marks & Eligibility Feed ({selectedDeptId === 'ALL' ? 'All Departments' : activeDeptObj?.name || 'Department'})
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0', fontWeight: 600 }}>
              Automatic eligibility feed received from Faculty & HOD workflow. Internal marks serve as eligibility input for Main Examination entry.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>Semester:</span>
            <select
              value={selectedSemFilter}
              onChange={(e) => setSelectedSemFilter(e.target.value)}
              className="edd-dept-select"
              style={{ padding: '6px 12px' }}
            >
              <option value="ALL">All Semesters</option>
              <option value="1st Sem">1st Sem</option>
              <option value="2nd Sem">2nd Sem</option>
              <option value="3rd Sem">3rd Sem</option>
              <option value="4th Sem">4th Sem</option>
            </select>
          </div>
        </div>

        {loadingInternals ? (
          <p style={{ color: '#64748b', padding: 20 }}>Loading internal marks data...</p>
        ) : deptInternalScores.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
            No internal mark submissions approved by HOD yet for this department filter.
          </div>
        ) : (
          <div className="edd-table-container">
            <table className="edd-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>USN</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Internal Score</th>
                  <th>Eligibility</th>
                  <th>HOD Approval</th>
                </tr>
              </thead>
              <tbody>
                {deptInternalScores.map((st, idx) => (
                  <tr key={st.studentId || idx}>
                    <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800, color: '#1d4ed8' }}>{st.registrationNo}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{st.fullName}</td>
                    <td>
                      {(() => {
                        const deptObj = departments.find((d) => d.id === st.departmentId);
                        const isUuid = st.departmentName && st.departmentName.length > 20 && st.departmentName.includes('-');
                        const resolvedDeptName = deptObj?.name || (!isUuid && st.departmentName ? st.departmentName : 'Master of Computer Applications');
                        return (
                          <span
                            onClick={() => st.departmentId && setSelectedDeptId(st.departmentId)}
                            title="Click to filter dashboard by this department"
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer'
                            }}
                          >
                            🏛️ {resolvedDeptName}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ color: '#475569' }}>{st.semester}</td>
                    <td style={{ fontWeight: 900, color: st.avgInternal50 >= 25 ? '#059669' : '#e11d48' }}>
                      {st.avgInternal50 > 0 ? `${st.avgInternal50} / 50` : '0 / 50'}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        background: st.avgInternal50 >= 25 ? '#ecfdf5' : '#fff1f2',
                        color: st.avgInternal50 >= 25 ? '#047857' : '#e11d48',
                        border: `1px solid ${st.avgInternal50 >= 25 ? '#a7f3d0' : '#fecdd3'}`,
                      }}>
                        {st.avgInternal50 >= 25 ? 'ELIGIBLE' : 'NOT ELIGIBLE (Low Internal)'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                      }}>
                        ✓ Approved by HOD
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE EXAM SCHEDULE MODAL */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="edd-section-box" style={{ width: '100%', maxWidth: 500, margin: 0, padding: 28, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, margin: 0, color: '#0f172a', fontWeight: 800 }}>📅 Create Main Exam Schedule</h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', fontWeight: 700, marginBottom: 6 }}>Target Department</label>
                <select
                  value={modalDeptId}
                  onChange={(e) => {
                    setModalDeptId(e.target.value)
                    setSelectedSubjectId('')
                  }}
                  className="edd-dept-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">-- All Departments --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.studentCount || 0} Students)</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', fontWeight: 700, marginBottom: 6 }}>Select Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                  className="edd-dept-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">-- Choose Subject --</option>
                  {availableModalSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'CODE'}) - {s.departments?.name || 'Department'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', fontWeight: 700, marginBottom: 6 }}>Main Exam Title</label>
                <input
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. DBMS Main Examination 2026"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', fontWeight: 700, marginBottom: 6 }}>Total Marks</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="100"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              {modalStatus && <p style={{ color: modalStatus.includes('failed') || modalStatus.includes('required') ? '#e11d48' : '#059669', fontSize: 13, fontWeight: 700, margin: 0 }}>{modalStatus}</p>}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, color: '#334155', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button type="submit" className="edd-action-btn blue" disabled={creating} style={{ padding: '8px 16px' }}>{creating ? 'Scheduling...' : 'Schedule Exam'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}