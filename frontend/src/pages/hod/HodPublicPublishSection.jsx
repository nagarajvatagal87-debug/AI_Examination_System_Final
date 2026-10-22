import React, { useEffect, useState, useRef } from 'react'
import api from '../../api/client.js'

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
]

export default function HodPublicPublishSection() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ text: '', isError: false })
  const [showUrlInput, setShowUrlInput] = useState(false)
  const fileInputRef = useRef(null)

  const [deptName, setDeptName] = useState('')
  const [about, setAbout] = useState('')
  const [studentCount, setStudentCount] = useState(120)
  const [placementPct, setPlacementPct] = useState(95)
  const [highestPkg, setHighestPkg] = useState(18)
  const [avgPkg, setAvgPkg] = useState(6.5)

  // Fees Structure State
  const [fees, setFees] = useState({
    tuition_fee: '1,25,000',
    lab_fee: '25,000',
    exam_fee: '8,500',
    quota: 'Govt. PGCET / KEA & Management Quota',
    notes: 'Scholarships available for eligible VTU & merit candidates.'
  })

  // Toppers State
  const [toppers, setToppers] = useState([])
  const [newTopper, setNewTopper] = useState({
    name: '',
    usn: '',
    cgpa: '9.50',
    class_sem: '4th Sem MCA',
    rank_title: '🏆 1st Rank - Department Topper',
    year: '2025',
    photo_url: PRESET_AVATARS[0]
  })

  // Achievements State
  const [achievementsText, setAchievementsText] = useState(
    '100% Placement Record in Top Tier MNCs\n1st Prize in VTU State Level Hackathon 2025\nPublished 15+ Scopus Indexed AI Research Papers'
  )

  const [published, setPublished] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await api.get('/hod/public-info')
        if (data) {
          setDeptName(data.department_name || 'MCA')
          setAbout(data.about || '')
          setStudentCount(data.student_count || 0)
          setPlacementPct(data.placement_percentage || 0)
          setHighestPkg(data.highest_package ? data.highest_package / 100000 : 0)
          setAvgPkg(data.average_package ? data.average_package / 100000 : 0)

          if (data.fees && typeof data.fees === 'object') {
            setFees({
              tuition_fee: data.fees.tuition_fee || '1,25,000',
              lab_fee: data.fees.lab_fee || '25,000',
              exam_fee: data.fees.exam_fee || '8,500',
              quota: data.fees.quota || 'Govt. PGCET & Management Quota',
              notes: data.fees.notes || 'Scholarships available for VTU & merit candidates.'
            })
          }

          if (Array.isArray(data.toppers) && data.toppers.length > 0) {
            setToppers(data.toppers)
          } else {
            setToppers([])
          }

          if (Array.isArray(data.achievements)) {
            setAchievementsText(data.achievements.join('\n'))
          }

          setPublished(data.published !== false)
        }
      } catch (err) {
        console.warn('Could not load public info:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG, WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // High-quality compact passport photo resize (max 280x280)
        const canvas = document.createElement('canvas')
        const maxDim = 280
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        setNewTopper((prev) => ({ ...prev, photo_url: compressedBase64 }))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  function handleAddTopper(e) {
    e.preventDefault()
    if (!newTopper.name || !newTopper.usn) {
      alert('Please provide student name and USN.')
      return
    }
    const item = {
      ...newTopper,
      id: 'top-' + Date.now()
    }
    setToppers([...toppers, item])
    setNewTopper({
      name: '',
      usn: '',
      cgpa: '9.50',
      class_sem: '4th Sem MCA',
      rank_title: '🏆 Department Topper',
      year: '2025',
      photo_url: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]
    })
  }

  function handleRemoveTopper(id) {
    setToppers(toppers.filter((t) => t.id !== id))
  }

  function handleClearAllToppers() {
    if (toppers.length === 0) return
    if (window.confirm('Are you sure you want to remove all toppers from this list? (Remember to click "Publish" to save changes)')) {
      setToppers([])
    }
  }

  async function handleDeleteDepartmentInfo() {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to permanently delete all published college info, fee structure, and toppers for ${deptName || 'your'} Department?\n\nThis will remove your department's disclosure from the live public website.`
    )
    if (!confirmDelete) return

    setDeleting(true)
    setStatusMsg({ text: 'Deleting department public disclosure...', isError: false })

    try {
      await api.delete('/hod/public-info')
      setToppers([])
      setAbout('')
      setAchievementsText('')
      setFees({
        tuition_fee: '',
        lab_fee: '',
        exam_fee: '',
        quota: '',
        notes: ''
      })
      setPublished(false)
      setStatusMsg({
        text: `🗑️ Old public college info, fees, and toppers for ${deptName} Department have been deleted successfully.`,
        isError: false
      })
    } catch (err) {
      setStatusMsg({
        text: err.response?.data?.error || 'Failed to delete department information.',
        isError: true
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleSavePublicInfo(e) {
    e.preventDefault()
    setSaving(true)
    setStatusMsg({ text: 'Publishing department details to public page...', isError: false })

    try {
      const achievementsList = achievementsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      // Calculate total fee
      const tuitionNum = parseInt(fees.tuition_fee.replace(/[^0-9]/g, '') || '0')
      const labNum = parseInt(fees.lab_fee.replace(/[^0-9]/g, '') || '0')
      const examNum = parseInt(fees.exam_fee.replace(/[^0-9]/g, '') || '0')
      const totalNum = tuitionNum + labNum + examNum

      const feesObj = {
        ...fees,
        total_fee: totalNum > 0 ? totalNum.toLocaleString('en-IN') : '1,58,500',
        toppers: toppers
      }

      await api.put('/hod/public-info', {
        about,
        studentCount: parseInt(studentCount),
        courses: [`${deptName} Program`],
        fees: feesObj,
        toppers: toppers,
        placementPercentage: parseFloat(placementPct),
        highestPackage: parseFloat(highestPkg) * 100000,
        averagePackage: parseFloat(avgPkg) * 100000,
        achievements: achievementsList,
        published: published
      })

      setStatusMsg({
        text: '✅ Department Fee Structure & Toppers published live to Public Landing Page!',
        isError: false
      })
    } catch (err) {
      setStatusMsg({
        text: err.response?.data?.error || 'Failed to publish department information.',
        isError: true
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: '#3b82f6', fontWeight: 800 }}>Loading Department Public Profile...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div style={{ background: '#ffffff', border: '2px solid #0f172a', borderRadius: 16, padding: '22px 28px', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#1d4ed8', letterSpacing: 1, textTransform: 'uppercase' }}>OFFICIAL PUBLIC DISCLOSURE CONTROL</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '4px 0 2px' }}>📢 {deptName} Department Public Info & Toppers</h2>
            <p style={{ fontSize: 13, color: '#475569', fontWeight: 600, margin: 0 }}>Publish department fee structure, student rank holders with photos, and achievements live on the main landing page.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: published ? '#f0fdf4' : '#fef2f2', border: published ? '2px solid #16a34a' : '2px solid #dc2626', padding: '8px 16px', borderRadius: 12 }}>
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: published ? '#15803d' : '#b91c1c' }}>{published ? '✓ Live Published' : '🔒 Draft Mode'}</span>
            </label>

            <button
              type="button"
              onClick={handleDeleteDepartmentInfo}
              disabled={deleting}
              style={{ background: '#fef2f2', border: '2px solid #dc2626', color: '#b91c1c', padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
            >
              {deleting ? '⏳ Deleting...' : '🗑️ Delete Department Info'}
            </button>
          </div>
        </div>
      </div>

      {statusMsg.text && (
        <div style={{ padding: '12px 18px', borderRadius: 12, background: statusMsg.isError ? '#fef2f2' : '#ecfdf5', color: statusMsg.isError ? '#b91c1c' : '#047857', border: statusMsg.isError ? '2px solid #dc2626' : '2px solid #059669', fontWeight: 800, fontSize: 14 }}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSavePublicInfo} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Section 1: Department Fee Structure */}
        <div style={{ background: '#ffffff', border: '2px solid #0f172a', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
            <span style={{ fontSize: 24 }}>💳</span>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Department-wise Fees Structure</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 600 }}>Specify tuition, lab quotas, and total annual fee for your branch.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Tuition Fee (₹ / Year):</label>
              <input type="text" value={fees.tuition_fee} onChange={(e) => setFees({ ...fees, tuition_fee: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Lab & Development Fee (₹ / Year):</label>
              <input type="text" value={fees.lab_fee} onChange={(e) => setFees({ ...fees, lab_fee: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>University / Exam Fee (₹ / Year):</label>
              <input type="text" value={fees.exam_fee} onChange={(e) => setFees({ ...fees, exam_fee: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Quota Details:</label>
              <input type="text" value={fees.quota} onChange={(e) => setFees({ ...fees, quota: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Scholarships & Fee Notes:</label>
              <input type="text" value={fees.notes} onChange={(e) => setFees({ ...fees, notes: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} />
            </div>
          </div>
        </div>

        {/* Section 2: Department Toppers & Rank Holders (Direct Photo Upload) */}
        <div style={{ background: '#ffffff', border: '2px solid #0f172a', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18, borderBottom: '2px solid #e2e8f0', paddingBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Department Toppers & VTU Rank Holders</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 600 }}>Upload student passport size photos directly, CGPA, semester, and rank titles.</p>
              </div>
            </div>

            {toppers.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllToppers}
                style={{ background: '#fef2f2', border: '1.5px solid #fecdd3', color: '#be123c', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                🗑️ Clear All Toppers ({toppers.length})
              </button>
            )}
          </div>

          {/* Form to Add New Topper */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #334155', borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>➕ Add New Department Rank Holder / Topper:</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>Student Full Name:</label>
                <input type="text" placeholder="e.g. Ananya Sharma" value={newTopper.name} onChange={(e) => setNewTopper({ ...newTopper, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 13 }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>USN Registration No:</label>
                <input type="text" placeholder="e.g. 1DT22MC045" value={newTopper.usn} onChange={(e) => setNewTopper({ ...newTopper, usn: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 13 }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>CGPA:</label>
                <input type="text" placeholder="e.g. 9.84" value={newTopper.cgpa} onChange={(e) => setNewTopper({ ...newTopper, cgpa: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 13 }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>Class / Semester:</label>
                <input type="text" placeholder="e.g. 4th Sem MCA" value={newTopper.class_sem} onChange={(e) => setNewTopper({ ...newTopper, class_sem: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>Rank Title / Accolade:</label>
                <input type="text" placeholder="e.g. 🏆 1st Rank - VTU Gold Medalist" value={newTopper.rank_title} onChange={(e) => setNewTopper({ ...newTopper, rank_title: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 13 }} />
              </div>

              {/* Direct Photo Upload Control */}
              <div style={{ background: '#ffffff', border: '1.5px dashed #2563eb', borderRadius: 10, padding: '12px 16px' }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', display: 'block', marginBottom: 8 }}>
                  📷 Direct Student Photo Upload:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <img
                    src={newTopper.photo_url || PRESET_AVATARS[0]}
                    alt="Preview"
                    onError={(e) => { e.target.onerror = null; e.target.src = PRESET_AVATARS[0] }}
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}
                  >
                    📁 Upload Student Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '7px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {showUrlInput ? 'Hide URL Box' : '🔗 URL / Preset'}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional URL or Preset Avatars Toggle */}
            {showUrlInput && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Or Enter Image URL:
                  </label>
                  <input
                    type="text"
                    value={newTopper.photo_url}
                    placeholder="https://..."
                    onChange={(e) => setNewTopper({ ...newTopper, photo_url: e.target.value })}
                    style={{ width: '100%', padding: '7px 12px', borderRadius: 6, border: '1.5px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Or Select Preset Avatar:
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PRESET_AVATARS.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Preset Avatar"
                        onClick={() => setNewTopper({ ...newTopper, photo_url: url })}
                        style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: newTopper.photo_url === url ? '3px solid #2563eb' : '2px solid #cbd5e1' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button type="button" onClick={handleAddTopper} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ➕ Add Topper to List
            </button>
          </div>

          {/* Published Toppers Display Grid */}
          {toppers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 12, color: '#64748b', fontSize: 13, fontWeight: 600 }}>
              No toppers added yet. Fill the form above and click "➕ Add Topper to List".
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {toppers.map((t) => (
                <div key={t.id} style={{ background: '#f8fafc', border: '2px solid #0f172a', borderRadius: 14, padding: 16, display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
                  <img
                    src={t.photo_url || PRESET_AVATARS[0]}
                    alt={t.name}
                    onError={(e) => { e.target.onerror = null; e.target.src = PRESET_AVATARS[0] }}
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #1d4ed8', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8' }}>USN: {t.usn} • {t.class_sem}</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#059669', marginTop: 2 }}>CGPA: {t.cgpa}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: '#b45309', marginTop: 2 }}>{t.rank_title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopper(t.id)}
                    title="Remove this topper"
                    style={{ position: 'absolute', top: 10, right: 10, background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '50%', width: 24, height: 24, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Overview & Achievements */}
        <div style={{ background: '#ffffff', border: '2px solid #0f172a', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🌟</span>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Department Overview & Key Achievements</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 600 }}>Highlight research grants, placement percentage, and department honors.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Placement Record (%):</label>
              <input type="number" value={placementPct} onChange={(e) => setPlacementPct(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Highest Package (LPA ₹):</label>
              <input type="number" step="0.5" value={highestPkg} onChange={(e) => setHighestPkg(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Average Package (LPA ₹):</label>
              <input type="number" step="0.5" value={avgPkg} onChange={(e) => setAvgPkg(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Total Students Count:</label>
              <input type="number" value={studentCount} onChange={(e) => setStudentCount(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontWeight: 700 }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>About Department Description:</label>
            <textarea rows={3} value={about} onChange={(e) => setAbout(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontFamily: 'inherit', fontSize: 13 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Department Achievements List (One per line):</label>
            <textarea rows={4} value={achievementsText} onChange={(e) => setAchievementsText(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #334155', fontFamily: 'inherit', fontSize: 13 }} />
          </div>
        </div>

        {/* Submit & Delete Action Row */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={saving || deleting}
            style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', color: '#fff', border: '2px solid #0f172a', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,78,216,0.3)' }}
          >
            {saving ? '⏳ Publishing to Public Page...' : '🚀 Publish Department Info Live to Public Portal →'}
          </button>

          <button
            type="button"
            onClick={handleDeleteDepartmentInfo}
            disabled={saving || deleting}
            style={{ padding: '14px 22px', background: '#ffffff', color: '#dc2626', border: '2px solid #dc2626', borderRadius: 12, fontWeight: 800, fontSize: 14.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {deleting ? '⏳ Deleting...' : '🗑️ Delete Old Department Info'}
          </button>
        </div>
      </form>
    </div>
  )
}
