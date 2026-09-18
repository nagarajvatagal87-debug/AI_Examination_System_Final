import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './Notifications.css'

const TYPE_ICON = {
  marks_published: '📊',
  new_message: '📩',
  department_results_published: '📢',
  exam_results_published: '📢',
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  function load() {
    api.get('/notifications').then((res) => setNotifications(res.data)).catch(() => {})
  }

  async function markRead(n) {
    if (!n.read) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {})
      load()
    }
    if (n.type === 'new_message') navigate('/faculty/messages')
    else if (n.related_exam_id) navigate(`/faculty/results?examId=${n.related_exam_id}`)
  }

  return (
    <div>
      <h2 className="nf-title">Notifications</h2>

      <div className="nf-list">
        {notifications.map((n) => (
          <div key={n.id} className={`nf-item ${n.read ? '' : 'unread'}`} onClick={() => markRead(n)}>
            <span className="nf-icon">{TYPE_ICON[n.type] || '🔔'}</span>
            <div className="nf-body">
              <div className="nf-title-line">{n.title}</div>
              {n.body && <div className="nf-desc">{n.body}</div>}
              <div className="nf-time">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {!n.read && <span className="nf-dot" />}
          </div>
        ))}
        {notifications.length === 0 && <p className="hint">No notifications yet.</p>}
      </div>
    </div>
  )
}