import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import FacultyComplaints from './FacultyComplaints.jsx'
import ExamPreview from './ExamPreview.jsx'
import StudentEvaluationPanel from './StudentEvaluationPanel.jsx'
import PerformanceAnalytics from './PerformanceAnalytics.jsx'
import HODMessages from './HODMessages.jsx'
import './FacultyDashboard.css'

export default function FacultyDashboard() {
  const { user, logout } = useAuth()

  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectCode, setNewSubjectCode] = useState('')

  const [materialKind, setMaterialKind] = useState('course_pdf')
  const [file, setFile] = useState(null)

  const [instructions, setInstructions] = useState('')
  const [examType, setExamType] = useState('internal')
  const [examTitle, setExamTitle] = useState('')
  const [totalMarks, setTotalMarks] = useState(50)
  const [examIdForActions, setExamIdForActions] = useState('')

  const [status, setStatus] = useState({ text: '', error: false })

  function loadSubjects() {
    api.get('/subjects').then((res) => {
      setSubjects(res.data)
      if (res.data.length && !subjectId) setSubjectId(res.data[0].id)
    }).catch(() => {})
  }

  useEffect(() => { loadSubjects() }, [])

  function setMsg(text, error = false) {
    setStatus({ text, error })
  }

  async function handleCreateSubject(e) {
    e.preventDefault()
    setMsg('Creating subject...')
    try {
      const { data } = await api.post('/subjects', { name: newSubjectName, code: newSubjectCode })
      setMsg(`Subject "${data.name}" created.`)
      setNewSubjectName('')
      setNewSubjectCode('')
      setShowNewSubject(false)
      loadSubjects()
      setSubjectId(data.id)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create subject', true)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!subjectId) return setMsg('Select or create a subject first.', true)
    setMsg('Uploading...')
    try {
      const formData = new FormData()
      formData.append('subjectId', subjectId)
      formData.append('kind', materialKind)
      formData.append('file', file)
      await api.post('/faculty/course-materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMsg(
        materialKind === 'previous_paper'
          ? 'Previous paper uploaded.'
          : 'Course material uploaded — ingestion running in the background.'
      )
    } catch (err) {
      setMsg(err.response?.data?.error || 'Upload failed', true)
    }
  }

  async function handleGenerateExam(e) {
    e.preventDefault()
    if (!subjectId) return setMsg('Select or create a subject first.', true)
    setMsg('Generating questions...')
    try {
      const { data } = await api.post('/faculty/exams', {
        subjectId, type: examType, title: examTitle, totalMarks, instructions,
      })
      setExamIdForActions(data.exam.id)
      const quality = data.generated.quality_check
      const issuesText = quality?.issues?.length
        ? `\n⚠️ Issues: ${quality.issues.join('; ')}`
        : '\n✅ No quality issues.'
      setMsg(`Exam created: "${data.exam.title}" (ID copied below).${issuesText}`)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Generation failed', true)
    }
  }

  async function handleExportPdf(examId) {
    setMsg('Generating PDF...')
    try {
      const { data } = await api.post(`/faculty/exams/${examId}/export-pdf`)
      setMsg('PDF ready — opening in new tab.')
      window.open(data.download_url, '_blank')
    } catch (err) {
      setMsg(err.response?.data?.error || 'PDF export failed', true)
    }
  }

  async function handlePublish(examId) {
    setMsg('Publishing results...')
    try {
      const { data } = await api.post(`/faculty/exams/${examId}/publish-results`)
      setMsg(`Published. Rankings created: ${data.rankings_created}`)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Publish failed', true)
    }
  }

  return (
    <div className="fd-wrap">
      <div className="fd-header">
        <div>
          <h1>Faculty Dashboard</h1>
          <div className="sub">Course material, exams & evaluation</div>
        </div>
        <div className="fd-header-actions">
          <NotificationBell />
          <span>{user?.fullName}</span>
          <button className="fd-logout" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="fd-body">
        <div className="fd-subject-bar">
          <label>Subject:</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.length === 0 && <option value="">No subjects yet</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
            ))}
          </select>
          <span className="fd-new-subject-toggle" onClick={() => setShowNewSubject(!showNewSubject)}>
            + New subject
          </span>
          <FacultyComplaints />
        </div>

        {showNewSubject && (
          <div className="fd-section">
            <h2>➕ Create Subject</h2>
            <form onSubmit={handleCreateSubject}>
              <div className="fd-form-row">
                <input placeholder="Subject name (e.g. DBMS)" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} required />
                <input placeholder="Code (optional)" value={newSubjectCode} onChange={(e) => setNewSubjectCode(e.target.value)} />
                <button className="fd-btn" type="submit">Create</button>
              </div>
            </form>
          </div>
        )}

        <div className="fd-section">
          <h2>📄 Upload Course Material</h2>
          <p className="hint">Powers RAG-grounded question generation and the study chatbot.</p>
          <form onSubmit={handleUpload}>
            <div className="fd-form-row">
              <select value={materialKind} onChange={(e) => setMaterialKind(e.target.value)}>
                <option value="course_pdf">Course material (used for RAG)</option>
                <option value="previous_paper">Previous question paper (browse only)</option>
              </select>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
              <button className="fd-btn" type="submit">Upload</button>
            </div>
          </form>
        </div>

        <div className="fd-section">
          <h2>🧠 Generate Exam Paper</h2>
          <form onSubmit={handleGenerateExam}>
            <div className="fd-form-row">
              <input placeholder="Exam title" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} required />
              <select value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option value="internal">Internal</option>
                <option value="main">Main</option>
              </select>
              <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} placeholder="Total marks" />
            </div>
            <div className="fd-instruction-box">
              <label>💬 Tell the AI what to focus on (optional)</label>
              <textarea
                placeholder='e.g. "Concentrate on normalization and transactions, skip basic SQL syntax" or "Cover units 3–5 only"'
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
              />
            </div>
            <button className="fd-btn" type="submit">Generate</button>
          </form>
        </div>

        {examIdForActions && (
          <ExamPreview examId={examIdForActions} onExport={handleExportPdf} />
        )}

        <div className="fd-section">
          <h2>📤 Export & Publish</h2>
          <p className="hint">Exam ID auto-fills after generating above, or paste one manually.</p>
          <div className="fd-form-row">
            <input placeholder="Exam ID" value={examIdForActions} onChange={(e) => setExamIdForActions(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div className="fd-form-row">
            <button className="fd-btn fd-btn-secondary" onClick={() => handleExportPdf(examIdForActions)} disabled={!examIdForActions}>
              Export PDF
            </button>
            <button className="fd-btn" onClick={() => handlePublish(examIdForActions)} disabled={!examIdForActions}>
              Publish Results
            </button>
          </div>
        </div>

        {examIdForActions && (
          <>
            <div className="fd-section">
              <h2>✅ Evaluate Students</h2>
              <StudentEvaluationPanel examId={examIdForActions} />
            </div>
            <PerformanceAnalytics examId={examIdForActions} />
          </>
        )}

        <HODMessages hodId={user?.hodId} />

        {status.text && <p className={`fd-status ${status.error ? 'error' : ''}`}>{status.text}</p>}
      </div>
    </div>
  )
}
