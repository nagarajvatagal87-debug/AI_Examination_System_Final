import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './DocumentVerificationAdminModal.css'

export default function DocumentVerificationAdminModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('config') // 'config', 'records', 'logs'
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({
    HALL_TICKET: true,
    MARKS_CARD: true,
    RESULT_SHEET: true,
    ACADEMIC_REPORT: true,
    CERTIFICATE: true,
    ACHIEVEMENT_CERTIFICATE: true,
    SPORTS_CERTIFICATE: true,
    CLUB_CERTIFICATE: true,
  })
  const [records, setRecords] = useState([])
  const [logs, setLogs] = useState([])
  const [saving, setSaving] = useState(false)
  const [revokeModalDoc, setRevokeModalDoc] = useState(null)
  const [revokeReason, setRevokeReason] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/verification/audit', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data) {
        if (res.data.config) setConfig(res.data.config)
        if (res.data.records) setRecords(res.data.records)
        if (res.data.logs) setLogs(res.data.logs)
      }
    } catch (err) {
      console.error('Error fetching verification audit:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleConfig(key) {
    const updated = { ...config, [key]: !config[key] }
    setConfig(updated)
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      await axios.post('/api/verification/config', updated, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      alert('Failed saving configuration: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmRevoke() {
    if (!revokeModalDoc) return
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      await axios.post(
        '/api/verification/revoke',
        {
          documentId: revokeModalDoc.document_id,
          token: revokeModalDoc.verification_token,
          reason: revokeReason || 'Document revoked by administrator.',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Document verification record successfully revoked!')
      setRevokeModalDoc(null)
      setRevokeReason('')
      fetchData()
    } catch (err) {
      alert('Revocation failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-bar">
          <div className="header-title-flex">
            <span className="modal-icon">🔐</span>
            <div>
              <h2>QR Document Verification Management</h2>
              <p>Configure QR Settings, Inspect Issued Documents & Review Access Logs</p>
            </div>
          </div>
          <button className="close-x-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Document Type Toggles
          </button>
          <button
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            📋 Issued Records ({records.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📜 Verification Access Logs ({logs.length})
          </button>
        </div>

        <div className="modal-tab-body">
          {loading ? (
            <div className="loading-spinner-box">Loading Verification Data...</div>
          ) : activeTab === 'config' ? (
            <div className="config-tab-content">
              <h3>Enable / Disable QR Verification per Document Type</h3>
              <p className="tab-desc">
                When enabled, official documents of the selected type will automatically embed a cryptographically hashed QR verification code.
              </p>

              <div className="config-grid">
                {Object.keys(config).map((key) => (
                  <div key={key} className={`config-card ${config[key] ? 'enabled' : 'disabled'}`}>
                    <div className="config-card-left">
                      <span className="doc-icon">📄</span>
                      <div>
                        <div className="doc-name">{key.replace(/_/g, ' ')}</div>
                        <div className="doc-status-lbl">
                          {config[key] ? '✓ QR Verification Active' : '✕ Verification Disabled'}
                        </div>
                      </div>
                    </div>
                    <label className="switch-toggle">
                      <input
                        type="checkbox"
                        checked={config[key]}
                        onChange={() => handleToggleConfig(key)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'records' ? (
            <div className="records-tab-content">
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Verification Ref</th>
                      <th>Type</th>
                      <th>Student / USN</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Issued At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8' }}>
                          No document verification records generated yet.
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <code className="ref-badge">{r.public_verification_id || r.id}</code>
                          </td>
                          <td>
                            <span className="type-badge">{r.document_type}</span>
                          </td>
                          <td>
                            <strong>{r.issued_to_student_name}</strong>
                            <div className="sub-usn">{r.issued_to_usn}</div>
                          </td>
                          <td>v{r.version || 1}</td>
                          <td>
                            <span className={`status-pill ${r.status.toLowerCase()}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>{new Date(r.created_at).toLocaleDateString()}</td>
                          <td>
                            {r.status === 'VALID' ? (
                              <button
                                className="revoke-btn"
                                onClick={() => setRevokeModalDoc(r)}
                              >
                                Revoke
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.status}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="logs-tab-content">
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Document ID</th>
                      <th>Verification Result</th>
                      <th>User Agent</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>
                          No verification access logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      logs.map((l) => (
                        <tr key={l.id}>
                          <td>{new Date(l.verification_time || l.created_at).toLocaleString()}</td>
                          <td>
                            <code className="ref-badge">{l.document_id || 'N/A'}</code>
                          </td>
                          <td>
                            <span className={`status-pill ${l.result.toLowerCase()}`}>
                              {l.result}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {l.user_agent}
                          </td>
                          <td>{l.ip_address}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {revokeModalDoc && (
          <div className="nested-modal-overlay">
            <div className="nested-modal-card">
              <h3>Confirm Document Revocation</h3>
              <p>
                Are you sure you want to revoke <strong>{revokeModalDoc.document_title}</strong> (Ref: {revokeModalDoc.public_verification_id}) issued to <strong>{revokeModalDoc.issued_to_student_name}</strong>?
              </p>
              <div style={{ margin: '14px 0' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                  Reason for Revocation:
                </label>
                <textarea
                  rows="3"
                  className="revoke-textarea"
                  placeholder="e.g. Issued in error, administrative correction pending..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                />
              </div>
              <div className="nested-btn-row">
                <button className="cancel-btn" onClick={() => setRevokeModalDoc(null)}>
                  Cancel
                </button>
                <button className="confirm-revoke-btn" onClick={handleConfirmRevoke} disabled={saving}>
                  {saving ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
