import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './ExamDeptDashboard.css'

export default function ExamDeptRevaluation() {
  const [config, setConfig] = useState({
    revaluation_fee: 500,
    late_fee: 200,
    start_date: '2026-10-01',
    deadline: '2026-10-15',
    max_subjects: 3,
  })
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState({ text: '', error: false })

  // Decision Modal State
  const [selectedApp, setSelectedApp] = useState(null)
  const [decisionType, setDecisionType] = useState('INCREASED')
  const [newMarks, setNewMarks] = useState('')
  const [reason, setReason] = useState('Re-evaluation verified by chief examiner.')

  function loadData() {
    setLoading(true)
    setError('')
    Promise.all([
      api.get('/examdept/revaluation/config'),
      api.get('/examdept/revaluation/applications')
    ])
      .then(([cRes, aRes]) => {
        if (cRes.data) setConfig(cRes.data)
        setApplications(Array.isArray(aRes.data) ? aRes.data : [])
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load revaluation applications.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleUpdateConfig(e) {
    e.preventDefault()
    try {
      await api.put('/examdept/revaluation/config', config)
      setStatusMsg({ text: '✅ Revaluation fee rules & window successfully updated!', error: false })
      loadData()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Failed to update revaluation configuration', error: true })
    }
  }

  async function handleTriggerSandboxPayment(appId) {
    setStatusMsg({ text: 'Initiating server-verified sandbox payment...', error: false })
    try {
      const initRes = await api.post(`/examdept/revaluation/applications/${appId}/pay`, {
        gateway: 'RAZORPAY_SANDBOX',
        amount: config.revaluation_fee
      })
      const { paymentId, gatewayRef } = initRes.data
      
      // Server verify payment
      await api.post(`/examdept/revaluation/applications/${appId}/verify-payment`, {
        paymentId,
        gatewayRef
      })

      setStatusMsg({ text: '✅ Payment server-verified successfully! Application status moved to SUBMITTED.', error: false })
      loadData()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Payment verification failed', error: true })
    }
  }

  async function handleProcessDecision(e) {
    e.preventDefault()
    if (!selectedApp) return
    try {
      await api.post(`/examdept/revaluation/applications/${selectedApp.id}/decision`, {
        decision: decisionType,
        new_marks: Number(newMarks),
        reason
      })
      setStatusMsg({ text: `✅ Revaluation decision (${decisionType}) finalized & result updated!`, error: false })
      setSelectedApp(null)
      loadData()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Failed to process revaluation decision', error: true })
    }
  }

  return (
    <div className="edd-wrap">
      {/* Revaluation Configuration Card */}
      <div className="edd-section-box">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>⚙️ Revaluation Fee & Window Configuration</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600 }}>
            Configure mandatory revaluation fees, late fees, application window deadlines, and paper limits. Revaluation requires server-verified payment before evaluation.
          </p>
        </div>

        {statusMsg.text && (
          <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: statusMsg.error ? '#fff1f2' : '#ecfdf5', color: statusMsg.error ? '#e11d48' : '#047857', border: `1px solid ${statusMsg.error ? '#fecdd3' : '#a7f3d0'}`, fontWeight: 700, fontSize: 13 }}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleUpdateConfig} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 14, alignItems: 'end', background: '#f8fafc', padding: 20, borderRadius: 14, border: '1px solid #cbd5e1' }}>
          <div>
            <label style={{ fontSize: 12, color: '#475569', fontWeight: 800, display: 'block', marginBottom: 6 }}>Revaluation Fee (₹)</label>
            <input type="number" value={config.revaluation_fee} onChange={(e) => setConfig({ ...config, revaluation_fee: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569', fontWeight: 800, display: 'block', marginBottom: 6 }}>Late Fee (₹)</label>
            <input type="number" value={config.late_fee} onChange={(e) => setConfig({ ...config, late_fee: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569', fontWeight: 800, display: 'block', marginBottom: 6 }}>Start Date</label>
            <input type="date" value={config.start_date || '2026-10-01'} onChange={(e) => setConfig({ ...config, start_date: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569', fontWeight: 800, display: 'block', marginBottom: 6 }}>Deadline</label>
            <input type="date" value={config.deadline || '2026-10-15'} onChange={(e) => setConfig({ ...config, deadline: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569', fontWeight: 800, display: 'block', marginBottom: 6 }}>Max Subjects / Student</label>
            <input type="number" value={config.max_subjects} onChange={(e) => setConfig({ ...config, max_subjects: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, boxSizing: 'border-box' }} required />
          </div>
          <button type="submit" className="edd-action-btn blue" style={{ height: 42 }}>
            💾 Save Rules
          </button>
        </form>
      </div>

      {/* Applications List */}
      <div className="edd-section-box">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🔄 Revaluation Applications & Paid Queue</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600 }}>
            Manage incoming student revaluation applications. Verify backend payment status and record final evaluator decision.
          </p>
        </div>

        {loading ? (
          <p style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>Loading revaluation application queue...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fff1f2', borderRadius: 10, border: '1px solid #fecdd3' }}>{error}</div>
        ) : applications.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔄</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: 16, fontWeight: 800 }}>No Revaluation Applications Received Yet</h4>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 600 }}>
              Student revaluation applications submitted after result publication will appear here.
            </p>
          </div>
        ) : (
          <div className="edd-table-container">
            <table className="edd-table">
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Student & USN</th>
                  <th>Subject</th>
                  <th>Original Marks</th>
                  <th>Fee Paid</th>
                  <th>Payment Status</th>
                  <th>Reval Status</th>
                  <th>New Marks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 800, color: '#1d4ed8', fontFamily: 'monospace' }}>REV-{app.id}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{app.student_name || app.studentName || 'Student'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{app.student_usn || app.usn}</div>
                    </td>
                    <td>
                      <div style={{ color: '#0f172a', fontWeight: 700 }}>{app.subject_name || app.subjectName || 'Subject'}</div>
                      <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>{app.subject_code || app.subjectCode}</div>
                    </td>
                    <td style={{ fontWeight: 800, textAlign: 'center' }}>{app.original_marks}</td>
                    <td style={{ fontWeight: 800, color: '#059669', textAlign: 'center' }}>₹{app.fee_amount}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: app.payment_status === 'SUCCESS' ? '#ecfdf5' : '#fff1f2', color: app.payment_status === 'SUCCESS' ? '#047857' : '#e11d48', border: `1px solid ${app.payment_status === 'SUCCESS' ? '#a7f3d0' : '#fecdd3'}` }}>
                        {app.payment_status}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: app.status === 'COMPLETED' || app.status === 'APPROVED' ? '#ecfdf5' : '#eff6ff', color: app.status === 'COMPLETED' || app.status === 'APPROVED' ? '#047857' : '#1d4ed8', border: `1px solid ${app.status === 'COMPLETED' || app.status === 'APPROVED' ? '#a7f3d0' : '#bfdbfe'}` }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, textAlign: 'center', color: '#d97706' }}>
                      {app.new_marks !== null && app.new_marks !== undefined ? app.new_marks : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {app.payment_status !== 'SUCCESS' ? (
                          <button
                            className="edd-action-btn blue"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleTriggerSandboxPayment(app.id)}
                          >
                            💳 Verify Sandbox Payment
                          </button>
                        ) : app.status !== 'COMPLETED' && app.status !== 'APPROVED' ? (
                          <button
                            className="edd-action-btn green"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => {
                              setSelectedApp(app)
                              setNewMarks(app.original_marks)
                            }}
                          >
                            ⚖️ Evaluate & Decide
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#059669', fontWeight: 800 }}>✅ Decision Finalized</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Decision Modal */}
        {selectedApp && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="edd-section-box" style={{ width: 450, padding: 24, background: '#ffffff' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontWeight: 800 }}>⚖️ Revaluation Evaluator Decision</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
                Application REV-{selectedApp.id} for <strong style={{ color: '#0f172a' }}>{selectedApp.student_name}</strong> (Original Marks: {selectedApp.original_marks})
              </p>

              <form onSubmit={handleProcessDecision} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 700, display: 'block', marginBottom: 4 }}>Decision Outcome</label>
                  <select value={decisionType} onChange={(e) => setDecisionType(e.target.value)} className="edd-dept-select" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="INCREASED">Marks Increased</option>
                    <option value="DECREASED">Marks Decreased</option>
                    <option value="NO_CHANGE">No Change in Marks</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 700, display: 'block', marginBottom: 4 }}>New Final Marks</label>
                  <input
                    type="number"
                    value={newMarks}
                    onChange={(e) => setNewMarks(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 700, display: 'block', marginBottom: 4 }}>Evaluator Remarks / Justification</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="button" onClick={() => setSelectedApp(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, color: '#334155', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                  <button type="submit" className="edd-action-btn green" style={{ padding: '8px 16px' }}>Finalize & Publish Decision</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
