import { useState } from 'react'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodMessages() {
  const [studentId, setStudentId] = useState('')
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState('')

  async function handleSend() {
    if (!studentId || !body) return setMsg('Student ID and message are required.')
    try {
      await api.post('/hod/message', { studentId, body })
      setMsg('Message sent.')
      setBody('')
    } catch (err) {
      setMsg(err.response?.data?.error || 'Send failed')
    }
  }

  return (
    <div>
      <h2 className="hc-title">Message a Student</h2>
      <div className="hc-section">
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
          Useful for reaching out to a low scorer directly — paste their student ID from the results table.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <input className="hc-input" placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ flex: 1 }} />
        </div>
        <textarea
          className="hc-input"
          style={{ width: '100%' }}
          rows={3}
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="hc-btn" style={{ marginTop: 10 }} onClick={handleSend}>Send</button>
        {msg && <p className="hc-status">{msg}</p>}
      </div>
    </div>
  )
}