import { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function HODMessages() {
  const [hod, setHod] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/profile/my-hod').then((res) => {
      setHod(res.data.hod)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { if (hod) loadMessages() }, [hod])

  function loadMessages() {
    api.get('/messages').then((res) => setMessages(res.data)).catch(() => {})
  }

  async function handleSend() {
    if (!reply.trim() || !hod) return
    await api.post('/messages', { recipientId: hod.id, body: reply })
    setReply('')
    loadMessages()
  }

  if (loading) return null
  if (!hod) {
    return (
      <div className="fd-section">
        <h2>💬 HOD Communication</h2>
        <p className="hint">No HOD is assigned to your department yet.</p>
      </div>
    )
  }

  return (
    <div className="fd-section">
      <h2>💬 Message {hod.full_name} (HOD)</h2>
      <div className="sep-thread">
        {messages.map((m) => (
          <div key={m.id} className={`sep-msg ${m.sender_id === hod.id ? 'from-hod' : 'from-me'}`}>
            <span>{m.body}</span>
            <small>{new Date(m.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
      <div className="fd-form-row">
        <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to HOD..." style={{ flex: 1 }} />
        <button className="fd-btn" onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}