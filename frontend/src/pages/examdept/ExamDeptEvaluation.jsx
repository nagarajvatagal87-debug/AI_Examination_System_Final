import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './ExamDeptEvaluation.css'

export default function ExamDeptEvaluation() {
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('examId')
  const navigate = useNavigate()

  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState([])

  useEffect(() => {
    if (!examId) return
    api.get(`/examdept/exams/${examId}/students`).then((res) => {
      setExam(res.data.exam)
      setStudents(res.data.students)
    }).catch(() => {})
  }, [examId])

  if (!examId) return <p className="hint">Select a Main Examination from the Examinations page first.</p>

  return (
    <div>
      <h2 className="ev-title">Main Exam Evaluation</h2>
      <p className="ev-sub">{exam?.title}</p>

      <table className="ev-table">
        <thead><tr><th>Student</th><th>Register No.</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="ev-row" onClick={() => navigate(`/examdept/evaluation/${examId}/${s.id}`)}>
              <td>{s.full_name}</td>
              <td>{s.registration_no}</td>
              <td>
                <span className={`ev-status ${s.evaluationStatus}`}>
                  {s.evaluationStatus === 'verified' ? '✓ Done' : s.evaluationStatus === 'not_uploaded' ? '— Not uploaded' : '⏳ Pending'}
                </span>
              </td>
              <td className="ev-arrow">›</td>
            </tr>
          ))}
          {students.length === 0 && <tr><td colSpan={4} className="hint">No students found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}