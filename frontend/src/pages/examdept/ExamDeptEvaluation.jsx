import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './ExamDeptEvaluation.css'

export default function ExamDeptEvaluation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const examId = searchParams.get('examId')
  const navigate = useNavigate()

  const [departments, setDepartments] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState(() => localStorage.getItem('examdept_selected_dept_id') || 'ALL')

  useEffect(() => {
    if (selectedDeptId) {
      localStorage.setItem('examdept_selected_dept_id', selectedDeptId)
    }
  }, [selectedDeptId])
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(examId || '')
  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/examdept/departments').then((res) => setDepartments(res.data || [])).catch(() => {})
    api.get('/examdept/exams').then((res) => {
      setExams(res.data || [])
      if (!examId && res.data?.length > 0) {
        setSelectedExamId(res.data[0].id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedExamId) return
    setLoading(true)
    api.get(`/examdept/exams/${selectedExamId}/students`)
      .then((res) => {
        setExam(res.data.exam)
        setStudents(res.data.students || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedExamId])

  const filteredExams = selectedDeptId === 'ALL'
    ? exams
    : exams.filter((e) => e.subjects?.department_id === selectedDeptId || e.subjects?.departments?.id === selectedDeptId)

  return (
    <div style={{ padding: 24, color: '#f8fafc' }}>
      <div className="pd-panel glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 className="ev-title" style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⚙️ Main Exam Verification & Evaluation</h2>
          <p className="ev-sub" style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>Filter by department, pick examination, and verify AI-assisted script evaluations</p>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginRight: 8 }}>🏛️ Department:</span>
            <select
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value)
                const matched = exams.filter((ex) => e.target.value === 'ALL' || ex.subjects?.department_id === e.target.value || ex.subjects?.departments?.id === e.target.value)
                if (matched.length > 0) {
                  setSelectedExamId(matched[0].id)
                  setSearchParams({ examId: matched[0].id })
                } else {
                  setSelectedExamId('')
                }
              }}
              style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', fontWeight: 700, fontSize: 13 }}
            >
              <option value="ALL">🌐 All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <span style={{ fontSize: 12, color: '#c084fc', fontWeight: 700, marginRight: 8 }}>📝 Exam:</span>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value)
                setSearchParams({ examId: e.target.value })
              }}
              style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.9)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.4)', fontWeight: 700, fontSize: 13 }}
            >
              <option value="">-- Choose Exam --</option>
              {filteredExams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.title} ({ex.subjects?.departments?.name})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading student evaluation roster...</p>
      ) : !selectedExamId ? (
        <div className="pd-panel glass-card" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
          <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>📝</span>
          <p>No examinations found for the selected department filter. Select a different department or create an exam schedule.</p>
        </div>
      ) : (
        <div className="pd-panel glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, margin: '0 0 16px 0', color: '#38bdf8' }}>
            Candidate Roster: {exam?.title} ({students.length} Enrolled)
          </h3>
          <table className="ev-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 12 }}>
                <th style={{ padding: 10, textAlign: 'left' }}>Student Name</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Register No.</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Internal Marks (50m)</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Eligibility</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Evaluation Status</th>
                <th style={{ padding: 10 }}></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="ev-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => navigate(`/examdept/evaluation/${selectedExamId}/${s.id}`)}>
                  <td style={{ padding: 12, fontWeight: 700, color: '#f8fafc' }}>{s.full_name}</td>
                  <td style={{ padding: 12, fontWeight: 600, color: '#c084fc' }}>{s.registration_no}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: s.internal50 >= 25 ? '#34d399' : '#f87171' }}>{s.internal50} / 50</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: s.isEligible ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', color: s.isEligible ? '#34d399' : '#f87171' }}>
                      {s.eligibilityStatus}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span className={`ev-status ${s.evaluationStatus}`}>
                      {s.evaluationStatus === 'verified' ? '✓ Done & Verified' : s.evaluationStatus === 'not_uploaded' ? '— Not uploaded' : '⏳ Pending'}
                    </span>
                  </td>
                  <td className="ev-arrow" style={{ padding: 12, color: '#38bdf8', fontWeight: 800 }}>› View Script</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No students found for this examination roster.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}