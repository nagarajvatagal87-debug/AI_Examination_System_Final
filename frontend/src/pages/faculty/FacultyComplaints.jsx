import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './FacultyComplaints.css'

export default function FacultyComplaints() {
  const [complaints, setComplaints] = useState([])
  const [selected, setSelected] = useState(null)
  const [extraMarks, setExtraMarks] = useState(0)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  function load() {
    api.get('/complaints')
      .then((res) => setComplaints(Array.isArray(res.data) ? res.data : []))
      .catch(() => setComplaints([]))
  }

  function openComplaint(c) {
    setSelected(c)
    setExtraMarks(0)
    setNote('')
  }

  async function handleResolve(approved) {
    if (!selected) return
    try {
      await api.post(`/complaints/${selected.id}/resolve`, {
        approved,
        extraMarks: approved ? Number(extraMarks) : 0,
        resolutionNote: note,
      })
      setMsg(approved ? 'Complaint approved and marks updated.' : 'Complaint rejected.')
      setSelected(null)
      load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to resolve complaint')
    }
  }

  return (
    <div>
      <h2 className="fc-title">💬 Student Internal Mark Complaints</h2>
      <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#94a3b8' }}>Review student grievance requests and re-evaluation applications</p>

      <table className="fc-table">
        <thead>
          <tr><th>Student</th><th>Question</th><th>Current Marks</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {(complaints || []).map((c) => {
            const q = c.evaluations?.answers?.questions
            return (
              <tr key={c.id} className="fc-row" onClick={() => openComplaint(c)}>
                <td><strong>{c.profiles?.full_name || 'Student'}</strong> <span className="fc-reg">({c.profiles?.registration_no || '—'})</span></td>
                <td>Q{q?.question_no || 1}</td>
                <td>{c.evaluations?.final_marks || 0} / {q?.marks || 10}</td>
                <td><span className={`fc-status ${c.status}`}>{c.status}</span></td>
                <td className="ev-arrow">Review ›</td>
              </tr>
            )
          })}
          {(!complaints || complaints.length === 0) && (
            <tr><td colSpan={5} className="hint" style={{ textAlign: 'center', padding: 20 }}>No open student complaints filed.</td></tr>
          )}
        </tbody>
      </table>

      {selected && (
        <div className="fc-panel">
          <div className="fc-panel-header">
            <h3>{selected.profiles?.full_name} — Q{selected.evaluations?.answers?.questions?.question_no}</h3>
            <button className="ms-close" onClick={() => setSelected(null)}>✕</button>
          </div>
          <p className="fc-reason"><strong>Reason:</strong> {selected.reason}</p>
          <p className="fc-current">Current Marks: {selected.evaluations?.final_marks} / {selected.evaluations?.answers?.questions?.marks} (AI suggested: {selected.evaluations?.ai_suggested_marks})</p>

          <div className="fd-form-row">
            <label style={{ fontSize: 13, color: '#94a3b8' }}>Extra marks to award (if approving)</label>
            <input type="number" value={extraMarks} onChange={(e) => setExtraMarks(e.target.value)} style={{ width: 80, padding: 6, borderRadius: 6 }} />
          </div>
          <textarea
            placeholder="Resolution note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          />

          <div className="fd-form-row" style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <button className="fd-btn" onClick={() => handleResolve(true)}>Approve & Award Marks</button>
            <button className="fd-btn fd-btn-secondary" onClick={() => handleResolve(false)}>Reject</button>
          </div>
        </div>
      )}

      {msg && <p className="fd-status" style={{ marginTop: 14 }}>{msg}</p>}
    </div>
  )
}