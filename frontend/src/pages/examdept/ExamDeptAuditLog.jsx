import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'
import DocumentVerificationAdminModal from '../../components/DocumentVerificationAdminModal.jsx'

export default function ExamDeptAuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  function loadAuditLogs() {
    setLoading(true)
    setError('')
    api.get('/examdept/audit-log')
      .then((res) => setLogs(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAuditLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#f8fafc', fontWeight: 800 }}>📋 Immutable Examination Department Audit Logs</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
              Complete audit trail of exam creation, schedule edits, question paper security, mark modifications, result approvals, and revaluations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="pd-btn"
              onClick={() => setShowVerificationModal(true)}
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 800 }}
            >
              🔐 Manage QR Verification & Audit
            </button>
            <button className="pd-btn" onClick={loadAuditLogs} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              🔄 Refresh Trail
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={{ background: 'rgba(15, 23, 42, 0.9)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '6px 12px', borderRadius: 6, fontWeight: 700 }}>
            <option value="ALL">All Recorded Actions</option>
            <option value="CREATE_EXAM">CREATE_EXAM</option>
            <option value="PUBLISH_RESULT">PUBLISH_RESULT</option>
            <option value="UPDATE_QUESTION_PAPER">UPDATE_QUESTION_PAPER</option>
            <option value="UPDATE_SCRIPT_STATUS">UPDATE_SCRIPT_STATUS</option>
            <option value="REVALUATION_DECISION">REVALUATION_DECISION</option>
            <option value="VERIFY_REVALUATION_PAYMENT">VERIFY_REVALUATION_PAYMENT</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading secure audit log trail...</div>
        ) : error ? (
          <div style={{ padding: 20, background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: 8 }}>{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.3)', borderRadius: 12 }}>
            📋 No Audit Logs Found for the selected filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User & Role</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Old Value</th>
                  <th>New Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td style={{ color: '#cbd5e1', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp || log.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#f8fafc' }}>{log.user_name || log.user_id || 'System User'}</div>
                      <div style={{ fontSize: 11, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>{log.role || 'examdept'}</div>
                    </td>
                    <td style={{ fontWeight: 800, color: '#fbbf24' }}>{log.action}</td>
                    <td>
                      <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>{log.entity}</span>
                      {log.entity_id && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>#{log.entity_id}</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#f87171', fontFamily: 'monospace' }}>
                      {typeof log.old_value === 'object' ? JSON.stringify(log.old_value) : String(log.old_value ?? '-')}
                    </td>
                    <td style={{ fontSize: 12, color: '#34d399', fontFamily: 'monospace' }}>
                      {typeof log.new_value === 'object' ? JSON.stringify(log.new_value) : String(log.new_value ?? '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showVerificationModal && (
        <DocumentVerificationAdminModal onClose={() => setShowVerificationModal(false)} />
      )}
    </div>
  )
}
