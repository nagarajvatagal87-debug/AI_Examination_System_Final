import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function ExaminationOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadExamOverview() {
    setLoading(true)
    setError('')
    api.get('/principal/examination-overview')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load examination overview.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadExamOverview()
  }, [])

  const examsList = data?.exams || []
  const scheduledCount = data?.scheduledCount || 0
  const publishedCount = data?.publishedCount || 0
  const internalSummary = data?.internalSummary || {}
  const revaluationSummary = data?.revaluationSummary || {}
  const makeupSummary = data?.makeupSummary || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
        <h2 style={{ fontSize: 20, margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>📝 Institution Examination Overview</h2>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px 0', fontWeight: 600 }}>
          Authorized institutional summaries from Examination Department (Main Exams) and Department Faculty/HODs (Internal Exams).
        </p>

        {/* 4 Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#eff6ff', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
            <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 800 }}>Main Exams Scheduled</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>{scheduledCount} Examinations</div>
          </div>
          <div style={{ background: '#f5f3ff', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
            <div style={{ fontSize: 12, color: '#5b21b6', fontWeight: 800 }}>Results Published</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#6d28d9', marginTop: 4 }}>{publishedCount} Published</div>
          </div>
          <div style={{ background: '#ecfdf5', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
            <div style={{ fontSize: 12, color: '#065f46', fontWeight: 800 }}>Revaluation Requests</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#047857', marginTop: 4 }}>{revaluationSummary.totalRequests ?? 0} Requests</div>
          </div>
          <div style={{ background: '#fffbeb', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
            <div style={{ fontSize: 12, color: '#92400e', fontWeight: 800 }}>Make-up Exams</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#b45309', marginTop: 4 }}>{makeupSummary.scheduled ?? 0} Scheduled</div>
          </div>
        </div>

        {/* Section 1: Main Examination Summaries */}
        <h4 style={{ fontSize: 16, color: '#0f172a', fontWeight: 800, marginBottom: 12 }}>🎓 Main Examinations (Examination Department)</h4>
        {loading ? (
          <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading main examinations overview...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
            <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
            <button onClick={loadExamOverview} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
          </div>
        ) : examsList.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b', marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: 16, fontWeight: 800 }}>No Main Examinations Scheduled Yet</h4>
            <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
              Main examinations scheduled or published by the Examination Department will automatically appear here.
            </p>
          </div>
        ) : (
          <table className="pd-table" style={{ width: '100%', fontSize: 13, marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ padding: 12 }}>MAIN EXAMINATION</th>
                <th style={{ padding: 12 }}>DEPARTMENT</th>
                <th style={{ padding: 12 }}>SCHEDULED DATE</th>
                <th style={{ padding: 12 }}>STUDENTS</th>
                <th style={{ padding: 12 }}>AUTHORITY</th>
                <th style={{ padding: 12 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {examsList.map((ex, idx) => {
                const statusClass = ex.status === 'In Evaluation' ? 'evaluation' : ex.status === 'Published' ? 'published' : 'scheduled'
                return (
                  <tr key={idx}>
                    <td style={{ padding: 12, fontWeight: 800, color: '#0f172a' }}>{ex.title}</td>
                    <td style={{ padding: 12, color: '#1d4ed8', fontWeight: 700 }}>{ex.dept}</td>
                    <td style={{ padding: 12, color: '#475569', fontWeight: 500 }}>{ex.date}</td>
                    <td style={{ padding: 12, color: '#0f172a', fontWeight: 700 }}>{ex.students}</td>
                    <td style={{ padding: 12, fontSize: 12, color: '#475569', fontWeight: 500 }}>{ex.evaluator}</td>
                    <td style={{ padding: 12 }}>
                      <span className={`badge-status ${statusClass}`}>
                        {ex.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Section 2: Internal Exam Summary & Revaluation Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1.5px solid #334155' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#0f172a', fontWeight: 800 }}>📋 Internal Evaluation Summary (Faculty → HOD)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Internal Test 1 (IAT-1):</span>
                <span style={{ fontWeight: 800, color: '#047857' }}>{internalSummary.internal1Completion || 'Completed'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Internal Test 2 (IAT-2):</span>
                <span style={{ fontWeight: 800, color: '#b45309' }}>{internalSummary.internal2Completion || 'In Progress'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Internal Test 3 (IAT-3):</span>
                <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{internalSummary.internal3Completion || 'Upcoming'}</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1.5px solid #334155' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#0f172a', fontWeight: 800 }}>🔄 Revaluation & Supplementary Overview</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Revaluation Pending:</span>
                <span style={{ fontWeight: 800, color: '#b45309' }}>{revaluationSummary.pending ?? 0} Pending</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Revaluation Completed:</span>
                <span style={{ fontWeight: 800, color: '#047857' }}>{revaluationSummary.completed ?? 0} Completed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Make-up Exam Registrations:</span>
                <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{makeupSummary.registeredStudents ?? 0} Students</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
