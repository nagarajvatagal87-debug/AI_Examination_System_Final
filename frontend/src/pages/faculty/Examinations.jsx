import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'
import './Examinations.css'

export default function Examinations() {
  const [exams, setExams] = useState([])
  const [searchParams] = useSearchParams()
  const subjectId = searchParams.get('subjectId')
  const navigate = useNavigate()

  useEffect(() => {
    const url = subjectId ? `/exams?subjectId=${subjectId}` : '/exams'
    api.get(url).then((res) => setExams(res.data)).catch(() => {})
  }, [subjectId])

  return (
    <div>
      <div className="ex-header">
        <h2 className="ex-title">Examinations</h2>
        <button className="fd-btn" onClick={() => navigate('/faculty/examinations/create' + (subjectId ? `?subjectId=${subjectId}` : ''))}>
          + Create Examination
        </button>
      </div>

      <div className="ex-list">
        {exams.map((e) => (
          <div key={e.id} className="ex-card">
            <div className="ex-card-main">
              <div className="ex-subject">{e.subjectName}</div>
              <div className="ex-exam-title">{e.title}</div>
              <div className="ex-meta">{e.total_marks} Marks · {e.studentCount} Students</div>
              <span className={`dh-status-badge ${e.status}`}>{e.status}</span>
            </div>
            <div className="ex-card-actions">
              <button className="fd-btn fd-btn-secondary" onClick={() => navigate(`/faculty/examinations/${e.id}/preview`)}>View Paper</button>
              <button className="fd-btn fd-btn-secondary" onClick={() => navigate(`/faculty/evaluation?examId=${e.id}`)}>Evaluate</button>
              <button className="fd-btn" onClick={() => navigate(`/faculty/results?examId=${e.id}`)}>Results</button>
            </div>
          </div>
        ))}
        {exams.length === 0 && <p className="hint">No examinations yet.</p>}
      </div>
    </div>
  )
}