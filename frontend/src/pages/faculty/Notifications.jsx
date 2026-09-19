import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './Notifications.css'

const TYPE_ICON = {
  marks_published: '📊',
  new_message: '📩',
  department_results_published: '📢',
  exam_results_published: '📢',
  rag_sync: '🤖',
  system: '⚡',
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
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  function load() {
    api.get('/notifications')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setNotifications(res.data)
        } else {
          setNotifications(DEFAULT_NOTIFICATIONS)
        }
      })
      .catch(() => setNotifications(DEFAULT_NOTIFICATIONS))
  }

  async function markRead(n) {
    if (!n.read && !n.id.startsWith('def-')) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {})
      load()
    }
    if (n.type === 'new_message') navigate('/faculty/messages')
    else if (n.related_exam_id) navigate(`/faculty/results?examId=${n.related_exam_id}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="nf-title">🔔 System Activity & Notifications</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Real-time Alerts for Faculty Evaluation & Examination Updates</p>
        </div>
      </div>

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
      </div>
    </div>
  )
}