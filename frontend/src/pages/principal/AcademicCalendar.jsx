import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function AcademicCalendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('Academic Event')
  const [startDatetime, setStartDatetime] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [statusMsg, setStatusMsg] = useState({ text: '', error: false })

  function loadEvents() {
    setLoading(true)
    setError('')
    api.get('/principal/academic-calendar')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setEvents(res.data)
        } else {
          setEvents([])
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load academic calendar events.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadEvents()
  }, [])

  async function handleAddEvent(e) {
    e.preventDefault()
    setStatusMsg({ text: 'Publishing calendar entry...', error: false })
    try {
      await api.post('/principal/academic-calendar', {
        title,
        event_type: eventType,
        start_datetime: startDatetime,
        description,
        visibility
      })
      setStatusMsg({ text: '✅ Academic Calendar entry published successfully! Visible to students & faculty.', error: false })
      setTitle('')
      setDescription('')
      setStartDatetime('')
      loadEvents()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Failed to add calendar entry', error: true })
    }
  }

  async function handleDeleteEvent(id) {
    if (!window.confirm('Delete this academic calendar event?')) return
    try {
      await api.delete(`/principal/academic-calendar/${id}`)
      loadEvents()
    } catch (err) {
      alert('Failed to delete event')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>📅 Academic Calendar Oversight</h2>
        <p className="hint" style={{ fontSize: 13, color: '#475569', margin: '0 0 20px 0', fontWeight: 600 }}>
          Manage institution-wide academic schedules, semester start/end dates, examination schedules, result publication dates, and holidays.
        </p>

        {statusMsg.text && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: statusMsg.error ? '#fef2f2' : '#ecfdf5', color: statusMsg.error ? '#b91c1c' : '#047857', border: statusMsg.error ? '1.5px solid #dc2626' : '1.5px solid #059669', fontWeight: 800 }}>
            {statusMsg.text}
          </div>
        )}

        {/* Publish Entry Form */}
        <form onSubmit={handleAddEvent} style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1.5px solid #334155', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#0f172a', fontWeight: 800 }}>➕ Publish New Calendar Entry</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <input
              type="text"
              placeholder="Event Title (e.g. Commencement of Even Semester 2026)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
            />
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="Semester Start">Semester Start</option>
              <option value="Semester End">Semester End</option>
              <option value="Internal Examination">Internal Examination</option>
              <option value="Main Examination">Main Examination</option>
              <option value="Result Publication">Result Publication</option>
              <option value="Holiday">Holiday</option>
              <option value="Academic Event">Academic Event</option>
            </select>
            <input
              type="date"
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
              required
              style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Description / Remarks (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ flex: 1, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
            />
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} style={{ width: 200, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="all">Visible to Everyone</option>
              <option value="institution">Institution Only</option>
            </select>
          </div>

          <button type="submit" className="pd-btn" style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', fontWeight: 800 }}>
            Publish Calendar Event →
          </button>
        </form>

        {/* Database-backed Calendar Table */}
        {loading ? (
          <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading academic calendar events...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
            <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
            <button onClick={loadEvents} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: 16, fontWeight: 800 }}>No Academic Calendar Events Available</h4>
            <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
              No academic schedule entries found in the database. Use the form above to publish official institutional calendar dates.
            </p>
          </div>
        ) : (
          <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 12 }}>DATE</th>
                <th style={{ padding: 12 }}>EVENT TITLE</th>
                <th style={{ padding: 12 }}>CATEGORY</th>
                <th style={{ padding: 12 }}>DESCRIPTION</th>
                <th style={{ padding: 12 }}>VISIBILITY</th>
                <th style={{ padding: 12 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ padding: 12, fontWeight: 800, color: '#1d4ed8' }}>
                    {ev.start_datetime ? new Date(ev.start_datetime).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : 'Scheduled'}
                  </td>
                  <td style={{ padding: 12, fontWeight: 800, color: '#0f172a' }}>{ev.title}</td>
                  <td style={{ padding: 12 }}>
                    <span className="badge-status scheduled">{ev.event_type || 'Academic Event'}</span>
                  </td>
                  <td style={{ padding: 12, color: '#475569', fontWeight: 500 }}>{ev.description || '—'}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#047857' }}>{ev.visibility === 'all' ? 'All Roles' : 'Institution'}</td>
                  <td style={{ padding: 12 }}>
                    <button onClick={() => handleDeleteEvent(ev.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #dc2626', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
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
