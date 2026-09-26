import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './FacultyComplaints.css'

export default function FacultyComplaints() {
  const [complaints, setComplaints] = useState([])
  const [selected, setSelected] = useState(null)
  const [extraMarks, setExtraMarks] = useState(0)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  function load() {
    setLoading(true)
    api.get('/complaints')
      .then((res) => setComplaints(Array.isArray(res.data) ? res.data : []))
      .catch(() => setComplaints([]))
      .finally(() => setLoading(false))
  }

  function openComplaint(c) {
    setSelected(c)
    setExtraMarks(0)
    setNote('')
  }

  async function handleResolve(approved) {
    if (!selected) return
    try {
      const res = await api.post(`/complaints/${selected.id}/resolve`, {
        approved,
        extraMarks: approved ? Number(extraMarks) : 0,
        resolutionNote: note,
      })
      setMsg(approved ? `✓ Complaint approved! ${extraMarks > 0 ? `+${extraMarks} extra marks awarded.` : ''} Email notification sent to student.` : '✓ Complaint rejected. Email notification sent to student.')
      setSelected(null)
      load()
      setTimeout(() => setMsg(''), 5000)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to resolve complaint')
      setTimeout(() => setMsg(''), 4000)
    }
  }

  return (
    <div className="fc-container">
      <div className="fc-header">
        <div>
          <h2 className="fc-title">
            💬 Student Internal Mark Complaints & Appeals
          </h2>
          <p className="fc-sub">
            Review student re-evaluation applications, verify answer scripts, award extra marks, and dispatch automated resolution emails.
          </p>
        </div>
        <button className="fc-btn-refresh" onClick={load}>
          🔄 Refresh Complaints
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          marginBottom: 18,
          background: msg.includes('✓') ? '#f0fdf4' : '#fef2f2',
          border: msg.includes('✓') ? '1px solid #bbf7d0' : '1px solid #fca5a5',
          color: msg.includes('✓') ? '#166534' : '#991b1b',
          fontSize: 13,
          fontWeight: 700,
        }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Loading student complaints...</div>
      ) : (
        <div className="fc-table-wrapper">
          <table className="fc-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Student Name & USN</th>
                <th style={{ width: '30%' }}>Subject / Question</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Current Marks</th>
                <th style={{ width: '16%', textAlign: 'center' }}>Status</th>
                <th style={{ width: '14%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(complaints || []).map((c) => {
                const studentName = c.student_name || c.profiles?.full_name || 'Student'
                const regNo = c.registration_no || c.profiles?.registration_no || 'N/A'
                const qTitle = c.question_title || (c.evaluations?.answers?.questions?.question_text ? `Q${c.evaluations.answers.questions.question_no}: ${c.evaluations.answers.questions.question_text}` : 'Internal Assessment Question')
                const currentMarks = c.current_marks !== undefined && c.current_marks !== null ? c.current_marks : (c.evaluations?.final_marks || 0)
                const maxMarks = c.max_marks || c.evaluations?.answers?.questions?.marks || 10
                const statusStr = c.status || 'open'

                return (
                  <tr
                    key={c.id}
                    className="fc-row"
                    onClick={() => openComplaint(c)}
                  >
                    <td>
                      <strong className="fc-student-name">{studentName}</strong>
                      <code className="fc-usn-badge">{regNo}</code>
                    </td>
                    <td>
                      <strong className="fc-subject-name">{c.subject_name || c.subject_code || 'Subject'}</strong>
                      <div className="fc-q-title" title={qTitle}>
                        {qTitle}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="fc-marks-pill">
                        <strong>{currentMarks}</strong> <span className="fc-marks-max">/ {maxMarks}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {statusStr === 'resolved' ? (
                        <span className="fc-status-badge resolved">✓ Resolved</span>
                      ) : statusStr === 'rejected' ? (
                        <span className="fc-status-badge rejected">❌ Rejected</span>
                      ) : (
                        <span className="fc-status-badge pending">⏳ Pending</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="fc-btn-review">
                        Review ›
                      </button>
                    </td>
                  </tr>
                )
              })}
              {(!complaints || complaints.length === 0) && (
                <tr>
                  <td colSpan={5} className="fc-table-empty">
                    No open student complaints filed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fc-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #cbd5e1', paddingBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 800 }}>
                Review Appeal: {selected.student_name || selected.profiles?.full_name} ({selected.registration_no || selected.profiles?.registration_no || 'N/A'})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                {selected.subject_name ? `${selected.subject_name} (${selected.subject_code || ''})` : 'Course Subject'}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: '#e2e8f0', border: 'none', width: 28, height: 28, borderRadius: 14, fontWeight: 'bold', cursor: 'pointer', color: '#475569' }}
            >
              ✕
            </button>
          </div>

          <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 4, letterSpacing: '0.04em' }}>Evaluation Item / Question</div>
            <strong style={{ fontSize: 14, color: '#0284c7', display: 'block', marginBottom: 10 }}>
              {selected.question_title || selected.evaluations?.answers?.questions?.question_text || 'Internal Examination Question'}
            </strong>

            <div style={{ display: 'flex', gap: 20, fontSize: 13, background: '#f0f9ff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
              <div><span style={{ color: '#64748b' }}>Current Score:</span> <strong style={{ color: '#0f172a' }}>{selected.current_marks ?? selected.evaluations?.final_marks ?? 0} / {selected.max_marks || selected.evaluations?.answers?.questions?.marks || 10}</strong></div>
              <div><span style={{ color: '#64748b' }}>AI Grounded Score:</span> <strong style={{ color: '#0284c7' }}>{selected.ai_suggested_marks ?? selected.evaluations?.ai_suggested_marks ?? 0} Marks</strong></div>
              <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ textTransform: 'uppercase', color: selected.status === 'resolved' ? '#059669' : '#ea580c' }}>{selected.status}</strong></div>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 20 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#e11d48', fontWeight: 800, marginBottom: 4, letterSpacing: '0.04em' }}>Student Appeal Reason</div>
            <div style={{ fontSize: 14, color: '#334155', fontStyle: 'italic', lineHeight: 1.6, background: '#fff1f2', padding: 12, borderRadius: 8, border: '1px solid #fecdd3' }}>
              "{selected.reason}"
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: 18, borderRadius: 12, border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#0f172a', fontWeight: 800 }}>Faculty Resolution & Score Revision</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Extra Marks to Award (if approving):</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={extraMarks}
                  onChange={(e) => setExtraMarks(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#059669', background: '#f0fdf4' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Faculty Resolution Remarks / Email Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Reviewed derivation steps; 2 extra marks awarded."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => handleResolve(true)}
                style={{
                  padding: '11px 22px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                }}
              >
                ✓ Approve & Award Extra Marks
              </button>

              <button
                onClick={() => handleResolve(false)}
                style={{
                  padding: '11px 22px',
                  borderRadius: 10,
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
                }}
              >
                ❌ Reject Complaint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}