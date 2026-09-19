import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'
import './Results.css'

export default function Results() {
  const [searchParams, setSearchParams] = useSearchParams()
  const examId = searchParams.get('examId')

  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(examId || '')
  const [exam, setExam] = useState(null)
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get('/faculty/dashboard-summary')
      .then((res) => {
        const list = res.data?.recentExams || []
        setExams(list)
        if (!examId && list.length > 0) {
          setSelectedExamId(list[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const activeId = examId || selectedExamId
    if (!activeId) return
    load(activeId)
  }, [examId, selectedExamId])

  function load(targetId) {
    const activeId = targetId || examId || selectedExamId
    if (!activeId) return
    api.get(`/faculty/exams/${activeId}/results`).then((res) => {
      setExam(res.data.exam)
      setRows(res.data.rows || [])
    }).catch(() => {})
  }

  const activeId = examId || selectedExamId
  const allVerified = rows.length > 0 && rows.every((r) => r.status === 'verified' || r.status === 'published')
  const evaluatedCount = rows.filter((r) => r.status === 'verified' || r.status === 'published' || r.status === 'pending').length

  async function handlePublishClass() {
    if (!activeId) return
    setMsg('Publishing class result...')
    try {
      const { data } = await api.post(`/faculty/exams/${activeId}/publish-results`)
      setMsg(`Published. Rankings created: ${data.rankings_created}`)
      load(activeId)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Publish failed')
    }
  }

  async function handlePublishStudent(submissionId) {
    try {
      await api.post(`/faculty/submissions/${submissionId}/publish`)
      setMsg('Student result published.')
      load(activeId)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Publish failed')
    }
  }

  function handleDownloadSheet() {
    const header = 'Register No,Student,Marks,Status\n'
    const body = rows.map((r) => `${r.registrationNo},${r.fullName},${r.totalMarks}/${r.maxMarks},${r.status}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exam?.title || 'result'}-sheet.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="rs-title">📊 Published Results & Rankings</h2>
          <p className="rs-sub">Manage & publish exam scores to students and HOD dashboard</p>
        </div>

        {exams.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Select Exam:</label>
            <select
              value={activeId}
              onChange={(e) => {
                setSelectedExamId(e.target.value)
                setSearchParams({ examId: e.target.value })
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.15)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.subjectName} — {ex.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!activeId ? (
        <div style={{ padding: 30, textAlign: 'center', background: 'rgba(30,41,59,0.4)', borderRadius: 12, color: '#94a3b8' }}>
          No active examinations found. Please create an examination first.
        </div>
      ) : (
        <>
          <div style={{ background: 'rgba(30,41,59,0.5)', padding: 14, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>{exam?.title || 'Examination Results'}</h3>
            <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>
              {evaluatedCount} / {rows.length} Student Papers Evaluated {allVerified && '✅ All Verified'}
            </span>
          </div>

          <table className="rs-table">
            <thead>
              <tr><th>Student Name</th><th>Register No (USN)</th><th>Evaluated Marks</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.submissionId}>
                  <td><strong>{r.fullName}</strong></td>
                  <td>{r.registrationNo}</td>
                  <td><strong>{r.totalMarks} / {r.maxMarks}</strong></td>
                  <td><span className={`dh-status-badge ${r.status}`}>{r.status}</span></td>
                  <td>
                    {r.status === 'verified' && (
                      <button className="fd-btn fd-btn-secondary" onClick={() => handlePublishStudent(r.submissionId)}>Publish Result</button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="hint" style={{ textAlign: 'center', padding: 20 }}>No student submissions evaluated for this exam yet.</td></tr>
              )}
            </tbody>
          </table>

          <div className="rs-actions" style={{ display: 'flex', gap: 12 }}>
            <button className="fd-btn" disabled={!allVerified || rows.length === 0} onClick={handlePublishClass}>
              🚀 Publish Class Result to Students & HOD
            </button>
            <button className="fd-btn fd-btn-secondary" disabled={rows.length === 0} onClick={handleDownloadSheet}>
              📥 Download Result CSV Sheet
            </button>
          </div>
        </>
      )}

      {msg && <p className="fd-status">{msg}</p>}
    </div>
  )
}