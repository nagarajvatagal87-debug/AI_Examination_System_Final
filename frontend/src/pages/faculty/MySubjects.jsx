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

  useEffect(() => {
    api.get('/subjects?mine=true').then((res) => setSubjects(res.data)).catch(() => {})
  }, [])

  function openMaterials(subject) {
    setStudentsFor(null)
    setInternalsFor(null)
    setMaterialsFor(subject)
    setMsg('')
    api.get(`/course-materials?subjectId=${subject.id}&kind=course_pdf`)
      .then((res) => setMaterials(res.data))
      .catch(() => {})
  }

  function openStudents(subject) {
    setMaterialsFor(null)
    setInternalsFor(null)
    setStudentsFor(subject)
    setStudentMsg('')
    api.get(`/faculty/subjects/${subject.id}/enrolled-students`)
      .then((res) => setStudentsList(res.data))
      .catch(() => {})
  }

  function openInternalEvaluation(subject) {
    setMaterialsFor(null)
    setStudentsFor(null)
    setInternalsFor(subject)
    setInternalMsg('')
    api.get(`/faculty/subjects/${subject.id}/internal-marks`)
      .then((res) => {
        setInternalRoster(res.data.roster || [])
        const initial = {}
        (res.data.roster || []).forEach((r) => {
          initial[r.studentId] = {
            internal1: r.internal1 || 0,
            internal2: r.internal2 || 0,
            assignment: r.assignment || 0,
            project: r.project || 0,
          }
        })
        setInternalInput(initial)
      })
      .catch(() => {})
  }

  async function handleUpload() {
    if (!uploadFile || !materialsFor) return
    setMsg('Uploading syllabus / course notes PDF...')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('subjectId', materialsFor.id)
      formData.append('kind', 'course_pdf')
      await api.post('/faculty/course-materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMsg('Uploaded successfully — AI chunking & vector ingestion complete!')
      setUploadFile(null)
      openMaterials(materialsFor)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Upload failed')
    }
  }

  async function handleAddStudent(e) {
    e.preventDefault()
    if (!studentForm.fullName || !studentForm.email || !studentForm.registrationNo || !studentsFor) return

    setStudentMsg('Adding student to subject...')
    try {
      const res = await api.post('/faculty/students', {
        ...studentForm,
        subjectId: studentsFor.id,
      })
      setStudentMsg(`✅ Student ${studentForm.fullName} added successfully! Initial Login Password: ${res.data.tempPassword || 'Student@123'}`)
      setStudentForm({ fullName: '', email: '', registrationNo: '', semester: '3rd Sem', section: 'A' })
      openStudents(studentsFor)
    } catch (err) {
      setStudentMsg(`❌ ${err.response?.data?.error || 'Failed to add student'}`)
    }
  }

  async function handleRemoveStudent(studentId) {
    if (!window.confirm('Are you sure you want to remove this student from the subject?')) return
    setStudentMsg('Removing student...')
    try {
      await api.delete(`/faculty/students/${studentId}`)
      setStudentMsg('✅ Student removed successfully!')
      if (studentsFor) openStudents(studentsFor)
    } catch (err) {
      setStudentMsg(`❌ ${err.response?.data?.error || 'Failed to remove student'}`)
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

  return (
    <div>
      <h2 className="ms-title">My Subjects & Internal Marks Workspace</h2>

      <div className="ms-grid">
        {subjects.map((s) => (
          <div key={s.id} className="ms-card">
            <div className="ms-name">{s.name}</div>
            <div className="ms-code">{s.code || '—'}</div>
            <div className="ms-actions">
              <button className="fd-btn fd-btn-secondary" onClick={() => openMaterials(s)}>Syllabus PDF</button>
              <button className="fd-btn fd-btn-secondary" style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }} onClick={() => openStudents(s)}>🎓 Students</button>
              <button className="fd-btn fd-btn-secondary" style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }} onClick={() => openInternalEvaluation(s)}>📊 50m Internals</button>
              <button className="fd-btn" onClick={() => navigate(`/faculty/examinations?subjectId=${s.id}`)}>Exams</button>
            </div>
          </div>
        ))}
        {subjects.length === 0 && <p className="hint">No subjects assigned to you yet.</p>}
      </div>

      {materialsFor && (
        <div className="ms-materials-panel">
          <div className="ms-materials-header">
            <h3>{materialsFor.name} — Syllabus & Course Notes PDF</h3>
            <button className="ms-close" onClick={() => setMaterialsFor(null)}>✕</button>
          </div>
          <ul className="ms-materials-list">
            {materials.map((m) => (
              <li key={m.id}>📄 {m.file_name} <span className="ms-date">{new Date(m.created_at).toLocaleDateString()}</span></li>
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

      {studentsFor && (
        <div className="ms-materials-panel" style={{ borderColor: 'rgba(59,130,246,0.5)' }}>
          <div className="ms-materials-header">
            <h3>🎓 {studentsFor.name} — Enrolled Students Roster</h3>
            <button className="ms-close" onClick={() => setStudentsFor(null)}>✕</button>
          </div>

          <form onSubmit={handleAddStudent} style={{ background: 'rgba(15,23,42,0.6)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#38bdf8' }}>+ Add New Student to {studentsFor.name}</h4>
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
              Save & Add Student to {studentsFor.name}
            </button>
          </form>

          {studentMsg && (
            <p style={{ padding: '10px 14px', borderRadius: 6, background: studentMsg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: studentMsg.includes('❌') ? '#fca5a5' : '#6ee7b7', fontSize: 13, fontWeight: 600, margin: '0 0 16px 0' }}>
              {studentMsg}
            </p>
          )}

          <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>Total Enrolled Students ({studentsList.length})</h4>
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
        </div>
      )}
    </div>
  )
}