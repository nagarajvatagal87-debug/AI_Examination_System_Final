import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'
import './Examinations.css'

export default function Examinations() {
  const [exams, setExams] = useState([])
  const [mySubjects, setMySubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch faculty assigned subjects
    api.get('/subjects?mine=true')
      .then((res) => {
        const subs = Array.isArray(res.data) ? res.data : []
        setMySubjects(subs)
        const urlSubject = searchParams.get('subjectId')
        if (urlSubject) {
          setSelectedSubjectId(urlSubject)
        } else if (subs.length > 0) {
          setSelectedSubjectId('ALL')
        }
      })
      .catch(() => setMySubjects([]))
  }, [])

  useEffect(() => {
    load()
  }, [selectedSubjectId])

  function load() {
    const url = selectedSubjectId && selectedSubjectId !== 'ALL'
      ? `/exams?subjectId=${selectedSubjectId}`
      : '/exams'

    api.get(url)
      .then((res) => setExams(Array.isArray(res.data) ? res.data : []))
      .catch(() => setExams([]))
  }

  function handleSubjectChange(e) {
    const val = e.target.value
    setSelectedSubjectId(val)
    if (val && val !== 'ALL') {
      setSearchParams({ subjectId: val })
    } else {
      setSearchParams({})
    }
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
      <div className="ex-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="ex-title" style={{ margin: '0 0 6px 0' }}>📝 Department Examinations</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Create & Manage Autonomous Internal Assessment Question Papers</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {mySubjects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Filter Subject:</label>
              <select
                value={selectedSubjectId}
                onChange={handleSubjectChange}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All My Teaching Subjects</option>
                {mySubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || 'ACAD'})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            className="fd-btn"
            onClick={() => navigate('/faculty/examinations/create' + (selectedSubjectId && selectedSubjectId !== 'ALL' ? `?subjectId=${selectedSubjectId}` : ''))}
          >
            + Create Examination
          </button>
        </div>
      </div>

      <div className="ex-list" style={{ marginTop: 20 }}>
        {(exams || []).map((e) => (
          <div key={e.id} className="ex-card">
            <div className="ex-card-main">
              <div className="ex-subject">
                📚 {e.subjectName || 'Subject'} {e.subjectCode ? `(${e.subjectCode})` : ''}
              </div>
              <div className="ex-exam-title">{e.title}</div>
              <div className="ex-meta">{e.total_marks || 50} Marks · {e.studentCount || 0} Students Enrolled</div>
              <span className={`dh-status-badge ${e.status}`}>{e.status || 'draft'}</span>
            </div>
            <div className="ex-card-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            <p style={{ margin: '0 0 14px 0' }}>No examinations found for the selected subject criteria.</p>
            <button
              className="fd-btn"
              onClick={() => navigate('/faculty/examinations/create' + (selectedSubjectId && selectedSubjectId !== 'ALL' ? `?subjectId=${selectedSubjectId}` : ''))}
            >
              + Create First Examination
            </button>
          </div>
        )}
      </div>
    </div>
  )
}