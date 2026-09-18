import { useState, useEffect } from 'react'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProfileSettings({ onProfileUpdated }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [newPassword, setNewPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [status, setStatus] = useState({ text: '', error: false })
  const [loading, setLoading] = useState(false)

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  ]

  function load() {
    setLoading(true)
    api.get('/profile')
      .then((res) => {
        setProfile(res.data)
        if (res.data.full_name) setFullName(res.data.full_name)
      })
      .catch(() => {
        // Fallback to logged in user context
        setProfile({
          full_name: user?.fullName || 'Principal',
          email: user?.email || 'principal@dsatm.edu.in',
          role: user?.role || 'principal',
          avatar_url: null,
        })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleAvatarUpload(e) {
    e.preventDefault()
    if (!avatarFile) return
    setStatus({ text: 'Uploading profile photo...', error: false })
    try {
      const formData = new FormData()
      formData.append('file', avatarFile)
      const res = await api.post('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus({ text: 'Profile photo updated successfully!', error: false })
      setProfile(res.data)
      if (onProfileUpdated) onProfileUpdated()
    } catch (err) {
      setStatus({ text: err.response?.data?.error || 'Upload failed', error: true })
    }
  }

  async function handlePresetAvatar(url) {
    setStatus({ text: 'Updating photo...', error: false })
    try {
      const res = await api.put('/profile', { avatarUrl: url })
      setStatus({ text: 'Profile photo updated!', error: false })
      setProfile(res.data)
      if (onProfileUpdated) onProfileUpdated()
    } catch (err) {
      setStatus({ text: err.response?.data?.error || 'Update failed', error: true })
    }
  }

  async function handleNameUpdate(e) {
    e.preventDefault()
    if (!fullName) return
    setStatus({ text: 'Saving name...', error: false })
    try {
      const res = await api.put('/profile', { fullName })
      setStatus({ text: 'Full name updated successfully!', error: false })
      setProfile(res.data)
      if (onProfileUpdated) onProfileUpdated()
    } catch (err) {
      setStatus({ text: err.response?.data?.error || 'Failed to update name', error: true })
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) return
    setStatus({ text: 'Updating password...', error: false })
    try {
      await api.put('/profile/password', { newPassword })
      setStatus({ text: 'Password updated successfully!', error: false })
      setNewPassword('')
    } catch (err) {
      setStatus({ text: err.response?.data?.error || 'Failed to update password', error: true })
    }
  }

  const currentEmail = profile?.email || user?.email || 'principal@dsatm.edu.in'
  const currentName = profile?.full_name || user?.fullName || fullName || 'Principal'
  const currentRole = profile?.role || user?.role || 'principal'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Profile Photo Panel */}
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, color: '#f8fafc', margin: '0 0 16px 0' }}>📷 Principal Profile Photo</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 84, height: 84, borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff', fontWeight: 800,
            boxShadow: '0 6px 16px rgba(245, 158, 11, 0.4)', border: '2px solid rgba(255,255,255,0.2)'
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentName[0]?.toUpperCase() || '👑'
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 18, color: '#f8fafc' }}>{currentName}</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#94a3b8' }}>{currentEmail} · {currentRole.toUpperCase()}</p>
            
            <form onSubmit={handleAvatarUpload} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files[0])}
                style={{ padding: '8px 12px', fontSize: 12, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#f8fafc' }}
              />
              <button className="pd-btn" type="submit" disabled={!avatarFile}>
                Upload Photo
              </button>
            </form>
          </div>
        </div>

        <div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 600 }}>OR CHOOSE A PRESET EXECUTIVE AVATAR:</p>
          <div style={{ display: 'flex', gap: 14 }}>
            {presetAvatars.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Preset ${idx}`}
                onClick={() => handlePresetAvatar(url)}
                style={{
                  width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', objectFit: 'cover',
                  border: profile?.avatar_url === url ? '3px solid #38bdf8' : '2px solid rgba(255,255,255,0.1)',
                  transition: 'transform 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Account Info Panel */}
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, color: '#f8fafc', margin: '0 0 16px 0' }}>👤 Account & Institution Details</h2>
        <form onSubmit={handleNameUpdate}>
          <div className="pd-form-row" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.18)', color: '#f8fafc' }}
              />
            </div>
            <button className="pd-btn" type="submit" style={{ marginTop: 20 }}>Save Name</button>
          </div>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div><strong style={{ color: '#cbd5e1' }}>Email:</strong> {currentEmail}</div>
          <div><strong style={{ color: '#cbd5e1' }}>Role:</strong> {currentRole}</div>
          <div><strong style={{ color: '#cbd5e1' }}>Institution:</strong> DSATM (Dayananda Sagar Academy of Technology & Management)</div>
        </div>
      </div>

      {/* Security Panel */}
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, color: '#f8fafc', margin: '0 0 16px 0' }}>🔒 Security & Password</h2>
        <form onSubmit={handlePasswordChange}>
          <div className="pd-form-row" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.18)', color: '#f8fafc' }}
              />
            </div>
            <button className="pd-btn" type="submit" style={{ marginTop: 20 }}>Update Password</button>
          </div>
        </form>
      </div>

      {status.text && <p className={`pd-status ${status.error ? 'error' : ''}`}>{status.text}</p>}
    </div>
  )
}