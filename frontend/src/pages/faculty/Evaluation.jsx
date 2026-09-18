import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './Evaluation.css'

export default function Evaluation() {
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('examId')
  const navigate = useNavigate()

  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!examId) return
    api.get(`/faculty/exams/${examId}/students`).then((res) => {
      setExam(res.data.exam)
      setStudents(res.data.students)
    }).catch(() => {})
  }, [examId])

  if (!examId) return <p className="hint">Select an examination from the Examinations page first.</p>

  const evaluatedCount = students.filter((s) => s.evaluationStatus === 'verified' || s.evaluationStatus === 'published').length
  const pendingCount = students.length - evaluatedCount

  const filtered = students.filter((s) =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.registration_no?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2 className="ev-title">AI Answer Evaluation</h2>
      <p className="ev-sub">{exam?.title} {exam?.type && `· ${exam.type}`}</p>

      <div className="ev-cards">
        <div className="ev-card"><div className="ev-card-value">{students.length}</div><div className="ev-card-label">Students</div></div>
        <div className="ev-card"><div className="ev-card-value">{evaluatedCount}</div><div className="ev-card-label">Evaluated</div></div>
        <div className="ev-card highlight"><div className="ev-card-value">{pendingCount}</div><div className="ev-card-label">Pending</div></div>
      </div>

      <input
        className="ev-search"
        placeholder="🔍 Search student"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="ev-table">
        <thead>
          <tr><th>Student</th><th>Register No.</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id} onClick={() => navigate(`/faculty/evaluation/${examId}/${s.id}`)} className="ev-row">
              <td>{s.full_name}</td>
              <td>{s.registration_no}</td>
              <td>
                <span className={`ev-status ${s.evaluationStatus}`}>
                  {s.evaluationStatus === 'verified' || s.evaluationStatus === 'published' ? '✓ Done' : s.evaluationStatus === 'not_uploaded' ? '— Not uploaded' : '⏳ Pending'}
                </span>
              </td>
              <td className="ev-arrow">›</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={4} className="hint">No students found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}