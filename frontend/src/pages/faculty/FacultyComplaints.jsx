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
    <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="fc-title" style={{ margin: 0, fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
            💬 Student Internal Mark Complaints & Appeals
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
            Review student re-evaluation applications, verify answer scripts, award extra marks, and dispatch automated resolution emails.
          </p>
        </div>
        <button
          onClick={load}
          style={{ padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, color: '#334155', cursor: 'pointer' }}
        >
          🔄 Refresh Complaints
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
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
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Loading student complaints...</div>
      ) : (
        <table className="fc-table" style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 10, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textTransform: 'uppercase', fontSize: 11, color: '#64748b' }}>Student Name & USN</th>
              <th style={{ padding: '12px 16px', textTransform: 'uppercase', fontSize: 11, color: '#64748b' }}>Subject / Question</th>
              <th style={{ padding: '12px 16px', textTransform: 'uppercase', fontSize: 11, color: '#64748b' }}>Current Marks</th>
              <th style={{ padding: '12px 16px', textTransform: 'uppercase', fontSize: 11, color: '#64748b' }}>Status</th>
              <th style={{ padding: '12px 16px', textTransform: 'uppercase', fontSize: 11, color: '#64748b' }}>Action</th>
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
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{studentName}</strong>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>USN: {regNo}</span>
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 300 }}>
                    <strong style={{ fontSize: 13, color: '#1e3a8a', display: 'block' }}>{c.subject_name || c.subject_code || 'Subject'}</strong>
                    <div style={{ fontSize: 12, color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={qTitle}>
                      {qTitle}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ fontSize: 15, color: '#2563eb' }}>{currentMarks} / {maxMarks} Marks</strong>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: statusStr === 'resolved' ? '#dcfce7' : statusStr === 'rejected' ? '#fee2e2' : '#fef3c7',
                      color: statusStr === 'resolved' ? '#15803d' : statusStr === 'rejected' ? '#b91c1c' : '#b45309',
                      border: statusStr === 'resolved' ? '1px solid #86efac' : statusStr === 'rejected' ? '1px solid #fca5a5' : '1px solid #fde68a',
                    }}>
                      {statusStr === 'resolved' ? '✓ RESOLVED' : statusStr === 'rejected' ? '❌ REJECTED' : '⏳ PENDING REVIEW'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                      Review & Resolve ›
                    </button>
                  </td>
                </tr>
              )
            })}
            {(!complaints || complaints.length === 0) && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  No open student complaints filed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {selected && (
        <div style={{
          marginTop: 24,
          background: '#f8fafc',
          borderRadius: 14,
          padding: 24,
          border: '1px solid #cbd5e1',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', pb: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>
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

          <div style={{ background: '#ffffff', padding: 16, borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 16 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 4 }}>Evaluation Item / Question</div>
            <strong style={{ fontSize: 14, color: '#1e3a8a', display: 'block', marginBottom: 10 }}>
              {selected.question_title || selected.evaluations?.answers?.questions?.question_text || 'Internal Examination Question'}
            </strong>

            <div style={{ display: 'flex', gap: 20, fontSize: 13, background: '#eff6ff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <div><span style={{ color: '#64748b' }}>Current Score:</span> <strong style={{ color: '#1e3a8a' }}>{selected.current_marks ?? selected.evaluations?.final_marks ?? 0} / {selected.max_marks || selected.evaluations?.answers?.questions?.marks || 10}</strong></div>
              <div><span style={{ color: '#64748b' }}>AI Grounded Score:</span> <strong style={{ color: '#2563eb' }}>{selected.ai_suggested_marks ?? selected.evaluations?.ai_suggested_marks ?? 0} Marks</strong></div>
              <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ textTransform: 'uppercase', color: selected.status === 'resolved' ? '#059669' : '#d97706' }}>{selected.status}</strong></div>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: 16, borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 20 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#dc2626', fontWeight: 800, marginBottom: 4 }}>Student Appeal Reason</div>
            <div style={{ fontSize: 14, color: '#334155', fontStyle: 'italic', lineHeight: 1.6, background: '#fff1f2', padding: 12, borderRadius: 8, border: '1px solid #fecdd3' }}>
              "{selected.reason}"
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: 18, borderRadius: 10, border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#0f172a' }}>Faculty Resolution & Score Revision</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Extra Marks to Award (if approving):</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={extraMarks}
                  onChange={(e) => setExtraMarks(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#10b981' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Faculty Resolution Remarks / Email Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Reviewed derivation steps; 2 extra marks awarded."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => handleResolve(true)}
                style={{
                  padding: '11px 22px',
                  borderRadius: 8,
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
                  borderRadius: 8,
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
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