import { useEffect, useState } from 'react'
import api from '../../api/client.js'
import './ExamPreview.css'

export default function ExamPreview({ examId }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editMarks, setEditMarks] = useState('')
  const [exporting, setExporting] = useState(false)

  function load() {
    setLoading(true)
    api.get(`/faculty/exams/${examId}/questions`)
      .then((res) => setQuestions(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load questions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (examId) load() }, [examId])

  function startEdit(q) {
    setEditingId(q.id)
    setEditText(q.question_text)
    setEditMarks(q.marks)
  }

  async function saveEdit(id) {
    try {
      await api.patch(`/faculty/questions/${id}`, { questionText: editText, marks: Number(editMarks) })
      setEditingId(null)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    }
  }

  async function handleReject(id) {
    if (!confirm('Reject this question? It will be removed from the paper.')) return
    try {
      await api.delete(`/faculty/questions/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject')
    }
  }

  async function handleExportPdf() {
    setExporting(true)
    setError('')
    try {
      const { data } = await api.post(`/faculty/exams/${examId}/export-pdf`)
      const url = data.download_url
      
      // Open print tab
      const win = window.open(url, '_blank')
      if (win) win.focus()

      // Also auto-trigger file download link
      const a = document.createElement('a')
      a.href = url
      a.download = `Question-Paper-${examId.slice(0, 8)}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setError(err.response?.data?.error || 'PDF export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <p className="ep-empty-text">Loading questions...</p>

  return (
    <div className="ep-container">
      <div className="ep-header">
        <h2 className="ep-title">
          📋 Question Paper Preview
          <span className="ep-count-pill">{questions.length} questions</span>
        </h2>
      </div>

      {error && <div className="ep-status-error">{error}</div>}
      
      {questions.length === 0 ? (
        <p className="ep-empty-text">No questions generated yet.</p>
      ) : (
        <div className="ep-list">
          {questions.map((q) => {
            const diffClass = (q.difficulty || 'medium').toLowerCase()
            return (
              <div key={q.id} className="ep-card">
                <div className="ep-meta-row">
                  <span className="ep-badge-no">Q{q.question_no}</span>
                  <span className="ep-badge-unit">{q.unit || 'General'}</span>
                  <span className={`ep-badge-diff ${diffClass}`}>{q.difficulty || 'medium'}</span>
                  <span className="ep-badge-marks">{q.marks} Marks</span>
                </div>

                {editingId === q.id ? (
                  <div className="ep-edit-container">
                    <textarea 
                      className="ep-edit-textarea" 
                      value={editText} 
                      onChange={(e) => setEditText(e.target.value)} 
                      rows={3} 
                    />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input 
                        type="number" 
                        className="ep-edit-marks-input" 
                        value={editMarks} 
                        onChange={(e) => setEditMarks(e.target.value)} 
                        placeholder="Marks"
                      />
                      <button className="ep-btn-save" onClick={() => saveEdit(q.id)}>Save Changes</button>
                      <button className="ep-btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="ep-question-text">
                      {q.question_text}
                    </p>
                    <div className="ep-action-row">
                      <button className="ep-btn-edit" onClick={() => startEdit(q)}>✏️ Edit</button>
                      <button className="ep-btn-reject" onClick={() => handleReject(q.id)}>🗑️ Reject</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="ep-footer">
        <button className="ep-btn-download" onClick={handleExportPdf} disabled={exporting || questions.length === 0}>
          {exporting ? 'Generating PDF...' : '📄 Download Question Paper PDF'}
        </button>
      </div>
    </div>
  )
}