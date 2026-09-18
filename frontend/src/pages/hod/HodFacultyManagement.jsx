import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodFacultyManagement() {
  const [faculty, setFaculty] = useState([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  function load() {
    api.get('/hod/faculty').then((res) => setFaculty(res.data)).catch(() => {})
  }

  async function handleAdd() {
    if (!fullName || !email) return setMsg('Name and email are required.')
    try {
      const { data } = await api.post('/hod/faculty', { fullName, email })
      setMsg(`Faculty created. Temporary password: ${data.tempPassword}`)
      setFullName(''); setEmail('')
      load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add faculty')
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove this faculty member?')) return
    try {
      await api.delete(`/hod/faculty/${id}`)
      load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to remove')
    }
  }

  return (
    <div>
      <h2 className="hc-title">Faculty Management</h2>

      <div className="hc-section">
        <h3>Add Faculty</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="hc-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="hc-input" placeholder="College email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="hc-btn" onClick={handleAdd}>Add Faculty</button>
        </div>
        {msg && <p className="hc-status">{msg}</p>}
      </div>

      <div className="hc-section">
        <h3>Current Faculty</h3>
        <table className="hc-table">
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f.id}>
                <td>{f.full_name}</td><td>{f.email}</td>
                <td>{new Date(f.created_at).toLocaleDateString()}</td>
                <td><button className="hc-btn hc-btn-danger" onClick={() => handleRemove(f.id)}>Remove</button></td>
              </tr>
            ))}
            {faculty.length === 0 && <tr><td colSpan={4} className="hint">No faculty yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}