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
        <h2 className="ms-title" style={{ margin: 0 }}>My Subjects & Internal Marks Workspace</h2>
        <form onSubmit={handleClaimSubject} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(15,23,42,0.6)', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(56,189,248,0.3)' }}>
          <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>+ Select / Take Subject:</span>
          <select
            value={selectedClaimSubId}
            onChange={(e) => setSelectedClaimSubId(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(15,23,42,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: 13 }}
          >
            <option value="">-- Choose Subject --</option>
            {allDeptSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
            ))}
          </select>
          <button type="submit" style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            ➕ Take Subject
          </button>
        </form>
      </div>

      {claimMsg && <p style={{ fontSize: 13, fontWeight: 700, color: claimMsg.includes('✅') ? '#34d399' : '#f87171', marginBottom: 16 }}>{claimMsg}</p>}

      <div className="ms-grid">
        {subjects.map((s) => (
          <div key={s.id} className="ms-card">
            <div className="ms-name">{s.name}</div>
            <div className="ms-code">{s.code || '—'}</div>
            <div className="ms-actions">
              <button className="fd-btn fd-btn-secondary" onClick={() => openMaterials(s)}>Syllabus PDF</button>
              <button className="fd-btn fd-btn-secondary" style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }} onClick={() => openStudents(s)}>🎓 Students</button>
              <button className="fd-btn fd-btn-secondary" style={{ background: '#8b5cf6', borderColor: '#8b5cf6', color: '#fff' }} onClick={() => openAttendance(s)}>📋 Attendance</button>
              <button className="fd-btn fd-btn-secondary" style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }} onClick={() => openInternalEvaluation(s)}>📊 50m Internals</button>
              <button className="fd-btn" onClick={() => navigate(`/faculty/examinations?subjectId=${s.id}`)}>Exams</button>
              <button className="fd-btn" style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }} onClick={() => handleDeleteSubject(s.id, s.name)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
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
              <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  📄 <strong style={{ color: '#f8fafc' }}>{m.title || m.file_name}</strong>
                  <span className="ms-date" style={{ marginLeft: 12, color: '#94a3b8', fontSize: 12 }}>{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => handleDeleteMaterial(m.id, m.title || m.file_name)}
                  style={{ padding: '5px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
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

          <div style={{ background: 'rgba(15,23,42,0.6)', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
            <strong>Academic Attendance Rule:</strong> Attendance percentages are generated automatically as <code style={{ color: '#38bdf8' }}>(Attended / Total) × 100</code>.<br />
            <span style={{ color: '#f87171', fontWeight: 700 }}>⚠️ 75% Cutoff Rule:</span> Students maintaining <strong>&lt; 75% overall attendance</strong> are <strong>NOT ELIGIBLE</strong> to write internal exams or view the internal timetable.
          </div>

          {attendanceMsg && (
            <p style={{ padding: '10px 14px', borderRadius: 6, background: attendanceMsg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: attendanceMsg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              {attendanceMsg}
            </p>
          )}

          {attendanceList.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, background: 'rgba(15,23,42,0.6)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)' }}>
              🎓 No students enrolled in <strong>{attendanceFor.name}</strong> yet. Click the <strong>🎓 Students</strong> button above to enroll department candidate students into this subject.
            </p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#f8fafc' }}>
                  <thead>
                    <tr style={{ background: 'rgba(139,92,246,0.2)', color: '#c084fc', textAlign: 'left', borderBottom: '1px solid rgba(139,92,246,0.4)' }}>
                      <th style={{ padding: 10 }}>USN / Reg No</th>
                      <th style={{ padding: 10 }}>Student Name</th>
                      <th style={{ padding: 10 }}>Total Classes</th>
                      <th style={{ padding: 10 }}>Classes Attended</th>
                      <th style={{ padding: 10 }}>Attendance %</th>
                      <th style={{ padding: 10 }}>Quick Attendance</th>
                      <th style={{ padding: 10 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceList.map((st) => (
                      <tr key={st.student_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: 10, color: '#38bdf8', fontWeight: 700 }}>{st.registration_no}</td>
                        <td style={{ padding: 10, fontWeight: 600 }}>{st.full_name}</td>
                        <td style={{ padding: 6 }}>
                          <input
                            type="number" min={1} max={100}
                            value={st.totalClasses}
                            onChange={(e) => handleDirectAttChange(st.student_id, 'totalClasses', e.target.value)}
                            style={{ width: 60, padding: 6, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: 6 }}>
                          <input
                            type="number" min={0} max={st.totalClasses}
                            value={st.attendedClasses}
                            onChange={(e) => handleDirectAttChange(st.student_id, 'attendedClasses', e.target.value)}
                            style={{ width: 60, padding: 6, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: 10, fontWeight: 900, fontSize: 15, color: st.percentage >= 75 ? '#34d399' : '#f87171' }}>
                          {st.percentage}%
                        </td>
                        <td style={{ padding: 6 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleMarkPresent(st.student_id)}
                              style={{ padding: '4px 8px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                            >
                              + Present
                            </button>
                            <button
                              onClick={() => handleMarkAbsent(st.student_id)}
                              style={{ padding: '4px 8px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                            >
                              + Absent
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: 10 }}>
                          {st.percentage >= 75 ? (
                            <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: 12, fontWeight: 700 }}>
                              ✓ Eligible (≥75%)
                            </span>
                          ) : (
                            <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, fontWeight: 700 }}>
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
          <div style={{ background: 'rgba(15,23,42,0.6)', padding: 16, borderRadius: 10, border: '1px solid rgba(56,189,248,0.3)', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#38bdf8' }}>➕ Select & Enroll Department Candidate Students into {studentsFor.name}</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#94a3b8' }}>Check candidate students from your department to enroll them into this subject's active roster:</p>
            {candidateList.filter(c => !studentsList.some(s => s.id === c.id)).length === 0 ? (
              <p style={{ fontSize: 12, color: '#34d399', margin: 0, fontStyle: 'italic' }}>✓ All available department candidate students are already enrolled in this subject.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14, maxHeight: 180, overflowY: 'auto' }}>
                  {candidateList.filter(c => !studentsList.some(s => s.id === c.id)).map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, cursor: 'pointer', border: selectedCandidateIds.includes(c.id) ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="checkbox"
                        checked={selectedCandidateIds.includes(c.id)}
                        onChange={() => toggleCandidateSelect(c.id)}
                      />
                      <div style={{ fontSize: 12 }}>
                        <strong style={{ color: '#f8fafc', display: 'block' }}>{c.full_name}</strong>
                        <span style={{ color: '#38bdf8' }}>{c.registration_no || '—'}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedCandidateIds.length > 0 && (
                  <button className="fd-btn" onClick={handleBatchEnroll} style={{ background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', width: '100%' }}>
                    ➕ Enroll {selectedCandidateIds.length} Selected Candidates into {studentsFor.name}
                  </button>
                )}
              </>
            )}
          </div>

          <form onSubmit={handleAddStudent} style={{ background: 'rgba(15,23,42,0.6)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#38bdf8' }}>+ Add Brand New Student to {studentsFor.name}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 80px', gap: 10, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Student Full Name"
                value={studentForm.fullName}
                onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13 }}
              />
              <input
                type="email"
                placeholder="Student Email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="USN / Reg No"
                value={studentForm.registrationNo}
                onChange={(e) => setStudentForm({ ...studentForm, registrationNo: e.target.value })}
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="Sem"
                value={studentForm.semester}
                onChange={(e) => setStudentForm({ ...studentForm, semester: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="Sec"
                value={studentForm.section}
                onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13 }}
              />
            </div>
            <button className="fd-btn" type="submit" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', width: '100%' }}>
              Save & Create New Student for {studentsFor.name}
            </button>
          </form>

          {studentMsg && (
            <p style={{ padding: '10px 14px', borderRadius: 6, background: studentMsg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: studentMsg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 600, margin: '0 0 16px 0' }}>
              {studentMsg}
            </p>
          )}

          <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>Enrolled Students Roster ({studentsList.length})</h4>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#e2e8f0' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 8 }}>USN / Reg No</th>
                  <th style={{ padding: 8 }}>Student Name</th>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Sem / Sec</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((st) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 8, color: '#38bdf8', fontWeight: 600 }}>{st.registration_no || '—'}</td>
                    <td style={{ padding: 8, fontWeight: 600 }}>{st.full_name}</td>
                    <td style={{ padding: 8, color: '#94a3b8' }}>{st.email}</td>
                    <td style={{ padding: 8 }}>{st.semester || '3rd Sem'} - {st.section || 'A'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <button
                        onClick={() => handleRemoveStudent(st.id)}
                        style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}
                      >
                        🗑️ Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {studentsList.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>
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
        <div className="ms-materials-panel" style={{ borderColor: 'rgba(16,185,129,0.5)' }}>
          <div className="ms-materials-header">
            <h3>📊 50-Mark Internal Evaluation — {internalsFor.name}</h3>
            <button className="ms-close" onClick={() => setInternalsFor(null)}>✕</button>
          </div>

          <div style={{ background: 'rgba(15,23,42,0.6)', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
            <strong>Faculty 50-Mark Internal Rule:</strong> Enter Internal 1 (max 15m), Internal 2 (max 15m), Assignment (max 10m/20m), Project (max 10m/0m). <br />
            <span style={{ color: '#f87171', fontWeight: 700 }}>⚠️ Eligibility Threshold:</span> Students scoring <strong>&lt; 25 out of 50</strong> are <strong>NOT ELIGIBLE / DETAINED</strong> from taking up the Main Examination.
          </div>

          {internalMsg && (
            <p style={{ padding: '10px 14px', borderRadius: 6, background: internalMsg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: internalMsg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              {internalMsg}
            </p>
          )}

          {internalRoster.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, background: 'rgba(15,23,42,0.6)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)' }}>
              🎓 No students enrolled in <strong>{internalsFor.name}</strong> yet. Click the <strong>🎓 Students</strong> button above to enroll department candidate students into this subject.
            </p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#f8fafc' }}>
                  <thead>
                    <tr style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', textAlign: 'left', borderBottom: '1px solid rgba(16,185,129,0.3)' }}>
                      <th style={{ padding: 10 }}>USN / Reg No</th>
                      <th style={{ padding: 10 }}>Student Name</th>
                      <th style={{ padding: 10 }}>Int-1 (15m)</th>
                      <th style={{ padding: 10 }}>Int-2 (15m)</th>
                      <th style={{ padding: 10 }}>Assignment (10m)</th>
                      <th style={{ padding: 10 }}>Project (10m)</th>
                      <th style={{ padding: 10 }}>Total (50m)</th>
                      <th style={{ padding: 10 }}>Eligibility Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internalRoster.map((st) => {
                      const currentInput = internalInput[st.studentId] || { internal1: 0, internal2: 0, assignment: 0, project: 0 }
                      const total = (Number(currentInput.internal1) || 0) + (Number(currentInput.internal2) || 0) + (Number(currentInput.assignment) || 0) + (Number(currentInput.project) || 0)
                      const eligible = total >= 25

                      return (
                        <tr key={st.studentId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: 10, color: '#38bdf8', fontWeight: 700 }}>{st.registrationNo}</td>
                          <td style={{ padding: 10, fontWeight: 600 }}>{st.fullName}</td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="number" min={0} max={15}
                              value={currentInput.internal1}
                              onChange={(e) => updateInternalScore(st.studentId, 'internal1', e.target.value)}
                              style={{ width: 60, padding: 6, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="number" min={0} max={15}
                              value={currentInput.internal2}
                              onChange={(e) => updateInternalScore(st.studentId, 'internal2', e.target.value)}
                              style={{ width: 60, padding: 6, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="number" min={0} max={20}
                              value={currentInput.assignment}
                              onChange={(e) => updateInternalScore(st.studentId, 'assignment', e.target.value)}
                              style={{ width: 60, padding: 6, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="number" min={0} max={10}
                              value={currentInput.project}
                              onChange={(e) => updateInternalScore(st.studentId, 'project', e.target.value)}
                              style={{ width: 60, padding: 6, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13 }}
                            />
                          </td>
                          <td style={{ padding: 10, fontWeight: 900, fontSize: 15, color: eligible ? '#34d399' : '#f87171' }}>
                            {total} / 50
                          </td>
                          <td style={{ padding: 10 }}>
                            {eligible ? (
                              <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: 12, fontWeight: 700 }}>
                                ✓ Eligible (≥25)
                              </span>
                            ) : (
                              <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, fontWeight: 700 }}>
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