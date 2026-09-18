import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodRecentActivity() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    api.get('/hod/recent-activity').then((res) => setLogs(res.data)).catch(() => {})
  }, [])

  return (
    <div>
      <h2 className="hc-title">Recent Activity</h2>
      <div className="hc-section">
        <table className="hc-table">
          <thead><tr><th>Action</th><th>By</th><th>When</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.action.replace(/_/g, ' ')}</td>
                <td>{l.profiles?.full_name}</td>
                <td>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={3} className="hint">No recent activity.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}