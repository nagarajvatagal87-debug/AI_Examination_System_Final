import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodNotifications() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    api.get('/notifications').then((res) => setNotifications(res.data)).catch(() => {})
  }, [])

  async function markRead(n) {
    if (!n.read) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {})
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    }
  }

  return (
    <div>
      <h2 className="hc-title">Notifications</h2>
      <div className="hc-section">
        {notifications.map((n) => (
          <div key={n.id} onClick={() => markRead(n)} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: n.read ? 0.6 : 1 }}>
            <strong style={{ fontSize: 13 }}>{n.title}</strong>
            {n.body && <div style={{ fontSize: 12, color: '#6b7280' }}>{n.body}</div>}
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
        {notifications.length === 0 && <p className="hint">No notifications yet.</p>}
      </div>
    </div>
  )
}