import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './EvaluationDetail.css'

export default function EvaluationDetail() {
  const { examId, studentId } = useParams()
  const navigate = useNavigate()

  const [student, setStudent] = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [pdfUrl, setPdfUrl] = useState(null)
  const [editingMarks, setEditingMarks] = useState({})
  const [activeQ, setActiveQ] = useState(0)
  const [msg, setMsg] = useState('')
  const [file, setFile] = useState(null)

  useEffect(() => { load() }, [examId, studentId])

  async function load() {
    try {
      const { data } = await api.get(`/faculty/exams/${examId}/students`)
      const s = data.students.find((st) => st.id === studentId)
      setStudent(s)

      if (s?.submissionId) {
        const [{ data: evals }, { data: fileRes }] = await Promise.all([
          api.get(`/faculty/submissions/${s.submissionId}/evaluations`),
          api.get(`/faculty/submissions/${s.submissionId}/file`).catch(() => ({ data: {} })),
        ])
        setEvaluations(evals)
        setPdfUrl(fileRes?.url || null)
        const initial = {}
        evals.forEach((e) => { initial[e.id] = e.final_marks ?? e.ai_suggested_marks })
        setEditingMarks(initial)
      }
    } catch (err) {
      setMsg('Could not load student data.')
    }
  }

  async function handleUploadAnswer() {
    if (!file) return setMsg('Choose a scanned answer PDF first.')
    setMsg('Uploading & Processing Vision AI Evaluation...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/faculty/exams/${examId}/students/${studentId}/answer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMsg('Answer Sheet uploaded & evaluated successfully!')
      setFile(null)
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Upload failed')
    }
  }

  async function handleSaveMark(evaluationId) {
    try {
      await api.post(`/faculty/evaluations/${evaluationId}/verify`, { finalMarks: editingMarks[evaluationId] })
      setMsg('Final mark saved & student internal marks synced!')
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed')
    }
  }

  async function handleSaveAllAndNotify() {
    try {
      setMsg('Saving all verified marks and sending student email notification...')
      for (const e of evaluations) {
        if (editingMarks[e.id] !== undefined) {
          await api.post(`/faculty/evaluations/${e.id}/verify`, { finalMarks: editingMarks[e.id] })
        }
      }
      setMsg('All evaluation marks saved & automated email notification sent to student!')
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed')
    }
  }

  const aiTotal = evaluations.reduce((sum, e) => sum + (e.ai_suggested_marks || 0), 0)
  const finalTotal = evaluations.reduce((sum, e) => sum + (editingMarks[e.id] !== undefined ? Number(editingMarks[e.id]) : (e.final_marks ?? e.ai_suggested_marks ?? 0)), 0)
  const maxTotal = evaluations.reduce((sum, e) => sum + (e.answers?.questions?.marks || 0), 0)
  const current = evaluations[activeQ]

  if (!student) return <p className="hint">Loading...</p>

  return (
    <div className="evd-wrap">
      <button className="evd-back" onClick={() => navigate(-1)}>← Back to student list</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="evd-title">{student.full_name}</h2>
          <p className="evd-sub">Register No: {student.registration_no}</p>
        </div>

        <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', padding: '8px 14px', borderRadius: 8, fontSize: 13, color: '#60a5fa' }}>
          📚 <strong>RAG Evaluation Mode:</strong> Grounded on Subject Course Notes PDF
        </div>
      </div>

      {!student.submissionId ? (
        <div className="ce-field" style={{ maxWidth: 420, marginTop: 20 }}>
          <label>No answer sheet uploaded yet</label>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
          <button className="fd-btn" style={{ marginTop: 10 }} onClick={handleUploadAnswer}>Upload Answer Sheet</button>
        </div>
      ) : (
        <>
          <div className="evd-split">
            <div className="evd-pdf-panel">
              <div className="evd-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Answer PDF Preview</span>
                <label style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>
                  📁 Re-upload PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const selectedFile = e.target.files[0]
                      if (!selectedFile) return
                      setMsg('Uploading new Answer Sheet & processing RAG evaluation...')
                      const formData = new FormData()
                      formData.append('file', selectedFile)
                      try {
                        await api.post(`/faculty/exams/${examId}/students/${studentId}/answer`, formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        })
                        setMsg('New Answer Sheet uploaded & evaluated against course notes!')
                        await load()
                      } catch (err) {
                        setMsg('Upload failed')
                      }
                    }}
                  />
                </label>
              </div>
              {pdfUrl ? (
                <iframe src={pdfUrl} title="Scanned answer" className="evd-pdf-frame" />
              ) : (
                <p className="hint">PDF preview not available.</p>
              )}
            </div>

            <div className="evd-ai-panel">
              <div className="evd-panel-header">RAG AI Evaluation & Teacher Verification</div>
              <div className="evd-q-tabs">
                {evaluations.map((e, i) => (
                  <button
                    key={e.id}
                    className={`evd-q-tab ${i === activeQ ? 'active' : ''} ${e.final_marks !== null ? 'done' : ''}`}
                    onClick={() => setActiveQ(i)}
                  >
                    Q{e.answers?.questions?.question_no}
                  </button>
                ))}
              </div>

              {current && (
                <div className="evd-q-detail">
                  <div className="evd-q-header">
                    <strong>Question {current.answers.questions.question_no}</strong>
                    <span>Max: {current.answers.questions.marks} Marks</span>
                  </div>
                  <p className="evd-q-text">{current.answers.questions.question_text}</p>

                  <div className="evd-block">
                    <div className="evd-block-label">
                      OCR Extracted Text {current.answers.ocr_confidence < 0.7 && <span className="evd-warn">⚠️ Low confidence</span>}
                    </div>
                    <p className="evd-ocr">{current.answers.ocr_text}</p>
                  </div>

                  <div className="evd-block">
                    <div className="evd-block-label">📚 Course Notes Grounding & Feedback</div>
                    <p className="evd-evidence">{current.ai_evidence}</p>
                  </div>

                  <div className="evd-suggested">
                    RAG AI Suggested Mark: <strong>{current.ai_suggested_marks} / {current.answers.questions.marks}</strong>
                  </div>

                  <div className="evd-final">
                    <label>Faculty Verified Final Mark</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={current.answers.questions.marks}
                      value={editingMarks[current.id] ?? ''}
                      onChange={(e) => setEditingMarks({ ...editingMarks, [current.id]: Number(e.target.value) })}
                    />
                    <button className="fd-btn" onClick={() => handleSaveMark(current.id)}>Save Mark</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div className="evd-total-bar" style={{ flex: 1, margin: 0, display: 'flex', gap: 20 }}>
              <span>🤖 RAG AI Score: <strong>{aiTotal} / {maxTotal}</strong></span>
              <span>✏️ Faculty Total Score: <strong>{finalTotal} / {maxTotal}</strong></span>
            </div>

            <button
              className="fd-btn"
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', marginLeft: 16 }}
              onClick={handleSaveAllAndNotify}
            >
              ✉️ Save All Marks & Notify Student via Email
            </button>
          </div>
        </>
      )}

      {msg && <p className="fd-status" style={{ marginTop: 14 }}>{msg}</p>}
    </div>
  )
}