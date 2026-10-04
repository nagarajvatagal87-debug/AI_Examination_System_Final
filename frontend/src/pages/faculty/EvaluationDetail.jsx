import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import AiTransparencyPanel from '../../components/AiTransparencyPanel.jsx'
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

  const [showReupload, setShowReupload] = useState(false)

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
      setShowReupload(false)
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Upload failed')
    }
  }

  async function handleSaveMark(evaluationId, finalMarks, reason) {
    try {
      await api.post(`/faculty/evaluations/${evaluationId}/verify`, { finalMarks, reason })
      setMsg('Final mark saved & student internal marks synced!')
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed')
    }
  }

  async function handleRequestReEvaluation(evaluationId) {
    try {
      setMsg('Requesting AI re-evaluation for this question...')
      await api.post(`/faculty/evaluations/${evaluationId}/re-evaluate`)
      setMsg('Re-evaluation initiated! New evaluation version created.')
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Re-evaluation request failed')
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

  // VTU 5-Unit Choice Score Calculation (50 Marks Max)
  // Unit 1: Q1/Q2 (10m) | Unit 2: Q3/Q4 (10m) | Unit 3: Q5/Q6 (10m) | Unit 4: Q7/Q8 (10m) | Unit 5: Q9/Q10 (10m)
  function calculateVtuChoiceTotal(evals, getMarkFn) {
    if (!evals || evals.length === 0) return { total: 0, maxMarks: 50 }
    const qScores = {}
    let hasTenQs = false

    evals.forEach((e) => {
      const qNo = e.answers?.questions?.question_no || 0
      if (qNo > 0) {
        qScores[qNo] = getMarkFn(e)
        if (qNo > 5) hasTenQs = true
      }
    })

    if (hasTenQs || evals.length > 5) {
      const pairs = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]
      let sum = 0
      pairs.forEach(([qA, qB]) => {
        const markA = qScores[qA] ?? 0
        const markB = qScores[qB] ?? 0
        sum += Math.max(markA, markB)
      })
      return { total: Math.round(sum * 10) / 10, maxMarks: 50 }
    } else {
      const total = evals.reduce((sum, e) => sum + (getMarkFn(e) || 0), 0)
      return { total: Math.min(50, Math.round(total * 10) / 10), maxMarks: 50 }
    }
  }

  const aiTotalObj = calculateVtuChoiceTotal(evaluations, (e) => e.ai_suggested_marks || 0)
  const finalTotalObj = calculateVtuChoiceTotal(evaluations, (e) => (editingMarks[e.id] !== undefined ? Number(editingMarks[e.id]) : (e.final_marks ?? e.ai_suggested_marks ?? 0)))

  const aiTotal = aiTotalObj.total
  const finalTotal = finalTotalObj.total
  const maxTotal = 50
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

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {student.submissionId && (
            <button
              onClick={() => setShowReupload((prev) => !prev)}
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#b45309',
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(245,158,11,0.15)'
              }}
            >
              🔄 Replace / Re-Upload PDF
            </button>
          )}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: 10, fontSize: 13, color: '#1d4ed8', fontWeight: 700, boxShadow: '0 2px 6px rgba(37,99,235,0.06)' }}>
            📚 <strong>AI Evaluation Transparency Mode:</strong> Grounded Evidence & Explainable Rubric Analysis
          </div>
        </div>
      </div>

      {showReupload && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: 14,
          padding: '16px 20px',
          margin: '10px 0 16px 0',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🔄</span>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#92400e' }}>
                  Wrong PDF Uploaded? Re-Upload Correct Answer Script for {student.full_name} ({student.registration_no})
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: 13, color: '#b45309', fontWeight: 600 }}>
                  Select the correct PDF file below. The Vision AI pipeline will extract OCR text and re-evaluate this student's submission.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowReupload(false)}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#92400e', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                fontSize: 13,
                color: '#0f172a',
                fontWeight: 700,
                flex: 1
              }}
            />
            <button
              onClick={handleUploadAnswer}
              disabled={!file}
              style={{
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 800,
                background: file ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                cursor: file ? 'pointer' : 'not-allowed',
                boxShadow: file ? '0 4px 12px rgba(217, 119, 6, 0.3)' : 'none'
              }}
            >
              🚀 Overwrite PDF & Re-Run AI Evaluation
            </button>
          </div>
        </div>
      )}

      {!student.submissionId ? (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '2px dashed #94a3b8',
          borderRadius: 16,
          padding: '36px 32px',
          maxWidth: 600,
          margin: '24px 0',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 16
        }}>
          <div style={{ fontSize: 42 }}>📄</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', webkitTextFillColor: '#0f172a' }}>
              Upload {student.full_name}'s Answer Sheet PDF
            </h3>
            <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#475569', fontWeight: 600, maxWidth: 460, lineHeight: 1.5 }}>
              Select the scanned handwritten answer sheet PDF for USN <strong>{student.registration_no}</strong>. The AI agent will extract answers via Vision OCR and evaluate them against the course notes.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: 400, marginTop: 10 }}>
            <input
              type="file"
              accept="application/pdf"
              id="answer-pdf-input"
              onChange={(e) => setFile(e.target.files[0])}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 13,
                fontWeight: 600
              }}
            />
          </div>

          {file && (
            <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '6px 16px', borderRadius: 20, border: '1px solid #bfdbfe' }}>
              Selected File: {file.name}
            </div>
          )}

          <button
            onClick={handleUploadAnswer}
            disabled={!file}
            style={{
              marginTop: 10,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 800,
              background: file ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              boxShadow: file ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
              cursor: file ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
          >
            🚀 Upload & Run RAG AI Evaluation
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '16px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📝 VTU 5-Unit Paper Choice Navigation (Q1/Q2 · Q3/Q4 · Q5/Q6 · Q7/Q8 · Q9/Q10)</span>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 6, fontSize: 11, border: '1px solid #86efac', fontWeight: 800 }}>Max 50 Marks (Best of Choice)</span>
            </div>
            <div className="evd-q-tabs" style={{ margin: 0 }}>
              {evaluations.map((e, i) => {
                const qNo = e.answers?.questions?.question_no || i + 1
                const unitNo = Math.ceil(qNo / 2)
                return (
                  <button
                    key={e.id}
                    className={`evd-q-tab ${i === activeQ ? 'active' : ''} ${e.final_marks !== null ? 'done' : ''}`}
                    onClick={() => setActiveQ(i)}
                  >
                    Q{qNo} <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 600 }}>(U{unitNo})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {current && (
            <AiTransparencyPanel
              question={current.answers?.questions}
              evaluation={{
                ...current,
                scanned_file_url: pdfUrl,
              }}
              onVerifyMarks={(evalId, marks, reason) => handleSaveMark(evalId, marks, reason)}
              onRequestReEvaluation={(evalId) => handleRequestReEvaluation(evalId)}
              onMarkManualReview={(evalId, reason) => handleSaveMark(evalId, current.ai_suggested_marks, reason)}
              onReuploadPdf={() => setShowReupload(true)}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div className="evd-total-bar" style={{ flex: 1, margin: 0, display: 'flex', gap: 20 }}>
              <span>🤖 RAG AI Choice Score: <strong>{aiTotal} / {maxTotal} Marks</strong></span>
              <span>✏️ Faculty Total Verified: <strong>{finalTotal} / {maxTotal} Marks</strong></span>
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