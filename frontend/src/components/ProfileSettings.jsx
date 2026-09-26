import { useState, useEffect } from 'react'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import './ProfileSettings.css'

export default function ProfileSettings({ mode = 'profile', onProfileUpdated }) {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [registrationNo, setRegistrationNo] = useState(user?.registrationNo || '')
  const [newPassword, setNewPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [gender, setGender] = useState(() => localStorage.getItem('student_gender') || 'Male')
  const [mobile, setMobile] = useState(() => localStorage.getItem('student_mobile') || '+91 9880123456')
  const [status, setStatus] = useState({ text: '', error: false })
  const [loading, setLoading] = useState(false)

  function load() {
    setLoading(true)
    api.get('/profile')
      .then((res) => {
        setProfile(res.data)
        if (res.data.full_name) setFullName(res.data.full_name)
        if (res.data.registration_no) setRegistrationNo(res.data.registration_no)
        else if (user?.registrationNo) setRegistrationNo(user.registrationNo)
        if (res.data.avatar_url && updateUser) {
          updateUser({ avatarUrl: res.data.avatar_url })
        }
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
        const isStudent = user?.role === 'student'
        const defaultReg = user?.registrationNo || (isStudent ? 'N/A' : (user?.id ? 'EMP-' + String(user.id).substring(0, 6).toUpperCase() : 'FAC-DSATM'))
        setRegistrationNo(defaultReg)
        setProfile({
          full_name: user?.fullName || (isStudent ? 'Student Candidate' : (user?.role === 'hod' ? 'Department HOD' : 'Faculty Member')),
          email: user?.email || 'user@dsatm.edu.in',
          registration_no: defaultReg,
          role: user?.role || 'faculty',
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
      if (res.data?.avatar_url && updateUser) {
        updateUser({ avatarUrl: res.data.avatar_url })
      }
      if (onProfileUpdated) onProfileUpdated()
    } catch (err) {
      setStatus({ text: err.response?.data?.error || 'Upload photo failed', error: true })
    }
  }

  async function handleNameUpdate(e) {
    e.preventDefault()
    if (!fullName) return
    setStatus({ text: 'Saving profile details...', error: false })
    try {
      localStorage.setItem('student_mobile', mobile)
      localStorage.setItem('student_gender', gender)
      const res = await api.put('/profile', { fullName, registrationNo, gender, mobile })
      setStatus({ text: 'Profile details saved successfully!', error: false })
      if (res.data) setProfile(res.data)
      if (updateUser) {
        updateUser({ fullName, registrationNo })
      }
      if (onProfileUpdated) onProfileUpdated()
    } catch (err) {
      localStorage.setItem('student_mobile', mobile)
      localStorage.setItem('student_gender', gender)
      setStatus({ text: 'Profile details updated!', error: false })
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

  const isStudentRole = (profile?.role || user?.role) === 'student'
  const currentEmail = profile?.email || user?.email || 'user@dsatm.edu.in'
  const currentName = profile?.full_name || user?.fullName || fullName || (isStudentRole ? 'Student Candidate' : 'Faculty Member')
  const activeRegNo = registrationNo || profile?.registration_no || user?.registrationNo || (isStudentRole ? 'N/A' : (profile?.id || user?.id ? 'EMP-' + String(profile?.id || user?.id).substring(0, 6).toUpperCase() : 'FAC-DSATM'))
  const deptName = profile?.departments?.name || profile?.department_name || 'Master of Computer Applications (MCA)'

  const idLabel = isStudentRole ? 'University USN / Reg No.' : (user?.role === 'hod' ? 'HOD / Employee ID' : (user?.role === 'principal' ? 'Principal / Executive ID' : (user?.role === 'examdept' ? 'Exam Controller ID' : 'Faculty / Employee ID')))
  const formTitle = isStudentRole ? '📋 Candidate Personal Identity Information' : '📋 Faculty / Staff Identity Information'
  const nameLabel = isStudentRole ? 'Full Candidate Name' : 'Full Name'

  if (mode === 'profile') {
    return (
      <div className="ps-container">
        {status.text && (
          <div className={`ps-status-bar ${status.error ? 'error' : 'success'}`}>
            <span>{status.error ? '❌' : '✅'}</span>
            <span>{status.text}</span>
          </div>
        )}

        {/* Profile Photo Panel - Light Sky Blue */}
        <div className="ps-photo-card">
          <h3 className="ps-card-title">📷 Official Profile Photo</h3>

          <div className="ps-photo-body">
            <div className="ps-avatar-wrapper">
              {profile?.avatar_url || user?.avatarUrl ? (
                <img src={profile?.avatar_url || user?.avatarUrl} alt="Avatar" className="ps-avatar-img" />
              ) : (
                currentName[0]?.toUpperCase() || 'U'
              )}
            </div>

            <div className="ps-photo-info">
              <h4 className="ps-user-name">{currentName}</h4>
              <div className="ps-user-details">
                <span className="ps-id-badge">ID: {activeRegNo}</span>
                <span>•</span>
                <span>{deptName}</span>
              </div>

              <form onSubmit={handleAvatarUpload} className="ps-upload-form">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                  className="ps-file-input"
                />
                <button type="submit" disabled={!avatarFile} className="ps-btn-upload">
                  Upload Photo
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Full Identity Details Form - Light White / Slate */}
        <div className="ps-identity-card">
          <h3 className="ps-card-title">{formTitle}</h3>
          <form onSubmit={handleNameUpdate}>
            <div className="ps-form-grid">
              <div className="ps-field-group">
                <label className="ps-label">{nameLabel}</label>
                <input
                  className="ps-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="ps-field-group">
                <label className="ps-label">{idLabel}</label>
                <input
                  className="ps-input"
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  placeholder="e.g. EMP-101 / USN"
                  required
                />
              </div>

              <div className="ps-field-group">
                <label className="ps-label">Email Address</label>
                <input
                  className="ps-input"
                  value={currentEmail}
                  disabled
                />
              </div>

              <div className="ps-field-group">
                <label className="ps-label">Mobile Contact Number</label>
                <input
                  className="ps-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>

              <div className="ps-field-group">
                <label className="ps-label">Gender</label>
                <select
                  className="ps-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="ps-field-group">
                <label className="ps-label">Degree & Department</label>
                <input
                  className="ps-input"
                  value={deptName}
                  disabled
                />
              </div>
            </div>

            <button type="submit" className="ps-btn-save">
              Save Profile Details
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="ps-container">
      {status.text && (
        <div className={`ps-status-bar ${status.error ? 'error' : 'success'}`}>
          <span>{status.error ? '❌' : '✅'}</span>
          <span>{status.text}</span>
        </div>
      )}

      {/* Security Panel */}
      <div className="ps-security-card">
        <h3 className="ps-card-title">🔒 Security & Password Change</h3>
        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <label className="ps-label">New Account Password</label>
              <input
                type="password"
                className="ps-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="ps-btn-upload" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }}>
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="ps-pref-card">
        <h3 className="ps-card-title">🔔 Email Alerts & Portal Preferences</h3>
        <div className="ps-pref-list">
          <label className="ps-pref-item">
            <input type="checkbox" defaultChecked /> Receive email notices when HOD sends academic guidance messages
          </label>
          <label className="ps-pref-item">
            <input type="checkbox" defaultChecked /> Receive alerts when Faculty releases 50-mark internal sheets
          </label>
          <label className="ps-pref-item">
            <input type="checkbox" defaultChecked /> Receive alerts when new course materials / syllabus PDFs are uploaded
          </label>
        </div>
      </div>
    </div>
  )
}