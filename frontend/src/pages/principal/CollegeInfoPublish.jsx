import React, { useState } from 'react'
import api from '../../api/client.js'

export default function CollegeInfoPublish() {
  const [section, setSection] = useState('overview')
  const [collegeName, setCollegeName] = useState('Dayananda Sagar College of Engineering')
  const [collegeDesc, setCollegeDesc] = useState('Empowering Education with AI for a Brighter Future.')
  const [feesDetails, setFeesDetails] = useState('MCA: ₹1,50,000/yr | BCA: ₹90,000/yr | MBA: ₹2,00,000/yr')
  const [achievements, setAchievements] = useState('Rank 1 in State University Rankings | 50+ AI Research Publications')
  const [publishStatus, setPublishStatus] = useState({ text: '', error: false })

  async function handlePublishInfo(e) {
    e.preventDefault()
    setPublishStatus({ text: 'Publishing approved info...', error: false })
    try {
      await api.put('/principal/college-info', {
        section,
        content: { name: collegeName, description: collegeDesc, fees: feesDetails, achievements }
      })
      setPublishStatus({ text: '✅ Approved College Information published successfully to Public Landing Page!', error: false })
    } catch (err) {
      setPublishStatus({ text: err.response?.data?.error || 'Failed to publish information', error: true })
    }
  }

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: 'var(--text-bright)' }}>📢 Publish Approved College Information</h2>
      <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: '0 0 20px 0' }}>
        Per PDF Specification Section 17: Public info is strictly restricted to department-wise fees & achievements.
      </p>

      {publishStatus.text && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: publishStatus.error ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)', color: publishStatus.error ? '#fca5a5' : '#34d399', border: '1px solid rgba(255,255,255,0.1)' }}>
          {publishStatus.text}
        </div>
      )}

      <form onSubmit={handlePublishInfo} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 650 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Institution Name:</label>
          <input
            type="text"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            style={{ width: '100%' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Tagline & Institutional Overview:</label>
          <textarea
            rows={3}
            value={collegeDesc}
            onChange={(e) => setCollegeDesc(e.target.value)}
            style={{ width: '100%', fontFamily: 'inherit' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Department-wise Fees Structure:</label>
          <input
            type="text"
            value={feesDetails}
            onChange={(e) => setFeesDetails(e.target.value)}
            style={{ width: '100%' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Approved Academic Achievements:</label>
          <input
            type="text"
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
            style={{ width: '100%' }}
            required
          />
        </div>

        <button type="submit" className="fd-btn" style={{ alignSelf: 'flex-start' }}>
          Publish to Public Page →
        </button>
      </form>
    </div>
  )
}
