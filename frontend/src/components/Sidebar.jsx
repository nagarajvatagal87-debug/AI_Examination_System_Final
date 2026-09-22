import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './Sidebar.css'

export default function Sidebar({ title, subtitle, items }) {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">🎓</div>
        <div>
          <div className="sidebar-brand-title">{title}</div>
          <div className="sidebar-brand-sub">{subtitle}</div>
        </div>
      </div>

      <div className="sidebar-user" style={{ cursor: 'pointer' }}>
        <div className="sidebar-avatar" style={{ overflow: 'hidden', padding: 0 }}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user?.fullName?.[0]?.toUpperCase() || '?'
          )}
        </div>
        <div>
          <div className="sidebar-user-name">{user?.fullName || 'User Profile'}</div>
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