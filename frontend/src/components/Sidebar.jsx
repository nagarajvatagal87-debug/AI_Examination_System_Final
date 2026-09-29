import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './Sidebar.css'

export default function Sidebar({ title, subtitle, items }) {
  const { user, logout } = useAuth()
  const [rawAvatar, setRawAvatar] = useState(
    user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar') || ''
  )

  useEffect(() => {
    function updateAvatar() {
      setRawAvatar(user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar') || '')
    }
    updateAvatar()
    window.addEventListener('user_avatar_updated', updateAvatar)
    return () => window.removeEventListener('user_avatar_updated', updateAvatar)
  }, [user])

  const isValidUserAvatar = rawAvatar && !rawAvatar.includes('dsi-logo') && !rawAvatar.includes('logo')
  const userInitial = user?.fullName?.[0]?.toUpperCase() || user?.full_name?.[0]?.toUpperCase() || 'U'

  return (
    <aside className="sidebar">
      <div className="sidebar-user" style={{ cursor: 'pointer' }}>
        <div className="sidebar-avatar" style={{ overflow: 'hidden', padding: 0 }}>
          {isValidUserAvatar ? (
            <img src={rawAvatar} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            userInitial
          )}
        </div>
        <div>
          <div className="sidebar-user-name">{user?.fullName || user?.full_name || 'HOD User'}</div>
          <div className="sidebar-user-status"><span className="dot" /> Online</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={logout}>
        <span className="sidebar-item-icon">🚪</span> Logout
      </button>
    </aside>
  )
}