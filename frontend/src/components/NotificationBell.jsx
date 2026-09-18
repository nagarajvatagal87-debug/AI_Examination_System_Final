import { useState, useEffect } from 'react'
import api from '../api/client.js'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  async function load() {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data)
    } catch (err) {
      console.error('Failed to load notifications', err)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  async function markRead(id) {
    await api.post(`/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}>
        🔔 {unreadCount > 0 && <span style={{ color: 'red' }}>({unreadCount})</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', width: 320, maxHeight: 400, overflowY: 'auto',
          background: 'white', border: '1px solid #ccc', borderRadius: 8, padding: 8, zIndex: 10,
        }}>
          {notifications.length === 0 && <p style={{ color: '#888' }}>No notifications yet.</p>}
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              style={{
                padding: 8, borderBottom: '1px solid #eee', cursor: n.read ? 'default' : 'pointer',
                background: n.read ? 'white' : '#eef6ff',
              }}
            >
              <strong>{n.title}</strong>
              <p style={{ margin: '4px 0', fontSize: 14 }}>{n.body}</p>
              <span style={{ fontSize: 12, color: '#888' }}>{new Date(n.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}