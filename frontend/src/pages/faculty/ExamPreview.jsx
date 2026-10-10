import { useEffect, useState } from 'react'
import api from '../../api/client.js'
import './ExamPreview.css'

export default function ExamPreview({ examId }) {
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editMarks, setEditMarks] = useState(10)
  const [editCo, setEditCo] = useState('CO1')
  const [editRbt, setEditRbt] = useState('L1')
  const [exporting, setExporting] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      api.get(`/exams/${examId}`).catch(() => ({ data: null })),
      api.get(`/faculty/exams/${examId}/questions`)
    ])
      .then(([examRes, qRes]) => {
        if (examRes?.data) setExam(examRes.data)
        setQuestions(qRes.data || [])
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load question paper preview'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (examId) load() }, [examId])

  function startEdit(q) {
    setEditingId(q.id)
    setEditText(q.question_text)
    setEditMarks(q.marks)
    setEditCo(q.co || 'CO1')
    setEditRbt(q.rbt || 'L1')
  }

  async function saveEdit(id) {
    try {
      await api.patch(`/faculty/questions/${id}`, {
        questionText: editText,
        marks: Number(editMarks),
        co: editCo,
        rbt: editRbt
      })
      setEditingId(null)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save edits')
    }
  }

  async function handleReject(id) {
    if (!confirm('Reject this question? It will be removed from the paper.')) return
    try {
      await api.delete(`/faculty/questions/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject question')
    }
  }

  async function handleExportPdf() {
    setExporting(true)
    setError('')
    try {
      const { data } = await api.post(`/faculty/exams/${examId}/export-pdf`)
      const url = data.download_url
      
      const win = window.open(url, '_blank')
      if (win) win.focus()

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

  if (loading) return <p className="ep-empty-text">Loading question paper preview...</p>

  const subjectName = exam?.subjects?.name || exam?.subjectName || 'Subject'
  const subjectCode = exam?.subjects?.code || exam?.subjectCode || 'ACAD'
  const examTitle = exam?.title || 'Second Internal Assessment Test (IAT-2)'
  const maxMarks = exam?.total_marks || 50

  return (
    <div className="ep-container">
      <div className="ep-top-bar">
        <h2 className="ep-title">
          📋 Internal Assessment Question Paper
          <span className="ep-count-pill">{questions.length} Questions</span>
        </h2>
        <button className="ep-btn-download" onClick={handleExportPdf} disabled={exporting || questions.length === 0}>
          {exporting ? 'Generating PDF...' : '🖨️ Download / Print Official Paper PDF'}
        </button>
      </div>

      {error && <div className="ep-status-error">{error}</div>}

      {/* Official Institutional Document Preview Box */}
      <div className="ep-paper-sheet">
        {/* Header with DSI Logo on Left & VTU Logo on Right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #000000', paddingBottom: 14, marginBottom: 16, gap: 16 }}>
          <img src="/dsi-logo.png" alt="DSI Logo" style={{ height: 68, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 className="ep-inst-title" style={{ margin: 0, fontSize: 17, fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: 0.5 }}>
              DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT
            </h1>
            <p className="ep-inst-sub" style={{ margin: '2px 0 0 0', fontSize: 11, fontStyle: 'italic', fontWeight: 700, color: '#111111' }}>
              (An Autonomous Institute Affiliated to VTU, Belagavi & Approved by AICTE, New Delhi)
            </p>
            <p className="ep-inst-sub" style={{ margin: '1px 0 0 0', fontSize: 10.5, fontStyle: 'italic', color: '#111111' }}>
              Kanakapura Road, Opp. Art of Living, Udayapura, Bengaluru - 560082 | NAAC Accredited 'A+'
            </p>
            <p className="ep-inst-sub" style={{ margin: '1px 0 0 0', fontSize: 10, color: '#333333', fontWeight: 600 }}>
              4 Programs Accredited by NBA (CSE, ISE, ECE, ME)
            </p>
            <h3 className="ep-dept-title" style={{ margin: '6px 0 2px 0', fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', color: '#000000' }}>
              DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS
            </h3>
            <h4 className="ep-exam-title" style={{ margin: '4px 0 0 0', fontSize: 14.5, fontWeight: 900, textTransform: 'uppercase', color: '#000000' }}>
              {examTitle}
            </h4>
          </div>
          <img src="/vtu-logo.png" alt="VTU Logo" style={{ height: 64, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        </div>

        {/* Metadata Grid Box */}
        <table className="ep-meta-table">
          <tbody>
            <tr>
              <td className="ep-meta-lbl">Subject:</td>
              <td className="ep-meta-val"><strong>{subjectName}</strong></td>
              <td className="ep-meta-lbl">Subject Code:</td>
              <td className="ep-meta-val"><strong>{subjectCode}</strong></td>
            </tr>
            <tr>
              <td className="ep-meta-lbl">Semester:</td>
              <td className="ep-meta-val">02</td>
              <td className="ep-meta-lbl">Max. Marks:</td>
              <td className="ep-meta-val"><strong>{maxMarks}</strong></td>
            </tr>
            <tr>
              <td className="ep-meta-lbl">Batch:</td>
              <td className="ep-meta-val">2025-2027</td>
              <td className="ep-meta-lbl">Duration:</td>
              <td className="ep-meta-val">90min</td>
            </tr>
            <tr>
              <td className="ep-meta-lbl">Date of IAT:</td>
              <td className="ep-meta-val">{new Date().toLocaleDateString('en-GB')}</td>
              <td className="ep-meta-lbl">Teaching Dept:</td>
              <td className="ep-meta-val">MCA</td>
            </tr>
            <tr>
              <td colSpan="4" className="ep-rbt-bar">
                <strong>RBT Levels:</strong> L1-Remember, L2-Understand, L3-Apply, L4-Analyze, L5-Evaluate, L6-Create
              </td>
            </tr>
          </tbody>
        </table>

        {/* Instructions Box */}
        <div className="ep-instructions-box" style={{ background: '#fafafa', border: '1px solid #000000', padding: '8px 12px', fontWeight: 800, fontSize: 13, marginBottom: 16, color: '#000000' }}>
          Instruction: Answer the following questions choosing one from each option (e.g., 1 OR 2, 3 OR 4, 5 OR 6, 7 OR 8, 9 OR 10)
        </div>

        {/* Questions Table Grid */}
        {questions.length === 0 ? (
          <p className="ep-empty-text">No questions generated yet.</p>
        ) : (
          <table className="ep-q-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Q No</th>
                <th>Questions</th>
                <th style={{ width: '60px' }}>Marks</th>
                <th style={{ width: '65px' }}>COs</th>
                <th style={{ width: '65px' }}>RBTL</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.flatMap((q, idx) => {
                const isEvenOrRow = idx % 2 === 0 && idx < questions.length - 1
                const isEditing = editingId === q.id

                const rowElements = [
                  <tr key={q.id}>
                    {isEditing ? (
                      <td colSpan="6" className="ep-edit-cell">
                        <div className="ep-edit-box">
                          <div className="ep-edit-header">Edit Question Q{q.question_no || idx + 1}</div>
                          <textarea
                            className="ep-edit-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                          />
                          <div className="ep-edit-controls">
                            <label>Marks:
                              <input
                                type="number"
                                className="ep-edit-num"
                                value={editMarks}
                                onChange={(e) => setEditMarks(e.target.value)}
                              />
                            </label>
                            <label>CO:
                              <select className="ep-edit-select" value={editCo} onChange={(e) => setEditCo(e.target.value)}>
                                <option value="CO1">CO1</option>
                                <option value="CO2">CO2</option>
                                <option value="CO3">CO3</option>
                                <option value="CO4">CO4</option>
                                <option value="CO5">CO5</option>
                              </select>
                            </label>
                            <label>RBTL:
                              <select className="ep-edit-select" value={editRbt} onChange={(e) => setEditRbt(e.target.value)}>
                                <option value="L1">L1</option>
                                <option value="L2">L2</option>
                                <option value="L3">L3</option>
                                <option value="L4">L4</option>
                                <option value="L5">L5</option>
                                <option value="L6">L6</option>
                              </select>
                            </label>
                            <button className="ep-btn-save" onClick={() => saveEdit(q.id)}>Save</button>
                            <button className="ep-btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="col-qno">{q.question_no || idx + 1}</td>
                        <td className="col-text">{q.question_text}</td>
                        <td className="col-marks">{q.marks}</td>
                        <td className="col-co">{q.co || `CO${((Math.floor(idx / 2) % 4) + 1)}`}</td>
                        <td className="col-rbt">{q.rbt || `L${((Math.floor(idx / 2) % 4) + 1)}`}</td>
                        <td className="col-actions">
                          <button className="ep-sm-btn ep-btn-edit" onClick={() => startEdit(q)} title="Edit Question">✏️</button>
                          <button className="ep-sm-btn ep-btn-reject" onClick={() => handleReject(q.id)} title="Delete Question">🗑️</button>
                        </td>
                      </>
                    )}
                  </tr>
                ]

                if (isEvenOrRow && !isEditing) {
                  rowElements.push(
                    <tr key={`or-${q.id}`} className="ep-or-row">
                      <td colSpan="6" style={{ textAlign: 'center', fontWeight: '900', letterSpacing: '4px', background: '#f8fafc', padding: '6px', fontSize: '13px', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                        OR
                      </td>
                    </tr>
                  )
                }

                return rowElements
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}