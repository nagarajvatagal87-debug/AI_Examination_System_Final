import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function ExaminationOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/principal/examination-overview')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const examsList = data?.exams || []
  const scheduledCount = data?.scheduledCount || 0
  const appearingStudents = data?.appearingStudents || 0
  const publishedCount = data?.publishedCount || 0

  return (
    <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
      <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#0f172a', fontWeight: 800 }}>⚖️ Institution-Level Examination Overview</h2>
      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px 0', fontWeight: 600 }}>
        Note: Per institutional policy, Main Examination evaluation and publication are strictly governed by the Examination Department.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#eff6ff', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
          <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 800 }}>Main Exams Scheduled</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>{scheduledCount} Examinations</div>
        </div>
        <div style={{ background: '#f5f3ff', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
          <div style={{ fontSize: 12, color: '#5b21b6', fontWeight: 800 }}>Students Appearing</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#6d28d9', marginTop: 4 }}>{appearingStudents} Students</div>
        </div>
        <div style={{ background: '#ecfdf5', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
          <div style={{ fontSize: 12, color: '#065f46', fontWeight: 800 }}>Results Published</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#047857', marginTop: 4 }}>{publishedCount} Published</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading main examinations overview...</p>
      ) : examsList.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #1e293b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Main Examinations Scheduled Yet</h4>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, maxWidth: 480, marginInline: 'auto', fontWeight: 600 }}>
            Main examinations scheduled or published by the Examination Department will automatically appear here.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', fontSize: 14 }}>
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
    </div>
  )
}
