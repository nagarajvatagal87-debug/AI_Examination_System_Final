import { useState, useEffect, useRef } from 'react'
import api from '../../api/client.js'
import './HODMessages.css'

export default function HODMessages() {
  const [hod, setHod] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    api.get('/profile/my-hod')
      .then((res) => {
        setHod(res.data.hod)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (hod) loadMessages()
  }, [hod])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function loadMessages() {
    api.get('/messages')
      .then((res) => setMessages(res.data))
      .catch(() => {})
  }

  async function handleSend(e) {
    if (e) e.preventDefault()
    if (!reply.trim() || !hod) return
    try {
      await api.post('/messages', { recipientId: hod.id, body: reply })
      setReply('')
      loadMessages()
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  if (loading) {
    return (
      <div className="hm-card">
        <div className="hm-loading">Loading HOD communication channel...</div>
      </div>
    )
  }

  if (!hod) {
    return (
      <div className="hm-card">
        <div className="hm-header-bar">
          <h3 className="hm-hod-name">💬 HOD Communication Portal</h3>
        </div>
        <div className="hm-empty-box">
          <span style={{ fontSize: 32 }}>ℹ️</span>
          <p style={{ marginTop: 8, fontSize: 14 }}>No Head of Department (HOD) assigned to your department yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hm-card">
      {/* Header Banner */}
      <div className="hm-header-bar">
        <div className="hm-hod-profile">
          <div className="hm-avatar">
            👨‍💼
          </div>
          <div>
            <h3 className="hm-hod-name">{hod.full_name}</h3>
            <span className="hm-hod-role">Head of Department (HOD)</span>
          </div>
        </div>
        <div className="hm-status-pill">
          <span className="hm-status-dot" />
          Active Channel
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="hm-chat-body">
        {messages.length === 0 ? (
          <div className="hm-no-messages">
            <span style={{ fontSize: 36 }}>✉️</span>
            <h4>No Messages Exchanged Yet</h4>
            <p>Type a message below to start a conversation with your HOD.</p>
          </div>
        ) : (
          <div className="hm-messages-list">
            {messages.map((m) => {
              const isFromHod = m.sender_id === hod.id
              const timestamp = new Date(m.created_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div key={m.id} className={`hm-msg-group ${isFromHod ? 'from-hod' : 'from-me'}`}>
                  <div className="hm-msg-meta">
                    <span className="hm-msg-sender">{isFromHod ? hod.full_name : 'You (Faculty)'}</span>
                    <span className="hm-msg-time">{timestamp}</span>
                  </div>
                  <div className="hm-msg-bubble">
                    {m.body}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Form Footer */}
      <form className="hm-input-bar" onSubmit={handleSend}>
        <input
          className="hm-input"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={`Write a message to ${hod.full_name}...`}
        />
        <button type="submit" className="hm-send-btn" disabled={!reply.trim()}>
          <span>Send</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  )
}