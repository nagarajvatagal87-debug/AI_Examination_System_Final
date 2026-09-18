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
    api.get('/complaints').then((res) => setComplaints(res.data)).catch(() => {})
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
      <h2 className="fc-title">Internal Mark Complaints</h2>

      <table className="fc-table">
        <thead>
          <tr><th>Student</th><th>Question</th><th>Current Marks</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {complaints.map((c) => {
            const q = c.evaluations?.answers?.questions
            return (
              <tr key={c.id} className="fc-row" onClick={() => openComplaint(c)}>
                <td>{c.profiles?.full_name} <span className="fc-reg">({c.profiles?.registration_no})</span></td>
                <td>Q{q?.question_no}</td>
                <td>{c.evaluations?.final_marks} / {q?.marks}</td>
                <td><span className={`fc-status ${c.status}`}>{c.status}</span></td>
                <td className="ev-arrow">›</td>
              </tr>
            )
          })}
          {complaints.length === 0 && <tr><td colSpan={5} className="hint">No open complaints.</td></tr>}
        </tbody>
      </table>

      {selected && (
        <div className="fc-panel">
          <div className="fc-panel-header">
            <h3>{selected.profiles?.full_name} — Q{selected.evaluations?.answers?.questions?.question_no}</h3>
            <button className="ms-close" onClick={() => setSelected(null)}>✕</button>
          </div>
          <p className="fc-reason"><strong>Reason:</strong> {selected.reason}</p>
          <p className="fc-current">Current: {selected.evaluations?.final_marks} / {selected.evaluations?.answers?.questions?.marks} (AI suggested: {selected.evaluations?.ai_suggested_marks})</p>

          <div className="fd-form-row">
            <label style={{ fontSize: 13, color: '#6b7280' }}>Extra marks to award (if approving)</label>
            <input type="number" value={extraMarks} onChange={(e) => setExtraMarks(e.target.value)} style={{ width: 80 }} />
          </div>
          <textarea
            placeholder="Resolution note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          />

          <div className="fd-form-row" style={{ marginTop: 12 }}>
            <button className="fd-btn" onClick={() => handleResolve(true)}>Approve & Award Marks</button>
            <button className="fd-btn fd-btn-secondary" onClick={() => handleResolve(false)}>Reject</button>
          </div>
        </div>
      )}

      {msg && <p className="fd-status">{msg}</p>}
    </div>
  )
}