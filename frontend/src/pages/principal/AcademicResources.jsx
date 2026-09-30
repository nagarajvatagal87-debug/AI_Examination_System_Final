import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function AcademicResources({ departments }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Model Question Paper')
  const [departmentId, setDepartmentId] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [description, setDescription] = useState('')
  const [statusMsg, setStatusMsg] = useState({ text: '', error: false })

  function loadResources() {
    setLoading(true)
    setError('')
    api.get('/principal/academic-resources')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setResources(res.data)
        } else {
          setResources([])
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load academic resources.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadResources()
  }, [])

  async function handleAddResource(e) {
    e.preventDefault()
    setStatusMsg({ text: 'Approving academic resource...', error: false })
    try {
      await api.post('/principal/academic-resources', {
        title,
        category,
        department_id: departmentId || undefined,
        subject_code: subjectCode || 'GEN101',
        description,
        status: 'APPROVED'
      })
      setStatusMsg({ text: '✅ Institution-level Academic Resource approved & added successfully!', error: false })
      setTitle('')
      setDescription('')
      setSubjectCode('')
      loadResources()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Failed to add resource', error: true })
    }
  }

  async function handleDeleteResource(id) {
    if (!window.confirm('Delete this resource?')) return
    try {
      await api.delete(`/principal/academic-resources/${id}`)
      loadResources()
    } catch (err) {
      alert('Failed to delete resource')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>📚 Institution Academic Resources</h2>
        <p className="hint" style={{ fontSize: 13, color: '#475569', margin: '0 0 20px 0', fontWeight: 600 }}>
          Institution-level academic document governance: Model question papers, previous VTU examination papers, approved course regulations, and curriculum guidelines.
        </p>

        {statusMsg.text && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: statusMsg.error ? '#fef2f2' : '#ecfdf5', color: statusMsg.error ? '#b91c1c' : '#047857', border: statusMsg.error ? '1.5px solid #dc2626' : '1.5px solid #059669', fontWeight: 800 }}>
            {statusMsg.text}
          </div>
        )}

        {/* Add Resource Form */}
        <form onSubmit={handleAddResource} style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1.5px solid #334155', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#0f172a', fontWeight: 800 }}>➕ Approve Institutional Resource</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
            <input
              type="text"
              placeholder="Resource Title (e.g. VTU Model Question Paper 2026)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="Model Question Paper">Model Question Paper</option>
              <option value="Previous Question Paper">Previous Question Paper</option>
              <option value="Academic Document">Academic Document</option>
              <option value="Approved Course Resource">Approved Course Resource</option>
              <option value="Circular Document">Circular Document</option>
            </select>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="">All Departments</option>
              {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input
              type="text"
              placeholder="Subject Code (e.g. 22MCA11)"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
            />
          </div>

          <textarea
            rows={2}
            placeholder="Brief Description / Regulation details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ fontFamily: 'inherit', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
          />

          <button type="submit" className="pd-btn" style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', fontWeight: 800 }}>
            Approve & Add Resource →
          </button>
        </form>

        {/* Database-backed Resources Table */}
        {loading ? (
          <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading academic resources...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
            <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
            <button onClick={loadResources} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
          </div>
        ) : resources.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: 16, fontWeight: 800 }}>No Academic Resources Approved Yet</h4>
            <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
              No institutional academic documents found in database. Use the form above to add approved resources.
            </p>
          </div>
        ) : (
          <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 12 }}>RESOURCE TITLE</th>
                <th style={{ padding: 12 }}>CATEGORY</th>
                <th style={{ padding: 12 }}>CODE</th>
                <th style={{ padding: 12 }}>DESCRIPTION</th>
                <th style={{ padding: 12 }}>STATUS</th>
                <th style={{ padding: 12 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 12, fontWeight: 800, color: '#0f172a' }}>{r.title}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#5b21b6' }}>{r.category}</td>
                  <td style={{ padding: 12, fontWeight: 800, color: '#1d4ed8' }}>{r.subject_code || 'GEN'}</td>
                  <td style={{ padding: 12, color: '#475569', fontWeight: 500 }}>{r.description || '—'}</td>
                  <td style={{ padding: 12 }}>
                    <span className="badge-status done">★ {r.status}</span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <button onClick={() => handleDeleteResource(r.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #dc2626', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
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
