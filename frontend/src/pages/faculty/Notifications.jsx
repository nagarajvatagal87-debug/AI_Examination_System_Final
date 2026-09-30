import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './Notifications.css'

const TYPE_CONFIG = {
  rag_sync: {
    icon: '🤖',
    chip: 'RAG AI Engine',
    themeClass: 'nf-theme-green',
  },
  system: {
    icon: '⚡',
    chip: 'Academic Rule',
    themeClass: 'nf-theme-amber',
  },
  marks_published: {
    icon: '📊',
    chip: 'Marks Published',
    themeClass: 'nf-theme-blue',
  },
  department_results_published: {
    icon: '📢',
    chip: 'Portal Alert',
    themeClass: 'nf-theme-purple',
  },
  exam_results_published: {
    icon: '🏆',
    chip: 'Exam Results',
    themeClass: 'nf-theme-blue',
  },
  new_message: {
    icon: '📩',
    chip: 'HOD Message',
    themeClass: 'nf-theme-purple',
  },
}

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'def-1',
    type: 'rag_sync',
    title: 'RAG AI Evaluation Engine Active',
    body: 'Groq Llama-3.3 70B & Vision OCR pipeline synchronized with DSATM Course Notes grounding.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    read: false,
  },
  {
    id: 'def-2',
    type: 'system',
    title: '50-Mark Internal Assessment Threshold Enforced',
    body: 'Students scoring below 25/50 in total internal marks will be marked Detained.',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    read: true,
  },
  {
    id: 'def-3',
    type: 'department_results_published',
    title: 'DSATM Examination Portal Online',
    body: 'Direct link established between Faculty, HOD, and Exam Control Department.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    read: true,
  },
]

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  function load() {
    api.get('/notifications')
      .then((res) => {
        setNotifications(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => setNotifications([]))
  }

  async function markRead(n) {
    if (!n.read && !n.id.startsWith('def-')) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {})
      load()
    }
    if (n.type === 'new_message') navigate('/faculty/messages')
    else if (n.related_exam_id) navigate(`/faculty/results?examId=${n.related_exam_id}`)
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const filteredList = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    return true
  })

  return (
    <div className="nf-container">
      <div className="nf-header-card">
        <div>
          <div className="nf-header-top">
            <h2 className="nf-title">🔔 System Activity & Notifications</h2>
            {unreadCount > 0 && <span className="nf-unread-count-chip">{unreadCount} New Alerts</span>}
          </div>
          <p className="nf-sub">Real-time Alerts for Faculty Evaluation & Examination Updates</p>
        </div>

        <div className="nf-filter-group">
          <button
            className={`nf-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            className={`nf-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      <div className="nf-list">
        {filteredList.map((n) => {
          const cfg = TYPE_CONFIG[n.type] || {
            icon: '🔔',
            chip: 'System Alert',
            themeClass: 'nf-theme-blue',
          }

          const timeFormatted = new Date(n.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              key={n.id}
              className={`nf-card ${n.read ? 'is-read' : 'is-unread'} ${cfg.themeClass}`}
              onClick={() => markRead(n)}
            >
              <div className="nf-icon-box">
                {cfg.icon}
              </div>

              <div className="nf-body-content">
                <div className="nf-top-row">
                  <span className="nf-category-chip">{cfg.chip}</span>
                  <span className="nf-time-stamp">{timeFormatted}</span>
                </div>
                <h4 className="nf-card-title">{n.title}</h4>
                {n.body && <p className="nf-card-desc">{n.body}</p>}
              </div>

              {!n.read && (
                <div className="nf-new-badge">
                  <span className="nf-pulsing-dot" />
                  <span>NEW</span>
                </div>
              )}
            </div>
          )
        })}

        {filteredList.length === 0 && (
          <div className="nf-empty-box">
            <span style={{ fontSize: 32 }}>✨</span>
            <p>No notifications matching current filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}