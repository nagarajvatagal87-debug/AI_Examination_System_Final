import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'
import './Results.css'

export default function Results() {
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('examId')

  const [exam, setExam] = useState(null)
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => { if (examId) load() }, [examId])

  function load() {
    api.get(`/faculty/exams/${examId}/results`).then((res) => {
      setExam(res.data.exam)
      setRows(res.data.rows)
    }).catch(() => {})
  }

  const allVerified = rows.length > 0 && rows.every((r) => r.status !== 'pending')
  const evaluatedCount = rows.filter((r) => r.status !== 'pending').length

  async function handlePublishClass() {
    setMsg('Publishing class result...')
    try {
      const { data } = await api.post(`/faculty/exams/${examId}/publish-results`)
      setMsg(`Published. Rankings created: ${data.rankings_created}`)
      load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Publish failed')
    }
  }

  async function handlePublishStudent(submissionId) {
    try {
      await api.post(`/faculty/submissions/${submissionId}/publish`)
      setMsg('Student result published.')
      load()
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

  if (!examId) return <p className="hint">Select an examination from the Examinations page first.</p>

  return (
    <div>
      <h2 className="rs-title">{exam?.title}</h2>
      <p className="rs-sub">{evaluatedCount} / {rows.length} Evaluated {allVerified && '✅'}</p>

      <table className="rs-table">
        <thead>
          <tr><th>Student</th><th>Register No</th><th>Marks</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.submissionId}>
              <td>{r.fullName}</td>
              <td>{r.registrationNo}</td>
              <td>{r.totalMarks} / {r.maxMarks}</td>
              <td><span className={`dh-status-badge ${r.status}`}>{r.status}</span></td>
              <td>
                {r.status === 'verified' && (
                  <button className="fd-btn fd-btn-secondary" onClick={() => handlePublishStudent(r.submissionId)}>Publish</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rs-actions">
        <button className="fd-btn" disabled={!allVerified} onClick={handlePublishClass}>Publish Class Result</button>
        <button className="fd-btn fd-btn-secondary" onClick={handleDownloadSheet}>Download Result Sheet</button>
      </div>

      {msg && <p className="fd-status">{msg}</p>}
    </div>
  )
}