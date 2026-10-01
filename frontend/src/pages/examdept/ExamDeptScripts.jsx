import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './ExamDeptDashboard.css'

export default function ExamDeptScripts() {
  const [scripts, setScripts] = useState([])
  const [exams, setExams] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterExam, setFilterExam] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Registration Form State
  const [scriptId, setScriptId] = useState('')
  const [studentUsn, setStudentUsn] = useState('')
  const [studentName, setStudentName] = useState('')
  const [subjectCode, setSubjectCode] = useState('22MCA31')
  const [subjectName, setSubjectName] = useState('Database Management Systems')
  const [pageCount, setPageCount] = useState(16)
  const [statusMsg, setStatusMsg] = useState({ text: '', error: false })

  function loadScripts() {
    setLoading(true)
    setError('')
    Promise.all([
      api.get('/examdept/scripts'),
      api.get('/examdept/exams'),
      api.get('/examdept/departments')
    ])
      .then(([sRes, eRes, dRes]) => {
        setScripts(Array.isArray(sRes.data) ? sRes.data : [])
        setExams(Array.isArray(eRes.data) ? eRes.data : [])
        setDepartments(Array.isArray(dRes.data) ? dRes.data : [])
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load answer script records.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadScripts()
  }, [])

  async function handleRegisterScript(e) {
    e.preventDefault()
    setStatusMsg({ text: 'Registering physical answer script into tracking system...', error: false })
    try {
      await api.post('/examdept/scripts', {
        script_id: scriptId || `SCR-${Date.now().toString().slice(-6)}`,
        student_usn: studentUsn,
        student_name: studentName,
        subject_code: subjectCode,
        subject_name: subjectName,
        page_count: Number(pageCount),
        status: 'RECEIVED'
      })
      setStatusMsg({ text: '✅ Answer script registered into physical & digital tracking repository!', error: false })
      setScriptId('')
      setStudentUsn('')
      setStudentName('')
      loadScripts()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Failed to register answer script', error: true })
    }
  }

  async function handleUpdateScriptStatus(id, newStatus) {
    try {
      await api.put(`/examdept/scripts/${id}/status`, { status: newStatus })
      loadScripts()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update script tracking status.')
    }
  }

  const filteredScripts = scripts.filter((s) => {
    if (selectedDeptId !== 'ALL') {
      const examMatch = exams.find((e) => String(e.id) === String(s.exam_id))
      const deptId = examMatch?.subjects?.department_id || examMatch?.subjects?.departments?.id || s.department_id
      if (deptId && deptId !== selectedDeptId) return false
    }
    if (filterExam !== 'ALL' && String(s.exam_id) !== String(filterExam)) return false
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false
    return true
  })

  // Aggregate stats
  const totalCount = filteredScripts.length
  const receivedCount = filteredScripts.filter((s) => s.status === 'RECEIVED' || s.status === 'SCANNED' || s.status === 'ASSIGNED' || s.status === 'EVALUATED').length
  const missingCount = filteredScripts.filter((s) => s.status === 'MISSING').length
  const evaluatedCount = filteredScripts.filter((s) => s.status === 'EVALUATED' || s.status === 'VERIFIED').length

  return (
    <div className="edd-wrap">
      {/* Overview Stat Cards */}
      <div className="edd-cards">
        <div className="edd-card">
          <div className="card-icon-bubble">📦</div>
          <div>
            <div className="edd-card-val">{totalCount}</div>
            <div className="edd-card-lbl">Total Answer Scripts</div>
          </div>
        </div>
        <div className="edd-card">
          <div className="card-icon-bubble">✅</div>
          <div>
            <div className="edd-card-val" style={{ color: '#059669' }}>{receivedCount}</div>
            <div className="edd-card-lbl">Scripts Received</div>
          </div>
        </div>
        <div className="edd-card">
          <div className="card-icon-bubble">🚨</div>
          <div>
            <div className="edd-card-val" style={{ color: '#e11d48' }}>{missingCount}</div>
            <div className="edd-card-lbl">Missing / Pending Scripts</div>
          </div>
        </div>
        <div className="edd-card">
          <div className="card-icon-bubble">🤖</div>
          <div>
            <div className="edd-card-val" style={{ color: '#2563eb' }}>{evaluatedCount}</div>
            <div className="edd-card-lbl">Evaluated / Verified</div>
          </div>
        </div>
      </div>

      <div className="edd-section-box">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>📦 Answer Script Receipt & Security Tracking</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600 }}>
            Central Main Examination answer script tracking pipeline. Register physical scripts, track receipt, scan digitizations, and resolve missing scripts.
          </p>
        </div>

        {statusMsg.text && (
          <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: statusMsg.error ? '#fff1f2' : '#ecfdf5', color: statusMsg.error ? '#e11d48' : '#047857', border: `1px solid ${statusMsg.error ? '#fecdd3' : '#a7f3d0'}`, fontWeight: 700, fontSize: 13 }}>
            {statusMsg.text}
          </div>
        )}

        {/* Script Receipt Form */}
        <form onSubmit={handleRegisterScript} style={{ background: '#f8fafc', padding: 20, borderRadius: 14, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#0f172a', fontWeight: 800 }}>➕ Register Answer Script Receipt</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <input
              type="text"
              placeholder="Script Barcode / ID"
              value={scriptId}
              onChange={(e) => setScriptId(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
            <input
              type="text"
              placeholder="Student USN (e.g. 1DT22MC001)"
              value={studentUsn}
              onChange={(e) => setStudentUsn(e.target.value)}
              required
              style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
            <input
              type="text"
              placeholder="Student Name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
              style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
            <input
              type="text"
              placeholder="Subject Code"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              required
              style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
            <button type="submit" className="edd-action-btn green" style={{ fontWeight: 800 }}>
              📥 Receive & Register
            </button>
          </div>
        </form>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="edd-dept-select">
            <option value="ALL">🏛️ All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="edd-dept-select">
            <option value="ALL">All Script Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="SCANNED">Scanned / Digitized</option>
            <option value="ASSIGNED">Assigned to Evaluator</option>
            <option value="EVALUATED">Evaluated</option>
            <option value="MISSING">🚨 Missing / Pending</option>
          </select>
        </div>

        {/* Script Records Table */}
        {loading ? (
          <p style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>Loading answer script records...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fff1f2', borderRadius: 10, border: '1px solid #fecdd3' }}>{error}</div>
        ) : filteredScripts.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: 16, fontWeight: 800 }}>No Answer Scripts Registered Yet</h4>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 600 }}>
              Use the form above to register physical scripts received from examination centres.
            </p>
          </div>
        ) : (
          <div className="edd-table-container">
            <table className="edd-table">
              <thead>
                <tr>
                  <th>Script ID</th>
                  <th>Student & USN</th>
                  <th>Subject</th>
                  <th>Received Date</th>
                  <th>Pages</th>
                  <th>Status</th>
                  <th>Actions / Verification</th>
                </tr>
              </thead>
              <tbody>
                {filteredScripts.map((s) => (
                  <tr key={s.id || s.script_id}>
                    <td style={{ fontWeight: 800, color: '#1d4ed8', fontFamily: 'monospace' }}>{s.script_id || s.id}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.student_name || s.studentName}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.student_usn || s.studentUsn || s.usn}</div>
                    </td>
                    <td>
                      <div style={{ color: '#0f172a', fontWeight: 700 }}>{s.subject_name || s.subjectName || 'Database Systems'}</div>
                      <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>{s.subject_code || s.subjectCode || '22MCA31'}</div>
                    </td>
                    <td style={{ color: '#475569', fontSize: 13 }}>{new Date(s.received_date || s.created_at || Date.now()).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.page_count || 16}</td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        background: s.status === 'MISSING' ? '#fff1f2' : s.status === 'EVALUATED' || s.status === 'VERIFIED' ? '#ecfdf5' : '#eff6ff',
                        color: s.status === 'MISSING' ? '#e11d48' : s.status === 'EVALUATED' || s.status === 'VERIFIED' ? '#047857' : '#1d4ed8',
                        border: `1px solid ${s.status === 'MISSING' ? '#fecdd3' : s.status === 'EVALUATED' || s.status === 'VERIFIED' ? '#a7f3d0' : '#bfdbfe'}`,
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <select
                        value={s.status}
                        onChange={(e) => handleUpdateScriptStatus(s.id, e.target.value)}
                        className="edd-dept-select"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                      >
                        <option value="RECEIVED">Mark RECEIVED</option>
                        <option value="SCANNED">Mark SCANNED</option>
                        <option value="ASSIGNED">Mark ASSIGNED</option>
                        <option value="EVALUATED">Mark EVALUATED</option>
                        <option value="MISSING">🚨 Report MISSING</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
