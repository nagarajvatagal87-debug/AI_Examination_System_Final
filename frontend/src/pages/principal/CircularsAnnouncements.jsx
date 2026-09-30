import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function CircularsAnnouncements({ departments }) {
  const [circulars, setCirculars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Academic Circular')
  const [targetAudience, setTargetAudience] = useState('all_staff')
  const [departmentId, setDepartmentId] = useState('')
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [statusMsg, setStatusMsg] = useState({ text: '', error: false })

  function loadCirculars() {
    setLoading(true)
    setError('')
    api.get('/principal/circulars')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCirculars(res.data)
        } else {
          setCirculars([])
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load circulars.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCirculars()
  }, [])

  async function handleCreateCircular(e) {
    e.preventDefault()
    setStatusMsg({ text: 'Publishing circular & dispatching notifications...', error: false })
    try {
      await api.post('/principal/circulars', {
        title,
        category,
        target_audience: targetAudience,
        department_id: departmentId || undefined,
        description,
        expiry_date: expiryDate || undefined,
        status: 'PUBLISHED'
      })
      setStatusMsg({ text: '✅ Circular published & broadcast notification sent to target audience!', error: false })
      setTitle('')
      setDescription('')
      setExpiryDate('')
      loadCirculars()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Failed to publish circular', error: true })
    }
  }

  async function handleDeleteCircular(id) {
    if (!window.confirm('Delete this circular?')) return
    try {
      await api.delete(`/principal/circulars/${id}`)
      loadCirculars()
    } catch (err) {
      alert('Failed to delete circular')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>📢 Institutional Circulars & Announcements</h2>
        <p className="hint" style={{ fontSize: 13, color: '#475569', margin: '0 0 20px 0', fontWeight: 600 }}>
          Create and publish official institutional circulars. Published circulars trigger real backend notification alerts to student, faculty, HOD, or examination dashboards.
        </p>

        {statusMsg.text && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: statusMsg.error ? '#fef2f2' : '#ecfdf5', color: statusMsg.error ? '#b91c1c' : '#047857', border: statusMsg.error ? '1.5px solid #dc2626' : '1.5px solid #059669', fontWeight: 800 }}>
            {statusMsg.text}
          </div>
        )}

        {/* Publish Circular Form */}
        <form onSubmit={handleCreateCircular} style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1.5px solid #334155', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#0f172a', fontWeight: 800 }}>📝 Publish New Institutional Circular</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <input
              type="text"
              placeholder="Circular Title (e.g. Mandatory Attendance Cutoff Notice for Main Exams)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="Academic Circular">Academic Circular</option>
              <option value="Examination Notification">Examination Notification</option>
              <option value="Administrative Order">Administrative Order</option>
              <option value="Holiday & Event">Holiday & Event</option>
              <option value="General Announcement">General Announcement</option>
            </select>
            <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="all_students">All Students</option>
              <option value="all_faculty">All Faculty</option>
              <option value="all_hods">All HODs</option>
              <option value="examdept">Examination Department</option>
              <option value="all_staff">All Academic Staff</option>
              <option value="specific_dept">Specific Department</option>
            </select>
          </div>

          {targetAudience === 'specific_dept' && (
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required style={{ width: 300, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="">Select Target Department</option>
              {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          <textarea
            rows={4}
            placeholder="Type complete description of the circular..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ fontFamily: 'inherit', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
          />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Expiry Date (Optional):</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}
            />
          </div>

          <button type="submit" className="pd-btn" style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', fontWeight: 800 }}>
            Publish & Notify Recipients →
          </button>
        </form>

        {/* Database-backed Circulars List */}
        {loading ? (
          <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading circulars...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
            <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
            <button onClick={loadCirculars} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
          </div>
        ) : circulars.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📢</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: 16, fontWeight: 800 }}>No Circulars Published Yet</h4>
            <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
              No active circulars found in the database. Use the form above to publish official administrative announcements.
            </p>
          </div>
        ) : (
          <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 12 }}>PUBLISH DATE</th>
                <th style={{ padding: 12 }}>CIRCULAR TITLE</th>
                <th style={{ padding: 12 }}>CATEGORY</th>
                <th style={{ padding: 12 }}>TARGET AUDIENCE</th>
                <th style={{ padding: 12 }}>STATUS</th>
                <th style={{ padding: 12 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {circulars.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 12, fontWeight: 800, color: '#1d4ed8' }}>
                    {c.publish_date || new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginTop: 2 }}>{c.description?.slice(0, 80)}...</div>
                  </td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#5b21b6' }}>{c.category}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#047857', textTransform: 'capitalize' }}>
                    {c.target_audience?.replace('_', ' ')}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span className="badge-status published">{c.status}</span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <button onClick={() => handleDeleteCircular(c.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #dc2626', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
