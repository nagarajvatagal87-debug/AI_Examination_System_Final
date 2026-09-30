import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function CollegeInfoPublish() {
  const [loading, setLoading] = useState(true)
  const [collegeName, setCollegeName] = useState('')
  const [collegeDesc, setCollegeDesc] = useState('')
  const [feesDetails, setFeesDetails] = useState('')
  const [achievements, setAchievements] = useState('')
  const [status, setStatus] = useState('PUBLISHED')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [publishStatus, setPublishStatus] = useState({ text: '', error: false })

  function loadCollegeInfo() {
    setLoading(true)
    api.get('/principal/college-info')
      .then((res) => {
        const content = res.data?.overview
        if (content) {
          setCollegeName(content.name || '')
          setCollegeDesc(content.description || '')
          setFeesDetails(content.fees || '')
          setAchievements(content.achievements || '')
        }
        if (res.data?.status) setStatus(res.data.status)
        if (res.data?.updated_at) setUpdatedAt(res.data.updated_at)
      })
      .catch((err) => console.warn('College info load error:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCollegeInfo()
  }, [])

  async function handleSaveInfo(targetStatus) {
    setPublishStatus({ text: targetStatus === 'PUBLISHED' ? 'Publishing to public landing page...' : 'Saving draft...', error: false })
    try {
      await api.put('/principal/college-info', {
        section: 'overview',
        status: targetStatus,
        content: { name: collegeName, description: collegeDesc, fees: feesDetails, achievements }
      })
      setStatus(targetStatus)
      setPublishStatus({ text: `✅ College Information successfully saved as ${targetStatus}!`, error: false })
      loadCollegeInfo()
    } catch (err) {
      setPublishStatus({ text: err.response?.data?.error || 'Failed to update information', error: true })
    }
  }

  return (
    <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#0f172a', fontWeight: 800 }}>📢 Approved Public College Information Management</h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Restricted public disclosure management: Department-wise fees and approved academic achievements.
          </p>
        </div>

        <div style={{ background: status === 'PUBLISHED' ? '#ecfdf5' : '#fffbeb', color: status === 'PUBLISHED' ? '#047857' : '#b45309', border: '1.5px solid #1e293b', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
          Status: {status}
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#475569', padding: 20 }}>Loading published college info from database...</p>
      ) : (
        <>
          {publishStatus.text && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: publishStatus.error ? '#fef2f2' : '#ecfdf5', color: publishStatus.error ? '#b91c1c' : '#047857', border: publishStatus.error ? '1.5px solid #dc2626' : '1.5px solid #059669', fontWeight: 800 }}>
              {publishStatus.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveInfo('PUBLISHED') }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Institution Full Name:</label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Dayananda Sagar Academy of Technology and Management"
                  style={{ width: '100%', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Tagline & Approved Overview:</label>
                <textarea
                  rows={3}
                  value={collegeDesc}
                  onChange={(e) => setCollegeDesc(e.target.value)}
                  placeholder="e.g. Autonomous VTU Affiliated Premier Institution..."
                  style={{ width: '100%', fontFamily: 'inherit', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Approved Department-wise Fees Structure:</label>
                <input
                  type="text"
                  value={feesDetails}
                  onChange={(e) => setFeesDetails(e.target.value)}
                  placeholder="e.g. MCA: ₹1,58,500/yr | CSE: ₹2,25,000/yr | MBA: ₹2,00,000/yr"
                  style={{ width: '100%', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Approved Academic Achievements:</label>
                <textarea
                  rows={2}
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  placeholder="e.g. NAAC A+ Grade Accreditation | 100% VTU Pass Rate"
                  style={{ width: '100%', fontFamily: 'inherit', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => handleSaveInfo('DRAFT')} className="pd-btn" style={{ background: '#f1f5f9', color: '#0f172a', border: '1.5px solid #334155' }}>
                  💾 Save as Draft
                </button>
                <button type="submit" className="pd-btn" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', fontWeight: 800 }}>
                  🚀 Approve & Publish to Public Page →
                </button>
              </div>
            </form>

            {/* Live Public Preview Box */}
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 14, border: '1.5px solid #334155' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#0f172a', fontWeight: 800 }}>👁️ Live Public Page Preview</h4>
              <div style={{ background: '#ffffff', padding: 16, borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13 }}>
                <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 16, marginBottom: 4 }}>{collegeName || 'Dayananda Sagar Academy of Technology and Management'}</div>
                <p style={{ color: '#475569', fontSize: 12, margin: '0 0 12px 0', fontWeight: 500 }}>{collegeDesc || 'Empowering Education with AI for a Brighter Future.'}</p>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>💳 Approved Fees:</div>
                <div style={{ fontSize: 12, color: '#0f172a', background: '#eff6ff', padding: '6px 10px', borderRadius: 6, marginBottom: 12, fontWeight: 700 }}>{feesDetails || 'Department-wise fees as configured'}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#047857', marginBottom: 4 }}>🏆 Approved Achievements:</div>
                <div style={{ fontSize: 12, color: '#0f172a', background: '#ecfdf5', padding: '6px 10px', borderRadius: 6, fontWeight: 700 }}>{achievements || 'VTU Autonomous Excellence'}</div>
              </div>
              {updatedAt && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 12, textAlign: 'right', fontWeight: 600 }}>
                  Last Updated: {new Date(updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
