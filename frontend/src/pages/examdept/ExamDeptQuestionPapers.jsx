import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'
import './ExamDeptDashboard.css'

export default function ExamDeptQuestionPapers() {
  const [papers, setPaperList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [paperTitle, setPaperTitle] = useState('')
  const [subjectCode, setSubjectCode] = useState('22MCA31')
  const [subjectName, setSubjectName] = useState('Database Management Systems')
  const [version, setVersion] = useState('V1.0 (Final)')
  const [status, setStatus] = useState('SECURED')
  const [statusMsg, setStatusMsg] = useState({ text: '', error: false })

  function loadPapers() {
    setLoading(true)
    setError('')
    api.get('/examdept/question-papers')
      .then((res) => setPaperList(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load question papers.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPapers()
  }, [])

  async function handleRegisterPaper(e) {
    e.preventDefault()
    setStatusMsg({ text: 'Registering confidential question paper...', error: false })
    try {
      await api.post('/examdept/question-papers', {
        paper_title: paperTitle,
        subject_code: subjectCode,
        subject_name: subjectName,
        version,
        status,
      })
      setStatusMsg({ text: '✅ Question paper registered & secured in repository!', error: false })
      setPaperTitle('')
      loadPapers()
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.error || 'Failed to register question paper', error: true })
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await api.put(`/examdept/question-papers/${id}/status`, { status: newStatus })
      loadPapers()
    } catch (err) {
      alert('Failed to update paper status')
    }
  }

  return (
    <div className="edd-wrap">
      <div className="edd-section-box">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>📄 Confidential Question Paper Repository</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600 }}>
            Main Examination Question Paper security repository. Papers are encrypted, confidential, and accessible strictly by authorized examination personnel.
          </p>
        </div>

        {statusMsg.text && (
          <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: statusMsg.error ? '#fff1f2' : '#ecfdf5', color: statusMsg.error ? '#e11d48' : '#047857', border: `1px solid ${statusMsg.error ? '#fecdd3' : '#a7f3d0'}`, fontWeight: 700, fontSize: 13 }}>
            {statusMsg.text}
          </div>
        )}

        {/* Register Question Paper Form */}
        <form onSubmit={handleRegisterPaper} style={{ background: '#f8fafc', padding: 20, borderRadius: 14, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#0f172a', fontWeight: 800 }}>🔒 Secure Question Paper in Repository</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr', gap: 12 }}>
            <input
              type="text"
              placeholder="Paper Title (e.g. Main Examination Series Paper 2026)"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              required
              style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
            <input
              type="text"
              placeholder="Subject Code (e.g. 22MCA31)"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              required
              style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
            <input
              type="text"
              placeholder="Subject Name"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
              style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="edd-dept-select" style={{ width: '100%' }}>
              <option value="SECURED">🔒 SECURED</option>
              <option value="VERIFIED">✅ VERIFIED</option>
              <option value="APPROVED">★ APPROVED</option>
              <option value="RELEASED_FOR_EXAM">🚀 RELEASED FOR EXAM</option>
            </select>
          </div>

          <button type="submit" className="edd-action-btn blue" style={{ alignSelf: 'flex-start' }}>
            🔒 Register Paper to Repository →
          </button>
        </form>

        {/* Question Papers Table */}
        {loading ? (
          <p style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>Loading question paper repository...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fff1f2', borderRadius: 10, border: '1px solid #fecdd3' }}>
            <p style={{ color: '#e11d48', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
            <button onClick={loadPapers} className="edd-action-btn blue" style={{ padding: '6px 14px', fontSize: 12 }}>Retry</button>
          </div>
        ) : papers.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Question Papers Registered Yet</h4>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 600 }}>
              Use the security form above to register and lock question papers into the repository.
            </p>
          </div>
        ) : (
          <div className="edd-table-container">
            <table className="edd-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Paper Title & Name</th>
                  <th>Version</th>
                  <th>Registered By</th>
                  <th>Security Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 800, color: '#1d4ed8' }}>{p.subject_code}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.paper_title}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{p.subject_name}</div>
                    </td>
                    <td style={{ color: '#7c3aed', fontWeight: 700 }}>{p.version || 'V1.0'}</td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>{p.uploaded_by}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        className="edd-dept-select"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                      >
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="SECURED">SECURED</option>
                        <option value="RELEASED_FOR_EXAM">RELEASED_FOR_EXAM</option>
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
