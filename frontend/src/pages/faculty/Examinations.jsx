import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'
import './Examinations.css'

export default function Examinations() {
  const [exams, setExams] = useState([])
  const [searchParams] = useSearchParams()
  const subjectId = searchParams.get('subjectId')
  const navigate = useNavigate()

  useEffect(() => { load() }, [subjectId])

  function load() {
    const url = subjectId ? `/exams?subjectId=${subjectId}` : '/exams'
    api.get(url)
      .then((res) => setExams(Array.isArray(res.data) ? res.data : []))
      .catch(() => setExams([]))
  }

  async function handleDelete(examId, e) {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this examination?')) return
    try {
      await api.delete(`/faculty/exams/${examId}`)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete exam')
    }
  }

  return (
    <div>
      <div className="ex-header">
        <div>
          <h2 className="ex-title">📝 Department Examinations</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Create & Manage Autonomous Internal Assessment Question Papers</p>
        </div>
        <button className="fd-btn" onClick={() => navigate('/faculty/examinations/create' + (subjectId ? `?subjectId=${subjectId}` : ''))}>
          + Create Examination
        </button>
      </div>

      <div className="ex-list" style={{ marginTop: 20 }}>
        {(exams || []).map((e) => (
          <div key={e.id} className="ex-card">
            <div className="ex-card-main">
              <div className="ex-subject">{e.subjectName || 'Subject'}</div>
              <div className="ex-exam-title">{e.title}</div>
              <div className="ex-meta">{e.total_marks || 50} Marks · {e.studentCount || 0} Students Enrolled</div>
              <span className={`dh-status-badge ${e.status}`}>{e.status || 'draft'}</span>
            </div>
            <div className="ex-card-actions" style={{ display: 'flex', gap: 8 }}>
              <button className="fd-btn fd-btn-secondary" onClick={() => navigate(`/faculty/examinations/${e.id}/preview`)}>📄 View Paper</button>
              <button className="fd-btn fd-btn-secondary" onClick={() => navigate(`/faculty/evaluation?examId=${e.id}`)}>✍️ Evaluate</button>
              <button className="fd-btn" onClick={() => navigate(`/faculty/results?examId=${e.id}`)}>📊 Results</button>
              <button
                className="fd-btn"
                onClick={(evt) => handleDelete(e.id, evt)}
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        {(!exams || exams.length === 0) && (
          <div style={{ padding: 40, textAlign: 'center', background: 'rgba(30,41,59,0.4)', borderRadius: 12, color: '#94a3b8' }}>
            <p style={{ margin: '0 0 14px 0' }}>No examinations created yet.</p>
            <button className="fd-btn" onClick={() => navigate('/faculty/examinations/create' + (subjectId ? `?subjectId=${subjectId}` : ''))}>
              + Create First Examination
            </button>
          </div>
        )}
      </div>
    </div>
  )
}