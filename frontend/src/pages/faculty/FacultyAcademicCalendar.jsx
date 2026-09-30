import { useEffect, useState } from 'react'
import api from '../../api/client.js'

export default function FacultyAcademicCalendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/faculty/calendar')
      .then((res) => setEvents(res.data || []))
      .catch((err) => console.error('Faculty calendar error:', err))
      .finally(() => setLoading(false))
  }, [])

  function formatEventDate(dateVal) {
    if (!dateVal) return 'Date TBA'
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return 'Date TBA'
      return d.toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    } catch (e) {
      return 'Date TBA'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="section-card glass-card" style={{ padding: 24, background: '#ffffff', borderRadius: 16, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 20, fontWeight: 800 }}>📅 Department Academic Calendar</h2>
        <p style={{ color: '#475569', fontSize: 13, margin: '0 0 20px 0' }}>
          Official academic events, examination schedules, assignment deadlines, and holidays published by your Department HOD.
        </p>

        {loading ? (
          <p style={{ color: '#475569', fontWeight: 600 }}>Loading academic calendar events from database...</p>
        ) : !events || events.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', fontWeight: 600 }}>
            No academic calendar events available.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {events.map((ev, idx) => (
              <div key={ev.id || idx} style={{ background: '#f8fafc', borderRadius: 14, padding: 18, border: '1.5px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 11, fontWeight: 800 }}>
                    {ev.event_type || 'Academic Event'}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    {formatEventDate(ev.start_datetime)}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#0f172a', fontWeight: 800 }}>{ev.title || 'Academic Notice'}</h3>
                {ev.description && <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{ev.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
