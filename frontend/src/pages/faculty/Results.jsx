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

  const sortedRows = [...rows].sort((a, b) => (Number(b.totalMarks) || 0) - (Number(a.totalMarks) || 0))

  return (
    <div className="rs-container">
      <div className="rs-header-card">
        <div>
          <h2 className="rs-title">📊 Published Results & Rankings</h2>
          <p className="rs-sub">Manage & publish exam scores to students and HOD dashboard</p>
        </div>

        {exams.length > 0 && (
          <div className="rs-exam-select-box">
            <label className="rs-select-label">Select Exam:</label>
            <select
              className="rs-select"
              value={activeId}
              onChange={(e) => {
                setSelectedExamId(e.target.value)
                setSearchParams({ examId: e.target.value })
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
        <div className="rs-empty">
          No active examinations found. Please create an examination first.
        </div>
      ) : (
        <>
          <div className="rs-banner">
            <div className="rs-banner-left">
              <span className="rs-banner-icon">📝</span>
              <div>
                <h3 className="rs-banner-title" style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                  {exam?.title || 'Examination Results'}
                </h3>
                <span className="rs-banner-sub" style={{ color: '#cbd5e1', WebkitTextFillColor: '#cbd5e1' }}>
                  {exam?.subjectName || 'Department Subject'}
                </span>
              </div>
            </div>
            <div className="rs-banner-right">
              <div className="rs-progress-pill">
                <span className="rs-progress-dot" />
                <strong>{evaluatedCount} / {rows.length}</strong> Papers Evaluated
              </div>
              {allVerified && (
                <span className="rs-verified-pill">
                  ✓ All Verified
                </span>
              )}
            </div>
          </div>

          <div className="rs-table-wrapper">
            <table className="rs-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                  <th>Student Name</th>
                  <th style={{ textAlign: 'center' }}>Register No (USN)</th>
                  <th style={{ textAlign: 'center' }}>Evaluated Marks</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, idx) => {
                  const rank = idx + 1
                  const pct = r.maxMarks > 0 ? Math.round((r.totalMarks / r.maxMarks) * 100) : 0

                  return (
                    <tr key={r.submissionId || idx}>
                      <td style={{ textAlign: 'center' }}>
                        {rank === 1 ? (
                          <span className="rs-rank-badge rank-1">🥇 #1</span>
                        ) : rank === 2 ? (
                          <span className="rs-rank-badge rank-2">🥈 #2</span>
                        ) : rank === 3 ? (
                          <span className="rs-rank-badge rank-3">🥉 #3</span>
                        ) : (
                          <span className="rs-rank-badge rank-other">#{rank}</span>
                        )}
                      </td>
                      <td>
                        <strong className="rs-student-name">{r.fullName}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <code className="rs-usn-badge">{r.registrationNo}</code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="rs-marks-box">
                          <span className="rs-marks-score">{r.totalMarks}</span>
                          <span className="rs-marks-max">/ {r.maxMarks}</span>
                          <span className={`rs-pct-tag ${pct >= 75 ? 'high' : pct >= 50 ? 'med' : 'low'}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.status === 'published' ? (
                          <span className="rs-status-badge published">✓ Published</span>
                        ) : r.status === 'verified' ? (
                          <span className="rs-status-badge verified">⚡ Verified</span>
                        ) : (
                          <span className="rs-status-badge pending">⏳ Pending</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.status === 'published' ? (
                          <span className="rs-done-tag">✓ Done</span>
                        ) : (
                          <button
                            className="rs-btn-publish-single"
                            onClick={() => handlePublishStudent(r.submissionId)}
                            title="Publish this student's result"
                          >
                            🚀 Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="rs-table-empty">
                      No student submissions evaluated for this exam yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rs-actions">
            <button
              className="rs-btn-primary"
              disabled={!allVerified || rows.length === 0}
              onClick={handlePublishClass}
            >
              🚀 Publish Class Result to Students & HOD
            </button>
            <button
              className="rs-btn-secondary"
              disabled={rows.length === 0}
              onClick={handleDownloadSheet}
            >
              📥 Download Result CSV Sheet
            </button>
          </div>
        </>
      )}

      {msg && <p className="rs-status-msg">{msg}</p>}
    </div>
  )
}