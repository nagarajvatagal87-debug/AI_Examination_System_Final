import { useState } from 'react'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodPublicInfo() {
  const [form, setForm] = useState({
    about: '', studentCount: '', courses: '', fees: '', placementPercentage: '',
    highestPackage: '', averagePackage: '', achievements: '', facilities: '', published: false,
  })
  const [msg, setMsg] = useState('')

  function update(field, value) {
    setForm({ ...form, [field]: value })
  }

  async function handleSave() {
    try {
      await api.put('/hod/public-info', form)
      setMsg('Public info saved.')
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed')
    }
  }

  return (
    <div>
      <h2 className="hc-title">Public Department Info</h2>
      <div className="hc-section" style={{ maxWidth: 560 }}>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>
          Only published data here is shown on the public college info page — no student marks or private data ever appear publicly.
        </p>
        {['about', 'studentCount', 'courses', 'fees', 'placementPercentage', 'highestPackage', 'averagePackage', 'achievements', 'facilities'].map((field) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'capitalize' }}>{field}</label>
            <input className="hc-input" style={{ width: '100%' }} value={form[field]} onChange={(e) => update(field, e.target.value)} />
          </div>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
          <input type="checkbox" checked={form.published} onChange={(e) => update('published', e.target.checked)} />
          Publish this info publicly
        </label>
        <button className="hc-btn" onClick={handleSave}>Save</button>
        {msg && <p className="hc-status">{msg}</p>}
      </div>
    </div>
  )
}