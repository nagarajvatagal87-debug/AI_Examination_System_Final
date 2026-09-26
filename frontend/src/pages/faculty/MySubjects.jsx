import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './MySubjects.css'

export default function MySubjects() {
  const [subjects, setSubjects] = useState([])
  const [materialsFor, setMaterialsFor] = useState(null)
  const [studentsFor, setStudentsFor] = useState(null)
  const [internalsFor, setInternalsFor] = useState(null)
  
  const [materials, setMaterials] = useState([])
  const [studentsList, setStudentsList] = useState([])
  const [internalRoster, setInternalRoster] = useState([])
  const [internalInput, setInternalInput] = useState({})

  const [uploadFile, setUploadFile] = useState(null)
  const [msg, setMsg] = useState('')
  const [studentMsg, setStudentMsg] = useState('')
  const [internalMsg, setInternalMsg] = useState('')
  const navigate = useNavigate()

  // New Student Form State
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    email: '',
    registrationNo: '',
    semester: '3rd Sem',
    section: 'A',
  })

  const [allDeptSubjects, setAllDeptSubjects] = useState([])
  const [selectedClaimSubId, setSelectedClaimSubId] = useState('')
  const [claimMsg, setClaimMsg] = useState('')

  function loadSubjects() {
    api.get('/subjects?mine=true').then((res) => setSubjects(res.data)).catch(() => {})
    api.get('/subjects').then((res) => setAllDeptSubjects(res.data)).catch(() => {})
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  async function handleClaimSubject(e) {
    e.preventDefault()
    if (!selectedClaimSubId) return
    setClaimMsg('Linking subject to your faculty workspace...')
    try {
      await api.post('/subjects/claim', { subjectId: selectedClaimSubId })
      setClaimMsg('✅ Subject assigned to your account successfully!')
      setSelectedClaimSubId('')
      loadSubjects()
    } catch (err) {
      setClaimMsg(`❌ ${err.response?.data?.error || 'Failed to assign subject'}`)
    }
  }


  function openMaterials(subject) {
    setStudentsFor(null)
    setInternalsFor(null)
    setMaterialsFor(subject)
    setMsg('')
    api.get(`/course-materials?subjectId=${subject.id}&kind=course_pdf`)
      .then((res) => setMaterials(res.data))
      .catch(() => {})
  }

  async function handleUpload() {
    if (!uploadFile || !materialsFor) {
      setMsg('❌ Please select a PDF file to upload.')
      return
    }
    setMsg('Uploading syllabus PDF & indexing for RAG AI generation...')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('subjectId', materialsFor.id)
      formData.append('kind', 'course_pdf')

      await api.post('/faculty/course-materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMsg('✅ Syllabus PDF uploaded successfully! Indexed for Question Paper Generation.')
      setUploadFile(null)
      openMaterials(materialsFor)
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Upload failed'}`)
    }
  }

  const [candidateList, setCandidateList] = useState([])
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([])

  function openStudents(subject) {
    setMaterialsFor(null)
    setInternalsFor(null)
    setStudentsFor(subject)
    setStudentMsg('')
    setSelectedCandidateIds([])

    api.get(`/faculty/subjects/${subject.id}/enrolled-students`)
      .then((res) => setStudentsList(res.data || []))
      .catch(() => setStudentsList([]))

    api.get(`/faculty/subjects/${subject.id}/eligible-students`)
      .then((res) => setCandidateList(res.data || []))
      .catch(() => setCandidateList([]))
  }

  function toggleCandidateSelect(id) {
    if (selectedCandidateIds.includes(id)) {
      setSelectedCandidateIds(selectedCandidateIds.filter(x => x !== id))
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, id])
    }
  }

  async function handleBatchEnroll() {
    if (!studentsFor || selectedCandidateIds.length === 0) return
    setStudentMsg('Enrolling selected candidate students into subject...')
    try {
      await api.post(`/faculty/subjects/${studentsFor.id}/enroll`, { studentIds: selectedCandidateIds })
      setStudentMsg('✅ Candidate students enrolled successfully into subject!')
      setSelectedCandidateIds([])
      openStudents(studentsFor)
    } catch (err) {
      setStudentMsg(`❌ ${err.response?.data?.error || 'Failed to enroll students'}`)
    }
  }

  async function handleRemoveStudent(studentId) {
    if (!window.confirm('Are you sure you want to unenroll this student from the subject?')) return
    setStudentMsg('Removing student from subject...')
    try {
      await api.delete(`/faculty/subjects/${studentsFor.id}/unenroll/${studentId}`)
      setStudentMsg('✅ Student unenrolled successfully!')
      if (studentsFor) openStudents(studentsFor)
    } catch (err) {
      setStudentMsg(`❌ ${err.response?.data?.error || 'Failed to unenroll student'}`)
    }
  }

  function openInternalEvaluation(subject) {
    setMaterialsFor(null)
    setStudentsFor(null)
    setAttendanceFor(null)
    setInternalsFor(subject)
    setInternalMsg('')
    api.get(`/faculty/subjects/${subject.id}/internal-marks`)
      .then((res) => {
        const roster = res.data?.roster || []
        setInternalRoster(roster)
        const inputMap = {}
        roster.forEach((r) => {
          inputMap[r.studentId] = {
            internal1: r.internal1 || 0,
            internal2: r.internal2 || 0,
            assignment: r.assignment || 0,
            project: r.project || 0,
          }
        })
        setInternalInput(inputMap)
      })
      .catch(() => {
        setInternalRoster([])
        setInternalInput({})
      })
  }

  async function handleAddStudent(e) {
    e.preventDefault()
    if (!studentsFor) return
    setStudentMsg('Adding student & enrolling into subject...')
    try {
      const payload = {
        ...studentForm,
        subjectId: studentsFor.id,
      }
      await api.post('/faculty/students', payload)
      setStudentMsg('✅ New student created & enrolled successfully!')
      setStudentForm({
        fullName: '',
        email: '',
        registrationNo: '',
        semester: '3rd Sem',
        section: 'A',
      })
      openStudents(studentsFor)
    } catch (err) {
      setStudentMsg(`❌ ${err.response?.data?.error || 'Failed to add student'}`)
    }
  }

  function updateInternalScore(studentId, field, val) {
    const next = { ...internalInput }
    if (!next[studentId]) next[studentId] = { internal1: 0, internal2: 0, assignment: 0, project: 0 }
    next[studentId][field] = Number(val) || 0
    setInternalInput(next)
  }

  async function handleSaveInternalMarks() {
    if (!internalsFor) return
    setInternalMsg('Saving 50-mark internal evaluation sheet...')
    try {
      const marksArray = Object.keys(internalInput).map((stId) => ({
        studentId: stId,
        ...internalInput[stId],
      }))
      await api.post(`/faculty/subjects/${internalsFor.id}/internal-marks`, { marks: marksArray })
      setInternalMsg('✅ 50-Mark Internal evaluation saved successfully!')
      openInternalEvaluation(internalsFor)
    } catch (err) {
      setInternalMsg(`❌ ${err.response?.data?.error || 'Failed to save marks'}`)
    }
  }

  async function handleSubmitInternalsToHOD() {
    if (!internalsFor) return
    setInternalMsg('Submitting internal marks to HOD for approval...')
    try {
      await handleSaveInternalMarks()
      const res = await api.post(`/faculty/subjects/${internalsFor.id}/submit-internals-to-hod`)
      setInternalMsg(`✅ 50-Mark Internal Sheet for ${res.data.subjectName || internalsFor.name} submitted successfully to HOD!`)
    } catch (err) {
      setInternalMsg(`❌ ${err.response?.data?.error || 'Submission failed'}`)
    }
  }

  const [attendanceFor, setAttendanceFor] = useState(null)
  const [attendanceList, setAttendanceList] = useState([])
  const [attendanceMsg, setAttendanceMsg] = useState('')

  function openAttendance(subject) {
    setMaterialsFor(null)
    setStudentsFor(null)
    setInternalsFor(null)
    setAttendanceFor(subject)
    setAttendanceMsg('')
    api.get(`/faculty/attendance?subjectId=${subject.id}`)
      .then((res) => setAttendanceList(res.data || []))
      .catch(() => {})
  }

  function handleMarkPresent(studentId) {
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.student_id === studentId) {
          const newTotal = (item.totalClasses || 0) + 1
          const newAtt = (item.attendedClasses || 0) + 1
          const pct = Math.round((newAtt / newTotal) * 100)
          return {
            ...item,
            totalClasses: newTotal,
            attendedClasses: newAtt,
            percentage: pct,
            hasAttendance: true,
            isEligible: pct >= 75,
            status: pct >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE_ATTENDANCE_SHORTAGE'
          }
        }
        return item
      })
    )
  }

  function handleMarkAbsent(studentId) {
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.student_id === studentId) {
          const newTotal = (item.totalClasses || 0) + 1
          const newAtt = item.attendedClasses || 0
          const pct = Math.round((newAtt / newTotal) * 100)
          return {
            ...item,
            totalClasses: newTotal,
            attendedClasses: newAtt,
            percentage: pct,
            hasAttendance: true,
            isEligible: pct >= 75,
            status: pct >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE_ATTENDANCE_SHORTAGE'
          }
        }
        return item
      })
    )
  }

  function handleDirectAttChange(studentId, field, val) {
    const num = Math.max(0, Number(val) || 0)
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.student_id === studentId) {
          const tot = field === 'totalClasses' ? num : (item.totalClasses || 0)
          const att = field === 'attendedClasses' ? num : (item.attendedClasses || 0)
          const validAtt = Math.min(tot, att)
          const pct = tot > 0 ? Math.round((validAtt / tot) * 100) : 0
          return {
            ...item,
            totalClasses: tot,
            attendedClasses: validAtt,
            percentage: pct,
            hasAttendance: tot > 0,
            isEligible: tot > 0 && pct >= 75,
            status: tot > 0 ? (pct >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE_ATTENDANCE_SHORTAGE') : 'PENDING_ATTENDANCE_ENTRY'
          }
        }
        return item
      })
    )
  }

  async function handleSaveAttendance() {
    if (!attendanceFor) return
    setAttendanceMsg('Updating & recalculating attendance percentages...')
    try {
      await api.post('/faculty/attendance', {
        subjectId: attendanceFor.id,
        attendanceList
      })
      setAttendanceMsg('✅ Attendance percentage updated successfully! HOD & Student views updated.')
    } catch (err) {
      setAttendanceMsg(`❌ ${err.response?.data?.error || 'Failed to update attendance'}`)
    }
  }

  async function handleDeleteMaterial(materialId, fileName) {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? It will also be removed from the Student Dashboard.`)) return
    setMsg('Deleting syllabus PDF...')
    try {
      await api.delete(`/course-materials/${materialId}`)
      setMsg(`✅ "${fileName}" deleted successfully!`)
      setMaterials((prev) => prev.filter((m) => m.id !== materialId))
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Failed to delete PDF'}`)
    }
  }

  async function handleDeleteSubject(subjectId, subjectName) {
    if (!window.confirm(`Are you sure you want to delete "${subjectName}"? This will remove the subject from your workspace.`)) return
    setClaimMsg(`Deleting subject "${subjectName}"...`)
    try {
      await api.delete(`/subjects/${subjectId}`)
      setClaimMsg(`✅ Subject "${subjectName}" deleted successfully!`)
      loadSubjects()
    } catch (err) {
      setClaimMsg(`❌ ${err.response?.data?.error || 'Failed to delete subject'}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <h2 className="ms-title">My Subjects & Internal Marks Workspace</h2>
        <form onSubmit={handleClaimSubject} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#ffffff', padding: '8px 16px', borderRadius: 12, border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(15,23,42,0.04)' }}>
          <span style={{ fontSize: 13, color: '#0284c7', fontWeight: 800 }}>+ Select / Take Subject:</span>
          <select
            value={selectedClaimSubId}
            onChange={(e) => setSelectedClaimSubId(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
          >
            <option value="">-- Choose Subject --</option>
            {allDeptSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
            ))}
          </select>
          <button type="submit" style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(2,132,199,0.25)' }}>
            ➕ Take Subject
          </button>
        </form>
      </div>

      {claimMsg && <p style={{ fontSize: 13, fontWeight: 700, color: claimMsg.includes('✅') ? '#34d399' : '#f87171', marginBottom: 16 }}>{claimMsg}</p>}

      <div className="ms-grid">
        {subjects.map((s, idx) => {
          const activePanel =
            (materialsFor?.id === s.id && 'materials') ||
            (studentsFor?.id === s.id && 'students') ||
            (attendanceFor?.id === s.id && 'attendance') ||
            (internalsFor?.id === s.id && 'internals') ||
            null

          // Dynamic vibrant gradient color schemes per card
          const cardGradients = [
            { border: '#6366f1', bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', lightBg: 'rgba(99, 102, 241, 0.1)', text: '#4f46e5' },
            { border: '#0284c7', bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', lightBg: 'rgba(2, 132, 199, 0.1)', text: '#0284c7' },
            { border: '#10b981', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', lightBg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
            { border: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', lightBg: 'rgba(139, 92, 246, 0.1)', text: '#7c3aed' },
            { border: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', lightBg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
          ]
          const theme = cardGradients[idx % cardGradients.length]

          return (
            <div key={s.id} className={`ms-card-v2 ${activePanel ? 'is-active' : ''}`}>
              {/* Top Gradient Banner Accent */}
              <div className="ms-card-stripe" style={{ background: theme.bg }} />

              <div className="ms-card-body">
                {/* Top Row: Code Pill Badge + Subject Icon */}
                <div className="ms-card-top-bar">
                  <div className="ms-code-badge" style={{ color: theme.text, borderColor: `${theme.border}40`, background: theme.lightBg }}>
                    <span className="ms-code-dot" style={{ background: theme.border }} />
                    {s.code || 'SUBJECT'}
                  </div>
                  <div className="ms-card-icon-avatar" style={{ background: theme.lightBg, color: theme.text }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                </div>

                {/* Subject Title */}
                <h3 className="ms-card-title">{s.name}</h3>
                
                {/* Meta line */}
                <div className="ms-card-meta">
                  Faculty Workspace • Active Course
                </div>

                {/* Micro Tool Grid */}
                <div className="ms-tool-grid">
                  <button 
                    className={`ms-tool-btn ${materialsFor?.id === s.id ? 'active' : ''}`} 
                    onClick={() => openMaterials(s)}
                    title="Upload syllabus PDF & index RAG"
                  >
                    <span className="ms-tool-icon pdf-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    <span className="ms-tool-text">Syllabus PDF</span>
                  </button>

                  <button 
                    className={`ms-tool-btn ${studentsFor?.id === s.id ? 'active' : ''}`} 
                    onClick={() => openStudents(s)}
                    title="Manage student roster & enrollment"
                  >
                    <span className="ms-tool-icon students-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </span>
                    <span className="ms-tool-text">Students</span>
                  </button>

                  <button 
                    className={`ms-tool-btn ${attendanceFor?.id === s.id ? 'active' : ''}`} 
                    onClick={() => openAttendance(s)}
                    title="Daily attendance & 75% cutoff rule"
                  >
                    <span className="ms-tool-icon attendance-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    </span>
                    <span className="ms-tool-text">Attendance</span>
                  </button>

                  <button 
                    className={`ms-tool-btn ${internalsFor?.id === s.id ? 'active' : ''}`} 
                    onClick={() => openInternalEvaluation(s)}
                    title="50-mark internal evaluation & HOD approval"
                  >
                    <span className="ms-tool-icon internals-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </span>
                    <span className="ms-tool-text">50m Internals</span>
                  </button>
                </div>

                {/* Footer Bar */}
                <div className="ms-card-footer">
                  <button 
                    className="ms-btn-exams" 
                    onClick={() => navigate(`/faculty/examinations?subjectId=${s.id}`)}
                  >
                    <span>Exams Portal</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                  
                  <button 
                    className="ms-btn-delete" 
                    onClick={() => handleDeleteSubject(s.id, s.name)}
                    title="Delete Subject Workspace"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {subjects.length === 0 && <p className="hint">No subjects assigned to you yet. Use "+ Select / Take Subject" above to pick your subject!</p>}
      </div>

      {materialsFor && (
        <div className="ms-materials-panel">
          <div className="ms-materials-header">
            <h3>{materialsFor.name} — Syllabus & Course Notes PDF</h3>
            <button className="ms-close" onClick={() => setMaterialsFor(null)}>✕</button>
          </div>
          <ul className="ms-materials-list">
            {materials.map((m) => (
              <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#ffffff', borderRadius: 10, marginBottom: 8, border: '1px solid #cbd5e1' }}>
                <div>
                  📄 <strong style={{ color: '#0f172a' }}>{m.title || m.file_name}</strong>
                  <span className="ms-date" style={{ marginLeft: 12, color: '#64748b', fontSize: 12 }}>{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => handleDeleteMaterial(m.id, m.title || m.file_name)}
                  style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  title="Delete syllabus PDF"
                >
                  🗑️ Delete PDF
                </button>
              </li>
            ))}
            {materials.length === 0 && <li className="hint">No syllabus PDF uploaded yet. Upload below to enable RAG Question Generation.</li>}
          </ul>
          <div className="fd-form-row">
            <input type="file" accept=".pdf" onChange={(e) => setUploadFile(e.target.files[0])} />
            <button className="fd-btn" onClick={handleUpload}>+ Upload Syllabus / Notes PDF</button>
          </div>
          {msg && <p className="fd-status" style={{ color: '#10b981', marginTop: 10 }}>{msg}</p>}
        </div>
      )}

      {/* Attendance Management Panel */}
      {attendanceFor && (
        <div className="ms-materials-panel" style={{ borderColor: 'rgba(139,92,246,0.6)' }}>
          <div className="ms-materials-header">
            <h3>📋 Student Daily Attendance Tracker — {attendanceFor.name}</h3>
            <button className="ms-close" onClick={() => setAttendanceFor(null)}>✕</button>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#334155', border: '1px solid #cbd5e1' }}>
            <strong>Academic Attendance Rule:</strong> Attendance percentages are generated automatically as <code style={{ color: '#0284c7', fontWeight: 700 }}>(Attended / Total) × 100</code>.<br />
            <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ 75% Cutoff Rule:</span> Students maintaining <strong>&lt; 75% overall attendance</strong> are <strong>NOT ELIGIBLE</strong> to write internal exams or view the internal timetable.
          </div>

          {attendanceMsg && (
            <p style={{ padding: '10px 14px', borderRadius: 8, background: attendanceMsg.includes('❌') ? '#fef2f2' : '#f0fdf4', color: attendanceMsg.includes('❌') ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 700, marginBottom: 16, border: attendanceMsg.includes('❌') ? '1px solid #fca5a5' : '1px solid #bbf7d0' }}>
              {attendanceMsg}
            </p>
          )}

          {attendanceList.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
              🎓 No students enrolled in <strong>{attendanceFor.name}</strong> yet. Click the <strong>🎓 Students</strong> button above to enroll department candidate students into this subject.
            </p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#0f172a' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: 12 }}>USN / Reg No</th>
                      <th style={{ padding: 12 }}>Student Name</th>
                      <th style={{ padding: 12 }}>Total Classes</th>
                      <th style={{ padding: 12 }}>Classes Attended</th>
                      <th style={{ padding: 12 }}>Attendance %</th>
                      <th style={{ padding: 12 }}>Quick Attendance</th>
                      <th style={{ padding: 12 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceList.map((st) => (
                      <tr key={st.student_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: 12, color: '#2563eb', fontWeight: 700 }}>{st.registration_no}</td>
                        <td style={{ padding: 12, fontWeight: 700 }}>{st.full_name}</td>
                        <td style={{ padding: 8 }}>
                          <input
                            type="number" min={1} max={100}
                            value={st.totalClasses}
                            onChange={(e) => handleDirectAttChange(st.student_id, 'totalClasses', e.target.value)}
                            style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 700 }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            type="number" min={0} max={st.totalClasses}
                            value={st.attendedClasses}
                            onChange={(e) => handleDirectAttChange(st.student_id, 'attendedClasses', e.target.value)}
                            style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 700 }}
                          />
                        </td>
                        <td style={{ padding: 12, fontWeight: 900, fontSize: 15, color: st.percentage >= 75 ? '#059669' : '#dc2626' }}>
                          {st.percentage}%
                        </td>
                        <td style={{ padding: 8 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleMarkPresent(st.student_id)}
                              style={{ padding: '5px 10px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                            >
                              + Present
                            </button>
                            <button
                              onClick={() => handleMarkAbsent(st.student_id)}
                              style={{ padding: '5px 10px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                            >
                              + Absent
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: 12 }}>
                          {st.percentage >= 75 ? (
                            <span style={{ padding: '4px 10px', borderRadius: 12, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700, border: '1px solid #86efac' }}>
                              ✓ Eligible (≥75%)
                            </span>
                          ) : (
                            <span style={{ padding: '4px 10px', borderRadius: 12, background: '#fee2e2', color: '#b91c1c', fontSize: 12, fontWeight: 700, border: '1px solid #fca5a5' }}>
                              ⚠️ Shortage (&lt;75%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="fd-btn" onClick={handleSaveAttendance} style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', width: '100%' }}>
                💾 Save & Sync Student Attendance Percentages
              </button>
            </>
          )}
        </div>
      )}

      {studentsFor && (
        <div className="ms-materials-panel" style={{ borderColor: 'rgba(59,130,246,0.5)' }}>
          <div className="ms-materials-header">
            <h3>🎓 {studentsFor.name} — Student Roster & Enrollment</h3>
            <button className="ms-close" onClick={() => setStudentsFor(null)}>✕</button>
          </div>

          {/* Department Candidate Students Batch Enrollment section */}
          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#0284c7', fontWeight: 800 }}>➕ Select & Enroll Department Candidate Students into {studentsFor.name}</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#64748b' }}>Check candidate students from your department to enroll them into this subject's active roster:</p>
            {candidateList.filter(c => !studentsList.some(s => s.id === c.id)).length === 0 ? (
              <p style={{ fontSize: 12, color: '#059669', margin: 0, fontStyle: 'italic', fontWeight: 700 }}>✓ All available department candidate students are already enrolled in this subject.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14, maxHeight: 180, overflowY: 'auto' }}>
                  {candidateList.filter(c => !studentsList.some(s => s.id === c.id)).map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#ffffff', borderRadius: 8, cursor: 'pointer', border: selectedCandidateIds.includes(c.id) ? '1px solid #0284c7' : '1px solid #cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={selectedCandidateIds.includes(c.id)}
                        onChange={() => toggleCandidateSelect(c.id)}
                      />
                      <div style={{ fontSize: 12 }}>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{c.full_name}</strong>
                        <span style={{ color: '#0284c7', fontWeight: 700 }}>{c.registration_no || '—'}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedCandidateIds.length > 0 && (
                  <button className="fd-btn" onClick={handleBatchEnroll} style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', width: '100%', padding: 10, fontWeight: 800 }}>
                    ➕ Enroll {selectedCandidateIds.length} Selected Candidates into {studentsFor.name}
                  </button>
                )}
              </>
            )}
          </div>

          <form onSubmit={handleAddStudent} style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#0284c7', fontWeight: 800 }}>+ Add Brand New Student to {studentsFor.name}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 80px', gap: 10, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Student Full Name"
                value={studentForm.fullName}
                onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                required
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 600 }}
              />
              <input
                type="email"
                placeholder="Student Email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                required
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 600 }}
              />
              <input
                type="text"
                placeholder="USN / Reg No"
                value={studentForm.registrationNo}
                onChange={(e) => setStudentForm({ ...studentForm, registrationNo: e.target.value })}
                required
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 600 }}
              />
              <input
                type="text"
                placeholder="Sem"
                value={studentForm.semester}
                onChange={(e) => setStudentForm({ ...studentForm, semester: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 600 }}
              />
              <input
                type="text"
                placeholder="Sec"
                value={studentForm.section}
                onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 600 }}
              />
            </div>
            <button className="fd-btn" type="submit" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', width: '100%', padding: 10, fontWeight: 800 }}>
              Save & Create New Student for {studentsFor.name}
            </button>
          </form>

          {studentMsg && (
            <p style={{ padding: '10px 14px', borderRadius: 8, background: studentMsg.includes('❌') ? '#fef2f2' : '#f0fdf4', color: studentMsg.includes('❌') ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 700, margin: '0 0 16px 0', border: studentMsg.includes('❌') ? '1px solid #fca5a5' : '1px solid #bbf7d0' }}>
              {studentMsg}
            </p>
          )}

          <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Enrolled Students Roster ({studentsList.length})</h4>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#0f172a' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: 10 }}>USN / Reg No</th>
                  <th style={{ padding: 10 }}>Student Name</th>
                  <th style={{ padding: 10 }}>Email</th>
                  <th style={{ padding: 10 }}>Sem / Sec</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((st) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 10, color: '#2563eb', fontWeight: 700 }}>{st.registration_no || '—'}</td>
                    <td style={{ padding: 10, fontWeight: 700 }}>{st.full_name}</td>
                    <td style={{ padding: 10, color: '#64748b' }}>{st.email}</td>
                    <td style={{ padding: 10 }}>{st.semester || '3rd Sem'} - {st.section || 'A'}</td>
                    <td style={{ padding: 10, textAlign: 'right' }}>
                      <button
                        onClick={() => handleRemoveStudent(st.id)}
                        style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                      >
                        🗑️ Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {studentsList.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                      No students enrolled in this subject yet. Select candidate students above or add a new student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 50-Mark Internal Evaluation Panel */}
      {internalsFor && (
        <div className="ms-materials-panel" style={{ borderColor: '#a7f3d0' }}>
          <div className="ms-materials-header">
            <h3>📊 50-Mark Internal Evaluation — {internalsFor.name}</h3>
            <button className="ms-close" onClick={() => setInternalsFor(null)}>✕</button>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#334155', border: '1px solid #cbd5e1' }}>
            <strong>Faculty 50-Mark Internal Rule:</strong> Enter Internal 1 (max 15m), Internal 2 (max 15m), Assignment (max 10m/20m), Project (max 10m/0m). <br />
            <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ Eligibility Threshold:</span> Students scoring <strong>&lt; 25 out of 50</strong> are <strong>NOT ELIGIBLE / DETAINED</strong> from taking up the Main Examination.
          </div>

          {internalMsg && (
            <p style={{ padding: '10px 14px', borderRadius: 8, background: internalMsg.includes('❌') ? '#fef2f2' : '#f0fdf4', color: internalMsg.includes('❌') ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 700, marginBottom: 16, border: internalMsg.includes('❌') ? '1px solid #fca5a5' : '1px solid #bbf7d0' }}>
              {internalMsg}
            </p>
          )}

          {internalRoster.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
              🎓 No students enrolled in <strong>{internalsFor.name}</strong> yet. Click the <strong>🎓 Students</strong> button above to enroll department candidate students into this subject.
            </p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#0f172a' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: 12 }}>USN / Reg No</th>
                      <th style={{ padding: 12 }}>Student Name</th>
                      <th style={{ padding: 12 }}>Int-1 (15m)</th>
                      <th style={{ padding: 12 }}>Int-2 (15m)</th>
                      <th style={{ padding: 12 }}>Assignment (10m)</th>
                      <th style={{ padding: 12 }}>Project (10m)</th>
                      <th style={{ padding: 12 }}>Total (50m)</th>
                      <th style={{ padding: 12 }}>Eligibility Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internalRoster.map((st) => {
                      const currentInput = internalInput[st.studentId] || { internal1: 0, internal2: 0, assignment: 0, project: 0 }
                      const total = (Number(currentInput.internal1) || 0) + (Number(currentInput.internal2) || 0) + (Number(currentInput.assignment) || 0) + (Number(currentInput.project) || 0)
                      const eligible = total >= 25

                      return (
                        <tr key={st.studentId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: 12, color: '#2563eb', fontWeight: 700 }}>{st.registrationNo}</td>
                          <td style={{ padding: 12, fontWeight: 700 }}>{st.fullName}</td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="number" min={0} max={15}
                              value={currentInput.internal1}
                              onChange={(e) => updateInternalScore(st.studentId, 'internal1', e.target.value)}
                              style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="number" min={0} max={15}
                              value={currentInput.internal2}
                              onChange={(e) => updateInternalScore(st.studentId, 'internal2', e.target.value)}
                              style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="number" min={0} max={20}
                              value={currentInput.assignment}
                              onChange={(e) => updateInternalScore(st.studentId, 'assignment', e.target.value)}
                              style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="number" min={0} max={10}
                              value={currentInput.project}
                              onChange={(e) => updateInternalScore(st.studentId, 'project', e.target.value)}
                              style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: 12, fontWeight: 900, fontSize: 15, color: eligible ? '#059669' : '#dc2626' }}>
                            {total} / 50
                          </td>
                          <td style={{ padding: 12 }}>
                            {eligible ? (
                              <span style={{ padding: '4px 10px', borderRadius: 12, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700, border: '1px solid #86efac' }}>
                                ✓ Eligible (≥25)
                              </span>
                            ) : (
                              <span style={{ padding: '4px 10px', borderRadius: 12, background: '#fee2e2', color: '#b91c1c', fontSize: 12, fontWeight: 700, border: '1px solid #fca5a5' }}>
                                ⚠️ Detained (&lt;25)
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <button className="fd-btn" onClick={handleSaveInternalMarks} style={{ background: 'rgba(255,255,255,0.1)' }}>
                  💾 Save Draft Internal Marks
                </button>
                <button className="fd-btn" onClick={handleSubmitInternalsToHOD} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', flex: 1 }}>
                  📤 Submit 50-Mark Internal Sheet to HOD
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}