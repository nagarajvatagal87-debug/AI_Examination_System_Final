import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodInternalResults() {
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [results, setResults] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get('/hod/exams').then((res) => setExams(res.data)).catch(() => {})
  }, [])

  function openExam(examId) {
    setSelectedExamId(examId)
    api.get(`/hod/results/${examId}`).then((res) => setResults(res.data)).catch(() => {})
  }

  async function handleForward() {
    try {
      const { data } = await api.post(`/hod/results/${selectedExamId}/forward`)
      setMsg(`Forwarded top 10 to ${data.notifiedPrincipals} Principal(s).`)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Forward failed')
    }
  }

  return (
    <div>
      <h2 className="hc-title">Internal Exam Results</h2>

      <div className="hc-section">
        <table className="hc-table">
          <thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th></th></tr></thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id}>
                <td>{e.subjects?.name}</td><td>{e.title}</td><td>{e.total_marks}</td>
                <td><button className="hc-btn hc-btn-secondary" onClick={() => openExam(e.id)}>View Results</button></td>
              </tr>
            ))}
            {exams.length === 0 && <tr><td colSpan={4} className="hint">No internal exams in your department yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {results && (
        <div className="hc-section">
          <div className="hc-section-header">
            <h3>{results.exam.title} — {results.totalStudents} students</h3>
            <button className="hc-btn" onClick={handleForward}>Transfer Top 10 to Principal</button>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
            Pass: {results.passCount} · Fail: {results.failCount} · Pass mark: {results.passMark}
          </p>
          <table className="hc-table">
            <thead><tr><th>Rank</th><th>Student</th><th>Register No</th><th>Marks</th></tr></thead>
            <tbody>
              {results.rankings.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td><td>{r.profiles?.full_name}</td><td>{r.profiles?.registration_no}</td><td>{r.total_marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {msg && <p className="hc-status">{msg}</p>}
        </div>
      )}
    </div>
  )
}