import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function AuditGovernanceLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadLogs() {
    setLoading(true)
    setError('')
    api.get('/principal/audit-logs')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setLogs(res.data)
        } else {
          setLogs([])
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#0f172a', fontWeight: 800 }}>📋 Institutional Audit & Governance Log</h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Immutable administrative event trail tracking exam approvals, result publications, circulars, calendar changes, and user permission updates.
          </p>
        </div>

        <button onClick={loadLogs} className="pd-btn" style={{ background: '#f1f5f9', color: '#0f172a', border: '1.5px solid #334155' }}>
          🔄 Refresh Audit Trail
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading audit & governance log...</p>
      ) : error ? (
        <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
          <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
          <button onClick={loadLogs} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #1e293b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Audit Log Entries Found</h4>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
            No administrative audit actions recorded yet. Audit events are created automatically as governance actions occur.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: 12 }}>TIMESTAMP</th>
              <th style={{ padding: 12 }}>ACTION</th>
              <th style={{ padding: 12 }}>ROLE</th>
              <th style={{ padding: 12 }}>ENTITY TYPE</th>
              <th style={{ padding: 12 }}>ENTITY DETAILS / NEW VALUE</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={{ padding: 12, fontWeight: 700, color: '#475569' }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td style={{ padding: 12, fontWeight: 800, color: '#1d4ed8' }}>
                  {log.action}
                </td>
                <td style={{ padding: 12, fontWeight: 800, color: '#5b21b6', textTransform: 'uppercase', fontSize: 11 }}>
                  {log.user_role || 'SYSTEM'}
                </td>
                <td style={{ padding: 12, fontWeight: 700, color: '#047857' }}>
                  {log.entity_type}
                </td>
                <td style={{ padding: 12, color: '#0f172a', fontWeight: 600 }}>
                  {typeof log.new_value === 'object' ? JSON.stringify(log.new_value) : String(log.new_value || log.reason || log.entity_id || '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
