import { useEffect, useState } from 'react'
import api from '../../api/client.js'

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

  if (loading) return <p className="hint">Loading questions...</p>

  return (
    <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 16, color: 'var(--text-bright)' }}>
        📋 Question Paper Preview ({questions.length} questions)
      </h2>
      {error && <p className="fd-status error" style={{ color: '#f87171', marginBottom: 14 }}>{error}</p>}
      
      {questions.length === 0 ? (
        <p className="hint">No questions generated yet.</p>
      ) : (
        <div className="fd-question-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {questions.map((q) => (
            <div key={q.id} className="fd-question-card" style={{ background: 'rgba(30, 41, 59, 0.6)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="fd-question-meta" style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 6 }}>
                Q{q.question_no} · {q.unit || 'General'} · {q.difficulty || 'medium'} · {q.marks} marks
              </div>
              {editingId === q.id ? (
                <div className="fd-form-row" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} style={{ flex: 1 }} />
                  <input type="number" value={editMarks} onChange={(e) => setEditMarks(e.target.value)} style={{ width: 80 }} />
                  <button className="fd-btn" onClick={() => saveEdit(q.id)}>Save</button>
                  <button className="fd-btn fd-btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <p className="fd-question-text" style={{ fontSize: 14, color: 'var(--text-bright)', lineHeight: 1.5, marginBottom: 10 }}>
                    {q.question_text}
                  </p>
                  <div className="fd-form-row" style={{ display: 'flex', gap: 10 }}>
                    <button className="fd-btn fd-btn-secondary" onClick={() => startEdit(q)}>Edit</button>
                    <button className="fd-btn" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }} onClick={() => handleReject(q.id)}>Reject</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="fd-form-row" style={{ marginTop: 20 }}>
        <button className="fd-btn" onClick={handleExportPdf} disabled={exporting || questions.length === 0} style={{ padding: '12px 24px', fontSize: 15 }}>
          {exporting ? 'Generating PDF...' : '📄 Download Question Paper PDF'}
        </button>
      </div>
    </div>
  )
}