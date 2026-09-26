import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './Evaluation.css'

export default function Evaluation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const examId = searchParams.get('examId')
  const navigate = useNavigate()

  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(examId || '')
  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [courseMaterials, setCourseMaterials] = useState([])
  const [noteFile, setNoteFile] = useState(null)
  const [uploadMsg, setUploadMsg] = useState('')

  useEffect(() => {
    api.get('/faculty/dashboard-summary')
      .then((res) => {
        if (res.data?.recentExams) {
          setExams(res.data.recentExams)
          if (!examId && res.data.recentExams.length > 0) {
            setSelectedExamId(res.data.recentExams[0].id)
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const activeId = examId || selectedExamId
    if (!activeId) return

    api.get(`/faculty/exams/${activeId}/students`)
      .then((res) => {
        setExam(res.data.exam)
        setStudents(res.data.students || [])
        if (res.data.exam?.subject_id) {
          loadMaterials(res.data.exam.subject_id)
        }
      })
      .catch(() => {})
  }, [examId, selectedExamId])

  function loadMaterials(subjectId) {
    api.get('/student/materials')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCourseMaterials(res.data.filter((m) => m.subject_id === subjectId || !m.subject_id))
        }
      })
      .catch(() => {})
  }

  async function handleUploadCourseNotes(e) {
    e.preventDefault()
    if (!noteFile || !exam?.subject_id) return
    setUploadMsg('Uploading course notes PDF...')

    try {
      const formData = new FormData()
      formData.append('file', noteFile)
      formData.append('subjectId', exam.subject_id)
      formData.append('kind', 'course_pdf')

      await api.post('/faculty/course-materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadMsg('Course Notes uploaded successfully! Applied to all students for RAG evaluation.')
      setNoteFile(null)
      loadMaterials(exam.subject_id)
    } catch (err) {
      setUploadMsg(err.response?.data?.error || 'Upload failed')
    }
  }

  const activeId = examId || selectedExamId
  const evaluatedCount = students.filter((s) => s.evaluationStatus === 'verified' || s.evaluationStatus === 'published').length
  const pendingCount = students.length - evaluatedCount

  const filtered = students.filter((s) =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.registration_no?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="ev-title">🤖 AI Answer Evaluation Workspace</h2>
          <p className="ev-sub">RAG-Grounded Handwritten Answer Sheet Grading System</p>
        </div>

        {exams.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#0f172a', fontWeight: 800 }}>Select Exam:</label>
            <select
              value={activeId}
              onChange={(e) => {
                setSelectedExamId(e.target.value)
                setSearchParams({ examId: e.target.value })
              }}
              style={{ padding: '8px 16px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.subjectName} - {ex.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Step 1: Upload / Select Subject Course Notes PDF (Applies to all students) */}
      {exam && (
        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1.5px solid #bfdbfe', borderRadius: 16, padding: '22px 26px', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#1e40af', fontWeight: 900 }}>
            📚 Step 1: Subject Course Notes & Syllabus PDF (RAG Grounding Document)
          </h4>
          <p style={{ fontSize: 13, color: '#334155', fontWeight: 600, margin: '0 0 16px 0' }}>
            Course notes uploaded here apply to <strong>ALL students</strong> taking <em>{exam.title}</em>. The AI agent evaluates answers against these notes.
          </p>

          <form onSubmit={handleUploadCourseNotes} style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setNoteFile(e.target.files[0])}
              style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}
            />
            <button
              type="submit"
              disabled={!noteFile}
              className="fd-btn"
              style={{ padding: '10px 22px', fontSize: 13, fontWeight: 800, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', cursor: noteFile ? 'pointer' : 'not-allowed', opacity: noteFile ? 1 : 0.6 }}
            >
              📤 Upload Course Notes
            </button>
          </form>

          {uploadMsg && <p style={{ fontSize: 13, color: '#059669', fontWeight: 700, margin: '12px 0 0 0' }}>{uploadMsg}</p>}

          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {courseMaterials.length === 0 ? (
              <span style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', fontWeight: 600 }}>Default syllabus notes active for {exam.subjects?.name || 'Subject'}.</span>
            ) : (
              courseMaterials.map((m) => (
                <span key={m.id} style={{ fontSize: 12, background: '#ffffff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '5px 14px', borderRadius: 20, fontWeight: 700, boxShadow: '0 2px 6px rgba(37,99,235,0.08)' }}>
                  📄 {m.file_name || m.title} (Active Notes)
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {!activeId ? (
        <div style={{ padding: 30, textAlign: 'center', background: 'rgba(30,41,59,0.4)', borderRadius: 12, color: '#94a3b8' }}>
          No active examinations found. Please create an examination first.
        </div>
      ) : (
        <>
          <div className="ev-cards">
            <div className="ev-card"><div className="ev-card-value">{students.length}</div><div className="ev-card-label">Students</div></div>
            <div className="ev-card"><div className="ev-card-value">{evaluatedCount}</div><div className="ev-card-label">Evaluated</div></div>
            <div className="ev-card highlight"><div className="ev-card-value">{pendingCount}</div><div className="ev-card-label">Pending</div></div>
          </div>

          <input
            className="ev-search"
            placeholder="🔍 Search student by name or USN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <table className="ev-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th style={{ textAlign: 'center' }}>Register No. (USN)</th>
                <th>Evaluation Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} onClick={() => navigate(`/faculty/evaluation/${activeId}/${s.id}`)} className="ev-row">
                  <td><strong>{s.full_name}</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: '#1e293b' }}>{s.registration_no}</td>
                  <td>
                    <span className={`ev-status ${s.evaluationStatus}`}>
                      {s.evaluationStatus === 'verified' || s.evaluationStatus === 'published' ? '✓ Evaluated' : s.evaluationStatus === 'not_uploaded' ? '— Pending Answer PDF' : '⏳ Review Pending'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {s.evaluationStatus === 'not_uploaded' ? (
                      <button className="ev-btn-action upload" onClick={(e) => { e.stopPropagation(); navigate(`/faculty/evaluation/${activeId}/${s.id}`) }}>
                        📤 Upload PDF
                      </button>
                    ) : s.evaluationStatus === 'verified' || s.evaluationStatus === 'published' ? (
                      <button className="ev-btn-action view" onClick={(e) => { e.stopPropagation(); navigate(`/faculty/evaluation/${activeId}/${s.id}`) }}>
                        🔍 View & Grade ›
                      </button>
                    ) : (
                      <button className="ev-btn-action review" onClick={(e) => { e.stopPropagation(); navigate(`/faculty/evaluation/${activeId}/${s.id}`) }}>
                        ⏳ Review ›
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="hint">No students found.</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}