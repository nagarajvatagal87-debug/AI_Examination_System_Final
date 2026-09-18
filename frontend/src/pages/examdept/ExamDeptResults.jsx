import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'

export default function ExamDeptResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const examId = searchParams.get('examId')
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(examId || '')
  const [examDetail, setExamDetail] = useState(null)
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    api.get('/examdept/exams')
      .then((res) => {
        setExams(res.data || [])
        if (!examId && res.data?.length > 0) {
          setSelectedExamId(res.data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedExamId) {
      setLoading(true)
      setMsg('')
      api.get(`/examdept/exams/${selectedExamId}/students`)
        .then((res) => {
          setExamDetail(res.data.exam)
          setRows(res.data.students || [])
        })
        .catch((err) => setMsg(err.response?.data?.error || 'Failed to load exam student roster'))
        .finally(() => setLoading(false))
    }
  }, [selectedExamId])

  async function handlePublish() {
    setPublishing(true)
    setMsg('📢 Publishing Main Exam result — sending email notifications to all students & Department HOD...')
    try {
      const { data } = await api.post(`/examdept/exams/${selectedExamId}/publish-main-result`)
      setMsg(`✅ Main Exam Result Published successfully! Processed ${data.studentsProcessed} student results. HOD & Student emails dispatched.`)
    } catch (err) {
      setMsg(`❌ Publish failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const verifiedCount = rows.filter((r) => r.evaluationStatus === 'verified').length
  const totalStudents = rows.length
  const allVerified = totalStudents > 0 && verifiedCount === totalStudents

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, color: '#f8fafc' }}>
      <div className="pd-panel glass-card" style={{ margin: 0, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>📢 Main Examination Result Publishing</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>Select department exam, verify evaluation completion, and publish results to Students & HOD</p>
        </div>

        {/* Select Main Exam Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#c084fc', fontWeight: 700 }}>📝 Select Main Exam:</span>
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value)
              setSearchParams({ examId: e.target.value })
            }}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">-- Choose Exam --</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} — ({ex.subjects?.departments?.name || 'Department'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {examDetail && (
        <div style={{ padding: '14px 20px', borderRadius: 12, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🏛️ Target Department: <strong>{examDetail.subjects?.departments?.name || 'Department'}</strong></span>
          <span>👥 Department Student Roster: <strong>{totalStudents} Students</strong></span>
          <span>✅ Verified Evaluated Scripts: <strong>{verifiedCount} / {totalStudents}</strong></span>
        </div>
      )}

      {loading ? (
        <p>Loading student roster...</p>
      ) : rows.length === 0 ? (
        <div className="pd-panel glass-card" style={{ padding: 40, textAlign: 'center', margin: 0 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
          <h3 style={{ margin: 0, color: '#f8fafc' }}>No Student Roster Found</h3>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>Select an exam from the dropdown above to view student evaluation statuses.</p>
        </div>
      ) : (
        <div className="pd-panel glass-card" style={{ margin: 0, padding: 24 }}>
          <h3 style={{ fontSize: 18, margin: '0 0 16px 0' }}>Evaluated Student List ({totalStudents} Enrolled)</h3>

          <table className="pd-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 12 }}>
                <th style={{ padding: 10 }}>#</th>
                <th style={{ padding: 10 }}>REGISTER NO / USN</th>
                <th style={{ padding: 10 }}>STUDENT NAME</th>
                <th style={{ padding: 10 }}>EVALUATION STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: 12, color: '#94a3b8' }}>{idx + 1}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#c084fc' }}>{r.registration_no}</td>
                  <td style={{ padding: 12, fontWeight: 600 }}>{r.full_name}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: r.evaluationStatus === 'verified' ? 'rgba(52,211,153,0.15)' : 'rgba(251,146,60,0.15)',
                      color: r.evaluationStatus === 'verified' ? '#34d399' : '#fb923c',
                    }}>
                      {r.evaluationStatus === 'verified' ? '✅ Marks Verified' : '⏳ Evaluation Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              {allVerified ? '🎉 All student scripts are verified and ready for official publication.' : '⚠️ Some student answer scripts are pending verification.'}
            </span>

            <button
              disabled={publishing}
              onClick={handlePublish}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                cursor: publishing ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              }}
            >
              {publishing ? '⏳ Publishing Results...' : '📢 Publish Main Exam Result (Email HOD & Students)'}
            </button>
          </div>

          {msg && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: msg.includes('✅') ? 'rgba(52,211,153,0.15)' : 'rgba(124,58,237,0.15)', color: msg.includes('✅') ? '#34d399' : '#c084fc', fontSize: 13 }}>
              {msg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}