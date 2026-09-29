import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import './NotificationBell.css'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef(null)
  const navigate = useNavigate()

  async function load() {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load notifications', err)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 12000) // poll every 12s
    return () => clearInterval(interval)
  }, [])

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function markRead(id, e) {
    if (e) e.stopPropagation()
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (err) {
      console.error('Failed to mark notification read', err)
    }
  }

  async function markAllRead() {
    setLoading(true)
    try {
      await api.post('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark all read', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTestNotification() {
    try {
      const { data } = await api.post('/notifications/test')
      if (data) {
        setNotifications((prev) => [data, ...prev])
      }
    } catch (err) {
      console.error('Failed to create test notification', err)
    }
  }

  function handleViewAll() {
    setOpen(false)
    const currentPath = window.location.pathname
    if (currentPath.startsWith('/examdept')) {
      navigate('/examdept/notifications')
    } else if (currentPath.startsWith('/faculty')) {
      navigate('/faculty/notifications')
    } else if (currentPath.startsWith('/hod')) {
      navigate('/hod')
    } else if (currentPath.startsWith('/student')) {
      navigate('/student')
    } else if (currentPath.startsWith('/principal')) {
      navigate('/principal')
    } else {
      navigate(currentPath)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  function formatTime(isoStr) {
    if (!isoStr) return 'Just now'
    try {
      const date = new Date(isoStr)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    } catch (e) {
      return 'Recently'
    }
  }

  function getIcon(type) {
    switch (type) {
      case 'exam_approved': return '📝'
      case 'internal_marks': return '📊'
      case 'course_material': return '📄'
      case 'complaint': return '💬'
      default: return '🔔'
    }
  }

  return (
    <div className="nb-wrapper" ref={popoverRef}>
      <button
        type="button"
        className={`nb-bell-btn ${open ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen(!open)}
        title="Notifications"
        aria-label="View notifications"
      >
        <span className="nb-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="nb-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="nb-popover glass-card">
          <div className="nb-popover-header">
            <div className="nb-header-left">
              <span className="nb-header-title">Real Notifications</span>
              {unreadCount > 0 && (
                <span className="nb-unread-pill">{unreadCount} new</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="nb-mark-all-btn"
                  onClick={markAllRead}
                  disabled={loading}
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                className="nb-test-note-btn"
                onClick={handleCreateTestNotification}
                title="Send test notification"
              >
                + Test
              </button>
            </div>
          </div>

          <div className="nb-list">
            {notifications.length === 0 ? (
              <div className="nb-empty">
                <span className="nb-empty-icon">🔕</span>
                <p>No notifications yet</p>
                <button
                  type="button"
                  onClick={handleCreateTestNotification}
                  style={{
                    marginTop: 10,
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  + Generate Real Notification
                </button>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`nb-item ${!n.read ? 'unread' : 'read'}`}
                  onClick={(e) => {
                    if (!n.read) markRead(n.id, e)
                  }}
                >
                  <div className="nb-item-icon">{getIcon(n.type)}</div>
                  <div className="nb-item-content">
                    <div className="nb-item-top">
                      <span className="nb-item-title">{n.title}</span>
                      <span className="nb-item-time">{formatTime(n.created_at)}</span>
                    </div>
                    <p className="nb-item-body">{n.body}</p>
                  </div>
                  {!n.read && <span className="nb-unread-dot" title="Unread" />}
                </div>
              ))
            )}
          </div>

          <div className="nb-popover-footer">
            <button
              type="button"
              className="nb-view-all-btn"
              onClick={handleViewAll}
            >
              View Notification Alerts ➔
            </button>
          </div>
        </div>
      )}
    </div>
  )
}