import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodDashboardHome() {
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    api.get('/hod/overview').then((res) => setOverview(res.data)).catch(() => {})
  }, [])

  if (!overview) return <p className="hint">Loading...</p>
  if (overview.warning) return <p className="hint">{overview.warning}</p>

  return (
    <div>
      <h2 className="hc-title">Department Overview</h2>

      <div className="hc-cards">
        <div className="hc-card"><div className="hc-card-value">{overview.subjects?.length || 0}</div><div className="hc-card-label">Subjects</div></div>
      </div>

      <div className="hc-section">
        <h3>Top Performers (Internal Exams)</h3>
        <table className="hc-table">
          <thead><tr><th>Rank</th><th>Student</th><th>Register No</th><th>Marks</th></tr></thead>
          <tbody>
            {(overview.top_students || []).map((t, i) => (
              <tr key={i}>
                <td>{t.rank_in_department}</td>
                <td>{t.profiles?.full_name}</td>
                <td>{t.profiles?.registration_no}</td>
                <td>{t.total_marks}</td>
              </tr>
            ))}
            {(!overview.top_students || overview.top_students.length === 0) && (
              <tr><td colSpan={4} className="hint">No published internal results yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}