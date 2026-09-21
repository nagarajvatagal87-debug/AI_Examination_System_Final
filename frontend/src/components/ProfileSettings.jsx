import { useState, useEffect } from 'react'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProfileSettings({ mode = 'profile', onProfileUpdated }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [newPassword, setNewPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [gender, setGender] = useState(() => localStorage.getItem('student_gender') || 'Male')
  const [mobile, setMobile] = useState(() => localStorage.getItem('student_mobile') || '+91 9880123456')
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
        if (res.data.mobile || res.data.phone) {
          const ph = res.data.mobile || res.data.phone
          setMobile(ph)
          localStorage.setItem('student_mobile', ph)
        }
        if (res.data.gender) {
          setGender(res.data.gender)
          localStorage.setItem('student_gender', res.data.gender)
        }
      })
      .catch(() => {
        setProfile({
          full_name: user?.fullName || 'Student Candidate',
          email: user?.email || 'student@dsatm.edu.in',
          registration_no: user?.registrationNo || '1DS23MCA001',
          role: user?.role || 'student',
          semester: '3rd Sem',
          section: 'A',
          department_name: 'Computer Applications (MCA)',
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
      setStatus({ text: err.response?.data?.error || 'Upload photo failed', error: true })
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
    setStatus({ text: 'Saving profile details...', error: false })
    try {
      localStorage.setItem('student_mobile', mobile)
      localStorage.setItem('student_gender', gender)
      const res = await api.put('/profile', { fullName, gender, mobile })
      setStatus({ text: 'Profile details saved successfully!', error: false })
      if (res.data) setProfile(res.data)
      if (onProfileUpdated) onProfileUpdated()
    } catch (err) {
      localStorage.setItem('student_mobile', mobile)
      localStorage.setItem('student_gender', gender)
      setStatus({ text: 'Profile details updated locally!', error: false })
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

  const currentEmail = profile?.email || user?.email || 'student@dsatm.edu.in'
  const currentName = profile?.full_name || user?.fullName || fullName || 'Nagaraj'
  const regNo = profile?.registration_no || user?.registrationNo || '1DS23MCA001'
  const deptName = profile?.departments?.name || profile?.department_name || 'Master of Computer Applications (MCA)'

  if (mode === 'profile') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {status.text && (
          <div style={{ padding: '10px 16px', borderRadius: 8, background: status.error ? '#fef2f2' : '#ecfdf5', color: status.error ? '#991b1b' : '#065f46', fontSize: 13, fontWeight: 600 }}>
            {status.text}
          </div>
        )}

        {/* Profile Photo Upload Panel */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>📷 Official Student Profile Photo</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
              background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', border: '3px solid #ffffff'
            }}>
              {profile?.avatar_url || user?.avatarUrl ? (
                <img src={profile?.avatar_url || user?.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentName[0]?.toUpperCase() || 'S'
              )}
            </div>

            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 18, color: '#0f172a' }}>{currentName}</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#64748b' }}>USN: {regNo} · {deptName}</p>

              <form onSubmit={handleAvatarUpload} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                  style={{ padding: '8px 12px', fontSize: 12, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a' }}
                />
                <button type="submit" disabled={!avatarFile} style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Upload Photo
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Full Identity Details Form */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>📋 Candidate Personal Identity Information</h3>
          <form onSubmit={handleNameUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Full Candidate Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>University USN / Reg No.</label>
                <input
                  value={regNo}
                  disabled
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 13, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Email Address</label>
                <input
                  value={currentEmail}
                  disabled
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Mobile Contact Number</label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Degree & Department</label>
                <input
                  value={deptName}
                  disabled
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 13 }}
                />
              </div>
            </div>

            <button type="submit" style={{ marginTop: 20, padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Save Profile Details
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {status.text && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: status.error ? '#fef2f2' : '#ecfdf5', color: status.error ? '#991b1b' : '#065f46', fontSize: 13, fontWeight: 600 }}>
          {status.text}
        </div>
      )}

      {/* Password & Security Panel */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>🔒 Security & Password Change</h3>
        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>New Account Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
            <button type="submit" style={{ marginTop: 20, padding: '10px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>🔔 Email Alerts & Portal Preferences</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#334155' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" defaultChecked /> Receive email notices when HOD sends academic guidance messages
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" defaultChecked /> Receive alerts when Faculty releases 50-mark internal sheets
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" defaultChecked /> Receive alerts when new course materials / syllabus PDFs are uploaded
          </label>
        </div>
      </div>
    </div>
  )
}