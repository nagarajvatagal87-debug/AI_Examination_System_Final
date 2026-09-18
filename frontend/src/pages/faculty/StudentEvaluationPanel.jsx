import { useEffect, useState } from 'react'
import api from '../../api/client.js'

const STATUS_LABEL = {
  not_uploaded: '⬜ Not uploaded',
  processing: '⏳ Processing (OCR/AI)',
  pending_review: '🟡 Needs review',
  verified: '🟢 Verified',
  published: '✅ Published',
}

export default function StudentEvaluationPanel({ examId }) {
  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState(null)

  function load() {
    api.get(`/faculty/exams/${examId}/students`)
      .then((res) => { setExam(res.data.exam); setStudents(res.data.students) })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load class list'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (examId) load() }, [examId])

  async function handleUpload(studentId, file) {
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post(`/faculty/exams/${examId}/students/${studentId}/answer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed')
    }
  }

  if (loading) return <p>Loading class list...</p>

  const evaluatedCount = students.filter((s) => s.evaluationStatus === 'verified' || s.evaluationStatus === 'published').length

  return (
    <div>
      {error && <p className="fd-status error">{error}</p>}
      <p className="hint">{evaluatedCount} / {students.length} students evaluated</p>

      <table className="fd-table">
        <thead>
          <tr><th>Reg No</th><th>Name</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.registration_no}</td>
              <td>{s.full_name}</td>
              <td>{STATUS_LABEL[s.evaluationStatus] || s.evaluationStatus}</td>
              <td>
                {s.evaluationStatus === 'not_uploaded' && (
                  <input type="file" accept="application/pdf" onChange={(e) => handleUpload(s.id, e.target.files[0])} />
                )}
                {(s.evaluationStatus === 'pending_review' || s.evaluationStatus === 'verified') && (
                  <button className="fd-btn fd-btn-secondary" onClick={() => setReviewingSubmissionId(s.submissionId)}>
                    Review
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {reviewingSubmissionId && (
        <ReviewModal
          submissionId={reviewingSubmissionId}
          onClose={() => setReviewingSubmissionId(null)}
          onDone={() => { setReviewingSubmissionId(null); load() }}
        />
      )}
    </div>
  )
}

function ReviewModal({ submissionId, onClose, onDone }) {
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marksInput, setMarksInput] = useState({})
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    api.get(`/faculty/submissions/${submissionId}/evaluations`)
      .then((res) => {
        setEvaluations(res.data)
        const initial = {}
        res.data.forEach((e) => { initial[e.id] = e.final_marks ?? e.ai_suggested_marks ?? 0 })
        setMarksInput(initial)
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load evaluations'))
      .finally(() => setLoading(false))
  }, [submissionId])

  async function handleVerify(evalId) {
    try {
      await api.post(`/faculty/evaluations/${evalId}/verify`, { finalMarks: Number(marksInput[evalId]) })
      setEvaluations((prev) => prev.map((e) => e.id === evalId ? { ...e, final_marks: Number(marksInput[evalId]) } : e))
    } catch (err) {
      setError(err.response?.data?.error || 'Verify failed')
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      await api.post(`/faculty/submissions/${submissionId}/publish`)
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const allVerified = evaluations.length > 0 && evaluations.every((e) => e.final_marks !== null)

  return (
    <div className="fd-modal-backdrop" onClick={onClose}>
      <div className="fd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fd-modal-header">
          <h3>Answer Review</h3>
          <button className="fd-modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? <p>Loading...</p> : (
          <>
            {error && <p className="fd-status error">{error}</p>}
            {evaluations.map((e) => (
              <div key={e.id} className="fd-eval-card">
                <p className="fd-question-meta">Q{e.answers?.questions?.question_no} · Max {e.answers?.questions?.marks} marks</p>
                <p><strong>Question:</strong> {e.answers?.questions?.question_text}</p>
                <p><strong>OCR Answer</strong> (confidence {Math.round((e.answers?.ocr_confidence || 0) * 100)}%):</p>
                <p className="fd-ocr-text">{e.answers?.ocr_text || '(no text extracted)'}</p>
                <p><strong>AI Suggested:</strong> {e.ai_suggested_marks} / {e.answers?.questions?.marks} (confidence {Math.round((e.ai_confidence || 0) * 100)}%)</p>
                {e.ai_evidence && (
                  <p className="hint"><strong>Evidence:</strong> {JSON.stringify(e.ai_evidence)}</p>
                )}
                <div className="fd-form-row">
                  <label>Final marks:</label>
                  <input
                    type="number"
                    value={marksInput[e.id]}
                    onChange={(ev) => setMarksInput({ ...marksInput, [e.id]: ev.target.value })}
                    style={{ width: 70 }}
                    disabled={e.final_marks !== null}
                  />
                  {e.final_marks === null ? (
                    <button className="fd-btn" onClick={() => handleVerify(e.id)}>Verify</button>
                  ) : (
                    <span className="fd-verified-badge">✓ Verified</span>
                  )}
                </div>
              </div>
            ))}

            <div className="fd-form-row" style={{ marginTop: 16 }}>
              <button className="fd-btn" onClick={handlePublish} disabled={!allVerified || publishing}>
                {publishing ? 'Publishing...' : '📤 Publish Result to Student'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}